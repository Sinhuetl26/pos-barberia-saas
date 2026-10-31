import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@systech/database';
import { JWT_SECRET } from '../middleware/auth';
import {deliveryState,recipientKey} from './email-delivery.service';
import {financialTransaction} from './cash-ledger.service';
import { EmailService } from './email.service';
import { requestAccess } from './authorization.service';
import { publicAppOrigin } from './provider-config.service';
import { enqueueJob } from './durable-jobs.service';

export type ActionPurpose = 'RESET' | 'VERIFY' | 'INVITE';
export const passwordValid = (value: unknown): value is string => typeof value === 'string' && value.length >= 12 && Buffer.byteLength(value, 'utf8') <= 72;
export const passwordMessage = 'Usa al menos 12 caracteres y un máximo de 72 bytes (los acentos y emojis ocupan más de uno).';
export const securityError = (status = 400, message = 'El enlace no es válido, ya fue utilizado o caducó.') => Object.assign(new Error(message), { status, code: 'ACCESO_SEGURO' });
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const encryptionKey = () => createHmac('sha256', JWT_SECRET).update('systech-auth-outbox-v1').digest();
const lifetime = { RESET: 30 * 60000, VERIFY: 24 * 3600000, INVITE: 48 * 3600000 };
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function encrypt(token: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
}
function decrypt(value: string) {
  const data = Buffer.from(value, 'base64'), cipher = createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString('utf8');
}
export function accountOrigin() {
  return publicAppOrigin();
}

// Shared by every process: no user-supplied test header can bypass these counters.
export async function allowSecurityAttempt(scope: string, value: string, max: number) {
  const window = Math.floor(Date.now() / (15 * 60000));
  const id = createHmac('sha256', JWT_SECRET).update(`${scope}:${window}:${value}`).digest('hex');
  const row = await prisma.authThrottle.upsert({ where: { id }, create: { id, expiresAt: new Date((window + 2) * 15 * 60000) }, update: { count: { increment: 1 } } });
  return row.count <= max;
}

// Must run inside the caller's transaction; the user row serializes resends/consumption.
export async function queueAction(tx: any, userId: string, purpose: ActionPurpose) {
  const user = await tx.usuario.update({ where: { id: userId }, data: { sessionVersion: { increment: 0 } } });
  if (!user.activo || user.eliminadoEn || (purpose === 'INVITE' ? !user.invitationPending : user.invitationPending) || (purpose === 'VERIFY' && user.emailVerifiedAt)) return;
  await tx.authAction.updateMany({ where: { userId, purpose, consumedAt: null }, data: { consumedAt: new Date(), encryptedToken: null, mailStatus: 'CANCELED' } });
  const token = randomBytes(32).toString('hex');
  const action = await tx.authAction.create({ data: { userId, tenantId: user.tenantId, purpose, tokenHash: digest(token), sessionVersion: user.sessionVersion, expiresAt: new Date(Date.now() + lifetime[purpose]), encryptedToken: encrypt(token), createdAt: new Date(), nextAttemptAt: new Date() } });
  await enqueueJob({ tenantId: user.tenantId, key: `mail/action/${action.id}`, kind: 'MAIL_OUTBOX', entityId: action.id, expiresAt: action.expiresAt }, tx);
}

export async function requestAction(email: string, purpose: 'RESET' | 'VERIFY') {
  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user || !user.activo || user.eliminadoEn || user.invitationPending || (purpose === 'VERIFY' && user.emailVerifiedAt)) return;
  await prisma.$transaction(tx => queueAction(tx, user.id, purpose));
}

export async function consumeAction(token: string, purpose: ActionPurpose, password?: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw securityError();
  if (purpose !== 'VERIFY' && !passwordValid(password)) throw securityError(400, passwordMessage);
  // Hash outside the transaction to keep write locks short.
  const passwordHash = purpose !== 'VERIFY' ? await bcrypt.hash(password!, 12) : undefined;
  await prisma.$transaction(async tx => {
    const action = await tx.authAction.findUnique({ where: { tokenHash: digest(token) } });
    if (!action || action.purpose !== purpose || action.consumedAt || action.expiresAt <= new Date()) throw securityError();
    const user = await tx.usuario.update({ where: { id: action.userId }, data: { sessionVersion: { increment: 0 } } });
    if (!user.activo || user.eliminadoEn || action.sessionVersion !== user.sessionVersion || (purpose === 'INVITE' ? !user.invitationPending : user.invitationPending)) throw securityError();
    if (purpose === 'INVITE') {
      if (!['GERENTE', 'CAJERO', 'BARBERO'].includes(user.rol)) throw securityError();
      const branches: string[] = JSON.parse(user.sucursalesAsignadasJson || '[]');
      if (!branches.length || await tx.sucursal.count({ where: { id: { in: branches }, tenantId: user.tenantId, eliminadoEn: null } }) !== branches.length) throw securityError();
      if (user.rol === 'BARBERO' && (!user.barberoId || !await tx.barbero.findFirst({ where: { id: user.barberoId, sucursalId: branches[0], activo: true, eliminadoEn: null } }))) throw securityError();
    }
    const consumed = await tx.authAction.updateMany({ where: { id: action.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date(), encryptedToken: null, mailStatus: 'CONSUMED' } });
    if (consumed.count !== 1) throw securityError();
    await tx.usuario.update({ where: { id: user.id }, data: purpose === 'VERIFY' ? { emailVerifiedAt: new Date() } : { passwordHash, invitationPending: false, emailVerifiedAt: new Date(), sessionVersion: { increment: 1 } } });
    if (purpose !== 'VERIFY') await tx.authAction.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: new Date(), encryptedToken: null, mailStatus: 'CANCELED' } });
    await tx.auditoriaLog.create({ data: { tenantId: user.tenantId, usuarioEmail: user.email, accion: `CUENTA_${purpose}_COMPLETADO`, detalles: JSON.stringify({ usuarioId: user.id }) } });
  });
}

export async function revokeSessions(userId: string, currentVersion: number, passwordHash?: string) {
  await prisma.$transaction(async tx => {
    const changed = await tx.usuario.updateMany({ where: { id: userId, sessionVersion: currentVersion, activo: true, invitationPending: false }, data: { sessionVersion: { increment: 1 }, ...(passwordHash ? { passwordHash } : {}) } });
    if (!changed.count) throw securityError(401, 'La sesión terminó. Inicia sesión nuevamente.');
    await tx.authAction.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date(), encryptedToken: null, mailStatus: 'CANCELED' } });
    const user = await tx.usuario.findUniqueOrThrow({ where: { id: userId } });
    await tx.auditoriaLog.create({ data: { tenantId: user.tenantId, usuarioEmail: user.email, accion: passwordHash ? 'CONTRASENA_CAMBIADA' : 'SESIONES_REVOCADAS', detalles: JSON.stringify({ usuarioId: userId }) } });
  });
}

// Housekeeping does not depend on there being a deliverable mail job.
export async function cleanExpiredSecurityActions(now = new Date(), tenantId?: string) {
  const scope = tenantId ? { tenantId } : {};
  await prisma.authAction.updateMany({ where: { ...scope, consumedAt: null, expiresAt: { lte: now }, OR: [{ encryptedToken: { not: null } }, { mailStatus: { in: ['QUEUED', 'RETRY', 'SENDING'] } }] }, data: { encryptedToken: null, mailStatus: 'EXPIRED' } });
}

let processing = false;
export async function processSecurityMail(tenantId?: string, signal?: AbortSignal) {
  if (processing) return;
  processing = true;
  try {
    // Explicit background job, outside an HTTP request's tenant scope.
    await requestAccess.exit(async () => {
      const now = new Date(), scope = tenantId ? { tenantId } : {};
      await prisma.authThrottle.deleteMany({ where: { expiresAt: { lt: now } } });
      await cleanExpiredSecurityActions(now, tenantId);
      // A process may die during its final leased attempt. Make that state
      // terminal instead of leaving an invitation permanently "sending".
      await prisma.authAction.updateMany({ where: { ...scope, consumedAt: null, mailStatus: 'SENDING', attempts: { gte: 3 }, nextAttemptAt: { lte: now } }, data: { mailStatus: 'FAILED', encryptedToken: null } });
      // Resend retains keys for 24h. Never replay an uncertain send outside that
      // window; requesting a new link creates a new action and a new key.
      await prisma.authAction.updateMany({ where: { ...scope, consumedAt: null, mailStatus: { in: ['RETRY', 'SENDING'] }, createdAt: { lte: new Date(now.getTime() - 24 * 3600000) }, nextAttemptAt: { lte: now } }, data: { mailStatus: 'FAILED', encryptedToken: null } });
      const jobs = await prisma.authAction.findMany({ where: { ...scope, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: 3 }, mailStatus: { in: ['QUEUED', 'RETRY', 'SENDING'] }, nextAttemptAt: { lte: now } }, take: 20, orderBy: { createdAt: 'asc' } });
      for (const job of jobs) {
        if (signal?.aborted) break;
        const attempt = job.attempts + 1, lease = new Date(Date.now() + 120000);
        const claim = await prisma.authAction.updateMany({ where: { id: job.id, consumedAt: null, attempts: job.attempts, mailStatus: { in: ['QUEUED', 'RETRY', 'SENDING'] }, expiresAt: { gt: now }, nextAttemptAt: { lte: now } }, data: { mailStatus: 'SENDING', attempts: { increment: 1 }, nextAttemptAt: lease } });
        if (!claim.count) continue;
        let status = 'RETRY';
        try {
          const user = await prisma.usuario.findUnique({ where: { id: job.userId } });
          if (!user || !user.activo || user.eliminadoEn || user.sessionVersion !== job.sessionVersion || !job.encryptedToken) status = 'CANCELED';
          else {
            const verb = { RESET: 'Restablecer contraseña', VERIFY: 'Verificar correo', INVITE: 'Aceptar invitación' }[job.purpose] || 'Continuar';
            const route = { RESET: 'restablecer', VERIFY: 'verificar', INVITE: 'invitacion' }[job.purpose];
            const decrypted = decrypt(job.encryptedToken);
            // Preserve the exact provider request across retries, even when the
            // account name, sender or public domain changes after the first send.
            let options;
            if (decrypted.startsWith('{')) options = JSON.parse(decrypted);
            else {
              if (!/^[a-f0-9]{64}$/.test(decrypted)) throw securityError();
              const link = `${accountOrigin()}/cuenta/${route}#token=${decrypted}`;
              options = { from: EmailService.sender(), to: user.email, subject: `${verb} · SYSTECH Studio`, html: `<p>Hola, ${escape(user.nombre)}.</p><p><a href="${escape(link)}">${verb}</a></p><p>Este enlace caduca y solo puede utilizarse una vez. Si no lo solicitaste, puedes ignorarlo.</p>` };
            }
            const persisted = await prisma.authAction.updateMany({ where: { id: job.id, consumedAt: null, mailStatus: 'SENDING', attempts: attempt, nextAttemptAt: lease, expiresAt: { gt: new Date() } }, data: { encryptedToken: encrypt(JSON.stringify(options)) } });
            if (!persisted.count) continue;
            if (typeof options.to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.to)) throw securityError();
            if(await prisma.emailSuppression.findUnique({where:{id:recipientKey(options.to)}})){
              await prisma.authAction.updateMany({where:{id:job.id,attempts:attempt,mailStatus:'SENDING',nextAttemptAt:lease},data:{mailStatus:'SUPPRESSED',deliveryStatus:'SUPPRESSED',encryptedToken:null}});continue;
            }
            const result = await EmailService.enviarEmail({ ...options, idempotencyKey: 'account-action/' + job.id });
            if(result.provider==='RESEND'&&result.success&&result.messageId)await financialTransaction(async tx=>{
              const stored=await tx.authAction.updateMany({where:{id:job.id,attempts:attempt},data:{providerMessageId:result.messageId}});
              if(stored.count)await tx.authAction.updateMany({where:{id:job.id,providerMessageId:result.messageId},data:{deliveryStatus:await deliveryState(result.messageId!,tx)}});
            });
            status = result.provider === 'RESEND' && result.success ? 'ACCEPTED' : result.provider === 'DEV_CONSOLE' ? 'NOT_CONFIGURED' : 'RETRY';
          }
        } catch { /* Never log provider payloads, credentials or one-time links. */ }
        if (status === 'RETRY' && job.attempts >= 2) status = 'FAILED';
        await prisma.authAction.updateMany({ where: { id: job.id, consumedAt: null, mailStatus: 'SENDING', attempts: attempt, nextAttemptAt: lease, expiresAt: { gt: new Date() } }, data: { mailStatus: status, ...(status === 'RETRY' ? {} : { encryptedToken: null }) } });
      }
    });
  } finally { processing = false; }
}

// The separate durable worker scans this outbox. Importing HTTP starts no timers.

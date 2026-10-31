import { createHash, randomUUID } from 'node:crypto';
import { prisma, Prisma } from '@systech/database';
import { financialTransaction } from './cash-ledger.service';
import { SaleError } from './financial-error';

export const jobKinds = { MAIL_OUTBOX: 'MAIL', DUNNING: 'LICENSE', REMINDER_24H: 'WHATSAPP', REMINDER_2H: 'WHATSAPP' } as const;
export type JobKind = keyof typeof jobKinds;
export const controlId = (tenantId: string, provider: string) => createHash('sha256').update(tenantId + ':' + provider).digest('hex');
const fail = (status: number, code: string) => { throw new SaleError(status, code, code === 'NOT_FOUND' ? 'Tarea no disponible.' : 'Esta operación no está disponible para la tarea.'); };
export interface JobInput { tenantId: string; key: string; kind: JobKind; entityId?: string; entityVersion?: string; availableAt?: Date; expiresAt: Date; maxAttempts?: number }
export async function enqueueJob(input: JobInput, db: any = prisma) {
  if (!input.tenantId || !Object.hasOwn(jobKinds, input.kind) || !/^[A-Za-z0-9._:/-]{1,200}$/.test(input.key) || !Number.isFinite(input.expiresAt.getTime()) || !Number.isInteger(input.maxAttempts ?? 4) || (input.maxAttempts ?? 4) < 1 || (input.maxAttempts ?? 4) > 8) fail(400, 'INVALID_JOB');
  const now = new Date(), provider = jobKinds[input.kind];
  // Prisma's PostgreSQL raw Date binds timestamptz, whereas our DateTime
  // columns are UTC timestamp without timezone. Cast immutable UTC text so a
  // Mexico-local server timezone cannot shift the due/expiry window by 6h.
  const dateSql = (date: Date) => /^file:/.test(process.env.DATABASE_URL || '') ? Prisma.sql`${date}` : Prisma.sql`${date.toISOString().slice(0, -1)}::timestamp`;
  const nowSql = dateSql(now), availableSql = dateSql(input.availableAt ?? now), expirySql = dateSql(input.expiresAt);
  // Database-native conflict handling also works inside account transactions:
  // catching a Prisma create P2002 would leave a PostgreSQL transaction aborted.
  await db.$executeRaw`INSERT INTO "JobProviderControl" ("id", "tenantId", "provider", "paused", "updatedAt")
    VALUES (${controlId(input.tenantId, provider)}, ${input.tenantId}, ${provider}, ${false}, ${nowSql})
    ON CONFLICT DO NOTHING`;
  await db.$executeRaw`INSERT INTO "DurableJob" ("id", "tenantId", "key", "kind", "provider", "entityId", "entityVersion", "state", "attempts", "maxAttempts", "availableAt", "expiresAt", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${input.tenantId}, ${input.key}, ${input.kind}, ${provider}, ${input.entityId ?? null}, ${input.entityVersion ?? null}, ${'QUEUED'}, ${0}, ${input.maxAttempts ?? 4}, ${availableSql}, ${expirySql}, ${nowSql}, ${nowSql})
    ON CONFLICT ("tenantId", "key") DO NOTHING`;
  const old = await db.durableJob.findFirst({ where: { tenantId: input.tenantId, key: input.key } });
  if (!old || old.kind !== input.kind || (old.entityId || null) !== (input.entityId || null) || (old.entityVersion || null) !== (input.entityVersion || null)) fail(409, 'JOB_KEY_CONFLICT');
  return old;
}

// Limits one in-flight job per tenant/provider. Claim/pausing serialize on its control row.
export async function claimJob(leaseMs = 60_000) {
  if (!Number.isInteger(leaseMs) || leaseMs < 1000 || leaseMs > 300_000) fail(400, 'INVALID_LEASE');
  return financialTransaction(async (rawTx) => {
    const tx: any = rawTx, now = new Date();
    await tx.durableJob.updateMany({ where: { state: { in: ['QUEUED', 'RETRY', 'RUNNING'] }, expiresAt: { lte: now } }, data: { state: 'EXPIRED', leaseToken: null, leaseUntil: null, lastCode: 'EXPIRED' } });
    await tx.durableJob.updateMany({ where: { state: 'RUNNING', leaseUntil: { lte: now }, attempts: { gte: 8 } }, data: { state: 'FAILED', leaseToken: null, leaseUntil: null, lastCode: 'ATTEMPTS_EXHAUSTED' } });
    // Subscription enforcement belongs to the platform, never a tenant pause.
    const paused = await tx.jobProviderControl.findMany({ where: { paused: true, provider: { not: 'LICENSE' } }, select: { tenantId: true, provider: true } });
    const active = await tx.durableJob.findMany({ where: { state: 'RUNNING', leaseUntil: { gt: now } }, select: { tenantId: true, provider: true } });
    const blocked = [...paused, ...active];
    const candidates = await tx.durableJob.findMany({ where: { ...(blocked.length ? { NOT: blocked } : {}), availableAt: { lte: now }, expiresAt: { gt: now }, OR: [{ state: { in: ['QUEUED', 'RETRY'] } }, { state: 'RUNNING', leaseUntil: { lte: now } }] }, orderBy: [{ availableAt: 'asc' }, { id: 'asc' }], take: 50 });
    for (const candidate of candidates) {
      await tx.$executeRaw`UPDATE "JobProviderControl" SET "id"="id" WHERE "id"=${controlId(candidate.tenantId, candidate.provider)}`;
      const control = await tx.jobProviderControl.findFirst({ where: { tenantId: candidate.tenantId, provider: candidate.provider } });
      if (!control || (control.paused && candidate.provider !== 'LICENSE')) continue;
      if (candidate.attempts >= candidate.maxAttempts) { await tx.durableJob.updateMany({ where: { id: candidate.id, state: candidate.state, attempts: candidate.attempts }, data: { state: 'FAILED', leaseToken: null, leaseUntil: null, lastCode: 'ATTEMPTS_EXHAUSTED' } }); continue; }
      if (await tx.durableJob.count({ where: { tenantId: candidate.tenantId, provider: candidate.provider, state: 'RUNNING', leaseUntil: { gt: now }, id: { not: candidate.id } } })) continue;
      const leaseToken = randomUUID();
      const changed = await tx.durableJob.updateMany({ where: { id: candidate.id, state: candidate.state, attempts: candidate.attempts, ...(candidate.state === 'RUNNING' ? { leaseUntil: { lte: now } } : {}), expiresAt: { gt: now } }, data: { state: 'RUNNING', attempts: { increment: 1 }, leaseToken, leaseUntil: new Date(now.getTime() + leaseMs) } });
      if (changed.count) return tx.durableJob.findUnique({ where: { id: candidate.id } });
    }
    return null;
  });
}

export async function renewJob(job: any, leaseMs: number) {
  const now = new Date();
  return (prisma as any).durableJob.updateMany({ where: { id: job.id, state: 'RUNNING', leaseToken: job.leaseToken, leaseUntil: { gt: now }, expiresAt: { gt: now } }, data: { leaseUntil: new Date(Date.now() + leaseMs) } });
}
export type JobResult = { state: 'SUCCEEDED' | 'ACCEPTED' | 'NOT_CONFIGURED' | 'CANCELED' | 'UNCERTAIN'; code?: string };
export async function finishJob(job: any, result: JobResult | null, retryable = false) {
  const now = new Date(), state = result?.state || (retryable && job.attempts < job.maxAttempts ? 'RETRY' : 'FAILED');
  const safeCodes = ['OUTBOX_SCANNED', 'LICENSE_REVIEWED', 'APPOINTMENT_CHANGED', 'TENANT_IDEMPOTENT_PROVIDER_REQUIRED', 'PROVIDER_ACCEPTED'];
  const code = result?.code && safeCodes.includes(result.code) ? result.code : result ? result.state : retryable ? 'PROVIDER_RETRY' : 'JOB_FAILED';
  return (prisma as any).durableJob.updateMany({ where: { id: job.id, state: 'RUNNING', leaseToken: job.leaseToken, leaseUntil: { gt: now }, expiresAt: { gt: now } }, data: { state, leaseToken: null, leaseUntil: null, completedAt: state === 'RETRY' ? null : now, availableAt: new Date(now.getTime() + Math.min(300_000, 1000 * 2 ** job.attempts)), lastCode: code } });
}
export async function retryJob(access: any, id: string) {
  if (access.rol !== 'DUENO') fail(403, 'FORBIDDEN');
  return financialTransaction(async rawTx => {
    const tx: any = rawTx, job = await tx.durableJob.findFirst({ where: { id, tenantId: access.tenantId } });
    if (!job) fail(404, 'NOT_FOUND');
    if (!['FAILED', 'NOT_CONFIGURED'].includes(job.state) || job.expiresAt <= new Date()) fail(409, 'JOB_NOT_RETRYABLE');
    const changed = await tx.durableJob.updateMany({ where: { id, tenantId: access.tenantId, state: job.state, attempts: job.attempts }, data: { state: 'QUEUED', attempts: 0, availableAt: new Date(), lastCode: null, completedAt: null } });
    if (!changed.count) fail(409, 'JOB_CONFLICT');
    await tx.auditoriaLog.create({ data: { tenantId: access.tenantId, usuarioEmail: access.email, accion: 'JOB_RETRY', detalles: JSON.stringify({ jobId: id, kind: job.kind }) } });
    return { success: true };
  });
}
export async function pauseProvider(access: any, provider: string, paused: boolean) {
  if (access.rol !== 'DUENO') fail(403, 'FORBIDDEN');
  if (!['MAIL', 'WHATSAPP', 'LICENSE'].includes(provider) || typeof paused !== 'boolean') fail(400, 'INVALID_PROVIDER');
  if (provider === 'LICENSE') {
    await prisma.auditoriaLog.create({ data: { tenantId: access.tenantId, usuarioEmail: access.email, accion: 'JOB_PROVIDER_CONTROL_DENIED', detalles: JSON.stringify({ provider, reason: 'PLATFORM_MANAGED' }) } });
    fail(403, 'PLATFORM_MANAGED_PROVIDER');
  }
  return financialTransaction(async rawTx => {
    const tx: any = rawTx;
    await tx.jobProviderControl.upsert({ where: { id: controlId(access.tenantId, provider) }, create: { id: controlId(access.tenantId, provider), tenantId: access.tenantId, provider, paused }, update: { paused } });
    await tx.auditoriaLog.create({ data: { tenantId: access.tenantId, usuarioEmail: access.email, accion: paused ? 'JOB_PROVIDER_PAUSED' : 'JOB_PROVIDER_RESUMED', detalles: JSON.stringify({ provider }) } });
    return { success: true, provider, paused, activeJobPolicy: 'La tarea ya reclamada puede terminar; nuevas reclamaciones quedan detenidas.' };
  });
}

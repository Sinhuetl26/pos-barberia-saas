import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@systech/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { allowSecurityAttempt, consumeAction, requestAction, passwordValid, passwordMessage, revokeSessions, securityError } from '../services/account-security.service';

export const accountSecurityRouter = Router();
accountSecurityRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });
const generic = { message: 'Si la cuenta puede realizar esta acción, recibirá un enlace por correo. Revisa también correo no deseado.' };
const emailValue = (value: any) => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? value.trim().toLowerCase() : null;
async function limit(req: any, scope: string, email?: string) {
  const allowedIp = await allowSecurityAttempt(scope + ':ip', req.ip || req.socket.remoteAddress || 'unknown', 30);
  if (!allowedIp) throw securityError(429, 'Demasiados intentos. Espera 15 minutos y vuelve a intentar.');
  const allowedAccount = email ? await allowSecurityAttempt(scope + ':account', email, 5) : true;
  if (!allowedIp || !allowedAccount) throw securityError(429, 'Demasiados intentos. Espera 15 minutos y vuelve a intentar.');
}
for (const [path, purpose] of [['/recovery/request', 'RESET'], ['/verification/request', 'VERIFY']] as const) {
  accountSecurityRouter.post(path, async (req, res, next) => {
    const start = Date.now();
    try {
      const email = emailValue(req.body.email);
      if (!email) throw securityError(400, 'Introduce un correo válido.');
      await limit(req, purpose, email);
      await requestAction(email, purpose);
      // The provider is contacted only by the durable background outbox, never here.
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 350 - (Date.now() - start))));
      res.status(202).json(generic);
    } catch (e: any) { if (e.status === 429) res.setHeader('Retry-After', '900'); next(e); }
  });
}
for (const [path, purpose] of [['/recovery/complete', 'RESET'], ['/verification/complete', 'VERIFY'], ['/invitation/accept', 'INVITE']] as const) {
  accountSecurityRouter.post(path, async (req, res, next) => {
    try { await limit(req, 'consume'); await consumeAction(typeof req.body.token === 'string' ? req.body.token : '', purpose, req.body.password); res.json({ message: purpose === 'VERIFY' ? 'Correo verificado. Ya puedes continuar.' : 'Contraseña guardada. Inicia sesión con tu correo y tu nueva contraseña.' }); }
    catch (e) { next(e); }
  });
}
accountSecurityRouter.get('/security', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try { const user=await prisma.usuario.findUnique({ where: { id: req.ctx!.userId }, select: { email: true, emailVerifiedAt: true, verificationRequired: true } });const mail=await prisma.authAction.findFirst({where:{userId:req.ctx!.userId,purpose:'VERIFY'},orderBy:{createdAt:'desc'},select:{mailStatus:true,deliveryStatus:true,createdAt:true}});res.json({...user,mail}); } catch (e) { next(e); }
});
accountSecurityRouter.post('/security/password', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await limit(req, 'password', req.ctx!.userId);
    if (!passwordValid(req.body.password)) throw securityError(400, passwordMessage);
    const user = await prisma.usuario.findUniqueOrThrow({ where: { id: req.ctx!.userId } });
    if (typeof req.body.currentPassword !== 'string' || req.body.currentPassword.length > 256 || !await bcrypt.compare(req.body.currentPassword, user.passwordHash)) throw securityError(400, 'La contraseña actual no es correcta.');
    await revokeSessions(user.id, req.ctx!.sessionVersion, await bcrypt.hash(req.body.password, 12));
    res.json({ message: 'Contraseña actualizada. Se cerraron todas las sesiones; inicia sesión nuevamente.' });
  } catch (e) { next(e); }
});
accountSecurityRouter.post('/security/logout-all', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try { await revokeSessions(req.ctx!.userId, req.ctx!.sessionVersion); res.json({ message: 'Se cerraron todas las sesiones de tu cuenta.' }); } catch (e) { next(e); }
});

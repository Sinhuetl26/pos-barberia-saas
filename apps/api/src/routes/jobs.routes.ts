import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { pauseProvider, retryJob } from '../services/durable-jobs.service';

export const jobsRouter = Router();
jobsRouter.use(requireAuth, requireRole('DUENO'));
jobsRouter.get('/status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const db: any = prisma, since = new Date(Date.now() - 120_000);
    res.json({ workerAvailable: await db.jobWorkerPulse.count({ where: { lastSeen: { gt: since } } }) > 0,
      pendingActions: await db.authAction.count({ where: { tenantId: req.ctx!.tenantId, consumedAt: null, expiresAt: { gt: new Date() }, mailStatus: { in: ['QUEUED', 'SENDING', 'RETRY'] } } }),
      providers: (await db.jobProviderControl.findMany({ where: { tenantId: req.ctx!.tenantId }, select: { provider: true, paused: true } })).map((control: any) => ({ ...control, paused: control.provider === 'LICENSE' ? false : control.paused, controlAllowed: control.provider !== 'LICENSE' })),
      deliveryPolicy: 'Tarea confirmada no significa mensaje entregado. Sin ejecutor activo, permanece pendiente.' });
  } catch (error) { next(error); }
});
jobsRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
  try { res.json(await (prisma as any).durableJob.findMany({ where: { tenantId: req.ctx!.tenantId }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, kind: true, provider: true, state: true, attempts: true, maxAttempts: true, lastCode: true, availableAt: true, expiresAt: true, completedAt: true } })); }
  catch (error) { next(error); }
});
jobsRouter.post('/:id/retry', async (req: AuthenticatedRequest, res, next) => {
  try { res.json(await retryJob(req.ctx, req.params.id)); } catch (error) { next(error); }
});
jobsRouter.put('/providers/:provider', async (req: AuthenticatedRequest, res, next) => {
  try { res.json(await pauseProvider(req.ctx, req.params.provider, req.body.paused)); } catch (error) { next(error); }
});

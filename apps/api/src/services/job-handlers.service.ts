import { prisma } from '@systech/database';
import { processSecurityMail } from './account-security.service';
import { StripeBillingService } from './stripe.service';
import { JobResult } from './durable-jobs.service';

export type JobHandler = ((job: any, key: string, signal: AbortSignal) => Promise<JobResult>) & { replaySafe?: boolean };
export const defaultJobHandler: JobHandler = Object.assign(async (job: any, _key: string, signal: AbortSignal): Promise<JobResult> => {
  if (signal.aborted) throw new Error('JOB_ABORTED');
  if (job.kind === 'MAIL_OUTBOX') {
    await processSecurityMail(job.tenantId, signal);
    return { state: 'SUCCEEDED', code: 'OUTBOX_SCANNED' }; // acceptance/delivery remain on AuthAction.
  }
  if (job.kind === 'DUNNING') {
    // Reuse rules with an explicit WHERE tenant filter, never ambient context alone.
    await StripeBillingService.ejecutarDunning(prisma, job.tenantId);
    return { state: 'SUCCEEDED', code: 'LICENSE_REVIEWED' };
  }
  const appointment = await prisma.cita.findFirst({ where: { id: job.entityId, tenantId: job.tenantId }, select: { fechaHora: true, estado: true } });
  if (!appointment || !['PENDIENTE', 'CONFIRMADA'].includes(appointment.estado) || appointment.fechaHora.toISOString() !== job.entityVersion) return { state: 'CANCELED', code: 'APPOINTMENT_CHANGED' };
  // Global legacy Meta credentials cannot provide tenant isolation or safe replay.
  // ST-21 must supply a per-business idempotent adapter before external delivery.
  return { state: 'NOT_CONFIGURED', code: 'TENANT_IDEMPOTENT_PROVIDER_REQUIRED' };
}, { replaySafe: true });

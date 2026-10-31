import { prisma } from '@systech/database';
import { enqueueJob } from './durable-jobs.service';
import { cleanExpiredSecurityActions } from './account-security.service';

// Keyed by action/appointment/licence transition, never idle periodic MAIL rows.
// Cursor pages make due work beyond the first 200 records reachable.
export async function scheduleJobs(now = new Date()) {
  const db: any = prisma; let confirmed = 0;
  await cleanExpiredSecurityActions(now);
  async function pages(model: any, where: any, consume: (row: any) => Promise<void>) {
    let cursor: string | undefined;
    for (;;) {
      const rows = await model.findMany({ where, orderBy: { id: 'asc' }, take: 200, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
      for (const row of rows) await consume(row);
      if (rows.length < 200) break;
      cursor = rows[rows.length - 1].id;
    }
  }
  await pages(db.authAction, { consumedAt: null, expiresAt: { gt: now }, mailStatus: { in: ['QUEUED', 'RETRY', 'SENDING'] }, nextAttemptAt: { lte: now } }, async action => {
    const job = await enqueueJob({ tenantId: action.tenantId, key: `mail/action/${action.id}`, kind: 'MAIL_OUTBOX', entityId: action.id, expiresAt: action.expiresAt });
    // A sweep may finish while the durable outbox needs a later bounded retry.
    await db.durableJob.updateMany({ where: { id: job.id, state: 'SUCCEEDED', expiresAt: { gt: now } }, data: { state: 'QUEUED', attempts: 0, availableAt: now, completedAt: null } });
    confirmed++;
  });
  await pages(db.tenant, { OR: [
    { estado: 'ACTIVO', suscripcion: { fechaProximoCobro: { lte: now }, stripeSubscriptionId: null } },
    { estado: 'EN_RIESGO', suscripcion: { fechaSuspension: { lte: now } } }
  ] }, async tenant => {
    const sub = await db.suscripcion.findUnique({ where: { tenantId: tenant.id } });
    const effectiveDate = tenant.estado === 'ACTIVO' ? sub?.fechaProximoCobro : sub?.fechaSuspension;
    if (!effectiveDate) return;
    // Re-evaluate overdue licences every UTC day, including after a long outage.
    // The handler's transactional state CAS makes overlapping windows harmless.
    const window = Math.floor(now.getTime() / 86400000);
    await enqueueJob({ tenantId: tenant.id, key: `license/${sub.id}/${tenant.estado}/${effectiveDate.getTime()}/${window}`, kind: 'DUNNING', expiresAt: new Date((window + 2) * 86400000) }); confirmed++;
  });
  await pages(db.cita, { estado: { in: ['PENDIENTE', 'CONFIRMADA'] }, OR: [
    { fechaHora: { gte: new Date(now.getTime() + 23.5 * 3600000), lte: new Date(now.getTime() + 24.5 * 3600000) } },
    { fechaHora: { gte: new Date(now.getTime() + 1.5 * 3600000), lte: new Date(now.getTime() + 2.5 * 3600000) } }
  ] }, async appointment => {
    const kind = appointment.fechaHora.getTime() - now.getTime() > 12 * 3600000 ? 'REMINDER_24H' : 'REMINDER_2H';
    await enqueueJob({ tenantId: appointment.tenantId, key: `${kind}/${appointment.id}/${appointment.fechaHora.getTime()}`, kind, entityId: appointment.id, entityVersion: appointment.fechaHora.toISOString(), expiresAt: appointment.fechaHora }); confirmed++;
  });
  return { confirmed, recordatorios24hEnviados: 0, recordatorios2hEnviados: 0, execution: 'SEPARATE_WORKER' };
}

export async function pruneCompletedJobs(retentionDays = 14) {
  if (!Number.isInteger(retentionDays) || retentionDays < 7 || retentionDays > 365) throw new Error('INVALID_JOB_RETENTION');
  // Keep failures/uncertain outcomes visible and all audit records. Only successes,
  // canceled or expired work beyond its delivery horizon may lose its dedup row.
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  return (prisma as any).durableJob.deleteMany({ where: { state: { in: ['SUCCEEDED', 'ACCEPTED', 'CANCELED', 'EXPIRED'] }, expiresAt: { lt: cutoff }, updatedAt: { lt: cutoff } } });
}

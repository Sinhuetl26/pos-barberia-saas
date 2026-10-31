import 'dotenv/config';
import { prisma } from '@systech/database';
import { runOneJob } from './services/durable-worker.service';
import { scheduleJobs, pruneCompletedJobs } from './services/job-scheduler.service';
import { randomUUID } from 'node:crypto';

const milliseconds = (name: string, fallback: number, min: number, max: number) => {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid worker setting: ${name}`);
  return value;
};
let stopping = false;
process.once('SIGTERM', () => { stopping = true; }); process.once('SIGINT', () => { stopping = true; });
// Windows forcibly terminates child.kill(SIGTERM). Isolated tests use IPC to
// exercise the same graceful stop path without touching any live process.
if (process.env.NODE_ENV === 'test' && process.env.SYSTECH_ISOLATED_TESTS === 'true' && process.send) {
  process.on('message', message => { if ((message as any)?.type === 'STOP_ISOLATED_WORKER') stopping = true; });
}
async function main() {
  if (process.env.NODE_ENV === 'production') {
    const connectionLimit = Number(new URL(process.env.DATABASE_URL || '').searchParams.get('connection_limit'));
    if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 2) throw new Error('Worker requires a PostgreSQL pool limit of one or two connections.');
  }
  const pollMs = milliseconds('JOB_POLL_MS', 1000, 100, 60_000), scheduleMs = milliseconds('JOB_SCHEDULE_MS', 30_000, 1000, 600_000);
  const leaseMs = milliseconds('JOB_LEASE_MS', 60_000, 5000, 300_000), timeoutMs = milliseconds('JOB_TIMEOUT_MS', 30_000, 1000, leaseMs - 1000);
  const retentionDays = milliseconds('JOB_RETENTION_DAYS', 14, 7, 365);
  if (process.env.NODE_ENV === 'test' && process.env.SYSTECH_ISOLATED_TESTS === 'true' && process.env.JOB_TEST_CONNECTION_METRICS === 'true' && /^postgres(?:ql)?:/.test(process.env.DATABASE_URL || '')) {
    const rows: any = await prisma.$queryRaw`SELECT pg_backend_pid() AS "backendPid"`;
    process.send?.({ code: 'ISOLATED_CONNECTION_METRICS', backendPid: rows[0].backendPid, rssBytes: process.memoryUsage().rss });
  }
  let nextSchedule = 0, completed = 0, nextPulse = 0, nextCleanup = 0;
  const workerId = randomUUID(), db: any = prisma;
  while (!stopping) {
    try {
      if (Date.now() >= nextPulse) {
        await db.jobWorkerPulse.upsert({ where: { id: workerId }, create: { id: workerId, lastSeen: new Date(), rssBytes: process.memoryUsage().rss }, update: { lastSeen: new Date(), rssBytes: process.memoryUsage().rss } });
        await db.jobWorkerPulse.deleteMany({ where: { lastSeen: { lt: new Date(Date.now() - 86400000) } } });
        nextPulse = Date.now() + 15_000;
      }
      if (Date.now() >= nextSchedule && process.env.JOB_SCHEDULER_ENABLED !== 'false') { await scheduleJobs(); nextSchedule = Date.now() + scheduleMs; }
      if (Date.now() >= nextCleanup) { await pruneCompletedJobs(retentionDays); nextCleanup = Date.now() + 3600000; }
      if (await runOneJob(undefined, leaseMs, timeoutMs)) { completed++; continue; }
    } catch { console.error(JSON.stringify({ component: 'durable-worker', code: 'COORDINATION_UNAVAILABLE' })); }
    await new Promise(resolve => setTimeout(resolve, pollMs));
  }
  console.log(JSON.stringify({ component: 'durable-worker', code: 'STOPPED', completed, rssBytes: process.memoryUsage().rss }));
  await db.jobWorkerPulse.deleteMany({ where: { id: workerId } });
}
void main().catch(() => { console.error(JSON.stringify({ component: 'durable-worker', code: 'START_FAILED' })); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); if (process.connected) process.disconnect?.(); });

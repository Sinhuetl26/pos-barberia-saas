'use strict';
// Controlled provider adapter only for disposable fixtures; never a production plugin.
if (process.env.NODE_ENV !== 'test' || process.env.SYSTECH_ISOLATED_TESTS !== 'true') throw new Error('Isolated test process required');
if (process.env.SYSTECH_TEST_PRISMA_CLIENT) require('./test_prisma_client');
const { prisma } = require('@systech/database');
const { runOneJob } = require('../apps/api/dist/services/durable-worker.service');
const { claimJob } = require('../apps/api/dist/services/durable-jobs.service');
const { scheduleJobs } = require('../apps/api/dist/services/job-scheduler.service');
const { defaultJobHandler } = require('../apps/api/dist/services/job-handlers.service');
async function main() {
  if (process.env.JOB_TEST_MODE === 'claim') { const job = await claimJob(1000); process.send?.({ claimed: job?.id, token: job?.leaseToken }); await new Promise(() => {}); }
  if (process.env.JOB_TEST_MODE === 'schedule') { await scheduleJobs(process.env.JOB_TEST_NOW ? new Date(process.env.JOB_TEST_NOW) : undefined); return; }
  if (process.env.JOB_TEST_MODE === 'default') { await runOneJob(); return; }
  if (process.env.JOB_TEST_MODE === 'late-license') {
    const job = await claimJob(1000); process.send?.({ claimed: job?.id });
    await new Promise(resolve => process.once('message', resolve));
    await defaultJobHandler(job, 'durable-job/' + job.id, new AbortController().signal);
    return;
  }
  const url = new URL(process.env.JOB_TEST_PROVIDER_URL);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw new Error('Local fixture provider required');
  const handler = Object.assign(async (job, key, signal) => {
    const response = await fetch(url, { method: 'POST', signal, headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify({ tenantId: job.tenantId, entityId: job.entityId, entityVersion: job.entityVersion, kind: job.kind }) });
    if (!response.ok) throw new Error('Provider rejection contains telephone 525555555555 and token TOPSECRET');
    return { state: 'ACCEPTED', code: 'PROVIDER_ACCEPTED' };
  }, { replaySafe: process.env.JOB_TEST_UNSAFE !== 'true' });
  const ran = await runOneJob(handler, 15000, 5000);
  process.send?.({ ran, rssBytes: process.memoryUsage().rss });
}
void main().then(() => prisma.$disconnect()).then(() => process.exit(0)).catch(() => { process.send?.({ error: 'TEST_WORKER_FAILED' }); void prisma.$disconnect().then(() => process.exit(1)); });

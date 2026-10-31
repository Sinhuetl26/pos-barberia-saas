import { claimJob, finishJob, renewJob } from './durable-jobs.service';
import { defaultJobHandler, JobHandler } from './job-handlers.service';

export async function runOneJob(handler: JobHandler = defaultJobHandler, leaseMs = 60_000, timeoutMs = 30_000) {
  const job = await claimJob(leaseMs);
  if (!job) return false;
  if (job.attempts > 1 && handler.replaySafe !== true) { await finishJob(job, { state: 'UNCERTAIN' }); return true; }
  const controller = new AbortController(); let leaseLost = false;
  const heartbeat = setInterval(() => { void renewJob(job, leaseMs).then((r: any) => { if (!r.count) { leaseLost = true; controller.abort(); } }).catch(() => { leaseLost = true; controller.abort(); }); }, Math.max(250, Math.floor(leaseMs / 3)));
  let deadline: NodeJS.Timeout | undefined;
  try {
    // Provider adapter must reuse this key and immutable request for every attempt.
    const result = await Promise.race([
      handler(job, `durable-job/${job.id}`, controller.signal),
      new Promise<never>((_resolve, reject) => { deadline = setTimeout(() => { controller.abort(); reject(new Error('JOB_TIMEOUT')); }, timeoutMs); })
    ]);
    if (!leaseLost) await finishJob(job, result);
  } catch {
    if (!leaseLost) await finishJob(job, handler.replaySafe === true ? null : { state: 'UNCERTAIN' }, handler.replaySafe === true);
  } finally { clearInterval(heartbeat); clearTimeout(deadline); }
  return true;
}

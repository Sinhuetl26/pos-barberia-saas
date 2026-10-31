'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), { fork } = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (process.env.NODE_ENV !== 'test' || process.env.SYSTECH_ISOLATED_TESTS !== 'true' || !process.env.SYSTECH_TEST_PG_URL || path.resolve(process.env.SYSTECH_TEST_PRISMA_CLIENT || '.') !== path.join(root, '.tools/prisma-postgres/client')) throw new Error('Isolated PostgreSQL resources test required');
require('./test_prisma_client');
async function main() {
  const fixture = require('./test_fixture').createTestFixture(); Object.assign(process.env, fixture.env);
  const { prisma } = require('@systech/database'), url = new URL(fixture.env.DATABASE_URL); url.searchParams.set('connection_limit', '1');
  let child, metric, exit;
  try {
    child = fork(path.join(root, 'apps/api/dist/worker.js'), [], { env: { ...fixture.env, DATABASE_URL: url.toString(), JOB_SCHEDULER_ENABLED: 'false', JOB_TEST_CONNECTION_METRICS: 'true', JOB_POLL_MS: '100' }, execArgv: ['--require', path.join(__dirname, 'test_prisma_client.js')], stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true });
    child.logs = ''; child.stdout.on('data', d => child.logs += d); child.stderr.on('data', d => child.logs += d);
    exit = new Promise(resolve => child.once('exit', code => resolve(code)));
    metric = await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('Metrics worker timeout')), 15000); child.on('message', value => { if (value.code === 'ISOLATED_CONNECTION_METRICS') { clearTimeout(timeout); resolve(value); } }); child.once('exit', () => { clearTimeout(timeout); reject(new Error('Worker stopped before metrics')); }); });
    const rows = await prisma.$queryRaw`SELECT COUNT(*)::int AS "connections" FROM pg_stat_activity WHERE pid=${metric.backendPid}`;
    assert.equal(rows[0].connections, 1);
    child.send({ type: 'STOP_ISOLATED_WORKER' }); assert.equal(await exit, 0);
    const stop = child.logs.split('\n').map(line => { try { return JSON.parse(line); } catch { return null; } }).find(value => value?.code === 'STOPPED'); assert(stop);
    const evidence = { ...require('./test_evidence').createTestEvidence(), configuredPoolLimit: 1, observedWorkerConnections: rows[0].connections, idleWorkerRssBytes: metric.rssBytes, stoppedWorkerRssBytes: stop.rssBytes, independentProcess: true, productionCapacityCertified: false, hostingCostConfirmed: false };
    fs.writeFileSync(path.join(root, 'docs/ST12_RECURSOS_LOCALES.json'), JSON.stringify(evidence, null, 2) + '\n'); console.log(JSON.stringify(evidence));
  } finally { if (child && child.exitCode === null && child.signalCode === null) { child.kill(); await exit; } await prisma.$disconnect(); require('./test_fixture').cleanTestFixture(fixture.directory); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

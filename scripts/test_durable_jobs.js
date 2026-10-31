'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http'), fs = require('node:fs');
const { createTestEvidence } = require('./test_evidence');
const { fork } = require('node:child_process');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
async function main() {
  const evidence = createTestEvidence(), checked = [];
  const expectedClient = path.resolve(__dirname, '..', '.tools', process.env.SYSTECH_TEST_PG_URL ? 'prisma-postgres' : 'prisma-sqlite', 'client');
  if (path.resolve(process.env.SYSTECH_TEST_PRISMA_CLIENT || '.') !== expectedClient) throw new Error('Matching isolated fixture/client required');
  const fixture = createTestFixture(); fixture.env.SYSTECH_ISOLATED_TESTS = 'true'; Object.assign(process.env, fixture.env);
  if (process.env.SYSTECH_TEST_PRISMA_CLIENT) require('./test_prisma_client');
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken');
  const jobs = require('../apps/api/dist/services/durable-jobs.service'), { scheduleJobs, pruneCompletedJobs } = require('../apps/api/dist/services/job-scheduler.service');
  const children = [], accepted = new Map(), attempts = new Map(), metrics = [];
  let providerMode = 'success', checks = 0, provider, providerUrl;
  const check = async (name, fn) => { await fn(); checks++; checked.push(name); console.log('PASS ' + name); };
  const stop = async child => { if (child.exitCode !== null || child.signalCode !== null) return; await new Promise(resolve => { child.once('exit', resolve); if (child.gracefulWorker && child.connected) child.send({ type: 'STOP_ISOLATED_WORKER' }); else child.kill('SIGTERM'); }); };
  const childEnv = extra => ({ ...fixture.env, ...extra });
  const spawn = (file, extra = {}, ipc = true) => {
    const child = fork(file, [], { env: childEnv(extra), execArgv: process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [], stdio: ['ignore', 'pipe', 'pipe', ...(ipc ? ['ipc'] : [])] });
    children.push(child); child.logs = ''; child.stdout.on('data', d => { child.logs += d; }); child.stderr.on('data', d => { child.logs += d; }); return child;
  };
  const runWorker = async extra => {
    const child = spawn(path.join(__dirname, 'test_durable_jobs_worker.js'), { JOB_TEST_PROVIDER_URL: providerUrl, ...extra });
    let result; child.on('message', m => { result = m; if (m.rssBytes) metrics.push(m.rssBytes); });
    const code = await new Promise(resolve => child.once('exit', resolve)); assert.equal(code, 0, child.logs); return result;
  };
  const eventually = async fn => { const end = Date.now() + 10000; while (Date.now() < end) { if (await fn()) return; await new Promise(r => setTimeout(r, 100)); } throw new Error('Condition timed out'); };
  try {
    provider = http.createServer((req, res) => {
      let payload = ''; req.on('data', d => payload += d); req.on('end', () => {
        const key = req.headers['idempotency-key']; attempts.set(key, (attempts.get(key) || 0) + 1);
        if (providerMode === 'fail') { res.writeHead(503).end('525555555555 TOPSECRET'); return; }
        if (accepted.has(key)) assert.equal(accepted.get(key), payload, 'Idempotency request changed'); else accepted.set(key, payload);
        if (providerMode === 'lost-response') { providerMode = 'success'; req.socket.destroy(); return; }
        if (providerMode === 'hang') return;
        res.writeHead(200, { 'content-type': 'application/json' }).end('{"accepted":true}');
      });
    });
    await new Promise(r => provider.listen(0, '127.0.0.1', r)); providerUrl = `http://127.0.0.1:${provider.address().port}`;
    const tenants = await Promise.all(['A', 'B'].map(name => prisma.tenant.create({ data: { nombre: 'Durable ' + name, slug: 'durable-' + name } })));
    const users = {};
    for (const [i, t] of tenants.entries()) for (const role of ['DUENO', 'GERENTE', 'CAJERO', 'BARBERO']) users[i + role] = await prisma.usuario.create({ data: { tenantId: t.id, nombre: role, email: `job-${i}-${role}@fixture.invalid`.toLowerCase(), passwordHash: 'disabled', rol: role } });
    const future = () => new Date(Date.now() + 3600000), enqueue = (key, tenant = tenants[0], extra = {}) => jobs.enqueueJob({ tenantId: tenant.id, key, kind: 'REMINDER_2H', entityId: 'fixture-appointment', entityVersion: 'fixed-reference', expiresAt: future(), ...extra });
    const reset = async () => { await prisma.durableJob.deleteMany(); await prisma.jobProviderControl.deleteMany(); accepted.clear(); attempts.clear(); providerMode = 'success'; };
    const retryNow = id => prisma.durableJob.update({ where: { id }, data: { availableAt: new Date(0) } });
    await check('Two worker processes claim a reminder once, same key deduplicates, and tenant keys remain independent', async () => {
      const rows = await Promise.all(Array.from({ length: 8 }, () => enqueue('reminder/repeated'))); assert.equal(new Set(rows.map(r => r.id)).size, 1);
      assert(rows[0].expiresAt > new Date(Date.now() + 3500000), 'UTC expiry must remain unchanged on a non-UTC PostgreSQL server');
      await Promise.all([runWorker(), runWorker()]); assert.equal(accepted.size, 1); assert.equal((await prisma.durableJob.findUniqueOrThrow({ where: { id: rows[0].id } })).attempts, 1);
      const b = await enqueue('reminder/repeated', tenants[1]); assert.notEqual(b.id, rows[0].id); await runWorker(); assert.equal(accepted.size, 2);
      await assert.rejects(enqueue('reminder/repeated', tenants[0], { entityVersion: 'changed' }), e => e.code === 'JOB_KEY_CONFLICT');
    });
    await check('Provider acceptance with lost response replays the same immutable key without a second delivery', async () => {
      await reset(); const row = await enqueue('lost-response'); providerMode = 'lost-response'; await runWorker();
      assert.equal(accepted.size, 1); assert.equal((await prisma.durableJob.findUniqueOrThrow({ where: { id: row.id } })).state, 'RETRY');
      await retryNow(row.id); await runWorker(); const done = await prisma.durableJob.findUniqueOrThrow({ where: { id: row.id } });
      assert.equal(done.state, 'ACCEPTED'); assert.equal(accepted.size, 1); assert.equal(attempts.get('durable-job/' + row.id), 2);
    });
    await check('Crash after claim is recovered by another process, and an expired lease cannot renew or finish', async () => {
      await reset(); const row = await enqueue('crash-after-claim');
      const child = spawn(path.join(__dirname, 'test_durable_jobs_worker.js'), { JOB_TEST_MODE: 'claim' });
      const message = await new Promise(r => child.once('message', r)); assert.equal(message.claimed, row.id);
      const leased = await prisma.durableJob.findUniqueOrThrow({ where: { id: row.id } }); await stop(child);
      await prisma.durableJob.update({ where: { id: row.id }, data: { leaseUntil: new Date(0) } });
      assert.equal((await jobs.renewJob(leased, 3000)).count, 0); assert.equal((await jobs.finishJob(leased, { state: 'ACCEPTED' })).count, 0);
      await runWorker(); assert.equal(accepted.size, 1); assert.equal((await prisma.durableJob.findUniqueOrThrow({ where: { id: row.id } })).attempts, 2);
      assert.equal((await jobs.finishJob(leased, { state: 'SUCCEEDED' })).count, 0);
    });
    await check('Timeout without replay guarantee becomes UNCERTAIN and cannot be reexecuted as a fresh delivery', async () => {
      await reset(); const row = await enqueue('unsafe-provider'); providerMode = 'hang'; await runWorker({ JOB_TEST_UNSAFE: 'true' });
      assert.equal((await prisma.durableJob.findUniqueOrThrow({ where: { id: row.id } })).state, 'UNCERTAIN');
      assert.equal(accepted.size, 1); await runWorker({ JOB_TEST_UNSAFE: 'true' }); assert.equal(attempts.get('durable-job/' + row.id), 1);
      await assert.rejects(jobs.retryJob({ ...users['0DUENO'], userId: users['0DUENO'].id }, row.id), e => e.code === 'JOB_NOT_RETRYABLE'); providerMode = 'success';
    });
    await check('Provider errors exhaust bounded attempts, expiry prevents calls, and unavailable coordination sends nothing', async () => {
      await reset(); const row = await enqueue('failure', tenants[0], { maxAttempts: 2 }); providerMode = 'fail'; await runWorker(); await retryNow(row.id); await runWorker();
      const failed = await prisma.durableJob.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(failed.state, 'FAILED'); assert.equal(failed.attempts, 2); assert.equal(failed.lastCode, 'PROVIDER_RETRY');
      assert.equal(JSON.stringify(failed).includes('TOPSECRET'), false); assert.equal(JSON.stringify(failed).includes('525555555555'), false);
      const expired = await enqueue('expired', tenants[1], { expiresAt: new Date(0) }); await runWorker(); assert.equal((await prisma.durableJob.findUniqueOrThrow({ where: { id: expired.id } })).state, 'EXPIRED'); assert.equal(accepted.size, 0);
      const child = spawn(path.join(__dirname, 'test_durable_jobs_worker.js'), { JOB_TEST_PROVIDER_URL: providerUrl, DATABASE_URL: 'file:' + path.join(fixture.directory, 'missing', 'job.db').replace(/\\/g, '/') });
      const code = await new Promise(r => child.once('exit', r)); assert.equal(code, 1); assert.equal(attempts.size, 1); assert.equal(child.logs.includes('TOPSECRET'), false);
    });
    await check('Pausing one tenant does not starve another; controls and retries require owner, tenant and audit', async () => {
      await reset(); const a = await enqueue('paused'), b = await enqueue('available', tenants[1]);
      const owner = { ...users['0DUENO'], userId: users['0DUENO'].id };
      await jobs.pauseProvider(owner, 'WHATSAPP', true); await runWorker(); assert.equal(accepted.size, 1); assert.equal((await prisma.durableJob.findUniqueOrThrow({ where: { id: a.id } })).state, 'QUEUED'); assert.equal((await prisma.durableJob.findUniqueOrThrow({ where: { id: b.id } })).state, 'ACCEPTED');
      await jobs.pauseProvider(owner, 'WHATSAPP', false); await runWorker(); assert.equal(accepted.size, 2);
      await assert.rejects(jobs.pauseProvider({ ...users['0GERENTE'], userId: users['0GERENTE'].id }, 'MAIL', true), e => e.code === 'FORBIDDEN');
      await prisma.durableJob.update({ where: { id: a.id }, data: { state: 'FAILED' } });
      await assert.rejects(jobs.retryJob({ ...users['1DUENO'], userId: users['1DUENO'].id }, a.id), e => e.code === 'NOT_FOUND');
      await jobs.retryJob(owner, a.id); assert.equal(await prisma.auditoriaLog.count({ where: { tenantId: tenants[0].id, accion: 'JOB_RETRY' } }), 1);
      assert.equal(await prisma.auditoriaLog.count({ where: { tenantId: tenants[0].id, accion: 'JOB_PROVIDER_PAUSED' } }), 1);
    });
    await check('Idle schedulers create no periodic MAIL rows; retention keeps failures and audit records', async () => {
      await reset(); await Promise.all([scheduleJobs(), scheduleJobs()]); assert.equal(await prisma.durableJob.count(), 0);
      const done = await enqueue('old-completed'), failed = await enqueue('old-failure');
      const old = new Date(Date.now() - 20 * 86400000);
      await prisma.durableJob.update({ where: { id: done.id }, data: { state: 'SUCCEEDED', expiresAt: old, updatedAt: old } });
      await prisma.durableJob.update({ where: { id: failed.id }, data: { state: 'FAILED', expiresAt: old, updatedAt: old } });
      const audits = await prisma.auditoriaLog.count(); assert.equal((await pruneCompletedJobs(14)).count, 1); assert.equal(await prisma.durableJob.count(), 1); assert.equal(await prisma.auditoriaLog.count(), audits);
    });
    await check('A tenant owner cannot pause platform license enforcement; legacy license pauses are ignored', async () => {
      await reset(); const owner = { ...users['0DUENO'], userId: users['0DUENO'].id };
      await assert.rejects(jobs.pauseProvider(owner, 'LICENSE', true), e => e.code === 'PLATFORM_MANAGED_PROVIDER');
      assert.equal(await prisma.auditoriaLog.count({ where: { tenantId: owner.tenantId, accion: 'JOB_PROVIDER_CONTROL_DENIED' } }), 1);
      const row = await jobs.enqueueJob({ tenantId: owner.tenantId, key: 'license-platform-managed', kind: 'DUNNING', expiresAt: future() });
      await prisma.jobProviderControl.update({ where: { id: jobs.controlId(owner.tenantId, 'LICENSE') }, data: { paused: true } });
      await runWorker({ JOB_TEST_MODE: 'default' });
      assert.equal((await prisma.durableJob.findUniqueOrThrow({ where: { id: row.id } })).state, 'SUCCEEDED');
    });
    await check('License handler stays inside one tenant and a slow expired owner cannot repeat grace or audit transitions', async () => {
      await reset();
      for (const tenant of tenants) await prisma.suscripcion.create({ data: { tenantId: tenant.id, montoMensual: 499, fechaProximoCobro: new Date(Date.now() - 60000) } });
      const row = await jobs.enqueueJob({ tenantId: tenants[0].id, key: 'license-once', kind: 'DUNNING', expiresAt: future() });
      const slow = spawn(path.join(__dirname, 'test_durable_jobs_worker.js'), { JOB_TEST_MODE: 'late-license' });
      const message = await new Promise(r => slow.once('message', r)); assert.equal(message.claimed, row.id);
      await prisma.durableJob.update({ where: { id: row.id }, data: { leaseUntil: new Date(0) } });
      await runWorker({ JOB_TEST_MODE: 'default' });
      const originalGrace = (await prisma.suscripcion.findUniqueOrThrow({ where: { tenantId: tenants[0].id } })).fechaSuspension;
      slow.send({ continue: true }); assert.equal(await new Promise(r => slow.once('exit', r)), 0);
      assert.equal((await prisma.tenant.findUniqueOrThrow({ where: { id: tenants[0].id } })).estado, 'EN_RIESGO');
      assert.equal((await prisma.tenant.findUniqueOrThrow({ where: { id: tenants[1].id } })).estado, 'ACTIVO');
      assert.equal((await prisma.suscripcion.findUniqueOrThrow({ where: { tenantId: tenants[0].id } })).fechaSuspension.toISOString(), originalGrace.toISOString());
      assert.equal((await prisma.suscripcion.findUniqueOrThrow({ where: { tenantId: tenants[1].id } })).fechaSuspension, null);
      assert.equal(await prisma.auditoriaLog.count({ where: { tenantId: tenants[0].id, accion: 'PERIODO_PRUEBA_VENCIDO' } }), 1);
      assert.equal(await prisma.auditoriaLog.count({ where: { tenantId: tenants[1].id, accion: 'PERIODO_PRUEBA_VENCIDO' } }), 0);
      await prisma.tenant.updateMany({ data: { estado: 'ACTIVO' } }); await prisma.suscripcion.deleteMany();
    });
    await check('Outage longer than the license horizon creates a fresh review without repeating transition or audit', async () => {
      await reset(); const now = new Date(), before = new Date(now.getTime() - 3 * 86400000);
      const sub = await prisma.suscripcion.create({ data: { tenantId: tenants[0].id, montoMensual: 499, fechaProximoCobro: new Date(before.getTime() - 60000) } });
      await scheduleJobs(before);
      const stale = await prisma.durableJob.findFirstOrThrow({ where: { kind: 'DUNNING' } }); assert(stale.expiresAt < now);
      await scheduleJobs(now); assert.equal(await prisma.durableJob.count({ where: { kind: 'DUNNING' } }), 2);
      const auditBefore = await prisma.auditoriaLog.count({ where: { tenantId: tenants[0].id, accion: 'PERIODO_PRUEBA_VENCIDO' } });
      await runWorker({ JOB_TEST_MODE: 'default' });
      assert.equal((await prisma.durableJob.findUniqueOrThrow({ where: { id: stale.id } })).state, 'EXPIRED');
      assert.equal((await prisma.tenant.findUniqueOrThrow({ where: { id: tenants[0].id } })).estado, 'EN_RIESGO');
      const grace = (await prisma.suscripcion.findUniqueOrThrow({ where: { id: sub.id } })).fechaSuspension;
      await scheduleJobs(now); await runWorker({ JOB_TEST_MODE: 'default' });
      assert.equal((await prisma.suscripcion.findUniqueOrThrow({ where: { id: sub.id } })).fechaSuspension.toISOString(), grace.toISOString());
      assert.equal(await prisma.auditoriaLog.count({ where: { tenantId: tenants[0].id, accion: 'PERIODO_PRUEBA_VENCIDO' } }), auditBefore + 1);
      await prisma.tenant.updateMany({ data: { estado: 'ACTIVO' } }); await prisma.suscripcion.deleteMany();
    });
    await check('Cold scheduler clears the last expired encrypted action without sending or another active action', async () => {
      await reset();
      const action = await prisma.authAction.create({ data: { userId: users['0DUENO'].id, tenantId: tenants[0].id, sessionVersion: users['0DUENO'].sessionVersion, purpose: 'VERIFY', tokenHash: 'expired-only', encryptedToken: 'expired-cipher', mailStatus: 'SENDING', expiresAt: new Date(0) } });
      await jobs.enqueueJob({ tenantId: tenants[0].id, key: 'mail/action/' + action.id, kind: 'MAIL_OUTBOX', entityId: action.id, expiresAt: new Date(0) });
      await runWorker({ JOB_TEST_MODE: 'schedule' }); await runWorker({ JOB_TEST_MODE: 'default' });
      const clean = await prisma.authAction.findUniqueOrThrow({ where: { id: action.id } }); assert.equal(clean.encryptedToken, null); assert.equal(clean.mailStatus, 'EXPIRED'); assert.equal(accepted.size, 0);
      await prisma.authAction.deleteMany();
    });
    await check('Immutable mail recipient suppression survives an account email change before retry', async () => {
      await reset(); const crypto = require('node:crypto');
      const { processSecurityMail } = require('../apps/api/dist/services/account-security.service');
      const { recipientKey } = require('../apps/api/dist/services/email-delivery.service');
      const { EmailService } = require('../apps/api/dist/services/email.service');
      const user = users['0DUENO'], originalEmail = user.email;
      const options = JSON.stringify({ to: originalEmail, from: 'fixture@fixture.invalid', subject: 'fixture', html: '<p>fixture</p>' });
      const iv = crypto.randomBytes(12), key = crypto.createHmac('sha256', fixture.env.JWT_SECRET).update('systech-auth-outbox-v1').digest();
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv), data = Buffer.concat([cipher.update(options), cipher.final()]);
      const encryptedToken = Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
      const action = await prisma.authAction.create({ data: { userId: user.id, tenantId: user.tenantId, purpose: 'VERIFY', tokenHash: 'immutable-recipient', encryptedToken, expiresAt: future(), mailStatus: 'RETRY', attempts: 1, nextAttemptAt: new Date(0), sessionVersion: user.sessionVersion } });
      await prisma.usuario.update({ where: { id: user.id }, data: { email: 'changed@fixture.invalid' } });
      await prisma.emailSuppression.create({ data: { id: recipientKey(originalEmail), reason: 'COMPLAINT' } });
      const originalSend = EmailService.enviarEmail; let calls = 0;
      EmailService.enviarEmail = async () => { calls++; throw new Error('Must not send'); };
      try { await processSecurityMail(user.tenantId); assert.equal(calls, 0); assert.equal((await prisma.authAction.findUniqueOrThrow({ where: { id: action.id } })).mailStatus, 'SUPPRESSED'); }
      finally { EmailService.enviarEmail = originalSend; await prisma.usuario.update({ where: { id: user.id }, data: { email: originalEmail } }); await prisma.emailSuppression.deleteMany(); await prisma.authAction.deleteMany(); }
    });
    await check('Concurrent scheduler cursor pages reach due account actions beyond the first 200 without duplication', async () => {
      await reset(); const now = new Date();
      for (let i = 0; i < 201; i++) await prisma.authAction.create({ data: { userId: users['0DUENO'].id, tenantId: tenants[0].id, sessionVersion: users['0DUENO'].sessionVersion, purpose: 'VERIFY', tokenHash: 'scheduler-fixture-' + i, encryptedToken: 'fixture-only', expiresAt: future(), nextAttemptAt: new Date(0) } });
      await Promise.all([runWorker({ JOB_TEST_MODE: 'schedule', JOB_TEST_NOW: now.toISOString() }), runWorker({ JOB_TEST_MODE: 'schedule', JOB_TEST_NOW: now.toISOString() })]);
      assert.equal(await prisma.durableJob.count({ where: { kind: 'MAIL_OUTBOX' } }), 201);
      assert.equal(await prisma.jobProviderControl.count(), 1);
      await prisma.authAction.deleteMany();
    });
    await check('Confirmed account task survives HTTP restart; separate actual worker exposes readiness and honest mail state', async () => {
      await reset();
      const startHttp = async () => { const c = spawn(path.join(__dirname, 'test_server.js')); const m = await new Promise(r => c.once('message', r)); return { c, base: m.base + '/api' }; };
      let api = await startHttp();
      const request = async (user, endpoint, body, method = body === undefined ? 'GET' : 'POST') => {
        const token = user ? jwt.sign({ sub: user.id, tid: user.tenantId, rol: user.rol, sv: user.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' }) : null;
        const response = await fetch(api.base + endpoint, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); return { status: response.status, body: await response.json() };
      };
      assert.equal((await request(null, '/auth/recovery/request', { email: users['0DUENO'].email })).status, 202);
      const action = await prisma.authAction.findFirstOrThrow({ where: { userId: users['0DUENO'].id } });
      const task = await prisma.durableJob.findFirstOrThrow({ where: { entityId: action.id } });
      assert.equal((await request(users['0DUENO'], '/jobs/status')).body.workerAvailable, false);
      await stop(api.c); api = await startHttp(); assert.equal((await prisma.durableJob.findUniqueOrThrow({ where: { id: task.id } })).state, 'QUEUED');
      for (const role of ['GERENTE', 'CAJERO', 'BARBERO']) {
        assert.equal((await request(users['0' + role], '/jobs')).status, 403);
        assert.equal((await request(users['0' + role], '/jobs/status')).status, 403);
        assert.equal((await request(users['0' + role], '/jobs/' + task.id + '/retry', {})).status, 403);
        assert.equal((await request(users['0' + role], '/jobs/providers/MAIL', { paused: true }, 'PUT')).status, 403);
      }
      assert.equal((await request(users['1DUENO'], '/jobs')).body.length, 0);
      assert.equal((await request(users['1DUENO'], '/jobs/' + task.id + '/retry', {})).status, 404);
      const worker = spawn(path.join(__dirname, '../apps/api/dist/worker.js'), { JOB_SCHEDULER_ENABLED: 'false', JOB_POLL_MS: '100', JOB_SCHEDULE_MS: '1000' }); worker.gracefulWorker = true;
      await eventually(async () => (await prisma.durableJob.findUniqueOrThrow({ where: { id: task.id } })).state === 'SUCCEEDED');
      assert.equal((await request(users['0DUENO'], '/jobs/status')).body.workerAvailable, true);
      const mail = await prisma.authAction.findUniqueOrThrow({ where: { id: action.id } }); assert.equal(mail.mailStatus, 'NOT_CONFIGURED'); assert.notEqual(mail.deliveryStatus, 'DELIVERED');
      await stop(worker); await stop(api.c);
      assert.equal(worker.logs.includes(users['0DUENO'].email), false); assert.equal(worker.logs.includes(action.tokenHash), false);
      const stopMetric = worker.logs.trim().split('\n').map(line => { try { return JSON.parse(line); } catch { return null; } }).find(value => value?.code === 'STOPPED');
      assert(stopMetric && stopMetric.rssBytes > 0); metrics.push(stopMetric.rssBytes);
      const pulse = await prisma.jobWorkerPulse.count(); assert.equal(pulse, 0);
    });
    const result = { ...evidence, finishedAt: new Date().toISOString(), pass: true, passed: checks, checks: checked, engine: process.env.SYSTECH_TEST_PG_URL ? 'PostgreSQL isolated' : 'SQLite disposable', workerProcesses: true, peakWorkerRssBytes: Math.max(...metrics), workerRssSamplesBytes: metrics, externalIntegrations: false };
    fs.writeFileSync(path.resolve(__dirname, '../docs/ST12_RESULTADOS_' + (process.env.SYSTECH_TEST_PG_URL ? 'POSTGRES' : 'SQLITE') + '.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ passed: checks, engine: result.engine, workerProcesses: true, peakWorkerRssBytes: result.peakWorkerRssBytes, externalIntegrations: false }));
  } finally {
    await Promise.all(children.map(stop)); if (provider) { provider.closeAllConnections(); await new Promise(r => provider.close(r)); }
    await prisma.$disconnect(); cleanTestFixture(fixture.directory);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
async function main() {
  const fixture = createTestFixture(); Object.assign(process.env, fixture.env, { APP_URL: 'http://127.0.0.1:5179' });
  const { prisma } = require('@systech/database');
  const { default: app } = require('../apps/api/dist/index');
  const jwt = require('jsonwebtoken'), bcrypt = require('bcryptjs');
  const security = require('../apps/api/dist/services/account-security.service');
  const { EmailService } = require('../apps/api/dist/services/email.service');
  const { generatePrintToken } = require('../apps/api/dist/utils/security');
  const mail = []; let mailMode = 'accepted';
  EmailService.enviarEmail = async value => { mail.push(value); return { provider: mailMode === 'unconfigured' ? 'DEV_CONSOLE' : 'RESEND', success: mailMode !== 'failure', messageId: 'fixture-'+value.idempotencyKey }; };
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let count = 0;
  const check = async (name, fn) => { await prisma.authThrottle.deleteMany(); await fn(); console.log('PASS ' + name); count++; };
  const request = async (path, data, token, method = 'POST') => {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', 'x-test-suite': 'true', ...(token ? { authorization: 'Bearer ' + token } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const sign = user => jwt.sign({ sub: user.id, tid: user.tenantId, rol: user.rol, sv: user.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
  const password = 'Mi frase de prueba 2026';
  let owner, branch, tenant, ownerToken;
  const link = async (user, purpose) => { await prisma.$transaction(tx => security.queueAction(tx, user.id, purpose)); await security.processSecurityMail(); const msg = [...mail].reverse().find(m => m.to === user.email); assert(msg); return msg.html.match(/#token=([a-f0-9]{64})/)[1]; };
  try {
    tenant = await prisma.tenant.create({ data: { nombre: 'Fixture seguridad', slug: 'fixture-security' } });
    branch = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Matriz' } });
    owner = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: '<Owner>', email: 'owner@security.invalid', rol: 'DUENO', passwordHash: await bcrypt.hash(password, 12), emailVerifiedAt: new Date() } }); ownerToken = sign(owner);
    await check('Recovery does not enumerate accounts or return secrets; mail is queued durably', async () => {
      const real = await request('/auth/recovery/request', { email: owner.email });
      const absent = await request('/auth/recovery/request', { email: 'absent@security.invalid' });
      assert.equal(real.status, 202); assert.deepEqual(real, absent); assert.equal(mail.length, 0);
      const row = await prisma.authAction.findFirst({ where: { userId: owner.id } }); assert.equal(row.tokenHash.length, 64); assert(row.encryptedToken); assert(!JSON.stringify(real).includes('token'));
    });
    await check('Durable per-account throttling applies equally to absent accounts and ignores test headers', async () => {
      for (const email of [owner.email, 'missing@security.invalid']) { for (let i = 0; i < 5; i++) assert.equal((await request('/tenant/recovery/request', { email })).status, 202); assert.equal((await request('/auth/recovery/request', { email })).status, 429); }
    });
    await check('Mail escapes names, pins trusted origin and erases encrypted payload after acceptance', async () => {
      const token = await link(owner, 'RESET'); const msg = mail.at(-1); assert(msg.html.includes('&lt;Owner&gt;')); assert(msg.html.includes('http://127.0.0.1:5179/cuenta/restablecer#token='));
      const rows = await prisma.authAction.findMany(); assert(rows.every(r => r.tokenHash !== token && r.encryptedToken === null)); assert(!JSON.stringify(rows).includes(token));
    });
    await check('Interrupted mail retries preserve the exact provider payload and idempotency key', async () => {
      const appUrl = process.env.APP_URL, sender = process.env.EMAIL_FROM;
      try {
        process.env.EMAIL_FROM = 'Studio <mail@security.invalid>'; mailMode = 'failure';
        await prisma.$transaction(tx => security.queueAction(tx, owner.id, 'RESET'));
        const job = await prisma.authAction.findFirstOrThrow({ where: { userId: owner.id, purpose: 'RESET', consumedAt: null } });
        await security.processSecurityMail(); const first = mail.find(m => m.idempotencyKey === 'account-action/' + job.id);
        assert(first); assert.equal((await prisma.authAction.findUnique({ where: { id: job.id } })).mailStatus, 'RETRY');
        process.env.APP_URL = 'https://changed.security.invalid'; process.env.EMAIL_FROM = 'Changed <changed@security.invalid>';
        await prisma.usuario.update({ where: { id: owner.id }, data: { nombre: 'Changed Name' } });
        await prisma.authAction.update({ where: { id: job.id }, data: { nextAttemptAt: new Date(0) } }); mailMode = 'accepted';
        await security.processSecurityMail(); const attempts = mail.filter(m => m.idempotencyKey === first.idempotencyKey);
        assert.equal(attempts.length, 2); assert.deepEqual(attempts[0], attempts[1]);
        const done = await prisma.authAction.findUnique({ where: { id: job.id } }); assert.equal(done.mailStatus, 'ACCEPTED'); assert.equal(done.encryptedToken, null);
      } finally { process.env.APP_URL = appUrl; if (sender === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = sender; mailMode = 'accepted'; await prisma.usuario.update({ where: { id: owner.id }, data: { nombre: owner.nombre } }); }
    });
    await check('An expired final worker lease becomes failed rather than remaining stuck sending', async () => {
      await prisma.$transaction(tx => security.queueAction(tx, owner.id, 'RESET'));
      const job = await prisma.authAction.findFirstOrThrow({ where: { userId: owner.id, purpose: 'RESET', consumedAt: null } });
      await prisma.authAction.update({ where: { id: job.id }, data: { mailStatus: 'SENDING', attempts: 3, nextAttemptAt: new Date(0) } });
      await security.processSecurityMail(); const done = await prisma.authAction.findUnique({ where: { id: job.id } });
      assert.equal(done.mailStatus, 'FAILED'); assert.equal(done.encryptedToken, null); assert(!mail.some(m => m.idempotencyKey === 'account-action/' + job.id));
    });
    await check('A stale worker response cannot overwrite a newer lease or clear its encrypted request', async () => {
      await prisma.$transaction(tx => security.queueAction(tx, owner.id, 'RESET'));
      const job = await prisma.authAction.findFirstOrThrow({ where: { userId: owner.id, purpose: 'RESET', consumedAt: null } });
      const send = EmailService.enviarEmail;
      try {
        EmailService.enviarEmail = async value => {
          if (value.idempotencyKey === 'account-action/' + job.id) await prisma.authAction.update({ where: { id: job.id }, data: { attempts: 2, nextAttemptAt: new Date(Date.now() + 120000) } });
          return send(value);
        };
        await security.processSecurityMail(); const live = await prisma.authAction.findUnique({ where: { id: job.id } });
        assert.equal(live.attempts, 2); assert.equal(live.mailStatus, 'SENDING'); assert(live.encryptedToken);
      } finally { EmailService.enviarEmail = send; }
    });
    await check('An uncertain mail retry outside the provider retention window requires a new link', async () => {
      const invited = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Outbox', email: 'outbox@security.invalid', rol: 'CAJERO', passwordHash: owner.passwordHash, invitationPending: true } });
      await prisma.$transaction(tx => security.queueAction(tx, invited.id, 'INVITE'));
      const job = await prisma.authAction.findFirstOrThrow({ where: { userId: invited.id, consumedAt: null } });
      await prisma.authAction.update({ where: { id: job.id }, data: { mailStatus: 'RETRY', attempts: 1, createdAt: new Date(Date.now() - 25 * 3600000), nextAttemptAt: new Date(0) } });
      await security.processSecurityMail(); assert.equal((await prisma.authAction.findUnique({ where: { id: job.id } })).mailStatus, 'FAILED');
      assert(!mail.some(m => m.idempotencyKey === 'account-action/' + job.id));
    });
    await check('A temporary database outage fails closed without invalidating a valid session', async () => {
      const find = prisma.usuario.findUnique;
      try {
        prisma.usuario.findUnique = () => Promise.reject(Object.assign(new Error('private connection detail'), { code: 'P1001' }));
        const outage = await request('/auth/security', null, ownerToken, 'GET'); assert.equal(outage.status, 503); assert.equal(outage.body.code, 'ACCESS_CHECK_UNAVAILABLE'); assert(!JSON.stringify(outage).includes('private connection'));
        assert.equal((await request('/auth/security', null, 'invalid-token', 'GET')).status, 401);
      } finally { prisma.usuario.findUnique = find; }
      assert.equal((await request('/auth/security', null, ownerToken, 'GET')).status, 200);
    });
    await check('Purpose binding, invalid and expired links fail without changing password', async () => {
      const token = await link(owner, 'RESET');
      assert.equal((await request('/auth/verification/complete', { token })).status, 400);
      await prisma.usuario.update({ where: { id: owner.id }, data: { activo: false } });
      assert.equal((await request('/auth/recovery/complete', { token, password })).status, 400);
      assert.equal((await prisma.usuario.findUnique({ where: { id: owner.id } })).activo, false);
      await prisma.usuario.update({ where: { id: owner.id }, data: { activo: true } });
      await prisma.authAction.updateMany({ where: { userId: owner.id }, data: { expiresAt: new Date(0) } });
      assert.equal((await request('/auth/recovery/complete', { token, password })).status, 400);
      assert.equal((await request('/auth/recovery/complete', { token: 'invalid', password })).status, 400);
    });
    await check('Reset is atomic, single-use, revokes old sessions and print capabilities, no automatic login', async () => {
      const token = await link(owner, 'RESET');
      const print = generatePrintToken('VENTA', 'fixture-sale', tenant.id, owner.id, owner.sessionVersion);
      const outcomes = await Promise.all([1, 2].map(() => request('/auth/recovery/complete', { token, password: password + ' nuevo' })));
      assert.deepEqual(outcomes.map(r => r.status).sort(), [200, 400]); assert(outcomes.every(r => !r.body.token));
      assert.equal((await request('/auth/me', null, ownerToken, 'GET')).status, 401);
      assert.equal((await request('/ventas/fixture-sale/ticket-html?printToken=' + print, null, null, 'GET')).status, 401);
      assert.equal((await request('/auth/login', { email: owner.email, password })).status, 401);
      const login = await request('/auth/login', { email: owner.email, password: password + ' nuevo' }); assert.equal(login.status, 200); ownerToken = login.body.token;
      owner = await prisma.usuario.findUnique({ where: { id: owner.id } });
    });
    await check('New accounts require verification; confirming a link grants access and cannot be replayed', async () => {
      const user = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Unverified', email: 'verify@security.invalid', rol: 'DUENO', passwordHash: owner.passwordHash, verificationRequired: true } });
      const token = sign(user); assert.equal((await request('/productos', null, token, 'GET')).status, 403);
      assert.equal((await request('/auth/security', null, token, 'GET')).status, 200);
      const action = await link(user, 'VERIFY'); assert.equal((await request('/auth/verification/complete', { token: action })).status, 200);
      assert.equal((await request('/productos', null, token, 'GET')).status, 200); assert.equal((await request('/auth/verification/complete', { token: action })).status, 400);
    });
    await check('Invitation is owner-only, rejects foreign branches and cannot use owner-assigned password', async () => {
      const created = await request('/usuarios', { nombre: 'Team', email: 'team@security.invalid', rol: 'CAJERO', branchIds: [branch.id], password: password }, ownerToken);
      assert.equal(created.status, 201); assert.equal(created.body.invitationPending, true);
      assert.equal((await request('/auth/login', { email: 'team@security.invalid', password })).status, 401);
      const user = await prisma.usuario.findUnique({ where: { email: 'team@security.invalid' } });
      const token = await link(user, 'INVITE'); assert.equal((await request('/auth/invitation/accept', { token, password })).status, 200);
      const login = await request('/auth/login', { email: user.email, password }); assert.equal(login.status, 200); assert(login.body.user.emailVerifiedAt);
      assert.equal((await request('/usuarios', { nombre: 'Forbidden' }, login.body.token)).status, 403);
      assert.equal((await request('/usuarios/' + owner.id + '/invitacion', {}, login.body.token)).status, 403);
      assert.equal((await request('/usuarios', { nombre: 'Foreign', email: 'foreign@security.invalid', rol: 'CAJERO', branchIds: ['foreign'] }, ownerToken)).status, 404);
      assert.equal((await request('/auth/invitation/accept', { token, password })).status, 400);
    });
    await check('Both registration paths queue verification; no fixed-password onboarding remains', async () => {
      const registered = await request('/auth/register', { nombreBarberia: 'Registered Security', nombreDueno: 'Owner', email: 'registered@security.invalid', password, plan: 'PRO' });
      assert.equal(registered.status, 200); assert(registered.body.user.verificationRequired);
      assert.equal((await request('/productos', null, registered.body.token, 'GET')).status, 403);
      assert.equal(await prisma.authAction.count({ where: { userId: registered.body.user.id, purpose: 'VERIFY', consumedAt: null } }), 1);
      const setup = await request('/onboarding/onboarding/setup', { nombreBarberia: 'Setup Security', nombreDueno: 'Owner', emailDueno: 'setup@security.invalid', passwordDueno: password, plan: 'PRO' });
      assert.equal(setup.status, 200); assert.equal(await prisma.authAction.count({ where: { userId: setup.body.dueno.id, purpose: 'VERIFY', consumedAt: null } }), 1);
    });
    await check('Legacy local accounts require verified email in production, including print links', async () => {
      const legacy = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Legacy', email: 'legacy@security.invalid', rol: 'DUENO', passwordHash: owner.passwordHash } });
      const token = sign(legacy), print = generatePrintToken('VENTA', 'test', tenant.id, legacy.id);
      process.env.NODE_ENV = 'production';
      try {
        assert.equal((await request('/productos', null, token, 'GET')).status, 403);
        const me = await request('/auth/me', null, token, 'GET'); assert.equal(me.status, 200); assert.equal(me.body.user.verificationRequired, true);
        assert.equal((await request('/ventas/test/ticket-html?printToken=' + print, null, null, 'GET')).status, 401);
      } finally { process.env.NODE_ENV = 'test'; }
    });
    await check('Resend cancels previous invite; cancel/deactivate prevents acceptance and recovery', async () => {
      const created = await request('/usuarios', { nombre: 'Pending', email: 'pending@security.invalid', rol: 'CAJERO', branchIds: [branch.id] }, ownerToken); assert.equal(created.status, 201);
      const user = await prisma.usuario.findUnique({ where: { id: created.body.id } }); const old = await link(user, 'INVITE');
      assert.equal((await request('/usuarios/' + user.id + '/invitacion', {}, ownerToken)).status, 200);
      await security.processSecurityMail(); const fresh = mail.at(-1).html.match(/#token=([a-f0-9]{64})/)[1]; assert.notEqual(old, fresh);
      assert.equal((await request('/auth/invitation/accept', { token: old, password })).status, 400);
      assert.equal((await request('/usuarios/' + user.id + '/invitacion', null, ownerToken, 'DELETE')).status, 200);
      assert.equal((await request('/auth/invitation/accept', { token: fresh, password })).status, 400);
      const before = await prisma.authAction.count({ where: { userId: user.id } });
      assert.equal((await request('/auth/recovery/request', { email: user.email })).status, 202);
      assert.equal(await prisma.authAction.count({ where: { userId: user.id } }), before);
    });
    await check('Provider missing or failed is never marked delivered; failures retry without exposing links', async () => {
      mailMode = 'unconfigured'; await link(owner, 'RESET');
      assert.equal((await prisma.authAction.findFirst({ where: { userId: owner.id, consumedAt: null }, orderBy: { createdAt: 'desc' } })).mailStatus, 'NOT_CONFIGURED');
      mailMode = 'failure'; await link(owner, 'RESET');
      let job = await prisma.authAction.findFirst({ where: { userId: owner.id, consumedAt: null }, orderBy: { createdAt: 'desc' } }); assert.equal(job.mailStatus, 'RETRY');
      for (let i = 0; i < 2; i++) { await prisma.authAction.update({ where: { id: job.id }, data: { nextAttemptAt: new Date(0) } }); await security.processSecurityMail(); }
      job = await prisma.authAction.findUnique({ where: { id: job.id } }); assert.equal(job.mailStatus, 'FAILED'); assert.equal(job.encryptedToken, null); mailMode = 'accepted';
    });
    await check('Password rules reject short and bcrypt-truncated unicode passwords', async () => {
      const token = await link(owner, 'RESET');
      for (const invalid of ['short', '😀'.repeat(20)]) assert.equal((await request('/auth/recovery/complete', { token, password: invalid })).status, 400);
      assert.equal((await request('/auth/security/password', { currentPassword: 'wrong', password }, ownerToken)).status, 400);
    });
    await check('Password change requires current password, closes all devices and outstanding links', async () => {
      const pending = await link(owner, 'RESET');
      assert.equal((await request('/auth/security/password', { currentPassword: password + ' nuevo', password }, ownerToken)).status, 200);
      assert.equal((await request('/auth/security', null, ownerToken, 'GET')).status, 401);
      assert.equal((await request('/auth/recovery/complete', { token: pending, password })).status, 400);
      ownerToken = (await request('/auth/login', { email: owner.email, password })).body.token; assert(ownerToken);
    });
    await check('Logout-all revokes its own session immediately; audit contains no passwords or raw tokens', async () => {
      assert.equal((await request('/auth/security/logout-all', {}, ownerToken)).status, 200);
      assert.equal((await request('/auth/me', null, ownerToken, 'GET')).status, 401);
      const logs = JSON.stringify(await prisma.auditoriaLog.findMany()); assert(!logs.includes(password)); assert(!logs.includes(ownerToken));
      for (const message of mail) assert(!logs.includes(message.html.match(/#token=([a-f0-9]{64})/)[1]));
    });
    console.log(`${count}/${count} account-security scenarios passed; no external mail sent.`);
  } finally { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); cleanTestFixture(fixture.directory); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });

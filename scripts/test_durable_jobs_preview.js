'use strict';
// Isolated panel fixture. No providers and no operational database migrations.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { fork } = require('node:child_process');
const root = path.resolve(__dirname, '..'), manifestPath = path.join(root, '.tools/st12-preview.json');
if (process.env.NODE_ENV !== 'test' || process.env.SYSTECH_ISOLATED_TESTS !== 'true') throw new Error('Isolated test mode required');
const client = path.join(root, '.tools/prisma-sqlite/client');
if (path.resolve(process.env.SYSTECH_TEST_PRISMA_CLIENT || '.') !== client) throw new Error('Isolated SQLite SDK required');
require('./test_prisma_client');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function prepare() {
  if (fs.existsSync(manifestPath)) throw new Error('Existing ST12 preview preserved; no reseeding');
  const originalFiles = ['packages/database/prisma/dev.db', '.tools/dv-preview.json', '.test-db-TrhWfE/test.db'].map(value => path.join(root, value));
  const originalHashes = originalFiles.map(file => ({ file: path.relative(root, file), sha256: hash(file) }));
  const fixture = require('./test_fixture').createTestFixture(); Object.assign(process.env, fixture.env);
  const { prisma } = require('@systech/database'), bcrypt = require('bcryptjs');
  try {
    const passwordHash = await bcrypt.hash('PruebaST12Segura!', 12), users = {};
    for (const suffix of ['a', 'b']) {
      const tenant = await prisma.tenant.create({ data: { nombre: 'Negocio ST12 ' + suffix.toUpperCase() + ' · ficticio', slug: 'qa-st12-' + suffix, estado: 'ACTIVO' } });
      const branch = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Sucursal de prueba' } });
      for (const role of ['DUENO', 'GERENTE']) {
        const email = role.toLowerCase() + '.st12.' + suffix + '@qa.invalid';
        users[role.toLowerCase() + suffix] = await prisma.usuario.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre: role + ' ST12 ' + suffix, email, passwordHash, rol: role, emailVerifiedAt: new Date() } });
      }
      if (suffix === 'a') {
        const jobs = require('../apps/api/dist/services/durable-jobs.service'), future = new Date(Date.now() + 86400000);
        for (const state of ['FAILED', 'UNCERTAIN', 'EXPIRED', 'NOT_CONFIGURED', 'QUEUED', 'ACCEPTED']) {
          const job = await jobs.enqueueJob({ tenantId: tenant.id, key: 'ui-fixture/' + state, kind: state === 'ACCEPTED' ? 'REMINDER_2H' : 'MAIL_OUTBOX', entityId: 'fixture-not-an-actual-message', expiresAt: state === 'EXPIRED' ? new Date(0) : future });
          await prisma.durableJob.update({ where: { id: job.id }, data: { state, lastCode: state === 'FAILED' ? 'PROVIDER_RETRY' : state, attempts: state === 'FAILED' ? 4 : 0 } });
        }
        await jobs.pauseProvider({ ...users.duenoa, userId: users.duenoa.id }, 'MAIL', true);
        await jobs.pauseProvider({ ...users.duenoa, userId: users.duenoa.id }, 'WHATSAPP', true);
        await prisma.jobProviderControl.create({ data: { id: jobs.controlId(tenant.id, 'LICENSE'), tenantId: tenant.id, provider: 'LICENSE' } });
      }
    }
    for (const item of originalHashes) if (hash(path.join(root, item.file)) !== item.sha256) throw new Error('Original environment changed');
    fs.writeFileSync(manifestPath, JSON.stringify({ database: fixture.env.DATABASE_URL, directory: fixture.directory, createdAt: new Date().toISOString(), originalHashes, accounts: Object.fromEntries(Object.entries(users).map(([name, user]) => [name, { id: user.id, email: user.email, tenantId: user.tenantId }])), note: 'Synthetic task states for UI QA only; no real provider acceptance, no sales' }, null, 2) + '\n');
    console.log('Independent ST12 fixture prepared; original demo and operational database unchanged.');
  } finally { await prisma.$disconnect(); }
}
async function serve() {
  const fixture = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const db = path.resolve(fixture.database.slice(5));
  if (!fixture.database.startsWith('file:') || path.dirname(path.dirname(db)) !== root || !path.basename(path.dirname(db)).startsWith('.test-db-') || path.basename(db) !== 'test.db') throw new Error('Unsafe preview fixture');
  const env = { ...process.env, NODE_ENV: 'test', SYSTECH_ISOLATED_TESTS: 'true', NO_LISTEN: 'true', DATABASE_URL: fixture.database, JWT_SECRET: 'isolated-test-secret-which-is-at-least-thirty-two-characters', APP_URL: 'http://127.0.0.1:5182', PORT: '3112', STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '', RESEND_API_KEY: '', RESEND_DOMAIN_ID: '', RESEND_WEBHOOK_SECRET: '', EMAIL_FROM: '', META_APP_SECRET: '', META_WA_ACCESS_TOKEN: '', META_WA_PHONE_NUMBER_ID: '', WHATSAPP_API_TOKEN: '', WHATSAPP_PHONE_NUMBER_ID: '', FACTURAPI_KEY: '', JOB_SCHEDULER_ENABLED: 'false' };
  Object.assign(process.env, env);
  const { prisma } = require('@systech/database'), app = require('../apps/api/dist/index').default;
  const server = app.listen(3112, '127.0.0.1', () => console.log('ST12 isolated API ready on loopback port 3112'));
  let worker = null;
  if (process.argv.includes('--worker')) worker = fork(path.join(root, 'apps/api/dist/worker.js'), [], { env, execArgv: ['--require', path.join(__dirname, 'test_prisma_client.js')], stdio: ['ignore', 'inherit', 'inherit', 'ipc'], windowsHide: true });
  let closing = false;
  const close = async () => { if (closing) return; closing = true; if (worker?.connected) worker.send({ type: 'STOP_ISOLATED_WORKER' }); server.close(async () => { await prisma.$disconnect(); }); };
  process.on('SIGTERM', close); process.on('SIGINT', close);
}
(process.argv[2] === 'prepare' ? prepare() : process.argv[2] === 'serve' ? serve() : Promise.reject(new Error('Use prepare or serve [--worker]'))).catch(error => { console.error(error.message); process.exitCode = 1; });

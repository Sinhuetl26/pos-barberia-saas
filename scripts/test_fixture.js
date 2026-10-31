const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function createTestFixture() {
  const directory = fs.mkdtempSync(path.join(__dirname, '..', '.test-db-'));
  const env = {
    ...process.env, NODE_ENV: 'test', NO_LISTEN: 'true',
    DATABASE_URL: `file:${path.join(directory, 'test.db').replace(/\\/g, '/')}`,
    JWT_SECRET: 'isolated-test-secret-which-is-at-least-thirty-two-characters',
    STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '', RESEND_API_KEY: '', RESEND_DOMAIN_ID:'',RESEND_WEBHOOK_SECRET:'',EMAIL_FROM:'',
    LICENSE_TAX_POLICY: 'PENDIENTE', LICENSE_FISCAL_REVIEWED: 'false',
    STRIPE_PRICE_BASICO: '', STRIPE_PRICE_PRO: '', STRIPE_PRICE_CADENA: '',
    STRIPE_PRICE_BASICO_TEST: '', STRIPE_PRICE_PRO_TEST: '', STRIPE_PRICE_CADENA_TEST: '',
    STRIPE_PRICE_BASICO_LIVE: '', STRIPE_PRICE_PRO_LIVE: '', STRIPE_PRICE_CADENA_LIVE: '',
    META_APP_SECRET: '', FACTURAPI_KEY: '', META_WA_ACCESS_TOKEN: '', META_WA_PHONE_NUMBER_ID: '',
    WHATSAPP_API_TOKEN: '', WHATSAPP_PHONE_NUMBER_ID: '',
    RUST_BACKTRACE: '1', RUST_LOG: 'info',
  };
  if (process.env.SYSTECH_TEST_PG_URL) {
    const url = new URL(process.env.SYSTECH_TEST_PG_URL);
    if (!['postgresql:', 'postgres:'].includes(url.protocol) || !/^\/systech_test_[a-z0-9_]+$/.test(url.pathname)) throw new Error('PostgreSQL tests require a database named systech_test_*.');
    const schema = 'st04_' + path.basename(directory).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    url.searchParams.set('schema', schema);
    env.DATABASE_URL = url.toString();
    fs.writeFileSync(path.join(directory, 'postgres.json'), JSON.stringify({ schema }));
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema=packages/database/prisma/schema.postgres.prisma'], {
      cwd: path.join(__dirname, '..'), env, stdio: 'pipe',
    });
    return { directory, env, schema };
  }
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', '--skip-generate', '--schema=packages/database/prisma/schema.prisma'], {
    cwd: path.join(__dirname, '..'), env, stdio: 'pipe',
  });
  return { directory, env };
}

function cleanTestFixture(directory) {
  const resolved = path.resolve(directory);
  if (path.dirname(resolved) !== path.resolve(__dirname, '..') || !path.basename(resolved).startsWith('.test-db-')) throw new Error('Unsafe fixture path');
  const marker = path.join(resolved, 'postgres.json');
  if (fs.existsSync(marker)) {
    const { schema } = JSON.parse(fs.readFileSync(marker, 'utf8'));
    if (!/^st04__test_db_[a-z0-9_]+$/.test(schema)) throw new Error('Unexpected PostgreSQL fixture schema.');
    const url = new URL(process.env.SYSTECH_TEST_PG_URL);
    if (!/^\/systech_test_[a-z0-9_]+$/.test(url.pathname)) throw new Error('Unsafe PostgreSQL test database.');
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'execute', '--stdin', '--schema=packages/database/prisma/schema.postgres.prisma'], {
      cwd: path.join(__dirname, '..'), env: { ...process.env, DATABASE_URL: url.toString() }, input: `DROP SCHEMA "${schema}" CASCADE;`, stdio: ['pipe', 'pipe', 'pipe'],
    });
    fs.unlinkSync(marker);
  }
  // Only named files in our own fixture; never traverse or delete a user database.
  for (const name of ['test.db', 'test.db-journal', 'test.db-wal', 'test.db-shm']) {
    const file = path.join(resolved, name);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  fs.rmdirSync(resolved);
}

function seedTestFixture(env) {
  const script = `
    const fs = require('fs'), ts = require('typescript'), Module = require('module'), path = require('path');
    const file = path.resolve('packages/database/seed.ts');
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    const module = new Module(file); module.filename = file; module.paths = Module._nodeModulePaths(path.dirname(file)); module._compile(compiled, file);
  `;
  const preload = env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [];
  execFileSync(process.execPath, [...preload, '-e', script], { cwd: path.join(__dirname, '..'), env, stdio: 'pipe' });
}

module.exports = { createTestFixture, cleanTestFixture, seedTestFixture };

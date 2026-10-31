'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const helper = require('./postgres_migration_utils');
const runtime = require('./postgres_test_runtime');
const { checkPostgres } = require('./check_postgres');
const versions = fs.readdirSync(path.join(path.dirname(helper.schema), 'migrations')).filter(name => fs.existsSync(path.join(path.dirname(helper.schema), 'migrations', name, 'migration.sql'))).sort();
const hash = file => fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
const checks = [];
async function main() {
  const work = path.join(helper.root, 'packages/database/prisma/dev.db');
  const before = hash(work);
  const running = runtime.start();
  const baseEnv = { ...process.env, NODE_ENV: 'test', NO_LISTEN: 'true', SYSTECH_ISOLATED_TESTS: 'true', SYSTECH_TEST_PG_URL: running.url };
  const clientPath = helper.generateClient(baseEnv);
  const { PrismaClient, Prisma } = require(clientPath);
  const check = async (name, action) => { await action(); checks.push(name); console.log('PASS ' + name); };
  const clients = [];
  const envFor = name => ({ ...baseEnv, DATABASE_URL: helper.isolatedUrl(running.url, name) });
  const connect = env => { const value = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } }); clients.push(value); return value; };
  const deploy = (env, file = helper.schema) => helper.prisma(['migrate', 'deploy', '--schema=' + file], env);
  const compare = async (env, client) => {
    const result = {};
    const tables = await client.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname=current_schema() AND tablename <> '_prisma_migrations' ORDER BY tablename`;
    for (const { tablename } of tables) {
      assert(/^[A-Za-z0-9_]+$/.test(tablename));
      result[tablename] = await client.$queryRawUnsafe(`SELECT * FROM "${tablename}" ORDER BY "id"`);
    }
    return JSON.parse(JSON.stringify(result));
  };
  try {
    const cleanEnv = envFor('st04_clean_' + crypto.randomBytes(5).toString('hex'));
    await check('Clean PostgreSQL database installs every versioned migration', async () => {
      deploy(cleanEnv);
      const db = connect(cleanEnv);
      const rows = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name`;
      assert.deepEqual(rows.map(r => r.migration_name), versions);
      assert.equal(await db.tenant.count(), 0);
    });
    await check('Database and canonical PostgreSQL model have no schema drift', async () => {
      helper.prisma(['migrate', 'diff', '--from-schema-datasource=' + helper.schema, '--to-schema-datamodel=' + helper.schema, '--exit-code'], cleanEnv);
    });
    await check('Read-only release preflight accepts current schema without changing any rows', async () => {
      const db = connect(cleanEnv), beforeCheck = await compare(cleanEnv, db);
      assert.equal(checkPostgres(cleanEnv).ready, true);
      assert.deepEqual(await compare(cleanEnv, db), beforeCheck);
      assert.throws(() => checkPostgres({ ...cleanEnv, DATABASE_URL: 'file:never-open.db' }), e => e.code === 'POSTGRES_URL_REQUIRED');
    });
    await check('Read-only release preflight rejects drift without repairing or deleting it', async () => {
      helper.sql('CREATE TABLE "PreflightDrift" ("id" TEXT PRIMARY KEY); INSERT INTO "PreflightDrift" VALUES (\'fixture\');', cleanEnv);
      const db = connect(cleanEnv), beforeCheck = await compare(cleanEnv, db);
      assert.throws(() => checkPostgres(cleanEnv), e => e.code === 'SCHEMA_DRIFT');
      assert.deepEqual(await compare(cleanEnv, db), beforeCheck);
      helper.sql('DROP TABLE "PreflightDrift";', cleanEnv);
    });

    const legacyEnv = envFor('st04_legacy_' + crypto.randomBytes(5).toString('hex'));
    const oldSchema = helper.stageMigrations('st04_old_snapshot', versions.slice(0, 3));
    deploy(legacyEnv, oldSchema);
    helper.sql(`INSERT INTO "Plan" ("id","codigo","nombre","precioMensual") VALUES ('legacy-plan','PRO','Fixture',123.45);
      INSERT INTO "Tenant" ("id","nombre","slug","planId","plan") VALUES ('legacy-shop','Fixture legacy','fixture-legacy','legacy-plan','PRO');
      INSERT INTO "Sucursal" ("id","tenantId","nombre") VALUES ('legacy-branch','legacy-shop','Matriz');
      INSERT INTO "Barbero" ("id","sucursalId","nombre") VALUES ('legacy-barber','legacy-branch','Fixture');
      INSERT INTO "Suscripcion" ("id","tenantId","estado","periodoFin","plan","cancelarAlFin","reintentosFallidos") VALUES ('legacy-license','legacy-shop','past_due','2026-11-01 12:34:56.789','PRO',true,2);
      INSERT INTO "Cita" ("id","tenantId","sucursalId","barberoId","nombreServicio","fechaHora","duracionMinutos","precioEstimado","codigoReserva","fechaCreacion") VALUES ('legacy-appointment','legacy-shop','legacy-branch','legacy-barber','Fixture','2026-11-01 10:00:00',35,280.10,'LEGACY-1','2026-10-01 01:02:03.456');
      INSERT INTO "Factura" ("id","tenantId","rfcEmisor","rfcReceptor","razonSocial","regimenFiscal","usoCfdi","codigoPostal","subtotal","iva","total","folio") VALUES ('legacy-invoice','legacy-shop','FIXTURE','FIXTURE','Fixture','601','G03','00000',100.10,16.016,116.116,'TEST-1');`, legacyEnv);
    let legacy = connect(legacyEnv);
    await check('Read-only release preflight rejects pending historical upgrades without changing rows', async () => {
      const beforeCheck = await compare(legacyEnv, legacy);
      assert.throws(() => checkPostgres(legacyEnv), e => e.code === 'MIGRATION_HISTORY_NOT_READY');
      assert.deepEqual(await compare(legacyEnv, legacy), beforeCheck);
    });
    // DDL changes the shape of SELECT *; restart the test client's prepared
    // statements before inspecting the upgraded database.
    await legacy.$disconnect(); legacy = connect(legacyEnv);
    await check('Populated legacy upgrade preserves subscriptions, dates, appointments and invoices', async () => {
      deploy(legacyEnv);
      const s = await legacy.suscripcion.findUniqueOrThrow({ where: { id: 'legacy-license' } });
      assert.equal(s.estadoPago, 'past_due'); assert.equal(s.montoMensual.toString(), '123.45'); assert.equal(s.fechaProximoCobro.toISOString(), '2026-11-01T12:34:56.789Z');
      const fields = await legacy.$queryRaw`SELECT "plan","cancelarAlFin","reintentosFallidos" FROM "Suscripcion" WHERE "id"='legacy-license'`;
      assert.deepEqual(fields[0], { plan: 'PRO', cancelarAlFin: true, reintentosFallidos: 2 });
      const cita = await legacy.cita.findUniqueOrThrow({ where: { id: 'legacy-appointment' } }); assert(cita.clienteId); assert.equal(cita.precioEstimado.toString(), '280.1');
      const dates = await legacy.$queryRaw`SELECT "fechaCreacion" FROM "Cita" WHERE "id"='legacy-appointment'`; assert.equal(dates[0].fechaCreacion.toISOString(), '2026-10-01T01:02:03.456Z');
      const invoices = await legacy.$queryRaw`SELECT "total" FROM "Factura" WHERE "id"='legacy-invoice'`; assert.equal(invoices[0].total.toString(), '116.116');
    });
    await check('Repeat deploy is idempotent and preserves complete rows', async () => {
      const snapshot = await compare(legacyEnv, legacy); deploy(legacyEnv); assert.deepEqual(await compare(legacyEnv, legacy), snapshot);
    });
    await check('Numeric precision, UTC instants, uniqueness and foreign keys are enforced', async () => {
      await legacy.producto.create({ data: { id: 'decimal-product', tenantId: 'legacy-shop', nombre: 'Fixture', precioVenta: new Prisma.Decimal('0.10'), costo: new Prisma.Decimal('0.20') } });
      const sum = await legacy.$queryRaw`SELECT "precioVenta" + "costo" AS value FROM "Producto" WHERE "id"='decimal-product'`; assert.equal(sum[0].value.toString(), '0.3');
      await assert.rejects(legacy.producto.create({ data: { tenantId: 'nonexistent', nombre: 'Orphan', precioVenta: 1 } }), e => e.code === 'P2003');
      await assert.rejects(legacy.tenant.create({ data: { nombre: 'Duplicate', slug: 'fixture-legacy' } }), e => e.code === 'P2002');
      const time = new Date('2026-11-01T05:30:12.345-06:00');
      await legacy.cita.update({ where: { id: 'legacy-appointment' }, data: { fechaHora: time } });
      assert.equal((await legacy.cita.findUniqueOrThrow({ where: { id: 'legacy-appointment' } })).fechaHora.toISOString(), time.toISOString());
      const indexes = await legacy.$queryRaw`SELECT indexname FROM pg_indexes WHERE schemaname=current_schema()`;
      assert(indexes.some(i => i.indexname === 'Venta_tenantId_sucursalId_folio_key')); assert(indexes.some(i => i.indexname === 'Cita_sucursalId_barberoId_fechaHora_idx'));
    });

    const copySource = process.env.SYSTECH_ANON_SOURCE || (fs.existsSync(work) ? work : null);
    if (copySource) {
      const destination = path.join(helper.root, '.tools', 'st04_anonymous.json');
      execFileSync(process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3'), [path.join(__dirname, 'export_sqlite_anonymized.py'), '--source', copySource, '--output', destination], { stdio: 'pipe', windowsHide: true });
      const anonymous = JSON.parse(fs.readFileSync(destination, 'utf8'));
      const copyEnv = envFor('st04_copy_' + crypto.randomBytes(5).toString('hex'));
      deploy(copyEnv, helper.stageMigrations('st04_copy_before_integrity', versions.filter(v => v !== '20261006_02_postgres_integrity')));
      const copy = connect(copyEnv);
      await check('Anonymized SQLite copy upgrades without losing business rows or money', async () => {
        for (const model of Prisma.dmmf.datamodel.models.filter(m => !m.isIgnored && m.name !== 'Factura')) {
          const delegate = model.name[0].toLowerCase() + model.name.slice(1);
          if (!copy[delegate]) continue;
          const allowed = new Map(model.fields.filter(f => f.kind !== 'object').map(f => [f.name, f]));
          for (const row of anonymous.tables[model.name] || []) {
            const data = {};
            for (const [key, value] of Object.entries(row)) {
              const field = allowed.get(key); if (!field || field.isReadOnly) continue;
              data[key] = value === null ? null : field.type === 'DateTime' ? new Date(value) : field.type === 'Decimal' ? new Prisma.Decimal(String(value)) : value;
            }
            // Scalars representing foreign keys are valid for unchecked create inputs.
            for (const field of model.fields.filter(f => f.kind !== 'object' && f.isReadOnly)) if (row[field.name] !== undefined) data[field.name] = row[field.name];
            await copy[delegate].create({ data });
          }
        }
        const snapshot = await compare(copyEnv, copy); deploy(copyEnv); assert.deepEqual(await compare(copyEnv, copy), snapshot);
        for (const [table, rows] of Object.entries(snapshot)) if (anonymous.tables[table]) assert.equal(rows.length, anonymous.tables[table].length);
        console.log('Anonymous copy: ' + Object.entries(snapshot).map(([name, rows]) => `${name}=${rows.length}`).join(', '));
      });
    } else throw new Error('Provide SYSTECH_ANON_SOURCE containing a disposable SQLite snapshot for migration validation.');

    await check('Failed transactional migration rolls back and recovery preserves records', async () => {
      const brokenVersion = '20261006_99_failure_drill';
      const broken = helper.stageMigrations('st04_failure_drill', versions, { [brokenVersion]: 'BEGIN; CREATE TABLE "FailureProbe" (id TEXT); UPDATE "Suscripcion" SET "montoMensual"=0; SELECT 1/0; COMMIT;' });
      const snapshot = await compare(legacyEnv, legacy);
      assert.throws(() => deploy(legacyEnv, broken));
      assert.deepEqual(await compare(legacyEnv, legacy), snapshot);
      const failure = await legacy.$queryRaw`SELECT finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name='20261006_99_failure_drill' ORDER BY started_at DESC LIMIT 1`;
      assert.equal(failure[0].finished_at, null);
      helper.prisma(['migrate', 'resolve', '--rolled-back', brokenVersion, '--schema=' + broken], legacyEnv);
      fs.writeFileSync(path.join(path.dirname(broken), 'migrations', brokenVersion, 'migration.sql'), 'BEGIN; CREATE TABLE "FailureProbe" (id TEXT PRIMARY KEY); COMMIT;');
      deploy(legacyEnv, broken);
      const after = await compare(legacyEnv, legacy); delete after.FailureProbe; assert.deepEqual(after, snapshot);
    });
    await check('Pre-migration backup restores to a new isolated database with identical rows', async () => {
      const { backup, restore } = require('./postgres_backup');
      const file = path.join(helper.root, '.tools', 'st04-recovery.dump');
      backup(legacyEnv.DATABASE_URL, file, running.bin);
      const target = restore(legacyEnv.DATABASE_URL, file, 'systech_test_restore_' + crypto.randomBytes(5).toString('hex'), running.bin);
      const recoveredEnv = { ...baseEnv, DATABASE_URL: target };
      const recovered = connect(recoveredEnv);
      assert.deepEqual(await compare(recoveredEnv, recovered), await compare(legacyEnv, legacy));
    });
    await check('Full API regression executes against PostgreSQL with separate test schemas', async () => {
      execFileSync(process.execPath, [path.join(__dirname, 'run_all_tests.js')], { cwd: helper.root, env: { ...baseEnv, SYSTECH_TEST_PRISMA_CLIENT: clientPath }, stdio: 'inherit', windowsHide: true });
    });
    await check('Working SQLite database is unchanged', async () => { assert.equal(hash(work), before); });
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
    fs.writeFileSync(path.join(helper.root, 'docs/scrum/POSTGRES_RESULTADOS_ACTUALES.json'), JSON.stringify({ date, engine: 'PostgreSQL 16', passed: checks.length, checks, working_database_unchanged: hash(work) === before, source_snapshot: 'Anonymized local SQLite copy; authentication queues omitted', migrations: versions }, null, 2) + '\n');
    console.log(`${checks.length} PostgreSQL migration checks passed.`);
  } finally {
    for (const db of clients) await db.$disconnect();
    if (running.local) runtime.stop();
  }
}
main().catch(error => {
  // Do not serialize child env or connection URLs into evidence.
  console.error('ST-04 validation failed: ' + String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted PostgreSQL URL]'));
  if (error.stderr) console.error(String(error.stderr).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted PostgreSQL URL]'));
  process.exitCode = 1;
});

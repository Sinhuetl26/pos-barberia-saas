'use strict';
// Explicitly additive compatibility update for ONE existing disposable demo.
// Must be reviewed and called by the coordinator only after that API is stopped.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), target = path.join(root, '.test-db-TrhWfE/test.db');
if (process.env.NODE_ENV !== 'test' || process.env.SYSTECH_ISOLATED_TESTS !== 'true' || process.argv[2] !== '--apply') throw new Error('Explicit isolated demo upgrade mode required');
if (path.resolve(process.env.SYSTECH_TEST_PRISMA_CLIENT || '.') !== path.join(root, '.tools/prisma-sqlite/client')) throw new Error('Isolated SDK required');
const manifest = path.join(root, '.tools/dv-preview.json');
if (JSON.parse(fs.readFileSync(manifest, 'utf8')).database !== 'file:' + target.replace(/\\/g, '/')) throw new Error('Demo identity mismatch');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const stable = value => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item);
async function main() {
  let live = false; try { live = (await fetch('http://127.0.0.1:3101/api/health', { signal: AbortSignal.timeout(1500) })).ok; } catch {}
  if (live) throw new Error('Coordinator must stop the identified demo API before a consistent backup');
  for (const suffix of ['-wal', '-shm', '-journal']) if (fs.existsSync(target + suffix)) throw new Error('SQLite journal present; wait for clean shutdown');
  const backup = path.join(root, '.tools/st12-demo-upgrade-backup.sqlite');
  if (fs.existsSync(backup)) throw new Error('Backup already exists; inspect prior upgrade rather than overwrite');
  const originalHash = hash(target), operational = path.join(root, 'packages/database/prisma/dev.db'), operationalHash = hash(operational), manifestHash = hash(manifest);
  fs.copyFileSync(target, backup); if (hash(backup) !== originalHash) throw new Error('Backup verification failed');
  process.env.DATABASE_URL = 'file:' + target.replace(/\\/g, '/'); require('./test_prisma_client');
  const { prisma } = require('@systech/database');
  const tableNames = ['DurableJob', 'JobProviderControl', 'JobWorkerPulse'];
  try {
    const existing = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`);
    if (existing.some(row => tableNames.includes(row.name))) throw new Error('ST12 tables already present; refusing partial or repeated upgrade');
    async function snapshot() {
      const rows = {};
      for (const { name } of existing) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('Unexpected table name');
        const records = await prisma.$queryRawUnsafe('SELECT * FROM "' + name + '"');
        rows[name] = records.map(stable).sort();
      }
      return crypto.createHash('sha256').update(stable(rows)).digest('hex');
    }
    const before = await snapshot();
    const source = fs.readFileSync(path.join(root, 'packages/database/prisma/migrations/20261009_durable_jobs/migration.sql'), 'utf8');
    const statements = source.replace(/TIMESTAMP\(3\)/g, 'DATETIME').split(';').map(value => value.trim()).filter(Boolean);
    if (statements.length !== 7 || statements.some(value => !/^CREATE (TABLE|(?:UNIQUE )?INDEX) "(?:DurableJob|JobProviderControl|JobWorkerPulse)/.test(value))) throw new Error('Expected only additive ST12 tables/indexes');
    await prisma.$transaction(async tx => { for (const sql of statements) await tx.$executeRawUnsafe(sql); }, { timeout: 20000 });
    const after = await snapshot();
    if (after !== before || hash(operational) !== operationalHash || hash(manifest) !== manifestHash) throw new Error('Original business snapshot or operational environment changed; preserve backup for coordinator restore');
    fs.writeFileSync(path.join(root, '.tools/st12-demo-upgrade-result.json'), JSON.stringify({ finishedAt: new Date().toISOString(), originalTables: existing.length, existingBusinessSnapshotUnchanged: true, operationalDatabaseUnchanged: true, demoManifestUnchanged: true, additiveTables: tableNames, verifiedBackupSha256: originalHash }, null, 2) + '\n');
    console.log('Only three ST12 tables added; all original table contents, dev.db and manifest unchanged; backup verified.');
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

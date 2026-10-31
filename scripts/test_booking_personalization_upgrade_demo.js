'use strict';
// Coordinator-only additive upgrade of the named disposable preview, after stopping its API.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), target = path.join(root, '.test-db-TrhWfE/test.db');
if (process.env.NODE_ENV !== 'test' || process.env.SYSTECH_ISOLATED_TESTS !== 'true' || process.argv[2] !== '--apply') throw new Error('Explicit isolated demo upgrade mode required');
if (path.resolve(process.env.SYSTECH_TEST_PRISMA_CLIENT || '.') !== path.join(root, '.tools/prisma-uiux/client')) throw new Error('New isolated UI/UX SDK required');
const manifest = path.join(root, '.tools/dv-preview.json');
if (JSON.parse(fs.readFileSync(manifest, 'utf8')).database !== 'file:' + target.replace(/\\/g, '/')) throw new Error('Demo identity mismatch');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const stable = value => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item);
async function main() {
  let live = false; try { live = (await fetch('http://127.0.0.1:3101/api/health', { signal: AbortSignal.timeout(1500) })).ok; } catch {}
  if (live) throw new Error('Stop the identified demo API before taking its backup');
  for (const suffix of ['-wal', '-shm', '-journal']) if (fs.existsSync(target + suffix)) throw new Error('SQLite journal present; wait for clean shutdown');
  const backup = path.join(root, '.tools/uiux-demo-upgrade-backup.sqlite');
  if (fs.existsSync(backup)) throw new Error('Upgrade backup exists; refusing to overwrite');
  const originalHash = hash(target), operational = path.join(root, 'packages/database/prisma/dev.db'), operationalHash = hash(operational), manifestHash = hash(manifest);
  fs.copyFileSync(target, backup); if (hash(backup) !== originalHash) throw new Error('Backup verification failed');
  process.env.DATABASE_URL = 'file:' + target.replace(/\\/g, '/'); require('./test_prisma_client');
  const { prisma } = require('@systech/database');
  try {
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`);
    const columns = {};
    for (const { name } of tables) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('Unexpected table name');
      columns[name] = (await prisma.$queryRawUnsafe('PRAGMA table_info("' + name + '")')).map(row => row.name);
    }
    if (columns.Tenant.includes('personalizacionWeb')) throw new Error('Column already exists; refusing repeated upgrade');
    async function snapshot() {
      const rows = {};
      for (const { name } of tables) {
        const selected = columns[name].map(column => '"' + column.replace(/"/g, '""') + '"').join(',');
        rows[name] = (await prisma.$queryRawUnsafe('SELECT ' + selected + ' FROM "' + name + '"')).map(stable).sort();
      }
      return crypto.createHash('sha256').update(stable(rows)).digest('hex');
    }
    const before = await snapshot();
    await prisma.$executeRawUnsafe('ALTER TABLE "Tenant" ADD COLUMN "personalizacionWeb" TEXT');
    const after = await snapshot();
    const newValues = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS count FROM "Tenant" WHERE "personalizacionWeb" IS NOT NULL');
    if (before !== after || Number(newValues[0].count) !== 0 || hash(operational) !== operationalHash || hash(manifest) !== manifestHash) throw new Error('Business snapshot changed; preserve verified backup for coordinator recovery');
    fs.writeFileSync(path.join(root, '.tools/uiux-demo-upgrade-result.json'), JSON.stringify({ finishedAt: new Date().toISOString(), originalTables: tables.length, oldColumnsAndRowsUnchanged: true, operationalDatabaseUnchanged: true, demoManifestUnchanged: true, additiveColumn: 'Tenant.personalizacionWeb', legacyValuesNull: true, verifiedBackupSha256: originalHash }, null, 2) + '\n');
    console.log('Added only Tenant.personalizacionWeb; all original columns/rows, dev.db and preview manifest unchanged. Backup verified.');
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

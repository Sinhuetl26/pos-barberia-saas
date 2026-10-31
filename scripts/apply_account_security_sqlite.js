// Idempotent additive migration for local SQLite; never seed or rebuild user tables.
require('dotenv/config');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { prisma } = require('@systech/database');
async function main() {
  try {
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) throw new Error('Solo admite SQLite local. PostgreSQL utiliza la migración versionada.');
    const columns = await prisma.$queryRawUnsafe('PRAGMA table_info("Usuario")');
    if (!columns.length) throw new Error('Base no reconocida. No se realizaron cambios.');
    const names = columns.map(c => c.name);
    const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table'");
    if (['sessionVersion', 'emailVerifiedAt', 'verificationRequired', 'invitationPending'].every(n => names.includes(n)) && ['AuthAction', 'AuthThrottle'].every(n => tables.some(t => t.name === n))) { console.log('ST-03: migración local ya aplicada.'); return; }
    const backup = path.join(os.tmpdir(), `systech-before-st03-${Date.now()}.db`);
    await prisma.$executeRawUnsafe('VACUUM INTO ?', backup);
    const counts = async () => [await prisma.usuario.count(), await prisma.clienteFinal.count(), await prisma.venta.count()];
    const before = await counts();
    const sql = fs.readFileSync(path.join(__dirname, '../packages/database/prisma/migrations/20261005_account_security/migration.sql'), 'utf8').replace(/^--.*$/gm, '');
    await prisma.$transaction(async tx => {
      for (const raw of sql.split(';')) {
        let statement = raw.trim(); if (!statement) continue;
        const column = statement.match(/^ALTER TABLE "Usuario" ADD COLUMN "([^"]+)"/);
        if (column && names.includes(column[1])) continue;
        statement = statement.replace(/^CREATE TABLE /, 'CREATE TABLE IF NOT EXISTS ').replace(/^CREATE UNIQUE INDEX /, 'CREATE UNIQUE INDEX IF NOT EXISTS ').replace(/^CREATE INDEX /, 'CREATE INDEX IF NOT EXISTS ');
        await tx.$executeRawUnsafe(statement);
      }
    });
    if (JSON.stringify(before) !== JSON.stringify(await counts())) throw new Error('Los conteos cambiaron durante la migración. Revisar antes de iniciar.');
    console.log('ST-03 aplicada; usuarios, clientes y ventas conservan sus conteos.'); console.log('Respaldo local: ' + backup);
  } finally { await prisma.$disconnect(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });

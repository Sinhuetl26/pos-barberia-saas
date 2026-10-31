// Additive local migration: never seeds, clears, or rebuilds existing tables.
require('dotenv/config');
const path = require('node:path');
const os = require('node:os');
const { prisma } = require('@systech/database');

async function main() {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) throw new Error('Este procedimiento solo admite SQLite local. PostgreSQL usa su migración versionada.');
  const columns = async table => prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
  try {
    const users = await columns('Usuario'), clients = await columns('ClienteFinal');
    if (!users.length || !clients.length) throw new Error('Base local no reconocida. No se realizaron cambios.');
    if (users.some(c => c.name === 'sucursalesAsignadasJson') && clients.some(c => c.name === 'sucursalOrigenId')) { console.log('Permisos: la base local ya tiene los dos campos.'); return; }
    const backup = path.join(os.tmpdir(), `systech-before-st02-${Date.now()}.db`);
    // VACUUM INTO makes a consistent snapshot, including any committed WAL data.
    await prisma.$executeRawUnsafe('VACUUM INTO ?', backup);
    const before = { users: await prisma.usuario.count(), clients: await prisma.clienteFinal.count(), sales: await prisma.venta.count() };
    await prisma.$transaction(async tx => {
      if (!users.some(c => c.name === 'sucursalesAsignadasJson')) await tx.$executeRawUnsafe('ALTER TABLE "Usuario" ADD COLUMN "sucursalesAsignadasJson" TEXT');
      if (!clients.some(c => c.name === 'sucursalOrigenId')) await tx.$executeRawUnsafe('ALTER TABLE "ClienteFinal" ADD COLUMN "sucursalOrigenId" TEXT');
    });
    const after = { users: await prisma.usuario.count(), clients: await prisma.clienteFinal.count(), sales: await prisma.venta.count() };
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Los conteos cambiaron durante la migración. Revisar antes de iniciar.');
    console.log('Migración local aditiva aplicada. Usuarios, clientes y ventas conservan sus conteos.');
    console.log(`Respaldo local: ${backup}`);
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

// ======================================================================
// SYSTECH STUDIO - DATABASE ENGINE SELECTOR (SQLITE <-> POSTGRESQL)
// Allows switching active Prisma schema between local SQLite and Production PostgreSQL
// ======================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = (process.argv[2] || 'sqlite').toLowerCase();
const prismaDir = path.join(__dirname, '..', 'packages', 'database', 'prisma');
const activeSchemaPath = path.join(prismaDir, 'schema.prisma');
const postgresSchemaPath = path.join(prismaDir, 'schema.postgres.prisma');
const sqliteSchemaPath = path.join(prismaDir, 'schema.sqlite.prisma');

// Ensure a backup of the sqlite schema exists
if (!fs.existsSync(sqliteSchemaPath) && fs.existsSync(activeSchemaPath)) {
  const currentContent = fs.readFileSync(activeSchemaPath, 'utf8');
  if (currentContent.includes('provider = "sqlite"')) {
    fs.writeFileSync(sqliteSchemaPath, currentContent, 'utf8');
  }
}

if (target === 'postgres' || target === 'postgresql') {
  console.log('🔄 Cambiando motor de base de datos a PostgreSQL (Producción / Docker)...');
  if (!fs.existsSync(postgresSchemaPath)) {
    console.error('❌ Error: schema.postgres.prisma no existe');
    process.exit(1);
  }
  fs.copyFileSync(postgresSchemaPath, activeSchemaPath);
  console.log('✅ schema.prisma actualizado a PostgreSQL');
} else {
  console.log('🔄 Cambiando motor de base de datos a SQLite (Desarrollo local)...');
  if (fs.existsSync(sqliteSchemaPath)) {
    fs.copyFileSync(sqliteSchemaPath, activeSchemaPath);
    console.log('✅ schema.prisma actualizado a SQLite');
  } else {
    console.log('ℹ️ Manteniendo schema.prisma SQLite actual');
  }
}

try {
  console.log('⚡ Ejecutando prisma generate...');
  execSync('npx prisma generate --schema=packages/database/prisma/schema.prisma', { stdio: 'inherit' });
  console.log('🎉 Prisma Client generado exitosamente.');
} catch (e) {
  console.error('❌ Error al generar Prisma Client:', e.message);
}

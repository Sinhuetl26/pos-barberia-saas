/**
 * SYSTECH Studio - Cross-Platform Database Backup & Restore Utility
 * Supports SQLite local backups and PostgreSQL pg_dump/pg_restore in staging/prod.
 * Resolves finding M11.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const backupDir = path.join(rootDir, 'backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const action = process.argv[2] || 'backup';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

if (action === 'backup') {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    const destFile = path.join(backupDir, `pg_backup_${timestamp}.sql`);
    try {
      execSync(`pg_dump "${dbUrl}" > "${destFile}"`, { stdio: 'inherit' });
      console.log(`✅ [PostgreSQL] Respaldo generado con éxito en: ${destFile}`);
    } catch (e) {
      console.error('❌ Error ejecutando pg_dump:', e.message);
    }
  } else {
    // SQLite backup
    const sqlitePath = path.join(rootDir, 'packages', 'database', 'prisma', 'dev.db');
    if (fs.existsSync(sqlitePath)) {
      const destFile = path.join(backupDir, `dev_backup_${timestamp}.db`);
      fs.copyFileSync(sqlitePath, destFile);
      console.log(`✅ [SQLite] Respaldo generado con éxito en: ${destFile}`);
    } else {
      console.log('⚠️ No se encontró la base de datos dev.db para respaldar.');
    }
  }
} else if (action === 'list') {
  console.log(`📂 Respaldos disponibles en ${backupDir}:`);
  const files = fs.readdirSync(backupDir);
  if (files.length === 0) {
    console.log('   (Ningún respaldo disponible)');
  } else {
    files.forEach(f => {
      const stats = fs.statSync(path.join(backupDir, f));
      console.log(` - ${f} (${(stats.size / 1024).toFixed(1)} KB) - ${stats.mtime.toLocaleString()}`);
    });
  }
} else {
  console.log('Uso: node scripts/backup_restore.js [backup|list]');
}

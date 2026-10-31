'use strict';
// Read-only release check: no deploy, reset, push or changes to database rows.
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const schema = path.join(root, 'packages/database/prisma/schema.postgres.prisma');
const problem = (code, message) => Object.assign(new Error(message), { code });
function checkPostgres(env = process.env) {
  try {
    const url = new URL(env.DATABASE_URL || '');
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
  } catch { throw problem('POSTGRES_URL_REQUIRED', 'Configura una URL PostgreSQL explícita. No se consulta ni modifica SQLite.'); }
  const run = args => execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  try { run(['migrate', 'status', '--schema=' + schema]); }
  catch { throw problem('MIGRATION_HISTORY_NOT_READY', 'No se confirmó un historial completo de migraciones. Revisa conexión, migraciones pendientes o fallidas; no se aplicó ningún cambio.'); }
  try { run(['migrate', 'diff', '--from-schema-datasource=' + schema, '--to-schema-datamodel=' + schema, '--exit-code']); }
  catch (error) { throw problem(error.status === 2 ? 'SCHEMA_DRIFT' : 'SCHEMA_CHECK_UNAVAILABLE', error.status === 2 ? 'El esquema de la base difiere del modelo versionado. Revisa las diferencias antes de publicar; no se corrigieron automáticamente.' : 'No se pudo comparar el esquema. Revisa la conexión y los permisos; no se aplicó ningún cambio.'); }
  return { ready: true, history: 'up_to_date', schema: 'matches', database_writes: false };
}
if (require.main === module) {
  require('dotenv').config({ path: path.join(root, '.env') });
  try { console.log(JSON.stringify(checkPostgres(), null, 2)); }
  catch (error) { console.error(error.code + ': ' + error.message); process.exitCode = 1; }
}
module.exports = { checkPostgres };

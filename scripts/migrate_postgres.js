'use strict';
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });
if (!/^postgres(?:ql)?:\/\//.test(process.env.DATABASE_URL || '')) {
  console.error('Configure an explicit PostgreSQL DATABASE_URL. This command does not migrate the working SQLite database.'); process.exit(1);
}
try {
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema=' + path.join(root, 'packages/database/prisma/schema.postgres.prisma')], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true });
} catch { console.error('Migration stopped. Follow the recovery procedure; do not use db push or reset.'); process.exitCode = 1; }

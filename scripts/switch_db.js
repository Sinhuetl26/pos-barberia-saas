'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const target = process.argv[2];
if (!['sqlite', 'postgres', 'postgresql'].includes(target)) throw new Error('Choose sqlite or postgres explicitly.');
const root = path.resolve(__dirname, '..');
const active = path.join(root, 'packages/database/prisma/schema.prisma');
const canonical = path.join(root, 'packages/database/prisma/schema.postgres.prisma');
const text = fs.readFileSync(active, 'utf8');
const normalized = value => value.replace(/\/\/[^\n]*/g, '').replace(/provider\s*=\s*"(?:sqlite|postgresql)"/, 'provider="database"').replace(/\s+/g, '');
if (normalized(text) !== normalized(fs.readFileSync(canonical, 'utf8'))) throw new Error('Schema profiles differ. Reconcile their models before switching; no stale backup will be copied.');
const provider = target === 'sqlite' ? 'sqlite' : 'postgresql';
const changed = text.replace(/(datasource db\s*\{\s*provider\s*=\s*)"(?:sqlite|postgresql)"/, '$1"' + provider + '"');
if (changed === text && !text.includes('provider = "' + provider + '"')) throw new Error('Cannot locate database provider.');
fs.writeFileSync(active, changed);
try {
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'generate', '--schema=' + active], { cwd: root, stdio: 'inherit', windowsHide: true });
  console.log('Client generated for ' + provider + '; no database rows were changed.');
} catch (error) {
  fs.writeFileSync(active, text);
  console.error('Client generation failed; original schema restored.'); process.exitCode = 1;
}

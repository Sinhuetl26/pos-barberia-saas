'use strict';
// Generates an isolated SQLite SDK only. Does not touch the demo's loaded DLL.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
if (process.env.NODE_ENV !== 'test' || process.env.SYSTECH_ISOLATED_TESTS !== 'true') throw new Error('Isolated test mode required');
const root = path.resolve(__dirname, '..'), directory = path.join(root, '.tools', 'prisma-sqlite');
fs.mkdirSync(directory, { recursive: true });
const source = fs.readFileSync(path.join(root, 'packages/database/prisma/schema.prisma'), 'utf8');
const schema = source.replace(/generator client \{[\s\S]*?\}/, 'generator client {\n  provider = "prisma-client-js"\n  output = "./client"\n}');
if (schema === source) throw new Error('Generator not found');
fs.writeFileSync(path.join(directory, 'schema.prisma'), schema);
execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'generate', '--schema=' + path.join(directory, 'schema.prisma')], { cwd: root, env: { ...process.env, DATABASE_URL: 'file:./unused.db' }, stdio: 'inherit', windowsHide: true });
console.log('Isolated SQLite client ready');

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const schema = path.join(root, 'packages/database/prisma/schema.postgres.prisma');
const prismaCli = require.resolve('prisma/build/index.js');
function prisma(args, env, input) {
  return execFileSync(process.execPath, [prismaCli, ...args], { cwd: root, env, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
}
function isolatedUrl(base, schemaName) {
  const url = new URL(base);
  if (!['postgresql:', 'postgres:'].includes(url.protocol) || !/^\/systech_test_[a-z0-9_]+$/.test(url.pathname) || !/^st04_[a-z0-9_]+$/.test(schemaName)) throw new Error('Expected isolated PostgreSQL database and schema.');
  url.searchParams.set('schema', schemaName);
  return url.toString();
}
function stageMigrations(name, versions, extra = {}) {
  if (!/^st04_[a-z0-9_]+$/.test(name)) throw new Error('Unsafe migration staging path.');
  const directory = path.join(root, '.tools', name);
  fs.mkdirSync(path.join(directory, 'migrations'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'schema.prisma'), fs.readFileSync(schema));
  fs.copyFileSync(path.join(path.dirname(schema), 'migrations/migration_lock.toml'), path.join(directory, 'migrations/migration_lock.toml'));
  for (const version of versions) {
    if (!/^[a-z0-9_]+$/.test(version)) throw new Error('Unsafe migration name.');
    const folder = path.join(directory, 'migrations', version);
    fs.mkdirSync(folder, { recursive: true });
    fs.copyFileSync(path.join(path.dirname(schema), 'migrations', version, 'migration.sql'), path.join(folder, 'migration.sql'));
  }
  for (const [version, sql] of Object.entries(extra)) {
    if (!/^[a-z0-9_]+$/.test(version)) throw new Error('Unsafe migration name.');
    const folder = path.join(directory, 'migrations', version);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'migration.sql'), sql);
  }
  return path.join(directory, 'schema.prisma');
}
function sql(text, env) { return prisma(['db', 'execute', '--stdin', '--schema=' + schema], env, text); }
function generateClient(env) {
  const directory = path.join(root, '.tools', 'prisma-postgres');
  fs.mkdirSync(directory, { recursive: true });
  const clientSchema = fs.readFileSync(schema, 'utf8').replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "./client"');
  const filename = path.join(directory, 'schema.prisma');
  fs.writeFileSync(filename, clientSchema);
  prisma(['generate', '--schema=' + filename], env);
  return path.join(directory, 'client');
}
module.exports = { root, schema, prisma, isolatedUrl, stageMigrations, sql, generateClient };

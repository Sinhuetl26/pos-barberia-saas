'use strict';
const path = require('node:path');
const { execFileSync } = require('node:child_process');
function connection(url) {
  const value = new URL(url);
  return { ...process.env, PGHOST: value.hostname, PGPORT: value.port || '5432', PGDATABASE: value.pathname.slice(1), PGUSER: decodeURIComponent(value.username), PGPASSWORD: decodeURIComponent(value.password) };
}
const executable = (bin, name) => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
function backup(url, file, bin) {
  const schema = new URL(url).searchParams.get('schema');
  if (!schema || !/^st04_[a-z0-9_]+$/.test(schema)) throw new Error('This rehearsal only backs up isolated ST-04 schemas.');
  execFileSync(executable(bin, 'pg_dump'), ['--format=custom', '--no-owner', '--no-acl', '--schema=' + schema, '--file=' + file], { env: connection(url), stdio: 'pipe', windowsHide: true });
}
function restore(url, file, name, bin) {
  if (!/^systech_test_restore_[a-z0-9_]+$/.test(name)) throw new Error('Restore requires a new isolated test database.');
  // createdb fails if the destination exists. Never overwrite or --clean an existing database.
  execFileSync(executable(bin, 'createdb'), [name], { env: connection(url), stdio: 'pipe', windowsHide: true });
  const target = new URL(url); target.pathname = '/' + name;
  execFileSync(executable(bin, 'pg_restore'), ['--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '--dbname=' + name, file], { env: connection(target.toString()), stdio: 'pipe', windowsHide: true });
  return target.toString();
}
module.exports = { backup, restore };

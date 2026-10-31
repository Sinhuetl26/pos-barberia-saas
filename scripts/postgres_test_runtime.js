'use strict';

// Disposable local PostgreSQL cluster, loopback only; never registers a Windows service.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const runtime = path.join(root, '.tools', 'postgres');
const bin = process.env.PG_BIN || path.join(runtime, 'runtime', 'pgsql', 'bin');
const cluster = path.join(runtime, 'test-cluster');
const credentials = path.join(runtime, 'test-connection.json');
const executable = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
function start() {
  if (process.env.SYSTECH_TEST_PG_URL) return { url: process.env.SYSTECH_TEST_PG_URL, bin, local: false };
  if (!fs.existsSync(executable('initdb'))) throw new Error('Set SYSTECH_TEST_PG_URL for CI, or provide official PostgreSQL binaries in PG_BIN.');
  fs.mkdirSync(runtime, { recursive: true });
  let config;
  if (fs.existsSync(credentials)) config = JSON.parse(fs.readFileSync(credentials, 'utf8'));
  else {
    config = { user: 'systech_test', password: crypto.randomBytes(32).toString('hex'), port: 55404, database: 'systech_test_st04' };
    fs.writeFileSync(credentials, JSON.stringify(config), { mode: 0o600 });
  }
  const env = { ...process.env, PGPASSWORD: config.password, PGUSER: config.user, PGHOST: '127.0.0.1', PGPORT: String(config.port), PGDATABASE: 'postgres' };
  if (!fs.existsSync(path.join(cluster, 'PG_VERSION'))) {
    const passwordFile = path.join(runtime, 'init-password');
    fs.writeFileSync(passwordFile, config.password, { mode: 0o600 });
    try { execFileSync(executable('initdb'), ['-D', cluster, '-U', config.user, '--encoding=UTF8', '--locale=C', '--auth=scram-sha-256', '--pwfile=' + passwordFile], { env, stdio: 'pipe', windowsHide: true }); }
    finally { fs.unlinkSync(passwordFile); }
  }
  let running = true;
  try { execFileSync(executable('pg_ctl'), ['-D', cluster, 'status'], { env, stdio: 'pipe', windowsHide: true }); } catch { running = false; }
  if (!running) execFileSync(executable('pg_ctl'), ['-D', cluster, '-l', path.join(runtime, 'server.log'), '-o', `-p ${config.port} -h 127.0.0.1`, '-w', 'start'], { env, stdio: 'ignore', windowsHide: true });
  const databases = execFileSync(executable('psql'), ['-At', '-c', `SELECT 1 FROM pg_database WHERE datname='${config.database}'`], { env, encoding: 'utf8', windowsHide: true });
  if (!databases.trim()) execFileSync(executable('createdb'), [config.database], { env, stdio: 'pipe', windowsHide: true });
  return { url: `postgresql://${config.user}:${config.password}@127.0.0.1:${config.port}/${config.database}`, bin, local: true };
}
function stop() {
  execFileSync(executable('pg_ctl'), ['-D', cluster, '-m', 'fast', '-w', 'stop'], { stdio: 'pipe', windowsHide: true });
}
module.exports = { start, stop };
if (require.main === module) {
  try {
    if (process.argv[2] === 'stop') { stop(); console.log('Isolated PostgreSQL stopped.'); }
    else { const value = start(); console.log('Isolated PostgreSQL ready on loopback; credentials are not logged.'); console.log(execFileSync(path.join(value.bin, 'postgres' + (process.platform === 'win32' ? '.exe' : '')), ['--version'], { encoding: 'utf8', windowsHide: true }).trim()); }
  } catch (error) { console.error('PostgreSQL runtime could not start. Check the local ignored server log.'); process.exitCode = 1; }
}

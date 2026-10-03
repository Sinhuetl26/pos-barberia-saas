/**
 * SYSTECH Studio - Cross-Platform Development Runner
 * Concurrently starts API and Web workspaces without platform-specific commands
 */
const { spawn } = require('child_process');

console.log('🚀 Iniciando SYSTECH Studio (API + Frontend)...');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const api = spawn(npmCmd, ['run', 'dev:api'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

const web = spawn(npmCmd, ['run', 'dev:web'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

function cleanup() {
  console.log('\n🛑 Cerrando servicios de SYSTECH...');
  try { api.kill(); } catch (e) {}
  try { web.kill(); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

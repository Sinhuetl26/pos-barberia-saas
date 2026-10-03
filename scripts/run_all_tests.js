// ======================================================================
// SYSTECH STUDIO - UNIFIED SELF-CONTAINED TEST RUNNER (ALL PHASES 0 TO 3)
// Executes: Security, Concurrency/Finances, Integrations, and Product Suite
// Auto-builds and auto-starts local API test server if not already running
// ======================================================================

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const suites = [
  { name: 'Fase 0: Seguridad, Criptografía & Multitenant', script: 'test_phase0_security.js' },
  { name: 'Fase 1: Finanzas, Validaciones Zod & Concurrencia', script: 'test_phase1_financial_and_concurrency.js' },
  { name: 'Fase 2: Stripe Billing, WhatsApp Cloud & Tickets Térmicos', script: 'test_phase2_integrations.js' },
  { name: 'Fase 3: Multi-Servicio, Cancelación Criptográfica & CRM', script: 'test_phase3_product_suite.js' }
];

async function isServerRunning() {
  try {
    const res = await fetch('http://localhost:3001/api/health', { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function waitForServer(maxAttempts = 30, delayMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isServerRunning()) return true;
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

async function main() {
  console.log('======================================================================');
  console.log('🚀 SYSTECH STUDIO - EJECUCIÓN DE BATERÍA COMPLETA DE PRUEBAS AUTOMATIZADAS');
  console.log('======================================================================\n');

  const rootDir = path.join(__dirname, '..');
  const distIndex = path.join(rootDir, 'apps', 'api', 'dist', 'index.js');

  // Step 1: Ensure API is built
  if (!fs.existsSync(distIndex)) {
    console.log('⚙️ Compilando API para ejecución de pruebas...');
    execSync('npm run build:api', { cwd: rootDir, stdio: 'inherit' });
  }

  // Step 2: Check or start API server
  let serverProcess = null;
  const running = await isServerRunning();
  if (running) {
    console.log('✅ Servidor API detectado activo en http://localhost:3001');
    console.log('🚀 Iniciando servidor API local para las pruebas...');
    const isWin = process.platform === 'win32';
    const command = isWin ? 'cmd.exe' : 'npm';
    const args = isWin ? ['/c', 'npm', 'run', 'dev:api'] : ['run', 'dev:api'];

    serverProcess = spawn(command, args, {
      cwd: rootDir,
      env: {
        ...process.env,
        PORT: '3001',
        NODE_ENV: 'test',
        DATABASE_URL: process.env.DATABASE_URL || 'file:./packages/database/prisma/dev.db'
      },
      stdio: 'pipe'
    });

    serverProcess.on('error', (err) => {
      console.error('❌ Error al iniciar servidor API:', err.message);
    });

    const ready = await waitForServer();
    if (!ready) {
      console.error('❌ No se pudo conectar al servidor API en http://localhost:3001 tras varios intentos.');
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
    console.log('✅ Servidor API iniciado y listo en http://localhost:3001\n');
  }

  let passedCount = 0;
  let failedCount = 0;
  let totalIndividualTestsPassed = 0;

  try {
    for (const suite of suites) {
      console.log(`\n▶ Ejecutando: ${suite.name}...`);
      const scriptPath = path.join(__dirname, suite.script);
      try {
        const output = execSync(`node "${scriptPath}"`, { encoding: 'utf8', cwd: __dirname });
        process.stdout.write(output);

        // Extract real test counts from suite output
        const match = output.match(/(\d+)\s+(?:de\s+\d+\s+pruebas pasadas|PASSED)/i);
        if (match) {
          totalIndividualTestsPassed += parseInt(match[1], 10);
        }

        passedCount++;
      } catch (err) {
        if (err.stdout) process.stdout.write(err.stdout);
        if (err.stderr) process.stderr.write(err.stderr);
        console.error(`❌ ERROR en suite: ${suite.name}`);
        failedCount++;
      }
    }
  } finally {
    if (serverProcess) {
      console.log('\n🛑 Deteniendo servidor API temporal de pruebas...');
      serverProcess.kill();
    }
  }

  console.log('\n======================================================================');
  console.log(`📊 RESUMEN FINAL: ${passedCount} de ${suites.length} suites exitosas (${totalIndividualTestsPassed} pruebas individuales verificadas), ${failedCount} fallidas`);
  if (failedCount === 0) {
    console.log(`🎉 TODAS LAS PRUEBAS (${totalIndividualTestsPassed}/${totalIndividualTestsPassed}) PASARON CON ÉXITO AL 100%. LISTO PARA PRODUCCIÓN.`);
    console.log('======================================================================\n');
    process.exit(0);
  } else {
    console.error('❌ SE ENCONTRARON FALLOS EN LAS PRUEBAS.');
    console.log('======================================================================\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error fatal al ejecutar pruebas:', err);
  process.exit(1);
});

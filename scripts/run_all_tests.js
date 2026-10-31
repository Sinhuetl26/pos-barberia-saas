const { execFileSync, fork } = require('child_process');
const path = require('path');
const { createTestFixture, seedTestFixture, cleanTestFixture } = require('./test_fixture');

const suites = [
  {id:'counter-tickets',name:'ST-09: tickets de mostrador',script:'test_counter_tickets.js'},
  {id:'mail-onboarding',name:'ST-08: alta y correo transaccional',script:'test_mail_onboarding.js'},
  { id: 'booking-integrity', name: 'ST-07: agenda y reservas concurrentes', script: 'test_booking_integrity.js' },
  { id: 'cash-integrity', name: 'ST-06: caja, custodia y devoluciones concurrentes', script: 'test_cash_integrity.js' },
  { id: 'pos-integrity', name: 'ST-05: ventas, inventario y reintentos concurrentes', script: 'test_pos_integrity.js' },
  { id: 'account-security', name: 'Recuperación, invitaciones y revocación de sesiones', script: 'test_account_security.js' },
  { id: 'phase0', name: 'Seguridad y aislamiento', script: 'test_phase0_security.js' },
  { id: 'phase1', name: 'Finanzas y concurrencia', script: 'test_phase1_financial_and_concurrency.js' },
  { id: 'phase2', name: 'Integraciones y tickets', script: 'test_phase2_integrations.js' },
  { id: 'phase3', name: 'Agenda, clientes y comisiones', script: 'test_phase3_product_suite.js' },
  { id: 'commercial', name: 'Base comercial y licencias', script: 'test_commercial_foundation.js' },
  { id: 'authorization', name: 'Roles, sucursales y capacidades públicas', script: 'test_authorization.js' },
  { id: 'licenses', name: 'Catálogo y capacidad por sucursal', script: 'test_license_catalog.js' },
];
async function main() {
  const selection = process.argv[2];
  const selected = selection ? suites.filter(s => s.id === selection) : suites;
  if (!selected.length) throw new Error('Suite desconocida');
  const root = path.resolve(__dirname, '..');
  console.log('Compilando la API actual para pruebas en una base desechable…');
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'apps/api/tsconfig.json'], { cwd: root, stdio: 'inherit' });
  let fixture;
  let server;
  let failures = 0;
  try {
    fixture = createTestFixture();
    seedTestFixture(fixture.env);
    server = fork(path.join(__dirname, 'test_server.js'), [], { cwd: root, env: fixture.env, execArgv: process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    server.stderr.on('data', data => process.stderr.write(data));
    const base = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('La API de pruebas no inició.')), 15000);
      server.once('message', message => { clearTimeout(timeout); resolve(message.base); });
      server.once('exit', () => { clearTimeout(timeout); reject(new Error('La API de pruebas terminó antes de iniciar.')); });
    });
    for (const suite of selected) {
      console.log(`\n▶ ${suite.name}`);
      try {
        execFileSync(process.execPath, [...(process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : []), path.join(__dirname, suite.script)], {
          cwd: root, env: { ...fixture.env, TEST_API_BASE: base, SYSTECH_ISOLATED_TESTS: 'true' }, stdio: 'inherit', timeout: 120000,
        });
      } catch { failures++; }
    }
  } finally {
    if (server && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill(); });
    if (fixture) cleanTestFixture(fixture.directory);
  }
  console.log(`\n${selected.length - failures}/${selected.length} suites aprobadas. Las pruebas no certifican preparación para producción.`);
  process.exitCode = failures ? 1 : 0;
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });

// ======================================================================
// SYSTECH STUDIO - UNIFIED TEST RUNNER (ALL PHASES 0 TO 3)
// Executes: Security, Concurrency/Finances, Integrations, and Product Suite
// ======================================================================

const { execSync } = require('child_process');
const path = require('path');

const suites = [
  { name: 'Fase 0: Seguridad, Criptografía & Multitenant', script: 'test_phase0_security.js' },
  { name: 'Fase 1: Finanzas, Validaciones Zod & Concurrencia', script: 'test_phase1_financial_and_concurrency.js' },
  { name: 'Fase 2: Stripe Billing, WhatsApp Cloud & Tickets Térmicos', script: 'test_phase2_integrations.js' },
  { name: 'Fase 3: Multi-Servicio, Cancelación Criptográfica & CRM', script: 'test_phase3_product_suite.js' }
];

console.log('======================================================================');
console.log('🚀 SYSTECH STUDIO - EJECUCIÓN DE BATERÍA COMPLETA DE PRUEBAS AUTOMATIZADAS');
console.log('======================================================================\n');

let passedCount = 0;
let failedCount = 0;
let totalIndividualTestsPassed = 0;

for (const suite of suites) {
  console.log(`\n▶ Ejecutando: ${suite.name}...`);
  const scriptPath = path.join(__dirname, suite.script);
  try {
    const output = execSync(`node "${scriptPath}"`, { encoding: 'utf8' });
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

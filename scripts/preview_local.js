// A throwaway demonstration database. Never seeds or clears the user's database.
const { spawn } = require('child_process');
const path = require('path');
const { createTestFixture, cleanTestFixture, seedTestFixture } = require('./test_fixture');
const stripeTest = process.argv.includes('--stripe-test');
let stripeConfig = {};
if (stripeTest) {
  stripeConfig = require('dotenv').parse(require('fs').readFileSync(path.resolve(__dirname, '../.env.stripe-test')));
  if (!/^sk_test_[A-Za-z0-9]{80,}$/.test(stripeConfig.STRIPE_SECRET_KEY || '')) throw new Error('La demostración solo admite una clave completa de Stripe de prueba.');
}
const fixture = createTestFixture();
seedTestFixture(fixture.env);
const billingEnv = stripeTest ? {
  NODE_ENV: 'development', DISABLE_SCHEDULER: 'true',
  STRIPE_SECRET_KEY: stripeConfig.STRIPE_SECRET_KEY,
  STRIPE_PRICE_BASICO: stripeConfig.STRIPE_PRICE_BASICO || '',
  STRIPE_PRICE_PRO: stripeConfig.STRIPE_PRICE_PRO || '',
  STRIPE_PRICE_CADENA: stripeConfig.STRIPE_PRICE_CADENA || '',
  STRIPE_PRICE_BASICO_TEST: stripeConfig.STRIPE_PRICE_BASICO_TEST || '',
  STRIPE_PRICE_PRO_TEST: stripeConfig.STRIPE_PRICE_PRO_TEST || '',
  STRIPE_PRICE_CADENA_TEST: stripeConfig.STRIPE_PRICE_CADENA_TEST || '',
  STRIPE_WEBHOOK_SECRET: stripeConfig.STRIPE_WEBHOOK_SECRET || '',
} : {};
const child = spawn(process.execPath, [path.resolve(__dirname, '../apps/api/dist/index.js')], {
  env: { ...fixture.env, ...billingEnv, NO_LISTEN: 'false', PORT: process.env.SYSTECH_DEMO_PORT || '3101', APP_URL: process.env.SYSTECH_DEMO_APP_URL || 'http://127.0.0.1:5178' }, stdio: 'inherit',
});
console.log(`Demostración aislada · API http://localhost:${process.env.SYSTECH_DEMO_PORT || '3101'} · datos ficticios`);
if (stripeTest) console.log('Stripe de prueba conectado; webhooks requieren firma y configuración de listener.');
let closing = false;
function stop() { if (!closing) { closing = true; child.kill(); } }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
child.on('exit', code => { cleanTestFixture(fixture.directory); process.exitCode = code || 0; });

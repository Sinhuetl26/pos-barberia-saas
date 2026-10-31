// Verifies an actual paid sandbox checkout, signatures, replay and event order.
// Uses only the local sandbox config and a disposable database for event-order checks.
const fs = require('fs');
const assert = require('node:assert/strict');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
async function main() {
  const config = require('dotenv').parse(fs.readFileSync('.env.stripe-test'));
  if (!/^sk_test_[A-Za-z0-9]{80,}$/.test(config.STRIPE_SECRET_KEY || '') || !config.STRIPE_WEBHOOK_SECRET) throw new Error('Configuración de prueba incompleta.');
  const Stripe = require('stripe');
  const stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16', timeout: 10000, maxNetworkRetries: 1 });
  const base = 'http://127.0.0.1:3101/api';
  const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'dueno@elbigote.com', password: 'Dueno123!' }) });
  assert.equal(login.status, 200);
  const auth = await login.json();
  const headers = { Authorization: 'Bearer ' + auth.token };
  const before = await (await fetch(base + '/suscripcion', { headers })).json();
  assert.equal(before.suscripcion.estadoPago, 'active');
  const events = await stripe.events.list({ type: 'checkout.session.completed', limit: 20 });
  const checkout = events.data.find(e => e.data.object.metadata?.tenantId === before.tenant.id);
  assert(checkout, 'No hay un checkout pagado del negocio de demostración.');
  assert.equal(checkout.livemode, false);
  assert.equal(checkout.data.object.payment_status, 'paid');
  const remote = await stripe.subscriptions.retrieve(checkout.data.object.subscription);
  const invoices = await stripe.events.list({ type: 'invoice.paid', limit: 20 });
  // Modern event snapshots may nest the subscription field; compare invoice IDs.
  const latestInvoiceId = typeof remote.latest_invoice === 'string' ? remote.latest_invoice : remote.latest_invoice.id;
  const invoice = invoices.data.find(e => e.data.object.id === latestInvoiceId);
  assert(invoice, 'No hay evento de factura pagada.');
  const payload = JSON.stringify(checkout);
  const deliver = signature => fetch(base + '/suscripcion/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(signature ? { 'stripe-signature': signature } : {}) }, body: payload });
  assert.equal((await deliver('')).status, 400);
  assert.equal((await deliver('t=1,v1=invalid')).status, 400);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: config.STRIPE_WEBHOOK_SECRET });
  const replay = await deliver(signature);
  assert.equal(replay.status, 200); assert.equal((await replay.json()).alreadyProcessed, true);
  const after = await (await fetch(base + '/suscripcion', { headers })).json();
  assert.deepEqual(after, before);
  console.log('PASS Pago confirmado por Stripe; firma ausente e inválida rechazadas; duplicado sin efectos.');
  const fixture = createTestFixture();
  Object.assign(process.env, fixture.env, config, { NODE_ENV: 'development', NO_LISTEN: 'true', DISABLE_SCHEDULER: 'true' });
  const { prisma } = require('@systech/database');
  try {
    await prisma.tenant.create({ data: { id: before.tenant.id, nombre: 'Prueba de orden de eventos', slug: 'stripe-order-test', estado: 'TRIAL', plan: 'PRO' } });
    const { StripeBillingService } = require('../apps/api/dist/services/stripe.service');
    await StripeBillingService.processWebhookEvent(invoice, prisma);
    let license = await prisma.suscripcion.findUnique({ where: { tenantId: before.tenant.id } });
    assert.equal(license.estadoPago, 'active');
    assert.equal(license.stripeSubscriptionId, remote.id);
    await StripeBillingService.processWebhookEvent(checkout, prisma);
    license = await prisma.suscripcion.findUnique({ where: { tenantId: before.tenant.id } });
    assert.equal(license.fechaProximoCobro.getTime(), remote.current_period_end * 1000);
    assert.equal((await prisma.tenant.findUnique({ where: { id: before.tenant.id } })).plan, remote.metadata.plan);
    assert.equal((await StripeBillingService.processWebhookEvent(checkout, prisma)).alreadyProcessed, true);
    assert.equal(await prisma.eventoPago.count({ where: { procesado: true } }), 2);
    console.log('PASS Factura antes de checkout: activa el plan correcto, conserva periodo real y evita duplicados.');
    fs.writeFileSync('docs/STRIPE_PRUEBA_VERIFICADA.json', JSON.stringify({ verifiedAt: new Date().toISOString(), mode: 'sandbox', plan: remote.metadata.plan, monthlyMXN: before.suscripcion.montoMensual, automaticActivation: true, missingSignatureRejected: true, invalidSignatureRejected: true, duplicateIgnored: true, invoiceBeforeCheckoutVerified: true, nextPeriodFromStripe: true }, null, 2) + '\n');
  } finally { await prisma.$disconnect(); cleanTestFixture(fixture.directory); }
}
main().catch(error => { console.error('Verificación fallida:', error.code || error.message); process.exitCode = 1; });

const assert = require('node:assert/strict');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');

async function main() {
  const fixture = createTestFixture();
  Object.assign(process.env, fixture.env);
  const { prisma } = require('@systech/database');
  const { JWT_SECRET } = require('../apps/api/dist/middleware/auth');
  const jwt = require('jsonwebtoken');
  const app = require('../apps/api/dist/index').default;
  const { StripeBillingService } = require('../apps/api/dist/services/stripe.service');
  const { EmailService } = require('../apps/api/dist/services/email.service');
  const { getIntegrationCatalog } = require('../apps/api/dist/services/integrations.service');
  const { billingAppUrl } = require('../apps/api/dist/services/billing-checkout.service');
  const { localDayBounds } = require('../apps/api/dist/utils/timezone');
  let server;
  let passed = 0;
  const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
  try {
    const a = await prisma.tenant.create({ data: { nombre: 'Barbería de prueba A', slug: 'test-a', plan: 'PRO' } });
    const b = await prisma.tenant.create({ data: { nombre: 'Barbería de prueba B', slug: 'test-b' } });
    const branch = await prisma.sucursal.create({ data: { tenantId: a.id, nombre: 'Sucursal A' } });
    const otherBranch = await prisma.sucursal.create({ data: { tenantId: b.id, nombre: 'Sucursal B' } });
    const user = await prisma.usuario.create({ data: { tenantId: a.id, nombre: 'Dueño', email: 'owner@test.invalid', rol: 'DUENO', passwordHash: 'unused' } });
    const barberUser = await prisma.usuario.create({ data: { tenantId: a.id, nombre: 'Barbero', email: 'barber@test.invalid', rol: 'BARBERO', passwordHash: 'unused' } });
    const barber = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'Barbero' } });
    const client = await prisma.clienteFinal.create({ data: { tenantId: a.id, nombre: 'Cliente' } });
    const sale = { tenantId: a.id, sucursalId: branch.id, barberoId: barber.id, clienteId: client.id, total: 250, propina: 50, metodoPago: 'EFECTIVO' };
    await prisma.venta.create({ data: sale });
    await prisma.venta.create({ data: { ...sale, total: 900, estado: 'CANCELADA' } });
    const token = u => jwt.sign({ sub: u.id, tid: u.tenantId, rol: u.rol, email: u.email }, JWT_SECRET, { algorithm: 'HS256' });
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = async (url, method = 'GET', data, bearer = token(user), extra = {}) => {
      const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...extra }, body: data ? JSON.stringify(data) : undefined });
      return { status: res.status, data: await res.json() };
    };
    await check('Dashboard rejects anonymous requests', async () => assert.equal((await request('/api/operacion/resumen?sucursalId=' + branch.id, 'GET', null, '')).status, 401));
    await check('Dashboard cannot cross tenant boundaries', async () => assert.equal((await request('/api/operacion/resumen?sucursalId=' + otherBranch.id)).status, 404));
    await check('Dashboard excludes tips and cancelled sales', async () => {
      const r = await request('/api/operacion/resumen?sucursalId=' + branch.id);
      assert.equal(r.status, 200); assert.equal(r.data.metrics.revenue, 200); assert.equal(r.data.metrics.tips, 50); assert.equal(r.data.metrics.sales, 1);
      assert.equal(r.data.hourlyRevenue.reduce((s, h) => s + h.revenue, 0), 200);
    });
    await check('Barber cannot read financial dashboard or connectors', async () => {
      assert.equal((await request('/api/operacion/resumen?sucursalId=' + branch.id, 'GET', null, token(barberUser))).status, 403);
      assert.equal((await request('/api/integraciones', 'GET', null, token(barberUser))).status, 403);
    });
    await check('Connector catalog never returns credentials and marks placeholders missing', async () => {
      const catalog = getIntegrationCatalog({ STRIPE_SECRET_KEY: 'sk_test_51...your_test_secret_key', STRIPE_WEBHOOK_SECRET: 'whsec_your_webhook_signing_secret', RESEND_API_KEY: 're_123456789_abcdefg', EMAIL_FROM: 'Studio <mail@test.invalid>' });
      assert.equal(catalog.find(c => c.id === 'stripe').status, 'missing');
      assert.equal(catalog.find(c => c.id === 'resend').status, 'missing');
      assert(!JSON.stringify(catalog).includes('sk_test_51'));
      assert.equal((await request('/api/integraciones')).status, 200);
    });
    await check('Checkout without Stripe returns a real configuration error, no invented URL', async () => {
      const r = await request('/api/suscripcion/crear-checkout-session', 'POST', { plan: 'PRO' });
      assert.equal(r.status, 503); assert(!r.data.checkoutUrl);
    });
    await check('Barber cannot open license checkout or billing portal', async () => {
      assert.equal((await request('/api/suscripcion/crear-checkout-session', 'POST', { plan: 'PRO' }, token(barberUser))).status, 403);
      assert.equal((await request('/api/suscripcion/portal-cliente', 'POST', {}, token(barberUser))).status, 403);
    });
    await check('Billing URL comes from trusted server configuration', async () => {
      process.env.APP_URL = 'https://studio.test.invalid/'; assert.equal(billingAppUrl(), 'https://studio.test.invalid');
      process.env.NODE_ENV = 'production'; process.env.APP_URL = 'http://studio.test.invalid'; assert.throws(billingAppUrl);
      process.env.APP_URL = 'https://studio.test.invalid'; process.env.NODE_ENV = 'test';
    });
    await check('Production email without a provider cannot report success', async () => {
      process.env.NODE_ENV = 'production';
      const r = await EmailService.enviarEmail({ to: 'nobody@test.invalid', subject: 'Test', html: '<p>Test</p>' });
      assert.equal(r.success, false); process.env.NODE_ENV = 'test';
    });
    await check('Unsigned Stripe payloads are rejected outside explicit test mode', async () => {
      process.env.NODE_ENV = 'staging';
      assert.throws(() => StripeBillingService.constructWebhookEvent('{}', ''));
      process.env.NODE_ENV = 'test';
    });
    const event = { id: 'evt_fixture_checkout', type: 'checkout.session.completed', data: { object: { client_reference_id: a.id, customer: 'cus_a', subscription: 'sub_a', metadata: { plan: 'PRO' } } } };
    await check('Checkout webhook commits license and event exactly once', async () => {
      assert.equal((await StripeBillingService.processWebhookEvent(event, prisma)).received, true);
      assert.equal((await StripeBillingService.processWebhookEvent(event, prisma)).alreadyProcessed, true);
      assert.equal(await prisma.auditoriaLog.count({ where: { accion: 'CHECKOUT_COMPLETADO', tenantId: a.id } }), 1);
    });
    await check('Failed webhook rolls back and a retry recovers', async () => {
      // A second merchant has its own Stripe identifiers; findFirst ordering differs across engines.
      const retry = { ...event, id: 'evt_fixture_retry', data: { object: { ...event.data.object, customer: 'cus_b', subscription: 'sub_b', client_reference_id: 'missing-tenant' } } };
      await assert.rejects(StripeBillingService.processWebhookEvent(retry, prisma));
      assert.equal(await prisma.eventoPago.count({ where: { eventId: retry.id } }), 0);
      retry.data.object.client_reference_id = b.id;
      assert.equal((await StripeBillingService.processWebhookEvent(retry, prisma)).received, true);
    });
    await check('Payment recovery clears the previous suspension deadline', async () => {
      const failed = { id: 'evt_fixture_failed', type: 'invoice.payment_failed', data: { object: { id: 'in_a', customer: 'cus_a', subscription: 'sub_a', amount_due: 99900 } } };
      await StripeBillingService.processWebhookEvent(failed, prisma);
      assert((await prisma.suscripcion.findUnique({ where: { tenantId: a.id } })).fechaSuspension);
      await StripeBillingService.processWebhookEvent({ ...failed, id: 'evt_fixture_paid', type: 'invoice.paid' }, prisma);
      assert.equal((await prisma.suscripcion.findUnique({ where: { tenantId: a.id } })).fechaSuspension, null);
    });
    await check('Unknown subscription events remain retryable', async () => {
      const unknown = { id: 'evt_unknown', type: 'invoice.paid', data: { object: { customer: 'cus_unknown', subscription: 'sub_unknown' } } };
      await assert.rejects(StripeBillingService.processWebhookEvent(unknown, prisma));
      assert.equal(await prisma.eventoPago.count({ where: { eventId: unknown.id } }), 0);
    });
    await check('Missing invoice identifiers cannot update an arbitrary account', async () => {
      const before = await prisma.tenant.findUnique({ where: { id: a.id } });
      await StripeBillingService.processWebhookEvent({ id: 'evt_empty', type: 'invoice.payment_failed', data: { object: { id: 'in_empty' } } }, prisma);
      assert.equal((await prisma.tenant.findUnique({ where: { id: a.id } })).estado, before.estado);
    });
    await check('Processing failures return HTTP 500 for provider retries', async () => {
      const r = await request('/api/suscripcion/webhook', 'POST', { ...event, id: 'evt_http_fail', data: { object: { ...event.data.object, client_reference_id: 'absent' } } }, '');
      assert.equal(r.status, 500);
    });
    await check('Cancelled licenses block operation but allow owner billing', async () => {
      await prisma.tenant.update({ where: { id: a.id }, data: { estado: 'CANCELADO' } });
      assert.equal((await request('/api/operacion/resumen?sucursalId=' + branch.id)).status, 403);
      assert.equal((await request('/api/suscripcion')).status, 200);
    });
    await check('Local day uses the branch timezone across UTC midnight', async () => {
      const day = localDayBounds(new Date('2026-10-05T03:00:00Z'), 'America/Mexico_City');
      assert.equal(day.label, '2026-10-04'); assert.equal(day.start.toISOString(), '2026-10-04T06:00:00.000Z'); assert.equal(day.end.toISOString(), '2026-10-05T06:00:00.000Z');
    });
    await check('Local day respects daylight-saving transitions', async () => {
      const spring = localDayBounds(new Date('2026-03-08T12:00:00Z'), 'America/New_York');
      const fall = localDayBounds(new Date('2026-11-01T12:00:00Z'), 'America/New_York');
      assert.equal((spring.end - spring.start) / 3600000, 23); assert.equal((fall.end - fall.start) / 3600000, 25);
    });
    console.log(`${passed} PASSED · isolated database · no external messages or charges`);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
    cleanTestFixture(fixture.directory);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

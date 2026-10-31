const assert = require('node:assert/strict');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');

async function main() {
  const fixture = createTestFixture();
  Object.assign(process.env, fixture.env);
  const { prisma } = require('@systech/database');
  const jwt = require('jsonwebtoken');
  const app = require('../apps/api/dist/index').default;
  const catalog = require('../apps/api/dist/services/license-catalog.service');
  const stripeService = require('../apps/api/dist/services/stripe.service');
  const { createLicenseCheckout } = require('../apps/api/dist/services/billing-checkout.service');
  let server, passed = 0;
  const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
  try {
    const account = async (plan, slug) => {
      const tenant = await prisma.tenant.create({ data: { nombre: slug, slug, plan, limiteBarberos: 999, limiteSucursales: 999 } });
      const branch = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Matriz' } });
      const user = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Dueño', email: `${slug}@test.invalid`, rol: 'DUENO', passwordHash: 'unused' } });
      const token = jwt.sign({ sub: user.id, tid: tenant.id, rol: user.rol, email: user.email }, fixture.env.JWT_SECRET, { algorithm: 'HS256' });
      return { tenant, branch, user, token };
    };
    const basic = await account('BASICO', 'license-basic');
    const pro = await account('PRO', 'license-pro');
    const chain = await account('CADENA', 'license-chain');
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = async (owner, path, method = 'GET', data) => {
      const res = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(owner ? { Authorization: `Bearer ${owner.token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
      return { status: res.status, data: await res.json() };
    };
    const add = (a, name, branch = a.branch) => request(a, '/barberos', 'POST', { nombre: name, sucursalId: branch.id, limiteBarberos: 999 });
    await check('Public catalog has three canonical plans and exposes no provider IDs', async () => {
      const r = await request(null, '/suscripcion/catalogo'); assert.equal(r.status, 200);
      assert.deepEqual(r.data.plans.map(p => [p.code, p.monthlyBaseMxn, p.branchLimit, p.barbersPerBranch]), [['BASICO', 499, 1, 3], ['PRO', 999, 1, 8], ['CADENA', 2699, 3, 8]]);
      assert(!JSON.stringify(r.data).includes('price_')); assert(r.data.plans.every(p => p.quote.policy === 'PENDIENTE'));
    });
    await check('Esencial keeps the daily operation while Pro capabilities are explicit and API-enforced', async () => {
      const publicCatalog = (await request(null, '/suscripcion/catalogo')).data.plans;
      const essential = publicCatalog.find(p => p.code === 'BASICO'), professional = publicCatalog.find(p => p.code === 'PRO');
      for (const capability of ['CORE_OPERATIONS', 'BASIC_REPORTS', 'DATA_EXPORT', 'BARBER_ACCESS', 'PUBLIC_BOOKING']) assert(essential.capabilities.includes(capability));
      for (const capability of ['STAFF_ROLES', 'ADVANCED_REPORTS', 'AUDIT_TRAIL', 'DISCOUNT_APPROVALS', 'PROFESSIONAL_PRICING', 'COMMISSION_SETTLEMENTS']) {
        assert(!essential.capabilities.includes(capability)); assert(professional.capabilities.includes(capability));
      }
      const basicReport = await request(basic, `/reportes/dashboard?periodo=mes&sucursalId=${basic.branch.id}`); assert.equal(basicReport.status, 200);
      const basicPolicy = await request(basic, `/inventario/politica-descuentos?sucursalId=${basic.branch.id}`); assert.equal(basicPolicy.status, 200);
      const advancedPolicy = await request(basic, '/inventario/politica-descuentos', 'POST', { sucursalId: basic.branch.id, activa: true }); assert.equal(advancedPolicy.status, 403); assert.equal(advancedPolicy.data.code, 'PLAN_UPGRADE_REQUIRED');
      const auditBlocked = await request(basic, '/operacion/auditoria'); assert.equal(auditBlocked.status, 403); assert.equal(auditBlocked.data.code, 'PLAN_UPGRADE_REQUIRED');
      const auditAllowed = await request(pro, '/operacion/auditoria'); assert.equal(auditAllowed.status, 200);
      const managerBlocked = await request(basic, '/usuarios', 'POST', { nombre: 'Gerente básico', email: 'manager-basic@test.invalid', rol: 'GERENTE', branchIds: [basic.branch.id], activo: true }); assert.equal(managerBlocked.status, 403); assert.equal(managerBlocked.data.code, 'PLAN_UPGRADE_REQUIRED');
    });
    await check('A price alone never advertises a usable checkout; readiness is plan-specific and secret-free', async () => {
      const { licenseCheckoutReadiness, publicAppOrigin } = require('../apps/api/dist/services/provider-config.service');
      const { getIntegrationCatalog } = require('../apps/api/dist/services/integrations.service');
      const env = { NODE_ENV: 'test', APP_URL: 'http://127.0.0.1:5179', STRIPE_PRICE_BASICO_TEST: 'price_fixture_basic' };
      assert.equal(licenseCheckoutReadiness('BASICO', env).ready, false);
      Object.assign(env, { STRIPE_SECRET_KEY: 'sk_test_controlled', STRIPE_WEBHOOK_SECRET: 'whsec_controlled' });
      assert.equal(licenseCheckoutReadiness('BASICO', env).ready, true); assert.equal(licenseCheckoutReadiness('PRO', env).ready, false);
      assert.equal(getIntegrationCatalog(env).find(c => c.id === 'stripe').status, 'missing');
      Object.assign(env, { STRIPE_PRICE_PRO_TEST: 'price_fixture_pro', STRIPE_PRICE_CADENA_TEST: 'price_fixture_chain' });
      const connectors = getIntegrationCatalog(env); assert.equal(connectors.find(c => c.id === 'stripe').status, 'sandbox');
      const publicJson = JSON.stringify(connectors); for (const secret of [env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET, env.STRIPE_PRICE_PRO_TEST]) assert(!publicJson.includes(secret));
      assert.equal(publicAppOrigin({ NODE_ENV: 'test', FRONTEND_URL: 'http://localhost:5180/reservas' }), 'http://localhost:5180');
      assert.throws(() => publicAppOrigin({ NODE_ENV: 'production' }));
      for (const url of ['http://remote.invalid', 'https://name:password@host.invalid', 'file:///bad']) assert.equal(licenseCheckoutReadiness('BASICO', { ...env, APP_URL: url }).ready, false);
      assert.equal(licenseCheckoutReadiness('BASICO', { ...env, STRIPE_SECRET_KEY: 'sk_live_controlled' }).ready, false);
    });
    await check('Production readiness requires live mapping, safe domain and fiscal configuration together', async () => {
      const { licenseCheckoutReadiness } = require('../apps/api/dist/services/provider-config.service');
      const env = { NODE_ENV: 'production', APP_URL: 'https://studio.fixture.invalid', STRIPE_SECRET_KEY: 'sk_live_controlled', STRIPE_WEBHOOK_SECRET: 'whsec_controlled', STRIPE_PRICE_PRO_TEST: 'price_test', LICENSE_TAX_POLICY: 'IVA_INCLUIDO', LICENSE_FISCAL_REVIEWED: 'true' };
      assert.equal(licenseCheckoutReadiness('PRO', env).ready, false);
      env.STRIPE_PRICE_PRO_LIVE = 'price_live'; assert.equal(licenseCheckoutReadiness('PRO', env).ready, true);
      for (const change of [{ STRIPE_SECRET_KEY: 'sk_test_controlled' }, { APP_URL: 'http://studio.fixture.invalid' }, { LICENSE_FISCAL_REVIEWED: 'false' }, { LICENSE_TAX_POLICY: 'PENDIENTE' }, { STRIPE_PRICE_PRO_LIVE: 'price_your_value' }]) assert.equal(licenseCheckoutReadiness('PRO', { ...env, ...change }).ready, false);
    });
    await check('Tax quotes round in cents and invalid policy fails closed', async () => {
      process.env.LICENSE_TAX_POLICY = 'MAS_IVA_16'; assert.equal(catalog.licenseQuote('BASICO').totalCents, 57884); assert.equal(catalog.licenseQuote('PRO').totalCents, 115884);
      process.env.LICENSE_TAX_POLICY = 'IVA_INCLUIDO'; assert.equal(catalog.licenseQuote('BASICO').totalCents, 49900); assert.equal(catalog.licenseQuote('BASICO').taxMxn, 68.83); assert.equal(catalog.licenseQuote('BASICO').netMxn, 430.17);
      process.env.LICENSE_TAX_POLICY = 'INVALID'; assert.equal((await request(null, '/suscripcion/catalogo')).status, 503);
      process.env.LICENSE_TAX_POLICY = 'PENDIENTE';
    });
    await check('Sandbox aliases cannot provide production prices', async () => {
      process.env.STRIPE_PRICE_BASICO = 'price_legacy_test'; assert.equal(catalog.configuredLicensePrice('BASICO'), 'price_legacy_test');
      process.env.STRIPE_PRICE_BASICO_TEST = 'price_explicit_test'; assert.equal(catalog.configuredLicensePrice('BASICO'), 'price_explicit_test');
      process.env.NODE_ENV = 'production'; assert.equal(catalog.configuredLicensePrice('BASICO'), '');
      process.env.STRIPE_PRICE_BASICO_LIVE = 'price_explicit_live'; assert.equal(catalog.configuredLicensePrice('BASICO'), 'price_explicit_live');
      process.env.NODE_ENV = 'test'; process.env.STRIPE_PRICE_BASICO = ''; process.env.STRIPE_PRICE_BASICO_TEST = ''; process.env.STRIPE_PRICE_BASICO_LIVE = '';
    });
    await check('Unknown plans cannot register, change plan or open checkout', async () => {
      assert.equal((await request(null, '/auth/register', 'POST', { nombreBarberia: 'Invalid Plan', nombreDueno: 'Dueño', email: 'invalid@test.invalid', password: 'TestPass12345!', plan: 'ENTERPRISE' })).status, 400);
      assert.equal((await request(basic, '/suscripcion/cambiar-plan', 'POST', { nuevoPlan: 'ENTERPRISE' })).status, 400);
      assert.equal((await request(basic, '/suscripcion/crear-checkout-session', 'POST', { plan: 'ENTERPRISE' })).status, 400);
      assert.equal(await prisma.tenant.count(), 3);
    });
    await check('Chain registration ignores injected capacity and uses catalog values', async () => {
      const r = await request(null, '/auth/register', 'POST', { nombreBarberia: 'Registered Chain', nombreDueno: 'Dueño', email: 'registered@test.invalid', password: 'TestPass12345!', plan: 'CADENA', limiteSucursales: 999, limiteBarberos: 999 });
      assert.equal(r.status, 200);
      const t = await prisma.tenant.findUnique({ where: { slug: 'registered-chain' } }); assert.equal(t.limiteSucursales, 3); assert.equal(t.limiteBarberos, 8);
      assert.equal(Number((await prisma.suscripcion.findUnique({ where: { tenantId: t.id } })).montoMensual), 2699);
    });
    let original;
    await check('Esencial rejects fourth active barber even with stored limit 999', async () => {
      for (let i = 0; i < 3; i++) { const r = await add(basic, `Basic ${i}`); assert.equal(r.status, 200); if (i === 0) original = r.data; }
      const r = await add(basic, 'Excess'); assert.equal(r.status, 403); assert.equal(r.data.code, 'PLAN_LIMIT_REACHED');
    });
    await check('Inactive staff frees capacity and failed reactivation preserves identity', async () => {
      assert.equal((await request(basic, `/barberos/${original.id}`, 'PUT', { activo: false })).status, 200);
      assert.equal((await add(basic, 'Replacement')).status, 200);
      assert.equal((await request(basic, `/barberos/${original.id}`, 'PUT', { activo: true })).status, 403);
      assert.equal((await prisma.barbero.findUnique({ where: { id: original.id } })).activo, false);
    });
    await check('Soft-deleted staff cannot bypass capacity through restore', async () => {
      const archived = await prisma.barbero.create({ data: { sucursalId: basic.branch.id, nombre: 'Archived', activo: false, eliminadoEn: new Date() } });
      assert.equal((await request(basic, `/barberos/${archived.id}/restaurar`, 'POST', {})).status, 403);
      assert((await prisma.barbero.findUnique({ where: { id: archived.id } })).eliminadoEn);
      const active = await prisma.barbero.findFirst({ where: { sucursalId: basic.branch.id, activo: true } });
      await request(basic, `/barberos/${active.id}`, 'PUT', { activo: false });
      assert.equal((await request(basic, `/barberos/${archived.id}/restaurar`, 'POST', {})).status, 200);
      assert.equal((await request(basic, `/barberos/${archived.id}/restaurar`, 'POST', {})).status, 200);
    });
    await check('Direct API and bulk payloads cannot bypass capacity or tenant ownership', async () => {
      assert.equal((await request(basic, '/barberos', 'POST', [{ nombre: 'Bulk', sucursalId: basic.branch.id }])).status, 400);
      assert.equal((await add(basic, 'Other tenant', pro.branch)).status, 404);
      const other = await prisma.barbero.create({ data: { sucursalId: pro.branch.id, nombre: 'Other' } });
      assert.equal((await request(basic, `/barberos/${other.id}/restaurar`, 'POST', {})).status, 404);
      assert.equal((await request(basic, `/barberos/${other.id}`, 'PUT', { activo: false })).status, 404);
      assert.equal((await request(null, '/barberos', 'POST', { nombre: 'Anon', sucursalId: basic.branch.id })).status, 401);
    });
    await check('Pro allows eight per branch and rejects ninth', async () => {
      for (let i = 1; i < 8; i++) assert.equal((await add(pro, `Pro ${i}`)).status, 200);
      assert.equal((await add(pro, 'Ninth')).status, 403);
      assert.equal((await request(pro, '/sucursales', 'POST', { nombre: 'Second' })).status, 403);
    });
    await check('Downgrade rejects excess without deleting staff or changing plan', async () => {
      const before = await prisma.barbero.count({ where: { sucursalId: pro.branch.id } });
      const r = await request(pro, '/suscripcion/cambiar-plan', 'POST', { nuevoPlan: 'BASICO' }); assert.equal(r.status, 409); assert.equal(r.data.code, 'PLAN_CAPACITY_CONFLICT');
      assert.equal((await prisma.tenant.findUnique({ where: { id: pro.tenant.id } })).plan, 'PRO'); assert.equal(await prisma.barbero.count({ where: { sucursalId: pro.branch.id } }), before);
    });
    await check('Resolved downgrade preserves inactive records and audits canonical capacity', async () => {
      const staff = await prisma.barbero.findMany({ where: { sucursalId: pro.branch.id } });
      for (const b of staff.slice(3)) await request(pro, `/barberos/${b.id}`, 'PUT', { activo: false });
      const r = await request(pro, '/suscripcion/cambiar-plan', 'POST', { nuevoPlan: 'BASICO' }); assert.equal(r.status, 200); assert.equal(r.data.tenant.limiteBarberos, 3);
      assert.equal(await prisma.barbero.count({ where: { sucursalId: pro.branch.id } }), 8); assert.equal(await prisma.auditoriaLog.count({ where: { tenantId: pro.tenant.id, accion: 'CAMBIO_PLAN_BASICO' } }), 1);
    });
    let second;
    await check('Chain capacity is independent for each branch', async () => {
      const r = await request(chain, '/sucursales', 'POST', { nombre: 'Second' }); assert.equal(r.status, 200); second = r.data;
      for (const b of [chain.branch, second]) for (let i = 0; i < 8; i++) assert.equal((await add(chain, `Chain ${i}`, b)).status, 200);
      assert.equal((await add(chain, 'Excess', second)).status, 403);
      assert.equal((await request(chain, '/suscripcion/cambiar-plan', 'POST', { nuevoPlan: 'PRO' })).status, 409);
    });
    await check('Two simultaneous branch creations cannot take the same final slot', async () => {
      const results = await Promise.all(['Third A', 'Third B'].map(nombre => request(chain, '/sucursales', 'POST', { nombre })));
      assert.deepEqual(results.map(r => r.status).sort(), [200, 403]); assert.equal(await prisma.sucursal.count({ where: { tenantId: chain.tenant.id, eliminadoEn: null } }), 3);
    });
    await check('Archived branch restore respects tenant and branch capacity', async () => {
      const branch = await prisma.sucursal.create({ data: { tenantId: chain.tenant.id, nombre: 'Archived', eliminadoEn: new Date() } });
      assert.equal((await request(chain, `/sucursales/${branch.id}/restaurar`, 'POST', {})).status, 403);
      assert.equal((await request(basic, `/sucursales/${branch.id}/restaurar`, 'POST', {})).status, 404);
      assert((await prisma.sucursal.findUnique({ where: { id: branch.id } })).eliminadoEn);
    });
    await check('Two simultaneous barber creations cannot exceed the final slot', async () => {
      const race = await account('BASICO', 'license-race');
      for (let i = 0; i < 2; i++) await add(race, `Existing ${i}`);
      const results = await Promise.all(['Last A', 'Last B'].map(name => add(race, name)));
      assert.deepEqual(results.map(r => r.status).sort(), [200, 403]); assert.equal(await prisma.barbero.count({ where: { sucursalId: race.branch.id, activo: true } }), 3);
    });
    await check('Linked-user conflict rolls back barber creation and slot consumption', async () => {
      const rollback = await account('BASICO', 'license-rollback');
      const r = await request(rollback, '/barberos', 'POST', { nombre: 'Duplicate email', sucursalId: rollback.branch.id, crearAcceso: true, email: basic.user.email, password: 'TestPass12345!' });
      assert.equal(r.status, 409); assert.equal(await prisma.barbero.count({ where: { sucursalId: rollback.branch.id } }), 0);
    });
    await check('Branch restore rejects excessive active staff, then succeeds without erasing history', async () => {
      const a = await account('CADENA', 'license-restore');
      const archived = await prisma.sucursal.create({ data: { tenantId: a.tenant.id, nombre: 'Archived', eliminadoEn: new Date() } });
      for (let i = 0; i < 9; i++) await prisma.barbero.create({ data: { sucursalId: archived.id, nombre: `Staff ${i}` } });
      assert.equal((await request(a, `/sucursales/${archived.id}/restaurar`, 'POST', {})).status, 409);
      const staff = await prisma.barbero.findFirst({ where: { sucursalId: archived.id } });
      await prisma.barbero.update({ where: { id: staff.id }, data: { activo: false } });
      assert.equal((await request(a, `/sucursales/${archived.id}/restaurar`, 'POST', {})).status, 200);
      assert.equal((await request(a, `/sucursales/${archived.id}/restaurar`, 'POST', {})).status, 200);
      assert.equal(await prisma.barbero.count({ where: { sucursalId: archived.id } }), 9);
    });
    await check('Administrator cannot bypass downgrade capacity or accept unknown plans', async () => {
      const admin = await account('PRO', 'license-admin');
      await prisma.usuario.update({ where: { id: admin.user.id }, data: { rol: 'SUPER_ADMIN' } });
      admin.token = jwt.sign({ sub: admin.user.id, tid: admin.tenant.id, rol: 'SUPER_ADMIN', email: admin.user.email }, fixture.env.JWT_SECRET, { algorithm: 'HS256' });
      assert.equal((await request(basic, `/admin/tenants/${chain.tenant.id}/plan`, 'PUT', { plan: 'PRO' })).status, 403);
      assert.equal((await request(admin, `/admin/tenants/${chain.tenant.id}/plan`, 'PUT', { plan: 'UNKNOWN' })).status, 400);
      assert.equal((await request(admin, `/admin/tenants/${chain.tenant.id}/plan`, 'PUT', { plan: 'PRO' })).status, 409);
      assert.equal((await prisma.tenant.findUnique({ where: { id: chain.tenant.id } })).plan, 'CADENA');
    });
    await check('Existing excessive data is preserved and reported, with further growth rejected', async () => {
      await prisma.barbero.create({ data: { sucursalId: basic.branch.id, nombre: 'Legacy Excess' } });
      const r = await request(basic, '/suscripcion'); assert.equal(r.status, 200); assert.equal(r.data.tenant.limiteBarberos, 3); assert.equal(r.data.capacidad.exceedsCapacity, true);
      assert.equal((await add(basic, 'More excess')).status, 403); assert.equal(await prisma.barbero.count({ where: { sucursalId: basic.branch.id, activo: true, eliminadoEn: null } }), 4);
    });
    await check('Chain checkout webhook applies canonical limits, never injected metadata capacity', async () => {
      const dbPlan = await prisma.plan.create({ data: { codigo: 'CADENA', nombre: 'Cadena', precioMensual: 2699, limiteSucursales: 999, limiteBarberos: 999 } });
      const event = { id: 'evt_catalog_chain', type: 'checkout.session.completed', data: { object: { client_reference_id: chain.tenant.id, customer: 'cus_chain', subscription: 'sub_chain', metadata: { plan: 'CADENA', limiteBarberos: '999' } } } };
      await stripeService.StripeBillingService.processWebhookEvent(event, prisma);
      const t = await prisma.tenant.findUnique({ where: { id: chain.tenant.id } }); assert.equal(t.limiteSucursales, 3); assert.equal(t.limiteBarberos, 8); assert.equal(t.planId, dbPlan.id);
      await assert.rejects(stripeService.StripeBillingService.processWebhookEvent({ ...event, id: 'evt_invalid_plan', data: { object: { ...event.data.object, metadata: { plan: 'INVALID' } } } }, prisma));
      assert.equal(await prisma.eventoPago.count({ where: { eventId: 'evt_invalid_plan' } }), 0);
    });
    // A controlled provider double: these checks never contact Stripe or charge cards.
    let created = 0, remotePrice = { active: true, currency: 'mxn', unit_amount: 99900, recurring: { interval: 'month', interval_count: 1 } }, received;
    stripeService.stripe = { prices: { retrieve: async () => remotePrice }, checkout: { sessions: { create: async input => { created++; received = input; return { url: 'https://checkout.test.invalid/session' }; } } } };
    const checkout = await account('PRO', 'license-checkout');
    await check('Missing configured price cannot invent a checkout', async () => {
      await assert.rejects(createLicenseCheckout(checkout.tenant.id, 'PRO'), e => e.status === 503 && e.code === 'LICENSE_PRICE_NOT_CONFIGURED'); assert.equal(created, 0);
    });
    await check('Checkout rejects provider amount, currency, interval and inactive mismatches', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_controlled'; process.env.STRIPE_WEBHOOK_SECRET = 'whsec_controlled';
      process.env.STRIPE_PRICE_PRO_TEST = 'price_controlled_test'; const valid = { ...remotePrice };
      for (const change of [{ unit_amount: 100 }, { currency: 'usd' }, { active: false }, { recurring: { interval: 'year', interval_count: 1 } }]) {
        remotePrice = { ...valid, ...change }; await assert.rejects(createLicenseCheckout(checkout.tenant.id, 'PRO'), e => e.status === 503);
      }
      remotePrice = valid; assert.equal(created, 0);
    });
    await check('Checkout refuses missing webhook or a live key in test mode before contacting the provider', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = '';
      await assert.rejects(createLicenseCheckout(checkout.tenant.id, 'PRO'), e => e.code === 'LICENSE_CONNECTION_NOT_READY');
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_controlled'; process.env.STRIPE_SECRET_KEY = 'sk_live_controlled';
      await assert.rejects(createLicenseCheckout(checkout.tenant.id, 'PRO'), e => e.code === 'LICENSE_CONNECTION_NOT_READY');
      assert.equal(created, 0); process.env.STRIPE_SECRET_KEY = 'sk_test_controlled';
    });
    await check('Checkout metadata and price refer to the same catalog and quoted total', async () => {
      const r = await createLicenseCheckout(checkout.tenant.id, 'PRO'); assert.equal(r.precioFinal, 999); assert.equal(received.line_items[0].price, 'price_controlled_test'); assert.equal(received.metadata.plan, 'PRO'); assert.equal(received.metadata.catalogVersion, catalog.licenseCatalogVersion); assert.equal(received.metadata.taxPolicy, 'PENDIENTE');
      process.env.LICENSE_TAX_POLICY = 'MAS_IVA_16'; await assert.rejects(createLicenseCheckout(checkout.tenant.id, 'PRO'), e => e.status === 503); assert.equal(created, 1); process.env.LICENSE_TAX_POLICY = 'PENDIENTE';
    });
    await check('Live billing is gated by live key and fiscal review', async () => {
      process.env.NODE_ENV = 'production'; process.env.STRIPE_SECRET_KEY = 'sk_test_controlled';
      await assert.rejects(createLicenseCheckout(checkout.tenant.id, 'PRO'), e => e.code === 'LIVE_BILLING_NOT_READY');
      process.env.STRIPE_SECRET_KEY = 'sk_live_controlled'; await assert.rejects(createLicenseCheckout(checkout.tenant.id, 'PRO'), e => e.code === 'LIVE_BILLING_NOT_READY');
      process.env.LICENSE_TAX_POLICY = 'IVA_INCLUIDO'; await assert.rejects(createLicenseCheckout(checkout.tenant.id, 'PRO'), e => e.code === 'LIVE_BILLING_NOT_READY');
      process.env.NODE_ENV = 'test'; process.env.STRIPE_SECRET_KEY = ''; process.env.LICENSE_TAX_POLICY = 'PENDIENTE'; assert.equal(created, 1);
    });
    await check('Local production edits cannot override an active Stripe subscription', async () => {
      await prisma.suscripcion.create({ data: { tenantId: checkout.tenant.id, estadoPago: 'active', stripeSubscriptionId: 'sub_controlled' } });
      process.env.NODE_ENV = 'production';
      await assert.rejects(catalog.changeLocalLicense(checkout.tenant.id, 'BASICO', checkout.user.email), e => e.code === 'STRIPE_PLAN_MANAGED');
      assert.equal((await prisma.tenant.findUnique({ where: { id: checkout.tenant.id } })).plan, 'PRO'); process.env.NODE_ENV = 'test';
    });
    await check('Unverified production promotions cannot create recurring charges', async () => {
      process.env.NODE_ENV = 'production'; process.env.STRIPE_SECRET_KEY = 'sk_live_controlled'; process.env.LICENSE_TAX_POLICY = 'IVA_INCLUIDO'; process.env.LICENSE_FISCAL_REVIEWED = 'true';
      await assert.rejects(createLicenseCheckout(checkout.tenant.id, 'PRO', 'FUNDADOR'), e => e.code === 'LICENSE_PROMOTIONS_NOT_READY'); assert.equal(created, 1);
      process.env.NODE_ENV = 'test'; process.env.STRIPE_SECRET_KEY = ''; process.env.LICENSE_TAX_POLICY = 'PENDIENTE'; process.env.LICENSE_FISCAL_REVIEWED = 'false';
    });
    console.log(`\n${passed} license catalog checks passed in an isolated ${process.env.SYSTECH_TEST_PG_URL ? 'PostgreSQL' : 'SQLite'} database. Stripe checks use a controlled double; live certification is separate.`);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect(); cleanTestFixture(fixture.directory);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

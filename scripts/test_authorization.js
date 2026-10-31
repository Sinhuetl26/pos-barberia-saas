const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');

async function main() {
  const fixture = createTestFixture(); Object.assign(process.env, fixture.env);
  const { prisma } = require('@systech/database');
  const jwt = require('jsonwebtoken');
  const bcrypt = require('bcryptjs');
  const { JWT_SECRET } = require('../apps/api/dist/middleware/auth');
  const { routePolicy, matchPolicy, requestAccess } = require('../apps/api/dist/services/authorization.service');
  const app = require('../apps/api/dist/index').default;
  let server, passed = 0;
  const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
  try {
    const a = await prisma.tenant.create({ data: { nombre: 'Authorization A', slug: 'auth-a', plan: 'CADENA' } });
    const b = await prisma.tenant.create({ data: { nombre: 'Authorization B', slug: 'auth-b', plan: 'CADENA' } });
    const branch = async (tenant, nombre) => prisma.sucursal.create({ data: { tenantId: tenant.id, nombre } });
    const [a1, a2, b1, b2] = await Promise.all([branch(a, 'A1'), branch(a, 'A2'), branch(b, 'B1'), branch(b, 'B2')]);
    const barber = async (branch, nombre) => prisma.barbero.create({ data: { sucursalId: branch.id, nombre } });
    const [ab1, ab2, abPeer, bb1, bb2] = await Promise.all([barber(a1, 'A1 barber'), barber(a2, 'A2 barber'), barber(a1, 'A1 colleague'), barber(b1, 'B1 barber'), barber(b2, 'B2 barber')]);
    const passwordHash = await bcrypt.hash('Authorization123!', 12);
    const user = async (tenant, rol, email, extra = {}) => prisma.usuario.create({ data: { tenantId: tenant.id, nombre: rol, email, passwordHash, rol, ...extra } });
    const [owner, otherOwner, manager, cashier, barberUser, platform, unassigned] = await Promise.all([
      user(a, 'DUENO', 'a-owner@test.invalid'), user(b, 'DUENO', 'b-owner@test.invalid'),
      user(a, 'GERENTE', 'manager@test.invalid', { sucursalId: a1.id }), user(a, 'CAJERO', 'cashier@test.invalid', { sucursalId: a1.id }),
      user(a, 'BARBERO', 'barber-account@test.invalid', { sucursalId: a1.id, barberoId: ab1.id }),
      user(a, 'SUPER_ADMIN', 'platform@test.invalid'), user(a, 'GERENTE', 'unassigned@test.invalid')
    ]);
    const client = await prisma.clienteFinal.create({ data: { tenantId: a.id, nombre: 'Shared client', sucursalOrigenId: a1.id, gastoTotal: 99123, totalVisitas: 88, noShows: 5 } });
    const a2client = await prisma.clienteFinal.create({ data: { tenantId: a.id, nombre: 'A2 exclusive', sucursalOrigenId: a2.id } });
    const bclient = await prisma.clienteFinal.create({ data: { tenantId: b.id, nombre: 'B private', sucursalOrigenId: b1.id } });
    const product = async (tenant, branch, nombre) => prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch?.id, nombre, tipo: 'SERVICIO', precioVenta: 100, costo: 15 } });
    const [pa1, pa2, pb1, common] = await Promise.all([product(a, a1, 'A1 service'), product(a, a2, 'A2 service'), product(b, b1, 'B1 service'), product(a, null, 'Common service')]);
    const sale = async (tenant, branch, barber, client, total) => prisma.venta.create({ data: { tenantId: tenant.id, sucursalId: branch.id, barberoId: barber.id, clienteId: client.id, total, metodoPago: 'EFECTIVO', items: { create: { productoId: tenant.id === a.id ? common.id : pb1.id, nombreItem: branch.nombre, tipoItem: 'SERVICIO', cantidad: 1, precioUnitario: total, subtotal: total } }, comisiones: { create: { tenantId: tenant.id, barberoId: barber.id, monto: total / 2, porcentaje: 50 } } } });
    const [va1, va2, vaPeer, vb1] = await Promise.all([sale(a, a1, ab1, client, 100), sale(a, a2, ab2, client, 900), sale(a, a1, abPeer, client, 200), sale(b, b1, bb1, bclient, 8000)]);
    const appointment = async (tenant, branch, barber, client, suffix) => prisma.cita.create({ data: { tenantId: tenant.id, sucursalId: branch.id, barberoId: barber.id, clienteId: client.id, fechaHora: new Date(Date.now() + 86400000), codigoReserva: `RES-${suffix}`, tokenCancelacion: suffix.repeat(64).slice(0, 64) } });
    const [ca1, ca2, caPeer, cb1] = await Promise.all([appointment(a, a1, ab1, client, 'a1'), appointment(a, a2, ab2, client, 'a2'), appointment(a, a1, abPeer, client, 'ap'), appointment(b, b1, bb1, bclient, 'b1')]);
    const shift = async (tenant, branch, owner) => prisma.corteCaja.create({ data: { tenantId: tenant.id, sucursalId: branch.id, usuarioId: owner.id, fondoInicial: 100 } });
    const [qa1, qa2, qb1] = await Promise.all([shift(a, a1, owner), shift(a, a2, owner), shift(b, b1, otherOwner)]);
    const token = u => jwt.sign({ sub: u.id, tid: u.tenantId, rol: u.rol, email: 'forged-claim@test.invalid', sv: u.sessionVersion ?? 0 }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (u, url, method = 'GET', data, extra = {}) => {
      if (u && typeof u !== 'string') u = { ...u, sessionVersion: (await prisma.usuario.findUnique({ where: { id: u.id } }))?.sessionVersion ?? 0 };
      const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(u ? { Authorization: `Bearer ${typeof u === 'string' ? u : token(u)}` } : {}), ...extra }, body: data !== undefined ? JSON.stringify(data) : undefined });
      const raw = await response.text(); let body; try { body = JSON.parse(raw); } catch { body = raw; }
      return { status: response.status, body, headers: response.headers };
    };
    await check('Web settings route saves the owners business and rejects staff and forged tenant IDs', async () => {
      const apiSource = fs.readFileSync(path.join(__dirname, '../apps/web/src/api.ts'), 'utf8');
      const settingsMethod = apiSource.split('updateTenantSettings(data:')[1]?.split('async printCorteHtml')[0];
      const settingsPath = settingsMethod?.match(/this\.request<any>\('([^']+)'/)?.[1];
      assert(settingsPath, 'The client must expose its settings endpoint');
      const result = await request(owner, settingsPath, 'PUT', { slogan: 'Settings contract fixture', tenantId: b.id });
      assert.equal(result.status, 200); assert.equal(result.body.id, a.id);
      assert.equal((await prisma.tenant.findUnique({ where: { id: a.id } })).slogan, 'Settings contract fixture');
      assert.equal((await prisma.tenant.findUnique({ where: { id: b.id } })).slogan, null);
      for (const account of [manager, cashier, barberUser]) assert.equal((await request(account, settingsPath, 'PUT', { slogan: 'Forbidden' })).status, 403);
      assert.equal((await prisma.tenant.findUnique({ where: { id: a.id } })).slogan, 'Settings contract fixture');
    });
    await check('Manager login returns only assigned branches; claims cannot impersonate another email', async () => {
      const login = await request(null, '/auth/login', 'POST', { email: manager.email, password: 'Authorization123!' });
      assert.equal(login.status, 200); assert.deepEqual(login.body.sucursales.map(s => s.id), [a1.id]);
      assert.equal((await request(manager, '/auth/me')).body.user.email, manager.email);
    });
    await check('Owner sees own two branches, manager and cashier one, barber only linked profile', async () => {
      assert.equal((await request(owner, '/sucursales')).body.length, 2);
      for (const u of [manager, cashier, barberUser]) assert.deepEqual((await request(u, '/sucursales')).body.map(s => s.id), [a1.id]);
      assert.deepEqual((await request(barberUser, '/barberos')).body.map(s => s.id), [ab1.id]);
    });
    await check('All authenticated routes fail closed for roles outside their grant, including files and global jobs', async () => {
      let denied = 0;
      for (const u of [owner, manager, cashier, barberUser, platform]) for (const policy of routePolicy) {
        if (policy.roles.includes(u.rol)) continue;
        const url = policy.path.replace(':id', va1.id);
        assert.equal((await request(u, url, policy.method, policy.method === 'GET' ? undefined : {})).status, 403, `${u.rol} ${policy.method} ${url}`); denied++;
      }
      assert(denied > 150);
    });
    await check('Cross-tenant and cross-branch ticket, print-token and cash receipt IDs reveal nothing', async () => {
      for (const [u, v, q] of [[manager, va2, qa2], [manager, vb1, qb1], [otherOwner, va1, qa1], [barberUser, vaPeer, qa1]]) {
        for (const [url, method] of [[`/ventas/${v.id}/ticket`, 'GET'], [`/ventas/${v.id}/ticket-html`, 'GET'], [`/ventas/${v.id}/print-token`, 'POST']]) assert.equal((await request(u, url, method, method === 'POST' ? {} : undefined)).status, 404);
        const expected = u.rol === 'BARBERO' ? 403 : 404;
        assert.equal((await request(u, `/cortes-caja/${q.id}/comprobante-html`)).status, expected);
        assert.equal((await request(u, `/cortes-caja/${q.id}/print-token`, 'POST', {})).status, expected);
      }
    });
    await check('Branch filters apply without a query, with forged headers, and to CSV and aggregates', async () => {
      const sales = await request(manager, '/ventas', 'GET', undefined, { 'x-tenant-id': b.id, 'x-user-role': 'DUENO' });
      assert.deepEqual(new Set(sales.body.map(s => s.id)), new Set([va1.id, vaPeer.id]));
      assert.equal((await request(manager, `/ventas?sucursalId=${a2.id}`)).status, 404);
      assert.equal((await request(manager, `/ventas?sucursalId[]=${a2.id}`)).status, 400);
      const report = await request(manager, '/reportes/dashboard'); assert.equal(report.status, 200); assert.equal(report.body.totalVentas, 300); assert.equal(report.body.comisiones.pendientes, 150);
      const csv = await request(manager, '/reportes/exportar/ventas-csv'); assert.equal(csv.status, 200); assert(!csv.body.includes('A2') && !csv.body.includes('B1')); assert(csv.body.includes('A1'));
      const ownSales = await request(barberUser, '/ventas'); assert.deepEqual(ownSales.body.map(s => s.id), [va1.id]);
    });
    await check('CRM nested histories are scoped; global customer spending and visits do not leak', async () => {
      const profile = await request(manager, `/clientes/${client.id}`); assert.equal(profile.status, 200);
      assert(profile.body.cliente.ventas.every(v => v.sucursalId === a1.id)); assert(profile.body.cliente.citas.every(c => c.sucursalId === a1.id));
      assert.equal(profile.body.gastoTotal, undefined); assert.equal(profile.body.cliente.gastoTotal, undefined); assert.equal(profile.body.metricas.gastoTotal, undefined);
      assert.equal((await request(manager, `/clientes/${a2client.id}`)).status, 404); assert.equal((await request(manager, `/clientes/${bclient.id}`)).status, 404);
      const products = await request(cashier, '/productos'); assert.equal(products.status, 200); assert(products.body.every(p => p.id !== pa2.id && p.costo === undefined));
      const staff = await request(cashier, '/barberos'); assert(staff.body.every(p => p.comisiones === undefined && p.comisionServiciosPct === undefined));
    });
    await check('Foreign writes and mixed commission batches leave both businesses unchanged', async () => {
      const count = await prisma.cita.count();
      for (const target of [a2, b1]) {
        assert.equal((await request(manager, '/citas/walk-in', 'POST', { sucursalId: target.id, barberoId: target.id === a2.id ? ab2.id : bb1.id, clienteNombre: 'Injected' })).status, 404);
        assert.equal((await request(manager, `/sucursales/${target.id}`, 'PUT', { nombre: 'Injected' })).status, 404);
      }
      assert.equal((await request(manager, `/citas/${ca2.id}/status`, 'PUT', { estado: 'CANCELADA' })).status, 404);
      assert.equal((await request(barberUser, `/citas/${caPeer.id}/status`, 'PUT', { estado: 'CANCELADA' })).status, 404);
      assert.equal((await request(manager, `/ventas/${va2.id}/cancelar`, 'POST', { motivo: 'Injected' })).status, 404);
      const cs = await prisma.comision.findMany({ where: { ventaId: { in: [va1.id, va2.id] } } });
      assert.equal((await request(manager, '/comisiones/pagar', 'POST', { comisionIds: cs.map(c => c.id) })).status, 404);
      assert.equal(await prisma.comision.count({ where: { id: { in: cs.map(c => c.id) }, pagada: true } }), 0);
      assert.equal(await prisma.cita.count(), count); assert.equal((await prisma.sucursal.findUnique({ where: { id: a2.id } })).nombre, 'A2');
    });
    await check('Same-tenant mismatched appointment, barber and service references are rejected before writes', async () => {
      assert.equal((await request(owner, '/citas/walk-in', 'POST', { sucursalId: a1.id, barberoId: ab2.id, clienteNombre: 'Mismatch' })).status, 404);
      assert.equal((await request(owner, '/ventas', 'POST', { sucursalId: a1.id, barberoId: ab1.id, citaId: ca2.id, clienteId: client.id, metodoPago: 'EFECTIVO', items: [{ productoId: common.id, cantidad: 1 }] })).status, 404);
      assert.equal((await request(manager, `/productos/${common.id}`, 'PUT', { precioVenta: 1 })).status, 403);
      assert.equal((await request(barberUser, `/barberos/${ab1.id}`, 'PUT', { comisionServiciosPct: 99 })).status, 403);
    });
    await check('Valid branch operations remain usable for manager, cashier and barber', async () => {
      const newClient = await request(cashier, '/clientes', 'POST', { nombre: 'New A1', telefono: '5511122233' }); assert.equal(newClient.status, 200);
      assert.equal((await request(cashier, `/clientes/${newClient.body.id}`)).status, 200);
      assert.equal((await request(barberUser, `/citas/${ca1.id}/status`, 'PUT', { estado: 'CONFIRMADA' })).status, 200);
      assert.equal((await request(barberUser, `/barberos/${ab1.id}`, 'PUT', { descripcion: 'Own profile' })).status, 200);
      const paid = await request(cashier, '/ventas', 'POST', { sucursalId: a1.id, barberoId: ab1.id, clienteId: newClient.body.id, metodoPago: 'EFECTIVO', items: [{ productoId: common.id, cantidad: 1 }] }); assert.equal(paid.status, 200); assert.equal(paid.body.comisionGenerada, undefined);
      assert.equal((await request(manager, `/sucursales/${a1.id}`, 'PUT', { nombre: 'A1 approved' })).status, 200);
    });
    await check('Print capabilities are tied to record and live user; revoked access invalidates existing tokens', async () => {
      const issued = await request(manager, `/ventas/${va1.id}/print-token`, 'POST', {}); assert.equal(issued.status, 200);
      const cap = encodeURIComponent(issued.body.printToken);
      assert.equal((await request(null, `/ventas/${va1.id}/ticket-html?printToken=${cap}`)).status, 200);
      assert.equal((await request(null, `/ventas/${va2.id}/ticket-html?printToken=${cap}`)).status, 401);
      assert.equal((await request(null, `/cortes-caja/${qa1.id}/comprobante-html?printToken=${cap}`)).status, 401);
      const r = await request(owner, `/usuarios/${manager.id}/acceso`, 'PUT', { rol: 'GERENTE', branchIds: [a2.id], activo: true }); assert.equal(r.status, 200);
      assert.equal((await request(manager, `/ventas/${va1.id}/ticket`)).status, 404);
      assert.equal((await request(null, `/ventas/${va1.id}/ticket-html?printToken=${cap}`)).status, 401);
      assert.deepEqual((await request(manager, '/sucursales')).body.map(s => s.id), [a2.id]);
      assert.equal((await request(owner, `/usuarios/${manager.id}/acceso`, 'PUT', { rol: 'GERENTE', branchIds: [a1.id, a2.id] })).status, 200);
      assert.equal((await request(manager, '/sucursales')).body.length, 2);
      await request(owner, `/usuarios/${manager.id}/acceso`, 'PUT', { rol: 'GERENTE', branchIds: [a1.id] });
    });
    await check('Owner manages team without role escalation, password exposure or foreign assignments', async () => {
      const created = await request(owner, '/usuarios', 'POST', { nombre: 'New cashier', email: 'new-cashier@test.invalid', password: 'Authorization123!', rol: 'CAJERO', branchIds: [a1.id] }); assert.equal(created.status, 201); assert.equal(created.body.passwordHash, undefined);
      assert.equal((await request(owner, `/usuarios/${created.body.id}/acceso`, 'PUT', { rol: 'SUPER_ADMIN', branchIds: [a1.id] })).status, 400);
      assert.equal((await request(owner, `/usuarios/${created.body.id}/acceso`, 'PUT', { rol: 'CAJERO', branchIds: [b1.id] })).status, 404);
      assert.equal((await request(owner, `/usuarios/${owner.id}/acceso`, 'PUT', { rol: 'CAJERO', branchIds: [a1.id] })).status, 403);
      assert.equal((await request(otherOwner, `/usuarios/${created.body.id}/acceso`, 'PUT', { rol: 'CAJERO', branchIds: [b1.id] })).status, 404);
      const prior = token(created.body.tenantId ? created.body : { ...created.body, tenantId: a.id });
      assert.equal((await request(owner, `/usuarios/${created.body.id}/acceso`, 'PUT', { rol: 'GERENTE', branchIds: [a1.id] })).status, 200);
      assert.equal((await request(prior, '/sucursales')).status, 401);
      assert.equal((await request(owner, `/usuarios/${created.body.id}/acceso`, 'PUT', { rol: 'GERENTE', branchIds: [a1.id], activo: false })).status, 200);
      assert.equal((await request({ ...created.body, tenantId: a.id, rol: 'GERENTE' }, '/sucursales')).status, 401);
      assert(!(JSON.stringify((await request(owner, '/usuarios')).body).includes('passwordHash')));
    });
    await check('Missing branch assignment and unlinked barber fail closed', async () => {
      assert.equal((await request(unassigned, '/ventas')).status, 403);
      await prisma.usuario.update({ where: { id: barberUser.id }, data: { barberoId: null } });
      assert.equal((await request(barberUser, '/ventas')).status, 403);
      await prisma.usuario.update({ where: { id: barberUser.id }, data: { barberoId: ab1.id } });
    });
    await check('Public paths reject cross-business references, wrong slug and private appointment IDs', async () => {
      const wait = { tenantId: a.id, sucursalId: a1.id, clienteNombre: 'Wait', clienteTelefono: '5512345678', fechaDeseada: new Date(Date.now() + 86400000).toISOString() };
      assert.equal((await request(null, '/public/lista-espera', 'POST', { ...wait, sucursalId: b1.id })).status, 404);
      assert.equal((await request(null, '/public/lista-espera', 'POST', { ...wait, barberoId: ab2.id })).status, 404);
      assert.equal((await request(null, '/public/lista-espera', 'POST', { ...wait, servicioId: pb1.id })).status, 404);
      assert.equal((await request(null, '/public/lista-espera', 'POST', { ...wait, barberoId: ab1.id, servicioId: pa1.id })).status, 200);
      assert.equal((await request(null, `/public/cita/${ca1.id}/imprimir-carta`)).status, 404);
      assert.equal((await request(null, `/public/cita/${ca1.codigoReserva}/imprimir-carta?slug=auth-b`)).status, 404);
      const publicView = await request(null, `/public/cita/${ca1.codigoReserva}?slug=auth-a`); assert.equal(publicView.status, 200); assert.equal(publicView.body.tokenCancelacion, undefined); assert.equal(publicView.body.cliente.telefono, undefined);
      assert.equal((await request(null, '/public/reservar', 'POST', { ...wait, fechaHora: wait.fechaDeseada, barberoId: ab1.id, servicioIds: [pb1.id] })).status, 404);
      await prisma.barbero.update({ where: { id: abPeer.id }, data: { visibleEnWeb: false } });
      assert.equal((await request(null, '/public/lista-espera', 'POST', { ...wait, barberoId: abPeer.id, servicioId: pa1.id })).status, 404);
      const catalog = await request(null, '/public/barberia/auth-a');
      assert.equal(catalog.status, 200);
      assert(!catalog.body.tenant.sucursales.flatMap(branch => branch.barberos).some(barber => barber.id === abPeer.id));
    });
    await check('Unsigned Meta callbacks are disabled; both aliases require the exact raw-body signature', async () => {
      const payload = { object: 'whatsapp_business_account', entry: [] };
      for (const url of ['/notificaciones/meta-webhook', '/notificaciones/webhook']) {
        assert.equal((await request(null, url, 'POST', payload)).status, 503);
        process.env.META_APP_SECRET = 'isolated-meta-signing-secret';
        assert.equal((await request(null, url, 'POST', payload)).status, 401);
        const signature = 'sha256=' + require('node:crypto').createHmac('sha256', process.env.META_APP_SECRET).update(JSON.stringify(payload)).digest('hex');
        assert.equal((await request(null, url, 'POST', payload, { 'x-hub-signature-256': signature })).status, 200);
        assert.equal((await request(null, url, 'POST', { ...payload, altered: true }, { 'x-hub-signature-256': signature })).status, 401);
        delete process.env.META_APP_SECRET;
      }
    });
    await check('Concurrent team creation cannot bind two active accounts to the same barber', async () => {
      const responses = await Promise.all(['first', 'second'].map(n => request(owner, '/usuarios', 'POST', { nombre: n, email: n + '@team-test.invalid', password: 'Authorization123!', rol: 'BARBERO', branchIds: [a2.id], barberoId: ab2.id })));
      assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
      assert.equal(await prisma.usuario.count({ where: { tenantId: a.id, activo: true, barberoId: ab2.id } }), 1);
    });
    await check('Scopes remain isolated during concurrent requests and nested Prisma aggregates', async () => {
      const results = await Promise.all(Array.from({ length: 16 }, (_, i) => request(i % 2 ? otherOwner : manager, '/ventas')));
      results.forEach((r, i) => { assert.equal(r.status, 200); assert(r.body.every(v => v.tenantId === (i % 2 ? b.id : a.id) && (i % 2 || v.sucursalId === a1.id))); });
      const scoped = await requestAccess.run({ tenantId: a.id, userId: manager.id, rol: 'GERENTE', email: manager.email, branchIds: [a1.id], barberoId: null, path: '' }, async () => await prisma.clienteFinal.findFirst({ where: { id: client.id }, include: { _count: true, ventas: true } }));
      assert.equal(scoped._count.ventas, 2); assert(scoped.ventas.every(v => v.sucursalId === a1.id));
      assert.equal((await request(owner, '/ventas')).body.some(v => v.sucursalId === a2.id), true);
    });
    await check('Denied accesses, permission changes and platform exceptions are audited without credentials', async () => {
      await request(platform, '/admin/metrics');
      const logs = await prisma.auditoriaLog.findMany({ where: { tenantId: a.id } });
      for (const action of ['ACCESO_DENEGADO', 'RECURSO_FUERA_DE_ALCANCE', 'ACCESO_EQUIPO_ACTUALIZADO', 'ACCESO_PLATAFORMA']) assert(logs.some(l => l.accion === action));
      const serialized = JSON.stringify(logs); assert(!serialized.includes('Authorization123!') && !serialized.includes('printToken=') && !serialized.includes('Bearer '));
    });
    await check('Route inventory covers every mounted handler, public capability and legacy alias', async () => {
      const mappings = {
        'jobs.routes.ts': ['jobsRouter', ['/api/jobs']],
        'mail-webhook.routes.ts':['mailWebhookRouter',['/api/mail/webhook']],
          'account-security.routes.ts': ['accountSecurityRouter', ['/api/auth', '/api/tenant', '/api/onboarding']],
        'auth.routes.ts': ['authRouter', ['/api/auth', '/api/tenant', '/api/onboarding']], 'admin.routes.ts': ['adminRouter', ['/api/admin']],
        'citas.routes.ts': ['citasRouter', ['/api/citas']], 'public.routes.ts': ['publicRouter', ['/api/public']], 'pos.routes.ts': ['posRouter', ['/api/ventas']],
        'barberos.routes.ts': ['barberosRouter', ['/api/barberos']], 'comisiones.routes.ts': ['comisionesRouter', ['/api/comisiones']], 'bloqueos.routes.ts': ['bloqueosRouter', ['/api/bloqueos']],
        'cortes.routes.ts': ['cortesRouter', ['/api/cortes-caja']], 'inventario.routes.ts': ['inventarioRouter', ['/api']], 'notificaciones.routes.ts': ['notificacionesRouter', ['/api/notificaciones']],
        'reportes.routes.ts': ['reportesRouter', ['/api/reportes']], 'suscripcion.routes.ts': ['suscripcionRouter', ['/api/suscripcion']], 'sucursales.routes.ts': ['sucursalesRouter', ['/api/sucursales']],
        'clientes.routes.ts': ['clientesRouter', ['/api/clientes']], 'integraciones.routes.ts': ['integracionesRouter', ['/api/integraciones']], 'operacion.routes.ts': ['operacionRouter', ['/api/operacion']], 'usuarios.routes.ts': ['usuariosRouter', ['/api/usuarios']],
      };
      const entries = [];
      const add = (file, router, mounts) => {
        const source = fs.readFileSync(path.join(__dirname, '../apps/api/src/routes', file), 'utf8');
        const regex = new RegExp(`${router}\\.(get|post|put|patch|delete)\\('([^']*)'`, 'g');
        for (const match of source.matchAll(regex)) for (const mount of mounts) {
          const method = match[1].toUpperCase(), url = (mount + match[2]).replace(/\/$/, '');
          const isPublic = router === 'mailWebhookRouter' || router === 'publicRouter' || (router === 'authRouter' && ['/login', '/register', '/onboarding/templates', '/onboarding/setup'].includes(match[2])) || (router === 'suscripcionRouter' && ['/catalogo', '/webhook'].includes(match[2])) || (router === 'notificacionesRouter' && ['/webhook', '/meta-webhook'].includes(match[2]));
          const policy = matchPolicy(method, url.replace(/^\/api/, ''));
          assert(isPublic || policy, `Missing policy: ${method} ${url}`);
          entries.push({ method, path: url, roles: isPublic ? ['PÚBLICO'] : policy.roles, note: isPublic ? (url.includes('webhook') ? 'Firma del proveedor / challenge; revisión separada' : 'Datos mínimos / capacidades públicas; relaciones validadas') : policy.note || 'Tenant y sucursales del usuario; barbero solo su perfil' });
        }
      };
      for (const [file, [router, mounts]] of Object.entries(mappings)) add(file, router, mounts);
      add('proveedores.routes.ts', 'proveedoresRouter', ['/api/proveedores']); add('proveedores.routes.ts', 'ordenesCompraRouter', ['/api/ordenes-compra']);
      entries.push({ method: 'GET', path: '/api/health', roles: ['PÚBLICO'], note: 'Estado del servicio sin registros privados' });
      for (const mount of ['/api/auth', '/api/tenant', '/api/onboarding']) for (const path of ['/recovery/request', '/verification/request', '/recovery/complete', '/verification/complete', '/invitation/accept']) entries.push({ method: 'POST', path: mount + path, roles: ['PÚBLICO'], note: 'ST-03: límite persistente; token de propósito único, caducidad y consumo atómico' });
      assert(entries.length > 90);
      fs.writeFileSync(path.join(__dirname, '../docs/scrum/ST02_MATRIZ_RUTAS.md'), '# ST-02 · Matriz de autorización por ruta\n\nGenerada y contrastada con los handlers por la suite de autorización. Denegación por defecto para rutas autenticadas nuevas. Las capacidades de impresión verifican también usuario y asignación actuales.\n\n| Método | Ruta | Roles | Alcance / excepción |\n|---|---|---|---|\n' + entries.map(e => `| ${e.method} | ${e.path} | ${e.roles.join(', ')} | ${e.note} |`).join('\n') + '\n', 'utf8');
      fs.writeFileSync(path.join(__dirname, '../docs/scrum/ST02_INVENTARIO.json'), JSON.stringify(entries, null, 2) + '\n');
      console.log(`${entries.length} mounted routes inventoried`);
    });
    console.log(`${passed} PASSED · isolated ${process.env.SYSTECH_TEST_PG_URL ? 'PostgreSQL' : 'SQLite'} · two businesses / two branches each · no provider calls`);
  } finally { if (server) await new Promise(r => server.close(r)); await prisma.$disconnect(); cleanTestFixture(fixture.directory); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

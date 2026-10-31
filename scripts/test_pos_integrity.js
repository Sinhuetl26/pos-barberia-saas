'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { fork } = require('node:child_process');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
const root = path.resolve(__dirname, '..');
const hash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'packages/database/prisma/dev.db'))).digest('hex');
async function main() {
  const workBefore = hash(), fixture = createTestFixture(); Object.assign(process.env, fixture.env);
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken');
  const { calculateSaleTotals } = require('../apps/api/dist/services/pricing.service');
  const servers = [], checks = [];
  const check = async (name, fn) => { await fn(); checks.push(name); console.log('PASS ' + name); };
  const start = async () => {
    const server = fork(path.join(__dirname, 'test_server.js'), [], { cwd: root, env: fixture.env,
      execArgv: process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    servers.push(server); server.stderr.on('data', data => process.stderr.write(data));
    return await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Test API timeout')), 15000); server.once('message', msg => { clearTimeout(timer); resolve(msg.base + '/api'); }); server.once('exit', () => { clearTimeout(timer); reject(new Error('Test API stopped')); }); });
  };
  try {
    const bases = [await start(), await start()]; let cursor = 0;
    const request = async (token, endpoint, data, method = 'POST') => {
      const response = await fetch(bases[cursor++ % 2] + endpoint, { method, headers: { 'Content-Type': 'application/json', authorization: 'Bearer ' + token }, ...(data ? { body: JSON.stringify(data) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const setup = async suffix => {
      const tenant = await prisma.tenant.create({ data: { nombre: 'POS fixture ' + suffix, slug: 'pos-fixture-' + suffix } });
      const branch = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Matriz' } });
      const barber = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'Profesional', comisionServiciosPct: 0, comisionProductosPct: 10 } });
      const user = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Dueño', email: suffix + '@pos.invalid', passwordHash: 'disabled-fixture', rol: 'DUENO' } });
      const sign = u => jwt.sign({ sub: u.id, tid: u.tenantId, rol: u.rol, sv: u.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
      const client = await prisma.clienteFinal.create({ data: { tenantId: tenant.id, nombre: 'Cliente ficticio', telefono: 'fixture-' + suffix, sucursalOrigenId: branch.id } });
      const product = await prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre: 'Cera', precioVenta: 10.01, stockActual: 30, stockMinimo: 29 } });
      const service = await prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre: 'Corte', tipo: 'SERVICIO', precioVenta: 116, tasaImpuesto: 16 } });
      const payload = (key, overrides = {}) => ({ sucursalId: branch.id, barberoId: barber.id, clienteId: client.id, metodoPago: 'EFECTIVO', idempotencyKey: key, items: [{ productoId: product.id, cantidad: 1 }], ...overrides });
      return { tenant, branch, barber, user, token: sign(user), sign, client, product, service, payload };
    };
    const a = await setup('a'), b = await setup('b');
    const snapshot = async () => JSON.parse(JSON.stringify({ ventas: await prisma.venta.findMany({ orderBy: { id: 'asc' }, include: { items: true } }), products: await prisma.producto.findMany({ orderBy: { id: 'asc' } }), clients: await prisma.clienteFinal.findMany({ orderBy: { id: 'asc' } }), commissions: await prisma.comision.findMany({ orderBy: { id: 'asc' } }), sequences: await prisma.secuencia.findMany({ orderBy: { id: 'asc' } }), kardex: await prisma.kardexMovimiento.findMany({ orderBy: { id: 'asc' } }), operations: await prisma.pOSOperacion.findMany({ orderBy: { id: 'asc' } }), notifications: await prisma.notificacionLog.findMany({ orderBy: { id: 'asc' } }) }));
    let firstSale;
    await check('16 concurrent duplicate submissions across two API processes commit one complete sale', async () => {
      const outcomes = await Promise.all(Array.from({ length: 16 }, () => request(a.token, '/ventas', a.payload('same-intention'))));
      assert(outcomes.every(r => r.status === 200), JSON.stringify(outcomes)); assert.equal(new Set(outcomes.map(r => r.body.venta.id)).size, 1);
      assert.equal(outcomes.filter(r => !r.body.replayed).length, 1); firstSale = outcomes[0].body.venta;
      assert.equal(await prisma.venta.count({ where: { tenantId: a.tenant.id } }), 1); assert.equal(await prisma.pOSOperacion.count(), 1);
      assert.equal(await prisma.kardexMovimiento.count(), 1); assert.equal(await prisma.comision.count(), 1); assert.equal(await prisma.notificacionLog.count({ where: { tipo: 'STOCK_MINIMO' } }), 1);
      const customer = await prisma.clienteFinal.findUnique({ where: { id: a.client.id } }); assert.equal(customer.totalVisitas, 1); assert.equal(customer.gastoTotal.toString(), '10.01');
      assert.equal(Number((await prisma.producto.findUnique({ where: { id: a.product.id } })).stockActual), 29);
      assert(outcomes.every(r => r.body.comisionGenerada === outcomes[0].body.comisionGenerada && JSON.stringify(r.body.lowStockAlerts) === JSON.stringify(outcomes[0].body.lowStockAlerts)));
      assert.equal((await prisma.notificacionLog.findFirst({ where: { tipo: 'STOCK_MINIMO' } })).estado, 'REGISTRADO');
    });
    await check('Exact keys do not match substrings, and altered input with the same key is rejected', async () => {
      assert.equal((await request(a.token, '/ventas', a.payload('intention'))).body.replayed, false);
      const before = await snapshot(); const conflict = await request(a.token, '/ventas', a.payload('same-intention', { propina: 0.01 })); assert.equal(conflict.status, 409); assert.equal(conflict.body.code, 'IDEMPOTENCY_CONFLICT'); assert.deepEqual(await snapshot(), before);
    });
    await check('The same key in another tenant registers an independent sale and cannot expose another result', async () => {
      const sale = await request(b.token, '/ventas', b.payload('same-intention')); assert.equal(sale.status, 200); assert.notEqual(sale.body.venta.id, firstSale.id);
      assert.equal((await request(b.token, '/ventas/intenciones/intention', null, 'GET')).status, 404);
    });
    await check('Result lookup survives catalog deactivation and preserves branch, barber and financial permissions', async () => {
      await prisma.producto.update({ where: { id: a.product.id }, data: { activo: false } });
      const recovered = await request(a.token, '/ventas/intenciones/same-intention', null, 'GET'); assert.equal(recovered.status, 200); assert.equal(recovered.body.venta.id, firstSale.id); assert.equal(recovered.body.requestHash, undefined);
      await prisma.producto.update({ where: { id: a.product.id }, data: { activo: true } });
      const otherBranch = await prisma.sucursal.create({ data: { tenantId: a.tenant.id, nombre: 'Otra' } });
      const manager = await prisma.usuario.create({ data: { tenantId: a.tenant.id, nombre: 'Gerente', email: 'manager@pos.invalid', rol: 'GERENTE', sucursalId: otherBranch.id, passwordHash: 'disabled' } });
      assert.equal((await request(a.sign(manager), '/ventas/intenciones/same-intention', null, 'GET')).status, 404);
      const cashier = await prisma.usuario.create({ data: { tenantId: a.tenant.id, nombre: 'Caja', email: 'cashier@pos.invalid', rol: 'CAJERO', sucursalId: a.branch.id, passwordHash: 'disabled' } });
      const replay = await request(a.sign(cashier), '/ventas', a.payload('same-intention')); assert.equal(replay.status, 200); assert.equal(replay.body.comisionGenerada, undefined); assert.equal(replay.body.venta.items[0].comision, undefined);
    });
    await check('Two cashiers cannot sell the last unit twice', async () => {
      const p = await prisma.producto.create({ data: { tenantId: a.tenant.id, sucursalId: a.branch.id, nombre: 'Última', precioVenta: 5, stockActual: 1 } });
      const outcomes = await Promise.all(['last-a', 'last-b'].map(key => request(a.token, '/ventas', a.payload(key, { items: [{ productoId: p.id, cantidad: 1 }] }))));
      assert.deepEqual(outcomes.map(r => r.status).sort(), [200, 400]); assert.equal(outcomes.find(r => r.status === 400).body.code, 'INSUFFICIENT_STOCK');
      assert.equal(Number((await prisma.producto.findUnique({ where: { id: p.id } })).stockActual), 0); assert.equal(await prisma.kardexMovimiento.count({ where: { productoId: p.id } }), 1);
    });
    await check('Concurrent different sales reconcile stock, Kardex chain and unique consecutive folios', async () => {
      const p = await prisma.producto.create({ data: { tenantId: a.tenant.id, sucursalId: a.branch.id, nombre: 'Concurrente', precioVenta: 5, stockActual: 20 } });
      const outcomes = await Promise.all(Array.from({ length: 8 }, (_, i) => request(a.token, '/ventas', a.payload('chain-' + i, { items: [{ productoId: p.id, cantidad: 1 }] })))); assert(outcomes.every(r => r.status === 200));
      const numbers = outcomes.map(r => r.body.venta.folioConsecutivo).sort((x, y) => x - y); assert.equal(new Set(numbers).size, 8); assert.equal(numbers.at(-1) - numbers[0], 7);
      const moves = await prisma.kardexMovimiento.findMany({ where: { productoId: p.id }, orderBy: { stockAnterior: 'desc' } }); assert.equal(moves.length, 8); moves.forEach((m, i) => { assert.equal(Number(m.stockAnterior), 20 - i); assert.equal(Number(m.stockNuevo), 19 - i); });
      assert.equal(Number((await prisma.producto.findUnique({ where: { id: p.id } })).stockActual), 12);
    });
    await check('Shared stock across branches is locked consistently even with reversed cart order', async () => {
      const branch = await prisma.sucursal.create({ data: { tenantId: a.tenant.id, nombre: 'Compartida' } }), barber = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'Otro' } });
      const p = await prisma.producto.create({ data: { tenantId: a.tenant.id, nombre: 'Común 1', precioVenta: 1, stockActual: 2 } }), q = await prisma.producto.create({ data: { tenantId: a.tenant.id, nombre: 'Común 2', precioVenta: 1, stockActual: 2 } });
      const sale = (key, reverse) => request(a.token, '/ventas', a.payload(key, { ...(reverse ? { sucursalId: branch.id, barberoId: barber.id } : {}), items: (reverse ? [q, p] : [p, q]).map(v => ({ productoId: v.id, cantidad: 1 })) }));
      const outcomes = await Promise.all([sale('shared-a', false), sale('shared-b', true)]); assert(outcomes.every(r => r.status === 200));
      for (const product of [p, q]) { assert.equal(Number((await prisma.producto.findUnique({ where: { id: product.id } })).stockActual), 0); const moves = await prisma.kardexMovimiento.findMany({ where: { productoId: product.id }, orderBy: { stockAnterior: 'desc' } }); assert.deepEqual(moves.map(m => [Number(m.stockAnterior), Number(m.stockNuevo)]), [[2, 1], [1, 0]]); }
    });
    await check('Legacy folio gaps initialize from the highest visible number rather than row count', async () => {
      await prisma.venta.create({ data: { tenantId: b.tenant.id, sucursalId: b.branch.id, barberoId: b.barber.id, total: 1, metodoPago: 'EFECTIVO', folio: 'A-000042', folioConsecutivo: 1 } });
      await prisma.secuencia.deleteMany({ where: { tenantId: b.tenant.id } });
      const next = await request(b.token, '/ventas', b.payload('legacy-next')); assert.equal(next.status, 200); assert.equal(next.body.venta.folio, 'A-000043');
    });
    await check('Inventory entry concurrent with a sale preserves both movements and the stock chain', async () => {
      const p = await prisma.producto.create({ data: { tenantId: a.tenant.id, sucursalId: a.branch.id, nombre: 'Entrada y venta', precioVenta: 1, stockActual: 3 } });
      const results = await Promise.all([request(a.token, '/ventas', a.payload('entry-and-sale', { items: [{ productoId: p.id, cantidad: 1 }] })), request(a.token, '/inventario/movimiento', { productoId: p.id, tipoMovimiento: 'ENTRADA_COMPRA', cantidad: 2, motivo: 'Entrada ficticia' })]); assert(results.every(r => r.status === 200));
      assert.equal(Number((await prisma.producto.findUnique({ where: { id: p.id } })).stockActual), 4);
      const moves = await prisma.kardexMovimiento.findMany({ where: { productoId: p.id } }); assert.equal(moves.length, 2); const initial = moves.find(m => Number(m.stockAnterior) === 3), final = moves.find(m => m.id !== initial.id); assert.equal(Number(initial.stockNuevo), Number(final.stockAnterior)); assert.equal(Number(final.stockNuevo), 4);
    });
    await check('Mixed payments reject even one missing or extra cent, without any financial effect', async () => {
      for (const card of [5, 5.02]) { const before = await snapshot(); const result = await request(a.token, '/ventas', a.payload('mixed-bad-' + card, { metodoPago: 'MIXTO', montoEfectivo: 5, montoTarjeta: card })); assert.equal(result.status, 400); assert.equal(result.body.definitive, true); assert.deepEqual(await snapshot(), before); }
      const valid = await request(a.token, '/ventas', a.payload('mixed-good', { metodoPago: 'MIXTO', montoEfectivo: 5, montoTarjeta: 5.01, efectivoRecibido: 6 })); assert.equal(valid.status, 200); assert.equal(JSON.parse(valid.body.venta.detallesPago).cambio, 1);
    });
    await check('Discount allocation, included configured tax, tip and zero commission reconcile in cents', async () => {
      const map = new Map([['x', { id: 'x', nombre: 'X', tipo: 'SERVICIO', precioVenta: '1.005', tasaImpuesto: 16 }], ['y', { id: 'y', nombre: 'Y', tipo: 'PRODUCTO', precioVenta: '0.10', tasaImpuesto: 0 }]]);
      const calc = calculateSaleTotals(map, [{ productoId: 'x', cantidad: 3 }, { productoId: 'y', cantidad: 3 }], 0.01, 0.02, 0, 10);
      assert.equal(calc.subtotal, 3.33); assert.equal(calc.total, 3.34); assert.equal(calc.preparedItems.reduce((sum, i) => sum + Math.round(i.descuento * 100), 0), 1); assert.equal(calc.preparedItems[0].comision, 0);
      const paid = await request(a.token, '/ventas', a.payload('tax-sale', { items: [{ productoId: a.service.id, cantidad: 1 }], descuento: 0.01, propina: 0.02, efectivoRecibido: 116.01 })); assert.equal(paid.status, 200); assert.equal(Number(paid.body.venta.total), 116.01); assert.equal(Number(paid.body.venta.impuesto), 16); assert.equal(paid.body.comisionGenerada, 0); assert.equal(Number(paid.body.venta.items[0].tasaImpuesto), 16);
      await prisma.producto.update({ where: { id: a.service.id }, data: { tasaImpuesto: 8, precioVenta: 200 } }); const replay = await request(a.token, '/ventas', a.payload('tax-sale', { items: [{ productoId: a.service.id, cantidad: 1 }], descuento: 0.01, propina: 0.02, efectivoRecibido: 116.01 })); assert.equal(replay.body.venta.id, paid.body.venta.id); assert.equal(Number(replay.body.venta.impuesto), 16);
    });
    await check('Insufficient later item rolls back earlier stock, Kardex, folio and intention', async () => {
      const empty = await prisma.producto.create({ data: { tenantId: a.tenant.id, sucursalId: a.branch.id, nombre: 'Agotado', precioVenta: 1, stockActual: 0 } });
      const before = await snapshot(), result = await request(a.token, '/ventas', a.payload('rollback-stock', { items: [{ productoId: a.product.id, cantidad: 1 }, { productoId: empty.id, cantidad: 1 }] })); assert.equal(result.status, 400); assert.deepEqual(await snapshot(), before);
    });
    await check('A late database failure rolls back every effect; retrying the same intention succeeds once', async () => {
      const isPg = !!process.env.SYSTECH_TEST_PG_URL;
      if (isPg) {
        await prisma.$executeRawUnsafe(`CREATE FUNCTION st05_fail_commission() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture late failure'; END $$`);
        await prisma.$executeRawUnsafe('CREATE TRIGGER st05_late_failure BEFORE INSERT ON "Comision" FOR EACH ROW EXECUTE FUNCTION st05_fail_commission()');
      } else await prisma.$executeRawUnsafe("CREATE TRIGGER st05_late_failure BEFORE INSERT ON Comision BEGIN SELECT RAISE(ABORT, 'fixture late failure'); END");
      const before = await snapshot(), result = await request(a.token, '/ventas', a.payload('retry-late')); assert.equal(result.status, 500); assert.equal(result.body.definitive, false); assert.deepEqual(await snapshot(), before);
      await prisma.$executeRawUnsafe(isPg ? 'DROP TRIGGER st05_late_failure ON "Comision"' : 'DROP TRIGGER st05_late_failure'); if (isPg) await prisma.$executeRawUnsafe('DROP FUNCTION st05_fail_commission()');
      assert.equal((await request(a.token, '/ventas', a.payload('retry-late'))).status, 200); assert.equal((await request(a.token, '/ventas', a.payload('retry-late'))).body.replayed, true);
    });
    await check('Different keys for the same appointment cannot duplicate sale, visit or commission', async () => {
      const cita = await prisma.cita.create({ data: { tenantId: a.tenant.id, sucursalId: a.branch.id, barberoId: a.barber.id, clienteId: a.client.id, fechaHora: new Date(), estado: 'CONFIRMADA', servicioId: a.service.id, nombreServicio: a.service.nombre, precioEstimado: a.service.precioVenta, duracionMinutos: a.service.duracionMinutos, serviciosJson: JSON.stringify([{ id: a.service.id, nombre: a.service.nombre, precio: Number(a.service.precioVenta), duracion: a.service.duracionMinutos, tasaImpuesto: Number(a.service.tasaImpuesto) }]) } });
      const before = await prisma.clienteFinal.findUnique({ where: { id: a.client.id } });
      const outcomes = await Promise.all(['appointment-a', 'appointment-b'].map(key => request(a.token, '/ventas', a.payload(key, { citaId: cita.id, items: [{ productoId: a.product.id, cantidad: 1 }, { productoId: a.service.id, cantidad: 1 }] })))); assert.deepEqual(outcomes.map(r => r.status).sort(), [200, 409]);
      assert.equal(await prisma.venta.count({ where: { citaId: cita.id } }), 1); assert.equal((await prisma.clienteFinal.findUnique({ where: { id: a.client.id } })).totalVisitas, before.totalVisitas + 1);
    });
    await check('Invalid amounts, duplicate lines and inconsistent headers are rejected', async () => {
      for (const patch of [{ descuento: 0.001 }, { propina: 'Infinity' }, { idempotencyKey: '' }, { items: [{ productoId: a.product.id, cantidad: 1 }, { productoId: a.product.id, cantidad: 1 }] }]) assert.equal((await request(a.token, '/ventas', a.payload('bad-input', patch))).status, 400);
      const response = await fetch(bases[0] + '/ventas', { method: 'POST', headers: { authorization: 'Bearer ' + a.token, 'Content-Type': 'application/json', 'idempotency-key': 'different-header' }, body: JSON.stringify(a.payload('different-body')) }); assert.equal(response.status, 400);
    });
    await check('Pending browser intentions survive reload and uncertain errors, isolated by tenant/user', async () => {
      const ts = require('typescript'), Module = require('module'), file = path.join(root, 'apps/web/src/utils/pendingSale.ts');
      const mod = new Module(file); mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
      const u = mod.exports, memory = new Map(), store = { getItem: k => memory.get(k) || null, setItem: (k, value) => memory.set(k, value) };
      const storageKey = u.pendingSaleStorageKey('tenant-a', 'user-a'), pending = { key: 'one', storageKey, payload: { idempotencyKey: 'one', items: [] }, total: 1 };
      u.savePendingSale(store, pending); assert.deepEqual(u.readPendingSale(store, storageKey), pending); assert.equal(u.readPendingSale(store, u.pendingSaleStorageKey('tenant-a', 'user-b')), null);
      for (const error of [{}, { status: 500 }, { status: 401 }, { status: 403 }, { status: 400 }, { status: 409 }]) assert.equal(u.pendingSaleCanBeReleased(error), false);
      assert.equal(u.pendingSaleCanBeReleased({ status: 400, definitive: true }), true);
      assert.throws(() => u.savePendingSale({ setItem() { throw new Error('quota'); } }, pending));
    });
    await check('Working database is unchanged', async () => { assert.equal(hash(), workBefore); });
    const engine = process.env.SYSTECH_TEST_PG_URL ? 'postgres' : 'sqlite';
    fs.writeFileSync(path.join(root, `docs/scrum/ST05_RESULTADOS_${engine}.json`), JSON.stringify({ date: '2026-10-07', engine, api_processes: 2, passed: checks.length, checks, working_database_unchanged: true, external_providers_contacted: false }, null, 2) + '\n');
    console.log(`${checks.length} ST-05 checks passed (${engine}).`);
  } finally {
    for (const server of servers) if (server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill(); });
    await prisma.$disconnect(); cleanTestFixture(fixture.directory);
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });

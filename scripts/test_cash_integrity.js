'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { fork } = require('node:child_process');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
const root = path.resolve(__dirname, '..');
const workDb = path.join(root, 'packages/database/prisma/dev.db');
// A clean checkout (CI) has no local SQLite database: the fingerprint is null
// on both sides of the assertion, so "unchanged" still means unchanged.
const workingHash = () => fs.existsSync(workDb) ? crypto.createHash('sha256').update(fs.readFileSync(workDb)).digest('hex') : null;
async function main() {
  const before = workingHash(), fixture = createTestFixture(); Object.assign(process.env, fixture.env);
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken');
  const servers = [], checks = [];
  const check = async (name, fn) => { await fn(); checks.push(name); console.log('PASS ' + name); };
  const start = async () => {
    const server = fork(path.join(__dirname, 'test_server.js'), [], { cwd: root, env: fixture.env, execArgv: process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    servers.push(server); server.stderr.on('data', data => process.stderr.write(data));
    return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('API timeout')), 15000); server.once('message', m => { clearTimeout(timer); resolve(m.base + '/api'); }); });
  };
  try {
    const bases = [await start(), await start()]; let requestIndex = 0;
    const req = async (token, endpoint, body, method = 'POST') => {
      const response = await fetch(bases[requestIndex++ % 2] + endpoint, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const content = response.headers.get('content-type') || '';
      return { status: response.status, body: content.includes('json') ? await response.json() : await response.text() };
    };
    const setup = async name => {
      // This suite exercises commission settlements, a Studio Pro capability; the plan is
      // declared so the licensing gate stays enforced instead of being bypassed.
      const tenant = await prisma.tenant.create({ data: { nombre: 'Caja ficticia ' + name, slug: 'cash-' + name, plan: 'PRO' } });
      const branch = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Matriz' } });
      const barber = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'Profesional', comisionServiciosPct: 50, comisionProductosPct: 10 } });
      const user = async (role, linked = null) => prisma.usuario.create({ data: { tenantId: tenant.id, nombre: role, email: name + role + '@cash.invalid', rol: role, sucursalId: branch.id, barberoId: linked, passwordHash: 'disabled' } });
      const owner = await user('DUENO'), cashier = await user('CAJERO'), barberUser = await user('BARBERO', barber.id), manager = await user('GERENTE');
      const sign = u => jwt.sign({ sub: u.id, tid: u.tenantId, rol: u.rol, sv: u.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
      const product = await prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre: 'Cera', precioVenta: 10.01, stockActual: 20 } });
      const service = await prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre: 'Corte', tipo: 'SERVICIO', precioVenta: 116, tasaImpuesto: 16 } });
      const customer = await prisma.clienteFinal.create({ data: { tenantId: tenant.id, nombre: 'Cliente ficticio', telefono: 'fixture-' + name, sucursalOrigenId: branch.id } });
      // A barber may associate a client only when linked through their own agenda/history.
      await prisma.cita.create({ data: { tenantId: tenant.id, sucursalId: branch.id, barberoId: barber.id, clienteId: customer.id, fechaHora: new Date(Date.now() + 86400000) } });
      const sale = (key, options = {}) => ({ sucursalId: branch.id, barberoId: barber.id, clienteId: customer.id, metodoPago: 'EFECTIVO', items: [{ productoId: product.id, cantidad: 1 }], idempotencyKey: key, ...options });
      return { tenant, branch, barber, owner, cashier, barberUser, manager, product, service, customer, sale, sign, token: sign(owner) };
    };
    const a = await setup('a'), b = await setup('b'); let cut, sale, refund;
    await check('Eight concurrent openings across two API processes create one shift and one stable response', async () => {
      const input = { sucursalId: a.branch.id, fondoInicial: 100, idempotencyKey: 'open' };
      const replies = await Promise.all(Array.from({ length: 8 }, () => req(a.token, '/cortes-caja/abrir', input)));
      assert(replies.every(r => r.status === 200), JSON.stringify(replies)); assert.equal(new Set(replies.map(r => r.body.id)).size, 1); cut = replies[0].body;
      assert.equal(await prisma.corteCaja.count({ where: { tenantId: a.tenant.id, estado: 'ABIERTO' } }), 1);
      assert.equal((await req(a.token, '/cortes-caja/abrir', { ...input, idempotencyKey: 'open-again' })).status, 409);
    });
    await check('Barber checkout records branch, service provider, collector and one durable owner notice on retries', async () => {
      const input = a.sale('barber-sale', { items: [{ productoId: a.product.id, cantidad: 3 }, { productoId: a.service.id, cantidad: 1 }], propina: 5, metodoPago: 'MIXTO', montoEfectivo: 51.03, montoTarjeta: 100 });
      const results = await Promise.all(Array.from({ length: 8 }, () => req(a.sign(a.barberUser), '/ventas', input)));
      assert(results.every(r => r.status === 200), JSON.stringify(results)); sale = results[0].body.venta;
      assert.equal(sale.cobradoPorId, a.barberUser.id); assert.equal(sale.barberoId, a.barber.id); assert.equal(sale.corteCajaId, cut.id);
      assert.equal(await prisma.notificacionLog.count({ where: { tenantId: a.tenant.id, tipo: 'VENTA_CONFIRMADA' } }), 1);
      const notice = (await req(a.token, '/notificaciones/ventas', null, 'GET')).body[0];
      assert.equal(notice.total, 151.03); assert.equal(notice.cobradoPor, a.barberUser.nombre); assert.notEqual(notice.cobradoPor, a.barberUser.email); assert(notice.servicios.some(i => i.includes('Corte')));
      assert.equal((await req(b.token, '/notificaciones/ventas', null, 'GET')).body.length, 0);
      assert.equal((await req(a.sign(a.barberUser), '/notificaciones/ventas', null, 'GET')).status, 403);
    });
    await check('Custody is private to the collecting barber and branch; mixed card money is never cash', async () => {
      const balance = (await req(a.sign(a.barberUser), '/cortes-caja/custodia', null, 'GET')).body;
      assert.equal(balance.saldos.length, 1); assert.equal(balance.saldos[0].saldo, 51.03);
      assert.equal(balance.saldos[0].nombre, a.barberUser.nombre);
      assert.notEqual(balance.saldos[0].nombre, a.barberUser.email);
      assert.equal((await req(b.token, '/cortes-caja/custodia', null, 'GET')).body.saldos.length, 0);
      assert.equal((await req(a.sign(a.barberUser), '/cortes-caja/entrega', { usuarioId: a.barberUser.id, sucursalId: a.branch.id, monto: 20, idempotencyKey: 'forged' })).status, 403);
    });
    await check('Receiving the same handoff eight times moves custody once and preserves sales and commission', async () => {
      const input = { sucursalId: a.branch.id, usuarioId: a.barberUser.id, monto: 20, idempotencyKey: 'receive' };
      const replies = await Promise.all(Array.from({ length: 8 }, () => req(a.sign(a.manager), '/cortes-caja/entrega', input)));
      assert(replies.every(r => r.status === 200), JSON.stringify(replies)); assert.equal(new Set(replies.map(r => r.body.recibo.id)).size, 1);
      assert.equal((await req(a.token, '/cortes-caja/custodia', null, 'GET')).body.saldos[0].saldo, 31.03);
      assert.equal(await prisma.venta.count({ where: { tenantId: a.tenant.id } }), 1);
      assert.equal(await prisma.comision.count({ where: { ventaId: sale.id } }), 1);
      assert.equal(await prisma.registroCaja.count({ where: { tenantId: a.tenant.id, tipo: 'ENTREGA' } }), 2);
      assert.equal((await req(a.token, '/cortes-caja/entrega', { ...input, monto: 19 })).status, 409);
      assert.equal((await req(a.token, '/cortes-caja/entrega', { ...input, monto: 40, idempotencyKey: 'too-much' })).status, 400);
    });
    await check('Cash movements require exact cents, a reason, an open branch and a durable key', async () => {
      for (const [tipo, monto] of [['INGRESO', 10], ['RETIRO', 5], ['GASTO_MENOR', 2.01]]) {
        const input = { sucursalId: a.branch.id, tipo, monto, concepto: 'Movimiento ficticio', idempotencyKey: tipo };
        assert.equal((await req(a.token, '/cortes-caja/movimiento', input)).status, 200);
        assert.equal((await req(a.token, '/cortes-caja/movimiento', input)).status, 200);
      }
      assert.equal(await prisma.movimientoCaja.count({ where: { tenantId: a.tenant.id } }), 3);
      for (const bad of [{ monto: 1.001 }, { concepto: '   ' }, { sucursalId: b.branch.id }, { idempotencyKey: null }]) assert((await req(a.token, '/cortes-caja/movimiento', { sucursalId: a.branch.id, tipo: 'INGRESO', monto: 1, concepto: 'Prueba', idempotencyKey: crypto.randomUUID(), ...bad })).status >= 400);
    });
    await check('Blind closing never exposes its expectation before counting, including printable capabilities', async () => {
      assert.equal((await req(a.token, `/cortes-caja/${cut.id}/print-token`, {})).status, 409);
      assert.equal((await req(a.token, `/cortes-caja/${cut.id}/comprobante-html`, null, 'GET')).status, 409);
      const open = (await req(a.token, '/cortes-caja', null, 'GET')).body.find(c => c.id === cut.id);
      assert.equal(open.resumenJson, undefined); assert.equal(open.conteoEfectivoReal, undefined); assert.equal(open.totalEfectivo, undefined);
    });
    let closed;
    await check('Blind close separates mixed payments and custody from physical cash and treats one cent as a difference', async () => {
      const input = { corteId: cut.id, conteoEfectivoReal: 122.98 };
      const replies = await Promise.all(Array.from({ length: 6 }, () => req(a.token, '/cortes-caja/cerrar', input)));
      assert(replies.every(r => r.status === 200)); closed = replies[0].body;
      assert.equal(closed.resumen.efectivoEsperado, 122.99); assert.equal(closed.resumen.totalVentas, 151.03);
      assert.equal(closed.resumen.totalEfectivo, 51.03); assert.equal(closed.resumen.totalTarjeta, 100);
      assert.equal(closed.resumen.descuadre, -0.01); assert.equal(closed.resumen.descuadrado, true);
      assert.equal((await req(a.token, '/cortes-caja/cerrar', { ...input, conteoEfectivoReal: 123 })).status, 409);
      const html = (await req(a.token, `/cortes-caja/${cut.id}/comprobante-html`, null, 'GET')).body;
      assert(html.includes('122.99')); assert(html.includes('FALTANTE')); assert(!html.includes('CAJA CUADRADA'));
    });
    let paid;
    await check('Commission settlement persists a receipt and cannot pay the same selection twice', async () => {
      const original = await prisma.comision.findFirst({ where: { ventaId: sale.id } });
      paid = await req(a.token, '/comisiones/pagar', { comisionIds: [original.id], metodoPagoComision: 'TRANSFERENCIA', idempotencyKey: 'paid' });
      assert.equal(paid.status, 200); assert.equal(paid.body.netoPagado, 53);
      assert.equal((await req(a.token, '/comisiones/pagar', { comisionIds: [original.id], metodoPagoComision: 'TRANSFERENCIA', idempotencyKey: 'paid' })).status, 200);
      assert.equal((await req(a.token, '/comisiones/pagar', { comisionIds: [original.id], metodoPagoComision: 'TRANSFERENCIA', idempotencyKey: 'paid-new' })).status, 409);
    });
    await check('Partial refund after a closed shift restores one unit, reverses a historical commission and keeps paid history', async () => {
      const originalCut = JSON.stringify(await prisma.corteCaja.findUnique({ where: { id: cut.id } }));
      const item = sale.items.find(i => i.productoId === a.product.id);
      const input = { motivo: 'Una unidad devuelta', origenEfectivo: 'COBRADOR', items: [{ itemId: item.id, cantidad: 1 }], idempotencyKey: 'partial' };
      const replies = await Promise.all(Array.from({ length: 8 }, () => req(a.token, `/ventas/${sale.id}/devolver`, input)));
      assert(replies.every(r => r.status === 200), JSON.stringify(replies)); refund = replies[0].body.devolucion;
      assert.equal(new Set(replies.map(r => r.body.devolucion.id)).size, 1); assert.equal(Number(refund.total), 10.01); assert.equal(Number(refund.comision), 1);
      assert.equal(Number((await prisma.producto.findUnique({ where: { id: a.product.id } })).stockActual), 18);
      const cs = await prisma.comision.findMany({ where: { ventaId: sale.id } });
      assert.equal(cs.find(c => c.pagada).monto.toString(), '53'); assert.equal(cs.find(c => !c.pagada).monto.toString(), '-1');
      assert.equal(JSON.stringify(await prisma.corteCaja.findUnique({ where: { id: cut.id } })), originalCut);
      assert.equal(await prisma.devolucionVenta.count({ where: { ventaId: sale.id } }), 1);
      assert.equal((await prisma.clienteFinal.findUnique({ where: { id: a.customer.id } })).totalVisitas, 1);
      assert.equal((await prisma.venta.findUnique({ where: { id: sale.id } })).totalDevuelto.toString(), '10.01');
      assert.equal(Object.values(JSON.parse(refund.pagosJson)).reduce((sum, val) => sum + Math.round(val * 100), 0), 1001);
    });
    await check('Partial returns do not reprice when the product price and barber commission change', async () => {
      await prisma.producto.update({ where: { id: a.product.id }, data: { precioVenta: 999 } });
      await prisma.barbero.update({ where: { id: a.barber.id }, data: { comisionProductosPct: 99, comisionServiciosPct: 99 } });
      const cut2 = await req(a.token, '/cortes-caja/abrir', { sucursalId: a.branch.id, fondoInicial: 100, idempotencyKey: 'open-second' }); assert.equal(cut2.status, 200);
      const full = await req(a.token, `/ventas/${sale.id}/cancelar`, { motivo: 'Resto de venta devuelto', origenEfectivo: 'CAJA', idempotencyKey: 'remainder' });
      assert.equal(full.status, 200, JSON.stringify(full)); assert.equal(Number(full.body.devolucion.total), 141.02); assert.equal(Number(full.body.devolucion.comision), 52);
      assert.equal(Number((await prisma.producto.findUnique({ where: { id: a.product.id } })).stockActual), 20);
      assert.equal((await prisma.venta.findUnique({ where: { id: sale.id } })).estado, 'CANCELADA');
      assert.equal((await prisma.clienteFinal.findUnique({ where: { id: a.customer.id } })).totalVisitas, 0);
      const expectedCash = 100 - JSON.parse(full.body.devolucion.pagosJson).EFECTIVO;
      const close = await req(a.token, '/cortes-caja/cerrar', { corteId: cut2.body.id, conteoEfectivoReal: expectedCash });
      assert.equal(close.status, 200); assert.equal(close.body.resumen.descuadre, 0); assert.equal(close.body.resumen.totalVentas, -141.02);
    });
    await check('Paid commission adjustments remain pending and cannot disappear in a zero-clamped payroll', async () => {
      const pending = await prisma.comision.findMany({ where: { ventaId: sale.id, pagada: false } });
      assert.equal(pending.reduce((sum, c) => sum + Number(c.monto), 0), -53);
      const result = await req(a.token, '/comisiones/liquidar-nomina', { barberoId: a.barber.id, idempotencyKey: 'negative-payroll' });
      assert.equal(result.status, 400); assert.equal(result.body.code, 'NEGATIVE_COMMISSION_BALANCE');
      assert.equal(await prisma.comision.count({ where: { ventaId: sale.id, pagada: false } }), 2);
    });
    await check('Refund permissions, reason, foreign branch and excessive quantity fail before stock changes', async () => {
      const item = sale.items[0];
      const input = { motivo: 'Prueba válida', items: [{ itemId: item.id, cantidad: 999 }], idempotencyKey: 'invalid' };
      assert.equal((await req(a.sign(a.barberUser), `/ventas/${sale.id}/devolver`, input)).status, 403);
      assert.equal((await req(a.sign(a.cashier), `/ventas/${sale.id}/devolver`, input)).status, 403);
      assert.equal((await req(b.token, `/ventas/${sale.id}/devolver`, input)).status, 404);
      assert.equal((await req(a.token, `/ventas/${sale.id}/devolver`, { ...input, motivo: ' ' })).status, 400);
      assert.equal(Number((await prisma.producto.findUnique({ where: { id: a.product.id } })).stockActual), 20);
    });
    await check('Concurrent new-key refunds cannot restore the same last unit twice', async () => {
      const sold = await req(b.token, '/ventas', b.sale('single')); assert.equal(sold.status, 200);
      const outcomes = await Promise.all(['one', 'two'].map(key => req(b.token, `/ventas/${sold.body.venta.id}/devolver`, { motivo: 'Última unidad devuelta', origenEfectivo: 'COBRADOR', items: [{ itemId: sold.body.venta.items[0].id, cantidad: 1 }], idempotencyKey: key })));
      assert.deepEqual(outcomes.map(r => r.status).sort(), [200, 400]);
      assert.equal(Number((await prisma.producto.findUnique({ where: { id: b.product.id } })).stockActual), 20);
      assert.equal(await prisma.devolucionVenta.count({ where: { ventaId: sold.body.venta.id } }), 1);
    });
    await check('A sale concurrent with closing belongs wholly to that shift or to the collector, never half-committed', async () => {
      const opened = await req(b.token, '/cortes-caja/abrir', { sucursalId: b.branch.id, fondoInicial: 0, idempotencyKey: 'race-open' });
      const outcomes = await Promise.all([req(b.token, '/ventas', b.sale('race-sale')), req(b.token, '/cortes-caja/cerrar', { corteId: opened.body.id, conteoEfectivoReal: 0 })]);
      assert(outcomes.every(r => r.status === 200));
      const sold = outcomes[0].body.venta, closed = outcomes[1].body;
      const ledger = await prisma.registroCaja.findFirst({ where: { ventaId: sold.id } });
      if (sold.corteCajaId) { assert.equal(ledger.corteCajaId, opened.body.id); assert.equal(closed.resumen.totalVentas, 10.01); assert.equal(closed.resumen.descuadre, -10.01); }
      else { assert.equal(ledger.custodiaUsuarioId, b.owner.id); assert.equal(closed.resumen.totalVentas, 0); assert.equal(closed.resumen.descuadre, 0); }
    });
    await check('Custody from a prior closed shift is received into a new shift without a new sale', async () => {
      const saldo = (await req(a.token, '/cortes-caja/custodia', null, 'GET')).body.saldos[0].saldo;
      const open = await req(a.token, '/cortes-caja/abrir', { sucursalId: a.branch.id, fondoInicial: 0, idempotencyKey: 'third-open' });
      assert.equal((await req(a.token, '/cortes-caja/entrega', { sucursalId: a.branch.id, usuarioId: a.barberUser.id, monto: saldo, idempotencyKey: 'third-handoff' })).status, 200);
      const close = await req(a.token, '/cortes-caja/cerrar', { corteId: open.body.id, conteoEfectivoReal: saldo });
      assert.equal(close.body.resumen.totalVentas, 0); assert.equal(close.body.resumen.descuadre, 0);
    });
    await check('A late refund database failure rolls back stock, commission, cash, customer and intention; the same key recovers once', async () => {
      const sold = await req(b.token, '/ventas', b.sale('late-refund')); assert.equal(sold.status, 200);
      const saleId = sold.body.venta.id;
      const snapshot = async () => JSON.parse(JSON.stringify({ sale: await prisma.venta.findUnique({ where: { id: saleId } }), customer: await prisma.clienteFinal.findUnique({ where: { id: b.customer.id } }), product: await prisma.producto.findUnique({ where: { id: b.product.id } }), commissions: await prisma.comision.findMany({ where: { ventaId: saleId }, orderBy: { id: 'asc' } }), ledger: await prisma.registroCaja.findMany({ where: { ventaId: saleId }, orderBy: { id: 'asc' } }), returns: await prisma.devolucionVenta.findMany({ where: { ventaId: saleId } }), operations: await prisma.cajaOperacion.findMany({ where: { tenantId: b.tenant.id }, orderBy: { id: 'asc' } }) }));
      const isPg = Boolean(fixture.env.SYSTECH_TEST_PG_URL);
      if (isPg) { await prisma.$executeRawUnsafe(`CREATE FUNCTION fail_return() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."accion" = 'DEVOLUCION_VENTA' THEN RAISE EXCEPTION 'fixture rollback'; END IF; RETURN NEW; END $$`); await prisma.$executeRawUnsafe('CREATE TRIGGER fail_return BEFORE INSERT ON "AuditoriaLog" FOR EACH ROW EXECUTE FUNCTION fail_return()'); }
      else await prisma.$executeRawUnsafe(`CREATE TRIGGER fail_return BEFORE INSERT ON "AuditoriaLog" WHEN NEW."accion"='DEVOLUCION_VENTA' BEGIN SELECT RAISE(ABORT, 'fixture rollback'); END`);
      const beforeFailure = await snapshot();
      const payload = { motivo: 'Prueba de reverso íntegro', origenEfectivo: 'COBRADOR', items: [{ itemId: sold.body.venta.items[0].id, cantidad: 1 }], idempotencyKey: 'late-return-key' };
      try { assert.equal((await req(b.token, `/ventas/${saleId}/devolver`, payload)).status, 503); assert.deepEqual(await snapshot(), beforeFailure); }
      finally { if (isPg) { await prisma.$executeRawUnsafe('DROP TRIGGER fail_return ON "AuditoriaLog"'); await prisma.$executeRawUnsafe('DROP FUNCTION fail_return()'); } else await prisma.$executeRawUnsafe('DROP TRIGGER fail_return'); }
      assert.equal((await req(b.token, `/ventas/${saleId}/devolver`, payload)).status, 200); assert.equal((await req(b.token, `/ventas/${saleId}/devolver`, payload)).status, 200);
      assert.equal(await prisma.devolucionVenta.count({ where: { ventaId: saleId } }), 1);
    });
    await check('A tip-only remainder can be refunded without restocking an already returned unit', async () => {
      const sold = await req(b.token, '/ventas', b.sale('tip-only', { propina: 1 }));
      const item = sold.body.venta.items[0];
      const excess = await req(b.token, `/ventas/${sold.body.venta.id}/devolver`, { motivo: 'Cantidad excesiva', origenEfectivo: 'COBRADOR', items: [{ itemId: item.id, cantidad: 2 }], idempotencyKey: 'excess' });
      assert.equal(excess.status, 400); assert.equal(excess.body.code, 'RETURN_EXCEEDS_SALE');
      assert.equal((await req(b.token, `/ventas/${sold.body.venta.id}/devolver`, { motivo: 'Producto devuelto', origenEfectivo: 'COBRADOR', items: [{ itemId: item.id, cantidad: 1 }], idempotencyKey: 'product-return' })).status, 200);
      const stock = Number((await prisma.producto.findUnique({ where: { id: b.product.id } })).stockActual);
      const tip = await req(b.token, `/ventas/${sold.body.venta.id}/devolver`, { motivo: 'Propina devuelta', origenEfectivo: 'COBRADOR', items: [], propina: 1, idempotencyKey: 'tip-return' });
      assert.equal(tip.status, 200, JSON.stringify(tip)); assert.equal(tip.body.estado, 'CANCELADA');
      assert.equal(Number((await prisma.producto.findUnique({ where: { id: b.product.id } })).stockActual), stock);
    });
    await check('The next payroll must include past paid-sale reversals and offsets them without changing the earlier receipt', async () => {
      const sold = await req(a.token, '/ventas', a.sale('offset-sale', { metodoPago: 'TRANSFERENCIA', items: [{ productoId: a.service.id, cantidad: 1 }] }));
      assert.equal(sold.status, 200);
      const commission = await prisma.comision.findFirst({ where: { ventaId: sold.body.venta.id } });
      const skip = await req(a.token, '/comisiones/pagar', { comisionIds: [commission.id], metodoPagoComision: 'TRANSFERENCIA', idempotencyKey: 'skip-adjustments' });
      assert.equal(skip.status, 400); assert.equal(skip.body.code, 'INCLUDE_RETURN_ADJUSTMENTS');
      const settle = await req(a.token, '/comisiones/liquidar-nomina', { barberoId: a.barber.id, metodoPago: 'TRANSFERENCIA', idempotencyKey: 'offset-payroll' });
      assert.equal(settle.status, 200, JSON.stringify(settle)); assert.equal(settle.body.netoPagado, 46); assert.equal(settle.body.reciboNomina.netoPagado, 46);
      assert.equal(await prisma.comision.count({ where: { ventaId: sale.id, pagada: false } }), 0);
      assert.equal((await prisma.comision.findFirst({ where: { ventaId: sale.id, origen: 'VENTA' } })).monto.toString(), '53');
    });
    await check('Free units and a fully discounted sale can be returned without prematurely cancelling outstanding units', async () => {
      const free = await prisma.producto.create({ data: { tenantId: b.tenant.id, sucursalId: b.branch.id, nombre: 'Obsequio', precioVenta: 0, stockActual: 4 } });
      const paid = await req(b.token, '/ventas', b.sale('paid-and-free', { items: [{ productoId: b.product.id, cantidad: 1 }, { productoId: free.id, cantidad: 2 }] }));
      const paidLine = paid.body.venta.items.find(i => i.productoId === b.product.id), freeLine = paid.body.venta.items.find(i => i.productoId === free.id);
      const moneyBack = await req(b.token, `/ventas/${paid.body.venta.id}/devolver`, { motivo: 'Unidad pagada devuelta', origenEfectivo: 'COBRADOR', items: [{ itemId: paidLine.id, cantidad: 1 }], idempotencyKey: 'paid-only-return' });
      assert.equal(moneyBack.status, 200); assert.equal(moneyBack.body.estado, 'PARCIAL_DEVUELTA');
      const giftBack = await req(b.token, `/ventas/${paid.body.venta.id}/devolver`, { motivo: 'Obsequios devueltos', items: [{ itemId: freeLine.id, cantidad: 2 }], idempotencyKey: 'gifts-return' });
      assert.equal(giftBack.status, 200, JSON.stringify(giftBack)); assert.equal(Number(giftBack.body.devolucion.total), 0); assert.equal(giftBack.body.estado, 'CANCELADA');
      assert.equal(Number((await prisma.producto.findUnique({ where: { id: free.id } })).stockActual), 4);
      const zero = await req(b.token, '/ventas', b.sale('zero-sale', { descuento: 10.01 }));
      assert.equal(zero.status, 200); assert.equal(Number(zero.body.venta.total), 0);
      const cancel = await req(b.token, `/ventas/${zero.body.venta.id}/cancelar`, { motivo: 'Venta bonificada anulada', idempotencyKey: 'zero-return' });
      assert.equal(cancel.status, 200); assert.equal(cancel.body.estado, 'CANCELADA');
    });
    await check('Refunding an already attended appointment preserves the prior CRM visit', async () => {
      const customer = await prisma.clienteFinal.create({ data: { tenantId: b.tenant.id, nombre: 'Cliente atendido ficticio', telefono: 'fixture-attended', sucursalOrigenId: b.branch.id, totalVisitas: 1 } });
      const appointment = await prisma.cita.create({ data: { tenantId: b.tenant.id, sucursalId: b.branch.id, barberoId: b.barber.id, clienteId: customer.id, fechaHora: new Date(), estado: 'COMPLETADA', servicioId: b.service.id, nombreServicio: b.service.nombre, precioEstimado: b.service.precioVenta, duracionMinutos: b.service.duracionMinutos, serviciosJson: JSON.stringify([{ id: b.service.id, nombre: b.service.nombre, precio: Number(b.service.precioVenta), duracion: b.service.duracionMinutos, tasaImpuesto: Number(b.service.tasaImpuesto) }]) } });
      const sold = await req(b.token, '/ventas', b.sale('attended-sale', { clienteId: customer.id, citaId: appointment.id, items: [{ productoId: b.product.id, cantidad: 1 }, { productoId: b.service.id, cantidad: 1 }] })); assert.equal(sold.status, 200);
      const cancel = await req(b.token, `/ventas/${sold.body.venta.id}/cancelar`, { motivo: 'Cobro de cita anulado', origenEfectivo: 'COBRADOR', idempotencyKey: 'attended-return' });
      assert.equal(cancel.status, 200); const after = await prisma.clienteFinal.findUnique({ where: { id: customer.id } }); assert.equal(after.totalVisitas, 1); assert.equal(after.gastoTotal.toString(), '0');
    });
    await check('The real working database is untouched', async () => assert.equal(workingHash(), before));
    fs.writeFileSync(path.join(root, `docs/ST06_RESULTADOS_${fixture.env.SYSTECH_TEST_PG_URL ? 'POSTGRES' : 'SQLITE'}.json`), JSON.stringify({ fecha: '2026-10-07', motor: fixture.env.SYSTECH_TEST_PG_URL ? 'PostgreSQL' : 'SQLite', checks, count: checks.length, pass: true, datos: 'Ficticios; dos procesos API; sin pagos reales ni cambios a la base de trabajo' }, null, 2));
  } finally {
    for (const server of servers) if (server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill(); });
    await prisma.$disconnect(); cleanTestFixture(fixture.directory);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

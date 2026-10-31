'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { fork } = require('node:child_process');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
const root = path.resolve(__dirname, '..');
const workingHash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'packages/database/prisma/dev.db'))).digest('hex');
async function main() {
  if (Boolean(process.env.SYSTECH_TEST_PG_URL) !== Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT)) throw Error('Guarded PostgreSQL URL and separate client must be supplied together.');
  const originalHash = workingHash(), fixture = createTestFixture(); Object.assign(process.env, fixture.env);
  if (process.env.SYSTECH_TEST_PRISMA_CLIENT) require('./test_prisma_client');
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken');
  let server, base; const checks = [];
  const check = async (name, fn) => { await fn(); checks.push(name); console.log('PASS ' + name); };
  const start = () => new Promise((resolve, reject) => {
      server = fork(path.join(__dirname, 'test_server.js'), [], { env: fixture.env, execArgv: process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
      server.stderr.on('data', data => process.stderr.write(data));
      const timer = setTimeout(() => reject(Error('Local API startup timed out')), 20000);
      server.once('message', message => { clearTimeout(timer); resolve(message.base + '/api'); });
      server.once('exit', () => { clearTimeout(timer); reject(Error('Local API exited before readiness')); });
    });
  try {
    base = await start();
    const tenant = await prisma.tenant.create({ data: { nombre: 'Integrated fictional QA', slug: 'integrated-qa', plan: 'CADENA' } });
    const branch = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Integrated branch', zonaHoraria: 'America/Mexico_City', diasLaborales: 'Lunes a Domingo' } });
    const second = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Unassigned branch' } });
    const barber = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'Integrated professional', diasDescanso: '', comisionServiciosPct: 50, comisionProductosPct: 10 } });
    const users = {};
    for (const rol of ['DUENO', 'GERENTE', 'BARBERO']) users[rol] = await prisma.usuario.create({ data: { tenantId: tenant.id, sucursalId: branch.id, barberoId: rol === 'BARBERO' ? barber.id : null, nombre: rol, rol, email: rol + '@integrated.invalid', passwordHash: 'disabled-fictional' } });
    const foreign = await prisma.tenant.create({ data: { nombre: 'Other fictional tenant', slug: 'integrated-other' } });
    const foreignOwner = await prisma.usuario.create({ data: { tenantId: foreign.id, nombre: 'Other owner', rol: 'DUENO', email: 'other@integrated.invalid', passwordHash: 'disabled-fictional' } });
    const sign = user => jwt.sign({ sub: user.id, tid: user.tenantId, rol: user.rol, sv: user.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
    const req = async (endpoint, body, user = users.DUENO, method = body === undefined ? 'GET' : 'POST') => {
      const response = await fetch(base + endpoint, { method, headers: { 'content-type': 'application/json', ...(user ? { authorization: 'Bearer ' + sign(user) } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json() };
    };
    const good = async (...args) => { const response = await req(...args); assert.equal(response.status, 200, JSON.stringify(response)); return response.body; };
    const stock = async product => Number((await prisma.producto.findUniqueOrThrow({ where: { id: product.id } })).stockActual);
    const create = data => good('/productos', { sucursalId: branch.id, idempotencyKey: crypto.randomUUID(), ...data });
    let cut, supply, cutService, beardService, retail, booking, sale, preview, closed, intelligence;
    await check('Owner prepares exact-cost stock, two versioned recipes and one cash shift through the API', async () => {
      cut = await good('/cortes-caja/abrir', { sucursalId: branch.id, fondoInicial: 100, idempotencyKey: 'integrated-open' });
      supply = await create({ nombre: 'QA lotion', sku: 'INT-ML', naturaleza: 'INSUMO', unidad: 'ML', precioVenta: 0, costo: 0.2, stockActual: 500, stockMinimo: 10 });
      cutService = await create({ nombre: 'QA haircut', sku: 'INT-CUT', tipo: 'SERVICIO', precioVenta: 100, tasaImpuesto: 0, duracionMinutos: 30 });
      beardService = await create({ nombre: 'QA beard', sku: 'INT-BEARD', tipo: 'SERVICIO', precioVenta: 50, tasaImpuesto: 0, duracionMinutos: 15 });
      retail = await create({ nombre: 'QA pomade', sku: 'INT-POM', precioVenta: 80, costo: 20, stockActual: 10, stockMinimo: 9 });
      for (const [service, quantity] of [[cutService, 5], [beardService, 2]]) {
        const recipe = await good('/inventario/recetas/' + service.id, { items: [{ productoId: supply.id, unidad: 'ML', cantidad: quantity }], versionEsperada: 0, idempotencyKey: 'recipe-' + service.id });
        assert.equal(recipe.version, 1);
      }
      assert.equal(await stock(supply), 500); assert.equal(await stock(retail), 10);
    });
    const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: branch.zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = type => todayParts.find(value => value.type === type).value;
    const today = `${part('year')}-${part('month')}-${part('day')}`;
    const tomorrow = new Date(today + 'T12:00:00Z'); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); const bookedDay = tomorrow.toISOString().slice(0, 10);
    const publicInput = { tenantId: tenant.id, slug: tenant.slug, sucursalId: branch.id, barberoId: barber.id, servicioIds: [cutService?.id, beardService?.id], fechaHora: bookedDay + 'T10:00:00', clienteNombre: 'Integrated fictional customer', clienteTelefono: '5550000821', idempotencyKey: 'integrated-public-booking', precioConfirmado: 150 };
    await check('Customer reserves combined services once; public replay preserves quote, duration and customer', async () => {
      const first = await good('/public/reservar', publicInput, null), replay = await good('/public/reservar', publicInput, null);
      booking = first.cita; assert.equal(replay.cita.id, booking.id); assert.equal(booking.duracionMinutos, 45); assert.equal(Number(booking.precioEstimado), 150);
      assert.equal(await prisma.cita.count({ where: { tenantId: tenant.id } }), 1); assert.equal(await prisma.clienteFinal.count({ where: { tenantId: tenant.id } }), 1);
      const stored = await prisma.cita.findUniqueOrThrow({ where: { id: booking.id } }); assert.equal(JSON.parse(stored.serviciosJson).length, 2);
      assert.equal(booking.clienteId, undefined); booking = { ...booking, clienteId: stored.clienteId };
      assert(first.tokenCancelacion); assert.equal(first.notificacion.estado, 'REGISTRADO');
    });
    await check('Assigned barber advances own visit, completes once and consumes each recipe exactly once', async () => {
      for (const estado of ['CONFIRMADA', 'EN_CURSO', 'COMPLETADA']) await good('/citas/' + booking.id + '/status', { estado }, users.BARBERO, 'PUT');
      await good('/citas/' + booking.id + '/status', { estado: 'COMPLETADA' }, users.BARBERO, 'PUT');
      assert.equal(await stock(supply), 493); assert.equal(await prisma.consumoServicio.count({ where: { citaId: booking.id } }), 2);
      assert.equal((await prisma.clienteFinal.findUniqueOrThrow({ where: { id: booking.clienteId } })).totalVisitas, 1);
    });
    const saleInput = { sucursalId: branch.id, barberoId: barber.id, clienteId: booking?.clienteId, citaId: booking?.id, metodoPago: 'EFECTIVO', propina: 10, efectivoRecibido: 240, totalConfirmado: 240, idempotencyKey: 'integrated-barber-sale', items: [{ productoId: cutService?.id, cantidad: 1 }, { productoId: beardService?.id, cantidad: 1 }, { productoId: retail?.id, cantidad: 1 }] };
    await check('Barber collects combined visit plus retail; replay cannot duplicate sale, stock, recipe, commission or visit', async () => {
      const paid = await good('/ventas', saleInput, users.BARBERO); sale = paid.venta;
      const replay = await good('/ventas', saleInput, users.BARBERO); assert.equal(replay.venta.id, sale.id); assert.equal(replay.replayed, true);
      assert.equal(Number(sale.total), 240); assert.equal(sale.cobradoPorId, users.BARBERO.id); assert.equal(sale.corteCajaId, cut.id);
      assert.equal(await stock(supply), 493); assert.equal(await stock(retail), 9);
      assert.equal(await prisma.venta.count({ where: { citaId: booking.id } }), 1); assert.equal(await prisma.consumoServicio.count({ where: { citaId: booking.id } }), 2);
      const commissions = await prisma.comision.findMany({ where: { ventaId: sale.id } }); assert.equal(commissions.length, 1); assert.equal(Number(commissions[0].monto), 83);
      const customer = await prisma.clienteFinal.findUniqueOrThrow({ where: { id: booking.clienteId } }); assert.equal(customer.totalVisitas, 1); assert.equal(Number(customer.gastoTotal), 240);
      assert.equal(await prisma.notificacionLog.count({ where: { tenantId: tenant.id, tipo: 'VENTA_CONFIRMADA' } }), 1);
      const events = await prisma.consumoServicio.findMany({ where: { citaId: booking.id } }); assert(events.every(event => event.recetaVersion === 1));
    });
    await check('Cash remains in barber custody until owner receives it once, separate from sale and commission', async () => {
      const custody = await good('/cortes-caja/custodia', undefined, users.BARBERO); assert.equal(custody.saldos[0].saldo, 240);
      const body = { sucursalId: branch.id, usuarioId: users.BARBERO.id, monto: 240, idempotencyKey: 'integrated-handoff' };
      const receipt = await good('/cortes-caja/entrega', body), replay = await good('/cortes-caja/entrega', body); assert.equal(receipt.recibo.id, replay.recibo.id);
      assert.equal((await good('/cortes-caja/custodia', undefined, users.BARBERO)).saldos.reduce((n, row) => n + row.saldo, 0), 0);
      assert.equal(await prisma.venta.count({ where: { tenantId: tenant.id } }), 1); assert.equal(await prisma.comision.count({ where: { ventaId: sale.id } }), 1);
    });
    await check('A classified cash expense removes 25 exactly once and does not create another purchase or sale', async () => {
      const body = { sucursalId: branch.id, concepto: 'QA daily operating expense', categoria: 'SERVICIOS', fecha: today + 'T00:00:00', importe: 25, metodoPago: 'EFECTIVO', idempotencyKey: 'integrated-expense' };
      const expense = await good('/reportes/gastos', body), replay = await good('/reportes/gastos', body); assert.equal(expense.id, replay.id);
      assert.equal(expense.original.importe, 25); assert.equal(await prisma.gastoOperativo.count({ where: { tenantId: tenant.id } }), 1);
      assert.equal(await prisma.registroCaja.count({ where: { tenantId: tenant.id, tipo: 'GASTO_MENOR' } }), 1);
    });
    await check('Declared drawer 315 previews without closing, then closes and recovers the same cut', async () => {
      const body = { corteId: cut.id, conteoEfectivoReal: 315, notasCierre: 'QA counted 100 fund + 240 received - 25 expense' };
      preview = await good('/cortes-caja/previsualizar', body); assert.equal(preview.resumen.efectivoEsperado, 315); assert.equal(preview.resumen.descuadre, 0);
      assert.equal((await prisma.corteCaja.findUniqueOrThrow({ where: { id: cut.id } })).estado, 'ABIERTO');
      closed = await good('/cortes-caja/cerrar', { ...body, previsualizacionToken: preview.previsualizacionToken });
      assert.equal(closed.corte.estado, 'CERRADO'); assert.equal(closed.resumen.conteoReal, 315); assert.equal(closed.resumen.descuadre, 0);
      assert.equal((await good('/cortes-caja/cerrar', { ...body, previsualizacionToken: preview.previsualizacionToken })).replayed, true);
      assert.equal(await prisma.auditoriaLog.count({ where: { tenantId: tenant.id, accion: 'CORTE_CAJA' } }), 1);
    });
    const filters = new URLSearchParams({ sucursalId: branch.id, fechaInicio: today, fechaFin: bookedDay });
    await check('Owner intelligence reconciles original line revenue, tip, commission, retail/supply costs and expense', async () => {
      intelligence = await good('/reportes/inteligencia?' + filters);
      assert.equal(intelligence.finanzas.ventasNetas, 230); assert.equal(intelligence.finanzas.propinas, 10); assert.equal(intelligence.finanzas.comisionesDevengadas, 83);
      assert.equal(intelligence.finanzas.costoArticulos, 20); assert.equal(intelligence.finanzas.costoInsumos, 1.4); assert.equal(intelligence.finanzas.gastosOperativos, 25); assert.equal(intelligence.finanzas.comprasInventario, 0);
      assert.deepEqual(intelligence.finanzas.datosInsuficientes, []); assert.equal(intelligence.finanzas.utilidadOperativaEstimada, 100.6);
      assert.equal(intelligence.productos.porUnidades.length, 3); assert.equal(intelligence.productos.porIngresos[0].productoId, cutService.id);
      assert.equal(intelligence.ocupacion.minutosCompletados, 45); assert.equal(intelligence.productos.inventario.find(row => row.productoId === retail.id).stockActual, 9);
    });
    await check('Financial journey stays restricted to assigned managers and owners; no foreign business records leak', async () => {
      assert.equal((await req('/reportes/inteligencia?' + filters, undefined, users.GERENTE)).status, 200);
      assert.equal((await req('/reportes/inteligencia?' + filters, undefined, users.BARBERO)).status, 403);
      assert.equal((await req('/reportes/inteligencia?' + filters, undefined, foreignOwner)).status, 404);
      const otherFilters = new URLSearchParams({ sucursalId: second.id, fechaInicio: today, fechaFin: bookedDay });
      assert.equal((await req('/reportes/inteligencia?' + otherFilters, undefined, users.GERENTE)).status, 404);
      assert.equal((await req('/cortes-caja/previsualizar', { corteId: cut.id, conteoEfectivoReal: 315 }, foreignOwner)).status, 404);
    });
    await check('All final ledger balances and the untouched working database are independently confirmed', async () => {
      const drawer = 100 + Number((await prisma.registroCaja.aggregate({ where: { tenantId: tenant.id, corteCajaId: cut.id, metodoPago: 'EFECTIVO', custodiaUsuarioId: null }, _sum: { monto: true } }))._sum.monto || 0);
      assert.equal(drawer, 315); assert.equal(await stock(supply), 493); assert.equal(await stock(retail), 9);
      const supplyMoves = await prisma.kardexMovimiento.findMany({ where: { tenantId: tenant.id, productoId: supply.id, tipoMovimiento: 'CONSUMO_SERVICIO' } });
      assert.equal(supplyMoves.length, 2); assert.equal(supplyMoves.reduce((n, row) => n + Number(row.cantidad), 0), -7);
      assert.equal(workingHash(), originalHash);
    });
    await check('Process restart preserves the closed cut, custody, reports and exact recoverable sale', async () => {
      await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
      base = await start();
      const recovered = await good('/ventas/intenciones/' + saleInput.idempotencyKey, undefined, users.BARBERO);
      assert.equal(recovered.venta.id, sale.id); assert.equal(Number(recovered.venta.total), 240);
      const cuts = await good('/cortes-caja?sucursalId=' + branch.id); assert.equal(cuts.find(row => row.id === cut.id).estado, 'CERRADO');
      const report = await good('/reportes/inteligencia?' + filters); assert.deepEqual(report.finanzas, intelligence.finanzas);
      assert.equal((await good('/cortes-caja/custodia', undefined, users.BARBERO)).saldos.reduce((n, row) => n + row.saldo, 0), 0);
      assert.equal(await prisma.venta.count({ where: { tenantId: tenant.id } }), 1); assert.equal(workingHash(), originalHash);
    });
    const engine = process.env.SYSTECH_TEST_PG_URL ? 'postgres' : 'sqlite';
    fs.writeFileSync(path.join(root, `docs/evidencias/producto-completo-20261011/PC21_RECORRIDO_API_${engine}.json`), JSON.stringify({ date: new Date().toISOString(), engine, checks, passed: checks.length, browser: false, external_providers_contacted: false, working_database_unchanged: true, fixture_time_note: 'Public booking is tomorrow; status progression is accelerated through supported APIs without changing server time.', balances: { drawer: 315, supply: 493, retail: 9, revenue: 230, tips: 10, commission: 83, retailCost: 20, supplyCost: 1.4, expenses: 25, estimatedOperationalProfit: 100.6 } }, null, 2) + '\n');
    console.log(`Integrated demo API: ${checks.length}/${checks.length} passed (${engine}).`);
  } finally {
    if (server && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGTERM'); });
    await prisma.$disconnect(); cleanTestFixture(fixture.directory);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { fork } = require('node:child_process');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');

async function main() {
  // SQLite by default; PostgreSQL must use both the guarded fixture URL and
  // the separately generated test client, never the development client.
  if (Boolean(process.env.SYSTECH_TEST_PG_URL) !== Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT)) {
    throw new Error('PostgreSQL inventory tests require an isolated URL and test client together.');
  }
  const fixture = createTestFixture(); Object.assign(process.env, fixture.env);
  if (process.env.SYSTECH_TEST_PRISMA_CLIENT) require('./test_prisma_client');
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken');
  const servers = []; let checks = 0;
  const check = async (name, fn) => {
    if (process.env.INVENTORY_TEST_ONLY && !name.includes(process.env.INVENTORY_TEST_ONLY)) return;
    await fn(); checks++; console.log('PASS ' + name);
  };
  const start = async () => {
    const child = fork(path.join(__dirname, 'test_server.js'), [], { env: fixture.env, execArgv: process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    servers.push(child); child.stderr.on('data', data => process.stderr.write(data));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('API timeout')), 15000);
      child.once('message', m => { clearTimeout(timer); resolve(m.base + '/api'); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error('API exited ' + code)); });
    });
  };
  try {
    const bases = [await start(), await start()]; let index = 0;
    const tenant = await prisma.tenant.create({ data: { nombre: 'Inventario ficticio', slug: 'inventory-fixture' } });
    const branch = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Matriz' } });
    const owner = await prisma.usuario.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre: 'Dueño', rol: 'DUENO', email: 'owner@inventory.invalid', passwordHash: 'disabled' } });
    const barber = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'Profesional' } });
    const supplier = await prisma.proveedor.create({ data: { tenantId: tenant.id, nombre: 'Proveedor ficticio local' } });
    const product = await prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre: 'Cera', precioVenta: 20, stockActual: 20 } });
    const service = await prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre: 'Corte', tipo: 'SERVICIO', precioVenta: 100 } });
    const token = jwt.sign({ sub: owner.id, tid: tenant.id, rol: owner.rol, sv: owner.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
    const req = async (endpoint, body) => {
      const response = await fetch(bases[index++ % 2] + endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(body || {}) });
      return { status: response.status, body: await response.json() };
    };
    const purchase = (items) => req('/ordenes-compra', { sucursalId: branch.id, proveedorId: supplier.id, items });
    const item = (overrides = {}) => ({ productoId: product.id, cantidad: 5, costoUnitario: 10, ...overrides });
    const createOrder = async () => { const r = await purchase([item()]); assert.equal(r.status, 200, JSON.stringify(r)); return r.body.orden; };
    const snapshot = async () => ({ stock: (await prisma.producto.findUniqueOrThrow({ where: { id: product.id } })).stockActual, ledger: await prisma.kardexMovimiento.count({ where: { tenantId: tenant.id } }) });
    await check('Invalid purchase quantities, costs and services are rejected before creating orders', async () => {
      const before = await snapshot();
      for (const invalid of [{ cantidad: 1.5 }, { cantidad: 0 }, { cantidad: -1 }, { cantidad: 'Infinity' }, { cantidad: null }, { cantidad: true }, { costoUnitario: -1 }, { costoUnitario: 'Infinity' }, { costoUnitario: 'bad' }, { productoId: service.id }]) {
        const r = await purchase([item(invalid)]); assert.equal(r.status, 400, JSON.stringify({ invalid, r }));
      }
      assert.equal(await prisma.ordenCompra.count({ where: { tenantId: tenant.id } }), 0);
      assert.deepEqual(await snapshot(), before);
    });
    await check('Manual movements reject services and invalid quantities without changing stock or ledger', async () => {
      const before = await snapshot();
      for (const bad of [{ cantidad: 1.5 }, { cantidad: 0 }, { cantidad: -1 }, { cantidad: 'Infinity' }, { cantidad: null }, { cantidad: true }, { productoId: service.id }]) {
        const r = await req('/inventario/movimiento', { productoId: product.id, tipoMovimiento: 'ENTRADA_COMPRA', cantidad: 1, ...bad });
        assert.equal(r.status, 400, JSON.stringify({ bad, r }));
      }
      assert.deepEqual(await snapshot(), before);
      assert.equal((await prisma.producto.findUniqueOrThrow({ where: { id: service.id } })).stockActual, 0);
    });
    await check('Eight concurrent receipts across two processes and a later retry increment exactly once', async () => {
      const order = await createOrder();
      const replies = await Promise.all(Array.from({ length: 8 }, () => req(`/ordenes-compra/${order.id}/recibir`)));
      assert(replies.every(r => r.status === 200), JSON.stringify(replies));
      assert.equal(replies.filter(r => !r.body.replayed).length, 1);
      assert.equal((await req(`/ordenes-compra/${order.id}/recibir`)).body.replayed, true);
      assert.equal((await snapshot()).stock, 25); assert.equal((await snapshot()).ledger, 1);
      assert.equal(await prisma.auditoriaLog.count({ where: { tenantId: tenant.id, accion: 'RECEPCION_ORDEN_COMPRA' } }), 1);
    });
    await check('Receipts concurrent with POS preserve every stock transition and reconcile the ledger', async () => {
      const orders = await Promise.all(Array.from({ length: 4 }, createOrder));
      const replies = await Promise.all([
        ...orders.map(o => req(`/ordenes-compra/${o.id}/recibir`)),
        ...Array.from({ length: 4 }, (_, i) => req('/ventas', { sucursalId: branch.id, barberoId: barber.id, metodoPago: 'EFECTIVO', items: [{ productoId: product.id, cantidad: 2 }], idempotencyKey: 'inventory-sale-' + i }))
      ]);
      assert(replies.every(r => r.status === 200), JSON.stringify(replies));
      const moves = await prisma.kardexMovimiento.findMany({ where: { productoId: product.id } });
      assert.equal(moves.length, 9);
      let stock = 20; const remaining = [...moves];
      while (remaining.length) {
        const next = remaining.findIndex(m => m.stockAnterior === stock);
        assert(next >= 0, 'Broken Kardex chain at stock ' + stock + ': ' + JSON.stringify(remaining));
        const [move] = remaining.splice(next, 1); assert.equal(move.stockNuevo, move.stockAnterior + move.cantidad); stock = move.stockNuevo;
      }
      assert.equal(stock, 37); assert.equal((await snapshot()).stock, stock);
    });
    await check('Cancellation racing a receipt leaves either one receipt or a cancelled order with no movement', async () => {
      const order = await createOrder(), before = await snapshot();
      const replies = await Promise.all([req(`/ordenes-compra/${order.id}/recibir`), req(`/ordenes-compra/${order.id}/cancelar`)]);
      assert(replies.every(r => [200, 409].includes(r.status)), JSON.stringify(replies));
      const current = await prisma.ordenCompra.findUniqueOrThrow({ where: { id: order.id } });
      const after = await snapshot();
      assert.equal(after.stock, before.stock + (current.estado === 'RECIBIDA' ? 5 : 0));
      assert.equal(after.ledger, before.ledger + (current.estado === 'RECIBIDA' ? 1 : 0));
      assert(['RECIBIDA', 'CANCELADA'].includes(current.estado));
    });
    await check('Historical invalid items roll back reception status, product stock, cost, ledger and audit', async () => {
      const before = await snapshot();
      const original = await prisma.producto.findUniqueOrThrow({ where: { id: product.id } });
      const auditBefore = await prisma.auditoriaLog.count({ where: { tenantId: tenant.id, accion: 'RECEPCION_ORDEN_COMPRA' } });
      for (const invalid of [item({ cantidad: 1.5 }), item({ costoUnitario: -1 }), item({ productoId: service.id })]) {
        // Simulate legacy order data; the service line fails after the first valid line was applied.
        const order = await prisma.ordenCompra.create({ data: { tenantId: tenant.id, sucursalId: branch.id, proveedorId: supplier.id, folio: 'LEGACY-' + Math.random(), total: 50, notas: JSON.stringify({ items: [item({ costoUnitario: 99 }), invalid] }) } });
        const result = await req(`/ordenes-compra/${order.id}/recibir`);
        assert.equal(result.status, 400, JSON.stringify(result));
        const current = await prisma.ordenCompra.findUniqueOrThrow({ where: { id: order.id } });
        assert.equal(current.estado, 'PENDIENTE'); assert.equal(current.fechaEntrega, null);
        assert.deepEqual(await snapshot(), before);
        assert.equal(Number((await prisma.producto.findUniqueOrThrow({ where: { id: product.id } })).costo), Number(original.costo));
        assert.equal(await prisma.auditoriaLog.count({ where: { tenantId: tenant.id, accion: 'RECEPCION_ORDEN_COMPRA' } }), auditBefore);
      }
    });
    console.log(`PASS ${checks} inventory integrity checks; disposable ${process.env.SYSTECH_TEST_PG_URL ? 'PostgreSQL' : 'SQLite'}; no external integrations.`);
  } finally {
    await Promise.all(servers.map(child => new Promise(resolve => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); })));
    await prisma.$disconnect(); cleanTestFixture(fixture.directory);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

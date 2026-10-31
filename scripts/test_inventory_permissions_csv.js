'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { fork } = require('node:child_process');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');

// Parse quoted commas, escaped quotes and embedded newlines, rather than split(',').
function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === ',' || c === '\n')) { row.push(field); field = ''; if (c === '\n') { rows.push(row); row = []; } }
    else if (!(c === '\r' && !quoted) && c !== '\uFEFF') field += c;
  }
  assert.equal(quoted, false, 'CSV has an unclosed quoted field');
  if (field || row.length) rows.push([...row, field]); return rows;
}
async function main() {
  if (Boolean(process.env.SYSTECH_TEST_PG_URL) !== Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT)) throw new Error('PostgreSQL requires isolated URL and generated test client together.');
  const fixture = createTestFixture(); Object.assign(process.env, fixture.env);
  if (process.env.SYSTECH_TEST_PRISMA_CLIENT) require('./test_prisma_client');
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken');
  let child, checks = 0;
  const check = async (name, fn) => { await fn(); checks++; console.log('PASS ' + name); };
  try {
    child = fork(path.join(__dirname, 'test_server.js'), [], { env: fixture.env, execArgv: process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    child.stderr.on('data', d => process.stderr.write(d));
    const base = await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('API timeout')), 15000); child.once('message', m => { clearTimeout(timer); resolve(m.base + '/api'); }); child.once('exit', c => { clearTimeout(timer); reject(new Error('API exited ' + c)); }); });
    const setup = async (name) => {
      const tenant = await prisma.tenant.create({ data: { nombre: 'Inventory ' + name, slug: 'permissions-' + name, plan: 'CADENA' } });
      const branches = await Promise.all([1, 2].map(i => prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: name + i } })));
      const barber = await prisma.barbero.create({ data: { sucursalId: branches[0].id, nombre: 'Profesional ' + name } });
      const users = {};
      for (const role of ['DUENO', 'GERENTE', 'CAJERO', 'BARBERO', 'SUPER_ADMIN']) users[role] = await prisma.usuario.create({ data: { tenantId: tenant.id, sucursalId: branches[0].id, barberoId: role === 'BARBERO' ? barber.id : null, nombre: role, email: name + '-' + role + '@permissions.invalid', passwordHash: 'disabled', rol: role } });
      const products = await Promise.all(branches.map((branch, i) => prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre: name + ' product ' + i, precioVenta: 10.01, costo: 3, stockActual: 10 } })));
      for (const product of products) await prisma.kardexMovimiento.create({ data: { tenantId: tenant.id, sucursalId: product.sucursalId, productoId: product.id, tipoMovimiento: 'ENTRADA_COMPRA', cantidad: 10, stockAnterior: 0, stockNuevo: 10, motivo: 'Fixture only' } });
      const supplier = await prisma.proveedor.create({ data: { tenantId: tenant.id, nombre: 'Supplier ' + name } });
      const orders = await Promise.all(branches.map((branch, i) => prisma.ordenCompra.create({ data: { tenantId: tenant.id, sucursalId: branch.id, proveedorId: supplier.id, folio: name + '-OC-' + i, total: 6, notas: JSON.stringify({ items: [{ productoId: products[i].id, cantidad: 2, costoUnitario: 3 }] }) } })));
      return { tenant, branches, barber, users, products, supplier, orders };
    };
    const a = await setup('A'), b = await setup('B');
    const common = await prisma.producto.create({ data: { tenantId: a.tenant.id, nombre: 'Common A', precioVenta: 10, stockActual: 0 } });
    const req = async (user, endpoint, body, method = body === undefined ? 'GET' : 'POST') => {
      const token = jwt.sign({ sub: user.id, tid: user.tenantId, rol: user.rol, sv: user.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
      const res = await fetch(base + endpoint, { method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text() };
    };
    const owner = a.users.DUENO, manager = a.users.GERENTE;
    const snapshot = async () => ({ products: await prisma.producto.findMany({ orderBy: { id: 'asc' } }), orders: await prisma.ordenCompra.findMany({ orderBy: { id: 'asc' } }), suppliers: await prisma.proveedor.findMany({ orderBy: { id: 'asc' } }), kardex: await prisma.kardexMovimiento.count() });
    const rejectWithoutChanges = async (user, endpoint, body, method, status) => {
      const before = await snapshot(), r = await req(user, endpoint, body, method);
      assert.equal(r.status, status, JSON.stringify({ endpoint, r })); assert.deepEqual(await snapshot(), before);
    };
    const orderInput = (branch = a.branches[0], supplier = a.supplier, product = a.products[0]) => ({ sucursalId: branch.id, proveedorId: supplier.id, items: [{ productoId: product.id, cantidad: 2, costoUnitario: 3 }] });
    const movement = (product) => ({ productoId: product.id, cantidad: 1, tipoMovimiento: 'ENTRADA_COMPRA', motivo: 'Authorized fixture' });
    await check('Catalog and Kardex reads isolate two tenants and two branches, retaining the shared catalog', async () => {
      const own = await req(owner, '/productos'); assert.equal(own.status, 200); assert.deepEqual(new Set(own.body.map(p => p.id)), new Set([...a.products.map(p => p.id), common.id]));
      for (const role of ['GERENTE', 'CAJERO', 'BARBERO']) { const r = await req(a.users[role], '/productos'); assert.equal(r.status, 200); assert.deepEqual(new Set(r.body.map(p => p.id)), new Set([a.products[0].id, common.id])); }
      const ledger = await req(manager, '/inventario/kardex'); assert.equal(ledger.status, 200); assert(ledger.body.length); assert(ledger.body.every(m => m.sucursalId === a.branches[0].id));
      for (const id of [a.products[1].id, b.products[0].id]) assert.equal((await req(manager, '/inventario/kardex?productoId=' + id)).status, 404);
      assert.equal((await req(owner, '/productos?sucursalId=' + b.branches[0].id)).status, 404);
    });
    await check('Cashier, barber and platform cannot write products, inventory, suppliers or orders, nor read restricted ledgers/exports', async () => {
      for (const role of ['CAJERO', 'BARBERO', 'SUPER_ADMIN']) {
        const user = a.users[role];
        for (const endpoint of ['/inventario/kardex', '/proveedores', '/ordenes-compra', '/reportes/exportar/ventas-csv']) assert.equal((await req(user, endpoint)).status, 403, role + endpoint);
        for (const [endpoint, body, method] of [['/productos', { sucursalId: a.branches[0].id, nombre: 'Forbidden', precioVenta: 1 }, 'POST'], ['/productos/' + a.products[0].id, { nombre: 'Forbidden' }, 'PUT'], ['/inventario/movimiento', movement(a.products[0]), 'POST'], ['/proveedores', { nombre: 'Forbidden' }, 'POST'], ['/ordenes-compra', orderInput(), 'POST'], ['/ordenes-compra/' + a.orders[0].id + '/recibir', {}, 'POST'], ['/ordenes-compra/' + a.orders[0].id + '/cancelar', {}, 'POST']]) await rejectWithoutChanges(user, endpoint, body, method, 403);
      }
    });
    await check('Manager product writes and movements work in assigned branch; other branches, tenants and common writes fail', async () => {
      const image = 'data:image/jpeg;base64,/9j/AA==';
      const created = await req(manager, '/productos', { sucursalId: a.branches[0].id, nombre: 'Managed product', precioVenta: 5, imagen: image }); assert.equal(created.status, 200); assert.equal(created.body.imagen, image);
      assert.equal((await req(manager, '/productos')).body.find(product => product.id === created.body.id).imagen, image);
      const renamed = await req(manager, '/productos/' + created.body.id, { nombre: 'Managed renamed', imagen: null }, 'PUT'); assert.equal(renamed.status, 200); assert.equal(renamed.body.imagen, null);
      assert.equal((await req(manager, '/productos/' + created.body.id, { imagen: 'https://invalid.example/photo.jpg' }, 'PUT')).status, 400);
      const r = await req(manager, '/inventario/movimiento', movement(a.products[0])); assert.equal(r.status, 200); assert.equal(r.body.producto.stockActual, 11); assert.equal(r.body.kardex.usuarioId, manager.id);
      for (const product of [a.products[1], b.products[0]]) { await rejectWithoutChanges(manager, '/inventario/movimiento', movement(product), 'POST', 404); await rejectWithoutChanges(manager, '/productos/' + product.id, { nombre: 'Forbidden' }, 'PUT', 404); }
      for (const endpoint of ['/productos/' + common.id, '/inventario/movimiento']) await rejectWithoutChanges(manager, endpoint, endpoint.startsWith('/productos/') ? { nombre: 'Forbidden' } : movement(common), endpoint.startsWith('/productos/') ? 'PUT' : 'POST', 403);
      await rejectWithoutChanges(owner, '/inventario/movimiento', movement(b.products[0]), 'POST', 404);
      assert.equal((await req(owner, '/inventario/movimiento', movement(a.products[1]))).status, 200);
    });
    await check('Supplier directory is tenant scoped; owner CRUD works while manager writes and foreign IDs fail', async () => {
      const suppliers = await req(manager, '/proveedores'); assert.equal(suppliers.status, 200); assert.deepEqual(suppliers.body.map(s => s.id), [a.supplier.id]);
      const created = await req(owner, '/proveedores', { nombre: 'Owner supplier' }); assert.equal(created.status, 200);
      assert.equal((await req(owner, '/proveedores/' + created.body.id, { nombre: 'Renamed supplier' }, 'PUT')).status, 200);
      assert.equal((await req(owner, '/proveedores/' + created.body.id, {}, 'DELETE')).status, 200);
      for (const [endpoint, body, method] of [['/proveedores', { nombre: 'Forbidden' }, 'POST'], ['/proveedores/' + a.supplier.id, { nombre: 'Forbidden' }, 'PUT'], ['/proveedores/' + a.supplier.id, {}, 'DELETE']]) await rejectWithoutChanges(manager, endpoint, body, method, 403);
      await rejectWithoutChanges(owner, '/proveedores/' + b.supplier.id, { nombre: 'Forbidden' }, 'PUT', 404);
      await rejectWithoutChanges(owner, '/proveedores/' + b.supplier.id, {}, 'DELETE', 404);
    });
    await check('Purchase creation, reception and cancellation enforce manager branch and owner tenant, with positive permitted writes', async () => {
      const list = await req(manager, '/ordenes-compra'); assert.equal(list.status, 200); assert.deepEqual(list.body.map(o => o.id), [a.orders[0].id]);
      assert.equal((await req(owner, '/ordenes-compra')).body.length, 2);
      for (const foreign of [a.orders[1], b.orders[0]]) for (const action of ['recibir', 'cancelar']) await rejectWithoutChanges(manager, '/ordenes-compra/' + foreign.id + '/' + action, {}, 'POST', 404);
      for (const input of [orderInput(a.branches[1], a.supplier, a.products[1]), orderInput(b.branches[0], b.supplier, b.products[0]), orderInput(a.branches[0], b.supplier), orderInput(a.branches[0], a.supplier, b.products[0]), orderInput(a.branches[0], a.supplier, a.products[1])]) await rejectWithoutChanges(manager, '/ordenes-compra', input, 'POST', 404);
      await rejectWithoutChanges(owner, '/ordenes-compra/' + b.orders[0].id + '/recibir', {}, 'POST', 404);
      const created = await req(manager, '/ordenes-compra', orderInput()); assert.equal(created.status, 200);
      assert.equal((await req(manager, '/ordenes-compra/' + created.body.orden.id + '/cancelar', {})).status, 200);
      const before = await prisma.producto.findUniqueOrThrow({ where: { id: a.products[0].id } });
      assert.equal((await req(manager, '/ordenes-compra/' + a.orders[0].id + '/recibir', {})).status, 200);
      assert.equal(Number((await prisma.producto.findUniqueOrThrow({ where: { id: a.products[0].id } })).stockActual), Number(before.stockActual) + 2);
      assert.equal((await req(owner, '/ordenes-compra/' + a.orders[1].id + '/cancelar', {})).status, 200);
    });
    await check('CSV parses fourteen columns and reconciles sale, partial return, net and historical collector without leaking branches', async () => {
      const customer = await prisma.clienteFinal.create({ data: { tenantId: a.tenant.id, sucursalOrigenId: a.branches[0].id, nombre: '=Cliente, "prueba"\nsegunda línea' } });
      const sale = await req(owner, '/ventas', { sucursalId: a.branches[0].id, barberoId: a.barber.id, clienteId: customer.id, metodoPago: 'TARJETA', items: [{ productoId: a.products[0].id, cantidad: 3 }], idempotencyKey: 'csv-sale' }); assert.equal(sale.status, 200, JSON.stringify(sale));
      const sold = sale.body.venta;
      const refund = await req(owner, '/ventas/' + sold.id + '/devolver', { motivo: 'Devolución CSV fixture', items: [{ itemId: sold.items[0].id, cantidad: 1 }], idempotencyKey: 'csv-return' }); assert.equal(refund.status, 200, JSON.stringify(refund));
      // A neighbouring branch must be omitted even from the raw CSV response.
      const otherBarber = await prisma.barbero.create({ data: { sucursalId: a.branches[1].id, nombre: 'Hidden professional' } });
      await prisma.venta.create({ data: { tenantId: a.tenant.id, sucursalId: a.branches[1].id, barberoId: otherBarber.id, folio: 'HIDDEN-BRANCH', total: 1, metodoPago: 'TARJETA' } });
      await prisma.venta.create({ data: { tenantId: b.tenant.id, sucursalId: b.branches[0].id, barberoId: b.barber.id, folio: 'HIDDEN-TENANT', total: 1, metodoPago: 'TARJETA' } });
      await prisma.usuario.update({ where: { id: owner.id }, data: { email: 'changed-owner@permissions.invalid', nombre: 'Changed owner name' } });
      const csv = await req(manager, '/reportes/exportar/ventas-csv'); assert.equal(csv.status, 200);
      const rows = parseCsv(csv.body); assert.equal(rows[0].length, 14); assert(rows.slice(1).every(row => row.length === rows[0].length));
      assert.equal(rows.length, 2); const row = Object.fromEntries(rows[0].map((key, i) => [key, rows[1][i]]));
      assert.equal(row.Folio, sold.folio); assert.equal(row.Cliente, "'" + customer.nombre); assert.equal(row.Total, '30.03'); assert.equal(row.Devuelto, '10.01'); assert.equal(row.TotalNeto, '20.02'); assert.equal(row.Estado, 'PARCIAL_DEVUELTA'); assert.equal(row.CobradoPor, owner.nombre);
      const current = await prisma.venta.findUniqueOrThrow({ where: { id: sold.id }, include: { devoluciones: true } });
      assert.equal(row.Devuelto, current.totalDevuelto.toFixed(2)); assert.equal(row.TotalNeto, current.total.minus(current.totalDevuelto).toFixed(2)); assert.equal(current.devoluciones.length, 1);
      assert.equal(csv.body.includes('HIDDEN-BRANCH'), false); assert.equal(csv.body.includes('HIDDEN-TENANT'), false);
      assert.equal((await req(manager, '/reportes/exportar/ventas-csv?sucursalId=' + a.branches[1].id)).status, 404);
    });
    console.log(`PASS ${checks} inventory permission / CSV checks; ${process.env.SYSTECH_TEST_PG_URL ? 'PostgreSQL isolated schema' : 'SQLite disposable fixture'}; no external integrations.`);
  } finally {
    if (child && child.exitCode === null) await new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM'); });
    await prisma.$disconnect(); cleanTestFixture(fixture.directory);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

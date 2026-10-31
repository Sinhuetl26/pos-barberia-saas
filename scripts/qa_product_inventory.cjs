'use strict';
// Independent acceptance tests. Every write targets a disposable fixture, never a demo DB.
const assert = require('node:assert/strict');
const path = require('node:path');
const { fork } = require('node:child_process');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
async function main() {
  if (Boolean(process.env.SYSTECH_TEST_PG_URL) !== Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT)) throw new Error('PG requires guarded test URL and separate client together.');
  const fixture = createTestFixture(); Object.assign(process.env, fixture.env);
  if (process.env.SYSTECH_TEST_PRISMA_CLIENT) require('./test_prisma_client');
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken');
  const servers = []; let checks = 0;
  const check = async (name, action) => { if (process.env.QA_INVENTORY_ONLY && !name.includes(process.env.QA_INVENTORY_ONLY)) return; await action(); checks++; console.log('PASS ' + name); };
  const start = async () => {
    const child = fork(path.join(__dirname, 'test_server.js'), [], { env: fixture.env, execArgv: process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    servers.push(child); child.stderr.on('data', d => process.stderr.write(d));
    return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Temporary API timeout')), 20000); child.once('message', m => { clearTimeout(timer); resolve(m.base + '/api'); }); child.once('exit', c => { clearTimeout(timer); reject(new Error('API exited ' + c)); }); });
  };
  try {
    const bases = [await start(), await start()]; let counter = 0;
    const setup = async name => {
      const tenant = await prisma.tenant.create({ data: { nombre: 'QA ' + name, slug: 'qa-inventory-' + name, plan: 'CADENA' } });
      const branches = await Promise.all([1, 2].map(n => prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'QA branch ' + n } })));
      const users = {};
      for (const role of ['DUENO', 'GERENTE', 'BARBERO', 'CAJERO']) users[role] = await prisma.usuario.create({ data: { tenantId: tenant.id, sucursalId: branches[0].id, rol: role, nombre: 'QA ' + role, email: name + role + '@qa.invalid', passwordHash: 'disabled' } });
      return { tenant, branches, users };
    };
    const a = await setup('a'), b = await setup('b'); const owner = a.users.DUENO;
    const req = async (user, endpoint, body, key, method = 'POST') => {
      const token = jwt.sign({ sub: user.id, tid: user.tenantId, rol: user.rol, sv: user.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
      const r = await fetch(bases[counter++ % 2] + endpoint, { method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: r.status, body: await r.json() };
    };
    const input = (shop, name, stock = 10) => ({ sucursalId: shop.branches[0].id, nombre: name, sku: name, precioVenta: 20, costo: 4, stockActual: stock });
    const snapshot = async productId => { const product = await prisma.producto.findUnique({ where: { id: productId } }); const moves = await prisma.kardexMovimiento.findMany({ where: { productoId: productId }, orderBy: { id: 'asc' } }); return { product: product ? { ...product, stockActual: Number(product.stockActual) } : null, ledger: moves.map(m => ({ ...m, cantidad: Number(m.cantidad), stockAnterior: Number(m.stockAnterior), stockNuevo: Number(m.stockNuevo) })) }; };
    await check('Initial stock creation retries across API processes create one product and one initial ledger', async () => {
      const data = input(a, 'QA-INITIAL');
      const results = await Promise.all(Array.from({ length: 6 }, () => req(owner, '/productos', data, 'qa-initial')));
      assert(results.every(r => r.status === 200), JSON.stringify(results));
      assert.equal(new Set(results.map(r => r.body.id)).size, 1);
      const products = await prisma.producto.findMany({ where: { tenantId: a.tenant.id, sku: data.sku } }); assert.equal(products.length, 1);
      const moves = await prisma.kardexMovimiento.findMany({ where: { productoId: products[0].id } }); assert.equal(moves.length, 1); assert.equal(Number(moves[0].cantidad), 10); assert.equal(Number(moves[0].stockAnterior), 0); assert.equal(Number(moves[0].stockNuevo), 10);
      const conflict = await req(owner, '/productos', { ...data, stockActual: 11 }, 'qa-initial'); assert.equal(conflict.status, 409, JSON.stringify(conflict));
    });
    const created = await req(owner, '/productos', input(a, 'QA-MOVES'), 'qa-moves-create'); assert.equal(created.status, 200, JSON.stringify(created)); const product = created.body;
    const move = (changes = {}) => ({ productoId: product.id, tipoMovimiento: 'ENTRADA_COMPRA', cantidad: 2, motivo: 'QA fixture purchase', costoUnitario: 7.25, referencia: 'QA-DOC', ...changes });
    await check('Lost movement response recovers stored result and rejects changed payload', async () => {
      const first = await req(owner, '/inventario/movimiento', move(), 'qa-response-lost'); assert.equal(first.status, 200, JSON.stringify(first));
      const after = await snapshot(product.id);
      const replay = await req(owner, '/inventario/movimiento', move(), 'qa-response-lost'); assert.equal(replay.status, 200, JSON.stringify(replay)); assert.equal(replay.body.kardex.id, first.body.kardex.id); assert.deepEqual(await snapshot(product.id), after);
      const conflict = await req(owner, '/inventario/movimiento', move({ cantidad: 3 }), 'qa-response-lost'); assert.equal(conflict.status, 409, JSON.stringify(conflict)); assert.deepEqual(await snapshot(product.id), after);
    });
    await check('Foreign tenant cannot retrieve replay by stealing intention and product identifiers', async () => {
      const before = await snapshot(product.id); const result = await req(b.users.DUENO, '/inventario/movimiento', move(), 'qa-response-lost'); assert([403, 404].includes(result.status), JSON.stringify(result)); assert.deepEqual(await snapshot(product.id), before);
    });
    await check('Absolute adjustment without current reference cannot silently overwrite concurrent stock', async () => {
      const before = await snapshot(product.id);
      const missing = await req(owner, '/inventario/movimiento', move({ tipoMovimiento: 'AJUSTE_INVENTARIO', cantidad: 3 }), 'qa-no-ref'); assert.equal(missing.status, 409, JSON.stringify(missing));
      const stale = await req(owner, '/inventario/movimiento', move({ tipoMovimiento: 'AJUSTE_INVENTARIO', cantidad: 3, stockEsperado: before.product.stockActual - 1 }), 'qa-stale'); assert.equal(stale.status, 409, JSON.stringify(stale)); assert.deepEqual(await snapshot(product.id), before);
    });
    await check('Concurrent independent movements preserve each ledger transition and one final balance', async () => {
      const before = await snapshot(product.id);
      const results = await Promise.all(Array.from({ length: 8 }, (_, i) => req(owner, '/inventario/movimiento', move({ cantidad: 1, motivo: 'QA simultaneous ' + i }), 'qa-concurrent-' + i))); assert(results.every(r => r.status === 200), JSON.stringify(results));
      const after = await snapshot(product.id); assert.equal(after.product.stockActual, before.product.stockActual + 8);
      const previous = new Set(before.ledger.map(m => m.id)); const remaining = after.ledger.filter(m => !previous.has(m.id)); assert.equal(remaining.length, 8); let stock = before.product.stockActual;
      while (remaining.length) { const index = remaining.findIndex(m => m.stockAnterior === stock); assert(index >= 0, 'Ledger chain broken at ' + stock); const [m] = remaining.splice(index, 1); assert.equal(m.stockNuevo, m.stockAnterior + m.cantidad); stock = m.stockNuevo; } assert.equal(stock, after.product.stockActual);
    });
    await check('Catalog editing does not change stock outside ledger', async () => {
      const before = await snapshot(product.id); const result = await req(owner, '/productos/' + product.id, { stockActual: 9999 }, undefined, 'PUT'); assert([200, 400, 409].includes(result.status)); const after = await snapshot(product.id); assert.equal(after.product.stockActual, before.product.stockActual); assert.deepEqual(after.ledger, before.ledger);
    });
    await check('Historical movement metadata survives changing catalog cost; outflow is not a sale', async () => {
      const before = await snapshot(product.id), ledger = before.ledger.find(m => m.motivo === 'QA fixture purchase'); assert(ledger);
      const metadata = JSON.parse(ledger.metadataJson); assert.equal(metadata.costoUnitario, 7.25); assert.equal(metadata.referencia, 'QA-DOC'); assert.equal(ledger.usuarioId, owner.id);
      assert.equal((await req(owner, '/productos/' + product.id, { costo: 19 }, undefined, 'PUT')).status, 200);
      assert.equal((await prisma.kardexMovimiento.findUniqueOrThrow({ where: { id: ledger.id } })).metadataJson, ledger.metadataJson);
      const sales = await prisma.venta.count({ where: { tenantId: a.tenant.id } }); const waste = await req(owner, '/inventario/movimiento', move({ tipoMovimiento: 'MERMA_DEVOLUCION', cantidad: 1, motivo: 'QA damaged item' }), 'qa-waste'); assert.equal(waste.status, 200, JSON.stringify(waste)); assert.equal(Number(waste.body.producto.stockActual), before.product.stockActual - 1); assert.equal(await prisma.venta.count({ where: { tenantId: a.tenant.id } }), sales);
    });
    await check('Revoked branch access cannot recover a cached movement from its previous branch', async () => {
      const manager = a.users.GERENTE, body = move({ cantidad: 1, motivo: 'QA previous manager branch' });
      const original = await req(manager, '/inventario/movimiento', body, 'qa-manager-replay'); assert.equal(original.status, 200, JSON.stringify(original));
      await prisma.usuario.update({ where: { id: manager.id }, data: { sucursalId: a.branches[1].id } });
      try { const replay = await req(manager, '/inventario/movimiento', body, 'qa-manager-replay'); assert([403, 404].includes(replay.status), JSON.stringify(replay)); }
      finally { await prisma.usuario.update({ where: { id: manager.id }, data: { sucursalId: a.branches[0].id } }); }
    });
    await check('SKU uniqueness spans branches without leaking the hidden product; simultaneous different intents cannot duplicate SKU', async () => {
      await prisma.producto.create({ data: { tenantId: a.tenant.id, sucursalId: a.branches[1].id, nombre: 'Private branch product', sku: 'QA-HIDDEN-SKU', precioVenta: 10 } });
      const denied = await req(a.users.GERENTE, '/productos', input(a, 'QA-HIDDEN-SKU', 0), 'qa-hidden-sku'); assert.equal(denied.status, 409, JSON.stringify(denied)); assert.equal(JSON.stringify(denied).includes('Private branch product'), false);
      const replies = await Promise.all(Array.from({ length: 4 }, (_, n) => req(owner, '/productos', input(a, 'QA-SAME-SKU', 0), 'qa-sku-intent-' + n))); assert.equal(replies.filter(r => r.status === 200).length, 1, JSON.stringify(replies)); assert.equal(replies.filter(r => r.status === 409).length, 3, JSON.stringify(replies));
      assert.equal(await prisma.producto.count({ where: { tenantId: a.tenant.id, sku: 'QA-SAME-SKU' } }), 1);
    });
    await check('Injected ledger failure rolls back initial product and existing stock on both database engines', async () => {
      // Trigger only our disposable fixture: intentionally fail every new Kardex insert.
      if (process.env.SYSTECH_TEST_PG_URL) {
        await prisma.$executeRawUnsafe("CREATE FUNCTION qa_fail_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'QA injected ledger failure'; END $$");
        await prisma.$executeRawUnsafe('CREATE TRIGGER qa_fail_ledger BEFORE INSERT ON "KardexMovimiento" FOR EACH ROW EXECUTE FUNCTION qa_fail_ledger()');
      } else await prisma.$executeRawUnsafe("CREATE TRIGGER qa_fail_ledger BEFORE INSERT ON KardexMovimiento BEGIN SELECT RAISE(ABORT, 'QA injected ledger failure'); END");
      try {
        const before = await snapshot(product.id), count = await prisma.producto.count({ where: { tenantId: a.tenant.id } });
        const auditCount = await prisma.auditoriaLog.count({ where: { tenantId: a.tenant.id } });
        const operationCount = prisma.inventarioOperacion ? await prisma.inventarioOperacion.count({ where: { tenantId: a.tenant.id } }) : null;
        const initial = await req(owner, '/productos', input(a, 'QA-ROLLBACK'), 'qa-create-failure'); assert.equal(initial.status, 500, JSON.stringify(initial)); assert.equal(await prisma.producto.count({ where: { tenantId: a.tenant.id } }), count);
        const moving = await req(owner, '/inventario/movimiento', move(), 'qa-move-failure'); assert.equal(moving.status, 500, JSON.stringify(moving)); assert.deepEqual(await snapshot(product.id), before);
        assert.equal(await prisma.auditoriaLog.count({ where: { tenantId: a.tenant.id } }), auditCount);
        if (operationCount !== null) assert.equal(await prisma.inventarioOperacion.count({ where: { tenantId: a.tenant.id } }), operationCount);
      } finally { await prisma.$executeRawUnsafe('DROP TRIGGER qa_fail_ledger' + (process.env.SYSTECH_TEST_PG_URL ? ' ON "KardexMovimiento"' : '')); if (process.env.SYSTECH_TEST_PG_URL) await prisma.$executeRawUnsafe('DROP FUNCTION qa_fail_ledger()'); }
      const retry = await req(owner, '/productos', input(a, 'QA-ROLLBACK'), 'qa-create-failure'); assert.equal(retry.status, 200, JSON.stringify(retry));
      assert.equal((await req(owner, '/inventario/movimiento', move(), 'qa-move-failure')).status, 200);
    });
    console.log('PASS ' + checks + ' independent inventory acceptance checks on ' + (process.env.SYSTECH_TEST_PG_URL ? 'isolated PostgreSQL' : 'disposable SQLite'));
  } finally { await Promise.all(servers.map(child => new Promise(resolve => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); }))); await prisma.$disconnect(); cleanTestFixture(fixture.directory); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

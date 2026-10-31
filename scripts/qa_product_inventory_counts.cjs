'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { fork } = require('node:child_process');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
async function main() {
  if (Boolean(process.env.SYSTECH_TEST_PG_URL) !== Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT)) throw new Error('PG requires guarded test URL and separate client together.');
  const fixture = createTestFixture(); Object.assign(process.env, fixture.env);
  if (process.env.SYSTECH_TEST_PRISMA_CLIENT) require('./test_prisma_client');
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken'); const servers = []; let checks = 0;
  const check = async (name, action) => { await action(); checks++; console.log('PASS ' + name); };
  const start = async () => { const child = fork(path.join(__dirname, 'test_server.js'), [], { env: fixture.env, execArgv: process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] }); servers.push(child); child.stderr.on('data', d => process.stderr.write(d)); return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('API timeout')), 20000); child.once('message', m => { clearTimeout(timer); resolve(m.base + '/api'); }); child.once('exit', c => { clearTimeout(timer); reject(new Error('API exited ' + c)); }); }); };
  try {
    const bases = [await start(), await start()]; let index = 0;
    const setup = async name => {
      const tenant = await prisma.tenant.create({ data: { nombre: 'Count QA ' + name, slug: 'qa-count-' + name, plan: 'CADENA' } });
      const branches = await Promise.all([1, 2].map(n => prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Count branch ' + n } })));
      const users = {};
      for (const role of ['DUENO', 'GERENTE', 'BARBERO']) users[role] = await prisma.usuario.create({ data: { tenantId: tenant.id, sucursalId: branches[0].id, nombre: role, rol: role, email: name + role + '@qa.invalid', passwordHash: 'disabled' } });
      const products = await Promise.all([0, 1, 2].map(n => prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branches[n === 2 ? 1 : 0].id, nombre: 'Count item ' + n, precioVenta: 20, costo: 4, stockActual: 10 } })));
      const barber = await prisma.barbero.create({ data: { sucursalId: branches[0].id, nombre: 'Fixture barber' } });
      return { tenant, branches, users, products, barber };
    };
    const a = await setup('a'), b = await setup('b'), owner = a.users.DUENO, manager = a.users.GERENTE;
    const req = async (user, endpoint, body, key, method = body === undefined ? 'GET' : 'POST') => {
      const token = jwt.sign({ sub: user.id, tid: user.tenantId, rol: user.rol, sv: user.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
      const r = await fetch(bases[index++ % 2] + endpoint, { method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = text; } return { status: r.status, body: data };
    };
    const create = async (ids = a.products.slice(0, 2).map(p => p.id), user = owner, branch = a.branches[0], key = 'count-' + (++index)) => { const r = await req(user, '/inventario/conteos', { sucursalId: branch.id, productoIds: ids }, key); assert.equal(r.status, 200, JSON.stringify(r)); return r.body; };
    const save = async (count, items, user = owner) => { const r = await req(user, '/inventario/conteos/' + count.id, { versionEsperada: count.version, items }, 'count-save-' + (++index), 'PUT'); if (r.status === 200) count.version = r.body.version; return r; };
    const confirm = (count, key, user = owner) => req(user, '/inventario/conteos/' + count.id + '/confirmar', { versionEsperada: count.version, motivo: 'QA physical correction' }, key);
    const snapshot = async () => JSON.parse(JSON.stringify({ products: await prisma.producto.findMany({ orderBy: { id: 'asc' } }), counts: await prisma.conteoInventario.findMany({ orderBy: { id: 'asc' } }), moves: await prisma.kardexMovimiento.findMany({ orderBy: { id: 'asc' } }), audit: await prisma.auditoriaLog.findMany({ orderBy: { id: 'asc' } }), operations: await prisma.inventarioOperacion.findMany({ orderBy: { id: 'asc' } }) }));
    await check('Partial draft persists; two operators save independent lines without losing updates', async () => {
      const count = await create(); assert(count.items.every(i => i.cantidadContada === null));
      const results = await Promise.all([save(count, [{ productoId: a.products[0].id, cantidadContada: 8 }]), save(count, [{ productoId: a.products[1].id, cantidadContada: 9 }], manager)]); assert.equal(results.filter(r => r.status === 200).length, 1, JSON.stringify(results)); assert.equal(results.filter(r => r.status === 409).length, 1, JSON.stringify(results));
      const lost = results.findIndex(r => r.status === 409); const refreshed = await req(owner, '/inventario/conteos'); count.version = refreshed.body.find(c => c.id === count.id).version;
      assert.equal((await save(count, [{ productoId: a.products[lost].id, cantidadContada: lost === 0 ? 8 : 9 }], lost === 0 ? owner : manager)).status, 200);
      const list = await req(owner, '/inventario/conteos'); assert.equal(list.status, 200); const persisted = list.body.find(c => c.id === count.id); assert(persisted); assert.equal(persisted.items.find(i => i.productoId === a.products[0].id).cantidadContada, 8); assert.equal(persisted.items.find(i => i.productoId === a.products[1].id).cantidadContada, 9);
      const partial = await create(); assert.equal((await save(partial, [{ productoId: a.products[0].id, cantidadContada: 8 }])).status, 200);
      const result = await confirm(partial, 'count-partial-confirm'); assert.equal(result.status, 200, JSON.stringify(result)); assert.equal(Number((await prisma.producto.findUniqueOrThrow({ where: { id: a.products[0].id } })).stockActual), 8); assert.equal(Number((await prisma.producto.findUniqueOrThrow({ where: { id: a.products[1].id } })).stockActual), 10);
    });
    await check('Empty count and invalid line patches are rejected atomically', async () => {
      const count = await create(), before = await snapshot(); assert.equal((await confirm(count, 'count-empty')).status, 400);
      for (const quantity of [-1, 1.5, true, 'bad']) assert.equal((await save(count, [{ productoId: a.products[0].id, cantidadContada: quantity }])).status, 400);
      assert.equal((await save(count, [{ productoId: a.products[0].id, cantidadContada: 1 }, { productoId: a.products[0].id, cantidadContada: 2 }])).status, 400);
      assert.deepEqual(await snapshot(), before);
    });
    await check('Lost draft/save responses recover exact operation; stale operators cannot overwrite newer physical count', async () => {
      const count = await create([a.products[0].id], owner, a.branches[0], 'count-start-recovery');
      const replay = await create([a.products[0].id], owner, a.branches[0], 'count-start-recovery'); assert.equal(replay.id, count.id);
      const body = { versionEsperada: count.version, items: [{ productoId: a.products[0].id, cantidadContada: 5 }] };
      const first = await req(owner, '/inventario/conteos/' + count.id, body, 'count-save-recovery', 'PUT'); assert.equal(first.status, 200, JSON.stringify(first));
      const before = await snapshot(); const recovered = await req(owner, '/inventario/conteos/' + count.id, body, 'count-save-recovery', 'PUT'); assert.equal(recovered.status, 200); assert.equal(recovered.body.version, first.body.version); assert.deepEqual(await snapshot(), before);
      const stale = await req(manager, '/inventario/conteos/' + count.id, { ...body, items: [{ productoId: a.products[0].id, cantidadContada: 6 }] }, 'count-save-old-operator', 'PUT'); assert.equal(stale.status, 409); assert.deepEqual(await snapshot(), before);
    });
    await check('Sale during count rejects stale reference; recount recovers without losing sale', async () => {
      const count = await create([a.products[0].id]); assert.equal((await save(count, [{ productoId: a.products[0].id, cantidadContada: 7 }])).status, 200);
      const sale = await req(owner, '/ventas', { sucursalId: a.branches[0].id, barberoId: a.barber.id, metodoPago: 'TARJETA', items: [{ productoId: a.products[0].id, cantidad: 1 }], idempotencyKey: 'count-sale' }); assert.equal(sale.status, 200, JSON.stringify(sale));
      const before = await snapshot(); const stale = await confirm(count, 'count-stale-sale'); assert.equal(stale.status, 409, JSON.stringify(stale)); assert.deepEqual(await snapshot(), before);
      assert.equal((await save(count, [{ productoId: a.products[0].id, cantidadContada: 6, recontar: true }])).status, 200);
      assert.equal((await confirm(count, 'count-recount-success')).status, 200); assert.equal(Number((await prisma.producto.findUniqueOrThrow({ where: { id: a.products[0].id } })).stockActual), 6);
    });
    await check('Same final balance with intervening ledger movements still requires recount', async () => {
      const count = await create([a.products[1].id]); assert.equal((await save(count, [{ productoId: a.products[1].id, cantidadContada: 9 }])).status, 200);
      for (const [type, key] of [['ENTRADA_COMPRA', 'count-in'], ['USO_INTERNO', 'count-out']]) assert.equal((await req(owner, '/inventario/movimiento', { productoId: a.products[1].id, tipoMovimiento: type, cantidad: 1, motivo: 'QA net same' }, key)).status, 200);
      const before = await snapshot(); assert.equal((await confirm(count, 'count-net-same')).status, 409); assert.deepEqual(await snapshot(), before);
    });
    await check('Repeated confirmation across two API processes returns one result and one adjustment', async () => {
      const count = await create([a.products[1].id]); assert.equal((await save(count, [{ productoId: a.products[1].id, cantidadContada: 7 }])).status, 200);
      const before = await prisma.kardexMovimiento.count(); const replies = await Promise.all(Array.from({ length: 6 }, () => confirm(count, 'count-confirm-retry'))); assert(replies.every(r => r.status === 200), JSON.stringify(replies)); assert.equal(replies.filter(r => !r.body.replayed).length, 1); assert.equal(await prisma.kardexMovimiento.count(), before + 1);
      const recovered = await confirm(count, 'count-confirm-retry'); assert.equal(recovered.status, 200); assert.equal(recovered.body.id, count.id); assert.equal(await prisma.kardexMovimiento.count(), before + 1);
      assert.equal((await confirm(count, 'count-confirm-new-key')).status, 409); assert.equal((await save(count, [{ productoId: a.products[1].id, cantidadContada: 1 }])).status, 409);
    });
    await check('Multi-item confirmation with second ledger failure rolls back every item, count and audit', async () => {
      const count = await create(), sorted = [...a.products.slice(0, 2)].sort((x, y) => x.id.localeCompare(y.id)); assert.equal((await save(count, sorted.map(p => ({ productoId: p.id, cantidadContada: 3 })))).status, 200);
      const bad = sorted[1].id; assert(/^[a-zA-Z0-9-]+$/.test(bad));
      if (process.env.SYSTECH_TEST_PG_URL) { await prisma.$executeRawUnsafe("CREATE FUNCTION qa_count_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.\"productoId\"='" + bad + "' THEN RAISE EXCEPTION 'QA second count item failed'; END IF; RETURN NEW; END $$"); await prisma.$executeRawUnsafe('CREATE TRIGGER qa_count_fail BEFORE INSERT ON "KardexMovimiento" FOR EACH ROW EXECUTE FUNCTION qa_count_fail()'); }
      else await prisma.$executeRawUnsafe("CREATE TRIGGER qa_count_fail BEFORE INSERT ON KardexMovimiento WHEN NEW.productoId='" + bad + "' BEGIN SELECT RAISE(ABORT, 'QA second count item failed'); END");
      try { const before = await snapshot(); const failed = await confirm(count, 'count-trigger-retry'); assert.equal(failed.status, 500, JSON.stringify(failed)); assert.deepEqual(await snapshot(), before); }
      finally { await prisma.$executeRawUnsafe('DROP TRIGGER qa_count_fail' + (process.env.SYSTECH_TEST_PG_URL ? ' ON "KardexMovimiento"' : '')); if (process.env.SYSTECH_TEST_PG_URL) await prisma.$executeRawUnsafe('DROP FUNCTION qa_count_fail()'); }
      assert.equal((await confirm(count, 'count-trigger-retry')).status, 200); for (const p of sorted) assert.equal(Number((await prisma.producto.findUniqueOrThrow({ where: { id: p.id } })).stockActual), 3);
    });
    await check('Owner, manager branch and tenant permissions reject foreign draft writes and barber reads', async () => {
      const count = await create();
      for (const user of [b.users.DUENO, a.users.BARBERO]) { const before = await snapshot(); const saved = await save(count, [{ productoId: a.products[0].id, cantidadContada: 2 }], user); assert([403, 404].includes(saved.status), JSON.stringify(saved)); const confirmed = await confirm(count, 'count-forbidden-' + user.id, user); assert([403, 404].includes(confirmed.status), JSON.stringify(confirmed)); const after = await snapshot(); delete before.audit; delete after.audit; assert.deepEqual(after, before); }
      assert.equal((await req(a.users.BARBERO, '/inventario/conteos')).status, 403);
      const foreign = await req(manager, '/inventario/conteos', { sucursalId: a.branches[1].id, productoIds: [a.products[2].id] }, 'count-manager-foreign'); assert([403, 404].includes(foreign.status), JSON.stringify(foreign));
      assert.equal((await req(manager, '/inventario/conteos')).body.every(c => c.sucursalId === a.branches[0].id), true);
    });
    console.log('PASS ' + checks + ' independent physical count checks on ' + (process.env.SYSTECH_TEST_PG_URL ? 'isolated PostgreSQL' : 'disposable SQLite'));
  } finally { await Promise.all(servers.map(c => new Promise(resolve => { if (c.exitCode !== null) return resolve(); c.once('exit', resolve); c.kill('SIGTERM'); }))); await prisma.$disconnect(); cleanTestFixture(fixture.directory); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });


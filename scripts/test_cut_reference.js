'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs'), crypto = require('node:crypto');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
const root = path.resolve(__dirname, '..');
const foto = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/cut-reference-jpeg.json'), 'utf8').replace(/^\uFEFF/, '')).fotoReferencia;
const rawJpeg = Buffer.from(foto.slice(23), 'base64');
const dataUrl = buffer => 'data:image/jpeg;base64,' + buffer.toString('base64');
async function main() {
  const expected = path.join(root, '.tools', process.env.SYSTECH_TEST_PG_URL ? 'prisma-cut-reference-postgres' : 'prisma-cut-reference', 'client');
  if (process.env.NODE_ENV !== 'test' || process.env.SYSTECH_ISOLATED_TESTS !== 'true' || path.resolve(process.env.SYSTECH_TEST_PRISMA_CLIENT || '.') !== expected) throw new Error('Explicit isolated cut reference client required');
  const operational = path.join(root, 'packages/database/prisma/dev.db'), hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), beforeDb = hash(operational);
  const fixture = createTestFixture(); Object.assign(process.env, fixture.env); require('./test_prisma_client');
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken');
  const { validateCutReference } = require('../apps/api/dist/services/cut-reference.service');
  const app = require('../apps/api/dist/index').default;
  let server, count = 0, nextDay = 2, nextPhone = 0;
  const checks = [], check = async (name, fn) => { await fn(); checks.push(name); console.log('PASS ' + name); count++; };
  try {
    const a = await prisma.tenant.create({ data: { nombre: 'Cortes demo A', slug: 'cut-a', plan: 'PRO' } });
    const b = await prisma.tenant.create({ data: { nombre: 'Cortes demo B', slug: 'cut-b' } });
    const branch = await prisma.sucursal.create({ data: { tenantId: a.id, nombre: 'Principal', diasLaborales: 'Lunes a Domingo' } });
    const foreignBranch = await prisma.sucursal.create({ data: { tenantId: b.id, nombre: 'Otra', diasLaborales: 'Lunes a Domingo' } });
    const otherBranch = await prisma.sucursal.create({ data: { tenantId: a.id, nombre: 'Secundaria', diasLaborales: 'Lunes a Domingo' } });
    const barber = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'Uno', diasDescanso: '' } });
    const peer = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'Dos', diasDescanso: '' } });
    const foreignBarber = await prisma.barbero.create({ data: { sucursalId: foreignBranch.id, nombre: 'Ajeno', diasDescanso: '' } });
    const service = await prisma.producto.create({ data: { tenantId: a.id, sucursalId: branch.id, nombre: 'Corte clásico', tipo: 'SERVICIO', duracionMinutos: 30, precioVenta: 250 } });
    const otherService = await prisma.producto.create({ data: { tenantId: a.id, sucursalId: otherBranch.id, nombre: 'Segundo corte', tipo: 'SERVICIO', duracionMinutos: 40, precioVenta: 275 } });
    const foreignService = await prisma.producto.create({ data: { tenantId: b.id, sucursalId: foreignBranch.id, nombre: 'Corte ajeno', tipo: 'SERVICIO', duracionMinutos: 30, precioVenta: 300 } });
    const accounts = {};
    for (const role of ['DUENO', 'GERENTE', 'CAJERO', 'BARBERO', 'SUPER_ADMIN']) accounts[role] = await prisma.usuario.create({ data: { tenantId: a.id, nombre: role, email: 'cut-' + role.toLowerCase() + '@fixture.invalid', passwordHash: 'disabled', rol: role, sucursalId: branch.id, ...(role === 'BARBERO' ? { barberoId: barber.id } : {}) } });
    accounts.PEER = await prisma.usuario.create({ data: { tenantId: a.id, nombre: 'Otro barbero', email: 'cut-peer@fixture.invalid', passwordHash: 'disabled', rol: 'BARBERO', sucursalId: branch.id, barberoId: peer.id } });
    accounts.FOREIGN = await prisma.usuario.create({ data: { tenantId: b.id, nombre: 'Otro dueño', email: 'cut-foreign@fixture.invalid', passwordHash: 'disabled', rol: 'DUENO' } });
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (route, method = 'GET', data, role = 'DUENO') => {
      const user = accounts[role], token = user ? jwt.sign({ sub: user.id, tid: user.tenantId, rol: user.rol, sv: user.sessionVersion }, process.env.JWT_SECRET) : null;
      const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      const raw = await res.text(); let body; try { body = JSON.parse(raw); } catch { body = raw; }
      return { status: res.status, body, headers: res.headers };
    };
    const input = extra => { const date = new Date(); date.setUTCDate(date.getUTCDate() + nextDay++); return { tenantId: a.id, sucursalId: branch.id, barberoId: barber.id, servicioId: service.id, fechaHora: date.toISOString().slice(0, 10) + 'T11:00:00', clienteNombre: 'Cliente ficticio', clienteTelefono: '551' + String(++nextPhone).padStart(7, '0'), idempotencyKey: crypto.randomUUID(), ...extra }; };
    const createPublic = data => request('/public/reservar', 'POST', data, 'PUBLIC');
    const state = async () => ({ appointments: await prisma.cita.count(), customers: await prisma.clienteFinal.count(), references: await prisma.citaReferencia.count(), notices: await prisma.notificacionLog.count(), limits: await prisma.reservaLimite.findMany({ orderBy: { id: 'asc' } }) });
    let publicBooking, internalBooking, payload;
    await check('Actual JPEG encoder fixture and exact type limit pass bounded validation', async () => {
      assert.equal(validateCutReference({ fotoReferencia: foto }).fotoReferencia, foto);
      assert.equal(validateCutReference({ tipoCorte: '  ' + 'a'.repeat(80) + '  ' }).tipoCorte.length, 80);
      assert.deepEqual(validateCutReference({ tipoCorte: '   ', fotoReferencia: null }), { tipoCorte: null, fotoReferencia: null });
    });
    await check('Public booking saves photo separately and preserves catalog price and duration', async () => {
      payload = input({ tipoCorte: '  Fade bajo  ', fotoReferencia: foto, duracionMinutos: 999, precioEstimado: 1 });
      const r = await createPublic(payload); assert.equal(r.status, 200, JSON.stringify(r.body)); publicBooking = r.body;
      assert.equal(r.body.cita.tipoCorte, 'Fade bajo'); assert.equal(r.body.cita.tieneFotoReferencia, true);
      assert.equal(r.body.cita.duracionMinutos, 30); assert.equal(Number(r.body.cita.precioEstimado), 250);
      assert(!JSON.stringify(r.body).includes('data:image')); assert(!Object.hasOwn(r.body.cita, 'referencia'));
      assert.equal((await prisma.citaReferencia.findUniqueOrThrow({ where: { citaId: r.body.cita.id } })).imagen, foto);
    });
    await check('Repeated and concurrent idempotent requests keep one photo, customer, notice and appointment', async () => {
      const before = await state();
      const rs = await Promise.all(Array.from({ length: 3 }, () => createPublic(payload)));
      assert(rs.every(r => r.status === 200), JSON.stringify(rs));
      assert(rs.every(r => r.body.cita.id === publicBooking.cita.id && r.body.cita.tieneFotoReferencia));
      assert.deepEqual(await state(), before);
      assert.equal((await createPublic({ ...payload, tipoCorte: 'Otro corte' })).body.code, 'IDEMPOTENCY_CONFLICT');
      const changed = Buffer.from(rawJpeg); changed[changed.length - 5] ^= 1;
      assert.equal((await createPublic({ ...payload, fotoReferencia: dataUrl(changed) })).body.code, 'IDEMPOTENCY_CONFLICT');
    });
    await check('UUID booking intent recovers an interrupted result without photo, PII or extra writes', async () => {
      const before = await state();
      const recovered = await request('/public/reserva-intencion', 'POST', { tenantId: a.id, idempotencyKey: payload.idempotencyKey }, 'PUBLIC');
      assert.equal(recovered.status, 200); assert.equal(recovered.body.found, true);
      assert.equal(recovered.body.result.cita.id, publicBooking.cita.id); assert.equal(recovered.body.result.tokenCancelacion, publicBooking.tokenCancelacion);
      assert(!JSON.stringify(recovered.body).includes('data:image')); assert(!JSON.stringify(recovered.body).includes(payload.clienteTelefono)); assert(!JSON.stringify(recovered.body).includes(payload.clienteNombre));
      assert.equal(recovered.headers.get('cache-control'), 'no-store'); assert.deepEqual(await state(), before);
    });
    await check('Booking intent rejects guessable keys and cannot resolve another tenant or internal actor', async () => {
      for (const key of ['short', 'user-chosen-key', publicBooking.codigoReserva, '11111111-1111-1111-1111-111111111111']) assert.equal((await request('/public/reserva-intencion', 'POST', { tenantId: a.id, idempotencyKey: key }, 'PUBLIC')).status, 400);
      for (const data of [{ tenantId: b.id, idempotencyKey: payload.idempotencyKey }, { tenantId: a.id, idempotencyKey: crypto.randomUUID() }]) assert.deepEqual((await request('/public/reserva-intencion', 'POST', data, 'PUBLIC')).body, { found: false });
      const key = crypto.randomUUID(); const internal = await request('/citas', 'POST', input({ idempotencyKey: key })); assert.equal(internal.status, 200);
      assert.deepEqual((await request('/public/reserva-intencion', 'POST', { tenantId: a.id, idempotencyKey: key }, 'PUBLIC')).body, { found: false });
    });
    await check('Owner, assigned manager, cashier and own barber can retrieve a no-cache reference', async () => {
      for (const role of ['DUENO', 'GERENTE', 'CAJERO', 'BARBERO']) {
        const r = await request('/citas/' + publicBooking.cita.id + '/referencia', 'GET', undefined, role);
        assert.equal(r.status, 200, role + JSON.stringify(r.body)); assert.deepEqual(r.body, { tipoCorte: 'Fade bajo', fotoReferencia: foto });
        assert.equal(r.headers.get('cache-control'), 'no-store');
      }
    });
    await check('Agenda lists only text and presence flag and never loads the photo column', async () => {
      const r = await request('/citas'); assert.equal(r.status, 200);
      const cita = r.body.find(c => c.id === publicBooking.cita.id);
      assert.equal(cita.tipoCorte, 'Fade bajo'); assert.equal(cita.tieneFotoReferencia, true);
      assert(!JSON.stringify(r.body).includes('data:image')); assert(!Object.hasOwn(cita, 'imagen')); assert(!Object.hasOwn(cita, 'referencia'));
      const source = fs.readFileSync(path.join(root, 'apps/api/src/routes/citas.routes.ts'), 'utf8');
      assert(source.includes('referencia: { select: { citaId: true } }'));
    });
    await check('No public folio, cancellation capability or printable voucher exposes the reference', async () => {
      for (const token of [publicBooking.codigoReserva, publicBooking.tokenCancelacion]) {
        const r = await request('/public/cita/' + token, 'GET', undefined, 'PUBLIC'); assert.equal(r.status, 200);
        assert(!Object.hasOwn(r.body, 'tipoCorte')); assert(!Object.hasOwn(r.body, 'fotoReferencia')); assert(!JSON.stringify(r.body).includes('data:image'));
        const print = await request('/public/cita/' + token + '/imprimir-carta', 'GET', undefined, 'PUBLIC'); assert.equal(print.status, 200); assert(!String(print.body).includes('Fade bajo')); assert(!String(print.body).includes('data:image'));
      }
      assert.equal((await request('/citas/' + publicBooking.cita.id + '/referencia', 'GET', undefined, 'PUBLIC')).status, 401);
      assert.equal((await request('/public/cita/' + publicBooking.codigoReserva + '/referencia', 'GET', undefined, 'PUBLIC')).status, 404);
    });
    await check('Other tenant and other barber get 404 without a reference leak', async () => {
      for (const role of ['FOREIGN', 'PEER']) {
        const r = await request('/citas/' + publicBooking.cita.id + '/referencia', 'GET', undefined, role);
        assert.equal(r.status, 404); assert(!JSON.stringify(r.body).includes('data:image'));
      }
      assert.equal((await request('/citas/not-an-appointment/referencia')).status, 404);
      assert.equal((await request('/citas/' + publicBooking.cita.id + '/referencia', 'GET', undefined, 'SUPER_ADMIN')).status, 403);
    });
    await check('Invalid type and JPEG inputs fail before all public booking side effects', async () => {
      const dimensions = Buffer.from(rawJpeg), frame = dimensions.indexOf(Buffer.from([0xff, 0xc0])); assert(frame >= 0);
      dimensions.writeUInt16BE(1281, frame + 7);
      const metadata = marker => dataUrl(Buffer.concat([rawJpeg.subarray(0, 2), Buffer.from([0xff, marker, 0, 4, 0, 0]), rawJpeg.subarray(2)]));
      const cases = [
        [{ tipoCorte: {} }, 'INVALID_CUT_TYPE'], [{ tipoCorte: 'x'.repeat(81) }, 'INVALID_CUT_TYPE'],
        [{ fotoReferencia: 'https://example.invalid/cut.jpg' }, 'INVALID_REFERENCE_IMAGE'],
        [{ fotoReferencia: 'data:image/svg+xml;base64,PHN2Zz4=' }, 'INVALID_REFERENCE_IMAGE'],
        [{ fotoReferencia: 'data:image/jpeg;base64,@@@=' }, 'INVALID_REFERENCE_IMAGE'],
        [{ fotoReferencia: 'data:image/jpeg;base64,' + rawJpeg.toString('base64') + '\n' }, 'INVALID_REFERENCE_IMAGE'],
        [{ fotoReferencia: dataUrl(Buffer.alloc(49153, 1)) }, 'REFERENCE_IMAGE_TOO_LARGE'],
        [{ fotoReferencia: dataUrl(dimensions) }, 'REFERENCE_IMAGE_DIMENSIONS'],
        [{ fotoReferencia: dataUrl(rawJpeg.subarray(0, rawJpeg.length - 2)) }, 'INVALID_REFERENCE_IMAGE'],
        [{ fotoReferencia: dataUrl(Buffer.concat([rawJpeg, Buffer.from([0])])) }, 'INVALID_REFERENCE_IMAGE'],
        ...Array.from({ length: 15 }, (_, i) => [{ fotoReferencia: metadata(0xe1 + i) }, 'REFERENCE_IMAGE_METADATA']),
        [{ fotoReferencia: metadata(0xfe) }, 'REFERENCE_IMAGE_METADATA']
      ];
      const before = await state();
      for (const [extra, code] of cases) { const r = await createPublic(input(extra)); assert.equal(r.status, 400, JSON.stringify(r)); assert.equal(r.body.code, code); }
      assert.deepEqual(await state(), before);
    });
    await check('Invalid internal reference fails before customer, appointment and notification writes', async () => {
      const before = await state(); const r = await request('/citas', 'POST', input({ fotoReferencia: 'bad' }));
      assert.equal(r.status, 400); assert.equal(r.body.code, 'INVALID_REFERENCE_IMAGE'); assert.deepEqual(await state(), before);
    });
    await check('Internal creation and barber-owned creation persist optional references', async () => {
      const r = await request('/citas', 'POST', input({ tipoCorte: 'Taper', fotoReferencia: foto })); assert.equal(r.status, 200, JSON.stringify(r)); internalBooking = r.body;
      assert.equal(r.body.tipoCorte, 'Taper'); assert.equal(r.body.tieneFotoReferencia, true); assert(!JSON.stringify(r.body).includes('data:image'));
      const own = await request('/citas', 'POST', input({ tipoCorte: 'Clásico', fotoReferencia: foto }), 'BARBERO'); assert.equal(own.status, 200); assert.equal(own.body.tieneFotoReferencia, true);
    });
    await check('Existing and photo-free appointments retain nullable defaults and readable agenda', async () => {
      const r = await request('/citas', 'POST', input({})); assert.equal(r.status, 200); assert.equal(r.body.tipoCorte, null); assert.equal(r.body.tieneFotoReferencia, false);
      const photoFree = await request('/citas/' + r.body.id + '/referencia'); assert.deepEqual(photoFree.body, { tipoCorte: null, fotoReferencia: null });
      const legacy = await prisma.cita.create({ data: { tenantId: a.id, sucursalId: branch.id, barberoId: barber.id, clienteId: r.body.clienteId, fechaHora: new Date(Date.now() - 86400000) } });
      const list = await request('/citas'); const old = list.body.find(row => row.id === legacy.id); assert.equal(old.tipoCorte, null); assert.equal(old.tieneFotoReferencia, false);
    });
    await check('Photo creation is transactionally rolled back with a failed booking notification', async () => {
      const before = await state(); const original = prisma.notificacionLog.create;
      // Prisma middleware fault happens after the reference insert, within the same transaction.
      let failOnce = true;
      prisma.$use(async (params, next) => { if (failOnce && params.model === 'NotificacionLog' && params.action === 'create') { failOnce = false; throw new Error('isolated transactional rollback fixture'); } return next(params); });
      const r = await request('/citas', 'POST', input({ tipoCorte: 'Prueba rollback', fotoReferencia: foto }));
      assert.equal(r.status, 500); assert.deepEqual(await state(), before); assert(original);
    });
    await check('References cannot cross tenant or branch during creation', async () => {
      const before = await state();
      const r = await request('/citas', 'POST', input({ sucursalId: foreignBranch.id, barberoId: foreignBarber.id, servicioId: foreignService.id, fotoReferencia: foto })); assert.equal(r.status, 404);
      const crossBranch = await request('/citas', 'POST', input({ sucursalId: otherBranch.id, servicioId: otherService.id, fotoReferencia: foto })); assert.equal(crossBranch.status, 404);
      assert.deepEqual(await state(), before);
    });
    await check('Deleting an appointment cascades its private reference only', async () => {
      const others = await prisma.citaReferencia.count(); await prisma.cita.delete({ where: { id: internalBooking.id } });
      assert.equal(await prisma.citaReferencia.count(), others - 1); assert.equal(await prisma.citaReferencia.findUnique({ where: { citaId: internalBooking.id } }), null);
      assert(await prisma.citaReferencia.findUnique({ where: { citaId: publicBooking.cita.id } }));
    });
    await check('Operational SQLite file remains unchanged', async () => assert.equal(hash(operational), beforeDb));
    const evidence = { finishedAt: new Date().toISOString(), engine: process.env.SYSTECH_TEST_PG_URL ? 'PostgreSQL' : 'SQLite', passed: count, checks, fixture: 'Fictitious isolated businesses; actual .NET encoded JPEG; no provider calls', operationalDatabaseUnchanged: true };
    const output = path.join(root, 'docs/scrum/evidencia/cut-reference-20261011'); fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, evidence.engine.toLowerCase() + '-regression.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(`Cut reference regressions: ${count}/${count} passed`);
  } finally { if (server) await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); cleanTestFixture(fixture.directory); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

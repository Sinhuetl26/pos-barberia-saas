'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { fork } = require('node:child_process');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
async function main() {
  if (Boolean(process.env.SYSTECH_TEST_PG_URL) !== Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT)) throw Error('PostgreSQL requires a guarded test URL and separate client together.');
  const root = path.resolve(__dirname, '..');
  const workDb = path.join(root, 'packages/database/prisma/dev.db');
  const hash = () => crypto.createHash('sha256').update(fs.readFileSync(workDb)).digest('hex');
  const before = hash(), fixture = createTestFixture(); Object.assign(process.env, fixture.env);
  if (process.env.SYSTECH_TEST_PRISMA_CLIENT) require('./test_prisma_client');
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken'); let server, checks = 0;
  const check = async (name, action) => { await action(); checks++; console.log('PASS ' + name); };
  try {
    server = fork(path.join(__dirname, 'test_server.js'), [], { env: fixture.env, execArgv: process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    server.stderr.on('data', chunk => process.stderr.write(chunk));
    const base = await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Isolated API timeout')), 20000); server.once('message', message => { clearTimeout(timer); resolve(message.base + '/api'); }); server.once('exit', () => { clearTimeout(timer); reject(Error('Isolated API stopped')); }); });
    const scope = async suffix => {
      const tenant = await prisma.tenant.create({ data: { nombre: 'Phone QA ' + suffix, slug: 'phone-qa-' + suffix, plan: 'PRO' } });
      const branch = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'QA branch ' + suffix, diasLaborales: 'Lunes a Domingo', zonaHoraria: 'America/Mexico_City', horarioApertura: '09:00', horarioCierre: '19:00' } });
      const barber = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'QA barber', horarioInicio: '09:00', horarioFin: '19:00', diasDescanso: '' } });
      const service = await prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch.id, tipo: 'SERVICIO', nombre: 'QA cut', duracionMinutos: 30, precioVenta: 100 } });
      const owner = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'QA owner', email: suffix + '@phone-qa.invalid', rol: 'DUENO', passwordHash: 'disabled' } });
      const token = jwt.sign({ sub: owner.id, tid: tenant.id, rol: owner.rol, sv: owner.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
      return { tenant, branch, barber, service, token };
    };
    const a = await scope('a'), b = await scope('b'); let dayOffset = 2;
    const request = async (route, body, token) => { const response = await fetch(base + route, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) }); return { status: response.status, body: await response.json() }; };
    const payload = (s, phone) => { const date = new Date(); date.setUTCDate(date.getUTCDate() + dayOffset++); return { tenantId: s.tenant.id, sucursalId: s.branch.id, barberoId: s.barber.id, servicioId: s.service.id, fechaHora: date.toISOString().slice(0, 10) + 'T11:00:00', clienteNombre: 'Name from booking must not overwrite CRM', clienteTelefono: phone, idempotencyKey: crypto.randomUUID() }; };
    const book = async (s, phone, internal = false) => { const input = payload(s, phone), response = await request(internal ? '/citas' : '/public/reservar', input, internal ? s.token : undefined); assert.equal(response.status, 200, JSON.stringify(response)); const id = internal ? response.body.id : response.body.cita.id; return { input, response, appointment: await prisma.cita.findUniqueOrThrow({ where: { id } }) }; };
    let imported;
    await check('Actual client import stores canonical 52 number and subsequent national booking reuses its ID', async () => {
      const input = { tipo: 'clientes', sucursalId: a.branch.id, csv: 'nombre,telefono,email\nImported owner data,+52 55 1234 5678,private@phone-qa.invalid\n' };
      const preview = await request('/operacion/importacion/previsualizar', input, a.token); assert.equal(preview.status, 200, JSON.stringify(preview)); assert.equal(preview.body.canConfirm, true);
      const confirmed = await request('/operacion/importacion/confirmar', { ...input, previewHash: preview.body.previewHash, idempotencyKey: crypto.randomUUID() }, a.token); assert.equal(confirmed.status, 200, JSON.stringify(confirmed));
      imported = await prisma.clienteFinal.findFirstOrThrow({ where: { tenantId: a.tenant.id, telefono: '525512345678' } });
      const result = await book(a, '55 1234 5678'); assert.equal(result.appointment.clienteId, imported.id); assert.equal(await prisma.clienteFinal.count({ where: { tenantId: a.tenant.id } }), 1);
      const stored = await prisma.clienteFinal.findUniqueOrThrow({ where: { id: imported.id } }); assert.equal(stored.nombre, imported.nombre); assert.equal(stored.email, imported.email); assert.equal(stored.telefono, imported.telefono);
    });
    await check('Current 52 and legacy 521 aliases reuse the imported customer and replay preserves original booking intent', async () => {
      for (const phone of ['+52 55 1234 5678', '+521 55 1234 5678']) {
        const result = await book(a, phone); assert.equal(result.appointment.clienteId, imported.id);
        const replay = await request('/public/reservar', result.input); assert.equal(replay.status, 200); assert.equal(replay.body.cita.id, result.appointment.id);
      }
      assert.equal(await prisma.clienteFinal.count({ where: { tenantId: a.tenant.id } }), 1);
    });
    await check('Historical national phone records are reused by internal rebooking without rewriting their CRM values', async () => {
      const historical = await prisma.clienteFinal.create({ data: { tenantId: a.tenant.id, nombre: 'Historical preserved', telefono: '5598765432', email: 'history@phone-qa.invalid' } });
      for (const phone of ['+52 55 9876 5432', '+521 55 9876 5432']) assert.equal((await book(a, phone, true)).appointment.clienteId, historical.id);
      const stored = await prisma.clienteFinal.findUniqueOrThrow({ where: { id: historical.id } }); assert.equal(stored.nombre, historical.nombre); assert.equal(stored.email, historical.email); assert.equal(stored.telefono, historical.telefono);
    });
    await check('Equivalent phones remain tenant scoped, never selecting the other business customer', async () => {
      const other = await prisma.clienteFinal.create({ data: { tenantId: b.tenant.id, nombre: 'Other business private', telefono: imported.telefono } });
      assert.equal((await book(b, '5512345678')).appointment.clienteId, other.id);
      assert.equal((await book(a, '5512345678', true)).appointment.clienteId, imported.id);
      assert.equal(await prisma.clienteFinal.count({ where: { tenantId: b.tenant.id } }), 1);
    });
    await check('New Mexican phones become canonical; foreign country numbers are kept rather than forced to Mexico', async () => {
      const first = await book(a, '5512340001'), next = await book(a, '+52 55 1234 0001'); assert.equal(first.appointment.clienteId, next.appointment.clienteId);
      assert.equal((await prisma.clienteFinal.findUniqueOrThrow({ where: { id: first.appointment.clienteId } })).telefono, '525512340001');
      const foreign = await book(a, '+1 555 123 4567'); assert.equal((await prisma.clienteFinal.findUniqueOrThrow({ where: { id: foreign.appointment.clienteId } })).telefono, '15551234567');
    });
    await check('Ambiguous historical aliases fail without merging, adding booking or altering existing customer records', async () => {
      await prisma.clienteFinal.create({ data: { tenantId: a.tenant.id, nombre: 'Separate historical identity', telefono: '5512345678' } });
      const state = async () => ({ clients: await prisma.clienteFinal.findMany({ where: { tenantId: a.tenant.id }, orderBy: { id: 'asc' } }), bookings: await prisma.cita.count({ where: { tenantId: a.tenant.id } }), notices: await prisma.notificacionLog.count({ where: { tenantId: a.tenant.id } }) });
      const before = await state(), rejected = await request('/public/reservar', payload(a, '+52 55 1234 5678'));
      assert.equal(rejected.status, 409, JSON.stringify(rejected)); assert.equal(rejected.body.code, 'CUSTOMER_PHONE_AMBIGUOUS'); assert.deepEqual(await state(), before);
      assert(!JSON.stringify(rejected.body).includes('private@phone-qa.invalid'));
    });
    await check('Operational database hash remains unchanged', async () => assert.equal(hash(), before));
    console.log(`Booking phone identity: ${checks}/${checks} passed on ${process.env.SYSTECH_TEST_PG_URL ? 'isolated PostgreSQL' : 'disposable SQLite'}; no demo or external provider changes.`);
  } finally { if (server && server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill(); }); await prisma.$disconnect(); cleanTestFixture(fixture.directory); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const { fork } = require('node:child_process');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
async function main() {
  if (Boolean(process.env.SYSTECH_TEST_PG_URL) !== Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT)) throw new Error('PG requires guarded URL and separate client together.');
  const fixture = createTestFixture(); Object.assign(process.env, fixture.env); if (process.env.SYSTECH_TEST_PRISMA_CLIENT) require('./test_prisma_client');
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken'); const servers = []; let checks = 0;
  const check = async (name, action) => { await action(); checks++; console.log('PASS ' + name); };
  const start = async () => { const child = fork(path.join(__dirname, 'test_server.js'), [], { env: fixture.env, execArgv: process.env.SYSTECH_TEST_PRISMA_CLIENT ? ['--require', path.join(__dirname, 'test_prisma_client.js')] : [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] }); servers.push(child); child.stderr.on('data', d => process.stderr.write(d)); return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('API timeout')), 20000); child.once('message', m => { clearTimeout(timer); resolve(m.base + '/api'); }); }); };
  try {
    const bases = [await start(), await start()]; let index = 0;
    const tenant = await prisma.tenant.create({ data: { nombre: 'Combined fictitious', slug: 'qa-combined', plan: 'PRO' } });
    const branch = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Fictitious branch', horarioApertura: '09:00', horarioCierre: '18:00', diasLaborales: 'Lunes,Martes,Miércoles,Jueves,Viernes,Sábado,Domingo', zonaHoraria: 'America/Mexico_City' } });
    const barber = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'Fictitious professional', diasDescanso: '', horarioInicio: '09:00', horarioFin: '18:00' } });
    const owner = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Fixture owner', email: 'combined@qa.invalid', rol: 'DUENO', passwordHash: 'disabled' } });
    const token = jwt.sign({ sub: owner.id, tid: owner.tenantId, rol: owner.rol, sv: owner.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
    const services = await Promise.all([['Corte snapshot', 116, 30], ['Barba snapshot', 58, 50], ['Extra no reservado', 40, 15]].map(([nombre, price, duration]) => prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre, precioVenta: price, duracionMinutos: duration, tasaImpuesto: 16, tipo: 'SERVICIO' } })));
    const product = await prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre: 'Pomada', precioVenta: 20, stockActual: 10 } });
    const foreignTenant = await prisma.tenant.create({ data: { nombre: 'Foreign fixture', slug: 'qa-combined-foreign' } });
    const foreignService = await prisma.producto.create({ data: { tenantId: foreignTenant.id, nombre: 'Private foreign service', tipo: 'SERVICIO', precioVenta: 999 } });
    const date = new Date(); date.setUTCDate(date.getUTCDate() + 3); const day = date.toISOString().slice(0, 10);
    const req = async (endpoint, body, auth = false, method = body === undefined ? 'GET' : 'POST') => { const r = await fetch(bases[index++ % 2] + endpoint, { method, headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); return { status: r.status, body: await r.json() }; };
    const bookingInput = (time, key) => ({ tenantId: tenant.id, sucursalId: branch.id, barberoId: barber.id, servicioIds: services.slice(0, 2).map(s => s.id), fechaHora: day + 'T' + time + ':00', clienteNombre: 'Combined QA client', clienteTelefono: '5550000123', idempotencyKey: key, precioEstimado: 1, duracionMinutos: 1 });
    const query = ids => '/public/disponibilidad?' + new URLSearchParams({ sucursalId: branch.id, barberoId: barber.id, fecha: day, servicioIds: ids.join(','), duracion: '1' });
    let booking, customerId;
    await check('Public availability derives full duration from permitted service IDs and rejects foreign/service impostors', async () => {
      const availability = await req(query(services.slice(0, 2).map(s => s.id))); assert.equal(availability.status, 200, JSON.stringify(availability)); assert.equal(Boolean(availability.body.slots.find(s => s.hora === '17:00')?.disponible), false);
      const short = await req(query([services[0].id])); assert.equal(short.status, 200); assert.equal(short.body.slots.find(s => s.hora === '17:00').disponible, true);
      for (const bad of [[foreignService.id], [product.id]]) { const r = await req(query(bad)); assert.equal(r.status, 404, JSON.stringify(r)); assert.equal(JSON.stringify(r).includes('Private foreign service'), false); }
    });
    await check('Combined public booking ignores price/duration tampering, stores both snapshots and blocks whole contiguous interval', async () => {
      const r = await req('/public/reservar', bookingInput('10:00', 'qa-combined-book')); assert.equal(r.status, 200, JSON.stringify(r)); booking = r.body.cita; assert.equal(booking.duracionMinutos, 80); assert.equal(Number(booking.precioEstimado), 174);
      const stored = await prisma.cita.findUniqueOrThrow({ where: { id: booking.id } }); customerId = stored.clienteId; const snapshots = JSON.parse(stored.serviciosJson); assert.equal(snapshots.length, 2); assert.deepEqual(new Set(snapshots.map(s => s.id)), new Set(services.slice(0, 2).map(s => s.id))); assert(snapshots.every(s => s.tasaImpuesto === 16));
      const during = await req('/public/reservar', { ...bookingInput('11:00', 'qa-overlap'), clienteTelefono: '5550000124', servicioIds: [services[0].id] }); assert.equal(during.status, 409, JSON.stringify(during));
    });
    const ticket = (items, key = 'qa-combined-pay') => ({ sucursalId: branch.id, barberoId: barber.id, clienteId: customerId, citaId: booking.id, metodoPago: 'TARJETA', items, idempotencyKey: key });
    const line = p => ({ productoId: p.id, cantidad: 1, precioUnitario: 0.01, nombreItem: 'Fake cart name', tasaImpuesto: 0 });
    await check('Appointment cart must contain each reserved service exactly once; missing, extra and quantity-two roll back', async () => {
      for (const [n, lines] of [[0, [line(services[0])]], [1, services.map(line)], [2, [{ ...line(services[0]), cantidad: 2 }, line(services[1])]], [3, [line(product)]]]) {
        const r = await req('/ventas', ticket(lines, 'qa-invalid-cart-' + n), true); assert.equal(r.status, 409, JSON.stringify(r)); assert.equal(r.body.code, 'BOOKING_SERVICES_MISMATCH');
      }
      assert.equal(await prisma.venta.count(), 0); assert.equal(await prisma.comision.count(), 0); assert.equal(await prisma.kardexMovimiento.count(), 0); assert.equal(Number((await prisma.producto.findUniqueOrThrow({ where: { id: product.id } })).stockActual), 10);
    });
    await check('Catalog price/name/VAT changes do not alter reserved snapshots; extra physical product allowed and retry charges once', async () => {
      await Promise.all(services.slice(0, 2).map(s => prisma.producto.update({ where: { id: s.id }, data: { nombre: 'Catalog renamed', precioVenta: 900, tasaImpuesto: 0 } })));
      const input = ticket([...services.slice(0, 2).map(line), line(product)]); const replies = await Promise.all(Array.from({ length: 6 }, () => req('/ventas', input, true))); assert(replies.every(r => r.status === 200), JSON.stringify(replies)); assert.equal(new Set(replies.map(r => r.body.venta.id)).size, 1);
      const sale = replies[0].body.venta; assert.equal(Number(sale.total), 194); assert.equal(Number(sale.impuesto), 24);
      for (const service of services.slice(0, 2)) { const row = sale.items.find(i => i.productoId === service.id); assert.equal(row.nombreItem, service.nombre); assert.equal(Number(row.precioUnitario), Number(service.precioVenta)); assert.equal(Number(row.tasaImpuesto), 16); }
      assert.equal(Number((await prisma.producto.findUniqueOrThrow({ where: { id: product.id } })).stockActual), 9); assert.equal(await prisma.venta.count({ where: { citaId: booking.id } }), 1); assert.equal((await req('/ventas', input, true)).body.replayed, true);
    });
    await check('Identified single-service legacy appointment preserves stored name/price and uses explicit VAT compatibility fallback', async () => {
      await prisma.producto.update({ where: { id: services[0].id }, data: { tasaImpuesto: 16 } });
      const legacy = await prisma.cita.create({ data: { tenantId: tenant.id, sucursalId: branch.id, barberoId: barber.id, clienteId: customerId, fechaHora: new Date(), servicioId: services[0].id, nombreServicio: 'Legacy booked cut', precioEstimado: 116, duracionMinutos: 30, estado: 'CONFIRMADA' } });
      const r = await req('/ventas', { ...ticket([line(services[0])], 'qa-legacy-pay'), citaId: legacy.id }, true); assert.equal(r.status, 200, JSON.stringify(r)); assert.equal(Number(r.body.venta.total), 116); assert.equal(Number(r.body.venta.impuesto), 16); assert.equal(r.body.venta.items[0].nombreItem, 'Legacy booked cut');
      const ambiguous = await prisma.cita.create({ data: { tenantId: tenant.id, sucursalId: branch.id, barberoId: barber.id, clienteId: customerId, fechaHora: new Date(), estado: 'CONFIRMADA' } }); const denied = await req('/ventas', { ...ticket([line(product)], 'qa-ambiguous'), citaId: ambiguous.id }, true); assert.equal(denied.status, 409); assert.equal(denied.body.code, 'BOOKING_SNAPSHOT_INVALID');
    });
    await check('Reschedule and cancel move the whole combined visit without changing snapshots or creating fragments', async () => {
      const created = await req('/public/reservar', bookingInput('12:00', 'qa-combined-move'));
      assert.equal(created.status, 200, JSON.stringify(created));
      const original = await prisma.cita.findUniqueOrThrow({ where: { id: created.body.cita.id } });
      const count = await prisma.cita.count(), ids = services.slice(0, 2).map(s => s.id);
      const moved = await req('/citas/' + original.id + '/reprogramar', { fechaHora: day + 'T14:00:00' }, true, 'PUT');
      assert.equal(moved.status, 200, JSON.stringify(moved));
      const stored = await prisma.cita.findUniqueOrThrow({ where: { id: original.id } });
      assert.equal(stored.serviciosJson, original.serviciosJson);
      assert.equal(Number(stored.precioEstimado), Number(original.precioEstimado));
      assert.equal(stored.duracionMinutos, 80);
      assert.equal(await prisma.cita.count(), count);
      const availability = await req(query(ids));
      assert.equal(availability.body.slots.find(s => s.hora === '12:00').disponible, true);
      assert.equal(availability.body.slots.find(s => s.hora === '14:00').disponible, false);
      const cancelled = await req('/citas/' + original.id + '/status', { estado: 'CANCELADA' }, true, 'PUT');
      assert.equal(cancelled.status, 200, JSON.stringify(cancelled));
      const after = await prisma.cita.findUniqueOrThrow({ where: { id: original.id } });
      assert.equal(after.serviciosJson, original.serviciosJson);
      assert.equal(after.estado, 'CANCELADA');
      assert.equal(await prisma.cita.count(), count);
      assert.equal((await req(query(ids))).body.slots.find(s => s.hora === '14:00').disponible, true);
    });
    console.log('PASS ' + checks + ' independent combined-service checks on ' + (process.env.SYSTECH_TEST_PG_URL ? 'isolated PostgreSQL' : 'disposable SQLite'));
  } finally { await Promise.all(servers.map(c => new Promise(resolve => { if (c.exitCode !== null) return resolve(); c.once('exit', resolve); c.kill('SIGTERM'); }))); await prisma.$disconnect(); cleanTestFixture(fixture.directory); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });




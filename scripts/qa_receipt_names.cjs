'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), { fork } = require('node:child_process');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
async function main() {
  const fixture = createTestFixture(); Object.assign(process.env, fixture.env);
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken');
  let server, checks = 0;
  const check = async (name, run) => { await run(); checks++; console.log('PASS ' + name); };
  try {
    server = fork(path.join(__dirname, 'test_server.js'), [], { env: { ...fixture.env, TZ: 'UTC' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    server.stderr.on('data', data => process.stderr.write(data));
    const base = await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('API timeout')), 20000); server.once('message', message => { clearTimeout(timer); resolve(message.base + '/api'); }); });
    const tenant = await prisma.tenant.create({ data: { nombre: 'Barbería ficticia', slug: 'qa-receipt-names', plan: 'PRO' } });
    const branch = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Sucursal ficticia', zonaHoraria: 'America/Cancun' } });
    const barber = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'Profesional distinto' } });
    const user = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'María López', email: 'cashier@receipt.invalid', rol: 'DUENO', passwordHash: 'disabled' } });
    const product = await prisma.producto.create({ data: { tenantId: tenant.id, sucursalId: branch.id, nombre: 'Producto ficticio', precioVenta: 100, stockActual: 2 } });
    const token = jwt.sign({ sub: user.id, tid: tenant.id, rol: user.rol, sv: user.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
    const request = async (route, body) => { const response = await fetch(base + route, { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }); assert.equal(response.status, 200, 'route: ' + route); return response; };
    const input = { sucursalId: branch.id, barberoId: barber.id, metodoPago: 'TARJETA', items: [{ productoId: product.id, cantidad: 1 }], idempotencyKey: 'receipt-name-sale', cobradoPorNombre: 'Nombre manipulado' };
    let sale;
    await check('New sale snapshots trusted collector name and notification, not client input or email', async () => {
      sale = (await (await request('/ventas', input)).json()).venta;
      assert.equal(sale.cobradoPorNombre, 'María López'); assert.equal(sale.cobradoPorId, user.id);
      const notification = await prisma.notificacionLog.findFirstOrThrow({ where: { tenantId: tenant.id, tipo: 'VENTA_CONFIRMADA' } });
      assert.equal(JSON.parse(notification.mensaje).cobradoPor, 'María López');
      assert.equal((await (await request('/ventas', input)).json()).venta.id, sale.id);
      assert.equal(await prisma.venta.count(), 1); assert.equal(Number((await prisma.producto.findUniqueOrThrow({ where: { id: product.id } })).stockActual), 1);
    });
    await check('Renaming an account preserves sale snapshot in HTML, JSON and prepared WhatsApp text', async () => {
      await prisma.usuario.update({ where: { id: user.id }, data: { nombre: 'Nombre actual cambiado' } });
      const ticket = await (await request('/ventas/' + sale.id + '/ticket')).json();
      assert.equal(ticket.venta.cobradoPorNombre, 'María López'); assert(ticket.whatsappText.includes('Cobrado por: María López')); assert(!ticket.whatsappText.includes(user.email));
      for (const width of ['58mm', '80mm']) { const html = await (await request('/ventas/' + sale.id + '/ticket-html?width=' + width)).text(); assert(html.includes('Cobrado por:</strong> María López')); assert(!html.includes(user.email)); assert(html.includes('width: ' + width)); }
    });
    await check('Legacy email resolves within tenant without rewriting stored history', async () => {
      await prisma.venta.update({ where: { id: sale.id }, data: { cobradoPorNombre: user.email } });
      const ticket = await (await request('/ventas/' + sale.id + '/ticket')).json();
      assert.equal(ticket.venta.cobradoPorNombre, 'Nombre actual cambiado'); assert(!ticket.whatsappText.includes(user.email));
      const html = await (await request('/ventas/' + sale.id + '/ticket-html')).text(); assert(!html.includes(user.email)); assert(html.includes('Nombre actual cambiado'));
      assert.equal((await prisma.venta.findUniqueOrThrow({ where: { id: sale.id } })).cobradoPorNombre, user.email);
    });
    await check('Foreign collector IDs and missing identities never expose another business name or an email', async () => {
      const other = await prisma.tenant.create({ data: { nombre: 'Otro ficticio', slug: 'qa-receipt-other' } });
      const foreign = await prisma.usuario.create({ data: { tenantId: other.id, nombre: 'Nombre privado ajeno', email: 'foreign@receipt.invalid', rol: 'DUENO', passwordHash: 'disabled' } });
      for (const id of [foreign.id, null]) { await prisma.venta.update({ where: { id: sale.id }, data: { cobradoPorId: id, cobradoPorNombre: user.email } }); const html = await (await request('/ventas/' + sale.id + '/ticket-html')).text(); assert(html.includes('Nombre no disponible')); assert(!html.includes('Nombre privado ajeno')); assert(!html.includes(user.email)); }
    });
    await check('Collector display is escaped; financial totals and stored history remain unchanged', async () => {
      await prisma.venta.update({ where: { id: sale.id }, data: { cobradoPorNombre: '<b>Nombre ficticio</b>' } });
      const html = await (await request('/ventas/' + sale.id + '/ticket-html')).text(); assert(html.includes('&lt;b&gt;Nombre ficticio&lt;/b&gt;')); assert(!html.includes('<b>Nombre ficticio</b>'));
      assert.equal(await prisma.venta.count(), 1); assert.equal(await prisma.comision.count(), 1); assert.equal(Number((await prisma.venta.findUniqueOrThrow({ where: { id: sale.id } })).total), 100);
    });
    await check('Cash receipt renders branch time despite UTC host and uses clear heading/signature', async () => {
      const at = new Date('2026-10-15T03:00:00Z');
      const cut = await prisma.corteCaja.create({ data: { tenantId: tenant.id, sucursalId: branch.id, usuarioId: user.id, estado: 'CERRADO', fechaApertura: at, fechaCierre: at, fondoInicial: 20, conteoEfectivoReal: 20, descuadre: 0, resumenJson: JSON.stringify({ efectivoEsperado: 20 }) } });
      const html = await (await request('/cortes-caja/' + cut.id + '/comprobante-html')).text();
      assert(html.includes(at.toLocaleString('es-MX', { timeZone: 'America/Cancun' })));
      assert(html.includes('Comprobante de cierre de caja')); assert(html.includes('Hora local de la sucursal · America/Cancun')); assert(html.includes('Firma de quien cierra')); assert(!html.includes('Comprobante de cierre de Arqueo y Cierre'));
    });
    console.log('PASS ' + checks + '/' + checks + ' receipt identity/time checks on disposable SQLite');
  } finally {
    if (server) await new Promise(resolve => { if (server.exitCode !== null) return resolve(); server.once('exit', resolve); server.kill('SIGTERM'); });
    await prisma.$disconnect(); cleanTestFixture(fixture.directory);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');
async function main() {
  const expected = path.resolve(__dirname, '..', '.tools', process.env.SYSTECH_TEST_PG_URL ? 'prisma-uiux-postgres' : 'prisma-uiux', 'client');
  if (process.env.NODE_ENV !== 'test' || process.env.SYSTECH_ISOLATED_TESTS !== 'true' || path.resolve(process.env.SYSTECH_TEST_PRISMA_CLIENT || '.') !== expected) throw new Error('Explicit isolated UI/UX client required');
  const fixture = createTestFixture(); Object.assign(process.env, fixture.env); require('./test_prisma_client');
  const { prisma } = require('@systech/database'), jwt = require('jsonwebtoken'), bcrypt = require('bcryptjs');
  const app = require('../apps/api/dist/index').default;
  const { defaultBookingPersonalization: defaults } = require('../apps/api/dist/services/booking-personalization.service');
  let server, count = 0;
  const check = async (name, fn) => { await fn(); console.log('PASS ' + name); count++; };
  try {
    const a = await prisma.tenant.create({ data: { nombre: 'Personalización A', slug: 'personalization-a', logoUrl: 'https://fixture.invalid/logo.jpg', portadaUrl: 'https://fixture.invalid/portada.jpg', slogan: 'Identidad de prueba', descripcion: 'Descripción ficticia', telefono: '5550000901', emailContacto: 'contacto@fixture.invalid', direccion: 'Ubicación ficticia', instagram: 'https://www.instagram.com/fixture', facebook: 'https://www.facebook.com/fixture', tiktok: 'https://www.tiktok.com/@fixture', whatsappPublico: '5550000901' } });
    const b = await prisma.tenant.create({ data: { nombre: 'Personalización B', slug: 'personalization-b' } });
    const branch = await prisma.sucursal.create({ data: { tenantId: a.id, nombre: 'Matriz' } });
    const barber = await prisma.barbero.create({ data: { sucursalId: branch.id, nombre: 'Barbero demo' } });
    const passwordHash = await bcrypt.hash('FixtureSettings123!', 12);
    const accounts = {};
    for (const role of ['DUENO', 'GERENTE', 'CAJERO', 'BARBERO']) accounts[role] = await prisma.usuario.create({ data: {
      tenantId: a.id, nombre: role, email: `settings-${role.toLowerCase()}@fixture.invalid`, passwordHash, rol: role,
      sucursalId: branch.id, ...(role === 'BARBERO' ? { barberoId: barber.id } : {})
    } });
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (route, method = 'GET', data, role = 'DUENO', forged = {}) => {
      const user = accounts[role];
      const token = user ? jwt.sign({ sub: user.id, tid: user.tenantId, rol: user.rol, sv: 0, ...forged }, process.env.JWT_SECRET) : null;
      const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      return { status: res.status, body: await res.json() };
    };
    const settings = (data, role) => request('/auth/tenant/settings', 'PUT', data, role);
    await check('Legacy tenant defaults agree across public and authenticated session', async () => {
      assert.deepEqual((await request('/auth/me')).body.tenant.personalizacionWeb, defaults);
      assert.deepEqual((await request('/public/barberia/' + a.slug, 'GET', undefined, 'PUBLIC')).body.tenant.personalizacionWeb, defaults);
      const login = await request('/auth/login', 'POST', { email: accounts.DUENO.email, password: 'FixtureSettings123!' }, 'PUBLIC');
      assert.equal(login.status, 200); assert.deepEqual(login.body.tenant.personalizacionWeb, defaults);
    });
    await check('Fresh login includes saved public identity without billing or account relations', async () => {
      const login = await request('/auth/login', 'POST', { email: accounts.DUENO.email, password: 'FixtureSettings123!' }, 'PUBLIC');
      const me = (await request('/auth/me')).body.tenant;
      for (const field of ['logoUrl','portadaUrl','slogan','descripcion','telefono','emailContacto','direccion','instagram','facebook','tiktok','whatsappPublico']) {
        assert.equal(login.body.tenant[field], a[field]); assert.equal(login.body.tenant[field], me[field]);
      }
      for (const field of ['usuarios','suscripcion','sucursales','stripeCustomerId','passwordHash']) assert.equal(login.body.tenant[field], undefined);
    });
    await check('Owner presentation persists and public rendering receives an object', async () => {
      const changes = { tema: 'oceano', portada: 'compacta', posicionPortada: 'top', mostrarEquipo: false, textoBoton: 'Agendar mi corte', mensajeBienvenida: 'Nos vemos en la silla.' };
      const saved = await settings({ personalizacionWeb: changes }); assert.equal(saved.status, 200);
      const stored = await prisma.tenant.findUniqueOrThrow({ where: { id: a.id } });
      assert.deepEqual(JSON.parse(stored.personalizacionWeb), { ...defaults, ...changes });
      const pub = await request('/public/barberia/' + a.slug, 'GET', undefined, 'PUBLIC');
      assert.deepEqual(pub.body.tenant.personalizacionWeb, { ...defaults, ...changes });
      assert.equal(pub.body.tenant.sucursales[0].barberos.length, 1, 'Hiding marketing team must not remove reservable staff data');
    });
    await check('Partial patches preserve prior fields and accept all allowed enums', async () => {
      for (const tema of ['bosque', 'tinta', 'oceano']) assert.equal((await settings({ personalizacionWeb: { tema } })).status, 200);
      for (const portada of ['editorial', 'compacta']) assert.equal((await settings({ personalizacionWeb: { portada } })).status, 200);
      for (const posicionPortada of ['center', 'top', 'bottom']) assert.equal((await settings({ personalizacionWeb: { posicionPortada } })).status, 200);
      const state = (await request('/auth/me')).body.tenant.personalizacionWeb;
      assert.equal(state.textoBoton, 'Agendar mi corte'); assert.equal(state.mostrarEquipo, false);
    });
    await check('Concurrent partial saves retain both options without losing existing identity', async () => {
      const results = await Promise.all([
        settings({ personalizacionWeb: { mostrarHistoria: false } }),
        settings({ personalizacionWeb: { mostrarContacto: false } })
      ]);
      results.forEach(result => assert.equal(result.status, 200));
      const state = (await request('/auth/me')).body.tenant;
      assert.equal(state.personalizacionWeb.mostrarHistoria, false); assert.equal(state.personalizacionWeb.mostrarContacto, false);
      assert.equal(state.personalizacionWeb.textoBoton, 'Agendar mi corte'); assert.equal(state.nombre, a.nombre);
    });
    await check('Invalid personalization and unknown nested options reject atomically', async () => {
      for (const personalizacionWeb of [{ tema: 'ruby' }, { portada: 'full' }, { posicionPortada: 'left' }, { mostrarEquipo: 'false' }, { textoBoton: '' }, { textoBoton: 'x'.repeat(33) }, { mensajeBienvenida: 'x'.repeat(181) }, { injectedCss: 'evil' }, null, []]) {
        assert.equal((await settings({ slogan: 'Must not persist', personalizacionWeb })).status, 400);
      }
      assert.equal((await prisma.tenant.findUniqueOrThrow({ where: { id: a.id } })).slogan, a.slogan);
    });
    await check('All URL settings reject unsafe schemes and credentials', async () => {
      for (const key of ['logoUrl', 'portadaUrl', 'instagram', 'facebook', 'tiktok']) {
        for (const value of ['javascript:alert(1)', 'data:image/svg+xml,bad', 'file:///C:/secrets', 'https://user:pass@example.com/image', '/relative', 'example.com']) assert.equal((await settings({ [key]: value })).status, 400, key + ' ' + value);
        assert.equal((await settings({ [key]: ['logoUrl', 'portadaUrl'].includes(key) ? 'https://example.invalid/photo.jpg' : `https://${key}.com/demo` })).status, 200);
        assert.equal((await settings({ [key]: '' })).status, 200);
        assert.equal((await settings({ [key]: null })).status, 200);
      }
    });
    await check('Social handles and bare official links canonicalize to persisted HTTPS URLs', async () => {
      const saved = await settings({ instagram: '@el.bigote', facebook: 'facebook.com/elbigote', tiktok: '@el_bigote' });
      assert.equal(saved.status, 200);
      assert.equal(saved.body.instagram, 'https://instagram.com/el.bigote');
      assert.equal(saved.body.facebook, 'https://facebook.com/elbigote');
      assert.equal(saved.body.tiktok, 'https://tiktok.com/@el_bigote');
      const pub = (await request('/public/barberia/' + a.slug, 'GET', undefined, 'PUBLIC')).body.tenant;
      assert.equal(pub.instagram, saved.body.instagram); assert.equal(pub.facebook, saved.body.facebook); assert.equal(pub.tiktok, saved.body.tiktok);
      assert.equal((await settings({ instagram: 'el.bigote' })).body.instagram, 'https://instagram.com/el.bigote');
      assert.equal((await settings({ facebook: 'http://www.facebook.com/elbigote' })).body.facebook, 'https://www.facebook.com/elbigote');
    });
    await check('Social URLs reject spoofed domains, other providers, ports and oversized handles', async () => {
      for (const provider of ['instagram', 'facebook', 'tiktok']) {
        for (const value of [`https://${provider}.com.evil.invalid/handle`, `https://evil${provider}.com/handle`, `https://${provider}.com@evil.invalid/handle`, `https://${provider}.com:444/handle`, `https://evil.invalid/${provider}.com`, 'https://instagram.com\\@evil.invalid/path', 'evil.invalid', 'a'.repeat(81), '@bad handle', '@../bad']) {
          assert.equal((await settings({ [provider]: value })).status, 400, provider + ' ' + value);
        }
      }
      assert.equal((await settings({ instagram: 'https://facebook.com/demo' })).status, 400);
      assert.equal((await settings({ tiktok: '@' + 'a'.repeat(25) })).status, 400);
      assert.equal((await settings({ instagram: '@' + 'a'.repeat(31) })).status, 400);
    });
    await check('Settings text and contact inputs are bounded and reject wrong types', async () => {
      for (const data of [{ nombre: '' }, { nombre: 'x'.repeat(121) }, { descripcion: 'x'.repeat(3001) }, { telefono: {} }, { direccion: [] }, { emailContacto: 'bad' }, { whatsappPublico: 'javascript:evil' }, { slug: '../unsafe' }, { slug: '' }, {}]) assert.equal((await settings(data)).status, 400);
    });
    await check('Barber photos reject unsafe schemes on creation and update', async () => {
      assert.equal((await request('/barberos', 'POST', { sucursalId: branch.id, nombre: 'Unsafe photo', avatarUrl: 'javascript:evil' })).status, 400);
      assert.equal((await request('/barberos/' + barber.id, 'PUT', { avatarUrl: 'data:image/svg+xml,bad' })).status, 400);
      assert.equal((await request('/barberos/' + barber.id, 'PUT', { avatarUrl: 'https://example.invalid/barber.jpg' })).status, 200);
      assert.equal((await request('/barberos/' + barber.id, 'PUT', { avatarUrl: '' })).status, 200);
    });
    await check('Duplicate slug returns 409 without changing any other supplied field', async () => {
      const response = await settings({ slug: b.slug, nombre: 'Must not change' });
      assert.equal(response.status, 409); assert.equal(response.body.code, 'SLUG_ALREADY_EXISTS');
      const stored = await prisma.tenant.findUniqueOrThrow({ where: { id: a.id } });
      assert.equal(stored.nombre, a.nombre); assert.equal(stored.slug, a.slug);
    });
    await check('Staff and anonymous requests cannot change the owner settings', async () => {
      for (const role of ['GERENTE', 'CAJERO', 'BARBERO']) assert.equal((await settings({ slogan: 'Forbidden' }, role)).status, 403);
      assert.equal((await settings({ slogan: 'Forbidden' }, 'PUBLIC')).status, 401);
    });
    await check('Forged tenant fields are ignored, signed claims cannot cross tenants', async () => {
      const result = await settings({ tenantId: b.id, plan: 'CADENA', slogan: 'Own tenant only' });
      assert.equal(result.status, 200); assert.equal(result.body.id, a.id); assert.equal(result.body.plan, a.plan);
      assert.equal((await prisma.tenant.findUniqueOrThrow({ where: { id: b.id } })).slogan, null);
      assert.equal((await request('/auth/tenant/settings', 'PUT', { slogan: 'Forged' }, 'DUENO', { tid: b.id })).status, 401);
    });
    await check('Changes audit only affected field names, never supplied contents', async () => {
      await settings({ descripcion: 'Private-contact-marker', personalizacionWeb: { mensajeBienvenida: 'Private-welcome-marker' } });
      const logs = await prisma.auditoriaLog.findMany({ where: { tenantId: a.id, accion: 'CONFIGURACION_ACTUALIZADA' } });
      assert(logs.length > 0); assert(logs.some(log => log.detalles.includes('personalizacionWeb')));
      assert(!JSON.stringify(logs).includes('Private-contact-marker')); assert(!JSON.stringify(logs).includes('Private-welcome-marker'));
    });
    await check('Malformed legacy JSON is normalized field by field without unsafe options', async () => {
      await prisma.tenant.update({ where: { id: a.id }, data: { personalizacionWeb: '{malformed' } });
      assert.deepEqual((await request('/auth/me')).body.tenant.personalizacionWeb, defaults);
      await prisma.tenant.update({ where: { id: a.id }, data: { personalizacionWeb: JSON.stringify({ tema: 'tinta', mostrarEquipo: 'false', textoBoton: '', malicious: true }) } });
      assert.deepEqual((await request('/public/barberia/' + a.slug, 'GET', undefined, 'PUBLIC')).body.tenant.personalizacionWeb, { ...defaults, tema: 'tinta' });
    });
    await check('Service descriptions persist publicly but cannot reference another tenant', async () => {
      const service = await prisma.producto.create({data:{tenantId:a.id,nombre:'Corte demo',tipo:'SERVICIO',precioVenta:200}});
      const foreign = await prisma.producto.create({data:{tenantId:b.id,nombre:'Foreign',tipo:'SERVICIO',precioVenta:200}});
      assert.equal((await settings({personalizacionWeb:{descripcionesServicios:{[service.id]:'Corte y acabado.'}}})).status,200);
      const published = await request('/public/barberia/'+a.slug,'GET',undefined,'PUBLIC');
      assert.equal(published.body.tenant.personalizacionWeb.descripcionesServicios[service.id],'Corte y acabado.');
      assert.equal((await settings({personalizacionWeb:{descripcionesServicios:{[foreign.id]:'Forbidden'}}})).status,400);
      assert.equal((await settings({personalizacionWeb:{descripcionesServicios:{[service.id]:'x'.repeat(501)}}})).status,400);
      assert.equal((await settings({personalizacionWeb:{descripcionesServicios:{[service.id]:'Forbidden'}}},'BARBERO')).status,403);
      assert.equal((await request('/public/barberia/'+b.slug,'GET',undefined,'PUBLIC')).body.tenant.personalizacionWeb.descripcionesServicios[foreign.id],undefined);
    });
    await check('Availability distinguishes rest days, too-long services, occupancy and past times', async () => {
      const isolatedBranch = await prisma.sucursal.create({data:{tenantId:a.id,nombre:'Availability fixture',diasLaborales:'Lunes a Domingo',horarioApertura:'09:00',horarioCierre:'10:00',zonaHoraria:'America/Mexico_City'}});
      const professional = await prisma.barbero.create({data:{sucursalId:isolatedBranch.id,nombre:'Availability',horarioInicio:'09:00',horarioFin:'10:00',diasDescanso:''}});
      const date = new Date(Date.now()+3*86400000).toISOString().slice(0,10);
      const route = duration => `/public/disponibilidad?sucursalId=${isolatedBranch.id}&barberoId=${professional.id}&fecha=${date}&duracion=${duration}`;
      assert.equal((await request(route(15),'GET',undefined,'PUBLIC')).body.reason,null);
      assert.equal((await request(route(480),'GET',undefined,'PUBLIC')).body.reason,'SERVICE_DOES_NOT_FIT');
      await prisma.barbero.update({where:{id:professional.id},data:{diasDescanso:'Lunes a Domingo'}});
      assert.equal((await request(route(15),'GET',undefined,'PUBLIC')).body.reason,'NO_SCHEDULE');
      await prisma.barbero.update({where:{id:professional.id},data:{diasDescanso:''}});
      await prisma.bloqueoHorario.create({data:{tenantId:a.id,sucursalId:isolatedBranch.id,barberoId:professional.id,motivo:'Fixture',fechaInicio:new Date(date+'T15:00:00Z'),fechaFin:new Date(date+'T16:00:00Z')}});
      assert.equal((await request(route(15),'GET',undefined,'PUBLIC')).body.reason,'FULL');
      const pastDate = new Date(Date.now()-3*86400000).toISOString().slice(0,10);
      assert.equal((await request(route(15).replace(date,pastDate),'GET',undefined,'PUBLIC')).body.reason,'DAY_ENDED');
    });
    console.log(`Personalization regressions: ${count}/${count} passed`);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); cleanTestFixture(fixture.directory);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

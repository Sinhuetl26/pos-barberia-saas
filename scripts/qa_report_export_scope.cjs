const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createTestFixture, cleanTestFixture } = require('./test_fixture');

async function main() {
  const fixture = createTestFixture(); Object.assign(process.env, fixture.env);
  const { prisma } = require('@systech/database');
  const { default: app } = require('../apps/api/dist/index');
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const sign = user => jwt.sign({ sub: user.id, tid: user.tenantId, rol: user.rol, sv: user.sessionVersion }, fixture.env.JWT_SECRET, { expiresIn: '1h' });
  let checks = 0;
  try {
    const tenant = await prisma.tenant.create({ data: { nombre: 'QA reportes', slug: 'qa-reportes' } });
    const owner = await prisma.usuario.create({ data: { tenantId: tenant.id, nombre: 'Dueño QA', email: 'owner-report@fixture.invalid', rol: 'DUENO', passwordHash: 'fixture', emailVerifiedAt: new Date() } });
    const branchA = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Sucursal A' } });
    const branchB = await prisma.sucursal.create({ data: { tenantId: tenant.id, nombre: 'Sucursal B' } });
    const barberA = await prisma.barbero.create({ data: { sucursalId: branchA.id, nombre: 'Alex QA' } });
    const barberB = await prisma.barbero.create({ data: { sucursalId: branchB.id, nombre: 'Mateo QA' } });
    const sale = (id, branch, barber, folio, date, state = 'COMPLETADA') => prisma.venta.create({ data: { id, tenantId: tenant.id, sucursalId: branch.id, barberoId: barber.id, folio, total: 100, metodoPago: 'EFECTIVO', fecha: date, estado: state } });
    await sale('report-visible', branchA, barberA, 'QA-VISIBLE', new Date());
    await sale('report-other-branch', branchB, barberB, 'QA-OTHER-BRANCH', new Date());
    await sale('report-cancelled', branchA, barberA, 'QA-CANCELLED', new Date(), 'CANCELADA');
    const query = new URLSearchParams({ periodo: 'hoy', sucursalId: branchA.id, barberoId: barberA.id });
    const response = await fetch(`${base}/reportes/exportar/ventas-csv?${query}`, { headers: { authorization: `Bearer ${sign(owner)}`, 'x-test-suite': 'true' } });
    assert.equal(response.status, 200); checks++;
    const csv = await response.text();
    assert(csv.includes('QA-VISIBLE')); assert(!csv.includes('QA-OTHER-BRANCH')); assert(!csv.includes('QA-CANCELLED')); checks++;
    assert.match(response.headers.get('content-disposition') || '', /ventas_systech_hoy\.csv/); checks++;
    console.log(`Report export scope: ${checks}/${checks} passed`);
  } finally { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); cleanTestFixture(fixture.directory); }
}
main().catch(error => { console.error(error); process.exit(1); });

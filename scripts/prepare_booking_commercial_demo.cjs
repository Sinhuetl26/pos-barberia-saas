'use strict';
// Add one fictitious tenant to the identified isolated preview; never seed dev.db.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, '.tools/dv-preview.json'), 'utf8'));
const target = 'file:' + path.join(root, '.test-db-TrhWfE/test.db').replace(/\\/g, '/');
if (manifest.database !== target || process.argv[2] !== '--apply') throw new Error('Explicit isolated preview required');
Object.assign(process.env, {NODE_ENV:'test',SYSTECH_ISOLATED_TESTS:'true',DATABASE_URL:target,
  SYSTECH_TEST_PRISMA_CLIENT:path.join(root,'.tools/prisma-cut-reference/client')});
require('./test_prisma_client');
const {prisma} = require('@systech/database');
const bcrypt = require('bcryptjs');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main() {
  const operational = path.join(root,'packages/database/prisma/dev.db');
  const before = fs.existsSync(operational) ? hash(operational) : null;
  const existing = await prisma.tenant.findUnique({where:{slug:'estudio-norte-demo'}});
  if (existing) throw new Error('Demo already exists; refusing to overwrite');
  const qa = await prisma.tenant.findUniqueOrThrow({where:{slug:'dv-r01'},include:{sucursales:{include:{barberos:true}},productos:true}});
  const oldQa = JSON.stringify(qa);
  const demo = await prisma.$transaction(async tx => {
    const tenant = await tx.tenant.create({data:{nombre:'Estudio Norte',slug:'estudio-norte-demo',plan:'PRO',
      slogan:'Tu corte. Tu estilo. Tu momento.',descripcion:'Una barbería de demostración para descubrir cómo reservar tu próxima visita. Elige un servicio y el profesional con quien quieres atenderte.',
      portadaUrl:'http://127.0.0.1:5179/demo-reservas/portada.jpg',logoUrl:'http://127.0.0.1:5179/demo-reservas/logo.svg',
      personalizacionWeb:JSON.stringify({tema:'bosque',portada:'editorial',posicionPortada:'center',mostrarEquipo:true,mostrarServicios:true,mostrarHistoria:true,mostrarContacto:true,textoBoton:'Reservar cita',mensajeBienvenida:'Demo ficticia de SYSTECH. Fotografía e ilustraciones de ejemplo; no corresponden a un establecimiento ni a su personal.'})}});
    const branch = await tx.sucursal.create({data:{tenantId:tenant.id,nombre:'Estudio de demostración',direccion:'Ubicación de ejemplo · Colima, México',diasLaborales:'Lunes a Sábado',horarioApertura:'09:00',horarioCierre:'19:00',configuradaEn:new Date()}});
    const barbers = [];
    for (const [nombre,especialidad,avatar] of [['Alex','Cortes clásicos','alex'],['Mateo','Degradados y textura','mateo'],['Luis','Barba y perfilado','luis']]) {
      barbers.push(await tx.barbero.create({data:{sucursalId:branch.id,nombre,especialidad,avatarUrl:`http://127.0.0.1:5179/demo-reservas/${avatar}.svg`,descripcion:'Perfil ficticio de demostración.',diasDescanso:'Domingo',horarioInicio:'09:00',horarioFin:'19:00',comisionServiciosPct:40}}));
    }
    const services = [];
    for (const [nombre,categoria,precioVenta,duracionMinutos] of [['Corte clásico','Corte',200,30],['Degradado','Corte',250,45],['Diseño de barba','Barba',150,30],['Corte y barba','Corte y barba',350,60]]) {
      services.push(await tx.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre,categoria,precioVenta,duracionMinutos,tipo:'SERVICIO'}}));
    }
    const owner = await tx.usuario.create({data:{tenantId:tenant.id,nombre:'Dueño demo',rol:'DUENO',email:'demo-norte@fixture.invalid',passwordHash:await bcrypt.hash('NorteDemoLocal2026!',12),sucursalId:branch.id,emailVerifiedAt:new Date()}});
    await tx.suscripcion.create({data:{tenantId:tenant.id,estadoPago:'active'}});
    return {tenantId:tenant.id,branchId:branch.id,ownerId:owner.id,barberIds:barbers.map(b=>b.id),serviceIds:services.map(s=>s.id)};
  });
  const newQa = await prisma.tenant.findUniqueOrThrow({where:{id:qa.id},include:{sucursales:{include:{barberos:true}},productos:true}});
  if (oldQa !== JSON.stringify(newQa) || (before && before !== hash(operational))) throw new Error('Unexpected existing-data change');
  const output = {createdAt:new Date().toISOString(),...demo,url:'http://127.0.0.1:5179/b/estudio-norte-demo',database:target,qaProfileUnchanged:true,operationalDatabaseUnchanged:true,externalContacts:false};
  fs.writeFileSync(path.join(root,'.tools/booking-commercial-demo.json'),JSON.stringify(output,null,2)+'\n');
  console.log('Created isolated Estudio Norte demo: 4 services, 3 fictitious profiles; QA profile and operational database unchanged.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());

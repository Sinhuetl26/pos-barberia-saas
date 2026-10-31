'use strict';
// A fresh disposable database per preparation; existing previews are never reset.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
if (process.argv[2] !== '--create') throw new Error('Use --create to prepare a new fictitious demo.');
Object.assign(process.env, { NODE_ENV:'test', SYSTECH_ISOLATED_TESTS:'true', SYSTECH_TEST_PRISMA_CLIENT:path.join(root,'.tools/prisma-cut-reference/client') });
require('./test_prisma_client');
const {createTestFixture} = require('./test_fixture');
const fixture = createTestFixture();
Object.assign(process.env, fixture.env);
const {prisma} = require('@systech/database'), bcrypt = require('bcryptjs');
const hash = p => fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null;
const operational = path.join(root,'packages/database/prisma/dev.db');
const before = hash(operational);
async function main() {
  const password = 'CierreDemoLocal2026!';
  const passwordHash = await bcrypt.hash(password,12);
  const ids = await prisma.$transaction(async tx => {
    const tenant = await tx.tenant.create({data:{nombre:'Estudio Norte · Demo de cierre',slug:'cierre-demo',plan:'PRO',slogan:'Tu corte. Tu estilo. Tu momento.',descripcion:'Negocio ficticio para probar el recorrido completo.',logoUrl:'http://127.0.0.1:5190/demo-reservas/logo.svg',portadaUrl:'http://127.0.0.1:5190/demo-reservas/portada.jpg',personalizacionWeb:JSON.stringify({tema:'bosque',portada:'editorial',mensajeBienvenida:'Demo ficticia. Fotografías e ilustraciones de ejemplo; no corresponden al negocio ni a su equipo.'})}});
    const branch = await tx.sucursal.create({data:{tenantId:tenant.id,nombre:'Sucursal ficticia',zonaHoraria:'America/Mexico_City',diasLaborales:'Lunes a Sábado',horarioApertura:'09:00',horarioCierre:'19:00',direccion:'Ubicación ficticia de demostración',configuradaEn:new Date()}});
    await tx.suscripcion.create({data:{tenantId:tenant.id,estadoPago:'active'}});
    const barbers=[];
    for (const [nombre,especialidad] of [['Alex','Cortes clásicos'],['Mateo','Degradados'],['Luis','Barba y perfilado']]) barbers.push(await tx.barbero.create({data:{sucursalId:branch.id,nombre,especialidad,descripcion:'Perfil ficticio de demostración.',avatarUrl:`http://127.0.0.1:5190/demo-reservas/${nombre.toLowerCase()}.svg`,diasDescanso:'Domingo',horarioInicio:'09:00',horarioFin:'19:00',comisionServiciosPct:40,comisionProductosPct:10}}));
    const owner=await tx.usuario.create({data:{tenantId:tenant.id,sucursalId:branch.id,rol:'DUENO',nombre:'Dueño ficticio',email:'dueno-cierre@fixture.invalid',passwordHash,emailVerifiedAt:new Date()}});
    const barberUser=await tx.usuario.create({data:{tenantId:tenant.id,sucursalId:branch.id,barberoId:barbers[0].id,rol:'BARBERO',nombre:'Alex ficticio',email:'barbero-cierre@fixture.invalid',passwordHash,emailVerifiedAt:new Date()}});
    const services=[];
    for (const [nombre,precioVenta,duracionMinutos] of [['Corte clásico',200,30],['Degradado',250,45],['Corte y barba',350,60]]) services.push(await tx.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,tipo:'SERVICIO',nombre,categoria:'Servicios',precioVenta,duracionMinutos}}));
    const products=[];
    for (const [nombre,precioVenta,costo,stockActual,stockMinimo,sku] of [['Pomada mate demo',180,80,8,3,'DEMO-POMADA'],['Aceite de barba demo',150,60,2,3,'DEMO-ACEITE'],['Peine demo',60,20,5,1,'DEMO-PEINE']]) {
      const p=await tx.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre,tipo:'PRODUCTO',categoria:'Reventa',precioVenta,costo,stockActual,stockMinimo,sku}}); products.push(p);
      await tx.kardexMovimiento.create({data:{tenantId:tenant.id,sucursalId:branch.id,productoId:p.id,tipoMovimiento:'ENTRADA_COMPRA',cantidad:stockActual,stockAnterior:0,stockNuevo:stockActual,motivo:'Inventario inicial ficticio de demo',usuarioId:owner.id}});
    }
    const customers=[];
    for (const nombre of ['Cliente Demo Uno','Cliente Demo Dos','Cliente Demo Tres']) customers.push(await tx.clienteFinal.create({data:{tenantId:tenant.id,sucursalOrigenId:branch.id,nombre,notasEstilo:'Preferencia ficticia: laterales cortos.'}}));
    const date=new Date(); date.setUTCDate(date.getUTCDate()+1); date.setUTCHours(16,0,0,0); if(date.getUTCDay()===0)date.setUTCDate(date.getUTCDate()+1);
    const appointments=[];
    for(let i=0;i<3;i++) appointments.push(await tx.cita.create({data:{tenantId:tenant.id,sucursalId:branch.id,barberoId:barbers[i].id,clienteId:customers[i].id,servicioId:services[i].id,nombreServicio:services[i].nombre,precioEstimado:services[i].precioVenta,duracionMinutos:services[i].duracionMinutos,fechaHora:new Date(date.getTime()+i*3600000),estado:i===2?'CANCELADA':i===1?'CONFIRMADA':'PENDIENTE',tipoCorte:'Referencia textual ficticia'}}));
    const other=await tx.tenant.create({data:{nombre:'Otro negocio ficticio',slug:'cierre-otro',plan:'PRO'}});
    const otherBranch=await tx.sucursal.create({data:{tenantId:other.id,nombre:'Otra sucursal',configuradaEn:new Date()}});
    await tx.suscripcion.create({data:{tenantId:other.id,estadoPago:'active'}});
    const otherOwner=await tx.usuario.create({data:{tenantId:other.id,sucursalId:otherBranch.id,rol:'DUENO',nombre:'Otro dueño ficticio',email:'otro-cierre@fixture.invalid',passwordHash,emailVerifiedAt:new Date()}});
    return {tenantId:tenant.id,branchId:branch.id,ownerId:owner.id,barberUserId:barberUser.id,barberIds:barbers.map(x=>x.id),serviceIds:services.map(x=>x.id),productIds:products.map(x=>x.id),appointmentIds:appointments.map(x=>x.id),otherTenantId:other.id,otherOwnerId:otherOwner.id};
  },{timeout:20000});
  if(hash(operational)!==before)throw new Error('Operational database changed unexpectedly.');
  const manifest={createdAt:new Date().toISOString(),database:fixture.env.DATABASE_URL,directory:fixture.directory,...ids,apiPort:3102,webPort:5190,url:'http://127.0.0.1:5190/b/cierre-demo',credentials:{owner:'dueno-cierre@fixture.invalid',barber:'barbero-cierre@fixture.invalid',other:'otro-cierre@fixture.invalid',password},operationalDatabaseUnchanged:true,providersDisabled:true,pendingFixtures:['Ventas históricas mediante servicio transaccional','Conteos ST-41','Recetas e insumos ST-42','Reserva pública y recuperación en navegador']};
  fs.mkdirSync(path.join(root,'.tools'),{recursive:true});
  fs.writeFileSync(path.join(root,'.tools/closure-demo.json'),JSON.stringify(manifest,null,2)+'\n');
  fs.writeFileSync(path.join(fixture.directory,'closure-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('Prepared a new isolated closure demo: 2 tenants, 3 profiles, 3 services, 3 products, 3 customers, 3 appointments. Existing databases unchanged.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());

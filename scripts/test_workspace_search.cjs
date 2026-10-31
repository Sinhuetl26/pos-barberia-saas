'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const { fork } = require('node:child_process');
const {createTestFixture,cleanTestFixture} = require('./test_fixture');
async function main() {
  if(Boolean(process.env.SYSTECH_TEST_PG_URL)!==Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT))throw new Error('PostgreSQL search requires guarded test URL and separate client together.');
  const fixture=createTestFixture(); Object.assign(process.env,fixture.env);
  if(process.env.SYSTECH_TEST_PRISMA_CLIENT)require('./test_prisma_client');
  const {prisma}=require('@systech/database'),jwt=require('jsonwebtoken'); let child,checks=0;
  const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
  try {
    const tenant=await prisma.tenant.create({data:{nombre:'Search fixture',slug:'qa-search',plan:'PRO'}});
    const other=await prisma.tenant.create({data:{nombre:'Foreign fixture',slug:'qa-search-other',plan:'PRO'}});
    const branch=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Assigned fixture'}});
    const foreignBranch=await prisma.sucursal.create({data:{tenantId:other.id,nombre:'Foreign fixture'}});
    const second=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Unassigned fixture'}});
    const barber=await prisma.barbero.create({data:{sucursalId:branch.id,nombre:'Own barber'}});
    const peer=await prisma.barbero.create({data:{sucursalId:branch.id,nombre:'Peer barber'}});
    const users=[];
    for(const role of ['DUENO','GERENTE','BARBERO','CAJERO'])users.push(await prisma.usuario.create({data:{tenantId:tenant.id,nombre:role,email:role.toLowerCase()+'@search.invalid',passwordHash:'disabled',rol:role,sucursalId:branch.id,sucursalesAsignadasJson:JSON.stringify([branch.id]),barberoId:role==='BARBERO'?barber.id:null}}));
    const customer=await prisma.clienteFinal.create({data:{tenantId:tenant.id,nombre:'Objeto local',sucursalOrigenId:branch.id}});
    const privateCustomer=await prisma.clienteFinal.create({data:{tenantId:other.id,nombre:'Objeto extranjero',sucursalOrigenId:foreignBranch.id}});
    const privateLocalCustomer=await prisma.clienteFinal.create({data:{tenantId:tenant.id,nombre:'Objeto cliente sucursal privada',sucursalOrigenId:second.id}});
    const privateLocalBarber=await prisma.barbero.create({data:{sucursalId:second.id,nombre:'Equipo sucursal privada'}});
    const privateLocalAppointment=await prisma.cita.create({data:{tenantId:tenant.id,sucursalId:second.id,barberoId:privateLocalBarber.id,clienteId:privateLocalCustomer.id,fechaHora:new Date(),nombreServicio:'Objeto cita sucursal privada'}});
    const product=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'Objeto local',precioVenta:20}});
    await prisma.producto.create({data:{tenantId:other.id,sucursalId:foreignBranch.id,nombre:'Objeto extranjero',precioVenta:20}});
    await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:second.id,nombre:'Objeto sucursal privada',precioVenta:20}});
    const own=await prisma.cita.create({data:{tenantId:tenant.id,sucursalId:branch.id,barberoId:barber.id,clienteId:customer.id,fechaHora:new Date(),nombreServicio:'Objeto propio'}});
    const peerAppointment=await prisma.cita.create({data:{tenantId:tenant.id,sucursalId:branch.id,barberoId:peer.id,clienteId:customer.id,fechaHora:new Date(),nombreServicio:'Objeto ajeno'}});
    const base=await new Promise((resolve,reject)=>{child=fork(path.join(__dirname,'test_server.js'),[],{env:fixture.env,execArgv:process.env.SYSTECH_TEST_PRISMA_CLIENT?['--require',path.join(__dirname,'test_prisma_client.js')]:[],stdio:['ignore','ignore','pipe','ipc']});child.stderr.on('data',d=>process.stderr.write(d)); const timeout=setTimeout(()=>reject(new Error('API startup timeout')),20000);child.once('message',m=>{clearTimeout(timeout);resolve(m.base+'/api');});});
    const request=async(user,branchId=branch.id,q='objeto')=>{const token=user?jwt.sign({sub:user.id,tid:user.tenantId,rol:user.rol,sv:user.sessionVersion},fixture.env.JWT_SECRET):null;
      const response=await fetch(base+'/operacion/buscar?'+new URLSearchParams({sucursalId:branchId,q}),{headers:token?{Authorization:'Bearer '+token}:{}});return {status:response.status,body:await response.json(),cacheControl:response.headers.get('cache-control')};};
    await check('anonymous cannot search',async()=>assert.equal((await request(null)).status,401));
    await check('owner search is case-insensitive and branch-scoped',async()=>{const r=await request(users[0]);assert.equal(r.status,200);assert.equal(r.body.products.length,1);assert.equal(r.body.products[0].id,product.id);assert.equal(r.body.clients.length,1);assert.equal(r.body.clients[0].id,customer.id);assert.equal(r.body.appointments.length,2);for(const hidden of [privateCustomer.id,privateLocalCustomer.id,privateLocalAppointment.id,privateLocalCustomer.nombre])assert(!JSON.stringify(r.body).includes(hidden));});
    await check('manager cannot query unassigned or foreign branch',async()=>{assert.equal((await request(users[1])).status,200);assert.equal((await request(users[1],second.id)).status,404);assert.equal((await request(users[1],foreignBranch.id)).status,404);});
    await check('barber sees only own appointments and no CRM list',async()=>{const r=await request(users[2]);assert.equal(r.status,200);assert.deepEqual(r.body.clients,[]);assert.deepEqual(r.body.appointments.map(a=>a.id),[own.id]);assert(!JSON.stringify(r.body).includes(peerAppointment.id));});
    await check('empty and oversized search rejected',async()=>{assert.equal((await request(users[0],branch.id,'')).status,400);assert.equal((await request(users[0],branch.id,'x'.repeat(81))).status,400);});
    await check('search results contain no financial, authentication or reference-photo fields',async()=>{const r=await request(users[0]);const text=JSON.stringify(r.body);for(const key of ['passwordHash','tokenCancelacion','fotoReferencia','costo','totalComision'])assert(!text.includes(key));});
    await check('SQL-looking input is treated as text and authenticated responses cannot be cached',async()=>{const r=await request(users[0],branch.id,"'; DROP TABLE Producto; --");assert.equal(r.status,200);assert.deepEqual(r.body.products,[]);assert.deepEqual(r.body.clients,[]);assert.deepEqual(r.body.appointments,[]);assert.equal(r.cacheControl,'no-store');assert.equal(await prisma.producto.count(),3);});
    await check('Result groups are independently capped at eight actual matches instead of loading the entire private base',async()=>{
      for(let n=0;n<13;n++){const c=await prisma.clienteFinal.create({data:{tenantId:tenant.id,sucursalOrigenId:branch.id,nombre:'Bound entry '+n}});await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'Bound entry '+n,precioVenta:20}});await prisma.cita.create({data:{tenantId:tenant.id,sucursalId:branch.id,barberoId:barber.id,clienteId:c.id,fechaHora:new Date(Date.now()+n*1000),nombreServicio:'Bound entry '+n}});}
      const owner=await request(users[0],branch.id,'BOUND');assert.equal(owner.status,200);for(const group of ['clients','products','appointments'])assert.equal(owner.body[group].length,8,group);
      const professional=await request(users[2],branch.id,'Bound');assert.equal(professional.status,200);assert.deepEqual(professional.body.clients,[]);assert.equal(professional.body.appointments.length,8);assert.equal(professional.body.products.length,8);
    });
    await check('Inactive and soft-deleted products are not returned by search',async()=>{
      await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'Hidden catalog inactive',precioVenta:1,activo:false}});await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'Hidden catalog deleted',precioVenta:1,eliminadoEn:new Date()}});
      const r=await request(users[0],branch.id,'Hidden catalog');assert.equal(r.status,200);assert.deepEqual(r.body.products,[]);
    });
    await check('LIKE wildcard tokens do not turn literal search into a broad private directory listing',async()=>{
      for(const query of ['%%','__']){const r=await request(users[0],branch.id,query);assert.equal(r.status,200);assert.deepEqual(r.body.products,[],query+' products');assert.deepEqual(r.body.clients,[],query+' clients');assert.deepEqual(r.body.appointments,[],query+' appointments');}
    });
    await check('Literal underscore, percent and backslash SKU searches match intended item without wildcard expansion',async()=>{
      const under=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'Literal underscore item',sku:'AB_CD',precioVenta:1}});await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'Similar nonliteral item',sku:'ABXCD',precioVenta:1}});
      const percent=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'Literal percent item',sku:'RATE%%50',precioVenta:1}});const slash=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'Literal slash item',sku:'C:\\TOOLS',precioVenta:1}});
      for(const [query,id]of[['AB_CD',under.id],['%%',percent.id],['C:\\',slash.id]]){const r=await request(users[0],branch.id,query);assert.equal(r.status,200,JSON.stringify(r));assert.deepEqual(r.body.products.map(p=>p.id),[id]);}
    });
    await check('Operational supplies are searchable by manager but not retail-facing barber results',async()=>{
      const supply=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'Operational supply test',sku:'SUPPLY_LIT',precioVenta:0,naturaleza:'INSUMO',unidad:'ML'}});
      const manager=await request(users[1],branch.id,'SUPPLY_LIT');assert.equal(manager.status,200);assert.deepEqual(manager.body.products.map(p=>p.id),[supply.id]);const professional=await request(users[2],branch.id,'SUPPLY_LIT');assert.equal(professional.status,200);assert.deepEqual(professional.body.products,[]);
    });
    await check('Cashier searches assigned operational records without stock-cost or supply access',async()=>{
      const cashier=users[3],r=await request(cashier);assert.equal(r.status,200);assert.equal(r.body.clients.length,1);assert.equal(r.body.appointments.length,2);assert.equal(r.body.products.length,1);
      assert.equal((await request(cashier,second.id)).status,404);assert.equal((await request(cashier,foreignBranch.id)).status,404);
      assert.deepEqual((await request(cashier,branch.id,'SUPPLY_LIT')).body.products,[]);
      for(const key of ['stockActual','costo','totalComision','passwordHash','fotoReferencia'])assert(!JSON.stringify(r.body).includes(key));
    });
    console.log('Workspace search:',checks,'checks passed');
  } finally {if(child)await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');});await prisma.$disconnect();cleanTestFixture(fixture.directory);}
}
main().catch(error=>{console.error(error);process.exitCode=1;});



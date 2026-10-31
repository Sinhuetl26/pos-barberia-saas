'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const{fork}=require('node:child_process');const{createTestFixture,cleanTestFixture}=require('./test_fixture');
async function main(){
 if(Boolean(process.env.SYSTECH_TEST_PG_URL)!==Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT))throw Error('PG requires guarded URL and separate client.');
 const fixture=createTestFixture();Object.assign(process.env,fixture.env);if(process.env.SYSTECH_TEST_PRISMA_CLIENT)require('./test_prisma_client');
 const{prisma}=require('@systech/database'),jwt=require('jsonwebtoken');const servers=[];let checks=0;
 const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
 const start=async()=>{const c=fork(path.join(__dirname,'test_server.js'),[],{env:fixture.env,execArgv:process.env.SYSTECH_TEST_PRISMA_CLIENT?['--require',path.join(__dirname,'test_prisma_client.js')]:[],stdio:['ignore','ignore','pipe','ipc']});servers.push(c);c.stderr.on('data',d=>process.stderr.write(d));return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('API timeout')),20000);c.once('message',m=>{clearTimeout(timer);resolve(m.base+'/api')})})};
 try{
  const bases=[await start(),await start()];let turn=0;
  const tenant=await prisma.tenant.create({data:{nombre:'Supplies QA fictitious',slug:'qa-supplies',plan:'PRO'}});
  const branch=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'QA branch'}}),barber=await prisma.barbero.create({data:{sucursalId:branch.id,nombre:'QA barber'}});
  const owner=await prisma.usuario.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'QA owner',rol:'DUENO',email:'supplies@qa.invalid',passwordHash:'disabled'}});
  const customer=await prisma.clienteFinal.create({data:{tenantId:tenant.id,nombre:'QA client',telefono:'5550000009'}});
  const token=jwt.sign({sub:owner.id,tid:tenant.id,rol:owner.rol,sv:owner.sessionVersion},fixture.env.JWT_SECRET,{expiresIn:'1h'});
  const req=async(endpoint,body,method=body===undefined?'GET':'POST',accessToken=token)=>{const r=await fetch(bases[turn++%2]+endpoint,{method,headers:{'content-type':'application/json',authorization:'Bearer '+accessToken},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()}};
  const stock=async(id)=>Number((await prisma.producto.findUniqueOrThrow({where:{id}})).stockActual);
  const service=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'QA cut',tipo:'SERVICIO',precioVenta:10}});
  let supply,recipe,sale;
  const publish=(items,version,key,serviceId=service.id)=>req('/inventario/recetas/'+serviceId,{items,versionEsperada:version,idempotencyKey:key});
  const saleInput=(key,quantity=1,citaId)=>({sucursalId:branch.id,barberoId:barber.id,clienteId:customer.id,metodoPago:'TARJETA',items:[{productoId:service.id,cantidad:quantity}],idempotencyKey:key,...(citaId?{citaId}:{})});
  const appointment=async(serv=service)=>prisma.cita.create({data:{tenantId:tenant.id,sucursalId:branch.id,barberoId:barber.id,clienteId:customer.id,servicioId:serv.id,nombreServicio:serv.nombre,precioEstimado:serv.precioVenta,duracionMinutos:30,serviciosJson:JSON.stringify([{id:serv.id,nombre:serv.nombre,precio:Number(serv.precioVenta),duracion:30,tasaImpuesto:0}]),fechaHora:new Date(),estado:'CONFIRMADA'}});
  await check('Supply ML initial stock, sub-cent cost, presentation conversion and decimal rejection are explicit',async()=>{
   const r=await req('/productos',{sucursalId:branch.id,nombre:'QA lotion',sku:'QA-ML',precioVenta:0,costo:0.05,stockActual:500,stockMinimo:10,naturaleza:'INSUMO',unidad:'ML',presentacionCantidad:250,presentacionNombre:'Bottle',idempotencyKey:'supply-create'});assert.equal(r.status,200,JSON.stringify(r));supply=r.body;assert.equal(await stock(supply.id),500);assert.equal(Number(supply.costo),0.05);
   const converted=await req('/inventario/movimiento',{productoId:supply.id,tipoMovimiento:'ENTRADA_COMPRA',cantidad:1,cantidadPresentaciones:0.5,motivo:'QA half bottle',idempotencyKey:'half-bottle'});assert.equal(converted.status,200,JSON.stringify(converted));assert.equal(await stock(supply.id),625);
   const revert=await req('/inventario/movimiento',{productoId:supply.id,tipoMovimiento:'USO_INTERNO',cantidad:125,motivo:'QA restore base fixture',idempotencyKey:'base-restore'});assert.equal(revert.status,200);assert.equal(await stock(supply.id),500);
   for(const bad of[0.0001,1.2345,-1,true])assert.equal((await req('/inventario/movimiento',{productoId:supply.id,tipoMovimiento:'ENTRADA_COMPRA',cantidad:bad,idempotencyKey:'bad-'+String(bad)})).status,400);
  });
  await check('Versioned recipe accepts only base-compatible supplies and exact retry, not changed content',async()=>{
   const input=[{productoId:supply.id,unidad:'ML',cantidad:5}];const r=await publish(input,0,'recipe-v1');assert.equal(r.status,200,JSON.stringify(r));recipe=r.body;assert.equal(recipe.version,1);assert.equal((await publish(input,0,'recipe-v1')).body.id,recipe.id);
   assert.equal((await publish([{...input[0],unidad:'G'}],1,'recipe-wrong-unit')).status,400);assert.equal((await publish([{...input[0],cantidad:6}],0,'recipe-v1')).status,409);
  });
  await check('Sixty completed services consume exactly300ML once; historical version/cost survives catalog edits and monetary refund',async()=>{
   const results=await Promise.all(Array.from({length:6},()=>req('/ventas',saleInput('sixty-services',60))));assert(results.every(r=>r.status===200),JSON.stringify(results));sale=results[0].body.venta;assert.equal(await stock(supply.id),200);
   const events=await prisma.consumoServicio.findMany({where:{tenantId:tenant.id,ventaId:sale.id}});assert.equal(events.length,1);assert.equal(events[0].recetaVersion,1);const history=JSON.parse(events[0].itemsJson);assert.equal(history[0].cantidad,300);assert.equal(Number(history[0].costoUnitario),0.05);assert.equal(Number(history[0].costoTotal),15);
   await prisma.producto.update({where:{id:supply.id},data:{costo:0.25}});assert.equal((await prisma.consumoServicio.findUniqueOrThrow({where:{id:events[0].id}})).itemsJson,events[0].itemsJson);
   const refund=await req('/ventas/'+sale.id+'/cancelar',{motivo:'QA monetary return performed service',idempotencyKey:'sixty-refund'});assert.equal(refund.status,200,JSON.stringify(refund));assert.equal(await stock(supply.id),200);assert.equal(await prisma.consumoServicio.count({where:{ventaId:sale.id}}),1);
  });
  await check('Physical count of150ML versus expected200ML shows50ML difference and reconciles with compensating movement',async()=>{
   const start=await req('/inventario/conteos',{sucursalId:branch.id,productoIds:[supply.id],idempotencyKey:'supply-count'});assert.equal(start.status,200,JSON.stringify(start));const count=start.body;assert.equal(count.items[0].stockReferencia,200);assert.equal(count.items[0].unidad,'ML');
   const save=await req('/inventario/conteos/'+count.id,{versionEsperada:count.version,items:[{productoId:supply.id,cantidadContada:150}],idempotencyKey:'supply-count-save'},'PUT');assert.equal(save.status,200);assert.equal(save.body.items[0].stockReferencia-save.body.items[0].cantidadContada,50);
   const confirm=await req('/inventario/conteos/'+count.id+'/confirmar',{versionEsperada:save.body.version,motivo:'QA physical difference review, no attribution',idempotencyKey:'supply-count-confirm'});assert.equal(confirm.status,200,JSON.stringify(confirm));assert.equal(await stock(supply.id),150);
   const adjust=await prisma.kardexMovimiento.findFirstOrThrow({where:{productoId:supply.id,tipoMovimiento:'AJUSTE_INVENTARIO'}});assert.equal(Number(adjust.cantidad),-50);
  });
  await check('Completing appointment then publishing next recipe and charging it does not consume a second time',async()=>{
   const cita=await appointment();const completion=await req('/citas/'+cita.id+'/status',{estado:'COMPLETADA'},'PUT');assert.equal(completion.status,200,JSON.stringify(completion));assert.equal(await stock(supply.id),145);
   const r=await publish([{productoId:supply.id,unidad:'ML',cantidad:2}],1,'recipe-v2');assert.equal(r.status,200);const paid=await req('/ventas',saleInput('completed-then-pos',1,cita.id));assert.equal(paid.status,200,JSON.stringify(paid));assert.equal(await stock(supply.id),145);
   const newSale=await req('/ventas',saleInput('next-recipe'));assert.equal(newSale.status,200);assert.equal(await stock(supply.id),143);const historical=await prisma.consumoServicio.findFirstOrThrow({where:{citaId:cita.id}});assert.equal(historical.recetaVersion,1);
  });
  await check('Cancelled appointment consumes nothing; missing recipe completion cannot retroactively consume after recipe added',async()=>{
   const cancelled=await appointment();const before=await stock(supply.id);assert.equal((await req('/citas/'+cancelled.id+'/status',{estado:'CANCELADA'},'PUT')).status,200);assert.equal(await stock(supply.id),before);
   const unconfigured=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'No recipe service',tipo:'SERVICIO',precioVenta:20}});const cita=await appointment(unconfigured);assert.equal((await req('/citas/'+cita.id+'/status',{estado:'COMPLETADA'},'PUT')).status,200);
   assert.equal((await publish([{productoId:supply.id,unidad:'ML',cantidad:5}],0,'late-recipe',unconfigured.id)).status,200);
   const paid=await req('/ventas',{...saleInput('late-recipe-payment',1,cita.id),items:[{productoId:unconfigured.id,cantidad:1}]});assert.equal(paid.status,200,JSON.stringify(paid));assert.equal(await stock(supply.id),before);assert.equal((await prisma.consumoServicio.findFirstOrThrow({where:{citaId:cita.id}})).recetaVersion,0);
  });
  await check('Concurrent completion and payment share one consumption event; operational supplies are not retail cart items',async()=>{
   const cita=await appointment(),before=await stock(supply.id);const replies=await Promise.all([req('/citas/'+cita.id+'/status',{estado:'COMPLETADA'},'PUT'),...Array.from({length:4},()=>req('/ventas',saleInput('racing-completion',1,cita.id)))]);assert(replies.every(r=>r.status===200),JSON.stringify(replies));assert.equal(await stock(supply.id),before-2);assert.equal(await prisma.consumoServicio.count({where:{citaId:cita.id}}),1);
   const invalid=await req('/ventas',{...saleInput('forbidden-supply'),items:[{productoId:supply.id,cantidad:1}]});assert.equal(invalid.status,400,JSON.stringify(invalid));assert.equal(invalid.body.code,'SUPPLY_NOT_FOR_SALE');assert.equal(await stock(supply.id),before-2);
  });
  await check('Insufficient later supply rolls back earlier consumption and all sale/event effects',async()=>{
   const empty=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'QA empty supply',tipo:'PRODUCTO',naturaleza:'INSUMO',unidad:'ML',precioVenta:0,stockActual:0}});
   const multi=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'QA multi recipe service',tipo:'SERVICIO',precioVenta:10}});
   assert.equal((await publish([{productoId:supply.id,unidad:'ML',cantidad:1},{productoId:empty.id,unidad:'ML',cantidad:1}],0,'multi-recipe',multi.id)).status,200);
   const before={stock:await stock(supply.id),sales:await prisma.venta.count(),events:await prisma.consumoServicio.count(),ledger:await prisma.kardexMovimiento.count(),operations:await prisma.pOSOperacion.count()};
   const failed=await req('/ventas',{...saleInput('insufficient-consumption'),items:[{productoId:multi.id,cantidad:1}]});assert.equal(failed.status,400,JSON.stringify(failed));assert.equal(failed.body.code,'INSUFFICIENT_STOCK');
   assert.deepEqual({stock:await stock(supply.id),sales:await prisma.venta.count(),events:await prisma.consumoServicio.count(),ledger:await prisma.kardexMovimiento.count(),operations:await prisma.pOSOperacion.count()},before);
  });
  await check('Reconciliation shows physical50ML difference with explicit tolerance and does not invent history for missing ledger',async()=>{
   const before=await stock(supply.id),ledgerBefore=await prisma.kardexMovimiento.count();
   const below=await req('/inventario/insumos/conciliacion?sucursalId='+branch.id+'&tolerancia=49');assert.equal(below.status,200,JSON.stringify(below));const row=below.body.productos.find(p=>p.productoId===supply.id);assert(row);assert.equal(row.informacionSuficiente,true);assert.equal(row.saldoEsperado,before);assert.equal(row.ultimoConteo.saldoReferencia,200);assert.equal(row.ultimoConteo.cantidadContada,150);assert.equal(row.ultimoConteo.diferenciaAbsoluta,50);assert.equal(row.ultimoConteo.fueraTolerancia,true);
   const boundary=await req('/inventario/insumos/conciliacion?sucursalId='+branch.id+'&tolerancia=50');assert.equal(boundary.status,200);assert.equal(boundary.body.productos.find(p=>p.productoId===supply.id).ultimoConteo.fueraTolerancia,false);
   const incomplete=boundary.body.productos.find(p=>p.nombre==='QA empty supply');assert(incomplete);assert.equal(incomplete.informacionSuficiente,false);assert.equal(incomplete.saldoEsperado,null);assert.equal(incomplete.estado,'INFORMACION_INSUFICIENTE');assert.equal(await stock(supply.id),before);assert.equal(await prisma.kardexMovimiento.count(),ledgerBefore);
  });
  await check('Recipe and reconciliation permissions isolate operational supplies by role, branch and tenant',async()=>{
   const other=await prisma.tenant.create({data:{nombre:'Private supplies QA',slug:'private-supplies-qa'}}),otherBranch=await prisma.sucursal.create({data:{tenantId:other.id,nombre:'Private branch'}});
   const otherSupply=await prisma.producto.create({data:{tenantId:other.id,sucursalId:otherBranch.id,nombre:'Never disclose private lotion',naturaleza:'INSUMO',unidad:'ML',precioVenta:0,stockActual:500}});
   const manager=await prisma.usuario.create({data:{tenantId:tenant.id,sucursalId:branch.id,rol:'GERENTE',nombre:'QA manager',email:'manager-supplies@qa.invalid',passwordHash:'disabled'}}),barberUser=await prisma.usuario.create({data:{tenantId:tenant.id,sucursalId:branch.id,barberoId:barber.id,rol:'BARBERO',nombre:'QA barber',email:'barber-supplies@qa.invalid',passwordHash:'disabled'}});
   const sign=u=>jwt.sign({sub:u.id,tid:u.tenantId,rol:u.rol,sv:u.sessionVersion},fixture.env.JWT_SECRET,{expiresIn:'1h'});
   const own=await req('/inventario/insumos/conciliacion?sucursalId='+branch.id);assert.equal(own.status,200);assert.equal(JSON.stringify(own.body).includes(otherSupply.id),false);assert.equal(JSON.stringify(own.body).includes(otherSupply.nombre),false);
   assert.equal((await req('/inventario/insumos/conciliacion?sucursalId='+branch.id,undefined,'GET',sign(barberUser))).status,403);
   assert([403,404].includes((await req('/inventario/insumos/conciliacion?sucursalId='+otherBranch.id,undefined,'GET',sign(manager))).status));
   assert.equal((await req('/inventario/recetas/'+service.id,{versionEsperada:2,items:[],idempotencyKey:'barber-forbidden-recipe'},'POST',sign(barberUser))).status,403);
  });
  await check('Physical consumption correction compensates once, preserves original event/cost and rejects stale editing',async()=>{
   const rows=await req('/inventario/consumos?sucursalId='+branch.id);assert.equal(rows.status,200,JSON.stringify(rows));const event=rows.body.find(e=>e.recetaVersion===1&&e.citaId&&e.items[0]?.cantidad===5);assert(event,'Expected the5ML completed visit');
   const original=await prisma.consumoServicio.findUniqueOrThrow({where:{id:event.id}}),before=await stock(supply.id),ledgerBefore=await prisma.kardexMovimiento.count();
   const input={versionEsperada:event.version,motivo:'QA measured3ML instead of5ML',items:[{productoId:supply.id,cantidadReal:3}],idempotencyKey:'physical-consumption-correction'};
   const replies=await Promise.all(Array.from({length:4},()=>req('/inventario/consumos/'+event.id+'/corregir',input)));assert(replies.every(r=>r.status===200),JSON.stringify(replies));assert.equal(await stock(supply.id),before+2);assert.equal(await prisma.kardexMovimiento.count(),ledgerBefore+1);
   assert.equal((await prisma.consumoServicio.findUniqueOrThrow({where:{id:event.id}})).itemsJson,original.itemsJson);
   const replay=await req('/inventario/consumos/'+event.id+'/corregir',input);assert.equal(replay.status,200);assert.equal(await stock(supply.id),before+2);
   const stale=await req('/inventario/consumos/'+event.id+'/corregir',{...input,idempotencyKey:'physical-correction-stale',items:[{productoId:supply.id,cantidadReal:4}]});assert.equal(stale.status,409,JSON.stringify(stale));assert.equal(await stock(supply.id),before+2);
   const reread=await req('/inventario/consumos?sucursalId='+branch.id);const history=reread.body.find(e=>e.id===event.id);assert.equal(history.items[0].cantidad,5);assert.equal(history.itemsActuales[0].cantidad,3);assert.equal(history.correcciones.length,1);assert.equal(history.version,1);assert.equal(history.itemsActuales[0].costoUnitario,history.items[0].costoUnitario);
  });
  console.log('PASS '+checks+' independent supply checks on '+(process.env.SYSTECH_TEST_PG_URL?'isolated PostgreSQL':'disposable SQLite'));
 }finally{await Promise.all(servers.map(c=>new Promise(resolve=>{if(c.exitCode!==null)return resolve();c.once('exit',resolve);c.kill('SIGTERM')})));await prisma.$disconnect();cleanTestFixture(fixture.directory)}
}
main().catch(e=>{console.error(e);process.exitCode=1});


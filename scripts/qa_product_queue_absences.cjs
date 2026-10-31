'use strict';
const assert=require('node:assert/strict'),path=require('node:path');const{fork}=require('node:child_process');const{createTestFixture,cleanTestFixture}=require('./test_fixture');
async function main(){
 if(Boolean(process.env.SYSTECH_TEST_PG_URL)!==Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT))throw Error('PG requires guarded URL and separate client.');
 const fixture=createTestFixture();Object.assign(process.env,fixture.env);if(process.env.SYSTECH_TEST_PRISMA_CLIENT)require('./test_prisma_client');const{prisma}=require('@systech/database'),jwt=require('jsonwebtoken');const servers=[];let checks=0;
 const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
 const start=async()=>{const c=fork(path.join(__dirname,'test_server.js'),[],{env:fixture.env,execArgv:process.env.SYSTECH_TEST_PRISMA_CLIENT?['--require',path.join(__dirname,'test_prisma_client.js')]:[],stdio:['ignore','ignore','pipe','ipc']});servers.push(c);c.stderr.on('data',d=>process.stderr.write(d));return new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('API timeout')),20000);c.once('message',m=>{clearTimeout(t);resolve(m.base+'/api')})})};
 try{
  const bases=[await start(),await start()];let turn=0;
  const tenant=await prisma.tenant.create({data:{nombre:'Queue QA fictitious',slug:'qa-queue',plan:'PRO'}});
  const branch=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Full-day fixture',horarioApertura:'00:00',horarioCierre:'23:59',zonaHoraria:'UTC',diasLaborales:'Lunes,Martes,Miércoles,Jueves,Viernes,Sábado,Domingo'}});
  const barbers=await Promise.all(['One','Two'].map(nombre=>prisma.barbero.create({data:{sucursalId:branch.id,nombre,horarioInicio:'00:00',horarioFin:'23:59',diasDescanso:''}})));
  const owner=await prisma.usuario.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'QA owner',rol:'DUENO',email:'queue-owner@qa.invalid',passwordHash:'disabled'}}),professional=await prisma.usuario.create({data:{tenantId:tenant.id,sucursalId:branch.id,barberoId:barbers[0].id,nombre:'QA barber',rol:'BARBERO',email:'queue-barber@qa.invalid',passwordHash:'disabled'}});
  const service=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'QA short service',tipo:'SERVICIO',duracionMinutos:5,precioVenta:30}});
  const sign=u=>jwt.sign({sub:u.id,tid:u.tenantId,rol:u.rol,sv:u.sessionVersion},fixture.env.JWT_SECRET,{expiresIn:'1h'});
  const req=async(endpoint,body,user=owner,method=body===undefined?'GET':'POST')=>{const r=await fetch(bases[turn++%2]+endpoint,{method,headers:{'content-type':'application/json',...(user?{authorization:'Bearer '+sign(user)}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()}};
  const join=async(key,extras={})=>{const r=await req('/citas/fila',{sucursalId:branch.id,servicioIds:[service.id],idempotencyKey:key,...extras});assert.equal(r.status,200,JSON.stringify(r));return r.body};
  const operate=(row,operation,key,extra={},user=owner)=>req('/citas/fila/'+row.id+'/'+operation,{versionEsperada:row.version,idempotencyKey:key,...extra},user);
  const date=new Date();date.setUTCDate(date.getUTCDate()+3);const day=date.toISOString().slice(0,10);
  const book=async(time,barber=barbers[0],key='future-'+time)=>{const r=await req('/citas',{sucursalId:branch.id,barberoId:barber.id,servicioId:service.id,fechaHora:day+'T'+time+':00',clienteNombre:'QA appointment '+time,clienteTelefono:'555'+String(++turn).padStart(7,'0'),idempotencyKey:key});assert.equal(r.status,200,JSON.stringify(r));return r.body};
  const availability=(barber)=>req('/public/disponibilidad?'+new URLSearchParams({sucursalId:branch.id,barberoId:barber.id,fecha:day,servicioId:service.id}),undefined,null);
  let queue;
  await check('Walk-in person can omit contact/name; lost join response recovers one persistent queue row',async()=>{
   queue=await join('queue-optional');assert.equal(queue.clienteNombre,null);assert.equal(queue.clienteTelefono,null);assert.equal(queue.estado,'ESPERANDO');const retry=await join('queue-optional');assert.equal(retry.id,queue.id);assert.equal(await prisma.filaPresencial.count(),1);assert.equal(await prisma.cita.count(),0);
   const list=await req('/citas/fila?sucursalId='+branch.id);assert.equal(list.status,200);assert.equal(list.body[0].id,queue.id);
  });
  await check('Two operators cannot claim same arrival twice; reassign keeps same appointment and exact key recovers response',async()=>{
   const results=await Promise.all(['claim-a','claim-b'].map(key=>operate(queue,'asignar',key,{barberoId:barbers[0].id})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409],JSON.stringify(results));const index=results.findIndex(r=>r.status===200),key=index===0?'claim-a':'claim-b',assigned=results[index].body;assert.equal(assigned.estado,'ASIGNADO');assert.equal(await prisma.cita.count(),1);
   const recovered=await operate(queue,'asignar',key,{barberoId:barbers[0].id});assert.equal(recovered.status,200,JSON.stringify(recovered));assert.equal(recovered.body.citaId,assigned.citaId);
   const reassign=await operate(assigned,'reasignar','reassign-same-cita',{barberoId:barbers[1].id});assert.equal(reassign.status,200,JSON.stringify(reassign));assert.equal(reassign.body.citaId,assigned.citaId);assert.equal(reassign.body.barberoId,barbers[1].id);assert.equal(await prisma.cita.count(),1);queue=reassign.body;
  });
  await check('Assigned customer withdrawal preserves queue and cancelled appointment, without financial or external message effects',async()=>{
   const notices=await prisma.notificacionLog.count();const r=await operate(queue,'retirar','withdraw-queue',{motivo:'QA left before service'});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.body.estado,'RETIRADO');assert.equal(await prisma.filaPresencial.count(),1);assert.equal((await prisma.cita.findUniqueOrThrow({where:{id:queue.citaId}})).estado,'CANCELADA');assert.equal(await prisma.venta.count(),0);assert.equal(await prisma.notificacionLog.count(),notices);assert.equal((await operate(queue,'retirar','withdraw-queue',{motivo:'QA left before service'})).status,200);
  });
  await check('Two different arrivals cannot simultaneously occupy the same professional time',async()=>{
   const rows=[await join('overlap-arrival-a'),await join('overlap-arrival-b')];const replies=await Promise.all(rows.map((row,n)=>operate(row,'asignar','overlap-assignment-'+n,{barberoId:barbers[1].id})));assert.deepEqual(replies.map(r=>r.status).sort(),[200,409],JSON.stringify(replies));const winner=replies.find(r=>r.status===200).body;assert.equal((await operate(winner,'retirar','free-overlap-professional',{motivo:'QA release fixture capacity'})).status,200);
  });
  await check('Attention cannot be withdrawn; checkout links correct visit and marks queue attended once',async()=>{
   const row=await join('queue-attend',{clienteNombre:'QA person',barberoPreferidoId:barbers[0].id});const assigned=await operate(row,'asignar','assign-attend',{barberoId:barbers[0].id});assert.equal(assigned.status,200,JSON.stringify(assigned));const attention=await operate(assigned.body,'atender','attention');assert.equal(attention.status,200,JSON.stringify(attention));assert.equal(attention.body.estado,'EN_ATENCION');assert.equal((await operate(attention.body,'retirar','bad-withdraw',{motivo:'QA invalid after start'})).status,409);
   const cita=await prisma.cita.findUniqueOrThrow({where:{id:attention.body.citaId}});const input={sucursalId:branch.id,barberoId:barbers[0].id,citaId:cita.id,clienteId:cita.clienteId,metodoPago:'TARJETA',items:[{productoId:service.id,cantidad:1}],idempotencyKey:'queue-checkout'};const paid=await req('/ventas',input);assert.equal(paid.status,200,JSON.stringify(paid));assert.equal(paid.body.venta.citaId,cita.id);assert.equal((await prisma.filaPresencial.findUniqueOrThrow({where:{id:row.id}})).estado,'ATENDIDO');assert.equal((await req('/ventas',input)).body.replayed,true);
  });
  let absence;
  await check('Absence impact changes after a new booking; missing acknowledgement rejects and confirmation preserves affected appointments',async()=>{
   const first=await book('12:00'),beforeAvailability=await availability(barbers[0]);assert.equal(beforeAvailability.status,200);assert.equal(beforeAvailability.body.slots.find(s=>s.hora==='11:00').disponible,true);
   absence={tipo:'AUSENCIA',sucursalId:branch.id,barberoId:barbers[0].id,fechaInicio:day+'T10:00:00',fechaFin:day+'T14:00:00',motivo:'QA dated absence'};const preview=await req('/bloqueos/impacto',absence);assert.equal(preview.status,200,JSON.stringify(preview));assert.equal(preview.body.totalAfectadas,1);const second=await book('13:00');
   const stale=await req('/bloqueos/ausencias',{...absence,previewHash:preview.body.previewHash,aceptarCitasAfectadas:true,idempotencyKey:'absence-stale'});assert.equal(stale.status,409,JSON.stringify(stale));assert.equal(stale.body.code,'IMPACT_CHANGED');assert.equal(await prisma.bloqueoHorario.count(),0);
   const current=await req('/bloqueos/impacto',absence);assert.equal(current.status,200);assert.equal(current.body.totalAfectadas,2);const unack=await req('/bloqueos/ausencias',{...absence,previewHash:current.body.previewHash,idempotencyKey:'absence-unack'});assert.equal(unack.status,409);assert.equal(unack.body.code,'AFFECTED_APPOINTMENTS_ACK_REQUIRED');
   const notices=await prisma.notificacionLog.count();const payload={...absence,previewHash:current.body.previewHash,aceptarCitasAfectadas:true,idempotencyKey:'absence-confirm'};const replies=await Promise.all(Array.from({length:4},()=>req('/bloqueos/ausencias',payload)));assert(replies.every(r=>r.status===200),JSON.stringify(replies));assert.equal(await prisma.bloqueoHorario.count(),1);assert.equal(await prisma.notificacionLog.count(),notices);
   for(const booking of[first,second]){const stored=await prisma.cita.findUniqueOrThrow({where:{id:booking.id}});assert.equal(stored.estado,'CONFIRMADA');assert.equal(stored.fechaHora.toISOString(),booking.fechaHora);}
   const after=await availability(barbers[0]);assert.equal(after.body.slots.find(s=>s.hora==='11:00').disponible,false);const peer=await availability(barbers[1]);assert.equal(peer.body.slots.find(s=>s.hora==='11:00').disponible,true);
  });
  await check('Dated shift preview identifies conflict, preserves existing visit and public availability follows special shift',async()=>{
   const cita=await book('12:00',barbers[1],'special-old-visit');const input={tipo:'HORARIO_ESPECIAL',sucursalId:branch.id,barberoId:barbers[1].id,fecha:day,horarioInicio:'09:00',horarioFin:'11:00',motivo:'QA dated shift'};const preview=await req('/bloqueos/impacto',input);assert.equal(preview.status,200,JSON.stringify(preview));assert.equal(preview.body.totalAfectadas,1);
   const confirmed=await req('/bloqueos/horarios',{...input,previewHash:preview.body.previewHash,aceptarCitasAfectadas:true,idempotencyKey:'special-shift'});assert.equal(confirmed.status,200,JSON.stringify(confirmed));assert.equal((await prisma.cita.findUniqueOrThrow({where:{id:cita.id}})).estado,'CONFIRMADA');const available=await availability(barbers[1]);assert.equal(available.status,200);assert.equal(available.body.slots.find(s=>s.hora==='10:00').disponible,true);assert.equal(available.body.slots.some(s=>s.hora==='12:00'),false);
  });
  await check('Foreign tenant and peer-barber queue claims are rejected; barber cannot change professional absence',async()=>{
   const other=await prisma.tenant.create({data:{nombre:'Foreign queue QA',slug:'qa-queue-foreign'}}),otherBranch=await prisma.sucursal.create({data:{tenantId:other.id,nombre:'Private branch'}}),otherOwner=await prisma.usuario.create({data:{tenantId:other.id,sucursalId:otherBranch.id,nombre:'Other owner',rol:'DUENO',email:'queue-other@qa.invalid',passwordHash:'disabled'}});
   const preferred=await join('queue-peer-preference',{clienteNombre:'QA peer guest',barberoPreferidoId:barbers[1].id});assert([403,404].includes((await operate(preferred,'asignar','steal-peer',{},professional)).status));assert([403,404].includes((await operate(preferred,'retirar','steal-tenant',{motivo:'QA forbidden'},otherOwner)).status));assert.equal((await req('/bloqueos/impacto',absence,professional)).status,403);
   const foreign=await req('/citas/fila?sucursalId='+branch.id,undefined,otherOwner);assert([403,404].includes(foreign.status));assert.equal((await req('/citas/fila?sucursalId='+branch.id,undefined,null)).status,401);
  });
  await check('Explicit professional price must be confirmed before assigning a queue visit; replay and reassignment preserve its original snapshot',async()=>{
   const pricedBranch=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Isolated priced queue',horarioApertura:'00:00',horarioCierre:'23:59',zonaHoraria:'UTC',diasLaborales:'Lunes,Martes,Miércoles,Jueves,Viernes,Sábado,Domingo'}});
   const pricedBarbers=await Promise.all(['Priced A','Priced B'].map(nombre=>prisma.barbero.create({data:{sucursalId:pricedBranch.id,nombre,horarioInicio:'00:00',horarioFin:'23:59',diasDescanso:''}})));
   const pricedService=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:pricedBranch.id,nombre:'Priced queue cut',tipo:'SERVICIO',duracionMinutos:5,precioVenta:100}});
   for(const[index,barber]of pricedBarbers.entries()){
    const rule=await req('/inventario/tarifas',{sucursalId:pricedBranch.id,barberoId:barber.id,servicioId:pricedService.id,precio:index===0?280:420,vigenteDesde:new Date(Date.now()-3600000).toISOString(),vigenteHasta:null,versionEsperada:0,idempotencyKey:'priced-queue-rule-'+index});assert.equal(rule.status,200,JSON.stringify(rule));
   }
   const joined=await req('/citas/fila',{sucursalId:pricedBranch.id,servicioIds:[pricedService.id],clienteNombre:'QA priced arrival',barberoPreferidoId:pricedBarbers[0].id,idempotencyKey:'priced-queue-arrival'});assert.equal(joined.status,200,JSON.stringify(joined));
   const arrival=joined.body,beforeCount=await prisma.cita.count({where:{tenantId:tenant.id,sucursalId:pricedBranch.id}});
   for(const[marker,price]of [['missing',undefined],['wrong',279]]){
    const rejected=await operate(arrival,'asignar','priced-queue-'+marker,{sucursalId:pricedBranch.id,barberoId:pricedBarbers[0].id,...(price===undefined?{}:{precioConfirmado:price})});assert.equal(rejected.status,409,JSON.stringify(rejected));assert.equal(rejected.body.code,'PRICE_CONFIRMATION_REQUIRED');
    assert.equal(await prisma.cita.count({where:{tenantId:tenant.id,sucursalId:pricedBranch.id}}),beforeCount);const unchanged=await prisma.filaPresencial.findUniqueOrThrow({where:{id:arrival.id}});assert.equal(unchanged.estado,'ESPERANDO');assert.equal(unchanged.version,arrival.version);assert.equal(unchanged.citaId,null);
   }
   const selection={sucursalId:pricedBranch.id,barberoId:pricedBarbers[0].id,precioConfirmado:280};
   const assigned=await operate(arrival,'asignar','priced-queue-confirm',selection);assert.equal(assigned.status,200,JSON.stringify(assigned));
   const original=await prisma.cita.findUniqueOrThrow({where:{id:assigned.body.citaId}});assert.equal(Number(original.precioEstimado),280);assert.equal(JSON.parse(original.serviciosJson)[0].precio,280);
   const replay=await operate(arrival,'asignar','priced-queue-confirm',selection);assert.equal(replay.status,200,JSON.stringify(replay));assert.equal(replay.body.citaId,original.id);assert.equal(await prisma.cita.count({where:{tenantId:tenant.id,sucursalId:pricedBranch.id}}),beforeCount+1);
   const reassigned=await operate(assigned.body,'reasignar','priced-queue-reassign',{sucursalId:pricedBranch.id,barberoId:pricedBarbers[1].id});assert.equal(reassigned.status,200,JSON.stringify(reassigned));assert.equal(reassigned.body.citaId,original.id);
   const stored=await prisma.cita.findUniqueOrThrow({where:{id:original.id}});assert.equal(stored.barberoId,pricedBarbers[1].id);assert.equal(Number(stored.precioEstimado),280);assert.equal(stored.serviciosJson,original.serviciosJson);assert.equal(await prisma.cita.count({where:{tenantId:tenant.id,sucursalId:pricedBranch.id}}),beforeCount+1);
  });
  console.log('PASS '+checks+' queue/absence checks on '+(process.env.SYSTECH_TEST_PG_URL?'isolated PostgreSQL':'disposable SQLite'));
 }finally{await Promise.all(servers.map(c=>new Promise(resolve=>{if(c.exitCode!==null)return resolve();c.once('exit',resolve);c.kill('SIGTERM')})));await prisma.$disconnect();cleanTestFixture(fixture.directory)}
}
main().catch(e=>{console.error(e);process.exitCode=1});

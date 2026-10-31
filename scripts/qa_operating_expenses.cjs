'use strict';
const assert=require('node:assert/strict'),path=require('node:path');const{fork}=require('node:child_process');const{createTestFixture,cleanTestFixture}=require('./test_fixture');
async function main(){
 if(Boolean(process.env.SYSTECH_TEST_PG_URL)!==Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT))throw Error('PG requires guarded URL and separate client.');const fixture=createTestFixture();Object.assign(process.env,fixture.env);if(process.env.SYSTECH_TEST_PRISMA_CLIENT)require('./test_prisma_client');const{prisma}=require('@systech/database'),jwt=require('jsonwebtoken');const servers=[];let checks=0;
 const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
 const start=async()=>{const c=fork(path.join(__dirname,'test_server.js'),[],{env:fixture.env,execArgv:process.env.SYSTECH_TEST_PRISMA_CLIENT?['--require',path.join(__dirname,'test_prisma_client.js')]:[],stdio:['ignore','ignore','pipe','ipc']});servers.push(c);c.stderr.on('data',d=>process.stderr.write(d));return new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('API timeout')),20000);c.once('message',m=>{clearTimeout(t);resolve(m.base+'/api')})})};
 try{
  const bases=[await start(),await start()];let turn=0;
  const tenant=await prisma.tenant.create({data:{nombre:'Expense QA',slug:'qa-expenses',plan:'CADENA'}}),branch=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Expense branch',zonaHoraria:'America/Mexico_City'}}),second=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Unassigned expense branch'}});
  const users={};for(const rol of['DUENO','GERENTE','BARBERO','CAJERO'])users[rol]=await prisma.usuario.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:rol,rol,email:rol+'@expenses.invalid',passwordHash:'disabled'}});
  const foreign=await prisma.tenant.create({data:{nombre:'Other expense tenant',slug:'qa-expenses-other'}}),foreignBranch=await prisma.sucursal.create({data:{tenantId:foreign.id,nombre:'Other branch'}}),foreignOwner=await prisma.usuario.create({data:{tenantId:foreign.id,sucursalId:foreignBranch.id,nombre:'Other owner',rol:'DUENO',email:'other@expenses.invalid',passwordHash:'disabled'}});
  const sign=u=>jwt.sign({sub:u.id,tid:u.tenantId,rol:u.rol,sv:u.sessionVersion},fixture.env.JWT_SECRET,{expiresIn:'1h'});
  const req=async(endpoint,body,user=users.DUENO,method=body===undefined?'GET':'POST')=>{const r=await fetch(bases[turn++%2]+endpoint,{method,headers:{'content-type':'application/json',authorization:'Bearer '+sign(user)},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()}};
  const open=await req('/cortes-caja/abrir',{sucursalId:branch.id,fondoInicial:100,idempotencyKey:'expenses-open'});assert.equal(open.status,200,JSON.stringify(open));const cut=open.body;
  const drawer=async()=>100+Number((await prisma.registroCaja.aggregate({where:{tenantId:tenant.id,sucursalId:branch.id,corteCajaId:cut.id,metodoPago:'EFECTIVO',custodiaUsuarioId:null},_sum:{monto:true}}))._sum.monto||0);
  const base={sucursalId:branch.id,concepto:'QA rent',categoria:'RENTA',fecha:'2026-10-13T10:00:00',importe:25,metodoPago:'EFECTIVO',comprobanteReferencia:'QA-REF'};
  const correction=(row,next,key,user=users.DUENO)=>req('/reportes/gastos/'+row.id+'/corregir',{...next,versionEsperada:row.version,revisionHash:row.revisionHash,motivo:'QA documented correction',idempotencyKey:key},user);let expense;
  await check('Cash expense retries remove money once; original operation metadata and local date persist',async()=>{
   const replies=await Promise.all(Array.from({length:6},()=>req('/reportes/gastos',{...base,idempotencyKey:'cash-expense'})));assert(replies.every(r=>r.status===200),JSON.stringify(replies));assert.equal(new Set(replies.map(r=>r.body.id)).size,1);expense=replies[0].body;assert.equal(await drawer(),75);assert.equal(expense.original.importe,25);assert.equal(expense.original.fecha,'2026-10-13T16:00:00.000Z');assert.equal(expense.usuarioNombre,users.DUENO.email);assert.equal(await prisma.gastoOperativo.count(),1);assert.equal(await prisma.registroCaja.count(),1);
  });
  await check('Bank expense changes operational list but not physical drawer; inventory purchase is explicitly excluded from operating expense',async()=>{
   const bank=await req('/reportes/gastos',{...base,concepto:'QA electricity',categoria:'SERVICIOS',metodoPago:'TRANSFERENCIA',importe:30,idempotencyKey:'bank-expense'});assert.equal(bank.status,200);assert.equal(bank.body.esGastoOperativo,true);assert.equal(await drawer(),75);assert.equal(bank.body.registroCajaId,null);
   const purchase=await req('/reportes/gastos',{...base,concepto:'QA inventory purchase',categoria:'COMPRA_INVENTARIO',metodoPago:'TARJETA',importe:40,idempotencyKey:'purchase-expense'});assert.equal(purchase.status,200);assert.equal(purchase.body.esGastoOperativo,false);assert.equal(await drawer(),75);
  });
  await check('Correction is compensatory, preserves original record/cost and rejects stale version while retrying once',async()=>{
   const original=await prisma.gastoOperativo.findUniqueOrThrow({where:{id:expense.id}});const next={...base,importe:30};const result=await correction(expense,next,'expense-to30');assert.equal(result.status,200,JSON.stringify(result));assert.equal(await drawer(),70);assert.equal(result.body.actual.importe,30);assert.equal(result.body.original.importe,25);assert.equal(result.body.correcciones.length,1);assert.equal((await correction(expense,next,'expense-to30')).status,200);assert.equal(await drawer(),70);
   const stored=await prisma.gastoOperativo.findUniqueOrThrow({where:{id:expense.id}});assert.equal(Number(stored.importe),Number(original.importe));assert.equal(stored.concepto,original.concepto);assert.equal(stored.registroCajaId,original.registroCajaId);
   assert.equal((await correction(expense,{...base,importe:20},'stale-correction')).status,409);assert.equal(await drawer(),70);expense=result.body;
  });
  await check('Cash-to-transfer correction restores original drawer money without erasing expense history',async()=>{
   const result=await correction(expense,{...base,importe:30,metodoPago:'TRANSFERENCIA'},'expense-to-bank');assert.equal(result.status,200,JSON.stringify(result));assert.equal(await drawer(),100);assert.equal(result.body.actual.metodoPago,'TRANSFERENCIA');assert.equal(result.body.correcciones.length,2);assert.equal(result.body.original.metodoPago,'EFECTIVO');expense=result.body;
  });
  await check('Compensatory cash outflow cannot be classified again as an operating expense',async()=>{
   const correctionRow=await prisma.correccionGasto.findFirstOrThrow({where:{gastoId:expense.id,registroCajaId:{not:null}},orderBy:{fecha:'asc'}});const cash=await prisma.registroCaja.findUniqueOrThrow({where:{id:correctionRow.registroCajaId}});assert.equal(Number(cash.monto),-5);
   const candidates=await req('/reportes/gastos/salidas?sucursalId='+branch.id);assert.equal(candidates.status,200,JSON.stringify(candidates));assert(!candidates.body.some(r=>r.id===cash.id));const before=await prisma.gastoOperativo.count();
   const duplicate=await req('/reportes/gastos',{...base,concepto:cash.concepto,importe:5,registroCajaId:cash.id,idempotencyKey:'correction-reclassified'});assert.equal(duplicate.status,409,JSON.stringify(duplicate));assert.equal(await prisma.gastoOperativo.count(),before);assert.equal(await drawer(),100);
  });
  await check('Linking existing cash expense records no second cash movement; same link cannot be reused',async()=>{
   const movement=await req('/cortes-caja/movimiento',{sucursalId:branch.id,corteCajaId:cut.id,tipo:'GASTO_MENOR',monto:10,concepto:'QA linked maintenance',idempotencyKey:'existing-cash-expense'});assert.equal(movement.status,200);assert.equal(await drawer(),90);const row=await prisma.registroCaja.findFirstOrThrow({where:{tenantId:tenant.id,concepto:'QA linked maintenance'}}),before=await prisma.registroCaja.count();
   const input={...base,concepto:row.concepto,categoria:'MANTENIMIENTO',importe:10,registroCajaId:row.id,idempotencyKey:'link-expense'};const linked=await req('/reportes/gastos',input);assert.equal(linked.status,200,JSON.stringify(linked));assert.equal(linked.body.registroCajaId,row.id);assert.equal(await drawer(),90);assert.equal(await prisma.registroCaja.count(),before);
   assert.equal((await req('/reportes/gastos',{...input,idempotencyKey:'duplicate-link'})).status,409);assert.equal((await req('/reportes/gastos',{...input,importe:11,idempotencyKey:'mismatching-link'})).status,400);assert.equal(await drawer(),90);
  });
  await check('Insufficient cash, wrong amounts and unauthorized roles leave expense and cash intact',async()=>{
   const before={expenses:await prisma.gastoOperativo.count(),cash:await prisma.registroCaja.count(),drawer:await drawer()};assert.equal((await req('/reportes/gastos',{...base,importe:91,idempotencyKey:'insufficient-expense'})).status,400);
   for(const amount of[-1,0,0.001,'Infinity'])assert.equal((await req('/reportes/gastos',{...base,importe:amount,idempotencyKey:'invalid-expense-'+String(amount)})).status,400);
   for(const role of['BARBERO','CAJERO'])assert.equal((await req('/reportes/gastos',{...base,idempotencyKey:'forbidden-expense-'+role},users[role])).status,403);
   assert([403,404].includes((await req('/reportes/gastos',{...base,sucursalId:second.id,idempotencyKey:'manager-foreign-branch'},users.GERENTE)).status));assert([403,404].includes((await correction({...expense,id:expense.id},{...base,sucursalId:foreignBranch.id},'other-tenant-correction')).status));
   assert.deepEqual({expenses:await prisma.gastoOperativo.count(),cash:await prisma.registroCaja.count(),drawer:await drawer()},before);
   const foreignRead=await req('/reportes/gastos?sucursalId='+branch.id,undefined,foreignOwner);assert([403,404].includes(foreignRead.status));
  });
  await check('Two operators correcting same revision commit only one adjustment and cannot overwrite previous evidence',async()=>{
   const requests=[{...base,importe:35,metodoPago:'TARJETA'},{...base,importe:36,metodoPago:'TARJETA'}];const replies=await Promise.all(requests.map((next,n)=>correction(expense,next,'revision-race-'+n,n===0?users.DUENO:users.GERENTE)));assert.deepEqual(replies.map(r=>r.status).sort(),[200,409],JSON.stringify(replies));const current=(await req('/reportes/gastos?sucursalId='+branch.id)).body.find(r=>r.id===expense.id);assert.equal(current.version,expense.version+1);assert.equal(current.correcciones.length,3);assert.equal(await drawer(),90);assert.equal(current.original.importe,25);
  });
  console.log('PASS '+checks+' independent expense checks on '+(process.env.SYSTECH_TEST_PG_URL?'isolated PostgreSQL':'disposable SQLite'));
 }finally{await Promise.all(servers.map(c=>new Promise(resolve=>{if(c.exitCode!==null)return resolve();c.once('exit',resolve);c.kill('SIGTERM')})));await prisma.$disconnect();cleanTestFixture(fixture.directory)}
}
main().catch(e=>{console.error(e);process.exitCode=1});

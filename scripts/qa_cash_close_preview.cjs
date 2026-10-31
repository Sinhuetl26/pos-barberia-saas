'use strict';
const assert=require('node:assert/strict'),path=require('node:path');const{fork}=require('node:child_process');const{createTestFixture,cleanTestFixture}=require('./test_fixture');
async function main(){
 if(Boolean(process.env.SYSTECH_TEST_PG_URL)!==Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT))throw Error('PG requires guarded URL and separate client.');const fixture=createTestFixture();Object.assign(process.env,fixture.env);if(process.env.SYSTECH_TEST_PRISMA_CLIENT)require('./test_prisma_client');const{prisma}=require('@systech/database'),jwt=require('jsonwebtoken');const servers=[];let checks=0;
 const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
 const start=async()=>{const c=fork(path.join(__dirname,'test_server.js'),[],{env:fixture.env,execArgv:process.env.SYSTECH_TEST_PRISMA_CLIENT?['--require',path.join(__dirname,'test_prisma_client.js')]:[],stdio:['ignore','ignore','pipe','ipc']});servers.push(c);c.stderr.on('data',d=>process.stderr.write(d));return new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('API timeout')),20000);c.once('message',m=>{clearTimeout(t);resolve(m.base+'/api')})})};
 try{
  const bases=[await start(),await start()];let turn=0;
  const tenant=await prisma.tenant.create({data:{nombre:'Cash preview QA',slug:'qa-cash-preview',plan:'CADENA'}}),branch=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'QA branch'}}),second=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'QA other branch'}});
  const barber=await prisma.barbero.create({data:{sucursalId:branch.id,nombre:'QA professional'}}),service=await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'QA service',tipo:'SERVICIO',precioVenta:10}});
  const users={};for(const role of['DUENO','GERENTE','CAJERO','BARBERO'])users[role]=await prisma.usuario.create({data:{tenantId:tenant.id,sucursalId:branch.id,barberoId:role==='BARBERO'?barber.id:null,nombre:role,rol:role,email:role+'@cash-preview.invalid',passwordHash:'disabled'}});
  const foreign=await prisma.tenant.create({data:{nombre:'Foreign cash QA',slug:'qa-cash-preview-foreign'}}),foreignBranch=await prisma.sucursal.create({data:{tenantId:foreign.id,nombre:'Private branch'}}),foreignOwner=await prisma.usuario.create({data:{tenantId:foreign.id,sucursalId:foreignBranch.id,nombre:'Other owner',rol:'DUENO',email:'foreign@cash-preview.invalid',passwordHash:'disabled'}});
  const sign=u=>jwt.sign({sub:u.id,tid:u.tenantId,rol:u.rol,sv:u.sessionVersion},fixture.env.JWT_SECRET,{expiresIn:'1h'});
  const req=async(endpoint,body,user=users.DUENO,method=body===undefined?'GET':'POST')=>{const r=await fetch(bases[turn++%2]+endpoint,{method,headers:{'content-type':'application/json',authorization:'Bearer '+sign(user)},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()}};
  const open=async(key,b=branch)=>{const r=await req('/cortes-caja/abrir',{sucursalId:b.id,fondoInicial:100,idempotencyKey:key});assert.equal(r.status,200,JSON.stringify(r));return r.body};const cut=await open('preview-main');
  const payload={corteId:cut.id,conteoEfectivoReal:100,notasCierre:'QA declared comparison'};
  const preview=async(body=payload,user=users.DUENO)=>{const r=await req('/cortes-caja/previsualizar',body,user);assert.equal(r.status,200,JSON.stringify(r));return r.body};
  const close=(token,body=payload,user=users.DUENO)=>req('/cortes-caja/cerrar',{...body,previsualizacionToken:token},user);
  const move=(type,key,amount=10)=>req('/cortes-caja/movimiento',{sucursalId:branch.id,corteCajaId:cut.id,tipo:type,monto:amount,concepto:'QA movement '+type,idempotencyKey:key});
  const expired=token=>{const decoded=jwt.decode(token);return jwt.sign({...decoded,exp:Math.floor(Date.now()/1000)-1},fixture.env.JWT_SECRET,{algorithm:'HS256'})};
  await check('Blind open/list expose no expectation; preview requires declared finite exact-cent physical count and does not write ledger',async()=>{
   const list=await req('/cortes-caja?sucursalId='+branch.id);assert.equal(list.status,200);const row=list.body.find(c=>c.id===cut.id);for(const field of['efectivoEsperado','resumenJson','totalVentas','descuadre'])assert.equal(field in row,false);
   for(const value of[undefined,null,true,'',-1,0.001,'Infinity']){const body={...payload,...(value===undefined?{}:{conteoEfectivoReal:value})};if(value===undefined)delete body.conteoEfectivoReal;assert.equal((await req('/cortes-caja/previsualizar',body)).status,400,String(value));}
   const before=await prisma.registroCaja.count(),result=await preview();assert.equal(result.resumen.efectivoEsperado,100);assert.equal(result.conteoDeclarado,100);assert.equal(result.lectura,true);assert.equal(await prisma.registroCaja.count(),before);assert.equal((await prisma.corteCaja.findUniqueOrThrow({where:{id:cut.id}})).estado,'ABIERTO');
  });
  await check('Preview binds actor, cut, physical count, notes and expiry; invalid confirmation never closes',async()=>{
   const result=await preview();assert.equal((await close(result.previsualizacionToken,{...payload,conteoEfectivoReal:101})).status,409);assert.equal((await close(result.previsualizacionToken,{...payload,notasCierre:'QA changed notes'})).status,409);assert.equal((await close(result.previsualizacionToken,payload,users.GERENTE)).status,409);assert([403,404].includes((await close(result.previsualizacionToken,payload,foreignOwner)).status));assert.equal((await req('/cortes-caja/previsualizar',payload,users.BARBERO)).status,403);
   const expiredResult=await close(expired(result.previsualizacionToken));assert.equal(expiredResult.status,409);assert.equal(expiredResult.body.code,'CASH_PREVIEW_EXPIRED');assert.equal((await close('not-a-token')).status,409);assert.equal((await prisma.corteCaja.findUniqueOrThrow({where:{id:cut.id}})).estado,'ABIERTO');
   const secondCut=await open('other-cut',second);const cross=await close(result.previsualizacionToken,{...payload,corteId:secondCut.id});assert.equal(cross.status,409);assert.equal((await prisma.corteCaja.findUniqueOrThrow({where:{id:secondCut.id}})).estado,'ABIERTO');
  });
  await check('Equal-net income and withdrawal invalidate old preview because ledger event identities changed',async()=>{
   const result=await preview();assert.equal((await move('INGRESO','preview-income')).status,200);assert.equal((await move('RETIRO','preview-withdrawal')).status,200);const now=await preview();assert.equal(now.resumen.efectivoEsperado,100);const stale=await close(result.previsualizacionToken);assert.equal(stale.status,409,JSON.stringify(stale));assert.equal(stale.body.code,'CASH_PREVIEW_CHANGED');assert.equal((await prisma.corteCaja.findUniqueOrThrow({where:{id:cut.id}})).estado,'ABIERTO');
  });
  await check('Card sale or custody/history change invalidates comparison despite unchanged drawer cash; new comparison can close',async()=>{
   const result=await preview();const sale=await req('/ventas',{sucursalId:branch.id,barberoId:barber.id,metodoPago:'TARJETA',items:[{productoId:service.id,cantidad:1}],idempotencyKey:'preview-card-sale'});assert.equal(sale.status,200,JSON.stringify(sale));const failed=await close(result.previsualizacionToken);assert.equal(failed.status,409);assert.equal(failed.body.code,'CASH_PREVIEW_CHANGED');const commissions=await prisma.comision.findMany({where:{ventaId:sale.body.venta.id}});assert(commissions.length);
   const current=await preview();assert.equal(current.resumen.efectivoEsperado,100);assert.equal(current.resumen.totalTarjeta,10);const replies=await Promise.all(Array.from({length:6},()=>close(current.previsualizacionToken)));assert(replies.every(r=>r.status===200),JSON.stringify(replies));assert.equal(replies.filter(r=>!r.body.replayed).length,1);assert.equal(await prisma.auditoriaLog.count({where:{tenantId:tenant.id,accion:'CORTE_CAJA'}}),1);assert.deepEqual(await prisma.comision.findMany({where:{ventaId:sale.body.venta.id}}),commissions);
   const recovered=await close(expired(current.previsualizacionToken));assert.equal(recovered.status,200);assert.equal(recovered.body.replayed,true);assert.equal((await close(current.previsualizacionToken,{...payload,conteoEfectivoReal:99})).status,409);
  });
  await check('Race between new movement and close is wholly serialized: conflict leaves open, successful close rejects later movement',async()=>{
   const cut2=await prisma.corteCaja.findFirstOrThrow({where:{tenantId:tenant.id,sucursalId:second.id,estado:'ABIERTO'}}),body={corteId:cut2.id,conteoEfectivoReal:100,notasCierre:'QA close race'},p=await preview(body);
   const replies=await Promise.all([close(p.previsualizacionToken,body),req('/cortes-caja/movimiento',{sucursalId:second.id,corteCajaId:cut2.id,tipo:'INGRESO',monto:1,concepto:'QA incoming race',idempotencyKey:'race-income'})]);const final=await prisma.corteCaja.findUniqueOrThrow({where:{id:cut2.id}});
   if(replies[1].status===200){assert.equal(replies[0].status,409,JSON.stringify(replies));assert.equal(final.estado,'ABIERTO')}else{assert.equal(replies[0].status,200,JSON.stringify(replies));assert.equal(final.estado,'CERRADO');assert([400,409].includes(replies[1].status),JSON.stringify(replies))}
  });
  await check('Valid legacy client without preview token retains close/replay compatibility',async()=>{
   const legacyBranch=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Legacy close fixture'}}),legacy=await open('legacy-cut',legacyBranch);const body={corteId:legacy.id,conteoEfectivoReal:100,notasCierre:'QA valid legacy'};const r=await req('/cortes-caja/cerrar',body);assert.equal(r.status,200,JSON.stringify(r));assert.equal((await req('/cortes-caja/cerrar',body)).body.replayed,true);
  });
  await check('Legacy close rejects absent physical declaration instead of coercing null or boolean to zero',async()=>{
   const b=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Invalid close fixture'}}),invalid=await open('invalid-close-cut',b);
   for(const value of[undefined,null,true,false,'','   ',[],{},-1,0.001,'Infinity']){const r=await req('/cortes-caja/cerrar',{corteId:invalid.id,...(value===undefined?{}:{conteoEfectivoReal:value})});assert.equal(r.status,400,JSON.stringify(r));assert.equal((await prisma.corteCaja.findUniqueOrThrow({where:{id:invalid.id}})).estado,'ABIERTO');}
  });
  console.log('PASS '+checks+' independent cash-preview checks on '+(process.env.SYSTECH_TEST_PG_URL?'isolated PostgreSQL':'disposable SQLite'));
 }finally{await Promise.all(servers.map(c=>new Promise(resolve=>{if(c.exitCode!==null)return resolve();c.once('exit',resolve);c.kill('SIGTERM')})));await prisma.$disconnect();cleanTestFixture(fixture.directory)}
}
main().catch(e=>{console.error(e);process.exitCode=1});

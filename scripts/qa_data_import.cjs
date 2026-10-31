'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{fork}=require('node:child_process');
const {createTestFixture,cleanTestFixture}=require('./test_fixture');
async function main(){
 if(Boolean(process.env.SYSTECH_TEST_PG_URL)!==Boolean(process.env.SYSTECH_TEST_PRISMA_CLIENT))throw Error('PostgreSQL requires guarded test URL/client.');
 const fixture=createTestFixture();Object.assign(process.env,fixture.env);if(process.env.SYSTECH_TEST_PRISMA_CLIENT)require('./test_prisma_client');
 const {prisma}=require('@systech/database'),jwt=require('jsonwebtoken');let child,checks=0;
 const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
 try{
  child=fork(path.join(__dirname,'test_server.js'),[],{env:fixture.env,execArgv:process.env.SYSTECH_TEST_PRISMA_CLIENT?['--require',path.join(__dirname,'test_prisma_client.js')]:[],stdio:['ignore','ignore','pipe','ipc']});child.stderr.on('data',d=>process.stderr.write(d));
  const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('API timeout')),20000);child.once('message',m=>{clearTimeout(timer);resolve(m.base+'/api/operacion/importacion')})});
  const tenant=await prisma.tenant.create({data:{nombre:'Import fixture',slug:'qa-import',plan:'CADENA'}}),branch=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Import fixture branch'}}),other=await prisma.sucursal.create({data:{tenantId:tenant.id,nombre:'Hidden branch'}});
  const users={};for(const rol of ['DUENO','GERENTE','BARBERO','CAJERO'])users[rol]=await prisma.usuario.create({data:{tenantId:tenant.id,sucursalId:branch.id,rol,nombre:rol,email:rol+'@import.invalid',passwordHash:'disabled'}});
  const sign=u=>jwt.sign({sub:u.id,tid:u.tenantId,rol:u.rol,sv:u.sessionVersion},fixture.env.JWT_SECRET,{expiresIn:'1h'});
  const req=async(endpoint,body,user=users.DUENO)=>{const r=await fetch(base+endpoint,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',authorization:'Bearer '+sign(user)},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await r.text();return {status:r.status,body:r.headers.get('content-type').includes('json')?JSON.parse(text):text}};
  const header='nombre,tipo,sku,categoria,precioVenta,costo,stockActual,stockMinimo,naturaleza,unidad,duracionMinutos,tasaImpuesto';
  const product=(sku,name='Pomada QA',stock=5)=>`${name},PRODUCTO,${sku},General,100,20,${stock},1,REVENTA,PIEZA,30,0`;
  const input=csv=>({tipo:'catalogo',sucursalId:branch.id,csv});
  const preview=async csv=>req('/previsualizar',input(csv));
  let valid;
  await check('Preview parses BOM, CRLF, escaped quotes and multiline quoted names without writing records',async()=>{
   valid='\uFEFF'+header+'\r\n'+product('QA-ONE','"Pomada, ""especial""\nQA"')+'\r\n';const r=await preview(valid);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.body.canConfirm,true);assert.equal(r.body.rows[0].data.nombre,'Pomada, "especial"\nQA');assert.equal(await prisma.producto.count(),0);assert.equal(await prisma.kardexMovimiento.count(),0);
  });
  await check('Repeated confirm recovers one atomic batch, initial stock ledger and audit exactly once',async()=>{
   const p=(await preview(valid)).body,body={...input(valid),previewHash:p.previewHash,idempotencyKey:'qa-import-once'};
   const r=await req('/confirmar',body);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.body.imported,1);const again=await req('/confirmar',body);assert.equal(again.status,200);assert.equal(again.body.replayed,true);assert.equal(await prisma.producto.count(),1);assert.equal(await prisma.kardexMovimiento.count(),1);assert.equal(await prisma.auditoriaLog.count({where:{accion:'DATOS_IMPORTADOS'}}),1);
   const changed=await req('/confirmar',{...body,csv:header+'\n'+product('OTHER')});assert.equal(changed.status,409);assert.equal(changed.body.code,'IDEMPOTENCY_CONFLICT');
  });
  await check('Invalid mixed batch, duplicate identifiers and fractional pieces never partially import',async()=>{
   for(const csv of [header+'\n'+product('VALID')+'\n'+product('BAD','Bad',0.5),header+'\n'+product('DUPE')+'\n'+product('dupe')]){
    const p=(await preview(csv)).body;assert.equal(p.canConfirm,false);assert(p.errors.length>0);assert.equal((await req('/confirmar',{...input(csv),previewHash:p.previewHash,idempotencyKey:'invalid-'+crypto.randomUUID()})).status,400);
   }assert.equal(await prisma.producto.count(),1);
  });
  await check('Tenant-wide duplicate check covers hidden branches without exposing names',async()=>{
   await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:other.id,nombre:'PRIVATE hidden product',tipo:'PRODUCTO',sku:'SECRET-SKU',precioVenta:22}});
   const r=await preview(header+'\n'+product('secret-sku'));assert.equal(r.body.canConfirm,false);assert(!JSON.stringify(r.body).includes('PRIVATE hidden product'));
  });
  await check('Preview becomes stale when catalog changes; confirmation cannot overwrite another operator',async()=>{
   const csv=header+'\n'+product('NEW-QA'),p=(await preview(csv)).body;
   await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'Concurrent product',tipo:'PRODUCTO',sku:'RACE',precioVenta:1}});
   const r=await req('/confirmar',{...input(csv),previewHash:p.previewHash,idempotencyKey:'stale-import'});assert.equal(r.status,409);assert.equal(r.body.code,'IMPORT_PREVIEW_CHANGED');assert.equal(await prisma.producto.count({where:{sku:'NEW-QA'}}),0);
  });
  await check('Client import normalizes phones, preserves zero history and forbids existing phone duplicates',async()=>{
   const body={tipo:'clientes',sucursalId:branch.id,csv:'nombre,telefono,email\nCliente ficticio,55 1234 5678,fixture@example.invalid'},p=(await req('/previsualizar',body)).body;
   assert.equal(p.canConfirm,true);const r=await req('/confirmar',{...body,previewHash:p.previewHash,idempotencyKey:'clients-once'});assert.equal(r.status,200,JSON.stringify(r));const client=await prisma.clienteFinal.findFirstOrThrow();assert.equal(client.telefono,'525512345678');assert.equal(await prisma.cita.count(),0);assert.equal(await prisma.venta.count(),0);assert.equal((await req('/previsualizar',body)).body.canConfirm,false);
  });
  await check('Roles and assigned branches protect preview, confirm and export',async()=>{
   for(const role of ['BARBERO','CAJERO'])for(const endpoint of ['/previsualizar','/confirmar'])assert.equal((await req(endpoint,input(valid),users[role])).status,403);
   for(const role of ['BARBERO','CAJERO'])assert.equal((await req('/exportar?tipo=catalogo&sucursalId='+branch.id,undefined,users[role])).status,403);
   assert([403,404].includes((await req('/previsualizar',{...input(valid),sucursalId:other.id},users.GERENTE)).status));
  });
  await check('Export prevents spreadsheet formulas, excludes unrelated branch rows; template contains headers only',async()=>{
   await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'=HYPERLINK("bad")',tipo:'PRODUCTO',sku:'FORMULA',precioVenta:1}});
   await prisma.producto.create({data:{tenantId:tenant.id,sucursalId:branch.id,nombre:'  =HYPERLINK("bad")',tipo:'PRODUCTO',sku:'FORMULA-SPACE',precioVenta:1}});
   const out=await req('/exportar?tipo=catalogo&sucursalId='+branch.id);assert.equal(out.status,200);assert(out.body.includes('"\'=HYPERLINK'));assert(out.body.includes('"\'  =HYPERLINK'));assert(!out.body.includes('PRIVATE hidden product'));const template=await req('/plantilla?tipo=clientes');assert.equal(template.body.trim(),'"nombre","telefono","email"');
  });
  await check('CSV limits and malformed quoting are rejected before a write',async()=>{
   for(const csv of ['bad,headers\nA,B',header+'\n"unclosed',header+'\n'+Array.from({length:201},(_,i)=>product('LIMIT'+i)).join('\n'),'x'.repeat(150*1024+1)])assert([400,413].includes((await preview(csv)).status));
  });
  await check('Valid UTF-8 CSV above ordinary API 100 KB limit uses bounded import envelope',async()=>{
   const csv=header+'\n'+Array.from({length:200},(_,i)=>product('LARGE-'+i,'ñ'.repeat(250))).join('\n');
   assert(Buffer.byteLength(csv,'utf8')>100*1024);assert(Buffer.byteLength(csv,'utf8')<150*1024);
   const r=await preview(csv);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.body.canConfirm,true);assert.equal(r.body.summary.total,200);assert.equal(await prisma.producto.count({where:{sku:{startsWith:'LARGE-'}}}),0);
  });
  console.log('PASS '+checks+' import checks on '+(process.env.SYSTECH_TEST_PG_URL?'isolated PostgreSQL':'disposable SQLite'));
 }finally{if(child&&child.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM')});await prisma.$disconnect();cleanTestFixture(fixture.directory)}
}
main().catch(error=>{console.error(error);process.exitCode=1});

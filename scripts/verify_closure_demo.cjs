'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'.tools/closure-demo.json'),'utf8'));
if(path.dirname(path.resolve(m.directory))!==root || !path.basename(m.directory).startsWith('.test-db-'))throw new Error('Isolated fixture required');
Object.assign(process.env,{NODE_ENV:'test',SYSTECH_ISOLATED_TESTS:'true',SYSTECH_TEST_PRISMA_CLIENT:path.join(root,'.tools/prisma-cut-reference/client'),DATABASE_URL:m.database});require('./test_prisma_client');
const {prisma}=require('@systech/database'),checks=[];
async function request(route,token,body){const res=await fetch(`http://127.0.0.1:${m.apiPort}/api`+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,body:await res.json()};}
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
async function main(){
 const tokens={};
 for(const role of ['owner','barber','other'])await check('Inicio real '+role,async()=>{const r=await request('/auth/login',null,{email:m.credentials[role],password:m.credentials.password});assert.equal(r.status,200);assert(r.body.token);tokens[role]=r.body.token;});
 await check('Perfil público: tres profesionales y servicios, sin claves',async()=>{const r=await request('/public/barberia/cierre-demo');assert.equal(r.status,200);assert.equal(r.body.tenant.sucursales[0].barberos.length,3);assert.equal(r.body.servicios.length,3);assert(!JSON.stringify(r.body).includes('passwordHash'));});
 await check('Catálogo del dueño: seis artículos',async()=>{const r=await request('/productos',tokens.owner);assert.equal(r.status,200);assert.equal(r.body.length,6);});
 await check('Otro negocio no hereda catálogo',async()=>{const r=await request('/productos',tokens.other);assert.equal(r.status,200);assert.deepEqual(r.body,[]);});
 await check('Barbero no ve reportes financieros del dueño',async()=>{const r=await request('/reportes/dashboard',tokens.barber);assert.equal(r.status,403);});
 await check('Saldo inicial conciliado con Kardex',async()=>{for(const id of m.productIds){const p=await prisma.producto.findUniqueOrThrow({where:{id}});const moves=await prisma.kardexMovimiento.findMany({where:{productoId:id}});assert.equal(moves.reduce((n,x)=>n+x.cantidad,0),p.stockActual);}});
 await check('Reserva pública reintentada y persistida una sola vez',async()=>{
  const appointment=await prisma.cita.findUniqueOrThrow({where:{id:m.appointmentIds[0]}});
  const date=appointment.fechaHora.toISOString().slice(0,10);
  const file=path.join(m.directory,'verification-booking.json');
  const payload=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{tenantId:m.tenantId,sucursalId:m.branchId,barberoId:m.barberIds[0],servicioId:m.serviceIds[0],fechaHora:date+'T09:00:00',clienteNombre:'Reserva ficticia de verificación',clienteTelefono:'5550000101',idempotencyKey:crypto.randomUUID()};
  fs.writeFileSync(file,JSON.stringify(payload));
  const first=await request('/public/reservar',null,payload),again=await request('/public/reservar',null,payload);assert.equal(first.status,200,JSON.stringify(first.body));assert.equal(again.status,200);assert.equal(first.body.cita.id,again.body.cita.id);
  assert.equal(await prisma.cita.count({where:{tenantId:m.tenantId,claveReserva:'public:'+payload.idempotencyKey}}),1);
  const agenda=await request('/citas?fecha='+date+'&sucursalId='+m.branchId,tokens.owner);assert.equal(agenda.status,200);assert(agenda.body.some(x=>x.id===first.body.cita.id));
 });
 const dir=path.join(root,'docs/evidencias/cierre-demo-20261011');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'CD02_RESULTADOS.json'),JSON.stringify({date:new Date().toISOString(),checks,pass:true,count:checks.length,database:m.database,scope:'Ficticio aislado; reserva API persistida, sin mensajes externos ni cargos. Navegador pendiente.'},null,2)+'\n');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());

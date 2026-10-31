'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'.tools/booking-commercial-demo.json'),'utf8'));
const expected='file:'+path.join(root,'.test-db-TrhWfE/test.db').replace(/\\/g,'/');
if(manifest.database!==expected)throw new Error('Isolated demo identity required');
Object.assign(process.env,{NODE_ENV:'test',SYSTECH_ISOLATED_TESTS:'true',DATABASE_URL:expected,SYSTECH_TEST_PRISMA_CLIENT:path.join(root,'.tools/prisma-cut-reference/client')});
require('./test_prisma_client');
const {prisma}=require('@systech/database'),jwt=require('jsonwebtoken');
const base='http://127.0.0.1:3101/api';
async function main(){
 const owner=await prisma.usuario.findUniqueOrThrow({where:{id:manifest.ownerId}});
 const token=jwt.sign({sub:owner.id,tid:owner.tenantId,rol:owner.rol,sv:owner.sessionVersion},'isolated-test-secret-which-is-at-least-thirty-two-characters',{expiresIn:'5m'});
 const request=async(route,method='GET',body,authenticated=true)=>{const res=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.equal(res.status,200,route);return res.json();};
 const profile=await request('/public/barberia/estudio-norte-demo','GET',null,false);
 assert.equal(profile.servicios.length,4);assert.equal(profile.tenant.sucursales[0].barberos.length,3);
 const appointments=await prisma.cita.findMany({where:{tenantId:manifest.tenantId},include:{referencia:true}});
 assert.equal(appointments.length,1,'Double-click must create exactly one appointment');
 const appointment=appointments[0];assert.equal(appointment.barberoId,manifest.barberIds[0]);assert.equal(appointment.sucursalId,manifest.branchId);assert.equal(appointment.tipoCorte,'Fade bajo · demo');assert(appointment.referencia?.imagen.startsWith('data:image/jpeg;base64,'));assert.equal(Number(appointment.precioEstimado),200);assert.equal(appointment.duracionMinutos,30);
 const agenda=await request('/citas?fecha=2026-10-12&sucursalId='+manifest.branchId);
 assert(agenda.some(c=>c.id===appointment.id && c.tipoCorte==='Fade bajo · demo' && c.tieneFotoReferencia));assert(!JSON.stringify(agenda).includes('data:image/'));
 const reference=await request('/citas/'+appointment.id+'/referencia');assert(reference.fotoReferencia);assert.equal(reference.tipoCorte,appointment.tipoCorte);
 const publicBooking=await request('/public/cita/'+appointment.codigoReserva+'?slug=estudio-norte-demo','GET',null,false);
 assert(!JSON.stringify(publicBooking).includes('data:image/'));assert(!publicBooking.tokenCancelacion);assert(!publicBooking.tipoCorte);assert(!publicBooking.clienteTelefono);
 const prior=profile.tenant.personalizacionWeb;
 try {
  await request('/auth/tenant/settings','PUT',{personalizacionWeb:{tema:'tinta',portada:'compacta',mostrarEquipo:false}});
  const after=await request('/public/barberia/estudio-norte-demo','GET',null,false);assert.equal(after.tenant.personalizacionWeb.tema,'tinta');assert.equal(after.tenant.personalizacionWeb.portada,'compacta');assert.equal(after.tenant.personalizacionWeb.mostrarEquipo,false);
  assert.equal(JSON.parse((await prisma.tenant.findUniqueOrThrow({where:{id:manifest.tenantId}})).personalizacionWeb).tema,'tinta');
 } finally {await request('/auth/tenant/settings','PUT',{personalizacionWeb:prior});}
 const counts={appointments:appointments.length,publicProfile:true,correctAgenda:true,doubleClickSingleAppointment:true,referencePrivate:true,actualAssignment:true,catalogPriceAndDuration:true,appearancePersistedAndRestored:true};
 const output=path.join(root,'docs/evidencias/reservas-demo-20261011');fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,'recorrido.json'),JSON.stringify({verifiedAt:new Date().toISOString(),...counts,bookingFolio:appointment.codigoReserva,scope:'Fictitious isolated demo; no external messages or charges'},null,2)+'\n');console.log(JSON.stringify(counts));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());

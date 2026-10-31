import { createHash, createHmac } from 'node:crypto';
import { prisma } from '@systech/database';
import { SaleError } from './financial-error';
import { financialTransaction } from './cash-ledger.service';
import { calculateMultiServiceTotals, generateBookingFolio, generateSecureCancellationKey, hasTimeConflict } from './booking.service';
import { appointmentTime, bookingDateBounds, civilParts, scheduleFits, BOOKING_BUFFER, validDay } from './booking-time.service';
import { validateCutReference, bookingReferenceSummary } from './cut-reference.service';
import { consumeServiceSupplies } from './service-consumption.service';
import { datedBarbers } from './schedule-exceptions.service';
import { resolveProfessionalPrices } from './professional-pricing.service';
import { WhatsAppService } from './whatsapp.service';

const eligibleStates=['PENDIENTE','CONFIRMADA'];
const includeBooking={barbero:{select:{nombre:true}},sucursal:true,tenant:{select:{nombre:true,slug:true}},referencia:{select:{citaId:true}}};
function fail(code:string,message:string,status=400):never { throw new SaleError(status,code,message); }
export async function lockBranch(tx:any,tenantId:string,id:string,publicMode=false){
 const branch=await tx.sucursal.findFirst({where:{id,tenantId,eliminadoEn:null,...(publicMode?{tenant:{estado:{in:['ACTIVO','EN_RIESGO']}}}:{})}});
 if(!branch)fail('INVALID_BRANCH','Sucursal no disponible.',404);
 await tx.$executeRaw`UPDATE "Sucursal" SET "id"="id" WHERE "id"=${id} AND "tenantId"=${tenantId}`;
 return await tx.sucursal.findFirst({where:{id,tenantId,eliminadoEn:null}});
}
async function resources(tx:any,branch:any,barberIds:string[],end:Date,exclude?:string){
 return Promise.all([
  tx.cita.findMany({where:{tenantId:branch.tenantId,sucursalId:branch.id,barberoId:{in:barberIds},estado:{notIn:['CANCELADA','NO_SHOW']},fechaHora:{lt:end},...(exclude?{id:{not:exclude}}:{})}}),
  tx.bloqueoHorario.findMany({where:{tenantId:branch.tenantId,sucursalId:branch.id,OR:[{barberoId:{in:barberIds}},{barberoId:null}],fechaInicio:{lt:end}}})
 ]);
}
export async function chooseBarber(tx:any,branch:any,input:any,start:Date,duration:number,publicMode:boolean,exclude?:string){
 const specific=input.barberoId&&input.barberoId!=='cualquiera';
 let barbers:any[]=await tx.barbero.findMany({where:{sucursalId:branch.id,activo:true,eliminadoEn:null,...(publicMode?{visibleEnWeb:true}:{}),...(specific?{id:input.barberoId}:{})},orderBy:{id:'asc'}});
 barbers=await datedBarbers(tx,branch,barbers,civilParts(start,branch.zonaHoraria).day);
 if(!barbers.length)fail('INVALID_BARBER','No hay profesionales disponibles para esta sucursal.',404);
 const end=new Date(start.getTime()+(duration+BOOKING_BUFFER)*60000);
 const [appointments,blocks]=await resources(tx,branch,barbers.map((b:any)=>b.id),end,exclude);
 const barber=barbers.find((b:any)=>scheduleFits(branch,b,start,duration)&&!hasTimeConflict(start,end,appointments.filter((c:any)=>c.barberoId===b.id),blocks.filter((x:any)=>x.barberoId===null||x.barberoId===b.id)));
 if(!barber)fail('SLOT_OCCUPIED','Ese horario no está disponible. Revisa horarios, descansos y ocupación o elige otro profesional.',409);
 return barber;
}
export async function bookingAvailability(input:any){
 const branch=await prisma.sucursal.findFirst({where:{id:input.sucursalId,eliminadoEn:null,tenant:{estado:{in:['ACTIVO','EN_RIESGO']}}}});
 if(!branch)fail('INVALID_BRANCH','Sucursal no disponible.',404);
 validDay(input.fecha); let duration=Number(input.duracion||30);
 let servicesSummary:any[]|undefined,selectionProducts:any[]=[];
 if(input.servicioIds!==undefined||input.servicioId!==undefined){
  const raw=input.servicioIds??input.servicioId;
  const ids=typeof raw==='string'?raw.split(','):raw;
  if(!Array.isArray(ids)||!ids.length||ids.length>10||ids.some((id:any)=>typeof id!=='string'||!id.trim())||new Set(ids).size!==ids.length)fail('INVALID_SERVICES','Selecciona entre uno y diez servicios distintos.');
  const services=await prisma.producto.findMany({where:{tenantId:branch.tenantId,tipo:'SERVICIO',activo:true,eliminadoEn:null,OR:[{sucursalId:branch.id},{sucursalId:null}],id:{in:ids}},orderBy:{id:'asc'}});
  if(services.length!==ids.length)fail('INVALID_SERVICES','Servicio no disponible en esta sucursal.',404);
  selectionProducts=services;
  const totals=calculateMultiServiceTotals(services.map(s=>({...s,precioVenta:Number(s.precioVenta)})));
  totals.totalPrecio=totals.serviciosResumen.reduce((sum,s)=>sum+Math.round(s.precio*100),0)/100;
  duration=totals.totalMinutos; servicesSummary=totals.serviciosResumen;
 }
 if(!Number.isInteger(duration)||duration<(servicesSummary?5:15)||duration>480)fail('INVALID_DURATION','La duración debe estar dentro del horario permitido y no superar ocho horas.');
 const bounds=bookingDateBounds(input.fecha,branch.zonaHoraria);
 if(bounds.gte.getTime()>Date.now()+90*86400000)fail('BOOKING_HORIZON','Consulta fechas dentro de los próximos 90 días.');
 const specific=input.barberoId&&input.barberoId!=='cualquiera';
 let barbers:any[]=await prisma.barbero.findMany({where:{sucursalId:branch.id,activo:true,eliminadoEn:null,visibleEnWeb:true,...(specific?{id:String(input.barberoId)}:{})},orderBy:{id:'asc'}});
 barbers=await datedBarbers(prisma,branch,barbers,input.fecha);
 if(specific&&!barbers.length)fail('INVALID_BARBER','Profesional no disponible.',404);
 const [appointments,blocks]=await resources(prisma,branch,barbers.map(b=>b.id),bounds.lt);
 const slots=[]; let hasWorkingHours=false;
 // Civil times are evaluated in the branch's zone, independent of server/browser TZ.
 for(let m=0;m<1440;m+=30){
  const hora=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  let start:Date;try{start=appointmentTime(input.fecha+'T'+hora+':00',branch.zonaHoraria);}catch{continue;}
  if(barbers.some(b=>scheduleFits(branch,b,start,15)))hasWorkingHours=true;
  const working=barbers.filter(b=>scheduleFits(branch,b,start,duration));if(!working.length)continue;
  const end=new Date(start.getTime()+(duration+BOOKING_BUFFER)*60000);
  const available=start.getTime()>=Date.now()+30*60000&&working.some(b=>!hasTimeConflict(start,end,appointments.filter((c:any)=>c.barberoId===b.id),blocks.filter((x:any)=>x.barberoId===null||x.barberoId===b.id)));
  const offered=available?working.find(b=>!hasTimeConflict(start,end,appointments.filter((c:any)=>c.barberoId===b.id),blocks.filter((x:any)=>x.barberoId===null||x.barberoId===b.id))):null;
  const priced=offered&&selectionProducts.length?await resolveProfessionalPrices(prisma,branch.tenantId,branch.id,offered.id,selectionProducts,start):null;
  slots.push({hora,fechaHora:start.toISOString(),disponible:available,...(priced?{barberoId:offered!.id,barberoNombre:offered!.nombre,precioEstimado:priced.reduce((sum,p)=>sum+Math.round(Number(p.precioVenta)*100),0)/100,serviciosResumen:priced.map(p=>({id:p.id,nombre:p.nombre,duracion:p.duracionMinutos,precio:Number(p.precioVenta),tasaImpuesto:Number(p.tasaImpuesto),resolucionPrecio:p.resolucionPrecio}))}:{}),motivo:available?undefined:start.getTime()<Date.now()+30*60000?'HORARIO_PASADO':'OCUPADO'});
 }
 const reason=slots.some(s=>s.disponible)?null:!hasWorkingHours?'NO_SCHEDULE':!slots.length?'SERVICE_DOES_NOT_FIT':slots.every(s=>s.motivo==='HORARIO_PASADO')?'DAY_ENDED':'FULL';
 return {fecha:input.fecha,sucursal:branch.nombre,zonaHoraria:branch.zonaHoraria,sucursalId:branch.id,duracionSolicitada:duration,...(servicesSummary?{serviciosResumen:servicesSummary,totalPrecio:servicesSummary.reduce((sum,s)=>sum+Math.round(s.precio*100),0)/100}:{}),reason,slots};
}
async function consumeLimit(tx:any,tenantId:string,subject:string,limit:number,windowMs:number){
 const bucket=Math.floor(Date.now()/windowMs);const id=createHmac('sha256',process.env.JWT_SECRET||'isolated-booking').update(`${tenantId}:${subject}:${bucket}:${windowMs}`).digest('hex');
 const row=await tx.reservaLimite.upsert({where:{id},create:{id,tenantId,contador:1,expiraEn:new Date((bucket+1)*windowMs)},update:{contador:{increment:1}}});
 if(row.contador>limit)fail('BOOKING_RATE_LIMIT','Demasiadas reservas. Intenta más tarde o contacta a la barbería.',429);
}
function identity(input:any,walkIn:boolean){
 const name=typeof input.clienteNombre==='string'?input.clienteNombre.trim():'';
 const phone=typeof input.clienteTelefono==='string'?input.clienteTelefono.replace(/[^0-9]/g,''):'';
 if(name.length<2||name.length>100||(!walkIn&&!/^\d{10,15}$/.test(phone))||(phone&&!/^\d{10,15}$/.test(phone)))fail('INVALID_CUSTOMER','Indica nombre y teléfono válidos.');
 const email=input.clienteEmail||null;
 if(email&&(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email)))fail('INVALID_EMAIL','Correo inválido.');
 if(input.notas&&(typeof input.notas!=='string'||input.notas.length>1000))fail('INVALID_NOTES','Las notas admiten hasta 1,000 caracteres.');
 return {name,phone,email};
}
export function publicBookingResult(cita:any){
 const date=new Date(cita.fechaHora).toLocaleString('es-MX',{timeZone:cita.sucursal.zonaHoraria,weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 const msg=`Tu cita en ${cita.tenant.nombre} (${cita.sucursal.nombre}) está agendada para ${date} con ${cita.barbero.nombre}. Servicio: ${cita.nombreServicio}. Folio: ${cita.codigoReserva}.`;
 return {success:true,cita:{id:cita.id,codigoReserva:cita.codigoReserva,tokenCancelacion:cita.tokenCancelacion,fechaHora:cita.fechaHora,zonaHoraria:cita.sucursal.zonaHoraria,duracionMinutos:cita.duracionMinutos,nombreServicio:cita.nombreServicio,precioEstimado:cita.precioEstimado,barbero:cita.barbero.nombre,sucursal:cita.sucursal.nombre,tipoCorte:cita.tipoCorte??null,tieneFotoReferencia:Boolean(cita.referencia||cita.tieneFotoReferencia)},codigoReserva:cita.codigoReserva,tokenCancelacion:cita.tokenCancelacion,enlaceGestion:`/b/${cita.tenant.slug||cita.tenantId}/cita/${cita.tokenCancelacion}`,whatsappMessage:msg,notificacion:{canal:'INTERNO',estado:'REGISTRADO'}};
}
export async function createBooking(input:any,publicMode=false,access?:any,ip='unknown',walkIn=false,transaction?:any){
 const reference=validateCutReference(input);
 input={...input,...(input.tipoCorte!==undefined?{tipoCorte:reference.tipoCorte}:{}),...(input.fotoReferencia!==undefined?{fotoReferencia:reference.fotoReferencia}:{})};
 const tenantId=publicMode?input.tenantId:access.tenantId;
 const who=identity(input,walkIn); const actor=publicMode?'public':access.userId;
 if(access?.rol==='BARBERO'){if(input.barberoId&&input.barberoId!==access.barberoId)fail('FORBIDDEN','Solo puedes agendar tu propio perfil.',403);input={...input,barberoId:access.barberoId||'__unlinked__'};}
 const rawKey=input.idempotencyKey;
 if(rawKey!==undefined&&(typeof rawKey!=='string'||!/^[a-zA-Z0-9._:-]{1,128}$/.test(rawKey)))fail('INVALID_KEY','Clave de reintento inválida.');
 const key=rawKey?`${actor}:${rawKey}`:null;
 const hash=createHash('sha256').update(JSON.stringify({...input,actor,publicMode,walkIn})).digest('hex');
 const execute=async(tx:any)=>{
  const branch=await lockBranch(tx,tenantId,input.sucursalId,publicMode);
  if(key){const old=await tx.cita.findFirst({where:{tenantId,claveReserva:key},include:includeBooking});if(old){if(old.solicitudHash!==hash)fail('IDEMPOTENCY_CONFLICT','La clave ya corresponde a otra cita.',409);return publicMode?publicBookingResult(old):bookingReferenceSummary(old);}}
  const start=walkIn?new Date(Math.ceil(Date.now()/60000)*60000):appointmentTime(input.fechaHora,branch.zonaHoraria);
  if(!walkIn&&(start.getTime()<Date.now()+(publicMode?30:0)*60000||start.getTime()>Date.now()+(publicMode?90:365)*86400000))fail('BOOKING_DATE_RANGE','El horario debe ser futuro y estar dentro del periodo permitido.');
  let ids=Array.isArray(input.servicioIds)&&input.servicioIds.length?input.servicioIds:input.servicioId?[input.servicioId]:[];
  if(ids.length>10||ids.some((id:any)=>typeof id!=='string'))fail('INVALID_SERVICES','Selecciona servicios válidos.');
  ids=[...new Set(ids)];
  let services:any[]=await tx.producto.findMany({where:{tenantId,tipo:'SERVICIO',activo:true,eliminadoEn:null,OR:[{sucursalId:branch.id},{sucursalId:null}],...(ids.length?{id:{in:ids}}:{})},orderBy:{id:'asc'}});
  if(!ids.length)services=services.slice(0,1);
  if(!services.length||(ids.length&&services.length!==ids.length))fail('INVALID_SERVICES','Servicio no disponible en esta sucursal.',404);
  let totals=calculateMultiServiceTotals(services.map(s=>({...s,precioVenta:Number(s.precioVenta)})));
  totals.totalPrecio=totals.serviciosResumen.reduce((sum,s)=>sum+Math.round(s.precio*100),0)/100;
  if(totals.totalMinutos>480)fail('INVALID_DURATION','La cita no puede superar ocho horas.');
  const barber=await chooseBarber(tx,branch,input,start,totals.totalMinutos,publicMode);
  services=await resolveProfessionalPrices(tx,tenantId,branch.id,barber.id,services,start);
  totals=calculateMultiServiceTotals(services.map(s=>({...s,precioVenta:Number(s.precioVenta)})));totals.totalPrecio=totals.serviciosResumen.reduce((sum,s)=>sum+Math.round(s.precio*100),0)/100;
  const customPrice=services.some(s=>!s.resolucionPrecio.heredado);
  if(customPrice){if(typeof input.precioConfirmado!=='number'||Math.round(input.precioConfirmado*100)!==Math.round(totals.totalPrecio*100))fail('PRICE_CONFIRMATION_REQUIRED','La tarifa de este profesional debe revisarse antes de reservar. Vuelve a elegir horario y confirma el precio.',409);}
  const serviceSnapshot=totals.serviciosResumen.map(s=>({...s,tasaImpuesto:Number(services.find(p=>p.id===s.id)?.tasaImpuesto||0),resolucionPrecio:services.find(p=>p.id===s.id)?.resolucionPrecio}));
  if(publicMode){await tx.reservaLimite.deleteMany({where:{tenantId,expiraEn:{lt:new Date()}}});await consumeLimit(tx,tenantId,`ip:${ip}`,30,3600000);await consumeLimit(tx,tenantId,`phone:${who.phone}`,5,86400000);}
  // Public input never overwrites an existing CRM name or email.
  const canonicalPhone=who.phone?WhatsAppService.normalizarTelefono(who.phone):null;
  const phoneVariants=canonicalPhone&&canonicalPhone.length===12&&canonicalPhone.startsWith('52')?[canonicalPhone,canonicalPhone.slice(2),`521${canonicalPhone.slice(2)}`]:canonicalPhone?[canonicalPhone]:[];
  const matches=phoneVariants.length?await tx.clienteFinal.findMany({where:{tenantId,telefono:{in:phoneVariants}},select:{id:true},take:2}):[];
  if(matches.length>1)fail('CUSTOMER_PHONE_AMBIGUOUS','Hay más de un registro para ese teléfono. Pide a la barbería revisar la identidad del cliente antes de reservar.',409);
  let customer=matches[0]||null;
  if(!customer)customer=await tx.clienteFinal.create({data:{tenantId,nombre:who.name,telefono:canonicalPhone,email:who.email,sucursalOrigenId:branch.id}});
  const cita=await (tx as any).cita.create({data:{tenantId,sucursalId:branch.id,barberoId:barber.id,clienteId:customer.id,servicioId:services[0].id,nombreServicio:services.map(s=>s.nombre).join(' + '),serviciosJson:JSON.stringify(serviceSnapshot),fechaHora:start,duracionMinutos:totals.totalMinutos,bufferMinutos:BOOKING_BUFFER,precioEstimado:totals.totalPrecio,notas:input.notas||null,tipoCorte:reference.tipoCorte,codigoReserva:generateBookingFolio(),tokenCancelacion:generateSecureCancellationKey(),tokenExpiraEn:new Date(start.getTime()-2*3600000),claveReserva:key,solicitudHash:hash,estado:walkIn?'EN_CURSO':publicMode?'PENDIENTE':'CONFIRMADA'},include:includeBooking});
  if(reference.fotoReferencia)await (tx as any).citaReferencia.create({data:{citaId:cita.id,imagen:reference.fotoReferencia}});
  const summary=bookingReferenceSummary({...cita,tieneFotoReferencia:Boolean(reference.fotoReferencia)});
  await tx.notificacionLog.create({data:{tenantId,tipo:'CONFIRMACION_CITA',canal:'INTERNO',destinatario:tenantId,mensaje:JSON.stringify({citaId:cita.id,sucursalId:branch.id,codigoReserva:cita.codigoReserva}),estado:'REGISTRADO'}});
  return publicMode?publicBookingResult(summary):summary;
 };
 return transaction?execute(transaction):financialTransaction(execute);
}
/** Read-only recovery capability for an interrupted public booking. UUIDv4 keys are mandatory here. */
export async function findPublicBookingIntent(input:any) {
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(typeof input?.idempotencyKey!=='string'||!uuid.test(input.idempotencyKey))fail('INVALID_INTENT_KEY','La clave de recuperación no es válida.');
 if(typeof input?.tenantId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.tenantId))fail('INVALID_TENANT','La barbería no es válida.');
 const cita=await (prisma as any).cita.findFirst({where:{tenantId:input.tenantId,claveReserva:'public:'+input.idempotencyKey},include:includeBooking});
 return cita?{found:true,result:publicBookingResult(cita)}:{found:false};
}
export async function managePublicBooking(token:string,input:any,action:'CANCELAR'|'REPROGRAMAR'){
 if(!/^[a-f0-9]{64}$/.test(token))fail('INVALID_TOKEN','Enlace no disponible.',404);
 const original=await prisma.cita.findFirst({where:{tokenCancelacion:token}});if(!original)fail('INVALID_TOKEN','Enlace no disponible.',404);
 return financialTransaction(async tx=>{
  const branch=await lockBranch(tx,original.tenantId,original.sucursalId,true);
  const cita=await tx.cita.findFirst({where:{id:original.id,tokenCancelacion:token},include:{venta:true}});if(!cita)fail('INVALID_TOKEN','Enlace no disponible.',404);
  if(input.slug){const tenant=await tx.tenant.findFirst({where:{id:cita.tenantId,OR:[{slug:input.slug},{id:input.slug}]}});if(!tenant)fail('INVALID_TOKEN','Enlace no disponible.',404);}
  if(action==='CANCELAR'&&cita.estado==='CANCELADA')return {success:true,codigoReserva:cita.codigoReserva,estado:'CANCELADA',waitlistNotified:false};
  const expiration=cita.tokenExpiraEn||new Date(cita.fechaHora.getTime()-2*3600000);
  if(expiration.getTime()<=Date.now())fail('TOKEN_EXPIRED','El enlace venció; contacta a la barbería para cambios.',410);
  if(!eligibleStates.includes(cita.estado)||cita.venta)fail('INVALID_TRANSITION','Esta cita ya no admite cambios en línea.',409);
  const data:any={};
  if(action==='CANCELAR')data.estado='CANCELADA';
  else{
   const start=appointmentTime(input.fechaHora,branch.zonaHoraria);
   if(start.getTime()<Date.now()+2*3600000||start.getTime()>Date.now()+90*86400000)fail('BOOKING_DATE_RANGE','Reprograma entre dos horas y 90 días de anticipación.');
   const barber=await chooseBarber(tx,branch,{barberoId:cita.barberoId},start,cita.duracionMinutos,true,cita.id);
   data.fechaHora=start;data.barberoId=barber.id;data.tokenExpiraEn=new Date(start.getTime()-2*3600000);
  }
  if(action==='REPROGRAMAR'&&cita.fechaHora.getTime()===data.fechaHora.getTime())return {success:true,codigoReserva:cita.codigoReserva,estado:cita.estado,fechaHora:cita.fechaHora,zonaHoraria:branch.zonaHoraria,waitlistNotified:false};
  const updated=await tx.cita.update({where:{id:cita.id},data});
  await tx.auditoriaLog.create({data:{tenantId:cita.tenantId,usuarioEmail:'cliente-enlace',accion:'CITA_'+action,detalles:JSON.stringify({id:cita.id,anterior:cita.fechaHora,nueva:updated.fechaHora,motivo:typeof input.motivo==='string'?input.motivo.slice(0,500):null})}});
  return {success:true,codigoReserva:cita.codigoReserva,estado:updated.estado,fechaHora:updated.fechaHora,zonaHoraria:branch.zonaHoraria,waitlistNotified:false};
 });
}
export async function changeBookingStatus(access:any,id:string,state:string){
 const transitions:Record<string,string[]>={PENDIENTE:['CONFIRMADA','EN_CURSO','CANCELADA','NO_SHOW'],CONFIRMADA:['EN_CURSO','COMPLETADA','CANCELADA','NO_SHOW'],EN_CURSO:['COMPLETADA'],COMPLETADA:[],CANCELADA:[],NO_SHOW:[]};
 if(!Object.hasOwn(transitions,state))fail('INVALID_STATUS','Estado de cita inválido.');
 const original=await prisma.cita.findFirst({where:{id,tenantId:access.tenantId}});if(!original)fail('NOT_FOUND','Cita no disponible.',404);
 return financialTransaction(async tx=>{
  await lockBranch(tx,access.tenantId,original.sucursalId);
  const cita=await tx.cita.findFirst({where:{id,tenantId:access.tenantId},include:{venta:true}});if(!cita)fail('NOT_FOUND','Cita no disponible.',404);
  if(access.rol==='BARBERO'&&cita.barberoId!==access.barberoId)fail('FORBIDDEN','Solo puedes gestionar tus citas.',403);
  if(cita.estado===state)return cita;
  if(!transitions[cita.estado]?.includes(state)||cita.venta)fail('INVALID_TRANSITION','La cita no admite este cambio.',409);
  if(state==='NO_SHOW'&&cita.fechaHora.getTime()+cita.duracionMinutos*60000>Date.now())fail('APPOINTMENT_NOT_FINISHED','Marca ausencia después de terminar el horario reservado.');
  const updated=await tx.cita.update({where:{id},data:{estado:state}});
  if(state==='NO_SHOW')await tx.clienteFinal.update({where:{id:cita.clienteId},data:{noShows:{increment:1}}});
  if(state==='COMPLETADA'){
   await tx.filaPresencial.updateMany({where:{tenantId:access.tenantId,citaId:cita.id,estado:{not:'ATENDIDO'}},data:{estado:'ATENDIDO',version:{increment:1}}});
   let snapshots:any[];try{snapshots=cita.serviciosJson?JSON.parse(cita.serviciosJson):cita.servicioId?[{id:cita.servicioId}]:[];}catch{fail('BOOKING_SNAPSHOT_INVALID','La cita requiere revisar sus servicios.',409);}
   await consumeServiceSupplies(tx,access,{sucursalId:cita.sucursalId,citaId:cita.id,servicios:snapshots.map(s=>({productoId:s.id,cantidad:1}))});
   await tx.clienteFinal.update({where:{id:cita.clienteId},data:{totalVisitas:{increment:1},fechaUltimaVisita:new Date()}});
  }
  await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'CITA_'+state,detalles:JSON.stringify({id,anterior:cita.estado})}});
  return updated;
 });
}
export async function createScheduleBlock(access:any,input:any){
 return financialTransaction(async tx=>{
  const branch=await lockBranch(tx,access.tenantId,input.sucursalId);
  const start=appointmentTime(input.fechaInicio,branch.zonaHoraria),end=appointmentTime(input.fechaFin,branch.zonaHoraria);
  if(end<=start||end.getTime()-start.getTime()>31*86400000)fail('INVALID_BLOCK','El bloqueo debe tener fin posterior e intervalos de hasta 31 días.');
  if(access.rol==='BARBERO'&&input.barberoId!==access.barberoId)fail('FORBIDDEN','Solo puedes bloquear tu horario.',403);
  if(input.barberoId&&!await tx.barbero.findFirst({where:{id:input.barberoId,sucursalId:branch.id,eliminadoEn:null}}))fail('INVALID_BARBER','Profesional no disponible en esta sucursal.',404);
  const [appointments]=await resources(tx,branch,input.barberoId?[input.barberoId]:(await tx.barbero.findMany({where:{sucursalId:branch.id}})).map(b=>b.id),end);
  if(hasTimeConflict(start,end,appointments,[]))fail('BLOCK_CONFLICT','Hay citas dentro del bloqueo. Reprográmalas antes de bloquear.',409);
  return tx.bloqueoHorario.create({data:{tenantId:access.tenantId,sucursalId:branch.id,barberoId:input.barberoId||null,fechaInicio:start,fechaFin:end,motivo:typeof input.motivo==='string'?input.motivo.slice(0,500):'Bloqueo de horario'}});
 });
}
export async function deleteScheduleBlock(access:any,id:string){
 const row=await prisma.bloqueoHorario.findFirst({where:{id,tenantId:access.tenantId}});if(!row)fail('NOT_FOUND','Bloqueo no disponible.',404);
 if(access.rol==='BARBERO'&&row.tipo!=='BLOQUEO')fail('FORBIDDEN','Las ausencias registradas por administración las modifica el dueño o gerente.',403);
 return financialTransaction(async tx=>{await lockBranch(tx,access.tenantId,row.sucursalId);if(access.rol==='BARBERO'&&row.barberoId!==access.barberoId)fail('FORBIDDEN','Solo puedes eliminar tu bloqueo.',403);await tx.bloqueoHorario.deleteMany({where:{id,tenantId:access.tenantId}});return {message:'Bloqueo eliminado.'};});
}
export async function rescheduleInternal(access:any,id:string,input:any){
 const original=await prisma.cita.findFirst({where:{id,tenantId:access.tenantId}});if(!original)fail('NOT_FOUND','Cita no disponible.',404);
 return financialTransaction(async tx=>{
  const branch=await lockBranch(tx,access.tenantId,original.sucursalId);
  const cita=await tx.cita.findFirst({where:{id,tenantId:access.tenantId},include:{venta:true}});if(!cita)fail('NOT_FOUND','Cita no disponible.',404);
  if(access.rol==='BARBERO'&&(cita.barberoId!==access.barberoId||(input.barberoId&&input.barberoId!==access.barberoId)))fail('FORBIDDEN','Solo puedes gestionar tu propia agenda.',403);
  if(!eligibleStates.includes(cita.estado)||cita.venta)fail('INVALID_TRANSITION','La cita ya no admite reprogramación.',409);
  const start=appointmentTime(input.fechaHora,branch.zonaHoraria);
  if(start<=new Date()||start.getTime()>Date.now()+365*86400000)fail('BOOKING_DATE_RANGE','Selecciona un horario futuro dentro del próximo año.');
  const barber=await chooseBarber(tx,branch,{barberoId:input.barberoId||cita.barberoId},start,cita.duracionMinutos,false,cita.id);
  const updated=await tx.cita.update({where:{id},data:{fechaHora:start,barberoId:barber.id,tokenExpiraEn:new Date(start.getTime()-7200000)}});
  if(cita.fechaHora.getTime()!==start.getTime()||cita.barberoId!==barber.id)await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'CITA_REPROGRAMAR',detalles:JSON.stringify({id,anterior:cita.fechaHora,nueva:start,barberoId:barber.id})}});
  return updated;
 });
}

import { prisma } from '@systech/database';
import { digest, financialTransaction } from './cash-ledger.service';
import { SaleError } from './financial-error';
import { createBooking, chooseBarber, lockBranch } from './booking-operations.service';

const fail=(code:string,message:string,status=400):never=>{throw new SaleError(status,code,message);};
function scope(access:any,branch:string){if(!['DUENO','GERENTE','CAJERO','BARBERO'].includes(access.rol)||access.branchIds!==null&&!access.branchIds.includes(branch))fail('SIN_PERMISO','Sucursal no disponible.',403);}
export async function agendaOperation(access:any,branch:string,input:any,action:(tx:any)=>Promise<any>){
 scope(access,branch);
 const key=input.idempotencyKey;if(typeof key!=='string'||!/^[a-zA-Z0-9._:-]{1,128}$/.test(key))fail('KEY_REQUIRED','Conserva una intención de reintento para esta operación.');
 const hash=digest({...input,actor:access.userId,tenantId:access.tenantId,sucursalId:branch});
 return financialTransaction(async tx=>{
  await lockBranch(tx,access.tenantId,branch);
  const previous=await tx.operacionAgenda.findFirst({where:{tenantId:access.tenantId,clave:key}});
  if(previous){if(previous.requestHash!==hash)fail('IDEMPOTENCY_CONFLICT','La intención ya corresponde a otros datos.',409);return {...JSON.parse(previous.respuesta!),replayed:true};}
  const operation=await tx.operacionAgenda.create({data:{tenantId:access.tenantId,clave:key,requestHash:hash}});
  const result={...await action(tx),replayed:false,idempotencyKey:key};
  await tx.operacionAgenda.update({where:{id:operation.id},data:{respuesta:JSON.stringify(result)}});return result;
 });
}
const rowDto=(row:any)=>({...row,serviciosJson:undefined,servicios:JSON.parse(row.serviciosJson)});
export async function listArrivals(access:any,branch:string){
 scope(access,branch);
 const where={tenantId:access.tenantId,sucursalId:branch,...(access.rol==='BARBERO'?{OR:[{barberoId:access.barberoId},{barberoId:null,barberoPreferidoId:access.barberoId},{barberoId:null,barberoPreferidoId:null}]}:{})};
 const active=await prisma.filaPresencial.findMany({where:{...where,estado:{notIn:['RETIRADO','ATENDIDO']}},orderBy:[{fechaLlegada:'asc'},{id:'asc'}],take:500});
 const historical=await prisma.filaPresencial.findMany({where:{...where,estado:{in:['RETIRADO','ATENDIDO']}},orderBy:[{fechaLlegada:'desc'},{id:'desc'}],take:50});
 const rows=[...active,...historical];
 const appointments=await prisma.cita.findMany({where:{tenantId:access.tenantId,sucursalId:branch,id:{in:rows.map(r=>r.citaId).filter((id):id is string=>Boolean(id))}},select:{id:true,fechaHora:true,estado:true,barberoId:true}});
 return rows.map(row=>({...rowDto(row),cita:appointments.find(c=>c.id===row.citaId)||null}));
}
export async function joinArrivalQueue(access:any,input:any){
 if(typeof input.sucursalId!=='string')fail('INVALID_BRANCH','Elige la sucursal.');
 const name=input.clienteNombre==null?null:typeof input.clienteNombre==='string'?input.clienteNombre.trim():undefined;
 if(name===undefined||name&& (name.length<2||name.length>100))fail('INVALID_CUSTOMER','El nombre es opcional; si lo indicas usa entre 2 y 100 caracteres.');
 const phone=input.clienteTelefono==null||input.clienteTelefono===''?null:typeof input.clienteTelefono==='string'?input.clienteTelefono.replace(/\D/g,''):undefined;
 if(phone===undefined||phone&&!/^\d{10,15}$/.test(phone))fail('INVALID_CUSTOMER','Teléfono opcional inválido.');
 const ids=input.servicioIds||[input.servicioId];if(!Array.isArray(ids)||!ids.length||ids.length>10||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)fail('INVALID_SERVICES','Elige servicios distintos.');
 const preferred=input.barberoPreferidoId||null;
 if(preferred!==null&&typeof preferred!=='string')fail('INVALID_BARBER','Profesional inválido.');
 if(access.rol==='BARBERO'&&preferred&&preferred!==access.barberoId)fail('SIN_PERMISO','Solo puedes recibir para tu propio perfil.',403);
 const normalized={operacion:'LLEGADA',sucursalId:input.sucursalId,clienteNombre:name||null,clienteTelefono:phone,servicioIds:[...ids].sort(),barberoPreferidoId:preferred,idempotencyKey:input.idempotencyKey};
 return agendaOperation(access,input.sucursalId,normalized,async tx=>{
  if(await tx.filaPresencial.count({where:{tenantId:access.tenantId,sucursalId:input.sucursalId,estado:{notIn:['RETIRADO','ATENDIDO']}}})>=500)fail('QUEUE_LIMIT','La fila tiene demasiados turnos activos. Resuelve los anteriores antes de recibir más.',409);
  const services=await tx.producto.findMany({where:{tenantId:access.tenantId,tipo:'SERVICIO',activo:true,eliminadoEn:null,OR:[{sucursalId:input.sucursalId},{sucursalId:null}],id:{in:ids}},orderBy:{id:'asc'}});
  if(services.length!==ids.length||services.reduce((sum:any,s:any)=>sum+s.duracionMinutos,0)>480)fail('INVALID_SERVICES','Servicio no disponible o duración excesiva.',404);
  if(preferred&&!await tx.barbero.findFirst({where:{id:preferred,sucursalId:input.sucursalId,activo:true,eliminadoEn:null}}))fail('INVALID_BARBER','Profesional no disponible.',404);
  const row=await tx.filaPresencial.create({data:{tenantId:access.tenantId,sucursalId:input.sucursalId,clienteNombre:name||null,clienteTelefono:phone,barberoPreferidoId:preferred,usuarioId:access.userId,serviciosJson:JSON.stringify(services.map((s:any)=>({id:s.id,nombre:s.nombre,duracion:s.duracionMinutos,precio:Number(s.precioVenta)})))}});
  await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'FILA_LLEGADA',detalles:JSON.stringify({filaId:row.id,sucursalId:row.sucursalId})}});return rowDto(row);
 });
}
export async function operateArrival(access:any,id:string,input:any,operation:'ASIGNAR'|'REASIGNAR'|'ATENDER'|'RETIRAR'){
 const original=await prisma.filaPresencial.findFirst({where:{id,tenantId:access.tenantId}});if(!original)fail('NOT_FOUND','Turno no disponible.',404);
 scope(access,original!.sucursalId);
 if(!Number.isSafeInteger(input.versionEsperada)||input.versionEsperada<0)fail('QUEUE_VERSION_REQUIRED','Vuelve a consultar la fila.',409);
 return agendaOperation(access,original!.sucursalId,{...input,filaId:id,operacion:operation},async tx=>{
  const row=await tx.filaPresencial.findFirst({where:{id,tenantId:access.tenantId}});if(!row)fail('NOT_FOUND','Turno no disponible.',404);
  if(row.version!==input.versionEsperada)fail('QUEUE_CHANGED','Otro operador cambió el turno. Vuelve a consultar.',409);
  if(access.rol==='BARBERO'&&(row.barberoId&&row.barberoId!==access.barberoId||!row.barberoId&&row.barberoPreferidoId&&row.barberoPreferidoId!==access.barberoId))fail('SIN_PERMISO','Este turno corresponde a otro profesional.',403);
  if(['RETIRADO','ATENDIDO'].includes(row.estado))fail('QUEUE_FINISHED','Turno ya finalizado.',409);
  const branch=await tx.sucursal.findFirstOrThrow({where:{id:row.sucursalId,tenantId:access.tenantId}});
  let appointment:any=row.citaId?await tx.cita.findFirst({where:{id:row.citaId,tenantId:access.tenantId},include:{venta:true}}):null;
  let changes:any={version:{increment:1}};
  if(operation==='ASIGNAR'||operation==='REASIGNAR'){
   if(operation==='ASIGNAR'&&row.estado!=='ESPERANDO'||operation==='REASIGNAR'&&row.estado!=='ASIGNADO')fail('INVALID_QUEUE_TRANSITION','El turno no admite esa asignación.',409);
   const selected=access.rol==='BARBERO'?access.barberoId:input.barberoId||row.barberoPreferidoId||'cualquiera';
   if(access.rol==='BARBERO'&&input.barberoId&&input.barberoId!=='cualquiera'&&input.barberoId!==access.barberoId)fail('SIN_PERMISO','Solo puedes asignarte tu propia atención.',403);
   if(operation==='ASIGNAR'){
    appointment=await createBooking({sucursalId:row.sucursalId,barberoId:selected,clienteNombre:row.clienteNombre||'Cliente sin nombre',clienteTelefono:row.clienteTelefono||'',servicioIds:JSON.parse(row.serviciosJson).map((s:any)=>s.id),precioConfirmado:input.precioConfirmado,idempotencyKey:`fila-${row.id}`},false,access,undefined,true,tx);
    appointment=await tx.cita.update({where:{id:appointment.id},data:{estado:'CONFIRMADA'}});
   }else{
    if(!appointment||appointment.venta||!['PENDIENTE','CONFIRMADA'].includes(appointment.estado))fail('INVALID_QUEUE_TRANSITION','La atención ya inició o tiene un cobro.',409);
    const start=new Date(Math.ceil(Date.now()/60000)*60000),barber=await chooseBarber(tx,branch,{barberoId:selected},start,appointment.duracionMinutos,false,appointment.id);
    appointment=await tx.cita.update({where:{id:appointment.id},data:{barberoId:barber.id,fechaHora:start}});
   }
   changes={...changes,estado:'ASIGNADO',citaId:appointment.id,barberoId:appointment.barberoId};
  }else if(operation==='ATENDER'){
   if(row.estado!=='ASIGNADO'||!appointment||appointment.venta||appointment.estado!=='CONFIRMADA')fail('INVALID_QUEUE_TRANSITION','Asigna el turno antes de iniciar.',409);
   // Revalidate current availability if the customer waited after assignment.
   const start=new Date(Math.ceil(Date.now()/60000)*60000);
   await chooseBarber(tx,branch,{barberoId:appointment.barberoId},start,appointment.duracionMinutos,false,appointment.id);
   appointment=await tx.cita.update({where:{id:appointment.id},data:{estado:'EN_CURSO',fechaHora:start}});changes.estado='EN_ATENCION';
  }else{
   if(!['ESPERANDO','ASIGNADO'].includes(row.estado)||appointment?.venta||appointment&&!['CONFIRMADA','PENDIENTE'].includes(appointment.estado))fail('INVALID_QUEUE_TRANSITION','Una atención iniciada o cobrada no se retira de la fila.',409);
   if(typeof input.motivo!=='string'||input.motivo.trim().length<3||input.motivo.length>500)fail('REASON_REQUIRED','Indica el motivo del retiro.');
   if(appointment)appointment=await tx.cita.update({where:{id:appointment.id},data:{estado:'CANCELADA'}});
   changes={...changes,estado:'RETIRADO',motivoRetiro:input.motivo.trim()};
  }
  const updated=await tx.filaPresencial.update({where:{id},data:changes});
  await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:`FILA_${operation}`,detalles:JSON.stringify({filaId:id,sucursalId:row.sucursalId,citaId:updated.citaId,estado:updated.estado,motivo:changes.motivoRetiro||null})}});
  return {...rowDto(updated),cita:appointment};
 });
}

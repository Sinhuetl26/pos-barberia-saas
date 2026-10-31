import { prisma } from '@systech/database';
import { agendaOperation } from './arrival-queue.service';
import { digest } from './cash-ledger.service';
import { SaleError } from './financial-error';
import { appointmentTime, bookingDateBounds, scheduleFits, validDay, BOOKING_BUFFER } from './booking-time.service';

const fail=(code:string,message:string,status=400):never=>{throw new SaleError(status,code,message);};
function accessBranch(access:any,id:any){if(!['DUENO','GERENTE'].includes(access.rol)||typeof id!=='string'||access.branchIds!==null&&!access.branchIds.includes(id))fail('SIN_PERMISO','Solo administración de la sucursal puede cambiar disponibilidad.',403);}
export async function previewScheduleImpact(access:any,input:any,tx:any=prisma){
 accessBranch(access,input.sucursalId);
 const branch=await tx.sucursal.findFirst({where:{id:input.sucursalId,tenantId:access.tenantId,eliminadoEn:null}});if(!branch)fail('INVALID_BRANCH','Sucursal no disponible.',404);
 const type=input.tipo||'AUSENCIA';if(!['AUSENCIA','VACACIONES','HORARIO_ESPECIAL'].includes(type))fail('INVALID_CHANGE','Tipo de cambio inválido.');
 if(typeof input.motivo!=='string'||input.motivo.trim().length<3||input.motivo.length>500)fail('REASON_REQUIRED','Indica el motivo del cambio.');
 const barber=input.barberoId?await tx.barbero.findFirst({where:{id:input.barberoId,sucursalId:branch.id,activo:true,eliminadoEn:null}}):null;
 if(input.barberoId&&!barber||type==='HORARIO_ESPECIAL'&&!barber)fail('INVALID_BARBER','Elige un profesional de esta sucursal.',404);
 let start:Date,end:Date,normalized:any,oldShift:any=null;
 if(type==='HORARIO_ESPECIAL'){
  validDay(input.fecha);
  if(!/^\d{2}:\d{2}$/.test(input.horarioInicio)||!/^\d{2}:\d{2}$/.test(input.horarioFin))fail('INVALID_SCHEDULE','Indica horario válido HH:MM.');
  start=appointmentTime(input.fecha+'T'+input.horarioInicio+':00',branch.zonaHoraria);end=appointmentTime(input.fecha+'T'+input.horarioFin+':00',branch.zonaHoraria);
  if(end<=start)fail('INVALID_SCHEDULE','El final del turno debe ser posterior al inicio.');
  const opening=appointmentTime(input.fecha+'T'+branch.horarioApertura+':00',branch.zonaHoraria),closing=appointmentTime(input.fecha+'T'+branch.horarioCierre+':00',branch.zonaHoraria);
  if(start<opening||end>closing)fail('INVALID_SCHEDULE','El turno especial debe quedar dentro del horario de la sucursal.');
  const bounds=bookingDateBounds(input.fecha,branch.zonaHoraria);start=bounds.gte;end=bounds.lt;
  oldShift=await tx.turnoEspecial.findFirst({where:{tenantId:access.tenantId,barberoId:barber.id,fecha:input.fecha}});
  normalized={tipo:type,sucursalId:branch.id,barberoId:barber.id,fecha:input.fecha,horarioInicio:input.horarioInicio,horarioFin:input.horarioFin,motivo:input.motivo.trim()};
 }else{
  start=appointmentTime(input.fechaInicio,branch.zonaHoraria);end=appointmentTime(input.fechaFin,branch.zonaHoraria);
  if(end<=start||end.getTime()-start.getTime()>31*86400000)fail('INVALID_BLOCK','El período admite hasta 31 días; final posterior al inicio.');
  normalized={tipo:type,sucursalId:branch.id,barberoId:barber?.id||null,fechaInicio:start.toISOString(),fechaFin:end.toISOString(),motivo:input.motivo.trim()};
 }
 const appointments=await tx.cita.findMany({where:{tenantId:access.tenantId,sucursalId:branch.id,estado:{in:['PENDIENTE','CONFIRMADA','EN_CURSO']},...(barber?{barberoId:barber.id}:{}),fechaHora:{lt:end}},include:{cliente:{select:{nombre:true}},barbero:{select:{nombre:true}}},orderBy:[{fechaHora:'asc'},{id:'asc'}]});
 const affected=appointments.filter((c:any)=>type==='HORARIO_ESPECIAL'?c.fechaHora>=start&&!scheduleFits(branch,{...barber,_turnoEspecial:{fecha:input.fecha,horarioInicio:input.horarioInicio,horarioFin:input.horarioFin}},c.fechaHora,c.duracionMinutos,c.bufferMinutos??BOOKING_BUFFER):new Date(c.fechaHora.getTime()+(c.duracionMinutos+(c.bufferMinutos??BOOKING_BUFFER))*60000)>start);
 const summaries=affected.map((c:any)=>({id:c.id,codigoReserva:c.codigoReserva,nombreServicio:c.nombreServicio,fechaHora:c.fechaHora,barberoId:c.barberoId,barberoNombre:c.barbero.nombre,clienteNombre:c.cliente?.nombre||null,duracionMinutos:c.duracionMinutos,bufferMinutos:c.bufferMinutos,estado:c.estado}));
 const existingBlocks=await tx.bloqueoHorario.findMany({where:{tenantId:access.tenantId,sucursalId:branch.id,fechaInicio:{lt:end},fechaFin:{gt:start},...(barber?{OR:[{barberoId:barber.id},{barberoId:null}]}:{})},orderBy:{id:'asc'},select:{id:true,barberoId:true,fechaInicio:true,fechaFin:true,tipo:true}});
 const previewHash=digest({tenantId:access.tenantId,actor:access.userId,normalized,branch:{zonaHoraria:branch.zonaHoraria,horarioApertura:branch.horarioApertura,horarioCierre:branch.horarioCierre,diasLaborales:branch.diasLaborales},barber:barber?{id:barber.id,horarioInicio:barber.horarioInicio,horarioFin:barber.horarioFin,diasDescanso:barber.diasDescanso}:null,oldShift,existingBlocks,affected:summaries});
 return {previewHash,cambio:normalized,zonaHoraria:branch.zonaHoraria,citasAfectadas:summaries,totalAfectadas:summaries.length,mensaje:'Las citas se conservan. El cambio bloquea nuevos cupos y deja conflictos para resolver explícitamente.'};
}
export async function confirmScheduleImpact(access:any,input:any){
 accessBranch(access,input.sucursalId);
 if(typeof input.previewHash!=='string'||!/^[a-f0-9]{64}$/.test(input.previewHash))fail('PREVIEW_REQUIRED','Revisa el impacto antes de confirmar.',409);
 return agendaOperation(access,input.sucursalId,{...input,operacion:'CAMBIO_DISPONIBILIDAD'},async tx=>{
  const preview=await previewScheduleImpact(access,input,tx);
  if(preview.previewHash!==input.previewHash)fail('IMPACT_CHANGED','La agenda o el horario cambió desde la revisión. Vuelve a revisar citas afectadas.',409);
  if(preview.totalAfectadas&&input.aceptarCitasAfectadas!==true)fail('AFFECTED_APPOINTMENTS_ACK_REQUIRED','Confirma que resolverás las citas afectadas; no se cancelarán automáticamente.',409);
  const change=preview.cambio;let record:any;
  if(change.tipo==='HORARIO_ESPECIAL'){
   const old=await tx.turnoEspecial.findFirst({where:{tenantId:access.tenantId,barberoId:change.barberoId,fecha:change.fecha}});
   record=old?await tx.turnoEspecial.update({where:{id:old.id},data:{horarioInicio:change.horarioInicio,horarioFin:change.horarioFin,motivo:change.motivo,usuarioId:access.userId,version:{increment:1}}}):await tx.turnoEspecial.create({data:{tenantId:access.tenantId,sucursalId:change.sucursalId,barberoId:change.barberoId,fecha:change.fecha,horarioInicio:change.horarioInicio,horarioFin:change.horarioFin,motivo:change.motivo,usuarioId:access.userId}});
  }else record=await tx.bloqueoHorario.create({data:{tenantId:access.tenantId,sucursalId:change.sucursalId,barberoId:change.barberoId,fechaInicio:new Date(change.fechaInicio),fechaFin:new Date(change.fechaFin),motivo:change.motivo,tipo:change.tipo,citasAfectadasJson:JSON.stringify(preview.citasAfectadas.map((c:any)=>c.id))}});
  await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:change.tipo==='HORARIO_ESPECIAL'?'HORARIO_ESPECIAL_GUARDADO':'AUSENCIA_GUARDADA',detalles:JSON.stringify({cambio:change,registroId:record.id,citasAfectadas:preview.citasAfectadas.map((c:any)=>c.id),conservadas:true})}});
  return {registro:record,citasAfectadas:preview.citasAfectadas,conservadas:true};
 });
}
export async function listSpecialSchedules(access:any,branchId:string,date?:string){
 if(!['DUENO','GERENTE','CAJERO','BARBERO'].includes(access.rol)||access.branchIds!==null&&!access.branchIds.includes(branchId))fail('SIN_PERMISO','Horario no disponible.',403);
 if(date)validDay(date);
 return prisma.turnoEspecial.findMany({where:{tenantId:access.tenantId,sucursalId:branchId,...(access.rol==='BARBERO'?{barberoId:access.barberoId}:{}),...(date?{fecha:date}:{})},orderBy:{fecha:'desc'},take:100});
}

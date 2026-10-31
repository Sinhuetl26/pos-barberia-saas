import { civilParts, scheduleFits } from './booking-time.service';

export async function datedBarbers(tx:any,branch:any,barbers:any[],date:string){
 const exceptions=await tx.turnoEspecial.findMany({where:{tenantId:branch.tenantId,sucursalId:branch.id,fecha:date,barberoId:{in:barbers.map(b=>b.id)}}});
 return barbers.map(barber=>({...barber,_turnoEspecial:exceptions.find((x:any)=>x.barberoId===barber.id)||null}));
}
export async function appointmentConflicts(tx:any,appointments:any[]){
 const output=[];
 for(const appointment of appointments){
  if(['CANCELADA','NO_SHOW','COMPLETADA'].includes(appointment.estado)){output.push({...appointment,conflictos:[]});continue;}
  const branch=appointment.sucursal||await tx.sucursal.findFirst({where:{id:appointment.sucursalId,tenantId:appointment.tenantId}});
  const barber=appointment.barbero&&appointment.barbero.horarioInicio?appointment.barbero:await tx.barbero.findFirst({where:{id:appointment.barberoId,sucursalId:appointment.sucursalId}});
  if(!branch||!barber){output.push({...appointment,conflictos:[{tipo:'RECURSO_NO_DISPONIBLE',mensaje:'Revisa la sucursal o profesional.'}]});continue;}
  const end=new Date(new Date(appointment.fechaHora).getTime()+(appointment.duracionMinutos+(appointment.bufferMinutos??10))*60000);
  const blocks=await tx.bloqueoHorario.findMany({where:{tenantId:appointment.tenantId,sucursalId:appointment.sucursalId,OR:[{barberoId:appointment.barberoId},{barberoId:null}],fechaInicio:{lt:end},fechaFin:{gt:appointment.fechaHora}}});
  const [effective]=await datedBarbers(tx,branch,[barber],civilParts(new Date(appointment.fechaHora),branch.zonaHoraria).day);
  const conflicts=blocks.map((b:any)=>({id:b.id,tipo:b.tipo,mensaje:b.motivo}));
  if(!scheduleFits(branch,effective,new Date(appointment.fechaHora),appointment.duracionMinutos,appointment.bufferMinutos??10))conflicts.push({tipo:'HORARIO_ESPECIAL',mensaje:'El turno cambió; resuelve el horario de esta cita.'});
  output.push({...appointment,conflictos:conflicts});
 }
 return output;
}

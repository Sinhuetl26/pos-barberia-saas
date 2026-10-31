import { z } from 'zod';
import { prisma } from '@systech/database';
import { configuredDays } from './booking-time.service';

const money=z.number().finite().min(0).max(1000000).refine(n=>Math.abs(n*100-Math.round(n*100))<1e-7,'Usa dos decimales como máximo.');
const hour=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const scheduleSchema=z.object({
 nombreSucursal:z.string().trim().min(2).max(100).default('Matriz Principal'),
 direccionSucursal:z.string().trim().max(500).default(''),
 horarioApertura:hour.default('09:00'),horarioCierre:hour.default('20:00'),
 zonaHoraria:z.string().max(80).default('America/Mexico_City').refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}},'Zona horaria inválida.'),
 diasLaborales:z.string().max(150).default('Lunes a Sábado').refine(v=>configuredDays(v).length>0,'Selecciona días laborales.'),
}).refine(v=>v.horarioApertura<v.horarioCierre,'El cierre debe ser posterior a la apertura.');
const schema=scheduleSchema.safeExtend({
 nombreBarbero:z.string().trim().max(100).optional(),
 comisionServicios:z.number().finite().min(0).max(100).default(50),
 comisionProductosPct:z.number().finite().min(0).max(100).default(10),
 diasDescanso:z.string().max(150).default('Domingo'),
 serviciosSeleccionados:z.array(z.object({nombre:z.string().trim().min(2).max(100),categoria:z.string().trim().max(80).default('Servicios'),duracionMinutos:z.number().int().min(15).max(480),precioVenta:money,costo:money.default(0)})).max(60).default([]),
});
export function validateInitialSetup(input:any){
 const result=schema.safeParse({...input,comisionProductosPct:input.comisionProductosPct??input.comisionProductos});
 if(!result.success)throw Object.assign(new Error(result.error.issues[0].message),{status:400});
 return result.data;
}
export async function onboardingProgress(tenantId:string,sucursalId:string){
 const branch=await prisma.sucursal.findFirst({where:{id:sucursalId,tenantId,eliminadoEn:null}});
 if(!branch)throw Object.assign(new Error('Sucursal no disponible.'),{status:404});
 const [services,barbers,registers,physicalProducts,tenant]=await Promise.all([
  prisma.producto.count({where:{tenantId,activo:true,eliminadoEn:null,tipo:'SERVICIO',OR:[{sucursalId},{sucursalId:null}]}}),
  prisma.barbero.count({where:{sucursalId,activo:true,eliminadoEn:null}}),
  prisma.corteCaja.count({where:{tenantId,sucursalId}}),
  prisma.producto.count({where:{tenantId,activo:true,eliminadoEn:null,tipo:'PRODUCTO',sucursalId}}),
  prisma.tenant.findUnique({where:{id:tenantId},select:{slug:true}}),
 ]);
 return {branch,steps:[{id:'horario',label:'Confirma sucursal, horario y días de atención',done:!!branch.configuradaEn,target:'horario'},{id:'catalogo',label:'Agrega tus servicios, precios y duración',done:services>0,target:'inventario'},{id:'equipo',label:'Registra tus barberos y sus comisiones',done:barbers>0,target:'barberos'},{id:'stock',label:'Captura existencias iniciales (opcional)',done:physicalProducts>0,optional:true,target:'inventario'},{id:'caja',label:'Abre tu primera caja con el efectivo contado',done:registers>0,target:'barberos?tab=cortes'},{id:'reservas',label:'Enlace de reservas listo para revisar y compartir',done:!!tenant?.slug&&!!branch.configuradaEn&&services>0&&barbers>0,target:'configuracion'}],counts:{services,barbers,registers,physicalProducts}};
}

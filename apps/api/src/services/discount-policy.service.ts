import { prisma } from '@systech/database';
import { SaleError } from './financial-error';
import { calculateSaleTotals, appointmentCatalog, moneyCents } from './pricing.service';
import { resolveProfessionalPrices } from './professional-pricing.service';
import { commercialBranch, commercialOperation } from './commercial-operation.service';
import { digest } from './cash-ledger.service';
import { createSaleSchema } from '../validators/schemas';

const fail=(code:string,message:string,status=400):never=>{throw new SaleError(status,code,message);};
const roles=['DUENO','GERENTE','CAJERO','BARBERO'];
async function approvalIdentity(tx:any,tenantId:string,userId:string,branchId:string){
 // Operational Usuario ORM reads intentionally only expose the caller. This
 // narrow trusted lookup verifies another account, without returning its DTO.
 const rows=await tx.$queryRaw`SELECT "id","rol","activo","eliminadoEn","sucursalId","sucursalesAsignadasJson","barberoId","invitationPending" FROM "Usuario" WHERE "tenantId"=${tenantId} AND "id"=${userId}`;
 const user=rows[0];if(!user||!user.activo||user.eliminadoEn||user.invitationPending)return null;
 if(user.rol==='DUENO')return user;
 if(user.rol==='BARBERO')return user.barberoId&&await tx.barbero.findFirst({where:{id:user.barberoId,sucursalId:branchId,activo:true,eliminadoEn:null}})?user:null;
 let assigned:any[];try{assigned=JSON.parse(user.sucursalesAsignadasJson||'[]');}catch{return null;}
 if(!Array.isArray(assigned))return null;if(!assigned.length&&user.sucursalId)assigned=[user.sucursalId];
 return assigned.includes(branchId)?user:null;
}
export async function currentDiscountPolicy(tx:any,tenantId:string,branch:string){
 const row=await tx.politicaDescuento.findFirst({where:{tenantId,sucursalId:branch},orderBy:{version:'desc'}});
 return row?{...row,limitesPorRol:JSON.parse(row.limitesJson),limitesJson:undefined}:null;
}
export async function getDiscountPolicy(access:any,branch:string){commercialBranch(access,branch);return currentDiscountPolicy(prisma,access.tenantId,branch);}
export async function publishDiscountPolicy(access:any,input:any){
 commercialBranch(access,input.sucursalId,true);
 if(!Number.isSafeInteger(input.versionEsperada)||input.versionEsperada<0||typeof input.activa!=='boolean'||typeof input.motivoObligatorio!=='boolean'||!Number.isSafeInteger(input.vigenciaAprobacionMinutos)||input.vigenciaAprobacionMinutos<1||input.vigenciaAprobacionMinutos>1440||!input.limitesPorRol||roles.some(role=>typeof input.limitesPorRol[role]!=='number'||!Number.isFinite(input.limitesPorRol[role])||input.limitesPorRol[role]<0||input.limitesPorRol[role]>100||Math.abs(input.limitesPorRol[role]*100-Math.round(input.limitesPorRol[role]*100))>0.00001))fail('INVALID_DISCOUNT_POLICY','Elige explícitamente límites por rol (dos decimales), motivo y vigencia de aprobación entre 1 y 1440 minutos.');
 const limits=Object.fromEntries(roles.map(role=>[role,input.limitesPorRol[role]]));
 return commercialOperation(access,{operacion:'POLITICA_DESCUENTO',sucursalId:input.sucursalId,versionEsperada:input.versionEsperada,activa:input.activa,limitesPorRol:limits,motivoObligatorio:input.motivoObligatorio,vigenciaAprobacionMinutos:input.vigenciaAprobacionMinutos,idempotencyKey:input.idempotencyKey},async tx=>{
  const previous=await currentDiscountPolicy(tx,access.tenantId,input.sucursalId);if((previous?.version||0)!==input.versionEsperada)fail('DISCOUNT_POLICY_CHANGED','La política cambió; vuelve a consultar.',409);
  const row=await tx.politicaDescuento.create({data:{tenantId:access.tenantId,sucursalId:input.sucursalId,version:(previous?.version||0)+1,activa:input.activa,limitesJson:JSON.stringify(limits),motivoObligatorio:input.motivoObligatorio,vigenciaAprobacionMinutos:input.vigenciaAprobacionMinutos,usuarioId:access.userId}});
  await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'POLITICA_DESCUENTO_GUARDADA',detalles:JSON.stringify({sucursalId:input.sucursalId,version:row.version,activa:row.activa,limitesPorRol:limits,motivoObligatorio:row.motivoObligatorio,vigenciaAprobacionMinutos:row.vigenciaAprobacionMinutos})}});
  return {...row,limitesJson:undefined,limitesPorRol:limits};
 },true);
}
export function discountNeedsApproval(access:any,policy:any,calculation:any){
 const cap=policy?.activa?policy.limitesPorRol[access.rol]:access.rol==='BARBERO'?20:100;
 return moneyCents(calculation.descuento)>0&&moneyCents(calculation.descuento)*10000>moneyCents(calculation.subtotal)*Math.round(cap*100);
}
export function discountCartHash(access:any,input:any,calculation:any,policy:any){return digest({tenantId:access.tenantId,sucursalId:input.sucursalId,solicitante:access.userId,rol:access.rol,barberoId:input.barberoId,clienteId:input.clienteId||null,citaId:input.citaId||null,metodoPago:input.metodoPago,motivoDescuento:input.motivoDescuento?.trim()||null,descuento:moneyCents(calculation.descuento),propina:moneyCents(input.propina),total:moneyCents(calculation.total),politicaVersion:policy?.version||null,items:[...calculation.preparedItems].sort((a,b)=>a.productoId.localeCompare(b.productoId)).map(i=>({productoId:i.productoId,cantidad:i.cantidad,nombre:i.nombreItem,precio:moneyCents(i.precioUnitario),tasa:i.tasaImpuesto,subtotal:moneyCents(i.subtotal),descuento:moneyCents(i.descuento),impuesto:moneyCents(i.impuesto)}))});}
async function quoteApprovalCart(tx:any,access:any,input:any){
 commercialBranch(access,input.sucursalId);
 const barber=await tx.barbero.findFirst({where:{id:input.barberoId,sucursalId:input.sucursalId,activo:true,eliminadoEn:null}});
 if(!barber||access.rol==='BARBERO'&&barber.id!==access.barberoId)fail('INVALID_BARBER','Profesional no disponible.',404);
 if(input.clienteId&&!await tx.clienteFinal.findFirst({where:{id:input.clienteId,tenantId:access.tenantId}}))fail('INVALID_CLIENT','Cliente no disponible.',404);
 const ids=input.items.map((i:any)=>i.productoId);
 const products=await tx.producto.findMany({where:{id:{in:ids},tenantId:access.tenantId,activo:true,eliminadoEn:null,naturaleza:{not:'INSUMO'},OR:[{sucursalId:input.sucursalId},{sucursalId:null}]}});
 if(products.length!==ids.length)fail('INVALID_PRODUCT','El catálogo no está disponible.',404);
 let priced:any[]=await resolveProfessionalPrices(tx,access.tenantId,input.sucursalId,input.barberoId,products);
 if(input.citaId){
  const appointment=await tx.cita.findFirst({where:{id:input.citaId,tenantId:access.tenantId,sucursalId:input.sucursalId,barberoId:input.barberoId}});
  if(!appointment||['CANCELADA','NO_SHOW'].includes(appointment.estado)||input.clienteId&&appointment.clienteId!==input.clienteId)fail('INVALID_CITA','Cita no disponible.',404);
  try{priced=appointmentCatalog(products,input.items,appointment);}catch{fail('BOOKING_SERVICES_MISMATCH','Revisa los servicios de la reserva.',409);}
 }
 const calculation=calculateSaleTotals(new Map(priced.map(p=>[p.id,p])),input.items,input.descuento,input.propina,Number(barber.comisionServiciosPct),Number(barber.comisionProductosPct));
 const policy=await currentDiscountPolicy(tx,access.tenantId,input.sucursalId);
 return {calculation,policy,cartHash:discountCartHash(access,input,calculation,policy)};
}
const approvalDto=(row:any)=>{
 const cart=JSON.parse(row.carritoJson);
 return {...row,carritoJson:undefined,resumenJson:undefined,cartHash:undefined,resumen:{...JSON.parse(row.resumenJson),metodoPago:cart.metodoPago??null,propina:cart.propina??null}};
};
export async function requestDiscountApproval(access:any,input:any){
 const parsed=createSaleSchema.safeParse(input.carrito);if(!parsed.success)fail('INVALID_CART','Revisa el carrito antes de solicitar aprobación.');
 const cart=parsed.data!;
 if(typeof input.motivo!=='string'||input.motivo.trim().length<3||input.motivo.length>500)fail('REASON_REQUIRED','Explica el motivo del descuento.');
 cart.motivoDescuento=input.motivo.trim();
 return commercialOperation(access,{operacion:'SOLICITAR_DESCUENTO',sucursalId:cart.sucursalId,carrito:cart,motivo:input.motivo.trim(),idempotencyKey:input.idempotencyKey},async tx=>{
  const quote=await quoteApprovalCart(tx,access,cart);
  if(!discountNeedsApproval(access,quote.policy,quote.calculation))fail('APPROVAL_NOT_REQUIRED','El descuento está dentro de tu límite; no requiere aprobación.');
  const row=await tx.aprobacionDescuento.create({data:{tenantId:access.tenantId,sucursalId:cart.sucursalId,solicitadoPorId:access.userId,rolSolicitante:access.rol,cartHash:quote.cartHash,carritoJson:JSON.stringify(cart),resumenJson:JSON.stringify({barberoId:cart.barberoId,clienteId:cart.clienteId||null,citaId:cart.citaId||null,subtotal:quote.calculation.subtotal,descuento:quote.calculation.descuento,total:quote.calculation.total,items:quote.calculation.preparedItems.map(i=>({productoId:i.productoId,nombre:i.nombreItem,cantidad:i.cantidad,precio:i.precioUnitario}))}),motivo:input.motivo.trim(),politicaVersion:quote.policy?.version||null}});
  await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'DESCUENTO_SOLICITADO',detalles:JSON.stringify({aprobacionId:row.id,sucursalId:row.sucursalId,solicitante:access.userId,motivo:row.motivo,descuento:quote.calculation.descuento})}});
  return approvalDto(row);
 });
}
export async function listDiscountApprovals(access:any,branch:string){commercialBranch(access,branch);return (await prisma.aprobacionDescuento.findMany({where:{tenantId:access.tenantId,sucursalId:branch,...(!['DUENO','GERENTE'].includes(access.rol)?{solicitadoPorId:access.userId}:{})},orderBy:{fecha:'desc'},take:100})).map(approvalDto);}
export async function decideDiscountApproval(access:any,id:string,input:any){
 const original=await prisma.aprobacionDescuento.findFirst({where:{id,tenantId:access.tenantId}});if(!original)fail('NOT_FOUND','Solicitud no disponible.',404);
 commercialBranch(access,original!.sucursalId,true);
 return commercialOperation(access,{...input,operacion:'DECIDIR_DESCUENTO',aprobacionId:id,sucursalId:original!.sucursalId},async tx=>{
  const row=await tx.aprobacionDescuento.findFirst({where:{id,tenantId:access.tenantId}});
  if(!row||row.estado!=='PENDIENTE')fail('APPROVAL_ALREADY_DECIDED','La solicitud ya fue decidida.',409);
  if(row.solicitadoPorId===access.userId)fail('SELF_APPROVAL_FORBIDDEN','La aprobación requiere otra cuenta administrativa identificada.',403);
  if(input.accion==='RECHAZAR'){const rejected=await tx.aprobacionDescuento.update({where:{id},data:{estado:'RECHAZADA',aprobadoPorId:access.userId,aprobadoPorNombre:access.email,aprobadoEn:new Date()}});await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'DESCUENTO_RECHAZADO',detalles:JSON.stringify({aprobacionId:id,sucursalId:row.sucursalId,solicitante:row.solicitadoPorId})}});return approvalDto(rejected);}
  if(input.accion!==undefined&&input.accion!=='APROBAR')fail('INVALID_ACTION','Acción de aprobación inválida.');
  const user=await approvalIdentity(tx,access.tenantId,row.solicitadoPorId,row.sucursalId);
  if(!user||user.rol!==row.rolSolicitante)fail('REQUESTER_CHANGED','La cuenta solicitante cambió; requiere nueva solicitud.',409);
  const subject={...access,userId:user.id,rol:user.rol,barberoId:user.barberoId};
  const quote=await quoteApprovalCart(tx,subject,JSON.parse(row.carritoJson));if(quote.cartHash!==row.cartHash)fail('APPROVAL_CART_CHANGED','El carrito, los precios o la política cambió; solicita otra aprobación.',409);
  const minutes=quote.policy?.activa?quote.policy.vigenciaAprobacionMinutos:input.vigenciaMinutos;
  if(!Number.isSafeInteger(minutes)||minutes<1||minutes>1440)fail('APPROVAL_EXPIRY_REQUIRED','El aprobador debe elegir una vigencia entre 1 y 1440 minutos.');
  const approved=await tx.aprobacionDescuento.update({where:{id},data:{estado:'APROBADA',aprobadoPorId:access.userId,aprobadoPorNombre:access.email,aprobadoEn:new Date(),expiraEn:new Date(Date.now()+minutes*60000)}});
  await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'DESCUENTO_APROBADO',detalles:JSON.stringify({aprobacionId:id,solicitante:row.solicitadoPorId,sucursalId:row.sucursalId,vigenciaMinutos:minutes})}});return approvalDto(approved);
 },true);
}
export async function authorizeSaleDiscount(tx:any,access:any,input:any,calculation:any){
 const policy=await currentDiscountPolicy(tx,access.tenantId,input.sucursalId);
 if(policy?.activa&&policy.motivoObligatorio&&moneyCents(calculation.descuento)>0&&(typeof input.motivoDescuento!=='string'||input.motivoDescuento.trim().length<3))fail('DISCOUNT_REASON_REQUIRED','Explica el motivo del descuento.');
 if(!discountNeedsApproval(access,policy,calculation))return {policyVersion:policy?.version||null,aprobacion:null};
 if(typeof input.aprobacionDescuentoId!=='string')fail('DISCOUNT_LIMIT_EXCEEDED','Este descuento requiere aprobación de otra cuenta administrativa.',403);
 const row=await tx.aprobacionDescuento.findFirst({where:{id:input.aprobacionDescuentoId,tenantId:access.tenantId,sucursalId:input.sucursalId,solicitadoPorId:access.userId}});
 if(!row||row.estado!=='APROBADA'||row.aprobadoPorId===access.userId||!row.expiraEn||row.expiraEn<=new Date())fail('DISCOUNT_APPROVAL_INVALID','Aprobación ausente, usada o vencida; solicita una nueva.',409);
 const approver=await approvalIdentity(tx,access.tenantId,row.aprobadoPorId,input.sucursalId);if(!approver||!['DUENO','GERENTE'].includes(approver.rol))fail('APPROVER_UNAVAILABLE','La cuenta aprobadora ya no tiene permiso.',409);
 if(row.cartHash!==discountCartHash(access,input,calculation,policy))fail('APPROVAL_CART_CHANGED','El carrito o la política cambió; solicita otra aprobación.',409);
 return {policyVersion:policy?.version||null,aprobacion:{id:row.id,aprobadoPorId:row.aprobadoPorId,aprobadoPorNombre:row.aprobadoPorNombre,solicitadoPorId:row.solicitadoPorId,expiraEn:row.expiraEn}};
}

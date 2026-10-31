import { prisma } from '@systech/database';
import { SaleError } from './financial-error';
import { commercialBranch, commercialOperation } from './commercial-operation.service';
import { appointmentTime } from './booking-time.service';

const fail=(code:string,message:string,status=400):never=>{throw new SaleError(status,code,message);};
export async function resolveProfessionalPrices(tx:any,tenantId:string,branchId:string,barberId:string,products:any[],at:Date=new Date()){
 const rules=await tx.tarifaProfesional.findMany({where:{tenantId,sucursalId:branchId,barberoId:barberId,servicioId:{in:products.filter(p=>p.tipo==='SERVICIO').map(p=>p.id)},anulada:false,vigenteDesde:{lte:at},OR:[{vigenteHasta:null},{vigenteHasta:{gt:at}}]},orderBy:{version:'desc'}});
 return products.map(product=>{const rule=rules.find((r:any)=>r.servicioId===product.id);return {...product,precioVenta:rule?.precio===null||!rule?product.precioVenta:rule.precio,resolucionPrecio:{tarifaId:rule?.id||null,version:rule?.version||0,heredado:!rule||rule.precio===null}};});
}
export async function professionalTariffs(access:any,branchId:string){commercialBranch(access,branchId,true);return prisma.tarifaProfesional.findMany({where:{tenantId:access.tenantId,sucursalId:branchId},orderBy:{version:'desc'},take:500});}
export async function publishProfessionalTariff(access:any,input:any){
 commercialBranch(access,input.sucursalId,true);
 if(typeof input.barberoId!=='string'||typeof input.servicioId!=='string'||!Number.isSafeInteger(input.versionEsperada)||input.versionEsperada<0)fail('INVALID_TARIFF','Elige profesional, servicio y versión actual.');
 const price=input.precio;if(price!==null&&(typeof price!=='number'||!Number.isFinite(price)||price<0||price>1e9||Math.abs(price*100-Math.round(price*100))>0.00001))fail('INVALID_PRICE','Precio explícito en centavos o null para heredar.');
 const branch=await prisma.sucursal.findFirst({where:{id:input.sucursalId,tenantId:access.tenantId,eliminadoEn:null}});if(!branch)fail('INVALID_BRANCH','Sucursal no disponible.',404);
 const start=appointmentTime(input.vigenteDesde,branch!.zonaHoraria),end=input.vigenteHasta==null?null:appointmentTime(input.vigenteHasta,branch!.zonaHoraria);
 if(typeof input.vigenteDesde!=='string'||!Number.isFinite(start.getTime())||end&&(!Number.isFinite(end.getTime())||end<=start))fail('INVALID_VALIDITY','Indica vigencia válida; final opcional posterior al inicio.');
 const normalized={operacion:'TARIFA_PROFESIONAL',sucursalId:input.sucursalId,barberoId:input.barberoId,servicioId:input.servicioId,precio:price,vigenteDesde:start.toISOString(),vigenteHasta:end?.toISOString()||null,versionEsperada:input.versionEsperada,idempotencyKey:input.idempotencyKey};
 return commercialOperation(access,normalized,async tx=>{
  const barber=await tx.barbero.findFirst({where:{id:input.barberoId,sucursalId:input.sucursalId,activo:true,eliminadoEn:null}}),service=await tx.producto.findFirst({where:{id:input.servicioId,tenantId:access.tenantId,tipo:'SERVICIO',eliminadoEn:null,OR:[{sucursalId:input.sucursalId},{sucursalId:null}]}});
  if(!barber||!service)fail('NOT_FOUND','Profesional o servicio no disponible.',404);
  const history=await tx.tarifaProfesional.findMany({where:{tenantId:access.tenantId,sucursalId:input.sucursalId,barberoId:input.barberoId,servicioId:input.servicioId},orderBy:{version:'desc'}});
  const version=history[0]?.version||0;if(version!==input.versionEsperada)fail('TARIFF_CHANGED','La tarifa cambió. Revisa la versión.',409);
  const overlap=history.filter((r:any)=>!r.anulada&&r.vigenteDesde<(end||new Date('9999-12-31'))&&(!r.vigenteHasta||r.vigenteHasta>start));
  if(overlap.length){
   // Replacing the one current open interval explicitly closes its coverage;
   // finite overlapping campaigns require a different interval, never guessing.
   if(overlap.length!==1||overlap[0].vigenteHasta||end||start<overlap[0].vigenteDesde)fail('TARIFF_INTERVAL_OVERLAP','La vigencia se solapa con otra tarifa. Elige un período sin solapamiento.',409);
   await tx.tarifaProfesional.update({where:{id:overlap[0].id},data:start.getTime()===overlap[0].vigenteDesde.getTime()?{anulada:true}:{vigenteHasta:start}});
  }
  const rule=await tx.tarifaProfesional.create({data:{tenantId:access.tenantId,sucursalId:input.sucursalId,barberoId:input.barberoId,servicioId:input.servicioId,version:version+1,precio:price,vigenteDesde:start,vigenteHasta:end,usuarioId:access.userId}});
  await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'TARIFA_PROFESIONAL_GUARDADA',detalles:JSON.stringify({...normalized,tarifaId:rule.id,version:rule.version,reemplaza:overlap.map((r:any)=>({id:r.id,desde:r.vigenteDesde,hasta:r.vigenteHasta,precio:r.precio}))})}});return rule;
 },true);
}
export async function resolvedCatalog(access:any,input:any){
 commercialBranch(access,input.sucursalId);
 if(access.rol==='BARBERO'&&input.barberoId!==access.barberoId)fail('SIN_PERMISO','Solo puedes consultar tu propio perfil.',403);
 const barber=await prisma.barbero.findFirst({where:{id:input.barberoId,sucursalId:input.sucursalId,activo:true,eliminadoEn:null}});if(!barber)fail('NOT_FOUND','Profesional no disponible.',404);
 const branch=await prisma.sucursal.findFirst({where:{id:input.sucursalId,tenantId:access.tenantId,eliminadoEn:null}});if(!branch)fail('INVALID_BRANCH','Sucursal no disponible.',404);
 const at=input.fechaHora?appointmentTime(input.fechaHora,branch!.zonaHoraria):new Date();if(!Number.isFinite(at.getTime()))fail('INVALID_DATE','Fecha de tarifa inválida.');
 const products=await prisma.producto.findMany({where:{tenantId:access.tenantId,activo:true,eliminadoEn:null,naturaleza:{not:'INSUMO'},OR:[{sucursalId:input.sucursalId},{sucursalId:null}]},orderBy:{nombre:'asc'}});
 return resolveProfessionalPrices(prisma,access.tenantId,input.sucursalId,input.barberoId,products,at);
}

import { prisma } from '@systech/database';
import { commercialBranch, commercialOperation } from './commercial-operation.service';
import { cents, digest, drawerBalance, openShift, recordCash } from './cash-ledger.service';
import { appointmentTime } from './booking-time.service';
import { SaleError } from './financial-error';

const categories=['RENTA','SERVICIOS','MANTENIMIENTO','OTROS','COMPRA_INVENTARIO'];
const fail=(code:string,message:string,status=400):never=>{throw new SaleError(status,code,message);};
function text(value:any,max:number,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())fail('INVALID_EXPENSE','Revisa concepto, motivo y referencia del gasto.');return value.trim();}
async function normalize(tx:any,access:any,input:any){
 const branch=await tx.sucursal.findFirst({where:{tenantId:access.tenantId,id:input.sucursalId,eliminadoEn:null}});
 if(!branch)fail('INVALID_BRANCH','Sucursal no disponible.',404);
 if(!categories.includes(input.categoria)||!['EFECTIVO','TARJETA','TRANSFERENCIA'].includes(input.metodoPago))fail('INVALID_EXPENSE','Selecciona categoría y método de pago válidos.');
 const date=appointmentTime(input.fecha,branch.zonaHoraria);if(!Number.isFinite(date.getTime()))fail('INVALID_DATE','Indica la fecha del gasto.');
 return {concepto:text(input.concepto,300,true),categoria:input.categoria,fecha:date.toISOString(),importe:cents(input.importe,true)/100,metodoPago:input.metodoPago,comprobanteReferencia:input.comprobanteReferencia==null?null:text(input.comprobanteReferencia,300)};
}
export async function expenseView(tx:any,row:any){
 const corrections=await tx.correccionGasto.findMany({where:{tenantId:row.tenantId,gastoId:row.id},orderBy:{version:'asc'}});
 const original={concepto:row.concepto,categoria:row.categoria,fecha:row.fecha.toISOString(),importe:Number(row.importe),metodoPago:row.metodoPago,comprobanteReferencia:row.comprobanteReferencia};
 const actual=corrections.length?JSON.parse(corrections[corrections.length-1].actualJson):original;
 const cashIds=[row.registroCajaId,...corrections.map((c:any)=>c.registroCajaId)].filter(Boolean);
 const linked=await tx.registroCaja.findMany({where:{id:{in:cashIds},tenantId:row.tenantId,sucursalId:row.sucursalId},orderBy:{id:'asc'}});
 return {id:row.id,sucursalId:row.sucursalId,version:row.version,usuarioNombre:row.usuarioNombre,registroCajaId:row.registroCajaId,original,actual,esGastoOperativo:actual.categoria!=='COMPRA_INVENTARIO',revisionHash:digest({row,corrections,linked}),correcciones:corrections.map((c:any)=>({id:c.id,version:c.version,motivo:c.motivo,usuarioNombre:c.usuarioNombre,fecha:c.fecha,anterior:JSON.parse(c.anteriorJson),actual:JSON.parse(c.actualJson)}))};
}
async function cashDelta(tx:any,access:any,branch:string,amount:number,concept:string){
 const cut=await openShift(tx,access,branch,true);
 if(await drawerBalance(tx,access,cut)+amount<0)fail('INSUFFICIENT_DRAWER','El gasto excede el efectivo disponible en caja.');
 // Positive compensation remains a signed expense: it reverses expense totals without inventing income.
 await tx.movimientoCaja.create({data:{tenantId:access.tenantId,sucursalId:branch,corteCajaId:cut.id,tipo:'GASTO_MENOR',monto:-amount/100,concepto:concept,usuarioEmail:access.email}});
 return recordCash(tx,access,{sucursalId:branch,corteCajaId:cut.id,tipo:'GASTO_MENOR',metodoPago:'EFECTIVO',monto:amount/100,concepto:concept});
}
export async function listExpenses(access:any,input:any){
 commercialBranch(access,input.sucursalId,true);
 const rows=await prisma.gastoOperativo.findMany({where:{tenantId:access.tenantId,sucursalId:input.sucursalId},orderBy:{fecha:'desc'},take:500});
 return Promise.all(rows.map(row=>expenseView(prisma,row)));
}
export async function expenseCashOutflows(access:any,input:any){
 commercialBranch(access,input.sucursalId,true);
 const scope={tenantId:access.tenantId,sucursalId:input.sucursalId};
 const [rows,expenses,corrections]=await Promise.all([prisma.registroCaja.findMany({where:{...scope,tipo:'GASTO_MENOR',metodoPago:'EFECTIVO',custodiaUsuarioId:null,monto:{lt:0}},orderBy:{fecha:'desc'}}),prisma.gastoOperativo.findMany({where:scope}),prisma.correccionGasto.findMany({where:scope})]);
 const linked=new Set([...expenses,...corrections].map(r=>r.registroCajaId));
 return rows.filter(r=>!linked.has(r.id)).map(r=>({id:r.id,fecha:r.fecha,concepto:r.concepto,importe:-Number(r.monto),corteCajaId:r.corteCajaId}));
}
export async function registerExpense(access:any,input:any){
 return commercialOperation(access,{...input,operacion:'GASTO_REGISTRAR'},async tx=>{
  const value=await normalize(tx,access,input);let cash:any=null;
  if(input.registroCajaId!=null){
   if(typeof input.registroCajaId!=='string'||value.metodoPago!=='EFECTIVO')fail('INVALID_CASH_LINK','Solo puedes vincular una salida de efectivo existente.');
   cash=await tx.registroCaja.findFirst({where:{id:input.registroCajaId,tenantId:access.tenantId,sucursalId:input.sucursalId,tipo:'GASTO_MENOR',metodoPago:'EFECTIVO',custodiaUsuarioId:null}});
   if(!cash||Number(cash.monto)!==-value.importe||cash.concepto.trim()!==value.concepto)fail('INVALID_CASH_LINK','La salida de caja debe coincidir en sucursal, concepto e importe.');
   if(await tx.gastoOperativo.findFirst({where:{registroCajaId:cash.id}})||await tx.correccionGasto.findFirst({where:{registroCajaId:cash.id}}))fail('EXPENSE_ALREADY_LINKED','Esta salida ya tiene un gasto o corrección registrado.',409);
  }else if(value.metodoPago==='EFECTIVO')cash=await cashDelta(tx,access,input.sucursalId,-cents(value.importe),value.concepto);
  const row=await tx.gastoOperativo.create({data:{tenantId:access.tenantId,sucursalId:input.sucursalId,...value,fecha:new Date(value.fecha),usuarioId:access.userId,usuarioNombre:access.email,registroCajaId:cash?.id||null}});
  await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'GASTO_REGISTRADO',detalles:JSON.stringify({gastoId:row.id,sucursalId:input.sucursalId,importe:value.importe,categoria:value.categoria,metodoPago:value.metodoPago,registroCajaId:cash?.id||null})}});
  return expenseView(tx,row);
 },true);
}
export async function correctExpense(access:any,id:string,input:any){
 return commercialOperation(access,{...input,gastoId:id,operacion:'GASTO_CORREGIR'},async tx=>{
  const row=await tx.gastoOperativo.findFirst({where:{id,tenantId:access.tenantId,sucursalId:input.sucursalId}});if(!row)fail('EXPENSE_NOT_FOUND','Gasto no disponible.',404);
  const current=await expenseView(tx,row);
  if(input.versionEsperada!==row.version||input.revisionHash!==current.revisionHash)fail('EXPENSE_STALE','El gasto o su evidencia cambió. Actualiza antes de corregir.',409);
  const motive=text(input.motivo,500,true),next=await normalize(tx,access,input);
  if(input.registroCajaId!=null)fail('INVALID_CASH_LINK','Una corrección conserva el vínculo original.');
  const oldCash=current.actual.metodoPago==='EFECTIVO'?cents(current.actual.importe):0,newCash=next.metodoPago==='EFECTIVO'?cents(next.importe):0;
  const adjustment=oldCash!==newCash?await cashDelta(tx,access,input.sucursalId,oldCash-newCash,`Corrección de gasto ${id}: ${motive}`):null;
  await tx.correccionGasto.create({data:{tenantId:access.tenantId,sucursalId:input.sucursalId,gastoId:id,version:row.version+1,registroCajaId:adjustment?.id||null,anteriorJson:JSON.stringify(current.actual),actualJson:JSON.stringify(next),motivo:motive,usuarioId:access.userId,usuarioNombre:access.email}});
  await tx.gastoOperativo.update({where:{id},data:{version:row.version+1}});
  await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'GASTO_CORREGIDO',detalles:JSON.stringify({gastoId:id,sucursalId:input.sucursalId,version:row.version+1,motivo:motive,anterior:current.actual,actual:next})}});
  return expenseView(tx,{...row,version:row.version+1});
 },true);
}

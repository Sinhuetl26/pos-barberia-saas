import { digest, financialTransaction, branchLock } from './cash-ledger.service';
import { SaleError } from './financial-error';

export function commercialBranch(access:any,branch:any,admin=false){
 if(typeof branch!=='string'||!(admin?['DUENO','GERENTE']:['DUENO','GERENTE','CAJERO','BARBERO']).includes(access.rol)||access.branchIds!==null&&!access.branchIds.includes(branch))throw new SaleError(403,'SIN_PERMISO','Sucursal no disponible para esta acción.');
}
export async function commercialOperation(access:any,input:any,action:(tx:any)=>Promise<any>,admin=false){
 commercialBranch(access,input.sucursalId,admin);
 if(typeof input.idempotencyKey!=='string'||!/^[a-zA-Z0-9._:-]{1,128}$/.test(input.idempotencyKey))throw new SaleError(400,'KEY_REQUIRED','Conserva una intención de reintento para esta operación.');
 const hash=digest({...input,actor:access.userId,tenantId:access.tenantId});
 return financialTransaction(async tx=>{
  await branchLock(tx,access,input.sucursalId);
  const old=await tx.operacionAgenda.findFirst({where:{tenantId:access.tenantId,clave:input.idempotencyKey}});
  if(old){if(old.requestHash!==hash)throw new SaleError(409,'IDEMPOTENCY_CONFLICT','La intención corresponde a otros datos.');return {...JSON.parse(old.respuesta!),replayed:true};}
  const operation=await tx.operacionAgenda.create({data:{tenantId:access.tenantId,clave:input.idempotencyKey,requestHash:hash}});
  const result={...await action(tx),replayed:false,idempotencyKey:input.idempotencyKey};
  await tx.operacionAgenda.update({where:{id:operation.id},data:{respuesta:JSON.stringify(result)}});return result;
 });
}

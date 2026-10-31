import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';
import { cashSummary, digest } from './cash-ledger.service';
import { SaleError } from './financial-error';

const audience='systech-cash-close-preview-v1';
export const CLOSE_PREVIEW_SECONDS=300;
async function proof(tx:any,access:any,cut:any,count:number,notes:string){
 const rows=await tx.registroCaja.findMany({where:{tenantId:access.tenantId,sucursalId:cut.sucursalId},orderBy:{id:'asc'},select:{id:true,corteCajaId:true,ventaId:true,tipo:true,metodoPago:true,monto:true,custodiaUsuarioId:true,usuarioId:true,fecha:true}});
 const sales=await tx.venta.findMany({where:{tenantId:access.tenantId,sucursalId:cut.sucursalId,corteCajaId:cut.id},orderBy:{id:'asc'},select:{id:true,total:true,totalDevuelto:true,propina:true,propinaDevuelta:true,estado:true,cobradoPorId:true}});
 return digest({tenantId:access.tenantId,actor:access.userId,cut:{id:cut.id,estado:cut.estado,fondoInicial:cut.fondoInicial,fechaApertura:cut.fechaApertura},count,notes,rows,sales});
}
export async function makeClosePreview(tx:any,access:any,cut:any,count:number,notes:string){
 if(cut.estado!=='ABIERTO')throw new SaleError(409,'CASH_CLOSED','Esta caja ya se cerró.');
 const summary=await cashSummary(tx,access,cut,count),fingerprint=await proof(tx,access,cut,count,notes);
 const token=jwt.sign({tenantId:access.tenantId,actor:access.userId,corteId:cut.id,fingerprint},JWT_SECRET,{algorithm:'HS256',audience,expiresIn:CLOSE_PREVIEW_SECONDS});
 return {corteId:cut.id,resumen:summary,conteoDeclarado:count/100,notasCierre:notes,previsualizacionToken:token,expiraEn:new Date(Date.now()+CLOSE_PREVIEW_SECONDS*1000).toISOString(),lectura:true};
}
export async function verifyClosePreview(tx:any,access:any,cut:any,count:number,notes:string,token:unknown){
 let payload:any;
 try{if(typeof token!=='string')throw new Error();payload=jwt.verify(token,JWT_SECRET,{algorithms:['HS256'],audience});}catch{throw new SaleError(409,'CASH_PREVIEW_EXPIRED','La comparación expiró o no es válida. Revisa el conteo nuevamente.');}
 if(payload.tenantId!==access.tenantId||payload.actor!==access.userId||payload.corteId!==cut.id||payload.fingerprint!==await proof(tx,access,cut,count,notes))throw new SaleError(409,'CASH_PREVIEW_CHANGED','La caja, entregas o conteo cambió después de compararlo. Revisa nuevamente antes de cerrar.');
}

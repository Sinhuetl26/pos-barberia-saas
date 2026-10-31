import { prisma, Prisma } from '@systech/database';
import { SaleError } from './financial-error';
import { stockQuantity } from './inventory-quantity.service';

/** Read-only diagnosis: a stock difference is evidence to review, never blame. */
export async function reconcileSupplies(access: any, input: any) {
  if (!['DUENO','GERENTE'].includes(access.rol)) throw new SaleError(403,'SIN_PERMISO','Conciliación no disponible.');
  if(typeof input.sucursalId!=='string'||access.branchIds!==null&&!access.branchIds.includes(input.sucursalId))throw new SaleError(403,'SIN_PERMISO','Elige una sucursal autorizada.');
  const branch=await prisma.sucursal.findFirst({where:{id:input.sucursalId,tenantId:access.tenantId,eliminadoEn:null}});
  if(!branch)throw new SaleError(404,'INVALID_BRANCH','Sucursal no disponible.');
  const tolerance=input.tolerancia===undefined?new Prisma.Decimal(0):stockQuantity(input.tolerancia,'ML',true);
  const products=await prisma.producto.findMany({where:{tenantId:access.tenantId,naturaleza:'INSUMO',tipo:'PRODUCTO',eliminadoEn:null,OR:[{sucursalId:branch.id},...(access.rol==='DUENO'?[{sucursalId:null}]:[])]},take:500,orderBy:{nombre:'asc'}});
  const counts=await prisma.conteoInventario.findMany({where:{tenantId:access.tenantId,sucursalId:branch.id},orderBy:{fecha:'desc'},take:500});
  const result=[];
  for(const product of products){
    const moves=await prisma.kardexMovimiento.findMany({where:{tenantId:access.tenantId,productoId:product.id}});
    const terms:Record<string,Prisma.Decimal>={entradas:new Prisma.Decimal(0),devolucionesFisicas:new Prisma.Decimal(0),ventas:new Prisma.Decimal(0),consumoServicios:new Prisma.Decimal(0),mermas:new Prisma.Decimal(0),usoInterno:new Prisma.Decimal(0),correcciones:new Prisma.Decimal(0)};
    let ledger=new Prisma.Decimal(0);
    for(const move of moves){
      const q=new Prisma.Decimal(move.cantidad);ledger=ledger.plus(q);
      const term=move.tipoMovimiento==='ENTRADA_COMPRA'?'entradas':move.tipoMovimiento==='DEVOLUCION_VENTA'?'devolucionesFisicas':move.tipoMovimiento==='VENTA_POS'?'ventas':move.tipoMovimiento==='CONSUMO_SERVICIO'?'consumoServicios':move.tipoMovimiento==='MERMA_DEVOLUCION'?'mermas':move.tipoMovimiento==='USO_INTERNO'?'usoInterno':'correcciones';
      terms[term]=terms[term].plus(q);
    }
    const complete=moves.length>0&&ledger.equals(product.stockActual)&&moves.some(m=>new Prisma.Decimal(m.stockAnterior).equals(0));
    const count=counts.find(c=>JSON.parse(c.itemsJson).some((i:any)=>i.productoId===product.id&&i.cantidadContada!==null));
    const line=count?JSON.parse(count.itemsJson).find((i:any)=>i.productoId===product.id):null;
    const difference=line?new Prisma.Decimal(line.cantidadContada).minus(line.stockReferencia):null;
    result.push({productoId:product.id,nombre:product.nombre,unidad:product.unidad,saldoActual:Number(product.stockActual),saldoEsperado:complete?ledger.toNumber():null,formula:Object.fromEntries(Object.entries(terms).map(([k,v])=>[k,v.toNumber()])),informacionSuficiente:complete,estado:!complete?'INFORMACION_INSUFICIENTE':!count?'SIN_CONTEO':count.estado==='CONFIRMADO'?'CONCILIADO':'PENDIENTE',mensaje:!complete?'No hay información suficiente para conciliar el saldo histórico.':!count?'Realiza un conteo físico para comparar.':'La diferencia representa el conteo indicado; revisa movimientos y método de medición.',ultimoConteo:count?{id:count.id,fecha:count.fecha,estado:count.estado,saldoReferencia:line.stockReferencia,cantidadContada:line.cantidadContada,diferencia:difference!.toNumber(),diferenciaAbsoluta:difference!.abs().toNumber(),tolerancia:tolerance.toNumber(),fueraTolerancia:difference!.abs().greaterThan(tolerance),unidad:product.unidad}:null});
  }
  return {sucursalId:branch.id,metodo:'Cantidad en unidad base; frascos abiertos requieren medición y tolerancia física elegida. No diagnostica robo ni responsabilidad individual.',productos:result};
}

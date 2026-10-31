import { prisma, Prisma } from '@systech/database';
import { SaleError } from './financial-error';
import { inventoryOperation } from './inventory-ledger.service';
import { stockQuantity, checkedStock } from './inventory-quantity.service';

function fail(code: string, message: string, status = 400): never { throw new SaleError(status, code, message); }
export async function serviceRecipes(access: any, serviceId: string) {
  const service = await prisma.producto.findFirst({ where: { id: serviceId, tenantId: access.tenantId, tipo: 'SERVICIO', eliminadoEn: null } });
  if (!service) fail('NOT_FOUND', 'Servicio no disponible.', 404);
  return (await prisma.recetaServicio.findMany({ where: { tenantId: access.tenantId, servicioId: serviceId }, orderBy: { version: 'desc' }, take: 50 })).map(r => ({ ...r, items: JSON.parse(r.itemsJson), itemsJson: undefined }));
}
export async function publishRecipe(access: any, serviceId: string, input: any, key?: unknown) {
  if (!Array.isArray(input.items) || input.items.length > 50 || new Set(input.items.map((i: any) => i.productoId)).size !== input.items.length) fail('INVALID_RECIPE', 'Indica hasta 50 insumos distintos; receta vacía desactiva nuevos consumos.');
  if (!Number.isSafeInteger(input.versionEsperada) || input.versionEsperada < 0) fail('RECIPE_VERSION_REQUIRED', 'Consulta la versión actual antes de guardar.', 409);
  return inventoryOperation(access, 'PUBLICAR_RECETA', { servicioId: serviceId, versionEsperada: input.versionEsperada, items: input.items }, key ?? input.idempotencyKey, async tx => {
    await tx.$executeRaw`UPDATE "Producto" SET "id"="id" WHERE "id"=${serviceId} AND "tenantId"=${access.tenantId}`;
    const service = await tx.producto.findFirst({ where: { id: serviceId, tenantId: access.tenantId, tipo: 'SERVICIO', eliminadoEn: null } });
    if (!service || !service.sucursalId && access.rol !== 'DUENO') fail('NOT_FOUND', 'Servicio no disponible.', 404);
    const latest = await tx.recetaServicio.findFirst({ where: { tenantId: access.tenantId, servicioId: serviceId }, orderBy: { version: 'desc' } });
    if ((latest?.version || 0) !== input.versionEsperada) fail('RECIPE_CHANGED', 'La receta cambió; vuelve a consultar.', 409);
    const prepared = [];
    for (const item of input.items) {
      if (typeof item.productoId !== 'string') fail('INVALID_RECIPE', 'Insumo requerido.');
      const product = await tx.producto.findFirst({ where: { id: item.productoId, tenantId: access.tenantId, tipo: 'PRODUCTO', naturaleza: 'INSUMO', eliminadoEn: null } });
      if (!product || product.sucursalId && service.sucursalId !== product.sucursalId) fail('INVALID_SUPPLY', 'Insumo no disponible para este servicio.');
      if (item.unidad !== product.unidad) fail('UNIT_MISMATCH', 'La receta debe usar la unidad base del insumo.');
      const quantity = stockQuantity(item.cantidad, product.unidad);
      prepared.push({ productoId: product.id, nombre: product.nombre, unidad: product.unidad, cantidad: quantity.toNumber() });
    }
    const recipe = await tx.recetaServicio.create({ data: { tenantId: access.tenantId, servicioId: serviceId, version: (latest?.version || 0) + 1, usuarioId: access.userId, itemsJson: JSON.stringify(prepared) } });
    await tx.auditoriaLog.create({ data: { tenantId: access.tenantId, usuarioEmail: access.email, accion: 'RECETA_PUBLICADA', detalles: JSON.stringify({ servicioId: serviceId, version: recipe.version, insumos: prepared.length }) } });
    return { ...recipe, items: prepared, itemsJson: undefined };
  });
}
/** Called inside the attendance/sale transaction. A visit has one durable event. */
export async function consumeServiceSupplies(tx: any, access: any, input: { sucursalId: string; citaId?: string; ventaId?: string; servicios: { productoId: string; cantidad: number }[] }) {
  const event = input.citaId ? `CITA:${input.citaId}` : `VENTA:${input.ventaId}`;
  if (!input.citaId && !input.ventaId) fail('INVALID_CONSUMPTION_EVENT', 'Atención no identificada.');
  const prepared: any[] = [];
  for (const service of [...input.servicios].sort((a, b) => a.productoId.localeCompare(b.productoId))) {
    await tx.$executeRaw`UPDATE "Producto" SET "id"="id" WHERE "id"=${service.productoId} AND "tenantId"=${access.tenantId}`;
    const previous = await tx.consumoServicio.findFirst({ where: { tenantId: access.tenantId, eventoClave: event, servicioId: service.productoId } });
    if (previous) continue;
    const recipe = await tx.recetaServicio.findFirst({ where: { tenantId: access.tenantId, servicioId: service.productoId }, orderBy: { version: 'desc' } });
    // Record even a missing recipe as version 0: changing it after a completed
    // visit must not retroactively consume stock when its payment is collected.
    prepared.push({ service, recipe, items: recipe ? JSON.parse(recipe.itemsJson) : [] });
  }
  const supplyIds = [...new Set<string>(prepared.flatMap(p => p.items.map((i: any) => i.productoId)))].sort();
  for (const id of supplyIds) await tx.$executeRaw`UPDATE "Producto" SET "id"="id" WHERE "id"=${id} AND "tenantId"=${access.tenantId}`;
  for (const { service, recipe, items } of prepared) {
    const snapshots = [];
    for (const item of items) {
      const supply = await tx.producto.findFirst({ where: { id: item.productoId, tenantId: access.tenantId, naturaleza: 'INSUMO', tipo: 'PRODUCTO', eliminadoEn: null } });
      if (!supply || supply.sucursalId && supply.sucursalId !== input.sucursalId || supply.unidad !== item.unidad) fail('INVALID_SUPPLY', 'La receta contiene un insumo no disponible.');
      const quantity = stockQuantity(item.cantidad, supply.unidad).times(service.cantidad);
      const before = new Prisma.Decimal(supply.stockActual), after = checkedStock(before.minus(quantity));
      const changed = await tx.producto.updateMany({ where: { id: supply.id, tenantId: access.tenantId, stockActual: before }, data: { stockActual: after } });
      if (changed.count !== 1) fail('SUPPLY_CHANGED', 'El saldo del insumo cambió; reintenta la atención.', 409);
      const cost = new Prisma.Decimal(supply.costo || 0);
      snapshots.push({ productoId: supply.id, nombre: supply.nombre, unidad: supply.unidad, cantidad: quantity.toNumber(), costoUnitario: cost.toString(), costoTotal: cost.times(quantity).toString(), costoConocido: supply.costo !== null && cost.greaterThan(0) });
      await tx.kardexMovimiento.create({ data: { tenantId: access.tenantId, sucursalId: input.sucursalId, productoId: supply.id, tipoMovimiento: 'CONSUMO_SERVICIO', cantidad: quantity.negated(), stockAnterior: before, stockNuevo: after, motivo: `Consumo ${event}`, usuarioId: access.userId, metadataJson: JSON.stringify({ version: 1, evento: event, recetaVersion: recipe.version, servicioId: service.productoId, unidad: supply.unidad, costoUnitario: cost.toString(), costoTotal: cost.times(quantity).toString() }) } });
    }
    await tx.consumoServicio.create({ data: { tenantId: access.tenantId, sucursalId: input.sucursalId, servicioId: service.productoId, eventoClave: event, recetaVersion: recipe?.version || 0, itemsJson: JSON.stringify(snapshots), citaId: input.citaId || null, ventaId: input.ventaId || null, usuarioId: access.userId } });
  }
}

/** Explicit correction of recorded physical use; monetary refunds never call it. */
export async function correctServiceConsumption(access: any, id: string, input: any, key?: unknown) {
  if(typeof input.motivo!=='string'||input.motivo.trim().length<3||input.motivo.length>500)fail('REASON_REQUIRED','Explica la corrección de consumo.');
  if(!Number.isSafeInteger(input.versionEsperada)||input.versionEsperada<0||!Array.isArray(input.items)||!input.items.length||input.items.length>50||new Set(input.items.map((i:any)=>i.productoId)).size!==input.items.length)fail('INVALID_CORRECTION','Indica versión y cantidades físicas reales sin duplicados.');
  return inventoryOperation(access,'CORREGIR_CONSUMO',{id,versionEsperada:input.versionEsperada,motivo:input.motivo.trim(),items:input.items},key??input.idempotencyKey,async tx=>{
    await tx.$executeRaw`UPDATE "ConsumoServicio" SET "id"="id" WHERE "id"=${id} AND "tenantId"=${access.tenantId}`;
    const event=await tx.consumoServicio.findFirst({where:{id,tenantId:access.tenantId}});
    if(!event||access.branchIds!==null&&!access.branchIds.includes(event.sucursalId))fail('NOT_FOUND','Consumo no disponible.',404);
    const history=await tx.auditoriaLog.findMany({where:{tenantId:access.tenantId,accion:'CORRECCION_CONSUMO'},orderBy:{fecha:'asc'}});
    const corrections=history.map((log:any)=>JSON.parse(log.detalles)).filter((v:any)=>v.consumoId===id).sort((a:any,b:any)=>a.version-b.version);
    const version=corrections.at(-1)?.version||0;
    if(version!==input.versionEsperada)fail('CONSUMPTION_CHANGED','El consumo tuvo otra corrección. Vuelve a consultarlo.',409);
    const current=corrections.at(-1)?.items||JSON.parse(event.itemsJson);
    const updated=current.map((item:any)=>({...item}));
    for(const patch of [...input.items].sort((a:any,b:any)=>String(a.productoId).localeCompare(String(b.productoId)))){
      const item=updated.find((i:any)=>i.productoId===patch.productoId);
      if(!item)fail('INVALID_SUPPLY','Solo puedes corregir insumos registrados en esa atención.');
      const actual=stockQuantity(patch.cantidadReal,item.unidad,true);
      await tx.$executeRaw`UPDATE "Producto" SET "id"="id" WHERE "id"=${item.productoId} AND "tenantId"=${access.tenantId}`;
      const product=await tx.producto.findFirst({where:{id:item.productoId,tenantId:access.tenantId,eliminadoEn:null}});
      if(!product||product.unidad!==item.unidad)fail('INVALID_SUPPLY','Insumo no disponible.');
      const delta=new Prisma.Decimal(item.cantidad).minus(actual),before=new Prisma.Decimal(product.stockActual),after=checkedStock(before.plus(delta));
      if(!delta.isZero()){
        await tx.producto.update({where:{id:product.id},data:{stockActual:after}});
        await tx.kardexMovimiento.create({data:{tenantId:access.tenantId,sucursalId:event.sucursalId,productoId:product.id,tipoMovimiento:'CORRECCION_CONSUMO',cantidad:delta,stockAnterior:before,stockNuevo:after,motivo:input.motivo.trim(),usuarioId:access.userId,metadataJson:JSON.stringify({version:1,consumoId:id,correccionVersion:version+1,unidad:item.unidad,cantidadAnterior:item.cantidad,cantidadReal:actual.toNumber(),costoUnitario:item.costoUnitario})}});
      }
      item.cantidad=actual.toNumber();item.costoTotal=new Prisma.Decimal(item.costoUnitario).times(actual).toString();
    }
    const result={consumoId:id,sucursalId:event.sucursalId,version:version+1,items:updated,motivo:input.motivo.trim()};
    await tx.auditoriaLog.create({data:{tenantId:access.tenantId,usuarioEmail:access.email,accion:'CORRECCION_CONSUMO',detalles:JSON.stringify(result)}});
    return result;
  });
}

export async function consumptionHistory(access:any,branchId:string){
  if(!['DUENO','GERENTE'].includes(access.rol)||access.branchIds!==null&&!access.branchIds.includes(branchId))fail('SIN_PERMISO','Consumos no disponibles.',403);
  const events=await prisma.consumoServicio.findMany({where:{tenantId:access.tenantId,sucursalId:branchId},orderBy:{fecha:'desc'},take:100});
  const logs=await prisma.auditoriaLog.findMany({where:{tenantId:access.tenantId,accion:'CORRECCION_CONSUMO'},orderBy:{fecha:'asc'}});
  return events.map(event=>{const corrections=logs.map(log=>JSON.parse(log.detalles)).filter(log=>log.consumoId===event.id).sort((a,b)=>a.version-b.version);return {...event,itemsJson:undefined,items:JSON.parse(event.itemsJson),version:corrections.at(-1)?.version||0,itemsActuales:corrections.at(-1)?.items||JSON.parse(event.itemsJson),correcciones:corrections};});
}

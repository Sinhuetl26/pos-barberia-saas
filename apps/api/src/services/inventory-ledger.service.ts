import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '@systech/database';
import { SaleError } from './financial-error';
import { stockQuantity, inventoryUnitCost, presentationQuantity } from './inventory-quantity.service';

type InventoryAccess = { tenantId: string; userId: string; email: string; rol: string; branchIds: string[] | null };
const fail = (status: number, code: string, message: string): never => { throw new SaleError(status, code, message); };
const integer = (value: any, field: string, zero = false) => {
  const n = Number(value);
  if (!['number', 'string'].includes(typeof value) || typeof value === 'string' && !value.trim() || !Number.isSafeInteger(n) || n < (zero ? 0 : 1) || n > 1_000_000)
    fail(400, 'INVALID_QUANTITY', `${field} debe ser una cantidad entera válida en piezas.`);
  return n;
};
const money = (value: any) => {
  const n = Number(value);
  if (!['number', 'string'].includes(typeof value) || typeof value === 'string' && !value.trim() || !Number.isFinite(n) || n < 0 || n > 1_000_000_000 || Math.abs(n * 100 - Math.round(n * 100)) > 0.00001)
    fail(400, 'INVALID_COST', 'Costo inválido; admite hasta dos decimales.');
  return n;
};
const text = (value: any, field: string, maximum = 500) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > maximum) fail(400, 'INVALID_METADATA', `${field} inválido.`);
  return value.trim() || null;
};
function assertRole(access: InventoryAccess) {
  if (!['DUENO', 'GERENTE'].includes(access.rol)) fail(403, 'SIN_PERMISO', 'Solo dueño o gerente pueden modificar inventario.');
}
async function branchFor(tx: any, access: InventoryAccess, id?: string | null) {
  if (access.rol === 'GERENTE' && (!id || !access.branchIds?.includes(id))) fail(403, 'SIN_PERMISO', 'Elige una sucursal asignada.');
  const branch = await tx.sucursal.findFirst({ where: { tenantId: access.tenantId, eliminadoEn: null, ...(id ? { id } : {}) }, orderBy: { id: 'asc' } });
  if (!branch) fail(400, 'INVALID_BRANCH', 'Se requiere una sucursal activa para registrar stock.');
  return branch;
}
// Atomic intention + product/ledger + audit. Compatible legacy requests get a
// server key, but cannot recover a lost response; updated UIs must supply one.
export async function inventoryOperation(access: InventoryAccess, kind: string, input: any, suppliedKey: unknown, action: (tx: any) => Promise<any>) {
  assertRole(access);
  if (suppliedKey !== undefined && (typeof suppliedKey !== 'string' || !/^[\w:.-]{1,160}$/.test(suppliedKey))) fail(400, 'INVALID_IDEMPOTENCY_KEY', 'Identificador de intención inválido.');
  const key = suppliedKey as string || randomUUID();
  const hash = createHash('sha256').update(JSON.stringify({ tenantId: access.tenantId, userId: access.userId, kind, input })).digest('hex');
  const replay = async () => {
    const previous = await prisma.inventarioOperacion.findFirst({ where: { tenantId: access.tenantId, clave: key } });
    if (!previous) return null;
    if (previous.requestHash !== hash) fail(409, 'IDEMPOTENCY_CONFLICT', 'La intención corresponde a otros datos o responsable. Inicia una operación nueva.');
    if (!previous.respuesta) fail(409, 'OPERATION_PENDING', 'La operación todavía no tiene resultado; reintenta la misma intención.');
    return { ...JSON.parse(previous.respuesta!), replayed: true, idempotencyKey: key };
  };
  const previous = await replay(); if (previous) return previous;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const operation = await tx.inventarioOperacion.create({ data: { tenantId: access.tenantId, clave: key, requestHash: hash } });
        const result = { ...await action(tx), replayed: false, idempotencyKey: key };
        await tx.inventarioOperacion.update({ where: { id: operation.id }, data: { respuesta: JSON.stringify(result) } });
        return result;
      }, { maxWait: 15000, timeout: 20000 });
    } catch (error: any) {
      if (error instanceof SaleError) throw error;
      if (error.code === 'P2002') { const cached = await replay(); if (cached) return cached; }
      const retryable = ['P2034', 'P2002'].includes(error.code) || ['P2028', 'P1008'].includes(error.code) && /locked|write conflict|timed out|expired/i.test(error.message);
      if (!retryable || attempt === 5) {
        if (retryable) fail(503, 'INVENTORY_BUSY', 'Inventario ocupado; reintenta conservando la misma intención.');
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
  return fail(503, 'INVENTORY_BUSY', 'Inventario ocupado.');
}
export async function createInventoryProduct(access: InventoryAccess, data: any, key?: unknown) {
  const unit = data.unidad || 'PIEZA';
  const input = { sucursalId: data.sucursalId || null, nombre: data.nombre.trim(), imagen: data.imagen || null, tipo: data.tipo || 'PRODUCTO', naturaleza: data.naturaleza || 'REVENTA', unidad: unit, presentacionNombre: text(data.presentacionNombre,'Presentación',100), presentacionCantidad: stockQuantity(data.presentacionCantidad ?? 1,unit).toNumber(), categoria: data.categoria || 'General', duracionMinutos: data.duracionMinutos ?? 30, sku: text(data.sku, 'SKU', 100), precioVenta: money(data.precioVenta), costo: inventoryUnitCost(data.costo ?? 0).toNumber(), stockActual: stockQuantity(data.stockActual ?? 0,unit,true).toNumber(), stockMinimo: stockQuantity(data.stockMinimo ?? 0,unit,true).toNumber(), tasaImpuesto: data.tasaImpuesto ?? 0 };
  if(input.naturaleza==='REVENTA'&&unit!=='PIEZA'||input.tipo==='SERVICIO'&&input.naturaleza!=='REVENTA')fail(400,'INVALID_UNIT','Productos de reventa y servicios mantienen piezas; ml/g son insumos.');
  if (input.tipo === 'SERVICIO' && (input.stockActual || input.stockMinimo)) fail(400, 'INVALID_PRODUCT_TYPE', 'Los servicios no tienen stock físico.');
  return inventoryOperation(access, 'ALTA_PRODUCTO', input, key, async tx => {
    // Serialize duplicate SKU validation without making old duplicated catalogs
    // impossible to migrate. New SKUs are tenant-scoped and case insensitive.
    await tx.$executeRaw`UPDATE "Tenant" SET "id"="id" WHERE "id"=${access.tenantId}`;
    if (input.sku) {
      // Check tenant-wide uniqueness even for a branch-limited manager; no
      // foreign catalog data is returned. Prisma read scoping alone would
      // hide another branch's duplicate SKU during this invariant check.
      const duplicates = await tx.$queryRaw`SELECT COUNT(*) AS "count" FROM "Producto" WHERE "tenantId"=${access.tenantId} AND "eliminadoEn" IS NULL AND lower("sku")=lower(${input.sku})`;
      if (Number(duplicates[0].count)) fail(409, 'SKU_EXISTS', 'Ese SKU ya está en el catálogo de la barbería.');
    }
    const branch = input.sucursalId || input.stockActual > 0 || access.rol === 'GERENTE' ? await branchFor(tx, access, input.sucursalId) : null;
    const producto = await tx.producto.create({ data: { ...input, tenantId: access.tenantId, sku: input.sku || `${input.tipo === 'PRODUCTO' ? 'PRD' : 'SRV'}-${randomUUID()}` } });
    if (input.stockActual > 0) await tx.kardexMovimiento.create({ data: { tenantId: access.tenantId, sucursalId: branch.id, productoId: producto.id, tipoMovimiento: 'ENTRADA_COMPRA', cantidad: input.stockActual, stockAnterior: 0, stockNuevo: input.stockActual, motivo: 'Inventario inicial', usuarioId: access.userId,
      metadataJson: JSON.stringify({ version: 1, origen: 'ALTA_INICIAL', unidad: input.unidad, costoUnitario: input.costo, usuarioNombre: access.email, saldoCompartido: !input.sucursalId }) } });
    await tx.auditoriaLog.create({ data: { tenantId: access.tenantId, usuarioEmail: access.email, accion: 'ALTA_PRODUCTO', detalles: JSON.stringify({ productoId: producto.id, sucursalId: input.sucursalId, stockInicial: input.stockActual }) } });
    return producto;
  });
}
export async function moveInventory(access: InventoryAccess, data: any, key?: unknown) {
  const allowed = ['ENTRADA_COMPRA', 'MERMA_DEVOLUCION', 'AJUSTE_INVENTARIO', 'USO_INTERNO'];
  if (!allowed.includes(data.tipoMovimiento)) fail(400, 'INVALID_TYPE', 'Tipo de movimiento inválido.');
  const date = data.fechaOperacion === undefined ? null : new Date(data.fechaOperacion);
  if (date && (typeof data.fechaOperacion !== 'string' || !Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 60000)) fail(400, 'INVALID_DATE', 'Fecha de operación inválida o futura.');
  const input = { productoId: text(data.productoId, 'Producto', 100), sucursalId: text(data.sucursalId, 'Sucursal', 100), tipoMovimiento: data.tipoMovimiento, cantidad: stockQuantity(data.cantidad,'ML',data.tipoMovimiento==='AJUSTE_INVENTARIO').toNumber(), cantidadPresentaciones: data.cantidadPresentaciones===undefined?null:stockQuantity(data.cantidadPresentaciones,'ML').toNumber(), motivo: text(data.motivo, 'Motivo'), stockEsperado: data.stockEsperado === undefined ? null : stockQuantity(data.stockEsperado,'ML',true).toNumber(), costoUnitario: data.costoUnitario === undefined ? null : inventoryUnitCost(data.costoUnitario).toNumber(), proveedorId: text(data.proveedorId, 'Proveedor', 100), referencia: text(data.referencia, 'Referencia', 160), fechaOperacion: date?.toISOString() || null };
  if (!input.productoId) fail(400, 'INVALID_PRODUCT', 'Producto requerido.');
  if (input.tipoMovimiento === 'AJUSTE_INVENTARIO' && input.stockEsperado === null) fail(409, 'STOCK_REFERENCE_REQUIRED', 'Vuelve a consultar el saldo antes de ajustar inventario.');
  if (input.tipoMovimiento !== 'ENTRADA_COMPRA' && !input.motivo) fail(400, 'REASON_REQUIRED', 'Explica el motivo de la salida o corrección.');
  return inventoryOperation(access, 'MOVIMIENTO', input, key ?? data.idempotencyKey, async tx => {
    await tx.$executeRaw`UPDATE "Producto" SET "id"="id" WHERE "id"=${input.productoId} AND "tenantId"=${access.tenantId}`;
    const product = await tx.producto.findFirst({ where: { id: input.productoId, tenantId: access.tenantId, eliminadoEn: null } });
    if (!product) fail(404, 'NOT_FOUND', 'Producto no disponible.');
    if (product.tipo !== 'PRODUCTO') fail(400, 'INVALID_PRODUCT_TYPE', 'Los servicios no tienen movimientos físicos.');
    if (product.sucursalId && input.sucursalId && product.sucursalId !== input.sucursalId) fail(404, 'INVALID_BRANCH', 'Producto no disponible en esa sucursal.');
    if (!product.sucursalId && access.rol === 'GERENTE') fail(403, 'SIN_PERMISO', 'El saldo compartido requiere al dueño.');
    const branch = await branchFor(tx, access, product.sucursalId || input.sucursalId);
    if (input.proveedorId && !await tx.proveedor.findFirst({ where: { id: input.proveedorId, tenantId: access.tenantId } })) fail(404, 'INVALID_SUPPLIER', 'Proveedor no disponible.');
    const actualQuantity=input.cantidadPresentaciones!==null?presentationQuantity(input.cantidadPresentaciones,product.presentacionCantidad.toString(),product.unidad).toNumber():stockQuantity(input.cantidad,product.unidad,input.tipoMovimiento==='AJUSTE_INVENTARIO').toNumber();
    if(input.cantidadPresentaciones!==null&&input.tipoMovimiento!=='ENTRADA_COMPRA')fail(400,'INVALID_CONVERSION','La conversión por presentación solo se usa en entradas.');
    const before = Number(product.stockActual);
    if (input.stockEsperado !== null && input.stockEsperado !== before) fail(409, 'STOCK_CHANGED', 'El saldo cambió; revisa y confirma el ajuste nuevamente.');
    const after = Number((input.tipoMovimiento === 'ENTRADA_COMPRA' ? before + actualQuantity : input.tipoMovimiento === 'AJUSTE_INVENTARIO' ? actualQuantity : before - actualQuantity).toFixed(3));
    if (after < 0) fail(400, 'INSUFFICIENT_STOCK', 'Stock insuficiente para completar el movimiento.');
    if (after > 2_147_483_647) fail(400, 'STOCK_OVERFLOW', 'El saldo excede la capacidad del inventario.');
    const changed = await tx.producto.updateMany({ where: { id: product.id, tenantId: access.tenantId, stockActual: before }, data: { stockActual: after, ...(input.tipoMovimiento === 'ENTRADA_COMPRA' && input.costoUnitario !== null ? { costo: input.costoUnitario } : {}) } });
    if (changed.count !== 1) fail(409, 'STOCK_CHANGED', 'El saldo cambió; vuelve a consultar inventario.');
    const producto = await tx.producto.findFirstOrThrow({ where: { id: product.id, tenantId: access.tenantId } });
    const metadata = { version: 1, unidad: product.unidad, cantidadPresentaciones: input.cantidadPresentaciones, presentacionCantidad: Number(product.presentacionCantidad), costoUnitario: input.costoUnitario ?? Number(product.costo || 0), proveedorId: input.proveedorId, referencia: input.referencia, fechaOperacion: input.fechaOperacion, usuarioNombre: access.email, saldoCompartido: !product.sucursalId };
    const kardex = await tx.kardexMovimiento.create({ data: { tenantId: access.tenantId, sucursalId: branch.id, productoId: product.id, tipoMovimiento: input.tipoMovimiento, cantidad: after - before, stockAnterior: before, stockNuevo: after, motivo: input.motivo || 'Entrada de compra', usuarioId: access.userId, metadataJson: JSON.stringify(metadata) } });
    await tx.auditoriaLog.create({ data: { tenantId: access.tenantId, usuarioEmail: access.email, accion: 'MOVIMIENTO_INVENTARIO', detalles: JSON.stringify({ productoId: product.id, sucursalId: branch.id, kardexId: kardex.id, stockAnterior: before, stockNuevo: after, motivo: kardex.motivo }) } });
    return { producto, kardex };
  });
}

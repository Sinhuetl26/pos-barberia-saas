import { prisma } from '@systech/database';
import { createHash } from 'node:crypto';
import { SaleError } from './financial-error';
import { inventoryOperation } from './inventory-ledger.service';
import { stockQuantity } from './inventory-quantity.service';

type Access = { tenantId: string; userId: string; email: string; rol: string; branchIds: string[] | null };
const fail = (status: number, code: string, message: string): never => { throw new SaleError(status, code, message); };
const publicCount = (row: any) => ({ ...row, itemsJson: undefined, items: JSON.parse(row.itemsJson) });
function checkBranch(access: Access, branchId: string) {
  if (!['DUENO', 'GERENTE'].includes(access.rol) || access.branchIds !== null && !access.branchIds.includes(branchId)) fail(403, 'SIN_PERMISO', 'Conteo no disponible en esa sucursal.');
}
async function snapshot(tx: any, access: Access, branchId: string, productId: string) {
  const product = await tx.producto.findFirst({ where: { id: productId, tenantId: access.tenantId, eliminadoEn: null, tipo: 'PRODUCTO' } });
  if (!product || product.sucursalId && product.sucursalId !== branchId) fail(404, 'NOT_FOUND', 'Artículo no disponible en el conteo.');
  if (!product.sucursalId && access.rol !== 'DUENO') fail(403, 'SIN_PERMISO', 'El inventario compartido requiere al dueño.');
  const moves = await tx.kardexMovimiento.findMany({ where: { tenantId: access.tenantId, productoId: productId }, orderBy: [{ fecha: 'desc' }, { id: 'desc' }], select: { id: true } });
  // A fingerprint of all movements detects an intervening sale plus return,
  // even if the balance and last timestamp are unchanged.
  return { product, movementReference: createHash('sha256').update(moves.map((m: any) => m.id).sort().join('|')).digest('hex') };
}
export async function listInventoryCounts(access: Access, branchId?: string) {
  if (!['DUENO', 'GERENTE'].includes(access.rol)) fail(403, 'SIN_PERMISO', 'Conteos no disponibles.');
  if (branchId) checkBranch(access, branchId);
  const rows = await prisma.conteoInventario.findMany({ where: { tenantId: access.tenantId, ...(branchId ? { sucursalId: branchId } : access.branchIds !== null ? { sucursalId: { in: access.branchIds } } : {}) }, orderBy: { fecha: 'desc' }, take: 50 });
  return rows.map(publicCount);
}
export async function startInventoryCount(access: Access, input: any, key?: unknown) {
  if (typeof input.sucursalId !== 'string') fail(400, 'INVALID_BRANCH', 'Elige sucursal.');
  checkBranch(access, input.sucursalId);
  if (input.productoIds !== undefined && (!Array.isArray(input.productoIds) || input.productoIds.length > 500 || input.productoIds.some((id: any) => typeof id !== 'string'))) fail(400, 'INVALID_PRODUCTS', 'Selecciona hasta 500 artículos.');
  const normalized = { sucursalId: input.sucursalId, productoIds: input.productoIds ? [...new Set<string>(input.productoIds)].sort() : null };
  return inventoryOperation(access, 'INICIAR_CONTEO', normalized, key ?? input.idempotencyKey, async tx => {
    const branch = await tx.sucursal.findFirst({ where: { id: input.sucursalId, tenantId: access.tenantId, eliminadoEn: null } });
    if (!branch) fail(404, 'INVALID_BRANCH', 'Sucursal no disponible.');
    const products = await tx.producto.findMany({ where: { tenantId: access.tenantId, eliminadoEn: null, tipo: 'PRODUCTO', OR: [{ sucursalId: input.sucursalId }, ...(access.rol === 'DUENO' ? [{ sucursalId: null }] : [])], ...(normalized.productoIds ? { id: { in: normalized.productoIds } } : {}) }, orderBy: { id: 'asc' }, take: 501 });
    if (!products.length || products.length > 500 || normalized.productoIds && products.length !== normalized.productoIds.length) fail(400, 'INVALID_PRODUCTS', 'Selecciona entre 1 y 500 artículos disponibles.');
    const items = [];
    for (const product of products) {
      await tx.$executeRaw`UPDATE "Producto" SET "id"="id" WHERE "id"=${product.id} AND "tenantId"=${access.tenantId}`;
      const current = await snapshot(tx, access, input.sucursalId, product.id);
      items.push({ productoId: product.id, nombre: product.nombre, unidad: product.unidad, stockReferencia: Number(current.product.stockActual), movimientoReferencia: current.movementReference, cantidadContada: null });
    }
    const row = await tx.conteoInventario.create({ data: { tenantId: access.tenantId, sucursalId: input.sucursalId, usuarioId: access.userId, itemsJson: JSON.stringify(items) } });
    return publicCount(row);
  });
}
export async function saveInventoryCount(access: Access, id: string, input: any, key?: unknown) {
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 500) fail(400, 'INVALID_ITEMS', 'Indica los artículos contados.');
  if (new Set(input.items.map((i: any) => i.productoId)).size !== input.items.length) fail(400, 'DUPLICATE_ITEMS', 'Cada artículo se cuenta una sola vez.');
  if (!Number.isSafeInteger(input.versionEsperada) || input.versionEsperada < 0) fail(409, 'COUNT_VERSION_REQUIRED', 'Consulta el conteo antes de guardar.');
  return inventoryOperation(access, 'GUARDAR_CONTEO', { id, items: input.items, versionEsperada: input.versionEsperada }, key ?? input.idempotencyKey, async tx => {
    await tx.$executeRaw`UPDATE "ConteoInventario" SET "id"="id" WHERE "id"=${id} AND "tenantId"=${access.tenantId}`;
    const row = await tx.conteoInventario.findFirst({ where: { id, tenantId: access.tenantId } });
    if (!row) return fail(404, 'NOT_FOUND', 'Conteo no disponible.');
    checkBranch(access, row.sucursalId);
    if (row.estado !== 'BORRADOR') fail(409, 'COUNT_CONFIRMED', 'Este conteo ya fue confirmado.');
    if (row.version !== input.versionEsperada) fail(409, 'COUNT_CHANGED', 'Otro operador cambió el conteo. Vuelve a consultarlo.');
    const items = JSON.parse(row.itemsJson);
    for (const patch of [...input.items].sort((a, b) => String(a.productoId).localeCompare(String(b.productoId)))) {
      const item = items.find((i: any) => i.productoId === patch.productoId);
      if (!item) fail(404, 'NOT_FOUND', 'Artículo no disponible en el conteo.');
      if(patch.cantidadContada!==null)stockQuantity(patch.cantidadContada,item.unidad||'PIEZA',true);
      if (patch.recontar === true) {
        if (patch.cantidadContada === null) fail(400, 'RECOUNT_REQUIRED', 'Recaptura el conteo físico para actualizar la referencia.');
        await tx.$executeRaw`UPDATE "Producto" SET "id"="id" WHERE "id"=${item.productoId} AND "tenantId"=${access.tenantId}`;
        const now = await snapshot(tx, access, row.sucursalId, item.productoId);
        item.stockReferencia = Number(now.product.stockActual); item.movimientoReferencia = now.movementReference;
      }
      item.cantidadContada = patch.cantidadContada;
    }
    return publicCount(await tx.conteoInventario.update({ where: { id }, data: { itemsJson: JSON.stringify(items), version: { increment: 1 } } }));
  });
}
export async function confirmInventoryCount(access: Access, id: string, input: any, key?: unknown) {
  if (typeof input.motivo !== 'string' || input.motivo.trim().length < 3 || input.motivo.length > 500) fail(400, 'REASON_REQUIRED', 'Explica el motivo de la conciliación.');
  if (!Number.isSafeInteger(input.versionEsperada) || input.versionEsperada < 0) fail(409, 'COUNT_VERSION_REQUIRED', 'Consulta el conteo antes de confirmar.');
  return inventoryOperation(access, 'CONFIRMAR_CONTEO', { id, motivo: input.motivo.trim(), versionEsperada: input.versionEsperada }, key ?? input.idempotencyKey, async tx => {
    await tx.$executeRaw`UPDATE "ConteoInventario" SET "id"="id" WHERE "id"=${id} AND "tenantId"=${access.tenantId}`;
    const row = await tx.conteoInventario.findFirst({ where: { id, tenantId: access.tenantId } });
    if (!row) fail(404, 'NOT_FOUND', 'Conteo no disponible.');
    checkBranch(access, row.sucursalId);
    if (row.estado !== 'BORRADOR') fail(409, 'COUNT_CONFIRMED', 'Este conteo ya fue confirmado.');
    if (row.version !== input.versionEsperada) fail(409, 'COUNT_CHANGED', 'El conteo cambió después de revisarlo. Vuelve a consultarlo.');
    const items = JSON.parse(row.itemsJson).filter((i: any) => i.cantidadContada !== null).sort((a: any, b: any) => a.productoId.localeCompare(b.productoId));
    if (!items.length) fail(400, 'COUNT_EMPTY', 'Registra al menos un artículo contado.');
    const prepared = [];
    for (const item of items) {
      await tx.$executeRaw`UPDATE "Producto" SET "id"="id" WHERE "id"=${item.productoId} AND "tenantId"=${access.tenantId}`;
      const current = await snapshot(tx, access, row.sucursalId, item.productoId);
      if (Number(current.product.stockActual) !== item.stockReferencia || current.movementReference !== item.movimientoReferencia) fail(409, 'COUNT_STALE', `El artículo ${item.nombre} tuvo movimientos. Recuéntalo antes de conciliar.`);
      prepared.push({ item, product: current.product });
    }
    for (const { item, product } of prepared) {
      const delta = Number((item.cantidadContada - Number(product.stockActual)).toFixed(3));
      if (!delta) continue;
      const changed = await tx.producto.updateMany({ where: { id: product.id, tenantId: access.tenantId, stockActual: item.stockReferencia }, data: { stockActual: { increment: delta } } });
      if (changed.count !== 1) fail(409, 'COUNT_STALE', 'Inventario cambió; recuenta antes de confirmar.');
      await tx.kardexMovimiento.create({ data: { tenantId: access.tenantId, sucursalId: row.sucursalId, productoId: product.id, tipoMovimiento: 'AJUSTE_INVENTARIO', cantidad: delta, stockAnterior: product.stockActual, stockNuevo: item.cantidadContada, motivo: input.motivo.trim(), usuarioId: access.userId, metadataJson: JSON.stringify({ version: 1, origen: 'CONTEO_FISICO', conteoId: id, unidad: product.unidad, costoUnitario: Number(product.costo || 0), usuarioNombre: access.email, saldoCompartido: !product.sucursalId }) } });
    }
    const confirmed = await tx.conteoInventario.update({ where: { id }, data: { estado: 'CONFIRMADO', version: { increment: 1 }, confirmadoEn: new Date(), motivo: input.motivo.trim() } });
    await tx.auditoriaLog.create({ data: { tenantId: access.tenantId, usuarioEmail: access.email, accion: 'CONTEO_INVENTARIO_CONFIRMADO', detalles: JSON.stringify({ conteoId: id, sucursalId: row.sucursalId, articulosContados: items.length, ajustes: prepared.filter(({ item, product }) => item.cantidadContada !== Number(product.stockActual)).length }) } });
    return publicCount(confirmed);
  });
}

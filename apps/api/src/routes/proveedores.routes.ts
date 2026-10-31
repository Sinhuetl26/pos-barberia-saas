// ======================================================================
// SYSTECH STUDIO - PROVEEDORES & COMPRAS (PURCHASING MODULE)
// End-to-end procurement, reception, stock increment & Kardex ledger
// ======================================================================

import { Router, Response } from 'express';
import { prisma, Prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { SaleError } from '../services/financial-error';

const inventoryNumber = (value: unknown) => ['number', 'string'].includes(typeof value) && !(typeof value === 'string' && !value.trim()) ? Number(value) : NaN;
const validQuantity = (value: number) => Number.isSafeInteger(value) && value > 0 && value <= 1_000_000;
const validCost = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1_000_000_000 && new Prisma.Decimal(value).decimalPlaces() <= 6;

// Same bounded conflict handling as POS: a failed transaction never confirms reception.
async function receiptTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try { return await prisma.$transaction(operation, { maxWait: 15_000, timeout: 20_000 }); }
    catch (error: any) {
      const retryable = error.code === 'P2034' || (['P2028', 'P1008'].includes(error.code) && /locked|write conflict|timed out|expired/i.test(error.message));
      if (retryable && attempt < 4) { await new Promise(resolve => setTimeout(resolve, 60 * 2 ** attempt + Math.random() * 40)); continue; }
      if (retryable) throw new SaleError(503, 'RECEIPT_RETRY_REQUIRED', 'No se confirmó la recepción. Reintenta la misma orden.');
      throw error;
    }
  }
  throw new SaleError(503, 'RECEIPT_RETRY_REQUIRED', 'Reintenta la misma orden.');
}

export const proveedoresRouter = Router();

proveedoresRouter.use(requireAuth);

// --- PROVEEDORES CRUD ---

// 1. List active suppliers
proveedoresRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const proveedores = await prisma.proveedor.findMany({
      where: { tenantId, eliminadoEn: null },
      orderBy: { nombre: 'asc' }
    });
    res.json(proveedores);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar proveedores' });
  }
});

// 2. Create supplier
proveedoresRouter.post('/', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { nombre, contacto, telefono, email, direccion, rfc } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' });
    }

    const proveedor = await prisma.proveedor.create({
      data: {
        tenantId,
        nombre: nombre.trim(),
        contacto: contacto ? contacto.trim() : null,
        telefono: telefono ? telefono.trim() : null,
        email: email ? email.trim() : null,
        direccion: direccion ? direccion.trim() : null,
        rfc: rfc ? rfc.trim() : null,
        activo: true
      }
    });

    res.json(proveedor);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// 3. Update supplier
proveedoresRouter.put('/:id', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const { nombre, contacto, telefono, email, direccion, rfc, activo } = req.body;

    const existing = await prisma.proveedor.findFirst({
      where: { id, tenantId, eliminadoEn: null }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Proveedor no encontrado en su barbería' });
    }

    const updated = await prisma.proveedor.update({
      where: { id },
      data: {
        nombre: nombre ? nombre.trim() : undefined,
        contacto: contacto !== undefined ? contacto : undefined,
        telefono: telefono !== undefined ? telefono : undefined,
        email: email !== undefined ? email : undefined,
        direccion: direccion !== undefined ? direccion : undefined,
        rfc: rfc !== undefined ? rfc : undefined,
        activo: activo !== undefined ? Boolean(activo) : undefined
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// 4. Soft delete supplier
proveedoresRouter.delete('/:id', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;

    const existing = await prisma.proveedor.findFirst({
      where: { id, tenantId, eliminadoEn: null }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Proveedor no encontrado en su barbería' });
    }

    await prisma.proveedor.update({
      where: { id },
      data: { eliminadoEn: new Date(), activo: false }
    });

    res.json({ success: true, message: 'Proveedor eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

// --- ORDENES DE COMPRA & RECEPCION DE INVENTARIO ---

export const ordenesCompraRouter = Router();
ordenesCompraRouter.use(requireAuth);

// 1. List purchase orders
ordenesCompraRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId, estado } = req.query;

    const ordenes = await prisma.ordenCompra.findMany({
      where: {
        tenantId,
        ...(sucursalId ? { sucursalId: String(sucursalId) } : {}),
        ...(estado ? { estado: String(estado) } : {})
      },
      include: {
        proveedor: true
      },
      orderBy: { fecha: 'desc' }
    });

    const parsedOrdenes = ordenes.map(o => {
      let items: any[] = [];
      let observacion = o.notas || '';
      try {
        if (o.notas && o.notas.startsWith('{')) {
          const parsed = JSON.parse(o.notas);
          items = parsed.items || [];
          observacion = parsed.observacion || '';
        }
      } catch (e) {}
      return {
        ...o,
        total: Number(o.total),
        items,
        observacion
      };
    });

    res.json(parsedOrdenes);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar órdenes de compra' });
  }
});

// 2. Create purchase order
ordenesCompraRouter.post('/', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId, proveedorId, items, observacion } = req.body;

    if (!sucursalId || !proveedorId) {
      return res.status(400).json({ error: 'sucursalId y proveedorId son obligatorios' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un producto en la orden de compra' });
    }

    const proveedor = await prisma.proveedor.findFirst({
      where: { id: proveedorId, tenantId, eliminadoEn: null }
    });
    if (!proveedor) {
      return res.status(404).json({ error: 'Proveedor no encontrado en su barbería' });
    }

    const sucursal = await prisma.sucursal.findFirst({
      where: { id: sucursalId, tenantId, eliminadoEn: null }
    });
    if (!sucursal) {
      return res.status(404).json({ error: 'Sucursal no encontrada en su barbería' });
    }

    let totalCalculado = 0;
    const cleanItems = [];

    for (const item of items) {
      const cantidad = inventoryNumber(item?.cantidad);
      const costoUnitario = inventoryNumber(item?.costoUnitario ?? item?.costo ?? 0);

      if (!validQuantity(cantidad) || !validCost(costoUnitario)) {
        return res.status(400).json({ code: 'INVALID_PURCHASE_ITEM', error: 'Cantidad entera positiva y costo finito no negativo requeridos, dentro de rango.' });
      }

      const prod = await prisma.producto.findFirst({
        where: { id: item.productoId, tenantId, eliminadoEn: null }
      });
      if (!prod) {
        return res.status(404).json({ error: `Producto con ID ${item.productoId} no encontrado` });
      }
      if (prod.tipo !== 'PRODUCTO') return res.status(400).json({ code: 'INVALID_PRODUCT_TYPE', error: 'Los servicios no se reciben en inventario.' });

      const subtotal = cantidad * costoUnitario;
      totalCalculado += subtotal;

      cleanItems.push({
        productoId: prod.id,
        nombre: prod.nombre,
        sku: prod.sku,
        cantidad,
        costoUnitario,
        subtotal
      });
    }

    const count = await prisma.ordenCompra.count({ where: { tenantId } });
    const folio = `OC-${String(count + 1).padStart(5, '0')}`;

    const notasPayload = JSON.stringify({
      items: cleanItems,
      observacion: observacion || ''
    });

    const orden = await prisma.ordenCompra.create({
      data: {
        tenantId,
        sucursalId,
        proveedorId,
        folio,
        total: totalCalculado,
        estado: 'PENDIENTE',
        notas: notasPayload
      },
      include: {
        proveedor: true
      }
    });

    res.json({
      success: true,
      orden: {
        ...orden,
        total: Number(orden.total),
        items: cleanItems,
        observacion: observacion || ''
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear orden de compra' });
  }
});

// 3. Receive Purchase Order (Physical reception -> Stock increment & Kardex ledger entry)
ordenesCompraRouter.post('/:id/recibir', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;

    const result = await receiptTransaction(async tx => {
      // Claim the order before checking its status, across API processes and retries.
      await tx.$executeRaw`UPDATE "OrdenCompra" SET "id"="id" WHERE "id"=${id} AND "tenantId"=${tenantId}`;
      const orden = await tx.ordenCompra.findFirst({ where: { id, tenantId }, include: { proveedor: true } });
      if (!orden) throw new SaleError(404, 'NOT_FOUND', 'Orden de compra no encontrada.');
      if (orden.estado === 'RECIBIDA') return { orden, replayed: true };
      if (orden.estado !== 'PENDIENTE') throw new SaleError(409, 'INVALID_ORDER_STATE', `La orden se encuentra en estado ${orden.estado}.`);
      let items: any[] = [];
      try { items = JSON.parse(orden.notas || '{}').items; } catch {}
      if (!Array.isArray(items) || !items.length || items.some(item => !item || typeof item.productoId !== 'string' || !validQuantity(inventoryNumber(item.cantidad)) || !validCost(inventoryNumber(item.costoUnitario)))) {
        throw new SaleError(400, 'INVALID_PURCHASE_ITEM', 'La orden contiene cantidades o costos inválidos; revisa sus renglones.');
      }
      // POS locks branch then sorted products. Use the same order before reading balances.
      await tx.$executeRaw`UPDATE "Sucursal" SET "id"="id" WHERE "id"=${orden.sucursalId} AND "tenantId"=${tenantId}`;
      const branch = await tx.sucursal.findFirst({ where: { id: orden.sucursalId, tenantId, eliminadoEn: null } });
      if (!branch) throw new SaleError(400, 'INVALID_BRANCH', 'Sucursal no disponible.');
      const ids = [...new Set<string>(items.map(item => item.productoId))].sort();
      for (const productId of ids) await tx.$executeRaw`UPDATE "Producto" SET "id"="id" WHERE "id"=${productId} AND "tenantId"=${tenantId}`;
      const claimed = await tx.ordenCompra.updateMany({ where: { id, tenantId, estado: 'PENDIENTE' }, data: { estado: 'RECIBIDA', fechaEntrega: new Date() } });
      if (claimed.count !== 1) throw new SaleError(409, 'INVALID_ORDER_STATE', 'La orden cambió de estado.');

      for (const item of items) {
        const liveProd = await tx.producto.findFirst({
          where: { id: item.productoId, tenantId, eliminadoEn: null, activo: true }
        });
        if (!liveProd || liveProd.tipo !== 'PRODUCTO' || liveProd.sucursalId && liveProd.sucursalId !== orden.sucursalId) {
          throw new SaleError(400, 'INVALID_PRODUCT', 'Producto no disponible para recibir en esta sucursal.');
        }
        {
          const cantidad = inventoryNumber(item.cantidad), costoUnitario = inventoryNumber(item.costoUnitario);
          const stockAnterior = Number(liveProd.stockActual);
          const stockNuevo = stockAnterior + cantidad;
          if (!Number.isFinite(stockNuevo) || new Prisma.Decimal(stockNuevo).decimalPlaces() > 3 || stockNuevo < 0 || stockNuevo > 2_147_483_647) throw new SaleError(400, 'INVALID_STOCK', 'Stock resultante fuera de rango.');

          await tx.producto.update({
            where: { id: liveProd.id },
            data: {
              stockActual: { increment: cantidad },
              costo: costoUnitario
            }
          });

          await tx.kardexMovimiento.create({
            data: {
              tenantId,
              sucursalId: orden.sucursalId,
              productoId: liveProd.id,
              tipoMovimiento: 'ENTRADA_COMPRA',
              cantidad,
              stockAnterior,
              stockNuevo,
              motivo: `Recepción Orden Compra ${orden.folio} (Proveedor: ${orden.proveedor.nombre})`,
              usuarioId: req.ctx!.userId || null,
              metadataJson: JSON.stringify({version:1,origen:'ORDEN_COMPRA',ordenCompraId:orden.id,referencia:orden.folio,proveedorId:orden.proveedorId,proveedorNombre:orden.proveedor.nombre,costoUnitario,unidad:liveProd.unidad,usuarioNombre:req.ctx!.email})
            }
          });
        }
      }

      await tx.auditoriaLog.create({
        data: {
          tenantId,
          usuarioEmail: req.ctx!.email,
          accion: 'RECEPCION_ORDEN_COMPRA',
          detalles: `Recepción de orden ${orden.folio} por total de $${Number(orden.total).toFixed(2)} MXN`
        }
      });

      return { orden: await tx.ordenCompra.findFirstOrThrow({ where: { id, tenantId } }), replayed: false };
    });

    res.json({
      success: true,
      message: `Orden de compra ${result.orden.folio} recibida exitosamente.`,
      orden: result.orden,
      replayed: result.replayed
    });
  } catch (error: any) {
    res.status(error instanceof SaleError ? error.statusCode : 500).json({ code: error instanceof SaleError ? error.code : 'SERVER_ERROR', error: error instanceof SaleError ? error.message : 'Error al recibir orden de compra' });
  }
});

// 4. Cancel Purchase Order
ordenesCompraRouter.post('/:id/cancelar', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;

    const changed = await receiptTransaction(tx => tx.ordenCompra.updateMany({ where: { id, tenantId, estado: 'PENDIENTE' }, data: { estado: 'CANCELADA' } }));
    const orden = await prisma.ordenCompra.findFirst({ where: { id, tenantId } });

    if (!orden) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    if (!changed.count && orden.estado !== 'CANCELADA') {
      return res.status(409).json({ code: 'INVALID_ORDER_STATE', error: 'Solo se pueden cancelar órdenes en estado PENDIENTE' });
    }

    res.json({
      success: true,
      message: `Orden de compra ${orden.folio} cancelada`,
      orden,
      replayed: !changed.count
    });
  } catch (error) {
    res.status(error instanceof SaleError ? error.statusCode : 500).json({ code: error instanceof SaleError ? error.code : 'SERVER_ERROR', error: error instanceof SaleError ? error.message : 'Error al cancelar orden de compra' });
  }
});

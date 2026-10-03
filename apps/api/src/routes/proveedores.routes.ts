// ======================================================================
// SYSTECH STUDIO - PROVEEDORES & COMPRAS (PURCHASING MODULE)
// End-to-end procurement, reception, stock increment & Kardex ledger
// ======================================================================

import { Router, Response } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';

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
      const cantidad = Number(item.cantidad);
      const costoUnitario = Number(item.costoUnitario || item.costo || 0);

      if (isNaN(cantidad) || cantidad <= 0) {
        return res.status(400).json({ error: 'Cada item debe tener una cantidad mayor a 0' });
      }

      const prod = await prisma.producto.findFirst({
        where: { id: item.productoId, tenantId, eliminadoEn: null }
      });
      if (!prod) {
        return res.status(404).json({ error: `Producto con ID ${item.productoId} no encontrado` });
      }

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

    const orden = await prisma.ordenCompra.findFirst({
      where: { id, tenantId },
      include: { proveedor: true }
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    if (orden.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: `La orden de compra ya se encuentra en estado "${orden.estado}"` });
    }

    let items: any[] = [];
    try {
      if (orden.notas && orden.notas.startsWith('{')) {
        const parsed = JSON.parse(orden.notas);
        items = parsed.items || [];
      }
    } catch (e) {}

    if (items.length === 0) {
      return res.status(400).json({ error: 'La orden no contiene items para recibir en almacén' });
    }

    // Atomic transaction: update order status, update product stock & cost, and write Kardex entry
    const result = await prisma.$transaction(async (tx) => {
      const updatedOrden = await tx.ordenCompra.update({
        where: { id },
        data: {
          estado: 'RECIBIDA',
          fechaEntrega: new Date()
        }
      });

      for (const item of items) {
        const liveProd = await tx.producto.findFirst({
          where: { id: item.productoId, tenantId }
        });

        if (liveProd) {
          const stockAnterior = liveProd.stockActual;
          const stockNuevo = stockAnterior + item.cantidad;

          await tx.producto.update({
            where: { id: liveProd.id },
            data: {
              stockActual: { increment: item.cantidad },
              costo: item.costoUnitario > 0 ? item.costoUnitario : liveProd.costo
            }
          });

          await tx.kardexMovimiento.create({
            data: {
              tenantId,
              sucursalId: orden.sucursalId,
              productoId: liveProd.id,
              tipoMovimiento: 'ENTRADA_COMPRA',
              cantidad: item.cantidad,
              stockAnterior,
              stockNuevo,
              motivo: `Recepción Orden Compra ${orden.folio} (Proveedor: ${orden.proveedor.nombre})`,
              usuarioId: req.ctx!.userId || null
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

      return updatedOrden;
    });

    res.json({
      success: true,
      message: `Orden de compra ${orden.folio} recibida exitosamente. El inventario ha sido actualizado.`,
      orden: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al recibir orden de compra' });
  }
});

// 4. Cancel Purchase Order
ordenesCompraRouter.post('/:id/cancelar', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;

    const orden = await prisma.ordenCompra.findFirst({
      where: { id, tenantId }
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    if (orden.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Solo se pueden cancelar órdenes en estado PENDIENTE' });
    }

    const updated = await prisma.ordenCompra.update({
      where: { id },
      data: { estado: 'CANCELADA' }
    });

    res.json({
      success: true,
      message: `Orden de compra ${orden.folio} cancelada`,
      orden: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al cancelar orden de compra' });
  }
});

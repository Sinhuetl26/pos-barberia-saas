// ==========================================
// SYSTECH STUDIO - INVENTARIO & PRODUCTOS ROUTES
// Catalog management, Kardex movements, stock tracking
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { createProductSchema, validateBody } from '../validators/schemas';

export const inventarioRouter = Router();

// Protect only product and inventory routes with requireAuth
inventarioRouter.use(['/productos', '/inventario'], requireAuth);

// Get catalog (Products & Services)
inventarioRouter.get('/productos', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { tipo, bajoStock, sucursalId } = req.query as {
      tipo?: string;
      bajoStock?: string;
      sucursalId?: string;
    };

    const productos = await prisma.producto.findMany({
      where: {
        tenantId,
        eliminadoEn: null,
        ...(tipo ? { tipo } : {}),
        ...(sucursalId ? { sucursalId } : {})
      },
      include: { sucursal: true },
      orderBy: { nombre: 'asc' }
    });

    const filtered = bajoStock === 'true'
      ? productos.filter(p => p.tipo === 'PRODUCTO' && p.stockActual <= p.stockMinimo)
      : productos;

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener catálogo de productos' });
  }
});

// Create product or service
inventarioRouter.post('/productos', validateBody(createProductSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const {
      sucursalId,
      nombre,
      tipo = 'PRODUCTO',
      categoria = 'General',
      duracionMinutos = 30,
      sku,
      precioVenta,
      costo = 0,
      stockActual = 0,
      stockMinimo = 0
    } = req.body;

    if (sucursalId) {
      const sucursal = await prisma.sucursal.findFirst({
        where: { id: sucursalId, tenantId, eliminadoEn: null }
      });
      if (!sucursal) {
        return res.status(400).json({ code: 'BAD_REQUEST', error: 'Sucursal no encontrada en su barbería' });
      }
    }

    const producto = await prisma.producto.create({
      data: {
        tenantId,
        sucursalId: sucursalId || null,
        nombre: nombre.trim(),
        tipo,
        categoria,
        duracionMinutos: parseInt(duracionMinutos as any) || 30,
        sku: sku || (tipo === 'PRODUCTO' ? `PRD-${Math.floor(100 + Math.random() * 900)}` : `SRV-${Math.floor(100 + Math.random() * 900)}`),
        precioVenta: Number(precioVenta),
        costo: Number(costo),
        stockActual: tipo === 'PRODUCTO' ? parseInt(stockActual as any) || 0 : 9999,
        stockMinimo: tipo === 'PRODUCTO' ? parseInt(stockMinimo as any) || 0 : 0
      }
    });

    if (tipo === 'PRODUCTO' && (parseInt(stockActual as any) || 0) > 0 && sucursalId) {
      await prisma.kardexMovimiento.create({
        data: {
          tenantId,
          sucursalId,
          productoId: producto.id,
          tipoMovimiento: 'ENTRADA_COMPRA',
          cantidad: producto.stockActual,
          stockAnterior: 0,
          stockNuevo: producto.stockActual,
          motivo: 'Inventario inicial'
        }
      });
    }

    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear producto o servicio' });
  }
});

// Update product or service
inventarioRouter.put('/productos/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.producto.findFirst({
      where: { id, tenantId, eliminadoEn: null }
    });
    if (!existing) {
      return res.status(404).json({ code: 'NOT_FOUND', error: 'Producto no encontrado en su barbería' });
    }

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        nombre: data.nombre ? data.nombre.trim() : undefined,
        categoria: data.categoria,
        duracionMinutos: data.duracionMinutos ? parseInt(data.duracionMinutos) : undefined,
        sku: data.sku,
        precioVenta: data.precioVenta !== undefined ? Number(data.precioVenta) : undefined,
        costo: data.costo !== undefined ? Number(data.costo) : undefined,
        stockMinimo: data.stockMinimo !== undefined ? parseInt(data.stockMinimo) : undefined,
        activo: data.activo !== undefined ? data.activo : undefined
      }
    });

    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Manual Kardex Adjustment
inventarioRouter.post('/inventario/movimiento', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { productoId, tipoMovimiento, cantidad, motivo } = req.body;

    const prod = await prisma.producto.findFirst({
      where: { id: productoId, tenantId, eliminadoEn: null }
    });
    if (!prod) return res.status(404).json({ code: 'NOT_FOUND', error: 'Producto no encontrado en su barbería' });

    const qty = parseInt(cantidad) || 0;
    const stockAnterior = prod.stockActual;
    let stockNuevo = stockAnterior;

    if (tipoMovimiento === 'ENTRADA_COMPRA') {
      stockNuevo = stockAnterior + qty;
    } else if (tipoMovimiento === 'MERMA_DEVOLUCION') {
      stockNuevo = Math.max(0, stockAnterior - Math.abs(qty));
    } else if (tipoMovimiento === 'AJUSTE_INVENTARIO') {
      stockNuevo = qty;
    }

    const [updatedProd, kardex] = await prisma.$transaction([
      prisma.producto.update({
        where: { id: productoId },
        data: { stockActual: stockNuevo }
      }),
      prisma.kardexMovimiento.create({
        data: {
          tenantId,
          sucursalId: prod.sucursalId || '',
          productoId,
          tipoMovimiento,
          cantidad: stockNuevo - stockAnterior,
          stockAnterior,
          stockNuevo,
          motivo
        }
      })
    ]);

    res.json({ producto: updatedProd, kardex });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar movimiento de inventario' });
  }
});

// Kardex Movement History
inventarioRouter.get('/inventario/kardex', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { productoId } = req.query as { productoId?: string };

    const movimientos = await prisma.kardexMovimiento.findMany({
      where: {
        tenantId,
        ...(productoId ? { productoId } : {})
      },
      include: { producto: true },
      orderBy: { fecha: 'desc' },
      take: 100
    });

    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial de kardex' });
  }
});

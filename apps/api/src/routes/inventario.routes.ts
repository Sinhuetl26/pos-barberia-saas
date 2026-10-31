// ==========================================
// SYSTECH STUDIO - INVENTARIO & PRODUCTOS ROUTES
// Catalog management, Kardex movements, stock tracking
// ==========================================

import { Router } from 'express';
import { SaleError } from '../services/financial-error';
import { createInventoryProduct, moveInventory } from '../services/inventory-ledger.service';
import { listInventoryCounts, startInventoryCount, saveInventoryCount, confirmInventoryCount } from '../services/inventory-count.service';
import { stockQuantity, inventoryUnitCost } from '../services/inventory-quantity.service';
import { serviceRecipes, publishRecipe, correctServiceConsumption, consumptionHistory } from '../services/service-consumption.service';
import { reconcileSupplies } from '../services/inventory-reconciliation.service';
import { professionalTariffs, publishProfessionalTariff, resolvedCatalog } from '../services/professional-pricing.service';
import { getDiscountPolicy, publishDiscountPolicy } from '../services/discount-policy.service';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { createProductSchema, validateBody } from '../validators/schemas';
import { requirePlanCapability } from '../middleware/license';

export const inventarioRouter = Router();

// Protect product and inventory routes with requireAuth
inventarioRouter.use(['/productos', '/inventario'], requireAuth);

const commercialError=(res:any,error:any)=>res.status(error.statusCode||500).json({code:error.code||'COMMERCIAL_RESULT_UNKNOWN',error:error.statusCode?error.message:'No se confirmó el resultado; conserva la intención y reintenta.'});
inventarioRouter.get('/productos/precios',async(req:AuthenticatedRequest,res)=>{try{res.json(await resolvedCatalog(req.ctx!,req.query));}catch(error){commercialError(res,error);}});
const professionalPricing = requirePlanCapability('PROFESSIONAL_PRICING', 'Las tarifas por profesional');
const discountApprovals = requirePlanCapability('DISCOUNT_APPROVALS', 'Las políticas y autorizaciones de descuento');
inventarioRouter.get('/inventario/tarifas',requireRole('DUENO','GERENTE'),professionalPricing,async(req:AuthenticatedRequest,res)=>{try{res.json(await professionalTariffs(req.ctx!,req.query.sucursalId as string));}catch(error){commercialError(res,error);}});
inventarioRouter.post('/inventario/tarifas',requireRole('DUENO','GERENTE'),professionalPricing,async(req:AuthenticatedRequest,res)=>{try{res.json(await publishProfessionalTariff(req.ctx!,req.body));}catch(error){commercialError(res,error);}});
// POS reads the effective policy in every plan; only publishing advanced rules is a Pro capability.
inventarioRouter.get('/inventario/politica-descuentos',async(req:AuthenticatedRequest,res)=>{try{res.json(await getDiscountPolicy(req.ctx!,req.query.sucursalId as string));}catch(error){commercialError(res,error);}});
inventarioRouter.post('/inventario/politica-descuentos',requireRole('DUENO','GERENTE'),discountApprovals,async(req:AuthenticatedRequest,res)=>{try{res.json(await publishDiscountPolicy(req.ctx!,req.body));}catch(error){commercialError(res,error);}});

const countError = (res: any, error: any) => res.status(error instanceof SaleError ? error.statusCode : 500).json({ code: error instanceof SaleError ? error.code : 'SERVER_ERROR', error: error instanceof SaleError ? error.message : 'No pudimos guardar el conteo. Conserva los datos y reintenta.' });
inventarioRouter.get('/inventario/conteos', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try { res.json(await listInventoryCounts(req.ctx!, req.query.sucursalId as string | undefined)); } catch (error) { countError(res, error); }
});
inventarioRouter.post('/inventario/conteos', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try { res.json(await startInventoryCount(req.ctx!, req.body, req.get('Idempotency-Key'))); } catch (error) { countError(res, error); }
});
inventarioRouter.put('/inventario/conteos/:id', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try { res.json(await saveInventoryCount(req.ctx!, req.params.id, req.body, req.get('Idempotency-Key'))); } catch (error) { countError(res, error); }
});
inventarioRouter.post('/inventario/conteos/:id/confirmar', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try { res.json(await confirmInventoryCount(req.ctx!, req.params.id, req.body, req.get('Idempotency-Key'))); } catch (error) { countError(res, error); }
});
inventarioRouter.get('/inventario/recetas/:servicioId', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try { res.json(await serviceRecipes(req.ctx!, req.params.servicioId)); } catch (error) { countError(res,error); }
});
inventarioRouter.post('/inventario/recetas/:servicioId', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try { res.json(await publishRecipe(req.ctx!,req.params.servicioId,req.body,req.get('Idempotency-Key'))); } catch (error) { countError(res,error); }
});
inventarioRouter.get('/inventario/insumos/conciliacion', requireRole('DUENO','GERENTE'),async(req:AuthenticatedRequest,res)=>{
  try{res.json(await reconcileSupplies(req.ctx!,req.query));}catch(error){countError(res,error);}
});
inventarioRouter.get('/inventario/consumos',requireRole('DUENO','GERENTE'),async(req:AuthenticatedRequest,res)=>{
  try{if(typeof req.query.sucursalId!=='string')throw new SaleError(400,'INVALID_BRANCH','Elige una sucursal.');res.json(await consumptionHistory(req.ctx!,req.query.sucursalId));}catch(error){countError(res,error);}
});
inventarioRouter.post('/inventario/consumos/:id/corregir',requireRole('DUENO','GERENTE'),async(req:AuthenticatedRequest,res)=>{
  try{res.json(await correctServiceConsumption(req.ctx!,req.params.id,req.body,req.get('Idempotency-Key')));}catch(error){countError(res,error);}
});

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
      ? productos.filter(p => p.tipo === 'PRODUCTO' && Number(p.stockActual) <= Number(p.stockMinimo))
      : productos;

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener catálogo de productos' });
  }
});

// Initial stock, ledger and intention commit together.
inventarioRouter.post('/productos', requireRole('DUENO', 'GERENTE'), (req, res, next) => {
  // Do not let coercion turn booleans/null/blank into physical quantities.
  for (const field of ['stockActual', 'stockMinimo', 'costo', 'precioVenta']) {
    const value = req.body?.[field];
    if (value !== undefined && (!['number', 'string'].includes(typeof value) || typeof value === 'string' && !value.trim())) return res.status(400).json({ code: 'INVALID_QUANTITY', error: `${field} debe ser un número válido.` });
  }
  next();
}, validateBody(createProductSchema), async (req: AuthenticatedRequest, res) => {
  try { res.json(await createInventoryProduct(req.ctx!, req.body, req.get('Idempotency-Key'))); }
  catch (error: any) { res.status(error instanceof SaleError ? error.statusCode : 500).json({ code: error instanceof SaleError ? error.code : 'SERVER_ERROR', error: error instanceof SaleError ? error.message : 'Error al crear producto o servicio' }); }
});

// Update product or service (C2: requireRole DUENO, GERENTE)
inventarioRouter.put('/productos/:id', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const data = req.body;
    if (data.precioVenta !== undefined && (!Number.isFinite(Number(data.precioVenta)) || Number(data.precioVenta) < 0 || Number(data.precioVenta) > 1_000_000_000 || Math.abs(Number(data.precioVenta) * 100 - Math.round(Number(data.precioVenta) * 100)) > 0.00001)) {
      return res.status(400).json({ code: 'INVALID_PRICE', error: 'El precio debe ser positivo o cero y tener hasta dos decimales.' });
    }
    if (data.tasaImpuesto !== undefined && (typeof data.tasaImpuesto !== 'number' || !Number.isFinite(data.tasaImpuesto) || data.tasaImpuesto < 0 || data.tasaImpuesto > 100)) {
      return res.status(400).json({ code: 'INVALID_TAX_RATE', error: 'La tasa incluida debe estar entre 0 y 100.' });
    }

    if (data.stockActual !== undefined) return res.status(400).json({ code: 'STOCK_CHANGE_REQUIRES_MOVEMENT', error: 'Registra el cambio de stock como movimiento para conservar el historial.' });
    if (data.nombre !== undefined && (typeof data.nombre !== 'string' || data.nombre.trim().length < 2)) return res.status(400).json({ code: 'INVALID_NAME', error: 'Nombre de producto requerido.' });
    if (data.sku !== undefined && data.sku !== null && (typeof data.sku !== 'string' || data.sku.length > 100)) return res.status(400).json({ code: 'INVALID_SKU', error: 'SKU inválido.' });
    if (data.imagen !== undefined && data.imagen !== null && (typeof data.imagen !== 'string' || data.imagen.length > 70000 || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(data.imagen))) return res.status(400).json({ code: 'INVALID_IMAGE', error: 'La foto debe ser un JPG preparado por SYSTECH.' });
    if (data.costo !== undefined) inventoryUnitCost(data.costo);
    const existing = await prisma.producto.findFirst({
      where: { id, tenantId, eliminadoEn: null }
    });
    if (!existing) {
      return res.status(404).json({ code: 'NOT_FOUND', error: 'Producto no encontrado en su barbería' });
    }
    if(data.unidad!==undefined&&data.unidad!==existing.unidad||data.naturaleza!==undefined&&data.naturaleza!==existing.naturaleza)return res.status(400).json({code:'UNIT_IMMUTABLE',error:'Unidad y clasificación no se reinterpretan en un artículo con historia. Crea un artículo nuevo.'});
    if(data.stockMinimo!==undefined)stockQuantity(data.stockMinimo,existing.unidad,true);

    const producto = await prisma.$transaction(async tx => {
      await tx.$executeRaw`UPDATE "Tenant" SET "id"="id" WHERE "id"=${tenantId}`;
      if (data.sku?.trim()) {
        const duplicates = await tx.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS "count" FROM "Producto" WHERE "tenantId"=${tenantId} AND "id"<>${id} AND "eliminadoEn" IS NULL AND lower("sku")=lower(${data.sku.trim()})`;
        if (Number(duplicates[0].count)) throw new SaleError(409, 'SKU_EXISTS', 'Ese SKU ya está en el catálogo de la barbería.');
      }
      return tx.producto.update({
      where: { id },
      data: {
        nombre: data.nombre ? data.nombre.trim() : undefined,
        imagen: data.imagen === undefined ? undefined : data.imagen || null,
        categoria: data.categoria,
        duracionMinutos: data.duracionMinutos ? parseInt(data.duracionMinutos) : undefined,
        sku: data.sku === undefined ? undefined : data.sku?.trim() || null,
        precioVenta: data.precioVenta !== undefined ? Number(data.precioVenta) : undefined,
        tasaImpuesto: data.tasaImpuesto,
        costo: data.costo !== undefined ? Number(data.costo) : undefined,
        stockMinimo: data.stockMinimo !== undefined ? Number(data.stockMinimo) : undefined,
        activo: data.activo !== undefined ? data.activo : undefined
      }
      });
    });

    res.json(producto);
  } catch (error: any) {
    res.status(error instanceof SaleError ? error.statusCode : 500).json({ code: error instanceof SaleError ? error.code : 'SERVER_ERROR', error: error instanceof SaleError ? error.message : 'Error al actualizar producto' });
  }
});

// Replayable stock intention; absolute adjustments require reference balance.
inventarioRouter.post('/inventario/movimiento', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try { res.json(await moveInventory(req.ctx!, req.body, req.get('Idempotency-Key'))); }
  catch (error: any) { res.status(error instanceof SaleError ? error.statusCode : 500).json({ code: error instanceof SaleError ? error.code : 'SERVER_ERROR', error: error instanceof SaleError ? error.message : 'Error al registrar movimiento de inventario' }); }
});
// Kardex Movement History
inventarioRouter.get('/inventario/kardex', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
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

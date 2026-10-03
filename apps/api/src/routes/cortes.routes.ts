// ==========================================
// SYSTECH STUDIO - CORTES DE CAJA (ARQUEO CIEGO) ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { openCashShiftSchema, closeCashShiftSchema, validateBody } from '../validators/schemas';
import { calculateCashShiftSummary } from '../services/cash.service';

export const cortesRouter = Router();

cortesRouter.use(requireAuth);

// Get list of cash shifts
cortesRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId } = req.query as { sucursalId?: string };

    const cortes = await prisma.corteCaja.findMany({
      where: {
        tenantId,
        ...(sucursalId ? { sucursalId } : {})
      },
      include: { sucursal: true },
      orderBy: { fechaApertura: 'desc' }
    });

    res.json(cortes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cortes de caja' });
  }
});

// Open Cash Register Shift (Authorized cashier or owner)
cortesRouter.post('/abrir', requireRole('DUENO', 'GERENTE'), validateBody(openCashShiftSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId, fondoInicial = 0, notas } = req.body;

    const sucursal = await prisma.sucursal.findFirst({
      where: { id: sucursalId, tenantId, eliminadoEn: null }
    });
    if (!sucursal) {
      return res.status(400).json({ code: 'BAD_REQUEST', error: 'Sucursal no encontrada en su barbería' });
    }

    const existingOpen = await prisma.corteCaja.findFirst({
      where: { tenantId, sucursalId, estado: 'ABIERTO' }
    });

    if (existingOpen) {
      return res.status(400).json({
        error: 'Ya existe una caja abierta para esta sucursal. Ciérrala antes de abrir una nueva.',
        corteAbierto: existingOpen
      });
    }

    const corte = await prisma.corteCaja.create({
      data: {
        tenantId,
        sucursalId,
        fondoInicial: Number(fondoInicial),
        estado: 'ABIERTO',
        notas
      }
    });

    res.json(corte);
  } catch (error) {
    res.status(500).json({ error: 'Error al abrir caja' });
  }
});

// Close Cash Register Shift (Blind Cash Count Reconciliation)
// C2 FIX: Require DUENO or GERENTE role to close cash shift
cortesRouter.post('/cerrar', requireRole('DUENO', 'GERENTE'), validateBody(closeCashShiftSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { corteId, conteoEfectivoReal, notasCierre } = req.body;

    const corte = await prisma.corteCaja.findFirst({
      where: { id: corteId, tenantId }
    });

    if (!corte || corte.estado === 'CERRADO') {
      return res.status(400).json({ error: 'Caja no encontrada o ya cerrada' });
    }

    const fechaCierre = new Date();

    // A5 & P0.5 FIX: Filter out CANCELADA sales and bound strictly between fechaApertura and fechaCierre
    const ventas = await prisma.venta.findMany({
      where: {
        tenantId,
        sucursalId: corte.sucursalId,
        fecha: { gte: corte.fechaApertura, lte: fechaCierre },
        estado: { not: 'CANCELADA' }
      }
    });

    // P0.5 FIX: Fetch all movements associated with this cash drawer shift
    const movimientos = await prisma.movimientoCaja.findMany({
      where: {
        tenantId,
        sucursalId: corte.sucursalId,
        corteCajaId: corte.id
      }
    });

    // Pure reconciliation calculation with sales + movements
    const summary = calculateCashShiftSummary(
      Number(corte.fondoInicial),
      ventas as any,
      Number(conteoEfectivoReal),
      movimientos as any
    );

    const corteCerrado = await prisma.corteCaja.update({
      where: { id: corteId },
      data: {
        estado: 'CERRADO',
        fechaCierre,
        totalEfectivo: summary.totalEfectivo,
        totalTarjeta: summary.totalTarjeta,
        totalTransferencia: summary.totalTransferencia,
        totalPropinas: summary.totalPropinas,
        totalVentas: summary.totalVentas,
        conteoEfectivoReal: summary.conteoReal,
        descuadre: summary.descuadre,
        notas: [corte.notas, notasCierre].filter(Boolean).join(' | ')
      }
    });

    res.json({
      success: true,
      corte: corteCerrado,
      resumen: summary
    });
  } catch (error) {
    console.error('Error al cerrar caja:', error);
    res.status(500).json({ error: 'Error al cerrar caja' });
  }
});

// Cash drawer movement (gastos menores, retiros, entradas de efectivo)
cortesRouter.post('/movimiento', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const userEmail = req.ctx!.email;
    const { sucursalId, tipo, monto, concepto, corteCajaId } = req.body;

    if (!sucursalId || !tipo || monto === undefined || !concepto) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para registrar movimiento de caja' });
    }

    const sucursal = await prisma.sucursal.findFirst({
      where: { id: sucursalId, tenantId, eliminadoEn: null }
    });
    if (!sucursal) {
      return res.status(400).json({ error: 'Sucursal no encontrada en su barbería' });
    }

    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un número positivo mayor a 0' });
    }

    const normTipo = tipo === 'INGRESO_EXTRA' ? 'INGRESO' : tipo;
    if (!['INGRESO', 'RETIRO', 'GASTO_MENOR'].includes(normTipo)) {
      return res.status(400).json({ error: 'Tipo de movimiento inválido (INGRESO, RETIRO, GASTO_MENOR)' });
    }

    // Verify open cash shift exists for this branch
    const openCorte = corteCajaId
      ? await prisma.corteCaja.findFirst({ where: { id: corteCajaId, tenantId, sucursalId, estado: 'ABIERTO' } })
      : await prisma.corteCaja.findFirst({ where: { tenantId, sucursalId, estado: 'ABIERTO' } });

    if (!openCorte) {
      return res.status(400).json({ error: 'No existe un corte de caja abierto para esta sucursal. Debe abrir caja antes de registrar movimientos.' });
    }

    const mov = await prisma.movimientoCaja.create({
      data: {
        tenantId,
        sucursalId,
        corteCajaId: openCorte.id,
        tipo: normTipo,
        monto: montoNum,
        concepto: String(concepto).trim(),
        usuarioEmail: userEmail
      }
    });

    await prisma.auditoriaLog.create({
      data: {
        tenantId,
        usuarioEmail: userEmail,
        accion: `MOVIMIENTO_CAJA_${normTipo}`,
        detalles: `${normTipo}: $${montoNum.toFixed(2)} MXN - ${concepto}`
      }
    });

    res.json({ success: true, movimiento: mov });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar movimiento de caja' });
  }
});



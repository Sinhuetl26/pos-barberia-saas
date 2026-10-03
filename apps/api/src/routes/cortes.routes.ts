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
cortesRouter.post('/abrir', validateBody(openCashShiftSchema), async (req: AuthenticatedRequest, res) => {
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

    // A5 FIX: Filter out CANCELADA sales so they do not artificially inflate cash/card
    const ventas = await prisma.venta.findMany({
      where: {
        tenantId,
        sucursalId: corte.sucursalId,
        fecha: { gte: corte.fechaApertura },
        estado: { not: 'CANCELADA' }
      }
    });

    // Pure reconciliation calculation
    const summary = calculateCashShiftSummary(
      Number(corte.fondoInicial),
      ventas as any,
      Number(conteoEfectivoReal)
    );

    const corteCerrado = await prisma.corteCaja.update({
      where: { id: corteId },
      data: {
        estado: 'CERRADO',
        fechaCierre: new Date(),
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
cortesRouter.post('/movimiento', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const userEmail = req.ctx!.email;
    const { sucursalId, tipo, monto, concepto, corteCajaId } = req.body;

    if (!sucursalId || !tipo || !monto || !concepto) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para registrar movimiento de caja' });
    }

    if (!['INGRESO', 'RETIRO', 'GASTO_MENOR'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de movimiento inválido (INGRESO, RETIRO, GASTO_MENOR)' });
    }

    const mov = await prisma.movimientoCaja.create({
      data: {
        tenantId,
        sucursalId,
        corteCajaId: corteCajaId || null,
        tipo,
        monto: Number(monto),
        concepto,
        usuarioEmail: userEmail
      }
    });

    await prisma.auditoriaLog.create({
      data: {
        tenantId,
        usuarioEmail: userEmail,
        accion: `MOVIMIENTO_CAJA_${tipo}`,
        detalles: `${tipo}: $${Number(monto).toFixed(2)} MXN - ${concepto}`
      }
    });

    res.json({ success: true, movimiento: mov });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar movimiento de caja' });
  }
});


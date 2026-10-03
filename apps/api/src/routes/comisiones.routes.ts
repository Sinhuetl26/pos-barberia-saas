// ==========================================
// SYSTECH STUDIO - COMISIONES ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const comisionesRouter = Router();

comisionesRouter.use(requireAuth);

// List commissions with filters (barberoId, status)
comisionesRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    let { barberoId, pagada } = req.query as { barberoId?: string; pagada?: string };

    // C2: For BARBERO role, restrict commission view strictly to their own barber record
    if (req.ctx!.rol === 'BARBERO') {
      const ownBarber = await prisma.barbero.findFirst({
        where: { sucursal: { tenantId }, email: req.ctx!.email }
      });
      barberoId = ownBarber ? ownBarber.id : 'unauthorized-barber-filter';
    }

    const comisiones = await prisma.comision.findMany({
      where: {
        tenantId,
        ...(barberoId ? { barberoId } : {}),
        ...(pagada !== undefined ? { pagada: pagada === 'true' } : {})
      },
      include: {
        barbero: true,
        venta: {
          include: { items: true }
        }
      },
      orderBy: { id: 'desc' }
    });

    const totalPendiente = comisiones.filter(c => !c.pagada).reduce((sum, c) => sum + Number(c.monto), 0);
    const totalPagado = comisiones.filter(c => c.pagada).reduce((sum, c) => sum + Number(c.monto), 0);

    res.json({
      comisiones,
      totalPendiente,
      totalPagado
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener comisiones' });
  }
});

// Batch Pay Commissions (C2: requireRole DUENO, GERENTE)
comisionesRouter.post('/pagar', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { comisionIds, metodoPagoComision = 'EFECTIVO' } = req.body;

    if (!comisionIds || !Array.isArray(comisionIds) || comisionIds.length === 0) {
      return res.status(400).json({ error: 'Selecciona al menos una comisión para pagar' });
    }

    const updated = await prisma.comision.updateMany({
      where: {
        id: { in: comisionIds },
        tenantId
      },
      data: {
        pagada: true,
        fechaPago: new Date(),
        metodoPagoComision
      }
    });

    res.json({ message: 'Comisiones pagadas con éxito', count: updated.count });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar pago de comisiones' });
  }
});

// Full Payroll Settlement with deductions, advances, and voucher generation (C2: requireRole DUENO, GERENTE)
comisionesRouter.post('/liquidar-nomina', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const userEmail = req.ctx!.email;
    const {
      barberoId,
      comisionIds,
      adelantos = 0,
      deducciones = 0,
      concepto = 'Liquidación semanal de comisiones',
      metodoPago = 'TRANSFERENCIA'
    } = req.body;

    if (!barberoId) return res.status(400).json({ error: 'El ID del barbero es requerido' });

    const barbero = await prisma.barbero.findFirst({
      where: { id: barberoId, sucursal: { tenantId } }
    });
    if (!barbero) return res.status(404).json({ error: 'Barbero no encontrado en esta barbería' });

    const comisiones = await prisma.comision.findMany({
      where: {
        tenantId,
        barberoId,
        pagada: false,
        ...(Array.isArray(comisionIds) && comisionIds.length > 0 ? { id: { in: comisionIds } } : {})
      }
    });

    if (comisiones.length === 0) {
      return res.status(400).json({ error: 'No hay comisiones pendientes para liquidar a este barbero' });
    }

    const subtotalComisiones = comisiones.reduce((sum, c) => sum + Number(c.monto), 0);
    const montoAdelantos = Number(adelantos) || 0;
    const montoDeducciones = Number(deducciones) || 0;
    const netoAPagar = Math.max(0, subtotalComisiones - montoAdelantos - montoDeducciones);

    const ids = comisiones.map(c => c.id);

    const nuevoPago = await prisma.$transaction(async (tx) => {
      // Mark commissions as paid
      await tx.comision.updateMany({
        where: { id: { in: ids } },
        data: {
          pagada: true,
          fechaPago: new Date(),
          metodoPagoComision: metodoPago
        }
      });

      // A16 FIX: Consecutive sequential folio for payroll
      const seq = await tx.secuencia.upsert({
        where: {
          tenantId_sucursalId_tipo: {
            tenantId,
            sucursalId: 'DEFAULT',
            tipo: 'NOMINA'
          }
        },
        update: { ultimoValor: { increment: 1 } },
        create: {
          tenantId,
          sucursalId: 'DEFAULT',
          tipo: 'NOMINA',
          ultimoValor: (await tx.pagoNomina.count({ where: { tenantId } })) + 1
        }
      });

      const folio = `NOM-${String(seq.ultimoValor).padStart(6, '0')}`;

      // Persist payroll receipt in database
      const pago = await tx.pagoNomina.create({
        data: {
          tenantId,
          barberoId,
          folio,
          folioConsecutivo: seq.ultimoValor,
          subtotalComisiones,
          adelantos: montoAdelantos,
          deducciones: montoDeducciones,
          netoPagado: netoAPagar,
          metodoPago,
          concepto,
          detalles: JSON.stringify({ comisionIds: ids, comisionesCount: ids.length }),
          usuarioLiquidador: userEmail
        }
      });

      await tx.auditoriaLog.create({
        data: {
          tenantId,
          usuarioEmail: userEmail,
          accion: 'NOMINA_LIQUIDADA',
          detalles: `Nómina ${folio} liquidada a ${barbero.nombre}: Bruto $${subtotalComisiones.toFixed(2)}, Deducciones -$${montoDeducciones.toFixed(2)}, Adelantos -$${montoAdelantos.toFixed(2)}, Neto $${netoAPagar.toFixed(2)} MXN (${comisiones.length} comisiones).`
        }
      });

      return pago;
    });

    const reciboNomina = {
      id: nuevoPago.id,
      folioRecibo: nuevoPago.folio,
      folioConsecutivo: nuevoPago.folioConsecutivo,
      barbero: barbero.nombre,
      fechaLiquidacion: nuevoPago.fechaLiquidacion.toISOString(),
      comisionesLiquidadas: comisiones.length,
      subtotalComisiones,
      adelantos: montoAdelantos,
      deducciones: montoDeducciones,
      netoPagado: netoAPagar,
      metodoPago,
      concepto
    };

    res.json({
      success: true,
      mensaje: `Nómina de $${netoAPagar.toFixed(2)} MXN liquidada exitosamente para ${barbero.nombre}`,
      reciboNomina
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al liquidar nómina' });
  }
});

// A16: Historical Payroll Settlements Query
comisionesRouter.get('/nominas', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const userRole = req.ctx!.rol;
    const { barberoId } = req.query as { barberoId?: string };

    const whereClause: any = { tenantId };

    if (userRole === 'BARBERO') {
      const dbBarbero = await prisma.barbero.findFirst({
        where: { email: req.ctx!.email, sucursal: { tenantId } }
      });
      if (!dbBarbero) return res.status(403).json({ error: 'Perfil de barbero no encontrado' });
      whereClause.barberoId = dbBarbero.id;
    } else if (barberoId) {
      whereClause.barberoId = barberoId;
    }

    const nominas = await prisma.pagoNomina.findMany({
      where: whereClause,
      include: { barbero: true },
      orderBy: { fechaLiquidacion: 'desc' }
    });

    res.json(nominas);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar recibos de nómina' });
  }
});


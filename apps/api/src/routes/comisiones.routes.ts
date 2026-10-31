// ==========================================
// SYSTECH STUDIO - COMISIONES ROUTES
// ==========================================

import { Router } from 'express';
import { settleCommissions } from '../services/commission-settlement.service';
import { SaleError } from '../services/pos-sale.service';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { requirePlanCapability } from '../middleware/license';

export const comisionesRouter = Router();

comisionesRouter.use(requireAuth);

// List commissions with filters (barberoId, status)
comisionesRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    let { barberoId, pagada, sucursalId } = req.query as { barberoId?: string; pagada?: string; sucursalId?: string };

    // C2: For BARBERO role, restrict commission view strictly to their own barber record
    if (req.ctx!.rol === 'BARBERO') {
      const ownBarber = await prisma.barbero.findFirst({
        where: { sucursal: { tenantId }, id: req.ctx!.barberoId || '__unlinked__' }
      });
      barberoId = ownBarber ? ownBarber.id : 'unauthorized-barber-filter';
    }

    const comisiones = await prisma.comision.findMany({
      where: {
        tenantId,
        ...(sucursalId ? { venta: { sucursalId } } : {}),
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


const settlementHandler = (payroll: boolean) => async (req: AuthenticatedRequest, res: any) => {
  try { res.json(await settleCommissions(req.ctx as any, req.body, payroll)); }
  catch (error: any) { res.status(error instanceof SaleError ? error.statusCode : 503).json({ code: error instanceof SaleError ? error.code : 'FINANCIAL_RESULT_UNKNOWN', error: error instanceof SaleError ? error.message : 'Resultado no confirmado. Reintenta la misma liquidación.' }); }
};
comisionesRouter.post('/pagar', requireRole('DUENO', 'GERENTE'), settlementHandler(false));
comisionesRouter.post('/liquidar-nomina', requireRole('DUENO', 'GERENTE'), requirePlanCapability('COMMISSION_SETTLEMENTS', 'Las liquidaciones avanzadas de comisiones'), settlementHandler(true));

// A16: Historical Payroll Settlements Query
comisionesRouter.get('/nominas', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const userRole = req.ctx!.rol;
    const { barberoId } = req.query as { barberoId?: string };

    const whereClause: any = { tenantId };

    if (userRole === 'BARBERO') {
      const dbBarbero = await prisma.barbero.findFirst({
        where: { id: req.ctx!.barberoId || '__unlinked__', sucursal: { tenantId } }
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


// ==========================================
// SYSTECH STUDIO - SUPER ADMIN ROUTES
// Global SaaS platform metrics and tenant management
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { licenseQuote, changeLocalLicense, isLicensePlan } from '../services/license-catalog.service';

export const adminRouter = Router();

// Apply auth and Super Admin role requirement to all admin routes
adminRouter.use(requireAuth, requireRole('SUPER_ADMIN'));

// Global SaaS Metrics (MRR, Churn, Active accounts, Plan breakdown)
adminRouter.get('/metrics', async (req: AuthenticatedRequest, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { slug: { not: 'systech-global' } },
      include: { suscripcion: true, sucursales: true, citas: true }
    });

    const totalAccounts = tenants.length;
    const activeAccounts = tenants.filter(t => t.estado === 'ACTIVO').length;
    const atRiskAccounts = tenants.filter(t => t.estado === 'EN_RIESGO').length;
    const suspendedAccounts = tenants.filter(t => t.estado === 'SUSPENDIDO').length;
    const canceledAccounts = tenants.filter(t => t.estado === 'CANCELADO').length;

    const basicoCount = tenants.filter(t => t.plan === 'BASICO').length;
    const proCount = tenants.filter(t => t.plan === 'PRO').length;

    const mrr = tenants.reduce((sum, t) => {
      if (t.estado === 'ACTIVO' || t.estado === 'EN_RIESGO') {
        const mensual = t.suscripcion?.montoMensual ? Number(t.suscripcion.montoMensual) : licenseQuote(t.plan).totalMxn;
        return sum + mensual;
      }
      return sum;
    }, 0);

    const arr = mrr * 12;
    const churnRate = totalAccounts > 0 ? ((canceledAccounts + suspendedAccounts) / totalAccounts) * 100 : 0;

    const totalBarberos = await prisma.barbero.count();
    const totalCitas = await prisma.cita.count();
    const totalVentasMonto = await prisma.venta.aggregate({
      _sum: { total: true }
    });

    res.json({
      mrr,
      arr,
      churnRate: Number(churnRate.toFixed(1)),
      totalAccounts,
      activeAccounts,
      atRiskAccounts,
      suspendedAccounts,
      canceledAccounts,
      plansBreakdown: {
        basico: basicoCount,
        pro: proCount,
        cadena: tenants.filter(t => t.plan === 'CADENA').length
      },
      platformVolume: {
        totalBarberos,
        totalCitas,
        totalVentasMonto: Number(totalVentasMonto._sum.total || 0)
      }
    });
  } catch (error) {
    console.error('Error en /admin/metrics:', error);
    res.status(500).json({ error: 'Error al obtener métricas globales' });
  }
});

// List all tenants with branches and subscription details
adminRouter.get('/tenants', async (req: AuthenticatedRequest, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { slug: { not: 'systech-global' } },
      include: {
        suscripcion: true,
        sucursales: {
          include: { barberos: true }
        },
        usuarios: {
          select: { id: true, nombre: true, email: true, rol: true }
        }
      },
      orderBy: { fechaCreacion: 'desc' }
    });

    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes SaaS' });
  }
});

// Update tenant subscription status (ACTIVO, EN_RIESGO, SUSPENDIDO, CANCELADO)
adminRouter.put('/tenants/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { estado, motivo } = req.body;
    const adminEmail = req.ctx?.email || 'admin@systech.com';

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { estado }
    });

    await prisma.suscripcion.upsert({
      where: { tenantId: id },
      update: {
        estadoPago: estado === 'ACTIVO' ? 'active' : estado === 'EN_RIESGO' ? 'past_due' : estado === 'SUSPENDIDO' ? 'suspended' : 'canceled',
        fechaSuspension: estado === 'SUSPENDIDO' ? new Date() : null
      },
      create: {
        tenantId: id,
        estadoPago: estado === 'ACTIVO' ? 'active' : 'suspended',
        montoMensual: licenseQuote(tenant.plan).totalMxn
      }
    });

    await prisma.auditoriaLog.create({
      data: {
        tenantId: id,
        usuarioEmail: adminEmail,
        accion: `CAMBIO_ESTADO_${estado}`,
        detalles: motivo || `Estado de cuenta modificado a ${estado} por Super Admin`
      }
    });

    res.json({ message: `Estado actualizado a ${estado}`, tenant });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar estado del tenant' });
  }
});

// Update tenant plan (Upgrade to PRO / Downgrade to BASICO)
adminRouter.put('/tenants/:id/plan', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    const adminEmail = req.ctx?.email || 'admin@systech.com';

    if (!isLicensePlan(plan)) return res.status(400).json({ code: 'INVALID_LICENSE_PLAN', error: 'Plan inválido.' });
    const tenant = await changeLocalLicense(id, plan, adminEmail);

    res.json({ message: `Plan actualizado a ${plan}`, tenant });
  } catch (error) { next(error); }
});

// Audit Logs list
adminRouter.get('/auditorias', async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await prisma.auditoriaLog.findMany({
      take: 100,
      orderBy: { fecha: 'desc' },
      include: { tenant: { select: { nombre: true, slug: true } } }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener bitácora de auditoría' });
  }
});

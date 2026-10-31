// ======================================================================
// SYSTECH STUDIO - SUSCRIPCIÓN & STRIPE BILLING ROUTES
// Production Subscription Management, Webhook, Dunning & Coupons
// ======================================================================

import { Router, Request, Response } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { StripeBillingService, stripe } from '../services/stripe.service';
import { createLicenseCheckout, billingAppUrl } from '../services/billing-checkout.service';
import { getPublicLicenseCatalog, getLicensePlan, licenseQuote, isLicensePlan, getLicenseUsage, changeLocalLicense } from '../services/license-catalog.service';

export const suscripcionRouter = Router();

// ======================================================================
// 1. PUBLIC WEBHOOK ENDPOINT (NO JWT AUTH REQUIRED)
// ======================================================================
suscripcionRouter.post('/webhook', async (req: Request, res: Response) => {
  let event;
  try {
    event = StripeBillingService.constructWebhookEvent((req as any).rawBody, String(req.headers['stripe-signature'] || ''));
  } catch {
    return res.status(400).json({ error: 'Evento de Stripe no válido.' });
  }
  try {
    return res.json(await StripeBillingService.processWebhookEvent(event, prisma));
  } catch {
    return res.status(500).json({ error: 'No fue posible procesar el evento. Stripe puede reintentarlo.' });
  }
});

// ======================================================================
// 2. AUTHENTICATED ENDPOINTS (REQUIRE JWT)
// ======================================================================
suscripcionRouter.get('/catalogo', (_req, res, next) => {
  try { res.json(getPublicLicenseCatalog()); } catch (error) { next(error); }
});
suscripcionRouter.use(requireAuth);

// Get Current Subscription Details
suscripcionRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const tenant = req.ctx!.tenant;
    const plan = getLicensePlan(tenant.plan);

    const sub = await prisma.suscripcion.findUnique({
      where: { tenantId }
    });

    res.json({
      tenant: {
        id: tenant.id,
        nombre: tenant.nombre,
        plan: tenant.plan,
        estado: tenant.estado,
        limiteSucursales: plan.branchLimit,
        limiteBarberos: plan.barbersPerBranch
      },
      catalogo: getPublicLicenseCatalog(),
      capacidad: await getLicenseUsage(prisma, tenantId, plan),
      suscripcion: sub || {
        montoMensual: licenseQuote(tenant.plan).totalMxn,
        estadoPago: 'trialing',
        diasGracia: 3
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar suscripción' });
  }
});

// Validate Coupon
suscripcionRouter.post('/validar-cupon', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { codigo } = req.body;

    if (!codigo) {
      return res.status(400).json({ error: 'El código de cupón es requerido' });
    }

    const resultado = await StripeBillingService.validarCupon(codigo, tenantId, prisma);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: 'Error al validar cupón' });
  }
});

// License checkout and portal are owner-only. SYSTECH never collects card data.
suscripcionRouter.post('/crear-checkout-session', requireRole('DUENO'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { plan, codigoCupon } = req.body;
    if (!isLicensePlan(plan) || (codigoCupon !== undefined && (typeof codigoCupon !== 'string' || codigoCupon.length > 100))) {
      return res.status(400).json({ error: 'Plan o cupón inválido.' });
    }
    res.json(await createLicenseCheckout(req.ctx!.tenantId, plan, codigoCupon));
  } catch (error) { next(error); }
});

suscripcionRouter.post('/portal-cliente', requireRole('DUENO'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const sub = await prisma.suscripcion.findUnique({ where: { tenantId: req.ctx!.tenantId } });
    if (!stripe || !sub?.stripeCustomerId) return res.status(409).json({ error: 'El portal estará disponible después de conectar Stripe y activar una licencia.' });
    const session = await stripe.billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: billingAppUrl() + '/app/suscripcion' });
    res.json({ success: true, portalUrl: session.url });
  } catch (error) { next(error); }
});

// Upgrade / Downgrade Plan
// C3 FIX: Requires DUENO role. In production, requires real Stripe checkout; directly modifying plan only in test/dev
suscripcionRouter.post('/cambiar-plan', requireRole('DUENO'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { nuevoPlan } = req.body;
    const isProd = process.env.NODE_ENV === 'production';

    if (!isLicensePlan(nuevoPlan)) {
      return res.status(400).json({ error: 'Plan inválido. Selecciona Esencial, Pro o Cadena.' });
    }

    if (isProd) {
      const existing = await prisma.suscripcion.findUnique({ where: { tenantId } });
      if (existing?.stripeSubscriptionId && existing.estadoPago !== 'canceled') {
        return res.status(409).json({ error: 'Administra tu plan en el portal de facturación de tu suscripción actual.' });
      }
      return res.json({ ...(await createLicenseCheckout(tenantId, nuevoPlan)), requiresPayment: true });
    }

    const tenant = await changeLocalLicense(tenantId, nuevoPlan, req.ctx!.email);

    res.json({ message: `Plan cambiado a ${nuevoPlan}`, tenant });
  } catch (error) { next(error); }
});

// Run Dunning Job
// C3 FIX: Restrict to SUPER_ADMIN or verified cron secret header
suscripcionRouter.post('/ejecutar-dunning', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cronSecretHeader = req.headers['x-cron-secret'];
    const isAuthorizedCron = (process.env.CRON_SECRET && cronSecretHeader === process.env.CRON_SECRET) ||
      (process.env.NODE_ENV !== 'production'); // In dev/test allow execution for test suites
    const isSuperAdmin = req.ctx?.rol === 'SUPER_ADMIN';

    if (!isAuthorizedCron && !isSuperAdmin) {
      return res.status(403).json({
        code: 'FORBIDDEN_DUNNING',
        error: 'El proceso global de dunning solo puede ser ejecutado por SUPER_ADMIN o el scheduler del sistema.'
      });
    }

    const resultado = await StripeBillingService.ejecutarDunning(prisma);
    res.json({
      success: true,
      resultado
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al ejecutar dunning' });
  }
});

// Simulate Payment / Webhook Event (STRICTLY GATED FOR NON-PRODUCTION)
suscripcionRouter.post('/simular-pago', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        code: 'FORBIDDEN_IN_PRODUCTION',
        error: 'La simulación de pagos está estrictamente deshabilitada en el entorno de producción'
      });
    }

    const tenantId = req.ctx!.tenantId;
    const { accion } = req.body;

    let nuevoEstadoTenant = 'ACTIVO';
    let nuevoEstadoPago = 'active';

    if (accion === 'PAGO_FALLIDO') {
      nuevoEstadoTenant = 'EN_RIESGO';
      nuevoEstadoPago = 'past_due';

      await prisma.notificacionLog.create({
        data: {
          tenantId,
          tipo: 'SUSCRIPCION_RIESGO',
          canal: 'WHATSAPP',
          destinatario: 'Dueño',
          mensaje: '⚠️ Tu pago mensual no pudo ser procesado. Cuentas con 3 días de gracia antes de la suspensión de tu servicio.',
          estado: 'ENVIADO'
        }
      });
    } else if (accion === 'SUSPENDER') {
      nuevoEstadoTenant = 'SUSPENDIDO';
      nuevoEstadoPago = 'suspended';
    } else if (accion === 'PAGO_EXITOSO') {
      nuevoEstadoTenant = 'ACTIVO';
      nuevoEstadoPago = 'active';
    }

    const [t, s] = await prisma.$transaction([
      prisma.tenant.update({
        where: { id: tenantId },
        data: { estado: nuevoEstadoTenant }
      }),
      prisma.suscripcion.upsert({
        where: { tenantId },
        update: {
          estadoPago: nuevoEstadoPago,
          fechaUltimoCobro: accion === 'PAGO_EXITOSO' ? new Date() : undefined,
          fechaProximoCobro: accion === 'PAGO_EXITOSO' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined
        },
        create: {
          tenantId,
          estadoPago: nuevoEstadoPago,
          montoMensual: licenseQuote(req.ctx!.tenant.plan).totalMxn
        }
      })
    ]);

    res.json({ tenant: t, suscripcion: s });
  } catch (error) {
    res.status(500).json({ error: 'Error al simular pago' });
  }
});

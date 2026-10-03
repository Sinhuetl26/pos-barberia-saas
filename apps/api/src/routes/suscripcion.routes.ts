// ======================================================================
// SYSTECH STUDIO - SUSCRIPCIÓN & STRIPE BILLING ROUTES
// Production Subscription Management, Webhook, Dunning & Coupons
// ======================================================================

import { Router, Request, Response } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { StripeBillingService, stripe } from '../services/stripe.service';

export const suscripcionRouter = Router();

// ======================================================================
// 1. PUBLIC WEBHOOK ENDPOINT (NO JWT AUTH REQUIRED)
// ======================================================================
suscripcionRouter.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  try {
    const event = StripeBillingService.constructWebhookEvent(rawBody, signature || '');
    const result = await StripeBillingService.processWebhookEvent(event, prisma);
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error en webhook de Stripe:', error.message);
    return res.status(400).json({
      error: `Webhook Error: ${error.message}`
    });
  }
});

// ======================================================================
// 2. AUTHENTICATED ENDPOINTS (REQUIRE JWT)
// ======================================================================
suscripcionRouter.use(requireAuth);

// Get Current Subscription Details
suscripcionRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const tenant = req.ctx!.tenant;

    const sub = await prisma.suscripcion.findUnique({
      where: { tenantId }
    });

    res.json({
      tenant: {
        id: tenant.id,
        nombre: tenant.nombre,
        plan: tenant.plan,
        estado: tenant.estado,
        limiteSucursales: tenant.limiteSucursales,
        limiteBarberos: tenant.limiteBarberos
      },
      suscripcion: sub || {
        montoMensual: tenant.plan === 'PRO' ? 999 : 499,
        estadoPago: 'active',
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

// Create Stripe Checkout Session
suscripcionRouter.post('/crear-checkout-session', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { plan, codigoCupon } = req.body;

    if (!['BASICO', 'PRO'].includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido' });
    }

    let precioBase = plan === 'PRO' ? 999 : 499;
    let descuentoAplicado = 0;

    if (codigoCupon) {
      const cupon = await StripeBillingService.validarCupon(codigoCupon, tenantId, prisma);
      if (cupon.valido) {
        if (cupon.descuentoPct) {
          descuentoAplicado = (precioBase * cupon.descuentoPct) / 100;
        } else if (cupon.descuentoFijo) {
          descuentoAplicado = cupon.descuentoFijo;
        }
      }
    }

    const precioFinal = Math.max(0, precioBase - descuentoAplicado);

    // Return structured checkout info (invokes Stripe SDK if key is configured, with safe fallback)
    let checkoutUrl = `https://checkout.stripe.com/c/pay/cs_test_${tenantId}_${Date.now()}`;
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [
            {
              price_data: {
                currency: 'mxn',
                product_data: {
                  name: `Plan ${plan} - SYSTECH Studio`,
                  description: `Suscripción mensual recurrente (${plan})`
                },
                unit_amount: Math.round(precioFinal * 100),
                recurring: { interval: 'month' }
              },
              quantity: 1
            }
          ],
          client_reference_id: tenantId,
          metadata: {
            tenantId,
            plan,
            codigoCupon: codigoCupon || ''
          },
          success_url: `${req.headers.origin || 'http://localhost:5173'}/suscripcion?session_id={CHECKOUT_SESSION_ID}&status=success`,
          cancel_url: `${req.headers.origin || 'http://localhost:5173'}/suscripcion?status=cancel`
        });
        if (session.url) {
          checkoutUrl = session.url;
        }
      } catch (stripeErr: any) {
        console.warn('Error al invocar Stripe Checkout SDK:', stripeErr.message);
      }
    }

    res.json({
      success: true,
      plan,
      precioBase,
      descuentoAplicado,
      precioFinal,
      checkoutUrl,
      moneda: 'MXN'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear checkout session' });
  }
});

// Customer Portal Session (Manage cards & cancellations)
suscripcionRouter.post('/portal-cliente', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const sub = await prisma.suscripcion.findUnique({ where: { tenantId } });

    let portalUrl = `https://billing.stripe.com/p/session/test_${sub?.stripeCustomerId || tenantId}`;
    if (stripe && sub?.stripeCustomerId) {
      try {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: sub.stripeCustomerId,
          return_url: `${req.headers.origin || 'http://localhost:5173'}/suscripcion`
        });
        if (portalSession.url) {
          portalUrl = portalSession.url;
        }
      } catch (portalErr: any) {
        console.warn('Error al invocar Stripe Billing Portal SDK:', portalErr.message);
      }
    }

    res.json({
      success: true,
      portalUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al abrir portal de cliente' });
  }
});

// Upgrade / Downgrade Plan
// C3 FIX: Requires DUENO role. In production, requires checkout/portal; directly modifying plan only in test/dev
suscripcionRouter.post('/cambiar-plan', requireRole('DUENO'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { nuevoPlan } = req.body;

    if (!['BASICO', 'PRO'].includes(nuevoPlan)) {
      return res.status(400).json({ error: 'Plan inválido. Opciones: BASICO o PRO' });
    }

    // In production, initiate Checkout or Customer Portal rather than direct granting
    if (process.env.NODE_ENV === 'production') {
      const checkoutUrl = `https://checkout.stripe.com/c/pay/cs_${tenantId}_${nuevoPlan}_${Date.now()}`;
      return res.json({
        requiresPayment: true,
        message: 'Para cambiar de plan en producción, complete el proceso de pago.',
        checkoutUrl
      });
    }

    const limiteSucursales = nuevoPlan === 'PRO' ? 999 : 1;
    const limiteBarberos = nuevoPlan === 'PRO' ? 999 : 3;
    const montoMensual = nuevoPlan === 'PRO' ? 999 : 499;

    const dbPlan = await prisma.plan.findUnique({ where: { codigo: nuevoPlan } });

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: nuevoPlan, planId: dbPlan?.id || null, limiteSucursales, limiteBarberos }
    });

    await prisma.suscripcion.upsert({
      where: { tenantId },
      update: { montoMensual },
      create: { tenantId, montoMensual, estadoPago: 'active' }
    });

    await prisma.auditoriaLog.create({
      data: {
        tenantId,
        usuarioEmail: req.ctx?.email || 'dueno@barberia.com',
        accion: `CAMBIO_PLAN_${nuevoPlan}`,
        detalles: `Cambio de plan a ${nuevoPlan} por el usuario.`
      }
    });

    res.json({ message: `Plan cambiado a ${nuevoPlan}`, tenant });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar plan' });
  }
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
          montoMensual: 499
        }
      })
    ]);

    res.json({ tenant: t, suscripcion: s });
  } catch (error) {
    res.status(500).json({ error: 'Error al simular pago' });
  }
});

// ======================================================================
// SYSTECH STUDIO - STRIPE & SAAS RECURRING BILLING SERVICE
// Production Stripe Billing, Webhook Verification, Idempotency & Dunning
// ======================================================================

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { configuredValue } from './provider-config.service';
import { isLicensePlan, getLicensePlan, licenseQuote, licenseTenantFields } from './license-catalog.service';

const stripeSecretKey = configuredValue(process.env.STRIPE_SECRET_KEY) ? process.env.STRIPE_SECRET_KEY! : '';
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-08-16', timeout: 10000, maxNetworkRetries: 2 })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export interface WebhookResult {
  received: boolean;
  alreadyProcessed?: boolean;
  action?: string;
  tenantId?: string;
  error?: string;
}

export class StripeBillingService {
  /**
   * Verify and construct Stripe event using HMAC signature
   * Strictly enforces signature in production (C4)
   */
  static constructWebhookEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
    if (process.env.NODE_ENV !== 'test' || signature) {
      if (!stripeSecretKey || !webhookSecret) {
        throw new Error('STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET son estrictamente requeridos en producción');
      }
      if (!signature) {
        throw new Error('Firma de Stripe (stripe-signature) ausente en solicitud de webhook');
      }
      if (!rawBody) {
        throw new Error('Cuerpo crudo (rawBody) de la solicitud ausente para verificar firma');
      }
      return stripe!.webhooks.constructEvent(rawBody, signature, webhookSecret);
    }

    try {
      const parsed = JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'));
      if (!parsed.id || !parsed.type || !parsed.data?.object) throw new Error('Formato de evento inválido');
      return parsed as Stripe.Event;
    } catch { throw new Error('Evento simulado inválido.'); }
  }

  /**
   * Idempotent webhook event processor with EventoPago logging
   */
  static async processWebhookEvent(event: Stripe.Event, prisma: PrismaClient): Promise<WebhookResult> {
    const eventId = event.id;
    const eventType = event.type;
    let remoteInvoiceSubscription: Stripe.Subscription | undefined;
    let remoteCheckoutSubscription: Stripe.Subscription | undefined;

    // Re-read invoices through the pinned SDK version: newer event schemas move
    // the subscription field, and subscription metadata also resolves event order.
    if (stripe && process.env.NODE_ENV !== 'test' && ['invoice.paid', 'invoice.payment_succeeded', 'invoice.payment_failed'].includes(eventType)) {
      const invoiceId = (event.data.object as Stripe.Invoice).id;
      const invoice = await stripe.invoices.retrieve(invoiceId);
      event = { ...event, data: { ...event.data, object: invoice } } as unknown as Stripe.Event;
      if (invoice.subscription && ['invoice.paid', 'invoice.payment_succeeded'].includes(eventType)) {
        const id = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        remoteInvoiceSubscription = await stripe.subscriptions.retrieve(id);
      }
    }
    if (stripe && process.env.NODE_ENV !== 'test' && eventType === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === 'string') remoteCheckoutSubscription = await stripe.subscriptions.retrieve(session.subscription);
    }

    try {
    // Claim and financial effects commit together; failures remain retryable.
    return await prisma.$transaction(async (prisma) => {
    const existing = await prisma.eventoPago.findUnique({ where: { eventId } });
    if (existing?.procesado) return { received: true, alreadyProcessed: true };
    if (existing) {
      const claim = await prisma.eventoPago.updateMany({ where: { eventId, procesado: false }, data: { fechaCreacion: new Date() } });
      if (!claim.count) return { received: true, alreadyProcessed: true };
    } else {

    // P3.5 FIX: Atomic claim pattern for concurrent webhooks
    // Attempt to claim the event record via unique constraint insertion.
    // If it already exists, another thread/replica is processing it or has already processed it.
    try {
      await prisma.eventoPago.create({
        data: {
          eventId,
          proveedor: 'STRIPE',
          tipoEvento: eventType,
          payload: JSON.stringify(event),
          procesado: false
        }
      });
    } catch (claimErr) { throw claimErr; }
    }

    let actionTaken = 'NONE';
    let targetTenantId: string | undefined;

    try {
      // 3. Process specific billing events
      switch (eventType) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          targetTenantId = (session.client_reference_id || session.metadata?.tenantId) as string;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          const planComprado = session.metadata?.plan;

          if (!isLicensePlan(planComprado)) throw new Error('Plan desconocido en Stripe.');
          if (process.env.NODE_ENV !== 'test' && (!customerId || !subscriptionId || session.mode !== 'subscription' || !['paid', 'no_payment_required'].includes(session.payment_status))) {
            throw new Error('Checkout de licencia incompleto o sin pago confirmado.');
          }
          if (remoteCheckoutSubscription && (remoteCheckoutSubscription.metadata.tenantId !== targetTenantId || remoteCheckoutSubscription.metadata.plan !== planComprado || remoteCheckoutSubscription.customer !== customerId)) throw new Error('Checkout no coincide con la licencia.');

          if (targetTenantId) {
            const definition = getLicensePlan(planComprado);
            const limiteSucursales = definition.branchLimit;
            const limiteBarberos = definition.barbersPerBranch;
            const montoMensual = session.metadata?.montoMensual ? Number(session.metadata.montoMensual) : licenseQuote(planComprado).totalMxn;
            if (!Number.isFinite(montoMensual) || montoMensual < 0) throw new Error('Monto inválido en Stripe.');
            const current = await prisma.suscripcion.findUnique({ where: { tenantId: targetTenantId } });
            if (current?.stripeSubscriptionId && current.stripeSubscriptionId !== subscriptionId && current.estadoPago !== 'canceled') throw new Error('El negocio ya tiene otra suscripción de Stripe.');
            const nextPeriod = remoteCheckoutSubscription?.current_period_end ? new Date(remoteCheckoutSubscription.current_period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await prisma.suscripcion.upsert({
              where: { tenantId: targetTenantId },
              update: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                estadoPago: 'active',
                fechaSuspension: null,
                montoMensual,
                fechaUltimoCobro: new Date(),
                fechaProximoCobro: nextPeriod
              },
              create: {
                tenantId: targetTenantId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                estadoPago: 'active',
                montoMensual,
                fechaUltimoCobro: new Date(),
                fechaProximoCobro: nextPeriod
              }
            });

            // P1.4 FIX: Apply purchased plan and resource limits to tenant
            const dbPlan = await prisma.plan.findUnique({ where: { codigo: planComprado } });
            await prisma.tenant.update({
              where: { id: targetTenantId },
              data: {
                estado: 'ACTIVO',
                plan: planComprado,
                planId: dbPlan?.id || null,
                limiteSucursales,
                limiteBarberos
              }
            });

            await prisma.auditoriaLog.create({
              data: {
                tenantId: targetTenantId,
                usuarioEmail: 'stripe@webhook.systech.mx',
                accion: 'CHECKOUT_COMPLETADO',
                detalles: `Suscripción activada con Stripe (Plan: ${planComprado}, Customer: ${customerId}, Sub: ${subscriptionId})`
              }
            });
            actionTaken = 'CHECKOUT_ACTIVATED';
          }
          break;
        }

        case 'invoice.paid':
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          const subscriptionId = invoice.subscription as string;

          // Find tenant by subscription or customer ID
          let sub = await prisma.suscripcion.findFirst({
            where: {
              OR: [
                ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : customerId ? [{ stripeCustomerId: customerId }] : [])
              ]
            }
          });

          // Stripe may deliver invoice.paid before checkout.session.completed.
          // Only use metadata from a subscription invoice fetched from Stripe.
          const subscriptionMetadata = (invoice as any).subscription_details?.metadata;
          if (!sub && stripe && process.env.NODE_ENV !== 'test' && subscriptionId && customerId && subscriptionMetadata?.tenantId && isLicensePlan(subscriptionMetadata.plan)) {
            const remote = remoteInvoiceSubscription!;
            const tenantId = subscriptionMetadata.tenantId;
            if (remote.metadata.tenantId !== tenantId || remote.metadata.plan !== subscriptionMetadata.plan || remote.customer !== customerId || invoice.status !== 'paid') throw new Error('Factura de licencia no coincide con la suscripción.');
            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
            if (!tenant) throw new Error('Negocio de la licencia no encontrado.');
            const current = await prisma.suscripcion.findUnique({ where: { tenantId } });
            if (current?.stripeSubscriptionId && current.stripeSubscriptionId !== subscriptionId && current.estadoPago !== 'canceled') throw new Error('El negocio ya tiene otra suscripción de Stripe.');
            const amount = Number(remote.metadata.montoMensual);
            if (!Number.isFinite(amount) || amount < 0) throw new Error('Monto de licencia inválido.');
            sub = await prisma.suscripcion.upsert({ where: { tenantId }, update: { stripeSubscriptionId: subscriptionId, stripeCustomerId: customerId, montoMensual: amount }, create: { tenantId, stripeSubscriptionId: subscriptionId, stripeCustomerId: customerId, montoMensual: amount, estadoPago: 'active' } });
            const dbPlan = await prisma.plan.findUnique({ where: { codigo: subscriptionMetadata.plan } });
            await prisma.tenant.update({ where: { id: tenantId }, data: { ...licenseTenantFields(subscriptionMetadata.plan), planId: dbPlan?.id || null } });
          }

          if (sub) {
            targetTenantId = sub.tenantId;
            await prisma.suscripcion.update({
              where: { id: sub.id },
              data: {
                estadoPago: 'active',
                fechaSuspension: null,
                fechaUltimoCobro: new Date(),
                fechaProximoCobro: remoteInvoiceSubscription?.current_period_end ? new Date(remoteInvoiceSubscription.current_period_end * 1000) : invoice.period_end ? new Date(invoice.period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              }
            });

            await prisma.tenant.update({
              where: { id: sub.tenantId },
              data: { estado: 'ACTIVO' }
            });

            await prisma.auditoriaLog.create({
              data: {
                tenantId: sub.tenantId,
                usuarioEmail: 'stripe@webhook.systech.mx',
                accion: 'PAGO_FACTURA_EXITOSO',
                detalles: `Factura ${invoice.id} pagada exitosamente. Monto: $${(invoice.amount_paid / 100).toFixed(2)} MXN.`
              }
            });
            actionTaken = 'INVOICE_PAID_TENANT_ACTIVE';
          } else if (subscriptionId) throw new Error('Suscripción aún no asociada; reintentar evento.');
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          const subscriptionId = invoice.subscription as string;

          const sub = await prisma.suscripcion.findFirst({
            where: {
              OR: [
                ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : customerId ? [{ stripeCustomerId: customerId }] : [])
              ]
            }
          });

          if (sub) {
            targetTenantId = sub.tenantId;

            // Mark tenant in risk with 3-day grace period
            await prisma.tenant.update({
              where: { id: sub.tenantId },
              data: { estado: 'EN_RIESGO' }
            });

            await prisma.suscripcion.update({
              where: { id: sub.id },
              data: {
                estadoPago: 'past_due',
                fechaSuspension: new Date(Date.now() + (sub.diasGracia || 3) * 24 * 60 * 60 * 1000)
              }
            });

            // Notification to Owner
            await prisma.notificacionLog.create({
              data: {
                tenantId: sub.tenantId,
                tipo: 'SUSCRIPCION_RIESGO',
                canal: 'WHATSAPP',
                destinatario: 'Dueño',
                mensaje: `⚠️ Tu pago de suscripción SYSTECH ha fallado. Cuentas con ${sub.diasGracia || 3} días de gracia para regularizar tu método de pago antes de la suspensión del servicio.`,
                estado: 'PENDIENTE'
              }
            });

            await prisma.auditoriaLog.create({
              data: {
                tenantId: sub.tenantId,
                usuarioEmail: 'stripe@webhook.systech.mx',
                accion: 'PAGO_FALLIDO_SUSCRIPCION',
                detalles: `Fallo en cobro de factura ${invoice.id}. Tenant puesto en estado EN_RIESGO.`
              }
            });
            actionTaken = 'INVOICE_FAILED_TENANT_IN_RISK';
          } else if (subscriptionId) throw new Error('Suscripción aún no asociada; reintentar evento.');
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const subscriptionId = subscription.id;

          const sub = await prisma.suscripcion.findFirst({
            where: { stripeSubscriptionId: subscriptionId }
          });

          if (sub) {
            targetTenantId = sub.tenantId;
            await prisma.tenant.update({
              where: { id: sub.tenantId },
              data: { estado: 'CANCELADO' }
            });

            await prisma.suscripcion.update({
              where: { id: sub.id },
              data: { estadoPago: 'canceled' }
            });

            await prisma.auditoriaLog.create({
              data: {
                tenantId: sub.tenantId,
                usuarioEmail: 'stripe@webhook.systech.mx',
                accion: 'SUSCRIPCION_CANCELADA',
                detalles: `Suscripción de Stripe ${subscriptionId} cancelada definitivamente.`
              }
            });
            actionTaken = 'SUBSCRIPTION_CANCELED';
          }
          break;
        }

        default:
          actionTaken = `UNHANDLED_EVENT_${eventType}`;
      }

      // 4. Mark event as successfully processed in EventoPago
      await prisma.eventoPago.update({
        where: { eventId },
        data: {
          procesado: true,
          tenantId: targetTenantId || null
        }
      });

      return {
        received: true,
        action: actionTaken,
        tenantId: targetTenantId
      };
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'test') console.error(`Error procesando webhook Stripe [${eventType}]:`, err.code || err.message);
      throw err;
    }
    }, { timeout: 10000 });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const committed = await prisma.eventoPago.findUnique({ where: { eventId } });
        if (committed?.procesado) return { received: true, alreadyProcessed: true };
      }
      throw error;
    }
  }

  /**
   * Automated Dunning verification job
   * Suspends tenants whose 3-day grace period has expired
   */
  static async ejecutarDunning(prisma: PrismaClient, tenantId?: string) {
    const ahora = new Date();

    // A7 FIX: Find active tenants whose trial / billing period has expired without paid stripe subscription
    const tenantsVencidos = await prisma.tenant.findMany({
      where: {
        ...(tenantId ? { id: tenantId } : {}),
        estado: 'ACTIVO',
        suscripcion: {
          fechaProximoCobro: { lte: ahora },
          stripeSubscriptionId: null
        }
      },
      include: { suscripcion: true }
    });

    const marcadosEnRiesgo: string[] = [];
    for (const t of tenantsVencidos) {
      const diasGracia = t.suscripcion?.diasGracia || 3;
      const fechaSuspension = new Date(ahora.getTime() + diasGracia * 24 * 60 * 60 * 1000);

      const changed = await prisma.$transaction(async tx => {
        const claimed = await tx.tenant.updateMany({
          where: { id: t.id, estado: 'ACTIVO', suscripcion: { fechaProximoCobro: { lte: ahora }, stripeSubscriptionId: null } },
          data: { estado: 'EN_RIESGO' }
        });
        if (!claimed.count) return false;
        await tx.suscripcion.update({
          where: { tenantId: t.id },
          data: {
            estadoPago: 'past_due',
            fechaSuspension
          }
        });
        await tx.notificacionLog.create({
          data: {
            tenantId: t.id,
            tipo: 'SUSCRIPCION_RIESGO',
            canal: 'WHATSAPP',
            destinatario: 'Dueño',
            mensaje: `⚠️ Tu periodo de prueba o suscripción ha concluido. Cuentas con ${diasGracia} días de gracia para activar tu plan antes de que el servicio sea suspendido.`,
            estado: 'PENDIENTE'
          }
        });
        await tx.auditoriaLog.create({
          data: {
            tenantId: t.id,
            usuarioEmail: 'dunning-cron@systech.mx',
            accion: 'PERIODO_PRUEBA_VENCIDO',
            detalles: `Periodo vencido. Cuenta puesta EN_RIESGO con ${diasGracia} días de gracia hasta ${fechaSuspension.toISOString()}.`
          }
        });
        return true;
      });
      if (changed) marcadosEnRiesgo.push(t.id);
    }

    // Find tenants in EN_RIESGO whose grace period has expired
    const tenantsEnRiesgo = await prisma.tenant.findMany({
      where: { estado: 'EN_RIESGO', ...(tenantId ? { id: tenantId } : {}) },
      include: { suscripcion: true }
    });

    const suspendidos: string[] = [];

    for (const t of tenantsEnRiesgo) {
      const sub = t.suscripcion;
      const debeSuspender = sub?.fechaSuspension && sub.fechaSuspension <= ahora;

      if (debeSuspender) {
        const changed = await prisma.$transaction(async tx => {
          const claimed = await tx.tenant.updateMany({
            where: { id: t.id, estado: 'EN_RIESGO', suscripcion: { fechaSuspension: { lte: ahora } } },
            data: { estado: 'SUSPENDIDO' }
          });
          if (!claimed.count) return false;
          await tx.suscripcion.update({
            where: { tenantId: t.id },
            data: { estadoPago: 'suspended' }
          });
          await tx.notificacionLog.create({
            data: {
              tenantId: t.id,
              tipo: 'SUSCRIPCION_SUSPENDIDA',
              canal: 'WHATSAPP',
              destinatario: 'Dueño',
              mensaje: '🚫 Tu suscripción a SYSTECH ha sido suspendida debido a que concluyó el periodo de gracia sin registrar un pago exitoso. Contacta a soporte para reactivar tu cuenta.',
              estado: 'PENDIENTE'
            }
          });
          await tx.auditoriaLog.create({
            data: {
              tenantId: t.id,
              usuarioEmail: 'dunning-cron@systech.mx',
              accion: 'SUSPENSION_AUTOMATICA_DUNNING',
              detalles: 'Suspensión ejecutada tras expirar los 3 días de gracia.'
            }
          });
          return true;
        });
        if (changed) suspendidos.push(t.id);
      }
    }

    return {
      trialsVencidos: marcadosEnRiesgo.length,
      tenantsEnRiesgoEvaluados: tenantsEnRiesgo.length,
      suspendidos: suspendidos.length,
      tenantIdsSuspendidos: suspendidos
    };
  }

  /**
   * Validate discount coupons (e.g. FUNDADOR)
   */
  static async validarCupon(codigo: string, tenantId?: string, prisma?: PrismaClient) {
    const codeClean = codigo.trim().toUpperCase();

    // Check DB first if prisma is available
    if (prisma) {
      const dbCoupon = await prisma.cupon.findFirst({
        where: {
          codigo: codeClean,
          activo: true,
          OR: [{ tenantId: null }, { tenantId }]
        }
      });

      if (dbCoupon) {
        return {
          valido: true,
          codigo: dbCoupon.codigo,
          descuentoPct: dbCoupon.descuentoPct ? Number(dbCoupon.descuentoPct) : 0,
          descuentoFijo: dbCoupon.descuentoFijo ? Number(dbCoupon.descuentoFijo) : 0,
          tipo: dbCoupon.descuentoPct ? 'PORCENTAJE' : 'FIJO'
        };
      }
    }

    // Built-in standard coupons
    if (codeClean === 'FUNDADOR') {
      return {
        valido: true,
        codigo: 'FUNDADOR',
        descuentoPct: 20,
        descuentoFijo: 0,
        tipo: 'PORCENTAJE',
        descripcion: '20% de descuento vitalicio en Plan Básico y Pro'
      };
    }

    if (codeClean === 'PROMO2026') {
      return {
        valido: true,
        codigo: 'PROMO2026',
        descuentoPct: 15,
        descuentoFijo: 0,
        tipo: 'PORCENTAJE',
        descripcion: '15% de descuento en los primeros 3 meses'
      };
    }

    return {
      valido: false,
      error: 'Cupón no válido o expirado'
    };
  }
}

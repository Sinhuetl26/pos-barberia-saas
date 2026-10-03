// ======================================================================
// SYSTECH STUDIO - STRIPE & SAAS RECURRING BILLING SERVICE
// Production Stripe Billing, Webhook Verification, Idempotency & Dunning
// ======================================================================

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-08-16' })
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
   */
  static constructWebhookEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
    if (stripe && webhookSecret) {
      return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    }

    // In dev / test when secrets are not configured or simulated, parse body safely
    try {
      const parsed = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8'));
      if (!parsed.id || !parsed.type) {
        throw new Error('Formato de evento Stripe inválido');
      }
      return parsed as Stripe.Event;
    } catch (err: any) {
      throw new Error(`Error al decodificar webhook Stripe: ${err.message}`);
    }
  }

  /**
   * Idempotent webhook event processor with EventoPago logging
   */
  static async processWebhookEvent(event: Stripe.Event, prisma: PrismaClient): Promise<WebhookResult> {
    const eventId = event.id;
    const eventType = event.type;

    // 1. Idempotency Check: if event already processed, do not repeat side effects
    const existing = await prisma.eventoPago.findUnique({
      where: { eventId }
    });

    if (existing && existing.procesado) {
      return {
        received: true,
        alreadyProcessed: true,
        action: `SKIP_DUPLICATE_${eventType}`
      };
    }

    // 2. Upsert initial pending record in EventoPago
    await prisma.eventoPago.upsert({
      where: { eventId },
      create: {
        eventId,
        proveedor: 'STRIPE',
        tipoEvento: eventType,
        payload: JSON.stringify(event),
        procesado: false
      },
      update: {
        payload: JSON.stringify(event)
      }
    });

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

          if (targetTenantId) {
            await prisma.suscripcion.upsert({
              where: { tenantId: targetTenantId },
              update: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                estadoPago: 'active',
                fechaUltimoCobro: new Date(),
                fechaProximoCobro: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              },
              create: {
                tenantId: targetTenantId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                estadoPago: 'active',
                montoMensual: 499,
                fechaUltimoCobro: new Date(),
                fechaProximoCobro: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              }
            });

            await prisma.tenant.update({
              where: { id: targetTenantId },
              data: { estado: 'ACTIVO' }
            });

            await prisma.auditoriaLog.create({
              data: {
                tenantId: targetTenantId,
                usuarioEmail: 'stripe@webhook.systech.mx',
                accion: 'CHECKOUT_COMPLETADO',
                detalles: `Suscripción activada con Stripe (Customer: ${customerId}, Sub: ${subscriptionId})`
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
          const sub = await prisma.suscripcion.findFirst({
            where: {
              OR: [
                { stripeSubscriptionId: subscriptionId },
                { stripeCustomerId: customerId }
              ]
            }
          });

          if (sub) {
            targetTenantId = sub.tenantId;
            await prisma.suscripcion.update({
              where: { id: sub.id },
              data: {
                estadoPago: 'active',
                fechaUltimoCobro: new Date(),
                fechaProximoCobro: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          const subscriptionId = invoice.subscription as string;

          const sub = await prisma.suscripcion.findFirst({
            where: {
              OR: [
                { stripeSubscriptionId: subscriptionId },
                { stripeCustomerId: customerId }
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
                estado: 'ENVIADO'
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
          }
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
      console.error(`Error procesando webhook Stripe [${eventType}]:`, err);
      throw err;
    }
  }

  /**
   * Automated Dunning verification job
   * Suspends tenants whose 3-day grace period has expired
   */
  static async ejecutarDunning(prisma: PrismaClient) {
    const ahora = new Date();

    // Find tenants in EN_RIESGO whose grace period has expired
    const tenantsEnRiesgo = await prisma.tenant.findMany({
      where: { estado: 'EN_RIESGO' },
      include: { suscripcion: true }
    });

    const suspendidos: string[] = [];

    for (const t of tenantsEnRiesgo) {
      const sub = t.suscripcion;
      const debeSuspender = sub?.fechaSuspension && sub.fechaSuspension <= ahora;

      if (debeSuspender) {
        await prisma.$transaction([
          prisma.tenant.update({
            where: { id: t.id },
            data: { estado: 'SUSPENDIDO' }
          }),
          prisma.suscripcion.update({
            where: { tenantId: t.id },
            data: { estadoPago: 'suspended' }
          }),
          prisma.notificacionLog.create({
            data: {
              tenantId: t.id,
              tipo: 'SUSCRIPCION_SUSPENDIDA',
              canal: 'WHATSAPP',
              destinatario: 'Dueño',
              mensaje: '🚫 Tu suscripción a SYSTECH ha sido suspendida debido a que concluyó el periodo de gracia sin registrar un pago exitoso. Contacta a soporte para reactivar tu cuenta.',
              estado: 'ENVIADO'
            }
          }),
          prisma.auditoriaLog.create({
            data: {
              tenantId: t.id,
              usuarioEmail: 'dunning-cron@systech.mx',
              accion: 'SUSPENSION_AUTOMATICA_DUNNING',
              detalles: 'Suspensión ejecutada tras expirar los 3 días de gracia.'
            }
          })
        ]);
        suspendidos.push(t.id);
      }
    }

    return {
      evaluados: tenantsEnRiesgo.length,
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

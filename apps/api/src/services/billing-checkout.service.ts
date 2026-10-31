import { prisma } from '@systech/database';
import { publicAppOrigin, licenseCheckoutReadiness } from './provider-config.service';
import { stripe, StripeBillingService } from './stripe.service';
import { LicensePlanCode, getLicensePlan, licenseQuote, licenseCatalogVersion, configuredLicensePrice, withLicenseLock, assertPlanFits, licenseError } from './license-catalog.service';

export function billingAppUrl() {
  return publicAppOrigin();
}

export async function createLicenseCheckout(tenantId: string, plan: LicensePlanCode, codigoCupon?: string) {
  const definition = getLicensePlan(plan);
  const quote = licenseQuote(plan);
  if (!stripe) throw Object.assign(new Error('El cobro de licencias todavía no está conectado. Configura Stripe para continuar.'), { status: 503 });
  if (process.env.NODE_ENV === 'production' && (!/^sk_live_/.test(process.env.STRIPE_SECRET_KEY || '') || quote.policy === 'PENDIENTE' || process.env.LICENSE_FISCAL_REVIEWED !== 'true')) {
    throw licenseError(503, 'LIVE_BILLING_NOT_READY', 'El cobro de producción requiere cuenta live y política fiscal revisada.');
  }
  if (process.env.NODE_ENV === 'production' && codigoCupon) throw licenseError(503, 'LICENSE_PROMOTIONS_NOT_READY', 'Las promociones de producción requieren condiciones y configuración verificadas antes de cobrar.');
  const configuredPrice = configuredLicensePrice(plan);
  if (!configuredPrice) throw licenseError(503, 'LICENSE_PRICE_NOT_CONFIGURED', `El precio de ${definition.name} aún no está conectado para este entorno.`);
  const readiness = licenseCheckoutReadiness(plan);
  if (!readiness.ready) throw licenseError(503, 'LICENSE_CONNECTION_NOT_READY', readiness.issues.join(' '));
  await withLicenseLock(tenantId, tx => assertPlanFits(tx, tenantId, plan));
  const subscription = await prisma.suscripcion.findUnique({ where: { tenantId } });
  if (subscription?.stripeSubscriptionId && subscription.estadoPago !== 'canceled') {
    throw Object.assign(new Error('Esta cuenta ya tiene una suscripción. Administra el plan desde el portal de facturación para evitar cargos duplicados.'), { status: 409 });
  }
  const precioBase = quote.totalMxn;
  let descuentoAplicado = 0;
  if (codigoCupon) {
    const coupon = await StripeBillingService.validarCupon(codigoCupon, tenantId, prisma);
    if (!coupon.valido) throw Object.assign(new Error('El cupón no es válido.'), { status: 400 });
    // Coupons with limited duration need Stripe Promotion Codes; never silently
    // convert a three-month offer into a permanent discounted subscription.
    if (coupon.codigo === 'PROMO2026') throw Object.assign(new Error('Este cupón requiere una promoción temporal configurada en Stripe.'), { status: 400 });
    descuentoAplicado = coupon.descuentoPct ? precioBase * coupon.descuentoPct / 100 : coupon.descuentoFijo || 0;
  }
  const precioFinal = Math.max(0, precioBase - descuentoAplicado);
  const metadata = { tenantId, plan, codigoCupon: codigoCupon || '', montoMensual: String(precioFinal), catalogVersion: licenseCatalogVersion, taxPolicy: quote.policy };
  const base = billingAppUrl();
  // Use the catalog price when available; verify it before charging a license.
  if (configuredPrice && !codigoCupon) {
    const price = await stripe.prices.retrieve(configuredPrice);
    if (!price.active || price.currency !== 'mxn' || price.unit_amount !== Math.round(precioBase * 100) || price.recurring?.interval !== 'month' || price.recurring?.interval_count !== 1) {
      throw Object.assign(new Error('El precio de Stripe no coincide con la licencia mensual. Revisa la configuración.'), { status: 503 });
    }
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription', payment_method_types: ['card'],
    ...(subscription?.stripeCustomerId ? { customer: subscription.stripeCustomerId } : {}),
    line_items: !codigoCupon ? [{ price: configuredPrice, quantity: 1 }] : [{ price_data: { currency: 'mxn', product_data: { name: definition.name }, unit_amount: Math.round(precioFinal * 100), recurring: { interval: 'month' } }, quantity: 1 }],
    client_reference_id: tenantId, metadata, subscription_data: { metadata },
    success_url: `${base}/app/suscripcion?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/app/suscripcion?status=cancel`,
  }, { idempotencyKey: `license-${tenantId}-${plan}-${Math.round(precioFinal * 100)}-${Math.floor(Date.now() / 1800000)}` });
  if (!session.url) throw Object.assign(new Error('Stripe no devolvió una sesión de pago.'), { status: 502 });
  return { success: true, plan, precioBase, descuentoAplicado, precioFinal, quote, catalogVersion: licenseCatalogVersion, checkoutUrl: session.url, moneda: 'MXN' };
}

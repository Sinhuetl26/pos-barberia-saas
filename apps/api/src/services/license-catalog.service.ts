import { prisma, Prisma } from '@systech/database';
import { configuredValue, licenseCheckoutReadiness } from './provider-config.service';

export type LicensePlanCode = 'BASICO' | 'PRO' | 'CADENA';
export type LicenseCapability = 'CORE_OPERATIONS' | 'BASIC_REPORTS' | 'DATA_EXPORT' | 'BARBER_ACCESS' | 'PUBLIC_BOOKING' | 'STAFF_ROLES' | 'ADVANCED_REPORTS' | 'AUDIT_TRAIL' | 'DISCOUNT_APPROVALS' | 'PROFESSIONAL_PRICING' | 'COMMISSION_SETTLEMENTS' | 'PRIORITY_SUPPORT' | 'MULTI_BRANCH';
export interface LicensePlan {
  code: LicensePlanCode; name: string; monthlyBaseMxn: number;
  branchLimit: number; barbersPerBranch: number; subtitle: string; features: string[]; capabilities: LicenseCapability[];
}
// Kept as JSON so API, browser and isolated fixtures consume the same definitions.
const catalog: { version: string; currency: string; interval: string; tax: { defaultPolicy: string; exclusiveRateBps: number; notice: string }; plans: LicensePlan[] } = require('../../../../packages/licensing/catalog.json');
export const licensePlans = catalog.plans;
export const licenseCatalogVersion = catalog.version;
export const licenseError = (status: number, code: string, message: string) => Object.assign(new Error(message), { status, code });
export function isLicensePlan(value: unknown): value is LicensePlanCode {
  return typeof value === 'string' && licensePlans.some(p => p.code === value);
}
export function getLicensePlan(value: unknown): LicensePlan {
  const plan = licensePlans.find(p => p.code === value);
  if (!plan) throw licenseError(400, 'INVALID_LICENSE_PLAN', 'Plan desconocido. Selecciona Esencial, Pro o Cadena.');
  return plan;
}
export function hasLicenseCapability(value: unknown, capability: LicenseCapability) {
  return getLicensePlan(value).capabilities.includes(capability);
}
export function licenseQuote(value: unknown) {
  const plan = getLicensePlan(value);
  const policy = process.env.LICENSE_TAX_POLICY || catalog.tax.defaultPolicy;
  if (!['PENDIENTE', 'IVA_INCLUIDO', 'MAS_IVA_16'].includes(policy)) throw licenseError(503, 'INVALID_TAX_POLICY', 'La configuración fiscal de la licencia no es válida.');
  const baseCents = Math.round(plan.monthlyBaseMxn * 100);
  const extraTaxCents = policy === 'MAS_IVA_16' ? Math.round(baseCents * catalog.tax.exclusiveRateBps / 10000) : 0;
  const totalCents = baseCents + extraTaxCents;
  const taxCents = policy === 'IVA_INCLUIDO' ? Math.round(baseCents * catalog.tax.exclusiveRateBps / (10000 + catalog.tax.exclusiveRateBps)) : extraTaxCents;
  return { baseMxn: plan.monthlyBaseMxn, netMxn: (totalCents - taxCents) / 100, totalMxn: totalCents / 100, totalCents, taxMxn: taxCents / 100, policy,
    label: policy === 'MAS_IVA_16' ? 'Precio base más IVA; total indicado antes del pago.' : policy === 'IVA_INCLUIDO' ? 'IVA incluido.' : 'Importe de prueba. Tratamiento fiscal pendiente de revisión.' };
}
export function stripePriceVariable(code: LicensePlanCode) {
  return `STRIPE_PRICE_${code}${process.env.NODE_ENV === 'production' ? '_LIVE' : '_TEST'}`;
}
export function configuredLicensePrice(code: LicensePlanCode) {
  // Legacy aliases are sandbox-only; production never borrows a test price.
  const value = process.env[stripePriceVariable(code)] || (process.env.NODE_ENV !== 'production' ? process.env[`STRIPE_PRICE_${code}`] : '') || '';
  return configuredValue(value) && /^price_[A-Za-z0-9_]+$/.test(value) ? value : '';
}
export function getPublicLicenseCatalog() {
  return { version: catalog.version, currency: catalog.currency, interval: catalog.interval, taxNotice: catalog.tax.notice,
    plans: licensePlans.map(plan => { const readiness = licenseCheckoutReadiness(plan.code); return { ...plan, quote: licenseQuote(plan.code), checkoutConfigured: readiness.ready, checkoutUnavailableReason: readiness.issues[0] || null }; }) };
}
export function licenseTenantFields(value: unknown) {
  const plan = getLicensePlan(value);
  return { plan: plan.code, limiteSucursales: plan.branchLimit, limiteBarberos: plan.barbersPerBranch };
}
export type LicenseTransaction = Prisma.TransactionClient;
// First operation is a write lock on this tenant. Capacity checks and mutations
// commit together; no count-then-create gap between concurrent HTTP requests.
export async function withLicenseLock<T>(tenantId: string, work: (tx: LicenseTransaction, plan: LicensePlan) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const locked = await tx.$executeRaw`UPDATE "Tenant" SET "id" = "id" WHERE "id" = ${tenantId}`;
        if (!locked) throw licenseError(404, 'TENANT_NOT_FOUND', 'Negocio no encontrado.');
        const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
        return work(tx, getLicensePlan(tenant.plan));
      }, { maxWait: 5000, timeout: 10000 });
    } catch (error: any) {
      if (attempt >= 2 || !['P2034', 'P1008', 'P2028'].includes(error.code)) throw error;
      await new Promise(resolve => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
}
export async function assertBranchCapacity(tx: LicenseTransaction, tenantId: string, plan: LicensePlan) {
  const used = await tx.sucursal.count({ where: { tenantId, eliminadoEn: null } });
  if (used >= plan.branchLimit) throw licenseError(403, 'PLAN_BRANCH_LIMIT', `${plan.name} permite ${plan.branchLimit} sucursal(es). Revisa tu capacidad antes de añadir otra.`);
}
export async function assertBarberCapacity(tx: LicenseTransaction, sucursalId: string, plan: LicensePlan) {
  const used = await tx.barbero.count({ where: { sucursalId, activo: true, eliminadoEn: null } });
  if (used >= plan.barbersPerBranch) throw licenseError(403, 'PLAN_LIMIT_REACHED', `${plan.name} permite ${plan.barbersPerBranch} barberos activos por sucursal. Desactiva uno o revisa tu plan.`);
}
export async function getLicenseUsage(tx: LicenseTransaction, tenantId: string, plan: LicensePlan) {
  const [branches, advancedStaff] = await Promise.all([
    tx.sucursal.findMany({ where: { tenantId, eliminadoEn: null }, select: { id: true, nombre: true, barberos: { where: { activo: true, eliminadoEn: null }, select: { id: true } } } }),
    tx.usuario.count({ where: { tenantId, activo: true, eliminadoEn: null, rol: { in: ['GERENTE', 'CAJERO'] } } })
  ]);
  return { branches: branches.length, branchLimit: plan.branchLimit, barbersPerBranch: plan.barbersPerBranch,
    locations: branches.map(b => ({ id: b.id, name: b.nombre, activeBarbers: b.barberos.length, exceedsCapacity: b.barberos.length > plan.barbersPerBranch })),
    advancedStaff, staffRolesAllowed: plan.capabilities.includes('STAFF_ROLES'),
    exceedsCapacity: branches.length > plan.branchLimit || branches.some(b => b.barberos.length > plan.barbersPerBranch) || advancedStaff > 0 && !plan.capabilities.includes('STAFF_ROLES') };
}
export async function assertPlanFits(tx: LicenseTransaction, tenantId: string, value: unknown) {
  const plan = getLicensePlan(value);
  if ((await getLicenseUsage(tx, tenantId, plan)).exceedsCapacity) throw licenseError(409, 'PLAN_CAPACITY_CONFLICT', 'La capacidad o los roles activos exceden el plan elegido. Desactiva personal avanzado o resuelve las sucursales excedentes antes de cambiar; tus datos se conservan.');
}
export async function changeLocalLicense(tenantId: string, value: unknown, email: string) {
  const next = getLicensePlan(value);
  return withLicenseLock(tenantId, async tx => {
    const existing = await tx.suscripcion.findUnique({ where: { tenantId } });
    if (process.env.NODE_ENV === 'production' && existing?.stripeSubscriptionId && existing.estadoPago !== 'canceled') throw licenseError(409, 'STRIPE_PLAN_MANAGED', 'La suscripción activa se administra desde Stripe; no puede modificarse localmente.');
    await assertPlanFits(tx, tenantId, next.code);
    const dbPlan = await tx.plan.findUnique({ where: { codigo: next.code } });
    const tenant = await tx.tenant.update({ where: { id: tenantId }, data: { ...licenseTenantFields(next.code), planId: dbPlan?.id || null } });
    const montoMensual = licenseQuote(next.code).totalMxn;
    await tx.suscripcion.upsert({ where: { tenantId }, update: { montoMensual }, create: { tenantId, montoMensual, estadoPago: 'trialing' } });
    await tx.auditoriaLog.create({ data: { tenantId, usuarioEmail: email, accion: `CAMBIO_PLAN_${next.code}`, detalles: `Catálogo ${catalog.version}; ${next.branchLimit} sucursales, ${next.barbersPerBranch} barberos por sucursal. Sin eliminación de datos.` } });
    return tenant;
  });
}

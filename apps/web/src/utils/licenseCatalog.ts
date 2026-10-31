import catalog from '../../../../packages/licensing/catalog.json';
export type LicensePlanCode = 'BASICO' | 'PRO' | 'CADENA';
export type LicenseCapability = 'CORE_OPERATIONS' | 'BASIC_REPORTS' | 'DATA_EXPORT' | 'BARBER_ACCESS' | 'PUBLIC_BOOKING' | 'STAFF_ROLES' | 'ADVANCED_REPORTS' | 'AUDIT_TRAIL' | 'DISCOUNT_APPROVALS' | 'PROFESSIONAL_PRICING' | 'COMMISSION_SETTLEMENTS' | 'PRIORITY_SUPPORT' | 'MULTI_BRANCH';
export const licensePlans = catalog.plans as Array<{code: LicensePlanCode; name: string; monthlyBaseMxn: number; branchLimit: number; barbersPerBranch: number; subtitle: string; features: string[]; capabilities: LicenseCapability[]}>;
export const licensePlan = (code: string) => licensePlans.find(p => p.code === code);
export const hasLicenseCapability = (code: string, capability: LicenseCapability) => !!licensePlan(code)?.capabilities.includes(capability);
export const capacityLabel = (value: string | { branchLimit: number; barbersPerBranch: number }) => {
  const plan = typeof value === 'string' ? licensePlan(value) : value;
  return plan ? `${plan.branchLimit} sucursal${plan.branchLimit === 1 ? '' : 'es'} · ${plan.barbersPerBranch} barberos activos por sucursal` : 'Plan por revisar';
};
export interface PublicLicensePlan {
  code: LicensePlanCode; name: string; monthlyBaseMxn: number; branchLimit: number;
  barbersPerBranch: number; subtitle: string; features: string[]; capabilities: LicenseCapability[]; checkoutConfigured: boolean; checkoutUnavailableReason?: string | null;
  quote: { baseMxn: number; totalMxn: number; taxMxn: number; policy: string; label: string };
}
export interface PublicLicenseCatalog { version: string; currency: string; plans: PublicLicensePlan[]; taxNotice: string }

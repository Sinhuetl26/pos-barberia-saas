import { LicensePlanCode, capacityLabel } from '../utils/licenseCatalog';
import { useLicenseCatalog } from '../utils/useLicenseCatalog';
import { formatCurrency } from '../utils/formatters';

export function LicensePlanSelector({ value, onChange }: { value: LicensePlanCode; onChange: (plan: LicensePlanCode) => void }) {
  const { catalog, error } = useLicenseCatalog();
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!catalog) return <p role="status" className="text-sm text-stone-500">Cargando planes…</p>;
  return <div className="grid gap-2">
    {catalog.plans.map(plan => <button key={plan.code} type="button" aria-pressed={value === plan.code} onClick={() => onChange(plan.code)} className={`text-left p-3 rounded-xl border ${value === plan.code ? 'border-stone-900 bg-stone-100' : 'border-stone-200 bg-white'}`}>
      <span className="flex justify-between gap-3 text-sm font-semibold"><span>{plan.name}</span><span>{formatCurrency(plan.quote.totalMxn)} / mes</span></span>
      <span className="block text-xs text-stone-600 mt-1">{capacityLabel(plan)}</span>
      <span className="block text-xs text-stone-500 mt-1">{plan.quote.label}</span>
    </button>)}
  </div>;
}

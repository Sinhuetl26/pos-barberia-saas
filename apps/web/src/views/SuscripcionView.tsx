import { useEffect, useState } from 'react';
import { CreditCard, Check, ArrowUpRight, Crown, ShieldCheck, AlertCircle, RefreshCw, Receipt } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { formatCurrency } from '../utils/formatters';
import { LicensePlanCode, capacityLabel, licensePlan, PublicLicensePlan } from '../utils/licenseCatalog';
import '../styles/secondary-workspaces.css';

interface Props { onPlanChanged?: () => void }
export function SuscripcionView({ onPlanChanged }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [search] = useSearchParams();
  const returnStatus = search.get('status');
  const load = async () => {
    setLoading(true); setError('');
    try { setData(await api.getSuscripcion()); } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (returnStatus !== 'success') return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const refreshConfirmation = async () => {
      try {
        const current = await api.getSuscripcion();
        if (stopped) return;
        setData(current);
        if (current.suscripcion?.stripeSubscriptionId && current.suscripcion.estadoPago === 'active') return;
      } catch { /* Keep the last known license; the manual refresh remains available. */ }
      if (!stopped && ++attempts < 15) timer = setTimeout(refreshConfirmation, 2000);
    };
    refreshConfirmation();
    return () => { stopped = true; clearTimeout(timer); };
  }, [returnStatus]);
  const checkout = async (plan: LicensePlanCode) => {
    setBusy(true); setError('');
    try {
      const result = await api.crearCheckoutSession(plan, coupon.trim() || undefined);
      if (!result.checkoutUrl) throw new Error('No se pudo iniciar el pago.');
      window.location.assign(result.checkoutUrl);
    } catch (err: any) { setError(err.message); setBusy(false); }
  };
  const portal = async () => {
    setBusy(true); setError('');
    try {
      const result = await api.portalCliente();
      if (!result.portalUrl) throw new Error('El portal no está disponible.');
      window.location.assign(result.portalUrl);
    } catch (err: any) { setError(err.message); setBusy(false); }
  };
  const sub = data?.suscripcion;
  const activeStripe = Boolean(sub?.stripeSubscriptionId && sub.estadoPago !== 'canceled');
  const statuses: Record<string, string> = { active: 'Activa', trialing: 'Periodo de prueba', past_due: 'Pago pendiente', suspended: 'Suspendida', canceled: 'Cancelada' };
  return <div className="studio-page studio-license secondary-workspace license-workspace">
    <div className="flex items-end justify-between mb-7 gap-4"><div><h1 className="studio-title mt-2">Plan y licencia</h1><p className="text-sm text-stone-500 mt-2">Capacidad, funciones y facturación de tu barbería.</p></div><button onClick={async () => { await load(); onPlanChanged?.(); }} disabled={loading} className="studio-icon-button" aria-label="Actualizar suscripción"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
    {error && <div role="alert" className="mb-5 bg-red-50 text-red-800 rounded-xl p-4 text-sm flex gap-2"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>}
    {returnStatus === 'success' && <div role="status" className="bg-[#edf4ef] text-[#19352c] rounded-xl p-4 text-sm mb-5">{activeStripe && sub.estadoPago === 'active' ? 'Tu licencia está activa. Puedes administrar tu facturación desde aquí.' : 'Esperando la confirmación de Stripe. Tu licencia se actualizará automáticamente; si tarda, puedes actualizar el estado.'}</div>}
    {search.get('status') === 'cancel' && <p role="status" className="text-sm text-stone-500 mb-5">El proceso de pago se canceló. Puedes retomarlo cuando quieras.</p>}
    {loading && !data && <p className="text-sm text-stone-500 py-8">Consultando tu licencia…</p>}
    {data && <>
      <section className="studio-panel p-6 mb-7 flex flex-wrap gap-5 justify-between items-center"><div><div className="studio-eyebrow">LICENCIA ACTUAL</div><div className="flex items-center gap-3 mt-2"><h2 className="text-2xl font-semibold">{licensePlan(data.tenant.plan)?.name || data.tenant.plan}</h2><span className="studio-pill">{statuses[sub?.estadoPago] || data.tenant.estado}</span></div><p className="text-xs text-stone-500 mt-3">{formatCurrency(sub?.montoMensual)} MXN / mes · {data.tenant.limiteSucursales} sucursales · {data.tenant.limiteBarberos} barberos activos por sucursal</p>{sub?.fechaProximoCobro && <p className="text-xs text-stone-500 mt-2">{activeStripe ? 'Próximo periodo' : 'Fin del periodo de acceso'}: {new Date(sub.fechaProximoCobro).toLocaleDateString('es-MX')}</p>}{sub?.fechaSuspension && sub?.estadoPago === 'past_due' && <p className="text-xs text-amber-700 mt-2">Regulariza antes del {new Date(sub.fechaSuspension).toLocaleDateString('es-MX')}.</p>}</div><button onClick={portal} disabled={busy || !sub?.stripeCustomerId} className="studio-button"><CreditCard className="w-4 h-4" />Administrar facturación<ArrowUpRight className="w-4 h-4" /></button></section>
      {data.capacidad?.exceedsCapacity && <p role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-4 mb-5 text-sm">Tu capacidad activa excede el plan actual. Conservamos tu historial; revisa las sucursales y el personal antes de añadir plazas o reducir el plan.</p>}
      <div className="mb-5 max-w-2xl">
        <h2 className="text-lg font-semibold text-stone-900">Elige según cómo trabajas</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">Esencial opera toda la barbería. Pro añade equipo, delegación y controles avanzados.</p>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 max-w-6xl">
        {(data.catalogo?.plans || []).map((plan: PublicLicensePlan) => <section key={plan.code} className={`studio-panel p-7 flex flex-col ${plan.code === 'PRO' ? 'ring-1 ring-[#a78b60]/50' : ''}`}>
          <div className="flex justify-between"><Crown className="w-6 h-6 text-[#a78b60]" /><div className="flex gap-2">{plan.code === 'PRO' && <span className="studio-pill">Para equipos</span>}{data.tenant.plan === plan.code && <span className="studio-pill">Tu plan</span>}</div></div>
          <h2 className="text-xl font-semibold mt-5">{plan.name}</h2><p className="text-xs text-stone-500 mt-2">{plan.subtitle}</p>
          <div className="mt-6"><span className="text-3xl font-semibold">{formatCurrency(plan.quote.totalMxn)}</span><span className="text-xs text-stone-400 ml-2">MXN / mes</span></div>
          <p className="text-xs text-stone-500 mt-3">{plan.quote.label}</p><p className="text-sm mt-5">{capacityLabel(plan)}</p>
          <ul className="space-y-3 mt-5 text-xs text-stone-600 flex-1">{plan.features.map(feature => <li key={feature} className="flex gap-2"><Check className="w-4 h-4 shrink-0 text-[#698472]" />{feature}</li>)}</ul>
          {!activeStripe && !plan.checkoutConfigured && plan.checkoutUnavailableReason && <p className="text-xs text-amber-800 mt-5" role="status">{plan.checkoutUnavailableReason}</p>}
          <button className="studio-button w-full mt-7" disabled={busy || (!activeStripe && !plan.checkoutConfigured)} onClick={() => activeStripe ? portal() : checkout(plan.code)}>{busy ? 'Preparando…' : activeStripe ? 'Administrar mi suscripción' : plan.checkoutConfigured ? `Activar ${plan.name}` : 'Pago pendiente de conexión'}<ArrowUpRight className="w-4 h-4" /></button>
        </section>)}
      </div>
      {!activeStripe && <div className="mt-6 max-w-md"><label htmlFor="license-coupon" className="text-xs text-stone-500">¿Tienes un código de descuento?</label><input id="license-coupon" value={coupon} maxLength={100} onChange={e => setCoupon(e.target.value)} placeholder="Código opcional" className="mt-2 block w-full border border-stone-200 bg-white rounded-lg p-3 text-sm" /></div>}
      <div className="flex gap-2 mt-7 text-xs text-stone-500 leading-6"><ShieldCheck className="w-4 h-4 mt-1 shrink-0" /><p>Los datos de tarjeta se ingresan en Stripe. El cobro de tu licencia es independiente de los pagos de tus clientes. Los servicios externos pueden tener costos adicionales.</p></div>
      <section className="studio-panel p-6 mt-7"><div className="flex gap-3"><Receipt className="w-5 h-5 text-[#9c845f]" /><div><h2 className="text-sm font-semibold">Recibos de suscripción</h2><p className="text-xs text-stone-500 leading-6 mt-2">Los recibos reales de tus pagos se consultan en el portal de facturación. La emisión de CFDI de la barbería requiere conectar y validar su configuración fiscal.</p></div></div></section>
    </>}
  </div>;
}

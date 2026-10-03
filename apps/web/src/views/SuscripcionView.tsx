import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Building2,
  Lock,
  ArrowRight,
  Receipt,
  Download,
  Check,
  Calendar,
  X
} from 'lucide-react';

interface SuscripcionViewProps {
  onPlanChanged?: () => void;
}

export const SuscripcionView: React.FC<SuscripcionViewProps> = ({ onPlanChanged }) => {
  const [data, setData] = useState<any>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<'BASICO' | 'PRO'>('PRO');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'spei'>('card');
  const [processing, setProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState('CARLOS MENDOZA');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  // Coupon State
  const [codigoCupon, setCodigoCupon] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState<any>(null);
  const [errorCupon, setErrorCupon] = useState<string | null>(null);

  useEffect(() => {
    loadSub();
  }, []);

  const loadSub = async () => {
    try {
      const res = await api.getSuscripcion();
      setData(res);
      if (res?.tenant?.plan) {
        setCheckoutPlan(res.tenant.plan);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleValidarCupon = async () => {
    if (!codigoCupon.trim()) return;
    setErrorCupon(null);
    try {
      const res = await api.validarCupon(codigoCupon.trim());
      if (res.valido) {
        setCuponAplicado(res);
      } else {
        setCuponAplicado(null);
        setErrorCupon(res.error || 'Cupón inválido');
      }
    } catch {
      setErrorCupon('Error al verificar cupón');
    }
  };

  const handleOpenPortal = async () => {
    try {
      const res = await api.portalCliente();
      if (res.portalUrl) {
        window.open(res.portalUrl, '_blank');
      }
    } catch (e: any) {
      alert(e.message || 'Error al abrir portal de facturación');
    }
  };

  const handleCambiarPlan = async (nuevoPlan: 'BASICO' | 'PRO') => {
    try {
      await api.cambiarPlan(nuevoPlan);
      loadSub();
      if (onPlanChanged) onPlanChanged();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // Inicia sesión en pasarela segura Stripe Checkout
      const res = await api.crearCheckoutSession(checkoutPlan, codigoCupon || undefined);
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }

      setProcessing(false);
      setCheckoutSuccess(true);

      setTimeout(() => {
        setCheckoutSuccess(false);
        setShowCheckoutModal(false);
        loadSub();
        if (onPlanChanged) onPlanChanged();
      }, 1500);
    } catch (err: any) {
      setProcessing(false);
      alert(err.message || 'Error al iniciar sesión en pasarela de pago');
    }
  };

  if (!data) return null;

  const currentPlan = data.tenant.plan;
  const estado = data.tenant.estado;
  const monto = data.suscripcion?.montoMensual || (currentPlan === 'PRO' ? 999 : 499);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-luxury-in font-sans">
      
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center mb-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
          Facturación Mensual Recurrente
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 mt-1">
          Planes & Membresía
        </h1>
        <p className="text-xs text-stone-500 mt-1.5">
          Cobro anticipado mensual. Escala tu cadena o barbería boutique sin límites de datos.
        </p>
      </div>

      {/* Account Status Card */}
      <div className="max-w-4xl mx-auto mb-8 bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Tu Membresía Comercial</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-stone-900">Plan {currentPlan}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                estado === 'ACTIVO'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : estado === 'EN_RIESGO'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {estado}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Monto mensual contratado: <strong className="font-mono text-stone-900">${monto} MXN</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPortal}
              className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition flex items-center gap-1.5"
              title="Portal de facturación seguro para actualizar tarjetas y consultar recibos"
            >
              <Receipt className="w-3.5 h-3.5 text-stone-600" />
              <span>Portal de Pagos</span>
            </button>
            <button
              onClick={() => {
                setCheckoutPlan(currentPlan);
                setShowCheckoutModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{estado !== 'ACTIVO' ? 'Regularizar Pago' : 'Gestionar / Cambiar'}</span>
            </button>
          </div>
        </div>

        {/* Warning if at risk or suspended */}
        {estado === 'EN_RIESGO' && (
          <div className="mt-4 bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Pago pendiente detectado</div>
              <div>Cuentas con <strong>3 días de gracia</strong> antes de la suspensión temporal. Puedes pagar ahora para mantener activo el servicio.</div>
            </div>
          </div>
        )}

        {estado === 'SUSPENDIDO' && (
          <div className="mt-4 bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Suscripción actualmente suspendida</div>
              <div>Realiza tu pago en la pasarela segura para reactivar el sistema inmediatamente. Tus datos e historial permanecen seguros.</div>
            </div>
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
        
        {/* Basic */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-stone-900 text-base">Plan Básico</h3>
              {currentPlan === 'BASICO' && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 border border-stone-200">
                  Plan Actual
                </span>
              )}
            </div>

            <div className="mb-5">
              <span className="text-3xl font-black text-stone-900 font-mono">$499</span>
              <span className="text-xs text-stone-500 ml-1">MXN / mes</span>
            </div>

            <ul className="space-y-2.5 text-xs text-stone-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>1 Sucursal</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>Hasta 3 Barberos</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>Punto de Venta & Recibo térmico</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>Agenda interactiva y portal de reservas</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>Inventario y Kardex de productos</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-stone-100">
            {currentPlan === 'BASICO' ? (
              <span className="block text-center text-xs text-stone-400 py-2 font-semibold">Plan Activo</span>
            ) : (
              <button
                onClick={() => handleCambiarPlan('BASICO')}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-semibold border border-stone-200 transition"
              >
                Cambiar a Plan Básico
              </button>
            )}
          </div>
        </div>

        {/* Pro */}
        <div className="bg-white border-2 border-stone-900 rounded-2xl p-6 flex flex-col justify-between shadow-md relative">
          <div className="absolute -top-3 right-5">
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-stone-900 text-white shadow-xs">
              MÁS POPULAR
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 text-base">Plan Pro</h3>
              </div>
              {currentPlan === 'PRO' && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Plan Actual
                </span>
              )}
            </div>

            <div className="mb-5">
              <span className="text-3xl font-black text-stone-900 font-mono">$999</span>
              <span className="text-xs text-stone-500 ml-1">MXN / mes</span>
            </div>

            <ul className="space-y-2.5 text-xs text-stone-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span><strong>Sucursales Ilimitadas</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span><strong>Barberos Ilimitados</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>Inventario con Kardex y alertas</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>Nómina y comisiones automatizadas</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>Recordatorios WhatsApp Pro (24h y 2h)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-stone-900 shrink-0" />
                <span>Reportes financieros de analítica avanzada</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-stone-100">
            {currentPlan === 'PRO' ? (
              <span className="block text-center text-xs text-stone-500 py-2 font-semibold">Plan Activo</span>
            ) : (
              <button
                onClick={() => {
                  setCheckoutPlan('PRO');
                  setShowCheckoutModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
              >
                Hacer Upgrade al Plan Pro →
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Invoices History Table */}
      <div className="max-w-4xl mx-auto bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-stone-900">Historial de Facturación & Recibos</h3>
            <p className="text-[11px] text-stone-500">Comprobantes fiscales y recibos de suscripción de tu barbería.</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 rounded bg-stone-100 text-stone-600 border border-stone-200">
            CFDI 4.0 Simulado
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-50 text-stone-500 text-[10px] uppercase border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-3">Folio</th>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Concepto</th>
                <th className="py-2.5 px-3">Monto</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr>
                <td className="py-3 px-3 font-mono text-stone-900 font-medium">SYS-FAC-2026-001</td>
                <td className="py-3 px-3 text-stone-600">Hoy</td>
                <td className="py-3 px-3 text-stone-900 font-medium">Membresía Mensual {currentPlan}</td>
                <td className="py-3 px-3 font-mono font-bold text-stone-900">${monto} MXN</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    PAGADO
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => alert(`Descargando comprobante fiscal SYS-FAC-2026-001 ($${monto} MXN)`)}
                    className="inline-flex items-center gap-1 text-xs text-stone-700 hover:text-stone-950 font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative my-8">
            
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-stone-100 bg-stone-50/50">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Pasarela Segura SSL 256-bit</span>
              </div>
              <h2 className="text-lg font-bold text-stone-900">
                Pagar Suscripción SYSTECH
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Selecciona tu método de pago preferido para {checkoutPlan === 'PRO' ? 'Plan Pro ($999/mes)' : 'Plan Básico ($499/mes)'}.
              </p>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleProcessCheckout} className="p-6 space-y-4">
              
              {checkoutSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>¡Pago procesado con éxito! Tu cuenta está completamente activa.</span>
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      paymentMethod === 'card'
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Tarjeta Bancaria</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('spei')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      paymentMethod === 'spei'
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>SPEI / Transferencia</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'card' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Número de Tarjeta</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Titular de la Tarjeta</label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="NOMBRE EN LA TARJETA"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs uppercase text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Vencimiento</label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/AA"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">CVC / CVV</label>
                      <input
                        type="text"
                        required
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        placeholder="123"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-2">
                  <div className="font-bold text-stone-900">Transferencia Electrónica SPEI</div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Banco:</span>
                    <span className="font-semibold text-stone-900">STP / BBVA México</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">CLABE Interbancaria:</span>
                    <span className="font-mono font-bold text-stone-900">646180123400987654</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Beneficiario:</span>
                    <span className="font-semibold text-stone-900">SYSTECH SAAS MX</span>
                  </div>
                  <p className="text-[10px] text-stone-500 pt-1">
                    La reactivación es inmediata una vez detectada la transferencia.
                  </p>
                </div>
              )}

              {/* Coupon Field */}
              <div className="pt-2 border-t border-stone-100">
                <label className="block text-xs font-semibold text-stone-700 mb-1">Cupón de Descuento (Ej. FUNDADOR)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codigoCupon}
                    onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                    placeholder="FUNDADOR"
                    className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono uppercase text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                  <button
                    type="button"
                    onClick={handleValidarCupon}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition"
                  >
                    Aplicar
                  </button>
                </div>
                {cuponAplicado && (
                  <div className="mt-1.5 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{cuponAplicado.descripcion || `Descuento del ${cuponAplicado.descuentoPct}% aplicado`}</span>
                  </div>
                )}
                {errorCupon && (
                  <div className="mt-1 text-[11px] text-rose-600 font-medium">
                    {errorCupon}
                  </div>
                )}
              </div>

              {/* Total to Pay */}
              {(() => {
                const precioBase = checkoutPlan === 'PRO' ? 999 : 499;
                const descuentoMonto = cuponAplicado
                  ? (cuponAplicado.descuentoPct ? (precioBase * cuponAplicado.descuentoPct) / 100 : cuponAplicado.descuentoFijo || 0)
                  : 0;
                const precioFinal = Math.max(0, precioBase - descuentoMonto);

                return (
                  <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                    <div>
                      <span className="text-xs text-stone-500 font-medium block">Total a liquidar hoy:</span>
                      {descuentoMonto > 0 && (
                        <span className="text-[10px] text-emerald-600 font-semibold block">Ahorro cupón: -${descuentoMonto.toFixed(2)} MXN</span>
                      )}
                    </div>
                    <div className="text-right">
                      {descuentoMonto > 0 && (
                        <span className="text-xs text-stone-400 line-through mr-1 font-mono">${precioBase}</span>
                      )}
                      <span className="text-lg font-black font-mono text-stone-900">
                        ${precioFinal.toFixed(2)} MXN
                      </span>
                    </div>
                  </div>
                );
              })()}

              <button
                type="submit"
                disabled={processing || checkoutSuccess}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? 'Procesando en pasarela segura...' : 'Confirmar & Pagar'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

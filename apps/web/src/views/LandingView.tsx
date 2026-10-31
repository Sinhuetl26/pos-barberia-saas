import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LicensePlanCode, capacityLabel } from '../utils/licenseCatalog';
import { useLicenseCatalog } from '../utils/useLicenseCatalog';
import { formatCurrency } from '../utils/formatters';
import {
  Scissors,
  CheckCircle2,
  Calendar,
  CreditCard,
  Users,
  Package,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Zap,
  Clock,
  Smartphone,
  ChevronRight,
  HelpCircle,
  Star,
  DollarSign
} from 'lucide-react';

interface LandingViewProps {
  onStartTrial: (plan: LicensePlanCode) => void;
  onLogin: () => void;
  onLaunchDemo: (role?: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onStartTrial,
  onLogin,
  onLaunchDemo
}) => {
  const { catalog, error: catalogError } = useLicenseCatalog();
  const [barberosCount, setBarberosCount] = useState<number>(4);
  const [cortesPorDia, setCortesPorDia] = useState<number>(8);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // ROI calculations
  const precioPromedioCorte = 250;
  const noShowsRecuperadosMes = Math.round(barberosCount * cortesPorDia * 24 * 0.08); // 8% no-shows recovered
  const dineroExtraMes = noShowsRecuperadosMes * precioPromedioCorte;
  const horasAhorradasMes = Math.round(barberosCount * 8 + 14);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900 selection:bg-stone-900 selection:text-white font-sans">
      
      {/* Top Announcement Bar */}
      <div className="bg-stone-900 text-stone-200 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Impulsa tu barbería hoy: <strong>14 días de prueba gratuita</strong> con acceso total a todas las funciones Pro.</span>
        <button
          onClick={() => onStartTrial('PRO')}
          className="text-white underline underline-offset-4 hover:text-amber-300 font-semibold ml-1 cursor-pointer"
        >
          Probar Gratis →
        </button>
      </div>

      {/* Main Commercial Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center shadow-sm">
              <Scissors className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-stone-900">SYSTECH</span>
              <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                STUDIO
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-stone-600">
            <a href="#funciones" className="hover:text-stone-900 transition">Funciones</a>
            <a href="#roi" className="hover:text-stone-900 transition">Calculadora ROI</a>
            <a href="#precios" className="hover:text-stone-900 transition">Precios</a>
            <a href="#fundadores" className="hover:text-stone-900 transition">Programa Fundadores</a>
            <a href="#faq" className="hover:text-stone-900 transition">Preguntas</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onLogin}
              className="px-3.5 py-1.5 text-xs font-semibold text-stone-900 border border-stone-300 hover:bg-stone-50 rounded-lg transition"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => onStartTrial('PRO')}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <span>Prueba Gratis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>SaaS Diseñado Especialmente para Barberías de México & Latinoamérica</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-950 tracking-tight max-w-4xl mx-auto leading-[1.12]">
          Agenda, cobra y paga comisiones <span className="underline decoration-stone-300 underline-offset-8">sin libreta ni hojas de Excel</span>.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          Diseñado para barberías reales: cobro ágil en POS, portal de citas para Instagram/WhatsApp, control de caja con arqueo ciego y comisiones exactas al centavo.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onStartTrial('PRO')}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Comenzar Prueba Gratis (14 Días)</span>
          </button>
          <button
            onClick={onLogin}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-900 font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Iniciar Sesión</span>
            <ChevronRight className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        {/* Micro Guarantees */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-xs text-stone-500 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-stone-700" />
            <span>Sin tarjeta de crédito obligatoria</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-stone-700" />
            <span>Configura tu negocio paso a paso</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-stone-700" />
            <span>Cancela cuando quieras</span>
          </div>
        </div>

        {/* Verifiable Value Pillars Banner */}
        <div className="mt-14 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white rounded-2xl border border-stone-200/90 shadow-sm text-left">
          <div className="border-r border-stone-100 last:border-none pr-4">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-stone-900">14 Días</div>
            <div className="text-xs text-stone-500 mt-0.5">Prueba completa sin tarjeta</div>
          </div>
          <div className="border-r border-stone-100 last:border-none pr-4">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-stone-900">Cobro ágil</div>
            <div className="text-xs text-stone-500 mt-0.5">Cobro ágil en terminal POS</div>
          </div>
          <div className="border-r border-stone-100 last:border-none pr-4">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-stone-900">Arqueo Ciego</div>
            <div className="text-xs text-stone-500 mt-0.5">Control de faltantes en caja</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-stone-900">México</div>
            <div className="text-xs text-stone-500 mt-0.5">Hecho para barberías reales</div>
          </div>
        </div>

      </section>

      {/* Feature Showcase Grid */}
      <section id="funciones" className="py-16 bg-white border-y border-stone-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Módulos Especializados</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
              Diseñado exclusivamente para el flujo real de una barbería
            </h2>
            <p className="text-stone-600 text-sm mt-2">
              Olvídate de sistemas genéricos de restaurantes o abarrotes. Cada pantalla fue pensada para la velocidad entre cortes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-stone-50/70 border border-stone-200/80 hover:border-stone-300 transition hover:bg-stone-50">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center mb-4">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Punto de Venta Ultra Rápido</h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Cobro desde una sola pantalla. Admite pagos divididos (efectivo + tarjeta + transferencia), registro de propinas y cálculo exacto de cambio.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-200 text-[11px] font-semibold text-stone-800 flex items-center gap-1">
                <span>Impresión térmica 58/80mm y ticket digital por WhatsApp</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-stone-50/70 border border-stone-200/80 hover:border-stone-300 transition hover:bg-stone-50">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Portal Público de Auto-Reserva</h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Tus clientes reservan directamente desde un enlace limpio en tu Instagram o WhatsApp. Ven disponibilidad real por barbero sin encimar citas.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-200 text-[11px] font-semibold text-stone-800 flex items-center gap-1">
                <span>Sin contraseñas para el cliente • Confirmación inmediata</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-stone-50/70 border border-stone-200/80 hover:border-stone-300 transition hover:bg-stone-50">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Comisiones Automáticas por Barbero</h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Asigna esquemas diferenciados: por ejemplo 50% en cortes y 10% en productos capilares. Cada barbero ve su saldo en tiempo real y tú liquidas con 1 clic.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-200 text-[11px] font-semibold text-stone-800 flex items-center gap-1">
                <span>Cada comisión tiene un registro para revisarla</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-stone-50/70 border border-stone-200/80 hover:border-stone-300 transition hover:bg-stone-50">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Arqueo Ciego de Caja</h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Al cerrar turno, el personal debe declarar el efectivo físico sin conocer el saldo que el sistema calculó. El sistema delata descuadres al instante.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-200 text-[11px] font-semibold text-stone-800 flex items-center gap-1">
                <span>Diferencias de caja con movimientos para revisar</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-stone-50/70 border border-stone-200/80 hover:border-stone-300 transition hover:bg-stone-50">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Recordatorios WhatsApp Pro</h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Enlaces de recordatorio con los datos de la cita. El envío automático requiere conectar WhatsApp Business y aprobar las plantillas de cada barbería.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-200 text-[11px] font-semibold text-stone-800 flex items-center gap-1">
                <span>Mensajes con nombre, hora y barbero precargados</span>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-stone-50/70 border border-stone-200/80 hover:border-stone-300 transition hover:bg-stone-50">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center mb-4">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Inventario & Kardex Trazable</h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Control de existencias de ceras, minoxidil, navajas y toallas. Alertas visuales de stock mínimo y registro inmutable de entradas y mermas.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-200 text-[11px] font-semibold text-stone-800 flex items-center gap-1">
                <span>Descuento automático de stock con cada venta POS</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator Section */}
      <section id="roi" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="bg-stone-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-stone-800">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Calculadora de Retorno</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              ¿Cuánto dinero recupera tu barbería cada mes?
            </h2>
            <p className="text-stone-400 text-xs sm:text-sm mt-2">
              Ajusta el número de barberos y servicios diarios para estimar los ingresos adicionales por clientes recuperados y horas ahorradas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Sliders */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-semibold text-stone-300 mb-2">
                  <span>Barberos en tu equipo:</span>
                  <span className="text-amber-400 font-mono text-sm">{barberosCount} barberos</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={barberosCount}
                  onChange={(e) => setBarberosCount(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-stone-300 mb-2">
                  <span>Cortes promedio al día por barbero:</span>
                  <span className="text-amber-400 font-mono text-sm">{cortesPorDia} servicios</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="18"
                  value={cortesPorDia}
                  onChange={(e) => setCortesPorDia(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/80 text-xs text-stone-300">
                Basado en un precio promedio de <strong>$250 MXN</strong> por corte y una tasa de recuperación del <strong>8%</strong> de citas perdidas en un escenario hipotético. No hay una tasa de recuperación comprobada; el envío automático requiere conexión externa. <span className="text-stone-400 block mt-1 text-[11px]">(Estimación ilustrativa configurable con los números reales de tu salón).</span>
              </div>
            </div>

            {/* Results Cards */}
            <div className="bg-stone-800/90 rounded-2xl p-6 border border-stone-700 space-y-4">
              <div>
                <div className="text-xs text-stone-400 font-medium">Ingresos adicionales recuperados al mes:</div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 mt-1">
                  +${dineroExtraMes.toLocaleString('es-MX')} MXN
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  Escenario: recuperar ~{noShowsRecuperadosMes} citas al mes. No es una garantía de resultados.
                </div>
              </div>

              <div className="pt-4 border-t border-stone-700">
                <div className="text-xs text-stone-400 font-medium">Estimación ilustrativa de tiempo recuperado:</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  ~{horasAhorradasMes} horas al mes
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => onStartTrial('PRO')}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs transition shadow-sm"
                >
                  Recuperar estos ingresos con SYSTECH →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Matrix Section */}
      <section id="precios" className="py-16 bg-white border-t border-stone-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Precios Transparentes</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
              Planes simples, sin letras chiquitas
            </h2>
            <p className="text-stone-600 text-xs sm:text-sm mt-2">
              Revisa la capacidad y las funciones de cada plan. Las condiciones de soporte y conservación de datos se definirán antes de contratar.
            </p>

            <p className="text-xs text-stone-500 mt-6">Licencia mensual. Los servicios externos pueden tener costos adicionales.</p>
          </div>

          {catalogError && <p role="alert" className="text-red-700 text-center">{catalogError}</p>}
          {!catalog && !catalogError && <p role="status" className="text-center">Cargando planes…</p>}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {catalog?.plans.map(plan => <article key={plan.code} className={`rounded-2xl p-7 flex flex-col border ${plan.code === 'PRO' ? 'bg-stone-900 text-white border-stone-800' : 'bg-white border-stone-200 text-stone-900'}`}>
              <h3 className="text-2xl font-semibold">{plan.name}</h3>
              <p className="text-sm mt-2 opacity-70">{plan.subtitle}</p>
              <div className="mt-7"><span className="text-4xl font-semibold">{formatCurrency(plan.quote.totalMxn)}</span><span className="text-xs ml-2">MXN / mes</span></div>
              <p className="text-xs mt-3 opacity-70">{plan.quote.label}</p>
              <p className="text-sm font-medium mt-5">{capacityLabel(plan)}</p>
              <ul className="space-y-3 my-6 flex-1">{plan.features.map(feature => <li key={feature} className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />{feature}</li>)}</ul>
              <button onClick={() => onStartTrial(plan.code)} className={`rounded-xl px-4 py-3 font-semibold ${plan.code === 'PRO' ? 'bg-white text-stone-900' : 'bg-stone-900 text-white'}`}>Conocer {plan.name}</button>
            </article>)}
          </div>
          <p className="text-xs text-stone-500 text-center mt-6">WhatsApp y facturación requieren conectar sus proveedores. Los consumos y condiciones se acuerdan antes de contratar.</p>
        </div>
      </section>

      {/* Programa de Fundadores */}
      <section id="fundadores" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Primeras 10 Barberías · Piloto acompañado</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Programa de Barberías Fundadoras
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
            Buscamos 10 barberías pioneras para colaborar mano a mano. A cambio de tu retroalimentación semanal para perfeccionar el software, definimos contigo un alcance y condiciones claros para el piloto.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 font-bold mb-4">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 mb-1.5">Oferta con condiciones claras</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Antes de contratar revisamos tu plan, capacidad, consumos y duración de la oferta. Recibes condiciones por escrito y el total antes de confirmar el pago.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-stone-100 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Precio y alcance por escrito</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 font-bold mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 mb-1.5">Onboarding Asistido 1 a 1</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Sesión guiada personalizada por videollamada para cargar tu catálogo de servicios, inventario de productos y configurar las comisiones de tus barberos durante una sesión guiada.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-stone-100 text-[11px] font-semibold text-stone-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Configuración express incluida</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 font-bold mb-4">
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 mb-1.5">Canal Directo de WhatsApp</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Acompañamiento para revisar dudas operativas y recoger comentarios del piloto. Los horarios y canales se acordarán antes de comenzar.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-stone-100 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Acompañamiento con alcance acordado</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => onStartTrial('PRO')}
            className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs shadow-sm transition inline-flex items-center gap-2"
          >
            <span>Unirme al Programa de Fundadores (14 Días Gratis)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-white border-t border-stone-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Respuestas Claras</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "¿Necesito comprar hardware especial o computadoras costosas?",
                a: "No. SYSTECH funciona en cualquier laptop, tablet (iPad o Android), computadora de escritorio o celular inteligente desde el navegador web. Es compatible con cualquier impresora térmica estándar USB o Bluetooth de 58mm y 80mm."
              },
              {
                q: "¿Cómo funciona la prueba gratuita de 14 días?",
                a: "Al registrarte, tu barbería tiene acceso inmediato e ilimitado a todas las herramientas del Plan Pro durante 14 días. No requieres tarjeta de crédito para iniciar y no hay cobros sorpresa."
              },
              {
                q: "¿Puedo configurar comisiones diferentes para cada barbero?",
                a: "Sí. Puedes definir porcentajes específicos para cada barbero tanto en servicios de corte/barba como en productos retail capilares."
              },
              {
                q: "¿Cómo cobran mis clientes en el portal de reserva?",
                a: "El cliente reserva sin pagar por adelantado o puede liquidar al terminar su servicio en la terminal de cobro del salón mediante efectivo, tarjeta bancaria o transferencia SPEI."
              },
              {
                q: "¿Mis datos y la información de mis clientes están seguros?",
                a: "Totalmente. Tu información está protegida con cifrado en tránsito y reposo, y arquitectura multi-inquilino segura para que cada barbería acceda únicamente a sus propios datos, ventas y clientes."
              }
            ].map((faq, index) => (
              <div key={index} className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50/50">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between text-xs font-bold text-stone-900 hover:bg-stone-100/60 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${openFaq === index ? 'rotate-90' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-4 text-xs text-stone-600 leading-relaxed border-t border-stone-200/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Commercial CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-950 tracking-tight">
          Lleva tu barbería al siguiente nivel hoy mismo.
        </h2>
        <p className="mt-3 text-sm text-stone-600 max-w-xl mx-auto">
          Comienza hoy con 14 días de prueba gratis sin tarjeta de crédito. Configura tu catálogo, comisiones y agenda paso a paso.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onStartTrial('PRO')}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-md transition"
          >
            Comenzar Prueba Gratis (14 Días)
          </button>
          <button
            onClick={onLogin}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-900 font-bold text-sm shadow-sm transition"
          >
            Iniciar Sesión
          </button>
        </div>
      </section>

      {/* Commercial Footer with Legal Compliance */}
      <footer className="border-t border-stone-200 bg-white py-10 px-4 sm:px-6 lg:px-8 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-stone-900 text-white flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-stone-900">SYSTECH STUDIO</span>
            <span className="hidden sm:inline">• Suite para Barberías en México</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 text-stone-600">
            <Link to="/privacidad" className="hover:text-stone-900 underline font-medium">
              Aviso de Privacidad (LFPDPPP)
            </Link>
            <Link to="/terminos" className="hover:text-stone-900 underline font-medium">
              Términos y Condiciones
            </Link>
            <span className="flex items-center gap-1 text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Demo local · publicación pendiente</span>
            </span>
            <span className="font-medium">
              Canal de soporte pendiente de definir
            </span>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Support Button */}
      <a
        href="#faq"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-semibold text-xs tracking-tight group hover:scale-105"
        aria-label="Consultar preguntas frecuentes"
      >
        <MessageSquare className="w-4 h-4 fill-white text-white" />
        <span className="inline">¿Dudas? Consulta aquí</span>
      </a>

    </div>
  );
};


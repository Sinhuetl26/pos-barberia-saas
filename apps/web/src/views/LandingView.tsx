import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  onStartTrial: (plan: 'BASICO' | 'PRO') => void;
  onLogin: () => void;
  onLaunchDemo: (role?: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onStartTrial,
  onLogin,
  onLaunchDemo
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
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
          Diseñado para barberías reales: cobro en POS en menos de 30 segundos, portal de citas para Instagram/WhatsApp, eliminación de faltantes con arqueo ciego y comisiones exactas al centavo.
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
            <span>Listo en menos de 3 minutos</span>
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
            <div className="text-2xl sm:text-3xl font-bold font-mono text-stone-900">&lt; 30 seg</div>
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
                Cobros en menos de 30 segundos. Admite pagos divididos (efectivo + tarjeta + transferencia), registro de propinas y cálculo exacto de cambio.
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
                <span>Cero discusiones de dinero en el equipo</span>
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
                <span>Blindaje anti-robo hormiga para el dueño</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-stone-50/70 border border-stone-200/80 hover:border-stone-300 transition hover:bg-stone-50">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Recordatorios WhatsApp Pro</h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Recordatorios automáticos 24 horas y 2 horas antes de la cita. Reduce los "no-shows" y cancelaciones de último minuto en más del 80%.
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
                Basado en un precio promedio de <strong>$250 MXN</strong> por corte y una tasa de recuperación del <strong>8%</strong> de citas perdidas gracias a recordatorios automáticos por WhatsApp. <span className="text-stone-400 block mt-1 text-[11px]">(Estimación ilustrativa configurable con los números reales de tu salón).</span>
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
                  Aprox. ~{noShowsRecuperadosMes} clientes que sí asistirán a su cita.
                </div>
              </div>

              <div className="pt-4 border-t border-stone-700">
                <div className="text-xs text-stone-400 font-medium">Tiempo ahorrado en cuadre de caja y WhatsApp:</div>
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
              Todas las suscripciones incluyen actualizaciones gratuitas, soporte y almacenamiento seguro de datos.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="mt-6 inline-flex items-center p-1 rounded-xl bg-stone-100 border border-stone-200 text-xs font-semibold">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg transition ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Pago Mensual
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>Pago Anual</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-bold">2 meses gratis</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Plan Básico */}
            <div className="rounded-2xl border border-stone-200 bg-white p-8 flex flex-col justify-between hover:border-stone-300 transition shadow-sm">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Plan Inicial</div>
                <h3 className="text-xl font-bold text-stone-900 mt-1">BÁSICO</h3>
                <p className="text-xs text-stone-500 mt-1">Para barberías independientes de hasta 3 barberos.</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold font-mono text-stone-900">
                    {billingCycle === 'monthly' ? '$499' : '$4,990'}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    MXN {billingCycle === 'monthly' ? '/ mes' : '/ año'}
                  </span>
                </div>

                <div className="mt-6 space-y-3 text-xs text-stone-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>1 Sucursal</strong> incluida</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hasta <strong>3 Barberos</strong> registrados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Terminal POS y cobros ilimitados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Agenda y Portal de auto-reserva pública</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Arqueo ciego de caja y comisiones automáticas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Inventario y trazabilidad Kardex</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Impresión térmica 58mm / 80mm y tickets WhatsApp</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => onStartTrial('BASICO')}
                  className="w-full py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-900 font-bold text-xs transition"
                >
                  Comenzar con Plan Básico
                </button>
              </div>
            </div>

            {/* Plan Pro (Featured) */}
            <div className="rounded-2xl border-2 border-stone-900 bg-stone-900 text-white p-8 flex flex-col justify-between shadow-lg relative">
              <div className="absolute -top-3 right-6 bg-amber-400 text-stone-950 text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider shadow-sm">
                Más Elegido
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Plan Profesional</div>
                <h3 className="text-xl font-bold text-white mt-1">PRO COMPLETO</h3>
                <p className="text-xs text-stone-400 mt-1">Para barberías en crecimiento y cadenas multi-sucursal.</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold font-mono text-white">
                    {billingCycle === 'monthly' ? '$999' : '$9,990'}
                  </span>
                  <span className="text-xs text-stone-400 font-medium">
                    MXN {billingCycle === 'monthly' ? '/ mes' : '/ año'}
                  </span>
                </div>

                <div className="mt-6 space-y-3 text-xs text-stone-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Sucursales Ilimitadas</strong> (matriz y filiales)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Barberos Ilimitados</strong> en el equipo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Todo lo incluido en el Plan Básico</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Notificaciones Pro WhatsApp</strong> (recordatorios 24h y 2h)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Analítica Financiera Avanzada</strong> y reporte por barbero</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Bitácora completa de auditoría de seguridad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Soporte prioritario VIP por WhatsApp 24/7</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => onStartTrial('PRO')}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Prueba Gratis 14 Días del Plan Pro</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Programa de Fundadores */}
      <section id="fundadores" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Exclusivo: Primeras 10 Barberías en México (Cupón FUNDADOR)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Programa de Barberías Fundadoras
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
            Buscamos 10 barberías pioneras para colaborar mano a mano. A cambio de tu retroalimentación semanal para perfeccionar el software, aseguramos beneficios de por vida.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 font-bold mb-4">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 mb-1.5">Tarifa Congelada de por Vida</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Al activar tu cuenta hoy con el cupón <strong className="font-mono text-stone-900">FUNDADOR</strong>, mantendrás tu tarifa fija ($499 Básico / $999 Pro al mes) sin aumentos futuros, sin importar el volumen de citas.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-stone-100 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Garantía de precio congelado</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 font-bold mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 mb-1.5">Onboarding Asistido 1 a 1</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Sesión guiada personalizada por videollamada para cargar tu catálogo de servicios, inventario de productos y configurar las comisiones de tus barberos en menos de 15 minutos.
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
                Acceso prioritario directo con el equipo técnico para resolver dudas operativas, solicitar funciones a medida y recibir soporte los 7 días de la semana.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-stone-100 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Soporte prioritario garantizado</span>
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
                a: "Totalmente. Cumplimos con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) en México. Cada barbería cuenta con aislamiento estricto de base de datos para que nadie más pueda ver tus ventas ni clientes."
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
          Comienza hoy con 14 días de prueba gratis sin tarjeta de crédito. Configura tu catálogo, comisiones y agenda en menos de 10 minutos.
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
              <span>SSL 256-bit</span>
            </span>
            <a href="mailto:soporte@systech.mx" className="hover:text-stone-900 font-medium">
              soporte@systech.mx
            </a>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Support Button */}
      <a
        href="https://wa.me/523120000000?text=Hola%20SYSTECH,%20me%20gustar%C3%ADa%20conocer%20m%C3%A1s%20sobre%20el%20sistema%20para%20mi%20barber%C3%ADa"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-semibold text-xs tracking-tight group hover:scale-105"
        aria-label="Contactar soporte por WhatsApp"
      >
        <MessageSquare className="w-4 h-4 fill-white text-white" />
        <span className="inline">¿Dudas? WhatsApp</span>
      </a>

    </div>
  );
};

// ======================================================================
// SYSTECH STUDIO - CENTRO DE AYUDA, SOPORTE & ENCUESTA NPS (FASE 7)
// Interactive in-app help center with 10 guides, WhatsApp SLA & NPS survey
// ======================================================================

import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Search,
  BookOpen,
  MessageSquare,
  Star,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Clock,
  ShieldCheck,
  Send,
  Zap,
  Printer,
  Calendar,
  Users,
  CreditCard,
  Package,
  Scissors
} from 'lucide-react';

interface CentroAyudaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug?: string;
  tenantName?: string;
}

export const CentroAyudaModal: React.FC<CentroAyudaModalProps> = ({
  isOpen,
  onClose,
  tenantSlug = 'el-bigote',
  tenantName = 'Mi Barbería'
}) => {
  const [activeTab, setActiveTab] = useState<'guias' | 'soporte' | 'nps'>('guias');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<number | null>(null);

  // NPS State
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsFeedback, setNpsFeedback] = useState('');
  const [npsSubmitted, setNpsSubmitted] = useState(false);

  if (!isOpen) return null;

  // 10 Key Guides
  const articles = [
    {
      id: 1,
      category: 'Catálogo',
      icon: Scissors,
      title: 'Cómo configurar servicios, precios y duraciones',
      summary: 'Aprende a dar de alta cortes de cabello, arreglos de barba y combos.',
      steps: [
        'Ve a la vista "Terminal POS" o "Configuración".',
        'En la pestaña Servicios, haz clic en "Nuevo Servicio".',
        'Ingresa el nombre (ej. "Corte Clásico + Barba"), precio en MXN y duración en minutos (ej. 45 min).',
        'El tiempo configurado determinará automáticamente los bloques disponibles en tu portal de reservas.',
        'Guarda los cambios y verifica que aparezca de inmediato en tu catálogo.'
      ]
    },
    {
      id: 2,
      category: 'Barberos',
      icon: Users,
      title: 'Cómo configurar barberos y comisiones diferenciadas',
      summary: 'Define comisiones específicas por servicio y por venta de producto.',
      steps: [
        'Ingresa al módulo "Barberos & Comisiones" desde la barra superior.',
        'Haz clic en "Registrar Barbero" o selecciona uno existente.',
        'Configura su horario habitual de atención y días de descanso.',
        'Asigna la comisión por servicios (ej. 50%) y por productos capilares (ej. 15%).',
        'El sistema calculará automáticamente la ganancia del barbero en cada venta registrada.'
      ]
    },
    {
      id: 3,
      category: 'Punto de Venta',
      icon: CreditCard,
      title: 'Cobro rápido en menos de 30 segundos (Pagos mixtos y propinas)',
      summary: 'Domina el cobro ágil en caja para evitar filas entre clientes.',
      steps: [
        'En la vista "Terminal POS", selecciona al barbero que atendió al cliente.',
        'Haz clic en los servicios o productos agregados a la cuenta.',
        'Elige el método de pago: Efectivo, Tarjeta bancaria o Transferencia SPEI.',
        'Para pagos mixtos, ingresa cuánto se liquida en efectivo y cuánto con tarjeta.',
        'Si el cliente deja propina, indícala en el campo correspondiente (se suma al barbero).',
        'Presiona "Cobrar e Imprimir Ticket" para finalizar la transacción.'
      ]
    },
    {
      id: 4,
      category: 'Caja & Finanzas',
      icon: Clock,
      title: 'Arqueo ciego de caja y corte de turno',
      summary: 'Control total de efectivo sin posibilidad de trampas o descuadres.',
      steps: [
        'Al iniciar el turno, abre la caja registradora con tu fondo inicial de cambio.',
        'Durante el turno, registra cualquier salida de dinero menor (ej. compra de hielo, garrafón) en "Movimientos de Caja".',
        'Al finalizar el turno, realiza el Arqueo Ciego: cuenta físicamente el dinero antes de consultar el sistema.',
        'Ingresa el monto contado y presiona "Cerrar Caja".',
        'El sistema generará la bitácora comparativa y alertará al dueño si existe algún faltante.'
      ]
    },
    {
      id: 5,
      category: 'Reservas Online',
      icon: Calendar,
      title: 'Tu portal de reservas públicas (/b/:slug) y código QR',
      summary: 'Permite que tus clientes agenden 24/7 sin llamarte ni mandar WhatsApp.',
      steps: [
        `Tu enlace oficial y limpio es: https://app.systech.mx/b/${tenantSlug}`,
        'Copia este enlace y pégalo en la biografía de tu perfil de Instagram, TikTok o Facebook.',
        'Descarga el código QR generado para imprimirlo y colocarlo en los espejos de tu local o en tarjetas.',
        'El cliente elige sucursal, servicio, barbero y horario disponible en tiempo real.',
        'El sistema valida que no haya empalmes y reserva su lugar al instante.'
      ]
    },
    {
      id: 6,
      category: 'Citas & Cancelaciones',
      icon: ShieldCheck,
      title: 'Cancelación y reprogramación segura con token criptográfico',
      summary: 'Permite que los clientes cancelen con anticipación liberando la silla.',
      steps: [
        'Cada confirmación de cita incluye un enlace único de auto-gestión con token de 64 caracteres.',
        'El cliente puede cancelar su cita respetando la política de anticipación (ej. hasta 2 horas antes).',
        'Al cancelar, la cita cambia de estado a "CANCELADA" en la agenda interna del barbero.',
        'Si había clientes registrados en la Lista de Espera, el sistema les notifica de inmediato el espacio liberado.'
      ]
    },
    {
      id: 7,
      category: 'CRM & Clientes',
      icon: Zap,
      title: 'Reactivación de clientes inactivos por WhatsApp',
      summary: 'Haz que los clientes que no han vuelto en más de 30 días regresen.',
      steps: [
        'Ingresa al módulo "Clientes CRM".',
        'Filtra la lista seleccionando "Inactivos (> 30 días)".',
        'Haz clic en el botón "Campaña de Reactivación" o en el icono de WhatsApp de cada cliente.',
        'El sistema preparará el mensaje personalizado: "Hola [Nombre], te extrañamos en el salón..."',
        'Genera un flujo de ingresos recurrente recuperando clientes con un solo clic.'
      ]
    },
    {
      id: 8,
      category: 'Inventario',
      icon: Package,
      title: 'Control de inventario, stock mínimo y mermas',
      summary: 'Mantén al día tus ceras, pomadas, navajas y productos de barbería.',
      steps: [
        'En "Inventario & Kardex", da de alta tus productos retail e insumos internos.',
        'Asigna un nivel de "Stock Mínimo" para recibir alertas automáticas cuando queden pocas piezas.',
        'Cada venta en el POS descuenta automáticamente el stock en tiempo real.',
        'Para registrar producto roto, caducado o usado para demostración, registra una "Merma" con su motivo.'
      ]
    },
    {
      id: 9,
      category: 'Nómina',
      icon: Users,
      title: 'Liquidación de comisiones y recibo de nómina para barberos',
      summary: 'Transparencia total en el pago semanal o quincenal de tu equipo.',
      steps: [
        'Ve a "Barberos & Comisiones" y selecciona la pestaña "Liquidación de Nómina".',
        'Elige el periodo a pagar (semana en curso o fechas personalizadas).',
        'Revisa el desglose exacto: cortes realizados, productos vendidos, propinas y comisiones acumuladas.',
        'Haz clic en "Liquidar Nómina" para marcar las comisiones como pagadas.',
        'Imprime o descarga el comprobante en PDF/HTML para entregárselo firmado al barbero.'
      ]
    },
    {
      id: 10,
      category: 'Hardware',
      icon: Printer,
      title: 'Configuración de impresoras térmicas USB/Bluetooth (58mm y 80mm)',
      summary: 'Imprime tickets de venta profesionales con cualquier impresora térmica estándar.',
      steps: [
        'Conecta tu impresora térmica a la computadora o tablet (por cable USB o emparejamiento Bluetooth).',
        'En tu sistema operativo, asegúrate de que esté configurada como impresora predeterminada o reconocida.',
        'En el menú de impresión de tu navegador (Chrome, Edge o Safari), selecciona el ancho correspondiente (58mm o 80mm).',
        'Desmarca la casilla "Encabezados y pies de página" y ajusta los márgenes a "Ninguno".',
        'Al presionar "Imprimir Ticket" en el POS, saldrá tu recibo perfectamente formateado con corte de papel.'
      ]
    }
  ];

  const filteredArticles = articles.filter(
    a =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendNps = (e: React.FormEvent) => {
    e.preventDefault();
    if (!npsScore) return alert('Por favor selecciona una calificación del 1 al 10.');
    setNpsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-luxury-in">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <HelpCircle className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">Centro de Ayuda & Soporte</h2>
              <p className="text-xs text-stone-500">Guías operativas, canal directo de WhatsApp y retroalimentación</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 border-b border-stone-200 flex items-center gap-4 bg-white text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('guias'); setSelectedArticle(null); }}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'guias'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Guías Rápidas ({articles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('soporte')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'soporte'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Soporte por WhatsApp</span>
          </button>
          <button
            onClick={() => setActiveTab('nps')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'nps'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Star className="w-4 h-4 text-amber-500" />
            <span>Tu Opinión & Roadmap</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: GUÍAS RÁPIDAS */}
          {activeTab === 'guias' && (
            <div className="space-y-4">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en guías (ej. arqueo, comisiones, imprimir ticket, QR)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>

              {/* Selected Article Detail View */}
              {selectedArticle !== null ? (
                (() => {
                  const art = articles.find(a => a.id === selectedArticle);
                  if (!art) return null;
                  const Icon = art.icon;
                  return (
                    <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-4 animate-luxury-in">
                      <button
                        onClick={() => setSelectedArticle(null)}
                        className="text-xs text-stone-500 hover:text-stone-900 font-semibold inline-flex items-center gap-1"
                      >
                        ← Volver a la lista de guías
                      </button>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            {art.category}
                          </span>
                          <h3 className="text-base font-bold text-stone-900 mt-1">{art.title}</h3>
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed">{art.summary}</p>

                      <div className="space-y-2 pt-2 border-t border-stone-200">
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">Paso a paso:</h4>
                        <ol className="space-y-2">
                          {art.steps.map((st, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs text-stone-700 leading-relaxed">
                              <span className="w-5 h-5 rounded-full bg-stone-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span>{st}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* Article Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredArticles.map(art => {
                    const Icon = art.icon;
                    return (
                      <button
                        key={art.id}
                        onClick={() => setSelectedArticle(art.id)}
                        className="p-4 rounded-xl border border-stone-200 hover:border-stone-400 bg-white hover:bg-stone-50/50 transition text-left flex items-start gap-3.5 group shadow-2xs"
                      >
                        <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-stone-900 group-hover:text-white text-stone-700 flex items-center justify-center shrink-0 transition">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            {art.category}
                          </span>
                          <h4 className="text-xs font-bold text-stone-900 tracking-tight group-hover:text-stone-950 truncate">
                            {art.title}
                          </h4>
                          <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-snug">
                            {art.summary}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-900 self-center shrink-0 transition" />
                      </button>
                    );
                  })}
                  {filteredArticles.length === 0 && (
                    <p className="col-span-2 text-center text-xs text-stone-400 py-8">
                      No se encontraron guías para "{searchQuery}". Intenta con otros términos.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SOPORTE POR WHATSAPP & SLA */}
          {activeTab === 'soporte' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold mb-2">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Canal Oficial de Asistencia Técnica</span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">
                    Soporte Directo por WhatsApp
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 max-w-lg leading-relaxed">
                    Escribe directamente con un especialista de soporte de SYSTECH en México para resolver dudas sobre caja, impresoras térmicas, comisiones o agendamiento.
                  </p>
                </div>

                <a
                  href={`https://wa.me/523120000000?text=Hola%20SYSTECH,%20necesito%20asistencia%20técnica%20para%20la%20barbería%20${encodeURIComponent(tenantName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center gap-2 shrink-0"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>Chatear por WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* SLA Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60">
                  <div className="text-[10px] font-bold uppercase text-stone-500">Horario de Atención</div>
                  <div className="text-sm font-bold text-stone-900 mt-1">Lunes a Sábado</div>
                  <div className="text-xs text-stone-500 mt-0.5">09:00 — 20:00 (Hora CDMX)</div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60">
                  <div className="text-[10px] font-bold uppercase text-stone-500">Tiempo de Respuesta (SLA)</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1">&lt; 15 Minutos</div>
                  <div className="text-xs text-stone-500 mt-0.5">Atención garantizada en turno</div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60">
                  <div className="text-[10px] font-bold uppercase text-stone-500">Correo Alternativo</div>
                  <div className="text-sm font-bold text-stone-900 mt-1">soporte@systech.mx</div>
                  <div className="text-xs text-stone-500 mt-0.5">Respuesta en &lt; 24 horas</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 text-xs text-stone-600 bg-white leading-relaxed">
                <strong>¿Problema con tu impresora térmica?</strong> Indícanos por WhatsApp la marca y modelo (ej. Xprinter 58mm, Munbyn 80mm) y si te conectas desde computadora Windows, Mac o tablet Android/iPad para guiarte en 3 minutos.
              </div>
            </div>
          )}

          {/* TAB 3: ENCUESTA DE SATISFACCIÓN (NPS) */}
          {activeTab === 'nps' && (
            <div className="space-y-4">
              {npsSubmitted ? (
                <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-luxury-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-stone-900">¡Muchas gracias por tu retroalimentación!</h3>
                  <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                    Tus comentarios ayudan directamente al equipo de ingenieros de SYSTECH a definir las próximas mejoras y módulos del sistema.
                  </p>
                  <button
                    onClick={() => { setNpsSubmitted(false); setNpsScore(null); setNpsFeedback(''); }}
                    className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                  >
                    Enviar otro comentario
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendNps} className="p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">Encuesta de Satisfacción Mensual</h3>
                    <p className="text-xs text-stone-600 mt-1">
                      ¿Qué tan probable es que recomiendes SYSTECH a otro colega o dueño de barbería?
                    </p>
                  </div>

                  {/* 1 to 10 rating scale */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-400">
                      <span>Nada probable (1)</span>
                      <span>Totalmente seguro (10)</span>
                    </div>
                    <div className="grid grid-cols-10 gap-1 sm:gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setNpsScore(val)}
                          className={`py-2 rounded-lg text-xs font-bold transition border ${
                            npsScore === val
                              ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                              : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      ¿Qué podríamos mejorar o qué función te gustaría tener en la próxima actualización?
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ej. Integración con terminales Clip, reporte de productos más rentables, etc..."
                      value={npsFeedback}
                      onChange={(e) => setNpsFeedback(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Calificación</span>
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>SYSTECH Studio v1.2.0 • Hecho en México</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-200/50 font-semibold transition"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

import '../styles/collections-workspace.css';
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { NotificacionLog } from '../types';
import {
  Bell,
  MessageSquare,
  CheckCircle,
  Send,
  ExternalLink,
  Clock,
  UserX,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export function readableMessage(log: NotificacionLog) {
  if (log.canal !== 'INTERNO') return { title: log.tipo.replace(/_/g, ' '), message: log.mensaje, recipient: log.destinatario };
  try {
    const detail = JSON.parse(log.mensaje);
    if (log.tipo === 'VENTA_CONFIRMADA') return {
      title: `Venta ${detail.folio || 'registrada'}`,
      message: `${detail.barbero || 'Equipo'} · ${Array.isArray(detail.servicios) ? detail.servicios.join(', ') : 'Venta registrada'} · ${new Intl.NumberFormat('es-MX', {style:'currency',currency:'MXN'}).format(Number(detail.total) || 0)}`,
      recipient: 'Aviso interno para el dueño',
      action: detail.ventaId ? { label: `Abrir venta ${detail.folio || ''}`.trim(), path: `/app/pos?ventaId=${encodeURIComponent(detail.ventaId)}` } : undefined
    };
    if (log.tipo === 'CONFIRMACION_CITA') return { title:'Reserva confirmada', message:`Folio ${detail.codigoReserva || 'registrado'}. Puedes consultar cliente, servicio y horario en la agenda.`, recipient:'Aviso interno de agenda' };
  } catch { /* Older internal entries may contain plain text. */ }
  return { title:log.tipo.replace(/_/g, ' '), message:log.mensaje.startsWith('{') ? 'Actividad registrada. Consulta el detalle en su apartado.' : log.mensaje, recipient:'Aviso interno' };
}

export function messageStatusGroup(status: string) {
  if (['FALLIDO', 'ERROR', 'BLOQUEADO_HORARIO', 'BLOQUEADO_OPTOUT'].includes(status)) return 'ATENCION';
  if (['PENDIENTE', 'LINK_GENERADO'].includes(status)) return 'LISTO';
  if (['ENVIADO', 'ENTREGADO', 'LEIDO'].includes(status)) return 'ENVIADO';
  return 'REGISTRADO';
}

export function messageStatusLabel(status: string) {
  return ({
    PENDIENTE: 'Pendiente del proveedor', LINK_GENERADO: 'Listo para abrir',
    ENVIADO: 'Aceptado por el proveedor', ENTREGADO: 'Entregado', LEIDO: 'Leído',
    ERROR: 'No enviado', FALLIDO: 'No enviado', REGISTRADO: 'Registrado en la app',
    BLOQUEADO_HORARIO: 'Pausado por horario', BLOQUEADO_OPTOUT: 'Bloqueado por baja'
  } as Record<string,string>)[status] || status.replace(/_/g, ' ');
}

export const NotificacionesView: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const readRequest = useRef(0);
  const accountScope = `${api.getTenantId()}:${api.getUserId()}`;
  const accountScopeRef = useRef(accountScope);
  accountScopeRef.current = accountScope;
  const [logs, setLogs] = useState<NotificacionLog[]>([]);
  const [messageFilter, setMessageFilter] = useState('');
  const visibleLogs = logs.filter(log => !messageFilter || (messageFilter === 'INTERNO' ? log.canal === 'INTERNO' : messageStatusGroup(log.estado) === messageFilter));
  const attentionCount = logs.filter(log => messageStatusGroup(log.estado) === 'ATENCION').length;
  const readyCount = logs.filter(log => messageStatusGroup(log.estado) === 'LISTO').length;
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Form
  const [tipo, setTipo] = useState('RECORDATORIO_24H');
  const [destinatario, setDestinatario] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [optingOut, setOptingOut] = useState(false);
  const [notice, setNotice] = useState('');
  const [optOutError, setOptOutError] = useState(false);
  const [lastWhatsAppLink, setLastWhatsAppLink] = useState<string | null>(null);

  // Opt-out state
  const [optOutPhone, setOptOutPhone] = useState('');
  const [optOutMsg, setOptOutMsg] = useState<string | null>(null);

  useEffect(() => {
    setLogs([]); setNotice(''); setLastWhatsAppLink(null);
    loadNotifications();
    return () => { readRequest.current++; };
  }, [accountScope]);

  const loadNotifications = async () => {
    const request = ++readRequest.current;
    const scope = accountScopeRef.current;
    setLoading(true); setError('');
    try {
      const data = await api.getNotificaciones();
      if (request === readRequest.current && scope === accountScopeRef.current) setLogs(data);
    } catch (e: any) { if (request === readRequest.current && scope === accountScopeRef.current) { setLogs([]); setError(e.message || 'No pudimos consultar el historial. Vuelve a intentarlo.'); } }
    finally { if (request === readRequest.current && scope === accountScopeRef.current) setLoading(false); }
  };

  const handleSimularEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true); setError(''); setNotice(''); setLastWhatsAppLink(null);
    try {
      const res = await api.simularNotificacion({
        tipo,
        destinatario,
        mensaje,
        canal: 'WHATSAPP'
      });
      setLastWhatsAppLink(res.whatsappLink);
      setNotice('Solicitud registrada. Revisa el estado en el historial; un enlace generado todavía necesita enviarse desde WhatsApp.');
      loadNotifications();
    } catch (e: any) {
      setError(e.message);
    } finally { setSending(false); }
  };

  const handleProcesarRecordatorios = async () => {
    if (scanning) return;
    setError('');
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.procesarRecordatorios();
      setScanResult(res.resultado);
      loadNotifications();
    } catch (e: any) {
      setError(e.message || 'No pudimos preparar los recordatorios. Vuelve a intentarlo.');
    } finally {
      setScanning(false);
    }
  };

  const handleRegistrarOptOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optOutPhone.trim() || optingOut) return;
    setOptingOut(true); setOptOutMsg(null); setOptOutError(false);
    try {
      const res = await api.registrarOptOut(optOutPhone.trim());
      setOptOutMsg(res.message || 'Opt-out registrado exitosamente');
      setOptOutPhone('');
      loadNotifications();
    } catch (e: any) {
      setOptOutError(true);
      setOptOutMsg(e.message || 'Error al procesar opt-out');
    } finally { setOptingOut(false); }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE': return <span className="message-state is-ready">{messageStatusLabel(estado)}</span>;
      case 'ERROR':
      case 'FALLIDO': return <span className="message-state is-attention">{messageStatusLabel(estado)}</span>;
      case 'ENVIADO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> {messageStatusLabel(estado)}
          </span>
        );
      case 'LINK_GENERADO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
            <ExternalLink className="w-3 h-3 text-sky-600" /> {messageStatusLabel(estado)}
          </span>
        );
      case 'ENTREGADO':
      case 'LEIDO':
        return <span className="message-state is-sent"><CheckCircle className="w-3 h-3" /> {messageStatusLabel(estado)}</span>;
      case 'REGISTRADO':
        return <span className="message-state">{messageStatusLabel(estado)}</span>;
      case 'BLOQUEADO_HORARIO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> {messageStatusLabel(estado)}
          </span>
        );
      case 'BLOQUEADO_OPTOUT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <UserX className="w-3 h-3 text-rose-600" /> {messageStatusLabel(estado)}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="studio-page studio-messages operation-page messages-workspace">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="studio-title">
              Mensajes
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              PLAN PRO
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Revisa solicitudes, enlaces y bajas. La entrega automática depende de conectar y verificar el proveedor.
          </p>
        </div>

        {api.getUserRole() === 'SUPER_ADMIN' && <button
          type="button"
          onClick={handleProcesarRecordatorios}
          disabled={scanning}
          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Preparando recordatorios…' : 'Preparar recordatorios de citas'}</span>
        </button>}
      </div>
      {error && <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-800"><p>{error}</p><button disabled={loading} className="underline mt-2" onClick={loadNotifications}>Volver a consultar historial</button></div>}
      {notice && <p role="status" className="mb-5 bg-green-50 text-green-900 p-4 rounded-xl">{notice}</p>}
      {!loading && !error && <div className="message-work-summary" aria-label="Resumen de mensajes"><button type="button" onClick={() => setMessageFilter('ATENCION')}><strong>{attentionCount}</strong><span>Requieren atención</span></button><button type="button" onClick={() => setMessageFilter('LISTO')}><strong>{readyCount}</strong><span>Listos para continuar</span></button><div><strong>{logs.length}</strong><span>Actividades visibles para tu cuenta</span></div></div>}

      {scanResult && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>
              Escaneo completado: <strong>{scanResult.recordatorios24hEnviados}</strong> recordatorios de 24h y <strong>{scanResult.recordatorios2hEnviados}</strong> de 2h generados.
            </span>
          </div>
          {scanResult.bloqueadosHorario > 0 && (
            <span className="text-amber-800 font-semibold text-[11px]">
              ({scanResult.bloqueadosHorario} pausados por ventana nocturna)
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form & Tools */}
        <div className="lg:col-span-5 space-y-5">
          {/* Sender Form */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-stone-700" /> Redactar un mensaje
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Revisa teléfono, fecha y nombre antes de solicitar el envío. Si no hay conexión automática, se prepara un enlace para WhatsApp.
            </p>

            <form onSubmit={handleSimularEnvio} className="space-y-3.5" aria-busy={sending}>
              <div>
                <label htmlFor="message-template" className="block text-[11px] font-semibold text-stone-700 mb-1">Tipo de mensaje</label>
                <select
                  id="message-template"
                  disabled={sending}
                  value={tipo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTipo(val);
                  }}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                >
                  <option value="RECORDATORIO_24H">Recordatorio 24 horas antes</option>
                  <option value="RECORDATORIO_2H">Recordatorio 2 horas antes</option>
                  <option value="CONFIRMACION_CITA">Confirmación de Cita Agendada</option>
                  <option value="STOCK_MINIMO">Alerta de Stock Crítico (Dueño)</option>
                </select>
              </div>

              <div>
                <label htmlFor="message-recipient" className="block text-[11px] font-semibold text-stone-700 mb-1">Teléfono de WhatsApp</label>
                <input
                  id="message-recipient"
                  disabled={sending}
                  type="tel"
                  required
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  placeholder="5512345678"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-mono text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="message-content" className="block text-[11px] font-semibold text-stone-700 mb-1">Mensaje</label>
                <textarea
                  id="message-content"
                  disabled={sending}
                  rows={3}
                  required
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Procesando solicitud…' : 'Solicitar envío del mensaje'}</span>
              </button>
            </form>

            {lastWhatsAppLink && (
              <div className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <span className="text-[11px] text-emerald-700 block font-semibold">
                  Notificación guardada en el historial.
                </span>
                <a
                  href={lastWhatsAppLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en WhatsApp</span>
                </a>
              </div>
            )}
          </div>

          {/* Opt-Out / BAJA Box */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-1 flex items-center gap-2">
              <UserX className="w-3.5 h-3.5 text-stone-700" /> Registro de Baja (Opt-Out)
            </h3>
            <p className="text-xs text-stone-500 mb-3">
              Si un cliente pide dejar de recibir mensajes, registra su teléfono para bloquear nuevos envíos automáticos.
            </p>

            <form onSubmit={handleRegistrarOptOut} className="flex flex-wrap gap-2" aria-busy={optingOut}>
              <input
                aria-label="Teléfono para dar de baja de mensajes"
                disabled={optingOut}
                type="tel"
                required
                value={optOutPhone}
                onChange={(e) => setOptOutPhone(e.target.value)}
                placeholder="Teléfono (10 dígitos)"
                className="flex-1 min-w-0 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-mono text-stone-900 focus:outline-none focus:bg-white"
              />
              <button
                type="submit"
                disabled={optingOut}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition"
              >
                {optingOut ? 'Guardando…' : 'Registrar baja'}
              </button>
            </form>

            {optOutMsg && (
              <div role={optOutError ? 'alert' : 'status'} className={`mt-2 text-sm ${optOutError ? 'text-red-800' : 'text-emerald-700'}`}>
                {optOutMsg}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3.5 border-b border-stone-100 flex items-center justify-between text-xs bg-stone-50/50">
              <span className="font-bold text-stone-900 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-stone-700" /> Actividad ({visibleLogs.length})
              </span>
              <span className="text-stone-500 text-[11px]">Últimos 100 registros</span>
            </div>

            <div className="message-history-filters"><label>Mostrar<select aria-label="Filtrar mensajes" value={messageFilter} onChange={event=>setMessageFilter(event.target.value)}><option value="">Toda la actividad</option><option value="INTERNO">Avisos de la app</option><option value="ATENCION">Requieren atención</option><option value="LISTO">Listos para continuar</option><option value="ENVIADO">Enviados y entregados</option></select></label><span>Los estados indican el último dato confirmado; «aceptado» no significa «entregado».</span></div>
            <div className="divide-y divide-stone-100 max-h-[580px] overflow-y-auto">
              {loading ? <p role="status" className="p-8 text-stone-600">Consultando historial…</p> : error && !logs.length ? <p className="p-8 text-stone-600">El historial no está disponible. Usa «Volver a consultar historial».</p> : visibleLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  No hay actividad en esta vista.
                </div>
              ) : (
                visibleLogs.map(log => { const readable = readableMessage(log); return (
                  <div key={log.id} className="p-3.5 hover:bg-stone-50/60 transition space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-stone-900">{readable.title}</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(log.fecha).toLocaleString('es-MX')}
                      </span>
                    </div>
                    <p className="break-words text-xs text-stone-700 bg-stone-50 p-2.5 rounded-lg border border-stone-200/80 leading-relaxed font-sans">
                      {readable.message}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 pt-0.5 font-medium">
                      <span className="text-sm break-all">{readable.recipient}</span>
                      <div className="flex items-center gap-2">
                        {readable.action && <button type="button" className="message-history-action" onClick={() => onNavigate?.(readable.action!.path)}>{readable.action.label}</button>}
                        {getStatusBadge(log.estado)}
                      </div>
                    </div>
                  </div>
                ); })
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

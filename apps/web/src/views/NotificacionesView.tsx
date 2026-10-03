import React, { useState, useEffect } from 'react';
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

export const NotificacionesView: React.FC = () => {
  const [logs, setLogs] = useState<NotificacionLog[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Form
  const [tipo, setTipo] = useState('RECORDATORIO_24H');
  const [destinatario, setDestinatario] = useState('5512345678');
  const [mensaje, setMensaje] = useState('¡Hola! Te recordamos tu cita de mañana a las 11:00 AM en Barbería El Bigote.');
  const [lastWhatsAppLink, setLastWhatsAppLink] = useState<string | null>(null);

  // Opt-out state
  const [optOutPhone, setOptOutPhone] = useState('');
  const [optOutMsg, setOptOutMsg] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotificaciones();
      setLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimularEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.simularNotificacion({
        tipo,
        destinatario,
        mensaje,
        canal: 'WHATSAPP'
      });
      setLastWhatsAppLink(res.whatsappLink);
      loadNotifications();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleProcesarRecordatorios = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.procesarRecordatorios();
      setScanResult(res.resultado);
      loadNotifications();
    } catch (e: any) {
      alert(e.message || 'Error al procesar recordatorios automáticos');
    } finally {
      setScanning(false);
    }
  };

  const handleRegistrarOptOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optOutPhone.trim()) return;
    try {
      const res = await api.registrarOptOut(optOutPhone.trim());
      setOptOutMsg(res.message || 'Opt-out registrado exitosamente');
      setOptOutPhone('');
      loadNotifications();
    } catch (e: any) {
      setOptOutMsg(e.message || 'Error al procesar opt-out');
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'ENVIADO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Enviado Cloud API
          </span>
        );
      case 'LINK_GENERADO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
            <ExternalLink className="w-3 h-3 text-sky-600" /> Listo para Enviar (1-Clic)
          </span>
        );
      case 'BLOQUEADO_HORARIO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Fuera de Horario (22h - 8h)
          </span>
        );
      case 'BLOQUEADO_OPTOUT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <UserX className="w-3 h-3 text-rose-600" /> Bloqueado por BAJA
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-luxury-in font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Notificaciones & WhatsApp Cloud API
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              PLAN PRO
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Automatización de confirmaciones, recordatorios 24h y 2h antes, recibos digitales y cumplimiento LFPDPPP.
          </p>
        </div>

        <button
          type="button"
          onClick={handleProcesarRecordatorios}
          disabled={scanning}
          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Escaneando citas...' : 'Escanear Recordatorios (24h / 2h)'}</span>
        </button>
      </div>

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
              <MessageSquare className="w-3.5 h-3.5 text-stone-700" /> Disparador de Notificación
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Envía mensajes directos vía WhatsApp Cloud API o enlace verificado de 1-clic.
            </p>

            <form onSubmit={handleSimularEnvio} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Plantilla</label>
                <select
                  value={tipo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTipo(val);
                    if (val === 'RECORDATORIO_24H') setMensaje('¡Hola! Te recordamos tu cita de mañana a las 11:00 AM en Barbería El Bigote.');
                    else if (val === 'RECORDATORIO_2H') setMensaje('¡Hola! Tu cita en Barbería El Bigote comienza en 2 horas.');
                    else if (val === 'CONFIRMACION_CITA') setMensaje('¡Hola! Tu cita quedó confirmada para hoy 4:00 PM con Carlos. Folio: RES-8921');
                    else if (val === 'STOCK_MINIMO') setMensaje('⚠️ Alerta de Inventario: El producto "Pomada Suavecito" está por agotarse.');
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
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Teléfono (WhatsApp México)</label>
                <input
                  type="tel"
                  required
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  placeholder="5512345678"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-mono text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Mensaje</label>
                <textarea
                  rows={3}
                  required
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Notificación</span>
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
                  rel="noreferrer"
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
              Cumplimiento LFPDPPP: Si un cliente responde "BAJA", regístralo aquí para bloquear envíos automáticos.
            </p>

            <form onSubmit={handleRegistrarOptOut} className="flex gap-2">
              <input
                type="tel"
                required
                value={optOutPhone}
                onChange={(e) => setOptOutPhone(e.target.value)}
                placeholder="Teléfono (10 dígitos)"
                className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-mono text-stone-900 focus:outline-none focus:bg-white"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition"
              >
                Dar de Baja
              </button>
            </form>

            {optOutMsg && (
              <div className="mt-2 text-[11px] text-emerald-700 font-semibold">
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
                <Bell className="w-3.5 h-3.5 text-stone-700" /> Registro de Notificaciones ({logs.length})
              </span>
              <span className="text-stone-500 text-[11px]">Últimos 100 registros</span>
            </div>

            <div className="divide-y divide-stone-100 max-h-[580px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  No hay notificaciones registradas todavía.
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="p-3.5 hover:bg-stone-50/60 transition space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900">{log.tipo}</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(log.fecha).toLocaleString('es-MX')}
                      </span>
                    </div>
                    <p className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-lg border border-stone-200/80 leading-relaxed font-sans">
                      {log.mensaje}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5 font-medium">
                      <span className="font-mono text-[11px]">Destinatario: {log.destinatario}</span>
                      <div>
                        {getStatusBadge(log.estado)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

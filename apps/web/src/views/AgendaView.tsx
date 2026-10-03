import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Cita, Barbero, Sucursal, Producto, BloqueoHorario } from '../types';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Lock,
  User,
  Scissors,
  CheckCircle,
  XCircle,
  CreditCard,
  Phone,
  Copy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AgendaViewProps {
  currentSucursal: Sucursal | null;
  onOpenPosWithCita?: (cita: Cita) => void;
  onOpenPublicBooking?: () => void;
  publicSlug?: string;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  currentSucursal,
  onOpenPosWithCita,
  publicSlug
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<Producto[]>([]);
  const [bloqueos, setBloqueos] = useState<BloqueoHorario[]>([]);

  // Modals
  const [showNewCitaModal, setShowNewCitaModal] = useState(false);
  const [showBloqueoModal, setShowBloqueoModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);

  // Form State
  const [formClienteNombre, setFormClienteNombre] = useState('');
  const [formClienteTelefono, setFormClienteTelefono] = useState('');
  const [formBarberoId, setFormBarberoId] = useState('');
  const [formServicioId, setFormServicioId] = useState('');
  const [formHora, setFormHora] = useState('11:00');
  const [formNotas, setFormNotas] = useState('');

  // Walk-In State (Fase 3)
  const [walkInCliente, setWalkInCliente] = useState('');
  const [walkInTelefono, setWalkInTelefono] = useState('');
  const [walkInServicioId, setWalkInServicioId] = useState('');
  const [walkInBarberoId, setWalkInBarberoId] = useState('');
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);

  // Bloqueo State
  const [bloqueoBarberoId, setBloqueoBarberoId] = useState('');
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState('14:00');
  const [bloqueoHoraFin, setBloqueoHoraFin] = useState('15:00');
  const [bloqueoMotivo, setBloqueoMotivo] = useState('Hora de Almuerzo');

  useEffect(() => {
    loadAgenda();
  }, [selectedDate, currentSucursal?.id]);

  const loadAgenda = async () => {
    try {
      const [citasData, barberosData, productosData, bloqueosData] = await Promise.all([
        api.getCitas({ fecha: selectedDate, sucursalId: currentSucursal?.id }),
        api.getBarberos(currentSucursal?.id),
        api.getProductos({ tipo: 'SERVICIO', sucursalId: currentSucursal?.id }),
        api.getBloqueos(currentSucursal?.id)
      ]);
      setCitas(citasData);
      setBarberos(barberosData);
      setServicios(productosData);
      setBloqueos(bloqueosData);

      if (barberosData.length > 0 && !formBarberoId) {
        setFormBarberoId(barberosData[0].id);
      }
      if (productosData.length > 0 && !formServicioId) {
        setFormServicioId(productosData[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (citaId: string, nuevoEstado: string) => {
    try {
      await api.updateCitaStatus(citaId, nuevoEstado);
      loadAgenda();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleCreateCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClienteNombre || !formClienteTelefono || !formBarberoId) {
      return alert('Completa los campos obligatorios');
    }

    try {
      const selectedServ = servicios.find(s => s.id === formServicioId);
      const fechaHora = `${selectedDate}T${formHora}:00`;

      await api.createCita({
        sucursalId: currentSucursal?.id,
        barberoId: formBarberoId,
        servicioId: formServicioId,
        fechaHora,
        duracionMinutos: selectedServ?.duracionMinutos || 30,
        clienteNombre: formClienteNombre,
        clienteTelefono: formClienteTelefono,
        precioEstimado: selectedServ?.precioVenta ? Number(selectedServ.precioVenta) : 250,
        notas: formNotas
      });

      setShowNewCitaModal(false);
      setFormClienteNombre('');
      setFormClienteTelefono('');
      setFormNotas('');
      loadAgenda();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSucursal?.id || !walkInCliente.trim() || !walkInServicioId) {
      return alert('Completa los campos requeridos para el turno');
    }

    try {
      setSubmittingWalkIn(true);
      await api.registrarWalkIn({
        sucursalId: currentSucursal.id,
        barberoId: walkInBarberoId || undefined,
        servicioId: walkInServicioId,
        clienteNombre: walkInCliente,
        clienteTelefono: walkInTelefono || undefined
      });
      setShowWalkInModal(false);
      setWalkInCliente('');
      setWalkInTelefono('');
      loadAgenda();
    } catch (e: any) {
      alert(`Error al registrar walk-in: ${e.message}`);
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  const handleCreateBloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSucursal?.id) return;

    try {
      const fechaInicio = `${selectedDate}T${bloqueoHoraInicio}:00`;
      const fechaFin = `${selectedDate}T${bloqueoHoraFin}:00`;

      await api.createBloqueo({
        sucursalId: currentSucursal.id,
        barberoId: bloqueoBarberoId || null,
        fechaInicio,
        fechaFin,
        motivo: bloqueoMotivo
      });

      setShowBloqueoModal(false);
      loadAgenda();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteBloqueo = async (id: string) => {
    if (!confirm('¿Eliminar bloqueo?')) return;
    try {
      await api.deleteBloqueo(id);
      loadAgenda();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const shiftDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  const copyPublicBookingLink = () => {
    const url = `${window.location.origin}/b/${publicSlug || 'el-bigote'}`;
    navigator.clipboard.writeText(url);
    alert(`Enlace público copiado al portapapeles: ${url}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-luxury-in">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Agenda & Citas
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {currentSucursal?.nombre || 'Matriz'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Programación diaria, disponibilidad de sillas y transferencia directa a cobro en POS.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyPublicBookingLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium border border-stone-200 shadow-sm transition"
          >
            <Copy className="w-3 h-3 text-stone-600" />
            <span>Copiar Enlace Reservas</span>
          </button>

          <button
            onClick={() => setShowBloqueoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium border border-stone-200 shadow-sm transition"
          >
            <Lock className="w-3 h-3 text-stone-500" />
            <span>Bloquear Horario</span>
          </button>

          <button
            onClick={() => {
              if (servicios.length > 0 && !walkInServicioId) setWalkInServicioId(servicios[0].id);
              setShowWalkInModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-xs transition shadow-xs"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-700" />
            <span>Turno Walk-In (Sin Cita)</span>
          </button>

          <button
            onClick={() => setShowNewCitaModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="luxury-card rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-xs transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-stone-200 text-stone-900 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-stone-900 shadow-xs"
          />

          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-xs transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
          >
            Hoy
          </button>
        </div>

        {/* Date Display */}
        <div className="text-xs text-stone-700 flex items-center gap-2 font-medium">
          <CalendarIcon className="w-3.5 h-3.5 text-stone-500" />
          <span className="capitalize font-semibold text-stone-900">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-stone-500">{citas.length} citas registradas</span>
        </div>
      </div>

      {/* Active Blocks Notice */}
      {bloqueos.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-stone-500 font-medium mr-1 flex items-center gap-1">
            <Lock className="w-3 h-3 text-stone-600" /> Bloqueos:
          </span>
          {bloqueos.map(b => (
            <div key={b.id} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-stone-200 text-stone-700 text-xs shadow-xs">
              <span className="font-semibold text-stone-900">{b.motivo}</span>
              <span className="text-stone-500 text-[11px]">
                ({new Date(b.fechaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.fechaFin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
              <button onClick={() => handleDeleteBloqueo(b.id)} className="text-stone-400 hover:text-rose-600 ml-1 font-bold">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Barber Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {barberos.map(barbero => {
          const barberCitas = citas.filter(c => c.barberoId === barbero.id);

          return (
            <div key={barbero.id} className="luxury-card rounded-2xl overflow-hidden flex flex-col">
              
              {/* Header */}
              <div className="p-3.5 border-b border-stone-100 bg-stone-50/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                      {barbero.nombre.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-xs tracking-tight">{barbero.nombre}</h3>
                      <p className="text-[10px] text-stone-500">
                        {barbero.horarioInicio} - {barbero.horarioFin}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                    {barberCitas.length} citas
                  </span>
                </div>
              </div>

              {/* Appointments List */}
              <div className="p-3 space-y-2.5 flex-1 overflow-y-auto max-h-[580px] min-h-[220px] bg-white">
                {barberCitas.map(cita => {
                  const timeStr = new Date(cita.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={cita.id}
                      className="bg-stone-50/60 hover:bg-white border border-stone-200/80 hover:border-stone-300 rounded-xl p-3 transition shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                          <Clock className="w-3 h-3 text-stone-500" />
                          <span>{timeStr}</span>
                          <span className="text-[10px] text-stone-400 font-normal">({cita.duracionMinutos}m)</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                          cita.estado === 'CONFIRMADA'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : cita.estado === 'PENDIENTE'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : cita.estado === 'EN_CURSO'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
                            : cita.estado === 'COMPLETADA'
                            ? 'bg-stone-100 text-stone-700 border border-stone-200'
                            : cita.estado === 'NO_SHOW'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : cita.estado === 'CANCELADA'
                            ? 'bg-stone-100 text-stone-400 line-through'
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {cita.estado}
                        </span>
                      </div>

                      <div className="mb-2">
                        <div className="font-semibold text-stone-900 text-xs">
                          {cita.cliente?.nombre || 'Cliente sin registrar'}
                        </div>
                        {cita.cliente?.telefono && (
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-stone-400" />
                            <span>{cita.cliente.telefono}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs py-1.5 border-t border-stone-100 text-stone-600">
                        <span className="truncate">{cita.nombreServicio}</span>
                        <span className="font-bold text-stone-900 shrink-0">
                          ${cita.precioEstimado ? Number(cita.precioEstimado) : 250} MXN
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-stone-100">
                        {cita.estado === 'PENDIENTE' && (
                          <button
                            onClick={() => handleUpdateStatus(cita.id, 'CONFIRMADA')}
                            className="flex-1 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-semibold transition"
                          >
                            Confirmar
                          </button>
                        )}

                        {(cita.estado === 'PENDIENTE' || cita.estado === 'CONFIRMADA') && (
                          <button
                            onClick={() => handleUpdateStatus(cita.id, 'EN_CURSO')}
                            className="flex-1 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold transition border border-indigo-200"
                          >
                            Atender
                          </button>
                        )}

                        {cita.estado !== 'COMPLETADA' && cita.estado !== 'CANCELADA' && onOpenPosWithCita && (
                          <button
                            onClick={() => onOpenPosWithCita(cita)}
                            className="flex-1 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-semibold transition flex items-center justify-center gap-1 shadow-xs"
                          >
                            <CreditCard className="w-3 h-3" />
                            Cobrar POS
                          </button>
                        )}

                        {cita.estado !== 'COMPLETADA' && cita.estado !== 'CANCELADA' && cita.estado !== 'NO_SHOW' && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Marcar cita como NO-SHOW (Inasistencia)? Se incrementará el conteo de faltas de ${cita.cliente?.nombre || 'el cliente'}.`)) {
                                handleUpdateStatus(cita.id, 'NO_SHOW');
                              }
                            }}
                            className="p-1 rounded text-stone-400 hover:text-rose-600 text-[10px] font-medium transition"
                            title="El cliente no se presentó a su cita"
                          >
                            No-Show
                          </button>
                        )}

                        {cita.estado === 'COMPLETADA' && (
                          <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Cobrada en POS
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {barberCitas.length === 0 && (
                  <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-stone-400 text-xs">
                    <p>Sin citas para este día</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Nueva Cita */}
      {showNewCitaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-luxury-in">
            <h3 className="text-base font-bold text-stone-900 mb-1">Agendar Cita en Salón</h3>
            <p className="text-xs text-stone-500 mb-4">Registro directo para clientes presenciales o vía telefónica.</p>

            <form onSubmit={handleCreateCita} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={formClienteNombre}
                    onChange={(e) => setFormClienteNombre(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="55..."
                    value={formClienteTelefono}
                    onChange={(e) => setFormClienteTelefono(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Barbero *</label>
                  <select
                    value={formBarberoId}
                    onChange={(e) => setFormBarberoId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  >
                    {barberos.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Servicio *</label>
                  <select
                    value={formServicioId}
                    onChange={(e) => setFormServicioId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  >
                    {servicios.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} (${Number(s.precioVenta)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Horario</label>
                  <input
                    type="time"
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCitaModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm"
                >
                  Confirmar Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bloquear Horario */}
      {showBloqueoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-luxury-in">
            <h3 className="text-base font-bold text-stone-900 mb-1">Bloquear Horario</h3>
            <p className="text-xs text-stone-500 mb-4">Pausa de agenda para descansos o capacitaciones.</p>

            <form onSubmit={handleCreateBloqueo} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Barbero</label>
                <select
                  value={bloqueoBarberoId}
                  onChange={(e) => setBloqueoBarberoId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                >
                  <option value="">Toda la sucursal</option>
                  {barberos.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={bloqueoHoraInicio}
                    onChange={(e) => setBloqueoHoraInicio(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Hora Fin</label>
                  <input
                    type="time"
                    value={bloqueoHoraFin}
                    onChange={(e) => setBloqueoHoraFin(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Motivo</label>
                <select
                  value={bloqueoMotivo}
                  onChange={(e) => setBloqueoMotivo(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                >
                  <option value="Hora de Almuerzo">Hora de Almuerzo</option>
                  <option value="Mantenimiento">Mantenimiento de Sillón</option>
                  <option value="Capacitación">Capacitación de Personal</option>
                  <option value="Permiso Especial">Permiso Especial</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBloqueoModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm"
                >
                  Confirmar Bloqueo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fase 3: Modal Turno Walk-In */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-stone-950 mb-1 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-600" />
              Registrar Turno Walk-In (Cliente Sin Cita)
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Ingresa al cliente directamente a la cola de atención del salón para su turno presencial.
            </p>

            <form onSubmit={handleCreateWalkIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto Gómez"
                  value={walkInCliente}
                  onChange={(e) => setWalkInCliente(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Teléfono (WhatsApp)</label>
                <input
                  type="tel"
                  placeholder="Opcional para enviarle ticket y recordatorio"
                  value={walkInTelefono}
                  onChange={(e) => setWalkInTelefono(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Servicio *</label>
                <select
                  required
                  value={walkInServicioId}
                  onChange={(e) => setWalkInServicioId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-semibold focus:outline-none focus:bg-white"
                >
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} — ${Number(s.precioVenta)} MXN ({s.duracionMinutos} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Barbero (Opcional)</label>
                <select
                  value={walkInBarberoId}
                  onChange={(e) => setWalkInBarberoId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white"
                >
                  <option value="">Cualquier barbero disponible (Primer turno libre)</option>
                  {barberos.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-3.5 py-2 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingWalkIn}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submittingWalkIn ? 'Registrando...' : 'Asignar Turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

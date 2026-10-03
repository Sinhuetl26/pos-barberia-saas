import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import {
  Scissors,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  CheckCircle,
  Building,
  MapPin,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Search,
  XCircle,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';

interface PublicBookingViewProps {
  slug?: string;
  onExit?: () => void;
}

export const PublicBookingView: React.FC<PublicBookingViewProps> = ({ slug, onExit }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const effectiveSlug = routeSlug || slug || 'el-bigote';

  const [shopData, setShopData] = useState<any>(null);
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Flow Steps: 1: Sucursal, 2: Servicio, 3: Barbero, 4: Horario, 5: Datos, 6: Confirmación
  const [step, setStep] = useState<number>(1);

  // Selections
  const [selectedSucursal, setSelectedSucursal] = useState<any>(null);
  const [selectedServicio, setSelectedServicio] = useState<any>(null);
  const [selectedBarbero, setSelectedBarbero] = useState<any>(null);
  const [selectedFecha, setSelectedFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<{ hora: string; disponible: boolean }[]>([]);
  const [selectedHora, setSelectedHora] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteNotas, setClienteNotas] = useState('');
  const [consentimientoPrivacidad, setConsentimientoPrivacidad] = useState(false);

  // Confirmation Result
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Search existing booking
  const [lookupFolio, setLookupFolio] = useState('');
  const [lookedUpCita, setLookedUpCita] = useState<any>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    loadShop();
  }, [effectiveSlug]);

  const loadShop = async () => {
    setLoading(true);
    try {
      const res = await api.getPublicBarberia(effectiveSlug);
      setShopData(res.tenant);
      setServicios(res.servicios);
      if (res.tenant.sucursales.length > 0) {
        setSelectedSucursal(res.tenant.sucursales[0]);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSucursal && selectedBarbero && selectedFecha) {
      loadSlots();
    }
  }, [selectedSucursal?.id, selectedBarbero?.id, selectedFecha, selectedServicio?.duracionMinutos]);

  const loadSlots = async () => {
    try {
      const res = await api.getPublicAvailability(
        selectedSucursal.id,
        selectedBarbero.id,
        selectedFecha,
        selectedServicio?.duracionMinutos || 30
      );
      setAvailableSlots(res.slots);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSucursal || !selectedServicio || !selectedBarbero || !selectedHora || !clienteNombre || !clienteTelefono) {
      return alert('Por favor completa todos los campos obligatorios');
    }

    if (!consentimientoPrivacidad) {
      return alert('Debes aceptar el Aviso de Privacidad y el tratamiento de datos personales para continuar.');
    }

    try {
      const fechaHora = `${selectedFecha}T${selectedHora}:00`;
      const res = await api.bookPublicAppointment({
        tenantId: shopData.id,
        sucursalId: selectedSucursal.id,
        barberoId: selectedBarbero.id,
        servicioId: selectedServicio.id,
        fechaHora,
        duracionMinutos: selectedServicio.duracionMinutos || 30,
        clienteNombre,
        clienteTelefono,
        notas: clienteNotas
      });

      setBookingResult(res);
      setStep(6);
    } catch (e: any) {
      alert(`Error al confirmar cita: ${e.message}`);
    }
  };

  const handleLookupBooking = async () => {
    if (!lookupFolio.trim()) return;
    setLookupError('');
    try {
      const cita = await api.getPublicBooking(lookupFolio.trim().toUpperCase());
      setLookedUpCita(cita);
    } catch (e: any) {
      setLookupError('No se encontró ninguna cita con el folio proporcionado.');
      setLookedUpCita(null);
    }
  };

  const handleCancelBooking = async () => {
    if (!lookedUpCita) return;
    if (!confirm('¿Deseas cancelar definitivamente esta reservación?')) return;
    try {
      await api.cancelPublicBooking(lookedUpCita.codigoReserva);
      setLookedUpCita({ ...lookedUpCita, estado: 'CANCELADA' });
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center text-stone-500">
        <div className="w-8 h-8 rounded-full border-2 border-stone-200 border-t-stone-900 animate-spin mb-4" />
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-stone-400">Conectando con el salón...</p>
      </div>
    );
  }

  if (!shopData) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 mb-4">
          <Scissors className="w-6 h-6 stroke-[1.75]" />
        </div>
        <h2 className="text-lg font-bold text-stone-900 tracking-tight mb-1">Barbería no encontrada</h2>
        <p className="text-xs text-stone-500 max-w-sm mb-6">El enlace proporcionado no coincide con una membresía activa o el establecimiento cambió de dominio.</p>
        {onExit && (
          <button
            onClick={onExit}
            className="px-4 py-2 bg-stone-900 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Regresar a la Plataforma
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900 flex flex-col justify-between selection:bg-stone-900 selection:text-white font-sans">
      
      {/* Top Refined Header */}
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <Scissors className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-stone-900">
                  {shopData.nombre}
                </h1>
                <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                  BOUTIQUE
                </span>
              </div>
              <p className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-stone-400" />
                <span>{selectedSucursal?.nombre || shopData.direccion || 'Sucursal Principal'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowLookup(!showLookup);
                setLookupError('');
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition"
            >
              {showLookup ? 'Cerrar Consulta' : 'Mi Folio / Cita'}
            </button>
            {onExit && (
              <button
                onClick={onExit}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition shadow-xs"
              >
                Volver al Panel
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Luxury Booking Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full animate-luxury-in">
        
        {/* Lookup / Cancel Cita Section */}
        {showLookup && (
          <div className="mb-8 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm animate-luxury-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-stone-900 tracking-wide uppercase">
                Consultar o Cancelar Cita
              </h3>
              <span className="text-[10px] text-stone-400 font-mono">LFPDPPP Privacidad</span>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Ingresa el folio único generado al momento de agendar (ej. <span className="text-stone-900 font-bold font-mono">RES-XXXX</span>).
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={lookupFolio}
                onChange={(e) => setLookupFolio(e.target.value)}
                placeholder="FOLIO (EJ. RES-8921)"
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900 uppercase font-mono tracking-wider"
              />
              <button
                onClick={handleLookupBooking}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition shadow-xs"
              >
                Buscar
              </button>
            </div>

            {lookupError && (
              <p className="text-xs text-rose-600 mt-2 font-medium">{lookupError}</p>
            )}

            {lookedUpCita && (
              <div className="mt-4 p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                  <span className="font-mono text-sm font-bold text-stone-900">{lookedUpCita.codigoReserva}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                    lookedUpCita.estado === 'CONFIRMADA'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : lookedUpCita.estado === 'CANCELADA'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {lookedUpCita.estado}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-stone-700">
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-semibold">Cliente</span>
                    <span className="font-bold text-stone-900">{lookedUpCita.cliente?.nombre}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-semibold">Horario</span>
                    <span className="font-bold text-stone-900">{new Date(lookedUpCita.fechaHora).toLocaleString('es-MX')}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-semibold">Barbero</span>
                    <span className="font-bold text-stone-900">{lookedUpCita.barbero?.nombre}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-semibold">Sucursal</span>
                    <span className="font-bold text-stone-900">{lookedUpCita.sucursal?.nombre}</span>
                  </div>
                </div>

                {lookedUpCita.estado !== 'CANCELADA' && lookedUpCita.estado !== 'COMPLETADA' && (
                  <div className="pt-2 border-t border-stone-200 flex justify-end">
                    <button
                      onClick={handleCancelBooking}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition"
                    >
                      Cancelar esta Reservación
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Minimalist Step Navigation Bar */}
        {step < 6 && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-[11px] font-semibold text-stone-400 mb-2.5">
              <span className={step === 1 ? 'text-stone-900 font-bold' : step > 1 ? 'text-stone-700' : ''}>
                01. Sucursal
              </span>
              <span className={step === 2 ? 'text-stone-900 font-bold' : step > 2 ? 'text-stone-700' : ''}>
                02. Servicio
              </span>
              <span className={step === 3 ? 'text-stone-900 font-bold' : step > 3 ? 'text-stone-700' : ''}>
                03. Barbero
              </span>
              <span className={step === 4 ? 'text-stone-900 font-bold' : step > 4 ? 'text-stone-700' : ''}>
                04. Horario
              </span>
              <span className={step === 5 ? 'text-stone-900 font-bold' : ''}>
                05. Datos
              </span>
            </div>
            <div className="w-full bg-stone-200 h-[2px] rounded-full overflow-hidden">
              <div
                className="bg-stone-900 h-full transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* STEP 1: SELECT SUCURSAL */}
        {step === 1 && (
          <div className="space-y-4 animate-luxury-in">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-stone-900">Selecciona la Sucursal</h2>
              <p className="text-xs text-stone-500 mt-0.5">Elige el lounge o ubicación de tu preferencia.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
              {shopData.sucursales.map((suc: any) => (
                <button
                  key={suc.id}
                  onClick={() => {
                    setSelectedSucursal(suc);
                    setStep(2);
                  }}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 ${
                    selectedSucursal?.id === suc.id
                      ? 'bg-white border-stone-900 ring-1 ring-stone-900 shadow-sm'
                      : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">{suc.nombre}</h3>
                    <p className="text-xs text-stone-500 mt-1">{suc.direccion || 'Dirección de la sucursal'}</p>
                  </div>
                  <div className="text-[11px] text-stone-600 font-semibold flex items-center justify-between border-t border-stone-100 pt-2.5">
                    <span>Horario: {suc.horarioApertura} — {suc.horarioCierre}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: SELECT SERVICE */}
        {step === 2 && (
          <div className="space-y-4 animate-luxury-in">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(1)}
                className="p-1 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-stone-900">Selecciona tu Servicio</h2>
                <p className="text-xs text-stone-500 mt-0.5">Experiencias de corte clásico, arreglo de barba y tratamientos.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {servicios.map((serv: any) => (
                <button
                  key={serv.id}
                  onClick={() => {
                    setSelectedServicio(serv);
                    setStep(3);
                  }}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 ${
                    selectedServicio?.id === serv.id
                      ? 'bg-white border-stone-900 ring-1 ring-stone-900 shadow-sm'
                      : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">
                      {serv.categoria}
                    </span>
                    <h3 className="font-bold text-stone-900 text-sm leading-snug">{serv.nombre}</h3>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-stone-100">
                    <span className="text-stone-500 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3 h-3 text-stone-400" /> {serv.duracionMinutos} min
                    </span>
                    <span className="text-sm font-extrabold text-stone-900 tracking-tight">
                      ${Number(serv.precioVenta).toFixed(2)} MXN
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: SELECT BARBER */}
        {step === 3 && (
          <div className="space-y-4 animate-luxury-in">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(2)}
                className="p-1 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-stone-900">Selecciona tu Master Barber</h2>
                <p className="text-xs text-stone-500 mt-0.5">Elige el especialista que cuidará de tu imagen.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {selectedSucursal?.barberos?.map((barb: any) => (
                <button
                  key={barb.id}
                  onClick={() => {
                    setSelectedBarbero(barb);
                    setStep(4);
                  }}
                  className={`p-4 rounded-xl border text-left transition flex items-center gap-3.5 ${
                    selectedBarbero?.id === barb.id
                      ? 'bg-white border-stone-900 ring-1 ring-stone-900 shadow-sm'
                      : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-stone-900 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {barb.nombre.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">{barb.nombre}</h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Turno: {barb.horarioInicio} — {barb.horarioFin}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: SELECT DATE & TIME SLOT */}
        {step === 4 && (
          <div className="space-y-4 animate-luxury-in">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(3)}
                className="p-1 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-stone-900">Fecha & Horario</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Especialista: <span className="text-stone-900 font-bold">{selectedBarbero?.nombre}</span> • Servicio: <span className="text-stone-900 font-bold">{selectedServicio?.nombre}</span>
                </p>
              </div>
            </div>

            {/* Date input */}
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-3.5">
              <CalendarIcon className="w-4 h-4 text-stone-600" />
              <div className="flex-1">
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
                  Fecha de la Cita
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedFecha}
                  onChange={(e) => setSelectedFecha(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-bold focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>
            </div>

            {/* Time Slots Grid */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-stone-900 tracking-wide">
                  Horarios Disponibles
                </label>
                <span className="text-[10px] text-stone-400 font-medium">Tiempo estimado: {selectedServicio?.duracionMinutos || 30} min</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {availableSlots.map(slot => (
                  <button
                    key={slot.hora}
                    disabled={!slot.disponible}
                    onClick={() => {
                      setSelectedHora(slot.hora);
                      setStep(5);
                    }}
                    className={`py-2 px-1 text-xs rounded-lg font-bold transition text-center ${
                      !slot.disponible
                        ? 'bg-stone-100 text-stone-400 line-through cursor-not-allowed border border-stone-200'
                        : selectedHora === slot.hora
                        ? 'bg-stone-900 text-white font-bold shadow-xs'
                        : 'bg-white border border-stone-200 hover:border-stone-400 text-stone-800'
                    }`}
                  >
                    {slot.hora}
                  </button>
                ))}
              </div>

              {availableSlots.length === 0 && (
                <p className="text-xs text-stone-400 py-6 text-center">
                  Consultando agenda en tiempo real...
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: CLIENT DETAILS & CONFIRM */}
        {step === 5 && (
          <div className="space-y-4 animate-luxury-in">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(4)}
                className="p-1 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-stone-900">Detalles de Contacto</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Sin registro ni contraseñas. Te enviaremos el folio y recordatorios por WhatsApp.
                </p>
              </div>
            </div>

            {/* Booking Summary Box */}
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <span className="text-stone-500">Servicio seleccionado</span>
                <span className="font-bold text-stone-900">{selectedServicio?.nombre} — ${Number(selectedServicio?.precioVenta).toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Master Barber</span>
                <span className="font-semibold text-stone-800">{selectedBarbero?.nombre}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Fecha & Hora</span>
                <span className="font-bold text-stone-900">{selectedFecha} a las {selectedHora}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Sucursal</span>
                <span className="font-semibold text-stone-800">{selectedSucursal?.nombre}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Santiago Morales"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Número de WhatsApp (10 dígitos) *</label>
                <input
                  type="tel"
                  required
                  placeholder="55 1234 5678"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
                />
                <span className="text-[10px] text-stone-400 mt-1 block font-medium">
                  Envío automatizado de folio y recordatorios de 24h y 2h antes.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Notas especiales (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Arreglo específico de barba, recorte suave..."
                  value={clienteNotas}
                  onChange={(e) => setClienteNotas(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>

              <div className="flex items-start gap-2.5 pt-1 pb-1">
                <input
                  type="checkbox"
                  id="consentimientoPrivacidad"
                  required
                  checked={consentimientoPrivacidad}
                  onChange={(e) => setConsentimientoPrivacidad(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                />
                <label htmlFor="consentimientoPrivacidad" className="text-[11px] text-stone-600 leading-snug cursor-pointer select-none">
                  He leído y acepto el{' '}
                  <a
                    href="/privacidad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-900 font-semibold underline hover:text-stone-700"
                  >
                    Aviso de Privacidad
                  </a>{' '}
                  y el tratamiento de mis datos personales para la gestión de mi cita (LFPDPPP).
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
              >
                Confirmar Reservación
              </button>
            </form>
          </div>
        )}

        {/* STEP 6: CONFIRMATION SCREEN */}
        {step === 6 && bookingResult && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-sm animate-luxury-in max-w-lg mx-auto">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-stone-900">
                Reservación Confirmada
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Hemos reservado tu lugar en la agenda del salón.
              </p>
            </div>

            {/* Folio Highlight */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500 block mb-1">
                Folio de Reservación
              </span>
              <div className="text-2xl font-black text-stone-900 tracking-wider font-mono">
                {bookingResult.codigoReserva}
              </div>
            </div>

            {/* Booking Details Summary */}
            <div className="text-left bg-stone-50/60 p-4 rounded-xl border border-stone-200 text-xs space-y-2 text-stone-700">
              <div className="flex justify-between">
                <span className="text-stone-500">Servicio:</span>
                <span className="text-stone-900 font-bold">{selectedServicio?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Fecha y Hora:</span>
                <span className="text-stone-900 font-bold">{selectedFecha} a las {selectedHora}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Master Barber:</span>
                <span className="text-stone-900 font-bold">{selectedBarbero?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Ubicación:</span>
                <span className="text-stone-900 font-bold">{selectedSucursal?.nombre}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              {bookingResult.whatsappLink && (
                <a
                  href={bookingResult.whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Confirmación en WhatsApp</span>
                </a>
              )}

              <button
                onClick={() => {
                  setStep(1);
                  setBookingResult(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs transition"
              >
                Agendar otra cita
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white py-5 text-center text-[11px] text-stone-500">
        SYSTECH Studio Platform para {shopData.nombre} • Cumplimiento LFPDPPP México
      </footer>

    </div>
  );
};

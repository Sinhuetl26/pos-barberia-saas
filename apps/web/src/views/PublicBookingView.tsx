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
  Check,
  Printer,
  MessageCircle,
  Instagram,
  Facebook,
  Award,
  Coffee,
  Flame,
  Star
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

  // View Mode: 'showcase' (Landing de Introducción / Perfil de Barbería) o 'booking' (Flujo de Citas)
  const [viewMode, setViewMode] = useState<'showcase' | 'booking'>('showcase');

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

  const handleStartBookingWithBarber = (barbero: any) => {
    setSelectedBarbero(barbero);
    if (shopData?.sucursales?.length > 0) {
      setSelectedSucursal(shopData.sucursales[0]);
    }
    setViewMode('booking');
    setStep(2); // Salta directo a seleccionar servicio
  };

  const handleStartBookingWithService = (servicio: any) => {
    setSelectedServicio(servicio);
    if (shopData?.sucursales?.length > 0) {
      setSelectedSucursal(shopData.sucursales[0]);
    }
    setViewMode('booking');
    setStep(3); // Salta directo a seleccionar barbero
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
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-stone-400">Cargando salón...</p>
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

  const sucursalPrincipal = shopData.sucursales?.[0];
  const barberosDisponibles = sucursalPrincipal?.barberos || [];
  const whatsappNumber = (shopData.whatsappPublico || shopData.telefono || '').replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900 flex flex-col justify-between selection:bg-stone-900 selection:text-white font-sans">
      
      {/* Top Header */}
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div
            onClick={() => setViewMode('showcase')}
            className="flex items-center gap-3 cursor-pointer"
          >
            {shopData.logoUrl ? (
              <img src={shopData.logoUrl} alt={shopData.nombre} className="w-9 h-9 rounded-xl object-cover shadow-xs" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
                <Scissors className="w-4 h-4 stroke-[2]" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-stone-900">
                  {shopData.nombre}
                </h1>
                <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 uppercase">
                  Oficial
                </span>
              </div>
              <p className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-stone-400" />
                <span>{sucursalPrincipal?.nombre || shopData.direccion || 'Sucursal Principal'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'booking' ? (
              <button
                onClick={() => setViewMode('showcase')}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 transition"
              >
                ← Ver Presentación
              </button>
            ) : (
              <button
                onClick={() => setViewMode('booking')}
                className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition shadow-xs flex items-center gap-1.5"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Reservar Cita</span>
              </button>
            )}

            <button
              onClick={() => {
                setShowLookup(!showLookup);
                setLookupError('');
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition"
            >
              {showLookup ? 'Cerrar' : 'Mi Folio'}
            </button>
            {onExit && (
              <button
                onClick={onExit}
                className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition"
              >
                Panel
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full animate-luxury-in">
        
        {/* Lookup / Cancel Cita Section */}
        {showLookup && (
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm animate-luxury-in">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-stone-900 tracking-wide uppercase">
                  Consultar o Imprimir Cita Agendada
                </h3>
                <span className="text-[10px] text-stone-400 font-mono">Privacidad Segura</span>
              </div>
              <p className="text-xs text-stone-500 mb-4">
                Ingresa el folio único generado al momento de agendar (ej. <span className="text-stone-900 font-bold font-mono">RES-XXXX</span>).
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={lookupFolio}
                  onChange={(e) => setLookupFolio(e.target.value)}
                  placeholder="RES-A1B2C3D4"
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-stone-900"
                />
                <button
                  type="button"
                  onClick={handleLookupBooking}
                  className="px-4 py-2 bg-stone-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-stone-800 transition"
                >
                  Buscar Cita
                </button>
              </div>

              {lookupError && (
                <p className="text-xs text-rose-600 font-semibold mt-3">{lookupError}</p>
              )}

              {lookedUpCita && (
                <div className="mt-4 pt-4 border-t border-stone-100 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 font-mono">{lookedUpCita.codigoReserva}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      lookedUpCita.estado === 'CANCELADA' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {lookedUpCita.estado}
                    </span>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1 text-stone-700">
                    <div><strong>Servicio:</strong> {lookedUpCita.nombreServicio}</div>
                    <div><strong>Barbero:</strong> {lookedUpCita.barbero?.nombre}</div>
                    <div><strong>Fecha:</strong> {new Date(lookedUpCita.fechaHora).toLocaleString('es-MX')}</div>
                    <div><strong>Total Estimado:</strong> ${Number(lookedUpCita.precioEstimado || 0).toFixed(2)} MXN</div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => api.printCitaCarta(lookedUpCita.codigoReserva)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>🖨️ Comprobante Tamaño Carta</span>
                    </button>

                    {lookedUpCita.estado !== 'CANCELADA' && (
                      <button
                        type="button"
                        onClick={handleCancelBooking}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline"
                      >
                        Cancelar Reservación
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODO 1: SHOWCASE LANDING DE INTRODUCCIÓN Y PRESENTACIÓN */}
        {/* ======================================================== */}
        {viewMode === 'showcase' && (
          <div className="space-y-12 pb-16">
            
            {/* HERO SECTION */}
            <div className="relative bg-stone-900 text-white overflow-hidden">
              {/* Background Cover Image with Gradient */}
              <div className="absolute inset-0 z-0">
                <img
                  src={shopData.portadaUrl || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1600&q=80'}
                  alt="Portada Barbería"
                  className="w-full h-full object-cover opacity-35"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/80 to-transparent" />
              </div>

              <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-center text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-stone-200 mb-6">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{sucursalPrincipal?.diasLaborales || 'Lunes a Sábado'} • {sucursalPrincipal?.horarioApertura || '09:00'} a {sucursalPrincipal?.horarioCierre || '20:00'}</span>
                </div>

                {/* Main Titles */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-4 uppercase">
                  {shopData.nombre}
                </h1>
                <p className="text-base sm:text-xl text-stone-300 max-w-2xl font-light mb-8">
                  {shopData.slogan || 'El arte del corte clásico y diseño de vanguardia. Vive una experiencia de cuidado masculino sin igual.'}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setViewMode('booking')}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-extrabold text-sm transition shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <CalendarIcon className="w-4 h-4 text-stone-900" />
                    <span>Agendar Cita Ahora</span>
                  </button>

                  {whatsappNumber && (
                    <a
                      href={`https://wa.me/52${whatsappNumber}?text=Hola,%20me%20gustar%C3%ADa%20agendar%20una%20cita%20en%20${encodeURIComponent(shopData.nombre)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-6 py-4 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-sm transition shadow-lg flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Directo</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* SOBRE NOSOTROS */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest block mb-1">
                      Nuestra Filosofía
                    </span>
                    <h2 className="text-2xl font-black text-stone-900 tracking-tight mb-4">
                      Tradición & Estilo Masculino
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-6">
                      {shopData.descripcion ||
                        'En nuestro salón cada corte es un ritual de precisión. Cuidamos cada detalle desde el degradado milimétrico hasta el afeitado clásico con toalla caliente y navaja libre.'}
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-stone-800">
                      <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                        <Flame className="w-4 h-4 text-amber-600" />
                        <span>Toalla Caliente</span>
                      </div>
                      <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                        <Coffee className="w-4 h-4 text-amber-800" />
                        <span>Bebida de Cortesía</span>
                      </div>
                      <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                        <Award className="w-4 h-4 text-stone-700" />
                        <span>Master Barbers</span>
                      </div>
                      <div className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span>Productos Premium</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden shadow-lg h-72">
                    <img
                      src={shopData.portadaUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80'}
                      alt="Ambiente Barbería"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* NUESTRO EQUIPO DE BARBEROS (CON FOTOS, ESPECIALIDADES Y BIOGRAFÍAS) */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="text-center max-w-xl mx-auto mb-8">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest block mb-1">
                  Profesionales del Estilo
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  Conoce a Nuestro Equipo
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Elige a tu barbero preferido para tu cita o agenda con cualquier especialista disponible.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {barberosDisponibles.map((b: any) => (
                  <div
                    key={b.id}
                    className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs hover:border-stone-400 hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Avatar */}
                      <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-stone-900 shadow-sm mb-4">
                        {b.avatarUrl ? (
                          <img src={b.avatarUrl} alt={b.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-stone-900 text-white font-bold flex items-center justify-center text-2xl">
                            {b.nombre.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="text-center mb-3">
                        <h3 className="font-bold text-base text-stone-900">{b.nombre}</h3>
                        <p className="text-xs text-amber-700 font-semibold mt-0.5">{b.especialidad || 'Master Barber'}</p>
                      </div>

                      <p className="text-xs text-stone-600 text-center line-clamp-3 mb-4 italic">
                        "{b.descripcion || 'Especialista en cortes clásicos, fades modernos y perfilado milimétrico de barba.'}"
                      </p>
                    </div>

                    <div className="pt-4 border-t border-stone-100 flex flex-col gap-2">
                      <div className="text-[11px] text-stone-400 text-center font-medium">
                        Horario: {b.horarioInicio || '09:00'} - {b.horarioFin || '20:00'}
                      </div>
                      <button
                        onClick={() => handleStartBookingWithBarber(b)}
                        className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>Reservar con {b.nombre.split(' ')[0]}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NUESTROS SERVICIOS & PRECIOS */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="text-center max-w-xl mx-auto mb-8">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest block mb-1">
                  Menú de Servicios
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  Cortes, Barba & Tratamientos
                </h2>
                <p className="text-xs text-stone-500 mt-1">Precios transparentes y duración estimada.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {servicios.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs hover:border-stone-400 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-stone-900 text-sm">{s.nombre}</h4>
                        <span className="text-base font-black text-stone-900 font-mono whitespace-nowrap">
                          ${Number(s.precioVenta).toFixed(0)} MXN
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>{s.duracionMinutos} minutos</span>
                        <span>•</span>
                        <span className="uppercase text-[10px] font-semibold text-stone-400">{s.categoria}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartBookingWithService(s)}
                      className="w-full py-2 rounded-lg bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-800 font-semibold text-xs transition"
                    >
                      Agendar este servicio
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* UBICACIÓN & CONTACTO */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-base font-bold text-stone-900 mb-1">Visítanos en {shopData.nombre}</h3>
                  <p className="text-xs text-stone-600 flex items-center gap-1.5 mb-2">
                    <MapPin className="w-4 h-4 text-stone-500" />
                    <span>{sucursalPrincipal?.direccion || shopData.direccion || 'Dirección disponible en confirmación'}</span>
                  </p>
                  <p className="text-xs text-stone-500">
                    Teléfono: <strong>{sucursalPrincipal?.telefono || shopData.telefono || 'Sin teléfono'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {shopData.instagram && (
                    <a
                      href={`https://instagram.com/${shopData.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                      title="Instagram"
                    >
                      <Instagram className="w-5 h-5 text-rose-600" />
                    </a>
                  )}
                  {shopData.facebook && (
                    <a
                      href={shopData.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                      title="Facebook"
                    >
                      <Facebook className="w-5 h-5 text-blue-600" />
                    </a>
                  )}
                  <button
                    onClick={() => setViewMode('booking')}
                    className="px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                  >
                    Agendar Cita
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* MODO 2: FLUJO DE AGENDAMIENTO INTERACTIVO */}
        {/* ======================================================== */}
        {viewMode === 'booking' && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-luxury-in">
            
            {/* Step Indicators */}
            {step < 6 && (
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('showcase')}
                  className="text-stone-500 hover:text-stone-900 font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a la Presentación</span>
                </button>

                <div className="flex items-center gap-2 font-mono text-[11px] text-stone-400">
                  <span className="text-stone-900 font-bold">Paso {step} de 5</span>
                </div>
              </div>
            )}

            {/* STEP 1: SUCURSAL */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-stone-900">Selecciona la Sucursal</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {shopData.sucursales.map((s: any) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedSucursal(s);
                        setStep(2);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        selectedSucursal?.id === s.id ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900' : 'border-stone-200 bg-white hover:border-stone-400'
                      }`}
                    >
                      <h4 className="font-bold text-sm text-stone-900">{s.nombre}</h4>
                      <p className="text-xs text-stone-500 mt-1">{s.direccion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: SERVICIO */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900">Selecciona tu Servicio</h3>
                  <button onClick={() => setStep(1)} className="text-xs text-stone-500 hover:underline">Cambiar sucursal</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {servicios.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedServicio(s);
                        setStep(3);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        selectedServicio?.id === s.id ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900' : 'border-stone-200 bg-white hover:border-stone-400'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-stone-900">{s.nombre}</h4>
                        <span className="font-bold text-sm text-stone-900 font-mono">${Number(s.precioVenta).toFixed(0)}</span>
                      </div>
                      <div className="text-xs text-stone-500">{s.duracionMinutos} minutos • {s.categoria}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: BARBERO */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900">Selecciona al Barbero</h3>
                  <button onClick={() => setStep(2)} className="text-xs text-stone-500 hover:underline">Cambiar servicio</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {barberosDisponibles.map((b: any) => (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedBarbero(b);
                        setStep(4);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                        selectedBarbero?.id === b.id ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900' : 'border-stone-200 bg-white hover:border-stone-400'
                      }`}
                    >
                      {b.avatarUrl ? (
                        <img src={b.avatarUrl} alt={b.nombre} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center">
                          {b.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-stone-900">{b.nombre}</h4>
                        <p className="text-xs text-stone-500">{b.especialidad || 'Master Barber'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: FECHA Y HORA */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900">Elige Fecha y Horario</h3>
                  <button onClick={() => setStep(3)} className="text-xs text-stone-500 hover:underline">Cambiar barbero</button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedFecha}
                    onChange={(e) => setSelectedFecha(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">Horarios Disponibles</label>
                  {availableSlots.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">No hay horarios libres para esta fecha.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableSlots.map(slot => (
                        <button
                          key={slot.hora}
                          disabled={!slot.disponible}
                          type="button"
                          onClick={() => {
                            setSelectedHora(slot.hora);
                            setStep(5);
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition ${
                            !slot.disponible
                              ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                              : selectedHora === slot.hora
                              ? 'bg-stone-900 text-white'
                              : 'bg-white border border-stone-200 hover:border-stone-400 text-stone-800'
                          }`}
                        >
                          {slot.hora}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: DATOS DEL CLIENTE */}
            {step === 5 && (
              <form onSubmit={handleConfirmBooking} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <h3 className="text-base font-bold text-stone-900">Tus Datos de Contacto</h3>
                  <button type="button" onClick={() => setStep(4)} className="text-xs text-stone-500 hover:underline">Cambiar horario</button>
                </div>

                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div><strong>Servicio:</strong> {selectedServicio?.nombre} (${Number(selectedServicio?.precioVenta).toFixed(0)} MXN)</div>
                  <div><strong>Barbero:</strong> {selectedBarbero?.nombre}</div>
                  <div><strong>Horario:</strong> {selectedFecha} a las {selectedHora} hrs</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Teléfono Móvil (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="10 dígitos para enviar confirmación"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Notas especiales (opcional)</label>
                  <input
                    type="text"
                    value={clienteNotas}
                    onChange={(e) => setClienteNotas(e.target.value)}
                    placeholder="Ej. Diseño especial, alergias o barba larga"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <label className="flex items-start gap-2 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentimientoPrivacidad}
                    onChange={(e) => setConsentimientoPrivacidad(e.target.checked)}
                    className="mt-0.5 rounded border-stone-300 text-stone-900"
                  />
                  <span className="text-[11px] text-stone-500">
                    Acepto el <a href="/privacidad" target="_blank" className="underline text-stone-700">Aviso de Privacidad</a> y confirmo mi asistencia al horario reservado.
                  </span>
                </label>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm transition shadow-sm mt-3"
                >
                  Confirmar Reservación
                </button>
              </form>
            )}

            {/* STEP 6: CONFIRMATION SCREEN CON BOTÓN DE IMPRIMIR CARTA */}
            {step === 6 && bookingResult && (
              <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-xs max-w-lg mx-auto">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <Check className="w-7 h-7 stroke-[2.5]" />
                </div>

                <div>
                  <h2 className="text-xl font-bold tracking-tight text-stone-900">
                    ¡Reservación Confirmada!
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Tu turno ha sido bloqueado en la agenda de la barbería.
                  </p>
                </div>

                {/* Folio Highlight */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500 block mb-1">
                    Folio Único de Cita
                  </span>
                  <div className="text-2xl font-black text-stone-900 tracking-wider font-mono">
                    {bookingResult.codigoReserva}
                  </div>
                </div>

                {/* Details Summary */}
                <div className="text-left bg-stone-50/70 p-4 rounded-xl border border-stone-200 text-xs space-y-2 text-stone-700">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Servicio:</span>
                    <span className="font-bold text-stone-900">{selectedServicio?.nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Horario:</span>
                    <span className="font-bold text-stone-900">{selectedFecha} a las {selectedHora} hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Master Barber:</span>
                    <span className="font-bold text-stone-900">{selectedBarbero?.nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Sucursal:</span>
                    <span className="font-bold text-stone-900">{selectedSucursal?.nombre}</span>
                  </div>
                </div>

                {/* Action Buttons: Imprimir Carta & WhatsApp */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => api.printCitaCarta(bookingResult.codigoReserva)}
                    className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ Imprimir Comprobante Tamaño Carta (8.5" x 11")</span>
                  </button>

                  {bookingResult.whatsappLink && (
                    <a
                      href={bookingResult.whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Abrir Confirmación en WhatsApp</span>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setStep(1);
                      setViewMode('showcase');
                      setBookingResult(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs transition"
                  >
                    Volver a la Página Principal
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        <p className="font-semibold text-stone-700">{shopData.nombre} • Sistema de Citas Oficial</p>
        <p className="text-[11px] text-stone-400 mt-1">Cumplimiento LFPDPPP México • Powered by SYSTECH Studio</p>
      </footer>

    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { branchToday, branchDateTime } from '../utils/branchTime';
import { findNextBookingSlot } from '../utils/nextBookingSlot';
import { AvisoPrivacidadView } from './AvisoPrivacidadView';
import { OperationState } from '../components/OperationState';
import { CutReferenceFields, CutReferenceInput } from '../components/CutReferenceFields';
import { bookingAppearance, bookingTheme } from '../utils/bookingAppearance';
import { publicEmailHref, publicSocialHref } from '../utils/publicContactLinks';
import '../styles/booking-experience.css';
import {
  Scissors,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronRight,
  ArrowLeft,
  Check,
  Printer,
  MessageCircle,
  Instagram,
  Facebook,
  Music,
  Mail
} from 'lucide-react';

interface PublicBookingViewProps {
  slug?: string;
  onExit?: () => void;
  ownerPanelTenantId?: string;
}

export const PublicBookingView: React.FC<PublicBookingViewProps> = ({ slug, onExit, ownerPanelTenantId }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const effectiveSlug = routeSlug || slug || 'el-bigote';

  const [shopData, setShopData] = useState<any>(null);
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showcaseSucursalId, setShowcaseSucursalId] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const heroAction = useRef<HTMLButtonElement>(null);
  const [heroActionVisible, setHeroActionVisible] = useState(true);
  const [serviceAwaitingBranch, setServiceAwaitingBranch] = useState<any>(null);

  // View Mode: 'showcase' (Landing de Introducción / Perfil de Barbería) o 'booking' (Flujo de Citas)
  const [viewMode, setViewMode] = useState<'showcase' | 'booking'>('showcase');

  // Booking Flow Steps: 1: Sucursal, 2: Servicio, 3: Barbero, 4: Horario, 5: Datos, 6: Confirmación
  const [step, setStep] = useState<number>(1);

  // Selections
  const [selectedSucursal, setSelectedSucursal] = useState<any>(null);
  const [selectedServicios, setSelectedServicios] = useState<any[]>([]);
  const [selectedBarbero, setSelectedBarbero] = useState<any>(null);
  const todayLocal=branchToday(selectedSucursal?.zonaHoraria);
  const [selectedFecha, setSelectedFecha] = useState<string>(todayLocal);
  const [serverSummary, setServerSummary] = useState<{ key: string; duration: number; price: number } | null>(null);
  const servicesKey = selectedServicios.map(s => s.id).join(',');
  const selectionKey = `${selectedSucursal?.id || ''}:${servicesKey}:${selectedBarbero?.id || ''}:${selectedFecha}`;
  const selectedServicio = selectedServicios.length ? { id: servicesKey, nombre: selectedServicios.map(s => s.nombre).join(' + '), duracionMinutos: serverSummary?.key === selectionKey ? serverSummary.duration : selectedServicios.reduce((sum, s) => sum + Number(s.duracionMinutos || 30), 0), precioVenta: serverSummary?.key === selectionKey ? serverSummary.price : selectedServicios.reduce((sum, s) => sum + Math.round(Number(s.precioVenta) * 100), 0) / 100 } : null;
  const setSelectedServicio = (service: any) => setSelectedServicios(service ? [service] : []);
  const [availableSlots, setAvailableSlots] = useState<{ hora: string; disponible: boolean; barberoId?: string; barberoNombre?: string; precioEstimado?: number; serviciosResumen?: { id: string; nombre: string; precio: number; duracion: number }[] }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [slotsDateInvalid, setSlotsDateInvalid] = useState(false);
  const [slotsRetry, setSlotsRetry] = useState(0);
  const [availabilityReason, setAvailabilityReason] = useState<string | null>(null);
  const [nextSlotBusy, setNextSlotBusy] = useState(false);
  const [nextSlotMessage, setNextSlotMessage] = useState('');
  const nextSlotRequest = useRef(0);
  useEffect(() => { nextSlotRequest.current++; setNextSlotBusy(false); return () => { nextSlotRequest.current++; }; }, [selectedSucursal?.id, selectedBarbero?.id, selectedServicio?.id, selectedFecha, step]);
  useEffect(() => { setNextSlotMessage(''); }, [selectedSucursal?.id, selectedBarbero?.id, selectedServicio?.id, step]);
  const [confirming, setConfirming] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [pendingBooking,setPendingBooking]=useState<any>(null);
  const bookingBusy=useRef(false);
  const recoverBooking=async()=>{if(bookingBusy.current||!pendingBooking)return;bookingBusy.current=true;setConfirming(true);try{const result=await api.bookPublicAppointment(pendingBooking);setBookingResult(result);setPendingBooking(null);setViewMode('booking');setStep(6);}catch(e:any){setBookingError(e.message);}finally{bookingBusy.current=false;setConfirming(false);}};
  const [selectedHora, setSelectedHora] = useState<string>('');
  const selectedSlotQuote = availableSlots.find(slot => slot.hora === selectedHora && slot.disponible);
  const bookingPrice = selectedSlotQuote && Number.isFinite(selectedSlotQuote.precioEstimado) ? selectedSlotQuote.precioEstimado! : selectedServicio?.precioVenta;
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteNotas, setClienteNotas] = useState('');
  const [cutReference, setCutReference] = useState<CutReferenceInput>({ tipoCorte: '', fotoReferencia: null });
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [consentimientoPrivacidad, setConsentimientoPrivacidad] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const privacyDialog = useRef<HTMLDialogElement>(null);
  const privacyReturnFocus = useRef<HTMLButtonElement | null>(null);
  const bookingStepHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const action = heroAction.current;
    if (!action || viewMode !== 'showcase') { setHeroActionVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setHeroActionVisible(entry.isIntersecting), { rootMargin: '-90px 0px 0px 0px' });
    observer.observe(action);
    return () => observer.disconnect();
  }, [viewMode, loading]);

  useEffect(() => {
    if (viewMode === 'booking') bookingStepHeading.current?.focus();
  }, [viewMode, step]);

  useEffect(() => {
    if (viewMode === 'booking' && step === 4) setSlotsRetry(value => value + 1);
  }, [viewMode, step]);

  useEffect(() => {
    if (showPrivacy) privacyDialog.current?.showModal();
    else if (privacyReturnFocus.current) {
      privacyReturnFocus.current.focus();
      privacyReturnFocus.current = null;
    }
  }, [showPrivacy]);
  const openPrivacy = (event: React.MouseEvent<HTMLButtonElement>) => {
    privacyReturnFocus.current = event.currentTarget;
    setShowPrivacy(true);
  };

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
    setLoadError('');
    setShopData(null);
    setShowcaseSucursalId('');
    setFailedImages({});
    setViewMode('showcase');
    setStep(1);
    setSelectedSucursal(null);
    setSelectedServicio(null);
    setSelectedBarbero(null);
    setServiceAwaitingBranch(null);
    setBookingResult(null);
    setClienteNombre('');
    setClienteTelefono('');
    setClienteNotas('');
    setCutReference({ tipoCorte: '', fotoReferencia: null });
    setConsentimientoPrivacidad(false);
    setShowPrivacy(false);
    setShowLookup(false);
    setLookedUpCita(null);
    setLookupFolio('');
    setLookupError('');
    try {
      const res = await api.getPublicBarberia(effectiveSlug);
      setShopData(res.tenant);
      setPendingBooking(api.pendingPublicBooking(res.tenant.id));
      setServicios(res.servicios);
      if (res.tenant.sucursales.length > 0) {
        setSelectedSucursal(res.tenant.sucursales[0]);
        if (res.tenant.sucursales.length === 1) setShowcaseSucursalId(res.tenant.sucursales[0].id);
        setSelectedFecha(branchToday(res.tenant.sucursales[0].zonaHoraria));
      }
    } catch (e: any) {
      setLoadError(e.message || 'No pudimos consultar esta barbería.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setAvailableSlots([]);
    setSelectedHora('');
    setSlotsError('');
    setAvailabilityReason(null);
    setSlotsDateInvalid(false);
    setSlotsLoading(false);
    if (selectedSucursal && selectedBarbero && selectedFecha && selectedServicio) {
      setSlotsLoading(true);
      api.getPublicAvailability(
        selectedSucursal.id,
        selectedBarbero.id,
        selectedFecha,
        selectedServicio.duracionMinutos || 30,
        selectedServicios.map(s => s.id)
      ).then(res => {
        if (!cancelled) { setAvailableSlots(res.slots); setAvailabilityReason(res.reason || null); if (Number.isFinite(res.totalPrecio) && Number.isFinite(res.duracionSolicitada)) setServerSummary({ key: selectionKey, duration: res.duracionSolicitada!, price: res.totalPrecio! }); }
      }).catch((error: any) => {
        if (!cancelled) {
          const invalidDate = ['BOOKING_HORIZON', 'BOOKING_DATE_RANGE', 'INVALID_DATE'].includes(error.code);
          setSlotsDateInvalid(invalidDate);
          setSlotsError(invalidDate
            ? 'Cambia la fecha: elige un día válido dentro de los próximos 90 días.'
            : 'No pudimos consultar los horarios. Intenta nuevamente.');
        }
      }).finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    }
    return () => { cancelled = true; };
  }, [selectedSucursal?.id, selectedBarbero?.id, selectedFecha, selectedServicio?.id, selectedServicio?.duracionMinutos, slotsRetry]);

  const selectBranch = (sucursal: any) => {
    setSelectedSucursal(sucursal);
    setSelectedFecha(branchToday(sucursal?.zonaHoraria));
    setSelectedServicio(null);
    setSelectedBarbero(null);
    setSelectedHora('');
    setAvailableSlots([]);
    setBookingError('');
  };

  const startBooking = () => {
    setShowLookup(false);
    setViewMode('booking');
    if (step > 1 && step < 6) return;
    const branch = shopData?.sucursales?.find((s: any) => s.id === showcaseSucursalId)
      || (shopData?.sucursales?.length === 1 ? shopData.sucursales[0] : null);
    selectBranch(branch);
    setServiceAwaitingBranch(null);
    setBookingResult(null);
    setStep(branch ? 2 : 1);
  };

  const handleStartBookingWithBarber = (barbero: any) => {
    const sucursal = shopData?.sucursales?.find((s: any) =>
      s.barberos?.some((b: any) => b.id === barbero.id)
    );
    if (!sucursal) return;
    setShowLookup(false);
    setServiceAwaitingBranch(null);
    setBookingError('');
    setSelectedSucursal(sucursal);
    setSelectedFecha(branchToday(sucursal?.zonaHoraria));
    setSelectedBarbero(barbero);
    setSelectedServicio(null);
    setSelectedHora('');
    setAvailableSlots([]);
    setViewMode('booking');
    setStep(2); // Salta directo a seleccionar servicio
  };

  const handleStartBookingWithService = (servicio: any) => {
    if (!servicio.sucursalId && !showcaseSucursalId && shopData.sucursales.length > 1) {
      selectBranch(null);
      setServiceAwaitingBranch(servicio);
      setShowLookup(false);
      setViewMode('booking');
      setStep(1);
      return;
    }
    const sucursal = servicio.sucursalId
      ? shopData?.sucursales?.find((s: any) => s.id === servicio.sucursalId)
      : shopData?.sucursales?.find((s: any) => s.id === showcaseSucursalId) || shopData?.sucursales?.[0];
    if (!sucursal) return;
    setShowLookup(false);
    setServiceAwaitingBranch(null);
    setBookingError('');
    setSelectedSucursal(sucursal);
    setSelectedFecha(branchToday(sucursal?.zonaHoraria));
    setSelectedServicio(servicio);
    setSelectedBarbero(null);
    setSelectedHora('');
    setAvailableSlots([]);
    setViewMode('booking');
    setStep(2); // Permite añadir otros servicios a la misma visita.
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingBusy.current) return;
    setBookingError('');
    if (photoProcessing) return setBookingError('Espera a que termine de prepararse la foto antes de confirmar.');
    if (!selectedSucursal || !selectedServicio || !selectedBarbero || !selectedHora || !clienteNombre || !clienteTelefono) {
      return setBookingError('Completa tus datos y selecciona un horario antes de confirmar.');
    }
    if (clienteNombre.trim().length < 2 || clienteNombre.trim().length > 100 || !/^\d{10,15}$/.test(clienteTelefono.replace(/\D/g, ''))) {
      return setBookingError('Escribe tu nombre y un teléfono de 10 a 15 dígitos, incluyendo la lada si corresponde.');
    }

    if (!consentimientoPrivacidad) {
      return setBookingError('Acepta el aviso de privacidad para confirmar tu reserva.');
    }
    if (!selectedSlotQuote || !Number.isFinite(selectedSlotQuote.precioEstimado) || !selectedSlotQuote.barberoId) { setStep(4); setSlotsRetry(value => value + 1); return setBookingError('Revisa nuevamente el horario y su precio antes de reservar.'); }

    bookingBusy.current=true;
    try {
      setConfirming(true);
      const fechaHora = `${selectedFecha}T${selectedHora}:00`;
      const res = await api.bookPublicAppointment({
        tenantId: shopData.id,
        sucursalId: selectedSucursal.id,
        barberoId: selectedBarbero.id,
        servicioId: selectedServicios[0].id,
        servicioIds: selectedServicios.map(s => s.id),
        precioConfirmado: selectedSlotQuote.precioEstimado,
        fechaHora,
        duracionMinutos: selectedServicio.duracionMinutos || 30,
        clienteNombre,
        clienteTelefono,
        notas: clienteNotas,
        tipoCorte: cutReference.tipoCorte.trim() || undefined,
        fotoReferencia: cutReference.fotoReferencia
      });

      setBookingResult(res);
      setCutReference({ tipoCorte: '', fotoReferencia: null });
      setStep(6);
    } catch (e: any) {
      if (e.code === 'PRICE_CONFIRMATION_REQUIRED') { setSelectedHora(''); setStep(4); setSlotsRetry(value => value + 1); }
      setBookingError(e.code === 'BOOKING_DATE_RANGE'
        ? 'Este horario ya no cumple el tiempo mínimo para reservar. Cambia el horario y elige uno disponible.'
        : e.code === 'SLOT_OCCUPIED'
          ? 'Este horario acaba de ocuparse. Cambia el horario y elige otro disponible.'
          : e.message || 'Recupera el resultado de tu reserva antes de crear otra.');
      setPendingBooking(api.pendingPublicBooking(shopData.id));
    } finally {
      bookingBusy.current=false;
      setConfirming(false);
    }
  };

  const handleLookupBooking = async () => {
    if (!lookupFolio.trim()) return;
    setLookupError('');
    try {
      const cita = await api.getPublicBooking(lookupFolio.trim().toUpperCase(),effectiveSlug);
      setLookedUpCita(cita);
    } catch (e: any) {
      setLookupError('No se encontró ninguna cita con el folio proporcionado.');
      setLookedUpCita(null);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center text-stone-500">
        <div className="w-8 h-8 rounded-full border-2 border-stone-200 border-t-stone-900 animate-spin mb-4" />
        <p className="text-sm font-semibold text-stone-600">Abriendo la barbería…</p>
      </div>
    );
  }

  if (!shopData) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 mb-4">
          <Scissors className="w-6 h-6 stroke-[1.75]" />
        </div>
        <h2 className="text-lg font-semibold text-stone-900 tracking-tight mb-2">No pudimos abrir esta barbería</h2>
        <p role="alert" className="text-sm text-stone-600 max-w-sm mb-6">{loadError || 'Revisa el enlace o contacta al establecimiento.'}</p>
        <button onClick={loadShop} className="studio-button">Reintentar</button>
      </div>
    );
  }

  const equipoPublico = (shopData.sucursales || []).flatMap((s: any) =>
    (s.barberos || []).map((b: any) => ({ ...b, sucursalId: s.id, sucursalNombre: s.nombre }))
  );
  const equipoVisible = equipoPublico.filter((b: any) => !showcaseSucursalId || b.sucursalId === showcaseSucursalId);
  const serviciosVisibles = servicios.filter(s => !showcaseSucursalId || !s.sucursalId || s.sucursalId === showcaseSucursalId);
  const sucursalPresentacion = shopData.sucursales?.find((s: any) => s.id === showcaseSucursalId);
  const barberosDisponibles = selectedSucursal?.barberos || [];
  const serviciosDisponibles = servicios.filter(s => !s.sucursalId || s.sucursalId === selectedSucursal?.id);
  const appearance = bookingAppearance(shopData.personalizacionWeb);
  const theme = bookingTheme(appearance.tema);
  const whatsappDigits = (shopData.whatsappPublico || shopData.telefono || '').replace(/\D/g, '');
  const whatsappNumber = whatsappDigits.length === 10 ? `52${whatsappDigits}` : whatsappDigits;
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, me gustaría agendar una cita en ${shopData.nombre}`)}` : '';
  const bookingSteps = shopData.sucursales.length === 1 ? [2, 3, 4, 5] : [1, 2, 3, 4, 5];
  const stepNames = ['Sucursal', 'Servicios', 'Profesional', 'Horario', 'Tus datos'];
  const bookingStyle = {
    '--booking-primary': theme.primary,
    '--booking-accent': theme.accent,
    '--booking-canvas': theme.canvas,
    '--booking-cover-position': appearance.posicionPortada,
  } as React.CSSProperties;
  const entryLabel = step > 1 && step < 6 ? 'Continuar reserva' : appearance.textoBoton;
  const instagramHref = publicSocialHref('instagram', shopData.instagram);
  const facebookHref = publicSocialHref('facebook', shopData.facebook);
  const tiktokHref = publicSocialHref('tiktok', shopData.tiktok);
  const emailHref = publicEmailHref(shopData.emailContacto);
  const imageVisible = (url: string | undefined) => Boolean(url && !failedImages[url]);
  const imageFailed = (url: string) => setFailedImages(previous => ({ ...previous, [url]: true }));
  const presentationAddress = sucursalPresentacion?.direccion || shopData.direccion;
  const selectedDateLabel = /^\d{4}-\d{2}-\d{2}$/.test(selectedFecha)
    ? new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${selectedFecha}T12:00:00Z`))
    : selectedFecha;
  const nextBookingDay = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedFecha)) return;
    const date = new Date(`${selectedFecha}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    setSelectedFecha(date.toISOString().slice(0, 10));
  };
  const bookingDateLimit = new Date(`${todayLocal}T12:00:00Z`);
  bookingDateLimit.setUTCDate(bookingDateLimit.getUTCDate() + 90);
  const searchNextSlot = async () => {
    if (nextSlotBusy || !selectedSucursal || !selectedBarbero || !selectedServicio) return;
    const request = ++nextSlotRequest.current;
    setNextSlotBusy(true); setNextSlotMessage('');
    try {
      const result = await findNextBookingSlot(todayLocal, bookingDateLimit.toISOString().slice(0,10), date => api.getPublicAvailability(selectedSucursal.id, selectedBarbero.id, date, selectedServicio.duracionMinutos || 30, selectedServicios.map(s => s.id)), () => request !== nextSlotRequest.current);
      if (request !== nextSlotRequest.current) return;
      if (result) { setSelectedFecha(result.date); setNextSlotMessage(`Primer horario encontrado: ${new Date(result.date + 'T12:00:00Z').toLocaleDateString('es-MX', {timeZone:'UTC',day:'numeric',month:'long'})} a las ${result.hora}. Selecciónalo abajo para continuar.`); }
      else setNextSlotMessage('No encontramos cupo en los próximos 30 días. Puedes consultar una fecha posterior o elegir otro profesional.');
    } catch { if (request === nextSlotRequest.current) setNextSlotMessage('No pudimos completar la búsqueda. Intenta nuevamente o consulta una fecha.'); }
    finally { if (request === nextSlotRequest.current) setNextSlotBusy(false); }
  };
  const availabilityCopy: Record<string, [string,string]> = {
    NO_SCHEDULE: ['Este profesional no atiende este día', 'Consulta otro día o elige otro profesional.'],
    SERVICE_DOES_NOT_FIT: ['El servicio no cabe en el horario de este día', 'La duración del servicio supera el tiempo de atención disponible. Prueba con otro profesional o fecha.'],
    DAY_ENDED: ['Los horarios de este día ya pasaron', 'Consulta el próximo día para reservar con anticipación.'],
    FULL: ['No queda cupo para este servicio este día', 'Los horarios están ocupados o bloqueados. Consulta otra fecha o profesional.']
  };
  const emptyCopy = availabilityCopy[availabilityReason || ''] || ['No hay horarios disponibles este día', 'Consulta otra fecha o profesional.'];
  const money = (amount: unknown) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: Number(amount) % 1 ? 2 : 0 }).format(Number(amount));
  const dateChoices = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(`${selectedFecha || todayLocal}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return { value: date.toISOString().slice(0, 10), label: new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(date) };
  }).filter(date => date.value <= bookingDateLimit.toISOString().slice(0, 10));

  return (
    <div style={bookingStyle} className={`public-booking booking-experience booking-cover-${appearance.portada} min-h-screen text-stone-900 flex flex-col justify-between selection:bg-stone-900 selection:text-white font-sans`}>
      <a className="studio-skip-link" href="#booking-content">Saltar al contenido de reservas</a>
      
      {/* Top Header */}
      {pendingBooking&&<div role="status" className="border-b border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900"><p>Hay una reserva cuyo resultado está pendiente. Recupérala antes de crear otra.</p><button type="button" disabled={confirming} onClick={recoverBooking} className="mt-2 rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-50">Recuperar reserva</button>{bookingError&&<p role="alert" className="mt-2">{bookingError}</p>}</div>}
      <header className="border-b border-stone-200/80 bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap gap-3 items-center justify-between">
          <button type="button"
            onClick={() => setViewMode('showcase')}
            className="flex items-center gap-3 text-left cursor-pointer"
          >
            {imageVisible(shopData.logoUrl) ? (
              <img src={shopData.logoUrl} onError={() => imageFailed(shopData.logoUrl)} alt={shopData.nombre} className="w-9 h-9 rounded-xl object-cover shadow-xs" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
                <Scissors className="w-4 h-4 stroke-[2]" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-stone-900">
                  {shopData.nombre}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-stone-400" />
                <span>{(viewMode === 'booking' ? selectedSucursal?.nombre : sucursalPresentacion?.nombre) || `${shopData.sucursales?.length || 0} sucursales`}</span>
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setShowLookup(!showLookup); setLookupError(''); }} aria-expanded={showLookup} aria-controls="booking-lookup" className="text-sm font-semibold px-3 min-h-11 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition">{showLookup ? 'Cerrar consulta' : 'Mi reserva'}</button>
            {onExit && ownerPanelTenantId === shopData.id && <button type="button" onClick={onExit} className="inline-flex items-center min-h-11 text-sm font-semibold px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition">Volver a mi panel</button>}
          </div>
        </div>
      </header>
      <main id="booking-content" tabIndex={-1} className="flex-1 w-full">
        {showLookup && (
          <section id="booking-lookup" aria-labelledby="booking-lookup-title" className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6">
              <h2 id="booking-lookup-title" className="text-lg font-bold text-stone-900">Consulta tu reserva</h2>
              <p className="text-sm text-stone-600 mt-2 mb-4">Ingresa el folio que recibiste al reservar. Puedes consultar tus datos e imprimir el comprobante.</p>
              <div className="flex gap-2 flex-wrap">
                <input type="text" value={lookupFolio} aria-label="Folio de tu reserva" onChange={e => setLookupFolio(e.target.value)} placeholder="RES-A1B2C3D4" className="flex-1 min-w-0 min-h-11 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-base font-semibold text-stone-900" />
                <button type="button" onClick={handleLookupBooking} className="px-4 py-2 bg-stone-900 text-white font-semibold text-sm rounded-xl">Buscar reserva</button>
              </div>
              {lookupError && <p role="alert" className="text-sm text-rose-700 font-semibold mt-3">{lookupError}</p>}
              {lookedUpCita && (
                <div className="mt-4 pt-4 border-t border-stone-100 text-sm space-y-3">
                  <div className="flex items-center justify-between gap-3"><span className="font-bold text-stone-900">{lookedUpCita.codigoReserva}</span><span className={`px-2 py-1 rounded font-semibold ${lookedUpCita.estado === 'CANCELADA' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{lookedUpCita.estado}</span></div>
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1 text-stone-700"><div><strong>Servicio:</strong> {lookedUpCita.nombreServicio}</div><div><strong>Barbero:</strong> {lookedUpCita.barbero?.nombre}</div><div><strong>Fecha:</strong> {branchDateTime(lookedUpCita.fechaHora, lookedUpCita.zonaHoraria)}</div><div><strong>Total estimado:</strong> ${Number(lookedUpCita.precioEstimado || 0).toFixed(2)} MXN</div></div>
                  <button type="button" onClick={() => api.printCitaCarta(lookedUpCita.codigoReserva)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white font-semibold text-sm"><Printer size={17} aria-hidden="true" />Imprimir comprobante</button>
                  <p className="text-sm text-stone-600">Para cambiar o cancelar, abre el enlace privado que recibiste al reservar.</p>
                </div>
              )}
            </div>
          </section>
        )}
        {viewMode === 'showcase' && (
          <div className="booking-showcase">
            <section className={`booking-hero ${imageVisible(shopData.portadaUrl) ? 'has-cover' : ''}`}>
              <div className="booking-hero-inner">
                <div className="booking-hero-copy">
                  <h1>{shopData.nombre}</h1>
                  <p>{shopData.slogan || 'Tu próxima visita empieza aquí. Elige el servicio, tu barbero y un horario disponible.'}</p>
                  {presentationAddress && <p className="booking-hero-location"><MapPin size={17} aria-hidden="true" />{presentationAddress}</p>}
                  <div className="booking-hero-actions">
                    <button ref={heroAction} type="button" onClick={startBooking} className="booking-action booking-action-light"><CalendarIcon size={18} aria-hidden="true" />{entryLabel}</button>
                    {appearance.mostrarContacto && whatsappNumber && <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="booking-action booking-action-outline"><MessageCircle size={18} aria-hidden="true" />WhatsApp</a>}
                  </div>
                  <p className="booking-hero-guide"><Check size={17} aria-hidden="true" />Sin crear una cuenta. Se paga en la barbería.</p>
                  <nav className="booking-section-nav" aria-label="Explora la barbería">
                    {appearance.mostrarServicios && <a href="#booking-services-title">Servicios</a>}
                    {appearance.mostrarEquipo && <a href="#booking-team-title">Equipo</a>}
                    {appearance.mostrarContacto && <a href="#booking-contact-title">Visítanos</a>}
                  </nav>
                </div>
                {imageVisible(shopData.portadaUrl) && <div className="booking-hero-image"><img src={shopData.portadaUrl} onError={() => imageFailed(shopData.portadaUrl)} alt={`Imagen de portada de ${shopData.nombre}`} fetchPriority="high" /><span className="booking-image-caption">{sucursalPresentacion?.nombre || shopData.nombre}</span></div>}
              </div>
            </section>

            {appearance.mensajeBienvenida && <section className="booking-section booking-welcome" aria-label="Mensaje de la barbería"><p>{appearance.mensajeBienvenida}</p></section>}

            {shopData.sucursales.length > 1 && (
              <section className="booking-section booking-branch-filter" aria-label="Sucursales para reservar">
                <div><h2>¿Dónde quieres atenderte?</h2><p>Elige una sucursal para ver sus servicios y equipo.</p></div>
                <div><label className="sr-only" htmlFor="public-branch">Sucursal</label><select id="public-branch" value={showcaseSucursalId} onChange={e => {
                  const id = e.target.value;
                  setShowcaseSucursalId(id);
                  selectBranch(shopData.sucursales.find((s: any) => s.id === id) || null);
                  setStep(1);
                }}><option value="">Ver todas las sucursales</option>{shopData.sucursales.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
              </section>
            )}

            {appearance.mostrarServicios && (
              <section className="booking-section booking-services-section" aria-labelledby="booking-services-title">
                <div className="booking-section-heading"><div><h2 id="booking-services-title">¿Qué te hacemos hoy?</h2><p>Encuentra tu servicio y hazlo tuyo. Tú eliges el barbero y la hora.</p></div><p className="booking-currency-note">Precios en pesos mexicanos.<br />Pago en la barbería.</p></div>
                {serviciosVisibles.length === 0 && <OperationState title="Aún no hay servicios publicados">Contacta a la barbería para consultar qué servicios puedes reservar.</OperationState>}
                <div className="booking-service-list">
                  {serviciosVisibles.map(s => (
                    <button type="button" key={s.id} className="booking-service" onClick={() => handleStartBookingWithService(s)} aria-label={`Elegir ${s.nombre}, ${money(s.precioVenta)}, ${s.duracionMinutos || 30} minutos`}>
                      <div className="booking-service-copy"><h3>{s.nombre}</h3><p><Clock size={16} aria-hidden="true" />{s.duracionMinutos || 30} minutos{s.categoria && <span>{s.categoria}</span>}</p>
                        {appearance.descripcionesServicios[s.id] && <p className="booking-service-description">{appearance.descripcionesServicios[s.id]}</p>}
                        {!showcaseSucursalId && shopData.sucursales.length > 1 && <p className="booking-service-branch">{s.sucursalId ? shopData.sucursales.find((branch: any) => branch.id === s.sucursalId)?.nombre : 'Todas las sucursales'}</p>}
                      </div>
                      <div className="booking-service-choice"><span className="booking-price">{money(s.precioVenta)}</span><span className="booking-service-select">Elegir<ChevronRight size={18} aria-hidden="true" /></span></div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {appearance.mostrarEquipo && (
              <section className="booking-section booking-team-section" aria-labelledby="booking-team-title">
                <div className="booking-section-heading"><div><h2 id="booking-team-title">En buenas manos</h2><p>Conoce al equipo y elige con quién quieres tu próximo corte.</p></div></div>
                <div className="booking-team-grid">
                  {equipoVisible.map((b: any) => (
                    <article key={b.id} className="booking-barber">
                      <div className={`booking-barber-portrait ${imageVisible(b.avatarUrl) ? '' : 'booking-portrait-initials'}`}>
                        {imageVisible(b.avatarUrl) ? <img src={b.avatarUrl} onError={() => imageFailed(b.avatarUrl)} alt={b.nombre} loading="lazy" /> : <span aria-hidden="true">{b.nombre?.charAt(0) || <Scissors size={38} />}</span>}
                      </div>
                      <div className="booking-barber-body"><h3>{b.nombre}</h3>{b.especialidad && <p className="booking-barber-specialty">{b.especialidad}</p>}
                        {shopData.sucursales.length > 1 && <p className="booking-barber-branch"><MapPin size={15} aria-hidden="true" />{b.sucursalNombre}</p>}
                        {b.descripcion && <p className="booking-barber-description">{b.descripcion}</p>}
                        <button type="button" onClick={() => handleStartBookingWithBarber(b)} className="booking-action booking-action-secondary">Elegir a {b.nombre?.split(' ')[0] || 'este barbero'}<ChevronRight size={17} aria-hidden="true" /></button>
                      </div>
                    </article>
                  ))}
                </div>
                {equipoVisible.length === 0 && <OperationState title="El equipo aún no está publicado">Elige otra sucursal o contacta a la barbería para reservar.</OperationState>}
              </section>
            )}

            {appearance.mostrarHistoria && shopData.descripcion && (
              <section className="booking-section booking-story"><div><h2>Conoce {shopData.nombre}</h2><p>{shopData.descripcion}</p></div></section>
            )}
            {appearance.mostrarGaleria && appearance.galeria.some(photo => photo.visible) && <section className="booking-section booking-gallery" aria-labelledby="booking-gallery-title"><div className="booking-section-heading"><div><h2 id="booking-gallery-title">Trabajos de la barbería</h2><p>Conoce los estilos que publicamos.</p></div><button type="button" onClick={startBooking} className="booking-action booking-action-secondary">Elegir mi próximo corte</button></div><div className="booking-gallery-grid">{appearance.galeria.filter(photo => photo.visible).map(photo => <figure key={photo.id}>{!failedImages[`gallery:${photo.id}`] ? <img src={photo.url} alt={photo.alt} loading="lazy" decoding="async" onError={() => setFailedImages(previous => ({ ...previous, [`gallery:${photo.id}`]: true }))} /> : <div className="booking-gallery-unavailable"><Scissors aria-hidden="true" /><span>Foto no disponible</span></div>}<figcaption>{photo.title}</figcaption></figure>)}</div></section>}

            {appearance.mostrarContacto && (
              <section className="booking-section booking-contact" aria-labelledby="booking-contact-title">
                <div className="booking-contact-heading"><h2 id="booking-contact-title">Nos vemos<br />en la barbería.</h2><p>Tu próxima visita empieza con un buen corte. Aquí nos encuentras.</p><button type="button" onClick={startBooking} className="booking-action booking-action-light"><CalendarIcon size={18} aria-hidden="true" />{entryLabel}</button></div>
                <div className="booking-contact-details">
                <div className="booking-location-list">
                  {(sucursalPresentacion ? [sucursalPresentacion] : shopData.sucursales).map((branch: any) => (
                    <article key={branch.id} className="booking-location"><MapPin size={22} aria-hidden="true" /><div><h3>{branch.nombre}</h3>{(branch.direccion || shopData.direccion) && <p>{branch.direccion || shopData.direccion}</p>}{branch.horarioApertura && branch.horarioCierre && <p>{branch.diasLaborales && `${branch.diasLaborales}: `}{branch.horarioApertura} a {branch.horarioCierre}</p>}
                      {(branch.telefono || shopData.telefono) && <a href={`tel:${(branch.telefono || shopData.telefono).replace(/[^+\d]/g, '')}`}>{branch.telefono || shopData.telefono}</a>}
                    </div></article>
                  ))}
                </div>
                <div className="booking-contact-actions">
                  {whatsappNumber && <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="booking-action booking-action-secondary"><MessageCircle size={18} aria-hidden="true" />Contactar por WhatsApp</a>}
                  {emailHref && <a href={emailHref} className="booking-action booking-social"><Mail size={19} aria-hidden="true" />{shopData.emailContacto}</a>}
                  {instagramHref && <a href={instagramHref} target="_blank" rel="noopener noreferrer" className="booking-action booking-social"><Instagram size={19} aria-hidden="true" />Instagram</a>}
                  {facebookHref && <a href={facebookHref} target="_blank" rel="noopener noreferrer" className="booking-action booking-social"><Facebook size={19} aria-hidden="true" />Facebook</a>}
                  {tiktokHref && <a href={tiktokHref} target="_blank" rel="noopener noreferrer" className="booking-action booking-social"><Music size={19} aria-hidden="true" />TikTok</a>}
                </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODO 2: FLUJO DE AGENDAMIENTO INTERACTIVO */}
        {/* ======================================================== */}
        {viewMode === 'booking' && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-8 public-booking-flow booking-flow">
            
            {/* Step Indicators */}
            {step < 6 && (
              <div className="booking-flow-heading">
                <button
                  type="button"
                  onClick={() => { const previous = bookingSteps[bookingSteps.indexOf(step) - 1]; if (previous) setStep(previous); else setViewMode('showcase'); }}
                  className="text-stone-500 hover:text-stone-900 font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{bookingSteps.indexOf(step) > 0 ? 'Atrás' : 'Ver la barbería'}</span>
                </button>

                <h2 ref={bookingStepHeading} tabIndex={-1} aria-live="polite">Paso {Math.max(1, bookingSteps.indexOf(step) + 1)} de {bookingSteps.length}: {stepNames[step - 1]}</h2>
              </div>
            )}
            {step < 6 && <ol className="booking-step-track" aria-label="Pasos de la reserva">{bookingSteps.map(stage => <li key={stage} aria-current={stage === step ? 'step' : undefined} className={stage === step ? 'is-current' : stage < step ? 'is-complete' : ''}><span>{stepNames[stage - 1]}</span></li>)}</ol>}

            {step > 1 && step < 6 && selectedSucursal && shopData.sucursales.length > 1 && (
              <p className="flex items-center gap-1.5 text-xs text-stone-500 mb-5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{selectedSucursal.nombre}</span>
              </p>
            )}

            <div className={step > 2 && step < 6 && selectedServicio ? 'booking-flow-layout' : ''}>
            {step > 2 && step < 6 && selectedServicio && (
              <aside className="booking-selection-summary" aria-label="Resumen de tu reserva">
                <div className="flex flex-wrap justify-between gap-2 font-semibold"><span>{selectedServicio.nombre}</span><span>${Number(bookingPrice).toFixed(2)} MXN</span></div>
                {selectedServicios.length > 1 && <ul className="mt-3 space-y-2 text-sm">{selectedServicios.map(service => <li key={service.id} className="flex justify-between gap-3"><span>{service.nombre} · {service.duracionMinutos} min</span><span>{money(service.precioVenta)}</span></li>)}</ul>}
                <p className="text-xs text-stone-500 mt-1">{selectedServicio.duracionMinutos} minutos{selectedBarbero ? ` · Con ${selectedBarbero.nombre}` : ''}</p>
                {selectedHora && <p>{selectedDateLabel} a las {selectedHora}</p>}
                <p className="booking-price-note">Se paga en la barbería. Esta reserva no realiza un cobro.</p>
              </aside>
            )}

            <div className="booking-flow-body">

            {/* STEP 1: SUCURSAL */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-stone-900">Selecciona la Sucursal</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {shopData.sucursales.map((s: any) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => {
                        selectBranch(s);
                        if (serviceAwaitingBranch && (!serviceAwaitingBranch.sucursalId || serviceAwaitingBranch.sucursalId === s.id)) {
                          setSelectedServicio(serviceAwaitingBranch);
                          setServiceAwaitingBranch(null);
                          setStep(2);
                        } else setStep(2);
                      }}
                      className={`w-full text-left min-h-11 p-4 rounded-xl border cursor-pointer transition ${
                        selectedSucursal?.id === s.id ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900' : 'border-stone-200 bg-white hover:border-stone-400'
                      }`}
                    >
                      <h4 className="font-bold text-sm text-stone-900">{s.nombre}</h4>
                      <p className="text-xs text-stone-500 mt-1">{s.direccion}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: SERVICIO */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">¿Qué te hacemos en esta visita?</h3>
                  {shopData.sucursales.length > 1 && <button onClick={() => setStep(1)} className="text-xs text-stone-500 hover:underline">Cambiar sucursal</button>}
                </div>

                <p className="booking-currency-note">Elige uno o varios servicios con el mismo profesional. Se reservan juntos en un solo horario y se pagan en la barbería.</p>
                {serviciosDisponibles.length === 0 && (
                  <div className="bg-white border border-stone-200 rounded-xl p-5 text-sm text-stone-600">
                    Esta sucursal aún no tiene servicios disponibles para reservar en línea. Contacta a la barbería o elige otra sucursal.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {serviciosDisponibles.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      aria-pressed={selectedServicios.some(service => service.id === s.id)}
                      onClick={() => {
                        if (!selectedServicios.some(service => service.id === s.id) && selectedServicios.length >= 10) { setBookingError('Puedes elegir hasta 10 servicios en una visita.'); return; }
                        setBookingError('');
                        setSelectedServicios(old => old.some(service => service.id === s.id) ? old.filter(service => service.id !== s.id) : [...old, s]);
                        setSelectedHora('');
                      }}
                      className={`w-full text-left min-h-11 p-4 rounded-xl border cursor-pointer transition ${
                        selectedServicios.some(service => service.id === s.id) ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900' : 'border-stone-200 bg-white hover:border-stone-400'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-stone-900">{s.nombre}</h4>
                        <span className="font-bold text-sm text-stone-900 font-mono">{money(s.precioVenta)}</span>
                      </div>
                      <div className="text-xs text-stone-500">{s.duracionMinutos} minutos • {s.categoria}</div>
                      {selectedServicios.some(service => service.id === s.id) && <span className="mt-2 flex items-center gap-2 text-xs font-semibold"><Check size={14} aria-hidden="true" />Incluido en tu visita</span>}
                      {appearance.descripcionesServicios[s.id] && <p className="mt-2 text-sm text-stone-600">{appearance.descripcionesServicios[s.id]}</p>}
                    </button>
                  ))}
                </div>
                {selectedServicio && <div className="booking-selection-summary"><p className="font-semibold">{selectedServicios.length} servicio{selectedServicios.length === 1 ? '' : 's'} · {selectedServicio.duracionMinutos} minutos · {money(selectedServicio.precioVenta)}</p><p>Precio de catálogo como referencia. La tarifa final se muestra al elegir profesional y horario; se reserva un bloque continuo.</p></div>}
                {bookingError && <p role="alert" className="text-sm text-rose-700">{bookingError}</p>}
                <button type="button" className="booking-action booking-action-primary w-full" disabled={!selectedServicio || selectedServicio.duracionMinutos > 480 || Boolean(pendingBooking)} onClick={() => setStep(selectedBarbero ? 4 : 3)}>Continuar con estos servicios</button>
                {selectedServicio && selectedServicio.duracionMinutos > 480 && <p role="alert" className="text-sm text-rose-700">La visita no puede superar ocho horas. Quita un servicio para continuar.</p>}
              </div>
            )}

            {/* STEP 3: BARBERO */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900">¿Con quién te atendemos?</h3>
                  <button onClick={() => setStep(2)} className="text-xs text-stone-500 hover:underline">Cambiar servicios</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={()=>{setSelectedBarbero({id:'cualquiera',nombre:'Cualquier profesional disponible'});setSelectedHora('');setStep(4);}} className="w-full min-h-11 rounded-xl border border-stone-300 bg-stone-50 p-4 text-left text-sm font-semibold">Cualquier profesional disponible<span className="mt-1 block text-xs font-normal text-stone-500">Te asignamos un barbero libre al confirmar.</span></button>
                  {barberosDisponibles.map((b: any) => (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => {
                        setSelectedBarbero(b);
                        setSelectedHora('');
                        setStep(4);
                      }}
                      className={`w-full text-left min-h-11 p-4 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                        selectedBarbero?.id === b.id ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900' : 'border-stone-200 bg-white hover:border-stone-400'
                      }`}
                    >
                      {imageVisible(b.avatarUrl) ? (
                        <img src={b.avatarUrl} onError={() => imageFailed(b.avatarUrl)} alt={b.nombre} className="w-20 h-20 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="w-20 h-20 shrink-0 rounded-xl bg-stone-900 text-white font-bold text-2xl flex items-center justify-center">
                          {b.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-stone-900">{b.nombre}</h4>
                        <p className="text-xs text-stone-500">{b.especialidad || 'Profesional de la sucursal'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: FECHA Y HORA */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900">Elige fecha y horario</h3>
                  <button onClick={() => setStep(3)} className="text-xs text-stone-500 hover:underline">Cambiar barbero</button>
                </div>
                <button type="button" className="booking-action booking-action-secondary w-full" disabled={nextSlotBusy} onClick={searchNextSlot}>{nextSlotBusy ? 'Buscando disponibilidad…' : 'Buscar próximo horario disponible'}</button>
                <p className="booking-currency-note">Busca desde hoy en los próximos 30 días. Podrás revisar el horario antes de confirmar.</p>
                {nextSlotMessage && <p role="status" className="text-sm text-stone-700">{nextSlotMessage}</p>}

                <div>
                  <label htmlFor="booking-date" className="block text-xs font-bold text-stone-700 mb-1">Fecha</label>
                  <input
                    id="booking-date"
                    type="date"
                    min={todayLocal}
                    max={bookingDateLimit.toISOString().slice(0, 10)}
                    value={selectedFecha}
                    onChange={(e) => setSelectedFecha(e.target.value)}
                    className="w-full min-h-11 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div>
                  <div className="booking-date-choices" aria-label="Consultar otro día">{dateChoices.map(date => <button type="button" key={date.value} aria-pressed={selectedFecha === date.value} onClick={() => { setSelectedFecha(date.value); setSelectedHora(''); }}>{date.label}</button>)}</div>
                  <p className="booking-currency-note">Selecciona un día para consultar disponibilidad.</p>
                  <h4 className="mb-2">Horarios disponibles</h4><p className="mb-3 text-xs text-stone-500">Hora local de la sucursal{selectedSucursal?.zonaHoraria === 'America/Mexico_City' ? ' · centro de México' : ''}.</p>
                  {slotsLoading ? <p role="status" className="text-sm text-stone-500">Consultando horarios…</p> : slotsError ? (
                    <div role="alert" className="text-sm text-rose-700"><p>{slotsError}</p>{!slotsDateInvalid && <button type="button" className="underline min-h-11" onClick={() => setSlotsRetry(n => n + 1)}>Reintentar</button>}</div>
                  ) : availableSlots.length === 0 || !availableSlots.some(slot => slot.disponible) ? (
                    <section className="booking-availability-empty" role="status"><CalendarIcon size={24} aria-hidden="true" /><h4>{emptyCopy[0]}</h4><p>{emptyCopy[1]}</p>
                      {selectedFecha && selectedFecha < bookingDateLimit.toISOString().slice(0, 10) && <button type="button" className="booking-action booking-action-primary booking-next-day" onClick={nextBookingDay}>Consultar el día siguiente</button>}
                      <button type="button" className="booking-text-action" onClick={() => setStep(3)}>Probar con otro profesional</button>
                    </section>
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
                          aria-label={`${slot.hora}${slot.disponible ? ', disponible' : ', no disponible'}`}
                          className={`booking-slot min-h-11 py-2 px-3 rounded-lg text-xs font-mono font-bold transition ${
                            !slot.disponible
                              ? 'bg-stone-100 text-stone-500 cursor-not-allowed'
                              : selectedHora === slot.hora
                              ? 'bg-stone-900 text-white'
                              : 'bg-white border border-stone-200 hover:border-stone-400 text-stone-800'
                          }`}
                        >
                          {slot.hora}
                          {Number.isFinite(slot.precioEstimado) && <span className="block text-[10px] font-sans font-medium mt-1">${Number(slot.precioEstimado).toFixed(2)}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: DATOS DEL CLIENTE */}
            {step === 5 && (
              <form onSubmit={handleConfirmBooking} aria-busy={confirming || photoProcessing} className="booking-contact-form bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <h3 className="text-base font-bold text-stone-900">¿A nombre de quién reservamos?</h3>
                  <button type="button" onClick={() => setStep(4)} className="text-xs text-stone-500 hover:underline">Cambiar horario</button>
                </div>
                {selectedSlotQuote && <section className="booking-selection-summary" aria-label="Precio del horario elegido"><p className="font-semibold">{selectedSlotQuote.barberoNombre || selectedBarbero?.nombre} · {selectedHora} · ${Number(selectedSlotQuote.precioEstimado).toFixed(2)} MXN</p><ul>{selectedSlotQuote.serviciosResumen?.map(service => <li key={service.id}>{service.nombre} · ${Number(service.precio).toFixed(2)}</li>)}</ul><p>Esta es la tarifa de los servicios con el profesional de este horario. Al confirmar revisaremos otra vez disponibilidad y precio; no se realiza un cobro.</p></section>}
                {(appearance.instruccionesLlegada || appearance.politicasInformativas) && <section className="booking-visit-info" aria-label="Información antes de reservar">{appearance.instruccionesLlegada && <div><h4>Para llegar a tu cita</h4><p>{appearance.instruccionesLlegada}</p></div>}{appearance.politicasInformativas && <div><h4>Ten en cuenta antes de reservar</h4><p>{appearance.politicasInformativas}</p></div>}</section>}

                <div>
                  <label htmlFor="booking-client-name" className="block text-xs font-bold text-stone-700 mb-1">Nombre completo *</label>
                  <input
                    id="booking-client-name"
                    type="text"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div>
                  <label htmlFor="booking-client-phone" className="block text-xs font-bold text-stone-700 mb-1">Teléfono de contacto *</label>
                  <input
                    id="booking-client-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="10 dígitos para contactar contigo"
                    aria-describedby="booking-phone-help"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                  <p id="booking-phone-help" className="booking-field-help">Incluye la lada. Se usa como contacto de tu cita; reservar no envía un WhatsApp automático.</p>
                </div>

                <div>
                  <label htmlFor="booking-client-notes" className="block text-xs font-bold text-stone-700 mb-1">Indicaciones para tu visita · Opcional</label>
                  <input
                    id="booking-client-notes"
                    type="text"
                    value={clienteNotas}
                    onChange={(e) => setClienteNotas(e.target.value)}
                    placeholder="Ej. Necesito ayuda al llegar"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <details className="booking-preferences">
                  <summary>¿Tienes un corte en mente? <span>Opcional</span></summary>
                  <CutReferenceFields compact value={cutReference} onChange={setCutReference} onBusyChange={setPhotoProcessing} disabled={confirming} />
                </details>

                <div className="booking-consent">
                  <input
                    type="checkbox"
                    id="booking-privacy-consent"
                    checked={consentimientoPrivacidad}
                    onChange={(e) => setConsentimientoPrivacidad(e.target.checked)}
                    className="mt-0.5 rounded border-stone-300 text-stone-900"
                  />
                  <div><label htmlFor="booking-privacy-consent">He leído el aviso de privacidad para reservar.</label><button type="button" onClick={openPrivacy} className="booking-text-action">Leer aviso de privacidad</button></div>
                </div>

                {bookingError && <p role="alert" className="text-sm text-rose-700">{bookingError}</p>}
                <button
                  type="submit"
                  disabled={confirming || photoProcessing}
                  className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm transition shadow-sm mt-3"
                >
                  {confirming ? 'Confirmando…' : photoProcessing ? 'Preparando foto…' : 'Confirmar reserva'}
                </button>
                <p className="booking-field-help">Al confirmar verás tu folio y un enlace privado para cambiar o cancelar la cita. Guarda ambos. No se realiza ningún cargo.</p>
              </form>
            )}

            {/* STEP 6: CONFIRMATION SCREEN CON BOTÓN DE IMPRIMIR CARTA */}
            {step === 6 && bookingResult && (
              <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-xs max-w-lg mx-auto">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <Check className="w-7 h-7 stroke-[2.5]" />
                </div>

                <div>
                  <h2 ref={bookingStepHeading} tabIndex={-1} className="text-xl font-bold tracking-tight text-stone-900">
                    Reserva confirmada
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Tu cita está registrada. El pago se realiza en la barbería.
                  </p>
                </div>

                {/* Folio Highlight */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500 block mb-1">
                    Folio de tu reserva
                  </span>
                  <div className="text-2xl font-black text-stone-900 tracking-wider font-mono">
                    {bookingResult.codigoReserva}
                  </div>
                </div>

                {/* Details Summary */}
                <div className="text-left bg-stone-50/70 p-4 rounded-xl border border-stone-200 text-xs space-y-2 text-stone-700">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Servicio:</span>
                    <span className="font-bold text-stone-900">{bookingResult.cita?.nombreServicio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Horario:</span>
                    <span className="font-bold text-stone-900">{branchDateTime(bookingResult.cita.fechaHora,bookingResult.cita.zonaHoraria)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Profesional:</span>
                    <span className="font-bold text-stone-900">{bookingResult.cita?.barbero}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Sucursal:</span>
                    <span className="font-bold text-stone-900">{bookingResult.cita?.sucursal}</span>
                  </div>
                  <div className="flex justify-between"><span>Duración:</span><strong>{bookingResult.cita?.duracionMinutos} minutos</strong></div>
                  <div className="flex justify-between"><span>Total estimado:</span><strong>${Number(bookingResult.cita?.precioEstimado || 0).toFixed(2)} MXN</strong></div>
                </div>

                {bookingResult.enlaceGestion&&<a href={bookingResult.enlaceGestion} className="block rounded-xl border border-stone-300 p-3 text-sm font-semibold underline">Cambiar horario o cancelar mi cita</a>}
                {(bookingResult.cita?.tipoCorte || bookingResult.cita?.tieneFotoReferencia) && <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-left text-sm text-stone-700">{bookingResult.cita?.tipoCorte && <p><strong>Preferencia:</strong> {bookingResult.cita.tipoCorte}</p>}{bookingResult.cita?.tieneFotoReferencia && <p className="mt-1">Foto de referencia adjunta.</p>}</div>}
                <p className="text-xs text-stone-500">Guarda el folio y tu enlace privado para consultar, cambiar o cancelar tu cita.</p>
                {/* Action Buttons: Imprimir Carta & WhatsApp */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => api.printCitaCarta(bookingResult.codigoReserva)}
                    className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir comprobante</span>
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
                    Volver a la barbería
                  </button>
                </div>
              </div>
            )}

            </div>
            </div>
          </div>
        )}

      </main>

      {viewMode === 'showcase' && !heroActionVisible && !showLookup && !showPrivacy && !pendingBooking && <div className="booking-mobile-action"><button type="button" onClick={startBooking} className="booking-action booking-action-primary"><CalendarIcon size={18} aria-hidden="true" />{entryLabel}</button></div>}

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        <p className="font-semibold text-stone-700">{shopData.nombre}</p>
        <p className="text-[11px] text-stone-400 mt-1">Reservas con SYSTECH Studio</p>
        <button type="button" onClick={openPrivacy} className="mt-2 underline text-sm text-stone-600">Aviso de privacidad</button>
      </footer>

      {showPrivacy && (
        <dialog
          ref={privacyDialog}
          aria-label="Aviso de Privacidad"
          onCancel={() => setShowPrivacy(false)}
          className="m-auto w-[calc(100%-2rem)] max-w-4xl max-h-[90vh] overflow-auto rounded-2xl p-0 border border-stone-200 shadow-xl backdrop:bg-black/50"
        >
          <AvisoPrivacidadView onBack={() => {
            privacyDialog.current?.close();
            setShowPrivacy(false);
          }} />
        </dialog>
      )}

    </div>
  );
};

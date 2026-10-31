import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useSearchParams } from 'react-router-dom';
import { AgendaSchedule } from '../components/AgendaSchedule';
import { BarberDay } from '../components/BarberDay';
import { ArrivalQueue } from '../components/ArrivalQueue';
import { ScheduleChanges } from '../components/ScheduleChanges';
import { agendaStatus } from '../utils/agendaLayout';
import { addBookingDays } from '../utils/nextBookingSlot';
import { RebookingDraft, availableRebookingSelection } from '../types/rebooking';
import {branchToday} from '../utils/branchTime';
import { Cita, Barbero, Sucursal, Producto, BloqueoHorario } from '../types';
import { CutReferenceFields, CutReferenceInput } from '../components/CutReferenceFields';
import { OperationDialog } from '../components/OperationDialog';
import { isCutReferenceDataUrl } from '../utils/cutReferencePhoto';
import { AgendaCreationIntent, agendaCreationIntentKey, readAgendaCreationIntent, writeAgendaCreationIntent } from '../utils/agendaCreationIntent';
import '../styles/studio-operation-design.css';
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
  ChevronRight,
  Printer,
  Image as ImageIcon
} from 'lucide-react';

interface AgendaViewProps {
  currentSucursal: Sucursal | null;
  rol: string;
  barberoId?: string | null;
  onOpenPosWithCita?: (cita: Cita) => void;
  onOpenPublicBooking?: () => void;
  publicSlug?: string;
  rebookingDraft?: RebookingDraft | null;
  onRebookingConsumed?: () => void;
}

function useProfessionalBookingQuote(branchId: string | undefined, barberId: string, serviceId: string, dateTime: string, enabled: boolean, role: string) {
  const [quote, setQuote] = useState<{ key: string; service: Producto } | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const request = useRef(0), key = JSON.stringify([api.getTenantId(), api.getUserId(), role, branchId, barberId, serviceId, dateTime, enabled]);
  const currentKey = useRef(key); currentKey.current = key;
  useEffect(() => {
    const serial = ++request.current; setQuote(null); setError(''); setLoading(false);
    if (!enabled || !branchId || !barberId || !serviceId || !Number.isFinite(Date.parse(dateTime))) return;
    const current = () => serial === request.current && key === currentKey.current;
    setLoading(true);
    const deadline = window.setTimeout(() => { if (current()) { request.current++; setLoading(false); setError('La tarifa tardó en responder. Reintenta antes de confirmar.'); } }, 20_000);
    void api.getProfessionalCatalog(branchId, barberId, dateTime).then(rows => {
      if (!current()) return;
      const service = rows.find(row => row.id === serviceId && row.tipo === 'SERVICIO' && row.activo !== false);
      if (!service || service.precioVenta == null || typeof service.precioVenta === 'boolean' || typeof service.precioVenta === 'string' && !service.precioVenta.trim() || !Number.isFinite(Number(service.precioVenta)) || Number(service.precioVenta) < 0 || !Number.isInteger(Number(service.duracionMinutos)) || Number(service.duracionMinutos) < 5 || Number(service.duracionMinutos) > 480) throw Error('El servicio no tiene precio y duración verificables para este profesional.');
      setQuote({ key, service });
    }).catch((failure: any) => { if (current()) setError(failure.message || 'No pudimos consultar la tarifa. Reintenta antes de confirmar.'); })
      .finally(() => { window.clearTimeout(deadline); if (current()) setLoading(false); });
    return () => { request.current++; window.clearTimeout(deadline); };
  }, [key, revision]);
  return { service: quote?.key === key ? quote.service : null, loading, error, retry: () => { setQuote(null); setRevision(value => value + 1); } };
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  currentSucursal,
  rol,
  barberoId,
  onOpenPosWithCita,
  publicSlug,
  rebookingDraft,
  onRebookingConsumed
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkBranch = useRef(currentSucursal?.id);
  const deepLinkOpened = useRef('');
  const targetAppointment = searchParams.get('citaId');
  const targetDay = searchParams.get('fecha');
  const [selectedDate, setSelectedDate] = useState<string>(branchToday(currentSucursal?.zonaHoraria));
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [operationTab, setOperationTab] = useState<'agenda' | 'fila' | 'disponibilidad'>('agenda');
  const [operationTarget, setOperationTarget] = useState<{ id: string; day: string } | null>(null);
  const [statusError, setStatusError] = useState('');
  const agendaScope = useRef('');
  agendaScope.current = `${currentSucursal?.id || ''}:${selectedDate}`;
  const [citas, setCitas] = useState<Cita[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<Producto[]>([]);
  const [bloqueos, setBloqueos] = useState<BloqueoHorario[]>([]);

  const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);
  const selectedCita = citas.find(c => c.id === selectedCitaId) || null;
  const openOperationalAppointment = (id: string, timestamp?: string) => {
    const day = branchToday(currentSucursal?.zonaHoraria, timestamp ? new Date(timestamp) : new Date());
    setSelectedDate(day); setOperationTab('agenda'); setOperationTarget({ id, day });
  };
  useEffect(() => { if (operationTarget && operationTarget.day === selectedDate && !agendaLoading && citas.some(c => c.id === operationTarget.id)) { setSelectedCitaId(operationTarget.id); setOperationTarget(null); } }, [operationTarget, selectedDate, agendaLoading, citas]);
  useEffect(() => { setOperationTarget(null); setOperationTab('agenda'); }, [currentSucursal?.id]);
  useEffect(() => { setSelectedCitaId(null); }, [selectedDate, currentSucursal?.id]);
  useEffect(() => {
    if (deepLinkBranch.current !== currentSucursal?.id) {
      deepLinkBranch.current = currentSucursal?.id; deepLinkOpened.current = '';
      if (targetAppointment) { const next = new URLSearchParams(searchParams); next.delete('citaId'); next.delete('fecha'); setSearchParams(next, { replace: true }); }
      return;
    }
    if (targetDay && /^\d{4}-\d{2}-\d{2}$/.test(targetDay) && Number.isFinite(new Date(`${targetDay}T12:00:00Z`).getTime())) setSelectedDate(targetDay);
  }, [targetAppointment, targetDay, currentSucursal?.id]);
  useEffect(() => {
    const key = `${currentSucursal?.id || ''}:${targetAppointment || ''}:${targetDay || ''}`;
    if (!targetAppointment || !targetDay || selectedDate !== targetDay || agendaLoading || key === deepLinkOpened.current) return;
    if (citas.some(c => c.id === targetAppointment)) { setSelectedCitaId(targetAppointment); deepLinkOpened.current = key; }
  }, [targetAppointment, targetDay, selectedDate, citas, agendaLoading, currentSucursal?.id]);

  // Modals
  const [showNewCitaModal, setShowNewCitaModal] = useState(false);
  const [showBloqueoModal, setShowBloqueoModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [bloqueoSaving, setBloqueoSaving] = useState(false);
  const [bloqueoError, setBloqueoError] = useState('');
  const bloqueoRequest = useRef(false);

  // Form State
  const [formClienteNombre, setFormClienteNombre] = useState('');
  const [formClienteTelefono, setFormClienteTelefono] = useState('');
  const [formBarberoId, setFormBarberoId] = useState('');
  const [formServicioId, setFormServicioId] = useState('');
  const [formHora, setFormHora] = useState('11:00');
  const [formNotas, setFormNotas] = useState('');
  const [formCutReference, setFormCutReference] = useState<CutReferenceInput>({ tipoCorte: '', fotoReferencia: null });
  const [formPhotoProcessing, setFormPhotoProcessing] = useState(false);
  const [submittingCita, setSubmittingCita] = useState(false);
  const [formCitaError, setFormCitaError] = useState('');
  const citaPricing = useProfessionalBookingQuote(currentSucursal?.id, formBarberoId, formServicioId, `${selectedDate}T${formHora}:00`, showNewCitaModal, rol);
  const quotedService = citaPricing.service;
  const { loading: quoteLoading, error: quoteError, retry: retryCitaQuote } = citaPricing;
  const citaBusy = useRef(false);

  // Walk-In State (Fase 3)
  const [walkInCliente, setWalkInCliente] = useState('');
  const [walkInTelefono, setWalkInTelefono] = useState('');
  const [walkInServicioId, setWalkInServicioId] = useState('');
  const [walkInBarberoId, setWalkInBarberoId] = useState('');
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);
  const [walkInCutReference, setWalkInCutReference] = useState<CutReferenceInput>({ tipoCorte: '', fotoReferencia: null });
  const [walkInPhotoProcessing, setWalkInPhotoProcessing] = useState(false);
  const [walkInError, setWalkInError] = useState('');
  const [walkInQuoteTime, setWalkInQuoteTime] = useState(() => new Date().toISOString());
  useEffect(() => { if (showWalkInModal) setWalkInQuoteTime(new Date().toISOString()); }, [showWalkInModal, walkInBarberoId, walkInServicioId]);
  const walkInPricing = useProfessionalBookingQuote(currentSucursal?.id, walkInBarberoId, walkInServicioId, walkInQuoteTime, showWalkInModal && Boolean(walkInBarberoId), rol);
  const walkInBusy = useRef(false);
  const creationScope = agendaCreationIntentKey(api.getTenantId(), api.getUserId());
  const [creationIntent, setCreationIntent] = useState<AgendaCreationIntent | null>(null);
  const [creationStorageError, setCreationStorageError] = useState('');
  const creationIntentRef = useRef<AgendaCreationIntent | null>(null);
  const creationRequest = useRef(0);
  const creationScopeRef = useRef(creationScope);
  useEffect(() => {
    creationScopeRef.current = creationScope; creationRequest.current++;
    setCreationStorageError(''); setCreationIntent(null); creationIntentRef.current = null;
    setShowNewCitaModal(false); setShowWalkInModal(false); setFormCitaError(''); setWalkInError('');
    citaBusy.current = false; walkInBusy.current = false; setSubmittingCita(false); setSubmittingWalkIn(false);
    try {
      const pending = readAgendaCreationIntent(sessionStorage, creationScope);
      if (pending) {
      creationIntentRef.current = pending; setCreationIntent(pending);
      const payload = pending.payload;
      if (pending.kind === 'cita') {
        setFormClienteNombre(payload.clienteNombre || ''); setFormClienteTelefono(payload.clienteTelefono || ''); setFormBarberoId(payload.barberoId || ''); setFormServicioId(payload.servicioId || ''); setFormNotas(payload.notas || ''); setFormHora(payload.fechaHora?.slice(11, 16) || '11:00');
        setFormCutReference({ tipoCorte: payload.tipoCorte || '', fotoReferencia: payload.fotoReferencia || null }); setShowNewCitaModal(true);
        if (typeof payload.fechaHora === 'string') setSelectedDate(payload.fechaHora.slice(0, 10));
      } else {
        setWalkInCliente(payload.clienteNombre || ''); setWalkInTelefono(payload.clienteTelefono || ''); setWalkInServicioId(payload.servicioId || ''); setWalkInBarberoId(payload.barberoId || '');
        setWalkInCutReference({ tipoCorte: payload.tipoCorte || '', fotoReferencia: payload.fotoReferencia || null }); setShowWalkInModal(true);
      }
      }
    } catch (error: any) { setCreationStorageError(error.message || 'No pudimos recuperar la intención de agenda. Revisa el resultado antes de registrar otra cita.'); }
    return () => { creationRequest.current++; };
  }, [creationScope]);
  const [referenceCita, setReferenceCita] = useState<Cita | null>(null);
  const [referenceData, setReferenceData] = useState<{ tipoCorte: string | null; fotoReferencia: string | null } | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceError, setReferenceError] = useState('');
  const [referenceImageError, setReferenceImageError] = useState(false);
  const referenceRequest = useRef(0);

  const closeReference = () => {
    referenceRequest.current++;
    setReferenceCita(null); setReferenceData(null); setReferenceError(''); setReferenceLoading(false); setReferenceImageError(false);
  };
  const openReference = async (cita: Cita) => {
    const request = ++referenceRequest.current;
    setReferenceCita(cita); setReferenceData(null); setReferenceError(''); setReferenceLoading(true); setReferenceImageError(false);
    try {
      const result = await api.getCitaReferencia(cita.id);
      if (request !== referenceRequest.current) return;
      if (result.fotoReferencia && !isCutReferenceDataUrl(result.fotoReferencia)) throw new Error('No pudimos mostrar la foto de esta cita. Intenta consultar nuevamente.');
      setReferenceData(result);
    } catch (error: any) {
      if (request === referenceRequest.current) setReferenceError(error.message || 'No pudimos consultar la referencia del corte. Intenta nuevamente.');
    } finally { if (request === referenceRequest.current) setReferenceLoading(false); }
  };
  useEffect(() => {
    closeReference();
    return () => { referenceRequest.current++; };
  }, [selectedDate, currentSucursal?.id, rol, barberoId]);

  const agendaRequest=useRef(0);
  const [agendaError,setAgendaError]=useState('');
  const statusRequest = useRef(false);
  const [statusBusy, setStatusBusy] = useState(false);
  useEffect(() => {
    if (!rebookingDraft || creationIntent || creationStorageError || !barberos.length || !servicios.length) return;
    if (rebookingDraft.tenantId !== api.getTenantId() || rebookingDraft.sucursalId !== currentSucursal?.id) { onRebookingConsumed?.(); return; }
    setFormClienteNombre(rebookingDraft.clienteNombre);
    setFormClienteTelefono(rebookingDraft.clienteTelefono);
    setFormNotas(''); setFormHora('11:00');
    const selection = availableRebookingSelection(rebookingDraft, barberos, servicios);
    setFormBarberoId(selection.barberoId);
    setFormServicioId(selection.servicioId);
    setFormCutReference({ tipoCorte: rebookingDraft.tipoCorte, fotoReferencia: null });
    setSelectedDate(addBookingDays(branchToday(currentSucursal?.zonaHoraria),28));
    setFormCitaError(!selection.barberoId || !selection.servicioId ? 'El profesional o servicio anterior ya no está disponible. Elige una opción vigente antes de confirmar.' : ''); setShowNewCitaModal(true); onRebookingConsumed?.();
  }, [rebookingDraft, barberos.length, servicios.length, creationIntent, creationStorageError, currentSucursal?.id, onRebookingConsumed]);
  // Bloqueo State
  const [bloqueoBarberoId, setBloqueoBarberoId] = useState('');
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState('14:00');
  const [bloqueoHoraFin, setBloqueoHoraFin] = useState('15:00');
  const [bloqueoMotivo, setBloqueoMotivo] = useState('Hora de Almuerzo');

  useEffect(() => {
    loadAgenda();
    return()=>{agendaRequest.current++;};
  }, [selectedDate, currentSucursal?.id]);

  const loadAgenda = async () => {
    const scope = `${currentSucursal?.id || ''}:${selectedDate}`;
    const request=++agendaRequest.current;setAgendaError('');setAgendaLoading(true);
    setCitas([]);setBloqueos([]);
    try {
      const [citasData, barberosData, productosData, bloqueosData] = await Promise.all([
        api.getCitas({ fecha: selectedDate, sucursalId: currentSucursal?.id }),
        api.getBarberos(currentSucursal?.id),
        api.getProductos({ tipo: 'SERVICIO', sucursalId: currentSucursal?.id }),
        api.getBloqueos(currentSucursal?.id)
      ]);
      if(request!==agendaRequest.current || scope !== agendaScope.current)return;
      setCitas(citasData);
      setBarberos(barberosData);
      setServicios(productosData);
      setBloqueos(bloqueosData.filter((b:BloqueoHorario)=>branchToday(currentSucursal?.zonaHoraria,new Date(b.fechaInicio))<=selectedDate&&branchToday(currentSucursal?.zonaHoraria,new Date(new Date(b.fechaFin).getTime()-1))>=selectedDate));

      if (barberosData.length > 0 && !formBarberoId) {
        setFormBarberoId(barberosData[0].id);
      }
      if (productosData.length > 0 && !formServicioId) {
        setFormServicioId(productosData[0].id);
      }
    } catch (e:any) {
      if(request===agendaRequest.current && scope === agendaScope.current)setAgendaError(e.message||'No se pudo cargar la agenda.');
    } finally { if(request===agendaRequest.current && scope === agendaScope.current)setAgendaLoading(false); }
  };

  useEffect(() => {
    let active = true, refreshing = false;
    const refresh = async () => {
      if (document.hidden || refreshing || !currentSucursal?.id) return;
      refreshing = true;
      const request = ++agendaRequest.current;
      try {
        const [updatedCitas, updatedBloqueos] = await Promise.all([
          api.getCitas({ fecha: selectedDate, sucursalId: currentSucursal.id }),
          api.getBloqueos(currentSucursal.id)
        ]);
        if (!active || request !== agendaRequest.current) return;
        setCitas(updatedCitas);
        setBloqueos(updatedBloqueos.filter((b: BloqueoHorario) => branchToday(currentSucursal.zonaHoraria, new Date(b.fechaInicio)) <= selectedDate && branchToday(currentSucursal.zonaHoraria, new Date(new Date(b.fechaFin).getTime() - 1)) >= selectedDate));
        setAgendaError('');
      } catch (error: any) {
        if (active && request === agendaRequest.current) setAgendaError(error.message || 'No pudimos actualizar la agenda.');
      } finally {
        refreshing = false;
        if (active && request === agendaRequest.current) setAgendaLoading(false);
      }
    };
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [selectedDate, currentSucursal?.id, currentSucursal?.zonaHoraria]);

  const handleUpdateStatus = async (citaId: string, nuevoEstado: string) => {
    if (statusRequest.current) return;
    const scope = agendaScope.current;
    statusRequest.current = true; setStatusBusy(true); setStatusError('');
    try {
      await api.updateCitaStatus(citaId, nuevoEstado);
      if (scope === agendaScope.current) await loadAgenda();
    } catch (e: any) {
      if (scope === agendaScope.current) { setStatusError(`${e.message || 'No pudimos confirmar el estado.'} Actualiza la agenda para revisar el resultado antes de continuar. Repetir el mismo estado no duplica la atención.`); await loadAgenda(); }
    } finally { statusRequest.current = false; setStatusBusy(false); }
  };

  const [reschedule,setReschedule]=useState<any>(null);
  const [newTime,setNewTime]=useState(''),[rescheduleBusy,setRescheduleBusy]=useState(false),[rescheduleError,setRescheduleError]=useState('');
  const saveReschedule=async(e:React.FormEvent)=>{e.preventDefault();if(rescheduleBusy)return;setRescheduleBusy(true);setRescheduleError('');try{await api.rescheduleCita(reschedule.id,newTime+':00');setReschedule(null);await loadAgenda();}catch(e:any){setRescheduleError(e.message);}finally{setRescheduleBusy(false);}};
  const submitCreation = async (intent: AgendaCreationIntent) => {
    if (citaBusy.current || walkInBusy.current || creationStorageError) return;
    const scope = creationScope;
    const request = ++creationRequest.current;
    const waiting = { ...intent, uncertain: true };
    // Persist exact fields and UUID before sending. A reload must assume the response could have been lost.
    try { writeAgendaCreationIntent(sessionStorage, scope, waiting); }
    catch { const message = 'No pudimos conservar el resultado pendiente en este navegador. No enviamos la solicitud; intenta nuevamente.'; intent.kind === 'cita' ? setFormCitaError(message) : setWalkInError(message); return; }
    creationIntentRef.current = waiting; setCreationIntent(waiting);
    citaBusy.current = intent.kind === 'cita'; walkInBusy.current = intent.kind === 'walk-in';
    setSubmittingCita(intent.kind === 'cita'); setSubmittingWalkIn(intent.kind === 'walk-in');
    intent.kind === 'cita' ? setFormCitaError('') : setWalkInError('');
    try {
      if (intent.kind === 'cita') await api.createCita(intent.payload);
      else await api.registrarWalkIn(intent.payload as Parameters<typeof api.registrarWalkIn>[0]);
      sessionStorage.removeItem(scope);
      if (request !== creationRequest.current || scope !== creationScopeRef.current) return;
      creationIntentRef.current = null; setCreationIntent(null);
      if (intent.kind === 'cita') {
        setShowNewCitaModal(false); setFormClienteNombre(''); setFormClienteTelefono(''); setFormNotas(''); setFormCutReference({ tipoCorte: '', fotoReferencia: null });
      } else {
        setShowWalkInModal(false); setWalkInCliente(''); setWalkInTelefono(''); setWalkInCutReference({ tipoCorte: '', fotoReferencia: null });
      }
      loadAgenda();
    } catch (error: any) {
      if (request !== creationRequest.current || scope !== creationScopeRef.current) return;
      const definitiveFirstRejection = !intent.uncertain && error.status >= 400 && error.status < 500 && error.code !== 'IDEMPOTENCY_CONFLICT';
      if (definitiveFirstRejection) {
        sessionStorage.removeItem(scope); creationIntentRef.current = null; setCreationIntent(null);
        if (error.code === 'PRICE_CONFIRMATION_REQUIRED') { if (intent.kind === 'cita') retryCitaQuote(); else { setWalkInQuoteTime(new Date().toISOString()); walkInPricing.retry(); } }
      }
      const message = definitiveFirstRejection ? intent.kind === 'walk-in' && !intent.payload.barberoId && error.code === 'PRICE_CONFIRMATION_REQUIRED' ? 'Elige un profesional para revisar su tarifa antes de confirmar.' : error.message || 'Revisa tus datos y vuelve a intentar.' : 'El resultado de esta cita está pendiente. Recupera la misma solicitud antes de registrar otra; conservamos todos sus datos y la foto.';
      intent.kind === 'cita' ? setFormCitaError(message) : setWalkInError(message);
    } finally {
      if (request === creationRequest.current && scope === creationScopeRef.current) { citaBusy.current = false; walkInBusy.current = false; setSubmittingCita(false); setSubmittingWalkIn(false); }
    }
  };
  const handleCreateCita = async (event: React.FormEvent) => {
    event.preventDefault();
    if (formPhotoProcessing || creationIntentRef.current || creationStorageError || citaBusy.current || walkInBusy.current) return;
    if (!formClienteNombre || !formClienteTelefono || !formBarberoId) return setFormCitaError('Completa los campos obligatorios.');
    if (!currentSucursal?.id || quoteLoading || !quotedService) return setFormCitaError('Consulta y revisa el precio del profesional antes de confirmar.');
    await submitCreation({ kind: 'cita', uncertain: false, payload: Object.freeze({ idempotencyKey: crypto.randomUUID(), sucursalId: currentSucursal.id, barberoId: formBarberoId, servicioId: formServicioId, fechaHora: `${selectedDate}T${formHora}:00`, duracionMinutos: Number(quotedService.duracionMinutos), clienteNombre: formClienteNombre, clienteTelefono: formClienteTelefono, precioEstimado: Number(quotedService.precioVenta), precioConfirmado: Number(quotedService.precioVenta), notas: formNotas, tipoCorte: formCutReference.tipoCorte.trim() || undefined, fotoReferencia: formCutReference.fotoReferencia }) });
  };
  const handleCreateWalkIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (walkInPhotoProcessing || creationIntentRef.current || creationStorageError || citaBusy.current || walkInBusy.current) return;
    if (!currentSucursal?.id || !walkInCliente.trim() || !walkInServicioId) return setWalkInError('Completa los campos requeridos para el turno.');
    if (walkInBarberoId && (walkInPricing.loading || !walkInPricing.service)) return setWalkInError('Consulta y revisa el precio del profesional antes de registrar la llegada.');
    await submitCreation({ kind: 'walk-in', uncertain: false, payload: Object.freeze({ idempotencyKey: crypto.randomUUID(), sucursalId: currentSucursal.id, barberoId: walkInBarberoId || undefined, servicioId: walkInServicioId, ...(walkInBarberoId && walkInPricing.service ? { precioConfirmado: Number(walkInPricing.service.precioVenta) } : {}), clienteNombre: walkInCliente, clienteTelefono: walkInTelefono || undefined, tipoCorte: walkInCutReference.tipoCorte.trim() || undefined, fotoReferencia: walkInCutReference.fotoReferencia }) });
  };

  const handleCreateBloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSucursal?.id || bloqueoRequest.current) return;
    bloqueoRequest.current = true; setBloqueoSaving(true); setBloqueoError('');

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
      setBloqueoError(e.message || 'No pudimos confirmar el bloqueo. Revisa la agenda antes de volver a guardarlo.');
    } finally { bloqueoRequest.current = false; setBloqueoSaving(false); }
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
    const cur = new Date(selectedDate+'T12:00:00Z');
    cur.setUTCDate(cur.getUTCDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  const copyPublicBookingLink = () => {
    const url = `${window.location.origin}/b/${publicSlug || 'el-bigote'}`;
    navigator.clipboard.writeText(url);
    alert(`Enlace público copiado al portapapeles: ${url}`);
  };

  return (
    <div className="operation-page operation-agenda appointments-studio max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {creationStorageError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{creationStorageError}</p>}
      <OperationDialog open={Boolean(referenceCita)} busy={false} titleId="cut-reference-heading" onClose={closeReference} className="max-w-2xl">
        <div className="max-h-[90dvh] overflow-y-auto rounded-2xl bg-white p-6" aria-busy={referenceLoading}>
          <h2 id="cut-reference-heading" tabIndex={-1} className="text-xl font-semibold text-stone-900">Referencia del corte</h2>
          <p className="mt-2 text-sm text-stone-600">{referenceCita?.cliente?.nombre || 'Cliente'} · {referenceCita?.nombreServicio}</p>
          {referenceLoading && <p role="status" className="mt-5 text-sm text-stone-600">Consultando la preferencia del cliente…</p>}
          {referenceError && <div role="alert" className="mt-5 text-sm text-rose-700"><p>{referenceError}</p><button type="button" onClick={() => referenceCita && openReference(referenceCita)} className="mt-2 min-h-11 underline font-semibold">Reintentar</button></div>}
          {referenceData && <div className="mt-5">
            {referenceData.tipoCorte && <div className="rounded-lg border border-stone-200 bg-stone-50 p-4"><p className="text-sm text-stone-600">Tipo de corte o preferencia</p><p className="mt-1 text-lg font-semibold text-stone-900 break-words">{referenceData.tipoCorte}</p></div>}
            {referenceData.fotoReferencia && !referenceImageError && <img src={referenceData.fotoReferencia} onError={() => setReferenceImageError(true)} alt="Foto de referencia compartida para esta cita" className="cut-reference-view-photo" />}
            {referenceImageError && <div role="alert" className="mt-4 text-sm text-rose-700"><p>No pudimos mostrar esta foto.</p><button type="button" onClick={() => referenceCita && openReference(referenceCita)} className="min-h-11 underline">Volver a consultar</button></div>}
            {!referenceData.tipoCorte && !referenceData.fotoReferencia && <p className="text-sm text-stone-600">El cliente no añadió una preferencia ni foto de referencia.</p>}
            <p className="mt-4 text-sm text-stone-600">Comenta la referencia con el cliente antes de empezar. El servicio reservado conserva su precio y duración.</p>
          </div>}
          <div className="mt-6 flex justify-end"><button type="button" onClick={closeReference} className="min-h-11 rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold">Cerrar</button></div>
        </div>
      </OperationDialog>
      
      {agendaError&&<div role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{agendaError}<button type="button" onClick={loadAgenda} className="ml-3 underline">Reintentar</button></div>}
      <OperationDialog open={Boolean(reschedule)} busy={rescheduleBusy} titleId="reschedule-heading" onClose={() => setReschedule(null)} className="max-w-md">
        <form onSubmit={saveReschedule} aria-busy={rescheduleBusy} className="max-h-[85dvh] w-full overflow-y-auto rounded-2xl bg-white p-6">
          <h2 id="reschedule-heading" tabIndex={-1} className="text-lg font-bold">Reprogramar cita</h2>
          <p className="mt-2 text-sm break-words">{reschedule?.nombreServicio} · {reschedule?.barbero?.nombre}</p>
          <p id="reschedule-zone" className="mt-1 text-xs text-stone-500">Hora de la sucursal: {currentSucursal?.zonaHoraria || 'America/Mexico_City'}</p>
          <label htmlFor="internal-booking-time" className="mt-4 block text-sm">Nuevo día y hora</label>
          <input id="internal-booking-time" type="datetime-local" required disabled={rescheduleBusy} aria-describedby="reschedule-zone" value={newTime} onChange={e => setNewTime(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border p-3" />
          {rescheduleError && <p role="alert" className="mt-3 text-sm text-rose-700">{rescheduleError}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button type="button" disabled={rescheduleBusy} onClick={() => setReschedule(null)} className="min-h-11 rounded-lg border px-4 py-2">Atrás</button>
            <button type="submit" disabled={rescheduleBusy || !newTime} className="min-h-11 rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-50">{rescheduleBusy ? 'Guardando…' : 'Guardar horario'}</button>
          </div>
        </form>
      </OperationDialog>
      {/* Header Bar */}
      <div className="appointments-masthead flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              {rol === 'BARBERO' ? 'Tu día de cortes' : 'Cada cita, en su lugar'}
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {currentSucursal?.nombre || 'Matriz'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Tu agenda por barbero. Del primer saludo al último corte.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyPublicBookingLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium border border-stone-200 shadow-sm transition"
          >
            <Copy className="w-3 h-3 text-stone-600" />
            <span>Compartir reservas</span>
          </button>

          {rol !== 'CAJERO' && <button
            onClick={() => { if (rol === 'BARBERO') setBloqueoBarberoId(barberoId || ''); setBloqueoError(''); setShowBloqueoModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium border border-stone-200 shadow-sm transition"
          >
            <Lock className="w-3 h-3 text-stone-500" />
            <span>Bloquear horario</span>
          </button>}

          <button
            onClick={() => {
              if (servicios.length > 0 && !walkInServicioId) setWalkInServicioId(servicios[0].id);
              setShowWalkInModal(true);
            }}
            disabled={Boolean(creationIntent) || Boolean(creationStorageError)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-xs transition shadow-xs"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-700" />
            <span>Atención inmediata sin cita</span>
          </button>

          <button
            onClick={() => setShowNewCitaModal(true)}
            disabled={Boolean(creationIntent) || Boolean(creationStorageError)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva cita</span>
          </button>
        </div>
      </div>

      <div className="agenda-operation-tabs" aria-label="Operación de agenda"><button type="button" aria-pressed={operationTab === 'agenda'} onClick={() => setOperationTab('agenda')}>Agenda y atenciones</button><button type="button" aria-pressed={operationTab === 'fila'} onClick={() => setOperationTab('fila')}>Fila presencial</button>{['DUENO', 'GERENTE'].includes(rol) && <button type="button" aria-pressed={operationTab === 'disponibilidad'} onClick={() => setOperationTab('disponibilidad')}>Ausencias y turnos</button>}</div>
      {currentSucursal?.id && <div hidden={operationTab !== 'fila'}><ArrivalQueue enabled={operationTab === 'fila'} branchId={currentSucursal.id} role={rol} barberId={barberoId} barbers={barberos} services={servicios} zone={currentSucursal.zonaHoraria || 'America/Mexico_City'} onChanged={() => void loadAgenda()} onOpenAppointment={openOperationalAppointment} /></div>}
      {currentSucursal?.id && ['DUENO', 'GERENTE'].includes(rol) && <div hidden={operationTab !== 'disponibilidad'}><ScheduleChanges branchId={currentSucursal.id} date={selectedDate} barbers={barberos} zone={currentSucursal.zonaHoraria || 'America/Mexico_City'} onChanged={() => void loadAgenda()} onOpenAppointment={openOperationalAppointment} /></div>}
      <div hidden={operationTab !== 'agenda'}>
      {rol === 'BARBERO' && <BarberDay appointments={citas} barberId={barberoId} zone={currentSucursal?.zonaHoraria || 'America/Mexico_City'} busy={statusBusy} loading={agendaLoading} error={statusError || agendaError} onStatus={(id, state) => void handleUpdateStatus(id, state)} onPay={onOpenPosWithCita} onReference={cita => void openReference(cita)} onDetails={cita => setSelectedCitaId(cita.id)} />}
      {rol !== 'BARBERO' && statusError && <p role="alert" className="barber-day-error">{statusError}</p>}
      {/* Date Navigation Bar */}
      <div className="appointments-dayboard">
        <div className="appointments-date"><span>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long' })}</span><strong>{new Date(selectedDate + 'T12:00:00').getDate()}</strong><span>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</span></div>
        <div className="appointments-day-summary"><h2>El ritmo del día</h2><p>{citas.filter(c => !['CANCELADA', 'NO_SHOW'].includes(c.estado)).length} citas programadas para este día</p><dl>
          <div><dt>Por confirmar</dt><dd>{citas.filter(c => c.estado === 'PENDIENTE').length}</dd></div>
          <div><dt>Confirmadas</dt><dd>{citas.filter(c => c.estado === 'CONFIRMADA').length}</dd></div>
          <div><dt>En atención</dt><dd>{citas.filter(c => c.estado === 'EN_CURSO').length}</dd></div>
          <div><dt>Completadas</dt><dd>{citas.filter(c => c.estado === 'COMPLETADA').length}</dd></div>
        </dl></div>
      </div>
      <div className="appointments-toolbar luxury-card rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            aria-label="Día anterior"
            className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-xs transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <input
            type="date"
            aria-label="Fecha de la agenda"
            value={selectedDate}
            onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
            className="bg-white border border-stone-200 text-stone-900 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-stone-900 shadow-xs"
          />

          <button
            onClick={() => shiftDate(1)}
            aria-label="Día siguiente"
            className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-xs transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(branchToday(currentSucursal?.zonaHoraria))}
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
                ({new Date(b.fechaInicio).toLocaleTimeString('es-MX', { timeZone:currentSucursal?.zonaHoraria||'America/Mexico_City', hour: '2-digit', minute: '2-digit' })} - {new Date(b.fechaFin).toLocaleTimeString('es-MX', { timeZone:currentSucursal?.zonaHoraria||'America/Mexico_City', hour: '2-digit', minute: '2-digit' })})
              </span>
              {(['DUENO', 'GERENTE'].includes(rol) || (rol === 'BARBERO' && b.barberoId === barberoId)) && <button aria-label="Eliminar bloqueo" onClick={() => handleDeleteBloqueo(b.id)} className="text-stone-400 hover:text-rose-600 ml-1 font-bold">×</button>}
            </div>
          ))}
        </div>
      )}

      {citas.some(c => c.conflictos?.length) && <section className="agenda-conflicts" aria-labelledby="agenda-conflicts-heading"><h3 id="agenda-conflicts-heading">Citas que necesitan resolver disponibilidad</h3><p>Estas citas se conservaron después de un cambio de horario o ausencia. Revisa cada caso; no fueron canceladas ni reprogramadas automáticamente.</p>{citas.filter(c => c.conflictos?.length).map(c => <article key={c.id}><strong>{c.cliente?.nombre || 'Cliente'} · {c.nombreServicio}</strong>{c.conflictos?.map((conflict, index) => <p key={`${conflict.tipo}:${index}`}>{conflict.mensaje}</p>)}<button type="button" className="studio-button-secondary" onClick={() => setSelectedCitaId(c.id)}>Revisar y resolver esta cita</button></article>)}</section>}
      <AgendaSchedule barberos={barberos} citas={citas} bloqueos={bloqueos} date={selectedDate} zone={currentSucursal?.zonaHoraria || 'America/Mexico_City'} onSelect={cita => setSelectedCitaId(cita.id)} />
      <OperationDialog open={Boolean(selectedCita)} busy={statusBusy} titleId="appointment-detail-heading" onClose={() => setSelectedCitaId(null)} className="max-w-lg">
        <div className="agenda-appointment-detail p-5 bg-white rounded-xl max-h-[85dvh] overflow-y-auto">
          <div className="flex items-center justify-between gap-3 mb-4"><h2 id="appointment-detail-heading" tabIndex={-1} className="text-xl font-semibold">Detalle de la cita</h2><button type="button" disabled={statusBusy} className="studio-button-secondary" onClick={() => setSelectedCitaId(null)}>Cerrar</button></div>
          <fieldset disabled={statusBusy}>{selectedCita && (() => { const cita = selectedCita; const timeStr = new Date(cita.fechaHora).toLocaleTimeString('es-MX', { timeZone: currentSucursal?.zonaHoraria || 'America/Mexico_City', hour: '2-digit', minute: '2-digit' }); return (
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
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold  ${
                          cita.estado === 'CONFIRMADA'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : cita.estado === 'PENDIENTE'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : cita.estado === 'EN_CURSO'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 '
                            : cita.estado === 'COMPLETADA'
                            ? 'bg-stone-100 text-stone-700 border border-stone-200'
                            : cita.estado === 'NO_SHOW'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : cita.estado === 'CANCELADA'
                            ? 'bg-stone-100 text-stone-400 line-through'
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {agendaStatus[cita.estado] || cita.estado}
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
                          {cita.precioEstimado != null ? `${Number(cita.precioEstimado)} MXN` : 'Precio no informado'}
                        </span>
                      </div>

                      {(cita.tipoCorte || cita.tieneFotoReferencia) && <div className="mt-2 border-t border-stone-100 pt-2">
                        {cita.tipoCorte && <p className="text-sm text-stone-700 break-words"><span className="font-semibold">Preferencia:</span> {cita.tipoCorte}</p>}
                        <button type="button" onClick={() => { setSelectedCitaId(null); openReference(cita); }} className="mt-1 flex min-h-11 items-center gap-2 text-sm font-semibold text-stone-800 underline"><ImageIcon size={16} aria-hidden="true" />{cita.tieneFotoReferencia ? 'Ver referencia y foto' : 'Ver referencia del corte'}</button>
                      </div>}

                      {['PENDIENTE','CONFIRMADA'].includes(cita.estado)&&<button type="button" onClick={()=>{setSelectedCitaId(null);setReschedule(cita);setNewTime('');setRescheduleError('');}} className="mt-2 text-xs font-semibold underline">Reprogramar</button>}
                      <div className="agenda-primary-action">
                        {cita.estado === 'PENDIENTE' ? <button type="button" className="studio-button w-full" onClick={() => handleUpdateStatus(cita.id, 'CONFIRMADA')}>Confirmar cita</button> : cita.estado === 'CONFIRMADA' ? <button type="button" className="studio-button w-full" onClick={() => handleUpdateStatus(cita.id, 'EN_CURSO')}>Empezar atención</button> : cita.estado === 'EN_CURSO' && !cita.venta && onOpenPosWithCita ? <button type="button" className="studio-button w-full" onClick={() => {setSelectedCitaId(null);onOpenPosWithCita(cita);}}>Cobrar atención</button> : null}
                      </div>
                      <details className="agenda-detail-actions"><summary>Más acciones de la cita</summary>
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

                        {!cita.venta && cita.estado !== 'CANCELADA' && cita.estado !== 'NO_SHOW' && onOpenPosWithCita && (
                          <button
                            onClick={() => { setSelectedCitaId(null); onOpenPosWithCita(cita); }}
                            className="flex-1 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-semibold transition flex items-center justify-center gap-1 shadow-xs"
                          >
                            <CreditCard className="w-3 h-3" />
                            Cobrar
                          </button>
                        )}

                        {['PENDIENTE','CONFIRMADA'].includes(cita.estado) && new Date(cita.fechaHora).getTime()+cita.duracionMinutos*60000<=Date.now() && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Marcar cita como NO-SHOW (Inasistencia)? Se incrementará el conteo de faltas de ${cita.cliente?.nombre || 'el cliente'}.`)) {
                                handleUpdateStatus(cita.id, 'NO_SHOW');
                              }
                            }}
                            className="p-1 rounded text-stone-400 hover:text-rose-600 text-[10px] font-medium transition"
                            title="El cliente no se presentó a su cita"
                          >
                            No asistió
                          </button>
                        )}

                        {cita.codigoReserva && (
                          <button
                            onClick={() => api.printCitaCarta(cita.codigoReserva!)}
                            className="p-1 rounded text-stone-600 hover:text-stone-900 hover:bg-stone-200 text-[10px] font-semibold transition flex items-center gap-0.5"
                            title="Imprimir Comprobante Tamaño Carta"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Carta</span>
                          </button>
                        )}

                        {cita.estado === 'COMPLETADA' && (
                          <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> {cita.venta ? 'Venta registrada' : 'Atención terminada · cobro pendiente'}
                          </span>
                        )}
                      </div>
                      </details>
                    </div>
          ); })()}</fieldset>
        </div>
      </OperationDialog>

      </div>
      {/* Modal: Nueva Cita */}
      {showNewCitaModal && (
        <OperationDialog open={showNewCitaModal} busy={submittingCita || formPhotoProcessing || Boolean(creationIntent)} titleId="new-cita-heading" onClose={() => setShowNewCitaModal(false)} className="max-w-xl">
          <div className="max-h-[90dvh] overflow-y-auto bg-white border border-stone-200 rounded-2xl w-full p-6">
            <h3 id="new-cita-heading" tabIndex={-1} className="text-lg font-bold text-stone-900 mb-1">Agendar cita</h3>
            <p className="text-xs text-stone-500 mb-4">Revisa la fecha y el horario antes de confirmar. La cita se guardará al confirmar, si hay disponibilidad.</p>

            <form onSubmit={handleCreateCita} aria-busy={submittingCita || formPhotoProcessing} className="space-y-3.5">
              <fieldset disabled={submittingCita || Boolean(creationIntent) || Boolean(creationStorageError)} className="min-w-0 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-cita-client" className="block text-[11px] font-medium text-stone-600 mb-1">Cliente *</label>
                  <input
                    id="new-cita-client"
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={formClienteNombre}
                    onChange={(e) => setFormClienteNombre(e.target.value)}
                    className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                  />
                </div>
                <div>
                  <label htmlFor="new-cita-phone" className="block text-[11px] font-medium text-stone-600 mb-1">WhatsApp *</label>
                  <input
                    id="new-cita-phone"
                    type="tel"
                    required
                    placeholder="55..."
                    value={formClienteTelefono}
                    onChange={(e) => setFormClienteTelefono(e.target.value)}
                    className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-cita-barber" className="block text-[11px] font-medium text-stone-600 mb-1">Barbero *</label>
                  <select
                    id="new-cita-barber"
                    required
                    value={formBarberoId}
                    onChange={(e) => setFormBarberoId(e.target.value)}
                    className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  >
                    <option value="" disabled>Selecciona profesional</option>
                    {barberos.filter(b => b.activo !== false).map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="new-cita-service" className="block text-[11px] font-medium text-stone-600 mb-1">Servicio *</label>
                  <select
                    id="new-cita-service"
                    required
                    value={formServicioId}
                    onChange={(e) => setFormServicioId(e.target.value)}
                    className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  >
                    <option value="" disabled>Selecciona servicio</option>
                    {servicios.filter(s => s.activo !== false).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-cita-date" className="block text-[11px] font-medium text-stone-600 mb-1">Fecha</label>
                  <input
                    id="new-cita-date"
                    onInput={e => setSelectedDate(e.currentTarget.value)}
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label htmlFor="new-cita-time" className="block text-[11px] font-medium text-stone-600 mb-1">Horario</label>
                  <input
                    id="new-cita-time"
                    onInput={e => setFormHora(e.currentTarget.value)}
                    type="time"
                    required
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
              </div>

              <CutReferenceFields value={formCutReference} onChange={setFormCutReference} onBusyChange={setFormPhotoProcessing} disabled={submittingCita || Boolean(creationIntent)} />
              {!creationIntent && quoteLoading && <p role="status" className="text-sm">Consultando tarifa del profesional para este horario…</p>}
              {!creationIntent && quoteError && <div role="alert" className="text-sm text-rose-700"><p>{quoteError}</p><button type="button" className="studio-button-secondary mt-2" onClick={retryCitaQuote}>Reintentar tarifa</button></div>}
              {!creationIntent && quotedService && <p className="rounded-lg bg-stone-100 p-3 text-sm">{quotedService.nombre} · {barberos.find(barber => barber.id === formBarberoId)?.nombre || 'Profesional seleccionado'} · ${Number(quotedService.precioVenta).toFixed(2)} MXN · {Number(quotedService.duracionMinutos)} minutos. Precio para {selectedDate} a las {formHora}, hora de la sucursal.</p>}
              </fieldset>
              {creationIntent && !submittingCita && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Conservamos la solicitud original. Mantén esta pestaña abierta y recupera el resultado antes de cambiar datos o crear otra cita.</p>}
              {formCitaError && <p role="alert" className="text-sm text-rose-700">{formCitaError}</p>}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCitaModal(false)}
                  disabled={submittingCita || formPhotoProcessing || Boolean(creationIntent)}
                  className="min-h-11 px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type={creationIntent ? 'button' : 'submit'}
                  onClick={creationIntent ? () => creationIntentRef.current && submitCreation(creationIntentRef.current) : undefined}
                  disabled={submittingCita || formPhotoProcessing || Boolean(creationStorageError) || !creationIntent && (quoteLoading || !quotedService)}
                  className="min-h-11 px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50"
                >
                  {submittingCita ? 'Guardando…' : formPhotoProcessing ? 'Preparando foto…' : creationIntent ? 'Recuperar resultado' : 'Confirmar cita'}
                </button>
              </div>
            </form>
          </div>
        </OperationDialog>
      )}

      {/* Modal: Bloquear Horario */}
      {showBloqueoModal && (
        <OperationDialog open={showBloqueoModal} busy={bloqueoSaving} titleId="block-time-heading" onClose={() => setShowBloqueoModal(false)} className="max-w-md">
          <div className="max-h-[85dvh] overflow-y-auto bg-white border border-stone-200 rounded-2xl w-full p-6">
            <h3 id="block-time-heading" tabIndex={-1} className="text-base font-bold text-stone-900 mb-1">Bloquear horario</h3>
            <p className="text-xs text-stone-500 mb-4">Pausa de agenda para descansos o capacitaciones.</p>

            <form onSubmit={handleCreateBloqueo} aria-busy={bloqueoSaving} className="space-y-3.5">
              <fieldset disabled={bloqueoSaving} className="min-w-0 space-y-3.5">
              <div>
                <label htmlFor="block-time-barber" className="block text-[11px] font-medium text-stone-600 mb-1">Barbero</label>
                <select
                  id="block-time-barber"
                  value={bloqueoBarberoId}
                  onChange={(e) => setBloqueoBarberoId(e.target.value)}
                  className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                >
                  {rol !== 'BARBERO' && <option value="">Toda la sucursal</option>}
                  {barberos.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="block-time-start" className="block text-[11px] font-medium text-stone-600 mb-1">Hora de inicio</label>
                  <input
                    id="block-time-start"
                    type="time"
                    required
                    value={bloqueoHoraInicio}
                    onChange={(e) => setBloqueoHoraInicio(e.target.value)}
                    className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label htmlFor="block-time-end" className="block text-[11px] font-medium text-stone-600 mb-1">Hora de fin</label>
                  <input
                    id="block-time-end"
                    type="time"
                    required
                    value={bloqueoHoraFin}
                    onChange={(e) => setBloqueoHoraFin(e.target.value)}
                    className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="block-time-reason" className="block text-[11px] font-medium text-stone-600 mb-1">Motivo</label>
                <select
                  id="block-time-reason"
                  value={bloqueoMotivo}
                  onChange={(e) => setBloqueoMotivo(e.target.value)}
                  className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                >
                  <option value="Hora de Almuerzo">Hora de Almuerzo</option>
                  <option value="Mantenimiento">Mantenimiento de Sillón</option>
                  <option value="Capacitación">Capacitación de Personal</option>
                  <option value="Permiso Especial">Permiso Especial</option>
                </select>
              </div>
              </fieldset>
              {bloqueoError && <p role="alert" className="text-sm text-rose-700">{bloqueoError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={bloqueoSaving}
                  onClick={() => setShowBloqueoModal(false)}
                  className="min-h-11 px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={bloqueoSaving}
                  className="min-h-11 px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm"
                >
                  {bloqueoSaving ? 'Guardando…' : 'Confirmar bloqueo'}
                </button>
              </div>
            </form>
          </div>
        </OperationDialog>
      )}

      {/* Fase 3: Modal Turno Walk-In */}
      {showWalkInModal && (
        <OperationDialog open={showWalkInModal} busy={submittingWalkIn || walkInPhotoProcessing || Boolean(creationIntent)} titleId="walk-in-heading" onClose={() => setShowWalkInModal(false)} className="max-w-xl">
          <div className="max-h-[90dvh] overflow-y-auto bg-white border border-stone-200 rounded-2xl w-full p-6">
            <h3 id="walk-in-heading" tabIndex={-1} className="text-lg font-bold text-stone-950 mb-1 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-600" />
              Registrar cliente sin cita
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Comienza una atención inmediata con un profesional disponible. Para registrar a quien todavía espera, usa Fila presencial.
            </p>

            <form onSubmit={handleCreateWalkIn} aria-busy={submittingWalkIn || walkInPhotoProcessing} className="space-y-3.5">
              <fieldset disabled={submittingWalkIn || Boolean(creationIntent) || Boolean(creationStorageError)} className="min-w-0 space-y-3.5">
              <div>
                <label htmlFor="walk-in-client" className="block text-xs font-semibold text-stone-700 mb-1">Nombre del cliente *</label>
                <input
                  id="walk-in-client"
                  type="text"
                  required
                  placeholder="Ej. Roberto Gómez"
                  value={walkInCliente}
                  onChange={(e) => setWalkInCliente(e.target.value)}
                  className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>

              <div>
                <label htmlFor="walk-in-phone" className="block text-xs font-semibold text-stone-700 mb-1">Teléfono (WhatsApp)</label>
                <input
                  id="walk-in-phone"
                  type="tel"
                  placeholder="Opcional para enviarle ticket y recordatorio"
                  value={walkInTelefono}
                  onChange={(e) => setWalkInTelefono(e.target.value)}
                  className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="walk-in-service" className="block text-xs font-semibold text-stone-700 mb-1">Servicio *</label>
                <select
                  id="walk-in-service"
                  required
                  value={walkInServicioId}
                  onChange={(e) => setWalkInServicioId(e.target.value)}
                  className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-semibold focus:outline-none focus:bg-white"
                >
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="walk-in-barber" className="block text-xs font-semibold text-stone-700 mb-1">Barbero (opcional)</label>
                <select
                  id="walk-in-barber"
                  value={walkInBarberoId}
                  onChange={(e) => setWalkInBarberoId(e.target.value)}
                  className="min-h-11 w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:bg-white"
                >
                  <option value="">Cualquier barbero disponible (Primer turno libre)</option>
                  {barberos.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <CutReferenceFields value={walkInCutReference} onChange={setWalkInCutReference} onBusyChange={setWalkInPhotoProcessing} disabled={submittingWalkIn || Boolean(creationIntent)} />
              {!creationIntent && walkInBarberoId && walkInPricing.loading && <p role="status" className="text-sm">Consultando tarifa del profesional…</p>}
              {!creationIntent && walkInBarberoId && walkInPricing.error && <div role="alert" className="text-sm text-rose-700"><p>{walkInPricing.error}</p><button type="button" className="studio-button-secondary mt-2" onClick={() => { setWalkInQuoteTime(new Date().toISOString()); walkInPricing.retry(); }}>Reintentar tarifa</button></div>}
              {!creationIntent && walkInBarberoId && walkInPricing.service && <p className="rounded-lg bg-stone-100 p-3 text-sm">{walkInPricing.service.nombre} · {barberos.find(barber => barber.id === walkInBarberoId)?.nombre || 'Profesional seleccionado'} · ${Number(walkInPricing.service.precioVenta).toFixed(2)} MXN · {Number(walkInPricing.service.duracionMinutos)} minutos. Tarifa consultada para esta llegada.</p>}
              {!creationIntent && !walkInBarberoId && <p className="text-sm text-stone-600">La asignación automática conserva el precio de catálogo si no hay tarifa propia. Si el profesional asignado tiene un precio específico, deberás elegirlo y revisar su tarifa antes de registrar la llegada.</p>}
              </fieldset>
              {creationIntent && !submittingWalkIn && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Conservamos la solicitud original. Mantén esta pestaña abierta y recupera el resultado antes de registrar otro turno.</p>}
              {walkInError && <p role="alert" className="text-sm text-rose-700">{walkInError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  disabled={submittingWalkIn || walkInPhotoProcessing || Boolean(creationIntent)}
                  className="min-h-11 px-3.5 py-2 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type={creationIntent ? 'button' : 'submit'}
                  onClick={creationIntent ? () => creationIntentRef.current && submitCreation(creationIntentRef.current) : undefined}
                  disabled={submittingWalkIn || walkInPhotoProcessing || Boolean(creationStorageError) || !creationIntent && Boolean(walkInBarberoId) && (walkInPricing.loading || !walkInPricing.service)}
                  className="min-h-11 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submittingWalkIn ? 'Registrando…' : walkInPhotoProcessing ? 'Preparando foto…' : creationIntent ? 'Recuperar resultado' : 'Comenzar atención'}
                </button>
              </div>
            </form>
          </div>
        </OperationDialog>
      )}

    </div>
  );
};

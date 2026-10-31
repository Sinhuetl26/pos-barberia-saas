import '../styles/collections-workspace.css';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { CashCustody } from '../components/CashCustody';
import { CloseCashGuide } from '../components/CloseCashGuide';
import { CommercialControls } from '../components/CommercialControls';
import { OperationState } from '../components/OperationState';
import { OperationDialog } from '../components/OperationDialog';
import { hasLicenseCapability, LicensePlanCode, licensePlan } from '../utils/licenseCatalog';
import { Barbero, Sucursal, Comision, CorteCaja } from '../types';
import '../styles/team-experience.css';
import {
  Users,
  Plus,
  Lock,
  Unlock,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Printer,
  Calculator,
  UserCheck,
  ShieldAlert,
  Camera,
  Edit2,
  Eye,
  Check,
  Save,
  Clock,
  Sparkles
} from 'lucide-react';

export function commissionReviewRows(commissions: Comision[], ids: string[], branchId: string) {
  if (!branchId || !ids.length || new Set(ids).size !== ids.length) throw new Error('Selecciona comisiones pendientes de una sucursal antes de revisar el pago.');
  return ids.map(id => {
    const row = commissions.find(item => item.id === id);
    const amount = row?.monto;
    if (!row || row.pagada || row.barbero?.sucursalId !== branchId || amount == null || typeof amount === 'boolean' || String(amount).trim() === '' || !Number.isFinite(Number(amount)) || Math.abs(Number(amount) * 100 - Math.round(Number(amount) * 100)) > 0.00001) throw new Error('La selección cambió. Actualiza las comisiones antes de revisar el pago.');
    return { id, barberoId: row.barberoId, nombre: row.barbero?.nombre || 'Barbero', folio: row.venta?.folio || row.ventaId, monto: Number(amount) };
  });
}

export function commissionReviewMatches(rows: ReturnType<typeof commissionReviewRows>, current: Comision[], branchId: string) {
  try { return JSON.stringify(rows) === JSON.stringify(commissionReviewRows(current, rows.map(row => row.id), branchId)); }
  catch { return false; }
}

export function commissionReviewPending(pending: any, ids: string[]) {
  return pending?.path === '/comisiones/pagar' && pending.body?.metodoPagoComision === 'EFECTIVO'
    && Array.isArray(pending.body.comisionIds) && JSON.stringify(pending.body.comisionIds) === JSON.stringify(ids);
}

interface BarberosViewProps {
  currentSucursal: Sucursal | null;
  currentRole: string;
  currentUser?: any;
  plan: LicensePlanCode;
  workspaceMode?: 'equipo' | 'caja';
  onNavigateToSubscription?: () => void;
}

// Preset avatars for barbers
const BARBER_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80'
];

function BarberPortrait({ barber }: { barber: Barbero }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [barber.avatarUrl]);
  return barber.avatarUrl && !failed
    ? <img src={barber.avatarUrl} alt={barber.nombre} loading="lazy" onError={() => setFailed(true)} />
    : <div className="team-portrait-initial" aria-hidden="true">{barber.nombre.split(' ').filter(Boolean).map(part => part.charAt(0)).slice(0, 2).join('')}</div>;
}

export const BarberosView: React.FC<BarberosViewProps> = ({
  currentSucursal,
  currentRole,
  currentUser,
  plan,
  workspaceMode = 'equipo',
  onNavigateToSubscription
}) => {
  const isBarberoRole = currentRole === 'BARBERO';
  const isCashier = currentRole === 'CAJERO';
  const hasAdvancedCommercialControls = hasLicenseCapability(plan, 'PROFESSIONAL_PRICING');
  const [searchParams] = useSearchParams();

  // Tabs: Barbero role gets only 'perfil' or 'comisiones'. Owner gets 'barberos', 'cortes', 'comisiones'.
  const [activeTab, setActiveTab] = useState<'barberos' | 'cortes' | 'comisiones' | 'perfil' | 'reglas'>(
    isBarberoRole ? 'cortes' : workspaceMode === 'caja' || isCashier || searchParams.get('tab') === 'cortes' ? 'cortes' : 'barberos'
  );
  const requestedTab = searchParams.get('tab');
  useEffect(() => {
    setActiveTab(isBarberoRole ? 'cortes' : workspaceMode === 'caja' || isCashier || requestedTab === 'cortes' ? 'cortes' : 'barberos');
  }, [requestedTab, isBarberoRole, isCashier, workspaceMode]);

  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [cortes, setCortes] = useState<CorteCaja[]>([]);
  const [totalPendiente, setTotalPendiente] = useState<number>(0);
  const [totalPagado, setTotalPagado] = useState<number>(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [filterBarberoId, setFilterBarberoId] = useState<string>('');

  // Modals
  const [showAddBarberoModal, setShowAddBarberoModal] = useState(false);
  const [showEditBarberoModal, setShowEditBarberoModal] = useState(false);
  const [editingBarbero, setEditingBarbero] = useState<Barbero | null>(null);
  const teamBusy = useRef(false);
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [teamNotice, setTeamNotice] = useState('');

  const [showOpenCorteModal, setShowOpenCorteModal] = useState(false);
  const [showArqueoModal, setShowArqueoModal] = useState(false);
  const [activeCorte, setActiveCorte] = useState<CorteCaja | null>(null);
  const [cashScreen, setCashScreen] = useState<'turno' | 'historial'>('turno');

  // Form: Nuevo Barbero
  const [nombreBarbero, setNombreBarbero] = useState('');
  const [telefonoBarbero, setTelefonoBarbero] = useState('');
  const [emailBarbero, setEmailBarbero] = useState('');
  const [avatarBarbero, setAvatarBarbero] = useState('');
  const [especialidadBarbero, setEspecialidadBarbero] = useState('');
  const [descripcionBarbero, setDescripcionBarbero] = useState('');
  const [visibleEnWebBarbero, setVisibleEnWebBarbero] = useState(true);
  const [comisionServicios, setComisionServicios] = useState<number>(50);
  const [comisionProductos, setComisionProductos] = useState<number>(10);
  const [diasDescanso, setDiasDescanso] = useState('Domingo');
  const [horarioInicio, setHorarioInicio] = useState('09:00');
  const [horarioFin, setHorarioFin] = useState('20:00');
  const [crearAccesoUsuario, setCrearAccesoUsuario] = useState(false);

  // Form: Apertura Caja
  const [fondoInicial, setFondoInicial] = useState<number>(1000);
  const [notasApertura, setNotasApertura] = useState('Fondo inicial de turno');

  // Form: Arqueo y Desglose de Caja
  const [denominaciones, setDenominaciones] = useState<Record<string, number>>({
    '1000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    'moneda_20': 0,
    'moneda_10': 0,
    'moneda_5': 0,
    'moneda_2': 0,
    'moneda_1': 0,
    'moneda_05': 0
  });
  const [ajusteManualEfectivo, setAjusteManualEfectivo] = useState<number | null>(null);
  const [notasCierre, setNotasCierre] = useState('');

  // Form: Mi Perfil (para rol BARBERO)
  const [miAvatar, setMiAvatar] = useState('');
  const [miEspecialidad, setMiEspecialidad] = useState('');
  const [miDescripcion, setMiDescripcion] = useState('');
  const [miTelefono, setMiTelefono] = useState('');
  const [perfilSaved, setPerfilSaved] = useState(false);

  const cashBusy = useRef(false);
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const [cashError,setCashError]=useState('');
  const [cashNotice,setCashNotice]=useState('');
  const [cashNoticeWarning,setCashNoticeWarning]=useState(false);
  const [selectedComisiones, setSelectedComisiones] = useState<string[]>([]);
  const [payrollReview, setPayrollReview] = useState<{ scope: string; rows: ReturnType<typeof commissionReviewRows> } | null>(null);
  const payrollBusy = useRef(false);
  const [payrollSubmitting, setPayrollSubmitting] = useState(false);
  const [payrollUncertain, setPayrollUncertain] = useState(false);
  const [payrollError, setPayrollError] = useState('');
  const loadSerial = useRef(0);
  const branchScope = `${api.getTenantId()}:${api.getUserId()}:${currentSucursal?.id}:${currentUser?.rol}`;
  const activeBranchScope = useRef(branchScope); activeBranchScope.current = branchScope;

  useEffect(() => {
    setBarberos([]); setComisiones([]); setCortes([]); setActiveCorte(null); setShowArqueoModal(false);
    setShowAddBarberoModal(false); setShowEditBarberoModal(false); setTeamError(''); setTeamNotice('');
    setPayrollReview(null); setPayrollUncertain(false); setPayrollError(''); setSelectedComisiones([]);
    loadData();
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.completed) { setShowOpenCorteModal(false); if (detail.path !== '/cortes-caja/cerrar') setShowArqueoModal(false); }
      void loadData();
    };
    window.addEventListener('systech:financial', refresh);
    return () => { loadSerial.current++; window.removeEventListener('systech:financial', refresh); };
  }, [branchScope]);

  const loadData = async () => {
    const request = ++loadSerial.current, requestedScope = branchScope;
    setDataLoading(true);
    setLoadError('');
    try {
      const [barbs, comData, cortesData] = await Promise.all([
        api.getBarberos(currentSucursal?.id),
        isCashier ? Promise.resolve({ comisiones: [], totalPendiente: 0, totalPagado: 0 }) : api.getComisiones(currentSucursal?.id ? { sucursalId: currentSucursal.id } : {}),
        isBarberoRole ? Promise.resolve([]) : api.getCortesCaja(currentSucursal?.id)
      ]);
      if (request !== loadSerial.current || requestedScope !== activeBranchScope.current) return;
      setBarberos(barbs);
      setComisiones(comData.comisiones);
      setTotalPendiente(comData.totalPendiente);
      setTotalPagado(comData.totalPagado);
      setCortes(cortesData);

      const openShift = cortesData.find((c: any) => c.estado === 'ABIERTO');
      setActiveCorte(openShift || null);

      // Si es rol BARBERO, buscar su propio perfil
      if (isBarberoRole) {
        const myB = barbs.find((b: any) => b.id === currentUser?.barberoId);
        if (myB) {
          setMiAvatar(myB.avatarUrl || '');
          setMiEspecialidad(myB.especialidad || '');
          setMiDescripcion(myB.descripcion || '');
          setMiTelefono(myB.telefono || '');
        }
      }
    } catch (e: any) {
      if (request === loadSerial.current && requestedScope === activeBranchScope.current) setLoadError(e.message || 'No pudimos consultar el equipo, la caja y las comisiones.');
    } finally { if (request === loadSerial.current && requestedScope === activeBranchScope.current) setDataLoading(false); }
  };

  // Denominations calculator logic
  const calculateTotalFisico = (): number => {
    if (ajusteManualEfectivo !== null && ajusteManualEfectivo >= 0) {
      return ajusteManualEfectivo;
    }
    const total =
      (denominaciones['1000'] || 0) * 1000 +
      (denominaciones['500'] || 0) * 500 +
      (denominaciones['200'] || 0) * 200 +
      (denominaciones['100'] || 0) * 100 +
      (denominaciones['50'] || 0) * 50 +
      (denominaciones['20'] || 0) * 20 +
      (denominaciones['moneda_20'] || 0) * 20 +
      (denominaciones['moneda_10'] || 0) * 10 +
      (denominaciones['moneda_5'] || 0) * 5 +
      (denominaciones['moneda_2'] || 0) * 2 +
      (denominaciones['moneda_1'] || 0) * 1 +
      (denominaciones['moneda_05'] || 0) * 0.5;
    return Math.round(total * 100) / 100;
  };

  const totalFisicoContado = calculateTotalFisico();
  const fondoTurno = activeCorte ? Number(activeCorte.fondoInicial) : 0;

  const handleCreateBarbero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSucursal?.id || teamBusy.current) return;

    if (barberos.filter(b => b.activo).length >= (licensePlan(plan)?.barbersPerBranch || 0)) {
      alert(`Alcanzaste las ${licensePlan(plan)?.barbersPerBranch} plazas activas de esta sucursal. Desactiva personal o revisa tu licencia.`);
      if (onNavigateToSubscription) onNavigateToSubscription();
      return;
    }

    teamBusy.current = true; setTeamSubmitting(true); setTeamError(''); setTeamNotice('');
    try {
      await api.createBarbero({
        sucursalId: currentSucursal.id,
        nombre: nombreBarbero,
        telefono: telefonoBarbero,
        email: emailBarbero,
        avatarUrl: avatarBarbero,
        especialidad: especialidadBarbero,
        descripcion: descripcionBarbero,
        visibleEnWeb: visibleEnWebBarbero,
        comisionServiciosPct: comisionServicios,
        comisionProductosPct: comisionProductos,
        diasDescanso,
        horarioInicio,
        horarioFin,
        crearAcceso: crearAccesoUsuario
      });

      setShowAddBarberoModal(false);
      setNombreBarbero('');
      setTelefonoBarbero('');
      setEmailBarbero('');
      setAvatarBarbero('');

      setCrearAccesoUsuario(false);
      loadData();
      setTeamNotice('Barbero registrado. Si solicitaste una invitación, consulta su estado en Accesos.');
    } catch (e: any) {
      setTeamError(e.message || 'No se confirmó el registro. Consulta el equipo antes de repetir el alta.');
    } finally { teamBusy.current = false; setTeamSubmitting(false); }
  };

  const handleSaveBarberoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarbero || teamBusy.current) return;

    teamBusy.current = true; setTeamSubmitting(true); setTeamError(''); setTeamNotice('');
    try {
      await api.updateBarbero(editingBarbero.id, {
        nombre: editingBarbero.nombre,
        telefono: editingBarbero.telefono,
        email: editingBarbero.email,
        avatarUrl: editingBarbero.avatarUrl,
        especialidad: editingBarbero.especialidad,
        descripcion: editingBarbero.descripcion,
        visibleEnWeb: editingBarbero.visibleEnWeb,
        comisionServiciosPct: editingBarbero.comisionServiciosPct,
        comisionProductosPct: editingBarbero.comisionProductosPct,
        diasDescanso: editingBarbero.diasDescanso,
        horarioInicio: editingBarbero.horarioInicio,
        horarioFin: editingBarbero.horarioFin,
        activo: editingBarbero.activo
      });

      setShowEditBarberoModal(false);
      setEditingBarbero(null);
      loadData();
      setTeamNotice('Perfil del barbero actualizado.');
    } catch (e: any) {
      setTeamError(e.message || 'No se confirmó la actualización. Conservamos los datos del formulario.');
    } finally { teamBusy.current = false; setTeamSubmitting(false); }
  };

  const handleSaveMiPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    const myB = barberos.find((b: any) => b.id === currentUser?.barberoId);
    if (!myB) return alert('No se encontró tu perfil de barbero asociado.');

    try {
      await api.updateBarbero(myB.id, {
        avatarUrl: miAvatar,
        especialidad: miEspecialidad,
        descripcion: miDescripcion,
        telefono: miTelefono
      });
      setPerfilSaved(true);
      setTimeout(() => setPerfilSaved(false), 2500);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleOpenCorte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSucursal?.id || cashBusy.current) return;
    cashBusy.current = true; setCashSubmitting(true);setCashError('');setCashNotice('');
    try {
      const corte = await api.abrirCorteCaja(currentSucursal.id, fondoInicial, notasApertura);
      setActiveCorte(corte);
      setShowOpenCorteModal(false);
      loadData();
    } catch (e: any) {
      setCashError(api.pendingFinancial()?'Apertura por confirmar. Conserva esta pestaña; cancela esta ventana y usa Recuperar resultado antes de abrir otra caja.':e.message);
    } finally { cashBusy.current = false; setCashSubmitting(false); }
  };

  const handleCloseCorteConArqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCorte || cashBusy.current) return;
    cashBusy.current = true; setCashSubmitting(true);setCashError('');setCashNotice('');
    try {
      const res = await api.cerrarCorteCaja(activeCorte.id, totalFisicoContado, notasCierre);
      const msg = res.resumen.descuadrado
        ? `Caja cerrada con diferencia: $${res.resumen.descuadre} MXN`
        : '¡Caja perfectamente cuadrada!';
      setCashNoticeWarning(Boolean(res.resumen.descuadrado));
      setCashNotice(msg+' Puedes abrir el comprobante desde el historial.');

      setShowArqueoModal(false);
      setActiveCorte(null);
      loadData();
    } catch (e: any) {
      setCashError(api.pendingFinancial()?'Cierre por confirmar. Conserva esta pestaña; cancela esta ventana y usa Recuperar resultado antes de repetir el corte.':e.message);
    } finally { cashBusy.current = false; setCashSubmitting(false); }
  };

  const handlePagarComisiones = async () => {
    if (!payrollReview || payrollBusy.current) return;
    if (payrollReview.scope !== activeBranchScope.current) { setPayrollError('Cambió la cuenta o sucursal. Vuelve a revisar la selección antes de pagar.'); return; }
    const ids = payrollReview.rows.map(row => row.id);
    const scope = payrollReview.scope;
    payrollBusy.current = true; setPayrollSubmitting(true); setPayrollError('');
    try {
      const pending = api.pendingFinancial();
      if (pending && !commissionReviewPending(pending, ids)) {
        setPayrollError('Hay otra operación pendiente. Vuelve sin pagar y recupera su resultado desde el aviso superior antes de revisar esta liquidación.');
        return;
      }
      if (!pending) {
        const latest = await api.getComisiones();
        if (scope !== activeBranchScope.current || !commissionReviewMatches(payrollReview.rows, latest.comisiones, currentSucursal?.id || '')) {
          setPayrollError('La selección, destinatario o importe cambió. Vuelve sin pagar, actualiza las comisiones y revisa de nuevo.');
          return;
        }
      }
      if (scope !== activeBranchScope.current) { setPayrollError('Cambió la cuenta o sucursal antes de confirmar. No enviamos este pago.'); return; }
      await api.pagarComisiones(ids, 'EFECTIVO');
      if (scope !== activeBranchScope.current) return;
      setTeamNotice(`Se liquidaron ${ids.length} comisiones.`);
      setPayrollReview(null); setPayrollUncertain(false);
      setSelectedComisiones([]);
      loadData();
    } catch (e: any) {
      if (scope !== activeBranchScope.current) return;
      const pending = api.pendingFinancial();
      const samePending = commissionReviewPending(pending, ids);
      setPayrollUncertain(samePending);
      setPayrollError(samePending ? 'El resultado del pago no está confirmado. Conservamos esta misma selección. Recupera el resultado antes de intentar otra liquidación.' : e.message || 'No se confirmó la liquidación.');
    } finally { payrollBusy.current = false; setPayrollSubmitting(false); }
  };

  const filteredComisiones = comisiones.filter(c => {
    if (isBarberoRole) {
      // Barbero can only see their own commissions
      const myB = barberos.find((b: any) => b.id === currentUser?.barberoId);
      if (myB && c.barberoId !== myB.id) return false;
    } else if (filterBarberoId && c.barberoId !== filterBarberoId) {
      return false;
    }
    return true;
  });

  const visibleTeam = barberos.filter(barber =>
    (teamFilter === 'todos' || (teamFilter === 'activos' ? barber.activo : !barber.activo)) &&
    `${barber.nombre} ${barber.especialidad || ''}`.toLocaleLowerCase('es-MX').includes(teamSearch.toLocaleLowerCase('es-MX'))
  );

  return (
    <div className={`studio-page operation-page team-page team-workspace ${activeTab === 'cortes' ? 'cash-simple-page' : ''}`}>
      {teamNotice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{teamNotice}</p>}
      {cashNotice&&<p role="status" className={`mb-4 rounded-xl p-3 text-sm ${cashNoticeWarning ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>{cashNotice}</p>}
      {cashError&&!showArqueoModal&&!showOpenCorteModal&&<p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{cashError}</p>}
      {loadError && <div role="alert" className="operation-error"><div><p className="font-semibold">No pudimos actualizar esta sucursal</p><p>{loadError}</p></div><button onClick={loadData} className="studio-button-secondary">Reintentar</button></div>}
      {dataLoading && <p role="status" className="text-sm operation-muted mb-4">Consultando equipo, caja y comisiones…</p>}

      {/* Header */}
      <div className="team-heading">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="studio-title">
              {isBarberoRole ? activeTab === 'cortes' ? 'Mi caja' : activeTab === 'comisiones' ? 'Mis comisiones' : 'Mi perfil' : isCashier || activeTab === 'cortes' ? 'Caja' : activeTab === 'comisiones' ? 'Comisiones del equipo' : 'Equipo'}
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {currentSucursal?.nombre || 'Sin sucursal seleccionada'}
            </span>
          </div>
          <p className="team-heading-copy" hidden={activeTab === 'cortes'}>
            {isBarberoRole
              ? 'Personaliza tu foto de perfil, especialidad y consulta tus comisiones y propinas acumuladas.'
               : isCashier || workspaceMode === 'caja' ? 'Entregas de efectivo, turnos y cierres de tu sucursal. Las ventas y el efectivo en caja se revisan por separado.' : 'Perfiles, horarios y comisiones de tu sucursal.'}
          </p>
        </div>

        {/* Tab Switcher */}
        {workspaceMode !== 'caja' && <div className="operation-tabs" role="group" aria-label="Secciones de equipo y caja">
          {isBarberoRole ? (
            <>
              <button type="button" className="cash-barber-tab" aria-pressed={activeTab === 'cortes'} onClick={() => setActiveTab('cortes')}>Mi efectivo</button>
              <button
                onClick={() => setActiveTab('perfil')}
                aria-pressed={activeTab === 'perfil'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'perfil' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-stone-700" />
                <span>Mi Perfil</span>
              </button>
              {!isCashier && (<button
                onClick={() => setActiveTab('comisiones')}
                aria-pressed={activeTab === 'comisiones'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'comisiones' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-stone-700" />
                <span>Comisiones</span>
              </button>)}
            </>
          ) : (
            <>
              {!isCashier && (<button
                onClick={() => setActiveTab('barberos')}
                aria-pressed={activeTab === 'barberos'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'barberos' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-stone-700" />
                <span>Equipo{!dataLoading && !loadError ? ` (${barberos.length})` : ''}</span>
              </button>)}
              {['DUENO', 'GERENTE'].includes(currentRole) && (
                <button
                  type="button"
                  onClick={() => hasAdvancedCommercialControls ? setActiveTab('reglas') : onNavigateToSubscription?.()}
                  aria-pressed={hasAdvancedCommercialControls && activeTab === 'reglas'}
                  title={hasAdvancedCommercialControls ? 'Configurar precios por profesional y autorizaciones' : 'Disponible en Pro'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${hasAdvancedCommercialControls && activeTab === 'reglas' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
                >
                  <span>Tarifas y descuentos</span>
                  {!hasAdvancedCommercialControls && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">Pro</span>}
                </button>
              )}
              <button
                onClick={() => setActiveTab('cortes')}
                aria-pressed={activeTab === 'cortes'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'cortes' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-stone-700" />
                <span>Caja y entregas</span>
              </button>
              {!isCashier && (<button
                onClick={() => setActiveTab('comisiones')}
                aria-pressed={activeTab === 'comisiones'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'comisiones' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-stone-700" />
                <span>Comisiones y propinas</span>
              </button>)}
            </>
          )}
        </div>}
      </div>

      {/* ======================================================== */}
      {/* 1. MI PERFIL DE BARBERO (ROL BARBERO ONLY) */}
      {/* ======================================================== */}
      {currentSucursal && activeTab === 'reglas' && hasAdvancedCommercialControls && ['DUENO', 'GERENTE'].includes(currentRole) && <CommercialControls key={currentSucursal.id} branchId={currentSucursal.id} barbers={barberos} zone={currentSucursal.zonaHoraria || 'America/Mexico_City'} />}
      {currentSucursal && isBarberoRole && activeTab === 'cortes' && <CashCustody key={currentSucursal.id} branchId={currentSucursal.id} barber />}
      {activeTab === 'perfil' && isBarberoRole && (
        <div className="max-w-2xl bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-stone-900 shadow-xs bg-stone-100 flex items-center justify-center">
              {miAvatar ? (
                <img src={miAvatar} alt="Mi Foto" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-7 h-7 text-stone-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">{currentUser?.nombre || 'Mi Perfil de Barbero'}</h2>
              <p className="text-xs text-stone-500">{currentUser?.email} • Rol Barbero Oficial</p>
            </div>
          </div>

          {perfilSaved && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>¡Perfil actualizado con éxito! Ya se visualiza en la página web pública.</span>
            </div>
          )}

          <form onSubmit={handleSaveMiPerfil} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Foto de Perfil (Avatar)</label>
              <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
                {BARBER_AVATARS.map((av, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setMiAvatar(av)}
                    className={`w-9 h-9 rounded-full overflow-hidden border-2 transition flex-shrink-0 ${
                      miAvatar === av ? 'border-stone-900 scale-110' : 'border-stone-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={av} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <input
                type="url"
                value={miAvatar}
                onChange={(e) => setMiAvatar(e.target.value)}
                placeholder="O pega aquí tu URL de foto (ej. https://...)"
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Especialidad o Título</label>
              <input
                type="text"
                value={miEspecialidad}
                onChange={(e) => setMiEspecialidad(e.target.value)}
                placeholder="Ej. Especialista en Fades, Afeitado Tradicional y Diseños"
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-stone-900 font-medium focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Breve Biografía para Clientes</label>
              <textarea
                rows={3}
                value={miDescripcion}
                onChange={(e) => setMiDescripcion(e.target.value)}
                placeholder="Cuéntale a los clientes tu estilo de corte, experiencia y pasión por la barbería..."
                className="w-full bg-white border border-stone-200 rounded-lg p-3 text-xs sm:text-sm text-stone-900 font-medium focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Teléfono de Contacto</label>
              <input
                type="tel"
                value={miTelefono}
                onChange={(e) => setMiTelefono(e.target.value)}
                placeholder="55 1234 5678"
                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-stone-900 font-medium focus:outline-none focus:border-stone-900"
              />
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm transition shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Mi Perfil</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. DIRECTORIO DE EQUIPO (DUENO / GERENTE ONLY) */}
      {/* ======================================================== */}
      {activeTab === 'barberos' && !isBarberoRole && (
        <section className="team-directory" aria-label="Directorio del equipo">
          <div className="team-directory-intro">
            <p>{dataLoading ? 'Consultando plazas…' : loadError ? 'Plazas no disponibles' : `${barberos.filter(b => b.activo).length} de ${licensePlan(plan)?.barbersPerBranch} plazas`}</p>
            <button onClick={() => setShowAddBarberoModal(true)} className="studio-button"><Plus size={18} />Añadir barbero</button>
          </div>
          <div className="team-directory-tools">
            <label><span>Buscar</span><input type="search" value={teamSearch} onChange={event => setTeamSearch(event.target.value)} placeholder="Nombre o especialidad" /></label>
            <label><span>Estado</span><select value={teamFilter} onChange={event => setTeamFilter(event.target.value as typeof teamFilter)}><option value="todos">Todo el equipo</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></label>
          </div>
          {!dataLoading && !loadError && barberos.length === 0 && <OperationState title="Tu equipo empieza aquí">Agrega a los profesionales, sus horarios y sus comisiones. Sus perfiles pueden aparecer en tu página de reservas.</OperationState>}
          {barberos.length > 0 && visibleTeam.length === 0 && <p role="status" className="team-empty">No encontramos perfiles con estos filtros. Prueba otro nombre o muestra todo el equipo.</p>}
          <div className="team-profile-grid team-directory-rows">
            {visibleTeam.map(b => (
              <article key={b.id} className={`team-profile ${!b.activo ? 'is-inactive' : ''}`}>
                <div className="team-portrait">
                  <BarberPortrait barber={b} />
                  <span className="team-profile-state">{b.activo ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div className="team-profile-content">
                  <h3>{b.nombre}</h3><p className="team-specialty">{b.especialidad || 'Profesional de barbería'}</p>

                  <dl className="team-shift"><div><dt>Horario</dt><dd>{b.horarioInicio} – {b.horarioFin}</dd></div><div><dt>Descanso</dt><dd>{b.diasDescanso || 'Sin definir'}</dd></div><div><dt>Reservas públicas</dt><dd>{b.activo && b.visibleEnWeb !== false ? 'Perfil visible' : 'Perfil oculto'}</dd></div></dl>
                  <details className="team-private-details"><summary>Comisiones y datos del perfil</summary>{b.descripcion && <p className="team-bio">{b.descripcion}</p>}<div className="team-commission"><div><span>Servicios</span><strong>{b.comisionServiciosPct}%</strong></div><div><span>Productos</span><strong>{b.comisionProductosPct}%</strong></div></div><p>Comisiones pendientes: {b.comisionesPendientes == null ? 'Sin consultar' : new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(b.comisionesPendientes))}</p></details>
                  <div className="team-profile-footer"><span>Perfil y horario</span><button onClick={() => {setEditingBarbero(b);setShowEditBarberoModal(true);}} className="studio-button-secondary" aria-label={`Editar perfil de ${b.nombre}`}><Edit2 size={16} />Editar</button></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. ARQUEO Y CONTEO FÍSICO DE CAJA (DUENO / GERENTE ONLY) */}
      {/* ======================================================== */}
      {activeTab === 'cortes' && !isBarberoRole && <>
        <nav className="cash-view-nav" aria-label="Vistas de caja">
          <button type="button" hidden={cashScreen === 'turno'} onClick={() => setCashScreen('turno')}>Volver al turno</button>
          <button type="button" hidden={cashScreen === 'historial'} onClick={() => setCashScreen('historial')}>Ver cierres</button>
        </nav>
        {cashScreen === 'turno' ? <div className="cash-desk">
          <section className="cash-shift-surface" aria-label="Turno actual">
            <div className="cash-shift-main">
              <h2>Tu turno</h2>
              <p className="cash-shift-status">{dataLoading ? 'Consultando turno' : loadError ? 'No pudimos consultar el turno' : activeCorte ? 'Caja abierta' : 'Caja cerrada'}</p>
              {activeCorte && <p className="cash-shift-meta">Abierto {new Date(activeCorte.fechaApertura).toLocaleString('es-MX', { timeZone: currentSucursal?.zonaHoraria || 'America/Mexico_City', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · Fondo inicial ${Number(activeCorte.fondoInicial).toFixed(2)}</p>}
              <button type="button" disabled={dataLoading || Boolean(loadError)} className="studio-button cash-main-action" onClick={() => activeCorte ? setShowArqueoModal(true) : setShowOpenCorteModal(true)}>{activeCorte ? 'Contar y cerrar' : 'Abrir caja'}</button>
            </div>
            {!dataLoading && !loadError && cortes.some(c => c.estado === 'CERRADO') && <div className="cash-last-close">
              <h3>Último cierre</h3>
              {cortes.filter(c => c.estado === 'CERRADO').slice(0, 1).map(c => <div key={c.id}>
                <span>{new Date(c.fechaCierre || c.fechaApertura).toLocaleDateString('es-MX', { timeZone: currentSucursal?.zonaHoraria || 'America/Mexico_City', day: 'numeric', month: 'short' })}</span>
                <strong>Conteo ${Number(c.conteoEfectivoReal || 0).toFixed(2)}</strong>
                <button type="button" onClick={() => api.printCorteHtml(c.id).catch(e => setCashError(e.message))}>Ver comprobante</button>
              </div>)}
            </div>}
          </section>
          {currentSucursal && <CashCustody key={currentSucursal.id} branchId={currentSucursal.id} barber={false} cashOpen={Boolean(activeCorte) && !dataLoading && !loadError} />}
        </div> : <section aria-label="Historial de caja">
          <div className="cash-history bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="operation-section-heading"><div><h3>Historial de turnos</h3><p>El esperado y la diferencia se muestran después de confirmar el conteo. Abre el comprobante de un turno cerrado.</p></div></div>
            <div className="overflow-x-auto">
              <table className="operation-table w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5">ID / Fecha</th>
                    <th className="py-2.5">Fondo Inicial</th>
                    <th className="py-2.5">Ventas EF</th>
                    <th className="py-2.5">Conteo Real</th>
                    <th className="py-2.5">Diferencia</th>
                    <th className="py-2.5">Estado</th>
                    <th className="py-2.5 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {!dataLoading && !loadError && cortes.length === 0 && <tr><td colSpan={7}><OperationState title="Aún no hay turnos registrados">Abre un turno con el fondo físico que recibiste para empezar el historial de caja.</OperationState></td></tr>}
                  {cortes.map(c => (
                    <tr key={c.id} className="hover:bg-stone-50/60">
                      <td data-label="Apertura" className="py-3 font-mono font-medium">
                        <div>{new Date(c.fechaApertura).toLocaleDateString('es-MX', { timeZone: currentSucursal?.zonaHoraria || 'America/Mexico_City' })}</div>
                        <div className="text-[10px] text-stone-600">{new Date(c.fechaApertura).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: currentSucursal?.zonaHoraria || 'America/Mexico_City' })}</div>
                      </td>
                      <td data-label="Fondo inicial" className="py-3 font-mono">${Number(c.fondoInicial).toFixed(2)}</td>
                      <td data-label="Ventas en efectivo" className="py-3 font-mono font-semibold text-emerald-700">{c.estado === 'ABIERTO' ? 'Al cerrar' : `$${Number(c.totalEfectivo).toFixed(2)}`}</td>
                      <td data-label="Conteo real" className="py-3 font-mono font-bold text-stone-900">{c.estado === 'ABIERTO' ? 'Pendiente' : `$${Number(c.conteoEfectivoReal || 0).toFixed(2)}`}</td>
                      <td data-label="Diferencia" className="py-3 font-mono">
                        {c.estado === 'ABIERTO' ? <span>Pendiente</span> : Number(c.descuadre || 0) === 0 ? (
                          <span className="text-emerald-700 font-bold">Cuadrada</span>
                        ) : Number(c.descuadre || 0) < 0 ? (
                          <span className="text-rose-600 font-bold">Faltante -${Math.abs(Number(c.descuadre)).toFixed(2)}</span>
                        ) : (
                          <span className="text-amber-600 font-bold">Sobrante +${Number(c.descuadre).toFixed(2)}</span>
                        )}
                      </td>
                      <td data-label="Estado" className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.estado === 'ABIERTO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {c.estado}
                        </span>
                      </td>
                      <td data-label="Comprobante" className="py-3 text-right">
                        <button
                          onClick={() => api.printCorteHtml(c.id).catch(e=>setCashError(e.message))}
                          disabled={c.estado !== 'CERRADO'}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold transition"
                          title="Imprimir comprobante de cierre"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Comprobante</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>}
      </>}

      {/* ======================================================== */}
      {/* 4. NÓMINA & COMISIONES */}
      {/* ======================================================== */}
      {activeTab === 'comisiones' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
              <span className="text-sm text-stone-500 block mb-2">Pendiente de liquidar</span>
              <div className="text-2xl font-black text-emerald-700">
                {dataLoading ? 'Consultando…' : loadError ? 'Sin actualizar' : `$${totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`}
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
              <span className="text-sm text-stone-500 block mb-2">Histórico liquidado</span>
              <div className="text-2xl font-black text-stone-900">
                {dataLoading ? 'Consultando…' : loadError ? 'Sin actualizar' : `$${totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`}
              </div>
            </div>
          </div>

          {/* Action and Filter Bar */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="operation-section-heading"><div><h2>Comisiones y propinas</h2><p>Revisa el profesional, la venta y el estado. Liquidar una comisión no registra una entrega de efectivo.</p></div></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {!isBarberoRole && (
                <div className="flex items-center gap-2">
                  <label htmlFor="commission-professional" className="text-sm text-stone-500 font-semibold">Profesional:</label>
                  <select
                    id="commission-professional"
                    value={filterBarberoId}
                    onChange={(e) => setFilterBarberoId(e.target.value)}
                    className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-900"
                  >
                    <option value="">Todos los barberos</option>
                    {barberos.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {!isBarberoRole && selectedComisiones.length > 0 && (
                <button
                  onClick={() => {
                    try { setPayrollReview({ scope: branchScope, rows: commissionReviewRows(comisiones, selectedComisiones, currentSucursal?.id || '') }); setPayrollError(''); setPayrollUncertain(false); }
                    catch (error: any) { setTeamNotice(error.message); }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
                >
                  Liquidar {selectedComisiones.length} Comisiones Seleccionadas
                </button>
              )}
            </div>

            {/* Commissions Table */}
            <div className="overflow-x-auto">
              <table className="operation-table w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                    {!isBarberoRole && <th className="py-2.5 w-8"></th>}
                    <th className="py-2.5">Barbero</th>
                    <th className="py-2.5">Concepto / Venta</th>
                    <th className="py-2.5">Monto Comisión</th>
                    <th className="py-2.5">Propina</th>
                    <th className="py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {!dataLoading && !loadError && filteredComisiones.length === 0 && <tr><td colSpan={isBarberoRole ? 5 : 6}><OperationState title="Sin comisiones para esta selección">Las ventas atendidas por un profesional generan aquí sus comisiones y propinas. Revisa otro profesional o conserva el filtro actual.</OperationState></td></tr>}
                  {filteredComisiones.map(c => (
                    <tr key={c.id} className="hover:bg-stone-50/60">
                      {!isBarberoRole && (
                        <td className="py-2.5">
                          {!c.pagada && (
                            <input
                              type="checkbox"
                              aria-label={`Seleccionar comisión de ${c.barbero?.nombre || 'barbero'}, $${Number(c.monto).toFixed(2)} MXN`}
                              checked={selectedComisiones.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedComisiones([...selectedComisiones, c.id]);
                                else setSelectedComisiones(selectedComisiones.filter(id => id !== c.id));
                              }}
                              className="rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                            />
                          )}
                        </td>
                      )}
                      <td className="py-2.5 font-bold text-stone-900">{c.barbero?.nombre || 'Barbero'}</td>
                      <td className="py-2.5 text-stone-500 font-mono">
                        Venta {c.venta?.folio || 'sin folio disponible'}
                      </td>
                      <td className="py-2.5 font-bold text-emerald-700 font-mono">
                        +${Number(c.monto).toFixed(2)} MXN
                      </td>
                      <td className="py-2.5 text-stone-600 font-mono">
                        ${Number(c.propina || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.pagada ? 'bg-stone-100 text-stone-500' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {c.pagada ? 'Liquidada' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR BARBERO */}
      {/* ======================================================== */}
      {showAddBarberoModal && <OperationDialog open={true} busy={teamSubmitting} titleId="team-add-title" onClose={() => { setShowAddBarberoModal(false); setTeamError(''); }} className="max-w-lg">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-luxury-in max-h-[90vh] overflow-y-auto">
            <h3 id="team-add-title" tabIndex={-1} className="text-base font-bold text-stone-900 mb-1">Registrar Nuevo Barbero</h3>
            <p className="text-xs text-stone-500 mb-4">Ingresa sus datos profesionales, comisiones y opcionalmente su acceso al sistema.</p>

            {teamError && <p role="alert" className="mb-4 text-sm text-rose-800">{teamError}</p>}
            <form onSubmit={handleCreateBarbero} aria-busy={teamSubmitting}><fieldset disabled={teamSubmitting} className="space-y-4">
              <div>
                <label htmlFor="team-nombreBarbero" className="block text-[11px] font-bold text-stone-700 mb-1">Nombre Completo *</label>
                <input id="team-nombreBarbero"
                  type="text"
                  required
                  value={nombreBarbero}
                  onChange={(e) => setNombreBarbero(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="team-telefonoBarbero" className="block text-[11px] font-bold text-stone-700 mb-1">Teléfono privado</label>
                  <input id="team-telefonoBarbero"
                    type="tel"
                    value={telefonoBarbero}
                    onChange={(e) => setTelefonoBarbero(e.target.value)}
                    placeholder="55 1234 5678"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>
                <div>
                  <label htmlFor="team-emailBarbero" className="block text-[11px] font-bold text-stone-700 mb-1">Correo privado</label>
                  <input id="team-emailBarbero"
                    type="email"
                    value={emailBarbero}
                    onChange={(e) => setEmailBarbero(e.target.value)}
                    placeholder="barbero@barberia.com"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="team-especialidadBarbero" className="block text-[11px] font-bold text-stone-700 mb-1">Especialidad o Título</label>
                <input id="team-especialidadBarbero"
                  type="text"
                  value={especialidadBarbero}
                  onChange={(e) => setEspecialidadBarbero(e.target.value)}
                  placeholder="Ej. Especialista en Fades y Diseño de Barba"
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label htmlFor="team-descripcionBarbero" className="block text-[11px] font-bold text-stone-700 mb-1">Biografía Breve para Clientes</label>
                <textarea id="team-descripcionBarbero"
                  rows={2}
                  value={descripcionBarbero}
                  onChange={(e) => setDescripcionBarbero(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              {/* Presets de Foto */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1.5">Foto de Perfil (Avatar)</label>
                <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
                  {BARBER_AVATARS.map((av, idx) => (
                    <button
                      type="button"
                      key={idx}
                      aria-label={`Seleccionar foto de perfil ${idx + 1}`}
                      aria-pressed={avatarBarbero === av}
                      onClick={() => setAvatarBarbero(av)}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 transition flex-shrink-0 ${
                        avatarBarbero === av ? 'border-stone-900 scale-110' : 'border-stone-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={av} alt="Preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  aria-label="URL de foto de perfil personalizada"
                  value={avatarBarbero}
                  onChange={(e) => setAvatarBarbero(e.target.value)}
                  placeholder="O ingresa URL de foto personalizada"
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-900"
                />
              </div>

              {/* Comisiones */}
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <label htmlFor="team-comisionServicios" className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Comisión Servicios (%)</label>
                  <input id="team-comisionServicios"
                    type="number"
                    min="0"
                    max="100"
                    value={comisionServicios}
                    onChange={(e) => setComisionServicios(Number(e.target.value))}
                    className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-xs text-stone-900 font-bold"
                  />
                </div>
                <div>
                  <label htmlFor="team-comisionProductos" className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Comisión Productos (%)</label>
                  <input id="team-comisionProductos"
                    type="number"
                    min="0"
                    max="100"
                    value={comisionProductos}
                    onChange={(e) => setComisionProductos(Number(e.target.value))}
                    className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-xs text-stone-900 font-bold"
                  />
                </div>
              </div>

              {/* Crear Cuenta de Usuario Integrada */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crearAccesoUsuario}
                    onChange={(e) => setCrearAccesoUsuario(e.target.checked)}
                    className="rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  />
                  <span className="text-xs font-bold text-stone-800">Invitar al barbero por correo (solo propietario)</span>
                </label>
                {crearAccesoUsuario && <p className="text-xs text-stone-600">Usaremos el correo del perfil para enviar una invitación. El barbero elegirá su contraseña. Consulta el envío en Accesos.</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddBarberoModal(false); setTeamError(''); }}
                  className="px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  {teamSubmitting ? 'Registrando…' : 'Registrar Barbero'}
                </button>
              </div>
            </fieldset></form>
          </div>
      </OperationDialog>}

      {/* ======================================================== */}
      {/* MODAL: EDITAR BARBERO (DUENO / GERENTE ONLY) */}
      {/* ======================================================== */}
      {showEditBarberoModal && editingBarbero && <OperationDialog open={true} busy={teamSubmitting} titleId="team-edit-title" onClose={() => { setShowEditBarberoModal(false); setTeamError(''); }} className="max-w-lg">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-luxury-in max-h-[90vh] overflow-y-auto">
            <h3 id="team-edit-title" tabIndex={-1} className="text-base font-bold text-stone-900 mb-1">Editar Barbero: {editingBarbero.nombre}</h3>
            <p className="text-xs text-stone-500 mb-4">Actualiza foto, biografía, comisiones o estado.</p>

            {teamError && <p role="alert" className="mb-4 text-sm text-rose-800">{teamError}</p>}
            <form onSubmit={handleSaveBarberoEdit} aria-busy={teamSubmitting}><fieldset disabled={teamSubmitting} className="space-y-4">
              <div>
                <label htmlFor="team-editingBarbero-nombre" className="block text-[11px] font-bold text-stone-700 mb-1">Nombre público</label>
                <input id="team-editingBarbero-nombre"
                  type="text"
                  required
                  value={editingBarbero.nombre}
                  onChange={(e) => setEditingBarbero({ ...editingBarbero, nombre: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="team-editingBarbero-telefono" className="block text-[11px] font-bold text-stone-700 mb-1">Teléfono privado</label>
                  <input id="team-editingBarbero-telefono"
                    type="tel"
                    value={editingBarbero.telefono || ''}
                    onChange={(e) => setEditingBarbero({ ...editingBarbero, telefono: e.target.value })}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label htmlFor="team-editingBarbero-email" className="block text-[11px] font-bold text-stone-700 mb-1">Correo privado</label>
                  <input id="team-editingBarbero-email"
                    type="email"
                    value={editingBarbero.email || ''}
                    onChange={(e) => setEditingBarbero({ ...editingBarbero, email: e.target.value })}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="team-editingBarbero-especialidad" className="block text-[11px] font-bold text-stone-700 mb-1">Especialidad</label>
                <input id="team-editingBarbero-especialidad"
                  type="text"
                  value={editingBarbero.especialidad || ''}
                  onChange={(e) => setEditingBarbero({ ...editingBarbero, especialidad: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                />
              </div>

              <div>
                <label htmlFor="team-editingBarbero-descripcion" className="block text-[11px] font-bold text-stone-700 mb-1">Biografía para Clientes</label>
                <textarea id="team-editingBarbero-descripcion"
                  rows={2}
                  value={editingBarbero.descripcion || ''}
                  onChange={(e) => setEditingBarbero({ ...editingBarbero, descripcion: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                />
              </div>

              <div>
                <label htmlFor="team-editingBarbero-avatarUrl" className="block text-[11px] font-bold text-stone-700 mb-1">Foto pública (URL)</label>
                <input id="team-editingBarbero-avatarUrl"
                  type="url"
                  value={editingBarbero.avatarUrl || ''}
                  onChange={(e) => setEditingBarbero({ ...editingBarbero, avatarUrl: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <label htmlFor="team-editingBarbero-comisionServiciosPct" className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Comisión Servicios (%)</label>
                  <input id="team-editingBarbero-comisionServiciosPct"
                    type="number"
                    min="0"
                    max="100"
                    value={editingBarbero.comisionServiciosPct}
                    onChange={(e) => setEditingBarbero({ ...editingBarbero, comisionServiciosPct: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-xs text-stone-900 font-bold"
                  />
                </div>
                <div>
                  <label htmlFor="team-editingBarbero-comisionProductosPct" className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Comisión Productos (%)</label>
                  <input id="team-editingBarbero-comisionProductosPct"
                    type="number"
                    min="0"
                    max="100"
                    value={editingBarbero.comisionProductosPct}
                    onChange={(e) => setEditingBarbero({ ...editingBarbero, comisionProductosPct: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-xs text-stone-900 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingBarbero.visibleEnWeb !== false}
                    onChange={(e) => setEditingBarbero({ ...editingBarbero, visibleEnWeb: e.target.checked })}
                    className="rounded border-stone-300 text-stone-900"
                  />
                  <span className="text-xs font-semibold text-stone-700">Mostrar en Web Pública</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingBarbero.activo}
                    onChange={(e) => setEditingBarbero({ ...editingBarbero, activo: e.target.checked })}
                    className="rounded border-stone-300 text-stone-900"
                  />
                  <span className="text-xs font-semibold text-stone-700">Barbero Activo</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => { setShowEditBarberoModal(false); setTeamError(''); }}
                  className="px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  {teamSubmitting ? 'Guardando…' : 'Guardar Cambios'}
                </button>
              </div>
            </fieldset></form>
          </div>
      </OperationDialog>}

      {/* ======================================================== */}
      {/* MODAL: APERTURA DE CAJA */}
      {/* ======================================================== */}
      <OperationDialog open={Boolean(payrollReview)} busy={payrollSubmitting || payrollUncertain} titleId="commission-payment-title" onClose={() => setPayrollReview(null)} className="max-w-lg">
        <section className="studio-panel p-6"><h2 id="commission-payment-title" tabIndex={-1} className="text-xl font-semibold">Revisar pago de comisiones</h2><p className="text-sm text-stone-600 mt-3">El pago se registrará en efectivo para las siguientes comisiones. La validación y salida de caja se realizan al confirmar.</p>
          <ul className="divide-y mt-4">{payrollReview?.rows.map(row => <li key={row.id} className="py-3 text-sm"><strong>{row.nombre}</strong><span className="block text-stone-600 break-all">Venta {row.folio} · ${row.monto.toFixed(2)} MXN</span></li>)}</ul>
          <p className="font-semibold mt-4">Total de comisiones seleccionadas: ${(payrollReview?.rows.reduce((sum, row) => sum + row.monto, 0) || 0).toFixed(2)} MXN</p><p className="text-sm text-stone-600 mt-2">Método: efectivo. Este paso conserva los importes y ajustes de las comisiones; no añade un pago separado de propinas.</p>
          {payrollError && <p role="alert" className="text-sm text-rose-800 mt-4">{payrollError}</p>}
          <div className="flex flex-wrap gap-3 mt-6"><button type="button" disabled={payrollSubmitting || payrollUncertain} className="studio-button-secondary" onClick={() => setPayrollReview(null)}>Volver sin pagar</button><button type="button" disabled={payrollSubmitting} className="studio-button" onClick={() => void handlePagarComisiones()}>{payrollSubmitting ? 'Confirmando pago…' : payrollUncertain ? 'Recuperar resultado del mismo pago' : 'Confirmar pago en efectivo'}</button></div>
        </section>
      </OperationDialog>
      <OperationDialog open={showOpenCorteModal} busy={cashSubmitting} titleId="open-register-title" onClose={() => setShowOpenCorteModal(false)} className="max-w-sm">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-luxury-in max-h-[90dvh] overflow-y-auto">
            <h3 id="open-register-title" tabIndex={-1} className="text-lg font-semibold text-stone-900 mb-1">Abrir turno de caja</h3>
            <p className="text-xs text-stone-500 mb-4">Ingresa el fondo inicial en efectivo para iniciar operaciones.</p>

            <form onSubmit={handleOpenCorte} className="space-y-3.5">
              {cashError&&<p role="alert" className="text-sm text-amber-900">{cashError}</p>}
              <div>
                <label htmlFor="register-opening-fund" className="block text-sm font-semibold text-stone-700 mb-1">Fondo inicial ($ MXN)</label>
                <input
                  id="register-opening-fund"
                  type="number"
                  required
                  value={fondoInicial}
                  onChange={(e) => setFondoInicial(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-bold focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="register-opening-notes" className="block text-sm font-semibold text-stone-700 mb-1">Notas de apertura</label>
                <input
                  id="register-opening-notes"
                  type="text"
                  value={notasApertura}
                  onChange={(e) => setNotasApertura(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenCorteModal(false)}
                  disabled={cashSubmitting}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={cashSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  {cashSubmitting ? 'Abriendo…' : 'Iniciar Turno'}
                </button>
              </div>
            </form>
          </div>
      </OperationDialog>

      {/* ======================================================== */}
      {/* MODAL: ARQUEO FÍSICO Y DESGLOSE DE EFECTIVO (CIERRE) */}
      {/* ======================================================== */}
      {currentSucursal && !isBarberoRole && <CloseCashGuide open={showArqueoModal} cut={activeCorte} branchId={currentSucursal.id} zone={currentSucursal.zonaHoraria || 'America/Mexico_City'} onClose={() => setShowArqueoModal(false)} onClosed={() => { setActiveCorte(null); void loadData(); }} onGoToCustody={() => { setShowArqueoModal(false); window.requestAnimationFrame(() => { const section = document.getElementById(`cash-custody-${currentSucursal.id}`); section?.scrollIntoView({ block: 'start', behavior: 'smooth' }); section?.focus(); }); }} />}

    </div>
  );
};

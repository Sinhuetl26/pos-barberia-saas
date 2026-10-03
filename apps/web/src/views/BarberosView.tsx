import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Barbero, Sucursal, Comision, CorteCaja } from '../types';
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

interface BarberosViewProps {
  currentSucursal: Sucursal | null;
  currentRole: string;
  currentUser?: any;
  plan: 'BASICO' | 'PRO';
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

export const BarberosView: React.FC<BarberosViewProps> = ({
  currentSucursal,
  currentRole,
  currentUser,
  plan,
  onNavigateToSubscription
}) => {
  const isBarberoRole = currentRole === 'BARBERO';

  // Tabs: Barbero role gets only 'perfil' or 'comisiones'. Owner gets 'barberos', 'cortes', 'comisiones'.
  const [activeTab, setActiveTab] = useState<'barberos' | 'cortes' | 'comisiones' | 'perfil'>(
    isBarberoRole ? 'perfil' : 'barberos'
  );

  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [cortes, setCortes] = useState<CorteCaja[]>([]);
  const [totalPendiente, setTotalPendiente] = useState<number>(0);
  const [totalPagado, setTotalPagado] = useState<number>(0);

  const [filterBarberoId, setFilterBarberoId] = useState<string>('');

  // Modals
  const [showAddBarberoModal, setShowAddBarberoModal] = useState(false);
  const [showEditBarberoModal, setShowEditBarberoModal] = useState(false);
  const [editingBarbero, setEditingBarbero] = useState<Barbero | null>(null);

  const [showOpenCorteModal, setShowOpenCorteModal] = useState(false);
  const [showArqueoModal, setShowArqueoModal] = useState(false);
  const [activeCorte, setActiveCorte] = useState<CorteCaja | null>(null);

  // Form: Nuevo Barbero
  const [nombreBarbero, setNombreBarbero] = useState('');
  const [telefonoBarbero, setTelefonoBarbero] = useState('');
  const [emailBarbero, setEmailBarbero] = useState('');
  const [avatarBarbero, setAvatarBarbero] = useState('');
  const [especialidadBarbero, setEspecialidadBarbero] = useState('Master Barber');
  const [descripcionBarbero, setDescripcionBarbero] = useState('Especialista en cortes clásicos, fades y ritual de barba.');
  const [visibleEnWebBarbero, setVisibleEnWebBarbero] = useState(true);
  const [comisionServicios, setComisionServicios] = useState<number>(50);
  const [comisionProductos, setComisionProductos] = useState<number>(10);
  const [diasDescanso, setDiasDescanso] = useState('Domingo');
  const [horarioInicio, setHorarioInicio] = useState('09:00');
  const [horarioFin, setHorarioFin] = useState('20:00');
  const [crearAccesoUsuario, setCrearAccesoUsuario] = useState(false);
  const [passwordAcceso, setPasswordAcceso] = useState('');

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

  const [selectedComisiones, setSelectedComisiones] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [currentSucursal?.id]);

  const loadData = async () => {
    try {
      const [barbs, comData, cortesData] = await Promise.all([
        api.getBarberos(currentSucursal?.id),
        api.getComisiones(),
        api.getCortesCaja(currentSucursal?.id)
      ]);
      setBarberos(barbs);
      setComisiones(comData.comisiones);
      setTotalPendiente(comData.totalPendiente);
      setTotalPagado(comData.totalPagado);
      setCortes(cortesData);

      const openShift = cortesData.find((c: any) => c.estado === 'ABIERTO');
      setActiveCorte(openShift || null);

      // Si es rol BARBERO, buscar su propio perfil
      if (isBarberoRole) {
        const myB = barbs.find((b: any) => b.email === currentUser?.email || b.id === currentUser?.barberoId);
        if (myB) {
          setMiAvatar(myB.avatarUrl || '');
          setMiEspecialidad(myB.especialidad || 'Master Barber');
          setMiDescripcion(myB.descripcion || '');
          setMiTelefono(myB.telefono || '');
        }
      }
    } catch (e) {
      console.error('Error al cargar datos:', e);
    }
  };

  // Denominations calculator logic
  const calculateTotalFisico = (): number => {
    if (ajusteManualEfectivo !== null && ajusteManualEfectivo > 0) {
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
  const ventasEfTurno = activeCorte ? Number(activeCorte.totalEfectivo) : 0;
  const totalEsperado = fondoTurno + ventasEfTurno;
  const diferenciaArqueo = Math.round((totalFisicoContado - totalEsperado) * 100) / 100;

  const handleCreateBarbero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSucursal?.id) return;

    if (plan === 'BASICO' && barberos.length >= 3) {
      alert('Límite de 3 barberos alcanzado en el Plan Básico. Actualiza a Plan Pro.');
      if (onNavigateToSubscription) onNavigateToSubscription();
      return;
    }

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
        password: crearAccesoUsuario ? passwordAcceso : undefined,
        crearAcceso: crearAccesoUsuario
      });

      setShowAddBarberoModal(false);
      setNombreBarbero('');
      setTelefonoBarbero('');
      setEmailBarbero('');
      setAvatarBarbero('');
      setPasswordAcceso('');
      setCrearAccesoUsuario(false);
      loadData();
      alert('¡Barbero registrado exitosamente!');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaveBarberoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarbero) return;

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
      alert('¡Barbero actualizado exitosamente!');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaveMiPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    const myB = barberos.find((b: any) => b.email === currentUser?.email || b.id === currentUser?.barberoId);
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
    if (!currentSucursal?.id) return;
    try {
      const corte = await api.abrirCorteCaja(currentSucursal.id, fondoInicial, notasApertura);
      setActiveCorte(corte);
      setShowOpenCorteModal(false);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCloseCorteConArqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCorte) return;
    try {
      const res = await api.cerrarCorteCaja(activeCorte.id, totalFisicoContado, notasCierre);
      const msg = res.resumen.descuadrado
        ? `Caja cerrada con diferencia: $${res.resumen.descuadre} MXN`
        : '¡Caja perfectamente cuadrada!';
      alert(msg);
      
      // Auto-abrir comprobante de arqueo
      api.printCorteHtml(activeCorte.id);

      setShowArqueoModal(false);
      setActiveCorte(null);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePagarComisiones = async () => {
    if (selectedComisiones.length === 0) return alert('Selecciona al menos una comisión');
    try {
      await api.pagarComisiones(selectedComisiones, 'EFECTIVO');
      alert(`Se liquidaron ${selectedComisiones.length} comisiones.`);
      setSelectedComisiones([]);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredComisiones = comisiones.filter(c => {
    if (isBarberoRole) {
      // Barbero can only see their own commissions
      const myB = barberos.find((b: any) => b.email === currentUser?.email || b.id === currentUser?.barberoId);
      if (myB && c.barberoId !== myB.id) return false;
    } else if (filterBarberoId && c.barberoId !== filterBarberoId) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-luxury-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              {isBarberoRole ? 'Mi Perfil & Nómina de Barbero' : 'Barberos, Comisiones & Arqueo de Caja'}
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {currentSucursal?.nombre || 'Matriz'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {isBarberoRole
              ? 'Personaliza tu foto de perfil, especialidad y consulta tus comisiones y propinas acumuladas.'
              : 'Gestión de equipo, perfiles públicos de barberos, arqueo físico de caja y liquidación de nómina.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-stone-100 border border-stone-200 rounded-xl p-1 gap-1">
          {isBarberoRole ? (
            <>
              <button
                onClick={() => setActiveTab('perfil')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'perfil' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-stone-700" />
                <span>Mi Perfil</span>
              </button>
              <button
                onClick={() => setActiveTab('comisiones')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'comisiones' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-stone-700" />
                <span>Mis Comisiones & Propinas</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('barberos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'barberos' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-stone-700" />
                <span>Equipo ({barberos.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('cortes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'cortes' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-stone-700" />
                <span>Arqueo de Caja</span>
              </button>
              <button
                onClick={() => setActiveTab('comisiones')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'comisiones' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-stone-700" />
                <span>Nómina & Comisiones</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. MI PERFIL DE BARBERO (ROL BARBERO ONLY) */}
      {/* ======================================================== */}
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
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>
              {plan === 'BASICO' ? `Plan Básico: ${barberos.length}/3 barberos ocupados` : 'Plan Pro: Barberos ilimitados'}
            </span>

            <button
              onClick={() => setShowAddBarberoModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Barbero</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {barberos.map(b => (
              <div key={b.id} className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-stone-300 transition">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {b.avatarUrl ? (
                        <img src={b.avatarUrl} alt={b.nombre} className="w-12 h-12 rounded-full object-cover border border-stone-300 shadow-xs" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                          {b.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm">{b.nombre}</h3>
                        <p className="text-[11px] text-stone-500">{b.especialidad || 'Master Barber'}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      b.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-100 text-stone-500 border-stone-200'
                    }`}>
                      {b.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {b.descripcion && (
                    <p className="text-xs text-stone-600 italic bg-stone-50 p-2 rounded-lg border border-stone-100 mb-3 line-clamp-2">
                      "{b.descripcion}"
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200/80 mb-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-stone-500 block">Comisión Servicios</span>
                      <span className="text-sm font-extrabold text-stone-900">{b.comisionServiciosPct}%</span>
                    </div>
                    <div className="border-l border-stone-200 pl-3">
                      <span className="text-[10px] uppercase font-semibold text-stone-500 block">Comisión Productos</span>
                      <span className="text-sm font-extrabold text-stone-700">{b.comisionProductosPct}%</span>
                    </div>
                  </div>

                  <div className="text-xs text-stone-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Horario:</span>
                      <span className="font-semibold text-stone-900">{b.horarioInicio} - {b.horarioFin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Descanso:</span>
                      <span className="font-semibold text-stone-900">{b.diasDescanso}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Web Pública:</span>
                      <span className={`font-semibold ${b.visibleEnWeb !== false ? 'text-emerald-700' : 'text-stone-400'}`}>
                        {b.visibleEnWeb !== false ? 'Visible' : 'Oculto'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase">Pendiente</span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      ${(b.comisionesPendientes || 0).toLocaleString('es-MX')} MXN
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingBarbero(b);
                      setShowEditBarberoModal(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ARQUEO Y CONTEO FÍSICO DE CAJA (DUENO / GERENTE ONLY) */}
      {/* ======================================================== */}
      {activeTab === 'cortes' && !isBarberoRole && (
        <div className="space-y-6">
          {activeCorte ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-base font-bold text-stone-900">Caja en Operación (Turno Activo)</h3>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Fondo inicial: <strong>${Number(activeCorte.fondoInicial).toFixed(2)} MXN</strong> • Abierto el {new Date(activeCorte.fechaApertura).toLocaleString('es-MX')}
                  </p>
                </div>

                <button
                  onClick={() => setShowArqueoModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm transition shadow-sm"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Realizar Arqueo & Conteo de Efectivo</span>
                </button>
              </div>

              {/* Turn Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">Fondo Inicial</span>
                  <span className="text-base font-black text-stone-900">${Number(activeCorte.fondoInicial).toFixed(2)}</span>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">Ventas Efectivo</span>
                  <span className="text-base font-black text-emerald-700">+${Number(activeCorte.totalEfectivo).toFixed(2)}</span>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">Tarjeta & SPEI</span>
                  <span className="text-base font-black text-stone-900">
                    ${(Number(activeCorte.totalTarjeta) + Number(activeCorte.totalTransferencia)).toFixed(2)}
                  </span>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">Efectivo Esperado</span>
                  <span className="text-base font-black text-stone-900 font-mono">
                    ${totalEsperado.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Sin caja abierta en este momento</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  Abre un turno con fondo inicial en efectivo para registrar ventas y habilitar el arqueo ciego.
                </p>
              </div>
              <button
                onClick={() => setShowOpenCorteModal(true)}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm transition shadow-sm"
              >
                Abrir Turno de Caja
              </button>
            </div>
          )}

          {/* Historial de Cortes de Caja con Botón de Imprimir Acta */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Historial de Turnos y Arqueos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase text-[10px]">
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
                  {cortes.map(c => (
                    <tr key={c.id} className="hover:bg-stone-50/60">
                      <td className="py-3 font-mono font-medium">
                        <div>{new Date(c.fechaApertura).toLocaleDateString('es-MX')}</div>
                        <div className="text-[10px] text-stone-400">{new Date(c.fechaApertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="py-3 font-mono">${Number(c.fondoInicial).toFixed(2)}</td>
                      <td className="py-3 font-mono font-semibold text-emerald-700">+${Number(c.totalEfectivo).toFixed(2)}</td>
                      <td className="py-3 font-mono font-bold text-stone-900">${Number(c.conteoEfectivoReal || 0).toFixed(2)}</td>
                      <td className="py-3 font-mono">
                        {Math.abs(Number(c.descuadre || 0)) < 0.05 ? (
                          <span className="text-emerald-700 font-bold">Cuadrada</span>
                        ) : Number(c.descuadre || 0) < 0 ? (
                          <span className="text-rose-600 font-bold">Faltante -${Math.abs(Number(c.descuadre)).toFixed(2)}</span>
                        ) : (
                          <span className="text-amber-600 font-bold">Sobrante +${Number(c.descuadre).toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.estado === 'ABIERTO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => api.printCorteHtml(c.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold transition"
                          title="Imprimir Acta Oficial de Arqueo"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Acta</span>
                        </button>
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
      {/* 4. NÓMINA & COMISIONES */}
      {/* ======================================================== */}
      {activeTab === 'comisiones' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Total por Liquidar</span>
              <div className="text-2xl font-black text-emerald-700">
                ${totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">Histórico Liquidado</span>
              <div className="text-2xl font-black text-stone-900">
                ${totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </div>
            </div>
          </div>

          {/* Action and Filter Bar */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {!isBarberoRole && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 font-semibold">Filtrar por Barbero:</span>
                  <select
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
                  onClick={handlePagarComisiones}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
                >
                  Liquidar {selectedComisiones.length} Comisiones Seleccionadas
                </button>
              )}
            </div>

            {/* Commissions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase text-[10px]">
                    {!isBarberoRole && <th className="py-2.5 w-8"></th>}
                    <th className="py-2.5">Barbero</th>
                    <th className="py-2.5">Concepto / Venta</th>
                    <th className="py-2.5">Monto Comisión</th>
                    <th className="py-2.5">Propina</th>
                    <th className="py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filteredComisiones.map(c => (
                    <tr key={c.id} className="hover:bg-stone-50/60">
                      {!isBarberoRole && (
                        <td className="py-2.5">
                          {!c.pagada && (
                            <input
                              type="checkbox"
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
                        Venta #{c.ventaId ? c.ventaId.slice(0, 8) : 'N/A'}
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
      {showAddBarberoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-luxury-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-stone-900 mb-1">Registrar Nuevo Barbero</h3>
            <p className="text-xs text-stone-500 mb-4">Ingresa sus datos profesionales, comisiones y opcionalmente su acceso al sistema.</p>

            <form onSubmit={handleCreateBarbero} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Nombre Completo *</label>
                <input
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
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={telefonoBarbero}
                    onChange={(e) => setTelefonoBarbero(e.target.value)}
                    placeholder="55 1234 5678"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={emailBarbero}
                    onChange={(e) => setEmailBarbero(e.target.value)}
                    placeholder="barbero@barberia.com"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Especialidad o Título</label>
                <input
                  type="text"
                  value={especialidadBarbero}
                  onChange={(e) => setEspecialidadBarbero(e.target.value)}
                  placeholder="Ej. Especialista en Fades y Diseño de Barba"
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Biografía Breve para Clientes</label>
                <textarea
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
                  value={avatarBarbero}
                  onChange={(e) => setAvatarBarbero(e.target.value)}
                  placeholder="O ingresa URL de foto personalizada"
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-900"
                />
              </div>

              {/* Comisiones */}
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Comisión Servicios (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={comisionServicios}
                    onChange={(e) => setComisionServicios(Number(e.target.value))}
                    className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-xs text-stone-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Comisión Productos (%)</label>
                  <input
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
                  <span className="text-xs font-bold text-stone-800">Crear cuenta de acceso para el barbero</span>
                </label>
                {crearAccesoUsuario && (
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Contraseña de Acceso (mínimo 6 caracteres)</label>
                    <input
                      type="password"
                      required={crearAccesoUsuario}
                      value={passwordAcceso}
                      onChange={(e) => setPasswordAcceso(e.target.value)}
                      placeholder="Contraseña para iniciar sesión"
                      className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-900"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBarberoModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  Registrar Barbero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR BARBERO (DUENO / GERENTE ONLY) */}
      {/* ======================================================== */}
      {showEditBarberoModal && editingBarbero && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-luxury-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-stone-900 mb-1">Editar Barbero: {editingBarbero.nombre}</h3>
            <p className="text-xs text-stone-500 mb-4">Actualiza foto, biografía, comisiones o estado.</p>

            <form onSubmit={handleSaveBarberoEdit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editingBarbero.nombre}
                  onChange={(e) => setEditingBarbero({ ...editingBarbero, nombre: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={editingBarbero.telefono || ''}
                    onChange={(e) => setEditingBarbero({ ...editingBarbero, telefono: e.target.value })}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editingBarbero.email || ''}
                    onChange={(e) => setEditingBarbero({ ...editingBarbero, email: e.target.value })}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Especialidad</label>
                <input
                  type="text"
                  value={editingBarbero.especialidad || ''}
                  onChange={(e) => setEditingBarbero({ ...editingBarbero, especialidad: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Biografía para Clientes</label>
                <textarea
                  rows={2}
                  value={editingBarbero.descripcion || ''}
                  onChange={(e) => setEditingBarbero({ ...editingBarbero, descripcion: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs text-stone-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Foto de Perfil (Avatar URL)</label>
                <input
                  type="url"
                  value={editingBarbero.avatarUrl || ''}
                  onChange={(e) => setEditingBarbero({ ...editingBarbero, avatarUrl: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Comisión Servicios (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingBarbero.comisionServiciosPct}
                    onChange={(e) => setEditingBarbero({ ...editingBarbero, comisionServiciosPct: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-xs text-stone-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Comisión Productos (%)</label>
                  <input
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
                  onClick={() => setShowEditBarberoModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: APERTURA DE CAJA */}
      {/* ======================================================== */}
      {showOpenCorteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-luxury-in">
            <h3 className="text-base font-bold text-stone-900 mb-1">Abrir Turno de Caja</h3>
            <p className="text-xs text-stone-500 mb-4">Ingresa el fondo inicial en efectivo para iniciar operaciones.</p>

            <form onSubmit={handleOpenCorte} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Fondo Inicial ($ MXN)</label>
                <input
                  type="number"
                  required
                  value={fondoInicial}
                  onChange={(e) => setFondoInicial(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-bold focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Notas de Apertura</label>
                <input
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
                  className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  Iniciar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ARQUEO FÍSICO Y DESGLOSE DE EFECTIVO (CIERRE) */}
      {/* ======================================================== */}
      {showArqueoModal && activeCorte && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-luxury-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">Arqueo y Conteo Físico de Caja</h3>
                <p className="text-xs text-stone-500">Cuenta los billetes y monedas físicos en la gaveta para cuadrar el turno.</p>
              </div>
              <span className="p-2 rounded-xl bg-stone-100 text-stone-800">
                <Calculator className="w-5 h-5" />
              </span>
            </div>

            <form onSubmit={handleCloseCorteConArqueo} className="space-y-5">
              
              {/* Desglose de Billetes y Monedas */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">Desglose de Denominaciones</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs">
                  
                  {/* Billetes */}
                  {[
                    { key: '1000', label: 'Billete $1,000' },
                    { key: '500', label: 'Billete $500' },
                    { key: '200', label: 'Billete $200' },
                    { key: '100', label: 'Billete $100' },
                    { key: '50', label: 'Billete $50' },
                    { key: '20', label: 'Billete $20' }
                  ].map(b => (
                    <div key={b.key} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-stone-200">
                      <span className="font-semibold text-stone-700">{b.label}</span>
                      <input
                        type="number"
                        min="0"
                        value={denominaciones[b.key] || ''}
                        onChange={(e) => setDenominaciones({ ...denominaciones, [b.key]: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-14 text-right font-mono font-bold text-stone-900 border-b border-stone-300 focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  ))}

                  {/* Monedas */}
                  {[
                    { key: 'moneda_20', label: 'Moneda $20' },
                    { key: 'moneda_10', label: 'Moneda $10' },
                    { key: 'moneda_5', label: 'Moneda $5' },
                    { key: 'moneda_2', label: 'Moneda $2' },
                    { key: 'moneda_1', label: 'Moneda $1' },
                    { key: 'moneda_05', label: 'Moneda $0.50' }
                  ].map(m => (
                    <div key={m.key} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-stone-200">
                      <span className="font-medium text-stone-600">{m.label}</span>
                      <input
                        type="number"
                        min="0"
                        value={denominaciones[m.key] || ''}
                        onChange={(e) => setDenominaciones({ ...denominaciones, [m.key]: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-14 text-right font-mono font-bold text-stone-900 border-b border-stone-300 focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparación Teórica vs Real */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between text-stone-600">
                  <span>Fondo Inicial de Caja:</span>
                  <span className="font-mono font-bold">${fondoTurno.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Ventas en Efectivo del Turno:</span>
                  <span className="font-mono font-bold">+${ventasEfTurno.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-900 font-bold border-t border-stone-200 pt-2">
                  <span>Efectivo Teórico Esperado en Caja:</span>
                  <span className="font-mono text-sm">${totalEsperado.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between text-stone-900 font-black border-t border-stone-300 pt-2 text-sm bg-white p-2 rounded-lg border">
                  <span>Total Efectivo Contado Físico:</span>
                  <span className="font-mono text-base">${totalFisicoContado.toFixed(2)} MXN</span>
                </div>
                
                {/* Badge de Cuadre */}
                <div className="pt-1">
                  {Math.abs(diferenciaArqueo) < 0.05 ? (
                    <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-900 font-bold flex items-center justify-between">
                      <span>✓ CAJA PERFECTAMENTE CUADRADA</span>
                      <span>$0.00</span>
                    </div>
                  ) : diferenciaArqueo < 0 ? (
                    <div className="p-2.5 rounded-lg bg-rose-100 text-rose-900 font-bold flex items-center justify-between">
                      <span>⚠️ FALTANTE EN CAJA DETECTADO:</span>
                      <span className="font-mono">-${Math.abs(diferenciaArqueo).toFixed(2)} MXN</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-amber-100 text-amber-900 font-bold flex items-center justify-between">
                      <span>ℹ️ SOBRANTE EN CAJA DETECTADO:</span>
                      <span className="font-mono">+${diferenciaArqueo.toFixed(2)} MXN</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Notas u Observaciones del Cierre</label>
                <textarea
                  rows={2}
                  value={notasCierre}
                  onChange={(e) => setNotasCierre(e.target.value)}
                  placeholder="Detalles sobre retiros, billetes rotos o motivos del descuadre..."
                  className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowArqueoModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Cerrar Turno e Imprimir Acta de Arqueo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

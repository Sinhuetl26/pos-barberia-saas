import '../styles/collections-workspace.css';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { RebookingDraft } from '../types/rebooking';
import { ClientHistory, clientHistoryEvents, historicalPreference } from '../components/ClientHistory';
import { OperationDialog } from '../components/OperationDialog';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Award,
  AlertTriangle,
  Send,
  Sparkles,
  Scissors,
  DollarSign,
  Shield,
  Download,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  ChevronRight,
  RefreshCw,
  Crown
} from 'lucide-react';

export const ClientesView: React.FC<{ sucursalId?: string; onRebook?: (draft: RebookingDraft) => void }> = ({ sucursalId, onRebook }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = `${api.getTenantId()}:${api.getUserId()}:${api.getUserRole()}:${sucursalId || ''}`;
  const activeScope = useRef(scope); activeScope.current = scope;
  const listRequest = useRef(0), campaignRequest = useRef(0);
  const profileRequest = useRef(0);
  const profileBranch = useRef(scope);
  const queryClient = searchParams.get('clienteId');
  const canManage = api.getUserRole() === 'DUENO';
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [listScope, setListScope] = useState(scope);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'reactivacion' | 'membresias'>('todos');

  // Reactivation campaign state
  const [reactivacionData, setReactivacionData] = useState<any>(null);
  const [diasInactividad, setDiasInactividad] = useState(30);
  const [loadingCampana, setLoadingCampana] = useState(false);
  const [campaignError, setCampaignError] = useState('');
  const [campaignScope, setCampaignScope] = useState('');

  // Client 360 Profile Modal
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [notasEstilo, setNotasEstilo] = useState('');
  const [savingNotas, setSavingNotas] = useState(false);
  const [privacyBusy, setPrivacyBusy] = useState(false);

  // Membership assignment modal
  const [showMembresiaModal, setShowMembresiaModal] = useState(false);
  const [planMembresia, setPlanMembresia] = useState('VIP Club Mensual');
  const [precioMembresia, setPrecioMembresia] = useState(450);
  const [cortesMembresia, setCortesMembresia] = useState(2);
  const [submittingMembresia, setSubmittingMembresia] = useState(false);

  // New Client Modal
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotas, setNewNotas] = useState('');
  const [submittingClient, setSubmittingClient] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);
  useEffect(() => {
    if (profileBranch.current !== scope) {
      profileBranch.current = scope; profileRequest.current++; setSelectedClienteId(null); setPerfil(null); setLoadingPerfil(false);
      if (queryClient) { const next = new URLSearchParams(searchParams); next.delete('clienteId'); setSearchParams(next, { replace: true }); }
      return;
    }
    if (queryClient && ['DUENO', 'GERENTE', 'CAJERO'].includes(api.getUserRole())) void openPerfil(queryClient);
    return () => { profileRequest.current++; };
  }, [queryClient, sucursalId, scope]);

  useEffect(() => {
    void loadClientes();
    return () => { listRequest.current++; };
  }, [search, scope]);

  useEffect(() => {
    if (activeTab === 'reactivacion') {
      void loadCampana();
    }
    return () => { campaignRequest.current++; };
  }, [activeTab, diasInactividad, scope]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadClientes = async () => {
    if (scope !== activeScope.current) return;
    const request = ++listRequest.current;
    const current = () => request === listRequest.current && scope === activeScope.current;
    try {
      setLoading(true); setListError(''); setClientes([]); setListScope(scope);
      const data = await api.getClientes(search);
      if (!current()) return;
      if (!Array.isArray(data)) throw Error('La respuesta de clientes no es válida. Vuelve a intentar.');
      setClientes(data);
    } catch (err: any) {
      if (current()) setListError(err.message || 'No pudimos consultar los clientes. Tu catálogo no se ha borrado.');
    } finally {
      if (current()) setLoading(false);
    }
  };

  const loadCampana = async () => {
    if (scope !== activeScope.current) return;
    const request = ++campaignRequest.current;
    const current = () => request === campaignRequest.current && scope === activeScope.current;
    try {
      setLoadingCampana(true); setCampaignError(''); setReactivacionData(null); setCampaignScope(scope);
      const data = await api.getReactivacionCampana(diasInactividad);
      if (!current()) return;
      if (!Array.isArray(data?.clientes)) throw Error('La respuesta de seguimiento no es válida. Vuelve a intentar.');
      setReactivacionData({ clientesInactivos: data.clientes.map((client: any) => ({ ...client, diasInactivo: client.diasSinVenir, ultimaCita: client.fechaUltimaVisita })) });
    } catch (err: any) {
      if (current()) setCampaignError(err.message || 'No pudimos consultar el seguimiento de clientes. Vuelve a intentar.');
    } finally {
      if (current()) setLoadingCampana(false);
    }
  };

  const openPerfil = async (clienteId: string) => {
    const request = ++profileRequest.current;
    try {
      setPerfil(null);
      setSelectedClienteId(clienteId);
      setLoadingPerfil(true);
      const data = await api.getClienteProfile(clienteId);
      if (request !== profileRequest.current) return;
      setPerfil(data);
      setNotasEstilo(data.cliente.notasEstilo || '');
    } catch (err: any) {
      if (request === profileRequest.current) { setPerfil(null); showToast(err.message || 'No pudimos abrir este cliente. Revisa tu acceso y vuelve a buscar.'); }
    } finally {
      if (request === profileRequest.current) setLoadingPerfil(false);
    }
  };

  const handleSaveNotas = async () => {
    if (!selectedClienteId) return;
    try {
      setSavingNotas(true);
      await api.actualizarCliente(selectedClienteId, { notasEstilo });
      showToast('Notas de estilo y preferencias actualizadas correctamente');
      loadClientes();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar notas');
    } finally {
      setSavingNotas(false);
    }
  };

  const handleAssignMembresia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClienteId) return;
    try {
      setSubmittingMembresia(true);
      await api.asignarMembresia(selectedClienteId, {
        planNombre: planMembresia,
        precioMensual: Number(precioMembresia),
        cortesRestantes: Number(cortesMembresia)
      });
      showToast(`Membresía ${planMembresia} asignada con éxito`);
      setShowMembresiaModal(false);
      openPerfil(selectedClienteId);
      loadClientes();
    } catch (err: any) {
      showToast(err.message || 'Error al asignar membresía');
    } finally {
      setSubmittingMembresia(false);
    }
  };

  const handleExportArco = async () => {
    if (!selectedClienteId || privacyBusy) return;
    try {
      setPrivacyBusy(true);
      const data = await api.exportarClienteArco(selectedClienteId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expediente_arco_${perfil?.cliente?.telefono || 'cliente'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Expediente de datos personales ARCO descargado');
    } catch (err: any) {
      showToast(err.message || 'Error al exportar datos ARCO');
    } finally {
      setPrivacyBusy(false);
    }
  };

  const handleDeleteArco = async () => {
    if (!selectedClienteId || privacyBusy) return;
    if (!window.confirm('¿Confirmas la supresión de datos personales del cliente bajo derecho ARCO (LFPDPPP)? Esta acción anonimizará su nombre y teléfono.')) {
      return;
    }
    try {
      setPrivacyBusy(true);
      await api.eliminarClienteArco(selectedClienteId);
      showToast('Datos del cliente anonimizados conforme a LFPDPPP');
      setSelectedClienteId(null);
      setPerfil(null);
      loadClientes();
    } catch (err: any) {
      showToast(err.message || 'Error al ejecutar solicitud ARCO');
    } finally {
      setPrivacyBusy(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingClient(true);
      await api.crearCliente({
        sucursalId,
        nombre: newNombre,
        telefono: newTelefono,
        email: newEmail || undefined,
        notasEstilo: newNotas || undefined
      });
      showToast('Cliente registrado exitosamente en el CRM');
      setShowNewClientModal(false);
      setNewNombre('');
      setNewTelefono('');
      setNewEmail('');
      setNewNotas('');
      loadClientes();
    } catch (err: any) {
      showToast(err.message || 'Error al crear cliente');
    } finally {
      setSubmittingClient(false);
    }
  };

  return (
    <div className="studio-page studio-directory clients-workspace">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-stone-800 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="collection-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950">
            Clientes
          </h1>
          <p className="text-sm text-stone-500">
            Encuentra a tu cliente y continúa donde se quedó.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowNewClientModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition shadow-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 mb-6 pb-2">
        <button
          onClick={() => setActiveTab('todos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'todos'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          {canManage ? 'Directorio del negocio' : 'Clientes de tus sucursales'} ({clientes.length})
        </button>

        {canManage && (<button
          onClick={() => setActiveTab('reactivacion')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'reactivacion'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/60'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          Recuperar clientes
        </button>)}
      </div>

      {/* TAB 1: Directorio */}
      {activeTab === 'todos' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre o número de teléfono..."
              aria-label="Buscar clientes por nombre o teléfono"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent shadow-sm"
            />
          </div>

          {loading || listScope !== scope ? (
            <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center text-stone-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-stone-600" />
              Cargando catálogo de clientes...
            </div>
          ) : listError ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900"><p>{listError}</p><button type="button" className="studio-button-secondary mt-3" onClick={() => void loadClientes()}>Reintentar consulta de clientes</button></div>
          ) : clientes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-12 text-center">
              <Users className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-800">No se encontraron clientes</p>
              <p className="text-xs text-stone-500 mt-1">Registra tu primer cliente o agenda una cita para comenzar.</p>
            </div>
          ) : (
            <ul className="client-directory-list" aria-label="Directorio de clientes">
              {clientes.map(c => <li key={c.id}><button type="button" onClick={() => void openPerfil(c.id)} aria-label={`Abrir ficha de ${c.nombre}`}><span className="collection-initial" aria-hidden="true">{c.nombre?.trim().charAt(0).toUpperCase() || 'C'}</span><span className="client-directory-identity"><strong>{c.nombre}</strong><span>{c.telefono || 'Sin teléfono'}{c.email && ` · ${c.email}`}</span>{c.membresias?.length > 0 && <small>{c.membresias[0].planNombre}</small>}</span>{canManage && <span className="client-directory-history"><span>{typeof c.totalVisitas === 'number' ? c.totalVisitas : '—'} visitas y compras</span><span>{c.gastoTotal == null ? 'Gasto no disponible' : new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(c.gastoTotal))}</span>{c.noShows > 0 && <small>{c.noShows} ausencias</small>}</span>}<span className="collection-open">Ver ficha <span aria-hidden="true">↗</span></span></button></li>)}
            </ul>
          )}
        </div>
      )}

      {/* TAB 2: Reactivación WhatsApp */}
      {activeTab === 'reactivacion' && (
        <div className="space-y-6">
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Campaña de Retención & Reactivación de Clientes
                </h3>
                <p className="text-xs text-amber-800 mt-1">
                  Consulta clientes con visitas o compras registradas cuya última visita supera el periodo elegido. Puedes preparar una invitación; no se envía automáticamente.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="client-inactivity-days" className="text-xs font-medium text-amber-900 whitespace-nowrap">
                  Inactividad mayor a:
                </label>
                <select
                  id="client-inactivity-days"
                  value={diasInactividad}
                  onChange={(e) => setDiasInactividad(Number(e.target.value))}
                  className="bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                >
                  <option value={15}>15 días</option>
                  <option value={30}>30 días (Recomendado)</option>
                  <option value={45}>45 días</option>
                  <option value={60}>60 días</option>
                  <option value={90}>90 días</option>
                </select>
              </div>
            </div>

            {loadingCampana || campaignScope !== scope ? (
              <div className="text-center py-8 text-xs text-amber-800 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analizando historial de visitas y citas...
              </div>
            ) : campaignError ? (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><p>{campaignError}</p><button type="button" className="studio-button-secondary mt-3" onClick={() => void loadCampana()}>Reintentar seguimiento</button></div>
            ) : reactivacionData ? (
              <div>
                <div className="flex items-center gap-4 bg-white/80 backdrop-blur rounded-xl p-4 border border-amber-200/80 mb-6">
                  <div>
                    <span className="text-2xl font-bold text-stone-950 block">
                      {reactivacionData.clientesInactivos?.length || 0}
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium">
                      Clientes inactivos detectados
                    </span>
                  </div>
                  <div className="border-l border-amber-200 pl-4 text-xs text-stone-600">
                    Si hay un teléfono válido, puedes abrir WhatsApp para revisar la invitación. No se ofrecen descuentos automáticos.
                  </div>
                </div>

                {reactivacionData.clientesInactivos?.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-amber-200/60 text-xs text-stone-600">
                    🎉 ¡Excelente! No tienes clientes inactivos con más de {diasInactividad} días de ausencia.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reactivacionData.clientesInactivos.map((cl: any) => (
                      <div
                        key={cl.id}
                        className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-sm hover:shadow transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-semibold text-stone-900 text-sm">{cl.nombre}</h4>
                              <p className="text-[11px] font-mono text-stone-500">{cl.telefono}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {cl.diasInactivo} días ausente
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px] text-stone-500 mb-4 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                            <div className="flex justify-between">
                              <span>Última visita:</span>
                              <span className="font-medium text-stone-800">
                                {cl.ultimaCita ? new Date(cl.ultimaCita).toLocaleDateString('es-MX') : 'Sin registro'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Gasto acumulado:</span>
                              <span className="font-bold text-stone-900 font-mono">${Number(cl.gastoTotal).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {cl.whatsappUrl ? <a
                          href={cl.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Revisar invitación en WhatsApp
                        </a> : <p className="text-xs text-stone-600">Agrega un teléfono válido antes de preparar la invitación.</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL: Perfil 360° del Cliente */}
      {selectedClienteId && (
        <OperationDialog open={Boolean(selectedClienteId) && !showMembresiaModal} busy={savingNotas || submittingMembresia || privacyBusy} titleId="client-profile-title" className="max-w-2xl" onClose={() => { if (savingNotas || submittingMembresia || privacyBusy) return; profileRequest.current++; setSelectedClienteId(null); setPerfil(null); }}>
          <div className="bg-white rounded-2xl w-full shadow-2xl border border-stone-200 p-4 sm:p-6">
            <div className="flex items-start justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-sm">
                  {perfil?.cliente?.nombre ? perfil.cliente.nombre.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                  <h2 id="client-profile-title" tabIndex={-1} className="text-lg font-bold text-stone-950 flex items-center gap-2">
                    {perfil?.cliente?.nombre || 'Perfil del cliente'}
                    {perfil?.metricas?.noShows > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                        {perfil.metricas.noShows} Ausencias
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-stone-500 font-mono">
                    {perfil?.cliente?.telefono} {perfil?.cliente?.email ? `• ${perfil.cliente.email}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Cerrar perfil del cliente"
                disabled={savingNotas || submittingMembresia || privacyBusy}
                onClick={() => { profileRequest.current++; setSelectedClienteId(null); setPerfil(null); }}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {notification && <p role="status" className="mt-3 rounded-lg bg-stone-100 p-3 text-sm">{notification}</p>}

            {loadingPerfil ? (
              <div className="py-12 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Cargando expediente del cliente...
              </div>
            ) : perfil ? (
              <div className="space-y-6 pt-4">
                {/* 360 Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3">
                    <span className="text-[10px] text-stone-500 font-medium block">Gasto Total</span>
                    <span className="text-base font-bold text-stone-950 font-mono">
                      {canManage ? `$${Number(perfil.metricas?.gastoTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Reservado'}
                    </span>
                  </div>

                  <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3">
                    <span className="text-[10px] text-stone-500 font-medium block">Reservas en esta consulta</span>
                    <span className="text-base font-bold text-stone-950">
                      {perfil.cliente?.citas?.length || 0}
                    </span>
                  </div>

                  <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3">
                    <span className="text-[10px] text-stone-500 font-medium block">Referencia de habitualidad</span>
                    <span className="text-xs font-bold text-stone-900 truncate block mt-0.5">
                      {historicalPreference(clientHistoryEvents(perfil.cliente?.citas || [], perfil.cliente?.ventas || []), 'professional')}
                    </span>
                  </div>

                  <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3">
                    <span className="text-[10px] text-stone-500 font-medium block">Servicio Frecuente</span>
                    <span className="text-xs font-bold text-stone-900 truncate block mt-0.5">
                      {historicalPreference(clientHistoryEvents(perfil.cliente?.citas || [], perfil.cliente?.ventas || []), 'service')}
                    </span>
                  </div>
                </div>

                <ClientHistory key={perfil.cliente.id} client={perfil.cliente} branchId={sucursalId} onRebook={onRebook} showAmounts={canManage} />
                {/* Active Membership Section */}
                <div className="bg-stone-50/80 border border-stone-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      Membresías Recurrentes
                    </h4>
                    {canManage && (<button
                      disabled={privacyBusy || savingNotas}
                      onClick={() => setShowMembresiaModal(true)}
                      className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-semibold transition"
                    >
                      + Asignar Membresía
                    </button>)}
                  </div>

                  {perfil.membresias && perfil.membresias.length > 0 ? (
                    <div className="space-y-2">
                      {perfil.membresias.map((m: any) => (
                        <div key={m.id} className="bg-white border border-stone-200 rounded-lg p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-stone-900 block">{m.planNombre}</span>
                            <span className="text-[11px] text-stone-500">
                              Cortes restantes: <strong className="text-stone-900">{m.cortesRestantes}</strong> • Vence: {new Date(m.fechaRenovacion).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {m.estado}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 italic">El cliente no cuenta con membresía recurrente activa.</p>
                  )}
                </div>

                {/* Style & Preferences Notes */}
                <div>
                  <label htmlFor="client-style-notes" className="block text-xs font-bold text-stone-900 mb-1.5 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-stone-600" />
                    Notas de Estilo, Graduación de Navaja y Alergias
                  </label>
                  <textarea
                    id="client-style-notes"
                    rows={3}
                    readOnly={!canManage || savingNotas}
                    value={notasEstilo}
                    onChange={(e) => setNotasEstilo(e.target.value)}
                    placeholder="Ej. Fade #0.5 arriba tijera, no aplicar cera con fragancia fuerte, alérgico a la vaselina..."
                    className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 shadow-sm"
                  />
                  <div className="flex justify-end mt-2">
                    {canManage && (<button
                      onClick={handleSaveNotas}
                      disabled={savingNotas || privacyBusy}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                    >
                      {savingNotas ? 'Guardando...' : 'Actualizar Notas'}
                    </button>)}
                  </div>
                </div>

                {/* ARCO Privacy (LFPDPPP) Section */}
                <div className="border-t border-stone-200 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    Cumplimiento LFPDPPP México (Derechos ARCO)
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {canManage && (<button
                      disabled={privacyBusy || savingNotas}
                      onClick={handleExportArco}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-medium transition"
                      title="Descargar todos los datos asociados al cliente en formato JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exportar Datos
                    </button>)}
                    {canManage && (<button
                      disabled={privacyBusy || savingNotas}
                      onClick={handleDeleteArco}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-medium transition"
                      title="Anonimizar permanentemente los datos personales del cliente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Derecho de Cancelación
                    </button>)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </OperationDialog>
      )}

      {/* MODAL: Asignar Membresía */}
      {showMembresiaModal && (
        <OperationDialog open={showMembresiaModal} busy={submittingMembresia} titleId="client-membership-title" onClose={() => { if (!submittingMembresia) setShowMembresiaModal(false); }}>
          <div className="bg-white rounded-2xl w-full shadow-2xl border border-stone-200 p-4 sm:p-6">
            <h3 id="client-membership-title" tabIndex={-1} className="text-base font-bold text-stone-950 mb-1 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-600" />
              Asignar Membresía Recurrente
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Crea un plan de ingresos predecibles para la barbería con cortes mensuales incluidos.
            </p>
            {notification && <p role="status" className="mb-3 rounded-lg bg-stone-100 p-3 text-sm">{notification}</p>}

            <form onSubmit={handleAssignMembresia} className="space-y-4">
              <fieldset disabled={submittingMembresia} className="space-y-4">
              <div>
                <label htmlFor="client-membership-name" className="block text-xs font-semibold text-stone-700 mb-1">Nombre del Plan</label>
                <input
                  id="client-membership-name"
                  type="text"
                  required
                  value={planMembresia}
                  onChange={(e) => setPlanMembresia(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="client-membership-price" className="block text-xs font-semibold text-stone-700 mb-1">Precio Mensual ($MXN)</label>
                  <input
                    id="client-membership-price"
                    type="number"
                    required
                    min={0}
                    value={precioMembresia}
                    onChange={(e) => setPrecioMembresia(Number(e.target.value))}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="client-membership-cuts" className="block text-xs font-semibold text-stone-700 mb-1">Cortes Incluidos</label>
                  <input
                    id="client-membership-cuts"
                    type="number"
                    required
                    min={1}
                    value={cortesMembresia}
                    onChange={(e) => setCortesMembresia(Number(e.target.value))}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMembresiaModal(false)}
                  className="px-3 py-2 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingMembresia}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submittingMembresia ? 'Guardando...' : 'Asignar Membresía'}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </OperationDialog>
      )}

      {/* MODAL: Nuevo cliente */}
      {showNewClientModal && (
        <OperationDialog open={showNewClientModal} busy={submittingClient} titleId="client-create-title" onClose={() => { if (!submittingClient) setShowNewClientModal(false); }}>
          <div className="bg-white rounded-2xl w-full shadow-2xl border border-stone-200 p-4 sm:p-6">
            <h3 id="client-create-title" tabIndex={-1} className="text-base font-bold text-stone-950 mb-1">Registrar Nuevo cliente</h3>
            <p className="text-xs text-stone-500 mb-4">Ingresa los datos para registrar un perfil en el CRM.</p>
            {notification && <p role="status" className="mb-3 rounded-lg bg-stone-100 p-3 text-sm">{notification}</p>}

            <form onSubmit={handleCreateClient} className="space-y-3">
              <fieldset disabled={submittingClient} className="space-y-3">
              <div>
                <label htmlFor="client-create-name" className="block text-xs font-semibold text-stone-700 mb-1">Nombre Completo *</label>
                <input
                  id="client-create-name"
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label htmlFor="client-create-phone" className="block text-xs font-semibold text-stone-700 mb-1">Teléfono (10 dígitos) *</label>
                <input
                  id="client-create-phone"
                  type="tel"
                  required
                  value={newTelefono}
                  onChange={(e) => setNewTelefono(e.target.value)}
                  placeholder="Ej. 5512345678"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label htmlFor="client-create-email" className="block text-xs font-semibold text-stone-700 mb-1">Correo Electrónico (Opcional)</label>
                <input
                  id="client-create-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label htmlFor="client-create-notes" className="block text-xs font-semibold text-stone-700 mb-1">Notas de Estilo / Preferencias</label>
                <textarea
                  id="client-create-notes"
                  rows={2}
                  value={newNotas}
                  onChange={(e) => setNewNotas(e.target.value)}
                  placeholder="Corte con máquina 1 a los lados, tijera arriba..."
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-3 py-2 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingClient}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submittingClient ? 'Guardando...' : 'Crear Perfil'}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </OperationDialog>
      )}
    </div>
  );
};

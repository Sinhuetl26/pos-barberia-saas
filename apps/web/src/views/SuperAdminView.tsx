import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  DollarSign,
  Building,
  RefreshCw,
  Search,
  ShieldAlert,
  ArrowUpRight,
  Crown
} from 'lucide-react';

export const SuperAdminView: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [auditorias, setAuditorias] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'tenants' | 'auditorias'>('tenants');

  // Modal
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [actionType, setActionType] = useState<'status' | 'plan' | null>(null);
  const [newStatus, setNewStatus] = useState<string>('ACTIVO');
  const [newPlan, setNewPlan] = useState<string>('PRO');
  const [actionReason, setActionReason] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [m, t, a] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminTenants(),
        api.getAdminAuditorias()
      ]);
      setMetrics(m);
      setTenants(t);
      setAuditorias(a);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTenant) return;
    try {
      await api.updateTenantStatus(selectedTenant.id, newStatus, actionReason);
      setSelectedTenant(null);
      setActionType(null);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedTenant) return;
    try {
      await api.updateTenantPlan(selectedTenant.id, newPlan);
      setSelectedTenant(null);
      setActionType(null);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    t.emailContacto?.toLowerCase().includes(search.toLowerCase()) ||
    t.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-luxury-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Panel Super Admin — SYSTECH
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              PLATAFORMA GLOBAL
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Supervisión centralizada de barberías suscritas, ingreso recurrente mensual (MRR) y auditoría.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition self-start md:self-auto shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
          <span>Actualizar</span>
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          <div className="luxury-card rounded-2xl p-5">
            <span className="text-[10px] uppercase font-semibold text-stone-500 block mb-1">
              MRR (Ingreso Recurrente)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              ${metrics.mrr.toLocaleString('es-MX')} <span className="text-xs text-stone-500 font-normal">MXN/mes</span>
            </div>
            <div className="text-xs text-stone-500 mt-2 flex items-center gap-1.5 font-medium">
              <span className="text-emerald-700 font-bold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> ARR:
              </span>
              <span>${metrics.arr.toLocaleString('es-MX')} MXN/año</span>
            </div>
          </div>

          <div className="luxury-card rounded-2xl p-5">
            <span className="text-[10px] uppercase font-semibold text-stone-500 block mb-1">
              Barberías Suscritas
            </span>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {metrics.activeAccounts} <span className="text-xs text-stone-500 font-normal">de {metrics.totalAccounts} activas</span>
            </div>
            <div className="text-xs text-stone-500 mt-2 flex items-center gap-2 font-medium">
              <span className="text-stone-700 font-semibold">Churn: {metrics.churnRate}%</span>
              {metrics.atRiskAccounts > 0 && (
                <span className="text-amber-700 font-semibold">• {metrics.atRiskAccounts} en riesgo</span>
              )}
            </div>
          </div>

          <div className="luxury-card rounded-2xl p-5">
            <span className="text-[10px] uppercase font-semibold text-stone-500 block mb-1">
              Distribución de Planes
            </span>
            <div className="flex items-baseline gap-4 mt-1">
              <div>
                <span className="text-xl font-extrabold text-stone-900">{metrics.plansBreakdown.pro}</span>
                <span className="text-[10px] text-stone-500 block uppercase font-semibold">Plan Pro</span>
              </div>
              <div className="border-l border-stone-200 pl-4">
                <span className="text-xl font-extrabold text-stone-600">{metrics.plansBreakdown.basico}</span>
                <span className="text-[10px] text-stone-500 block uppercase font-semibold">Básico</span>
              </div>
            </div>
          </div>

          <div className="luxury-card rounded-2xl p-5">
            <span className="text-[10px] uppercase font-semibold text-stone-500 block mb-1">
              Volumen en Plataforma
            </span>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {metrics.platformVolume.totalBarberos} <span className="text-xs text-stone-500 font-normal">barberos</span>
            </div>
            <div className="text-xs text-stone-500 mt-2 flex items-center justify-between font-medium">
              <span>{metrics.platformVolume.totalCitas} citas</span>
              <span className="text-stone-900 font-bold">${metrics.platformVolume.totalVentasMonto.toLocaleString('es-MX')} POS</span>
            </div>
          </div>

        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-200 mb-4">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'tenants'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Cuentas Registradas ({tenants.length})
        </button>
        <button
          onClick={() => setActiveTab('auditorias')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'auditorias'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Bitácora de Auditoría ({auditorias.length})
        </button>
      </div>

      {activeTab === 'tenants' ? (
        <div className="space-y-4">
          <div className="luxury-card rounded-2xl p-3 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por barbería, slug o email..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="luxury-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4">Barbería</th>
                    <th className="py-2.5 px-4">Plan</th>
                    <th className="py-2.5 px-4">Estado</th>
                    <th className="py-2.5 px-4">Sucursales / Barberos</th>
                    <th className="py-2.5 px-4">Contacto</th>
                    <th className="py-2.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTenants.map(t => (
                    <tr key={t.id} className="hover:bg-stone-50/60">
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{t.nombre}</div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">/{t.slug}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-stone-900">{t.plan}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          t.estado === 'ACTIVO'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.estado === 'EN_RIESGO'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {t.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {t._count?.sucursales || 1} sucursales • {t._count?.barberos || 0} barberos
                      </td>
                      <td className="py-3 px-4 text-stone-500">{t.emailContacto || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTenant(t);
                              setActionType('status');
                              setNewStatus(t.estado);
                            }}
                            className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold transition"
                          >
                            Estado
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTenant(t);
                              setActionType('plan');
                              setNewPlan(t.plan);
                            }}
                            className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold transition"
                          >
                            Plan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="luxury-card rounded-2xl overflow-hidden">
          <div className="p-3.5 border-b border-stone-100 text-xs font-bold text-stone-900">
            Registro de Eventos y Auditoría Global
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4">Tenant / Barbería</th>
                  <th className="py-2.5 px-4">Acción</th>
                  <th className="py-2.5 px-4">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {auditorias.map(a => (
                  <tr key={a.id} className="hover:bg-stone-50/60">
                    <td className="py-2.5 px-4 text-stone-500 whitespace-nowrap">
                      {new Date(a.fecha).toLocaleString('es-MX')}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-stone-900">{a.tenant?.nombre || 'Global'}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[11px] font-semibold text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded">
                        {a.accion}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-stone-600 font-mono text-[11px]">{a.detalles || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Editar Estado o Plan */}
      {selectedTenant && actionType && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-luxury-in">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              {actionType === 'status' ? 'Modificar Estado' : 'Cambiar Plan'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">{selectedTenant.nombre}</p>

            {actionType === 'status' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Nuevo Estado</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  >
                    <option value="ACTIVO">ACTIVO (En operación regular)</option>
                    <option value="EN_RIESGO">EN_RIESGO (Falla de pago - Gracia 3 días)</option>
                    <option value="SUSPENDIDO">SUSPENDIDO (Bloqueo de acceso temporal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Motivo / Bitácora</label>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Ej. Notificación enviada por WhatsApp"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSelectedTenant(null);
                      setActionType(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateStatus}
                    className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                  >
                    Guardar Estado
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Plan</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  >
                    <option value="BASICO">Plan Básico ($499 MXN/mes)</option>
                    <option value="PRO">Plan Pro ($999 MXN/mes)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSelectedTenant(null);
                      setActionType(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdatePlan}
                    className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                  >
                    Actualizar Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

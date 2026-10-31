import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Sucursal, Barbero } from '../types';
import { OperationState } from '../components/OperationState';
import { ExpenseManagement } from '../components/ExpenseManagement';
import { OwnerIntelligence } from '../components/OwnerIntelligence';
import '../styles/report-operations.css';
import { hasLicenseCapability, LicensePlanCode } from '../utils/licenseCatalog';
import {
  CreditCard,
  Package,
  Award,
  TrendingUp,
  Users
} from 'lucide-react';

interface ReportesViewProps {
  currentSucursal: Sucursal | null;
  plan: LicensePlanCode;
  onNavigate?: (path: string) => void;
  onUpgrade?: () => void;
}

export const ReportesView: React.FC<ReportesViewProps> = ({ currentSucursal, plan, onNavigate, onUpgrade }) => {
  const [section, setSection] = useState<'sales' | 'intelligence' | 'expenses'>('sales');
  const [weeklySummary, setWeeklySummary] = useState('');
  const [data, setData] = useState<any>(null);
  const [periodo, setPeriodo] = useState<string>('mes');
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [selectedBarberoId, setSelectedBarberoId] = useState<string>('');
  const [sendingResumen, setSendingResumen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [barbersError, setBarbersError] = useState('');
  const [revision, setRevision] = useState(0);
  const queryKey = `${currentSucursal?.id || ''}:${periodo}:${selectedBarberoId}:${revision}`;
  const [resolvedQuery, setResolvedQuery] = useState('');

  useEffect(() => { setSelectedBarberoId(''); }, [currentSucursal?.id]);

  useEffect(() => {
    if (section !== 'sales') return;
    let active = true;
    setBarberos([]);
    setBarbersError('');
    api.getBarberos(currentSucursal?.id).then(result => { if (active) setBarberos(result); })
      .catch(() => { if (active) setBarbersError('No pudimos cargar el equipo. Puedes consultar el total o reintentar.'); });
    return () => { active = false; };
  }, [currentSucursal?.id, revision, section]);

  useEffect(() => {
    if (section !== 'sales') return;
    let active = true;
    setData(null);
    setError('');
    setLoading(true);
    api.getReportesDashboard(periodo, currentSucursal?.id, selectedBarberoId)
      .then(result => { if (active) { setData(result); setResolvedQuery(queryKey); } })
      .catch(() => { if (active) setError('No pudimos consultar las cifras. Reintenta para ver los datos del periodo seleccionado.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [periodo, currentSucursal?.id, selectedBarberoId, revision, section]);

  const handleExportCsv = async () => {
    try {
      await api.exportarVentasCsv({ periodo, sucursalId: currentSucursal?.id, barberoId: selectedBarberoId });
      setToastMessage('CSV descargado con los filtros visibles.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e: any) {
      alert(`Error al descargar CSV: ${e.message}`);
    }
  };

  const handleSendWeeklySummary = async () => {
    try {
      setSendingResumen(true);
      const res = await api.getResumenSemanal('WHATSAPP');
      setWeeklySummary(res.textoResumen || '');
      setToastMessage('Resumen preparado. No se ha enviado ningún mensaje.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e: any) {
      alert(`Error al generar resumen semanal: ${e.message}`);
    } finally {
      setSendingResumen(false);
    }
  };

  const advanced = hasLicenseCapability(plan, 'ADVANCED_REPORTS');
  const navigation = <div className="report-navigation" aria-label="Secciones de reportes">{(['sales', 'intelligence', 'expenses'] as const).map(value => { const locked = value !== 'sales' && !advanced; return <button type="button" key={value} className="studio-button-secondary" aria-pressed={section === value} onClick={() => locked ? onUpgrade?.() : setSection(value)}>{value === 'sales' ? 'Ventas y equipo' : value === 'intelligence' ? `Inteligencia${locked ? ' · Pro' : ''}` : `Gastos${locked ? ' · Pro' : ''}`}</button>; })}</div>;
  if (section !== 'sales') return <div className="studio-page operation-page reports-page"><h1 className="text-xl sm:text-2xl font-bold mb-2">Reportes · {currentSucursal?.nombre || 'Selecciona sucursal'}</h1>{navigation}{!currentSucursal ? <OperationState title="Selecciona una sucursal">Los gastos y el análisis detallado pertenecen a una sucursal concreta.</OperationState> : section === 'expenses' ? <ExpenseManagement key={currentSucursal.id} branchId={currentSucursal.id} zone={currentSucursal.zonaHoraria || 'America/Mexico_City'} onChanged={() => setRevision(value => value + 1)} /> : <OwnerIntelligence key={currentSucursal.id} branchId={currentSucursal.id} zone={currentSucursal.zonaHoraria || 'America/Mexico_City'} onNavigate={onNavigate} />}</div>;
  return (
    <div className="studio-page operation-page reports-page">
      {navigation}
      
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Ventas y rendimiento
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {currentSucursal?.nombre || 'Matriz'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Revisa ventas netas, comisiones y ausencias del periodo seleccionado.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar por barbero"
            value={selectedBarberoId}
            onChange={(e) => setSelectedBarberoId(e.target.value)}
            className="bg-white border border-stone-200 text-stone-900 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none shadow-xs"
          >
            <option value="">Todos los barberos</option>
            {barberos.map(b => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>

          <div className="flex bg-stone-100 border border-stone-200 rounded-xl p-1">
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: 'semana', label: '7 días' },
              { id: 'mes', label: 'Este Mes' },
              { id: 'ano', label: 'Este Año' }
            ].map(p => (
              <button
                key={p.id}
                aria-pressed={periodo === p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  periodo === p.id
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold border border-stone-200 rounded-xl shadow-xs transition"
            title="Descargar las ventas del periodo, sucursal y profesional seleccionados"
          >
            <span>Exportar esta vista</span>
          </button>

          <button
            onClick={handleSendWeeklySummary}
            disabled={sendingResumen}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
            title="Prepara el resumen para revisarlo; no envía mensajes"
          >
            <span>{sendingResumen ? 'Preparando…' : 'Preparar resumen semanal'}</span>
          </button>
        </div>
      </div>

      {weeklySummary && <label className="block mb-5 text-sm font-medium">Resumen preparado · envío manual<textarea readOnly value={weeklySummary} rows={8} className="studio-input mt-2 w-full" /></label>}
      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-stone-800 text-sm animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {barbersError && <div role="alert" className="operation-error"><p>{barbersError}</p><button className="studio-button-secondary" onClick={() => setRevision(n => n + 1)}>Reintentar</button></div>}
      {loading && <OperationState busy title="Consultando el periodo">Cargando ventas, comisiones y actividad del equipo.</OperationState>}
      {error && <div role="alert" className="operation-error"><p>{error}</p><button className="studio-button-secondary" onClick={() => setRevision(n => n + 1)}>Reintentar</button></div>}
      {!loading && !error && data && resolvedQuery === queryKey && (
        <div className="space-y-6">
          
          {/* Top KPI Cards */}
          <div className="reports-metrics">
            
            <div className="luxury-card reports-primary rounded-2xl p-5">
              <span className="text-[10px] uppercase font-semibold text-stone-500 block mb-1">
                Ventas Netas
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                ${data.totalVentas.toLocaleString('es-MX')} <span className="text-xs text-stone-500 font-normal">MXN</span>
              </div>
              <div className="text-xs text-stone-500 mt-2 flex items-center gap-2 font-medium">
                <span>{data.countVentas} transacciones</span>
                <span className="text-stone-300">•</span>
                <span>Prom: ${data.ticketPromedio}</span>
              </div>
            </div>

            <div className="luxury-card rounded-2xl p-5">
              <span className="text-[10px] uppercase font-semibold text-stone-500 block mb-1">
                Comisiones Devengadas
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                ${(data.comisiones.pagadas + data.comisiones.pendientes).toLocaleString('es-MX')}
              </div>
              <div className="text-xs text-stone-500 mt-2 flex flex-wrap items-center gap-1.5 font-medium">
                <span className="text-emerald-700 font-bold">${data.comisiones.pagadas} pagadas</span>
                <span className="text-stone-300">•</span>
                <span>${data.comisiones.pendientes} pendientes</span>
              </div>
            </div>

            <div className="luxury-card rounded-2xl p-5">
              <span className="text-[10px] uppercase font-semibold text-stone-500 block mb-1">
                Tasa de ausencias
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                {data.citas.noShowRate}%
              </div>
              <div className="text-xs text-stone-500 mt-2 font-medium">
                {data.citas.noShows} inasistencias registradas
              </div>
            </div>

            <div className="luxury-card rounded-2xl p-5">
              <span className="text-[10px] uppercase font-semibold text-stone-500 block mb-1">
                Propinas de Personal
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">
                ${data.totalPropinas.toLocaleString('es-MX')} <span className="text-xs text-stone-500 font-normal">MXN</span>
              </div>
              <div className="text-xs text-stone-500 mt-2 font-medium">
                Devengadas directamente a barberos
              </div>
            </div>

          </div>

          {/* Breakdown: Payment Methods & Top Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Payment Methods */}
            <div className="luxury-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-stone-700" /> Métodos de Pago
                </h3>
                <span className="text-[11px] text-stone-500 font-medium">Distribución de cobro</span>
              </div>

              <div className="space-y-3.5">
                {[
                  { label: 'Efectivo', key: 'EFECTIVO', color: 'bg-emerald-600' },
                  { label: 'Tarjeta de Crédito / Débito', key: 'TARJETA', color: 'bg-stone-900' },
                  { label: 'Transferencia (SPEI)', key: 'TRANSFERENCIA', color: 'bg-amber-600' },
                  { label: 'Pago Dividido / Mixto', key: 'MIXTO', color: 'bg-stone-500' }
                ].map(m => {
                  const val = data.metodosPago[m.key] || 0;
                  const pct = data.totalVentas > 0 ? ((val / data.totalVentas) * 100).toFixed(1) : '0';

                  return (
                    <div key={m.key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-600 font-medium">{m.label}</span>
                        <span className="text-stone-900 font-bold">${val.toLocaleString('es-MX')} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`${m.color} h-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Items */}
            <div className="luxury-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-stone-700" /> Servicios y productos con más ingresos
                </h3>
                <span className="text-[11px] text-stone-500 font-medium">Por ingresos</span>
              </div>

              <div className="space-y-2">
                {!data.topItems.length && <OperationState title="Sin ventas en este periodo">Prueba otro periodo o revisa el filtro del equipo.</OperationState>}
                {data.topItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] text-stone-600 font-mono font-bold">0{idx + 1}</span>
                      <div>
                        <div className="font-bold text-stone-900">{item.nombre}</div>
                        <span className="text-[10px] text-stone-500 uppercase font-medium">{item.tipo}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-stone-900">${item.total.toLocaleString('es-MX')}</div>
                      <div className="text-[10px] text-stone-500">{item.cantidad} u. vendidas</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Barber Leaderboard */}
          <div className="luxury-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-stone-700" /> Ventas y comisiones del equipo
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="operation-table w-full text-left text-xs text-stone-700">
                <caption className="sr-only">Ventas y comisiones por barbero para el periodo seleccionado</caption>
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4">Barbero</th>
                    <th className="py-2.5 px-4">Ventas registradas</th>
                    <th className="py-2.5 px-4">Ventas Netas</th>
                    <th className="py-2.5 px-4">Comisiones Ganadas</th>
                    <th className="py-2.5 px-4">Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {!data.barberosPerformance.length && <tr><td colSpan={5} className="py-6 px-4">Sin ventas del equipo para estos filtros.</td></tr>}
                  {data.barberosPerformance.map((b: any, idx: number) => {
                    const share = data.totalVentas > 0 ? ((b.total / data.totalVentas) * 100).toFixed(1) : '0';

                    return (
                      <tr key={b.id} className="hover:bg-stone-50/60">
                        <td className="py-2.5 px-4 font-bold text-stone-900 flex items-center gap-2">
                          <span className="text-[11px] text-stone-600 font-mono">0{idx + 1}</span>
                          <span>{b.nombre}</span>
                        </td>
                        <td className="py-2.5 px-4 text-stone-600">{b.ventas} ventas</td>
                        <td className="py-2.5 px-4 font-bold text-stone-900">${b.total.toLocaleString('es-MX')}</td>
                        <td className="py-2.5 px-4 font-extrabold text-stone-900">${b.comisiones.toLocaleString('es-MX')}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-stone-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-stone-900 h-full" style={{ width: `${share}%` }} />
                            </div>
                            <span className="text-[11px] text-stone-500 font-semibold">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

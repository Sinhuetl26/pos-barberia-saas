import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Sucursal, Barbero } from '../types';
import {
  CreditCard,
  Package,
  Award,
  TrendingUp,
  Users
} from 'lucide-react';

interface ReportesViewProps {
  currentSucursal: Sucursal | null;
}

export const ReportesView: React.FC<ReportesViewProps> = ({ currentSucursal }) => {
  const [data, setData] = useState<any>(null);
  const [periodo, setPeriodo] = useState<string>('mes');
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [selectedBarberoId, setSelectedBarberoId] = useState<string>('');
  const [sendingResumen, setSendingResumen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBarberos();
  }, [currentSucursal?.id]);

  useEffect(() => {
    loadReports();
  }, [periodo, currentSucursal?.id, selectedBarberoId]);

  const loadBarberos = async () => {
    try {
      const b = await api.getBarberos(currentSucursal?.id);
      setBarberos(b);
    } catch (e) {}
  };

  const loadReports = async () => {
    try {
      const res = await api.getReportesDashboard(periodo, currentSucursal?.id, selectedBarberoId);
      setData(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCsv = async () => {
    try {
      await api.exportarVentasCsv();
      setToastMessage('Reporte CSV descargado con éxito.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e: any) {
      alert(`Error al descargar CSV: ${e.message}`);
    }
  };

  const handleSendWeeklySummary = async () => {
    try {
      setSendingResumen(true);
      const res = await api.getResumenSemanal('WHATSAPP');
      setToastMessage(res.message || 'Resumen semanal enviado al WhatsApp del dueño.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e: any) {
      alert(`Error al generar resumen semanal: ${e.message}`);
    } finally {
      setSendingResumen(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-luxury-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Analítica Financiera & Operativa
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {currentSucursal?.nombre || 'Matriz'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Rendimiento neto de ventas, comisiones devengadas y tasa de inasistencia.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
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
            title="Exportar todas las ventas del tenant a archivo CSV"
          >
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleSendWeeklySummary}
            disabled={sendingResumen}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
            title="Genera el resumen analítico y lo envía al WhatsApp del dueño"
          >
            <span>{sendingResumen ? 'Enviando...' : 'Resumen Semanal WhatsApp'}</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-stone-800 text-sm animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="luxury-card rounded-2xl p-5">
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
              <div className="text-xs text-stone-500 mt-2 flex items-center gap-1.5 font-medium">
                <span className="text-emerald-700 font-bold">${data.comisiones.pagadas} pagadas</span>
                <span className="text-stone-300">•</span>
                <span>${data.comisiones.pendientes} pendientes</span>
              </div>
            </div>

            <div className="luxury-card rounded-2xl p-5">
              <span className="text-[10px] uppercase font-semibold text-stone-500 block mb-1">
                Tasa de "No-Shows"
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
                  <Package className="w-3.5 h-3.5 text-stone-700" /> Ítems con Mayor Rotación
                </h3>
                <span className="text-[11px] text-stone-500 font-medium">Por ingresos</span>
              </div>

              <div className="space-y-2">
                {data.topItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] text-stone-400 font-mono font-bold">0{idx + 1}</span>
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
                <Award className="w-3.5 h-3.5 text-stone-700" /> Desempeño del Personal (Leaderboard)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4">Barbero</th>
                    <th className="py-2.5 px-4">Servicios</th>
                    <th className="py-2.5 px-4">Ventas Netas</th>
                    <th className="py-2.5 px-4">Comisiones Ganadas</th>
                    <th className="py-2.5 px-4">Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.barberosPerformance.map((b: any, idx: number) => {
                    const share = data.totalVentas > 0 ? ((b.total / data.totalVentas) * 100).toFixed(1) : '0';

                    return (
                      <tr key={b.id} className="hover:bg-stone-50/60">
                        <td className="py-2.5 px-4 font-bold text-stone-900 flex items-center gap-2">
                          <span className="text-[11px] text-stone-400 font-mono">0{idx + 1}</span>
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

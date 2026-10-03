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
  AlertTriangle
} from 'lucide-react';

interface BarberosViewProps {
  currentSucursal: Sucursal | null;
  currentRole: string;
  plan: 'BASICO' | 'PRO';
  onNavigateToSubscription?: () => void;
}

export const BarberosView: React.FC<BarberosViewProps> = ({
  currentSucursal,
  plan,
  onNavigateToSubscription
}) => {
  const [activeTab, setActiveTab] = useState<'barberos' | 'cortes' | 'comisiones'>('barberos');
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [cortes, setCortes] = useState<CorteCaja[]>([]);
  const [totalPendiente, setTotalPendiente] = useState<number>(0);
  const [totalPagado, setTotalPagado] = useState<number>(0);

  const [filterBarberoId, setFilterBarberoId] = useState<string>('');

  // Modals
  const [showAddBarberoModal, setShowAddBarberoModal] = useState(false);
  const [showOpenCorteModal, setShowOpenCorteModal] = useState(false);
  const [showCloseCorteModal, setShowCloseCorteModal] = useState(false);
  const [activeCorte, setActiveCorte] = useState<CorteCaja | null>(null);

  // Forms
  const [nombreBarbero, setNombreBarbero] = useState('');
  const [telefonoBarbero, setTelefonoBarbero] = useState('');
  const [emailBarbero, setEmailBarbero] = useState('');
  const [comisionServicios, setComisionServicios] = useState<number>(50);
  const [comisionProductos, setComisionProductos] = useState<number>(10);
  const [diasDescanso, setDiasDescanso] = useState('Domingo');
  const [horarioInicio, setHorarioInicio] = useState('09:00');
  const [horarioFin, setHorarioFin] = useState('20:00');

  const [fondoInicial, setFondoInicial] = useState<number>(1000);
  const [notasApertura, setNotasApertura] = useState('Fondo inicial de turno');
  const [conteoEfectivoReal, setConteoEfectivoReal] = useState<number>(0);
  const [notasCierre, setNotasCierre] = useState('');

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
    } catch (e) {
      console.error(e);
    }
  };

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
        comisionServiciosPct: comisionServicios,
        comisionProductosPct: comisionProductos,
        diasDescanso,
        horarioInicio,
        horarioFin
      });

      setShowAddBarberoModal(false);
      setNombreBarbero('');
      setTelefonoBarbero('');
      setEmailBarbero('');
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

  const handleCloseCorte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCorte) return;
    try {
      const res = await api.cerrarCorteCaja(activeCorte.id, conteoEfectivoReal, notasCierre);
      alert(`Corte cerrado. ${res.resumen.descuadrado ? `Diferencia detectada: $${res.resumen.descuadre} MXN` : 'Caja perfectamente cuadrada.'}`);
      setShowCloseCorteModal(false);
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
      alert(`Se registraron ${selectedComisiones.length} comisiones como liquidadas.`);
      setSelectedComisiones([]);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredComisiones = comisiones.filter(c => {
    if (filterBarberoId && c.barberoId !== filterBarberoId) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-luxury-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Barberos, Comisiones & Caja
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {currentSucursal?.nombre || 'Matriz'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Gestión de equipo, porcentajes de comisión, cortes de caja y liquidación de nómina.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-stone-100 border border-stone-200 rounded-xl p-1 gap-1">
          {[
            { id: 'barberos', label: `Personal (${barberos.length})`, icon: Users },
            { id: 'cortes', label: 'Cortes de Caja', icon: Lock },
            { id: 'comisiones', label: 'Nómina', icon: DollarSign }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === t.id
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <t.icon className="w-3.5 h-3.5 text-stone-700" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. PERSONAL TAB */}
      {activeTab === 'barberos' && (
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
              <div key={b.id} className="luxury-card rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {b.nombre.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm">{b.nombre}</h3>
                        <p className="text-[11px] text-stone-500">{b.telefono || 'Sin teléfono'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Activo
                    </span>
                  </div>

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
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-500">Por liquidar:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    ${(b.comisionesPendientes || 0).toLocaleString('es-MX')} MXN
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. CORTES TAB */}
      {activeTab === 'cortes' && (
        <div className="space-y-6">
          {activeCorte ? (
            <div className="luxury-card rounded-2xl p-6 shadow-sm border border-stone-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-base font-bold text-stone-900">Turno de Caja en Operación</h3>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Fondo inicial: <strong>${Number(activeCorte.fondoInicial)} MXN</strong> • Abierto a las {new Date(activeCorte.fechaApertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <button
                  onClick={() => setShowCloseCorteModal(true)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm"
                >
                  Realizar Corte & Cerrar Turno
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-stone-100">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] uppercase font-semibold text-stone-500 block">Fondo Inicial</span>
                  <span className="text-base font-bold text-stone-900">${Number(activeCorte.fondoInicial)}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] uppercase font-semibold text-stone-500 block">Efectivo Ventas</span>
                  <span className="text-base font-bold text-emerald-700">${Number(activeCorte.totalEfectivo)}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] uppercase font-semibold text-stone-500 block">Tarjeta / SPEI</span>
                  <span className="text-base font-bold text-stone-900">
                    ${(Number(activeCorte.totalTarjeta) + Number(activeCorte.totalTransferencia))}
                  </span>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] uppercase font-semibold text-stone-500 block">Propinas</span>
                  <span className="text-base font-bold text-amber-800">${Number(activeCorte.totalPropinas)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="luxury-card rounded-2xl p-8 text-center space-y-3">
              <Unlock className="w-8 h-8 text-stone-400 mx-auto" />
              <h3 className="text-sm font-bold text-stone-900">Sin caja activa en este momento</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Abre un turno de caja con tu fondo inicial para comenzar los cobros de la jornada.
              </p>
              <button
                onClick={() => setShowOpenCorteModal(true)}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm"
              >
                Abrir Turno de Caja
              </button>
            </div>
          )}

          {/* History */}
          <div className="luxury-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-100 text-xs font-bold text-stone-900">
              Historial de Cortes Realizados
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4">Fecha Cierre</th>
                    <th className="py-2.5 px-4">Fondo</th>
                    <th className="py-2.5 px-4">Efectivo</th>
                    <th className="py-2.5 px-4">Total</th>
                    <th className="py-2.5 px-4">Conteo</th>
                    <th className="py-2.5 px-4">Descuadre</th>
                    <th className="py-2.5 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {cortes.map(c => (
                    <tr key={c.id} className="hover:bg-stone-50/60">
                      <td className="py-2.5 px-4 text-stone-500">
                        {c.fechaCierre ? new Date(c.fechaCierre).toLocaleString('es-MX') : 'En curso'}
                      </td>
                      <td className="py-2.5 px-4">${Number(c.fondoInicial)}</td>
                      <td className="py-2.5 px-4 text-emerald-700 font-semibold">${Number(c.totalEfectivo)}</td>
                      <td className="py-2.5 px-4 font-bold text-stone-900">${Number(c.totalVentas)}</td>
                      <td className="py-2.5 px-4 text-stone-800">
                        {c.conteoEfectivoReal !== null ? `$${Number(c.conteoEfectivoReal)}` : '—'}
                      </td>
                      <td className="py-2.5 px-4">
                        {c.descuadre !== null ? (
                          Math.abs(Number(c.descuadre)) < 0.01 ? (
                            <span className="text-emerald-700 font-semibold">Exacto ($0)</span>
                          ) : (
                            <span className="text-rose-600 font-bold">${Number(c.descuadre)}</span>
                          )
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          c.estado === 'ABIERTO' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {c.estado}
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

      {/* 3. COMISIONES TAB */}
      {activeTab === 'comisiones' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="luxury-card rounded-2xl p-4">
              <span className="text-[10px] uppercase font-semibold text-stone-500 block">Pendiente de Liquidar</span>
              <div className="text-2xl font-black text-stone-900 mt-1">
                ${totalPendiente.toLocaleString('es-MX')} <span className="text-xs font-normal text-stone-500">MXN</span>
              </div>
            </div>
            <div className="luxury-card rounded-2xl p-4">
              <span className="text-[10px] uppercase font-semibold text-stone-500 block">Comisiones Liquidadas</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                ${totalPagado.toLocaleString('es-MX')} <span className="text-xs font-normal text-stone-500">MXN</span>
              </div>
            </div>
            <div className="luxury-card rounded-2xl p-4 flex items-center justify-between">
              <button
                onClick={handlePagarComisiones}
                disabled={selectedComisiones.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-bold text-xs transition shadow-sm"
              >
                Pagar {selectedComisiones.length} Comisiones
              </button>
            </div>
          </div>

          <div className="luxury-card rounded-2xl overflow-hidden">
            <div className="p-3.5 border-b border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-600 font-medium">Selecciona comisiones para generar pago grupal</span>
              <select
                value={filterBarberoId}
                onChange={(e) => setFilterBarberoId(e.target.value)}
                className="bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
              >
                <option value="">Todos los barberos</option>
                {barberos.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4 w-10"></th>
                    <th className="py-2.5 px-4">Barbero</th>
                    <th className="py-2.5 px-4">Folio Venta</th>
                    <th className="py-2.5 px-4">Total Venta</th>
                    <th className="py-2.5 px-4">Comisión</th>
                    <th className="py-2.5 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredComisiones.map(c => (
                    <tr key={c.id} className="hover:bg-stone-50/60">
                      <td className="py-2.5 px-4">
                        {!c.pagada && (
                          <input
                            type="checkbox"
                            checked={selectedComisiones.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedComisiones([...selectedComisiones, c.id]);
                              else setSelectedComisiones(selectedComisiones.filter(id => id !== c.id));
                            }}
                            className="rounded border-stone-300 text-stone-900 focus:ring-0"
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-stone-900">{c.barbero?.nombre}</td>
                      <td className="py-2.5 px-4 text-stone-500 font-mono">{c.venta?.folio}</td>
                      <td className="py-2.5 px-4">${Number(c.venta?.total || 0)}</td>
                      <td className="py-2.5 px-4 font-extrabold text-stone-900">${Number(c.monto).toFixed(2)}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          c.pagada ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {c.pagada ? 'PAGADA' : 'PENDIENTE'}
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

      {/* Modal: Nuevo Barbero */}
      {showAddBarberoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-luxury-in">
            <h3 className="text-base font-bold text-stone-900 mb-1">Registrar Barbero</h3>
            <p className="text-xs text-stone-500 mb-4">Configura sus datos de contacto y porcentajes de comisión.</p>

            <form onSubmit={handleCreateBarbero} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={nombreBarbero}
                  onChange={(e) => setNombreBarbero(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white focus:border-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={telefonoBarbero}
                    onChange={(e) => setTelefonoBarbero(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Correo</label>
                  <input
                    type="email"
                    value={emailBarbero}
                    onChange={(e) => setEmailBarbero(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200/80">
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

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBarberoModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  Guardar Barbero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Abrir Corte */}
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

      {/* Modal: Cerrar Corte */}
      {showCloseCorteModal && activeCorte && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-luxury-in">
            <h3 className="text-base font-bold text-stone-900 mb-1">Cierre de Caja</h3>
            <p className="text-xs text-stone-500 mb-3">Conteo físico de efectivo en caja para arqueo ciego.</p>

            <form onSubmit={handleCloseCorte} className="space-y-3">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                <div className="flex justify-between text-stone-600">
                  <span>Fondo Inicial:</span>
                  <span className="font-semibold">${Number(activeCorte.fondoInicial)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Ventas Efectivo:</span>
                  <span>+${Number(activeCorte.totalEfectivo)}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-200">
                  <span>Esperado en Caja:</span>
                  <span>${(Number(activeCorte.fondoInicial) + Number(activeCorte.totalEfectivo))} MXN</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Efectivo Contado Real ($)</label>
                <input
                  type="number"
                  required
                  value={conteoEfectivoReal}
                  onChange={(e) => setConteoEfectivoReal(Number(e.target.value))}
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-bold focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseCorteModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  Cerrar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

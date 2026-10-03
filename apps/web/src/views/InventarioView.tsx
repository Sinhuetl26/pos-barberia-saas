import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Producto, Sucursal, KardexMovimiento } from '../types';
import {
  Plus,
  Search,
  AlertTriangle,
  Package,
  Layers
} from 'lucide-react';

interface InventarioViewProps {
  currentSucursal: Sucursal | null;
}

export const InventarioView: React.FC<InventarioViewProps> = ({ currentSucursal }) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [kardex, setKardex] = useState<KardexMovimiento[]>([]);
  const [tab, setTab] = useState<'catalogo' | 'kardex'>('catalogo');
  const [filterType, setFilterType] = useState<'ALL' | 'SERVICIO' | 'PRODUCTO' | 'BAJO_STOCK'>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<Producto | null>(null);

  // New Product Form
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'PRODUCTO' | 'SERVICIO'>('PRODUCTO');
  const [categoria, setCategoria] = useState('Styling');
  const [duracionMinutos, setDuracionMinutos] = useState(30);
  const [sku, setSku] = useState('');
  const [precioVenta, setPrecioVenta] = useState<number>(250);
  const [costo, setCosto] = useState<number>(100);
  const [stockActual, setStockActual] = useState<number>(10);
  const [stockMinimo, setStockMinimo] = useState<number>(4);

  // Movement Form
  const [movTipo, setMovTipo] = useState<'ENTRADA_COMPRA' | 'MERMA_DEVOLUCION' | 'AJUSTE_INVENTARIO'>('ENTRADA_COMPRA');
  const [movCantidad, setMovCantidad] = useState<number>(5);
  const [movMotivo, setMovMotivo] = useState('Compra a proveedor');

  useEffect(() => {
    loadData();
  }, [currentSucursal?.id]);

  const loadData = async () => {
    try {
      const [prods, kx] = await Promise.all([
        api.getProductos({ sucursalId: currentSucursal?.id }),
        api.getKardex()
      ]);
      setProductos(prods);
      setKardex(kx);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSucursal?.id) return;
    try {
      await api.createProducto({
        sucursalId: currentSucursal.id,
        nombre,
        tipo,
        categoria,
        duracionMinutos,
        sku,
        precioVenta,
        costo,
        stockActual,
        stockMinimo
      });

      setShowAddModal(false);
      setNombre('');
      setSku('');
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForMovement) return;
    try {
      await api.ajustarInventario(
        selectedProductForMovement.id,
        movTipo,
        movCantidad,
        movMotivo
      );
      setShowMovementModal(false);
      setSelectedProductForMovement(null);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const lowStockCount = productos.filter(p => p.tipo === 'PRODUCTO' && p.stockActual <= p.stockMinimo).length;

  const filteredProducts = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                          p.sku?.toLowerCase().includes(search.toLowerCase()) ||
                          p.categoria.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'SERVICIO') return p.tipo === 'SERVICIO';
    if (filterType === 'PRODUCTO') return p.tipo === 'PRODUCTO';
    if (filterType === 'BAJO_STOCK') return p.tipo === 'PRODUCTO' && p.stockActual <= p.stockMinimo;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-luxury-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Inventario & Kardex
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {currentSucursal?.nombre || 'Matriz'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Catálogo de venta, umbrales de stock mínimo y trazabilidad de movimientos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-stone-100 border border-stone-200 rounded-xl p-1">
            <button
              onClick={() => setTab('catalogo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === 'catalogo' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Catálogo ({productos.length})
            </button>
            <button
              onClick={() => setTab('kardex')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === 'kardex' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Kardex
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Ítem</span>
          </button>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-rose-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span><strong>Alerta:</strong> {lowStockCount} producto(s) en o por debajo del stock mínimo.</span>
          </div>
          <button onClick={() => setFilterType('BAJO_STOCK')} className="font-bold underline text-rose-800 hover:text-rose-950">
            Filtrar bajo stock →
          </button>
        </div>
      )}

      {tab === 'catalogo' && (
        <div className="space-y-4">
          <div className="luxury-card rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, SKU o categoría..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'SERVICIO', label: 'Servicios' },
                { id: 'PRODUCTO', label: 'Productos Físicos' },
                { id: 'BAJO_STOCK', label: `Bajo Stock (${lowStockCount})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    filterType === f.id ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="luxury-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4">Ítem / SKU</th>
                    <th className="py-2.5 px-4">Tipo</th>
                    <th className="py-2.5 px-4">Categoría</th>
                    <th className="py-2.5 px-4">Precio Venta</th>
                    <th className="py-2.5 px-4">Margen</th>
                    <th className="py-2.5 px-4">Stock</th>
                    <th className="py-2.5 px-4">Mínimo</th>
                    <th className="py-2.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProducts.map(p => {
                    const isService = p.tipo === 'SERVICIO';
                    const isLow = !isService && p.stockActual <= p.stockMinimo;
                    const margen = Number(p.precioVenta) > 0
                      ? (((Number(p.precioVenta) - Number(p.costo || 0)) / Number(p.precioVenta)) * 100).toFixed(0)
                      : '0';

                    return (
                      <tr key={p.id} className="hover:bg-stone-50/60">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900">{p.nombre}</div>
                          <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                            {p.sku || 'N/A'} {isService ? `• ${p.duracionMinutos}m` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                            isService ? 'bg-stone-100 text-stone-700' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {p.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-600">{p.categoria}</td>
                        <td className="py-3 px-4 font-bold text-stone-900">${Number(p.precioVenta)}</td>
                        <td className="py-3 px-4 text-stone-600 font-semibold">{margen}%</td>
                        <td className="py-3 px-4">
                          {isService ? (
                            <span className="text-stone-300 text-xs">—</span>
                          ) : (
                            <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-stone-900'}`}>
                              {p.stockActual}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-stone-500">{isService ? '—' : p.stockMinimo}</td>
                        <td className="py-3 px-4 text-right">
                          {!isService && (
                            <button
                              onClick={() => {
                                setSelectedProductForMovement(p);
                                setShowMovementModal(true);
                              }}
                              className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold transition"
                            >
                              Ajustar
                            </button>
                          )}
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

      {tab === 'kardex' && (
        <div className="luxury-card rounded-2xl overflow-hidden">
          <div className="p-3.5 border-b border-stone-100 text-xs font-bold text-stone-900">
            Movimientos Registrados en Kardex
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4">Producto</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4">Cantidad</th>
                  <th className="py-2.5 px-4">Stock Previo</th>
                  <th className="py-2.5 px-4">Nuevo Stock</th>
                  <th className="py-2.5 px-4">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {kardex.map(m => (
                  <tr key={m.id} className="hover:bg-stone-50/60">
                    <td className="py-2.5 px-4 text-stone-500 whitespace-nowrap">
                      {new Date(m.fecha).toLocaleString('es-MX')}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-stone-900">{m.producto?.nombre}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-stone-100 text-stone-700">
                        {m.tipoMovimiento}
                      </span>
                    </td>
                    <td className={`py-2.5 px-4 font-bold ${m.cantidad < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                    </td>
                    <td className="py-2.5 px-4 text-stone-500">{m.stockAnterior}</td>
                    <td className="py-2.5 px-4 font-bold text-stone-900">{m.stockNuevo}</td>
                    <td className="py-2.5 px-4 text-stone-600">{m.motivo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Ítem */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-luxury-in">
            <h3 className="text-base font-bold text-stone-900 mb-1">Agregar al Catálogo</h3>
            <p className="text-xs text-stone-500 mb-4">Servicio o producto para venta en mostrador.</p>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-lg border border-stone-200">
                <button
                  type="button"
                  onClick={() => setTipo('PRODUCTO')}
                  className={`py-1 rounded text-xs font-semibold transition ${
                    tipo === 'PRODUCTO' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                  }`}
                >
                  Producto Físico
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('SERVICIO')}
                  className={`py-1 rounded text-xs font-semibold transition ${
                    tipo === 'SERVICIO' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                  }`}
                >
                  Servicio
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">
                    {tipo === 'SERVICIO' ? 'Duración (m)' : 'SKU'}
                  </label>
                  {tipo === 'SERVICIO' ? (
                    <input
                      type="number"
                      value={duracionMinutos}
                      onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                    />
                  ) : (
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Precio Venta ($) *</label>
                  <input
                    type="number"
                    required
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-bold focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Costo ($)</label>
                  <input
                    type="number"
                    value={costo}
                    onChange={(e) => setCosto(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {tipo === 'PRODUCTO' && (
                <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Stock Inicial</label>
                    <input
                      type="number"
                      value={stockActual}
                      onChange={(e) => setStockActual(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-xs text-stone-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      value={stockMinimo}
                      onChange={(e) => setStockMinimo(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-xs text-stone-900 font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Movimiento Kardex */}
      {showMovementModal && selectedProductForMovement && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-luxury-in">
            <h3 className="text-base font-bold text-stone-900 mb-1">Ajuste de Stock</h3>
            <p className="text-xs text-stone-500 mb-3">
              {selectedProductForMovement.nombre} (Stock actual: {selectedProductForMovement.stockActual})
            </p>

            <form onSubmit={handleCreateMovement} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Tipo de Movimiento</label>
                <select
                  value={movTipo}
                  onChange={(e) => setMovTipo(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                >
                  <option value="ENTRADA_COMPRA">Entrada por compra (+)</option>
                  <option value="MERMA_DEVOLUCION">Merma / Dañado (-)</option>
                  <option value="AJUSTE_INVENTARIO">Ajuste manual directo</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Cantidad</label>
                <input
                  type="number"
                  required
                  value={movCantidad}
                  onChange={(e) => setMovCantidad(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-bold focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Motivo</label>
                <input
                  type="text"
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

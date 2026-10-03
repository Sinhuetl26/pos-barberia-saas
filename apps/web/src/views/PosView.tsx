import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Producto, Barbero, Sucursal, Cita } from '../types';
import {
  CreditCard,
  DollarSign,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  Printer,
  Share2,
  Receipt,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface PosViewProps {
  currentSucursal: Sucursal | null;
  activeCita?: Cita | null;
  onClearActiveCita?: () => void;
}

export const PosView: React.FC<PosViewProps> = ({
  currentSucursal,
  activeCita,
  onClearActiveCita
}) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);

  // Cart State
  const [cart, setCart] = useState<{ producto: Producto; cantidad: number; precioUnitario: number }[]>([]);
  const [selectedBarberoId, setSelectedBarberoId] = useState<string>('');
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [selectedClienteNombre, setSelectedClienteNombre] = useState<string>('Público General');
  const [descuento, setDescuento] = useState<number>(0);
  const [propinaPct, setPropinaPct] = useState<number>(0);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  // Checkout
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO'>('EFECTIVO');
  const [montoEfectivo, setMontoEfectivo] = useState<number>(0);
  const [splitEfectivo, setSplitEfectivo] = useState<number>(0);
  const [splitTarjeta, setSplitTarjeta] = useState<number>(0);

  // Receipt
  const [lastSale, setLastSale] = useState<any>(null);
  const [ticketData, setTicketData] = useState<any>(null);

  // Fase 3: Sales History & Returns
  const [showSalesHistoryModal, setShowSalesHistoryModal] = useState(false);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [saleToRefund, setSaleToRefund] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Fase 3: Cash Drawer Movement (Gastos Menores / Retiros)
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [movementTipo, setMovementTipo] = useState<'GASTO_MENOR' | 'RETIRO' | 'INGRESO_EXTRA'>('GASTO_MENOR');
  const [movementMonto, setMovementMonto] = useState<number>(50);
  const [movementConcepto, setMovementConcepto] = useState('');
  const [submittingMovement, setSubmittingMovement] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadSalesHistory = async () => {
    try {
      setLoadingSales(true);
      const data = await api.getVentas({ sucursalId: currentSucursal?.id });
      setSalesList(data);
    } catch (e: any) {
      showToast(e.message || 'Error al cargar ventas');
    } finally {
      setLoadingSales(false);
    }
  };

  const handleOpenRefund = (sale: any) => {
    setSaleToRefund(sale);
    setRefundReason('Devolución a solicitud del cliente');
  };

  const handleConfirmRefund = async () => {
    if (!saleToRefund || !refundReason.trim()) return;
    try {
      setSubmittingRefund(true);
      await api.cancelarVenta(saleToRefund.id, refundReason);
      showToast(`Venta ${saleToRefund.folio} cancelada exitosamente. Stock restituido.`);
      setSaleToRefund(null);
      loadSalesHistory();
      loadData(); // reload catalog stock
    } catch (e: any) {
      showToast(e.message || 'Error al cancelar venta');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleConfirmCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSucursal?.id || movementMonto <= 0 || !movementConcepto.trim()) return;
    try {
      setSubmittingMovement(true);
      await api.registrarMovimientoCaja({
        sucursalId: currentSucursal.id,
        tipo: movementTipo,
        monto: Number(movementMonto),
        concepto: movementConcepto
      });
      showToast(`Movimiento de caja (${movementTipo}) registrado correctamente.`);
      setShowCashMovementModal(false);
      setMovementConcepto('');
    } catch (e: any) {
      showToast(e.message || 'Error al registrar movimiento');
    } finally {
      setSubmittingMovement(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentSucursal?.id]);

  useEffect(() => {
    if (activeCita && productos.length > 0) {
      setSelectedBarberoId(activeCita.barberoId);
      if (activeCita.clienteId) {
        setSelectedClienteId(activeCita.clienteId);
      }
      if (activeCita.cliente) {
        setSelectedClienteNombre(activeCita.cliente.nombre);
      }
      if (activeCita.servicioId) {
        const serv = productos.find(p => p.id === activeCita.servicioId);
        if (serv) {
          setCart([{ producto: serv, cantidad: 1, precioUnitario: Number(serv.precioVenta) }]);
        }
      }
    }
  }, [activeCita, productos]);

  const loadData = async () => {
    try {
      const [prods, barbs, clis] = await Promise.all([
        api.getProductos({ sucursalId: currentSucursal?.id }),
        api.getBarberos(currentSucursal?.id),
        api.getClientes()
      ]);
      setProductos(prods);
      setBarberos(barbs);
      setClientes(clis || []);
      if (barbs.length > 0 && !selectedBarberoId) {
        setSelectedBarberoId(barbs[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = (producto: Producto) => {
    setCart(prev => {
      const existing = prev.find(item => item.producto.id === producto.id);
      if (existing) {
        return prev.map(item =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1, precioUnitario: Number(producto.precioVenta) }];
    });
  };

  const updateQuantity = (productoId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.producto.id === productoId) {
            const newQty = item.cantidad + delta;
            return newQty > 0 ? { ...item, cantidad: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { producto: Producto; cantidad: number; precioUnitario: number }[]
    );
  };

  const removeFromCart = (productoId: string) => {
    setCart(prev => prev.filter(item => item.producto.id !== productoId));
  };

  const clearCart = () => {
    setCart([]);
    setDescuento(0);
    setPropinaPct(0);
    if (onClearActiveCita) onClearActiveCita();
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
  const propinaCalculada = Math.round((subtotal * propinaPct) / 100);
  const total = Math.max(0, subtotal - descuento + propinaCalculada);
  const cambioEfectivo = montoEfectivo > total ? montoEfectivo - total : 0;

  const categories = ['Todos', ...Array.from(new Set(productos.map(p => p.categoria)))];

  const filteredProducts = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                          p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'Todos' || p.categoria === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenCheckout = () => {
    if (cart.length === 0) return alert('El carrito está vacío');
    if (!selectedBarberoId) return alert('Selecciona el barbero responsable');
    setMontoEfectivo(total);
    setSplitEfectivo(Math.round(total / 2));
    setSplitTarjeta(total - Math.round(total / 2));
    setShowPaymentModal(true);
  };

  const handleProcessSale = async () => {
    if (!currentSucursal?.id) return;

    if (metodoPago === 'EFECTIVO' && montoEfectivo < total) {
      alert(`El efectivo recibido ($${montoEfectivo}) no alcanza para cubrir el total ($${total})`);
      return;
    }
    if (metodoPago === 'MIXTO' && Math.abs(splitEfectivo + splitTarjeta - total) > 0.05) {
      alert(`En pago mixto, la suma de efectivo ($${splitEfectivo}) y tarjeta ($${splitTarjeta}) debe ser igual al total ($${total})`);
      return;
    }

    const idempotencyKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `pos-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const itemsPayload = cart.map(item => ({
        productoId: item.producto.id,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario
      }));

      const res = await api.createVenta({
        sucursalId: currentSucursal.id,
        barberoId: selectedBarberoId,
        clienteId: selectedClienteId || null,
        clienteNombre: selectedClienteNombre,
        items: itemsPayload,
        metodoPago,
        descuento,
        propina: propinaCalculada,
        efectivoRecibido: metodoPago === 'EFECTIVO' ? montoEfectivo : metodoPago === 'MIXTO' ? splitEfectivo : null,
        montoEfectivo: metodoPago === 'EFECTIVO' ? total : metodoPago === 'MIXTO' ? splitEfectivo : null,
        montoTarjeta: metodoPago === 'TARJETA' ? total : metodoPago === 'MIXTO' ? splitTarjeta : null,
        idempotencyKey,
        citaId: activeCita?.id || null
      });

      // P0.4 FIX: Confirm sale success immediately and clear cart
      setLastSale(res.venta);
      setShowPaymentModal(false);
      clearCart();
      loadData();

      // Attempt ticket preview without blocking sale completion
      try {
        const ticket = await api.getTicketVenta(res.venta.id);
        setTicketData(ticket);
      } catch (ticketErr) {
        console.warn('No se pudo cargar la vista previa del ticket automáticamente:', ticketErr);
        setTicketData({
          venta: res.venta,
          folio: res.venta.folio,
          items: res.venta.items || [],
          total: res.venta.total,
          whatsappUrl: null
        });
      }
    } catch (e: any) {
      alert(`Error al cobrar: ${e.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-luxury-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Terminal Punto de Venta (POS)
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {currentSucursal?.nombre || 'Matriz'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Cobro rápido en menos de 30 segundos, folios consecutivos de serie y ticket digital.
          </p>
        </div>

        {/* Phase 3 Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadSalesHistory();
              setShowSalesHistoryModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold border border-stone-200 shadow-sm transition"
          >
            <Receipt className="w-3.5 h-3.5 text-stone-600" />
            <span>Historial & Devoluciones</span>
          </button>

          <button
            onClick={() => setShowCashMovementModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Movimiento de Caja</span>
          </button>
        </div>
      </div>

      {/* Active Cita Notice */}
      {activeCita && (
        <div className="mb-6 bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Cobrando cita de <strong>{activeCita.cliente?.nombre || 'Cliente'}</strong> ({activeCita.nombreServicio})
            </span>
          </div>
          <button
            onClick={() => onClearActiveCita && onClearActiveCita()}
            className="text-amber-800 hover:text-amber-950 underline text-[11px] font-semibold"
          >
            Desvincular
          </button>
        </div>
      )}

      {/* Grid: Catalog (8) + Cart Drawer (4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Catalog */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* Search & Categories */}
          <div className="luxury-card rounded-2xl p-3.5 space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar servicio o producto físico..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    categoryFilter === cat
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(prod => {
              const isService = prod.tipo === 'SERVICIO';
              const isLowStock = !isService && prod.stockActual <= prod.stockMinimo;

              return (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="luxury-card rounded-2xl p-4 text-left flex flex-col justify-between transition group relative hover:border-stone-400"
                >
                  {isLowStock && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500" title={`Bajo stock: ${prod.stockActual}`} />
                  )}

                  <div>
                    <div className="text-[10px] font-semibold tracking-wider uppercase text-stone-400 mb-1">
                      {isService ? `${prod.duracionMinutos} min • ${prod.categoria}` : `Stock: ${prod.stockActual}`}
                    </div>

                    <h4 className="font-bold text-stone-900 text-xs leading-snug group-hover:text-black transition">
                      {prod.nombre}
                    </h4>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-stone-900">
                      ${Number(prod.precioVenta)}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 group-hover:bg-stone-900 group-hover:text-white transition">
                      + Agregar
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart Drawer */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="luxury-card rounded-2xl p-5 sticky top-24 flex flex-col h-[calc(100vh-120px)] shadow-sm">
            
            {/* Header */}
            <div className="pb-3 border-b border-stone-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-stone-900" /> Resumen de Cobro
                </span>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-[11px] text-stone-400 hover:text-rose-600 transition font-medium">
                    Vaciar
                  </button>
                )}
              </div>

              {/* Barber Selector */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-500 mb-1">
                  Barbero Responsable (Comisión)
                </label>
                <select
                  value={selectedBarberoId}
                  onChange={(e) => setSelectedBarberoId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-900 font-semibold focus:outline-none focus:bg-white"
                >
                  {barberos.map(b => (
                    <option key={b.id} value={b.id} className="text-stone-900">
                      {b.nombre} ({b.comisionServiciosPct}% serv / {b.comisionProductosPct}% prod)
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Selection (P1.7 FIX: Enlace real con Clientes CRM) */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-stone-500 mb-1">
                  Cliente CRM
                </label>
                <select
                  value={selectedClienteId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setSelectedClienteId(cid);
                    const found = clientes.find(c => c.id === cid);
                    setSelectedClienteNombre(found ? found.nombre : 'Público General');
                  }}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white mb-1.5"
                >
                  <option value="">Público General (Sin registrar)</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.telefono ? `(${c.telefono})` : ''}
                    </option>
                  ))}
                </select>
                {!selectedClienteId && (
                  <input
                    type="text"
                    value={selectedClienteNombre}
                    onChange={(e) => setSelectedClienteNombre(e.target.value)}
                    placeholder="Nombre del cliente mostrador"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1 text-xs text-stone-700 focus:outline-none focus:border-stone-900"
                  />
                )}
              </div>
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {cart.map(item => (
                <div
                  key={item.producto.id}
                  className="bg-stone-50/80 border border-stone-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-stone-900 text-xs truncate">{item.producto.nombre}</h5>
                    <span className="text-[10px] text-stone-500">${item.precioUnitario} c/u</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.producto.id, -1)}
                      className="w-5 h-5 rounded bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center text-xs"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs text-stone-900">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.producto.id, 1)}
                      className="w-5 h-5 rounded bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center text-xs"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.producto.id)}
                      className="w-5 h-5 text-stone-400 hover:text-rose-600 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-bold text-xs text-stone-900 text-right w-14">
                    ${item.precioUnitario * item.cantidad}
                  </span>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 text-xs">
                  <ShoppingCart className="w-6 h-6 text-stone-300 mb-2 stroke-[1.5]" />
                  <span>Selecciona servicios o productos del catálogo</span>
                </div>
              )}
            </div>

            {/* Calculations & Checkout */}
            <div className="pt-3 border-t border-stone-100 space-y-2.5">
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-stone-500 font-semibold block mb-0.5">Descuento ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={descuento}
                    onChange={(e) => setDescuento(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-500 font-semibold block mb-0.5">Propina (%)</label>
                  <div className="flex gap-1">
                    {[0, 10, 15, 20].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPropinaPct(pct)}
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold transition ${
                          propinaPct === pct
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${subtotal} MXN</span>
                </div>
                {descuento > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Descuento:</span>
                    <span>-${descuento} MXN</span>
                  </div>
                )}
                {propinaCalculada > 0 && (
                  <div className="flex justify-between text-amber-800 font-semibold">
                    <span>Propina:</span>
                    <span>+${propinaCalculada} MXN</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-stone-900 pt-1.5 border-t border-stone-200">
                  <span>Total:</span>
                  <span>${total} MXN</span>
                </div>
              </div>

              <button
                onClick={handleOpenCheckout}
                disabled={cart.length === 0}
                className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>Cobrar ${total} MXN</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-luxury-in">
            <h3 className="text-base font-bold text-stone-900 mb-1">Finalizar Cobro</h3>
            <p className="text-xs text-stone-500 mb-4">Selecciona el método de pago para registrar la venta.</p>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 mb-4 text-center">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 block">Total a Liquidar</span>
              <div className="text-3xl font-black text-stone-900 mt-0.5">
                ${total} <span className="text-xs font-normal text-stone-500">MXN</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { id: 'EFECTIVO', label: 'Efectivo', icon: DollarSign },
                { id: 'TARJETA', label: 'Tarjeta', icon: CreditCard },
                { id: 'TRANSFERENCIA', label: 'SPEI', icon: Receipt },
                { id: 'MIXTO', label: 'Dividido', icon: Plus }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMetodoPago(m.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                    metodoPago === m.id
                      ? 'bg-stone-900 text-white font-bold border-stone-900 shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <m.icon className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">{m.label}</span>
                </button>
              ))}
            </div>

            {metodoPago === 'EFECTIVO' && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 mb-4 space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Efectivo Recibido
                  </label>
                  <input
                    type="number"
                    value={montoEfectivo}
                    onChange={(e) => setMontoEfectivo(Number(e.target.value))}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm font-bold text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div className="flex gap-2">
                  {[total, 100, 200, 500, 1000].filter(n => n >= total).map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMontoEfectivo(amt)}
                      className="flex-1 py-1 rounded bg-white hover:bg-stone-100 border border-stone-200 text-[11px] font-bold text-stone-800"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                  <span className="text-xs text-stone-600 font-medium">Cambio a Entregar:</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    ${cambioEfectivo} MXN
                  </span>
                </div>
              </div>
            )}

            {metodoPago === 'MIXTO' && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 mb-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-stone-500 font-semibold block mb-0.5">Efectivo ($)</label>
                    <input
                      type="number"
                      value={splitEfectivo}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSplitEfectivo(val);
                        setSplitTarjeta(Math.max(0, total - val));
                      }}
                      className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-stone-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 font-semibold block mb-0.5">Tarjeta ($)</label>
                    <input
                      type="number"
                      value={splitTarjeta}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSplitTarjeta(val);
                        setSplitEfectivo(Math.max(0, total - val));
                      }}
                      className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-stone-900 font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Validation warning if insufficient payment */}
            {metodoPago === 'EFECTIVO' && montoEfectivo < total && (
              <p className="text-[11px] text-rose-600 font-semibold mb-3">
                ⚠️ El efectivo recibido (${montoEfectivo.toFixed(2)}) es menor al total a pagar (${total.toFixed(2)} MXN).
              </p>
            )}
            {metodoPago === 'MIXTO' && Math.abs(splitEfectivo + splitTarjeta - total) > 0.05 && (
              <p className="text-[11px] text-rose-600 font-semibold mb-3">
                ⚠️ La suma (${(splitEfectivo + splitTarjeta).toFixed(2)}) debe coincidir exactamente con el total (${total.toFixed(2)} MXN).
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleProcessSale}
                disabled={
                  (metodoPago === 'EFECTIVO' && montoEfectivo < total) ||
                  (metodoPago === 'MIXTO' && Math.abs(splitEfectivo + splitTarjeta - total) > 0.05)
                }
                className="px-5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition shadow-sm"
              >
                Confirmar Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Luxury Thermal Receipt */}
      {lastSale && ticketData && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-luxury-in">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs mb-3">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Venta Registrada Exitosamente</span>
            </div>

            {/* Minimalist receipt card */}
            <div
              id="thermal-receipt"
              className="bg-stone-50 text-stone-950 p-4 rounded-xl font-mono text-[11px] leading-tight border border-stone-200 shadow-xs mb-4 max-h-72 overflow-y-auto"
            >
              <div className="text-center font-bold text-xs tracking-wider mb-0.5">
                {(ticketData.venta?.tenant?.nombre || 'BARBERÍA').toUpperCase()}
              </div>
              <div className="text-center text-[9px] text-stone-500 mb-2">
                {ticketData.venta?.sucursal?.nombre || 'Sucursal'} • Tel: {ticketData.venta?.sucursal?.telefono || '5500000000'}
              </div>
              <div className="border-t border-dashed border-stone-300 my-1" />
              <div className="flex justify-between text-[10px] text-stone-600">
                <span>{ticketData.venta?.folio || lastSale.folio}</span>
                <span>{ticketData.venta?.fecha ? new Date(ticketData.venta.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </div>
              <div className="text-[10px] text-stone-600">Barbero: {ticketData.venta?.barbero?.nombre || 'Barbero'}</div>
              <div className="border-t border-dashed border-stone-300 my-1" />
              
              <div className="space-y-1 my-1.5">
                {(ticketData.venta?.items || []).map((i: any) => (
                  <div key={i.id} className="flex justify-between">
                    <span>{i.cantidad}x {i.nombreItem}</span>
                    <span className="font-bold">${Number(i.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-stone-300 my-1" />
              <div className="flex justify-between font-bold text-xs pt-0.5">
                <span>TOTAL:</span>
                <span>${Number(ticketData.venta?.total || lastSale.total).toFixed(2)} MXN</span>
              </div>
              <div className="text-[9px] text-stone-500 mt-1">Método: {ticketData.venta?.metodoPago || lastSale.metodoPago}</div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => api.printTicketHtml(lastSale.id, '58mm')}
                  className="py-2 px-2 rounded-lg bg-white hover:bg-stone-100 text-stone-800 text-[11px] font-semibold border border-stone-200 transition flex items-center justify-center gap-1 shadow-xs"
                  title="Imprimir ticket para impresora térmica de 58mm"
                >
                  <Printer className="w-3.5 h-3.5 text-stone-600" />
                  <span>58mm</span>
                </button>

                <button
                  type="button"
                  onClick={() => api.printTicketHtml(lastSale.id, '80mm')}
                  className="py-2 px-2 rounded-lg bg-white hover:bg-stone-100 text-stone-800 text-[11px] font-semibold border border-stone-200 transition flex items-center justify-center gap-1 shadow-xs"
                  title="Imprimir ticket para impresora térmica de 80mm"
                >
                  <Printer className="w-3.5 h-3.5 text-stone-600" />
                  <span>80mm</span>
                </button>

                {ticketData.whatsappUrl ? (
                  <a
                    href={ticketData.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition flex items-center justify-center gap-1 text-center shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(ticketData.whatsappText);
                      alert('Recibo copiado al portapapeles');
                    }}
                    className="py-2 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold transition flex items-center justify-center gap-1"
                  >
                    <span>Copiar</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setLastSale(null);
                  setTicketData(null);
                }}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fase 3: Sales History & Devoluciones Modal */}
      {showSalesHistoryModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h3 className="text-base font-bold text-stone-950 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-stone-700" />
                  Historial de Ventas & Devoluciones
                </h3>
                <p className="text-xs text-stone-500">
                  Folios consecutivos, trazabilidad y cancelación de ventas con reverso de inventario.
                </p>
              </div>
              <button
                onClick={() => setShowSalesHistoryModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {loadingSales ? (
                <div className="text-center py-12 text-xs text-stone-500">Cargando ventas...</div>
              ) : salesList.length === 0 ? (
                <div className="text-center py-12 text-xs text-stone-500">No hay ventas registradas en esta sucursal.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-[11px] font-semibold text-stone-500 uppercase border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-3">Folio Serie</th>
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Barbero</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {salesList.map((s) => (
                      <tr key={s.id} className="hover:bg-stone-50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-stone-900">
                          {s.folio}
                        </td>
                        <td className="py-3 px-3 text-stone-500 text-[11px]">
                          {new Date(s.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 px-3 text-stone-800 font-medium">
                          {s.clienteNombre || s.cliente?.nombre || 'Público General'}
                        </td>
                        <td className="py-3 px-3 text-stone-700">
                          {s.barbero?.nombre || 'General'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-stone-950">
                          ${Number(s.total).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.estado === 'CANCELADA'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {s.estado || 'COMPLETADA'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {s.estado !== 'CANCELADA' ? (
                            <button
                              onClick={() => handleOpenRefund(s)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition"
                            >
                              Cancelar / Devolver
                            </button>
                          ) : (
                            <span className="text-[10px] text-stone-400 italic">Cancelada</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fase 3: Refund Confirmation Modal */}
      {saleToRefund && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-stone-950 mb-1">
              Cancelar Venta y Devolución ({saleToRefund.folio})
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Esta acción revertirá los productos al stock del inventario, registrará el movimiento en Kardex y eliminará las comisiones generadas.
            </p>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Monto a reembolsar:</span>
                <span className="font-bold text-stone-950 font-mono">${Number(saleToRefund.total).toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Método de pago:</span>
                <span className="font-semibold text-stone-800">{saleToRefund.metodoPago}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Motivo de la Cancelación / Devolución *
              </label>
              <textarea
                rows={2}
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Ej. Producto defectuoso, error en cobro, cliente insatisfecho..."
                className="w-full bg-white border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaleToRefund(null)}
                className="px-3 py-2 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50"
              >
                Atrás
              </button>
              <button
                type="button"
                disabled={submittingRefund || !refundReason.trim()}
                onClick={handleConfirmRefund}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {submittingRefund ? 'Procesando...' : 'Confirmar Devolución'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fase 3: Movimiento de Caja Modal */}
      {showCashMovementModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-stone-950 mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Movimiento en Caja Registradora
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Registra retiros de efectivo, gastos menores o ingresos extra para mantener el arqueo ciego exacto.
            </p>

            <form onSubmit={handleConfirmCashMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Tipo de Movimiento</label>
                <select
                  value={movementTipo}
                  onChange={(e) => setMovementTipo(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-semibold focus:outline-none focus:bg-white"
                >
                  <option value="GASTO_MENOR">Gasto Menor (Ej. Garrafón agua, insumos café)</option>
                  <option value="RETIRO">Retiro de Efectivo / Corte parcial</option>
                  <option value="INGRESO_EXTRA">Ingreso Extra / Fondo de cambio adicional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Monto ($MXN) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  step="any"
                  value={movementMonto}
                  onChange={(e) => setMovementMonto(Number(e.target.value))}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Concepto / Motivo Detallado *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Compra de 2 garrafones de agua Epura"
                  value={movementConcepto}
                  onChange={(e) => setMovementConcepto(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCashMovementModal(false)}
                  className="px-3 py-2 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingMovement}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submittingMovement ? 'Guardando...' : 'Registrar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-stone-800 text-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

    </div>
  );
};

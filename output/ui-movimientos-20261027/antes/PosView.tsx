import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {useNetworkStatus} from '../components/ConnectionStatus';
import { OperationState } from '../components/OperationState';
import { OperationDialog } from '../components/OperationDialog';
import { SalesHistory } from '../components/SalesHistory';
import { DiscountApprovalRequest } from '../components/DiscountApprovalRequest';
import { api } from '../api';
import { refundPreview } from '../utils/refundPreview';
import { refundRecoveryState, refundFailure } from '../utils/refundRecovery';
import { serviceIllustration } from '../utils/serviceIllustration';
import { PendingSale, pendingSaleStorageKey, readPendingSale, savePendingSale, pendingSaleCanBeReleased } from '../utils/pendingSale';
import { Producto, Barbero, Sucursal, Cita } from '../types';
import { RebookingDraft } from '../types/rebooking';
import '../styles/studio-operation-design.css';
import '../styles/pos-silla.css';
import '../styles/pos-carbon.css';
import { SaleConfirmation } from '../components/SaleConfirmation';
import { SaleRecovery } from '../components/SaleRecovery';
import { CheckoutNavigationState, emptyCheckoutNavigation } from '../utils/checkoutNavigation';
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
  ChevronDown,
  Sparkles
} from 'lucide-react';

export function appointmentServices(cita: Cita): { id: string; nombre?: string; duracion?: number; precio?: number }[] {
  if (cita.serviciosJson) {
    const rows = JSON.parse(cita.serviciosJson);
    if (!Array.isArray(rows) || !rows.length || rows.length > 10 || rows.some(row => !row || typeof row.id !== 'string' || typeof row.nombre !== 'string' || !row.nombre.trim() || row.precio == null || typeof row.precio === 'boolean' || String(row.precio).trim() === '' || !Number.isFinite(Number(row.precio)) || Number(row.precio) < 0 || Math.abs(Number(row.precio) * 100 - Math.round(Number(row.precio) * 100)) > 0.00001 || !Number.isInteger(Number(row.duracion)) || Number(row.duracion) < 5 || Number(row.duracion) > 480) || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Los servicios guardados de esta cita requieren revisión. No se sustituyeron por precios actuales.');
    return rows.map(row => ({ id: row.id, nombre: row.nombre, duracion: Number(row.duracion), precio: Number(row.precio) }));
  }
  if (cita.servicioId && (cita.precioEstimado == null || typeof cita.precioEstimado === 'boolean' || String(cita.precioEstimado).trim() === '' || !Number.isFinite(Number(cita.precioEstimado)) || Number(cita.precioEstimado) < 0)) throw new Error('Esta cita antigua no tiene un precio reservado válido. Revisa su historial antes de cobrar; no usamos un precio actual como sustituto.');
  return cita.servicioId ? [{ id: cita.servicioId, nombre: cita.nombreServicio, duracion: cita.duracionMinutos, precio: Number(cita.precioEstimado) }] : [];
}

interface PosViewProps {
  currentSucursal: Sucursal | null;
  rol: string;
  activeCita?: Cita | null;
  onClearActiveCita?: () => void;
  onReturnToAppointment?: () => void;
  onRebook?: (draft: RebookingDraft) => void;
  onNavigationStateChange?: (state: CheckoutNavigationState) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  currentSucursal,
  rol,
  activeCita,
  onClearActiveCita,
  onReturnToAppointment,
  onRebook,
  onNavigationStateChange
}) => {
  const [searchParams] = useSearchParams();
  const searchProduct = searchParams.get('productoId');
  const productOpened = useRef('');
  const catalogBranch = useRef('');
  const canRefund = ['DUENO', 'GERENTE'].includes(rol);
  const online=useNetworkStatus();
  const [printError,setPrintError]=useState('');
  const [printing,setPrinting]=useState(false);
  const printingNow=useRef(false);
  async function printReceipt(id:string,width:string){if(printingNow.current)return;printingNow.current=true;setPrinting(true);setPrintError('');try{await api.printTicketHtml(id,width);}catch(e:any){setPrintError(e.message||'No pudimos abrir el ticket. La venta sigue guardada.');}finally{printingNow.current=false;setPrinting(false);}}
  const [productos, setProductos] = useState<Producto[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  // Cart State
  const [cart, setCart] = useState<{ producto: Producto; cantidad: number; precioUnitario: number }[]>([]);
  const appointmentPreloaded = useRef('');
  const [appointmentError, setAppointmentError] = useState('');
  const [showReturnToAppointment, setShowReturnToAppointment] = useState(false);
  const [selectedBarberoId, setSelectedBarberoId] = useState<string>('');
  const [professionalCatalog, setProfessionalCatalog] = useState<Producto[]>([]);
  const [priceStatus, setPriceStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [priceError, setPriceError] = useState('');
  const [priceRevision, setPriceRevision] = useState(0);
  const [discountPolicy, setDiscountPolicy] = useState<any>(null);
  const [discountReason, setDiscountReason] = useState('');
  const [discountApproval, setDiscountApproval] = useState<{ id: string; context: string } | null>(null);
  const [approvalLocked, setApprovalLocked] = useState(false);
  const priceRequest = useRef(0);
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [selectedClienteNombre, setSelectedClienteNombre] = useState<string>('Público General');
  const [descuento, setDescuento] = useState<number>(0);
  const [propinaPct, setPropinaPct] = useState<number>(0);
  const adjustmentSnapshot = useRef({ descuento: 0, propinaPct: 0, reason: '' });

  // Filters
  const [search, setSearch] = useState('');
  const [ticketExpanded, setTicketExpanded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [catalogKind, setCatalogKind] = useState<'SERVICIO' | 'PRODUCTO'>('SERVICIO');
  const catalogSearch = useRef<HTMLDetailsElement>(null);
  useEffect(() => { setCatalogKind(activeCita ? 'PRODUCTO' : 'SERVICIO'); }, [activeCita?.id]);
  useEffect(() => {
    const key = `${currentSucursal?.id || ''}:${searchProduct || ''}`;
    if (!searchProduct || catalogLoading || catalogBranch.current !== currentSucursal?.id || key === productOpened.current) return;
    const product = productos.find(p => p.id === searchProduct);
    if (product) { productOpened.current = key; setCatalogKind(product.tipo === 'SERVICIO' ? 'SERVICIO' : 'PRODUCTO'); setCategoryFilter('Todos'); setSearch(product.nombre); if (catalogSearch.current) catalogSearch.current.open = true; window.requestAnimationFrame(() => document.getElementById('pos-catalog-search')?.focus()); }
  }, [searchProduct, productos, catalogLoading, currentSucursal?.id]);

  // Checkout
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO'>('EFECTIVO');
  const [montoEfectivo, setMontoEfectivo] = useState<number>(0);
  const [splitEfectivo, setSplitEfectivo] = useState<number>(0);
  const [splitTarjeta, setSplitTarjeta] = useState<number>(0);
  const storageKey = pendingSaleStorageKey(api.getTenantId(), api.getUserId());
  const [pendingSale, setPendingSale] = useState<PendingSale | null>(() => {
    try { return readPendingSale(sessionStorage, storageKey); } catch { return null; }
  });
  const [checkoutError, setCheckoutError] = useState('');
  const [unreadablePending] = useState(() => {
    try { readPendingSale(sessionStorage, storageKey); return false; } catch { return true; }
  });
  const [processingSale, setProcessingSale] = useState(false);
  const submittingSale = useRef(false);
  const paymentDialog = useRef<HTMLDialogElement>(null);
  const hasDraft = cart.length > 0 || Boolean(activeCita);
  const uncertainCheckout = Boolean(pendingSale) || unreadablePending;
  useEffect(() => {
    onNavigationStateChange?.({ dirty: hasDraft, busy: processingSale, uncertain: uncertainCheckout });
    if (!hasDraft && !processingSale && !uncertainCheckout) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasDraft, processingSale, uncertainCheckout, onNavigationStateChange]);
  useEffect(() => () => onNavigationStateChange?.(emptyCheckoutNavigation), [onNavigationStateChange]);

  useEffect(() => {
    const request = ++priceRequest.current;
    setPriceStatus('loading'); setPriceError(''); setProfessionalCatalog([]);
    if (!currentSucursal?.id || !selectedBarberoId || catalogLoading || catalogBranch.current !== currentSucursal.id) return;
    let active = true;
    Promise.all([api.getProfessionalCatalog(currentSucursal.id, selectedBarberoId), api.getDiscountPolicy(currentSucursal.id)])
      .then(([catalog, policy]) => {
        if (!active || request !== priceRequest.current) return;
        setProfessionalCatalog(catalog); setDiscountPolicy(policy); setPriceStatus('ready');
        if (!pendingSale) setCart(old => old.map(item => {
          if (activeCita && item.producto.tipo === 'SERVICIO') return item;
          const quoted = catalog.find((p: Producto) => p.id === item.producto.id);
          return quoted ? { ...item, producto: quoted, precioUnitario: Number(quoted.precioVenta) } : item;
        }));
      }).catch((error: any) => { if (active && request === priceRequest.current) { setPriceStatus('error'); setPriceError(error.message || 'No pudimos confirmar los precios de este profesional.'); } });
    return () => { active = false; };
  }, [currentSucursal?.id, selectedBarberoId, catalogLoading, productos, activeCita?.id, priceRevision]);

  useEffect(() => {
    if (!showPaymentModal) return;
    const dialog = paymentDialog.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('#payment-dialog-title')?.focus();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [showPaymentModal]);

  const closePaymentDialog = () => {
    if (submittingSale.current || processingSale) return;
    setShowPaymentModal(false);
  };

  const keepPaymentFocus = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;
    const dialog = event.currentTarget;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]'))
      .filter(control => control.tabIndex >= 0 && !control.matches(':disabled') && control.getClientRects().length > 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) {
      event.preventDefault();
      dialog.querySelector<HTMLElement>('#payment-dialog-title')?.focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement?.id === 'payment-dialog-title')) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };

  // Receipt
  const [lastSale, setLastSale] = useState<any>(null);
  const [lastVisit, setLastVisit] = useState<RebookingDraft | null>(null);
  const [ticketData, setTicketData] = useState<any>(null);

  // Fase 3: Sales History & Returns
  const [showSalesHistoryModal, setShowSalesHistoryModal] = useState(false);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState('');
  const [saleToRefund, setSaleToRefund] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundRecovery, setRefundRecovery] = useState<'ready' | 'recover' | 'blocked'>('ready');
  const readRefundRecovery = (saleId: string) => {
    try { return refundRecoveryState(api.pendingFinancial(), saleId); } catch { return 'blocked' as const; }
  };
  useEffect(() => {
    if (!saleToRefund) return;
    const sync = (event?: Event) => {
      setRefundRecovery(readRefundRecovery(saleToRefund.id));
      const detail = (event as CustomEvent | undefined)?.detail;
      if (detail?.completed && refundRecoveryState({ path: detail.path }, saleToRefund.id) === 'recover') {
        setSaleToRefund(null);
        void loadSalesHistory();
        void loadData();
      }
    };
    sync();
    window.addEventListener('systech:financial', sync);
    return () => window.removeEventListener('systech:financial', sync);
  }, [saleToRefund?.id]);
  const refundBusy = useRef(false);
  const [refundQty, setRefundQty] = useState<Record<string, number>>({});
  const [refundTip, setRefundTip] = useState(0);
  const [refundSource, setRefundSource] = useState('CAJA');
  const [refundError, setRefundError] = useState('');
  const refundAmount = saleToRefund ? refundPreview(saleToRefund, refundQty, refundTip) : null;

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
      setSalesError('');
      const data = await api.getVentas({ sucursalId: currentSucursal?.id });
      setSalesList(data);
    } catch (e: any) {
      setSalesError('Reintenta la consulta antes de revisar o devolver una venta.');
    } finally {
      setLoadingSales(false);
    }
  };

  const handleOpenRefund = (sale: any) => {
    setRefundRecovery(readRefundRecovery(sale.id));
    setSaleToRefund(sale);
    setRefundQty({}); setRefundTip(0); setRefundSource('CAJA');
    setRefundError('');
    setRefundReason('Devolución a solicitud del cliente');
  };

  const handleConfirmRefund = async () => {
    if (!saleToRefund || !refundReason.trim() || refundBusy.current) return;
    refundBusy.current = true;
    try {
      setSubmittingRefund(true);
      const recovery = readRefundRecovery(saleToRefund.id);
      if (recovery === 'blocked') throw new Error('Hay otra operación pendiente. Comprueba su resultado desde el aviso superior.');
      if (recovery === 'recover') await api.recoverFinancial();
      else await api.returnSale(saleToRefund.id, { motivo: refundReason, items: Object.entries(refundQty).filter(([, cantidad]) => cantidad > 0).map(([itemId, cantidad]) => ({ itemId, cantidad })), propina: refundTip, origenEfectivo: refundSource });
      showToast(`Devolución registrada para ${saleToRefund.folio}. Historial y stock actualizados.`);
      setSaleToRefund(null);
    } catch (e: any) {
      setRefundRecovery(readRefundRecovery(saleToRefund.id));
      setRefundError(refundFailure(e));
    } finally {
      refundBusy.current = false;
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
    if (!activeCita) { appointmentPreloaded.current = ''; setAppointmentError(''); return; }
    if (activeCita.sucursalId !== currentSucursal?.id) { setAppointmentError('La cita pertenece a otra sucursal. Abre su sucursal antes de cobrar.'); return; }
    if (activeCita && !catalogLoading && appointmentPreloaded.current !== activeCita.id && !pendingSale) {
      setSelectedBarberoId(activeCita.barberoId);
      if (activeCita.clienteId) {
        setSelectedClienteId(activeCita.clienteId);
      }
      if (activeCita.cliente) {
        setSelectedClienteNombre(activeCita.cliente.nombre);
      }
      try {
        const snapshots = appointmentServices(activeCita);
        const rows = snapshots.map(snapshot => {
          const current = productos.find(p => p.id === snapshot.id && p.tipo === 'SERVICIO');
          if (!current) throw new Error(`El servicio reservado «${snapshot.nombre || snapshot.id}» no está disponible en el catálogo. El dueño debe revisar su activación antes de cobrar.`);
          const price = snapshot.precio === undefined ? Number(current.precioVenta) : snapshot.precio;
          return { producto: { ...current, nombre: snapshot.nombre || current.nombre, duracionMinutos: snapshot.duracion || current.duracionMinutos, precioVenta: price }, cantidad: 1, precioUnitario: price };
        });
        if (!rows.length) throw new Error('No encontramos los servicios originales de esta cita. Revisa su historial antes de cobrar.');
        setCart(rows); appointmentPreloaded.current = activeCita.id; setAppointmentError('');
      } catch (e: any) { setCart([]); setAppointmentError(e.message); }
    }
  }, [activeCita, productos, catalogLoading, currentSucursal?.id, pendingSale]);

  const loadData = async () => {
    setCatalogLoading(true);
    setCatalogError('');
    try {
      const [prods, barbs, clis] = await Promise.all([
        api.getProductos({ sucursalId: currentSucursal?.id }),
        api.getBarberos(currentSucursal?.id),
        api.getClientes()
      ]);
      setProductos(prods.filter(p => p.naturaleza !== 'INSUMO'));
      catalogBranch.current = currentSucursal?.id || '';
      setBarberos(barbs);
      setClientes(clis || []);
      if (barbs.length > 0 && !selectedBarberoId) {
        setSelectedBarberoId(barbs[0].id);
      }
    } catch (e: any) {
      setCatalogError(e.message || 'No pudimos consultar el catálogo de esta sucursal.');
    } finally { setCatalogLoading(false); }
  };

  const addToCart = (producto: Producto) => {
    if (activeCita && producto.tipo === 'SERVICIO') { showToast('La cita conserva sus servicios reservados. Puedes añadir productos físicos al mismo ticket.'); return; }
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
    if (activeCita && cart.some(item => item.producto.id === productoId && item.producto.tipo === 'SERVICIO')) return;
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
    if (activeCita && cart.some(item => item.producto.id === productoId && item.producto.tipo === 'SERVICIO')) return;
    setCart(prev => prev.filter(item => item.producto.id !== productoId));
  };

  const clearCart = () => {
    adjustmentSnapshot.current = { descuento: 0, propinaPct: 0, reason: '' };
    setCart([]);
    setDescuento(0);
    setPropinaPct(0);
    setDiscountReason('');
    if (onClearActiveCita) onClearActiveCita();
  };

  // Calculations
  const subtotalCents = cart.reduce((acc, item) => acc + Math.round(item.precioUnitario * 100) * item.cantidad, 0);
  const subtotal = subtotalCents / 100;
  const propinaCalculada = Math.round((subtotalCents * propinaPct) / 100) / 100;
  const total = Math.max(0, subtotalCents - Math.min(subtotalCents, Math.round(descuento * 100)) + Math.round(propinaCalculada * 100)) / 100;
  const cambioEfectivo = montoEfectivo > total ? montoEfectivo - total : 0;
  const discountLimit = discountPolicy?.activa ? Number(discountPolicy.limitesPorRol?.[rol] ?? 0) : rol === 'BARBERO' ? 20 : 100;
  const needsDiscountApproval = descuento > 0 && Math.min(subtotalCents, Math.round(descuento * 100)) * 10000 > subtotalCents * Math.round(discountLimit * 100);
  const approvalCart = { sucursalId: currentSucursal?.id || '', barberoId: selectedBarberoId, clienteId: selectedClienteId || null,
    citaId: activeCita?.id || null, items: cart.map(item => ({ productoId: item.producto.id, cantidad: item.cantidad })),
    metodoPago, descuento, propina: propinaCalculada, totalConfirmado: total, motivoDescuento: discountReason.trim() || null };
  const approvalContext = JSON.stringify({ cart: approvalCart, reason: discountReason.trim() });
  const approvalValid = discountApproval?.context === approvalContext;

  const categories = ['Todos', ...Array.from(new Set(productos.map(p => p.categoria)))];

  const filteredProducts = (priceStatus === 'ready' ? professionalCatalog : productos).filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                          p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'Todos' || p.categoria === categoryFilter;
    return matchesSearch && matchesCat && (catalogKind === 'SERVICIO' ? p.tipo === 'SERVICIO' : p.tipo !== 'SERVICIO');
  });

  const handleOpenCheckout = () => {
    if (priceStatus !== 'ready') return showToast('Confirma los precios del profesional antes de cobrar.');
    if (appointmentError) return showToast(appointmentError);
    if (pendingSale) return;
    if (cart.length === 0) return alert('El carrito está vacío');
    if (!selectedBarberoId) return alert('Selecciona el barbero responsable');
    setMontoEfectivo(total);
    setSplitEfectivo(Math.round(total / 2));
    setSplitTarjeta(total - Math.round(total / 2));
    setShowPaymentModal(true);
  };

  const handleProcessSale = async () => {
    if (!currentSucursal?.id || submittingSale.current) return;
    if (priceStatus !== 'ready') { setCheckoutError('Vuelve a confirmar los precios antes de preparar otro cobro.'); return; }
    if (needsDiscountApproval && !approvalValid) { setCheckoutError('Comprueba la autorización de este descuento antes de cobrar.'); return; }
    if (descuento > 0 && discountPolicy?.activa && discountPolicy.motivoObligatorio && discountReason.trim().length < 3) { setCheckoutError('Explica el motivo del descuento antes de cobrar.'); return; }

    if (metodoPago === 'EFECTIVO' && montoEfectivo < total) {
      alert(`El efectivo recibido ($${montoEfectivo}) no alcanza para cubrir el total ($${total})`);
      return;
    }
    if (metodoPago === 'MIXTO' && Math.round(splitEfectivo * 100) + Math.round(splitTarjeta * 100) !== Math.round(total * 100)) {
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

      const payload = {
        sucursalId: currentSucursal.id,
        barberoId: selectedBarberoId,
        clienteId: selectedClienteId || null,
        clienteNombre: selectedClienteNombre,
        items: itemsPayload,
        metodoPago,
        descuento,
        motivoDescuento: discountReason.trim() || null,
        aprobacionDescuentoId: needsDiscountApproval && approvalValid ? discountApproval!.id : null,
        totalConfirmado: total,
        propina: propinaCalculada,
        efectivoRecibido: metodoPago === 'EFECTIVO' ? montoEfectivo : metodoPago === 'MIXTO' ? splitEfectivo : null,
        montoEfectivo: metodoPago === 'EFECTIVO' ? total : metodoPago === 'MIXTO' ? splitEfectivo : null,
        montoTarjeta: metodoPago === 'TARJETA' ? total : metodoPago === 'MIXTO' ? splitTarjeta : null,
        idempotencyKey,
        citaId: activeCita?.id || null
      };
      const intention = { key: idempotencyKey, payload, storageKey, total };
      savePendingSale(sessionStorage, intention);
      setPendingSale(intention);
      await submitIntention(intention);
    } catch (e: any) {
      setCheckoutError(e.message || 'No se pudo preparar el cobro.');
    }
  };

  const submitIntention = async (intention: PendingSale) => {
    if (submittingSale.current) return;
    submittingSale.current = true;
    setProcessingSale(true);
    setCheckoutError('');
    try {
      let res;
      try { res = await api.getSaleIntention(intention.key); }
      catch (error: any) {
        if (error.status !== 404 || error.code !== 'SALE_INTENTION_NOT_FOUND') throw error;
        res = await api.createVenta(intention.payload);
      }
      sessionStorage.removeItem(intention.storageKey);
      setPendingSale(null);

      // P0.4 FIX: Confirm sale success immediately and clear cart
      setLastSale(res.venta);
      const soldService = intention.payload.items.find((item: any) => productos.some(p => p.id === item.productoId && p.tipo === 'SERVICIO'));
      const customer = clientes.find(c => c.id === intention.payload.clienteId);
      const sameAppointment = activeCita && intention.payload.citaId === activeCita.id;
      setLastVisit(soldService ? { tenantId: api.getTenantId() || '', sucursalId: intention.payload.sucursalId, clienteNombre: intention.payload.clienteNombre || customer?.nombre || '', clienteTelefono: customer?.telefono || (sameAppointment ? activeCita.cliente?.telefono : '') || '', barberoId: intention.payload.barberoId, servicioId: soldService.productoId, tipoCorte: sameAppointment ? activeCita.tipoCorte || '' : '' } : null);
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
      if (pendingSaleCanBeReleased(e)) {
        sessionStorage.removeItem(intention.storageKey);
        setPendingSale(null);
        if (e.code === 'PRICE_CONFIRMATION_REQUIRED') { setPriceRevision(v => v + 1); setShowPaymentModal(false); }
        if (['DISCOUNT_APPROVAL_INVALID', 'APPROVAL_CART_CHANGED', 'APPROVER_UNAVAILABLE'].includes(e.code)) setDiscountApproval(null);
        setCheckoutError(e.message || 'El cobro fue rechazado.');
      } else {
        setCheckoutError('No se confirmó el resultado. Reintenta este mismo cobro para recuperar su ticket sin registrarlo dos veces.');
      }
    } finally {
      submittingSale.current = false;
      setProcessingSale(false);
    }
  };

  if (unreadablePending) return <p role="alert" className="m-6 p-6 bg-amber-50 text-amber-900 rounded-xl">No podemos leer el cobro pendiente de esta sesión. Revisa el historial de ventas con el propietario antes de iniciar otro cobro.</p>;
  if (pendingSale && !showPaymentModal) return <SaleRecovery
    total={pendingSale.total}
    quantity={pendingSale.payload.items.reduce((sum: number, item: any) => sum + item.cantidad, 0)}
    method={pendingSale.payload.metodoPago}
    busy={processingSale}
    error={checkoutError}
    onRecover={() => { void submitIntention(pendingSale); }}
  />;

  return (
    <div className="operation-page operation-pos counter-studio pos-silla pos-carbon max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      {checkoutError && <p role="alert" className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-900 text-sm">{checkoutError}</p>}
      {/* Active Cita Notice */}
      <OperationDialog open={showReturnToAppointment} busy={processingSale} titleId="return-appointment-title" onClose={() => setShowReturnToAppointment(false)}>
        <div className="rounded-xl bg-white p-6"><h2 id="return-appointment-title" tabIndex={-1} className="text-xl font-semibold">Volver a la cita</h2><p className="mt-3 text-sm text-stone-600">Se descartará este ticket sin cobrar, incluidos los productos añadidos, descuentos y propina. La cita seguirá guardada.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" className="studio-button-secondary" onClick={() => setShowReturnToAppointment(false)}>Seguir en el cobro</button><button type="button" className="studio-button" disabled={processingSale || Boolean(pendingSale)} onClick={() => { setShowReturnToAppointment(false); clearCart(); onReturnToAppointment?.(); }}>Descartar ticket y volver</button></div></div>
      </OperationDialog>
      {activeCita && <section className="appointment-checkout-context" aria-label="Reserva de este ticket"><div><span>Ticket de reserva</span><strong>{activeCita.cliente?.nombre || 'Cliente'}</strong><p>{activeCita.nombreServicio} · {activeCita.barbero?.nombre || 'Profesional de la reserva'}</p><p>{currentSucursal?.nombre}</p></div>{onReturnToAppointment && <button type="button" className="studio-button-secondary" disabled={processingSale || Boolean(pendingSale) || approvalLocked || activeCita.sucursalId !== currentSucursal?.id} onClick={() => setShowReturnToAppointment(true)}>Volver a la cita en Agenda</button>}</section>}

      {appointmentError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{appointmentError}</p>}
      {activeCita && !appointmentError && <p className="mb-4 text-sm text-stone-600">Los servicios de la cita conservan su precio reservado y una unidad por servicio. Puedes añadir productos físicos; para cambiar la atención, revisa primero la cita.</p>}

      {/* Grid: Catalog (8) + Cart Drawer (4) */}
      <div className="counter-workbench grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Catalog */}
        <div className="counter-catalog lg:col-span-7 xl:col-span-8 space-y-4">

      <div className="counter-masthead flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Cobrar
            </h1>

          </div>

        </div>

        {/* Phase 3 Action Buttons */}
        <details className="silla-counter-actions"><summary>Más opciones</summary><div className="silla-counter-actions-menu">
          <button
            type="button"
            aria-label={canRefund ? 'Ventas y devoluciones' : 'Historial de ventas'}
            onClick={() => {
              loadSalesHistory();
              setShowSalesHistoryModal(true);
            }}
            className="counter-history-action"
          >
            <Receipt className="w-3.5 h-3.5 text-stone-600" />
            <span>{canRefund ? 'Ventas y devoluciones' : 'Historial de ventas'}</span>
          </button>

          {rol !== 'BARBERO' && <button
            type="button" aria-label="Movimiento de caja"
            onClick={() => setShowCashMovementModal(true)}
            className="counter-movement-action"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Movimiento de caja</span>
          </button>}
        </div></details>
      </div>


          {/* Search & Categories */}
          <div className="silla-catalog-tools">
            <label className="carbon-search" htmlFor="pos-catalog-search"><Search size={20} aria-hidden="true" /><span className="sr-only">Buscar en el catálogo</span><input id="pos-catalog-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar servicio o producto" /></label>
            <details ref={catalogSearch} className="silla-search">
              <summary>Filtros<ChevronDown size={16} aria-hidden="true" />{categoryFilter !== 'Todos' && <span className="silla-search-mark" />}</summary>
              <div className="silla-search-panel">
                <label htmlFor="pos-category">Categoría</label>
                <select id="pos-category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="studio-input">
                  {categories.map(cat => <option key={cat}>{cat}</option>)}
                </select>
                {(search || categoryFilter !== 'Todos') && <button type="button" onClick={() => { setSearch(''); setCategoryFilter('Todos'); }}>Limpiar filtros</button>}
              </div>
            </details>
            <div className="silla-kind" role="group" aria-label="Tipo de artículo">
              <button type="button" aria-pressed={catalogKind === 'SERVICIO'} onClick={() => { setCatalogKind('SERVICIO'); setCategoryFilter('Todos'); setSearch(''); }}>Servicios</button>
              <button type="button" aria-pressed={catalogKind === 'PRODUCTO'} onClick={() => { setCatalogKind('PRODUCTO'); setCategoryFilter('Todos'); setSearch(''); }}>Productos</button>
            </div>
          </div>

          {/* Cards */}
          {catalogError && <div role="alert" className="operation-error"><div><p className="font-semibold">Catálogo no actualizado</p><p>{catalogError}</p></div><button onClick={loadData} className="studio-button-secondary">Reintentar</button></div>}
          {priceStatus === 'loading' && !catalogLoading && <p role="status" className="my-3 text-sm text-stone-600">Confirmando precios del profesional…</p>}
          {priceError && <div role="alert" className="operation-error"><p>{priceError}</p><button className="studio-button-secondary" onClick={() => setPriceRevision(v => v + 1)}>Confirmar precios de nuevo</button></div>}
          {catalogLoading && productos.length === 0 && <OperationState busy title="Consultando catálogo">Cargando servicios y productos de esta sucursal.</OperationState>}
          {!catalogLoading && !catalogError && filteredProducts.length === 0 && <OperationState title={search || categoryFilter !== 'Todos' ? 'No hay coincidencias' : activeCita && catalogKind === 'PRODUCTO' ? 'El servicio ya está en tu ticket' : catalogKind === 'SERVICIO' ? 'Sin servicios disponibles' : 'Sin productos disponibles'} action={activeCita && catalogKind === 'PRODUCTO' && !search && categoryFilter === 'Todos' ? undefined : <button onClick={loadData} className="studio-button-secondary">Actualizar catálogo</button>}>{search || categoryFilter !== 'Todos' ? 'Revisa la búsqueda o elige otra categoría.' : activeCita && catalogKind === 'PRODUCTO' ? 'No hay productos adicionales. Puedes continuar al cobro.' : ['DUENO', 'GERENTE'].includes(rol) ? 'Revisa los artículos publicados en Inventario.' : 'Pide al dueño que revise el catálogo de esta sucursal.'}</OperationState>}
          {(['SERVICIO', 'PRODUCTO'] as const).map(kind => {
            const sectionProducts = filteredProducts.filter(prod => kind === 'SERVICIO' ? prod.tipo === 'SERVICIO' : prod.tipo !== 'SERVICIO');
            if (!sectionProducts.length) return null;
            if (kind === 'SERVICIO' && activeCita) return <p key={kind} className="text-sm text-stone-600">Los servicios de esta visita ya están en el ticket con su precio reservado. Puedes añadir productos para llevar.</p>;
            return <section key={kind} className={`counter-shelf ${kind === 'SERVICIO' ? 'counter-services' : 'counter-retail'}`} aria-label={kind === 'SERVICIO' ? 'Servicios para cobrar' : 'Productos para vender'}>

              <div className="counter-shelf-grid">
            {sectionProducts.map(prod => {
              const isService = prod.tipo === 'SERVICIO';
              const isLowStock = !isService && prod.stockActual <= prod.stockMinimo;
              const quantity = cart.find(item => item.producto.id === prod.id)?.cantidad || 0;
              const illustration = isService ? serviceIllustration(prod.nombre) : null;

              return (
                <button
                  key={prod.id}
                  disabled={priceStatus !== 'ready'}
                  aria-label={`Agregar ${prod.nombre}, $${Number(prod.precioVenta).toFixed(2)} MXN${isLowStock ? `, existencias bajas: ${prod.stockActual}` : ''}`}
                  onClick={() => addToCart(prod)}
                  className={`operation-product counter-product ${isService ? 'is-service' : 'is-retail'} ${quantity ? 'is-selected' : ''} ${illustration ? 'has-illustration' : ''} group relative`}
                >
                  {illustration && <img className="silla-service-photo" src={illustration} alt="" loading="lazy" width="600" height="400" />}
                  {quantity > 0 && <span className="silla-selected-count" aria-label={`${quantity} en el ticket`}>{quantity}</span>}
                  {isLowStock && (
                    <span className="counter-stock-warning">Quedan {prod.stockActual}</span>
                  )}

                  <div className="silla-product-name">
                    <div className="counter-product-meta text-xs text-stone-500 mb-2">
                      {isService ? `${prod.duracionMinutos} min` : `${prod.stockActual} disponibles`}
                    </div>

                    <h4 className="font-bold text-stone-900 text-xs leading-snug group-hover:text-black transition">
                      {prod.nombre}
                    </h4>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-stone-900">
                      ${Number(prod.precioVenta).toFixed(2)}
                    </span>
                    <span className="counter-add" aria-hidden="true">
                      <Plus size={18} />
                    </span>
                  </div>
                </button>
              );
            })}
              </div>
            </section>;
          })}
        </div>

        {/* Cart Drawer */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div id="pos-cart" tabIndex={-1} className={`operation-cart counter-ticket scroll-mt-24 ${ticketExpanded ? 'is-expanded' : ''}`}>

            <div className="pos-cart-body">

            {/* Header */}
            <div className="pos-cart-context pb-3 border-b border-stone-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-stone-700 flex items-center gap-2">
                  Ticket
                </h2>
                <button type="button" className="carbon-ticket-toggle" aria-expanded={ticketExpanded} aria-controls="carbon-ticket-items" onClick={() => setTicketExpanded(value => !value)}>{ticketExpanded ? 'Ocultar detalle' : 'Ver detalle'}</button>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-[11px] text-stone-400 hover:text-rose-600 transition font-medium">
                    Vaciar
                  </button>
                )}
              </div>

              {/* Barber Selector */}
              <details className="pos-visit-context"><summary><span className="silla-barber-initial" aria-hidden="true">{barberos.find(b => b.id === selectedBarberoId)?.nombre.slice(0, 1) || '?'}</span><strong>{barberos.find(b => b.id === selectedBarberoId)?.nombre || 'Elegir barbero'}</strong><span className="silla-context-client">{selectedClienteNombre}</span><ChevronDown size={18} aria-hidden="true" /></summary><div className="pos-visit-fields">
              <div>
                <label htmlFor="pos-professional" className="block text-xs font-semibold text-stone-500 mb-1">
                  Barbero
                </label>
                <select
                  id="pos-professional"
                  disabled={Boolean(activeCita)}
                  value={selectedBarberoId}
                  onChange={(e) => setSelectedBarberoId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-900 font-semibold focus:outline-none focus:bg-white"
                >
                  {barberos.map(b => (
                    <option key={b.id} value={b.id} className="text-stone-900">
                      {b.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Selection (P1.7 FIX: Enlace real con Clientes CRM) */}
              <div>
                <label htmlFor="pos-customer" className="block text-xs font-semibold text-stone-500 mb-1">
                  Cliente
                </label>
                <select
                  id="pos-customer"
                  disabled={Boolean(activeCita)}
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
                {!selectedClienteId && <details className="pos-customer-name"><summary>{selectedClienteNombre !== 'Público General' ? selectedClienteNombre : 'Nombre opcional'}</summary>
                  <input
                    type="text"
                    value={selectedClienteNombre}
                    aria-label="Nombre del cliente de mostrador"
                    onChange={(e) => setSelectedClienteNombre(e.target.value)}
                    placeholder="Nombre del cliente mostrador"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1 text-xs text-stone-700 focus:outline-none focus:border-stone-900"
                  />
                </details>}
              </div>
              </div></details>
            </div>

            {/* Item list */}
            <div id="carbon-ticket-items" className="operation-cart-items space-y-2">
              {cart.map(item => (
                <div
                  key={item.producto.id}
                  className="bg-stone-50/80 border border-stone-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0 basis-full sm:basis-auto">
                    <h5 className="font-semibold text-stone-900 text-xs truncate">{item.producto.nombre}</h5>
                    <span className="text-[10px] text-stone-500">${item.precioUnitario} c/u</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.producto.id, -1)}
                      disabled={Boolean(activeCita) && item.producto.tipo === 'SERVICIO'}
                      aria-label={`Quitar una unidad de ${item.producto.nombre}`}
                      className="operation-quantity rounded bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center text-xs"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs text-stone-900">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.producto.id, 1)}
                      disabled={Boolean(activeCita) && item.producto.tipo === 'SERVICIO'}
                      aria-label={`Agregar una unidad de ${item.producto.nombre}`}
                      className="operation-quantity rounded bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center text-xs"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.producto.id)}
                      disabled={Boolean(activeCita) && item.producto.tipo === 'SERVICIO'}
                      aria-label={`Eliminar ${item.producto.nombre} del cobro`}
                      className="operation-quantity text-stone-400 hover:text-rose-600 flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-bold text-xs text-stone-900 text-right w-16 tabular-nums">
                    ${(item.precioUnitario * item.cantidad).toFixed(2)}
                  </span>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="operation-cart-empty">
                  <Receipt size={32} aria-hidden="true" />
                  <p className="font-semibold">Elige un servicio para empezar</p>
                </div>
              )}
            </div>

            {/* Calculations & Checkout */}
            </div>
            <div className="pos-cart-checkout pt-3 border-t border-stone-100 space-y-2.5">


              <details className="pos-price-options" onToggle={event => { if (event.currentTarget.open) adjustmentSnapshot.current = { descuento, propinaPct, reason: discountReason }; }}><summary>Descuento y propina{descuento > 0 || propinaPct > 0 ? ' · aplicados' : ''}</summary>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label htmlFor="pos-discount" className="text-xs text-stone-500 font-semibold block mb-1">Descuento ($)</label>
                  <input
                    id="pos-discount"
                    type="number" step="0.01" inputMode="decimal"
                    min="0"
                    value={descuento}
                    onChange={(e) => setDescuento(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  />
                </div>
              {descuento > 0 && <label className="block text-xs my-3" htmlFor="pos-discount-reason">Motivo del descuento{discountPolicy?.activa && discountPolicy.motivoObligatorio ? ' (obligatorio)' : ' (opcional)'}<input id="pos-discount-reason" maxLength={500} value={discountReason} onChange={e => setDiscountReason(e.target.value)} className="studio-input mt-1 w-full" /></label>}
                <div>
                  <p className="text-xs text-stone-500 font-semibold block mb-1" id="pos-tip-label">Propina (%)</p>
                  <div className="flex gap-1" role="group" aria-labelledby="pos-tip-label">
                    {[0, 10, 15, 20].map(pct => (
                      <button
                        key={pct}
                        aria-pressed={propinaPct === pct}
                        type="button"
                        onClick={() => setPropinaPct(pct)}
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold transition ${
                          propinaPct === pct
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {pct === 0 ? 'Sin propina' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="carbon-adjust-actions">
                <button type="button" onClick={event => {
                  const previous = adjustmentSnapshot.current;
                  setDescuento(previous.descuento); setPropinaPct(previous.propinaPct); setDiscountReason(previous.reason);
                  const panel = event.currentTarget.closest('details'); if (panel) { panel.open = false; panel.querySelector('summary')?.focus(); }
                }}>Cancelar ajustes</button>
                <button type="button" onClick={event => {
                  const panel = event.currentTarget.closest('details'); if (panel) { panel.open = false; panel.querySelector('summary')?.focus(); }
                }}>Aplicar ajustes</button>
              </div>
              </details>

              <div className="pos-cart-totals p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1 text-xs" aria-live="polite">
                <div className={`silla-subtotal flex justify-between text-stone-600 ${descuento > 0 || propinaCalculada > 0 ? '' : 'silla-unadjusted'}`}>
                  <span>Subtotal:</span>
                  <span className="font-semibold tabular-nums">${subtotal.toFixed(2)} MXN</span>
                </div>
                {descuento > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Descuento:</span>
                    <span>-${descuento.toFixed(2)} MXN</span>
                  </div>
                )}
                {propinaCalculada > 0 && (
                  <div className="flex justify-between text-amber-800 font-semibold">
                    <span>Propina:</span>
                    <span>+${propinaCalculada.toFixed(2)} MXN</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-stone-900 pt-1.5 border-t border-stone-200">
                  <span>Total</span>
                  <span className="tabular-nums">${total.toFixed(2)}</span>
                </div>
              </div>

              <select className="silla-payment-method" aria-label="Método de pago del ticket" value={metodoPago} onChange={e => setMetodoPago(e.target.value as typeof metodoPago)}>
                <option value="EFECTIVO">Efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option><option value="MIXTO">Pago dividido</option>
              </select>
              <button
                onClick={handleOpenCheckout}
                disabled={cart.length === 0 || !online}
                className="studio-button w-full disabled:opacity-40"
              >
                <span>Cobrar ${total.toFixed(2)}</span>
              </button>

            </div>

          </div>
        </div>

      </div>

      <div className="pos-mobile-checkout" aria-label="Cobro preparado">
        <a href="#pos-cart" onClick={event => { event.preventDefault(); setTicketExpanded(true); window.requestAnimationFrame(() => { const ticket = document.getElementById('pos-cart'); ticket?.scrollIntoView({ block: 'start' }); ticket?.focus({ preventScroll: true }); }); }}>Ver ticket<strong>${total.toFixed(2)} MXN</strong></a>
        <button type="button" onClick={handleOpenCheckout} disabled={!cart.length || !online} className="studio-button">Cobrar</button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && createPortal(
        <dialog ref={paymentDialog} aria-labelledby="payment-dialog-title" aria-describedby="payment-dialog-description" aria-busy={processingSale} onKeyDown={keepPaymentFocus} onCancel={event => { event.preventDefault(); closePaymentDialog(); }} className="carbon-payment-dialog m-auto w-[calc(100%-2rem)] max-w-md border-0 bg-transparent p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm">
          <div className="operation-payment operation-payment-silla carbon-payment bg-white border border-stone-200 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <h3 id="payment-dialog-title" tabIndex={-1} className="text-base font-bold text-stone-900 mb-1">{pendingSale ? 'Comprobar cobro' : 'Cobrar'}</h3>
            <p id="payment-dialog-description" className="text-xs text-stone-500 mb-4">{pendingSale ? 'Conservamos este cobro. Recupera su resultado antes de recibir otro pago del cliente.' : `${cart.length === 1 ? cart[0].producto.nombre : `${cart.length} artículos`} · ${barberos.find(b => b.id === selectedBarberoId)?.nombre || 'Profesional seleccionado'}`}</p>
            {checkoutError && <p role="alert" className="mb-4 text-sm text-amber-800">{checkoutError}</p>}

            <div className="operation-payment-total">
              <span className="text-sm text-stone-600 block">Total a cobrar</span>
              <div className="text-3xl font-black text-stone-900 mt-0.5">
                ${total.toFixed(2)} <span className="text-sm font-normal text-stone-500">MXN</span>
              </div>
            </div>

            <fieldset disabled={processingSale || !!pendingSale || approvalLocked}>
            <div className="carbon-payment-methods grid grid-cols-4 gap-2 mb-4">
              {[
                { id: 'EFECTIVO', label: 'Efectivo', icon: DollarSign },
                { id: 'TARJETA', label: 'Tarjeta', icon: CreditCard },
                { id: 'TRANSFERENCIA', label: 'Transferencia', icon: Receipt },
                { id: 'MIXTO', label: 'Dividido', icon: Plus }
              ].map(m => (
                <button
                  key={m.id}
                  aria-pressed={metodoPago === m.id}
                  onClick={() => setMetodoPago(m.id as any)}
                  className={`operation-payment-method p-2.5 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
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
                  <label htmlFor="payment-cash-received" className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Recibido
                  </label>
                  <input
                    id="payment-cash-received"
                    type="number" step="0.01" inputMode="decimal"
                    value={montoEfectivo}
                    onChange={(e) => setMontoEfectivo(Number(e.target.value))}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm font-bold text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div className="flex gap-2">
                  {[...new Set([total, 100, 200, 500, 1000])].filter(n => n >= total).map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setMontoEfectivo(amt)}
                      aria-pressed={montoEfectivo === amt}
                      className="flex-1 py-1 rounded bg-white hover:bg-stone-100 border border-stone-200 text-[11px] font-bold text-stone-800"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                  <span className="text-xs text-stone-600 font-medium">Cambio</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    ${cambioEfectivo.toFixed(2)} MXN
                  </span>
                </div>
              </div>
            )}

            {metodoPago === 'MIXTO' && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 mb-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label htmlFor="payment-split-cash" className="text-[10px] text-stone-500 font-semibold block mb-0.5">Efectivo ($)</label>
                    <input
                      id="payment-split-cash"
                      type="number" step="0.01" inputMode="decimal"
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
                    <label htmlFor="payment-split-card" className="text-[10px] text-stone-500 font-semibold block mb-0.5">Tarjeta ($)</label>
                    <input
                      id="payment-split-card"
                      type="number" step="0.01" inputMode="decimal"
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
            {metodoPago === 'MIXTO' && Math.round(splitEfectivo * 100) + Math.round(splitTarjeta * 100) !== Math.round(total * 100) && (
              <p className="text-[11px] text-rose-600 font-semibold mb-3">
                ⚠️ La suma (${(splitEfectivo + splitTarjeta).toFixed(2)}) debe coincidir exactamente con el total (${total.toFixed(2)} MXN).
              </p>
            )}
            </fieldset>

            {needsDiscountApproval && !pendingSale && <DiscountApprovalRequest cart={approvalCart} reason={discountReason} onApproved={setDiscountApproval} onLock={setApprovalLocked} />}

            <div className="carbon-payment-actions flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closePaymentDialog}
                disabled={processingSale}
                className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold"
              >
                Volver al ticket
              </button>
              <button
                type="button"
                onClick={() => pendingSale ? submitIntention(pendingSale) : handleProcessSale()}
                disabled={
                  !online ||
                  (!pendingSale && (priceStatus !== 'ready' || approvalLocked || needsDiscountApproval && !approvalValid)) ||
                  (metodoPago === 'EFECTIVO' && montoEfectivo < total) ||
                  processingSale || (metodoPago === 'MIXTO' && Math.round(splitEfectivo * 100) + Math.round(splitTarjeta * 100) !== Math.round(total * 100))
                }
                className="px-5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition shadow-sm"
              >
                {processingSale ? 'Comprobando…' : pendingSale ? 'Consultar resultado' : `Registrar cobro $${total.toFixed(2)}`}
              </button>
            </div>
          </div>
        </dialog>
      , document.body)}

      {/* Confirmed sale: receipt remains available without competing with the next sale. */}
      {lastSale && ticketData && <OperationDialog open={true} busy={printing} titleId="sale-receipt-title" onClose={() => { setLastSale(null); setTicketData(null); }} className="carbon-confirmation-dialog max-w-sm">
        <SaleConfirmation
          sale={{ ...lastSale, ...ticketData.venta }}
          busy={printing}
          error={printError}
          onNewSale={() => { setLastSale(null); setTicketData(null); }}
          onRebook={lastVisit && onRebook ? () => { onRebook(lastVisit); setLastSale(null); setTicketData(null); } : undefined}
          receipt={<>
            <div
              id="thermal-receipt"
              className="bg-stone-50 text-stone-950 p-4 rounded-xl font-mono text-[11px] leading-tight border border-stone-200 shadow-xs mb-4 max-h-72 overflow-y-auto"
            >
              <div className="text-center font-bold text-xs tracking-wider mb-0.5">
                {(ticketData.venta?.tenant?.nombre || 'BARBERÍA').toUpperCase()}
              </div>
              <div className="text-center text-[9px] text-stone-500 mb-2">
                {ticketData.venta?.sucursal?.nombre || 'Sucursal'}{ticketData.venta?.sucursal?.telefono ? ` • Tel: ${ticketData.venta.sucursal.telefono}` : ''}
              </div>
              <div className="border-t border-dashed border-stone-300 my-1" />
              <div className="flex justify-between text-[10px] text-stone-600">
                <span>{ticketData.venta?.folio || lastSale.folio}</span>
                <span>{ticketData.venta?.fecha ? new Date(ticketData.venta.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </div>
              <div className="text-[10px] text-stone-600">Barbero: {ticketData.venta?.barbero?.nombre || 'Barbero'}</div>
              <div className="text-[10px] text-stone-600 break-all">Cobró: {ticketData.venta?.cobradoPorNombre || 'Registro histórico'}</div>
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
              {Number(ticketData.venta?.descuento) > 0 && <div className="flex justify-between text-[10px]"><span>Descuento:</span><span>-${Number(ticketData.venta.descuento).toFixed(2)}</span></div>}
              {Number(ticketData.venta?.propina) > 0 && <div className="flex justify-between text-[10px]"><span>Propina:</span><span>${Number(ticketData.venta.propina).toFixed(2)}</span></div>}
              {Number(ticketData.venta?.impuesto) > 0 && <div className="flex justify-between text-[10px]"><span>Impuesto incluido:</span><span>${Number(ticketData.venta.impuesto).toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-xs pt-0.5">
                <span>TOTAL:</span>
                <span>${Number(ticketData.venta?.total ?? lastSale.total).toFixed(2)} MXN</span>
              </div>
              <div className="text-[9px] text-stone-500 mt-1">Método: {ticketData.venta?.metodoPago || lastSale.metodoPago}</div>
            </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  disabled={printing}
                  onClick={() => printReceipt(lastSale.id, '58mm')}
                  className="py-2 px-2 rounded-lg bg-white hover:bg-stone-100 text-stone-800 text-[11px] font-semibold border border-stone-200 transition flex items-center justify-center gap-1 shadow-xs"
                  title="Imprimir ticket para impresora térmica de 58mm"
                >
                  <Printer className="w-3.5 h-3.5 text-stone-600" />
                  <span>58mm</span>
                </button>

                <button
                  type="button"
                  disabled={printing}
                  onClick={() => printReceipt(lastSale.id, '80mm')}
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

          </>}
        />
      </OperationDialog>}

      {/* Fase 3: Sales History & Devoluciones Modal */}
      {showSalesHistoryModal && <OperationDialog open={true} busy={printing} titleId="sales-history-title" onClose={() => setShowSalesHistoryModal(false)} className="max-w-4xl">
          <SalesHistory sales={salesList} loading={loadingSales} error={salesError} printError={printError} printing={printing} canRefund={canRefund} branchName={currentSucursal?.nombre || 'Sucursal actual'} zone={currentSucursal?.zonaHoraria || 'America/Mexico_City'} onClose={() => setShowSalesHistoryModal(false)} onRetry={() => void loadSalesHistory()} onPrint={(id, width) => void printReceipt(id, width)} onRefund={handleOpenRefund} />
      </OperationDialog>}

      {/* Fase 3: Refund Confirmation Modal */}
      {saleToRefund && <OperationDialog open={true} busy={submittingRefund} titleId="sale-refund-title" onClose={() => setSaleToRefund(null)}>
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <h3 id="sale-refund-title" tabIndex={-1} className="text-base font-bold text-stone-950 mb-1">
              Devolver unidades ({saleToRefund.folio})
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Elige las unidades. Ajustaremos inventario y comisión. Los reembolsos electrónicos se realizan por separado con el proveedor o banco.
            </p>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Total del ticket original:</span>
                <span className="font-bold text-stone-950 font-mono">${Number(saleToRefund.total).toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Método de pago:</span>
                <span className="font-semibold text-stone-800">{saleToRefund.metodoPago}</span>
              </div>
              {refundRecovery === 'ready' && <p className="font-semibold pt-2">Importe de esta devolución: {refundAmount === null ? 'Revisa las unidades' : `$${refundAmount.toFixed(2)} MXN`}</p>}
            </div>

            <fieldset hidden={refundRecovery !== 'ready'} disabled={submittingRefund || refundRecovery !== 'ready'}>
            <div className="space-y-3 mb-4">{saleToRefund.items?.map((item: any) => {
              const prior = (saleToRefund.devoluciones || []).flatMap((r: any) => JSON.parse(r.itemsJson)).filter((i: any) => i.itemId === item.id).reduce((sum: number, i: any) => sum + i.cantidad, 0);
              const available = item.cantidad - prior;
              return <label key={item.id} className="flex gap-2 justify-between text-xs items-center">{item.nombreItem} · {available} disponibles<input aria-label={`Devolver ${item.nombreItem}`} type="number" min="0" max={available} step="1" disabled={submittingRefund} value={refundQty[item.id] || 0} onChange={e => setRefundQty({ ...refundQty, [item.id]: Number(e.target.value) })} className="border rounded-lg p-2 w-20" /></label>;
            })}<label className="block text-xs">Propina a devolver<input aria-label="Propina a devolver" type="number" min="0" step="0.01" max={saleToRefund.propina} disabled={submittingRefund} value={refundTip} onChange={e => setRefundTip(Number(e.target.value))} className="border rounded-lg p-2 w-full mt-1" /></label><label className="block text-xs">Salida del efectivo<select aria-label="Salida del efectivo" disabled={submittingRefund} value={refundSource} onChange={e => setRefundSource(e.target.value)} className="border rounded-lg p-2 w-full mt-1"><option value="CAJA">Desde caja abierta</option><option value="COBRADOR">Lo conserva el cobrador original</option></select></label><p className="text-[11px] text-stone-500">El importe usa los precios y descuentos del ticket original y se distribuye entre sus medios de pago.</p></div>

            <div className="mb-4">
              <label htmlFor="sale-refund-reason" className="block text-xs font-semibold text-stone-700 mb-1">
                Motivo de la devolución *
              </label>
              <textarea
                id="sale-refund-reason"
                disabled={submittingRefund}
                rows={2}
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Ej. Producto defectuoso, error en cobro, cliente insatisfecho..."
                className="w-full bg-white border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            </fieldset>
            {refundRecovery !== 'ready' && <p role="status" className="text-sm text-stone-700 mb-3">{refundRecovery === 'recover' ? 'El resultado está pendiente. Conservamos el importe y la referencia originales.' : 'Comprueba la operación pendiente desde el aviso superior antes de devolver.'}</p>}
            {refundError && <p role="alert" className="text-xs text-rose-800 mb-3">{refundError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={submittingRefund}
                onClick={() => setSaleToRefund(null)}
                className="px-3 py-2 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50"
              >
                Atrás
              </button>
              <button
                type="button"
                disabled={submittingRefund || refundRecovery === 'blocked' || refundRecovery === 'ready' && (refundAmount === null || !refundReason.trim() || (!Object.values(refundQty).some(q => q > 0) && refundTip <= 0))}
                onClick={handleConfirmRefund}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {submittingRefund ? 'Comprobando…' : refundRecovery === 'recover' ? 'Comprobar devolución' : 'Confirmar devolución'}
              </button>
            </div>
          </div>
      </OperationDialog>}

      {/* Fase 3: Movimiento de Caja Modal */}
      {showCashMovementModal && <OperationDialog open={true} busy={submittingMovement} titleId="cash-movement-title" onClose={() => setShowCashMovementModal(false)}>
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 id="cash-movement-title" tabIndex={-1} className="text-base font-bold text-stone-950 mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Movimiento en Caja Registradora
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Registra retiros de efectivo, gastos menores o ingresos extra para mantener el arqueo ciego exacto.
            </p>

            <form onSubmit={handleConfirmCashMovement} aria-busy={submittingMovement} className="space-y-4">
              <div>
                <label htmlFor="cash-movement-type" className="block text-xs font-semibold text-stone-700 mb-1">Tipo de Movimiento</label>
                <select
                  id="cash-movement-type"
                  disabled={submittingMovement}
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
                <label htmlFor="cash-movement-amount" className="block text-xs font-semibold text-stone-700 mb-1">Monto ($MXN) *</label>
                <input
                  id="cash-movement-amount"
                  disabled={submittingMovement}
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
                <label htmlFor="cash-movement-reason" className="block text-xs font-semibold text-stone-700 mb-1">Concepto / Motivo Detallado *</label>
                <input
                  id="cash-movement-reason"
                  disabled={submittingMovement}
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
                  disabled={submittingMovement}
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
      </OperationDialog>}

      {/* Toast Notification */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{notification || ''}</div>
      {notification && (
        <div aria-hidden="true" className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-stone-800 text-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

    </div>
  );
};

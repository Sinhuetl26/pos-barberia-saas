import '../styles/collections-workspace.css';
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { inventoryKind } from '../utils/inventoryKind';
import { useSearchParams } from 'react-router-dom';
import { financialIntentKey } from '../utils/financialIntent';
import { compressCutReference } from '../utils/cutReferencePhoto';
import { serviceIllustration } from '../utils/serviceIllustration';
import { OperationDialog } from '../components/OperationDialog';
import { OperationState } from '../components/OperationState';
import { InventoryCounts } from '../components/InventoryCounts';
import { ServiceRecipes } from '../components/ServiceRecipes';
import { ConsumptionReview } from '../components/ConsumptionReview';
import '../styles/inventory-operations.css';
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

type InventoryEditDraft = {
  id: string;
  kind: 'SERVICIO' | 'PRODUCTO' | 'INSUMO';
  nombre: string;
  imagen: string | null;
  categoria: string;
  sku: string;
  duracionMinutos: number;
  precioVenta: number;
  tasaImpuesto: number;
  costo: number;
  stockMinimo: number;
  activo: boolean;
  stockActual: number;
  unidad: string;
};

export function inventoryEditDraft(product: Producto): InventoryEditDraft {
  return {
    id: product.id,
    kind: inventoryKind(product),
    nombre: product.nombre,
    imagen: product.imagen || null,
    categoria: product.categoria,
    sku: product.sku || '',
    duracionMinutos: Number(product.duracionMinutos || 30),
    precioVenta: Number(product.precioVenta || 0),
    tasaImpuesto: Number(product.tasaImpuesto || 0),
    costo: Number(product.costo || 0),
    stockMinimo: Number(product.stockMinimo || 0),
    activo: product.activo,
    stockActual: Number(product.stockActual || 0),
    unidad: product.unidad || 'PIEZA'
  };
}

export function inventoryEditPayload(draft: InventoryEditDraft) {
  return {
    nombre: draft.nombre.trim(),
    imagen: draft.imagen,
    categoria: draft.categoria.trim(),
    sku: draft.kind === 'SERVICIO' ? null : draft.sku.trim() || null,
    duracionMinutos: draft.kind === 'SERVICIO' ? Number(draft.duracionMinutos) : undefined,
    precioVenta: draft.kind === 'INSUMO' ? 0 : Number(draft.precioVenta),
    tasaImpuesto: Number(draft.tasaImpuesto),
    costo: Number(draft.costo),
    stockMinimo: draft.kind === 'SERVICIO' ? undefined : Number(draft.stockMinimo),
    activo: draft.activo
  };
}
function movementDetails(movement: KardexMovimiento, providers: any[]): string {
  try {
    const metadata = JSON.parse((movement as any).metadataJson || '{}');
    return [metadata.costoUnitario !== undefined ? `Costo unitario: $${Number(metadata.costoUnitario).toFixed(metadata.unidad && metadata.unidad !== 'PIEZA' ? 6 : 2)}` : '', metadata.referencia ? `Referencia: ${metadata.referencia}` : '', metadata.proveedorId ? `Proveedor: ${providers.find(p => p.id === metadata.proveedorId)?.nombre || metadata.proveedorId}` : '', metadata.usuarioNombre ? `Responsable: ${metadata.usuarioNombre}` : '', metadata.fechaOperacion ? `Fecha de operación: ${new Date(metadata.fechaOperacion).toLocaleString('es-MX')}` : ''].filter(Boolean).join(' · ');
  } catch { return ''; }
}

export const InventarioView: React.FC<InventarioViewProps> = ({ currentSucursal }) => {
  const [searchParams] = useSearchParams();
  const targetProduct = searchParams.get('productoId');
  const productDeepLink = useRef('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [kardex, setKardex] = useState<KardexMovimiento[]>([]);
  const [tab, setTab] = useState<'catalogo' | 'kardex' | 'conteos' | 'recetas' | 'consumo'>('catalogo');
  const [filterType, setFilterType] = useState<'ALL' | 'SERVICIO' | 'PRODUCTO' | 'INSUMO' | 'BAJO_STOCK'>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<Producto | null>(null);
  const [editingProduct, setEditingProduct] = useState<InventoryEditDraft | null>(null);

  // New Product Form
  const [nombre, setNombre] = useState('');
  const [imagen, setImagen] = useState<string | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [tipo, setTipo] = useState<'PRODUCTO' | 'SERVICIO'>('PRODUCTO');
  const [categoria, setCategoria] = useState('Styling');
  const [duracionMinutos, setDuracionMinutos] = useState(30);
  const [sku, setSku] = useState('');
  const [precioVenta, setPrecioVenta] = useState<number>(0);
  const [tasaImpuesto, setTasaImpuesto] = useState(0);
  const [costo, setCosto] = useState<number>(0);
  const [stockActual, setStockActual] = useState<number>(0);
  const [stockMinimo, setStockMinimo] = useState<number>(0);
  const [naturaleza, setNaturaleza] = useState<'REVENTA' | 'INSUMO'>('REVENTA');
  const [unidad, setUnidad] = useState<'PIEZA' | 'ML' | 'G'>('PIEZA');
  const [presentacionNombre, setPresentacionNombre] = useState('');
  const [presentacionCantidad, setPresentacionCantidad] = useState(1);

  // Movement Form
  const [movTipo, setMovTipo] = useState<'ENTRADA_COMPRA' | 'MERMA_DEVOLUCION' | 'USO_INTERNO' | 'AJUSTE_INVENTARIO'>('ENTRADA_COMPRA');
  const [movCantidad, setMovCantidad] = useState<number>(5);
  const [movMotivo, setMovMotivo] = useState('Compra a proveedor');
  const [movCosto, setMovCosto] = useState('');
  const [movProveedor, setMovProveedor] = useState('');
  const [movReferencia, setMovReferencia] = useState('');
  const [movFecha, setMovFecha] = useState('');
  const [movPresentation, setMovPresentation] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [operationNotice, setOperationNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ kind: 'product' | 'movement'; payload: any } | null>(null);
  const [storageError, setStorageError] = useState('');
  const busyRef = useRef(false);
  const requestId = useRef(0);
  const loadedScope = useRef('');
  const activeScope = useRef('');
  const scope = `${api.getTenantId()}:${api.getUserId()}:${currentSucursal?.id || ''}`;
  activeScope.current = scope;
  const storageKey = `${financialIntentKey(api.getTenantId(), api.getUserId())}:inventory:${currentSucursal?.id || ''}`;
  const canManage = ['DUENO', 'GERENTE'].includes(api.getUserRole());
  const canMove = (p: Producto) => canManage && (Boolean(p.sucursalId) || api.getUserRole() === 'DUENO');
  useEffect(() => {
    const key = `${scope}:${targetProduct || ''}`;
    if (!targetProduct || loading || loadedScope.current !== scope || key === productDeepLink.current) return;
    const product = productos.find(p => p.id === targetProduct);
    if (product) { productDeepLink.current = key; setTab('catalogo'); setFilterType('ALL'); setSearch(product.nombre); window.requestAnimationFrame(() => document.getElementById('inventory-catalog-search')?.focus()); }
  }, [targetProduct, productos, loading, scope]);

  useEffect(() => {
    requestId.current++;
    setProductos([]); setKardex([]); setProviders([]); setPending(null); setStorageError('');
    setShowAddModal(false); setShowMovementModal(false); setSelectedProductForMovement(null); setEditingProduct(null);
    setOperationError(''); setOperationNotice(''); setBusy(false); busyRef.current = false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (!['product', 'movement'].includes(saved.kind) || saved.payload?.sucursalId !== currentSucursal?.id || !/^[0-9a-f-]{36}$/i.test(saved.payload?.idempotencyKey || '')) throw new Error('invalid');
        setPending(saved);
      }
    } catch { setStorageError('No pudimos leer la operación guardada. No confirmes otra operación desde este navegador hasta revisar su resultado.'); }
    void loadData();
    return () => { requestId.current++; };
  }, [scope]);

  const loadData = async () => {
    if (!currentSucursal?.id) return;
    const id = ++requestId.current; const requestedScope = scope;
    setLoading(true); setLoadError('');
    try {
      const [prods, kx] = await Promise.all([
        api.getProductos({ sucursalId: currentSucursal.id }),
        canManage ? api.getKardex(undefined, currentSucursal.id) : Promise.resolve([])
      ]);
      if (id !== requestId.current || activeScope.current !== requestedScope) return;
      loadedScope.current = requestedScope; setProductos(prods); setKardex(kx);
      if (canManage) void api.getInventoryProviders().then(p => { if (id === requestId.current && activeScope.current === requestedScope) setProviders(p); }).catch(() => {});
    } catch (e: any) { if (id === requestId.current && activeScope.current === requestedScope) { setProductos([]); setKardex([]); setLoadError(e.message || 'No se pudo consultar el inventario.'); } }
    finally { if (id === requestId.current && activeScope.current === requestedScope) setLoading(false); }
  };

  const submitIntent = async (intent: { kind: 'product' | 'movement'; payload: any }) => {
    if (busyRef.current || storageError) return;
    const requestedScope = scope;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) { const previous = JSON.parse(raw); if (previous.payload?.idempotencyKey !== intent.payload.idempotencyKey) { setPending(previous); setOperationError('Otra pestaña dejó una operación pendiente. Recupera ese resultado antes de registrar otra.'); return; } }
      localStorage.setItem(storageKey, JSON.stringify(intent));
    }
    catch { setStorageError('No se pudo guardar la referencia de la operación. Libera espacio del navegador antes de confirmar.'); return; }
    busyRef.current = true; setBusy(true); setPending(intent); setOperationError(''); setOperationNotice('');
    const clearOwnIntent = () => { const raw = localStorage.getItem(storageKey); if (raw && JSON.parse(raw).payload?.idempotencyKey === intent.payload.idempotencyKey) localStorage.removeItem(storageKey); };
    try {
      const p = intent.payload;
      if (intent.kind === 'product') await api.createProducto(p);
      else await api.ajustarInventario(p.productoId, p.tipoMovimiento, p.cantidad, p.motivo, { sucursalId: p.sucursalId, idempotencyKey: p.idempotencyKey, stockEsperado: p.stockEsperado, costoUnitario: p.costoUnitario, proveedorId: p.proveedorId, referencia: p.referencia, fechaOperacion: p.fechaOperacion, cantidadPresentaciones: p.cantidadPresentaciones });
      clearOwnIntent();
      if (activeScope.current !== requestedScope) return;
      setPending(null); setShowAddModal(false); setShowMovementModal(false); setSelectedProductForMovement(null);
      setNombre(''); setSku(''); setImagen(null); setOperationNotice(intent.kind === 'product' ? intent.payload.tipo === 'SERVICIO' ? 'Servicio guardado. No tiene existencias físicas.' : Number(intent.payload.stockActual) > 0 ? 'Artículo guardado. El stock inicial y su movimiento quedaron registrados juntos.' : 'Artículo guardado sin stock inicial. Registra una entrada cuando recibas existencias.' : 'Movimiento confirmado. El historial conserva el saldo, motivo y responsable.');
      await loadData();
    } catch (e: any) {
      // A transport error or conflict with an existing intention may conceal a committed result.
      const definitive = e.status >= 400 && e.status < 500 && Boolean(e.code) && !['IDEMPOTENCY_CONFLICT', 'INVENTORY_RESULT_UNCERTAIN'].includes(e.code);
      if (definitive) { try { clearOwnIntent(); } catch {} }
      if (activeScope.current !== requestedScope) return;
      if (definitive) setPending(null);
      setOperationError(`${e.message || 'No se pudo confirmar el resultado.'}${definitive ? '' : ' Conservamos la misma operación: recupera el resultado antes de cambiar cantidades o registrar otra.'}`);
      if (e.code === 'STOCK_CHANGED') { setShowMovementModal(false); setSelectedProductForMovement(null); await loadData(); }
    } finally { if (activeScope.current === requestedScope) { busyRef.current = false; setBusy(false); } }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSucursal?.id || pending || busyRef.current) return;
      await submitIntent({ kind: 'product', payload: {
        idempotencyKey: crypto.randomUUID(),
        sucursalId: currentSucursal.id,
        nombre,
        imagen,
        tipo,
        naturaleza: tipo === 'PRODUCTO' ? naturaleza : 'REVENTA',
        unidad: tipo === 'PRODUCTO' && naturaleza === 'INSUMO' ? unidad : 'PIEZA',
        presentacionNombre: tipo === 'PRODUCTO' ? presentacionNombre : undefined,
        presentacionCantidad: tipo === 'PRODUCTO' ? presentacionCantidad : 1,
        categoria,
        duracionMinutos,
        sku,
        precioVenta: naturaleza === 'INSUMO' && tipo === 'PRODUCTO' ? 0 : precioVenta,
        tasaImpuesto,
        costo,
        stockActual: tipo === 'PRODUCTO' ? stockActual : 0,
        stockMinimo: tipo === 'PRODUCTO' ? stockMinimo : 0
      } });
  };

  const prepareCatalogImage = async (file: File, apply: (value: string) => void) => {
    setPreparingImage(true); setOperationError('');
    try { apply(await compressCutReference(file)); }
    catch (error: any) { setOperationError(error.message || 'No pudimos preparar la foto.'); }
    finally { setPreparingImage(false); }
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForMovement || !currentSucursal?.id || pending || busyRef.current) return;
    if (movFecha && !Number.isFinite(new Date(movFecha).getTime())) { setOperationError('Indica una fecha válida para la entrada.'); return; }
    const converted = movPresentation && movTipo === 'ENTRADA_COMPRA' ? movCantidad * Number(selectedProductForMovement.presentacionCantidad || 1) : movCantidad;
    if (Math.abs(converted * 1000 - Math.round(converted * 1000)) > 0.000001) { setOperationError('La conversión supera tres decimales. Captura la cantidad medida en unidad base.'); return; }
    const movementQuantity = Number(converted.toFixed(3));
    await submitIntent({ kind: 'movement', payload: { idempotencyKey: crypto.randomUUID(), sucursalId: currentSucursal.id, productoId: selectedProductForMovement.id, tipoMovimiento: movTipo, cantidad: movementQuantity, motivo: movMotivo.trim(), ...(movPresentation && movTipo === 'ENTRADA_COMPRA' ? { cantidadPresentaciones: movCantidad } : {}), ...(movTipo === 'AJUSTE_INVENTARIO' ? { stockEsperado: Number(selectedProductForMovement.stockActual) } : {}), ...(movTipo === 'ENTRADA_COMPRA' ? { ...(movCosto !== '' ? { costoUnitario: Number(movCosto) } : {}), ...(movProveedor ? { proveedorId: movProveedor } : {}), ...(movReferencia.trim() ? { referencia: movReferencia.trim() } : {}), ...(movFecha ? { fechaOperacion: new Date(movFecha).toISOString() } : {}) } : {}) } });
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || busyRef.current || !currentSucursal?.id) return;
    if (editingProduct.nombre.trim().length < 2 || !editingProduct.categoria.trim()) {
      setOperationError('Indica un nombre y una categoría válidos.');
      return;
    }
    const requestedScope = scope;
    busyRef.current = true; setBusy(true); setOperationError(''); setOperationNotice('');
    try {
      await api.updateProducto(editingProduct.id, inventoryEditPayload(editingProduct));
      if (activeScope.current !== requestedScope) return;
      setEditingProduct(null);
      setOperationNotice('Cambios guardados. Las existencias no se modificaron.');
      await loadData();
    } catch (error: any) {
      if (activeScope.current === requestedScope) setOperationError(error.message || 'No pudimos guardar los cambios del artículo.');
    } finally {
      if (activeScope.current === requestedScope) { busyRef.current = false; setBusy(false); }
    }
  };

  const lowStockCount = productos.filter(p => p.tipo === 'PRODUCTO' && p.stockActual <= p.stockMinimo).length;

  const filteredProducts = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                          p.sku?.toLowerCase().includes(search.toLowerCase()) ||
                          p.categoria.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'SERVICIO') return p.tipo === 'SERVICIO';
    if (filterType === 'PRODUCTO') return inventoryKind(p) === 'PRODUCTO';
    if (filterType === 'INSUMO') return p.naturaleza === 'INSUMO';
    if (filterType === 'BAJO_STOCK') return p.tipo === 'PRODUCTO' && p.stockActual <= p.stockMinimo;
    return true;
  });

  return (
    <div className="studio-page studio-stock inventory-workspace">
      {loading && <OperationState busy title="Consultando existencias">Actualizando catálogo e historial de esta sucursal.</OperationState>}
      {loadError && <OperationState title="No pudimos consultar el inventario" action={<button className="studio-button-secondary" onClick={() => void loadData()}>Reintentar consulta</button>}>{loadError}</OperationState>}
      {storageError && <p role="alert" className="inventory-operation-error">{storageError}</p>}
      {operationError && <p role="alert" className="inventory-operation-error">{operationError}</p>}
      {operationNotice && <p role="status" className="inventory-operation-notice">{operationNotice}</p>}
      {pending && <section className="inventory-recovery" aria-label="Operación pendiente"><div><strong>{pending.kind === 'product' ? 'Alta de artículo pendiente de confirmar' : 'Movimiento pendiente de confirmar'}</strong><p>{pending.payload.nombre || productos.find(p => p.id === pending.payload.productoId)?.nombre || 'Artículo'} · {pending.kind === 'movement' ? `${pending.payload.cantidad} unidades` : 'Con su stock inicial'}. Mantendremos exactamente los datos enviados.</p></div><button className="studio-button-primary" disabled={busy} onClick={() => void submitIntent(pending)}>{busy ? 'Consultando resultado…' : 'Recuperar resultado'}</button></section>}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Inventario
            </h1>
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {currentSucursal?.nombre || 'Matriz'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Servicios, productos y lo que usas en cada corte.
          </p>
        </div>

        <div className="inventory-header-actions flex items-center gap-2">
          <div className="inventory-tabbar flex bg-stone-100 border border-stone-200 rounded-xl p-1">
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
              Historial de existencias
            </button>
            {canManage && <button disabled={busy || Boolean(pending)} onClick={() => setTab('conteos')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${tab === 'conteos' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}>Conteos</button>}
            {canManage && <><button disabled={busy || Boolean(pending)} onClick={() => setTab('recetas')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'recetas' ? 'bg-white' : ''}`}>Recetas</button><button disabled={busy || Boolean(pending)} onClick={() => setTab('consumo')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === 'consumo' ? 'bg-white' : ''}`}>Consumo</button></>}
          </div>

          <button
            disabled={!canManage || busy || Boolean(pending) || Boolean(storageError) || loading || Boolean(loadError)}
            onClick={() => { setOperationError(''); setTipo(filterType === 'SERVICIO' ? 'SERVICIO' : 'PRODUCTO'); setNaturaleza(filterType === 'INSUMO' ? 'INSUMO' : 'REVENTA'); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir artículo</span>
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

      {tab === 'catalogo' && !loading && !loadError && (
        <div className="space-y-4">
          {!loading && !loadError && <nav className="inventory-type-doors" aria-label="Tipos de catálogo">{[{id:'SERVICIO',name:'Servicios',hint:'Precio y duración',count:productos.filter(p=>inventoryKind(p)==='SERVICIO').length},{id:'PRODUCTO',name:'Productos',hint:'Lo que vendes',count:productos.filter(p=>inventoryKind(p)==='PRODUCTO').length},{id:'INSUMO',name:'Insumos',hint:'Lo que usas',count:productos.filter(p=>inventoryKind(p)==='INSUMO').length}].map(item=><button key={item.id} aria-pressed={filterType===item.id} onClick={()=>setFilterType(item.id as any)}><strong>{item.name}</strong><span>{item.hint}</span><b>{item.count}</b></button>)}</nav>}
          <div className="luxury-card rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                aria-label="Buscar en el inventario"
                value={search}
                id="inventory-catalog-search"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, SKU o categoría..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'BAJO_STOCK', label: `Bajo stock (${lowStockCount})` }
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
            <details className="inventory-margin-note"><summary>Sobre el margen de catálogo</summary><p>El margen de catálogo compara precio y costo unitario actual de productos. No incluye comisiones, insumos ni gastos operativos; los servicios requieren costo real de atención.</p></details>
            <div className="overflow-x-auto">
              <table className="inventory-catalog-table w-full text-left text-xs text-stone-700">
                <caption className="sr-only">Servicios y productos, precios y existencias</caption>
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4">Ítem / SKU</th>
                    <th className="py-2.5 px-4">Tipo</th>
                    <th className="py-2.5 px-4">Categoría</th>
                    <th className="py-2.5 px-4">Precio Venta</th>
                    <th className="py-2.5 px-4">Margen de catálogo</th>
                    <th className="py-2.5 px-4">Stock</th>
                    <th className="py-2.5 px-4">Mínimo</th>
                    <th className="py-2.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {!filteredProducts.length && <tr><td colSpan={8} className="p-6 text-stone-600">No hay artículos que coincidan. Prueba otro nombre o muestra todos.</td></tr>}
                  {filteredProducts.map(p => {
                    const isService = p.tipo === 'SERVICIO';
                    const isLow = !isService && p.stockActual <= p.stockMinimo;
                    const margen = !isService && Number(p.precioVenta) > 0 && Number(p.costo) > 0
                      ? `${(((Number(p.precioVenta) - Number(p.costo)) / Number(p.precioVenta)) * 100).toFixed(0)}%`
                      : null;

                    return (
                      <tr key={p.id} className="hover:bg-stone-50/60">
                        <td className="py-3 px-4">
                          <div className="inventory-catalog-identity">
                            {(p.imagen || (isService ? serviceIllustration(p.nombre) : null)) ? <img src={p.imagen || serviceIllustration(p.nombre)!} alt="" /> : <span aria-hidden="true">{p.nombre.charAt(0).toUpperCase()}</span>}
                            <div><div className="font-bold text-stone-900">{p.nombre}</div><div className="text-[10px] text-stone-400 font-mono mt-0.5">{p.sku || 'N/A'} {isService ? `• ${p.duracionMinutos}m` : ''}</div></div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                            isService ? 'bg-stone-100 text-stone-700' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {p.naturaleza === 'INSUMO' ? 'INSUMO' : p.tipo}
                          </span>
                        </td>
                        <td data-label="Categoría" className="py-3 px-4 text-stone-600">{p.categoria}</td>
                        <td data-label="Precio" className="py-3 px-4 font-bold text-stone-900">{p.naturaleza === 'INSUMO' ? 'No se vende' : `$${Number(p.precioVenta)}`}</td>
                        <td data-label="Margen de catálogo" className="py-3 px-4 text-stone-600 font-semibold">{margen || '—'}{!margen && <span className="block text-xs font-normal">{isService ? 'Costo real pendiente' : 'Información insuficiente'}</span>}</td>
                        <td data-label="Existencias" className="py-3 px-4">
                          {isService ? (
                            <span className="text-stone-300 text-xs">—</span>
                          ) : (
                            <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-stone-900'}`}>
                              {p.stockActual} {p.unidad || 'PIEZA'}
                            </span>
                          )}
                        </td>
                        <td data-label="Mínimo" className="py-3 px-4 text-stone-500">{isService ? '—' : p.stockMinimo}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="inventory-row-actions">
                          {canManage && <button
                            type="button"
                            onClick={() => { setOperationError(''); setEditingProduct(inventoryEditDraft(p)); }}
                            disabled={busy || Boolean(pending) || Boolean(storageError) || loading || Boolean(loadError)}
                            className="inventory-edit-button"
                          >Editar</button>}
                          {!isService && canMove(p) && (
                            <button
                              onClick={() => {
                                setOperationError(''); setMovCosto(''); setMovProveedor(''); setMovReferencia(''); setMovFecha(''); setMovPresentation(false);
                                setSelectedProductForMovement(p);
                                setShowMovementModal(true);
                              }}
                              disabled={busy || Boolean(pending) || Boolean(storageError) || loading || Boolean(loadError)}
                              className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold transition"
                            >
                              Existencias
                            </button>
                          )}
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

      {tab === 'conteos' && canManage && currentSucursal?.id && <InventoryCounts branchId={currentSucursal.id} products={productos} onChanged={() => void loadData()} />}
      {tab === 'recetas' && canManage && currentSucursal?.id && <ServiceRecipes branchId={currentSucursal.id} products={productos} />}
      {tab === 'consumo' && canManage && currentSucursal?.id && <ConsumptionReview branchId={currentSucursal.id} />}
      {tab === 'kardex' && !loading && !loadError && (
        <div className="luxury-card rounded-2xl overflow-hidden">
          <div className="p-3.5 border-b border-stone-100 text-xs font-bold text-stone-900">
            Historial de existencias (Kardex)
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
                    <td className="py-2.5 px-4 text-stone-600">{m.motivo || '—'}{movementDetails(m, providers) && <span className="block mt-1 text-xs">{movementDetails(m, providers)}</span>}</td>
                  </tr>
                ))}
                {!loading && kardex.length === 0 && <tr><td colSpan={7} className="p-6 text-stone-600">No hay movimientos registrados en esta sucursal.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OperationDialog open={Boolean(editingProduct)} busy={busy} titleId="inventory-edit-title" className="max-w-md inventory-operation-dialog" onClose={() => setEditingProduct(null)}>
        {editingProduct && <form onSubmit={handleUpdateProduct} className="inventory-edit-panel">
          <header>
            <div><span>{editingProduct.kind === 'SERVICIO' ? 'Servicio' : editingProduct.kind === 'INSUMO' ? 'Insumo' : 'Producto'}</span><h2 id="inventory-edit-title" tabIndex={-1}>Editar {editingProduct.nombre}</h2></div>
            <p>{editingProduct.kind === 'SERVICIO' ? 'Precio, duración y datos para reservar.' : editingProduct.kind === 'INSUMO' ? 'Datos operativos del material que consumes.' : 'Precio y nivel mínimo del producto que vendes.'}</p>
          </header>
          <fieldset disabled={busy || preparingImage}>
            <div className="inventory-photo-field">
              {(editingProduct.imagen || (editingProduct.kind === 'SERVICIO' ? serviceIllustration(editingProduct.nombre) : null)) ? <img src={editingProduct.imagen || serviceIllustration(editingProduct.nombre)!} alt={`Vista de ${editingProduct.nombre}`} /> : <span aria-hidden="true">{editingProduct.nombre.charAt(0).toUpperCase()}</span>}
              <div><label htmlFor="inventory-edit-photo">Foto</label><input id="inventory-edit-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file=event.target.files?.[0]; if(file) void prepareCatalogImage(file,value => setEditingProduct(current => current ? {...current,imagen:value}:current)); event.target.value=''; }}/><small>JPG, PNG o WebP. Se reduce y guarda sin metadatos.</small>{editingProduct.imagen && <button type="button" onClick={() => setEditingProduct({...editingProduct,imagen:null})}>Quitar foto</button>}</div>
            </div>
            <label htmlFor="inventory-edit-name">Nombre<input id="inventory-edit-name" required minLength={2} maxLength={160} value={editingProduct.nombre} onChange={event => setEditingProduct({...editingProduct, nombre:event.target.value})}/></label>
            <label htmlFor="inventory-edit-category">Categoría<input id="inventory-edit-category" required maxLength={100} value={editingProduct.categoria} onChange={event => setEditingProduct({...editingProduct, categoria:event.target.value})}/></label>
            {editingProduct.kind !== 'SERVICIO' && <label htmlFor="inventory-edit-sku">SKU<input id="inventory-edit-sku" maxLength={100} value={editingProduct.sku} onChange={event => setEditingProduct({...editingProduct, sku:event.target.value})}/></label>}
            {editingProduct.kind === 'SERVICIO' && <label htmlFor="inventory-edit-duration">Duración en minutos<input id="inventory-edit-duration" type="number" required min="5" max="1440" step="5" value={editingProduct.duracionMinutos} onChange={event => setEditingProduct({...editingProduct, duracionMinutos:Number(event.target.value)})}/></label>}
            {editingProduct.kind !== 'INSUMO' && <label htmlFor="inventory-edit-price">Precio de venta<input id="inventory-edit-price" type="number" required min="0" max="1000000000" step="0.01" value={editingProduct.precioVenta} onChange={event => setEditingProduct({...editingProduct, precioVenta:Number(event.target.value)})}/></label>}
            <label htmlFor="inventory-edit-cost">{editingProduct.kind === 'SERVICIO' ? 'Costo estimado' : `Costo por ${editingProduct.unidad.toLowerCase()}`}<input id="inventory-edit-cost" type="number" min="0" step={editingProduct.kind === 'INSUMO' ? '0.000001' : '0.01'} value={editingProduct.costo} onChange={event => setEditingProduct({...editingProduct, costo:Number(event.target.value)})}/></label>
            <label htmlFor="inventory-edit-tax">IVA incluido (%)<input id="inventory-edit-tax" type="number" min="0" max="100" step="0.01" value={editingProduct.tasaImpuesto} onChange={event => setEditingProduct({...editingProduct, tasaImpuesto:Number(event.target.value)})}/></label>
            {editingProduct.kind !== 'SERVICIO' && <><label htmlFor="inventory-edit-minimum">Avisar al llegar a<input id="inventory-edit-minimum" type="number" min="0" step={editingProduct.unidad === 'PIEZA' ? '1' : '0.001'} value={editingProduct.stockMinimo} onChange={event => setEditingProduct({...editingProduct, stockMinimo:Number(event.target.value)})}/></label><p className="inventory-edit-stock">Existencias actuales: <strong>{editingProduct.stockActual} {editingProduct.unidad}</strong>. Para cambiarlas usa «Existencias» y conserva el historial.</p></>}
            <label className="inventory-edit-active"><input type="checkbox" checked={editingProduct.activo} onChange={event => setEditingProduct({...editingProduct, activo:event.target.checked})}/>Disponible en el catálogo</label>
          </fieldset>
          <footer><button type="button" className="studio-button-secondary" disabled={busy || preparingImage} onClick={() => setEditingProduct(null)}>Cancelar</button><button type="submit" className="studio-button-primary" disabled={busy || preparingImage}>{preparingImage ? 'Preparando foto…' : busy ? 'Guardando…' : 'Guardar cambios'}</button></footer>
        </form>}
      </OperationDialog>

      {/* Modal: Añadir artículo */}
      {showAddModal && (
        <OperationDialog open={showAddModal} busy={busy || Boolean(pending)} titleId="inventory-product-title" className="max-w-md inventory-operation-dialog" onClose={() => setShowAddModal(false)}>
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 shadow-2xl animate-luxury-in">
            <h3 id="inventory-product-title" tabIndex={-1} className="text-base font-bold text-stone-900 mb-1">Agregar al catálogo</h3>
            <p className="text-xs text-stone-500 mb-4">El tipo elegido determina los datos que necesitas.</p>
            {operationError && <p role="alert" className="inventory-operation-error">{operationError}</p>}
            {storageError && <p role="alert" className="inventory-operation-error">{storageError}</p>}
            {pending && <button disabled={busy} className="studio-button-primary mb-4" onClick={() => void submitIntent(pending)}>{busy ? 'Guardando…' : 'Recuperar resultado del alta'}</button>}

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <fieldset disabled={busy || preparingImage || Boolean(pending) || Boolean(storageError)} className="space-y-3.5">
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

              <div className="inventory-photo-field inventory-photo-field-create">
                {imagen ? <img src={imagen} alt="Vista de la foto elegida" /> : <span aria-hidden="true">{nombre.charAt(0).toUpperCase() || '+'}</span>}
                <div><label htmlFor="inventory-new-photo">Foto (opcional)</label><input id="inventory-new-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file=event.target.files?.[0]; if(file) void prepareCatalogImage(file,setImagen); event.target.value=''; }}/><small>Se reduce y guarda sin metadatos.</small>{imagen && <button type="button" onClick={() => setImagen(null)}>Quitar foto</button>}</div>
              </div>

              <div>
                {tipo === 'PRODUCTO' && <div className="inventory-purchase-fields mb-4"><label htmlFor="inventory-nature">Uso del artículo<select id="inventory-nature" value={naturaleza} onChange={e => { setNaturaleza(e.target.value as 'REVENTA' | 'INSUMO'); if (e.target.value === 'REVENTA') { setUnidad('PIEZA'); setPresentacionCantidad(1); } }}><option value="REVENTA">Producto de reventa</option><option value="INSUMO">Insumo operativo para servicios</option></select></label>{naturaleza === 'INSUMO' && <><label htmlFor="inventory-base-unit">Unidad base<select id="inventory-base-unit" value={unidad} onChange={e => setUnidad(e.target.value as 'PIEZA' | 'ML' | 'G')}><option value="PIEZA">Pieza</option><option value="ML">Mililitro (ml)</option><option value="G">Gramo (g)</option></select></label><label htmlFor="inventory-presentation-name">Nombre de presentación (opcional)<input id="inventory-presentation-name" maxLength={100} value={presentacionNombre} onChange={e => setPresentacionNombre(e.target.value)} placeholder="Frasco, bolsa o caja" /></label><label htmlFor="inventory-presentation-size">Cantidad base por presentación<input id="inventory-presentation-size" type="number" min={unidad === 'PIEZA' ? 1 : 0.001} max="1000000" step={unidad === 'PIEZA' ? 1 : 0.001} required value={presentacionCantidad} onChange={e => setPresentacionCantidad(Number(e.target.value))} /></label><p>Frasco de 500 ml = presentación 500 y stock inicial 500 ml. Si cuesta $100, el costo base es $100 ÷ 500 = $0.20 por ml. Stock y costos se capturan en unidad base. No cambia la unidad de artículos existentes.</p></>}</div>}
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  aria-label="Nombre del artículo"
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
                    aria-label="Categoría"
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
                      aria-label="Duración en minutos"
                      min="15"
                      max="480"
                      onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                    />
                  ) : (
                    <input
                      type="text"
                      value={sku}
                      aria-label="SKU"
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
                    min="0"
                    step="0.01"
                    value={precioVenta}
                    aria-label="Precio de venta"
                    disabled={tipo === 'PRODUCTO' && naturaleza === 'INSUMO'}
                    onChange={(e) => setPrecioVenta(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-bold focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">{naturaleza === 'INSUMO' && tipo === 'PRODUCTO' ? `Costo por ${unidad} ($)` : 'Costo unitario ($)'}</label>
                  <input
                    type="number"
                    value={costo}
                    aria-label={naturaleza === 'INSUMO' && tipo === 'PRODUCTO' ? `Costo por unidad base ${unidad}` : 'Costo unitario'}
                    min="0"
                    step={naturaleza === 'INSUMO' && tipo === 'PRODUCTO' ? '0.000001' : '0.01'}
                    onChange={(e) => setCosto(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

                <div className="col-span-2">
                  <label htmlFor="product-tax-rate" className="block text-[11px] font-medium text-stone-600 mb-1">Impuesto incluido en el precio (%)</label>
                  <input id="product-tax-rate" type="number" min="0" max="100" step="0.01" value={tasaImpuesto} onChange={e => setTasaImpuesto(Number(e.target.value))} className="w-full border border-stone-200 rounded-lg p-2 text-sm" />
                  <p className="mt-1 text-xs text-stone-500">Usa la tasa definida para este producto. El precio final no aumenta; con 0 no se desglosa impuesto.</p>
                </div>

              {tipo === 'PRODUCTO' && (
                <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Stock Inicial</label>
                    <input
                      type="number"
                      value={stockActual}
                      aria-label="Stock inicial"
                      min="0"
                      step={naturaleza === 'INSUMO' && unidad !== 'PIEZA' ? '0.001' : '1'}
                      onChange={(e) => setStockActual(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-xs text-stone-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      value={stockMinimo}
                      aria-label="Stock mínimo"
                      min="0"
                      step={naturaleza === 'INSUMO' && unidad !== 'PIEZA' ? '0.001' : '1'}
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
                  disabled={preparingImage}
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm"
                >
                  {preparingImage ? 'Preparando foto…' : 'Guardar'}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </OperationDialog>
      )}

      {/* Modal: Movimiento Kardex */}
      {showMovementModal && selectedProductForMovement && (
        <OperationDialog open={showMovementModal} busy={busy || Boolean(pending)} titleId="inventory-movement-title" className="max-w-md inventory-operation-dialog" onClose={() => setShowMovementModal(false)}>
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-luxury-in">
            <h3 id="inventory-movement-title" tabIndex={-1} className="text-base font-bold text-stone-900 mb-1">Registrar movimiento</h3>
            <p className="text-xs text-stone-500 mb-3">
              {selectedProductForMovement.nombre} (Stock actual: {selectedProductForMovement.stockActual})
            </p>
            {operationError && <p role="alert" className="inventory-operation-error">{operationError}</p>}
            {storageError && <p role="alert" className="inventory-operation-error">{storageError}</p>}
            {pending && <button disabled={busy} className="studio-button-primary mb-4" onClick={() => void submitIntent(pending)}>{busy ? 'Guardando…' : 'Recuperar resultado del movimiento'}</button>}

            <form onSubmit={handleCreateMovement} className="space-y-3">
              <fieldset disabled={busy || Boolean(pending) || Boolean(storageError)} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Tipo de Movimiento</label>
                <select
                  value={movTipo}
                  aria-label="Tipo de movimiento"
                  onChange={(e) => setMovTipo(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:bg-white"
                >
                  <option value="ENTRADA_COMPRA">Entrada por compra (+)</option>
                  <option value="MERMA_DEVOLUCION">Merma / Dañado (-)</option>
                  <option value="USO_INTERNO">Uso interno (-)</option>
                  <option value="AJUSTE_INVENTARIO">Corregir saldo contado</option>
                </select>
              </div>

              {movTipo === 'ENTRADA_COMPRA' && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={movPresentation} onChange={e => setMovPresentation(e.target.checked)} />Capturar número de presentaciones ({selectedProductForMovement.presentacionNombre || 'envases'} de {selectedProductForMovement.presentacionCantidad || 1} {selectedProductForMovement.unidad || 'PIEZA'})</label>}
              <p className="inventory-impact">{movTipo === 'AJUSTE_INVENTARIO' ? `El saldo pasará de ${selectedProductForMovement.stockActual} a ${movCantidad} ${selectedProductForMovement.unidad || 'PIEZA'}. Si cambió desde esta consulta, pediremos revisar el conteo.` : `${movTipo === 'ENTRADA_COMPRA' ? 'Entrarán' : 'Saldrán'} ${Number((movCantidad * (movPresentation && movTipo === 'ENTRADA_COMPRA' ? Number(selectedProductForMovement.presentacionCantidad || 1) : 1)).toFixed(3))} ${selectedProductForMovement.unidad || 'PIEZA'}. Saldo previsto: ${Number((Number(selectedProductForMovement.stockActual) + (movTipo === 'ENTRADA_COMPRA' ? 1 : -1) * movCantidad * (movPresentation && movTipo === 'ENTRADA_COMPRA' ? Number(selectedProductForMovement.presentacionCantidad || 1) : 1)).toFixed(3))}.`} {movTipo === 'USO_INTERNO' || movTipo === 'MERMA_DEVOLUCION' ? 'No registra una venta.' : ''} El costo de una entrada se captura por unidad base, no por envase.</p>
              {movTipo === 'ENTRADA_COMPRA' && <div className="inventory-purchase-fields"><label htmlFor="inventory-cost">Costo por unidad base de esta entrada (opcional)<input id="inventory-cost" type="number" min="0" step={selectedProductForMovement.naturaleza === 'INSUMO' ? '0.000001' : '0.01'} value={movCosto} onChange={e => setMovCosto(e.target.value)} /><span>Conserva el costo de esta entrada en el historial.</span></label><label htmlFor="inventory-provider">Proveedor (opcional)<select id="inventory-provider" value={movProveedor} onChange={e => setMovProveedor(e.target.value)}><option value="">Sin proveedor</option>{providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label><label htmlFor="inventory-reference">Documento o referencia (opcional)<input id="inventory-reference" maxLength={160} value={movReferencia} onChange={e => setMovReferencia(e.target.value)} /></label><label htmlFor="inventory-date">Fecha de la entrada (opcional)<input id="inventory-date" type="datetime-local" value={movFecha} onChange={e => setMovFecha(e.target.value)} /><span>En blanco usa la fecha de confirmación.</span></label></div>}

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Cantidad</label>
                <input
                  type="number"
                  required
                  min={movTipo === 'AJUSTE_INVENTARIO' ? 0 : selectedProductForMovement.unidad && selectedProductForMovement.unidad !== 'PIEZA' ? 0.001 : 1}
                  step={selectedProductForMovement.unidad && selectedProductForMovement.unidad !== 'PIEZA' ? '0.001' : '1'}
                  value={movCantidad}
                  aria-label={movTipo === 'AJUSTE_INVENTARIO' ? 'Saldo físico contado' : movPresentation && movTipo === 'ENTRADA_COMPRA' ? 'Número de presentaciones' : `Cantidad en ${selectedProductForMovement.unidad || 'PIEZA'}`}
                  onChange={(e) => setMovCantidad(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-bold focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Motivo</label>
                <input
                  type="text"
                  required
                  maxLength={500}
                  minLength={3}
                  value={movMotivo}
                  aria-label="Motivo del movimiento"
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
              </fieldset>
            </form>
          </div>
        </OperationDialog>
      )}

    </div>
  );
};

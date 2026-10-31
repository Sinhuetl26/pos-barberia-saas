import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Producto } from '../types';
import { financialIntentKey } from '../utils/financialIntent';
import { countInputValid } from './InventoryCounts';
type RecipeLine = { productoId: string; cantidad: string; unidad: string };
type Recipe = { id: string; version: number; items: { productoId: string; nombre: string; cantidad: number; unidad: string }[] };
type RecipeIntent = { serviceId: string; payload: { versionEsperada: number; idempotencyKey: string; items: { productoId: string; cantidad: number; unidad: string }[] } };

export function ServiceRecipes({ branchId, products }: { branchId: string; products: Producto[] }) {
  const [serviceId, setServiceId] = useState('');
  const [versions, setVersions] = useState<Recipe[]>([]);
  const [lines, setLines] = useState<RecipeLine[]>([]);
  const [supplyId, setSupplyId] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState('');
  const [pending, setPending] = useState<RecipeIntent | null>(null);
  const serial = useRef(0); const busyRef = useRef(false);
  const scope = `${api.getTenantId()}:${api.getUserId()}:${branchId}`;
  const activeScope = useRef(scope); activeScope.current = scope;
  const storageKey = `${financialIntentKey(api.getTenantId(), api.getUserId())}:recipes:${branchId}`;
  const services = products.filter(p => p.tipo === 'SERVICIO' && (p.sucursalId || api.getUserRole() === 'DUENO'));
  const supplies = products.filter(p => p.tipo === 'PRODUCTO' && p.naturaleza === 'INSUMO' && p.activo && (p.sucursalId === branchId || !p.sucursalId));
  const adopt = (data: Recipe[]) => { setVersions(data); setLines((data[0]?.items || []).map(line => ({ productoId: line.productoId, cantidad: String(line.cantidad), unidad: line.unidad }))); setDirty(false); };
  useEffect(() => {
    serial.current++; setServiceId(''); adopt([]); setPending(null); setStorageError(''); setError(''); setNotice(''); setBusy(false); busyRef.current = false;
    try { const raw = localStorage.getItem(storageKey); if (raw) { const value = JSON.parse(raw); if (typeof value.serviceId !== 'string' || !Array.isArray(value.payload?.items) || !/^[0-9a-f-]{36}$/i.test(value.payload.idempotencyKey || '')) throw new Error('invalid'); setPending(value); setServiceId(value.serviceId); } }
    catch { setStorageError('No pudimos leer la versión pendiente. Revisa el resultado antes de publicar otra receta.'); }
  }, [scope]);
  const load = async () => {
    if (!serviceId) return;
    const request = ++serial.current; const requestedScope = scope; setLoading(true); setError('');
    try { const result = await api.getServiceRecipes(serviceId); if (request === serial.current && requestedScope === activeScope.current) adopt(result); }
    catch (e: any) { if (request === serial.current && requestedScope === activeScope.current) { adopt([]); setError(e.message || 'No se pudo consultar la receta.'); } }
    finally { if (request === serial.current && requestedScope === activeScope.current) setLoading(false); }
  };
  useEffect(() => { adopt([]); void load(); return () => { serial.current++; }; }, [serviceId, scope]);
  const publish = async (intent: RecipeIntent) => {
    if (busyRef.current || storageError) return;
    try { const old = localStorage.getItem(storageKey); if (old && JSON.parse(old).payload?.idempotencyKey !== intent.payload.idempotencyKey) { setPending(JSON.parse(old)); setError('Hay otra versión pendiente. Recupera su resultado antes de continuar.'); return; } localStorage.setItem(storageKey, JSON.stringify(intent)); }
    catch { setStorageError('El navegador no pudo guardar la referencia. Libera espacio antes de publicar.'); return; }
    const requestedScope = scope; busyRef.current = true; setBusy(true); setPending(intent); setError(''); setNotice('');
    const clearOwn = () => { const raw = localStorage.getItem(storageKey); if (raw && JSON.parse(raw).payload?.idempotencyKey === intent.payload.idempotencyKey) localStorage.removeItem(storageKey); };
    try {
      await api.publishServiceRecipe(intent.serviceId, intent.payload); clearOwn();
      if (requestedScope !== activeScope.current) return;
      setPending(null); setServiceId(intent.serviceId); setNotice('Nueva versión publicada. Las atenciones realizadas conservan la receta y el costo originales.'); const latest = await api.getServiceRecipes(intent.serviceId); if (requestedScope === activeScope.current) adopt(latest);
    } catch (e: any) {
      const definitive = e.status >= 400 && e.status < 500 && Boolean(e.code) && e.code !== 'IDEMPOTENCY_CONFLICT';
      if (definitive) try { clearOwn(); } catch {}
      if (requestedScope !== activeScope.current) return;
      if (definitive) setPending(null);
      setError(`${e.message || 'No pudimos confirmar el resultado.'}${e.code === 'RECIPE_CHANGED' ? ' Recarga la versión actual; conserva o revisa tu propuesta antes de volver a publicar.' : definitive ? '' : ' Recupera la misma solicitud antes de cambiar la receta.'}`);
    } finally { if (requestedScope === activeScope.current) { busyRef.current = false; setBusy(false); } }
  };
  const blocked = busy || loading || Boolean(pending) || Boolean(storageError);
  const save = () => {
    if (lines.some(line => !line.cantidad.trim() || Number(line.cantidad) <= 0 || !countInputValid(line.cantidad, line.unidad) || !supplies.some(p => p.id === line.productoId && (p.unidad || 'PIEZA') === line.unidad))) { setError('Cada línea requiere un insumo disponible, su unidad base y una cantidad positiva: piezas enteras o hasta tres decimales en ml/g.'); return; }
    void publish({ serviceId, payload: { versionEsperada: versions[0]?.version || 0, idempotencyKey: crypto.randomUUID(), items: lines.map(line => ({ ...line, cantidad: Number(line.cantidad) })) } });
  };
  return <section className="inventory-counts inventory-recipes" aria-labelledby="inventory-recipes-title"><h2 id="inventory-recipes-title">Insumos por servicio</h2><p>Define cuánto se usa en una atención. Se descuenta al terminar la cita o al cobrar un servicio directo; cobrar después la misma cita no vuelve a descontarlo. Un reembolso de dinero no repone insumos utilizados.</p>
    {error && <p role="alert" className="inventory-operation-error">{error}</p>}{storageError && <p role="alert" className="inventory-operation-error">{storageError}</p>}{notice && <p role="status" className="inventory-operation-notice">{notice}</p>}
    {pending && <div className="inventory-recovery"><p>Versión pendiente de confirmación. Conservamos el servicio y las cantidades enviados.</p><button className="studio-button-primary" disabled={busy} onClick={() => void publish(pending)}>{busy ? 'Recuperando…' : 'Recuperar resultado'}</button></div>}
    <label htmlFor="inventory-recipe-service">Servicio<select id="inventory-recipe-service" disabled={blocked || dirty} value={serviceId} onChange={e => setServiceId(e.target.value)}><option value="">Elige un servicio</option>{services.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
    {loading && <p role="status">Consultando versiones guardadas…</p>}
    {serviceId && !loading && <><p>{versions.length ? `Versión vigente: ${versions[0].version}. ${versions[0].items.length ? 'Consumo configurado.' : 'Sin descuento de insumos para nuevas atenciones.'}` : 'Sin receta registrada. No se presume consumo ni costo cero.'}</p>
      {!supplies.length && <p>Registra primero un artículo como insumo operativo, con piezas, ml o g. Los productos de reventa no se agregan a la receta.</p>}
      <div className="inventory-count-table"><table><caption className="sr-only">Cantidad de insumo por atención</caption><thead><tr><th>Insumo</th><th>Cantidad por atención</th><th>Unidad base</th><th>Acción</th></tr></thead><tbody>{lines.map((line, index) => <tr key={line.productoId}><th scope="row">{supplies.find(p => p.id === line.productoId)?.nombre || versions[0]?.items.find(p => p.productoId === line.productoId)?.nombre || 'Insumo no disponible'}</th><td><input aria-label={`Cantidad por atención de ${supplies.find(p => p.id === line.productoId)?.nombre || line.productoId}`} type="number" min={line.unidad === 'PIEZA' ? 1 : 0.001} step={line.unidad === 'PIEZA' ? 1 : 0.001} max="1000000" disabled={blocked} value={line.cantidad} onChange={e => { setLines(old => old.map((v, i) => i === index ? { ...v, cantidad: e.target.value } : v)); setDirty(true); setError(''); }} /></td><td>{line.unidad}</td><td><button className="studio-button-secondary" disabled={blocked} onClick={() => { setLines(old => old.filter((_, i) => i !== index)); setDirty(true); setError(''); }}>Quitar de nueva versión</button></td></tr>)}</tbody></table></div>
      <div className="inventory-count-toolbar"><label htmlFor="inventory-recipe-supply">Añadir insumo<select id="inventory-recipe-supply" disabled={blocked} value={supplyId} onChange={e => setSupplyId(e.target.value)}><option value="">Selecciona un insumo</option>{supplies.filter(p => !lines.some(l => l.productoId === p.id)).map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.unidad || 'PIEZA'})</option>)}</select></label><button disabled={blocked || !supplyId || lines.some(l => l.productoId === supplyId)} className="studio-button-secondary" onClick={() => { const supply = supplies.find(p => p.id === supplyId); if (!supply) return; setLines(old => [...old, { productoId: supply.id, unidad: supply.unidad || 'PIEZA', cantidad: '1' }]); setSupplyId(''); setDirty(true); setError(''); }}>Añadir a la receta</button></div>
      <p>{lines.length ? 'Publicar crea una versión nueva; no altera consumos anteriores.' : 'Publicar una versión vacía desactiva el descuento para nuevas atenciones. El historial anterior se conserva.'}</p><div className="inventory-count-toolbar"><button className="studio-button-secondary" disabled={blocked} onClick={() => void load()}>Recargar versión guardada{dirty ? ' (descarta cambios sin publicar)' : ''}</button><button className="studio-button-primary" disabled={blocked || !dirty || Boolean(error)} onClick={save}>Publicar nueva versión</button></div>
      {versions.length > 0 && <details><summary>Historial de versiones ({versions.length})</summary>{versions.map(version => <div key={version.id} className="inventory-recipe-version"><strong>Versión {version.version}</strong><p>{version.items.length ? version.items.map(item => `${item.nombre}: ${item.cantidad} ${item.unidad}`).join('; ') : 'Consumo desactivado para nuevas atenciones'}</p></div>)}</details>}
    </>}
  </section>;
}


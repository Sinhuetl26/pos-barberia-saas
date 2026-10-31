import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Producto } from '../types';
import { financialIntentKey } from '../utils/financialIntent';
import { OperationState } from './OperationState';

type CountLine = { productoId: string; nombre: string; stockReferencia: number; cantidadContada: number | null; unidad?: string };
type Count = { id: string; version: number; estado: string; items: CountLine[]; fechaCreacion?: string };
type Intent = { kind: 'start' | 'save' | 'confirm'; id?: string; payload: any };
export function countDifference(reference: number, raw: string): number | null { return raw.trim() === '' ? null : Number((Number(raw) - Number(reference)).toFixed(3)); }
export function countInputValid(raw: string, unit = 'PIEZA') { return raw.trim() === '' || (/^\d+(?:\.\d{1,3})?$/.test(raw) && Number.isFinite(Number(raw)) && Number(raw) <= 1_000_000 && (unit !== 'PIEZA' || Number.isInteger(Number(raw)))); }

export function InventoryCounts({ branchId, products, onChanged }: { branchId: string; products: Producto[]; onChanged: () => void }) {
  const [counts, setCounts] = useState<Count[]>([]);
  const [active, setActive] = useState<Count | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [recount, setRecount] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<Intent | null>(null);
  const [storageError, setStorageError] = useState('');
  const [dirty, setDirty] = useState(false);
  const busyRef = useRef(false);
  const scopeRef = useRef('');
  const queryRef = useRef(0);
  const scope = `${api.getTenantId()}:${api.getUserId()}:${branchId}`;
  scopeRef.current = scope;
  const key = `${financialIntentKey(api.getTenantId(), api.getUserId())}:inventory-counts:${branchId}`;
  const physical = products.filter(p => p.tipo === 'PRODUCTO' && (p.sucursalId || api.getUserRole() === 'DUENO'));
  const adopt = (count: Count | null) => {
    setActive(count); setValues(Object.fromEntries((count?.items || []).map(item => [item.productoId, item.cantidadContada === null ? '' : String(item.cantidadContada)])));
    setRecount({}); setDirty(false);
  };
  const refresh = async () => {
    const query = ++queryRef.current; const currentScope = scope;
    setLoading(true);
    try { const result = await api.getInventoryCounts(branchId); if (query === queryRef.current && currentScope === scopeRef.current) { setCounts(result); return result as Count[]; } }
    catch (e: any) { if (query === queryRef.current && currentScope === scopeRef.current) setError(e.message || 'No se pudieron consultar los conteos.'); }
    finally { if (query === queryRef.current && currentScope === scopeRef.current) setLoading(false); }
  };
  useEffect(() => {
    queryRef.current++; setCounts([]); adopt(null); setChosen([]); setReason(''); setPending(null); setError(''); setNotice(''); setStorageError(''); busyRef.current = false; setBusy(false);
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const intent = JSON.parse(raw); if (!['start', 'save', 'confirm'].includes(intent.kind) || !/^[0-9a-f-]{36}$/i.test(intent.payload?.idempotencyKey || '') || (intent.kind !== 'start' && typeof intent.id !== 'string')) throw new Error('invalid'); setPending(intent); }
    } catch { setStorageError('No se pudo leer el conteo pendiente. Revisa su resultado antes de realizar otra operación.'); }
    void refresh();
    return () => { queryRef.current++; };
  }, [scope]);
  const run = async (intent: Intent) => {
    if (busyRef.current || storageError) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const previous = JSON.parse(raw); if (previous.payload?.idempotencyKey !== intent.payload.idempotencyKey) { setPending(previous); setError('Otra pestaña dejó una operación pendiente. Recupera ese resultado antes de continuar.'); return; } }
      localStorage.setItem(key, JSON.stringify(intent));
    } catch { setStorageError('No pudimos guardar la referencia. Libera espacio antes de continuar.'); return; }
    const currentScope = scope;
    const clearOwnIntent = () => { const raw = localStorage.getItem(key); if (raw && JSON.parse(raw).payload?.idempotencyKey === intent.payload.idempotencyKey) localStorage.removeItem(key); };
    busyRef.current = true; setBusy(true); setPending(intent); setError(''); setNotice('');
    try {
      const result: Count = intent.kind === 'start' ? await api.startInventoryCount(intent.payload) : intent.kind === 'save' ? await api.saveInventoryCount(intent.id!, intent.payload) : await api.confirmInventoryCount(intent.id!, intent.payload);
      clearOwnIntent();
      if (scopeRef.current !== currentScope) return;
      setPending(null); adopt(result); setNotice(intent.kind === 'confirm' ? 'Conteo confirmado. Solo se conciliaron los artículos contados; los demás conservan su saldo.' : intent.kind === 'save' ? 'Avance guardado. Todavía no se modificaron las existencias.' : 'Borrador creado. Deja en blanco los artículos que aún no contaste.');
      await refresh(); if (intent.kind === 'confirm') onChanged();
    } catch (e: any) {
      const definitive = e.status >= 400 && e.status < 500 && Boolean(e.code) && e.code !== 'IDEMPOTENCY_CONFLICT';
      if (definitive) try { clearOwnIntent(); } catch {}
      if (scopeRef.current !== currentScope) return;
      if (definitive) setPending(null);
      setError(`${e.message || 'No se pudo confirmar el resultado.'}${e.code === 'COUNT_STALE' ? ' El borrador conserva tu avance. Vuelve a contar físicamente los artículos, marca «Actualizar referencia» y guarda antes de confirmar.' : e.code === 'COUNT_CHANGED' ? ' Otro operador actualizó el borrador. Recarga su versión antes de editar o confirmar.' : definitive ? '' : ' Recupera esta misma operación; no crees otra con datos diferentes.'}`);
    } finally { if (scopeRef.current === currentScope) { busyRef.current = false; setBusy(false); } }
  };
  const blocked = busy || Boolean(pending) || Boolean(storageError);
  const save = () => {
    if (!active || !active.items.every(item => countInputValid(values[item.productoId] || '', item.unidad || 'PIEZA'))) { setError('Usa piezas enteras o hasta tres decimales en ml/g, sin superar un millón. En blanco significa no contado.'); return; }
    void run({ kind: 'save', id: active.id, payload: { idempotencyKey: crypto.randomUUID(), versionEsperada: active.version, items: active.items.map(item => ({ productoId: item.productoId, cantidadContada: values[item.productoId]?.trim() ? Number(values[item.productoId]) : null, ...(recount[item.productoId] ? { recontar: true } : {}) })) } });
  };
  return <section className="inventory-counts" aria-labelledby="inventory-counts-title">
    <h2 id="inventory-counts-title">Conteo físico</h2><p>Cuenta lo que tienes, guarda tu avance y revisa las diferencias antes de conciliar. Un espacio en blanco nunca se interpreta como cero.</p>
    {loading && <OperationState busy title="Consultando conteos">Buscando borradores y resultados de esta sucursal.</OperationState>}
    {error && <p role="alert" className="inventory-operation-error">{error}</p>}{storageError && <p role="alert" className="inventory-operation-error">{storageError}</p>}{notice && <p role="status" className="inventory-operation-notice">{notice}</p>}
    {pending && <div className="inventory-recovery"><p>Hay una operación de conteo pendiente de resultado. Los datos enviados permanecen guardados.</p><button disabled={busy} className="studio-button-primary" onClick={() => void run(pending)}>{busy ? 'Recuperando…' : 'Recuperar resultado'}</button></div>}
    <div className="inventory-count-toolbar"><label htmlFor="inventory-count-selection">Conteo guardado<select id="inventory-count-selection" disabled={blocked || dirty || loading} value={active?.id || ''} onChange={e => adopt(counts.find(c => c.id === e.target.value) || null)}><option value="">Preparar nuevo conteo</option>{counts.map(c => <option value={c.id} key={c.id}>{c.estado === 'CONFIRMADO' ? 'Confirmado' : 'Borrador'} · {c.id.slice(0, 8)}</option>)}</select></label><button disabled={blocked || loading} className="studio-button-secondary" onClick={async () => { const latest = await refresh(); if (latest && active) adopt(latest.find(c => c.id === active.id) || null); }}>Recargar versión guardada{dirty ? ' (descarta cambios sin guardar)' : ''}</button></div>
    {!active && <div><fieldset disabled={blocked || loading}><legend>Elige los artículos de este conteo parcial</legend><div className="inventory-count-products">{physical.map(p => <label key={p.id}><input type="checkbox" checked={chosen.includes(p.id)} onChange={e => setChosen(old => e.target.checked ? [...old, p.id] : old.filter(id => id !== p.id))} />{p.nombre}</label>)}</div></fieldset><button disabled={blocked || loading || !chosen.length} className="studio-button-primary" onClick={() => void run({ kind: 'start', payload: { sucursalId: branchId, productoIds: chosen, idempotencyKey: crypto.randomUUID() } })}>Crear borrador con {chosen.length} artículos</button></div>}
    {active && <><p>Estado: <strong>{active.estado === 'CONFIRMADO' ? 'Confirmado' : 'Borrador'}</strong> · Versión {active.version}. {dirty ? 'Tienes cantidades sin guardar.' : 'Avance guardado.'}</p><div className="inventory-count-table"><table><caption className="sr-only">Artículos contados y diferencia con el saldo de referencia</caption><thead><tr><th>Artículo</th><th>Saldo de referencia</th><th>Conteo físico</th><th>Diferencia</th><th>Nuevo recuento</th></tr></thead><tbody>{active.items.map(item => { const difference = countDifference(item.stockReferencia, values[item.productoId] || ''); return <tr key={item.productoId}><th scope="row">{item.nombre}<span className="block text-xs font-normal">{item.unidad || 'PIEZA'}</span></th><td>{item.stockReferencia}</td><td><input aria-label={`Conteo físico de ${item.nombre}`} type="number" min="0" max="1000000" step={item.unidad && item.unidad !== 'PIEZA' ? '0.001' : '1'} placeholder="No contado" disabled={blocked || active.estado === 'CONFIRMADO'} value={values[item.productoId] || ''} onChange={e => { setValues(old => ({ ...old, [item.productoId]: e.target.value })); setDirty(true); }} /></td><td>{difference === null ? 'No contado' : Number.isFinite(difference) ? `${difference > 0 ? '+' : ''}${difference}` : 'Revisa cantidad'}</td><td>{active.estado !== 'CONFIRMADO' && <label><input type="checkbox" disabled={blocked} checked={Boolean(recount[item.productoId])} onChange={e => { setRecount(old => ({ ...old, [item.productoId]: e.target.checked })); setDirty(true); }} />Actualizar referencia de {item.nombre}</label>}</td></tr>; })}</tbody></table></div>
    {active.estado !== 'CONFIRMADO' && <div className="inventory-count-actions"><p>Marca «Actualizar referencia» únicamente después de volver a contar físicamente ese artículo. Si hubo ventas o entradas desde la referencia, la confirmación exigirá recuento.</p><button disabled={blocked || !dirty} className="studio-button-secondary" onClick={save}>Guardar avance</button><label htmlFor="inventory-count-reason">Motivo de conciliación (al menos 3 caracteres)<input id="inventory-count-reason" disabled={blocked} minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe el conteo y las diferencias" /></label><button disabled={blocked || dirty || reason.trim().length < 3 || !active.items.some(i => i.cantidadContada !== null)} className="studio-button-primary" onClick={() => void run({ kind: 'confirm', id: active.id, payload: { motivo: reason.trim(), versionEsperada: active.version, idempotencyKey: crypto.randomUUID() } })}>Confirmar conciliación de artículos contados</button></div>}</>}
  </section>;
}


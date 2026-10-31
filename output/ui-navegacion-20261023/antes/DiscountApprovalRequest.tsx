import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

type Approval = { id: string; estado: string; expiraEn?: string; aprobadoPorNombre?: string };
type PendingApproval = { context: string; body: any };
export function approvalCanBeRenewed(row: Approval, now = Date.now()) {
  return ['RECHAZADA', 'USADA'].includes(row.estado) || row.estado === 'APROBADA'
    && (!row.expiraEn || !Number.isFinite(Date.parse(row.expiraEn)) || Date.parse(row.expiraEn) <= now);
}
export function discountApprovalLabel(row: Approval, now = Date.now()) {
  if (row.estado === 'APROBADA' && approvalCanBeRenewed(row, now)) return 'Autorización vencida';
  return ({ PENDIENTE: 'Pendiente de revisión', APROBADA: 'Autorizada', RECHAZADA: 'Rechazada', USADA: 'Ya utilizada' } as Record<string, string>)[row.estado] || 'Requiere revisión';
}
export function DiscountApprovalRequest({ cart, reason, onApproved, onLock }: { cart: any; reason: string; onApproved: (approval: { id: string; context: string } | null) => void; onLock: (locked: boolean) => void }) {
  const context = JSON.stringify({ cart, reason: reason.trim() });
  const key = `systech:discount-request:${api.getTenantId()}:${api.getUserId()}:${cart.sucursalId}`;
  const activeKey = useRef(key); activeKey.current = key;
  const [row, setRow] = useState<Approval | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingApproval | null>(null), [storageError, setStorageError] = useState('');
  const requestContext = useRef(context); requestContext.current = context;
  const callbacks = useRef({ onApproved, onLock }); callbacks.current = { onApproved, onLock };
  const busyRef = useRef(false), serial = useRef(0);
  useEffect(() => {
    setRow(null); setError(''); callbacks.current.onApproved(null);
    return () => { serial.current++; };
  }, [context]);
  useEffect(() => {
    serial.current++; busyRef.current = false; setBusy(false); setPending(null); setStorageError('');
    try { const raw = localStorage.getItem(key); if (raw) { const saved = JSON.parse(raw); if (typeof saved.context !== 'string' || saved.body?.carrito?.sucursalId !== cart.sucursalId || typeof saved.body?.idempotencyKey !== 'string') throw new Error(); setPending(saved); } }
    catch { setStorageError('No pudimos leer la solicitud pendiente. Revisa las autorizaciones con el dueño antes de crear otra.'); }
  }, [key]);
  useEffect(() => { callbacks.current.onLock(busy || Boolean(pending) || Boolean(storageError)); return () => { callbacks.current.onLock(false); }; }, [busy, pending, storageError]);
  const send = async (intent: PendingApproval) => {
    if (busyRef.current) return;
    try { const stored = localStorage.getItem(key); if (stored && JSON.parse(stored).body.idempotencyKey !== intent.body.idempotencyKey) { setPending(JSON.parse(stored)); setError('Otra pestaña dejó una solicitud pendiente. Recupera esa solicitud primero.'); return; } localStorage.setItem(key, JSON.stringify(intent)); }
    catch { setStorageError('No se pudo guardar la referencia de solicitud. No la enviamos.'); return; }
    busyRef.current = true; setBusy(true); setPending(intent); setError(''); const request = ++serial.current;
    const clearOwn = () => { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved?.body.idempotencyKey === intent.body.idempotencyKey) localStorage.removeItem(key); };
    try {
      const result = await api.requestDiscountApproval(intent.body); clearOwn();
      if (key !== activeKey.current) return;
      setPending(null);
      if (request === serial.current && requestContext.current === intent.context) setRow(result);
      else setError('Recuperamos la solicitud anterior. El carrito actual es distinto y requiere su propia revisión.');
    } catch (err: any) {
      if (err.status >= 400 && err.status < 500 && err.code !== 'IDEMPOTENCY_CONFLICT') { try { clearOwn(); if (key === activeKey.current) setPending(null); } catch { /* Keep recovery reference. */ } }
      if (key !== activeKey.current) return;
      setError(err.message || 'El resultado no está confirmado. Recupera la misma solicitud antes de crear otra.');
    } finally { if (key === activeKey.current) { busyRef.current = false; setBusy(false); } }
  };
  const refresh = async () => {
    if (!row || busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); const request = ++serial.current;
    try {
      const rows: Approval[] = await api.getDiscountApprovals(cart.sucursalId); const found = rows.find(v => v.id === row.id);
      if (request !== serial.current) return;
      if (!found) { setError('Esta autorización ya no está disponible para tu cuenta.'); callbacks.current.onApproved(null); return; }
      setRow(found);
      const valid = found.estado === 'APROBADA' && found.expiraEn && new Date(found.expiraEn) > new Date();
      callbacks.current.onApproved(valid ? { id: found.id, context } : null);
    } catch (err: any) { if (request === serial.current) { callbacks.current.onApproved(null); setError(err.message || 'No pudimos verificar la autorización.'); } }
    finally { if (key === activeKey.current) { busyRef.current = false; setBusy(false); } }
  };
  return <section className="discount-approval rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4" aria-label="Autorización de descuento" aria-busy={busy} data-state={storageError ? 'storage-error' : pending ? 'recovering' : row?.estado || 'new'}><h4 className="font-semibold text-sm">Este descuento necesita autorización</h4><p className="mt-1 text-xs">Otra cuenta de dueño o gerente debe revisarlo. Si cambias el ticket o el método de pago, se revisa de nuevo.</p>
    {error && <p role="alert" className="mt-2 text-sm text-rose-800">{error}</p>}{storageError && <p role="alert" className="mt-2 text-sm text-rose-800">{storageError}</p>}
    {pending ? <button type="button" disabled={busy} className="studio-button-secondary mt-3" onClick={() => void send(pending)}>{busy ? 'Consultando…' : 'Recuperar solicitud pendiente'}</button> : row ? <><p role="status" className="mt-2 text-sm">Estado: {discountApprovalLabel(row)}{row.expiraEn && Number.isFinite(Date.parse(row.expiraEn)) ? ` · Vence ${new Date(row.expiraEn).toLocaleTimeString('es-MX')}` : ''}</p><button type="button" disabled={busy} className="studio-button-secondary mt-3" onClick={() => void refresh()}>Comprobar autorización</button></> : <button type="button" disabled={busy || Boolean(storageError) || reason.trim().length < 3} className="studio-button-secondary mt-3" onClick={() => void send({ context, body: { carrito: cart, motivo: reason.trim(), idempotencyKey: crypto.randomUUID() } })}>Solicitar autorización al dueño o gerente</button>}
    {row && approvalCanBeRenewed(row) && !pending && <button type="button" disabled={busy} className="studio-button-secondary mt-3" onClick={() => { serial.current++; setRow(null); setError(''); callbacks.current.onApproved(null); }}>Preparar una nueva solicitud</button>}
    {reason.trim().length < 3 && <p className="mt-2 text-xs">Vuelve al ticket y explica el motivo del descuento antes de solicitarlo.</p>}
  </section>;
}

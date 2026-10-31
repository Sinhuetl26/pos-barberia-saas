import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { ChevronRight } from 'lucide-react';
import { OperationState } from './OperationState';
import { OperationDialog } from './OperationDialog';
import '../styles/cash-workspace.css';

export function cashHandoffAmount(raw: string, balance: number) {
  const amount = Number(raw);
  if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(amount) || !Number.isFinite(balance) || amount <= 0 || amount > balance) throw new Error('Indica el importe recibido, mayor que cero y sin superar el saldo, con hasta dos decimales.');
  return amount;
}

export function CashCustody({ branchId, barber, cashOpen = true }: { branchId: string; barber: boolean; cashOpen?: boolean }) {
  const [data, setData] = useState<any>({ saldos: [], movimientos: [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedHolder, setSelectedHolder] = useState<string | null>(null);
  const [review, setReview] = useState<{ usuarioId: string; nombre: string; raw: string; scope: string } | null>(null);
  const scope = `${api.getTenantId()}:${api.getUserId()}:${branchId}`;
  const activeScope = useRef(scope); activeScope.current = scope;
  const readPending = () => { try { return api.pendingFinancial(); } catch { return { path: 'unknown', body: {} }; } };
  useEffect(() => {
    setData({ saldos: [], movimientos: [] });
    setLoaded(false);
    setError('');
    setAmounts({}); setSelectedHolder(null); setReview(null); setPending(Boolean(readPending())); setBusy(false); sending.current = false;
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { if (!document.hidden) { const result = await api.getCashCustody(branchId); if (!stopped) { setData(result); setLoaded(true); setPending(Boolean(readPending())); } } }
      catch (e: any) { if (!stopped) setError(e.message); }
      finally { if (!stopped) timer = setTimeout(poll, 5000); }
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [scope, barber]);
  function reviewReceipt(row: any) {
    try {
      const raw = String(amounts[row.usuarioId] ?? row.saldo);
      cashHandoffAmount(raw, Number(row.saldo));
      setError(''); setReview({ usuarioId: row.usuarioId, nombre: row.nombre, raw, scope });
    } catch (e: any) { setError(e.message); }
  }
  async function receive(row?: any, recover = false) {
    if (sending.current) return;
    const requestedScope = scope;
    sending.current = true; setBusy(true); setError('');
    try {
      if (recover) {
        const saved = readPending();
        if (!saved || saved.body?.sucursalId !== branchId || saved.path !== '/cortes-caja/entrega') throw new Error('La operación pendiente corresponde a otro proceso. Recupérala desde el aviso general.');
        await api.recoverFinancial();
      } else {
        if (!cashOpen || !review || review.scope !== scope || pending || readPending()) throw new Error('Actualiza la revisión antes de registrar la entrega.');
        const current = data.saldos.find((holder: any) => holder.usuarioId === review.usuarioId);
        if (!current || current.nombre !== review.nombre) throw new Error('La persona o el saldo cambió. Vuelve a revisar la entrega.');
        row = current;
        const amount = cashHandoffAmount(review.raw, Number(current.saldo));
        await api.receiveCash({ sucursalId: branchId, usuarioId: row.usuarioId, monto: amount });
      }
      if (requestedScope !== activeScope.current) return;
      setReview(null);
      if (row)
      setAmounts(previous => { const next = { ...previous }; delete next[row.usuarioId]; return next; });
      const refreshed = await api.getCashCustody(branchId);
      if (requestedScope === activeScope.current) { setData(refreshed); setPending(Boolean(readPending())); setLoaded(true); }
    }
    catch (e: any) { if (requestedScope === activeScope.current) { setError(e.message); setPending(Boolean(readPending())); } }
    finally { if (requestedScope === activeScope.current) { sending.current = false; setBusy(false); } }
  }
  return <section id={`cash-custody-${branchId}`} tabIndex={-1} className="cash-custody operation-page studio-panel p-4 sm:p-6 mb-6">
    <OperationDialog open={Boolean(review)} busy={busy} titleId="cash-receipt-review-title" onClose={() => setReview(null)}>
      <div className="cash-receipt-review">
        <h2 id="cash-receipt-review-title" tabIndex={-1}>Revisar entrega de efectivo</h2>
        <p>Confirma únicamente el dinero que ya recibiste físicamente.</p>
        <dl><div><dt>Recibido de</dt><dd>{review?.nombre}</dd></div><div><dt>Importe</dt><dd>${Number(review?.raw || 0).toFixed(2)} MXN</dd></div></dl>
        {error && <p role="alert" className="operation-error">{error}</p>}
        <div className="cash-review-actions"><button disabled={busy} className="studio-button-secondary" onClick={() => setReview(null)}>Volver a editar</button><button disabled={busy || pending || !cashOpen} className="studio-button" onClick={() => void receive()}>{busy ? 'Registrando…' : 'Confirmar recepción'}</button></div>
      </div>
    </OperationDialog>
    <div className="cash-custody-heading"><h2>{barber ? 'Efectivo por entregar' : 'Efectivo con el equipo'}</h2><p className="sr-only">{barber ? 'Pendiente de entregar a caja.' : 'Dinero pendiente de entregar a caja.'}</p></div>
    {pending && !barber && <div role="status" className="operation-error"><p>Hay una operación financiera pendiente. Recupera el resultado original antes de registrar otra entrega.</p><button disabled={busy} className="studio-button-secondary" onClick={() => void receive(undefined, true)}>Recuperar entrega pendiente</button></div>}
    {!loaded && !error && <OperationState busy title="Consultando custodia">Cargando los saldos de esta sucursal.</OperationState>}
    {data.saldos.filter((r: any) => r.saldo > 0).map((row: any) => <div key={row.usuarioId} className="cash-person">
      {barber ? <div className="cash-person-readonly"><span>{row.nombre}</span><strong>${Number(row.saldo).toFixed(2)}</strong></div> : <button type="button" className="cash-person-select" aria-label={`Ver entrega de ${row.nombre}, $${Number(row.saldo).toFixed(2)} MXN`} aria-expanded={selectedHolder === row.usuarioId} aria-controls={`cash-person-${row.usuarioId}`} disabled={busy} onClick={() => setSelectedHolder(selectedHolder === row.usuarioId ? null : row.usuarioId)}>
        <span>{row.nombre}</span><strong>${Number(row.saldo).toFixed(2)}</strong><ChevronRight className="cash-person-chevron" size={20} aria-hidden="true" />
      </button>}
      {!barber && selectedHolder === row.usuarioId && <div id={`cash-person-${row.usuarioId}`} className="cash-person-form">
        {cashOpen ? <><label>¿Cuánto recibiste?<input aria-label={`Efectivo recibido de ${row.nombre}`} disabled={busy || pending} type="number" min="0.01" max={row.saldo} step="0.01" value={amounts[row.usuarioId] ?? row.saldo} onChange={e => setAmounts({ ...amounts, [row.usuarioId]: e.target.value })} className="studio-input" /></label><button disabled={busy || pending} onClick={() => reviewReceipt(row)} className="studio-button">Revisar entrega</button></> : <p>Abre caja primero para recibir esta entrega.</p>}
      </div>}
    </div>)}
    {loaded && !error && !data.saldos.some((r: any) => r.saldo > 0) && <OperationState title="Sin efectivo pendiente de entregar">Las ventas y entregas registradas no dejan saldo bajo custodia.</OperationState>}
    {error && <div role="alert" className="operation-error"><div><p className="font-semibold">No pudimos actualizar la custodia</p><p className="mt-1">{error}</p><p className="mt-2">Conserva esta pestaña y revisa el resultado antes de volver a registrar una entrega.</p></div></div>}
    <details className="border-t border-stone-200 pt-3 mt-4"><summary className="text-sm cursor-pointer font-semibold">Ver movimientos</summary><div className="max-h-56 overflow-y-auto mt-2 space-y-2">{data.movimientos.map((m: any) => <p key={m.id} className="text-sm border-b py-3">{new Date(m.fecha).toLocaleString('es-MX')} · {m.concepto} · <span className="tabular-nums font-semibold">${Number(m.monto).toFixed(2)}</span></p>)}{loaded && !error && data.movimientos.length === 0 && <p className="operation-muted text-sm py-3">Aún no hay movimientos de custodia registrados.</p>}</div></details>
  </section>;
}

import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { OperationDialog } from './OperationDialog';
import { OperationState } from './OperationState';
import { cashMovementAmount, cashMovementConfirmed, cashMovementLabels, cashMovementPending, CashMovementDraft, CashMovementType } from '../utils/cashMovement';
import '../styles/cash-movement.css';

function readPending() { try { return api.pendingFinancial(); } catch { return { path: 'unknown', body: {} }; } }

export function CashMovementDialog({ branchId, branchName, onClose, onSaved }: { branchId: string; branchName: string; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<CashMovementType>('GASTO_MENOR');
  const [raw, setRaw] = useState('');
  const [reason, setReason] = useState('');
  const [cutId, setCutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [review, setReview] = useState<CashMovementDraft | null>(null);
  const [pending, setPending] = useState(readPending);
  const [result, setResult] = useState<CashMovementDraft | null>(null);
  const [needsReview, setNeedsReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const alive = useRef(true);
  const request = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const pendingState = cashMovementPending(pending, branchId);
  const locked = pendingState !== 'ready';
  const summary = result || (pendingState === 'recover' ? pending!.body as CashMovementDraft : review);
  useEffect(() => { heading.current?.focus(); }, [review, pendingState, result, needsReview, error]);

  async function loadCut() {
    const serial = ++request.current;
    setLoading(true); setLoadError(''); setCutId(null);
    try { const cuts = await api.getCortesCaja(branchId); if (alive.current && serial === request.current) setCutId(cuts.find((cut: any) => cut.estado === 'ABIERTO')?.id || null); }
    catch { if (alive.current && serial === request.current) setLoadError('No pudimos consultar el turno. Reintenta antes de registrar efectivo.'); }
    finally { if (alive.current && serial === request.current) setLoading(false); }
  }
  useEffect(() => { alive.current = true; void loadCut(); return () => { alive.current = false; request.current++; }; }, [branchId]);

  function prepare(event: React.FormEvent) {
    event.preventDefault(); setError('');
    try {
      if (readPending()) { setPending(readPending()); throw new Error('Comprueba la operación pendiente antes de registrar otra.'); }
      if (!cutId || loading || loadError) throw new Error('Consulta primero el turno abierto.');
      if (!reason.trim() || reason.length > 500) throw new Error('Indica el motivo, de hasta 500 caracteres.');
      setReview({ sucursalId: branchId, corteCajaId: cutId, tipo: type, monto: cashMovementAmount(raw), concepto: reason.trim() });
    } catch (e: any) { setError(e.message); }
  }
  async function save(recover = false) {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try {
      const saved = readPending(), state = cashMovementPending(saved, branchId);
      if (recover ? state !== 'recover' : state !== 'ready' || !review) throw new Error('Revisa la operación pendiente antes de continuar.');
      const draft = recover ? saved!.body as CashMovementDraft : review!;
      const confirmed = recover ? await api.recoverFinancial() : await api.registrarMovimientoCaja(draft);
      if (!alive.current) return;
      if (!cashMovementConfirmed(confirmed, draft)) { setNeedsReview(true); throw new Error('El resultado requiere revisión. Consulta el historial de caja antes de registrar otro movimiento.'); }
      setResult(draft); setReview(null); setPending(null); onSaved();
    } catch (e: any) {
      if (alive.current) {
        setPending(readPending());
        setError(e.status === 0 || ['TypeError', 'AbortError'].includes(e.name) ? 'No recibimos la confirmación. Comprueba el mismo movimiento antes de repetirlo.' : e.message || 'No pudimos confirmar el movimiento.');
        if (['CASH_CHANGED', 'CASH_CLOSED'].includes(e.code)) { setReview(null); void loadCut(); }
      }
    } finally { sending.current = false; if (alive.current) setBusy(false); }
  }

  return <OperationDialog open busy={busy} titleId="cash-movement-title" onClose={onClose}><section className="cash-movement-dialog">
    <header><div><h3 ref={heading} id="cash-movement-title" tabIndex={-1}>{result ? 'Movimiento guardado' : needsReview ? 'Movimiento por revisar' : pendingState === 'blocked' ? 'Operación pendiente' : locked ? 'Movimiento por comprobar' : review ? 'Confirmar movimiento' : 'Movimiento de caja'}</h3><p>{branchName}</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="Cerrar movimiento de caja">Cerrar</button></header>
    {error && <p role="alert" className="cash-movement-error">{error}</p>}
    {summary && <dl className="cash-movement-summary"><div><dt>{cashMovementLabels[summary.tipo]}</dt><dd>{summary.tipo === 'INGRESO_EXTRA' ? '+' : '−'}${Number(summary.monto).toFixed(2)}</dd></div><div><dt>Motivo</dt><dd>{summary.concepto}</dd></div></dl>}
    {needsReview ? <OperationState title="Revisa el historial de caja">El resultado recibido está incompleto. No registres otro movimiento para sustituirlo.</OperationState>
      : result ? <><p role="status">El movimiento quedó registrado en caja.</p><div className="cash-movement-actions"><button className="cash-movement-primary" onClick={onClose}>Listo</button></div></>
      : locked ? <><p>{pendingState === 'recover' ? 'Conservamos el importe y la referencia originales.' : 'Hay otra operación pendiente. Comprueba su resultado desde el aviso superior antes de continuar.'}</p>{pendingState === 'recover' && <div className="cash-movement-actions"><button disabled={busy} className="cash-movement-primary" onClick={() => void save(true)}>{busy ? 'Comprobando…' : 'Comprobar movimiento'}</button></div>}</>
      : loading ? <OperationState busy title="Consultando caja">Un momento…</OperationState>
      : loadError ? <OperationState title="Caja sin actualizar" action={<button onClick={() => void loadCut()}>Reintentar</button>}>{loadError}</OperationState>
      : !cutId ? <OperationState title="Caja cerrada" action={<button onClick={() => void loadCut()}>Actualizar turno</button>}>Abre un turno en Caja y cierres para registrar efectivo.</OperationState>
      : review ? <><p>{review.tipo === 'INGRESO_EXTRA' ? 'Este efectivo entra a la caja.' : 'Este efectivo sale de la caja.'}</p><div className="cash-movement-actions"><button disabled={busy} onClick={() => { setReview(null); setError(''); }}>Modificar</button><button disabled={busy} className="cash-movement-primary" onClick={() => void save()}>{busy ? 'Guardando…' : 'Confirmar movimiento'}</button></div></>
      : <form onSubmit={prepare} aria-busy={busy}><fieldset disabled={busy}><legend>¿Qué vas a registrar?</legend><div className="cash-movement-types">{(Object.keys(cashMovementLabels) as CashMovementType[]).map(key => <button key={key} type="button" aria-pressed={type === key} onClick={() => setType(key)}>{cashMovementLabels[key]}</button>)}</div><label htmlFor="cash-movement-amount">Importe (MXN)<input id="cash-movement-amount" inputMode="decimal" required autoComplete="off" placeholder="0.00" value={raw} onChange={event => setRaw(event.target.value)} /></label><label htmlFor="cash-movement-reason">Motivo<input id="cash-movement-reason" required maxLength={500} placeholder="Ej. Compra de agua" value={reason} onChange={event => setReason(event.target.value)} /></label></fieldset><div className="cash-movement-actions"><button type="button" onClick={onClose}>Cancelar</button><button type="submit" className="cash-movement-primary">Revisar movimiento</button></div></form>}
  </section></OperationDialog>;
}

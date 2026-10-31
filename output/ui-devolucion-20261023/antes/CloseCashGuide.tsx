import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { branchToday } from '../utils/branchTime';
import { OperationDialog } from './OperationDialog';
import '../styles/close-cash-guide.css';
export const denominationCents: Record<string, number> = { '1000': 100000, '500': 50000, '200': 20000, '100': 10000, '50': 5000, '20': 2000, moneda20: 2000, moneda10: 1000, moneda5: 500, moneda2: 200, moneda1: 100, moneda05: 50 };
export function physicalCashCents(counts: Record<string, string>) {
  let result = 0;
  for (const [key, raw] of Object.entries(counts)) {
    if (!raw.trim()) continue;
    if (!(key in denominationCents) || !/^\d+$/.test(raw) || Number(raw) > 1_000_000) throw new Error('Indica cantidades enteras no negativas de billetes y monedas.');
    result += Number(raw) * denominationCents[key];
  }
  if (!Number.isSafeInteger(result) || result > 100_000_000_000) throw new Error('El conteo está fuera de rango.');
  return result;
}
export function confirmedCashDifference(result: any): number | null {
  if (result?.corte?.estado !== 'CERRADO' || !result?.resumen) return null;
  return cashSummaryDifference(result.resumen);
}
export function cashSummaryDifference(summary: any): number | null {
  if (!summary) return null;
  const { efectivoEsperado, conteoReal, descuadre } = summary;
  if ([efectivoEsperado, conteoReal, descuadre].some(value => typeof value !== 'number' || !Number.isFinite(value))) return null;
  return Math.round((conteoReal - efectivoEsperado) * 100) === Math.round(descuadre * 100) ? descuadre : null;
}
export function validCashPreview(preview: any, cutId: string, count: number, notes: string, now = Date.now()) {
  return preview?.lectura === true && preview.corteId === cutId && typeof preview.previsualizacionToken === 'string'
    && preview.previsualizacionToken.length > 0 && typeof preview.conteoDeclarado === 'number'
    && Math.round(preview.conteoDeclarado * 100) === Math.round(count * 100)
    && preview.notasCierre === notes && cashSummaryDifference(preview.resumen) !== null
    && Number.isFinite(Date.parse(preview.expiraEn)) && Date.parse(preview.expiraEn) > now;
}

export function CloseCashGuide({ open, cut, branchId, zone, onClose, onClosed, onGoToCustody }: { open: boolean; cut: { id: string } | null; branchId: string; zone: string; onClose: () => void; onClosed: () => void; onGoToCustody: () => void }) {
  const [snapshot, setSnapshot] = useState<{ id: string } | null>(null);
  const [step, setStep] = useState(1);
  const [preflight, setPreflight] = useState<any>(null);
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [printing, setPrinting] = useState(false);
  const opened = useRef(''); const serial = useRef(0); const sending = useRef(false);
  const scope = `${api.getTenantId()}:${api.getUserId()}:${branchId}`; const activeScope = useRef(scope); activeScope.current = scope;
  let amount = 0, countError = '';
  try { amount = physicalCashCents(counts) / 100; } catch (e: any) { countError = e.message; }
  const readPending = () => { try { return api.pendingFinancial(); } catch { return { path: 'unknown', body: {} }; } };
  const loadPreflight = async () => {
    const request = ++serial.current; setLoading(true); setPreflight(null); setError('');
    try { const [custody, appointments] = await Promise.all([api.getCashCustody(branchId), api.getCitas({ sucursalId: branchId, fecha: branchToday(zone) })]); if (request === serial.current) setPreflight({ custody: custody.saldos.filter((row: any) => Number(row.saldo) > 0), appointments: appointments.filter((appointment: any) => !appointment.venta && ['EN_CURSO', 'COMPLETADA'].includes(appointment.estado)) }); }
    catch (e: any) { if (request === serial.current) setError(e.message || 'No pudimos revisar los pendientes. Reintenta antes de confirmar el cierre.'); }
    finally { if (request === serial.current) setLoading(false); }
  };
  useEffect(() => {
    if (open && opened.current !== scope) { sending.current = false; setBusy(false); setSnapshot(cut); setStep(1); setReviewed(false); setCounts({}); setNotes(''); setResult(null); setPreview(null); setError(''); setPending(Boolean(readPending())); void loadPreflight(); }
    opened.current = open ? scope : '';
    if (!open) serial.current++;
    return () => { serial.current++; };
  }, [open, scope]);
  const accept = (confirmed: any) => {
    if (confirmedCashDifference(confirmed) === null) { setResult(confirmed); setStep(3); setPending(Boolean(readPending())); setError('El resultado recibido requiere revisión: no mostraremos una comparación incompleta. Consulta el historial antes de volver a cerrar.'); if (confirmed?.corte?.estado === 'CERRADO') onClosed(); return; }
    setResult(confirmed); setPreview(null); setPending(false); setError(''); setStep(4); onClosed();
  };
  const reviewCount = async () => {
    if (sending.current || !snapshot || countError || pending) return;
    const requestedScope = scope, request = ++serial.current; sending.current = true; setBusy(true); setError(''); setPreview(null);
    try {
      const reviewed = await api.previewCashClose(snapshot.id, amount, notes.trim());
      if (request !== serial.current || requestedScope !== activeScope.current) return;
      if (!validCashPreview(reviewed, snapshot.id, amount, notes.trim())) throw new Error('La comparación recibida está incompleta o vencida. Revisa el conteo sin confirmar el cierre.');
      setPreview(reviewed); setStep(3);
    } catch (e: any) { if (request === serial.current && requestedScope === activeScope.current) setError(e.message || 'No pudimos revisar el conteo. El turno sigue abierto.'); }
    finally { if (requestedScope === activeScope.current) { sending.current = false; setBusy(false); } }
  };
  const close = async (recover = false) => {
    if (sending.current || !snapshot) return;
    sending.current = true; setBusy(true); setError(''); const requestedScope = scope;
    try {
      const saved = readPending();
      if (recover && (saved?.path !== '/cortes-caja/cerrar' || saved.body?.corteId !== snapshot.id)) throw new Error('Hay otra operación financiera pendiente. Recupérala desde el aviso general antes de cerrar este turno.');
      if (!recover && !validCashPreview(preview, snapshot.id, amount, notes.trim())) { setPreview(null); setStep(2); throw new Error('La comparación venció o cambió el conteo. Revisa otra vez antes de confirmar.'); }
      if (!recover && cashSummaryDifference(preview.resumen) !== 0 && notes.trim().length < 3) throw new Error('Describe la diferencia observada antes de confirmar el cierre.');
      const confirmed = recover ? await api.recoverFinancial() : await api.cerrarCorteCaja(snapshot.id, preview.conteoDeclarado, preview.notasCierre, preview.previsualizacionToken);
      if (requestedScope === activeScope.current) accept(confirmed);
    } catch (e: any) { if (requestedScope === activeScope.current) { setPending(Boolean(readPending())); if (['CASH_PREVIEW_CHANGED', 'CASH_PREVIEW_EXPIRED'].includes(e.code)) { setPreview(null); setStep(2); } setError(e.message || 'No pudimos confirmar el resultado. Recupera la misma operación antes de intentar otro cierre.'); } }
    finally { if (requestedScope === activeScope.current) { sending.current = false; setBusy(false); } }
  };
  const comparison = result || preview;
  const difference = result ? confirmedCashDifference(result) : preview?.lectura ? cashSummaryDifference(preview.resumen) : null;
  return <OperationDialog open={open} busy={busy || printing} titleId="cash-guide-title" onClose={onClose} className="max-w-2xl close-cash-guide-dialog"><section className="close-cash-guide"><div className="close-cash-guide-heading"><h2 id="cash-guide-title" tabIndex={-1}>Cerrar turno de caja</h2><button type="button" disabled={busy || printing} className="studio-button-secondary" onClick={onClose}>Cerrar ventana</button></div><ol className="close-cash-guide-steps" aria-label="Pasos del cierre">{['Revisar pendientes', 'Contar efectivo', 'Comparar cierre', 'Comprobante'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined}>{index + 1}. {label}</li>)}</ol>
    {error && <p role="alert" className="cash-guide-error">{error}</p>}{pending && <div className="cash-guide-pending"><p>Una operación financiera tiene resultado pendiente. Sus importes y referencia se conservan; no cambies el conteo para crear otro cierre.</p><button type="button" disabled={busy} className="studio-button-primary" onClick={() => void close(true)}>{busy ? 'Recuperando…' : 'Recuperar resultado del mismo cierre'}</button></div>}
    {!snapshot && <p>No hay un turno abierto confirmado para cerrar. Vuelve a consultar la caja.</p>}
    {snapshot && step === 1 && <><h3>Pendientes y efectivo del equipo</h3><p>Esta revisión muestra atenciones de hoy sin venta y efectivo aún bajo custodia. No revela el efectivo esperado de la gaveta.</p>{loading && <p role="status">Consultando pendientes…</p>}{preflight && <><p>{preflight.appointments.length} atenciones de hoy en curso o terminadas sin venta vinculada.</p>{preflight.appointments.map((appointment: any) => <p key={appointment.id}>{appointment.cliente?.nombre || 'Cliente'} · {appointment.nombreServicio} · {appointment.estado === 'COMPLETADA' ? 'Terminada sin venta' : 'En atención'}</p>)}<p>{preflight.custody.length ? 'Efectivo que aún conserva el equipo:' : 'No hay efectivo pendiente bajo custodia según la consulta.'}</p>{preflight.custody.map((row: any) => <p key={row.usuarioId}>{row.nombre}: ${Number(row.saldo).toFixed(2)} MXN</p>)}<p>Las entregas pendientes no se suman al conteo físico de caja. Cerrar no las recibe automáticamente ni paga comisiones.</p>{preflight.custody.length > 0 && <button className="studio-button-secondary" disabled={busy || pending} onClick={onGoToCustody}>Volver a recibir entregas en caja</button>}<label className="cash-guide-reviewed" htmlFor="cash-guide-reviewed"><input id="cash-guide-reviewed" type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />Revisé pendientes y entregas; contaré únicamente el efectivo físicamente presente en la gaveta.</label></>}<div className="cash-guide-actions"><button type="button" disabled={loading || busy || pending} className="studio-button-secondary" onClick={() => void loadPreflight()}>Actualizar pendientes</button><button type="button" disabled={!preflight || !reviewed || loading || pending || busy} className="studio-button-primary" onClick={() => setStep(2)}>Continuar al conteo físico</button></div></>}
    {snapshot && step === 2 && <form onSubmit={e => { e.preventDefault(); if (!countError && !pending) void reviewCount(); }}><h3>Conteo ciego de billetes y monedas</h3><p>Cuenta físicamente la gaveta. No incluimos efectivo de los barberos todavía sin entregar. El esperado y la diferencia se consultan después de declarar este conteo; el turno sigue abierto hasta tu confirmación final.</p><fieldset disabled={busy || pending} className="cash-guide-denominations">{Object.entries(denominationCents).map(([key, cents]) => <label key={key} htmlFor={`cash-guide-${key}`}>{key.startsWith('moneda') ? 'Moneda' : 'Billete'} ${(cents / 100).toLocaleString('es-MX')}<input id={`cash-guide-${key}`} type="number" min="0" max="1000000" step="1" value={counts[key] || ''} placeholder="0" onChange={e => setCounts(old => ({ ...old, [key]: e.target.value }))} /></label>)}</fieldset><p><strong>Efectivo físicamente contado: ${amount.toFixed(2)} MXN.</strong></p>{countError && <p role="alert" className="cash-guide-error">{countError}</p>}<label htmlFor="cash-guide-notes">Notas del conteo o diferencias observadas<textarea id="cash-guide-notes" disabled={busy || pending} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} /></label><p>Revisar el conteo consulta la comparación sin cerrar. En el siguiente paso podrás confirmar el cierre o volver a contar.</p><div className="cash-guide-actions"><button type="button" disabled={busy || pending} className="studio-button-secondary" onClick={() => setStep(1)}>Volver a pendientes</button><button type="submit" disabled={busy || pending || Boolean(countError)} className="studio-button-primary">{busy ? 'Revisando conteo…' : 'Revisar comparación del conteo'}</button></div></form>}
    {comparison && difference !== null && step >= 3 && <><h3>{result ? 'Comprobante del turno cerrado' : 'Comparar antes de cerrar'}</h3><p>{result ? 'Turno cerrado. Estos datos corresponden al resultado guardado por el servidor.' : 'Conteo declarado; el turno sigue abierto. La comparación corresponde a los movimientos consultados y deberá revisarse otra vez si cambian antes de confirmar.'}</p><dl className="cash-guide-comparison"><div><dt>Efectivo esperado en caja</dt><dd>${Number(comparison.resumen.efectivoEsperado).toFixed(2)}</dd></div><div><dt>Efectivo físicamente contado</dt><dd>${Number(comparison.resumen.conteoReal).toFixed(2)}</dd></div><div><dt>{difference < 0 ? 'Faltante' : difference > 0 ? 'Sobrante' : 'Diferencia'}</dt><dd>{difference > 0 ? '+' : ''}${difference.toFixed(2)}</dd></div></dl><p>{difference === 0 ? 'El conteo y el saldo esperado coinciden.' : 'Revisa notas, entregas, gastos y movimientos para entender la diferencia; este resultado no atribuye responsabilidad por sí solo.'}</p><p>Comisiones, custodia pendiente y cobros conservan sus registros. El cierre no vuelve a pagarlos ni entregarlos.</p>{!result ? <><p>Notas declaradas: {preview.notasCierre || 'Sin notas'}. Revisión válida hasta {new Date(preview.expiraEn).toLocaleTimeString('es-MX', { timeZone: zone })}.</p><div className="cash-guide-actions"><button disabled={busy || pending} className="studio-button-secondary" onClick={() => { setPreview(null); setStep(2); }}>Volver a contar</button><button disabled={busy || pending} className="studio-button-primary" onClick={() => void close()}>{busy ? 'Confirmando cierre…' : 'Confirmar cierre definitivo'}</button></div></> : <div className="cash-guide-actions"><button className="studio-button-secondary" disabled={printing} onClick={async () => { setPrinting(true); setError(''); try { await api.printCorteHtml(result.corte.id); } catch (e: any) { setError(e.message || 'No pudimos abrir el comprobante. El turno sigue cerrado.'); } finally { setPrinting(false); } }}>{printing ? 'Abriendo comprobante…' : 'Abrir para imprimir o guardar PDF'}</button><button className="studio-button-primary" disabled={printing} onClick={onClose}>Terminar revisión del cierre</button></div>}</>}
  </section></OperationDialog>;
}

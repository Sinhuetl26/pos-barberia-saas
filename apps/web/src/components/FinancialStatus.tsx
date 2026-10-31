import { useEffect, useState, useRef } from 'react';
import { api } from '../api';

export function FinancialStatus({ owner, tenantId, branchId }: { owner: boolean; tenantId: string; branchId?: string }) {
  const [notices, setNotices] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const recovering = useRef(false);
  useEffect(() => {
    let canceled = false;
    const update = () => { try { setPending(Boolean(api.pendingFinancial())); } catch { setPending(true); setError('No se puede leer la operación guardada. Conserva esta sesión y solicita revisión.'); } };
    update();
    window.addEventListener('systech:financial', update);
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { if (owner && !document.hidden) { const result = await api.getSaleNotices(); if (!canceled) { setNotices(result); setError(''); } } }
      catch { if (!canceled) setError('Avisos sin conexión; se actualizarán al recuperarla.'); }
      finally { if (!canceled) timer = setTimeout(poll, 5000); }
    };
    if (owner) void poll();
    return () => { canceled = true; clearTimeout(timer); window.removeEventListener('systech:financial', update); };
  }, [owner, tenantId]);
  async function recover() {
    if (recovering.current) return;
    recovering.current = true; setBusy(true);
    try { await api.recoverFinancial(); setError(''); }
    catch (e: any) { setError(e.message || 'No pudimos recuperar el resultado.'); }
    finally { recovering.current = false; setBusy(false); }
  }
  const visible = notices.filter(n => !branchId || n.sucursalId === branchId);
  return <div className="financial-notices px-4 sm:px-8 pb-3 text-xs">
    {pending && <div role="status" className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2"><span>Hay una operación de caja o devolución por confirmar.</span><button disabled={busy} className="underline font-semibold" onClick={recover}>{busy ? 'Consultando…' : 'Recuperar resultado'}</button></div>}
    {owner && <div><button aria-expanded={open} onClick={() => setOpen(!open)} className="py-2 text-[#19352c] font-medium">Avisos de ventas · {visible.length} recientes {open ? '↑' : '↓'}</button>{open && <div className="max-h-64 overflow-y-auto border rounded-xl bg-white p-3 space-y-3">{!visible.length && <p>Aún no hay ventas registradas.</p>}{visible.map(n => <article key={n.id} className="border-b pb-2 last:border-0"><p className="font-semibold">{n.barbero} · ${Number(n.total).toFixed(2)} · {n.metodoPago}</p><p>{n.servicios.join(', ')}</p><p className="text-stone-500">Cobró {n.cobradoPor} · {n.folio} · {new Date(n.fecha).toLocaleString('es-MX')}</p></article>)}</div>}</div>}
    {error && <p role="status" className="text-amber-800">{error}</p>}
  </div>;
}

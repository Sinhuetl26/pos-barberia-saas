import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { api } from '../api';
import { OperationDialog } from './OperationDialog';
import '../styles/workspace-search.css';

type SearchItem = { kind: 'client' | 'appointment' | 'product'; id: string; nombre?: string; nombreServicio?: string; fechaHora?: string; telefono?: string; tipo?: string; sku?: string; estado?: string; cliente?: { nombre: string } };
type SearchGroups = { clients: SearchItem[]; appointments: SearchItem[]; products: SearchItem[]; timeZone: string };
const emptyGroups: SearchGroups = { clients: [], appointments: [], products: [], timeZone: 'America/Mexico_City' };
export function workspaceSearchTarget(item: SearchItem, role: string, zone: string) {
  if (!item.id) return null;
  if (item.kind === 'client') return role === 'BARBERO' ? null : `/app/clientes?clienteId=${encodeURIComponent(item.id)}`;
  if (item.kind === 'product') return `/app/${['BARBERO', 'CAJERO'].includes(role) ? 'pos' : 'inventario'}?productoId=${encodeURIComponent(item.id)}`;
  if (!item.fechaHora || !Number.isFinite(new Date(item.fechaHora).getTime())) return null;
  let parts: Intl.DateTimeFormatPart[];
  try { parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(item.fechaHora)); }
  catch { return null; }
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `/app/agenda?fecha=${part('year')}-${part('month')}-${part('day')}&citaId=${encodeURIComponent(item.id)}`;
}

export function nextSearchSelection(current: number, count: number, direction: 'ArrowDown' | 'ArrowUp') {
  if (!count) return -1;
  return direction === 'ArrowDown' ? (current + 1) % count : (current <= 0 ? count - 1 : current - 1);
}

export function searchShortcutAllowed(event: Pick<KeyboardEvent, 'defaultPrevented' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'isComposing' | 'key'>, editing: boolean) {
  return !event.defaultPrevented && !event.isComposing && !editing && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
}

function appointmentDescription(item: SearchItem, zone: string) {
  if (!item.fechaHora || !Number.isFinite(new Date(item.fechaHora).getTime())) return 'Fecha no disponible';
  try { return `${item.cliente?.nombre ? `${item.cliente.nombre} · ` : ''}${new Date(item.fechaHora).toLocaleString('es-MX', { timeZone: zone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${item.estado || ''}`; }
  catch { return 'Fecha no disponible'; }
}

export function WorkspaceSearch({ sucursalId, rol, onNavigate }: { sucursalId?: string; rol: string; onNavigate: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchGroups>(emptyGroups);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const serial = useRef(0);
  const requestAbort = useRef<AbortController | null>(null);
  const show = () => { if (!sucursalId) return; serial.current++; requestAbort.current?.abort(); setQuery(''); setResults(emptyGroups); setError(''); setLoading(false); setActive(-1); setOpen(true); };
  const close = () => { serial.current++; requestAbort.current?.abort(); setOpen(false); setLoading(false); };
  useEffect(() => { close(); }, [sucursalId, rol]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target;
      const editing = target instanceof HTMLElement && (target.isContentEditable || Boolean(target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')));
      if (!searchShortcutAllowed(event, editing)) return;
      if (!sucursalId) return;
      event.preventDefault(); show();
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [sucursalId]);
  useEffect(() => { if (!open) return; const timer = window.setTimeout(() => input.current?.focus(), 0); return () => window.clearTimeout(timer); }, [open]);
  useEffect(() => {
    const request = ++serial.current;
    setResults(emptyGroups); setActive(-1); setError(''); setLoading(false);
    if (!open || !sucursalId || query.trim().length < 2) return;
    const controller = new AbortController();
    requestAbort.current = controller;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.searchWorkspace(sucursalId, query.trim(), controller.signal);
        if (request !== serial.current) return;
        setResults({ clients: rol === 'BARBERO' ? [] : (result.clients || []).slice(0, 8).map((i: any) => ({ ...i, kind: 'client' })), appointments: (result.appointments || []).slice(0, 8).map((i: any) => ({ ...i, kind: 'appointment' })), products: (result.products || []).slice(0, 8).map((i: any) => ({ ...i, kind: 'product' })), timeZone: result.timeZone || 'America/Mexico_City' });
      } catch (e: any) { if (request === serial.current && !controller.signal.aborted) setError(e.message || 'No pudimos buscar. Intenta nuevamente.'); }
      finally { if (request === serial.current) setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); serial.current++; };
  }, [open, sucursalId, rol, query, retry]);
  const groups = [{ label: 'Clientes', rows: results.clients }, { label: 'Citas', rows: results.appointments }, { label: 'Servicios y productos', rows: results.products }];
  const entries = groups.flatMap(g => g.rows);
  useEffect(() => { if (open && active >= 0) document.getElementById(`workspace-search-result-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [open, active]);
  const choose = (item: SearchItem) => {
    const path = workspaceSearchTarget(item, rol, results.timeZone);
    if (!path) { setError('No podemos abrir este resultado. Actualiza la búsqueda para revisar sus datos.'); return; }
    close(); onNavigate(path);
  };
  return <><button type="button" className="workspace-search-trigger" onClick={show} disabled={!sucursalId} aria-haspopup="dialog"><Search size={18} aria-hidden="true" /><span>Buscar en mi barbería</span><kbd>Ctrl K</kbd></button>
    <OperationDialog open={open} busy={false} titleId="workspace-search-title" onClose={close} className="max-w-xl workspace-search-dialog"><div className="workspace-search-content" onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && entries.length && (event.target === input.current || (event.target instanceof HTMLElement && event.target.getAttribute('role') === 'option'))) { event.preventDefault(); input.current?.focus(); setActive(old => nextSearchSelection(old, entries.length, event.key as 'ArrowDown' | 'ArrowUp')); }
      if (event.key === 'Enter' && event.target === input.current && entries.length) { event.preventDefault(); choose(entries[active < 0 ? 0 : active]); }
    }}><div className="workspace-search-heading"><h2 id="workspace-search-title" tabIndex={-1}>Encuentra tu siguiente tarea</h2><button type="button" aria-label="Cerrar búsqueda" onClick={close}><X size={20} aria-hidden="true" /></button></div>
    <label htmlFor="workspace-search-input">Nombre, teléfono, folio, servicio o producto</label><input id="workspace-search-input" ref={input} type="search" role="combobox" autoComplete="off" aria-describedby="workspace-search-hint" aria-expanded={entries.length > 0} aria-controls="workspace-search-results" aria-activedescendant={active >= 0 ? `workspace-search-result-${active}` : undefined} aria-autocomplete="list" value={query} maxLength={80} placeholder="Escribe al menos dos caracteres" onChange={e => { serial.current++; requestAbort.current?.abort(); setResults(emptyGroups); setActive(-1); setError(''); setQuery(e.target.value); }} />
    <p id="workspace-search-hint" className="workspace-search-hint">Resultados de esta sucursal según tu acceso. Usa ↑ ↓ y Enter para abrir, o Escape para volver.</p>
    {!loading && !error && query.trim().length < 2 && <p role="status">Escribe dos caracteres para encontrar una cita, un servicio o un producto{rol === 'BARBERO' ? '.' : ', o el teléfono de un cliente.'}</p>}
    {loading && <p role="status">Buscando…</p>}{error && <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(old => old + 1)}>Reintentar búsqueda</button></div>}
    {!loading && !error && query.trim().length >= 2 && !entries.length && <p role="status">No hay coincidencias. Prueba con otro nombre o teléfono.</p>}
    <div id="workspace-search-results" role="listbox" aria-busy={loading} aria-label="Resultados de búsqueda" className="workspace-search-results">{groups.filter(group => group.rows.length).map((group, groupIndex) => <div role="group" aria-labelledby={`workspace-search-group-${groupIndex}`} key={group.label}><h3 id={`workspace-search-group-${groupIndex}`}>{group.label}</h3>{group.rows.map(item => { const index = entries.indexOf(item); return <button type="button" role="option" id={`workspace-search-result-${index}`} aria-selected={active === index} key={`${item.kind}:${item.id}`} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => choose(item)}><strong>{item.nombre || item.nombreServicio || 'Cita'}</strong><span>{item.kind === 'client' ? item.telefono || 'Sin teléfono registrado' : item.kind === 'product' ? `${item.tipo === 'SERVICIO' ? 'Servicio' : 'Producto'}${item.sku ? ` · ${item.sku}` : ''}` : appointmentDescription(item, results.timeZone)}</span></button>; })}</div>)}</div>
    </div></OperationDialog></>;
}

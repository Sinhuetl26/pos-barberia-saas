import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { OperationState } from '../components/OperationState';
import { Sucursal } from '../types';
import '../styles/secondary-workspaces.css';

type AuditItem = { id: string; at: string; actor: string; title: string; branchId: string | null; reference: string | null; reason: string | null; fields: { label: string; value: string | number }[]; affectedAppointments: number | null; legacyDetails: boolean };
type AuditPage = { items: AuditItem[]; nextCursor: string | null; actions: Record<string, string>; scopeNote: string; timeZone: string };
export function displayAuditValue(field: { label: string; value: string | number }, zone: string | undefined) {
  if (typeof field.value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(field.value) && Number.isFinite(Date.parse(field.value)))
    return new Date(field.value).toLocaleString('es-MX', { timeZone: zone });
  if (/^Estado(?: anterior| nuevo)?$/.test(field.label)) return ({ ASIGNADO: 'Profesional asignado', RETIRADO: 'Retirado', ATENDIDO: 'Atendido', EN_ATENCION: 'En atención', EN_CURSO: 'En atención', ESPERANDO: 'Esperando', PENDIENTE: 'Por confirmar', CONFIRMADA: 'Confirmada', COMPLETADA: 'Completada', CANCELADA: 'Cancelada', NO_SHOW: 'No asistió' } as Record<string, string>)[field.value] || field.value;
  if (typeof field.value === 'number' && /^(?:Precio|Importe(?: anterior| actual| neto)?|Descuento|Efectivo esperado|Conteo real|Diferencia(?: de caja)?|Ventas (?:totales|del turno|en efectivo|con tarjeta|por transferencia)|Fondo inicial|Propinas del turno|Ingresos de caja|Entregas recibidas|Efectivo (?:cobrado en caja|contado)|Retiros de caja|Gastos de caja)$/.test(field.label)) return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(field.value);
  return field.value;
}
export function OperationAuditView({ branches }: { branches: Sucursal[] }) {
  const [filters, setFilters] = useState({ sucursalId: '', accion: '', desde: '', hasta: '' });
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [page, setPage] = useState<AuditPage | null>(null), [items, setItems] = useState<AuditItem[]>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0);
  const serial = useRef(0);
  const load = async (query: Record<string, string>, append = false) => {
    const request = ++serial.current; setBusy(true); setError('');
    try { const result: AuditPage = await api.getOperationAudit(query); if (request !== serial.current) return;
      setPage(result); setItems(old => append ? [...old, ...result.items].filter((item, index, all) => all.findIndex(v => v.id === item.id) === index) : result.items);
    } catch (err: any) { if (request === serial.current) setError(err.message || 'No pudimos consultar las operaciones.'); }
    finally { if (request === serial.current) setBusy(false); }
  };
  useEffect(() => { setPage(null); setItems([]); void load(applied); return () => { serial.current++; }; }, [applied, revision]);
  function apply(event: FormEvent) {
    event.preventDefault();
    if (filters.desde && filters.hasta && filters.desde > filters.hasta) { setError('La fecha inicial debe ser anterior o igual a la final.'); return; }
    setApplied(Object.fromEntries(Object.entries({ ...filters, zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone }).filter(([, value]) => value)));
  }
  return <div className="studio-page operation-page secondary-workspace audit-workspace">
    <header className="operation-page-header"><div><h1 className="studio-title">Historial de operaciones</h1><p className="operation-muted mt-2">Quién hizo el cambio, cuándo ocurrió y qué quedó registrado.</p></div><button className="studio-button-secondary" disabled={busy} onClick={() => setRevision(v => v + 1)}>Actualizar historial</button></header>
    <form onSubmit={apply} className="studio-panel grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
      <label className="text-sm">Sucursal<select className="studio-input mt-1 w-full" value={filters.sucursalId} onChange={e => setFilters(v => ({ ...v, sucursalId: e.target.value }))}><option value="">Todas las sucursales</option>{branches.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></label>
      <label className="text-sm">Operación<select className="studio-input mt-1 w-full" value={filters.accion} onChange={e => setFilters(v => ({ ...v, accion: e.target.value }))}><option value="">Todas las operaciones</option>{Object.entries(page?.actions || {}).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
      <label className="text-sm">Desde<input type="date" className="studio-input mt-1 w-full" value={filters.desde} onChange={e => setFilters(v => ({ ...v, desde: e.target.value }))}/></label>
      <label className="text-sm">Hasta<input type="date" className="studio-input mt-1 w-full" value={filters.hasta} onChange={e => setFilters(v => ({ ...v, hasta: e.target.value }))}/></label>
      <button disabled={busy} type="submit" className="studio-button self-end">Aplicar filtros</button>
    </form>
    <p className="my-4 text-sm operation-muted">{page?.scopeNote || 'Se consulta el último mes. El período máximo es de 93 días.'} Fechas del período: {page?.timeZone || 'zona horaria del dispositivo'}. La hora de cada evento se muestra en tu dispositivo. El registro muestra solo los datos de la operación.</p>
    {error && <div role="alert" className="operation-error"><p>{error}</p><button disabled={busy} className="studio-button-secondary" onClick={() => void load(applied)}>Reintentar consulta</button></div>}
    {busy && <OperationState busy title="Consultando operaciones">Conservamos el historial mientras consultamos.</OperationState>}
    {!busy && !error && !items.length && <OperationState title="No hay operaciones en esta página">Revisa los filtros. Los eventos antiguos sin sucursal no se atribuyen a una ubicación.</OperationState>}
    <ol className="grid gap-3">{items.map(item => <li key={item.id} className="studio-panel p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-semibold">{item.title}</h2><time className="text-sm operation-muted" dateTime={item.at}>{new Date(item.at).toLocaleString('es-MX')}</time></div><p className="mt-2 text-sm break-all">{item.actor} · {branches.find(b => b.id === item.branchId)?.nombre || 'Sucursal no registrada'}</p>{item.reference && <p className="mt-2 text-xs break-all">Referencia: {item.reference}</p>}{item.reason && <p className="mt-2 text-sm">Motivo: {item.reason}</p>}<dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{item.fields.map(field => <div key={field.label}><dt className="text-xs operation-muted">{field.label}</dt><dd className="text-sm break-words">{displayAuditValue(field, page?.timeZone)}</dd></div>)}</dl>{item.affectedAppointments !== null && <p className="mt-2 text-sm">Citas afectadas conservadas: {item.affectedAppointments}</p>}{item.legacyDetails && <p className="mt-2 text-sm operation-muted">Este registro antiguo no tiene un detalle estructurado para mostrar.</p>}</li>)}</ol>
    {page?.nextCursor && <button disabled={busy} className="studio-button-secondary mt-4" onClick={() => void load({ ...applied, cursor: page.nextCursor! }, true)}>Consultar siguientes operaciones</button>}
  </div>;
}

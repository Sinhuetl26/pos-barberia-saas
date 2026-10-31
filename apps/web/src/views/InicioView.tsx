import { useEffect, useState } from 'react';
import { Calendar, CreditCard, Package, RefreshCw, AlertCircle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { PreparationChecklist } from '../components/PreparationChecklist';
import { OperationState } from '../components/OperationState';
import { api } from '../api';
import { Barbero, Cita, Sucursal, Tenant } from '../types';
import { OperationSummary } from '../types/operations';
import { formatCurrency } from '../utils/formatters';
import { daybookColumns } from '../utils/daybook';
import '../styles/daybook.css';

interface Props { rol?: string; currentSucursal: Sucursal | null; tenant: Tenant | null; name?: string; onNavigate: (view: string) => void; onBranchUpdated?: (branch: Sucursal) => void }

export function InicioView({ currentSucursal, onNavigate, rol, onBranchUpdated }: Props) {
  const [snapshot, setSnapshot] = useState<{ branchId: string; summary: OperationSummary; appointments: Cita[]; barbers: Barbero[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const branchId = currentSucursal?.id;
  useEffect(() => {
    let active = true;
    setSnapshot(null); setError(''); setLoading(true);
    if (!branchId) { setLoading(false); return; }
    (async () => {
      const summary = await api.getOperationSummary(branchId);
      const [appointments, barbers] = await Promise.all([
        api.getCitas({ sucursalId: branchId, fecha: summary.localDate }), api.getBarberos(branchId),
      ]);
      if (active) setSnapshot({ branchId, summary, appointments, barbers });
    })().catch(() => { if (active) setError('No pudimos cargar tu día. Inténtalo de nuevo.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branchId, revision]);
  // Do not show the previous branch while the next branch's effect starts.
  const current = snapshot?.branchId === branchId ? snapshot : null;
  const data = current?.summary;
  const m = data?.metrics;
  const columns = current ? daybookColumns(current.barbers, current.appointments) : [];
  const day = data ? new Date(`${data.localDate}T12:00:00`) : null;
  const time = (date: string) => new Date(date).toLocaleTimeString('es-MX', { timeZone: data?.timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
  const agenda = data ? `agenda?fecha=${data.localDate}` : 'agenda';
  const nextId = columns.flatMap(column => column.appointments).filter(a => a.estado !== 'EN_CURSO').sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))[0]?.id;
  return <div className="studio-page operation-page home-daybook">
    <header className="daybook-heading"><div><h1>Hoy</h1><p>{day ? day.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : currentSucursal?.nombre || 'Selecciona una sucursal'}</p></div><div className="daybook-heading-actions"><button className="studio-button-secondary" onClick={() => onNavigate(agenda)}><Calendar size={19} />Abrir agenda</button><button className="studio-button" disabled={!branchId} onClick={() => onNavigate('pos')}><CreditCard size={19} />Nueva venta</button></div></header>
    {error && <div role="alert" className="operation-error"><AlertCircle size={22} /><p>{error}</p><button onClick={() => setRevision(n => n + 1)} className="studio-button-secondary">Reintentar</button></div>}
    {!branchId && !loading && <OperationState title="Elige una sucursal">Selecciona la sucursal que vas a revisar.</OperationState>}
    {loading && <OperationState busy title="Cargando tu día">Consultando citas y ventas.</OperationState>}
    {data && m && <>
      <section className="daybook-team" aria-label="Próximas atenciones por barbero">
        {columns.map(column => <section key={column.id} className="daybook-professional" aria-label={`Agenda de ${column.name}`}>
          <header><span className="daybook-initial" aria-hidden="true">{column.name.trim().charAt(0).toLocaleUpperCase('es-MX')}</span><div><h2>{column.name}</h2><p>{column.todayCount} {column.todayCount === 1 ? 'cita hoy' : 'citas hoy'}</p></div></header>
          <ol>{column.appointments.map((a, index) => {
            const inProgress = a.estado === 'EN_CURSO', confirmed = a.estado === 'CONFIRMADA';
            const StatusIcon = confirmed ? CheckCircle2 : Clock;
            return <li key={a.id} className={a.id === nextId ? 'daybook-next' : ''}><time dateTime={a.fechaHora}>{time(a.fechaHora)}</time><div className="daybook-visit"><h3>{a.cliente?.nombre || 'Cliente'}</h3><p>{a.nombreServicio || 'Servicio'}</p><span className={`daybook-status ${confirmed ? 'is-confirmed' : inProgress ? 'is-current' : 'is-pending'}`}><StatusIcon size={17} />{inProgress ? 'En atención' : confirmed ? 'Confirmada' : 'Por confirmar'}</span></div><button className={index === 0 ? 'daybook-appointment-primary' : 'daybook-appointment-link'} onClick={() => onNavigate(`${agenda}&citaId=${encodeURIComponent(a.id)}`)} aria-label={`Ver cita de ${a.cliente?.nombre || 'cliente'} a las ${time(a.fechaHora)}`}>Ver cita</button></li>;
          })}</ol>
          {!column.appointments.length && <p className="daybook-free">Sin próximas citas por hoy.</p>}
        </section>)}
        {!columns.length && <div className="daybook-empty"><Calendar size={32} strokeWidth={1.4} /><h2>Tu día empieza aquí</h2><p>Aún no hay equipo ni citas en esta sucursal.</p><button className="studio-button-secondary" onClick={() => onNavigate('barberos')}>Añadir barbero</button></div>}
      </section>
      <section className="daybook-summary" aria-label="Resumen del día">
        <div><CreditCard size={27} /><div><h2>Ventas de hoy</h2><p><strong>{formatCurrency(m.revenue)}</strong><span>{m.sales} {m.sales === 1 ? 'venta' : 'ventas'}</span></p></div><button onClick={() => onNavigate('caja')}>Ver caja<ArrowRight size={17} /></button></div>
        <div><Calendar size={27} /><div><h2>Citas por confirmar</h2><p><strong>{m.pending}</strong></p></div><button onClick={() => onNavigate(agenda)}>Revisar citas<ArrowRight size={17} /></button></div>
        <div><Package size={27} /><div><h2>Productos por reponer</h2><p><strong>{m.lowStock}</strong></p></div><button onClick={() => onNavigate('inventario')}>Ver inventario<ArrowRight size={17} /></button></div>
      </section>
      <footer className="daybook-update"><span>Actualizado a las {time(data.generatedAt)}</span><button disabled={loading} onClick={() => setRevision(n => n + 1)}><RefreshCw size={15} />Actualizar</button></footer>
      <details className="daybook-more"><summary>Más de tu negocio</summary><div className="daybook-secondary"><dl><div><dt>Cortes completados</dt><dd>{m.completed}</dd></div><div><dt>Ausencias</dt><dd>{m.noShows}</dd></div><div><dt>Propinas</dt><dd>{formatCurrency(m.tips)}</dd></div><div><dt>Ticket promedio</dt><dd>{formatCurrency(m.averageTicket)}</dd></div><div><dt>Ventas de ayer</dt><dd>{formatCurrency(m.yesterdayRevenue)}</dd></div><div><dt>Cajas abiertas</dt><dd>{m.openRegisters}</dd></div></dl><nav aria-label="Consultas del negocio"><button onClick={() => onNavigate('clientes')}>Clientes por recuperar · {m.inactiveClients}<ArrowRight size={16} /></button><button onClick={() => onNavigate('barberos')}>Equipo y comisiones<ArrowRight size={16} /></button><button onClick={() => onNavigate('reportes')}>Reportes<ArrowRight size={16} /></button></nav></div></details>
    </>}
    {rol === 'DUENO' && currentSucursal && <details className="daybook-more"><summary>Preparar mi barbería</summary><PreparationChecklist key={currentSucursal.id} sucursalId={currentSucursal.id} onNavigate={onNavigate} onBranchUpdated={branch => { onBranchUpdated?.(branch); setRevision(v => v + 1); }} /></details>}
  </div>;
}

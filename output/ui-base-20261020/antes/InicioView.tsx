import { useEffect, useState } from 'react';
import { Calendar, CreditCard, Users, Package, RefreshCw, AlertCircle, ArrowUpRight, Scissors } from 'lucide-react';
import {PreparationChecklist} from '../components/PreparationChecklist';
import { OperationState } from '../components/OperationState';
import { api } from '../api';
import { Sucursal, Tenant } from '../types';
import { OperationSummary } from '../types/operations';
import { formatCurrency } from '../utils/formatters';

interface Props { rol?:string; currentSucursal: Sucursal | null; tenant: Tenant | null; name?: string; onNavigate: (view: string) => void; onBranchUpdated?: (branch:Sucursal)=>void }

export function InicioView({ currentSucursal, tenant, name, onNavigate,rol,onBranchUpdated }: Props) {
  const [data, setData] = useState<OperationSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError(''); setLoading(true);
    if (!currentSucursal) { setLoading(false); return; }
    api.getOperationSummary(currentSucursal.id).then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentSucursal?.id, revision]);
  const m = data?.metrics;
  const time = (date: string) => new Date(date).toLocaleTimeString('es-MX', { timeZone: data?.timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
  const actions = m ? [
    { icon: Calendar, number: m.pending, title: 'Citas por confirmar', text: 'Revisa el horario y el estado en la agenda.', target: 'agenda' },
    { icon: Users, number: m.inactiveClients, title: 'Clientes para recuperar', text: 'Llevan más de 45 días sin visitar.', target: 'clientes' },
    { icon: Package, number: m.lowStock, title: 'Productos por reponer', text: 'En el mínimo de inventario o por debajo.', target: 'inventario' },
  ] : [];
  const day = data ? new Date(`${data.localDate}T12:00:00`) : new Date();
  return <div className="studio-page operation-page studio-home">
    <header className="operation-page-header">
      <div><p className="home-greeting">Hola{name ? `, ${name.split(' ')[0]}` : ''}. Así va tu barbería.</p><h1 className="studio-title">El día, en tus manos.</h1><p className="operation-muted mt-2 text-sm">{currentSucursal?.nombre || 'Selecciona una sucursal'}</p></div>
      <div className="flex flex-wrap items-center gap-2"><button onClick={() => setRevision(n => n + 1)} disabled={loading} className="studio-icon-button" aria-label="Actualizar resumen"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button><button className="studio-button" onClick={() => onNavigate('pos')}><CreditCard className="w-4 h-4" />Nueva venta</button></div>
    </header>
    {error && <div role="alert" className="operation-error"><AlertCircle className="w-5 h-5 shrink-0" /><div><p className="font-semibold">No pudimos consultar la operación</p><p className="mt-1">{error}</p></div><button onClick={() => setRevision(n => n + 1)} className="studio-button-secondary">Reintentar</button></div>}
    {!currentSucursal && !loading && <OperationState title="Elige la sucursal que vas a revisar">Selecciona o configura una sucursal desde el panel para ver su agenda y caja.</OperationState>}
    {loading && <OperationState busy title="Consultando tu sucursal">Cargando ventas, caja y próximas citas.</OperationState>}
    {data && m && <>
      <section className="home-day-strip" aria-label="Actividad del día"><div className="home-date"><strong>{day.getDate()}</strong><span>{day.toLocaleDateString('es-MX',{month:'long'})}<small>{day.toLocaleDateString('es-MX',{weekday:'long'})}</small></span></div><dl className="home-day-counts"><div><dt>Citas de hoy</dt><dd>{m.appointments}</dd></div><div><dt>Cortes completados</dt><dd>{m.completed}</dd></div><div><dt>Equipo activo</dt><dd>{m.activeBarbers}</dd></div></dl><button onClick={()=>onNavigate('agenda')} className="home-day-action"><Calendar size={20}/><span>Organizar el día<small>Ver horarios y citas</small></span><ArrowUpRight size={18}/></button></section>
      <div className="home-workbench">
        <section className="studio-panel home-schedule"><div className="operation-section-heading"><div><h2>En la agenda</h2><p>Próximas visitas de hoy, en orden de llegada.</p></div><button onClick={() => onNavigate('agenda')} className="studio-button-secondary">Abrir agenda</button></div>
          <div className="divide-y divide-stone-200">{data.upcoming.map(a => <button key={a.id} onClick={() => onNavigate('agenda')} className="operation-appointment"><span className="tabular-nums font-semibold w-12 shrink-0">{time(a.fechaHora)}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{a.cliente.nombre}</span><span className="block text-xs operation-muted mt-1">{a.nombreServicio || 'Servicio'} · {a.barbero.nombre}</span></span><span className={`text-xs px-2 py-1 rounded-md ${a.estado === 'CONFIRMADA' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{a.estado === 'CONFIRMADA' ? 'Confirmada' : 'Por confirmar'}</span></button>)}</div>
          {!data.upcoming.length && <div className="home-empty-schedule"><Calendar size={32} strokeWidth={1.3}/><h3>Hay espacio para el siguiente corte.</h3><p>No hay próximas citas para hoy. Revisa otros días o registra a quien llegue sin cita.</p><button onClick={()=>onNavigate('agenda')} className="studio-button-secondary">Registrar una cita</button></div>}
          <div className="home-schedule-foot"><span>{m.pending} por confirmar</span><span>{m.noShows} ausencias registradas</span></div>
        </section>
        <section className="home-cash-book" aria-label="Ventas y caja del día"><div className="home-cash-heading"><CreditCard size={21}/><h2>La caja de hoy</h2></div><p className="home-cash-label">Ventas, sin propinas</p><p className="home-cash-amount">{formatCurrency(m.revenue)}</p><p className="home-cash-caption">{m.sales} {m.sales===1?'venta completada':'ventas completadas'}</p><dl><div><dt>Propinas</dt><dd>{formatCurrency(m.tips)}</dd></div><div><dt>Ticket promedio</dt><dd>{formatCurrency(m.averageTicket)}</dd></div><div><dt>Estado de caja</dt><dd>{m.openRegisters ? `${m.openRegisters} abierta${m.openRegisters===1?'':'s'}`:'Sin abrir'}</dd></div></dl><button onClick={()=>onNavigate('barberos?tab=cortes')}>Revisar caja y entregas<ArrowUpRight size={18}/></button><small>Datos consultados a las {time(data.generatedAt)}</small></section>
      </div>
      <section className="home-attention" aria-label="Pendientes de la sucursal"><div className="home-attention-heading"><h2>Que no se te pase.</h2><p>Lo que necesita una mirada hoy.</p></div><div className="home-attention-actions">{actions.map(({ icon: Icon, number, title, text, target })=><button key={target} onClick={()=>onNavigate(target)}><Icon size={20}/><span><strong>{title}</strong><small>{text}</small></span><b>{number}</b><ArrowUpRight size={16}/></button>)}</div></section>
      <section className="operation-review-row" aria-label="Consultar operación"><Scissors size={24}/><div><p className="font-semibold">El oficio es de tu equipo.</p><p className="text-sm operation-muted mt-1">Revisa sus ventas y comisiones en un mismo lugar.</p></div><button onClick={() => onNavigate('barberos')} className="studio-button-secondary">Ver equipo</button><div className="xl:ml-auto"><p className="text-sm operation-muted">Ayer: <span className="font-semibold tabular-nums">{formatCurrency(m.yesterdayRevenue)}</span></p><button onClick={() => onNavigate('reportes')} className="operation-text-button">Consultar reportes</button></div></section>
    </>}
    {rol==='DUENO'&&currentSucursal&&<PreparationChecklist sucursalId={currentSucursal.id} onNavigate={onNavigate} onBranchUpdated={branch=>{onBranchUpdated?.(branch);setRevision(v=>v+1);}}/>}
  </div>;
}

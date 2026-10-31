import React, { useEffect, useRef, useState } from 'react';
import { Barbero, BloqueoHorario, Cita } from '../types';
import { agendaStatus, appointmentLanes, clockMinutes, localMinutes } from '../utils/agendaLayout';
import { branchToday } from '../utils/branchTime';

interface Props { barberos: Barbero[]; citas: Cita[]; bloqueos: BloqueoHorario[]; date: string; zone: string; onSelect: (cita: Cita) => void }
export function AgendaSchedule({ barberos, citas, bloqueos, date, zone, onSelect }: Props) {
  const [mode, setMode] = useState<'calendar' | 'list'>('calendar');
  const calendarScroll = useRef<HTMLDivElement>(null);
  const active = citas.filter(c => !['CANCELADA', 'NO_SHOW'].includes(c.estado));
  const start = Math.max(0, Math.floor(Math.min(540, ...barberos.map(b => clockMinutes(b.horarioInicio || '09:00')), ...active.map(c => localMinutes(c.fechaHora, zone))) / 60) * 60);
  const end = Math.min(1440, Math.ceil(Math.max(1140, ...barberos.map(b => clockMinutes(b.horarioFin || '19:00')), ...active.map(c => localMinutes(c.fechaHora, zone) + c.duracionMinutos)) / 60) * 60);
  const hours = Array.from({ length: (end - start) / 60 + 1 }, (_, index) => start + index * 60);
  const firstVisit = Math.min(...active.map(c => localMinutes(c.fechaHora, zone)));
  useEffect(() => {
    if (calendarScroll.current) calendarScroll.current.scrollTop = Number.isFinite(firstVisit) ? Math.max(0, (firstVisit - start - 30) * 2) : 0;
  }, [date, firstVisit, start]);
  const time = (c: Cita) => new Date(c.fechaHora).toLocaleTimeString('es-MX', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false });
  return <section className={`agenda-schedule ${mode === 'list' ? 'is-list' : ''}`} aria-label="Citas del día">
    <div className="agenda-view-options"><p>Elige una cita para atender o cobrar.</p><div role="group" aria-label="Vista de agenda"><button type="button" aria-pressed={mode === 'calendar'} onClick={() => setMode('calendar')}>Calendario</button><button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>Lista</button></div></div>
    {!barberos.length && <p className="p-5">No hay profesionales disponibles en esta sucursal.</p>}
    <div ref={calendarScroll} className="agenda-time-scroll" hidden={mode === 'list'}>
      <div className="agenda-time-grid" style={{ gridTemplateColumns: `64px repeat(${barberos.length}, minmax(180px, 1fr))` }}>
        <div className="agenda-time-heading">Hora</div>{barberos.map(b => <div key={b.id} className="agenda-time-heading"><span className="day-professional-initial" aria-hidden="true">{b.nombre.trim().charAt(0)}</span><strong>{b.nombre}</strong><small>{b.horarioInicio}–{b.horarioFin}</small></div>)}
        <div className="agenda-time-ruler" style={{ height: (end - start) * 2 }}>{hours.map(m => <span key={m} style={{ top: (m - start) * 2 }}>{String(Math.floor(m / 60)).padStart(2, '0')}:00</span>)}</div>
        {barberos.map(b => <div key={b.id} className="agenda-time-column" style={{ height: (end - start) * 2 }}>
          {bloqueos.filter(block => !block.barberoId || block.barberoId === b.id).map(block => {
            const from = branchToday(zone, new Date(block.fechaInicio)) < date ? start : Math.max(start, localMinutes(block.fechaInicio, zone));
            const to = branchToday(zone, new Date(block.fechaFin)) > date ? end : Math.min(end, localMinutes(block.fechaFin, zone));
            return to > from ? <div key={block.id} className="agenda-time-block" style={{ top: (from - start) * 2, height: (to - from) * 2 }} title={block.motivo}><span>{block.motivo}</span></div> : null;
          })}
          {appointmentLanes(active.filter(c => c.barberoId === b.id).map(c => ({ id: c.id, cita: c, start: localMinutes(c.fechaHora, zone), end: localMinutes(c.fechaHora, zone) + c.duracionMinutos }))).map(event => <button key={event.id} type="button" className={`agenda-time-event status-${event.cita.estado.toLowerCase()}`} style={{ top: (event.start - start) * 2, height: Math.max(44, (event.end - event.start) * 2 - 3), left: `calc(${event.lane / event.lanes * 100}% + 3px)`, width: `calc(${100 / event.lanes}% - 6px)` }} onClick={() => onSelect(event.cita)} aria-label={`${time(event.cita)}, ${event.cita.cliente?.nombre || 'Cliente'}, ${event.cita.nombreServicio}, ${agendaStatus[event.cita.estado] || event.cita.estado}`}><strong>{time(event.cita)} · {event.cita.cliente?.nombre || 'Cliente'}</strong><span>{event.cita.nombreServicio} · {agendaStatus[event.cita.estado] || event.cita.estado}</span></button>)}
        </div>)}
      </div>
    </div>
    <div className="agenda-day-list">{[...citas].sort((a,b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()).map(c => <button type="button" key={c.id} onClick={() => onSelect(c)}><time>{time(c)}</time><span><strong>{c.cliente?.nombre || 'Cliente sin registrar'}</strong><small>{c.nombreServicio} · {barberos.find(b => b.id === c.barberoId)?.nombre} · {c.duracionMinutos} min</small></span><span className={`agenda-status status-${c.estado.toLowerCase()}`} aria-label={`Estado: ${agendaStatus[c.estado] || c.estado}`}>{agendaStatus[c.estado] || c.estado}</span></button>)}{!citas.length && <p className="p-5">Sin citas en esta vista. Cambia el día, quita filtros o registra una cita.</p>}</div>
    {mode === 'calendar' && citas.some(c => ['CANCELADA','NO_SHOW'].includes(c.estado)) && <p className="agenda-history-note">Las citas canceladas y las inasistencias se conservan en la vista Lista.</p>}
  </section>;
}

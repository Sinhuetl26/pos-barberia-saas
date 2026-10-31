import { Calendar, CreditCard, Sun } from 'lucide-react';
import { Barbero } from '../types';

interface Column { id: string; name: string; todayCount: number }

interface Props {
  columns: Column[];
  barbers: Barbero[];
  /** Fecha local de la sucursal (YYYY-MM-DD) para abrir la agenda en el día correcto. */
  localDate: string;
  onNavigate: (view: string) => void;
}

/**
 * Estado de un día sin citas. Sustituye las columnas repetidas por un bloque
 * con una acción clara y el equipo disponible en una sola lectura.
 */
export function DaybookOpenDay({ columns, barbers, localDate, onNavigate }: Props) {
  const agenda = `agenda?fecha=${localDate}`;
  const byId = new Map(barbers.map(barber => [barber.id, barber]));
  const team = columns.map(column => ({ ...column, barber: byId.get(column.id) }));
  const countLabel = team.length === 1 ? '1 profesional disponible' : `${team.length} profesionales disponibles`;

  return <section className="daybook-open" aria-labelledby="daybook-open-title">
    <div className="daybook-open-card">
      <p className="daybook-open-eyebrow"><Sun size={15} aria-hidden="true" />Agenda libre</p>
      <h2 id="daybook-open-title">Hoy está libre.</h2>
      <p className="daybook-open-lead">
        Nadie tiene una cita programada todavía. Coloca la primera desde la agenda o cobra una visita directa.
      </p>
      <div className="daybook-open-actions">
        <button className="studio-button" onClick={() => onNavigate('pos')}><CreditCard size={19} aria-hidden="true" />Nueva venta</button>
        <button className="studio-button-secondary" onClick={() => onNavigate(agenda)}><Calendar size={19} aria-hidden="true" />Abrir agenda</button>
      </div>
      <p className="daybook-open-note">{countLabel} · sin espera.</p>
    </div>
    <div className="daybook-open-team">
      <h3>Equipo disponible hoy</h3>
      <ul>{team.map(member => <li key={member.id}>
        <span className="daybook-open-avatar" aria-hidden="true">{member.name.trim().charAt(0).toLocaleUpperCase('es-MX')}</span>
        <div className="daybook-open-who">
          <p className="daybook-open-name">{member.name}</p>
          <p className="daybook-open-role">{member.barber?.especialidad || (member.barber?.horarioInicio && member.barber?.horarioFin ? `${member.barber.horarioInicio} – ${member.barber.horarioFin}` : 'Barbero')}</p>
        </div>
        <span className="daybook-open-free">Libre</span>
      </li>)}</ul>
    </div>
  </section>;
}

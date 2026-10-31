import { Cita } from '../types';
import { agendaStatus } from '../utils/agendaLayout';

export function nextBarberVisit(appointments: Cita[], barberId: string | null | undefined): Cita | null {
  if (!barberId) return null;
  const own = appointments.filter(cita => cita.barberoId === barberId && !cita.venta && ['PENDIENTE', 'CONFIRMADA', 'EN_CURSO', 'COMPLETADA'].includes(cita.estado));
  const priority = (cita: Cita) => cita.estado === 'EN_CURSO' ? 0 : cita.estado === 'COMPLETADA' ? 1 : 2;
  return [...own].sort((a, b) => priority(a) - priority(b) || new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime() || a.id.localeCompare(b.id))[0] || null;
}
export function barberVisitAction(cita: Cita) {
  if (cita.venta) return null;
  if (cita.estado === 'PENDIENTE' || cita.estado === 'CONFIRMADA') return { label: 'Empezar corte', status: 'EN_CURSO' };
  if (cita.estado === 'EN_CURSO') return { label: 'Terminar corte', status: 'COMPLETADA' };
  if (cita.estado === 'COMPLETADA') return { label: 'Cobrar', status: null };
  return null;
}

export function BarberDay({ appointments, barberId, zone, busy, loading, error, onStatus, onPay, onReference, onDetails }: { appointments: Cita[]; barberId?: string | null; zone: string; busy: boolean; loading: boolean; error: string; onStatus: (id: string, status: string) => void; onPay?: (cita: Cita) => void; onReference: (cita: Cita) => void; onDetails: (cita: Cita) => void }) {
  const own = appointments.filter(cita => cita.barberoId === barberId);
  const next = nextBarberVisit(own, barberId);
  const action = next ? barberVisitAction(next) : null;
  return <section className="barber-day" aria-labelledby="barber-day-title" aria-busy={loading || busy}>
    <div className="barber-day-heading"><div><h2 id="barber-day-title">Tu siguiente paso</h2></div>{!loading && !error && barberId && <span>{own.filter(c => c.estado === 'COMPLETADA').length} {own.filter(c => c.estado === 'COMPLETADA').length === 1 ? 'atención terminada' : 'atenciones terminadas'}</span>}</div>
    {error && <p role="alert" className="barber-day-error">{error}</p>}
    {loading ? <p role="status">Consultando tus citas…</p> : error ? null : !barberId ? <p>No tienes un perfil de barbero vinculado. El dueño puede revisar tu acceso en Equipo.</p> : !next ? <div className="barber-day-empty"><strong>Todo al día</strong><p>No tienes atenciones pendientes. Tus visitas anteriores siguen en la lista.</p></div> : <div className="barber-day-visit">
      <div className="barber-day-time"><strong>{new Date(next.fechaHora).toLocaleTimeString('es-MX', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false })}</strong><span>{next.duracionMinutos} minutos</span><span>{agendaStatus[next.estado]}</span></div>
      <div className="barber-day-client"><h3>{next.cliente?.nombre || 'Cliente de la cita'}</h3><p>{next.nombreServicio || 'Servicio reservado'}</p>{next.tipoCorte && <p><strong>Tipo de corte:</strong> {next.tipoCorte}</p>}{next.notas && <p className="barber-day-note"><strong>Nota de la visita:</strong> {next.notas}</p>}
      <div className="barber-day-secondary"><button type="button" disabled={busy} onClick={() => onReference(next)}>{next.tieneFotoReferencia ? 'Ver foto de referencia' : 'Referencia del corte'}</button><button type="button" disabled={busy} onClick={() => onDetails(next)}>Ver detalles</button></div></div>
      <div className="barber-day-actions">{action && <button type="button" className="studio-button-primary" disabled={busy || (!action.status && !onPay)} onClick={() => { if (action.status) onStatus(next.id, action.status); else onPay?.(next); }}>{busy ? 'Guardando estado…' : action.label}</button>}{next.estado === 'COMPLETADA' && !onPay && <p>Tu acceso no permite abrir el cobro. Solicita al dueño que revise tu permiso.</p>}<p>{next.estado === 'COMPLETADA' ? 'Corte terminado. Falta registrar el pago.' : 'El pago se registra después del corte.'}</p></div>
    </div>}
  </section>;
}

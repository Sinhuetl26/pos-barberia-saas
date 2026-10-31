import { branchToday } from './branchTime';

export function appointmentAgendaPath(appointment: { id: string; sucursalId: string; fechaHora: string }, branch: { id: string; zonaHoraria?: string } | null): string | null {
  if (!branch || appointment.sucursalId !== branch.id || !appointment.id || !Number.isFinite(Date.parse(appointment.fechaHora))) return null;
  try {
    const date = branchToday(branch.zonaHoraria || 'America/Mexico_City', new Date(appointment.fechaHora));
    return `/app/agenda?fecha=${date}&citaId=${encodeURIComponent(appointment.id)}`;
  } catch { return null; }
}

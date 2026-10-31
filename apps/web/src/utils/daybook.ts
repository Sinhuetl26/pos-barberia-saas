import { Barbero, Cita } from '../types';

export function daybookColumns(barbers: Barbero[], appointments: Cita[]) {
  const groups = new Map(barbers.filter(b => b.activo).map(b => [b.id, { id: b.id, name: b.nombre, todayCount: 0, appointments: [] as Cita[] }]));
  for (const appointment of appointments) {
    if (['CANCELADA', 'NO_SHOW'].includes(appointment.estado)) continue;
    let group = groups.get(appointment.barberoId);
    if (!group) {
      group = { id: appointment.barberoId, name: appointment.barbero?.nombre || 'Barbero no disponible', todayCount: 0, appointments: [] };
      groups.set(group.id, group);
    }
    group.todayCount++;
    // Keep overdue unattended visits visible until the owner resolves them.
    if (['PENDIENTE', 'CONFIRMADA', 'EN_CURSO'].includes(appointment.estado)) group.appointments.push(appointment);
  }
  return Array.from(groups.values()).map(group => ({ ...group, appointments: group.appointments.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)) }));
}

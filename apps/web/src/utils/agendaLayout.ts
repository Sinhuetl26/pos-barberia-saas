export const agendaStatus: Record<string, string> = {
  PENDIENTE: 'Por confirmar', CONFIRMADA: 'Confirmada', EN_CURSO: 'En atención',
  COMPLETADA: 'Completada', CANCELADA: 'Cancelada', NO_SHOW: 'No asistió'
};

export function clockMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return Number.isFinite(h + m) ? h * 60 + m : 540;
}

export function localMinutes(instant: string, zone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
  return Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
}

/** Overlapping appointments stay readable, including imported legacy conflicts. */
export function appointmentLanes<T extends { id: string; start: number; end: number }>(events: T[]) {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
  const groups: Array<Array<T & { lane: number }>> = [];
  let group: Array<T & { lane: number }> = [], groupEnd = -Infinity, laneEnds: number[] = [];
  for (const event of sorted) {
    if (event.start >= groupEnd) { if (group.length) groups.push(group); group = []; laneEnds = []; groupEnd = -Infinity; }
    let lane = laneEnds.findIndex(end => end <= event.start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = event.end;
    group.push({ ...event, lane }); groupEnd = Math.max(groupEnd, event.end);
  }
  if (group.length) groups.push(group);
  return groups.flatMap(items => items.map(item => ({ ...item, lanes: Math.max(...items.map(e => e.lane)) + 1 })));
}

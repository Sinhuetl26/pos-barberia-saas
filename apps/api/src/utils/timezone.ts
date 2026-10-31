function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
  return values;
}

function midnightUtc(year: number, month: number, day: number, timeZone: string) {
  const target = Date.UTC(year, month - 1, day);
  let estimate = target;
  for (let i = 0; i < 4; i++) {
    const p = localParts(new Date(estimate), timeZone);
    const observed = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const delta = target - observed;
    estimate += delta;
    if (delta === 0) break;
  }
  return new Date(estimate);
}

// Compute each midnight independently: a local day can have 23 or 25 hours.
export function localDayBounds(date: Date, timeZone: string) {
  const p = localParts(date, timeZone);
  const next = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  return {
    start: midnightUtc(p.year, p.month, p.day, timeZone),
    end: midnightUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), timeZone),
    label: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`,
  };
}

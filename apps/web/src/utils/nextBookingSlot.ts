export function addBookingDays(day: string, count: number) {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

/** Stop on errors: an unverified earlier day must not be skipped as if it were full. */
export async function findNextBookingSlot(start: string, last: string, load: (date: string) => Promise<{ slots: { hora: string; disponible: boolean }[] }>, cancelled: () => boolean) {
  for (let index = 0; index < 30; index++) {
    const date = addBookingDays(start, index);
    if (date > last || cancelled()) return null;
    const result = await load(date);
    if (cancelled()) return null;
    const slot = [...result.slots].filter(s => s.disponible).sort((a,b) => a.hora.localeCompare(b.hora))[0];
    if (slot) return { date, hora: slot.hora };
  }
  return null;
}

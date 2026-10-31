export interface AgendaCreationIntent {
  kind: 'cita' | 'walk-in';
  payload: Readonly<Record<string, any>> & { idempotencyKey: string };
  uncertain: boolean;
}
export function agendaCreationIntentKey(tenantId: string, userId: string) {
  return `systech:agenda-create:${encodeURIComponent(tenantId)}:${encodeURIComponent(userId)}`;
}
export function readAgendaCreationIntent(storage: Storage, key: string): AgendaCreationIntent | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (!value || !['cita', 'walk-in'].includes(value.kind) || !value.payload || typeof value.payload !== 'object' || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(value.payload.idempotencyKey)) throw new Error('La intención de agenda guardada requiere revisión antes de registrar otra cita.');
  return { kind: value.kind, payload: Object.freeze({ ...value.payload }), uncertain: Boolean(value.uncertain) };
}
export function writeAgendaCreationIntent(storage: Storage, key: string, intent: AgendaCreationIntent) {
  storage.setItem(key, JSON.stringify(intent));
}

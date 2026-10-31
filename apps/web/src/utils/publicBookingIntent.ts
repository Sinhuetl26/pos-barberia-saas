const MAX_AGE = 24 * 60 * 60 * 1000;
const storageKey = (tenantId: string) => `systech:public-booking:${tenantId}`;

// Durable storage keeps only the recovery capability. Photo and customer data stay in this browser session.
export function savePublicBookingIntent(durable: Storage, session: Storage, payload: any, createdAt = Date.now()) {
  const key = storageKey(payload.tenantId);
  session.setItem(key, JSON.stringify({ createdAt, payload }));
  try { durable.setItem(key, JSON.stringify({ version: 2, tenantId: payload.tenantId, idempotencyKey: payload.idempotencyKey, createdAt })); }
  catch (error) { session.removeItem(key); throw error; }
}

export function readPublicBookingIntent(durable: Storage, session: Storage, tenantId: string, now = Date.now()) {
  const key = storageKey(tenantId), raw = durable.getItem(key);
  if (!raw) return null;
  const marker = JSON.parse(raw);
  if (marker.tenantId !== tenantId || typeof marker.idempotencyKey !== 'string') throw new Error('La reserva pendiente requiere revisión.');
  if (marker.version !== 2) {
    // Migrate old pending payloads without losing their original retry key.
    savePublicBookingIntent(durable, session, marker, now);
    return marker;
  }
  const savedRaw = session.getItem(key);
  if (savedRaw) {
    const saved = JSON.parse(savedRaw);
    if (Number.isFinite(saved.createdAt) && now - saved.createdAt < MAX_AGE && saved.createdAt <= now
      && saved.payload?.tenantId === tenantId && saved.payload?.idempotencyKey === marker.idempotencyKey) return saved.payload;
    session.removeItem(key);
  }
  // Expiry must never silently create a new UUID after an uncertain response.
  return { tenantId, idempotencyKey: marker.idempotencyKey, __requiresRecovery: true };
}

export function clearPublicBookingIntent(durable: Storage, session: Storage, tenantId: string) {
  const key = storageKey(tenantId);
  durable.removeItem(key); session.removeItem(key);
}

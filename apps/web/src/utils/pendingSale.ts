export interface PendingSale { key: string; payload: any; storageKey: string; total: number; }
export const pendingSaleStorageKey = (tenantId: string, userId: string) => `systech.pos.pending:${tenantId}:${userId}`;
export function readPendingSale(storage: Pick<Storage, 'getItem'>, storageKey: string): PendingSale | null {
  const text = storage.getItem(storageKey);
  if (!text) return null;
  const value = JSON.parse(text);
  if (value.storageKey !== storageKey || typeof value.key !== 'string' || !/^[a-zA-Z0-9._:-]{1,128}$/.test(value.key) || value.payload?.idempotencyKey !== value.key || !Array.isArray(value.payload?.items) || !Number.isFinite(value.total)) throw new Error('El cobro pendiente necesita revisión.');
  return value;
}
export function savePendingSale(storage: Pick<Storage, 'setItem'>, sale: PendingSale) {
  // Persist before sending. If storage fails, do not start an unrecoverable payment.
  storage.setItem(sale.storageKey, JSON.stringify(sale));
}
export function pendingSaleCanBeReleased(error: { status?: number; code?: string; definitive?: boolean }) {
  // A lost/invalid response and server failures do not prove that a sale rolled back.
  if (error.definitive !== true) return false;
  if (error.status === 400) return true;
  return [403, 409].includes(error.status || 0) && [
    'PRICE_CONFIRMATION_REQUIRED', 'DISCOUNT_APPROVAL_INVALID', 'APPROVAL_CART_CHANGED',
    'DISCOUNT_LIMIT_EXCEEDED', 'DISCOUNT_REASON_REQUIRED', 'APPROVER_UNAVAILABLE'
  ].includes(error.code || '');
}

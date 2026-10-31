// One durable unresolved cash/refund action per signed-in user. Never silently
// replace an uncertain operation with changed amounts or a fresh key.
export interface FinancialIntent { path: string; body: any }
export function financialIntentKey(tenant: string, user: string) { return `systech:financial:${tenant}:${user}`; }
export function readFinancialIntent(storage: Storage, key: string): FinancialIntent | null {
  const value = storage.getItem(key);
  if (!value) return null;
  const result = JSON.parse(value);
  if (typeof result.path !== 'string' || !/^\/(cortes-caja\/(abrir|cerrar|movimiento|entrega)|ventas\/[^/]+\/(cancelar|devolver)|comisiones\/(pagar|liquidar-nomina))$/.test(result.path) || typeof result.body?.idempotencyKey !== 'string' || !/^[a-zA-Z0-9._:-]{1,128}$/.test(result.body.idempotencyKey)) throw new Error('No se puede interpretar la operación pendiente.');
  return result;
}

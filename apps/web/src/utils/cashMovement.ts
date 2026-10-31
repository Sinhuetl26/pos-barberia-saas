export const cashMovementLabels = { GASTO_MENOR: 'Gasto', RETIRO: 'Retiro', INGRESO_EXTRA: 'Ingreso' };
export type CashMovementType = keyof typeof cashMovementLabels;
export interface CashMovementDraft { sucursalId: string; corteCajaId?: string; tipo: CashMovementType; monto: number; concepto: string }

export function cashMovementAmount(raw: string) {
  const amount = Number(raw);
  if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(amount) || amount <= 0 || amount > 1e9) throw new Error('Indica un importe mayor que cero, con punto y hasta dos decimales.');
  return amount;
}
export function cashMovementPending(pending: { path: string; body: any } | null, branchId: string): 'ready' | 'recover' | 'blocked' {
  if (!pending) return 'ready';
  const body = pending.body;
  return pending.path === '/cortes-caja/movimiento' && body?.sucursalId === branchId && Object.prototype.hasOwnProperty.call(cashMovementLabels, body.tipo)
    && typeof body.monto === 'number' && Number.isFinite(body.monto) && body.monto > 0 && body.monto <= 1e9
    && typeof body.concepto === 'string' && body.concepto.trim().length > 0 && body.concepto.length <= 500 ? 'recover' : 'blocked';
}
export function cashMovementConfirmed(result: any, draft: CashMovementDraft) {
  const row = result?.movimiento;
  return result?.success === true && typeof row?.id === 'string' && row.id.length > 0 && row.sucursalId === draft.sucursalId
    && (!draft.corteCajaId || row.corteCajaId === draft.corteCajaId)
    && row.tipo === (draft.tipo === 'INGRESO_EXTRA' ? 'INGRESO' : draft.tipo)
    && Number.isFinite(Number(row.monto)) && Math.round(Number(row.monto) * 100) === Math.round(draft.monto * 100)
    && row.concepto === draft.concepto.trim();
}

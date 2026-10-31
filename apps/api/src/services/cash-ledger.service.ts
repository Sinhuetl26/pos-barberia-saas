import { createHash } from 'node:crypto';
import { prisma, Prisma } from '@systech/database';
import { AccessScope } from './authorization.service';
import { SaleError } from './financial-error';
import { moneyCents } from './pricing.service';

function fail(code: string, message: string, status = 400): never { throw new SaleError(status, code, message); }
export function cents(value: any, positive = false): number {
  if (typeof value !== 'number' && typeof value !== 'string') return fail('INVALID_AMOUNT', 'Importe inválido.');
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1e9 || Math.abs(number * 100 - Math.round(number * 100)) > 0.00001 || (positive && number <= 0)) return fail('INVALID_AMOUNT', 'Usa un importe válido con hasta dos decimales.');
  return moneyCents(number);
}
export const digest = (input: any) => createHash('sha256').update(JSON.stringify(input)).digest('hex');
export async function branchLock(tx: Prisma.TransactionClient, access: AccessScope, id: string) {
  // Shared ordering with sale creation: branch, then sorted products.
  if (!id || !await tx.sucursal.findFirst({ where: { id, tenantId: access.tenantId, eliminadoEn: null } })) fail('INVALID_BRANCH', 'Sucursal no disponible.', 404);
  await tx.$executeRaw`UPDATE "Sucursal" SET "id"="id" WHERE "id"=${id} AND "tenantId"=${access.tenantId}`;
}
export async function financialTransaction<T>(action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(action, { maxWait: 15000, timeout: 20000 }); }
    catch (error: any) {
      const retry = ['P2034', 'P2002'].includes(error.code) || (['P2028', 'P1008'].includes(error.code) && /locked|write conflict|timed out|expired/i.test(error.message));
      if (!retry) throw error;
      if (attempt >= 4) fail('FINANCIAL_RESULT_UNKNOWN', 'Reintenta la misma operación para consultar su resultado.', 503);
      await new Promise(resolve => setTimeout(resolve, 60 * 2 ** attempt));
    }
  }
}
export async function cashOperation(access: AccessScope, input: any, action: (tx: Prisma.TransactionClient) => Promise<any>) {
  const key = input.idempotencyKey;
  if (typeof key !== 'string' || !/^[a-zA-Z0-9._:-]{1,128}$/.test(key)) fail('KEY_REQUIRED', 'Esta operación requiere una clave de reintento.');
  const hash = digest({ ...input, actor: access.userId });
  return financialTransaction(async tx => {
    await branchLock(tx, access, input.sucursalId);
    const old = await tx.cajaOperacion.findFirst({ where: { tenantId: access.tenantId, clave: key } });
    if (old) {
      if (old.requestHash !== hash) fail('IDEMPOTENCY_CONFLICT', 'La clave corresponde a otra operación.', 409);
      return JSON.parse(old.respuesta!);
    }
    const row = await tx.cajaOperacion.create({ data: { tenantId: access.tenantId, sucursalId: input.sucursalId, clave: key, requestHash: hash } });
    const result = await action(tx);
    await tx.cajaOperacion.update({ where: { id: row.id }, data: { respuesta: JSON.stringify(result) } });
    return result;
  });
}
type Cut = Prisma.CorteCajaGetPayload<{}>;
export function openShift(tx: Prisma.TransactionClient, access: AccessScope, branch: string, required: true): Promise<Cut>;
export function openShift(tx: Prisma.TransactionClient, access: AccessScope, branch: string, required?: boolean): Promise<Cut | null>;
export async function openShift(tx: Prisma.TransactionClient, access: AccessScope, branch: string, required = false) {
  const cut = await tx.corteCaja.findFirst({ where: { tenantId: access.tenantId, sucursalId: branch, estado: 'ABIERTO' } });
  if (!cut && required) fail('CASH_NOT_OPEN', 'Abre la caja de esta sucursal antes de mover efectivo.');
  return cut;
}
export async function recordCash(tx: Prisma.TransactionClient, access: AccessScope, data: any) {
  return tx.registroCaja.create({ data: { tenantId: access.tenantId, usuarioId: access.userId, usuarioNombre: access.email, ...data } });
}
export function salePayments(sale: any): Record<string, number> {
  const total = moneyCents(sale.total);
  if (['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].includes(sale.metodoPago)) return { [sale.metodoPago]: total };
  const raw = JSON.parse(sale.detallesPago || '{}');
  const split: Record<string, number> = {};
  for (const method of ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']) {
    const value = Array.isArray(raw) ? raw.filter(v => v.metodo === method).reduce((sum, v) => sum + Number(v.monto), 0) : raw['monto' + method[0] + method.slice(1).toLowerCase()] || 0;
    split[method] = moneyCents(value);
  }
  if (Object.values(split).reduce((a, b) => a + b, 0) !== total) fail('PAYMENT_HISTORY_INVALID', 'Revisa el desglose histórico de pago antes de devolver.');
  return split;
}
export async function registerSaleCash(tx: Prisma.TransactionClient, access: AccessScope, sale: any, cut: any) {
  const collector = access.rol === 'BARBERO' || !cut ? access.userId : null;
  for (const [method, amount] of Object.entries(salePayments(sale))) {
    if (!amount) continue;
    await recordCash(tx, access, { sucursalId: sale.sucursalId, corteCajaId: cut?.id || null, ventaId: sale.id, tipo: 'VENTA', metodoPago: method, monto: amount / 100,
      custodiaUsuarioId: method === 'EFECTIVO' ? collector : null, concepto: `Cobro ${sale.folio}` });
  }
}
export async function custodyBalance(tx: Prisma.TransactionClient, access: AccessScope, branch: string, userId: string) {
  const sum = await tx.registroCaja.aggregate({ where: { tenantId: access.tenantId, sucursalId: branch, custodiaUsuarioId: userId, metodoPago: 'EFECTIVO' }, _sum: { monto: true } });
  return moneyCents(sum._sum.monto || 0);
}
export async function drawerBalance(tx: Prisma.TransactionClient, access: AccessScope, cut: Cut) {
  const sum = await tx.registroCaja.aggregate({ where: { tenantId: access.tenantId, sucursalId: cut.sucursalId, corteCajaId: cut.id, custodiaUsuarioId: null, metodoPago: 'EFECTIVO' }, _sum: { monto: true } });
  return moneyCents(cut.fondoInicial) + moneyCents(sum._sum.monto || 0);
}
export async function cashSummary(tx: Prisma.TransactionClient, access: AccessScope, cut: any, count: number) {
  const legacy = await tx.venta.count({ where: { tenantId: access.tenantId, sucursalId: cut.sucursalId, cobradoPorId: null, fecha: { gte: cut.fechaApertura }, estado: { not: 'CANCELADA' } } });
  if (legacy) fail('LEGACY_CASH_REVIEW', 'Este turno contiene ventas históricas sin registro de custodia. Requiere conciliación antes de cerrar.', 409);
  const rows = await tx.registroCaja.findMany({ where: { tenantId: access.tenantId, sucursalId: cut.sucursalId, corteCajaId: cut.id } });
  let cash = 0, card = 0, transfer = 0, income = 0, withdrawal = 0, expense = 0, drawer = 0, sales = 0, handoffs = 0, drawerSales = 0;
  for (const row of rows) {
    const amount = moneyCents(row.monto);
    if (['VENTA', 'DEVOLUCION'].includes(row.tipo)) {
      sales += amount;
      if (row.metodoPago === 'EFECTIVO') cash += amount;
      if (row.metodoPago === 'TARJETA') card += amount;
      if (row.metodoPago === 'TRANSFERENCIA') transfer += amount;
      if (row.metodoPago === 'EFECTIVO' && !row.custodiaUsuarioId) drawerSales += amount;
    }
    if (row.metodoPago === 'EFECTIVO' && !row.custodiaUsuarioId) drawer += amount;
    if (row.tipo === 'INGRESO' && !row.custodiaUsuarioId) income += amount;
    if (row.tipo === 'ENTREGA' && !row.custodiaUsuarioId) handoffs += amount;
    if (row.tipo === 'RETIRO') withdrawal -= amount;
    if (row.tipo === 'GASTO_MENOR') expense -= amount;
  }
  const sold = await tx.venta.aggregate({ where: { tenantId: access.tenantId, sucursalId: cut.sucursalId, corteCajaId: cut.id }, _sum: { propina: true } });
  const refunds = await tx.devolucionVenta.findMany({ where: { tenantId: access.tenantId, sucursalId: cut.sucursalId, id: { in: rows.filter(r => r.tipo === 'DEVOLUCION').map(r => r.concepto.split(':')[0]) } } });
  const tips = moneyCents(sold._sum.propina || 0) - refunds.reduce((sum, r) => sum + moneyCents(r.propina), 0);
  const expected = moneyCents(cut.fondoInicial) + drawer, difference = count - expected;
  return { fondoInicial: Number(cut.fondoInicial), totalEfectivo: cash / 100, totalTarjeta: card / 100, totalTransferencia: transfer / 100,
    totalVentas: sales / 100, totalPropinas: tips / 100, totalIngresos: income / 100, totalEntregas: handoffs / 100, efectivoCobradoEnCaja: drawerSales / 100, totalRetiros: withdrawal / 100, totalGastosMenores: expense / 100,
    efectivoEsperado: expected / 100, conteoReal: count / 100, descuadre: difference / 100, descuadrado: difference !== 0 };
}
export async function handoff(access: AccessScope, input: any) {
  const amount = cents(input.monto, true);
  return cashOperation(access, { ...input, operacion: 'ENTREGA' }, async tx => {
    const holder = await tx.registroCaja.findFirst({ where: { tenantId: access.tenantId, sucursalId: input.sucursalId, custodiaUsuarioId: input.usuarioId, tipo: 'VENTA' } });
    if (!holder) fail('COLLECTOR_NOT_FOUND', 'Cobrador no disponible en esta sucursal.', 404);
    const balance = await custodyBalance(tx, access, input.sucursalId, input.usuarioId);
    if (amount > balance) fail('INSUFFICIENT_CUSTODY', 'El importe excede el efectivo pendiente de entregar.');
    const cut = await openShift(tx, access, input.sucursalId, true);
    const concept = `Entrega de ${holder.usuarioNombre}; recibe ${access.email}`;
    await recordCash(tx, access, { sucursalId: input.sucursalId, corteCajaId: null, tipo: 'ENTREGA', metodoPago: 'EFECTIVO', monto: -amount / 100, custodiaUsuarioId: input.usuarioId, concepto: concept });
    const receipt = await recordCash(tx, access, { sucursalId: input.sucursalId, corteCajaId: cut.id, tipo: 'ENTREGA', metodoPago: 'EFECTIVO', monto: amount / 100, concepto: concept });
    return { success: true, recibo: receipt, saldoPendiente: (balance - amount) / 100 };
  });
}

import { prisma } from '@systech/database';
import { AccessScope } from './authorization.service';
import { SaleError } from './financial-error';
import { cashOperation, cents, drawerBalance, openShift, recordCash } from './cash-ledger.service';
import { moneyCents } from './pricing.service';

export async function settleCommissions(access: AccessScope, input: any, payroll: boolean) {
  if (payroll && typeof input.barberoId !== 'string') throw new SaleError(400, 'BARBER_REQUIRED', 'Selecciona un barbero para liquidar.');
  const ids = input.comisionIds;
  if (!payroll && (!Array.isArray(ids) || !ids.length)) throw new SaleError(400, 'COMMISSIONS_REQUIRED', 'Selecciona comisiones pendientes.');
  const initial = await prisma.comision.findMany({ where: { tenantId: access.tenantId, ...(input.barberoId ? { barberoId: input.barberoId } : {}), ...(Array.isArray(ids) && ids.length ? { id: { in: ids } } : {}) }, include: { barbero: true } });
  if (!initial.length || (Array.isArray(ids) && new Set(ids).size !== initial.length)) throw new SaleError(404, 'COMMISSIONS_NOT_FOUND', 'Comisiones no disponibles para esta cuenta.');
  const branches = new Set(initial.map(c => c.barbero.sucursalId));
  if (branches.size !== 1) throw new SaleError(400, 'ONE_BRANCH_REQUIRED', 'Liquida las comisiones de una sucursal a la vez.');
  const method = input.metodoPagoComision || input.metodoPago || 'TRANSFERENCIA';
  if (!['EFECTIVO', 'TRANSFERENCIA'].includes(method)) throw new SaleError(400, 'INVALID_PAYMENT', 'Usa efectivo o transferencia para liquidar.');
  const advances = cents(input.adelantos || 0), deductions = cents(input.deducciones || 0);
  return cashOperation(access, { ...input, sucursalId: [...branches][0], operacion: payroll ? 'NOMINA' : 'PAGO_COMISIONES' }, async tx => {
    const commissions = await tx.comision.findMany({ where: { id: { in: initial.map(c => c.id) }, tenantId: access.tenantId, pagada: false }, include: { barbero: true } });
    if (Array.isArray(ids) && commissions.length !== initial.length) throw new SaleError(409, 'COMMISSIONS_CHANGED', 'La selección incluye comisiones liquidadas. Actualiza antes de pagar.');
    if (!commissions.length) throw new SaleError(400, 'NO_PENDING_COMMISSIONS', 'No hay comisiones pendientes.');
    const barberIds = [...new Set(commissions.map(c => c.barberoId))];
    const adjustments = await tx.comision.findMany({ where: { tenantId: access.tenantId, barberoId: { in: barberIds }, pagada: false, origen: 'DEVOLUCION' } });
    if (adjustments.some(c => !commissions.some(selected => selected.id === c.id))) throw new SaleError(400, 'INCLUDE_RETURN_ADJUSTMENTS', 'Incluye los ajustes pendientes de devoluciones de estos barberos antes de liquidar.');
    // Never erase a negative balance with Math.max(0, net). It carries forward.
    for (const barberId of barberIds) if (commissions.filter(c => c.barberoId === barberId).reduce((sum, c) => sum + moneyCents(c.monto), 0) < 0) throw new SaleError(400, 'NEGATIVE_COMMISSION_BALANCE', 'El ajuste excede las comisiones pendientes; conserva el saldo para la próxima liquidación.');
    const gross = commissions.reduce((sum, c) => sum + moneyCents(c.monto), 0), net = gross - advances - deductions;
    if (net < 0) throw new SaleError(400, 'DEDUCTIONS_EXCEED_BALANCE', 'Los adelantos y deducciones exceden el saldo de comisiones.');
    const branch = commissions[0].barbero.sucursalId;
    const cut = await openShift(tx, access, branch, method === 'EFECTIVO' && net > 0);
    if (method === 'EFECTIVO' && cut && net > await drawerBalance(tx, access, cut)) throw new SaleError(400, 'INSUFFICIENT_DRAWER', 'La caja no tiene suficiente efectivo registrado para liquidar.');
    await tx.comision.updateMany({ where: { id: { in: commissions.map(c => c.id) }, pagada: false }, data: { pagada: true, fechaPago: new Date(), metodoPagoComision: method, corteCajaId: cut?.id || null } });
    let receipt: any = null;
    if (payroll) {
      const sequence = await tx.secuencia.upsert({ where: { tenantId_sucursalId_tipo: { tenantId: access.tenantId, sucursalId: branch, tipo: 'NOMINA' } }, create: { tenantId: access.tenantId, sucursalId: branch, tipo: 'NOMINA', ultimoValor: 1 }, update: { ultimoValor: { increment: 1 } } });
      const folio = `NOM-${branch.slice(0, 8)}-${String(sequence.ultimoValor).padStart(6, '0')}`;
      const paid = await tx.pagoNomina.create({ data: { tenantId: access.tenantId, barberoId: input.barberoId, folio, folioConsecutivo: sequence.ultimoValor, subtotalComisiones: gross / 100, adelantos: advances / 100, deducciones: deductions / 100,
        netoPagado: net / 100, metodoPago: method, concepto: input.concepto || 'Liquidación de comisiones', detalles: JSON.stringify({ comisionIds: commissions.map(c => c.id) }), usuarioLiquidador: access.email } });
      receipt = { id: paid.id, folioRecibo: paid.folio, barbero: commissions[0].barbero.nombre, fechaLiquidacion: paid.fechaLiquidacion.toISOString(), comisionesLiquidadas: commissions.length, subtotalComisiones: gross / 100, adelantos: advances / 100, deducciones: deductions / 100, netoPagado: net / 100, metodoPago: method, concepto: paid.concepto };
    }
    if (method === 'EFECTIVO' && net) await recordCash(tx, access, { sucursalId: branch, corteCajaId: cut!.id, tipo: 'RETIRO', metodoPago: method, monto: -net / 100, concepto: `Comisiones ${receipt?.folioRecibo || commissions.map(c => c.id).join(', ')}` });
    await tx.auditoriaLog.create({ data: { tenantId: access.tenantId, usuarioEmail: access.email, accion: 'COMISIONES_LIQUIDADAS', detalles: JSON.stringify({ ids: commissions.map(c => c.id), neto: net / 100, metodoPago: method, recibo: receipt?.id }) } });
    return { success: true, count: commissions.length, message: 'Liquidación registrada.', reciboNomina: receipt, netoPagado: net / 100 };
  });
}

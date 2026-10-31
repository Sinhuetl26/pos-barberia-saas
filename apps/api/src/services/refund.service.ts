import { prisma } from '@systech/database';
import { AccessScope } from './authorization.service';
import { SaleError } from './financial-error';
import { cashOperation, cents, custodyBalance, drawerBalance, openShift, recordCash, salePayments } from './cash-ledger.service';
import { moneyCents } from './pricing.service';

function fail(code: string, text: string, status = 400): never { throw new SaleError(status, code, text); }
const portion = (cents: number, qty: number, totalQty: number) => Number((BigInt(cents) * BigInt(qty) * 2n + BigInt(totalQty)) / (BigInt(totalQty) * 2n));
export async function refundSale(access: AccessScope, saleId: string, input: any, cancel = false) {
  const sale = await prisma.venta.findFirst({ where: { id: saleId, tenantId: access.tenantId } });
  if (!sale) fail('SALE_NOT_FOUND', 'Venta no disponible.', 404);
  if (typeof input.motivo !== 'string' || input.motivo.trim().length < 3 || input.motivo.length > 500) fail('REASON_REQUIRED', 'Indica un motivo de 3 a 500 caracteres.');
  const body = { ...input, motivo: input.motivo.trim(), sucursalId: sale!.sucursalId, ventaId: saleId, operacion: cancel ? 'CANCELACION' : 'DEVOLUCION' };
  return cashOperation(access, body, async tx => {
    const current = await tx.venta.findFirstOrThrow({ where: { id: saleId, tenantId: access.tenantId }, include: { items: true, devoluciones: true, comisiones: true } });
    if (current.estado === 'CANCELADA') fail('ALREADY_REFUNDED', 'Esta venta ya fue devuelta por completo.');
    if (!current.cobradoPorId || !current.items.length) fail('LEGACY_REVIEW_REQUIRED', 'Esta venta histórica requiere revisión de sus reglas antes de devolverla.');
    const returned = new Map<string, number>();
    for (const prior of current.devoluciones) for (const line of JSON.parse(prior.itemsJson)) returned.set(line.itemId, (returned.get(line.itemId) || 0) + line.cantidad);
    const requested = cancel ? current.items.map(i => ({ itemId: i.id, cantidad: i.cantidad - (returned.get(i.id) || 0) })).filter(i => i.cantidad) : input.items;
    if (!Array.isArray(requested) || (!requested.length && !input.propina && !cancel) || new Set(requested.map(i => i.itemId)).size !== requested.length) fail('INVALID_RETURN_ITEMS', 'Selecciona las unidades que deseas devolver.');
    let amount = 0, commission = 0;
    const lines = (requested as { itemId: string; cantidad: number }[]).map(line => {
      const item = current.items.find(i => i.id === line.itemId);
      const before = returned.get(line.itemId) || 0;
      if (!item || !Number.isInteger(line.cantidad) || line.cantidad <= 0 || before + line.cantidad > item.cantidad) fail('RETURN_EXCEEDS_SALE', 'La devolución excede las unidades disponibles.');
      const after = before + line.cantidad;
      const net = moneyCents(item.subtotal) - moneyCents(item.descuento);
      const refund = portion(net, after, item.cantidad) - portion(net, before, item.cantidad);
      const reversal = portion(moneyCents(item.comision), after, item.cantidad) - portion(moneyCents(item.comision), before, item.cantidad);
      amount += refund; commission += reversal;
      return { itemId: item.id, productoId: item.productoId, nombre: item.nombreItem, tipo: item.tipoItem, cantidad: line.cantidad, monto: refund / 100, comision: reversal / 100 };
    });
    const previousTips = current.devoluciones.reduce((sum, r) => sum + moneyCents(r.propina), 0);
    const tips = cancel ? moneyCents(current.propina) - previousTips : cents(input.propina || 0);
    if (tips + previousTips > moneyCents(current.propina)) fail('TIP_EXCEEDS_SALE', 'La propina devuelta excede la original.');
    amount += tips;
    const already = current.devoluciones.reduce((sum, r) => sum + moneyCents(r.total), 0);
    if (amount < 0 || (!lines.length && !tips) || already + amount > moneyCents(current.total)) fail('INVALID_RETURN_TOTAL', 'Importe de devolución inválido.');
    const original = salePayments(current), used: Record<string, number> = {};
    for (const prior of current.devoluciones) for (const [method, val] of Object.entries(JSON.parse(prior.pagosJson))) used[method] = (used[method] || 0) + moneyCents(val);
    const remaining = Object.entries(original).map(([method, val]) => ({ method, amount: val - (used[method] || 0) }));
    const totalRemaining = remaining.reduce((sum, r) => sum + r.amount, 0);
    // Largest remainder allocation uses the original available payment composition.
    const allocated = remaining.map(r => ({ ...r, refund: totalRemaining ? Number(BigInt(amount) * BigInt(r.amount) / BigInt(totalRemaining)) : 0, remainder: totalRemaining ? BigInt(amount) * BigInt(r.amount) % BigInt(totalRemaining) : 0n }));
    let missing = amount - allocated.reduce((sum, r) => sum + r.refund, 0);
    for (const row of [...allocated].sort((a, b) => a.remainder === b.remainder ? a.method.localeCompare(b.method) : a.remainder > b.remainder ? -1 : 1)) if (missing-- > 0) row.refund++;
    const payments = Object.fromEntries(allocated.filter(r => r.refund).map(r => [r.method, r.refund / 100]));
    const cash = allocated.find(r => r.method === 'EFECTIVO')?.refund || 0;
    const fromCollector = input.origenEfectivo === 'COBRADOR';
    if (cash && fromCollector && cash > await custodyBalance(tx, access, current.sucursalId, current.cobradoPorId)) fail('INSUFFICIENT_CUSTODY', 'El cobrador ya no conserva ese efectivo; registra la salida desde caja.');
    const cut = await openShift(tx, access, current.sucursalId, Boolean(cash && !fromCollector));
    if (cash && !fromCollector && cut && cash > await drawerBalance(tx, access, cut)) fail('INSUFFICIENT_DRAWER', 'La caja no tiene suficiente efectivo registrado para esta devolución.');
    for (const id of [...new Set<string>(lines.filter(l => l.tipo === 'PRODUCTO').map(l => l.productoId))].sort()) await tx.$executeRaw`UPDATE "Producto" SET "id"="id" WHERE "id"=${id} AND "tenantId"=${access.tenantId}`;
    const refund = await tx.devolucionVenta.create({ data: { tenantId: access.tenantId, sucursalId: current.sucursalId, ventaId: current.id, motivo: body.motivo, usuarioId: access.userId, usuarioNombre: access.email,
      itemsJson: JSON.stringify(lines), pagosJson: JSON.stringify(payments), total: amount / 100, comision: commission / 100, propina: tips / 100 } });
    for (const line of lines) {
      if (line.tipo !== 'PRODUCTO') continue;
      const product = await tx.producto.findFirstOrThrow({ where: { id: line.productoId, tenantId: access.tenantId } });
      await tx.producto.update({ where: { id: product.id }, data: { stockActual: { increment: line.cantidad } } });
      await tx.kardexMovimiento.create({ data: { tenantId: access.tenantId, sucursalId: current.sucursalId, productoId: product.id, tipoMovimiento: 'DEVOLUCION_VENTA', cantidad: line.cantidad, stockAnterior: product.stockActual,
        stockNuevo: Number(product.stockActual) + line.cantidad, motivo: `${current.folio}: ${body.motivo}`, usuarioId: access.userId } });
    }
    if (commission) await tx.comision.create({ data: { tenantId: access.tenantId, ventaId: current.id, barberoId: current.barberoId, monto: -commission / 100, origen: 'DEVOLUCION', devolucionId: refund.id } });
    for (const [method, val] of Object.entries(payments)) await recordCash(tx, access, { sucursalId: current.sucursalId, ventaId: current.id, corteCajaId: cut?.id || null, tipo: 'DEVOLUCION', metodoPago: method,
      monto: -val, custodiaUsuarioId: method === 'EFECTIVO' && fromCollector ? current.cobradoPorId : null, concepto: `${refund.id}:${current.folio} · ${body.motivo}` });
    const complete = current.items.every(item => (returned.get(item.id) || 0) + (lines.find(line => line.itemId === item.id)?.cantidad || 0) === item.cantidad) && previousTips + tips === moneyCents(current.propina);
    await tx.venta.update({ where: { id: current.id }, data: { estado: complete ? 'CANCELADA' : 'PARCIAL_DEVUELTA', totalDevuelto: { increment: amount / 100 }, propinaDevuelta: { increment: tips / 100 }, motivoCancelacion: body.motivo, canceladoPor: access.email } });
    if (current.clienteId) await tx.clienteFinal.updateMany({ where: { id: current.clienteId, tenantId: access.tenantId }, data: { gastoTotal: { decrement: amount / 100 }, ...(complete && JSON.parse(current.detallesPago || '{}').registroVisita === true ? { totalVisitas: { decrement: 1 } } : {}) } });
    await tx.auditoriaLog.create({ data: { tenantId: access.tenantId, usuarioEmail: access.email, accion: 'DEVOLUCION_VENTA', detalles: JSON.stringify({ ventaId: current.id, devolucionId: refund.id, importe: amount / 100, motivo: body.motivo, usuarioId: access.userId }) } });
    return { success: true, devolucion: refund, folio: current.folio, estado: complete ? 'CANCELADA' : 'PARCIAL_DEVUELTA', mensaje: 'Devolución registrada. Los pagos electrónicos se reintegran por su proveedor o banco.' };
  });
}

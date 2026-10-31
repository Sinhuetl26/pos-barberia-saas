import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '@systech/database';
import { calculateSaleTotals, moneyCents, appointmentCatalog } from './pricing.service';
import type { AccessScope } from './authorization.service';
import { openShift, registerSaleCash } from './cash-ledger.service';
import { SaleError } from './financial-error';
import { consumeServiceSupplies } from './service-consumption.service';
import { resolveProfessionalPrices } from './professional-pricing.service';
import { authorizeSaleDiscount } from './discount-policy.service';
import { receiptCollectorName } from '../utils/receipt-identity';
export { SaleError } from './financial-error';
// Authorization middleware enriches selections; never reuse a mutable selection across requests.
const includes = () => ({ items: true, barbero: true, sucursal: true, cliente: true } as const);
const fail = (status: number, code: string, message: string): never => { throw new SaleError(status, code, message); };
export function saleRequestHash(input: any): string {
  // Prices, labels and taxes from the client have no authority.
  const snapshot = {
    sucursalId: input.sucursalId, barberoId: input.barberoId, clienteId: input.clienteId || null, citaId: input.citaId || null,
    metodoPago: input.metodoPago, descuento: moneyCents(input.descuento), propina: moneyCents(input.propina),
    motivoDescuento:input.motivoDescuento?.trim()||null,aprobacionDescuentoId:input.aprobacionDescuentoId||null,totalConfirmado:input.totalConfirmado??null,
    efectivoRecibido: input.efectivoRecibido ?? input.detallesPago?.efectivoRecibido ?? null,
    montoEfectivo: input.montoEfectivo ?? input.detallesPago?.montoEfectivo ?? null,
    montoTarjeta: input.montoTarjeta ?? input.detallesPago?.montoTarjeta ?? null,
    items: [...input.items].sort((a, b) => a.productoId.localeCompare(b.productoId)).map(i => ({ productoId: i.productoId, cantidad: i.cantidad }))
  };
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}
function payment(input: any, total: number, key: string) {
  const expected = moneyCents(total), details = input.detallesPago || {};
  const money = (value: any) => {
    try { const cents = moneyCents(value); if (cents < 0) throw new Error(); return cents; }
    catch { return fail(400, 'INVALID_PAYMENT', 'Importe de pago inválido.'); }
  };
  if (input.metodoPago === 'EFECTIVO') {
    const received = money(input.efectivoRecibido ?? details.efectivoRecibido ?? input.montoEfectivo ?? total);
    if (received < expected) fail(400, 'INSUFFICIENT_PAYMENT', 'El efectivo recibido es menor al total.');
    return { metodo: input.metodoPago, efectivoRecibido: received / 100, montoEfectivo: total, cambio: (received - expected) / 100, total, idempotencyKey: key };
  }
  if (input.metodoPago === 'MIXTO') {
    const cash = money(input.montoEfectivo ?? details.montoEfectivo ?? 0), card = money(input.montoTarjeta ?? details.montoTarjeta ?? 0);
    if (cash + card !== expected) fail(400, 'PAYMENT_MISMATCH', 'Efectivo y tarjeta deben sumar exactamente el total, en centavos.');
    const received = money(input.efectivoRecibido ?? details.efectivoRecibido ?? cash / 100);
    if (received < cash) fail(400, 'INSUFFICIENT_CASH_PART', 'El efectivo recibido no cubre su parte del pago.');
    return { metodo: input.metodoPago, montoEfectivo: cash / 100, montoTarjeta: card / 100, efectivoRecibido: received / 100, cambio: (received - cash) / 100, total, idempotencyKey: key };
  }
  return { metodo: input.metodoPago, total, idempotencyKey: key };
}
export async function processSale(access: AccessScope, input: any, suppliedKey?: string) {
  const { tenantId } = access, key = suppliedKey || randomUUID(), requestHash = saleRequestHash(input);
  const replay = async () => {
    const operation = await prisma.pOSOperacion.findFirst({ where: { tenantId, clave: key } });
    if (!operation) return null;
    if (operation.requestHash !== requestHash) fail(409, 'IDEMPOTENCY_CONFLICT', 'Esta intención ya fue usada con otros datos. Revisa el ticket antes de iniciar otra venta.');
    const venta = operation.ventaId ? await prisma.venta.findFirst({ where: { id: operation.ventaId, tenantId }, include: includes() }) : null;
    if (!venta) fail(404, 'SALE_NOT_AVAILABLE', 'La venta no está disponible para esta cuenta.');
    return { success: true, venta, ...JSON.parse(operation.respuesta || '{}'), replayed: true, idempotencyKey: key };
  };
  const previous = await replay(); if (previous) return previous;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        // The unique row claims an intention across processes; rollback releases it.
        const operation = await tx.pOSOperacion.create({ data: { tenantId, clave: key, requestHash } });
        await tx.$executeRaw`UPDATE "Sucursal" SET "id"="id" WHERE "id"=${input.sucursalId} AND "tenantId"=${tenantId}`;
        const branch = await tx.sucursal.findFirst({ where: { id: input.sucursalId, tenantId, eliminadoEn: null } });
        if (!branch) fail(404, 'INVALID_BRANCH', 'Sucursal no disponible.');
        const barber = await tx.barbero.findFirst({ where: { id: input.barberoId, sucursalId: input.sucursalId, activo: true, eliminadoEn: null, sucursal: { tenantId } } });
        if (!barber) fail(404, 'BARBER_NOT_FOUND', 'Barbero no disponible para esta sucursal.');
        if (access.rol === 'BARBERO' && barber!.id !== access.barberoId) fail(403, 'FORBIDDEN', 'Solo puedes cobrar tus propios servicios.');
        if (input.clienteId && !await tx.clienteFinal.findFirst({ where: { id: input.clienteId, tenantId } })) fail(404, 'INVALID_CLIENTE', 'Cliente no disponible.');
        let appointment: any = null;
        if (input.citaId) {
          await tx.$executeRaw`UPDATE "Cita" SET "id"="id" WHERE "id"=${input.citaId} AND "tenantId"=${tenantId}`;
          appointment = await tx.cita.findFirst({ where: { id: input.citaId, tenantId, sucursalId: input.sucursalId, barberoId: input.barberoId } });
          if (!appointment || (input.clienteId && appointment.clienteId !== input.clienteId)) fail(404, 'INVALID_CITA', 'Cita no disponible.');
          if (['CANCELADA', 'NO_SHOW'].includes(appointment.estado)) fail(400, 'CITA_CANCELLED', 'No se puede cobrar una cita cancelada.');
          if (await tx.venta.findFirst({ where: { citaId: input.citaId, tenantId } })) fail(409, 'APPOINTMENT_ALREADY_SOLD', 'Esta cita ya tiene una venta.');
        }
        // Stable ordering also serializes shared products across branches.
        const ids = [...new Set<string>(input.items.map((i: any) => i.productoId))].sort();
        for (const id of ids) await tx.$executeRaw`UPDATE "Producto" SET "id"="id" WHERE "id"=${id} AND "tenantId"=${tenantId}`;
        const products = await tx.producto.findMany({ where: { id: { in: ids }, tenantId, activo: true, eliminadoEn: null } });
        if (products.length !== ids.length || products.some(p => p.sucursalId && p.sucursalId !== input.sucursalId)) fail(400, 'INVALID_PRODUCT', 'El catálogo cambió o un producto no está disponible en esta sucursal.');
        if(products.some(p=>p.naturaleza==='INSUMO'))fail(400,'SUPPLY_NOT_FOR_SALE','Los insumos operativos se consumen por receta; no se cobran como productos de reventa.');
        const servicePct = Number(barber!.comisionServiciosPct ?? 50), productPct = Number(barber!.comisionProductosPct ?? 10);
        let pricedProducts:any[]=await resolveProfessionalPrices(tx,tenantId,input.sucursalId,input.barberoId,products);
        if(appointment){
          try { pricedProducts=appointmentCatalog(products,input.items,appointment); }
          catch(error:any){ fail(409,error.message==='BOOKING_SERVICES_MISMATCH'?'BOOKING_SERVICES_MISMATCH':'BOOKING_SNAPSHOT_INVALID',error.message==='BOOKING_SERVICES_MISMATCH'?'El ticket debe contener todos los servicios reservados, una unidad de cada uno. Puedes agregar productos de reventa.':'La reserva histórica requiere revisión antes de cobrar.'); }
        }
        const calculation = calculateSaleTotals(new Map(pricedProducts.map(p => [p.id, p])) as any, input.items, input.descuento, input.propina, servicePct, productPct);
        if(!appointment&&pricedProducts.some(p=>!p.resolucionPrecio?.heredado)&&(input.totalConfirmado===undefined||input.totalConfirmado===null||moneyCents(input.totalConfirmado)!==moneyCents(calculation.total)))fail(409,'PRICE_CONFIRMATION_REQUIRED','Revisa el precio de este profesional y confirma el total antes de cobrar.');
        const discountAuthorization=await authorizeSaleDiscount(tx,access,input,calculation);
        const details = payment(input, calculation.total, key);
        const last = await tx.venta.aggregate({ where: { tenantId, sucursalId: input.sucursalId }, _max: { folioConsecutivo: true } });
        const history = await tx.venta.findMany({ where: { tenantId, sucursalId: input.sucursalId }, select: { folio: true } });
        const visibleMax = history.reduce((max, sale) => Math.max(max, /^A-\d+$/.test(sale.folio || '') ? Number(sale.folio!.slice(2)) : 0), 0);
        const oldSequence = await tx.secuencia.findFirst({ where: { tenantId, sucursalId: input.sucursalId, tipo: 'VENTA' } });
        const next = Math.max(last._max.folioConsecutivo || 0, visibleMax, oldSequence?.ultimoValor || 0) + 1;
        if (!Number.isSafeInteger(next) || next > 2_147_483_647) fail(409, 'FOLIO_EXHAUSTED', 'La serie requiere revisión.');
        await tx.secuencia.upsert({ where: { tenantId_sucursalId_tipo: { tenantId, sucursalId: input.sucursalId, tipo: 'VENTA' } }, create: { tenantId, sucursalId: input.sucursalId, tipo: 'VENTA', ultimoValor: next }, update: { ultimoValor: next } });
        const folio = `A-${String(next).padStart(6, '0')}`, lowStockAlerts: any[] = [];
        for (const item of calculation.preparedItems) {
          if (item.tipoItem !== 'PRODUCTO') continue;
          const updated = await tx.producto.updateMany({ where: { id: item.productoId, tenantId, stockActual: { gte: item.cantidad } }, data: { stockActual: { decrement: item.cantidad } } });
          if (!updated.count) fail(400, 'INSUFFICIENT_STOCK', `Stock insuficiente para ${item.nombreItem}.`);
          const live = await tx.producto.findFirstOrThrow({ where: { id: item.productoId, tenantId } });
          await tx.kardexMovimiento.create({ data: { tenantId, sucursalId: input.sucursalId, productoId: live.id, tipoMovimiento: 'VENTA_POS', cantidad: -item.cantidad, stockAnterior: Number(live.stockActual) + item.cantidad, stockNuevo: live.stockActual, motivo: `Venta ${folio}`, usuarioId: access.userId, metadataJson:JSON.stringify({folio,costoUnitario:live.costo?.toString()||null,costoConocido:live.costo!==null&&Number(live.costo)>0}) } });
          if (Number(live.stockActual) <= Number(live.stockMinimo)) lowStockAlerts.push({ nombre: live.nombre, stockNuevo: live.stockActual, stockMinimo: live.stockMinimo });
        }
        const collectorName = await receiptCollectorName(tx, tenantId, access.userId);
        const venta = await tx.venta.create({ data: {
          tenantId, sucursalId: input.sucursalId, barberoId: input.barberoId, clienteId: input.clienteId || null, citaId: input.citaId || null,
          folio, serie: 'A', folioConsecutivo: next, subtotal: calculation.subtotal, descuento: calculation.descuento,
          propina: calculation.propina, impuesto: calculation.impuesto, total: calculation.total,
          metodoPago: input.metodoPago, detallesPago: JSON.stringify({ ...details, descuentoAutorizado:discountAuthorization,motivoDescuento:input.motivoDescuento||null,preciosProfesional:pricedProducts.filter(p=>p.tipo==='SERVICIO').map(p=>({productoId:p.id,precio:Number(p.precioVenta),resolucionPrecio:p.resolucionPrecio})), registroVisita: Boolean(input.clienteId && appointment?.estado !== 'COMPLETADA'), reglasComision: { serviciosPct: servicePct, productosPct: productPct, base: 'Importe por línea después de descuento y sin impuesto incluido ni propina', redondeo: 'Mitad hacia arriba a centavos por línea; devolución por proporción acumulada de unidades' } }), items: { create: calculation.preparedItems },
          cobradoPorId: access.userId, cobradoPorNombre: collectorName,
          corteCajaId: (await openShift(tx, access, input.sucursalId))?.id || null
        }, include: includes() });
        await consumeServiceSupplies(tx,access,{sucursalId:input.sucursalId,citaId:input.citaId,ventaId:venta.id,servicios:calculation.preparedItems.filter(i=>i.tipoItem==='SERVICIO').map(i=>({productoId:i.productoId,cantidad:i.cantidad}))});
        if(discountAuthorization.aprobacion){await tx.aprobacionDescuento.update({where:{id:discountAuthorization.aprobacion.id},data:{estado:'USADA',ventaId:venta.id}});await tx.auditoriaLog.create({data:{tenantId,usuarioEmail:access.email,accion:'DESCUENTO_APLICADO',detalles:JSON.stringify({ventaId:venta.id,sucursalId:input.sucursalId,aprobacionId:discountAuthorization.aprobacion.id,solicitante:access.userId,aprobador:discountAuthorization.aprobacion.aprobadoPorId,descuento:calculation.descuento})}});}
        await registerSaleCash(tx, access, venta, venta.corteCajaId ? { id: venta.corteCajaId } : null);
        await tx.notificacionLog.create({ data: { tenantId, tipo: 'VENTA_CONFIRMADA', canal: 'INTERNO', destinatario: 'Dueño', estado: 'REGISTRADO',
          mensaje: JSON.stringify({ ventaId: venta.id, folio, sucursalId: input.sucursalId, barbero: barber!.nombre, servicios: calculation.preparedItems.map(i => `${i.cantidad} × ${i.nombreItem}`), total: calculation.total, metodoPago: input.metodoPago, cobradoPor: collectorName }) } });
        await tx.comision.create({ data: { tenantId, ventaId: venta.id, barberoId: input.barberoId, monto: calculation.totalComision, porcentaje: servicePct } });
        if (input.citaId) await tx.cita.updateMany({ where: { id: input.citaId, tenantId }, data: { estado: 'COMPLETADA' } });
        if (input.citaId) await tx.filaPresencial.updateMany({where:{tenantId,citaId:input.citaId,estado:{not:'ATENDIDO'}},data:{estado:'ATENDIDO',version:{increment:1}}});
        if (input.clienteId) await tx.clienteFinal.updateMany({ where: { id: input.clienteId, tenantId }, data: { gastoTotal: { increment: calculation.total }, ...(appointment?.estado === 'COMPLETADA' ? {} : { totalVisitas: { increment: 1 } }), fechaUltimaVisita: new Date() } });
        for (const alert of lowStockAlerts) await tx.notificacionLog.create({ data: { tenantId, tipo: 'STOCK_MINIMO', canal: 'INTERNO', destinatario: 'Dueño', mensaje: `${alert.nombre}: ${alert.stockNuevo} unidades. Venta ${folio}.`, estado: 'REGISTRADO' } });
        const response = { comisionGenerada: calculation.totalComision, lowStockAlerts };
        await tx.pOSOperacion.update({ where: { id: operation.id }, data: { ventaId: venta.id, respuesta: JSON.stringify(response) } });
        return { success: true, venta, ...response, replayed: false, idempotencyKey: key };
      }, { maxWait: 15_000, timeout: 20_000 });
    } catch (error: any) {
      if (error.code === 'P2002') { const existing = await replay(); if (existing) return existing; }
      const retryable = error.code === 'P2034' || error.code === 'P2002' || (['P2028', 'P1008'].includes(error.code) && /locked|write conflict|timed out|expired/i.test(error.message));
      if (retryable && attempt < 4) { await new Promise(resolve => setTimeout(resolve, 60 * 2 ** attempt + Math.random() * 40)); continue; }
      if (retryable) fail(503, 'SALE_RETRY_REQUIRED', 'No se confirmó el resultado. Reintenta la misma intención de cobro.');
      throw error;
    }
  }
  return fail(503, 'SALE_RETRY_REQUIRED', 'Reintenta la misma intención de cobro.');
}

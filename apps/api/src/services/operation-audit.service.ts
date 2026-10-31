import { prisma } from '@systech/database';
import { bookingDateBounds, civilParts } from './booking-time.service';

export const operationAuditActions: Record<string, string> = {
  ALTA_PRODUCTO: 'Artículo registrado', MOVIMIENTO_INVENTARIO: 'Existencias modificadas',
  CONTEO_INVENTARIO_CONFIRMADO: 'Conteo conciliado', RECETA_PUBLICADA: 'Receta de servicio publicada',
  CORRECCION_CONSUMO: 'Consumo corregido', DEVOLUCION_VENTA: 'Devolución registrada',
  TARIFA_PROFESIONAL_GUARDADA: 'Tarifa profesional publicada', POLITICA_DESCUENTO_GUARDADA: 'Política de descuentos guardada',
  DESCUENTO_SOLICITADO: 'Autorización de descuento solicitada', DESCUENTO_RECHAZADO: 'Descuento rechazado',
  DESCUENTO_APROBADO: 'Descuento autorizado', DESCUENTO_APLICADO: 'Descuento aplicado en una venta',
  AUSENCIA_GUARDADA: 'Ausencia registrada', HORARIO_ESPECIAL_GUARDADO: 'Turno especial registrado',
  FILA_LLEGADA: 'Llegada registrada', FILA_ASIGNAR: 'Llegada asignada', FILA_REASIGNAR: 'Llegada reasignada',
  FILA_ATENDER: 'Atención iniciada', FILA_RETIRAR: 'Llegada retirada', CORTE_CAJA: 'Caja cerrada',
  MOVIMIENTO_CAJA_ENTRADA: 'Entrada de efectivo', MOVIMIENTO_CAJA_SALIDA: 'Salida de efectivo',
  GASTO_REGISTRADO: 'Gasto registrado', GASTO_CORREGIDO: 'Gasto corregido',
  CITA_CONFIRMADA: 'Cita confirmada', CITA_EN_CURSO: 'Atención iniciada', CITA_COMPLETADA: 'Atención terminada',
  CITA_CANCELADA: 'Cita cancelada', CITA_CANCELAR: 'Cita cancelada por cliente', CITA_NO_SHOW: 'Ausencia registrada en cita',
  CITA_REPROGRAMAR: 'Cita reprogramada', DATOS_IMPORTADOS: 'Datos importados', COMISIONES_LIQUIDADAS: 'Comisiones liquidadas',
};
const labels: Record<string, string> = {
  stockInicial: 'Existencia inicial', stockAnterior: 'Existencia anterior', stockNuevo: 'Existencia resultante',
  version: 'Versión', precio: 'Precio', importe: 'Importe', monto: 'Importe', descuento: 'Descuento',
  articulosContados: 'Artículos contados', ajustes: 'Artículos ajustados', insumos: 'Insumos de la receta',
  fechaInicio: 'Inicio', fechaFin: 'Fin', fecha: 'Día', horarioInicio: 'Entrada', horarioFin: 'Salida',
  vigenteDesde: 'Vigente desde', vigenteHasta: 'Vigente hasta', estado: 'Estado',
  categoria: 'Categoría', metodoPago: 'Método de pago', concepto: 'Concepto',
  solicitante: 'Solicitante', aprobador: 'Aprobador', filas: 'Filas importadas', neto: 'Importe neto',
};
const references = ['ventaId', 'devolucionId', 'productoId', 'kardexId', 'conteoId', 'servicioId', 'tarifaId', 'aprobacionId', 'corteId', 'filaId', 'citaId', 'registroId', 'gastoId', 'consumoId', 'recibo'];
const auditDetails = (row: any) => { try { const value = JSON.parse(row.detalles || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; } };
const auditValue = (value: unknown): value is string | number => typeof value === 'number' && Number.isFinite(value) || typeof value === 'string' && value.length <= 160;
export function projectOperationAudit(row: any) {
  const details = auditDetails(row);
  const change = details.cambio && typeof details.cambio === 'object' && !Array.isArray(details.cambio) ? details.cambio : {};
  const values = { ...change, ...details };
  const fields = Object.entries(labels).flatMap(([key, label]) => {
    const value = values[key];
    return auditValue(value) ? [{ label, value }] : [];
  });
  if (row.accion === 'GASTO_CORREGIDO') for (const [side, suffix] of [['anterior', 'anterior'], ['actual', 'actual']]) {
    const snapshot = details[side];
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) continue;
    for (const key of ['concepto', 'categoria', 'fecha', 'importe', 'metodoPago']) if (auditValue(snapshot[key])) fields.push({ label: `${labels[key]} ${suffix}`, value: snapshot[key] });
  }
  const appointment = row.accion.startsWith('CITA_');
  if (appointment) {
    if (auditValue(details.anterior)) fields.push({ label: row.accion === 'CITA_REPROGRAMAR' || row.accion === 'CITA_CANCELAR' ? 'Horario anterior' : 'Estado anterior', value: details.anterior });
    if (auditValue(details.nueva)) fields.push({ label: 'Horario nuevo', value: details.nueva });
    if (['CITA_CONFIRMADA', 'CITA_EN_CURSO', 'CITA_COMPLETADA', 'CITA_CANCELADA', 'CITA_CANCELAR', 'CITA_NO_SHOW'].includes(row.accion)) fields.push({ label: 'Estado nuevo', value: row.accion === 'CITA_CANCELAR' ? 'CANCELADA' : row.accion.slice(5) });
  }
  if (row.accion === 'COMISIONES_LIQUIDADAS' && Array.isArray(details.ids)) fields.push({ label: 'Comisiones liquidadas', value: details.ids.length });
  if (row.accion === 'CORTE_CAJA') {
    const cashLabels: Record<string, string> = { fondoInicial: 'Fondo inicial', totalVentas: 'Ventas del turno', totalEfectivo: 'Ventas en efectivo', totalTarjeta: 'Ventas con tarjeta', totalTransferencia: 'Ventas por transferencia', totalPropinas: 'Propinas del turno', totalIngresos: 'Ingresos de caja', totalEntregas: 'Entregas recibidas', efectivoCobradoEnCaja: 'Efectivo cobrado en caja', totalRetiros: 'Retiros de caja', totalGastosMenores: 'Gastos de caja', efectivoEsperado: 'Efectivo esperado', conteoReal: 'Efectivo contado', descuadre: 'Diferencia de caja' };
    for (const [key, label] of Object.entries(cashLabels)) if (typeof details[key] === 'number' && Number.isFinite(details[key])) fields.push({ label, value: details[key] });
  }
  const reference = references.find(key => typeof details[key] === 'string' && details[key].length <= 100);
  const appointmentId = appointment && typeof details.id === 'string' && details.id.length <= 100 ? details.id : null;
  const branchId = typeof values.sucursalId === 'string' ? values.sucursalId : row.resolvedBranchId || null;
  return { id: row.id, at: row.fecha, actor: row.usuarioEmail, action: row.accion,
    title: operationAuditActions[row.accion], branchId,
    reference: reference ? details[reference] : appointmentId,
    reason: typeof values.motivo === 'string' ? values.motivo.slice(0, 500) : null,
    fields, affectedAppointments: Array.isArray(details.citasAfectadas) ? details.citasAfectadas.length : null,
    legacyDetails: !fields.length && !reference && !appointmentId && !branchId,
  };
}

export async function listOperationAudit(tenantId: string, query: Record<string, unknown>) {
  const action = typeof query.accion === 'string' ? query.accion : '';
  if (action && !Object.prototype.hasOwnProperty.call(operationAuditActions, action)) throw Object.assign(new Error('Elige una operación del filtro.'), { status: 400 });
  const branchId = typeof query.sucursalId === 'string' ? query.sucursalId : '';
  const branch = branchId ? await prisma.sucursal.findFirst({ where: { id: branchId, tenantId, eliminadoEn: null }, select: { id: true, zonaHoraria: true } }) : null;
  if (branchId && !branch) throw Object.assign(new Error('Sucursal no disponible.'), { status: 404 });
  const timeZone = branch?.zonaHoraria || (typeof query.zonaHoraria === 'string' ? query.zonaHoraria : 'America/Mexico_City');
  civilParts(new Date(), timeZone);
  const end = query.hasta ? bookingDateBounds(String(query.hasta), timeZone).lt : new Date();
  const start = query.desde ? bookingDateBounds(String(query.desde), timeZone).gte : new Date(end.getTime() - 30 * 86400000);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end || end.getTime() - start.getTime() > 93 * 86400000)
    throw Object.assign(new Error('Indica un período válido de hasta 93 días.'), { status: 400 });
  const where = { tenantId, accion: action || { in: Object.keys(operationAuditActions) }, fecha: { gte: start, lt: end } };
  const cursor = typeof query.cursor === 'string' ? query.cursor : '';
  if (cursor && !await prisma.auditoriaLog.findFirst({ where: { ...where, id: cursor }, select: { id: true } }))
    throw Object.assign(new Error('La referencia de página ya no corresponde a estos filtros.'), { status: 400 });
  const rows = await prisma.auditoriaLog.findMany({ where, orderBy: [{ fecha: 'desc' }, { id: 'desc' }], take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, fecha: true, usuarioEmail: true, accion: true, detalles: true } });
  const scanned = rows.slice(0, 50);
  // Older appointment producers stored only the appointment ID; resolve its immutable branch within this tenant.
  const appointmentIds = scanned.filter(row => row.accion.startsWith('CITA_')).map(row => auditDetails(row).id).filter((id): id is string => typeof id === 'string');
  const appointments = appointmentIds.length ? await prisma.cita.findMany({ where: { tenantId, id: { in: appointmentIds } }, select: { id: true, sucursalId: true } }) : [];
  const appointmentBranches = new Map(appointments.map(row => [row.id, row.sucursalId]));
  const cutIds = scanned.filter(row => row.accion === 'CORTE_CAJA').map(row => auditDetails(row).corteId).filter((id): id is string => typeof id === 'string');
  const cuts = cutIds.length ? await prisma.corteCaja.findMany({ where: { tenantId, id: { in: cutIds } }, select: { id: true, sucursalId: true } }) : [];
  const cutBranches = new Map(cuts.map(row => [row.id, row.sucursalId]));
  const items = scanned.map(row => projectOperationAudit({ ...row, resolvedBranchId: row.accion.startsWith('CITA_') ? appointmentBranches.get(auditDetails(row).id) : row.accion === 'CORTE_CAJA' ? cutBranches.get(auditDetails(row).corteId) : undefined })).filter(row => !branchId || row.branchId === branchId);
  return { items, nextCursor: rows.length > 50 ? scanned[scanned.length - 1].id : null,
    from: start.toISOString(), to: end.toISOString(), timeZone, actions: operationAuditActions,
    scopeNote: branchId ? 'Eventos con sucursal registrada o identificada mediante una cita o corte de caja de este negocio. Los registros antiguos sin sucursal identificable solo aparecen en Todas las sucursales.' : 'Operaciones del negocio; los registros antiguos pueden no identificar una sucursal.',
  };
}

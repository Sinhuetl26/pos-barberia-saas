import { Prisma } from '@systech/database';

export interface ProductCatalogItem {
  id: string; nombre: string; tipo: string;
  precioVenta: number | string | { toNumber?: () => number };
  tasaImpuesto?: number | string | { toNumber?: () => number };
  stockActual?: number; stockMinimo?: number;
}
export interface ClientSaleItemInput { productoId: string; cantidad: number; precioUnitario?: number; }
export interface PreparedSaleItem {
  productoId: string; nombreItem: string; tipoItem: string; cantidad: number;
  precioUnitario: number; subtotal: number; descuento: number; impuesto: number;
  tasaImpuesto: number; comision: number;
}
export interface SaleCalculationResult {
  subtotal: number; descuento: number; propina: number; impuesto: number;
  total: number; totalComision: number; preparedItems: PreparedSaleItem[];
}
/** Server-held booking snapshots are authoritative, never cart-provided prices. */
export function appointmentCatalog(products: any[], items: ClientSaleItemInput[], appointment: any): any[] {
  let snapshots: any[];
  try {
    if(!appointment.serviciosJson&&(appointment.precioEstimado===null||appointment.precioEstimado===undefined))throw new Error('BOOKING_SNAPSHOT_INVALID');
    snapshots = appointment.serviciosJson ? JSON.parse(appointment.serviciosJson) : [{ id: appointment.servicioId, nombre: appointment.nombreServicio, precio: Number(appointment.precioEstimado), duracion: appointment.duracionMinutos }];
  } catch { throw new Error('BOOKING_SNAPSHOT_INVALID'); }
  if (!Array.isArray(snapshots) || !snapshots.length || snapshots.length > 10 || new Set(snapshots.map(s => s?.id)).size !== snapshots.length || snapshots.some(s => !s || typeof s.id !== 'string' || typeof s.nombre !== 'string' || !s.nombre.trim() || !['number','string'].includes(typeof s.precio) || typeof s.precio==='string'&&!s.precio.trim() || !Number.isFinite(Number(s.precio)) || Number(s.precio) < 0 || Math.abs(Number(s.precio) * 100 - Math.round(Number(s.precio) * 100)) > 0.00001 || s.duracion!==undefined&&(!Number.isInteger(s.duracion)||s.duracion<5||s.duracion>480) || s.tasaImpuesto !== undefined && (!Number.isFinite(Number(s.tasaImpuesto)) || Number(s.tasaImpuesto) < 0 || Number(s.tasaImpuesto) > 100))) throw new Error('BOOKING_SNAPSHOT_INVALID');
  const reserved = new Map(snapshots.map(s => [s.id, s]));
  const orderedServices = items.filter(i => products.find(p => p.id === i.productoId)?.tipo === 'SERVICIO');
  if (orderedServices.length !== snapshots.length || new Set(orderedServices.map(i => i.productoId)).size !== snapshots.length || orderedServices.some(i => !reserved.has(i.productoId) || i.cantidad !== 1)) throw new Error('BOOKING_SERVICES_MISMATCH');
  return products.map(product => {
    const snapshot = reserved.get(product.id);
    if (!snapshot) return product;
    // Legacy snapshots contain no VAT: current configured included-tax rate
    // is the compatibility fallback. New reservations freeze their rate.
    return { ...product, nombre: snapshot.nombre, precioVenta: Number(snapshot.precio), tasaImpuesto: snapshot.tasaImpuesto === undefined ? product.tasaImpuesto : Number(snapshot.tasaImpuesto),resolucionPrecio:snapshot.resolucionPrecio||{tarifaId:null,version:0,heredado:true,reservaHistorica:true} };
  });
}
const decimal = (value: any) => new Prisma.Decimal(value?.toString?.() ?? String(value));
export function moneyCents(value: any): number {
  const result = decimal(value).times(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
  if (!Number.isSafeInteger(result) || Math.abs(result) > 100_000_000_000) throw new Error('Importe fuera de rango');
  return result;
}

// Catalog prices are final prices. Configured tax is included, never added twice.
// Largest remainders allocate every discount cent deterministically across lines.
export function calculateSaleTotals(
  productMap: Map<string, ProductCatalogItem>, items: ClientSaleItemInput[],
  rawDiscount = 0, rawTip = 0, barberComisionServPct = 50, barberComisionProdPct = 10
): SaleCalculationResult {
  const lines = items.map(item => {
    const prod = productMap.get(item.productoId);
    if (!prod) throw new Error(`Producto o servicio no encontrado en su catálogo: ${item.productoId}`);
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > 99) throw new Error('Cantidad inválida');
    const unit = moneyCents(prod.precioVenta);
    if (unit < 0) throw new Error('Precio inválido');
    const rate = decimal(prod.tasaImpuesto ?? 0);
    if (!rate.isFinite() || rate.lessThan(0) || rate.greaterThan(100)) throw new Error('Tasa de impuesto inválida');
    return { prod, quantity: item.cantidad, unit, gross: unit * item.cantidad, rate };
  });
  const gross = lines.reduce((sum, line) => sum + line.gross, 0);
  if (!Number.isSafeInteger(gross) || gross > 100_000_000_000) throw new Error('Venta fuera de rango');
  const discount = Math.min(Math.max(moneyCents(rawDiscount), 0), gross);
  const allocations = lines.map((line, index) => {
    const share = gross ? new Prisma.Decimal(discount).times(line.gross).div(gross) : new Prisma.Decimal(0);
    const cents = share.floor().toNumber();
    return { index, cents, remainder: share.minus(cents) };
  });
  let left = discount - allocations.reduce((sum, item) => sum + item.cents, 0);
  for (const allocation of [...allocations].sort((a, b) => b.remainder.comparedTo(a.remainder) || a.index - b.index)) {
    if (left > 0) { allocation.cents++; left--; }
  }
  let tax = 0, commission = 0;
  const preparedItems = lines.map((line, index) => {
    const net = line.gross - allocations[index].cents;
    const taxCents = new Prisma.Decimal(net).times(line.rate).div(line.rate.plus(100)).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
    const pct = line.prod.tipo === 'SERVICIO' ? barberComisionServPct : barberComisionProdPct;
    const commissionCents = new Prisma.Decimal(net - taxCents).times(pct).div(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
    tax += taxCents; commission += commissionCents;
    return {
      productoId: line.prod.id, nombreItem: line.prod.nombre, tipoItem: line.prod.tipo, cantidad: line.quantity,
      precioUnitario: line.unit / 100, subtotal: line.gross / 100, descuento: allocations[index].cents / 100,
      impuesto: taxCents / 100, tasaImpuesto: line.rate.toNumber(), comision: commissionCents / 100
    };
  });
  const tip = Math.max(moneyCents(rawTip), 0);
  return { subtotal: gross / 100, descuento: discount / 100, propina: tip / 100, impuesto: tax / 100,
    total: (gross - discount + tip) / 100, totalComision: commission / 100, preparedItems };
}

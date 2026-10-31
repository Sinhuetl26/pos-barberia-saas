import { Prisma } from '@systech/database';
import { SaleError } from './financial-error';

export const STOCK_UNITS = ['PIEZA', 'ML', 'G'] as const;
export type StockUnit = typeof STOCK_UNITS[number];
const fail = (message: string): never => { throw new SaleError(400, 'INVALID_QUANTITY', message); };
/** Quantities are stored in base units with three decimals; pieces stay whole. */
export function stockQuantity(value: any, unit: string = 'PIEZA', zero = false): Prisma.Decimal {
  if (!STOCK_UNITS.includes(unit as StockUnit)) fail('Unidad física inválida.');
  if (!['number', 'string'].includes(typeof value) || typeof value === 'string' && !/^\d+(?:\.\d{1,3})?$/.test(value.trim())) fail('Cantidad física inválida.');
  let result: Prisma.Decimal;
  try { result = new Prisma.Decimal(typeof value === 'string' ? value.trim() : value); } catch { return fail('Cantidad física inválida.'); }
  if (!result.isFinite() || result.lessThan(zero ? 0 : 0.001) || result.greaterThan(1_000_000) || result.decimalPlaces() > 3 || unit === 'PIEZA' && !result.isInteger()) fail('La cantidad admite hasta tres decimales en ml/g y piezas enteras.');
  return result;
}
/** Price of one base unit; ml/g can have sub-cent costs without being free. */
export function inventoryUnitCost(value: any): Prisma.Decimal {
  if (!['number', 'string'].includes(typeof value) || typeof value === 'string' && !value.trim()) throw new SaleError(400, 'INVALID_COST', 'Costo por unidad base inválido.');
  let cost: Prisma.Decimal;
  try { cost = new Prisma.Decimal(value); } catch { throw new SaleError(400, 'INVALID_COST', 'Costo por unidad base inválido.'); }
  if (!cost.isFinite() || cost.lessThan(0) || cost.greaterThan(1_000_000_000) || cost.decimalPlaces() > 6) throw new SaleError(400, 'INVALID_COST', 'El costo por unidad base admite hasta seis decimales.');
  return cost;
}
export function presentationQuantity(count: any, basePerPresentation: any, unit: string): Prisma.Decimal {
  const containers = stockQuantity(count, 'ML');
  const size = stockQuantity(basePerPresentation, unit);
  const total = containers.times(size);
  // Never silently round a conversion that cannot fit the defined precision.
  if (total.decimalPlaces() > 3) fail('La conversión no cabe en la precisión de inventario. Usa cantidad en unidad base.');
  return stockQuantity(total.toFixed(), unit);
}
export function checkedStock(value: Prisma.Decimal): Prisma.Decimal {
  if (!value.isFinite() || value.lessThan(0) || value.greaterThan('2147483647') || value.decimalPlaces() > 3) throw new SaleError(400, 'INSUFFICIENT_STOCK', 'El saldo debe ser no negativo y respetar la precisión de inventario.');
  return value;
}

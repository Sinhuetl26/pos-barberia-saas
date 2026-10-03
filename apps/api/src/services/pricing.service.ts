// ==========================================
// SYSTECH STUDIO - PRICING & COMMISSIONS SERVICE
// Pure, deterministic financial calculations (Zero Floating-Point Drift)
// ==========================================

export interface ProductCatalogItem {
  id: string;
  nombre: string;
  tipo: string; // 'PRODUCTO' | 'SERVICIO'
  precioVenta: number | string | { toNumber?: () => number };
  stockActual?: number;
  stockMinimo?: number;
}

export interface ClientSaleItemInput {
  productoId: string;
  cantidad: number;
  precioUnitario?: number; // Ignored by server
}

export interface PreparedSaleItem {
  productoId: string;
  nombreItem: string;
  tipoItem: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  comision: number;
}

export interface SaleCalculationResult {
  subtotal: number;
  descuento: number;
  propina: number;
  total: number;
  totalComision: number;
  preparedItems: PreparedSaleItem[];
}

/**
 * Calculates sale lines, server-authoritative totals, bounded discounts, and commission splits.
 * Never trusts client-supplied prices.
 */
export function calculateSaleTotals(
  productMap: Map<string, ProductCatalogItem>,
  items: ClientSaleItemInput[],
  rawDiscount: number = 0,
  rawTip: number = 0,
  barberComisionServPct: number = 50,
  barberComisionProdPct: number = 10
): SaleCalculationResult {
  let subtotal = 0;
  let totalComision = 0;
  const preparedItems: PreparedSaleItem[] = [];

  for (const item of items) {
    const prod = productMap.get(item.productoId);
    if (!prod) {
      throw new Error(`Producto o servicio no encontrado en su catálogo: ${item.productoId}`);
    }

    const qty = Math.min(Math.max(Math.floor(Number(item.cantidad)) || 1, 1), 99);
    
    // Convert Decimal or number to standard float rounded to 2 decimals
    const priceRaw = typeof prod.precioVenta === 'object' && prod.precioVenta !== null && 'toNumber' in prod.precioVenta
      ? (prod.precioVenta as any).toNumber()
      : Number(prod.precioVenta);
    
    const price = Math.round(priceRaw * 100) / 100;
    const lineTotal = Math.round(price * qty * 100) / 100;
    subtotal = Math.round((subtotal + lineTotal) * 100) / 100;

    // Calculate line commission
    const pct = prod.tipo === 'SERVICIO' ? barberComisionServPct : barberComisionProdPct;
    const itemComision = Math.round(lineTotal * (pct / 100) * 100) / 100;
    totalComision = Math.round((totalComision + itemComision) * 100) / 100;

    preparedItems.push({
      productoId: prod.id,
      nombreItem: prod.nombre,
      tipoItem: prod.tipo,
      cantidad: qty,
      precioUnitario: price,
      subtotal: lineTotal,
      comision: itemComision
    });
  }

  // Bounded discount: cannot be negative, cannot exceed subtotal
  const cleanDiscount = Math.min(Math.max(Number(rawDiscount) || 0, 0), subtotal);
  const roundedDiscount = Math.round(cleanDiscount * 100) / 100;

  // Tip: cannot be negative
  const cleanTip = Math.max(Number(rawTip) || 0, 0);
  const roundedTip = Math.round(cleanTip * 100) / 100;

  // Final Total
  const total = Math.round((subtotal - roundedDiscount + roundedTip) * 100) / 100;

  return {
    subtotal,
    descuento: roundedDiscount,
    propina: roundedTip,
    total,
    totalComision,
    preparedItems
  };
}

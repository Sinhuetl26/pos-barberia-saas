// ==========================================
// SYSTECH STUDIO - CASH REGISTER (ARQUEO DE CAJA) SERVICE
// Blind cash drawer closing and difference reconciliation
// ==========================================

export interface SaleRecord {
  id: string;
  total: number | string | { toNumber?: () => number };
  propina?: number | string | { toNumber?: () => number };
  metodoPago: string; // 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MIXTO'
  detallesPago?: string | null;
}

export interface CashShiftSummary {
  fondoInicial: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalPropinas: number;
  totalVentas: number;
  efectivoEsperado: number;
  conteoReal: number;
  descuadre: number;
  descuadrado: boolean;
}

function parseAmount(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'object' && 'toNumber' in val) return (val as any).toNumber();
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Summarizes sales into payment breakdown and calculates cash drawer difference.
 */
export function calculateCashShiftSummary(
  fondoInicial: number,
  ventas: SaleRecord[],
  conteoReal: number
): CashShiftSummary {
  let totalEfectivo = 0;
  let totalTarjeta = 0;
  let totalTransferencia = 0;
  let totalPropinas = 0;
  let totalVentas = 0;

  for (const v of ventas) {
    // A5 FIX: Filter out cancelled sales
    if ((v as any).estado === 'CANCELADA') continue;

    const saleTotal = parseAmount(v.total);
    const tip = parseAmount(v.propina);
    totalVentas += saleTotal;
    totalPropinas += tip;

    if (v.metodoPago === 'EFECTIVO') {
      totalEfectivo += saleTotal;
    } else if (v.metodoPago === 'TARJETA') {
      totalTarjeta += saleTotal;
    } else if (v.metodoPago === 'TRANSFERENCIA') {
      totalTransferencia += saleTotal;
    } else if (v.metodoPago === 'MIXTO' && v.detallesPago) {
      try {
        const split = typeof v.detallesPago === 'string' ? JSON.parse(v.detallesPago) : v.detallesPago;
        if (Array.isArray(split)) {
          for (const s of split) {
            const splitAmount = parseAmount(s.monto);
            if (s.metodo === 'EFECTIVO') totalEfectivo += splitAmount;
            if (s.metodo === 'TARJETA') totalTarjeta += splitAmount;
            if (s.metodo === 'TRANSFERENCIA') totalTransferencia += splitAmount;
          }
        }
      } catch (e) {
        // Fallback: if json parsing fails on split, treat as efectivo
        totalEfectivo += saleTotal;
      }
    }
  }

  const initialFund = Math.round(Number(fondoInicial) * 100) / 100;
  const roundEfectivo = Math.round(totalEfectivo * 100) / 100;
  const roundTarjeta = Math.round(totalTarjeta * 100) / 100;
  const roundTransferencia = Math.round(totalTransferencia * 100) / 100;
  const roundPropinas = Math.round(totalPropinas * 100) / 100;
  const roundVentas = Math.round(totalVentas * 100) / 100;

  const efectivoEsperado = Math.round((initialFund + roundEfectivo) * 100) / 100;
  const realCount = Math.round(Number(conteoReal) * 100) / 100;
  const descuadre = Math.round((realCount - efectivoEsperado) * 100) / 100;

  return {
    fondoInicial: initialFund,
    totalEfectivo: roundEfectivo,
    totalTarjeta: roundTarjeta,
    totalTransferencia: roundTransferencia,
    totalPropinas: roundPropinas,
    totalVentas: roundVentas,
    efectivoEsperado,
    conteoReal: realCount,
    descuadre,
    descuadrado: Math.abs(descuadre) > 0.01
  };
}

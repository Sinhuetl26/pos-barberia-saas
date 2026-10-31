import React from 'react';
import { CheckCircle } from 'lucide-react';

export function receiptCashBreakdown(details: unknown): { received?: number; change?: number } {
  try {
    const payment = typeof details === 'string' ? JSON.parse(details) : details;
    const amount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
    return { received: amount(payment?.efectivoRecibido), change: amount(payment?.cambio) };
  } catch { return {}; }
}

interface SaleConfirmationProps {
  sale: { total: number | string; folio: string; metodoPago: string; detallesPago?: unknown };
  busy: boolean;
  error: string;
  receipt: React.ReactNode;
  onNewSale: () => void;
  onRebook?: () => void;
}

export function SaleConfirmation({ sale, busy, error, receipt, onNewSale, onRebook }: SaleConfirmationProps) {
  const payment = sale.metodoPago === 'EFECTIVO' || sale.metodoPago === 'MIXTO' ? receiptCashBreakdown(sale.detallesPago) : {};
  const method = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', MIXTO: 'Dividido' }[sale.metodoPago] || sale.metodoPago;
  return <section className="carbon-sale-confirmation">
    <CheckCircle className="carbon-success-icon" aria-hidden="true" />
    <h2 id="sale-receipt-title" tabIndex={-1}>Cobro registrado</h2>
    <p className="carbon-success-total">${Number(sale.total).toFixed(2)} <span>MXN</span></p>
    <dl className="carbon-success-facts">
      <div><dt>Folio</dt><dd>{sale.folio}</dd></div>
      <div><dt>Método</dt><dd>{method}</dd></div>
      {payment.received !== undefined && <div><dt>Recibido</dt><dd>${payment.received.toFixed(2)}</dd></div>}
      {payment.change !== undefined && <div><dt>Cambio</dt><dd>${payment.change.toFixed(2)}</dd></div>}
    </dl>
    {error && <p role="alert" className="carbon-print-error">{error} La venta sigue registrada.</p>}
    <button type="button" disabled={busy} onClick={onNewSale} className="carbon-new-sale">Nueva venta</button>
    <details className="carbon-receipt-detail"><summary>Ver ticket</summary>{receipt}</details>
    {onRebook && <button type="button" disabled={busy} onClick={onRebook} className="carbon-rebook">Agendar próxima visita</button>}
  </section>;
}

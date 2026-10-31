import { Receipt } from 'lucide-react';

interface SaleRecoveryProps {
  total: number;
  quantity: number;
  method: string;
  busy: boolean;
  error: string;
  onRecover: () => void;
}

export function SaleRecovery({ total, quantity, method, busy, error, onRecover }: SaleRecoveryProps) {
  const label = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', MIXTO: 'Dividido' }[method] || method;
  return <section className="carbon-recovery" aria-labelledby="sale-recovery-title" aria-busy={busy}>
    <Receipt size={30} aria-hidden="true" />
    <h1 id="sale-recovery-title">{busy ? 'Comprobando cobro…' : 'Comprobar cobro'}</h1>
    <p>Confirma el resultado antes de recibir otro pago del cliente.</p>
    <dl><div><dt>Total</dt><dd>${total.toFixed(2)} MXN</dd></div><div><dt>Método</dt><dd>{label}</dd></div><div><dt>Artículos</dt><dd>{quantity}</dd></div></dl>
    {error && <p role="alert" className="carbon-recovery-error">{error}</p>}
    <button type="button" disabled={busy} onClick={onRecover}>{busy ? 'Consultando…' : 'Consultar resultado'}</button>
    <p className="carbon-recovery-note">Tu referencia se conserva al recargar.</p>
  </section>;
}

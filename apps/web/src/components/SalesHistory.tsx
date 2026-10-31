import { OperationState } from './OperationState';
import '../styles/sales-history.css';

interface SalesHistoryProps {
  sales: any[];
  loading: boolean;
  error: string;
  printError: string;
  printing: boolean;
  canRefund: boolean;
  branchName: string;
  zone: string;
  onClose: () => void;
  onRetry: () => void;
  onPrint: (id: string, width: string) => void;
  onRefund: (sale: any) => void;
  targetSaleId?: string;
}

export function SalesHistory({ sales, loading, error, printError, printing, canRefund, branchName, zone, onClose, onRetry, onPrint, onRefund, targetSaleId }: SalesHistoryProps) {
  const orderedSales = targetSaleId ? [...sales].sort((a, b) => Number(b.id === targetSaleId) - Number(a.id === targetSaleId)) : sales;
  return <section className="sales-history">
    <header className="sales-history-heading">
      <div><h3 id="sales-history-title" tabIndex={-1}>Historial de ventas</h3><p>{branchName}</p></div>
      <button type="button" disabled={printing} onClick={onClose}>Cerrar</button>
    </header>
    <div className="sales-history-content">
      {printError && <p role="alert" className="sales-history-error">{printError}</p>}
      {loading ? <OperationState busy title="Consultando ventas">Un momento…</OperationState>
        : error ? <div role="alert"><OperationState title="No pudimos cargar las ventas" action={<button type="button" onClick={onRetry}>Reintentar</button>}>{error}</OperationState></div>
        : sales.length === 0 ? <OperationState title="Sin ventas disponibles">Las ventas disponibles para tu cuenta aparecerán aquí.</OperationState>
        : <div className="sales-history-list">{orderedSales.map(sale => <article key={sale.id} aria-label={`Venta ${sale.folio}`} className={`sales-history-sale${sale.id === targetSaleId ? ' is-target' : ''}`}>
          <div className="sales-history-reference"><h4>{sale.folio}</h4><time dateTime={sale.fecha}>{new Date(sale.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: zone })}</time></div>
          <div className="sales-history-client"><strong>{sale.clienteNombre || sale.cliente?.nombre || 'Público General'}</strong><span>{sale.barbero?.nombre || 'General'}</span></div>
          <div className="sales-history-amount"><strong aria-label={`Total original $${Number(sale.total).toFixed(2)} MXN`}>${Number(sale.total).toFixed(2)}</strong>{Number(sale.totalDevuelto) > 0 && <span>Devuelto ${Number(sale.totalDevuelto).toFixed(2)}</span>}</div>
          <span className="sales-history-status" data-state={sale.estado}>{sale.estado === 'PARCIAL_DEVUELTA' ? 'Devolución parcial' : sale.estado === 'CANCELADA' ? 'Devuelta' : sale.estado === 'COMPLETADA' || !sale.estado ? 'Completada' : sale.estado}</span>
          <details className="sales-history-actions"><summary aria-label={`Opciones de ${sale.folio}`}>Ver opciones</summary><div className="sales-history-action-list">
            {['58mm', '80mm'].map(width => <button key={width} type="button" disabled={printing} onClick={() => onPrint(sale.id, width)} aria-label={`Ticket ${width} de ${sale.folio}`}>Ticket {width}</button>)}
            {sale.estado !== 'CANCELADA' && canRefund && <button type="button" disabled={printing} className="sales-history-refund" onClick={() => onRefund(sale)} aria-label={`Devolver unidades de ${sale.folio}`}>Devolver unidades</button>}
          </div></details>
        </article>)}</div>}
    </div>
  </section>;
}

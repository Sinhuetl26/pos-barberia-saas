export function refundPreview(sale: any, quantities: Record<string, number>, tip: number) {
  if (!Number.isFinite(tip) || tip < 0) return null;
  const returned: Record<string, number> = {};
  for (const refund of sale.devoluciones || []) for (const line of JSON.parse(refund.itemsJson)) returned[line.itemId] = (returned[line.itemId] || 0) + line.cantidad;
  const portion = (amount: number, qty: number, total: number) => Number((BigInt(amount) * BigInt(qty) * 2n + BigInt(total)) / (BigInt(total) * 2n));
  let total = Math.round(tip * 100);
  for (const item of sale.items || []) {
    const qty = quantities[item.id] || 0, before = returned[item.id] || 0;
    if (!Number.isInteger(qty) || qty < 0 || qty + before > item.cantidad) return null;
    const amount = Math.round(Number(item.subtotal) * 100) - Math.round(Number(item.descuento || 0) * 100);
    total += portion(amount, qty + before, item.cantidad) - portion(amount, before, item.cantidad);
  }
  return total / 100;
}

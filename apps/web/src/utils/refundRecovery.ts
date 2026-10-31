export function refundRecoveryState(pending: { path: string } | null, saleId: string) {
  if (!pending) return 'ready';
  return pending.path === `/ventas/${encodeURIComponent(saleId)}/devolver` ? 'recover' : 'blocked';
}

export function refundFailure(error: { status?: number; name?: string; message?: string }) {
  return error.status === 0 || error.name === 'TypeError' || error.name === 'AbortError' || error.message === 'Failed to fetch'
    ? 'No recibimos la confirmación. Comprueba esta devolución antes de volver a registrarla.'
    : error.message || 'No pudimos confirmar la devolución. Consulta su resultado.';
}

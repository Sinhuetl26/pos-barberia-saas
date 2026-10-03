// ==========================================
// SYSTECH STUDIO - CENTRALIZED FORMATTERS (es-MX)
// ==========================================

/**
 * Formats a numeric amount into Mexican Pesos (MXN) currency string.
 * Example: 350 -> "$350.00 MXN"
 */
export function formatCurrency(amount: number | string | null | undefined, includeCurrencyCode: boolean = false): string {
  const num = Number(amount || 0);
  const formatted = num.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return includeCurrencyCode ? `${formatted} MXN` : formatted;
}

/**
 * Formats an ISO date string into a friendly localized Mexican date string.
 * Example: "2026-10-03T17:00:00.000Z" -> "3 de octubre de 2026"
 */
export function formatDate(dateStr: string | Date | null | undefined, style: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('es-MX', {
    dateStyle: style
  });
}

/**
 * Formats a date string into 12-hour or 24-hour time.
 * Example: "17:00" or "5:00 PM"
 */
export function formatTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formats date and time together.
 * Example: "03/10/2026, 17:00"
 */
export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

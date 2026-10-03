// ======================================================================
// SYSTECH STUDIO - SECURITY UTILITIES
// HTML Escaping (XSS Prevention), CSV Formula Sanitization & Scoped Print Tokens
// Resolves Auditoria P1.5, P2.2, P2.4
// ======================================================================

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';

/**
 * Escapes characters with special meaning in HTML to prevent XSS (P1.5)
 */
export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#96;');
}

/**
 * Sanitizes a cell for CSV export to prevent Formula Injection (P2.4)
 * RFC 4180 compliant with formula neutralization for Excel / LibreOffice
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // If text starts with formula triggers (=, +, -, @, \t, \r), prepend a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes by doubling them: " -> ""
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates a short-lived (120s), single-purpose print token (P2.2)
 * Eliminates the risk of exposing bearer user credentials in query strings
 */
export function generatePrintToken(resourceType: 'CORTE' | 'VENTA' | 'CITA', resourceId: string, tenantId: string): string {
  return jwt.sign(
    {
      scope: 'ephemeral_print',
      type: resourceType,
      rid: resourceId,
      tid: tenantId
    },
    JWT_SECRET,
    { expiresIn: '120s' }
  );
}

/**
 * Validates an ephemeral print token
 */
export function verifyPrintToken(
  token: string,
  expectedType: 'CORTE' | 'VENTA' | 'CITA',
  expectedResourceId: string,
  expectedTenantId?: string
): { valid: boolean; tenantId?: string; error?: string } {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.scope !== 'ephemeral_print') {
      return { valid: false, error: 'Token no es de tipo impresión' };
    }
    if (payload.type !== expectedType || payload.rid !== expectedResourceId) {
      return { valid: false, error: 'Token no corresponde a este recurso' };
    }
    if (expectedTenantId && payload.tid !== expectedTenantId) {
      return { valid: false, error: 'Tenant inválido' };
    }
    return { valid: true, tenantId: payload.tid };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Token expirado o inválido' };
  }
}

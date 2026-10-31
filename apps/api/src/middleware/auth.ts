// ==========================================
// SYSTECH STUDIO - AUTHENTICATION & RBAC MIDDLEWARE
// Strict JWT verification and role authorization
// ==========================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@systech/database';
import { resolveScope } from '../services/authorization.service';
import { authorizeRequest, canonicalPath } from './authorization';

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret || rawSecret.length < 32 || /change|example|systech-super|systech-secure/i.test(rawSecret)) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET inválido, inseguro o ausente en entorno de producción. Mínimo 32 caracteres y no usar valores por defecto.');
  }
}
export const JWT_SECRET = rawSecret || 'systech-development-fallback-key-do-not-use-in-production-min32chars';

export interface AuthContext {
  userId: string;
  tenantId: string;
  rol: string;
  email: string;
  sessionVersion: number;
  tenant: any;
  barberoId: string | null;
  branchIds: string[] | null;
}

export interface AuthenticatedRequest extends Request {
  ctx?: AuthContext;
  tenant?: any;
  tenantId?: string;
  userRole?: string;
  userId?: string;
}

/**
 * Resolves user identity, tenantId, and role strictly from verified Bearer JWT.
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // P2.2 FIX: Enforce Referrer-Policy to prevent leaking URLs
  res.setHeader('Referrer-Policy', 'no-referrer');

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'NO_AUTH', error: 'Se requiere token de autenticación Bearer' });
  }

  const token = authHeader.substring(7).trim();
  let payload: { sub: string; tid: string; rol: string; email?: string; sv?: number };
  try {
    const verified = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof verified === 'string' || !verified || typeof verified.sub !== 'string' || typeof verified.tid !== 'string' || typeof verified.rol !== 'string' || (verified.sv !== undefined && (!Number.isSafeInteger(verified.sv) || verified.sv < 0))) throw new Error();
    payload = verified as typeof payload;
  } catch {
    return res.status(401).json({ code: 'TOKEN_INVALIDO', error: 'Token inválido o expirado' });
  }
  try {
    // Check user active status and live role/tenant in database (A14 & P3.3 FIX)
    const dbUser = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, sessionVersion: true, emailVerifiedAt: true, verificationRequired: true, invitationPending: true, activo: true, rol: true, email: true, eliminadoEn: true, tenantId: true, sucursalId: true, sucursalesAsignadasJson: true, barberoId: true }
    });
    if (!dbUser || !dbUser.activo || dbUser.eliminadoEn || dbUser.invitationPending) {
      return res.status(401).json({ code: 'USUARIO_INACTIVO', error: 'Cuenta de usuario inactiva o deshabilitada' });
    }

    // P3.3 FIX: Verify token claims match live database identity
    if (dbUser.rol !== payload.rol) {
      return res.status(401).json({ code: 'TOKEN_ROLE_MISMATCH', error: 'El rol de usuario ha cambiado. Inicie sesión nuevamente.' });
    }
    if (payload.tid !== dbUser.tenantId) {
      return res.status(401).json({ code: 'TOKEN_TENANT_MISMATCH', error: 'La asociación de barbería ha cambiado. Inicie sesión nuevamente.' });
    }

    if ((payload.sv ?? 0) !== dbUser.sessionVersion) return res.status(401).json({ code: 'SESION_REVOCADA', error: 'La sesión terminó. Inicia sesión nuevamente.' });
    const accountPath = /^\/(auth|tenant|onboarding)\/(me|security(?:\/.*)?)$/.test(canonicalPath(req));
    if ((dbUser.verificationRequired || process.env.NODE_ENV === 'production') && !dbUser.emailVerifiedAt && !accountPath) return res.status(403).json({ code: 'EMAIL_NO_VERIFICADO', error: 'Verifica tu correo para continuar.' });
    const tenantId = dbUser.tenantId;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { suscripcion: true } });

    if (!tenant) {
      return res.status(401).json({ code: 'TENANT_NOT_FOUND', error: 'El tenant especificado no existe o fue eliminado' });
    }

    // Check if subscription is suspended (C6 FIX: use exact baseUrl/path prefix instead of originalUrl.includes)
    const pathToCheck = (req.baseUrl || req.path || '').toLowerCase();
    const ALLOWED_SUSPENDED_PREFIXES = ['/api/suscripcion', '/api/admin', '/api/auth'];
    const isBillingOrAdmin = ALLOWED_SUSPENDED_PREFIXES.some(prefix => pathToCheck === prefix || pathToCheck.startsWith(prefix + '/')) || payload.rol === 'SUPER_ADMIN';

    if (['SUSPENDIDO', 'CANCELADO'].includes(tenant.estado) && !isBillingOrAdmin) {
      return res.status(403).json({
        code: 'SUSCRIPCION_SUSPENDIDA',
        error: 'Suscripción suspendida por falta de pago.',
        subscriptionSuspended: true,
        tenantId: tenant.id
      });
    }

    const access = await resolveScope(dbUser, canonicalPath(req));
    req.ctx = {
      userId: payload.sub,
      tenantId: tenant.id,
      rol: payload.rol,
      email: dbUser.email,
      sessionVersion: dbUser.sessionVersion,
      barberoId: access.barberoId,
      branchIds: access.branchIds,
      tenant
    };

    // Internal backwards compatibility
    req.tenant = tenant;
    req.tenantId = tenant.id;
    req.userRole = payload.rol;
    req.userId = payload.sub;

    return await authorizeRequest(req, res, next, access);
  } catch (error: any) {
    // A database outage does not invalidate a signed session. Fail closed and
    // allow a retry without sending the user through login or clearing a sale.
    if (typeof error?.code === 'string' && /^P\d{4}$/.test(error.code)) {
      res.setHeader('Retry-After', '5');
      return res.status(503).json({ code: 'ACCESS_CHECK_UNAVAILABLE', error: 'No pudimos comprobar el acceso. Espera unos segundos y vuelve a intentar.' });
    }
    return next(error);
  }
};

/**
 * Ensures user possesses one of the allowed roles.
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.ctx?.rol || req.userRole;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        code: 'SIN_PERMISO',
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
};

// ==========================================
// SYSTECH STUDIO - AUTHENTICATION & RBAC MIDDLEWARE
// Strict JWT verification and role authorization
// ==========================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@systech/database';

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
  tenant: any;
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
  let token: string | undefined;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) {
    return res.status(401).json({ code: 'NO_AUTH', error: 'Se requiere token de autenticación Bearer' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; tid: string; rol: string; email: string };

    // Check user active status in database (A14)
    const dbUser = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, activo: true, rol: true, eliminadoEn: true }
    });
    if (!dbUser || !dbUser.activo || dbUser.eliminadoEn) {
      return res.status(401).json({ code: 'USUARIO_INACTIVO', error: 'Cuenta de usuario inactiva o deshabilitada' });
    }

    let tenantId = payload.tid;
    let tenant = null;

    if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { suscripcion: true }
      });
    } else if (payload.rol === 'SUPER_ADMIN') {
      tenant = await prisma.tenant.findFirst({ where: { slug: 'systech-global' } }) || await prisma.tenant.findFirst();
      if (tenant) tenantId = tenant.id;
    }

    if (!tenant) {
      return res.status(401).json({ code: 'TENANT_NOT_FOUND', error: 'El tenant especificado no existe o fue eliminado' });
    }

    // Check if subscription is suspended (C6 FIX: use exact baseUrl/path prefix instead of originalUrl.includes)
    const pathToCheck = (req.baseUrl || req.path || '').toLowerCase();
    const ALLOWED_SUSPENDED_PREFIXES = ['/api/suscripcion', '/api/admin', '/api/auth'];
    const isBillingOrAdmin = ALLOWED_SUSPENDED_PREFIXES.some(prefix => pathToCheck === prefix || pathToCheck.startsWith(prefix + '/')) || payload.rol === 'SUPER_ADMIN';

    if (tenant.estado === 'SUSPENDIDO' && !isBillingOrAdmin) {
      return res.status(403).json({
        code: 'SUSCRIPCION_SUSPENDIDA',
        error: 'Suscripción suspendida por falta de pago.',
        subscriptionSuspended: true,
        tenantId: tenant.id
      });
    }

    req.ctx = {
      userId: payload.sub,
      tenantId: tenant.id,
      rol: payload.rol,
      email: payload.email,
      tenant
    };

    // Internal backwards compatibility
    req.tenant = tenant;
    req.tenantId = tenant.id;
    req.userRole = payload.rol;
    req.userId = payload.sub;

    next();
  } catch (error) {
    return res.status(401).json({ code: 'TOKEN_INVALIDO', error: 'Token inválido o expirado' });
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

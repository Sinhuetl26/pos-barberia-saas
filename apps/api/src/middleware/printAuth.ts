import { Response, NextFunction } from 'express';
import { prisma } from '@systech/database';
import { AuthenticatedRequest, requireAuth } from './auth';
import { verifyPrintToken } from '../utils/security';
import { resolveScope } from '../services/authorization.service';
import { authorizeRequest, canonicalPath } from './authorization';

export const requirePrintAuth = (type: 'CORTE' | 'VENTA') => async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.headers.authorization) return requireAuth(req, res, next);
  const token = typeof req.query.printToken === 'string' ? req.query.printToken : '';
  // Router-level middleware runs before Express populates :id parameters.
  const resourceId = req.params.id || decodeURIComponent(canonicalPath(req).split('/')[2] || '');
  const verified = verifyPrintToken(token, type, resourceId);
  if (!verified.valid || !verified.userId) return res.status(401).json({ code: 'PRINT_TOKEN_INVALIDO', error: 'Se requiere una sesión o un permiso de impresión vigente.' });
  try {
    const user = await prisma.usuario.findFirst({ where: { id: verified.userId, tenantId: verified.tenantId, activo: true, eliminadoEn: null } });
    if (!user || user.invitationPending || user.sessionVersion !== verified.sessionVersion || ((user.verificationRequired || process.env.NODE_ENV === 'production') && !user.emailVerifiedAt)) return res.status(401).json({ code: 'USUARIO_INACTIVO', error: 'El acceso de impresión fue revocado.' });
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant || ['SUSPENDIDO', 'CANCELADO'].includes(tenant.estado)) return res.status(403).json({ code: 'SUSCRIPCION_SUSPENDIDA', error: 'Licencia inactiva.' });
    const access = await resolveScope(user, canonicalPath(req));
    req.ctx = { ...access, tenant, sessionVersion: user.sessionVersion };
    return await authorizeRequest(req, res, next, access);
  } catch (error) { next(error); }
};

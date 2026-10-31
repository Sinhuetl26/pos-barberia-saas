import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { queueAction, allowSecurityAttempt } from '../services/account-security.service';
import { prisma } from '@systech/database';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth';
import { LicensePlan, licenseError, withLicenseLock } from '../services/license-catalog.service';

export const usuariosRouter = Router();
usuariosRouter.use(requireAuth, requireRole('DUENO'));
const publicFields = { invitationPending: true, emailVerifiedAt: true, id: true, nombre: true, email: true, rol: true, activo: true, sucursalId: true, barberoId: true, sucursalesAsignadasJson: true };
const view = (user: any) => ({ invitationPending: user.invitationPending, emailVerifiedAt: user.emailVerifiedAt, id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, activo: user.activo, barberoId: user.barberoId, branchIds: user.sucursalesAsignadasJson === null ? (user.sucursalId ? [user.sucursalId] : []) : JSON.parse(user.sucursalesAsignadasJson) });
const failure = (status: number, error: string) => Object.assign(new Error(error), { status, code: 'ACCESO_INVALIDO' });

async function validateAccess(db: any, tenantId: string, body: any, plan: LicensePlan, userId?: string) {
  if (!['GERENTE', 'CAJERO', 'BARBERO'].includes(body.rol)) throw failure(400, 'Selecciona gerente, cajero o barbero.');
  if (['GERENTE', 'CAJERO'].includes(body.rol) && body.activo !== false && !plan.capabilities.includes('STAFF_ROLES')) throw licenseError(403, 'PLAN_UPGRADE_REQUIRED', 'Las cuentas de gerente y recepción están disponibles en Studio Pro. En Esencial puedes dar acceso individual a tus barberos.');
  if (!Array.isArray(body.branchIds) || !body.branchIds.length || body.branchIds.length > 100 || body.branchIds.some((id: any) => typeof id !== 'string')) throw failure(400, 'Asigna al menos una sucursal válida.');
  const branchIds = [...new Set(body.branchIds)] as string[];
  const valid = await db.sucursal.count({ where: { id: { in: branchIds }, tenantId, eliminadoEn: null } });
  if (valid !== branchIds.length) throw failure(404, 'Una sucursal no está disponible para este negocio.');
  let barberoId: string | null = null;
  if (body.rol === 'BARBERO') {
    if (branchIds.length !== 1 || typeof body.barberoId !== 'string') throw failure(400, 'El barbero necesita un perfil y una sola sucursal.');
    const barber = await db.barbero.findFirst({ where: { id: body.barberoId, sucursalId: branchIds[0], activo: true, eliminadoEn: null, sucursal: { tenantId } } });
    if (!barber) throw failure(404, 'Perfil de barbero no disponible para esa sucursal.');
    const linked = await db.usuario.findFirst({ where: { tenantId, barberoId: barber.id, activo: true, eliminadoEn: null, ...(userId ? { id: { not: userId } } : {}) } });
    if (linked) throw failure(409, 'Ese perfil ya tiene una cuenta activa.');
    barberoId = barber.id;
  }
  if (body.activo !== undefined && typeof body.activo !== 'boolean') throw failure(400, 'El estado de acceso debe ser válido.');
  return { rol: body.rol, sucursalId: branchIds[0], sucursalesAsignadasJson: JSON.stringify(branchIds), barberoId, activo: body.activo ?? true };
}

usuariosRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const users = await prisma.usuario.findMany({ where: { tenantId: req.ctx!.tenantId, eliminadoEn: null }, select: { ...publicFields, authActions: { where: { purpose: 'INVITE' }, orderBy: { createdAt: 'desc' }, take: 1, select: { mailStatus: true, expiresAt: true } } }, orderBy: { nombre: 'asc' } });
    res.json(users.map(u => ({ ...view(u), invitationStatus: u.authActions[0]?.mailStatus || null, invitationExpiresAt: u.authActions[0]?.expiresAt || null })));
  }
  catch (error) { next(error); }
});

usuariosRouter.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { nombre, email } = req.body;
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 120 || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw failure(400, 'Introduce nombre y correo válidos. El empleado elegirá su propia contraseña.');
    if (!await allowSecurityAttempt('invite-owner', req.ctx!.userId, 15)) throw failure(429, 'Espera 15 minutos antes de enviar más invitaciones.');
    const hash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    const user = await withLicenseLock(req.ctx!.tenantId, async (tx, plan) => {
      const access = await validateAccess(tx, req.ctx!.tenantId, req.body, plan);
      const created = await tx.usuario.create({ data: { tenantId: req.ctx!.tenantId, nombre: nombre.trim(), email: email.trim().toLowerCase(), passwordHash: hash, ...access, invitationPending: true, verificationRequired: true }, select: publicFields });
      await tx.auditoriaLog.create({ data: { tenantId: req.ctx!.tenantId, usuarioEmail: req.ctx!.email, accion: 'ACCESO_EQUIPO_CREADO', detalles: JSON.stringify({ usuarioId: created.id, ...access }) } });
      await queueAction(tx, created.id, 'INVITE');
      return created;
    });
    res.status(201).json({ ...view(user), message: 'Invitación creada. El envío por correo está pendiente; revisa su estado en esta lista.' });
  } catch (error: any) { if (error.code === 'P2002') return res.status(409).json({ code: 'ACCESO_EXISTENTE', error: 'El correo ya tiene una cuenta.' }); next(error); }
});

usuariosRouter.put('/:id/acceso', async (req: AuthenticatedRequest, res, next) => {
  try {
    const current = await prisma.usuario.findFirst({ where: { id: req.params.id, tenantId: req.ctx!.tenantId, eliminadoEn: null } });
    if (!current) throw failure(404, 'Cuenta no disponible.');
    if (['DUENO', 'SUPER_ADMIN'].includes(current.rol)) throw failure(403, 'El acceso del propietario o administrador requiere un procedimiento separado.');
    const user = await withLicenseLock(req.ctx!.tenantId, async (tx, plan) => {
      const access = await validateAccess(tx, req.ctx!.tenantId, req.body, plan, current.id);
      const updated = await tx.usuario.update({ where: { id: current.id }, data: { ...access, sessionVersion: { increment: 1 } }, select: publicFields });
      await tx.auditoriaLog.create({ data: { tenantId: req.ctx!.tenantId, usuarioEmail: req.ctx!.email, accion: 'ACCESO_EQUIPO_ACTUALIZADO', detalles: JSON.stringify({ usuarioId: current.id, anterior: { rol: current.rol, activo: current.activo, sucursalId: current.sucursalId, barberoId: current.barberoId }, actual: access }) } });
      await tx.authAction.updateMany({ where: { userId: current.id, consumedAt: null }, data: { consumedAt: new Date(), encryptedToken: null, mailStatus: 'CANCELED' } });
      if (updated.invitationPending && updated.activo) await queueAction(tx, current.id, 'INVITE');
      return updated;
    });
    res.json(view(user));
  } catch (error) { next(error); }
});

usuariosRouter.post('/:id/invitacion', async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.usuario.findFirst({ where: { id: req.params.id, tenantId: req.ctx!.tenantId, eliminadoEn: null, invitationPending: true, activo: true } });
    if (!user || ['DUENO', 'SUPER_ADMIN'].includes(user.rol)) throw failure(404, 'Invitación no disponible.');
    if (!await allowSecurityAttempt('resend-invite', user.id, 5)) throw failure(429, 'Espera 15 minutos antes de reenviar.');
    await prisma.$transaction(tx => queueAction(tx, user.id, 'INVITE'));
    res.json({ message: 'Nuevo envío pendiente. El enlace anterior dejó de funcionar.' });
  } catch (e) { next(e); }
});
usuariosRouter.delete('/:id/invitacion', async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.usuario.findFirst({ where: { id: req.params.id, tenantId: req.ctx!.tenantId, invitationPending: true, eliminadoEn: null } });
    if (!user || ['DUENO', 'SUPER_ADMIN'].includes(user.rol)) throw failure(404, 'Invitación no disponible.');
    await prisma.$transaction(async tx => {
      await tx.usuario.update({ where: { id: user.id }, data: { activo: false, sessionVersion: { increment: 1 } } });
      await tx.authAction.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: new Date(), encryptedToken: null, mailStatus: 'CANCELED' } });
      await tx.auditoriaLog.create({ data: { tenantId: user.tenantId, usuarioEmail: req.ctx!.email, accion: 'INVITACION_CANCELADA', detalles: JSON.stringify({ usuarioId: user.id }) } });
    });
    res.json({ message: 'Invitación cancelada. La cuenta no puede iniciar sesión.' });
  } catch (e) { next(e); }
});

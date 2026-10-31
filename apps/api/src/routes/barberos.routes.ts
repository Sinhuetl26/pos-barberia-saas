// ==========================================
// SYSTECH STUDIO - BARBEROS & COMISIONES ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { createBarberoSchema, updateBarberoSchema, validateBody } from '../validators/schemas';
import { withLicenseLock, assertBarberCapacity, licenseError } from '../services/license-catalog.service';

export const barberosRouter = Router();

barberosRouter.use(requireAuth);

// List barbers with branch details
barberosRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId } = req.query as { sucursalId?: string };

    const barberos = await prisma.barbero.findMany({
      where: {
        sucursal: { tenantId },
        eliminadoEn: null,
        ...(sucursalId ? { sucursalId } : {})
      },
      include: {
        sucursal: true,
        comisiones: {
          where: { pagada: false }
        }
      }
    });

    const formatted = barberos.map(b => {
      const comisionesPendientes = b.comisiones.reduce((sum, c) => sum + Number(c.monto), 0);
      return {
        ...b,
        comisionesPendientes
      };
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener barberos' });
  }
});

import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { queueAction, allowSecurityAttempt } from '../services/account-security.service';

// Create barber (C2: requireRole DUENO/GERENTE; A6: respects tenant.limiteBarberos)
barberosRouter.post('/', requireRole('DUENO', 'GERENTE'), validateBody(createBarberoSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const {
      sucursalId,
      nombre,
      telefono,
      email,
      avatarUrl,
      especialidad,
      descripcion,
      visibleEnWeb = true,
      comisionServiciosPct = 50,
      comisionProductosPct = 10,
      diasDescanso = 'Domingo',
      horarioInicio = '09:00',
      horarioFin = '20:00',
      password,
      crearAcceso
    } = req.body;

    if (crearAcceso && req.ctx!.rol !== 'DUENO') throw licenseError(403, 'SIN_PERMISO', 'Solo el propietario puede invitar personas al negocio.');
    if (crearAcceso && !email) throw licenseError(400, 'BAD_REQUEST', 'Introduce el correo de la persona que recibirá la invitación.');
    if (crearAcceso && !await allowSecurityAttempt('invite-owner', req.ctx!.userId, 15)) throw licenseError(429, 'RATE_LIMIT', 'Espera 15 minutos antes de enviar más invitaciones.');
    const hash = crearAcceso && email ? await bcrypt.hash(randomBytes(32).toString('hex'), 12) : null;
    const barbero = await withLicenseLock(tenantId, async (tx, plan) => {
      const sucursal = await tx.sucursal.findFirst({ where: { id: sucursalId, tenantId, eliminadoEn: null } });
      if (!sucursal) throw licenseError(400, 'BAD_REQUEST', 'Sucursal no válida para su barbería.');
      await assertBarberCapacity(tx, sucursalId, plan);
      const barbero = await tx.barbero.create({
      data: {
        sucursalId,
        nombre: nombre.trim(),
        telefono: telefono ? telefono.trim() : null,
        email: email ? email.trim() : null,
        avatarUrl: avatarUrl ? avatarUrl.trim() : null,
        especialidad: especialidad ? especialidad.trim() : null,
        descripcion: descripcion ? descripcion.trim() : null,
        visibleEnWeb: Boolean(visibleEnWeb),
        comisionServiciosPct: Number(comisionServiciosPct),
        comisionProductosPct: Number(comisionProductosPct),
        diasDescanso,
        horarioInicio,
        horarioFin
      },
      include: { sucursal: true }
      });

    // Optionally create linked user account for the barber
    if (hash && email) {
      const existingUser = await tx.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existingUser) throw licenseError(409, 'EMAIL_ALREADY_EXISTS', 'El correo ya tiene una cuenta. No se creó el barbero ni se consumió capacidad.');
        const invited = await tx.usuario.create({
          data: {
            tenantId,
            sucursalId,
            barberoId: barbero.id,
            email: email.trim().toLowerCase(),
            passwordHash: hash,
            verificationRequired: true, invitationPending: true, sucursalesAsignadasJson: JSON.stringify([sucursalId]),
            nombre: nombre.trim(),
            telefono: telefono ? telefono.trim() : null,
            rol: 'BARBERO',
            activo: true
          }
        });
      await queueAction(tx, invited.id, 'INVITE');
    }
      return barbero;
    });

    res.json(barbero);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ code: 'EMAIL_ALREADY_EXISTS', error: 'El correo ya tiene una cuenta. No se consumió capacidad.' });
    next(error);
  }
});

// Update barber (DUENO/GERENTE can edit all; BARBERO can only edit their own public profile/bio/avatar)
barberosRouter.put('/:id', validateBody(updateBarberoSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const data = req.body;
    const isOwnerOrManager = ['DUENO', 'GERENTE'].includes(req.ctx!.rol);

    const existing = await prisma.barbero.findFirst({
      where: { id, sucursal: { tenantId }, eliminadoEn: null }
    });
    if (!existing) {
      return res.status(404).json({ code: 'NOT_FOUND', error: 'Barbero no encontrado en su barbería' });
    }

    // Role checks
    if (!isOwnerOrManager) {
      // Only the barber themselves can update their own profile
      const isSelf = req.ctx!.barberoId === id;
      if (!isSelf) {
        return res.status(403).json({ code: 'FORBIDDEN', error: 'No tienes permiso para modificar a otros barberos' });
      }

      // Barbero can only update bio, avatar, and specialty
      const updatedSelf = await prisma.barbero.update({
        where: { id },
        data: {
          avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
          especialidad: data.especialidad !== undefined ? data.especialidad : undefined,
          descripcion: data.descripcion !== undefined ? data.descripcion : undefined,
          telefono: data.telefono !== undefined ? data.telefono : undefined
        }
      });
      return res.json(updatedSelf);
    }

    // Owner / Manager can update everything
    const barbero = await withLicenseLock(tenantId, async (tx, plan) => {
      const current = await tx.barbero.findFirst({ where: { id, sucursal: { tenantId, eliminadoEn: null }, eliminadoEn: null } });
      if (!current) throw licenseError(404, 'NOT_FOUND', 'Barbero no encontrado en su barbería.');
      if (data.activo === true && !current.activo) await assertBarberCapacity(tx, current.sucursalId, plan);
      return tx.barbero.update({
      where: { id },
      data: {
        nombre: data.nombre ? data.nombre.trim() : undefined,
        telefono: data.telefono !== undefined ? data.telefono : undefined,
        email: data.email !== undefined ? data.email : undefined,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
        especialidad: data.especialidad !== undefined ? data.especialidad : undefined,
        descripcion: data.descripcion !== undefined ? data.descripcion : undefined,
        visibleEnWeb: data.visibleEnWeb !== undefined ? Boolean(data.visibleEnWeb) : undefined,
        comisionServiciosPct: data.comisionServiciosPct !== undefined ? Number(data.comisionServiciosPct) : undefined,
        comisionProductosPct: data.comisionProductosPct !== undefined ? Number(data.comisionProductosPct) : undefined,
        diasDescanso: data.diasDescanso,
        horarioInicio: data.horarioInicio,
        horarioFin: data.horarioFin,
        activo: data.activo !== undefined ? data.activo : undefined
      }
      });
    });

    res.json(barbero);
  } catch (error) { next(error); }
});

barberosRouter.post('/:id/restaurar', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await withLicenseLock(req.ctx!.tenantId, async (tx, plan) => {
      const barber = await tx.barbero.findFirst({ where: { id: req.params.id, sucursal: { tenantId: req.ctx!.tenantId, eliminadoEn: null } } });
      if (!barber) throw licenseError(404, 'NOT_FOUND', 'Barbero no encontrado.');
      if (!barber.eliminadoEn && barber.activo) return barber;
      await assertBarberCapacity(tx, barber.sucursalId, plan);
      return tx.barbero.update({ where: { id: barber.id }, data: { activo: true, eliminadoEn: null } });
    });
    res.json(result);
  } catch (error) { next(error); }
});

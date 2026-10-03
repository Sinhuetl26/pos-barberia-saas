// ==========================================
// SYSTECH STUDIO - BARBEROS & COMISIONES ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { createBarberoSchema, validateBody } from '../validators/schemas';

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

// Create barber (C2: requireRole DUENO/GERENTE; A6: respects tenant.limiteBarberos)
barberosRouter.post('/', requireRole('DUENO', 'GERENTE'), validateBody(createBarberoSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const tenant = req.ctx!.tenant;
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

    const sucursal = await prisma.sucursal.findFirst({
      where: { id: sucursalId, tenantId, eliminadoEn: null }
    });
    if (!sucursal) {
      return res.status(400).json({ code: 'BAD_REQUEST', error: 'Sucursal no válida para su barbería' });
    }

    const currentBarbersCount = await prisma.barbero.count({
      where: { sucursal: { tenantId }, eliminadoEn: null }
    });

    const limit = tenant.limiteBarberos || (tenant.plan === 'PRO' ? 999 : 3);
    if (currentBarbersCount >= limit) {
      return res.status(403).json({
        code: 'PLAN_LIMIT_REACHED',
        error: `Su plan permite hasta ${limit} barberos. Haz upgrade para barberos ilimitados.`,
        requiresUpgrade: true
      });
    }

    const barbero = await prisma.barbero.create({
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
    if (crearAcceso && email && password) {
      const existingUser = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (!existingUser) {
        const hash = await bcrypt.hash(password, 12);
        await prisma.usuario.create({
          data: {
            tenantId,
            sucursalId,
            barberoId: barbero.id,
            email: email.trim().toLowerCase(),
            passwordHash: hash,
            nombre: nombre.trim(),
            telefono: telefono ? telefono.trim() : null,
            rol: 'BARBERO',
            activo: true
          }
        });
      }
    }

    res.json(barbero);
  } catch (error) {
    res.status(500).json({ error: 'Error al dar de alta barbero' });
  }
});

// Update barber (DUENO/GERENTE can edit all; BARBERO can only edit their own public profile/bio/avatar)
barberosRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
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
      const isSelf = existing.email === req.ctx!.email || (req.ctx as any).barberoId === id;
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
    const barbero = await prisma.barbero.update({
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

    res.json(barbero);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar barbero' });
  }
});

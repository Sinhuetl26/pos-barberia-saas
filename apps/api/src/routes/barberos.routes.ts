// ==========================================
// SYSTECH STUDIO - BARBEROS & COMISIONES ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
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

// Create barber (respects plan limit: 3 on BASICO, unlimited on PRO)
barberosRouter.post('/', validateBody(createBarberoSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const tenant = req.ctx!.tenant;
    const {
      sucursalId,
      nombre,
      telefono,
      email,
      comisionServiciosPct = 50,
      comisionProductosPct = 10,
      diasDescanso = 'Domingo',
      horarioInicio = '09:00',
      horarioFin = '20:00'
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

    if (tenant.plan === 'BASICO' && currentBarbersCount >= 3) {
      return res.status(403).json({
        code: 'PLAN_LIMIT_REACHED',
        error: 'El Plan Básico permite hasta 3 barberos. Haz upgrade a Plan Pro para barberos ilimitados.',
        requiresUpgrade: true
      });
    }

    const barbero = await prisma.barbero.create({
      data: {
        sucursalId,
        nombre: nombre.trim(),
        telefono: telefono ? telefono.trim() : null,
        email: email ? email.trim() : null,
        comisionServiciosPct: Number(comisionServiciosPct),
        comisionProductosPct: Number(comisionProductosPct),
        diasDescanso,
        horarioInicio,
        horarioFin
      },
      include: { sucursal: true }
    });

    res.json(barbero);
  } catch (error) {
    res.status(500).json({ error: 'Error al dar de alta barbero' });
  }
});

// Update barber
barberosRouter.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.barbero.findFirst({
      where: { id, sucursal: { tenantId }, eliminadoEn: null }
    });
    if (!existing) {
      return res.status(404).json({ code: 'NOT_FOUND', error: 'Barbero no encontrado en su barbería' });
    }

    const barbero = await prisma.barbero.update({
      where: { id },
      data: {
        nombre: data.nombre ? data.nombre.trim() : undefined,
        telefono: data.telefono !== undefined ? data.telefono : undefined,
        email: data.email !== undefined ? data.email : undefined,
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

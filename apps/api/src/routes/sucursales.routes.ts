// ==========================================
// SYSTECH STUDIO - SUCURSALES ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const sucursalesRouter = Router();

sucursalesRouter.use(requireAuth);

// List branches
sucursalesRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const sucursales = await prisma.sucursal.findMany({
      where: { tenantId, eliminadoEn: null },
      include: {
        barberos: {
          where: { activo: true, eliminadoEn: null }
        }
      }
    });
    res.json(sucursales);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar sucursales' });
  }
});

// Create branch (C2: requireRole DUENO, GERENTE; A6: respects tenant.limiteSucursales)
sucursalesRouter.post('/', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const tenant = req.ctx!.tenant;
    const { nombre, direccion, telefono, horarioApertura, horarioCierre, zonaHoraria = 'America/Mexico_City' } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la sucursal es obligatorio' });
    }

    const branchCount = await prisma.sucursal.count({
      where: { tenantId, eliminadoEn: null }
    });

    const limit = tenant.limiteSucursales || (tenant.plan === 'PRO' ? 999 : 1);
    if (branchCount >= limit) {
      return res.status(403).json({
        code: 'PLAN_BRANCH_LIMIT',
        error: `Su plan permite hasta ${limit} sucursal(es). Actualiza al Plan Pro para sucursales ilimitadas.`,
        requiresUpgrade: true
      });
    }

    const sucursal = await prisma.sucursal.create({
      data: {
        tenantId,
        nombre: nombre.trim(),
        direccion: direccion || null,
        telefono: telefono || null,
        horarioApertura: horarioApertura || '09:00',
        horarioCierre: horarioCierre || '20:00',
        zonaHoraria
      }
    });

    res.json(sucursal);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear sucursal' });
  }
});

// Update branch (C2: requireRole DUENO, GERENTE)
sucursalesRouter.put('/:id', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const { nombre, direccion, telefono, horarioApertura, horarioCierre, zonaHoraria } = req.body;

    const existing = await prisma.sucursal.findFirst({
      where: { id, tenantId, eliminadoEn: null }
    });
    if (!existing) {
      return res.status(404).json({ code: 'NOT_FOUND', error: 'Sucursal no encontrada en su barbería' });
    }

    const updated = await prisma.sucursal.update({
      where: { id },
      data: {
        nombre: nombre !== undefined ? nombre.trim() : undefined,
        direccion: direccion !== undefined ? direccion : undefined,
        telefono: telefono !== undefined ? telefono : undefined,
        horarioApertura: horarioApertura !== undefined ? horarioApertura : undefined,
        horarioCierre: horarioCierre !== undefined ? horarioCierre : undefined,
        zonaHoraria: zonaHoraria !== undefined ? zonaHoraria : undefined
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar sucursal' });
  }
});

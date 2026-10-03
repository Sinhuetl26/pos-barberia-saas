// ==========================================
// SYSTECH STUDIO - SUCURSALES ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

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

// Create branch (respects plan branch limits: 1 on BASICO, unlimited on PRO)
sucursalesRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const tenant = req.ctx!.tenant;
    const { nombre, direccion, telefono, horarioApertura, horarioCierre } = req.body;

    const branchCount = await prisma.sucursal.count({
      where: { tenantId, eliminadoEn: null }
    });

    if (tenant.plan === 'BASICO' && branchCount >= 1) {
      return res.status(403).json({
        code: 'PLAN_BRANCH_LIMIT',
        error: 'El Plan Básico solo incluye 1 sucursal. Actualiza al Plan Pro para sucursales ilimitadas.',
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
        horarioCierre: horarioCierre || '20:00'
      }
    });

    res.json(sucursal);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear sucursal' });
  }
});

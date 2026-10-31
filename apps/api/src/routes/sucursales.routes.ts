// ==========================================
// SYSTECH STUDIO - SUCURSALES ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { withLicenseLock, assertBranchCapacity, licenseError } from '../services/license-catalog.service';

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
sucursalesRouter.post('/', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { nombre, direccion, telefono, horarioApertura, horarioCierre, zonaHoraria = 'America/Mexico_City' } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la sucursal es obligatorio' });
    }

    const sucursal = await withLicenseLock(tenantId, async (tx, plan) => {
      await assertBranchCapacity(tx, tenantId, plan);
      return tx.sucursal.create({
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
    });

    res.json(sucursal);
  } catch (error) { next(error); }
});

sucursalesRouter.post('/:id/restaurar', requireRole('DUENO'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const branch = await withLicenseLock(req.ctx!.tenantId, async (tx, plan) => {
      const existing = await tx.sucursal.findFirst({ where: { id: req.params.id, tenantId: req.ctx!.tenantId } });
      if (!existing) throw licenseError(404, 'NOT_FOUND', 'Sucursal no encontrada.');
      if (!existing.eliminadoEn) return existing;
      await assertBranchCapacity(tx, req.ctx!.tenantId, plan);
      const count = await tx.barbero.count({ where: { sucursalId: existing.id, activo: true, eliminadoEn: null } });
      if (count > plan.barbersPerBranch) throw licenseError(409, 'PLAN_CAPACITY_CONFLICT', 'La sucursal tiene más personal activo que la capacidad del plan. Resuelve el exceso antes de restaurarla.');
      return tx.sucursal.update({ where: { id: existing.id }, data: { eliminadoEn: null } });
    });
    res.json(branch);
  } catch (error) { next(error); }
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

// ==========================================
// SYSTECH STUDIO - BLOQUEOS HORARIOS ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export const bloqueosRouter = Router();

bloqueosRouter.use(requireAuth);

bloqueosRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId } = req.query as { sucursalId?: string };

    const bloqueos = await prisma.bloqueoHorario.findMany({
      where: {
        tenantId,
        ...(sucursalId ? { sucursalId } : {})
      },
      include: { barbero: true }
    });
    res.json(bloqueos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener bloqueos de horario' });
  }
});

bloqueosRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId, barberoId, fechaInicio, fechaFin, motivo } = req.body;

    const sucursal = await prisma.sucursal.findFirst({
      where: { id: sucursalId, tenantId, eliminadoEn: null }
    });
    if (!sucursal) {
      return res.status(400).json({ code: 'BAD_REQUEST', error: 'Sucursal no pertenece a esta barbería' });
    }

    if (barberoId) {
      const barbero = await prisma.barbero.findFirst({
        where: { id: barberoId, sucursal: { tenantId }, eliminadoEn: null }
      });
      if (!barbero) {
        return res.status(400).json({ code: 'BAD_REQUEST', error: 'Barbero no pertenece a esta barbería' });
      }
    }

    const bloqueo = await prisma.bloqueoHorario.create({
      data: {
        tenantId,
        sucursalId,
        barberoId: barberoId || null,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        motivo: motivo || 'Bloqueo general'
      }
    });

    res.json(bloqueo);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear bloqueo de horario' });
  }
});

bloqueosRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;

    const existing = await prisma.bloqueoHorario.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      return res.status(404).json({ code: 'NOT_FOUND', error: 'Bloqueo no encontrado' });
    }

    await prisma.bloqueoHorario.delete({ where: { id } });
    res.json({ message: 'Bloqueo eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar bloqueo' });
  }
});

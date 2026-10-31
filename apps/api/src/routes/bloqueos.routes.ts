// ==========================================
// SYSTECH STUDIO - BLOQUEOS HORARIOS ROUTES
// ==========================================

import { Router } from 'express';
import { createScheduleBlock, deleteScheduleBlock } from '../services/booking-operations.service';
import { prisma } from '@systech/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { previewScheduleImpact, confirmScheduleImpact, listSpecialSchedules } from '../services/schedule-impact.service';

export const bloqueosRouter = Router();

bloqueosRouter.use(requireAuth);

const impactError=(res:any,error:any)=>res.status(error.statusCode||500).json({code:error.code||'SCHEDULE_FAILED',error:error.statusCode?error.message:'No pudimos guardar disponibilidad. Conserva la intención y reintenta.'});
bloqueosRouter.post('/impacto',async(req:AuthenticatedRequest,res)=>{try{res.json(await previewScheduleImpact(req.ctx!,req.body));}catch(error){impactError(res,error);}});
bloqueosRouter.post('/ausencias',async(req:AuthenticatedRequest,res)=>{try{if(req.body.tipo==='HORARIO_ESPECIAL')return res.status(400).json({code:'INVALID_CHANGE',error:'Usa la configuración de turno especial.'});res.json(await confirmScheduleImpact(req.ctx!,req.body));}catch(error){impactError(res,error);}});
bloqueosRouter.post('/horarios',async(req:AuthenticatedRequest,res)=>{try{res.json(await confirmScheduleImpact(req.ctx!,{...req.body,tipo:'HORARIO_ESPECIAL'}));}catch(error){impactError(res,error);}});
bloqueosRouter.get('/horarios',async(req:AuthenticatedRequest,res)=>{try{if(typeof req.query.sucursalId!=='string')return res.status(400).json({code:'INVALID_BRANCH',error:'Elige sucursal.'});res.json(await listSpecialSchedules(req.ctx!,req.query.sucursalId,req.query.fecha as string|undefined));}catch(error){impactError(res,error);}});

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

bloqueosRouter.post('/',async(req:AuthenticatedRequest,res)=>{try{res.json(await createScheduleBlock(req.ctx,req.body));}catch(error:any){res.status(error.statusCode||500).json({code:error.code||'BLOCK_FAILED',error:error.statusCode?error.message:'No se pudo guardar el bloqueo.'});}});
bloqueosRouter.delete('/:id',async(req:AuthenticatedRequest,res)=>{try{res.json(await deleteScheduleBlock(req.ctx,req.params.id));}catch(error:any){res.status(error.statusCode||500).json({code:error.code||'BLOCK_FAILED',error:error.statusCode?error.message:'No se pudo eliminar el bloqueo.'});}});

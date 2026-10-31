import {prisma} from '@systech/database';
import {emailReadiness} from '../services/email-readiness.service';
import {AuthenticatedRequest} from '../middleware/auth';
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { getIntegrationCatalog } from '../services/integrations.service';

export const integracionesRouter = Router();
integracionesRouter.use(requireAuth, requireRole('DUENO', 'SUPER_ADMIN'));
integracionesRouter.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    checkedAt: new Date().toISOString(),
    scope: 'platform',
    verification: 'configuration_only',
    connectors: getIntegrationCatalog(),
  });
});

integracionesRouter.get('/correo',async(req:AuthenticatedRequest,res,next)=>{try{res.setHeader('Cache-Control','no-store');const [readiness,messages]=await Promise.all([emailReadiness(),prisma.authAction.findMany({where:{tenantId:req.ctx!.tenantId},orderBy:{createdAt:'desc'},take:30,select:{id:true,purpose:true,mailStatus:true,deliveryStatus:true,createdAt:true,user:{select:{email:true}}}})]);res.json({readiness,messages});}catch(e){next(e);}});

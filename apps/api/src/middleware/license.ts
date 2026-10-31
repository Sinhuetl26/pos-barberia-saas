import { RequestHandler } from 'express';
import { AuthenticatedRequest } from './auth';
import { getLicensePlan, LicenseCapability } from '../services/license-catalog.service';

export const requirePlanCapability = (capability: LicenseCapability, label: string): RequestHandler => (request, response, next) => {
  const req = request as AuthenticatedRequest;
  try {
    const plan = getLicensePlan(req.ctx?.tenant?.plan);
    if (!plan.capabilities.includes(capability)) return response.status(403).json({
      code: 'PLAN_UPGRADE_REQUIRED',
      capability,
      currentPlan: plan.code,
      error: `${label} está disponible en Studio Pro. Tu operación diaria y tus datos se conservan en ${plan.name}.`
    });
    next();
  } catch (error) { next(error); }
};

// ======================================================================
// SYSTECH STUDIO - NOTIFICACIONES & WHATSAPP ROUTES
// Cloud API Dispatch, Automated Reminders, Opt-out & Notification Logs
// ======================================================================

import { Router, Response } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { WhatsAppService } from '../services/whatsapp.service';

export const notificacionesRouter = Router();

notificacionesRouter.use(requireAuth);

// Get Notifications Log
notificacionesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const logs = await prisma.notificacionLog.findMany({
      where: { tenantId },
      orderBy: { fecha: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener registro de notificaciones' });
  }
});

// Send WhatsApp / SMS Notification (Cloud API + Fallback)
notificacionesRouter.post('/enviar', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { tipo, destinatario, mensaje, forzarHorario } = req.body;

    if (!destinatario || !mensaje) {
      return res.status(400).json({ error: 'Destinatario y mensaje son requeridos' });
    }

    const resultado = await WhatsAppService.enviarMensaje({
      tenantId,
      destinatario,
      mensaje,
      tipo: tipo || 'NOTIFICACION_MANUAL',
      forzarHorario: Boolean(forzarHorario)
    }, prisma);

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar notificación' });
  }
});

// Backward-compatible simular-envio
notificacionesRouter.post('/simular-envio', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { tipo = 'RECORDATORIO_MANUAL', destinatario, mensaje } = req.body;

    if (!destinatario || !mensaje) {
      return res.status(400).json({ error: 'Destinatario y mensaje son requeridos' });
    }

    const resultado = await WhatsAppService.enviarMensaje({
      tenantId,
      destinatario,
      mensaje,
      tipo,
      forzarHorario: true // Manual clicks from UI are considered authorized
    }, prisma);

    res.json({
      success: resultado.success,
      notificacion: {
        id: resultado.notificacionId,
        tipo,
        canal: 'WHATSAPP',
        destinatario,
        mensaje,
        estado: resultado.estado
      },
      whatsappLink: resultado.whatsappLink
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar notificación' });
  }
});

// Register Client Opt-Out (BAJA)
notificacionesRouter.post('/opt-out', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { telefono } = req.body;

    if (!telefono) {
      return res.status(400).json({ error: 'Teléfono es requerido' });
    }

    const resultado = await WhatsAppService.registrarOptOut(telefono, tenantId, prisma);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar opt-out' });
  }
});

// Automated Reminders Scan (24h and 2h before appointments)
notificacionesRouter.post('/procesar-recordatorios', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const resultado = await WhatsAppService.procesarRecordatoriosAutomaticos(prisma);
    res.json({
      success: true,
      resultado
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar recordatorios automáticos' });
  }
});

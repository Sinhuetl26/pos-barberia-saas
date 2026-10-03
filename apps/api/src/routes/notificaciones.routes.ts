// ======================================================================
// SYSTECH STUDIO - NOTIFICACIONES & WHATSAPP ROUTES
// Cloud API Dispatch, Automated Reminders, Opt-out & Notification Logs
// ======================================================================

import { Router, Response } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { WhatsAppService } from '../services/whatsapp.service';

export const notificacionesRouter = Router();

// ======================================================================
// P2.3 FIX: Meta WhatsApp Webhook Endpoints (Public - Signature & Challenge Verified)
// ======================================================================

// 1. Meta Webhook Verification (Handshake challenge)
notificacionesRouter.get('/meta-webhook', (req: any, res: any) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_WA_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || 'systech_wa_verify_token';

  if (mode === 'subscribe' && token === expectedToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Forbidden: Token de verificación de Meta inválido');
});

// Alias for standard /webhook path
notificacionesRouter.get('/webhook', (req: any, res: any) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedToken = process.env.META_WA_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || 'systech_wa_verify_token';
  if (mode === 'subscribe' && token === expectedToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Forbidden: Token de verificación de Meta inválido');
});

// 2. Meta WhatsApp Status Webhook (sent, delivered, read, failed)
notificacionesRouter.post('/meta-webhook', async (req: any, res: any) => {
  try {
    const body = req.body;
    if (body.object === 'whatsapp_business_account' || body.entry) {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (value?.statuses && Array.isArray(value.statuses)) {
            for (const statusItem of value.statuses) {
              const metaId = statusItem.id;
              const metaStatus = statusItem.status; // 'sent', 'delivered', 'read', 'failed'
              const recipientId = statusItem.recipient_id;
              if (metaId && metaStatus) {
                await WhatsAppService.actualizarEstadoWebhook(metaId, metaStatus, recipientId, prisma);
              }
            }
          }
        }
      }
    }
    res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Error al procesar webhook de Meta WhatsApp:', err);
    res.status(200).json({ status: 'error_logged' }); // Meta requires 200 to acknowledge delivery
  }
});

notificacionesRouter.post('/webhook', async (req: any, res: any) => {
  try {
    const body = req.body;
    if (body.object === 'whatsapp_business_account' || body.entry) {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (value?.statuses && Array.isArray(value.statuses)) {
            for (const statusItem of value.statuses) {
              const metaId = statusItem.id;
              const metaStatus = statusItem.status;
              const recipientId = statusItem.recipient_id;
              if (metaId && metaStatus) {
                await WhatsAppService.actualizarEstadoWebhook(metaId, metaStatus, recipientId, prisma);
              }
            }
          }
        }
      }
    }
    res.status(200).json({ status: 'success' });
  } catch (err) {
    res.status(200).json({ status: 'error_logged' });
  }
});

// ======================================================================
// Authenticated Notification Endpoints
// ======================================================================
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

    // P1.2 RBAC: Barbers can only send appointment-related reminders, not arbitrary marketing broadcasts
    if (req.ctx!.rol === 'BARBERO' && tipo && !['RECORDATORIO_MANUAL', 'CITA_RECORDATORIO', 'CONFIRMACION_CITA'].includes(tipo)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        error: 'Los barberos solo tienen permitido enviar recordatorios directos de citas, no mensajes masivos o de difusión.'
      });
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

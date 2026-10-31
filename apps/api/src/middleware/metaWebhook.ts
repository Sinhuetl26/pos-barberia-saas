import { createHmac, timingSafeEqual } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

export function verifyMetaWebhook(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return res.status(503).json({ code: 'META_WEBHOOK_NO_CONFIGURADO', error: 'La verificación del proveedor aún no está configurada.' });
  const signature = req.headers['x-hub-signature-256'];
  const raw = (req as any).rawBody;
  if (typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/i.test(signature) || !Buffer.isBuffer(raw)) return res.status(401).json({ code: 'META_FIRMA_INVALIDA', error: 'Firma del proveedor inválida.' });
  const expected = createHmac('sha256', secret).update(raw).digest();
  const actual = Buffer.from(signature.slice(7), 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ code: 'META_FIRMA_INVALIDA', error: 'Firma del proveedor inválida.' });
  next();
}

import { requirePrintAuth } from '../middleware/printAuth';
// ==========================================
// SYSTECH STUDIO - POINT OF SALE (POS) ROUTES
// Fast checkout, authoritative pricing, kardex, commissions, tickets
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { receiptCollectorName } from '../utils/receipt-identity';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole, AuthenticatedRequest, JWT_SECRET } from '../middleware/auth';
import { createSaleSchema, validateBody } from '../validators/schemas';
import { refundSale } from '../services/refund.service';
import { processSale, SaleError } from '../services/pos-sale.service';
import { escapeHtml, generatePrintToken, verifyPrintToken } from '../utils/security';
import { requestDiscountApproval, listDiscountApprovals, decideDiscountApproval } from '../services/discount-policy.service';
import { requirePlanCapability } from '../middleware/license';

export const posRouter = Router();

// Require Auth for operational POS routes, allowing ticket-html to authenticate with either Bearer or ephemeral printToken
posRouter.use((req, res, next) => {
  if (req.path.endsWith('/ticket-html')) {
    return requirePrintAuth('VENTA')(req as any, res, next);
  }
  return requireAuth(req as any, res, next);
});

const approvalError=(res:any,error:any)=>res.status(error.statusCode||500).json({code:error.code||'APPROVAL_RESULT_UNKNOWN',error:error.statusCode?error.message:'No se confirmó la aprobación; conserva la intención y reintenta.'});
const discountApprovals = requirePlanCapability('DISCOUNT_APPROVALS', 'Las autorizaciones de descuento');
posRouter.get('/aprobaciones',discountApprovals,async(req:AuthenticatedRequest,res)=>{try{res.json(await listDiscountApprovals(req.ctx!,req.query.sucursalId as string));}catch(error){approvalError(res,error);}});
posRouter.post('/aprobaciones',discountApprovals,async(req:AuthenticatedRequest,res)=>{try{res.json(await requestDiscountApproval(req.ctx!,req.body));}catch(error){approvalError(res,error);}});
posRouter.post('/aprobaciones/:id/aprobar',requireRole('DUENO','GERENTE'),discountApprovals,async(req:AuthenticatedRequest,res)=>{try{res.json(await decideDiscountApproval(req.ctx!,req.params.id,req.body));}catch(error){approvalError(res,error);}});

// Resolve an uncertain result even when its original product/barber is now inactive.
posRouter.get('/intenciones/:clave', async (req: AuthenticatedRequest, res) => {
  const clave = req.params.clave;
  if (!/^[a-zA-Z0-9._:-]{1,128}$/.test(clave)) return res.status(400).json({ code: 'INVALID_IDEMPOTENCY_KEY', error: 'Clave de cobro inválida.' });
  try {
    const operation = await prisma.pOSOperacion.findFirst({ where: { tenantId: req.ctx!.tenantId, clave } });
    const venta = operation?.ventaId ? await prisma.venta.findFirst({ where: { id: operation.ventaId, tenantId: req.ctx!.tenantId }, include: { items: true, devoluciones: true, barbero: true, sucursal: true, cliente: true } }) : null;
    if (!venta) return res.status(404).json({ code: 'SALE_INTENTION_NOT_FOUND', error: 'No hay una venta confirmada disponible para esta intención.' });
    res.json({ success: true, venta, ...JSON.parse(operation!.respuesta || '{}'), replayed: true });
  } catch { res.status(503).json({ code: 'SALE_RESULT_UNKNOWN', error: 'No se pudo consultar el resultado del cobro.' }); }
});

// Register one sale per durable intention; all financial effects commit together.
posRouter.post('/', validateBody(createSaleSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const header = req.headers['idempotency-key'];
    const key = req.body.idempotencyKey || header;
    if (key && (typeof key !== 'string' || !/^[a-zA-Z0-9._:-]{1,128}$/.test(key))) {
      return res.status(400).json({ code: 'INVALID_IDEMPOTENCY_KEY', error: 'Clave de cobro inválida.' });
    }
    if (header && req.body.idempotencyKey && header !== req.body.idempotencyKey) {
      return res.status(400).json({ code: 'IDEMPOTENCY_KEY_MISMATCH', error: 'Las claves de cobro deben coincidir.' });
    }
    res.json(await processSale(req.ctx as any, req.body, key as string | undefined));
  } catch (error: any) {
    const status = error instanceof SaleError ? error.statusCode : 500;
    if (status === 500) console.error('Error interno POS:', error.code || error.name);
    const rolledBackPolicy=['PRICE_CONFIRMATION_REQUIRED','DISCOUNT_APPROVAL_INVALID','APPROVAL_CART_CHANGED','DISCOUNT_LIMIT_EXCEEDED','DISCOUNT_REASON_REQUIRED','APPROVER_UNAVAILABLE'];
    res.status(status).json({ code: error instanceof SaleError ? error.code : 'SALE_RESULT_UNKNOWN', definitive: error instanceof SaleError && (status === 400 || [403,409].includes(status)&&rolledBackPolicy.includes(error.code)),
      error: error instanceof SaleError ? error.message : 'No se confirmó el resultado. Reintenta la misma intención de cobro.' });
  }
});

const returnHandler = (cancel: boolean) => async (req: AuthenticatedRequest, res: any) => {
  try { res.json(await refundSale(req.ctx as any, req.params.id, req.body, cancel)); }
  catch (error: any) { res.status(error instanceof SaleError ? error.statusCode : 503).json({ code: error.code || 'FINANCIAL_RESULT_UNKNOWN', error: error instanceof SaleError ? error.message : 'Resultado no confirmado; reintenta la misma devolución.' }); }
};
posRouter.post('/:id/cancelar', requireRole('DUENO', 'GERENTE'), returnHandler(true));
posRouter.post('/:id/devolver', requireRole('DUENO', 'GERENTE'), returnHandler(false));

// Get sales history with filters
posRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    let { sucursalId, barberoId, fechaInicio, fechaFin } = req.query as {
      sucursalId?: string;
      barberoId?: string;
      fechaInicio?: string;
      fechaFin?: string;
    };

    // C2: For BARBERO role, restrict sales strictly to their own barber record
    if (req.ctx!.rol === 'BARBERO') {
      const ownBarber = await prisma.barbero.findFirst({
        where: { sucursal: { tenantId }, id: req.ctx!.barberoId || '__unlinked__' }
      });
      barberoId = ownBarber ? ownBarber.id : 'unauthorized-barber-filter';
    }

    let dateQuery = {};
    if (fechaInicio && fechaFin) {
      dateQuery = {
        fecha: {
          gte: new Date(fechaInicio),
          lte: new Date(new Date(fechaFin).setHours(23, 59, 59))
        }
      };
    }

    const ventas = await prisma.venta.findMany({
      where: {
        tenantId,
        ...dateQuery,
        ...(sucursalId ? { sucursalId } : {}),
        ...(barberoId ? { barberoId } : {})
      },
      include: {
        items: true, devoluciones: true,
        barbero: true,
        sucursal: true,
        cliente: true,
        comisiones: true
      },
      orderBy: { fecha: 'desc' }
    });

    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial de ventas' });
  }
});

// Get ticket data for 58mm / 80mm thermal printing or WhatsApp digital ticket
posRouter.get('/:id/ticket', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const venta = await prisma.venta.findFirst({
      where: { id, tenantId },
      include: {
        items: true, devoluciones: true,
        barbero: true,
        sucursal: true,
        cliente: true,
        tenant: true
      }
    });

    if (!venta) return res.status(404).json({ code: 'NOT_FOUND', error: 'Venta no encontrada en su barbería' });

    const collectorName = await receiptCollectorName(prisma, tenantId, venta.cobradoPorId, venta.cobradoPorNombre);

    const lines = [
      `💈 *${venta.tenant.nombre.toUpperCase()}*`,
      `📍 ${venta.sucursal.nombre} - ${venta.sucursal.direccion || ''}`,
      `📞 Tel: ${venta.sucursal.telefono || venta.tenant.telefono || ''}`,
      `--------------------------------`,
      `Folio: ${venta.folio}`,
      `Fecha: ${new Date(venta.fecha).toLocaleString('es-MX', { timeZone: venta.sucursal.zonaHoraria })}`,
      `Atendido por: ${venta.barbero.nombre}`,
      `Cobrado por: ${collectorName}`,
      venta.cliente ? `Cliente: ${venta.cliente.nombre}` : '',
      `--------------------------------`,
      `DETALLE DE COMPRA:`
    ];

    venta.items.forEach(i => {
      lines.push(`${i.cantidad}x ${i.nombreItem} - $${Number(i.subtotal).toFixed(2)}`);
    });

    lines.push(`--------------------------------`);
    lines.push(`Subtotal: $${Number(venta.subtotal).toFixed(2)}`);
    if (Number(venta.descuento) > 0) lines.push(`Descuento: -$${Number(venta.descuento).toFixed(2)}`);
    if (Number(venta.propina) > 0) lines.push(`Propina: $${Number(venta.propina).toFixed(2)}`);
    if (Number(venta.impuesto) > 0) lines.push(`Impuesto incluido: $${Number(venta.impuesto).toFixed(2)}`);
    lines.push(`*TOTAL: $${Number(venta.total).toFixed(2)}*`);
    if (Number(venta.totalDevuelto) > 0) { lines.push(`Devuelto: $${Number(venta.totalDevuelto).toFixed(2)}`); lines.push(`Neto conservado: $${(Number(venta.total) - Number(venta.totalDevuelto)).toFixed(2)}`); }
    lines.push(`Método de Pago: ${venta.metodoPago}`);
    lines.push(`--------------------------------`);
    lines.push(`¡Gracias por su preferencia! Vuelva pronto.`);

    const whatsappText = lines.filter(Boolean).join('\n');
    const customerPhone = venta.cliente?.telefono ? `52${venta.cliente.telefono.replace(/[^0-9]/g, '')}` : '';

    res.json({
      venta: { ...venta, cobradoPorNombre: collectorName },
      whatsappText,
      whatsappUrl: customerPhone ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(whatsappText)}` : null,
      ticketHtmlUrl: `/api/ventas/${id}/ticket-html?width=58mm`
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar ticket' });
  }
});

// P2.2: Generates a scoped ephemeral print token for ticket printing (120s TTL)
posRouter.post('/:id/print-token', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const venta = await prisma.venta.findFirst({ where: { id, tenantId } });
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

    const printToken = generatePrintToken('VENTA', id, tenantId, req.ctx!.userId, req.ctx!.sessionVersion);
    res.json({ success: true, printToken });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar token de impresión' });
  }
});

// Standalone Printable Thermal Receipt (HTML formatted for 58mm and 80mm ESC/POS roll printers)
// P2.2: Accepts either Bearer authorization or scoped ephemeral printToken (120s TTL)
posRouter.get('/:id/ticket-html', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const tenantId = req.ctx!.tenantId;

    const widthParam = (req.query.width as string) === '80mm' ? '80mm' : '58mm';
    const autoprint = req.query.autoprint === 'true';

    const venta = await prisma.venta.findFirst({
      where: { id, tenantId },
      include: {
        items: true, devoluciones: true,
        barbero: true,
        sucursal: true,
        cliente: true,
        tenant: true
      }
    });

    if (!venta) {
      return res.status(404).send('<h1>Venta no encontrada</h1>');
    }

    const collectorName = await receiptCollectorName(prisma, tenantId, venta.cobradoPorId, venta.cobradoPorNombre);

    const is58mm = widthParam === '58mm';
    let payment:any={};try{payment=JSON.parse(venta.detallesPago||'{}');}catch{/* Historical tickets may have no structured payment. */}
    const paymentRows=[['Efectivo',payment.montoEfectivo],['Tarjeta',payment.montoTarjeta],['Recibido',payment.efectivoRecibido],['Cambio',payment.cambio]].filter(([,value])=>typeof value==='number'&&Number.isFinite(value)&&value>=0).map(([label,value])=>`<tr><td>${label}:</td><td class="text-right">$${Number(value).toFixed(2)}</td></tr>`).join('');
    const itemsHtml = venta.items.map(item => `
      <tr>
        <td style="text-align: left; padding: 2px 0;">${item.cantidad}x ${escapeHtml(item.nombreItem)}</td>
        <td style="text-align: right; padding: 2px 0; white-space: nowrap;">$${Number(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${escapeHtml(venta.folio)}</title>
  <style>
    @page {
      margin: 0;
      size: ${widthParam} auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${is58mm ? '11px' : '13px'};
      width: ${widthParam};
      max-width: ${widthParam};
      margin: 0 auto;
      padding: ${is58mm ? '8px 4px' : '12px 8px'};
      color: #000;
      background: #fff;
      overflow-wrap: anywhere;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 6px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: inherit;
      table-layout: fixed;
    }
    td:last-child, th:last-child { width: 43%; }
    td.text-right { white-space: nowrap; }
    .header-title {
      font-size: ${is58mm ? '14px' : '16px'};
      font-weight: bold;
      margin-bottom: 2px;
    }
    .barcode {
      font-family: monospace;
      letter-spacing: 3px;
      font-size: 14px;
      margin-top: 4px;
    }
    @media print {
      body { width: ${widthParam}; max-width: ${widthParam}; margin: 0; padding: 2mm; }
      .no-print { display: none !important; }
    }
    .print-bar {
      background: #f1f5f9;
      padding: 8px;
      margin-bottom: 12px;
      text-align: center;
      border-radius: 6px;
      display: flex; flex-wrap: wrap; justify-content: center; gap: 6px;
    }
    .btn {
      padding: 6px 12px;
      background: #0f172a;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin: 0 4px;
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn" onclick="window.print()">🖨️ Imprimir (${widthParam})</button>
    <span>Para cambiar ancho, vuelve al punto de venta.</span>
  </div>

  <div class="text-center">
    <div class="header-title">${escapeHtml(venta.tenant.nombre.toUpperCase())}</div>
    <div>${escapeHtml(venta.sucursal.nombre)}</div>
    ${venta.sucursal.direccion ? `<div>${escapeHtml(venta.sucursal.direccion)}</div>` : ''}
    ${venta.sucursal.telefono ? `<div>Tel: ${escapeHtml(venta.sucursal.telefono)}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div>
    <div><strong>Folio:</strong> ${escapeHtml(venta.folio)}</div>
    <div><strong>Fecha:</strong> ${new Date(venta.fecha).toLocaleString('es-MX',{timeZone:venta.sucursal.zonaHoraria})}</div>
    <div><strong>Atendido por:</strong> ${escapeHtml(venta.barbero.nombre)}</div>
    <div><strong>Cobrado por:</strong> ${escapeHtml(collectorName)}</div>
    ${venta.cliente ? `<div><strong>Cliente:</strong> ${escapeHtml(venta.cliente.nombre)}</div>` : ''}
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left; padding-bottom: 4px;">DESCRIPCIÓN</th>
        <th style="text-align: right; padding-bottom: 4px;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  ${Number(venta.totalDevuelto) > 0 ? `<div class="divider"></div><div>Devuelto: $${Number(venta.totalDevuelto).toFixed(2)}</div><div>Neto conservado: $${(Number(venta.total) - Number(venta.totalDevuelto)).toFixed(2)}</div>` : ''}

  <div class="divider"></div>

  <table>
    <tr>
      <td>Subtotal:</td>
      <td class="text-right">$${Number(venta.subtotal).toFixed(2)}</td>
    </tr>
    ${Number(venta.descuento) > 0 ? `
    <tr>
      <td>Descuento:</td>
      <td class="text-right">-$${Number(venta.descuento).toFixed(2)}</td>
    </tr>` : ''}
    ${Number(venta.propina) > 0 ? `
    <tr>
      <td>Propina:</td>
      <td class="text-right">$${Number(venta.propina).toFixed(2)}</td>
    </tr>` : ''}
    ${Number(venta.impuesto) > 0 ? `<tr><td>Impuesto incluido:</td><td class="text-right">$${Number(venta.impuesto).toFixed(2)}</td></tr>` : ''}
    <tr class="bold" style="font-size: ${is58mm ? '13px' : '15px'};">
      <td style="padding-top: 4px;">TOTAL:</td>
      <td class="text-right" style="padding-top: 4px;">$${Number(venta.total).toFixed(2)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <div><strong>Método de Pago:</strong> ${escapeHtml(venta.metodoPago)}</div>
  <table>${paymentRows}</table>

  <div class="divider"></div>

  <div class="text-center" style="margin-top: 8px;">
    <div style="font-size: 9px; margin-top: 2px;">${escapeHtml(venta.folio)}</div>
    <div>Comprobante de venta · No es CFDI</div>
    <div style="margin-top: 8px;">¡Gracias por su preferencia!</div>
    <div>Vuelva pronto</div>
  </div>

  ${autoprint ? `<script>window.onload = function() { window.print(); };</script>` : ''}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    res.send(html);
  } catch (error) {
    res.status(500).send('<h1>Error al generar ticket imprimible</h1>');
  }
});


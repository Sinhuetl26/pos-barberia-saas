// ==========================================
// SYSTECH STUDIO - POINT OF SALE (POS) ROUTES
// Fast checkout, authoritative pricing, kardex, commissions, tickets
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { createSaleSchema, validateBody } from '../validators/schemas';
import { calculateSaleTotals } from '../services/pricing.service';

export const posRouter = Router();

posRouter.use(requireAuth);

// Process Fast Sale (< 30 seconds)
posRouter.post('/', validateBody(createSaleSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const {
      sucursalId,
      barberoId,
      clienteId,
      citaId,
      metodoPago,
      detallesPago,
      descuento = 0,
      propina = 0,
      items = []
    } = req.body;

    const sucursal = await prisma.sucursal.findFirst({
      where: { id: sucursalId, tenantId }
    });
    if (!sucursal) {
      return res.status(400).json({ code: 'BAD_REQUEST', error: 'Sucursal no pertenece a su barbería' });
    }

    const barbero = await prisma.barbero.findFirst({
      where: { id: barberoId, sucursal: { tenantId } }
    });
    if (!barbero) {
      return res.status(404).json({ code: 'BARBER_NOT_FOUND', error: 'Barbero no encontrado o no pertenece a esta barbería' });
    }

    const comisionServPct = Number(barbero.comisionServiciosPct || 50);
    const comisionProdPct = Number(barbero.comisionProductosPct || 10);

    // Fetch product records strictly for this tenant
    const productIds = items.map((i: any) => i.productoId);
    const dbProducts = await prisma.producto.findMany({
      where: { id: { in: productIds }, tenantId }
    });
    const productMap = new Map(dbProducts.map(p => [p.id, p]));

    // Authoritative calculation using pricing service
    const calculation = calculateSaleTotals(
      productMap as any,
      items,
      Number(descuento) || 0,
      Number(propina) || 0,
      comisionServPct,
      comisionProdPct
    );

    const countVentas = await prisma.venta.count({
      where: { tenantId, sucursalId }
    });
    const serie = 'A';
    const folioConsecutivo = countVentas + 1;
    const folio = `${serie}-${String(folioConsecutivo).padStart(6, '0')}`;
    const lowStockAlerts: any[] = [];

    // Transaction execution
    const result = await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: {
          tenantId,
          sucursalId,
          barberoId,
          clienteId: clienteId || null,
          citaId: citaId || null,
          folio,
          serie,
          folioConsecutivo,
          estado: 'COMPLETADA',
          subtotal: calculation.subtotal,
          descuento: calculation.descuento,
          propina: calculation.propina,
          total: calculation.total,
          metodoPago,
          detallesPago: typeof detallesPago === 'object' ? JSON.stringify(detallesPago) : detallesPago,
          items: {
            create: calculation.preparedItems.map(p => ({
              productoId: p.productoId,
              nombreItem: p.nombreItem,
              tipoItem: p.tipoItem,
              cantidad: p.cantidad,
              precioUnitario: p.precioUnitario,
              subtotal: p.subtotal
            }))
          }
        },
        include: {
          items: true,
          barbero: true,
          sucursal: true,
          cliente: true
        }
      });

      // Stock deduction and Kardex
      for (const item of calculation.preparedItems) {
        if (item.tipoItem === 'PRODUCTO') {
          const currentProd = productMap.get(item.productoId);
          if (currentProd) {
            const stockAnterior = currentProd.stockActual;
            const stockNuevo = stockAnterior - item.cantidad;

            await tx.producto.update({
              where: { id: item.productoId },
              data: { stockActual: stockNuevo }
            });

            await tx.kardexMovimiento.create({
              data: {
                tenantId,
                sucursalId,
                productoId: item.productoId,
                tipoMovimiento: 'VENTA_POS',
                cantidad: -item.cantidad,
                stockAnterior,
                stockNuevo,
                motivo: `Venta ${folio}`
              }
            });

            if (stockNuevo <= currentProd.stockMinimo) {
              lowStockAlerts.push({
                nombre: currentProd.nombre,
                stockNuevo,
                stockMinimo: currentProd.stockMinimo
              });
            }
          }
        }
      }

      // Commission creation
      await tx.comision.create({
        data: {
          tenantId,
          ventaId: venta.id,
          barberoId,
          monto: calculation.totalComision,
          porcentaje: comisionServPct,
          pagada: false
        }
      });

      if (citaId) {
        await tx.cita.update({
          where: { id: citaId },
          data: { estado: 'COMPLETADA' }
        });
      }

      if (clienteId) {
        await tx.clienteFinal.update({
          where: { id: clienteId },
          data: {
            totalVisitas: { increment: 1 },
            fechaUltimaVisita: new Date()
          }
        });
      }

      if (clienteId) {
        await tx.clienteFinal.update({
          where: { id: clienteId },
          data: {
            gastoTotal: { increment: calculation.total },
            totalVisitas: { increment: 1 },
            fechaUltimaVisita: new Date()
          }
        });
      }

      return venta;
    });

    for (const alert of lowStockAlerts) {
      await prisma.notificacionLog.create({
        data: {
          tenantId,
          tipo: 'STOCK_MINIMO',
          canal: 'WHATSAPP',
          destinatario: 'Dueño',
          mensaje: `⚠️ Alerta de Inventario: "${alert.nombre}" tiene solo ${alert.stockNuevo} unidades restantes (Mínimo: ${alert.stockMinimo}).`,
          estado: 'ENVIADO'
        }
      }).catch(() => {});
    }

    res.json({
      success: true,
      venta: result,
      comisionGenerada: calculation.totalComision,
      lowStockAlerts
    });
  } catch (error: any) {
    console.error('Error al procesar venta:', error);
    res.status(500).json({ error: error.message || 'Error al procesar la venta en el POS' });
  }
});

// Cancel / Return Sale with stock, Kardex, and commission reversal
posRouter.post('/:id/cancelar', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const userEmail = req.ctx!.email;
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
      return res.status(400).json({ error: 'El motivo de cancelación es obligatorio' });
    }

    const venta = await prisma.venta.findFirst({
      where: { id, tenantId },
      include: { items: true, comisiones: true }
    });

    if (!venta) return res.status(404).json({ error: 'Venta no encontrada en su barbería' });
    if (venta.estado === 'CANCELADA') {
      return res.status(400).json({ error: 'Esta venta ya se encuentra cancelada' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update sale status
      await tx.venta.update({
        where: { id: venta.id },
        data: {
          estado: 'CANCELADA',
          motivoCancelacion: motivo,
          canceladoPor: userEmail
        }
      });

      // 2. Reverse stock & register Kardex return
      for (const item of venta.items) {
        if (item.tipoItem === 'PRODUCTO') {
          const prod = await tx.producto.findUnique({ where: { id: item.productoId } });
          if (prod) {
            const stockAnterior = prod.stockActual;
            const stockNuevo = stockAnterior + item.cantidad;

            await tx.producto.update({
              where: { id: prod.id },
              data: { stockActual: stockNuevo }
            });

            await tx.kardexMovimiento.create({
              data: {
                tenantId,
                sucursalId: venta.sucursalId,
                productoId: prod.id,
                tipoMovimiento: 'CANCELACION_VENTA',
                cantidad: item.cantidad,
                stockAnterior,
                stockNuevo,
                motivo: `Devolución por cancelación de venta ${venta.folio}: ${motivo}`,
                usuarioId: userEmail
              }
            });
          }
        }
      }

      // 3. Reverse commissions
      await tx.comision.deleteMany({
        where: { ventaId: venta.id }
      });

      // 4. Reverse customer spending if applicable
      if (venta.clienteId) {
        await tx.clienteFinal.update({
          where: { id: venta.clienteId },
          data: {
            gastoTotal: { decrement: venta.total }
          }
        });
      }

      // 5. Audit Log
      await tx.auditoriaLog.create({
        data: {
          tenantId,
          usuarioEmail: userEmail,
          accion: 'CANCELACION_VENTA',
          detalles: `Cancelación de venta ${venta.folio} ($${Number(venta.total).toFixed(2)} MXN). Motivo: ${motivo}`
        }
      });
    });

    res.json({
      success: true,
      message: `Venta ${venta.folio} cancelada exitosamente. Stock y comisiones revertidos.`,
      folio: venta.folio
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al cancelar la venta' });
  }
});

// Get sales history with filters
posRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId, barberoId, fechaInicio, fechaFin } = req.query as {
      sucursalId?: string;
      barberoId?: string;
      fechaInicio?: string;
      fechaFin?: string;
    };

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
        items: true,
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
        items: true,
        barbero: true,
        sucursal: true,
        cliente: true,
        tenant: true
      }
    });

    if (!venta) return res.status(404).json({ code: 'NOT_FOUND', error: 'Venta no encontrada en su barbería' });

    const lines = [
      `💈 *${venta.tenant.nombre.toUpperCase()}*`,
      `📍 ${venta.sucursal.nombre} - ${venta.sucursal.direccion || ''}`,
      `📞 Tel: ${venta.sucursal.telefono || venta.tenant.telefono || ''}`,
      `--------------------------------`,
      `Folio: ${venta.folio}`,
      `Fecha: ${new Date(venta.fecha).toLocaleString('es-MX')}`,
      `Atendido por: ${venta.barbero.nombre}`,
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
    lines.push(`*TOTAL: $${Number(venta.total).toFixed(2)}*`);
    lines.push(`Método de Pago: ${venta.metodoPago}`);
    lines.push(`--------------------------------`);
    lines.push(`¡Gracias por su preferencia! Vuelva pronto.`);

    const whatsappText = lines.filter(Boolean).join('\n');
    const customerPhone = venta.cliente?.telefono ? `52${venta.cliente.telefono.replace(/[^0-9]/g, '')}` : '';

    res.json({
      venta,
      whatsappText,
      whatsappUrl: customerPhone ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(whatsappText)}` : null,
      ticketHtmlUrl: `/api/ventas/${id}/ticket-html?width=58mm`
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar ticket' });
  }
});

// Standalone Printable Thermal Receipt (HTML formatted for 58mm and 80mm ESC/POS roll printers)
posRouter.get('/:id/ticket-html', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const widthParam = (req.query.width as string) === '80mm' ? '80mm' : '58mm';
    const autoprint = req.query.autoprint === 'true';

    const venta = await prisma.venta.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        barbero: true,
        sucursal: true,
        cliente: true,
        tenant: true
      }
    });

    if (!venta) {
      return res.status(404).send('<h1>Venta no encontrada</h1>');
    }

    const is58mm = widthParam === '58mm';
    const itemsHtml = venta.items.map(item => `
      <tr>
        <td style="text-align: left; padding: 2px 0;">${item.cantidad}x ${item.nombreItem}</td>
        <td style="text-align: right; padding: 2px 0; white-space: nowrap;">$${Number(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${venta.folio}</title>
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
    }
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
      body { width: 100%; margin: 0; padding: 2mm; }
      .no-print { display: none !important; }
    }
    .print-bar {
      background: #f1f5f9;
      padding: 8px;
      margin-bottom: 12px;
      text-align: center;
      border-radius: 6px;
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
    <a href="?width=58mm" class="btn" style="text-decoration:none;">58mm</a>
    <a href="?width=80mm" class="btn" style="text-decoration:none;">80mm</a>
  </div>

  <div class="text-center">
    <div class="header-title">${venta.tenant.nombre.toUpperCase()}</div>
    <div>${venta.sucursal.nombre}</div>
    ${venta.sucursal.direccion ? `<div>${venta.sucursal.direccion}</div>` : ''}
    ${venta.sucursal.telefono ? `<div>Tel: ${venta.sucursal.telefono}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div>
    <div><strong>Folio:</strong> ${venta.folio}</div>
    <div><strong>Fecha:</strong> ${new Date(venta.fecha).toLocaleString('es-MX')}</div>
    <div><strong>Atendido por:</strong> ${venta.barbero.nombre}</div>
    ${venta.cliente ? `<div><strong>Cliente:</strong> ${venta.cliente.nombre}</div>` : ''}
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
    <tr class="bold" style="font-size: ${is58mm ? '13px' : '15px'};">
      <td style="padding-top: 4px;">TOTAL:</td>
      <td class="text-right" style="padding-top: 4px;">$${Number(venta.total).toFixed(2)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <div><strong>Método de Pago:</strong> ${venta.metodoPago}</div>

  <div class="divider"></div>

  <div class="text-center" style="margin-top: 8px;">
    <div class="barcode">||| | |||| || ||| |</div>
    <div style="font-size: 9px; margin-top: 2px;">${venta.folio}</div>
    <div style="margin-top: 8px;">¡Gracias por su preferencia!</div>
    <div>Vuelva pronto</div>
  </div>

  ${autoprint ? `<script>window.onload = function() { window.print(); };</script>` : ''}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).send('<h1>Error al generar ticket imprimible</h1>');
  }
});


// ==========================================
// SYSTECH STUDIO - POINT OF SALE (POS) ROUTES
// Fast checkout, authoritative pricing, kardex, commissions, tickets
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { createSaleSchema, validateBody } from '../validators/schemas';
import { calculateSaleTotals } from '../services/pricing.service';
import { escapeHtml } from '../utils/security';

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
      montoEfectivo,
      montoTarjeta,
      efectivoRecibido,
      idempotencyKey,
      descuento = 0,
      propina = 0,
      items = []
    } = req.body;

    const effIdempotency = idempotencyKey || (req.headers['idempotency-key'] as string | undefined);
    if (effIdempotency) {
      const existingSale = await prisma.venta.findFirst({
        where: {
          tenantId,
          detallesPago: { contains: effIdempotency }
        },
        include: {
          items: true,
          barbero: true,
          sucursal: true,
          cliente: true
        }
      });
      if (existingSale) {
        return res.json({
          success: true,
          venta: existingSale,
          replayed: true,
          comisionGenerada: 0,
          lowStockAlerts: []
        });
      }
    }

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

    // P1.2 & P1.6 RBAC: If logged-in user is BARBERO, verify they only attribute sales to themselves (fail closed)
    if (req.ctx!.rol === 'BARBERO') {
      const userBarbero = await prisma.barbero.findFirst({
        where: {
          sucursal: { tenantId },
          OR: [
            { email: req.ctx!.email },
            { id: (req.ctx as any)?.barberoId || undefined }
          ]
        }
      });
      if (!userBarbero) {
        return res.status(403).json({
          code: 'BARBER_PROFILE_NOT_LINKED',
          error: 'Su cuenta con rol de Barbero no está vinculada a un perfil de barbero activo en esta barbería.'
        });
      }
      if (barberoId !== userBarbero.id) {
        return res.status(403).json({
          code: 'FORBIDDEN',
          error: 'Un barbero solo puede registrar ventas asignadas a sí mismo'
        });
      }
    }

    // C5 FIX: Validate clienteId belongs strictly to this tenant
    if (clienteId) {
      const validCliente = await prisma.clienteFinal.findFirst({
        where: { id: clienteId, tenantId }
      });
      if (!validCliente) {
        return res.status(404).json({ code: 'INVALID_CLIENTE', error: 'El cliente no pertenece a esta barbería' });
      }
    }

    // C5 & P1.8 FIX: Validate citaId belongs strictly to this tenant and check cancellation
    let validCita: any = null;
    if (citaId) {
      validCita = await prisma.cita.findFirst({
        where: { id: citaId, tenantId }
      });
      if (!validCita) {
        return res.status(404).json({ code: 'INVALID_CITA', error: 'La cita no pertenece a esta barbería' });
      }
      if (validCita.estado === 'CANCELADA') {
        return res.status(400).json({ code: 'CITA_CANCELLED', error: 'No se puede cobrar una cita cancelada' });
      }
    }

    const comisionServPct = Number(barbero.comisionServiciosPct || 50);
    const comisionProdPct = Number(barbero.comisionProductosPct || 10);

    // Fetch product records strictly for this tenant
    const productIds = items.map((i: any) => i.productoId);
    const dbProducts = await prisma.producto.findMany({
      where: { id: { in: productIds }, tenantId }
    });

    // P1.9: Branch safety validation on products
    for (const prod of dbProducts) {
      if (prod.sucursalId && prod.sucursalId !== sucursalId) {
        return res.status(400).json({
          code: 'INVALID_SUCURSAL_PRODUCT',
          error: `El producto "${prod.nombre}" no pertenece a la sucursal del cobro`
        });
      }
    }

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
    // P1.3 FIX: Enforce discount authority - Barbers cannot exceed 20% discount without Manager/Owner
    if (req.ctx!.rol === 'BARBERO' && calculation.subtotal > 0) {
      const discountPct = (calculation.descuento / calculation.subtotal) * 100;
      if (discountPct > 20.01) {
        return res.status(403).json({
          code: 'DISCOUNT_LIMIT_EXCEEDED',
          error: `Un barbero solo puede aplicar hasta 20% de descuento autónomo (${discountPct.toFixed(1)}% solicitado). Descuentos mayores requieren autorización de un Dueño o Gerente.`
        });
      }
    }

    // P0.3: Authoritative payment validation on server
    const total = calculation.total;
    let paymentDetailsRecord: any = {};
    const detallesObj = (typeof detallesPago === 'object' && detallesPago !== null) ? detallesPago : null;

    if (metodoPago === 'EFECTIVO') {
      const efectivoRecibidoNum = Number(
        efectivoRecibido ??
        detallesObj?.efectivoRecibido ??
        montoEfectivo ??
        total
      );
      if (efectivoRecibidoNum < total - 0.01) {
        return res.status(400).json({
          code: 'INSUFFICIENT_PAYMENT',
          error: `El efectivo recibido ($${efectivoRecibidoNum.toFixed(2)}) es menor al total a pagar ($${total.toFixed(2)})`
        });
      }
      const cambio = Math.max(0, Math.round((efectivoRecibidoNum - total) * 100) / 100);
      paymentDetailsRecord = {
        metodo: 'EFECTIVO',
        efectivoRecibido: efectivoRecibidoNum,
        montoEfectivo: total,
        cambio,
        total,
        idempotencyKey: effIdempotency || undefined
      };
    } else if (metodoPago === 'MIXTO') {
      const mEfectivo = Number(
        montoEfectivo ??
        detallesObj?.montoEfectivo ??
        0
      );
      const mTarjeta = Number(
        montoTarjeta ??
        detallesObj?.montoTarjeta ??
        0
      );

      if (mEfectivo < 0 || mTarjeta < 0) {
        return res.status(400).json({
          code: 'INVALID_PAYMENT',
          error: 'Los montos en pago mixto no pueden ser negativos'
        });
      }

      if (Math.abs((mEfectivo + mTarjeta) - total) > 0.05) {
        return res.status(400).json({
          code: 'PAYMENT_MISMATCH',
          error: `En pago mixto, la suma de efectivo ($${mEfectivo.toFixed(2)}) y tarjeta ($${mTarjeta.toFixed(2)}) debe coincidir exactamente con el total ($${total.toFixed(2)})`
        });
      }

      const efRecibido = Number(
        efectivoRecibido ??
        detallesObj?.efectivoRecibido ??
        mEfectivo
      );
      if (efRecibido < mEfectivo - 0.01) {
        return res.status(400).json({
          code: 'INSUFFICIENT_CASH_PART',
          error: `El efectivo recibido ($${efRecibido.toFixed(2)}) es menor a la porción en efectivo requerida ($${mEfectivo.toFixed(2)})`
        });
      }
      const cambio = Math.max(0, Math.round((efRecibido - mEfectivo) * 100) / 100);
      paymentDetailsRecord = {
        metodo: 'MIXTO',
        montoEfectivo: mEfectivo,
        montoTarjeta: mTarjeta,
        efectivoRecibido: efRecibido,
        cambio,
        total,
        idempotencyKey: effIdempotency || undefined
      };
    } else if (metodoPago === 'TARJETA') {
      paymentDetailsRecord = {
        metodo: 'TARJETA',
        total,
        idempotencyKey: effIdempotency || undefined
      };
    } else if (metodoPago === 'TRANSFERENCIA') {
      paymentDetailsRecord = {
        metodo: 'TRANSFERENCIA',
        total,
        idempotencyKey: effIdempotency || undefined
      };
    }

    const lowStockAlerts: any[] = [];

    // Transaction execution
    const result = await prisma.$transaction(async (tx) => {
      // A1 FIX: Calculate folio with atomic Secuencia upsert to guarantee collision-free consecutive folios
      const secuencia = await tx.secuencia.upsert({
        where: {
          tenantId_sucursalId_tipo: {
            tenantId,
            sucursalId,
            tipo: 'VENTA'
          }
        },
        update: {
          ultimoValor: { increment: 1 }
        },
        create: {
          tenantId,
          sucursalId,
          tipo: 'VENTA',
          ultimoValor: (await tx.venta.count({ where: { tenantId, sucursalId } })) + 1
        }
      });
      const serie = 'A';
      const folioConsecutivo = secuencia.ultimoValor;
      const folio = `${serie}-${String(folioConsecutivo).padStart(6, '0')}`;

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
          detallesPago: JSON.stringify(paymentDetailsRecord),
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

      // A2 FIX: Atomic Stock deduction with live check to prevent negative inventory
      for (const item of calculation.preparedItems) {
        if (item.tipoItem === 'PRODUCTO') {
          const liveProd = await tx.producto.findFirst({
            where: { id: item.productoId, tenantId }
          });
          if (!liveProd) {
            const err: any = new Error(`Producto ${item.nombreItem} no encontrado`);
            err.statusCode = 404;
            throw err;
          }

          // P2.1 FIX: Atomic conditional stock decrement (prevents race conditions and negative inventory)
          const updateResult = await tx.producto.updateMany({
            where: {
              id: item.productoId,
              tenantId,
              stockActual: { gte: item.cantidad }
            },
            data: {
              stockActual: { decrement: item.cantidad }
            }
          });

          if (updateResult.count === 0) {
            const err: any = new Error(`Stock insuficiente para "${liveProd.nombre}". Existencias actuales insuficientes para completar la venta en concurrencia.`);
            err.statusCode = 400;
            err.code = 'INSUFFICIENT_STOCK';
            throw err;
          }

          const stockAnterior = liveProd.stockActual;
          const stockNuevo = stockAnterior - item.cantidad;

          await tx.kardexMovimiento.create({
            data: {
              tenantId,
              sucursalId,
              productoId: liveProd.id,
              tipoMovimiento: 'VENTA_POS',
              cantidad: -item.cantidad,
              stockAnterior,
              stockNuevo,
              motivo: `Venta ${folio}`
            }
          });

          if (stockNuevo <= liveProd.stockMinimo) {
            lowStockAlerts.push({
              nombre: liveProd.nombre,
              stockNuevo,
              stockMinimo: liveProd.stockMinimo
            });
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

      // C5 FIX: Update appointment only if belonging to tenant
      if (citaId) {
        await tx.cita.updateMany({
          where: { id: citaId, tenantId },
          data: { estado: 'COMPLETADA' }
        });
      }

      // A3, C5 & P1.8 FIX: Update customer stats idempotently (do not double increment if cita was already COMPLETADA)
      if (clienteId) {
        const wasAlreadyCompleted = validCita && validCita.estado === 'COMPLETADA';
        await tx.clienteFinal.updateMany({
          where: { id: clienteId, tenantId },
          data: {
            gastoTotal: { increment: calculation.total },
            ...(wasAlreadyCompleted ? {} : { totalVisitas: { increment: 1 } }),
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
    const status = error.statusCode || 500;
    const code = error.code || (status === 400 ? 'BAD_REQUEST' : 'SERVER_ERROR');
    res.status(status).json({
      code,
      error: error.message || 'Error al procesar la venta en el POS'
    });
  }
});

// Cancel / Return Sale with stock, Kardex, and commission reversal
// C2 FIX: Require DUENO or GERENTE; A4 FIX: Block cancellation if commissions are paid
posRouter.post('/:id/cancelar', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
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

    // A4 FIX: Block cancellation if commission is already paid/liquidated
    const comisionPagada = venta.comisiones?.some(c => c.pagada);
    if (comisionPagada) {
      return res.status(400).json({
        code: 'COMMISSION_ALREADY_PAID',
        error: 'No se puede cancelar una venta cuya comisión ya fue liquidada a nómina.'
      });
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

      // 4. Reverse customer spending and visits if applicable (A4)
      if (venta.clienteId) {
        await tx.clienteFinal.update({
          where: { id: venta.clienteId },
          data: {
            gastoTotal: { decrement: venta.total },
            totalVisitas: { decrement: 1 }
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
    console.error('Error al cancelar venta:', error);
    res.status(500).json({ code: 'SERVER_ERROR', error: error.message || 'Error al cancelar la venta' });
  }
});

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
        where: { sucursal: { tenantId }, email: req.ctx!.email }
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
    <div class="header-title">${escapeHtml(venta.tenant.nombre.toUpperCase())}</div>
    <div>${escapeHtml(venta.sucursal.nombre)}</div>
    ${venta.sucursal.direccion ? `<div>${escapeHtml(venta.sucursal.direccion)}</div>` : ''}
    ${venta.sucursal.telefono ? `<div>Tel: ${escapeHtml(venta.sucursal.telefono)}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div>
    <div><strong>Folio:</strong> ${escapeHtml(venta.folio)}</div>
    <div><strong>Fecha:</strong> ${new Date(venta.fecha).toLocaleString('es-MX')}</div>
    <div><strong>Atendido por:</strong> ${escapeHtml(venta.barbero.nombre)}</div>
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

  <div><strong>Método de Pago:</strong> ${escapeHtml(venta.metodoPago)}</div>

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


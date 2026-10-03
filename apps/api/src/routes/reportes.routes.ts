// ==========================================
// SYSTECH STUDIO - REPORTES & ANALÍTICA ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { sanitizeCsvCell } from '../utils/security';

export const reportesRouter = Router();

// C2 FIX: Require DUENO or GERENTE for all financial and analytical reports
reportesRouter.use(requireAuth, requireRole('DUENO', 'GERENTE'));

reportesRouter.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { periodo = 'mes', sucursalId, barberoId } = req.query as {
      periodo?: string;
      sucursalId?: string;
      barberoId?: string;
    };

    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (periodo === 'hoy') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (periodo === 'semana') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (periodo === 'ano') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // A5 & P1.12 FIX: Filter out CANCELADA sales and apply barberoId filter uniformly across all cards
    const ventas = await prisma.venta.findMany({
      where: {
        tenantId,
        fecha: { gte: startDate },
        estado: { not: 'CANCELADA' },
        ...(sucursalId ? { sucursalId } : {}),
        ...(barberoId ? { barberoId } : {})
      },
      include: {
        items: true,
        barbero: true,
        comisiones: true
      }
    });

    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);
    const totalDescuentos = ventas.reduce((sum, v) => sum + Number(v.descuento), 0);
    const totalPropinas = ventas.reduce((sum, v) => sum + Number(v.propina), 0);
    const countVentas = ventas.length;
    const ticketPromedio = countVentas > 0 ? totalVentas / countVentas : 0;

    const metodosPago = {
      EFECTIVO: 0,
      TARJETA: 0,
      TRANSFERENCIA: 0,
      MIXTO: 0
    };
    ventas.forEach(v => {
      if ((metodosPago as any)[v.metodoPago] !== undefined) {
        (metodosPago as any)[v.metodoPago] += Number(v.total);
      }
    });

    const itemMap = new Map<string, { nombre: string; tipo: string; cantidad: number; total: number }>();
    ventas.forEach(v => {
      v.items.forEach(i => {
        const cur = itemMap.get(i.nombreItem) || { nombre: i.nombreItem, tipo: i.tipoItem, cantidad: 0, total: 0 };
        cur.cantidad += i.cantidad;
        cur.total += Number(i.subtotal);
        itemMap.set(i.nombreItem, cur);
      });
    });
    const topItems = Array.from(itemMap.values()).sort((a, b) => b.total - a.total).slice(0, 6);

    const barberoMap = new Map<string, { id: string; nombre: string; ventas: number; total: number; comisiones: number }>();
    ventas.forEach(v => {
      const b = v.barbero;
      const cur = barberoMap.get(b.id) || { id: b.id, nombre: b.nombre, ventas: 0, total: 0, comisiones: 0 };
      cur.ventas += 1;
      cur.total += Number(v.total);
      const comisionVenta = v.comisiones.reduce((s, c) => s + Number(c.monto), 0);
      cur.comisiones += comisionVenta;
      barberoMap.set(b.id, cur);
    });
    const barberosPerformance = Array.from(barberoMap.values()).sort((a, b) => b.total - a.total);

    const citas = await prisma.cita.findMany({
      where: {
        tenantId,
        fechaHora: { gte: startDate },
        ...(sucursalId ? { sucursalId } : {}),
        ...(barberoId ? { barberoId } : {})
      }
    });

    const totalCitas = citas.length;
    const completadas = citas.filter(c => c.estado === 'COMPLETADA').length;
    const noShows = citas.filter(c => c.estado === 'NO_SHOW').length;
    const canceladas = citas.filter(c => c.estado === 'CANCELADA').length;
    const noShowRate = totalCitas > 0 ? (noShows / totalCitas) * 100 : 0;

    const allComisiones = await prisma.comision.findMany({
      where: {
        tenantId,
        ...(barberoId ? { barberoId } : {})
      }
    });
    const comisionesPagadas = allComisiones.filter(c => c.pagada).reduce((s, c) => s + Number(c.monto), 0);
    const comisionesPendientes = allComisiones.filter(c => !c.pagada).reduce((s, c) => s + Number(c.monto), 0);

    res.json({
      periodo,
      totalVentas,
      totalDescuentos,
      totalPropinas,
      countVentas,
      ticketPromedio: Number(ticketPromedio.toFixed(2)),
      metodosPago,
      topItems,
      barberosPerformance,
      citas: {
        total: totalCitas,
        completadas,
        noShows,
        canceladas,
        noShowRate: Number(noShowRate.toFixed(1))
      },
      comisiones: {
        pagadas: comisionesPagadas,
        pendientes: comisionesPendientes
      }
    });
  } catch (error) {
    console.error('Error al generar dashboard:', error);
    res.status(500).json({ error: 'Error al generar reportes y analítica' });
  }
});

// Weekly Automated Summary for Barbershop Owner (WhatsApp / Email)
reportesRouter.post('/resumen-semanal', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const tenant = req.ctx!.tenant;

    const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const ventasSemana = await prisma.venta.findMany({
      where: {
        tenantId,
        fecha: { gte: hace7Dias },
        estado: { not: 'CANCELADA' }
      },
      include: { items: true, barbero: true }
    });

    const citasSemana = await prisma.cita.findMany({
      where: {
        tenantId,
        fechaHora: { gte: hace7Dias }
      }
    });

    const totalIngresos = ventasSemana.reduce((sum, v) => sum + Number(v.total), 0);
    const totalCitas = citasSemana.length;
    const citasCompletadas = citasSemana.filter(c => c.estado === 'COMPLETADA').length;
    const citasNoShow = citasSemana.filter(c => c.estado === 'NO_SHOW').length;
    const noShowPct = totalCitas > 0 ? ((citasNoShow / totalCitas) * 100).toFixed(1) : '0';

    // Top Barber
    const barberMap: Record<string, { nombre: string; total: number }> = {};
    ventasSemana.forEach(v => {
      barberMap[v.barberoId] = barberMap[v.barberoId] || { nombre: v.barbero.nombre, total: 0 };
      barberMap[v.barberoId].total += Number(v.total);
    });

    let topBarbero = 'Sin ventas registradas';
    let topBarberoMonto = 0;
    for (const b of Object.values(barberMap)) {
      if (b.total > topBarberoMonto) {
        topBarberoMonto = b.total;
        topBarbero = `${b.nombre} ($${b.total.toFixed(2)} MXN)`;
      }
    }

    const lineas = [
      `📊 *RESUMEN SEMANAL - ${tenant.nombre.toUpperCase()}*`,
      `Semana del ${hace7Dias.toLocaleDateString('es-MX')} al ${new Date().toLocaleDateString('es-MX')}`,
      `--------------------------------`,
      `💰 *Ingresos Totales:* $${totalIngresos.toFixed(2)} MXN`,
      `✂️ *Citas Atendidas:* ${citasCompletadas} de ${totalCitas}`,
      `⚠️ *Tasa de No-Show:* ${noShowPct}% (${citasNoShow} ausencias)`,
      `🏆 *Barbero Más Productivo:* ${topBarbero}`,
      `--------------------------------`,
      `_Generado automáticamente por SYSTECH Studio._`
    ];

    const resumenTexto = lineas.join('\n');
    const ownerPhone = tenant.telefono ? `52${tenant.telefono.replace(/[^0-9]/g, '')}` : '';

    const notif = await prisma.notificacionLog.create({
      data: {
        tenantId,
        tipo: 'RESUMEN_SEMANAL',
        canal: 'WHATSAPP',
        destinatario: tenant.telefono || 'Dueño',
        mensaje: resumenTexto,
        estado: 'ENVIADO'
      }
    });

    res.json({
      success: true,
      notificacionId: notif.id,
      resumen: {
        totalIngresos,
        totalCitas,
        citasCompletadas,
        citasNoShow,
        noShowPct,
        topBarbero
      },
      textoResumen: resumenTexto,
      whatsappLink: ownerPhone ? `https://wa.me/${ownerPhone}?text=${encodeURIComponent(resumenTexto)}` : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar resumen semanal' });
  }
});

// Export Sales CSV for Accounting / Excel
reportesRouter.get('/exportar/ventas-csv', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;

    const ventas = await prisma.venta.findMany({
      where: { tenantId },
      include: { barbero: true, sucursal: true, cliente: true },
      orderBy: { fecha: 'desc' },
      take: 500
    });

    const header = 'Folio,Fecha,Sucursal,Barbero,Cliente,Subtotal,Descuento,Propina,Total,MetodoPago,Estado\n';

    const rows = ventas.map(v => {
      const fecha = new Date(v.fecha).toISOString().split('T')[0];
      return [
        sanitizeCsvCell(v.folio),
        sanitizeCsvCell(fecha),
        sanitizeCsvCell(v.sucursal?.nombre || 'Sucursal Principal'),
        sanitizeCsvCell(v.barbero?.nombre || 'Barbero'),
        sanitizeCsvCell(v.cliente?.nombre || 'General'),
        Number(v.subtotal || 0).toFixed(2),
        Number(v.descuento || 0).toFixed(2),
        Number(v.propina || 0).toFixed(2),
        Number(v.total || 0).toFixed(2),
        sanitizeCsvCell(v.metodoPago),
        sanitizeCsvCell(v.estado)
      ].join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ventas_systech.csv"');
    // Prepend UTF-8 BOM (\uFEFF) so Excel respects accents and special characters without encoding corruption
    res.send('\uFEFF' + header + rows);
  } catch (error) {
    res.status(500).send('Error al exportar ventas');
  }
});


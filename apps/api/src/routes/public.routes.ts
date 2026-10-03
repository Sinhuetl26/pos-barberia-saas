// ======================================================================
// SYSTECH STUDIO - PUBLIC BOOKING PORTAL ROUTES (FASE 3 PRODUCT SUITE)
// Multi-service reservations, Buffer times, Secure token cancellation,
// "Cualquier barbero disponible", Waitlist auto-notification
// ======================================================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import {
  generateDayTimeSlots,
  generateBookingFolio,
  generateSecureCancellationKey,
  calculateMultiServiceTotals,
  canCancelAppointment,
  hasTimeConflict
} from '../services/booking.service';
import { escapeHtml } from '../utils/security';

export const publicRouter = Router();

// In-memory sliding rate limiter for public booking endpoints
const publicRateLimits = new Map<string, { count: number; resetAt: number }>();
function publicRateLimiter(limit: number = 60, windowMs: number = 60000) {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = publicRateLimits.get(ip) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count++;
    publicRateLimits.set(ip, entry);
    if (entry.count > limit) {
      return res.status(429).json({ error: 'Demasiadas consultas públicas. Intente más tarde.' });
    }
    next();
  };
}

publicRouter.use(publicRateLimiter(60, 60000));

// Get public barber shop profile and branch data by slug or id
publicRouter.get('/barberia/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ slug }, { id: slug }]
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        telefono: true,
        emailContacto: true,
        direccion: true,
        logoUrl: true,
        slogan: true,
        descripcion: true,
        portadaUrl: true,
        instagram: true,
        facebook: true,
        tiktok: true,
        whatsappPublico: true,
        plan: true,
        estado: true,
        sucursales: {
          where: { eliminadoEn: null },
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true,
            horarioApertura: true,
            horarioCierre: true,
            diasLaborales: true,
            barberos: {
              where: { activo: true, eliminadoEn: null, visibleEnWeb: true },
              select: {
                id: true,
                nombre: true,
                avatarUrl: true,
                especialidad: true,
                descripcion: true,
                visibleEnWeb: true,
                diasDescanso: true,
                horarioInicio: true,
                horarioFin: true
              }
            }
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Barbería no encontrada' });
    }

    if (tenant.estado === 'SUSPENDIDO') {
      return res.status(403).json({ error: 'Esta barbería no tiene servicio de reservas en línea activo en este momento.' });
    }

    const servicios = await prisma.producto.findMany({
      where: { tenantId: tenant.id, tipo: 'SERVICIO', activo: true, eliminadoEn: null },
      select: { id: true, nombre: true, categoria: true, duracionMinutos: true, precioVenta: true, sucursalId: true }
    });

    res.json({ tenant, servicios });
  } catch (error) {
    console.error('Error en /public/barberia:', error);
    res.status(500).json({ error: 'Error al consultar datos de barbería' });
  }
});

// Calculate free time slots for a given date, barber, and branch
publicRouter.get('/disponibilidad', async (req, res) => {
  try {
    const { sucursalId, barberoId, fecha, duracion = '30' } = req.query as {
      sucursalId: string;
      barberoId?: string;
      fecha: string;
      duracion?: string;
    };

    if (!sucursalId || !fecha) {
      return res.status(400).json({ error: 'Faltan parámetros sucursalId y fecha (YYYY-MM-DD)' });
    }

    const duracionMin = parseInt(duracion) || 30;
    const targetDate = new Date(fecha);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Fecha inválida' });
    }

    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const sucursal = await prisma.sucursal.findUnique({
      where: { id: sucursalId },
      include: { tenant: true }
    });
    if (!sucursal) return res.status(404).json({ error: 'Sucursal no encontrada' });
    if (sucursal.tenant.estado === 'SUSPENDIDO') {
      return res.status(403).json({ error: 'Servicio suspendido temporalmente' });
    }

    if (barberoId && barberoId !== 'cualquiera') {
      const barbero = await prisma.barbero.findFirst({
        where: { id: barberoId, sucursalId }
      });
      if (!barbero) {
        return res.status(404).json({ error: 'Barbero no encontrado en esta sucursal' });
      }
    }

    const citas = await prisma.cita.findMany({
      where: {
        sucursalId,
        ...(barberoId && barberoId !== 'cualquiera' ? { barberoId } : {}),
        fechaHora: { gte: startOfDay, lte: endOfDay },
        estado: { notIn: ['CANCELADA', 'NO_SHOW'] }
      },
      select: { fechaHora: true, duracionMinutos: true, bufferMinutos: true, estado: true }
    });

    const bloqueos = await prisma.bloqueoHorario.findMany({
      where: {
        sucursalId,
        ...(barberoId && barberoId !== 'cualquiera' ? { barberoId } : {}),
        fechaInicio: { lte: endOfDay },
        fechaFin: { gte: startOfDay }
      },
      select: { fechaInicio: true, fechaFin: true }
    });

    const slots = generateDayTimeSlots(
      targetDate,
      sucursal.horarioApertura,
      sucursal.horarioCierre,
      duracionMin,
      30,
      citas,
      bloqueos,
      10, // 10 min buffer
      30  // 30 min min advance
    );

    res.json({
      fecha,
      sucursal: sucursal.nombre,
      horarioApertura: sucursal.horarioApertura,
      horarioCierre: sucursal.horarioCierre,
      duracionSolicitada: duracionMin,
      slots
    });
  } catch (error) {
    console.error('Error en /public/disponibilidad:', error);
    res.status(500).json({ error: 'Error al calcular disponibilidad' });
  }
});

// Atomic Public Reservation (Multi-service, Any Barber option, Secure token)
publicRouter.post('/reservar', async (req, res) => {
  try {
    const {
      tenantId,
      sucursalId,
      barberoId,
      servicioId,
      servicioIds,
      fechaHora,
      duracionMinutos = 30,
      clienteNombre,
      clienteTelefono,
      clienteEmail,
      notas
    } = req.body;

    if (!tenantId || !sucursalId || !fechaHora || !clienteNombre || !clienteTelefono) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la cita.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.estado === 'SUSPENDIDO') {
      return res.status(400).json({ code: 'TENANT_UNAVAILABLE', error: 'Esta barbería no tiene reservas públicas activas.' });
    }

    const sucursal = await prisma.sucursal.findFirst({ where: { id: sucursalId, tenantId } });
    if (!sucursal) {
      return res.status(400).json({ code: 'INVALID_BRANCH', error: 'Sucursal no válida para esta barbería.' });
    }

    const slotStart = new Date(fechaHora);
    if (isNaN(slotStart.getTime()) || slotStart <= new Date()) {
      return res.status(400).json({ code: 'PAST_DATE', error: 'La fecha y hora de la cita debe ser futura.' });
    }

    // M4 & M5 FIX: Authoritative pricing and duration strictly from DB services
    const idsToSearch: string[] = Array.isArray(servicioIds) && servicioIds.length > 0
      ? servicioIds
      : (servicioId ? [servicioId] : []);

    let dbServices: any[] = [];
    if (idsToSearch.length > 0) {
      dbServices = await prisma.producto.findMany({
        where: { id: { in: idsToSearch }, tenantId, tipo: 'SERVICIO', eliminadoEn: null }
      });
    }

    if (dbServices.length === 0) {
      const defaultService = await prisma.producto.findFirst({
        where: { tenantId, tipo: 'SERVICIO', eliminadoEn: null }
      });
      if (defaultService) {
        dbServices = [defaultService];
      }
    }

    if (dbServices.length === 0) {
      return res.status(400).json({ code: 'SERVICE_REQUIRED', error: 'No se encontraron servicios válidos disponibles para reservar.' });
    }

    const calculated = calculateMultiServiceTotals(
      dbServices.map(s => ({
        id: s.id,
        nombre: s.nombre,
        duracionMinutos: s.duracionMinutos || 30,
        precioVenta: Number(s.precioVenta)
      }))
    );
    const finalDuracion = calculated.totalMinutos;
    const finalPrecio = calculated.totalPrecio;
    const finalNombreServicio = dbServices.map(s => s.nombre).join(' + ');
    const serviciosResumen = calculated.serviciosResumen;

    // A10 FIX: Validate branch opening and closing hours
    const openParts = (sucursal.horarioApertura || '09:00').split(':').map(Number);
    const closeParts = (sucursal.horarioCierre || '20:00').split(':').map(Number);
    const openMinutes = openParts[0] * 60 + (openParts[1] || 0);
    const closeMinutes = closeParts[0] * 60 + (closeParts[1] || 0);
    const slotMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
    const slotEndMinutes = slotMinutes + finalDuracion;

    if (slotMinutes < openMinutes || slotEndMinutes > closeMinutes) {
      return res.status(400).json({
        code: 'OUTSIDE_HOURS',
        error: `El horario seleccionado está fuera del horario de atención (${sucursal.horarioApertura} - ${sucursal.horarioCierre})`
      });
    }

    // Resolve Barber (A11 FIX: Support "cualquiera" by finding first available barber)
    let targetBarberoId = barberoId;
    const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const slotDayName = days[slotStart.getDay()];

    if (!targetBarberoId || targetBarberoId === 'cualquiera') {
      const activeBarbers = await prisma.barbero.findMany({
        where: { sucursalId, activo: true, eliminadoEn: null }
      });
      if (activeBarbers.length === 0) {
        return res.status(400).json({ code: 'NO_BARBERS', error: 'No hay barberos disponibles en esta sucursal.' });
      }

      let foundBarberId = null;
      for (const b of activeBarbers) {
        if (b.diasDescanso && b.diasDescanso.includes(slotDayName)) continue;

        const hasConflict = await prisma.cita.findFirst({
          where: {
            barberoId: b.id,
            estado: { notIn: ['CANCELADA', 'NO_SHOW'] },
            fechaHora: {
              gte: new Date(slotStart.getTime() - 240 * 60000),
              lte: new Date(slotStart.getTime() + (finalDuracion + 10) * 60000)
            }
          }
        });
        if (!hasConflict) {
          foundBarberId = b.id;
          break;
        }
      }

      targetBarberoId = foundBarberId || activeBarbers[0].id;
    } else {
      const barbero = await prisma.barbero.findFirst({ where: { id: targetBarberoId, sucursalId, activo: true } });
      if (!barbero) {
        return res.status(400).json({ code: 'INVALID_BARBER', error: 'El barbero seleccionado no está disponible en esta sucursal.' });
      }

      // A10 FIX: Validate barber rest day
      if (barbero.diasDescanso && barbero.diasDescanso.includes(slotDayName)) {
        return res.status(400).json({
          code: 'BARBER_REST_DAY',
          error: `El barbero ${barbero.nombre} no labora los días ${slotDayName}.`
        });
      }
    }

    // A10 FIX: Check for BloqueoHorario
    const hasBlock = await prisma.bloqueoHorario.findFirst({
      where: {
        sucursalId,
        barberoId: targetBarberoId,
        fechaInicio: { lte: new Date(slotStart.getTime() + finalDuracion * 60000) },
        fechaFin: { gte: slotStart }
      }
    });
    if (hasBlock) {
      return res.status(400).json({
        code: 'BARBER_BLOCKED',
        error: 'El barbero cuenta con un bloqueo de horario en ese intervalo.'
      });
    }

    const slotEnd = new Date(slotStart.getTime() + (finalDuracion + 10) * 60000); // slot + 10 min buffer
    const startOfWindow = new Date(slotStart.getTime() - 240 * 60000);

    const codigoReserva = generateBookingFolio();
    const tokenCancelacion = generateSecureCancellationKey();

    // Atomic transaction: locks & enforces concurrency race check
    const cita = await prisma.$transaction(async (tx) => {
      // 1. Collision check
      const existingCitas = await tx.cita.findMany({
        where: {
          sucursalId,
          barberoId: targetBarberoId,
          estado: { notIn: ['CANCELADA', 'NO_SHOW'] },
          fechaHora: { gte: startOfWindow, lte: slotEnd }
        }
      });

      const hasConflict = existingCitas.some(c => {
        const cStart = new Date(c.fechaHora);
        const cEnd = new Date(cStart.getTime() + (c.duracionMinutos + (c.bufferMinutos || 10)) * 60000);
        return slotStart < cEnd && slotEnd > cStart;
      });

      if (hasConflict) {
        const err: any = new Error('El horario seleccionado ya no está disponible con este barbero. Por favor elige otro horario.');
        err.code = 'SLOT_OCCUPIED';
        err.statusCode = 409;
        throw err;
      }

      // 2. Find or create ClienteFinal
      let cliente = await tx.clienteFinal.findFirst({
        where: { tenantId, telefono: clienteTelefono.trim() }
      });

      if (!cliente) {
        cliente = await tx.clienteFinal.create({
          data: {
            tenantId,
            nombre: clienteNombre.trim(),
            telefono: clienteTelefono.trim(),
            email: clienteEmail ? clienteEmail.trim() : null
          }
        });
      } else {
        cliente = await tx.clienteFinal.update({
          where: { id: cliente.id },
          data: {
            nombre: clienteNombre.trim(),
            email: clienteEmail ? clienteEmail.trim() : cliente.email
          }
        });
      }

      // 3. Create appointment
      return await tx.cita.create({
        data: {
          tenantId,
          sucursalId,
          barberoId: targetBarberoId,
          clienteId: cliente.id,
          servicioId: idsToSearch[0] || null,
          nombreServicio: finalNombreServicio,
          serviciosJson: serviciosResumen.length > 0 ? JSON.stringify(serviciosResumen) : null,
          fechaHora: slotStart,
          duracionMinutos: finalDuracion,
          bufferMinutos: 10,
          precioEstimado: finalPrecio,
          notas,
          codigoReserva,
          tokenCancelacion,
          estado: 'PENDIENTE'
        },
        include: {
          barbero: { select: { nombre: true, telefono: true } },
          sucursal: { select: { nombre: true, direccion: true, telefono: true } },
          tenant: { select: { nombre: true, slug: true } }
        }
      });
    });

    const formattedDate = slotStart.toLocaleString('es-MX', {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const msg = `¡Hola ${clienteNombre}! Tu cita en ${cita.tenant.nombre} (${cita.sucursal.nombre}) está agendada para el ${formattedDate} con ${cita.barbero.nombre}. Servicio: ${finalNombreServicio}. Folio: ${codigoReserva}.`;

    await prisma.notificacionLog.create({
      data: {
        tenantId,
        tipo: 'CONFIRMACION_CITA',
        canal: 'WHATSAPP',
        destinatario: clienteTelefono,
        mensaje: msg,
        estado: 'ENVIADO'
      }
    }).catch(() => {});

    res.json({
      success: true,
      cita: {
        id: cita.id,
        codigoReserva,
        tokenCancelacion,
        fechaHora: cita.fechaHora,
        duracionMinutos: cita.duracionMinutos,
        nombreServicio: cita.nombreServicio,
        precioEstimado: cita.precioEstimado,
        barbero: cita.barbero.nombre,
        sucursal: cita.sucursal.nombre
      },
      codigoReserva,
      tokenCancelacion,
      enlaceGestion: `/b/${cita.tenant.slug || tenantId}/cita/${tokenCancelacion}`,
      whatsappMessage: msg,
      whatsappLink: `https://wa.me/52${clienteTelefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`
    });
  } catch (error: any) {
    if (error.code === 'SLOT_OCCUPIED' || error.statusCode === 409) {
      return res.status(409).json({ code: 'SLOT_OCCUPIED', error: error.message });
    }
    console.error('Error en /public/reservar:', error);
    res.status(500).json({ error: 'Error al registrar la cita' });
  }
});

// Check public appointment by reservation code (Sanitized public view - NO PII leak)
publicRouter.get('/cita/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { slug } = req.query;
    const cita = await prisma.cita.findFirst({
      where: {
        OR: [{ codigoReserva: codigo }, { tokenCancelacion: codigo }],
        ...(slug ? { tenant: { OR: [{ slug: String(slug) }, { id: String(slug) }] } } : {})
      },
      include: {
        cliente: { select: { nombre: true } },
        barbero: { select: { nombre: true } },
        sucursal: { select: { nombre: true, direccion: true, telefono: true } },
        tenant: { select: { nombre: true, telefono: true, slug: true } }
      }
    });

    if (!cita) {
      return res.status(404).json({ error: 'No se encontró ninguna cita con ese código' });
    }

    // C7 & P1.10 FIX: Never leak tokenCancelacion, private notes or full PII to public query
    const clienteName = cita.cliente?.nombre || 'Cliente';
    res.json({
      codigoReserva: cita.codigoReserva,
      fechaHora: cita.fechaHora,
      duracionMinutos: cita.duracionMinutos,
      nombreServicio: cita.nombreServicio,
      servicios: cita.serviciosJson ? JSON.parse(cita.serviciosJson) : [],
      precioEstimado: cita.precioEstimado,
      estado: cita.estado,
      cliente: { nombre: clienteName },
      barbero: { nombre: cita.barbero?.nombre || 'Barbero' },
      sucursal: {
        nombre: cita.sucursal?.nombre,
        direccion: cita.sucursal?.direccion,
        telefono: cita.sucursal?.telefono
      },
      barberia: {
        nombre: cita.tenant?.nombre,
        slug: cita.tenant?.slug
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar cita' });
  }
});

// Printable Appointment Voucher in Official Letter Size (8.5" x 11")
publicRouter.get('/cita/:codigo/imprimir-carta', async (req, res) => {
  try {
    const { codigo } = req.params;
    const cita = await prisma.cita.findFirst({
      where: {
        OR: [{ codigoReserva: codigo }, { tokenCancelacion: codigo }, { id: codigo }]
      },
      include: {
        cliente: true,
        barbero: true,
        sucursal: true,
        tenant: true
      }
    });

    if (!cita) {
      return res.status(404).send('<h1>No se encontró ninguna cita con ese código</h1>');
    }

    const servicios = cita.serviciosJson ? JSON.parse(cita.serviciosJson) : [
      { nombre: cita.nombreServicio || 'Servicio de Barbería', precio: Number(cita.precioEstimado) || 0, duracion: cita.duracionMinutos }
    ];

    const fechaObj = new Date(cita.fechaHora);
    const fechaFormateada = fechaObj.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const horaFormateada = fechaObj.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Cita - ${cita.codigoReserva || 'Cita'}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 18mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1c1917;
      background: #fafaf9;
      padding: 20px;
    }
    .sheet {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1c1917;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 800;
      color: #0c0a09;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }
    .brand-slogan {
      font-size: 13px;
      color: #78716c;
      margin-top: 4px;
    }
    .brand-contact {
      font-size: 12px;
      color: #57534e;
      margin-top: 6px;
      line-height: 1.4;
    }
    .folio-box {
      text-align: right;
      background: #f5f5f4;
      border: 1px solid #d6d3d1;
      border-radius: 8px;
      padding: 12px 18px;
    }
    .folio-label {
      font-size: 10px;
      font-weight: 700;
      color: #78716c;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .folio-code {
      font-family: monospace;
      font-size: 18px;
      font-weight: 800;
      color: #0c0a09;
      margin-top: 3px;
    }
    .doc-banner {
      background: #1c1917;
      color: #ffffff;
      text-align: center;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 25px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .info-card {
      background: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .info-title {
      font-size: 11px;
      font-weight: 700;
      color: #a8a29e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .info-value-big {
      font-size: 16px;
      font-weight: 700;
      color: #0c0a09;
      text-transform: capitalize;
    }
    .info-sub {
      font-size: 13px;
      color: #57534e;
      margin-top: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    th {
      background: #f5f5f4;
      color: #44403c;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      border-bottom: 2px solid #d6d3d1;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid #e7e5e4;
      font-size: 13px;
      color: #292524;
    }
    .col-right {
      text-align: right;
    }
    .total-row td {
      font-weight: 800;
      font-size: 16px;
      color: #0c0a09;
      border-top: 2px solid #1c1917;
      border-bottom: none;
      padding-top: 14px;
    }
    .policy-box {
      border: 1px dashed #a8a29e;
      border-radius: 8px;
      padding: 14px 18px;
      background: #fffbeb;
      margin-bottom: 30px;
    }
    .policy-title {
      font-size: 12px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .policy-desc {
      font-size: 12px;
      color: #78350f;
      line-height: 1.5;
    }
    .footer {
      border-top: 1px solid #e7e5e4;
      padding-top: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #a8a29e;
    }
    .print-bar {
      margin-bottom: 20px;
      text-align: center;
    }
    .btn-print {
      background: #1c1917;
      color: #ffffff;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    .btn-print:hover {
      background: #292524;
    }
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .sheet {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <div class="print-bar no-print">
    <button class="btn-print" onclick="window.print()">
      🖨️ Imprimir Comprobante Tamaño Carta (8.5" x 11")
    </button>
  </div>

  <div class="sheet">
    <div class="header">
      <div>
        <h1 class="brand-title">${escapeHtml(cita.tenant?.nombre || 'Barbería')}</h1>
        <div class="brand-slogan">${escapeHtml((cita.tenant as any)?.slogan || 'El arte del corte clásico y diseño de vanguardia')}</div>
        <div class="brand-contact">
          📍 ${escapeHtml(cita.sucursal?.nombre || 'Sucursal Principal')} — ${escapeHtml(cita.sucursal?.direccion || 'Centro')}<br>
          📞 Tel / WhatsApp: ${escapeHtml(cita.sucursal?.telefono || cita.tenant?.telefono || 'Disponible en recepción')}
        </div>
      </div>
      <div class="folio-box">
        <div class="folio-label">Folio de Reserva</div>
        <div class="folio-code">${escapeHtml(cita.codigoReserva || 'RES-000000')}</div>
        <div style="font-size: 10px; color: #15803d; font-weight: 700; margin-top: 4px;">● CONFIRMADA</div>
      </div>
    </div>

    <div class="doc-banner">
      Comprobante Oficial de Reserva de Cita
    </div>

    <div class="details-grid">
      <div class="info-card">
        <div class="info-title">📅 Fecha y Hora Programada</div>
        <div class="info-value-big">${escapeHtml(fechaFormateada)}</div>
        <div class="info-sub" style="font-size: 15px; font-weight: 700; color: #1c1917; margin-top: 4px;">⏰ ${escapeHtml(horaFormateada)} (${Number(cita.duracionMinutos)} minutos)</div>
      </div>

      <div class="info-card">
        <div class="info-title">👤 Cliente</div>
        <div class="info-value-big">${escapeHtml(cita.cliente?.nombre || 'Cliente')}</div>
        <div class="info-sub">Tel: ${cita.cliente?.telefono ? '••• ••• ' + escapeHtml(cita.cliente.telefono.slice(-4)) : 'Registrado'}</div>
      </div>

      <div class="info-card">
        <div class="info-title">✂️ Barbero Asignado</div>
        <div class="info-value-big">${escapeHtml(cita.barbero?.nombre || 'Barbero de Turno')}</div>
        <div class="info-sub">${escapeHtml((cita.barbero as any)?.especialidad || 'Especialista en Estilo y Barbería')}</div>
      </div>

      <div class="info-card">
        <div class="info-title">🏢 Ubicación y Sucursal</div>
        <div class="info-value-big">${escapeHtml(cita.sucursal?.nombre || 'Sucursal Principal')}</div>
        <div class="info-sub">${escapeHtml(cita.sucursal?.direccion || 'Consultar recepción')}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Servicio Solicitado</th>
          <th style="width: 120px;">Duración Estimada</th>
          <th class="col-right" style="width: 140px;">Precio Estimado</th>
        </tr>
      </thead>
      <tbody>
        ${servicios.map((s: any) => `
          <tr>
            <td style="font-weight: 600;">${escapeHtml(s.nombre || 'Servicio')}</td>
            <td>${Number(s.duracion || s.duracionMinutos || 30)} min</td>
            <td class="col-right font-mono" style="font-weight: 600;">$${Number(s.precio || s.precioVenta || 0).toFixed(2)} MXN</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="2">Total Estimado a Liquidar en Recepción</td>
          <td class="col-right">$${Number(cita.precioEstimado || 0).toFixed(2)} MXN</td>
        </tr>
      </tbody>
    </table>

    <div class="policy-box">
      <div class="policy-title">📌 Recomendaciones y Políticas de Servicio</div>
      <div class="policy-desc">
        • <strong>Tolerancia:</strong> Por respeto al tiempo de todos los clientes, te sugerimos llegar 10 minutos antes de tu cita.<br>
        • <strong>Cancelaciones y Cambios:</strong> Si necesitas cancelar o reagendar tu horario, cuentas con hasta 2 horas de anticipación ingresando con tu folio de reserva o avisando directamente por WhatsApp.<br>
        • <strong>Formas de Pago:</strong> Aceptamos efectivo, tarjetas de débito/crédito y transferencias al finalizar tu servicio en caja.
      </div>
    </div>

    <div class="footer">
      <div>Emitido por sistema SYSTECH Barber Studio · Folio: ${cita.codigoReserva}</div>
      <div>Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}</div>
    </div>
  </div>

  <script>
    // Auto-trigger print dialog if requested via ?autoprint=true
    if (new URLSearchParams(window.location.search).get('autoprint') === 'true') {
      window.onload = () => window.print();
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error al generar comprobante tamaño carta:', error);
    res.status(500).send('Error al generar comprobante tamaño carta');
  }
});

// Cancel appointment using secure token (enforces 2-hour policy and notifies waitlist)
publicRouter.post('/cita/token/:token/cancelar', async (req, res) => {
  try {
    const { token } = req.params;
    const cita = await prisma.cita.findUnique({
      where: { tokenCancelacion: token },
      include: { tenant: true, sucursal: true, barbero: true }
    });

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada con el token proporcionado' });
    }

    if (cita.estado === 'CANCELADA') {
      return res.status(400).json({ error: 'Esta cita ya se encuentra cancelada' });
    }
    if (cita.estado === 'COMPLETADA') {
      return res.status(400).json({ error: 'No se puede cancelar una cita completada' });
    }

    // Policy check: at least 2 hours in advance
    const policy = canCancelAppointment(cita.fechaHora, 2);
    if (!policy.allowed) {
      return res.status(400).json({
        code: 'CANCELLATION_POLICY_VIOLATION',
        error: policy.reason
      });
    }

    const updated = await prisma.cita.update({
      where: { id: cita.id },
      data: { estado: 'CANCELADA' }
    });

    // Waitlist Auto-Notification: Alert next customer waiting for this branch
    const siguienteEnEspera = await prisma.listaEspera.findFirst({
      where: {
        tenantId: cita.tenantId,
        sucursalId: cita.sucursalId,
        estado: 'ACTIVO'
      },
      orderBy: { fechaRegistro: 'asc' }
    });

    if (siguienteEnEspera) {
      await prisma.listaEspera.update({
        where: { id: siguienteEnEspera.id },
        data: { estado: 'NOTIFICADO' }
      });

      const avisoMsg = `¡Hola ${siguienteEnEspera.clienteNombre}! Se ha liberado un espacio en ${cita.tenant.nombre} (${cita.sucursal.nombre}) para el ${new Date(cita.fechaHora).toLocaleString('es-MX')}. Ingresa a reservar antes de que se ocupe.`;

      await prisma.notificacionLog.create({
        data: {
          tenantId: cita.tenantId,
          tipo: 'AVISO_LISTA_ESPERA',
          canal: 'WHATSAPP',
          destinatario: siguienteEnEspera.clienteTelefono,
          mensaje: avisoMsg,
          estado: 'ENVIADO'
        }
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Cita cancelada exitosamente.',
      codigoReserva: updated.codigoReserva,
      estado: 'CANCELADA',
      waitlistNotified: Boolean(siguienteEnEspera)
    });
  } catch (error) {
    console.error('Error al cancelar cita por token:', error);
    res.status(500).json({ error: 'Error al cancelar la cita' });
  }
});

// C7 FIX: Require cryptographic token for cancellation; disallow unauthorized short-code cancel
publicRouter.post('/cita/:codigo/cancelar', async (req, res) => {
  try {
    const { codigo } = req.params;
    const token = req.headers['x-cancel-token'] || req.body?.tokenCancelacion;

    if (!token) {
      return res.status(401).json({
        code: 'TOKEN_REQUIRED',
        error: 'Por seguridad, para cancelar una cita se requiere el token criptográfico enviado en su confirmación.'
      });
    }

    const cita = await prisma.cita.findFirst({
      where: { codigoReserva: codigo, tokenCancelacion: String(token) },
      include: { tenant: true, sucursal: true }
    });
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada o token inválido' });

    if (cita.estado === 'CANCELADA') {
      return res.status(400).json({ error: 'La cita ya se encuentra cancelada' });
    }
    if (cita.estado === 'COMPLETADA') {
      return res.status(400).json({ error: 'No se puede cancelar una cita ya completada' });
    }

    const policy = canCancelAppointment(cita.fechaHora, 2);
    if (!policy.allowed) {
      return res.status(400).json({ code: 'CANCELLATION_POLICY_VIOLATION', error: policy.reason });
    }

    const updated = await prisma.cita.update({
      where: { id: cita.id },
      data: { estado: 'CANCELADA' }
    });

    res.json({ message: 'Cita cancelada exitosamente', codigoReserva: updated.codigoReserva, estado: 'CANCELADA' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cancelar la cita' });
  }
});

// Join Waitlist (Lista de espera pública)
publicRouter.post('/lista-espera', async (req, res) => {
  try {
    const { tenantId, sucursalId, clienteNombre, clienteTelefono, fechaDeseada, barberoId, servicioId } = req.body;

    if (!tenantId || !sucursalId || !clienteNombre || !clienteTelefono || !fechaDeseada) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para unirse a la lista de espera' });
    }

    const entry = await prisma.listaEspera.create({
      data: {
        tenantId,
        sucursalId,
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        fechaDeseada: new Date(fechaDeseada),
        barberoId: barberoId || null,
        servicioId: servicioId || null,
        estado: 'ACTIVO'
      }
    });

    res.json({
      success: true,
      message: 'Te has unido a la lista de espera. Te notificaremos de inmediato por WhatsApp si se libera un espacio.',
      entry
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al unirse a la lista de espera' });
  }
});

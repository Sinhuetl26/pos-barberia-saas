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
              where: { activo: true, eliminadoEn: null },
              select: { id: true, nombre: true, avatarUrl: true, diasDescanso: true, horarioInicio: true, horarioFin: true }
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

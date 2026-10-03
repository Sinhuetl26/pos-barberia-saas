// ======================================================================
// SYSTECH STUDIO - INTERNAL CITAS & AGENDA ROUTES (FASE 3 PRODUCT SUITE)
// Appointment status transitions, No-shows tracking, Walk-in queue & Waitlist
// ======================================================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { generateBookingFolio, generateSecureCancellationKey } from '../services/booking.service';

export const citasRouter = Router();

citasRouter.use(requireAuth);

// Get internal appointments with filters
citasRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    let { fecha, sucursalId, barberoId, estado } = req.query as {
      fecha?: string;
      sucursalId?: string;
      barberoId?: string;
      estado?: string;
    };

    // C2: For BARBERO role, restrict appointments strictly to their own barber record
    if (req.ctx!.rol === 'BARBERO') {
      const ownBarber = await prisma.barbero.findFirst({
        where: { sucursal: { tenantId }, email: req.ctx!.email }
      });
      barberoId = ownBarber ? ownBarber.id : 'unauthorized-barber-filter';
    }

    let dateFilter = {};
    if (fecha) {
      const d = new Date(fecha);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      dateFilter = { fechaHora: { gte: start, lte: end } };
    }

    const citas = await prisma.cita.findMany({
      where: {
        tenantId,
        ...dateFilter,
        ...(sucursalId ? { sucursalId } : {}),
        ...(barberoId ? { barberoId } : {}),
        ...(estado ? { estado } : {})
      },
      include: {
        cliente: true,
        barbero: true,
        sucursal: true,
        venta: true
      },
      orderBy: { fechaHora: 'asc' }
    });

    res.json(citas);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

// Create internal appointment
citasRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const {
      sucursalId,
      barberoId,
      clienteNombre,
      clienteTelefono,
      clienteEmail,
      servicioId,
      nombreServicio,
      fechaHora,
      duracionMinutos = 30,
      notas,
      precioEstimado
    } = req.body;

    const sucursal = await prisma.sucursal.findFirst({ where: { id: sucursalId, tenantId } });
    if (!sucursal) return res.status(400).json({ code: 'BAD_REQUEST', error: 'Sucursal no válida para su barbería' });

    const barbero = await prisma.barbero.findFirst({ where: { id: barberoId, sucursal: { tenantId } } });
    if (!barbero) return res.status(400).json({ code: 'BAD_REQUEST', error: 'Barbero no válido para su barbería' });

    let cliente = await prisma.clienteFinal.findFirst({
      where: { tenantId, telefono: clienteTelefono }
    });

    if (!cliente) {
      cliente = await prisma.clienteFinal.create({
        data: {
          tenantId,
          nombre: clienteNombre,
          telefono: clienteTelefono,
          email: clienteEmail || null
        }
      });
    }

    const codigoReserva = generateBookingFolio();
    const tokenCancelacion = generateSecureCancellationKey();

    const cita = await prisma.cita.create({
      data: {
        tenantId,
        sucursalId,
        barberoId,
        clienteId: cliente.id,
        servicioId,
        nombreServicio,
        fechaHora: new Date(fechaHora),
        duracionMinutos: parseInt(duracionMinutos) || 30,
        bufferMinutos: 10,
        notas,
        precioEstimado: precioEstimado ? Number(precioEstimado) : 250,
        codigoReserva,
        tokenCancelacion,
        estado: 'CONFIRMADA'
      },
      include: {
        cliente: true,
        barbero: true,
        sucursal: true
      }
    });

    res.json(cita);
  } catch (error) {
    console.error('Error al crear cita interna:', error);
    res.status(500).json({ error: 'Error al crear cita interna' });
  }
});

// Update appointment status with No-Show tracking & visit accounting
citasRouter.put('/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const { estado } = req.body;

    const validStates = ['PENDIENTE', 'CONFIRMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA', 'NO_SHOW'];
    if (!validStates.includes(estado)) {
      return res.status(400).json({ code: 'INVALID_STATUS', error: `Estado inválido. Opciones: ${validStates.join(', ')}` });
    }

    const existingCita = await prisma.cita.findFirst({
      where: { id, tenantId },
      include: { cliente: true }
    });
    if (!existingCita) {
      return res.status(404).json({ code: 'NOT_FOUND', error: 'Cita no encontrada en su barbería' });
    }

    // A3 FIX: Idempotency check - only increment if status actually changed
    const shouldIncrementNoShow = estado === 'NO_SHOW' && existingCita.estado !== 'NO_SHOW' && Boolean(existingCita.clienteId);
    const shouldIncrementVisits = estado === 'COMPLETADA' && existingCita.estado !== 'COMPLETADA' && Boolean(existingCita.clienteId);

    const [cita] = await prisma.$transaction([
      prisma.cita.update({
        where: { id },
        data: { estado }
      }),
      // Track customer lifecycle metrics idempotently
      ...(shouldIncrementNoShow
        ? [
            prisma.clienteFinal.update({
              where: { id: existingCita.clienteId! },
              data: { noShows: { increment: 1 } }
            }),
            prisma.auditoriaLog.create({
              data: {
                tenantId,
                usuarioEmail: req.ctx?.email || 'admin@barberia.com',
                accion: 'CITA_NO_SHOW',
                detalles: `Cita #${existingCita.codigoReserva} marcada como NO-SHOW para cliente ${existingCita.cliente?.nombre}`
              }
            })
          ]
        : []),
      ...(shouldIncrementVisits
        ? [
            prisma.clienteFinal.update({
              where: { id: existingCita.clienteId! },
              data: {
                totalVisitas: { increment: 1 },
                fechaUltimaVisita: new Date()
              }
            })
          ]
        : [])
    ]);

    res.json(cita);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado de la cita' });
  }
});

// Walk-in Client Turn (Sin cita previa - cola rápida)
citasRouter.post('/walk-in', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId, barberoId, clienteNombre, clienteTelefono, servicioId } = req.body;

    if (!sucursalId || !clienteNombre) {
      return res.status(400).json({ error: 'Sucursal y nombre de cliente son requeridos para walk-in' });
    }

    // Resolve or create walk-in customer
    let cliente = await prisma.clienteFinal.findFirst({
      where: { tenantId, telefono: clienteTelefono || '5500000000' }
    });

    if (!cliente) {
      cliente = await prisma.clienteFinal.create({
        data: {
          tenantId,
          nombre: clienteNombre,
          telefono: clienteTelefono || '5500000000'
        }
      });
    }

    // Pick target barber or first active
    let targetBarberoId = barberoId;
    if (!targetBarberoId) {
      const b = await prisma.barbero.findFirst({ where: { sucursalId, activo: true } });
      targetBarberoId = b?.id;
    }

    if (!targetBarberoId) {
      return res.status(400).json({ error: 'No hay barberos disponibles para el turno' });
    }

    const folio = generateBookingFolio();
    const tokenCancelacion = generateSecureCancellationKey();

    const walkInCita = await prisma.cita.create({
      data: {
        tenantId,
        sucursalId,
        barberoId: targetBarberoId,
        clienteId: cliente.id,
        servicioId: servicioId || null,
        nombreServicio: 'Walk-in (Turno en sala)',
        fechaHora: new Date(),
        duracionMinutos: 30,
        bufferMinutos: 10,
        codigoReserva: folio,
        tokenCancelacion,
        estado: 'EN_CURSO',
        notas: 'Cliente en sala (Walk-in)'
      },
      include: {
        cliente: true,
        barbero: true
      }
    });

    res.json({
      success: true,
      mensaje: `Turno walk-in asignado con éxito a ${walkInCita.barbero.nombre}`,
      cita: walkInCita
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar turno walk-in' });
  }
});

// Get Waitlist Entries (Lista de Espera)
citasRouter.get('/lista-espera', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId } = req.query as { sucursalId?: string };

    const entries = await prisma.listaEspera.findMany({
      where: {
        tenantId,
        ...(sucursalId ? { sucursalId } : {})
      },
      include: { sucursal: true, barbero: true },
      orderBy: { fechaRegistro: 'desc' }
    });

    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar lista de espera' });
  }
});

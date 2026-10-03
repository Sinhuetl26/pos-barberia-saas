// ======================================================================
// SYSTECH STUDIO - CLIENTES & CRM ROUTES (FASE 3 PRODUCT SUITE)
// 360° Profile, Inactivity Reactivation, Recurring Memberships & ARCO
// ======================================================================

import { Router, Response } from 'express';
import { prisma } from '@systech/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { WhatsAppService } from '../services/whatsapp.service';

export const clientesRouter = Router();

clientesRouter.use(requireAuth);

// 1. List clients with search and ordering
clientesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { busqueda, orden = 'visitas' } = req.query as { busqueda?: string; orden?: string };

    const orderByMap: Record<string, any> = {
      visitas: { totalVisitas: 'desc' },
      gasto: { gastoTotal: 'desc' },
      reciente: { fechaUltimaVisita: 'desc' },
      nombre: { nombre: 'asc' }
    };

    const clientes = await prisma.clienteFinal.findMany({
      where: {
        tenantId,
        eliminadoEn: null,
        ...(busqueda
          ? {
              OR: [
                { nombre: { contains: busqueda } },
                { telefono: { contains: busqueda } },
                { email: { contains: busqueda } }
              ]
            }
          : {})
      },
      include: {
        membresias: { where: { activo: true } }
      },
      orderBy: orderByMap[orden] || { totalVisitas: 'desc' },
      take: 100
    });

    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar clientes' });
  }
});

// 2. Reactivation campaign: Inactive clients (> X days without visit)
clientesRouter.get('/reactivacion', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const tenant = req.ctx!.tenant;
    const dias = parseInt(req.query.diasInactividad as string) || 30;

    const cutoffDate = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    const inactivos = await prisma.clienteFinal.findMany({
      where: {
        tenantId,
        eliminadoEn: null,
        fechaUltimaVisita: { lte: cutoffDate },
        totalVisitas: { gte: 1 }
      },
      orderBy: { fechaUltimaVisita: 'asc' },
      take: 50
    });

    const conCampana = inactivos.map(c => {
      const diasSinVenir = c.fechaUltimaVisita
        ? Math.floor((Date.now() - new Date(c.fechaUltimaVisita).getTime()) / (1000 * 60 * 60 * 24))
        : dias;

      const mensaje = `¡Hola ${c.nombre}! Hace más de ${diasSinVenir} días que no nos visitas en ${tenant.nombre}. Te regalamos 10% de descuento en tu próximo corte o arreglo de barba reservando esta semana.`;
      const telLimpio = WhatsAppService.normalizarTelefono(c.telefono || '');
      const whatsappUrl = telLimpio.length >= 10
        ? `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje)}`
        : null;

      return {
        ...c,
        diasSinVenir,
        mensajeReactivacion: mensaje,
        whatsappUrl
      };
    });

    res.json({
      totalInactivos: conCampana.length,
      diasFiltro: dias,
      clientes: conCampana
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar clientes para reactivación' });
  }
});

// 3. Full 360-degree client profile
clientesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;

    const cliente = await prisma.clienteFinal.findFirst({
      where: { id, tenantId, eliminadoEn: null },
      include: {
        membresias: true,
        citas: {
          orderBy: { fechaHora: 'desc' },
          take: 10,
          include: { barbero: true, sucursal: true }
        },
        ventas: {
          where: { estado: { not: 'CANCELADA' } },
          orderBy: { fecha: 'desc' },
          take: 10,
          include: { items: true, barbero: true }
        },
        consentimientos: true
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Compute favorite barber
    const barberCounts: Record<string, { nombre: string; count: number }> = {};
    cliente.citas.forEach(c => {
      if (c.barbero) {
        barberCounts[c.barberoId] = barberCounts[c.barberoId] || { nombre: c.barbero.nombre, count: 0 };
        barberCounts[c.barberoId].count++;
      }
    });

    let barberoFavorito = null;
    let maxCount = 0;
    for (const b of Object.values(barberCounts)) {
      if (b.count > maxCount) {
        maxCount = b.count;
        barberoFavorito = b.nombre;
      }
    }

    res.json({
      cliente,
      barberoFavorito: barberoFavorito || 'Sin preferencia',
      visitasTotales: cliente.totalVisitas,
      gastoTotal: Number(cliente.gastoTotal),
      noShows: cliente.noShows
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar perfil del cliente' });
  }
});

// 4. Create new client
clientesRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { nombre, telefono, email, notas, notasEstilo, fechaNacimiento } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del cliente es obligatorio' });
    }

    const telNormalizado = telefono ? WhatsAppService.normalizarTelefono(telefono) : null;

    if (telNormalizado) {
      const existe = await prisma.clienteFinal.findFirst({
        where: { tenantId, telefono: { contains: telNormalizado.slice(-10) }, eliminadoEn: null }
      });
      if (existe) {
        return res.status(400).json({ error: 'Ya existe un cliente registrado con este teléfono' });
      }
    }

    const cliente = await prisma.clienteFinal.create({
      data: {
        tenantId,
        nombre: nombre.trim(),
        telefono: telNormalizado,
        email: email ? email.trim() : null,
        notas,
        notasEstilo,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null
      }
    });

    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar cliente' });
  }
});

// 5. Update client
clientesRouter.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const { nombre, telefono, email, notas, notasEstilo, fechaNacimiento } = req.body;

    const cliente = await prisma.clienteFinal.update({
      where: { id },
      data: {
        nombre: nombre ? nombre.trim() : undefined,
        telefono: telefono ? WhatsAppService.normalizarTelefono(telefono) : undefined,
        email: email ? email.trim() : undefined,
        notas,
        notasEstilo,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined
      }
    });

    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// 6. Assign Client Recurring Membership
clientesRouter.post('/:id/membresia', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id: clienteId } = req.params;
    const { nombrePlan = 'Club Elite 2 Cortes', cortes = 2, precio = 350, vigenciaDias = 30 } = req.body;

    const cliente = await prisma.clienteFinal.findFirst({
      where: { id: clienteId, tenantId }
    });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const fechaFin = new Date(Date.now() + vigenciaDias * 24 * 60 * 60 * 1000);

    const membresia = await prisma.clienteMembresia.create({
      data: {
        tenantId,
        clienteId,
        nombrePlan,
        cortesIncluidos: cortes,
        cortesRestantes: cortes,
        precioMensual: precio,
        fechaFin,
        activo: true
      }
    });

    await prisma.auditoriaLog.create({
      data: {
        tenantId,
        usuarioEmail: req.ctx?.email || 'admin@barberia.com',
        accion: 'MEMBRESIA_ASIGNADA',
        detalles: `Membresía ${nombrePlan} asignada a ${cliente.nombre}. Cortes: ${cortes}, Precio: $${precio} MXN`
      }
    });

    res.json({
      success: true,
      mensaje: `Membresía asignada exitosamente a ${cliente.nombre}`,
      membresia
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar membresía al cliente' });
  }
});

// 7. ARCO / LFPDPPP: Soft delete client data
clientesRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;

    await prisma.clienteFinal.update({
      where: { id },
      data: {
        eliminadoEn: new Date(),
        notas: '[DATOS ELIMINADOS POR DERECHO ARCO]',
        email: null
      }
    });

    res.json({ success: true, message: 'Datos del cliente eliminados conforme a derechos ARCO.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

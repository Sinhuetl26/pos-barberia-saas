// ======================================================================
// SYSTECH STUDIO - INTERNAL CITAS & AGENDA ROUTES (FASE 3 PRODUCT SUITE)
// Appointment status transitions, No-shows tracking, Walk-in queue & Waitlist
// ======================================================================

import { Router } from 'express';
import { createBooking, changeBookingStatus, rescheduleInternal } from '../services/booking-operations.service';
import { bookingDateBounds } from '../services/booking-time.service';
import { prisma } from '@systech/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { generateBookingFolio, generateSecureCancellationKey } from '../services/booking.service';
import { bookingReferenceSummary } from '../services/cut-reference.service';
import { listArrivals, joinArrivalQueue, operateArrival } from '../services/arrival-queue.service';
import { appointmentConflicts } from '../services/schedule-exceptions.service';

export const citasRouter = Router();

citasRouter.use(requireAuth);

const queueError=(res:any,error:any)=>res.status(error.statusCode||500).json({code:error.code||'QUEUE_FAILED',error:error.statusCode?error.message:'No se confirmó el resultado de la fila; conserva la intención y reintenta.'});
citasRouter.get('/fila',async(req:AuthenticatedRequest,res)=>{try{if(typeof req.query.sucursalId!=='string')return res.status(400).json({code:'INVALID_BRANCH',error:'Elige sucursal.'});res.json(await listArrivals(req.ctx!,req.query.sucursalId));}catch(error){queueError(res,error);}});
citasRouter.post('/fila',async(req:AuthenticatedRequest,res)=>{try{res.json(await joinArrivalQueue(req.ctx!,req.body));}catch(error){queueError(res,error);}});
for(const [path,operation]of Object.entries({asignar:'ASIGNAR',reasignar:'REASIGNAR',atender:'ATENDER',retirar:'RETIRAR'}))citasRouter.post(`/fila/:id/${path}`,async(req:AuthenticatedRequest,res)=>{try{res.json(await operateArrival(req.ctx!,req.params.id,req.body,operation as any));}catch(error){queueError(res,error);}});

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
        where: { sucursal: { tenantId }, id: req.ctx!.barberoId || '__unlinked__' }
      });
      barberoId = ownBarber ? ownBarber.id : 'unauthorized-barber-filter';
    }

    let dateFilter = {};
    if (fecha) {
      const branch=await prisma.sucursal.findFirst({where:{tenantId,...(sucursalId?{id:sucursalId}:{})}});
      if(!branch)return res.status(404).json({error:'Sucursal no disponible.'});
      dateFilter={fechaHora:bookingDateBounds(fecha,branch.zonaHoraria)};
    }

    const citas: any[] = await prisma.cita.findMany({
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
        venta: true,
        referencia: { select: { citaId: true } }
      } as any,
      orderBy: { fechaHora: 'asc' }
    });

    res.json((await appointmentConflicts(prisma,citas)).map(bookingReferenceSummary));
  } catch (error:any) {
    res.status(error.statusCode||500).json({ error: error.statusCode?error.message:'Error al obtener citas' });
  }
});

// Reference photos require a live staff session and the same scoped appointment access as the agenda.
citasRouter.get('/:id/referencia', async (req: AuthenticatedRequest, res) => {
  try {
    const cita: any = await prisma.cita.findFirst({ where: { id: req.params.id, tenantId: req.ctx!.tenantId } });
    if (!cita) return res.status(404).json({ code: 'NOT_FOUND', error: 'Cita no disponible.' });
    const reference = await (prisma as any).citaReferencia.findFirst({ where: { citaId: cita.id, cita: { tenantId: req.ctx!.tenantId } } });
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.json({ tipoCorte: cita.tipoCorte ?? null, fotoReferencia: reference?.imagen ?? null });
  } catch { res.status(500).json({ error: 'No pudimos consultar la referencia de esta cita.' }); }
});

// Public and internal appointments share locking and schedule rules.
citasRouter.post('/',async(req:AuthenticatedRequest,res)=>{try{res.json(await createBooking(req.body,false,req.ctx));}catch(error:any){res.status(error.statusCode || 500).json({code:error.code || 'BOOKING_FAILED',error:error.statusCode?error.message:'No se pudo completar la operación de agenda.'});}});
citasRouter.put('/:id/status',async(req:AuthenticatedRequest,res)=>{try{res.json(await changeBookingStatus(req.ctx,req.params.id,req.body.estado));}catch(error:any){res.status(error.statusCode || 500).json({code:error.code || 'BOOKING_FAILED',error:error.statusCode?error.message:'No se pudo completar la operación de agenda.'});}});

// Walk-ins are assigned only to a currently free professional.
citasRouter.post('/walk-in',async(req:AuthenticatedRequest,res)=>{try{const cita:any=await createBooking(req.body,false,req.ctx,undefined,true);res.json({success:true,mensaje:'Turno asignado.',cita});}catch(error:any){res.status(error.statusCode || 500).json({code:error.code || 'BOOKING_FAILED',error:error.statusCode?error.message:'No se pudo completar la operación de agenda.'});}});

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

citasRouter.put('/:id/reprogramar',async(req:AuthenticatedRequest,res)=>{try{res.json(await rescheduleInternal(req.ctx,req.params.id,req.body));}catch(error:any){res.status(error.statusCode||500).json({code:error.code||'BOOKING_FAILED',error:error.statusCode?error.message:'No se pudo reprogramar la cita.'});}});

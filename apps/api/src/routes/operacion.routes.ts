import {onboardingProgress,scheduleSchema} from '../services/onboarding.service';
import {financialTransaction} from '../services/cash-ledger.service';
import { Router } from 'express';
import { prisma, Prisma } from '@systech/database';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { localDayBounds } from '../utils/timezone';
import { listOperationAudit } from '../services/operation-audit.service';
import { dataImportRouter } from './data-import.routes';
import { requirePlanCapability } from '../middleware/license';

export const operacionRouter = Router();
operacionRouter.use(requireAuth);
operacionRouter.use('/importacion', dataImportRouter);

operacionRouter.get('/auditoria', requireRole('DUENO'), requirePlanCapability('AUDIT_TRAIL', 'El historial detallado de operaciones'), async (req: AuthenticatedRequest, res, next) => {
  try { res.setHeader('Cache-Control', 'no-store'); res.json(await listOperationAudit(req.ctx!.tenantId, req.query)); }
  catch (error) { next(error); }
});

operacionRouter.get('/buscar', requireRole('DUENO', 'GERENTE', 'CAJERO', 'BARBERO'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const access = req.ctx!;
    const branchId = req.query.sucursalId;
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (typeof branchId !== 'string' || !branchId || query.length < 2 || query.length > 80)
      return res.status(400).json({ error:'Elige sucursal y escribe entre 2 y 80 caracteres.' });
    if (access.branchIds !== null && !access.branchIds.includes(branchId)) return res.status(403).json({error:'No tienes acceso a esa sucursal.'});
    const branch = await prisma.sucursal.findFirst({where:{id:branchId,tenantId:access.tenantId,eliminadoEn:null}});
    if (!branch) return res.status(404).json({error:'Sucursal no disponible.'});
    // Substring functions treat %, _ and backslash literally in both providers.
    // All identifiers below are static; the search and scopes are bound values.
    const literal = (column: Prisma.Sql) => /^postgres(?:ql)?:/.test(process.env.DATABASE_URL || '')
      ? Prisma.sql`STRPOS(lower(COALESCE(${column}, '')), lower(${query})) > 0`
      : Prisma.sql`INSTR(lower(COALESCE(${column}, '')), lower(${query})) > 0`;
    const barber = access.rol === 'BARBERO';
    if (barber && !access.barberoId) return res.status(403).json({error:'Tu cuenta necesita un perfil de barbero activo.'});
    const appointmentScope = {tenantId:access.tenantId,sucursalId:branchId,...(barber?{barberoId:access.barberoId!}:{})};
    const [clientIds, appointmentIds, productIds] = await Promise.all([
      barber ? Promise.resolve([]) : prisma.$queryRaw<{id:string}[]>(Prisma.sql`
        SELECT c."id" FROM "ClienteFinal" c WHERE c."tenantId"=${access.tenantId} AND c."eliminadoEn" IS NULL
        AND (c."sucursalOrigenId"=${branchId} OR EXISTS (SELECT 1 FROM "Cita" a WHERE a."clienteId"=c."id" AND a."tenantId"=${access.tenantId} AND a."sucursalId"=${branchId}))
        AND (${literal(Prisma.sql`c."nombre"`)} OR ${literal(Prisma.sql`c."telefono"`)}) ORDER BY c."nombre" LIMIT 8`),
      prisma.$queryRaw<{id:string}[]>(Prisma.sql`
        SELECT a."id" FROM "Cita" a INNER JOIN "ClienteFinal" c ON c."id"=a."clienteId" AND c."tenantId"=${access.tenantId}
        WHERE a."tenantId"=${access.tenantId} AND a."sucursalId"=${branchId}
        ${barber ? Prisma.sql`AND a."barberoId"=${access.barberoId}` : Prisma.empty}
        AND (${literal(Prisma.sql`a."nombreServicio"`)} OR ${literal(Prisma.sql`a."codigoReserva"`)} OR ${literal(Prisma.sql`c."nombre"`)})
        ORDER BY a."fechaHora" DESC LIMIT 8`),
      prisma.$queryRaw<{id:string}[]>(Prisma.sql`
        SELECT p."id" FROM "Producto" p WHERE p."tenantId"=${access.tenantId} AND p."activo"=TRUE AND p."eliminadoEn" IS NULL
        AND (p."sucursalId"=${branchId} OR p."sucursalId" IS NULL)
        ${['BARBERO','CAJERO'].includes(access.rol) ? Prisma.sql`AND p."naturaleza"<>'INSUMO'` : Prisma.empty}
        AND (${literal(Prisma.sql`p."nombre"`)} OR ${literal(Prisma.sql`p."sku"`)}) ORDER BY p."nombre" LIMIT 8`)
    ]);
    const [clients, appointments, products] = await Promise.all([
      barber ? Promise.resolve([]) : prisma.clienteFinal.findMany({where:{tenantId:access.tenantId,eliminadoEn:null,
        id:{in:clientIds.map(row=>row.id)},OR:[{sucursalOrigenId:branchId},{citas:{some:{tenantId:access.tenantId,sucursalId:branchId}}}]},
        select:{id:true,nombre:true,telefono:true},orderBy:{nombre:'asc'},take:8}),
      prisma.cita.findMany({where:{...appointmentScope,id:{in:appointmentIds.map(row=>row.id)}},select:{id:true,fechaHora:true,nombreServicio:true,estado:true,
          cliente:{select:{nombre:true}}},orderBy:{fechaHora:'desc'},take:8}),
      prisma.producto.findMany({where:{tenantId:access.tenantId,activo:true,eliminadoEn:null,
        id:{in:productIds.map(row=>row.id)},OR:[{sucursalId:branchId},{sucursalId:null}],...(['BARBERO','CAJERO'].includes(access.rol)?{naturaleza:{not:'INSUMO'}}:{})},
        select:{id:true,nombre:true,tipo:true,sku:true},orderBy:{nombre:'asc'},take:8})
    ]);
    res.setHeader('Cache-Control','no-store');
    res.json({clients,appointments,products,timeZone:branch.zonaHoraria});
  } catch (error) { next(error); }
});

// Financial summaries and onboarding retain their original manager-only gate.
operacionRouter.use(requireRole('DUENO', 'GERENTE'));

operacionRouter.get('/resumen', async (req: AuthenticatedRequest, res, next) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const sucursalId = req.query.sucursalId;
    if (typeof sucursalId !== 'string' || !sucursalId) {
      return res.status(400).json({ error: 'Selecciona una sucursal para consultar su operación.' });
    }
    const branch = await prisma.sucursal.findFirst({ where: { id: sucursalId, tenantId, eliminadoEn: null } });
    if (!branch) return res.status(404).json({ error: 'Sucursal no encontrada.' });
    const now = new Date();
    const day = localDayBounds(now, branch.zonaHoraria);
    const previous = localDayBounds(new Date(day.start.getTime() - 1), branch.zonaHoraria);
    const scope = { tenantId, sucursalId };
    const [sales, yesterday, appointments, products, inactiveClients, staff, openRegister] = await Promise.all([
      prisma.venta.aggregate({ where: { ...scope, estado: { not: 'CANCELADA' }, fecha: { gte: day.start, lt: day.end } }, _sum: { total: true, propina: true, totalDevuelto: true, propinaDevuelta: true }, _count: { _all: true } }),
      prisma.venta.aggregate({ where: { ...scope, estado: { not: 'CANCELADA' }, fecha: { gte: previous.start, lt: previous.end } }, _sum: { total: true, propina: true, totalDevuelto: true, propinaDevuelta: true } }),
      prisma.cita.findMany({ where: { ...scope, fechaHora: { gte: day.start, lt: day.end } }, select: { id: true, fechaHora: true, estado: true, nombreServicio: true, duracionMinutos: true, cliente: { select: { nombre: true } }, barbero: { select: { nombre: true } } }, orderBy: { fechaHora: 'asc' } }),
      prisma.producto.findMany({ where: { tenantId, OR: [{ sucursalId }, { sucursalId: null }], tipo: 'PRODUCTO', activo: true, eliminadoEn: null }, select: { id: true, nombre: true, stockActual: true, stockMinimo: true }, take: 1000 }),
      prisma.clienteFinal.count({ where: { tenantId, eliminadoEn: null, fechaUltimaVisita: { lt: new Date(now.getTime() - 45 * 86400000) }, citas: { some: { sucursalId, tenantId } } } }),
      prisma.barbero.count({ where: { sucursalId, activo: true, eliminadoEn: null } }),
      prisma.corteCaja.count({ where: { ...scope, estado: 'ABIERTO' } }),
    ]);
    const revenue = Number(sales._sum.total || 0) - Number(sales._sum.totalDevuelto || 0) - Number(sales._sum.propina || 0) + Number(sales._sum.propinaDevuelta || 0);
    const yesterdayRevenue = Number(yesterday._sum.total || 0) - Number(yesterday._sum.totalDevuelto || 0) - Number(yesterday._sum.propina || 0) + Number(yesterday._sum.propinaDevuelta || 0);
    const lowStock = products.filter(p => Number(p.stockActual) <= Number(p.stockMinimo));
    const upcoming = appointments.filter(a => ['PENDIENTE', 'CONFIRMADA'].includes(a.estado) && a.fechaHora >= now);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      generatedAt: now.toISOString(), localDate: day.label, timeZone: branch.zonaHoraria,
      branchName: branch.nombre,
      metrics: { revenue: Math.round(revenue * 100) / 100, tips: Number(sales._sum.propina || 0) - Number(sales._sum.propinaDevuelta || 0), sales: sales._count._all,
        averageTicket: sales._count._all ? Math.round(revenue / sales._count._all * 100) / 100 : 0,
        yesterdayRevenue, appointments: appointments.length, pending: appointments.filter(a => a.estado === 'PENDIENTE').length,
        noShows: appointments.filter(a => a.estado === 'NO_SHOW').length, completed: appointments.filter(a => a.estado === 'COMPLETADA').length,
        inactiveClients, activeBarbers: staff, openRegisters: openRegister, lowStock: lowStock.length },
      upcoming: upcoming.slice(0, 5), lowStockProducts: lowStock.slice(0, 4),
      hourlyRevenue: await hourlyRevenue(tenantId, sucursalId, day.start, day.end, branch.zonaHoraria),
    });
  } catch (err) { next(err); }
});

async function hourlyRevenue(tenantId: string, sucursalId: string, start: Date, end: Date, timeZone: string) {
  const sales = await prisma.venta.findMany({ where: { tenantId, sucursalId, estado: { not: 'CANCELADA' }, fecha: { gte: start, lt: end } }, select: { fecha: true, total: true, propina: true, totalDevuelto: true, propinaDevuelta: true } });
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, revenue: 0 }));
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' });
  for (const sale of sales) {
    const hour = Number(formatter.format(sale.fecha));
    hours[hour].revenue += Number(sale.total) - Number(sale.totalDevuelto) - Number(sale.propina) + Number(sale.propinaDevuelta);
  }
  return hours.map(h => ({ ...h, revenue: Math.round(h.revenue * 100) / 100 }));
}

operacionRouter.get('/preparacion',requireRole('DUENO'),async(req:AuthenticatedRequest,res,next)=>{try{if(typeof req.query.sucursalId!=='string')return res.status(400).json({error:'Selecciona sucursal.'});res.json(await onboardingProgress(req.ctx!.tenantId,req.query.sucursalId));}catch(e){next(e);}});
operacionRouter.put('/preparacion',requireRole('DUENO'),async(req:AuthenticatedRequest,res,next)=>{try{
 if(typeof req.body.sucursalId!=='string'||!req.body.sucursalId)return res.status(400).json({error:'Selecciona sucursal.'});
 const parsed=scheduleSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:parsed.error.issues[0].message});const data=parsed.data;
 await financialTransaction(async tx=>{const b=await tx.sucursal.findFirst({where:{id:req.body.sucursalId,tenantId:req.ctx!.tenantId,eliminadoEn:null}});if(!b)throw Object.assign(new Error('Sucursal no disponible.'),{status:404});await tx.sucursal.update({where:{id:b.id},data:{nombre:data.nombreSucursal,direccion:data.direccionSucursal,horarioApertura:data.horarioApertura,horarioCierre:data.horarioCierre,zonaHoraria:data.zonaHoraria,diasLaborales:data.diasLaborales,configuradaEn:new Date()}});});
 res.json(await onboardingProgress(req.ctx!.tenantId,req.body.sucursalId));
}catch(e){next(e);}});


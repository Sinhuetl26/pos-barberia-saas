// ======================================================================
// SYSTECH STUDIO - PUBLIC BOOKING PORTAL ROUTES (FASE 3 PRODUCT SUITE)
// Multi-service reservations, Buffer times, Secure token cancellation,
// "Cualquier barbero disponible", Waitlist registration
// ======================================================================

import { Router } from 'express';
import { bookingAvailability, createBooking, managePublicBooking, findPublicBookingIntent } from '../services/booking-operations.service';
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
import { tenantWithPersonalization } from '../services/booking-personalization.service';

export const publicRouter = Router();

// In-memory sliding rate limiter for public booking endpoints
const publicRateLimits = new Map<string, { count: number; resetAt: number }>();
function publicRateLimiter(limit: number = 60, windowMs: number = 60000) {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    for(const [key,value] of publicRateLimits)if(value.resetAt<=now)publicRateLimits.delete(key);
    if(!publicRateLimits.has(ip)&&publicRateLimits.size>=10000)return res.status(429).json({error:'Intenta más tarde.'});
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

publicRouter.use(publicRateLimiter(120, 60000));
publicRouter.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');next();});

// Get public barber shop profile and branch data by slug or id
publicRouter.get('/barberia/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant: any = await prisma.tenant.findFirst({
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
        personalizacionWeb: true,
        plan: true,
        estado: true,
        sucursales: {
          where: { eliminadoEn: null },
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true,
            zonaHoraria: true,
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
      } as any
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Barbería no encontrada' });
    }

    if (['SUSPENDIDO', 'CANCELADO'].includes(tenant.estado)) {
      return res.status(403).json({ error: 'Esta barbería no tiene servicio de reservas en línea activo en este momento.' });
    }

    const servicios = await prisma.producto.findMany({
      where: { tenantId: tenant.id, tipo: 'SERVICIO', activo: true, eliminadoEn: null, OR: [{ sucursalId: null }, { sucursal: { eliminadoEn: null } }] },
      select: { id: true, nombre: true, categoria: true, duracionMinutos: true, precioVenta: true, sucursalId: true }
    });

    res.json({ tenant: tenantWithPersonalization(tenant), servicios });
  } catch (error) {
    console.error('Error en /public/barberia:', error);
    res.status(500).json({ error: 'Error al consultar datos de barbería' });
  }
});

// Authoritative branch-zone availability and atomic reservations.
publicRouter.get('/disponibilidad',async(req,res)=>{try{res.json(await bookingAvailability(req.query));}catch(error:any){res.status(error.statusCode || 500).json({code:error.code || 'BOOKING_FAILED',error:error.statusCode?error.message:'No se pudo completar la operación de agenda.'});}});
publicRouter.post('/reservar',async(req,res)=>{try{res.json(await createBooking(req.body,true,undefined,req.ip||'unknown'));}catch(error:any){res.status(error.statusCode || 500).json({code:error.code || 'BOOKING_FAILED',error:error.statusCode?error.message:'No se pudo completar la operación de agenda.'});}});
publicRouter.post('/reserva-intencion',async(req,res)=>{try{res.json(await findPublicBookingIntent(req.body));}catch(error:any){res.status(error.statusCode || 500).json({code:error.code || 'BOOKING_FAILED',error:error.statusCode?error.message:'No se pudo consultar el resultado de la reserva.'});}});

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
        sucursal: { select: { nombre: true, direccion: true, telefono: true, zonaHoraria: true } },
        tenant: { select: { nombre: true, telefono: true, slug: true } }
      }
    });

    if (!cita) {
      return res.status(404).json({ error: 'No se encontró ninguna cita con ese código' });
    }

    // C7 & P1.10 FIX: Never leak tokenCancelacion, private notes or full PII to public query
    const clienteName = 'Cliente';
    res.json({
      codigoReserva: cita.codigoReserva,
      fechaHora: cita.fechaHora,
      zonaHoraria: cita.sucursal.zonaHoraria,
      sucursalId: cita.sucursalId,
      barberoId: cita.barberoId,
      gestionDisponible: ['PENDIENTE','CONFIRMADA'].includes(cita.estado) && (cita.tokenExpiraEn || new Date(cita.fechaHora.getTime()-7200000)).getTime()>Date.now(),
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
        OR: [{ codigoReserva: codigo }, { tokenCancelacion: codigo }],
        ...(req.query.slug ? { tenant: { slug: String(req.query.slug) } } : {})
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
      timeZone: cita.sucursal.zonaHoraria,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const horaFormateada = fechaObj.toLocaleTimeString('es-MX', {
      timeZone: cita.sucursal.zonaHoraria,
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
      Comprobante de Reserva de Cita
    </div>

    <div class="details-grid">
      <div class="info-card">
        <div class="info-title">📅 Fecha y Hora Programada</div>
        <div class="info-value-big">${escapeHtml(fechaFormateada)}</div>
        <div class="info-sub" style="font-size: 15px; font-weight: 700; color: #1c1917; margin-top: 4px;">⏰ ${escapeHtml(horaFormateada)} (${Number(cita.duracionMinutos)} minutos)</div>
      </div>

      <div class="info-card">
        <div class="info-title">👤 Cliente</div>
        <div class="info-value-big">Cliente</div>
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
        • <strong>Cancelaciones y Cambios:</strong> Si necesitas cancelar o reagendar tu horario, cuentas con hasta 2 horas de anticipación usando tu enlace privado de gestión o avisando directamente por WhatsApp.<br>
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

// The management capability expires two hours before the appointment.
publicRouter.post('/cita/token/:token/cancelar',async(req,res)=>{try{res.json(await managePublicBooking(req.params.token,req.body||{},'CANCELAR'));}catch(error:any){res.status(error.statusCode || 500).json({code:error.code || 'BOOKING_FAILED',error:error.statusCode?error.message:'No se pudo completar la operación de agenda.'});}});
publicRouter.post('/cita/token/:token/reprogramar',async(req,res)=>{try{res.json(await managePublicBooking(req.params.token,req.body||{},'REPROGRAMAR'));}catch(error:any){res.status(error.statusCode || 500).json({code:error.code || 'BOOKING_FAILED',error:error.statusCode?error.message:'No se pudo completar la operación de agenda.'});}});
publicRouter.post('/cita/:codigo/cancelar',async(req,res)=>{
try{const token=req.headers['x-cancel-token']||req.body?.tokenCancelacion;
if(!token)return res.status(401).json({code:'TOKEN_REQUIRED',error:'Utiliza el enlace privado de gestión.'});
if(!await prisma.cita.findFirst({where:{codigoReserva:req.params.codigo,tokenCancelacion:String(token)}}))return res.status(404).json({error:'Enlace no disponible.'});
res.json(await managePublicBooking(String(token),req.body||{},'CANCELAR'));}catch(error:any){res.status(error.statusCode || 500).json({code:error.code || 'BOOKING_FAILED',error:error.statusCode?error.message:'No se pudo completar la operación de agenda.'});}
});

// Join Waitlist (Lista de espera pública)
publicRouter.post('/lista-espera', async (req, res) => {
  try {
    const { tenantId, sucursalId, clienteNombre, clienteTelefono, fechaDeseada, barberoId, servicioId } = req.body;

    if (!tenantId || !sucursalId || !clienteNombre || !clienteTelefono || !fechaDeseada) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para unirse a la lista de espera' });
    }

    const branch = await prisma.sucursal.findFirst({ where: { id: sucursalId, tenantId, eliminadoEn: null, tenant: { estado: { in: ['ACTIVO', 'EN_RIESGO'] } } } });
    if (!branch) return res.status(404).json({ error: 'Sucursal no disponible.' });
    if (barberoId && !await prisma.barbero.findFirst({ where: { id: barberoId, sucursalId, activo: true, eliminadoEn: null, visibleEnWeb: true } })) return res.status(404).json({ error: 'Barbero no disponible.' });
    if (servicioId && !await prisma.producto.findFirst({ where: { id: servicioId, tenantId, tipo: 'SERVICIO', activo: true, eliminadoEn: null, OR: [{ sucursalId }, { sucursalId: null }] } })) return res.status(404).json({ error: 'Servicio no disponible.' });

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
      message: 'Te has unido a la lista de espera. Consulta con la barbería si se libera un espacio. Los avisos automáticos requieren un servicio conectado.',
      entry
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al unirse a la lista de espera' });
  }
});

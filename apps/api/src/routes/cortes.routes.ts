// ==========================================
// SYSTECH STUDIO - CORTES DE CAJA (ARQUEO CIEGO) ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole, AuthenticatedRequest, JWT_SECRET } from '../middleware/auth';
import { openCashShiftSchema, closeCashShiftSchema, validateBody } from '../validators/schemas';
import { calculateCashShiftSummary } from '../services/cash.service';
import { escapeHtml, generatePrintToken, verifyPrintToken } from '../utils/security';

export const cortesRouter = Router();

// Standalone Printable HTML Cash Drawer Shift Audit Receipt (Arqueo y Cierre de Caja)
// P2.2 FIX: Accepts either Bearer token OR scoped ephemeral printToken (120s expiry, single-purpose)
cortesRouter.get('/:id/comprobante-html', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    let tenantId: string | null = null;

    // 1. Check Bearer Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(authHeader.substring(7).trim(), JWT_SECRET) as any;
        tenantId = payload.tid;
      } catch (e) {}
    }

    // 2. Check Scoped Ephemeral Print Token (P2.2 FIX)
    const printToken = req.query.printToken as string | undefined;
    if (!tenantId && printToken) {
      const verified = verifyPrintToken(printToken, 'CORTE', id);
      if (verified.valid) {
        tenantId = verified.tenantId!;
      }
    }

    if (!tenantId) {
      return res.status(401).send('<h1>No autorizado: Se requiere token de impresión temporal o sesión activa.</h1>');
    }

    const corte = await prisma.corteCaja.findFirst({
      where: { id, tenantId },
      include: {
        sucursal: true,
        tenant: true,
        movimientos: true
      }
    });

    if (!corte) {
      return res.status(404).send('<h1>Corte de caja no encontrado</h1>');
    }

    const fondo = Number(corte.fondoInicial || 0);
    const efVentas = Number(corte.totalEfectivo || 0);
    const tjVentas = Number(corte.totalTarjeta || 0);
    const trVentas = Number(corte.totalTransferencia || 0);
    const propinas = Number(corte.totalPropinas || 0);
    const totalVentas = Number(corte.totalVentas || 0);
    const conteoReal = Number(corte.conteoEfectivoReal || 0);
    const descuadre = Number(corte.descuadre || 0);

    const ingresos = corte.movimientos.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + Number(m.monto), 0);
    const retiros = corte.movimientos.filter(m => m.tipo === 'RETIRO').reduce((s, m) => s + Number(m.monto), 0);
    const gastos = corte.movimientos.filter(m => m.tipo === 'GASTO_MENOR').reduce((s, m) => s + Number(m.monto), 0);
    const esperado = fondo + efVentas + ingresos - retiros - gastos;

    const estadoCuadre = Math.abs(descuadre) < 0.05
      ? '<span style="color: #15803d; font-weight: 700;">● CAJA CUADRADA ($0.00)</span>'
      : (descuadre < 0
          ? `<span style="color: #b91c1c; font-weight: 700;">▲ FALTANTE DE -$${Math.abs(descuadre).toFixed(2)} MXN</span>`
          : `<span style="color: #d97706; font-weight: 700;">▼ SOBRANTE DE +$${descuadre.toFixed(2)} MXN</span>`);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Arqueo y Corte de Caja</title>
  <style>
    @page { size: portrait; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1c1917; background: #fafaf9; padding: 20px; }
    .sheet { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.04); }
    .header { text-align: center; border-bottom: 2px solid #1c1917; padding-bottom: 16px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .sub { font-size: 13px; color: #57534e; margin-top: 4px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f5f5f4; font-size: 13px; }
    .row.bold { font-weight: 700; border-bottom: 2px solid #e7e5e4; }
    .row.highlight { background: #fafaf9; padding: 10px 8px; border-radius: 6px; font-weight: 800; font-size: 15px; }
    .section-title { font-size: 11px; font-weight: 800; color: #78716c; text-transform: uppercase; letter-spacing: 1px; margin: 18px 0 6px 0; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; text-align: center; font-size: 12px; }
    .sign-line { border-top: 1px solid #1c1917; padding-top: 8px; color: #44403c; font-weight: 600; }
    .print-btn { text-align: center; margin-bottom: 20px; }
    .btn { background: #1c1917; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 700; cursor: pointer; }
    @media print { body { padding: 0; background: #fff; } .sheet { border: none; box-shadow: none; padding: 0; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="print-btn no-print">
    <button class="btn" onclick="window.print()">🖨️ Imprimir Acta de Arqueo de Caja</button>
  </div>
  <div class="sheet">
    <div class="header">
      <div class="title">${escapeHtml(corte.tenant?.nombre || 'Barbería')}</div>
      <div class="sub">Acta Oficial de Arqueo y Cierre de Caja</div>
      <div style="font-size: 11px; color: #78716c; margin-top: 4px;">
        Sucursal: ${escapeHtml(corte.sucursal?.nombre || 'Principal')} | ID Turno: ${escapeHtml(corte.id.slice(0, 8))}
      </div>
    </div>

    <div class="section-title">Horarios del Turno</div>
    <div class="row"><span>Apertura:</span><span>${new Date(corte.fechaApertura).toLocaleString('es-MX')}</span></div>
    <div class="row"><span>Cierre:</span><span>${corte.fechaCierre ? new Date(corte.fechaCierre).toLocaleString('es-MX') : 'Abierto'}</span></div>

    <div class="section-title">Flujo y Ventas del Turno</div>
    <div class="row"><span>Fondo Inicial de Caja:</span><span class="font-mono">$${fondo.toFixed(2)}</span></div>
    <div class="row"><span>Ventas en Efectivo:</span><span class="font-mono">+$${efVentas.toFixed(2)}</span></div>
    <div class="row"><span>Ingresos Extra de Caja:</span><span class="font-mono">+$${ingresos.toFixed(2)}</span></div>
    <div class="row"><span>Retiros de Efectivo:</span><span class="font-mono">-$${retiros.toFixed(2)}</span></div>
    <div class="row"><span>Gastos Menores:</span><span class="font-mono">-$${gastos.toFixed(2)}</span></div>
    <div class="row bold"><span>Efectivo Teórico Esperado:</span><span class="font-mono">$${esperado.toFixed(2)} MXN</span></div>

    <div class="section-title">Otros Métodos de Cobro</div>
    <div class="row"><span>Cobros con Tarjeta:</span><span class="font-mono">$${tjVentas.toFixed(2)}</span></div>
    <div class="row"><span>Cobros por Transferencia:</span><span class="font-mono">$${trVentas.toFixed(2)}</span></div>
    <div class="row"><span>Propinas Registradas:</span><span class="font-mono">$${propinas.toFixed(2)}</span></div>
    <div class="row bold"><span>Total General Facturado:</span><span class="font-mono">$${totalVentas.toFixed(2)} MXN</span></div>

    <div class="section-title">Resultado del Arqueo Físico</div>
    <div class="row highlight"><span>Efectivo Contado Físico:</span><span class="font-mono">$${conteoReal.toFixed(2)} MXN</span></div>
    <div class="row highlight" style="margin-top: 6px;"><span>Dictamen de Caja:</span><span>${estadoCuadre}</span></div>

    ${corte.notas ? `
      <div class="section-title">Observaciones y Notas</div>
      <div style="font-size: 12px; color: #57534e; background: #f5f5f4; padding: 10px; border-radius: 6px; font-style: italic;">
        ${escapeHtml(corte.notas)}
      </div>
    ` : ''}

    <div class="signatures">
      <div>
        <div style="height: 45px;"></div>
        <div class="sign-line">Firma del Cajero / Operador</div>
      </div>
      <div>
        <div style="height: 45px;"></div>
        <div class="sign-line">Firma del Dueño / Gerente</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error al generar comprobante de arqueo:', error);
    res.status(500).send('Error al generar comprobante de arqueo');
  }
});

// Require Auth for all API management routes below
cortesRouter.use(requireAuth);

// P2.2 FIX: Generate scoped ephemeral print token (120s expiry)
cortesRouter.post('/:id/print-token', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { id } = req.params;
    const corte = await prisma.corteCaja.findFirst({ where: { id, tenantId } });
    if (!corte) return res.status(404).json({ error: 'Corte de caja no encontrado' });

    const printToken = generatePrintToken('CORTE', id, tenantId);
    res.json({ success: true, printToken });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar token de impresión' });
  }
});

// Get list of cash shifts
cortesRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId } = req.query as { sucursalId?: string };

    const cortes = await prisma.corteCaja.findMany({
      where: {
        tenantId,
        ...(sucursalId ? { sucursalId } : {})
      },
      include: { sucursal: true },
      orderBy: { fechaApertura: 'desc' }
    });

    res.json(cortes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cortes de caja' });
  }
});

// Open Cash Register Shift (Authorized cashier or owner)
cortesRouter.post('/abrir', requireRole('DUENO', 'GERENTE'), validateBody(openCashShiftSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { sucursalId, fondoInicial = 0, notas } = req.body;

    const sucursal = await prisma.sucursal.findFirst({
      where: { id: sucursalId, tenantId, eliminadoEn: null }
    });
    if (!sucursal) {
      return res.status(400).json({ code: 'BAD_REQUEST', error: 'Sucursal no encontrada en su barbería' });
    }

    const existingOpen = await prisma.corteCaja.findFirst({
      where: { tenantId, sucursalId, estado: 'ABIERTO' }
    });

    if (existingOpen) {
      return res.status(400).json({
        error: 'Ya existe una caja abierta para esta sucursal. Ciérrala antes de abrir una nueva.',
        corteAbierto: existingOpen
      });
    }

    const corte = await prisma.corteCaja.create({
      data: {
        tenantId,
        sucursalId,
        fondoInicial: Number(fondoInicial),
        estado: 'ABIERTO',
        notas
      }
    });

    res.json(corte);
  } catch (error) {
    res.status(500).json({ error: 'Error al abrir caja' });
  }
});

// Close Cash Register Shift (Blind Cash Count Reconciliation)
// C2 FIX: Require DUENO or GERENTE role to close cash shift
cortesRouter.post('/cerrar', requireRole('DUENO', 'GERENTE'), validateBody(closeCashShiftSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const { corteId, conteoEfectivoReal, notasCierre } = req.body;

    const corte = await prisma.corteCaja.findFirst({
      where: { id: corteId, tenantId }
    });

    if (!corte || corte.estado === 'CERRADO') {
      return res.status(400).json({ error: 'Caja no encontrada o ya cerrada' });
    }

    const fechaCierre = new Date();

    // A5 & P0.5 FIX: Filter out CANCELADA sales and bound strictly between fechaApertura and fechaCierre
    const ventas = await prisma.venta.findMany({
      where: {
        tenantId,
        sucursalId: corte.sucursalId,
        fecha: { gte: corte.fechaApertura, lte: fechaCierre },
        estado: { not: 'CANCELADA' }
      }
    });

    // P0.5 FIX: Fetch all movements associated with this cash drawer shift
    const movimientos = await prisma.movimientoCaja.findMany({
      where: {
        tenantId,
        sucursalId: corte.sucursalId,
        corteCajaId: corte.id
      }
    });

    // Pure reconciliation calculation with sales + movements
    const summary = calculateCashShiftSummary(
      Number(corte.fondoInicial),
      ventas as any,
      Number(conteoEfectivoReal),
      movimientos as any
    );

    const corteCerrado = await prisma.corteCaja.update({
      where: { id: corteId },
      data: {
        estado: 'CERRADO',
        fechaCierre,
        totalEfectivo: summary.totalEfectivo,
        totalTarjeta: summary.totalTarjeta,
        totalTransferencia: summary.totalTransferencia,
        totalPropinas: summary.totalPropinas,
        totalVentas: summary.totalVentas,
        conteoEfectivoReal: summary.conteoReal,
        descuadre: summary.descuadre,
        notas: [corte.notas, notasCierre].filter(Boolean).join(' | ')
      }
    });

    res.json({
      success: true,
      corte: corteCerrado,
      resumen: summary
    });
  } catch (error) {
    console.error('Error al cerrar caja:', error);
    res.status(500).json({ error: 'Error al cerrar caja' });
  }
});

// Cash drawer movement (gastos menores, retiros, entradas de efectivo)
cortesRouter.post('/movimiento', requireRole('DUENO', 'GERENTE'), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.ctx!.tenantId;
    const userEmail = req.ctx!.email;
    const { sucursalId, tipo, monto, concepto, corteCajaId } = req.body;

    if (!sucursalId || !tipo || monto === undefined || !concepto) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para registrar movimiento de caja' });
    }

    const sucursal = await prisma.sucursal.findFirst({
      where: { id: sucursalId, tenantId, eliminadoEn: null }
    });
    if (!sucursal) {
      return res.status(400).json({ error: 'Sucursal no encontrada en su barbería' });
    }

    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un número positivo mayor a 0' });
    }

    const normTipo = tipo === 'INGRESO_EXTRA' ? 'INGRESO' : tipo;
    if (!['INGRESO', 'RETIRO', 'GASTO_MENOR'].includes(normTipo)) {
      return res.status(400).json({ error: 'Tipo de movimiento inválido (INGRESO, RETIRO, GASTO_MENOR)' });
    }

    // Verify open cash shift exists for this branch
    const openCorte = corteCajaId
      ? await prisma.corteCaja.findFirst({ where: { id: corteCajaId, tenantId, sucursalId, estado: 'ABIERTO' } })
      : await prisma.corteCaja.findFirst({ where: { tenantId, sucursalId, estado: 'ABIERTO' } });

    if (!openCorte) {
      return res.status(400).json({ error: 'No existe un corte de caja abierto para esta sucursal. Debe abrir caja antes de registrar movimientos.' });
    }

    const mov = await prisma.movimientoCaja.create({
      data: {
        tenantId,
        sucursalId,
        corteCajaId: openCorte.id,
        tipo: normTipo,
        monto: montoNum,
        concepto: String(concepto).trim(),
        usuarioEmail: userEmail
      }
    });

    await prisma.auditoriaLog.create({
      data: {
        tenantId,
        usuarioEmail: userEmail,
        accion: `MOVIMIENTO_CAJA_${normTipo}`,
        detalles: `${normTipo}: $${montoNum.toFixed(2)} MXN - ${concepto}`
      }
    });

    res.json({ success: true, movimiento: mov });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar movimiento de caja' });
  }
});



import { requirePrintAuth } from '../middleware/printAuth';
// ==========================================
// SYSTECH STUDIO - CORTES DE CAJA (ARQUEO CIEGO) ROUTES
// ==========================================

import { Router } from 'express';
import { prisma } from '@systech/database';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole, AuthenticatedRequest, JWT_SECRET } from '../middleware/auth';
import { openCashShiftSchema, closeCashShiftSchema, validateBody } from '../validators/schemas';
import { branchLock, cashOperation, cashSummary, cents, digest, drawerBalance, financialTransaction, handoff, openShift, recordCash } from '../services/cash-ledger.service';
import { SaleError } from '../services/pos-sale.service';
import { moneyCents } from '../services/pricing.service';
import { calculateCashShiftSummary } from '../services/cash.service';
import { escapeHtml, generatePrintToken, verifyPrintToken } from '../utils/security';
import { makeClosePreview, verifyClosePreview } from '../services/cash-close-preview.service';

export const cortesRouter = Router();

// Standalone Printable HTML Cash Drawer Shift Audit Receipt (Arqueo y Cierre de Caja)
// P2.2 FIX: Accepts either Bearer token OR scoped ephemeral printToken (120s expiry, single-purpose)
cortesRouter.get('/:id/comprobante-html', requirePrintAuth('CORTE'), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const tenantId = req.ctx!.tenantId;

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
    if (corte.estado !== 'CERRADO') return res.status(409).send('Captura el conteo y cierra la caja antes de imprimir.');

    const fondo = Number(corte.fondoInicial || 0);
    const efVentas = Number(corte.totalEfectivo || 0);
    const tjVentas = Number(corte.totalTarjeta || 0);
    const trVentas = Number(corte.totalTransferencia || 0);
    const propinas = Number(corte.totalPropinas || 0);
    const totalVentas = Number(corte.totalVentas || 0);
    const conteoReal = Number(corte.conteoEfectivoReal || 0);
    const descuadre = Number(corte.descuadre || 0);

    const frozen = corte.resumenJson ? JSON.parse(corte.resumenJson) : null;
    const ingresos = frozen?.totalIngresos ?? corte.movimientos.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + Number(m.monto), 0);
    const retiros = frozen?.totalRetiros ?? corte.movimientos.filter(m => m.tipo === 'RETIRO').reduce((s, m) => s + Number(m.monto), 0);
    const gastos = frozen?.totalGastosMenores ?? corte.movimientos.filter(m => m.tipo === 'GASTO_MENOR').reduce((s, m) => s + Number(m.monto), 0);
    const esperado = frozen?.efectivoEsperado ?? fondo + efVentas + ingresos - retiros - gastos;

    const estadoCuadre = descuadre === 0
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
    <button class="btn" onclick="window.print()">🖨️ Imprimir cierre de caja</button>
  </div>
  <div class="sheet">
    <div class="header">
      <div class="title">${escapeHtml(corte.tenant?.nombre || 'Barbería')}</div>
      <div class="sub">Comprobante de cierre de caja</div>
      <div style="font-size: 11px; color: #78716c; margin-top: 4px;">
        Sucursal: ${escapeHtml(corte.sucursal?.nombre || 'Principal')} | ID Turno: ${escapeHtml(corte.id.slice(0, 8))}
      </div>
    </div>

    <div class="section-title">Horarios del Turno</div>
    <div class="row"><span>Apertura:</span><span>${new Date(corte.fechaApertura).toLocaleString('es-MX', { timeZone: corte.sucursal.zonaHoraria })}</span></div>
    <div class="row"><span>Cierre:</span><span>${corte.fechaCierre ? new Date(corte.fechaCierre).toLocaleString('es-MX', { timeZone: corte.sucursal.zonaHoraria }) : 'Abierto'}</span></div>
    <div class="sub">Hora local de la sucursal · ${escapeHtml(corte.sucursal.zonaHoraria)}</div>

    <div class="section-title">Flujo y Ventas del Turno</div>
    <div class="row"><span>Fondo Inicial de Caja:</span><span class="font-mono">$${fondo.toFixed(2)}</span></div>
    <div class="row"><span>Ventas netas por efectivo (incluye cobradores):</span><span class="font-mono">$${efVentas.toFixed(2)}</span></div>
    <div class="row"><span>Efectivo de ventas/reversos en caja:</span><span class="font-mono">$${Number(frozen?.efectivoCobradoEnCaja ?? efVentas).toFixed(2)}</span></div>
    <div class="row"><span>Entregas recibidas de cobradores:</span><span class="font-mono">$${Number(frozen?.totalEntregas || 0).toFixed(2)}</span></div>
    <div class="row"><span>Ingresos Extra de Caja:</span><span class="font-mono">+$${ingresos.toFixed(2)}</span></div>
    <div class="row"><span>Retiros de Efectivo:</span><span class="font-mono">-$${retiros.toFixed(2)}</span></div>
    <div class="row"><span>Gastos Menores:</span><span class="font-mono">-$${gastos.toFixed(2)}</span></div>
    <div class="row bold"><span>Efectivo Teórico Esperado:</span><span class="font-mono">$${esperado.toFixed(2)} MXN</span></div>

    <div class="section-title">Otros Métodos de Cobro</div>
    <div class="row"><span>Cobros con Tarjeta:</span><span class="font-mono">$${tjVentas.toFixed(2)}</span></div>
    <div class="row"><span>Cobros por Transferencia:</span><span class="font-mono">$${trVentas.toFixed(2)}</span></div>
    <div class="row"><span>Propinas Registradas:</span><span class="font-mono">$${propinas.toFixed(2)}</span></div>
    <div class="row bold"><span>Ventas netas del turno:</span><span class="font-mono">$${totalVentas.toFixed(2)} MXN</span></div>

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
        <div class="sign-line">Firma de quien cierra</div>
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
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
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

    if (corte.estado !== 'CERRADO') return res.status(409).json({ code: 'BLIND_COUNT_REQUIRED', error: 'Captura el conteo y cierra la caja antes de imprimir.' });
    const printToken = generatePrintToken('CORTE', id, tenantId, req.ctx!.userId, req.ctx!.sessionVersion);
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

    res.json(cortes.map(c => c.estado === 'ABIERTO' ? { id: c.id, tenantId: c.tenantId, sucursalId: c.sucursalId, sucursal: c.sucursal, usuarioId: c.usuarioId, fechaApertura: c.fechaApertura, fondoInicial: c.fondoInicial, notas: c.notas, estado: c.estado } : c));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cortes de caja' });
  }
});


function cashError(res: any, error: any) {
  return res.status(error instanceof SaleError ? error.statusCode : 503).json({ code: error instanceof SaleError ? error.code : 'FINANCIAL_RESULT_UNKNOWN', error: error instanceof SaleError ? error.message : 'Resultado no confirmado. Reintenta la misma operación.' });
}
cortesRouter.post('/abrir', requireRole('DUENO', 'GERENTE', 'CAJERO'), validateBody(openCashShiftSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await cashOperation(req.ctx as any, { ...req.body, operacion: 'APERTURA' }, async tx => {
      const existing = await openShift(tx, req.ctx as any, req.body.sucursalId);
      if (existing) throw new SaleError(409, 'CASH_ALREADY_OPEN', 'Ya hay una caja abierta en esta sucursal.');
      return tx.corteCaja.create({ data: { tenantId: req.ctx!.tenantId, sucursalId: req.body.sucursalId, usuarioId: req.ctx!.userId, fondoInicial: cents(req.body.fondoInicial) / 100, notas: req.body.notas } });
    }); res.json(result);
  } catch (error) { cashError(res, error); }
});
cortesRouter.post('/previsualizar',requireRole('DUENO','GERENTE','CAJERO'),validateBody(closeCashShiftSchema),async(req:AuthenticatedRequest,res)=>{
 try{const count=cents(req.body.conteoEfectivoReal),initial=await prisma.corteCaja.findFirst({where:{id:req.body.corteId,tenantId:req.ctx!.tenantId}});if(!initial)throw new SaleError(404,'CASH_NOT_FOUND','Caja no disponible.');const result=await financialTransaction(async tx=>{await branchLock(tx,req.ctx as any,initial.sucursalId);const cut=await tx.corteCaja.findFirstOrThrow({where:{id:initial.id,tenantId:req.ctx!.tenantId}});return makeClosePreview(tx,req.ctx!,cut,count,req.body.notasCierre||'');});res.json(result);}catch(error){cashError(res,error);}
});
cortesRouter.post('/cerrar', requireRole('DUENO', 'GERENTE', 'CAJERO'), validateBody(closeCashShiftSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const count = cents(req.body.conteoEfectivoReal);
    const initial = await prisma.corteCaja.findFirst({ where: { id: req.body.corteId, tenantId: req.ctx!.tenantId } });
    if (!initial) throw new SaleError(404, 'CASH_NOT_FOUND', 'Caja no disponible.');
    const hash = digest({ count, notes: req.body.notasCierre || '', actor: req.ctx!.userId });
    const result = await financialTransaction(async tx => {
      await branchLock(tx, req.ctx as any, initial.sucursalId);
      const cut = await tx.corteCaja.findFirstOrThrow({ where: { id: initial.id, tenantId: req.ctx!.tenantId } });
      if (cut.estado === 'CERRADO') {
        if (cut.cierreHash !== hash) throw new SaleError(409, 'CASH_CLOSED', 'Este turno ya se cerró con otro conteo.');
        return { success: true, corte: cut, resumen: JSON.parse(cut.resumenJson!), replayed: true };
      }
      // Legacy clients still close directly; current guided UI supplies a
      // signed comparison bound to the declared count and every ledger event.
      if(req.body.previsualizacionToken!==undefined&&req.body.previsualizacionToken!==null)await verifyClosePreview(tx,req.ctx!,cut,count,req.body.notasCierre||'',req.body.previsualizacionToken);
      const summary = await cashSummary(tx, req.ctx as any, cut, count);
      const closed = await tx.corteCaja.update({ where: { id: cut.id }, data: { estado: 'CERRADO', fechaCierre: new Date(), totalEfectivo: summary.totalEfectivo,
        totalTarjeta: summary.totalTarjeta, totalTransferencia: summary.totalTransferencia, totalVentas: summary.totalVentas, totalPropinas: summary.totalPropinas,
        conteoEfectivoReal: summary.conteoReal, descuadre: summary.descuadre, resumenJson: JSON.stringify(summary), cierreHash: hash, notas: [cut.notas, req.body.notasCierre].filter(Boolean).join(' | ') } });
      await tx.auditoriaLog.create({ data: { tenantId: req.ctx!.tenantId, usuarioEmail: req.ctx!.email, accion: 'CORTE_CAJA', detalles: JSON.stringify({ corteId: cut.id, sucursalId: cut.sucursalId, usuarioId: req.ctx!.userId, motivo: req.body.notasCierre || null, ...summary }) } });
      return { success: true, corte: closed, resumen: summary, replayed: false };
    }); res.json(result);
  } catch (error) { cashError(res, error); }
});
cortesRouter.post('/movimiento', requireRole('DUENO', 'GERENTE', 'CAJERO'), async (req: AuthenticatedRequest, res) => {
  try {
    const amount = cents(req.body.monto, true), type = req.body.tipo === 'INGRESO_EXTRA' ? 'INGRESO' : req.body.tipo;
    if (!['INGRESO', 'RETIRO', 'GASTO_MENOR'].includes(type) || typeof req.body.concepto !== 'string' || !req.body.concepto.trim() || req.body.concepto.length > 500) throw new SaleError(400, 'INVALID_MOVEMENT', 'Indica un tipo válido y el concepto del movimiento.');
    const result = await cashOperation(req.ctx as any, { ...req.body, operacion: 'MOVIMIENTO' }, async tx => {
      const cut = await openShift(tx, req.ctx as any, req.body.sucursalId, true);
      if (req.body.corteCajaId && req.body.corteCajaId !== cut.id) throw new SaleError(409, 'CASH_CHANGED', 'El turno de caja cambió. Revisa antes de registrar.');
      if (type !== 'INGRESO' && amount > await drawerBalance(tx, req.ctx as any, cut)) throw new SaleError(400, 'INSUFFICIENT_DRAWER', 'El movimiento excede el efectivo registrado en caja.');
      const movement = await tx.movimientoCaja.create({ data: { tenantId: req.ctx!.tenantId, sucursalId: cut.sucursalId, corteCajaId: cut.id, tipo: type, monto: amount / 100, concepto: req.body.concepto.trim(), usuarioEmail: req.ctx!.email } });
      await recordCash(tx, req.ctx as any, { sucursalId: cut.sucursalId, corteCajaId: cut.id, tipo: type, metodoPago: 'EFECTIVO', monto: (type === 'INGRESO' ? amount : -amount) / 100, concepto: movement.concepto });
      await tx.auditoriaLog.create({ data: { tenantId: req.ctx!.tenantId, usuarioEmail: req.ctx!.email, accion: 'MOVIMIENTO_CAJA_' + type, detalles: JSON.stringify({ movimientoId: movement.id, usuarioId: req.ctx!.userId, monto: amount / 100 }) } });
      return { success: true, movimiento: movement };
    }); res.json(result);
  } catch (error) { cashError(res, error); }
});
cortesRouter.get('/custodia', async (req: AuthenticatedRequest, res) => {
  try {
    const rows = await prisma.registroCaja.findMany({ where: { tenantId: req.ctx!.tenantId, ...(req.query.sucursalId ? { sucursalId: String(req.query.sucursalId) } : {}), metodoPago: 'EFECTIVO', custodiaUsuarioId: { not: null } }, orderBy: { fecha: 'desc' } });
    const holders = await prisma.usuario.findMany({ where: { tenantId: req.ctx!.tenantId, id: { in: [...new Set(rows.map(row => row.custodiaUsuarioId).filter((id): id is string => Boolean(id)))] } }, select: { id: true, nombre: true } });
    const names = new Map(holders.map(person => [person.id, person.nombre.trim()]));
    const groups = new Map<string, any>();
    for (const row of rows) {
      const key = row.sucursalId + ':' + row.custodiaUsuarioId;
      if (!groups.has(key)) groups.set(key, { usuarioId: row.custodiaUsuarioId, sucursalId: row.sucursalId, nombre: names.get(row.custodiaUsuarioId!) || rows.find(r => r.custodiaUsuarioId === row.custodiaUsuarioId && r.tipo === 'VENTA')?.usuarioNombre || 'Cobrador', saldoCentavos: 0 });
      groups.get(key).saldoCentavos += moneyCents(row.monto);
    }
    res.json({ saldos: [...groups.values()].map(g => ({ ...g, saldo: g.saldoCentavos / 100 })), movimientos: rows.slice(0, 50) });
  } catch (error) { cashError(res, error); }
});
cortesRouter.post('/entrega', requireRole('DUENO', 'GERENTE', 'CAJERO'), async (req: AuthenticatedRequest, res) => {
  try { res.json(await handoff(req.ctx as any, req.body)); } catch (error) { cashError(res, error); }
});

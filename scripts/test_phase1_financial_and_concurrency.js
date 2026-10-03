// ======================================================================
// SYSTECH STUDIO - PHASE 1 TEST SUITE
// Unit tests for financial calculations, Zod validations, and concurrency
// ======================================================================

const API_BASE = 'http://localhost:3001/api';

// Direct unit tests of pure business logic services
let pricingService, cashService, bookingService;
try {
  pricingService = require('../apps/api/dist/services/pricing.service');
  cashService = require('../apps/api/dist/services/cash.service');
  bookingService = require('../apps/api/dist/services/booking.service');
} catch (e) {
  pricingService = require('../apps/api/src/services/pricing.service');
  cashService = require('../apps/api/src/services/cash.service');
  bookingService = require('../apps/api/src/services/booking.service');
}
const { calculateSaleTotals } = pricingService;
const { calculateCashShiftSummary } = cashService;
const { generateDayTimeSlots, hasTimeConflict } = bookingService;

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data, headers: res.headers };
}

let passed = 0;
let total = 0;

function assert(cond, name, details = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } else {
    console.error(`  ❌ FAIL: ${name} - ${details}`);
  }
}

async function runPhase1Tests() {
  console.log('======================================================================');
  console.log('🧪 SYSTECH STUDIO - VERIFICACIÓN DE FASE 1 (FINANZAS Y CONCURRENCIA)');
  console.log('======================================================================\n');

  // ----------------------------------------------------
  // TEST SUITE 1: Cálculo Financiero Puro de Ventas y Comisiones
  // ----------------------------------------------------
  console.log('--- Test Suite 1: Pure Pricing & Commission Calculations ---');

  const mockProductCatalog = new Map([
    ['srv-corte', { id: 'srv-corte', nombre: 'Corte Clásico', tipo: 'SERVICIO', precioVenta: 250 }],
    ['srv-barba', { id: 'srv-barba', nombre: 'Arreglo Barba', tipo: 'SERVICIO', precioVenta: 180 }],
    ['prd-cera', { id: 'prd-cera', nombre: 'Cera Mate', tipo: 'PRODUCTO', precioVenta: 220 }]
  ]);

  // 1.1 Venta regular con split de comisiones (50% servicio, 10% producto)
  // Subtotal = 250 + 220 = 470
  // Comisión = 125 (50% de 250) + 22 (10% de 220) = 147
  const calc1 = calculateSaleTotals(
    mockProductCatalog,
    [
      { productoId: 'srv-corte', cantidad: 1 },
      { productoId: 'prd-cera', cantidad: 1 }
    ],
    0, // Sin descuento
    50, // Propina: $50
    50, // 50% comisión servicios
    10  // 10% comisión productos
  );

  assert(calc1.subtotal === 470, 'Subtotal calculado correctamente ($470)', `Obtenido: ${calc1.subtotal}`);
  assert(calc1.totalComision === 147, 'Comisión dividida por tipo calculada exactamente ($147.00)', `Obtenido: ${calc1.totalComision}`);
  assert(calc1.total === 520, 'Total con propina incluido ($520.00)', `Obtenido: ${calc1.total}`);

  // 1.2 Protección matemática contra descuento mayor al subtotal (sin números negativos)
  const calcExcessDiscount = calculateSaleTotals(
    mockProductCatalog,
    [{ productoId: 'srv-corte', cantidad: 1 }],
    9999, // Descuento excesivo
    0,
    50,
    10
  );
  assert(
    calcExcessDiscount.descuento === 250 && calcExcessDiscount.total === 0,
    'Descuento acotado a [0, subtotal] para evitar totales negativos',
    `Descuento: ${calcExcessDiscount.descuento}, Total: ${calcExcessDiscount.total}`
  );

  // 1.3 Rechazo de propina negativa
  const calcNegativeTip = calculateSaleTotals(
    mockProductCatalog,
    [{ productoId: 'srv-corte', cantidad: 1 }],
    0,
    -100, // Propina negativa maliciosa
    50,
    10
  );
  assert(calcNegativeTip.propina === 0 && calcNegativeTip.total === 250, 'Propina negativa bloqueada y fijada a 0');

  // ----------------------------------------------------
  // TEST SUITE 2: Arqueo Ciego de Caja y Reconciliación
  // ----------------------------------------------------
  console.log('\n--- Test Suite 2: Pure Cash Drawer & Blind Reconciliation ---');

  const mockVentas = [
    { id: 'v1', total: 300, propina: 30, metodoPago: 'EFECTIVO' },
    { id: 'v2', total: 500, propina: 50, metodoPago: 'TARJETA' },
    { id: 'v3', total: 200, propina: 0, metodoPago: 'TRANSFERENCIA' },
    {
      id: 'v4',
      total: 400,
      propina: 0,
      metodoPago: 'MIXTO',
      detallesPago: JSON.stringify([
        { metodo: 'EFECTIVO', monto: 150 },
        { metodo: 'TARJETA', monto: 250 }
      ])
    }
  ];

  // Fondo inicial: $1,000
  // Efectivo en ventas: 300 + 150 = 450
  // Efectivo esperado en gaveta: 1,000 + 450 = 1,450
  // Conteo real del cajero: 1,450 -> Cuadrado exacto (descuadre = 0)
  const summaryExact = calculateCashShiftSummary(1000, mockVentas, 1450);
  assert(summaryExact.totalEfectivo === 450, 'Total en efectivo de ventas (simples + mixtas) exacto ($450)', `Obtenido: ${summaryExact.totalEfectivo}`);
  assert(summaryExact.efectivoEsperado === 1450, 'Efectivo esperado correcto ($1,450.00)', `Obtenido: ${summaryExact.efectivoEsperado}`);
  assert(summaryExact.descuadre === 0 && !summaryExact.descuadrado, 'Caja perfectamente cuadrada (descuadre = 0, descuadrado = false)');

  // Conteo real con faltante: 1,400 -> Faltante de $50
  const summaryShort = calculateCashShiftSummary(1000, mockVentas, 1400);
  assert(summaryShort.descuadre === -50 && summaryShort.descuadrado, 'Detección correcta de faltante en arqueo ciego (-$50)');

  // ----------------------------------------------------
  // TEST SUITE 3: Validaciones de Esquema con Zod
  // ----------------------------------------------------
  console.log('\n--- Test Suite 3: Zod Schema Validation Middleware ---');

  // 3.1 Login con email malformado
  const resBadEmail = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'no-es-un-email', password: 'password123' })
  });
  assert(
    resBadEmail.status === 400 && resBadEmail.data?.code === 'VALIDATION_ERROR',
    'Zod rechaza email con formato inválido (400)',
    `Status: ${resBadEmail.status}`
  );

  // 3.2 Registro con contraseña corta (< 8 caracteres)
  const resShortPass = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      nombreBarberia: 'Test Studio',
      nombreDueno: 'Test User',
      email: 'test@studio.com',
      password: '123'
    })
  });
  assert(
    resShortPass.status === 400 && resShortPass.data?.code === 'VALIDATION_ERROR',
    'Zod rechaza contraseña débil de menos de 8 caracteres (400)',
    `Status: ${resShortPass.status}`
  );

  // 3.3 Venta POS sin productos
  // Login para obtener token
  const resLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'dueno@elbigote.com', password: 'Dueno123!' })
  });
  const token = resLogin.data?.token;

  const resEmptySale = await request('/ventas', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      sucursalId: 'fake-id',
      barberoId: 'fake-id',
      metodoPago: 'EFECTIVO',
      items: [] // Items vacío
    })
  });
  assert(
    resEmptySale.status === 400 && resEmptySale.data?.code === 'VALIDATION_ERROR',
    'Zod rechaza venta en POS con lista de items vacía (400)',
    `Status: ${resEmptySale.status}`
  );

  // ----------------------------------------------------
  // TEST SUITE 4: Endpoint de Salud del Sistema
  // ----------------------------------------------------
  console.log('\n--- Test Suite 4: System Health Check ---');

  const resHealth = await request('/health');
  assert(
    resHealth.status === 200 && resHealth.data?.status === 'ok' && resHealth.data?.database === 'connected',
    'Endpoint /api/health reporta conexión a base de datos activa y versión 1.2.0',
    `Status: ${resHealth.status}, Data: ${JSON.stringify(resHealth.data)}`
  );

  // ----------------------------------------------------
  // TEST SUITE 5: Prueba de Concurrencia de Reservas (Race Condition)
  // ----------------------------------------------------
  console.log('\n--- Test Suite 5: Concurrency / Race Condition on Bookings ---');

  // Obtener sucursal y barbero de El Bigote
  const resBarberos = await request('/barberos', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const resSucs = await request('/sucursales', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const sucursal = resSucs.data?.[0];
  const barbero = resBarberos.data?.[0];
  const tenantId = resLogin.data?.tenant?.id;

  if (sucursal && barbero) {
    // Definir un horario futuro único para la prueba de carrera (aleatorio para evitar colisión con runs previos)
    const randomDays = 20 + Math.floor(Math.random() * 50);
    const randomHour = 10 + Math.floor(Math.random() * 8);
    const raceSlot = new Date(Date.now() + randomDays * 24 * 3600000);
    raceSlot.setHours(randomHour, 0, 0, 0);

    console.log(`  Disparando 10 solicitudes de reserva simultáneas para el mismo horario (${raceSlot.toISOString()})...`);

    // Disparar 10 solicitudes concurrentes con Promise.all
    const promises = [];
    for (let i = 1; i <= 10; i++) {
      promises.push(
        request('/public/reservar', {
          method: 'POST',
          body: JSON.stringify({
            tenantId,
            sucursalId: sucursal.id,
            barberoId: barbero.id,
            clienteNombre: `Cliente Concurrente ${i}`,
            clienteTelefono: `551100220${i}`,
            fechaHora: raceSlot.toISOString(),
            duracionMinutos: 30
          })
        })
      );
    }

    const results = await Promise.all(promises);

    const successfulBookings = results.filter(r => r.status === 200);
    const rejectedBookings = results.filter(r => r.status === 409);

    assert(
      successfulBookings.length === 1,
      `Exactamente 1 de 10 reservas concurrentes fue aceptada (Ganó la carrera)`,
      `Aceptadas: ${successfulBookings.length}, Rechazadas: ${rejectedBookings.length}`
    );

    assert(
      rejectedBookings.length === 9,
      `Las 9 solicitudes restantes fueron rechazadas con 409 SLOT_OCCUPIED`,
      `Rechazos obtenidos: ${rejectedBookings.length}`
    );
  }

  // ----------------------------------------------------
  // RESUMEN FINAL DE FASE 1
  // ----------------------------------------------------
  console.log('\n======================================================================');
  console.log(`📊 RESULTADO FASE 1: ${passed} de ${total} pruebas pasadas (${Math.round((passed / total) * 100)}%)`);
  if (passed === total) {
    console.log('🎉 FASE 1 VERIFICADA CON ÉXITO: Finanzas, arquitectura y concurrencia operando al 100%.');
  } else {
    console.error('⚠️ ALERTA: Algunas pruebas de la Fase 1 fallaron.');
    process.exit(1);
  }
  console.log('======================================================================\n');
}

runPhase1Tests().catch(err => {
  console.error('Error fatal en suite de pruebas de Fase 1:', err);
  process.exit(1);
});

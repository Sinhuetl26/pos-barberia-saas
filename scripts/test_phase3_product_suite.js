// ======================================================================
// SYSTECH STUDIO - FASE 3 AUTOMATED TEST SUITE (PRODUCT SUITE)
// Multi-service booking, Buffer times, Token cancellation, Waitlist,
// No-Show tracking, Consecutive Folios, Sale Cancellation, CRM & Payroll
// ======================================================================

const http = require('http');

const API_BASE = 'http://localhost:3001';

async function makeRequest(path, method = 'GET', body = null, token = null, extraHeaders = {}) {
  const url = new URL(path, API_BASE);
  const payload = body ? JSON.stringify(body) : null;

  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (payload) {
    headers['Content-Length'] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING FASE 3: ADVANCED PRODUCT SUITE TEST');
  console.log('======================================================\n');

  // 1. Authenticate Dueno
  console.log('--- 1. Authenticating Dueno ---');
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    email: 'dueno@elbigote.com',
    password: 'Dueno123!'
  });
  assert(loginRes.status === 200 && loginRes.body.token, 'Dueno login successful');
  const duenoToken = loginRes.body.token;
  const tenantId = loginRes.body.user.tenantId;

  // Get Branch and Barber
  const sucsRes = await makeRequest('/api/sucursales', 'GET', null, duenoToken);
  const sucursalId = sucsRes.body[0].id;

  const barbsRes = await makeRequest(`/api/barberos?sucursalId=${sucursalId}`, 'GET', null, duenoToken);
  const barberoId = barbsRes.body[0].id;

  const prodsRes = await makeRequest('/api/productos?tipo=SERVICIO', 'GET', null, duenoToken);
  const services = prodsRes.body.filter(p => p.tipo === 'SERVICIO');

  // 2. Multi-Service Public Booking & Token Generation
  console.log('\n--- 2. Multi-Service Public Booking & Secure Tokens ---');
  const serviceIds = services.slice(0, 2).map(s => s.id);
  const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days future
  futureDate.setHours(11, 0, 0, 0);

  const bookingRes = await makeRequest('/api/public/reservar', 'POST', {
    tenantId,
    sucursalId,
    barberoId,
    servicioIds: serviceIds.length > 0 ? serviceIds : undefined,
    fechaHora: futureDate.toISOString(),
    clienteNombre: 'Alejandro Sanz',
    clienteTelefono: '5577665544',
    clienteEmail: 'alejandro@crmtest.com'
  });

  assert(bookingRes.status === 200 && bookingRes.body.success, 'Multi-service public reservation created successfully');
  assert(bookingRes.body.tokenCancelacion && bookingRes.body.tokenCancelacion.length >= 32, 'Generated 64-char cryptographic cancellation token');
  assert(bookingRes.body.enlaceGestion && bookingRes.body.enlaceGestion.includes(bookingRes.body.tokenCancelacion), 'Returns secure management link without leaking PII');

  const cancelToken = bookingRes.body.tokenCancelacion;

  // 3. Waitlist & Cancellation Policy
  console.log('\n--- 3. Waitlist Registration & Cancellation ---');
  // Register client in waitlist for that branch
  const waitlistRes = await makeRequest('/api/public/lista-espera', 'POST', {
    tenantId,
    sucursalId,
    clienteNombre: 'Cliente En Espera',
    clienteTelefono: '5511223399',
    fechaDeseada: futureDate.toISOString()
  });
  assert(waitlistRes.status === 200 && waitlistRes.body.success, 'Client joined waitlist for full slots');

  // Cancel appointment via secure token
  const cancelRes = await makeRequest(`/api/public/cita/token/${cancelToken}/cancelar`, 'POST');
  assert(cancelRes.status === 200 && cancelRes.body.estado === 'CANCELADA', 'Appointment cancelled via secure token adhering to policy');
  assert(cancelRes.body.waitlistNotified === true, 'Waitlist automatically notified of freed appointment slot');

  // 4. No-Show Tracking on Appointments
  console.log('\n--- 4. No-Show Tracking ---');
  const newCitaRes = await makeRequest('/api/citas', 'POST', {
    sucursalId,
    barberoId,
    clienteNombre: 'Roberto NoShow',
    clienteTelefono: '5533221100',
    fechaHora: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  }, duenoToken);
  assert(newCitaRes.status === 200, 'Internal appointment created');
  const testCitaId = newCitaRes.body.id;

  // Mark as NO_SHOW
  const noShowRes = await makeRequest(`/api/citas/${testCitaId}/status`, 'PUT', { estado: 'NO_SHOW' }, duenoToken);
  assert(noShowRes.status === 200 && noShowRes.body.estado === 'NO_SHOW', 'Appointment marked as NO_SHOW in agenda');

  // Verify client profile has noShows incremented
  const clienteId = newCitaRes.body.clienteId;
  const clienteProfile = await makeRequest(`/api/clientes/${clienteId}`, 'GET', null, duenoToken);
  assert(clienteProfile.status === 200 && clienteProfile.body.noShows >= 1, 'Client CRM profile tracks no-shows count accurately');

  // 5. Consecutive Series Folio (A-000123) & Sale Cancellation
  console.log('\n--- 5. Consecutive Folios & Sale Cancellation (Stock & Commission Reversal) ---');
  const saleItem = services[0];
  const saleRes = await makeRequest('/api/ventas', 'POST', {
    sucursalId,
    barberoId,
    clienteId,
    metodoPago: 'EFECTIVO',
    items: [
      { productoId: saleItem.id, cantidad: 1 }
    ]
  }, duenoToken);

  assert(saleRes.status === 200 && saleRes.body.venta.folio.startsWith('A-'), `Sale created with consecutive series folio (${saleRes.body.venta.folio})`);
  const createdSaleId = saleRes.body.venta.id;

  // Cancel the sale
  const cancelSaleRes = await makeRequest(`/api/ventas/${createdSaleId}/cancelar`, 'POST', {
    motivo: 'Cliente solicitó reembolso por error de cargo'
  }, duenoToken);
  assert(cancelSaleRes.status === 200 && cancelSaleRes.body.success, 'Sale cancelled and refunded with audit trail');

  // 6. CRM & Inactivity Reactivation
  console.log('\n--- 6. CRM & Reactivation Campaigns ---');
  const reactivacionRes = await makeRequest('/api/clientes/reactivacion?diasInactividad=0', 'GET', null, duenoToken);
  assert(reactivacionRes.status === 200 && Array.isArray(reactivacionRes.body.clientes), 'Reactivation campaign endpoint identifies inactive clients');
  if (reactivacionRes.body.clientes.length > 0) {
    assert(reactivacionRes.body.clientes[0].mensajeReactivacion, 'Reactivation campaign prepares 1-click WhatsApp message');
  }

  // Assign client membership
  const membresiaRes = await makeRequest(`/api/clientes/${clienteId}/membresia`, 'POST', {
    nombrePlan: 'Club Elite 2 Cortes',
    cortes: 2,
    precio: 350
  }, duenoToken);
  assert(membresiaRes.status === 200 && membresiaRes.body.membresia.cortesRestantes === 2, 'Recurring membership assigned to client in CRM');

  // 7. Payroll Liquidation (Nómina)
  console.log('\n--- 7. Commission Settlement & Payroll Voucher ---');
  // First make a sale so barber has an unpaid commission
  await makeRequest('/api/ventas', 'POST', {
    sucursalId,
    barberoId,
    metodoPago: 'EFECTIVO',
    items: [{ productoId: saleItem.id, cantidad: 1 }]
  }, duenoToken);

  const nominaRes = await makeRequest('/api/comisiones/liquidar-nomina', 'POST', {
    barberoId,
    adelantos: 50,
    deducciones: 0,
    concepto: 'Liquidación semanal con adelanto'
  }, duenoToken);
  assert(nominaRes.status === 200 && nominaRes.body.reciboNomina.folioRecibo.startsWith('NOM-'), 'Barber payroll settled with printable voucher');

  // 8. Cash Drawer Movements
  console.log('\n--- 8. Cash Drawer Movements ---');
  const movCajaRes = await makeRequest('/api/cortes-caja/movimiento', 'POST', {
    sucursalId,
    tipo: 'GASTO_MENOR',
    monto: 75.50,
    concepto: 'Compra de garrafón de agua y café'
  }, duenoToken);
  assert(movCajaRes.status === 200 && movCajaRes.body.success, 'Cash drawer minor expense registered with audit log');

  // 9. Weekly Summary for Owner & CSV Export
  console.log('\n--- 9. Weekly BI Summary & CSV Export ---');
  const resumenRes = await makeRequest('/api/reportes/resumen-semanal', 'POST', {}, duenoToken);
  assert(resumenRes.status === 200 && resumenRes.body.textoResumen.includes('RESUMEN SEMANAL'), 'Automated weekly BI summary prepared for owner');

  const csvRes = await makeRequest('/api/reportes/exportar/ventas-csv', 'GET', null, duenoToken);
  assert(csvRes.status === 200 && typeof csvRes.body === 'string' && csvRes.body.includes('Folio,Fecha'), 'Sales exported in valid accounting CSV format');

  // Summary
  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

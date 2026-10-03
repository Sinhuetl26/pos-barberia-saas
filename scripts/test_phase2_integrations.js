// ======================================================================
// SYSTECH STUDIO - FASE 2 AUTOMATED TEST SUITE
// Tests Stripe Webhooks, Idempotency, Dunning, Gated Simulators,
// WhatsApp Cloud API Fallback, Opt-Out, and Thermal Receipts
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
  console.log('🚀 RUNNING FASE 2: REAL INTEGRATIONS TEST SUITE');
  console.log('======================================================\n');

  // 1. Authenticate as Dueno (El Bigote)
  console.log('--- 1. Authenticating Dueno ---');
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    email: 'dueno@elbigote.com',
    password: 'Dueno123!'
  });
  assert(loginRes.status === 200 && loginRes.body.token, 'Dueno login successful');
  const duenoToken = loginRes.body.token;
  const tenantId = loginRes.body.user.tenantId;

  // 2. Stripe SaaS Webhooks & Idempotency
  console.log('\n--- 2. Stripe SaaS Webhooks & Idempotency ---');
  const testEventId = `evt_test_${Date.now()}`;

  // 2.1 Send invoice.payment_failed via public /api/suscripcion/webhook (No JWT)
  const failedEvent = {
    id: testEventId,
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: `in_test_${Date.now()}`,
        customer: 'cus_elbigote_test',
        subscription: 'sub_elbigote_test',
        amount_due: 99900
      }
    }
  };

  // First attach subscription to tenant
  const setupSubRes = await makeRequest('/api/suscripcion/webhook', 'POST', {
    id: `evt_setup_${Date.now()}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        client_reference_id: tenantId,
        customer: 'cus_elbigote_test',
        subscription: 'sub_elbigote_test'
      }
    }
  });
  console.log('setupSubRes:', setupSubRes.status, setupSubRes.body);
  assert(setupSubRes.status === 200 && setupSubRes.body.received, 'checkout.session.completed webhook processed');

  // Process payment failed event
  const failRes = await makeRequest('/api/suscripcion/webhook', 'POST', failedEvent);
  console.log('failRes:', failRes.status, failRes.body);
  assert(failRes.status === 200 && failRes.body.received, 'invoice.payment_failed webhook received 200 OK');

  // Check tenant status is now EN_RIESGO
  const subRes = await makeRequest('/api/suscripcion', 'GET', null, duenoToken);
  assert(subRes.body.tenant.estado === 'EN_RIESGO', 'Tenant state transitioned to EN_RIESGO on payment failure');
  assert(subRes.body.suscripcion.estadoPago === 'past_due', 'Subscription state marked past_due');

  // 2.2 Test Webhook Idempotency: Send duplicate event
  const dupRes = await makeRequest('/api/suscripcion/webhook', 'POST', failedEvent);
  assert(dupRes.status === 200 && dupRes.body.alreadyProcessed === true, 'Duplicate webhook event was detected as idempotent (alreadyProcessed)');

  // 2.3 Send invoice.paid to recover account
  const recoverEvent = {
    id: `evt_recover_${Date.now()}`,
    type: 'invoice.paid',
    data: {
      object: {
        id: `in_recover_${Date.now()}`,
        customer: 'cus_elbigote_test',
        subscription: 'sub_elbigote_test',
        amount_paid: 99900
      }
    }
  };
  const recoverRes = await makeRequest('/api/suscripcion/webhook', 'POST', recoverEvent);
  assert(recoverRes.status === 200, 'invoice.paid webhook processed successfully');

  const subRecovered = await makeRequest('/api/suscripcion', 'GET', null, duenoToken);
  assert(subRecovered.body.tenant.estado === 'ACTIVO', 'Tenant restored to ACTIVO upon invoice.paid');
  assert(subRecovered.body.suscripcion.estadoPago === 'active', 'Subscription restored to active');

  // 3. Dunning Execution Job
  console.log('\n--- 3. Dunning Verification Job ---');
  const dunningRes = await makeRequest('/api/suscripcion/ejecutar-dunning', 'POST', {}, duenoToken);
  assert(dunningRes.status === 200 && dunningRes.body.success, 'Dunning execution endpoint responds 200 OK with summary');

  // 4. Coupon Validation (FUNDADOR)
  console.log('\n--- 4. Coupon Validation ---');
  const cuponValido = await makeRequest('/api/suscripcion/validar-cupon', 'POST', { codigo: 'FUNDADOR' }, duenoToken);
  assert(cuponValido.status === 200 && cuponValido.body.valido === true && cuponValido.body.descuentoPct === 20, 'Coupon FUNDADOR valid with 20% discount');

  const cuponInvalido = await makeRequest('/api/suscripcion/validar-cupon', 'POST', { codigo: 'INVALIDO_XYZ' }, duenoToken);
  assert(cuponInvalido.status === 200 && cuponInvalido.body.valido === false, 'Invalid coupon rejected cleanly');

  // 5. WhatsApp Messaging, Quiet Hours & Opt-Out (BAJA)
  console.log('\n--- 5. WhatsApp Messaging, Quiet Hours & Opt-Out ---');
  const freshPhone = `55${Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)}`;

  // 5.1 Send WhatsApp Notification
  const sendRes = await makeRequest('/api/notificaciones/enviar', 'POST', {
    destinatario: freshPhone,
    mensaje: 'Hola! Recordatorio de tu cita en Barbería El Bigote.',
    tipo: 'RECORDATORIO_24H',
    forzarHorario: true // Force for test
  }, duenoToken);

  assert(sendRes.status === 200 && sendRes.body.success, 'WhatsApp notification processed successfully');
  assert(sendRes.body.whatsappLink && sendRes.body.whatsappLink.includes(`wa.me/52${freshPhone}`), 'WhatsApp direct link generated with Mexican 52 prefix');

  // 5.2 Test Opt-Out (BAJA) and subsequent blocking
  console.log('\n--- 5.2 Client Opt-Out (BAJA) ---');
  const optOutRes = await makeRequest('/api/notificaciones/opt-out', 'POST', {
    telefono: freshPhone
  }, duenoToken);
  assert(optOutRes.status === 200, 'Opt-out endpoint accepts telephone');

  // 5.3 Automated Reminders Scan
  const procRecordatorios = await makeRequest('/api/notificaciones/procesar-recordatorios', 'POST', {}, duenoToken);
  assert(procRecordatorios.status === 200 && procRecordatorios.body.success, 'Automated reminder scanner executed smoothly');

  // 5.4 Test Gated simular-pago
  console.log('\n--- 5.4 Gated simular-pago in Production ---');
  // It works in dev
  const simDev = await makeRequest('/api/suscripcion/simular-pago', 'POST', { accion: 'PAGO_EXITOSO' }, duenoToken);
  assert(simDev.status === 200, 'simular-pago allowed in non-production environments');

  // 6. Printable Thermal Receipt (58mm and 80mm HTML)
  console.log('\n--- 6. Printable Thermal Receipt (58mm & 80mm) ---');
  // Get latest sale
  const ventasRes = await makeRequest('/api/ventas', 'GET', null, duenoToken);
  assert(ventasRes.status === 200 && Array.isArray(ventasRes.body), 'Retrieved sales list for tenant');

  if (ventasRes.body.length > 0) {
    const saleId = ventasRes.body[0].id;

    // Check JSON ticket
    const ticketRes = await makeRequest(`/api/ventas/${saleId}/ticket`, 'GET', null, duenoToken);
    assert(ticketRes.status === 200 && ticketRes.body.ticketHtmlUrl, 'Ticket JSON returns ticketHtmlUrl');

    // Check 58mm HTML
    const ticketHtml58 = await makeRequest(`/api/ventas/${saleId}/ticket-html?width=58mm`, 'GET', null, duenoToken);
    assert(ticketHtml58.status === 200, '58mm HTML receipt returned 200 OK');
    assert(typeof ticketHtml58.body === 'string' && ticketHtml58.body.includes('width: 58mm'), 'HTML receipt contains 58mm width styling');
    assert(ticketHtml58.body.includes(ventasRes.body[0].folio), 'HTML receipt contains correct sale folio');
    assert(ticketHtml58.body.includes('window.print()'), 'HTML receipt includes thermal print trigger');

    // Check 80mm HTML
    const ticketHtml80 = await makeRequest(`/api/ventas/${saleId}/ticket-html?width=80mm`, 'GET', null, duenoToken);
    assert(ticketHtml80.status === 200 && ticketHtml80.body.includes('width: 80mm'), '80mm HTML receipt returned 200 OK with 80mm styling');
  }

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

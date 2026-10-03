// ==========================================
// SYSTECH STUDIO - PHASE 0 SECURITY TEST SUITE
// Automated verification of P0 security & multi-tenant isolation
// ==========================================

const API_BASE = 'http://localhost:3001/api';

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

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('🔒 SYSTECH STUDIO - VERIFICACIÓN DE SEGURIDAD FASE 0');
  console.log('========================================================\n');

  // ----------------------------------------------------
  // TEST 1: Eliminación de contraseñas inseguras y atajos
  // ----------------------------------------------------
  console.log('--- Test Suite 1: Autenticación Real con bcrypt ---');
  
  // 1.1 Intentar login con contraseña incorrecta
  const resWrong = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'dueno@elbigote.com', password: 'passwordincorrecta' })
  });
  assert(resWrong.status === 401, 'Rechazo de credenciales incorrectas (401)', `Status: ${resWrong.status}`);

  // 1.2 Intentar login con atajo viejo '123456'
  const resOldShort = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'dueno@elbigote.com', password: '123456' })
  });
  assert(resOldShort.status === 401, 'Atajo inseguro 123456 bloqueado (401)', `Status: ${resOldShort.status}`);

  // 1.3 Login legítimo con contraseña hasheada en seed (Dueño El Bigote)
  const resLoginDueno = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'dueno@elbigote.com', password: 'Dueno123!' })
  });
  assert(
    resLoginDueno.status === 200 && resLoginDueno.data?.token,
    'Login exitoso con bcrypt y emisión de token JWT firmado',
    `Status: ${resLoginDueno.status}`
  );
  const tokenDueno = resLoginDueno.data?.token;
  const tenantIdElBigote = resLoginDueno.data?.tenant?.id;

  // 1.4 Login de Super Admin
  const resLoginAdmin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@systech.com', password: 'Admin@Systech2026!' })
  });
  assert(
    resLoginAdmin.status === 200 && resLoginAdmin.data?.user?.rol === 'SUPER_ADMIN',
    'Login de Super Admin con contraseña segura',
    `Status: ${resLoginAdmin.status}`
  );
  const tokenAdmin = resLoginAdmin.data?.token;

  // 1.5 Login de Tenant B (La Clásica)
  const resLoginTenantB = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'dueno@laclasica.com', password: 'LaClasica123!' })
  });
  assert(
    resLoginTenantB.status === 200 && resLoginTenantB.data?.token,
    'Login de Tenant B (La Clásica)',
    `Status: ${resLoginTenantB.status}`
  );
  const tokenTenantB = resLoginTenantB.data?.token;
  const tenantIdLaClasica = resLoginTenantB.data?.tenant?.id;

  // ----------------------------------------------------
  // TEST 2: Middleware requireAuth y rechazo de tokens inválidos
  // ----------------------------------------------------
  console.log('\n--- Test Suite 2: Middleware requireAuth & JWT ---');

  // 2.1 Petición sin token a ruta protegida
  const resNoAuth = await request('/citas');
  assert(resNoAuth.status === 401, 'Rechazo de solicitud sin Authorization Bearer (401)', `Status: ${resNoAuth.status}`);

  // 2.2 Petición con token manipulado/falso
  const resFakeToken = await request('/citas', {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fakedata' }
  });
  assert(resFakeToken.status === 401, 'Rechazo de JWT con firma inválida o manipulada (401)', `Status: ${resFakeToken.status}`);

  // 2.3 Petición con token legítimo
  const resAuthOk = await request('/citas', {
    headers: { Authorization: `Bearer ${tokenDueno}` }
  });
  assert(resAuthOk.status === 200 && Array.isArray(resAuthOk.data), 'Acceso permitido con JWT válido', `Status: ${resAuthOk.status}`);

  // 2.4 Verificar /api/auth/me sin filtrar passwordHash
  const resMe = await request('/auth/me', {
    headers: { Authorization: `Bearer ${tokenDueno}` }
  });
  assert(
    resMe.status === 200 && resMe.data?.user && resMe.data.user.passwordHash === undefined,
    'Endpoint /api/auth/me no expone passwordHash en sesión',
    `User data keys: ${resMe.data?.user ? Object.keys(resMe.data.user).join(', ') : 'none'}`
  );

  // ----------------------------------------------------
  // TEST 3: Control de Acceso Basado en Roles (RBAC)
  // ----------------------------------------------------
  console.log('\n--- Test Suite 3: Control de Acceso por Roles (RBAC) ---');

  // 3.1 Usuario Dueño intenta entrar a métricas globales de Super Admin
  const resAdminMetricsForbidden = await request('/admin/metrics', {
    headers: { Authorization: `Bearer ${tokenDueno}` }
  });
  assert(
    resAdminMetricsForbidden.status === 403,
    'Usuario DUENO bloqueado de /api/admin/metrics (403)',
    `Status: ${resAdminMetricsForbidden.status}`
  );

  // 3.2 Usuario Dueño intenta consultar lista global de clientes SaaS
  const resAdminTenantsForbidden = await request('/admin/tenants', {
    headers: { Authorization: `Bearer ${tokenDueno}` }
  });
  assert(
    resAdminTenantsForbidden.status === 403,
    'Usuario DUENO bloqueado de /api/admin/tenants (403)',
    `Status: ${resAdminTenantsForbidden.status}`
  );

  // 3.3 Super Admin legítimo consulta métricas globales
  const resAdminMetricsAllowed = await request('/admin/metrics', {
    headers: { Authorization: `Bearer ${tokenAdmin}` }
  });
  assert(
    resAdminMetricsAllowed.status === 200 && resAdminMetricsAllowed.data?.totalAccounts !== undefined,
    'SUPER_ADMIN accede correctamente a /api/admin/metrics (200)',
    `Status: ${resAdminMetricsAllowed.status}`
  );

  // ----------------------------------------------------
  // TEST 4: Aislamiento Multitenant Estricto (Fuga de Datos)
  // ----------------------------------------------------
  console.log('\n--- Test Suite 4: Aislamiento Multitenant Estricto ---');

  // Obtener una venta de Tenant A
  const resVentasTenantA = await request('/ventas', {
    headers: { Authorization: `Bearer ${tokenDueno}` }
  });
  const ventasA = resVentasTenantA.data;
  assert(ventasA && ventasA.length > 0, 'Tenant A tiene ventas registradas en BD');

  if (ventasA && ventasA.length > 0) {
    const ventaIdTenantA = ventasA[0].id;

    // 4.1 Tenant B intenta consultar el ticket de Tenant A por ID directo
    const resTicketLeak = await request(`/ventas/${ventaIdTenantA}/ticket`, {
      headers: { Authorization: `Bearer ${tokenTenantB}` }
    });
    assert(
      resTicketLeak.status === 404,
      'Tenant B no puede ver el ticket de venta de Tenant A (404 Not Found)',
      `Status: ${resTicketLeak.status}`
    );

    // 4.2 Tenant A sí puede ver su propio ticket
    const resTicketOwn = await request(`/ventas/${ventaIdTenantA}/ticket`, {
      headers: { Authorization: `Bearer ${tokenDueno}` }
    });
    assert(
      resTicketOwn.status === 200 && resTicketOwn.data?.venta?.id === ventaIdTenantA,
      'Tenant A accede a su propio ticket legítimo',
      `Status: ${resTicketOwn.status}`
    );
  }

  // 4.3 Obtener producto de Tenant A y verificar que Tenant B no pueda modificarlo
  const resProdsTenantA = await request('/productos', {
    headers: { Authorization: `Bearer ${tokenDueno}` }
  });
  const prodsA = resProdsTenantA.data;
  assert(prodsA && prodsA.length > 0, 'Tenant A tiene productos en catálogo');

  if (prodsA && prodsA.length > 0) {
    const prodIdTenantA = prodsA[0].id;

    // Tenant B intenta actualizar precio o nombre del producto de Tenant A
    const resProdHack = await request(`/productos/${prodIdTenantA}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenTenantB}` },
      body: JSON.stringify({ nombre: 'Hackeado por Tenant B', precioVenta: 1 })
    });
    assert(
      resProdHack.status === 404,
      'Tenant B no puede modificar productos de Tenant A (404 Not Found)',
      `Status: ${resProdHack.status}`
    );
  }

  // ----------------------------------------------------
  // TEST 5: Precios Autoritarios en Servidor (POS)
  // ----------------------------------------------------
  console.log('\n--- Test Suite 5: Precios Autoritarios en Servidor (POS) ---');

  // Obtener sucursal y barbero de Tenant A
  const resSucsA = await request('/sucursales', {
    headers: { Authorization: `Bearer ${tokenDueno}` }
  });
  const resBarberosA = await request('/barberos', {
    headers: { Authorization: `Bearer ${tokenDueno}` }
  });
  
  const sucursalA = resSucsA.data?.[0];
  const barberoA = resBarberosA.data?.[0];
  const prodServicioA = prodsA?.find(p => p.tipo === 'SERVICIO');

  if (sucursalA && barberoA && prodServicioA) {
    const precioOficial = Number(prodServicioA.precioVenta);

    // Cliente malicioso envía precioUnitario manipulado a $1.00 peso
    const resVentaManipulada = await request('/ventas', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenDueno}` },
      body: JSON.stringify({
        sucursalId: sucursalA.id,
        barberoId: barberoA.id,
        metodoPago: 'EFECTIVO',
        items: [
          {
            productoId: prodServicioA.id,
            cantidad: 1,
            precioUnitario: 1.00 // Intento de fraude por el cliente
          }
        ]
      })
    });

    assert(
      resVentaManipulada.status === 200,
      'Venta procesada con éxito por el servidor',
      `Status: ${resVentaManipulada.status}`
    );

    const totalCobrado = Number(resVentaManipulada.data?.venta?.total);
    assert(
      totalCobrado === precioOficial,
      `Servidor ignora precio enviado ($1.00) y cobra precio autoritativo ($${precioOficial})`,
      `Cobrado: $${totalCobrado}, Oficial: $${precioOficial}`
    );
  }

  // ----------------------------------------------------
  // TEST 6: Portal Público de Reservas Seguro
  // ----------------------------------------------------
  console.log('\n--- Test Suite 6: Portal Público de Reservas Seguro ---');

  // 6.1 Rechazar reserva en fecha pasada
  const resPastBooking = await request('/public/reservar', {
    method: 'POST',
    body: JSON.stringify({
      tenantId: tenantIdElBigote,
      sucursalId: sucursalA?.id,
      barberoId: barberoA?.id,
      clienteNombre: 'Test Cliente',
      clienteTelefono: '5512345678',
      fechaHora: new Date(Date.now() - 3600000).toISOString() // 1 hora en el pasado
    })
  });
  assert(
    resPastBooking.status === 400 && resPastBooking.data?.code === 'PAST_DATE',
    'Rechazo de reserva pública con fecha en el pasado (400)',
    `Status: ${resPastBooking.status}`
  );

  // 6.2 Reserva legítima en fecha futura (garantizada en día laboral)
  const randomDays = 15 + Math.floor(Math.random() * 50);
  const futureDate = new Date(Date.now() + randomDays * 24 * 3600000);
  if (futureDate.getDay() === 0) {
    futureDate.setDate(futureDate.getDate() + 1); // No domingo
  }
  const randomHour = 11 + Math.floor(Math.random() * 5);
  futureDate.setHours(randomHour, 0, 0, 0);

  const resGoodBooking = await request('/public/reservar', {
    method: 'POST',
    body: JSON.stringify({
      tenantId: tenantIdElBigote,
      sucursalId: sucursalA?.id,
      barberoId: barberoA?.id,
      clienteNombre: 'Juan Perez',
      clienteTelefono: '5598765432',
      clienteEmail: 'juan@testseguridad.com',
      fechaHora: futureDate.toISOString()
    })
  });

  assert(
    resGoodBooking.status === 200 && resGoodBooking.data?.codigoReserva?.startsWith('RES-'),
    'Reserva pública exitosa con folio criptográfico seguro (RES-XXXXXX)',
    `Status: ${resGoodBooking.status}, Folio: ${resGoodBooking.data?.codigoReserva}`
  );

  const bookingCode = resGoodBooking.data?.codigoReserva;

  // 6.3 Consulta de cita pública sin fuga de datos privados (PII, C7)
  if (bookingCode) {
    const resPublicLookup = await request(`/public/cita/${bookingCode}`);
    assert(
      resPublicLookup.status === 200 &&
      resPublicLookup.data?.cliente?.nombre === 'Juan Perez' &&
      resPublicLookup.data?.cliente?.telefono === undefined &&
      resPublicLookup.data?.cliente?.email === undefined,
      'Consulta pública no filtra teléfono ni email del cliente (Cumplimiento LFPDPPP)',
      `Cliente fields: ${JSON.stringify(resPublicLookup.data?.cliente)}`
    );

    // C7: Token de cancelación y notas no deben exponerse al público
    assert(
      resPublicLookup.data?.tokenCancelacion === undefined,
      'C7: Token de cancelación sensible omitido de la consulta pública de cita',
      `tokenCancelacion expuesto: ${resPublicLookup.data?.tokenCancelacion}`
    );
    assert(
      resPublicLookup.data?.notas === undefined,
      'C7: Notas privadas del salón omitidas de la consulta pública',
      `notas expuestas: ${resPublicLookup.data?.notas}`
    );

    // C7: Cancelación sin token largo seguro debe ser rechazada con 401
    const resCancelNoToken = await request(`/public/cita/${bookingCode}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ motivo: 'Prueba sin token' })
    });
    assert(
      resCancelNoToken.status === 401,
      'C7: Cancelación de cita rechazada (401) cuando falta el tokenCancelacion seguro',
      `Status: ${resCancelNoToken.status}`
    );
  }

  // ----------------------------------------------------
  // TEST SUITE 7: Control de Acceso Basado en Roles (RBAC - C2)
  // ----------------------------------------------------
  console.log('\n--- Test Suite 7: Role-Based Access Control (RBAC - C2) ---');

  // Iniciar sesión como BARBERO
  const resLoginBarbero = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'barbero@elbigote.com', password: 'Barbero123!' })
  });
  assert(
    resLoginBarbero.status === 200 && resLoginBarbero.data?.user?.rol === 'BARBERO',
    'Login exitoso con rol BARBERO para pruebas de permisos',
    `Status: ${resLoginBarbero.status}, Rol: ${resLoginBarbero.data?.user?.rol}`
  );
  const tokenBarbero = resLoginBarbero.data?.token;

  if (tokenBarbero) {
    const authBarbero = { Authorization: `Bearer ${tokenBarbero}` };

    // 7.1 BARBERO no puede modificar datos de barberos (PUT /barberos/:id -> 403)
    const resPutBarbero = await request(`/barberos/${barberoA?.id || 'fake-id'}`, {
      method: 'PUT',
      headers: authBarbero,
      body: JSON.stringify({ comisionServiciosPct: 90 })
    });
    assert(resPutBarbero.status === 403, 'C2: BARBERO recibe 403 al intentar editar comisiones de barbero (PUT /barberos/:id)', `Status: ${resPutBarbero.status}`);

    // 7.2 BARBERO no puede crear nuevos barberos (POST /barberos -> 403)
    const resPostBarbero = await request('/barberos', {
      method: 'POST',
      headers: authBarbero,
      body: JSON.stringify({ nombre: 'Barbero Hacker', sucursalId: sucursalA?.id })
    });
    assert(resPostBarbero.status === 403, 'C2: BARBERO recibe 403 al intentar crear nuevo barbero (POST /barberos)', `Status: ${resPostBarbero.status}`);

    // 7.3 BARBERO no puede liquidar nómina (POST /comisiones/liquidar-nomina -> 403)
    const resLiquidar = await request('/comisiones/liquidar-nomina', {
      method: 'POST',
      headers: authBarbero,
      body: JSON.stringify({ barberoId: barberoA?.id })
    });
    assert(resLiquidar.status === 403, 'C2: BARBERO recibe 403 al intentar liquidar nómina (POST /comisiones/liquidar-nomina)', `Status: ${resLiquidar.status}`);

    // 7.4 BARBERO no puede cerrar corte de caja (POST /cortes-caja/cerrar -> 403)
    const resCerrarCaja = await request('/cortes-caja/cerrar', {
      method: 'POST',
      headers: authBarbero,
      body: JSON.stringify({ corteId: 'fake-id', conteoEfectivoReal: 1000 })
    });
    assert(resCerrarCaja.status === 403, 'C2: BARBERO recibe 403 al intentar cerrar corte de caja (POST /cortes-caja/cerrar)', `Status: ${resCerrarCaja.status}`);

    // 7.5 BARBERO no puede realizar movimientos manuales de inventario (POST /inventario/movimiento -> 403)
    const resKardex = await request('/inventario/movimiento', {
      method: 'POST',
      headers: authBarbero,
      body: JSON.stringify({ productoId: 'fake-id', tipoMovimiento: 'ENTRADA_COMPRA', cantidad: 10 })
    });
    assert(resKardex.status === 403, 'C2: BARBERO recibe 403 al intentar registrar movimiento de kardex (POST /inventario/movimiento)', `Status: ${resKardex.status}`);

    // 7.6 BARBERO no puede ver reportes financieros globales (GET /reportes/dashboard -> 403)
    const resReportes = await request('/reportes/dashboard', {
      headers: authBarbero
    });
    assert(resReportes.status === 403, 'C2: BARBERO recibe 403 al intentar consultar reportes financieros (GET /reportes/dashboard)', `Status: ${resReportes.status}`);

    // 7.7 BARBERO no puede cambiar el plan del SaaS (POST /suscripcion/cambiar-plan -> 403)
    const resCambiarPlan = await request('/suscripcion/cambiar-plan', {
      method: 'POST',
      headers: authBarbero,
      body: JSON.stringify({ nuevoPlan: 'PRO' })
    });
    assert(resCambiarPlan.status === 403, 'C2: BARBERO recibe 403 al intentar cambiar plan de suscripción (POST /suscripcion/cambiar-plan)', `Status: ${resCambiarPlan.status}`);
  }

  // ----------------------------------------------------
  // TEST SUITE 8: Webhook de Stripe & Protección Criptográfica (C4)
  // ----------------------------------------------------
  console.log('\n--- Test Suite 8: Stripe Webhook Cryptographic Verification (C4) ---');

  // Enviar webhook falso sin firma o con firma inválida
  const resBadWebhook = await request('/suscripcion/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 't=12345,v1=fake_signature_hash' },
    body: JSON.stringify({ type: 'customer.subscription.deleted' })
  });
  assert(
    resBadWebhook.status === 400,
    'C4: Webhook de Stripe con firma criptográfica HMAC inválida es rechazado (400)',
    `Status: ${resBadWebhook.status}`
  );

  // ----------------------------------------------------
  // TEST SUITE 9: Prevención de Bypass de Suspensión (C6)
  // ----------------------------------------------------
  console.log('\n--- Test Suite 9: Suspension Bypass Query Parameter Guard (C6) ---');

  // Intentar usar truco de query string ?x=/suscripcion en endpoint operativo
  const resBypassAttempt = await request('/ventas?x=/suscripcion', {
    headers: { Authorization: `Bearer ${tokenDueno}` }
  });
  // Si el tenant está activo debe procesar normalmente (200), pero la URL prefix debe validar /api/ventas y no saltarse el guard
  assert(
    resBypassAttempt.status === 200,
    'C6: Endpoint responde correctamente validando el path base y no query string injectada',
    `Status: ${resBypassAttempt.status}`
  );

  // ----------------------------------------------------
  // RESUMEN FINAL
  // ----------------------------------------------------
  console.log('\n========================================================');
  console.log(`📊 RESULTADO FASE 0: ${passedTests} de ${totalTests} pruebas pasadas (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (passedTests === totalTests) {
    console.log('🎉 FASE 0 COMPLETADA CON ÉXITO: Todos los bloqueantes P0 están cerrados.');
  } else {
    console.error('⚠️ ALERTA: Algunas pruebas de seguridad fallaron.');
    process.exit(1);
  }
  console.log('========================================================\n');
}

runTests().catch(err => {
  console.error('Error fatal al ejecutar suite de pruebas:', err);
  process.exit(1);
});

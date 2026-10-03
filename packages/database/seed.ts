import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const hash = (pwd: string) => bcrypt.hashSync(pwd, 10);

async function main() {
  console.log('--- Cleaning and Seeding SYSTECH Database ---');

  // Clean all existing data in foreign-key safe order
  await prisma.auditoriaLog.deleteMany();
  await prisma.notificacionLog.deleteMany();
  await prisma.kardexMovimiento.deleteMany();
  await prisma.comision.deleteMany();
  await prisma.corteCaja.deleteMany();
  await prisma.ventaItem.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.cita.deleteMany();
  await prisma.bloqueoHorario.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.clienteFinal.deleteMany();
  await prisma.barbero.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.sucursal.deleteMany();
  await prisma.suscripcion.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.plan.deleteMany();

  // Create Standard SaaS Plans
  const planBasico = await prisma.plan.create({
    data: {
      codigo: 'BASICO',
      nombre: 'Plan Básico',
      precioMensual: 499,
      limiteSucursales: 1,
      limiteBarberos: 3,
      whatsappPro: false,
      analiticaAvanzada: false
    }
  });

  const planPro = await prisma.plan.create({
    data: {
      codigo: 'PRO',
      nombre: 'Plan Pro',
      precioMensual: 999,
      limiteSucursales: 999,
      limiteBarberos: 999,
      whatsappPro: true,
      analiticaAvanzada: true
    }
  });

  // 1. Super Admin User (SYSTECH Global Admin)
  // Can be tied to a system tenant or global
  const systechTenant = await prisma.tenant.create({
    data: {
      nombre: 'SYSTECH Plataforma Central',
      slug: 'systech-global',
      plan: 'PRO',
      planId: planPro.id,
      estado: 'ACTIVO',
      emailContacto: 'soporte@systech.mx',
      telefono: '5500000000',
      direccion: 'CDMX, México'
    }
  });

  const superAdmin = await prisma.usuario.create({
    data: {
      tenantId: systechTenant.id,
      nombre: 'Administrador SYSTECH',
      email: 'admin@systech.com',
      passwordHash: hash('Admin@Systech2026!'),
      rol: 'SUPER_ADMIN',
      telefono: '5511223344'
    }
  });

  // 2. Tenant 1: Barbería El Bigote (PLAN PRO - Multiple branches, multiple barbers)
  const tenant1 = await prisma.tenant.create({
    data: {
      nombre: 'Barbería El Bigote',
      slug: 'el-bigote',
      plan: 'PRO',
      planId: planPro.id,
      estado: 'ACTIVO',
      emailContacto: 'contacto@elbigote.mx',
      telefono: '5551234567',
      direccion: 'Av. Álvaro Obregón 123, Col. Roma Norte, Cuauhtémoc, CDMX',
      limiteSucursales: 999,
      limiteBarberos: 999
    }
  });

  await prisma.suscripcion.create({
    data: {
      tenantId: tenant1.id,
      montoMensual: 999,
      estadoPago: 'active',
      diasGracia: 3,
      fechaUltimoCobro: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      fechaProximoCobro: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000)
    }
  });

  // Users for Tenant 1
  const dueno1 = await prisma.usuario.create({
    data: {
      tenantId: tenant1.id,
      nombre: 'Carlos Mendoza (Dueño)',
      email: 'dueno@elbigote.com',
      passwordHash: hash('Dueno123!'),
      rol: 'DUENO',
      telefono: '5551234567'
    }
  });

  // Sucursales for Tenant 1
  const sucursalRoma = await prisma.sucursal.create({
    data: {
      tenantId: tenant1.id,
      nombre: 'Matriz Roma Norte',
      direccion: 'Av. Álvaro Obregón 123, Roma Norte, CDMX',
      telefono: '5551234567',
      horarioApertura: '09:00',
      horarioCierre: '20:00',
      diasLaborales: 'Lunes a Sábado'
    }
  });

  const sucursalCondesa = await prisma.sucursal.create({
    data: {
      tenantId: tenant1.id,
      nombre: 'Sucursal Condesa',
      direccion: 'Av. Michoacán 45, Condesa, CDMX',
      telefono: '5559876543',
      horarioApertura: '10:00',
      horarioCierre: '21:00',
      diasLaborales: 'Lunes a Domingo'
    }
  });

  const gerenteCondesa = await prisma.usuario.create({
    data: {
      tenantId: tenant1.id,
      nombre: 'Sofía Ramírez (Gerente)',
      email: 'gerente@elbigote.com',
      passwordHash: hash('Gerente123!'),
      rol: 'GERENTE',
      sucursalId: sucursalCondesa.id,
      telefono: '5559876543'
    }
  });

  // Barberos for Roma
  const barberoCarlos = await prisma.barbero.create({
    data: {
      sucursalId: sucursalRoma.id,
      nombre: 'Carlos "Charly" Mendoza',
      telefono: '5551112233',
      email: 'carlos@elbigote.com',
      comisionServiciosPct: 50.0,
      comisionProductosPct: 10.0,
      diasDescanso: 'Domingo',
      horarioInicio: '09:00',
      horarioFin: '19:00'
    }
  });

  const barberoMateo = await prisma.barbero.create({
    data: {
      sucursalId: sucursalRoma.id,
      nombre: 'Mateo Silva',
      telefono: '5552223344',
      email: 'mateo@elbigote.com',
      comisionServiciosPct: 45.0,
      comisionProductosPct: 12.0,
      diasDescanso: 'Lunes',
      horarioInicio: '10:00',
      horarioFin: '20:00'
    }
  });

  // Barbero for Condesa
  const barberoDavid = await prisma.barbero.create({
    data: {
      sucursalId: sucursalCondesa.id,
      nombre: 'David Herrera',
      telefono: '5553334455',
      email: 'david@elbigote.com',
      comisionServiciosPct: 50.0,
      comisionProductosPct: 10.0,
      diasDescanso: 'Miércoles',
      horarioInicio: '10:00',
      horarioFin: '20:00'
    }
  });

  // Create Barbero user account for Carlos login
  await prisma.usuario.create({
    data: {
      tenantId: tenant1.id,
      nombre: 'Carlos "Charly" Barbero',
      email: 'barbero@elbigote.com',
      passwordHash: hash('Barbero123!'),
      rol: 'BARBERO',
      telefono: '5551112233'
    }
  });

  // Servicios
  const servCorte = await prisma.producto.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      nombre: 'Corte Clásico Caballero',
      tipo: 'SERVICIO',
      categoria: 'Cortes',
      duracionMinutos: 35,
      precioVenta: 280,
      costo: 0,
      stockActual: 9999,
      stockMinimo: 0,
      sku: 'SRV-001'
    }
  });

  const servFade = await prisma.producto.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      nombre: 'Fade & Degradado Master',
      tipo: 'SERVICIO',
      categoria: 'Cortes',
      duracionMinutos: 45,
      precioVenta: 320,
      costo: 0,
      stockActual: 9999,
      stockMinimo: 0,
      sku: 'SRV-002'
    }
  });

  const servBarba = await prisma.producto.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      nombre: 'Ritual de Barba con Toalla Caliente',
      tipo: 'SERVICIO',
      categoria: 'Barba',
      duracionMinutos: 30,
      precioVenta: 220,
      costo: 0,
      stockActual: 9999,
      stockMinimo: 0,
      sku: 'SRV-003'
    }
  });

  const servCombo = await prisma.producto.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      nombre: 'Combo VIP: Corte + Barba + Mascarilla',
      tipo: 'SERVICIO',
      categoria: 'Combos',
      duracionMinutos: 60,
      precioVenta: 480,
      costo: 0,
      stockActual: 9999,
      stockMinimo: 0,
      sku: 'SRV-004'
    }
  });

  const servColor = await prisma.producto.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      nombre: 'Camuflaje de Canas / Color Barba',
      tipo: 'SERVICIO',
      categoria: 'Tratamiento',
      duracionMinutos: 40,
      precioVenta: 350,
      costo: 30,
      stockActual: 9999,
      stockMinimo: 0,
      sku: 'SRV-005'
    }
  });

  // Productos Físicos
  const prodPomada = await prisma.producto.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      nombre: 'Pomada Suavecito Firme Hold 113g',
      tipo: 'PRODUCTO',
      categoria: 'Styling',
      precioVenta: 360,
      costo: 180,
      stockActual: 14,
      stockMinimo: 5,
      sku: 'POM-001'
    }
  });

  const prodAceite = await prisma.producto.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      nombre: 'Aceite para Barba Wood & Spice 30ml',
      tipo: 'PRODUCTO',
      categoria: 'Barba',
      precioVenta: 250,
      costo: 120,
      stockActual: 2, // ¡Bajo stock!
      stockMinimo: 5,
      sku: 'ACE-002'
    }
  });

  const prodCera = await prisma.producto.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      nombre: 'Cera Mate Reuzel Fiber 100g',
      tipo: 'PRODUCTO',
      categoria: 'Styling',
      precioVenta: 390,
      costo: 200,
      stockActual: 8,
      stockMinimo: 4,
      sku: 'REU-003'
    }
  });

  const prodShampoo = await prisma.producto.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      nombre: 'Shampoo Anticaída Barber Club 250ml',
      tipo: 'PRODUCTO',
      categoria: 'Cuidado Capilar',
      precioVenta: 280,
      costo: 140,
      stockActual: 1, // ¡Bajo stock!
      stockMinimo: 4,
      sku: 'SHP-004'
    }
  });

  const prodAfter = await prisma.producto.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      nombre: 'Loción After Shave Mentol 400ml',
      tipo: 'PRODUCTO',
      categoria: 'Post-Afeitado',
      precioVenta: 190,
      costo: 85,
      stockActual: 12,
      stockMinimo: 4,
      sku: 'AFT-005'
    }
  });

  // Clientes Finales
  const cliente1 = await prisma.clienteFinal.create({
    data: {
      tenantId: tenant1.id,
      nombre: 'Juan Pérez Estrada',
      telefono: '5512345678',
      email: 'juan.perez@gmail.com',
      totalVisitas: 5,
      notas: 'Prefiere fade bajo y toalla fría al final'
    }
  });

  const cliente2 = await prisma.clienteFinal.create({
    data: {
      tenantId: tenant1.id,
      nombre: 'Roberto Gómez Bolaños',
      telefono: '5587654321',
      email: 'roberto.gomez@gmail.com',
      totalVisitas: 3,
      notas: 'Ritual de barba completo, piel sensible'
    }
  });

  const cliente3 = await prisma.clienteFinal.create({
    data: {
      tenantId: tenant1.id,
      nombre: 'Luis Fernando Castro',
      telefono: '5544332211',
      email: 'luisfer@outlook.com',
      totalVisitas: 1
    }
  });

  const cliente4 = await prisma.clienteFinal.create({
    data: {
      tenantId: tenant1.id,
      nombre: 'Miguel Ángel Torres',
      telefono: '5599887766',
      email: 'miguel.torres@gmail.com',
      totalVisitas: 8
    }
  });

  // Citas (Hoy y próx días)
  const hoy = new Date();
  const hoy10am = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 10, 0, 0);
  const hoy1130am = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 11, 30, 0);
  const hoy13pm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 13, 0, 0);
  const hoy16pm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 16, 0, 0);
  const manana11am = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1, 11, 0, 0);

  const cita1 = await prisma.cita.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      barberoId: barberoCarlos.id,
      clienteId: cliente1.id,
      servicioId: servCorte.id,
      nombreServicio: servCorte.nombre,
      fechaHora: hoy10am,
      duracionMinutos: 35,
      estado: 'CONFIRMADA',
      precioEstimado: 280,
      codigoReserva: 'RES-8921',
      notas: 'Puntual'
    }
  });

  const cita2 = await prisma.cita.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      barberoId: barberoMateo.id,
      clienteId: cliente2.id,
      servicioId: servCombo.id,
      nombreServicio: servCombo.nombre,
      fechaHora: hoy1130am,
      duracionMinutos: 60,
      estado: 'CONFIRMADA',
      precioEstimado: 480,
      codigoReserva: 'RES-9014',
      notas: 'Cita para evento'
    }
  });

  const cita3 = await prisma.cita.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      barberoId: barberoCarlos.id,
      clienteId: cliente3.id,
      servicioId: servBarba.id,
      nombreServicio: servBarba.nombre,
      fechaHora: hoy13pm,
      duracionMinutos: 30,
      estado: 'PENDIENTE',
      precioEstimado: 220,
      codigoReserva: 'RES-9102'
    }
  });

  const cita4 = await prisma.cita.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      barberoId: barberoMateo.id,
      clienteId: cliente4.id,
      servicioId: servFade.id,
      nombreServicio: servFade.nombre,
      fechaHora: hoy16pm,
      duracionMinutos: 45,
      estado: 'COMPLETADA',
      precioEstimado: 320,
      codigoReserva: 'RES-9233'
    }
  });

  // Bloqueo de horario (Comida)
  await prisma.bloqueoHorario.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      barberoId: barberoCarlos.id,
      fechaInicio: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 14, 0, 0),
      fechaFin: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 15, 0, 0),
      motivo: 'Hora de Almuerzo'
    }
  });

  // Ventas de Demostración
  // Venta 1: Completada con cita 4
  const venta1 = await prisma.venta.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      barberoId: barberoMateo.id,
      clienteId: cliente4.id,
      citaId: cita4.id,
      folio: 'FOL-00101',
      subtotal: 320,
      descuento: 0,
      propina: 50,
      total: 370,
      metodoPago: 'TARJETA',
      fecha: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  });

  await prisma.ventaItem.create({
    data: {
      ventaId: venta1.id,
      productoId: servFade.id,
      nombreItem: servFade.nombre,
      tipoItem: 'SERVICIO',
      cantidad: 1,
      precioUnitario: 320,
      subtotal: 320
    }
  });

  // Mateo's commission on service (45% of $320 = $144)
  await prisma.comision.create({
    data: {
      tenantId: tenant1.id,
      ventaId: venta1.id,
      barberoId: barberoMateo.id,
      monto: 144,
      porcentaje: 45,
      pagada: false
    }
  });

  // Venta 2: Walk-in sale (Corte + Pomada)
  const venta2 = await prisma.venta.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      barberoId: barberoCarlos.id,
      clienteId: cliente1.id,
      folio: 'FOL-00102',
      subtotal: 640,
      descuento: 40, // Descuento $40
      propina: 40,
      total: 640,
      metodoPago: 'EFECTIVO',
      fecha: new Date(Date.now() - 4 * 60 * 60 * 1000)
    }
  });

  await prisma.ventaItem.create({
    data: {
      ventaId: venta2.id,
      productoId: servCorte.id,
      nombreItem: servCorte.nombre,
      tipoItem: 'SERVICIO',
      cantidad: 1,
      precioUnitario: 280,
      subtotal: 280
    }
  });

  await prisma.ventaItem.create({
    data: {
      ventaId: venta2.id,
      productoId: prodPomada.id,
      nombreItem: prodPomada.nombre,
      tipoItem: 'PRODUCTO',
      cantidad: 1,
      precioUnitario: 360,
      subtotal: 360
    }
  });

  // Carlos's commission: 50% of 280 ($140) + 10% of 360 ($36) = $176
  await prisma.comision.create({
    data: {
      tenantId: tenant1.id,
      ventaId: venta2.id,
      barberoId: barberoCarlos.id,
      monto: 176,
      porcentaje: 50,
      pagada: true,
      fechaPago: new Date(),
      metodoPagoComision: 'EFECTIVO'
    }
  });

  // Kardex for Pomada sale
  await prisma.kardexMovimiento.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      productoId: prodPomada.id,
      tipoMovimiento: 'VENTA_POS',
      cantidad: -1,
      stockAnterior: 15,
      stockNuevo: 14,
      motivo: 'Venta Folio FOL-00102'
    }
  });

  // Venta 3: Split payment example ($150 Cash + $100 Card)
  const venta3 = await prisma.venta.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      barberoId: barberoCarlos.id,
      clienteId: cliente2.id,
      folio: 'FOL-00103',
      subtotal: 250,
      descuento: 0,
      propina: 0,
      total: 250,
      metodoPago: 'MIXTO',
      detallesPago: JSON.stringify([
        { metodo: 'EFECTIVO', monto: 150 },
        { metodo: 'TARJETA', monto: 100 }
      ]),
      fecha: new Date(Date.now() - 1 * 60 * 60 * 1000)
    }
  });

  await prisma.ventaItem.create({
    data: {
      ventaId: venta3.id,
      productoId: prodAceite.id,
      nombreItem: prodAceite.nombre,
      tipoItem: 'PRODUCTO',
      cantidad: 1,
      precioUnitario: 250,
      subtotal: 250
    }
  });

  await prisma.comision.create({
    data: {
      tenantId: tenant1.id,
      ventaId: venta3.id,
      barberoId: barberoCarlos.id,
      monto: 25, // 10% of 250
      porcentaje: 10,
      pagada: false
    }
  });

  // Kardex for Aceite sale
  await prisma.kardexMovimiento.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      productoId: prodAceite.id,
      tipoMovimiento: 'VENTA_POS',
      cantidad: -1,
      stockAnterior: 3,
      stockNuevo: 2,
      motivo: 'Venta Folio FOL-00103'
    }
  });

  // Corte de Caja Abierto Hoy
  await prisma.corteCaja.create({
    data: {
      tenantId: tenant1.id,
      sucursalId: sucursalRoma.id,
      usuarioId: dueno1.id,
      fondoInicial: 1000,
      totalEfectivo: 790, // $640 (venta2) + $150 (venta3 mixto)
      totalTarjeta: 470, // $370 (venta1) + $100 (venta3 mixto)
      totalTransferencia: 0,
      totalPropinas: 90,
      totalVentas: 1260,
      estado: 'ABIERTO',
      notas: 'Turno matutino operando con normalidad'
    }
  });

  // Notificaciones de prueba
  await prisma.notificacionLog.create({
    data: {
      tenantId: tenant1.id,
      tipo: 'CONFIRMACION_CITA',
      canal: 'WHATSAPP',
      destinatario: cliente1.telefono || '5512345678',
      mensaje: '¡Hola Juan Pérez! Tu cita para Corte Clásico está confirmada para hoy 10:00 AM con Carlos en Barbería El Bigote (Roma Norte). Folio: RES-8921',
      estado: 'ENVIADO'
    }
  });

  await prisma.notificacionLog.create({
    data: {
      tenantId: tenant1.id,
      tipo: 'STOCK_MINIMO',
      canal: 'WHATSAPP',
      destinatario: tenant1.telefono || '5551234567',
      mensaje: '⚠️ Alerta de Inventario: El producto "Aceite para Barba Wood & Spice" ha llegado a 2 unidades (Mínimo: 5). Se recomienda reabastecer.',
      estado: 'ENVIADO'
    }
  });

  // Auditoría inicial
  await prisma.auditoriaLog.create({
    data: {
      tenantId: tenant1.id,
      usuarioEmail: 'admin@systech.com',
      accion: 'ALTA_TENANT',
      detalles: 'Registro de Barbería El Bigote con Plan PRO'
    }
  });

  // 3. Tenant 2: Barbería La Clásica (PLAN BÁSICO - 1 branch, 2 barbers)
  const tenant2 = await prisma.tenant.create({
    data: {
      nombre: 'Barbería La Clásica',
      slug: 'la-clasica',
      plan: 'BASICO',
      planId: planBasico.id,
      estado: 'ACTIVO',
      emailContacto: 'contacto@laclasica.mx',
      telefono: '5566778899',
      direccion: 'Calle Madero 88, Centro Histórico, CDMX',
      limiteSucursales: 1,
      limiteBarberos: 3
    }
  });

  await prisma.suscripcion.create({
    data: {
      tenantId: tenant2.id,
      montoMensual: 499,
      estadoPago: 'active',
      diasGracia: 3,
      fechaUltimoCobro: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      fechaProximoCobro: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    }
  });

  const sucursalCentro = await prisma.sucursal.create({
    data: {
      tenantId: tenant2.id,
      nombre: 'Sucursal Centro Histórico',
      direccion: 'Calle Madero 88, Centro Histórico, CDMX',
      telefono: '5566778899'
    }
  });

  await prisma.usuario.create({
    data: {
      tenantId: tenant2.id,
      nombre: 'Fernando Ruiz',
      email: 'dueno@laclasica.com',
      passwordHash: hash('LaClasica123!'),
      rol: 'DUENO',
      telefono: '5566778899'
    }
  });

  await prisma.barbero.create({
    data: {
      sucursalId: sucursalCentro.id,
      nombre: 'Fernando Ruiz',
      comisionServiciosPct: 50,
      comisionProductosPct: 10
    }
  });

  await prisma.barbero.create({
    data: {
      sucursalId: sucursalCentro.id,
      nombre: 'Jorge Almonte',
      comisionServiciosPct: 45,
      comisionProductosPct: 10
    }
  });

  // 4. Tenant 3: Urban Barber Studio (PLAN BASICO - EN RIESGO por pago fallido)
  const tenant3 = await prisma.tenant.create({
    data: {
      nombre: 'Urban Barber Studio',
      slug: 'urban-barber',
      plan: 'BASICO',
      planId: planBasico.id,
      estado: 'EN_RIESGO',
      emailContacto: 'hola@urbanbarber.mx',
      telefono: '5588990011',
      direccion: 'Insurgentes Sur 1540, Del Valle, CDMX',
      limiteSucursales: 1,
      limiteBarberos: 3
    }
  });

  await prisma.suscripcion.create({
    data: {
      tenantId: tenant3.id,
      montoMensual: 499,
      estadoPago: 'past_due',
      diasGracia: 2, // 2 days grace period left!
      fechaUltimoCobro: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
      fechaProximoCobro: new Date()
    }
  });

  await prisma.sucursal.create({
    data: {
      tenantId: tenant3.id,
      nombre: 'Del Valle',
      direccion: 'Insurgentes Sur 1540, CDMX'
    }
  });

  await prisma.usuario.create({
    data: {
      tenantId: tenant3.id,
      nombre: 'Héctor Moreno',
      email: 'hector@urbanbarber.com',
      passwordHash: hash('Urban123!'),
      rol: 'DUENO',
      telefono: '5588990011'
    }
  });

  console.log('✅ SEED COMPLETED SUCCESSFULLY!');
  console.log(`- Super Admin: admin@systech.com`);
  console.log(`- Tenant 1 (PRO): ${tenant1.id} (slug: el-bigote)`);
  console.log(`- Tenant 2 (BASICO): ${tenant2.id} (slug: la-clasica)`);
  console.log(`- Tenant 3 (EN RIESGO): ${tenant3.id} (slug: urban-barber)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

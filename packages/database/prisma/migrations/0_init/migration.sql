-- ======================================================================
-- SYSTECH STUDIO - POSTGRESQL PRODUCTION INITIAL MIGRATION (0_init)
-- Versioned migration for multi-tenant deployment with Prisma
-- ======================================================================

-- CreateTable Plan
CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioMensual" DECIMAL(65,30) NOT NULL,
    "limiteSucursales" INTEGER NOT NULL DEFAULT 1,
    "limiteBarberos" INTEGER NOT NULL DEFAULT 3,
    "whatsappPro" BOOLEAN NOT NULL DEFAULT false,
    "analiticaAvanzada" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable Tenant
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'BASICO',
    "planId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "telefono" TEXT,
    "emailContacto" TEXT,
    "direccion" TEXT,
    "logoUrl" TEXT,
    "slogan" TEXT,
    "descripcion" TEXT,
    "portadaUrl" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "tiktok" TEXT,
    "whatsappPublico" TEXT,
    "limiteSucursales" INTEGER NOT NULL DEFAULT 1,
    "limiteBarberos" INTEGER NOT NULL DEFAULT 3,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable Sucursal
CREATE TABLE IF NOT EXISTS "Sucursal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "zonaHoraria" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "horarioApertura" TEXT NOT NULL DEFAULT '09:00',
    "horarioCierre" TEXT NOT NULL DEFAULT '20:00',
    "diasLaborales" TEXT NOT NULL DEFAULT 'Lunes a Sábado',
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable Usuario
CREATE TABLE IF NOT EXISTS "Usuario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "sucursalId" TEXT,
    "barberoId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable Barbero
CREATE TABLE IF NOT EXISTS "Barbero" (
    "id" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "avatarUrl" TEXT,
    "especialidad" TEXT,
    "descripcion" TEXT,
    "visibleEnWeb" BOOLEAN NOT NULL DEFAULT true,
    "comisionServiciosPct" DECIMAL(65,30) NOT NULL DEFAULT 50.0,
    "comisionProductosPct" DECIMAL(65,30) NOT NULL DEFAULT 10.0,
    "diasDescanso" TEXT NOT NULL DEFAULT 'Domingo',
    "horarioInicio" TEXT NOT NULL DEFAULT '09:00',
    "horarioFin" TEXT NOT NULL DEFAULT '20:00',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "Barbero_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClienteFinal
CREATE TABLE IF NOT EXISTS "ClienteFinal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "notas" TEXT,
    "totalVisitas" INTEGER NOT NULL DEFAULT 0,
    "fechaUltimaVisita" TIMESTAMP(3),
    "gastoTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "noShows" INTEGER NOT NULL DEFAULT 0,
    "fechaNacimiento" TIMESTAMP(3),
    "notasEstilo" TEXT,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "ClienteFinal_pkey" PRIMARY KEY ("id")
);

-- CreateTable Producto
CREATE TABLE IF NOT EXISTS "Producto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PRODUCTO',
    "categoria" TEXT NOT NULL DEFAULT 'General',
    "duracionMinutos" INTEGER NOT NULL DEFAULT 30,
    "sku" TEXT,
    "precioVenta" DECIMAL(65,30) NOT NULL,
    "costo" DECIMAL(65,30) DEFAULT 0,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable Cita
CREATE TABLE IF NOT EXISTS "Cita" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "barberoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "servicioId" TEXT,
    "nombreServicio" TEXT NOT NULL,
    "serviciosJson" TEXT,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "bufferMinutos" INTEGER NOT NULL DEFAULT 10,
    "precioEstimado" DECIMAL(65,30) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "codigoReserva" TEXT,
    "tokenCancelacion" TEXT,
    "notas" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable BloqueoHorario
CREATE TABLE IF NOT EXISTS "BloqueoHorario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "barberoId" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,

    CONSTRAINT "BloqueoHorario_pkey" PRIMARY KEY ("id")
);

-- CreateTable Venta
CREATE TABLE IF NOT EXISTS "Venta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "barberoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "citaId" TEXT,
    "folio" TEXT,
    "serie" TEXT NOT NULL DEFAULT 'A',
    "folioConsecutivo" INTEGER NOT NULL DEFAULT 1,
    "estado" TEXT NOT NULL DEFAULT 'COMPLETADA',
    "motivoCancelacion" TEXT,
    "canceladoPor" TEXT,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "propina" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "detallesPago" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable VentaItem
CREATE TABLE IF NOT EXISTS "VentaItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "nombreItem" TEXT NOT NULL,
    "tipoItem" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable Comision
CREATE TABLE IF NOT EXISTS "Comision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "barberoId" TEXT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "porcentaje" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "fechaPago" TIMESTAMP(3),
    "metodoPagoComision" TEXT,
    "corteCajaId" TEXT,

    CONSTRAINT "Comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable CorteCaja
CREATE TABLE IF NOT EXISTS "CorteCaja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "fondoInicial" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalEfectivo" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalTarjeta" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalTransferencia" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPropinas" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalVentas" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "conteoEfectivoReal" DECIMAL(65,30),
    "descuadre" DECIMAL(65,30),
    "notas" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',

    CONSTRAINT "CorteCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable KardexMovimiento
CREATE TABLE IF NOT EXISTS "KardexMovimiento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipoMovimiento" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stockAnterior" INTEGER NOT NULL,
    "stockNuevo" INTEGER NOT NULL,
    "motivo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,

    CONSTRAINT "KardexMovimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable NotificacionLog
CREATE TABLE IF NOT EXISTS "NotificacionLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ENVIADO',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuditoriaLog
CREATE TABLE IF NOT EXISTS "AuditoriaLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "usuarioEmail" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalles" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditoriaLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable Cupon
CREATE TABLE IF NOT EXISTS "Cupon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "codigo" TEXT NOT NULL,
    "descuentoPct" DECIMAL(65,30),
    "descuentoFijo" DECIMAL(65,30),
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "usosMaximos" INTEGER,
    "usosActuales" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Cupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable Proveedor
CREATE TABLE IF NOT EXISTS "Proveedor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "rfc" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable OrdenCompra
CREATE TABLE IF NOT EXISTS "OrdenCompra" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntrega" TIMESTAMP(3),
    "notas" TEXT,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable Resena
CREATE TABLE IF NOT EXISTS "Resena" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "citaId" TEXT,
    "barberoId" TEXT NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "clienteNombre" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resena_pkey" PRIMARY KEY ("id")
);

-- CreateTable ConsentimientoCliente
CREATE TABLE IF NOT EXISTS "ConsentimientoCliente" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "otorgado" BOOLEAN NOT NULL DEFAULT true,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipRegistro" TEXT,

    CONSTRAINT "ConsentimientoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable EventoPago
CREATE TABLE IF NOT EXISTS "EventoPago" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "proveedor" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tipoEvento" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClienteMembresia
CREATE TABLE IF NOT EXISTS "ClienteMembresia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombrePlan" TEXT NOT NULL,
    "cortesIncluidos" INTEGER NOT NULL DEFAULT 2,
    "cortesRestantes" INTEGER NOT NULL DEFAULT 2,
    "precioMensual" DECIMAL(65,30) NOT NULL DEFAULT 350,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClienteMembresia_pkey" PRIMARY KEY ("id")
);

-- CreateTable ListaEspera
CREATE TABLE IF NOT EXISTS "ListaEspera" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "clienteTelefono" TEXT NOT NULL,
    "servicioId" TEXT,
    "barberoId" TEXT,
    "fechaDeseada" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListaEspera_pkey" PRIMARY KEY ("id")
);

-- CreateTable MovimientoCaja
CREATE TABLE IF NOT EXISTS "MovimientoCaja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "corteCajaId" TEXT,
    "tipo" TEXT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "concepto" TEXT NOT NULL,
    "usuarioEmail" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable PagoNomina
CREATE TABLE IF NOT EXISTS "PagoNomina" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "barberoId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "folioConsecutivo" INTEGER NOT NULL,
    "fechaLiquidacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotalComisiones" DECIMAL(65,30) NOT NULL,
    "adelantos" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "deducciones" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netoPagado" DECIMAL(65,30) NOT NULL,
    "metodoPago" TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
    "concepto" TEXT,
    "detalles" TEXT,
    "usuarioLiquidador" TEXT,

    CONSTRAINT "PagoNomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable Secuencia
CREATE TABLE IF NOT EXISTS "Secuencia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL DEFAULT 'DEFAULT',
    "tipo" TEXT NOT NULL,
    "ultimoValor" INTEGER NOT NULL DEFAULT 0,
    "actualizado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Secuencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable Suscripcion
CREATE TABLE IF NOT EXISTS "Suscripcion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'BASICO',
    "estado" TEXT NOT NULL DEFAULT 'active',
    "periodoFin" TIMESTAMP(3),
    "cancelarAlFin" BOOLEAN NOT NULL DEFAULT false,
    "reintentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "fechaSuspension" TIMESTAMP(3),

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable Factura
CREATE TABLE IF NOT EXISTS "Factura" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ventaId" TEXT,
    "rfcEmisor" TEXT NOT NULL,
    "rfcReceptor" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "regimenFiscal" TEXT NOT NULL,
    "usoCfdi" TEXT NOT NULL,
    "codigoPostal" TEXT NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "iva" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "uuidFiscal" TEXT,
    "serie" TEXT NOT NULL DEFAULT 'F',
    "folio" TEXT NOT NULL,
    "fechaTimbrado" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'GENERADA',
    "xmlUrl" TEXT,
    "pdfUrl" TEXT,
    "errorDetalle" TEXT,
    "esPrueba" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- Unique constraints & Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_codigo_key" ON "Plan"("codigo");
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "ClienteFinal_tenantId_telefono_key" ON "ClienteFinal"("tenantId", "telefono");
CREATE UNIQUE INDEX IF NOT EXISTS "Venta_citaId_key" ON "Venta"("citaId");
CREATE UNIQUE INDEX IF NOT EXISTS "Venta_tenantId_sucursalId_folio_key" ON "Venta"("tenantId", "sucursalId", "folio");
CREATE UNIQUE INDEX IF NOT EXISTS "Cupon_codigo_key" ON "Cupon"("codigo");
CREATE UNIQUE INDEX IF NOT EXISTS "Resena_citaId_key" ON "Resena"("citaId");
CREATE UNIQUE INDEX IF NOT EXISTS "EventoPago_eventId_key" ON "EventoPago"("eventId");
CREATE UNIQUE INDEX IF NOT EXISTS "PagoNomina_tenantId_folio_key" ON "PagoNomina"("tenantId", "folio");
CREATE UNIQUE INDEX IF NOT EXISTS "Secuencia_tenantId_sucursalId_tipo_key" ON "Secuencia"("tenantId", "sucursalId", "tipo");
CREATE UNIQUE INDEX IF NOT EXISTS "Suscripcion_tenantId_key" ON "Suscripcion"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Factura_uuidFiscal_key" ON "Factura"("uuidFiscal");

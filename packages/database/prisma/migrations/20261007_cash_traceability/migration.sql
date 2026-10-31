-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "cobradoPorId" TEXT,
ADD COLUMN     "cobradoPorNombre" TEXT,
ADD COLUMN     "corteCajaId" TEXT,
ADD COLUMN     "propinaDevuelta" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "totalDevuelto" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Comision" ADD COLUMN     "devolucionId" TEXT,
ADD COLUMN     "origen" TEXT NOT NULL DEFAULT 'VENTA';

-- AlterTable
ALTER TABLE "CorteCaja" ADD COLUMN     "cierreHash" TEXT,
ADD COLUMN     "resumenJson" TEXT;

-- CreateTable
CREATE TABLE "CajaOperacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "respuesta" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CajaOperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroCaja" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "corteCajaId" TEXT,
    "ventaId" TEXT,
    "tipo" TEXT NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "custodiaUsuarioId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevolucionVenta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNombre" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "pagosJson" TEXT NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "comision" DECIMAL(65,30) NOT NULL,
    "propina" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevolucionVenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CajaOperacion_tenantId_clave_key" ON "CajaOperacion"("tenantId", "clave");

-- CreateIndex
CREATE INDEX "RegistroCaja_tenantId_sucursalId_corteCajaId_idx" ON "RegistroCaja"("tenantId", "sucursalId", "corteCajaId");

-- CreateIndex
CREATE INDEX "RegistroCaja_tenantId_custodiaUsuarioId_idx" ON "RegistroCaja"("tenantId", "custodiaUsuarioId");

-- CreateIndex
CREATE INDEX "DevolucionVenta_tenantId_ventaId_idx" ON "DevolucionVenta"("tenantId", "ventaId");

-- AddForeignKey
ALTER TABLE "DevolucionVenta" ADD CONSTRAINT "DevolucionVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


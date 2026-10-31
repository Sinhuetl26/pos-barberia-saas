ALTER TABLE "Producto" ALTER COLUMN "stockActual" TYPE DECIMAL(20,3), ALTER COLUMN "stockMinimo" TYPE DECIMAL(20,3);
ALTER TABLE "Producto" ADD COLUMN "naturaleza" TEXT NOT NULL DEFAULT 'REVENTA', ADD COLUMN "unidad" TEXT NOT NULL DEFAULT 'PIEZA', ADD COLUMN "presentacionNombre" TEXT, ADD COLUMN "presentacionCantidad" DECIMAL(20,3) NOT NULL DEFAULT 1;
ALTER TABLE "KardexMovimiento" ALTER COLUMN "cantidad" TYPE DECIMAL(20,3), ALTER COLUMN "stockAnterior" TYPE DECIMAL(20,3), ALTER COLUMN "stockNuevo" TYPE DECIMAL(20,3);
CREATE TABLE "RecetaServicio" ("id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "servicioId" TEXT NOT NULL, "version" INTEGER NOT NULL, "itemsJson" TEXT NOT NULL, "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "usuarioId" TEXT NOT NULL);
CREATE UNIQUE INDEX "RecetaServicio_tenantId_servicioId_version_key" ON "RecetaServicio"("tenantId", "servicioId", "version");
CREATE TABLE "ConsumoServicio" ("id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "sucursalId" TEXT NOT NULL, "servicioId" TEXT NOT NULL, "eventoClave" TEXT NOT NULL, "recetaVersion" INTEGER NOT NULL, "itemsJson" TEXT NOT NULL, "citaId" TEXT, "ventaId" TEXT, "usuarioId" TEXT NOT NULL, "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "ConsumoServicio_tenantId_eventoClave_servicioId_key" ON "ConsumoServicio"("tenantId", "eventoClave", "servicioId");
CREATE INDEX "ConsumoServicio_tenantId_sucursalId_fecha_idx" ON "ConsumoServicio"("tenantId", "sucursalId", "fecha");

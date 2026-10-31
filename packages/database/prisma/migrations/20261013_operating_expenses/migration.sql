CREATE TABLE "GastoOperativo" (
 "id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "sucursalId" TEXT NOT NULL,
 "concepto" TEXT NOT NULL, "categoria" TEXT NOT NULL, "fecha" TIMESTAMP(3) NOT NULL,
 "importe" DECIMAL(20,2) NOT NULL, "metodoPago" TEXT NOT NULL, "comprobanteReferencia" TEXT,
 "registroCajaId" TEXT, "usuarioId" TEXT NOT NULL, "usuarioNombre" TEXT NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1, "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "GastoOperativo_registroCajaId_key" ON "GastoOperativo"("registroCajaId");
CREATE INDEX "GastoOperativo_tenantId_sucursalId_fecha_idx" ON "GastoOperativo"("tenantId","sucursalId","fecha");
CREATE TABLE "CorreccionGasto" (
 "id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "sucursalId" TEXT NOT NULL,
 "gastoId" TEXT NOT NULL, "version" INTEGER NOT NULL, "registroCajaId" TEXT, "anteriorJson" TEXT NOT NULL,
 "actualJson" TEXT NOT NULL, "motivo" TEXT NOT NULL, "usuarioId" TEXT NOT NULL,
 "usuarioNombre" TEXT NOT NULL, "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CorreccionGasto_gastoId_version_key" ON "CorreccionGasto"("gastoId","version");
CREATE INDEX "CorreccionGasto_tenantId_sucursalId_gastoId_idx" ON "CorreccionGasto"("tenantId","sucursalId","gastoId");

CREATE UNIQUE INDEX "CorreccionGasto_registroCajaId_key" ON "CorreccionGasto"("registroCajaId");

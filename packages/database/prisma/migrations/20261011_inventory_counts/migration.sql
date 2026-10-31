CREATE TABLE "ConteoInventario" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "sucursalId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
  "version" INTEGER NOT NULL DEFAULT 0,
  "itemsJson" TEXT NOT NULL,
  "motivo" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmadoEn" TIMESTAMP(3)
);
CREATE INDEX "ConteoInventario_tenantId_sucursalId_fecha_idx" ON "ConteoInventario"("tenantId", "sucursalId", "fecha");

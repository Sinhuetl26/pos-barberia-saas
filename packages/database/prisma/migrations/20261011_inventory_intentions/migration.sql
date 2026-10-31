ALTER TABLE "KardexMovimiento" ADD COLUMN "metadataJson" TEXT;
CREATE TABLE "InventarioOperacion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "clave" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "respuesta" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "InventarioOperacion_tenantId_clave_key" ON "InventarioOperacion"("tenantId", "clave");

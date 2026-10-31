ALTER TABLE "Cita" ADD COLUMN "tokenExpiraEn" TIMESTAMP(3);
ALTER TABLE "Cita" ADD COLUMN "claveReserva" TEXT;
ALTER TABLE "Cita" ADD COLUMN "solicitudHash" TEXT;
CREATE UNIQUE INDEX "Cita_tenantId_claveReserva_key" ON "Cita"("tenantId", "claveReserva");
CREATE TABLE "ReservaLimite" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "contador" INTEGER NOT NULL DEFAULT 0, "expiraEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "ReservaLimite_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ReservaLimite_expiraEn_idx" ON "ReservaLimite"("expiraEn");

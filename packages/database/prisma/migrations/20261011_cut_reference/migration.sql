ALTER TABLE "Cita" ADD COLUMN "tipoCorte" TEXT;
CREATE TABLE "CitaReferencia" (
  "citaId" TEXT NOT NULL PRIMARY KEY,
  "imagen" TEXT NOT NULL,
  CONSTRAINT "CitaReferencia_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

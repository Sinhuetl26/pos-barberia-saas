-- Upgrade legacy subscriptions without discarding their original metadata.
BEGIN;
ALTER TABLE "Suscripcion" RENAME COLUMN "estado" TO "estadoPago";
ALTER TABLE "Suscripcion" RENAME COLUMN "periodoFin" TO "fechaProximoCobro";

-- Legacy anonymous appointments get an explicit placeholder, never a fabricated phone.
INSERT INTO "ClienteFinal" ("id", "tenantId", "nombre")
SELECT 'st04-legacy-' || "id", "tenantId", 'Cliente sin datos (migración)'
FROM "Cita" WHERE "clienteId" IS NULL;
UPDATE "Cita" SET "clienteId" = 'st04-legacy-' || "id" WHERE "clienteId" IS NULL;

-- AlterTable
ALTER TABLE "AuthAction" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "consumedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "nextAttemptAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AuthThrottle" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Cita" ALTER COLUMN "clienteId" SET NOT NULL,
ALTER COLUMN "nombreServicio" DROP NOT NULL,
ALTER COLUMN "duracionMinutos" SET DEFAULT 30,
ALTER COLUMN "precioEstimado" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Secuencia" ALTER COLUMN "actualizado" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Suscripcion" ADD COLUMN     "diasGracia" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "fechaUltimoCobro" TIMESTAMP(3),
ADD COLUMN     "montoMensual" DECIMAL(65,30) NOT NULL DEFAULT 499;

-- AlterTable
ALTER TABLE "Usuario" ALTER COLUMN "emailVerifiedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VentaItem" ALTER COLUMN "tipoItem" SET DEFAULT 'PRODUCTO',
ALTER COLUMN "cantidad" SET DEFAULT 1;


-- Preserve the actual linked plan amount when available, otherwise use the tenant catalog.
UPDATE "Suscripcion" s SET "montoMensual" = COALESCE(p."precioMensual",
  CASE UPPER(t."plan") WHEN 'PRO' THEN 999 WHEN 'CADENA' THEN 2699 ELSE 499 END)
FROM "Tenant" t LEFT JOIN "Plan" p ON p."id" = t."planId"
WHERE s."tenantId" = t."id";
COMMIT;

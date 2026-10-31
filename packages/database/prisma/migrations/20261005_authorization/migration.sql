-- Additive authorization metadata. Legacy branch assignments are kept intact.
ALTER TABLE "Usuario" ADD COLUMN "sucursalesAsignadasJson" TEXT;
ALTER TABLE "ClienteFinal" ADD COLUMN "sucursalOrigenId" TEXT;

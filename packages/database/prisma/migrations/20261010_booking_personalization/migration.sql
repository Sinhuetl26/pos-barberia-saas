-- Additive and backwards compatible; old tenant profiles retain their existing presentation.
ALTER TABLE "Tenant" ADD COLUMN "personalizacionWeb" TEXT;

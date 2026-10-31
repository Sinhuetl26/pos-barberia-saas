ALTER TABLE "Sucursal" ADD COLUMN "configuradaEn" TIMESTAMP(3);
ALTER TABLE "AuthAction" ADD COLUMN "providerMessageId" TEXT;
ALTER TABLE "AuthAction" ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING';
CREATE UNIQUE INDEX "AuthAction_providerMessageId_key" ON "AuthAction"("providerMessageId");
CREATE TABLE "EmailDeliveryEvent" ("id" TEXT PRIMARY KEY NOT NULL,"emailId" TEXT NOT NULL,"status" TEXT NOT NULL,"occurredAt" TIMESTAMP(3) NOT NULL,"receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "EmailDeliveryEvent_emailId_idx" ON "EmailDeliveryEvent"("emailId");
CREATE TABLE "EmailSuppression" ("id" TEXT PRIMARY KEY NOT NULL,"reason" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);

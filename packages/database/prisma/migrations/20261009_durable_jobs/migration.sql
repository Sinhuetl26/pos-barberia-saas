CREATE TABLE "DurableJob" (
 "id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "key" TEXT NOT NULL,
 "kind" TEXT NOT NULL, "provider" TEXT NOT NULL, "entityId" TEXT, "entityVersion" TEXT,
 "state" TEXT NOT NULL DEFAULT 'QUEUED', "attempts" INTEGER NOT NULL DEFAULT 0,
 "maxAttempts" INTEGER NOT NULL DEFAULT 4, "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL, "leaseToken" TEXT, "leaseUntil" TIMESTAMP(3),
 "lastCode" TEXT, "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "DurableJob_tenantId_key_key" ON "DurableJob"("tenantId", "key");
CREATE INDEX "DurableJob_state_availableAt_idx" ON "DurableJob"("state", "availableAt");
CREATE INDEX "DurableJob_tenantId_provider_state_idx" ON "DurableJob"("tenantId", "provider", "state");
CREATE TABLE "JobProviderControl" (
 "id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "provider" TEXT NOT NULL,
 "paused" BOOLEAN NOT NULL DEFAULT false, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "JobProviderControl_tenantId_provider_key" ON "JobProviderControl"("tenantId", "provider");
CREATE TABLE "JobWorkerPulse" ("id" TEXT NOT NULL PRIMARY KEY, "lastSeen" TIMESTAMP(3) NOT NULL, "rssBytes" INTEGER NOT NULL);

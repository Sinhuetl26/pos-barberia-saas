ALTER TABLE "Usuario" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Usuario" ADD COLUMN "emailVerifiedAt" TIMESTAMP;
-- Existing accounts are explicitly unverified; enforce verification at production rollout.
ALTER TABLE "Usuario" ADD COLUMN "verificationRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "invitationPending" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "AuthAction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "sessionVersion" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "consumedAt" TIMESTAMP,
  "encryptedToken" TEXT,
  "mailStatus" TEXT NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AuthAction_tokenHash_key" ON "AuthAction"("tokenHash");
CREATE INDEX "AuthAction_userId_purpose_idx" ON "AuthAction"("userId", "purpose");
CREATE INDEX "AuthAction_mailStatus_nextAttemptAt_idx" ON "AuthAction"("mailStatus", "nextAttemptAt");
CREATE TABLE "AuthThrottle" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP NOT NULL
);
CREATE INDEX "AuthThrottle_expiresAt_idx" ON "AuthThrottle"("expiresAt");

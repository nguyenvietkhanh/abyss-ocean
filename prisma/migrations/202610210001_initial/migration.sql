CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "role" TEXT NOT NULL DEFAULT 'PLAYER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "WalletAccount" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "publicKey" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL
);
CREATE TABLE "AuthChallenge" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "publicKey" TEXT NOT NULL,
  "nonce" TEXT NOT NULL UNIQUE,
  "message" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3)
);
CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "FishSpecies" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "displayName" TEXT NOT NULL,
  "rarity" TEXT NOT NULL,
  "appearance" JSONB NOT NULL,
  "animationRef" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB NOT NULL
);
CREATE TABLE "FishCatalogPrice" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "speciesId" TEXT NOT NULL,
  "lamports" BIGINT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("speciesId","version")
);
CREATE TABLE "OwnedFish" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ownerId" TEXT NOT NULL,
  "speciesId" TEXT NOT NULL,
  "appearanceId" TEXT NOT NULL,
  "acquisitionSource" TEXT NOT NULL,
  "orderId" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'OWNED'
);
CREATE TABLE "FishAcquisitionOrder" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "payer" TEXT NOT NULL,
  "speciesId" TEXT NOT NULL,
  "appearanceId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "priceLamports" BIGINT NOT NULL,
  "destination" TEXT NOT NULL,
  "intent" TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "fulfilledAt" TIMESTAMP(3)
);
CREATE TABLE "DevnetTransaction" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "signature" TEXT NOT NULL UNIQUE,
  "orderId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL,
  "slot" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "FishSurvivalRun" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "fishId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "biomass" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "cause" TEXT
);
CREATE TABLE "ArenaMatch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3)
);
CREATE TABLE "ArenaParticipant" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "matchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "biomass" DOUBLE PRECISION NOT NULL,
  "rank" INTEGER NOT NULL,
  UNIQUE ("matchId","userId")
);
CREATE TABLE "GameEvent" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "runId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "PearlLedger" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "reference" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "PlayerAchievement" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId","code")
);
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "WalletAccount" ADD FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT;
CREATE INDEX "AuthChallenge_idx_0" ON "AuthChallenge" ("expiresAt");
ALTER TABLE "Session" ADD FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT;
CREATE INDEX "Session_idx_0" ON "Session" ("userId");
CREATE INDEX "Session_idx_1" ON "Session" ("expiresAt");
ALTER TABLE "FishCatalogPrice" ADD FOREIGN KEY ("speciesId") REFERENCES "FishSpecies" ("id") ON DELETE RESTRICT;
ALTER TABLE "OwnedFish" ADD FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT;
ALTER TABLE "OwnedFish" ADD FOREIGN KEY ("speciesId") REFERENCES "FishSpecies" ("id") ON DELETE RESTRICT;
ALTER TABLE "OwnedFish" ADD FOREIGN KEY ("orderId") REFERENCES "FishAcquisitionOrder" ("id") ON DELETE RESTRICT;
CREATE INDEX "OwnedFish_idx_0" ON "OwnedFish" ("ownerId","status");
ALTER TABLE "FishAcquisitionOrder" ADD FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT;
ALTER TABLE "FishAcquisitionOrder" ADD FOREIGN KEY ("speciesId") REFERENCES "FishSpecies" ("id") ON DELETE RESTRICT;
CREATE INDEX "FishAcquisitionOrder_idx_0" ON "FishAcquisitionOrder" ("userId","createdAt");
ALTER TABLE "DevnetTransaction" ADD FOREIGN KEY ("orderId") REFERENCES "FishAcquisitionOrder" ("id") ON DELETE RESTRICT;
ALTER TABLE "FishSurvivalRun" ADD FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT;
ALTER TABLE "FishSurvivalRun" ADD FOREIGN KEY ("fishId") REFERENCES "OwnedFish" ("id") ON DELETE RESTRICT;
CREATE INDEX "FishSurvivalRun_idx_0" ON "FishSurvivalRun" ("userId","endedAt");
CREATE INDEX "FishSurvivalRun_idx_1" ON "FishSurvivalRun" ("fishId","endedAt");
ALTER TABLE "ArenaParticipant" ADD FOREIGN KEY ("matchId") REFERENCES "ArenaMatch" ("id") ON DELETE RESTRICT;
ALTER TABLE "ArenaParticipant" ADD FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT;
CREATE INDEX "GameEvent_idx_0" ON "GameEvent" ("runId");
ALTER TABLE "PearlLedger" ADD FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT;
CREATE INDEX "PearlLedger_idx_0" ON "PearlLedger" ("userId");
ALTER TABLE "PlayerAchievement" ADD FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT;
CREATE INDEX "AuditLog_idx_0" ON "AuditLog" ("entityId");
CREATE INDEX "AuditLog_idx_1" ON "AuditLog" ("createdAt");
CREATE UNIQUE INDEX "one_active_run_per_fish" ON "FishSurvivalRun" ("fishId") WHERE "endedAt" IS NULL;
ALTER TABLE "FishCatalogPrice" ADD CHECK (lamports > 0);
ALTER TABLE "FishAcquisitionOrder" ADD CHECK ("priceLamports" > 0), ADD CHECK (mode IN ('MOCK','DEVNET')), ADD CHECK (status IN ('PENDING','FULFILLED','FAILED','EXPIRED'));
ALTER TABLE "OwnedFish" ADD CHECK (status IN ('OWNED','ARCHIVED'));
ALTER TABLE "User" ADD CHECK (role IN ('PLAYER','ADMIN'));
CREATE FUNCTION prevent_fish_owner_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."ownerId" <> OLD."ownerId" THEN RAISE EXCEPTION 'Fish ownership is immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER fish_owner_immutable BEFORE UPDATE ON "OwnedFish" FOR EACH ROW EXECUTE FUNCTION prevent_fish_owner_change();

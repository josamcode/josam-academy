-- CreateEnum
CREATE TYPE "entitlement_kind" AS ENUM ('content', 'feature', 'quota');

-- CreateEnum
CREATE TYPE "entitlement_source" AS ENUM ('order', 'subscription', 'manual', 'free', 'promotion');

-- CreateEnum
CREATE TYPE "quota_period" AS ENUM ('monthly', 'lifetime');

-- CreateEnum
CREATE TYPE "entitlement_event" AS ENUM ('granted', 'extended', 'revoked', 'expired', 'quota_reset', 'quota_adjusted');

-- CreateTable
CREATE TABLE "entitlements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "entitlement_kind" NOT NULL,
    "source_type" "entitlement_source" NOT NULL,
    "source_id" TEXT,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "grace_ends_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "quota_limit" INTEGER,
    "quota_period" "quota_period",
    "quota_consumed" INTEGER NOT NULL DEFAULT 0,
    "period_started_at" TIMESTAMPTZ(6),
    "reason" TEXT,
    "granted_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_events" (
    "id" TEXT NOT NULL,
    "entitlement_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event" "entitlement_event" NOT NULL,
    "actor_id" TEXT,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlement_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ent_source" ON "entitlements"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "idx_ent_events_user" ON "entitlement_events"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_events" ADD CONSTRAINT "entitlement_events_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_events" ADD CONSTRAINT "entitlement_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_events" ADD CONSTRAINT "entitlement_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- HAND-WRITTEN — 10 §TBL-021 partial indexes Prisma cannot express.
-- ═══════════════════════════════════════════════════════════════════════════════════════════

-- BR-981 — the hottest index in the database: every content read resolves through it (BR-823),
-- and it is PH-1.14's named Output ("hot lookup index in place"). The predicate is the point:
-- a revoked entitlement is never a lookup target, and BR-983 evaluates expiry at read time, so
-- revoked_at is the ONLY tombstone the index can exclude — dropping the predicate makes the
-- index quietly serve access rows the application treats as withdrawn.
CREATE INDEX "idx_ent_lookup" ON "entitlements"("user_id", "key")
  WHERE "revoked_at" IS NULL;

-- BR-983 — expiry sweeps read only live, expiring rows; NULL expires_at means lifetime and can
-- never match a range scan, so both predicate halves shrink the index to the rows that matter.
CREATE INDEX "idx_ent_expiry" ON "entitlements"("expires_at")
  WHERE "revoked_at" IS NULL AND "expires_at" IS NOT NULL;

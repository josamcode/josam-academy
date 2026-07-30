-- PH-1.1 — M01 Identity (TBL-001..006) plus TBL-007 roles.
--
-- `roles` is created here, not in PH-1.7: 10 §TBL-001 declares
-- `users.role_id NOT NULL REFERENCES roles(id)`, which made the documented task order circular.
-- BR-1842. Enforced by `pnpm check:fk-order`.
--
-- Everything below the "hand-written" marker is SQL Prisma cannot express. It is not optional
-- decoration — see the note on each block.

-- BR-954 / BR-002 — case-insensitive email uniqueness. Prisma emits the CITEXT column type but
-- never the extension that defines it, so without this line the migration fails on the first
-- CITEXT column. Found by running it, not by reading the generated file.
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'pending_deletion', 'deleted');

-- CreateEnum
CREATE TYPE "theme_mode" AS ENUM ('light', 'dark', 'system');

-- CreateEnum
CREATE TYPE "persona_type" AS ENUM ('career_switcher', 'freelancer', 'professional', 'builder', 'casual');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('password', 'google', 'phone');

-- CreateEnum
CREATE TYPE "client_platform" AS ENUM ('web', 'ios', 'android');

-- CreateEnum
CREATE TYPE "token_purpose" AS ENUM ('email_verify', 'password_reset', 'email_change');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "email" CITEXT,
    "email_verified_at" TIMESTAMPTZ(6),
    "phone" TEXT,
    "phone_verified_at" TIMESTAMPTZ(6),
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_key" TEXT,
    "bio" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "theme_preference" "theme_mode" NOT NULL DEFAULT 'system',
    "country_code" CHAR(2),
    "permission_version" INTEGER NOT NULL DEFAULT 1,
    "persona" "persona_type",
    "status" "user_status" NOT NULL DEFAULT 'active',
    "last_active_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "provider_email" CITEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "linked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_label" TEXT,
    "user_agent" TEXT,
    "ip_address" INET,
    "platform" "client_platform" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "rotated_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_reason" TEXT,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose" "token_purpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "target" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_activity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email_attempt" CITEXT,
    "success" BOOLEAN NOT NULL,
    "provider" "auth_provider",
    "ip_address" INET,
    "country_code" CHAR(2),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "idx_users_created" ON "users"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_identities_user" ON "user_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_provider_user_id_key" ON "user_identities"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_family" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_otp_phone" ON "otp_codes"("phone", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_login_user" ON "login_activity"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_activity" ADD CONSTRAINT "login_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- HAND-WRITTEN — 10 §TBL-001..007 constraints and partial indexes Prisma cannot express.
-- ═══════════════════════════════════════════════════════════════════════════════════════════

-- TBL-001 — a user must be reachable by at least one identifier. Without this, a row with
-- neither email nor phone is insertable and can never authenticate or be contacted.
ALTER TABLE "users"
  ADD CONSTRAINT "has_identity" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);

-- BR-953 / BR-951 / BR-524 — Arabic is the source of truth and cannot be empty. `description`
-- is nullable, so its check permits NULL but not a value missing `ar`: a nullable bilingual
-- column that accepts `{"en": "..."}` is exactly the hole the rule exists to close.
ALTER TABLE "roles"
  ADD CONSTRAINT "roles_name_has_arabic"
  CHECK ("name" ? 'ar' AND length("name"->>'ar') > 0);

ALTER TABLE "roles"
  ADD CONSTRAINT "roles_description_has_arabic"
  CHECK ("description" IS NULL OR ("description" ? 'ar' AND length("description"->>'ar') > 0));

-- PARTIAL INDEXES — 10 §TBL-001, §TBL-003, §TBL-004.
--
-- The predicate is the point. BR-957 anonymises a deleted user rather than removing the row, so
-- `WHERE deleted_at IS NULL` is what keeps soft-deleted rows out of the live lookup path; drop it
-- and the index still "works" while quietly serving rows the application treats as gone.
CREATE INDEX "idx_users_email" ON "users"("email") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_users_phone" ON "users"("phone") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_users_last_active" ON "users"("last_active_at" DESC) WHERE "deleted_at" IS NULL;

-- BR-960 — reuse detection reads only live tokens; a revoked family is never a lookup target.
CREATE INDEX "idx_refresh_user" ON "refresh_tokens"("user_id") WHERE "revoked_at" IS NULL;
CREATE INDEX "idx_refresh_expiry" ON "refresh_tokens"("expires_at") WHERE "revoked_at" IS NULL;

-- A consumed verification token is never looked up again — only unconsumed ones are.
CREATE INDEX "idx_verification_user" ON "verification_tokens"("user_id", "purpose")
  WHERE "consumed_at" IS NULL;

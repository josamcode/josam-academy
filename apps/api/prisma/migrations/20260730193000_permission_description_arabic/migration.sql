-- PH-1.7 — BR-953's Arabic-key check on `permissions.description`.
--
-- A SEPARATE migration rather than an edit to `20260730192552_access_permissions`, which had
-- already been applied. Editing an applied migration leaves the FILE carrying a constraint the
-- local database does not have, while a fresh database built from the files gets it — the exact
-- local/CI divergence BR-1844 is about, introduced while fixing something else. Migrations are
-- append-only once applied.
--
-- `description` is a NULLABLE bilingual JSONB, so the check permits NULL but not a value missing
-- `ar`. A nullable bilingual column that accepts `{"en": "..."}` is the hole BR-951 and BR-524
-- exist to close: Arabic is the source of truth, and an English-only permission description is
-- one the primary audience cannot read.
ALTER TABLE "permissions"
  ADD CONSTRAINT "permissions_description_has_arabic"
  CHECK ("description" IS NULL OR ("description" ? 'ar' AND length("description"->>'ar') > 0));

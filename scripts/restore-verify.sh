#!/usr/bin/env sh
#
# `PH-0.28` — weekly restore verification.
#
# **A backup that has never been restored is not a backup.** `15 §Phase 0`'s criterion is "restore
# verified from a clean database", and the operative word is *verified*: this script has to RUN and
# report, not exist and be configured. `BR-1830` — a mechanism nobody has watched succeed is not a
# mechanism.
#
# What it does:
#   1. finds the newest backup in R2
#   2. downloads it
#   3. creates a **brand-new throwaway database** — never the live one
#   4. restores into it
#   5. asserts the restore actually produced something
#   6. drops the throwaway database, always, including on failure
#
# ## What it does NOT touch
#
# - **The live Josam Academy database.** It is read only in the sense that its *name* is used to
#   derive the throwaway name; nothing connects to it to write. The restore target is a database
#   created by this script and dropped by it.
# - **The client PostgreSQL instance** (`SB-24`). Different server, different credentials, out of
#   scope. This script cannot reach it and must never be pointed at it.
# - **`coolify-proxy` or any client container.** No Docker command appears in this file.
set -eu

: "${PGHOST:?PGHOST is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"
: "${R2_ENDPOINT:?R2_ENDPOINT is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"

PGPORT="${PGPORT:-5432}"
BACKUP_PREFIX="${BACKUP_PREFIX:-daily}"

# A distinct, obviously-temporary name. `restore_check_` prefix so that if a run is ever killed
# between create and drop, what was left behind is unmistakable.
STAMP="$(date -u +%Y%m%d%H%M%S)"
CHECK_DB="restore_check_${STAMP}"

# `postgres` is the maintenance database — connecting there to issue CREATE/DROP DATABASE, never to
# the database being replaced.
MAINT_DB="${MAINT_DB:-postgres}"

TMP="$(mktemp -d)"

cleanup() {
    # Drop the throwaway database on every exit path. A restore check that leaves databases behind
    # fills the disk of a box shared with five clients' projects, one week at a time.
    if [ -n "${CHECK_DB:-}" ]; then
        dropdb --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" \
            --if-exists "${CHECK_DB}" >/dev/null 2>&1 || true
    fi
    rm -rf "${TMP}"
}
trap cleanup EXIT INT TERM

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
fail() { log "restore-verify: FAILED — $*"; exit 1; }

log "restore-verify: starting"

# ── 1. Newest backup
#
# The stamp in the key sorts lexically in chronological order, so the last line of a sorted listing
# is the newest. No date parsing, and no dependence on the listing order R2 happens to return.
NEWEST="$(
    aws s3 ls "s3://${R2_BUCKET}/${BACKUP_PREFIX}/" --endpoint-url "${R2_ENDPOINT}" |
        awk '{print $4}' | grep -E '^josam-.*\.dump$' | sort | tail -1
)"

[ -n "${NEWEST}" ] || fail "no backup found under s3://${R2_BUCKET}/${BACKUP_PREFIX}/"

log "restore-verify: newest backup is ${NEWEST}"

# ── 2. Download
aws s3 cp "s3://${R2_BUCKET}/${BACKUP_PREFIX}/${NEWEST}" "${TMP}/${NEWEST}" \
    --endpoint-url "${R2_ENDPOINT}" --only-show-errors

SIZE="$(wc -c < "${TMP}/${NEWEST}" | tr -d ' ')"
[ "${SIZE}" -gt 100 ] || fail "downloaded file is ${SIZE} bytes"
head -c 5 "${TMP}/${NEWEST}" | grep -q 'PGDMP' || fail "downloaded file is not a custom-format dump"

log "restore-verify: downloaded ${SIZE} bytes, format check passed"

# ── 3. A clean database
#
# The criterion says "from a clean database", and this is the part that makes it true: a fresh
# database with nothing in it, so anything found after the restore came out of the backup and could
# not have been there already.
createdb --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" \
    --maintenance-db="${MAINT_DB}" "${CHECK_DB}" ||
    fail "could not create the throwaway database ${CHECK_DB}"

log "restore-verify: created clean database ${CHECK_DB}"

# ── 4. Restore
#
# `--exit-on-error` so a partially restored database is never reported as a success. Without it
# `pg_restore` continues past failures and exits 0 with warnings, which is the exact shape of a
# verification that passes while verifying nothing.
pg_restore \
    --host="${PGHOST}" \
    --port="${PGPORT}" \
    --username="${PGUSER}" \
    --dbname="${CHECK_DB}" \
    --no-owner \
    --no-privileges \
    --exit-on-error \
    "${TMP}/${NEWEST}" ||
    fail "pg_restore did not complete cleanly"

log "restore-verify: pg_restore completed with no errors"

# ── 5. Assert the restored database is queryable, and say what is in it
#
# `pg_restore` succeeding is necessary and not sufficient. This connects to the restored database
# and reads the catalogue, which is the difference between "the tool exited 0" and "there is a
# working database here".
#
# **Phase 0 has one empty migration, so the expected table count is 0** plus Prisma's own
# `_prisma_migrations`. That is not a weaker check than it looks: it proves the pipeline —
# dump, upload, download, create, restore, query — end to end. The assertion that grows teeth is
# the migrations one below, which is real from the first schema change onward.
TABLES="$(
    psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" --dbname="${CHECK_DB}" \
        --tuples-only --no-align --command \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
)"
TABLES="$(printf '%s' "${TABLES}" | tr -d ' ')"

log "restore-verify: restored database has ${TABLES} public tables"

# The migration ledger must survive the round trip. From the first real schema change onward this is
# the assertion that would catch a dump taken against the wrong database or a restore that silently
# dropped objects.
MIGRATIONS="$(
    psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" --dbname="${CHECK_DB}" \
        --tuples-only --no-align --command \
        "SELECT count(*) FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = '_prisma_migrations';"
)"
MIGRATIONS="$(printf '%s' "${MIGRATIONS}" | tr -d ' ')"

if [ "${MIGRATIONS}" != "1" ]; then
    fail "the restored database has no _prisma_migrations table — the dump did not contain the schema ledger"
fi

APPLIED="$(
    psql --host="${PGHOST}" --port="${PGPORT}" --username="${PGUSER}" --dbname="${CHECK_DB}" \
        --tuples-only --no-align --command \
        "SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL;"
)"
APPLIED="$(printf '%s' "${APPLIED}" | tr -d ' ')"

[ "${APPLIED}" -ge 1 ] || fail "the restored ledger records ${APPLIED} applied migrations; expected at least 1"

log "restore-verify: ledger intact — ${APPLIED} applied migration(s) survived the round trip"

# ── 6. Record the result where the health indicator can see it
#
# A verification nobody reads is a verification that stops happening without anyone noticing. This
# writes a small marker object to R2, and `last_backup` reports its age alongside the dump's — so a
# restore check that quietly stopped running becomes visible in `GET /health` rather than in a
# calendar reminder.
printf 'verified=%s newest=%s tables=%s migrations=%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${NEWEST}" "${TABLES}" "${APPLIED}" > "${TMP}/last-verify.txt"

aws s3 cp "${TMP}/last-verify.txt" "s3://${R2_BUCKET}/verify/last-verify.txt" \
    --endpoint-url "${R2_ENDPOINT}" --only-show-errors ||
    log "restore-verify: could not write the marker — NOT fatal, the restore itself passed"

log "restore-verify: PASSED — ${NEWEST} restores into a clean database"

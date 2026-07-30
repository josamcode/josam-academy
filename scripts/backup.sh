#!/usr/bin/env sh
#
# `PH-0.28` — daily backup of the Josam Academy database to Cloudflare R2.
#
# `DEC-57` / `BR-1726` — backups ship before any real data exists, because adding them afterwards
# means the window in which loss was unrecoverable was real.
#
# ## SCOPE — read this before assuming anything is covered
#
# This script backs up **the Josam Academy database only**, named by `PGDATABASE`.
#
# `SB-24` — the box runs **two** PostgreSQL instances: this project's, and the clients' separate
# `postgres:18-alpine`. **The client database is NOT backed up by this script and is not this
# project's to back up.** It is stated here, in the script itself, and not only in a document,
# because a backup job on a machine with two databases is exactly the situation where somebody later
# assumes both are covered.
#
# `SB-17` — the provider's weekly VM snapshots are **not** backup coverage. They are never
# exercised, never proven to restore, and capture a torn `pg` data directory rather than a
# consistent dump. Never count them.
#
# ## Failure behaviour
#
# `set -eu` and an explicit exit code. This script fails **loudly and completely** rather than
# uploading a partial dump: a truncated backup that uploads successfully is worse than no backup,
# because `last_backup` would report it as fresh.
set -eu

# ── Configuration, all from the environment. Nothing is defaulted that would be wrong to guess.
: "${PGHOST:?PGHOST is required}"
: "${PGDATABASE:?PGDATABASE is required — the Josam Academy database, not the client one}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"
: "${R2_ENDPOINT:?R2_ENDPOINT is required — the S3 API endpoint for the R2 account}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"

PGPORT="${PGPORT:-5432}"
BACKUP_PREFIX="${BACKUP_PREFIX:-daily}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"

# UTC, and sortable. Lexical order equals chronological order, which is what lets `last_backup` and
# the restore check find the newest object without parsing dates or listing every key.
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
KEY="${BACKUP_PREFIX}/josam-${STAMP}.dump"
TMP="$(mktemp -d)"
DUMP="${TMP}/josam-${STAMP}.dump"

cleanup() {
    # The dump contains the whole database. It never outlives the run, on success or on failure.
    rm -rf "${TMP}"
}
trap cleanup EXIT INT TERM

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

log "backup: starting — database=${PGDATABASE} host=${PGHOST} key=${KEY}"

# ── 1. Dump
#
# `--format=custom` rather than plain SQL: it is compressed, and it is the only format
# `pg_restore` can restore selectively or in parallel — which matters the first time a restore is
# needed under pressure and only one table is wrong.
#
# `--no-owner --no-privileges` so the dump restores into a throwaway database owned by a different
# role. Without them, `restore-verify.sh` fails on role assignments that have nothing to do with
# whether the data is intact.
pg_dump \
    --host="${PGHOST}" \
    --port="${PGPORT}" \
    --username="${PGUSER}" \
    --dbname="${PGDATABASE}" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --file="${DUMP}"

SIZE="$(wc -c < "${DUMP}" | tr -d ' ')"
log "backup: dump complete — ${SIZE} bytes"

# ── 2. Refuse to upload something that cannot be a real dump
#
# A custom-format dump begins with the magic string `PGDMP`. Checking it costs nothing and catches
# the case that matters: `pg_dump` exiting 0 having written a truncated or empty file. Size alone is
# not enough — an empty database still produces a valid dump of a few hundred bytes, so the format
# check is the real assertion and the size floor is only a backstop.
if [ "${SIZE}" -lt 100 ]; then
    log "backup: FAILED — dump is ${SIZE} bytes, which cannot be a valid dump"
    exit 1
fi

if ! head -c 5 "${DUMP}" | grep -q 'PGDMP'; then
    log "backup: FAILED — dump does not begin with the PGDMP magic string; it is not a custom-format dump"
    exit 1
fi

# ── 3. Upload
#
# R2 is S3-compatible, so the standard client works with an endpoint override. `--only-show-errors`
# keeps the log readable; a failure still prints.
aws s3 cp "${DUMP}" "s3://${R2_BUCKET}/${KEY}" \
    --endpoint-url "${R2_ENDPOINT}" \
    --only-show-errors

# ── 4. Verify it is actually THERE
#
# `aws s3 cp` exiting 0 is not evidence the object exists — this reads it back and compares the
# size. `BR-1830`'s shape: the mechanism has to be asked, not assumed. This is also the step that
# makes `last_backup` meaningful, because that indicator reads the same bucket.
REMOTE_SIZE="$(
    aws s3api head-object \
        --bucket "${R2_BUCKET}" \
        --key "${KEY}" \
        --endpoint-url "${R2_ENDPOINT}" \
        --query 'ContentLength' \
        --output text
)"

if [ "${REMOTE_SIZE}" != "${SIZE}" ]; then
    log "backup: FAILED — uploaded ${SIZE} bytes but the object reports ${REMOTE_SIZE}"
    exit 1
fi

log "backup: uploaded and verified — s3://${R2_BUCKET}/${KEY} (${REMOTE_SIZE} bytes)"

# ── 5. Retention
#
# Deliberately last, and deliberately non-fatal. A retention failure must never fail a run whose
# backup already succeeded — the backup is the point, and pruning is housekeeping. It also runs
# only after the new object is verified present, so a failing backup can never delete the last good
# one.
CUTOFF="$(date -u -d "${RETAIN_DAYS} days ago" +%Y%m%dT%H%M%SZ 2>/dev/null || true)"

if [ -n "${CUTOFF}" ]; then
    aws s3 ls "s3://${R2_BUCKET}/${BACKUP_PREFIX}/" --endpoint-url "${R2_ENDPOINT}" 2>/dev/null |
        awk '{print $4}' |
        while read -r name; do
            [ -n "${name}" ] || continue
            # josam-<STAMP>.dump — the stamp sorts lexically, so a string compare is a date compare.
            stamp="$(printf '%s' "${name}" | sed -n 's/^josam-\(.*\)\.dump$/\1/p')"
            [ -n "${stamp}" ] || continue
            if [ "${stamp}" \< "${CUTOFF}" ]; then
                log "backup: pruning ${BACKUP_PREFIX}/${name} (older than ${RETAIN_DAYS} days)"
                aws s3 rm "s3://${R2_BUCKET}/${BACKUP_PREFIX}/${name}" \
                    --endpoint-url "${R2_ENDPOINT}" --only-show-errors || true
            fi
        done || log "backup: retention pass failed — NOT fatal, the backup itself succeeded"
fi

log "backup: done"

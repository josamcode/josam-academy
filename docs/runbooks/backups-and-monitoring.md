# Runbook — `PH-0.28` Backups & Monitoring

| Field         | Value                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Task**      | `PH-0.28` — daily `pg_dump` → R2, weekly restore verification, UptimeRobot alerting                                          |
| **Type**      | **B** — authored here, executed by the founder                                                                               |
| **Authority** | `DEC-57`, `BR-1726`, `BR-892`, `SB-17`, `SB-24`, `11 §API-21`                                                                |
| **Proves**    | Exit criteria **3** and **4**, and completes **9**                                                                           |
| **Status**    | ✅ **Executed 2026-07-30.** All gates passed. Five divergences — see §13. One row open: the alert **recovery** notification. |

---

## 0. Read this first

### ⚠️ SCOPE — what is backed up, and what is not

> **This task backs up the Josam Academy database only.**

`SB-24` — the box runs **two** PostgreSQL instances: this project's `pgvector/pgvector:0.8.5-pg16`,
and the clients' separate `postgres:18-alpine`.

- **The client database is NOT backed up by anything in this task, and is not this project's to
  back up.** It is stated in `scripts/backup.sh` itself as well as here, because a backup job on a
  machine with two databases is exactly the situation where somebody later assumes both are covered.
- **The client database currently has no verified backup.** That is the client's arrangement to
  make, and it should be said to them plainly rather than left as an assumption.

`SB-17` — **the provider's weekly VM snapshots are not backup coverage.** They are never exercised,
never proven to restore, and capture a torn `pg` data directory rather than a consistent dump. Never
count them toward this criterion or any other.

### ⚠️ What this task does NOT touch

| Thing                            | Why it is safe                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| The client `postgres:18-alpine`  | Never connected to. Different server, different credentials. The scripts cannot reach it.                |
| The client containers            | Nothing stops, restarts or redeploys them. No `docker` command appears in either script.                 |
| `coolify-proxy`                  | The backup container gets **no domain**, so Coolify never regenerates or reloads proxy config.           |
| The live Josam database          | `restore-verify.sh` restores into a **new throwaway database** it creates and drops. Never the live one. |
| The host firewall, `ufw`, `sshd` | Untouched. `PH-0.7`'s configuration stands.                                                              |
| Coolify's own settings           | One new resource in the existing `josam-academy` project. No instance or server setting is edited.       |

### Placeholders

| Placeholder              | Meaning                                               |
| ------------------------ | ----------------------------------------------------- |
| `<R2_ENDPOINT>`          | `https://<account-id>.r2.cloudflarestorage.com`       |
| `<R2_ACCESS_KEY_ID>`     | The token's access key ID                             |
| `<R2_SECRET_ACCESS_KEY>` | The token's secret                                    |
| `<PG_HOST>`              | The internal hostname of the Josam Postgres container |
| `<PG_USER>` `<PG_PASS>`  | Its credentials                                       |
| `<PG_DB>`                | The Josam Academy database name                       |
| `<HEALTH_URL>`           | The URL UptimeRobot will poll                         |

**Never** paste a token, a password, a connection string or an endpoint into a commit, an issue, or
a chat. Everything below is set in Coolify's environment editor.

---

## 1. The scheduling decision — stated, not asked

**Recommendation: a dedicated backup container in the `josam-academy` project, scheduled by
Coolify's existing scheduler.**

The founder's constraint was one scheduling mechanism, and Coolify already has one. All three options
were weighed against that.

| Option                                                     | Verdict                                                                                                                                                                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coolify scheduled task in a dedicated backup container** | ✅ **Chosen.** One scheduler. Tools baked in and version-pinned. Fails independently of the API.                                                                                                                           |
| Host cron                                                  | ❌ A second scheduler, plus host-level tool installs and `docker exec` from the host, on a box carrying five clients' projects — and all of it outside Coolify's visibility.                                               |
| Coolify scheduled task in the **API** container            | ❌ Would work. Couples backup capability to the API deploying successfully, so a broken API deploy silently stops backups — the one thing this task exists to prevent.                                                     |
| Coolify's **built-in** database backup to S3               | ❌ as the primary. It does the dump and upload with no script, but it does **not restore-verify**, and `DEC-57`'s criterion is "restore verified from a clean database". See §7 — it is worth enabling as a _second_ copy. |

**Why a container that only sleeps.** No container already here has both halves of the job: the
Postgres container has `pg_dump` and no S3 client; the API image has Node and neither. The backup
image has both, pinned. It runs `sleep infinity` because performing work on its own schedule would
be the second scheduler this design exists to avoid.

**Why `postgresql-client-16` specifically.** `pg_dump` must be at least the server's major version.
Debian bookworm ships client 15, which would refuse to dump a PG16 server. The image installs 16
from PGDG deliberately.

---

## 2. Cloudflare R2

The bucket `josam-backups` exists, EU region, not public, with a token scoped to that bucket alone
(Object Read & Write, no TTY expiry). Nothing below creates or changes it.

### Step 2.1 — Confirm the bucket is not public

Cloudflare dashboard → R2 → `josam-backups` → Settings. **Public access must be disabled.** A
database dump in a public bucket is the whole database.

### Step 2.2 — Note the S3 API endpoint

R2 → the bucket → Settings → **S3 API**. It has the shape
`https://<account-id>.r2.cloudflarestorage.com`. That is `<R2_ENDPOINT>`.

> Cloudflare shows a per-bucket URL too. Use the **account-level S3 endpoint** — the scripts pass the
> bucket separately, and an endpoint that already contains the bucket name produces a doubled path
> that fails with a confusing 404.

### Step 2.3 — If a token already exists for this bucket

- **Scoped to `josam-backups` only, Object Read & Write** → use it.
- **Broader than that** → create a new one scoped correctly and stop using the old one. A backup
  credential that can reach other buckets is a credential whose blast radius exceeds its job.

---

## 3. The backup container

### Step 3.1 — Add it to the existing project

Coolify → project `josam-academy` → **+ New Resource → Dockerfile** (or **Docker Compose**, if the
UI prefers), pointing at `infra/backup/Dockerfile` in this repository.

**If a resource named `backup` already exists in the project**, check what it is before adding a
second — an earlier attempt may have left one behind.

- **No domain.** This is what keeps `coolify-proxy` out of the task entirely.
- **No published port.** It accepts no connections; Coolify reaches it with `docker exec`.

### Step 3.2 — Environment

Set on the backup resource:

| Variable                | Value                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `PGHOST`                | `<PG_HOST>` — the internal hostname, not `localhost`                                                                            |
| `PGPORT`                | `5432`                                                                                                                          |
| `PGDATABASE`            | `<PG_DB>` — **the Josam database.** Not the client one.                                                                         |
| `PGUSER` / `PGPASSWORD` | `<PG_USER>` / `<PG_PASS>`                                                                                                       |
| `R2_BUCKET`             | `josam-backups`                                                                                                                 |
| `R2_ENDPOINT`           | `<R2_ENDPOINT>`                                                                                                                 |
| `AWS_ACCESS_KEY_ID`     | `<R2_ACCESS_KEY_ID>`                                                                                                            |
| `AWS_SECRET_ACCESS_KEY` | `<R2_SECRET_ACCESS_KEY>`                                                                                                        |
| `BACKUP_PREFIX`         | `daily` — **must match the API's `BACKUP_PREFIX`**, or `last_backup` reads an empty prefix and reports a missing backup forever |
| `RETAIN_DAYS`           | `30`                                                                                                                            |

> `AWS_*` rather than `R2_*` for the credentials because that is what the S3 client reads. Same
> secret, the name the tool expects.

### Step 3.3 — Deploy it, and confirm nothing else moved

```bash
sudo docker ps --format '{{.Names}}\t{{.Status}}' | grep -v josam
```

Every client container must show the **same uptime as before**. Adding a resource to an existing
project restarts nothing else, and this is where that is confirmed rather than assumed.

---

## 4. ✅ **GATE — run the backup by hand before scheduling it**

A scheduled job that has never been run by hand is a job whose first execution is unobserved.

```bash
sudo docker exec <backup-container> /usr/local/bin/backup.sh
```

**Expected, in order:**

```
backup: starting — database=… host=… key=daily/josam-<STAMP>.dump
backup: dump complete — <N> bytes
backup: uploaded and verified — s3://josam-backups/daily/josam-<STAMP>.dump (<N> bytes)
backup: done
```

The **"uploaded and verified"** line is the one that matters. The script re-reads the object's size
from R2 after uploading, because `aws s3 cp` exiting 0 is not evidence the object exists.

### Step 4.1 — Prove it refuses a bad dump

The script checks the `PGDMP` magic string and a size floor before uploading, so a truncated dump
cannot reach the bucket and be reported as fresh. To see it refuse:

```bash
sudo docker exec -e PGDATABASE=definitely_not_a_database <backup-container> /usr/local/bin/backup.sh
```

**Expected: it fails at `pg_dump` and uploads nothing.** Confirm no new object appeared in R2. A
backup script that uploads whatever it produced is worse than none, because `last_backup` would
report the rubbish as healthy.

### Step 4.2 — Confirm the object is in the bucket

Cloudflare dashboard → R2 → `josam-backups` → `daily/`. One object, with a plausible size.

---

## 5. ✅ **GATE — the restore verification must RUN**

This is exit criterion 3's operative word. `DEC-57` says _restore verified from a clean database_,
so the check has to execute and report, not exist and be configured.

```bash
sudo docker exec <backup-container> /usr/local/bin/restore-verify.sh
```

**Expected:**

```
restore-verify: newest backup is josam-<STAMP>.dump
restore-verify: downloaded <N> bytes, format check passed
restore-verify: created clean database restore_check_<STAMP>
restore-verify: pg_restore completed with no errors
restore-verify: restored database has <N> public tables
restore-verify: ledger intact — 1 applied migration(s) survived the round trip
restore-verify: PASSED — josam-<STAMP>.dump restores into a clean database
```

What each line is doing, because "it passed" is not the same as "it checked something":

- **a clean database** — created by the script, so anything found afterwards came out of the backup
  and could not have been there already.
- **`pg_restore` with `--exit-on-error`** — without it `pg_restore` continues past failures and
  exits 0 with warnings, which is a verification that passes while verifying nothing.
- **the ledger assertion** — `_prisma_migrations` must exist with at least one applied row. Phase 0's
  only migration is empty, so the table count is small; **the ledger check is the assertion that
  grows teeth from the first real schema change onward**, and it would already catch a dump taken
  against the wrong database.

### Step 5.1 — Confirm the throwaway database was dropped

```bash
sudo docker exec <backup-container> psql -h <PG_HOST> -U <PG_USER> -d postgres -c '\l' | grep restore_check || echo "clean — nothing left behind"
```

The script drops it on every exit path including failure. A weekly check that leaks a database fills
the disk of a shared box one week at a time.

### Step 5.2 — Prove it FAILS on a bad backup

```bash
# Point it at a prefix with nothing in it.
sudo docker exec -e BACKUP_PREFIX=nonexistent <backup-container> /usr/local/bin/restore-verify.sh
```

**Expected: `restore-verify: FAILED — no backup found`, exit non-zero.** A verification nobody has
watched fail is not a verification (`BR-1830`).

---

## 6. Schedule both

Coolify → the backup resource → **Scheduled Tasks**.

| Task                    | Command                            | Cron         | Why this time                                                                                                              |
| ----------------------- | ---------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `daily-backup`          | `/usr/local/bin/backup.sh`         | `17 2 * * *` | 02:17 UTC — off the hour, so it does not contend with every other cron on the internet, and outside Egyptian waking hours. |
| `weekly-restore-verify` | `/usr/local/bin/restore-verify.sh` | `41 3 * * 0` | Sunday 03:41 UTC, over an hour after the daily backup, so it verifies a **fresh** object rather than racing the upload.    |

> **Deliberately staggered, not simultaneous.** The restore check creates and drops a database on the
> same server the backup dumps from; overlapping them means the verification could read a
> half-uploaded object and the dump could contend with a restore.

**If scheduled tasks already exist on this resource**, read them before adding — a duplicate daily
backup doubles the R2 writes and the retention pruning becomes ambiguous.

---

## 7. Optional — Coolify's built-in backup as a second copy

Coolify can also back the database up to S3 on its own schedule. It does not restore-verify, so it
cannot serve as the primary — but it costs nothing to enable and protects against a bug in
`backup.sh` itself.

If enabled, point it at a **different prefix** (e.g. `coolify/`) so it cannot be confused with ours
and so `last_backup`, which reads `daily/`, keeps measuring the backup that is actually verified.

---

## 8. UptimeRobot — exit criterion 4

### Step 8.1 — The monitor

- Type: **HTTP(s) — keyword**
- URL: `<HEALTH_URL>`
- Keyword: `"status":"ok"`
- Keyword type: **exists** — alert when it is **absent**
- Interval: 5 minutes

> **Keyword, not plain HTTP.** `GET /health` returns **200 even when degraded** — that is deliberate,
> because a monitoring endpoint that returns 500 when one dependency is unwell is indistinguishable
> from an endpoint that is down. A plain HTTP monitor would therefore never fire for a failed
> database, a stopped Redis, or a stale backup. The keyword is what makes those visible.

### Step 8.2 — Push alerting

UptimeRobot app → sign in → **My Settings → Add Alert Contact → Mobile Push**, then attach that
contact to the monitor.

### Step 8.3 — ✅ **GATE: prove the alert arrives**

Configuring an alert is not the same as receiving one. `BR-1830`.

Pick **one** of these and actually do it:

```bash
# Least invasive: stop only the Josam API. Nothing else on the box is affected.
sudo docker stop <josam-api-container>
# wait for the monitor interval, confirm the push arrives on the phone
sudo docker start <josam-api-container>
```

Or, to exercise the keyword path specifically — which is the part a plain monitor would miss:

```bash
# Stop Redis. /health stays 200 but reports "degraded", so only the KEYWORD monitor notices.
sudo docker stop <josam-redis-container>
# confirm the push arrives
sudo docker start <josam-redis-container>
```

> The second test is the better one, and it is the reason §8.1 specifies a keyword monitor. Do it if
> there is time for both.
>
> **Neither touches a client container.** Do not test this by stopping `coolify-proxy` or the shared
> Postgres.

**Confirm recovery too.** The monitor must return to "Up" and send a recovery notification. An alert
that fires and never clears trains you to ignore it — the same failure `PH-0.30` found in a health
indicator that latched.

---

## 9. The `last_backup` health indicator — completes criterion 9

Code is already committed. It needs the API to have the R2 variables.

### Step 9.1 — Environment on the **API** resource

| Variable               | Value                                                  |
| ---------------------- | ------------------------------------------------------ |
| `R2_ENDPOINT`          | `<R2_ENDPOINT>`                                        |
| `R2_BUCKET`            | `josam-backups`                                        |
| `R2_ACCESS_KEY_ID`     | `<R2_ACCESS_KEY_ID>`                                   |
| `R2_SECRET_ACCESS_KEY` | `<R2_SECRET_ACCESS_KEY>`                               |
| `BACKUP_PREFIX`        | `daily` — **the same value as the backup container's** |

All optional in the schema, so the API boots without them. Absent, the indicator reports
**`not-configured`** — deliberately not `ok`, because reporting a healthy backup that does not exist
is `BR-892`'s exact prohibition.

> The same read-only concern applies as in §2.3: this token can write to the bucket. A separate
> read-only token for the API would be tighter, and is worth doing if Cloudflare's scoping allows
> Object Read **only** for a second token on the same bucket. Not a blocker; note which you used.

### Step 9.2 — Redeploy the API and check

```bash
curl -s <HEALTH_URL>
```

**Expected — five checks, which is criterion 9 complete:**

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "last_backup": { "status": "ok", "dump_age_hours": 3.2, "verified_days_ago": 0.4 }
  },
  "version": "sha-…"
}
```

> `queue` and `storage` are **not** here and must not be faked. The queue does not exist until Phase
> 1 and `storage` proper is `FEAT-220`. Reporting a check for a service that does not exist makes the
> endpoint lie where monitoring trusts it (`BR-892`). Criterion 9's remaining two items belong to
> Phase 1 and should be recorded that way.

### Step 9.3 — ✅ Confirm `version` now reports the SHA

`PH-0.11`'s divergence 1 was fixed but never reconfirmed on a deploy. This is that confirmation:
**`version` must read the deployed commit SHA, not `0.0.0`.** If it still reads `0.0.0`, the API was
not redeployed from an image built after `2fbd7d6`.

---

## 10. Recovery

| Failure                                             | Symptom                                                 | Recovery                                                                                                                                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backup fails at `pg_dump`**                       | `pg_dump: error:` in the task log                       | Check `PGHOST`/`PGDATABASE`. Nothing uploaded, so nothing is corrupt. The previous backup is still the newest.                                                                                                        |
| **`pg_dump` version error**                         | `server version mismatch`                               | The image installed the wrong client major. Rebuild `infra/backup/Dockerfile`; it pins 16.                                                                                                                            |
| **Upload fails**                                    | `aws` error, or the verify step reports a size mismatch | Token scope or endpoint. **The script exits non-zero and prunes nothing**, so the previous backups are intact.                                                                                                        |
| **Retention pruned too much**                       | Fewer objects than expected                             | Pruning is non-fatal and runs only after the new object is verified, so it can never delete the last good one. If the window is wrong, lower `RETAIN_DAYS` and stop worrying — R2 storage at this size is negligible. |
| **`restore-verify` fails**                          | `FAILED —` line                                         | **This is the alarm working.** Do not silence it. Read which assertion failed: no backup found, bad format, `pg_restore` errors, or a missing ledger. Each names a different fault.                                   |
| **`restore_check_*` databases left behind**         | Several appear in `\l`                                  | The script was killed between create and drop. `dropdb` each by hand; the prefix makes them unmistakable.                                                                                                             |
| **`last_backup` reports `not-configured`**          | On a deployed API                                       | §9.1's variables are missing on the **API** resource. Setting them on the backup container is not enough.                                                                                                             |
| **`last_backup` reports error but a backup exists** | Contradiction                                           | Almost always `BACKUP_PREFIX` differing between the API and the backup container.                                                                                                                                     |
| **UptimeRobot alerts constantly**                   | Repeated pushes                                         | Read `/health` first. If it genuinely says `degraded`, the alert is correct and something is wrong. Do not raise the interval to quieten it.                                                                          |
| **The whole database is lost**                      | The reason this task exists                             | `pg_restore` the newest object into a fresh database, then repoint `DATABASE_URL`. §5 is the rehearsal of exactly this, which is why it must run.                                                                     |

---

## 11. What this task does **not** do

- **No client-database backup** (`SB-24`). Out of scope and stated in the script.
- **No reliance on VM snapshots** (`SB-17`).
- **No off-site second region.** R2 in one region, which is one more location than the server. A
  second region is a Phase 3 concern and is not what `DEC-57` asks for.
- **No point-in-time recovery.** Daily dumps mean up to 24 hours of loss. WAL archiving is the
  answer when there is data worth an hour, and that is a decision for when there is.
- **No application-level backup** — uploaded media lives in R2 already and is not in this dump.
- **No `queue` or `storage` health check.** Phase 1.
- **No firewall change** (`PH-0.8`, deferred).

---

## 12. Founder checklist

| #   | Step                                                       | Evidence to paste back                      |
| --- | ---------------------------------------------------------- | ------------------------------------------- |
| 1   | §2.1 bucket is not public                                  | confirmation                                |
| 2   | §3.3 client containers unchanged uptime                    | the `docker ps` comparison                  |
| 3   | **§4 GATE** — backup runs, `uploaded and verified`         | the log lines, sizes redacted if you prefer |
| 4   | §4.1 a bad dump is refused and uploads nothing             | the failure, and "no new object in R2"      |
| 5   | **§5 GATE** — `restore-verify: PASSED`, ledger intact      | the full output                             |
| 6   | §5.1 no `restore_check_*` left behind                      | confirmation                                |
| 7   | §5.2 it FAILS on a missing backup                          | the failure line                            |
| 8   | §6 both tasks scheduled                                    | the two cron entries                        |
| 9   | **§8.3 GATE** — a push alert actually arrived, and cleared | which test you used                         |
| 10  | **§9.2** — `/health` shows `last_backup` with three checks | the JSON                                    |
| 11  | §9.3 — `version` reads the SHA, not `0.0.0`                | the same JSON                               |

**`PH-0.28` is not done until rows 3, 5, 9 and 10 are satisfied.** Row 5 is exit criterion 3, row 9
is criterion 4, row 10 completes criterion 9, and row 3 is the thing all of them rest on.

If any step diverges, say which and why. `PH-0.11` produced six divergences and three of them were
defects in my design rather than in the execution.

---

## 13. Execution record — 2026-07-30

All gates passed. Exit criteria **3** and **4** closed; **9** complete for everything Phase 0 owns.

| Gate                  | Result                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| §4 backup             | `dump complete — 2478 bytes` → `uploaded and verified`                                                |
| §4.1 refusal          | Bad database name failed at `pg_dump`, **uploaded nothing**                                           |
| **§5 restore verify** | **`PASSED`** — clean database, no `pg_restore` errors, **ledger intact, 1 migration survived**        |
| §5.1                  | No `restore_check_*` left behind                                                                      |
| §5.2                  | Empty prefix → `FAILED — no backup found`. Correct.                                                   |
| §6                    | Both tasks scheduled, staggered                                                                       |
| §9                    | `last_backup: {status: ok, dump_age_hours: 0.1, verified_days_ago: 0}`                                |
| §9.3                  | **`version` reads the SHA** — `PH-0.11` divergence 1 closed on a real deploy                          |
| §8.3                  | 503 confirmed from four locations over 46 s, then push + email. Recovery notification **unconfirmed** |

### Five divergences

1. **The monitor is plain HTTP, not keyword** — UptimeRobot offers the type only at creation, and
   `/health` is not publicly reachable. **A degraded `/health` will not alert.** Recorded as `SB-34`,
   a gap with an owner rather than something covered. Criterion 4 as written is met; this is beyond
   it. §8.1's keyword instruction is correct and could not be followed — the constraint is
   UptimeRobot's, not the runbook's.
2. **Certificate expiry unmonitored** (paid feature) and **4. TLS mode on Automatic.** Recorded
   together as `SB-35`, because they are only dangerous as a pair — see the entry for why, and for
   the single fix that removes both.
3. **Two `A` records round-robining**, with `curl` reporting 200 while the domain served a parking
   page half the time. Warning added to `deploy-and-rollback.md §10.1`.
4. **A client container restarted a minute before the deploy**, `RestartCount 0` — a separate
   redeploy, not this task. Noted so the §3.3 uptime evidence is not later misread.

### Still open

- The alert **recovery** notification, being confirmed separately.
- `SB-36` — the R2 credentials were exposed in a chat transcript and should be rotated. The token can
  read **and delete** every dump, so the backup set and its destruction are one credential.

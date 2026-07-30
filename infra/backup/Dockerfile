# syntax=docker/dockerfile:1
#
# The backup toolbox. `PH-0.28`.
#
# A small, long-lived container that Coolify runs scheduled tasks inside. It exists because no
# container already on this box has both halves of the job:
#
#   - the Postgres container has `pg_dump` and no S3 client
#   - the API image has Node and neither `pg_dump` nor an uploader
#
# ## Why a container rather than host cron or the API image
#
# **Host cron** would add a second scheduling mechanism next to Coolify's, plus host-level tool
# installs, on a box carrying five clients' projects. The founder's constraint was one scheduler,
# and Coolify already has one.
#
# **The API image** would work and was rejected: it couples backup capability to the API deploying
# successfully. A broken API deploy would silently stop backups, and the whole point of `PH-0.28` is
# that the backup is the thing you cannot afford to have quietly stop. This image deploys, and
# fails, independently.
#
# **Coolify's own built-in database backup to S3** was also considered. It would do the dump and the
# upload with no script at all — but it does not restore-verify, and `DEC-57`'s criterion is
# "restore verified from a clean database". A backup we control is a backup we can verify
# deterministically. It remains a reasonable belt-and-braces *second* copy; see the runbook.
#
# ## Version pinning that actually matters here
#
# `pg_dump` must be **at least** the server's major version. The server is PostgreSQL **16**
# (`pgvector/pgvector:0.8.5-pg16`), so this installs the PGDG client 16 rather than whatever the base
# distribution ships — bookworm's default is 15, which refuses to dump a 16 server.
FROM debian:bookworm-slim

# `postgresql-client-16` from PGDG, and `awscli` for the R2 upload. R2 is S3-compatible, so the
# standard client works against it with an endpoint override — no Cloudflare-specific tooling.
#
# NOTE: no `apt-get autoremove`. See the assertion below for what it cost.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg; \
    install -d /usr/share/postgresql-common/pgdg; \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc; \
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends postgresql-client-16 awscli; \
    apt-get purge -y gnupg; \
    rm -rf /var/lib/apt/lists/*

# ── The image asserts its own tooling ───────────────────────────────────────────────────────────
#
# Both binaries, at build time, or the build fails.
#
# The first version of this file ran `apt-get autoremove` after purging the packages used to add the
# PGDG repository. The build succeeded and **`aws` was silently gone** — autoremove took it along
# with the Python packages it judged no longer needed. `pg_dump` was present, so the image looked
# fine, and the missing half was only found by running `aws --version` by hand.
#
# Without this line the failure would have surfaced at 02:17 UTC inside a scheduled task nobody was
# watching, as a backup that dumped and never uploaded. `BR-1830` — a mechanism has to be asked, not
# assumed — and an image is a mechanism. `autoremove` is gone: it saved a few megabytes and removed
# the tool the container exists to run.
RUN set -eux; \
    pg_dump --version; \
    pg_dump --version | grep -qE '^pg_dump \(PostgreSQL\) 16\.'; \
    aws --version; \
    echo 'toolchain verified: pg_dump 16 and aws both present'

COPY scripts/backup.sh /usr/local/bin/backup.sh
COPY scripts/restore-verify.sh /usr/local/bin/restore-verify.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore-verify.sh

# `BR-1703` — containers run as non-root. `nobody` is sufficient: the scripts read environment
# variables, run a network client and write to a temporary directory. Nothing needs a privileged
# user, and this container holds the credentials to the entire database backup set.
USER nobody

# The container's job is to exist so Coolify has somewhere to run a scheduled task. It performs no
# work of its own, which is deliberate: a container running its own cron would be the second
# scheduler this design exists to avoid.
CMD ["sleep", "infinity"]

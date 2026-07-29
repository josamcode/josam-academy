# Runbook — `PH-0.11` Deploy & Rollback

| Field         | Value                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------ |
| **Task**      | `PH-0.11` — deploy the two `ghcr.io` images to Coolify, verify, and prove rollback by tag        |
| **Type**      | **B** — authored here, executed by the founder                                                   |
| **Authority** | `08 §12.1`, `BR-885`, `BR-886`, `BR-887`, `DEC-20`, `SB-23`, `SB-24`                             |
| **Proves**    | Exit criteria 1 and 2 of `15 §Phase 0`                                                           |
| **Status**    | ✅ **Executed 2026-07-30.** Deploy and rollback both proven. Six divergences recorded — see §14. |

---

## 0. Read this first

### ⚠️ The binding constraint

> **Nothing in this runbook may touch, restart, or reconfigure anything the client projects depend
> on.**

This box carries **five live client applications**. Everything below adds a new, separate project
alongside them and touches nothing that already exists.

**Explicitly NOT touched:**

| Thing                           | Why it is safe                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coolify-proxy`                 | §1–§9 never give an app a domain, so Coolify never regenerates or reloads proxy configuration. §10 is the **only** section that does, it is **optional**, and it has its own gate. |
| The existing client containers  | Nothing stops, restarts, rebuilds or re-deploys them. No `docker compose` command in this file names them.                                                                         |
| The client `postgres:18-alpine` | Josam Academy gets **its own** database container. §2 explains why this is not merely preference.                                                                                  |
| The client `redis:7.2`          | Same — its own, for the same reason.                                                                                                                                               |
| The provider or host firewall   | No rule is added, removed or changed. `PH-0.8` is deferred and this task does not depend on it.                                                                                    |
| Coolify's own settings          | No instance setting, proxy setting, or server setting is edited. One new **project** is created; that is all.                                                                      |
| SSH, `ufw`, `fail2ban`          | `PH-0.7`'s configuration is untouched.                                                                                                                                             |

**If a step in this file appears to require restarting `coolify-proxy` or an existing container,
stop.** It is either a misreading or the runbook is wrong; either way the correct action is to
report it rather than proceed.

### The one rule

> **Verify through a host port first, and give the application a domain last — if at all.**

An app with no domain is invisible to `coolify-proxy`. That makes §1–§9 provably incapable of
affecting client traffic, and it means a failed deploy is a failed deploy rather than an incident
for somebody else's business.

### Placeholders

Nothing real is written in this file or pasted back into the repository.

| Placeholder     | Meaning                                                               |
| --------------- | --------------------------------------------------------------------- |
| `<SERVER_IP>`   | The server's public address                                           |
| `<ADMIN_USER>`  | The administrative user from `PH-0.7`                                 |
| `<REPO>`        | `<owner>/<repo>` on GitHub                                            |
| `<SHA_NEW>`     | The commit SHA of the image being deployed                            |
| `<SHA_OLD>`     | The commit SHA of the previous image, for the rollback proof          |
| `<DB_PASSWORD>` | A generated password for the new Postgres. Never reused, never shown. |
| `<API_PORT>`    | A free host port for verifying the API, e.g. `14000`                  |
| `<WEB_PORT>`    | A free host port for verifying the web app, e.g. `13000`              |
| `<PAT>`         | A read-only GitHub token, if the packages stay private                |

**Never** paste a password, token, connection string, IP or domain into a commit, an issue, or a
chat.

---

## 1. Before you touch anything

### Step 1.1 — ✅ **GATE: the client sites work now**

Open each client application in a browser and confirm it loads. **Write down which ones you
checked.** Every later step is judged against this: if a client site is broken at the end, this
tells you whether this runbook did it.

### Step 1.2 — Provider console reachable

As `PH-0.7 §1.1`. Not expected to be needed, but §11 starts there.

### Step 1.3 — Record the state

```bash
# Free memory, and what is already running
free -m
sudo docker ps --format '{{.Names}}\t{{.Status}}' | wc -l
sudo docker stats --no-stream --format '{{.Name}}\t{{.MemUsage}}' | sort -k2 -h | tail -8

# Free host ports for the verification steps
sudo ss -tulpn | grep -E ':(13000|14000)\b' || echo "both verification ports are free"
```

If either verification port is taken, pick others and use those throughout.

---

## 2. The database — a separate container. The instinct is right, for a stronger reason.

**Recommendation: Josam Academy gets its own Postgres container and its own Redis container.**

The founder's instinct was that the client database is not theirs to risk. That is correct, and it
is the **second** reason. The first is that sharing is not actually possible without changing the
client's database server.

### The blocking reason: version and extension

|          | Josam Academy requires                                                    | The client instance runs                              |
| -------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| Postgres | **`pgvector/pgvector:0.8.5-pg16`** — PostgreSQL **16**, with **pgvector** | `postgres:18-alpine` — PostgreSQL **18**, no pgvector |
| Redis    | **`redis:7.4.10-alpine`**                                                 | `redis:7.2`                                           |

Sharing the client's Postgres would mean one of two things, and both are worse than a new
container:

1. **Run Josam Academy on PostgreSQL 18.** The pin at `13 §18.1` is 16, local development is 16,
   and `BR-1810` requires the version to be identical across every environment. Production on 18
   while development is on 16 is the class of difference that produces a bug nobody can reproduce.
2. **Install the `pgvector` extension into the client's database server.** That is modifying
   another business's production database to suit this project. It is not ours to do.

### The cost, measured rather than assumed

Both images were measured at rest on the same versions this project pins:

| Container                      | At rest      |
| ------------------------------ | ------------ |
| `pgvector/pgvector:0.8.5-pg16` | **33.7 MiB** |
| `redis:7.4.10-alpine`          | **7.3 MiB**  |
| **Combined**                   | **≈ 41 MiB** |

Against 8 GB with roughly 6 GB free (`PH-0.7` found the client stack at ~22%), the isolation costs
about **half a percent of the machine**. There is no trade-off here worth having.

### Two constraints carried in

- **`SB-24`** — `PH-0.28` backs up **Josam Academy's database only**. A separate container makes
  that scope a fact of the topology rather than a filter somebody must remember to apply.
- **`SB-23`** — do **not** set aggressive memory limits here. `PH-0.9` sizes them against measured
  headroom. On a box where the client containers declare no limits, a container that declares one
  becomes the preferred OOM-kill target, so the number matters and is not this task's to guess.

---

## 3. Registry access

The `ghcr.io` packages are private unless changed. Coolify needs to pull them.

### Step 3.1 — Choose

- **Make the two packages public** — GitHub → Packages → each package → Package settings → Change
  visibility. Simplest, and the images contain no secrets: they are built from a public repository.
- **Or** create a read-only PAT with **`read:packages` only** and add it to Coolify as a registry
  credential. Choose this if the images should stay private.

> Whichever is chosen, **do not create a token with more than `read:packages`.** A deploy
> credential that can also write packages or read code is a credential whose blast radius exceeds
> its job.

### Step 3.2 — Verify the pull works before configuring anything

```bash
# On the server. Substitute the SHA from the CI run summary.
sudo docker pull ghcr.io/<REPO>/api:sha-<SHA_NEW>
sudo docker pull ghcr.io/<REPO>/web:sha-<SHA_NEW>
```

Both must succeed. If they fail with `denied`, the visibility or the token is wrong — fix that
before touching Coolify, because a pull failure inside a deploy is much harder to read.

---

## 4. The new project

### Step 4.1 — Create it

Coolify → **Projects → + New** → name it `josam-academy`.

> A **new project**, not a new resource inside an existing one. It gives Josam Academy its own
> environment and its own network, and it makes "does this belong to a client or to us" a question
> the UI answers rather than one you have to remember.

**If a project of this name already exists**, use it, but check what is inside it before adding
anything — an earlier partial attempt may have left resources behind.

### Step 4.2 — Postgres

Inside the project → **+ New Resource → Database → PostgreSQL**.

- Image: **`pgvector/pgvector:0.8.5-pg16`** — **override the default by hand, before first
  start.** Execution found that Coolify's PostgreSQL picker offers pgvector on **17 and 18 but
  not 16**, so accepting the default would have silently created a PG17 database — a major
  version ahead of the pin at `13 §18.1` and of local development, which is precisely the
  mismatch `BR-1810` exists to prevent. Type the image reference in rather than choosing it.
- Database name, user: your choice, recorded in your password manager.
- Password: generated, `<DB_PASSWORD>`, never reused.
- **Do not publish a port.** It must be reachable only on the project's internal network
  (`BR-1701` — databases are not publicly reachable). Coolify does not publish one by default;
  confirm it stayed that way.

Deploy it, then confirm:

```bash
sudo docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}' | grep pgvector
```

Expect the pinned image and **no `0.0.0.0:` mapping**.

### Step 4.3 — Redis

**+ New Resource → Database → Redis**, image **`redis:7.4.10-alpine`**, no published port.

> Required, not optional. `PH-0.30` made `REDIS_URL` a required environment variable, so the API
> refuses to boot without it — deliberately, because an API that starts without knowing where Redis
> is reports a healthy Redis it never contacted (`BR-892`).

### Step 4.4 — Confirm the client stack is untouched

```bash
sudo docker ps --format '{{.Names}}\t{{.Status}}' | grep -v josam
```

Every client container should show the **same uptime as before** — not "Up 2 minutes". Adding
resources to a new project restarts nothing else, and this is where you confirm it.

---

## 5. The API — deploy, then migrate, then serve

### Step 5.1 — Add the application

Inside the project → **+ New Resource → Docker Image**.

- Image: `ghcr.io/<REPO>/api:sha-<SHA_NEW>`
- **A SHA tag, never `latest`.** `BR-886` — the SHA tag is the rollback handle. `latest` names a
  different image after every push, so a "redeploy latest" rollback redeploys the thing you are
  rolling back from.

### Step 5.2 — Environment

Set in Coolify, never in this file:

| Variable       | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| `DATABASE_URL` | The internal connection string for §4.2's container                 |
| `REDIS_URL`    | The internal connection string for §4.3's container                 |
| `NODE_ENV`     | `production`                                                        |
| `PORT`         | `4000`                                                              |
| `LOG_LEVEL`    | `info`                                                              |
| `APP_VERSION`  | `<SHA_NEW>` — so a log line identifies the image that produced it   |
| `SENTRY_DSN`   | Optional. Absent is fine; the tracker reports itself inert at boot. |

> Use the **internal** hostnames Coolify assigns, not `<SERVER_IP>`. Traffic between containers in
> the project stays on the project network and never leaves the box.

### Step 5.3 — Publish a host port, temporarily

Set the port mapping to `<API_PORT>:4000`.

> This is how §7 verifies without a domain, and therefore **without `coolify-proxy` being involved
> at all**. §10 removes it if a domain is attached.

### Step 5.4 — ✅ `BR-887` — migrations run in the image's **start command**, not a pre-deployment hook

> **Corrected after execution. Leave Coolify's pre-deployment command EMPTY.**

Migrations now run in the API image's own start command:

```
node_modules/.bin/prisma migrate deploy && exec node dist/main.js
```

Nothing to configure in Coolify. The founder emptied the pre-deployment field during execution, and
**that is the correct final state** — it must stay empty.

#### Why the pre-deployment hook was wrong

Coolify's pre-deployment command runs via `docker exec` **inside the old, currently-running
container**, not the new image. Proven by a failed deploy during execution:

```
docker exec <old-container> sh -c 'node_modules/.bin/prisma migrate deploy'
Error: node_modules/.bin/prisma: not found
```

Two failures follow, and the second is the serious one:

1. **On the first deploy there is no old container**, so Coolify logged
   `No running containers found. Skipping.` and **no migration ran** — at exactly the moment a
   schema first needs creating.
2. **Migration capability depended on the version being replaced, not the one arriving.** Rolling
   forward from a SHA that predated the `prisma` CLI move failed, because the old container had no
   CLI. Any rollback to a release older than a migration-tooling change could not roll forward
   again through the hook — which breaks `DEC-20`'s model in a way the first version of this
   runbook did not anticipate.

The deploy failed **safely** — the old container kept serving and Coolify removed the new version —
so the mechanism was wrong without being dangerous. That is the good case, and it is not one to
rely on.

#### Why the start command is right

It runs in the **new** image, with the new image's tooling, on **every** deploy including the first,
and always before `listen()`. Both paths were verified by running the built image:

```
success:  1 migration found in prisma/migrations
          No pending migrations to apply.
          {"status":"ok","checks":{"database":"ok","redis":"ok"},"version":"sha-…"}

failure:  Error: P1001: Can't reach database server
          container state: exited exit=1
          curl → HTTP 000   (nothing listening — correct)
```

A failed migration exits non-zero, the container never becomes healthy, and Coolify keeps the old
container serving. `DEC-20` still binds: between the migration completing and traffic switching the
**old** code runs against the **new** schema, so every migration must stay backward compatible with
the previous release. That is expand-then-contract's purpose and this placement does not weaken it.

### Step 5.5 — Deploy, and time it

Note the clock. Deploy. Note it again — §9 needs the number.

---

## 6. The web app

**+ New Resource → Docker Image**, `ghcr.io/<REPO>/web:sha-<SHA_NEW>`, port `<WEB_PORT>:3000`.

No pre-deployment command, no database access. It needs no environment variables in Phase 0.

---

## 7. ✅ **GATE — verify, without a domain and without the proxy**

From the server, or through an SSH tunnel from your machine:

```bash
# The API is alive and both dependencies answer
curl -s http://127.0.0.1:<API_PORT>/health
```

**Expected exactly:**

```json
{ "status": "ok", "checks": { "database": "ok", "redis": "ok" }, "version": "<SHA_NEW>" }
```

Three things are being checked, not one:

1. `status: ok` — the app is serving.
2. `redis: ok` — §4.3 is wired. `PH-0.30` proved this indicator reports failure and recovers, so
   `ok` here is meaningful rather than a default.
3. `version` matches `<SHA_NEW>` — **you are looking at the image you think you are.** Without
   this, a failed deploy that silently left the old container running looks like a success.

> **This assertion did not work on first execution.** The field reported the constant `0.0.0`,
> because the health service read `npm_package_version` — set only when a process is launched
> by pnpm, and therefore never in a container. `APP_VERSION` reached the container correctly
> the whole time and nothing read it. Fixed in `apps/api`, with specs that fail on the old
> code. Until a deploy confirms it, §8's rollback proof rests on image-tag inspection, which is
> weaker for exactly the reason stated above.

```bash
# The web app renders every route group
for p in / /catalog /login /dashboard /admin; do
  printf '%-12s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:<WEB_PORT>$p)"
done
```

All five must return `200`.

```bash
# The stylesheet resolves and carries real utilities, not just tokens
CSS=$(curl -s http://127.0.0.1:<WEB_PORT>/ | grep -oE '/_next/static/chunks/[^"]+\.css' | head -1)
curl -s "http://127.0.0.1:<WEB_PORT>$CSS" | wc -c
```

**Expect roughly 27,000 bytes.** A few thousand means the stylesheet contains tokens and no
utilities — the `PH-0.17` failure, which every gate reported green while the site rendered
unstyled.

### Step 7.1 — Confirm the client sites still work

Re-check the sites from §1.1. Nothing so far should have touched them; this is where you prove it.

---

## 8. ✅ Rollback by tag — exit criterion 2

**Prove it. Do not describe it.** A rollback procedure that has never been executed is a procedure
discovered under pressure.

### Step 8.1 — Roll back

In the API application, change the image tag from `sha-<SHA_NEW>` to `sha-<SHA_OLD>` and redeploy.
Do the same for the web app.

### Step 8.2 — Prove it actually rolled back

```bash
curl -s http://127.0.0.1:<API_PORT>/health
```

**`version` must now read `<SHA_OLD>`.** This is the assertion — not that the deploy succeeded, but
that a _different, older_ image is now serving. Re-run §7's route checks; all five still `200`.

### Step 8.3 — Roll forward again

Return both to `sha-<SHA_NEW>`, redeploy, and confirm `version` reads `<SHA_NEW>`.

> Both directions matter. A rollback you cannot undo is a one-way door, and the state you are left
> in after testing must be the current release rather than the old one.

---

## 9. Deploy time — exit criterion 1

From §5.5 and §8: **a deploy must complete in under two minutes**, and no build step may run on the
server (`BR-885`).

Record the timings. If a deploy exceeds two minutes, note where the time went — an image pull on a
cold cache is not the same finding as a slow start-up, and only the second is a problem worth
solving.

```bash
# Confirm nothing built on the server: no compiler, no package install in the deploy log.
# The image is pulled and run. That is the whole of it.
```

---

## 10. **Optional** — attach the domain

> ### ⚠️ This is the only section that causes `coolify-proxy` to reload
>
> Giving an application a domain makes Coolify regenerate the proxy configuration and reload it.
> That reload also serves five client applications.
>
> **§1–§9 prove the deploy without this.** If the goal is "deploy and rollback work", the task is
> already complete and this section can be skipped entirely. Do it when you want the site publicly
> reachable, with time to check afterwards — not at the end of a long session.

### Step 10.1 — DNS first

In Cloudflare, a **proxied `A` record** for the domain pointing at `<SERVER_IP>`.

Proxied, per the `PH-0.8` decision (§11 of that runbook): application traffic stays on the proxied
record through `coolify-proxy` and does **not** go through a tunnel, so that an administrative
outage and a customer-facing outage cannot be the same event.

> **`PH-0.8` is deferred, so the origin firewall is not yet restricted to Cloudflare ranges.**
> `BR-1702` is therefore **not met** and this is a known, recorded gap (`SB-22`), not an oversight.
> The proxied record still hides the origin from casual DNS lookup; it does not prevent a direct
> connection to `<SERVER_IP>`.

### Step 10.2 — Attach, then check the clients immediately

Set the domain on the web application in Coolify. Then, **within the same minute**:

1. Load each client site from §1.1.
2. Load the new domain.

If a client site broke, remove the domain from the Josam app and redeploy — the proxy reverts to
its previous routes.

### Step 10.3 — Remove the temporary host ports

Once the domain works, remove the `<WEB_PORT>` and `<API_PORT>` mappings. They were verification
scaffolding and there is no reason to leave the API published on the host.

---

## 11. Recovery

Every path starts at the provider web console or the Coolify dashboard. None requires a rebuild.

| Failure                                | Symptom                                  | Recovery                                                                                                                             |
| -------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Image pull denied**                  | Deploy fails immediately                 | §3 — visibility or token. Nothing is running yet, so nothing is affected.                                                            |
| **Pre-deployment migration fails**     | Deploy stops before the container starts | Read the log. The old container is **still serving** — that is the point of running migrations first. Fix and redeploy.              |
| **API starts then exits**              | Container restarts in a loop             | `sudo docker logs <container> \| tail -30`. A missing `DATABASE_URL` or `REDIS_URL` fails loudly at boot by design.                  |
| **`/health` reports `degraded`**       | `database` or `redis` shows `error`      | The connection string points somewhere wrong, or the resource is not running. Both indicators recover on their own once fixed.       |
| **New release is bad**                 | It deployed and behaves incorrectly      | §8 — change the tag to `sha-<SHA_OLD>` and redeploy. This is the mechanism, and §8 proved it works.                                  |
| **A client site broke after §10**      | Client application unreachable           | Remove the domain from the Josam app and redeploy. **Client uptime outranks this task** — restore first, diagnose after.             |
| **Josam containers consuming the box** | Everything slow                          | Stop the Josam project's resources. It is a new project with nothing depending on it; stopping it is safe and reversible.            |
| **Coolify itself unreachable**         | Dashboard does not load                  | `PH-0.8` is deferred, so port 8000 is still open — direct access remains available. This is one of the few benefits of the deferral. |

---

## 12. What this task does **not** do

- **No firewall change.** `PH-0.8` is deferred; `SB-22` and `BR-1702` remain open.
- **No backups.** `PH-0.28`. Until then the new database has **no backup at all** — acceptable only
  because no real data exists yet, and it is the reason `PH-0.28` should not slip much further.
- **No monitoring or alerting.** `PH-0.28`.
- **No memory limits.** `PH-0.9` sizes them against measured headroom (`SB-23`).
- **No CI deploy trigger.** This runbook deploys by hand, on purpose: the mechanism is proven
  manually before it is automated. Wiring the CI webhook is a follow-up once §8 has passed.
- **No change to client projects.** See §0.

---

## 13. Founder checklist

| #   | Step                                                                                    | Evidence to paste back                   |
| --- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | §1.1 client sites work **before**                                                       | which ones you checked                   |
| 2   | §3.2 both images pull                                                                   | `docker pull` succeeded for api and web  |
| 3   | §4.2 Postgres is the **pgvector pg16** image, unpublished                               | `docker ps` line, redacted               |
| 4   | §4.3 Redis is `7.4.10-alpine`, unpublished                                              | same                                     |
| 5   | §4.4 client containers show **unchanged uptime**                                        | the `docker ps` comparison               |
| 6   | §5.4 migrations ran as a pre-deployment step                                            | the migration output from the deploy log |
| 7   | **§7 GATE** — `/health` ok, **`version` = `<SHA_NEW>`**, five routes `200`, CSS ≈ 27 kB | the `/health` JSON and the route table   |
| 8   | §7.1 client sites still work                                                            | confirmation                             |
| 9   | **§8 GATE** — `version` reads `<SHA_OLD>` after rollback, then `<SHA_NEW>` again        | both `/health` outputs                   |
| 10  | §9 deploy time                                                                          | seconds, both directions                 |
| 11  | §10 if attempted — client sites checked immediately after                               | confirmation, or "skipped"               |

**`PH-0.11` is not done until rows 7, 9 and 10 are satisfied.** Row 7 is "it serves", row 9 is exit
criterion 2, and row 10 is exit criterion 1.

If any step diverges, say which and why. `PH-0.7` produced three deliberate deviations and
recording them was more useful than the steps that went to plan.

---

## 14. Execution record — 2026-07-30

Executed by the founder. **Deploy and rollback both proven.** Criteria 1 and 2 of `15 §Phase 0` are
met.

### What worked

| Check                     | Result                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `/health`                 | `{"status":"ok","checks":{"database":"ok","redis":"ok"}}`                              |
| Web routes                | `/` `/catalog` `/login` `/dashboard` `/admin` — all `200`                              |
| Stylesheet                | **27,205 bytes** from the container — `PH-0.30`'s base-surface fix holds in production |
| Postgres                  | `pgvector/pgvector:0.8.5-pg16`, `5432/tcp` only, **not published**                     |
| Redis                     | `redis:7.4.10-alpine`, **not published**                                               |
| Client containers         | **Up 19 hours throughout.** `coolify-proxy` never restarted                            |
| Client sites before/after | Identical: `404 / 404 / 200 / 404`                                                     |
| Deploy times              | **5 s, 4 s, 27 s (rollback), 5 s** — all far inside two minutes                        |
| Rollback                  | Proven **both directions** by image tag: `a4c3d43 → 9ae3d28 → a4c3d43`                 |

The binding constraint held: nothing the client projects depend on was touched, and §4.4's uptime
comparison is what proves it rather than asserts it.

### Six divergences

| #   | Divergence                                                                                                                                                                                                                                                                                                                | Status                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`version` reported `0.0.0`, not `APP_VERSION`.** The env var reached the container correctly; the health service read `npm_package_version`, which is undefined outside a pnpm-launched process. §7's third assertion and §8.2's rollback proof both fell back to image-tag inspection.                                 | ✅ **Fixed** in `apps/api`, with four specs proven to fail on the old code. **Awaiting a deploy of two different SHAs to confirm in production.** |
| 2   | **`BR-887` did not hold on the first deploy.** `No running containers found. Skipping.` — no migration ran when the schema first needed creating.                                                                                                                                                                         | ✅ **Fixed** by §5.4's start command, which has no dependency on an existing container.                                                           |
| 3   | **The pre-deployment command runs in the OLD container, not the new image.** Migration capability depended on the version being replaced. Rolling forward from a SHA predating the CLI move failed.                                                                                                                       | ✅ **Fixed** — see §5.4. Failed safely; the mechanism was still wrong.                                                                            |
| 4   | **`PermitRootLogin no` broke every deploy on the box, including the client projects, unnoticed for a day.** Coolify deploys over SSH as `root@host.docker.internal`. Now `prohibit-password`. Also: **`sshd` takes the FIRST value for a directive**, so a `25-` drop-in did nothing and the `20-` file had to be edited. | ✅ `vps-hardening.md §4` corrected, with `sshd -T` named as the only authority on effective config.                                               |
| 5   | **`ufw` needed explicit rules for Docker networks to reach port 22.** Plus `ssh` reporting `Connection refused` instantly on IPv6 without trying IPv4, while `nc` said open.                                                                                                                                              | ✅ `vps-hardening.md §5.2b` and `§5.2c` added. The second became **`BR-1839`**.                                                                   |
| 6   | **`<ADMIN_USER>` is in `sudo` but not `docker`**, contrary to `§2.1`.                                                                                                                                                                                                                                                     | ✅ **Runbook corrected, server left as is.** The better state — see the correction in `§2.1` for why.                                             |

### Also found

- **Coolify's PostgreSQL picker offers pgvector on 17 and 18, not 16.** The default would have
  silently produced PG17. Recorded in §4.2.

### Not done — deliberately

**§10, attaching the domain.** Skipped by founder decision: it is the only section that reloads
`coolify-proxy`, and not at the end of a long session. **`josamacademy.com` is not yet serving.**
Open item, carried in `STATUS.md §5`.

# Runbook — `PH-0.9` · Coolify hardening on a shared box

| Field       | Value                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| **Task**    | `PH-0.9` — verify Coolify, rotate the admin credential, apply recalculated memory limits                         |
| **Type**    | **B** — authored here, executed by the founder                                                                   |
| **Depends** | `PH-0.7`                                                                                                         |
| **Refs**    | `08 §11.1` memory budget · `14 §12` · `SB-23` shared-box recalculation · `BR-878`, `BR-879`, `BR-1830`           |
| **Est**     | 0.25 d authoring + 0.35 d execution                                                                              |
| **Status**  | 🟡 **PARTIAL — executed 2026-07-30, limits half only.** §7 half-deferred, §8 not run, §6.5 outstanding. See §11. |
| **Scope**   | **Split.** Two halves actionable now; two halves deferred with `PH-0.8` and recorded as NOT DONE.                |

---

## 0. Read this before running anything

### 0.1 What this runbook does NOT touch

This box carries **five live client applications** and their own `postgres:18-alpine` and `redis:7.2`.
Nothing below touches any of them. Named explicitly, because a memory-limits task is exactly the kind
that quietly widens:

| Never touched                                       | Why it is named here                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **The client containers** (all 13 non-Josam)        | Not ours to limit. An OOM kill in someone else's application, caused by our hardening, is the worst outcome this task could produce. |
| **The client `postgres:18-alpine` and `redis:7.2`** | Separate instances from ours. `SB-24`.                                                                                               |
| **`coolify-proxy`**                                 | It routes every client site. Nothing here reloads it — `PH-0.11 §10` was the only step that ever did, and it is done.                |
| **The Coolify management container itself**         | See §3.3.1 — a deliberate divergence from `08 §11.1`, with reasoning.                                                                |
| **Port 8000, the dashboard bind address, `ufw`**    | See §8. Deferred with `PH-0.8`, and recorded as NOT DONE rather than skipped.                                                        |

### 0.2 The split, stated up front

| Half                                               | This runbook                                   |
| -------------------------------------------------- | ---------------------------------------------- |
| Verify the installation                            | §2 — **do now**                                |
| Recalculated memory limits (`SB-23`)               | §3–§6 — **do now**                             |
| Rotate the admin credential + the exposure sweep   | §7 — **do now**                                |
| Unbind the dashboard from `0.0.0.0`, firewall 8000 | §8 — **DO NOT DO. Recorded against `PH-0.8`.** |

**`PH-0.9` completes at 🟡 partial, not ✅.** The dashboard stays internet-reachable, `SB-22` stays
open, `BR-1702` stays unmet. That is a founder decision recorded as a decision, not a task that
quietly finished.

### 0.3 Every `docker` command below needs `sudo`

The `josam` user is in `sudo` but **not** in the `docker` group — `PH-0.7`'s open divergence, and it
stays that way deliberately: `docker` group membership is root-equivalent, so on a box carrying five
clients' applications the extra keystroke is the cheaper side of the trade.

**Prefix every `docker` invocation in this runbook with `sudo`.** They are written bare for
readability. Confirmed at execution 2026-07-30.

### 0.4 Placeholders

`<SERVER_IP>` · `<COOLIFY_URL>` · `<ADMIN_EMAIL>` · `<DOMAIN>` · `<CLIENT_URL_n>` · `<PROJECT>` —
substitute at the terminal. **Never paste a real value back into a transcript, an issue, or a commit
message.**

---

## 1. The OOM caveat — read before you decide the numbers

**This is the part of the task that is not mechanical, and it is why §3 sizes generously.**

Our containers will declare memory limits. The client containers do not. That asymmetry has a
consequence worth stating exactly, because the intuition "we added limits, so we are safer" is wrong
in one specific way.

- A container **with** a limit is killed by its **own cgroup** the moment it exceeds that limit —
  deterministically, on its own, **regardless of how much memory the box has free**.
- A container **without** a limit can only be killed by the **global** OOM killer, which fires only
  under whole-machine pressure and chooses its victim by `oom_score`, which rises with resident size.

So our containers have **two** ways to die and the client containers have **one**. **Declaring limits
makes us the predictable casualty of pressure we did not create.**

> ### Correction to this file's earlier draft
>
> The seed version of this runbook stated that the global OOM killer "scores candidates partly by how
> far a cgroup has exceeded its limit", and concluded that a limited container is selected **ahead of**
> an unlimited one consuming more. **That mechanism is wrong.** Global `oom_badness()` is driven by
> actual usage — RSS, swap, page tables — adjusted by `oom_score_adj`. Declaring a limit does not
> raise a container's global badness score, and a small limited container is in fact a **less** likely
> global victim than a large unlimited one.
>
> **The conclusion survived the correction; the reasoning did not.** We are still the ones who get
> killed — not because limits worsen our standing in a queue, but because we have a second, private
> kill path the clients do not have. That difference matters when sizing: the danger is our own
> ceiling being too close to our own working set, **not** some scoring penalty we cannot control. It
> makes generous sizing the mitigation. Under the seed's mechanism, sizing would not have helped at
> all — which is why a wrong mechanism reaching a right answer is still worth fixing.

### Then why declare limits at all

Because the alternative is worse in a way that is easy to underweight. Without a limit, a leak in our
API is a **whole-box** event: the kernel picks a victim by score — quite possibly a client
application — at a moment nobody can predict, with no diagnostic beyond `Killed` in `dmesg`. With a
limit, the same leak is a **single-container** event, in our container, with a Node heap error and a
stack trace naming the allocation.

`BR-878` is not "limits make us safer". It is _an unbounded container is a scheduled outage_ — and on
this box, the outage is scheduled for somebody else.

> **A limit converts an unpredictable, undiagnosable, shared failure into a predictable, diagnosable,
> isolated one.** That is the trade, and on a box carrying other people's traffic it is the right one.

### The only mitigation we own

**Size conservatively.** The limit must sit far enough above the real working set that ordinary spikes
never reach it, so it trips only on genuine abnormal growth — which is the thing it exists to catch. A
limit set tight against observed usage turns every traffic spike into an outage, and teaches you to
raise it until it means nothing.

`BR-879` is the second half: **the Node heap ceiling sits below the container limit**, so V8 throws
`JavaScript heap out of memory` with a stack trace before the kernel kills the process silently. A
container limit without a matching heap ceiling still leaves you a dead process and no reason for it.

---

## 2. Verify the installation

> Nothing in this section changes anything. Run all of it before §3.

```bash
# 2.1 — Coolify is running, and which version
docker ps --filter 'name=coolify' --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'

# 2.2 — the full container inventory, so §6 can PROVE the client set is unchanged
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | sort | tee ~/ph09-containers-before.txt
wc -l < ~/ph09-containers-before.txt

# 2.3 — current memory limits. `0` means unlimited.
docker ps -q | xargs docker inspect \
  --format '{{.Name}} {{.HostConfig.Memory}}' | sort | tee ~/ph09-limits-before.txt
```

**Expected:** Coolify running; around 13 non-Josam containers plus ours; and in 2.3, almost everything
reading `0`.

**If it is already configured differently:**

| Observation                                    | Do this                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Some **client** containers already have limits | **Leave them exactly as they are.** Record the values. They are not ours to tune — not even to something more generous.               |
| Some **Josam** containers already have limits  | Compare against §3.3. If they already match, §4 is a no-op — say so rather than re-applying. If they differ, §4 replaces them.        |
| Coolify is **not** running                     | **Stop.** Client sites are probably down, and that is a bigger incident than this task.                                               |
| A container is `Restarting` or `Unhealthy`     | **Stop and identify it first.** Applying limits to a box already in a bad state makes the cause unknowable.                           |
| The container count is well above or below ~18 | **Stop and reconcile.** An unexpected container on a box that was password-exposed for ninety days is an incident, not a discrepancy. |

Keep both files. §6 diffs against them, which is the only way to **prove** the client set was
untouched rather than assert it.

---

## 3. Recalculate the budget — `SB-23`

### 3.1 Why `08 §11.1` cannot be applied as written

`08 §11.1` allocates **6.9 GB of 8 GB to Josam Academy** and assumes the whole machine. This box is
shared. Applying that table verbatim would over-commit memory the client applications are already
using — and **Docker accepts over-commitment silently.** The limits would look correct in
`docker inspect` and the box would OOM under load.

**The table is not wrong; its assumption is.** `SB-23` is the record.

### 3.2 Measure first

The numbers in §3.3 are a recommendation. **Confirm them against the real box before applying** — a
budget derived from an assumption is precisely what `SB-23` exists to stop repeating.

```bash
# 3.2.1 — total and available memory
free -m

# 3.2.2 — what every container is ACTUALLY using right now
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}'

# 3.2.3 — the CLIENT total, as one number (MiB)
docker stats --no-stream --format '{{.Name}}\t{{.MemUsage}}' \
  | grep -v '^josam' | awk '{print $2}' | sed 's/MiB//' | paste -sd+ | bc
```

Record all three in the execution report. **3.2.3 is the figure `SB-23` was missing.**

### 3.3 The recalculated allocation

| Component                     |      Limit | Node heap | Notes                                                |
| ----------------------------- | ---------: | --------: | ---------------------------------------------------- |
| OS + Docker daemon            |      ~700M |         — | **Not ours.** No limit to set.                       |
| **Coolify + `coolify-proxy`** |  **unset** |         — | **Deliberately unlimited — §3.3.1.**                 |
| Client containers (13)        |    ~1,800M |         — | **Not ours.** Never limited by us. Confirm at §3.2.3 |
| `josam-postgres`              |     1,024M |         — | `shared_buffers` **256MB**, not `08 §11.1`'s 2 GB    |
| `josam-redis`                 |       320M |         — | `maxmemory 256mb`, `maxmemory-policy noeviction`     |
| `josam-api`                   |       640M |      512M | `--max-old-space-size=512`                           |
| `josam-web`                   |       768M |      640M | `--max-old-space-size=640`                           |
| `josam-backup`                |       256M |         — | Sleeps; spikes only during `pg_dump` + upload        |
| **Josam total**               | **3,008M** |           | ≈ 2.9 GB, against `08 §11.1`'s 6.9 GB                |
| Remaining reserve             |    ~1,800M |           | Page cache, spikes, and the Phase 1 worker container |

**If §3.2.3 reports client usage materially above ~1,800M**, reduce `josam-postgres` to `768M` and
`josam-web` to `640M` (heap `512`) before applying, and record the change. Do not proceed with the
table as printed if the measurement disagrees with it — that is the whole point of measuring.

#### 3.3.1 Three deliberate departures from `08 §11.1`

1. **Coolify and `coolify-proxy` are left unlimited.** `08 §11.1` budgets 400M and 150M, assuming a
   dedicated box where Coolify manages only our containers. Here it manages **five clients'
   deployments**. A capped Coolify that OOMs mid-deploy breaks their deploy; a capped proxy that OOMs
   takes every client site down. **The blast radius of limiting shared infrastructure is other
   people's applications**, which §0.1 forbids. Recorded as a divergence, not an oversight.

2. **`shared_buffers` 256MB, not 2 GB.** The 2 GB figure assumes Postgres is the dominant process on a
   dedicated box. Ours currently holds one empty migration.

3. **`maxmemory-policy noeviction`.** Redis will hold BullMQ job data from `PH-1.23`. An eviction
   policy would silently discard queued jobs under memory pressure — a lost job with no error, which
   is strictly worse than a refused write. `noeviction` makes the failure loud.

---

## 4. Apply the limits — Josam containers only

> In Coolify: **`<PROJECT>` → each resource → "Resource Limits" → "Maximum Memory Limit"**, then
> redeploy that resource. Coolify recreates the container with the limit. **Do not use `docker update`
> on the host** — Coolify overwrites it on the next deploy, which is a change that appears to work and
> silently reverts.
>
> **Corrected 2026-07-30.** This runbook originally said _Advanced → Memory Limit_. The field is under
> its own **Resource Limits** heading, not under Advanced.

Apply **one at a time**, lowest risk first, confirming each comes back before moving on:

| Order | Resource         | Limit  | Also set                                                     |
| ----: | ---------------- | ------ | ------------------------------------------------------------ |
|     1 | `josam-backup`   | `256M` | —                                                            |
|     2 | `josam-redis`    | `320M` | Command: `--maxmemory 256mb --maxmemory-policy noeviction`   |
|     3 | `josam-postgres` | `1G`   | `POSTGRES_SHARED_BUFFERS=256MB` if a field exists, else §4.1 |
|     4 | `josam-api`      | `640M` | Env: `NODE_OPTIONS=--max-old-space-size=512`                 |
|     5 | `josam-web`      | `768M` | Env: `NODE_OPTIONS=--max-old-space-size=640`                 |

After **each** one:

```bash
docker inspect --format '{{.Name}} limit={{.HostConfig.Memory}} status={{.State.Status}}' <CONTAINER>
```

`limit` is in bytes (`256M` → `268435456`), `status=running`. **If it is not running, stop and go to
§9.1** — do not continue down the list.

### 4.1 If Coolify exposes no field for `shared_buffers`

Leave the Postgres default and record it. The default is 128MB, which is **below** our 256MB target
and therefore safe under a 1G limit — it under-uses rather than over-commits. **Do not edit
`postgresql.conf` inside the container by hand:** Coolify recreates the container on deploy and the
edit vanishes.

### 4.2 If a resource offers no Memory Limit field at all

Coolify's field placement varies by resource type and version. Record it as **not limited, with the
reason**, and do not work around it on the host. A host-level `docker update` is erased by the next
deploy — `BR-1830`'s shape: a mechanism that reports success and enforces nothing after the next
redeploy.

---

## 5. Verify the heap ceilings actually took effect — `BR-879`

**Setting `NODE_OPTIONS` is not evidence the process read it.**

```bash
# 5.1 — the API's real heap ceiling, read from the running process
docker exec josam-api node -e \
  'console.log("heap cap MB:", Math.round(require("v8").getHeapStatistics().heap_size_limit/1048576))'
```

**Expected:** ≈ **`560`**, not `512`.

> ### ⚠️ The reported cap sits ~10% ABOVE the flag value. This is correct.
>
> **Corrected 2026-07-30 — the original expectation was wrong in the dangerous direction.** This
> section used to say "expect ≈ 512", and execution returned `560`. `560` is the **right answer**:
> `--max-old-space-size` sizes the **old** generation, and `heap_size_limit` reports the total heap,
> which adds the young generation (semi-spaces) on top. Observed: `512 → 560` and `640 → 688`.
>
> A runbook expecting exactly the flag value **reads a pass as a failure**. That is worse than a check
> that is merely absent: it manufactures a defect where none exists, and the fix a person then applies
> — raising the flag until the numbers match — breaks `BR-879` by pushing the heap ceiling **above**
> the container limit, which is the precise condition this check exists to prevent. A wrong expected
> value turns a passing safety check into an instruction to disable the safety.
>
> **What is actually being asserted is the inequality, not a number:**
>
> ```
> max-old-space-size  <  heap_size_limit  <  container limit
>         512         <        560        <       640   ✅
>         640         <        688        <       768   ✅
> ```
>
> Check the ordering. Do not check for equality with the flag.

**If it reports a default (~2048 or ~4096), `NODE_OPTIONS` never reached the process** — usually
because the start command sets its own, or the entrypoint drops the variable. Fix it in the start
command rather than adding a second copy of the variable somewhere else.

**If it reports a value ABOVE the container limit, stop** — that is `BR-879` inverted, and the process
will be kernel-killed with no stack trace rather than throwing a heap error.

`josam-web` spawns children, so check the server process rather than PID 1:

```bash
# 5.2
docker exec josam-web sh -c \
  'cat /proc/*/cmdline 2>/dev/null | tr "\0" "\n" | grep max-old-space || echo "NOT SET"'
```

> **Why this section exists.** An environment variable that is set but never read is the failure this
> project has hit repeatedly — `BR-1830`. The container limit would still work; the process would just
> die by kernel kill with no stack trace, which is exactly the diagnostic the limit was bought for.

---

## 6. Prove the client containers were not touched

```bash
# 6.1 — same inventory, diffed against §2.2
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | sort > ~/ph09-containers-after.txt
diff ~/ph09-containers-before.txt ~/ph09-containers-after.txt

# 6.2 — same limits, diffed against §2.3
docker ps -q | xargs docker inspect --format '{{.Name}} {{.HostConfig.Memory}}' \
  | sort > ~/ph09-limits-after.txt
diff ~/ph09-limits-before.txt ~/ph09-limits-after.txt
```

**Expected:** 6.1 shows only Josam containers, with changed uptime. 6.2 shows changed values **only**
on `/josam-*` lines.

> **Any client container appearing in either diff is a failure of this task.** Restore it before doing
> anything else — §9.2 — and report that it happened.

```bash
# 6.3 — the client sites still answer
for u in <CLIENT_URL_1> <CLIENT_URL_2> <CLIENT_URL_3> <CLIENT_URL_4> <CLIENT_URL_5>; do
  printf '%s → ' "$u"; curl -s -o /dev/null -w '%{http_code}\n' --max-time 10 "$u"
done

# 6.4 — and ours. TEN requests, not one — see deploy-and-rollback.md §10.1
for i in $(seq 1 10); do curl -s -o /dev/null -w '%{http_code} ' https://<DOMAIN>/; done; echo
docker exec josam-api wget -qO- localhost:3000/health
```

**Expected:** five client `200`s; ten consecutive `200`s from ours; health reporting `database: ok`,
`redis: ok`, `last_backup: ok`.

### 6.5 Let it sit before believing it

**Memory limits fail under load, not at startup.** A container that starts fine under a limit can be
killed an hour later on its first real spike, and every check above runs within minutes of applying
them.

```bash
# Run this the NEXT DAY, not immediately.
docker ps -a --filter 'name=josam' --format '{{.Names}}\t{{.Status}}\t{{.RunningFor}}'
docker inspect --format '{{.Name}} restarts={{.RestartCount}} oom={{.State.OOMKilled}}' \
  josam-api josam-web josam-postgres josam-redis josam-backup
```

**Expected:** `restarts=0` and `oom=false` on all five.

**Any `oom=true` means that limit is too tight for the real working set — raise that one container by
50% and record both numbers.** Do not raise all five: one container failing tells you which number was
wrong, and raising everything discards that information.

---

## 7. Rotate the Coolify admin credential

### 7.1 Rotate

`<COOLIFY_URL>` → **Profile / Account** → change password. Use a generated value from a password
manager. Do not reuse anything and do not echo it.

> **Do not log out of your current session until the new password is proven to work in a private
> window.** Prove the new access path before surrendering the old one — the same rule `PH-0.8` applies
> to the tunnel. If the change silently fails, the session you still hold is the recovery.

### 7.2 The sweep that matters more than the rotation

A rotated password is worthless if a second door exists. All four, in the dashboard:

| Check                    | Where                     | What is wrong                                                                                                                                                          |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Open registration**    | Settings → General        | If "allow registration" is **on**, anyone who reaches port 8000 can create an account. With `SB-22` open, that is the entire internet. **Turn it off.**                |
| **Other admin accounts** | Settings → Team / Members | Anything that is not `<ADMIN_EMAIL>`. Record what it was, then remove it.                                                                                              |
| **API tokens**           | Settings → API / Keys     | A token bypasses the password entirely. Revoke anything not in active use.                                                                                             |
| **Two-factor**           | Profile → Security        | Enable it if offered. **It is the only control here that survives the password leaking** — which, on an internet-reachable panel, is the scenario worth designing for. |

> **If any of the four turns up something unexpected — an account, a token, registration left on —
> stop and report before continuing.** On a box that accepted root password logins for ninety days, an
> unexplained admin account is an incident, not a cleanup item.

### 7.3 If already configured differently

| Observation                          | Do this                                                                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Password rotated recently            | Rotate anyway. It has been typed into a browser against an internet-reachable panel for ninety days.                                                  |
| 2FA already enabled                  | Confirm the recovery codes are stored somewhere that is **not this box**, then move on.                                                               |
| Registration already off             | Record it as already correct. That is a real finding, not a no-op.                                                                                    |
| An **unrecognised API token** exists | **Stop. Do not revoke it yet.** Record its name and creation date, then report. Revoking first destroys the evidence of when it appeared and by whom. |

---

## 8. NOT DONE — deferred with `PH-0.8`

**Do not perform this section.** It is written so that what is missing stays legible, not so it can be
run.

`PH-0.9`'s original scope included unbinding the Coolify dashboard from `0.0.0.0` and closing port
8000 at the firewall. **Both are deferred with `PH-0.8` by founder decision, 2026-07-30.**

**The reason, recorded so it is not re-litigated from memory:** closing port 8000 without the
Cloudflare Tunnel in place removes the founder's clients' path to their own control panel with nothing
replacing it. `PH-0.8` builds the replacement first — `cloudflared` dials out, the dashboard goes
behind Cloudflare Access, and **only then** does port 8000 close. Performing the closing half alone is
that sequence reversed, which `PH-0.8` explicitly forbids.

| Item                                            | Recorded against | State                 |
| ----------------------------------------------- | ---------------- | --------------------- |
| Unbind the dashboard from `0.0.0.0`             | **`PH-0.8`**     | ⬜ not done           |
| Close port 8000 at the provider firewall        | **`PH-0.8`**     | ⬜ not done           |
| `BR-1702` — origin firewall, Cloudflare ranges  | **`PH-0.8`**     | ⬜ **not met**        |
| `SB-22` — dashboard reachable from the internet | **`PH-0.8`**     | 🔴 **open, live gap** |

Every row names `PH-0.8`, which **has not started** (`BR-1840`). None is recorded against `PH-0.9`,
because `PH-0.9` is about to close, and **a closed task cannot own an outstanding check** — that is
`BR-1833`'s worked example, and it already happened in this repository with `12 §19` row 15.

> **Until `PH-0.8` runs, §7.2's registration and token checks are the only thing standing between the
> internet and this dashboard.** That is why §7.2 is not optional.

---

## 9. Recovery

### 9.1 A Josam container will not start after a limit

```bash
docker logs --tail 100 <CONTAINER>
docker inspect --format '{{.Name}} oom={{.State.OOMKilled}} exit={{.State.ExitCode}}' <CONTAINER>
```

`oom=true`, or exit `137` → the limit is below what the container needs to boot. **In Coolify, clear
the Memory Limit field for that one resource and redeploy.** It comes back unlimited — which is where
it started this morning, so no worse. Then re-apply at double the value and record both numbers.

**Do not clear all five.** One container failing tells you which number was wrong.

### 9.2 A client container was affected

**Highest priority. Stop everything else.**

```bash
docker inspect --format '{{.Name}} limit={{.HostConfig.Memory}} status={{.State.Status}}' <CLIENT_CONTAINER>
```

If it carries a limit it did not have in `~/ph09-limits-before.txt`, clear it in Coolify and redeploy
**that resource only**. If it is stopped, start it. Confirm the client site answers. Then report what
happened — **including that it happened**.

### 9.3 Locked out of Coolify after the password change

In order, least destructive first:

1. **The session you did not log out of** (§7.1). This is why §7.1 says not to.
2. Coolify's password reset from the host — **consult the documentation for your installed version**
   rather than a remembered command; it has changed between releases.
3. The **provider console**, as the out-of-band path.

**Client applications keep running throughout.** They do not depend on the dashboard being reachable:
a Coolify lockout blocks **deploys**, not traffic. Do not escalate it as an outage.

### 9.4 Full revert

```bash
# Everything in §4 is reversible by clearing one field per resource in Coolify and redeploying.
# Nothing here writes a config file, edits sshd, touches ufw, or reloads the proxy.
docker ps -q | xargs docker inspect --format '{{.Name}} {{.HostConfig.Memory}}' | sort \
  | diff ~/ph09-limits-before.txt -
```

An empty diff means the box is exactly as it started.

---

## 10. Founder checklist — paste this back

```
[ ] §2.1   Coolify version and status
[ ] §2.2   container count before
[ ] §2.3   limits before  (expect mostly 0)
[ ] §3.2.1 free -m
[ ] §3.2.3 CLIENT total MiB          ← the number SB-23 was missing
[ ] §3.3   table applied as printed, or adjusted — say which
[ ] §4     five limits applied, each container running after
[ ] §4.1   shared_buffers: set, or defaulted with the reason
[ ] §5.1   API heap cap ≈ 512        ← not "NODE_OPTIONS was set"
[ ] §5.2   web heap cap ≈ 640
[ ] §6.1   container diff — Josam only
[ ] §6.2   limits diff   — /josam-* only
[ ] §6.3   five client sites → 200
[ ] §6.4   ten consecutive 200s + health three ok
[ ] §7.1   admin password rotated, new login proven in a private window
[ ] §7.2   registration OFF · other admins · API tokens · 2FA — all four, with findings
[ ] §8     NOT RUN — confirm untouched: port 8000 still open, ufw unchanged
[ ] §6.5   NEXT DAY: restarts=0, oom=false on all five
```

**`PH-0.9` is 🟡 partial when this is pasted back, and it does not become ✅.** §8 is outstanding by
decision, and becomes ✅ only when `PH-0.8` runs after Phase 0 exit.

**It is not proven until §6.5 runs the following day.** Every check above runs within minutes of
applying the limits, and memory limits fail under load. A limits task that passes at minute five and
OOMs at hour six was never verified — it was observed early (`BR-1761`).

---

## 11. Execution record — 2026-07-30 · 🟡 PARTIAL

**Not done. Not marked done.** Three separate reasons, and none of them is "it mostly worked."

### The measurement `SB-23` was missing

| Figure                   | Value                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| `free -m`                | total **7,940** · used 2,187 · available **5,753**                 |
| Client + Coolify at rest | **1,650 MiB** — below the runbook's assumed ~1,800                 |
| Josam actual, pre-limits | **~198 MiB** across five containers                                |
| §3.3 table               | **applied as printed.** The measurement agreed; no adjustment made |

### Limits applied — §4

All five, one at a time, each confirmed running:

```
backup    268435456  (256M)      redis     335544320  (320M)
postgres 1073741824  (1G)        api       671088640  (640M)
web       805306368  (768M)
```

### Heap ceilings — §5

`api` **560 MB** under a 640M limit · `web` **688 MB** under a 768M limit. Both read from the running
process. **Both correct** — see the ~10% note now in §5, which this execution is the reason for.

### Clients untouched — §6

The limits diff shows **five lines, all `/josam-*`**. No client container appears. Client sites
identical before and after; ten consecutive `200`s from ours.

### What is NOT done

| Item                                    | State                                         | Owner        |
| --------------------------------------- | --------------------------------------------- | ------------ |
| §6.5 next-day `restarts=0`, `oom=false` | ⬜ **outstanding — this is what blocks done** | Founder      |
| §7 admin password rotation              | ⬜ deferred                                   | **`PH-0.8`** |
| §7.2 other-admin sweep, API tokens, 2FA | ⬜ deferred                                   | **`PH-0.8`** |
| §7.2 open registration                  | ✅ **confirmed OFF** — a real finding         | —            |
| §8 unbind + firewall port 8000          | ⬜ **not run, as written**                    | **`PH-0.8`** |

**§7's deferral is a founder decision with a reason:** the dashboard stops being internet-reachable in
`PH-0.8`'s session anyway, so the rotation lands in the same session as the exposure it mitigates.
Recorded as deferred with an owner, never as done. `PH-0.8` has not started (`BR-1840`).

### Two things this execution proved about the limits, and one it did not

It proved the limits **apply**, the containers **start**, the heap ceilings are **read by the
processes**, and the client set is **untouched by diff, not by assertion**.

**It did not prove the limits are right.** Josam was using ~198 MiB against 3,008M allocated — roughly
**fifteen times headroom** — so nothing came close to a ceiling. That is the correct posture for an
empty database with no traffic, and it means the sizing is **untested rather than validated**. Even
§6.5 tomorrow will only show that idle containers stay idle.

**The limits are genuinely exercised for the first time when Phase 1 puts real data and real traffic
behind them.** `josam-postgres` at 1G with `shared_buffers` 256MB is the one to re-examine then — it
is sized for an empty schema. Re-check at the first Phase 1 task that writes production data.

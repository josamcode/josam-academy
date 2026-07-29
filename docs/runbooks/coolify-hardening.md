# Runbook — `PH-0.9` Coolify Verification & Container Limits

| Field         | Value                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Task**      | `PH-0.9` — verify the existing Coolify install, rotate the admin credential, unbind the dashboard, apply memory limits |
| **Type**      | **B** — authored here, executed by the founder                                                                         |
| **Authority** | `08 §11.1`, `BR-878`, `BR-879`                                                                                         |
| **Status**    | ⬜ **Not yet authored.** This file currently holds only the binding constraint below.                                  |

---

## ⚠️ READ THIS BEFORE SIZING ANY LIMIT

> **This is not a footnote. It is the single most important fact about container limits on this
> machine, and it inverts the usual reasoning.**

The server is **shared**. It runs 13 containers: five live client applications, their own
`postgres:18-alpine` and `redis:7.2`, and the Coolify stack — alongside whatever Josam Academy
deploys. Roughly 22% of 8 GB is in use at rest.

**The client containers declare no memory limits, and `PH-0.7` established that they are not ours
to constrain.**

### The consequence, stated plainly

Under memory pressure the kernel's OOM killer scores candidates partly by how far a cgroup has
exceeded its limit. A container with a declared limit can be selected **before** an unlimited one
consuming far more. So:

> **Declaring limits on Josam Academy's containers makes them the preferred kill target on a box
> whose other containers declare none.**

This is the opposite of the intuition that a limit protects the thing it is applied to. A limit
protects _the host_ from the container; it does nothing to protect the container from its
neighbours, and it actively worsens that container's standing in the queue.

### What follows for whoever sizes these limits

1. **Apply limits anyway.** `BR-878` — an unbounded container is a scheduled outage, and
   `BR-879` — Node heap sizes sit below the container limit so the process fails predictably
   rather than being OOM-killed by the kernel. Both still hold. The risk above is a reason to size
   carefully, never a reason to skip the limits.

2. **Size against real free headroom, not against `08 §11.1`.** That table allocates 6.9 GB of
   8 GB to Josam Academy with 1.1 GB spare — the entire machine. It was written assuming the box
   belongs to this project. It does not (`SB-23`).

3. **Leave generous headroom for the client stack to grow into.** It is unlimited, so it _will_
   expand under load, and the headroom is the only thing standing between that and an eviction.
   Measure current usage, then budget as though the client stack could double.

4. **Do not apply limits to the client containers.** They are not this project's to constrain.

5. **Record the split** — what the client stack uses, what Josam Academy is allocated, what is left
   — so the next person sizing anything starts from measurements rather than from `08 §11.1`.

### Conservative starting point

Not a decision — a starting point to measure against, and to be replaced by real numbers at
execution.

| Component                                   | `08 §11.1` (whole box) |            Shared-box starting point |
| ------------------------------------------- | ---------------------: | -----------------------------------: |
| OS + Docker daemon + Coolify + client stack |              1.25 GB\* | **measure, then reserve generously** |
| PostgreSQL (Josam)                          |                 2.5 GB |                               1.5 GB |
| Redis (Josam)                               |                 450 MB |                               300 MB |
| NestJS API                                  |                 900 MB |                               700 MB |
| Workers                                     |                 600 MB |                               400 MB |
| Next.js                                     |                 1.2 GB |                               900 MB |
| **Josam Academy total**                     |            **5.65 GB** |                           **3.8 GB** |

\* `08 §11.1`'s figure for OS + Docker + Coolify only. It has no line for a client stack, because
it did not know there was one.

---

## Everything else

The rest of this runbook — verifying the existing install, rotating the admin credential,
confirming the dashboard is not bound to `0.0.0.0`, and the per-step verification and recovery
procedures — is authored when `PH-0.9` is executed, to the standard set by
[`vps-hardening.md`](./vps-hardening.md).

`PH-0.9` is **not** "install Coolify": it is already installed and serving live client projects
(`CLAUDE.md §8`).

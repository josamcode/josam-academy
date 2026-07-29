# Runbook — `PH-0.10` CI Pipeline

| Field         | Value                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Task**      | `PH-0.10` — GitHub Actions: lint → typecheck → test → build → push to `ghcr.io`                                              |
| **Type**      | Authored **and verified locally** here; two settings and one confirmation are founder work                                   |
| **Authority** | `08 §12.1`, `BR-885`, `BR-886`, `BR-1703`, `BR-1810`, `BR-1831`, `13 §16.1`, `SB-15`                                         |
| **Status**    | 🟡 Committed and locally verified. **Not done until the first `main` run is green and two tagged images exist** (`BR-1761`). |

---

## What exists now

| File                       | Purpose                                                               |
| -------------------------- | --------------------------------------------------------------------- |
| `.github/workflows/ci.yml` | The pipeline. Two jobs: `verify`, then `publish` on `main` only.      |
| `apps/api/Dockerfile`      | Three-stage NestJS build. Runs as `node` (uid 1000), listens on 4000. |
| `apps/web/Dockerfile`      | Three-stage Next.js build using `output: 'standalone'`. Port 3000.    |
| `.dockerignore`            | Keeps host `node_modules` out of the build context.                   |
| `renovate.json`            | `13 §16.1` (`DEC-59`) as configuration.                               |
| `lint:hook` root script    | The second lint path (`SB-15`), proven live by fitness case **36**.   |

**No deploy step.** This pipeline ends at a tagged image. `PH-0.11` adds the Coolify deploy once
`PH-0.9` has hardened it.

---

## What was verified locally, and how

Both images were built and **run**, not merely built. A Dockerfile that builds and produces an
image that cannot start is the ordinary outcome of writing one without running it.

| Check                                           | Result                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `docker build -f apps/api/Dockerfile .`         | ✅ succeeds                                                                              |
| API container starts                            | ✅ Nest boots, `GET /health` mapped, logs `"port":4000`                                  |
| API runs as non-root (`BR-1703`)                | ✅ `id -un` → `node`, `id -u` → `1000`                                                   |
| API image size                                  | 875 MB — large; see the note below                                                       |
| `docker build -f apps/web/Dockerfile .`         | ✅ succeeds                                                                              |
| Web runs as non-root (`BR-1703`)                | ✅ `id -un` → `node`                                                                     |
| All five route groups from the container        | ✅ `/` `/catalog` `/login` `/dashboard` `/admin` → 200                                   |
| Emitted CSS resolves and carries real utilities | ✅ 27,075 bytes; `bg-bg-base`, `text-text-primary`, `rounded-lg`, `flex-col` all present |
| JS chunk resolves                               | ✅ 200                                                                                   |
| Web image size                                  | 376 MB                                                                                   |
| `pnpm verify:fitness`                           | ✅ **36 caught, 0 NOT caught**                                                           |

The CSS check is deliberate rather than incidental: `PH-0.17` shipped a stylesheet of 3,083 bytes
containing tokens and **zero utilities** while every gate was green (`BR-1834`). A standalone Next
build has its own version of that failure — `.next/static` is not part of `.next/standalone`, so
omitting one `COPY` produces a site that renders with no CSS and reports itself healthy.

### Three defects found by running rather than by reading

1. **No `.dockerignore` existed.** `COPY . .` pulled the host `node_modules` into the build; pnpm
   then judged the store stale and aborted — `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. The
   loud failure is the lucky one. The quiet version is an image whose contents depend on who built
   it, which is what a lockfile exists to prevent.
2. **`pnpm deploy` needs `--legacy` on pnpm 10+.** The default now expects
   `inject-workspace-packages`; without it the build fails at the last stage with
   `ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE`.
3. **`apps/web/public` did not exist**, and Docker fails outright when a `COPY` source is missing.
   Created with a tracked `.gitkeep`, because git does not track empty directories — a directory
   that exists only on the machine where the Dockerfile was written is a CI-only failure.

### Known, accepted

- **The API image is 875 MB**, mostly Prisma's query engines and the Debian slim base. Acceptable
  for a first pipeline and worth revisiting if pull time becomes part of the deploy budget; the
  measurement to beat is recorded here so a future change can be judged against it.
- **`docker/*` action majors are pinned to a major (`@v6`), not a SHA.** Renovate manages them
  under the GitHub Actions rule (`13 §16.1`).

---

## Founder checklist

Nothing here needs the server, and nothing here needs a credential to be handed over. The registry
push uses the workflow-scoped `GITHUB_TOKEN`, which GitHub mints per run.

### 1. Allow Actions to publish packages

`Settings → Actions → General → Workflow permissions`

- Select **Read and write permissions**.

Without it the `publish` job fails at the push step with `denied: permission_denied`. The workflow
already requests `packages: write` for that job alone (`BR-1704`), but the repository setting is
the ceiling.

### 2. Push and watch the first run

```bash
git push origin main
```

Then `Actions → CI`. Expected: `verify` green, then two `publish` jobs (`api`, `web`).

**Paste back:** the run URL and the two image references from each job's summary. They look like:

```
ghcr.io/<owner>/<repo>/api:sha-<commit>
ghcr.io/<owner>/<repo>/web:sha-<commit>
```

### 3. Confirm the images are real

`Repository → Packages`. Two packages, each with a `sha-<commit>` tag and a `latest` tag.

`BR-886` — **deploy and roll back by the SHA tag, never `latest`.** `latest` names a different
image after every push, so a "redeploy latest" rollback redeploys the thing being rolled back.

### 4. Make the packages visible to the server (needed at `PH-0.11`, not now)

A private package requires a pull credential on the server. At `PH-0.11`, either make the two
packages public under `Package settings → Change visibility`, or create a read-only PAT with
`read:packages` and give it to Coolify. **Do not create that token yet** — it has no use until
there is a deploy step, and a credential that exists before it is needed is a credential nobody is
watching.

### 5. Enable Renovate

`renovate.json` is committed and configures nothing until the app is installed.

- Install the **Renovate** GitHub App on this repository only.
- The first run opens an onboarding PR describing what it would do. **Read it against `13 §16.1`**
  before merging: it is the only opportunity to see the whole policy applied at once.

**Paste back:** whether the onboarding PR's plan matches `13 §16.1` — auto-merge on devDependency
patch/minor and GitHub Actions patch/minor, manual everywhere else, never on security advisories,
five PRs maximum, Mondays only.

---

## Verification checklist

| #   | Check                                   | How                                                 | Expected                            |
| --- | --------------------------------------- | --------------------------------------------------- | ----------------------------------- |
| 1   | Workflow runs at all                    | `Actions → CI` after a push                         | Two jobs appear                     |
| 2   | Lint runs by BOTH paths (`SB-15`)       | The `verify` job log                                | Two separate lint steps, both green |
| 3   | `verify:fitness` runs in CI (`BR-1831`) | The `verify` job log                                | `36 caught, 0 NOT caught`           |
| 4   | Images are tagged by SHA (`BR-886`)     | `Repository → Packages`                             | `sha-<commit>` present              |
| 5   | Nothing built on the server (`BR-885`)  | By construction — there is no deploy step yet       | —                                   |
| 6   | A red run is visible                    | Push a deliberate lint error on a branch, open a PR | CI red on the PR                    |

Check 6 is worth doing once. **CI is the only gate on `main`** — branch protection is unavailable
on private repositories on the current plan — so its value depends entirely on somebody looking at
it. Knowing what red looks like is the difference between a gate and a decoration.

---

## Recovery

| Symptom                                                | Cause                                                                                         | Fix                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `denied: permission_denied` at the push step           | Workflow permissions are read-only                                                            | Founder checklist step 1                                             |
| `ERR_PNPM_OUTDATED_LOCKFILE`                           | A `package.json` changed without `pnpm install` being committed                               | Run `pnpm install` locally and commit `pnpm-lock.yaml`               |
| Fitness step fails but the same command passes locally | Almost always a real difference: CI installs from the lockfile, a local tree may have drifted | Run `pnpm install --frozen-lockfile` locally, then re-run            |
| "left the working tree dirty"                          | A `verify:fitness` case aborted midway and left a violation file                              | Read the printed `git status`; the named file is the case that broke |
| Web image serves pages with no styling                 | `.next/static` was not copied beside the standalone server                                    | Both `COPY` lines in `apps/web/Dockerfile` — see the comment there   |
| Image builds, container exits immediately              | A missing runtime file, usually a workspace symlink                                           | `docker run --entrypoint sh -it <image>` and look                    |

There is no production impact from anything in this runbook: the pipeline touches a registry and
nothing else. The first change that can affect a running service is `PH-0.11`.

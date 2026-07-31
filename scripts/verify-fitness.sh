#!/usr/bin/env bash
#
# BR-1725 — Phase 0 does not end until a deliberate rule violation is confirmed to fail the
# build. For each fitness function: write the violation, show the failure, remove it.
#
# This script IS that proof, and it is committed rather than run once and described, so the
# claim can be re-checked rather than believed. Run: pnpm verify:fitness
#
# Every case restores the tree before the next runs, so no failure can mask another. If the tree
# is dirty afterwards, a case aborted mid-way — `git status` will show which.
set -u
cd "$(dirname "$0")/.." || exit 1

# ── Annotations off, OUTPUT untouched ────────────────────────────────────────────────────────
#
# Vitest adds its `github-actions` reporter automatically when `GITHUB_ACTIONS` is set, so a case
# that deliberately FAILS a spec publishes those failures into the job summary of a green build.
# Run #33 showed "2 failures / 2 total" in a SUCCESS run — correct behaviour, presented in a form
# indistinguishable from a broken gate.
#
# Unsetting the variable for this script removes the ANNOTATION path and changes nothing about
# what the specs print. That distinction is the whole fix: `check` below reads the failure TEXT to
# confirm a violation failed for the RIGHT reason, so anything that alters the output alters what
# the mechanism can observe.
#
# The first attempt used `--reporter=basic`, which does not exist in Vitest 4. The specs never ran,
# the commands still exited non-zero, and the suite reported violations it had not actually
# observed. Runs #34 and #35 went red. `BR-1830` inside the fix for `BR-1830`.
unset GITHUB_ACTIONS

# ── SB-46 — the suite could inject a defect and then certify it ──────────────────────────────
#
# An interrupted run used to leave its injected violations in TRACKED source, and a LATER run
# would then report 45/45 green with them still sitting there. It happened three times on
# 2026-07-31 and left `PasswordHasher` out of the DI providers and `permission.deleteMany` in
# place of the orphan flag — a boot failure and an irreversible data loss, both certified green.
#
# That is not a verification gap. It is a mechanism that can introduce a vulnerability and then
# attest to its own cleanliness, and the pre-commit hook runs this script, so nothing above it
# would have objected either.
#
# ## Cause, read rather than inferred
#
# Every mutating case did `cp f f.bak` -> inject -> `mv -f f.bak f`. The restore point was the
# file's CURRENT ON-DISK CONTENT, not `HEAD`. Kill the run between the copy and the move and the
# violation is baked in permanently; the next run then copies the already-violated file to `.bak`,
# injects on top, and faithfully restores the violated version. The case still reports CAUGHT,
# because injecting a violation onto an already-violated file still fails the check. There was
# no `trap`, so a signal skipped the restore entirely.
#
# ## The fix is three things, and it needs all three
#
#  1. Restore with `git checkout --`, never from a copy of the working file. A snapshot of
#     possibly-corrupt content cannot be a recovery point for corruption.
#
#     ## DO NOT "TIGHTEN" THIS TO HEAD. The index is load-bearing, not incidental.
#
#     `git checkout -- <path>` restores from the **INDEX**, not from HEAD. That is the entire
#     reason this suite can inject into files which legitimately carry staged work.
#
#     The suite's injections are UNSTAGED edits on top of the index, so an index restore reverts
#     exactly them and leaves STAGED content untouched. `STATUS.md` and `CLAUDE.md` are both
#     injection targets AND are staged in every task commit (`§2` step 6), so:
#
#       - restore from the INDEX  -> the injection is undone, the task record survives
#       - restore from HEAD       -> the injection is undone, AND THE TASK RECORD IS DESTROYED,
#                                    silently, on every single commit that runs this hook
#
#     `git checkout HEAD -- <path>` and `git restore --source=HEAD` both LOOK stricter and read
#     like a hardening. They are the opposite: they widen what gets discarded from "the suite's own
#     edits" to "everything the author had staged". The first version of the pre-flight below made
#     exactly this class of mistake in the other direction — it rejected ANY modification, which
#     would have blocked every future task commit. A safety mechanism that makes the work
#     impossible is not safer, it fails differently.
#
#     The pre-flight is what closes the remaining gap: it refuses to start on UNSTAGED changes in
#     these paths, which are the only edits an index restore would discard.
#  2. A `trap` on EXIT/INT/TERM, so an interruption restores rather than abandoning the tree.
#     The trap handles interruption; the HEAD restore handles the trap itself failing.
#  3. A pre-flight refusal to START on a dirty tree. A run beginning from an already-corrupted
#     tree cannot report anything meaningful.
#
# **The pre-flight is also what makes the HEAD restore SAFE, which is why it is not optional.**
# `git checkout --` is destructive: if a developer had real uncommitted work in one of these
# files, restoring from HEAD on exit would silently destroy it. Refusing to start unless those
# paths are clean is the precondition that turns a destructive primitive into a lossless one.
# The order below matters — preflight FIRST, install the trap only once the tree is known clean.

# TRACKED files the suite mutates in place. Restored from HEAD.
TRACKED_TARGETS=(
  .size-limit.mjs
  CLAUDE.md
  STATUS.md
  docs/16-task-breakdown.md
  renovate.json
  packages/ui/src/index.ts
  packages/i18n/src/catalogs/en.ts
  apps/api/src/shared/security/security.module.ts
  apps/api/src/shared/database/repositories/permission.repository.ts
  apps/api/prisma/schema.prisma
)

# Files the suite CREATES. Removed outright — there is no HEAD version to return to.
CREATED_TARGETS=(
  apps/api/src/modules/health/__violation.ts
  apps/api/src/shared/database/__violation.ts
  apps/web/app/__probe.css
  apps/web/app/__violation.css
  apps/web/app/__violation.tsx
  apps/web/app/__violation/page.tsx
  apps/web/components/__Violation.tsx
  packages/i18n/src/__a.ts
  packages/i18n/src/__b.ts
  packages/ui/src/__violation.ts
  packages/ui/src/__violation.tsx
  packages/ui/src/__Violation.tsx
)

# `packages/i18n/dist/**` is generated and gitignored, so it has no HEAD to restore from. Case 17
# edits `dist/catalogs/en.js` directly; the restore primitive for generated output is a rebuild.
rebuild_i18n() { pnpm --filter @josam/i18n run build >/dev/null 2>&1 || true; }

restore_tree() {
  git checkout -- "${TRACKED_TARGETS[@]}" 2>/dev/null || true
  rm -f "${CREATED_TARGETS[@]}"
  rmdir apps/web/app/__violation 2>/dev/null || true
  # Sweep any `.bak` left by the old design or by a run killed before this fix landed.
  local f
  for f in "${TRACKED_TARGETS[@]}"; do rm -f "$f.bak"; done
    rebuild_i18n
}

preflight() {
  local dirty="" leftover="" f
  # UNSTAGED changes only. Staged content is safe — `git checkout --` restores to the index, so
  # committing a task that stages STATUS.md does not trip this and cannot lose the staged edit.
  # Unstaged dirt is the fatal case: it is what the restore would silently discard.
  dirty="$(git diff --name-only -- "${TRACKED_TARGETS[@]}" 2>/dev/null)"
  for f in "${CREATED_TARGETS[@]}"; do
    [ -e "$f" ] && leftover="${leftover}    ${f}"$'
'
  done
  for f in "${TRACKED_TARGETS[@]}"; do
    [ -e "$f.bak" ] && leftover="${leftover}    ${f}.bak"$'
'
  done

  if [ -n "$dirty" ] || [ -n "$leftover" ]; then
    echo ""
    echo "  x verify:fitness REFUSES TO START — the working tree is not clean where this suite injects."
    echo ""
    [ -n "$dirty" ] && { echo "    tracked files with UNSTAGED changes:"; echo "$dirty" | sed 's/^/      /'; echo ""; }
    [ -n "$leftover" ] && { echo "    leftover artifacts:"; printf '%s' "$leftover"; echo ""; }
    echo "    Two reasons this is fatal rather than a warning (SB-46):"
    echo ""
    echo "      1. A run starting from an already-injected tree measures the ARTIFACT, not the code."
    echo "         It reports confident, specific, WRONG results — cases failing for reasons that"
    echo "         look exactly like a regression in the rules."
    echo "      2. This suite restores these paths on exit. Unstaged work in them would be"
    echo "         DESTROYED. (Staged work is safe and does not trip this check.)"
    echo ""
    echo "    Commit or stash the real work; delete the artifacts. If these are leftovers from a"
    echo "    killed run, 'git checkout -- <file>' and remove the __violation files."
    echo ""
    exit 1
  fi
}

# Order is load-bearing: refuse on a dirty tree BEFORE arming a trap that restores from HEAD.
preflight
trap 'restore_tree' EXIT
trap 'echo ""; echo "  ! interrupted — restoring the tree (SB-46)"; restore_tree; exit 130' INT TERM

pass=0; fail=0
hr() { printf '\n────────────────────────────────────────────────────────────────────\n'; }

# $1 = label, $2 = rule id, $3 = command, $4 = grep pattern that MUST appear in the failure
check() {
  local label="$1" cmd="$2" pattern="$3"
  local out rc
  out="$($cmd 2>&1)"; rc=$?
  if [ $rc -eq 0 ]; then
    echo "  RESULT: ✗ COMMAND PASSED — the violation was NOT caught"
    fail=$((fail+1))
  elif echo "$out" | grep -qE "$pattern"; then
    echo "  RESULT: ✓ failed as required (exit $rc)"
    echo "$out" | grep -E "$pattern" | head -2 | sed 's/^/          /'
    pass=$((pass+1))
  else
    echo "  RESULT: ✗ failed (exit $rc) but not with the expected message"
    echo "$out" | tail -5 | sed 's/^/          /'
    fail=$((fail+1))
  fi
}

# ── 1. BR-1220 / BR-1342 / BR-545 — raw hex in a component ────────────────────
hr; echo "1. BR-1220 — a raw hex colour in a component fails the build"
cat > apps/web/app/__violation.css <<'CSS'
.thing { color: #ff0000; }
CSS
check "raw hex" "pnpm lint:css" "declaration-property-value-disallowed-list|color"
rm -f apps/web/app/__violation.css

# ── 2. BR-1232 / BR-1392 / BR-527 — physical direction property ───────────────
hr; echo "2. BR-1232 — a physical direction property fails the build"
cat > apps/web/app/__violation.css <<'CSS'
.thing { margin-left: 1rem; }
CSS
check "physical property" "pnpm lint:css" "property-disallowed-list|margin-left"
rm -f apps/web/app/__violation.css

# ── 3. BR-1353 — !important ───────────────────────────────────────────────────
hr; echo "3. BR-1353 — !important fails the build"
cat > apps/web/app/__violation.css <<'CSS'
.thing { display: block !important; }
CSS
check "important" "pnpm lint:css" "declaration-no-important|important"
rm -f apps/web/app/__violation.css

# ── 4. BR-1493 — transition: all ──────────────────────────────────────────────
hr; echo "4. BR-1493 — transition: all fails the build"
cat > apps/web/app/__violation.css <<'CSS'
.thing { transition: all 200ms; }
CSS
check "transition all" "pnpm lint:css" "declaration-property-value-disallowed-list|transition"
rm -f apps/web/app/__violation.css

# ── 5. BR-1329 / BR-1317 — off-scale spacing unit ─────────────────────────────
hr; echo "5. BR-1329 — an off-scale px spacing value fails the build"
cat > apps/web/app/__violation.css <<'CSS'
.thing { padding: 13px; }
CSS
check "off-scale" "pnpm lint:css" "declaration-property-unit-disallowed-list|padding"
rm -f apps/web/app/__violation.css

# ── 6. BR-523 / BR-1357 — hardcoded user-facing string ────────────────────────
hr; echo "6. BR-523 — a hardcoded user-facing string fails the build"
cat > apps/web/components/__Violation.tsx <<'TSX'
export function Violation() {
  return <p>Welcome back to the academy</p>;
}
TSX
check "hardcoded string" "pnpm --filter @josam/web run lint" "no-hardcoded-strings"
rm -f apps/web/components/__Violation.tsx

# ── 7. BR-523 — hardcoded string in a user-facing attribute ───────────────────
hr; echo "7. BR-523 — a hardcoded string in a user-facing attribute fails the build"
cat > apps/web/components/__Violation.tsx <<'TSX'
export function Violation() {
  return <input aria-label="Email address" />;
}
TSX
check "hardcoded attribute" "pnpm --filter @josam/web run lint" "no-hardcoded-strings"
rm -f apps/web/components/__Violation.tsx

# ── 8. BR-1580 / BR-897 — Prisma outside shared/database ──────────────────────
hr; echo "8. BR-1580 — Prisma imported outside shared/database fails the build"
cat > apps/api/src/modules/health/__violation.ts <<'TS'
import { PrismaClient } from '../../generated/prisma/client.js';

export const leak: unknown = PrismaClient;
TS
check "prisma containment" "pnpm --filter @josam/api exec eslint src/modules/health/__violation.ts" "BR-1580|no-prisma-outside-repository"
rm -f apps/api/src/modules/health/__violation.ts

# ── 9. BR-1599 / BR-899 — vendor SDK outside shared/providers ─────────────────
hr; echo "9. BR-1599 — a vendor SDK imported outside shared/providers fails the build"
cat > apps/api/src/modules/health/__violation.ts <<'TS'
import * as Sentry from '@sentry/node';

export const leak = Sentry;
TS
check "vendor sdk" "pnpm --filter @josam/api exec eslint src/modules/health/__violation.ts" "no-restricted-imports|BR-1599"
rm -f apps/api/src/modules/health/__violation.ts

# ── 10. BR-855 — token in web storage ─────────────────────────────────────────
hr; echo "10. BR-855 — localStorage used for a token fails the build"
cat > apps/web/components/__Violation.tsx <<'TSX'
export function Violation() {
  localStorage.setItem('accessToken', 'x');
  return null;
}
TSX
check "token storage" "pnpm --filter @josam/web run lint" "no-restricted-syntax|BR-855"
rm -f apps/web/components/__Violation.tsx

# ── 11. BR-1501 — console.log ─────────────────────────────────────────────────
hr; echo "11. BR-1501 — console.log fails the build"
cat > apps/api/src/modules/health/__violation.ts <<'TS'
export function violate(): void {
  console.log('debugging');
}
TS
check "console" "pnpm --filter @josam/api exec eslint src/modules/health/__violation.ts" "no-console"
rm -f apps/api/src/modules/health/__violation.ts

# ── 12. BR-901 — module boundary violation
hr; echo "12. BR-901 — shared/ importing a module fails the build (element-types)"
cat > apps/api/src/shared/database/__violation.ts <<'TS'
import { HealthService } from '../../modules/health/health.service.js';

export const leak = HealthService;
TS
check "boundaries" "pnpm --filter @josam/api exec eslint src/shared/database/__violation.ts" "boundaries/dependencies|BR-901"
rm -f apps/api/src/shared/database/__violation.ts

# ── 13. layer direction — shared must not depend on modules (graph rule) ──────
hr; echo "13. Layer direction — shared/ depending on modules/ fails dependency-cruiser"
cat > apps/api/src/shared/database/__violation.ts <<'TS'
import { HealthService } from '../../modules/health/health.service.js';

export const leak = HealthService;
TS
check "layer direction" "pnpm check:deps" "shared-must-not-depend-on-modules"
rm -f apps/api/src/shared/database/__violation.ts

# ── 14. no circular dependencies (graph rule) ─────────────────────────────────
hr; echo "14. No circular dependencies fails dependency-cruiser"
cat > packages/i18n/src/__a.ts <<'TS'
import { b } from './__b.js';

export const a = (): string => b();
TS
cat > packages/i18n/src/__b.ts <<'TS'
import { a } from './__a.js';

export const b = (): string => a();
TS
check "circular" "pnpm check:deps" "no-circular"
rm -f packages/i18n/src/__a.ts packages/i18n/src/__b.ts

# ── 15. BR-1575 — packages/ui depending on an app ─────────────────────────────
hr; echo "15. BR-1575 — packages/ui depending on an app fails dependency-cruiser"
cat > packages/ui/src/__violation.ts <<'TS'
import { ThemeHarness } from '../../../apps/web/components/ThemeHarness.js';

export const leak = ThemeHarness;
TS
check "ui independence" "pnpm check:deps" "ui-must-not-depend-on-apps|packages-must-not-depend-on-apps"
rm -f packages/ui/src/__violation.ts

# ── 16. BR-811 / BR-1365 — prohibited copy term ───────────────────────────────
hr; echo "16. BR-811 — a prohibited copy term in a catalog fails the check"
node -e "
const fs=require('node:fs');const f='packages/i18n/src/catalogs/en.ts';
let s=fs.readFileSync(f,'utf8');
s=s.replace(\"'common.retry': 'Try again',\", \"'common.retry': 'You failed — try again',\");
fs.writeFileSync(f,s);
"
pnpm --filter @josam/i18n run build >/dev/null 2>&1
check "prohibited copy" "pnpm check:catalogs" "BR-811"
git checkout -- packages/i18n/src/catalogs/en.ts
pnpm --filter @josam/i18n run build >/dev/null 2>&1

# ── 17. BR-524 — English key with no Arabic source ────────────────────────────
hr; echo "17. BR-524 — an English key with no Arabic source fails the check"
node -e "
const fs=require('node:fs');const f='packages/i18n/dist/catalogs/en.js';
let s=fs.readFileSync(f,'utf8');
s=s.replace('export const en = {', \"export const en = { 'orphan.key': 'No Arabic source',\");
fs.writeFileSync(f,s);
"
check "arabic source" "pnpm check:catalogs" "BR-524"
pnpm --filter @josam/i18n run build >/dev/null 2>&1

# ── 18. BR-1469 — clickable non-semantic element (jsx-a11y, activated at PH-0.17) ─────────
hr; echo "18. BR-1469 — a clickable non-semantic element fails the build"
cat > packages/ui/src/__Violation.tsx <<'TSX'
export function Violation({ onSelect }: { onSelect: () => void }) {
  return <div onClick={onSelect} />;
}
TSX
check "clickable div" "pnpm --filter @josam/ui exec eslint src/__Violation.tsx" "jsx-a11y"
rm -f packages/ui/src/__Violation.tsx

# ── 19. BR-1471 — icon button with no accessible name ─────────────────────────────────────
hr; echo "19. BR-1471 — a button with no accessible name fails the build"
cat > packages/ui/src/__Violation.tsx <<'TSX'
export function Violation() {
  return <button type="button" />;
}
TSX
check "unnamed button" "pnpm --filter @josam/ui exec eslint src/__Violation.tsx" "jsx-a11y"
rm -f packages/ui/src/__Violation.tsx

# ── 20. BR-1429 — array index as a React key ──────────────────────────────────────────────
hr; echo "20. BR-1429 — an array index used as a React key fails the build"
cat > packages/ui/src/__Violation.tsx <<'TSX'
export function Violation({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
TSX
check "array index key" "pnpm --filter @josam/ui exec eslint src/__Violation.tsx" "BR-1429|no-restricted-syntax"
rm -f packages/ui/src/__Violation.tsx

# ── 21. DEC-40 — an off-scale value is a TYPE error, not a lint error ─────────────────────
hr; echo "21. DEC-40 — an off-scale primitive value fails to COMPILE (not merely to lint)"
cat > packages/ui/src/__violation.tsx <<'TSX'
import { Stack, Text } from './index.js';

export const a = <Text size="19px">x</Text>;
export const b = <Stack gap={13} />;
export const c = <Text tone="#E8B04B">x</Text>;
export const d = <Stack gap="5" />;
TSX
check "off-scale is a type error" "pnpm --filter @josam/ui exec tsc -p tsconfig.json --noEmit" "TS2322"
rm -f packages/ui/src/__violation.tsx

hr
# ── 22. BR-1347 — a disabled control that does not explain why ────────────────────────────
hr; echo "22. BR-1347 — a disabled control with no stated reason fails to COMPILE"
cat > packages/ui/src/__violation.tsx <<'TSX'
import { ArrowRight } from 'lucide-react';

import { Button, IconButton } from './index.js';

export const a = <Button disabled>Enrol</Button>;
export const b = <IconButton icon={ArrowRight} label="Next" disabled />;
TSX
check "disabled without reason" "pnpm --filter @josam/ui exec tsc -p tsconfig.json --noEmit" "disabledReason.*is missing"
rm -f packages/ui/src/__violation.tsx

# ── 23. BR-1471 — an icon button with no accessible name ──────────────────────────────────
hr; echo "23. BR-1471 — an icon-only button with no accessible name fails to COMPILE"
cat > packages/ui/src/__violation.tsx <<'TSX'
import { ArrowRight } from 'lucide-react';

import { IconButton } from './index.js';

export const c = <IconButton icon={ArrowRight} />;
TSX
check "icon button unnamed" "pnpm --filter @josam/ui exec tsc -p tsconfig.json --noEmit" "'label' is missing"
rm -f packages/ui/src/__violation.tsx

hr
# ── 24. BR-1834 — the emitted stylesheet must actually contain utilities ──────────────────
# Not a deliberate violation: an OUTPUT assertion. A tool with --fix authority is itself a source
# of defects, and the only trustworthy check on one is the artifact it produced. At PH-0.17 every
# gate was green while this stylesheet held 3,083 bytes of tokens and zero utility classes.
hr; echo "24. BR-1834 — built stylesheet carries real utilities, not just tokens"
# The build's exit code was discarded. A FAILED build leaves the previous `.next` in place, so a
# stale stylesheet from an earlier run would satisfy every probe below and the case would pass
# having measured nothing current. Same shape as case 25's missing positive control.
rm -rf apps/web/.next
if ! pnpm --filter @josam/web run build >/dev/null 2>&1; then
  echo "  RESULT: ✗ the web build failed — nothing to inspect, and a stale .next would have lied"
  fail=$((fail+1))
  CSS_FILE=""
else
  CSS_FILE="$(find apps/web/.next -name '*.css' -not -path '*/cache/*' 2>/dev/null | head -1)"
fi
if [ -z "$CSS_FILE" ]; then
  echo "  RESULT: ✗ no stylesheet was emitted at all"
  fail=$((fail+1))
else
  CSS_BYTES="$(wc -c <"$CSS_FILE" | tr -d ' ')"
  MISSING=""
  for cls in bg-bg-base text-text-primary gap-4 p-8 rounded-md flex-col; do
    grep -qiF -e ".$cls" "$CSS_FILE" || MISSING="$MISSING $cls"
  done
  # 8000 is well above the ~3,083 bytes the tokens alone produce and well below the ~14,399 a
  # working build emits, so it separates the two states without tracking every future addition.
  if [ "$CSS_BYTES" -lt 8000 ]; then
    echo "  RESULT: ✗ stylesheet is ${CSS_BYTES} bytes — tokens without utilities"
    fail=$((fail+1))
  elif [ -n "$MISSING" ]; then
    echo "  RESULT: ✗ missing utilities:$MISSING"
    fail=$((fail+1))
  else
    echo "  RESULT: ✓ ${CSS_BYTES} bytes, every probed utility present"
    pass=$((pass+1))
  fi
fi

# ── 25. BR-1834 — stylelint --fix must not rewrite Tailwind's import out of existence ─────
hr; echo "25. BR-1834 — stylelint --fix leaves the bare @import and prefix media queries alone"
# A POSITIVE CONTROL sits in this file alongside the two things autofix must NOT touch.
#
# Without it the case passes when stylelint never runs at all: both "was it rewritten?" checks
# answer no, and the case reports "autofix left both intact" — which is true and meaningless.
# Verified: with a bad `--config` path stylelint exits 1 and rewrites nothing, and this case
# reported SUCCESS. Exit codes do not discriminate here, because 1 is also what ordinary lint
# errors produce.
#
# `#FFFFFF` -> `#FFF` is a rewrite this configuration DOES perform (checked, not assumed). If it
# is still `#FFFFFF` afterwards, autofix did not run and the other two answers are worthless.
# `BR-1845` — a negative suite needs a positive twin.
cat > apps/web/app/__probe.css <<'CSS'
@import 'tailwindcss';
.positive-control {
  color: #FFFFFF;
}
@media (min-width: 640px) {
  .thing {
    display: grid;
  }
}
CSS
pnpm exec stylelint --fix apps/web/app/__probe.css >/dev/null 2>&1
if grep -qF "#FFFFFF" apps/web/app/__probe.css; then
  echo "  RESULT: ✗ autofix did NOT run — the positive control was not rewritten, so the"
  echo "          'left alone' assertions below prove nothing"
  fail=$((fail+1))
elif grep -qF "@import url(" apps/web/app/__probe.css; then
  echo "  RESULT: ✗ the bare @import was rewritten to url() — Tailwind would be silently disabled"
  fail=$((fail+1))
elif grep -qF "width >=" apps/web/app/__probe.css; then
  echo "  RESULT: ✗ the media query was rewritten to range notation — silently unsupported on older browsers"
  fail=$((fail+1))
else
  echo "  RESULT: ✓ autofix left both intact"
  pass=$((pass+1))
fi
rm -f apps/web/app/__probe.css

# ── 26. react-hooks/rules-of-hooks — activated at PH-0.24 ─────────────────────────────────
# Added because nothing in the toolchain could see that a hook had been called inside a render
# prop. It reported seven real problems the moment it was switched on, two of them exactly that.
# A hook in a render prop lands in the PARENT's hook sequence: stable while the call is
# unconditional, and one early return away from a corrupted one. Types cannot see it, tests pass
# on it, and it fails later under a condition nobody wrote a test for.
hr; echo "26. react-hooks/rules-of-hooks — a hook inside a callback fails the build"
cat > packages/ui/src/__violation.tsx <<'TSX'
import { useState } from 'react';

export function Violation({ render }: { render: (n: number) => React.ReactNode }) {
  return <div>{render(0)}</div>;
}

export function Caller() {
  return (
    <Violation
      render={() => {
        const [n] = useState(0);
        return <span>{n}</span>;
      }}
    />
  );
}
TSX
check "hook in a render prop" "pnpm --filter @josam/ui run lint" "rules-of-hooks|React Hook"
rm -f packages/ui/src/__violation.tsx

# ── 27. react-hooks/exhaustive-deps — the half of the plugin that is easy to leave as a warning ──
# Kept at `error`, not `warn`. A stale closure is a correctness bug that renders correctly on the
# first pass and wrongly on every later one, which is the hardest kind to attribute to its cause.
hr; echo "27. react-hooks/exhaustive-deps — a missing dependency fails the build"
cat > packages/ui/src/__violation.tsx <<'TSX'
import { useCallback } from 'react';

export function Violation({ value }: { value: string }) {
  const read = useCallback(() => value.length, []);
  return <span>{read()}</span>;
}
TSX
check "missing dependency" "pnpm --filter @josam/ui run lint" "exhaustive-deps|missing dependency"
rm -f packages/ui/src/__violation.tsx

# ── 28. jsx-a11y/control-has-associated-label is scoped OFF for field bodies, ON everywhere else ──
# `fieldLabelScoping` disables one rule for `src/fields/**`, where `FormField` owns the label and
# the rule can only ever produce false positives. Scoping a rule is indistinguishable from
# disabling it unless the remaining coverage is proven, so this asserts the rule still bites in
# apps/web — the place feature code would actually write a nameless control.
hr; echo "28. the scoped-off a11y rule is still active OUTSIDE packages/ui/src/fields"
cat > apps/web/app/__violation.tsx <<'TSX'
export default function Violation() {
  return (
    <div>
      <input type="text" />
    </div>
  );
}
TSX
check "nameless control in a feature file" "pnpm --filter @josam/web run lint" "control-has-associated-label|label"
rm -f apps/web/app/__violation.tsx

# ── 29. BR-1549 — a second primary action is a TYPE error, not a review comment ───────────
# The PH-0.26 Output. `PageHeader.primaryAction` is a description, not a ReactNode, precisely so
# that this cannot compile: a ReactNode prop would accept `<>{save}{publish}</>` as one valid node
# containing two buttons, and no type can see inside a fragment.
hr; echo "29. BR-1549 — two primary actions on a PageHeader fail the build"
cat > packages/ui/src/__violation.tsx <<'TSX'
import { PageHeader } from './layout/PageHeader.js';

export function Violation() {
  return (
    <PageHeader
      title="Courses"
      primaryAction={[
        { label: 'Save', onClick: () => undefined },
        { label: 'Publish', onClick: () => undefined },
      ]}
    />
  );
}
TSX
check "two primary actions" "pnpm --filter @josam/ui run typecheck" "TS2322|not assignable"
rm -f packages/ui/src/__violation.tsx

# ── 30. BR-1548 / BR-1472 — a disabled primary action must still say why ──────────────────
# BR-1347 through the type system: PrimaryAction carries Button's DisabledState union, so the
# disabled arm cannot be written without its reason. Same shape as case 23, one level further out.
hr; echo "30. BR-1347 — a disabled primary action with no reason fails the build"
cat > packages/ui/src/__violation.tsx <<'TSX'
import { PageHeader } from './layout/PageHeader.js';

export function Violation() {
  return (
    <PageHeader
      title="Courses"
      primaryAction={{ label: 'Publish', onClick: () => undefined, disabled: true }}
    />
  );
}
TSX
check "disabled with no reason" "pnpm --filter @josam/ui run typecheck" "TS2322|disabledReason|not assignable"
rm -f packages/ui/src/__violation.tsx

# ── 31. BR-1536 / DEC-41 — QueryBoundary's three states are required ─────────────────────
# The PH-0.27 Output. BR-1416, the state matrix, is the rule most likely to be forgotten under
# deadline, so it is made structurally impossible to skip rather than documented and hoped for.
hr; echo "31. BR-1536 — a QueryBoundary missing its empty state fails the build"
cat > packages/ui/src/__violation.tsx <<'TSX'
import { QueryBoundary } from './architectural/QueryBoundary.js';

const query = {
  data: [] as string[],
  isPending: false,
  isError: false,
  error: null,
  refetch: () => undefined,
};

export function Violation() {
  return (
    <QueryBoundary query={query} loading={<p>loading</p>} error={() => <p>error</p>}>
      {(rows) => <p>{rows.length}</p>}
    </QueryBoundary>
  );
}
TSX
check "QueryBoundary without empty" "pnpm --filter @josam/ui run typecheck" "TS2739|TS2741|empty"
rm -f packages/ui/src/__violation.tsx

# ── 32. BR-1551 — an EmptyState with no way out ──────────────────────────────────────────
# An empty screen with no action is a dead end the user has to navigate away from to escape, and
# it is exactly what ships when the prop is optional and the deadline is close.
hr; echo "32. BR-1551 — an EmptyState with no action fails the build"
cat > packages/ui/src/__violation.tsx <<'TSX'
import { EmptyState } from './feedback/states.js';

export function Violation() {
  return <EmptyState title="Nothing yet" body="Add one to begin" />;
}
TSX
check "EmptyState without action" "pnpm --filter @josam/ui run typecheck" "TS2739|TS2741|action"
rm -f packages/ui/src/__violation.tsx

# ── 33. BR-1544 / BR-1347 — a bare `disabled?: boolean` on a field ───────────────────────
# Added at PH-0.29. Nineteen of twenty-four fields carried this shape for twenty-two tasks while
# BR-1347 sat in the specification and `Button` had enforced it since PH-0.20. The rule is what
# stops it coming back the next time somebody adds a field in a hurry.
hr; echo "33. BR-1544 — a field declaring a bare disabled?: boolean fails the build"
cat > packages/ui/src/__violation.ts <<'TS'
export interface ViolationFieldProps {
  label: string;
  disabled?: boolean;
}
TS
check "bare disabled prop" "pnpm --filter @josam/ui run lint" "BR-1544|no-restricted-syntax"
rm -f packages/ui/src/__violation.ts

# ── 34. BR-1347 — and the union it points to must actually require the reason ─────────────
# Case 33 proves the wrong shape is rejected. This proves the RIGHT shape is load-bearing rather
# than decorative: `Availability` with `disabled: true` and no reason must not compile. Without
# this, case 33 would only be enforcing a naming convention.
hr; echo "34. BR-1347 — Availability with disabled but no reason fails the build"
cat > packages/ui/src/__violation.tsx <<'TSX'
import { TextField } from './fields/text-fields.js';

export function Violation() {
  return <TextField disabled />;
}
TSX
check "disabled field with no reason" "pnpm --filter @josam/ui run typecheck" "TS2322|disabledReason|not assignable"
rm -f packages/ui/src/__violation.tsx

# ── 35. BR-1544 — readOnly and disabled are mutually exclusive ───────────────────────────
# A control declaring both leaves the reader to guess which one won, and leaves the component to
# pick. The union's `readOnly?: never` arm makes the question unaskable.
hr; echo "35. BR-1544 — a field that is both readOnly and disabled fails the build"
cat > packages/ui/src/__violation.tsx <<'TSX'
import { TextField } from './fields/text-fields.js';

export function Violation() {
  return <TextField disabled disabledReason="because" readOnly />;
}
TSX
check "readOnly and disabled together" "pnpm --filter @josam/ui run typecheck" "TS2322|readOnly|not assignable"
rm -f packages/ui/src/__violation.tsx

# ── 36. SB-15 — the root-level lint path is live, not a no-op ────────────────────────────
# `PH-0.10` runs lint TWICE on purpose: `turbo run lint` inside each workspace, and `lint:hook`
# once from the repository root the way the pre-commit hook does. The second caught a real parser
# defect at `PH-0.2` that the first structurally cannot see.
#
# A second invocation that silently matched no files would look exactly like a second invocation
# that passed — the failure mode BR-1830 exists for. This puts a violation where only the root
# path is asked about, and requires it to be reported.
hr; echo "36. SB-15 — pnpm lint:hook actually lints the workspaces"
# A LINT violation, not a type error. The first version of this case used `const x: string = 1`
# and reported the case as NOT caught — correctly: ESLint does not report type errors, so the
# case was testing the wrong tool. BR-855's selector is unambiguous and fires on a single line.
cat > packages/ui/src/__violation.ts <<'TS'
export function violate(token: string): void {
  localStorage.setItem('session', token);
}
TS
check "root-level lint sees workspace files" "pnpm lint:hook" "BR-855|no-restricted-syntax"
rm -f packages/ui/src/__violation.ts

# ── 37. BR-1838 — renovate.json is validated, not assumed ────────────────────────────────
# Renovate REJECTS unknown keys rather than ignoring them. `_comment` fields added for readability
# stopped the bot dead: it opened a configuration-error issue, opened no PRs, and the repository
# had a dependency policy that existed only as a file nobody had run anything against.
#
# The same shape as the Prisma failure one level out: a config that has never been validated is
# not a config that works. This puts the exact rejected key back and requires it to fail.
hr; echo "37. BR-1838 — an invalid renovate.json fails the build"
node -e '
  const fs = require("fs");
  const config = JSON.parse(fs.readFileSync("renovate.json", "utf8"));
  config._comment = "an invented key — Renovate rejects rather than ignores this";
  fs.writeFileSync("renovate.json", JSON.stringify(config, null, 2));
'
check "invalid renovate key" "pnpm check:renovate" "Invalid configuration option|_comment"
git checkout -- renovate.json

# ── 38. BR-1486 — the bundle budget, activated at PH-0.30 ────────────────────────────────
# Row 14 of 12 §19 named size-limit and 13 §18.1 pinned it at PH-0.16. It was never installed, and
# the row pointed at a task that had already closed — it had no owner until now.
hr; echo "38. BR-1486 — a bundle over the 200 KB budget fails the build"
sed -i "s/limit: '200 KB'/limit: '1 KB'/" .size-limit.mjs
check "bundle over budget" "pnpm check:size" "exceeded|has exceeded"
git checkout -- .size-limit.mjs

# ── 39. BR-1502 — a blanket "use client" in the route tree ───────────────────────────────
# Row 17. It had been waiting for a client component to exist; twenty do. Its own rule name rather
# than another no-restricted-syntax selector, because ESLint REPLACES a rule's options and scoping
# that rule off outside apps/web/app would have killed BR-855, BR-1429 and BR-1544 in packages/**.
hr; echo "39. BR-1502 — a blanket use client in the route tree fails the build"
mkdir -p apps/web/app/__violation
cat > apps/web/app/__violation/page.tsx <<'TSX'
'use client';

export default function Violation() {
  return <p>opted the whole route out of server rendering</p>;
}
TSX
check "blanket use client" "pnpm exec eslint apps/web/app/__violation/page.tsx" "BR-1502|no-blanket-use-client"
rm -rf apps/web/app/__violation

# ── 40. 12 §20.12.1 — the Wave 1 roster is checked, not counted ──────────────────────────
# The Phase 0 report had to say "69/69, but that is a count I did, not a gate". The gate found that
# the real figure was 68: `Toast` was in the roster and not exported.
hr; echo "40. 12 §20.12.1 — a component missing from the package surface fails the build"
node -e '
  const fs = require("fs");
  const s = fs.readFileSync("packages/ui/src/index.ts", "utf8").replace(/^\s*Skeleton,$/m, "");
  fs.writeFileSync("packages/ui/src/index.ts", s);
'
# The pattern must match text ONLY the real assertion produces. `Skeleton|roster` matched
# `src/roster.spec.ts` in a pnpm error line when the spec failed to start at all — a false
# green inside the fitness suite, hidden by exactly the permissive matching `BR-1849`
# describes. `to include 'Skeleton'` is emitted by the assertion and by nothing else.
check "component missing from the roster" "pnpm --filter @josam/ui exec vitest run src/roster.spec.ts" "to include .Skeleton."
git checkout -- packages/ui/src/index.ts

# ── 41. A summary figure that disagrees with its own table ──────────────────────────────
# Phase 0 shipped FIVE of these — `12 §19`'s score line, and two totals in CLAUDE.md's own
# header. Each was written once and never recomputed, and each was invisible to reading the
# summary. A number nobody recomputes is the same class of defect as a check that loads and
# enforces nothing: it occupies the place where a check should be, and reports something
# reassuring. Founder decision, 2026-07-30.
hr; echo "41. A progress total that disagrees with its own table fails the build"
node -e '
  const fs = require("fs");
  fs.writeFileSync("CLAUDE.md",
    fs.readFileSync("CLAUDE.md","utf8").replace(/Estimated total [\d.]+ d/, "Estimated total 20.5 d"));
'
check "stale summary total" "pnpm check:ledgers" "estimated total says|sums to"
git checkout -- CLAUDE.md

# ── 42. BR-1833 / BR-1840 — a deferral owned by a task that has already closed ──────────
# `12 §19` row 15 sat on `PH-0.11` after `PH-0.11` closed without it, and row 20 named a
# PHASE rather than a task. Both survived because the summary was read instead of the rows.
hr; echo "42. BR-1840 — a deferred check owned by a COMPLETED task fails the build"
node -e '
  const fs = require("fs");
  const s = fs.readFileSync("STATUS.md","utf8").replace("⬜ **`PH-1.10`**", "⬜ **`PH-0.11`**");
  fs.writeFileSync("STATUS.md", s);
'
check "deferral owned by a done task" "pnpm check:ledgers" "which is DONE|BR-1840"
git checkout -- STATUS.md

# ── 43. BR-1842 — task order inconsistent with foreign-key direction ────────────────────
# Found before `PH-1.1` started, by reading the schema rather than by running the migration.
# `users.role_id` referenced `roles`, which lived in `PH-1.7`, which depended on `PH-1.1`. The
# migration would have APPLIED — an ORM orders CREATE TABLE correctly within one migration — and
# failed at seed time, three tasks later, looking like a bad seed script.
hr; echo "43. BR-1842 — a table referencing one created in a LATER task fails the build"
node -e '
  const fs = require("fs");
  const p = "docs/16-task-breakdown.md";
  let s = fs.readFileSync(p, "utf8");
  s = s.replace("| `PH-1.1` | Schema: **`roles`** `users`", "| `PH-1.1` | Schema: `users`");
  s = s.replace("| `PH-1.7` | Schema: `permissions`", "| `PH-1.7` | Schema: `roles` `permissions`");
  fs.writeFileSync(p, s);
'
check "fk order vs task order" "pnpm check:fk-order" "not created until|BR-1842"
git checkout -- docs/16-task-breakdown.md

# ── 44. The module graph resolves — the container, not the units ────────────────────────
# The widest blind spot this project has produced. `BreachList` took an optional `string`, which
# Nest cannot inject, so the API could not START from PH-1.2 to PH-1.6 — through four green CI
# runs and a production deploy. Every spec used `new`, so the injector was the one component never
# exercised. A green suite says the units work; only the container says the application starts.
#
# Removing a provider that something injects must fail the build. Not "when someone suspects DI".
hr; echo "44. BR-1830 — a provider missing from the graph fails the build (the container check)"
node -e '
  const fs = require("fs");
  const p = "apps/api/src/shared/security/security.module.ts";
  // PasswordHasher is injected by RegistrationService. Removing it from the providers list leaves
  // a graph Nest cannot build — which nothing but a container test can see.
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("providers: [PasswordHasher, BreachList],", "providers: [BreachList],"));
'
check "provider missing from the module graph" "pnpm --filter @josam/api exec vitest run src/shared/security/security.module.spec.ts" "Nest can.t resolve|UnknownDependencies|PasswordHasher"
git checkout -- apps/api/src/shared/security/security.module.ts

# ── 45. BR-964 — a permission absent from code is FLAGGED, never deleted ────────────────
# `role_permissions.permission_id` is ON DELETE CASCADE, so deleting a permission row silently
# drops every grant referencing it. A permission temporarily removed from code — a refactor, a bad
# merge, a feature flag — would then destroy an administrator's configuration permanently, and
# restoring the code would NOT restore the grants. Flagging is reversible; deletion is not.
#
# The violation: make the sync DELETE orphans instead of flagging them. The spec that asserts the
# row survives must fail. `BR-1725` — enforcement is proven by breaking it, not by a green spec.
hr; echo "45. BR-964 — deleting an orphaned permission instead of flagging it fails the build"
node -e '
  const fs = require("fs");
  const p = "apps/api/src/shared/database/repositories/permission.repository.ts";
  const s = fs.readFileSync(p, "utf8").replace(
    `        await tx.permission.updateMany({
          where: { key: { in: toOrphan } },
          data: { isOrphaned: true },
        });`,
    `        await tx.permission.deleteMany({ where: { key: { in: toOrphan } } });`,
  );
  fs.writeFileSync(p, s);
'
check "orphan deleted instead of flagged" "pnpm --filter @josam/api exec vitest run src/modules/access/permission-sync.spec.ts" "the row must still exist|toHaveLength"
git checkout -- apps/api/src/shared/database/repositories/permission.repository.ts

# ── 46. PH-1.10 — an added scope exception fails the build ────────────────────
#
# BR-1849 AUDIT: the assertion pattern is "count changed: pinned at", which appears nowhere in
# the command (`pnpm check:scope-exceptions`), in any path, or in any argument. It can only come
# from the check's own stderr. Case 40 passed while observing nothing because its pattern matched
# a filename echoed back by its own command; this pattern cannot.
hr; echo "46. PH-1.10 — an added unscoped() call site fails the build"
node -e "
const fs=require('node:fs');const f='apps/api/src/shared/database/repositories/user.repository.ts';
let s=fs.readFileSync(f,'utf8');
s=s.replace('async findRoleIdByKey(', 'async __extraException(): Promise<number> {\n    return this.prisma.unscoped(\'system\').user.count();\n  }\n\n  async findRoleIdByKey(');
fs.writeFileSync(f,s);
"
check "scope exception added" "pnpm check:scope-exceptions" "count changed: pinned at"
git checkout -- apps/api/src/shared/database/repositories/user.repository.ts

# ── 47. PH-1.10 — an unclassified Prisma model fails the build ────────────────
#
# Deny-by-default: `MODEL_SCOPES` is `satisfies Record<Uncapitalize<Prisma.ModelName>, ScopeSpec>`,
# so a new table cannot be queried until its scoping is decided. PH-1.14/1.17/1.20 add owned
# tables, and this is what stops them arriving unclassified.
#
# BR-1849 AUDIT: the pattern is "scopeProbe' is missing", emitted only by tsc. The identifier
# exists solely inside the injected schema, which is never echoed by `pnpm typecheck`.
hr; echo "47. PH-1.10 — a Prisma model with no scope classification fails the build"
cat >> apps/api/prisma/schema.prisma <<'PRISMA'

model ScopeProbe {
  id String @id @default(uuid()) @db.Uuid

  @@map("scope_probe")
}
PRISMA
pnpm --filter @josam/api exec prisma generate >/dev/null 2>&1
check "unclassified model" "pnpm typecheck" "scopeProbe' is missing"
git checkout -- apps/api/prisma/schema.prisma
pnpm --filter @josam/api exec prisma generate >/dev/null 2>&1


hr
echo "BR-1725 SUMMARY: ${pass} caught, ${fail} NOT caught"
[ "$fail" -eq 0 ] || exit 1

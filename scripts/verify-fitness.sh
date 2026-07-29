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
cp packages/i18n/src/catalogs/en.ts packages/i18n/src/catalogs/en.ts.bak
node -e "
const fs=require('node:fs');const f='packages/i18n/src/catalogs/en.ts';
let s=fs.readFileSync(f,'utf8');
s=s.replace(\"'common.retry': 'Try again',\", \"'common.retry': 'You failed — try again',\");
fs.writeFileSync(f,s);
"
pnpm --filter @josam/i18n run build >/dev/null 2>&1
check "prohibited copy" "pnpm check:catalogs" "BR-811"
mv packages/i18n/src/catalogs/en.ts.bak packages/i18n/src/catalogs/en.ts
pnpm --filter @josam/i18n run build >/dev/null 2>&1

# ── 17. BR-524 — English key with no Arabic source ────────────────────────────
hr; echo "17. BR-524 — an English key with no Arabic source fails the check"
cp packages/i18n/dist/index.js packages/i18n/dist/index.js.bak
node -e "
const fs=require('node:fs');const f='packages/i18n/dist/catalogs/en.js';
let s=fs.readFileSync(f,'utf8');
s=s.replace('export const en = {', \"export const en = { 'orphan.key': 'No Arabic source',\");
fs.writeFileSync(f,s);
"
check "arabic source" "pnpm check:catalogs" "BR-524"
pnpm --filter @josam/i18n run build >/dev/null 2>&1
rm -f packages/i18n/dist/index.js.bak

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
echo "BR-1725 SUMMARY: ${pass} caught, ${fail} NOT caught"
[ "$fail" -eq 0 ] || exit 1

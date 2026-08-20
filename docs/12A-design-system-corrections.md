# 12A — Design System Corrections & Token Layer v1.0

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Document** | 12A — Design System Corrections & Token Layer |
| **Status** | Draft — Pending Approval |
| **Version** | 1.0 |
| **Last Updated** | 2026-08-19 |
| **Supersedes** | `12-ui-ux-design.md` §3 (Color System), §4.1 (weights), §5 (Space/Shape/Motion), §7 (Component Library) |
| **Depends On** | `12-ui-ux-design.md`, `josam-prototype.html` v0.2 |
| **Feeds Into** | `packages/tokens`, `packages/ui`, `12B-claude-design-prompt.md` |
| **Adds** | `BR-1577` – `BR-1604` · `DEC-44` – `DEC-47` |

> **Why this document exists.** `12-ui-ux-design.md` v0.3 asserts WCAG AA compliance in `BR-1216`.
> That assertion is **false as written** — verified by computing every token pair against WCAG 2.1
> relative-luminance. Six color tokens fail, nine token groups referenced by existing rules were never
> defined, and the v0.2 prototype has already diverged from its own type and spacing scales.
> This document corrects all of it before a single component is built, which is the only cheap moment to do it.

---

## 1. Audit Method

Every foreground/background pair in `12 §3.1` and `§3.2` was computed with the WCAG 2.1 contrast
formula (sRGB → linear → relative luminance → `(L1+0.05)/(L2+0.05)`). Thresholds applied:

| Surface | Threshold | Source |
|---|---|---|
| Body text, labels, metadata, placeholders | **4.5:1** | WCAG 1.4.3 AA |
| Text ≥ 24px, or ≥ 18.66px bold | 3:1 | WCAG 1.4.3 AA |
| Boundary of an interactive control, focus ring, chart series | **3:1** | WCAG 1.4.11 |

All numbers below are computed, not estimated. Any of them can be reproduced from the hex values.

---

## 2. Severity 1 — Contrast Failures (blocking)

### `DEF-01` — The primary button is inaccessible in light mode

`--accent #A97A18` against `#FFFFFF` measures **3.83:1**, in both directions:

- White text on the gold button: **3.83:1** — needs 4.5:1
- Gold text/icons on a white surface: **3.83:1** — needs 4.5:1
- Gold chip text on `--accent-subtle #FBF4E4`: **3.49:1** — needs 4.5:1

This is the single most damaging defect in the system. `BR-1241` makes the gold primary button the one
visually dominant element on the dashboard — the most-visited screen in the product — and in light mode
it does not meet AA. Every `Button variant="primary"`, every `chip-accent`, every gold KPI value inherits it.

**Fix:** `--accent` → **`#8A6414`** (5.37:1 both directions; 4.90:1 on `--accent-subtle`).

### `DEF-02` — Three status colors fail in light mode

| Token | Current | On `#FFFFFF` | On `--bg-inset` | Verdict |
|---|---|---:|---:|---|
| `--success` | `#16A34A` | 3.30 | 2.99 | **fail** |
| `--warning` | `#CA8A04` | 2.94 | 2.67 | **fail** |
| `--danger` | `#DC2626` | 4.83 | 4.39 | **fail on inset** |
| `--info` | `#2563EB` | 5.17 | 4.69 | pass |

`--warning` at 2.94:1 does not even clear the 3:1 non-text threshold. `BR-1218` requires a shape or
label alongside every status color — that rule is what keeps this from being a total failure today,
but the color itself must still be readable.

**Fix:** `--success` → `#15803D` · `--warning` → `#8A5A00` · `--danger` → `#C81E1E`.

### `DEF-03` — `--text-muted` fails in **both** themes

| Theme | Current | On base | On surface | On elevated | On inset |
|---|---|---:|---:|---:|---:|
| Dark | `#6E6E78` | 3.92 | 3.68 | 3.40 | 3.97 |
| Light | `#8A8A93` | 3.30 | 3.42 | 3.42 | 3.11 |

`--text-muted` is not decorative. In the v0.2 prototype it carries timestamps, chapter durations,
form hints, the `as_of` line, table metadata, and placeholder text — all of it real, readable content
subject to 1.4.3.

**Fix:** dark → **`#86868F`** (4.76–5.55) · light → **`#6B6B73`** (4.80–5.28).

### `DEF-04` — Form-control borders are invisible (WCAG 1.4.11)

| Token | Theme | Contrast vs its surface |
|---|---|---:|
| `--border-subtle` | dark | 1.19 – 1.27 |
| `--border-strong` | dark | 1.50 – 1.60 |
| `--border-subtle` | light | 1.21 – 1.25 |
| `--border-strong` | light | 1.47 – 1.52 |

As *decorative* card separators these values are fine and intentional — 1.4.11 exempts purely
decorative boundaries. The defect is that the prototype uses `--border-subtle` as the **boundary of
`.control`** (every input, textarea, select). The boundary that identifies an interactive control
requires 3:1, and this contradicts `BR-1345`.

**Fix:** introduce `--border-control` as a distinct token (dark `#66666F` = 3.26:1 · light `#8E8E96` = 3.25:1)
and require it on every interactive control. `--border-subtle` and `--border-strong` keep their current
values and stay decorative.

- `BR-1577` — `--border-subtle` and `--border-strong` are decorative only. The boundary of any
  interactive control uses `--border-control`. Using a decorative border on a control fails review.
- `BR-1578` — `BR-1216`'s AA claim is verified by an automated token-pair test in CI, not by inspection.
  The test computes every foreground/background pair in both themes and fails the build on any pair
  below its threshold (`BR-1523`).

### `DEF-05` — Placeholder text is stacked below threshold

The prototype applies `opacity:.75` on top of `--text-muted`, landing near **2.6:1**. Placeholder is
text and is subject to 1.4.3.

- `BR-1579` — Opacity is never used to create a text tone. Tones come from tokens only, so contrast
  stays computable. `--text-placeholder` is a token, not `--text-muted` × opacity.

---

## 3. Severity 2 — Rules That Reference Tokens That Do Not Exist

Nine existing rules in `12` are unenforceable because the token they govern was never defined.
Each one is a guaranteed future divergence: the first developer who needs it will invent a value.
Two have **already** been invented in the v0.2 prototype (`--danger-subtle`, `--success-subtle`, `--skel`).

| # | Gap | Rule left unenforceable |
|---|---|---|
| `DEF-06` | `§4.1` names three typefaces but **no weights**, yet two rules govern "the weights listed in §4.1" | `BR-1334`, `BR-1481` |
| `DEF-07` | No elevation / shadow tokens | `BR-1229` ("borders first, shadows second") |
| `DEF-08` | No z-index scale — the prototype already hardcodes `1, 2, 100, 150, 200` | `BR-1325`, `BR-1326` |
| `DEF-09` | No overlay / scrim token for `Dialog`, `Drawer`, `Sheet` backdrops | `BR-1552` |
| `DEF-10` | No status-subtle backgrounds — invented in the prototype on day one | `BR-1218` |
| `DEF-11` | No chart palette, though `§20.8` ships a `Chart` component | `BR-1433`, `BR-1436`, `BR-1545` |
| `DEF-12` | No focus-ring width/offset tokens | `BR-1269` |
| `DEF-13` | No breakpoint tokens, though `§12` defines four | `BR-1383` |
| `DEF-14` | No disabled-state token — the prototype used `opacity:.45`, dropping labels under 3:1 | `BR-1347` |

All fourteen are closed by `§6` below.

---

## 4. Severity 3 — Internal Contradictions

### `DEF-15` — Phantom rule range

The `12` header declares `Adds BR-1211 – BR-1594`. The document's last defined rule is `BR-1576`.
**18 rule IDs are claimed but do not exist.** Any document citing `BR-1580+` from `12` is citing nothing.

**Fix:** `12`'s range is corrected to `BR-1211 – BR-1576`. This document opens at `BR-1577`.

### `DEF-16` — The reference mockups contradict `BR-1226`

`BR-1226` makes Western digits (`0-9`) the default in both languages. Every ASCII mockup in
`12 §9`, `§10`, `§11` uses Arabic-Indic digits — `١٢:٣٠`, `٦٢٪`, `٤٬٤٩٧ ج.م`, `١٥ سبتمبر`.
The HTML prototype correctly uses Western digits. The specification's own reference art teaches the
opposite of its rule, and reference art is what gets copied.

**Fix:** all mockups in `12` are re-rendered with Western digits. Arabic-Indic appears only in an
explicitly labeled `BR-1227` preference example.

### `DEF-17` — `DEC-34` is stale and contradicts `DEC-39` + `BR-1524`

`DEC-34` says "shadcn/ui primitives are copied in and restyled to the token system."
`DEC-39` makes **Radix** the headless behavior layer, and `BR-1524` fails the build on any third-party
visual component in feature code. shadcn/ui is a *styled* layer over Radix — adopting it means
inheriting styling decisions the token system then has to fight.

- `DEC-44` — `DEC-34` is superseded on this point. Radix Primitives are consumed directly
  (`DEC-39`). shadcn/ui may be read as a **reference for Radix composition patterns**, never copied in
  as source. Tailwind + the custom token layer stands unchanged.

### `DEF-18` — Two component inventories that already disagree

`§7` and `§20` are both component lists. They have already drifted:

| `§7` says | `§20.10` says |
|---|---|
| `WeekRing` | `WeekStrip` |
| `NotesPanel` | `SyncedNotes` |
| `TimestampNote` | `NoteComposer` |
| `ResourceItem` | `ResourceCue` |

`BR-1358` fixes one name per entity. Components are entities. Two lists guarantee a third disagreement.

- `DEC-45` — `§7` is deleted. `§20` is the sole component inventory. The canonical names are the
  `§20` names.

### `DEF-19` — `BR-1311` is already violated three times by the prototype

`BR-1311` permits gradient in *exactly one place*: the rail's momentum segment. The v0.2 prototype
also uses gradient in `.continue::before` (accent hairline), `.video` (radial letterbox), and `.skel`
(shimmer). All three are legitimate; the rule is too absolute to survive contact.

- `DEC-46` — `BR-1311` becomes a closed allow-list of **three** uses: (1) the rail momentum segment,
  (2) the skeleton shimmer, (3) the player letterbox. A fourth use is a defect. A closed list of three
  is enforceable; a rule everyone breaks on day one is not.

### `DEF-20` — `BR-1353` (`!important` prohibited) is violated by the prototype's first stylesheet

The reduced-motion block and `[hidden]` both require `!important` to do their job correctly.

- `BR-1580` — `!important` is permitted in exactly two places, both in the global reset:
  the `prefers-reduced-motion` override and `[hidden]`. Anywhere else it fails lint (`BR-1353`).

---

## 5. Severity 4 — Prototype ↔ Specification Divergence

The v0.2 prototype is an excellent proof of the *ideas*. It is not yet a proof of the *system*.

### `DEF-21` — The type scale is not being used

`§4.2` defines eleven sizes. The prototype uses: `11.5, 12.5, 13.5, 14.5, 15, 17, 18, 19, 20, 21, 22,
24, 26, 30, 34, 38, 44, 64px`. Only `16` and `64` are on the scale. `BR-1317` states a one-off size is
a defect — by that standard the majority of the prototype's type is defective.

### `DEF-22` — The spacing scale is not being used

`padding:11px 20px` (`.btn`), `7px 13px` (`.btn-sm`), `15px 30px` (`.btn-lg`), `9px`, `10px`, `5px`,
`3px`. `BR-1329` explicitly names `13px`, `17px`, `22px` as review failures.

> **Root cause, and the real fix.** Both divergences happened because the prototype was authored in raw
> CSS where an off-scale value is *writable*. `DEC-40` (type-constrained primitives) exists precisely to
> make them unwritable. The lesson is that `DEC-40` must land in Wave 1 **before** any screen work,
> exactly as `BR-1567` already requires. The prototype does not need to be retrofitted — it needs to be
> **replaced** by the Storybook of Wave 1 components.

- `BR-1581` — `josam-prototype.html` is a **communication artifact**, not a source of truth. It is
  never referenced by, copied from, or used to justify a value in production code. When Wave 1 ships,
  it is superseded by Storybook and marked as such.

### `DEF-23` — No `:active` state exists

`--accent-pressed` and `--text-inverse` are defined in `12 §3` and defined nowhere in the prototype.
`BR-1346` requires hover, focus, active, disabled and loading to be visually distinct for every
interactive element. `active` is currently absent product-wide.

### `DEF-24` — The icon system is emoji

The prototype ships `🔥 📎 🔗 ⚠ ⌕ ⏳ ☑ ◔ ⬤ ⬡ ✦ ◈ ▤ ✎ ◇ ⚙ ⏸ ⏮ ⏭ ⛶`.
`BR-1305` bans emoji as an icon system; `BR-1487` mandates one library at one stroke width (Lucide).
Neither is satisfied. Emoji also render differently per-platform, break at small sizes, and carry no
`stroke-width` — the streak flame will look like a different product on Android, iOS and Windows.

- `BR-1582` — Lucide is the only icon source, at `1.5px` stroke and the sizes in `§6.8`. Emoji never
  appear in the interface. Where the rail needs a mark Lucide does not have, it is drawn as an inline
  SVG inside the `Icon` primitive and added to `packages/ui/primitives/icons`.

---

## 6. The Corrected Token Layer

This is now the single source of truth for `packages/tokens`. Every value below is contrast-verified.

### 6.1 Dark Mode — Color

```
--bg-base            #0A0A0B
--bg-surface         #131316
--bg-elevated        #1B1B1F
--bg-inset           #08080A
--bg-overlay         rgba(5,5,7,0.72)     scrim behind Dialog / Drawer / Sheet

--border-subtle      #232328              decorative only
--border-strong      #34343B              decorative only
--border-control     #66666F              3.26:1 — every interactive control  [NEW]
--border-focus       #E8B04B

--text-primary       #FAFAFA              18.96
--text-secondary     #A2A2AB               7.81
--text-muted         #86868F               5.48   [CHANGED from #6E6E78]
--text-placeholder   #86868F               5.48   never dimmed by opacity     [NEW]
--text-disabled      #5A5A63               2.90   pairs with a stated reason  [NEW]
--text-inverse       #0A0A0B

--accent             #E8B04B              10.12
--accent-hover       #F0BE63              11.54
--accent-pressed     #D19E3C               8.17
--accent-subtle      #2A2115
--accent-foreground  #0A0A0B              10.12 on --accent

--success            #4ADE80              11.36    --success-subtle  #0F2418
--warning            #FBBF24              11.85    --warning-subtle  #2A2010
--danger             #F87171               7.15    --danger-subtle   #2A1414
--info               #60A5FA               7.78    --info-subtle     #0F1A2A
```

### 6.2 Light Mode — Color

Light is an independent design, never an inversion (`BR-541`).

```
--bg-base            #FBFBFA
--bg-surface         #FFFFFF
--bg-elevated        #FFFFFF
--bg-inset           #F4F4F2
--bg-overlay         rgba(24,24,27,0.44)

--border-subtle      #E6E6E2              decorative only
--border-strong      #D2D2CC              decorative only
--border-control     #8E8E96              3.25:1 — every interactive control  [NEW]
--border-focus       #8A6414

--text-primary       #18181B              17.72
--text-secondary     #52525B               7.73
--text-muted         #6B6B73               5.28   [CHANGED from #8A8A93]
--text-placeholder   #6B6B73               5.28                                [NEW]
--text-disabled      #8E8E96               3.25                                [NEW]
--text-inverse       #FFFFFF

--accent             #8A6414               5.37   [CHANGED from #A97A18]
--accent-hover       #7A5710               6.57
--accent-pressed     #6E4E0E               7.61
--accent-subtle      #FBF4E4                      accent on it: 4.90
--accent-foreground  #FFFFFF               5.37 on --accent

--success            #15803D               5.02   --success-subtle  #ECFDF3   [CHANGED]
--warning            #8A5A00               5.93   --warning-subtle  #FDF6E3   [CHANGED]
--danger             #C81E1E               5.74   --danger-subtle   #FEF2F2   [CHANGED]
--info               #2563EB               5.17   --info-subtle     #EFF6FF
```

- `BR-1583` — `--accent` in light mode serves **both** roles: fill behind `--accent-foreground`, and
  gold text on a light surface. A single value that clears 4.5:1 in both directions removes the entire
  class of "which gold do I use here" defects.
- `BR-1584` — Every `--*-subtle` background has exactly one permitted foreground: its own status token.
  Each pair is verified ≥ 4.5:1 (dark 6.28–9.58 · light 4.75–5.49).

### 6.3 `DEC-47` — Chart Palette

`§20.8` ships a `Chart` component and `BR-1436` requires every chart to answer a stated question.
Neither is buildable without defined series colors. Six categorical series, ordered — the first color
is used for a single-series chart.

```
DARK      1 #E8B04B   2 #60A5FA   3 #4ADE80   4 #F472B6   5 #A78BFA   6 #22D3EE
          contrast vs --bg-surface:  9.49 · 7.29 · 10.64 · 7.00 · 6.81 · 10.26

LIGHT     1 #8A6414   2 #2563EB   3 #15803D   4 #BE185D   5 #6D28D9   6 #0E7490
          contrast vs --bg-surface:  5.37 · 5.17 ·  5.02 · 6.04 · 7.10 ·  5.36
```

- `BR-1585` — Every chart series carries a direct label or a distinct dash/marker pattern. Color is
  never the only way to tell two series apart (`BR-1274`).
- `BR-1586` — Chart order is fixed. Series 1 is always `--chart-1`. Colors are never reassigned per
  chart, or the same metric changes color between two screens.
- `BR-1587` — More than six categories are grouped into "Other" rather than extending the palette.
  A seventh distinguishable color at AA does not exist in this hue space.

### 6.4 Typography — Weights (closes `DEF-06`)

```
Readex Pro           400 Regular · 500 Medium · 600 SemiBold      display only
IBM Plex Sans Arabic 400 Regular · 500 Medium · 600 SemiBold      body and UI
JetBrains Mono       400 Regular · 500 Medium                     code and figures

--weight-regular  400      --weight-medium  500      --weight-semibold  600
```

- `BR-1588` — Exactly these seven font files load. `700` is not loaded and must not be referenced —
  the browser will synthesize it and the result looks broken in Arabic (`BR-1334`).
- `BR-1589` — Bold is `--weight-semibold`. There is no bolder weight in the product (`BR-1316`).

### 6.5 Elevation (closes `DEF-07`)

Borders carry elevation; shadow only separates a *floating* surface from the page (`BR-1229`).

```
--elev-0   none                                                  cards, panels — border only
--elev-1   0 1px 2px rgba(0,0,0,.06),  0 2px 8px rgba(0,0,0,.08)   dropdown, popover, tooltip
--elev-2   0 2px 4px rgba(0,0,0,.08),  0 8px 24px rgba(0,0,0,.12)  toast, drawer
--elev-3   0 4px 8px rgba(0,0,0,.10),  0 16px 48px rgba(0,0,0,.18) modal

DARK: same offsets, alpha ×2 (.12 / .16 / .24 / .36) — a dark-on-dark shadow reads as mud below that.
```

- `BR-1590` — A surface that is part of the page layout uses `--elev-0` and a border. Shadow means
  "this floats above the page" and nothing else.

### 6.6 Z-Index Scale (closes `DEF-08`)

```
--z-base        0        --z-sticky    100      page header, table header, save bar
--z-nav        200       --z-dropdown  300      dropdown, popover, combobox list
--z-overlay    400       --z-modal     500      scrim / dialog, drawer, sheet
--z-toast      600       --z-tooltip   700      tooltip is always readable
--z-skip       800       skip link outranks everything
```

- `BR-1591` — Only these values are used. A raw z-index in a component fails lint. `z-index: 9999`
  is already prohibited as a defect fix (`BR-1512`); this removes the reason to reach for it.
- `BR-1592` — Every screen inventories its sticky elements against `--z-sticky` before merge (`BR-1326`).

### 6.7 Focus (closes `DEF-12`)

```
--focus-width   2px
--focus-offset  2px
--focus-color   var(--border-focus)
```

- `BR-1593` — One focus treatment product-wide: `2px` solid `--focus-color` at `2px` offset, on
  `:focus-visible` only. It is never removed, never restyled per component, and never `:focus`-only
  (which fires on mouse click and reads as a bug).

### 6.8 Icons (closes `DEF-24`)

```
--icon-sm    16px       inline with --text-sm
--icon-md    20px       default — buttons, nav, table rows
--icon-lg    24px       page header, empty state
--icon-xl    32px       state illustrations
--icon-stroke 1.5px     never varies
```

### 6.9 Interaction States (closes `DEF-14`)

```
--disabled-opacity  1        opacity is NOT the mechanism
```

- `BR-1594` — Disabled is expressed with `--text-disabled` + `--bg-inset` + `cursor: not-allowed`,
  never with opacity. Opacity multiplies against an unknown background and makes contrast
  uncomputable — which is how `DEF-05` happened.
- `BR-1595` — Every disabled control states its reason adjacent to it or in its tooltip (`BR-1347`).

### 6.10 Breakpoints (closes `DEF-13`)

```
--bp-sm   640px      --bp-md  1024px      --bp-lg  1440px      --bp-max  1280px  content cap
```

Test widths remain `360 · 390 · 768 · 1024 · 1440` (`BR-1383`).

### 6.11 Unchanged

Space scale, radius scale, and motion tokens from `12 §5` are correct and carry over verbatim,
plus `--space-24 96px` which the prototype omitted.

---

## 7. Screen Inventory Gaps

`12 §8` lists 72 screens. Cross-checking against `04-feature-catalog-part-1` and
`11-api-contract-part-1 §API-1` finds screens the API and feature catalog require that the
inventory does not contain:

| New ID | Screen | Required by |
|---|---|---|
| `SCR-73` | Forgot password (request) | `FEAT-006`, `POST /auth/password/forgot` |
| `SCR-74` | Reset password (consume token) | `FEAT-006`, `POST /auth/password/reset` |
| `SCR-75` | Email verification result | `FEAT-005`, `POST /auth/email/verify` |
| `SCR-76` | Phone OTP entry | `FLOW-01` Path C, `POST /auth/phone/verify` |
| `SCR-77` | Not found (404) | `BR-1448` |
| `SCR-78` | Server error (500) | `BR-1418`, `BR-1500` |
| `SCR-79` | Maintenance | `MaintenanceBanner`, `§20.9` |

`OTPField` is specified in `§20.7` with no screen to live on — `SCR-76` closes that.

- `BR-1596` — Every endpoint in `11-api-contract` that a learner or staff member triggers directly
  has a named screen in `§8`. An endpoint with no screen is either dead or an inventory gap.

**Corrected total: 79 screens** (77 buildable — `SCR-06`/`SCR-07` remain deferred per `DEC-13`).

---

## 8. What Changes In Practice

| # | Action | Owner | When |
|---|---|---|---|
| 1 | Replace `packages/tokens` color values with `§6` | Frontend | Before Wave 1 |
| 2 | Add the token-pair contrast test to CI (`BR-1578`) | Frontend | Before Wave 1 |
| 3 | Build `Text`/`Stack`/`Box`/`Icon` with closed token unions (`DEC-40`) | Frontend | **Wave 1, first** |
| 4 | Swap every emoji for Lucide (`BR-1582`) | Frontend | Wave 1 |
| 5 | Correct `12`'s header range to `BR-1211 – BR-1576` | Founder | Now |
| 6 | Re-render `12 §9–§11` mockups with Western digits | Founder | Now |
| 7 | Delete `12 §7`; `§20` becomes the sole inventory | Founder | Now |
| 8 | Add `SCR-73` – `SCR-79` to `12 §8` | Founder | Now |
| 9 | Mark `josam-prototype.html` superseded when Storybook ships | Frontend | End of Wave 1 |

---

## 9. Approval

| Item | Status |
|---|---|
| The six contrast fixes in `§6.1`–`§6.2` are accepted | ☐ Approved |
| `--border-control` as a distinct token (`BR-1577`) | ☐ Approved |
| Automated token-pair contrast test in CI (`BR-1578`) | ☐ Approved |
| Chart palette `DEC-47` is accepted | ☐ Approved |
| Elevation, z-index, focus, icon, disabled and breakpoint scales are accepted | ☐ Approved |
| `DEC-44` — Radix consumed directly; shadcn/ui reference only, never copied in | ☐ Approved |
| `DEC-45` — `12 §7` deleted; `§20` is the sole component inventory | ☐ Approved |
| `DEC-46` — gradient allow-list of three | ☐ Approved |
| `BR-1580` — `!important` permitted only in the global reset | ☐ Approved |
| `BR-1582` — Lucide only; no emoji in the interface | ☐ Approved |
| `BR-1581` — the prototype is a communication artifact, not a source of truth | ☐ Approved |
| `SCR-73` – `SCR-79` added to the inventory | ☐ Approved |
| Mockups in `12` re-rendered with Western digits (`BR-1226`) | ☐ Approved |

# BR Registry — Business Rule Number Allocation

| Field | Value |
|---|---|
| **Purpose** | Prevent BR-number collisions when any document gains a rule |
| **Created** | 2026-07-28 |
| **Created during** | Phase 0, before `PH-0.1` |
| **Status** | Living index — updated whenever a rule is added |
| **Authority** | This file is the **allocation** authority. The documents remain the **content** authority. |

---

## 1. Why this exists

While adding rules to `13 §18`, a block was drafted at `BR-1605`–`BR-1611` on the strength of
`13`'s own header, which declares that it adds `BR-1577` – `BR-1640`. That block collided with
seven live security rules: `14-security-design.md` declares and uses `BR-1605` onward.

The collision was caught before it shipped, but only by chance. The cause is structural: **several
document headers declare ranges that do not match what the document actually contains**, so the
headers cannot be trusted to find a free number.

- `BR-1820` — A new rule takes its number from `§4` of this file — never from a document's own
  header, and never by incrementing the highest number seen nearby.
- `BR-1821` — After adding rules, the author updates `§3` and `§4` in the same commit that adds them.
- `BR-1822` — Existing numbers are **never** renumbered to tidy this file. Thousands of
  cross-references depend on them; a renumber silently breaks every one. The registry records
  reality, including where reality is untidy.

---

## 2. Method and its limits

Counts come from a census of the repository on 2026-07-28, not from the document headers.

A rule counts as **defined** where it is written as `` - `BR-xxxx` — text ``. One document also
defines rules in **table form**: `12 §17.2` (prohibited "generic AI" patterns) carries the rule ID
in a table column and defines `BR-1297` – `BR-1310` there and nowhere else. Those 14 are counted.

**Limit of the method.** Tables elsewhere carry BR IDs in an *Enforces* or *Refs* column — those are
references, not definitions (`09 §11`, `16`'s Refs column, `12 §19`). They are excluded. Any future
document that defines rules in a table not listed here will be undercounted until `§2` is updated.

---

## 3. Allocation — actual contents vs declared range

| Document | Declared in its header | **Actually defines** | Count | Header accurate? |
|---|---|---|---:|---|
| `04-feature-catalog-part-1` | — | `BR-001` – `BR-122` | 122 | — |
| `04-feature-catalog-part-2` | — | `BR-123` – `BR-244` | 122 | — |
| `04-feature-catalog-part-3` | — | `BR-245` – `BR-407` | 163 | — |
| `04-feature-catalog-part-4` | — | `BR-408` – `BR-522` | 115 | — |
| `04-feature-catalog-part-5` | — | `BR-523` – `BR-638` | 116 | — |
| `05-roles-and-permissions` | — | `BR-639` – `BR-719` | 81 | — |
| `06-user-flows` | `BR-720` – `BR-772` | `BR-720` – `BR-772` | 53 | ✅ exact |
| `07-business-logic` | — | `BR-773` – `BR-830` | 58 | — |
| `08-system-design` | `BR-831` – `BR-892` | `BR-831` – `BR-893` | 63 | ⚠️ under-declared by 1 |
| `09-system-architecture` | `BR-894` – `BR-948` | `BR-894`, `BR-900` – `BR-945` | 47 | ⚠️ over-declared. `946`–`948` unused; **`895`–`899` are referenced but never written** (`§5`) |
| `10-database-design-part-1` | — | `BR-949` – `BR-1024` | 76 | — |
| `10-database-design-part-2` | — | `BR-1025` – `BR-1104` | 80 | — |
| `11-api-contract-part-1` | — | `BR-1105` – `BR-1152` | 48 | — |
| `11-api-contract-part-2` | — | `BR-1153` – `BR-1210` | 58 | — |
| `12-ui-ux-design` | `BR-1211` – `BR-1594` | `BR-1211` – `BR-1576` (complete, 14 of them in the `§17.2` table) · `BR-1812` – `BR-1813` · `BR-1830` – `BR-1839` (`§19.1`) | 375 | ⚠️ over-declared; `1577`–`1594` belong to `13` |
| `13-tech-stack` | `BR-1577` – `BR-1604` · `BR-1805` – `BR-1811` · `BR-1814` – `BR-1819` · `BR-1826` – `BR-1829` | same | 45 | ✅ corrected 2026-07-28; `BR-1819` allocated 2026-07-29 (`PH-0.6`); `BR-1826`–`BR-1829` allocated 2026-07-29 (`§16.1` Renovate policy, `OQ-24`) |
| `14-security-design` | `BR-1605` – `BR-1704` | `BR-1605` – `BR-1718` | 114 | ⚠️ under-declared by 14 — **the collision source** |
| `15-implementation-roadmap` | `BR-1719` – `BR-1760` | `BR-1719` – `BR-1748` | 30 | ⚠️ over-declared; `1749`–`1760` unused |
| `16-task-breakdown` | `BR-1761` – `BR-1790` | `BR-1761` – `BR-1780` | 20 | ⚠️ over-declared; `1781`–`1790` unused |
| `BR-REGISTRY` (this file) | `BR-1820` – `BR-1825` | same | 6 | ✅ exact |
| `STATUS.md` | — | `BR-1799` – `BR-1804` | 6 | — |

**Total defined: 1,786 rules** — 1,772 in bullet form plus the 14 defined in the `12 §17.2` table.
The per-document counts above sum to the same figure.

> `16 §5` claims "1,790 business rules"; `STATUS.md` claims "1,798". Neither matches the census.
> Not corrected — see `§6`.

---

## 4. Next free numbers

> **Take new numbers from here.**

| Range | Status |
|---|---|
| **`BR-1841` onward** | ✅ **Next free block — use this.** Contiguous and unused. |
| `BR-1840` | ❌ taken by `12 §19.1` — a deferral names a task that has NOT started. Allocated 2026-07-30 (Phase 0 exit reconciliation). |
| `BR-1839` | ❌ taken by `12 §19.1` — a tool's error names its own failure, not the system's. Allocated 2026-07-30 (`PH-0.11` execution). |
| `BR-1838` | ❌ taken by `12 §19.1` — verification depending on generated state is not verification until it has run against a clean tree. Allocated 2026-07-29 (`PH-0.10`, CI run #2). |
| `BR-1837` | ❌ taken by `12 §19.1` — assert the effect, not the marker. Allocated 2026-07-29 (`PH-0.27` close-out). |
| `BR-1836` | ❌ taken by `12 §19.1` — hardening can silence its own monitoring. Allocated 2026-07-29 (`PH-0.7` execution). |
| `BR-1834` – `BR-1835` | ❌ taken by `12 §19.1` — autofixer output assertion, and deliberate failure of every test. Allocated 2026-07-29 (`PH-0.20` close-out). |
| `BR-1830` – `BR-1833` | ❌ taken by `12 §19.1` — deliberate-violation proof of every enforcement mechanism, allocated 2026-07-29 (`PH-0.16` close-out). |
| `BR-1826` – `BR-1829` | ❌ taken by `13 §16.1` — Renovate policy, allocated 2026-07-29 closing `OQ-24`. |
| `BR-1819` | ❌ taken by `13 §18` — allocated 2026-07-29 at `PH-0.6` (Prisma 7 driver adapter). It was the single free slot between `13`'s two sub-blocks; `13` now owns a contiguous `BR-1814` – `BR-1819`. |
| `BR-1781` – `BR-1798` | ⚠️ free but **declared** by `16`; leave for `16`'s own growth |
| `BR-1749` – `BR-1760` | ⚠️ free but **declared** by `15`; leave for `15`'s own growth |
| `BR-946` – `BR-948` | ⚠️ free but **declared** by `09`; leave for `09`'s own growth |
| `BR-895` – `BR-899` | ❌ **do not reuse** — actively referenced by `09 §11` and `13 §13`. Reusing them would silently repoint live citations. Reserved pending `§5`. |
| `BR-1577` – `BR-1604` | ❌ taken by `13` |
| `BR-1605` – `BR-1718` | ❌ taken by `14` |
| `BR-1805` – `BR-1819` | ❌ taken by `13 §18` and `12 §20.12` |
| `BR-1820` – `BR-1825` | ❌ taken by this file |

- `BR-1823` — When a document needs rules and its declared range is exhausted or contested, it takes
  a new block from this section and records that block in its own header. Documents may own
  discontiguous ranges; `13` already does.

---

## 5. Dangling references — cited but never defined

Found by the same census. **Not fixed** — each needs a decision about what the rule was meant to say,
which is a document correction (`BR-1765`), not a registry entry.

| Reference | Cited in | Assessment |
|---|---|---|
| `BR-895` – `BR-898` | `09 §11` ("Layer direction", `BR-895`–`BR-898`), `09 §2.2` context | **Genuinely missing.** `09 §2.2` describes these anti-patterns in prose but assigns them no IDs. The rules were cited before they were written. |
| `BR-899` | `09 §11`, `13 §13` ("No vendor SDK outside `providers/`") | **Genuinely missing.** Cited twice as the authority for a fitness function that Phase 0 implements at `PH-0.16`. |
| `BR-948` | `09` header only | Declared in the range, never written. Harmless. |
| `BR-1759`, `BR-1760` | `16` (`PH-7.9` written "`BR-1759` → `BR-759`") | Off-by-1000; intended `BR-759` |
| `BR-1789`, `BR-1790` | `STATUS.md §7`, `16` | Inside `16`'s declared range but never written |
| `BR-1843` | `10-database-design` | Off-by-1000; intended `BR-843` |
| `BR-1885` | `16` (`PH-0.10`, written "`BR-1885` → `BR-885`") | Off-by-1000; intended `BR-885` |
| `BR-1930` | `16` (`PH-6.13`, written "`BR-1930` → `BR-930`") | Off-by-1000; intended `BR-930` |

The `→` notation in `16` shows the author already noticed the off-by-1000 pattern and annotated the
correction inline rather than repairing the reference. `BR-1763` → `BR-763`, `BR-1157` → `BR-157`,
`BR-1592` → `BR-292`, `BR-1711` → `BR-711`, and `BR-1111` → `FEAT-111` follow the same pattern.

**`BR-895`–`BR-899` matter more than the rest.** They are not typos pointing at a real rule — they
are citations to rules that were never written, and `PH-0.16` is scheduled to *enforce* two of them
(layer direction, no vendor SDK outside `providers/`). The intent is recoverable from `09 §2.2` and
`13 §13`, but the text has to be authored by the founder, not inferred.

- `BR-1824` — A dangling reference is a defect, not a formatting quirk: it points a reader at a rule
  that does not exist. They are corrected in one dedicated pass so the correction is reviewable in a
  single diff — not opportunistically alongside unrelated work (`BR-1515`).

---

## 6. Known inaccuracies deliberately left alone

| Item | Why untouched |
|---|---|
| Six document headers declare wrong ranges (`§3`) | Correcting them is a six-document edit outside any current authorisation. `§3` is the reliable source meanwhile. |
| The "1,790 / 1,798 rules" totals | Cosmetic; nothing depends on the number. Census says 1,784. |
| Dangling references (`§5`) | Each needs an authoring decision, not a mechanical fix. `BR-895`–`899` are flagged for `PH-0.16`. |
| Census total 1,786 vs documents' "1,790" / "1,798" | The gap is ~4–12 rules and is explained by the counting method (`§2`), not by missing content. |
| `BR-1812`/`BR-1813` sit in `12` though `12`'s main block ends at `1576` | Deliberate: allocated from the free high block during the Wave 1 reconciliation, exactly as `BR-1820` prescribes. |

- `BR-1825` — These are recorded rather than repaired because an unrecorded inaccuracy is a trap and
  a recorded one is merely untidy. Repair is scheduled, not opportunistic (`BR-1748`).

---

*Update `§3` and `§4` in the same commit as any rule addition.*

# 12C — Design Reference (Locked)

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Document** | 12C — Design Reference (Locked) |
| **Version** | 1.0 |
| **Last Updated** | 2026-08-20 |
| **Produced in** | Claude Design — project "Josam Design System" |
| **Depends On** | `12-ui-ux-design.md`, `12A-design-system-corrections.md`, `claude-design-brief.md` |
| **Status** | Reference — not production code (`BR-1581`) |

> **What this is.** Seven HTML files in `design/`, generated in Claude Design, covering the
> foundations plus every major screen in the product. They exist so that future development has a
> settled visual direction to build against instead of re-deciding it screen by screen.
>
> **What this is not.** Production code. Nothing here is imported, copied, or cited as the reason a
> value is what it is. The authoritative token layer is `design/josam-tokens.css` and
> `packages/tokens`, enforced in CI by `design/check-token-contrast.py`.

---

## 1. The Files

| File | Contains |
|---|---|
| `design/00-design-system.html` | Foundations: colour tokens with contrast printed, type, spacing, elevation, focus, icons, the four-state motif at three scales, the component library, the code surface, dense mode |
| `design/01-public-site-and-onboarding.html` | Landing · catalog · course detail · free preview · certificate verification · the six auth frames · onboarding (4 steps) · the projection |
| `design/02-learner-dashboard.html` | Dashboard with all variants: first-time, goal skipped, finished everything, expired, cached-first |
| `design/03-course-overview.html` | The full curriculum, five states: enrolled, not enrolled, loading, failed, offline |
| `design/04-lesson-player.html` | Player with 4 playback states (playing, buffering, error, offline) and 5 panel states (notes, tutor, quota exhausted, out of scope, questions) |
| `design/05-purchase-and-account.html` | Checkout · cash-payment pending · confirmation · payment failure · orders · subscription · cancellation · expired · reactivation · certificates · account · devices · support |
| `design/06-admin-and-operations.html` | Operations dashboard · student directory · student profile · the queues · content editors · commerce · reports · settings, roles, audit |

Every file carries a live language switch (Arabic RTL / English LTR) and, except the player, a live
theme switch. Desktop frames are 1280 (admin 1440); mobile frames are 390.

---

## 2. The Direction — do not re-decide these

**Almanac.** The product reads as a printed study agenda, not a dashboard. Flat surfaces, ruled
lines, dotted leaders, numbered sequence, warm paper. Chosen over a technical-blueprint direction
and a dark departure-board direction.

**Light is home.** Dark is a fully designed second theme, never an inversion. The video player
region is the one deliberate exception — it stays dark in both themes, presented as an ink plate
inset into the paper so the seam reads as intentional.

**The motif.** A sequence with four states — done, current, available, locked — distinguishable
without colour, working at three scales: the whole goal, one course curriculum, chapters inside one
video. Locked always renders its title, its duration and its unlock condition at full legibility.

**Progress is a date.** Days remaining and a finish date, never a percentage as the headline.

**No gradients.** Zero, everywhere, in both themes. Verified across all seven files.

---

## 3. The Locked Values

### Colour — 21 semantic tokens, light / dark

```
surface.page        #EDE7DA / #1D1B17      text.primary        #23201B / #EDE7DA
surface.raised      #F5F1E7 / #26231D      text.secondary      #635A4D / #A79C88
surface.sunken      #E4DCCB / #141310      text.onAccent       #FFFFFF / #1D1B17
surface.selected    #E4E8D8 / #2A2D20      accent.rest         #3F5B22 / #A9C57E
canvas.review       #DED7C7                accent.hover        #2E4318 / #C2DA97
inset.hairline      #DCD3C1 / #35312A      border.control      #7D7364 / #7C7666
border.hairline     #DCD3C1 / #35312A      feedback.attention  #7A4F00 / #E0B060
tint.critical       #F6E7E4                feedback.critical   #8E2A21 / #E8907F
tint.info           #E7ECF3                feedback.info       #2A4E7A / #93B4DE
code.keyword        #7A2E86 / #C79BE0      code.call           #1F3A5C / #93B4DE
code.literal        #8E2A21 / #E8907F
```

`border.control` is for the boundary of interactive elements and meets 3:1.
`border.hairline` is decorative and deliberately does not. Never swap them (`BR-1577`).

### Type

```
Almarai              400 / 700 / 800      body, UI, tables, everything not display
Amiri                700 only             display tier only
IBM Plex Mono        400 / 500            figures, code, IDs, eyebrows, inline Latin technical terms
Newsreader           500                  Latin display, English interface only
```

Scale: **52 · 35 · 22 · 16 · 14 · 12.5 · 11**, plus **10** for mono eyebrows only
(Latin caps, letter-spaced, never carrying Arabic or a readable sentence).

**Amiri scope, absolute:** finish dates, course and module titles, the projection, the certificate,
celebration numbers. Never body, never UI labels, never table content, never under 28px, never in
dense mode. A Latin word inside an Arabic display line uses Amiri's own Latin — one line, one
family. Inline technical terms (`Python`, `for`, `git`) are always mono, in every tier.

### Space, shape, focus

```
spacing base 4          radius 0 / 3 / 50%          focus 2px, offset 2
dense mode: line-height 1.45, 36px rows, no dotted leaders, display face unused
```

### Bilingual rules

Arabic RTL is the primary design; English LTR is verified, not assumed. Logical CSS properties only.
Western digits everywhere. Every Latin run inside Arabic is direction-isolated. Every font stack
names an explicit Arabic fallback — a bare `serif` is a defect. Directional icons mirror; logos,
checkmarks and media transport controls do not.

---

## 4. Verified State of the Set

Checked mechanically across all seven files on 2026-08-20.

| Check | Result |
|---|---|
| Colours outside the registered token set | **none in any screen file** |
| Gradients | 0 |
| `!important` | 0 |
| `100vh` | 0 |
| Amiri below 28px, or at any weight other than 700 | none |
| Arabic-Indic digits | 2, in `01` (a password-rule string) |
| Type scale adherence — `01`, `05`, `06` | clean, 8 / 8 / 5 distinct sizes |
| Type scale adherence — `02`, `03`, `04` | **not snapped**: 26 / 18 / 14 distinct sizes, off-grid spacing |

The three Step-2 screens were built before the scale was registered and were never snapped to it.
They are correct on colour, on the motif, on states and on Amiri scope — the drift is confined to
font sizes and spacing values. Treat `01`, `05` and `06` as the scale-canonical files; take layout
and behaviour from `02`, `03` and `04`, but take sizes and spacing from the registered scale rather
than from those three files.

---

## 5. How To Build From These

1. Read the screen's flow in `06-user-flows.md`, its rules in `07`, its endpoints in `11` and its
   permissions in `05` **before** opening the reference (`BR-1288`).
2. Open the matching reference file and read the behaviour: block order, state coverage, what is
   dominant, what is quiet, what is absent.
3. Build from `packages/ui` and `packages/tokens`. Never copy a value out of a reference file — if
   a value you need isn't in the token layer, add it to the token layer first (`BR-1533`).
4. Every data screen implements its full state matrix (`12 §17.14`). The reference files show what
   those states look like in this direction; they do not excuse skipping any.
5. The Definition of Done in `12 §18` still gates every screen. A reference design is not evidence.

**When a new screen has no reference:** design it against `§2` and `§3` of this document, then add
it to the Claude Design project so the reference set stays complete. `claude-design-brief.md` has
the working method and the rejection checklist.

---

## 6. Reference Figures Used

These are placeholders chosen so the screens read as one coherent product. **None of them is a
business decision.** Confirm every one before it reaches a real surface.

```
أساسيات البرمجة — Python · 10 modules · 41 lessons · 4 quizzes · 14 h 20 m
1,200 EGP · launch offer 899 EGP · lifetime access · certificate included
AI tutor 150 questions/month for 6 months · refund window 14 days
Payment: card · Fawry cash · mobile wallet
Sample learner: يوسف · lesson 12 of 41 · finish 15 Sep · 38 days left · 5 h/week
```

Admin screens carry a `REFERENCE DATA` chip for the same reason — the platform has not launched and
those figures must never be read back as real.

---

## 7. Open

| # | Item | Cost |
|---|---|---|
| 1 | Snap `02`, `03`, `04` to the registered type and spacing scale | one pass, mechanical |
| 2 | Fix the Arabic-Indic digits in the password rule in `01` | one string |
| 3 | Set the real price, AI quota and refund window before any commerce surface ships | founder decision |

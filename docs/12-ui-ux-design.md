# 12 — UI/UX Design

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 12 — UI/UX Design |
| **Status** | Draft — Pending Approval |
| **Version** | 0.3 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `02-target-users.md`, `06-user-flows.md`, `07-business-logic.md`, `11-api-contract` |
| **Feeds Into** | `13-tech-stack.md`, `15-implementation-roadmap.md`, `16-task-breakdown.md` |
| **Adds** | `BR-1211` – `BR-1594` · `DEC-32` – `DEC-43` |

> **v0.2:** added §17 **Frontend Implementation Standard**, §18 Definition of Done, §19 automated enforcement.
> **v0.3:** added §20 **Shared Component Library** — every UI element in the product is a custom shared component. No default browser controls, no third-party visual components.

---

## 1. Design Thesis

> **The interface is a path, not a library.**

Every learning platform looks like a content catalog: grids of cards, a sidebar of videos, a percentage bar. Josam Academy is built on the opposite claim — that people fail not from missing content but from missing structure (`01 §1.4`). The interface has to make that claim visible.

Three consequences shape every screen:

| Principle | Visual consequence |
|---|---|
| The path is always visible (`PRIN-03`) | Locked content renders **legibly**, ahead on the same rail. Never hidden, never greyed into illegibility. |
| Distance to the goal, not percentage (`GOAL-02`) | The primary metric is *days remaining toward your target*, not *62% complete*. |
| One next action (`BR-238`) | Every screen has exactly one visually dominant action. Secondary actions are quiet. |

---

## 2. `DEC-32` — The Signature: The Rail

One motif, three scales. This is the element the product is remembered by.

```
DASHBOARD — goal horizon
  ●━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━○ ─ ─ ─ ─ ─ ─ ─ ○
  start          you are here    next milestone    15 Sept

COURSE — curriculum spine
  ●  Introduction                                    done
  ●  Core Components                                 done
  ◉  State Management              12:30 / 19:00   ← you
  ○  Effects and Lifecycle         unlocks next
  ○ ─ Custom Hooks                 unlocks after quiz

PLAYER — chapter rail
  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░
  │      │        │           │
  intro  useState useRef    example
```

**Rules:**

- `BR-1211` — The rail uses four states, always distinguishable without color alone: **done** (filled), **current** (ringed), **available** (hollow), **locked** (hollow with a dashed connector).
- `BR-1212` — Locked segments render at full text legibility. Dimming applies to the connector and marker, never to the title (`PRIN-03`).
- `BR-1213` — The rail is the only place a gradient is permitted, and only between *done* and *current* — encoding momentum, not decoration.
- `BR-1214` — Sequence numbering is used only where order carries real meaning (curriculum, onboarding steps). It is never used as ornament on cards or feature lists.

---

## 3. Color System

Two independently designed palettes (`FEAT-189`). Light is **not** an inversion (`BR-541`).

### 3.1 Dark Mode

```
--bg-base            #0A0A0B    near-black with a blue cast, not dead black
--bg-surface         #131316    cards, panels
--bg-elevated        #1B1B1F    modals, popovers, dropdowns
--bg-inset           #08080A    wells, code blocks, player chrome

--border-subtle      #232328
--border-strong      #34343B
--border-focus       #E8B04B

--text-primary       #FAFAFA
--text-secondary     #A2A2AB
--text-muted         #6E6E78
--text-inverse       #0A0A0B

--accent             #E8B04B    warm gold
--accent-hover       #F0BE63
--accent-pressed     #D19E3C
--accent-subtle      #2A2115    tinted background
--accent-foreground  #0A0A0B    text on accent

--success            #4ADE80
--warning            #FBBF24
--danger             #F87171
--info               #60A5FA
```

### 3.2 Light Mode

```
--bg-base            #FBFBFA    warm white, never pure #FFFFFF
--bg-surface         #FFFFFF
--bg-elevated        #FFFFFF
--bg-inset           #F4F4F2

--border-subtle      #E6E6E2
--border-strong      #D2D2CC
--border-focus       #A97A18

--text-primary       #18181B
--text-secondary     #52525B
--text-muted         #8A8A93
--text-inverse       #FFFFFF

--accent             #A97A18    gold darkened for contrast
--accent-hover       #916814
--accent-pressed     #7A5710
--accent-subtle      #FBF4E4
--accent-foreground  #FFFFFF

--success            #16A34A
--warning            #CA8A04
--danger             #DC2626
--info               #2563EB
```

**Rules:**
- `BR-1215` — The accent darkens from `#E8B04B` to `#A97A18` in light mode. The dark-mode gold on white fails contrast and reads as an unfinished theme (`BR-541`).
- `BR-1216` — Contrast meets WCAG AA in both modes: 4.5:1 body, 3:1 large text and UI boundaries (`BR-542`).
- `BR-1217` — Gold is reserved for: the primary action, the current position on the rail, and achievement moments. Using it everywhere destroys its meaning.
- `BR-1218` — Status colors are never the sole carrier of meaning. Every state also has a shape, icon, or label (`BR-1211`).

### 3.3 Semantic Tokens Only

- `BR-1219` — Components reference `--accent`, never `--gold`. Names describe purpose, not appearance (`BR-546`).
- `BR-1220` — Raw hex values in components fail the build (`BR-545`).

---

## 4. Typography

### 4.1 `DEC-33` — Arabic Leads the Pairing

Most bilingual products pick a Latin display face and find an Arabic one that tolerates it. Josam Academy inverts this: the **Arabic face is chosen first**, and the Latin face is selected to sit beside it (`PRIN-07`).

| Role | Face | Why |
|---|---|---|
| **Display** | **Readex Pro** | Designed from the outset for Arabic–Latin harmony. Geometric, contemporary, confident without being decorative. Variable weight. |
| **Body / UI** | **IBM Plex Sans Arabic** | Exceptional screen legibility at small sizes, neutral enough to carry dense interface text, pairs cleanly with Readex. |
| **Code** | **JetBrains Mono** | Clear disambiguation of `0/O`, `1/l/I` — essential for a programming curriculum. |

- `BR-1221` — Readex Pro is used for headings, the goal statement, and celebration moments only. A display face used everywhere stops being a display face.
- `BR-1222` — Font stacks are paired so mixed Arabic–Latin lines share a baseline and comparable x-height (`BR-537`).
- `BR-1223` — Latin text inside Arabic paragraphs renders in the same family's Latin glyphs, not a substituted system font. Substitution is what makes bilingual text look broken.

### 4.2 Type Scale

```
--text-2xs    11px / 16px    metadata, timestamps
--text-xs     12px / 18px    labels, captions
--text-sm     14px / 22px    secondary body, UI
--text-base   16px / 26px    body — Arabic needs generous leading
--text-lg     18px / 28px    lead paragraphs
--text-xl     22px / 30px    card titles
--text-2xl    28px / 36px    section headings
--text-3xl    36px / 44px    page titles
--text-4xl    48px / 56px    hero
--text-5xl    64px / 70px    goal date, celebration numbers
```

- `BR-1224` — Arabic body text uses **1.6–1.65 line-height minimum**. Arabic ascenders and descenders need more vertical room than Latin; standard 1.5 makes it feel cramped.
- `BR-1225` — Base size is 16px on both languages. Arabic at 14px is measurably harder to read than Latin at 14px.

### 4.3 Numerals

- `BR-1226` — Western digits (`0-9`) are the default in both languages. Technical content, code, timestamps, and prices are read as Western digits by this audience.
- `BR-1227` — Arabic-Indic digits (`٠-٩`) are available as a user preference and apply only to prose numbers — never to code, versions, or prices.

---

## 5. Space, Shape, Motion

```
--space-1   4px      --radius-sm    4px     inputs, chips
--space-2   8px      --radius-md    8px     buttons, cards
--space-3   12px     --radius-lg    12px    panels, modals
--space-4   16px     --radius-xl    16px    hero surfaces
--space-6   24px     --radius-full  9999px  avatars, pills
--space-8   32px
--space-12  48px     --duration-fast    150ms
--space-16  64px     --duration-base    200ms
--space-24  96px     --duration-slow    320ms
                     --ease  cubic-bezier(0.2, 0, 0, 1)
```

- `BR-1228` — `8px` is the default radius. Not fully rounded (reads playful), not square (reads severe).
- `BR-1229` — Elevation is carried by **borders first**, shadows second. Heavy shadows on a dark surface read as muddy.
- `BR-1230` — No transition exceeds 320ms. Long animation on a learning platform is friction disguised as polish.
- `BR-1231` — `prefers-reduced-motion` disables all non-essential motion, including the rail's momentum gradient.

---

## 6. RTL System

- `BR-1232` — Logical CSS properties exclusively: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`. Physical properties fail the build (`BR-527`).
- `BR-1233` — Directional icons (arrows, chevrons, progress) mirror. Brand marks, checkmarks, media controls, and external-link icons do not (`BR-528`).
- `BR-1234` — Player controls remain LTR in both languages. Universal media convention — mirroring confuses everyone (`BR-529`).
- `BR-1235` — Code blocks are always LTR, left-aligned, regardless of interface direction (`BR-536`).
- `BR-1236` — Embedded Latin runs use Unicode **isolation**, not embedding. Without isolation, trailing punctuation jumps sides (`BR-535`).
- `BR-1237` — The rail flows right-to-left in Arabic and left-to-right in English. Progress moves *forward* in the reading direction.
- `BR-1238` — Every screen is verified in both directions before release (`BR-530`).

---

## 7. Component Library

| Group | Components |
|---|---|
| **Primitives** | Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Badge, Avatar, Tooltip, Skeleton |
| **Layout** | Card, Panel, Sheet, Modal, Drawer, Tabs, Accordion, Divider, Stack, Grid |
| **Navigation** | AppBar, SideNav, Breadcrumb, Pagination, BackLink |
| **Feedback** | Toast, InlineAlert, EmptyState, ErrorState, LoadingState, ProgressRing, ProgressBar |
| **Rail** | RailSpine, RailNode, RailConnector, ChapterRail, GoalHorizon |
| **Learning** | ContinueCard, CourseCard, LessonRow, LockedLessonRow, NotesPanel, ResourceItem, StreakBadge, WeekRing, MilestoneToast |
| **Player** | VideoPlayer, PlayerControls, ChapterList, SyncedNotes, TimestampNote, ResourceCue |
| **AI** | AIPanel, MessageBubble, CitationChip, QuotaMeter, StreamingIndicator |
| **Commerce** | PriceTag, ProductCard, EntitlementList, CheckoutSummary, CouponField |
| **Admin** | DataTable, FilterBar, QueueCard, EvidencePanel, MatrixEditor, BlockEditor, CurriculumTree |

- `BR-1239` — Every component reads its permitted actions from `_can` and renders nothing for absent capabilities (`BR-926`).
- `BR-1240` — Every component has defined loading, empty, and error states before it is considered complete.

---

## 8. Screen Inventory

### 8.1 Public — 11 screens

| ID | Screen | Notes |
|---|---|---|
| `SCR-01` | Landing | Outcome-led, trust above fold (`BR-581`) |
| `SCR-02` | Course catalog | Filterable grid |
| `SCR-03` | Course detail | Full curriculum visible (`BR-585`) |
| `SCR-04` | Free preview player | No registration (`BR-589`) |
| `SCR-05` | Certificate verification | Public, indexed |
| `SCR-06` | Blog index | Deferred (`DEC-13`) |
| `SCR-07` | Article | Deferred |
| `SCR-08` | Legal pages | Terms, privacy, refunds |
| `SCR-09` | Contact | Creates a ticket |
| `SCR-10` | Login | |
| `SCR-11` | Register | |

### 8.2 Learner — 24 screens

| ID | Screen | Notes |
|---|---|---|
| `SCR-12` | Onboarding (4 steps) | One question per screen |
| `SCR-13` | Onboarding projection | The payoff moment |
| `SCR-14` | **Dashboard** | Most important screen (`§9`) |
| `SCR-15` | My courses | |
| `SCR-16` | Course overview | Rail spine |
| `SCR-17` | **Lesson player** | Second most important (`§10`) |
| `SCR-18` | Locked lesson | Condition + action |
| `SCR-19` | Quiz intro | |
| `SCR-20` | Quiz attempt | |
| `SCR-21` | Quiz result | Never "failed" |
| `SCR-22` | Notes hub | Cross-course |
| `SCR-23` | AI conversations | |
| `SCR-24` | Q&A thread | |
| `SCR-25` | Certificates | |
| `SCR-26` | Certificate detail | Share |
| `SCR-27` | Goal settings | Editable anytime |
| `SCR-28` | Checkout | |
| `SCR-29` | Order confirmation | Routes into lesson 1 |
| `SCR-30` | Fawry pending | Reference code |
| `SCR-31` | Orders & invoices | |
| `SCR-32` | Subscription management | |
| `SCR-33` | Cancellation flow | Reason-gated remedy |
| `SCR-34` | Account settings | |
| `SCR-35` | Devices | |

### 8.3 Support & Expired — 5 screens

| ID | Screen |
|---|---|
| `SCR-36` | Help center |
| `SCR-37` | My tickets |
| `SCR-38` | Ticket thread |
| `SCR-39` | Expired access (`SEG-06`) |
| `SCR-40` | Reactivation |

### 8.4 Admin — 32 screens

| ID | Screen | ID | Screen |
|---|---|---|---|
| `SCR-41` | Operations dashboard | `SCR-57` | Product editor |
| `SCR-42` | Course list | `SCR-58` | Entitlement composer |
| `SCR-43` | Course editor | `SCR-59` | Coupons |
| `SCR-44` | Curriculum builder | `SCR-60` | Orders |
| `SCR-45` | Lesson editor | `SCR-61` | Refund requests |
| `SCR-46` | Block editor (notes) | `SCR-62` | Subscriptions |
| `SCR-47` | Resource manager | `SCR-63` | Revenue report |
| `SCR-48` | Media library | `SCR-64` | Completion report |
| `SCR-49` | Quiz builder | `SCR-65` | Drop-off report |
| `SCR-50` | Question bank | `SCR-66` | AI usage & gaps |
| `SCR-51` | Grading queue | `SCR-67` | AI configuration |
| `SCR-52` | Q&A queue | `SCR-68` | Settings |
| `SCR-53` | Student directory | `SCR-69` | Roles & permissions |
| `SCR-54` | Student profile | `SCR-70` | Staff management |
| `SCR-55` | Device transfer queue | `SCR-71` | Audit log |
| `SCR-56` | Publish approvals | `SCR-72` | System health |

**Total: 72 screens.**

---

## 9. `SCR-14` — Dashboard

The screen where motivation is manufactured (`02 §9.2`).

```
┌──────────────────────────────────────────────────────────┐
│  صباح الخير يا محمد            🔥 ٥ أيام متواصلة          │
│  ─────────────────────────────────────────────────────   │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  كمّل من حيث وقفت                                    │ │
│  │                                                      │ │
│  │  إدارة الحالة                                        │ │
│  │  أساسيات React · القسم ٣                             │ │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  ١٢:٣٠ · فاضل ٧ دقايق          │ │
│  │                                                      │ │
│  │                        [ كمّل الدرس ]  ←  gold, large│ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  هدفك: تغيير مجالي                                        │
│  ●━━━━━━━━━━━━━━━━━━━━◉─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ○         │
│  البداية              ٦٢٪                    ١٥ سبتمبر    │
│                                                           │
│                    فاضل ١٨ يوم                            │
│         درسين الأسبوع ده وتفضل على المسار                 │
│                                                           │
│  ─────────────────────────────────────────────────────   │
│  الأسبوع ده        ◔ ٣.٥ / ٥ ساعات    ٤ دروس            │
│  س  ح  ن  ث  ر  خ  ج                                     │
│  ●  ●  ○  ●  ●  ·  ·                                     │
│  ─────────────────────────────────────────────────────   │
│  اللي جاي                                                │
│  ○  التأثيرات ودورة الحياة              ١٠ دقايق         │
│  ○  الـ Hooks المخصصة                   ١٤ دقيقة         │
│  ○ ─ اختبار القسم                       يفتح بعد الدرسين │
│  ─────────────────────────────────────────────────────   │
│  إنجازاتك الأخيرة                                        │
│  ✓ خلصت قسم "المكونات الأساسية"          امبارح          │
└──────────────────────────────────────────────────────────┘
```

**Rules:**
- `BR-1241` — Continue is the single visually dominant element: largest surface, only gold button above the fold (`BR-224`).
- `BR-1242` — The goal horizon renders the **date**, not only the percentage. The date is what changes behavior (`GOAL-02`).
- `BR-1243` — Days remaining uses `--text-5xl`. It is the largest number on the screen.
- `BR-1244` — The week strip shows *what happened*, never a deficit. Missed days are neutral dots, never red or crossed (`BR-236`).
- `BR-1245` — Blocks with no data are absent from the DOM, not rendered empty (`BR-1136`).
- `BR-1246` — Skeleton loading matches final layout dimensions exactly. Layout shift on the most-visited screen is the most visible quality defect in the product.
- `BR-1247` — No block on this screen may contain negative framing in any state (`BR-226`).

**Variants:**

| State | Change |
|---|---|
| New learner, no purchase | Continue replaced by "Start with a free lesson"; catalog surfaces (`BR-225`) |
| Onboarding skipped | Goal block replaced by a dismissible prompt (`BR-210`) |
| All courses complete | Recommendations become the dominant block |
| Expired (`SEG-06`) | Continue becomes a reactivation invitation; progress and notes remain fully visible (`BR-752`) |

---

## 10. `SCR-17` — Lesson Player

```
┌────────────────────────────────────────────────────────────────┐
│ ← أساسيات React            القسم ٣ · الدرس ٧          ⋮        │
├──────────────────────────────────────┬─────────────────────────┤
│                                       │  الفهرس                │
│                                       │  ● مقدمة        ٠:٠٠   │
│         [ VIDEO — always dark ]       │  ● useState     ٤:٣٠   │
│                                       │  ◉ useRef      ١١:٠٠   │
│                                       │  ○ مثال عملي   ١٨:٢٠   │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░     │  ───────────────────   │
│  │      │        │         │          │  📎 ملف المشروع        │
│  ⏵ ⏸  ١٢:٣٠ / ١٩:٠٠   ⚙ ⛶  ×١.٠     │  🔗 التوثيق الرسمي     │
├──────────────────────────────────────┴─────────────────────────┤
│  [ الملاحظات ]  [ المساعد ]  [ أسئلة ]                        │
│  ────────────                                                  │
│  ● ٤:٣٠  الفرق بين useState و useRef                          │
│    useState بيعيد رسم المكوّن، useRef لأ...                    │
│                                                                │
│  ● ١١:٠٠  متى نستخدم useRef                                    │
│    لما تحتاج تحتفظ بقيمة من غير re-render                      │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ اكتب ملاحظة عند ١٢:٣٠...                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│  ← الدرس السابق                        الدرس التالي →          │
└────────────────────────────────────────────────────────────────┘
```

**Rules:**
- `BR-1248` — The player region is dark in both themes. A deliberate, documented exception (`BR-543`).
- `BR-1249` — Lesson Notes highlight in sync with playback. The active block is marked on the rail, not scrolled aggressively — forced auto-scroll fights a reader.
- `BR-1250` — Selecting a note block seeks the video. Selecting a chapter seeks the video. The rail is bidirectional.
- `BR-1251` — Note capture stamps the current timestamp automatically and does not pause playback unless the learner has enabled that preference (`BR-200`).
- `BR-1252` — Timestamped resources surface without interrupting playback and remain available afterward (`BR-155`, `BR-156`).
- `BR-1253` — On mobile, the note input never covers more than the lower third of the screen (`BR-570`).
- `BR-1254` — The AI panel streams tokens with a visible indicator. A blank wait reads as failure (`BR-566`).

---

## 11. Key State Screens

### `SCR-18` — Locked Lesson

```
┌────────────────────────────────────────────┐
│              ⬡  مقفول مؤقتًا                │
│                                             │
│         الـ Hooks المخصصة                   │
│              ١٤ دقيقة                       │
│                                             │
│   أكمل درس "التأثيرات ودورة الحياة"        │
│         علشان يفتح الدرس ده                 │
│                                             │
│        [ روح للدرس المطلوب ]                │
└────────────────────────────────────────────┘
```

- `BR-1255` — Title and duration are fully legible. The lock is a state, not a redaction (`BR-1212`).
- `BR-1256` — Exactly one action, and it satisfies the condition (`BR-735`).
- `BR-1257` — The words "denied," "forbidden," and "no permission" never appear (`BR-736`).

### `SCR-21` — Quiz Result (not passed)

```
┌────────────────────────────────────────────┐
│                  ٦٥٪                        │
│              قريب جدًا                      │
│                                             │
│   ٣ نقاط محتاجة مراجعة:                    │
│                                             │
│   ○ الفرق بين useState و useRef            │
│     → الدرس ٧ · ٤:٣٠                        │
│   ○ متى يعاد رسم المكوّن                    │
│     → الدرس ٦ · ٢:١٥                        │
│   ○ قواعد الـ Hooks                         │
│     → الدرس ٥ · ٩:٤٠                        │
│                                             │
│        [ راجع وجرّب تاني ]                  │
│         فاضل لك محاولتين                    │
└────────────────────────────────────────────┘
```

- `BR-1258` — Every missed item links to the exact lesson and second covering it (`BR-1148`).
- `BR-1259` — Retry is the primary action. The score is stated without judgment (`BR-1147`).

### `SCR-39` — Expired Access

```
┌────────────────────────────────────────────┐
│   كل حاجة لسه هنا                          │
│                                             │
│   ✓ تقدمك: ٦٢٪ من أساسيات React            │
│   ✓ ٢٣ ملاحظة                               │
│   ✓ شهادة واحدة                             │
│                                             │
│   ارجع وكمّل من حيث وقفت — الدرس ٧          │
│                                             │
│        [ فعّل وصولك تاني ]                  │
└────────────────────────────────────────────┘
```

- `BR-1260` — Leads with what is retained, never with what was lost (`BR-752`).

### `SCR-41` — Operations Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  محتاج انتباهك                                     ٤     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ⬤ ٣ طلبات نقل أجهزة        أقدم: ٤٧ دقيقة    →   │  │
│  │ ⬤ ٢ أسئلة مصعّدة            أقدم: ٥١ ساعة     →   │  │
│  │ ◐ ١ تذكرة متأخرة            ٢٨ ساعة           →   │  │
│  │ ○ ٤ تقييمات في الانتظار                        →   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  اليوم    ٤٬٤٩٧ ج.م · ٣ طلبات      الشهر  ٨٩٬٩٤٠ ↑١٢٪  │
│  الطلاب   ٧ جدد · ١٤٢ نشط · ٤٨٦ إجمالي                  │
│                                                           │
│  الإكمال ٣٨.٢٪ ✓ الهدف ٣٥٪    الذكاء ٨.٤٢$ / ١٥$        │
│  ─────────────────────────────────────────────────────   │
│  ✓ النسخة الاحتياطية ٤:٠٠ ص     ✓ ٩٩.٩٤٪ تشغيل        │
│  ◔ الإيميل ١٬٨٤٠ / ٣٬٠٠٠                                │
└──────────────────────────────────────────────────────────┘
```

- `BR-1261` — "Needs your attention" is the first and visually heaviest block. Everything else is reference (`BR-1181`).
- `BR-1262` — Every row resolves in one click (`BR-464`).
- `BR-1263` — When nothing needs attention, the block states so explicitly rather than disappearing. Confirmation of "you're clear" is the point.
- `BR-1264` — Blocks the actor lacks permission for are absent (`BR-1183`).

---

## 12. Responsive Strategy

| Breakpoint | Width | Layout |
|---|---|---|
| `sm` | < 640px | Single column, bottom navigation, player full-bleed |
| `md` | 640–1024px | Two column where useful, side navigation collapses |
| `lg` | 1024–1440px | Full layout, player with side panel |
| `xl` | > 1440px | Content capped at 1280px, generous margins |

- `BR-1265` — Mobile-first authored. The learner base is phone-heavy (`MET-07`).
- `BR-1266` — Content width caps at **68 characters** for Arabic prose, 72 for Latin. Long measure destroys Arabic readability faster than Latin.
- `BR-1267` — Touch targets are minimum 44×44px.
- `BR-1268` — On `sm`, the player's side panel becomes tabs beneath the video. It is never removed — notes and AI are core, not desktop extras (`BR-564`).

---

## 13. Accessibility

- `BR-1269` — Visible keyboard focus on every interactive element, using `--border-focus`. Never `outline: none` without a replacement.
- `BR-1270` — Full keyboard operation of the player: space, arrows, `F`, `M`, `[` `]`.
- `BR-1271` — All images carry meaningful alt text; decorative images carry empty alt.
- `BR-1272` — Live regions announce streaming AI responses, toast notifications, and quiz results.
- `BR-1273` — `prefers-reduced-motion` respected throughout (`BR-1231`).
- `BR-1274` — Color is never the only signal (`BR-1218`).
- `BR-1275` — Form errors are announced, associated with their field, and describe the fix (`BR-817`).

---

## 14. States

Every component defines four states before it is complete (`BR-1240`).

| State | Rule |
|---|---|
| **Loading** | Skeleton matching final dimensions. Spinners only for actions under 1 second. |
| **Empty** | An invitation to act, never a shrug. "Start your first lesson," not "No data." |
| **Error** | What happened + how to fix it, in the interface's voice. Never an apology, never vague (`BR-817`). |
| **Success** | Confirmation in the same vocabulary as the action. "Publish" produces "Published." |

- `BR-1276` — Empty states always contain the action that fills them.
- `BR-1277` — An action's label and its confirmation share vocabulary. Consistency is how people learn the product.
- `BR-1278` — Optimistic updates on progress, notes, and bookmarks. Reconciliation is silent; only genuine failures surface (`BR-561`).

---

## 15. Mobile-Specific

- `BR-1279` — Bottom navigation: Home · My courses · AI · Profile. Four items maximum.
- `BR-1280` — Dashboard renders from cache immediately, then updates. A spinner on the most-opened screen is unacceptable (`BR-565`).
- `BR-1281` — Locked content shows title and state with **no price and no purchase action** (`BR-573`).
- `BR-1282` — Push permission is requested after the first completed lesson, never at launch (`BR-416`).
- `BR-1283` — The player pauses with an informational message during screen recording, never an accusation (`BR-398`).

---

## 16. `DEC-34`–`DEC-36`

| ID | Decision | Rationale |
|---|---|---|
| `DEC-34` | **Tailwind CSS with a custom token layer**, not a component framework | shadcn/ui primitives are copied in and restyled to the token system. A pre-built design system would fight the Arabic-first typography and the rail motif. |
| `DEC-35` | **No illustration library.** Iconography is a single consistent set (Lucide), plus the rail motif | Stock illustration is the fastest way to make a premium product look generic. |
| `DEC-36` | **Screens are designed in Arabic first, then verified in English** | Designing in English and translating produces layouts that break under Arabic's longer average word length and different line rhythm (`PRIN-07`). |

- `BR-1284` — Any screen that has not been reviewed in Arabic RTL is not complete, regardless of how it looks in English (`BR-1238`).

---

## 17. Frontend Implementation Standard

### 17.0 Authority

This section is **binding on every person and every AI agent** that writes frontend code for Josam Academy. It exists because the failure mode of AI-assisted frontend work is not ugly output — it is **beautiful output that is not a product**: correct-looking screens with invented data, missing states, broken RTL, and no permission awareness.

- `BR-1285` — A screen is not complete because it renders. It is complete when it passes §18.
- `BR-1286` — Where this section conflicts with visual preference, this section wins.
- `BR-1287` — `DEC-37` — **Every claim of completion must carry evidence.** "Done" without the §18 checklist is not accepted.

---

### 17.1 Comprehension Gate — before any code

- `BR-1288` — Read the screen's flow in `06-user-flows.md`, its business rules in `07`, its endpoints in `11`, and its permissions in `05` **before** writing code.
- `BR-1289` — Identify: who the primary actor is, what the single job of the screen is, and which entity states it must handle.
- `BR-1290` — Never invent an endpoint, field, permission key, entitlement key, or reason code. If it is not in `11-api-contract` or `05-roles-and-permissions`, it does not exist.
- `BR-1291` — Never invent numbers, testimonials, logos, chart data, or company names. Placeholder data is labeled as such and is never merged.
- `BR-1292` — Never remove a required feature because it is visually inconvenient. Raise it instead.
- `BR-1293` — Never add a feature that was not specified. Additions are scope changes.
- `BR-1294` — Distinguish Create / Edit / View / Read-only modes explicitly. They are different screens even when they share a component.
- `BR-1295` — Check adjacent screens before building. A screen built in isolation drifts from the system.
- `BR-1296` — Never change existing shared behavior to make one screen easier.

---

### 17.2 Prohibited "Generic AI" Patterns

`DEC-38` — The following are **prohibited outright**. They are the visual signature of unconsidered work and are incompatible with the brand.

| # | Prohibited | Rule |
|---|---|---|
| 1 | Hero section on any dashboard, admin, or operational screen | `BR-1297` |
| 2 | Blue/purple gradients anywhere | `BR-1298` |
| 3 | Gradient text on headings | `BR-1299` |
| 4 | Glassmorphism, background blobs, blurred decorative circles | `BR-1300` |
| 5 | Sparkle / star / zap / lightning icons as decoration | `BR-1301` |
| 6 | "AI Powered" badges or similar self-congratulation | `BR-1302` |
| 7 | Wrapping every element in a card | `BR-1303` |
| 8 | Fake testimonials, fake logos, fake charts, fake metrics | `BR-1304` |
| 9 | Emoji used as an icon system | `BR-1305` |
| 10 | Marketing copy on operational screens ("Unlock the power", "Seamless experience", "Everything you need") | `BR-1306` |
| 11 | A features grid of 3 or 6 cards that was not requested | `BR-1307` |
| 12 | Repeated CTA every two screens | `BR-1308` |
| 13 | Animation on every component | `BR-1309` |
| 14 | Stock imagery unrelated to the product | `BR-1310` |

- `BR-1311` — Gradient is permitted in exactly one place in the entire product: the rail's momentum segment (`BR-1213`).
- `BR-1312` — Decoration that carries no information is removed. Structural devices (numbering, eyebrows, dividers) are used only where they encode something true (`BR-1214`).

---

### 17.3 Visual Hierarchy

- `BR-1313` — Every screen has exactly one primary action, visually dominant. If two things compete, one is wrong.
- `BR-1314` — Primary, secondary, and destructive actions are visually distinct at a glance.
- `BR-1315` — Destructive actions are always identifiable before they are clicked.
- `BR-1316` — Bold weight is a hierarchy signal, not emphasis decoration. Bold everywhere is bold nowhere.
- `BR-1317` — Only sizes from the type scale (`§4.2`) are used. A one-off size is a defect.
- `BR-1318` — Status is legible without hunting for it.
- `BR-1319` — The reading path top-to-bottom is deliberate and traceable.

---

### 17.4 Layout

- `BR-1320` — One container system across all pages. Inline padding is identical between screens of the same type.
- `BR-1321` — Headings and their content share the same inline start position.
- `BR-1322` — No unintended horizontal scroll at any breakpoint. This is a defect, not a quirk.
- `BR-1323` — `position: absolute` is used only where the layout genuinely requires it, never to patch alignment.
- `BR-1324` — `100vh` is avoided on mobile; `100dvh` or a flex layout is used instead.
- `BR-1325` — Modals scroll internally and never exceed the viewport. Dropdowns and tooltips flip rather than clipping at the edge.
- `BR-1326` — Sticky elements are inventoried per screen so they cannot overlap.
- `BR-1327` — Layout must survive: a one-character title, a 200-character title, one row, and one thousand rows.
- `BR-1328` — Mobile safe areas (`env(safe-area-inset-*)`) are respected.

---

### 17.5 Spacing

- `BR-1329` — Only the spacing scale (`§5`) is used. Values such as `13px`, `17px`, `22px` fail review.
- `BR-1330` — The gap between a heading and its own content is always smaller than the gap between sections. Proximity encodes relationship.
- `BR-1331` — Card padding is identical for cards of the same class.
- `BR-1332` — Margin is not used to compensate for a wrong layout. Negative margin requires a written reason.
- `BR-1333` — Actions sit adjacent to the content they affect.

---

### 17.6 Typography — implementation

- `BR-1334` — Only the loaded weights are used. Referencing a weight the font does not ship produces synthetic bolding and looks broken.
- `BR-1335` — Font loading uses `font-display: swap` with a metrics-matched fallback. Layout shift on font load is a defect.
- `BR-1336` — Body text is never below 14px, and never below 16px for reading surfaces (`BR-1225`).
- `BR-1337` — Long text is never centered. Centering is for short display text only.
- `BR-1338` — Labels and values are visually distinguishable without reading them.
- `BR-1339` — Placeholder text is visibly lighter than entered text and never replaces a label.
- `BR-1340` — Truncated text always has a way to be read in full.
- `BR-1341` — Numbers use tabular figures wherever they align in columns.

---

### 17.7 Color & Theme — implementation

- `BR-1342` — Raw color values and Tailwind palette utilities (`text-gray-500`, `bg-blue-600`) are prohibited in components. Semantic tokens only (`BR-1220`).
- `BR-1343` — The accent color never signals success, error, or warning.
- `BR-1344` — Red is reserved for destructive and error states only.
- `BR-1345` — Borders remain visible in both themes. A border that disappears in dark mode is a defect.
- `BR-1346` — Hover, focus, active, disabled, and loading states are visually distinct for every interactive element.
- `BR-1347` — Disabled controls never look enabled, and always explain why they are disabled.
- `BR-1348` — Links are distinguishable from body text without relying on color alone.
- `BR-1349` — Status colors are identical across every screen in the product.

---

### 17.8 Design System Discipline

- `BR-1350` — Never create a second Button, Modal, Input, Table, EmptyState, Toast, or page header. Extend the existing one or raise the gap.
- `BR-1351` — A shared component exceeding 8 props is a signal it is doing too much; split by use case.
- `BR-1352` — Component names describe what they are. A component used in one place is not named generically.
- `BR-1353` — `!important` is prohibited. Its presence indicates a specificity problem to be fixed.
- `BR-1354` — Tailwind classes, inline styles, and standalone CSS are not mixed within one component.
- `BR-1355` — Abstraction is created on the third use, not the first.
- `BR-1356` — Changing a shared component requires checking every consumer.

---

### 17.9 Copy

- `BR-1357` — All copy comes from the i18n catalog. Strings in components fail the build (`BR-523`).
- `BR-1358` — Terminology is fixed system-wide: one entity has one name. The learner is **الطالب / learner** everywhere — never user, member, or customer in different places.
- `BR-1359` — Buttons name the action: "احفظ التغييرات" not "إرسال"; "انشر" not "تأكيد".
- `BR-1360` — An action's label and its confirmation share the same verb (`BR-1277`).
- `BR-1361` — Confirmations state the consequence: "تحذف الدرس ده؟ التقدم بتاع الطلاب هيفضل محفوظ." — never "هل أنت متأكد؟".
- `BR-1362` — Error messages state what happened and how to fix it. Never technical, never an apology, never vague (`BR-817`).
- `BR-1363` — Empty states explain what to do and contain the action that resolves them (`BR-1276`).
- `BR-1364` — No Lorem Ipsum, no placeholder copy, no leftover English in an Arabic surface.
- `BR-1365` — The prohibited-language list (`07 §7.1`) is checked against every string before merge.

---

### 17.10 UX & Navigation

- `BR-1366` — The user always knows where they are. Breadcrumbs appear wherever depth exceeds two levels.
- `BR-1367` — Back returns to the origin, preserving filters, scroll position, and the selected tab.
- `BR-1368` — Filters, sort, pagination, and tab state live in the URL and survive refresh and sharing.
- `BR-1369` — Sensitive state is never in the URL (`BR-1205`).
- `BR-1370` — One interaction pattern per action type across the product. The same action does not open a modal on one screen and a drawer on another.
- `BR-1371` — Modals are never nested.
- `BR-1372` — Closing a modal with unsaved changes warns first. Click-outside does not discard data.
- `BR-1373` — Reversible actions offer Undo instead of a confirmation dialog. Irreversible actions require confirmation.
- `BR-1374` — Every action produces immediate feedback within 100 ms, even if the result takes longer.
- `BR-1375` — A submitting button is disabled and shows its state. Double submission is impossible.
- `BR-1376` — After creating an item, the user is taken to it.
- `BR-1377` — Toasts remain long enough to read, never cover the primary action, and are never used to ask a question.
- `BR-1378` — Icon-only controls carry a label or tooltip unless the icon is universally understood.
- `BR-1379` — No interaction is hover-only. Every hover behavior has a touch equivalent.
- `BR-1380` — Active navigation state is correct, including a parent staying active on child routes.
- `BR-1381` — Router `Link` for internal navigation, `<a>` for external. Internal links never open in a new tab.
- `BR-1382` — Protected routes never flash content before redirecting.

---

### 17.11 Responsive

- `BR-1383` — Tested at **360, 390, 768, 1024, 1440**. A screen not tested at 360px is not done.
- `BR-1384` — Tablet is designed, not inherited.
- `BR-1385` — Tables become card lists or horizontally scrollable regions with a sticky first column — never compressed into illegibility.
- `BR-1386` — A fixed bottom bar reserves space so it never covers the last element.
- `BR-1387` — Column reordering on small screens preserves information priority.
- `BR-1388` — No information that exists on desktop is silently dropped on mobile.
- `BR-1389` — Touch targets are ≥ 44×44px with ≥ 8px separation (`BR-1267`).
- `BR-1390` — The mobile keyboard never covers the focused field.
- `BR-1391` — Tested at 200% browser zoom without loss of content.

---

### 17.12 RTL — implementation depth

`dir="rtl"` is the beginning, not the completion.

- `BR-1392` — Logical properties only; physical direction properties fail the build (`BR-1232`).
- `BR-1393` — Phone numbers, emails, URLs, IDs, codes, versions, and file paths are wrapped in `dir="ltr"` with Unicode isolation (`BR-1236`).
- `BR-1394` — Pagination arrows, sort indicators, and breadcrumb separators follow reading direction; media controls and checkmarks do not (`BR-1233`).
- `BR-1395` — Table column order, header alignment, and sort affordances mirror correctly.
- `BR-1396` — Numeric and email inputs are `dir="ltr"` regardless of interface direction.
- `BR-1397` — Text alignment is never hard-coded; `text-align: start` / `end` only.
- `BR-1398` — Buttons are tested with the longer of the two translations. Arabic and English differ in length by up to 40%.
- `BR-1399` — Translation never uses concatenation. Interpolation with named variables only (`BR-523`).
- `BR-1400` — Arabic pluralization implements all six CLDR forms (`BR-525`).
- `BR-1401` — Every screen is verified in **both** directions. Passing in one and breaking in the other is a defect (`BR-1284`).

---

### 17.13 Forms

- `BR-1402` — Every field has a real `<label>` associated with its input. Placeholder is never the label.
- `BR-1403` — Required fields are marked, and the marking is explained once per form.
- `BR-1404` — Validation runs on blur and on submit, not on every keystroke.
- `BR-1405` — Errors appear adjacent to their field, explain the fix, and persist until corrected.
- `BR-1406` — On failed submit, focus moves to the first invalid field and the page scrolls to it.
- `BR-1407` — Submitted data survives a failed request. Forms are never reset on error.
- `BR-1408` — Edit forms wait for data before initializing, and update when it arrives.
- `BR-1409` — Input types match the data. `type="number"` is never used for phone numbers.
- `BR-1410` — Values are trimmed; empty strings are normalized per the API contract (`BR-1290`).
- `BR-1411` — Dependent fields reset when their parent changes.
- `BR-1412` — Leaving a dirty form warns before discarding.
- `BR-1413` — File inputs state accepted types and size limits before selection, validate both, and show upload progress.
- `BR-1414` — Password fields support show/hide and browser password managers. `autocomplete` is correct, never disabled.
- `BR-1415` — `Enter` submits the intended action; `Escape` does not silently discard data.

---

### 17.14 The State Matrix

Every data-driven screen implements **all** of the following before it is considered built. Designing only the ideal state is the single most common failure.

| Group | Required states |
|---|---|
| **Loading** | initial load · background refresh · slow request (> 3 s) · optimistic pending |
| **Data** | empty · single item · typical · very large (1000+) · very long text · missing optional fields · null values |
| **Search & filter** | no results for search · no results for filter · filter cleared |
| **Failure** | API error · timeout · offline · rate limited · optimistic rollback · upload failure |
| **Access** | not authenticated · no entitlement · expired entitlement · locked · read-only · permission absent |
| **Entity** | draft · pending · active · archived · deleted by another user · stale data |
| **Session** | first-time user · returning user · expired session |
| **Media** | missing image · broken image |

- `BR-1416` — A screen missing any applicable state from this matrix is not done.
- `BR-1417` — Skeletons match final layout dimensions and disappear the moment data arrives (`BR-1246`).
- `BR-1418` — An error state never destroys already-loaded data, and always offers **Retry** that retries the failed request — not a full page reload.
- `BR-1419` — `undefined`, `null`, `NaN`, and `Invalid Date` never reach the screen.
- `BR-1420` — Permission-absent renders nothing at all; every other denial renders its `_reason` (`BR-1111`).

---

### 17.15 Tables

- `BR-1421` — Column priority is defined per table; low-priority columns collapse first on small screens.
- `BR-1422` — Headers are sticky on tables exceeding one viewport.
- `BR-1423` — Row click and in-row actions never conflict; in-row controls stop propagation.
- `BR-1424` — Sorting, filtering, and pagination are server-driven and reflected in the URL. Client-side pagination over server data is prohibited.
- `BR-1425` — Changing a filter resets to page 1. Page size persists.
- `BR-1426` — Selection behavior is explicit: "select all" states whether it means this page or all matches.
- `BR-1427` — Bulk destructive actions state the exact count and require confirmation.
- `BR-1428` — Monetary and numeric columns use tabular figures and explicit currency (`BR-1341`).
- `BR-1429` — Row keys are stable entity IDs. Array index as key is prohibited.
- `BR-1430` — Every table shows a total count, and export respects active filters.

---

### 17.16 Dashboards & KPIs

- `BR-1431` — Every metric states its time period and its comparison basis. "↑ 12%" without "vs last month" is meaningless.
- `BR-1432` — Currency and unit are always explicit.
- `BR-1433` — Charts start at zero unless a truncated axis is labeled as such.
- `BR-1434` — Each widget loads and fails independently. One failed widget never breaks the dashboard.
- `BR-1435` — Every dashboard surface shows `as_of` (`BR-1196`).
- `BR-1436` — No chart exists to fill space. Each answers a stated question (`11 §API-20`).

---

### 17.17 State Management & Data

- `BR-1437` — Server state lives in the query layer only. It is never duplicated into a global store (`BR-924`).
- `BR-1438` — Derived values are computed, not stored.
- `BR-1439` — Requests are cancelled on unmount and on navigation. `AbortController` is used.
- `BR-1440` — Race conditions are handled: an older response never overwrites a newer one.
- `BR-1441` — All client state and cache is cleared on logout. Data from a previous user must be unreachable.
- `BR-1442` — Loading and error state is per-operation, never one boolean for a whole page.
- `BR-1443` — Optimistic updates always implement rollback.
- `BR-1444` — Cache invalidation is targeted. Invalidating the whole cache after a small change is prohibited.
- `BR-1445` — Effects have complete dependency arrays. `useEffect` is not used to compute derivable values.
- `BR-1446` — Every listener, timer, and subscription is cleaned up.

---

### 17.18 API Integration

- `BR-1447` — Only endpoints defined in `11-api-contract` are called, with the defined method, payload, and field names (`BR-1290`).
- `BR-1448` — HTTP status codes are handled distinctly: 401 refreshes once, 403 shows the reason, 404 shows not-found, 422 maps to fields, 429 shows the reset time.
- `BR-1449` — Success messages appear only after confirmed success.
- `BR-1450` — Empty `catch` blocks are prohibited. Raw server errors are never shown to the user (`BR-1114`).
- `BR-1451` — Search input is debounced with cancellation of superseded requests.
- `BR-1452` — No N+1 request patterns. One request per row is prohibited.
- `BR-1453` — Token refresh is single-flight: concurrent 401s trigger one refresh, not many.
- `BR-1454` — The API base URL comes from configuration, never hard-coded.
- `BR-1455` — Mock data never ships. A mock fallback that hides a real failure is prohibited.

---

### 17.19 Permissions in the UI

- `BR-1456` — Hiding a control is **not** security. Every action is enforced server-side (`BR-1201`).
- `BR-1457` — The UI never reasons about roles. It renders from `_can` (`BR-1239`).
- `BR-1458` — Content is not rendered before permissions resolve. Unauthorized content must never flash.
- `BR-1459` — A control that will always fail with 403 is never rendered.
- `BR-1460` — Read-only mode disables actions and states why.
- `BR-1461` — Permission changes mid-session are handled by refreshing capabilities, not by logging the user out (`BR-718`).

---

### 17.20 Frontend Security

- `BR-1462` — `dangerouslySetInnerHTML` requires sanitization and a written justification. API-returned HTML is never rendered raw.
- `BR-1463` — No secret is ever placed in client code or client-visible environment variables.
- `BR-1464` — Tokens, personal data, and payment details never appear in logs, analytics, or error payloads (`BR-1114`).
- `BR-1465` — `target="_blank"` always carries `rel="noopener noreferrer"`.
- `BR-1466` — Redirect targets are validated against an allowlist. Open redirects are prohibited.
- `BR-1467` — Uploads are validated by MIME type and size, not by extension alone.
- `BR-1468` — Every dependency is verified to exist and be maintained before installation. Hallucinated or typosquatted packages are a critical defect (`BR-1479`).

---

### 17.21 Accessibility — implementation

- `BR-1469` — Semantic elements only: `<button>` for actions, `<a>` for navigation. A clickable `<div>` is a defect.
- `BR-1470` — Modals trap focus, close on `Escape`, and return focus to the trigger.
- `BR-1471` — Icon-only buttons carry `aria-label`.
- `BR-1472` — Heading levels are ordered; exactly one `<h1>` per page.
- `BR-1473` — Errors, toasts, and loading completion are announced via live regions (`BR-1272`).
- `BR-1474` — Tab order follows visual order. Positive `tabindex` is prohibited.
- `BR-1475` — Custom selects, checkboxes, and date pickers are fully keyboard operable.
- `BR-1476` — Latin passages inside Arabic content carry `lang="en"` and vice versa.
- `BR-1477` — Tooltips appear on focus, not hover alone (`BR-1379`).

---

### 17.22 Performance

- `BR-1478` — Named imports only. Importing an entire library or icon set for one symbol is prohibited.
- `BR-1479` — Every dependency added must be justified against writing it directly. A package for a ten-line problem is rejected.
- `BR-1480` — Images specify dimensions, use modern formats, and are lazy-loaded — **except** the above-the-fold image, which is eager and preloaded.
- `BR-1481` — Only the weights listed in `§4.1` are loaded.
- `BR-1482` — Lists exceeding 100 rows are virtualized.
- `BR-1483` — Animation uses `transform` and `opacity` only. Animating `top`, `left`, `width`, or `height` is prohibited.
- `BR-1484` — Scroll and resize listeners are passive and throttled.
- `BR-1485` — Route-level code splitting is mandatory; admin code never enters learner bundles (`BR-923`).
- `BR-1486` — Budgets: initial JS ≤ 200 KB gzipped, LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms — measured on a mid-range Android over 4G, the real device profile of this audience (`02 §7`).

---

### 17.23 Icons, Images, Animation

- `BR-1487` — One icon library (Lucide) at one stroke width. Mixed icon sources are a defect (`DEC-35`).
- `BR-1488` — The icon matches the action. A trash icon never means archive; an eye icon never means edit.
- `BR-1489` — Avatar initials support Arabic names correctly.
- `BR-1490` — Broken images have a defined fallback.
- `BR-1491` — Animation duration never exceeds 320 ms and never delays access to content (`BR-1230`).
- `BR-1492` — Hover effects never change layout or push neighbours.
- `BR-1493` — `transition: all` is prohibited; transitions name their properties.
- `BR-1494` — `prefers-reduced-motion` is honored everywhere (`BR-1231`).

---

### 17.24 Code & Architecture

- `BR-1495` — No page file exceeds 300 lines. Beyond that, extract by responsibility — not by wrapping every `div`.
- `BR-1496` — Business logic never lives in JSX.
- `BR-1497` — `any`, `@ts-ignore`, and type assertions used to silence errors are prohibited.
- `BR-1498` — Optional chaining is not used to paper over a data contract; if a field can be absent, the contract says so.
- `BR-1499` — Routes, permission keys, statuses, and thresholds are imported from shared constants — never inlined (`BR-1290`, `BR-830`).
- `BR-1500` — Error boundaries are placed per route segment, not once for the whole application.
- `BR-1501` — No `console.log`, dead code, commented-out code, or mock data at merge.
- `BR-1502` — Server and Client Components are separated deliberately. Blanket `"use client"` is prohibited.
- `BR-1503` — No `window`, `Date.now()`, or `Math.random()` during render or server rendering. Hydration mismatches are defects.

---

### 17.25 Operational & Admin Screens

Admin screens serve `MET-06`. Density and speed beat aesthetics.

- `BR-1504` — Tables, not card grids, for operational data.
- `BR-1505` — Filters, search, bulk actions, and export are present and reachable without scrolling on desktop.
- `BR-1506` — Entity IDs are visible or copyable for support use, alongside readable names.
- `BR-1507` — `created_by`, `updated_by`, and timestamps are shown on every operational record.
- `BR-1508` — Illegal status transitions are not offered (`07 §3`).
- `BR-1509` — Any action affecting money or access states its consequence and requires confirmation.
- `BR-1510` — The UI never offers an action the API will reject, and never hides an action the API supports and the actor is permitted (`BR-1459`).

---

### 17.26 Fixing Defects

- `BR-1511` — Reproduce before fixing. A fix without reproduction is a guess.
- `BR-1512` — Fix the cause, not the symptom. The following are prohibited as fixes: `overflow: hidden` to hide overflow, `z-index: 9999`, fixed widths to force alignment, `!important`, empty `try/catch`, blanket optional chaining, `setTimeout` to resolve a race, disabling a lint rule, `@ts-ignore`, weakening a test.
- `BR-1513` — Never replace a whole component when the defect is local.
- `BR-1514` — Never remove a feature instead of repairing it.

---

### 17.27 Change Discipline

- `BR-1515` — Touch only files related to the task. Unrelated refactors and reformatting are separate work.
- `BR-1516` — Never delete code believed unused without verifying it is not referenced dynamically.
- `BR-1517` — Review the full diff before merging.
- `BR-1518` — Run build, type check, lint, and tests. Reporting success without running them is a critical failure of trust.
- `BR-1519` — One commit, one topic.
- `BR-1520` — Never commit secrets, generated artifacts, or lockfile changes without reason.

---

## 18. Definition of Done

A screen is complete only when **every** box is checked, with evidence.

```
COMPREHENSION
☐ Flow, business rules, endpoints, and permissions read before coding
☐ Primary actor, single job, and entity states identified
☐ No invented endpoint, field, permission, or number

DESIGN SYSTEM
☐ Semantic tokens only — no raw colors, no palette utilities
☐ Type scale and spacing scale only
☐ Existing components reused; no duplicates created
☐ No prohibited pattern from §17.2

STATES  (§17.14)
☐ Loading · background refresh · slow request
☐ Empty · single item · typical · 1000+ items
☐ Very long text · null / missing optional fields
☐ No search results · no filter results
☐ API error · timeout · offline · rate limited  — each with working Retry
☐ No entitlement · expired · locked · read-only · permission absent
☐ Missing and broken images
☐ No undefined / null / NaN / Invalid Date visible

RESPONSIVE
☐ Verified at 360 · 390 · 768 · 1024 · 1440
☐ No horizontal scroll at any width
☐ Touch targets ≥ 44px
☐ Keyboard does not cover focused fields
☐ Verified at 200% zoom

BILINGUAL
☐ Verified in Arabic RTL
☐ Verified in English LTR
☐ Longest translation does not break any control
☐ Technical strings isolated LTR
☐ No hardcoded strings; no concatenated translations
☐ No prohibited copy terms (07 §7.1)

PERMISSIONS
☐ Renders from _can — no role logic in the client
☐ No content flash before permissions resolve
☐ _reason rendered for every denial except PERMISSION_ABSENT
☐ Verified as each applicable role

FORMS  (if applicable)
☐ Real labels · required marked · validation on blur
☐ Focus moves to first error · data survives failure
☐ Dirty-state warning · no double submit

TABLES  (if applicable)
☐ Server-side sort / filter / pagination reflected in URL
☐ Column priority defined for small screens
☐ Stable row keys · total count · export respects filters

ACCESSIBILITY
☐ Full keyboard operation · visible focus · logical tab order
☐ Modal focus trap and return
☐ aria-labels on icon buttons · live regions for async
☐ Contrast AA verified in both themes
☐ Color is never the only signal

PERFORMANCE
☐ Within budget: JS ≤ 200KB gz · LCP ≤ 2.5s · CLS ≤ 0.1 · INP ≤ 200ms
☐ Measured on mid-range Android over 4G
☐ Images sized, modern format, correctly lazy or eager

INTEGRATION
☐ Real API — no mock data
☐ All status codes handled distinctly
☐ Requests cancelled on unmount · no race conditions
☐ No N+1 requests

VERIFICATION
☐ Build · typecheck · lint · tests all run and passing
☐ Zero console errors and warnings
☐ Chrome and Safari checked
☐ Full diff reviewed
```

- `BR-1521` — This checklist is copied into the pull request and filled honestly. An unchecked box is acceptable; a falsely checked box is not.

---

## 19. Automated Enforcement

Rules enforced by machines do not depend on discipline (`BR-900`).

| Check | Tool | Enforces |
|---|---|---|
| Raw colors / palette utilities in components | Stylelint + custom | `BR-1342` |
| Physical CSS direction properties | Stylelint | `BR-1392` |
| Off-scale spacing and font sizes | Stylelint | `BR-1329`, `BR-1317` |
| Hardcoded user-facing strings | Custom ESLint rule | `BR-1357` |
| Prohibited copy terms in i18n catalogs | Custom CI check | `BR-1365` |
| Missing Arabic key in a bilingual string | Custom CI check | `BR-524` |
| `!important` | Stylelint | `BR-1353` |
| `any`, `@ts-ignore`, type assertions | ESLint + tsconfig strict | `BR-1497` |
| `console.*` at merge | ESLint | `BR-1501` |
| Clickable non-semantic elements | eslint-plugin-jsx-a11y | `BR-1469` |
| Missing `aria-label` on icon buttons | eslint-plugin-jsx-a11y | `BR-1471` |
| Array index as React key | ESLint | `BR-1429` |
| `transition: all` | Stylelint | `BR-1493` |
| Bundle size budget | size-limit in CI | `BR-1486` |
| Core Web Vitals | Lighthouse CI | `BR-1486` |
| Contrast ratios | axe in CI | `BR-1216` |
| Blanket `"use client"` | Custom check | `BR-1502` |
| Unknown or unmaintained dependency | CI dependency audit | `BR-1468` |
| Endpoint not present in the contract | Generated client types | `BR-1447` |

### 19.1 Every Mechanism Is Proven By A Deliberate Violation

- `BR-1830` — **An enforcement mechanism is proven by a deliberate violation at the moment it is
  written, not when it is next needed.** Write the violation, watch the tool reject it, then
  remove it. A rule that loads without a configuration error is *not* a rule that works, and an
  unproven rule is worse than no rule: it buys confidence that nothing is checking.

  This is not hypothetical. Three of the mechanisms added at `PH-0.16` were **silently dead** when
  first written — each loaded cleanly, reported nothing, and enforced nothing. These are the
  shapes the failure takes, and they are worth recognising by sight:

  | Failure mode | What it looked like |
  |---|---|
  | **Tool API drift across a major** | `eslint-plugin-boundaries` v7 renamed `element-types` → `dependencies`, `rules` → `policies`, requires `{ element: { type } }` rather than bare `{ type }`, and switched to `{{ }}` templates. The v5 form loads without error and matches nothing. |
  | **Unresolvable module specifiers** | The same plugin then still matched nothing: it could not resolve nodenext `.js` specifiers onto `.ts` files, so every dependency resolved to `isUnknown`. Visible only with the plugin's own debug output. |
  | **Config merge replacing, not merging** | ESLint merges flat configs by **replacing** a rule's options. Two `no-restricted-syntax` blocks meant the later one silently deleted the earlier one's selectors. |
  | **Glob patterns that cannot match the input** | `no-restricted-imports` matches `group` patterns with minimatch, and `**` never crosses a leading `..`, so no glob catches `../../generated/prisma/client.js`. |

- `BR-1834` — **A tool with `--fix` authority is itself a source of defects.** Any autofixer in
  the pre-commit chain must have its **output asserted**, never its configuration. Configuration
  says what the tool was told to do; only the artifact says what it did.

  The case that produced this rule: `stylelint --fix` rewrote `@import 'tailwindcss'` into
  `@import url('tailwindcss')`. Tailwind's PostCSS plugin only processes the bare form, so the
  build succeeded, the pages rendered, and `lint`, `typecheck`, `test` and `build` were **all
  green** while the emitted stylesheet contained every design token and not one utility class —
  3,083 bytes where there should have been 14,399. Nothing failed. The site was simply unstyled.

  The shape to look for is a rewrite that stays **syntactically valid and semantically dead**.
  Auditing the rest of the chain against that description found a second instance immediately:
  `stylelint --fix` also rewrites `@media (min-width: 640px)` into `@media (width >= 640px)`,
  which is valid modern CSS unsupported on Safari < 16.4 and Chrome < 104 — where the query never
  matches and the responsive layout silently collapses to its base case.

  Two more were already disarmed and were re-verified rather than assumed:
  `@typescript-eslint/consistent-type-imports` (would erase a NestJS DI token — guarded since
  `PH-0.1`) and `no-unused-vars` (leaves side-effect imports alone). Prettier is
  semantics-preserving by design; its only real authority here is over `.md`, which is why the
  frozen specification documents are in `.prettierignore`.

- `BR-1836` — **Hardening a system can silence the monitoring that watches it.** A control and its
  detector are verified **together, after both are in place** — never separately, and never at the
  moment each is installed.

  Observed at `PH-0.7`. `AuthenticationMethods publickey` was set, which is correct. fail2ban was
  installed and its `sshd` jail reported `active`, which is also correct. But `sshd` now rejects at
  **preauth** and logs `Connection reset by authenticating user … [preauth]`, while the stock
  filter matches `Failed password` — a line the server no longer emits. **Eight deliberate failed
  logins moved the ban counter by zero.** Each step was individually right; the combination was
  inert, and `fail2ban-client status` reported health throughout.

  This is `BR-1830`'s shape in a new place: a mechanism that loads, reports healthy, and enforces
  nothing. It generalises past linters. The detector must be shown to **fire on the events the
  hardened system actually produces**, which for a log-watcher means matching real log lines
  (`fail2ban-regex`, matched-count > 0) and, ultimately, producing a real ban.

  The corollary is that **the order is a trap**: install the detector, verify it, harden, and the
  verification is now stale. Verify the detector **after** the hardening it is meant to survive.

- `BR-1839` — **A tool's error message names its own failure, not the system's.** When a diagnostic
  reports a definite cause, establish **what it actually attempted** before accepting the diagnosis.
  A confident wrong answer costs more than no answer, because it stops the search.

  Observed at `PH-0.11` execution. `ssh` resolved `host.docker.internal` to **IPv6 first** and
  reported `Connection refused` **instantly** — a definite, specific, actionable error — without
  ever attempting IPv4. `nc` against the same name reported the port **open**. Both were telling the
  truth about different things, and the authoritative-sounding one was answering a question nobody
  had asked. It cost most of an hour.

  The tell is two tools disagreeing about one address. The rule that follows: **believe the tool
  that completed a connection**, and force the variable the failing tool chose silently —
  `ssh -4` against `ssh -6`, `getent ahosts` to see the resolution order the library will use.

  Same family as `BR-1836`, one layer out. `BR-1836` is about a detector that reports health while
  detecting nothing; this is about a detector that reports a **specific failure** that is not the
  failure present. Both are trusted output that is not evidence, and both were found by testing the
  thing the output described rather than reading the output.

- `BR-1835` — **A test that passes on its first run is not yet evidence.** Make it fail
  deliberately — break the input, or break the code — and confirm it fails for the reason it
  claims to check, before trusting it.

  `BR-1830` already requires this of enforcement mechanisms. It applies to assertions generally,
  for the same reason and with the same failure mode: an assertion that cannot distinguish the
  thing it names is decoration. Observed at `PH-0.18`, where a timezone test compared Cairo
  against Tokyo — 21:30 UTC is the 30th in **both**, so the assertion was only ever true because
  of the clock and never the date it claimed to be testing.

- `BR-1837` — **Assert the effect, not the marker.** Where a behaviour can be observed either by
  the internal state that implements it or by the outcome a user would notice, the assertion is on
  the outcome. A test written against the marker passes on a component that sets the marker and
  does nothing with it — it agrees with the defect instead of catching it.

  Observed at `PH-0.26`. `TopBar`, `SideNav` and `BottomNav` implement roving focus: exactly one
  item carries `tabindex="0"` and the arrow keys move it. All three moved the `tabIndex` and **left
  focus where it was**, so `ArrowDown` in the sidebar visibly did nothing. The DOM was entirely
  correct — one tab stop, the right element marked — and the specs asserted *which element carried
  `tabindex="0"`*, which is precisely what the broken version got right. Three components, three
  green specs, one contract not met.

  It surfaced only because `Tabs` had the **opposite** bug — it restored focus after every keydown
  including `Tab`, trapping the user in the tablist — and that spec asserted `document.activeElement`,
  so it failed immediately. The assertion style, not the code, is what decided which defects were
  visible.

  Known pairs in this codebase, marker → effect:

  | Marker (do not assert) | Effect (assert this) |
  | ---------------------- | -------------------- |
  | `tabindex="0"` on the roving item | `document.activeElement` |
  | `aria-invalid` on a field | the message a screen reader would receive via `aria-describedby` |
  | a `focus()` call having been made | which element ends up focused |
  | a handler prop being passed | the submitted value, or the DOM change |
  | `aria-checked` after a pointer click | the value the form actually submits |

  Same shape as `PH-0.21`'s focus-first-error (`SB-19`), which passed for four tests on React Hook
  Form's built-in `shouldFocusError` — registration order, the very behaviour the code's comment
  called wrong — because the assertions never checked which field received focus. `BR-1835` says
  make the test fail first; this says make sure the thing it fails on is the thing that matters.

- `BR-1838` — **Verification that depends on generated state is not verification until it has run
  against a clean tree.** A build artifact that exists on the machine where a check was written
  hides every failure that depends on its absence, and no amount of running that check locally can
  reveal it.

  Observed at `PH-0.10`, CI run #2. `prisma generate` writes `apps/api/src/generated/`, which is
  gitignored. It ran once during `PH-0.6` and has existed on the development machine ever since,
  so `pnpm lint` passed there every time it was run. On a clean checkout the directory does not
  exist, `PrismaClient` resolves to an error type, and **every `no-unsafe-*` rule fires at once** —
  21 errors across three files, none of which had anything wrong with them.

  The critical property: **`pnpm lint` could not have caught this locally at any point.** It was
  not a check that was skipped, or a rule that was too weak. It was a check whose inputs were
  silently supplied by history.

  Two further instances surfaced the moment the question was asked of everything else generated:

  1. **`packages/tokens` and `packages/i18n` `dist/`.** `packages/ui` and `apps/web` resolve them
     through built output, also gitignored. Removing it produces 38 errors of the identical shape.
     CI passed only because `turbo run lint` builds them via `^build` and happened to run **before**
     `lint:hook`, which does not. Reordering two steps would have reproduced run #2 exactly. That
     is not a passing check; it is a failing check that has not been asked yet.
  2. **The build cache replayed a green result.** Turborepo hashes git-tracked files. The generated
     directory is ignored, so deleting it changed no cache key, and `pnpm lint` **replayed a cached
     PASS against a tree that could not lint**. A cache that does not know about an input cannot
     know the input is missing.

  A third instance arrived from the other direction at the same task, and generalises the rule past
  *generated* state to **unexercised** state. `renovate.json` was written, committed, reviewed and
  pushed without ever being run through Renovate's own validator. It contained `_comment` keys
  invented for readability; Renovate **rejects unknown keys rather than ignoring them**, so it
  opened a configuration-error issue, opened no dependency PRs, and stopped. The repository had a
  dependency policy that existed as a file and as nothing else.

  That failure is invisible from inside the repository. Every gate stayed green — the file is valid
  JSON, prettier formats it, nothing imports it — while the mechanism it configures did nothing at
  all. It is `BR-1830`'s shape in a config file: loaded, apparently healthy, enforcing nothing. The
  fix is the same one: `renovate-config-validator` runs in CI, and fitness case **37** puts the
  rejected key back and requires the build to fail.

  What follows:

  - **If a tool ships a validator, it runs in CI, and it is proven to reject.** Both halves are
    required. A validator nobody has watched fail is the same unexercised state one level further
    out — `renovate-config-validator` was added and fitness case **37** puts the rejected key back,
    because "we run the validator" and "the validator works" are different claims. If a tool ships
    no validator, the config is exercised some other way before it is trusted.

  **Four instances of one class**, which is why this is a rule and not an anecdote: three silently
  dead fitness functions (`PH-0.16`), a stylelint autofix that disabled Tailwind (`PH-0.17`), the
  Prisma client supplied by local history (`PH-0.10`), and a Renovate config nothing had ever
  parsed (`PH-0.10`). In every one the gates were green and the mechanism was doing nothing.
  - Generated artifacts are produced by **installing**, not by remembering to run a command.
    `prisma generate` belongs in `postinstall`, so "installed" implies "generated" in CI, in a
    clean clone, in the Docker image and in an editor. A CI-only step fixes CI and leaves the
    clean clone broken, which is the divergence that caused this.
  - Every generated artifact is **declared to the build system** with its inputs and outputs, so
    the cache can neither miss its absence nor replay around it.
  - A pipeline step that produces generated inputs produces **all** of them. One that produces some
    is the same defect wearing a reassuring label.
  - The check is: delete every gitignored build artifact, then run the full verification. Anything
    that fails was never being verified.

- `BR-1841` — **A check with a WRONG expected value is worse than no check at all.**

  An absent check reports nothing, and everybody knows it reports nothing. A check with a wrong
  expectation **manufactures a defect that does not exist**, and it does so with all the authority of
  a verification step — so the failure is not merely uninformative, it is actively misleading, and it
  arrives attached to an instruction to go and fix something that is already correct.

  **Worked example — `PH-0.9`, 2026-07-30.** The runbook verified `BR-879` (the Node heap ceiling sits
  below the container limit) by reading `heap_size_limit` from the running process and expecting
  `≈ 512`, matching `--max-old-space-size=512`. The process reported **560**, which is the **correct**
  value: the flag sizes the **old generation**, while `heap_size_limit` reports the total heap and adds
  the young generation on top — roughly 10%.

  **Follow what the wrong expectation would have caused.** A reader sees 560 against an expected 512,
  concludes the setting did not take, and applies the obvious repair: raise `--max-old-space-size`
  until the reported number matches. To make `heap_size_limit` read 512 the flag must drop; to make
  the two agree upward, the flag rises past 640 — **above the container limit**. That is `BR-879`
  exactly inverted, and it re-creates the precise condition the check exists to prevent: the process
  is now kernel-killed with no stack trace instead of throwing a heap error.

  > **A wrong expected value can turn a passing safety check into an instruction to disable the
  > safety.** That is the failure mode, and it is why this is worse than the check being absent.

  **The rule: assert the RELATIONSHIP, not the number.** What `BR-879` requires is an ordering, so the
  assertion is the ordering:

  ```
  max-old-space-size  <  heap_size_limit  <  container limit
  ```

  A number in an expectation is a claim about the implementation, and implementations add young
  generations, round to page sizes, and reserve overhead. An invariant is a claim about the property
  actually being protected, and it survives all of that. Where a check can assert either, assert the
  invariant — the same instinct as `BR-1837`, one layer further out: there, assert the effect rather
  than the marker; here, assert the property rather than the reading.

  **Corollary.** A verification step whose expected value was written from the configuration rather
  than observed from a correct run has never been validated. `BR-1835` requires seeing a test fail for
  the right reason; this requires seeing it **pass** for the right reason, which is the same demand
  from the other side and is the one usually skipped.

- `BR-1842` — **A task's dependency order must be consistent with its tables' foreign-key
  direction.** A dependency graph derived from **feature grouping** rather than from **data
  structure** will contain cycles, and the symptom surfaces at seed time in a task that looks
  unrelated to the one that is actually wrong.

  **Worked example — `PH-1.1` / `PH-1.7`, 2026-07-30.** `16` grouped tasks by feature: identity
  first, permissions second. That is the right order for a human reading the plan. But
  `10 §TBL-001` declares `users.role_id NOT NULL REFERENCES roles(id)`, and `roles` lived in the
  permissions task — which depended on the identity task. The graph was circular, and `PH-1.1`'s own
  output (_seeds run_) was unachievable inside its own scope.

  **The failure mode is what makes this worth a rule.** The migration would have **succeeded** — an
  ORM orders `CREATE TABLE` correctly within a single migration, so nothing complains while the
  tables are empty. The failure appears only when the first row is inserted, as a foreign-key
  violation during seeding, **three tasks after the ordering decision that caused it**, and it reads
  as a bad seed script. The distance between the defect and its symptom is the cost.

  **The check is mechanical and belongs before the phase, not inside each task:** for every table a
  task creates, every `REFERENCES` target must be created by that same task or an earlier one.
  Running it once across a phase is cheap; discovering it per-task is not, because by then the
  earlier tasks are committed and the fix is a re-ordering rather than an edit.

  In this repository it is `scripts/check-fk-order.mjs` (`pnpm check:fk-order`), which derives the
  task→table map from `16`'s own `Schema:` rows and the foreign keys from `10`, so it compares two
  documents rather than a document against a hand-written list. Proven by fitness case 43.

  **Corollary.** A table with no foreign keys is the only kind that can be moved freely between
  tasks. When a cycle is found, look for the leaf — it is usually the only legal fix, and it is
  usually obvious once the graph is drawn from the data rather than from the feature names.

- `BR-1844` — **A task runner that filters the environment will hide a missing variable behind a
  local dotenv file.** Declare every variable a task needs to the runner, and verify by running
  with the dotenv file MOVED ASIDE.

  **Worked example — `PH-1.1` to `PH-1.4`, 2026-07-30.** `turbo.json` declared no `env` keys.
  Turbo 2 runs tasks in strict env mode: a task receives only what is declared, and undeclared
  variables are removed from the task environment entirely — not merely excluded from the cache
  key, which is what the option looks like it does.

  Locally this was **undetectable**. `apps/api/.env` exists and the vitest setup loads
  `dotenv/config`, so the values arrive inside the test process from the file and never travel
  through the task runner. CI has no `.env`, so the same suites read the process environment,
  where the runner had already stripped them. **Every local gate passed and CI was red for four
  consecutive tasks.**

  **The check is to run the suite with the dotenv file moved aside and the variables supplied
  only through the process environment, with the runner's cache forced off.** Both halves matter:
  without moving the file you test dotenv, and without forcing the cache you may replay a green
  result computed under different conditions.

  Same family as `BR-1838` — verification that depends on state a clean environment does not
  produce. There, generated files; here, environment variables. The tell is identical: *the local
  gate could not have caught it at any point*, so its passing was never evidence.

  **Corollary, and it is the expensive half.** Four tasks were reported done on a green local gate
  while the authoritative check was red. `BR-1761` says a task is done when its Output exists and
  CI is green. When CI cannot be observed from where the work happens, the task **stops** and
  somebody who can see it looks. "Committed and pushed" is a description of an action, never of a
  result.

- `BR-1831` — The deliberate-violation suite is **committed and executed by CI**, not run once and
  described. A proof that only re-runs when somebody remembers is not a safety net. In this
  repository it is `scripts/verify-fitness.sh` (`pnpm verify:fitness`), wired into CI at `PH-0.10`.

- `BR-1832` — At Phase 0 exit the suite is **re-run, not re-read**. The exit criterion is satisfied
  by observed output, never by the record of a previous run (`BR-1768`).

- `BR-1833` — A check in `§19` that is not yet active is recorded against **the specific task that
  activates it**. "Deferred" without a named task is indistinguishable from forgotten, and the
  exit count must reconcile against the full table rather than against whatever happens to be
  switched on.

  **Worked example — this ledger failed its own rule.** Row 15, Core Web Vitals, was recorded
  against `PH-0.11`, because Lighthouse CI needs a deployed URL and `PH-0.11` was the task that
  produced one. `PH-0.11` completed on 2026-07-30 **without adding it**. The row was then pointing
  at a task that had already closed, and it survived that way until the Phase 0 exit reconciliation
  read the table row by row instead of trusting its own summary line.

  This is worse than an unowned row, and the reason is the failure mode rather than the arithmetic:
  a row naming a completed task **reads as scheduled**. An empty owner column invites the question
  "who does this?"; `PH-0.11` answers it, wrongly, and the reader moves on. The check would never
  have been done by anyone, and nothing would ever have said so.

- `BR-1840` — A deferral names a task that **has not started**. Recording a check against a task
  that is in progress, or already complete, produces an owner that cannot act, and `BR-1833`'s
  requirement is then satisfied on paper while nothing is scheduled. When the task a check was
  waiting on closes without it, the check is **re-owned in that task's closing commit** — not left
  to be discovered later.

  The corollary is that reconciliation reads the **rows**, never the score line. The score line that
  hid row 15 also claimed three rows were deferred that had been active since `PH-0.30`; it had been
  written once and never recomputed. Same family as `BR-1832` — re-run, do not re-read.

- `BR-1522` — A failing check blocks merge. It is never downgraded to a warning to unblock work.
- `BR-1523` — When a defect escapes to production, the first question is which automated check would have caught it — and that check is added.

---

## 20. Shared Component Library

### 20.1 Principle

> **Nothing in this product is a default control.**

No raw `<input>`, `<select>`, `<button>`, `<table>`, or `<textarea>` appears in a feature file. Every visible element comes from `packages/ui`. This is not stylistic preference — it is the only way `§17` stays true at scale. A rule enforced inside a component cannot be forgotten by the next person who builds a screen.

- `BR-1524` — Feature code imports from `@josam/ui` only. A native form control or a third-party visual component in a feature file fails the build.
- `BR-1525` — A component is added to the library the **second** time an element is needed, not the third. Duplication in UI drifts faster than in logic.
- `BR-1526` — No second component may exist for the same purpose (`BR-1350`).

---

### 20.2 `DEC-39` — Radix as an Unstyled Behavior Layer

**Custom does not mean rebuilt from scratch.**

Focus trapping, roving tabindex, typeahead in listboxes, popover collision handling, and composite ARIA wiring are problems that take years to get right — and `§17.21` makes them mandatory, not optional.

| Layer | Source | Who owns it |
|---|---|---|
| Behavior, keyboard, ARIA, focus management | **Radix Primitives** (headless) | Library |
| Visual design, tokens, layout, motion | **Us** | Josam |
| Component API, prop names, variants | **Us** | Josam |
| Arabic / RTL behavior | **Us** | Josam |

**Built entirely by us** — no headless base exists for these: `RailSpine`, `GoalHorizon`, `VideoPlayer`, `ChapterRail`, `SyncedNotes`, `BlockEditor`, `CurriculumTree`, `AIPanel`, `PermissionMatrix`.

**Rules:**
- `BR-1527` — Radix ships **zero** styles. Every visual decision is ours, derived from tokens.
- `BR-1528` — Radix is never exposed to feature code. It is an implementation detail behind our component, so it can be replaced without touching a screen.
- `BR-1529` — A component built on Radix still owns its RTL behavior explicitly. Headless libraries handle direction inconsistently.

---

### 20.3 Component Contract

A component is not accepted until **all seven** hold. This is the `§18` gate at component scale.

```
1  Props are type-constrained — no free strings for size, color, or spacing
2  Variants and sizes are a closed set, not open props
3  All five interaction states implemented: default · hover · focus-visible
   · disabled · loading
4  Accessibility contract documented: role · aria · keyboard map
5  RTL behavior documented and verified in both directions
6  If it renders data: loading, empty, and error states exist
7  Storybook story covering every variant and every state
```

- `BR-1530` — A component without a Storybook story covering all states is not merged.
- `BR-1531` — Every component's keyboard map is documented in its story. Undocumented keyboard behavior does not exist.
- `BR-1532` — Every component is reviewed in Arabic RTL and English LTR before merge (`BR-1401`).

---

### 20.4 `DEC-40` — Type-Constrained Primitives

The most effective enforcement is making the violation **unwritable**.

```ts
// Prohibited by the type system, not by review:
<Text size="19px" color="#E8B04B" />        // ✗ does not compile
<Stack gap={13} />                           // ✗ does not compile

// The only valid form:
<Text size="sm" tone="secondary" />
<Stack gap="4" />
```

| Primitive | Constrains | Enforces |
|---|---|---|
| `Text` | Size to the type scale, tone to semantic token names | `BR-1317`, `BR-1342` |
| `Heading` | Levels 1–4, one `h1` per page | `BR-1472` |
| `Stack` / `Inline` | Gap to the spacing scale | `BR-1329` |
| `Grid` | Columns and gap to the scale | `BR-1329` |
| `Box` | Padding, radius, border, surface to tokens | `BR-1342` |
| `Icon` | One library, fixed sizes, fixed stroke | `BR-1487` |
| `Surface` | Background and border to token pairs | `BR-1345` |

- `BR-1533` — The primitive layer accepts token keys only. Arbitrary CSS values are a compile error.
- `BR-1534` — Feature components compose primitives. Writing raw CSS in a feature file requires a documented exception.

---

### 20.5 `DEC-41` — `QueryBoundary` Is Mandatory

`BR-1416` (the state matrix) is the rule most likely to be forgotten under deadline. So it is made **structurally impossible to skip**.

```tsx
<QueryBoundary
  query={studentsQuery}
  loading={<TableSkeleton rows={8} />}
  empty={<EmptyState
           title="مفيش طلاب لسه"
           body="أول ما حد يشتري كورس هيظهر هنا"
           action={<Button>ادعُ طالب</Button>} />}
  error={(err, retry) => <ErrorState error={err} onRetry={retry} />}
>
  {(students) => <StudentsTable data={students} />}
</QueryBoundary>
```

- `BR-1535` — Data is never rendered outside a `QueryBoundary`. Direct rendering from a query result fails lint.
- `BR-1536` — `loading`, `empty`, and `error` are **required props**. Omitting one is a type error.
- `BR-1537` — The `error` render receives a `retry` that re-runs the failed request only — never a page reload (`BR-1418`).
- `BR-1538` — `QueryBoundary` preserves previously loaded data during background refresh and during error (`BR-1418`).

---

### 20.6 Architectural Components

Not visual — but they are what keep every screen correct.

| Component | Purpose | Enforces |
|---|---|---|
| `<Can do="update" on={course}>` | Renders children only if `_can` permits | `BR-1457` |
| `<Reason of={lesson}>` | Renders `_reason` message + action; renders **nothing** for `PERMISSION_ABSENT` | `BR-1420` |
| `<QueryBoundary>` | Forces the state matrix | `BR-1535` |
| `<T value={course.title} />` | Renders a bilingual `jsonb` field in the active locale with Arabic fallback | `BR-1109`, `BR-524` |
| `<Bidi>` | Isolates Latin runs inside Arabic text automatically | `BR-1393` |
| `<Money amount={} currency={} />` | Minor units → localized string, tabular figures | `BR-826`, `BR-1428` |
| `<Num>` `<Percent>` `<Duration>` | Locale-correct numerals, `mm:ss` formatting | `BR-1226` |
| `<When at={} />` | Absolute or relative time in the learner's timezone | `BR-825` |
| `<CopyableId>` | Entity ID, LTR-isolated, copy on click | `BR-1506` |
| `<Confirm>` | Requires a `consequence` prop — cannot render "Are you sure?" | `BR-1361` |

- `BR-1539` — `<Can>` is the **only** permitted conditional for permission-based rendering. Role comparisons in JSX fail lint (`BR-1457`).
- `BR-1540` — `<Confirm>` requires `consequence` as a mandatory prop. A confirmation without a stated outcome cannot be written.

---

### 20.7 Form Components

Every field wraps in `FormField`, which owns the label, hint, required marker, error, and ARIA wiring (`BR-1402`–`BR-1406`).

| Component | Notes |
|---|---|
| `Form` | Dirty tracking, submit lock, focus-first-error, leave warning (`BR-1406`, `BR-1412`, `BR-1415`) |
| `FormField` | label · hint · required · error · `aria-describedby` · `aria-invalid` |
| `TextField` | Prefix/suffix slots, character counter |
| `TextArea` | Auto-grow, counter, max length |
| `PasswordField` | Show/hide, password-manager compatible (`BR-1414`) |
| `NumberField` | Locale-aware, no letters, no spinner artifacts |
| `CurrencyField` | Minor units in, formatted out, currency selector (`BR-826`) |
| **`PhoneField`** | Country selector, E.164 normalization, always LTR (`BR-1396`) |
| **`EmailField`** | Always LTR, inline domain suggestions, `autocomplete="email"` |
| **`OTPField`** | 6 segments, auto-advance, paste distribution, auto-submit |
| `SearchField` | Debounced, cancels superseded requests, clear action (`BR-1451`) |
| `Select` | Radix Select — custom styling, keyboard typeahead |
| `Combobox` | Async search, loading state inside the list |
| `MultiSelect` | Chips, overflow counter, keyboard removal |
| `RadioGroup` | Standard radios |
| **`RadioCard`** | Visual choice cards — the onboarding pattern (`SCR-12`) |
| `Checkbox` / `Switch` | Label click activates (`BR-1402`) |
| `Slider` | Weekly commitment input |
| `DatePicker` | RTL calendar, Arabic month names, optional Hijri display (`DEC-12`) |
| **`DurationField`** | `mm:ss` entry, not raw seconds |
| **`TimestampField`** | Captures the current player position — the Lesson Notes core (`FEAT-054`) |
| `TagsInput` | Course tags, interests |
| `RatingInput` | Star rating for reviews |
| `CodeField` | Monospace, LTR, syntax hinting |
| **`FileDrop`** | Drag-and-drop or browse, type and size validation **before** selection, progress, cancel (`BR-1413`) |
| **`ImageDrop`** | `FileDrop` + preview, crop, aspect enforcement |
| **`VideoUploader`** | Direct-to-provider, chunked, resumable, transcoding status (`BR-1173`) |

- `BR-1541` — No field is used outside `FormField`. A bare field fails lint.
- `BR-1542` — `PhoneField`, `EmailField`, `CodeField`, `CurrencyField`, and `NumberField` render LTR regardless of interface direction (`BR-1396`).
- `BR-1543` — `FileDrop` states accepted types and size limits **before** the picker opens, and validates by MIME type, not extension (`BR-1467`).
- `BR-1544` — Every field supports `readOnly` and `disabled` distinctly, and `disabled` always carries a reason (`BR-1347`).

---

### 20.8 Data Display

| Component | Notes |
|---|---|
| `DataTable` | Server-driven, URL-synced, column priority, sticky header, stable keys |
| `TableToolbar` | Search, filters, count, actions |
| `FilterBar` / `FilterChip` | Active filters visible and individually removable |
| `SortControl` | Direction indicator mirrors with direction (`BR-1394`) |
| `ColumnPicker` | Show/hide, persisted per user |
| `BulkActionBar` | States exact count and scope (`BR-1426`) |
| `Pagination` | Arrows mirror; page size persists (`BR-1425`) |
| `DescriptionList` | Key–value display, used across admin detail views |
| `StatCard` / `KpiCard` | Requires `period` and `comparisonBasis` props (`BR-1431`) |
| `Chart` | Zero-baseline default, labeled axes, explicit units (`BR-1433`) |
| `Timeline` | Audit and entitlement history |
| `Skeleton` variants | `SkeletonText` · `SkeletonCard` · `SkeletonRows` — dimension-matched (`BR-1417`) |

- `BR-1545` — `KpiCard` cannot render without `period`. A metric without a time window is meaningless (`BR-1431`).
- `BR-1546` — `DataTable` requires a `rowKey` accessor. Index-based keys are a type error (`BR-1429`).
- `BR-1547` — `DataTable` requires a `columnPriority` map so small-screen behavior is decided at definition time, not discovered later (`BR-1421`).

---

### 20.9 Layout, Navigation, Feedback

**Layout & navigation:** `AppShell` · `TopBar` · `SideNav` · `BottomNav` · `PageHeader` · `PageFooter` · `SectionHeader` · `Breadcrumb` · `Tabs` · `Stepper` · `BackLink` · `SkipLink` · `CommandPalette`

**Feedback:** `Toast` · `ToastProvider` · `InlineAlert` · `Dialog` · `ConfirmDialog` · `Drawer` · `Sheet` · `Popover` · `Tooltip` · `DropdownMenu` · `ContextMenu` · `Spinner` · `ProgressBar` · `ProgressRing` · `EmptyState` · `ErrorState` · `OfflineBanner` · `ReadOnlyBanner` · `MaintenanceBanner`

- `BR-1548` — `PageHeader` owns the single `h1`, breadcrumb, and primary action slot. Screens never render their own `h1` (`BR-1472`, `BR-1313`).
- `BR-1549` — `PageHeader` accepts exactly one `primaryAction`. A second primary action is a type error (`BR-1313`).
- `BR-1550` — `Toast` supports an optional `undo` action and a minimum 6-second lifetime; it never asks a question (`BR-1377`).
- `BR-1551` — `EmptyState` requires an `action` prop. An empty state without a way out is not permitted (`BR-1363`).
- `BR-1552` — `Dialog` traps focus, closes on `Escape`, returns focus to the trigger, and warns on dirty close (`BR-1470`, `BR-1372`).
- `BR-1553` — `CommandPalette` exposes every admin destination by keyboard, serving `MET-06`.

---

### 20.10 Product Components

Built entirely in-house. These are the product.

| Group | Components |
|---|---|
| **Rail** (`DEC-32`) | `RailSpine` · `RailNode` · `RailConnector` · `GoalHorizon` · `ChapterRail` |
| **Learning** | `ContinueCard` · `CourseCard` · `LessonRow` · `LockedLessonRow` · `StreakBadge` · `WeekStrip` · `MilestoneToast` · `AchievementItem` |
| **Player** | `VideoPlayer` · `PlayerControls` · `ChapterList` · `SyncedNotes` · `NoteComposer` · `ResourceCue` · `WatermarkLayer` |
| **AI** | `AIPanel` · `MessageBubble` · `CitationChip` · `QuotaMeter` · `StreamingText` · `OutOfScopeCard` |
| **Assessment** | `QuizShell` · `QuestionMcqSingle` · `QuestionMcqMulti` · `QuestionTrueFalse` · `QuestionFillBlank` · `QuestionEssay` · `QuizResult` · `ReviewItem` |
| **Certification** | `CertificateCard` · `VerificationLookup` · `ShareRow` |
| **Commerce** | `PriceTag` · `ProductCard` · `EntitlementList` · `CheckoutSummary` · `CouponField` · `FawryReference` |
| **Protection** | `DeviceCard` · `TransferRequestCard` · `EvidencePanel` · `AbuseFlagCard` |
| **Admin** | `AttentionQueue` · `AttentionRow` · `QueueCard` · `PermissionMatrix` · `BlockEditor` · `CurriculumTree` · `EntitlementComposer` · `ApprovalCard` |

- `BR-1554` — `RailNode` implements exactly four states, each distinguishable without color (`BR-1211`).
- `BR-1555` — `LockedLessonRow` renders title and duration at full legibility and requires an `unlockCondition` prop (`BR-1212`, `BR-1255`).
- `BR-1556` — `VideoPlayer` is always dark-themed and requests its own playback token; it never accepts a URL as a prop (`BR-1248`, `BR-1139`).
- `BR-1557` — `WatermarkLayer` is a provider-rendered surface. A client-side overlay component is prohibited (`BR-374`).
- `BR-1558` — `QuizResult` cannot render the word "failed" — the outcome vocabulary is a closed set: `passed` · `close` · `needs_review` (`BR-1147`).
- `BR-1559` — `StreamingText` renders progressively with a visible indicator (`BR-1254`).
- `BR-1560` — `EntitlementComposer` previews exactly what a buyer receives, generated from the same source as the public product page (`BR-1179`).

---

### 20.11 API & Naming Conventions

```tsx
// Variants are closed sets
<Button variant="primary | ghost | danger | subtle" size="sm | md | lg" />

// Booleans read as state
<Button isLoading isDisabled />

// Slots, not children-guessing
<PageHeader title={} breadcrumb={} primaryAction={} meta={} />

// Data components take data, never fetch
<StudentsTable data={students} onSort={} />
```

- `BR-1561` — Variants and sizes are closed unions. `variant="custom"` does not exist.
- `BR-1562` — Boolean props use `is` or `has` prefixes.
- `BR-1563` — Presentational components never fetch. Data arrives as props (`BR-1496`).
- `BR-1564` — No component exceeds 8 props. Beyond that it is split by use case (`BR-1351`).
- `BR-1565` — Components accept `className` for spacing context only, never for restyling internals.
- `BR-1566` — Every component name says what it is. `LockedLessonRow`, not `Row2` (`BR-1352`).

---

### 20.12 Build Sequence

Components are built in three waves, each preceding the screens that need it.

| Wave | Contents | Count | Precedes |
|---|---|---:|---|
| **1 — Foundation** | Primitives · architectural · forms · buttons · layout · navigation · feedback | 69 | Any screen |
| **2 — Data & Learning** | Tables · filters · dialogs · state components · rail · learning cards | 44 | Phase 2–3 |
| **3 — Specialized** | Player · block editor · curriculum tree · AI · assessment · admin queues | 28 | Phase 4–5 |
| | **Total** | **134** | |

- `BR-1567` — No screen is built before its wave's components exist. Building a screen first and extracting components later is how design systems die (`BR-1355` applies to logic, not to UI foundations).
- `BR-1568` — Wave 1 is a prerequisite for Phase 1 completion in `15-implementation-roadmap.md`.

#### 20.12.1 Wave 1 Roster — resolved 2026-07-28

Wave 1 is **exactly** the 69 components enumerated in `16-task-breakdown.md`, tasks `PH-0.17`
through `PH-0.27`. That enumeration is authoritative; where this document and `16` disagreed on
the count, `16` won (`SB-04`).

| Task | Components | Count |
|---|---|---:|
| `PH-0.17` | `Text` `Heading` `Stack` `Inline` `Grid` `Box` `Icon` `Surface` | 8 |
| `PH-0.18` | `T` `Bidi` `Money` `Num` `Percent` `Duration` `When` `CopyableId` | 8 |
| `PH-0.20` | `Button` `IconButton` | 2 |
| `PH-0.21` | `Form` `FormField` | 2 |
| `PH-0.22` | `TextField` `TextArea` `PasswordField` `NumberField` `CurrencyField` `CodeField` | 6 |
| `PH-0.23` | `PhoneField` `EmailField` `OTPField` | 3 |
| `PH-0.24` | `Select` `Combobox` `MultiSelect` `RadioGroup` `RadioCard` `Checkbox` `Switch` `Slider` `TagsInput` `RatingInput` | 10 |
| `PH-0.25` | `DatePicker` `DurationField` `TimestampField` `FileDrop` `ImageDrop` | 5 |
| `PH-0.26` | `AppShell` `TopBar` `SideNav` `BottomNav` `PageHeader` `PageFooter` `Breadcrumb` `Tabs` `SkipLink` | 9 |
| `PH-0.27` | `Toast` `InlineAlert` `Dialog` `ConfirmDialog` `Drawer` `Popover` `Tooltip` `DropdownMenu` `Skeleton` `ProgressBar` `ProgressRing` `EmptyState` `ErrorState` `OfflineBanner` `ReadOnlyBanner` `QueryBoundary` | 16 |
| | **Wave 1 total** | **69** |

#### 20.12.2 Reassigned out of Wave 1

Every component named in `§20.4` – `§20.9` that has no Phase 0 task, with where it goes and why.

| Component | Reassigned to | Reason |
|---|---|---|
| `Can` | **Phase 1** (`PH-1.11`) | Renders from `_can`, which does not exist until the capability interceptor ships. |
| `Reason` | **Phase 1** (`PH-1.11`) | Renders `_reason`; same dependency as `Can`. |
| `SearchField` | Wave 2 | Belongs with `DataTable` / `TableToolbar` search (`PH-3.8`); no Phase 0 consumer. |
| `CommandPalette` | Wave 2 | Serves admin navigation (`PH-3.7`, `MET-06`); no Phase 0 surface to navigate. |
| `SectionHeader` | Wave 2 | Only needed once admin detail views exist (`PH-3.8`). |
| `BackLink` | Wave 2 | Depends on route history that no Phase 0 screen has. |
| `Stepper` | Wave 2 | First consumer is the onboarding flow (`PH-4.2`). |
| `Sheet` | Wave 2 | Mobile-pattern variant of `Drawer`; no Phase 0 consumer. |
| `ContextMenu` | Wave 2 | First consumer is `CurriculumTree` (`PH-2.4`). |
| `Spinner` | Wave 2 | Phase 0 loading is carried by `Skeleton` (`BR-1417`) and `Button isLoading`. |
| `MaintenanceBanner` | Wave 2 | Operational surface; ships with the admin shell (`PH-3.7`). |
| `VideoUploader` | Wave 3 | Direct-to-provider upload (`PH-2.6`); depends on `VideoProvider`. |

**Folded, not reassigned** — these are naming duplicates, not additional components (`BR-1526`):

| Named in | Delivered by | Note |
|---|---|---|
| `Confirm` (`§20.6`) | `ConfirmDialog` (`PH-0.27`) | One component. It carries the mandatory `consequence` prop of `BR-1540`. |
| `ToastProvider` (`§20.9`) | `Toast` (`PH-0.27`) | The provider is `Toast`'s required infrastructure, not a separate deliverable. |

- `BR-1812` — Wave 1 is closed at these 69 components. A component not on this roster is not built
  in Phase 0, regardless of how convenient it would be (`§17.2` scope discipline).
- `BR-1813` — The Wave 2, Wave 3, and 134 totals in `§20.12` predate this reconciliation and have
  not been recounted. A full census of `§20` enumerates **151** distinct component names. The
  remaining wave counts are corrected in a separate, founder-authorised pass; nothing in Phase 0
  depends on them.

---

### 20.13 `DEC-42` — Storybook as the Contract Surface

Storybook is not documentation. It is where the component contract is proven.

- `BR-1569` — Every component ships a story per variant, per size, and per state.
- `BR-1570` — Every story renders in both themes and both directions via toolbar toggles.
- `BR-1571` — Accessibility checks run on every story in CI (`a11y` addon + axe).
- `BR-1572` — Visual regression snapshots are captured per story; unexpected diffs block merge.
- `BR-1573` — A component's keyboard map and RTL notes live in its story, not in a separate document that will go stale.

---

### 20.14 `DEC-43` — Package Structure

```
packages/ui/
├── primitives/        Text · Heading · Stack · Grid · Box · Icon · Surface
├── architectural/     Can · Reason · QueryBoundary · T · Bidi · Money · When
├── form/              Form · FormField · all field components
├── data/              DataTable · filters · charts · skeletons
├── layout/            AppShell · PageHeader · navigation
├── feedback/          Toast · Dialog · states · banners
├── product/           rail · learning · player · ai · assessment · commerce · admin
├── tokens/            re-exported from packages/tokens
└── index.ts           public surface
```

- `BR-1574` — Only `index.ts` is importable. Deep imports into internals fail lint, so internal structure can change freely.
- `BR-1575` — `packages/ui` has no dependency on any app. It is consumed by web, admin, and mobile alike.
- `BR-1576` — Mobile shares `primitives`, `architectural`, and `product` logic; only rendering adapters differ (`BR-928`).

---

## 21. Open Questions

| ID | Question | Blocking | Owner |
|---|---|---|---|
| `OQ-21` | Certificate PDF layout — portrait or landscape, and does it carry a QR code prominently or discreetly? | `16-task-breakdown` | Founder |
| `OQ-22` | Should the dashboard's week strip start Saturday (regional norm) or follow the learner's locale? Currently Saturday by default, user-overridable (`BR-550`). | `12` finalization | Founder |

---

## 22. Approval

| Item | Status |
|---|---|
| **Every UI element is a custom shared component (§20)** | ☐ Approved |
| Radix UI as an unstyled behavior layer (`DEC-39`) is accepted | ☐ Approved |
| Type-constrained primitives (`DEC-40`) are accepted | ☐ Approved |
| `QueryBoundary` mandatory for all data rendering (`DEC-41`) is accepted | ☐ Approved |
| Component contract (`§20.3`) gates every component | ☐ Approved |
| The 134-component inventory is complete | ☐ Approved |
| Three-wave build sequence (`§20.12`) is accepted | ☐ Approved |
| **Frontend Implementation Standard (§17) is binding on all contributors, human and AI** | ☐ Approved |
| The prohibited-pattern list (`DEC-38`, §17.2) is accepted | ☐ Approved |
| The state matrix (§17.14) is mandatory for every data screen | ☐ Approved |
| The Definition of Done (§18) gates every screen | ☐ Approved |
| Automated enforcement (§19) blocks merge on failure (`BR-1522`) | ☐ Approved |
| Performance budgets measured on mid-range Android over 4G (`BR-1486`) | ☐ Approved |
| Prohibited fixes list (`BR-1512`) is binding | ☐ Approved |
| The rail as signature motif (`DEC-32`) is accepted | ☐ Approved |
| Dark and light palettes as independent designs are correct | ☐ Approved |
| Gold reserved for primary action, current position, and achievement | ☐ Approved |
| Arabic-led type pairing (`DEC-33`) is accepted | ☐ Approved |
| Readex Pro + IBM Plex Sans Arabic + JetBrains Mono is accepted | ☐ Approved |
| Western digits as default with Arabic-Indic optional is accepted | ☐ Approved |
| RTL rules including LTR player controls are correct | ☐ Approved |
| 72-screen inventory is complete | ☐ Approved |
| Dashboard layout and block order are correct | ☐ Approved |
| Player layout with synced notes is correct | ☐ Approved |
| Locked, failed-quiz, and expired state designs are correct | ☐ Approved |
| Operations dashboard layout is correct | ☐ Approved |
| Tailwind with custom tokens, no component framework (`DEC-34`) | ☐ Approved |
| Arabic-first design process (`DEC-36`) is accepted | ☐ Approved |

**Next document:** `13-tech-stack.md` — final tool selection with versions, justification for each choice, alternatives rejected, and the complete dependency inventory.

---

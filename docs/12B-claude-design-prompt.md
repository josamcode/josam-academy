# 12B — Claude Design Prompt Pack

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Document** | 12B — Claude Design Prompt Pack |
| **Version** | 1.0 |
| **Last Updated** | 2026-08-19 |
| **Depends On** | `12-ui-ux-design.md`, `12A-design-system-corrections.md` |
| **Purpose** | Generate reference screen designs in Claude Design that are correct against the spec, not decorative |

---

## How to use this pack

1. Open **claude.ai/design** → create a project named **Josam Academy — Design System**.
2. Paste **PROMPT 0 (Master Brief)** as the first message. Do not skip it — every later prompt assumes it.
3. Then paste **one screen prompt at a time**, in order. Order matters: `PROMPT 1` establishes the
   foundations the rest reuse.
4. After each screen, export the HTML and save it to the project folder as
   `design/SCR-XX-<name>.html`. These are **reference designs**, not production code —
   `BR-1581` applies to them exactly as it applies to `josam-prototype.html`.
5. Review each output against the rejection checklist at the end of this document before saving it.

---

# PROMPT 0 — Master Brief

> Paste this once, first, into a fresh Claude Design project.

```
You are designing screens for Josam Academy, an Arabic-first e-learning platform for Egyptian and
Arab learners who want to become employable software developers. I will give you one screen per
message. This message is the system you must follow for all of them.

## The product thesis

"The interface is a path, not a library."

Every learning platform looks like a content catalog: card grids, a video sidebar, a percent bar.
Josam Academy is built on the opposite claim — people fail from missing structure, not missing
content. Three consequences bind every screen:

1. The path is always visible. Locked content renders at FULL text legibility, ahead on the same
   rail. Never hidden, never greyed into illegibility. A lock is a state, not a redaction.
2. Distance to the goal, not percentage. The primary metric is DAYS REMAINING toward the learner's
   target date, not "62% complete". The date is what changes behaviour.
3. One next action. Every screen has exactly one visually dominant action. Secondary actions are quiet.

## The signature motif: the Rail

One motif, three scales. This is what the product is remembered by. Four node states, each
distinguishable WITHOUT relying on color:

  done       filled node
  current    ringed node with a halo
  available  hollow node
  locked     hollow node with a DASHED connector

  DASHBOARD — goal horizon (a horizontal rail)
    start ●━━━━━━━━━━━●(you are here)─ ─ ─ ─ ─ ○ 15 September

  COURSE — curriculum spine (a vertical rail)
    ● Introduction                          done
    ● Core Components                       done
    ◉ State Management     12:30 / 19:00    ← you are here
    ○ Effects and Lifecycle                 unlocks next
    ○ ─ Custom Hooks                        unlocks after the quiz

  PLAYER — chapter rail (a segmented scrubber with chapter ticks)

Gradient is permitted in EXACTLY THREE places in this entire product:
the rail's momentum segment (between done and current), the skeleton shimmer, and the player
letterbox. Nowhere else. Ever.

## Direction and language

- Arabic RTL is the PRIMARY design. Design in Arabic first; English LTR is a verification pass.
- Use `dir="rtl"` and `lang="ar"` on the document. Use LOGICAL CSS properties only:
  margin-inline-start, padding-inline-end, inset-inline-start, text-align: start.
  Never use left/right/margin-left/text-align:left.
- Directional icons (arrows, chevrons, pagination, breadcrumb separators, sort indicators) MIRROR.
  Brand marks, checkmarks, media controls and external-link icons DO NOT mirror.
- Player transport controls stay LTR in both languages — universal media convention.
- Code blocks are always LTR and left-aligned regardless of interface direction.
- Every Latin run inside Arabic text is wrapped: <span class="ltr" lang="en">useState</span>
  where .ltr is { direction:ltr; unicode-bidi:isolate }. Without isolation, trailing punctuation
  jumps sides. This applies to: emails, phone numbers, URLs, entity IDs, versions, file paths,
  and every English technical term.
- Numbers use WESTERN DIGITS (0-9) in both languages. Never Arabic-Indic digits (٠-٩).
  This audience reads timestamps, prices, and code in Western digits.
- Numbers that align in columns use tabular figures.

## Typography

Arabic leads the pairing. The Arabic face was chosen first; the Latin face was chosen to sit beside it.

  Display   Readex Pro            headings, the goal statement, celebration moments ONLY
  Body/UI   IBM Plex Sans Arabic  everything else
  Code      JetBrains Mono        code, timestamps, IDs, money, any aligned figure

Load from Google Fonts. Weights: 400, 500, 600 only. There is no 700 — do not reference it,
the browser will synthesize it and Arabic looks broken.

Type scale — these are the ONLY sizes. A one-off size is a defect:
  11/16  12/18  14/22  16/26  18/28  22/30  28/36  36/44  48/56  64/70   (px size / line-height)

Arabic body copy uses line-height 1.6 minimum. Base size is 16px in both languages.
Arabic prose caps at 68 characters measure. Long text is never centered.

## Spacing

These are the ONLY spacing values: 4, 8, 12, 16, 24, 32, 48, 64, 96 px.
Values like 11px, 13px, 17px, 22px are review failures. Radius: 4, 8, 12, 16, 9999.
8px is the default radius. Touch targets are minimum 44x44px with 8px separation.

## Tokens — use these variables, never raw hex

[[PASTE THE FULL CONTENTS OF josam-tokens.css HERE]]

Rules on color:
- Gold (--accent) is reserved for THREE things: the primary action, the current position on the
  rail, and achievement moments. Using it anywhere else destroys its meaning.
- The accent NEVER signals success, error or warning. Red is only destructive and error.
- Status color is never the only carrier of meaning. Every state also has a shape, icon or label.
- Borders carry elevation first; shadow only for surfaces that genuinely float (modal, toast,
  dropdown). Heavy shadow on a dark surface reads as mud.
- Every interactive control's boundary uses --border-control, never --border-subtle.

## Motion

No transition exceeds 320ms. Animate transform and opacity only — never top, left, width, height.
Never `transition: all`; name the properties. Honour prefers-reduced-motion.

## Icons

Lucide only, 1.5px stroke, sizes 16/20/24/32. Inline the SVG paths.
NEVER use emoji as an icon. Not for the streak, not for attachments, not for status. Ever.

## PROHIBITED — these are the visual signature of unconsidered work

1.  Hero sections on any dashboard, admin or operational screen
2.  Blue or purple gradients anywhere
3.  Gradient text on headings
4.  Glassmorphism, background blobs, blurred decorative circles
5.  Sparkle / star / zap / lightning icons as decoration
6.  "AI Powered" badges or any self-congratulation
7.  Wrapping every element in a card
8.  Fake testimonials, fake logos, fake charts, invented metrics
9.  Emoji used as an icon system
10. Marketing copy on operational screens ("Unlock the power", "Seamless experience")
11. An unrequested features grid of 3 or 6 cards
12. A repeated CTA every two sections
13. Animation on every component
14. Stock imagery
15. Decoration that carries no information

## Content rules

- All copy is in EGYPTIAN ARABIC — warm, direct, spoken. Not Modern Standard Arabic, not formal.
  "كمّل الدرس" not "متابعة الدرس". "مقدرناش نحمّل تقدمك" not "حدث خطأ".
- Buttons name the action: "احفظ التغييرات", not "إرسال". "انشر", not "تأكيد".
- An action's label and its confirmation share the same verb.
- Confirmations state the consequence, never "هل أنت متأكد؟".
- Errors state what happened AND how to fix it. Never technical, never an apology, never vague.
- Empty states are an invitation containing the action that fills them — never "لا توجد بيانات".
- The words "denied", "forbidden", "no permission", "failed" never appear in learner-facing copy.
  A quiz outcome is passed / close / needs review — never failed.
- The learner is "الطالب" everywhere. Never user, member, or customer in different places.
- NO Lorem Ipsum. NO placeholder text. NO leftover English in an Arabic surface.
- Use the exact sample data I give you per screen. Do not invent numbers, names or metrics.

## Every screen must show its states

For each screen I ask for, render the ideal state as the main layout, then render the applicable
edge states BELOW it in a clearly labelled section: loading skeleton (matching final layout
dimensions exactly), empty, error with a working Retry, and any access state that applies
(locked, expired, read-only, permission absent). A screen without its states is not done.

Permission-absent renders NOTHING — no disabled button, no "you don't have access" message.
The control is simply not in the DOM.

## Output format

One self-contained HTML file per screen: inline CSS, inline SVG icons, Google Fonts link, no
external JS libraries. Include a small fixed toolbar at the top with two toggles — dark/light theme
and RTL/LTR direction — so both can be verified. Both must actually work.

Semantic HTML: <button> for actions, <a> for navigation, one <h1> per page, ordered heading levels,
aria-label on icon-only buttons, real <label> on every field, visible focus on everything.
A clickable <div> is a defect.

Acknowledge this brief in one line, then wait for my first screen.
```

---

# PROMPT 1 — Foundations

```
Screen 0: Foundations. Build a single page that proves the system before any product screen exists.

Sections, in this order:

1. COLOR — every token as a swatch with its variable name, hex, and its measured contrast ratio
   against its intended background. Group: surfaces, borders, text, accent, status, chart.
   Show both themes side by side via the toggle.

2. TYPE — every size in the scale rendered twice: an Arabic line and an English line, showing the
   px/line-height and the intended role. Include one Arabic paragraph at 68-character measure and
   one mixed Arabic-English sentence containing useState and useRef, LTR-isolated.

3. BUTTONS — variants primary / ghost / danger / subtle, sizes sm / md / lg, and for EACH combination
   all five states: default, hover, focus-visible, disabled (with its stated reason), loading.
   Show them in both directions — Arabic labels are up to 40% longer or shorter than English.

4. FORM CONTROLS — TextField, TextArea with counter, Select, Combobox, Checkbox, Radio, Switch,
   Slider, and the LTR-locked fields: PhoneField (+20 country selector), EmailField, CurrencyField
   (EGP), OTPField (6 segments). Each with label, hint, required marker, and an error variant whose
   message explains the fix. Show that the LTR-locked fields stay LTR while the interface is RTL.

5. THE RAIL — all four node states, at all three scales:
   - the horizontal goal horizon
   - the vertical curriculum spine
   - the player chapter scrubber
   Prove each state is distinguishable in greyscale. Include a greyscale copy beneath the color one.

6. FEEDBACK — Toast (with an Undo action), InlineAlert (info/warning/danger/success),
   EmptyState (with its required action), ErrorState (with Retry), skeleton variants,
   OfflineBanner, ReadOnlyBanner.

7. DATA — a KpiCard showing period and comparison basis, a small bar chart and a small line chart
   using the chart palette with direct labels, and a Badge/Chip set.

This page is the reference every later screen is checked against.
```

---

# PROMPT 2 — SCR-14 · Learner Dashboard (the most important screen)

```
Screen SCR-14: the learner dashboard. This is where motivation is manufactured. It is the
most-visited screen in the product and the highest-stakes design in the system.

Block order, top to bottom — this order is the design:

1. Greeting + streak.  "صباح الخير يا محمد"  ·  streak: 5 أيام متواصلة (Lucide flame, NOT emoji)

2. CONTINUE — the single dominant element on the screen. Largest surface, and the only gold
   button above the fold.
     eyebrow:  كمّل من حيث وقفت
     title:    إدارة الحالة
     crumb:    أساسيات React · القسم 3 · الدرس 7
     progress: 12:30 / 19:00 · فاضل 7 دقايق   (66%)
     action:   [ كمّل الدرس ]

3. GOAL HORIZON — the horizontal rail.
     goal:    تغيير مجالي
     start ●━━━━━━━━━●(أنت هنا · 62%)─ ─ ─ ─ ○ 15 سبتمبر
     Below it, the largest number on the screen at 64px: "18" with the label "يوم على هدفك".
     Then one quiet line: "درسين الأسبوع ده وتفضل على المسار"
     The DATE and the DAYS are the point. The percentage is secondary.

4. THIS WEEK — 3.5 / 5 ساعات · 4 دروس, and a 7-day strip starting Saturday:
     س 45m · ح 30m · ن — · ث 60m · ر 75m · خ (today, —) · ج —
     The strip shows WHAT HAPPENED. Missed days are neutral dots. Never red, never crossed out,
     never framed as a deficit.

5. WHAT'S NEXT — a short vertical rail:
     ○ التأثيرات ودورة الحياة        10:15
     ○ الـ Hooks المخصصة             14:00
     ○ ─ اختبار القسم الثالث         يفتح بعد الدرسين
   Locked titles and durations are FULLY legible. Only the connector and marker dim.

6. RECENT WINS —
     ✓ خلصت قسم «المكونات الأساسية»     امبارح
     ✓ عدّيت اختبار القسم التاني بـ 88%   من يومين

Sidebar navigation: لوحة التحكم · كورساتي · المساعد · ملاحظاتي · شهاداتي · الإعدادات

Hard constraints:
- No hero section. No gradient except the rail's momentum segment.
- No block on this screen may contain negative framing in ANY state.
- A block with no data is ABSENT from the DOM, not rendered empty.
- The skeleton must match the final layout dimensions exactly — layout shift here is the most
  visible quality defect in the product.

Then render these four variants below, labelled:
  A. New learner, nothing purchased — Continue is replaced by "ابدأ بدرس مجاني"; the catalog surfaces.
  B. Onboarding skipped — the goal block is replaced by a dismissible prompt explaining the benefit.
  C. Expired access — Continue becomes a reactivation invitation. Progress, notes and certificates
     stay FULLY visible. Lead with what is retained, never with what was lost.
  D. Loading skeleton.
```

---

# PROMPT 3 — SCR-17 · Lesson Player

```
Screen SCR-17: the lesson player. Second most important screen in the product.

Layout — desktop:
  Top bar:   ← أساسيات React        القسم 3 · الدرس 7 — إدارة الحالة        ⋮
  Left/main: 16:9 video stage + transport controls
  Side panel (290px): الفهرس (chapter rail) then مصادر الدرس
  Below:     tabs — الملاحظات | المساعد | أسئلة الدرس

Video stage:
  - The player region is DARK IN BOTH THEMES. This is a deliberate, documented exception.
    Toggle to light mode and the player must stay dark.
  - A forensic watermark drifts over the frame: "محمد أحمد · 5678" at low opacity.
  - Do not draw a fake video still or stock image. Show a protected-playback placeholder.

Transport controls — LTR in both directions:
  scrubber with chapter ticks at 24% / 58% / 82%, filled to 66%
  ⏸  ⏮  ⏭     12:30 / 19:00     1.0×  ⚙  ⛶
  Lucide icons. Keyboard map documented: space, ← →, F, M, [ ]

Chapter rail (الفهرس) — the vertical rail at player scale:
  ● مقدمة                0:00   done
  ● useState             4:30   done
  ◉ useRef              11:00   current
  ○ مثال عملي           18:20   available
Selecting a chapter seeks the video.

مصادر الدرس:
  ملف المشروع · ZIP · 4.2 MB
  التوثيق الرسمي  (external link icon, does NOT mirror)

الملاحظات tab — timestamped lesson notes synced to playback:
  0:00   مقدمة: يعني إيه State
         البيانات اللي بتتغير جوه المكوّن وبتخلي الواجهة تتحدّث لوحدها.
  4:30   الفرق بين useState و useRef
         useState بيعيد رسم المكوّن. useRef بيحتفظ بالقيمة من غير إعادة رسم.
  11:00  متى نستخدم useRef                                    ← ACTIVE, highlighted
         لما تحتاج تحتفظ بقيمة بين مرات الرسم، أو توصل لعنصر في الـ DOM مباشرة.
  Plus a note composer stamped with the current timestamp: "اكتب ملاحظة عند 12:30…"

  The active block is MARKED, not aggressively scrolled to. Forced auto-scroll fights a reader.
  Selecting a note block seeks the video. The rail is bidirectional.

المساعد tab — the AI panel:
  learner:  ليه بنستخدم useRef هنا بدل useState؟
  assistant: لإن القيمة دي مش بتظهر في الواجهة، فمحتاجينش نعيد رسم المكوّن كل مرة تتغير.
             وبما إن هدفك تغيير مجالك — الفرق ده بيتسأل عليه في أي إنترفيو.
             [citation chip: الدرس 7 · 11:00]
  Show a streaming indicator mid-response. A blank wait reads as failure.
  Quota meter at the bottom: 153 / 200 رسالة

Then render below, labelled:
  A. MOBILE at 390px — the side panel becomes tabs UNDER the video. It is never removed; notes and
     AI are core, not desktop extras. The note input never covers more than the lower third.
  B. Light theme with the player still dark.
  C. Loading skeleton.
```

---

# PROMPT 4 — SCR-16 · Course Overview (the curriculum spine)

```
Screen SCR-16: course overview for an enrolled learner. This is the rail at its fullest expression —
the whole path in one view.

Header: أساسيات React · 48 درس · 12 ساعة · تقدمك 62%
Primary action: [ كمّل الدرس ]  → إدارة الحالة · القسم 3 · الدرس 7

Then the full curriculum as a continuous vertical rail, grouped into sections. Section numbering
is used because ORDER CARRIES REAL MEANING here — this is the one place numbering is not ornament.

  01  الأساسيات                                   6 دروس · 1 س 12 د    ✓ مكتمل
      ● ما هو React                    8:40
      ● أول مكوّن                     11:05
      ● JSX                           9:30
      ...

  02  المكونات الأساسية                           9 دروس · 1 س 48 د
      ● الـ Props والبيانات           14:20     مكتمل
      ◉ إدارة الحالة                 12:30 / 19:00   ← أنت هنا
      ○ التأثيرات ودورة الحياة        10:15
      ○ ─ الـ Hooks المخصصة           14:00    ⬡ يفتح بعد «التأثيرات ودورة الحياة»
      ○ ─ اختبار القسم                         ⬡ يحتاج 70% للنجاح

  03  إدارة الحالة المتقدمة                       11 درس · 2 س 20 د     (all locked, all legible)

Critical: EVERY locked lesson shows its title, its duration, and its exact unlock condition, all at
full legibility. The dimming applies only to the connector and the marker. A learner must be able to
see the entire path ahead of them at all times — that is the product.

The momentum gradient appears ONLY on the connector between the last done node and the current node.

Then render below, labelled:
  A. SCR-18 — a locked lesson opened directly:
       ⬡ مقفول مؤقتًا
       الـ Hooks المخصصة · 14 دقيقة
       أكمل درس «التأثيرات ودورة الحياة» علشان يفتح الدرس ده
       [ روح للدرس المطلوب ]
     Exactly one action, and it satisfies the condition. Title and duration fully legible.
  B. Mobile at 390px.
```

---

# PROMPT 5 — SCR-12 + SCR-13 · Onboarding and the Projection

```
Screens SCR-12 and SCR-13: onboarding. Target is 70% completion, so every screen is one question.

Render all five steps as separate full screens on one page, stacked and labelled.

Step indicator on every screen: "٢ من ٤" — no, use Western digits: "2 من 4".
Every step is individually skippable, not just the whole flow.

STEP 1 — "هدفك إيه؟"  — five visual choice cards (RadioCard), one column on mobile:
   أشتغل كمبرمج لأول مرة
   أغيّر مجالي بالكامل
   أطوّر في شغلي الحالي
   أبني مشروعي الخاص
   أتعلم لنفسي بس

STEP 2 — "أنت فين دلوقتي؟" — four cards:
   مبتدئ تمامًا  ·  عندي أساسيات  ·  بشتغل بالفعل  ·  خبرة كويسة ومحتاج تخصص

STEP 3 — "هتقدر تذاكر كام ساعة في الأسبوع؟" — 3 / 5 / 10 / 15+ ساعات

STEP 4 — "إيه اللي يهمك؟" — multi-select topic tags:
   الويب · الموبايل · الباك إند · قواعد البيانات · الأمن السيبراني · الذكاء الاصطناعي

STEP 5 — SCR-13, THE PROJECTION. This is the emotional payoff of the entire onboarding and is
never omitted. It is the moment the product makes its promise concrete:

   بمعدل 5 ساعات في الأسبوع
   هتخلص مسار «الفول ستاك» حوالي

        15 سبتمبر
        (64px, Readex Pro, gold — the largest thing on the screen)

   Below it, the goal horizon rail rendered for the first time, empty at the start position —
   this is the learner meeting the motif that will follow them everywhere.

   Then 2–3 recommended courses, then [ يلا نبدأ ]

Design note: this screen earns display type and generous space because it is a celebration moment.
That permission does not extend to any other screen in this pack.
```

---

# PROMPT 6 — SCR-03 · Course Detail (public, pre-purchase)

```
Screen SCR-03: the public course page. Outcome-led, trust above the fold, and the FULL curriculum
visible before purchase — hiding the curriculum is what makes a course page feel like a sales page.

Left column:
  chip: مبتدئ
  h1:   أساسيات React
  lead: من الصفر لحد ما تبني تطبيق كامل بنفسك. مسار منظّم بمشاريع عملية وشهادة معتمدة في الآخر.
  meta chips: 12 ساعة · 48 درس · شهادة · 4.7 من 23 تقييم
  A quiet inset panel: "بمعدل 5 ساعات في الأسبوع هتخلص الكورس ده في حوالي 4 أسابيع."
    — this is the goal thesis applied to a stranger. It is the most important line on the page.

Sticky right column (purchase card):
  1,049 ج.م   <s>1,499</s>
  عرض الإطلاق · ينتهي بعد 3 أيام
  [ اشترك دلوقتي ]     ← the only gold button on the page
  اللي بتاخده:
    وصول مدى الحياة للكورس
    200 سؤال للمساعد شهريًا لمدة 3 شهور
    ملفات المشاريع كاملة
    شهادة معتمدة برقم تحقق
  استرداد كامل خلال 14 يوم

Below: the full curriculum as the vertical rail, all sections expanded, every lesson titled with its
duration. Free preview lessons are marked and playable without registration. Locked lessons show
title + duration, and NO PRICE and NO purchase action inline — the single purchase action lives in
the card.

Then a reviews section — but ONLY if there are at least 5 real reviews. Since there are 23, show 3.
Do NOT invent testimonials, do not invent company logos, do not add a "trusted by" strip.

Then render below, labelled:
  A. Mobile at 390px — the purchase card becomes a fixed bottom bar that reserves its own space so
     it never covers the last element.
  B. The free-preview player state (SCR-04): plays without registration, generic academy watermark
     rather than a learner identity, and a soft prompt at the end showing what comes next.
```

---

# PROMPT 7 — SCR-28 + SCR-30 · Checkout and Fawry Pending

```
Screens SCR-28 and SCR-30: purchase. Egyptian payment reality — card and Fawry cash both matter.

SCR-28 CHECKOUT — two columns, single column on mobile:

  Left: order summary
    أساسيات React
    وصول مدى الحياة · 200 سؤال للمساعد شهريًا لمدة 3 شهور · شهادة معتمدة
    السعر            1,499.00 ج.م
    خصم الإطلاق       -450.00 ج.م
    ─────────────────────────────
    الإجمالي         1,049.00 ج.م
    CouponField: "عندك كوبون؟"

  Right: payment method — RadioCards
    فيزا / ماستركارد      (card fields: number, expiry, CVC — all LTR-locked, tabular figures)
    فوري / أمان           (cash at any outlet — states that a reference code will be issued)
    محفظة موبايل

  [ ادفع 1,049 ج.م ]

  Money is always shown with explicit currency and tabular figures. The submitting button disables
  and shows its state — double submission must be impossible.

SCR-30 FAWRY PENDING — the state most platforms get wrong:

    كود الدفع بتاعك جاهز
    9 4 7 2 3 8 1        ← very large, monospace, LTR, with a copy action
    روح لأي فرع فوري أو ماكينة وقول الكود ده
    الكود صالح لحد   21 أغسطس · 11:59 م
    أول ما تدفع، الكورس هيفتح لوحده — مش محتاج ترجع هنا
    [ انسخ الكود ]   [ ابعتهولي على الواتساب ]

  Below it, a short "اللي هيحصل بعد الدفع" timeline. This screen's job is to make a person who
  has not paid yet feel certain. No countdown pressure, no scarcity language.

Then render below, labelled:
  A. SCR-29 order confirmation — routes directly into lesson 1, not to a generic thank-you page.
  B. Payment failure — states what happened and what to do, keeps the order intact, offers retry
     with a different method. Never an apology, never a technical error code.
```

---

# PROMPT 8 — SCR-21 + SCR-39 · The State Screens

```
Three screens on one page. These are where the product's voice is proven, and where most learning
platforms become punitive.

1. SCR-21 — QUIZ RESULT, NOT PASSED (65%, pass mark 70%)

        65%
        قريب جدًا                    ← never the word "رسبت" or "failed"

     3 نقاط محتاجة مراجعة:
       الفرق بين useState و useRef        → الدرس 7 · 4:30
       متى يعاد رسم المكوّن               → الدرس 6 · 2:15
       قواعد الـ Hooks                    → الدرس 5 · 9:40

     [ راجع وجرّب تاني ]     ← primary
     فاضل لك محاولتين

   Every missed item links to the EXACT lesson and the EXACT second that covers it. That linkage
   is the entire feature. The score is stated without judgment. Retry is the primary action.
   Also render the passed variant (88%) as a celebration moment — display type is permitted here.

2. SCR-39 — EXPIRED ACCESS

     كل حاجة لسه هنا
       تقدمك: 62% من أساسيات React
       23 ملاحظة
       شهادة واحدة
     ارجع وكمّل من حيث وقفت — الدرس 7
     [ فعّل وصولك تاني ]

   Leads with what is RETAINED, never with what was lost. Progress, notes and certificates remain
   fully visible and readable — nothing is blurred or locked behind the paywall except playback.

3. THE STATE MATRIX — render a labelled grid proving every state on one data-driven screen
   (use "ملاحظاتي"):
     initial loading skeleton · background refresh with stale data still visible ·
     empty (first time) · no search results · API error preserving already-loaded data with a
     Retry that retries the failed request only · offline · rate limited with the reset time ·
     read-only with a stated reason · permission absent (the control is simply ABSENT — show an
     annotation explaining that nothing renders, no disabled button, no "forbidden" message)

   Never let undefined, null, NaN or "Invalid Date" reach the screen — show how each is handled.
```

---

# PROMPT 9 — SCR-41 · Admin Operations Dashboard

```
Screen SCR-41: the founder's daily operations screen. Its job is to get the founder under 3 hours
of operations per week. Density and speed beat aesthetics. NO hero. NO marketing copy. NO card grid
where a table belongs.

Block 1 — "محتاج انتباهك" is the FIRST and visually HEAVIEST block. Every row resolves in one click.

    محتاج انتباهك                                                    4
    ⬤ 3 طلبات نقل أجهزة — طلاب دافعين ومش قادرين يتفرجوا   أقدم: 47 دقيقة  →
    ⬤ 2 أسئلة مصعّدة — المساعد مقدرش يجاوب                  أقدم: 51 ساعة   →
    ◐ 1 تذكرة دعم متأخرة                                    28 ساعة        →
    ○ 4 تقييمات في انتظار الموافقة                          —              →

  Urgency is carried by BOTH a color and a shape. When nothing needs attention, the block states
  so explicitly — "مفيش حاجة محتاجة انتباهك دلوقتي" — rather than disappearing. Confirmation of
  "you're clear" is the point of the block.

Block 2 — KPIs. EVERY metric states its time period and its comparison basis. "↑ 12%" alone is
meaningless.
    إيراد النهاردة · بالجنيه المصري      4,497        3 طلبات
    إيراد أغسطس · بالجنيه المصري        89,940        ↑ 12.4% مقارنة بيوليو
    طلاب نشطين · آخر 7 أيام                142        من إجمالي 486
    نسبة الإكمال · آخر 90 يوم             38.2%       ✓ فوق هدف الـ 6 شهور (35%)

Block 3 — two panels:
    المساعد الذكي · أغسطس
      رسائل النهاردة               214
      نسبة الحل من غيرك            71.3%
      تكلفة الشهر · دولار          8.42 / 15.00
      23 سؤال عن «نشر التطبيق على السيرفر» ومفيش درس يغطيه — مرشح لدرس جديد.
    صحة النظام
      النسخة الاحتياطية    ✓ 4:00 ص · متحقق منها
      وقت التشغيل · 30 يوم  99.94%
      ميزانية الإيميل       1,840 / 3,000
      طابور المهام          3

Footer line: البيانات محدّثة حتى 19 أغسطس 14:00 — التقارير بتتحدّث كل ساعة
Every dashboard surface shows its as_of. Each widget loads and fails INDEPENDENTLY — one failed
widget never breaks the dashboard. Show one widget in its error state while the others are fine.

Include a CommandPalette (⌘K) overlay exposing every admin destination by keyboard.
```

---

# PROMPT 10 — SCR-53 · Student Directory (the DataTable)

```
Screen SCR-53: the student directory. This proves the operational table pattern that 20+ admin
screens reuse. Tables, not card grids, for operational data.

Toolbar, reachable without scrolling on desktop:
  search (ابحث بالاسم أو الإيميل) · فلترة بالحالة · فلترة بالكورس · إجمالي 486 طالب · بيعرض 1–8
  [ صدّر ]   — export respects the ACTIVE filters

Bulk selection bar, only when rows are selected:
  اتاختار 3 من الصفحة دي — [اختار كل الـ 486]
  Selection scope must be explicit: "this page" vs "all matches". Bulk destructive actions state
  the exact count and require confirmation.

Columns, with a defined priority so low-priority ones collapse first below 820px:
  ☐ | الاسم (+ entity ID, LTR-isolated, copyable) | الإيميل (LTR) | الكورسات | التقدم |
  آخر نشاط | الحالة | إجراءات

Rows — use exactly this data, and include the edge rows deliberately:
  محمد أحمد        usr_01HQZX9K   m.ahmed@example.com       3   62%    اليوم 11:02   نشط
  سارة محمود       usr_01HQZY4M   sara.m@example.com        1  100%    امبارح 21:40  نشط
  عبدالله الشمري   usr_01HQZZ7P   a.alshamri@example.com    2   18%    من 12 يوم     منتهي
  نور عبدالرحمن    usr_01HR018Q   nour.a@example.com        1    4%    من 3 أيام     نشط
  يوسف إبراهيم     usr_01HR02CD   (no email)                0   لم يبدأ  —           مسجّل
  محمد عبد الرحمن السيد الشوربجي  ← a deliberately very long name, must not break the layout

Sort, filter and pagination are SERVER-DRIVEN and reflected in the URL. Changing a filter resets to
page 1; page size persists. Pagination arrows MIRROR with direction. Row keys are entity IDs.
Numeric and money columns use tabular figures. Sticky header once the table exceeds one viewport.
Row click and in-row actions never conflict.

Then render below, labelled:
  A. Below 820px — email and last-activity columns drop out first; the table becomes horizontally
     scrollable with a sticky first column, never compressed into illegibility.
  B. At 390px — the table becomes a card list preserving information priority. Nothing that exists
     on desktop is silently dropped.
  C. Empty (no students yet) · no results for the current filter · error with Retry · loading skeleton.
```

---

# PROMPT 11 — Mobile

```
Mobile screens at 390px. The learner base is phone-heavy — this is not a scaled-down desktop.

Render three device frames side by side, each 390px wide:

1. DASHBOARD — the same block order as web. Continue card, goal horizon with the 18-day number,
   week strip. Bottom navigation with exactly four items: الرئيسية · كورساتي · المساعد · حسابي.
   Respect env(safe-area-inset-bottom).

2. PLAYER — video, transport, then the side panel content as TABS beneath the video:
   الملاحظات | المساعد | أسئلة. Never removed. The note composer never covers more than the
   lower third of the screen and the keyboard never covers the focused field.

3. كورساتي — showing owned and unowned courses together. Unowned courses show title, lesson count
   and duration with NO PRICE and NO PURCHASE ACTION — just "مش ضمن وصولك الحالي". The path stays
   visible; the store does not follow the learner into the app.

Then add a fourth frame at 360px proving no horizontal scroll and no truncated text anywhere.

Constraints:
- Touch targets ≥ 44x44px with ≥ 8px separation.
- Use 100dvh or a flex layout, never 100vh.
- Dashboard renders from cache immediately then updates — never a spinner on the most-opened screen.
- Locked content shows title and state, never a price.
```

---

## Rejection checklist

Reject and re-prompt any output where **any** of these is true:

```
☐ A hero section appears on a dashboard, admin or operational screen
☐ A gradient appears anywhere except the rail momentum segment, skeleton shimmer, or player letterbox
☐ Any emoji is used as an icon
☐ Locked content is dimmed to the point of being hard to read
☐ The dashboard leads with a percentage instead of the target date and days remaining
☐ More than one gold button appears above the fold on any screen
☐ Arabic-Indic digits appear anywhere
☐ A Latin term inside Arabic text is not LTR-isolated
☐ Any physical CSS direction property (left/right/margin-left/text-align:left) is used
☐ An off-scale font size or spacing value appears
☐ A raw hex color appears instead of a token
☐ Invented numbers, testimonials, logos or metrics appear
☐ Modern Standard Arabic or formal register is used instead of Egyptian Arabic
☐ The words "denied", "forbidden", "failed", or "هل أنت متأكد؟" appear
☐ An empty state has no action in it
☐ An error state destroys already-loaded data, or offers a page reload instead of a targeted retry
☐ A permission-absent case renders a disabled control or an explanatory message instead of nothing
☐ The player is not dark in light mode
☐ A clickable <div> is used instead of a <button>
☐ Any interactive element has no visible focus state
☐ The screen was not verified in BOTH directions and BOTH themes
```

## After generation

Save each approved export to `design/SCR-XX-<name>.html` in the project folder.
These are references for building `packages/ui`, not code to copy. `BR-1581` applies:
a reference design never justifies a value in production code — the token layer does.

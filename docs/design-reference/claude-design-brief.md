# Josam Academy — Claude Design Brief Pack

**How to use this file**

Claude Design applies a published design system to every new project automatically, so the order below matters.

1. Open Claude Design → **Design systems** tab → new design system → paste **STEP 1**.
   Claude proposes three directions. Pick one, iterate until you're happy, then **publish** it.
2. Go back to the homescreen. Create a new project for each following step and paste it.
   The published system now applies automatically, so nothing gets re-invented per screen.
3. Run the steps **in order**. Each one assumes the components from the steps before it already exist.
4. Every step ends with the same instruction: reuse before you create, and register anything new
   back into the design system.

Everything below describes **what a screen is for and what is in it**. It deliberately does not
describe how anything should look — that is the job you are handing to Claude Design.

---

# STEP 1 — The Design System

```
I'm building the design system for Josam Academy, an Arabic-first online learning platform.
Before we design a single screen, I want you to design the system itself.

## What the product is

Josam Academy teaches programming in Arabic to people in Egypt and the wider Arab world who want to
become employable software developers. Most of them are complete beginners. Most of them are on a
mid-range Android phone over a slow connection. Most of them have already tried to learn from free
video playlists and given up.

The platform sells structured courses, tracks a learner's progress against a personal target date,
gives them an AI tutor scoped to the lesson they're watching, tests them, and issues a verifiable
certificate. A small operations team — sometimes one person — runs the whole thing from an admin area.

## The one idea the interface has to carry

These learners do not fail because content is missing. They fail because structure is missing.
So the interface is a plan, not a catalog. Three consequences:

- A learner can always see the whole path, including the parts they haven't unlocked yet. Locked
  content is fully readable — the lock is a state, not a redaction. Hiding what's ahead is the single
  thing this product refuses to do.
- Progress is expressed as distance to a real date, not as a percentage. "You'll finish around
  15 September" changes behaviour; "62% complete" doesn't.
- Every screen has one obvious next action. Everything else is quiet.

Your visual language should make those three things feel inevitable rather than decorated.

## Who the interface serves

- Learner, on a phone, at night, tired, often unsure they can do this. Needs certainty and calm.
- Founder/admin, on a desktop, trying to spend under three hours a week on operations. Needs density
  and speed. Their screens are a control room, not a marketing page.

Those two audiences need different densities out of the same system. Design for both.

## Bilingual is a structural requirement, not a translation layer

- Arabic (RTL) is the primary design. Egyptian Arabic, spoken register, warm and direct.
- English (LTR) is fully supported and must be verified, not assumed.
- Choose the Arabic typeface first and select a Latin face to sit beside it — not the reverse.
  Mixed Arabic/English lines are everywhere in this product because the technical vocabulary stays
  English. Those lines must share a baseline and comparable x-height, and Latin runs inside Arabic
  must be direction-isolated so punctuation doesn't jump sides.
- Arabic needs more line-height and a shorter measure than Latin. Build that into the type system.
- Numbers, code, timestamps, prices and IDs are always Western digits and always left-to-right.
- Arabic and English translations of the same label can differ in length by up to 40%. Every control
  has to survive both.
- Mirror what should mirror (arrows, chevrons, pagination, sort indicators, breadcrumb separators).
  Do not mirror what shouldn't (logos, checkmarks, media transport controls, external-link icons).

## Constraints on the visual language

- **No gradients anywhere.** None. Not on buttons, not on backgrounds, not on progress, not subtle
  ones, not on a chart. Every surface is a flat color.
- Dark mode and light mode are two independently designed themes. Light is not an inversion of dark.
- Everything meets WCAG AA in both themes — 4.5:1 for text, 3:1 for the boundary of any interactive
  control and for focus. Verify the pairs, don't estimate them. Tell me any pair you had to adjust.
- Color is never the only way something is communicated. Every state also has a shape, an icon, or a
  word.
- One accent color, used sparingly and meaningfully. Decide what earns it and hold that line.
- Banned outright, because they are the visual signature of generic AI output: glassmorphism,
  blurred decorative blobs, sparkle/star/lightning icons as decoration, emoji used as icons, stock
  illustration, hero sections on operational screens, cards wrapped around everything, invented
  testimonials or logos, "AI Powered" badges, marketing copy in a product surface.
- One icon set, one stroke weight, drawn as SVG.
- Motion is short and functional. Nothing animates just because it can.

## What I want from you in this step

1. First, propose **three distinct visual directions** for this product — as short written
   descriptions plus one small sample surface each. Give each a name and a one-line argument for why
   it fits a product about structure and certainty for anxious beginners. Make them genuinely
   different from each other, not three shades of the same idea. Do not default to what a SaaS
   dashboard usually looks like.

2. When I pick one, build the full system in that direction:
   - Color: both themes, semantic names describing purpose not appearance, with the contrast ratio
     stated next to each pair.
   - Typography: the Arabic/Latin pairing, the weights, and a closed size scale with the role of each.
   - Spacing, radius, elevation, z-index layering, focus treatment, icon sizes, breakpoints.
   - A categorical chart palette that works in both themes.

3. Then build the component library, and for each component show every variant and every state —
   default, hover, focus, disabled with its reason, loading, error — in both themes and both
   directions:
   - Primitives: button, icon button, input, textarea, select, combobox, multi-select, checkbox,
     radio, switch, slider, badge, chip, avatar, tooltip, skeleton
   - Specialised inputs this product needs: phone with country selector, email, one-time-code,
     currency, duration as mm:ss, search with clear, file/image drop with size and type stated before
     the picker opens, date picker with an Arabic calendar
   - Layout: card, panel, sheet, modal, drawer, tabs, accordion, divider, page header, app shell
   - Navigation: top bar, side nav, mobile bottom nav, breadcrumb, pagination, stepper, command palette
   - Feedback: toast with undo, inline alert, empty state that contains the action that resolves it,
     error state with retry, offline banner, read-only banner, progress bar, progress ring
   - Data: table with sticky header and column priority, filter bar, bulk action bar, KPI card that
     cannot render without stating its time period and comparison basis, chart frames
   - The product's own motif: a progress element that expresses a sequence of steps with four states
     — done, current, available, locked — distinguishable without color, and readable at three
     different scales (a whole goal, a course curriculum, chapters inside one video). This element is
     what the product is remembered by. Spend real effort on it.

4. Publish it as the design system so every screen I ask for afterwards inherits it.

Rule for everything that follows: reuse an existing component before creating a new one. If a screen
genuinely needs something new, add it to the system as a proper component with all its states rather
than styling it inline. Nothing in this product exists in two versions.
```

---

# STEP 2 — Learner Core

> The heart of the product. Build this before anything else.

```
Design the learner's core screens using our published design system. Deliver every screen at desktop
and at mobile — mobile is designed deliberately, not scaled down, and nothing that exists on desktop
is silently dropped from it.

For each screen, show the normal state first, then the states listed with it.

**Dashboard** — the screen a learner opens most. Its job is to make continuing feel obvious. It
contains: a greeting and their current learning streak; the lesson they stopped in the middle of,
with how far in they are and how much is left, and the action to resume it; their goal and their
target date, expressed as how many days remain and whether their current pace still reaches it; what
they did this week against what they committed to; the next few lessons ahead of them including the
locked ones with the condition that unlocks each; and their recent completions. Nothing on this
screen is ever framed as a shortfall.
States: first-time learner who owns nothing yet · learner who skipped goal-setting · learner who
finished everything · learner whose access expired · loading.

**My courses** — everything the learner owns and where they are in each, plus the courses they don't
own shown as part of the same path with no price and no buy action inside the app.

**Course overview** — the entire curriculum of one course as a single sequence: sections, every
lesson with its length, which are done, which is current, which are available, which are locked and
exactly what unlocks them. Quizzes sit in the sequence where they occur. A learner should be able to
understand the whole shape of the course in one screen without expanding anything.

**Lesson player** — video, with the chapters of that video as a navigable sequence, the downloadable
resources attached to the lesson, and three panels the learner works in while watching: written
lesson notes that stay in sync with playback and that jump the video when selected, an AI tutor
scoped to this lesson that cites the exact lesson and timestamp it drew from and shows the learner
how much of their monthly quota is left, and questions asked about this lesson. The learner can
capture their own note stamped at the current moment without losing their place. Playback is
protected and carries a per-learner watermark. Transport controls stay left-to-right in both
languages. On mobile the three panels stay — they are core, not desktop extras.
States: buffering · playback error with retry · offline · rate-limited AI · AI answer that falls
outside the lesson's scope.

**Locked lesson** — what a learner sees when they open something they haven't unlocked. The title
and length are fully readable, the exact condition is stated in plain words, and there is exactly one
action, which is the thing that satisfies that condition. The words denied, forbidden and no
permission never appear.

**Quiz** — an intro screen stating what it covers, how many attempts remain and the pass mark; the
attempt itself supporting single-choice, multiple-choice, true/false, fill-in-the-blank and written
answers, with progress through the questions and the ability to move between them; and the result.
The result never uses the word failed. When the learner didn't reach the pass mark it names each
concept they missed and links each one to the exact lesson and the exact second that teaches it, and
the primary action is to review and try again. When they pass it is a genuine moment.

**Notes hub** — every note the learner has taken across all courses, searchable, each one still
linked back to the lesson and moment it came from.

**AI conversations** — the history of their tutor conversations, grouped by course and lesson, each
resumable, with their quota and its reset date visible.

**Q&A thread** — a question a learner asked, the answers, which answer the instructor marked as
correct, and where escalation to a human landed.

**Goal settings** — where the learner sets or changes what they're aiming for, their weekly time
commitment, and their target date, with the projection updating live as they change it.
```

---

# STEP 3 — Public Site, Signup and Onboarding

```
Design the screens a stranger meets, and the path that turns them into a learner. Desktop and mobile.

**Landing** — for someone who has already failed to learn this on their own. It has to make the case
that structure is the difference, show real proof rather than claims, make the free preview
reachable immediately, and be honest about price. No invented testimonials, no fake company logos,
no fabricated statistics — if I haven't given you a real number, design the slot and label it clearly
as awaiting real content.

**Course catalog** — every course, filterable by level, topic and price, each entry showing what it
is, how long it takes, what level it assumes, and whether the person already owns it.

**Course detail** — the page a purchase decision is made on. It contains: what the learner will be
able to do at the end; the complete curriculum, fully visible before purchase, with the free preview
lessons marked and playable; how long it takes at their own stated weekly pace; the instructor; real
reviews if there are enough of them to be meaningful; exactly what the purchase includes, generated
from the actual entitlements rather than written by hand; and the price with any active offer stated
honestly. One purchase action on the page.

**Free preview player** — plays without an account, watermarked generically rather than per-person,
and ends by showing what comes next rather than a hard wall.

**Certificate verification** — a public page where an employer pastes a certificate code and sees
whether it is genuine, who earned it, for what, and when. Also the not-found state, which must not
leak anything about the code format.

**Sign in / Create account** — three ways in: Google, email and password, and phone with a one-time
code. Three screens maximum on every path.
Also: one-time-code entry with resend and its cooldown; forgot-password request; set-a-new-password;
and the screen a person lands on after clicking an email verification link, including when that link
has expired — in which case a fresh one is issued rather than an error shown.

**Onboarding** — four questions, one per screen, each individually skippable, with progress always
visible: what is your goal, where are you now, how much time per week, and what topics interest you.

**The projection** — the fifth screen and the emotional payoff of the entire flow. It turns their
answers into a specific date they will finish by, introduces the progress motif they'll see every day
from now on, and recommends the two or three courses that get them there. This screen is allowed to
be the most expressive in the product.
```

---

# STEP 4 — Purchase, Account and Lifecycle

```
Design the commercial and account screens. Desktop and mobile. Egyptian payment reality: card, cash
at a payment outlet, and mobile wallet all matter.

**Checkout** — what is being bought and exactly what access it grants, the price with any discount
itemised, a coupon field, and the payment method choice. Money is always shown with its currency
stated. Submitting is impossible to do twice.

**Cash payment pending** — the state after choosing to pay cash at an outlet. Its entire job is to
make someone who has not paid yet feel certain: the reference code large and copyable, where to take
it, when it expires, and the fact that access opens by itself once paid with no need to come back.
No countdown pressure, no scarcity language.

**Order confirmation** — leads straight into the first lesson rather than to a generic thank-you.

**Payment failure** — what happened, what to do about it, order kept intact, retry with a different
method. Never an apology, never a raw error code.

**Orders and invoices** — history, each with what was bought, what it granted, what was paid, and a
downloadable invoice.

**Subscription management** — what is active, what it includes, when it renews, what it costs.

**Cancellation** — asks why first, and offers the remedy that actually matches the stated reason
rather than a blanket discount. Ends by stating precisely what the learner keeps and what they lose,
and when.

**Expired access** — leads with everything that is still theirs: progress, notes, certificates, all
fully visible and readable. Reactivation is offered, not demanded. Never leads with loss.

**Reactivation** — what it costs to come back and exactly where they'd resume.

**Certificates** — the ones they've earned, and the detail view of one with its verification code and
the ways to share it.

**Account settings** — profile, language, theme, notification preferences, linked sign-in methods,
password, and account deletion with its consequences stated plainly.

**Devices** — which devices the account is bound to, and how to request a transfer when someone
changes phone. Include the waiting state after a request is submitted.

**Help centre, my tickets, and a ticket thread** — searchable articles, the learner's open and closed
tickets, and the conversation inside one.
```

---

# STEP 5 — Admin and Operations

```
Design the admin area. Desktop-first at a real working width, but every screen must remain usable on
a tablet and on a phone, because the founder will absolutely try to approve something from his phone.

This is a control room. Density and speed beat aesthetics. No hero sections, no marketing language,
no card grids where a table belongs, no decoration that carries no information. Any action affecting
money or someone's access states its consequence before it is confirmed.

Two rules that shape every screen here: the interface renders only the actions the current person is
actually permitted to perform — an action they lack permission for is absent entirely, not disabled
and not explained. And every operational record shows who created it, who last changed it, and when,
with a copyable entity ID alongside the human-readable name.

**Operations dashboard** — the first screen of the working day. Its heaviest, first block is
everything currently needing a human decision, ordered by urgency and age, each resolvable in one
click: pending device transfers, escalated questions the AI couldn't answer, overdue support tickets,
submissions awaiting grading, reviews awaiting approval, refund requests. When nothing needs
attention it says so explicitly rather than disappearing. Below that: revenue today and this month
with the comparison basis stated, learner counts, completion rate against target, AI cost against
budget, and system health. Every metric states its period. Every widget loads and fails on its own.
Show one widget failed while the rest are fine.

**Student directory** — the reference table pattern the rest of the admin reuses. Searchable and
filterable, server-driven sorting and pagination reflected in the URL, defined column priority so the
least important columns collapse first, explicit selection scope when selecting across pages, bulk
actions that state the exact count, export that respects the active filters, and a total count.
Include the awkward rows on purpose: a learner with no email, one who never started, and one with a
very long name.

**Student profile** — everything about one learner in one place: what they own and until when, their
progress per course, their devices, their orders, their tickets, their certificates, and the actions
support can take — extend access, grant a course, approve a device transfer — each stating its effect.

**Queues** — device transfer requests with the evidence needed to decide; escalated Q&A; submissions
awaiting grading with the rubric alongside the answer; content awaiting publish approval. Each queue
is built to be worked through, not browsed.

**Course list and course editor** — the metadata of a course in both languages, its pricing, its
level, its cover, and its publication state, with an explicit distinction between creating, editing,
viewing and read-only.

**Curriculum builder** — the tree of sections and lessons for one course, reorderable, showing each
lesson's type and length and readiness, where quizzes sit, and which unlock rules apply.

**Lesson editor** — one lesson: its video and upload/transcoding state, its chapters, its attached
resources, and its written lesson notes composed as blocks that can be timestamped against the video.

**Media library** — uploaded video and files, their processing state, their size, and where each one
is used, so nothing is deleted while still referenced.

**Quiz builder and question bank** — questions of every supported type, organised and reusable across
quizzes, with pass marks, attempt limits and which concept each question maps to, because that
mapping is what powers the review links in the learner's result.

**Products, entitlement composer and coupons** — what is sold, and exactly what access each purchase
grants, previewed as the buyer will see it, generated from the same source as the public course page.
Coupons with their limits and their usage.

**Orders, refunds and subscriptions** — the money screens. Refund requests carry the reason, the
evidence, and what approving one will actually revoke.

**Reports** — revenue, completion, where learners drop off, and AI usage including the questions
learners asked that no lesson currently answers, which is a content backlog. Every chart answers a
stated question; no chart exists to fill space.

**Settings, roles and permissions, staff, audit log, system health** — a permission matrix that stays
readable at real scale, staff and their roles, and an append-only record of who did what.
```

---

# STEP 6 — System States and the Mobile App

```
Two last sets.

**System screens** — not found, server error, maintenance, and being offline. Each states what
happened, what the person can do about it, and keeps them oriented rather than dumping them out of
the product. None of them apologise, none of them show a technical error, and the retry retries the
thing that failed rather than reloading the page.

**Mobile app** — deliver the learner's five most-used screens as a native mobile app rather than a
responsive website: home, my courses, the player, the AI tutor, and profile. Bottom navigation with
four destinations at most. Content the learner doesn't own is visible with no price and no purchase
action anywhere in the app. Home renders instantly from cache and updates behind that — never a
spinner on the most-opened screen. Respect the device's safe areas and never let the keyboard cover
the field being typed into.

Finally: audit everything we've built together. List every component that ended up in the system,
flag any two components that do the same job under different names, and merge them. Then give me the
final published design system with nothing duplicated.
```

---

## Review each output against this before you keep it

```
□ It is not a generic SaaS dashboard — it looks like this product and no other
□ No gradient anywhere, in any theme, on any element
□ Locked content is fully readable, never blurred or dimmed into illegibility
□ The learner's progress leads with a date and days remaining, not a percentage
□ Exactly one dominant action per screen
□ Arabic reads naturally in Egyptian dialect — not translated, not formal
□ English technical terms inside Arabic lines sit correctly and don't break direction
□ Western digits everywhere
□ Verified in Arabic RTL and English LTR, and in both themes
□ Mobile is designed, not squeezed — and nothing from desktop went missing
□ Every state is present: loading, empty, error with retry, offline, no-permission
□ An empty state contains the action that resolves it
□ An action a person can't perform is absent, not greyed out
□ No emoji used as an icon, no stock illustration, no invented data
□ Nothing exists twice — every element came from the design system
```

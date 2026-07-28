# 04 — Feature Catalog · Part 5

### Modules `M18`–`M21` — Localization, Mobile, Public Site, Infrastructure

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 04 — Feature Catalog (Part 5 of 5) |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `03-features-identification.md`, `04-feature-catalog-part-1.md` through `-part-4.md` |
| **Feeds Into** | `08-system-design.md`, `09-system-architecture.md`, `12-ui-ux-design.md`, `13-tech-stack.md`, `14-security-design.md`, `15-implementation-roadmap.md` |
| **Covers** | `FEAT-184` – `FEAT-220` (37 features) · `BR-523` – `BR-620` |

---

# `M18` — Localization & Theming

`PRIN-07`: Arabic is designed first, English is a complete parallel. `CON-07`: bilingual storage exists from day one because retrofitting it is prohibitively expensive.

---

### `FEAT-184` — Bilingual Interface

**Why:** The learner base is Arabic-dominant, but technical learners move between languages constantly. Serving only one alienates part of the audience.

**Behavior:**
- Complete Arabic and English string catalogs for web, mobile, admin, and email.
- Namespaced keys organized by domain (`course.enroll.button`).
- Interpolation with named variables and correct pluralization for both languages.
- Arabic authored first; English translated from it.

**Rules:**
- `BR-523` — No user-facing string is hardcoded. Every string lives in the catalog, including error messages and email subjects.
- `BR-524` — A missing English string falls back to Arabic. A missing Arabic string is a build-time failure — Arabic is the source of truth (`PRIN-07`).
- `BR-525` — Arabic pluralization implements all six CLDR forms (zero, one, two, few, many, other). English two-form logic applied to Arabic produces visibly wrong text.
- `BR-526` — Dates, numbers, and currency use locale-aware formatting, never manual string building.

---

### `FEAT-185` — RTL / LTR Layout System

**Why:** Arabic RTL done badly is immediately visible and reads as amateur — directly undermining the premium positioning (`GOAL-07`).

**Behavior:**
- Direction set at the document root and propagated through logical CSS properties.
- All spacing, borders, and positioning use logical properties (`margin-inline-start`, not `margin-left`).
- Directional icons (arrows, chevrons, progress) mirror automatically; non-directional icons do not.
- Mobile uses the platform RTL layout system with the same logical rules.

**Rules:**
- `BR-527` — Physical CSS direction properties are prohibited. Logical properties only.
- `BR-528` — Icons carrying direction meaning mirror; brand marks, media controls, and checkmarks never mirror.
- `BR-529` — Video player controls remain LTR in both languages. Universal media convention; mirroring them confuses everyone.
- `BR-530` — Every screen is verified in both directions before release. RTL is not a post-launch pass.

---

### `FEAT-186` — Bilingual Content Fields

**Why:** `CON-07`. Adding a second language to a live content database after launch requires migrating every row and rewriting every query.

**Behavior:**
- User-facing content stored as `jsonb`: `{ "ar": "...", "en": "..." }`.
- Applies to course titles, descriptions, section and lesson titles, Lesson Notes blocks, quiz questions and options, resource titles, product names, and email templates.
- Admin editors provide side-by-side or tabbed language entry with a completeness indicator.

**Rules:**
- `BR-531` — Arabic is required; English is optional and falls back to Arabic (`BR-124`, `BR-524`).
- `BR-532` — Full-text search indexes both languages with their respective PostgreSQL configurations (`BR-204`).
- `BR-533` — Admin shows per-item translation completeness so gaps are visible without auditing.
- `BR-534` — AI embeddings are generated per language separately (`BR-300`).

---

### `FEAT-187` — Mixed-Direction Typography

**Why:** The defining real-world condition of this audience: Arabic explanation containing English technical terms in the same sentence (`02` §7). Handled poorly, it renders as visual chaos.

**Behavior:**
- Unicode bidirectional algorithm with explicit isolation around embedded LTR runs.
- Inline code and technical terms wrapped in isolation so surrounding Arabic is unaffected.
- Fonts: IBM Plex Sans Arabic for Arabic, Inter for Latin, JetBrains Mono for code — paired for consistent vertical rhythm.
- Numbers render as Arabic-Indic or Western per user preference, defaulting to Western for technical content.

**Rules:**
- `BR-535` — Embedded LTR content uses isolation, not embedding. Without isolation, trailing punctuation jumps to the wrong side.
- `BR-536` — Code blocks are always LTR with left alignment regardless of interface direction.
- `BR-537` — Font stacks are paired so mixed-language lines share a baseline and x-height. Mismatched fonts make mixed text look broken even when the direction is correct.

---

### `FEAT-188` — Language Switcher

**Behavior:**
- Available in the header and in settings; persisted to the profile and applied across web, mobile, and email.
- Initial language detected from browser or device, overridable.
- Switching preserves the current page and scroll position.

**Rules:**
- `BR-538` — Language preference syncs across devices via the profile, not local storage alone.
- `BR-539` — Email language follows the profile preference at send time.
- `BR-540` — Public pages support per-language URLs for SEO (`FEAT-206`).

---

### `FEAT-189` — Light / Dark / System Modes

**Why:** The founder's explicit requirement. Learners read Lesson Notes and code for extended periods; forcing one mode is a comfort failure.

**Behavior:**
- Three options: Light, Dark, System (follows OS).
- Each mode is an independently designed palette, not an inversion.
- Preference persisted to the profile and applied before first paint to prevent flashing.

**Rules:**
- `BR-541` — Light mode uses independently chosen values, not inverted dark values. The accent gold darkens in light mode to maintain contrast.
- `BR-542` — All text meets WCAG AA contrast (4.5:1 body, 3:1 large) in both modes.
- `BR-543` — The video player remains dark in all modes (`BR-063`). This is a deliberate, documented exception.
- `BR-544` — Theme is applied server-side or pre-hydration. A white flash before dark mode loads is a visible quality defect.

---

### `FEAT-190` — Semantic Design Tokens

**Why:** Three clients (web, mobile, admin) with duplicated color values guarantees drift. Drift makes the product look unfinished.

**Behavior:**
- Single token package in the monorepo, consumed by all clients.
- Semantic naming only: `--bg-base`, `--bg-surface`, `--border-subtle`, `--text-primary`, `--text-secondary`, `--accent`, `--accent-hover`, `--success`, `--warning`, `--danger`.
- Also covers spacing scale, radii, typography scale, shadows, and motion durations.
- Web consumes CSS custom properties; mobile consumes generated native constants.

**Rules:**
- `BR-545` — Raw color values are prohibited in components. Tokens only.
- `BR-546` — Token names describe purpose, never appearance. `--accent`, never `--gold`.
- `BR-547` — Adding a token requires adding it to every mode. A token defined only in dark mode is a bug.

---

### `FEAT-191` — Locale Formatting

**Behavior:**
- Dates formatted per locale with an option for Hijri display alongside Gregorian.
- Relative times localized ("منذ ٣ أيام" / "3 days ago").
- Currency formatted with correct symbol placement per locale.
- Durations formatted naturally, not as raw minutes.

**Rules:**
- `BR-548` — All timestamps stored in UTC and rendered in the user's timezone (`BR-022`).
- `BR-549` — Currency symbol placement follows locale convention, not a fixed template.
- `BR-550` — Week start day is configurable, defaulting to Saturday for the regional audience (`BR-235`).

---

# `M19` — Mobile Application

A **full learning client**, not a viewer (`02` §9.3). Everything except purchasing (`NG-05`).

---

### `FEAT-192` — Cross-Platform Application

**Why:** `PERS-03` consumes primarily on mobile. A single codebase is the only realistic option for a one-person team (`CON-01`).

**Behavior:**
- One React Native codebase for iOS and Android.
- Shared types, API client, permission definitions, and design tokens from the monorepo.
- Over-the-air updates for JavaScript changes, avoiding store review for most releases.

**Rules:**
- `BR-551` — Business logic lives in shared packages, never duplicated per platform.
- `BR-552` — Platform-specific code is limited to protection APIs (`FEAT-141`), push, and secure storage.
- `BR-553` — Over-the-air updates never alter native capabilities or bypass store review requirements.

---

### `FEAT-193` — Mobile Authentication

**Behavior:**
- Google, email/password, and phone OTP — identical to web (`FEAT-001`–`FEAT-003`).
- Tokens in Keychain (iOS) and EncryptedSharedPreferences (Android) (`BR-018`).
- Optional biometric unlock for app re-entry.
- Sessions persist across app restarts.

**Rules:**
- `BR-554` — Tokens are never written to `AsyncStorage` or any unencrypted store.
- `BR-555` — Biometric unlock gates app access only; it never substitutes for authentication with the server.
- `BR-556` — Logout clears all local data including cached content metadata.

---

### `FEAT-194` — Mobile Video Playback

**Why:** The most protection-sensitive surface, and the one where real prevention is technically possible.

**Behavior:**
- Native player consuming the same signed tokens as web (`FEAT-133`).
- Provider-rendered watermarking (`FEAT-134`).
- Device binding enforced identically (`FEAT-135`).
- Capture blocking active (`FEAT-141`).
- Background audio disabled; playback pauses when the app backgrounds.
- Picture-in-picture disabled — it bypasses capture protections.

**Rules:**
- `BR-557` — Video is never cached to device storage (`NG-09`).
- `BR-558` — Background playback and PiP are disabled deliberately, and this is explained in the app rather than failing silently.
- `BR-559` — Playback pauses on capture detection with an informational message (`BR-398`).
- `BR-560` — External display mirroring via AirPlay or Chromecast is permitted (`BR-399`).

---

### `FEAT-195` — Cross-Device Progress Sync

**Why:** `PERS-03` watches on the commute and continues on a laptop at night. A break in continuity here breaks the persona's entire usage pattern.

**Behavior:**
- Playback position, completion, notes, quiz attempts, and streaks sync bidirectionally.
- Position updates batched and sent every 10 seconds (`BR-175`).
- Offline actions queued and replayed on reconnection.
- Conflicts resolved by most recent timestamp (`BR-174`).

**Rules:**
- `BR-561` — Sync failures never block the learner. Local state applies immediately and reconciles later.
- `BR-562` — Queued offline actions expire after 7 days.
- `BR-563` — Completion is never un-completed by a stale sync. Completion is monotonic.

---

### `FEAT-196` — Mobile Dashboard

**Behavior:**
- Identical block structure and order to web (`FEAT-082`).
- Continue as the dominant element, sized for one-handed reach.
- Pull-to-refresh; single aggregated request (`BR-227`).

**Rules:**
- `BR-564` — Block order matches web exactly. Learners move between surfaces; a different mental model on each is a cost.
- `BR-565` — The dashboard renders from cache immediately, then updates. A spinner on the most-opened screen is unacceptable.

---

### `FEAT-197` — Mobile AI Tutor

**Behavior:**
- Full AI tutor with streaming responses.
- Shared conversation history with web (`FEAT-113`).
- Citations open the lesson at the referenced timestamp (`FEAT-111`).
- Quota display identical to web.

**Rules:**
- `BR-566` — Streaming is required. A blank wait on mobile reads as a failure.
- `BR-567` — Interrupted requests do not consume quota (`BR-322`).

---

### `FEAT-198` — Mobile Quizzes

**Behavior:**
- All question types with touch-optimized input.
- Progress preserved if the app backgrounds mid-quiz.
- Timed quizzes pause on interruption (`BR-265`).

**Rules:**
- `BR-568` — An interrupted attempt is never auto-failed. It resumes or is discarded at the learner's choice.
- `BR-569` — Answers are submitted incrementally so a crash never loses a full attempt.

---

### `FEAT-199` — Mobile Notes & Q&A

**Behavior:**
- Timestamped note capture during playback with a compact input that does not obscure video.
- Notes hub with search (`FEAT-073`).
- Question submission and Q&A browsing.
- Notes drafted offline sync on reconnection.

**Rules:**
- `BR-570` — Note input never covers more than the lower third of the screen during playback.
- `BR-571` — Draft notes persist locally until synced. A lost note is a lost learner trust event.

---

### `FEAT-200` — Purchase Redirection

**Why:** `NG-05`. In-app purchase would surrender 30% of revenue and subject pricing to store policy.

**Behavior:**
- The app displays owned content and free content.
- Content the learner does not own appears with its unlock state but **no purchase action inside the app**.
- Where store policy permits, an account-level link directs to the web account area.

**Rules:**
- `BR-572` — No payment UI, no prices, and no purchase call-to-action inside the app. Apple's guidelines prohibit steering users to external purchase in most categories, and violations risk removal.
- `BR-573` — Locked content still displays its title and unlock state (`PRIN-03`), phrased without commercial language: "not included in your access" rather than "buy now."
- `BR-574` — Purchases made on web appear in the app within seconds of entitlement sync.
- `BR-575` — **Compliance risk, tracked:** store policy for non-reader educational apps evolves. Review Apple and Google guidelines before each store submission, and treat this rule as revisable.

---

### `FEAT-201` — Push Notification Handling

**Behavior:**
- Token registration on login, deregistration on logout.
- Deep links route directly to the relevant lesson, ticket, or Q&A thread.
- Foreground notifications render in-app rather than as system banners.
- Badge count reflects unread notifications.

**Rules:**
- `BR-576` — Every push carries a deep link. A push that opens the home screen wastes the interruption.
- `BR-577` — Tokens are deregistered on logout to prevent notifications reaching a shared device.
- `BR-578` — Quiet hours enforced client-side as a second layer (`BR-418`).

---

# `M20` — Public Site & Acquisition

The entire top of the funnel. `SEG-01` decides here whether the academy is credible.

---

### `FEAT-202` — Landing Page

**Behavior:**
- Positioning statement, the problem the academy solves, how the guided journey works, featured courses, verified reviews, certificate verification entry, and a primary registration action.
- Bilingual with separate URLs per language.
- Server-rendered for speed and indexing.

**Rules:**
- `BR-579` — Above-the-fold content renders server-side. First contentful paint is the first quality signal a visitor receives.
- `BR-580` — The page leads with the outcome (finishing and proving a skill), not with a feature list.
- `BR-581` — Trust elements — free previews, visible curriculum, verified reviews, refund clarity — appear above the fold for an audience with a low trust baseline (`02` §7).

---

### `FEAT-203` — Course Catalog

**Behavior:**
- Grid with filters: category, level, language, price range, duration, rating.
- Sort by newest, popular, or rating.
- Each card shows title, thumbnail, level, duration, lesson count, price, and rating when the threshold is met (`BR-368`).
- Free courses clearly marked.

**Rules:**
- `BR-582` — Owned courses display "continue learning" instead of a price (`BR-076`).
- `BR-583` — Server-rendered and paginated for indexing.
- `BR-584` — Filters reflect in the URL so results are shareable and indexable.

---

### `FEAT-204` — Course Detail Page

**Why:** The conversion page. Everything a visitor needs to decide, with nothing hidden.

**Behavior:**
- Title, outcomes, target audience, requirements, trailer video.
- **Full curriculum outline** with every section and lesson title and duration — including locked ones (`PRIN-03`).
- Free preview lessons marked and immediately playable.
- Instructor profile, reviews (above threshold), FAQ, and refund policy.
- Sticky purchase panel with price and what is included.

**Rules:**
- `BR-585` — The full curriculum is public. Hiding lesson titles until purchase signals something to hide, which this audience reads correctly.
- `BR-586` — The purchase panel lists exactly what the product grants, generated from its entitlements (`FEAT-043`). No mismatch between marketing and reality is possible.
- `BR-587` — Owned courses replace the purchase panel with progress and a continue action.
- `BR-588` — Estimated completion time is shown based on typical weekly commitments, previewing the goal mechanic before signup (`GOAL-02`).

---

### `FEAT-205` — Free Preview Lessons

**Why:** The strongest trust instrument available. Watching the instructor teach for eight minutes settles the purchase decision better than any copy.

**Behavior:**
- Lessons flagged `is_preview` (`DEC-08`) play without authentication.
- Watermarked with a generic academy mark rather than learner identity.
- Post-preview: a soft prompt showing what comes next in the course.

**Rules:**
- `BR-589` — Previews require no registration. An email gate before value is delivered costs more conversions than it captures.
- `BR-590` — Previews are excluded from device binding and quota systems.
- `BR-591` — Preview Lesson Notes are publicly visible and indexable (`FEAT-206`).

---

### `FEAT-206` — SEO Optimization

**Why:** With no advertising budget (`CON-02`), organic search is the primary discovery channel.

**Behavior:**
- Per-page metadata, Open Graph, and Twitter cards in both languages.
- Structured data: `Course`, `Organization`, `Review`, `FAQPage`, `BreadcrumbList`.
- `hreflang` pairs for Arabic and English URLs.
- Sitemap generated automatically, including course, preview lesson, and public Lesson Notes pages.
- Public Lesson Notes excerpts for preview lessons create indexable technical content.

**Rules:**
- `BR-592` — Only preview lesson notes are public. Paid Lesson Notes are never exposed to crawlers (`GOAL-04`).
- `BR-593` — Arabic content targets Arabic queries specifically. Translated-from-English keyword targeting performs poorly in Arabic search.
- `BR-594` — Slugs are stable after publication (`BR-126`); changes issue permanent redirects.
- `BR-595` — Certificate verification pages are indexable (`BR-288`).

---

### `FEAT-207` — Public Certificate Verification

Behavior and rules specified in `FEAT-104`. Listed here as an acquisition surface: every verification is a visit from someone who already trusts the credential.

**Rules:**
- `BR-596` — The page includes a discreet path to the course that produced the certificate.

---

### `FEAT-208` — Blog / Articles

**Why:** Organic acquisition and topical authority. Also the natural destination for content that does not belong in a course.

**Behavior:**
- Bilingual articles with the same block editor as Lesson Notes (`FEAT-053`).
- Categories, tags, author attribution, reading time.
- Related course recommendations inline.
- RSS feed and full structured data.

**Rules:**
- `BR-597` — Articles reuse the Lesson Notes editor. A separate content system for blogging is duplicated work.
- `BR-598` — Every article links to at least one relevant course.

---

### `FEAT-209` — Legal Pages

**Behavior:** Terms of service, privacy policy, refund policy, and cookie policy — bilingual, versioned, with last-updated dates.

**Rules:**
- `BR-599` — The refund policy is linked from checkout, not buried in the footer. Clarity here reduces disputes and increases conversion.
- `BR-600` — Material changes to terms notify existing learners.
- `BR-601` — Prior versions are retained and accessible.

---

### `FEAT-210` — Contact & Inquiry Form

**Behavior:**
- Public form for pre-purchase questions from `SEG-01`.
- Fields: name, email, subject, message, with spam protection.
- Creates a ticket in the support system (`FEAT-154`) marked as an unauthenticated inquiry.

**Rules:**
- `BR-602` — Inquiries enter the same queue as tickets. A second inbox is a second thing to forget.
- `BR-603` — Rate-limited by IP.
- `BR-604` — Automatic acknowledgment with an expected response time.

---

# `M21` — Platform & Infrastructure

Constrained by 2 vCPU, 8 GB RAM, one server, and roughly $30/month (`CON-02`, `CON-03`, `CON-09`).

---

### `FEAT-211` — Modular Monolith Structure

**Why:** Microservices on a 2 vCPU single server would consume more resources in overhead than in application work, with no benefit for a one-person team (`CON-01`).

**Behavior:**
- One deployable backend, internally organized into domain modules mirroring `M01`–`M21`.
- Modules communicate through explicit interfaces, never by reaching into each other's internals.
- Each module owns its tables; cross-module reads go through the owning module's service layer.
- Domain events for cross-module reactions (purchase completed → grant entitlement → send email).

**Rules:**
- `BR-605` — No module queries another module's tables directly. This boundary is what makes future extraction possible without a rewrite.
- `BR-606` — Cross-module side effects flow through domain events, not direct calls, so adding a listener never modifies the publisher.
- `BR-607` — Module boundaries mirror this catalog's module structure so documentation and code stay aligned.

---

### `FEAT-212` — External CI Image Builds

**Why:** `next build` on 2 vCPU takes many minutes and saturates the CPU — meaning the live platform is degraded or down during every deployment.

**Behavior:**
- Push to the main branch triggers GitHub Actions.
- Actions runs tests, builds Docker images, and pushes to a container registry.
- Coolify pulls the pre-built image and performs a rolling restart.
- Deployment on the server takes seconds, not minutes.

**Rules:**
- `BR-608` — No application build ever runs on the production server (`CON-03`).
- `BR-609` — Images are tagged by commit SHA, making rollback a matter of redeploying a previous tag.
- `BR-610` — Database migrations run as a separate step before the new image goes live, and must be backward compatible with the previous release.

---

### `FEAT-213` — Background Job Queue

**Why:** Email, PDF rendering, embeddings, and webhook processing must never block a request thread on a CPU-constrained server.

**Behavior:**
- Redis-backed queue (BullMQ) with named queues per workload type.
- Concurrency limits per queue tuned to available CPU.
- Retries with exponential backoff; failed jobs land in a dead-letter queue.
- Admin visibility into queue depth and failures.

**Rules:**
- `BR-611` — Queues are separated by workload so a slow embedding batch never delays a purchase confirmation email.
- `BR-612` — Total worker concurrency is capped to leave CPU headroom for request serving (`CON-03`).
- `BR-613` — Every job is idempotent. Retries must be safe (`BR-096`).
- `BR-614` — Jobs failing after all retries alert the founder rather than disappearing.

---

### `FEAT-214` — Scheduled Task Runner

**Behavior:**

| Task | Frequency |
|---|---|
| Entitlement expiry notifications | Hourly |
| Subscription renewal reminders | Daily |
| Inactivity re-engagement evaluation | Daily |
| Streak evaluation and freeze application | Daily, per timezone |
| Quota period resets | Daily |
| Pending payment reconciliation (`BR-069`) | Every 15 minutes |
| Database backup | Daily |
| Analytics aggregation | Hourly |
| Stale session cleanup | Hourly |

**Rules:**
- `BR-615` — Scheduled tasks run through the job queue, never as inline cron scripts, so they inherit retries and observability.
- `BR-616` — Timezone-sensitive tasks (streaks, reminders) run per timezone bucket, not once at server midnight (`BR-207`).
- `BR-617` — Heavy aggregation runs during regional off-peak hours (04:00–07:00 local), away from the 20:00–01:00 learning peak (`02` §7).

---

### `FEAT-215` — Automated Off-Server Backups

**Why:** `CON-09`. One server means one failure destroys everything. Hostinger's weekly snapshot would lose up to seven days of purchases — unacceptable for a platform holding money.

**Behavior:**
- Daily `pg_dump`, compressed and encrypted, uploaded to Cloudflare R2.
- 30-day retention with automatic pruning.
- Weekly restore verification: restore into a temporary database and confirm row counts.
- Backup status surfaced on the operations dashboard (`FEAT-163`).

**Rules:**
- `BR-618` — Backups are stored off-server. A backup on the same VPS is not a backup.
- `BR-619` — Backups are encrypted at rest with a key stored outside R2.
- `BR-620` — A failed backup alerts immediately. Silent backup failure is the most dangerous failure mode in the system.
- `BR-621` — Restore is verified weekly. An unverified backup is an assumption, not a safeguard.
- `BR-622` — Uploaded media on R2 is separately protected by bucket versioning.

---

### `FEAT-216` — Uptime Monitoring & Alerting

**Behavior:**
- External health checks every minute against a `/health` endpoint reporting database, Redis, and queue status.
- Alerts by push and email on downtime, sustained high error rate, or degraded response time.
- Public status visibility optional.

**Rules:**
- `BR-623` — Monitoring is external. A monitor on the monitored server cannot report that the server is down.
- `BR-624` — The health endpoint verifies real dependencies, not just process liveness.
- `BR-625` — Alerts reach the founder by push, not email alone — an email alert during an email outage is useless.

---

### `FEAT-217` — Structured Logging

**Behavior:**
- JSON logs with a correlation ID propagated through every request and job.
- Levels: debug, info, warn, error. Production defaults to info.
- Log fields include user ID, route, duration, and status.
- Retained 30 days, rotated to control disk usage on a 100 GB volume.

**Rules:**
- `BR-626` — PII, tokens, passwords, and payment data are never logged, including in error payloads.
- `BR-627` — Every request and job carries a correlation ID, making a single learner's issue traceable end to end.
- `BR-628` — Log volume is bounded. Unbounded logging fills the disk and takes the platform down.

---

### `FEAT-218` — Error Tracking

**Behavior:**
- Centralized exception capture with grouping, stack traces, and release tagging.
- Source maps uploaded for readable frontend traces.
- Alerts on new error types and on volume spikes.
- Security events (failed authorization, suspicious patterns) tracked separately (`BR-496`).

**Rules:**
- `BR-629` — Errors are grouped by fingerprint. One recurring error must not generate hundreds of alerts.
- `BR-630` — Error reports carry the correlation ID (`BR-627`).
- `BR-631` — User-facing error messages never expose internal details. Learners see a friendly message; the trace goes to the tracker.

---

### `FEAT-219` — Rate Limiting

**Behavior:**

| Surface | Limit |
|---|---|
| Authentication endpoints | 5 attempts / 15 min / IP |
| OTP requests | 3 / hour / number (`BR-007`) |
| Password reset | 3 / hour / email |
| AI messages | Quota-governed plus 10 / minute burst |
| Certificate verification | 20 / hour / IP (`BR-287`) |
| File downloads | 30 / hour / user (`BR-402`) |
| General API | 100 / minute / user |
| Public pages | 300 / minute / IP |

- Redis-backed sliding window with clear retry-after responses.

**Rules:**
- `BR-632` — Rate limit responses state when the limit resets, never a bare rejection (`PRIN-02`).
- `BR-633` — Limits are per-user where authenticated, per-IP otherwise. Shared networks are common in this region and pure IP limiting punishes legitimate learners.
- `BR-634` — Cloudflare provides a first layer of protection ahead of the application (`CON-02`).

---

### `FEAT-220` — Object Storage Abstraction

**Behavior:**

```
StorageProvider
├── upload(key, stream, metadata)
├── getSignedUrl(key, expiry)
├── delete(key)
└── getMetadata(key)
```

- Cloudflare R2 implementation (`CON-05`).
- Path conventions per content type: `certificates/`, `resources/`, `avatars/`, `invoices/`, `tickets/`, `backups/`.
- Lifecycle rules for automatic pruning of temporary objects.

**Rules:**
- `BR-635` — All buckets are private. No object is ever publicly readable except explicitly public assets under a dedicated prefix.
- `BR-636` — Signed URL expiry is set per content type: 5 minutes for resources (`BR-401`), longer for avatars and public images.
- `BR-637` — Uploads are validated by content type and size before storage.
- `BR-638` — Zero egress cost is the reason R2 is chosen; serving video from R2 is prohibited (video belongs to the video provider, `CON-04`).

---

## Coverage Summary — Part 5

| Module | Features | Business Rules |
|---|---:|---:|
| `M18` Localization & Theming | 8 | `BR-523`–`BR-550` |
| `M19` Mobile Application | 10 | `BR-551`–`BR-578` |
| `M20` Public Site | 9 | `BR-579`–`BR-604` |
| `M21` Platform & Infrastructure | 10 | `BR-605`–`BR-638` |
| **Total** | **37** | **116 rules** |

---

# Catalog Complete

| Part | Modules | Features | Rules |
|---|---|---:|---:|
| 1 | `M01`–`M04` | 46 | 122 |
| 2 | `M05`–`M07` | 42 | 122 |
| 3 | `M08`–`M13` | 55 | 163 |
| 4 | `M14`–`M17` | 40 | 115 |
| 5 | `M18`–`M21` | 37 | 116 |
| **Total** | **21 modules** | **220** | **638** |

Every feature identified in `03-features-identification.md` is now specified. Every business rule carries a stable ID for reference by `07-business-logic.md`, `10-database-design.md`, `11-api-contract.md`, and `14-security-design.md`.

---

## Open Items Flagged During Cataloging

| ID | Item | Blocking | Owner |
|---|---|---|---|
| `OQ-10` | Apple App Store policy for educational apps with external purchase — confirm before first submission (`BR-575`) | `M19` build | Founder |
| `OQ-11` | Hijri calendar display — required alongside Gregorian, or Gregorian only? (`BR-548`) | `12-ui-ux-design` | Founder |
| `OQ-12` | Blog module (`FEAT-208`) — launch alongside the platform or after first revenue? | `15-implementation-roadmap` | Founder |

---

## Approval — Part 5 & Full Catalog

| Item | Status |
|---|---|
| Arabic-first localization rules, including Arabic-as-source-of-truth (`BR-524`) | ☐ Approved |
| Mixed-direction typography approach is correct | ☐ Approved |
| Light and dark as independently designed palettes is accepted | ☐ Approved |
| Mobile as a full client with no purchase UI (`BR-572`) is accepted | ☐ Approved |
| Full public curriculum visibility (`BR-585`) is accepted | ☐ Approved |
| Modular monolith with strict module boundaries is accepted | ☐ Approved |
| External CI builds — no building on the production server | ☐ Approved |
| Backup strategy including weekly restore verification is accepted | ☐ Approved |
| **The full 220-feature catalog is complete and nothing is missing** | ☐ Approved |

**Next document:** `05-roles-and-permissions.md` — the complete permission registry, role definitions, permission matrices, scoping rules, and the capability map specification.

---

# 04 — Feature Catalog · Part 2

### Modules `M05`–`M07` — Content, Learning Experience, Goals & Motivation

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 04 — Feature Catalog (Part 2 of 5) |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `03-features-identification.md`, `04-feature-catalog-part-1.md` |
| **Feeds Into** | `06-user-flows.md`, `07-business-logic.md`, `10-database-design.md`, `11-api-contract.md`, `12-ui-ux-design.md` |
| **Covers** | `FEAT-047` – `FEAT-088` (42 features) · `BR-123` – `BR-238` |

---

> **This is the product.** Everything in Part 1 exists so that this part can happen. `M05` is what the founder authors, `M06` is what the learner experiences, and `M07` is what makes them come back tomorrow.

---

# `M05` — Content Management

Authored by `PERS-10`, `PERS-11`, and `PERS-12`. Usability here is calibrated to the **least technical** of the three (`PERS-12`), per the design implications in `02`.

---

### `FEAT-047` — Course CRUD

**Why:** The container for everything a learner buys and completes.

**Actors:** `PERS-10`, `PERS-11`, `PERS-12`

**Behavior:**
A course carries bilingual title, subtitle, description, learning outcomes, requirements, target audience, level, category, tags, thumbnail, trailer video, estimated duration, and status.

- Duration is computed from lesson durations, with a manual override.
- Slug auto-generated per language, independently editable.
- Soft delete only; archived courses remain accessible to existing owners.

**Rules:**
- `BR-123` — Every user-facing text field is stored as `jsonb` with `ar` and `en` keys (`CON-07`). Arabic is required; English falls back to Arabic when empty rather than rendering blank.
- `BR-124` — A course cannot be published without: title (both languages or Arabic + fallback), thumbnail, at least one published lesson, and a price or an explicit free flag.
- `BR-125` — Deleting a course that has enrollments is not offered. Archiving is offered instead (`PRIN-01`).
- `BR-126` — Slugs are immutable after first publication. Changing them breaks SEO and shared links; a redirect table handles intentional changes.

**Edge cases:**
- Course archived while learners are mid-progress → they retain full access; the course simply disappears from the public catalog.

---

### `FEAT-048` — Section / Module Structure

**Why:** A flat list of 80 lessons is not a path. Sections create the sense of measurable stages.

**Actors:** Staff

**Behavior:**
- Ordered sections, each with a bilingual title, optional description, and ordered lessons.
- Section-level progress and completion state shown to learners.
- Sections may carry their own unlock rules (`FEAT-069`).

**Rules:**
- `BR-127` — A course must contain at least one section. Lessons never attach directly to a course.
- `BR-128` — Deleting a section requires moving or deleting its lessons first; the UI offers to move them rather than blocking.
- `BR-129` — Section completion is a motivation milestone and triggers a celebration (`FEAT-087`).

---

### `FEAT-049` — Lesson CRUD

**Why:** The atomic unit of learning and of progress.

**Actors:** Staff

**Behavior:**
Lesson types:

| Type | Content |
|---|---|
| `video` | Video + Lesson Notes + resources |
| `text` | Lesson Notes only (written lesson) |
| `quiz` | Assessment (`M08`) |
| `assignment` | Task with submission |

Each lesson carries: bilingual title, type, order, duration, preview flag, required flag, unlock rules, and status.

**Rules:**
- `BR-130` — `is_required = false` marks a lesson optional; optional lessons are excluded from progress and completion calculations.
- `BR-131` — `is_preview = true` makes a lesson publicly accessible with no entitlement (`DEC-08`, `BR-104`).
- `BR-132` — Changing a lesson's type after learners have progress on it is not offered. Create a new lesson instead.
- `BR-133` — Reordering lessons never invalidates existing progress. Progress binds to lesson ID, never to position.

---

### `FEAT-050` — Drag-and-Drop Curriculum Builder

**Why:** Structure is edited constantly during authoring. A form-based reorder makes that painful enough that it stops happening — and the curriculum degrades.

**Actors:** `PERS-12`, `PERS-10`, `PERS-11`

**Behavior:**
- Single screen showing the full course tree.
- Drag lessons within and across sections; drag sections to reorder.
- Inline editing of titles; inline add; per-item status indicators.
- Order persisted optimistically with rollback on failure.

**Rules:**
- `BR-134` — Ordering uses fractional or gapped integer positions so a single move updates one row, not the whole tree.
- `BR-135` — Every destructive action requires confirmation naming the item explicitly (`PERS-12` calibration).

---

### `FEAT-051` — Video Upload to Bunny Stream

**Why:** The VPS has 2 vCPU. Transcoding on-server would freeze the entire platform for hours (`CON-03`).

**Actors:** Staff

**Behavior:**
- Backend requests an upload authorization from Bunny.
- The browser uploads **directly to Bunny**; video bytes never touch the VPS.
- Resumable, chunked upload with visible progress.
- Bunny webhook reports transcoding completion; the lesson flips from `processing` to `ready`.

**Rules:**
- `BR-136` — Video never transits or is stored on the VPS.
- `BR-137` — A lesson in `processing` cannot be published; the UI shows status rather than an error.
- `BR-138` — Upload authorization tokens are single-use and expire in 1 hour.
- `BR-139` — Replacing a lesson's video preserves the lesson ID and therefore all learner progress and notes.

**Edge cases:**
- Transcoding fails → the lesson is flagged in admin with a retry action, and the founder is notified.
- Browser closed mid-upload → resumable upload allows continuation.

---

### `FEAT-052` — Video Provider Abstraction

**Why:** `NG-06` defers hardware DRM until revenue justifies it. That upgrade must not become a rewrite (`CON-04`).

**Actors:** System

**Behavior:**

```
VideoProvider
├── requestUpload(metadata)
├── getPlaybackToken(videoId, user, device)
├── getMetadata(videoId)
├── applyWatermark(config)
└── delete(videoId)
```

Implementations: `BunnyStreamProvider` now, `VdoCipherProvider` later.

**Rules:**
- `BR-140` — No application code references a provider SDK directly. All access flows through the interface.
- `BR-141` — Provider-specific video identifiers are stored alongside a provider key, so a mixed-provider library is possible during migration.

---

### `FEAT-053` — Lesson Notes Editor

**Why:** The founder's decision to author notes manually rather than auto-transcribe (`NG-07`). One authoring effort produces four assets: AI knowledge, a readable summary, player chapters, and SEO-indexable content.

**Actors:** `PERS-10`, `PERS-11`, `PERS-12`

**Behavior:**
Block-based editor. Block types:

| Block | Purpose |
|---|---|
| `heading` | Section within the notes |
| `paragraph` | Explanation text |
| `code` | Code with language and syntax highlighting |
| `callout` | Warning, tip, or important note |
| `list` | Ordered or unordered |
| `image` | Screenshot or diagram |
| `table` | Structured comparison |

- Each block optionally carries `start_time` and `end_time` (`FEAT-054`).
- Bilingual: blocks authored in Arabic, with optional English.
- Autosave with draft/published states independent of the lesson.

**Rules:**
- `BR-142` — Lesson Notes are the **sole source** for AI embeddings (`FEAT-108`). Quality here directly determines AI answer quality.
- `BR-143` — Recommended minimum for a video lesson: 5 blocks. The editor surfaces this as guidance, never as a block on publishing.
- `BR-144` — Blocks are stored structurally, not as a single HTML blob — chunking for RAG depends on structure.
- `BR-145` — Editing notes marks the lesson's embeddings stale; re-indexing is queued automatically (`FEAT-213`).

**Edge cases:**
- Mixed Arabic/English inside one paragraph → stored as-is; rendering handles bidirectional text (`FEAT-187`).

---

### `FEAT-054` — Timestamp-Linked Note Blocks

**Why:** The mechanism connecting written knowledge to video moments. Everything downstream — chapters, AI citations, resource surfacing — depends on it.

**Actors:** Staff (authoring), all learners (consuming)

**Behavior:**
- While editing, the author can play the video inline and stamp the current time onto a block with one action.
- Learner side: clicking a block seeks the player to that moment.
- Player side: the active block highlights as playback advances.

**Rules:**
- `BR-146` — Timestamps are optional. A block without one still contributes to AI knowledge and to the readable summary.
- `BR-147` — Timestamps must be non-overlapping and ascending within a lesson; the editor auto-corrects and warns.
- `BR-148` — Replacing a video invalidates timestamps; the editor flags them for review rather than silently keeping wrong values.

---

### `FEAT-055` — Auto-Generated Chapter Markers

**Why:** Free output from work already done. Chapters materially improve navigation for `PERS-03`, who arrives with 20 minutes and a specific question.

**Actors:** All learners

**Behavior:**
- Heading blocks carrying timestamps become player chapters.
- Rendered as segments on the progress bar with labels on hover.
- Chapter list displayed beside the player, current chapter highlighted.

**Rules:**
- `BR-149` — Chapters derive from `heading` blocks only, so authors control granularity by how they structure notes.
- `BR-150` — Fewer than 2 chapters → the chapter UI is hidden entirely rather than shown nearly empty (`PRIN-01`).

---

### `FEAT-056` — Resource Attachments

**Why:** `PERS-02` (Aspiring Freelancer) measures every lesson by what they can take away from it. Project files are the deliverable, not an accessory.

**Actors:** Staff (authoring), all learners (consuming)

**Behavior:**

| Type | Behavior |
|---|---|
| `file` | Uploaded to R2, served via signed URL (`FEAT-142`) |
| `link` | External URL with title, description, favicon |
| `code` | Inline snippet with language and copy action |
| `note` | Markdown text block |
| `embed` | Sandboxed iframe (CodeSandbox, Figma, Sheets) |

- Attachable to a lesson, a section, or a course.
- Ordered, with bilingual titles and descriptions.

**Rules:**
- `BR-151` — Files are stored on R2 and never served from a public URL (`CON-05`).
- `BR-152` — Maximum file size 100 MB. Larger assets use `link` type pointing to external hosting.
- `BR-153` — `embed` sources are restricted to a configurable allowlist. Arbitrary iframe embedding is an XSS vector.
- `BR-154` — Downloads are logged per user for leak tracing (`FEAT-143`).

---

### `FEAT-057` — Resource Timestamp Binding

**Why:** Turns passive watching into an interactive session. "Download the starter files" appearing exactly when it is needed removes a break in flow.

**Actors:** All learners

**Behavior:**
- Optional `appears_at` on a resource.
- A non-intrusive indicator surfaces beside the player at that moment and remains available afterward.
- Resources without a timestamp appear in the lesson's static resource list.

**Rules:**
- `BR-155` — Surfacing never pauses or interrupts playback.
- `BR-156` — Once surfaced, a resource remains accessible for the remainder of the session — it does not disappear when its moment passes.

---

### `FEAT-058` — Resource-Level Entitlements

**Why:** A pricing lever that costs nothing to build once entitlements exist. The lesson can be free while the production-ready project files are not.

**Actors:** `PERS-10`

**Behavior:**
- A resource may require a specific entitlement key.
- Without it, the resource remains **visible** with its title and an unlock invitation (`PRIN-03`).

**Rules:**
- `BR-157` — Gated resources are never hidden. Visibility is the upsell.
- `BR-158` — The unlock message names what grants access, and links directly to it.

---

### `FEAT-059` — Draft / Published States

**Why:** Authoring is iterative. Learners must never see half-finished content.

**Actors:** Staff

**Behavior:**
- States: `draft` → `pending_review` → `published` → `archived`.
- Independent at course, section, and lesson level.
- Staff preview published-as-learner at any time.

**Rules:**
- `BR-159` — A published lesson inside a draft course remains invisible. Parent state always dominates.
- `BR-160` — Unpublishing a lesson learners have already completed retains their completion record and their access to its notes.
- `BR-161` — Publishing a new lesson into a course with existing learners triggers an optional "new content added" notification.

---

### `FEAT-060` — Publish Approval Workflow

**Why:** The academy carries the founder's name. Content quality is brand risk (`PERS-11` boundaries).

**Actors:** `PERS-11`, `PERS-12` → `PERS-10`

**Behavior:**
- Roles holding `course:publish.request` but not `.approve` submit for review.
- Submission enters the approval queue (`FEAT-173`) with an optional note.
- Founder approves, or returns with feedback.
- Returned items retain feedback visibly on the item.

**Rules:**
- `BR-162` — Rejection is always accompanied by a reason. A returned item is a revision request, not a refusal (`PRIN-02`).
- `BR-163` — The founder's own publishes bypass the queue entirely.

---

### `FEAT-061` — Content Versioning

**Why:** Recovering from a bad edit — especially one made by `PERS-12` — should not require a database restore.

**Actors:** Staff

**Behavior:**
- Snapshots of Lesson Notes and course metadata on each publish.
- Version history with author, timestamp, and diff view.
- One-action restore to any prior version.

**Rules:**
- `BR-164` — Last 20 versions retained per item.
- `BR-165` — Restoring creates a new version; history is never rewritten.

---

### `FEAT-062` — Bulk Media Library

**Why:** Reusing an image across ten lessons should not mean uploading it ten times.

**Actors:** `PERS-12`, staff

**Behavior:**
- Central browsable store of uploaded images, files, and documents.
- Search, filter by type, and usage indicator ("used in 3 lessons").
- Selectable from any editor.

**Rules:**
- `BR-166` — Deleting an in-use asset is not offered; the UI shows where it is used instead.
- `BR-167` — Images are auto-optimized to WebP with responsive sizes on upload.

---

# `M06` — Learning Experience

Where `MET-01` is won or lost.

---

### `FEAT-063` — Custom Video Player

**Why:** The provider's default player cannot enforce device binding, surface timestamped resources, sync Lesson Notes, or carry the brand.

**Actors:** All learners

**Behavior:**
- Built on the provider's playback layer (HLS) with a custom UI.
- Layout: video, chapter list, synced Lesson Notes, resources, notes panel, Q&A.
- Always dark-themed regardless of the platform theme (a deliberate exception, `FEAT-189`).
- Requests a playback token per session (`FEAT-133`).

**Rules:**
- `BR-168` — The player never receives a raw video URL. Only a short-lived signed token.
- `BR-169` — Playback token requests validate entitlement, unlock state, and device binding in a single call. Any failure returns a reason, never a generic error (`PRIN-01`).
- `BR-170` — On network failure, playback degrades to a lower bitrate before it stops (`CON-04`).

---

### `FEAT-064` — Playback Controls

**Why:** Baseline expectations. Their absence reads as amateur, which contradicts the premium positioning.

**Actors:** All learners

**Behavior:**
- Play/pause, seek, volume, speed (0.5×–2×), quality selection, captions, fullscreen, picture-in-picture.
- Keyboard shortcuts: space, arrows, `F`, `M`, `[` `]` for speed.
- Preferences (speed, quality, volume) persist across lessons and devices.

**Rules:**
- `BR-171` — Seeking forward is unrestricted within an unlocked lesson. Forced full watching is punitive and contradicts `PRIN-02`.
- `BR-172` — Playback speed preference persists per user, not per lesson.

---

### `FEAT-065` — Resume-to-Second Accuracy

**Why:** `PERS-03` learns in 20-minute windows. Losing their position costs them the session.

**Actors:** All learners

**Behavior:**
- Position saved every 10 seconds during playback, on pause, and on page unload.
- Saved per user per lesson, synced across web and mobile.
- Resuming offers "continue from 12:30" with a "start over" alternative.

**Rules:**
- `BR-173` — Position within the final 5% resets to 0 on next open — the learner has effectively finished.
- `BR-174` — The most recent position across all devices wins, resolved by timestamp.
- `BR-175` — Position updates are batched and never block playback.

---

### `FEAT-066` — Lesson Completion Tracking

**Why:** The atomic input to progress, unlocking, certificates, and every motivation feature.

**Actors:** All learners

**Behavior:**
- Video lessons auto-complete at 90% watched.
- Text lessons complete on a manual action.
- Quiz lessons complete on passing.
- Manual toggle always available — the learner may mark complete or incomplete at will.

**Rules:**
- `BR-176` — Completion threshold is 90% of duration, configurable per course.
- `BR-177` — Manual completion is always permitted. Trusting the learner is a `PRIN-02` position; blocking it produces resentment, not learning.
- `BR-178` — Completion is idempotent and records a first-completed timestamp that later toggles never overwrite.
- `BR-179` — Optional lessons (`BR-130`) do not count toward progress even when completed.

---

### `FEAT-067` — Course Progress Calculation

**Why:** The number every motivation feature displays. It must be trustworthy and stable.

**Actors:** All learners

**Behavior:**

```
progress % = (completed required items) / (total required items) × 100
```

- Required items = required lessons + required quizzes.
- Computed at section level and course level.
- Recalculated on every completion event and cached.

**Rules:**
- `BR-180` — Item-count based, not duration-weighted. Duration weighting makes a long video feel like disproportionate progress and produces confusing jumps.
- `BR-181` — Adding lessons to a course reduces existing learners' percentages. This is communicated as "new content added," never presented as lost progress (`PRIN-02`).
- `BR-182` — 100% requires every required item. There is no rounding up.

---

### `FEAT-068` — Continue Learning

**Why:** The single highest-leverage feature in the product. It removes the decision of "where was I," which is where sessions die.

**Actors:** All learners

**Behavior:**
- Global: the most recent activity across all courses, shown as the dashboard's primary action.
- Per course: resume point on the course page.
- Displays course, section, lesson title, exact timestamp, and remaining minutes.
- One action resumes playback at the exact second.

**Rules:**
- `BR-183` — Determined by most recent learning activity, not most recent purchase.
- `BR-184` — A completed lesson advances the pointer to the next unlocked lesson automatically.
- `BR-185` — A brand-new learner sees "start your first lesson" pointing at lesson 1 — never an empty state.
- `BR-186` — If the resume lesson has since become locked (rules changed), the pointer moves to the nearest unlocked item and explains why.

---

### `FEAT-069` — Unlock Rule Engine

**Why:** Structure is the founder's core thesis: a path, not a video dump. A rule engine rather than fixed sequential logic means future pedagogy needs no code (`GOAL-01`).

**Actors:** All learners, `PERS-10`

**Behavior:**
Each lesson, section, or quiz carries an optional rule set:

```json
{
  "logic": "all",
  "rules": [
    { "type": "complete_lesson", "target": "lsn_12" },
    { "type": "pass_quiz", "target": "qz_03", "min_score": 70 },
    { "type": "days_since_enrollment", "value": 7 },
    { "type": "complete_section", "target": "sec_02" },
    { "type": "manual_approval" }
  ]
}
```

- `logic`: `all` (AND) or `any` (OR).
- Evaluated server-side on every content read; the result ships inside `_can` (`BR-042`).
- Returns a human-readable `unlock_reason` in the learner's language.

**Rules:**
- `BR-187` — Evaluation is server-side only. Client-side unlock logic is trivially bypassed.
- `BR-188` — Default for a new lesson: unlock on completion of the immediately preceding required lesson.
- `BR-189` — The first lesson of the first section is never locked.
- `BR-190` — Rules referencing deleted targets are treated as satisfied, never as permanently locked. Failing open prevents an authoring mistake from stranding learners.
- `BR-191` — `manual_approval` items appear in an admin queue.
- `BR-192` — Circular dependencies are detected at save time and rejected with a clear explanation.

---

### `FEAT-070` — Visible Locked State

**Why:** `PRIN-03`. Hiding the path removes the reason to keep going. Seeing what is ahead is itself the motivation.

**Actors:** All learners

**Behavior:**
- Locked items display: title, duration, lock icon, and the explicit unlock condition.
- Examples: "Unlocks after you complete *State Management*" · "Available 3 days after enrollment" · "Score 70% on the previous quiz to unlock."
- Selecting a locked item shows the condition and a shortcut to satisfy it.

**Rules:**
- `BR-193` — Never the word "denied," "forbidden," or "no permission." The message states the path forward (`PRIN-02`).
- `BR-194` — Locked items count toward the total in progress calculations — the learner sees the full scope of what they own.

---

### `FEAT-071` — Per-Course Sequential Toggle

**Why:** `PERS-03` uses reference courses non-linearly. Forcing sequence there converts a useful resource into an obstacle.

**Actors:** `PERS-10`

**Behavior:**
- Course setting: `sequential_locking` on or off.
- Off → all lessons open immediately upon entitlement.
- Individual lessons may still carry explicit rules even when the course-level default is off.

**Rules:**
- `BR-195` — Disabling sequential locking does not remove explicit per-lesson rules; explicit configuration always wins over the course default.
- `BR-196` — The course page states its mode ("learn in any order" vs "structured path") so expectations are set before purchase.

---

### `FEAT-072` — Timestamped Personal Notes

**Why:** Converts passive watching into active learning, and produces a personal artifact that raises the cost of abandoning the course.

**Actors:** All learners

**Behavior:**
- Note panel beside the player; writing captures the current timestamp automatically.
- Markdown supported, including code blocks.
- Notes list per lesson, each jumping to its moment.
- Editable and deletable at any time.

**Rules:**
- `BR-197` — Notes are private. No sharing, no visibility to staff (`NG-03`).
- `BR-198` — Notes survive entitlement expiry permanently (`DEC-07`).
- `BR-199` — Notes are excluded from AI embeddings by default; they may be included in the learner's own AI context to personalize answers (`FEAT-112`).
- `BR-200` — Taking a note does not pause playback unless the learner enables that preference.

---

### `FEAT-073` — Notes Hub

**Why:** Scattered notes are lost notes. A single searchable surface turns them into a personal knowledge base and a reason to return.

**Actors:** All learners

**Behavior:**
- All notes across all courses in one place.
- Filter by course, section, or date; full-text search.
- Each entry links back to its exact lesson and second.
- Export to Markdown or PDF.

**Rules:**
- `BR-201` — Notes from expired courses remain visible and exportable (`BR-198`).
- `BR-202` — Export is available to all learners, not gated behind an entitlement. Their words are theirs.

---

### `FEAT-074` — Lesson Bookmarks

**Why:** Lightweight "come back to this" marking, distinct from note-taking.

**Actors:** All learners

**Behavior:**
- One-action bookmark on any lesson.
- Bookmarks list on the dashboard and in the course sidebar.

**Rules:**
- `BR-203` — Bookmarks are independent of completion. A completed lesson may stay bookmarked as reference.

---

### `FEAT-075` — In-Course Search

**Why:** `PERS-03` arrives with a specific question. Failing to find the answer is the failure mode that loses them.

**Actors:** All learners

**Behavior:**
- Searches lesson titles, Lesson Notes content, and resource titles within a course.
- Results show the lesson, matching excerpt, and timestamp when the match sits in a timestamped block.
- Selecting a result jumps directly to that moment.

**Rules:**
- `BR-204` — PostgreSQL full-text search with Arabic and English configurations. No external search service (`CON-03`).
- `BR-205` — Results from locked lessons appear with their lock state, preserving `PRIN-03`.

---

### `FEAT-076` — Learning Session Tracking

**Why:** The raw input for streaks, weekly progress, projected dates, pace estimation, and drop-off analytics. Without it, `M07` cannot exist.

**Actors:** System

**Behavior:**
- A session opens on first learning activity and closes after 30 minutes of inactivity.
- Records: user, start, end, active duration, lessons touched, device, platform.
- Active duration excludes idle time — a paused video is not learning time.

**Rules:**
- `BR-206` — Minimum 60 seconds of active time to record a session. Prevents accidental opens from polluting data.
- `BR-207` — Session day boundaries follow the user's timezone (`BR-022`), not server time.
- `BR-208` — Sessions are the sole source of truth for streaks and weekly hours.

---

# `M07` — Goals & Motivation

The module that distinguishes Josam Academy from an LMS. It answers the founder's core requirement: *the student always sees their goal, and how much closer they got.*

---

### `FEAT-077` — Post-Registration Onboarding

**Why:** Everything in `M07` depends on data captured here. Skipping it degrades the dashboard, projections, email timing, recommendations, and AI context simultaneously (`02` §9.1).

**Actors:** All new learners

**Behavior:**
Four steps, one question per screen, visual choices rather than a form:

| Step | Question | Options |
|---|---|---|
| 1 | What is your goal? | Change my field · Work as a freelancer · Grow in my current job · Build my own product · Learn out of interest |
| 2 | Where are you now? | Complete beginner · I know some basics · Intermediate · Advanced |
| 3 | How much time can you give? | 3 · 5 · 10 · 15+ hours per week |
| 4 | What interests you? | Multi-select topic tags |

- Immediately after: a projected completion statement and 2–3 recommended courses.
- Skippable at any step; prompted again later from the dashboard.

**Rules:**
- `BR-209` — Onboarding is never mandatory. A blocked purchase path costs more than missing data (`PRIN-01`).
- `BR-210` — Skipped onboarding shows a persistent, dismissible dashboard prompt explaining the benefit.
- `BR-211` — Selecting a goal assigns the learner a persona classification (`PERS-01`–`PERS-05`) used by recommendations, email timing, and AI context.
- `BR-212` — Target: ≥ 70% completion rate (`MET-02`). Below that, the flow is too long and must be shortened.

**Edge cases:**
- Registered via mobile → identical flow, one question per screen.
- Completed onboarding before any purchase → recommendations become the primary conversion surface.

---

### `FEAT-078` — Learning Goal Storage

**Why:** The goal is referenced by the dashboard, projections, emails, recommendations, and every AI conversation. It is a first-class entity, not a profile field.

**Actors:** All learners, system

**Behavior:**
A goal record holds: type, optional free-text description, current level, weekly commitment, target date (computed or user-set), optional linked course or path, status, and history.

**Rules:**
- `BR-213` — One active goal per learner. Multiple simultaneous goals dilute focus, which is the exact failure the product exists to solve.
- `BR-214` — Completed goals are archived, not deleted — they become achievement history (`FEAT-087`).
- `BR-215` — A goal may exist without a linked course. "Change my field" is valid before any purchase and drives recommendations.

---

### `FEAT-079` — Weekly Commitment Capture

**Why:** The input that converts content volume into a date. A date converts a wish into a plan.

**Actors:** All learners

**Behavior:**
- Hours per week, adjustable at any time.
- Optional preferred learning days for reminder timing.
- Displayed alongside actual weekly hours (`FEAT-085`).

**Rules:**
- `BR-216` — Changing the commitment recalculates the projected date immediately and shows the delta ("your target moves from 12 Sep to 28 Sep").
- `BR-217` — The commitment is a plan, never a quota. Missing it produces no penalty and no negative messaging (`PRIN-02`).

---

### `FEAT-080` — Projected Completion Date

**Why:** The single sentence that changes a learner's self-perception from "I bought a course" to "I am on a journey with an end."

**Actors:** All learners

**Behavior:**

```
remaining_minutes = Σ duration of incomplete required items
weekly_minutes    = weekly_commitment_hours × 60
weeks_remaining   = remaining_minutes ÷ (weekly_minutes × efficiency_factor)
projected_date    = today + weeks_remaining
```

- `efficiency_factor` accounts for practice, re-watching, and quizzes. Default **0.65** — one hour of stated study is not one hour of video consumed.
- After 2 weeks of real session data, the projection blends stated commitment with **actual measured pace** (weighted 50/50, shifting to 80% actual after 4 weeks).
- Displayed as "you'll finish around 15 September," never as a precise deadline.

**Rules:**
- `BR-218` — Always phrased approximately. False precision destroys trust when missed.
- `BR-219` — The projection only moves earlier or later with real evidence; it is not recalculated dramatically from a single unusual week.
- `BR-220` — If actual pace is far below the stated commitment, the system offers to adjust the commitment rather than declaring failure (`PRIN-02`).
- `BR-221` — Learners with no session history use the stated commitment alone.

---

### `FEAT-081` — Goal Editing & History

**Why:** `DEC-09`. A learner adjusting their plan is engaged. Locking the goal would punish exactly the behavior the product wants.

**Actors:** All learners

**Behavior:**
- Goal, level, and commitment editable at any time from the dashboard or settings.
- Each change recorded with timestamp and previous value.
- Changing the goal refreshes recommendations and AI context.

**Rules:**
- `BR-222` — Goal history is retained and visible to the learner as their own journey record.
- `BR-223` — Changing the goal does not reset progress, streaks, or achievements.

---

### `FEAT-082` — Motivation Dashboard

**Why:** Identified in `02` §9.2 as the most important screen in the product. It is where motivation is manufactured.

**Actors:** All learners

**Behavior:**
Vertical order, deliberately fixed:

| # | Block | Content |
|---|---|---|
| 1 | Greeting + streak | Name, time-appropriate greeting, streak count |
| 2 | **Continue** | Large primary action: course, lesson, timestamp, minutes remaining |
| 3 | Goal card | Goal statement, progress toward it, days to projected date |
| 4 | This week | Hours completed vs commitment, lessons finished |
| 5 | What's next | The next 3 upcoming lessons |
| 6 | Recent wins | Latest achievements, certificates, passed quizzes |
| 7 | Recommended | Next course suggestion (`FEAT-088`) |

- Blocks with no data are omitted, never rendered empty (`PRIN-01`).
- Identical structure on web and mobile (`FEAT-196`).

**Rules:**
- `BR-224` — Continue is always the visually dominant element. Everything else is secondary.
- `BR-225` — A learner with no purchases sees a catalog-oriented dashboard, still leading with their goal.
- `BR-226` — The dashboard never displays negative framing: no "you are behind," no "you missed," no "you failed."
- `BR-227` — Dashboard data loads in a single aggregated request. This screen is opened more than any other; latency here is felt everywhere (`CON-03`).

---

### `FEAT-083` — Distance-to-Goal Indicator

**Why:** The founder's explicit requirement — *remind them of their goal, how close they are, and how to get closer.*

**Actors:** All learners

**Behavior:**
Three elements together:

- **Where they are:** "62% toward your goal"
- **How far:** "about 18 days to your target"
- **What's next:** "2 lessons this week keeps you on track"

Displayed on the dashboard, the course page, and in lifecycle emails.

**Rules:**
- `BR-228` — Always includes an actionable next step. Distance without direction is anxiety, not motivation.
- `BR-229` — When ahead of schedule, this is stated explicitly — positive reinforcement is cheap and effective.
- `BR-230` — When behind, framing shifts to recovery: "3 lessons this week brings you back on track" (`FEAT-086`).

---

### `FEAT-084` — Learning Streaks

**Why:** Daily-return habit formation. Deliberately the *only* game mechanic, per `NG-04`.

**Actors:** All learners

**Behavior:**
- Counts consecutive days containing a qualifying learning session.
- Day boundaries in the learner's timezone (`BR-207`).
- 2 freeze days per month automatically protect the streak.
- Displays current streak and personal best.

**Rules:**
- `BR-231` — Qualifying activity: ≥ 5 minutes of active session time, or one completed lesson.
- `BR-232` — Freezes apply automatically and silently. The learner is told afterward ("we protected your streak"), never asked in advance.
- `BR-233` — A broken streak is reported neutrally with the personal best preserved: "new streak started — your best is 23 days" (`PRIN-02`).
- `BR-234` — No leaderboards, no comparison with other learners (`NG-03`, `NG-04`).

---

### `FEAT-085` — Weekly Progress vs Commitment

**Why:** Converts an abstract weekly commitment into a visible, correctable reality within the week — while there is still time to act.

**Actors:** All learners

**Behavior:**
- "3.5 of 5 hours this week" with a progress ring.
- Per-day breakdown for the current week.
- Week resets on the learner's configured start day (default Saturday for the regional audience).

**Rules:**
- `BR-235` — Exceeding the commitment is celebrated, never used to raise the target automatically.
- `BR-236` — Falling short displays remaining days and required pace, never a deficit figure.

---

### `FEAT-086` — Behind-Schedule Recovery Messaging

**Why:** The moment that determines whether a learner returns or quits. Handling it wrongly is how platforms lose people permanently.

**Actors:** All learners

**Behavior:**
Escalating, always constructive:

| Situation | Message |
|---|---|
| Slightly behind | "Two lessons this week and you're right back on track." |
| Meaningfully behind | "Life gets busy. Want to adjust your weekly plan?" — with a one-action adjust control |
| Long inactivity | "Your goal is still here waiting. Pick up at lesson 7 — 12 minutes." |

**Rules:**
- `BR-237` — No guilt language, ever: no "you missed," "you failed," "you've been inactive," "you're falling behind" (`PRIN-02`).
- `BR-238` — Every message includes exactly one small, concrete next action. Large asks are ignored by a discouraged learner.

---

### `FEAT-087` — Milestone Celebrations

**Why:** Progress that goes unmarked does not feel like progress. Small acknowledgments compound into the sense of a journey.

**Actors:** All learners

**Behavior:**
Triggered at: first lesson completed, first quiz passed, section completed, 25/50/75% of a course, course completed, streak milestones (7/30/100 days), first certificate.

- In-app celebration moment, brief and non-blocking.
- Recorded in achievement history, shown in the dashboard's Recent Wins.
- Selected milestones also send email (`FEAT-149`).

**Rules:**
- `BR-239` — Celebrations never block interaction. They acknowledge and dissolve.
- `BR-240` — No points, no badge economy, no levels (`NG-04`). Achievements are named moments, not currency.

---

### `FEAT-088` — Next-Step Recommendations

**Why:** Drives `MET-10` (repeat purchase) while genuinely serving the learner. A finished course should point somewhere, not end in a void.

**Actors:** All learners

**Behavior:**
- Ranking inputs: stated goal, level, completed courses, selected interests, catalog relationships.
- Surfaces on the dashboard, on course completion, and in the completion email.
- Shows *why* it is recommended: "builds on what you just finished."

**Rules:**
- `BR-241` — Never recommends a course the learner already owns.
- `BR-242` — Maximum 3 recommendations at a time. More is noise.
- `BR-243` — The completion screen is the highest-conversion recommendation surface in the product and is treated as such.
- `BR-244` — Free courses are recommended alongside paid ones. Trust before conversion (`02` §7, trust baseline).

---

## Coverage Summary — Part 2

| Module | Features | Business Rules |
|---|---:|---:|
| `M05` Content Management | 16 | `BR-123`–`BR-167` |
| `M06` Learning Experience | 14 | `BR-168`–`BR-208` |
| `M07` Goals & Motivation | 12 | `BR-209`–`BR-244` |
| **Total** | **42** | **122 rules** |

**Running total:** 88 of 220 features · 244 business rules

---

## Approval — Part 2

| Item | Status |
|---|---|
| Lesson Notes block model and timestamp binding are correct | ☐ Approved |
| Resource types and gating behavior are correct | ☐ Approved |
| Progress calculation method (item-count based) is accepted | ☐ Approved |
| Unlock rule engine design is correct | ☐ Approved |
| Projected completion date formula and `efficiency_factor` are reasonable | ☐ Approved |
| Dashboard block order is correct | ☐ Approved |
| Streak rules including automatic freezes are accepted | ☐ Approved |
| Non-guilt messaging rules `BR-237`–`BR-238` are binding | ☐ Approved |

**Next:** `04-feature-catalog · Part 3` — `M08` Assessment, `M09` Certificates, `M10` AI Tutor, `M11` Q&A, `M12` Reviews, `M13` Content Protection (`FEAT-089`–`FEAT-143`).

---

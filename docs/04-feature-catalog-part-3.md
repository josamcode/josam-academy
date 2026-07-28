# 04 — Feature Catalog · Part 3

### Modules `M08`–`M13` — Assessment, Certificates, AI Tutor, Q&A, Reviews, Protection

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 04 — Feature Catalog (Part 3 of 5) |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `03-features-identification.md`, `04-feature-catalog-part-1.md`, `04-feature-catalog-part-2.md` |
| **Feeds Into** | `07-business-logic.md`, `08-system-design.md`, `10-database-design.md`, `11-api-contract.md`, `14-security-design.md` |
| **Covers** | `FEAT-089` – `FEAT-143` (55 features) · `BR-245` – `BR-395` |

---

# `M08` — Assessment

Assessment exists for two reasons only: to let a learner **verify they actually learned**, and to make a certificate mean something. It is not a filter and not a gate for its own sake.

---

### `FEAT-089` — Quiz Builder

**Why:** Without assessment, a certificate is a participation trophy and `ANTI-05` (the certificate collector) wins.

**Actors:** `PERS-10`, `PERS-11`, `PERS-12` (draft only)

**Behavior:**
- Quizzes attach to a lesson (inline check), a section (checkpoint), or a course (final assessment).
- Questions added inline or pulled from the question bank (`FEAT-099`).
- Bilingual question and answer text.
- Live preview in learner view.

**Rules:**
- `BR-245` — A quiz must contain at least one question before publishing.
- `BR-246` — A course-level final assessment is required for certificate eligibility when certificates are enabled (`BR-273`).
- `BR-247` — `PERS-12` may draft quizzes but cannot publish them (`ROLE-03` boundaries).
- `BR-248` — Editing a published quiz's questions does not invalidate prior attempts; attempts store their own question snapshot (`BR-262`).

---

### `FEAT-090` — Multiple Choice, Single Answer

**Why:** The default question type. Fast to author, fast to answer, unambiguous to grade.

**Behavior:** 2–6 options, exactly one correct, optional per-option explanation shown after submission.

**Rules:**
- `BR-249` — Option order is shuffled per attempt when the quiz enables shuffling (`FEAT-096`).
- `BR-250` — Explanations display after submission regardless of correctness. A wrong answer that teaches nothing is a wasted question.

---

### `FEAT-091` — Multiple Choice, Multiple Answers

**Why:** Tests real understanding rather than elimination instinct.

**Behavior:** 3–8 options, 2+ correct, scoring configurable as all-or-nothing or partial credit.

**Rules:**
- `BR-251` — Partial credit formula: `(correct selected − incorrect selected) ÷ total correct`, floored at 0. Guessing everything scores zero.
- `BR-252` — The question states how many answers are expected, or explicitly says "select all that apply." Ambiguity is not difficulty.

---

### `FEAT-092` — True / False Questions

**Why:** Efficient for verifying conceptual misconceptions.

**Behavior:** Binary choice with mandatory explanation on reveal.

**Rules:**
- `BR-253` — True/false questions require an explanation. A 50% guess rate with no feedback teaches nothing.

---

### `FEAT-093` — Fill-in-the-Blank

**Why:** Verifies recall of exact syntax, commands, and terminology — critical for technical content.

**Behavior:**
- One or more blanks within a sentence.
- Multiple accepted answers per blank.
- Configurable case sensitivity and whitespace tolerance.

**Rules:**
- `BR-254` — Whitespace is normalized and trimmed by default.
- `BR-255` — Case-insensitive by default; case sensitivity is opt-in per question for case-dependent syntax.
- `BR-256` — Arabic answers normalize alef variants (أ إ آ → ا) and strip diacritics before comparison. Without this, correct Arabic answers are marked wrong.

---

### `FEAT-094` — Essay Questions

**Why:** Some understanding cannot be measured by selection. Explaining a concept is the strongest proof of grasping it.

**Behavior:**
- Long-form text answer with optional minimum and maximum length.
- Optional rubric authored by the instructor.
- Enters a grading queue on submission.

**Rules:**
- `BR-257` — A quiz containing essay questions cannot auto-complete. It reports "submitted, awaiting review" and the remainder of the quiz is scored immediately.
- `BR-258` — Pending essay grading does not block course progress unless the quiz is the final assessment.
- `BR-259` — The learner is notified when grading completes (`FEAT-145`).

---

### `FEAT-095` — AI-Assisted Essay Scoring

**Why:** Manual essay grading does not scale and directly threatens `MET-06` (< 3 hours/week of founder operations).

**Actors:** `PERS-10`, `PERS-11`

**Behavior:**
- AI evaluates the answer against the rubric and the relevant Lesson Notes.
- Produces a suggested score, a justification, and a highlight of what was missing.
- Presented to the instructor as a **suggestion requiring confirmation**.
- The instructor may accept, adjust, or override entirely.

**Rules:**
- `BR-260` — AI never finalizes a grade that affects certification (`NG-10`). Human confirmation is mandatory.
- `BR-261` — The learner never sees the AI suggestion — only the confirmed grade and feedback.
- `BR-262` — AI scoring consumes founder-side AI budget, not the learner's quota.

---

### `FEAT-096` — Quiz Configuration

**Why:** One quiz policy cannot serve both a low-stakes inline check and a certification-bearing final exam.

**Behavior:**

| Setting | Default |
|---|---|
| Pass mark | 70% |
| Attempt limit | Unlimited (inline) / 3 (final) |
| Time limit | None |
| Shuffle questions | Off |
| Shuffle options | On |
| Show correct answers | After submission |
| Show score breakdown | On |
| Cooldown between attempts | None (inline) / 24 hours (final) |

**Rules:**
- `BR-263` — Attempt limits apply to final assessments only by default. Inline checks are for learning, not for judgment.
- `BR-264` — Exhausting attempts on a final assessment does not permanently block certification — it escalates to instructor review (`PRIN-02`).
- `BR-265` — Time limits pause on connection loss and resume, rather than failing the learner for network conditions in Egypt and the Gulf (`02` §7).

---

### `FEAT-097` — Attempt Tracking & History

**Why:** Learners need to see improvement; instructors need to see where the content failed.

**Behavior:**
- Every attempt stored with answers, per-question correctness, score, duration, and timestamp.
- Learner sees their full history and best score.
- Instructor sees aggregate patterns (`FEAT-182`).

**Rules:**
- `BR-266` — Each attempt stores a snapshot of the questions as they existed at attempt time. Later edits never rewrite history.
- `BR-267` — The **highest** score counts toward progress and certification, not the most recent. Improvement should never be punished.
- `BR-268` — Attempt history survives entitlement expiry (`DEC-07`).

---

### `FEAT-098` — Encouraging Result Screens

**Why:** The failure screen is the highest-risk emotional moment in the product. It is where `PERS-01`'s fear of "not being good enough" gets confirmed or defused.

**Behavior:**

| Outcome | Framing |
|---|---|
| Passed | Score, celebration, next action |
| Just below pass | "So close — 65%. Review these 3 points and try again." |
| Well below pass | "This one needs another pass. Here are the lessons that cover it." — with direct links |

- Failed questions link back to the exact lesson and timestamp covering them.
- Retry is always the primary action.

**Rules:**
- `BR-269` — The word "failed" never appears. Neither does "wrong" as a standalone verdict (`PRIN-02`).
- `BR-270` — Every incorrect answer links to the Lesson Notes block that covers it. This is only possible because notes are timestamped and structured (`FEAT-054`).
- `BR-271` — A result screen always offers a concrete next action, never a dead end (`BR-238`).

---

### `FEAT-099` — Question Bank

**Why:** Reusing questions across quizzes and randomizing final assessments reduces both authoring effort and answer sharing.

**Behavior:**
- Central store, tagged by course, topic, difficulty.
- Quizzes may draw a random subset ("10 random questions from the JavaScript Fundamentals pool").
- Usage indicator per question.

**Rules:**
- `BR-272` — Randomized quizzes draw a fresh selection per attempt, making answer sharing largely ineffective.

---

# `M09` — Certificates & Verification

The proof layer. Simultaneously a retention mechanism, a trust signal, and an acquisition channel (`GOAL-08`).

---

### `FEAT-100` — Certificate Eligibility Rules

**Why:** A certificate's value equals the difficulty of obtaining it. Free certificates are worthless to everyone including the holder.

**Behavior:**
Configurable per course:

- Minimum completion percentage (default **100%** of required items)
- Final assessment passed (default required)
- Minimum score on the final assessment (default 70%)
- Active entitlement at time of issuance

**Rules:**
- `BR-273` — Certificates require both completion and a passed assessment by default (`ANTI-05`).
- `BR-274` — Eligibility is evaluated on every completion event, not by a scheduled job. The certificate appears the moment it is earned.
- `BR-275` — Optional lessons never count toward the completion requirement (`BR-179`).
- `BR-276` — Manual issuance by `ROLE-01` is possible with a recorded reason, for legitimate exceptions.

---

### `FEAT-101` — Automatic Issuance

**Why:** The gap between earning and receiving is where the emotional peak lives. A delay wastes it.

**Behavior:**
- Eligibility met → certificate record created → PDF generation queued → celebration shown immediately → email dispatched on completion.
- The learner sees the certificate in-app within seconds; the PDF follows.

**Rules:**
- `BR-277` — The certificate record and its verification code are created synchronously; only PDF rendering is asynchronous (`CON-03`).
- `BR-278` — The learner is never told to "wait for processing." The celebration is immediate; the file arrives quietly.
- `BR-279` — One certificate per learner per course. Re-completion does not reissue.

---

### `FEAT-102` — PDF Generation & Storage

**Why:** `DEC-03`. Learners upload certificates to LinkedIn and send them to employers. It must be a real file.

**Behavior:**
- Rendered from an HTML template to PDF in a background job.
- Contains: academy logo, learner name, course title, completion date, founder signature, verification code, QR code linking to the verification page.
- Stored on R2, linked permanently to the certificate record.
- Available in Arabic or English, chosen at issuance.

**Rules:**
- `BR-280` — Rendered exactly once. Never regenerated on request (`CON-03`).
- `BR-281` — Learner name is frozen at issuance (`BR-021`).
- `BR-282` — Re-issuance with a corrected name is a support operation that creates a new record and **revokes the old verification code**, preventing two valid certificates for one completion.

---

### `FEAT-103` — Unique Verification Code

**Why:** The code is the entire trust mechanism. A guessable code makes every certificate meaningless.

**Behavior:**
- Format: `JOSAM-XXXX-XXXX-XXXX` using an unambiguous alphabet (no `0/O`, `1/I/l`).
- Cryptographically random, not derived from any identifier.
- Case-insensitive on lookup.

**Rules:**
- `BR-283` — Codes are never sequential and carry no encoded information about the learner or the course.
- `BR-284` — Codes are permanent. Deleting an account does not invalidate a certificate already presented to an employer (`BR-027`).
- `BR-285` — Revoked certificates return an explicit "this certificate was revoked" state, not "not found." Silence would be dishonest to the verifier.

---

### `FEAT-104` — Public Verification Page

**Why:** Simultaneously the proof mechanism and an indexed acquisition surface (`02` §5).

**Actors:** `SEG-01`

**Behavior:**
- Public URL: `josamacademy.com/verify` with a code input, plus a direct URL `…/verify/{code}`.
- **Valid** → learner name, course title, completion date, issuing academy, and a course link.
- **Invalid** → clear "no certificate found with this code," with no hint about the code format.
- Accessible without authentication and indexed by search engines.

**Rules:**
- `BR-286` — The page exposes only name, course, and date. No email, no phone, no score, no progress detail.
- `BR-287` — Rate-limited to prevent code enumeration (`FEAT-219`).
- `BR-288` — The page carries academy branding and a call to action. Every verification is a visit from someone who already trusts the credential.

---

### `FEAT-105` — Certificate Sharing

**Why:** Each share is a branded, indexed entry point back to the platform, from a source the audience already trusts.

**Behavior:**
- One-action LinkedIn share using LinkedIn's certification format (name, issuer, date, credential ID, credential URL).
- Copy link, download PDF, and native mobile share sheet.
- Post-issuance prompt encouraging the share while motivation is at its peak.

**Rules:**
- `BR-289` — Sharing is never required or incentivized with rewards. Coerced sharing damages credibility.
- `BR-290` — Shared links point to the verification page, never to a raw PDF file.

---

# `M10` — AI Tutor

The founder's stated core requirement: *a mentor that replaces my presence.* It is what makes Josam Academy structurally different from every alternative in `01` §2.

---

### `FEAT-106` — AI Provider Abstraction

**Why:** `CON-06` and the founder's explicit requirement. Model pricing and quality shift every few months; being locked to one vendor means overpaying within a year.

**Actors:** System

**Behavior:**

```
AIProvider
├── chat(messages, options) → Response
├── stream(messages, options) → AsyncIterator
├── embed(texts) → Vector[]
└── countTokens(text) → number
```

Implementations: `AnthropicProvider`, `OpenAIProvider`, `GoogleProvider`, `OpenRouterProvider`.

- Uniform normalized response shape and error taxonomy across providers.
- Automatic failover to a configured backup provider on outage.

**Rules:**
- `BR-291` — No application code imports a vendor SDK directly.
- `BR-292` — Provider errors are normalized. The application never branches on vendor-specific error formats.
- `BR-293` — Failover is automatic and logged. The learner sees an answer, not an outage.

---

### `FEAT-107` — Per-Task Model Configuration

**Why:** Different tasks have different cost/quality profiles. Paying frontier-model prices for a routine tutoring answer is waste; using a cheap model for essay evaluation is negligence.

**Actors:** `PERS-10`

**Behavior:**
Configurable per task, from admin, without deployment:

| Task | Typical choice |
|---|---|
| Tutor chat | Fast, low-cost model |
| Essay evaluation | Higher-capability model |
| Content summarization | Fast model |
| Embeddings | Fixed (`DEC-02`) |

Settings per task: provider, model, temperature, max tokens, system prompt, fallback model.

**Rules:**
- `BR-294` — Changes take effect immediately, no deployment (`PRIN-05`).
- `BR-295` — The embedding model is **excluded** from casual switching. Changing it requires an explicit re-indexing operation with a warning (`DEC-02`).
- `BR-296` — Every configuration change is audit-logged with the previous value.

---

### `FEAT-108` — Content Embedding Pipeline

**Why:** The foundation of curriculum-grounded answers. Without it the AI is a generic chatbot that contradicts the instructor — exactly the failure identified in `01` §2.

**Actors:** System

**Behavior:**
1. Lesson Notes published or edited → embedding job queued.
2. Blocks chunked into semantic units of roughly 300–500 tokens, respecting block boundaries.
3. Each chunk retains metadata: `course_id`, `lesson_id`, `section_id`, `block_id`, `start_time`, `language`, `heading_path`.
4. Chunks embedded via the configured model and stored in `pgvector`.
5. Stale chunks removed on re-index.

**Rules:**
- `BR-297` — A chunk never spans two lessons. Cross-lesson chunks produce citations that point nowhere useful.
- `BR-298` — Every chunk stores its embedding model identifier and dimension count, enabling incremental migration (`DEC-02`).
- `BR-299` — Chunks inherit the timestamp of their source block, making every retrieval citable to a video moment.
- `BR-300` — Arabic and English versions of the same block are embedded separately and tagged by language.
- `BR-301` — Q&A answers marked as high quality by the instructor are also embedded (`FEAT-124`), expanding the knowledge base over time at zero authoring cost.
- `BR-302` — Embedding jobs are rate-limited and batched to control cost (`CON-02`).

---

### `FEAT-109` — RAG Retrieval

**Why:** Retrieval quality is the ceiling on answer quality. A perfect model with poor retrieval produces confident irrelevance.

**Actors:** System

**Behavior:**
**Hybrid retrieval:**
1. Vector similarity search over `pgvector` (top 20 candidates).
2. PostgreSQL full-text search with Arabic and English configurations (top 20 candidates).
3. Results merged and reranked by combined score, recency of relevance, and proximity to the learner's current lesson.
4. Top 5–8 chunks passed as context.

**Scoping:**
- Retrieval is restricted to courses the learner holds an entitlement for.
- Chunks from the learner's current lesson receive a relevance boost.

**Rules:**
- `BR-303` — Retrieval **never** returns content the learner has no entitlement to. RAG is an access-control surface, not just a search feature.
- `BR-304` — Hybrid retrieval is mandatory. Pure vector search fails on exact technical terms; pure keyword search fails on conceptual Arabic questions.
- `BR-305` — When no chunk exceeds the relevance threshold, the system does not fabricate context — it triggers out-of-scope handling (`FEAT-115`).
- `BR-306` — Retrieved chunks always carry their lesson and timestamp for citation (`FEAT-111`).

---

### `FEAT-110` — Curriculum-Grounded Answers

**Why:** The core differentiator. Generic AI contradicts the instructor and confuses the learner (`PERS-04`'s stated quit condition).

**Actors:** All learners with `feature:ai_tutor`

**Behavior:**
- System prompt constrains the model to answer from the provided curriculum context.
- Every substantive claim cites its source lesson.
- Answer language matches the learner's question language, defaulting to Arabic.
- Tone: instructor-like, encouraging, direct (`PRIN-02`).

**Rules:**
- `BR-307` — The model is instructed to prefer "this isn't covered in the course — here's where it is discussed most closely" over answering from general knowledge.
- `BR-308` — Answers never contradict Lesson Notes. Where the curriculum takes a position, the AI takes the same position.
- `BR-309` — Every answer displays its sources as clickable lesson references.
- `BR-310` — Code in answers is formatted and copyable.

---

### `FEAT-111` — Timestamp Jump from AI Answer

**Why:** Closes the loop between question and content. The learner does not just get an answer — they get taken to the explanation.

**Behavior:**
- Citations render as "📍 Lesson 7 — 12:30".
- Selecting one opens the lesson at that exact second.
- Within the player, it seeks without leaving the page.

**Rules:**
- `BR-311` — Citations to locked lessons show their unlock condition instead of seeking (`PRIN-03`).
- `BR-312` — Citations are generated from chunk metadata, never from model output. Models hallucinate timestamps; metadata does not.

---

### `FEAT-112` — Student Context Injection

**Why:** This is what makes it a *mentor* rather than a search engine. The founder's requirement — "a guide that replaces me" — depends entirely on this feature.

**Behavior:**
Injected into every conversation:

| Context | Effect |
|---|---|
| Learning goal | Answers connect back to why they are learning |
| Current level | Explanation depth calibrated |
| Course progress | No spoilers from lessons not yet reached |
| Current lesson | Retrieval and framing biased to present material |
| Recent struggles | Failed quiz topics inform emphasis |
| Preferred language | Response language |

Example: *"Since your goal is freelancing, this is exactly what you'll use in your first client project — focus on the error handling part."*

**Rules:**
- `BR-313` — The AI never reveals content from lessons the learner has not reached in a sequential course. Spoiler prevention is part of preserving the path (`PRIN-03`).
- `BR-314` — Context is assembled server-side per request. The client cannot influence it.
- `BR-315` — Explanation depth adapts to the stated level: a beginner receives foundations, an advanced learner receives the direct answer.
- `BR-316` — Personal notes may enter context only for that learner's own conversations (`BR-199`).

---

### `FEAT-113` — Conversation History

**Why:** Continuity is what separates a mentor from a stateless bot. "As we discussed earlier" is a mentoring behavior.

**Behavior:**
- Threads scoped per course, persistent across devices.
- Full history browsable and searchable.
- New thread creatable at any time.

**Rules:**
- `BR-317` — Context window carries a rolling summary of older turns plus the most recent turns verbatim, controlling token cost (`CON-02`).
- `BR-318` — History survives entitlement expiry as read-only (`DEC-07`).
- `BR-319` — Learners may delete their own threads; deletion is permanent.

---

### `FEAT-114` — AI Quota Enforcement

**Why:** The only expense that scales with usage. Uncapped, `PERS-04` alone breaks the budget (`CON-02`).

**Behavior:**
- Quota checked before every request; consumed on successful response.
- Remaining balance visible in the chat interface.
- Proactive notice at 80% consumption.
- Exhaustion presents the add-on option and the reset date.

**Rules:**
- `BR-320` — Free registered users receive 5 lifetime messages (`DEC-06`).
- `BR-321` — Consumption is atomic; concurrent requests cannot overrun the limit (`BR-109`).
- `BR-322` — Failed or errored requests never consume quota (`BR-112`).
- `BR-323` — Regenerating an answer consumes quota; editing a question and resubmitting also consumes quota. Both are stated clearly in the interface.
- `BR-324` — Exhaustion messaging is an invitation, never a wall (`PRIN-02`, `BR-062`).

---

### `FEAT-115` — Out-of-Scope Handling

**Why:** The moment that determines whether learners trust the AI. Confident fabrication destroys trust permanently; honest limits build it.

**Behavior:**
When retrieval finds nothing sufficiently relevant:

- Acknowledge the question is outside the curriculum.
- Point to the closest related lesson if one exists.
- Offer escalation to the instructor (`FEAT-116`).
- Never fabricate curriculum content.

**Rules:**
- `BR-325` — The AI answers general questions clearly labeled as outside the course, or declines — configurable per academy setting. **Default: answer briefly, label clearly, and recommend the instructor.**
- `BR-326` — The AI never invents lesson references or timestamps (`BR-312`).
- `BR-327` — Out-of-scope questions are logged and surfaced to the founder as **content gap signals** — a direct input to what to teach next.

---

### `FEAT-116` — Escalation to Instructor

**Why:** The safety net that makes `MET-03` (60–75% AI deflection) acceptable rather than risky. The 25–40% that fail still reach a human.

**Behavior:**
- "Ask the instructor" action available on any AI answer.
- Converts the thread into a Q&A item (`FEAT-120`) with full conversation context attached.
- Appears in the founder's escalation queue.
- The learner is notified when answered.

**Rules:**
- `BR-328` — Escalation is always available, never hidden behind an entitlement.
- `BR-329` — The instructor sees the full AI conversation, so they never re-answer what was already covered.
- `BR-330` — An instructor answer marked as high quality is embedded into the knowledge base (`BR-301`), so the same question is answered by AI next time.

---

### `FEAT-117` — Model Comparison Tool

**Why:** The founder's explicit requirement — the ability to evaluate models empirically rather than by reputation.

**Actors:** `PERS-10`

**Behavior:**
- Admin sends one prompt with identical curriculum context to two models.
- Results displayed side by side with latency, token count, and cost.
- Optional preference recording to build an evaluation history.

**Rules:**
- `BR-331` — Comparison runs consume founder-side budget and are excluded from learner quotas.
- `BR-332` — A saved comparison set enables re-running the same evaluation prompts when new models are released.

---

### `FEAT-118` — AI Cost Tracking

**Why:** Cost visibility is what keeps a $30/month budget from becoming a $300 surprise.

**Behavior:**
- Records input tokens, output tokens, model, provider, latency, and computed cost per request.
- Aggregated by day, model, provider, course, and user.
- Configurable monthly spend threshold triggering an alert.

**Rules:**
- `BR-333` — Costs are computed from a per-model rate table stored in admin, editable when vendor pricing changes.
- `BR-334` — Exceeding the monthly threshold alerts the founder and optionally switches tutor chat to the configured cheaper fallback model.
- `BR-335` — Per-user cost visibility identifies outlier consumption for quota tuning.

---

### `FEAT-119` — Answer Feedback

**Why:** The only reliable signal of whether the AI is actually helping. It also identifies which Lesson Notes are weak.

**Behavior:**
- Thumbs up/down on every answer, with an optional reason on negative feedback.
- Negative feedback surfaces in admin with the full question, retrieved chunks, and answer.
- Patterns reveal both model problems and content gaps.

**Rules:**
- `BR-336` — Feedback is optional and never blocks the conversation.
- `BR-337` — Repeated negative feedback on the same lesson's chunks flags those Lesson Notes for revision — turning AI feedback into a content quality loop.

---

# `M11` — Q&A & Discussions

Deliberately scoped: questions attach to lessons. There is no forum, no feed, and no student-to-student messaging (`NG-03`).

---

### `FEAT-120` — Lesson-Scoped Questions

**Why:** Context-free questions produce context-free answers. Binding a question to a lesson makes it answerable quickly and useful to the next learner.

**Behavior:**
- Question submitted from within a lesson, optionally capturing the current timestamp.
- Title, body with Markdown and code blocks, optional screenshot.
- Displayed in the lesson's Q&A panel.

**Rules:**
- `BR-338` — Questions always belong to a lesson. There is no global question surface.
- `BR-339` — Asking requires an entitlement to that course.
- `BR-340` — The timestamp is captured automatically when asked during playback, giving the instructor immediate context.

---

### `FEAT-121` — AI-First Response

**Why:** Directly delivers `MET-03`. The founder answers the hard 30%, not the repeated 70%.

**Behavior:**
- Every submitted question is first routed to the AI tutor with full lesson context.
- The AI answer appears within seconds, clearly labeled as AI-generated.
- The learner marks it resolved, or escalates to the instructor.

**Rules:**
- `BR-341` — AI responses to Q&A do not consume the learner's chat quota. This is the platform's answering channel, not the learner's.
- `BR-342` — AI answers are always visibly labeled. Presenting AI output as the instructor's voice is a trust violation.
- `BR-343` — Escalation is one action, always visible, never buried (`FEAT-116`).

---

### `FEAT-122` — Instructor Answers

**Why:** The human backstop that makes the whole model credible.

**Actors:** `PERS-10`, `PERS-11`

**Behavior:**
- Escalated questions appear in the instructor queue, ordered by age and course.
- Answer supports Markdown, code, and links to other lessons.
- Answering notifies the learner (`FEAT-145`).
- Instructor may mark an answer as "add to knowledge base" (`BR-330`).

**Rules:**
- `BR-344` — Instructor answers visually outrank AI answers in the thread.
- `BR-345` — `ROLE-02` sees only questions on their own courses (`BR-044`).
- `BR-346` — Target response time is surfaced to the learner ("usually answered within 24 hours") so silence is never ambiguous.

---

### `FEAT-123` — Question Resolution State

**Why:** An unresolved question is an unfinished support case. Explicit state prevents them from accumulating invisibly.

**Behavior:** States: `open` → `ai_answered` → `escalated` → `instructor_answered` → `resolved`.

The learner marks resolution; auto-resolution occurs 7 days after an instructor answer with no further reply.

**Rules:**
- `BR-347` — Only the asker or an instructor may mark a question resolved.
- `BR-348` — Escalated questions unanswered after 48 hours are flagged in the founder's operations dashboard (`FEAT-163`).

---

### `FEAT-124` — Public Question Visibility

**Why:** Answered questions are content. One good answer serves every future learner who hits the same wall.

**Behavior:**
- Resolved questions with instructor answers are visible to all learners on that lesson.
- Asker identity shown as first name only.
- Learners may opt a question private at submission time.

**Rules:**
- `BR-349` — Only instructor-answered questions become public. AI-only threads remain private to avoid publishing unverified answers.
- `BR-350` — The asker may make their question private at any time, permanently.
- `BR-351` — Public questions are indexed in in-course search (`FEAT-075`).

---

### `FEAT-125` — Question Upvoting

**Why:** Surfaces the questions many learners share — which are also the strongest signals about where the content is unclear.

**Behavior:** One upvote per learner per question; sorts the lesson's Q&A by votes.

**Rules:**
- `BR-352` — No downvotes. Negative signals on a learner's question discourage asking, which is the opposite of the goal.
- `BR-353` — Highly upvoted questions are flagged to the founder as candidates for a new lesson or a notes revision.

---

### `FEAT-126` — Q&A Moderation

**Why:** Any user-generated surface eventually attracts spam and hostility. Without tools, moderation consumes founder time (`MET-06`).

**Actors:** `PERS-13`, `PERS-10`

**Behavior:**
- Hide, edit, or delete a question or answer, with reason.
- Learner reporting on any public item.
- Reported items enter a moderation queue.

**Rules:**
- `BR-354` — Hidden content is retained, not deleted, for dispute resolution.
- `BR-355` — Moderation actions are audit-logged (`FEAT-172`).
- `BR-356` — A learner whose content is removed is told, with the reason.

---

# `M12` — Reviews & Social Proof

Trust infrastructure for an audience with a documented low trust baseline (`02` §7).

---

### `FEAT-127` — Eligibility Gating

**Why:** `DEC-05`. Reviews from non-buyers are noise; reviews from someone who watched two minutes are worse than none.

**Behavior:**
- Requires: verified purchase entitlement, and ≥ 20% course progress.
- The review prompt surfaces at 30% progress and again at completion.

**Rules:**
- `BR-357` — Progress threshold configurable, defaulting to 20%.
- `BR-358` — A refunded purchase invalidates the review, which is hidden but retained.
- `BR-359` — One review per learner per course, editable for 30 days after submission.

---

### `FEAT-128` — Star Rating & Written Review

**Behavior:** 1–5 stars plus optional text (30–2000 characters), with an optional "what did you gain?" prompt to elicit outcome-focused reviews.

**Rules:**
- `BR-360` — Text is optional. Requiring it suppresses response rate.
- `BR-361` — Reviews display the learner's first name, avatar, completion percentage, and a `verified purchase` badge.

---

### `FEAT-129` — Approval Workflow

**Why:** Protection against spam and abuse, not against criticism.

**Behavior:** States `pending` → `approved` / `rejected`, with the founder notified of new submissions.

**Rules:**
- `BR-362` — Rejection is permitted only for spam, abuse, or off-topic content — **never for a low rating**. This rule exists explicitly to prevent the review system from becoming dishonest.
- `BR-363` — Rejected reviewers are informed with the reason.
- `BR-364` — Reviews unmoderated after 7 days are auto-approved. A backlog must not silently suppress genuine feedback.

---

### `FEAT-130` — Instructor Reply

**Why:** A thoughtful reply to criticism builds more trust than the absence of criticism.

**Behavior:** One public reply per review, editable, displayed inline beneath it.

**Rules:**
- `BR-365` — Replies are public and permanent once posted, aside from edits.

---

### `FEAT-131` — Threshold-Based Display

**Why:** `DEC-05`. Two reviews on a course reads worse than none — it signals nobody bought it.

**Behavior:**
- Reviews hidden on the public course page until ≥ 5 approved reviews exist.
- Below the threshold, the section is absent, not shown empty (`PRIN-01`).
- The founder sees the true count in admin regardless.

**Rules:**
- `BR-366` — Threshold configurable, defaulting to 5.
- `BR-367` — Learners who already own the course see all reviews regardless of the threshold.

---

### `FEAT-132` — Aggregate Rating

**Behavior:** Average score to one decimal, total count, and a distribution bar chart, on the course card and detail page.

**Rules:**
- `BR-368` — Aggregate rating appears only once the display threshold is met (`BR-366`).
- `BR-369` — Only approved reviews count toward the aggregate.

---

# `M13` — Content Protection

`GOAL-04`, governed by `PRIN-04`: **protection must be invisible to honest learners.** Every rule here is tested against that.

---

### `FEAT-133` — Signed Video URLs

**Why:** The base layer. A permanent video URL is a permanent leak.

**Behavior:**
- Playback requires a token issued per session after validating: authentication, entitlement, unlock state, and device binding.
- Token is short-lived and bound to the learner, the video, and the session.
- Rotated on renewal during long playback.

**Rules:**
- `BR-370` — Token lifetime is 4 hours, long enough for any single lesson.
- `BR-371` — Tokens are bound to a device identifier; presenting one from a different device is rejected.
- `BR-372` — Token issuance is logged (`FEAT-143`).
- `BR-373` — Token requests failing on entitlement return a purchase invitation, not an error (`PRIN-01`).

---

### `FEAT-134` — Dynamic Watermarking

**Why:** The most effective practical deterrent. It does not prevent capture — it makes captured content traceable to its source, which changes behavior.

**Behavior:**
- Overlay shows learner name and a partial identifier (e.g. last 4 digits of phone).
- Position moves at intervals so it cannot be cropped out.
- Semi-transparent; readable in a recording but not obstructive.
- Rendered by the video provider, not the client, so it cannot be removed with DOM manipulation.

**Rules:**
- `BR-374` — The watermark is provider-rendered. Client-side overlays are removable in seconds and provide false confidence.
- `BR-375` — Opacity and frequency are configurable, tuned to remain legible in a recording without harming legitimate viewing (`PRIN-04`).
- `BR-376` — The displayed identifier is partial. Full phone numbers or emails must never be burned into video frames.
- `BR-377` — Learners are informed that videos are watermarked. Transparency is itself a deterrent, and concealment would be dishonest.

---

### `FEAT-135` — Single-Device Binding

**Why:** The founder's explicit requirement, and the mechanism that makes `ANTI-01` (login sharers) unprofitable to serve.

**Behavior:**
- The first playback binds the account to that device.
- Playback from another device is blocked with a transfer request option (`FEAT-137`).
- **Applies to video playback only.** Browsing, Lesson Notes, AI, Q&A, notes, quizzes, and progress remain accessible from any device (`PRIN-04`).

**Rules:**
- `BR-378` — Device binding governs playback exclusively. Any extension of it to other features is a violation of `PRIN-04`.
- `BR-379` — Binding is per account, not per course.
- `BR-380` — The bound device is visible in account settings with its label and bind date.
- `BR-381` — Password reset does not release binding (`BR-015`).

---

### `FEAT-136` — Device Fingerprinting

**Why:** Identifying "the same device" reliably is harder than it appears. Naive fingerprinting produces false lockouts for honest learners — the exact failure `PRIN-04` forbids.

**Behavior:**
**Primary identifier:** a signed device token issued on first bind, stored in `localStorage` (web), Keychain (iOS), and EncryptedSharedPreferences (Android).

**Secondary signal:** a fingerprint composed of platform, screen characteristics, timezone, language, and hardware concurrency — used only to detect token copying, never as the sole identifier.

Human-readable label generated automatically ("Chrome on Windows"), renameable by the learner.

**Rules:**
- `BR-382` — The signed token is authoritative. Fingerprints drift with browser updates and OS changes; treating them as identity causes false lockouts.
- `BR-383` — Clearing browser storage produces a new device and therefore a transfer request. The transfer policy (`BR-384`) absorbs this without support involvement, which is precisely why automatic transfers exist.
- `BR-384` — A fingerprint mismatch with a valid token raises a soft flag for review; it never blocks playback on its own.
- `BR-385` — Device data is never used for advertising or shared with third parties.

---

### `FEAT-137` — Device Transfer Request

**Why:** Without a self-service path, single-device binding becomes a support disaster and a `MET-06` failure.

**Behavior:**
- Playback attempt from an unbound device shows: the currently bound device, and a "switch to this device" action.
- Within policy → approved instantly, playback begins.
- Beyond policy → request submitted, founder or support notified, learner told the expected wait.

**Rules:**
- `BR-386` — The blocked-playback screen never uses accusatory language. It states the situation and offers the action (`PRIN-02`).
- `BR-387` — Automatic approvals complete in under 5 seconds. Any longer and the learner experiences it as a failure.
- `BR-388` — The previously bound device loses playback immediately on transfer; an in-progress session is allowed to finish the current lesson.

---

### `FEAT-138` — Automatic Transfer Policy

**Why:** `DEC-04`. Manual approval of every switch would consume the founder's entire operational budget within weeks.

**Behavior:**

| Setting | Default |
|---|---|
| Automatic transfers per 30 days | 2 |
| Requests requiring manual approval | 3rd onward |
| Abuse flag threshold | 5+ in 30 days |
| Cooldown between automatic transfers | 1 hour |

All values editable in admin.

**Rules:**
- `BR-389` — The counter is a rolling 30-day window, not a calendar month.
- `BR-390` — Remaining automatic transfers are visible to the learner before they use one.
- `BR-391` — Support (`ROLE-04`) approves manual requests within policy; requests beyond the abuse threshold escalate to the founder (`PERS-13` boundaries).
- `BR-392` — Reaching the limit is communicated as a temporary state with a clear reset date, never as a penalty (`PRIN-02`).

---

### `FEAT-139` — Abuse Flagging

**Why:** Distinguishes the learner who changed phones from the account being shared across a study group.

**Behavior:**
Signals combined into a score: transfer frequency, geographic distance between devices, concurrent playback attempts, unusual watch volume, and repeated fingerprint families.

Flagged accounts appear in an admin review queue with the supporting evidence.

**Rules:**
- `BR-393` — Flagging never triggers automatic suspension. A human always reviews (`PRIN-04`).
- `BR-394` — Evidence is presented as data, and the founder decides. False accusations are far more costly than a tolerated sharer.
- `BR-395` — Contacting a flagged learner starts from inquiry, not accusation.

---

### `FEAT-140` — Concurrent Stream Limit

**Why:** Device binding alone does not stop two browser tabs, or one device streaming to several viewers.

**Behavior:**
- One active playback session per account.
- A second start prompts "playing on another screen — stop that and continue here?"
- Heartbeat every 30 seconds; a session without a heartbeat for 2 minutes is released.

**Rules:**
- `BR-396` — The learner may always take over from the current session. It is their account.
- `BR-397` — Network interruption does not lose the session; the heartbeat grace absorbs it.

---

### `FEAT-141` — Mobile Capture Blocking

**Why:** Mobile is the easiest capture surface. Platform APIs make it the only place where prevention rather than tracing is possible.

**Behavior:**
- **Android:** `FLAG_SECURE` on the player activity — screen recording and screenshots produce a black frame at the OS level.
- **iOS:** `UIScreen.isCaptured` monitored; playback pauses with an explanatory message while capture is active, and resumes when it stops.
- Screenshot detection logged for pattern analysis.

**Rules:**
- `BR-398` — The pause message is informational, never accusatory: "playback pauses during screen recording" (`PRIN-02`).
- `BR-399` — Legitimate mirroring to a TV via AirPlay or Chromecast is permitted. Blocking it would punish honest learners (`PRIN-04`).
- `BR-400` — Web capture blocking is not attempted. It is trivially bypassed and provides only false confidence; watermarking carries the web surface.

---

### `FEAT-142` — Signed Resource URLs

**Why:** Downloadable files are the easiest leak vector and the most valuable content for `PERS-02`.

**Behavior:**
- R2 objects are private; downloads are served via short-lived signed URLs.
- Generated per request after entitlement validation.
- Every download is logged.

**Rules:**
- `BR-401` — Signed URL lifetime is 5 minutes — enough to start a download, useless when shared.
- `BR-402` — Downloads are rate-limited per user per hour.
- `BR-403` — Unusual download volume raises an abuse flag (`FEAT-139`).
- `BR-404` — Where feasible, PDFs are watermarked with the learner's name at generation time.

---

### `FEAT-143` — Playback Audit Log

**Why:** When a leak surfaces, the watermark identifies the learner and this log proves the pattern. Together they make enforcement possible.

**Behavior:**
- Records: user, lesson, device, IP, timestamp, duration, and token issuance.
- Queryable by user, lesson, or time window.
- Retained 12 months.

**Rules:**
- `BR-405` — Logs are retained for security and dispute purposes only, and are never used for advertising or shared externally (`BR-385`).
- `BR-406` — Support (`ROLE-04`) may view playback logs for a specific learner while handling a case, but cannot export them.
- `BR-407` — Logs are append-only.

---

## Coverage Summary — Part 3

| Module | Features | Business Rules |
|---|---:|---:|
| `M08` Assessment | 11 | `BR-245`–`BR-272` |
| `M09` Certificates | 6 | `BR-273`–`BR-290` |
| `M10` AI Tutor | 14 | `BR-291`–`BR-337` |
| `M11` Q&A | 7 | `BR-338`–`BR-356` |
| `M12` Reviews | 6 | `BR-357`–`BR-369` |
| `M13` Content Protection | 11 | `BR-370`–`BR-407` |
| **Total** | **55** | **163 rules** |

**Running total:** 143 of 220 features · 407 business rules

---

## Approval — Part 3

| Item | Status |
|---|---|
| Quiz types, scoring, and attempt policy are correct | ☐ Approved |
| Certificate eligibility and verification model are correct | ☐ Approved |
| AI provider abstraction and per-task configuration are correct | ☐ Approved |
| RAG design (hybrid retrieval, entitlement scoping, metadata citation) is correct | ☐ Approved |
| Student context injection is correct — this is the "mentor" mechanism | ☐ Approved |
| Q&A scope (lesson-bound, AI-first, escalation) is correct | ☐ Approved |
| Review gating and the no-rejection-for-low-ratings rule (`BR-362`) are accepted | ☐ Approved |
| Device binding via signed token rather than fingerprint (`BR-382`) is accepted | ☐ Approved |
| Transfer policy defaults are accepted | ☐ Approved |
| Decision not to attempt web capture blocking (`BR-400`) is accepted | ☐ Approved |

**Next:** `04-feature-catalog · Part 4` — `M14` Notifications & Email, `M15` Support, `M16` Admin & Operations, `M17` Analytics (`FEAT-144`–`FEAT-183`).

---

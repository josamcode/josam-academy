# STATUS — Josam Academy

> **This file is the single source of truth for where the project actually is.**
> It is read at the start of every session and updated at the end of every task.
> The documents in `/docs` describe the plan. This file describes reality.

| Field              | Value                                                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Last updated**   | 2026-07-29                                                                                                                                                                                    |
| **Updated by**     | AI (`PH-0.7` execution recorded)                                                                                                                                                              |
| **Current phase**  | Phase 0 — Foundation                                                                                                                                                                          |
| **Current task**   | _None in progress_ — `PH-0.7` ✅ executed                                                                                                                                                     |
| **Next task**      | `PH-0.8` — **awaiting founder review of the port-8000 approach** (dynamic IP rules out an allow-list)                                                                                         |
| **Production URL** | _Not deployed_                                                                                                                                                                                |
| **Blocked**        | No — `SB-07` resolved by founder pre-authorisation: `PH-0.4` adopts Next 16, gated on the four-part probe (`BR-1809`). `SB-05` no longer blocks: `PH-0.7` is authored from `14 §12` directly. |

---

## 1. Progress

| Phase                   |   Tasks |   Done | Status         |
| ----------------------- | ------: | -----: | -------------- |
| **0 — Foundation**      |      29 |     24 | 🟡 In progress |
| 1 — Identity & Commerce |      32 |      0 | ⬜ Not started |
| 2 — Content & Learning  |      34 |      0 | ⬜ Not started |
| 3 — Operations & Launch |      26 |      0 | ⬜ Not started |
| 4 — Motivation & Proof  |      22 |      0 | ⬜ Not started |
| 5 — AI Mentor           |      18 |      0 | ⬜ Not started |
| 6 — Mobile              |      16 |      0 | ⬜ Not started |
| 7 — Growth              |      14 |      0 | ⬜ Not started |
| **Total**               | **192** | **24** | **12.5%**      |

**Milestones**

| #   | Milestone                  | Target  | Actual |
| --- | -------------------------- | ------- | ------ |
| M1  | Deployable skeleton        | Week 3  | —      |
| M2  | First real payment         | Week 8  | —      |
| M3  | First lesson watched       | Week 14 | —      |
| M4  | 🚀 Public launch           | Week 18 | —      |
| M5  | First certificate          | Week 22 | —      |
| M6  | AI answers without founder | Week 26 | —      |
| M7  | Apps in stores             | Week 31 | —      |
| M8  | Feature complete           | Week 34 | —      |

---

## 2. What Actually Works Right Now

> Only list what is **deployed and verified in production**. Not what is written.

| Capability | Status               | Verified |
| ---------- | -------------------- | -------- |
| —          | Nothing deployed yet | —        |

---

## 3. Environments

| Environment | URL                        | Status             | Notes                                                                                                                                                                                  |
| ----------- | -------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production  | `josamacademy.com`         | ⬜ Not provisioned | Ubuntu 24.04 · 2 vCPU/8 GB/100 GB · Frankfurt. **Hardened `PH-0.7`.** **Shared box — also hosts 5 live client apps + their own Postgres 18 / Redis 7.2, 13 containers, ~22% of 8 GB.** |
| Local       | `localhost:3000` / `:4000` | 🟡 Partial         | api + web run; Docker stack healthy (127.0.0.1 only)                                                                                                                                   |
| Storybook   | `localhost:6006`           | ✅ Configured      | Theme + locale toolbars, axe on every story                                                                                                                                            |

**Infrastructure state**

| Item                    | Status                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| VPS hardened (`PH-0.7`) | ⬜ Not done — box is **live and exposed**, hardened in place                                      |
| Cloudflare configured   | ⬜ Not done                                                                                       |
| Coolify installed       | ✅ Installed by provider template — **unverified, unhardened, credential not rotated** (`PH-0.9`) |
| CI pipeline             | ⬜ Not done                                                                                       |
| Backups running         | ⬜ Not done — provider weekly VM snapshots exist but are **not** backup coverage (`SB-17`)        |
| Monitoring + alerts     | ⬜ Not done                                                                                       |

---

## 4. Work Log

> Newest first. One entry per completed task. Never edit past entries — append corrections as new entries.

**Entry format:**

```
### YYYY-MM-DD · PH-X.Y — Task name
**By:** Founder / AI
**Time:** estimated Xd → actual Yd
**Output:** what now exists
**Verified:** what was actually checked
**Diverged:** anything different from the documents (or "none")
**Notes:** anything the next session needs to know
```

---

### 2026-07-29 · PH-0.7 — VPS hardening ✅ EXECUTED

**By:** AI authored · **founder executed**
**Time:** estimated 1.0 d → 0.3 d authoring + founder execution
**Output verified — pasted back, IP and container names redacted:**

```
port 22
permitrootlogin no
passwordauthentication no
kbdinteractiveauthentication no
--- ufw ---     Status: active | deny (incoming), allow (outgoing), deny (routed)
                22/tcp ALLOW IN Anywhere (+v6)
--- fail2ban ---  jail sshd active, 0 currently banned
--- unattended ---  enabled
--- db exposure --- (empty — nothing listening on 5432 or 6379 at host level)
--- containers ---  13 containers, all Up. Coolify healthy. No service interrupted.
```

`BR-1700` satisfied: root login off, password authentication off, keyboard-interactive off.
`BR-1701` satisfied: neither database reachable at host level. **No service was interrupted** —
the regression check that mattered on a box carrying other people's traffic.

**Three deviations, all deliberate, all recorded in the runbook itself rather than only here:**

1. **SSH port unchanged — decision, not omission (`§3` rewritten).** The box serves live client
   projects; a port change on a machine carrying other people's traffic is operational risk for no
   security return, since an unfamiliar port is found by a scan in seconds. `§3`'s actual
   justification was noise reduction, and fail2ban delivers that by banning the source rather than
   hiding the door. `14 §12`'s intent — a hardened SSH surface — is met by `§4`, executed in full.
   The procedure is retained in a collapsed block so a future decision has the steps.

2. **Port 8000 (Coolify dashboard) still publicly reachable — `SB-22`, open.** Password-protected,
   not open, but not acceptable long-term. Not closed here because the obvious fix is an IP
   allow-list and **the founder's address is dynamic** — that trades a security gap for locking the
   founder out of their clients' control panel, which is the worse failure. **`PH-0.8` must close
   it without an allow-list** (Cloudflare Tunnel or an equivalent identity-based proxy removes the
   listener rather than filtering who reaches it).

3. **fail2ban required `mode = aggressive` to function at all — see below.**

**The finding: `BR-1836` — hardening silenced its own monitoring.**

fail2ban installed, jail `sshd` reporting `active`, and **eight deliberate failed logins moved the
counter by zero.** Cause: `§4` set `AuthenticationMethods publickey`, so `sshd` rejects at
**preauth** and logs `Connection reset by authenticating user … [preauth]` — while the stock
filter matches `Failed password`, a line this server no longer emits. Each step was individually
correct; the combination was inert, and `fail2ban-client status` reported health throughout.

Same shape as the three dead fitness functions (`PH-0.16`) and the stylelint rewrite (`PH-0.17`):
loads, reports healthy, enforces nothing. Now `BR-1836` in `12 §19.1`, with the corollary that the
**order is a trap** — verify the detector _after_ the hardening it must survive, or the
verification is stale the moment the control lands.

**Proven the hard way**, which is the only way that counts: after the fix, five attempts produced
a **real ban that locked the founder out**, recovered via the provider web console. A jail
reporting `active` is not evidence it bans anything. Settings then relaxed to `maxretry 6` /
`bantime 15m` / no increment — a dynamic address plus an escalating ban is a self-inflicted
outage that punishes the operator, not the bot.

**Ninety-day exposure question: CLOSED, clean.** Exactly one uid-0 account, two known
`authorized_keys`, every login from the founder's own addresses, no unexplained cron entry, timer
or listener. No rebuild needed. This does not make the exposure retroactively safe — it makes it
_checked_, which is the most that can be claimed.

**Diverged — and this one changes two later tasks:** the server hosts **live client projects**,
not a provider template. 13 containers: 5 apps, `postgres:18-alpine`, `redis:7.2`, plus the
Coolify stack, at ~22% of 8 GB. Every earlier document assumed the whole machine belongs to Josam
Academy. See `§7` and `SB-23`/`SB-24`.

---

### 2026-07-29 · PH-0.7 — VPS hardening runbook (Type B — authored, not yet executed)

**By:** AI (authored). **Execution: founder.**
**Time:** estimated 1.0 d → actual 0.3 d to author. **The task is NOT done** — `BR-1761`,
`BR-1768`: it is done when the founder pastes back Step 8.1's output, not when this file commits.
**Output:** `docs/runbooks/vps-hardening.md` — 12 sections, 15 "already configured differently"
branches, 3 hard gates, 7 lockout-recovery modes.

**Written for a live box, not a fresh install:**

- Every step reads the current state before changing it, and branches where the answer can
  reasonably differ. §1.3 records the whole starting state so later steps compare against it.
- **Three gates that make lockout impossible**, in this order: key login proven in a second
  session **before** root is disabled · a session proven on the new port **before** the firewall
  allows only that port · a new session proven **after** `ufw enable`. Two rescue sessions stay
  open throughout and are closed last.
- The provider web console is proven working at Step 1.1 **as a gate**, because it is the entry
  point of all seven recovery procedures.

**The finding that shapes §5 — `ufw` does not filter Docker-published ports.** Docker's rules sit
in `nat`/`FORWARD`, traversed before the `INPUT` chain `ufw` manages, so a published container
port is reachable from the internet with `ufw` active and default-deny. Two consequences:
enabling `ufw` will **not** cut Coolify off, and `ufw` does **not** protect Coolify's dashboard.
That is precisely why `PH-0.8`'s provider firewall matters — it sits outside the host where
Docker's rules cannot reach. A `DOCKER-USER` rule would also work and is deliberately **not**
attempted here: getting it wrong takes a running service off the internet, and `PH-0.8` achieves
the same restriction with no risk to it.

**Other things worth naming:**

- Ubuntu 24.04 uses **socket activation** for ssh, so `Port` in `sshd_config` alone does not change
  the listening port. §3.1 detects which mode is in use and branches. This is the commonest reason
  a port change appears to work and does nothing.
- `PasswordAuthentication no` alone is **not sufficient** — PAM keyboard-interactive can still
  accept a password. §4.1 adds `KbdInteractiveAuthentication no` and
  `AuthenticationMethods publickey`, and §4.2's **third** login test is the one that proves it;
  the other two pass while passwords still work.
- `BR-1701` is verified **from outside the host**, not with a local `ss`. A container published on
  `0.0.0.0:5432` shows as bound locally _and_ answers remotely; only the remote test distinguishes
  them.
- `unattended-upgrades` is configured with `Automatic-Reboot "false"` — an unannounced 06:00
  reboot on 2 vCPU running the whole stack is an outage, not a patch.
- §9 covers the **ninety-day exposure**: hardening closes the door, it does not establish nobody
  came in. Authorized-key, uid-0, cron, timer and listener checks, with the explicit instruction
  that a real finding means rebuild rather than patch — cheap now, because no production data
  exists.

**Verified:** the artifact only. No server was touched, and none could be — `CLAUDE.md §3`
forbids it. Checked mechanically: **no IP, key, port or credential appears in the file**; six
placeholders only (`<SERVER_IP>`, `<ADMIN_USER>`, `<SSH_PORT>`, `<OLD_PORT>`, `<KEY_PATH>`,
`<YOUR_IP>`).

**Diverged:** none. `§11` lists what this task deliberately does not do and the task that owns
each, so no gap is mistaken for coverage.

---

### 2026-07-29 · PH-0.29 — `BR-1544` conformance across all 24 fields

**By:** AI · **remedial, founder-instructed after `PH-0.27`**
**Time:** estimated 0.5 d → actual 0.45 d
**Output:** `packages/ui/src/form/availability.ts` — one `Availability` union for all 24 fields and
one `OptionAvailability` for options, replacing two local copies and nineteen omissions. Nineteen
field components converted. `ChoiceOption`, `MenuItem` and `TabItem` given the option contract.
`availability.spec.tsx` (74 tests). Stories updated with a third state per control. Fitness cases
**33**–**35** added, one of them a new lint selector.

**Verified:** `pnpm lint` 9/9 · `pnpm typecheck` 8/8 · `pnpm test` 9/9 — **758 tests, 588 in
`@josam/ui`** · `pnpm build` 5/5 · `pnpm verify:fitness` → **35 caught, 0 NOT caught**.

**Correction to `SB-28`: it was nineteen fields, not sixteen.** I reported sixteen when raising it
and did not count before writing the number down. The real figure is 6 (`PH-0.22`) + 3 (`PH-0.23`)

- 10 (`PH-0.24`) = 19 of 24, and the other five — `PH-0.25`'s — were already conformant.

**Why this was worth doing before Phase 1 rather than after.** `readOnly` and `disabled` are not
synonyms. A disabled control is removed from the keyboard **and from the accessibility tree**, so a
screen-reader user cannot reach it at all; a read-only one keeps its place in the tab order and its
value stays readable and copyable. An order total, a locked email address or a captured timestamp
rendered `disabled` is, to a screen-reader user, simply absent from the page. Nineteen fields could
only express the state that hides things.

**Three defects the new lint rule found the moment it was switched on**, all outside the scope I
had been given — which is the argument for a rule over a sweep:

1. `MenuItem.disabled` and `TabItem.disabled` were bare booleans. A greyed-out menu item and an
   unopenable tab are the same dead end one level down, and the reason ("publish the course first")
   is usually the only thing telling the user what to do next. Both now take `OptionAvailability`.
2. `MultiSelect`'s `toggle` closed over `readOnly` without declaring it — a stale-closure bug that
   `react-hooks/exhaustive-deps` caught because the new guard put a new value inside the callback.
3. `aria-readonly` is **not valid on `role="group"`**, which is where I first put it on `OTPField`.
   `jsx-a11y` rejected it. The segments are real `<input readOnly>` elements, which is what a
   screen reader actually announces; the group keeps only the explanation.

**The case that made the difference between a rule and a naming convention.** Case 33 proves a bare
`disabled?: boolean` fails the build. On its own that enforces a _shape_ — it would pass a union
that permitted `disabled: true` with no reason. Case 34 compiles that exact violation and requires
`TS2322`, and case 35 requires the same for `readOnly` and `disabled` together. Without 34 and 35,
case 33 would be checking that people use a type whose contents nobody had verified (`BR-1830`).

**`BR-1835` — the specs were made to fail first.** Three guards were removed deliberately: the
`Checkbox` change-decline, the `OTPField` paste guard, and `TextField`'s `readOnly` pass-through.
Exactly three tests failed, each for the reason it names, and the other 71 stayed green. The
`OTPField` case is the one a native attribute does not cover: `readOnly` on an `<input>` blocks
typing, but `OTPField` writes to form state from its own paste and keydown handlers, which the
browser never routes through the attribute — so a read-only code could be pasted over and cleared
with `Backspace` while looking read-only.

**Every assertion is on the effect, not the marker (`BR-1837`).** Whether `Tab` reaches the
control, and whether the submitted value changed — not whether the prop was passed. A test that
asserted `disabled={true}` was handed over would agree with a component that accepted the prop and
ignored it, which is how nineteen fields went twenty-two tasks without anyone noticing.

---

### 2026-07-29 · PH-0.27 — Feedback: the sixteen, and Wave 1 complete

**By:** AI
**Time:** estimated 2.0 d → actual 1.1 d
**Output:** `packages/ui/src/architectural/QueryBoundary.tsx`. `packages/ui/src/feedback/` —
`banners.tsx` (`InlineAlert`, `OfflineBanner`, `ReadOnlyBanner`), `overlays.tsx` (`Dialog`,
`ConfirmDialog`, `Drawer`, `Popover`, `Tooltip`, `DropdownMenu`), `progress.tsx` (`Skeleton`,
`ProgressBar`, `ProgressRing`), `states.tsx` (`EmptyState`, `ErrorState`), `Toast.tsx` (`Toast`,
`ToastProvider`, `useToast`). `feedback.spec.tsx` (86 tests) · `feedback.stories.tsx` (7 stories).
Fitness cases **31** and **32** added.

**Dependencies pinned by this task** (`BR-1815` — the installing phase pins the version):
`@tanstack/react-query` **5.101.4** · `@radix-ui/react-dialog` **1.1.23** ·
`@radix-ui/react-dropdown-menu` **2.1.24** · `@radix-ui/react-toast` **1.2.23** ·
`@radix-ui/react-tooltip` **1.2.16** · `@radix-ui/react-progress` **1.1.16**. All exact
(`BR-1591`) — pnpm added them as `^` ranges and they were rewritten.

**Verified:** `pnpm lint` 9/9 · `pnpm typecheck` 8/8 · `pnpm test` 9/9 — **684 tests, 514 of them
in `@josam/ui`** · `pnpm build` 5/5 · `pnpm verify:fitness` → **32 caught, 0 NOT caught**.

**The task's stated Output is a compile error.** `QueryBoundary`'s `loading`, `empty` and `error`
are required props, and case **31** proves it with `TS2741` rather than asserting it in prose.
Case **32** does the same for `BR-1551` — an `EmptyState` without an `action` does not compile,
because an empty screen with no way out is exactly what ships when the prop is optional and the
deadline is close.

**The finding: `BR-1470`'s focus return was doing nothing.**

Radix implements "return focus to the trigger" by focusing its own `Dialog.Trigger` ref. These
dialogs are **controlled** — a screen owns the `open` state and there is no `Dialog.Trigger`
anywhere — so that ref was always null and the restore focused nothing. Focus landed on `<body>`,
which means the next `Tab` restarted at the top of the document.

Every visible part worked: the dialog opened, trapped focus, closed on `Escape`. The one part
invisible to a sighted mouse user was the part that did not. `useReturnFocus` now tracks the last
element focused outside any dialog through a `focusin` listener and restores it in
`onCloseAutoFocus` — a listener rather than reading `activeElement` when `open` flips, because by
the time any effect of ours runs Radix has already moved focus into the dialog, so we would capture
its own first field. It is also correct for a dialog opened from a menu item or a keyboard shortcut,
where there is no trigger element at all.

**`QueryBoundary`'s state order is not the obvious one, and `BR-1538` is why.** Data is checked
_before_ error and _before_ loading. A list that loaded and then failed to refresh keeps showing
the list — replacing a working table with a full-page error because a background poll timed out
discards the user's scroll position and selection to report something they can already see is
stale. Both are asserted against the real TanStack Query rather than a hand-made object, because
the claim is about what the library leaves in `data` after a failed refetch, and a mock would only
assert my reading of the docs.

**Three constraints written into types rather than documentation.**
`Toast`'s only permitted action is **undo** (`BR-1550`): undo is the one action that is safe to
lose, since a toast that vanishes before the user reaches it leaves them with the outcome they
already asked for. "Retry", "View" and "Confirm" are questions, and a question that disappears
after six seconds is `BR-1377`'s prohibition wearing a different label. The six-second floor is a
`Math.max`, so asking for one second has no effect. `Tooltip`'s `content` is a `string`, not a
`ReactNode` — a tooltip is unreachable by touch and gone when the pointer moves, so anything
interactive inside one is unreachable for a large share of users and anything essential is
information they never receive.

**Two smaller defects the gates caught.** `ToastProvider` read its id counter from inside a
`setState` updater, which React may invoke twice under StrictMode — two toasts, one id. It is a
ref now. And `BR-1429` rejected `key={index}` on the skeleton rows; rather than a template literal,
which slips past the rule's selector without changing anything (`SB-20`), each row carries an `id`.

**Wave 1 is complete: 69 of 69 components** (`12 §20.12.1`) — 8 primitives, 8 architectural,
2 controls, 2 form, 24 fields, 9 layout/navigation, 16 feedback.

---

### 2026-07-29 · PH-0.26 — Layout and navigation

**By:** AI
**Time:** estimated 1.5 d → actual 0.75 d
**Output:** `packages/ui/src/layout/` — `AppShell.tsx` (`AppShell`), `Breadcrumb.tsx`
(`Breadcrumb`, `SkipLink`), `PageHeader.tsx` (`PageHeader`, `PageFooter`), `navigation.tsx`
(`TopBar`, `SideNav`, `BottomNav`, `Tabs`). `layout.spec.tsx` (63 tests) ·
`layout.stories.tsx` (6 stories). Fitness cases **29** and **30** added.

**Verified:** `pnpm lint` 9/9 · `pnpm typecheck` 8/8 · `pnpm test` 9/9 · `pnpm build` 5/5 ·
`pnpm verify:fitness` → **30 caught, 0 NOT caught**.

**The task's stated Output — `PageHeader` enforces one primary action — is a compile error, and
that is proven by compiling the violation** (case 29, `TS2322`). The mechanism is that
`primaryAction` is a _description_ rather than a `ReactNode`. A `ReactNode` prop cannot express
`BR-1549` at all: `<>{save}{publish}</>` is one valid node containing two buttons, and no type can
see inside a fragment. An object holds one label and one handler and nothing else. Case 30 extends
the same idea to `BR-1347` — the disabled arm of the union cannot be written without its reason.

**The finding that matters: a test that agreed with the bug.**

`TopBar`, `SideNav` and `BottomNav` moved the roving `tabIndex` on arrow keys and **left focus
where it was**. Pressing `ArrowDown` in the sidebar did nothing visible. The DOM looked entirely
correct — one tab stop, the right element marked — and the spec I had written to prove it asserted
_which element carried `tabindex="0"`_, so it passed against the defect. Only `Tabs` moved focus,
because `Tabs` happened to be written last.

It surfaced from the opposite direction. `Tabs` restored focus after **every** keydown, `Tab`
included, so tabbing out of the tab strip moved focus into the panel and a queued callback pulled
it straight back — a keyboard trap. That one failed immediately, because its spec asserted
`document.activeElement`. Chasing it exposed the three components whose specs did not.

Both are now one mechanism: `useRovingFocus` owns the focus move, performs it in a `useEffect`
keyed on the active index (so it runs after React has committed the new `tabIndex`, not before),
and only from a branch that called `preventDefault`. The `SideNav` spec asserts
`document.activeElement`.

**The general lesson, which is the reusable part:** asserting the _marker_ rather than the _effect_
produces a test that passes on a broken component. `tabindex="0"` is a marker; the focused element
is the effect. Same shape as `PH-0.21`'s focus-first-error, which passed on React Hook Form's
built-in behaviour rather than on ours (`SB-19`).

**`SkipLink`, where two subtleties decide whether it works at all.** It must be in the DOM and
focusable while invisible — `display: none` until focus cannot work, because an element that is
not rendered cannot receive the focus that would reveal it. And its target must be focusable, or
the browser moves the _scroll_ position and leaves focus on the link, so the next `Tab` returns to
the second nav item. The link appears to work and does nothing. Both are asserted directly, and
`AppShell` gives `main` a `tabIndex={-1}` for the second.

**One more direction-dependent keyboard contract.** The inline arrows in `TopBar`, `BottomNav` and
`Tabs` resolve against the document direction, asserted as a four-case table exactly like
`PH-0.25`'s calendar. `SideNav` is vertical and deliberately ignores the inline arrows entirely —
arrow keys that do nothing are better than arrow keys that swallow a scroll.

`Breadcrumb` enforces `BR-1366`'s floor itself and renders **nothing** at two levels or fewer,
rather than leaving forty call sites to remember it.

---

### 2026-07-29 · PH-0.25 — Time and file fields

**By:** AI
**Time:** estimated 1.5 d → actual 0.8 d
**Output:** `packages/ui/src/fields/calendar.ts` — date arithmetic, no date library.
`file-validation.ts` — byte-signature sniffing and crop arithmetic, both pure.
`time-fields.tsx` — `DatePicker` `DurationField` `TimestampField`. `file-fields.tsx` —
`FileDrop` `ImageDrop`. `time-file-fields.spec.tsx` (85 tests) · `time-file-fields.stories.tsx`
(6 stories) · `src/intl-week-info.d.ts`.

**Verified:** `pnpm lint` 9/9 · `pnpm typecheck` 8/8 · `pnpm test` 9/9 (`@josam/ui` 9 files,
192 field tests) · `pnpm build` 5/5 · `pnpm verify:fitness` → **28 caught, 0 NOT caught**.

**The RTL calendar, which is the task's stated proof.** Arrow keys on the day grid resolve against
the document direction, asserted as a four-case table: in LTR `ArrowRight` is tomorrow, in RTL it
is yesterday. This is the one behaviour in the component that logical CSS properties cannot fix,
because it is not layout — the grid mirrors itself correctly either way; what changes is which key
means "forward". Bound naively, the highlight moves opposite to the key in Arabic.

The week also starts where the **locale** starts it, read from `Intl.Locale.getWeekInfo()`:
Saturday for `ar-EG`, Sunday for `en-US`, Monday for `en-GB`. A hardcoded Monday would have been
wrong in both of this product's languages.

**Three defects the tests found, two of them mine from minutes earlier.**

1. **`validateFile` let a disguised executable through — the exact case `BR-1467` exists for.**
   The first version treated "these bytes match no known signature" as acceptable, so that files
   of formats absent from the signature table would not be rejected. Correct for `text/csv`, and
   it also passed a PE binary renamed `photo.png`, because `MZ` matches nothing. The right question
   is not _did we recognise these bytes_ but _do we know what the declared type should look like_:
   we know PNG, these bytes are not PNG, reject. Caught by the one test written specifically to
   prove the rule was real rather than nominal.

2. **`isIsoDate` accepted 30 February.** V8 does not return `Invalid Date` for
   `2026-02-30T12:00:00Z` — it rolls the date to 2 March. So a `Number.isNaN(getTime())` check
   passes, and an impossible date reads back later as a different, entirely plausible one. Fixed by
   round-tripping: format the parsed date again and require it to equal the input.

3. **`TimestampField`'s capture button announced the field label, not what it does.**
   `aria-labelledby` on a `button` overrides its own text, so "Capture" became "Moment". The field
   and the button are two different things with two different names; the wrapper is now a
   `role="group"` carrying the field name, and the button names itself. Same root cause as
   `PH-0.24`'s `Slider`: naming wired onto the wrong element looks complete and says the wrong
   thing.

**Two lint findings that removed code rather than adding it.**
`jsx-a11y/no-static-element-interactions` rejected the drop zone as a `div` with drag handlers —
correctly, since a div carrying drop handling is reachable by pointer only. Making it a real
`<label>` wrapping the file input gave click-anywhere for pointer users and `Enter`/`Space` for
keyboard users natively, which **deleted** the separate browse button. `interactive-supports-focus`
rejected `role="grid"` with a key handler on a never-focusable container; moving the handler to the
cells, which do carry the roving `tabIndex`, is also the correct ARIA pattern rather than a
concession. axe then caught the grid having no `row` elements at all — `aria-required-children` and
`aria-required-parent` — which the flat version had hidden behind an identical appearance.

**One `eslint-disable` reached for and removed (`BR-1512`, second instance after `SB-20`).**
Typing `Intl.Locale.getWeekInfo` requires the `namespace` keyword, which
`@typescript-eslint/no-namespace` rejects. I wrote a disable, then checked whether the rule was
actually right: it was — a namespace in application code usually is wrong, and the rule allows
definition files precisely because ambient declarations are the legitimate exception. The
declaration moved to `src/intl-week-info.d.ts`, where it needs no disable and is easier to find and
delete when TypeScript's `lib` catches up.

---

### 2026-07-29 · PH-0.24 — Choice fields: the ten

**By:** AI
**Time:** estimated 2.0 d → actual 1.15 d
**Output:** `packages/ui/src/fields/choice-toggles.tsx` — `Checkbox` `Switch` `RadioGroup`
`RadioCard` `Slider`, all Radix-backed. `packages/ui/src/fields/choice-composites.tsx` —
`Select` (Radix), plus `Combobox` `MultiSelect` `TagsInput` `RatingInput` built directly against
the WAI-ARIA patterns, because Radix has no combobox and building one on `Popover` would mean
owning the keyboard contract anyway while inheriting a positioning layer these controls do not
need. `choice-fields.spec.tsx` (56 tests) · `choice-fields.stories.tsx` (11 stories) ·
`vitest.setup.ts` · `test-environment.spec.tsx` · `patches/jsdom@30.0.0.patch`. `FormField` gained
`labelledBy`. Fitness cases 26–28 added.

**Verified:** `pnpm lint` 9/9 · `pnpm typecheck` 8/8 · `pnpm test` 9/9 · `pnpm build` 5/5 ·
`pnpm verify:fitness` → **28 caught, 0 NOT caught**.

**Four findings, in the order they cost time.**

**1. `react-hooks` was not installed, and its first run found seven real problems.**
Nothing in the toolchain could see that I had called `useListboxKeys` inside `Controller`'s
`render` prop. A hook called in a render prop lands in the _parent's_ hook sequence — stable while
the call is unconditional, and one early return away from a corrupted one. Types cannot see it and
the tests passed on it. Installing `eslint-plugin-react-hooks@7.1.1` with **both** rules at
`error` reported two rules-of-hooks violations and five genuine jsx-a11y defects immediately. The
composites were rewritten so each control body is a real component with a thin `Controller`
wrapper. Proven by deliberate violation as cases **26** and **27** (`BR-1830`).

**2. A jsdom defect that made `Slider` untestable — patched upstream, not worked around.**
`getComputedStyle` threw `TypeError: object null is not iterable` from
`living/css/helpers/font-sizes.js:116`, which destructures `FONT_SIZE_REGEXP.exec(...)` with no
null check. `resolveCalc()` cannot reduce a `calc()` containing a percentage — that needs a
containing block, and jsdom has no layout engine — so the regexp does not match and the
destructuring throws. It throws from `getComputedStyle` **itself**, taking down the whole
element's computed style, so `@testing-library`'s `isInaccessible` and `axe-core` both crash on
any tree containing such a value. Radix positions the `Slider` thumb with
`left: calc(<percent>% + <offset>px)`.

Minimal repro: a `span` styled `left: calc(33.3333% + 0px)`, then `getComputedStyle(el)`. Not
version-specific — 29.1.1, 30.0.0 and 30.0.1 all throw, and vitest resolves its own jsdom, so a
version pin could not move it in any case.

Fixed by `patches/jsdom@30.0.0.patch`: a four-line null guard falling through to the function's
own documented as-is fallback, which is already how it treats an unresolvable percentage. The
alternative was leaving `Slider` with no role query and no axe run, which `BR-1571` does not
allow. Guarded by `src/test-environment.spec.tsx` and proven load-bearing by restoring the
original two lines — **6 failures**, green again on restore.

**3. Two accessibility defects that both looked correct in the markup.**
axe reported `aria-input-field-name` on `Slider`. First cause: `id` sat on the Radix Root, but
`role="slider"` is on the **thumb**. Moving it did not fix it, which exposed the second and more
general cause — **`<label for>` names only _labelable_ elements**: `input`, `select`, `textarea`,
`button`, `meter`, `output`, `progress`. A `span` carrying a `role` is not one, so the wiring was
complete, conventional, and named nothing. `FormField` now exposes `labelledBy`, and any control
whose focusable element is not labelable uses `aria-labelledby` rather than relying on `id`.
`PH-0.25`'s `FileDrop` and several of `PH-0.27`'s will need it.

**4. `MultiSelect` was inert to a keyboard and perfect with a mouse.**
The trigger is a real `button`, so `Enter` and `Space` synthesise a click. `onKeyDown` opened the
listbox and the synthesised click immediately closed it — two toggles, no visible change. Only a
keyboard-only test could see it; every pointer test passed throughout. Fixed with
`preventDefault()` on both keys.

**One thing that was NOT a defect, recorded because it looks exactly like one.**
`RadioGroup` and `RadioCard` moved focus on arrow keys without moving the selection. Radix defers
the focus move into a `setTimeout` so it runs after the key event has bubbled to `document`, where
its "an arrow key is down" flag is set — that flag is how a radio group distinguishes arrow
navigation, which must select, from programmatic focus, which must not. `userEvent.keyboard` fires
keydown and keyup back to back, so the flag is set and cleared before the deferred callback runs.
Raising userEvent's `delay` does **not** help: that delay sits between keystrokes, not between one
key's down and up. The specs now press and hold via `pressArrow()`. Every Radix roving-focus
component needs it, including `PH-0.26`'s nav components.

---

### 2026-07-29 · PH-0.23 — Identity fields: PhoneField, EmailField, OTPField

**By:** AI
**Time:** estimated 1.0 d -> actual 0.5 d
**Output:**

- Three fields in `packages/ui/src/fields/identity-fields.tsx`, all on `useFieldControl`.
- All three are **always LTR**, whatever the interface direction. A phone number, an address and
  a one-time code are identifiers: their character order has nothing to do with the reading
  direction of the page around them (`BR-1396`, `BR-1393`).

**Verified:** 20 specs, all against a real DOM, asserting submitted values and focus movement.

- **LTR isolation** — `PhoneField` and `EmailField` are `dir="ltr"`, the OTP group is `dir="ltr"`,
  and the isolation survives `document.documentElement` being set to `rtl`. It is on the control,
  not inherited, which is the whole point.
- **`BR-1409`** — `PhoneField` is `type="tel"`, asserted **not** to be `type="number"`. A number
  input strips the leading zero, refuses `+`, and offers a spinner for a value with no arithmetic
  meaning.
- **E.164 normalisation** — `100 123 4567`, `0100-123-4567`, `(0100) 123 4567` and `01001234567`
  all store `+201001234567`; asserted as a set of size 1, because the point is that four
  presentations of one person do not become four records.
- **`EmailField`** lower-cases and trims, so one person cannot own two accounts by capitalisation.
- **OTP paste distribution** — pasting `482913` into segment 1 fills all six and fires
  `onComplete('482913')`; `482-913` works too (non-digits stripped); overflow is ignored rather
  than wrapped; the form receives the **joined** string, not six fields.
- Auto-advance on entry but **not** on delete — advancing as someone clears a digit makes
  correcting a typo impossible. Backspace in an empty segment steps back and clears. Arrow keys
  move without changing anything.
- Only segment 1 carries `autocomplete="one-time-code"`.
- `pnpm build` 5/5 . `lint` 9/9 . `typecheck` 8/8 . `test` 9/9 . **217 specs in `packages/ui`** .
  `check:deps` clean . `format:check` clean . `verify:fitness` 25/25 . `storybook build` succeeds.

**Diverged:** none.

**Notes:**

- The OTP segments are presentation; the **field value is the joined string**. Registering six
  separate fields would push reassembly into every caller and make validation report on a digit
  rather than on the code.
- I reached for an `eslint-disable` on the segment `key` and removed it: `BR-1512` prohibits
  silencing a rule, and the rule would not have fired on a template literal in any case. The
  reflex is worth noting more than the line was.

---

### 2026-07-29 · PH-0.22 — Text fields: TextField, TextArea, PasswordField, NumberField, CurrencyField, CodeField

**By:** AI
**Time:** estimated 1.0 d -> actual 0.5 d
**Output:**

- Six fields in `packages/ui/src/fields/text-fields.tsx`. **All six consume `useFieldControl`**,
  so the label association and the `aria-describedby` / `aria-invalid` wiring are `FormField`'s —
  written once at `PH-0.21` rather than six times here.
- No field accepts a `placeholder`. `BR-1402` — a placeholder is never the label, and it vanishes
  the moment typing starts, which is exactly when someone checking what the field wanted needs it.

**Verified:** 29 specs, all against a real DOM, asserting what the form **submits** rather than
what the component renders.

- Every field is located by `getByLabelText` and carries the ARIA wiring — the inheritance holds.
- **`BR-1410`** — `'   spaced   '` typed, `'spaced'` submitted.
- **`BR-826`** — `CurrencyField` submits integer minor units: `49.90` -> `4990`, `100` -> `10000`,
  `0.05` -> `5`, `0.29` -> `29`, `1.13` -> `113`.
- **`BR-1409`** — `NumberField` submits a `number`, asserted with `typeof`, not a numeric string.
- **`BR-1414`** — `PasswordField` toggles type and accessible name, never sets
  `autocomplete="off"`, distinguishes `current-password` from `new-password`, and its toggle never
  submits the form.
- `CodeField` is `dir="ltr"`, upper-cases on submit, and stops at its length.
- Counters count and announce `aria-live="polite"`.
- `pnpm build` 5/5 . `lint` 9/9 . `typecheck` 8/8 . `test` 9/9 . 197 specs in `packages/ui` .
  `check:deps` clean . `verify:fitness` 25/25 . `storybook build` succeeds.

**Diverged:** none.

**Notes:**

- **A second assertion of mine was wrong, and failing it is what surfaced the real number.**
  The rounding test claimed `49.90 * 100` truncates to `4989`. It does not — the product is
  `4990.000000000001`, which truncates correctly. The genuine failures are the products landing
  just _below_ an integer: `0.29 * 100` is `28.999999999999996`, truncating to **28**, a
  one-piastre undercharge on a value the user typed exactly. Counted rather than hand-waved:
  **1,145 of the 20,000 amounts under 200.00** truncate to the wrong integer. The assertion now
  states that number, so nobody later decides truncation is close enough. (`BR-1835`.)
- `Counter` reads through `useWatch` rather than `formState`, so a keystroke re-renders the
  counter and not the whole form — the uncontrolled-by-default property `13 §4` chose React Hook
  Form for.
- `PasswordField`'s toggle is a plain `<button>` rather than `IconButton`: it lives inside the
  control and must not read as a separate action. It is still a real button with a real accessible
  name and `aria-pressed`.

---

### 2026-07-29 · PH-0.21 — Form + FormField (label, hint, required, error, ARIA)

**By:** AI
**Time:** estimated 1.0 d -> actual 0.7 d
**Output:**

- `Form` — dirty tracking, submit lock, focus-first-error, leave warning (`12 §20.7`).
- `FormField` — label, hint, required marker, error, and the `aria-describedby` / `aria-invalid`
  wiring, provided through context.
- `useFieldControl()` — **the inheritance point for `PH-0.22` through `PH-0.25`.** Every field
  spreads it onto its input, so the `BR-1402`–`BR-1406` wiring is written once rather than
  re-derived ~20 times.
- `JOSAM_FORM_OPTIONS` — `mode: 'onTouched'` (`BR-1404`) and `shouldFocusError: false`.
- React Hook Form **7.83.0**, used directly, no wrapper (`BR-1818`).

**Verified:** 18 specs, every one against **real DOM behaviour** — typing, blurring, submitting,
reading `document.activeElement` — never against props.

- **`BR-1402`** — each control is located by `getByLabelText`, which resolves through the
  accessibility tree and fails outright if `htmlFor`/`id` do not actually match.
- **`BR-1406`** — focus lands on the first invalid field in **document** order; on the second
  field when only that one is invalid; nowhere when the form is valid; and the field is scrolled
  into view.
- **`BR-1405`** — the error announces via `role="alert"`, `aria-invalid` flips to `true`,
  `aria-describedby` grows to include the error id, and it clears only once corrected.
- **`BR-1404`** — silent while typing in an untouched field; reports on blur.
- **`BR-1412`** — a real `beforeunload` event is dispatched and `defaultPrevented` inspected:
  pristine does not block, dirty blocks, a successful submit stops blocking, `warnOnLeave={false}`
  never blocks, and unmount removes the listener.
- `pnpm build` 5/5 . `lint` 9/9 . `typecheck` 8/8 . `test` 9/9 . 168 specs in `packages/ui` .
  `storybook build` succeeds.

**Diverged:** none.

**Notes:**

- **Two real defects, both found only because the assertions were against the DOM.**

  1. **Focus-first-error was completely inert.** The first implementation queried
     `[aria-invalid="true"]` inside the `onInvalid` callback — which runs _before_ React re-renders
     with that attribute, so the query always matched nothing and returned early. **All four focus
     tests passed anyway**, on React Hook Form's built-in `shouldFocusError` — the very behaviour
     the code comment said was wrong, because it focuses in _registration_ order rather than
     document order. Found by setting `shouldFocusError: false` and watching focus stop moving.
     Now the field names come from the `errors` object (known synchronously) and the DOM is
     consulted only for order, which validation does not change. `JOSAM_FORM_OPTIONS` disables
     RHF's version so exactly one mechanism is live and it is the tested one.
  2. **The submit lock did not exist.** Clicking submit twice ran the handler twice. `isSubmitting`
     is React state and updates on the next render, so both clicks in one tick read `false`. Now a
     `useRef`, which flips synchronously. `isSubmitting` remains the right thing to render a
     spinner from and the wrong thing to gate on.

- **`BR-1835` applied to this task's own tests**: `focus()` was deliberately removed and the suite
  went from 18 passing to 2 failing, naming the two focus assertions. Restored, 18 passing. Before
  that check these tests were green and worthless.
- **The API held up and nothing needed escalating.** The one decision worth recording is that
  `useFormField` **throws** outside a `FormField` rather than degrading: a control with no label
  association is the exact defect `BR-1402` exists to prevent, and silently rendering it would
  ship it. Asserted.
- `role="alert"` on the error rather than moving focus to it — moving focus there would fight
  `BR-1406`, which puts focus on the field itself.

---

### 2026-07-29 · PH-0.20 — Button and IconButton, all variants and states

**By:** AI
**Time:** estimated 0.5 d -> actual 0.4 d
**Output:**

- `packages/ui/src/controls/Button.tsx` — `Button` (4 variants x 3 sizes) and `IconButton`.
  Closed variant and size sets, no `className`: both are the escape hatches through which a
  second Button arrives without anyone deciding to build one (`BR-1350`).
- 5 stories: variants, sizes, the five states side by side, the disabled-explains case, and icon
  buttons. Keyboard map documented in the story (`BR-1531`).
- 40 Button specs; 150 in `packages/ui` overall.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **Five states in Storybook — the task Output**, and each asserted as _distinct_ rather than
  merely present: `hover:bg-accent-hover`, `active:bg-accent-pressed`, `focus-visible:ring-2`,
  `disabled:opacity-50`, and loading as `aria-busy="true"` **plus** the `disabled` attribute
  (`BR-1346`).
- **`BR-1347` is enforced by the type system, not by convention.** `disabled` without
  `disabledReason` does not compile:

  ```
  error TS2322: Property 'disabledReason' is missing in type '{ children: string; disabled: true; }'
      but required in type '{ disabled: true; disabledReason: string; }'.
  ```

- **`BR-1471` likewise**: `<IconButton icon={ArrowRight} />` fails with
  `Property 'label' is missing`.
- Both added permanently to `verify:fitness` as cases 22 and 23 — **23 caught, 0 missed**.
- `focus-visible`, never `focus`: asserted with a negative lookbehind so a mouse user never gets a
  ring and a keyboard user always does.
- Loading is `disabled` as well as busy — the double-submit guard is the behaviour, not the
  styling. A second click never reaches the handler.
- `BR-1217` / `BR-1344` — only `primary` uses the accent, only `danger` uses red, and `primary`
  pairs the accent with `accent-contrast`, the `SB-18` token that clears 4.5:1.
- Every state rendered in **both themes and both directions with axe clean** — 5 specimens x 4
  combinations.
- `pnpm build` 5/5 . `lint` 9/9 . `typecheck` 8/8 . `test` 9/9 . `check:deps` clean .
  `format:check` clean . `verify:fitness` 23/23 . `storybook build` succeeds.

**Diverged:** none.

**Notes:**

- `Button` has exactly 8 props and `IconButton` 8. `BR-1351` calls more than 8 a signal the
  component is doing too much, so that ceiling was a design constraint rather than a coincidence —
  it is why `fullWidth` and an `icon` slot were left out of `Button` rather than added "while we
  are here".
- Both are `"use client"`. They need a click handler, so the boundary is real; it is still a leaf
  boundary, not the blanket layout-level `"use client"` that `BR-1502` prohibits.
- `title` carries the disabled reason. It is the widest-reaching mechanism available without a
  `Tooltip`, which is `PH-0.27`. When `Tooltip` lands, `BR-1347`'s presentation should be revisited
  — `title` is not keyboard-accessible on every platform, and the reason deserves better than a
  hover affordance.

---

### 2026-07-29 · PH-0.18 — Architectural: T, Bidi, Money, Num, Percent, Duration, When, CopyableId

**By:** AI
**Time:** estimated 1.0 d -> actual 0.5 d
**Output:**

- `packages/ui/src/architectural/` — eight components from `12 §20.6`. Not visual; they are what
  keep every screen correct.
- All eight delegate formatting to `@josam/i18n` rather than reimplementing it. A second
  formatting path is how one screen shows Arabic-Indic digits while the next shows Western ones.
- Stories in both languages, so the toolbar demonstrates the behaviour rather than describing it.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **Bilingual + LTR isolation verified — the task Output.** 27 specs in
  `architectural.spec.tsx`, 110 in `packages/ui` overall.
  - `T` renders Arabic for `ar`, English for `en`, and **falls back to Arabic** when English is
    missing — tagging the fallback `lang="ar"` so a screen reader does not announce Arabic in an
    English voice. There is no reverse fallback: `ar` is required by the type (`BR-524`).
  - `Bidi` emits `<bdi dir="ltr">`. Asserted in a real RTL DOM: the isolated run reads
    `example.com` and the surrounding text reads the sentence with the full stop on the correct
    side (`BR-1393`, `BR-1236`).
  - `Money` scales by the **currency exponent** — EGP 12345 to `123.45`, JOD to `12.345`,
    JPY to `12,345` — with tabular figures and `dir="ltr"` (`BR-826`, `BR-1428`, `BR-1341`).
  - `Duration` renders `0:00`, `0:05`, `1:05`, `12:05`, `1:00:00`, `1:02:05`, always LTR:
    mirroring `12:05` would render `05:12`, which is not a formatting quirk but a different time
    (`BR-1234`).
  - `When` renders one instant as `Jul 30, 2026` in Cairo and `Jul 29, 2026` in Los Angeles, and
    always emits the UTC instant as the machine-readable `dateTime` (`BR-825`).
  - Arabic output carries **no Arabic-Indic digits** for money, numbers, percentages or dates
    (`BR-1226`).
- `pnpm build` 5/5 . `lint` 9/9 . `typecheck` 8/8 . `test` 9/9 . `check:deps` clean .
  `format:check` clean . `verify:fitness` 21/21 . `storybook build` succeeds.

**Diverged:** none.

**Notes:**

- **A test of mine passed for the wrong reason and was corrected.** The timezone check originally
  compared Cairo against Tokyo — but 21:30 UTC is the 30th in **both**, so the assertion was only
  ever true because of the clock, never the date. Recomputed against actual `Intl` output and
  split into two: a date-boundary case (Cairo vs Los Angeles) and a clock-time case. An assertion
  that cannot distinguish the thing it names is not a test.
- **`locale` is an explicit prop on all eight, not a context.** `PH-0.13` already deferred
  per-request locale resolution to Phase 1, and there is no locale segment in the router yet. An
  explicit prop also keeps seven of the eight server-renderable — a client context provider would
  turn every number formatter into client JavaScript for text that never changes after render.
  When Phase 1 adds locale routing it can add a provider feeding this prop; nothing here changes.
- **`CopyableId` is the first `"use client"` in the codebase**, and deliberately the smallest
  possible one: a single leaf that needs a click handler and the clipboard. `BR-1502` prohibits a
  _blanket_ `"use client"` at a layout boundary, which is the opposite of this.
- `When` requires `timeZone` rather than defaulting it. Omitted, `Intl` falls back to the
  runtime's zone — UTC on the server, the device's in the browser — so a deadline would differ
  between SSR output and hydration, and both renderings look like plausible times.
- `Money` has no default currency. A default is silently wrong the first time the platform sells
  in a second one, and the failure surfaces as a number on a receipt rather than as an error.

---

### 2026-07-29 · PH-0.17 — Primitives: Text, Heading, Stack, Inline, Grid, Box, Icon, Surface

**By:** AI
**Time:** estimated 1.5 d -> actual 0.7 d
**Output:**

- Eight primitives in `packages/ui/src/primitives/`, each accepting **token keys only**. No
  `className` prop on any of them: it would be an escape hatch straight past `BR-1342` and
  `BR-1533`, and an escape hatch that exists gets used.
- `primitives.stories.tsx` — 8 stories covering the type scale, tones, heading levels, the
  spacing scale, surfaces, grids, icon mirroring and full composition.
- `primitives.spec.tsx` — 83 specs. `apps/web/app/globals.spec.ts` — the Tailwind canary.
- `apps/web/app/(public)/page.tsx` rebuilt on primitives: no `className`, no raw CSS (`BR-1534`).
- Pinned: lucide-react **1.27.0** (matches `13 §18.1`), eslint-plugin-jsx-a11y **6.10.2**.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **Off-scale values are TYPE errors, not lint errors — the task Output (`DEC-40`).** Compiled,
  with the error codes:

  ```
  __violation.tsx(4,24): error TS2322: Type '"19px"' is not assignable to type
      '"2xs" | "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | undefined'.
  __violation.tsx(5,25): error TS2322: Type 'number' is not assignable to type 'SpaceToken | undefined'.
  __violation.tsx(6,24): error TS2322: Type '"#E8B04B"' is not assignable to type 'TextTone | undefined'.
  __violation.tsx(7,25): error TS2322: Type '"5"' is not assignable to type 'SpaceToken | undefined'.
  ```

  `DEC-40`'s stated valid form — `<Stack gap="4"><Text size="sm" tone="secondary" /></Stack>` —
  compiles clean.

- **jsx-a11y activated and proven**, added permanently to `verify:fitness` as cases 18 and 19:
  a clickable `<div>` and an unnamed `<button>` both fail.
- **`BR-1429` proven** (case 20) — it was configured at `PH-0.16` but never demonstrated, and the
  coverage ledger recorded it as unproven rather than counting it.
- **`pnpm verify:fitness` → 21 caught, 0 missed.**
- 83 primitive specs: every primitive rendered in all four theme/direction combinations, axe run
  against each of the 32 combinations, plus assertions that no primitive emits a raw hex, a
  Tailwind palette utility, or a physical direction utility.
- `pnpm build` 5/5 · `lint` 9/9 · `typecheck` 8/8 · `test` 9/9 · `lint:css` clean ·
  `check:deps` no violations · `format:check` clean · `storybook build` succeeds.

**Diverged:**

1. **`SpaceToken` changed from numeric to string keys.** `DEC-40` writes the valid form as
   `<Stack gap="4" />` — a token _name_. Mine were numeric, so `gap="4"` failed to compile while
   `gap={4}` passed: the exact inverse of the specification. Beyond conformance the string is the
   better type: `gap={4}` invites `gap={4 * 2}` and `gap={someCount}`, arithmetic on a scale
   position that yields 32px by accident and reads fine in review. A string cannot be multiplied.
   `packages/tokens` changed accordingly; `GridColumns` stays numeric because a column count is a
   number, not a token name.

**Notes:**

- **A silent, total styling failure was found and fixed — worth reading in full.**
  `stylelint --fix`, run by our own pre-commit hook, rewrote `@import 'tailwindcss'` into
  `@import url('tailwindcss')` — `stylelint-config-standard` defaults `import-notation` to `url`.
  Tailwind's PostCSS plugin only processes the bare form; wrapped in `url()` it is an ordinary
  CSS import that Tailwind ignores. The build succeeded, the page rendered, `lint`, `typecheck`
  and `test` were all green, and the emitted stylesheet contained every token custom property and
  **not one utility class**. 3,083 bytes where there should have been 14,399. Nothing failed —
  the site was simply unstyled.
  - Fixed by pinning `import-notation: 'string'`, with the reason written at the rule.
  - `at-rule-no-unknown` now allows Tailwind's CSS-first at-rules, so `@theme` and `@source` do
    not push someone toward deleting the line instead of the rule.
  - `apps/web/app/globals.spec.ts` asserts the **outcome**, not the setting, because the next way
    this breaks will not be that setting.
  - This is the same shape as the three dead fitness functions at `PH-0.16`: a tool doing exactly
    what it was configured to do, producing something that looks right and does nothing.
- `@source '../../../packages/ui/src'` is required in `globals.css`: Tailwind's automatic source
  detection does not follow pnpm's node_modules symlink into `packages/ui`, so every primitive
  would render with classes present in the DOM and absent from the stylesheet.
- **No primitive API felt wrong enough to stop on.** The one decision worth flagging is
  `Heading`: `level` and `size` are separate props, so a small `h2` does not have to become an
  `h3`. Coupling them makes either the visual hierarchy or the screen-reader outline wrong, and it
  is always the outline that loses.
- Keyboard maps (`BR-1531`): none of the eight is interactive — they are containers and text. The
  keyboard contracts start at `PH-0.20` with `Button` and `IconButton`.

---

### 2026-07-29 · PH-0.16 — Fitness functions: boundaries, dependency-cruiser, custom lint rules

**By:** AI
**Time:** estimated 1.5 d -> actual 0.9 d
**Output:**

- `packages/config/eslint/fitness.js` — Prisma containment, vendor-SDK containment, restricted
  syntax (`BR-855`, `BR-1429`), `no-console`, hardcoded strings, module boundaries.
- `packages/config/eslint/rules/` — two custom rules: `no-hardcoded-strings` and
  `no-prisma-outside-repository`.
- `packages/config/stylelint/index.js` — raw colour, physical direction properties, `!important`,
  `transition: all`, off-scale units.
- `.dependency-cruiser.mjs` — cycles, layer direction, package independence, dev-deps in src.
- `scripts/check-catalogs.mjs` — prohibited copy terms (`BR-811`) and Arabic-source (`BR-524`).
- `scripts/verify-fitness.sh` + `pnpm verify:fitness` — the `BR-1725` proof, committed so it can
  be re-run rather than believed.
- Pinned: dependency-cruiser **18.1.0**, eslint-plugin-boundaries **7.1.0** (both match `13 §18.1`),
  eslint-import-resolver-typescript **4.4.5**.

**Verified — `BR-1725`, every one written, failed, and removed. 17 caught, 0 missed:**

| #   | Rule                        | Proof                                                         |
| --- | --------------------------- | ------------------------------------------------------------- |
| 1   | `BR-1220` raw hex           | `Disallowed value "#ff0000" for property "color"`             |
| 2   | `BR-1232` physical property | `Disallowed property "margin-left"`                           |
| 3   | `BR-1353` `!important`      | `Disallowed !important`                                       |
| 4   | `BR-1493` `transition: all` | `Disallowed value "all 200ms"`                                |
| 5   | `BR-1329` off-scale unit    | `Disallowed unit "px" for property "padding"`                 |
| 6   | `BR-523` hardcoded string   | `Hardcoded user-facing string "Welcome back to the academy"`  |
| 7   | `BR-523` in an attribute    | `Hardcoded user-facing string in \`aria-label\``              |
| 8   | `BR-1580` Prisma leak       | `Prisma is confined to shared/database`                       |
| 9   | `BR-1599` vendor SDK        | `'@sentry/node' import is restricted`                         |
| 10  | `BR-855` web storage        | `web storage is readable by any script on the page`           |
| 11  | `BR-1501` `console.log`     | `Unexpected console statement`                                |
| 12  | `BR-901` module boundary    | `this import crosses an element boundary that is not allowed` |
| 13  | Layer direction             | `shared-must-not-depend-on-modules`                           |
| 14  | No cycles                   | `no-circular`                                                 |
| 15  | `BR-1575` ui independence   | `ui-must-not-depend-on-apps`                                  |
| 16  | `BR-811` prohibited copy    | `contains prohibited Failure language: "failed"`              |
| 17  | `BR-524` Arabic source      | `en["orphan.key"] has no Arabic source`                       |

- `pnpm build` 5/5 · `pnpm lint` 8/8 · `pnpm typecheck` 7/7 · `pnpm test` 8/8 ·
  `lint:css` clean · `check:deps` no violations · `check:catalogs` 42 strings · `format:check` clean.

**Diverged:**

1. **A real layer inversion was found in `PH-0.6`'s code and fixed.** `shared/database` imported
   `modules/health` so its indicator could self-register — infrastructure reaching upward into a
   domain module. It compiled and worked. The `HealthIndicator` interface and a `HealthRegistry`
   now live in `shared/health/`, so the arrow points down: infrastructure registers into
   infrastructure and `modules/health` reads the registry. `/health` still returns
   `{"status":"ok","checks":{"database":"ok"}}` — verified after the change, not assumed.
2. **`BR-895`–`BR-899` are cited but were never authored (`SB-11`).** The layer-direction rule
   encodes the _description_ in `09 §enforcement`, not a quotation of a rule text that does not
   exist. Flagged rather than invented.
3. **`12 §19` lists 20 checks; 17 are active.** Not yet enforced: bundle size (`size-limit`),
   Core Web Vitals (Lighthouse CI) and contract conformance — all three need CI or a deployed app
   and belong to `PH-0.10`. `jsx-a11y` is `PH-0.17`, when there is JSX to lint. Listed here so the
   coverage is not overstated.

**Notes:**

- **Three fitness functions were silently dead when first written, and only the deliberate-violation
  pass found them.** Each is the same failure mode — configuration that loads without error and
  matches nothing:
  - `eslint-plugin-boundaries` v7 renamed `element-types` → `dependencies`, moved `rules` →
    `policies`, requires `{ element: { type } }` rather than bare `{ type }`, and uses `{{ }}`
    templates. Written in the v5 form it loads clean and matches nothing. Worse, it _still_
    matched nothing after that fix: it could not resolve our nodenext `.js` specifiers to `.ts`
    files, so every dependency was `isUnknown`. Only `boundaries/debug` revealed it.
  - Two `no-restricted-syntax` config objects: ESLint merges flat configs by **replacing** a
    rule's options, so the later block deleted the `BR-855` selectors for every `.tsx` file. All
    `no-restricted-syntax` selectors now live in one block, with a comment saying why.
  - `no-restricted-imports` globs cannot match a specifier starting with `..`, so the Prisma
    containment rule never saw `../../generated/prisma/client.js`. Replaced with a custom rule.
- **This is the argument for `BR-1725` in three concrete examples.** Every one of them looked
  correct in review, produced no configuration error, and enforced nothing.

---

### 2026-07-29 · PH-0.15 — Storybook with theme + direction toolbars, axe addon

**By:** AI
**Time:** estimated 1.0 d -> actual 0.4 d
**Output:**

- `.storybook/preview.ts` — `globalTypes` toolbars for **theme** and **locale**, a decorator that
  writes `data-theme`, `lang` and `dir` onto the document root, and `a11y: { test: 'error' }`.
- `components/ThemeHarness.tsx` — the harness the toolbars act on until `PH-0.17` builds the
  primitives. Token utilities only, no hex, no palette class.
- `vitest.config.ts` for `apps/web` with the React plugin — component specs could not parse
  without a JSX transform, and every component task from `PH-0.17` needs it.
- Scripts: `storybook`, `build:storybook`. Pinned: axe-core **4.12.1**, jsdom **30.0.0**,
  @vitejs/plugin-react **6.0.4**, @types/jsdom.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **Stories render in 4 combinations — the task Output.** 17 passing specs render the story as
  dark/ar, dark/en, light/ar, light/en and assert `data-theme`, `lang` and `dir` on the root plus
  the rendered content in each.
- **axe genuinely runs, and has teeth.** The real `axe-core` engine is injected into a JSDOM
  window per combination and run against the story root. Proven by deliberate violation: an
  unnamed `<button>` and an `<img>` with no `alt` produced `button-name` and `image-alt` failures
  across **all four** combinations; restored, and back to 17 passing.
- `storybook build` completes with the a11y addon loaded.
- `pnpm build` 5/5 · `pnpm lint` 8/8 · `pnpm typecheck` 7/7 · `pnpm test` 8/8.

**Diverged:** none.

**Notes:**

- **The direction toolbar selects a locale, not a direction.** Direction is a consequence of
  language (`directionOf`, `BR-1237`); offering them independently would let a story be signed off
  in Arabic-with-LTR, a combination the product can never produce.
- `data-theme` is set on `document.documentElement`, not on a wrapper. The stylesheet keys off
  `:root[data-theme]`, so a wrapper would silently do nothing and every story would render in the
  default theme while the toolbar appeared to work.
- **`color-contrast` is disabled in the axe run, deliberately and not as a dodge.** jsdom applies
  no stylesheet, so every element reports as black-on-transparent and the rule would produce
  meaningless results either way it went. Contrast is checked where it can actually be measured —
  `packages/tokens/src/color.spec.ts`, against the real hex values, with every ratio pinned.
- Two rules failed initially and were correctly ignored as page-level: `document-title` and
  landmark structure belong to the page a component sits on. The run is scoped to the story root,
  which is what the Storybook a11y addon checks.
- **`BR-1571` says a11y runs on every story in CI.** It runs on every story _here_, in
  `pnpm test`. Wiring the Storybook test-runner over the built static site is `PH-0.10`.

---

### 2026-07-29 · PH-0.14 — Tailwind 4 bound to tokens; no palette utilities available

**By:** AI
**Time:** estimated 0.5 d -> actual 0.3 d
**Output:**

- `packages/tokens` now emits a second generated file, `dist/tailwind.css` — the Tailwind 4
  `@theme` layer, produced from the same TypeScript as `tokens.css` so the utility surface and
  the custom properties cannot describe different systems.
- `apps/web/app/globals.css` imports tokens, then `tailwindcss`, then the theme layer. Order is
  load-bearing: import the theme layer first and Tailwind's defaults win.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **`text-gray-500` is not a valid class — the task Output — proven by deliberate violation.**
  A component using `text-gray-500 bg-blue-600 border-red-300 text-slate-900 p-5 rounded-2xl
text-9xl` was added, `next build` run, and the emitted stylesheet searched: **not one of the
  seven produced a rule.** File removed afterwards.
- Token-bound utilities do exist in the same build: `.bg-bg-base`, `.text-text-primary`,
  `.gap-4`, `.p-8`.
- 69 passing specs in `packages/tokens`, ten of them new and covering the generator.
- `pnpm build` 5/5 · `pnpm lint` 8/8 · `pnpm typecheck` 7/7 · `pnpm test` 8/8.

**Diverged:** none.

**Notes:**

- **`PH-0.14` makes the class not exist; it does not yet make it fail.** Writing `text-gray-500`
  today is silent — no error, and no styling either. The build-failing fitness function is
  `PH-0.16`, and `BR-1725` requires it to be proven by its own deliberate violation. Recorded so
  the distinction is not mistaken for the rule already being enforced.
- Colour uses `@theme inline`, scale uses `@theme`. `inline` emits `var(--accent)` into the
  utility so `bg-accent` follows a runtime theme switch; resolved eagerly, every utility would
  freeze to whichever theme compiled first and the `data-theme` toggle would move the custom
  properties while the utilities ignored them.
- Scale is emitted as literals for a second reason: Tailwind's font-size namespace is `--text-*`
  and `12 §4.2` names our type tokens `--text-*` as well. As literals the two declarations agree;
  as inline vars they would reference themselves.
- `--spacing: initial` also removes Tailwind's _dynamic_ spacing, so `p-5` does not exist.
  `12 §5`'s scale is deliberately gappy — 5 is not a step, so 20px must be unreachable.

---

### 2026-07-29 · SB-18 — accent contrast and the status surface/text split

**By:** AI, on founder decision of 2026-07-29
**Time:** not a task — a correction to `PH-0.12`'s output
**Output:**

- `--accent-contrast` replaces `--accent-foreground`. A **dark** foreground on the accent in
  **both** themes, resolved per theme to that theme's own darkest text colour. The accent hex is
  unchanged.
- Every status colour is now a pair: `--success` / `--success-text`, and the same for `warning`,
  `danger`, `info`. Surface tokens clear **3:1** against `bgBase`; text tokens clear **4.5:1**.

**Verified:** 59 passing specs. Computed, not guessed — hue held fixed, lightness moved only as
far as each threshold required:

| pair                     |            dark |                 light |
| ------------------------ | --------------: | --------------------: |
| accent + accent-contrast |      **10.124** |             **4.627** |
| success surface / text   | 11.357 / 11.357 | **3.183** / **4.618** |
| warning surface / text   | 11.855 / 11.855 | **3.087** / **4.614** |
| danger surface / text    |   7.154 / 7.154 |         4.664 / 4.664 |
| info surface / text      |   7.784 / 7.784 |         4.992 / 4.992 |

- **No pair required a hue change**, so nothing needed a design decision. Largest shift was
  0.1° (light warning, 40.6° → 40.5°).
- Only two published values moved: light `warning` `#CA8A04` → `#C18404` (2.837 → 3.087), and the
  new text tokens `#12843C` and `#9A6903`. `danger`, `info` and the `success` surface kept their
  `12 §3.2` values because they already cleared their thresholds.
- Surfaces were solved to 3.08 and text to 4.6 rather than exactly 3.0 and 4.5. The first passing
  step for light `warning` was **3.001**, a margin that any future rounding would erase. A test
  pinned to the edge is a test that will fail for the wrong reason.
- `#FFFFFF` on the light accent remains 3.83:1 — asserted, as the record of why white was
  abandoned instead of the gold being darkened towards brown.

**Diverged:** `--accent-foreground` no longer exists. `12 §3` lists it; it was the failing token
and keeping it available alongside the fix would leave the defect one autocomplete away. Recorded
here rather than edited into `12 §3`, which is founder territory.

---

### 2026-07-29 · PH-0.13 — `packages/i18n`: AR/EN catalogs, 6-form Arabic plurals, locale utils

**By:** AI
**Time:** estimated 1.0 d -> actual 0.4 d
**Output:**

- `src/catalogs/ar.ts` — Arabic, authored first, and the file that **defines the key space**.
  `export type MessageKey = keyof typeof ar` is how `BR-524`'s "a missing Arabic string is a
  build-time failure" is actually enforced: a key absent from Arabic is not a valid type, so no
  call site can reference it. There is no runtime check to forget.
- `src/catalogs/en.ts` — typed `Partial<Record<MessageKey, Message>>`. A missing English string
  is legal and falls back to Arabic; a key English invents does not compile. The asymmetry _is_
  the rule.
- `src/message.ts` — the six CLDR forms, with `other` required and the rest optional, because
  CLDR guarantees only `other`. `src/translate.ts` — named-variable interpolation and plural
  selection. `src/format.ts` — `Intl` number / percent / money / date. `src/locale.ts` —
  locale, direction, and the `latn` numbering pin.
- `apps/web/app/layout.tsx` now derives `lang` and `dir` from the package.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **Interpolation and plurals tested — the task Output. 48 passing specs.**
- **All six Arabic forms proven reachable, not merely declared**: 0 -> zero, 1 -> one, 2 -> two,
  3 and 10 -> few, 11 and 99 -> many, 100 -> other, each asserted against the rendered Arabic
  string. `Intl.PluralRules('ar').resolvedOptions().pluralCategories` returns all six;
  English returns exactly `one, other`.
- Interpolation: multiple occurrences, numeric values, and a **throw** on a missing variable
  rather than rendering `{name}` to a learner.
- `BR-1226` — Arabic output contains no Arabic-Indic digits for numbers, money, dates or
  percentages. `Intl` defaults `ar` to `٠-٩`, so every formatter pins `-u-nu-latn`.
- `BR-826` — `formatMoney` takes integer minor units and uses the **currency's own exponent**:
  EGP 12345 -> `123.45`, JOD 12345 -> `12.345`, JPY 12345 -> `12,345`. A non-integer amount
  throws instead of rounding quietly.
- **`<html lang="ar" dir="rtl">` in the built output**, derived from `directionOf()` rather than
  written by hand.
- `pnpm build` 5/5 · `pnpm lint` 8/8 · `pnpm typecheck` 7/7 · `pnpm test` 8/8.

**Diverged:** none.

**Notes:**

- **A real trap, found by a failing test rather than by review.** The English catalog originally
  carried a `zero` form for `selection.count`. CLDR English has no `zero` category —
  `Intl.PluralRules('en').select(0)` returns `other` — so that entry would have looked correct in
  the catalog and never rendered. Removed, and `catalog.spec.ts` now asserts that **no catalog
  declares a form its own locale can never select**, so it cannot come back quietly. A friendlier
  empty state is a UI concern for the component that renders it, not for the plural machinery.
- `catalog.spec.ts` also enforces: every category the locale _can_ select is supplied, `other` is
  always present, no entry is blank, no plural `other` hardcodes a digit instead of `{count}`,
  every English key has an Arabic source, and every key is namespaced.
- **`next-intl` is not needed** — `13 §18.2` suspected as much and it is now confirmed:
  `Intl.PluralRules` reaches all six Arabic categories natively, and `Intl.NumberFormat` /
  `Intl.DateTimeFormat` cover `BR-526`. That deferred pin can be struck rather than decided.
- Phase 0 seeds infrastructure strings only — the `11 §1.5` error envelope and form-validation
  messages the Wave-1 fields need. Domain copy arrives with the features that own it.
- `PH-0.19` left `BR-1113` (bilingual error objects) open pending this catalog. The Arabic and
  English error strings now exist; wiring the API filter to them needs `shared/i18n`, which is
  Phase 1.

---

### 2026-07-29 · PH-0.12 — `packages/tokens`: both themes to CSS vars + RN constants

**By:** AI
**Time:** estimated 1.0 d -> actual 0.4 d
**Output:**

- `packages/tokens/src/color.ts` — both palettes from `12 §3.1`/`§3.2`, written out in full
  because light is not an inversion of dark (`BR-541`). This is the one file where a raw hex is
  legitimate; everywhere else it fails the build (`BR-1220`).
- `src/scale.ts` — space, radius, duration, easing, type scale and font stacks from `12 §4.2`
  and `§5`. Stored as **numbers**, not CSS strings: `BR-1583` needs one source to serve two
  consumers and React Native has no `px`, so `'8px'` would need parsing back out.
- `src/css.ts` + `src/build-css.ts` — emit `dist/tokens.css` at build time.
- `apps/web/app/globals.css` imports `@josam/tokens/tokens.css` ahead of Tailwind.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **Token package consumed by web — the task Output.** `next build` emits a 7,025-byte
  stylesheet containing `--accent:#e8b04b`, `--bg-base:#0a0a0b`, `--space-4:16px`,
  `--radius-md:8px`, `--text-base:16px`, `--leading-base:26px`, `--font-display`,
  `--border-focus`, and both themes (`--accent:#e8b04b` and `--accent:#a97a18`).
- Durations survive minification as `.15s` / `.2s` / `.32s`, followed by the
  `prefers-reduced-motion` overrides at `0s` (`BR-1231`).
- **40 passing specs**, including a WCAG 2.1 contrast calculation over every documented pair.
- `pnpm build` 6/6 · `pnpm lint` 6/6 · `pnpm typecheck` 6/6 · `pnpm test` 6/6.

**Diverged:**

1. **`SB-18` — two values in `12 §3.2` do not meet `BR-1216`.** Measured, then verified a second
   time with an independent calculation:
   - `accentForeground` `#FFFFFF` on `accent` `#A97A18` = **3.83:1**, against the 4.5:1 AA body
     minimum. This is the **primary button in light mode**, so it is not a corner case.
   - `warning` `#CA8A04` on `bgBase` `#FBFBFA` = **2.84:1**, against the 3:1 UI minimum.
   - Dark mode passes both comfortably (10.12:1 and well over 3:1), so this is light-mode only.
   - **No replacement hex was invented.** `12 §3` is the design specification and correcting it
     is a founder decision (`BR-1765`). The two assertions are pinned to the measured ratios in
     `color.spec.ts` rather than skipped, so the day the palette is corrected the suite fails and
     forces this record closed. A skipped test would go quiet and the shortfall would resurface
     in an accessibility audit after 69 components had been built on the palette.

**Notes:**

- Dark is the default on `:root`; `[data-theme]` overrides in **both** directions and the
  `prefers-color-scheme` block only applies to `:root:not([data-theme])`. That precedence is
  asserted in a test — get it backwards and a theme toggle silently does nothing on a machine
  set to light.
- `packages/tokens` needs `types: ["node"]` because `build-css.ts` writes a file. It is not
  exported from `index.ts`, so a React Native consumer never pulls a `node:` import through the
  public entry point.
- The Tailwind binding — `text-gray-500` ceasing to exist — is `PH-0.14`, not here. Today the
  tokens are available to web as custom properties and nothing yet prevents a palette utility.

---

### 2026-07-29 · PH-0.19 — Structured logging (Pino) with correlation IDs; Sentry wiring

**By:** AI
**Time:** estimated 0.5 d -> actual 0.4 d
**Output:**

- `shared/common/correlation/` — `AsyncLocalStorage` context + middleware. Honours an inbound
  `X-Correlation-Id` (`11 §1.2`), otherwise mints a prefixed ULID `req_01H...` matching `11 §1.5`.
  Always echoed back on the response.
- `shared/common/logging/` — `AppLogger` (Pino behind our own class, implements Nest's
  `LoggerService`) and `redact.ts`, the `BR-626` redaction paths.
- `shared/common/filters/all-exceptions.filter.ts` — the `11 §1.5` error envelope with
  `correlation_id`, generic 5xx text, and Sentry capture for 5xx only.
- `shared/providers/error-tracker/` — our `ErrorTracker` interface and the Sentry adapter.
- `tsconfig.build.json` — emit config; specs are linted but never compiled into `dist/`.
- Pinned: pino **10.3.1** (matches `13 §18.1`), ulid **3.0.2** (first use, `13 §18.2`),
  @sentry/node **10.68.0** (new pin), @types/express **5.0.6**.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **Request traced end to end — the task Output.** Generated id `req_01KYNFWK6J3YKC29AH0T3Y25BB`
  came back in the response header and appears on the matching server line
  `"route":"/health","status":200,"durationMs":49.4`. An inbound `end-to-end-404` produced
  `{"error":{"code":"NOT_FOUND",...,"correlation_id":"end-to-end-404"}}` to the client and
  `"level":"warn",...,"status":404` on the server. Same id, both directions.
- **`BR-631`/`BR-1114` proven by trying to leak.** A deliberate throwing route raised
  `probe: deliberate unhandled error with secret=hunter2`. The client received exactly
  `{"code":"INTERNAL_ERROR","message":"Something went wrong on our side."}` plus the correlation
  id — grepped for `hunter2` and `probe:`, neither present. The full stack was in the server log.
  Route removed afterwards.
- **`BR-626` proven by test, not by reading the config** — 13 passing specs covering redaction of
  password / token / accessToken / otp / cardNumber / cvv / phone at the root and one level deep,
  that `passwordChangedAt` survives, correlation-id binding, out-of-band marking, ULID format,
  and isolation between two concurrent requests.
- **`BR-1599` verified by inspection:** the only files naming `@sentry/node` are under
  `shared/providers/error-tracker/`. Pino appears in exactly one file, `logger.service.ts`.
- Nest's own framework output now goes through Pino as JSON — `InstanceLoader`, `RoutesResolver`,
  `PrismaService`, `NestApplication` all emit structured lines, so there is no second
  unstructured format during boot.
- `pnpm build` 5/5 · `pnpm lint` 6/6 · `pnpm typecheck` 5/5 · `pnpm test` 6/6.

**Diverged:**

1. **`BR-1113` not implemented — error `message` is a single string, not a bilingual `{ar, en}`
   object.** The rule requires localisation server-side from the string catalog; `packages/i18n`
   is `PH-0.13` and `shared/i18n` is Phase 1. Hand-writing an `{ar, en}` pair here would invent
   translations outside the catalog, which is the thing `BR-525` exists to prevent. The envelope
   shape is otherwise `11 §1.5` exactly, so this is a one-field change when the catalog exists.
2. **`@sentry/node` 10.68.0 is a new pin** — Sentry is named in `08 §12` and `13 §8` but has no
   row in `13 §18.1`. Recorded here rather than added to the table, which is founder territory.

**Notes:**

- **Two defects found by reading the output rather than trusting the design:**
  - The first implementation logged request lines from a Nest interceptor. On the error path the
    interceptor runs _before_ the exception filter sets the status, so a 500 was logged as
    `"status":200` — an error-rate query would have been silently wrong. And an unmatched route
    never reaches an interceptor at all, so every 404 went unlogged.
  - Both are gone: request logging moved to `res.on('finish')` in the middleware, which fires for
    every response including unmatched routes and reads the status actually sent. Verified
    500/`error`, 404/`warn`, 200/`info`. This **removed** the interceptor rather than adding to it.
- **Redaction covers structured fields, not free text.** Pino redacts by path, so a `password`
  field is censored but a secret interpolated into an exception _message_ is not — as the probe
  above showed, `secret=hunter2` reached the server log inside the message string. It never
  reaches the client, but `BR-626` is only fully honoured if nobody writes a secret into an error
  message. A `PH-0.16` lint rule could catch the obvious cases; noted, not built.
- `SENTRY_DSN` is optional and unset. The tracker reports `errorTracking: "disabled (no
SENTRY_DSN)"` at boot. No credential was requested, stored or echoed.

---

### 2026-07-29 · PH-0.6 — Prisma init, connection, first empty migration

**By:** AI
**Time:** estimated 0.5 d → actual 0.45 d
**Output:**

- `apps/api/prisma/schema.prisma` — **no models, no enums, no tables.** The entity design is
  `10 §2` onward and belongs to Phase 1. The header records the `10 §1` conventions the schema
  will follow when Phase 1 adds to it (prefixed ULIDs as TEXT, `TIMESTAMPTZ` UTC, money as minor
  units, bilingual `JSONB`).
- `prisma.config.ts` (Prisma 7's config file), `prisma/migrations/20260728221812_init/` —
  a genuinely empty migration, 30 bytes: `-- This is an empty migration.`
- `src/shared/database/` — `PrismaService`, `DatabaseModule`, `DatabaseHealthIndicator`.
- `src/probes/prisma.probe.ts` — a permanent guard, like the DI probe, run on the compiled
  artifact.
- Scripts: `db:migrate` (`prisma migrate deploy`), `db:migrate:dev`, `db:generate`,
  `probe:prisma`. `build` is now `prisma generate && tsc`.
- Pinned exactly: prisma / @prisma/client / @prisma/adapter-pg **7.9.1**, pg **8.22.0**,
  dotenv **17.2.4**.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **`pnpm db:migrate` succeeds — the task Output** — and was proven against a _genuinely empty_
  database, not just a no-op: dropped `_prisma_migrations`, confirmed `public` held `(none)`,
  then `db:migrate` → `The following migration(s) have been applied: 20260728221812_init` ·
  `All migrations have been successfully applied.` `_prisma_migrations` then showed
  `20260728221812_init|t`, and domain tables were still **`(none)`**.
- **Prisma 7 generates against an empty schema.** This was the founder's explicit question:
  `prisma generate` → `Generated Prisma Client (7.9.1) to .\src\generated\prisma in 44ms`.
  **No table had to be invented.**
- **`BR-1816` probe passed on all three parts**, executed on the compiled output:
  `module system at runtime = CommonJS` · `SELECT 1 = 1` ·
  `server = PostgreSQL 16.14` · `PRISMA PROBE PASSED`.
- **`BR-1580` verified by inspection, not assumed.** Every file importing Prisma or the generated
  client: `src/shared/database/prisma.service.ts` and `src/probes/prisma.probe.ts` — nothing
  else. No controller and no domain service imports Prisma, and nothing above
  `shared/database` names a `PrismaClient` or `Prisma.*` type.
- **`/health` now reports a real dependency**: `{"status":"ok","checks":{"database":"ok"},...}`,
  `http 200`, with `[PrismaService] database connected` in the boot log. The check is a live
  `SELECT 1` round trip, not a cached `$connect()` result.
- `pnpm build` → 5/5 · `pnpm lint` → 6/6 · `pnpm typecheck` → 5/5 · `pnpm test` → 6/6 ·
  `format:check` clean · `probe:di` still passes.

**Diverged:**

1. **Prisma 7 requires a driver adapter.** It removed the built-in connection path, so
   `new PrismaClient()` no longer accepts a URL — it takes `@prisma/adapter-pg` over the `pg`
   driver. This is the substantive Prisma 7 change and it added two dependencies. **It does not
   touch `BR-1580`**: the adapter is constructed inside `PrismaService` and is invisible above
   `shared/database`, which is exactly what the boundary is for. Prisma 7 therefore **stands** —
   no fallback to Prisma 6. `SB-09` closes.
2. **`prisma migrate dev` will not create a migration when the schema has no changes** — it
   reports `Already in sync`. The empty migration was created with `--create-only`, which is the
   documented way to get one, and then applied through `migrate deploy`. Recorded so the next
   person does not conclude the pipeline is broken.
3. **The generated client lives in `src/generated/prisma`** (Prisma 7 no longer writes to
   `node_modules/.prisma`), so it is inside the linted and compiled tree. It is gitignored as
   build output, excluded from ESLint, and `build` runs `prisma generate` first so a clean
   checkout compiles.
4. **`prisma init` also wrote `.claude/`, `.agents/`, `.windsurf/` skill directories and
   `skills-lock.json` into `apps/api`.** Removed — Prisma does not get to install agent tooling
   into this repository as a side effect of scaffolding a schema.
5. **ESLint's `allowDefaultProject` is now an opt-in parameter** on the shared config.
   `prisma.config.ts` sits at the package root and cannot join `apps/api`'s tsconfig `include`
   without breaking `rootDir: src`. A blanket glob was the obvious fix and is wrong: `apps/web`
   already includes `next.config.ts`, and naming a file that IS in the project is itself an error.
   So each workspace declares its own. Proven load-bearing — removing the argument reproduces
   the parse error, restoring it returns lint to 6/6.

**Notes:**

- The database is reachable only on `127.0.0.1:55432` (`PH-0.5`); `DATABASE_URL` in the
  gitignored `.env` points there. `.env.example` carries the documented-port version.
- `PrismaService` throws by name, never by value, when `DATABASE_URL` is missing (`BR-943`).
- Still **not** met, and not claimed: the Phase 0 exit criterion that `/health` reports database,
  Redis, queue, storage and last backup. `database` is real now; Redis has no client until its
  first consumer, queue is Phase 1, `last_backup` is `PH-0.28`.

---

### 2026-07-29 · PH-0.5 — Docker Compose: Postgres 16 + pgvector, Redis 7, MailHog

**By:** AI
**Time:** estimated 0.5 d → actual 0.2 d
**Output:**

- `docker-compose.yml` — three services, pinned exactly: `pgvector/pgvector:0.8.5-pg16`,
  `redis:7.4.10-alpine` (`--appendonly yes`), `mailhog/mailhog:v1.0.1`. Named volumes for
  Postgres and Redis; healthchecks on both.
- `.env.example` documenting the full environment shape, and `.env` (gitignored) for local values.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- `docker compose up -d` → all three started; `postgres healthy`, `redis healthy`.
- **Postgres**: `PostgreSQL 16.14` — major 16 as `BR-1807` requires.
- **pgvector actually works, not merely installed**: `create extension vector` →
  `CREATE EXTENSION`, `extversion` → `0.8.5`, and a real operation —
  `'[1,2,3]'::vector <-> '[1,2,4]'::vector` → `1`.
- **Redis**: `Redis server v=7.4.10`, `PING` → `PONG`, `SET`/`GET` round-trip → `ok`.
- **MailHog** web UI → `http 200`.
- **Nothing is exposed beyond localhost — proven, not asserted.** All four published ports
  listen on `127.0.0.1` and nothing else. From the host's own LAN address `172.20.128.1`,
  every port was **unreachable** (`reachable=False` × 4); on `127.0.0.1` every port was
  **reachable** (`reachable=True` × 4).

**Diverged:**

1. **Local host ports are overridden; the committed defaults are unchanged.** `13 §12`'s ports
   are all occupied on this machine — 5432 by a **native PostgreSQL 18 install**
   (`C:\Program Files\PostgreSQL\18\bin\postgres.exe`), 6379 and 8025 by other Docker
   containers. `docker-compose.yml` still defaults to 5432 / 6379 / 8025 per `13 §12`; the
   local gitignored `.env` maps them to 55432 / 56379 / 51025 / 58025. So the repository
   matches the document and this machine still runs. The founder's own Postgres was not touched.
2. **`ioredis` was not installed**, though `13 §18.1` lists it as pinned at `PH-0.5`. Nothing
   connects to Redis yet — the first consumer is BullMQ in Phase 1, and `PH-0.19` for logging.
   An unused dependency in a manifest is exactly what `PH-0.16`'s dependency-cruiser pass exists
   to catch. Pinned at first use instead; the version in `§18.1` stands as the starting point.

**Notes:**

- **Why `127.0.0.1:` is written explicitly on every port.** Docker publishes to `0.0.0.0` by
  default and, on Linux, inserts its own iptables rules **ahead of** ufw's. A plain
  `5432:5432` on the VPS would expose the database to the internet while `ufw status` still
  reported the port closed. Writing the interface here means the local shape matches the server
  shape and the habit is never formed — this is the same rule `PH-0.7` will enforce.
- `POSTGRES_INITDB_ARGS` sets `--locale=C` so an index built locally sorts the same way as one
  built on the server.
- MailHog reports no health status because the image carries no shell utilities to probe with;
  the HTTP 200 above is the check. `mailhog/mailhog` is archived upstream — worth revisiting at
  `PH-0.28` when mail delivery becomes real, but `13 §12` names it and it works.

---

### 2026-07-29 · PH-0.4 — Scaffold `apps/web` (Next.js 16, App Router, route groups)

**By:** AI
**Time:** estimated 0.5 d → actual 0.35 d
**Output:**

- `apps/web` is a Next 16 App Router application with the four route groups of `09 §7.1`:
  `(public)` → `/` and `/catalog`, `(auth)` → `/login`, `(learner)` → `/dashboard`,
  `(admin)` → `/admin`, plus `app/api/` reserved as the BFF proxy (`BR-922`).
- `next.config.ts` (`typedRoutes`, strict mode), `postcss.config.mjs`, `app/globals.css`,
  `.storybook/` and one probe story.
- Pins, all re-verified live and all equal to registry latest: next **16.2.12** ·
  react / react-dom **19.2.8** · @types/react **19.2.17** · tailwindcss **4.3.3** ·
  storybook **10.5.5** (+ `@storybook/nextjs-vite`, `@storybook/addon-a11y`).

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **All four parts of the `BR-1809` probe passed. Next 16 is adopted; no hold at 15.x.**
  1. **Route groups render** — server started, all five paths returned `200` with the correct
     `data-route-group` marker: `/` public · `/admin` admin · `/catalog` public ·
     `/dashboard` learner · `/login` auth. This is the task Output.
  2. **ISR works** — the `next build` route table classifies `/catalog` as `Revalidate 1m`,
     `Expire 1y`. Proven by the build's own classification, not by the presence of the export.
  3. **Tailwind 4 binds** — emitted CSS (4,295 bytes) contains `.grid`, `.gap-4`, `.p-8`, carries
     the v4 `@layer theme/base/components/utilities` signature, and does **not** contain `.p-99`
     — so it is really scanning source, not dumping a stylesheet.
  4. **Storybook 10 + the a11y addon run against Next 16** — `storybook build` →
     `Storybook build completed successfully`, and `axe-CL1FvwTe.js` (579 kB) is in the output,
     which is the engine `BR-1571` depends on.
- `pnpm build` → 5/5 · `pnpm lint` → 6/6 · `pnpm typecheck` → 5/5 · `pnpm test` → 6/6.

**Diverged:**

1. **`13 §4` corrected 15 → 16**, and "Required by Next 15" → "Next 16"; `§18.1` now reads
   "16.2.12 — probe passed"; the `PH-0.4` row corrected in `16` and in `CLAUDE.md`. This is the
   document correction `BR-1809` requires on adoption, executed under founder pre-authorisation.
2. **Two lint defects found and fixed properly, not disabled.** ESLint linted Turbopack's own
   generated chunks in `.next/` (`require()` imports, unused `exports`) — `.next/**` and
   `storybook-static/**` went into the **shared** ignore list, since a build artifact is not one
   workspace's private problem. And `.storybook/*.ts` sat outside the tsconfig project, so
   type-aware parsing failed on it — added to `include` rather than excluded from linting.
3. **`CatalogPage` was `async` with no `await`** (`require-await`). Made synchronous. Worth
   recording because the reflex would have been to disable the rule; the function simply did not
   need to be async.
4. **`pnpm-workspace.yaml` gains an `allowBuilds` block** — `sharp` (Next's image optimiser) and
   `esbuild` (under Vite and Storybook). pnpm blocks install scripts by default, which is the
   right default; each entry is an explicit decision to let a package run code on this machine
   and in CI. `sharp` is an **optional** dependency of Next 16 and is not currently linked —
   `next build` succeeds without it, so this is recorded rather than chased.

**Notes:**

- **Tailwind and Storybook are installed and proven, but `PH-0.14` and `PH-0.15` are NOT done.**
  The probe `BR-1809` mandates could not be run without them. What exists is a working baseline:
  Tailwind emits utilities but is **not yet bound to tokens** (`PH-0.14`, whose Output is that
  `text-gray-500` stops being a valid class), and Storybook builds one throwaway probe story with
  **no theme or direction toolbars** (`PH-0.15`, whose Output is stories rendering in four
  combinations). `.storybook/` and `components/Probe.stories.tsx` are probe artifacts to be
  replaced there. Recorded so a later session does not mistake a passing probe for a done task.
- `app/layout.tsx` hardcodes `lang="en" dir="ltr"` because `packages/i18n` does not exist until
  `PH-0.13`. That element is where locale and direction land (`BR-1232`).
- Page copy is route markers, not user-facing strings — real copy comes through `packages/i18n`
  (`BR-525`), and the fitness function that fails the build on a hardcoded string is `PH-0.16`.

---

### 2026-07-29 · PH-0.3 — Scaffold `apps/api` (NestJS) with health endpoint

**By:** AI
**Time:** estimated 0.5 d → actual 0.4 d
**Output:**

- `apps/api` is a running NestJS 11 application: `main.ts`, `app.module.ts`, and
  `modules/health/` (module + controller + service). The placeholder `src/index.ts` is gone.
- `config/env.ts` — Zod startup validation (`BR-943`, `BR-1678`). `NODE_ENV` and `PORT` only;
  `DATABASE_URL` and `REDIS_URL` are added by `PH-0.6`/`PH-0.5`, because declaring a variable
  before its service exists would make the API refuse to boot for a dependency nothing uses.
- `src/probes/di.probe.ts` + `pnpm --filter @josam/api run probe:di` — a permanent guard,
  compiled by `tsc` and executed by node, for the DI-erasure trap.
- Pinned exactly, re-verified live (`BR-1811`), both equal to registry latest:
  NestJS **11.1.28** (`common`, `core`, `platform-express`) · Zod **4.4.3**.
  Plus `reflect-metadata` 0.2.2, `rxjs` 7.8.2.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **`GET /health` → `HTTP/1.1 200 OK`**, body `{"status":"ok","checks":{},"version":"0.0.0"}`;
  `curl -o /dev/null -w "%{http_code}"` → `200`. Nest logged `Mapped {/health, GET} route`.
  This is the task Output.
- **DI probe passes on the compiled artifact**, run before the endpoint was written as required:
  `design:paramtypes[0] = DependencyService` · `consumer.describe() = dependency-resolved` ·
  `DI PROBE PASSED`. `nodenext` + NestJS 11 did **not** fight; no cast and no disable was needed.
- **The probe was then proven to actually catch the trap**, because a guard that cannot fail is
  not a guard. Splitting the dependency into its own file and importing it with `import type`
  changed the emit to `__metadata("design:paramtypes", [Function])` and produced exactly the
  predicted failure: `Nest can't resolve dependencies of the ConsumerService (?). Please make
sure that the argument Function at index [0] is available in the ProbeModule module.`
  Reverted afterwards; the probe passes again.
- **`BR-943` fail-fast proven twice:** `PORT=not-a-number` →
  `Invalid environment configuration: PORT: Invalid input: expected number, received NaN`,
  exit 1. `NODE_ENV=staging` → `expected one of "development"|"test"|"production"`. Neither
  reached `NestFactory.create`.
- `pnpm build` → 5/5 · `pnpm lint` → 6/6 · `pnpm typecheck` → 5/5 · `pnpm test` → 6/6.

**Diverged:**

1. **`/health` returns `checks: {}`, not the five checks in `11 §API`** (`database`, `redis`,
   `queue`, `storage`, `last_backup`). None of those services exist yet — Postgres and Redis
   arrive at `PH-0.5`, the queue in Phase 1, `last_backup` at `PH-0.28`. Reporting
   `"database": "ok"` before there is a database would make the endpoint lie exactly where it is
   trusted most: it is what pages the founder (`BR-892`). `HealthService` takes a registry of
   indicators so each owning module contributes its own check when it lands; the Phase 0 exit
   criterion "health endpoint reports database, Redis, queue, storage, last backup" is **not**
   met yet and is not claimed to be.

**Notes:**

- **Two findings worth keeping, both discovered by testing rather than assumed:**
  - Nest's default `abortOnError: true` **terminates the process itself** on a DI failure. With
    `logger: false` that is a silent `exit 1` with no diagnostic whatsoever — which is what the
    probe did on its first failing run. Both `main.ts` and the probe now pass
    `abortOnError: false` so the error is catchable and names the missing token.
  - **Vitest 4 preserves `emitDecoratorMetadata`** — the opposite of what was expected of an
    esbuild-based transform. Confirmed properly: a spec asserting `design:paramtypes` on
    `HealthController` passed **with `dist/` deleted**, so it transformed the TypeScript source
    rather than silently resolving to compiled output. Nest unit tests are therefore viable at
    `PH-0.19` and in Phase 1. The DI probe still stays on the `tsc` path — it exists to guard the
    artifact we actually ship, and a second transform agreeing is not evidence about the first.
- `apps/api` remains CommonJS (no `type` field) — correct for NestJS 11, and the reason the probe
  and `main.ts` use `.catch()` rather than top-level `await`, which `TS1309` rejects here.
- The 17 domain modules of `08 §4.1` are Phase 1+. `app.module.ts` imports `HealthModule` only.

---

### 2026-07-28 · PH-0.2 — Shared config package: ESLint flat config, Stylelint, Prettier

**By:** AI
**Time:** estimated 0.5 d → actual 0.25 d
**Output:**

- `packages/config` now ships tooling as well as tsconfig presets, exported via its `exports` map:
  `eslint/base.js`, `eslint/node.js`, `stylelint/index.js`, `prettier/index.js`.
- ESLint 10 flat config, **type-aware** (`projectService`), `recommendedTypeChecked` +
  `stylisticTypeChecked` + `eslint-config-prettier` last.
- `eslint.config.mjs` in all six workspaces and at the root; `lint` and `test` scripts in each.
- Root: `prettier.config.mjs`, `stylelint.config.mjs`, `lint-staged.config.mjs`,
  `.prettierignore`, `.husky/pre-commit` → `pnpm exec lint-staged`.
- `turbo.json` gains `lint` and `test`. Root gains `lint`, `lint:css`, `test`, `format`,
  `format:check`, `prepare`.
- Pinned exactly, all seven re-verified live and all seven equal to the registry's current latest:
  eslint **10.8.0** · typescript-eslint **8.65.0** · stylelint **17.14.1** · prettier **3.9.6** ·
  husky **9.1.7** · lint-staged **17.2.0** · vitest **4.1.10**.

**Verified:** (real executed output, `BR-1518`, `BR-1768`)

- **`pnpm lint` → `Tasks: 6 successful, 6 total`** — the task Output: it runs in every workspace.
- `pnpm typecheck` → 5/5 · `pnpm test` → 6/6 · `pnpm build` → 5/5. (5 not 6 because
  `packages/config` is JSON+JS and has neither a build nor a typecheck task.)
- **Enforcement proven by deliberate violation, then removed** — green lint means nothing until
  it is shown to fail:
  - `any` → `error @typescript-eslint/no-explicit-any` (`BR-1579`)
  - `@ts-ignore` → `error @typescript-eslint/ban-ts-comment` (`BR-1579`)
  - unawaited promise → `error @typescript-eslint/no-floating-promises`. This one matters most:
    it is a **type-aware** rule, so its firing proves `projectService` is genuinely wired and
    that the mechanism `BR-1579` depends on is live, not merely configured.
  - a stale `eslint-disable-next-line` → `error Unused eslint-disable directive`
    (`reportUnusedDisableDirectives`, the companion to `BR-1512`). All exits were 1.
- **Vitest proven to execute**, not just to be installed: a temporary spec with one passing and
  one failing assertion → `Tests 1 failed | 1 passed (2)`, exit 1. Removed afterwards.
- **Stylelint proven both ways**: a bad property → `Unknown property "colr"`, exit 2; with no CSS
  in the repository → exit 0 under `--allow-empty-input`.
- **The `apps/api` DI guard is real, not decorative:** `eslint --print-config src/index.ts`
  reports `consistent-type-imports = [0]` and `no-explicit-any = [2]`.
- `pnpm format:check` → `All matched files use Prettier code style!`
- **The pre-commit hook rejected the first attempt to commit this task, and it was right.**
  `eslint` failed on 14 files with
  `Parsing error: No tsconfigRootDir was set, and multiple candidate TSConfigRootDirs are present`.
  `pnpm lint` cannot surface this: turbo runs `eslint .` **inside** each workspace, so exactly one
  candidate root exists. lint-staged runs eslint **once from the repository root** with absolute
  paths spanning every workspace. typescript-eslint resolves `tsconfigRootDir` before it checks
  whether type-aware parsing is enabled, so even a plain `.mjs` config file failed.
  Fixed by setting `tsconfigRootDir` for every file rather than only the type-checked ones.
  Verified afterwards on **both** invocation paths — root-invoked mixed `.mjs`/`.js`/`.ts` across
  workspaces → exit 0, and `pnpm lint` → 6/6 — and the enforcement proof was **re-run** after the
  parser change, because that edit is exactly how type-aware linting dies silently:
  `no-explicit-any` and `no-floating-promises` still fire, from root and per-workspace alike.

**Diverged:**

1. **`13 §9` cites `§19` for custom rules; `13` has no `§19`** (it ends at `§18`). Dangling
   reference — logged as `SB-14`. Custom rules are `PH-0.16` with its own Refs, so nothing is
   lost and nothing is blocked.
2. **`boundaries` and `jsx-a11y` from `13 §9` are not installed here.** `16` assigns fitness
   functions to `PH-0.16` and `jsx-a11y` has no JSX to lint until `PH-0.17`. Deferred, not dropped.
3. **`prettier-plugin-tailwindcss` deferred to `PH-0.14`** though `13 §9` lists Tailwind class
   sorting under Prettier. The plugin resolves `tailwindcss` at load time and Tailwind is not
   installed until `PH-0.14`; adding it now would break Prettier for every workspace.
4. **`docs/*.md` and `prototype/` added to `.prettierignore`.** Without this, `pnpm format` and
   every pre-commit would silently reformat the 16 frozen specification documents — a direct
   collision with the `/docs` freeze in `CLAUDE.md §1`. `docs/runbooks/` is deliberately **not**
   excluded, since it is operational and this protocol authors it.

**Notes:**

- Prettier reformatted `CLAUDE.md`, `STATUS.md` and `pnpm-workspace.yaml` on its first run
  (table pipe alignment only). Verified the `PH-0.1`/`PH-0.2` queue rows survived intact.
- Rule strength is `recommendedTypeChecked`, not `strictTypeChecked`. The stricter preset adds
  rules that fire heavily on NestJS and Prisma code, and `BR-1512` forbids the usual escape
  hatches — so raising it is a decision for `PH-0.16` with real code to measure against, not a
  guess made before `apps/api` exists.
- `test` scripts use `--passWithNoTests`. There are genuinely zero tests in the repository; the
  flag is why `pnpm test` exits 0, and the probe above is why we know the runner works.

---

### 2026-07-28 · PH-0.1 — Initialize monorepo: pnpm workspaces, Turborepo, base `tsconfig`

**By:** AI
**Time:** estimated 0.5 d → actual 0.25 d
**Output:**

- Root: `package.json` (`packageManager` pnpm@11.17.0, `engines.node ">=24.18.0 <25.0.0"`),
  `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc` (`24`), `.npmrc` (`save-exact`, `engine-strict`),
  `.gitignore` (contains `.turbo/`), `.gitattributes`, `pnpm-lock.yaml`.
- **Six** workspaces: `apps/api`, `apps/web`, `packages/config`, `packages/tokens`,
  `packages/i18n`, `packages/ui`. Each a compiling stub with `build` + `typecheck`.
- `packages/config/tsconfig/` — three presets: `base.json`, `node.json`, `library.json`.
- Local git repository initialized (`git init -b main`), first commit landed.

**Verified:** (real terminal output, `BR-1518`)

- `node -v` → `v24.18.0`; `pnpm -v` → `11.17.0` — checked **before** writing `engines`.
- Registry re-verification per `BR-1811`: `turbo` latest = **2.10.7** (pin matches exactly);
  `typescript@6.0.3` exists (latest is 7.0.2 — deliberately not taken, `BR-1805`);
  `@types/node` highest 24.x = **24.13.3**, pinned exact.
- `pnpm install` → `Done in 8.9s using pnpm v11.17.0`, 7 workspace projects in scope.
- `pnpm build` → `Tasks: 5 successful, 5 total`. Re-run → `5 cached, 5 total` / `FULL TURBO` (51ms).
- `pnpm typecheck` → `Tasks: 5 successful, 5 total`.
- `tsc --showConfig` in `apps/api` confirms the NestJS-critical flags resolve:
  `verbatimModuleSyntax: false`, `experimentalDecorators: true`, `emitDecoratorMetadata: true`,
  `types: ["node"]`, `outDir: "./dist"`, `moduleResolution: "nodenext"`.
- `${configDir}` verified: `rootDir`/`outDir` resolve against the **consuming** package, not
  against `packages/config/tsconfig/`. Without it a shared-preset `outDir` silently emits into
  the config package.
- Emitted module format checked by reading the output: `apps/api/dist/index.js` is CommonJS
  (correct for NestJS 11), `packages/ui/dist/index.js` is ESM.
- **`BR-1806` proven, not assumed:** a throwaway project with `moduleResolution: "node"` compiled
  under TS 6.0.3 → `error TS5107: Option 'moduleResolution=node10' is deprecated and will stop
functioning in TypeScript 7.0`, exit 2.
- **`pnpm lint` and `pnpm test` do not exist and were not faked.** Real output:
  `[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL] Command "lint" not found`. ESLint, Stylelint and Prettier
  arrive at `PH-0.2`; Vitest at `PH-0.2`. `turbo.json` declares only `build`, `typecheck`, `dev`.

**Diverged:**

1. **`packages/ui` created though `09 §9`'s tree omits it** — `12 §20` mandates it (`BR-1524`,
   `BR-1575`). Recorded as `SB-13`; `09 §9` needs a correction pass.
2. **`.gitattributes` added beyond the approved file list** — see §7. Founder may veto.
3. `BR-1818` rewritten on founder instruction — see §7.

**Notes:**

- `packages/contracts` and `packages/abilities` were **not** created. They are Phase 1 work
  (`PH-1.8` / `PH-1.9`); an empty package in the turbo graph for five weeks earns nothing.
- The `verbatimModuleSyntax: false` override lives in the **shared** `node.json`, not in
  `apps/api`, so it cannot be lost to a copy-paste. The reason is written in the file itself.
  `PH-0.3` must run the two-service DI probe before the health endpoint.
- `docs/runbooks/vps-hardening.md` was re-checked at the end of this task and is **still absent**
  from the tree — `SB-05` stands.

---

### 2026-07-28 · Planning complete

**By:** Founder + AI
**Output:** 23 documents — `00` through `16` plus this file and the HTML prototype
**Contents:** 220 features · 1,798 business rules · 60 decisions · 174 permissions · 85 tables · 248 endpoints · 134 components · 72 screens · 30 flows · 191 tasks
**Verified:** every feature maps to a goal; every module has a dependency tier; no orphan features
**Diverged:** none — this is the baseline
**Notes:** All documents are `Draft — Pending Approval`. Recommend one full read-through before `PH-0.1`. Execution begins at `PH-0.7` (VPS hardening) — deliberately before any code touches the server.

---

## 5. Blockers

> Anything stopping work right now. Empty is good.

| ID          | Blocker                                                                                                                                                                                                                                                                                                  | Blocks                                   | Since      | Owner                             | Action needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SB-22`     | **Port 8000 — the Coolify dashboard is reachable from the internet.** Password-protected, not open, but a public admin panel on a box holding live client projects is not acceptable long term. `ufw` never filtered it: Docker publishes it, and Docker's rules bypass the `INPUT` chain (`PH-0.7 §5`). | `PH-0.8`                                 | 2026-07-29 | AI to propose, founder to approve | **Approach decided 2026-07-29: Cloudflare Tunnel, not an allow-list.** `cloudflared` on the host dials **out**, so nothing inbound is needed and port 8000 closes at the provider firewall entirely. The dashboard is reached through a Cloudflare hostname behind Cloudflare Access, founder email as the only identity — two gates before the Coolify login is visible. **Binding constraint:** this tunnel becomes the access path to the founder's CLIENTS' control panel, so it is added alongside existing access and proven working **before** port 8000 closes, never the reverse. The provider web console stays the documented fallback and `PH-0.8` must state how to restore direct port 8000 access from it. Cloudflare account and R2 to be set up before `PH-0.8` starts. |
| `SB-05`     | ~~`docs/runbooks/vps-hardening.md` missing.~~ **Closed by founder decision 2026-07-29: stop waiting for it — `PH-0.7` is authored from `14 §12` directly.**                                                                                                                                              | Nothing                                  | 2026-07-28 | —                                 | None.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `SB-07`     | ~~**Next.js major.**~~ **Resolved by founder pre-authorisation 2026-07-29: adopt Next 16, correct `13 §4` and the `PH-0.4` row, gated on the four-part probe (route groups · ISR · Tailwind 4 · Storybook 10 + a11y). Hold at 15.x and log if any part fails.**                                          | Nothing                                  | 2026-07-28 | —                                 | None — executed at `PH-0.4`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ~~`SB-01`~~ | ~~No GitHub remote.~~ **Closed 2026-07-29** — private repo at `josamcode/josam-academy`, `main` pushed.                                                                                                                                                                                                  | —                                        | 2026-07-28 | —                                 | Done.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `SB-14`     | `13 §9` cites "custom rules (`§19`)" but `13` ends at `§18`. Dangling cross-reference, same class as `SB-11`.                                                                                                                                                                                            | Nothing — `PH-0.16` governs custom rules | 2026-07-28 | Founder                           | Point the citation at a real section, or drop it. Not urgent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ~~`OQ-24`~~ | ~~Renovate auto-merge policy.~~ **Resolved 2026-07-29** — policy recorded in `13 §16.1` (`DEC-59`, `BR-1826`–`BR-1829`). `renovate.json` is written at `PH-0.10`.                                                                                                                                        | —                                        | 2026-07-28 | —                                 | Done.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## 6. Open Questions

| ID          | Question                                                  | Owner   | Needed by    | Status                                  |
| ----------- | --------------------------------------------------------- | ------- | ------------ | --------------------------------------- |
| `OQ-01`     | Commercial registration for Paymob merchant account       | Founder | Phase 1      | 🟡 **Start now** — longest lead time    |
| `OQ-21`     | Certificate PDF layout — portrait/landscape, QR placement | Founder | Phase 4      | ⬜ Open                                 |
| `OQ-22`     | Week start day default (Saturday vs locale)               | Founder | Phase 4      | ⬜ Open                                 |
| `OQ-23`     | PDF rendering approach on 2 vCPU                          | Joint   | Phase 4      | ⬜ Open                                 |
| ~~`OQ-24`~~ | Renovate auto-merge policy                                | Founder | Phase 0      | ✅ **Resolved 2026-07-29** — `13 §16.1` |
| `OQ-25`     | Learner 2FA — offer or staff-only                         | Founder | Phase 3      | ⬜ Open                                 |
| `OQ-26`     | Breach notification commitment (72h proposed)             | Founder | Phase 3      | ⬜ Open                                 |
| `OQ-27`     | Soft launch pricing — free / discounted / full            | Founder | Phase 3      | ⬜ Open                                 |
| `OQ-28`     | Mobile before Growth, or reverse                          | Founder | Phase 5 exit | ⬜ Open                                 |

**Resolved:** `OQ-02` – `OQ-20` — see `DEC-01` through `DEC-55` in their respective documents.

---

## 7. Divergences From The Documents

> Where the built system differs from the specification, and why. Every entry must either be corrected in the document or justified here.

| Date       | Document                                    | What diverged                                                                                                                                                                                                                                                                                                                        | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-29 | `08 §11.1`, `16 §PH-0.9`, `16 §PH-0.28`     | **The server is shared. It hosts live client projects, not a provider template.** 13 containers: 5 client apps, their own `postgres:18-alpine` and `redis:7.2`, plus the Coolify stack. ~22% of 8 GB at rest.                                                                                                                        | Discovered during `PH-0.7` execution. Every prior document — including `08 §11.1`'s memory budget, which allocates 6.9 GB of 8 GB to Josam Academy — assumed the whole machine belongs to this project. It does not, and never did.                                                                                                                                                                                                                                                                                           | 🟡 **Recorded, not corrected.** `PH-0.9` recalculates the split (`SB-23`); `PH-0.28` narrows its backup scope (`SB-24`). Correcting `08 §11.1` itself is a founder-authorised document edit, not taken here.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-07-29 | `14 §12`, `16 §PH-0.7`                      | **SSH port left at 22.** `14 §12` specifies a non-default port.                                                                                                                                                                                                                                                                      | The box carries other people's production traffic; a port change is operational risk for no security return, since a scan finds any port in seconds. `§3`'s stated justification was noise reduction, which fail2ban delivers by banning the source. `14 §12`'s intent — a hardened SSH surface — is met by key-only auth, `PermitRootLogin no` and `AuthenticationMethods publickey`.                                                                                                                                        | ✅ **Decision recorded** in the runbook `§3`, with the procedure retained should it ever be revisited.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-07-29 | `16 §PH-0.9`                                | **`PH-0.9` is not "Coolify setup".** Coolify was already installed from a provider template before Phase 0 began.                                                                                                                                                                                                                    | The task as written assumes a fresh install. The real work is verifying the existing one: rotate the admin credential, confirm the dashboard is not bound to `0.0.0.0`, place it behind the firewall, and apply the `08 §11.1` per-container memory limits. An install step run against an existing install is at best a no-op and at worst destructive.                                                                                                                                                                      | ✅ **Recorded.** Row rewritten in `CLAUDE.md §5`; runbook scope follows at `PH-0.9`. Founder-supplied fact, 2026-07-29.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-07-29 | `16 §PH-0.7`, `14 §12`                      | **`PH-0.7` hardens a live, exposed box, not a fresh one.** The server has been running ~90 days with root password login enabled and no firewall.                                                                                                                                                                                    | `14 §12` reads as a fresh-install procedure. Every step must instead branch on "if this is already configured differently", and the threat model must assume prior unauthorised access is possible rather than impossible.                                                                                                                                                                                                                                                                                                    | 🟡 **Recorded — runbook not yet written.** Binding on `PH-0.7`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-07-29 | `08 §7`, `10` (client assumptions), `13 §3` | **Prisma 7 connects through a driver adapter.** Prisma 7 removed the built-in connection path: `new PrismaClient()` no longer takes a connection URL and is handed `@prisma/adapter-pg` wrapping a `pg` pool. `08` and `10` were written against the **Prisma 5** client, where the query engine owned connections and transactions. | Not a choice — it is how Prisma 7 works, and `PH-0.6` confirmed 7.9.1 rather than falling back to 6 (`BR-1816` discharged). The **code** impact is contained inside `apps/api/src/shared/database` and does not touch `BR-1580`. The **behavioural** impact is not contained, which is why it is recorded here rather than closed.                                                                                                                                                                                            | 🟡 **Open — carried into Phase 1, deliberately.** Recorded as `BR-1819` in `13 §18.1`. `08` and `10` are **not** corrected: they describe the target design and the divergence is in the client beneath them. Five things must be **re-verified when Phase 1 writes its first real transaction**, not assumed: **(1) pool sizing** — now `pg.Pool`'s, set in application code; `connection_limit` in `DATABASE_URL` no longer applies and **no document specifies a size**, which against `08 §11`'s 2 vCPU / 8 GB (`CON-03`) is a real capacity decision. **(2) `$transaction`** — both the array and interactive-callback forms now run through the adapter; isolation levels, `timeout`/`maxWait`, and nesting must be confirmed against it, not against Prisma 5 docs. **(3) Token rotation (`08 §7`, `BR-016`)** — refresh tokens rotate on every use and are family-tracked; rotate-plus-invalidate-family must stay atomic under concurrent refreshes. **(4) `UPDATE … RETURNING` atomicity (`10`, `BR-984`, `BR-798`)** — quota consumption depends on it; confirm it holds under concurrency and that the returned row count is trustworthy. **(5) Error shapes** — driver failures may surface as `pg` errors rather than `PrismaClientKnownRequestError`, so any handler matching a Prisma error code (unique-constraint violations especially) must be re-checked. |
| 2026-07-28 | `13 §2`                                     | **`SB-02` — Node runtime.** Document specified **Node 22 LTS**; the pinned runtime is **Node 24 LTS ("Krypton") 24.18.0**.                                                                                                                                                                                                           | Node 22 moved to Maintenance LTS. Node 24 is the current Active LTS, maintained through April 2028, and is what is installed on the development machine. `13 §2` was stale, not wrong in principle.                                                                                                                                                                                                                                                                                                                           | ✅ **Resolved.** Founder authorised the document edit. `13 §2` version cell and rationale corrected; the stale "Node 22" in the `§17` approval table corrected for internal consistency; appendix `13 §18` "Resolved Versions (Phase 0)" added with the full pin table. Binding on `engines`, `packageManager`, `.nvmrc`, the CI Node matrix, and every Dockerfile base image (`BR-1810`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-07-28 | `12 §20.12`, `15 §2`, `15 §Phase 0`         | **`SB-04` — Wave 1 component count.** Documents stated **62**; `16-task-breakdown.md` tasks `PH-0.17`–`PH-0.27` enumerate **69**.                                                                                                                                                                                                    | The 62 was an aggregate that never reconciled with any enumeration. `16` is the executable artifact, so `16` wins.                                                                                                                                                                                                                                                                                                                                                                                                            | ✅ **Resolved.** Founder authorised the document edit. Count corrected to **69** in `12 §20.12`, `15 §2`, and the `15` Phase 0 exit criteria. New `12 §20.12.1` records the authoritative 69-component roster by task; `12 §20.12.2` reassigns by name every `§20` component with no Phase 0 task (`Can` and `Reason` → Phase 1, they read `_can` from `PH-1.11`; 9 → Wave 2; `VideoUploader` → Wave 3; `Confirm` and `ToastProvider` folded as naming duplicates). Added `BR-1812`, `BR-1813`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-07-28 | `13 §2`                                     | **`SB-06` — TypeScript major.** Floor is `5.6+`; the newest release is **7.0.2**, but the pin is **6.0.3**.                                                                                                                                                                                                                          | `typescript-eslint@8.65.0` declares `typescript: ">=4.8.4 <6.1.0"`. TypeScript 7 would silently disable type-aware linting, which is the mechanism enforcing `BR-1579`. Verified against the live registry, not assumed.                                                                                                                                                                                                                                                                                                      | ✅ **Not a divergence** — `5.6+` is a floor and 6.0.3 satisfies it. Recorded because the pin is deliberately _not_ the newest available. `BR-1805` states the condition for raising it. Also `BR-1806`: TS 6 removes `moduleResolution: "node"`, so every `tsconfig` uses `nodenext`/`bundler`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-07-28 | `13 §18.2`                                  | **`BR-1818` rewritten.** The superseded text left open whether `QueryBoundary` (`PH-0.27`) and `Form` (`PH-0.21`) would be built on TanStack Query / React Hook Form or against a library-agnostic interface, and cited `BR-1528` in favour of the wrapper.                                                                          | That reading of `BR-1528` was wrong. `BR-1528` is about **Radix** — a headless behaviour library supplying keyboard handling and ARIA for a _visible control_, which is why it belongs inside our components. TanStack Query and React Hook Form are not visible controls. `09 §7.2` names TanStack Query as **the** server-state mechanism and React Hook Form + Zod as **the** form mechanism, and `07`/`12` assume its cache semantics directly. A wrapper would be an abstraction at first use — prohibited by `BR-1355`. | ✅ **Resolved.** Founder-instructed correction made during `PH-0.1`. `BR-1818` now states both libraries are used **directly**, no abstraction is built over either, and only the _version_ is deferred to `PH-0.21`/`PH-0.27`. The superseded text is quoted in the rule so the change is auditable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-07-28 | `09 §9`                                     | **`SB-13` — `packages/ui` absent from the documented monorepo tree.** `09 §9` lists `contracts`, `abilities`, `tokens`, `i18n`, `config` — no `ui`.                                                                                                                                                                                  | `12 §20` mandates `packages/ui` and two rules depend on it existing: `BR-1524` (feature code imports from `@josam/ui` only) and `BR-1575` (`packages/ui` depends on no app). `09 §9`'s tree is illustrative and predates the `12 §20` component work.                                                                                                                                                                                                                                                                         | ✅ **Resolved.** `packages/ui` created at `PH-0.1` on the authority of `12`; `09 §9` corrected 2026-07-28 on founder instruction — the tree now lists `ui/` and names stylelint in the config package.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-07-28 | _(none — new file)_                         | **`.gitattributes` added beyond the approved `PH-0.1` file list.** Forces LF in the repository and the working tree.                                                                                                                                                                                                                 | Development is Windows, every deployment target is Linux. Without it, `scripts/backup.sh` (`PH-0.28`) and the Dockerfiles (`PH-0.10`) are checked out CRLF and `COPY`ed into containers where `#!/bin/bash\r` is not a valid interpreter — a failure that appears only in the container. Cheaper to prevent at repo init than to diagnose at `PH-0.28`.                                                                                                                                                                       | 🟡 **Flagged for founder review.** One unapproved file; trivially revertable if unwanted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-07-28 | `12 §20.12`                                 | **Component library total.** `§20.12` states **134** components; a full census of `§20.4`–`§20.10` enumerates **151** distinct names.                                                                                                                                                                                                | The 134 total predates the Wave 1 reconciliation and has never been recounted.                                                                                                                                                                                                                                                                                                                                                                                                                                                | 🟡 **Open — not corrected.** Outside the authorised edit. Recorded as `BR-1813`. Nothing in Phase 0 depends on the Wave 2/3 counts. Needs a founder-authorised recount pass before Wave 2 begins.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

- **Rule:** a divergence is either fixed in the code or corrected in the document. It is never left as an undocumented difference (`BR-1789`).

---

## 8. Technical Debt

> Things deliberately deferred. Not bugs — decisions with a date.

| ID          | Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Reason deferred                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Revisit at                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| ~~`SB-28`~~ | ~~`BR-1544` is honoured by `PH-0.25`'s five fields only.~~ **Closed by `PH-0.29`, 2026-07-29.** The count was wrong when raised — nineteen of twenty-four fields, not sixteen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | ✅ **Closed.** One `Availability` union for all 24 fields, `OptionAvailability` for options, and fitness cases **33**–**35** so it cannot recur: a bare `disabled?: boolean` fails lint, `disabled: true` without a reason fails typecheck, and `readOnly` with `disabled` fails typecheck.                                                                                                                                                                                                                                                                                                             | ✅ **Done**                                                                                                                  |
| `SB-26`     | **A patched dependency (`patches/jsdom@30.0.0.patch`) and the geometry it does not restore.** jsdom's `getComputedStyle` throws on any `calc()` mixing a percentage with a length; the patch adds the missing null guard. Separately, `packages/ui/vitest.setup.ts` shims `ResizeObserver`, `scrollIntoView` and pointer capture, none of which jsdom can implement without a layout engine.                                                                                                                                                                                                                                                                                                           | The patch is upstream-correct and should be **dropped when jsdom ships the fix** — `src/test-environment.spec.tsx` exists so its absence fails loudly rather than as a stack trace inside `node_modules`. The shims are deliberately **inert**, so component specs prove semantics, keyboard operation, ARIA wiring and value flow, and prove **nothing** about popover placement, scroll-into-view or viewport collision. That surface is covered only by Storybook in a real browser, which is why a green `pnpm test` is not by itself evidence that a floating control is positioned correctly.     | **Phase 0 exit** — recheck jsdom upstream; **`PH-0.27`** depends on it most (`Popover`, `Tooltip`, `DropdownMenu`, `Drawer`) |
| `SB-27`     | **`jsx-a11y/control-has-associated-label` is scoped off for `packages/ui/src/fields/**`.** `FormField` owns the `<label htmlFor>` and each field body owns the control carrying the matching id, so the association is real at runtime and structurally invisible to a rule that reads one JSX tree at a time.                                                                                                                                                                                                                                                                                                                                                                                         | Scoping a rule is indistinguishable from disabling it unless the remaining coverage is proven, so fitness case **28** asserts the rule still fails a build in `apps/web`. The compensating controls inside the scope are stronger than the rule: `useFormField()` throws outside a `FormField`, every field spec locates its control with `getByLabelText` (which resolves through the accessibility tree), and axe runs over all four theme/direction combinations. Revisit if a field body is ever written that does **not** go through `FormField` — at that point the scope is wrong, not the rule. | **Phase 0 exit**                                                                                                             |
| `SB-23`     | **`08 §11.1`'s memory budget is invalid on a shared box.** It allocates 6.9 GB of 8 GB to Josam Academy with 1.1 GB headroom — the whole machine, leaving nothing for the client stack already running on it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `PH-0.9` must recalculate against **actual free headroom** and record the split. It must **not** apply limits to the client containers; they are not this project's to constrain. Real risk to state plainly: the client containers are **unlimited**, so under pressure the OOM killer is likelier to select one of ours _because_ ours declares a limit. Declaring limits is still correct (`BR-878`); it just does not protect us from growth on the other side. Sizing conservatively is the only mitigation available.                                                                             | **`PH-0.9`**                                                                                                                 |
| `SB-24`     | **`PH-0.28` backup scope must name what it does not cover.** The box runs two Postgres instances — Josam Academy's and the clients'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `PH-0.28` covers **Josam Academy's database only**, and the backup runbook must say so in itself, not only here: a backup job on a box with two databases is exactly the situation where someone later assumes both are covered. With `SB-17` (VM snapshots are not backup coverage), the client database currently has **no verified backup** — the client's arrangement to make, not this project's to assume.                                                                                                                                                                                        | **`PH-0.28`**                                                                                                                |
| `SB-25`     | **26 pending package updates; one cannot be applied by `unattended-upgrades`.** Not addressed at `PH-0.7`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Applying them needs a **reboot window** on a box serving live client traffic, which is a scheduling decision rather than a technical one. `unattended-upgrades` is enabled and handles security patches going forward (`Automatic-Reboot "false"`, deliberately — an unannounced 06:00 reboot is an outage). `/var/run/reboot-required` reports when one is pending. The single unappliable update needs identifying before the window is booked.                                                                                                                                                       | **Before `PH-0.11`** — the first deploy is a natural reboot window                                                           |
| `SB-08`     | **Component library census.** `12 §20.12` states **134** total components; a full census of `§20.4`–`§20.10` enumerates **151** distinct names. Wave 2 (44) and Wave 3 (28) counts have never been reconciled against any enumeration either. Wave 1 is settled at 69 (`SB-04`); only the downstream totals are unverified.                                                                                                                                                                                                                                                                                                                                                                            | Outside Phase 0 authorisation, and blocks nothing before Wave 2. Recorded as `BR-1813`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **Phase 0 exit**                                                                                                             |
| `SB-09`     | ~~**Prisma 7 pin is provisional.**~~ **Closed at `PH-0.6`: all three probe parts passed on the compiled CJS artifact. Prisma 7.9.1 stands; no fallback to 6. The one real change — a required driver adapter — is contained inside `shared/database` and does not touch `BR-1580`.**                                                                                                                                                                                                                                                                                                                                                                                                                   | Resolved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | ✅ **Closed `PH-0.6`**                                                                                                       |
| `SB-11`     | **13 dangling BR references** — rules cited but never written (`docs/BR-REGISTRY.md §5`). Most are off-by-1000 typos the author already annotated inline. **`BR-895`–`BR-899` are the exception**: they are not typos, they are citations to rules that were never authored, and `PH-0.16` is scheduled to enforce two of them (layer direction; no vendor SDK outside `providers/`).                                                                                                                                                                                                                                                                                                                  | Each needs an authoring decision by the founder, not an inferred fix. Correcting them is a multi-document pass outside current authorisation (`BR-1824`).                                                                                                                                                                                                                                                                                                                                                                                                                                               | **`PH-0.16`** for `BR-895`–`899`; Phase 0 exit for the rest                                                                  |
| `SB-12`     | **Six document headers declare BR ranges that do not match their contents** (`docs/BR-REGISTRY.md §3`). `13` declared a range overlapping 114 live rules in `14` — this caused a real collision during this session.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `BR-REGISTRY.md §3`/`§4` is now the allocation authority, so the wrong headers are documented rather than trusted. Fixing them is a six-document edit.                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **Phase 0 exit**                                                                                                             |
| `SB-10`     | **Deferred version pins.** ~20 dependencies are recorded in `13 §18.2` as dated observations, explicitly non-binding. Each is pinned by the phase that installs it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pinning a Phase 6 dependency in Phase 0 uses information that will be seven months stale and violates `13 §1` filter 4. Recorded as `BR-1814`, `BR-1815`.                                                                                                                                                                                                                                                                                                                                                                                                                                               | **each named phase**                                                                                                         |
| `SB-15`     | **CI must invoke lint by both paths.** `PH-0.10` has to run `turbo run lint` **and** a single root-level `eslint` invocation over changed files, the way the pre-commit hook does. Turbo runs `eslint .` inside each workspace (one TSConfig root); the hook runs it once from the repository root across all of them. The second path caught a real parser defect at `PH-0.2` that the first structurally cannot see.                                                                                                                                                                                                                                                                                 | Not debt that can be paid before `PH-0.10` exists — recorded now so it is not relearned in a pull request.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **`PH-0.10`**                                                                                                                |
| `SB-16`     | **No branch protection on `main`.** GitHub rulesets are not enforced on private repositories on the current plan, so nothing server-side prevents a direct push, a force-push, or a merge with red CI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Cannot be paid without a plan change. `PH-0.10`'s CI becomes the **only** gate on `main`, which raises its stakes: it is now the difference between a checked change and an unchecked one, not merely a convenience. The pre-commit hook and commitlint remain the local line of defence and are bypassable with `--no-verify`.                                                                                                                                                                                                                                                                         | **`PH-0.10`** — and revisit if the plan changes                                                                              |
| `SB-17`     | **Provider weekly VM snapshots are not backup coverage.** They exist and are easy to mistake for `PH-0.28` being partly done. They are not: a VM snapshot is never restore-tested, captures a torn `pg` data directory rather than a consistent dump, and has never been proven to produce a working database.                                                                                                                                                                                                                                                                                                                                                                                         | Recorded now precisely because it is the kind of thing that gets counted as coverage later. `PH-0.28` still requires daily `pg_dump` → R2 **and** a weekly restore verified against a clean database.                                                                                                                                                                                                                                                                                                                                                                                                   | **`PH-0.28`**                                                                                                                |
| ~~`SB-18`~~ | ~~Two values in `12 §3.2` fail `BR-1216`.~~ **Resolved 2026-07-29 by founder decision.** `--accent-contrast` introduced (dark foreground on accent in both themes); status colours split into surface/text pairs. Every ratio pinned in `color.spec.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | ✅ **Closed**                                                                                                                |
| `SB-19`     | **`BR-1113` — bilingual error objects.** `PH-0.19` emits `message` as a single string; `11 §1.5` and `BR-1113` require a localised `{ar, en}` object built server-side from the catalog. `packages/i18n` shipped at `PH-0.13` with the seven `error.*` keys in both languages, so **the catalog no longer blocks this**. What remains is `shared/i18n` in the API — resolving the request locale and formatting the envelope.                                                                                                                                                                                                                                                                          | Not reopened at `PH-0.19`: the API-side locale resolution belongs with the request context work, and a half-wired localiser with no locale source would be worse than the honest single string.                                                                                                                                                                                                                                                                                                                                                                                                         | **Phase 1 — the task that writes the first real error response**                                                             |
| `SB-20`     | **The `eslint-disable` reflex, logged as evidence (`BR-1512`).** At `PH-0.23` I wrote `// eslint-disable-next-line react/no-array-index-key` above the `key` on an OTP segment. What tempted it: the segments genuinely ARE positional and fixed, so the rule felt wrong rather than the code. **What I did instead:** removed the comment and used a stable template key. Two things worth keeping — the rule would never have fired (its selector matches a bare `Identifier`, not a template literal), so the disable was silencing nothing and `reportUnusedDisableDirectives` would itself have failed the build; and the reflex arrived _before_ checking whether there was anything to silence. | Recorded because `BR-1512`'s value is in the pattern of what tempts the reflex, and one line of evidence outlasts the rule text.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **Phase 0 exit** — review whether more instances accumulated                                                                 |
| ~~`SB-21`~~ | **Money scaling had a second, worse defect than the truncation one.** `CurrencyField` hardcoded `* 100` while accepting a `currency` prop, while `formatMoney` had used the currency's own exponent since `PH-0.13`. The two disagreed: JOD 12.345 stored 1235 and rendered back as **1.235** (tenfold under); JPY 12345 stored 1234500 and rendered as **¥1,234,500** (hundredfold over). Both halves of the round trip agreed, so nothing looked inconsistent from either end.                                                                                                                                                                                                                       | Fixed on founder instruction to audit every money path rather than wait for Phase 1. All scaling now goes through `toMinorUnits` / `fromMinorUnits` / `currencyFractionDigits` in `@josam/i18n` — the third use, so `BR-1355` is satisfied. Round-trip tests across EGP, USD, JOD, KWD, BHD, JPY.                                                                                                                                                                                                                                                                                                       | ✅ **Closed 2026-07-29**                                                                                                     |
| `SB-16`     | **The Redis health indicator must be registered at the moment `ioredis` is first installed — not afterwards.** `11 §API-21` lists `redis` among the `GET /health` checks. `PH-0.6` established the pattern: `DatabaseHealthIndicator` registers itself with `HealthService` on module init, so the Redis one is a handful of lines against that same shape.                                                                                                                                                                                                                                                                                                                                            | `ioredis` was deliberately not installed at `PH-0.5` because nothing consumed Redis yet. The risk is that the client lands for BullMQ in Phase 1 and the indicator is simply forgotten — and an indicator that silently never registers is worse than a missing one, because `/health` then reports `status: ok` while omitting a dependency the founder believes is being watched (`BR-892`).                                                                                                                                                                                                          | **the task that installs `ioredis`**                                                                                         |

---

## 8a. Enforcement Coverage Ledger — `12 §19` + `09 §enforcement`

> `BR-1833` — a check that is not active is recorded against **the specific task that activates
> it**. "Deferred" without a named task is indistinguishable from forgotten. The Phase 0 exit
> check reconciles against this whole table, not against whatever happens to be switched on.
>
> `BR-1832` — status below is the record of a past run. At exit, `pnpm verify:fitness` is
> **re-run**, not re-read.

### `12 §19` — all 20 rows

|   # | Check                                         | Enforces             | Status                      | Proof / activating task                                                                                                                                                    |
| --: | --------------------------------------------- | -------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Raw colours / palette utilities in components | `BR-1342`            | ✅ active                   | `PH-0.16` violation 1; `PH-0.14` deleted the palette outright                                                                                                              |
|   2 | Physical CSS direction properties             | `BR-1392`            | ✅ active                   | `PH-0.16` violation 2                                                                                                                                                      |
|   3 | Off-scale spacing and font sizes (CSS)        | `BR-1329`, `BR-1317` | ✅ active                   | `PH-0.16` violation 5                                                                                                                                                      |
|   4 | Hardcoded user-facing strings                 | `BR-1357`            | ✅ active                   | `PH-0.16` violations 6 and 7                                                                                                                                               |
|   5 | Prohibited copy terms in i18n catalogs        | `BR-1365`            | ✅ active                   | `PH-0.16` violation 16                                                                                                                                                     |
|   6 | Missing Arabic key in a bilingual string      | `BR-524`             | ✅ active                   | `PH-0.16` violation 17 — and type-level since `PH-0.13`                                                                                                                    |
|   7 | `!important`                                  | `BR-1353`            | ✅ active                   | `PH-0.16` violation 3                                                                                                                                                      |
|   8 | `any`, `@ts-ignore`, type assertions          | `BR-1497`            | ✅ active                   | `PH-0.2`, proven by violation there                                                                                                                                        |
|   9 | `console.*` at merge                          | `BR-1501`            | ✅ active                   | `PH-0.16` violation 11                                                                                                                                                     |
|  10 | Clickable non-semantic elements               | `BR-1469`            | ⬜ **`PH-0.17`**            | needs JSX to lint; `jsx-a11y` activates with the primitives                                                                                                                |
|  11 | Missing `aria-label` on icon buttons          | `BR-1471`            | ⬜ **`PH-0.20`**            | `IconButton` is built there; the rule is meaningless before it                                                                                                             |
|  12 | Array index as a React key                    | `BR-1429`            | 🟡 **configured, UNPROVEN** | selector exists since `PH-0.16` but was **not** among the 17 violations. Proven at **`PH-0.17`**, when there is a list to write. Recorded rather than counted (`BR-1830`). |
|  13 | `transition: all`                             | `BR-1493`            | ✅ active                   | `PH-0.16` violation 4                                                                                                                                                      |
|  14 | Bundle size budget                            | `BR-1486`            | ⬜ **`PH-0.10`**            | `size-limit` needs a built app and CI to be meaningful                                                                                                                     |
|  15 | Core Web Vitals                               | `BR-1486`            | ⬜ **`PH-0.10`**            | Lighthouse CI needs a deployed URL                                                                                                                                         |
|  16 | Contrast ratios                               | `BR-1216`            | ✅ active                   | `PH-0.12` pins every ratio; `PH-0.15` runs axe on every story                                                                                                              |
|  17 | Blanket `"use client"`                        | `BR-1502`            | ⬜ **`PH-0.17`**            | no client component exists yet; the rule has nothing to check                                                                                                              |
|  18 | Unknown or unmaintained dependency            | `BR-1468`            | ⬜ **`PH-0.10`**            | `pnpm audit` + Renovate belong to the CI pipeline (`13 §16.1`)                                                                                                             |
|  19 | Endpoint not present in the contract          | `BR-1447`            | ⬜ **`PH-1.8`**             | requires `packages/contracts`, which is Phase 1                                                                                                                            |
|  20 | Scope decorator present                       | `BR-918`             | ⬜ **Phase 1**              | there is no scoped query, and no `_can`, until the domain exists                                                                                                           |

**`12 §19` score: 15 active · 5 deferred to a named task** (rows 14, 15, 17, 18, 19 — `PH-0.10`, `PH-0.17`→see below, `PH-1.8`, Phase 1).

### `09 §enforcement` — the architectural rows

| Check                              | Enforces          | Status         | Proof                                                                                             |
| ---------------------------------- | ----------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| Module import boundaries           | `BR-901`          | ✅ active      | `PH-0.16` violation 12                                                                            |
| No circular dependencies           | Tier model        | ✅ active      | `PH-0.16` violation 14                                                                            |
| Layer direction                    | `BR-895`–`BR-898` | ✅ active      | `PH-0.16` violation 13 — encodes `09`'s description; the rule texts were never authored (`SB-11`) |
| No vendor SDK outside `providers/` | `BR-899`          | ✅ active      | `PH-0.16` violation 9                                                                             |
| No Prisma outside repositories     | `BR-897`          | ✅ active      | `PH-0.16` violation 8                                                                             |
| No `localStorage` for tokens       | `BR-855`          | ✅ active      | `PH-0.16` violation 10                                                                            |
| `packages/ui` independent of apps  | `BR-1575`         | ✅ active      | `PH-0.16` violation 15                                                                            |
| Migration is expand-only           | `BR-888`          | ⬜ **Phase 1** | the first non-empty migration is Phase 1                                                          |

---

## 9. Metrics

> Populated after launch. Targets from `01 §5`.

| Metric                          | Target (6mo) | Current | Trend |
| ------------------------------- | ------------ | ------- | ----- |
| `MET-01` Course completion      | ≥ 35%        | —       | —     |
| `MET-02` Goal set rate          | ≥ 70%        | —       | —     |
| `MET-03` AI deflection          | ≥ 60%        | —       | —     |
| `MET-06` Founder ops hours/week | < 3          | —       | —     |
| `MET-09` 7-day activation       | ≥ 65%        | —       | —     |
| `MET-11` Weekly active learners | ≥ 40%        | —       | —     |

**Infrastructure**

| Item              | Budget | Current |
| ----------------- | ------ | ------- |
| Monthly spend     | ~$30   | $0      |
| Learners          | —      | 0       |
| Courses published | —      | 0       |

---

## 10. Content Status

> Tracked separately because content is a parallel track and a top risk (`RSK-05`).

| Course | Lessons | Video | Lesson Notes | Quizzes | Status         |
| ------ | ------: | ----- | ------------ | ------- | -------------- |
| —      |       — | —     | —            | —       | No courses yet |

**Reminder:** `DEC-58` — the founder authors one complete course **during** Phase 2, not after it.

---

## 11. How To Update This File

At the end of **every** task:

```
1  Add a Work Log entry (§4) — newest at the top
2  Update the phase task count and percentage (§1)
3  Update "What Actually Works" if something new is live (§2)
4  Update Current task / Next task in the header
5  Add any new blocker (§5) or divergence (§7)
6  Update Last updated and Updated by
7  Commit this file with the task's code — same commit
```

**Rules:**

- `BR-1799` — `STATUS.md` is updated in the **same commit** as the work it describes. A separate "update status" commit means it will eventually be skipped.
- `BR-1800` — Work Log entries are append-only. Corrections are new entries, never edits to old ones.
- `BR-1801` — `§2` lists only what is **verified in production**. Written code that is not deployed does not appear there.
- `BR-1802` — Record **actual** time against the estimate. After Phase 0 this ratio recalibrates the whole roadmap (`DEC-56`).
- `BR-1803` — If a session ends mid-task, say so explicitly in the log, including exactly where it stopped and what remains.
- `BR-1804` — Never mark a task done to make the table look better. An honest 0% is more useful than a false 40%.

---

## 12. Session Checklist

**Starting a session:**

```
☐ Read docs/00-START-HERE.md
☐ Read this file — especially §4 (last entry), §5, §7
☐ Confirm the next task and its dependencies
☐ Read the task's Refs documents
```

**Ending a session:**

```
☐ Build · typecheck · lint · tests all green
☐ Definition of Done filled for any screen
☐ Work Log entry written
☐ Progress table updated
☐ Blockers and divergences recorded
☐ Committed together
```

---

_This file is the project's memory. Keep it honest — its only value is accuracy._

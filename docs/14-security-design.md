# 14 — Security Design

| Field | Value |
|---|---|
| **Project** | Josam Academy |
| **Domain** | josamacademy.com |
| **Document** | 14 — Security Design |
| **Status** | Draft — Pending Approval |
| **Version** | 0.1 |
| **Last Updated** | 2026-07-28 |
| **Owner** | Founder (Super Admin) |
| **Depends On** | `05-roles-and-permissions.md`, `08-system-design.md`, `10-database-design`, `11-api-contract`, `13-tech-stack.md` |
| **Feeds Into** | `15-implementation-roadmap.md`, `16-task-breakdown.md` |
| **Adds** | `BR-1605` – `BR-1704` · `DEC-48` – `DEC-55` |

---

## 1. Threat Model

### 1.1 What We Are Protecting

| Asset | Value | Loss impact |
|---|---|---|
| **Video content** | The product itself | Price collapse; the core commercial risk (`GOAL-04`) |
| **Learner PII** | Legal and trust | Regulatory exposure, permanent reputation damage |
| **Payment records** | Financial integrity | Disputes, revenue loss |
| **Entitlements** | Access control | Unpaid access, revenue leakage |
| **The founder's account** | Total control | Complete compromise |
| **Lesson Notes** | Curriculum IP | Competitive loss, AI knowledge base theft |
| **Certificates** | Credential trust | The credential becomes worthless |
| **AI budget** | Operating cost | A single abuse event can exceed the monthly budget |

### 1.2 Adversaries

| Actor | Motivation | Capability | Priority |
|---|---|---|---|
| **Account sharer** (`ANTI-01`) | Split the price | Low | **High** — most common |
| **Content pirate** | Resell or distribute | Medium | **High** |
| **Credential stuffer** | Account takeover from leaked passwords | Automated | High |
| **Quota abuser** | Free AI capacity | Medium | Medium |
| **Scraper** | Harvest curriculum and Lesson Notes | Automated | Medium |
| **Opportunistic attacker** | Automated vulnerability scanning | Automated | Medium |
| **Malicious staff** | Data or funds | Insider access | Low count, high impact |
| **Targeted attacker** | Specific harm | High | Low likelihood |

### 1.3 Accepted Risks

Stated explicitly so they are decisions, not oversights.

| Risk | Why accepted | Mitigation |
|---|---|---|
| Screen recording on desktop | No technical prevention exists that survives a determined user (`BR-400`) | Watermarking makes it traceable (`FEAT-134`) |
| No hardware DRM at launch | Exceeds budget (`NG-06`, `CON-02`) | Layered protection; provider abstraction ready |
| Single server | Budget (`CON-09`) | Daily off-server backups, 4h RTO |
| No WAF beyond Cloudflare free | Budget | Application-level rate limiting and validation |
| No penetration test at launch | Budget | Automated scanning, dependency auditing, this document |

- `BR-1605` — Accepted risks are reviewed at 6 months. An accepted risk is a dated decision, not a permanent position.

---

## 2. Authentication

### 2.1 Password Handling

```
Algorithm   Argon2id
Memory      64 MB
Iterations  3
Parallelism 4
Salt        16 bytes, per-password, random
```

- `BR-1606` — Argon2id only. bcrypt and PBKDF2 are not used for new hashes.
- `BR-1607` — Parameters are tuned to ~100 ms on the production CPU — strong against offline attack, cheap enough not to become a login bottleneck on 2 vCPU (`BR-859`).
- `BR-1608` — Minimum 8 characters with at least one letter and one digit (`BR-001`). No composition rules beyond that, and no maximum length. Complexity rules produce weaker, more predictable passwords.
- `BR-1609` — `DEC-48` — New and changed passwords are checked against a local k-anonymity breach list. A known-breached password is rejected with a clear explanation, not a vague error.
- `BR-1610` — Password changes revoke all refresh tokens across all devices (`FEAT-006`).

### 2.2 Enumeration Resistance

- `BR-1611` — Registration, login, and password reset return identical responses and identical timing regardless of whether the account exists (`BR-014`, `BR-1123`).
- `BR-1612` — Login failure never indicates which credential was wrong (`BR-028`).
- `BR-1613` — Certificate verification returns a generic not-found without hinting at code format (`BR-1130`).

### 2.3 Brute Force & Credential Stuffing

| Surface | Limit | Action on breach |
|---|---|---|
| Login per IP | 5 / 15 min | Exponential backoff |
| Login per account | 10 / hour | Temporary lock + notification email |
| OTP request per number | 3 / hour | 1-hour cooldown (`BR-007`) |
| OTP verification | 3 attempts per code | Code invalidated (`BR-006`) |
| Password reset per email | 3 / hour | Silent throttle |

- `BR-1614` — Account lock is temporary and self-releasing. Permanent lock creates a denial-of-service against legitimate learners.
- `BR-1615` — A lock notification email tells the learner what happened and how to regain access (`BR-1362`).
- `BR-1616` — Successful login from a new country triggers a notification (`BR-029`).
- `BR-1617` — `DEC-49` — CAPTCHA is added only if abuse is observed, and only Cloudflare Turnstile (privacy-preserving, free). Pre-emptive CAPTCHA costs conversion for a hypothetical threat.

### 2.4 OAuth

- `BR-1618` — Authorization code flow with PKCE. Implicit flow is prohibited.
- `BR-1619` — `state` parameter validated on every callback (CSRF protection).
- `BR-1620` — Google `id_token` signature, issuer, audience, and expiry are all verified server-side. A client-supplied token is never trusted.
- `BR-1621` — Automatic identity linking requires a **verified** matching email. Phone numbers never auto-link (`BR-010`).

---

## 3. Sessions & Tokens

### 3.1 Token Design

| Token | Lifetime | Storage | Revocable |
|---|---|---|---|
| Access | 15 min | Memory only | No (short-lived) |
| Refresh | 30 days | httpOnly cookie (web) · Keychain (mobile) | Yes, server-side |
| Playback | 4 hours | Memory | Yes, session-bound |
| Verification | 24 h / 1 h | Email link, single-use | On consumption |
| Signed R2 URL | 5 min | Transient | No (short-lived) |

- `BR-1622` — Refresh tokens are stored **hashed**. A database read never yields a usable token (`BR-959`).
- `BR-1623` — Refresh rotation with family tracking. Reuse of a rotated token revokes the entire family and forces re-login (`BR-016`).
- `BR-1624` — Refresh tokens never touch `localStorage` on web or `AsyncStorage` on mobile (`BR-855`).
- `BR-1625` — Cookie flags: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/auth/refresh`. Scoping the path limits CSRF surface.
- `BR-1626` — Access tokens carry `permission_version`; a stale version triggers refresh rather than rejection (`BR-857`).

### 3.2 Session Termination

- `BR-1627` — Logout revokes the refresh token server-side and clears all client cache (`BR-1441`).
- `BR-1628` — Deactivating an account revokes every session immediately (`BR-491`).
- `BR-1629` — Logout is synchronized across browser tabs via a storage event.

---

## 4. Authorization

Defense in depth. Four independent layers, each assuming the others may fail.

```
1  UI          renders only permitted actions from _can        (BR-1457)
2  Guard       permission check before the controller           (BR-714)
3  Query       scope filter applied at the data layer           (BR-1202)
4  Database    row-level constraints and ownership columns
```

- `BR-1630` — Hiding a control is **never** security. Layer 1 is UX; layers 2–4 are security (`BR-1456`).
- `BR-1631` — Every endpoint declares its required permission explicitly. An endpoint without a declaration fails a startup check.
- `BR-1632` — Scope filters are applied by a shared decorator so a forgotten `where` clause cannot leak data (`BR-1843` → `BR-843`).
- `BR-1633` — `403` responses carry a generic body. They never disclose which permission was missing (`BR-1114`).
- `BR-1634` — Repeated `403` from one actor is logged as a security event (`BR-716`).
- `BR-1635` — Every endpoint has a generated permission test asserting denial without the permission (`BR-936`).

### 4.1 Sensitive Operation Separation

| Operation | Request | Approve |
|---|---|---|
| Refund | `ROLE-04` | `ROLE-01` only |
| Content publish | `ROLE-02` / `ROLE-03` | `ROLE-01` only |
| Device transfer beyond policy | Learner | `ROLE-04` within limits, `ROLE-01` beyond |
| Abuse flag action | System raises | `ROLE-01` only |
| Permission changes | — | `ROLE-01` only |

- `BR-1636` — No single non-founder role can both initiate and complete an operation affecting money or access.
- `BR-1637` — The last Super Admin cannot be demoted or deactivated (`BR-1646` → `BR-492`).

---

## 5. Content Protection

Layered, per `GOAL-04` and `PRIN-04`.

| Layer | Mechanism | Defeats |
|---|---|---|
| 1 | Signed, short-lived playback tokens | Direct URL sharing |
| 2 | Device binding | Account sharing |
| 3 | Concurrent stream limit | One account, many viewers |
| 4 | Dynamic watermarking | Anonymous redistribution |
| 5 | Mobile capture blocking | Casual mobile recording |
| 6 | Playback and download logging | Investigation and proof |
| 7 | Abuse scoring | Pattern detection |

- `BR-1638` — Playback authorization validates entitlement, unlock state, device, and concurrency in a **single server-side call**. No client input participates in the decision (`07 §6.2`).
- `BR-1639` — The watermark payload is constructed server-side from the authenticated identity and never appears in any API response (`BR-1141`).
- `BR-1640` — Video URLs are never returned in an unsigned form (`BR-1139`).
- `BR-1641` — Signed resource URLs live 5 minutes and are logged per download (`BR-401`, `BR-154`).
- `BR-1642` — Device tokens are HMAC-signed server-side and stored hashed. A forged token fails signature validation before any lookup (`BR-1051`).
- `BR-1643` — Abuse scoring never triggers automatic suspension. A human decides (`BR-802`).

### 5.1 Anti-Scraping

- `BR-1644` — `DEC-50` — Public curriculum is intentionally exposed (`BR-585`), but **paid Lesson Notes are never rendered server-side for unauthenticated requests** and are excluded from the sitemap (`BR-592`).
- `BR-1645` — Public endpoints are rate-limited per IP through Cloudflare and again at the application layer (`BR-634`).
- `BR-1646` — Certificate verification is rate-limited to prevent code enumeration (`BR-287`).

---

## 6. Data Protection

### 6.1 Classification

| Class | Data | Handling |
|---|---|---|
| **Secret** | Passwords, tokens, API keys, OTP codes | Hashed or encrypted; never logged, never returned |
| **Sensitive** | Email, phone, IP, device fingerprint, payment references | `student:read.pii` required; every access audited |
| **Internal** | Progress, notes, quiz answers, AI conversations | Owner + authorized staff only |
| **Public** | Course titles, curriculum, previews, certificate name/date | Freely served |

- `BR-1647` — PII access is gated by a dedicated permission and every read is audit-logged (`BR-644`, `BR-470`).
- `BR-1648` — Learner notes and AI conversations are readable by **no staff role** by default. Support may view an AI conversation only while an open ticket references it, and that view is logged (`BR-1009`, `BR-672`).
- `BR-1649` — Certificate verification exposes name, course, and date only (`BR-748`).

### 6.2 Encryption

| Layer | Mechanism |
|---|---|
| In transit | TLS 1.3, HSTS with preload |
| Database at rest | Full-disk encryption on the VPS volume |
| Backups | Encrypted before upload; key stored outside R2 (`BR-619`) |
| R2 objects | Server-side encryption, private buckets |
| Secrets | Environment variables via Coolify, never in the database |

- `BR-1650` — TLS 1.2 and below are disabled. HTTP redirects permanently to HTTPS.
- `BR-1651` — The backup encryption key is stored in a location that survives total loss of the VPS. A key stored only on the server makes the backup worthless (`BR-618`).

### 6.3 Retention & Deletion

- `BR-1652` — Deletion anonymizes personal identifiers while preserving financial records, which are legally retained (`BR-025`).
- `BR-1653` — Issued certificates remain verifiable after account deletion, showing the name captured at issuance (`BR-1023`).
- `BR-1654` — Retention limits from `10 §12` are enforced by scheduled jobs, not by intention.
- `BR-1655` — `provider_payload` on transactions is nulled after 90 days while the row is retained (`BR-975`).

---

## 7. Input Validation & Injection

- `BR-1656` — Every request body, query parameter, and path parameter is validated by a Zod schema at the boundary. Unvalidated input never reaches a service.
- `BR-1657` — Validation is allowlist-based. Unknown fields are stripped, not passed through.
- `BR-1658` — All database access is through Prisma's parameterized queries. Raw SQL requires a documented exception and parameter binding.
- `BR-1659` — User-generated content (notes, Q&A, reviews, tickets) is rendered as Markdown through `rehype-sanitize` with an explicit allowlist. `dangerouslySetInnerHTML` requires written justification (`BR-1462`).
- `BR-1660` — Uploads are validated by **MIME type sniffing**, not extension, plus size and dimension limits (`BR-1467`).
- `BR-1661` — Uploaded files are stored with generated names. The original filename is metadata only, never a path component.
- `BR-1662` — SVG uploads are prohibited. SVG is an executable format.
- `BR-1663` — `embed` resources are restricted to a configurable domain allowlist (`BR-153`).
- `BR-1664` — Redirect targets are validated against an allowlist. Open redirects are prohibited (`BR-1466`).

---

## 8. API Security

### 8.1 Headers

```
Strict-Transport-Security   max-age=63072000; includeSubDomains; preload
Content-Security-Policy     default-src 'self'; script-src 'self';
                            img-src 'self' data: https://*.r2.dev;
                            media-src https://*.b-cdn.net;
                            connect-src 'self' https://api.anthropic.com ...;
                            frame-ancestors 'none'; base-uri 'self'
X-Content-Type-Options      nosniff
Referrer-Policy             strict-origin-when-cross-origin
Permissions-Policy          camera=(), microphone=(), geolocation=()
X-Frame-Options             DENY
```

- `BR-1665` — CSP is enforced, not report-only, from the first production deployment. Retrofitting CSP onto a live app is far harder.
- `BR-1666` — `unsafe-inline` and `unsafe-eval` are prohibited in `script-src`. Nonces are used where inline script is unavoidable.
- `BR-1667` — `frame-ancestors 'none'` prevents clickjacking and unauthorized embedding of the player.

### 8.2 CORS

- `BR-1668` — Origin allowlist only: the production web origin and localhost in development. Wildcard origins are prohibited.
- `BR-1669` — Credentials are permitted only for allowlisted origins.

### 8.3 Rate Limiting

Per `07 §8.7`, enforced in Redis with a sliding window, behind Cloudflare's own layer.

- `BR-1670` — Limits are per-user when authenticated, per-IP otherwise. Shared networks are common in this region; pure IP limiting punishes legitimate learners (`BR-633`).
- `BR-1671` — Rate limit responses state the reset time (`BR-632`).
- `BR-1672` — Playback token issuance and AI requests carry their own stricter limits, as both map directly to cost.

### 8.4 Webhooks

- `BR-1673` — Every webhook signature is verified before any processing. An unsigned or invalid webhook is rejected and logged.
- `BR-1674` — Webhook processing is idempotent by provider event ID (`BR-1120`).
- `BR-1675` — Webhook endpoints are excluded from CSRF protection but subject to signature verification and IP allowlisting where the provider publishes ranges.

---

## 9. Secrets Management

- `BR-1676` — Secrets live only in environment variables managed by Coolify. Never in the database, never in the repository, never in client bundles (`BR-1463`).
- `BR-1677` — `.env` is git-ignored; `.env.example` contains keys with empty values only.
- `BR-1678` — Startup validation fails fast if any required secret is missing (`BR-943`).
- `BR-1679` — Provider API keys are write-only in the admin UI. They are never displayed after saving, not even masked (`BR-483`).
- `BR-1680` — Secrets are rotated on staff departure, on suspected exposure, and annually regardless.
- `BR-1681` — CI secret scanning runs on every push. A committed secret is treated as compromised and rotated immediately, not merely reverted.

---

## 10. Payment Security

- `BR-1682` — `DEC-51` — **Card data never touches the platform.** Hosted payment pages only. This keeps PCI scope at SAQ-A, the minimum possible.
- `BR-1683` — Only the last four digits and card brand are stored, sourced from the gateway.
- `BR-1684` — Refunds execute through the gateway API. No manual balance adjustment path exists.
- `BR-1685` — Order amounts are recomputed server-side at checkout. A client-supplied price is never trusted (`BR-1157` pattern).
- `BR-1686` — Entitlements are granted only from a verified webhook, never from a client success callback (`BR-917`).

---

## 11. AI-Specific Security

Often overlooked, and directly exploitable here.

### 11.1 Prompt Injection

Lesson Notes, Q&A answers, and learner questions all enter model context. Any of them can carry instructions.

- `BR-1687` — `DEC-52` — Retrieved content is passed as **clearly delimited data**, never as instructions. The system prompt states that curriculum content is reference material and that instructions inside it are to be ignored.
- `BR-1688` — Learner input is never concatenated into the system prompt. It occupies the user role exclusively.
- `BR-1689` — The model has **no tool access**. It cannot read the database, call APIs, or take actions. Its only capability is producing text (`FEAT-110`).
- `BR-1690` — Model output is rendered as sanitized Markdown, never as HTML (`BR-1659`).
- `BR-1691` — Citations are constructed from chunk metadata, never parsed from model output. This closes the path where a model could fabricate a link (`BR-1741` → `BR-741`).

### 11.2 Data Leakage Through Retrieval

- `BR-1692` — Entitlement scoping is applied **before** retrieval, not as a post-filter. Post-filtering leaks content through result counts and relevance scores (`BR-869`).
- `BR-1693` — Spoiler boundaries exclude chunks beyond the learner's position in sequential courses (`BR-313`).
- `BR-1694` — Learner notes enter context only for that learner's own conversations (`BR-316`).
- `BR-1695` — Conversation history is scoped per user. A cross-user context bleed would be a critical incident.

### 11.3 Cost Abuse

- `BR-1696` — Quota is checked and consumed atomically before generation completes (`BR-798`).
- `BR-1697` — Per-minute request limits apply on top of quota (`BR-1672`).
- `BR-1698` — Input length is capped. An oversized prompt is rejected before reaching the provider.
- `BR-1699` — A monthly spend ceiling automatically switches to the cheaper fallback model and alerts the founder (`BR-334`).

---

## 12. Infrastructure Hardening

The VPS is the single point of failure (`CON-09`). These are one-time actions with permanent value.

```
SSH        key-only authentication · PasswordAuthentication no
           PermitRootLogin no · non-default port · fail2ban enabled
Firewall   ufw default deny · allow only 22 (custom), 80, 443
           Postgres and Redis bound to 127.0.0.1 only
Updates    unattended-upgrades for security patches
Docker     containers run as non-root · read-only filesystems where possible
           no --privileged · explicit memory limits (BR-878)
Cloudflare proxied DNS · origin IP not publicly resolvable
```

- `BR-1700` — Root SSH login is disabled and password authentication is turned off before any production data exists.
- `BR-1701` — PostgreSQL and Redis never bind to a public interface. Neither is reachable from outside the host.
- `BR-1702` — The origin server IP is not exposed. All traffic routes through Cloudflare, and the origin firewall accepts HTTP only from Cloudflare ranges.
- `BR-1703` — Containers run as non-root users. A container escape from root is a host compromise.
- `BR-1704` — `DEC-53` — Server access is documented in a runbook the founder can follow after six months of not touching it. Undocumented infrastructure is inaccessible infrastructure for a solo operator.

---

## 13. Security Logging

| Event | Logged | Alerts |
|---|---|---|
| Failed login | ✔ | On threshold |
| New country login | ✔ | To the learner |
| Permission change | ✔ | — |
| PII access | ✔ | — |
| Impersonation | ✔ | — |
| Repeated 403 | ✔ | On threshold |
| Webhook signature failure | ✔ | Immediately |
| Rate limit breach | ✔ | On pattern |
| Abuse flag raised | ✔ | To the founder |
| Backup failure | ✔ | **Push, immediately** |
| Secret scanning hit | ✔ | **Immediately** |

- `BR-1705` — Security events are written to the append-only audit log (`BR-1077`).
- `BR-1706` — Logs never contain passwords, tokens, OTP codes, full card data, or full PII (`BR-626`).
- `BR-1707` — Log retention is 24 months for the audit log, 30 days for application logs (`BR-1078`).

---

## 14. Incident Response

`DEC-54` — A one-person team needs a written procedure, because incidents happen at the worst time.

| Severity | Definition | Response |
|---|---|---|
| **S1** | Data breach · payment compromise · total outage | Immediate |
| **S2** | Content leak · account takeover · partial outage | Within hours |
| **S3** | Abuse pattern · degraded performance | Within a day |
| **S4** | Minor defect with security relevance | Next work session |

**S1 / S2 procedure:**

```
1  CONTAIN    revoke affected sessions · disable the affected feature flag
              · rotate exposed secrets
2  ASSESS     what was accessed, by whom, for how long — from the audit log
3  PRESERVE   snapshot logs before they rotate
4  FIX        address the cause, not the symptom (BR-1512)
5  NOTIFY     affected learners honestly and specifically, within 72 hours
              for personal data
6  REVIEW     which automated check would have caught this — add it (BR-1523)
```

- `BR-1708` — Breach notification is honest and specific: what happened, what data, what to do. Vague reassurance destroys more trust than the breach.
- `BR-1709` — Every incident produces a written note and at least one preventive change.
- `BR-1710` — Feature flags exist partly as containment tools. Any risky subsystem can be disabled without a deployment (`BR-889`).

---

## 15. Privacy & Compliance

- `BR-1711` — Data collected is limited to what a stated feature requires. "It might be useful later" is not a reason to collect.
- `BR-1712` — The privacy policy states plainly what is collected and why, in Arabic and English (`FEAT-209`).
- `BR-1713` — Device data is used solely for access control, never for advertising or third-party sharing (`BR-385`).
- `BR-1714` — Learners can export their own notes and view their own data (`BR-202`).
- `BR-1715` — Analytics are self-hosted or first-party. No third-party tracker receives learner data (`BR-1464`).
- `BR-1716` — `DEC-55` — Egyptian PDPL and GDPR-equivalent handling are applied uniformly rather than by jurisdiction. Maintaining two standards for a solo operator guarantees one of them is wrong.

---

## 16. Security Testing

| Check | Frequency | Tool |
|---|---|---|
| Dependency vulnerabilities | Every push + weekly | `pnpm audit` · Renovate |
| Secret scanning | Every push | GitHub secret scanning |
| Static analysis | Every push | ESLint security rules · CodeQL |
| Permission matrix | Every push | Generated tests (`DEC-28`) |
| Header and TLS verification | Weekly | Automated probe |
| Backup restore | Weekly | Automated (`BR-621`) |
| Manual review of this document | Quarterly | Founder |
| External penetration test | When revenue permits | Third party |

- `BR-1717` — A critical or high vulnerability in a production dependency is patched within 7 days, or the dependency is removed.
- `BR-1718` — Security tests fail the build. They are never bypassed to unblock a release (`BR-1522`).

---

## 17. Open Questions

| ID | Question | Blocking | Owner |
|---|---|---|---|
| `OQ-25` | Should two-factor authentication be offered to learners, or only enforced for staff accounts? Staff-only is the pragmatic launch position; learner 2FA adds support load for accounts holding no financial instrument. | Phase 3 | Founder |
| `OQ-26` | Breach notification timeline — 72 hours is the GDPR standard and is adopted here. Confirm this is acceptable as a stated commitment in the privacy policy. | `FEAT-209` | Founder |

---

## 18. Approval

| Item | Status |
|---|---|
| Threat model and adversary priorities are correct | ☐ Approved |
| Accepted risks are explicitly accepted (`§1.3`) | ☐ Approved |
| Argon2id parameters and breach checking (`DEC-48`) | ☐ Approved |
| Token design and storage rules are correct | ☐ Approved |
| Four-layer authorization defense is correct | ☐ Approved |
| Separation of request and approval for sensitive operations | ☐ Approved |
| Seven-layer content protection is correct | ☐ Approved |
| Data classification and PII gating are correct | ☐ Approved |
| CSP enforced from day one (`BR-1665`) | ☐ Approved |
| Card data never touching the platform (`DEC-51`) | ☐ Approved |
| AI prompt-injection defenses (`DEC-52`) are correct | ☐ Approved |
| Retrieval scoping applied before search (`BR-1692`) | ☐ Approved |
| VPS hardening checklist is accepted and will be applied before launch | ☐ Approved |
| Incident response procedure (`DEC-54`) is accepted | ☐ Approved |
| Uniform privacy standard (`DEC-55`) is accepted | ☐ Approved |

**Next document:** `15-implementation-roadmap.md` — phased delivery plan mapping all 220 features and 134 components into sequential, shippable phases with dependencies, milestones, and exit criteria.

---

import { z } from 'zod';

/**
 * Startup environment validation (13 §9, BR-943, BR-1678).
 *
 * The application fails fast at startup when a required variable is missing or malformed,
 * rather than failing at first use in production. Zod is pinned at PH-0.3 for this and only
 * this — shared/API schema use is a Phase 1 decision (13 §18.1).
 *
 * Variables are added here by the task that introduces the dependency they configure:
 * DATABASE_URL at PH-0.6, REDIS_URL at PH-0.5. Declaring them before the service exists would
 * make the API refuse to boot for a dependency nothing yet uses.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),

  /**
   * PH-0.30. The compose stack has run Redis since PH-0.5 and nothing connected to it, so
   * `GET /health` reported ok while watching one of two dependencies (`SB-16`, `BR-892`).
   *
   * Required, not optional: unlike SENTRY_DSN this is not a credential the founder holds, it is
   * part of the local stack, and an API that boots without knowing where Redis is will report a
   * healthy Redis it never contacted.
   */
  REDIS_URL: z.string().url(),

  /**
   * PH-0.28 — the backup bucket, read by `last_backup` in `GET /health`.
   *
   * All optional, unlike `DATABASE_URL` and `REDIS_URL`. There is no bucket in development, and an
   * API that refused to boot without one would be unusable locally. The indicator reports
   * `not-configured` rather than `ok` when they are absent, which is the honest answer — see the
   * note in `backup-health.indicator.ts` for why that is not the same as healthy (`BR-892`).
   *
   * The credentials are founder-held and never committed. `.env.example` documents the shape.
   */
  R2_ENDPOINT: z.string().url().optional(),
  R2_BUCKET: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),

  /** Must match `BACKUP_PREFIX` in `scripts/backup.sh`, or the indicator reads an empty prefix. */
  BACKUP_PREFIX: z.string().min(1).default('daily'),

  // PH-0.19 — observability. FEAT-217: production defaults to info.
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  /**
   * Optional by design. SENTRY_DSN is a credential the founder holds; with it absent the tracker
   * is inert and says so at boot, rather than the API refusing to start in development for want
   * of an error reporter (BR-943 is about required secrets, and this is not one).
   */
  SENTRY_DSN: z.string().url().optional(),

  /** Release tag for log lines and Sentry grouping. Set from the image tag at PH-0.10. */
  APP_VERSION: z.string().min(1).default('0.0.0-dev'),

  /**
   * PH-1.3 — the HS256 signing key for access tokens (`14 §3.1`).
   *
   * REQUIRED with no default, and that is the point. A default would mean every deployment that
   * forgot to set it shares one publicly-known key, and tokens minted anywhere would verify
   * everywhere — the failure would be silent and total. `BR-943`: the application refuses to boot
   * rather than run on a secret nobody chose.
   *
   * 32 bytes minimum. HS256's security is bounded by key length, and a short key makes the
   * signature brute-forceable offline from a single captured token.
   */
  JWT_SECRET: z
    .string()
    .min(32, 'must be at least 32 characters — HS256 security is bounded by key length'),

  /**
   * PH-1.4 — outbound mail. `BR-1596` / `DEC-47`: no developer ever sends real email locally, so
   * these default to the MailHog sink already in `docker-compose.yml`.
   *
   * Defaulted rather than required, unlike `JWT_SECRET`, and the difference is the blast radius of
   * getting it wrong. A missing signing key means anyone can mint tokens that verify everywhere.
   * A missing SMTP host means mail fails loudly at send time against a sink already running.
   */
  SMTP_HOST: z.string().min(1).default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().int().positive().max(65535).default(1025),
  MAIL_FROM: z.string().min(1).default('Josam Academy <no-reply@josamacademy.com>'),

  /** Base URL for the links in verification and reset emails. */
  APP_URL: z.string().url().default('http://localhost:3000'),

  /**
   * PH-1.5 — Google sign-in (`14 §2.4`).
   *
   * OPTIONAL, unlike `JWT_SECRET`, and the reasoning is the same as `SENTRY_DSN`'s: these are
   * founder-held credentials for a third party, and an API that refused to boot without them
   * would be unusable in development and would take the whole application down if a Google
   * project were ever deleted. Sign-in with Google is one of three ways in (`TBL-002`), not the
   * only one.
   *
   * `GoogleOAuthService` THROWS when asked to build an authorization URL without them, rather
   * than returning a URL that cannot complete — the failure belongs at the point of use, where it
   * names the missing variable, not at boot where it blocks everything else.
   */
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  /**
   * PH-1.6 — phone OTP behind a flag (`DEC-45`).
   *
   * `BR-1596` / `DEC-47` — SMS logs to the console in development; no developer ever sends a real
   * message. The flag defaults OFF so the feature cannot reach users before the founder enables
   * it, and `SmsProvider` selects the console transport whenever the Twilio credentials are absent.
   */
  PHONE_OTP_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    // Never echo the values — only which variable failed and why (14 §, secrets discipline).
    const problems = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return parsed.data;
}

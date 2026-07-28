/**
 * BR-626 — PII, tokens, passwords and payment data are never logged, including inside error
 * payloads.
 *
 * These are Pino redaction paths. Redaction happens inside the logger rather than at each call
 * site on purpose: a rule that depends on every future call site remembering it is not a rule.
 *
 * `*` matches one level, so both `password` at the root and `body.password` need listing —
 * hence the intermediate wildcards. When a new sensitive field appears in a DTO, it is added
 * here in the same commit that adds the field.
 */
export const REDACT_PATHS: readonly string[] = [
  // Credentials in transit
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',

  // Credentials and tokens anywhere in a logged object, to two levels
  'password',
  '*.password',
  '*.*.password',
  'passwordConfirmation',
  '*.passwordConfirmation',
  'currentPassword',
  '*.currentPassword',
  'token',
  '*.token',
  '*.*.token',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'otp',
  '*.otp',
  'secret',
  '*.secret',
  'apiKey',
  '*.apiKey',

  // Payment data — never logged in any form (BR-626)
  'card',
  '*.card',
  'cardNumber',
  '*.cardNumber',
  'cvv',
  '*.cvv',
  'pan',
  '*.pan',

  // Direct PII
  'phone',
  '*.phone',
  'nationalId',
  '*.nationalId',
];

export const REDACT_CENSOR = '[redacted]';

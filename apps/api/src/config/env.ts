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

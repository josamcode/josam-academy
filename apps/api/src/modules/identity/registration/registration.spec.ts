import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { RefreshTokenRepository } from '../../../shared/database/repositories/refresh-token.repository.js';
import { UserRepository } from '../../../shared/database/repositories/user.repository.js';
import { VerificationTokenRepository } from '../../../shared/database/repositories/verification-token.repository.js';
import { IdentityFixtures } from '../../../shared/database/testing/identity-fixtures.js';
import type { EmailProvider } from '../../../shared/providers/email/email.provider.js';
import { BreachList } from '../../../shared/security/breach-list.js';
import { PasswordHasher } from '../../../shared/security/password-hasher.js';
import { RefreshTokenService } from '../tokens/refresh-token.service.js';
import { ENUMERATION_FLOOR_MS, RegistrationService } from './registration.service.js';

/**
 * `PH-1.4` — the stated output is **"enumeration-resistant responses"**, so the central spec
 * MEASURES the timing channel rather than asserting the code looks careful.
 *
 * Identical response bodies are the half everyone implements. Identical *timing* is the half that
 * leaks, and it leaks by construction: the account-exists path hashes a password (~160 ms) while
 * the does-not-exist path returns immediately. Every body can be byte-identical and the entire
 * user base still enumerable with a stopwatch.
 */

const url = process.env['DATABASE_URL'];
if (url === undefined || url === '') {
  throw new Error('DATABASE_URL is not set — this suite asserts against real rows.');
}

const fixtures = new IdentityFixtures(url);
const prisma = fixtures.client as never;

/** Captures instead of sending. MailHog is the local sink; this suite asserts on the content. */
interface Sent {
  to: string;
  subject: string;
  text: string;
}
const outbox: Sent[] = [];
const email = {
  send: async (message: Sent): Promise<void> => {
    outbox.push(message);
    await Promise.resolve();
  },
} as unknown as EmailProvider;

const users = new UserRepository(prisma);
const tokens = new VerificationTokenRepository(prisma);
const refreshTokens = new RefreshTokenService(new RefreshTokenRepository(prisma));
const service = new RegistrationService(
  users,
  tokens,
  new PasswordHasher(),
  new BreachList(),
  email,
  refreshTokens,
);

const EXISTING = 'ph14-existing@example.test';
const ABSENT = 'ph14-absent@example.test';
const GOOD_PASSWORD = 'correcthorsebattery9';

let existingUserId: string;

/** Extracts the `?token=` value from a captured email. */
function linkToken(message: Sent): string {
  return /token=([\w-]+)/.exec(message.text)?.[1] ?? '';
}

beforeAll(async () => {
  await fixtures.deleteUserByEmail(EXISTING);
  await fixtures.deleteUserByEmail(ABSENT);
  existingUserId = await fixtures.createUserWithEmail(EXISTING, 'PH-1.4 existing');
});

afterAll(async () => {
  await fixtures.deleteUserByEmail(EXISTING);
  await fixtures.deleteUserByEmail(ABSENT);
  await fixtures.disconnect();
});

beforeEach(() => {
  outbox.length = 0;
});

describe('PH-1.4 — enumeration resistance (BR-1611)', () => {
  it('registration returns an IDENTICAL response for a taken and a free address', async () => {
    const taken = await service.register({
      email: EXISTING,
      password: GOOD_PASSWORD,
      fullName: 'Someone Else',
    });
    const free = await service.register({
      email: ABSENT,
      password: GOOD_PASSWORD,
      fullName: 'New Learner',
    });
    expect(taken).toEqual(free);
    expect(taken).toEqual({ status: 'accepted' });
    await fixtures.deleteUserByEmail(ABSENT);
  });

  it('password reset returns an IDENTICAL response for a known and unknown address', async () => {
    const known = await service.requestPasswordReset(EXISTING);
    const unknown = await service.requestPasswordReset(ABSENT);
    expect(known).toEqual(unknown);
    expect(known).toEqual({ status: 'accepted' });
  });

  /**
   * The assertion the task's output actually names. Everything above passes with a completely
   * leaky implementation.
   */
  it('password reset takes INDISTINGUISHABLE time for a known and unknown address', async () => {
    const sample = async (address: string): Promise<number> => {
      const started = performance.now();
      await service.requestPasswordReset(address);
      return performance.now() - started;
    };

    // Warm the pool and the hasher so the first sample does not carry one-off cost.
    await sample(EXISTING);
    await sample(ABSENT);

    const known: number[] = [];
    const unknown: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      // Interleaved, so machine-level drift affects both series equally rather than one.
      known.push(await sample(EXISTING));
      unknown.push(await sample(ABSENT));
    }

    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    const knownMean = mean(known);
    const unknownMean = mean(unknown);
    const gap = Math.abs(knownMean - unknownMean);

    console.warn(
      `BR-1611 timing — known ${knownMean.toFixed(0)} ms · unknown ${unknownMean.toFixed(0)} ms · ` +
        `gap ${gap.toFixed(0)} ms (floor ${String(ENUMERATION_FLOOR_MS)} ms)`,
    );

    // Both must actually reach the floor: if one path overran it, the floor equalises nothing.
    expect(knownMean).toBeGreaterThanOrEqual(ENUMERATION_FLOOR_MS - 30);
    expect(unknownMean).toBeGreaterThanOrEqual(ENUMERATION_FLOOR_MS - 30);

    // The gap must be far below the ~160 ms an argon2id hash costs — that is the signal an
    // attacker would key on, and it is what an unprotected implementation shows.
    expect(gap, `timing gap ${gap.toFixed(0)} ms is an enumeration oracle`).toBeLessThan(60);
  });

  it('tells the real owner when someone tries to register their address (BR-1362)', async () => {
    await service.register({
      email: EXISTING,
      password: GOOD_PASSWORD,
      fullName: 'Impostor',
    });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.to).toBe(EXISTING);
    // …and it must not confirm a password was accepted or an account created.
    expect(outbox[0]?.text).toMatch(/already exists/i);
  });

  it('reports password problems — they leak nothing about who exists', async () => {
    const result = await service.register({
      email: ABSENT,
      password: 'short',
      fullName: 'New Learner',
    });
    expect(result.status).toBe('rejected');
    // A property of the submitted password, not of the account.
  });

  it('rejects a breached password at registration (BR-1609)', async () => {
    const result = await service.register({
      email: ABSENT,
      password: 'password123',
      fullName: 'New Learner',
    });
    expect(result.status).toBe('rejected');
    if (result.status !== 'rejected') return;
    expect(result.problems).toContainEqual({ code: 'breached' });
  });
});

describe('PH-1.4 — email verification', () => {
  it('registers, emails a link, and verifies with it', async () => {
    await service.register({ email: ABSENT, password: GOOD_PASSWORD, fullName: 'New Learner' });
    expect(outbox).toHaveLength(1);

    const token = linkToken(outbox[0]!);
    expect(token).not.toBe('');

    const verified = await service.verifyEmail(token);
    expect(verified.status).toBe('verified');

    const user = await users.findByEmail(ABSENT);
    expect(user?.emailVerifiedAt).not.toBeNull();
    await fixtures.deleteUserByEmail(ABSENT);
  });

  it('the link is SINGLE-USE (14 §3.1)', async () => {
    await service.register({ email: ABSENT, password: GOOD_PASSWORD, fullName: 'New Learner' });
    const token = linkToken(outbox[0]!);

    expect((await service.verifyEmail(token)).status).toBe('verified');
    expect((await service.verifyEmail(token)).status).toBe('invalid');
    await fixtures.deleteUserByEmail(ABSENT);
  });

  it('stores the link HASHED — a database read never yields a usable link (BR-959)', async () => {
    await service.register({ email: ABSENT, password: GOOD_PASSWORD, fullName: 'New Learner' });
    const token = linkToken(outbox[0]!);
    const rows = await fixtures.verificationRows();
    expect(rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(rows)).not.toContain(token);
    await fixtures.deleteUserByEmail(ABSENT);
  });

  it('rejects an unknown token', async () => {
    expect((await service.verifyEmail('never-issued')).status).toBe('invalid');
  });
});

describe('PH-1.4 — password reset', () => {
  it('resets, and REVOKES EVERY SESSION across every device (BR-1610)', async () => {
    // Three live sessions before the reset.
    await refreshTokens.issue({ userId: existingUserId, platform: 'web' });
    await refreshTokens.issue({ userId: existingUserId, platform: 'ios' });
    await refreshTokens.issue({ userId: existingUserId, platform: 'android' });
    expect(await fixtures.countLive(existingUserId)).toBe(3);

    await service.requestPasswordReset(EXISTING);
    const token = linkToken(outbox.at(-1)!);

    const result = await service.resetPassword(token, 'a-brand-new-secret-7');
    expect(result.status).toBe('reset');

    // The effect, not the log line (BR-1837).
    expect(await fixtures.countLive(existingUserId)).toBe(0);
  });

  it('a new request invalidates the outstanding link', async () => {
    await service.requestPasswordReset(EXISTING);
    const first = linkToken(outbox.at(-1)!);
    await service.requestPasswordReset(EXISTING);
    const second = linkToken(outbox.at(-1)!);

    expect(first).not.toBe(second);
    // A leaked older link must not survive a fresh request.
    expect((await service.resetPassword(first, 'another-new-secret-8')).status).toBe('invalid');
    expect((await service.resetPassword(second, 'another-new-secret-8')).status).toBe('reset');
  });

  /**
   * Added after a probe. Removing the `consumedAt: null` guard from the repository's `updateMany`
   * did NOT fail this suite, because the service checks `stored.consumedAt` first — so the
   * sequential path is covered twice and the guard was covered not at all.
   *
   * The guard exists for CONCURRENT redemption: two requests both read the link as unconsumed,
   * and only one `updateMany` may match a row. Without it, two people set a password from one
   * link. This is the test that makes it load-bearing.
   */
  it('is single-use under CONCURRENT redemption, not just sequentially', async () => {
    await service.requestPasswordReset(EXISTING);
    const token = linkToken(outbox.at(-1)!);

    const [a, b] = await Promise.all([
      service.resetPassword(token, 'concurrent-secret-one-1'),
      service.resetPassword(token, 'concurrent-secret-two-2'),
    ]);

    const succeeded = [a, b].filter((r) => r.status === 'reset').length;
    expect(succeeded, 'exactly one concurrent redemption may succeed').toBe(1);
  });

  it('refuses a verification token used as a reset token', async () => {
    // Purpose is checked, not just validity — otherwise a 24 h email-verify link doubles as a
    // password-reset link, which is a privilege escalation from a token with a longer life.
    await service.register({ email: ABSENT, password: GOOD_PASSWORD, fullName: 'New Learner' });
    const verifyToken = linkToken(outbox.at(-1)!);
    expect((await service.resetPassword(verifyToken, 'a-valid-password-9')).status).toBe('invalid');
    await fixtures.deleteUserByEmail(ABSENT);
  });

  it('rejects a weak or breached new password before touching the token', async () => {
    await service.requestPasswordReset(EXISTING);
    const token = linkToken(outbox.at(-1)!);

    expect((await service.resetPassword(token, 'short')).status).toBe('rejected');
    expect((await service.resetPassword(token, 'password123')).status).toBe('rejected');
    // The token survives a rejected attempt — otherwise a typo burns the link.
    expect((await service.resetPassword(token, 'a-valid-password-9')).status).toBe('reset');
  });
});

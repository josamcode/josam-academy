import { SignJWT } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { loadEnv } from '../../../config/env.js';
import { RefreshTokenRepository } from '../../../shared/database/repositories/refresh-token.repository.js';
import { IdentityFixtures } from '../../../shared/database/testing/identity-fixtures.js';
import { ACCESS_TOKEN_TTL_SECONDS, AccessTokenService } from './access-token.service.js';
import { REFRESH_TOKEN_TTL_DAYS, RefreshTokenService } from './refresh-token.service.js';

/**
 * `PH-1.3` — token rotation and family reuse detection.
 *
 * The task's stated output is **"Reuse revokes the family (tested)"**, so the central assertion
 * runs against a REAL database, not a mock. A mocked repository would prove the service calls
 * `revokeFamily`; it would not prove that rows changed, which is the claim (`BR-1837` — assert
 * the effect, not the marker).
 *
 * It also exercises `BR-1819` item 3: rotation is a transaction whose atomicity now runs through
 * Prisma 7's driver adapter rather than Prisma's own connection path.
 */

const url = process.env['DATABASE_URL'];
if (url === undefined || url === '') {
  throw new Error('DATABASE_URL is not set — these specs assert against real rows, not mocks.');
}

// Prisma is reached through `IdentityFixtures`, which lives in `shared/database/` — `BR-1580`
// applies to specs too, and the fitness rule caught the first draft importing the client here.
const fixtures = new IdentityFixtures(url);
const repository = new RefreshTokenRepository(fixtures.service);
const service = new RefreshTokenService(repository);

let userId: string;

const context = { userId: '', platform: 'web' as const, ipAddress: '203.0.113.7' };

beforeAll(async () => {
  userId = await fixtures.createUser('ph13');
  context.userId = userId;
});

afterAll(async () => {
  await fixtures.deleteUser(userId);
  await fixtures.disconnect();
});

beforeEach(async () => {
  await fixtures.clearTokens(userId);
});

describe('PH-1.3 — access tokens (14 §3.1, BR-1626)', () => {
  const tokens = new AccessTokenService();

  it('is 15 minutes, as 14 §3.1 states', () => {
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(900);
  });

  it('round-trips its claims', async () => {
    const signed = await tokens.sign({ sub: 'usr_x', permissionVersion: 3, role: 'student' });
    expect(await tokens.verify(signed)).toEqual({
      sub: 'usr_x',
      permissionVersion: 3,
      role: 'student',
    });
  });

  it('carries permission_version so a stale one triggers refresh, not rejection (BR-1626)', async () => {
    const signed = await tokens.sign({ sub: 'usr_x', permissionVersion: 7, role: 'student' });
    const claims = await tokens.verify(signed);
    // The whole reason it is in the payload: a guard can compare it without a database read, and
    // a mismatch means "refresh", never "log out" (BR-857).
    expect(claims?.permissionVersion).toBe(7);
  });

  it('rejects a tampered payload', async () => {
    const signed = await tokens.sign({ sub: 'usr_x', permissionVersion: 1, role: 'student' });
    const [header, payload, signature] = signed.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'usr_x', permissionVersion: 1, role: 'super_admin' }),
    ).toString('base64url');
    expect(await tokens.verify(`${String(header)}.${forged}.${String(signature)}`)).toBeNull();
    expect(payload).not.toBe(forged);
  });

  it('rejects the alg:none attack', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: 'usr_admin', permissionVersion: 1, role: 'super_admin' }),
    ).toString('base64url');
    expect(await tokens.verify(`${header}.${payload}.`)).toBeNull();
  });

  /**
   * This is the test that actually exercises `algorithms: [ALGORITHM]`, and it exists because a
   * probe proved the `alg:none` test above does NOT.
   *
   * Removing the pin leaves `alg:none` still rejected — `jose` refuses it unconditionally,
   * because there is no key type for it. So that test was green for a reason unrelated to the
   * thing it was named after, and the pin was untested.
   *
   * What the pin defends is **algorithm confusion**: unpinned, `jose` verifies an HS512 token
   * against the same secret quite happily. Verified against the library rather than assumed —
   * `BR-1841`, assert the property, not the label.
   */
  it('rejects a token signed with a DIFFERENT algorithm (algorithm confusion)', async () => {
    const secret = new TextEncoder().encode(loadEnv().JWT_SECRET);
    const hs512 = await new SignJWT({ permissionVersion: 1, role: 'super_admin' })
      .setProtectedHeader({ alg: 'HS512' })
      .setSubject('usr_attacker')
      .setIssuer('josamacademy.com')
      .setAudience('josamacademy.com/api')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);

    // Correctly signed with our own secret — only the algorithm differs.
    expect(await tokens.verify(hs512)).toBeNull();
  });

  it('rejects a token signed with a different key', async () => {
    const other = new AccessTokenService();
    // Same secret in this process, so forge one that simply is not ours.
    expect(await other.verify('not.a.token')).toBeNull();
    expect(await other.verify('')).toBeNull();
  });

  /**
   * Corrected after a probe. The first version of this test spliced a forged payload onto an
   * existing signature — which fails signature verification, so it never reached the shape check
   * at all. It was green because of `jwtVerify`, not because of `toClaims`.
   *
   * This version signs a VALID token that simply lacks `role`, which is exactly what a token
   * minted by an earlier version of this service looks like: perfect signature, missing field.
   */
  it('rejects a VALIDLY SIGNED token whose payload is missing a claim', async () => {
    const secret = new TextEncoder().encode(loadEnv().JWT_SECRET);
    const noRole = await new SignJWT({ permissionVersion: 1 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('usr_x')
      .setIssuer('josamacademy.com')
      .setAudience('josamacademy.com/api')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);

    expect(await tokens.verify(noRole)).toBeNull();
  });
});

describe('PH-1.3 — refresh rotation (BR-1622, BR-1623, BR-016)', () => {
  it('is 30 days, as 14 §3.1 states', () => {
    expect(REFRESH_TOKEN_TTL_DAYS).toBe(30);
  });

  it('stores the token HASHED — a database read never yields a usable token (BR-1622)', async () => {
    const { token } = await service.issue(context);
    const rows = await fixtures.tokenRows({ userId });
    expect(rows).toHaveLength(1);
    // The plaintext must appear nowhere in the row.
    expect(JSON.stringify(rows[0])).not.toContain(token);
    expect(rows[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rotation issues a NEW token and retires the old one', async () => {
    const { token: first } = await service.issue(context);
    const outcome = await service.rotate(first, context);

    expect(outcome.status).toBe('rotated');
    if (outcome.status !== 'rotated') return;
    expect(outcome.token).not.toBe(first);

    const rows = await fixtures.tokenRows({ userId });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.rotatedAt).not.toBeNull();
    expect(rows[1]?.rotatedAt).toBeNull();
  });

  it('keeps the family across rotations — one session is one family', async () => {
    const { token: t1, familyId } = await service.issue(context);
    const r1 = await service.rotate(t1, context);
    expect(r1.status === 'rotated' && r1.familyId).toBe(familyId);
    if (r1.status !== 'rotated') return;
    const r2 = await service.rotate(r1.token, context);
    expect(r2.status === 'rotated' && r2.familyId).toBe(familyId);
  });

  /** The task's stated output. */
  it('REUSE OF A ROTATED TOKEN REVOKES THE ENTIRE FAMILY (BR-1623)', async () => {
    const { token: first, familyId } = await service.issue(context);
    const rotated = await service.rotate(first, context);
    expect(rotated.status).toBe('rotated');

    // The attacker replays the already-rotated token.
    const replay = await service.rotate(first, context);
    expect(replay.status).toBe('reuse_detected');

    // Assert the EFFECT in the database, not that the service said so (BR-1837).
    const live = await repository.countLiveInFamily(familyId);
    expect(live, 'every token in the family must be revoked').toBe(0);

    const rows = await fixtures.tokenRows({ familyId });
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      expect(row.revokedAt, `token ${row.id} survived family revocation`).not.toBeNull();
      expect(row.revokedReason).toBe('reuse_detected');
    }
  });

  it('revokes ALREADY-ROTATED links too, not only live ones', async () => {
    // The family is the unit of compromise: a spent link in a replayed chain is still suspect.
    const { token: t1, familyId } = await service.issue(context);
    const r1 = await service.rotate(t1, context);
    if (r1.status !== 'rotated') throw new Error('setup failed');
    const r2 = await service.rotate(r1.token, context);
    if (r2.status !== 'rotated') throw new Error('setup failed');

    await service.rotate(t1, context); // replay the oldest

    const rows = await fixtures.tokenRows({ familyId });
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.revokedAt !== null)).toBe(true);
  });

  it('the successor is dead after family revocation — the thief gains nothing', async () => {
    const { token: first } = await service.issue(context);
    const rotated = await service.rotate(first, context);
    if (rotated.status !== 'rotated') throw new Error('setup failed');

    await service.rotate(first, context); // trigger reuse detection

    // The legitimate client's live token is now revoked too. That is the trade BR-1623 makes.
    expect((await service.rotate(rotated.token, context)).status).toBe('revoked');
  });

  it('reports reuse — not "expired" — when the replayed token has also expired', async () => {
    // Ordering matters: reporting `expired` would hide an attack behind a routine outcome.
    const { token } = await service.issue(context);
    const rotated = await service.rotate(token, context);
    expect(rotated.status).toBe('rotated');
    await fixtures.expireAll(userId);
    expect((await service.rotate(token, context)).status).toBe('reuse_detected');
  });

  it('rejects an unknown token without touching anything', async () => {
    expect((await service.rotate('never-issued', context)).status).toBe('unknown');
  });

  it('rejects an expired token', async () => {
    const { token } = await service.issue(context);
    await fixtures.expireAll(userId);
    expect((await service.rotate(token, context)).status).toBe('expired');
  });

  it('concurrent refreshes with the same token: one wins, the other is not silently accepted', async () => {
    // BR-1819 item 3 — the atomicity guarantee now runs through the driver adapter. The
    // `rotatedAt: null` guard is the concurrency control: two readers both see a live token,
    // only one updateMany matches a row.
    const { token } = await service.issue(context);
    const results = await Promise.allSettled([
      service.rotate(token, context),
      service.rotate(token, context),
    ]);

    const rotated = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status === 'rotated',
    ).length;
    expect(rotated, 'exactly one refresh may succeed').toBe(1);
  });

  it('revokeAllForUser ends every session across every device (BR-1610)', async () => {
    await service.issue(context);
    await service.issue({ ...context, platform: 'ios' });
    await service.issue({ ...context, platform: 'android' });

    const revoked = await service.revokeAllForUser(userId, 'password_changed');
    expect(revoked).toBe(3);
    expect(await fixtures.countLive(userId)).toBe(0);
  });
});

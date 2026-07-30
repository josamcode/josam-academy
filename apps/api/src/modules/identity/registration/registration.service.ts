import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { loadEnv } from '../../../config/env.js';
import { newId, newUnprefixedId } from '../../../shared/database/id.js';
import { UserRepository } from '../../../shared/database/repositories/user.repository.js';
import {
  type TokenPurpose,
  VerificationTokenRepository,
} from '../../../shared/database/repositories/verification-token.repository.js';
import { EmailProvider } from '../../../shared/providers/email/email.provider.js';
import { BreachList } from '../../../shared/security/breach-list.js';
import { PasswordHasher } from '../../../shared/security/password-hasher.js';
import {
  type PasswordRejection,
  validatePasswordStructure,
} from '../../../shared/security/password-policy.js';
import { RefreshTokenService } from '../tokens/refresh-token.service.js';

/**
 * `PH-1.4` — registration, email verification and password reset.
 *
 * ## `BR-1611` is the whole design, not a detail
 *
 * > Registration, login, and password reset return identical responses **and identical timing**
 * > regardless of whether the account exists.
 *
 * Identical *responses* is the easy half and most implementations stop there. **Identical timing
 * is the half that leaks**, and it leaks by construction rather than by oversight: the
 * "account exists" path hashes a password (~160 ms, `PH-1.2`) and sends an email; the "does not
 * exist" path returns immediately. A 160 ms difference is trivially measurable over the network,
 * so a caller can enumerate the entire user base by timing alone while every response body is
 * byte-identical.
 *
 * Two things close it, and both are needed:
 *
 *   1. **The expensive work happens on both paths.** When the account does not exist we still
 *      hash — against a throwaway value — so the CPU cost is paid either way. This is the
 *      standard defence and it is why `hashDecoy()` exists rather than an early return.
 *   2. **The response is not sent before a fixed floor elapses.** Hashing alone equalises the
 *      dominant cost but not the database round trips, which differ. `withFloor()` holds every
 *      response to a minimum duration, so variance below that floor is unobservable.
 *
 * `registration.spec.ts` MEASURES the difference rather than asserting the code looks careful.
 */

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 14 §3.1 — 24 h
const RESET_TTL_MS = 60 * 60 * 1000; //     14 §3.1 —  1 h
const TOKEN_BYTES = 32;

/**
 * The floor every enumeration-sensitive response is held to.
 *
 * Chosen ABOVE the observed cost of the slowest path (argon2id at ~161 ms plus two round trips)
 * so the floor, not the work, determines the duration. A floor below the real cost equalises
 * nothing — the slow path simply overruns it, which is the failure mode of every "add a delay"
 * mitigation that was never measured.
 */
export const ENUMERATION_FLOOR_MS = 400;

export interface RegistrationResult {
  status: 'accepted';
}

export interface ResetRequestResult {
  status: 'accepted';
}

export type VerifyResult =
  { status: 'verified'; userId: string } | { status: 'invalid' } | { status: 'expired' };

export type ResetResult =
  | { status: 'reset'; userId: string }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'rejected'; problems: PasswordRejection[] };

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly users: UserRepository,
    private readonly tokens: VerificationTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly breachList: BreachList,
    private readonly email: EmailProvider,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  /**
   * Holds a promise to a minimum duration. See the class note — without this, database round-trip
   * variance survives the decoy hash and remains measurable.
   */
  private async withFloor<T>(work: Promise<T>): Promise<T> {
    const started = performance.now();
    const result = await work;
    const remaining = ENUMERATION_FLOOR_MS - (performance.now() - started);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    return result;
  }

  /**
   * Pays the Argon2id cost on the path where there is nothing to hash.
   *
   * Hashing a constant would be cheaper for an attacker to distinguish under contention, so it
   * hashes fresh random bytes — the same work, no shared cache line, no reused salt.
   */
  private async hashDecoy(): Promise<void> {
    await this.hasher.hash(randomBytes(16).toString('hex'));
  }

  /**
   * `BR-1611` — an existing address and a new one are indistinguishable to the caller.
   *
   * Password problems ARE reported, and that is not a contradiction: they are a property of the
   * submitted password, not of the account, so returning them leaks nothing about who exists.
   */
  async register(input: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<RegistrationResult | { status: 'rejected'; problems: PasswordRejection[] }> {
    const problems = validatePasswordStructure(input.password);
    if (problems.length === 0 && this.breachList.isBreached(input.password)) {
      problems.push({ code: 'breached' });
    }
    // Returned before the floor: this path is reachable without knowing any address, so it
    // carries no enumeration signal to protect.
    if (problems.length > 0) return { status: 'rejected', problems };

    return this.withFloor(this.registerInner(input));
  }

  private async registerInner(input: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<RegistrationResult> {
    const existing = await this.users.findByEmail(input.email);

    if (existing !== null) {
      // Pay the same cost as the create path, then send a "someone tried to register" note to the
      // address that already exists. The caller cannot tell the two apart; the real owner is told
      // something happened — `BR-1362`, an email that explains rather than alarms.
      await this.hashDecoy();
      await this.email.send({
        to: input.email,
        subject: 'Someone tried to create an account with your email',
        text:
          'Someone attempted to register using this address. Your account already exists and ' +
          'nothing has changed. If this was you, sign in instead — or reset your password.',
      });
      return { status: 'accepted' };
    }

    const roleId = await this.users.findRoleIdByKey('student');
    if (roleId === null) {
      // The seeds are part of `PH-1.1`'s output. If `student` is missing, the database is not in
      // a state this application understands, and inventing a role would hide that.
      throw new Error('the `student` role is missing — PH-1.1 seeds have not run');
    }

    const userId = newId('user');
    await this.users.create({
      id: userId,
      roleId,
      email: input.email,
      fullName: input.fullName,
      passwordHash: await this.hasher.hash(input.password),
    });

    await this.issueLink(userId, input.email, 'email_verify', VERIFY_TTL_MS, {
      subject: 'Confirm your email address',
      lead: 'Confirm your email address to finish creating your Josam Academy account.',
      path: 'verify-email',
    });

    return { status: 'accepted' };
  }

  /** `BR-1611` — identical response and timing whether or not the address is registered. */
  async requestPasswordReset(email: string): Promise<ResetRequestResult> {
    return this.withFloor(this.requestPasswordResetInner(email));
  }

  private async requestPasswordResetInner(email: string): Promise<ResetRequestResult> {
    const user = await this.users.findByEmail(email);
    if (user === null) {
      // No email, but the same CPU cost. Sending "no account exists" here would be the oracle in
      // its most literal form.
      await this.hashDecoy();
      return { status: 'accepted' };
    }

    // A new request invalidates outstanding ones, so a leaked older link cannot be used later.
    await this.tokens.consumeOutstanding(user.id, 'password_reset');
    await this.hashDecoy();
    await this.issueLink(user.id, email, 'password_reset', RESET_TTL_MS, {
      subject: 'Reset your password',
      lead: 'Use the link below to set a new password. It expires in one hour.',
      path: 'reset-password',
    });

    return { status: 'accepted' };
  }

  async verifyEmail(token: string): Promise<VerifyResult> {
    const stored = await this.tokens.findByHash(hashToken(token));
    if (stored?.purpose !== 'email_verify') return { status: 'invalid' };
    if (stored.consumedAt !== null) return { status: 'invalid' };
    if (stored.expiresAt.getTime() <= Date.now()) return { status: 'expired' };
    if (!(await this.tokens.consume(stored.id))) return { status: 'invalid' };

    await this.users.markEmailVerified(stored.userId);
    return { status: 'verified', userId: stored.userId };
  }

  /** `BR-1610` — a password change revokes every refresh token across every device. */
  async resetPassword(token: string, newPassword: string): Promise<ResetResult> {
    const problems = validatePasswordStructure(newPassword);
    if (problems.length === 0 && this.breachList.isBreached(newPassword)) {
      problems.push({ code: 'breached' });
    }
    if (problems.length > 0) return { status: 'rejected', problems };

    const stored = await this.tokens.findByHash(hashToken(token));
    if (stored?.purpose !== 'password_reset') return { status: 'invalid' };
    if (stored.consumedAt !== null) return { status: 'invalid' };
    if (stored.expiresAt.getTime() <= Date.now()) return { status: 'expired' };
    if (!(await this.tokens.consume(stored.id))) return { status: 'invalid' };

    await this.users.setPassword(stored.userId, await this.hasher.hash(newPassword));

    const revoked = await this.refreshTokens.revokeAllForUser(stored.userId, 'password_reset');
    this.logger.log(
      `password reset for ${stored.userId} — revoked ${String(revoked)} session(s) (BR-1610)`,
    );

    return { status: 'reset', userId: stored.userId };
  }

  private async issueLink(
    userId: string,
    email: string,
    purpose: TokenPurpose,
    ttlMs: number,
    copy: { subject: string; lead: string; path: string },
  ): Promise<void> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    await this.tokens.create({
      id: newUnprefixedId(),
      userId,
      purpose,
      // `BR-959` — hashed at rest. A database read never yields a usable link.
      tokenHash: hashToken(token),
      target: email,
      expiresAt: new Date(Date.now() + ttlMs),
    });

    const { APP_URL } = loadEnv();
    await this.email.send({
      to: email,
      subject: copy.subject,
      text: `${copy.lead}\n\n${APP_URL}/${copy.path}?token=${token}\n`,
    });
  }
}

/**
 * Constant-time comparison for any future opaque-token check. Exported because the temptation to
 * write `a === b` is strong and the leak is real: `===` on strings returns at the first differing
 * byte, so comparison time reveals how much of a guess was correct.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

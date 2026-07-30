import { hash, verify } from '@node-rs/argon2';
import { Injectable } from '@nestjs/common';

/**
 * `BR-1606` / `BR-1607` — Argon2id, with the parameters `14 §2.1` specifies.
 *
 * ```
 * Algorithm   Argon2id
 * Memory      64 MB
 * Iterations  3
 * Parallelism 4
 * Salt        16 bytes, per-password, random
 * ```
 *
 * ## The parameters are a budget, not a preference
 *
 * `BR-1607` tunes them to ~100 ms on the production CPU: strong against offline attack, cheap
 * enough not to become a login bottleneck on 2 vCPU (`BR-859`). Both halves bind. Raising memory
 * or iterations "for safety" spends login latency the box does not have, and on a 2 vCPU machine
 * shared with five other applications it is also memory pressure — `SB-39`'s territory.
 *
 * `password-hasher.spec.ts` MEASURES the time rather than trusting these constants. A parameter
 * set that is 8× too slow still produces correct hashes and passes every functional test.
 *
 * ## Why the salt is not here
 *
 * Argon2 generates a random 16-byte salt per call and embeds it in the encoded output, along with
 * the algorithm and every parameter. That is what makes `verify` work without storing them
 * separately — and what makes changing these constants safe for existing hashes, since each hash
 * carries the parameters it was made with.
 */

/**
 * `14 §2.1`. Exported so the spec asserts against the specification, not against itself.
 *
 * `algorithm: 2` is `Algorithm.Argon2id`. The enum cannot be referenced by name: `@node-rs/argon2`
 * declares it as an AMBIENT const enum, which `isolatedModules` rejects (TS2748) because there is
 * no runtime object to read the member from. Inlining the number is the supported form.
 *
 * A bare `2` would be exactly the kind of magic constant that drifts, so it is not trusted on its
 * own — `password.spec.ts` asserts the produced hash starts with `$argon2id$`, which is the
 * algorithm the library actually used rather than the number we asked for (`BR-1837`).
 */
export const ARGON2_PARAMS = {
  algorithm: 2,
  memoryCost: 65_536, // 64 MB, in KiB
  timeCost: 3,
  parallelism: 4,
  // 16 bytes is the @node-rs/argon2 default and `14 §2.1`'s figure; stated rather than assumed.
  saltLength: 16,
} as const;

@Injectable()
export class PasswordHasher {
  /** Returns the PHC-encoded string — algorithm, parameters and salt travel with the hash. */
  async hash(password: string): Promise<string> {
    return hash(password, ARGON2_PARAMS);
  }

  /**
   * `BR-1612` — a login failure never indicates which credential was wrong, so this returns a
   * boolean and never a reason.
   *
   * A malformed or truncated stored hash returns `false` rather than throwing. The alternative
   * turns one corrupt row into a 500 that distinguishes it from a wrong password, which is an
   * enumeration oracle built out of an error handler.
   */
  async verify(storedHash: string, password: string): Promise<boolean> {
    try {
      return await verify(storedHash, password, ARGON2_PARAMS);
    } catch {
      return false;
    }
  }
}

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable, Logger, Optional } from '@nestjs/common';

/**
 * `BR-1609` / `DEC-48` — new and changed passwords are checked against a **local** k-anonymity
 * breach list.
 *
 * ## Why local, and why k-anonymity anyway
 *
 * k-anonymity exists so a password can be checked against a REMOTE corpus without sending it: you
 * send the first five hex characters of its SHA-1 and get back every suffix sharing that prefix.
 * `DEC-48` says local, which removes the privacy problem entirely — so why keep the scheme?
 *
 * Because the prefix/suffix split is also how you make the corpus queryable without loading it.
 * The full HIBP list is hundreds of millions of hashes; sharded by prefix it is 16^5 small files,
 * and a lookup touches one of them. Keeping the same shape means the local corpus can be built
 * directly from HIBP's published range files with no transformation.
 *
 * And it removes the failure mode that matters most here: **a remote check can time out**, and a
 * breach check that fails open silently stops protecting anyone while continuing to report
 * success. Local means it either has the corpus or it says so.
 *
 * ## SHA-1 is correct here, and it is not a security decision
 *
 * SHA-1 is broken for signatures. This is not a signature. It is a lookup key into a published
 * corpus that is indexed by SHA-1, and the password's confidentiality is protected by Argon2id at
 * rest, never by this hash. Using SHA-256 here would produce a key that matches nothing.
 */

export interface BreachListStatus {
  loaded: boolean;
  prefixes: number;
  hashes: number;
  productionReady: boolean;
}

/**
 * Below this, the file is truncated or malformed rather than merely small. A hard failure.
 */
export const CORPUS_MIN_HASHES = 50;

/**
 * `SB-42` — the size at which the corpus is doing the job `BR-1609` describes rather than
 * catching only the obvious passwords.
 *
 * The committed corpus is a 64-entry starter list. `password.spec.ts` used to pass identically
 * with 64 entries or 850 million, **so the test could never tell you which one you had** — the
 * mechanism ran either way. That is `BR-1841`'s shape: assert the property, not that the
 * mechanism ran.
 */
export const CORPUS_PRODUCTION_MIN_HASHES = 1_000_000;

@Injectable()
export class BreachList {
  private readonly logger = new Logger(BreachList.name);

  /** prefix (5 hex) → set of suffixes (35 hex). */
  private readonly shards = new Map<string, Set<string>>();

  private loaded = false;
  private hashCount = 0;

  /**
   * `@Optional()` is load-bearing, not decoration.
   *
   * Without it Nest sees a `String` parameter, looks for a `String` provider, finds none, and
   * **refuses to build the module graph** — `UnknownDependenciesException`. The API could not
   * boot at all from `PH-1.2` until `PH-1.6`, and nothing detected it: every spec constructs this
   * class with `new BreachList(path)` and never goes through the injector, so the container was
   * the one thing under test that was never exercised (`BR-1830`).
   *
   * `security.module.spec.ts` now boots the real module through Nest for exactly this reason.
   */
  constructor(@Optional() corpusPath?: string) {
    this.load(corpusPath ?? join(__dirname, 'breach-corpus.txt'));
  }

  private load(path: string): void {
    let raw: string;
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      // Loud, and it does NOT throw: a missing corpus must not stop the API booting, but it must
      // never be mistaken for "no passwords are breached". `status()` reports `loaded: false`,
      // and `isBreached()` refuses rather than returning false (`BR-892`, `BR-1830`).
      this.logger.error(
        `breach corpus not found at ${path} — password breach checking is UNAVAILABLE, ` +
          'not "clean". Every check will refuse until the corpus is present.',
      );
      return;
    }

    for (const line of raw.split('\n')) {
      const entry = line.trim().toUpperCase();
      // Accept HIBP's native `HASH:COUNT` form as well as a bare hash, so the corpus can be
      // concatenated from published range files without transformation.
      const hash = entry.split(':')[0] ?? '';
      if (!/^[0-9A-F]{40}$/.test(hash)) continue;

      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);
      let shard = this.shards.get(prefix);
      if (shard === undefined) {
        shard = new Set<string>();
        this.shards.set(prefix, shard);
      }
      shard.add(suffix);
      this.hashCount += 1;
    }

    this.loaded = this.hashCount >= CORPUS_MIN_HASHES;
    if (!this.loaded) {
      this.logger.error(
        `breach corpus at ${path} parsed to ${String(this.hashCount)} hashes, below the ` +
          `${String(CORPUS_MIN_HASHES)} floor — the file exists and is empty, truncated or ` +
          'malformed, which is the failure most likely to be mistaken for a working check.',
      );
      return;
    }

    // `SB-42` — loud on every boot until the real corpus lands. A gap recorded only in a status
    // file is a gap nobody reads at 3 a.m.; a gap that announces itself in the startup log is one
    // somebody notices. It is a warning rather than a refusal because 64 entries still catch
    // `password` and `123456`, which is materially better than nothing.
    if (this.hashCount < CORPUS_PRODUCTION_MIN_HASHES) {
      this.logger.warn(
        `breach corpus holds ${String(this.hashCount)} hashes — below the ` +
          `${String(CORPUS_PRODUCTION_MIN_HASHES)} production threshold (SB-42). BR-1609 is ` +
          'currently enforced against a starter list, NOT the full corpus. Load the real one ' +
          'before public registration.',
      );
    }
  }

  status(): BreachListStatus {
    return {
      loaded: this.loaded,
      prefixes: this.shards.size,
      hashes: this.hashCount,
      productionReady: this.hashCount >= CORPUS_PRODUCTION_MIN_HASHES,
    };
  }

  /**
   * Throws when the corpus is unavailable rather than answering `false`.
   *
   * This is the whole point of the class. A breach check that returns "not breached" because it
   * has nothing to check against is indistinguishable, at the call site, from one that genuinely
   * cleared the password — and it would let every known-breached password through while the
   * registration flow reported success. `PH-1.4` must decide what to do with the failure; it must
   * not be handed a reassuring answer.
   */
  isBreached(password: string): boolean {
    if (!this.loaded) {
      throw new Error(
        'breach corpus is not loaded — refusing to report a password as clean when nothing ' +
          'was checked (BR-1609).',
      );
    }

    const hash = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    return this.shards.get(hash.slice(0, 5))?.has(hash.slice(5)) === true;
  }
}

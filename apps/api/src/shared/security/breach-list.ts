import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';

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
}

@Injectable()
export class BreachList {
  private readonly logger = new Logger(BreachList.name);

  /** prefix (5 hex) → set of suffixes (35 hex). */
  private readonly shards = new Map<string, Set<string>>();

  private loaded = false;
  private hashCount = 0;

  constructor(corpusPath?: string) {
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

    this.loaded = this.hashCount > 0;
    if (!this.loaded) {
      this.logger.error(
        `breach corpus at ${path} parsed to ZERO hashes — the file exists and is empty or ` +
          'malformed, which is the failure most likely to be mistaken for a working check.',
      );
    }
  }

  status(): BreachListStatus {
    return { loaded: this.loaded, prefixes: this.shards.size, hashes: this.hashCount };
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

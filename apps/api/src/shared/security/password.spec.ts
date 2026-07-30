import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BreachList, CORPUS_MIN_HASHES, CORPUS_PRODUCTION_MIN_HASHES } from './breach-list';
import { ARGON2_PARAMS, PasswordHasher } from './password-hasher';
import { PASSWORD_MIN_LENGTH, validatePasswordStructure } from './password-policy';

describe('PH-1.2 — password policy (BR-1608 / BR-001)', () => {
  it('accepts the minimum: 8 characters with a letter and a digit', () => {
    expect(validatePasswordStructure('abcdefg1')).toEqual([]);
  });

  it('rejects 7 characters, and says the minimum', () => {
    expect(validatePasswordStructure('abcdef1')).toEqual([{ code: 'too_short', minimum: 8 }]);
  });

  it('reports EVERY problem, not the first', () => {
    // A form that reveals one problem at a time makes the user resubmit to find the next.
    expect(validatePasswordStructure('...')).toEqual([
      { code: 'too_short', minimum: PASSWORD_MIN_LENGTH },
      { code: 'needs_letter' },
      { code: 'needs_digit' },
    ]);
  });

  it('imposes NO maximum length (BR-1608)', () => {
    expect(validatePasswordStructure(`${'a'.repeat(4096)}1`)).toEqual([]);
  });

  it('imposes no composition rules beyond a letter and a digit', () => {
    // No symbol requirement, no mixed case, no "not a dictionary word". 14 §2.1: complexity
    // rules produce weaker, more predictable passwords.
    expect(validatePasswordStructure('correcthorsebatterystaple1')).toEqual([]);
  });

  describe('Arabic is a first-class input, not an edge case', () => {
    it('accepts Arabic letters as letters', () => {
      // `[a-zA-Z]` would reject this. On an Arabic-first platform that is a defect nobody on an
      // English keyboard would ever encounter.
      expect(validatePasswordStructure('كلمةالسر1')).toEqual([]);
    });

    it('accepts Eastern Arabic numerals as digits', () => {
      expect(validatePasswordStructure('كلمةالسر٧')).toEqual([]);
    });

    it('counts by code point, not UTF-16 unit', () => {
      // Four astral characters are 8 UTF-16 units. `.length` would call this 8 and pass it.
      const fourEmoji = '👍👍👍👍';
      expect(fourEmoji.length).toBe(8);
      expect(validatePasswordStructure(fourEmoji)).toContainEqual({
        code: 'too_short',
        minimum: 8,
      });
    });
  });
});

describe('PH-1.2 — Argon2id (BR-1606 / BR-1607)', () => {
  const hasher = new PasswordHasher();

  it('uses exactly the parameters 14 §2.1 specifies', () => {
    expect(ARGON2_PARAMS.memoryCost).toBe(65_536); // 64 MB in KiB
    expect(ARGON2_PARAMS.timeCost).toBe(3);
    expect(ARGON2_PARAMS.parallelism).toBe(4);
    expect(ARGON2_PARAMS.saltLength).toBe(16);
  });

  it('produces an argon2id hash carrying its own parameters', async () => {
    const encoded = await hasher.hash('correcthorse1');
    // The PHC string embeds algorithm, version, m/t/p and the salt — which is what lets these
    // constants change without invalidating existing hashes.
    expect(encoded).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=4\$/);
  });

  it('salts per password — the same input never yields the same hash', async () => {
    const [a, b] = await Promise.all([hasher.hash('correcthorse1'), hasher.hash('correcthorse1')]);
    expect(a).not.toBe(b);
    // …and both still verify. A "unique hash" that cannot be verified is a broken salt, not a salt.
    expect(await hasher.verify(a, 'correcthorse1')).toBe(true);
    expect(await hasher.verify(b, 'correcthorse1')).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const encoded = await hasher.hash('correcthorse1');
    expect(await hasher.verify(encoded, 'correcthorse2')).toBe(false);
  });

  it('returns false — never throws — on a corrupt stored hash (BR-1612)', async () => {
    // Throwing would make one corrupt row distinguishable from a wrong password: an enumeration
    // oracle built out of an error handler.
    expect(await hasher.verify('not-a-hash', 'correcthorse1')).toBe(false);
    expect(await hasher.verify('', 'correcthorse1')).toBe(false);
    expect(await hasher.verify('$argon2id$v=19$m=65536,t=3,p=4$truncated', 'x')).toBe(false);
  });

  it('costs ~100 ms — MEASURED, not assumed (BR-1607)', async () => {
    // The task's stated output. A parameter set 8x too slow produces correct hashes and passes
    // every functional test above; only the clock catches it.
    const runs = 3;
    const started = performance.now();
    for (let i = 0; i < runs; i += 1) await hasher.hash(`benchmark-${String(i)}1`);
    const each = (performance.now() - started) / runs;

    // Wide bounds deliberately. This machine is not the production CPU, and CI is slower still.
    // The assertion that matters is ORDER OF MAGNITUDE: 100 ms, not 5 ms and not 2 s. A tight
    // bound here would fail on hardware variance and teach everyone to ignore it.
    expect(each, `argon2id took ${each.toFixed(0)} ms/hash`).toBeGreaterThan(15);
    expect(each, `argon2id took ${each.toFixed(0)} ms/hash`).toBeLessThan(1500);
    console.warn(`argon2id: ${each.toFixed(0)} ms per hash (14 §2.1 targets ~100 ms)`);
  });
});

describe('PH-1.2 — breach list (BR-1609 / DEC-48)', () => {
  const list = new BreachList();

  it('loaded a corpus — the check is not silently empty', () => {
    const status = list.status();
    expect(status.loaded).toBe(true);
    expect(status.hashes).toBeGreaterThanOrEqual(CORPUS_MIN_HASHES);
    expect(status.prefixes).toBeGreaterThan(0);
  });

  /**
   * `SB-42`. Until this assertion existed, THIS SUITE PASSED IDENTICALLY with 64 hashes or with
   * 850 million — the mechanism ran either way, so no test could tell you which corpus you had.
   * `BR-1841`: assert the property, not that the mechanism ran.
   *
   * It is written INVERTED on purpose. Asserting `productionReady === true` would fail today and
   * leave the repository permanently red for a deferral that was deliberate, which teaches people
   * to ignore a failing test — the worst outcome available. Written this way it is green now and
   * **turns red the moment the real corpus lands**, forcing whoever loads it to come here, flip
   * the expectation, and confirm the number rather than assuming it.
   *
   * The gap is therefore visible in three places that are hard to miss: this test's name, a
   * `logger.warn` on every boot, and the count printed below.
   */
  it('is NOT yet production-ready — 64-entry starter list, not the full corpus (SB-42)', () => {
    const { hashes, productionReady } = list.status();
    console.warn(
      `SB-42: breach corpus holds ${String(hashes)} hashes; production threshold is ` +
        `${String(CORPUS_PRODUCTION_MIN_HASHES)}. When you load the real corpus this test ` +
        'FAILS by design — invert it then, and record the new count.',
    );
    expect(
      productionReady,
      'The corpus now meets the production threshold. That is good news: flip this assertion ' +
        'to true, close SB-42, and record the real hash count.',
    ).toBe(false);
    expect(hashes).toBeLessThan(CORPUS_PRODUCTION_MIN_HASHES);
  });

  it('rejects known-breached passwords', () => {
    for (const breached of ['password', '123456', 'qwerty', 'letmein', 'password123']) {
      expect(list.isBreached(breached), `${breached} should be breached`).toBe(true);
    }
  });

  it('passes a password that is not in the corpus', () => {
    expect(list.isBreached('غير-مخترقة-كلمة-السر-1234')).toBe(false);
  });

  it('is case-sensitive about the PASSWORD, not the hash', () => {
    // "Password" and "password" are different passwords and hash differently. The hex comparison
    // is case-insensitive by normalisation; the input never is.
    expect(list.isBreached('password')).toBe(true);
    expect(list.isBreached('PaSsWoRd')).toBe(false);
  });

  it('REFUSES rather than reporting clean when the corpus is missing (BR-1830)', () => {
    const missing = new BreachList(join(__dirname, 'no-such-corpus.txt'));
    expect(missing.status().loaded).toBe(false);

    // The failure this guards against: returning `false` here is indistinguishable at the call
    // site from a password that genuinely cleared, and would let every breached password through
    // while registration reported success.
    expect(() => missing.isBreached('password')).toThrow(/refusing to report a password as clean/);
  });

  it('treats a corpus below the integrity floor as unavailable, not as clean', () => {
    // A file that exists and parses to nothing is the failure most easily mistaken for a working
    // check — it has none of the symptoms of a missing file.
    const empty = new BreachList(join(__dirname, 'password-policy.ts'));
    expect(empty.status().loaded).toBe(false);
    expect(() => empty.isBreached('password')).toThrow();
  });
});

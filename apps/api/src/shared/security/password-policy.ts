/**
 * `BR-1608` / `BR-001` — password policy.
 *
 * Minimum 8 characters, at least one letter and one digit. **No composition rules beyond that,
 * and no maximum length.**
 *
 * The absence of rules is the design, not an omission. `14 §2.1` states the reason plainly:
 * complexity requirements produce weaker, more predictable passwords — they push people toward
 * `Password1!` and away from a long passphrase. Anything added here (a symbol requirement, a
 * 64-character cap, a "no repeated characters" rule) makes the corpus smaller and more guessable
 * while feeling stricter.
 *
 * A maximum length in particular is an active harm: it is usually a symptom of storing the
 * password rather than a hash of it, and Argon2id consumes arbitrary-length input.
 */

/** Machine-readable, so `PH-1.4` can map a reason to a translated string (`BR-525`). */
export type PasswordRejection =
  | { code: 'too_short'; minimum: number }
  | { code: 'needs_letter' }
  | { code: 'needs_digit' }
  | { code: 'breached' };

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Structural validation only. The breach check is separate and asynchronous — see
 * `BreachList` — because one is a pure predicate and the other reads a corpus off disk.
 *
 * Returns EVERY reason, not the first. A form that reveals one problem at a time makes the user
 * resubmit to discover the next, and `12`'s form contract shows all errors at once.
 */
export function validatePasswordStructure(password: string): PasswordRejection[] {
  const problems: PasswordRejection[] = [];

  // Count by code point, not by UTF-16 unit. `length` on a string of emoji or of characters
  // outside the BMP over-counts, so `"👍👍👍👍"` would pass an 8-character minimum with 4
  // characters. Arabic combining marks make the same mistake reachable with ordinary text.
  const codePoints = [...password].length;
  if (codePoints < PASSWORD_MIN_LENGTH) {
    problems.push({ code: 'too_short', minimum: PASSWORD_MIN_LENGTH });
  }

  // `\p{L}` rather than `[a-zA-Z]` — an Arabic-first platform whose password rule silently
  // rejected Arabic letters would be a defect nobody on an English keyboard would ever see.
  if (!/\p{L}/u.test(password)) problems.push({ code: 'needs_letter' });

  // `\p{Nd}` covers Eastern Arabic numerals (٠-٩) as well as 0-9, for the same reason.
  if (!/\p{Nd}/u.test(password)) problems.push({ code: 'needs_digit' });

  return problems;
}

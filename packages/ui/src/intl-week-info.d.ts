/**
 * `Intl.Locale.prototype.getWeekInfo` — shipped in every browser this product targets and in
 * Node 24, but not yet declared in TypeScript's `lib`. Without this, the call resolves to `error`
 * and every use of the result is an unsafe member access under `BR-1579`.
 *
 * **Why this is a `.d.ts` and not a `declare global` inside `calendar.ts`.** Augmenting a global
 * requires the `namespace` keyword — there is no module syntax for it — and
 * `@typescript-eslint/no-namespace` rejects that in ordinary source. The first thing I reached for
 * was an `eslint-disable`, which `BR-1512` prohibits and which would have silenced a rule that was
 * telling the truth: a namespace in application code usually *is* wrong. The rule allows
 * definition files precisely because an ambient declaration is the legitimate exception, so moving
 * the declaration to where it belongs removes the conflict instead of muting it (`SB-20`).
 *
 * `getWeekInfo` is optional because it is genuinely absent on older engines; `firstDayOfWeek`
 * falls back to Sunday rather than throwing. Delete this file when `lib` declares the method — the
 * two declarations will conflict and say so.
 */
declare namespace Intl {
  interface Locale {
    getWeekInfo?: () => { firstDay: number; weekend: number[]; minimalDays: number };
  }
}

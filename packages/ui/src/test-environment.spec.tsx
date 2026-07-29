// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

/**
 * Guards the `jsdom@30.0.0` patch in `patches/jsdom@30.0.0.patch`.
 *
 * ## The defect
 *
 * `lib/jsdom/living/css/helpers/font-sizes.js` destructured `FONT_SIZE_REGEXP.exec(resolvedSize)`
 * with no null check. `resolveCalc()` cannot reduce a `calc()` containing a percentage — that needs
 * a containing block, and jsdom has no layout engine — so the regexp does not match, `exec` returns
 * `null`, and the destructuring throws:
 *
 *     TypeError: object null is not iterable (cannot read property Symbol(Symbol.iterator))
 *
 * It throws from `getComputedStyle` itself, so it takes down the **whole element's** computed
 * style, not one property. `@testing-library`'s `isInaccessible` and `axe-core` both call
 * `getComputedStyle` while walking the tree, which means a single such value makes every role query
 * and every axe run over that tree crash.
 *
 * `PH-0.24` hit it because Radix positions the `Slider` thumb with
 * `left: calc(<percent>% + <offset>px)`. Six specs failed with a stack ending in jsdom, not in our
 * code (`SB-26`).
 *
 * ## Why this file exists
 *
 * A patched dependency is invisible: it lives in `patches/`, applies at install, and leaves no
 * trace at the call site. Drop the patch, reinstall on a machine that skips it, or bump jsdom to a
 * version the patch no longer applies cleanly to, and the six specs it rescued start failing again
 * with a stack trace pointing into `node_modules` — which is the least legible place for a failure
 * to surface. This test fails *first*, on the actual defect, with the reason attached.
 *
 * `BR-1830` — the patch is a mechanism, and an unproven mechanism is not a mechanism. Proven by
 * deliberate reversal: restoring the original two lines turns this file red.
 *
 * Delete this file and the patch together when jsdom ships the fix upstream (`SB-26`).
 */
describe('jsdom patch — getComputedStyle survives calc() with a percentage', () => {
  function computed(css: string, property: string): string {
    document.body.innerHTML = `<span style="${css}"></span>`;
    const element = document.querySelector('span');
    if (element === null) throw new Error('probe element missing');
    return window.getComputedStyle(element).getPropertyValue(property);
  }

  it.each([
    // The exact shape Radix Slider emits for its thumb.
    ['left', 'left: calc(33.3333% + 0px);'],
    ['width', 'width: calc(50% + 4px);'],
    // Logical properties matter here too: BR-1232 means our own CSS reaches for these by default.
    ['margin-inline-start', 'margin-inline-start: calc(50% + 4px);'],
    ['inset-inline-start', 'inset-inline-start: calc(100% - 8px);'],
  ])('%s does not throw', (property, css) => {
    expect(() => computed(css, property)).not.toThrow();
  });

  it('still resolves a calc() it CAN reduce, so the guard did not swallow the happy path', () => {
    // 10px + 5px needs no containing block, so jsdom must still return a real computed value
    // rather than falling through to the as-is fallback the guard added.
    expect(computed('left: calc(10px + 5px);', 'left')).toBe('15px');
  });
});

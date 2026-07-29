import AxeBuilder from '@axe-core/playwright';
import type { TestRunnerConfig } from '@storybook/test-runner';

/**
 * `PH-0.30` — criterion 6 of `15 §Phase 0`: **every story passes axe in both themes and both
 * directions**, automated rather than interactive.
 *
 * ## Why a real browser, and not the jsdom sweep the specs already use
 *
 * The component specs run axe in jsdom, once per component, with `color-contrast` disabled. That
 * was recorded as a **fail** against this criterion, and extending those specs to four
 * combinations would not have fixed it. Measured before choosing:
 *
 * ```
 * themeChangesDom: false
 * dirChangesDom:   false
 * ```
 *
 * Neither `data-theme` nor `dir` changes the rendered DOM. **The entire difference between the
 * four combinations is CSS** — which jsdom does not apply, having no layout engine and no
 * stylesheet loaded in the spec environment. A four-combination loop in jsdom asserts the same
 * markup four times and reports four passes. That is `BR-1830`'s exact shape: a mechanism that
 * runs, reports healthy, and distinguishes nothing.
 *
 * So the sweep runs where the difference is real: Chromium, with the built stylesheet, over the
 * actual stories. `test-storybook` is also the only mechanism that tests the unit the criterion
 * names — a **story**, not a component rendered by a spec's own harness.
 *
 * ## Contrast
 *
 * `color-contrast` is **enabled here**, and this is the only place it can honestly run: it needs
 * resolved colours and real geometry. It is not a replacement for `packages/tokens/src/color.spec.ts`,
 * which pins the token pairs' ratios directly and remains the authority (`SB-18`) — that proves
 * the palette, this proves the palette as actually composed on a page.
 *
 * ## Why the globals are set on the document rather than through the URL
 *
 * Re-navigating per combination would mean four page loads per story. Setting the attributes the
 * decorator sets is the same end state and lets one visit cover all four. The attributes are the
 * whole mechanism — `apps/web/.storybook/preview.ts` sets exactly these three, and the stylesheet
 * keys off `:root[data-theme]`.
 *
 * Behavioural direction differences — arrow keys reversing in RTL — are not covered here and are
 * not meant to be. Those are asserted in the component specs as explicit four-case tables
 * (`DatePicker`, `Tabs`, `TopBar`, `BottomNav`).
 */

interface Combination {
  theme: 'dark' | 'light';
  locale: 'ar' | 'en';
  dir: 'rtl' | 'ltr';
}

/**
 * Direction follows from locale rather than being chosen independently (`BR-1237`), so these are
 * the four combinations the product can actually produce — not the six a free choice would allow.
 */
const COMBINATIONS: Combination[] = [
  { theme: 'dark', locale: 'ar', dir: 'rtl' },
  { theme: 'light', locale: 'ar', dir: 'rtl' },
  { theme: 'dark', locale: 'en', dir: 'ltr' },
  { theme: 'light', locale: 'en', dir: 'ltr' },
];

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    const failures: string[] = [];

    for (const { theme, locale, dir } of COMBINATIONS) {
      await page.evaluate(
        ([nextTheme, nextLocale, nextDir]: string[]) => {
          document.documentElement.setAttribute('data-theme', nextTheme ?? 'dark');
          document.documentElement.setAttribute('lang', nextLocale ?? 'ar');
          document.documentElement.setAttribute('dir', nextDir ?? 'rtl');
        },
        [theme, locale, dir],
      );

      // A frame for the style recalculation to land before axe reads computed colours.
      await page.waitForTimeout(50);

      const results = await new AxeBuilder({ page })
        .include('#storybook-root')
        // `region` expects every node inside a landmark. A story renders one component with no
        // page around it, so the rule reports the absence of a shell that is not the story's job.
        // `AppShell`'s own landmark structure is asserted in `layout.spec.tsx` with `region` ON.
        .disableRules(['region'])
        .analyze();

      for (const violation of results.violations) {
        const where = violation.nodes
          .slice(0, 2)
          .map((node) => {
            const check = [...(node.any ?? []), ...(node.all ?? [])][0];
            const d = (check?.data ?? {}) as {
              fgColor?: string;
              bgColor?: string;
              contrastRatio?: number;
            };
            const detail =
              d.contrastRatio === undefined
                ? ''
                : ` fg=${d.fgColor ?? '?'} bg=${d.bgColor ?? '?'} ratio=${String(d.contrastRatio)}`;
            return `${node.target.join(' ')}${detail}`;
          })
          .join('\n        ');
        failures.push(
          `${theme}/${locale} (${dir})  ${violation.id} [${violation.impact ?? 'unknown'}]  ${violation.help}\n        ${where}`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `axe violations in ${context.id}\n\n  ` +
          failures.join('\n  ') +
          '\n\nBR-1571 — every story passes axe in both themes and both directions.',
      );
    }
  },
};

export default config;

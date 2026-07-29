import { directionOf, type Locale, LOCALES } from '@josam/i18n';
import type { Decorator, Preview } from '@storybook/nextjs-vite';

import '../app/globals.css';

/**
 * BR-1570 — every story renders in both themes and both directions via toolbar toggles.
 *
 * Direction is chosen by **locale**, not by picking `rtl`/`ltr` directly. Direction is a
 * consequence of language (`directionOf` in `@josam/i18n`, `BR-1237`), and a toolbar offering
 * them independently would make it possible to sign a story off in a combination the product can
 * never produce — Arabic-with-LTR.
 */
export const globalTypes = {
  theme: {
    description: 'Colour theme (12 §3)',
    toolbar: {
      title: 'Theme',
      icon: 'contrast',
      items: [
        { value: 'dark', title: 'Dark' },
        { value: 'light', title: 'Light' },
      ],
      dynamicTitle: true,
    },
  },
  locale: {
    description: 'Locale — direction follows from it (BR-1237)',
    toolbar: {
      title: 'Locale',
      icon: 'globe',
      items: [
        { value: 'ar', title: 'العربية · RTL' },
        { value: 'en', title: 'English · LTR' },
      ],
      dynamicTitle: true,
    },
  },
};

export const initialGlobals = {
  // Arabic and dark are the defaults because they are the product's defaults. A story only ever
  // opened in English-light is a story whose Arabic rendering nobody has actually looked at.
  theme: 'dark',
  locale: 'ar',
};

export const withThemeAndDirection: Decorator = (Story, context) => {
  const theme = String(context.globals['theme'] ?? 'dark');
  const raw = String(context.globals['locale'] ?? 'ar');
  const locale: Locale = (LOCALES as readonly string[]).includes(raw) ? (raw as Locale) : 'ar';

  // `data-theme` goes on the document root, matching how the tokens resolve in the real app:
  // the stylesheet keys off `:root[data-theme]`, so setting it on a wrapper would silently do
  // nothing and every story would render in the default theme regardless of the toolbar.
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', directionOf(locale));
  }

  return Story();
};

const preview: Preview = {
  decorators: [withThemeAndDirection],
  parameters: {
    // BR-1571 — accessibility checks run on every story. `error`, not `warn`.
    a11y: { test: 'error' },
  },
};

export default preview;

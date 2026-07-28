/**
 * `@josam/i18n` — AR/EN catalogs, Arabic six-form plurals, and locale-aware formatting.
 *
 * `BR-523` — no user-facing string is hardcoded; every string lives here, including error
 * messages and email subjects. `BR-524` — Arabic is the source of truth and defines the key
 * space, so a missing Arabic string cannot compile. `BR-525` — all six CLDR forms.
 * `BR-526` — dates, numbers and currency go through `Intl`, never manual string building.
 */
export {
  DEFAULT_LOCALE,
  DEFAULT_NUMBERING_SYSTEM,
  type Direction,
  directionOf,
  intlLocale,
  isLocale,
  type Locale,
  LOCALES,
} from './locale.js';

export {
  type Catalog,
  type Message,
  type PluralForms,
  pluralRulesFor,
  selectPlural,
} from './message.js';

export { ar, type MessageKey } from './catalogs/ar.js';
export { en } from './catalogs/en.js';

export { interpolate, translate, type TranslateParams, translator } from './translate.js';

export { formatDate, formatMoney, formatNumber, formatPercent } from './format.js';

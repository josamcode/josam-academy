/**
 * Catalog fitness functions (PH-0.16, `09 §enforcement`, `12 §19`).
 *
 * Two checks ESLint cannot do, because both are properties of the catalog as a whole rather than
 * of any one file:
 *
 *   BR-811 / BR-1365 — the prohibited-language list from `07 §7.1` never appears on any
 *   learner-facing surface, in any language.
 *
 *   BR-524 — every English key has an Arabic source. Arabic is the source of truth.
 *
 * Run: pnpm check:catalogs
 */
import { ar, en } from '../packages/i18n/dist/index.js';

/**
 * `07 §7.1`. Every message encourages or informs; never guilts (`PRIN-02`).
 *
 * Matched as whole words so that a legitimate substring cannot trip the check — Arabic in
 * particular attaches prefixes, so a naive `includes` would fire on unrelated words.
 */
const PROHIBITED = [
  {
    category: 'Failure',
    reason: "Confirms PERS-01's core fear",
    terms: ['failed', 'رسبت', 'فشلت'],
  },
  {
    category: 'Deficit',
    reason: 'Discourages exactly when engagement is fragile',
    terms: ["you're behind", 'you are behind', 'أنت متأخر', 'متأخر', 'فاتك'],
  },
  {
    category: 'Absence',
    reason: 'Reads as surveillance',
    terms: ['inactive', 'غير نشط', 'مش بتدخل'],
  },
  {
    category: 'Denial',
    reason: 'Contradicts PRIN-01',
    terms: ['denied', 'forbidden', 'no permission', 'ممنوع', 'مش مسموح'],
  },
  {
    category: 'Blame',
    reason: 'Assigns fault',
    terms: ['you should have', 'كان لازم', 'للأسف إنت'],
  },
  {
    category: 'Loss',
    reason: 'Frames a recoverable state as permanent',
    terms: ['you lost', 'انتهى', 'خسرت'],
  },
];

/** Every renderable string in a catalog entry, plural forms included. */
function* strings(catalog, locale) {
  for (const [key, message] of Object.entries(catalog)) {
    if (typeof message === 'string') {
      yield { locale, key, form: null, text: message };
      continue;
    }
    for (const [form, text] of Object.entries(message)) {
      if (typeof text === 'string') yield { locale, key, form, text };
    }
  }
}

const failures = [];

// --- BR-811 / BR-1365 -------------------------------------------------------------------
for (const [locale, catalog] of [
  ['ar', ar],
  ['en', en],
]) {
  for (const entry of strings(catalog, locale)) {
    const haystack = entry.text.toLowerCase();
    for (const { category, reason, terms } of PROHIBITED) {
      for (const term of terms) {
        const needle = term.toLowerCase();
        // Latin terms are matched on word boundaries; Arabic has no case and its boundaries are
        // whitespace and punctuation, so a contains-check on a whitespace-delimited token is the
        // honest equivalent.
        const hit = /[a-z]/.test(needle)
          ? new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(haystack)
          : haystack.split(/[\s.,!?،؛:"'()—–-]+/).some((token) => token === needle);

        if (hit) {
          failures.push(
            `BR-811  ${entry.locale}["${entry.key}"]${entry.form ? `.${entry.form}` : ''} ` +
              `contains prohibited ${category} language: "${term}" — ${reason}`,
          );
        }
      }
    }
  }
}

// --- BR-524 -----------------------------------------------------------------------------
const arabicKeys = new Set(Object.keys(ar));
for (const key of Object.keys(en)) {
  if (!arabicKeys.has(key)) {
    failures.push(`BR-524  en["${key}"] has no Arabic source. Arabic is the source of truth.`);
  }
}

for (const key of Object.keys(ar)) {
  const message = ar[key];
  const empty =
    typeof message === 'string'
      ? message.trim() === ''
      : Object.values(message).some((v) => typeof v === 'string' && v.trim() === '');
  if (empty) {
    failures.push(`BR-524  ar["${key}"] is empty. A blank Arabic string is a missing one.`);
  }
}

// ----------------------------------------------------------------------------------------
if (failures.length > 0) {
  console.error(`\ncheck-catalogs: ${String(failures.length)} violation(s)\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error('');
  process.exit(1);
}

const total = [...strings(ar, 'ar')].length + [...strings(en, 'en')].length;
console.log(`check-catalogs: ${String(total)} strings checked, no violations (BR-811, BR-524).`);

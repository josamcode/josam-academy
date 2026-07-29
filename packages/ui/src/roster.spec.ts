import { describe, expect, it } from 'vitest';

import * as surface from './index.js';

/**
 * `PH-0.30` — criterion 5 of `15 §Phase 0`: **all 69 Wave 1 components**, checked rather than
 * counted.
 *
 * The Phase 0 report had to say "69/69, but that is a count I did, not a gate". A number a person
 * arrived at by reading a list is a number that drifts the first time somebody renames a component
 * or forgets to export one, and it drifts silently — every other test still passes, because every
 * other test imports what it needs directly rather than through the package surface.
 *
 * This asserts the roster in `12 §20.12.1` against what `@josam/ui` actually exports. It fails in
 * both directions on purpose: a missing component and an undeclared extra are both wrong, the
 * second because it means the roster stopped describing the library.
 */

/** `12 §20.12.1`, verbatim. Editing this list is editing the roster, which is a founder decision. */
const WAVE_1 = {
  primitives: ['Text', 'Heading', 'Stack', 'Inline', 'Grid', 'Box', 'Icon', 'Surface'],
  architectural: ['T', 'Bidi', 'Money', 'Num', 'Percent', 'Duration', 'When', 'CopyableId'],
  controls: ['Button', 'IconButton'],
  form: ['Form', 'FormField'],
  fields: [
    'TextField',
    'TextArea',
    'PasswordField',
    'NumberField',
    'CurrencyField',
    'CodeField',
    'PhoneField',
    'EmailField',
    'OTPField',
    'Select',
    'Combobox',
    'MultiSelect',
    'RadioGroup',
    'RadioCard',
    'Checkbox',
    'Switch',
    'Slider',
    'TagsInput',
    'RatingInput',
    'DatePicker',
    'DurationField',
    'TimestampField',
    'FileDrop',
    'ImageDrop',
  ],
  layout: [
    'AppShell',
    'TopBar',
    'SideNav',
    'BottomNav',
    'PageHeader',
    'PageFooter',
    'Breadcrumb',
    'Tabs',
    'SkipLink',
  ],
  feedback: [
    'Toast',
    'InlineAlert',
    'Dialog',
    'ConfirmDialog',
    'Drawer',
    'Popover',
    'Tooltip',
    'DropdownMenu',
    'Skeleton',
    'ProgressBar',
    'ProgressRing',
    'EmptyState',
    'ErrorState',
    'OfflineBanner',
    'ReadOnlyBanner',
    'QueryBoundary',
  ],
} as const;

const ROSTER = Object.values(WAVE_1).flat();

/**
 * Exports that are deliberately not components: hooks, helpers, constants and pure functions.
 * Listed explicitly rather than filtered by a naming heuristic — "starts with a capital" would
 * quietly let a missing component hide behind a type export.
 */
const NON_COMPONENTS = new Set([
  'JOSAM_FORM_OPTIONS',
  'useFormField',
  'useFieldControl',
  'useSubmitLock',
  'useToast',
  'useDisclosure',
  'ToastProvider',
  'MIN_TOAST_DURATION_MS',
  'APP_SHELL_MAIN_ID',
  'FILE_SIGNATURES',
  'availability',
  'sniffMimeType',
  'validateFile',
  'formatBytes',
  'cropRectFor',
  'matchesAspect',
  'formatDuration',
  'parseDuration',
  'addDays',
  'addMonths',
  'daysInMonth',
  'firstDayOfWeek',
  'hijriLabel',
  'isIsoDate',
  'monthGrid',
  'toIso',
  'weekdayNames',
]);

describe('BR-1571 / 12 §20.12.1 — the Wave 1 roster', () => {
  it('declares exactly 69 components', () => {
    // The number is in the specification and in the exit criteria. If the roster above is edited,
    // this is the assertion that makes the edit deliberate.
    expect(ROSTER).toHaveLength(69);
  });

  it('lists no component twice', () => {
    expect(new Set(ROSTER).size).toBe(ROSTER.length);
  });

  it.each(ROSTER)('%s is exported from @josam/ui', (name) => {
    // BR-1524 — feature code imports from @josam/ui only, so "exists" means "exported from here".
    expect(Object.keys(surface)).toContain(name);
  });

  it('exports no component the roster does not declare', () => {
    const declared = new Set<string>(ROSTER);
    const undeclared = Object.keys(surface).filter(
      (name) => !declared.has(name) && !NON_COMPONENTS.has(name) && /^[A-Z]/.test(name.charAt(0)),
    );
    // An extra export is not harmless: it means the roster has stopped describing the library, and
    // the roster is what the exit criterion counts.
    expect(undeclared).toEqual([]);
  });
});

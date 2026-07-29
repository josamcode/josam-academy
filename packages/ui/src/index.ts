/**
 * `@josam/ui` — the component library. `BR-1524`: feature code imports from here only.
 * `BR-1575`: this package depends on no app.
 *
 * PH-0.17 ships the eight primitives. Everything above them composes these (`BR-1534`).
 */
export {
  Text,
  type TextAlign,
  type TextProps,
  type TextTone,
  type TextWeight,
} from './primitives/Text.js';
export { Heading, type HeadingLevel, type HeadingProps } from './primitives/Heading.js';
export { Icon, type IconProps, type IconSize } from './primitives/Icon.js';
export {
  type Align,
  Box,
  type BoxProps,
  Grid,
  type GridColumns,
  type GridProps,
  Inline,
  type InlineProps,
  type Justify,
  Stack,
  type StackProps,
  Surface,
  type SurfaceBorder,
  type SurfaceLevel,
  type SurfaceProps,
} from './primitives/layout.js';

/**
 * Architectural components (PH-0.18, `12 §20.6`). Not visual — they are what keep every screen
 * correct: bilingual fields, bidi isolation, and every number a learner reads.
 */
export { Bidi, type BidiProps, type BilingualValue, T, type TProps } from './architectural/text.js';
export {
  Duration,
  type DurationProps,
  Money,
  type MoneyProps,
  Num,
  type NumProps,
  Percent,
  type PercentProps,
} from './architectural/format.js';
export { When, type WhenFormat, type WhenProps } from './architectural/When.js';
export { CopyableId, type CopyableIdProps } from './architectural/CopyableId.js';

/** Controls (PH-0.20). `BR-1350` — never a second Button; extend these or raise the gap. */
export {
  Button,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
  type DisabledState,
  IconButton,
  type IconButtonProps,
} from './controls/Button.js';

/**
 * Form infrastructure (PH-0.21). `FormField` owns label, hint, required marker, error and the
 * ARIA wiring; every field from PH-0.22 onward consumes `useFieldControl`.
 */
export { Form, type FormProps, JOSAM_FORM_OPTIONS, useSubmitLock } from './form/Form.js';
export {
  FormField,
  type FormFieldContextValue,
  type FormFieldProps,
  useFieldControl,
  useFormField,
} from './form/FormField.js';

/** Text fields (PH-0.22). All six consume `useFieldControl`, so the ARIA wiring is FormField's. */
export {
  CodeField,
  type CodeFieldProps,
  CurrencyField,
  type CurrencyFieldProps,
  NumberField,
  type NumberFieldProps,
  PasswordField,
  type PasswordFieldProps,
  TextArea,
  type TextAreaProps,
  TextField,
  type TextFieldProps,
} from './fields/text-fields.js';

/** Identity fields (PH-0.23). All three are LTR-isolated whatever the interface direction. */
export {
  EmailField,
  type EmailFieldProps,
  OTPField,
  type OTPFieldProps,
  PhoneField,
  type PhoneFieldProps,
} from './fields/identity-fields.js';

/**
 * Choice fields (PH-0.24). Radix-backed where Radix has the primitive; built to the WAI-ARIA
 * patterns where it does not. BR-1528 — no Radix type appears in any prop, and nothing Radix is
 * re-exported from this package.
 */
export {
  Checkbox,
  type CheckboxProps,
  type ChoiceOption,
  RadioCard,
  type RadioCardProps,
  RadioGroup,
  type RadioGroupProps,
  Slider,
  type SliderProps,
  Switch,
  type SwitchProps,
} from './fields/choice-toggles.js';
export {
  Combobox,
  type ComboboxProps,
  MultiSelect,
  type MultiSelectProps,
  RatingInput,
  type RatingInputProps,
  Select,
  type SelectProps,
  TagsInput,
  type TagsInputProps,
} from './fields/choice-composites.js';

/**
 * Time and file fields (PH-0.25). None is a Radix primitive — Radix has no date picker or file
 * input — so each owns its keyboard contract outright.
 */
export {
  DatePicker,
  type DatePickerProps,
  DurationField,
  type DurationFieldProps,
  formatDuration,
  parseDuration,
  TimestampField,
  type TimestampFieldProps,
} from './fields/time-fields.js';
export {
  FileDrop,
  type FileDropLabels,
  type FileDropProps,
  ImageDrop,
  type ImageDropProps,
} from './fields/file-fields.js';
export {
  type AcceptCriteria,
  type CropRect,
  cropRectFor,
  FILE_SIGNATURES,
  formatBytes,
  matchesAspect,
  type RejectionReason,
  type Size,
  sniffMimeType,
  validateFile,
} from './fields/file-validation.js';
export {
  addDays,
  addMonths,
  type CalendarDay,
  daysInMonth,
  firstDayOfWeek,
  hijriLabel,
  isIsoDate,
  type IsoDate,
  monthGrid,
  toIso,
  weekdayNames,
} from './fields/calendar.js';

/**
 * Layout and navigation (PH-0.26). `PageHeader` owns the page's single `h1` and accepts exactly
 * one `primaryAction` — a second is a type error, not a review comment (BR-1548, BR-1549).
 */
export { AppShell, APP_SHELL_MAIN_ID, type AppShellProps } from './layout/AppShell.js';
export {
  Breadcrumb,
  type BreadcrumbItem,
  type BreadcrumbProps,
  SkipLink,
  type SkipLinkProps,
} from './layout/Breadcrumb.js';
export {
  PageFooter,
  type PageFooterProps,
  PageHeader,
  type PageHeaderProps,
  type PrimaryAction,
  type SecondaryAction,
} from './layout/PageHeader.js';
export {
  BottomNav,
  type BottomNavProps,
  type NavItem,
  SideNav,
  type SideNavProps,
  type TabItem,
  Tabs,
  type TabsProps,
  TopBar,
  type TopBarProps,
} from './layout/navigation.js';

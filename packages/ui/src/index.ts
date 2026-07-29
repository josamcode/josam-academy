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

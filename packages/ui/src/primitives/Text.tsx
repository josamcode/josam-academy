import type { FontSizeToken } from '@josam/tokens';
import type { ElementType, ReactNode } from 'react';

/**
 * `DEC-40` — the most effective enforcement is making the violation **unwritable**.
 *
 *     <Text size="19px" tone="#E8B04B" />   ✗ does not compile
 *     <Text size="sm" tone="secondary" />   ✓
 *
 * `size` is `FontSizeToken`, imported from `@josam/tokens` rather than restated here. If the type
 * scale in `12 §4.2` gains a step, this accepts it; if a step is removed, every off-scale call
 * site becomes a compile error immediately. A local copy of the union would drift silently, which
 * is the failure `BR-1583` exists to prevent.
 *
 * There is no `className` prop, and that is deliberate: it would be an escape hatch straight past
 * `BR-1342` and `BR-1533`, and an escape hatch that exists is an escape hatch that gets used.
 */
export type TextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type TextWeight = 'regular' | 'medium' | 'semibold';

export type TextAlign = 'start' | 'center' | 'end';

/**
 * Static lookup tables, not template strings.
 *
 * Tailwind discovers utilities by scanning source text, so `` `text-${size}` `` produces a class
 * that exists in the DOM and in no stylesheet — styling that silently does nothing. Written out,
 * every class is a literal Tailwind can see.
 */
const SIZE: Record<FontSizeToken, string> = {
  '2xs': 'text-2xs',
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
};

const TONE: Record<TextTone, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  muted: 'text-text-muted',
  inverse: 'text-text-inverse',
  accent: 'text-accent',
  // The `-text` variants, per SB-18: these clear 4.5:1 as body text, while the bare
  // `--success` etc. are surface/border tokens that only clear 3:1.
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
  info: 'text-info-text',
};

const WEIGHT: Record<TextWeight, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
};

/** `BR-1397` — alignment is logical. `text-left` is correct in one direction and wrong in the other. */
const ALIGN: Record<TextAlign, string> = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
};

export interface TextProps {
  children: ReactNode;
  size?: FontSizeToken;
  tone?: TextTone;
  weight?: TextWeight;
  align?: TextAlign;
  /** `span` by default — `Text` is not a paragraph unless it is asked to be. */
  as?: Extract<ElementType, 'span' | 'p' | 'div' | 'label' | 'strong' | 'em'>;
  /** Latin runs inside Arabic prose need isolation (`BR-1236`); `Bidi` at PH-0.18 wraps this. */
  dir?: 'ltr' | 'rtl' | 'auto';
  id?: string;
}

export function Text({
  children,
  size = 'base',
  tone = 'primary',
  weight = 'regular',
  align,
  as: Component = 'span',
  dir,
  id,
}: TextProps) {
  const classes = [SIZE[size], TONE[tone], WEIGHT[weight], align ? ALIGN[align] : null]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} dir={dir} id={id}>
      {children}
    </Component>
  );
}

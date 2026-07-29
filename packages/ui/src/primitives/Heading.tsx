import type { FontSizeToken } from '@josam/tokens';
import type { ReactNode } from 'react';

/**
 * `BR-1472` — levels 1 to 4, one `h1` per page.
 *
 * `level` sets the semantic element and `size` sets the appearance, independently. They are
 * separate props on purpose: a page whose visual hierarchy forces its heading order produces
 * either wrong-looking pages or a broken screen-reader outline, and it is always the outline
 * that loses. Keeping them apart means a small `h2` is expressible without demoting it to `h3`.
 *
 * `BR-1221` — Readex Pro is for headings, the goal statement and celebration moments only. A
 * display face used everywhere stops being a display face, which is why `font-display` is applied
 * here and nowhere in `Text`.
 */
export type HeadingLevel = 1 | 2 | 3 | 4;

const DEFAULT_SIZE: Record<HeadingLevel, FontSizeToken> = {
  1: '3xl',
  2: '2xl',
  3: 'xl',
  4: 'lg',
};

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

export interface HeadingProps {
  children: ReactNode;
  level: HeadingLevel;
  /** Defaults to the size that matches the level. Override to decouple look from outline. */
  size?: FontSizeToken;
  id?: string;
}

export function Heading({ children, level, size, id }: HeadingProps) {
  const classes = `font-display text-text-primary ${SIZE[size ?? DEFAULT_SIZE[level]]}`;

  // A lookup rather than `` `h${level}` ``: the latter is a string React cannot check and
  // Tailwind cannot see, and it would accept `h7` from a widened type without complaint.
  switch (level) {
    case 1:
      return (
        <h1 className={classes} id={id}>
          {children}
        </h1>
      );
    case 2:
      return (
        <h2 className={classes} id={id}>
          {children}
        </h2>
      );
    case 3:
      return (
        <h3 className={classes} id={id}>
          {children}
        </h3>
      );
    case 4:
      return (
        <h4 className={classes} id={id}>
          {children}
        </h4>
      );
  }
}

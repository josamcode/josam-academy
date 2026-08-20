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
 * `12C §3` — the display face (Amiri; Newsreader when the interface is English) carries the
 * display tier ONLY: 700 only, never under 28px. In the locked scale that is `4xl` (52) and
 * `3xl` (35) and nothing else, so the face is keyed to the **resolved size** here rather than to
 * the heading level — an `h1` deliberately rendered small must not drag Amiri under 28px with it.
 * Every other size takes the body face at 700, which is what the reference screens' section
 * heads are.
 */
export type HeadingLevel = 1 | 2 | 3 | 4;

const DEFAULT_SIZE: Record<HeadingLevel, FontSizeToken> = {
  1: '3xl',
  2: 'xl',
  3: 'base',
  4: 'sm',
};

const SIZE: Record<FontSizeToken, string> = {
  eyebrow: 'text-eyebrow',
  '2xs': 'text-2xs',
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  xl: 'text-xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
};

/** The display tiers — the only sizes 12C lets the display face render. */
const FACE: Record<FontSizeToken, string> = {
  eyebrow: 'font-bold',
  '2xs': 'font-bold',
  xs: 'font-bold',
  sm: 'font-bold',
  base: 'font-bold',
  xl: 'font-bold',
  '3xl': 'font-display font-bold',
  '4xl': 'font-display font-bold',
};

export interface HeadingProps {
  children: ReactNode;
  level: HeadingLevel;
  /** Defaults to the size that matches the level. Override to decouple look from outline. */
  size?: FontSizeToken;
  id?: string;
}

export function Heading({ children, level, size, id }: HeadingProps) {
  const resolved = size ?? DEFAULT_SIZE[level];
  const classes = `${FACE[resolved]} text-text-primary ${SIZE[resolved]}`;

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

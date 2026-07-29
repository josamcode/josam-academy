import type { RadiusToken, SpaceToken } from '@josam/tokens';
import type { ReactNode } from 'react';

/**
 * `Stack` · `Inline` · `Grid` · `Box` · `Surface` — the layout primitives.
 *
 * `DEC-40`: `<Stack gap={13} />` does not compile. `gap` is `SpaceToken`, and `12 §5`'s scale is
 * deliberately gappy — 5 is not a step, so 20px is unreachable by construction rather than by
 * review.
 *
 * Every spacing class below is a **logical** utility (`ps-`/`pe-`, not `pl-`/`pr-`), per
 * `BR-1232`. Tailwind's `p-*` and `gap-*` are already direction-neutral; the inline variants are
 * where the discipline actually bites, and they are the ones exposed here.
 */

const GAP: Record<SpaceToken, string> = {
  '1': 'gap-1',
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '6': 'gap-6',
  '8': 'gap-8',
  '12': 'gap-12',
  '16': 'gap-16',
  '24': 'gap-24',
};

const PAD: Record<SpaceToken, string> = {
  '1': 'p-1',
  '2': 'p-2',
  '3': 'p-3',
  '4': 'p-4',
  '6': 'p-6',
  '8': 'p-8',
  '12': 'p-12',
  '16': 'p-16',
  '24': 'p-24',
};

const RADIUS: Record<RadiusToken, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

export type Align = 'start' | 'center' | 'end' | 'stretch';
export type Justify = 'start' | 'center' | 'end' | 'between';

const ALIGN: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const JUSTIFY: Record<Justify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

function cx(...values: (string | null | undefined | false)[]): string {
  return values.filter(Boolean).join(' ');
}

// ── Stack ────────────────────────────────────────────────────────────────────────────────
export interface StackProps {
  children: ReactNode;
  gap?: SpaceToken;
  align?: Align;
  justify?: Justify;
}

/** Vertical rhythm. The only primitive that should ever set vertical spacing between siblings. */
export function Stack({ children, gap = '4', align, justify }: StackProps) {
  return (
    <div
      className={cx(
        'flex flex-col',
        GAP[gap],
        align ? ALIGN[align] : null,
        justify ? JUSTIFY[justify] : null,
      )}
    >
      {children}
    </div>
  );
}

// ── Inline ───────────────────────────────────────────────────────────────────────────────
export interface InlineProps extends StackProps {
  wrap?: boolean;
}

/**
 * Horizontal grouping. `flex-row` follows the document direction, so this reverses in Arabic
 * without a second code path (`BR-1237`).
 */
export function Inline({ children, gap = '2', align = 'center', justify, wrap }: InlineProps) {
  return (
    <div
      className={cx(
        'flex flex-row',
        wrap ? 'flex-wrap' : null,
        GAP[gap],
        ALIGN[align],
        justify ? JUSTIFY[justify] : null,
      )}
    >
      {children}
    </div>
  );
}

// ── Grid ─────────────────────────────────────────────────────────────────────────────────
export type GridColumns = 1 | 2 | 3 | 4 | 6 | 12;

const COLUMNS: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
};

export interface GridProps {
  children: ReactNode;
  columns?: GridColumns;
  gap?: SpaceToken;
}

export function Grid({ children, columns = 12, gap = '4' }: GridProps) {
  return <div className={cx('grid', COLUMNS[columns], GAP[gap])}>{children}</div>;
}

// ── Box ──────────────────────────────────────────────────────────────────────────────────
export interface BoxProps {
  children?: ReactNode;
  padding?: SpaceToken;
  radius?: RadiusToken;
}

/** The unstyled container. No colour: that is `Surface`'s job, so the two cannot be confused. */
export function Box({ children, padding, radius }: BoxProps) {
  return (
    <div className={cx(padding ? PAD[padding] : null, radius ? RADIUS[radius] : null)}>
      {children}
    </div>
  );
}

// ── Surface ──────────────────────────────────────────────────────────────────────────────
export type SurfaceLevel = 'base' | 'surface' | 'elevated' | 'inset';
export type SurfaceBorder = 'none' | 'subtle' | 'strong';

/**
 * `BR-1229` — elevation is carried by **borders first**, shadows second. Heavy shadows on a dark
 * surface read as muddy, which is why there is no `shadow` prop here at all.
 *
 * `BR-1345` — a border must stay visible in both themes. Background and border are chosen as a
 * pair rather than independently, so an invisible combination is not expressible.
 */
const SURFACE: Record<SurfaceLevel, string> = {
  base: 'bg-bg-base',
  surface: 'bg-bg-surface',
  elevated: 'bg-bg-elevated',
  inset: 'bg-bg-inset',
};

const BORDER: Record<SurfaceBorder, string> = {
  none: '',
  subtle: 'border border-border-subtle',
  strong: 'border border-border-strong',
};

export interface SurfaceProps extends BoxProps {
  level?: SurfaceLevel;
  border?: SurfaceBorder;
}

export function Surface({
  children,
  level = 'surface',
  border = 'subtle',
  padding = '4',
  radius = 'md',
}: SurfaceProps) {
  return (
    <div className={cx(SURFACE[level], BORDER[border], PAD[padding], RADIUS[radius])}>
      {children}
    </div>
  );
}

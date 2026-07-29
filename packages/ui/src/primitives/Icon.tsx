import type { LucideIcon } from 'lucide-react';

/**
 * `BR-1487` — one icon library, consistent stroke. `12 §4` picks Lucide.
 *
 * Sizes are a fixed set, not arbitrary pixels (`DEC-40`). Stroke width is not a prop at all:
 * mixed stroke weights are the single most visible way an icon set stops looking like a set, and
 * exposing it would guarantee it happens.
 *
 * `BR-1233` — directional icons mirror in RTL; brand marks, checkmarks, media controls and
 * external-link icons do not. That is a property of the icon, not of the call site, so it is
 * declared here with `flip` rather than left to whoever writes the next screen.
 */
export type IconSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

export interface IconProps {
  /** A Lucide icon component. Importing named icons keeps the bundle tree-shakeable (`BR-1478`). */
  icon: LucideIcon;
  size?: IconSize;
  /**
   * `BR-1233` — set for arrows, chevrons and progress indicators. Left off for checkmarks, media
   * controls, brand marks and external-link glyphs, which mean the same thing in both directions.
   */
  flip?: boolean;
  /**
   * The accessible name. Omit it for a purely decorative icon and the element is hidden from
   * assistive technology — which is correct, and is why this is not optional-by-accident:
   * `label={undefined}` is a decision the call site has to make.
   */
  label?: string;
}

export function Icon({ icon: Glyph, size = 'md', flip = false, label }: IconProps) {
  const px = SIZE_PX[size];

  return (
    <Glyph
      width={px}
      height={px}
      strokeWidth={2}
      aria-hidden={label === undefined}
      aria-label={label}
      role={label === undefined ? undefined : 'img'}
      className={flip ? 'rtl:-scale-x-100' : undefined}
      focusable="false"
    />
  );
}

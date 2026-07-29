'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Icon } from '../primitives/Icon.js';

/**
 * `Button` and `IconButton`.
 *
 * `BR-1350` — never create a second Button. Extend this one or raise the gap. That is why the
 * variant and size sets are closed and there is no `className`: both are the escape hatches
 * through which a second button arrives without anyone deciding to build one.
 *
 * `BR-1346` — hover, focus-visible, active, disabled and loading are each visually distinct.
 * `BR-1217` — gold is reserved for the primary action, the current rail position, and achievement
 * moments; only `variant="primary"` uses the accent.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * `BR-1347` — a disabled control always explains why it is disabled.
 *
 * Expressed as a discriminated union rather than a convention: `disabled` without
 * `disabledReason` is a **type error**, so the explanation cannot be forgotten under deadline.
 * The reason arrives pre-translated because this component sits below the catalog (`BR-523`).
 */
export type DisabledState =
  { disabled: true; disabledReason: string } | { disabled?: false; disabledReason?: never };

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium rounded-md ' +
  // focus-visible, not focus: a mouse user should not see a ring, a keyboard user must.
  'outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-bg-base ' +
  'transition-colors duration-fast ease-standard ' +
  // BR-1347 — a disabled control never looks enabled.
  'disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-contrast hover:bg-accent-hover active:bg-accent-pressed',
  secondary:
    'bg-bg-elevated text-text-primary border border-border-strong hover:bg-bg-surface active:bg-bg-inset',
  ghost: 'bg-transparent text-text-secondary hover:bg-bg-surface active:bg-bg-inset',
  // BR-1344 — red is reserved for destructive and error states only.
  danger: 'bg-danger text-accent-contrast hover:opacity-90 active:opacity-80',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'text-sm p-2',
  md: 'text-base p-3',
  lg: 'text-lg p-4',
};

const ICON_SIZE: Record<ButtonSize, 'sm' | 'md' | 'lg'> = { sm: 'sm', md: 'md', lg: 'md' };

export type ButtonProps = DisabledState & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Blocks the click and announces busy — the double-submit guard, not decoration. */
  isLoading?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
};

/** A spinner drawn from tokens. `Spinner` proper is Wave 2 (`12 §20.12.2`). */
function LoadingGlyph() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  type = 'button',
  onClick,
  disabled,
  disabledReason,
}: ButtonProps) {
  // A loading button must be unclickable, not merely styled as busy: the whole point is that the
  // second click never reaches the handler (BR-1412's spirit at control level).
  const isDisabled = disabled === true || isLoading;

  return (
    <button
      type={type}
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]}`}
      disabled={isDisabled}
      // BR-1347 — the explanation is available to everyone, not just sighted hover users.
      title={disabled === true ? disabledReason : undefined}
      aria-describedby={undefined}
      aria-disabled={isDisabled}
      aria-busy={isLoading}
      onClick={isDisabled ? undefined : onClick}
    >
      {isLoading ? <LoadingGlyph /> : null}
      {children}
    </button>
  );
}

export type IconButtonProps = DisabledState & {
  icon: LucideIcon;
  /**
   * `BR-1471` — icon-only buttons carry an accessible name, and it is **required**: an icon
   * button announced as "button" tells a screen-reader user nothing at all. Pre-translated,
   * because this component sits below the catalog (`BR-523`).
   */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  flip?: boolean;
  onClick?: () => void;
};

const ICON_ONLY_SIZE: Record<ButtonSize, string> = {
  sm: 'p-1',
  md: 'p-2',
  lg: 'p-3',
};

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  isLoading = false,
  flip = false,
  onClick,
  disabled,
  disabledReason,
}: IconButtonProps) {
  const isDisabled = disabled === true || isLoading;

  return (
    <button
      type="button"
      className={`${BASE} ${VARIANT[variant]} ${ICON_ONLY_SIZE[size]}`}
      disabled={isDisabled}
      aria-label={label}
      title={disabled === true ? disabledReason : label}
      aria-disabled={isDisabled}
      aria-busy={isLoading}
      onClick={isDisabled ? undefined : onClick}
    >
      {isLoading ? <LoadingGlyph /> : <Icon icon={icon} size={ICON_SIZE[size]} flip={flip} />}
    </button>
  );
}

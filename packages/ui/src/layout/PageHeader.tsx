'use client';

import type { ReactNode } from 'react';

import { Button, type DisabledState } from '../controls/Button.js';
import { Heading } from '../primitives/Heading.js';
import { Inline, Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb.js';

/**
 * `PageHeader` — `BR-1548`, `BR-1549`.
 *
 * It owns the page's single `h1`, its breadcrumb, and its primary action slot. Screens never render
 * their own `h1` (`BR-1472`), which is enforceable precisely because there is one component that
 * does.
 */

/**
 * `BR-1549` — **exactly one primary action, enforced by the type system.**
 *
 * `primaryAction` is a *description*, not a `ReactNode`. That is the whole mechanism, and the
 * reason is `BR-1313`: every screen has one primary action, and if two compete one of them is
 * wrong. A `ReactNode` prop cannot express that — `<>{save}{publish}</>` is a single valid node
 * containing two buttons, and no type can see inside it. An object can hold one label and one
 * handler and nothing else, so a second primary action is not a lint warning or a review comment
 * but `TS2322` at the call site (proven by deliberate violation in `verify-fitness.sh`).
 *
 * `secondaryActions` is a plain array, deliberately: the rule is about primacy, not about the
 * number of things a page can do.
 */
export type PrimaryAction = DisabledState & {
  /** Pre-translated. */
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger';
  isLoading?: boolean;
};

export interface SecondaryAction {
  label: string;
  onClick: () => void;
}

export interface PageHeaderProps {
  /** Becomes the page's one `h1`. Pre-translated. */
  title: string;
  /** Pre-translated. Sits under the title, never inside it. */
  description?: string;
  /**
   * `BR-1366` — a breadcrumb appears wherever depth exceeds two levels. `Breadcrumb` itself
   * refuses to render at or below two, so passing a short trail is harmless rather than wrong.
   */
  breadcrumb?: BreadcrumbItem[];
  primaryAction?: PrimaryAction;
  secondaryActions?: SecondaryAction[];
  /** Status chips, counts, timestamps — anything that describes the page rather than acts on it. */
  meta?: ReactNode;
}

/**
 * Two explicit branches rather than a conditional spread.
 *
 * `DisabledState` is a discriminated union, and spreading `{...(cond ? {disabled: true, reason} :
 * {})}` widens `disabled` to `true | undefined`, which satisfies neither arm — `TS2322`. Writing
 * both branches out is what the union is for: the disabled case cannot be written without its
 * reason (`BR-1347`), which is the entire point of typing it this way.
 */
function PrimaryActionButton({ action }: { action: PrimaryAction }) {
  const common = {
    variant: action.variant ?? 'primary',
    isLoading: action.isLoading ?? false,
    onClick: action.onClick,
    children: action.label,
  } as const;

  if (action.disabled === true) {
    return <Button {...common} disabled disabledReason={action.disabledReason} />;
  }
  return <Button {...common} />;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  primaryAction,
  secondaryActions,
  meta,
}: PageHeaderProps) {
  return (
    <Stack gap="3">
      {breadcrumb === undefined ? null : <Breadcrumb items={breadcrumb} />}

      {/*
        `flex-wrap` rather than a fixed two-column layout: at 320px the actions belong under the
        title, and a header that pushes its own primary action off-screen is worse than one that
        stacks.
      */}
      <div className="flex flex-row flex-wrap items-start justify-between gap-3">
        <Stack gap="1">
          {/* BR-1548 — the one h1 on the page lives here and nowhere else. */}
          <Heading level={1}>{title}</Heading>
          {description === undefined ? null : (
            <Text size="sm" tone="secondary">
              {description}
            </Text>
          )}
          {meta === null || meta === undefined ? null : <div>{meta}</div>}
        </Stack>

        {primaryAction === undefined && (secondaryActions ?? []).length === 0 ? null : (
          <Inline gap="2">
            {(secondaryActions ?? []).map((action) => (
              <Button key={action.label} variant="secondary" onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
            {primaryAction === undefined ? null : <PrimaryActionButton action={primaryAction} />}
          </Inline>
        )}
      </div>
    </Stack>
  );
}

export interface PageFooterProps {
  children: ReactNode;
}

/**
 * The page's `contentinfo` landmark.
 *
 * A landmark rather than a styled `div`, because a screen-reader user navigating by landmark is
 * the only person for whom the distinction exists — and they are the only ones who cannot see that
 * this is the footer.
 */
export function PageFooter({ children }: PageFooterProps) {
  return (
    <footer className="border-t border-border-subtle p-6 text-text-secondary">{children}</footer>
  );
}

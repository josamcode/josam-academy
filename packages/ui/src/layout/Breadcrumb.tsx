'use client';

import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Text } from '../primitives/Text.js';

/**
 * `Breadcrumb` — `BR-1366`: the user always knows where they are, and a breadcrumb appears
 * **wherever depth exceeds two levels**.
 */

export interface BreadcrumbItem {
  /** Pre-translated. */
  label: string;
  /** Omitted on the last item — the current page is not a link to itself. */
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /**
   * Pre-translated, e.g. "You are here". **Required**, for two reasons found together at
   * `PH-0.30`.
   *
   * It defaulted to the literal string `'Breadcrumb'`, which is a hardcoded user-facing string in
   * a library whose entire contract is that copy comes from `@josam/i18n` (`BR-525`) — and in an
   * Arabic-first product it made a screen reader announce an English word.
   *
   * It also made every breadcrumb on a page share one accessible name. axe reported
   * `landmark-unique`: two `navigation` landmarks a user cannot tell apart, which is worse than
   * one unnamed landmark because the list of landmarks looks navigable and is not.
   */
  label: string;
}

/**
 * Renders nothing at two levels or fewer.
 *
 * `BR-1366` sets a floor, not a default. "Home › Settings" tells a user nothing they did not
 * already know from the page title, and a navigation landmark holding one hop is noise for anyone
 * moving by landmark. The threshold lives here rather than at each of the ~40 call sites, because a
 * rule enforced in forty places is a rule enforced in thirty-nine.
 */
export function Breadcrumb({ items, label }: BreadcrumbProps) {
  if (items.length <= 2) return null;

  return (
    <nav aria-label={label}>
      <ol className="flex flex-row flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex flex-row items-center gap-2">
              {index === 0 ? null : (
                // BR-1233 — a separator pointing along the reading direction is directional, so it
                // mirrors. Without this the trail reads inwards in Arabic and outwards in English.
                <ChevronRight
                  width={14}
                  height={14}
                  aria-hidden="true"
                  focusable="false"
                  className="shrink-0 text-text-muted rtl:rotate-180"
                />
              )}
              <Text size="sm" tone={isLast ? 'primary' : 'secondary'}>
                {isLast || item.href === undefined ? (
                  // aria-current is what tells a screen reader which crumb is the page they are on.
                  // Bolder text conveys it to everyone else and to nobody using a screen reader.
                  <span aria-current="page">{item.label}</span>
                ) : (
                  <a href={item.href} className="underline underline-offset-2">
                    {item.label}
                  </a>
                )}
              </Text>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface SkipLinkProps {
  /** The id of the main landmark. `AppShell` renders `main` with this id. */
  targetId: string;
  /** Pre-translated. */
  children: ReactNode;
}

/**
 * `SkipLink` — the first focusable thing on the page, and invisible until focused.
 *
 * It exists for keyboard users who would otherwise tab through the entire navigation on every page.
 * Two things make or break it, and both are easy to get subtly wrong:
 *
 *  - It must be **in the DOM and focusable at all times**. `display: none` until focus cannot work,
 *    because an element that is not rendered cannot receive the focus that would reveal it. Hence
 *    `sr-only` plus `focus:not-sr-only` rather than a `hidden` toggle.
 *  - The target must be focusable, or the browser moves the *scroll* position and leaves focus on
 *    the link — so the next Tab returns to the second nav item and the skip did nothing. `AppShell`
 *    gives `main` a `tabIndex={-1}` for exactly this reason.
 */
export function SkipLink({ targetId, children }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only rounded-md bg-bg-elevated p-3 text-text-primary underline focus:not-sr-only focus:absolute focus:z-50 focus:ring-2 focus:ring-border-focus"
    >
      {children}
    </a>
  );
}

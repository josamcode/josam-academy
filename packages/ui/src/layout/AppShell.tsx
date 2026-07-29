'use client';

import type { ReactNode } from 'react';

import { SkipLink } from './Breadcrumb.js';

/**
 * `AppShell` — the landmark structure every screen sits inside.
 *
 * Its whole job is to make the page navigable without sight: one `banner`, one `navigation`, one
 * `main`, one `contentinfo`, in that order, with a working skip link ahead of all of them. Screens
 * supply the contents; none of them re-declares a landmark, which is what keeps "one `main` per
 * page" true rather than aspirational.
 */

export interface AppShellProps {
  /** Rendered first. `TopBar` already contains a `banner` landmark. */
  topBar?: ReactNode;
  /** The persistent sidebar, hidden below the `md` breakpoint where `bottomNav` takes over. */
  sideNav?: ReactNode;
  /** Small screens only. Reserves its own height so it never covers the last of the content. */
  bottomNav?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Pre-translated, e.g. "Skip to content". */
  skipLabel: string;
}

const MAIN_ID = 'josam-main';

export function AppShell({
  topBar,
  sideNav,
  bottomNav,
  footer,
  children,
  skipLabel,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-base text-text-primary">
      {/*
        First in the DOM, so it is the first thing Tab reaches. A skip link that is not first is
        not a skip link — it skips whatever happens to precede it.
      */}
      <SkipLink targetId={MAIN_ID}>{skipLabel}</SkipLink>

      {topBar}

      <div className="flex flex-1 flex-row">
        {/*
          `hidden md:flex` rather than unmounting: below md the sidebar's destinations are in
          `bottomNav`, so removing it duplicates nothing and keeps the DOM honest about what is
          actually reachable.
        */}
        {sideNav === undefined ? null : <div className="hidden md:flex">{sideNav}</div>}

        <main
          id={MAIN_ID}
          /*
            tabIndex={-1} is the load-bearing part of the skip link. Without it the browser scrolls
            to the target and leaves focus on the link, so the next Tab returns to the second nav
            item — the user sees the page move and then finds themselves back where they started.
            The link appears to work and does nothing, which is the failure mode nobody reports.
          */
          tabIndex={-1}
          className={`flex-1 p-6 outline-none ${bottomNav === undefined ? '' : 'pb-24 md:pb-6'}`}
        >
          {children}
        </main>
      </div>

      {footer}

      {bottomNav === undefined ? null : <div className="md:hidden">{bottomNav}</div>}
    </div>
  );
}

/** Exported so specs and screens can reference the landmark the skip link targets. */
export const APP_SHELL_MAIN_ID = MAIN_ID;

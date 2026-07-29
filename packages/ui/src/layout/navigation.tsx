'use client';

import type { LucideIcon } from 'lucide-react';
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import type { OptionAvailability } from '../form/availability.js';
import { Text } from '../primitives/Text.js';

/**
 * `TopBar` · `SideNav` · `BottomNav` · `Tabs`.
 *
 * All four are roving-focus widgets, and all four are built here rather than on Radix. `Tabs` is
 * the only one Radix has a primitive for; adopting it for one of four would mean two different
 * keyboard implementations to keep in step, and the WAI-ARIA tabs pattern is short enough that the
 * shared implementation below is smaller than the divergence would be.
 *
 * **Inline arrow keys resolve against the document direction**, the same way `DatePicker`'s
 * calendar does. A horizontal tab strip mirrors in Arabic, so `ArrowRight` moves towards the
 * *previous* tab. Binding it to "next" unconditionally moves the highlight opposite to the key in
 * half this product's languages (`BR-1232`, `BR-1529`).
 */

function directionOf(element: Element | null): 'ltr' | 'rtl' {
  const declared = element?.closest('[dir]')?.getAttribute('dir');
  if (declared === 'rtl' || declared === 'ltr') return declared;
  return document.dir === 'rtl' ? 'rtl' : 'ltr';
}

/**
 * Roving focus for a one-dimensional widget.
 *
 * Returns the index the caller should give `tabIndex={0}`, a keydown handler, and a `containerRef`
 * the caller must put on the element wrapping the items.
 *
 * `orientation` decides which arrow pair moves: a vertical `SideNav` responds to Up/Down, a
 * horizontal tab strip to Left/Right, and neither responds to the other's — arrow keys that do
 * nothing are better than arrow keys that scroll the page while appearing to be handled.
 *
 * ## The hook moves focus, and only when it handled the key
 *
 * Two defects sat here, and both are the same mistake from opposite ends.
 *
 * The first version moved the roving `tabIndex` and left focus where it was. The widget then looked
 * correct in the DOM — one tab stop, the right element marked — while `ArrowDown` in a sidebar
 * visibly did nothing. Worse, the spec that "proved" it asserted which element carried
 * `tabindex="0"` rather than which element was focused, so the assertion agreed with the bug. Only
 * `Tabs` moved focus, because only `Tabs` was written second.
 *
 * The second version, in `Tabs`, restored focus after **every** keydown — including `Tab`. So
 * tabbing out of the tab strip moved focus to the panel and then a queued callback pulled it
 * straight back, trapping the user in the tablist. That one was caught by a spec asserting
 * `document.activeElement`, which is the whole reason it is asserted that way.
 *
 * Hence: focus moves here, once, and only from a branch that called `preventDefault`. The
 * `useEffect` rather than a microtask is deliberate — it has to run after React has committed the
 * new `tabIndex`, or it re-focuses the element that is on its way to `-1`.
 */
function useRovingFocus<Container extends HTMLElement>(
  count: number,
  orientation: 'horizontal' | 'vertical',
) {
  const [active, setActive] = useState(0);
  // Generic rather than `HTMLElement` plus a cast at each call site: three of the four containers
  // are narrower element types, and a cast per caller is a cast that can be got wrong per caller.
  const containerRef = useRef<Container>(null);
  const focusAfterCommit = useRef(false);

  useEffect(() => {
    if (!focusAfterCommit.current) return;
    focusAfterCommit.current = false;
    containerRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [active]);

  const moveTo = useCallback((next: (index: number) => number) => {
    focusAfterCommit.current = true;
    setActive(next);
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const rtl = directionOf(event.currentTarget) === 'rtl';
      const inline = rtl ? -1 : 1;

      const steps: Record<string, number | undefined> =
        orientation === 'horizontal'
          ? { ArrowRight: inline, ArrowLeft: -inline }
          : { ArrowDown: 1, ArrowUp: -1 };

      const step = steps[event.key];
      if (step !== undefined) {
        event.preventDefault();
        moveTo((index) => (count === 0 ? 0 : (index + step + count) % count));
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        moveTo(() => 0);
      } else if (event.key === 'End') {
        event.preventDefault();
        moveTo(() => Math.max(0, count - 1));
      }
      // Everything else — Tab above all — falls through untouched.
    },
    [count, moveTo, orientation],
  );

  return { active, setActive, onKeyDown, containerRef };
}

export interface NavItem {
  /** Pre-translated. */
  label: string;
  href: string;
  icon?: LucideIcon;
  /** Marks the current page — becomes `aria-current="page"`. */
  current?: boolean;
  /** A count shown beside the label. Pre-formatted by the caller (`BR-526`). */
  badge?: string;
}

const NAV_LINK =
  'flex flex-row items-center gap-3 rounded-md p-3 text-text-secondary no-underline ' +
  'outline-none hover:bg-bg-surface focus-visible:ring-2 focus-visible:ring-border-focus ' +
  'aria-[current=page]:bg-accent-subtle aria-[current=page]:text-text-primary';

// ── TopBar ───────────────────────────────────────────────────────────────────────────────
export interface TopBarProps {
  /** Brand mark or wordmark. `BR-1233` — a brand mark does not mirror. */
  brand: ReactNode;
  /** Pre-translated, names the navigation landmark. */
  navLabel: string;
  items?: NavItem[];
  /** Account menu, locale switch, theme toggle — whatever sits at the inline end. */
  actions?: ReactNode;
}

/**
 * The page's `banner` landmark, holding an inner `navigation` landmark.
 *
 * Two landmarks rather than one: a screen-reader user jumping to "navigation" wants the links, not
 * the logo and the account menu with them.
 */
export function TopBar({ brand, navLabel, items, actions }: TopBarProps) {
  const list = items ?? [];
  const { active, onKeyDown, containerRef } = useRovingFocus<HTMLUListElement>(
    list.length,
    'horizontal',
  );

  return (
    <header className="flex flex-row items-center justify-between gap-4 border-b border-border-subtle bg-bg-surface p-3">
      <div className="flex flex-row items-center gap-4">
        {brand}
        {list.length === 0 ? null : (
          <nav aria-label={navLabel}>
            {/*
              One tab stop for the whole bar. A nav of eight links that costs eight Tab presses on
              every page is the single most common keyboard complaint about application shells.
            */}
            <ul ref={containerRef} className="flex flex-row items-center gap-1">
              {list.map((item, index) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    tabIndex={index === active ? 0 : -1}
                    aria-current={item.current === true ? 'page' : undefined}
                    onKeyDown={onKeyDown}
                    className={NAV_LINK}
                  >
                    <Text size="sm">{item.label}</Text>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      {actions === undefined ? null : (
        <div className="flex flex-row items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

// ── SideNav ──────────────────────────────────────────────────────────────────────────────
export interface SideNavProps {
  navLabel: string;
  items: NavItem[];
  /** Grouped sections. Each heading is pre-translated. */
  sections?: { heading: string; items: NavItem[] }[];
}

/** Vertical, so `ArrowUp`/`ArrowDown` move and the inline arrows deliberately do nothing. */
export function SideNav({ navLabel, items, sections }: SideNavProps) {
  const grouped = sections ?? [];
  const flat = [...items, ...grouped.flatMap((section) => section.items)];
  const { active, onKeyDown, containerRef } = useRovingFocus<HTMLElement>(flat.length, 'vertical');

  let cursor = -1;
  const nextIndex = () => {
    cursor += 1;
    return cursor;
  };

  const renderItem = (item: NavItem) => {
    const index = nextIndex();
    const Icon = item.icon;
    return (
      <li key={item.href}>
        <a
          href={item.href}
          tabIndex={index === active ? 0 : -1}
          aria-current={item.current === true ? 'page' : undefined}
          onKeyDown={onKeyDown}
          className={NAV_LINK}
        >
          {Icon === undefined ? null : (
            <Icon
              width={18}
              height={18}
              aria-hidden="true"
              focusable="false"
              className="shrink-0"
            />
          )}
          <Text size="sm">{item.label}</Text>
          {item.badge === undefined ? null : (
            <Text size="xs" tone="secondary">
              {/* ms-auto is logical: it pushes to the inline end in both directions. */}
              <span className="ms-auto tabular-nums">{item.badge}</span>
            </Text>
          )}
        </a>
      </li>
    );
  };

  return (
    <nav
      ref={containerRef}
      aria-label={navLabel}
      className="flex flex-col gap-4 border-e border-border-subtle p-3"
    >
      <ul className="flex flex-col gap-1">{items.map(renderItem)}</ul>
      {grouped.map((section) => (
        <div key={section.heading} className="flex flex-col gap-1">
          {/*
            A real heading, not styled text. Screen-reader users navigate a long sidebar by heading;
            a bold span is a bold span. Level 2 because PageHeader owns the h1 (BR-1548, BR-1472).
          */}
          <Text size="xs" tone="muted">
            <h2 className="p-2 uppercase">{section.heading}</h2>
          </Text>
          <ul className="flex flex-col gap-1">{section.items.map(renderItem)}</ul>
        </div>
      ))}
    </nav>
  );
}

// ── BottomNav ────────────────────────────────────────────────────────────────────────────
export interface BottomNavProps {
  navLabel: string;
  /** Three to five. More than five and the targets stop being reachable by thumb. */
  items: NavItem[];
}

/**
 * The small-screen primary navigation.
 *
 * `pb-[env(safe-area-inset-bottom)]` is not decoration: without it the last row of targets sits
 * under the iOS home indicator and cannot be tapped at all.
 */
export function BottomNav({ navLabel, items }: BottomNavProps) {
  const { active, onKeyDown, containerRef } = useRovingFocus<HTMLUListElement>(
    items.length,
    'horizontal',
  );

  return (
    <nav
      aria-label={navLabel}
      className="fixed inset-x-0 bottom-0 border-t border-border-subtle bg-bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul ref={containerRef} className="flex flex-row items-stretch justify-around">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <a
                href={item.href}
                tabIndex={index === active ? 0 : -1}
                aria-current={item.current === true ? 'page' : undefined}
                onKeyDown={onKeyDown}
                // min-h-11 is the 44px minimum touch target, not a visual choice.
                className="flex min-h-11 flex-col items-center justify-center gap-1 p-2 text-text-secondary no-underline outline-none focus-visible:ring-2 focus-visible:ring-border-focus aria-[current=page]:text-accent"
              >
                {Icon === undefined ? null : (
                  <Icon width={20} height={20} aria-hidden="true" focusable="false" />
                )}
                <Text size="xs">{item.label}</Text>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────────────────
/**
 * `BR-1347` — a disabled tab says why. A tab the user can see and cannot open is the same dead end
 * as a disabled field, and the reason ("finish the lessons first") is usually the only thing that
 * tells them what to do next.
 */
export type TabItem = {
  id: string;
  /** Pre-translated. */
  label: string;
  content: ReactNode;
} & OptionAvailability;

export interface TabsProps {
  items: TabItem[];
  /** Pre-translated, names the tablist. */
  label: string;
  defaultId?: string;
}

/**
 * WAI-ARIA tabs, **manual activation**.
 *
 * Arrow keys move focus; `Enter` or `Space` selects. Automatic activation — selecting on focus — is
 * the more common implementation and is wrong here: tab panels in this product load data, so
 * arrowing past three tabs to reach the fourth would fire three requests nobody asked for and
 * announce three panels the user never wanted.
 *
 * Keyboard (`BR-1531`):
 *
 * ```
 * Arrow inline    previous / next tab — SWAPS in RTL
 * Home / End      first / last tab
 * Enter / Space   activate the focused tab
 * Tab             leaves the tablist and enters the panel
 * ```
 */
export function Tabs({ items, label, defaultId }: TabsProps) {
  const baseId = useId();
  const [selected, setSelected] = useState(defaultId ?? items[0]?.id ?? '');
  const { active, setActive, onKeyDown, containerRef } = useRovingFocus<HTMLDivElement>(
    items.length,
    'horizontal',
  );

  const activate = useCallback(
    (index: number) => {
      const item = items[index];
      if (item === undefined || item.disabled === true) return;
      setSelected(item.id);
      setActive(index);
    },
    [items, setActive],
  );

  const selectedItem = items.find((item) => item.id === selected);

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={containerRef}
        role="tablist"
        aria-label={label}
        className="flex flex-row gap-1 border-b border-border-subtle"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.id}`}
            aria-selected={item.id === selected}
            aria-controls={`${baseId}-panel-${item.id}`}
            tabIndex={index === active ? 0 : -1}
            disabled={item.disabled ?? false}
            title={item.disabled === true ? item.disabledReason : undefined}
            onClick={() => {
              activate(index);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                // A <button> synthesises a click from both, so without preventDefault this runs
                // twice. Harmless for an idempotent select, and it was not harmless in PH-0.24's
                // MultiSelect — the habit is what keeps that from recurring.
                event.preventDefault();
                activate(index);
                return;
              }
              // The hook moves focus itself, and only for keys it handled — restoring focus
              // here unconditionally trapped Tab inside the tablist.
              onKeyDown(event);
            }}
            className="rounded-t-md p-3 text-sm text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-border-focus aria-selected:border-b-2 aria-selected:border-accent aria-selected:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      {selectedItem === undefined ? null : (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${selectedItem.id}`}
          aria-labelledby={`${baseId}-tab-${selectedItem.id}`}
          // The panel is focusable so Tab out of the tablist lands in the content rather than
          // skipping it entirely, which is the tabs pattern's most common omission.
          tabIndex={0}
          className="outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {selectedItem.content}
        </div>
      )}
    </div>
  );
}

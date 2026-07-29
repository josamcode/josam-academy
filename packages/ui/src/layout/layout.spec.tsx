// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookOpen, Home, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppShell, APP_SHELL_MAIN_ID } from './AppShell.js';
import { Breadcrumb, SkipLink } from './Breadcrumb.js';
import { PageFooter, PageHeader } from './PageHeader.js';
import { BottomNav, type NavItem, SideNav, Tabs, TopBar } from './navigation.js';

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('dir');
});

const NAV: NavItem[] = [
  { label: 'الرئيسية · Home', href: '/', icon: Home, current: true },
  { label: 'الدورات · Courses', href: '/courses', icon: BookOpen },
  { label: 'حسابي · Account', href: '/account', icon: User, badge: '٣' },
];

/**
 * Presses an arrow key held, then released — see the note in `choice-fields.spec.tsx`. Kept here
 * too because these widgets defer focus into a microtask for the same class of reason.
 */
async function pressArrow(user: ReturnType<typeof userEvent.setup>, key: string) {
  await user.keyboard(`{${key}>}`);
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  await user.keyboard(`{/${key}}`);
}

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('PageHeader — BR-1548, BR-1549', () => {
  it('renders the page title as the ONE h1', () => {
    render(<PageHeader title="الدورات · Courses" />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe('الدورات · Courses');
  });

  it('renders the primary action as a real button that calls its handler', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <PageHeader title="الدورات · Courses" primaryAction={{ label: 'إنشاء · Create', onClick }} />,
    );

    await user.click(screen.getByRole('button', { name: 'إنشاء · Create' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('puts secondary actions BEFORE the primary one in the DOM', () => {
    render(
      <PageHeader
        title="Courses"
        primaryAction={{ label: 'Create', onClick: () => undefined }}
        secondaryActions={[{ label: 'Export', onClick: () => undefined }]}
      />,
    );
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    // The primary action is last, so it is the closest to the inline end in both directions and
    // the last thing Tab reaches in the group.
    expect(buttons).toEqual(['Export', 'Create']);
  });

  it('a disabled primary action states its reason (BR-1347)', () => {
    render(
      <PageHeader
        title="Courses"
        primaryAction={{
          label: 'Publish',
          onClick: () => undefined,
          disabled: true,
          disabledReason: 'أضف درسًا أولًا · Add a lesson first',
        }}
      />,
    );
    expect(screen.getByTitle(/Add a lesson first/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Publish' }).getAttribute('disabled')).not.toBeNull();
  });

  it('renders no action row at all when there are no actions', () => {
    render(<PageHeader title="Courses" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders the description and meta without putting them inside the h1', () => {
    render(
      <PageHeader
        title="Courses"
        description="كل الدورات · Every course"
        meta={<span>12 دورة</span>}
      />,
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Courses');
    expect(screen.getByText('كل الدورات · Every course')).toBeDefined();
    expect(screen.getByText('12 دورة')).toBeDefined();
  });
});

describe('PageFooter', () => {
  it('is a contentinfo landmark, not a styled div', () => {
    render(<PageFooter>© Josam</PageFooter>);
    expect(screen.getByRole('contentinfo')).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('Breadcrumb — BR-1366', () => {
  it('renders nothing at two levels or fewer', () => {
    const { container } = render(
      <Breadcrumb
        label="مسار أ · Trail A"
        items={[{ label: 'Home', href: '/' }, { label: 'Courses' }]}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders from three levels up', () => {
    render(
      <Breadcrumb
        label="مسار ب · Trail B"
        items={[
          { label: 'Home', href: '/' },
          { label: 'Courses', href: '/courses' },
          { label: 'Arabic 101' },
        ]}
      />,
    );
    expect(screen.getByRole('navigation')).toBeDefined();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('marks the last crumb aria-current and does NOT link it to itself', () => {
    render(
      <Breadcrumb
        label="مسار ج · Trail C"
        items={[
          { label: 'Home', href: '/' },
          { label: 'Courses', href: '/courses' },
          { label: 'Arabic 101' },
        ]}
      />,
    );
    expect(screen.getByText('Arabic 101').getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('link', { name: 'Arabic 101' })).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('mirrors its separator, so the trail reads outwards in both directions', () => {
    render(
      <Breadcrumb
        label="مسار د · Trail D"
        items={[{ label: 'A', href: '/' }, { label: 'B', href: '/b' }, { label: 'C' }]}
      />,
    );
    const separators = document.querySelectorAll('svg');
    expect(separators.length).toBeGreaterThan(0);
    for (const svg of separators) {
      expect(svg.getAttribute('class') ?? '').toContain('rtl:rotate-180');
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('SkipLink — the two things that make or break it', () => {
  it('is focusable while hidden — not display:none, which cannot receive focus', async () => {
    const user = userEvent.setup();
    render(<SkipLink targetId="main">تخطٍ · Skip to content</SkipLink>);

    await user.tab();
    // If it were `hidden` or `display:none` it would not be in the tab order at all, and the whole
    // mechanism would be invisible AND unreachable rather than invisible until needed.
    expect(document.activeElement).toBe(screen.getByRole('link'));
    expect(screen.getByRole('link').className).toContain('focus:not-sr-only');
  });

  it('points at the id the AppShell actually gives main', () => {
    render(
      <AppShell skipLabel="Skip to content">
        <p>content</p>
      </AppShell>,
    );
    const href = screen.getByRole('link').getAttribute('href') ?? '';
    expect(href).toBe(`#${APP_SHELL_MAIN_ID}`);
    // The dangling-target failure: the link resolves to nothing and silently does nothing.
    expect(document.getElementById(href.slice(1))).not.toBeNull();
  });

  it('targets a FOCUSABLE main — without tabIndex the skip only scrolls', () => {
    render(
      <AppShell skipLabel="Skip to content">
        <p>content</p>
      </AppShell>,
    );
    const main = screen.getByRole('main');
    // The subtle failure this asserts: the browser scrolls to a non-focusable target but leaves
    // focus on the link, so the next Tab goes back into the navigation. The link appears to work.
    expect(main.getAttribute('tabindex')).toBe('-1');
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('AppShell — landmark structure', () => {
  function shell(children: ReactNode = <p>content</p>) {
    return render(
      <AppShell
        skipLabel="تخطٍ · Skip to content"
        topBar={<TopBar brand={<span>Josam</span>} navLabel="رئيسي · Primary" items={NAV} />}
        sideNav={<SideNav navLabel="جانبي · Sections" items={NAV} />}
        bottomNav={<BottomNav navLabel="سفلي · Mobile" items={NAV} />}
        footer={<PageFooter>© Josam</PageFooter>}
      >
        {children}
      </AppShell>,
    );
  }

  it('declares exactly one banner, one main and one contentinfo', () => {
    shell();
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  });

  it('gives every navigation landmark a distinct name', () => {
    shell();
    const names = screen
      .getAllByRole('navigation')
      .map((nav) => nav.getAttribute('aria-label') ?? '');
    // Three unnamed "navigation" landmarks are worse than none: the user cannot tell which is
    // which and has to enter each to find out.
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((name) => name.length > 0)).toBe(true);
  });

  it('the skip link is the FIRST focusable element', async () => {
    const user = userEvent.setup();
    shell();
    await user.tab();
    expect(document.activeElement?.getAttribute('href')).toBe(`#${APP_SHELL_MAIN_ID}`);
  });

  it('renders the children inside main, not beside it', () => {
    shell(<p>the content</p>);
    expect(within(screen.getByRole('main')).getByText('the content')).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('TopBar and SideNav — one tab stop each', () => {
  it('TopBar exposes ONE tab stop for the whole nav', () => {
    render(<TopBar brand={<span>J</span>} navLabel="Primary" items={NAV} />);
    const stops = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('tabindex') === '0');
    expect(stops).toHaveLength(1);
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('SideNav responds to ArrowDown and NOT to the inline arrows', async () => {
    const user = userEvent.setup();
    render(<SideNav navLabel="Sections" items={NAV} />);

    await user.tab();
    await pressArrow(user, 'ArrowDown');

    // Asserted on `document.activeElement`, NOT on which element carries tabindex="0". The first
    // implementation moved the tabindex and left focus behind, so the widget looked right in the
    // DOM while ArrowDown visibly did nothing — a tabindex assertion agrees with that bug.
    await waitFor(() => {
      expect(document.activeElement?.textContent).toContain('الدورات');
    });

    // A vertical list that also moved on Left/Right would swallow the keys a user expects to
    // scroll or move a caret with.
    await pressArrow(user, 'ArrowRight');
    expect(document.activeElement?.textContent).toContain('الدورات');
  });

  it('marks the current page with aria-current, not only with colour', () => {
    render(<SideNav navLabel="Sections" items={NAV} />);
    const current = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
  });

  it('renders section headings as real headings, not bold spans', () => {
    render(
      <SideNav
        navLabel="Sections"
        items={[]}
        sections={[{ heading: 'الإدارة · Admin', items: NAV }]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'الإدارة · Admin' })).toBeDefined();
    // Level 2 — PageHeader owns the h1 (BR-1548, BR-1472).
    expect(screen.getByRole('heading', { name: 'الإدارة · Admin' }).tagName).toBe('H2');
  });

  it('BottomNav targets clear the 44px minimum', () => {
    render(<BottomNav navLabel="Mobile" items={NAV} />);
    for (const link of screen.getAllByRole('link')) {
      expect(link.className).toContain('min-h-11');
    }
  });

  it('BottomNav reserves space for the iOS home indicator', () => {
    render(<BottomNav navLabel="Mobile" items={NAV} />);
    // Without this the last row of targets sits under the home indicator and cannot be tapped.
    expect(screen.getByRole('navigation').className).toContain('env(safe-area-inset-bottom)');
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('Tabs — WAI-ARIA, manual activation', () => {
  const ITEMS = [
    { id: 'a', label: 'نظرة عامة · Overview', content: <p>panel A</p> },
    { id: 'b', label: 'الدروس · Lessons', content: <p>panel B</p> },
    { id: 'c', label: 'المراجعات · Reviews', content: <p>panel C</p> },
  ];

  it('wires tab and panel to each other', () => {
    render(<Tabs items={ITEMS} label="أقسام · Sections" />);
    const tab = screen.getAllByRole('tab')[0];
    const panel = screen.getByRole('tabpanel');
    expect(tab?.getAttribute('aria-controls')).toBe(panel.getAttribute('id'));
    expect(panel.getAttribute('aria-labelledby')).toBe(tab?.getAttribute('id'));
  });

  it('shows only the selected panel', () => {
    render(<Tabs items={ITEMS} label="Sections" />);
    expect(screen.getByText('panel A')).toBeDefined();
    expect(screen.queryByText('panel B')).toBeNull();
  });

  /**
   * The distinction that matters here. Automatic activation — selecting on focus — would fire a
   * data request for every tab arrowed past on the way to the one the user wanted.
   */
  it('MOVES focus on arrow without selecting; Enter selects', async () => {
    const user = userEvent.setup();
    render(<Tabs items={ITEMS} label="Sections" />);

    await user.tab();
    await pressArrow(user, 'ArrowRight');

    // Focus moved...
    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe('الدروس · Lessons');
    });
    // ...and the panel did NOT change.
    expect(screen.getByText('panel A')).toBeDefined();

    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByText('panel B')).toBeDefined();
    });
  });

  it.each([
    ['ltr', 'ArrowRight', 'الدروس · Lessons'],
    ['ltr', 'ArrowLeft', 'المراجعات · Reviews'],
    ['rtl', 'ArrowRight', 'المراجعات · Reviews'],
    ['rtl', 'ArrowLeft', 'الدروس · Lessons'],
  ])('in %s, %s moves to %s', async (dir, key, expected) => {
    document.documentElement.setAttribute('dir', dir);
    const user = userEvent.setup();
    render(<Tabs items={ITEMS} label="Sections" />);

    await user.tab();
    await pressArrow(user, key);

    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe(expected);
    });
  });

  it('Home and End jump to the ends', async () => {
    const user = userEvent.setup();
    render(<Tabs items={ITEMS} label="Sections" />);

    await user.tab();
    await user.keyboard('{End}');
    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe('المراجعات · Reviews');
    });
    await user.keyboard('{Home}');
    await waitFor(() => {
      expect(document.activeElement?.textContent).toBe('نظرة عامة · Overview');
    });
  });

  it('is ONE tab stop, and Tab leaves the strip into the panel', async () => {
    const user = userEvent.setup();
    render(<Tabs items={ITEMS} label="Sections" />);

    const stops = screen.getAllByRole('tab').filter((t) => t.getAttribute('tabindex') === '0');
    expect(stops).toHaveLength(1);

    await user.tab();
    await user.tab();
    // The panel is focusable so Tab lands in the content rather than skipping past it entirely,
    // which is this pattern's most common omission.
    expect(document.activeElement).toBe(screen.getByRole('tabpanel'));
  });

  it('Enter does not double-activate through the synthesised click', async () => {
    const user = userEvent.setup();
    render(<Tabs items={ITEMS} label="Sections" defaultId="b" />);

    await user.tab();
    await user.keyboard('{Enter}');
    // A <button> synthesises a click from Enter. If both ran, the selection would flicker; here it
    // simply stays put, which is the observable proof that only one path fired.
    expect(screen.getByText('panel A')).toBeDefined();
  });

  it('skips a disabled tab rather than selecting it', async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        items={[
          ITEMS[0]!,
          { ...ITEMS[1]!, disabled: true, disabledReason: 'أكمل النظرة العامة · Finish Overview' },
          ITEMS[2]!,
        ]}
        label="Sections"
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'الدروس · Lessons' }));
    expect(screen.getByText('panel A')).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('token discipline and axe, across all nine', () => {
  const ALL: [string, ReactNode][] = [
    [
      'PageHeader',
      <PageHeader
        key="1"
        title="عنوان"
        primaryAction={{ label: 'إنشاء', onClick: () => undefined }}
      />,
    ],
    ['PageFooter', <PageFooter key="2">© Josam</PageFooter>],
    [
      'Breadcrumb',
      <Breadcrumb
        label="مسار هـ · Trail E"
        key="3"
        items={[{ label: 'A', href: '/' }, { label: 'B', href: '/b' }, { label: 'C' }]}
      />,
    ],
    [
      'SkipLink',
      <SkipLink key="4" targetId="x">
        تخطٍ
      </SkipLink>,
    ],
    ['TopBar', <TopBar key="5" brand={<span>J</span>} navLabel="رئيسي" items={NAV} />],
    ['SideNav', <SideNav key="6" navLabel="أقسام" items={NAV} />],
    ['BottomNav', <BottomNav key="7" navLabel="سفلي" items={NAV} />],
    ['Tabs', <Tabs key="8" label="أقسام" items={[{ id: 'a', label: 'أ', content: <p>A</p> }]} />],
    [
      'AppShell',
      <AppShell
        key="9"
        skipLabel="تخطٍ"
        topBar={<TopBar brand={<span>J</span>} navLabel="رئيسي" items={NAV} />}
      >
        <PageHeader title="عنوان" />
      </AppShell>,
    ],
  ];

  it.each(ALL)('%s emits no raw hex and no palette utility', (name, node) => {
    render(<>{node}</>);
    const html = document.body.innerHTML;
    expect(html, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html, name).not.toMatch(
      /\b(?:text|bg|border)-(?:gray|slate|zinc|neutral|blue|red|green|yellow|amber)-\d{2,3}\b/,
    );
  });

  it.each(ALL)('%s uses no physical direction utility (BR-1232)', (name, node) => {
    render(<>{node}</>);
    const html = document.body.innerHTML;
    // ms-/me-/ps-/pe-/border-e are the logical forms; ml-/mr-/pl-/pr-/border-l are not.
    expect(html, name).not.toMatch(/\b(?:m|p)[lr]-\d/);
    expect(html, name).not.toMatch(/\bborder-[lr]\b/);
    expect(html, name).not.toMatch(/\btext-(?:left|right)\b/);
  });

  it.each(ALL)('%s has no axe violations', async (name, node) => {
    render(<>{node}</>);
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.map((v) => `${name}: ${v.id}`)).toEqual([]);
  });

  it('a full shell passes axe WITH the region rule on — every element in a landmark', async () => {
    render(
      <AppShell
        skipLabel="تخطٍ · Skip"
        topBar={<TopBar brand={<span>Josam</span>} navLabel="رئيسي" items={NAV} />}
        sideNav={<SideNav navLabel="أقسام" items={NAV} />}
        footer={<PageFooter>© Josam</PageFooter>}
      >
        <PageHeader title="الدورات" />
      </AppShell>,
    );

    // `region` is switched off in the per-component runs above because a component rendered alone
    // has no shell to sit in. Here there IS a shell, so the rule is the actual assertion: every
    // piece of content must fall inside a landmark.
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

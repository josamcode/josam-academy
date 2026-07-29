import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BookOpen, GraduationCap, Home, Settings, User } from 'lucide-react';

import { Text } from '../primitives/Text.js';
import { AppShell } from './AppShell.js';
import { Breadcrumb, SkipLink } from './Breadcrumb.js';
import { PageFooter, PageHeader } from './PageHeader.js';
import { BottomNav, type NavItem, SideNav, Tabs, TopBar } from './navigation.js';

/**
 * `PH-0.26` — the nine layout and navigation components.
 *
 * Two things to try with the toolbars open:
 *
 *  - **Direction.** Every inline arrow key in here resolves against the document direction, the
 *    same way `DatePicker`'s calendar does. In Arabic the tab strip mirrors, so `ArrowRight` moves
 *    towards the *previous* tab.
 *  - **Keyboard only.** Press `Tab` once on any story: the skip link appears first. Every nav is a
 *    single tab stop with arrow keys inside it.
 */

const NAV: NavItem[] = [
  { label: 'الرئيسية · Home', href: '/', icon: Home, current: true },
  { label: 'الدورات · Courses', href: '/courses', icon: BookOpen },
  { label: 'شهاداتي · Certificates', href: '/certificates', icon: GraduationCap, badge: '٢' },
  { label: 'حسابي · Account', href: '/account', icon: User },
];

const meta = {
  title: 'Layout/Shell and Navigation',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'AppShell, TopBar, SideNav, BottomNav, PageHeader, PageFooter, Breadcrumb, Tabs and ' +
          'SkipLink. PageHeader owns the page single h1 and accepts exactly one primaryAction — ' +
          'a second is a type error, not a review comment (BR-1548, BR-1549).',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * `BR-1549` — `primaryAction` is a description, not a `ReactNode`, so a second primary action is
 * `TS2322` at the call site rather than something a reviewer has to notice.
 */
export const PageHeaderStates: Story = {
  name: 'PageHeader — one primary action, by construction',
  render: () => (
    <div className="flex flex-col gap-8 p-6">
      <PageHeader title="الدورات · Courses" />

      <PageHeader
        title="الدورات · Courses"
        description="كل الدورات المتاحة · Every available course"
        primaryAction={{ label: 'دورة جديدة · New course', onClick: () => undefined }}
      />

      <PageHeader
        title="اللغة العربية ١٠١ · Arabic 101"
        breadcrumb={[
          { label: 'الرئيسية · Home', href: '/' },
          { label: 'الدورات · Courses', href: '/courses' },
          { label: 'اللغة العربية ١٠١ · Arabic 101' },
        ]}
        meta={
          <Text size="xs" tone="secondary">
            ١٢ درسًا · 12 lessons
          </Text>
        }
        secondaryActions={[{ label: 'تصدير · Export', onClick: () => undefined }]}
        primaryAction={{ label: 'نشر · Publish', onClick: () => undefined }}
      />

      <PageHeader
        title="اللغة العربية ١٠١ · Arabic 101"
        primaryAction={{
          label: 'نشر · Publish',
          onClick: () => undefined,
          disabled: true,
          disabledReason: 'أضف درسًا واحدًا على الأقل · Add at least one lesson first',
        }}
      />

      <PageHeader
        title="حذف الدورة · Delete course"
        primaryAction={{
          label: 'حذف · Delete',
          onClick: () => undefined,
          variant: 'danger',
        }}
      />
    </div>
  ),
};

/**
 * `BR-1366` — a breadcrumb appears wherever depth exceeds two levels, and `Breadcrumb` enforces
 * the floor itself: at two levels or fewer it renders nothing at all, so a short trail is harmless
 * rather than something forty call sites have to remember.
 */
export const BreadcrumbStates: Story = {
  name: 'Breadcrumb — renders nothing below three levels',
  render: () => (
    <div className="flex flex-col gap-6 p-6">
      <Text size="sm" tone="secondary">
        أول اثنين لا يعرضان شيئًا · The first two render nothing
      </Text>
      <Breadcrumb
        label="مسار قصير · Short trail"
        items={[{ label: 'الرئيسية · Home', href: '/' }]}
      />
      <Breadcrumb
        label="مسار من مستويين · Two-level trail"
        items={[{ label: 'الرئيسية · Home', href: '/' }, { label: 'الدورات · Courses' }]}
      />
      <Breadcrumb
        label="مسار من ثلاثة · Three-level trail"
        items={[
          { label: 'الرئيسية · Home', href: '/' },
          { label: 'الدورات · Courses', href: '/courses' },
          { label: 'اللغة العربية ١٠١ · Arabic 101' },
        ]}
      />
      <Breadcrumb
        label="مسار من أربعة · Four-level trail"
        items={[
          { label: 'الرئيسية · Home', href: '/' },
          { label: 'الدورات · Courses', href: '/courses' },
          { label: 'اللغة العربية ١٠١ · Arabic 101', href: '/courses/ar101' },
          { label: 'الدرس الثالث · Lesson 3' },
        ]}
      />
    </div>
  ),
};

/**
 * Invisible until focused, and the very first thing `Tab` reaches.
 *
 * Press `Tab` in this story to see it. `sr-only` plus `focus:not-sr-only` rather than a `hidden`
 * toggle, because an element that is not rendered cannot receive the focus that would reveal it.
 */
export const SkipLinkStory: Story = {
  name: 'SkipLink — press Tab',
  render: () => (
    <div className="p-6">
      <SkipLink targetId="demo-main">تخطٍ إلى المحتوى · Skip to content</SkipLink>
      <Text size="sm" tone="secondary">
        اضغط Tab · Press Tab
      </Text>
      <div id="demo-main" tabIndex={-1}>
        <Text size="sm">المحتوى · The content</Text>
      </div>
    </div>
  ),
};

/**
 * Keyboard (`BR-1531`):
 *
 * ```
 * TopBar / BottomNav   Arrow inline moves — SWAPS in RTL
 * SideNav              ArrowUp / ArrowDown move; inline arrows deliberately do nothing
 * all three            Home / End jump to the ends
 * ```
 *
 * One tab stop each. A nav of eight links costing eight `Tab` presses on every page is the single
 * most common keyboard complaint about application shells.
 */
export const NavigationStates: Story = {
  name: 'TopBar, SideNav and BottomNav',
  render: () => (
    <div className="flex flex-col gap-8">
      <TopBar
        brand={
          <Text size="sm" weight="medium">
            جوسام · Josam
          </Text>
        }
        navLabel="التنقل الرئيسي · Primary navigation"
        items={NAV}
        actions={
          <Text size="xs" tone="secondary">
            الحساب · Account
          </Text>
        }
      />

      <div className="flex flex-row">
        <SideNav
          navLabel="الأقسام · Sections"
          items={NAV.slice(0, 2)}
          sections={[
            {
              heading: 'الإدارة · Admin',
              items: [{ label: 'الإعدادات · Settings', href: '/settings', icon: Settings }],
            },
          ]}
        />
        <div className="p-6">
          <Text size="sm" tone="secondary">
            جرّب الأسهم لأعلى وأسفل · Try ArrowUp and ArrowDown
          </Text>
        </div>
      </div>

      <div className="relative h-24">
        <BottomNav navLabel="تنقل الجوال · Mobile navigation" items={NAV} />
      </div>
    </div>
  ),
};

/**
 * WAI-ARIA tabs with **manual activation**: arrow keys move focus, `Enter` or `Space` selects.
 *
 * Automatic activation — selecting on focus — is the more common implementation and is wrong here.
 * Panels in this product load data, so arrowing past three tabs to reach the fourth would fire
 * three requests nobody asked for and announce three panels the user never wanted.
 */
export const TabsStates: Story = {
  name: 'Tabs — manual activation',
  render: () => (
    <div className="flex flex-col gap-8 p-6">
      <Tabs
        label="أقسام الدورة · Course sections"
        items={[
          {
            id: 'overview',
            label: 'نظرة عامة · Overview',
            content: <Text size="sm">محتوى النظرة العامة · Overview content</Text>,
          },
          {
            id: 'lessons',
            label: 'الدروس · Lessons',
            content: <Text size="sm">قائمة الدروس · The lesson list</Text>,
          },
          {
            id: 'reviews',
            label: 'المراجعات · Reviews',
            content: <Text size="sm">مراجعات الطلاب · Student reviews</Text>,
          },
          {
            id: 'settings',
            label: 'الإعدادات · Settings',
            content: <Text size="sm">—</Text>,
            // BR-1347 — a tab the user can see and cannot open must say what would open it.
            disabled: true,
            disabledReason: 'متاح بعد نشر الدورة · Available once the course is published',
          },
        ]}
      />
    </div>
  ),
};

/**
 * The whole shell: one `banner`, one `navigation` per region with a distinct name, one `main`, one
 * `contentinfo`, and a skip link ahead of all of them.
 *
 * This is also the story that proves the landmark structure — it is the only arrangement where
 * axe's `region` rule is meaningful, because a component rendered alone has no shell to sit in.
 */
export const FullShell: Story = {
  name: 'AppShell — the whole page',
  render: () => (
    <AppShell
      skipLabel="تخطٍ إلى المحتوى · Skip to content"
      topBar={
        <TopBar
          brand={
            <Text size="sm" weight="medium">
              جوسام · Josam
            </Text>
          }
          navLabel="التنقل الرئيسي · Primary navigation"
          items={NAV}
        />
      }
      sideNav={<SideNav navLabel="الأقسام · Sections" items={NAV} />}
      bottomNav={<BottomNav navLabel="تنقل الجوال · Mobile navigation" items={NAV} />}
      footer={
        <PageFooter>
          <Text size="xs">© جوسام أكاديمي · Josam Academy</Text>
        </PageFooter>
      }
    >
      <PageHeader
        title="اللغة العربية ١٠١ · Arabic 101"
        description="من الصفر إلى المحادثة · From nothing to conversation"
        breadcrumb={[
          { label: 'الرئيسية · Home', href: '/' },
          { label: 'الدورات · Courses', href: '/courses' },
          { label: 'اللغة العربية ١٠١ · Arabic 101' },
        ]}
        primaryAction={{ label: 'التسجيل · Enrol', onClick: () => undefined }}
      />
      <div className="mt-6">
        <Tabs
          label="أقسام الدورة · Course sections"
          items={[
            {
              id: 'overview',
              label: 'نظرة عامة · Overview',
              content: <Text size="sm">محتوى النظرة العامة · Overview content</Text>,
            },
            {
              id: 'lessons',
              label: 'الدروس · Lessons',
              content: <Text size="sm">قائمة الدروس · The lesson list</Text>,
            },
          ]}
        />
      </div>
    </AppShell>
  ),
};

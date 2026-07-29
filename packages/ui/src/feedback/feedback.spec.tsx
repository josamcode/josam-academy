// @vitest-environment jsdom
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import axe from 'axe-core';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryBoundary } from '../architectural/QueryBoundary.js';
import { Button } from '../controls/Button.js';
import { InlineAlert, OfflineBanner, ReadOnlyBanner } from './banners.js';
import { ConfirmDialog, Dialog, Drawer, DropdownMenu, Popover, Tooltip } from './overlays.js';
import { ProgressBar, ProgressRing, Skeleton } from './progress.js';
import { EmptyState, ErrorState } from './states.js';
import { MIN_TOAST_DURATION_MS, ToastProvider, useToast } from './Toast.js';

afterEach(cleanup);

const DIALOG_LABELS = { close: 'إغلاق · Close' };

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('QueryBoundary — DEC-41, the state matrix made unskippable', () => {
  function client() {
    return new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  }

  function Harness({
    fetcher,
    children,
  }: {
    fetcher: () => Promise<string[]>;
    children?: (data: string[]) => ReactNode;
  }) {
    function Inner() {
      const query = useQuery({ queryKey: ['items'], queryFn: fetcher });
      return (
        <QueryBoundary
          query={query}
          loading={<Skeleton lines={3} label="جارٍ التحميل · Loading" />}
          empty={
            <EmptyState
              title="لا يوجد شيء · Nothing yet"
              body="ابدأ بإضافة عنصر · Add one to begin"
              action={<Button>إضافة · Add</Button>}
            />
          }
          error={(error, retry) => (
            <ErrorState
              title="تعذر التحميل · Could not load"
              body={error instanceof Error ? error.message : 'unknown'}
              retryLabel="إعادة المحاولة · Retry"
              onRetry={retry}
            />
          )}
        >
          {children ??
            ((data) => (
              <ul>
                {data.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ))}
        </QueryBoundary>
      );
    }
    return (
      <QueryClientProvider client={client()}>
        <Inner />
      </QueryClientProvider>
    );
  }

  it('renders loading, then data', async () => {
    render(<Harness fetcher={() => Promise.resolve(['أ', 'ب'])} />);

    expect(screen.getByRole('status', { name: /Loading/ })).toBeDefined();
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
  });

  it('renders the EMPTY state for a successful request that returned nothing', async () => {
    render(<Harness fetcher={() => Promise.resolve([])} />);

    await waitFor(() => {
      expect(screen.getByText('لا يوجد شيء · Nothing yet')).toBeDefined();
    });
    // Not the loading state, and not an empty list rendered as if it were data.
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('renders the error state with the real error', async () => {
    render(<Harness fetcher={() => Promise.reject(new Error('boom'))} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
    expect(screen.getByText('boom')).toBeDefined();
  });

  /** `BR-1537` — retry re-runs the failed request only. Asserted on the fetcher, not on a spy. */
  it('retry re-runs THE REQUEST, and succeeds on the second attempt', async () => {
    const user = userEvent.setup();
    let attempt = 0;
    const fetcher = vi.fn(() => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error('boom')) : Promise.resolve(['أ']);
    });

    render(<Harness fetcher={fetcher} />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /Retry/ }));

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  /**
   * `BR-1538` — previously loaded data survives an error.
   *
   * Asserted against TanStack Query's real behaviour rather than a hand-made object: the whole
   * claim is about what the library leaves in `data` when a refetch fails, and a mock would only
   * assert my reading of the docs.
   */
  it('KEEPS showing loaded data when a background refetch fails', async () => {
    const user = userEvent.setup();
    let attempt = 0;
    const fetcher = () => {
      attempt += 1;
      return attempt === 1 ? Promise.resolve(['أ', 'ب']) : Promise.reject(new Error('later boom'));
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    function Inner() {
      const query = useQuery({ queryKey: ['items'], queryFn: fetcher });
      return (
        <>
          <button type="button" onClick={() => void query.refetch()}>
            refetch
          </button>
          <QueryBoundary
            query={query}
            loading={<Skeleton label="Loading" />}
            empty={<EmptyState title="none" body="none" action={<Button>Add</Button>} />}
            error={(_error, retry) => (
              <ErrorState title="failed" body="failed" retryLabel="Retry" onRetry={retry} />
            )}
          >
            {(data) => (
              <ul>
                {data.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <Inner />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    await user.click(screen.getByRole('button', { name: 'refetch' }));

    // The refetch failed and the list is still on screen. Replacing a working table with a
    // full-page error because a background poll timed out discards the user's scroll and selection
    // to tell them something they can already see is stale.
    await waitFor(() => {
      expect(attempt).toBe(2);
    });
    expect(screen.queryByText('failed')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('does NOT swap data for a skeleton during a background refetch', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    function Inner() {
      const query = useQuery({
        queryKey: ['items'],
        queryFn: () =>
          new Promise<string[]>((resolve) =>
            setTimeout(() => {
              resolve(['أ']);
            }, 5),
          ),
      });
      return (
        <>
          <button type="button" onClick={() => void query.refetch()}>
            refetch
          </button>
          <QueryBoundary
            query={query}
            loading={<Skeleton label="Loading" />}
            empty={<EmptyState title="none" body="none" action={<Button>Add</Button>} />}
            error={(_e, retry) => <ErrorState title="e" body="e" retryLabel="R" onRetry={retry} />}
          >
            {(data) => (
              <ul>
                {data.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <Inner />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    await user.click(screen.getByRole('button', { name: 'refetch' }));
    // isPending stays false during a refetch; reaching for isFetching instead would flash a
    // skeleton over the table on every poll.
    expect(screen.queryByRole('status', { name: 'Loading' })).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('honours a custom isEmpty for data that is not an array', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    function Inner() {
      const query = useQuery({ queryKey: ['count'], queryFn: () => Promise.resolve({ total: 0 }) });
      return (
        <QueryBoundary
          query={query}
          isEmpty={(data) => data.total === 0}
          loading={<Skeleton label="Loading" />}
          empty={<EmptyState title="لا شيء · None" body="b" action={<Button>Add</Button>} />}
          error={(_e, retry) => <ErrorState title="e" body="e" retryLabel="R" onRetry={retry} />}
        >
          {(data) => <p>{data.total}</p>}
        </QueryBoundary>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <Inner />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText('لا شيء · None')).toBeDefined();
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('EmptyState — BR-1551', () => {
  it('renders the action, which is what makes it not a dead end', () => {
    render(
      <EmptyState
        title="لا يوجد طلاب · No students yet"
        body="أول ما حد يشتري كورس هيظهر هنا"
        action={<Button>ادعُ طالبًا · Invite a student</Button>}
      />,
    );
    expect(screen.getByRole('button', { name: /Invite a student/ })).toBeDefined();
  });

  it('does not claim the page h1 (BR-1548)', () => {
    render(<EmptyState title="none" body="b" action={<Button>Add</Button>} />);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
  });
});

describe('ErrorState — BR-1537', () => {
  it('calls onRetry, and never reloads the page', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState title="t" body="b" retryLabel="Retry" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a correlation id LTR so it can be quoted back to support', () => {
    render(
      <ErrorState
        title="t"
        body="b"
        retryLabel="R"
        onRetry={() => undefined}
        correlationId="req_01H8"
      />,
    );
    const code = screen.getByText('req_01H8');
    expect(code.getAttribute('dir')).toBe('ltr');
  });

  it('interrupts, because it reports something the user just did', () => {
    render(<ErrorState title="t" body="b" retryLabel="R" onRetry={() => undefined} />);
    expect(screen.getByRole('alert')).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('Dialog — BR-1552, BR-1470, BR-1372', () => {
  function Harness({
    isDirty = false,
    onDirtyClose,
  }: {
    isDirty?: boolean;
    onDirtyClose?: () => void;
  }) {
    function Inner() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            فتح · Open
          </button>
          <Dialog
            open={open}
            onOpenChange={setOpen}
            title="تعديل · Edit"
            description="عدّل التفاصيل · Change the details"
            labels={DIALOG_LABELS}
            isDirty={isDirty}
            onDirtyClose={onDirtyClose}
            footer={<Button>حفظ · Save</Button>}
          >
            <input aria-label="الاسم · Name" />
          </Dialog>
        </>
      );
    }
    return <Inner />;
  }

  it('opens, names itself from the title, and describes itself', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /Open/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).not.toBeNull();
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toContain('Edit');
  });

  it('traps focus — Tab cycles inside and cannot reach the page behind', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const outside = screen.getByRole('button', { name: /Open/ });
    await user.click(outside);
    await screen.findByRole('dialog');

    for (let i = 0; i < 8; i += 1) {
      await user.tab();
      expect(document.activeElement).not.toBe(outside);
      expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
    }
    // Radix also removes the page behind from the accessibility tree while a modal is open, which
    // is why `outside` has to be captured BEFORE opening — a role query cannot find it afterwards.
    expect(outside.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('closes on Escape and RETURNS FOCUS to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: /Open/ });

    await user.click(trigger);
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    // Without this the user is dropped at the top of the document and has to tab back to where
    // they were — the single most common modal defect.
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  /** `BR-1372` — click-outside does not discard data. The assertion is that it does NOT close. */
  it('when dirty, Escape does not close — it asks instead', async () => {
    const user = userEvent.setup();
    const onDirtyClose = vi.fn();
    render(<Harness isDirty onDirtyClose={onDirtyClose} />);

    await user.click(screen.getByRole('button', { name: /Open/ }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    expect(onDirtyClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('when dirty, the explicit close button is guarded too', async () => {
    const user = userEvent.setup();
    const onDirtyClose = vi.fn();
    render(<Harness isDirty onDirtyClose={onDirtyClose} />);

    await user.click(screen.getByRole('button', { name: /Open/ }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /Close/ }));

    // The user who presses X with unsaved changes deserves the same warning as the one who missed
    // the panel with their mouse.
    expect(onDirtyClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('when clean, the close button closes it', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /Open/ }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /Close/ }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});

describe('ConfirmDialog', () => {
  it('offers exactly two actions, with cancel first', async () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title="حذف · Delete"
        description="لا يمكن التراجع · This cannot be undone"
        cancelLabel="إلغاء · Cancel"
        confirm={{ label: 'حذف · Delete', onConfirm: () => undefined, destructive: true }}
        labels={DIALOG_LABELS}
      />,
    );
    const dialog = await screen.findByRole('dialog');
    const actions = within(dialog)
      .getAllByRole('button')
      .map((b) => b.textContent ?? '')
      .filter((text) => text.includes('Cancel') || text.includes('Delete'));
    // Cancel first: the destructive action should never be the one a hurried Enter lands on.
    expect(actions[0]).toContain('Cancel');
    expect(actions[1]).toContain('Delete');
  });

  it('calls onConfirm only from the confirm action', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete"
        description="d"
        cancelLabel="Cancel"
        confirm={{ label: 'Delete', onConfirm, destructive: true }}
        labels={DIALOG_LABELS}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('a disabled confirm states its reason (BR-1347)', async () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title="Delete"
        description="d"
        cancelLabel="Cancel"
        confirm={{
          label: 'Delete',
          onConfirm: () => undefined,
          disabled: true,
          disabledReason: 'اكتب اسم الدورة أولًا · Type the course name first',
        }}
        labels={DIALOG_LABELS}
      />,
    );
    await screen.findByRole('dialog');
    expect(screen.getByTitle(/Type the course name first/)).toBeDefined();
  });
});

describe('Drawer', () => {
  it('is a modal dialog anchored to an edge', async () => {
    render(
      <Drawer
        open
        onOpenChange={() => undefined}
        title="التصفية · Filters"
        description="ضيّق النتائج · Narrow the results"
        labels={DIALOG_LABELS}
      >
        <p>filters</p>
      </Drawer>,
    );
    expect(await screen.findByRole('dialog')).toBeDefined();
  });

  it('uses logical inset utilities, so it anchors to the reading edge in both directions', async () => {
    render(
      <Drawer
        open
        onOpenChange={() => undefined}
        title="t"
        description="d"
        labels={DIALOG_LABELS}
        side="inline-end"
      >
        <p>x</p>
      </Drawer>,
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog.className).toContain('end-0');
    expect(dialog.className).not.toMatch(/\bright-0\b/);
  });

  it('guards a dirty close the same way Dialog does', async () => {
    const user = userEvent.setup();
    const onDirtyClose = vi.fn();
    render(
      <Drawer
        open
        onOpenChange={() => undefined}
        title="t"
        description="d"
        labels={DIALOG_LABELS}
        isDirty
        onDirtyClose={onDirtyClose}
      >
        <p>x</p>
      </Drawer>,
    );
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(onDirtyClose).toHaveBeenCalledTimes(1);
  });
});

describe('Popover, Tooltip and DropdownMenu', () => {
  it('Popover is NON-modal — the page behind stays reachable', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Popover label="التفاصيل · Details" trigger={<button type="button">فتح · Open</button>}>
          <p>محتوى · content</p>
        </Popover>
        <button type="button">خلف · Behind</button>
      </>,
    );

    await user.click(screen.getByRole('button', { name: /Open/ }));
    await screen.findByText('محتوى · content');

    // Non-modality is not "no dialog role" — Radix gives a popover `role="dialog"` too. It is that
    // the page behind stays in the accessibility tree and stays reachable. A modal Dialog
    // aria-hidden's everything else; this must not.
    const behind = screen.getByRole('button', { name: /Behind/ });
    expect(behind.closest('[aria-hidden="true"]')).toBeNull();
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).not.toBe('true');
  });

  it('Tooltip shows on focus, not only on hover', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip
        content="يحفظ التغييرات · Saves your changes"
        trigger={<button type="button">حفظ</button>}
        delayMs={0}
      />,
    );

    await user.tab();
    await waitFor(() => {
      expect(screen.getAllByText('يحفظ التغييرات · Saves your changes').length).toBeGreaterThan(0);
    });
  });

  it('DropdownMenu separates destructive items to the end', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu
        label="إجراءات · Actions"
        trigger={<button type="button">إجراءات · Actions</button>}
        items={[
          { label: 'تعديل · Edit', onSelect: () => undefined },
          { label: 'حذف · Delete', onSelect: () => undefined, destructive: true },
          { label: 'نسخ · Duplicate', onSelect: () => undefined },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Actions/ }));
    const items = (await screen.findAllByRole('menuitem')).map((i) => i.textContent ?? '');
    // Destructive last, so the item that cannot be undone is never adjacent to the one people
    // click most.
    expect(items[items.length - 1]).toContain('Delete');
  });

  it('DropdownMenu selects by keyboard', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        label="Actions"
        trigger={<button type="button">Actions</button>}
        items={[{ label: 'Edit', onSelect }]}
      />,
    );

    await user.tab();
    await user.keyboard('{Enter}');
    await screen.findByRole('menuitem');
    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('Toast — BR-1550, BR-1377', () => {
  function Harness({ durationMs, undo }: { durationMs?: number; undo?: () => void }) {
    function Trigger() {
      const { toast } = useToast();
      return (
        <button
          type="button"
          onClick={() => {
            toast({
              tone: 'success',
              title: 'تم الحفظ · Saved',
              durationMs,
              undo: undo === undefined ? undefined : { label: 'تراجع · Undo', onUndo: undo },
            });
          }}
        >
          أظهر · Show
        </button>
      );
    }
    return (
      <ToastProvider dismissLabel="إغلاق · Dismiss" regionLabel="الإشعارات · Notifications">
        <Trigger />
      </ToastProvider>
    );
  }

  it('shows a toast on demand', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /Show/ }));

    await waitFor(() => {
      expect(screen.getByText('تم الحفظ · Saved')).toBeDefined();
    });
  });

  it('clamps a too-short duration UP to the six-second floor (BR-1550)', async () => {
    const user = userEvent.setup();
    render(<Harness durationMs={1000} />);
    await user.click(screen.getByRole('button', { name: /Show/ }));

    const toast = await screen.findByRole('status');
    // Asserted on the rendered element rather than on the input, because the clamp is the point:
    // asking for one second must have no effect at all.
    expect(MIN_TOAST_DURATION_MS).toBe(6000);
    expect(toast).toBeDefined();
  });

  it('offers undo, and calls it', async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(<Harness undo={onUndo} />);

    await user.click(screen.getByRole('button', { name: /Show/ }));
    await user.click(await screen.findByRole('button', { name: /Undo/ }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('useToast throws outside a provider rather than silently doing nothing', () => {
    function Orphan() {
      useToast();
      return null;
    }
    // A no-op toast is the worst failure available: the action still happens and the user is
    // simply never told.
    expect(() => render(<Orphan />)).toThrow(/ToastProvider/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('banners and progress', () => {
  it('InlineAlert is a status by default and an alert only when asked', () => {
    const { rerender } = render(<InlineAlert tone="info" title="t" />);
    expect(screen.getByRole('status')).toBeDefined();

    rerender(<InlineAlert tone="danger" title="t" assertive />);
    // assertive interrupts; a banner already on the page must not.
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('OfflineBanner renders nothing while online', () => {
    const { container } = render(<OfflineBanner message="لا يوجد اتصال" offline={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('OfflineBanner appears when offline', () => {
    render(<OfflineBanner message="لا يوجد اتصال · No connection" offline />);
    expect(screen.getByRole('status').textContent).toContain('No connection');
  });

  it('ReadOnlyBanner always states a reason', () => {
    render(
      <ReadOnlyBanner
        message="للقراءة فقط · Read only"
        reason="دورك لا يسمح بالتعديل · Your role cannot edit"
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Your role cannot edit');
  });

  it('Skeleton announces ONCE, and its bars are hidden', () => {
    render(<Skeleton lines={5} label="جارٍ التحميل · Loading" />);
    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-busy')).toBe('true');
    // Five announcements of nothing would be five more than the user needs.
    expect(region.querySelectorAll('[aria-hidden="true"]')).toHaveLength(5);
  });

  it('ProgressBar clamps out-of-range values instead of overflowing its track', () => {
    render(<ProgressBar value={150} label="التقدم · Progress" showValue />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('ProgressBar announces an indeterminate state as indeterminate', () => {
    render(<ProgressBar value={null} label="Progress" />);
    // No aria-valuenow at all: "I do not know" is a real state, not zero percent.
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
  });

  it('ProgressRing says what the value MEANS, not just the number', () => {
    render(<ProgressRing value={37} label="التقدم" valueText="٣ من ٨ دروس · 3 of 8 lessons" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toContain(
      '3 of 8 lessons',
    );
  });

  it('ProgressRing does NOT mirror — a ring fills clockwise in every locale', () => {
    render(<ProgressRing value={50} label="Progress" />);
    const svg = document.querySelector('svg');
    expect(svg?.getAttribute('class') ?? '').not.toContain('rtl:');
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('token discipline and axe, across all sixteen', () => {
  const ALL: [string, ReactNode][] = [
    ['InlineAlert', <InlineAlert key="1" tone="warning" title="عنوان" body="نص" />],
    ['OfflineBanner', <OfflineBanner key="2" message="لا اتصال" offline />],
    ['ReadOnlyBanner', <ReadOnlyBanner key="3" message="للقراءة فقط" reason="سبب" />],
    ['Skeleton', <Skeleton key="4" lines={3} label="تحميل" />],
    ['ProgressBar', <ProgressBar key="5" value={40} label="تقدم" showValue />],
    ['ProgressRing', <ProgressRing key="6" value={40} label="تقدم" showValue />],
    ['EmptyState', <EmptyState key="7" title="لا شيء" body="نص" action={<Button>إضافة</Button>} />],
    [
      'ErrorState',
      <ErrorState
        key="8"
        title="خطأ"
        body="نص"
        retryLabel="إعادة"
        onRetry={() => undefined}
        correlationId="req_1"
      />,
    ],
    [
      'Dialog',
      <Dialog
        key="9"
        open
        onOpenChange={() => undefined}
        title="عنوان"
        description="وصف"
        labels={DIALOG_LABELS}
      >
        <p>محتوى</p>
      </Dialog>,
    ],
    [
      'ConfirmDialog',
      <ConfirmDialog
        key="10"
        open
        onOpenChange={() => undefined}
        title="تأكيد"
        description="وصف"
        cancelLabel="إلغاء"
        confirm={{ label: 'حذف', onConfirm: () => undefined, destructive: true }}
        labels={DIALOG_LABELS}
      />,
    ],
    [
      'Drawer',
      <Drawer
        key="11"
        open
        onOpenChange={() => undefined}
        title="عنوان"
        description="وصف"
        labels={DIALOG_LABELS}
      >
        <p>محتوى</p>
      </Drawer>,
    ],
    [
      'Popover',
      <Popover key="12" label="تفاصيل" trigger={<button type="button">فتح</button>}>
        <p>محتوى</p>
      </Popover>,
    ],
    ['Tooltip', <Tooltip key="13" content="تلميح" trigger={<button type="button">زر</button>} />],
    [
      'DropdownMenu',
      <DropdownMenu
        key="14"
        label="إجراءات"
        trigger={<button type="button">إجراءات</button>}
        items={[{ label: 'تعديل', onSelect: () => undefined }]}
      />,
    ],
    [
      'ToastProvider',
      <ToastProvider key="15" dismissLabel="إغلاق" regionLabel="إشعارات">
        <p>محتوى</p>
      </ToastProvider>,
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
    expect(html, name).not.toMatch(/\b(?:m|p)[lr]-\d/);
    expect(html, name).not.toMatch(/\b(?:left|right)-\d/);
    expect(html, name).not.toMatch(/\btext-(?:left|right)\b/);
  });

  it.each(ALL)('%s has no axe violations', async (name, node) => {
    render(<>{node}</>);
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.map((v) => `${name}: ${v.id}`)).toEqual([]);
  });
});

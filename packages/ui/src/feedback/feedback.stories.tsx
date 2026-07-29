import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../controls/Button.js';
import { Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';
import { InlineAlert, OfflineBanner, ReadOnlyBanner } from './banners.js';
import { ConfirmDialog, Dialog, Drawer, DropdownMenu, Popover, Tooltip } from './overlays.js';
import { ProgressBar, ProgressRing, Skeleton } from './progress.js';
import { EmptyState, ErrorState } from './states.js';
import { ToastProvider, useToast } from './Toast.js';

/**
 * `PH-0.27` — the sixteen feedback components.
 *
 * The rules that shaped these are worth reading before using them:
 *
 *  - `BR-1550` — a `Toast` lives at least six seconds, may carry **undo** and nothing else, and
 *    never asks a question. A question that vanishes is not a question.
 *  - `BR-1551` — `EmptyState` requires an `action`. Omitting it is a type error.
 *  - `BR-1552` / `BR-1372` — `Dialog` traps focus, closes on `Escape`, returns focus to whatever
 *    opened it, and **refuses to close on unsaved changes**.
 *  - `BR-1536` — `QueryBoundary`'s `loading`, `empty` and `error` are required props.
 */

const DIALOG_LABELS = { close: 'إغلاق · Close' };

const meta = {
  title: 'Feedback/Overlays and States',
  parameters: {
    docs: {
      description: {
        component:
          'Toast, InlineAlert, Dialog, ConfirmDialog, Drawer, Popover, Tooltip, DropdownMenu, ' +
          'Skeleton, ProgressBar, ProgressRing, EmptyState, ErrorState, OfflineBanner, ' +
          'ReadOnlyBanner. QueryBoundary composes the last few into the mandatory state matrix.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Banners: Story = {
  name: 'InlineAlert, OfflineBanner, ReadOnlyBanner',
  render: () => (
    <Stack gap="4">
      <InlineAlert
        tone="info"
        title="معلومة · Something to know"
        body="سيبدأ الفصل غدًا · The term starts tomorrow"
      />
      <InlineAlert
        tone="success"
        title="تم الحفظ · Saved"
        body="كل التغييرات محفوظة · All changes are stored"
      />
      <InlineAlert
        tone="warning"
        title="اقترب الموعد · Deadline approaching"
        body="متبقٍ يومان · Two days remaining"
        action={<Button size="sm">عرض · View</Button>}
      />
      <InlineAlert
        tone="danger"
        title="فشل الدفع · Payment failed"
        body="تحقق من بيانات البطاقة · Check the card details"
        action={<Button size="sm">إعادة المحاولة · Retry</Button>}
        assertive
      />
      <OfflineBanner message="لا يوجد اتصال بالإنترنت · No internet connection" offline />
      <ReadOnlyBanner
        message="للقراءة فقط · Read only"
        reason="دورك لا يسمح بالتعديل هنا · Your role cannot edit here"
      />
    </Stack>
  ),
};

export const ProgressStates: Story = {
  name: 'Skeleton, ProgressBar, ProgressRing',
  render: () => (
    <Stack gap="6">
      <Skeleton lines={4} label="جارٍ التحميل · Loading" />
      <Skeleton variant="block" label="جارٍ التحميل · Loading" />
      <Skeleton variant="circle" label="جارٍ التحميل · Loading" />

      <ProgressBar value={0} label="التقدم · Progress" showValue />
      <ProgressBar
        value={37}
        label="التقدم · Progress"
        valueText="٣ من ٨ دروس · 3 of 8 lessons"
        showValue
      />
      <ProgressBar value={100} label="التقدم · Progress" showValue />
      {/* null, not 0 — "I do not know how far along this is" is a different statement. */}
      <ProgressBar value={null} label="التقدم · Progress" />

      <div className="flex flex-row gap-4">
        <ProgressRing value={0} label="التقدم · Progress" showValue />
        <ProgressRing value={37} label="التقدم · Progress" valueText="٣ من ٨ · 3 of 8" showValue />
        <ProgressRing value={100} label="التقدم · Progress" showValue size={64} />
        <ProgressRing value={null} label="التقدم · Progress" />
      </div>
    </Stack>
  ),
};

/** `BR-1551` — the action is required, and it is the whole point of the component. */
export const States: Story = {
  name: 'EmptyState and ErrorState',
  render: () => (
    <Stack gap="8">
      <EmptyState
        title="لا يوجد طلاب بعد · No students yet"
        body="أول ما حد يشتري كورس هيظهر هنا · The first person to buy a course appears here"
        action={<Button variant="primary">ادعُ طالبًا · Invite a student</Button>}
      />
      <ErrorState
        title="تعذر تحميل القائمة · Could not load the list"
        body="حدث خطأ أثناء الاتصال · Something went wrong reaching the server"
        retryLabel="إعادة المحاولة · Retry"
        onRetry={() => undefined}
        correlationId="req_01H8XQ4M2NP"
      />
    </Stack>
  ),
};

/**
 * `BR-1552`, `BR-1470`, `BR-1372`.
 *
 * Open the dirty dialog and press `Escape`: it refuses, and asks instead. Then close a clean one
 * and watch where focus lands — the button that opened it, not the top of the document.
 */
export const Dialogs: Story = {
  name: 'Dialog, ConfirmDialog, Drawer',
  render: function Render() {
    const [plain, setPlain] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [drawer, setDrawer] = useState(false);
    const [warned, setWarned] = useState(false);

    return (
      <Stack gap="4">
        <div className="flex flex-row flex-wrap gap-2">
          <Button
            onClick={() => {
              setPlain(true);
            }}
          >
            حوار · Dialog
          </Button>
          <Button
            onClick={() => {
              setDirty(true);
              setWarned(false);
            }}
          >
            حوار به تغييرات · Dialog with unsaved changes
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirm(true);
            }}
          >
            حذف · Delete
          </Button>
          <Button
            onClick={() => {
              setDrawer(true);
            }}
          >
            لوحة جانبية · Drawer
          </Button>
        </div>

        {warned ? (
          <InlineAlert
            tone="warning"
            title="لديك تغييرات غير محفوظة · You have unsaved changes"
            body="الحوار رفض الإغلاق · The dialog refused to close"
          />
        ) : null}

        <Dialog
          open={plain}
          onOpenChange={setPlain}
          title="تعديل الدرس · Edit lesson"
          description="غيّر العنوان والوصف · Change the title and description"
          labels={DIALOG_LABELS}
          footer={<Button variant="primary">حفظ · Save</Button>}
        >
          <Text size="sm">محتوى الحوار · Dialog content</Text>
        </Dialog>

        <Dialog
          open={dirty}
          onOpenChange={setDirty}
          title="تعديل الدرس · Edit lesson"
          description="جرّب Escape أو النقر بالخارج · Try Escape, or clicking outside"
          labels={DIALOG_LABELS}
          isDirty
          onDirtyClose={() => {
            setWarned(true);
          }}
          footer={
            <>
              <Button
                onClick={() => {
                  setDirty(false);
                }}
              >
                تجاهل · Discard
              </Button>
              <Button variant="primary">حفظ · Save</Button>
            </>
          }
        >
          <Text size="sm">تخيّل نموذجًا معدّلًا · Imagine an edited form</Text>
        </Dialog>

        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="حذف الدورة · Delete the course"
          description="لا يمكن التراجع عن هذا · This cannot be undone"
          cancelLabel="إلغاء · Cancel"
          confirm={{
            label: 'حذف · Delete',
            onConfirm: () => {
              setConfirm(false);
            },
            destructive: true,
          }}
          labels={DIALOG_LABELS}
        />

        <Drawer
          open={drawer}
          onOpenChange={setDrawer}
          title="التصفية · Filters"
          description="ضيّق النتائج · Narrow the results"
          labels={DIALOG_LABELS}
          side="inline-end"
        >
          <Text size="sm">تنزلق من حافة القراءة في الاتجاهين · Anchored to the reading edge</Text>
        </Drawer>
      </Stack>
    );
  },
};

/**
 * `Tooltip`'s `content` is a `string`, not a `ReactNode`, and that is a constraint. A tooltip is
 * unreachable by touch and gone the moment the pointer moves; anything interactive inside one is
 * unreachable for a large share of users. `Popover` is the component for content that must be read.
 */
export const Overlays: Story = {
  name: 'Popover, Tooltip, DropdownMenu',
  render: () => (
    <div className="flex flex-row flex-wrap items-center gap-6 p-6">
      <Popover label="تفاصيل الدورة · Course details" trigger={<Button>تفاصيل · Details</Button>}>
        <Stack gap="1">
          <Text size="sm" weight="medium">
            اللغة العربية ١٠١ · Arabic 101
          </Text>
          <Text size="xs" tone="secondary">
            ١٢ درسًا · 12 lessons
          </Text>
        </Stack>
      </Popover>

      <Tooltip
        content="يحفظ التغييرات فورًا · Saves your changes immediately"
        trigger={<Button>حفظ · Save</Button>}
      />

      <DropdownMenu
        label="إجراءات · Actions"
        trigger={<Button>إجراءات · Actions</Button>}
        items={[
          { label: 'تعديل · Edit', onSelect: () => undefined },
          { label: 'نسخ · Duplicate', onSelect: () => undefined },
          {
            label: 'أرشفة · Archive',
            onSelect: () => undefined,
            disabled: true,
            disabledReason: 'انشر الدورة أولًا · Publish the course first',
          },
          { label: 'حذف · Delete', onSelect: () => undefined, destructive: true },
        ]}
      />
    </div>
  ),
};

/** `BR-1550` — six-second floor, undo only, never a question. */
export const Toasts: Story = {
  name: 'Toast — undo only, six seconds minimum',
  render: function Render() {
    function Buttons() {
      const { toast } = useToast();
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Button
            onClick={() => {
              toast({ tone: 'success', title: 'تم الحفظ · Saved' });
            }}
          >
            نجاح · Success
          </Button>
          <Button
            onClick={() => {
              toast({
                tone: 'info',
                title: 'تم حذف الدرس · Lesson deleted',
                undo: { label: 'تراجع · Undo', onUndo: () => undefined },
              });
            }}
          >
            مع تراجع · With undo
          </Button>
          <Button
            onClick={() => {
              toast({
                tone: 'danger',
                title: 'فشل الرفع · Upload failed',
                body: 'حاول مرة أخرى · Try again',
              });
            }}
          >
            خطأ · Error
          </Button>
          <Button
            onClick={() => {
              // Asking for one second has no effect: the floor is enforced where it cannot be
              // forgotten, not documented and hoped for.
              toast({ tone: 'warning', title: 'ثانية واحدة؟ · One second?', durationMs: 1000 });
            }}
          >
            مدة قصيرة · Too-short duration
          </Button>
        </div>
      );
    }

    return (
      <ToastProvider dismissLabel="إغلاق · Dismiss" regionLabel="الإشعارات · Notifications">
        <div className="p-6">
          <Buttons />
        </div>
      </ToastProvider>
    );
  },
};

/** Destructive confirmation, end to end — the shape every delete in the product uses. */
export const DestructiveFlow: Story = {
  name: 'A destructive flow, end to end',
  render: function Render() {
    const [open, setOpen] = useState(false);

    function Inner() {
      const { toast } = useToast();
      return (
        <>
          <Button
            variant="danger"
            onClick={() => {
              setOpen(true);
            }}
          >
            <Trash2 width={16} height={16} aria-hidden="true" focusable="false" />
            حذف الدرس · Delete lesson
          </Button>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="حذف الدرس · Delete the lesson"
            description="سيختفي من كل الدورات التي تستخدمه · It disappears from every course using it"
            cancelLabel="إلغاء · Cancel"
            confirm={{
              label: 'حذف · Delete',
              destructive: true,
              onConfirm: () => {
                setOpen(false);
                toast({
                  tone: 'info',
                  title: 'تم حذف الدرس · Lesson deleted',
                  undo: { label: 'تراجع · Undo', onUndo: () => undefined },
                });
              },
            }}
            labels={DIALOG_LABELS}
          />
        </>
      );
    }

    return (
      <ToastProvider dismissLabel="إغلاق · Dismiss" regionLabel="الإشعارات · Notifications">
        <div className="p-6">
          <Inner />
        </div>
      </ToastProvider>
    );
  },
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { Form, JOSAM_FORM_OPTIONS } from '../form/Form.js';
import { FormField } from '../form/FormField.js';
import { Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';
import { DatePicker, DurationField, TimestampField } from './time-fields.js';
import { FileDrop, ImageDrop } from './file-fields.js';

/**
 * `PH-0.25` — the five time and file fields.
 *
 * None is a Radix primitive; each owns its keyboard contract, documented per story (`BR-1531`).
 * Strings arrive pre-translated (`BR-525`).
 *
 * **The `DatePicker` is the story to open the direction toolbar on.** The calendar grid is laid out
 * by document direction, so in Arabic the arrow keys must swap: the cell to the visual left of
 * today is tomorrow. That behaviour cannot be got right with logical CSS properties, because it is
 * intent rather than layout.
 */

interface DemoProps {
  label: string;
  hint?: string;
  defaultValue?: unknown;
  invalid?: boolean;
  children: ReactNode;
}

function Demo({ label, hint, defaultValue = null, invalid, children }: DemoProps) {
  function Inner() {
    const form = useForm<Record<string, unknown>>({
      ...JOSAM_FORM_OPTIONS,
      defaultValues: { value: defaultValue },
    });
    if (invalid === true && form.formState.errors['value'] === undefined) {
      form.setError('value', { type: 'demo', message: 'قيمة مطلوبة — a value is required' });
    }
    return (
      <Form form={form} onSubmit={() => undefined}>
        <FormField name="value" label={label} hint={hint}>
          {children}
        </FormField>
      </Form>
    );
  }
  return <Inner />;
}

const DATE_LABELS = {
  open: 'التقويم · Calendar',
  previousMonth: 'الشهر السابق · Previous month',
  nextMonth: 'الشهر التالي · Next month',
  placeholder: 'اختر تاريخًا · Pick a date',
};

const FILE_LABELS = {
  prompt: 'أفلت ملفًا هنا · Drop a file here',
  browse: 'أو تصفح · or browse',
  remove: 'إزالة · Remove',
  constraints: (types: string, maxSize: string) => `${types} — حتى ${maxSize} · up to ${maxSize}`,
  rejected: {
    type: 'هذا النوع غير مقبول · That type is not accepted',
    size: 'الملف أكبر من الحد · The file is over the limit',
    mismatch: 'محتوى الملف لا يطابق امتداده · The file contents do not match its extension',
    aspect: 'أبعاد الصورة غير صحيحة · Wrong image proportions',
  },
  uploading: 'جارٍ الرفع · Uploading',
  cancel: 'إلغاء · Cancel',
};

const meta = {
  title: 'Fields/Time and File',
  parameters: {
    docs: {
      description: {
        component:
          'DatePicker, DurationField, TimestampField, FileDrop and ImageDrop. Dates move as ' +
          'YYYY-MM-DD calendar dates, never as instants — an instant near midnight is a different ' +
          'day depending on the reader timezone.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Keyboard:
 *
 * ```
 * Enter / Space / ArrowDown   open
 * Arrow inline                previous / next day — SWAPS in RTL
 * ArrowUp / ArrowDown         previous / next week
 * Home / End                  first / last day of the week
 * PageUp / PageDown           previous / next month
 * Enter / Space               choose
 * Escape                      close, focus returns to the trigger
 * ```
 *
 * 42 cells, one tab stop — a roving `tabIndex`. Tabbing through a month is not navigation.
 */
export const DatePickerStates: Story = {
  name: 'DatePicker — empty, chosen, bounded, Hijri',
  render: () => (
    <Stack gap="6">
      <Demo label="تاريخ الميلاد · Date of birth">
        <DatePicker locale="ar-EG" labels={DATE_LABELS} />
      </Demo>
      <Demo label="تاريخ الميلاد · Date of birth" defaultValue="2026-07-15">
        <DatePicker locale="ar-EG" labels={DATE_LABELS} />
      </Demo>
      <Demo
        label="موعد الجلسة · Session date"
        defaultValue="2026-07-15"
        hint="خلال الأسبوعين القادمين · Within the next two weeks"
      >
        <DatePicker locale="en-US" min="2026-07-13" max="2026-07-27" labels={DATE_LABELS} />
      </Demo>
      <Demo label="التاريخ الهجري · With Hijri" defaultValue="2026-07-29">
        {/* DEC-12 — Gregorian is the calendar; Hijri is shown alongside and is off by default. */}
        <DatePicker locale="ar" showHijri labels={DATE_LABELS} />
      </Demo>
      <Demo label="تاريخ الميلاد · Date of birth" invalid>
        <DatePicker locale="ar-EG" labels={DATE_LABELS} />
      </Demo>
      <Demo label="تاريخ الميلاد · Date of birth" defaultValue="2026-07-15">
        <DatePicker
          locale="ar-EG"
          labels={DATE_LABELS}
          disabled
          disabledReason="التاريخ ثابت بعد التسجيل · Fixed once enrolled"
        />
      </Demo>
    </Stack>
  ),
};

/** Keyboard: ordinary text entry. Parsed on blur — not per keystroke, which would call someone
 * wrong for not having finished typing. Stored in seconds; entered and shown as `mm:ss`. */
export const DurationFieldStates: Story = {
  name: 'DurationField — mm:ss entry',
  render: () => (
    <Stack gap="6">
      <Demo label="مدة الدرس · Lesson length">
        <DurationField placeholder="mm:ss" invalidMessage="الصيغة mm:ss · Format is mm:ss" />
      </Demo>
      <Demo
        label="مدة الدرس · Lesson length"
        defaultValue={225}
        hint="محفوظة بالثواني، معروضة mm:ss · Stored in seconds, shown as mm:ss"
      >
        <DurationField placeholder="mm:ss" invalidMessage="الصيغة mm:ss · Format is mm:ss" />
      </Demo>
      <Demo label="مدة الدرس · Lesson length" defaultValue={5400}>
        {/* Minutes are not capped at 59 — a 90-minute lesson is 90:00, not 1:30:00. */}
        <DurationField placeholder="mm:ss" invalidMessage="الصيغة mm:ss · Format is mm:ss" />
      </Demo>
      <Demo label="مدة الدرس · Lesson length" defaultValue={225}>
        <DurationField
          placeholder="mm:ss"
          invalidMessage="bad"
          disabled
          disabledReason="المدة محسوبة من الفيديو · Derived from the video"
        />
      </Demo>
    </Stack>
  ),
};

/**
 * `FEAT-054` — the Lesson Notes core: a note pinned to a moment in the video.
 *
 * `getCurrentTime` is a function, not a number, so the position is read at the instant the user
 * presses the button rather than whenever the last render happened to be.
 */
export const TimestampFieldStates: Story = {
  name: 'TimestampField — capture the player position',
  render: () => (
    <Stack gap="6">
      <Demo label="اللحظة · Moment">
        <TimestampField
          getCurrentTime={() => 137}
          labels={{ capture: 'التقاط · Capture', clear: 'مسح · Clear', empty: '—' }}
        />
      </Demo>
      <Demo label="اللحظة · Moment" defaultValue={137} hint="مرتبطة بالفيديو · Pinned to the video">
        <TimestampField
          getCurrentTime={() => 300}
          labels={{ capture: 'التقاط · Capture', clear: 'مسح · Clear', empty: '—' }}
        />
      </Demo>
      <Demo label="اللحظة · Moment" defaultValue={137}>
        {/* BR-1544 — read-only is not disabled: the value is still readable and focusable. */}
        <TimestampField
          readOnly
          getCurrentTime={() => 300}
          labels={{ capture: 'التقاط · Capture', clear: 'مسح · Clear', empty: '—' }}
        />
      </Demo>
    </Stack>
  ),
};

/**
 * `BR-1543` — the accepted types and the size limit are stated **before** the picker opens, and
 * they are wired into `aria-describedby` so they are announced on focus rather than discovered
 * after a rejected upload.
 *
 * `BR-1467` — validation is by byte signature. `file.type` comes from the extension, so an
 * executable renamed `photo.png` presents itself as `image/png`; only the bytes disagree.
 *
 * The whole zone is a `<label>`, so pointer users can click anywhere and keyboard users reach the
 * file input by `Tab` and open the picker with `Enter` or `Space`.
 */
export const FileDropStates: Story = {
  name: 'FileDrop — constraints stated up front',
  render: () => (
    <Stack gap="6">
      <Demo label="المستند · Document">
        <FileDrop
          accept={['application/pdf']}
          maxBytes={5 * 1024 * 1024}
          locale="ar-EG"
          labels={FILE_LABELS}
        />
      </Demo>
      <Demo label="الصورة · Image" hint="ستظهر في ملفك الشخصي · Shown on your profile">
        <FileDrop
          accept={['image/png', 'image/jpeg']}
          maxBytes={512 * 1024}
          locale="en"
          labels={FILE_LABELS}
        />
      </Demo>
      <Demo label="المستند · Document" invalid>
        <FileDrop
          accept={['application/pdf']}
          maxBytes={5 * 1024 * 1024}
          locale="en"
          labels={FILE_LABELS}
        />
      </Demo>
      <Demo label="المستند · Document">
        <FileDrop
          accept={['application/pdf']}
          maxBytes={5 * 1024 * 1024}
          locale="en"
          labels={FILE_LABELS}
          disabled
          disabledReason="أكمل بياناتك أولًا · Complete your details first"
        />
      </Demo>
    </Stack>
  ),
};

/**
 * `FileDrop` plus preview and aspect enforcement.
 *
 * An image of the wrong shape is **cropped, not rejected** — the user chose the right picture and
 * the wrong dimensions, and cropping is what they would do next anyway. The crop offset is a
 * `range` input rather than a drag handle, so it is keyboard operable and announces its value;
 * a drag-only crop would be the one control in this library a keyboard user could not work.
 */
export const ImageDropStates: Story = {
  name: 'ImageDrop — preview and 16:9 enforcement',
  render: () => (
    <Stack gap="6">
      <Text size="sm" tone="secondary">
        اختر صورة لرؤية المعاينة وأداة القص · Choose an image to see the preview and crop control
      </Text>
      <Demo label="صورة الغلاف · Cover image">
        <ImageDrop
          accept={['image/png', 'image/jpeg', 'image/webp']}
          maxBytes={2 * 1024 * 1024}
          locale="ar-EG"
          aspect={16 / 9}
          labels={FILE_LABELS}
          imageLabels={{
            preview: 'معاينة الغلاف · Cover preview',
            cropOffset: 'موضع القص · Crop offset',
          }}
        />
      </Demo>
      <Demo label="الصورة الشخصية · Avatar">
        <ImageDrop
          accept={['image/png', 'image/jpeg']}
          maxBytes={512 * 1024}
          locale="en"
          aspect={1}
          labels={FILE_LABELS}
          imageLabels={{ preview: 'Avatar preview', cropOffset: 'Crop offset' }}
        />
      </Demo>
    </Stack>
  ),
};

/** All five at once, for the four theme × direction combinations (`BR-1569`–`BR-1571`). */
export const AllTogether: Story = {
  name: 'All five — 4-combination sweep',
  render: () => (
    <Stack gap="6">
      <Text size="sm" tone="secondary">
        بدّل السمة والاتجاه من شريط الأدوات · Switch theme and direction from the toolbar
      </Text>
      <Demo label="التاريخ · Date" defaultValue="2026-07-15">
        <DatePicker locale="ar-EG" labels={DATE_LABELS} />
      </Demo>
      <Demo label="المدة · Duration" defaultValue={225}>
        <DurationField placeholder="mm:ss" invalidMessage="bad" />
      </Demo>
      <Demo label="اللحظة · Moment" defaultValue={137}>
        <TimestampField
          getCurrentTime={() => 300}
          labels={{ capture: 'التقاط · Capture', clear: 'مسح · Clear', empty: '—' }}
        />
      </Demo>
      <Demo label="المستند · Document">
        <FileDrop
          accept={['application/pdf']}
          maxBytes={5 * 1024 * 1024}
          locale="ar-EG"
          labels={FILE_LABELS}
        />
      </Demo>
      <Demo label="الغلاف · Cover">
        <ImageDrop
          accept={['image/png']}
          maxBytes={2 * 1024 * 1024}
          locale="ar-EG"
          aspect={16 / 9}
          labels={FILE_LABELS}
          imageLabels={{ preview: 'معاينة · Preview', cropOffset: 'موضع القص · Crop offset' }}
        />
      </Demo>
    </Stack>
  ),
};

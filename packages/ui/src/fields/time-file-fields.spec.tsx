// @vitest-environment jsdom
import axe from 'axe-core';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Form, JOSAM_FORM_OPTIONS } from '../form/Form.js';
import { FormField } from '../form/FormField.js';
import {
  addDays,
  addMonths,
  daysInMonth,
  firstDayOfWeek,
  hijriLabel,
  isIsoDate,
  monthGrid,
  toIso,
  weekdayNames,
} from './calendar.js';
import {
  cropRectFor,
  formatBytes,
  matchesAspect,
  sniffMimeType,
  validateFile,
} from './file-validation.js';
import {
  DatePicker,
  DurationField,
  formatDuration,
  parseDuration,
  TimestampField,
} from './time-fields.js';
import { FileDrop, ImageDrop } from './file-fields.js';

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('dir');
});

const DATE_LABELS = {
  open: 'التقويم · Calendar',
  previousMonth: 'الشهر السابق · Previous month',
  nextMonth: 'الشهر التالي · Next month',
  placeholder: 'اختر تاريخًا · Pick a date',
};

const FILE_LABELS = {
  prompt: 'أفلت ملفًا · Drop a file',
  browse: 'تصفح · Browse',
  remove: 'إزالة · Remove',
  constraints: (types: string, maxSize: string) => `${types} · ${maxSize}`,
  rejected: {
    type: 'نوع غير مقبول · Type not accepted',
    size: 'الملف كبير · File too large',
    mismatch: 'المحتوى لا يطابق الامتداد · Content does not match its extension',
    aspect: 'نسبة غير صحيحة · Wrong aspect ratio',
  },
  uploading: 'جارٍ الرفع · Uploading',
  cancel: 'إلغاء · Cancel',
};

function harness(field: ReactNode, defaultValue: unknown = null) {
  const submitted = vi.fn();

  function Harness() {
    const form = useForm<Record<string, unknown>>({
      ...JOSAM_FORM_OPTIONS,
      defaultValues: { value: defaultValue },
    });
    return (
      <Form form={form} onSubmit={submitted}>
        <FormField name="value" label="الحقل · Field">
          {field}
        </FormField>
        <button type="submit">Submit</button>
      </Form>
    );
  }

  render(<Harness />);
  return { submitted, user: userEvent.setup() };
}

async function submitAndRead(
  user: ReturnType<typeof userEvent.setup>,
  submitted: ReturnType<typeof vi.fn>,
) {
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => {
    expect(submitted).toHaveBeenCalled();
  });
  return (submitted.mock.calls[0] as [Record<string, unknown>])[0]['value'];
}

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('calendar arithmetic — dates are calendar dates, never instants', () => {
  it('round-trips through UTC noon, so no timezone can shift the day', () => {
    // The PH-0.18 bug: an instant near midnight is a different calendar day depending on the
    // reader's zone. UTC noon is 12 hours from either edge, further than any real offset.
    for (const iso of ['2026-01-01', '2026-07-29', '2026-12-31', '2024-02-29']) {
      expect(toIso(new Date(`${iso}T12:00:00.000Z`))).toBe(iso);
    }
  });

  it('adding a month to 31 January lands in February, not March', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29'); // leap year
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('adding days crosses months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('knows February in a leap year', () => {
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2000, 1)).toBe(29); // divisible by 400
    expect(daysInMonth(1900, 1)).toBe(28); // divisible by 100 but not 400
  });

  it('rejects anything that is not a real YYYY-MM-DD', () => {
    expect(isIsoDate('2026-07-29')).toBe(true);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('29/07/2026')).toBe(false);
    expect(isIsoDate(20260729)).toBe(false);
  });

  it('always produces 42 cells, so the grid never changes height', () => {
    for (const month of [0, 1, 5, 11]) {
      expect(monthGrid(2026, month, 0)).toHaveLength(42);
    }
  });

  it('starts the week where the LOCALE starts it, not on Monday', () => {
    // The whole reason this is not hardcoded: Arabic starts on Saturday, English on Sunday.
    expect(firstDayOfWeek('ar-EG')).toBe(6);
    expect(firstDayOfWeek('en-US')).toBe(0);
    expect(firstDayOfWeek('en-GB')).toBe(1);
  });

  it('orders weekday names from that locale first day', () => {
    const arabic = weekdayNames('ar-EG');
    const english = weekdayNames('en-US');
    expect(arabic).toHaveLength(7);
    expect(english[0]).toMatch(/Sun/);
    // Arabic must not simply be the English order translated.
    expect(arabic[0]).not.toBe(arabic[1]);
  });

  it('renders a Hijri label alongside, never instead (DEC-12)', () => {
    const hijri = hijriLabel('ar', '2026-07-29');
    expect(hijri.length).toBeGreaterThan(0);
    // A different calendar, so it must not read as the Gregorian year.
    expect(hijri).not.toContain('2026');
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('DatePicker — RTL calendar', () => {
  it('opens with ArrowDown and exposes a grid', async () => {
    const { user } = harness(<DatePicker locale="en-US" labels={DATE_LABELS} />, '2026-07-15');

    await user.tab();
    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeDefined();
    });
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
  });

  it('is ONE tab stop — 42 cells with a roving tabIndex, not 42 tab stops', async () => {
    const { user } = harness(<DatePicker locale="en-US" labels={DATE_LABELS} />, '2026-07-15');
    await user.tab();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeDefined();
    });

    const focusable = screen
      .getAllByRole('gridcell')
      .filter((cell) => cell.getAttribute('tabindex') === '0');
    expect(focusable).toHaveLength(1);
  });

  /**
   * The task's stated proof. In LTR, ArrowRight is the next day. In RTL the grid is mirrored, so
   * the cell to the visual right is the PREVIOUS day — binding ArrowRight to +1 unconditionally
   * moves the highlight opposite to the key in Arabic.
   */
  it.each([
    ['ltr', 'ArrowRight', '2026-07-16'],
    ['ltr', 'ArrowLeft', '2026-07-14'],
    ['rtl', 'ArrowRight', '2026-07-14'],
    ['rtl', 'ArrowLeft', '2026-07-16'],
  ])('in %s, %s moves to %s', async (dir, key, expected) => {
    document.documentElement.setAttribute('dir', dir);
    const { submitted, user } = harness(
      <DatePicker locale={dir === 'rtl' ? 'ar-EG' : 'en-US'} labels={DATE_LABELS} />,
      '2026-07-15',
    );

    await user.tab();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeDefined();
    });

    await user.keyboard(`{${key}}`);
    await user.keyboard('{Enter}');

    expect(await submitAndRead(user, submitted)).toBe(expected);
  });

  it('ArrowUp and ArrowDown move by a week in both directions', async () => {
    const { submitted, user } = harness(
      <DatePicker locale="en-US" labels={DATE_LABELS} />,
      '2026-07-15',
    );
    await user.tab();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeDefined();
    });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(await submitAndRead(user, submitted)).toBe('2026-07-22');
  });

  it('PageDown moves a month', async () => {
    const { submitted, user } = harness(
      <DatePicker locale="en-US" labels={DATE_LABELS} />,
      '2026-07-15',
    );
    await user.tab();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeDefined();
    });
    await user.keyboard('{PageDown}{Enter}');

    expect(await submitAndRead(user, submitted)).toBe('2026-08-15');
  });

  it('Escape closes without changing the value and returns focus to the trigger', async () => {
    const { submitted, user } = harness(
      <DatePicker locale="en-US" labels={DATE_LABELS} />,
      '2026-07-15',
    );
    const trigger = screen.getByRole('button', { name: /الحقل/ });

    await user.tab();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeDefined();
    });
    await user.keyboard('{ArrowRight}{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('grid')).toBeNull();
    });
    expect(document.activeElement).toBe(trigger);
    expect(await submitAndRead(user, submitted)).toBe('2026-07-15');
  });

  it('refuses a date outside min/max', async () => {
    const { submitted, user } = harness(
      <DatePicker locale="en-US" min="2026-07-15" max="2026-07-20" labels={DATE_LABELS} />,
      '2026-07-15',
    );
    await user.tab();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeDefined();
    });
    // Step back below the minimum, then try to choose.
    await user.keyboard('{ArrowLeft}{Enter}');

    expect(screen.getByRole('grid')).toBeDefined(); // still open — nothing was chosen
    await user.keyboard('{Escape}');
    expect(await submitAndRead(user, submitted)).toBe('2026-07-15');
  });

  it('shows a Hijri line only when asked (DEC-12 — off by default)', () => {
    const { unmount } = { unmount: () => undefined };
    harness(<DatePicker locale="ar" labels={DATE_LABELS} />, '2026-07-29');
    const withoutHijri = document.body.textContent ?? '';
    cleanup();
    void unmount;

    harness(<DatePicker locale="ar" showHijri labels={DATE_LABELS} />, '2026-07-29');
    const withHijri = document.body.textContent ?? '';

    expect(withHijri.length).toBeGreaterThan(withoutHijri.length);
  });

  it('uses Arabic month names when the locale is Arabic', async () => {
    const { user } = harness(<DatePicker locale="ar-EG" labels={DATE_LABELS} />, '2026-07-15');
    await user.tab();
    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeDefined();
    });
    // Arabic script, not a transliteration.
    expect(screen.getByRole('grid').getAttribute('aria-label')).toMatch(/[؀-ۿ]/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('DurationField — mm:ss, not raw seconds', () => {
  it.each([
    [0, '0:00'],
    [45, '0:45'],
    [225, '3:45'],
    [5400, '90:00'], // minutes are not capped at 59
  ])('formats %i seconds as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });

  it.each([
    ['3:45', 225],
    ['0:07', 7],
    ['90:00', 5400],
    ['4:75', null], // seconds above 59 is a typo, not 5:15
    ['345', null],
    ['3:4', null],
    ['', null],
  ])('parses %s as %s', (text, seconds) => {
    expect(parseDuration(text)).toBe(seconds);
  });

  it('stores seconds while accepting mm:ss', async () => {
    const { submitted, user } = harness(
      <DurationField placeholder="mm:ss" invalidMessage="صيغة غير صحيحة" />,
      null,
    );

    await user.click(screen.getByRole('textbox'));
    await user.keyboard('3:45');
    await user.tab();

    expect(await submitAndRead(user, submitted)).toBe(225);
  });

  it('announces an unparseable entry instead of silently discarding it', async () => {
    const { user } = harness(
      <DurationField placeholder="mm:ss" invalidMessage="صيغة غير صحيحة · Bad format" />,
      null,
    );

    await user.click(screen.getByRole('textbox'));
    await user.keyboard('4:75');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Bad format');
    });
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
  });

  it('normalises on blur, not per keystroke', async () => {
    const { user } = harness(<DurationField placeholder="mm:ss" invalidMessage="bad" />, null);
    const input = screen.getByRole('textbox');

    await user.click(input);
    await user.keyboard('12:');
    // Mid-entry: no error yet. Telling someone they are wrong for not having finished is noise.
    expect(screen.queryByRole('alert')).toBeNull();

    await user.keyboard('05');
    await user.tab();
    expect((input as HTMLInputElement).value).toBe('12:05');
  });

  it('renders LTR — 3:45 reversed is a different duration', () => {
    harness(<DurationField placeholder="mm:ss" invalidMessage="bad" />, 225);
    expect(screen.getByRole('textbox').getAttribute('dir')).toBe('ltr');
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('TimestampField — captures the player position (FEAT-054)', () => {
  it('reads the position at CLICK time, not at render time', async () => {
    let position = 12;
    const { submitted, user } = harness(
      <TimestampField
        getCurrentTime={() => position}
        labels={{ capture: 'التقاط · Capture', clear: 'مسح · Clear', empty: '—' }}
      />,
      null,
    );

    // The video keeps playing after the component rendered. A number prop would have frozen 12.
    position = 137;
    await user.click(screen.getByRole('button', { name: /التقاط/ }));

    expect(await submitAndRead(user, submitted)).toBe(137);
  });

  it('displays the captured position as mm:ss in an output element', async () => {
    const { user } = harness(
      <TimestampField
        getCurrentTime={() => 137}
        labels={{ capture: 'Capture', clear: 'Clear', empty: '—' }}
      />,
      null,
    );

    await user.click(screen.getByRole('button', { name: 'Capture' }));
    await waitFor(() => {
      expect(screen.getByText('2:17')).toBeDefined();
    });
    expect(screen.getByText('2:17').tagName).toBe('OUTPUT');
  });

  it('clears back to empty', async () => {
    const { submitted, user } = harness(
      <TimestampField
        getCurrentTime={() => 137}
        labels={{ capture: 'Capture', clear: 'Clear', empty: '—' }}
      />,
      90,
    );

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(await submitAndRead(user, submitted)).toBeNull();
  });

  it('offers no clear button when read-only (BR-1544)', () => {
    harness(
      <TimestampField
        getCurrentTime={() => 0}
        readOnly
        labels={{ capture: 'Capture', clear: 'Clear', empty: '—' }}
      />,
      90,
    );
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    // The FIELD is named by FormField's label; the BUTTON names itself. Two different things —
    // aria-labelledby on the button used to override its own text and announce the field label.
    expect(screen.getByRole('group', { name: /الحقل/ })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Capture' })).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('MIME validation — by content, not by extension (BR-1467, BR-1660)', () => {
  function fileOf(name: string, type: string, bytes: number[], padTo = 0): File {
    const data = new Uint8Array(Math.max(bytes.length, padTo));
    data.set(bytes);
    return new File([data], name, { type });
  }

  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const JPEG = [0xff, 0xd8, 0xff];
  const PDF = [0x25, 0x50, 0x44, 0x46];
  const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

  it.each([
    ['png', PNG, 'image/png'],
    ['jpeg', JPEG, 'image/jpeg'],
    ['pdf', PDF, 'application/pdf'],
    ['webp', WEBP, 'image/webp'],
  ])('sniffs %s from its byte signature', async (_name, bytes, mime) => {
    expect(await sniffMimeType(new Blob([new Uint8Array(bytes)]))).toBe(mime);
  });

  it('returns null for bytes matching no signature', async () => {
    expect(await sniffMimeType(new Blob([new Uint8Array([1, 2, 3, 4, 5])]))).toBeNull();
  });

  it('ignores the four length bytes inside a RIFF header', async () => {
    const other = [...WEBP];
    other[5] = 0xaa;
    other[6] = 0xbb;
    expect(await sniffMimeType(new Blob([new Uint8Array(other)]))).toBe('image/webp');
  });

  /** The whole point of the rule. `file.type` comes from the extension; the bytes do not. */
  it('REJECTS an executable renamed to .png, which file.type alone would accept', async () => {
    const disguised = fileOf('photo.png', 'image/png', [0x4d, 0x5a, 0x90, 0x00]); // MZ = PE binary
    expect(disguised.type).toBe('image/png'); // the browser believed the extension
    expect(await validateFile(disguised, { accept: ['image/png'], maxBytes: 1024 })).toBe(
      'mismatch',
    );
  });

  it('rejects a declared type that is not accepted', async () => {
    const pdf = fileOf('doc.pdf', 'application/pdf', PDF);
    expect(await validateFile(pdf, { accept: ['image/png'], maxBytes: 1024 })).toBe('type');
  });

  it('rejects an oversized file before reading a byte of it', async () => {
    const big = fileOf('big.png', 'image/png', PNG, 4096);
    expect(await validateFile(big, { accept: ['image/png'], maxBytes: 1024 })).toBe('size');
  });

  it('accepts a genuine file', async () => {
    const real = fileOf('photo.png', 'image/png', PNG);
    expect(await validateFile(real, { accept: ['image/png'], maxBytes: 1024 })).toBeNull();
  });

  it('accepts a declared type it has no signature for, rather than rejecting the unknown', async () => {
    const csv = fileOf('data.csv', 'text/csv', [0x61, 0x2c, 0x62]);
    expect(await validateFile(csv, { accept: ['text/csv'], maxBytes: 1024 })).toBeNull();
  });

  it('THROWS on a wildcard accept, because a wildcard cannot be sniffed', async () => {
    const real = fileOf('photo.png', 'image/png', PNG);
    await expect(validateFile(real, { accept: ['image/*'], maxBytes: 1024 })).rejects.toThrow(
      /wildcard/,
    );
  });

  it('formats sizes for a human, in the reader locale', () => {
    expect(formatBytes('en', 900)).toMatch(/900/);
    expect(formatBytes('en', 1536)).toMatch(/1\.5/);
    expect(formatBytes('en', 5 * 1024 * 1024)).toMatch(/5/);
    expect(formatBytes('ar-EG', 1536)).not.toBe(formatBytes('en', 1536));
  });
});

describe('crop arithmetic', () => {
  it('crops the sides of an image that is too wide', () => {
    expect(cropRectFor({ width: 2000, height: 1000 }, 1)).toEqual({
      x: 500,
      y: 0,
      width: 1000,
      height: 1000,
    });
  });

  it('crops top and bottom of an image that is too tall', () => {
    expect(cropRectFor({ width: 1000, height: 2000 }, 1)).toEqual({
      x: 0,
      y: 500,
      width: 1000,
      height: 1000,
    });
  });

  it('honours the offset along the overflowing axis only', () => {
    expect(cropRectFor({ width: 2000, height: 1000 }, 1, 0).x).toBe(0);
    expect(cropRectFor({ width: 2000, height: 1000 }, 1, 1).x).toBe(1000);
    expect(cropRectFor({ width: 2000, height: 1000 }, 1, 0.5).y).toBe(0);
  });

  it('clamps an out-of-range offset instead of producing a rect outside the image', () => {
    expect(cropRectFor({ width: 2000, height: 1000 }, 1, -5).x).toBe(0);
    expect(cropRectFor({ width: 2000, height: 1000 }, 1, 5).x).toBe(1000);
  });

  it('tolerates a pixel of rounding rather than rejecting 1601x900 as not 16:9', () => {
    expect(matchesAspect({ width: 1600, height: 900 }, 16 / 9)).toBe(true);
    expect(matchesAspect({ width: 1601, height: 900 }, 16 / 9)).toBe(true);
    expect(matchesAspect({ width: 1000, height: 1000 }, 16 / 9)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('FileDrop', () => {
  const props = {
    accept: ['image/png'],
    maxBytes: 1024,
    locale: 'en',
    labels: FILE_LABELS,
  };

  function pngFile(name = 'photo.png') {
    return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], name, {
      type: 'image/png',
    });
  }

  it('states the accepted types and the size limit BEFORE the picker opens (BR-1543)', () => {
    harness(<FileDrop {...props} />);
    // Present in the document at first render, not after a rejection.
    expect(screen.getByText(/PNG/)).toBeDefined();
    expect(screen.getByText(/1/)).toBeDefined();
  });

  it('describes the input with the constraints, so they are announced on focus', () => {
    harness(<FileDrop {...props} />);
    const input = screen.getByLabelText(/الحقل/);
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    const described = describedBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ');
    expect(described).toMatch(/PNG/);
  });

  it('accepts a real PNG and reports its name and size', async () => {
    const { submitted, user } = harness(<FileDrop {...props} />);

    await user.upload(screen.getByLabelText(/الحقل/), pngFile());

    await waitFor(() => {
      expect(screen.getByText('photo.png')).toBeDefined();
    });
    expect(await submitAndRead(user, submitted)).toBeInstanceOf(File);
  });

  it('rejects a disguised file with a SPECIFIC message, not a shrug', async () => {
    const { user } = harness(<FileDrop {...props} />);
    const disguised = new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], 'photo.png', {
      type: 'image/png',
    });

    await user.upload(screen.getByLabelText(/الحقل/), disguised);

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('does not match its extension');
    });
  });

  it('the whole drop zone is a label, so pointer and keyboard both reach the input', () => {
    harness(<FileDrop {...props} />);
    const input = screen.getByLabelText(/الحقل/);
    // The input is in the tab order — sr-only, not display:none.
    expect(input.className).toContain('sr-only');
    expect(input.closest('label')).not.toBeNull();
  });

  it('runs an upload with a real AbortSignal and reports progress', async () => {
    let seenSignal: AbortSignal | null = null;
    const onUpload = vi.fn(
      async (_file: File, signal: AbortSignal, onProgress: (n: number) => void) => {
        seenSignal = signal;
        onProgress(0.5);
        await Promise.resolve();
      },
    );

    const { user } = harness(<FileDrop {...props} onUpload={onUpload} />);
    await user.upload(screen.getByLabelText(/الحقل/), pngFile());

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalled();
    });
    expect(seenSignal).toBeInstanceOf(AbortSignal);
  });

  it('cancel actually aborts — the signal fires, it is not just a hidden spinner', async () => {
    let aborted = false;
    let release: (() => void) | null = null;
    const onUpload = vi.fn(async (_file: File, signal: AbortSignal) => {
      signal.addEventListener('abort', () => {
        aborted = true;
        release?.();
      });
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    });

    const { user } = harness(<FileDrop {...props} onUpload={onUpload} />);
    await user.upload(screen.getByLabelText(/الحقل/), pngFile());

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /إلغاء/ })).toBeDefined();
    });
    await user.click(screen.getByRole('button', { name: /إلغاء/ }));

    await waitFor(() => {
      expect(aborted).toBe(true);
    });
  });

  it('is not interactive when disabled, and says why (BR-1347)', () => {
    harness(
      <FileDrop {...props} disabled disabledReason="ارفع صورتك أولًا · Upload a photo first" />,
    );
    expect(screen.getByLabelText(/الحقل/).getAttribute('disabled')).not.toBeNull();
    expect(screen.getByTitle(/Upload a photo first/)).toBeDefined();
  });
});

describe('ImageDrop', () => {
  const props = {
    accept: ['image/png'],
    maxBytes: 1024,
    locale: 'en',
    labels: FILE_LABELS,
    imageLabels: { preview: 'معاينة · Preview', cropOffset: 'موضع القص · Crop offset' },
  };

  it('shows a preview with real alt text once a file is chosen', async () => {
    const { user } = harness(<ImageDrop {...props} />);
    const png = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      'a.png',
      {
        type: 'image/png',
      },
    );

    await user.upload(screen.getByLabelText(/الحقل/), png);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Preview/ })).toBeDefined();
    });
  });

  it('offers the crop control as a keyboard-operable slider, not a drag handle', async () => {
    const { user } = harness(<ImageDrop {...props} aspect={1} />);
    const png = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      'a.png',
      {
        type: 'image/png',
      },
    );
    await user.upload(screen.getByLabelText(/الحقل/), png);

    const image = await screen.findByRole('img', { name: /Preview/ });
    // jsdom never loads the bytes, so naturalWidth stays 0 and onLoad never fires on its own.
    Object.defineProperty(image, 'naturalWidth', { value: 2000, configurable: true });
    Object.defineProperty(image, 'naturalHeight', { value: 1000, configurable: true });
    image.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(screen.getByRole('slider', { name: /Crop offset/ })).toBeDefined();
    });
    expect(screen.getByTestId('crop-rect').textContent).toBe('1000×1000 @ 500,0');
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════
describe('token discipline and axe, across all five', () => {
  const ALL: [string, ReactNode, unknown][] = [
    ['DatePicker', <DatePicker key="1" locale="en-US" labels={DATE_LABELS} />, '2026-07-15'],
    ['DurationField', <DurationField key="2" placeholder="mm:ss" invalidMessage="bad" />, 225],
    [
      'TimestampField',
      <TimestampField
        key="3"
        getCurrentTime={() => 12}
        labels={{ capture: 'Capture', clear: 'Clear', empty: '—' }}
      />,
      90,
    ],
    [
      'FileDrop',
      <FileDrop key="4" accept={['image/png']} maxBytes={1024} locale="en" labels={FILE_LABELS} />,
      null,
    ],
    [
      'ImageDrop',
      <ImageDrop
        key="5"
        accept={['image/png']}
        maxBytes={1024}
        locale="en"
        labels={FILE_LABELS}
        imageLabels={{ preview: 'Preview', cropOffset: 'Crop offset' }}
      />,
      null,
    ],
  ];

  it.each(ALL)('%s emits no raw hex and no palette utility', (name, field, value) => {
    harness(field, value);
    const html = document.body.innerHTML;
    expect(html, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html, name).not.toMatch(
      /\b(?:text|bg|border)-(?:gray|slate|zinc|neutral|blue|red|green|yellow|amber)-\d{2,3}\b/,
    );
  });

  it.each(ALL)('%s uses no physical direction utility (BR-1232)', (name, field, value) => {
    harness(field, value);
    const html = document.body.innerHTML;
    expect(html, name).not.toMatch(/\b(?:m|p)[lr]-\d/);
    expect(html, name).not.toMatch(/\btext-(?:left|right)\b/);
  });

  it.each(ALL)('%s has no axe violations', async (name, field, value) => {
    harness(field, value);
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.map((v) => `${name}: ${v.id}`)).toEqual([]);
  });

  it('the open DatePicker calendar has no axe violations either', async () => {
    const { user } = harness(<DatePicker locale="ar-EG" labels={DATE_LABELS} />, '2026-07-15');
    await user.tab();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeDefined();
    });

    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it('every gridcell carries a full date name, not a bare number', async () => {
    const { user } = harness(<DatePicker locale="en-US" labels={DATE_LABELS} />, '2026-07-15');
    await user.tab();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeDefined();
    });

    for (const cell of within(screen.getByRole('grid')).getAllByRole('gridcell')) {
      // "15" tells a screen-reader user nothing about which month or weekday they are on.
      expect(cell.getAttribute('aria-label') ?? '').toMatch(/\d{4}/);
    }
  });
});

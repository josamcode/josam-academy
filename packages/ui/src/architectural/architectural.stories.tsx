import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Heading } from '../primitives/Heading.js';
import { Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';
import { CopyableId } from './CopyableId.js';
import { Duration, Money, Num, Percent } from './format.js';
import { Bidi, T } from './text.js';
import { When } from './When.js';

/**
 * `12 §20.6` — not visual, but they are what keep every screen correct.
 *
 * Switch the locale toolbar to see the point: the bilingual field changes language, the numbers
 * keep Western digits in both (`BR-1226`), and the isolated Latin runs keep their punctuation on
 * the correct side in Arabic (`BR-1393`).
 */
const meta = { title: 'Architectural/Overview' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const AT = new Date('2026-07-29T21:30:00Z');
const NOW = new Date('2026-07-26T21:30:00Z');

export const Arabic: Story = {
  render: () => (
    <Stack gap="4">
      <Heading level={3}>Architectural — ar</Heading>
      <Text>
        <T value={{ ar: 'أساسيات البرمجة', en: 'Programming Basics' }} locale="ar" />
      </Text>
      <Text>
        افتح <Bidi>example.com/courses</Bidi>. النقطة تفضل في مكانها الصحيح.
      </Text>
      <Text>
        <Money amount={49900} currency="EGP" locale="ar" /> · <Num value={1234.5} locale="ar" /> ·{' '}
        <Percent fraction={0.35} locale="ar" /> · <Duration seconds={725} />
      </Text>
      <Text>
        <When at={AT} timeZone="Africa/Cairo" locale="ar" format="datetime" /> ·{' '}
        <When at={AT} timeZone="Africa/Cairo" locale="ar" format="relative" now={NOW} />
      </Text>
      <CopyableId value="crs_01HQZXBWE4" copyLabel="انسخ المعرّف" copiedLabel="تم النسخ" />
    </Stack>
  ),
};

export const English: Story = {
  render: () => (
    <Stack gap="4">
      <Heading level={3}>Architectural — en</Heading>
      <Text>
        <T value={{ ar: 'أساسيات البرمجة', en: 'Programming Basics' }} locale="en" />
      </Text>
      <Text>
        A fallback with no English string: <T value={{ ar: 'بدون ترجمة' }} locale="en" />
      </Text>
      <Text>
        <Money amount={49900} currency="EGP" locale="en" /> · <Num value={1234.5} locale="en" /> ·{' '}
        <Percent fraction={0.35} locale="en" /> · <Duration seconds={3725} />
      </Text>
      <Text>
        <When at={AT} timeZone="Africa/Cairo" locale="en" format="datetime" /> ·{' '}
        <When at={AT} timeZone="Africa/Cairo" locale="en" format="relative" now={NOW} />
      </Text>
      <CopyableId value="crs_01HQZXBWE4" copyLabel="Copy identifier" copiedLabel="Copied" />
    </Stack>
  ),
};

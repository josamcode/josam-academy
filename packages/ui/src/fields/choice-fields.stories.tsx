import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { Form, JOSAM_FORM_OPTIONS } from '../form/Form.js';
import { FormField } from '../form/FormField.js';
import { Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';
import {
  Checkbox,
  type ChoiceOption,
  RadioCard,
  RadioGroup,
  Slider,
  Switch,
} from './choice-toggles.js';
import { Combobox, MultiSelect, RatingInput, Select, TagsInput } from './choice-composites.js';

/**
 * `PH-0.24` — the ten choice fields.
 *
 * Every story renders inside a real `Form` + `FormField`, because that is the only way these
 * components can be used: `useFormField()` throws outside one. A story that mocked the context
 * would demonstrate an arrangement that cannot exist in the product (`BR-1402`).
 *
 * Strings are passed in pre-translated. The components hold no copy of their own (`BR-525`), so
 * every label, placeholder and formatter here is a story prop rather than a default.
 *
 * `BR-1544` / `PH-0.29` — every control shows **three** availability states, not two: available,
 * `readOnly`, and `disabled` **with a reason**. Read-only keeps the control focusable and its value
 * readable; disabled removes it from the keyboard and the accessibility tree entirely, which is
 * why a value the user is meant to see must never be rendered `disabled`.
 */

interface DemoProps {
  label: string;
  hint?: string;
  required?: boolean;
  defaultValue?: unknown;
  invalid?: boolean;
  children: ReactNode;
}

function Demo({ label, hint, required, defaultValue = '', invalid, children }: DemoProps) {
  function Inner() {
    const form = useForm<Record<string, unknown>>({
      ...JOSAM_FORM_OPTIONS,
      defaultValues: { value: defaultValue },
    });
    // Errors are set directly rather than through a resolver: the story is about how the field
    // *looks and announces itself* when invalid, not about validation.
    if (invalid === true && form.formState.errors['value'] === undefined) {
      form.setError('value', { type: 'demo', message: 'اختيار مطلوب — a choice is required' });
    }
    return (
      <Form form={form} onSubmit={() => undefined}>
        <FormField name="value" label={label} hint={hint} required={required ?? false}>
          {children}
        </FormField>
      </Form>
    );
  }
  return <Inner />;
}

const OPTIONS: ChoiceOption[] = [
  { value: 'beginner', label: 'مبتدئ · Beginner' },
  { value: 'intermediate', label: 'متوسط · Intermediate' },
  { value: 'advanced', label: 'متقدم · Advanced' },
  {
    value: 'native',
    label: 'متحدث أصلي · Native',
    // BR-1347 one level down: a greyed-out option says why, or it is a dead end with no
    // explanation. Required by the type since PH-0.29.
    disabled: true,
    disabledReason: 'هذا المستوى ليس ضمن هذه الدورة · Not offered on this course',
  },
];

const meta = {
  title: 'Fields/Choice',
  parameters: {
    docs: {
      description: {
        component:
          'Ten choice fields. Five are Radix-backed (Checkbox, Switch, RadioGroup, RadioCard, ' +
          'Slider, Select); the rest are built directly against the WAI-ARIA patterns because ' +
          'Radix has no combobox. Radix never appears in a prop (BR-1528).',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Checkbox ─────────────────────────────────────────────────────────────────────────────
/** Keyboard: `Tab` focuses · `Space` toggles. Clicking the label toggles it too (`BR-1402`). */
export const CheckboxStates: Story = {
  name: 'Checkbox — all states',
  render: () => (
    <Stack gap="6">
      <Demo label="الشروط · Terms" defaultValue={false}>
        <Checkbox label="أوافق على الشروط · I accept the terms" />
      </Demo>
      <Demo label="الشروط · Terms" defaultValue={true}>
        <Checkbox label="محدد · Checked" />
      </Demo>
      <Demo label="الشروط · Terms" defaultValue={false} hint="مع تلميح · With a hint">
        <Checkbox label="مع تلميح · With a hint" />
      </Demo>
      <Demo label="الشروط · Terms" defaultValue={false} invalid>
        <Checkbox label="حالة خطأ · Error state" />
      </Demo>
      <Demo label="الشروط · Terms" defaultValue={false}>
        <Checkbox
          label="معطل · Disabled"
          disabled
          disabledReason="اقرأ الشروط أولًا · Read the terms first"
        />
      </Demo>
      {/*
        BR-1544 — read-only is NOT disabled. The control keeps its place in the tab order and its
        value stays readable and copyable; a disabled control is removed from the keyboard and from
        the accessibility tree, so a screen-reader user cannot reach it at all.
      */}
      <Demo label="الشروط · Terms" defaultValue={true}>
        <Checkbox label="للقراءة فقط · Read only" readOnly />
      </Demo>
    </Stack>
  ),
};

// ── Switch ───────────────────────────────────────────────────────────────────────────────
/**
 * Keyboard: `Tab` focuses · `Space` toggles.
 *
 * A `Switch` is for a setting that takes effect immediately; a `Checkbox` is for a value submitted
 * with a form. The thumb travels towards the inline end, so it mirrors in Arabic (`BR-1529`) —
 * worth switching the direction toolbar on this story specifically.
 */
export const SwitchStates: Story = {
  name: 'Switch — all states',
  render: () => (
    <Stack gap="6">
      <Demo label="الإشعارات · Notifications" defaultValue={false}>
        <Switch label="مطفأ · Off" />
      </Demo>
      <Demo label="الإشعارات · Notifications" defaultValue={true}>
        <Switch label="مفعل · On — thumb sits at the inline end in both directions" />
      </Demo>
      <Demo label="الإشعارات · Notifications" defaultValue={true}>
        <Switch
          label="معطل · Disabled"
          disabled
          disabledReason="مفعّل من إعدادات المؤسسة · Set by your organisation"
        />
      </Demo>
      <Demo label="الإشعارات · Notifications" defaultValue={true}>
        <Switch label="للقراءة فقط · Read only" readOnly />
      </Demo>
    </Stack>
  ),
};

// ── RadioGroup ───────────────────────────────────────────────────────────────────────────
/**
 * Keyboard: `Tab` enters at the selected option (or the first) · arrow keys **move and select** ·
 * `Space` selects. One tab stop for the whole group, not one per option.
 */
export const RadioGroupStates: Story = {
  name: 'RadioGroup — all states',
  render: () => (
    <Stack gap="6">
      <Demo label="المستوى · Level" defaultValue="beginner">
        <RadioGroup options={OPTIONS} />
      </Demo>
      <Demo
        label="المستوى · Level"
        defaultValue="beginner"
        hint="اختر مستواك الحالي · Pick your current level"
        required
      >
        <RadioGroup options={OPTIONS} />
      </Demo>
      <Demo label="المستوى · Level" defaultValue="" invalid>
        <RadioGroup options={OPTIONS} />
      </Demo>
      <Demo label="المستوى · Level" defaultValue="beginner">
        <RadioGroup
          options={OPTIONS}
          disabled
          disabledReason="المستوى ثابت بعد بدء الدورة · Fixed once the course starts"
        />
      </Demo>
      <Demo label="المستوى · Level" defaultValue="intermediate">
        <RadioGroup options={OPTIONS} readOnly />
      </Demo>
    </Stack>
  ),
};

/** Same semantics as `RadioGroup`; the whole card is the hit target rather than a 20px circle. */
export const RadioCardStates: Story = {
  name: 'RadioCard — 1, 2 and 3 columns',
  render: () => {
    const described: ChoiceOption[] = [
      {
        value: 'beginner',
        label: 'مبتدئ · Beginner',
        description: 'أبدأ من الصفر · Starting from nothing',
      },
      {
        value: 'intermediate',
        label: 'متوسط · Intermediate',
        description: 'أعرف الأساسيات · I know the basics',
      },
      {
        value: 'advanced',
        label: 'متقدم · Advanced',
        description: 'أريد الإتقان · I want fluency',
      },
    ];
    return (
      <Stack gap="6">
        <Demo label="المستوى · Level" defaultValue="beginner">
          <RadioCard options={described} />
        </Demo>
        <Demo label="المستوى · Level" defaultValue="intermediate">
          <RadioCard options={described} columns={2} />
        </Demo>
        <Demo label="المستوى · Level" defaultValue="advanced" invalid>
          <RadioCard options={described} columns={3} />
        </Demo>
      </Stack>
    );
  },
};

// ── Slider ───────────────────────────────────────────────────────────────────────────────
/**
 * Keyboard: arrow keys step · `Home`/`End` jump to the ends · `PageUp`/`PageDown` step larger.
 *
 * The thumb carries `aria-labelledby` rather than relying on `htmlFor` — `role="slider"` sits on a
 * `span`, and `<label for>` names only labelable elements. It also carries `aria-valuetext`,
 * because "3" alone tells a screen-reader user nothing about what three means.
 */
export const SliderStates: Story = {
  name: 'Slider — with and without a formatted value',
  render: () => (
    <Stack gap="6">
      <Demo
        label="الالتزام الأسبوعي · Weekly commitment"
        defaultValue={3}
        hint="عدد الدروس في الأسبوع · Lessons per week"
      >
        <Slider min={1} max={7} formatValue={(v) => `${String(v)} دروس · lessons`} />
      </Demo>
      <Demo label="الالتزام الأسبوعي · Weekly commitment" defaultValue={5}>
        <Slider min={1} max={7} />
      </Demo>
      <Demo label="الالتزام الأسبوعي · Weekly commitment" defaultValue={2}>
        <Slider
          min={1}
          max={7}
          formatValue={(v) => String(v)}
          disabled
          disabledReason="اختر خطة أولًا · Choose a plan first"
        />
      </Demo>
      <Demo label="الالتزام الأسبوعي · Weekly commitment" defaultValue={4}>
        <Slider min={1} max={7} formatValue={(v) => String(v)} readOnly />
      </Demo>
    </Stack>
  ),
};

// ── Select ───────────────────────────────────────────────────────────────────────────────
/**
 * Keyboard: `Space`/`Enter`/`ArrowDown` opens · arrows move · typing jumps by prefix · `Enter`
 * selects · `Escape` closes and returns focus to the trigger.
 */
export const SelectStates: Story = {
  name: 'Select — all states',
  render: () => (
    <Stack gap="6">
      <Demo label="المستوى · Level" defaultValue="">
        <Select options={OPTIONS} placeholder="اختر · Choose one" />
      </Demo>
      <Demo label="المستوى · Level" defaultValue="intermediate">
        <Select options={OPTIONS} placeholder="اختر · Choose one" />
      </Demo>
      <Demo label="المستوى · Level" defaultValue="" invalid>
        <Select options={OPTIONS} placeholder="اختر · Choose one" />
      </Demo>
      <Demo label="المستوى · Level" defaultValue="">
        <Select
          options={OPTIONS}
          placeholder="معطل · Disabled"
          disabled
          disabledReason="أكمل ملفك الشخصي أولًا · Complete your profile first"
        />
      </Demo>
      <Demo label="المستوى · Level" defaultValue="intermediate">
        <Select options={OPTIONS} placeholder="اختر · Choose one" readOnly />
      </Demo>
    </Stack>
  ),
};

// ── Combobox ─────────────────────────────────────────────────────────────────────────────
/**
 * Keyboard: type to filter · `ArrowDown`/`ArrowUp` move the active option · `Home`/`End` jump ·
 * `Enter` selects the active option · `Escape` closes without changing the value.
 *
 * The active option is announced through `aria-activedescendant`; focus never leaves the input,
 * which is what distinguishes a combobox from a listbox.
 */
export const ComboboxStates: Story = {
  name: 'Combobox — filtering, empty and loading',
  render: () => (
    <Stack gap="6">
      <Demo label="المستوى · Level" defaultValue="">
        <Combobox
          options={OPTIONS}
          placeholder="ابحث · Search"
          emptyLabel="لا نتائج · Nothing found"
        />
      </Demo>
      <Demo label="المستوى · Level" defaultValue="" hint="اكتب للتصفية · Type to filter">
        <Combobox
          options={[]}
          placeholder="ابحث · Search"
          emptyLabel="لا نتائج · Nothing found"
          loading
          loadingLabel="جارٍ البحث · Searching"
        />
      </Demo>
      <Demo label="المستوى · Level" defaultValue="" invalid>
        <Combobox
          options={OPTIONS}
          placeholder="ابحث · Search"
          emptyLabel="لا نتائج · Nothing found"
        />
      </Demo>
    </Stack>
  ),
};

// ── MultiSelect ──────────────────────────────────────────────────────────────────────────
/**
 * Keyboard: `Enter`/`Space`/`ArrowDown` opens · arrows move · `Enter` toggles the active option ·
 * `Backspace` removes the last chip · `Escape` closes.
 *
 * `Enter` and `Space` are `preventDefault`ed on the trigger: a `<button>` synthesises a click from
 * both, and without that the handler and the synthesised click toggle the listbox twice — leaving
 * the control looking inert to a keyboard user while working perfectly with a mouse.
 */
export const MultiSelectStates: Story = {
  name: 'MultiSelect — empty, chosen and overflowing',
  render: () => (
    <Stack gap="6">
      <Demo label="الاهتمامات · Interests" defaultValue={[]}>
        <MultiSelect
          options={OPTIONS}
          placeholder="اختر · Choose"
          overflowLabel={(n) => `+${String(n)} أخرى · more`}
          removeLabel={(l) => `إزالة ${l} · Remove ${l}`}
        />
      </Demo>
      <Demo label="الاهتمامات · Interests" defaultValue={['beginner', 'intermediate']}>
        <MultiSelect
          options={OPTIONS}
          placeholder="اختر · Choose"
          overflowLabel={(n) => `+${String(n)} أخرى · more`}
          removeLabel={(l) => `إزالة ${l} · Remove ${l}`}
        />
      </Demo>
      <Demo label="الاهتمامات · Interests" defaultValue={['beginner', 'intermediate', 'advanced']}>
        <MultiSelect
          options={OPTIONS}
          placeholder="اختر · Choose"
          maxVisible={2}
          overflowLabel={(n) => `+${String(n)} أخرى · more`}
          removeLabel={(l) => `إزالة ${l} · Remove ${l}`}
        />
      </Demo>
    </Stack>
  ),
};

// ── TagsInput ────────────────────────────────────────────────────────────────────────────
/**
 * Keyboard: type then `Enter` or `,` commits a tag · `Backspace` on an empty field removes the
 * last one · each chip's remove button is reachable by `Tab` and has a real accessible name.
 *
 * A duplicate is ignored silently rather than erroring: the user's intent is already satisfied.
 */
export const TagsInputStates: Story = {
  name: 'TagsInput — empty, populated and invalid',
  render: () => (
    <Stack gap="6">
      <Demo label="الوسوم · Tags" defaultValue={[]}>
        <TagsInput
          placeholder="أضف وسمًا · Add a tag"
          removeLabel={(t) => `إزالة ${t} · Remove ${t}`}
        />
      </Demo>
      <Demo
        label="الوسوم · Tags"
        defaultValue={['نحو', 'استماع', 'محادثة']}
        hint="اضغط Enter أو فاصلة · Press Enter or a comma"
      >
        <TagsInput
          placeholder="أضف وسمًا · Add a tag"
          removeLabel={(t) => `إزالة ${t} · Remove ${t}`}
        />
      </Demo>
      <Demo label="الوسوم · Tags" defaultValue={[]} invalid required>
        <TagsInput
          placeholder="أضف وسمًا · Add a tag"
          removeLabel={(t) => `إزالة ${t} · Remove ${t}`}
        />
      </Demo>
    </Stack>
  ),
};

// ── RatingInput ──────────────────────────────────────────────────────────────────────────
/**
 * Keyboard: `Tab` enters at the current rating · `ArrowRight`/`ArrowUp` increase ·
 * `ArrowLeft`/`ArrowDown` decrease · `Home`/`End` jump to 1 and max. One tab stop.
 *
 * It is a radio group, not a row of buttons — five separate tab stops for one value would be a
 * keyboard trap in a form of any length.
 */
export const RatingInputStates: Story = {
  name: 'RatingInput — unrated, rated and read-only',
  render: () => (
    <Stack gap="6">
      <Demo label="التقييم · Rating" defaultValue={0}>
        <RatingInput starLabel={(v) => `${String(v)} من 5 · ${String(v)} of 5`} />
      </Demo>
      <Demo label="التقييم · Rating" defaultValue={4} hint="اختياري · Optional">
        <RatingInput starLabel={(v) => `${String(v)} من 5 · ${String(v)} of 5`} />
      </Demo>
      <Demo label="التقييم · Rating" defaultValue={3}>
        <RatingInput
          starLabel={(v) => `${String(v)} من 5 · ${String(v)} of 5`}
          disabled
          disabledReason="أكمل الدورة للتقييم · Finish the course to rate it"
        />
      </Demo>
      <Demo label="التقييم · Rating" defaultValue={5}>
        <RatingInput starLabel={(v) => `${String(v)} من 5 · ${String(v)} of 5`} readOnly />
      </Demo>
    </Stack>
  ),
};

/**
 * Every control at once, to check vertical rhythm and that nothing depends on being the only field
 * on the page. Also the fastest way to sweep all four theme × direction combinations
 * (`BR-1569`–`BR-1571`).
 */
export const AllTogether: Story = {
  name: 'All ten — 4-combination sweep',
  render: () => (
    <Stack gap="6">
      <Text size="sm" tone="secondary">
        بدّل السمة والاتجاه من شريط الأدوات · Switch theme and direction from the toolbar
      </Text>
      <Demo label="الشروط · Terms" defaultValue={false}>
        <Checkbox label="أوافق · I accept" />
      </Demo>
      <Demo label="الإشعارات · Notifications" defaultValue={true}>
        <Switch label="مفعل · Enabled" />
      </Demo>
      <Demo label="المستوى · Level" defaultValue="beginner">
        <RadioGroup options={OPTIONS} />
      </Demo>
      <Demo label="الخطة · Plan" defaultValue="beginner">
        <RadioCard options={OPTIONS} columns={2} />
      </Demo>
      <Demo label="الالتزام · Commitment" defaultValue={3}>
        <Slider min={1} max={7} formatValue={(v) => `${String(v)} دروس · lessons`} />
      </Demo>
      <Demo label="المستوى · Level" defaultValue="">
        <Select options={OPTIONS} placeholder="اختر · Choose" />
      </Demo>
      <Demo label="بحث · Search" defaultValue="">
        <Combobox options={OPTIONS} placeholder="ابحث · Search" emptyLabel="لا نتائج · None" />
      </Demo>
      <Demo label="الاهتمامات · Interests" defaultValue={['beginner']}>
        <MultiSelect
          options={OPTIONS}
          placeholder="اختر · Choose"
          overflowLabel={(n) => `+${String(n)}`}
          removeLabel={(l) => `إزالة ${l} · Remove ${l}`}
        />
      </Demo>
      <Demo label="الوسوم · Tags" defaultValue={['نحو']}>
        <TagsInput placeholder="أضف · Add" removeLabel={(t) => `إزالة ${t} · Remove ${t}`} />
      </Demo>
      <Demo label="التقييم · Rating" defaultValue={4}>
        <RatingInput starLabel={(v) => `${String(v)} من 5 · ${String(v)} of 5`} />
      </Demo>
    </Stack>
  ),
};

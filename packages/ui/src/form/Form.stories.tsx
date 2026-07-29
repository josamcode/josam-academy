import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useForm } from 'react-hook-form';

import { Button } from '../controls/Button.js';
import { Form, JOSAM_FORM_OPTIONS, useSubmitLock } from './Form.js';
import { FormField, useFieldControl } from './FormField.js';

/**
 * `BR-1402`–`BR-1406`, `BR-1412`, `BR-1415`.
 *
 * Keyboard map (`BR-1531`):
 *   Tab / Shift+Tab   move between fields in document order
 *   Enter             submits from any single-line field (BR-1415)
 *   on failed submit  focus moves to the FIRST invalid field in document order and scrolls to it
 *   Escape            does not discard; leaving a dirty form warns instead (BR-1412)
 *
 * The real field components arrive at PH-0.22; this story uses a bare input through
 * `useFieldControl`, which is the same wiring they will use.
 */
const meta = { title: 'Form/Overview' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function DemoInput({ type = 'text' }: { type?: string }) {
  const control = useFieldControl({ required: 'This field is required' });
  return (
    <input type={type} className="p-2 rounded-sm bg-bg-inset text-text-primary" {...control} />
  );
}

interface Values {
  email: string;
  name: string;
}

function DemoForm() {
  const form = useForm<Values>({ ...JOSAM_FORM_OPTIONS, defaultValues: { email: '', name: '' } });
  const isSubmitting = useSubmitLock(form);

  return (
    <Form
      form={form}
      onSubmit={async () => {
        await new Promise((r) => setTimeout(r, 800));
      }}
      requiredLegend="Fields marked * are required"
    >
      <FormField name="name" label="Full name" required hint="As it appears on your certificate">
        <DemoInput />
      </FormField>
      <FormField name="email" label="Email" required>
        <DemoInput type="email" />
      </FormField>
      <Button type="submit" variant="primary" isLoading={isSubmitting}>
        Save
      </Button>
    </Form>
  );
}

/** Submit empty to watch focus land on the first invalid field. */
export const Default: Story = { render: () => <DemoForm /> };

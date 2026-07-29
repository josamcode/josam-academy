import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useForm } from 'react-hook-form';

import { Button } from '../controls/Button.js';
import { Form, JOSAM_FORM_OPTIONS, useSubmitLock } from '../form/Form.js';
import { FormField } from '../form/FormField.js';
import {
  CodeField,
  CurrencyField,
  NumberField,
  PasswordField,
  TextArea,
  TextField,
} from './text-fields.js';

/**
 * `12 §20.7`. All six fields inherit their label, hint, error and ARIA wiring from `FormField`
 * via `useFieldControl` — none of them re-derives it.
 *
 * Keyboard map (`BR-1531`):
 *   Tab / Shift+Tab   between fields in document order
 *   Enter             submits (BR-1415)
 *   PasswordField     the show/hide toggle is a real button in the tab order, aria-pressed
 *   CodeField         always LTR, upper-cased, capped at its length
 */
const meta = { title: 'Fields/Text' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

interface Values {
  name: string;
  bio: string;
  password: string;
  seats: number;
  price: number;
  coupon: string;
}

function AllFields() {
  const form = useForm<Values>({
    ...JOSAM_FORM_OPTIONS,
    defaultValues: { name: '', bio: '', password: '', seats: 1, price: 0, coupon: '' },
  });
  const isSubmitting = useSubmitLock(form);

  return (
    <Form form={form} onSubmit={() => undefined} requiredLegend="Fields marked * are required">
      <FormField name="name" label="Full name" required hint="As it appears on your certificate">
        <TextField maxLength={60} autoComplete="name" />
      </FormField>
      <FormField name="bio" label="About you">
        <TextArea maxLength={280} />
      </FormField>
      <FormField name="password" label="Password" required hint="At least 12 characters">
        <PasswordField
          autoComplete="new-password"
          showLabel="Show password"
          hideLabel="Hide password"
        />
      </FormField>
      <FormField name="seats" label="Seats" required>
        <NumberField min={1} max={50} />
      </FormField>
      <FormField name="price" label="Price" required hint="Stored as minor units">
        <CurrencyField currency="EGP" />
      </FormField>
      <FormField name="coupon" label="Coupon code">
        <CodeField length={8} />
      </FormField>
      <Button type="submit" variant="primary" isLoading={isSubmitting}>
        Save
      </Button>
    </Form>
  );
}

export const AllSixFields: Story = { render: () => <AllFields /> };

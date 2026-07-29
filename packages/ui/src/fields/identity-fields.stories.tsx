import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useForm } from 'react-hook-form';

import { Button } from '../controls/Button.js';
import { Form, JOSAM_FORM_OPTIONS } from '../form/Form.js';
import { FormField } from '../form/FormField.js';
import { EmailField, OTPField, PhoneField } from './identity-fields.js';

/**
 * `12 §20.7`. All three stay LTR whatever the interface direction — switch the toolbar to Arabic
 * and the phone number, the address and the code keep their character order (`BR-1396`,
 * `BR-1393`).
 *
 * Keyboard map (`BR-1531`) — OTPField:
 *   0-9              enters a digit and advances
 *   Backspace        clears; in an empty segment steps back and clears the previous one
 *   ArrowLeft/Right  move between segments without changing anything
 *   paste            distributes across every segment from the focused one, non-digits stripped
 */
const meta = { title: 'Fields/Identity' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

interface Values {
  phone: string;
  email: string;
  code: string;
}

function IdentityForm() {
  const form = useForm<Values>({
    ...JOSAM_FORM_OPTIONS,
    defaultValues: { phone: '', email: '', code: '' },
  });

  return (
    <Form form={form} onSubmit={() => undefined} requiredLegend="Fields marked * are required">
      <FormField name="phone" label="Mobile number" required hint="Stored in E.164 form">
        <PhoneField countryCode="+20" />
      </FormField>
      <FormField name="email" label="Email" required>
        <EmailField />
      </FormField>
      <FormField name="code" label="Verification code" required hint="Six digits, sent by SMS">
        <OTPField groupLabel="Verification code" digitLabel={(n) => `Digit ${String(n)}`} />
      </FormField>
      <Button type="submit" variant="primary">
        Verify
      </Button>
    </Form>
  );
}

export const IdentityFields: Story = { render: () => <IdentityForm /> };

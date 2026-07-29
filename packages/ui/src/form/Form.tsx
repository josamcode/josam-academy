'use client';

import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import {
  type FieldErrors,
  type FieldValues,
  FormProvider,
  type SubmitHandler,
  type UseFormReturn,
} from 'react-hook-form';

import { Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';

/**
 * `Form` owns dirty tracking, the submit lock, focus-first-error and the leave warning
 * (`12 §20.7`, `BR-1406`, `BR-1412`, `BR-1415`).
 *
 * React Hook Form is used **directly**, not behind an abstraction (`BR-1818`). The `form` object
 * is created by the caller with `useForm` and passed in, so the caller keeps full access to the
 * library's API — a wrapper that re-exported a subset would be an abstraction at first use, which
 * `BR-1355` prohibits, and would hide exactly the cache and validation semantics `07`/`12` rely on.
 */
export interface FormProps<TValues extends FieldValues> {
  form: UseFormReturn<TValues>;
  onSubmit: SubmitHandler<TValues>;
  children: ReactNode;
  /**
   * `BR-1403` — the required marking is explained **once per form**, not once per field.
   * Pre-translated; this component sits below the catalog (`BR-523`).
   */
  requiredLegend?: string;
  /**
   * `BR-1412` — shown by the browser when leaving a dirty form. Browsers ignore custom text and
   * show their own, so this is a boolean in practice; it is named for what it does.
   */
  warnOnLeave?: boolean;
}

export function Form<TValues extends FieldValues>({
  form,
  onSubmit,
  children,
  requiredLegend,
  warnOnLeave = true,
}: FormProps<TValues>) {
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * The submit lock, and it is a **ref** rather than `formState.isSubmitting`.
   *
   * `isSubmitting` is React state: it updates on the next render, so two clicks inside the same
   * tick both read `false` and the handler runs twice. Caught at PH-0.21 by clicking submit twice
   * in a real DOM — the assertion expected one call and got two. A ref flips synchronously, which
   * is what a lock has to do.
   *
   * `isSubmitting` remains the right thing to render a spinner from; it is the wrong thing to
   * gate on.
   */
  const submitting = useRef(false);
  const { formState, handleSubmit } = form;
  const { isDirty, isSubmitSuccessful } = formState;

  /**
   * BR-1412 — leaving a dirty form warns before discarding.
   *
   * Guarded on `isSubmitSuccessful` as well as `isDirty`: React Hook Form leaves the form dirty
   * after a successful submit until it is explicitly reset, so without this the user is warned
   * on the way out of a form they just saved — which trains people to dismiss the dialog, and
   * then it protects nothing.
   */
  useEffect(() => {
    if (!warnOnLeave || !isDirty || isSubmitSuccessful) return undefined;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Assigning returnValue is what actually triggers the prompt in older engines.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [warnOnLeave, isDirty, isSubmitSuccessful]);

  /**
   * BR-1406 — on failed submit, focus moves to the first invalid field and the page scrolls to it.
   *
   * "First" means first **in the document**, not first in the errors object. React Hook Form's
   * own `shouldFocusError` focuses in *registration* order, which stops matching reading order as
   * soon as a form is composed from separate sections — so it can send focus to a field halfway
   * down the page while an earlier invalid one sits unmentioned. `JOSAM_FORM_OPTIONS` therefore
   * sets `shouldFocusError: false` and this owns the behaviour.
   *
   * The first implementation queried `[aria-invalid="true"]` and was **completely inert**: this
   * callback runs before React has re-rendered with the new attribute, so the query always
   * matched nothing and returned early. Every focus test still passed — on RHF's built-in focus,
   * the very behaviour the comment above says is wrong. Found at PH-0.21 by disabling
   * `shouldFocusError` and watching focus stop moving (`BR-1835`).
   *
   * Reading the field names out of `errors` avoids the render race entirely: the names are known
   * synchronously, and the DOM is consulted only for ORDER, which does not change on validation.
   */
  const focusFirstError = useCallback((errors: FieldErrors<TValues>) => {
    const formElement = formRef.current;
    if (formElement === null) return;

    const invalidNames = new Set(Object.keys(errors));
    if (invalidNames.size === 0) return;

    const controls = formElement.querySelectorAll<HTMLElement>('[name]');
    for (const control of controls) {
      const name = control.getAttribute('name');
      if (name === null || !invalidNames.has(name)) continue;

      control.focus();

      // Guarded because `scrollIntoView` is absent in environments without layout, and an
      // unguarded call would throw and take the focus with it — losing the part that matters.
      if (typeof control.scrollIntoView === 'function') {
        control.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }
  }, []);

  return (
    <FormProvider {...form}>
      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => {
          if (submitting.current) {
            event.preventDefault();
            return;
          }
          submitting.current = true;
          void handleSubmit(
            onSubmit,
            focusFirstError,
          )(event).finally(() => {
            submitting.current = false;
          });
        }}
      >
        <Stack gap="4">
          {requiredLegend === undefined ? null : (
            <Text size="xs" tone="muted">
              {requiredLegend}
            </Text>
          )}
          {children}
        </Stack>
      </form>
    </FormProvider>
  );
}

/**
 * `BR-1404` — validation runs on blur and on submit, **not on every keystroke**.
 *
 * Spread into `useForm` by the caller rather than forced by `Form`, because `form` is the
 * caller's object and taking it over would be the wrapper `BR-1818` rules out. Exported as a
 * constant so the decision lives in one place and a screen cannot drift to `onChange` by writing
 * a different literal:
 *
 *     const form = useForm<Values>({ ...JOSAM_FORM_OPTIONS, defaultValues });
 *
 * `onTouched` validates on first blur and on every change thereafter — so a field the user has
 * not reached yet never shouts at them, and a field they have corrected updates immediately.
 */
export const JOSAM_FORM_OPTIONS = {
  mode: 'onTouched',
  /**
   * `Form` owns focus-first-error, so React Hook Form must not also do it. Its version focuses in
   * registration order rather than document order (`BR-1406` wants the latter), and with both
   * active the library wins — which is how the first implementation here stayed inert and
   * untested for as long as it did.
   */
  shouldFocusError: false,
} as const;

/**
 * `isSubmitting` is the submit lock. Exposed as a helper so `Button` receives it as `isLoading`
 * without every form re-deriving it — and so the lock is one concept rather than a convention
 * each screen reimplements.
 */
export function useSubmitLock<TValues extends FieldValues>(form: UseFormReturn<TValues>): boolean {
  return form.formState.isSubmitting;
}

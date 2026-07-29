'use client';

import * as RadixToast from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Inline, Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';
import type { AlertTone } from './banners.js';

/**
 * `Toast` and `ToastProvider` — `BR-1550`, `BR-1377`.
 *
 * Three constraints, and each exists because of a specific way toasts go wrong:
 *
 *  - **A minimum six-second lifetime.** Long enough to notice, read and act on. The default in most
 *    libraries is three, which is enough time to see that *something* appeared.
 *  - **It never asks a question.** A toast that asks is a dialog that vanishes: it disappears
 *    mid-decision, it cannot be recovered, and it is unusable for anyone who reads slowly or is
 *    using a screen reader. The type forbids it — see `ToastInput` below.
 *  - **It never covers the primary action.** Positioned at the block start, because every primary
 *    action in this product sits at the block end of its page or dialog.
 */

const TONE: Record<AlertTone, string> = {
  info: 'border-info-text bg-info text-info-text',
  success: 'border-success-text bg-success text-success-text',
  warning: 'border-warning-text bg-warning text-warning-text',
  danger: 'border-danger-text bg-danger text-danger-text',
};

/** `BR-1550` — six seconds is the floor, not the default. */
export const MIN_TOAST_DURATION_MS = 6000;

export interface ToastInput {
  tone: AlertTone;
  /** Pre-translated. A statement of what happened. */
  title: string;
  /** Pre-translated. */
  body?: string;
  /**
   * `BR-1550` — the one action a toast may carry, and it is always **undo**.
   *
   * Not a general `action` prop, deliberately. "Undo" is the only action that is safe to lose: if
   * the toast disappears before the user reaches it, the outcome is the one they already asked
   * for. Any other action — "Retry", "View", "Confirm" — is a question, and a question that
   * vanishes after six seconds is `BR-1377`'s exact prohibition wearing a different label.
   */
  undo?: { label: string; onUndo: () => void };
  /** Milliseconds. Clamped up to `MIN_TOAST_DURATION_MS`; there is no way to make it shorter. */
  durationMs?: number;
}

interface ToastRecord extends ToastInput {
  id: number;
}

interface ToastApi {
  /** Shows a toast. Returns its id so a caller can dismiss it early. */
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Throws outside a provider rather than returning a no-op.
 *
 * A silently-inert `toast()` is the worst available failure: the code that calls it looks correct,
 * the action it reports still happens, and the only symptom is that the user is never told. Same
 * reasoning as `useFormField` at `PH-0.21`.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) {
    throw new Error('useToast must be used inside <ToastProvider> (BR-1550).');
  }
  return api;
}

export interface ToastProviderProps {
  children: ReactNode;
  /** Pre-translated, labels the dismiss control on every toast. */
  dismissLabel: string;
  /** Pre-translated, names the toast region. */
  regionLabel: string;
}

export function ToastProvider({ children, dismissLabel, regionLabel }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  // A ref, not state. The id is not rendered, so it needs no re-render, and the first version read
  // it from inside a setState updater — which React may invoke twice under StrictMode, handing out
  // the same id to two toasts. An updater has to be pure; a counter is not.
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current;
    nextId.current += 1;
    setToasts((current) => [...current, { ...input, id }]);
    return id;
  }, []);

  const api = useMemo<ToastApi>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      <RadixToast.Provider swipeDirection="right" duration={MIN_TOAST_DURATION_MS}>
        {children}

        {toasts.map((item) => (
          <RadixToast.Root
            key={item.id}
            // BR-1550 — the floor is enforced here, where it cannot be forgotten. A caller may ask
            // for longer; `Math.max` means asking for shorter simply has no effect.
            duration={Math.max(MIN_TOAST_DURATION_MS, item.durationMs ?? MIN_TOAST_DURATION_MS)}
            onOpenChange={(open) => {
              if (!open) dismiss(item.id);
            }}
            className={`flex flex-row items-start gap-3 rounded-md border p-3 shadow-lg ${TONE[item.tone]}`}
          >
            <Stack gap="1">
              <RadixToast.Title asChild>
                <Text size="sm" weight="medium">
                  {item.title}
                </Text>
              </RadixToast.Title>
              {item.body === undefined ? null : (
                <RadixToast.Description asChild>
                  <Text size="sm">{item.body}</Text>
                </RadixToast.Description>
              )}
            </Stack>

            <Inline gap="2">
              {item.undo === undefined ? null : (
                <RadixToast.Action
                  altText={item.undo.label}
                  onClick={item.undo.onUndo}
                  className="ms-auto rounded-sm p-2 text-sm underline outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {item.undo.label}
                </RadixToast.Action>
              )}
              <RadixToast.Close
                aria-label={dismissLabel}
                className="rounded-sm p-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <X width={14} height={14} aria-hidden="true" focusable="false" />
              </RadixToast.Close>
            </Inline>
          </RadixToast.Root>
        ))}

        {/*
          Block start, not block end. BR-1377 — a toast never covers the primary action, and every
          primary action in this product sits at the block end of its page or dialog. `inset-inline`
          keeps it on the reading edge in both directions.
        */}
        <RadixToast.Viewport
          label={regionLabel}
          className="fixed inset-inline-end-0 top-0 z-50 flex max-h-screen w-[min(24rem,92vw)] flex-col gap-2 p-4"
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

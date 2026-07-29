'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import * as RadixPopover from '@radix-ui/react-popover';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Button, type DisabledState } from '../controls/Button.js';
import { Heading } from '../primitives/Heading.js';
import { Inline, Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';

/**
 * `Dialog` · `ConfirmDialog` · `Drawer` · `Popover` · `Tooltip` · `DropdownMenu`.
 *
 * All six are Radix-backed and none exposes a Radix type (`BR-1528`). Radix supplies focus
 * trapping, `Escape`, focus return, scroll locking and the outside-click contract — all things
 * that are individually easy and collectively where hand-rolled overlays go wrong.
 *
 * `BR-1552` — `Dialog` traps focus, closes on `Escape`, returns focus to its trigger, and **warns
 * on dirty close** (`BR-1470`, `BR-1372`). The first three are Radix's; the fourth is ours, and it
 * is the one that matters, because click-outside must not discard data.
 */

const OVERLAY = 'fixed inset-0 z-40 bg-bg-base/70';

const PANEL =
  'fixed z-50 flex flex-col gap-4 bg-bg-elevated p-6 shadow-lg ' + 'focus-visible:outline-none';

const SURFACE =
  'z-50 rounded-md border border-border-strong bg-bg-elevated p-3 text-text-primary shadow-lg';

const CLOSE_BUTTON =
  'rounded-sm p-2 text-text-secondary outline-none hover:bg-bg-inset ' +
  'focus-visible:ring-2 focus-visible:ring-border-focus';

/**
 * Remembers the last element focused **outside** any dialog, and returns focus to it on close.
 *
 * `BR-1470` says focus returns to the trigger, and Radix does implement that — by focusing its own
 * `Dialog.Trigger` ref. These dialogs are **controlled**: a screen holds the `open` state and there
 * is no `Dialog.Trigger` anywhere, so that ref is always null and Radix's restore focuses nothing.
 * Focus landed on `<body>`, meaning the next `Tab` restarted at the top of the document. Everything
 * looked correct — the dialog opened, trapped focus, and closed on `Escape` — and the one part that
 * is invisible to a sighted mouse user was the part that did not work.
 *
 * A `focusin` listener rather than reading `document.activeElement` when `open` flips: by the time
 * any effect of ours runs, Radix's focus scope has already moved focus into the dialog, so we would
 * capture the dialog's own first field. Tracking continuously and ignoring anything inside a dialog
 * gives the right answer whatever opened it — a button, a menu item, or a keyboard shortcut with no
 * trigger element at all.
 */
function useReturnFocus() {
  const lastOutside = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[role="dialog"]') !== null) return;
      lastOutside.current = target;
    };
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
    };
  }, []);

  return (event: Event) => {
    const target = lastOutside.current;
    if (target === null || !document.contains(target)) return;
    event.preventDefault();
    target.focus();
  };
}

export interface DialogLabels {
  /** Pre-translated, names the close control. */
  close: string;
}

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Becomes the dialog's accessible name. Pre-translated. */
  title: string;
  /** Pre-translated. Becomes `aria-describedby` — Radix warns if a dialog has no description. */
  description: string;
  children: ReactNode;
  /** The action row. */
  footer?: ReactNode;
  labels: DialogLabels;
  /**
   * `BR-1372` — the dialog holds unsaved changes.
   *
   * When true, `Escape` and outside-click do not close; `onDirtyClose` is called instead so the
   * screen can ask. Passing the *state* rather than a `preventClose` callback means the common
   * case — wiring it to a form's `isDirty` — is one prop and cannot be got subtly wrong.
   */
  isDirty?: boolean;
  onDirtyClose?: () => void;
}

/**
 * Keyboard (`BR-1531`, `BR-1470`): `Tab` cycles **within** the dialog and cannot leave it ·
 * `Escape` closes · focus returns to whatever opened it.
 *
 * `size` is deliberately absent. A dialog wide enough for its content and no wider is one
 * decision; a `size` prop turns it into a decision per call site, and the sizes drift.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  labels,
  isDirty = false,
  onDirtyClose,
}: DialogProps) {
  /**
   * `BR-1372` — click-outside does not discard data.
   *
   * Radix routes `Escape`, outside pointer-down and outside focus through `onOpenChange(false)`,
   * so intercepting there covers all three at once rather than three handlers that must agree.
   * The explicit close button below calls `onOpenChange` directly and so is *also* guarded, which
   * is correct: the user pressing X with unsaved changes deserves the same warning as the one who
   * missed the panel with their mouse.
   */
  const handleOpenChange = (next: boolean) => {
    if (!next && isDirty) {
      onDirtyClose?.();
      return;
    }
    onOpenChange(next);
  };

  const onCloseAutoFocus = useReturnFocus();

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={OVERLAY} />
        <RadixDialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className={`${PANEL} inset-inline-0 top-1/2 mx-auto max-h-[85vh] w-[min(32rem,92vw)] -translate-y-1/2 overflow-y-auto rounded-lg`}
        >
          <Stack gap="2">
            <Inline gap="3">
              <RadixDialog.Title asChild>
                {/* Level 2: PageHeader owns the page's h1, and a dialog is not a new page. */}
                <Heading level={2}>{title}</Heading>
              </RadixDialog.Title>
              <RadixDialog.Close aria-label={labels.close} className={`${CLOSE_BUTTON} ms-auto`}>
                <X width={16} height={16} aria-hidden="true" focusable="false" />
              </RadixDialog.Close>
            </Inline>
            <RadixDialog.Description asChild>
              <Text size="sm" tone="secondary">
                {description}
              </Text>
            </RadixDialog.Description>
          </Stack>

          <div>{children}</div>
          {footer === undefined ? null : (
            <div className="flex flex-row justify-end gap-2">{footer}</div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export type ConfirmAction = DisabledState & {
  /** Pre-translated. */
  label: string;
  onConfirm: () => void;
  /** `BR-1344` — red is for destructive only, so this is a decision, not a style. */
  destructive?: boolean;
};

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirm: ConfirmAction;
  /** Pre-translated. */
  cancelLabel: string;
  labels: DialogLabels;
  isLoading?: boolean;
}

/**
 * A dialog that asks exactly one question and offers exactly two answers.
 *
 * It is a separate component rather than a `Dialog` with a footer because the shape is a
 * *guarantee*: one confirm, one cancel, no third option, and the cancel is always the one that
 * does nothing. Screens that assemble their own confirm footers eventually produce a "Save",
 * "Discard", "Cancel" row where two of the three are destructive and none is obviously safe.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirm,
  cancelLabel,
  labels,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      labels={labels}
      footer={
        <>
          {/*
            Cancel first in the DOM, so it is the first action Tab reaches and the further of the
            two from the pointer's resting place. The destructive action should never be the one a
            hurried Enter lands on.
          */}
          <Button
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {cancelLabel}
          </Button>
          {confirm.disabled === true ? (
            <Button
              variant={confirm.destructive === true ? 'danger' : 'primary'}
              disabled
              disabledReason={confirm.disabledReason}
            >
              {confirm.label}
            </Button>
          ) : (
            <Button
              variant={confirm.destructive === true ? 'danger' : 'primary'}
              isLoading={isLoading}
              onClick={confirm.onConfirm}
            >
              {confirm.label}
            </Button>
          )}
        </>
      }
    >
      <span />
    </Dialog>
  );
}

export interface DrawerProps extends Omit<DialogProps, 'children'> {
  children: ReactNode;
  /**
   * Which edge it slides from. `inline-start` and `inline-end` follow the document direction, so
   * a drawer anchored to the reading edge stays on the reading edge in Arabic (`BR-1232`).
   */
  side?: 'inline-start' | 'inline-end' | 'bottom';
}

/**
 * A `Dialog` anchored to an edge. Same modality, same focus trap, same `Escape` — it differs in
 * where it comes from and how much room it takes, which is a layout decision rather than a
 * behavioural one, so it shares `Dialog`'s implementation rather than copying it.
 */
export function Drawer({ side = 'inline-end', children, ...props }: DrawerProps) {
  const onCloseAutoFocus = useReturnFocus();
  const position =
    side === 'bottom'
      ? 'inset-inline-0 bottom-0 max-h-[85vh] w-full rounded-t-lg'
      : side === 'inline-end'
        ? 'inset-block-0 end-0 h-full w-[min(28rem,92vw)]'
        : 'inset-block-0 start-0 h-full w-[min(28rem,92vw)]';

  return (
    <RadixDialog.Root
      open={props.open}
      onOpenChange={(next) => {
        if (!next && props.isDirty === true) {
          props.onDirtyClose?.();
          return;
        }
        props.onOpenChange(next);
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={OVERLAY} />
        <RadixDialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className={`${PANEL} ${position} overflow-y-auto`}
        >
          <Stack gap="2">
            <Inline gap="3">
              <RadixDialog.Title asChild>
                <Heading level={2}>{props.title}</Heading>
              </RadixDialog.Title>
              <RadixDialog.Close
                aria-label={props.labels.close}
                className={`${CLOSE_BUTTON} ms-auto`}
              >
                <X width={16} height={16} aria-hidden="true" focusable="false" />
              </RadixDialog.Close>
            </Inline>
            <RadixDialog.Description asChild>
              <Text size="sm" tone="secondary">
                {props.description}
              </Text>
            </RadixDialog.Description>
          </Stack>
          <div>{children}</div>
          {props.footer === undefined ? null : (
            <div className="flex flex-row justify-end gap-2">{props.footer}</div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export interface PopoverProps {
  /** The control that opens it. Must be focusable — Radix returns focus to it on close. */
  trigger: ReactNode;
  children: ReactNode;
  /** Pre-translated, names the popover for a screen reader. */
  label: string;
}

/**
 * Non-modal: the page behind stays interactive and reachable by keyboard.
 *
 * That is the whole distinction from `Dialog`. A popover that trapped focus would be a dialog with
 * an arrow on it, and the two would be chosen by appearance rather than by whether the user must
 * deal with it before continuing.
 */
export function Popover({ trigger, children, label }: PopoverProps) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          aria-label={label}
          sideOffset={6}
          collisionPadding={8}
          className={SURFACE}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

export interface TooltipProps {
  trigger: ReactNode;
  /** Pre-translated. Plain text only — see below. */
  content: string;
  delayMs?: number;
}

/**
 * `content` is a `string`, not a `ReactNode`, and that is a constraint rather than an oversight.
 *
 * A tooltip is unreachable by touch, invisible to a keyboard user who does not linger, and gone
 * the moment the pointer moves. Anything interactive inside one is unreachable for a large share
 * of users, and anything *essential* inside one is information those users never receive. Allowing
 * a `ReactNode` invites both. A short string cannot become either.
 *
 * `Popover` is the component for content that needs to be read or interacted with.
 */
export function Tooltip({ trigger, content, delayMs = 400 }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayMs}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{trigger}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            sideOffset={6}
            collisionPadding={8}
            className={`${SURFACE} max-w-64`}
          >
            <Text size="xs">{content}</Text>
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

export interface MenuItem {
  /** Pre-translated. */
  label: string;
  onSelect: () => void;
  /** `BR-1344` — destructive items are separated and coloured, never just coloured. */
  destructive?: boolean;
  disabled?: boolean;
}

export interface DropdownMenuProps {
  trigger: ReactNode;
  items: MenuItem[];
  /** Pre-translated, names the menu. */
  label: string;
}

/**
 * Keyboard: `Enter`/`Space`/`ArrowDown` opens · arrows move · typing jumps by prefix · `Enter`
 * selects · `Escape` closes and returns focus to the trigger. All Radix's.
 *
 * Destructive items are pushed to the end and separated, so the item that cannot be undone is
 * never adjacent to the one people click most.
 */
export function DropdownMenu({ trigger, items, label }: DropdownMenuProps) {
  const safe = items.filter((item) => item.destructive !== true);
  const destructive = items.filter((item) => item.destructive === true);

  const renderItem = (item: MenuItem) => (
    <RadixDropdown.Item
      key={item.label}
      disabled={item.disabled ?? false}
      onSelect={item.onSelect}
      className={`flex cursor-pointer items-center rounded-sm p-2 text-sm outline-none data-highlighted:bg-accent-subtle data-disabled:cursor-not-allowed data-disabled:opacity-50 ${
        item.destructive === true ? 'text-danger-text' : 'text-text-primary'
      }`}
    >
      {item.label}
    </RadixDropdown.Item>
  );

  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>{trigger}</RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          aria-label={label}
          sideOffset={6}
          collisionPadding={8}
          className={`${SURFACE} min-w-48 p-1`}
        >
          {safe.map(renderItem)}
          {destructive.length === 0 ? null : (
            <>
              <RadixDropdown.Separator className="my-1 h-px bg-border-subtle" />
              {destructive.map(renderItem)}
            </>
          )}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}

/**
 * Convenience state for the common `open`/`onOpenChange` pair, so a screen does not write the same
 * three lines beside every overlay. Not an abstraction over `Dialog` — it holds a boolean.
 */
export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return {
    open,
    setOpen,
    onOpen: () => {
      setOpen(true);
    },
    onClose: () => {
      setOpen(false);
    },
  };
}

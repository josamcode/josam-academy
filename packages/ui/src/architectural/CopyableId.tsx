'use client';

import { useCallback, useState } from 'react';

/**
 * `BR-1506` — an entity ID, LTR-isolated, copied on click.
 *
 * The first `"use client"` in the codebase, and a deliberate one. `BR-1502` prohibits a *blanket*
 * `"use client"` — the kind put at the top of a layout so everything beneath it becomes a client
 * component. This is the opposite: one leaf that genuinely needs a click handler and the
 * clipboard, so the boundary is as small as it can be.
 *
 * `dir="ltr"` on a `<bdi>` is not decoration. An identifier like `crs_01HQZX` inside Arabic prose
 * renders with its prefix and suffix reordered without isolation, which produces a string that
 * looks almost right and is wrong when pasted into a support ticket (`BR-1393`).
 */
export interface CopyableIdProps {
  value: string;
  /**
   * Accessible label for the copy affordance, already translated. It arrives as a prop because
   * `BR-523` forbids a hardcoded string here, and this component is below the catalog.
   */
  copyLabel: string;
  /** Announced after a successful copy. Also pre-translated. */
  copiedLabel: string;
}

export function CopyableId({ value, copyLabel, copiedLabel }: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      // Reverts on its own so the control does not strand in a success state; the user gets no
      // "the button is stuck" impression if they look back at it later.
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? copiedLabel : copyLabel}
      className="inline-flex items-center gap-1 font-mono text-sm text-text-secondary"
    >
      <bdi dir="ltr">{value}</bdi>
      {/* aria-live so the copy result is announced without moving focus. */}
      <span aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ''}
      </span>
    </button>
  );
}

/**
 * Layout-API shims for jsdom.
 *
 * jsdom implements the DOM but **no layout engine** — no boxes, no scrolling, no pointer capture.
 * Radix reads all three to position and manage focus, so without these shims every Radix-backed
 * component throws on mount (`ReferenceError: ResizeObserver is not defined`) rather than failing
 * an assertion.
 *
 * ## What this deliberately does NOT do
 *
 * These shims are **inert**: `ResizeObserver` never fires, `scrollIntoView` records nothing,
 * `hasPointerCapture` always answers false. That is on purpose. A shim that pretended to measure
 * would make positioning assertions pass against fabricated geometry, which is worse than not
 * testing positioning at all (`BR-1830` — a mechanism that reports healthy and enforces nothing).
 *
 * So these specs prove **semantics, keyboard operation, ARIA wiring and value flow**. They prove
 * nothing about where a popover lands, whether a listbox scrolls its active option into view, or
 * whether a control collides with the viewport edge. That belongs to Storybook and to real-browser
 * verification, and is recorded as such (`SB-26`).
 *
 * The failure mode this file protects against is loud, not silent: remove a shim and the component
 * throws on mount. It cannot mask a defect by making a broken component look fine.
 *
 * `Object.hasOwn` rather than `in`: TypeScript narrows `'ResizeObserver' in window` to `never`,
 * since `lib.dom` declares the property as always present. The check is a runtime question about
 * this particular environment, not a type-level one.
 */

if (typeof window !== 'undefined') {
  if (!Object.hasOwn(window, 'ResizeObserver')) {
    class InertResizeObserver implements ResizeObserver {
      observe(): void {
        /* jsdom has no layout, so there is nothing to observe and nothing to report. */
      }
      unobserve(): void {
        /* see observe */
      }
      disconnect(): void {
        /* see observe */
      }
    }
    window.ResizeObserver = InertResizeObserver;
  }

  if (!Object.hasOwn(Element.prototype, 'scrollIntoView')) {
    Element.prototype.scrollIntoView = function scrollIntoView(): void {
      /* jsdom cannot scroll; Radix calls this on the active option. */
    };
  }

  // Pointer capture — Radix Select uses it to keep pointer events on the trigger while open.
  // Always answering "no capture" is the honest response for an environment with no pointer.
  if (!Object.hasOwn(Element.prototype, 'hasPointerCapture')) {
    Element.prototype.hasPointerCapture = function hasPointerCapture(): boolean {
      return false;
    };
    Element.prototype.setPointerCapture = function setPointerCapture(): void {
      /* no pointer to capture */
    };
    Element.prototype.releasePointerCapture = function releasePointerCapture(): void {
      /* no pointer to release */
    };
  }
}

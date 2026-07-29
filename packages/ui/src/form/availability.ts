/**
 * `BR-1544` — every field supports `readOnly` and `disabled` **distinctly**, and `disabled` always
 * carries a reason (`BR-1347`).
 *
 * One definition for all 24 fields. It was written three times before `PH-0.29` — once in
 * `time-fields.tsx`, once in `file-fields.tsx`, and not at all in the nineteen fields from
 * `PH-0.22`–`PH-0.24`, which took a bare `disabled?: boolean`. Three copies of a rule is two
 * chances for them to disagree; nineteen omissions is the rule not existing.
 *
 * ## Why they are different states, not two words for the same one
 *
 * | | focusable | in the tab order | value readable | value copyable | announced as |
 * | --- | --- | --- | --- | --- | --- |
 * | `readOnly` | yes | yes | yes | yes | "read only" |
 * | `disabled` | no | no | by sighted users only | no | "dimmed" / skipped entirely |
 *
 * A disabled control is **removed from the keyboard and from the accessibility tree**. That is
 * correct for something genuinely unavailable and wrong for a value the user is meant to see: a
 * screen-reader user cannot reach a disabled field at all, so an order total or a locked email
 * address rendered `disabled` is, to them, simply absent. `readOnly` is the state that says "this
 * is real, it is yours, you cannot change it here".
 *
 * ## Why the reason is required rather than encouraged
 *
 * A disabled control with no explanation is a dead end: the user can see that the thing they want
 * is unavailable and has no way to learn what would make it available. `BR-1347` has said so since
 * before this codebase existed, and it was still absent from nineteen of twenty-four fields —
 * because "always pass a reason" is a rule people obey until the afternoon they are in a hurry.
 *
 * The union makes it structural. `disabled` and `disabledReason` arrive together or not at all,
 * and `disabled: true` without one is `TS2322` at the call site. The same mechanism `Button` has
 * used since `PH-0.20`, now applied where it was missing.
 *
 * `readOnly?: never` on the disabled arm is deliberate: the two states are mutually exclusive, and
 * a control declaring both leaves the reader to guess which one won.
 */
export type Availability =
  | { disabled: true; disabledReason: string; readOnly?: never }
  | { disabled?: false; disabledReason?: never; readOnly?: boolean };

/**
 * The same contract for a single **option** inside a field — a `Select` entry, a radio, a menu
 * item.
 *
 * A greyed-out option with no explanation is the identical defect one level down, and arguably
 * worse: the user can see the thing they want, cannot choose it, and is told nothing. It is a
 * separate type only because an option is never `readOnly` — an option is not edited, it is
 * picked, so the third state does not exist for it.
 */
export type OptionAvailability =
  { disabled: true; disabledReason: string } | { disabled?: false; disabledReason?: never };

/**
 * What a control body needs after destructuring, with the defaults already applied.
 *
 * Returned rather than spread so each field decides where the pieces go: `title` belongs on the
 * element a pointer hovers, which is not always the element carrying `disabled`.
 */
export function availability(props: Availability): {
  disabled: boolean;
  readOnly: boolean;
  /** `BR-1347` — the explanation reaches everyone, not only sighted hover users. */
  title: string | undefined;
} {
  if (props.disabled === true) {
    return { disabled: true, readOnly: false, title: props.disabledReason };
  }
  return { disabled: false, readOnly: props.readOnly ?? false, title: undefined };
}

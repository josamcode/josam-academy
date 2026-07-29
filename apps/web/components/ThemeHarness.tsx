/**
 * PH-0.15 harness. Not a component of the design system — it exists so the Storybook toolbars,
 * the token bindings and the a11y run have something real to act on before PH-0.17 builds the
 * primitives. Replaced by those primitives, not extended.
 *
 * Every colour and every space is a token utility. No hex, no palette class, and — since PH-0.16
 * — no copy either: every string arrives as a prop, so this satisfies `BR-523` the way a real
 * component will. The story supplies them as `args`, which is what a story is for.
 *
 * That also makes it a useful canary: if PH-0.14's token binding regresses, this renders unstyled.
 */
export interface ThemeHarnessProps {
  heading: string;
  body: string;
  actionLabel: string;
  statusLabels: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
}

export function ThemeHarness({ heading, body, actionLabel, statusLabels }: ThemeHarnessProps) {
  return (
    <section className="bg-bg-surface text-text-primary p-8 rounded-lg">
      <h1 className="text-2xl text-text-primary">{heading}</h1>
      {/* Direction is inherited from <html dir>, set by the toolbar decorator. */}
      <p className="text-base text-text-secondary">{body}</p>
      <div className="flex gap-4 p-4">
        <button type="button" className="bg-accent text-accent-contrast p-3 rounded-md">
          {actionLabel}
        </button>
        <span className="text-success-text">{statusLabels.success}</span>
        <span className="text-warning-text">{statusLabels.warning}</span>
        <span className="text-danger-text">{statusLabels.danger}</span>
        <span className="text-info-text">{statusLabels.info}</span>
      </div>
    </section>
  );
}

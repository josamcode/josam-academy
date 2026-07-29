/**
 * PH-0.15 harness. Not a component of the design system — it exists so the Storybook toolbars,
 * the token bindings and the a11y run have something real to act on before PH-0.17 builds the
 * primitives. Replaced by those primitives, not extended.
 *
 * Every colour and every space here is a token utility. There is no hex and no palette class,
 * which is also what makes it a useful canary: if PH-0.14's binding regresses, this renders
 * unstyled.
 */
export function ThemeHarness({ heading }: { heading: string }) {
  return (
    <section className="bg-bg-surface text-text-primary p-8 rounded-lg">
      <h1 className="text-2xl text-text-primary">{heading}</h1>
      <p className="text-base text-text-secondary">
        {/* Direction is inherited from <html dir>, set by the toolbar decorator. */}A paragraph, so
        the direction toggle has running text to reverse.
      </p>
      <div className="flex gap-4 p-4">
        <button type="button" className="bg-accent text-accent-contrast p-3 rounded-md">
          Primary action
        </button>
        <span className="text-success-text">Success</span>
        <span className="text-warning-text">Warning</span>
        <span className="text-danger-text">Danger</span>
        <span className="text-info-text">Info</span>
      </div>
    </section>
  );
}

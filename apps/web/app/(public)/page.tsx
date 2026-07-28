/**
 * PH-0.4 scaffold. Route group (public) → "/". Landing, catalog, course, verify and legal
 * surfaces are built in later phases.
 *
 * Copy is a route marker, not user-facing text: real strings arrive through packages/i18n at
 * PH-0.13 (BR-525), and the fitness function that fails the build on a hardcoded string is
 * PH-0.16.
 */
export default function PublicLandingPage() {
  return (
    <main className="grid gap-4 p-8 bg-bg-base text-text-primary" data-route-group="public">
      public
    </main>
  );
}

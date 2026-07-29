import { Box, Stack, Surface } from '@josam/ui';

/**
 * PH-0.4 scaffold, rebuilt on the primitives at PH-0.17.
 *
 * `BR-1524` — feature code imports from `@josam/ui` only. `BR-1534` — feature components compose
 * primitives; raw CSS in a feature file requires a documented exception. This route is still a
 * scaffold, but it is already the shape every real screen takes: no `className`, no raw CSS.
 *
 * `data-route-group` stays because the PH-0.4 render check reads it.
 */
export default function PublicLandingPage() {
  return (
    <main data-route-group="public">
      <Surface level="base" border="none" padding="8" radius="lg">
        <Stack gap="4">
          <Surface level="surface" padding="4" radius="md">
            <Box padding="2" />
          </Surface>
        </Stack>
      </Surface>
    </main>
  );
}

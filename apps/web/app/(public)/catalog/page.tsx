/**
 * PH-0.4 ISR probe (DEC-17: SSG/ISR for public pages, CSR for authenticated surfaces).
 *
 * `revalidate` is what makes this route incrementally static rather than fully static or
 * dynamic. The proof is the route table printed by `next build`, which must classify this
 * path as revalidating — not the presence of this export.
 */
export const revalidate = 60;

export default function CatalogPage() {
  const generatedAt = new Date().toISOString();

  return (
    <main data-route-group="public" data-isr="60">
      <span data-generated-at={generatedAt} />
    </main>
  );
}

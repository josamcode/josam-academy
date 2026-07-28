/**
 * PH-0.4 scaffold. Route group (admin) → "/admin", gated by admin:access in Phase 1 (DEC-16:
 * admin lives inside the same app). BR-923 requires this group to be code-split so a learner
 * bundle never contains admin code.
 */
export default function AdminPage() {
  return <main data-route-group="admin">admin</main>;
}

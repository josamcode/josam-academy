import { SetMetadata, type CustomDecorator } from '@nestjs/common';

/** Metadata key naming the model a route returns. Read by `CapabilityInterceptor`. */
export const CAPABILITY_SUBJECT = 'josam:capability-subject';

/**
 * `PH-1.11` — declare the model this route's payload describes. `BR-844`, `BR-1107`, `FEAT-017`.
 *
 * ```ts
 * ⁠@Capabilities('course')
 * ⁠@Get(':id')
 * findOne(): Envelope<Course> { … }
 * ```
 *
 * The argument is a **model name from `05 §5`'s permission keys** — the `course` in
 * `course:update.own` — not a class name and not a route segment. That is the whole wiring: the
 * interceptor derives the capability actions for that model from `PH-1.8`'s registry, so a route
 * says WHICH resource it returns and never WHICH capabilities to compute (`BR-844` — `_can` is
 * never hand-written per endpoint).
 *
 * ## Why the subject is declared rather than inferred
 *
 * Nest can see the handler's return type only if it is a class with decorated metadata, and our
 * payloads are plain objects behind an envelope. Guessing from the controller name would be
 * wrong for every route that returns something other than its own resource — `GET /courses/:id/
 * students` returns users — and a capability map computed against the wrong model is a map of
 * plausible-looking booleans about a different question.
 *
 * A route without this decorator is passed through untouched. That is deliberate and it is NOT
 * the same choice `@RequirePermission` makes: an undeclared PERMISSION is a hole in enforcement
 * and fails closed (`BR-1631`), while an undeclared SUBJECT means the response carries no
 * capability information and the client renders nothing extra. `BR-041` — enforcement is the
 * guard's job, and this layer must be incapable of being the thing that protects a route.
 */
export const Capabilities = (model: string): CustomDecorator<string> =>
  SetMetadata(CAPABILITY_SUBJECT, model);

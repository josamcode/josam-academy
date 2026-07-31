import { SetMetadata, type CustomDecorator } from '@nestjs/common';

/** Metadata key carrying the permission a route requires. Read by `PermissionGuard`. */
export const REQUIRED_PERMISSION = 'josam:required-permission';

/** Marks a route as deliberately public — the only sanctioned alternative to a permission. */
export const PUBLIC_ROUTE = 'josam:public-route';

/**
 * `PH-1.10` — declare the permission a route requires. `BR-1631`, `BR-714`.
 *
 * `BR-1631`: every endpoint declares its required permission EXPLICITLY, and an endpoint without a
 * declaration fails a startup check. The key must exist in `PH-1.8`'s registry; a key that does
 * not is `PERMISSION_UNKNOWN`, denied for everyone including `super_admin`.
 */
export const RequirePermission = (permission: string): CustomDecorator<string> =>
  SetMetadata(REQUIRED_PERMISSION, permission);

/**
 * Marks a route as intentionally unauthenticated — login, registration, health.
 *
 * This exists so that "no permission declared" and "deliberately public" are DIFFERENT states in
 * the source. Without it the startup check could only warn, because it could not tell a route
 * someone decided to open from a route someone forgot to close — and a check that cannot
 * distinguish those two has to be advisory, which means it stops being read.
 */
export const PublicRoute = (): CustomDecorator<string> => SetMetadata(PUBLIC_ROUTE, true);

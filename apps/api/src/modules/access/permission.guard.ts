import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSION_REGISTRY } from './permission-registry.js';
import { DenialReason } from './denial-reason.js';
import { PUBLIC_ROUTE, REQUIRED_PERMISSION } from './require-permission.decorator.js';

/**
 * Registry keys, resolved once at module load. A miss is `PERMISSION_UNKNOWN`, never a pass.
 *
 * Module-level rather than a static field: a `static #private` cannot coexist with a class
 * decorator (TS18036), and `@Injectable()` is not optional here.
 */
const KNOWN_PERMISSIONS: ReadonlySet<string> = new Set(PERMISSION_REGISTRY.map((p) => p.key));

/** The actor the authentication layer put on the request. */
interface RequestActor {
  readonly id: string;
  readonly role: string;
  readonly permissions: readonly string[];
  readonly revokedPermissions: readonly string[];
}

/**
 * `PH-1.10` — layer 2 of `14 §4`. `BR-714`, `BR-1631`, `BR-1633`, `BR-1634`.
 *
 * **Deny-closed at every branch.** Every path through this guard that is not an explicit grant
 * returns `false`, and each one says WHY in the log with a distinct reason code. The response says
 * nothing (`BR-1633`) — a `403` that names the missing permission is an oracle for enumerating the
 * permission model.
 *
 * The two silent denials are the point of the design. See `denial-reason.ts`.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const controller = context.getClass();
    const route = `${controller.name}.${handler.name}`;

    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [handler, controller]) === true) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string | undefined>(REQUIRED_PERMISSION, [
      handler,
      controller,
    ]);

    // ── SILENT DENIAL 2 — no declaration at all ────────────────────────────────────────────
    //
    // `BR-1631` makes this a STARTUP failure, so reaching it at runtime means the startup check
    // was bypassed or a route was registered dynamically after it ran. Deny, and say plainly that
    // the endpoint is unprotected rather than that the actor is unauthorized — those send whoever
    // reads this log to completely different places.
    if (required === undefined) {
      this.logger.error(
        `authorization denied [${DenialReason.ANNOTATION_MISSING}] route=${route} — this endpoint ` +
          'declares NO required permission and is not marked @PublicRoute. Nobody can reach it. ' +
          'This is an unprotected endpoint, not a permission problem: decide what it requires ' +
          '(BR-1631).',
      );
      throw new ForbiddenException();
    }

    // ── SILENT DENIAL 1 — the key is not in the registry ───────────────────────────────────
    //
    // Distinct from the above and from an ordinary denial: NOBODY holds this permission, because
    // it does not exist to be granted. `super_admin` is refused too, which is the signature that
    // separates this from "you lack it" when reading the log.
    if (!KNOWN_PERMISSIONS.has(required)) {
      this.logger.error(
        `authorization denied [${DenialReason.PERMISSION_UNKNOWN}] route=${route} ` +
          `permission=${required} — this key is NOT in the permission registry, so it can never ` +
          'be granted and every actor is denied, super_admin included. The endpoint or the ' +
          'registry is wrong (PH-1.8); no permission assignment can fix it.',
      );
      throw new ForbiddenException();
    }

    const actor = context.switchToHttp().getRequest<{ actor?: RequestActor }>().actor;

    if (actor === undefined) {
      this.logger.warn(
        `authorization denied [${DenialReason.NOT_AUTHENTICATED}] route=${route} ` +
          `permission=${required} — no authenticated actor on the request`,
      );
      throw new UnauthorizedException();
    }

    // `BR-038` — revoke beats grant, and it is reported as a revocation rather than an absence so
    // an administrator is not left looking for a grant that is present and being overridden.
    if (actor.revokedPermissions.includes(required)) {
      this.logger.warn(
        `authorization denied [${DenialReason.PERMISSION_REVOKED}] route=${route} ` +
          `permission=${required} actor=${actor.id} role=${actor.role} — an explicit revoke ` +
          'override beat the grant (BR-038)',
      );
      throw new ForbiddenException();
    }

    // `BR-963` / `BR-639` — super_admin's permissions are implicit and never stored as rows. This
    // sits AFTER the two silent denials on purpose: neither is a permission the role can hold, so
    // short-circuiting earlier would hide exactly the two defects this guard exists to surface.
    if (actor.role === 'super_admin') return true;

    if (!actor.permissions.includes(required)) {
      // `BR-1634` — the ordinary denial. Logged at `warn` as a security event; repeated denials
      // from one actor are what a rate of these lines makes visible.
      this.logger.warn(
        `authorization denied [${DenialReason.PERMISSION_NOT_GRANTED}] route=${route} ` +
          `permission=${required} actor=${actor.id} role=${actor.role}`,
      );
      throw new ForbiddenException();
    }

    return true;
  }
}

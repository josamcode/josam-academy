import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DenialReason } from './denial-reason.js';
import { PermissionGuard } from './permission.guard.js';
import { PUBLIC_ROUTE, REQUIRED_PERMISSION } from './require-permission.decorator.js';

/**
 * `PH-1.10` requirement 2 — the two SILENT denials must be distinguishable.
 *
 * `BR-1837`: assert the effect, not the marker. The effect an administrator actually experiences
 * is the LOG LINE, because `BR-1633` means the HTTP response is identical in every denial — a
 * bare `403`. So these specs assert on what was logged, at what level, with which reason code.
 * Asserting only that a `ForbiddenException` was thrown would pass identically for all five
 * causes, which is precisely the ambiguity this requirement exists to remove.
 */

interface Meta {
  permission?: string | undefined;
  public?: boolean;
}

const contextFor = (actor?: unknown): ExecutionContext =>
  ({
    getHandler: () =>
      function handler() {
        return undefined;
      },
    getClass: () => class ThingController {},
    switchToHttp: () => ({ getRequest: () => ({ actor }) }),
  }) as unknown as ExecutionContext;

const reflectorFor = (meta: Meta): Reflector =>
  ({
    getAllAndOverride: (key: string) =>
      key === PUBLIC_ROUTE
        ? meta.public
        : key === REQUIRED_PERMISSION
          ? meta.permission
          : undefined,
  }) as unknown as Reflector;

const learner = {
  id: 'usr_1',
  role: 'student',
  permissions: ['profile:read.own'],
  revokedPermissions: [] as string[],
};

describe('PH-1.10 — PermissionGuard (BR-714, BR-1631, BR-1633)', () => {
  let errors: string[];
  let warns: string[];

  beforeEach(() => {
    errors = [];
    warns = [];
    vi.spyOn(Logger.prototype, 'error').mockImplementation((m: unknown) => {
      errors.push(String(m));
    });
    vi.spyOn(Logger.prototype, 'warn').mockImplementation((m: unknown) => {
      warns.push(String(m));
    });
  });

  it('grants when the actor holds the permission', () => {
    const guard = new PermissionGuard(reflectorFor({ permission: 'profile:read.own' }));
    expect(guard.canActivate(contextFor(learner))).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('lets a @PublicRoute through without an actor', () => {
    const guard = new PermissionGuard(reflectorFor({ public: true }));
    expect(guard.canActivate(contextFor(undefined))).toBe(true);
  });

  // ── the two silent denials ────────────────────────────────────────────────────────────────

  it('SILENT DENIAL 2 — a missing annotation is ANNOTATION_MISSING, logged as an error', () => {
    const guard = new PermissionGuard(reflectorFor({}));
    expect(() => guard.canActivate(contextFor(learner))).toThrow(ForbiddenException);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(DenialReason.ANNOTATION_MISSING);
    expect(errors[0]).toContain('ThingController.handler');
    // It must describe an UNPROTECTED ENDPOINT, not an unauthorized actor — the remedies differ.
    expect(errors[0]).toContain('unprotected endpoint');
    expect(errors[0]).not.toContain(DenialReason.PERMISSION_UNKNOWN);
  });

  it('SILENT DENIAL 1 — an unregistered key is PERMISSION_UNKNOWN, logged as an error', () => {
    const guard = new PermissionGuard(reflectorFor({ permission: 'course:teleport' }));
    expect(() => guard.canActivate(contextFor(learner))).toThrow(ForbiddenException);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(DenialReason.PERMISSION_UNKNOWN);
    expect(errors[0]).toContain('course:teleport');
    expect(errors[0]).not.toContain(DenialReason.ANNOTATION_MISSING);
  });

  it('the two silent denials do not share a reason code or a message', () => {
    const missing = new PermissionGuard(reflectorFor({}));
    const unknown = new PermissionGuard(reflectorFor({ permission: 'course:teleport' }));
    expect(() => missing.canActivate(contextFor(learner))).toThrow();
    expect(() => unknown.canActivate(contextFor(learner))).toThrow();

    expect(DenialReason.ANNOTATION_MISSING).not.toBe(DenialReason.PERMISSION_UNKNOWN);
    expect(errors[0]).not.toBe(errors[1]);
  });

  /**
   * The signature that separates `PERMISSION_UNKNOWN` from an ordinary denial when reading a log:
   * an unknown key denies EVERYONE, so `super_admin` is refused too. `BR-963` short-circuits
   * super_admin, and placing that check before these two would have hidden both defects behind
   * the one role most likely to be exercising a new endpoint.
   */
  it('PERMISSION_UNKNOWN denies super_admin too — BR-963 must not mask it', () => {
    const guard = new PermissionGuard(reflectorFor({ permission: 'course:teleport' }));
    const root = { id: 'usr_0', role: 'super_admin', permissions: [], revokedPermissions: [] };
    expect(() => guard.canActivate(contextFor(root))).toThrow(ForbiddenException);
    expect(errors[0]).toContain(DenialReason.PERMISSION_UNKNOWN);
  });

  it('ANNOTATION_MISSING denies super_admin too', () => {
    const guard = new PermissionGuard(reflectorFor({}));
    const root = { id: 'usr_0', role: 'super_admin', permissions: [], revokedPermissions: [] };
    expect(() => guard.canActivate(contextFor(root))).toThrow(ForbiddenException);
    expect(errors[0]).toContain(DenialReason.ANNOTATION_MISSING);
  });

  // ── the ordinary denials, which must NOT look like the silent ones ────────────────────────

  it('an ungranted permission is PERMISSION_NOT_GRANTED at warn, not error', () => {
    const guard = new PermissionGuard(reflectorFor({ permission: 'user:delete' }));
    expect(() => guard.canActivate(contextFor(learner))).toThrow(ForbiddenException);
    expect(errors).toHaveLength(0);
    expect(warns[0]).toContain(DenialReason.PERMISSION_NOT_GRANTED);
  });

  it('a revoke override reports PERMISSION_REVOKED, not a plain absence (BR-038)', () => {
    const guard = new PermissionGuard(reflectorFor({ permission: 'profile:read.own' }));
    const revoked = { ...learner, revokedPermissions: ['profile:read.own'] };
    expect(() => guard.canActivate(contextFor(revoked))).toThrow(ForbiddenException);
    expect(warns[0]).toContain(DenialReason.PERMISSION_REVOKED);
    expect(warns[0]).not.toContain(DenialReason.PERMISSION_NOT_GRANTED);
  });

  it('no actor is NOT_AUTHENTICATED (401), distinct from a 403', () => {
    const guard = new PermissionGuard(reflectorFor({ permission: 'profile:read.own' }));
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(UnauthorizedException);
    expect(warns[0]).toContain(DenialReason.NOT_AUTHENTICATED);
  });

  it('BR-1633 — no denial discloses the permission in the response body', () => {
    const guard = new PermissionGuard(reflectorFor({ permission: 'user:delete' }));
    try {
      guard.canActivate(contextFor(learner));
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(JSON.stringify((error as ForbiddenException).getResponse())).not.toContain(
        'user:delete',
      );
    }
  });
});

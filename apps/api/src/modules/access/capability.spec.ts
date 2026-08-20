import {
  Controller,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type Type,
} from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Actor } from '@josam/abilities';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../../app.module.js';
import { Capabilities } from './capability.decorator.js';
import { CapabilityInterceptor } from './capability.interceptor.js';

/**
 * `PH-1.11` — the capability interceptor. `BR-844`, `BR-1107`, `BR-1108`, `FEAT-017`, `05 §7`.
 *
 * The metadata is read by a REAL `Reflector` from REAL decorated classes, so `@Capabilities` and
 * the interceptor are exercised as the pair they are. A hand-rolled reflector stub — the shape
 * `permission-guard.spec.ts` uses, correctly, because it is testing branch-by-branch denial
 * behaviour — would pass here even if the decorator wrote its metadata under a different key,
 * which is the one wiring defect this file exists to catch.
 *
 * The interceptor itself is resolved from a Nest container rather than constructed with `new`
 * (`security.module.spec.ts` — the API could not boot for five tasks because every spec bypassed
 * the injector).
 */

/**
 * The handlers return nothing: the payload under test is supplied to `CallHandler` directly, so
 * what these classes exist to carry is the METADATA. `undefined` is returned explicitly because an
 * empty body is a lint error, and a body is the wrong place to say that.
 */
@Controller()
class CourseController {
  @Capabilities('course')
  one(): undefined {
    return undefined;
  }

  @Capabilities('course')
  many(): undefined {
    return undefined;
  }
}

/** No `@Capabilities` — the `GET /health` shape. */
@Controller()
class UndeclaredController {
  check(): undefined {
    return undefined;
  }
}

/** A model no permission key names. `_can` would be `{}` on every response. */
@Controller()
class TypoController {
  @Capabilities('corse')
  one(): undefined {
    return undefined;
  }
}

/**
 * Every capability action the registry gives `course`, in the order `capabilityActionsFor`
 * produces. Asserted literally rather than derived in the spec: deriving it here would make the
 * test agree with the implementation by construction, and `BR-844`'s claim is that this list comes
 * from the REGISTRY. `publish.request` and `publish.approve` are separate entries — the `PH-1.11`
 * scope fix — and `update.own`/`update.any` have collapsed to one.
 */
const COURSE_ACTIONS = [
  'archive',
  'create',
  'delete',
  'publish.approve',
  'publish.request',
  'read',
  'update',
];

const contextFor = (controller: Type<unknown>, method: string, actor?: Actor): ExecutionContext =>
  ({
    getHandler: () => (controller.prototype as Record<string, unknown>)[method],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ actor }) }),
  }) as unknown as ExecutionContext;

const handlerReturning = (payload: unknown): CallHandler => ({ handle: () => of(payload) });

const instructor: Actor = {
  id: 'usr_7',
  role: 'instructor',
  permissions: ['course:read', 'course:create', 'course:update.own', 'course:publish.request'],
  revokedPermissions: [],
};

describe('PH-1.11 — CapabilityInterceptor (BR-844, BR-1107, BR-1108)', () => {
  let interceptor: CapabilityInterceptor;
  let warns: string[];
  let errors: string[];

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CourseController, UndeclaredController, TypoController],
      providers: [CapabilityInterceptor],
    }).compile();

    interceptor = moduleRef.get(CapabilityInterceptor);

    warns = [];
    errors = [];
    vi.spyOn(Logger.prototype, 'warn').mockImplementation((m: unknown) => {
      warns.push(String(m));
    });
    vi.spyOn(Logger.prototype, 'error').mockImplementation((m: unknown) => {
      errors.push(String(m));
    });
  });

  const run = async (
    controller: Type<unknown>,
    method: string,
    payload: unknown,
    actor?: Actor,
  ): Promise<unknown> =>
    firstValueFrom(
      interceptor.intercept(contextFor(controller, method, actor), handlerReturning(payload)),
    );

  it('resolves from the container with the real Reflector injected', () => {
    expect(interceptor).toBeInstanceOf(CapabilityInterceptor);
  });

  it('the real app graph binds it GLOBALLY under APP_INTERCEPTOR (BR-844)', async () => {
    // `BR-844` — "the capability interceptor runs on every response". A per-controller binding
    // satisfies that claim on the day it is written and not afterwards. What makes it true is the
    // GLOBAL token, so the global token is what gets asserted: the container is asked for
    // `APP_INTERCEPTOR` and must hand back this class.
    //
    // Against the WHOLE `AppModule`, not `AccessModule` alone — which cannot compile in isolation
    // anyway, because `DatabaseModule`'s health indicator needs `SharedHealthModule`. The broader
    // graph is the better assertion regardless: a global provider that resolves in its own module
    // and not in the application is a provider that does not exist at runtime.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    // `ApplicationConfig.getGlobalInterceptors()` IS the list Nest consults on every response,
    // which makes it the effect rather than the marker (`BR-1837`). Asking the container for
    // `APP_INTERCEPTOR` does not work and is worth recording: Nest rewrites that token to a
    // generated unique one so several enhancers can share it, so `moduleRef.get(APP_INTERCEPTOR)`
    // throws "could not find APP_INTERCEPTOR element" whether or not the binding exists — a check
    // that fails identically in both states, which is no check at all (`BR-1830`).
    const globals = moduleRef.get(ApplicationConfig, { strict: false }).getGlobalInterceptors();

    expect(globals.some((each) => each instanceof CapabilityInterceptor)).toBe(true);

    await moduleRef.close();
  });

  // ── the undeclared route ──────────────────────────────────────────────────────────────────

  it('a route with no @Capabilities is passed through UNTOUCHED', async () => {
    // `GET /health` must be byte-identical with this interceptor installed and without it.
    const payload = { status: 'ok', checks: { database: 'up', redis: 'up' } };
    const before = JSON.stringify(payload);

    const result = await run(UndeclaredController, 'check', payload);

    expect(result).toBe(payload);
    expect(JSON.stringify(result)).toBe(before);
    expect(JSON.stringify(result)).not.toContain('_can');
  });

  it('an ENVELOPE-shaped payload from an undeclared route is untouched too', async () => {
    /**
     * The health payload above is not enough on its own, and the difference matters. `/health`
     * has no `data` key, so it survives the envelope branch untouched even if the declaration
     * check is removed entirely — the spec would stay green while the guard it names was gone.
     * This payload takes the branch, so only the DECLARATION can be what stops it.
     *
     * Object identity is likewise not proof that no operator ran (`map(p => p)` preserves it);
     * what it proves is that nothing was rebuilt, which is the property being claimed.
     */
    const payload = { data: { id: 'crs_1', owner_id: 'usr_7' }, meta: { total: 1 } };

    const result = await run(UndeclaredController, 'check', payload, instructor);

    expect(result).toBe(payload);
    expect(JSON.stringify(result)).not.toContain('_can');
  });

  it('a non-envelope payload from a DECLARED route is passed through untouched', async () => {
    // `11 §1.3` describes `{ data: … }`. Anything else — a bare array, a scalar, `null` — is not
    // a resource response and this layer has nothing to say about it.
    const array = [{ id: 'crs_1' }];

    expect(await run(CourseController, 'one', array, instructor)).toBe(array);
    expect(await run(CourseController, 'one', 'ok', instructor)).toBe('ok');
    expect(await run(CourseController, 'one', null, instructor)).toBeNull();
    expect(await run(CourseController, 'one', { meta: { total: 0 } }, instructor)).toEqual({
      meta: { total: 0 },
    });
  });

  // ── the single resource (05 §7.1, 11 §1.3) ────────────────────────────────────────────────

  it('attaches a registry-derived _can to a single resource', async () => {
    const result = await run(
      CourseController,
      'one',
      { data: { id: 'crs_1', owner_id: 'usr_7' } },
      instructor,
    );

    const data = (result as { data: Record<string, unknown> }).data;

    // BR-844 — the key set is the registry's, not the route's.
    expect(Object.keys(data['_can'] as object)).toEqual(COURSE_ACTIONS);
    expect(data['_can']).toEqual({
      archive: false,
      create: true,
      delete: false,
      'publish.approve': false,
      'publish.request': true,
      read: true,
      update: true,
    });
    // The resource's own fields survive.
    expect(data['id']).toBe('crs_1');
  });

  it('`.own` is answered against THIS record, not against the model', async () => {
    const mine = await run(
      CourseController,
      'one',
      { data: { id: 'crs_1', owner_id: 'usr_7' } },
      instructor,
    );
    const theirs = await run(
      CourseController,
      'one',
      { data: { id: 'crs_2', owner_id: 'usr_9' } },
      instructor,
    );

    expect((mine as { data: { _can: Record<string, boolean> } }).data._can['update']).toBe(true);
    expect((theirs as { data: { _can: Record<string, boolean> } }).data._can['update']).toBe(false);
  });

  it('PH-1.11 scope fix — `publish.request` is granted and `publish.approve` is not (BR-657)', async () => {
    // The collision that made this task impossible on the old ability mapping: the instructor
    // holds `course:publish.request` and would have read as able to `publish`.
    const result = await run(CourseController, 'one', { data: { id: 'crs_1' } }, instructor);
    const can = (result as { data: { _can: Record<string, boolean> } }).data._can;

    expect(can['publish.request']).toBe(true);
    expect(can['publish.approve']).toBe(false);
    expect(Object.keys(can)).not.toContain('publish');
  });

  it('does not mutate the payload the handler returned', async () => {
    const data = { id: 'crs_1', owner_id: 'usr_7' };
    const payload = { data };

    await run(CourseController, 'one', payload, instructor);

    expect(Object.getOwnPropertyNames(data)).toEqual(['id', 'owner_id']);
    expect(Object.getOwnPropertyNames(payload)).toEqual(['data']);
  });

  it('leaks no __caslSubjectType__ into the serialized response', async () => {
    // `subject()` stamps a type onto the object it evaluates. CASL 7.0.1 defines it
    // non-enumerably, and `capabilitiesForRecord` additionally evaluates a COPY — this asserts the
    // outcome both of those exist for, so a change in either is visible here.
    const result = await run(
      CourseController,
      'many',
      { data: [{ id: 'crs_1', owner_id: 'usr_7' }] },
      instructor,
    );

    expect(JSON.stringify(result)).not.toContain('__caslSubjectType__');
  });

  // ── the collection (BR-1108) ──────────────────────────────────────────────────────────────

  it('attaches a per-item _can AND a collection-level _can', async () => {
    const result = (await run(
      CourseController,
      'many',
      {
        data: [
          { id: 'crs_1', owner_id: 'usr_7' },
          { id: 'crs_2', owner_id: 'usr_9' },
        ],
        meta: { total: 2 },
      },
      instructor,
    )) as {
      data: { _can: Record<string, boolean> }[];
      _can: Record<string, boolean>;
      meta: unknown;
    };

    expect(result.data[0]?._can['update']).toBe(true);
    expect(result.data[1]?._can['update']).toBe(false);
    expect(Object.keys(result._can)).toEqual(COURSE_ACTIONS);
    // Everything else in the envelope is left exactly as the handler wrote it.
    expect(result.meta).toEqual({ total: 2 });
  });

  it('the collection-level map does NOT over-report an `own`-scoped action', async () => {
    // A collection-level capability means "can do this without reference to a particular record".
    // CASL's own `can('update', 'course')` answers TRUE here — a conditioned rule matches a bare
    // string subject because there are no fields to test — and under PRIN-01 the client would
    // draw an Edit control at the top of a list of courses the instructor mostly cannot edit.
    const result = (await run(CourseController, 'many', { data: [] }, instructor)) as {
      _can: Record<string, boolean>;
    };

    expect(result._can['update']).toBe(false);
    expect(result._can['create']).toBe(true);
    expect(result._can['read']).toBe(true);
  });

  it('an empty collection still carries the collection-level map', async () => {
    // BR-699 — an empty result is an empty state with a next action, and `create` is that action.
    const result = (await run(CourseController, 'many', { data: [] }, instructor)) as {
      data: unknown[];
      _can: Record<string, boolean>;
    };

    expect(result.data).toEqual([]);
    expect(result._can['create']).toBe(true);
  });

  it('leaves a non-object array item alone', async () => {
    const result = (await run(CourseController, 'many', { data: ['crs_1', 3] }, instructor)) as {
      data: unknown[];
    };

    expect(result.data).toEqual(['crs_1', 3]);
  });

  // ── the actor ─────────────────────────────────────────────────────────────────────────────

  it('with NO actor on the request every capability is false, and nothing throws', async () => {
    // No auth guard installs `request.actor` yet (PH-1.12). Deny-all is the answer, never an
    // exception: BR-041 — this layer is a UX layer and cannot fail a request.
    const result = (await run(CourseController, 'one', { data: { id: 'crs_1' } })) as {
      data: { _can: Record<string, boolean> };
    };

    expect(Object.keys(result.data._can)).toEqual(COURSE_ACTIONS);
    expect(Object.values(result.data._can).every((value) => value === false)).toBe(true);
  });

  it('super_admin can do everything, including the qualified actions (BR-639)', async () => {
    const root: Actor = {
      id: 'usr_0',
      role: 'super_admin',
      permissions: [],
      revokedPermissions: [],
    };
    const result = (await run(CourseController, 'one', { data: { id: 'crs_1' } }, root)) as {
      data: { _can: Record<string, boolean> };
    };

    expect(Object.values(result.data._can).every((value) => value === true)).toBe(true);
    expect(result.data._can['publish.approve']).toBe(true);
  });

  it('two actors on the same route get different maps — nothing is cached (BR-703, BR-040)', async () => {
    const payload = { data: { id: 'crs_1', owner_id: 'usr_7' } };
    const stranger: Actor = { ...instructor, id: 'usr_9' };

    const first = (await run(CourseController, 'one', payload, instructor)) as {
      data: { _can: Record<string, boolean> };
    };
    const second = (await run(CourseController, 'one', payload, stranger)) as {
      data: { _can: Record<string, boolean> };
    };

    expect(first.data._can['update']).toBe(true);
    expect(second.data._can['update']).toBe(false);
  });

  // ── producer-supplied `_can` (05 §7.2) ────────────────────────────────────────────────────

  it('keeps handler capabilities the registry cannot express, and lets the restrictive one win', async () => {
    // 05 §7.2's locked lesson: `play` has a permission key and is ALSO gated by unlock rules;
    // `read_notes` has no key at all. Overwriting the handler's map would delete the second;
    // ignoring the derived map would make every endpoint hand-write `_can` (BR-844).
    const result = (await run(
      CourseController,
      'one',
      {
        data: {
          id: 'crs_1',
          owner_id: 'usr_7',
          _can: { update: false, read_notes: true, delete: true },
        },
      },
      instructor,
    )) as { data: { _can: Record<string, boolean> } };

    // Permission says yes, handler says no → no.
    expect(result.data._can['update']).toBe(false);
    // Handler says yes, permission says no → no. The handler cannot grant past the guard.
    expect(result.data._can['delete']).toBe(false);
    // Handler-only key survives.
    expect(result.data._can['read_notes']).toBe(true);
    // …and the merged map is still ordered.
    expect(Object.keys(result.data._can)).toEqual([...COURSE_ACTIONS, 'read_notes'].sort());
  });

  it('drops a non-boolean capability value rather than serializing it', async () => {
    const result = (await run(
      CourseController,
      'one',
      { data: { id: 'crs_1', _can: { read: 'yes', invented: 'maybe' } } },
      instructor,
    )) as { data: { _can: Record<string, unknown> } };

    // `read` falls back to the permission answer; the junk key is gone entirely — a client
    // writing `if (_can.invented)` would otherwise get a confident wrong answer from a string.
    expect(result.data._can['read']).toBe(true);
    expect(Object.keys(result.data._can)).not.toContain('invented');
  });

  // ── `_reason` (BR-1110, BR-1111, BR-1112) ─────────────────────────────────────────────────

  it('passes a valid _reason through untouched — the interceptor never invents one', async () => {
    const reason = {
      code: 'LESSON_LOCKED',
      message: { ar: 'أكمل الدرس السابق', en: 'Complete the previous lesson' },
      action: { type: 'navigate', label: { ar: 'اذهب', en: 'Go' }, target: '/lessons/lsn_1' },
    };

    const result = (await run(
      CourseController,
      'one',
      { data: { id: 'crs_1', _reason: reason } },
      instructor,
    )) as { data: { _reason: unknown } };

    expect(result.data._reason).toEqual(reason);
    expect(warns).toHaveLength(0);
  });

  it('STRIPS a _reason carrying PERMISSION_ABSENT and names the route (BR-1111, BR-707)', async () => {
    // The code exists in 05 §7.3 and is structurally excluded from `Reason`, so a handler can only
    // reach it by assembling the payload dynamically — which is exactly why the runtime strip has
    // to exist alongside the type.
    const result = (await run(
      CourseController,
      'one',
      {
        data: {
          id: 'crs_1',
          _reason: { code: 'PERMISSION_ABSENT', message: { ar: 'ممنوع', en: 'Nope' } },
        },
      },
      instructor,
    )) as { data: Record<string, unknown> };

    expect(result.data).not.toHaveProperty('_reason');
    expect(JSON.stringify(result)).not.toContain('PERMISSION_ABSENT');
    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain('CourseController.one');
    expect(warns[0]).toContain('PERMISSION_ABSENT');
  });

  it('STRIPS a _reason whose code is not in 05 §7.3 (BR-1110)', async () => {
    const result = (await run(
      CourseController,
      'one',
      { data: { id: 'crs_1', _reason: { code: 'FEELING_UNLUCKY' } } },
      instructor,
    )) as { data: Record<string, unknown> };

    expect(result.data).not.toHaveProperty('_reason');
    expect(warns[0]).toContain('FEELING_UNLUCKY');
  });

  it('STRIPS a malformed _reason', async () => {
    const result = (await run(
      CourseController,
      'one',
      { data: { id: 'crs_1', _reason: 'locked' } },
      instructor,
    )) as { data: Record<string, unknown> };

    expect(result.data).not.toHaveProperty('_reason');
    expect(warns[0]).toContain('CourseController.one');
  });

  it('polices a _reason at the envelope root too', async () => {
    const result = (await run(
      CourseController,
      'many',
      { data: [], _reason: { code: 'PERMISSION_ABSENT' } },
      instructor,
    )) as Record<string, unknown>;

    expect(result).not.toHaveProperty('_reason');
  });

  // ── the unknown subject ───────────────────────────────────────────────────────────────────

  it('an unknown @Capabilities model logs an error and still serves the response', async () => {
    const result = (await run(TypoController, 'one', { data: { id: 'crs_1' } }, instructor)) as {
      data: Record<string, unknown>;
    };

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('TypoController.one');
    expect(errors[0]).toContain('corse');
    // Served, with an empty map — never a 500 from the UX layer (BR-041).
    expect(result.data['_can']).toEqual({});
    expect(result.data['id']).toBe('crs_1');
  });
});

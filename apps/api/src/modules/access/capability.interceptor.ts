import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  type Actor,
  type AppAbility,
  type CapabilityMap,
  capabilitiesForCollection,
  capabilitiesForRecord,
  capabilityActionsFor,
  defineAbilitiesFor,
  isEmittableReasonCode,
  parsePermission,
} from '@josam/abilities';
import { map, type Observable } from 'rxjs';

import { CAPABILITY_SUBJECT } from './capability.decorator.js';
import { PERMISSION_REGISTRY } from './permission-registry.js';

/**
 * `PH-1.11` — the capability interceptor. `BR-844`, `BR-1107`, `BR-1108`, `FEAT-017`, `05 §7`.
 *
 * ## Contract, stated the way `denial-reason.ts` states its own
 *
 * **This layer is incapable of being enforcement, and that is a design requirement, not a
 * property it happens to have** (`BR-714`, `BR-041`, `BR-710`). It runs AFTER the handler, on the
 * way out. It has no `canActivate`, it never throws on a capability result, it never
 * short-circuits, and it never removes a field the handler decided to return. The hard `403` on
 * every endpoint stays exactly where it is; `_can` is what stops a user ever meeting one
 * (`PRIN-01`).
 *
 * The direction matters. If this were allowed to deny, two systems would decide authorization and
 * the pair would drift — and the one that drifts silently is the one the client can see, because
 * `_can` is rendered rather than logged.
 *
 * ## What it does
 *
 * A route declares the model it returns with `@Capabilities('course')`. For every response
 * matching `11 §1.3`'s envelope, this attaches:
 *
 *  - `_can` on each resource — may this actor do X **to this record** (`BR-1107`);
 *  - `_can` at the envelope root of a collection — may this actor do X **at all**, `create` and
 *    `export` being the motivating cases (`BR-1108`).
 *
 * The action list comes from `PH-1.8`'s permission registry, never from the route, which is what
 * `BR-844` means by "`_can` is never hand-written per endpoint".
 *
 * ## `BR-703` / `BR-040` — computed per request, never cached across users
 *
 * The ability and every boolean derived from it are created inside {@link intercept} and
 * referenced by nothing that outlives the call. There is no instance state on this class at all
 * beyond the logger and the reflector.
 *
 * {@link CAPABILITY_ACTIONS_BY_MODEL} is the one module-level value, and it is a CONSTANT rather
 * than a memo: it is computed from `PERMISSION_REGISTRY` — a frozen module import — before any
 * request exists, holds action NAMES and no booleans, and cannot be reached by anything a request
 * carries. A memo fills from what it observes; this cannot observe anything. The distinction is
 * the whole of `BR-040`: what must never be reused across actors is the ANSWER, and no answer
 * lives outside a single call.
 */

/**
 * model → the capability actions that model has, derived once from the 174-key registry.
 *
 * Built eagerly at module load. A lazy cache would be a memo keyed by whatever route ran first,
 * which is the shape `BR-703` prohibits even where the contents are actor-independent — and the
 * eager version costs one pass over a constant array at boot.
 */
const CAPABILITY_ACTIONS_BY_MODEL: ReadonlyMap<string, readonly string[]> = (() => {
  const keys = PERMISSION_REGISTRY.map((permission) => permission.key);
  const table = new Map<string, readonly string[]>();

  for (const key of keys) {
    const { model } = parsePermission(key);
    if (!table.has(model)) table.set(model, capabilityActionsFor(model, keys));
  }

  return table;
})();

/**
 * The ability used when no authentication layer has put an actor on the request.
 *
 * `PermissionGuard` reads the same `request.actor` field (`permission.guard.ts:92`) and there is
 * no guard installing it yet — `PH-1.12` wires that. Until then, and for any `@PublicRoute`
 * afterwards, this is the actor. It holds nothing, so `defineAbilitiesFor` builds a rule set with
 * no rules and every capability answers `false`.
 *
 * The role must not be `super_admin` and the permission arrays must stay empty; the `id` is never
 * consulted, because an `own` condition can only be created by a permission this actor does not
 * have. Deny is the answer here, never an exception — `BR-041`: an unauthenticated request to a
 * public route gets a response with an empty-handed `_can`, not a failure.
 */
const ANONYMOUS: Actor = Object.freeze({
  id: '',
  role: 'anonymous',
  permissions: Object.freeze([]),
  revokedPermissions: Object.freeze([]),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * `Array.isArray` narrows an `unknown` to `any[]`, and every element then reads as `any` —
 * `BR-1579` has no exception for a value the standard library handed us implicitly. This predicate
 * keeps the elements `unknown` so each one has to be narrowed before it is used.
 */
const isArray = (value: unknown): value is readonly unknown[] => Array.isArray(value);

@Injectable()
export class CapabilityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CapabilityInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const model = this.reflector.getAllAndOverride<string | undefined>(CAPABILITY_SUBJECT, [
      context.getHandler(),
      context.getClass(),
    ]);

    // An undeclared route is returned WITHOUT a `map` operator in the chain, not with one that
    // returns its argument. `GET /health` must be byte-identical with this interceptor installed
    // and without it, and the way to be certain of that is for there to be no code on the path.
    if (model === undefined) return next.handle();

    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const actions = CAPABILITY_ACTIONS_BY_MODEL.get(model);

    if (actions === undefined) {
      // A model no permission key mentions. Every capability map for this route would be `{}` —
      // a response that looks well-formed and tells the client nothing, so the UI draws nothing
      // and the cause is a typo three layers away. Logged at error, and still served: this layer
      // does not get to fail a request (`BR-041`). `PH-1.12`'s startup check (`BR-1631`) is where
      // this becomes a boot failure instead of a log line.
      this.logger.error(
        `capability subject unknown route=${route} model=${model} — no permission key in the ` +
          'registry names this model, so `_can` would be empty on every response from this ' +
          'route. The @Capabilities argument is a model name from 05 §5 (the `course` in ' +
          '`course:update.own`), not a class or a route segment.',
      );
    }

    // `BR-703` / `BR-040` — built here, per request, from this request's actor. Nothing below
    // this line is reachable from outside the call.
    const actor = context.switchToHttp().getRequest<{ actor?: Actor }>().actor;
    const ability = defineAbilitiesFor(actor ?? ANONYMOUS);

    return next
      .handle()
      .pipe(map((payload) => this.decorate(payload, model, actions ?? [], ability, route)));
  }

  /**
   * `11 §1.3` — the envelope, and only the envelope.
   *
   * A payload that is not `{ data: … }` is returned untouched. `05 §7.1`'s single-resource example
   * shows `_can` beside the resource's own fields, so it goes INSIDE `data`; the collection-level
   * map goes at the root beside `data`, which is `BR-1108`'s shape and `11 §1.3`'s example.
   */
  private decorate(
    payload: unknown,
    model: string,
    actions: readonly string[],
    ability: AppAbility,
    route: string,
  ): unknown {
    if (!isRecord(payload) || !('data' in payload)) return payload;

    const data = payload['data'];
    const envelope: Record<string, unknown> = { ...payload };

    if (isArray(data)) {
      envelope['data'] = data.map((item) =>
        isRecord(item) ? this.decorateRecord(item, model, actions, ability, route) : item,
      );
      envelope['_can'] = capabilitiesForCollection(ability, model, actions);
    } else if (isRecord(data)) {
      envelope['data'] = this.decorateRecord(data, model, actions, ability, route);
    } else {
      return payload;
    }

    this.pruneReason(envelope, route);
    return envelope;
  }

  private decorateRecord(
    record: Record<string, unknown>,
    model: string,
    actions: readonly string[],
    ability: AppAbility,
    route: string,
  ): Record<string, unknown> {
    const derived = capabilitiesForRecord(ability, model, actions, record);
    const decorated: Record<string, unknown> = {
      ...record,
      _can: this.merge(derived, record['_can']),
    };

    this.pruneReason(decorated, route);
    return decorated;
  }

  /**
   * Permission-derived capabilities, narrowed by whatever the handler already knew.
   *
   * **Both halves are load-bearing and neither may win outright.** The registry can answer
   * `lesson:play`, and it cannot answer `read_notes`, `download_resources` or `ask_question` —
   * `05 §7.2`'s locked lesson carries all four, and only the first has a permission key. Replacing
   * the handler's map would delete three real capabilities; ignoring the derived map would mean
   * every endpoint hand-writes `_can`, which is exactly `BR-844`'s prohibition.
   *
   * Where both answer, **the restrictive answer wins**. `05 §7.2` is the case: the actor holds
   * `lesson:play` and the lesson is locked, so `play` is `false`. The handler sees entitlement,
   * unlock rules and device state that the permission layer cannot; the permission layer sees
   * grants the handler has no business overriding. `false && anything` respects both, and it fails
   * in the direction where the UI under-draws rather than the direction where it draws a control
   * the server will refuse.
   *
   * A non-boolean value is dropped rather than passed through: `11 §1.3` says these are booleans,
   * and a client writing `if (_can.play)` against a string gets a confident wrong answer.
   */
  private merge(derived: CapabilityMap, supplied: unknown): CapabilityMap {
    if (!isRecord(supplied)) return derived;

    const merged: Record<string, boolean> = {};

    // Sorted union — the derived half is already stable (`capabilityActionsFor`), and a `_can`
    // whose key order depends on what a handler happened to write defeats response diffing.
    for (const key of [...new Set([...Object.keys(derived), ...Object.keys(supplied)])].sort()) {
      const permitted = derived[key];
      const handler = supplied[key];

      if (typeof handler !== 'boolean') {
        if (permitted !== undefined) merged[key] = permitted;
        continue;
      }

      merged[key] = permitted === undefined ? handler : permitted && handler;
    }

    return merged;
  }

  /**
   * `_reason` is the handler's to write and this interceptor's to police (`BR-1111`, `BR-1110`).
   *
   * It is never invented here. The only cause this layer can see is a missing permission, and
   * that is precisely the cause that must carry no reason.
   *
   * ## Ruling on `BR-1111`, recorded so it can be overturned in one place
   *
   * `BR-1111` reads: "`PERMISSION_ABSENT` is never returned. The field is simply absent from
   * `_can`" (`docs/11-api-contract-part-1.md:74`), which can be read as *omit the capability key
   * entirely*. Against that, `FEAT-017` (`docs/04-feature-catalog-part-1.md:398-405`) and
   * `05 §7.1` (`docs/05-roles-and-permissions.md:580-589`) both show permission-based denials as
   * an explicit `false` — `"delete": false`, `"publish": false`.
   *
   * **The ruling (lead, `PH-1.11`): the key is PRESENT with `false`, `_reason` is OMITTED for a
   * permission denial, and the code `PERMISSION_ABSENT` is never serialized anywhere.** That
   * satisfies `BR-707` (nothing is rendered, because `false` with no reason renders nothing) and
   * both worked examples, and it keeps the key set stable across actors — a `_can` whose KEYS vary
   * by role tells a client which permissions exist, which is the oracle `BR-1633` closes on the
   * `403` path.
   *
   * A handler emitting `PERMISSION_ABSENT` is therefore a bug in that handler, and the log names
   * the route rather than the actor: nothing about this depends on who asked.
   */
  private pruneReason(target: Record<string, unknown>, route: string): void {
    if (!('_reason' in target)) return;

    const reason = target['_reason'];

    if (!isRecord(reason) || typeof reason['code'] !== 'string') {
      this.logger.warn(
        `capability _reason DROPPED route=${route} — a _reason must be an object with a string ` +
          '`code` from 05 §7.3 (BR-706, BR-1110). A client special-cases presentation on that ' +
          'code and can do nothing with a malformed one.',
      );
      delete target['_reason'];
      return;
    }

    if (!isEmittableReasonCode(reason['code'])) {
      this.logger.warn(
        `capability _reason DROPPED route=${route} code=${reason['code']} — ` +
          'BR-1111/BR-707: PERMISSION_ABSENT is never serialized, and every other code must come ' +
          "from 05 §7.3's fixed enumeration. A permission denial is `false` with no reason; the " +
          'handler emitting this is the bug, not the actor who asked.',
      );
      delete target['_reason'];
    }
  }
}

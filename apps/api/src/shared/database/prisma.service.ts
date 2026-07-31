import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client.js';
import type {
  ActorScope,
  OwnedModel,
  ScopableModel,
  ScopedWhere,
  UnscopedReason,
} from './scope.js';

/**
 * The single place in the application that holds a PrismaClient.
 *
 * `BR-1580` — Prisma is confined to repositories; it never appears in a service or a controller.
 * The driver adapter is a Prisma 7 requirement (`PH-0.6` probe, `BR-1816`), kept here so that
 * change stays invisible above this directory.
 *
 * ## `PH-1.10` — this class STOPPED extending PrismaClient, and that is the mechanism
 *
 * It used to be a `PrismaClient`, so `this.prisma.user.findMany(...)` was reachable from any
 * repository and an unscoped query was the path of least resistance. The client is now held in a
 * `#private` field — unreachable from a subclass, a cast, or feature code — and there are exactly
 * two ways to a delegate:
 *
 *  - {@link scoped}, whose owned-model delegates demand a `ScopedWhere` that only `applyScope`
 *    can produce, and which applies the ownership predicate itself;
 *  - {@link unscoped}, which takes an enumerated {@link UnscopedReason} and is pinned by a
 *    fitness case that counts its call sites.
 *
 * **A forgotten `where` therefore cannot leak: forgetting means never calling `applyScope`, and
 * then there is no value to hand the delegate.** Running unscoped is still possible — it has to
 * be, because login queries establish the actor they would otherwise be scoped by — but it is a
 * declaration a reviewer sees, not an omission nobody notices. That distinction is the whole
 * design (`BR-1632`, `BR-843`).
 */

/** The Prisma delegate methods that take a `where` and can therefore leak by omitting one. */
type ScopedMethod = 'findMany' | 'findFirst' | 'updateMany' | 'deleteMany' | 'count';

/**
 * The delegate for an owned model, with every `where`-taking method requiring a branded `where`.
 *
 * Derived from Prisma's own generated delegate rather than hand-written, so a method Prisma adds
 * cannot silently arrive unscoped — it simply is not on this type until it is listed above.
 */
type ScopedDelegate<D, M extends OwnedModel> = {
  [K in ScopedMethod & keyof D]: D[K] extends (args: infer A) => infer R
    ? A extends { where?: infer W }
      ? (args: Omit<A, 'where'> & { where: ScopedWhere<NonNullable<W>, M> }) => R
      : never
    : never;
};

/**
 * Owned models demand a proof; models classified `global` in `MODEL_SCOPES` are passed through
 * unchanged, because "this model has no ownership dimension" was already argued and recorded there.
 * Requiring a proof for them would make the brand meaningless by making it universal.
 */
export type ScopedClient = {
  [M in ScopableModel]: M extends OwnedModel ? ScopedDelegate<PrismaClient[M], M> : PrismaClient[M];
};

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly #client: PrismaClient;
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      // `BR-943` — fail fast and say which variable, never the value.
      throw new Error('DATABASE_URL is not set. The API cannot start without a database.');
    }

    this.#client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  /**
   * Owned-model access for a known actor. Every `where` must come from `applyScope`.
   *
   * The cast is confined to this one line: at runtime these ARE the Prisma delegates, and the
   * branded `where` is an ordinary object. The brand exists only in the type system, which is
   * precisely why it costs nothing at runtime and cannot be forged at compile time.
   */
  scoped(scope: ActorScope): ScopedClient {
    // Debug-level, so it is off in production and available when tracing an authorization
    // question. It also makes the parameter load-bearing: an argument the compiler requires but
    // nothing reads is one a later edit deletes.
    this.logger.debug(
      `scoped query actor=${scope.actorId} unrestricted=${String(scope.unrestricted)}`,
    );
    return this.#client;
  }

  /**
   * The enumerated escape hatch. The `reason` never changes BEHAVIOUR — both branches return the
   * same client — so it cannot be chosen to obtain different access, only to describe intent. Its
   * real jobs are to be greppable in source, countable by the fitness case that pins how many of
   * these exist, and present in a debug trace when someone asks why a query ran unscoped.
   */
  unscoped(reason: UnscopedReason): PrismaClient {
    this.logger.debug(`unscoped query reason=${reason}`);
    return this.#client;
  }

  async onModuleInit(): Promise<void> {
    await this.#client.$connect();
    this.logger.log('database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.#client.$disconnect();
  }
}

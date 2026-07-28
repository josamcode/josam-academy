/**
 * DI probe — the guard for the trap recorded in packages/config/tsconfig/node.json.
 *
 * NestJS resolves a constructor dependency by using the class itself as the injection token,
 * which only exists at runtime because emitDecoratorMetadata writes it into `design:paramtypes`.
 * Two things independently destroy that, and neither is visible to `tsc` or to `eslint`:
 *
 *   1. `verbatimModuleSyntax: true` combined with an `import type` specifier — the import is
 *      erased unconditionally, and the emitted metadata degrades to `Function`.
 *   2. A transform that does not implement emitDecoratorMetadata at all.
 *
 * Either way typecheck is green, lint is green, and the API dies on boot. Verified at PH-0.3 by
 * reproducing case 1: the emit became `__metadata("design:paramtypes", [Function])` and Nest
 * failed with "Nest can't resolve dependencies of the ConsumerService (?) ... the argument
 * Function at index [0]".
 *
 * This file is deliberately NOT a Vitest spec: it must be compiled by `tsc` and executed by node,
 * exercising the real production build path. A test run through a different transform would prove
 * nothing about the artifact we ship — see the esbuild note in STATUS.md for PH-0.3.
 *
 * Run: pnpm --filter @josam/api run probe:di   (build first)
 */
import 'reflect-metadata';

import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

@Injectable()
class DependencyService {
  readonly marker = 'dependency-resolved';
}

@Injectable()
class ConsumerService {
  // The whole point: `DependencyService` is referenced ONLY in type position here.
  constructor(private readonly dependency: DependencyService) {}

  describe(): string {
    return this.dependency.marker;
  }
}

@Module({ providers: [DependencyService, ConsumerService] })
class ProbeModule {}

async function main(): Promise<void> {
  // abortOnError: false is required, not cosmetic. Nest's default is to terminate the process
  // itself when it cannot resolve a dependency; combined with logger: false that produces a
  // silent exit 1 with no diagnostic at all — a probe that fails without saying why. With it
  // off, the resolution failure surfaces as a catchable error that names the missing token.
  const app = await NestFactory.createApplicationContext(ProbeModule, {
    logger: false,
    abortOnError: false,
  });

  try {
    const consumer = app.get(ConsumerService);
    const paramTypes: unknown = Reflect.getMetadata('design:paramtypes', ConsumerService);
    const injectedTokenName =
      Array.isArray(paramTypes) && typeof paramTypes[0] === 'function'
        ? (paramTypes[0] as { name: string }).name
        : String(paramTypes);

    console.log('design:paramtypes[0] =', injectedTokenName);
    console.log('consumer.describe()  =', consumer.describe());

    if (injectedTokenName !== 'DependencyService') {
      throw new Error(
        `DI metadata lost: expected token "DependencyService", got "${injectedTokenName}". ` +
          'emitDecoratorMetadata is not reaching the emitted JavaScript.',
      );
    }
    if (consumer.describe() !== 'dependency-resolved') {
      throw new Error('Injection did not resolve to the expected instance.');
    }

    console.log('DI PROBE PASSED — constructor injection resolves in the compiled output.');
  } finally {
    await app.close();
  }
}

// apps/api is CommonJS — correct for NestJS 11 — so there is no top-level await here.
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

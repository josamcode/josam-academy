import { Global, Module } from '@nestjs/common';

import { BreachList } from './breach-list';
import { PasswordHasher } from './password-hasher';

/**
 * `PH-1.2` — password primitives.
 *
 * `@Global` because `PH-1.4` (registration, verification, reset) and `PH-1.3` (token rotation)
 * both need the hasher, and neither should import the other's module to reach it.
 *
 * `BreachList` reads its corpus once at construction. That is deliberate: the alternative is a
 * read per registration, and the corpus is append-only reference data, not state. A restart is
 * how a new corpus is picked up, which is also how the deploy that ships one works.
 */
@Global()
@Module({
  providers: [PasswordHasher, BreachList],
  exports: [PasswordHasher, BreachList],
})
export class SecurityModule {}

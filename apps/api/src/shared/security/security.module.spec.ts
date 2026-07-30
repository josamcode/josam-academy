import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { AppModule } from '../../app.module.js';
import { BreachList } from './breach-list.js';
import { SecurityModule } from './security.module.js';

/**
 * The module graph is a mechanism, and `BR-1830` says a mechanism has to be asked.
 *
 * `PH-1.2` shipped a `BreachList` whose constructor took an optional `string`. Nest cannot
 * inject that — it looks for a `String` provider, finds none, and refuses to build the graph.
 * **The API could not boot from `PH-1.2` to `PH-1.6`**, through four green CI runs, because every
 * spec built the class with `new BreachList()` and none went through the injector. The container
 * was the one component never under test.
 *
 * Found by actually starting the process, not by reading the code. These specs make it a gate.
 */
describe('DI — the module graph resolves', () => {
  it('SecurityModule builds through the injector, not just via `new`', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [SecurityModule] }).compile();
    expect(moduleRef.get(BreachList)).toBeInstanceOf(BreachList);
    await moduleRef.close();
  });

  it('the WHOLE AppModule graph resolves — every provider every module declares', async () => {
    // The broad assertion. Any future provider Nest cannot construct fails here rather than at
    // the next deploy, which is where this one would have surfaced.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});

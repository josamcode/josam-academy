import { hash } from '@node-rs/argon2';

import { ARGON2_PARAMS } from '../shared/security/password-hasher.js';

/**
 * `SB-41` — measure Argon2id on the machine that will actually run it.
 *
 * `BR-1607` tunes the parameters to **~100 ms on the production CPU**. That number was never
 * measured on the production CPU: it was measured on a developer laptop, where it came out at
 * 161 ms. Production is **2 shared vCPU** on a box carrying five other applications, so the
 * honest prior is "slower", and `BR-1607` binds in both directions — strong against offline
 * attack AND cheap enough not to become a login bottleneck (`BR-859`).
 *
 * Run this INSIDE the deployed API container, before `PH-1.4` puts a login behind it:
 *
 * ```bash
 * sudo docker exec <API_CONTAINER> node dist/probes/argon2-bench.probe.js
 * ```
 *
 * If it lands at 300 ms or more, lower `memoryCost` first — it dominates the cost, and reducing
 * it sacrifices less offline resistance per millisecond than reducing `timeCost`. Halving memory
 * to 32 MB roughly halves the time. Do not touch `parallelism`: on 2 vCPU, 4 lanes are already
 * more than the box can run concurrently, and lowering it changes the KDF's shape rather than
 * just its cost.
 *
 * **Report BOTH numbers.** The laptop-to-server ratio is the reusable finding — it is what every
 * future performance estimate in this project gets calibrated against. The absolute figure only
 * tells you about today's parameters.
 */

const RUNS = 10;
const WARMUP = 2;

async function main(): Promise<void> {
  // The first hash pays one-off allocation of the 64 MB block. Including it would report a
  // number no real login ever experiences.
  for (let i = 0; i < WARMUP; i += 1) await hash(`warmup-${String(i)}1`, ARGON2_PARAMS);

  const samples: number[] = [];
  for (let i = 0; i < RUNS; i += 1) {
    const started = performance.now();
    await hash(`bench-${String(i)}1`, ARGON2_PARAMS);
    samples.push(performance.now() - started);
  }

  samples.sort((a, b) => a - b);
  const mean = samples.reduce((n, v) => n + v, 0) / samples.length;
  // p95 rather than max: on a shared box the slowest sample is somebody else's noise, and the
  // number that matters for a login is the one most requests are under.
  const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))] ?? 0;

  console.log('--- SB-41 · Argon2id benchmark ---');
  console.log(
    `params      m=${String(ARGON2_PARAMS.memoryCost)}KiB t=${String(ARGON2_PARAMS.timeCost)} p=${String(ARGON2_PARAMS.parallelism)}`,
  );
  console.log(`cpus        ${String((await import('node:os')).cpus().length)}`);
  console.log(`runs        ${String(RUNS)} (after ${String(WARMUP)} warmup)`);
  console.log(`mean        ${mean.toFixed(0)} ms`);
  console.log(`median      ${(samples[Math.floor(samples.length / 2)] ?? 0).toFixed(0)} ms`);
  console.log(`p95         ${p95.toFixed(0)} ms`);
  console.log(
    `min / max   ${(samples[0] ?? 0).toFixed(0)} / ${(samples.at(-1) ?? 0).toFixed(0)} ms`,
  );
  console.log('');
  console.log(`BR-1607 target ~100 ms. Laptop reference: 161 ms.`);
  console.log(
    p95 >= 300
      ? 'VERDICT: too slow — lower memoryCost before PH-1.4 builds a login on it.'
      : 'VERDICT: within an acceptable band for a login path.',
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

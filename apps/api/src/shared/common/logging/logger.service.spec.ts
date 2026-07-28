import { describe, expect, it } from 'vitest';

import {
  getCorrelationId,
  newCorrelationId,
  runWithCorrelation,
} from '../correlation/correlation.context.js';
import { AppLogger } from './logger.service.js';
import { REDACT_CENSOR } from './redact.js';

/** Collects the JSON lines Pino writes, so assertions are made on real emitted output. */
function capture(): { logger: AppLogger; lines: () => Record<string, unknown>[] } {
  const chunks: string[] = [];
  const logger = new AppLogger({
    level: 'trace',
    version: 'test',
    destination: {
      write(chunk: string) {
        chunks.push(chunk);
      },
    },
  });
  return {
    logger,
    lines: () =>
      chunks
        .join('')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Record<string, unknown>),
  };
}

describe('BR-626 — secrets are never logged', () => {
  it.each([
    ['password', { password: 'hunter2' }],
    ['token', { token: 'eyJhbGciOi' }],
    ['accessToken', { accessToken: 'abc' }],
    ['otp', { otp: '123456' }],
    ['cardNumber', { cardNumber: '4111111111111111' }],
    ['cvv', { cvv: '123' }],
    ['phone', { phone: '+201234567890' }],
  ])('redacts %s at the root', (field, payload) => {
    const { logger, lines } = capture();
    logger.event('info', 'probe', payload);

    const line = lines()[0];
    expect(line?.[field]).toBe(REDACT_CENSOR);
  });

  it('redacts a secret nested one level inside a logged object', () => {
    const { logger, lines } = capture();
    logger.event('info', 'probe', { body: { password: 'hunter2', email: 'a@b.com' } });

    const body = lines()[0]?.['body'] as Record<string, unknown>;
    expect(body['password']).toBe(REDACT_CENSOR);
    // Non-secret fields must survive, or the log is useless for debugging.
    expect(body['email']).toBe('a@b.com');
  });

  it('leaves a field that merely contains the word password alone', () => {
    const { logger, lines } = capture();
    logger.event('info', 'probe', { passwordChangedAt: '2026-07-29' });

    expect(lines()[0]?.['passwordChangedAt']).toBe('2026-07-29');
  });
});

describe('BR-627 — correlation id on every line', () => {
  it('attaches the ambient correlation id without the caller passing it', () => {
    const { logger, lines } = capture();

    runWithCorrelation({ correlationId: 'trace-xyz' }, () => {
      logger.event('info', 'inside', {});
      logger.log('also inside');
    });

    for (const line of lines()) {
      expect(line['correlationId']).toBe('trace-xyz');
    }
  });

  it('marks out-of-band lines rather than emitting none', () => {
    const { logger, lines } = capture();
    logger.event('info', 'outside any request', {});

    // A line with no id at all reads as "not traced"; a marker reads as "not part of a request".
    expect(lines()[0]?.['correlationId']).toBe('req_out-of-band');
  });

  it('generates prefixed ULIDs that sort by creation time', () => {
    const first = newCorrelationId();
    const second = newCorrelationId();

    expect(first).toMatch(/^req_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(second > first || second === first).toBe(true);
  });

  it('isolates concurrent requests from each other', async () => {
    const seen: string[] = [];
    await Promise.all([
      new Promise<void>((resolve) =>
        runWithCorrelation({ correlationId: 'a' }, () => {
          setTimeout(() => {
            seen.push(getCorrelationId());
            resolve();
          }, 10);
        }),
      ),
      new Promise<void>((resolve) =>
        runWithCorrelation({ correlationId: 'b' }, () => {
          setTimeout(() => {
            seen.push(getCorrelationId());
            resolve();
          }, 5);
        }),
      ),
    ]);

    expect(seen.sort()).toEqual(['a', 'b']);
  });
});

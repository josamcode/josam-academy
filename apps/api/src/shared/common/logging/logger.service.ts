import { Injectable, type LoggerService } from '@nestjs/common';
import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';

import { getCorrelationStore } from '../correlation/correlation.context.js';
import { REDACT_CENSOR, REDACT_PATHS } from './redact.js';

export interface AppLoggerOptions {
  level: string;
  /** Pretty-free JSON always; `FEAT-217` specifies JSON logs. */
  version: string;
  /**
   * Test seam. Production passes nothing and Pino writes to stdout. Without this there is no way
   * to assert that BR-626 redaction actually fires, and an unasserted redaction rule is a rule
   * that quietly stops working the day someone edits the paths.
   */
  destination?: DestinationStream;
}

/**
 * The application logger. Implements NestJS's LoggerService so that Nest's own framework output
 * (route mapping, shutdown, unhandled errors) goes through the same JSON pipeline rather than
 * printing a second, unstructured format alongside it.
 *
 * Pino is confined to this file. Nothing else in the codebase imports it, so replacing it means
 * editing one class (`13 §1` filter 5).
 *
 * `FEAT-217`: JSON logs · levels debug/info/warn/error · production defaults to info ·
 * fields include user ID, route, duration and status.
 */
@Injectable()
export class AppLogger implements LoggerService {
  private readonly root: Logger;

  constructor(options: AppLoggerOptions) {
    const config: LoggerOptions = {
      level: options.level,
      base: { version: options.version },

      // BR-626 — enforced in the logger, not at the call sites.
      redact: { paths: [...REDACT_PATHS], censor: REDACT_CENSOR },

      formatters: {
        // Emit `"level":"info"` rather than `"level":30`. A log line a human has to decode
        // during an incident is a log line that gets ignored.
        level: (label) => ({ level: label }),
      },

      timestamp: pino.stdTimeFunctions.isoTime,
    };

    this.root = options.destination ? pino(config, options.destination) : pino(config);
  }

  /**
   * BR-627 — the correlation ID is attached here, so it cannot be forgotten by a caller.
   * Every line this logger emits carries it, including lines from framework code that knows
   * nothing about correlation.
   */
  private bindings(): Record<string, unknown> {
    const store = getCorrelationStore();
    return store
      ? { correlationId: store.correlationId, ...(store.userId ? { userId: store.userId } : {}) }
      : { correlationId: 'req_out-of-band' };
  }

  log(message: unknown, context?: unknown): void {
    this.root.info({ ...this.bindings(), context }, String(message));
  }

  error(message: unknown, stack?: unknown, context?: unknown): void {
    this.root.error({ ...this.bindings(), context, stack }, String(message));
  }

  warn(message: unknown, context?: unknown): void {
    this.root.warn({ ...this.bindings(), context }, String(message));
  }

  debug(message: unknown, context?: unknown): void {
    this.root.debug({ ...this.bindings(), context }, String(message));
  }

  verbose(message: unknown, context?: unknown): void {
    this.root.trace({ ...this.bindings(), context }, String(message));
  }

  /** Structured event with arbitrary fields — the form used by the request interceptor. */
  event(level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown>): void {
    this.root[level]({ ...this.bindings(), ...fields }, message);
  }
}

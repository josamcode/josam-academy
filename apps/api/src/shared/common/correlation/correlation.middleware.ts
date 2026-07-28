import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { AppLogger } from '../logging/logger.service.js';
import { newCorrelationId, runWithCorrelation } from './correlation.context.js';

/** `11 §1.2` lists `X-Correlation-Id` as an optional inbound request header. */
export const CORRELATION_HEADER = 'x-correlation-id';

/** Bounded so a caller cannot use the header as a log-injection or disk-fill vector (BR-628). */
const MAX_INBOUND_LENGTH = 64;
const SAFE_INBOUND = /^[A-Za-z0-9_-]+$/;

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const inbound = req.headers[CORRELATION_HEADER];
    const candidate = Array.isArray(inbound) ? inbound[0] : inbound;

    // An inbound ID is honoured so a trace spans web → api, but it is never trusted verbatim:
    // it lands in every log line for this request, so an unvalidated value would let a caller
    // write newlines and forged fields into the log stream.
    const correlationId =
      typeof candidate === 'string' &&
      candidate.length > 0 &&
      candidate.length <= MAX_INBOUND_LENGTH &&
      SAFE_INBOUND.test(candidate)
        ? candidate
        : newCorrelationId();

    // Echoed so the client — and the founder reading a bug report — can quote the ID that
    // matches the server logs (BR-630).
    res.setHeader('X-Correlation-Id', correlationId);

    const startedAt = process.hrtime.bigint();
    const method = req.method;
    const route = req.originalUrl;

    runWithCorrelation({ correlationId }, () => {
      /**
       * One structured line per request, emitted on `finish` (`FEAT-217`: route, duration,
       * status; user ID and correlation ID are attached by AppLogger itself).
       *
       * This lives in the middleware rather than in a Nest interceptor for two reasons, both
       * found by reading real output at PH-0.19:
       *
       *   1. An unmatched route never reaches any interceptor — Nest throws NotFoundException
       *      before the chain runs — so every 404 went unlogged. A 404 flood is a scan, and it
       *      is exactly the thing you want a line for.
       *   2. An interceptor's error path runs *before* the exception filter sets the status, so
       *      it reads Express's default and logs a 500 as a 200. `finish` reads the status that
       *      was actually sent.
       *
       * BR-628 — one line per request, never the request or response body. Bodies are unbounded
       * and are the likeliest place for what BR-626 forbids.
       */
      res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const status = res.statusCode;
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

        this.logger.event(level, 'request', {
          method,
          route,
          status,
          durationMs: Math.round(durationMs * 100) / 100,
        });
      });

      next();
    });
  }
}

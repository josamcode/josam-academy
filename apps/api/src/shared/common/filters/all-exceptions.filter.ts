import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { getCorrelationStore } from '../correlation/correlation.context.js';
import { AppLogger } from '../logging/logger.service.js';
import {
  ERROR_TRACKER,
  type ErrorTracker,
} from '../../providers/error-tracker/error-tracker.interface.js';

/**
 * The global filter from `09`'s pipeline: "catches unmapped errors → 500 + generic message +
 * Sentry".
 *
 * Envelope shape is `11 §1.5`. `BR-1115` — every error carries a `correlation_id` matching the
 * log entry. `BR-631`/`BR-1114`/`BR-940` — internal details never reach the client.
 *
 * Not implemented here: `BR-1113`, bilingual message objects localised server-side from the
 * string catalog. `packages/i18n` is PH-0.13 and `shared/i18n` is Phase 1, so `message` is a
 * single string today. Emitting a hand-written `{ar, en}` pair would be inventing translations
 * outside the catalog, which is the thing BR-525 exists to prevent.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLogger,
    @Inject(ERROR_TRACKER) private readonly tracker: ErrorTracker,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const store = getCorrelationStore();
    const correlationId = store?.correlationId ?? 'req_out-of-band';

    const isHttp = exception instanceof HttpException;
    const status: number = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // A 4xx is the client being told something it already knows. A 5xx is ours, and only a 5xx
    // is worth an alert (BR-629 — one recurring error must not generate hundreds of alerts;
    // reporting every 404 would do exactly that).
    const isServerError = status >= SERVER_ERROR_THRESHOLD;

    if (isServerError) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unhandled exception',
        exception instanceof Error ? exception.stack : undefined,
        'AllExceptionsFilter',
      );

      this.tracker.capture(exception, {
        correlationId,
        route: req.originalUrl,
        ...(store?.userId ? { userId: store.userId } : {}),
        fingerprint: ['{{ default }}', req.method, routePattern(req)],
      });
    }

    res.status(status).json({
      error: {
        code: codeFor(status),
        // BR-631 — a 5xx never describes what actually broke. A 4xx may use the framework's
        // message, which is our own text, never an internal detail.
        message: isServerError ? 'Something went wrong on our side.' : messageFor(exception),
        correlation_id: correlationId,
      },
    });
  }
}

function codeFor(status: number): string {
  const known: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_FAILED',
    429: 'RATE_LIMITED',
  };
  return known[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED');
}

function messageFor(exception: unknown): string {
  if (!(exception instanceof HttpException)) return 'Request failed.';

  const response = exception.getResponse();
  if (typeof response === 'string') return response;

  if (typeof response === 'object' && response !== null && 'message' in response) {
    const { message } = response;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.map(String).join('; ');
  }

  return exception.message;
}

const SERVER_ERROR_THRESHOLD = 500;

/**
 * The route *pattern* (`/courses/:id`), not the concrete URL (`/courses/abc123`).
 *
 * BR-629 requires errors to group by fingerprint. Fingerprinting on the concrete URL would put
 * every affected learner into a separate Sentry issue, which is the alert storm the rule exists
 * to prevent. `req.route` is typed `any` by @types/express, so it is narrowed rather than
 * accessed directly.
 */
function routePattern(req: Request): string {
  const route: unknown = req.route;
  if (typeof route === 'object' && route !== null) {
    const { path } = route as { path?: unknown };
    if (typeof path === 'string') return path;
  }
  return req.originalUrl;
}

import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Logger } from '@cvg-his-v2/shared-logging';

import {
  httpErrorsTotal,
  httpOperationalOutcomesTotal,
  httpRequestDurationSeconds,
  httpRequestsTotal,
  normalizeRoute,
  recordRequestSloObservation
} from './metrics.js';
import { endSpan, type Span } from './tracing.js';

export function attachHttpRequestTelemetry(options: {
  readonly request: IncomingMessage;
  readonly response: ServerResponse;
  readonly startTime: bigint;
  readonly correlationId: string;
  readonly requestRoles: Readonly<Pick<WeakMap<IncomingMessage, readonly string[]>, 'get'>>;
  readonly span: Span;
  readonly logger: Logger;
}): void {
  let finalized = false;
  const finalize = () => {
    if (finalized) return;
    finalized = true;

    const durationSec = Number(process.hrtime.bigint() - options.startTime) / 1e9;
    const url = new URL(options.request.url ?? '/', 'http://localhost');
    const route = normalizeRoute(url.pathname);
    const method = options.request.method ?? 'UNKNOWN';
    const statusCode = options.response.statusCode;

    httpRequestsTotal.inc({ method, route, status_code: String(statusCode) });
    httpRequestDurationSeconds.observe(
      { method, route, status_code: String(statusCode) },
      durationSec
    );
    recordRequestSloObservation({ durationMs: durationSec * 1000, statusCode });

    if (statusCode >= 400) {
      httpErrorsTotal.inc({ status_category: statusCode >= 500 ? '5xx' : '4xx' });
    }

    const role = options.requestRoles.get(options.request)?.slice().sort().join('+') || 'anonymous';
    const isDownload =
      route === '/reports/executions/:id/export' || route === '/attachments/:id/download';
    const operation = statusCode === 403 ? 'forbidden' : isDownload ? 'download' : 'route_error';
    if (statusCode >= 400 || isDownload) {
      const result = statusCode >= 400 ? 'error' : 'success';
      httpOperationalOutcomesTotal.inc({ route, role, operation, result });
      options.logger.info('http operational outcome', {
        correlationId: options.correlationId,
        method,
        route,
        role,
        operation,
        result,
        statusCode,
        durationMs: Math.round(durationSec * 1000)
      });
    }

    options.span.attributes['http.method'] = method;
    options.span.attributes['http.route'] = route;
    options.span.attributes['http.target'] = options.request.url ?? '/';
    options.span.attributes['http.status_code'] = statusCode;
    options.span.attributes['http.duration_ms'] = Math.round(durationSec * 1000);
    options.span.attributes['request.correlation_id'] = options.correlationId;
    endSpan(options.span, statusCode >= 400 ? 'error' : 'ok');
  };

  options.response.once('finish', finalize);
  options.response.once('close', finalize);
}

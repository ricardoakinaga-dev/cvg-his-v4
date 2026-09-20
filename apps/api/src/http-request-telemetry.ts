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
import { endSpan, sanitizeHttpTarget, type Span } from './tracing.js';

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

    const role = normalizeMetricRole(options.requestRoles.get(options.request));
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
    options.span.attributes['http.target'] = sanitizeHttpTarget(options.request.url);
    options.span.attributes['http.status_code'] = statusCode;
    options.span.attributes['http.duration_ms'] = Math.round(durationSec * 1000);
    options.span.attributes['request.correlation_id'] = options.correlationId;
    endSpan(options.span, statusCode >= 400 ? 'error' : 'ok');
  };

  options.response.once('finish', finalize);
  options.response.once('close', finalize);
}

// Role codes are operator-controlled but still untrusted input at the metrics
// boundary. Preserve a small known vocabulary and collapse custom/oversized
// combinations so an authorization change cannot create an unbounded label
// set or leak identifiers.
const KNOWN_METRIC_ROLES = new Set([
  'admin',
  'finance',
  'doctor',
  'nurse',
  'reception',
  'inventory',
  'laboratory',
  'audit',
  'ops',
  'api-key'
]);

function normalizeMetricRole(roles: readonly string[] | undefined): string {
  if (!roles || roles.length === 0) return 'anonymous';
  const normalized = [...new Set(roles.map((role) => role.trim().toLowerCase()))].filter(Boolean);
  if (normalized.some((role) => !KNOWN_METRIC_ROLES.has(role))) return 'other';
  if (normalized.length > 3) return 'multi';
  return normalized.sort().join('+') || 'anonymous';
}

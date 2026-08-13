import type { IncomingMessage, ServerResponse } from 'node:http';

import { createCorrelationId } from '@cvg-his-v2/shared-utils';

import { applyCorsPolicy } from '../http/cors.js';
import { applySecurityHeaders } from '../http/security-headers.js';
import {
  httpErrorsTotal,
  httpRequestDurationSeconds,
  httpRequestsTotal,
  normalizeRoute,
  recordRequestSloObservation
} from '../metrics.js';
import {
  createSpan,
  endSpan,
  extractTraceContext,
  formatTraceParent,
  type Span
} from '../tracing.js';

export interface RequestObservabilityOptions {
  environment: string;
  corsAllowedOrigins: readonly string[];
}

export function initializeRequestObservability(
  request: IncomingMessage,
  response: ServerResponse,
  options: RequestObservabilityOptions
) {
  const span = createSpan(
    `HTTP ${request.method ?? 'UNKNOWN'} ${request.url ?? '/'}`,
    extractTraceContext(request) ?? null
  );
  (request as IncomingMessage & { span?: Span }).span = span;
  const startedAt = process.hrtime.bigint();
  const correlationIdHeader = request.headers['x-correlation-id'];
  const correlationId =
    typeof correlationIdHeader === 'string'
      ? correlationIdHeader
      : createCorrelationId('api');

  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('x-correlation-id', correlationId);
  response.setHeader('x-request-id', correlationId);
  response.setHeader('x-trace-id', span.context.traceId);
  applySecurityHeaders(request, response, options.environment);
  const corsDecision = applyCorsPolicy(request, response, options.corsAllowedOrigins);
  response.setHeader('tracestate', 'cvg-api');
  response.setHeader(
    'traceparent',
    formatTraceParent(span.context.traceId, span.context.spanId, span.context.traceFlags)
  );

  response.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
    const route = normalizeRoute(new URL(request.url ?? '/', 'http://localhost').pathname);
    const method = request.method ?? 'UNKNOWN';
    const statusCode = response.statusCode;
    httpRequestsTotal.inc({ method, route, status_code: String(statusCode) });
    httpRequestDurationSeconds.observe(
      { method, route, status_code: String(statusCode) },
      durationSeconds
    );
    recordRequestSloObservation({ durationMs: durationSeconds * 1000, statusCode });
    if (statusCode >= 400) {
      httpErrorsTotal.inc({ status_category: statusCode >= 500 ? '5xx' : '4xx' });
    }
    Object.assign(span.attributes, {
      'http.method': method,
      'http.route': route,
      'http.target': request.url ?? '/',
      'http.status_code': statusCode,
      'http.duration_ms': Math.round(durationSeconds * 1000),
      'request.correlation_id': correlationId
    });
    endSpan(span, statusCode >= 400 ? 'error' : 'ok');
  });

  return { span, correlationId, corsDecision };
}

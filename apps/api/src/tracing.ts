/**
 * Distributed Tracing Middleware
 *
 * Implements W3C Trace Context propagation (traceparent header) for
 * cross-service distributed tracing. Creates spans for each HTTP request
 * and attaches correlation context to outbound service calls.
 *
 * Spec: https://www.w3.org/TR/trace-context/
 */

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

export interface Span {
  context: TraceContext;
  startTime: bigint;
  endTime?: bigint;
  name: string;
  status: 'ok' | 'error';
  errorMessage?: string;
  attributes: Record<string, string | number>;
}

/** Format: version-traceId-spanId-traceFlags (all hex, 2+16+16+2 = 36 chars + 3 dashes) */
export function formatTraceParent(traceId: string, spanId: string, flags: number): string {
  return `00-${traceId.slice(0, 32)}-${spanId.slice(0, 16)}-${flags.toString(16).padStart(2, '0')}`;
}

function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function extractTraceContext(request: IncomingMessage): TraceContext | null {
  const traceparent = request.headers['traceparent'];
  if (typeof traceparent !== 'string') return null;

  // Parse traceparent: 00-{traceId}-{spanId}-{traceFlags}
  const match = /^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/.exec(traceparent.trim());
  if (!match) return null;

  return {
    traceId: match[1],
    spanId: match[2],
    traceFlags: parseInt(match[3], 16)
  };
}

export function injectTraceContext(headers: Record<string, string>, ctx: TraceContext): void {
  headers['traceparent'] = formatTraceParent(ctx.traceId, ctx.spanId, ctx.traceFlags);
  headers['tracestate'] = 'cvg-api';
}

export function createSpan(name: string, parent?: TraceContext | null): Span {
  const traceId = parent?.traceId ?? generateTraceId();
  const spanId = generateSpanId();

  return {
    context: {
      traceId,
      spanId,
      traceFlags: 0
    },
    startTime: process.hrtime.bigint(),
    name,
    status: 'ok',
    attributes: {}
  };
}

export function endSpan(span: Span, status: 'ok' | 'error', errorMessage?: string): void {
  span.endTime = process.hrtime.bigint();
  span.status = status;
  if (errorMessage) span.errorMessage = errorMessage;
}

export function getSpanDurationMs(span: Span): number {
  if (!span.endTime) return 0;
  return Number(span.endTime - span.startTime) / 1_000_000;
}

export function spanToObject(span: Span): Record<string, unknown> {
  return {
    traceId: span.context.traceId,
    spanId: span.context.spanId,
    name: span.name,
    status: span.status,
    durationMs: getSpanDurationMs(span),
    error: span.errorMessage,
    attributes: span.attributes
  };
}

import type { IncomingMessage } from 'node:http';
import type { ServerResponse } from 'node:http';

/** HTTP middleware: attaches trace context to each request */
export function tracingMiddleware(
  request: IncomingMessage,
  _response: ServerResponse,
  next: () => void
): void {
  const parent = extractTraceContext(request);
  const span = createSpan(`HTTP ${request.method} ${request.url ?? '/'}`, parent ?? null);

  (request as IncomingMessage & { span?: Span }).span = span;

  next();
}

export interface TracingConfig {
  serviceName: string;
  exportSpans?: (span: Span) => void;
}

const registeredSpans: Span[] = [];
const tracingConfig = {
  serviceName: 'cvg-api',
  exportSpans: undefined as ((span: Span) => void) | undefined
};

export function configureTracing(config: TracingConfig): void {
  tracingConfig.serviceName = config.serviceName;
  tracingConfig.exportSpans = config.exportSpans;
}

/**
 * Wrap an async function with a traced span.
 * The span is automatically ended on completion or error.
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  parent?: TraceContext | null
): Promise<T> {
  const span = createSpan(name, parent ?? null);

  try {
    const result = await fn();
    endSpan(span, 'ok');
    return result;
  } catch (err) {
    endSpan(span, 'error', err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    registeredSpans.push(span);
    if (tracingConfig.exportSpans) {
      tracingConfig.exportSpans(span);
    }
  }
}

export function getRecentSpans(count = 100): Span[] {
  return registeredSpans.slice(-count);
}

export function clearSpans(): void {
  registeredSpans.length = 0;
}

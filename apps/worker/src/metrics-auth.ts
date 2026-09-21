import { timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function constantTimeTokenEqual(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');
  if (candidateBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(candidateBytes, expectedBytes);
}

/** Metrics are an operator/collector surface, never an anonymous health API. */
export function isWorkerMetricsRequestAuthorized(
  headers: IncomingHttpHeaders,
  configuredToken: string | undefined
): boolean {
  const expected = configuredToken?.trim();
  if (!expected) return false;

  const authorization = headerValue(headers.authorization);
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const explicit = headerValue(headers['x-metrics-token'])?.trim();
  return [bearer, explicit].some((candidate) =>
    candidate ? constantTimeTokenEqual(candidate, expected) : false
  );
}

export function assertWorkerMetricsAuthConfigured(
  environment: string,
  configuredToken: string | undefined
): void {
  const productionLike = ['production', 'staging', 'prod', 'stage'].includes(
    environment.trim().toLowerCase()
  );
  if (productionLike && !configuredToken?.trim()) {
    throw new Error(
      'Production-like worker requires METRICS_AUTH_TOKEN; refusing to expose an unauthenticated collector surface'
    );
  }
}

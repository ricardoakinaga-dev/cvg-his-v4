import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import type {
  FeatureFlagMetricsCollector,
  FeatureFlagEvaluationMetrics,
  FeatureFlagErrorMetrics,
  FeatureFlagFallbackMetrics
} from '@cvg-his-v2/shared-feature-flags';

// ============================================================================
// Prometheus Registry
// ============================================================================

const registry = new Registry();
const REQUEST_SLO_OBSERVATION_LIMIT = 20_000;
const REQUEST_SLO_OBSERVATION_RETENTION_MS = 60 * 60 * 1000;

interface RequestSloObservation {
  readonly timestamp: number;
  readonly durationMs: number;
  readonly statusCode: number;
}

const requestSloObservations: RequestSloObservation[] = [];

// Collect default Node.js metrics (event loop, GC, handles, etc.)
collectDefaultMetrics({ register: registry });

// ============================================================================
// HTTP Metrics
// ============================================================================

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry]
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry]
});

export const httpErrorsTotal = new Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors by status code category',
  labelNames: ['status_category'] as const,
  registers: [registry]
});

// ============================================================================
// Application Metrics
// ============================================================================

export const appUptimeSeconds = new Gauge({
  name: 'app_uptime_seconds',
  help: 'Application uptime in seconds',
  registers: [registry]
});

export const appActiveRequests = new Gauge({
  name: 'app_active_requests',
  help: 'Number of requests currently being processed',
  registers: [registry]
});

export const appDbHealthy = new Gauge({
  name: 'app_database_healthy',
  help: 'Database health status (1 = healthy, 0 = unhealthy)',
  registers: [registry]
});

export const appRedisHealthy = new Gauge({
  name: 'app_redis_healthy',
  help: 'Redis health status for distributed runtime state (1 = healthy, 0 = unhealthy or not configured)',
  registers: [registry]
});

export const appPersistenceMode = new Gauge({
  name: 'app_persistence_mode',
  help: 'Persistence mode (1 = database, 0 = in-memory)',
  labelNames: ['mode'] as const,
  registers: [registry]
});

export const appRateLimiterMode = new Gauge({
  name: 'app_rate_limiter_mode',
  help: 'Auth rate limiter mode (1 = active mode)',
  labelNames: ['mode'] as const,
  registers: [registry]
});

export const appRuntimeDistributedStateEnabled = new Gauge({
  name: 'app_runtime_distributed_state_enabled',
  help: 'Whether distributed runtime state is enabled for this API runtime (1 = enabled, 0 = disabled)',
  registers: [registry]
});

export const appSloStatus = new Gauge({
  name: 'app_slo_status',
  help: 'Current SLO status (0 = healthy, 1 = alert/degraded, 2 = critical)',
  labelNames: ['slo_id', 'category'] as const,
  registers: [registry]
});

export const appSloErrorBudgetPercent = new Gauge({
  name: 'app_slo_error_budget_percent',
  help: 'Remaining error budget percentage for each SLO',
  labelNames: ['slo_id', 'category'] as const,
  registers: [registry]
});

export const appSloBurnRate = new Gauge({
  name: 'app_slo_burn_rate',
  help: 'Current SLO burn rate by SLO objective',
  labelNames: ['slo_id', 'category'] as const,
  registers: [registry]
});

export const smartSchedulingRecommendationsTotal = new Counter({
  name: 'smart_scheduling_recommendations_total',
  help: 'Total number of smart scheduling recommendations generated',
  labelNames: ['visit_type', 'confidence_band'] as const,
  registers: [registry]
});

export const smartSchedulingRecommendationAppliesTotal = new Counter({
  name: 'smart_scheduling_recommendation_applies_total',
  help: 'Total number of smart scheduling recommendations applied on appointment creation',
  labelNames: ['visit_type'] as const,
  registers: [registry]
});

// ============================================================================
// Feature Flag Metrics (PR-FF-13)
// ============================================================================

export const featureFlagEvaluationsTotal = new Counter({
  name: 'feature_flag_evaluations_total',
  help: 'Total number of feature flag evaluations',
  labelNames: ['flag_key', 'provider', 'reason', 'enabled'] as const,
  registers: [registry]
});

export const featureFlagErrorsTotal = new Counter({
  name: 'feature_flag_errors_total',
  help: 'Total number of feature flag errors',
  labelNames: ['flag_key', 'provider', 'error_type'] as const,
  registers: [registry]
});

export const featureFlagFallbacksTotal = new Counter({
  name: 'feature_flag_fallbacks_total',
  help: 'Total number of feature flag fallback evaluations',
  labelNames: ['flag_key', 'provider', 'fallback_reason'] as const,
  registers: [registry]
});

export const featureFlagEvaluationDuration = new Histogram({
  name: 'feature_flag_evaluation_duration_ms',
  help: 'Feature flag evaluation duration in milliseconds',
  labelNames: ['flag_key', 'provider'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50, 100],
  registers: [registry]
});

/**
 * Creates a Prometheus-backed FeatureFlagMetricsCollector.
 * This collector records evaluations, errors, and fallbacks to Prometheus counters/histograms.
 */
export function createFeatureFlagMetricsCollector(): FeatureFlagMetricsCollector {
  return {
    recordEvaluation(metrics: FeatureFlagEvaluationMetrics): void {
      featureFlagEvaluationsTotal.inc({
        flag_key: metrics.flagKey,
        provider: metrics.provider,
        reason: metrics.reason,
        enabled: String(metrics.enabled)
      });
      if (metrics.durationMs !== undefined) {
        featureFlagEvaluationDuration.observe(
          { flag_key: metrics.flagKey, provider: metrics.provider },
          metrics.durationMs
        );
      }
    },

    recordError(metrics: FeatureFlagErrorMetrics): void {
      featureFlagErrorsTotal.inc({
        flag_key: metrics.flagKey,
        provider: metrics.provider,
        error_type: metrics.errorType
      });
    },

    recordFallback(metrics: FeatureFlagFallbackMetrics): void {
      featureFlagFallbacksTotal.inc({
        flag_key: metrics.flagKey,
        provider: metrics.provider,
        fallback_reason: metrics.fallbackReason
      });
    }
  };
}

// ============================================================================
// Metrics Registry Access
// ============================================================================

export function getMetricsRegistry(): Registry {
  return registry;
}

export async function getMetricsText(): Promise<string> {
  return registry.metrics();
}

function pruneSloObservations(now = Date.now()): void {
  const cutoff = now - REQUEST_SLO_OBSERVATION_RETENTION_MS;
  while (requestSloObservations.length > 0) {
    const oldest = requestSloObservations[0];
    if (!oldest || oldest.timestamp >= cutoff) {
      break;
    }
    requestSloObservations.shift();
  }

  if (requestSloObservations.length > REQUEST_SLO_OBSERVATION_LIMIT) {
    requestSloObservations.splice(0, requestSloObservations.length - REQUEST_SLO_OBSERVATION_LIMIT);
  }
}

export function recordRequestSloObservation(input: {
  readonly durationMs: number;
  readonly statusCode: number;
  readonly timestamp?: number;
}): void {
  const timestamp = input.timestamp ?? Date.now();
  requestSloObservations.push({
    timestamp,
    durationMs: Math.max(0, input.durationMs),
    statusCode: input.statusCode
  });
  pruneSloObservations(timestamp);
}

export function resetRequestSloObservations(): void {
  requestSloObservations.length = 0;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}

export interface CurrentSloSnapshot {
  readonly generatedAt: string;
  readonly latencyWindowMinutes: number;
  readonly availabilityWindowMinutes: number;
  readonly requestCount5m: number;
  readonly requestCount1h: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly availabilityPercent: number;
  readonly errorRatePercent: number;
}

export function getCurrentSloSnapshot(now = Date.now()): CurrentSloSnapshot {
  pruneSloObservations(now);
  const last5mCutoff = now - 5 * 60 * 1000;
  const last1hCutoff = now - 60 * 60 * 1000;
  const last5m = requestSloObservations.filter((sample) => sample.timestamp >= last5mCutoff);
  const last1h = requestSloObservations.filter((sample) => sample.timestamp >= last1hCutoff);

  const durations = last5m.map((sample) => sample.durationMs);
  const last1hFailures = last1h.filter((sample) => sample.statusCode >= 500).length;
  const last5mFailures = last5m.filter((sample) => sample.statusCode >= 500).length;
  const availabilityPercent =
    last1h.length === 0 ? 100 : ((last1h.length - last1hFailures) / last1h.length) * 100;
  const errorRatePercent = last5m.length === 0 ? 0 : (last5mFailures / last5m.length) * 100;

  return {
    generatedAt: new Date(now).toISOString(),
    latencyWindowMinutes: 5,
    availabilityWindowMinutes: 60,
    requestCount5m: last5m.length,
    requestCount1h: last1h.length,
    p95LatencyMs: Number(percentile(durations, 95).toFixed(2)),
    p99LatencyMs: Number(percentile(durations, 99).toFixed(2)),
    availabilityPercent: Number(availabilityPercent.toFixed(4)),
    errorRatePercent: Number(errorRatePercent.toFixed(4))
  };
}

// ============================================================================
// Update Functions (called periodically or on state changes)
// ============================================================================

/**
 * Mirrors the in-flight request gauge so decrements can be floored at zero.
 *
 * An unbalanced decrement (a request that fails before the increment runs, or
 * an error path that decrements twice) would otherwise drive the gauge
 * permanently negative and make in-flight/capacity dashboards unreadable.
 */
let activeRequestsCount = 0;

export function updateAppMetrics(options: {
  uptime: number;
  /**
   * Optional override for the in-flight request gauge.
   *
   * Normally omitted: the gauge is owned by `incrementActiveRequests` /
   * `decrementActiveRequests`. Passing a value here overwrites live tracking,
   * so only supply it when the caller is the authoritative source.
   */
  activeRequests?: number;
  dbHealthy: boolean;
  persistenceMode: string;
  redisHealthy: boolean;
  rateLimiterMode: string;
  runtimeDistributedStateEnabled: boolean;
}): void {
  appUptimeSeconds.set(options.uptime);
  if (typeof options.activeRequests === 'number') {
    activeRequestsCount = Math.max(0, options.activeRequests);
    appActiveRequests.set(activeRequestsCount);
  }
  appDbHealthy.set(options.dbHealthy ? 1 : 0);
  appRedisHealthy.set(options.redisHealthy ? 1 : 0);
  appRuntimeDistributedStateEnabled.set(options.runtimeDistributedStateEnabled ? 1 : 0);

  // Reset previous persistence mode labels
  appPersistenceMode.reset();
  if (options.persistenceMode === 'database') {
    appPersistenceMode.set({ mode: 'database' }, 1);
  } else {
    appPersistenceMode.set({ mode: 'in-memory' }, 1);
  }

  appRateLimiterMode.reset();
  appRateLimiterMode.set({ mode: options.rateLimiterMode }, 1);
}

export function updateSloMetrics(
  slos: readonly {
    readonly id: string;
    readonly category: string;
    readonly status: 'healthy' | 'alert' | 'critical';
    readonly errorBudgetPercent: number;
    readonly burnRate: number;
  }[]
): void {
  appSloStatus.reset();
  appSloErrorBudgetPercent.reset();
  appSloBurnRate.reset();

  for (const slo of slos) {
    const labels = { slo_id: slo.id, category: slo.category };
    const statusValue = slo.status === 'critical' ? 2 : slo.status === 'alert' ? 1 : 0;
    appSloStatus.set(labels, statusValue);
    appSloErrorBudgetPercent.set(labels, slo.errorBudgetPercent);
    appSloBurnRate.set(labels, slo.burnRate);
  }
}

export function incrementActiveRequests(): void {
  activeRequestsCount += 1;
  appActiveRequests.set(activeRequestsCount);
}

export function decrementActiveRequests(): void {
  activeRequestsCount = Math.max(0, activeRequestsCount - 1);
  appActiveRequests.set(activeRequestsCount);
}

export function resetActiveRequestsCount(): void {
  activeRequestsCount = 0;
  appActiveRequests.set(0);
}

export function recordSmartSchedulingRecommendation(input: {
  readonly visitType: string;
  readonly confidence: number;
}): void {
  const confidenceBand =
    input.confidence >= 0.85 ? 'high' : input.confidence >= 0.7 ? 'medium' : 'low';
  smartSchedulingRecommendationsTotal.inc({
    visit_type: input.visitType,
    confidence_band: confidenceBand
  });
}

export function recordSmartSchedulingRecommendationApplied(input: {
  readonly visitType: string;
}): void {
  smartSchedulingRecommendationAppliesTotal.inc({
    visit_type: input.visitType
  });
}

// ============================================================================
// Route Normalization
// Prevents high cardinality from dynamic route segments
// ============================================================================

export function normalizeRoute(pathname: string): string {
  // Map known route patterns to avoid cardinality explosion
  const routePatterns: [RegExp, string][] = [
    [/^\/auth\/login\/mfa$/, '/auth/login/mfa'],
    [/^\/auth\/login$/, '/auth/login'],
    [/^\/auth\/refresh$/, '/auth/refresh'],
    [/^\/auth\/logout$/, '/auth/logout'],
    [/^\/auth\/mfa\/setup$/, '/auth/mfa/setup'],
    [/^\/auth\/mfa\/confirm$/, '/auth/mfa/confirm'],
    [/^\/auth\/mfa\/status$/, '/auth/mfa/status'],
    [/^\/auth\/mfa\/disable$/, '/auth/mfa/disable'],
    [/^\/auth\/mfa\/recovery-codes$/, '/auth/mfa/recovery-codes'],
    [/^\/auth\/me$/, '/auth/me'],
    [/^\/auth\/sessions$/, '/auth/sessions'],
    [/^\/lgpd\/consent$/, '/lgpd/consent'],
    [/^\/lgpd\/consent\/revoke$/, '/lgpd/consent/revoke'],
    [/^\/lgpd\/consent\/status$/, '/lgpd/consent/status'],
    [/^\/lgpd\/requests$/, '/lgpd/requests'],
    [/^\/lgpd\/requests\/complete$/, '/lgpd/requests/complete'],
    [/^\/lgpd\/requests\/reject$/, '/lgpd/requests/reject'],
    [/^\/lgpd\/export$/, '/lgpd/export'],
    [/^\/health(\/.*)?$/, '/health'],
    [/^\/ready(\/.*)?$/, '/ready'],
    [/^\/live(\/.*)?$/, '/live'],
    [/^\/metrics$/, '/metrics'],
    [/^\/slos$/, '/slos'],
    [/^\/admin\/commercial-dashboard$/, '/admin/commercial-dashboard'],
    // Generic resource patterns: /resource/:id, /resource/:id/sub-resource
    [
      /^\/(owners|patients|encounters|clinical-handoffs|appointments|users|staff|products|services|stock-items|wards|beds|inpatient-stays|exam-orders|medication-orders|clinical-notes|alerts|documents|protocols|shift-handovers|notifications|billing|cash-registers|counter-sales|quotes|triage|scheduling|surgery|diagnostics|laboratory|discharges|prescriptions|inventory|attachments|mfa|audit|health)\/[^/]+(\/[^/]+)?$/,
      '/{resource}/:id'
    ]
  ];

  for (const [pattern, replacement] of routePatterns) {
    if (pattern.test(pathname)) {
      return replacement;
    }
  }

  // For unmatched routes, return the first segment only to limit cardinality
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    return '/' + segments[0];
  }

  return pathname || '/';
}

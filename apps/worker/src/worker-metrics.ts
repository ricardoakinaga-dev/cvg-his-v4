import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';
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

// Collect default Node.js metrics (event loop, GC, handles, etc.)
collectDefaultMetrics({ register: registry });

// ============================================================================
// Feature Flag Metrics (PR-FF-13, GAP-12)
// ============================================================================

export const featureFlagEvaluationsTotal = new Counter({
  name: 'worker_feature_flag_evaluations_total',
  help: 'Total number of feature flag evaluations in the worker',
  labelNames: ['flag_key', 'provider', 'reason', 'enabled'] as const,
  registers: [registry]
});

export const featureFlagErrorsTotal = new Counter({
  name: 'worker_feature_flag_errors_total',
  help: 'Total number of feature flag errors in the worker',
  labelNames: ['flag_key', 'provider', 'error_type'] as const,
  registers: [registry]
});

export const featureFlagFallbacksTotal = new Counter({
  name: 'worker_feature_flag_fallbacks_total',
  help: 'Total number of feature flag fallback evaluations in the worker',
  labelNames: ['flag_key', 'provider', 'fallback_reason'] as const,
  registers: [registry]
});

export const featureFlagEvaluationDuration = new Histogram({
  name: 'worker_feature_flag_evaluation_duration_ms',
  help: 'Feature flag evaluation duration in milliseconds in the worker',
  labelNames: ['flag_key', 'provider'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50, 100],
  registers: [registry]
});

/**
 * Creates a Prometheus-backed FeatureFlagMetricsCollector for the worker.
 * This collector records evaluations, errors, and fallbacks to Prometheus counters/histograms.
 */
export function createWorkerFeatureFlagMetricsCollector(): FeatureFlagMetricsCollector {
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

export function getWorkerMetricsRegistry(): Registry {
  return registry;
}

export async function getWorkerMetricsText(): Promise<string> {
  return registry.metrics();
}

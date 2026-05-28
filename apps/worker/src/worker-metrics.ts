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

// ============================================================================
// Scheduled Report Metrics
// ============================================================================

export const scheduledReportSchedulesTotal = new Counter({
  name: 'worker_scheduled_report_schedules_total',
  help: 'Total number of scheduled report schedules observed by worker outcome',
  labelNames: ['outcome'] as const,
  registers: [registry]
});

export const scheduledReportTickDuration = new Histogram({
  name: 'worker_scheduled_report_tick_duration_ms',
  help: 'Scheduled report worker tick duration in milliseconds',
  labelNames: ['status'] as const,
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry]
});

export const scheduledReportExecutionsTotal = new Counter({
  name: 'worker_scheduled_report_executions_total',
  help: 'Total scheduled report executions grouped by report and row state',
  labelNames: ['report_id', 'outcome', 'row_state'] as const,
  registers: [registry]
});

export type ScheduledReportExecutionOutcome = 'executed' | 'exported' | 'failed';
export type ScheduledReportExecutionRowState = 'filled' | 'empty' | 'not_executed';

export interface ScheduledReportExecutionMetric {
  readonly reportId: string;
  readonly outcome: ScheduledReportExecutionOutcome;
  readonly rowState: ScheduledReportExecutionRowState;
}

export interface ScheduledReportMetrics {
  readonly dueSchedules: number;
  readonly executedSchedules: number;
  readonly exportedSchedules: number;
  readonly failedSchedules: number;
  readonly durationMs: number;
  readonly executions?: readonly ScheduledReportExecutionMetric[];
}

export function recordScheduledReportMetrics(metrics: ScheduledReportMetrics): void {
  if (metrics.dueSchedules > 0) {
    scheduledReportSchedulesTotal.inc({ outcome: 'due' }, metrics.dueSchedules);
  }
  if (metrics.executedSchedules > 0) {
    scheduledReportSchedulesTotal.inc({ outcome: 'executed' }, metrics.executedSchedules);
  }
  if (metrics.exportedSchedules > 0) {
    scheduledReportSchedulesTotal.inc({ outcome: 'exported' }, metrics.exportedSchedules);
  }
  if (metrics.failedSchedules > 0) {
    scheduledReportSchedulesTotal.inc({ outcome: 'failed' }, metrics.failedSchedules);
  }
  for (const execution of metrics.executions ?? []) {
    scheduledReportExecutionsTotal.inc({
      report_id: execution.reportId,
      outcome: execution.outcome,
      row_state: execution.rowState
    });
  }
  scheduledReportTickDuration.observe(
    { status: metrics.failedSchedules > 0 ? 'partial_failure' : 'success' },
    metrics.durationMs
  );
}

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

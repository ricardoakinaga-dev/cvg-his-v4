import type { AccountId } from '@cvg-his-v2/shared-types';

import type { ClinicalOperationalMetricsSnapshot } from './metrics.js';

/**
 * Read-only service surface used by the Prometheus clinical gauges.  The
 * provider deliberately receives the already-composed domain services instead
 * of opening a second database connection or exposing tenant identifiers as
 * metric labels.
 */
export interface ClinicalOperationalMetricsSources {
  readonly users: {
    list(): readonly Readonly<{ readonly accountId: string }>[];
  };
  readonly inpatient: {
    list(accountId: AccountId): readonly Readonly<{ readonly status?: string }>[];
  };
  readonly encounters: {
    listActive(accountId: AccountId): readonly unknown[];
  };
  readonly workflowTasks: {
    list(
      accountId: AccountId
    ): Promise<readonly Readonly<{ readonly status: string; readonly dueAt: string }>[]>;
  };
  readonly prescriptionExecutions: {
    list(
      accountId: AccountId
    ): readonly Readonly<{ readonly status?: string; readonly scheduledAt?: string }>[];
  };
  readonly diagnostics: {
    list(accountId: AccountId): readonly Readonly<{ readonly status?: string }>[];
  };
  readonly clinicalHandoffs: {
    list(accountId: AccountId): readonly Readonly<{ readonly handoffStatus?: string }>[];
  };
}

const TERMINAL_WORKFLOW_STATES = new Set(['completed', 'cancelled', 'dlq']);
const TERMINAL_DIAGNOSTIC_STATES = new Set(['delivered', 'cancelled']);
const RESOLVED_HANDOFF_STATES = new Set(['acknowledged_by_reception', 'sent_to_finance']);

function isBeforeNow(value: string, nowMs: number): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= nowMs;
}

/**
 * Builds an eventually-consistent, tenant-aggregated snapshot for the API
 * metrics endpoint.  Counts are computed from the composed services' current
 * authoritative cache and carry no patient, account, or user labels.
 */
export function createClinicalOperationalMetricsProvider(
  sources: ClinicalOperationalMetricsSources,
  now: () => number = Date.now
): () => Promise<ClinicalOperationalMetricsSnapshot> {
  return async () => {
    const accountIds = [
      ...new Set(
        sources.users
          .list()
          .map((user) => user.accountId)
          .filter((accountId): accountId is string => accountId.trim().length > 0)
      )
    ];
    const nowMs = now();

    const totals = {
      activeInpatients: 0,
      openEncounters: 0,
      pendingWorkflowTasks: 0,
      overdueWorkflowTasks: 0,
      medicationOverdue: 0,
      pendingDiagnostics: 0,
      handoverPending: 0
    };

    const accountSnapshots = await Promise.all(
      accountIds.map(async (accountId) => {
        const scopedAccountId = accountId as AccountId;
        const workflowTasks = await sources.workflowTasks.list(scopedAccountId);
        const activeTasks = workflowTasks.filter(
          (task) => !TERMINAL_WORKFLOW_STATES.has(task.status)
        );

        return {
          activeInpatients: sources.inpatient.list(scopedAccountId).length,
          openEncounters: sources.encounters.listActive(scopedAccountId).length,
          pendingWorkflowTasks: activeTasks.length,
          overdueWorkflowTasks: activeTasks.filter((task) => isBeforeNow(task.dueAt, nowMs)).length,
          medicationOverdue: sources.prescriptionExecutions
            .list(scopedAccountId)
            .filter(
              (execution) =>
                execution.status === 'pending' &&
                typeof execution.scheduledAt === 'string' &&
                isBeforeNow(execution.scheduledAt, nowMs)
            ).length,
          pendingDiagnostics: sources.diagnostics
            .list(scopedAccountId)
            .filter(
              (order) =>
                typeof order.status !== 'string' || !TERMINAL_DIAGNOSTIC_STATES.has(order.status)
            ).length,
          handoverPending: sources.clinicalHandoffs
            .list(scopedAccountId)
            .filter(
              (handoff) =>
                typeof handoff.handoffStatus !== 'string' ||
                !RESOLVED_HANDOFF_STATES.has(handoff.handoffStatus)
            ).length
        } satisfies ClinicalOperationalMetricsSnapshot;
      })
    );

    for (const snapshot of accountSnapshots) {
      totals.activeInpatients += snapshot.activeInpatients;
      totals.openEncounters += snapshot.openEncounters;
      totals.pendingWorkflowTasks += snapshot.pendingWorkflowTasks;
      totals.overdueWorkflowTasks += snapshot.overdueWorkflowTasks;
      totals.medicationOverdue += snapshot.medicationOverdue;
      totals.pendingDiagnostics += snapshot.pendingDiagnostics;
      totals.handoverPending += snapshot.handoverPending;
    }

    return totals;
  };
}

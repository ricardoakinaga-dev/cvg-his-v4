import {
  WorkflowTaskService,
  type WorkflowTaskSummary
} from '@cvg-his-v2/module-workflows';
import type { AccountId, CorrelationId } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';
import type { Logger } from '@cvg-his-v2/shared-logging';

import { recordWorkflowTaskMetric } from './worker-metrics.js';

export interface WorkflowTaskHandlerContext {
  readonly accountId: AccountId;
  readonly workerId: string;
  readonly correlationId: CorrelationId;
}

export type WorkflowTaskHandler = (
  task: WorkflowTaskSummary,
  context: WorkflowTaskHandlerContext
) => Promise<void>;

export interface WorkflowTaskTickOptions {
  readonly service: WorkflowTaskService;
  readonly accountId: AccountId;
  readonly workerId: string;
  readonly correlationId: CorrelationId;
  readonly handlers?: ReadonlyMap<string, WorkflowTaskHandler>;
  readonly logger?: Logger;
  readonly now?: () => string;
  readonly limit?: number;
  readonly leaseMs?: number;
}

export interface WorkflowTaskTickResult {
  readonly claimed: number;
  readonly completed: number;
  readonly retried: number;
  readonly deadLettered: number;
  readonly leaseLost: number;
  readonly handlerMissing: number;
}

function normalizeWorkerId(workerId: string): string {
  if (!workerId || workerId !== workerId.trim() || workerId.length > 160) {
    throw new Error('Workflow task worker id is invalid');
  }
  return workerId;
}

function normalizeLimit(limit: number): number {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Workflow task batch limit must be between 1 and 100');
  }
  return limit;
}

function normalizeLeaseMs(leaseMs: number): number {
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 900_000) {
    throw new Error('Workflow task lease must be between 1000 and 900000 milliseconds');
  }
  return leaseMs;
}

export async function runWorkflowTaskTick(
  options: WorkflowTaskTickOptions
): Promise<WorkflowTaskTickResult> {
  const workerId = normalizeWorkerId(options.workerId);
  const limit = normalizeLimit(options.limit ?? 25);
  const leaseMs = normalizeLeaseMs(options.leaseMs ?? 60_000);
  const now = options.now ?? nowIso;
  const claims = await options.service.claimDue({
    accountId: options.accountId,
    workerId,
    correlationId: options.correlationId,
    now: now(),
    limit,
    leaseMs
  });
  const result = {
    claimed: claims.length,
    completed: 0,
    retried: 0,
    deadLettered: 0,
    leaseLost: 0,
    handlerMissing: 0
  };

  for (const claim of claims) {
    const handler = options.handlers?.get(claim.task.taskType);
    let activeClaim = claim;
    let leaseLost = false;
    let heartbeatInFlight: Promise<void> | undefined;
    const heartbeatIntervalMs = Math.max(250, Math.floor(leaseMs / 3));
    const heartbeatTimer = setInterval(() => {
      if (leaseLost || heartbeatInFlight) return;
      heartbeatInFlight = options.service
        .renewClaim(activeClaim, now(), leaseMs)
        .then((renewed) => {
          if (renewed) {
            activeClaim = renewed;
          } else {
            leaseLost = true;
          }
        })
        .catch(() => {
          // A failed heartbeat is fail-closed: the handler may finish, but
          // this worker must not publish a stale completion/failure transition.
          leaseLost = true;
        })
        .finally(() => {
          heartbeatInFlight = undefined;
        });
    }, heartbeatIntervalMs);
    heartbeatTimer.unref?.();
    try {
      if (!handler) {
        result.handlerMissing += 1;
        throw new Error(`No handler registered for workflow task type '${claim.task.taskType}'`);
      }
      await handler(claim.task, {
        accountId: options.accountId,
        workerId,
        correlationId: options.correlationId
      });
      if (heartbeatInFlight) await heartbeatInFlight;
      if (!leaseLost && await options.service.completeClaim(activeClaim)) {
        result.completed += 1;
        recordWorkflowTaskMetric('completed');
      } else {
        result.leaseLost += 1;
        recordWorkflowTaskMetric('lease_lost');
        options.logger?.warn('workflow task lease lost before completion', {
          accountId: options.accountId,
          taskId: claim.task.id,
          workerId
        });
      }
    } catch (error) {
      if (heartbeatInFlight) await heartbeatInFlight;
      const transitioned = !leaseLost && await options.service.failClaim(
        activeClaim,
        error instanceof Error ? error.message : String(error)
      );
      if (!transitioned) {
        result.leaseLost += 1;
        recordWorkflowTaskMetric('lease_lost');
        options.logger?.warn('workflow task lease lost before failure transition', {
          accountId: options.accountId,
          taskId: claim.task.id,
          workerId
        });
      } else if (claim.task.attempts >= claim.task.maxAttempts) {
        result.deadLettered += 1;
        recordWorkflowTaskMetric('dead_lettered');
      } else {
        result.retried += 1;
        recordWorkflowTaskMetric('retried');
      }
      options.logger?.error('workflow task handler failed', {
        accountId: options.accountId,
        taskId: claim.task.id,
        taskType: claim.task.taskType,
        workerId,
        error
      });
    } finally {
      clearInterval(heartbeatTimer);
      if (heartbeatInFlight) await heartbeatInFlight;
    }
  }

  if (result.claimed > 0) recordWorkflowTaskMetric('claimed', result.claimed);
  return result;
}

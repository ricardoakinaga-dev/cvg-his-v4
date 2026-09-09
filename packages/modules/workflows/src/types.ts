import type {
  AccountId,
  Brand,
  CorrelationId,
  EncounterId,
  PatientId,
  UserId
} from '@cvg-his-v2/shared-types';

export type WorkflowTaskId = Brand<string, 'WorkflowTaskId'>;
export type WorkflowTaskEventId = Brand<string, 'WorkflowTaskEventId'>;

export type WorkflowTaskStatus =
  | 'pending'
  | 'processing'
  | 'retrying'
  | 'acknowledged'
  | 'completed'
  | 'cancelled'
  | 'dlq';

export type WorkflowTaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type WorkflowTaskExecutionMode = 'manual' | 'worker';
export type WorkflowTaskOwnerType = 'sector' | 'team' | 'person' | 'system';
export type WorkflowTaskEventType =
  | 'created'
  | 'claimed'
  | 'acknowledged'
  | 'completed'
  | 'cancelled'
  | 'retry_scheduled'
  | 'dead_lettered'
  | 'replayed'
  | 'rescheduled'
  | 'escalated';

export interface WorkflowTaskSummary {
  readonly id: WorkflowTaskId;
  readonly accountId: AccountId;
  readonly taskType: string;
  readonly status: WorkflowTaskStatus;
  readonly executionMode: WorkflowTaskExecutionMode;
  readonly priority: WorkflowTaskPriority;
  readonly title: string;
  readonly description?: string;
  readonly patientId?: PatientId;
  readonly encounterId?: EncounterId;
  readonly ownerType?: WorkflowTaskOwnerType;
  readonly ownerId?: string;
  readonly dueAt: string;
  readonly idempotencyKey: string;
  readonly fingerprint: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly nextAttemptAt: string;
  readonly leaseOwner?: string;
  readonly leaseToken?: string;
  readonly leaseVersion: number;
  /** Monotonic optimistic-concurrency version for every task mutation. */
  readonly revision: number;
  readonly leaseExpiresAt?: string;
  readonly lastAttemptAt?: string;
  readonly lastError?: string;
  readonly acknowledgedByUserId?: UserId;
  readonly acknowledgedAt?: string;
  readonly completedByUserId?: UserId;
  readonly completedAt?: string;
  readonly cancelledByUserId?: UserId;
  readonly cancelledAt?: string;
  readonly cancellationReason?: string;
  readonly escalationLevel: number;
  readonly lastEscalatedAt?: string;
  readonly correlationId: CorrelationId;
  readonly causationId?: string;
  readonly createdByUserId?: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWorkflowTaskInput {
  readonly taskType: string;
  readonly title: string;
  readonly description?: string;
  readonly priority?: WorkflowTaskPriority;
  readonly executionMode?: WorkflowTaskExecutionMode;
  readonly patientId?: PatientId;
  readonly encounterId?: EncounterId;
  readonly ownerType?: WorkflowTaskOwnerType;
  readonly ownerId?: string;
  readonly dueAt: string;
  readonly idempotencyKey: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly maxAttempts?: number;
  readonly correlationId?: CorrelationId;
  readonly causationId?: string;
}

export interface WorkflowTaskListFilters {
  readonly status?: WorkflowTaskStatus;
  readonly taskType?: string;
  readonly patientId?: PatientId;
  readonly encounterId?: EncounterId;
  readonly dueBefore?: string;
  readonly limit?: number;
}

export interface WorkflowTaskEventSummary {
  readonly id: WorkflowTaskEventId;
  readonly accountId: AccountId;
  readonly taskId: WorkflowTaskId;
  readonly eventType: WorkflowTaskEventType;
  readonly actorUserId?: UserId;
  readonly correlationId: CorrelationId;
  readonly causationId?: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: string;
}

export interface WorkflowTaskClaim {
  readonly task: WorkflowTaskSummary;
  readonly leaseOwner: string;
  readonly leaseToken: string;
  readonly leaseVersion: number;
  readonly leaseExpiresAt: string;
}

export interface WorkflowTaskTransitionEvent {
  readonly eventType: WorkflowTaskEventType;
  readonly actorUserId?: UserId;
  readonly correlationId: CorrelationId;
  readonly causationId?: string;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly occurredAt: string;
}

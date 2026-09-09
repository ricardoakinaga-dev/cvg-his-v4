import { apiRequest } from './api';

export type WorkflowTaskStatus =
  | 'pending'
  | 'processing'
  | 'retrying'
  | 'acknowledged'
  | 'completed'
  | 'cancelled'
  | 'dlq';

export type WorkflowTaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface WorkflowTaskRecord {
  readonly id: string;
  readonly accountId: string;
  readonly taskType: string;
  readonly status: WorkflowTaskStatus;
  readonly executionMode: 'manual' | 'worker';
  readonly priority: WorkflowTaskPriority;
  readonly title: string;
  readonly description?: string;
  readonly patientId?: string;
  readonly encounterId?: string;
  readonly ownerType?: 'sector' | 'team' | 'person' | 'system';
  readonly ownerId?: string;
  readonly dueAt: string;
  readonly idempotencyKey: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly revision: number;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly nextAttemptAt: string;
  readonly lastError?: string;
  readonly acknowledgedByUserId?: string;
  readonly acknowledgedAt?: string;
  readonly completedByUserId?: string;
  readonly completedAt?: string;
  readonly cancelledByUserId?: string;
  readonly cancelledAt?: string;
  readonly cancellationReason?: string;
  readonly escalationLevel: number;
  readonly lastEscalatedAt?: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly createdByUserId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface WorkflowTaskListResponse {
  readonly items?: readonly WorkflowTaskRecord[];
  readonly count?: number;
}

export interface WorkflowTaskListFilters {
  readonly status?: WorkflowTaskStatus;
  readonly taskType?: string;
  readonly patientId?: string;
  readonly encounterId?: string;
  readonly dueBefore?: string;
  readonly limit?: number;
}

function actionPath(taskId: string, action: 'acknowledge' | 'complete' | 'cancel' | 'replay'): string {
  return `/workflow-tasks/${encodeURIComponent(taskId)}/${action}`;
}

export const workflowTaskService = {
  async list(filters: WorkflowTaskListFilters = {}): Promise<WorkflowTaskRecord[]> {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.taskType) params.set('taskType', filters.taskType);
    if (filters.patientId) params.set('patientId', filters.patientId);
    if (filters.encounterId) params.set('encounterId', filters.encounterId);
    if (filters.dueBefore) params.set('dueBefore', filters.dueBefore);
    params.set('limit', String(filters.limit ?? 200));
    const query = params.toString();
    const response = await apiRequest<WorkflowTaskListResponse>(
      `/workflow-tasks${query ? `?${query}` : ''}`
    );
    return [...(response.items ?? [])];
  },

  acknowledge(taskId: string, note?: string): Promise<WorkflowTaskRecord> {
    return apiRequest<WorkflowTaskRecord>(actionPath(taskId, 'acknowledge'), {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {})
    });
  },

  complete(taskId: string): Promise<WorkflowTaskRecord> {
    return apiRequest<WorkflowTaskRecord>(actionPath(taskId, 'complete'), {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  cancel(taskId: string, reason: string): Promise<WorkflowTaskRecord> {
    return apiRequest<WorkflowTaskRecord>(actionPath(taskId, 'cancel'), {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  replay(taskId: string, revision: number): Promise<WorkflowTaskRecord> {
    return apiRequest<WorkflowTaskRecord>(actionPath(taskId, 'replay'), {
      method: 'POST',
      headers: {
        // A retry after a lost response must replay the same command. Binding
        // the key to the task revision also gives a later DLQ cycle a fresh key.
        'Idempotency-Key': `workflow-task-replay:${taskId}:r${revision}`
      },
      body: JSON.stringify({})
    });
  }
};

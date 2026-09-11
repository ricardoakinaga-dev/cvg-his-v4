import { createHash, randomUUID } from 'node:crypto';

import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, CorrelationId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import {
  WORKFLOW_TASK_EVENT_SCHEMA_VERSION,
  WORKFLOW_TASK_EVENT_SOURCE
} from './types.js';

import {
  DatabaseWorkflowTaskRepository,
  InMemoryWorkflowTaskRepository,
  checkWorkflowTaskSchemaReadiness,
  type WorkflowTaskRepository
} from './repository.js';
import type {
  CreateWorkflowTaskInput,
  WorkflowTaskClaim,
  WorkflowTaskEventSummary,
  WorkflowTaskListFilters,
  WorkflowTaskPriority,
  WorkflowTaskStatus,
  WorkflowTaskSummary,
  WorkflowTaskTransitionEvent,
  WorkflowTaskWorkerRegistry
} from './types.js';

export * from './types.js';
export {
  DatabaseWorkflowTaskRepository,
  InMemoryWorkflowTaskRepository,
  checkWorkflowTaskSchemaReadiness,
  type WorkflowTaskRepository
} from './repository.js';

/**
 * Build the allow-list shared by task producers and the worker boundary.
 * Empty by default: no worker task type is production-ready until its
 * idempotent effect, retry behavior and lease-loss handling are registered.
 */
export function createWorkflowTaskWorkerRegistry(
  taskTypes: Iterable<string> = []
): WorkflowTaskWorkerRegistry {
  const normalized = [...new Set([...taskTypes].map((taskType) => {
    if (typeof taskType !== 'string' || taskType.trim() !== taskType || taskType.length === 0 || taskType.length > 80) {
      throw new TypeError('Workflow task worker type must be a trimmed non-empty string of at most 80 characters');
    }
    return taskType;
  }))].sort();
  const allowed = new Set(normalized);
  return {
    taskTypes: Object.freeze(normalized),
    has: (taskType: string): boolean => allowed.has(taskType)
  };
}

/** No worker side effect is currently approved for production registration. */
export const EMPTY_WORKFLOW_TASK_WORKER_REGISTRY = createWorkflowTaskWorkerRegistry();

/**
 * Enforce the producer-side half of the worker registration contract. The
 * service remains generic for durable lease/retry tests and migrations; HTTP
 * producers must pass the explicit registry before persisting a worker task.
 */
export function assertWorkflowTaskWorkerPolicy(
  input: Pick<CreateWorkflowTaskInput, 'taskType' | 'executionMode'>,
  registry: WorkflowTaskWorkerRegistry = EMPTY_WORKFLOW_TASK_WORKER_REGISTRY
): void {
  const executionMode = input.executionMode ?? 'manual';
  if (executionMode !== 'worker' || registry.has(input.taskType)) return;
  throw new ValidationError(
    `Workflow task type '${input.taskType}' is not registered for worker execution`,
    { taskType: input.taskType, executionMode }
  );
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function fingerprint(input: {
  readonly taskType: string;
  readonly title: string;
  readonly executionMode: 'manual' | 'worker';
  readonly description?: string;
  readonly priority: WorkflowTaskPriority;
  readonly patientId?: string;
  readonly encounterId?: string;
  readonly ownerType?: string;
  readonly ownerId?: string;
  readonly dueAt: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly maxAttempts: number;
  readonly correlationId: CorrelationId;
  readonly causationId?: string;
}): string {
  return createHash('sha256').update(stableJson({
    taskType: input.taskType,
    title: input.title,
    executionMode: input.executionMode,
    description: input.description,
    priority: input.priority ?? 'normal',
    patientId: input.patientId,
    encounterId: input.encounterId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    dueAt: input.dueAt,
    metadata: input.metadata ?? {},
    maxAttempts: input.maxAttempts ?? 5,
    causationId: input.causationId
  })).digest('hex');
}

function fingerprintForTask(task: WorkflowTaskSummary, dueAt = task.dueAt): string {
  return fingerprint({
    taskType: task.taskType,
    title: task.title,
    executionMode: task.executionMode,
    description: task.description,
    priority: task.priority,
    patientId: task.patientId,
    encounterId: task.encounterId,
    ownerType: task.ownerType,
    ownerId: task.ownerId,
    dueAt,
    metadata: task.metadata,
    maxAttempts: task.maxAttempts,
    correlationId: task.correlationId,
    causationId: task.causationId
  });
}

function transitionEvent(task: WorkflowTaskSummary, eventType: WorkflowTaskTransitionEvent['eventType'], actorUserId: UserId | undefined, occurredAt: string, payload?: Record<string, unknown>): WorkflowTaskTransitionEvent {
  return {
    eventType,
    schemaVersion: WORKFLOW_TASK_EVENT_SCHEMA_VERSION,
    source: WORKFLOW_TASK_EVENT_SOURCE,
    actorUserId,
    correlationId: task.correlationId,
    causationId: task.causationId,
    occurredAt,
    payload
  };
}

function validatePriority(value: WorkflowTaskPriority | undefined): WorkflowTaskPriority {
  const priority = value ?? 'normal';
  if (!['low', 'normal', 'high', 'critical'].includes(priority)) throw new ValidationError('Workflow task priority is invalid');
  return priority;
}

function validateExecutionMode(value: CreateWorkflowTaskInput['executionMode']): 'manual' | 'worker' {
  const executionMode = value ?? 'manual';
  if (!['manual', 'worker'].includes(executionMode)) {
    throw new ValidationError('Workflow task executionMode is invalid');
  }
  return executionMode;
}

function validateDate(value: string, field: string): string {
  if (typeof value !== 'string' || !/T[^\s]*?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    throw new ValidationError(`${field} must be an ISO timestamp with timezone`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new ValidationError(`${field} must be an ISO timestamp with timezone`);
  return new Date(parsed).toISOString();
}

function validateMaxAttempts(value: number | undefined): number {
  const maxAttempts = value ?? 5;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 50) throw new ValidationError('maxAttempts must be an integer between 1 and 50');
  return maxAttempts;
}

export interface WorkflowTaskServiceOptions {
  readonly repository?: WorkflowTaskRepository;
  readonly now?: () => string;
}

export class WorkflowTaskService {
  readonly #repository: WorkflowTaskRepository;
  readonly #now: () => string;

  public constructor(options: WorkflowTaskServiceOptions = {}) {
    this.#repository = options.repository ?? new InMemoryWorkflowTaskRepository();
    this.#now = options.now ?? nowIso;
  }

  public get repository(): WorkflowTaskRepository {
    return this.#repository;
  }

  public async create(accountId: AccountId, actorUserId: UserId, input: CreateWorkflowTaskInput): Promise<WorkflowTaskSummary> {
    const now = this.#now();
    const taskType = requireNonEmptyString(input.taskType, 'taskType').trim();
    const title = requireNonEmptyString(input.title, 'title').trim();
    const idempotencyKey = requireNonEmptyString(input.idempotencyKey, 'idempotencyKey').trim();
    if (taskType.length > 80 || title.length > 255 || idempotencyKey.length > 255) throw new ValidationError('Workflow task text exceeds its maximum length');
    const priority = validatePriority(input.priority);
    const executionMode = validateExecutionMode(input.executionMode);
    const dueAt = validateDate(input.dueAt, 'dueAt');
    const maxAttempts = validateMaxAttempts(input.maxAttempts);
    const description = input.description?.trim() || undefined;
    if (description && description.length > 4000) throw new ValidationError('description must contain at most 4000 characters');
    if (input.ownerType && !['sector', 'team', 'person', 'system'].includes(input.ownerType)) {
      throw new ValidationError('Workflow task ownerType is invalid');
    }
    if (input.ownerId && input.ownerId.trim().length > 160) {
      throw new ValidationError('ownerId must contain at most 160 characters');
    }
    const metadata = input.metadata ?? {};
    if (typeof metadata !== 'object' || Array.isArray(metadata) || metadata === null) {
      throw new ValidationError('metadata must be a JSON object');
    }
    if (Buffer.byteLength(stableJson(metadata), 'utf8') > 64 * 1024) {
      throw new ValidationError('metadata must contain at most 64 KiB');
    }
    const correlationId = input.correlationId ?? (createCorrelationId('workflow') as CorrelationId);
    const draft = {
      id: randomUUID() as WorkflowTaskSummary['id'],
      accountId,
      taskType,
      status: 'pending',
      executionMode,
      priority,
      title,
      description,
      patientId: input.patientId,
      encounterId: input.encounterId,
      ownerType: input.ownerType,
      ownerId: input.ownerId?.trim() || undefined,
      dueAt,
      idempotencyKey,
      metadata,
      attempts: 0,
      maxAttempts,
      nextAttemptAt: dueAt,
      leaseVersion: 0,
      revision: 0,
      escalationLevel: 0,
      correlationId,
      causationId: input.causationId,
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now
    } satisfies Omit<WorkflowTaskSummary, 'fingerprint'>;
    const task: WorkflowTaskSummary = { ...draft, fingerprint: fingerprint(draft) };
    return (await this.#repository.createOrGet(task, transitionEvent(task, 'created', actorUserId, now, { taskType, idempotencyKey }))).task;
  }

  public async getOrThrow(accountId: AccountId, taskId: WorkflowTaskSummary['id']): Promise<WorkflowTaskSummary> {
    const task = await this.#repository.findById(accountId, taskId);
    if (!task) throw new NotFoundError('Workflow task not found', { taskId });
    return task;
  }

  public list(accountId: AccountId, filters: WorkflowTaskListFilters = {}): Promise<readonly WorkflowTaskSummary[]> {
    return this.#repository.list(accountId, filters);
  }

  public findByIdempotencyKey(accountId: AccountId, idempotencyKey: string): Promise<WorkflowTaskSummary | null> {
    return this.#repository.findByIdempotencyKey(accountId, idempotencyKey);
  }

  public events(accountId: AccountId, taskId: WorkflowTaskSummary['id'], limit?: number): Promise<readonly WorkflowTaskEventSummary[]> {
    return this.#repository.listEvents(accountId, taskId, limit);
  }

  public async acknowledge(accountId: AccountId, actorUserId: UserId, taskId: WorkflowTaskSummary['id'], note?: string): Promise<WorkflowTaskSummary> {
    const current = await this.getOrThrow(accountId, taskId);
    if (current.status === 'acknowledged') return current;
    if (!['pending', 'retrying'].includes(current.status)) throw new ConflictError(`Workflow task cannot be acknowledged from status ${current.status}`);
    const now = this.#now();
    const updated = { ...current, status: 'acknowledged' as const, acknowledgedByUserId: actorUserId, acknowledgedAt: now, lastError: undefined, revision: current.revision + 1, updatedAt: now };
    await this.#repository.save(updated, transitionEvent(updated, 'acknowledged', actorUserId, now, note ? { note } : undefined));
    return updated;
  }

  public async complete(accountId: AccountId, actorUserId: UserId, taskId: WorkflowTaskSummary['id']): Promise<WorkflowTaskSummary> {
    const current = await this.getOrThrow(accountId, taskId);
    if (current.status === 'completed') return current;
    if (!['pending', 'acknowledged', 'retrying'].includes(current.status)) throw new ConflictError(`Workflow task cannot be completed from status ${current.status}`);
    const now = this.#now();
    const updated = { ...current, status: 'completed' as const, completedByUserId: actorUserId, completedAt: now, revision: current.revision + 1, updatedAt: now };
    await this.#repository.save(updated, transitionEvent(updated, 'completed', actorUserId, now));
    return updated;
  }

  public async cancel(accountId: AccountId, actorUserId: UserId, taskId: WorkflowTaskSummary['id'], reason: string): Promise<WorkflowTaskSummary> {
    const current = await this.getOrThrow(accountId, taskId);
    if (current.status === 'cancelled') return current;
    if (['completed', 'processing'].includes(current.status)) throw new ConflictError(`Workflow task cannot be cancelled from status ${current.status}`);
    const now = this.#now();
    const cancellationReason = requireNonEmptyString(reason, 'reason').trim();
    const updated = { ...current, status: 'cancelled' as const, cancelledByUserId: actorUserId, cancelledAt: now, cancellationReason, revision: current.revision + 1, updatedAt: now };
    await this.#repository.save(updated, transitionEvent(updated, 'cancelled', actorUserId, now, { reason: cancellationReason }));
    return updated;
  }

  public async reschedule(
    accountId: AccountId,
    actorUserId: UserId,
    taskId: WorkflowTaskSummary['id'],
    dueAt: string,
    reason?: string
  ): Promise<WorkflowTaskSummary> {
    const current = await this.getOrThrow(accountId, taskId);
    if (!['pending', 'retrying', 'acknowledged', 'cancelled'].includes(current.status)) {
      throw new ConflictError(`Workflow task cannot be rescheduled from status ${current.status}`);
    }
    const normalizedDueAt = validateDate(dueAt, 'dueAt');
    const now = this.#now();
    const reopened = current.status === 'cancelled';
    const updated: WorkflowTaskSummary = {
      ...current,
      status: reopened ? 'pending' : current.status,
      dueAt: normalizedDueAt,
      nextAttemptAt: normalizedDueAt,
      lastError: undefined,
      cancelledByUserId: reopened ? undefined : current.cancelledByUserId,
      cancelledAt: reopened ? undefined : current.cancelledAt,
      cancellationReason: reopened ? undefined : current.cancellationReason,
      fingerprint: fingerprintForTask(current, normalizedDueAt),
      revision: current.revision + 1,
      updatedAt: now
    };
    await this.#repository.save(updated, transitionEvent(updated, 'rescheduled', actorUserId, now, {
      previousDueAt: current.dueAt,
      dueAt: normalizedDueAt,
      reopened,
      ...(reason ? { reason } : {})
    }));
    return updated;
  }

  public claimDue(input: Parameters<WorkflowTaskRepository['claimDue']>[0]): Promise<readonly WorkflowTaskClaim[]> {
    return this.#repository.claimDue(input);
  }

  public renewClaim(
    claim: WorkflowTaskClaim,
    now: string,
    leaseMs: number
  ): Promise<WorkflowTaskClaim | null> {
    return this.#repository.renewClaim(claim, now, leaseMs);
  }

  public async completeClaim(claim: WorkflowTaskClaim, actorUserId?: UserId): Promise<boolean> {
    const now = this.#now();
    return this.#repository.completeClaim(claim, transitionEvent(claim.task, 'completed', actorUserId, now));
  }

  public async failClaim(claim: WorkflowTaskClaim, error: string, actorUserId?: UserId): Promise<boolean> {
    const now = this.#now();
    const normalized = requireNonEmptyString(error, 'error').slice(0, 4000);
    const eventType = claim.task.attempts >= claim.task.maxAttempts ? 'dead_lettered' : 'retry_scheduled';
    const event = transitionEvent(claim.task, eventType, actorUserId, now, { attempt: claim.task.attempts, error: normalized });
    if (claim.task.attempts >= claim.task.maxAttempts) return this.#repository.moveToDeadLetter(claim, normalized, event);
    const delayMs = Math.min(1_000 * 2 ** Math.max(0, claim.task.attempts - 1), 60_000);
    return this.#repository.retryClaim(claim, new Date(Date.parse(now) + delayMs).toISOString(), normalized, event);
  }

  public async replay(accountId: AccountId, actorUserId: UserId, taskId: WorkflowTaskSummary['id']): Promise<WorkflowTaskSummary> {
    const current = await this.getOrThrow(accountId, taskId);
    const now = this.#now();
    return this.#repository.replay(accountId, taskId, transitionEvent(current, 'replayed', actorUserId, now));
  }

  public async escalateOverdue(accountId: AccountId, actorUserId: UserId, limit = 50): Promise<readonly WorkflowTaskSummary[]> {
    const now = this.#now();
    const overdue = await this.#repository.list(accountId, { dueBefore: now });
    const escalated: WorkflowTaskSummary[] = [];
    for (const current of overdue.slice(0, Math.max(1, Math.min(200, limit)))) {
      if (['completed', 'cancelled', 'dlq'].includes(current.status)) continue;
      if (
        current.lastEscalatedAt &&
        Date.parse(now) - Date.parse(current.lastEscalatedAt) < 60 * 60 * 1000
      ) continue;
      const updated = { ...current, escalationLevel: current.escalationLevel + 1, lastEscalatedAt: now, revision: current.revision + 1, updatedAt: now };
      await this.#repository.save(updated, transitionEvent(updated, 'escalated', actorUserId, now, { escalationLevel: updated.escalationLevel }));
      escalated.push(updated);
    }
    return escalated;
  }
}

export function createDatabaseWorkflowTaskService(options: { readonly now?: () => string } = {}): WorkflowTaskService {
  return new WorkflowTaskService({ repository: new DatabaseWorkflowTaskRepository(), now: options.now });
}

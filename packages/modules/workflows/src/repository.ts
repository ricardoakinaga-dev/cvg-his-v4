import { randomUUID } from 'node:crypto';

import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import { getPool } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  CorrelationId,
  EncounterId,
  PatientId,
  UserId
} from '@cvg-his-v2/shared-types';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';

import { WORKFLOW_TASK_EVENT_SCHEMA_VERSION, WORKFLOW_TASK_EVENT_SOURCE } from './types.js';

import type {
  WorkflowTaskClaim,
  WorkflowTaskEventSummary,
  WorkflowTaskEventType,
  WorkflowTaskExecutionMode,
  WorkflowTaskId,
  WorkflowTaskListFilters,
  WorkflowTaskStatus,
  WorkflowTaskSummary,
  WorkflowTaskTransitionEvent
} from './types.js';

const MAX_EVENT_LIMIT = 500;

/**
 * Runtime readiness contract shared by API and worker. Keeping this query in
 * the workflow module prevents the two processes from disagreeing about which
 * migration/RLS/immutability guarantees are required before serving tasks.
 */
export async function checkWorkflowTaskSchemaReadiness(): Promise<boolean> {
  const result = await getPool().query<{ readonly ready: boolean }>(
    `SELECT
       (
         SELECT COUNT(*) = 2 AND COALESCE(BOOL_AND(c.relrowsecurity AND c.relforcerowsecurity), false)
           FROM pg_class AS c
           JOIN pg_namespace AS n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = ANY(ARRAY['clinical_workflow_tasks', 'clinical_workflow_task_events'])
            AND c.relkind IN ('r', 'p')
       )
       AND (
         SELECT COUNT(*) = 2
           FROM pg_policies
          WHERE schemaname = 'public'
            AND policyname = ANY(ARRAY[
              'clinical_workflow_tasks_tenant_isolation',
              'clinical_workflow_task_events_tenant_isolation'
            ])
            AND POSITION('app.current_account_id()' IN LOWER(COALESCE(qual, '') || ' ' || COALESCE(with_check, ''))) > 0
       )
       AND EXISTS (
         SELECT 1
           FROM pg_trigger AS trigger_info
           JOIN pg_class AS relation ON relation.oid = trigger_info.tgrelid
           JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = 'public'
            AND relation.relname = 'clinical_workflow_task_events'
            AND trigger_info.tgname = 'clinical_workflow_task_events_immutability_trigger'
            AND trigger_info.tgenabled <> 'D'
       )
       AND (
         SELECT COUNT(*) = 24
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'clinical_workflow_tasks'
            AND column_name = ANY(ARRAY[
              'id', 'account_id', 'task_type', 'status', 'execution_mode', 'priority', 'title', 'due_at',
              'idempotency_key', 'fingerprint', 'metadata', 'attempts', 'max_attempts',
              'next_attempt_at', 'lease_owner', 'lease_token', 'lease_version', 'revision',
              'lease_expires_at', 'correlation_id', 'created_at', 'updated_at',
              'patient_id', 'encounter_id'
            ])
       )
       AND (
         SELECT COUNT(*) = 11
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'clinical_workflow_task_events'
            AND column_name = ANY(ARRAY[
              'id', 'account_id', 'task_id', 'event_type', 'actor_user_id', 'correlation_id',
              'causation_id', 'payload', 'occurred_at', 'schema_version', 'source'
            ])
       )
       AND (
         SELECT COUNT(*) = 1
           FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'uq_clinical_workflow_tasks_account_idempotency'
       )
       AND (
         SELECT COUNT(*) = 4
           FROM pg_constraint
          WHERE conname = ANY(ARRAY[
            'clinical_workflow_tasks_execution_mode_chk',
            'clinical_workflow_tasks_patient_account_fk',
            'clinical_workflow_tasks_encounter_account_fk',
            'clinical_workflow_task_events_task_account_fk'
          ])
       ) AS ready`
  );
  return result.rows[0]?.ready === true;
}

function boundedEventLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(MAX_EVENT_LIMIT, Number.isSafeInteger(limit) ? limit! : 100));
}

export interface WorkflowTaskRepository {
  createOrGet(
    task: WorkflowTaskSummary,
    event: WorkflowTaskTransitionEvent
  ): Promise<{ readonly task: WorkflowTaskSummary; readonly created: boolean }>;
  findById(accountId: AccountId, taskId: WorkflowTaskId): Promise<WorkflowTaskSummary | null>;
  findByIdempotencyKey(
    accountId: AccountId,
    idempotencyKey: string
  ): Promise<WorkflowTaskSummary | null>;
  list(
    accountId: AccountId,
    filters?: WorkflowTaskListFilters
  ): Promise<readonly WorkflowTaskSummary[]>;
  listEvents(
    accountId: AccountId,
    taskId: WorkflowTaskId,
    limit?: number
  ): Promise<readonly WorkflowTaskEventSummary[]>;
  save(task: WorkflowTaskSummary, event: WorkflowTaskTransitionEvent): Promise<void>;
  renewClaim(
    claim: WorkflowTaskClaim,
    now: string,
    leaseMs: number
  ): Promise<WorkflowTaskClaim | null>;
  claimDue(input: {
    readonly accountId: AccountId;
    readonly workerId: string;
    readonly actorUserId?: UserId;
    readonly correlationId: CorrelationId;
    readonly now: string;
    readonly limit: number;
    readonly leaseMs: number;
  }): Promise<readonly WorkflowTaskClaim[]>;
  completeClaim(claim: WorkflowTaskClaim, event: WorkflowTaskTransitionEvent): Promise<boolean>;
  retryClaim(
    claim: WorkflowTaskClaim,
    nextAttemptAt: string,
    error: string,
    event: WorkflowTaskTransitionEvent
  ): Promise<boolean>;
  moveToDeadLetter(
    claim: WorkflowTaskClaim,
    error: string,
    event: WorkflowTaskTransitionEvent
  ): Promise<boolean>;
  replay(
    accountId: AccountId,
    taskId: WorkflowTaskId,
    event: WorkflowTaskTransitionEvent
  ): Promise<WorkflowTaskSummary>;
}

function cloneTask(task: WorkflowTaskSummary): WorkflowTaskSummary {
  return { ...task, metadata: structuredClone(task.metadata) };
}

function cloneEvent(event: WorkflowTaskEventSummary): WorkflowTaskEventSummary {
  return { ...event, payload: structuredClone(event.payload) };
}

function toEvent(
  task: WorkflowTaskSummary,
  input: WorkflowTaskTransitionEvent
): WorkflowTaskEventSummary {
  return {
    id: randomUUID() as WorkflowTaskEventSummary['id'],
    accountId: task.accountId,
    taskId: task.id,
    eventType: input.eventType,
    schemaVersion: input.schemaVersion,
    source: input.source,
    actorUserId: input.actorUserId,
    correlationId: input.correlationId,
    causationId: input.causationId,
    payload: input.payload ?? {},
    occurredAt: input.occurredAt
  };
}

function claimMatches(
  current: WorkflowTaskSummary | undefined,
  claim: WorkflowTaskClaim,
  now: string
): current is WorkflowTaskSummary {
  return Boolean(
    current &&
    current.status === 'processing' &&
    current.leaseToken === claim.leaseToken &&
    current.leaseOwner === claim.leaseOwner &&
    current.leaseVersion === claim.leaseVersion &&
    current.leaseExpiresAt &&
    Date.parse(current.leaseExpiresAt) > Date.parse(now)
  );
}

export class InMemoryWorkflowTaskRepository implements WorkflowTaskRepository {
  readonly #tasks = new Map<WorkflowTaskId, WorkflowTaskSummary>();
  readonly #events = new Map<WorkflowTaskId, WorkflowTaskEventSummary[]>();
  readonly #createLocks = new Map<string, Promise<void>>();

  public async createOrGet(
    task: WorkflowTaskSummary,
    event: WorkflowTaskTransitionEvent
  ): Promise<{ readonly task: WorkflowTaskSummary; readonly created: boolean }> {
    const lockKey = `${task.accountId}:${task.idempotencyKey}`;
    const previous = this.#createLocks.get(lockKey);
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#createLocks.set(lockKey, current);
    await previous;
    try {
      const existing = await this.findByIdempotencyKey(task.accountId, task.idempotencyKey);
      if (existing) {
        if (existing.fingerprint !== task.fingerprint) {
          throw new ConflictError(
            'Workflow task idempotency key was reused with a different payload',
            {
              idempotencyKey: task.idempotencyKey
            }
          );
        }
        return { task: existing, created: false };
      }
      this.#tasks.set(task.id, cloneTask(task));
      this.#events.set(task.id, [toEvent(task, event)]);
      return { task: cloneTask(task), created: true };
    } finally {
      release();
      if (this.#createLocks.get(lockKey) === current) this.#createLocks.delete(lockKey);
    }
  }

  public async findById(
    accountId: AccountId,
    taskId: WorkflowTaskId
  ): Promise<WorkflowTaskSummary | null> {
    const task = this.#tasks.get(taskId);
    return task && task.accountId === accountId ? cloneTask(task) : null;
  }

  public async findByIdempotencyKey(
    accountId: AccountId,
    idempotencyKey: string
  ): Promise<WorkflowTaskSummary | null> {
    for (const task of this.#tasks.values()) {
      if (task.accountId === accountId && task.idempotencyKey === idempotencyKey) {
        return cloneTask(task);
      }
    }
    return null;
  }

  public async list(
    accountId: AccountId,
    filters: WorkflowTaskListFilters = {}
  ): Promise<readonly WorkflowTaskSummary[]> {
    const limit = Math.max(1, Math.min(500, filters.limit ?? 100));
    return [...this.#tasks.values()]
      .filter((task) => task.accountId === accountId)
      .filter((task) => !filters.status || task.status === filters.status)
      .filter((task) => !filters.taskType || task.taskType === filters.taskType)
      .filter((task) => !filters.patientId || task.patientId === filters.patientId)
      .filter((task) => !filters.encounterId || task.encounterId === filters.encounterId)
      .filter((task) => !filters.dueBefore || task.dueAt <= filters.dueBefore)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .slice(0, limit)
      .map(cloneTask);
  }

  public async listEvents(
    accountId: AccountId,
    taskId: WorkflowTaskId,
    limit?: number
  ): Promise<readonly WorkflowTaskEventSummary[]> {
    const task = await this.findById(accountId, taskId);
    if (!task) return [];
    return (this.#events.get(taskId) ?? []).slice(0, boundedEventLimit(limit)).map(cloneEvent);
  }

  public async save(task: WorkflowTaskSummary, event: WorkflowTaskTransitionEvent): Promise<void> {
    const current = this.#tasks.get(task.id);
    if (!current || current.accountId !== task.accountId) {
      throw new NotFoundError('Workflow task not found', { taskId: task.id });
    }
    if (task.revision !== current.revision + 1) {
      throw new ConflictError('Workflow task revision mismatch', { taskId: task.id });
    }
    this.#tasks.set(task.id, cloneTask(task));
    this.#events.get(task.id)?.push(toEvent(task, event));
  }

  public async claimDue(input: {
    readonly accountId: AccountId;
    readonly workerId: string;
    readonly actorUserId?: UserId;
    readonly correlationId: CorrelationId;
    readonly now: string;
    readonly limit: number;
    readonly leaseMs: number;
  }): Promise<readonly WorkflowTaskClaim[]> {
    const now = Date.parse(input.now);
    const claims: WorkflowTaskClaim[] = [];
    for (const task of [...this.#tasks.values()].sort((a, b) => a.dueAt.localeCompare(b.dueAt))) {
      const leaseExpired =
        task.status === 'processing' &&
        (!task.leaseExpiresAt || Date.parse(task.leaseExpiresAt) <= now);
      if (task.accountId === input.accountId && leaseExpired && task.attempts >= task.maxAttempts) {
        const deadLettered: WorkflowTaskSummary = {
          ...task,
          status: 'dlq',
          lastError:
            task.lastError ?? 'Lease expired after the maximum attempt budget was exhausted',
          leaseOwner: undefined,
          leaseToken: undefined,
          leaseExpiresAt: undefined,
          revision: task.revision + 1,
          updatedAt: input.now
        };
        this.#tasks.set(task.id, deadLettered);
        this.#events.get(task.id)?.push(
          toEvent(deadLettered, {
            eventType: 'dead_lettered',
            schemaVersion: WORKFLOW_TASK_EVENT_SCHEMA_VERSION,
            source: WORKFLOW_TASK_EVENT_SOURCE,
            actorUserId: input.actorUserId,
            correlationId: input.correlationId,
            occurredAt: input.now,
            payload: { reason: 'lease_expired', attempt: task.attempts }
          })
        );
        continue;
      }
      const eligible =
        (task.status === 'pending' || task.status === 'retrying' || leaseExpired) &&
        task.executionMode === 'worker' &&
        Date.parse(task.nextAttemptAt) <= now &&
        task.attempts < task.maxAttempts;
      if (task.accountId !== input.accountId || !eligible || claims.length >= input.limit) continue;
      const leaseToken = randomUUID();
      const leaseExpiresAt = new Date(now + input.leaseMs).toISOString();
      const claimed: WorkflowTaskSummary = {
        ...task,
        status: 'processing',
        attempts: task.attempts + 1,
        leaseOwner: input.workerId,
        leaseToken,
        leaseVersion: task.leaseVersion + 1,
        revision: task.revision + 1,
        leaseExpiresAt,
        lastAttemptAt: input.now,
        updatedAt: input.now
      };
      this.#tasks.set(task.id, claimed);
      this.#events.get(task.id)?.push(
        toEvent(claimed, {
          eventType: 'claimed',
          schemaVersion: WORKFLOW_TASK_EVENT_SCHEMA_VERSION,
          source: WORKFLOW_TASK_EVENT_SOURCE,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          occurredAt: input.now,
          payload: { workerId: input.workerId, attempt: claimed.attempts }
        })
      );
      claims.push({
        task: cloneTask(claimed),
        leaseOwner: input.workerId,
        leaseToken,
        leaseVersion: claimed.leaseVersion,
        leaseExpiresAt
      });
    }
    return claims;
  }

  public async renewClaim(
    claim: WorkflowTaskClaim,
    now: string,
    leaseMs: number
  ): Promise<WorkflowTaskClaim | null> {
    const current = this.#tasks.get(claim.task.id);
    if (!claimMatches(current, claim, now)) return null;
    const leaseExpiresAt = new Date(Date.parse(now) + leaseMs).toISOString();
    const renewed: WorkflowTaskSummary = {
      ...current,
      leaseExpiresAt,
      revision: current.revision + 1,
      updatedAt: now
    };
    this.#tasks.set(renewed.id, renewed);
    return {
      task: cloneTask(renewed),
      leaseOwner: claim.leaseOwner,
      leaseToken: claim.leaseToken,
      leaseVersion: claim.leaseVersion,
      leaseExpiresAt
    };
  }

  public async completeClaim(
    claim: WorkflowTaskClaim,
    event: WorkflowTaskTransitionEvent
  ): Promise<boolean> {
    const current = this.#tasks.get(claim.task.id);
    if (!claimMatches(current, claim, event.occurredAt)) return false;
    const completed: WorkflowTaskSummary = {
      ...current,
      status: 'completed',
      completedByUserId: event.actorUserId,
      completedAt: event.occurredAt,
      leaseOwner: undefined,
      leaseToken: undefined,
      leaseExpiresAt: undefined,
      revision: current.revision + 1,
      updatedAt: event.occurredAt
    };
    await this.save(completed, event);
    return true;
  }

  public async retryClaim(
    claim: WorkflowTaskClaim,
    nextAttemptAt: string,
    error: string,
    event: WorkflowTaskTransitionEvent
  ): Promise<boolean> {
    const current = this.#tasks.get(claim.task.id);
    if (!claimMatches(current, claim, event.occurredAt)) return false;
    await this.save(
      {
        ...current,
        status: 'retrying',
        nextAttemptAt,
        lastError: error,
        leaseOwner: undefined,
        leaseToken: undefined,
        leaseExpiresAt: undefined,
        revision: current.revision + 1,
        updatedAt: event.occurredAt
      },
      event
    );
    return true;
  }

  public async moveToDeadLetter(
    claim: WorkflowTaskClaim,
    error: string,
    event: WorkflowTaskTransitionEvent
  ): Promise<boolean> {
    const current = this.#tasks.get(claim.task.id);
    if (!claimMatches(current, claim, event.occurredAt)) return false;
    await this.save(
      {
        ...current,
        status: 'dlq',
        lastError: error,
        leaseOwner: undefined,
        leaseToken: undefined,
        leaseExpiresAt: undefined,
        revision: current.revision + 1,
        updatedAt: event.occurredAt
      },
      event
    );
    return true;
  }

  public async replay(
    accountId: AccountId,
    taskId: WorkflowTaskId,
    event: WorkflowTaskTransitionEvent
  ): Promise<WorkflowTaskSummary> {
    const current = await this.findById(accountId, taskId);
    if (!current) throw new NotFoundError('Workflow task not found', { taskId });
    if (current.status !== 'dlq')
      throw new ConflictError('Only dead-lettered workflow tasks can be replayed');
    const replayed: WorkflowTaskSummary = {
      ...current,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: event.occurredAt,
      lastError: undefined,
      leaseOwner: undefined,
      leaseToken: undefined,
      leaseExpiresAt: undefined,
      revision: current.revision + 1,
      updatedAt: event.occurredAt
    };
    await this.save(replayed, event);
    return replayed;
  }
}

type DbRow = Record<string, unknown>;

function asIso(value: unknown): string | undefined {
  return value ? new Date(value as string | Date).toISOString() : undefined;
}

function mapRow(row: DbRow): WorkflowTaskSummary {
  return {
    id: row.id as WorkflowTaskId,
    accountId: row.account_id as AccountId,
    taskType: row.task_type as string,
    status: row.status as WorkflowTaskStatus,
    executionMode: row.execution_mode === 'worker' ? 'worker' : 'manual',
    priority: row.priority as WorkflowTaskSummary['priority'],
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    patientId: (row.patient_id as PatientId | null) ?? undefined,
    encounterId: (row.encounter_id as EncounterId | null) ?? undefined,
    ownerType: (row.owner_type as WorkflowTaskSummary['ownerType'] | null) ?? undefined,
    ownerId: (row.owner_id as string | null) ?? undefined,
    dueAt: new Date(row.due_at as string | Date).toISOString(),
    idempotencyKey: row.idempotency_key as string,
    fingerprint: row.fingerprint as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.max_attempts ?? 5),
    nextAttemptAt: new Date(row.next_attempt_at as string | Date).toISOString(),
    leaseOwner: (row.lease_owner as string | null) ?? undefined,
    leaseToken: (row.lease_token as string | null) ?? undefined,
    leaseVersion: Number(row.lease_version ?? 0),
    revision: Number(row.revision ?? 0),
    leaseExpiresAt: asIso(row.lease_expires_at),
    lastAttemptAt: asIso(row.last_attempt_at),
    lastError: (row.last_error as string | null) ?? undefined,
    acknowledgedByUserId: (row.acknowledged_by_user_id as UserId | null) ?? undefined,
    acknowledgedAt: asIso(row.acknowledged_at),
    completedByUserId: (row.completed_by_user_id as UserId | null) ?? undefined,
    completedAt: asIso(row.completed_at),
    cancelledByUserId: (row.cancelled_by_user_id as UserId | null) ?? undefined,
    cancelledAt: asIso(row.cancelled_at),
    cancellationReason: (row.cancellation_reason as string | null) ?? undefined,
    escalationLevel: Number(row.escalation_level ?? 0),
    lastEscalatedAt: asIso(row.last_escalated_at),
    correlationId: row.correlation_id as CorrelationId,
    causationId: (row.causation_id as string | null) ?? undefined,
    createdByUserId: (row.created_by_user_id as UserId | null) ?? undefined,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

function eventValues(task: WorkflowTaskSummary, event: WorkflowTaskTransitionEvent): unknown[] {
  return [
    randomUUID(),
    task.accountId,
    task.id,
    event.eventType,
    event.actorUserId ?? null,
    event.correlationId,
    event.causationId ?? null,
    JSON.stringify(event.payload ?? {}),
    new Date(event.occurredAt),
    event.schemaVersion,
    event.source
  ];
}

export class DatabaseWorkflowTaskRepository implements WorkflowTaskRepository {
  readonly #pool: Parameters<typeof withTenantQueryExplicit>[0] | undefined;

  public constructor(pool?: Parameters<typeof withTenantQueryExplicit>[0]) {
    this.#pool = pool;
  }

  private pool(): Parameters<typeof withTenantQueryExplicit>[0] {
    return this.#pool ?? getPool();
  }

  public async createOrGet(
    task: WorkflowTaskSummary,
    event: WorkflowTaskTransitionEvent
  ): Promise<{ readonly task: WorkflowTaskSummary; readonly created: boolean }> {
    return withTenantQueryExplicit(this.pool(), task.accountId, async (client) => {
      const inserted = await client.query(
        `INSERT INTO clinical_workflow_tasks (
          id, account_id, task_type, status, execution_mode, priority, title, description, patient_id,
          encounter_id, owner_type, owner_id, due_at, idempotency_key, fingerprint,
          metadata, attempts, max_attempts, next_attempt_at, correlation_id, causation_id,
          created_by_user_id, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
        ON CONFLICT (account_id, idempotency_key) DO NOTHING RETURNING *`,
        [
          task.id,
          task.accountId,
          task.taskType,
          task.status,
          task.executionMode,
          task.priority,
          task.title,
          task.description ?? null,
          task.patientId ?? null,
          task.encounterId ?? null,
          task.ownerType ?? null,
          task.ownerId ?? null,
          new Date(task.dueAt),
          task.idempotencyKey,
          task.fingerprint,
          JSON.stringify(task.metadata),
          task.attempts,
          task.maxAttempts,
          new Date(task.nextAttemptAt),
          task.correlationId,
          task.causationId ?? null,
          task.createdByUserId ?? null,
          new Date(task.createdAt),
          new Date(task.updatedAt)
        ]
      );
      if (inserted.rows.length > 0) {
        await client.query(
          `INSERT INTO clinical_workflow_task_events (id, account_id, task_id, event_type, actor_user_id, correlation_id, causation_id, payload, occurred_at, schema_version, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          eventValues(task, event)
        );
        return { task: mapRow(inserted.rows[0]), created: true };
      }
      const existing = await client.query(
        'SELECT * FROM clinical_workflow_tasks WHERE account_id = $1 AND idempotency_key = $2 LIMIT 1',
        [task.accountId, task.idempotencyKey]
      );
      if (existing.rows.length === 0)
        throw new NotFoundError('Workflow task could not be recovered after idempotent insert');
      const recovered = mapRow(existing.rows[0]);
      if (recovered.fingerprint !== task.fingerprint)
        throw new ConflictError(
          'Workflow task idempotency key was reused with a different payload'
        );
      return { task: recovered, created: false };
    });
  }

  public async findById(
    accountId: AccountId,
    taskId: WorkflowTaskId
  ): Promise<WorkflowTaskSummary | null> {
    return withTenantQueryExplicit(this.pool(), accountId, async (client) => {
      const result = await client.query(
        'SELECT * FROM clinical_workflow_tasks WHERE account_id = $1 AND id = $2 LIMIT 1',
        [accountId, taskId]
      );
      return result.rows[0] ? mapRow(result.rows[0]) : null;
    });
  }

  public async findByIdempotencyKey(
    accountId: AccountId,
    idempotencyKey: string
  ): Promise<WorkflowTaskSummary | null> {
    return withTenantQueryExplicit(this.pool(), accountId, async (client) => {
      const result = await client.query(
        'SELECT * FROM clinical_workflow_tasks WHERE account_id = $1 AND idempotency_key = $2 LIMIT 1',
        [accountId, idempotencyKey]
      );
      return result.rows[0] ? mapRow(result.rows[0]) : null;
    });
  }

  public async list(
    accountId: AccountId,
    filters: WorkflowTaskListFilters = {}
  ): Promise<readonly WorkflowTaskSummary[]> {
    return withTenantQueryExplicit(this.pool(), accountId, async (client) => {
      const params: unknown[] = [accountId];
      const conditions = ['account_id = $1'];
      const add = (condition: string, value: unknown) => {
        params.push(value);
        conditions.push(condition.replace('?', `$${params.length}`));
      };
      if (filters.status) add('status = ?', filters.status);
      if (filters.taskType) add('task_type = ?', filters.taskType);
      if (filters.patientId) add('patient_id = ?', filters.patientId);
      if (filters.encounterId) add('encounter_id = ?', filters.encounterId);
      if (filters.dueBefore) add('due_at <= ?', new Date(filters.dueBefore));
      const limit = Math.max(1, Math.min(500, filters.limit ?? 100));
      params.push(limit);
      const result = await client.query(
        `SELECT * FROM clinical_workflow_tasks WHERE ${conditions.join(' AND ')} ORDER BY due_at ASC, id ASC LIMIT $${params.length}`,
        params
      );
      return result.rows.map((row: DbRow) => mapRow(row));
    });
  }

  public async listEvents(
    accountId: AccountId,
    taskId: WorkflowTaskId,
    limit?: number
  ): Promise<readonly WorkflowTaskEventSummary[]> {
    return withTenantQueryExplicit(this.pool(), accountId, async (client) => {
      const result = await client.query(
        'SELECT * FROM clinical_workflow_task_events WHERE account_id = $1 AND task_id = $2 ORDER BY occurred_at ASC, id ASC LIMIT $3',
        [accountId, taskId, boundedEventLimit(limit)]
      );
      return result.rows.map((row: DbRow) => ({
        id: row.id as WorkflowTaskEventSummary['id'],
        accountId: row.account_id as AccountId,
        taskId: row.task_id as WorkflowTaskId,
        eventType: row.event_type as WorkflowTaskEventType,
        schemaVersion: Number(
          row.schema_version ?? WORKFLOW_TASK_EVENT_SCHEMA_VERSION
        ) as WorkflowTaskEventSummary['schemaVersion'],
        source:
          (row.source as WorkflowTaskEventSummary['source'] | null) ?? WORKFLOW_TASK_EVENT_SOURCE,
        actorUserId: (row.actor_user_id as UserId | null) ?? undefined,
        correlationId: row.correlation_id as CorrelationId,
        causationId: (row.causation_id as string | null) ?? undefined,
        payload: (row.payload as Record<string, unknown>) ?? {},
        occurredAt: new Date(row.occurred_at as string | Date).toISOString()
      }));
    });
  }

  public async save(task: WorkflowTaskSummary, event: WorkflowTaskTransitionEvent): Promise<void> {
    await withTenantQueryExplicit(this.pool(), task.accountId, async (client) => {
      const result = await client.query(
        `UPDATE clinical_workflow_tasks SET status=$3, execution_mode=$4, priority=$5, title=$6, description=$7, owner_type=$8, owner_id=$9, due_at=$10, metadata=$11, attempts=$12, max_attempts=$13, next_attempt_at=$14, lease_owner=$15, lease_token=$16, lease_version=$17, revision=$18, lease_expires_at=$19, last_attempt_at=$20, last_error=$21, acknowledged_by_user_id=$22, acknowledged_at=$23, completed_by_user_id=$24, completed_at=$25, cancelled_by_user_id=$26, cancelled_at=$27, cancellation_reason=$28, escalation_level=$29, last_escalated_at=$30, updated_at=$31, fingerprint=$33 WHERE account_id=$1 AND id=$2 AND revision=$32`,
        [
          task.accountId,
          task.id,
          task.status,
          task.executionMode,
          task.priority,
          task.title,
          task.description ?? null,
          task.ownerType ?? null,
          task.ownerId ?? null,
          new Date(task.dueAt),
          JSON.stringify(task.metadata),
          task.attempts,
          task.maxAttempts,
          new Date(task.nextAttemptAt),
          task.leaseOwner ?? null,
          task.leaseToken ?? null,
          task.leaseVersion,
          task.revision,
          task.leaseExpiresAt ? new Date(task.leaseExpiresAt) : null,
          task.lastAttemptAt ? new Date(task.lastAttemptAt) : null,
          task.lastError ?? null,
          task.acknowledgedByUserId ?? null,
          task.acknowledgedAt ? new Date(task.acknowledgedAt) : null,
          task.completedByUserId ?? null,
          task.completedAt ? new Date(task.completedAt) : null,
          task.cancelledByUserId ?? null,
          task.cancelledAt ? new Date(task.cancelledAt) : null,
          task.cancellationReason ?? null,
          task.escalationLevel,
          task.lastEscalatedAt ? new Date(task.lastEscalatedAt) : null,
          new Date(task.updatedAt),
          task.revision - 1,
          task.fingerprint
        ]
      );
      if (result.rowCount !== 1)
        throw new ConflictError('Workflow task revision mismatch', { taskId: task.id });
      await client.query(
        'INSERT INTO clinical_workflow_task_events (id, account_id, task_id, event_type, actor_user_id, correlation_id, causation_id, payload, occurred_at, schema_version, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        eventValues(task, event)
      );
    });
  }

  public async claimDue(input: {
    readonly accountId: AccountId;
    readonly workerId: string;
    readonly actorUserId?: UserId;
    readonly correlationId: CorrelationId;
    readonly now: string;
    readonly limit: number;
    readonly leaseMs: number;
  }): Promise<readonly WorkflowTaskClaim[]> {
    return withTenantQueryExplicit(this.pool(), input.accountId, async (client) => {
      const leaseExpiresAt = new Date(Date.parse(input.now) + input.leaseMs);
      const expiredFinalAttempts = await client.query(
        `UPDATE clinical_workflow_tasks
            SET status='dlq',
                last_error=COALESCE(last_error, 'Lease expired after the maximum attempt budget was exhausted'),
                lease_owner=NULL,
                lease_token=NULL,
                lease_expires_at=NULL,
                revision=revision+1,
                updated_at=$2
          WHERE account_id=$1
            AND status='processing'
            AND attempts >= max_attempts
            AND (lease_expires_at IS NULL OR lease_expires_at <= $2)
          RETURNING *`,
        [input.accountId, new Date(input.now)]
      );
      for (const row of expiredFinalAttempts.rows as DbRow[]) {
        const task = mapRow(row);
        const event: WorkflowTaskTransitionEvent = {
          eventType: 'dead_lettered',
          schemaVersion: WORKFLOW_TASK_EVENT_SCHEMA_VERSION,
          source: WORKFLOW_TASK_EVENT_SOURCE,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          occurredAt: input.now,
          payload: { reason: 'lease_expired', attempt: task.attempts }
        };
        await client.query(
          'INSERT INTO clinical_workflow_task_events (id, account_id, task_id, event_type, actor_user_id, correlation_id, causation_id, payload, occurred_at, schema_version, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
          eventValues(task, event)
        );
      }
      const result = await client.query(
        `WITH candidates AS (
          SELECT id FROM clinical_workflow_tasks
          WHERE account_id = $1 AND attempts < max_attempts AND (
            (execution_mode = 'worker' AND status IN ('pending','retrying') AND next_attempt_at <= $2)
            OR (execution_mode = 'worker' AND status = 'processing' AND (lease_expires_at IS NULL OR lease_expires_at <= $2))
          ) ORDER BY due_at ASC, id ASC FOR UPDATE SKIP LOCKED LIMIT $3
        )
        UPDATE clinical_workflow_tasks task
        SET status='processing', attempts=task.attempts+1, lease_owner=$4, lease_token=gen_random_uuid(), lease_version=task.lease_version+1, revision=task.revision+1, lease_expires_at=$5, last_attempt_at=$2, updated_at=$2
        FROM candidates WHERE task.id=candidates.id RETURNING task.*`,
        [input.accountId, new Date(input.now), input.limit, input.workerId, leaseExpiresAt]
      );
      const claims: WorkflowTaskClaim[] = [];
      for (const row of result.rows as DbRow[]) {
        const task = mapRow(row);
        const event: WorkflowTaskTransitionEvent = {
          eventType: 'claimed',
          schemaVersion: WORKFLOW_TASK_EVENT_SCHEMA_VERSION,
          source: WORKFLOW_TASK_EVENT_SOURCE,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          occurredAt: input.now,
          payload: { workerId: input.workerId, attempt: task.attempts }
        };
        await client.query(
          'INSERT INTO clinical_workflow_task_events (id, account_id, task_id, event_type, actor_user_id, correlation_id, causation_id, payload, occurred_at, schema_version, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
          eventValues(task, event)
        );
        claims.push({
          task,
          leaseOwner: input.workerId,
          leaseToken: task.leaseToken!,
          leaseVersion: task.leaseVersion,
          leaseExpiresAt: task.leaseExpiresAt!
        });
      }
      return claims;
    });
  }

  public async renewClaim(
    claim: WorkflowTaskClaim,
    now: string,
    leaseMs: number
  ): Promise<WorkflowTaskClaim | null> {
    return withTenantQueryExplicit(this.pool(), claim.task.accountId, async (client) => {
      const leaseExpiresAt = new Date(Date.parse(now) + leaseMs);
      const result = await client.query(
        `UPDATE clinical_workflow_tasks
            SET lease_expires_at=$4, revision=revision+1, updated_at=$4
          WHERE account_id=$1 AND id=$2 AND lease_token=$3 AND lease_owner=$5
            AND lease_version=$6 AND revision=$7 AND status='processing'
            AND lease_expires_at > $8
          RETURNING *`,
        [
          claim.task.accountId,
          claim.task.id,
          claim.leaseToken,
          leaseExpiresAt,
          claim.leaseOwner,
          claim.leaseVersion,
          claim.task.revision,
          new Date(now)
        ]
      );
      if (result.rows.length === 0) return null;
      const task = mapRow(result.rows[0]);
      return {
        task,
        leaseOwner: claim.leaseOwner,
        leaseToken: claim.leaseToken,
        leaseVersion: claim.leaseVersion,
        leaseExpiresAt: task.leaseExpiresAt!
      };
    });
  }

  private async updateClaim(
    claim: WorkflowTaskClaim,
    status: WorkflowTaskStatus,
    event: WorkflowTaskTransitionEvent,
    extra: { readonly nextAttemptAt?: string; readonly lastError?: string } = {}
  ): Promise<boolean> {
    return withTenantQueryExplicit(this.pool(), claim.task.accountId, async (client) => {
      const result = await client.query(
        `UPDATE clinical_workflow_tasks SET status=$4::varchar, next_attempt_at=COALESCE($5,next_attempt_at), last_error=$6, lease_owner=NULL, lease_token=NULL, lease_expires_at=NULL, revision=revision+1, completed_by_user_id=CASE WHEN $4::text='completed' THEN $8 ELSE completed_by_user_id END, completed_at=CASE WHEN $4::text='completed' THEN $9 ELSE completed_at END, updated_at=$9 WHERE account_id=$1 AND id=$2 AND lease_token=$3 AND lease_version=$7 AND lease_owner=$10 AND revision=$11 AND status='processing' AND lease_expires_at > $12`,
        [
          claim.task.accountId,
          claim.task.id,
          claim.leaseToken,
          status,
          extra.nextAttemptAt ? new Date(extra.nextAttemptAt) : null,
          extra.lastError ?? null,
          claim.leaseVersion,
          event.actorUserId ?? null,
          new Date(event.occurredAt),
          claim.leaseOwner,
          claim.task.revision,
          new Date(event.occurredAt)
        ]
      );
      if (result.rowCount !== 1) return false;
      const updated = await client.query(
        'SELECT * FROM clinical_workflow_tasks WHERE account_id=$1 AND id=$2',
        [claim.task.accountId, claim.task.id]
      );
      await client.query(
        'INSERT INTO clinical_workflow_task_events (id, account_id, task_id, event_type, actor_user_id, correlation_id, causation_id, payload, occurred_at, schema_version, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        eventValues(mapRow(updated.rows[0]), event)
      );
      return true;
    });
  }

  public completeClaim(
    claim: WorkflowTaskClaim,
    event: WorkflowTaskTransitionEvent
  ): Promise<boolean> {
    return this.updateClaim(claim, 'completed', event);
  }
  public retryClaim(
    claim: WorkflowTaskClaim,
    nextAttemptAt: string,
    error: string,
    event: WorkflowTaskTransitionEvent
  ): Promise<boolean> {
    return this.updateClaim(claim, 'retrying', event, { nextAttemptAt, lastError: error });
  }
  public moveToDeadLetter(
    claim: WorkflowTaskClaim,
    error: string,
    event: WorkflowTaskTransitionEvent
  ): Promise<boolean> {
    return this.updateClaim(claim, 'dlq', event, { lastError: error });
  }

  public async replay(
    accountId: AccountId,
    taskId: WorkflowTaskId,
    event: WorkflowTaskTransitionEvent
  ): Promise<WorkflowTaskSummary> {
    return withTenantQueryExplicit(this.pool(), accountId, async (client) => {
      const result = await client.query(
        `UPDATE clinical_workflow_tasks SET status='pending', attempts=0, next_attempt_at=$3, last_error=NULL, lease_owner=NULL, lease_token=NULL, lease_expires_at=NULL, revision=revision+1, updated_at=$3 WHERE account_id=$1 AND id=$2 AND status='dlq' RETURNING *`,
        [accountId, taskId, new Date(event.occurredAt)]
      );
      if (result.rows.length === 0)
        throw new ConflictError('Only dead-lettered workflow tasks can be replayed');
      const task = mapRow(result.rows[0]);
      await client.query(
        'INSERT INTO clinical_workflow_task_events (id, account_id, task_id, event_type, actor_user_id, correlation_id, causation_id, payload, occurred_at, schema_version, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        eventValues(task, event)
      );
      return task;
    });
  }
}

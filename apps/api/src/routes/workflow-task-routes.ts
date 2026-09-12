import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  assertWorkflowTaskWorkerPolicy,
  EMPTY_WORKFLOW_TASK_WORKER_REGISTRY,
  WorkflowTaskService,
  redactWorkflowData,
  type CreateWorkflowTaskInput,
  type WorkflowTaskId,
  type WorkflowTaskListFilters,
  type WorkflowTaskStatus,
  type WorkflowTaskSummary,
  type WorkflowTaskWorkerRegistry
} from '@cvg-his-v2/module-workflows';
import type { AuditService } from '@cvg-his-v2/module-audit';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal, AccountId, UserId } from '@cvg-his-v2/shared-types';

import { appendAudit, appendAuditAndWait } from '../helpers/audit-helper.js';
import { readJsonBody, readJsonBodyOrEmpty } from '../helpers/request-body.js';

const WORKFLOW_STATUSES: readonly WorkflowTaskStatus[] = [
  'pending',
  'processing',
  'retrying',
  'acknowledged',
  'completed',
  'cancelled',
  'dlq'
];
const WORKFLOW_OWNER_TYPES = ['sector', 'team', 'person', 'system'] as const;
const MAX_LIST_LIMIT = 200;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface WorkflowTaskRoutesHandlers {
  readonly workflowTasks: WorkflowTaskService;
  /** Production stays fail-closed until a handler and its proof are registered. */
  readonly workerTaskRegistry?: WorkflowTaskWorkerRegistry;
  readonly audit: AuditService;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('Workflow task body must be a JSON object');
  }
  return value as Record<string, unknown>;
}

function optionalString(value: unknown, field: string, maxLength = 255): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new ValidationError(`Field '${field}' must be a non-empty string of at most ${maxLength} characters`, { field });
  }
  return value.trim();
}

function requiredString(value: unknown, field: string, maxLength = 255): string {
  const parsed = optionalString(value, field, maxLength);
  if (!parsed) throw new ValidationError(`Field '${field}' is required`, { field });
  return parsed;
}

function optionalUuid(value: unknown, field: string): string | undefined {
  const parsed = optionalString(value, field, 36);
  if (parsed && !UUID_PATTERN.test(parsed)) {
    throw new ValidationError(`Field '${field}' must be a UUID`, { field });
  }
  return parsed;
}

function parseLimit(value: string | null): number {
  if (value === null || value === '') return 100;
  if (!/^\d+$/.test(value)) throw new ValidationError(`limit must be between 1 and ${MAX_LIST_LIMIT}`);
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new ValidationError(`limit must be between 1 and ${MAX_LIST_LIMIT}`);
  }
  return limit;
}

function parseStatus(value: string | null): WorkflowTaskStatus | undefined {
  if (!value) return undefined;
  if (!WORKFLOW_STATUSES.includes(value as WorkflowTaskStatus)) {
    throw new ValidationError('status is not a valid workflow task status', { status: value });
  }
  return value as WorkflowTaskStatus;
}

function parseDate(value: unknown, field: string, required = false): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ValidationError(`Field '${field}' is required`, { field });
    return undefined;
  }
  if (typeof value !== 'string' || !/T[^\s]*?(?:Z|[+-]\d{2}:?\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new ValidationError(`Field '${field}' must be an ISO timestamp with timezone`, { field });
  }
  return new Date(value).toISOString();
}

function parseCreateInput(body: Record<string, unknown>, request: IncomingMessage): CreateWorkflowTaskInput {
  const headerKey = request.headers['idempotency-key'];
  const idempotencyKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
  const metadata = body.metadata;
  if (metadata !== undefined && (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata))) {
    throw new ValidationError("Field 'metadata' must be a JSON object", { field: 'metadata' });
  }
  const ownerType = optionalString(body.ownerType, 'ownerType', 24);
  if (ownerType && !WORKFLOW_OWNER_TYPES.includes(ownerType as (typeof WORKFLOW_OWNER_TYPES)[number])) {
    throw new ValidationError('ownerType is invalid', { field: 'ownerType' });
  }
  const key = requiredString(idempotencyKey ?? body.idempotencyKey, 'idempotencyKey');
  return {
    taskType: requiredString(body.taskType, 'taskType', 80),
    title: requiredString(body.title, 'title', 255),
    description: optionalString(body.description, 'description', 4000),
    executionMode: optionalString(body.executionMode, 'executionMode', 16) as CreateWorkflowTaskInput['executionMode'],
    priority: optionalString(body.priority, 'priority', 16) as CreateWorkflowTaskInput['priority'],
    patientId: optionalUuid(body.patientId, 'patientId') as CreateWorkflowTaskInput['patientId'],
    encounterId: optionalUuid(body.encounterId, 'encounterId') as CreateWorkflowTaskInput['encounterId'],
    ownerType: ownerType as CreateWorkflowTaskInput['ownerType'],
    ownerId: optionalString(body.ownerId, 'ownerId', 160),
    dueAt: parseDate(body.dueAt, 'dueAt', true)!,
    idempotencyKey: key,
    metadata: metadata as CreateWorkflowTaskInput['metadata'],
    maxAttempts: body.maxAttempts === undefined ? undefined : Number(body.maxAttempts),
    correlationId: optionalString(body.correlationId, 'correlationId', 255) as CreateWorkflowTaskInput['correlationId'],
    causationId: optionalString(body.causationId, 'causationId', 255)
  };
}

function publicTask(task: WorkflowTaskSummary): Record<string, unknown> {
  const {
    fingerprint: _fingerprint,
    leaseOwner: _leaseOwner,
    leaseToken: _leaseToken,
    leaseVersion: _leaseVersion,
    ...safe
  } = task;
  return { ...safe, metadata: redactWorkflowData(safe.metadata) };
}

function filtersFromRequest(request: IncomingMessage): WorkflowTaskListFilters {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const dueBefore = parseDate(url.searchParams.get('dueBefore'), 'dueBefore');
  return {
    status: parseStatus(url.searchParams.get('status')),
    taskType: optionalString(url.searchParams.get('taskType'), 'taskType', 80),
    patientId: optionalUuid(url.searchParams.get('patientId'), 'patientId') as WorkflowTaskListFilters['patientId'],
    encounterId: optionalUuid(url.searchParams.get('encounterId'), 'encounterId') as WorkflowTaskListFilters['encounterId'],
    dueBefore,
    limit: parseLimit(url.searchParams.get('limit'))
  };
}

function auditMutation(
  audit: AuditService,
  principal: AuthenticatedPrincipal,
  correlationId: string,
  action: string,
  task: WorkflowTaskSummary
): Promise<void> {
  return appendAuditAndWait(audit, {
    actorId: principal.user.id,
    accountId: principal.user.accountId,
    module: 'clinical-workflows',
    action,
    entityType: 'workflow-task',
    entityId: task.id,
    payloadSummary: `Clinical workflow task ${action}: ${task.taskType}`,
    riskLevel: task.priority === 'critical' ? 'high' : 'medium',
    correlationId
  });
}

export async function handleWorkflowTaskRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: WorkflowTaskRoutesHandlers
): Promise<boolean> {
  const { workflowTasks, audit, requirePrincipal } = handlers;

  if (pathname === '/workflow-tasks' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'workflow-tasks.read');
    const items = await workflowTasks.list(principal.user.accountId as AccountId, filtersFromRequest(request));
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'clinical-workflows',
      action: 'list_tasks',
      entityType: 'workflow-task',
      entityId: 'all',
      payloadSummary: `Clinical workflow task list returned: ${items.length}`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, { items: items.map(publicTask), count: items.length });
  }

  if (pathname === '/workflow-tasks' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'workflow-tasks.manage');
    const input = parseCreateInput(asRecord(await readJsonBody(request)), request);
    assertWorkflowTaskWorkerPolicy(
      input,
      handlers.workerTaskRegistry ?? EMPTY_WORKFLOW_TASK_WORKER_REGISTRY
    );
    const task = await workflowTasks.create(
      principal.user.accountId as AccountId,
      principal.user.id as UserId,
      input
    );
    await auditMutation(audit, principal, correlationId, 'create_task', task);
    return json(response, 201, publicTask(task));
  }

  const eventsMatch = pathname.match(/^\/workflow-tasks\/([^/]+)\/events$/);
  if (eventsMatch && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'workflow-tasks.read');
    const taskId = decodeURIComponent(eventsMatch[1]!) as WorkflowTaskId;
    const task = await workflowTasks.getOrThrow(principal.user.accountId as AccountId, taskId);
    const events = await workflowTasks.events(
      principal.user.accountId as AccountId,
      taskId,
      parseLimit(new URL(request.url ?? '/', 'http://localhost').searchParams.get('limit'))
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'clinical-workflows',
      action: 'list_task_events',
      entityType: 'workflow-task',
      entityId: task.id,
      payloadSummary: `Clinical workflow task events returned: ${events.length}`,
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, {
      items: events.map((event) => ({ ...event, payload: redactWorkflowData(event.payload) })),
      count: events.length
    });
  }

  const actionMatch = pathname.match(/^\/workflow-tasks\/([^/]+)\/(acknowledge|complete|cancel|replay)$/);
  if (actionMatch && request.method === 'POST') {
    const action = actionMatch[2]!;
    const principal = await requirePrincipal(
      request,
      action === 'replay' ? 'workflow-tasks.replay' : 'workflow-tasks.manage'
    );
    const taskId = decodeURIComponent(actionMatch[1]!) as WorkflowTaskId;
    const accountId = principal.user.accountId as AccountId;
    const actorUserId = principal.user.id as UserId;
    const body = asRecord(await readJsonBodyOrEmpty(request));
    let task: WorkflowTaskSummary;
    if (action === 'acknowledge') {
      task = await workflowTasks.acknowledge(accountId, actorUserId, taskId, optionalString(body.note, 'note', 1000));
    } else if (action === 'complete') {
      task = await workflowTasks.complete(accountId, actorUserId, taskId);
    } else if (action === 'cancel') {
      task = await workflowTasks.cancel(accountId, actorUserId, taskId, requiredString(body.reason, 'reason', 1000));
    } else {
      task = await workflowTasks.replay(accountId, actorUserId, taskId);
    }
    await auditMutation(audit, principal, correlationId, `${action}_task`, task);
    return json(response, 200, publicTask(task));
  }

  const itemMatch = pathname.match(/^\/workflow-tasks\/([^/]+)$/);
  if (itemMatch && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'workflow-tasks.read');
    const task = await workflowTasks.getOrThrow(
      principal.user.accountId as AccountId,
      decodeURIComponent(itemMatch[1]!) as WorkflowTaskId
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'clinical-workflows',
      action: 'get_task',
      entityType: 'workflow-task',
      entityId: task.id,
      payloadSummary: 'Clinical workflow task returned',
      riskLevel: 'low',
      correlationId
    });
    return json(response, 200, publicTask(task));
  }

  return false;
}

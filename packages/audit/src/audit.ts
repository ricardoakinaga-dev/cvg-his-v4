import { insertAuditEvent } from '@cvg-his/db';

import { diffJson, type DiffResult, type JsonObject } from './diff.js';

export type AppendAuditInput = {
  accountId: string;
  actorUserId?: string;
  roles: string[];
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: JsonObject | null;
  afterJson?: JsonObject | null;
  reason?: string;
  requestId: string;
};

export type AppendedAudit = {
  action: string;
  entityType: string;
  entityId: string;
  requestId: string;
  diff: DiffResult;
};

type MaybeDbError = {
  code?: string;
  constraint?: string;
};

function isAuditActorUserFkError(error: unknown): error is MaybeDbError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeError = error as MaybeDbError;
  return (
    maybeError.code === '23503' &&
    maybeError.constraint === 'audit_events_actor_user_id_users_id_fk'
  );
}

function normalizeActorUserId(actorUserId: string | undefined): string | undefined {
  if (!actorUserId) {
    return undefined;
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(actorUserId) ? actorUserId : undefined;
}

export async function append(input: AppendAuditInput): Promise<AppendedAudit> {
  const accountId = input.accountId.trim();
  if (!accountId) {
    throw new Error('Audit append requires accountId.');
  }

  const beforeJson = input.beforeJson ?? null;
  const afterJson = input.afterJson ?? null;
  const actorUserId = normalizeActorUserId(input.actorUserId);

  try {
    await insertAuditEvent({
      accountId,
      actorUserId,
      actorRole: input.roles[0],
      actorRoles: input.roles,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson,
      afterJson,
      reason: input.reason,
      requestId: input.requestId
    });
  } catch (error) {
    if (!isAuditActorUserFkError(error)) {
      throw error;
    }

    await insertAuditEvent({
      accountId,
      actorUserId: undefined,
      actorRole: input.roles[0],
      actorRoles: input.roles,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson,
      afterJson,
      reason: input.reason,
      requestId: input.requestId
    });
  }

  return {
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    requestId: input.requestId,
    diff: diffJson(beforeJson, afterJson)
  };
}

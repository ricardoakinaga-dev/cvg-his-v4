import { can } from '@cvg-his/rbac';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createOwnersRepo } from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type OwnerSummaryAuditEvent = {
  id: string;
  createdAt: string;
  action: string;
  actorRole: string | null;
  reason: string | null;
  requestId: string | null;
};

type OwnerSummary = {
  owner: {
    id: string;
    fullName: string;
    document: string | null;
    email: string | null;
    phoneMain: string | null;
    phoneAlt: string | null;
    updatedAt: Date;
  };
  auditTrail: OwnerSummaryAuditEvent[];
  encounters: [];
  documents: [];
};

function ensureActor(context: RequestContext) {
  const actor = context.actor;

  if (!actor?.accountId) {
    throw new Error('Actor context is required to access owner summary.');
  }

  return actor;
}

function mapAuditRow(row: Record<string, unknown>): OwnerSummaryAuditEvent {
  const createdAtValue = row.created_at;

  return {
    id: String(row.id),
    createdAt:
      createdAtValue instanceof Date
        ? createdAtValue.toISOString()
        : new Date(String(createdAtValue)).toISOString(),
    action: String(row.action),
    actorRole: row.actor_role ? String(row.actor_role) : null,
    reason: row.reason ? String(row.reason) : null,
    requestId: row.request_id ? String(row.request_id) : null
  };
}

export async function getOwnerSummary(
  db: DbClient,
  requestContext: RequestContext,
  ownerId: string
): Promise<OwnerSummary | null> {
  const actor = ensureActor(requestContext);
  const repo = createOwnersRepo(db);
  const owner = await repo.findById(actor.accountId, ownerId);

  if (!owner) {
    return null;
  }

  const canReadAudit = can(actor, 'audit.read');
  const auditTrail = canReadAudit
    ? (
        await db.$client.query(
          `
            select id, created_at, action, actor_role, reason, request_id
            from audit_events ae
            where ae.entity_type = 'owner'
              and ae.entity_id = $1
              and ae.account_id = $2
            order by created_at desc
            limit 10
          `,
          [ownerId, actor.accountId]
        )
      ).rows.map((row) => mapAuditRow(row as Record<string, unknown>))
    : [];

  return {
    owner: {
      id: owner.id,
      fullName: owner.fullName,
      document: owner.document,
      email: owner.email,
      phoneMain: owner.phoneMain,
      phoneAlt: owner.phoneAlt,
      updatedAt: owner.updatedAt
    },
    auditTrail,
    encounters: [],
    documents: []
  };
}

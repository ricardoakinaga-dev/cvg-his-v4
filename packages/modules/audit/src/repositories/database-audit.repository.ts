import { eq, desc } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { auditEvents } from '@cvg-his-v2/shared-database';
import type { AccountId, AuditEventId, AuditEventSummary } from '@cvg-his-v2/shared-types';

export interface AuditRepository {
  create(event: AuditEventSummary): Promise<void>;
  list(accountId?: AccountId, limit?: number): Promise<readonly AuditEventSummary[]>;
  findById(id: AuditEventId): Promise<AuditEventSummary | null>;
}

export class DatabaseAuditRepository implements AuditRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(event: AuditEventSummary): Promise<void> {
    const actorUserId = normalizeUuid(event.actorId);
    const accountId = normalizeUuid(event.accountId);

    await this.#db.insert(auditEvents).values({
      id: event.eventId,
      accountId,
      actorUserId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: {
        module: event.module,
        payloadSummary: event.payloadSummary,
        riskLevel: event.riskLevel,
        ...(accountId ? {} : { legacyAccountId: event.accountId }),
        ...(actorUserId ? {} : { legacyActorId: event.actorId })
      },
      correlationId: event.correlationId,
      occurredAt: new Date(event.occurredAt),
      createdAt: new Date(event.occurredAt)
    });
  }

  public async list(accountId?: AccountId, limit = 100): Promise<readonly AuditEventSummary[]> {
    const rows = await this.#db
      .select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.occurredAt))
      .limit(Math.max(limit * 5, limit));

    const summaries = rows.map((row) => mapAuditRow(row));
    const filtered = accountId
      ? summaries.filter((event) => event.accountId === accountId)
      : summaries;
    return filtered.slice(0, limit);
  }

  public async listForCacheRefresh(accountId?: AccountId): Promise<readonly AuditEventSummary[]> {
    const rows = accountId
      ? await this.#db
          .select()
          .from(auditEvents)
          .where(eq(auditEvents.accountId, accountId))
          .orderBy(desc(auditEvents.occurredAt))
      : await this.#db.select().from(auditEvents).orderBy(desc(auditEvents.occurredAt));
    const summaries = rows.map((row) => mapAuditRow(row));
    return accountId ? summaries.filter((event) => event.accountId === accountId) : summaries;
  }

  public async findById(id: AuditEventId): Promise<AuditEventSummary | null> {
    const result = await this.#db.select().from(auditEvents).where(eq(auditEvents.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return mapAuditRow(result[0]);
  }
}

function normalizeUuid(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return isUuid(value) ? value : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapAuditRow(row: Record<string, unknown>): AuditEventSummary {
  const metadata = asRecord(row.metadata);
  const storedAccountId = typeof row.accountId === 'string' ? row.accountId : null;
  const storedActorId = typeof row.actorUserId === 'string' ? row.actorUserId : null;
  const legacyAccountId =
    typeof metadata?.legacyAccountId === 'string' ? metadata.legacyAccountId : null;
  const legacyActorId = typeof metadata?.legacyActorId === 'string' ? metadata.legacyActorId : null;
  const module = typeof metadata?.module === 'string' ? metadata.module : null;

  return {
    eventId: row.id as AuditEventId,
    occurredAt: new Date(row.occurredAt as string | Date).toISOString(),
    actorId: storedActorId ?? legacyActorId ?? 'system',
    accountId: (storedAccountId ?? legacyAccountId ?? 'unknown') as AccountId,
    module:
      module ??
      (typeof row.action === 'string' ? (row.action.split('_')[0] ?? 'unknown') : 'unknown'),
    action: (row.action as string | null) ?? 'unknown',
    entityType: (row.entityType as string | null) ?? 'unknown',
    entityId: (row.entityId as string | null) ?? 'unknown',
    correlationId: (row.correlationId as string | null) ?? '',
    payloadSummary: (metadata?.payloadSummary as string | undefined) ?? '',
    riskLevel: (metadata?.riskLevel as 'low' | 'medium' | 'high' | undefined) ?? 'low'
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

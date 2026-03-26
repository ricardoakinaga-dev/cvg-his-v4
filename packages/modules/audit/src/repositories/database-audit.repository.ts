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
    await this.#db.insert(auditEvents).values({
      id: event.eventId,
      accountId: event.accountId,
      actorUserId: event.actorId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: {
        payloadSummary: event.payloadSummary,
        riskLevel: event.riskLevel,
      },
      correlationId: event.correlationId,
      occurredAt: new Date(event.occurredAt),
    });
  }

  public async list(accountId?: AccountId, limit = 100): Promise<readonly AuditEventSummary[]> {
    const query = this.#db
      .select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.occurredAt))
      .limit(limit);

    if (accountId) {
      query.where(eq(auditEvents.accountId, accountId));
    }

    const result = await query;

    return result.map((row) => ({
      eventId: row.id as AuditEventId,
      occurredAt: row.occurredAt.toISOString(),
      actorId: row.actorUserId ?? 'system',
      accountId: row.accountId as AccountId,
      module: row.action.split('_')[0] ?? 'unknown',
      action: row.action,
      entityType: row.entityType ?? 'unknown',
      entityId: row.entityId ?? 'unknown',
      correlationId: row.correlationId ?? '',
      payloadSummary: (row.metadata as Record<string, unknown>)?.payloadSummary as string ?? '',
      riskLevel: ((row.metadata as Record<string, unknown>)?.riskLevel as 'low' | 'medium' | 'high') ?? 'low',
    }));
  }

  public async findById(id: AuditEventId): Promise<AuditEventSummary | null> {
    const result = await this.#db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      eventId: row.id as AuditEventId,
      occurredAt: row.occurredAt.toISOString(),
      actorId: row.actorUserId ?? 'system',
      accountId: row.accountId as AccountId,
      module: row.action.split('_')[0] ?? 'unknown',
      action: row.action,
      entityType: row.entityType ?? 'unknown',
      entityId: row.entityId ?? 'unknown',
      correlationId: row.correlationId ?? '',
      payloadSummary: (row.metadata as Record<string, unknown>)?.payloadSummary as string ?? '',
      riskLevel: ((row.metadata as Record<string, unknown>)?.riskLevel as 'low' | 'medium' | 'high') ?? 'low',
    };
  }
}

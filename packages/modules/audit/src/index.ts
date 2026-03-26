import type { AccountId, AuditEventId, AuditEventSummary } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

export interface AuditRepository {
  create(event: AuditEventSummary): Promise<void>;
  list(accountId?: AccountId, limit?: number): Promise<readonly AuditEventSummary[]>;
  findById(id: AuditEventId): Promise<AuditEventSummary | null>;
}

export interface AuditWriteInput {
  readonly actorId: string;
  readonly accountId: AccountId;
  readonly module: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly correlationId?: string;
  readonly payloadSummary: string;
  readonly riskLevel: 'low' | 'medium' | 'high';
}

export interface AuditServiceOptions {
  readonly auditRepository?: AuditRepository;
}

export class AuditService {
  readonly #events: AuditEventSummary[] = [];
  readonly #auditRepository?: AuditRepository;

  public constructor(options: AuditServiceOptions = {}) {
    this.#auditRepository = options.auditRepository;
  }

  public write(input: AuditWriteInput): AuditEventSummary {
    const event: AuditEventSummary = {
      eventId: createCorrelationId('audit') as AuditEventId,
      occurredAt: nowIso(),
      actorId: input.actorId,
      accountId: input.accountId,
      module: input.module,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      correlationId: input.correlationId ?? createCorrelationId('corr'),
      payloadSummary: input.payloadSummary,
      riskLevel: input.riskLevel
    };

    this.#events.unshift(event);

    // Persist to database if repository is available
    if (this.#auditRepository) {
      this.#auditRepository.create(event).catch((err) => {
        console.error('Failed to persist audit event to database:', err);
      });
    }

    return event;
  }

  public list(): readonly AuditEventSummary[] {
    return [...this.#events];
  }

  public seedSystemEvent(summary: string): void {
    this.write({
      actorId: 'system',
      accountId: 'acc_cvg_demo' as AccountId,
      module: 'audit',
      action: 'bootstrap',
      entityType: 'system',
      entityId: 'phase-3',
      payloadSummary: summary,
      riskLevel: 'low'
    });
  }
}

export { DatabaseAuditRepository } from './repositories/database-audit.repository.js';

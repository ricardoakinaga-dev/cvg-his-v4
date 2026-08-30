import { describe, it, expect, beforeEach } from 'vitest';
import type { AccountId, AuditEventId, AuditEventSummary } from '@cvg-his-v2/shared-types';
import {
  AuditService,
  decodeAuditCursor,
  encodeAuditCursor,
  paginateAuditEvents
} from './index.js';
import { InMemoryAuditRepository } from './repositories/in-memory-audit.repository.js';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    service = new AuditService();
  });

  it('writes an audit event and returns it', () => {
    const event = service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'owners',
      action: 'create',
      entityType: 'owner',
      entityId: 'owner_1',
      payloadSummary: 'Owner created',
      riskLevel: 'medium'
    });
    expect(event.module).toBe('owners');
    expect(event.action).toBe('create');
    expect(event.payloadSummary).toBe('Owner created');
    expect(event.riskLevel).toBe('medium');
    expect(event.eventId).toBeDefined();
    expect(event.occurredAt).toBeDefined();
  });

  it('writes event with custom correlationId', () => {
    const event = service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'billing',
      action: 'update',
      entityType: 'invoice',
      entityId: 'inv_123',
      correlationId: 'corr_abc_123',
      payloadSummary: 'Invoice updated',
      riskLevel: 'low'
    });
    expect(event.correlationId).toBe('corr_abc_123');
  });

  it('writes events with all risk levels', () => {
    const low = service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'owners',
      action: 'read',
      entityType: 'owner',
      entityId: 'owner_1',
      payloadSummary: 'Read owner',
      riskLevel: 'low'
    });
    const medium = service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'patients',
      action: 'update',
      entityType: 'patient',
      entityId: 'patient_1',
      payloadSummary: 'Update patient',
      riskLevel: 'medium'
    });
    const high = service.write({
      actorId: 'admin_1',
      accountId: 'acc_1' as AccountId,
      module: 'auth',
      action: 'delete',
      entityType: 'user',
      entityId: 'user_99',
      payloadSummary: 'Delete user',
      riskLevel: 'high'
    });
    expect(low.riskLevel).toBe('low');
    expect(medium.riskLevel).toBe('medium');
    expect(high.riskLevel).toBe('high');
  });

  it('returns most recent events first in list', () => {
    service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'module_a',
      action: 'action_a',
      entityType: 'entity',
      entityId: 'id_1',
      payloadSummary: 'First',
      riskLevel: 'low'
    });
    service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'module_b',
      action: 'action_b',
      entityType: 'entity',
      entityId: 'id_2',
      payloadSummary: 'Second',
      riskLevel: 'low'
    });
    const events = service.list();
    expect(events).toHaveLength(2);
    expect(events[0].payloadSummary).toBe('Second');
    expect(events[1].payloadSummary).toBe('First');
  });

  it('paginates audit events with an opaque stable cursor and account filtering', async () => {
    const accountId = 'acc_cursor' as AccountId;
    const otherAccountId = 'acc_other' as AccountId;
    const first = service.write({
      actorId: 'user_1',
      accountId,
      module: 'audit',
      action: 'first',
      entityType: 'audit-event',
      entityId: 'first',
      payloadSummary: 'First cursor event',
      riskLevel: 'low'
    });
    const second = service.write({
      actorId: 'user_1',
      accountId,
      module: 'audit',
      action: 'second',
      entityType: 'audit-event',
      entityId: 'second',
      payloadSummary: 'Second cursor event',
      riskLevel: 'low'
    });
    service.write({
      actorId: 'user_2',
      accountId: otherAccountId,
      module: 'audit',
      action: 'foreign',
      entityType: 'audit-event',
      entityId: 'foreign',
      payloadSummary: 'Foreign cursor event',
      riskLevel: 'low'
    });

    const firstPage = await service.listPage({ accountId, limit: 1 });

    expect(firstPage.items).toHaveLength(1);
    expect([first.eventId, second.eventId]).toContain(firstPage.items[0]?.eventId);
    expect(firstPage.nextCursor).toBeDefined();
    expect(firstPage.nextCursor).not.toContain(firstPage.items[0]?.eventId ?? '');

    const secondPage = await service.listPage({
      accountId,
      limit: 2,
      cursor: decodeAuditCursor(firstPage.nextCursor as string)
    });

    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]?.accountId).toBe(accountId);
    expect(secondPage.items[0]?.eventId).not.toBe(firstPage.items[0]?.eventId);
    expect(secondPage.nextCursor).toBeUndefined();
  });

  it('rejects malformed audit cursors', () => {
    expect(() => decodeAuditCursor('not-a-cursor')).toThrow('Invalid audit cursor');
    expect(() =>
      decodeAuditCursor(
        encodeAuditCursor({
          occurredAt: 'not-a-date',
          eventId: 'event-1' as AuditEventId
        })
      )
    ).toThrow('Invalid audit cursor');
  });

  it('uses the event id as a tie-breaker when timestamps are equal', () => {
    const accountId = 'acc_tie' as AccountId;
    const events = (['event-b', 'event-a'] as const).map((eventId) => ({
      eventId: eventId as AuditEventId,
      occurredAt: '2026-08-25T12:00:00.000Z',
      actorId: 'user-1',
      accountId,
      module: 'audit',
      action: 'read',
      entityType: 'audit-event',
      entityId: eventId,
      correlationId: `corr-${eventId}`,
      payloadSummary: eventId,
      riskLevel: 'low' as const
    }));

    const firstPage = paginateAuditEvents(events, { accountId, limit: 1 });
    const secondPage = paginateAuditEvents(events, {
      accountId,
      limit: 1,
      cursor: {
        occurredAt: firstPage.items[0]!.occurredAt,
        eventId: firstPage.items[0]!.eventId
      }
    });

    expect(firstPage.items.map((event) => event.eventId)).toEqual(['event-b']);
    expect(secondPage.items.map((event) => event.eventId)).toEqual(['event-a']);
    expect(secondPage.hasMore).toBe(false);
  });

  it('seeds system event with system actor', () => {
    service.seedSystemEvent('System started');
    const events = service.list();
    expect(events).toHaveLength(1);
    expect(events[0].payloadSummary).toBe('System started');
    expect(events[0].actorId).toBe('system');
    expect(events[0].module).toBe('audit');
    expect(events[0].action).toBe('bootstrap');
  });

  it('seeds multiple system events', () => {
    service.seedSystemEvent('System started');
    service.seedSystemEvent('Database connected');
    const events = service.list();
    expect(events).toHaveLength(2);
    expect(events[0].payloadSummary).toBe('Database connected');
  });

  it('builds an operational audit coverage report by account', async () => {
    service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'lgpd',
      action: 'personal_data_exported',
      entityType: 'owner',
      entityId: 'owner_1',
      payloadSummary: 'Personal data export generated',
      riskLevel: 'high'
    });
    service.write({
      actorId: 'user_2',
      accountId: 'acc_2' as AccountId,
      module: 'lgpd',
      action: 'personal_data_exported',
      entityType: 'owner',
      entityId: 'owner_2',
      payloadSummary: 'Personal data export generated',
      riskLevel: 'high'
    });

    const report = await service.getOperationalCoverageReport('acc_1' as AccountId, [
      {
        id: 'lgpd-export',
        module: 'lgpd',
        action: 'personal_data_exported',
        minimumRiskLevel: 'high',
        description: 'Exportacao LGPD'
      },
      {
        id: 'audit-read',
        module: 'audit',
        action: 'read',
        entityType: 'audit-event',
        minimumRiskLevel: 'high',
        description: 'Leitura de auditoria'
      }
    ]);

    expect(report.totalEvents).toBe(1);
    expect(report.eventsByModule.lgpd).toBe(1);
    expect(report.eventsByRiskLevel.high).toBe(1);
    expect(report.coveredRequirements).toBe(1);
    expect(report.missingRequirements).toBe(1);
    expect(report.coveragePercent).toBe(50);
    expect(report.requirements[0].covered).toBe(true);
    expect(report.requirements[1].covered).toBe(false);
  });

  it('includes report delivery alerts in the default operational coverage requirements', async () => {
    service.write({
      actorId: 'user_reports',
      accountId: 'acc_1' as AccountId,
      module: 'reports',
      action: 'report_schedule_delivery_alerts_read',
      entityType: 'report-schedule-delivery-alert',
      entityId: 'schedule-1',
      payloadSummary: 'Report schedule delivery alerts inspected',
      riskLevel: 'high'
    });

    const report = await service.getOperationalCoverageReport('acc_1' as AccountId);
    const requirement = report.requirements.find(
      (item) => item.id === 'reports-delivery-alerts-read'
    );

    expect(requirement).toBeDefined();
    expect(requirement?.covered).toBe(true);
    expect(requirement?.evidenceEventId).toBeDefined();
  });

  it('builds operational coverage from committed repository rows even when the hot cache is empty', async () => {
    const accountId = 'acc_committed_coverage' as AccountId;
    const repository = new InMemoryAuditRepository();
    await repository.create({
      eventId: 'evt_committed_coverage' as AuditEventId,
      occurredAt: '2026-08-29T14:00:00.000Z',
      actorId: 'user-coverage',
      accountId,
      module: 'lgpd',
      action: 'personal_data_exported',
      entityType: 'owner',
      entityId: 'owner-coverage',
      correlationId: 'corr-coverage',
      payloadSummary: 'Committed coverage evidence',
      riskLevel: 'high'
    });

    const freshService = new AuditService({ auditRepository: repository });
    const report = await freshService.getOperationalCoverageReport(accountId, [
      {
        id: 'lgpd-export',
        module: 'lgpd',
        action: 'personal_data_exported',
        minimumRiskLevel: 'high',
        description: 'Exportacao LGPD'
      }
    ]);

    expect(report.totalEvents).toBe(1);
    expect(report.coveredRequirements).toBe(1);
    expect(report.requirements[0]?.evidenceEventId).toBe('evt_committed_coverage');
  });

  it('excludes cache-only events and reads the complete committed snapshot beyond 100 rows', async () => {
    const accountId = 'acc_complete_coverage' as AccountId;
    const repository = new InMemoryAuditRepository();
    const serviceWithStaleCache = new AuditService({ auditRepository: repository });
    serviceWithStaleCache.write({
      actorId: 'user-stale',
      accountId,
      module: 'audit',
      action: 'stale_cache_only',
      entityType: 'audit-event',
      entityId: 'stale-cache-only',
      payloadSummary: 'Must not be measured',
      riskLevel: 'low'
    });
    await serviceWithStaleCache.waitForPersistence();
    repository.clear();

    for (let index = 0; index < 101; index += 1) {
      await repository.create({
        eventId: `evt_complete_${index}` as AuditEventId,
        occurredAt: new Date(Date.UTC(2026, 7, 29, 14, 0, index)).toISOString(),
        actorId: 'user-complete',
        accountId,
        module: 'audit',
        action: `committed_${index}`,
        entityType: 'audit-event',
        entityId: `committed-${index}`,
        correlationId: `corr-complete-${index}`,
        payloadSummary: 'Committed complete snapshot event',
        riskLevel: 'low'
      });
    }

    const report = await serviceWithStaleCache.getOperationalCoverageReport(accountId, []);

    expect(report.totalEvents).toBe(101);
    expect(report.eventsByModule.audit).toBe(101);
    expect(report.requirements).toEqual([]);
  });

  it('fails closed when a configured repository cannot provide operational coverage', async () => {
    const unavailableRepository = {
      async create(): Promise<void> {},
      async list(): Promise<readonly AuditEventSummary[]> {
        return [];
      },
      async listForCacheRefresh(): Promise<readonly AuditEventSummary[]> {
        throw new Error('audit-store-down');
      },
      async findById(): Promise<AuditEventSummary | null> {
        return null;
      }
    };
    const serviceWithUnavailableRepository = new AuditService({
      auditRepository: unavailableRepository
    });

    await expect(
      serviceWithUnavailableRepository.getOperationalCoverageReport('acc_unavailable' as AccountId)
    ).rejects.toMatchObject({
      name: 'AuditCoverageUnavailableError',
      code: 'AUDIT_COVERAGE_UNAVAILABLE'
    });
  });
});

describe('AuditService with repository', () => {
  let repo: InMemoryAuditRepository;
  let service: AuditService;

  beforeEach(() => {
    repo = new InMemoryAuditRepository();
    service = new AuditService({ auditRepository: repo });
  });

  it('writes event and persists to repository asynchronously', async () => {
    const event = service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'patients',
      action: 'create',
      entityType: 'patient',
      entityId: 'patient_1',
      payloadSummary: 'Patient created',
      riskLevel: 'low'
    });
    await new Promise((r) => setTimeout(r, 10));
    const fromRepo = await repo.list();
    expect(fromRepo).toHaveLength(1);
    expect(fromRepo[0].eventId).toBe(event.eventId);
    expect(fromRepo[0].payloadSummary).toBe('Patient created');
  });

  it('persists multiple events to repository', async () => {
    service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'module_a',
      action: 'create',
      entityType: 'entity',
      entityId: 'id_1',
      payloadSummary: 'Event 1',
      riskLevel: 'low'
    });
    service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'module_b',
      action: 'update',
      entityType: 'entity',
      entityId: 'id_2',
      payloadSummary: 'Event 2',
      riskLevel: 'medium'
    });
    await new Promise((r) => setTimeout(r, 10));
    const fromRepo = await repo.list();
    expect(fromRepo).toHaveLength(2);
  });

  it('removes a failed synchronous audit write from the hot cache', async () => {
    const failingRepository = {
      async create(): Promise<void> {
        throw new Error('audit-store-down');
      },
      async list(): Promise<readonly AuditEventSummary[]> {
        return [];
      },
      async findById(): Promise<AuditEventSummary | null> {
        return null;
      }
    };
    const failingService = new AuditService({ auditRepository: failingRepository });

    await expect(
      failingService.writeAndWait({
        actorId: 'user_1',
        accountId: 'acc_1' as AccountId,
        module: 'access-control',
        action: 'permission_granted',
        entityType: 'access-permission-assignment',
        entityId: 'team-1',
        payloadSummary: 'Permission assignment changed',
        riskLevel: 'high'
      })
    ).rejects.toThrow('audit-store-down');

    expect(failingService.list()).toEqual([]);
  });

  it('does not let a previous persistence failure poison the next synchronous write', async () => {
    let attempts = 0;
    const persisted: AuditEventSummary[] = [];
    const repository = {
      async create(event: AuditEventSummary): Promise<void> {
        attempts += 1;
        if (attempts === 1) throw new Error('first-audit-store-down');
        persisted.push(event);
      },
      async list(): Promise<readonly AuditEventSummary[]> {
        return persisted;
      },
      async findById(): Promise<AuditEventSummary | null> {
        return null;
      }
    };
    const auditService = new AuditService({ auditRepository: repository });

    await expect(
      auditService.writeAndWait({
        actorId: 'user_1',
        accountId: 'acc_1' as AccountId,
        module: 'counter-sales',
        action: 'cancelled',
        entityType: 'counter-sale',
        entityId: 'sale-1',
        payloadSummary: 'First cancellation',
        riskLevel: 'high'
      })
    ).rejects.toThrow('first-audit-store-down');

    const second = await auditService.writeAndWait({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'counter-sales',
      action: 'cancelled',
      entityType: 'counter-sale',
      entityId: 'sale-2',
      payloadSummary: 'Second cancellation',
      riskLevel: 'high'
    });

    expect(persisted.map((event) => event.eventId)).toEqual([second.eventId]);
    expect(auditService.list().map((event) => event.eventId)).toEqual([second.eventId]);
  });

  it('does not let a failed legacy bootstrap seed poison the first tenant write', async () => {
    let attempts = 0;
    const persisted: AuditEventSummary[] = [];
    const repository = {
      async create(event: AuditEventSummary): Promise<void> {
        attempts += 1;
        if (event.action === 'bootstrap') {
          throw new Error('legacy-bootstrap-is-read-only');
        }
        persisted.push(event);
      },
      async list(): Promise<readonly AuditEventSummary[]> {
        return persisted;
      },
      async findById(): Promise<AuditEventSummary | null> {
        return null;
      }
    };
    const auditService = new AuditService({ auditRepository: repository });

    auditService.seedSystemEvent('System started');
    await expect(auditService.waitForPersistence()).resolves.toBeUndefined();

    const tenantEvent = await auditService.writeAndWait({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'inpatient',
      action: 'admit',
      entityType: 'inpatient-stay',
      entityId: 'stay-1',
      payloadSummary: 'Patient admitted',
      riskLevel: 'high'
    });

    expect(attempts).toBe(2);
    expect(persisted).toEqual([tenantEvent]);
    expect(auditService.list()).toEqual([tenantEvent]);
  });

  it('rebuilds one account cache from committed rows after a rollback', async () => {
    const committed: AuditEventSummary = {
      eventId: 'evt_committed' as AuditEventId,
      occurredAt: new Date().toISOString(),
      actorId: 'user_rollback',
      accountId: 'acc_rollback' as AccountId,
      module: 'inpatient',
      action: 'bill_daily_charge',
      entityType: 'inpatient-daily-charge',
      entityId: 'charge_committed',
      correlationId: 'corr_committed',
      payloadSummary: 'Committed event',
      riskLevel: 'high'
    };
    const repository = {
      async create(): Promise<void> {},
      async list(accountId?: AccountId): Promise<readonly AuditEventSummary[]> {
        return accountId === committed.accountId ? [committed] : [];
      },
      async findById(): Promise<AuditEventSummary | null> {
        return null;
      }
    };
    const rollbackService = new AuditService({ auditRepository: repository });

    rollbackService.write({
      actorId: 'user_rollback',
      accountId: committed.accountId,
      module: 'inpatient',
      action: 'bill_daily_charge',
      entityType: 'inpatient-daily-charge',
      entityId: 'charge_rolled_back',
      payloadSummary: 'Rolled-back event',
      riskLevel: 'high'
    });
    rollbackService.write({
      actorId: 'user_other',
      accountId: 'acc_other' as AccountId,
      module: 'owners',
      action: 'create',
      entityType: 'owner',
      entityId: 'owner_other',
      payloadSummary: 'Other account event',
      riskLevel: 'low'
    });

    await rollbackService.refreshFromDatabase(committed.accountId);

    expect(rollbackService.list()).toEqual(
      expect.arrayContaining([
        committed,
        expect.objectContaining({ accountId: 'acc_other', entityId: 'owner_other' })
      ])
    );
    expect(rollbackService.list()).toHaveLength(2);
    expect(rollbackService.list().some((event) => event.entityId === 'charge_rolled_back')).toBe(
      false
    );
  });

  it('preserves all committed events when refreshing beyond the repository default page', async () => {
    const accountId = 'acc_rollback_page' as AccountId;
    for (let index = 0; index < 101; index += 1) {
      service.write({
        actorId: 'user_rollback',
        accountId,
        module: 'audit',
        action: `committed_${index}`,
        entityType: 'audit-event',
        entityId: `committed_${index}`,
        payloadSummary: `Committed ${index}`,
        riskLevel: 'low'
      });
    }
    await service.waitForPersistence();

    service.write({
      actorId: 'user_rollback',
      accountId,
      module: 'inpatient',
      action: 'bill_daily_charge',
      entityType: 'inpatient-daily-charge',
      entityId: 'rolled_back_charge',
      payloadSummary: 'Rolled-back event',
      riskLevel: 'high'
    });
    await service.refreshFromDatabase(accountId);

    const accountEvents = service.list().filter((event) => event.accountId === accountId);
    expect(accountEvents).toHaveLength(101);
    expect(accountEvents.some((event) => event.entityId === 'rolled_back_charge')).toBe(false);
  });
});

describe('InMemoryAuditRepository', () => {
  let repo: InMemoryAuditRepository;

  beforeEach(() => {
    repo = new InMemoryAuditRepository();
  });

  async function createEvent(
    overrides?: Partial<{
      eventId: string;
      accountId: string;
      actorId: string;
      module: string;
      action: string;
      entityType: string;
      entityId: string;
      payloadSummary: string;
      riskLevel: 'low' | 'medium' | 'high';
    }>
  ) {
    const event = {
      eventId: `evt_${Math.random().toString(36).slice(2)}` as AuditEventId,
      occurredAt: new Date().toISOString(),
      actorId: overrides?.actorId ?? 'user_1',
      accountId: (overrides?.accountId ?? 'acc_1') as AccountId,
      module: overrides?.module ?? 'test',
      action: overrides?.action ?? 'create',
      entityType: overrides?.entityType ?? 'entity',
      entityId: overrides?.entityId ?? 'entity_1',
      correlationId: 'corr_test',
      payloadSummary: overrides?.payloadSummary ?? 'Test event',
      riskLevel: overrides?.riskLevel ?? 'low'
    };
    await repo.create(event);
    return event;
  }

  it('creates and retrieves an event', async () => {
    const created = await createEvent();
    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0].eventId).toBe(created.eventId);
  });

  it('lists events filtered by accountId', async () => {
    await createEvent({ accountId: 'acc_1' });
    await createEvent({ accountId: 'acc_1' });
    await createEvent({ accountId: 'acc_2' });

    const acc1Events = await repo.list('acc_1' as AccountId);
    const acc2Events = await repo.list('acc_2' as AccountId);

    expect(acc1Events).toHaveLength(2);
    expect(acc2Events).toHaveLength(1);
  });

  it('limits results with limit parameter', async () => {
    await createEvent({ payloadSummary: 'Event 1' });
    await createEvent({ payloadSummary: 'Event 2' });
    await createEvent({ payloadSummary: 'Event 3' });
    await createEvent({ payloadSummary: 'Event 4' });

    const limited = await repo.list(undefined, 2);
    expect(limited).toHaveLength(2);
  });

  it('combines accountId filter with limit', async () => {
    await createEvent({ accountId: 'acc_1', payloadSummary: 'acc1_ev1' });
    await createEvent({ accountId: 'acc_1', payloadSummary: 'acc1_ev2' });
    await createEvent({ accountId: 'acc_1', payloadSummary: 'acc1_ev3' });
    await createEvent({ accountId: 'acc_2', payloadSummary: 'acc2_ev1' });

    const result = await repo.list('acc_1' as AccountId, 2);
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.accountId === 'acc_1')).toBe(true);
  });

  it('finds event by id', async () => {
    const created = await createEvent({ payloadSummary: 'Find me' });
    const found = await repo.findById(created.eventId);
    expect(found).not.toBeNull();
    expect(found?.payloadSummary).toBe('Find me');
  });

  it('returns null for non-existent event id', async () => {
    const found = await repo.findById('nonexistent_id' as AuditEventId);
    expect(found).toBeNull();
  });

  it('clear removes all events', async () => {
    await createEvent();
    await createEvent();
    repo.clear();
    const all = await repo.list();
    expect(all).toHaveLength(0);
  });

  it('getAll returns all events without limit', async () => {
    await createEvent({ payloadSummary: 'A' });
    await createEvent({ payloadSummary: 'B' });
    await createEvent({ payloadSummary: 'C' });
    const all = repo.getAll();
    expect(all).toHaveLength(3);
  });
});

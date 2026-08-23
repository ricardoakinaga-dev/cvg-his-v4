import { describe, it, expect, beforeEach } from 'vitest';
import type { AccountId, AuditEventId, AuditEventSummary } from '@cvg-his-v2/shared-types';
import { AuditService } from './index.js';
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

  it('builds an operational audit coverage report by account', () => {
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

    const report = service.getOperationalCoverageReport('acc_1' as AccountId, [
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

  it('includes report delivery alerts in the default operational coverage requirements', () => {
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

    const report = service.getOperationalCoverageReport('acc_1' as AccountId);
    const requirement = report.requirements.find(
      (item) => item.id === 'reports-delivery-alerts-read'
    );

    expect(requirement).toBeDefined();
    expect(requirement?.covered).toBe(true);
    expect(requirement?.evidenceEventId).toBeDefined();
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

    expect(rollbackService.list()).toEqual([
      committed,
      expect.objectContaining({ accountId: 'acc_other', entityId: 'owner_other' })
    ]);
    expect(rollbackService.list().some((event) => event.entityId === 'charge_rolled_back')).toBe(
      false
    );
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

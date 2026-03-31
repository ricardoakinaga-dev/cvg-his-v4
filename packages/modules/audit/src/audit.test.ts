import { describe, it, expect, beforeEach } from 'vitest';
import { AuditService } from './index.js';
import type { UserId, AccountId } from '@cvg-his-v2/shared-types';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    service = new AuditService();
  });

  it('should write an audit event', () => {
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
  });

  it('should list events', () => {
    service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'owners',
      action: 'create',
      entityType: 'owner',
      entityId: 'owner_1',
      payloadSummary: 'Created',
      riskLevel: 'low'
    });
    service.write({
      actorId: 'user_1',
      accountId: 'acc_1' as AccountId,
      module: 'patients',
      action: 'create',
      entityType: 'patient',
      entityId: 'patient_1',
      payloadSummary: 'Created',
      riskLevel: 'low'
    });
    expect(service.list().length).toBe(2);
  });

  it('should seed system event', () => {
    service.seedSystemEvent('System started');
    const events = service.list();
    expect(events.length).toBe(1);
    expect(events[0].payloadSummary).toBe('System started');
  });
});

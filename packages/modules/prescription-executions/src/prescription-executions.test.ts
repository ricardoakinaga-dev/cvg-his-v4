import { describe, it, expect, beforeEach } from 'vitest';
import { PrescriptionExecutionsService } from './index.js';
import {
  InMemoryPrescriptionExecutionRepository,
  InMemoryAdministrationEventRepository
} from './repositories/in-memory-prescription-execution.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  ClinicalEntryId,
  EncounterId,
  PatientId,
  PrescriptionExecutionId,
  UserId
} from '@cvg-his-v2/shared-types';

const ACCOUNT_ID = 'acc_test' as AccountId;
const USER_ID = 'user_test' as UserId;
const PATIENT_1 = 'pat_001' as PatientId;
const ENCOUNTER_1 = 'enc_001' as EncounterId;
const ENTRY_1 = 'entry_001' as ClinicalEntryId;

function createPayload(overrides?: Partial<Record<string, string>>) {
  return {
    clinicalEntryId: overrides?.clinicalEntryId ?? ENTRY_1,
    patientId: overrides?.patientId ?? PATIENT_1,
    encounterId: overrides?.encounterId ?? ENCOUNTER_1,
    medicationName: overrides?.medicationName ?? 'Amoxicilina',
    dosage: overrides?.dosage ?? '500mg',
    route: 'oral',
    frequency: '8/8h',
    scheduledAt: overrides?.scheduledAt ?? '2026-03-31T08:00:00.000Z'
  };
}

describe('PrescriptionExecutionsService', () => {
  let service: PrescriptionExecutionsService;

  beforeEach(() => {
    service = new PrescriptionExecutionsService({
      executionRepository: new InMemoryPrescriptionExecutionRepository(),
      eventRepository: new InMemoryAdministrationEventRepository()
    });
  });

  it('should create a prescription execution', () => {
    const execution = service.create(ACCOUNT_ID, createPayload());

    expect(execution.id).toBeDefined();
    expect(execution.medicationName).toBe('Amoxicilina');
    expect(execution.dosage).toBe('500mg');
    expect(execution.status).toBe('pending');
    expect(execution.version).toBe(1);
  });

  it('should get execution by id', () => {
    const created = service.create(ACCOUNT_ID, createPayload());
    const found = service.getById(created.id);
    expect(found.id).toBe(created.id);
  });

  it('should throw NotFoundError for non-existent id', () => {
    expect(() => service.getById('non_existent' as PrescriptionExecutionId)).toThrow(NotFoundError);
  });

  it('should list executions by encounter', () => {
    service.create(ACCOUNT_ID, createPayload());
    service.create(ACCOUNT_ID, createPayload({ medicationName: 'Dipirona', scheduledAt: '2026-03-31T12:00:00.000Z' }));

    const list = service.listByEncounter(ENCOUNTER_1);
    expect(list.length).toBe(2);
  });

  it('should list executions by patient', () => {
    service.create(ACCOUNT_ID, createPayload());
    const list = service.listByPatient(PATIENT_1);
    expect(list.length).toBe(1);
  });

  it('should execute (administer) a pending execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());

    const executed = service.execute(created.id, USER_ID, {
      status: 'administered',
      notes: 'Administered without complications',
      vitalsSnapshot: { heartRate: 120, temperature: 38.5 }
    });

    expect(executed.status).toBe('administered');
    expect(executed.administeredBy).toBe(USER_ID);
    expect(executed.administeredAt).toBeDefined();
    expect(executed.version).toBe(2);
  });

  it('should execute (not-administer) a pending execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());

    const executed = service.execute(created.id, USER_ID, {
      status: 'not-administered',
      notes: 'Patient refused medication'
    });

    expect(executed.status).toBe('not-administered');
  });

  it('should not allow executing a non-pending execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());
    service.execute(created.id, USER_ID, { status: 'administered' });

    expect(() =>
      service.execute(created.id, USER_ID, { status: 'not-administered' })
    ).toThrow(ValidationError);
  });

  it('should suspend a pending execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());

    const suspended = service.suspend(created.id, USER_ID, {
      reason: 'Patient showing adverse reaction'
    });

    expect(suspended.status).toBe('suspended');
    expect(suspended.notes).toBe('Patient showing adverse reaction');
  });

  it('should resume a suspended execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());
    const suspended = service.suspend(created.id, USER_ID, { reason: 'Hold for labs' });

    const resumed = service.resume(suspended.id, USER_ID);
    expect(resumed.status).toBe('pending');
  });

  it('should not resume a non-suspended execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());

    expect(() => service.resume(created.id, USER_ID)).toThrow(ValidationError);
  });

  it('should log administration events', () => {
    const created = service.create(ACCOUNT_ID, createPayload());

    const event = service.logEvent(created.id, USER_ID, {
      eventType: 'vitals_check',
      notes: 'BP 120/80, HR 90',
      vitalsSnapshot: { bloodPressure: '120/80', heartRate: 90 }
    });

    expect(event.eventType).toBe('vitals_check');
    expect(event.actorId).toBe(USER_ID);
    expect(event.vitalsSnapshot).toEqual({ bloodPressure: '120/80', heartRate: 90 });
  });

  it('should track events per execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());

    service.logEvent(created.id, USER_ID, { eventType: 'check_1' });
    service.logEvent(created.id, USER_ID, { eventType: 'check_2' });
    service.execute(created.id, USER_ID, { status: 'administered' });

    const events = service.getEvents(created.id);
    // create() auto-logs 1 event + logEvent x2 + execute() = 4 total
    expect(events.length).toBe(4);
  });
});

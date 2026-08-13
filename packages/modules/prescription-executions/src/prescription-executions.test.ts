import { describe, it, expect, beforeEach } from 'vitest';
import { PrescriptionExecutionsService } from './index.js';
import {
  InMemoryPrescriptionExecutionRepository,
  InMemoryAdministrationEventRepository
} from './repositories/in-memory-prescription-execution.repository.js';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  ClinicalEntryId,
  EncounterId,
  PatientId,
  PrescriptionExecutionId,
  UserId
} from '@cvg-his-v2/shared-types';

const ACCOUNT_ID = 'acc_test' as AccountId;
const FOREIGN_ACCOUNT_ID = 'acc_other' as AccountId;
const USER_ID = 'user_test' as UserId;
const PATIENT_1 = 'pat_001' as PatientId;
const ENCOUNTER_1 = 'enc_001' as EncounterId;
const ENTRY_1 = 'entry_001' as ClinicalEntryId;

class FailingCreateRepository extends InMemoryPrescriptionExecutionRepository {
  override async create(): Promise<void> {
    throw new Error('database create failed');
  }
}

class FailingUpdateRepository extends InMemoryPrescriptionExecutionRepository {
  override async update(): Promise<void> {
    throw new Error('database update failed');
  }
}

class FailingEventRepository extends InMemoryAdministrationEventRepository {
  #createCalls = 0;

  override async create(
    event: Parameters<InMemoryAdministrationEventRepository['create']>[0]
  ): Promise<void> {
    this.#createCalls += 1;
    if (this.#createCalls > 1) {
      throw new Error('event persistence failed');
    }
    await super.create(event);
  }
}

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

  it('should create a prescription execution', async () => {
    const execution = await service.create(ACCOUNT_ID, createPayload());

    expect(execution.id).toBeDefined();
    expect(execution.medicationName).toBe('Amoxicilina');
    expect(execution.dosage).toBe('500mg');
    expect(execution.status).toBe('pending');
    expect(execution.version).toBe(1);
  });

  it('should get execution by id', async () => {
    const created = await service.create(ACCOUNT_ID, createPayload());
    const found = await service.getById(created.id);
    expect(found.id).toBe(created.id);
  });

  it('should reject cross-account reads and mutations before persistence', async () => {
    const created = await service.create(ACCOUNT_ID, createPayload());

    await expect(service.getById(created.id, FOREIGN_ACCOUNT_ID)).rejects.toThrow(NotFoundError);
    await expect(service.getEvents(created.id, FOREIGN_ACCOUNT_ID)).rejects.toThrow(NotFoundError);
    await expect(service.listByEncounter(ENCOUNTER_1, FOREIGN_ACCOUNT_ID)).resolves.toEqual([]);
    await expect(service.listByPatient(PATIENT_1, FOREIGN_ACCOUNT_ID)).resolves.toEqual([]);
    await expect(
      service.execute(created.id, USER_ID, { status: 'administered' }, FOREIGN_ACCOUNT_ID)
    ).rejects.toThrow(NotFoundError);
    await expect(service.suspend(created.id, USER_ID, { reason: 'cross' }, FOREIGN_ACCOUNT_ID))
      .rejects.toThrow(NotFoundError);
    await expect(service.logEvent(created.id, USER_ID, { eventType: 'cross' }, FOREIGN_ACCOUNT_ID))
      .rejects.toThrow(NotFoundError);

    expect((await service.getById(created.id, ACCOUNT_ID)).status).toBe('pending');
    expect(await service.getEvents(created.id, ACCOUNT_ID)).toHaveLength(1);
  });

  it('should throw NotFoundError for non-existent id', async () => {
    await expect(service.getById('non_existent' as PrescriptionExecutionId)).rejects.toThrow(
      NotFoundError
    );
  });

  it('should list executions by encounter', async () => {
    await service.create(ACCOUNT_ID, createPayload());
    await service.create(
      ACCOUNT_ID,
      createPayload({ medicationName: 'Dipirona', scheduledAt: '2026-03-31T12:00:00.000Z' })
    );

    const list = await service.listByEncounter(ENCOUNTER_1);
    expect(list.length).toBe(2);
  });

  it('should list executions by patient', async () => {
    await service.create(ACCOUNT_ID, createPayload());
    const list = await service.listByPatient(PATIENT_1);
    expect(list.length).toBe(1);
  });

  it('should execute (administer) a pending execution', async () => {
    const created = await service.create(ACCOUNT_ID, createPayload());

    const executed = await service.execute(created.id, USER_ID, {
      status: 'administered',
      notes: 'Administered without complications',
      vitalsSnapshot: { heartRate: 120, temperature: 38.5 }
    });

    expect(executed.status).toBe('administered');
    expect(executed.administeredBy).toBe(USER_ID);
    expect(executed.administeredAt).toBeDefined();
    expect(executed.version).toBe(2);
  });

  it('should execute (not-administer) a pending execution', async () => {
    const created = await service.create(ACCOUNT_ID, createPayload());

    const executed = await service.execute(created.id, USER_ID, {
      status: 'not-administered',
      notes: 'Patient refused medication'
    });

    expect(executed.status).toBe('not-administered');
  });

  it('should not allow executing a non-pending execution', async () => {
    const created = await service.create(ACCOUNT_ID, createPayload());
    await service.execute(created.id, USER_ID, { status: 'administered' });

    await expect(
      service.execute(created.id, USER_ID, { status: 'not-administered' })
    ).rejects.toThrow(ValidationError);
  });

  it('should suspend a pending execution', async () => {
    const created = await service.create(ACCOUNT_ID, createPayload());

    const suspended = await service.suspend(created.id, USER_ID, {
      reason: 'Patient showing adverse reaction'
    });

    expect(suspended.status).toBe('suspended');
    expect(suspended.notes).toBe('Patient showing adverse reaction');
  });

  it('should resume a suspended execution', async () => {
    const created = await service.create(ACCOUNT_ID, createPayload());
    const suspended = await service.suspend(created.id, USER_ID, { reason: 'Hold for labs' });

    const resumed = await service.resume(suspended.id, USER_ID);
    expect(resumed.status).toBe('pending');
  });

  it('should not resume a non-suspended execution', async () => {
    const created = await service.create(ACCOUNT_ID, createPayload());

    await expect(service.resume(created.id, USER_ID)).rejects.toThrow(ValidationError);
  });

  it('should log administration events', async () => {
    const created = await service.create(ACCOUNT_ID, createPayload());

    const event = await service.logEvent(created.id, USER_ID, {
      eventType: 'vitals_check',
      notes: 'BP 120/80, HR 90',
      vitalsSnapshot: { bloodPressure: '120/80', heartRate: 90 }
    });

    expect(event.eventType).toBe('vitals_check');
    expect(event.actorId).toBe(USER_ID);
    expect(event.vitalsSnapshot).toEqual({ bloodPressure: '120/80', heartRate: 90 });
  });

  it('should track events per execution', async () => {
    const created = await service.create(ACCOUNT_ID, createPayload());

    await service.logEvent(created.id, USER_ID, { eventType: 'check_1' });
    await service.logEvent(created.id, USER_ID, { eventType: 'check_2' });
    await service.execute(created.id, USER_ID, { status: 'administered' });

    const events = await service.getEvents(created.id);
    // create() auto-logs 1 event + logEvent x2 + execute() = 4 total
    expect(events.length).toBe(4);
  });

  it('fails closed and does not publish state when execution persistence fails', async () => {
    service = new PrescriptionExecutionsService({
      executionRepository: new FailingCreateRepository(),
      eventRepository: new InMemoryAdministrationEventRepository()
    });

    await expect(service.create(ACCOUNT_ID, createPayload())).rejects.toThrow(
      'database create failed'
    );
    expect(await service.list(ACCOUNT_ID)).toEqual([]);
  });

  it('fails closed and keeps the prior state when an update cannot be persisted', async () => {
    const repository = new FailingUpdateRepository();
    service = new PrescriptionExecutionsService({
      executionRepository: repository,
      eventRepository: new InMemoryAdministrationEventRepository()
    });
    const created = await service.create(ACCOUNT_ID, createPayload());

    await expect(service.execute(created.id, USER_ID, { status: 'administered' })).rejects.toThrow(
      'database update failed'
    );
    expect((await service.getById(created.id)).status).toBe('pending');
  });

  it('fails closed when an administration event cannot be persisted', async () => {
    service = new PrescriptionExecutionsService({
      executionRepository: new InMemoryPrescriptionExecutionRepository(),
      eventRepository: new FailingEventRepository()
    });
    const created = await service.create(ACCOUNT_ID, createPayload());

    await expect(
      service.logEvent(created.id, USER_ID, { eventType: 'vitals_check' })
    ).rejects.toThrow('event persistence failed');
    expect(await service.getEvents(created.id)).toHaveLength(1);
  });
});

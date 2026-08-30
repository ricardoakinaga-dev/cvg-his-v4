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
  PrescriptionExecutionSummary,
  AdministrationEventSummary,
  UserId
} from '@cvg-his-v2/shared-types';

const ACCOUNT_ID = 'acc_test' as AccountId;
const USER_ID = 'user_test' as UserId;
const PATIENT_1 = 'pat_001' as PatientId;
const ENCOUNTER_1 = 'enc_001' as EncounterId;
const ENTRY_1 = 'entry_001' as ClinicalEntryId;

function createSignedPrescriptionSource(overrides: Record<string, unknown> = {}): {
  getByIdForAccount: (accountId: AccountId, prescriptionId: ClinicalEntryId) => unknown;
} {
  return {
    getByIdForAccount: (accountId, prescriptionId) => {
      if (prescriptionId === ('missing_entry' as ClinicalEntryId)) return null;
      return {
        id: prescriptionId,
        accountId,
        patientId: PATIENT_1,
        encounterId: ENCOUNTER_1,
        medicationName: 'Amoxicilina',
        dosage: '500mg',
        route: 'oral',
        frequency: '8/8h',
        signedAt: '2026-03-30T08:00:00.000Z',
        ...overrides
      };
    }
  };
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
    service = new PrescriptionExecutionsService();
  });

  it('fails closed when a persistence-backed runtime omits its prescription source', () => {
    const eventRepository = new InMemoryAdministrationEventRepository();
    expect(
      () =>
        new PrescriptionExecutionsService({
          executionRepository: new InMemoryPrescriptionExecutionRepository(eventRepository),
          eventRepository
        })
    ).toThrow(ValidationError);
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
    service.create(
      ACCOUNT_ID,
      createPayload({ medicationName: 'Dipirona', scheduledAt: '2026-03-31T12:00:00.000Z' })
    );

    const list = service.listByEncounter(ENCOUNTER_1, ACCOUNT_ID);
    expect(list.length).toBe(2);
  });

  it('should list executions by patient', () => {
    service.create(ACCOUNT_ID, createPayload());
    const list = service.listByPatient(PATIENT_1, ACCOUNT_ID);
    expect(list.length).toBe(1);
  });

  it('should not list executions from another account for shared clinical identifiers after hydration', async () => {
    const eventRepository = new InMemoryAdministrationEventRepository();
    const executionRepository = new InMemoryPrescriptionExecutionRepository(eventRepository);
    const prescriptionSource = createSignedPrescriptionSource() as never;
    const writer = new PrescriptionExecutionsService({
      executionRepository,
      eventRepository,
      prescriptionSource
    });
    writer.create(ACCOUNT_ID, createPayload());
    writer.create('acc_other' as AccountId, createPayload());
    await writer.waitForPersistence();

    const hydrated = new PrescriptionExecutionsService({
      executionRepository,
      eventRepository,
      prescriptionSource
    });
    await hydrated.hydrateFromDatabase(ACCOUNT_ID);
    await hydrated.hydrateFromDatabase('acc_other' as AccountId);

    const encounterList = hydrated.listByEncounter(ENCOUNTER_1, ACCOUNT_ID);
    const patientList = hydrated.listByPatient(PATIENT_1, ACCOUNT_ID);

    expect(encounterList).toHaveLength(1);
    expect(encounterList[0].accountId).toBe(ACCOUNT_ID);
    expect(patientList).toHaveLength(1);
    expect(patientList[0].accountId).toBe(ACCOUNT_ID);
  });

  it('should fail closed when no account context is supplied to a filtered query', () => {
    expect(() => service.listByEncounter(ENCOUNTER_1, undefined as never)).toThrow(ValidationError);
    expect(() => service.listByPatient(PATIENT_1, undefined as never)).toThrow(ValidationError);
  });

  it('should require account context at administration-event and command boundaries', () => {
    const created = service.create(ACCOUNT_ID, createPayload());

    expect(() => service.getEvents(undefined as never, created.id)).toThrow(ValidationError);
    expect(() =>
      service.execute(undefined as never, created.id, USER_ID, { status: 'administered' })
    ).toThrow(ValidationError);
    expect(() =>
      service.suspend(undefined as never, created.id, USER_ID, { reason: 'missing scope' })
    ).toThrow(ValidationError);
    expect(() => service.resume(undefined as never, created.id, USER_ID)).toThrow(ValidationError);
    expect(() =>
      service.logEvent(undefined as never, created.id, USER_ID, { eventType: 'missing_scope' })
    ).toThrow(ValidationError);

    expect(() => service.getEvents('acc_other' as AccountId, created.id)).toThrow(NotFoundError);
    expect(() =>
      service.execute('acc_other' as AccountId, created.id, USER_ID, { status: 'administered' })
    ).toThrow(NotFoundError);
    expect(() =>
      service.suspend('acc_other' as AccountId, created.id, USER_ID, { reason: 'foreign scope' })
    ).toThrow(NotFoundError);
    expect(() => service.resume('acc_other' as AccountId, created.id, USER_ID)).toThrow(
      NotFoundError
    );
    expect(() =>
      service.logEvent('acc_other' as AccountId, created.id, USER_ID, {
        eventType: 'foreign_scope'
      })
    ).toThrow(NotFoundError);

    expect(service.getById(created.id).status).toBe('pending');
    expect(service.getEvents(ACCOUNT_ID, created.id)).toHaveLength(1);
  });

  it('should execute (administer) a pending execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());

    const executed = service.execute(ACCOUNT_ID, created.id, USER_ID, {
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

    const executed = service.execute(ACCOUNT_ID, created.id, USER_ID, {
      status: 'not-administered',
      notes: 'Patient refused medication'
    });

    expect(executed.status).toBe('not-administered');
  });

  it('should not allow executing a non-pending execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());
    service.execute(ACCOUNT_ID, created.id, USER_ID, { status: 'administered' });

    expect(() =>
      service.execute(ACCOUNT_ID, created.id, USER_ID, { status: 'not-administered' })
    ).toThrow(ValidationError);
  });

  it('should suspend a pending execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());

    const suspended = service.suspend(ACCOUNT_ID, created.id, USER_ID, {
      reason: 'Patient showing adverse reaction'
    });

    expect(suspended.status).toBe('suspended');
    expect(suspended.notes).toBe('Patient showing adverse reaction');
  });

  it('should resume a suspended execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());
    const suspended = service.suspend(ACCOUNT_ID, created.id, USER_ID, { reason: 'Hold for labs' });

    const resumed = service.resume(ACCOUNT_ID, suspended.id, USER_ID);
    expect(resumed.status).toBe('pending');
  });

  it('should not resume a non-suspended execution', () => {
    const created = service.create(ACCOUNT_ID, createPayload());

    expect(() => service.resume(ACCOUNT_ID, created.id, USER_ID)).toThrow(ValidationError);
  });

  it('should log administration events', () => {
    const created = service.create(ACCOUNT_ID, createPayload());

    const event = service.logEvent(ACCOUNT_ID, created.id, USER_ID, {
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

    service.logEvent(ACCOUNT_ID, created.id, USER_ID, { eventType: 'check_1' });
    service.logEvent(ACCOUNT_ID, created.id, USER_ID, { eventType: 'check_2' });
    service.execute(ACCOUNT_ID, created.id, USER_ID, { status: 'administered' });

    const events = service.getEvents(ACCOUNT_ID, created.id);
    // create() auto-logs 1 event + logEvent x2 + execute() = 4 total
    expect(events.length).toBe(4);
  });

  it('should reject execution creation without a signed active prescription relation', () => {
    const source = createSignedPrescriptionSource({ signedAt: undefined });
    const guardedService = new PrescriptionExecutionsService({
      prescriptionSource: source as never
    });

    expect(() => guardedService.create(ACCOUNT_ID, createPayload())).toThrow(ValidationError);
  });

  it.each([
    ['archived prescription', { deletedAt: '2026-03-30T09:00:00.000Z' }],
    ['different patient', { patientId: 'patient_other' }],
    ['different encounter', { encounterId: 'encounter_other' }],
    ['different account', { accountId: 'account_other' }],
    ['missing prescription', { clinicalEntryId: 'missing_entry' }]
  ])('should reject %s before creating an execution', (_label, overrides) => {
    const source = createSignedPrescriptionSource(overrides);
    const guardedService = new PrescriptionExecutionsService({
      prescriptionSource: source as never
    });
    const payload =
      _label === 'missing prescription'
        ? createPayload({ clinicalEntryId: 'missing_entry' })
        : createPayload();

    expect(() => guardedService.create(ACCOUNT_ID, payload)).toThrow(
      /prescription|Prescription|relation|account|patient|encounter/i
    );
  });

  it('should reject medication or dosage substitutions against the signed prescription', () => {
    const guardedService = new PrescriptionExecutionsService({
      prescriptionSource: createSignedPrescriptionSource() as never
    });

    expect(() =>
      guardedService.create(ACCOUNT_ID, createPayload({ medicationName: 'Dipirona', dosage: '1g' }))
    ).toThrow(ValidationError);
  });

  it('should reject a stale expected version before changing execution state', () => {
    const guardedService = new PrescriptionExecutionsService({
      prescriptionSource: createSignedPrescriptionSource() as never
    });
    const created = guardedService.create(ACCOUNT_ID, createPayload());

    expect(() =>
      guardedService.execute(ACCOUNT_ID, created.id, USER_ID, {
        status: 'administered',
        expectedVersion: 99
      } as never)
    ).toThrow(ConflictError);
    expect(guardedService.getById(created.id).status).toBe('pending');
  });

  it('should use compound repository writes for execution and administration event', async () => {
    const calls: string[] = [];
    const repository = {
      async create() {
        calls.push('create');
      },
      async update() {
        calls.push('update');
      },
      async createWithEvent() {
        calls.push('createWithEvent');
      },
      async updateWithEvent() {
        calls.push('updateWithEvent');
      },
      async findById() {
        return null;
      },
      async findByEncounterId() {
        return [];
      },
      async findByPatientId() {
        return [];
      },
      async findByAccountId() {
        return [];
      }
    };
    const guardedService = new PrescriptionExecutionsService({
      executionRepository: repository as never,
      prescriptionSource: createSignedPrescriptionSource() as never
    });
    const created = guardedService.create(ACCOUNT_ID, createPayload());
    await guardedService.waitForPersistence();
    guardedService.execute(ACCOUNT_ID, created.id, USER_ID, { status: 'administered' });
    await guardedService.waitForPersistence();

    expect(calls).toEqual(['createWithEvent', 'updateWithEvent']);
  });

  it('serializes in-memory CAS updates so only one concurrent writer advances', async () => {
    const eventRepository = new InMemoryAdministrationEventRepository();
    const repository = new InMemoryPrescriptionExecutionRepository(eventRepository);
    const now = '2026-03-31T08:00:00.000Z';
    const base: PrescriptionExecutionSummary = {
      id: 'pe_concurrent' as PrescriptionExecutionId,
      accountId: ACCOUNT_ID,
      clinicalEntryId: ENTRY_1,
      patientId: PATIENT_1,
      encounterId: ENCOUNTER_1,
      medicationName: 'Amoxicilina',
      dosage: '500mg',
      route: 'oral',
      frequency: '8/8h',
      scheduledAt: now,
      status: 'pending',
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    await repository.createWithEvent(base, {
      id: 'ae_concurrent_created' as AdministrationEventSummary['id'],
      executionId: base.id,
      eventType: 'created',
      actorId: USER_ID,
      occurredAt: now,
      createdAt: now
    });
    const updated = { ...base, status: 'administered' as const, version: 2 };
    const results = await Promise.allSettled([
      repository.updateWithEvent(
        updated,
        {
          id: 'ae_concurrent_a' as AdministrationEventSummary['id'],
          executionId: base.id,
          eventType: 'administered',
          actorId: USER_ID,
          occurredAt: now,
          createdAt: now
        },
        1
      ),
      repository.updateWithEvent(
        updated,
        {
          id: 'ae_concurrent_b' as AdministrationEventSummary['id'],
          executionId: base.id,
          eventType: 'administered',
          actorId: USER_ID,
          occurredAt: now,
          createdAt: now
        },
        1
      )
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(await repository.findById(base.id)).toMatchObject({
      version: 2,
      status: 'administered'
    });
    expect(await eventRepository.findByExecutionId(base.id)).toHaveLength(2);
  });

  it('rolls back an in-memory execution when its compound event write fails', async () => {
    const failingEventRepository = {
      create: async () => {
        throw new Error('event write failed');
      },
      findById: async () => null,
      deleteById: async () => undefined,
      findByExecutionId: async () => []
    } as never;
    const repository = new InMemoryPrescriptionExecutionRepository(failingEventRepository);
    const now = '2026-03-31T08:00:00.000Z';
    const execution: PrescriptionExecutionSummary = {
      id: 'pe_atomic_failure' as PrescriptionExecutionId,
      accountId: ACCOUNT_ID,
      clinicalEntryId: ENTRY_1,
      patientId: PATIENT_1,
      encounterId: ENCOUNTER_1,
      medicationName: 'Amoxicilina',
      dosage: '500mg',
      route: 'oral',
      frequency: '8/8h',
      scheduledAt: now,
      status: 'pending',
      version: 1,
      createdAt: now,
      updatedAt: now
    } as never;

    await expect(
      repository.createWithEvent(execution, {
        id: 'ae_atomic_failure' as AdministrationEventSummary['id'],
        executionId: execution.id,
        eventType: 'created',
        actorId: USER_ID,
        occurredAt: now,
        createdAt: now
      })
    ).rejects.toThrow('event write failed');
    expect(await repository.findById(execution.id)).toBeNull();
  });
});

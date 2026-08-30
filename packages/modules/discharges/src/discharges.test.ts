import { describe, it, expect, beforeEach } from 'vitest';
import { DischargesService, type DischargeRepository } from './index.js';
import { InMemoryDischargeRepository } from './repositories/in-memory-discharge.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  DischargeId,
  DischargeSummary,
  EncounterId,
  UserId
} from '@cvg-his-v2/shared-types';

const ACCOUNT_ID = 'acc_test' as AccountId;
const OTHER_ACCOUNT_ID = 'acc_other' as AccountId;
const USER_ID = 'user_test' as UserId;
const ENCOUNTER_1 = 'enc_001' as EncounterId;
const ENCOUNTER_2 = 'enc_002' as EncounterId;

describe('DischargesService', () => {
  let service: DischargesService;

  beforeEach(() => {
    service = new DischargesService({
      dischargeRepository: new InMemoryDischargeRepository()
    });
  });

  it('should create a discharge', () => {
    const discharge = service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory',
      outcome: 'Patient recovered',
      clinicalSummary: 'Full recovery after treatment'
    });

    expect(discharge.id).toBeDefined();
    expect(discharge.encounterId).toBe(ENCOUNTER_1);
    expect(discharge.dischargeType).toBe('ambulatory');
    expect(discharge.outcome).toBe('Patient recovered');
    expect(discharge.version).toBe(1);
  });

  it('should get discharge by id', () => {
    const created = service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    const found = service.getById(ACCOUNT_ID, created.id);
    expect(found.id).toBe(created.id);
  });

  it('should throw NotFoundError for non-existent id', () => {
    expect(() => service.getById(ACCOUNT_ID, 'non_existent' as DischargeId)).toThrow(NotFoundError);
  });

  it('should get discharge by encounter id', () => {
    service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    const found = service.getByEncounterId(ACCOUNT_ID, ENCOUNTER_1);
    expect(found).not.toBeNull();
    expect(found!.encounterId).toBe(ENCOUNTER_1);
  });

  it('should return null for non-existent encounter', () => {
    const found = service.getByEncounterId(ACCOUNT_ID, 'non_existent' as EncounterId);
    expect(found).toBeNull();
  });

  it('should block duplicate discharge per encounter', () => {
    service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    expect(() =>
      service.create(ACCOUNT_ID, USER_ID, {
        encounterId: ENCOUNTER_1,
        dischargeType: 'inpatient'
      })
    ).toThrow(ConflictError);
  });

  it('should scope duplicate discharge checks to the owning account', () => {
    service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    const otherAccountDischarge = service.create(OTHER_ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    expect(otherAccountDischarge.accountId).toBe(OTHER_ACCOUNT_ID);
  });

  it('should refresh one account cache from committed repository rows', async () => {
    const repository = new InMemoryDischargeRepository();
    const cachedService = new DischargesService({ dischargeRepository: repository });
    const created = cachedService.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });
    await cachedService.waitForPersistence();
    await repository.delete(ACCOUNT_ID, created.id);
    await cachedService.refreshAccount(ACCOUNT_ID);

    expect(cachedService.list(ACCOUNT_ID)).toHaveLength(0);
  });

  it('should list discharges by account', () => {
    service.create(ACCOUNT_ID, USER_ID, { encounterId: ENCOUNTER_1, dischargeType: 'ambulatory' });
    service.create(ACCOUNT_ID, USER_ID, { encounterId: ENCOUNTER_2, dischargeType: 'inpatient' });

    const list = service.list(ACCOUNT_ID);
    expect(list.length).toBe(2);
  });

  it('should update a discharge with version check', () => {
    const created = service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    const updated = service.update(
      ACCOUNT_ID,
      created.id,
      {
        outcome: 'Updated outcome',
        continuityInstructions: 'Return in 7 days'
      },
      1 // expected version
    );

    expect(updated.outcome).toBe('Updated outcome');
    expect(updated.continuityInstructions).toBe('Return in 7 days');
    expect(updated.version).toBe(2);
  });

  it('should throw ConflictError on version mismatch', () => {
    const created = service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    expect(() => service.update(ACCOUNT_ID, created.id, { outcome: 'test' }, 999)).toThrow(
      ConflictError
    );
  });

  it('requires account context for hydrated detail/update and preserves account isolation', async () => {
    const repository = new InMemoryDischargeRepository();
    const source = new DischargesService({ dischargeRepository: repository });
    const dischargeA = source.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory',
      outcome: 'A'
    });
    const dischargeB = source.create(OTHER_ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory',
      outcome: 'B'
    });
    await source.waitForPersistence();

    const hydrated = new DischargesService({ dischargeRepository: repository });
    await hydrated.hydrateFromDatabase(ACCOUNT_ID);
    await hydrated.hydrateFromDatabase(OTHER_ACCOUNT_ID);

    expect(hydrated.list(ACCOUNT_ID).map((item) => item.id)).toEqual([dischargeA.id]);
    expect(hydrated.getById(ACCOUNT_ID, dischargeA.id).outcome).toBe('A');
    expect(() => hydrated.getById(ACCOUNT_ID, dischargeB.id)).toThrow(NotFoundError);
    expect(hydrated.getByEncounterId(ACCOUNT_ID, ENCOUNTER_1)?.id).toBe(dischargeA.id);
    expect(() => hydrated.update(ACCOUNT_ID, dischargeB.id, { outcome: 'spoofed' })).toThrow(
      NotFoundError
    );

    const exposed = hydrated.getById(ACCOUNT_ID, dischargeA.id) as unknown as {
      outcome?: string;
    };
    exposed.outcome = 'mutated externally';
    expect(hydrated.getById(ACCOUNT_ID, dischargeA.id).outcome).toBe('A');

    await expect(hydrated.hydrateFromDatabase(undefined as never)).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it('scopes repository lookup and delete operations by account', async () => {
    const repository = new InMemoryDischargeRepository();
    const source = new DischargesService({ dischargeRepository: repository });
    const dischargeA = source.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });
    const dischargeB = source.create(OTHER_ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_2,
      dischargeType: 'ambulatory'
    });
    await source.waitForPersistence();

    expect((await repository.findById(ACCOUNT_ID, dischargeA.id))?.accountId).toBe(ACCOUNT_ID);
    expect(await repository.findById(ACCOUNT_ID, dischargeB.id)).toBeNull();
    expect(await repository.findByEncounterId(ACCOUNT_ID, ENCOUNTER_2)).toBeNull();

    await repository.delete(ACCOUNT_ID, dischargeB.id);
    expect((await repository.findById(OTHER_ACCOUNT_ID, dischargeB.id))?.accountId).toBe(
      OTHER_ACCOUNT_ID
    );

    await expect(
      repository.update({ ...dischargeA, accountId: OTHER_ACCOUNT_ID })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects missing account context at the repository boundary', async () => {
    const repository = new InMemoryDischargeRepository();
    const dischargeId = 'discharge_missing_context' as DischargeId;

    await expect(repository.findById(undefined as never, dischargeId)).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(
      repository.findByEncounterId(undefined as never, ENCOUNTER_1)
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(repository.findByAccountId(undefined as never)).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(repository.delete(undefined as never, dischargeId)).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it('fails closed for missing account context at every service boundary', async () => {
    const withoutRepository = new DischargesService();

    await expect(withoutRepository.hydrateFromDatabase(undefined as never)).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(withoutRepository.refreshAccount(undefined as never)).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(() => withoutRepository.getById(undefined as never, 'missing' as DischargeId)).toThrow(
      ValidationError
    );
    expect(() => withoutRepository.getByEncounterId(undefined as never, ENCOUNTER_1)).toThrow(
      ValidationError
    );
    expect(() => withoutRepository.list(undefined as never)).toThrow(ValidationError);
    expect(() =>
      withoutRepository.removeFromCache(undefined as never, 'missing' as DischargeId)
    ).toThrow(ValidationError);
    expect(() =>
      withoutRepository.create(undefined as never, USER_ID, {
        encounterId: ENCOUNTER_1,
        dischargeType: 'ambulatory'
      })
    ).toThrow(ValidationError);
    expect(() =>
      withoutRepository.update(undefined as never, 'missing' as DischargeId, {})
    ).toThrow(ValidationError);
  });

  it('restores the previous cached discharge after a failed update', async () => {
    const persisted = new Map<DischargeId, DischargeSummary>();
    const repository: DischargeRepository = {
      async create(discharge) {
        persisted.set(discharge.id, { ...discharge });
      },
      async update() {
        throw new Error('update failed');
      },
      async findById(accountId, id) {
        const discharge = persisted.get(id);
        return discharge?.accountId === accountId ? { ...discharge } : null;
      },
      async findByEncounterId(accountId, encounterId) {
        return (
          Array.from(persisted.values()).find(
            (discharge) =>
              discharge.accountId === accountId && discharge.encounterId === encounterId
          ) ?? null
        );
      },
      async findByAccountId(accountId) {
        return Array.from(persisted.values()).filter(
          (discharge) => discharge.accountId === accountId
        );
      },
      async delete(accountId, id) {
        const discharge = persisted.get(id);
        if (discharge?.accountId === accountId) persisted.delete(id);
      }
    };
    const failing = new DischargesService({ dischargeRepository: repository });
    const created = failing.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory',
      outcome: 'before failure'
    });
    await failing.waitForPersistence();

    const updated = failing.update(ACCOUNT_ID, created.id, { outcome: 'speculative update' });
    expect(updated.outcome).toBe('speculative update');
    await expect(failing.waitForPersistence()).rejects.toThrow('update failed');
    expect(failing.getById(ACCOUNT_ID, created.id).outcome).toBe('before failure');
  });

  it('continues queued persistence after a failed write', async () => {
    const persisted = new Map<DischargeId, DischargeSummary>();
    let failFirstCreate = true;
    const repository: DischargeRepository = {
      async create(discharge) {
        if (failFirstCreate) {
          failFirstCreate = false;
          throw new Error('first write failed');
        }
        persisted.set(discharge.id, { ...discharge });
      },
      async update(discharge) {
        persisted.set(discharge.id, { ...discharge });
      },
      async findById(accountId, id) {
        const discharge = persisted.get(id);
        return discharge?.accountId === accountId ? { ...discharge } : null;
      },
      async findByEncounterId(accountId, encounterId) {
        return (
          Array.from(persisted.values()).find(
            (discharge) =>
              discharge.accountId === accountId && discharge.encounterId === encounterId
          ) ?? null
        );
      },
      async findByAccountId(accountId) {
        return Array.from(persisted.values()).filter(
          (discharge) => discharge.accountId === accountId
        );
      },
      async delete(accountId, id) {
        const discharge = persisted.get(id);
        if (discharge?.accountId === accountId) persisted.delete(id);
      }
    };
    const queued = new DischargesService({ dischargeRepository: repository });

    const failed = queued.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });
    const retained = queued.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_2,
      dischargeType: 'ambulatory'
    });

    await expect(queued.waitForPersistence()).resolves.toBeUndefined();
    expect(queued.list(ACCOUNT_ID).map((discharge) => discharge.id)).toEqual([retained.id]);
    expect(persisted.has(failed.id)).toBe(false);
    expect(persisted.has(retained.id)).toBe(true);
  });
});

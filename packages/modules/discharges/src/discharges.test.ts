import { describe, it, expect, beforeEach } from 'vitest';
import { DischargesService, type DischargeRepository } from './index.js';
import { InMemoryDischargeRepository } from './repositories/in-memory-discharge.repository.js';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  DischargeId,
  EncounterId,
  UserId
} from '@cvg-his-v2/shared-types';

const ACCOUNT_ID = 'acc_test' as AccountId;
const FOREIGN_ACCOUNT_ID = 'acc_other' as AccountId;
const USER_ID = 'user_test' as UserId;
const ENCOUNTER_1 = 'enc_001' as EncounterId;
const ENCOUNTER_2 = 'enc_002' as EncounterId;

class FailingCreateDischargeRepository extends InMemoryDischargeRepository {
  override async create(): Promise<void> {
    throw new Error('database create failed');
  }
}

class FailingUpdateDischargeRepository extends InMemoryDischargeRepository {
  override async update(): Promise<void> {
    throw new Error('database update failed');
  }
}

describe('DischargesService', () => {
  let service: DischargesService;

  beforeEach(() => {
    service = new DischargesService({
      dischargeRepository: new InMemoryDischargeRepository()
    });
  });

  it('should create a discharge', async () => {
    const discharge = await service.create(ACCOUNT_ID, USER_ID, {
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

  it('should get discharge by id', async () => {
    const created = await service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    const found = await service.getById(created.id);
    expect(found.id).toBe(created.id);
  });

  it('should reject cross-account reads and updates before persistence', async () => {
    const created = await service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory',
      outcome: 'Original'
    });

    await expect(service.getById(created.id, FOREIGN_ACCOUNT_ID)).rejects.toThrow(NotFoundError);
    await expect(service.getByEncounterId(ENCOUNTER_1, FOREIGN_ACCOUNT_ID)).resolves.toBeNull();
    await expect(
      service.update(created.id, { outcome: 'Cross tenant' }, 1, FOREIGN_ACCOUNT_ID)
    ).rejects.toThrow(NotFoundError);

    await expect(service.getById(created.id, ACCOUNT_ID)).resolves.toMatchObject({
      outcome: 'Original',
      version: 1
    });
  });

  it('should throw NotFoundError for non-existent id', async () => {
    await expect(service.getById('non_existent' as DischargeId)).rejects.toThrow(NotFoundError);
  });

  it('should get discharge by encounter id', async () => {
    await service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    const found = await service.getByEncounterId(ENCOUNTER_1);
    expect(found).not.toBeNull();
    expect(found!.encounterId).toBe(ENCOUNTER_1);
  });

  it('should return null for non-existent encounter', async () => {
    const found = await service.getByEncounterId('non_existent' as EncounterId);
    expect(found).toBeNull();
  });

  it('should block duplicate discharge per encounter', async () => {
    await service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    await expect(
      service.create(ACCOUNT_ID, USER_ID, {
        encounterId: ENCOUNTER_1,
        dischargeType: 'inpatient'
      })
    ).rejects.toThrow(ConflictError);
  });

  it('should list discharges by account', async () => {
    await service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });
    await service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_2,
      dischargeType: 'inpatient'
    });

    const list = await service.list(ACCOUNT_ID);
    expect(list.length).toBe(2);
  });

  it('should update a discharge with version check', async () => {
    const created = await service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    const updated = await service.update(
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

  it('should throw ConflictError on version mismatch', async () => {
    const created = await service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    await expect(service.update(created.id, { outcome: 'test' }, 999)).rejects.toThrow(
      ConflictError
    );
  });

  it('does not report or cache a discharge when persistence fails', async () => {
    const failingService = new DischargesService({
      dischargeRepository: new FailingCreateDischargeRepository()
    });

    await expect(
      failingService.create(ACCOUNT_ID, USER_ID, {
        encounterId: ENCOUNTER_1,
        dischargeType: 'ambulatory'
      })
    ).rejects.toThrow('database create failed');
    expect(await failingService.getByEncounterId(ENCOUNTER_1)).toBeNull();
  });

  it('preserves the persisted version when an update fails', async () => {
    const repository: DischargeRepository = new FailingUpdateDischargeRepository();
    const failingService = new DischargesService({ dischargeRepository: repository });
    const created = await failingService.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory',
      outcome: 'Original outcome'
    });

    await expect(
      failingService.update(created.id, { outcome: 'Unpersisted outcome' }, 1)
    ).rejects.toThrow('database update failed');

    const stored = await repository.findById(created.id);
    expect(stored).toMatchObject({ outcome: 'Original outcome', version: 1 });
  });
});

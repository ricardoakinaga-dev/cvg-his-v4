import { describe, it, expect, beforeEach } from 'vitest';
import { DischargesService } from './index.js';
import { InMemoryDischargeRepository } from './repositories/in-memory-discharge.repository.js';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, DischargeId, EncounterId, UserId } from '@cvg-his-v2/shared-types';

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

    const found = service.getById(created.id);
    expect(found.id).toBe(created.id);
  });

  it('should throw NotFoundError for non-existent id', () => {
    expect(() => service.getById('non_existent' as DischargeId)).toThrow(NotFoundError);
  });

  it('should get discharge by encounter id', () => {
    service.create(ACCOUNT_ID, USER_ID, {
      encounterId: ENCOUNTER_1,
      dischargeType: 'ambulatory'
    });

    const found = service.getByEncounterId(ENCOUNTER_1);
    expect(found).not.toBeNull();
    expect(found!.encounterId).toBe(ENCOUNTER_1);
  });

  it('should return null for non-existent encounter', () => {
    const found = service.getByEncounterId('non_existent' as EncounterId);
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
    await repository.delete(created.id);
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

    expect(() =>
      service.update(created.id, { outcome: 'test' }, 999)
    ).toThrow(ConflictError);
  });
});

import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DatabaseDischargeRepository,
  DischargesService
} from '../../../packages/modules/discharges/src/index.ts';
import {
  closeDatabaseClient,
  createDatabaseClient
} from '../../../packages/shared/database/src/index.ts';
import { ConflictError, NotFoundError } from '../../../packages/shared/errors/src/index.ts';
import type {
  AccountId,
  DischargeSummary,
  EncounterId,
  PatientId,
  UserId
} from '../../../packages/shared/types/src/index.ts';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.ts';
import { TEST_DB_URL } from '../../setup/env.ts';

const tenantId = randomUUID();
const accountId = randomUUID() as AccountId;
const otherAccountId = randomUUID() as AccountId;
const userId = randomUUID() as UserId;
const otherUserId = randomUUID() as UserId;
const ownerId = randomUUID();
const patientId = randomUUID() as PatientId;
const encounterId = randomUUID() as EncounterId;

function inTenant<T>(operation: () => T): T {
  return runWithTenantContext(
    {
      tenantId,
      accountId,
      userId,
      correlationId: `discharge-${randomUUID()}`
    },
    operation
  );
}

function inOtherTenant<T>(operation: () => T): T {
  return runWithTenantContext(
    {
      tenantId,
      accountId: otherAccountId,
      userId: otherUserId,
      correlationId: `discharge-other-${randomUUID()}`
    },
    operation
  );
}

function createDatabaseService(): DischargesService {
  return new DischargesService({ dischargeRepository: new DatabaseDischargeRepository() });
}

describe('discharge PostgreSQL persistence', () => {
  beforeAll(async () => {
    await closeDatabaseClient();
    const admin = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      await admin.query(
        `INSERT INTO tenants (id, slug, name, status)
         VALUES ($1, $2, 'Discharge tenant', 'active')`,
        [tenantId, `discharge-${process.pid}`]
      );
      await admin.query(
        `INSERT INTO accounts (id, tenant_id, slug, name)
         VALUES ($1, $3, $4, 'Discharge account'),
                ($2, $3, $5, 'Other discharge account')`,
        [
          accountId,
          otherAccountId,
          tenantId,
          `discharge-account-${process.pid}`,
          `discharge-other-${process.pid}`
        ]
      );
      await admin.query(
        `INSERT INTO users (id, account_id, email, password_hash, full_name)
         VALUES ($1, $3, $4, 'integration-password-hash', 'Discharge User'),
                ($2, $5, $6, 'integration-password-hash', 'Other Discharge User')`,
        [
          userId,
          otherUserId,
          accountId,
          `discharge-${process.pid}@example.test`,
          otherAccountId,
          `discharge-other-${process.pid}@example.test`
        ]
      );
      await admin.query(
        `INSERT INTO owners (id, account_id, full_name)
         VALUES ($1, $2, 'Discharge Owner')`,
        [ownerId, accountId]
      );
      await admin.query(
        `INSERT INTO patients (id, account_id, owner_id, name, species)
         VALUES ($1, $2, $3, 'Discharge Patient', 'canine')`,
        [patientId, accountId, ownerId]
      );
      await admin.query(
        `INSERT INTO encounters (
           id, account_id, patient_id, owner_id, opened_by_user_id, reason
         ) VALUES ($1, $2, $3, $4, $5, 'Discharge persistence')`,
        [encounterId, accountId, patientId, ownerId, userId]
      );
    } finally {
      await admin.end();
    }
    createDatabaseClient(TEST_DB_URL);
  });

  afterAll(async () => {
    await closeDatabaseClient();
    const admin = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      await admin.query('DELETE FROM accounts WHERE id IN ($1, $2)', [accountId, otherAccountId]);
      await admin.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    } finally {
      await admin.end();
    }
  });

  it('survives service restarts and isolates clinical discharge by tenant', async () => {
    const created = await inTenant(() =>
      createDatabaseService().create(accountId, userId, {
        encounterId,
        dischargeType: 'ambulatory',
        outcome: 'Recovered',
        followUpDate: '2030-03-01T12:00:00.000Z'
      })
    );

    expect(await inTenant(() => createDatabaseService().getById(created.id))).toEqual(created);
    expect(await inTenant(() => createDatabaseService().list(accountId))).toEqual([created]);
    await expect(inOtherTenant(() => createDatabaseService().getById(created.id))).rejects.toThrow(
      NotFoundError
    );

    const updated = await inTenant(() =>
      createDatabaseService().update(created.id, { outcome: 'Recovered at home' }, 1)
    );
    expect(updated).toMatchObject({ outcome: 'Recovered at home', version: 2 });
    expect(await inTenant(() => createDatabaseService().getById(created.id))).toEqual(updated);
  });

  it('allows only one concurrent update from the same persisted version', async () => {
    const repository = new DatabaseDischargeRepository();
    const current = await inTenant(() => repository.findByEncounterId(encounterId));
    expect(current).not.toBeNull();

    const update = (outcome: string): DischargeSummary => ({
      ...(current as DischargeSummary),
      outcome,
      version: (current as DischargeSummary).version + 1,
      updatedAt: new Date().toISOString()
    });
    const results = await Promise.allSettled([
      inTenant(() => repository.update(update('Concurrent A'))),
      inTenant(() => repository.update(update('Concurrent B')))
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejection = results.find((result) => result.status === 'rejected');
    expect(rejection).toMatchObject({ status: 'rejected', reason: expect.any(ConflictError) });
  });
});

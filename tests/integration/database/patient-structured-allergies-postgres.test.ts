import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabasePatientRepository } from '../../../packages/modules/patients/src/index.js';
import {
  createDatabaseClient,
  getDatabaseClient,
  getPool,
  runInTenantTransactionContext
} from '../../../packages/shared/database/src/index.js';
import type {
  AccountId,
  OwnerId,
  PatientId,
  PatientSummary
} from '../../../packages/shared/types/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID() as AccountId;
const USER_ID = randomUUID();
const OWNER_ID = randomUUID() as OwnerId;
const PATIENT_ID = randomUUID() as PatientId;

describe('structured patient allergies on PostgreSQL', () => {
  const pool = getTestPool();

  async function command<T>(operation: () => Promise<T>): Promise<T> {
    const correlationId = `allergies-${randomUUID()}`;
    return runWithTenantContext({ tenantId: TENANT_ID, accountId: ACCOUNT_ID, correlationId }, () =>
      runInTenantTransactionContext(
        getPool(),
        { accountId: ACCOUNT_ID, actorUserId: USER_ID, correlationId },
        operation
      )
    );
  }

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at) VALUES ($1, $2, 'Allergy tenant', 'active', now())`,
      [TENANT_ID, `allergy-${TENANT_ID}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active) VALUES ($1, $2, $3, 'Allergy account', true)`,
      [ACCOUNT_ID, TENANT_ID, `allergy-${ACCOUNT_ID.slice(0, 16)}`]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Vet')`,
      [USER_ID, ACCOUNT_ID, `vet-${USER_ID}`, `vet-${USER_ID}@example.test`]
    );
    await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'Tutora')`, [
      OWNER_ID,
      ACCOUNT_ID
    ]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id = $1', [ACCOUNT_ID]);
  });

  it('round-trips structured allergies next to the free-text allergy', async () => {
    const repository = new DatabasePatientRepository(getDatabaseClient());
    const now = new Date().toISOString();
    const patient: PatientSummary = {
      id: PATIENT_ID,
      accountId: ACCOUNT_ID,
      name: 'Thor',
      species: 'canine',
      sex: 'male',
      primaryOwnerId: OWNER_ID,
      status: 'active',
      allergy: 'Reação a penicilinas em 2024',
      allergies: [
        { substance: 'Penicilina', severity: 'anaphylaxis', reaction: 'choque' },
        { substance: 'Meloxicam', severity: 'moderate', drugClass: 'nsaids' }
      ],
      createdAt: now,
      updatedAt: now
    };

    await command(() => repository.create(patient));
    const stored = await command(() => repository.findById(PATIENT_ID));

    expect(stored?.allergy).toBe('Reação a penicilinas em 2024');
    expect(stored?.allergies).toEqual(patient.allergies);

    await command(() => repository.update({ ...patient, allergies: undefined }));
    expect((await command(() => repository.findById(PATIENT_ID)))?.allergies).toBeUndefined();
  });
});

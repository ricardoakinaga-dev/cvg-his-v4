import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabasePrescriptionRepository } from '../../../apps/api/src/repositories/database-prescription.repository.js';
import {
  closeDatabaseClient,
  createDatabaseClient,
  getDatabaseClient
} from '../../../packages/shared/database/src/index.js';
import type {
  PrescriptionRevisionSummary,
  PrescriptionSummary
} from '../../../packages/modules/prescriptions/src/index.js';
import type {
  AccountId,
  EncounterId,
  PatientId,
  UserId
} from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const tenantId = randomUUID();
const accountId = randomUUID() as AccountId;
const otherAccountId = randomUUID() as AccountId;
const actorUserId = randomUUID() as UserId;
const ownerId = randomUUID();
const patientId = randomUUID() as PatientId;
const encounterId = randomUUID() as EncounterId;
const medicalRecordId = `mr_${randomUUID()}`;

type AtomicPrescriptionRepository = DatabasePrescriptionRepository & {
  createWithRevision(
    prescription: PrescriptionSummary,
    revision: PrescriptionRevisionSummary,
    accountId: AccountId
  ): Promise<void>;
  updateWithRevision(
    prescription: PrescriptionSummary,
    revision: PrescriptionRevisionSummary,
    accountId: AccountId
  ): Promise<void>;
};

const tenantContext = {
  tenantId,
  accountId,
  userId: actorUserId,
  correlationId: `prescription-atomicity-${tenantId}`
};

function inTenant<T>(operation: () => Promise<T>): Promise<T> {
  return runWithTenantContext(tenantContext, operation);
}

function prescription(id: string, title: string): PrescriptionSummary {
  const now = new Date().toISOString();
  return {
    id: id as never,
    accountId,
    medicalRecordId,
    encounterId,
    patientId,
    entryType: 'prescription',
    title,
    content: `Posologia: ${title}`,
    authoredByUserId: actorUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    medicationName: title
  };
}

function revision(
  prescriptionId: string,
  id: string,
  title: string,
  version = 1
): PrescriptionRevisionSummary {
  return {
    id,
    prescriptionId: prescriptionId as never,
    version,
    title,
    content: `Posologia: ${title}`,
    authorUserId: actorUserId,
    reason: version === 1 ? 'Prescription created' : 'Concurrent update',
    createdAt: new Date().toISOString()
  };
}

beforeAll(async () => {
  createDatabaseClient(TEST_DB_URL);
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status, activated_at)
     VALUES ($1, $2, 'Prescription atomicity tenant', 'active', now())`,
    [tenantId, `prescription-atomicity-${tenantId.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
     VALUES ($1, $3, $4, 'Prescription atomicity account A', true),
            ($2, $3, $5, 'Prescription atomicity account B', true)`,
    [
      accountId,
      otherAccountId,
      tenantId,
      `prescription-atomicity-a-${accountId.slice(0, 8)}`,
      `prescription-atomicity-b-${otherAccountId.slice(0, 8)}`
    ]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, $4, 'fixture-hash', 'Prescription atomicity operator', true)`,
    [
      actorUserId,
      accountId,
      `prescription-atomicity-${actorUserId.slice(0, 8)}`,
      `prescription-atomicity-${actorUserId.slice(0, 8)}@example.test`
    ]
  );
  await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, $3)`, [
    ownerId,
    accountId,
    'Prescription atomicity owner'
  ]);
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Prescription atomicity patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'open', $5)`,
    [encounterId, accountId, patientId, ownerId, actorUserId]
  );
  await pool.query(
    `INSERT INTO medical_records (id, account_id, encounter_id, patient_id, status, version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'open', 1, now(), now())`,
    [medicalRecordId, accountId, encounterId, patientId]
  );
});

afterAll(async () => {
  await getTestPool().query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  await closeDatabaseClient();
});

describe('database prescription atomicity', () => {
  it('rolls back the prescription when its initial revision cannot be inserted', async () => {
    const repository = new DatabasePrescriptionRepository(
      getDatabaseClient()
    ) as AtomicPrescriptionRepository;
    const first = prescription(`rx_${randomUUID()}`, 'Amoxicilina');
    const firstRevision = revision(first.id, `rxrev_${randomUUID()}`, first.title);
    await inTenant(() => repository.createWithRevision(first, firstRevision, accountId));

    const second = prescription(`rx_${randomUUID()}`, 'Dipirona');
    const conflictingRevision = revision(second.id, firstRevision.id, second.title);
    await expect(
      inTenant(() => repository.createWithRevision(second, conflictingRevision, accountId))
    ).rejects.toThrow();

    const persisted = await getTestPool().query<{ id: string }>(
      `SELECT id
         FROM clinical_entries
        WHERE account_id = $1 AND id IN ($2, $3)
        ORDER BY id`,
      [accountId, first.id, second.id]
    );
    expect(persisted.rows).toEqual([{ id: first.id }]);
  });

  it('accepts one concurrent update and rejects the stale replica without a lost update', async () => {
    const initial = prescription(`rx_${randomUUID()}`, 'Prednisona');
    const initialRevision = revision(initial.id, `rxrev_${randomUUID()}`, initial.title);
    const firstRepository = new DatabasePrescriptionRepository(
      getDatabaseClient()
    ) as AtomicPrescriptionRepository;
    const secondRepository = new DatabasePrescriptionRepository(
      getDatabaseClient()
    ) as AtomicPrescriptionRepository;
    await inTenant(() => firstRepository.createWithRevision(initial, initialRevision, accountId));

    const updateA: PrescriptionSummary = {
      ...initial,
      title: 'Prednisona ajustada A',
      content: 'Posologia: Prednisona ajustada A',
      version: 2,
      updatedAt: new Date().toISOString(),
      medicationName: 'Prednisona ajustada A'
    };
    const updateB: PrescriptionSummary = {
      ...initial,
      title: 'Prednisona ajustada B',
      content: 'Posologia: Prednisona ajustada B',
      version: 2,
      updatedAt: new Date().toISOString(),
      medicationName: 'Prednisona ajustada B'
    };
    const updateARevision = revision(initial.id, `rxrev_${randomUUID()}`, initial.title, 1);
    const updateBRevision = revision(initial.id, `rxrev_${randomUUID()}`, initial.title, 1);

    const results = await Promise.allSettled([
      inTenant(() => firstRepository.updateWithRevision(updateA, updateARevision, accountId)),
      inTenant(() => secondRepository.updateWithRevision(updateB, updateBRevision, accountId))
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);

    const persisted = await getTestPool().query<{ title: string; version: number }>(
      `SELECT title, version
         FROM clinical_entries
        WHERE account_id = $1 AND id = $2`,
      [accountId, initial.id]
    );
    expect(persisted.rows[0]?.version).toBe(2);
    expect(['Prednisona ajustada A', 'Prednisona ajustada B']).toContain(persisted.rows[0]?.title);

    const revisions = await getTestPool().query<{ version: number }>(
      `SELECT version
         FROM entry_revisions
        WHERE entry_id = $1
        ORDER BY created_at, id`,
      [initial.id]
    );
    expect(revisions.rows).toHaveLength(2);
    expect(revisions.rows.map((row) => row.version)).toEqual([1, 1]);
  });

  it('does not disclose a persisted prescription through another account scope', async () => {
    const persisted = prescription(`rx_${randomUUID()}`, 'Meloxicam');
    const revisionRecord = revision(persisted.id, `rxrev_${randomUUID()}`, persisted.title);
    const repository = new DatabasePrescriptionRepository(
      getDatabaseClient()
    ) as AtomicPrescriptionRepository;
    await inTenant(() => repository.createWithRevision(persisted, revisionRecord, accountId));

    await expect(
      runWithTenantContext({ ...tenantContext, accountId: otherAccountId }, () =>
        repository.findById(persisted.id as never, otherAccountId)
      )
    ).resolves.toBeNull();
  });
});

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseEncounterRepository } from '../../../packages/modules/encounters/src/repositories/database-encounter.repository.js';
import {
  closeDatabaseClient,
  createDatabaseClient,
  getDatabaseClient
} from '../../../packages/shared/database/src/index.js';
import { ConflictError } from '../../../packages/shared/errors/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';
import { TEST_DB_URL } from '../../setup/env.js';

const tenantId = randomUUID();
const accountId = randomUUID();
const otherTenantId = randomUUID();
const otherAccountId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();
const ownerId = randomUUID();
const otherOwnerId = randomUUID();
const patientId = randomUUID();
const otherPatientId = randomUUID();
const reopenPatientId = randomUUID();
const reopenConflictPatientId = randomUUID();
const reopenClosedId = randomUUID();
const reopenActiveId = randomUUID();

const tenantContext = {
  tenantId,
  accountId,
  userId,
  correlationId: `encounter-active-uniqueness-${randomUUID()}`
};

function encounter(id: string, patient = patientId, account = accountId, actor = userId) {
  const now = '2026-08-27T06:00:00.000Z';
  return {
    id,
    accountId,
    patientId: patient,
    ownerId: account === accountId ? ownerId : otherOwnerId,
    visitType: 'walk_in' as const,
    origin: 'reception' as const,
    reason: 'Concurrent active encounter invariant',
    status: 'reception' as const,
    openedAt: now,
    createdByUserId: actor,
    updatedAt: now
  };
}

describe('encounter active-patient database invariant', () => {
  const pool = getTestPool();

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Encounter uniqueness tenant', 'active', now()),
              ($3, $4, 'Encounter uniqueness other tenant', 'active', now())`,
      [tenantId, `encounter-unique-${tenantId}`, otherTenantId, `encounter-unique-${otherTenantId}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Encounter uniqueness account', true),
              ($4, $5, $6, 'Encounter uniqueness other account', true)`,
      [
        accountId,
        tenantId,
        `encounter-account-${accountId}`,
        otherAccountId,
        otherTenantId,
        `encounter-account-${otherAccountId}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Encounter operator'),
              ($5, $6, $7, $8, 'test-hash', 'Other encounter operator')`,
      [
        userId,
        accountId,
        `encounter-user-${userId}`,
        `encounter-user-${userId}@example.test`,
        otherUserId,
        otherAccountId,
        `encounter-user-${otherUserId}`,
        `encounter-user-${otherUserId}@example.test`
      ]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name, address_json)
       VALUES ($1, $2, 'Encounter owner', '{"status":"active"}'::jsonb),
              ($3, $4, 'Other encounter owner', '{"status":"active"}'::jsonb)`,
      [ownerId, accountId, otherOwnerId, otherAccountId]
    );
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species, alerts_json)
       VALUES ($1, $2, $3, 'Race patient', 'canine', '{"status":"active"}'::jsonb),
              ($4, $5, $6, 'Other tenant patient', 'canine', '{"status":"active"}'::jsonb),
              ($7, $8, $9, 'Reopen patient', 'feline', '{"status":"active"}'::jsonb),
              ($10, $11, $12, 'Reopen conflict patient', 'feline', '{"status":"active"}'::jsonb)`,
      [
        patientId,
        accountId,
        ownerId,
        otherPatientId,
        otherAccountId,
        otherOwnerId,
        reopenPatientId,
        accountId,
        ownerId,
        reopenConflictPatientId,
        accountId,
        ownerId
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [accountId, otherAccountId]);
    await closeDatabaseClient();
  });

  it('fails closed when historical active duplicates block the migration', async () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'packages/db/migrations/0151_encounter_active_patient_uniqueness.sql'),
      'utf8'
    );
    const duplicateIds = [randomUUID(), randomUUID()];

    await pool.query('BEGIN');
    try {
      await pool.query('DROP INDEX uidx_encounters_one_active_per_patient');
      await pool.query(
        `INSERT INTO encounters (
           id, account_id, patient_id, owner_id, status, opened_by_user_id, opened_at, reason
         ) VALUES ($1, $2, $3, $4, 'open', $5, now(), 'Migration preflight duplicate'),
                  ($6, $2, $3, $4, 'open', $5, now(), 'Migration preflight duplicate')`,
        [duplicateIds[0], accountId, patientId, ownerId, userId, duplicateIds[1]]
      );

      await expect(pool.query(migration)).rejects.toThrow(
        /historical duplicate active encounters exist/i
      );
      expect(migration).not.toMatch(/DELETE\s+FROM\s+encounters/i);
      expect(migration).not.toMatch(/UPDATE\s+encounters/i);
    } finally {
      await pool.query('ROLLBACK');
    }
  });

  it('reruns safely and rejects an incompatible same-name index', async () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'packages/db/migrations/0151_encounter_active_patient_uniqueness.sql'),
      'utf8'
    );

    await pool.query('BEGIN');
    try {
      await pool.query('DROP INDEX uidx_encounters_one_active_per_patient');
      await expect(pool.query(migration)).resolves.toBeDefined();
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

    // The committed migration must remain a no-op when the deploy runner
    // retries the same migration after a successful release.
    await expect(pool.query(migration)).resolves.toBeDefined();

    await pool.query('BEGIN');
    try {
      await pool.query('DROP INDEX uidx_encounters_one_active_per_patient');
      await pool.query(
        `CREATE UNIQUE INDEX uidx_encounters_one_active_per_patient
           ON encounters(id)
          WHERE status <> 'closed'`
      );
      await expect(pool.query(migration)).rejects.toThrow(
        /existing index definition is incompatible/i
      );
    } finally {
      await pool.query('ROLLBACK');
    }
  });

  it('serializes concurrent inserts from independent runtimes to one winner', async () => {
    const firstRepository = new DatabaseEncounterRepository(getDatabaseClient());
    const secondRepository = new DatabaseEncounterRepository(getDatabaseClient());
    const outcomes = await runWithTenantContext(tenantContext, () =>
      Promise.allSettled([
        firstRepository.create(encounter(randomUUID())),
        secondRepository.create(encounter(randomUUID()))
      ])
    );

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected?.status === 'rejected' ? rejected.reason : undefined).toBeInstanceOf(
      ConflictError
    );

    const rows = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM encounters
        WHERE account_id = $1 AND patient_id = $2 AND status <> 'closed'`,
      [accountId, patientId]
    );
    expect(rows.rows).toEqual([{ count: 1 }]);
  });

  it('keeps the invariant tenant-scoped and releases it after close', async () => {
    const repository = new DatabaseEncounterRepository(getDatabaseClient());
    const otherContext = { ...tenantContext, tenantId: otherTenantId, accountId: otherAccountId };
    const otherEncounter = {
      ...encounter(randomUUID(), otherPatientId),
      accountId: otherAccountId,
      ownerId: otherOwnerId,
      createdByUserId: otherUserId
    };

    await runWithTenantContext(otherContext, () => repository.create(otherEncounter));

    const crossAccountRows = await pool.query(
      `SELECT account_id, patient_id
         FROM encounters
        WHERE patient_id IN ($1, $2) AND status <> 'closed'
        ORDER BY account_id`,
      [patientId, otherPatientId]
    );
    expect(crossAccountRows.rows).toHaveLength(2);

    const closed = encounter(randomUUID(), reopenPatientId);
    await runWithTenantContext(tenantContext, () => repository.create(closed));
    await runWithTenantContext(tenantContext, () =>
      repository.update({ ...closed, status: 'closed', closedAt: closed.openedAt })
    );

    await runWithTenantContext(tenantContext, () =>
      repository.create(encounter(randomUUID(), reopenPatientId))
    );
  });

  it('rejects reopening a closed encounter when another active encounter exists', async () => {
    const repository = new DatabaseEncounterRepository(getDatabaseClient());
    const closed = encounter(reopenClosedId, reopenConflictPatientId);
    await runWithTenantContext(tenantContext, () => repository.create(closed));
    await runWithTenantContext(tenantContext, () =>
      repository.update({ ...closed, status: 'closed', closedAt: closed.openedAt })
    );
    await runWithTenantContext(tenantContext, () =>
      repository.create(encounter(reopenActiveId, reopenConflictPatientId))
    );

    await expect(
      runWithTenantContext(tenantContext, () =>
        repository.update({ ...closed, status: 'reception' })
      )
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      runWithTenantContext(tenantContext, () =>
        repository.updateForReopen!({ ...closed, status: 'reception' })
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('publishes the named partial unique index', async () => {
    const result = await pool.query(
      `SELECT indexname, indexdef
         FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'encounters'
          AND indexname = 'uidx_encounters_one_active_per_patient'`
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].indexdef).toContain('(account_id, patient_id)');
    expect(result.rows[0].indexdef).toContain("WHERE (status <> 'closed'::encounter_status)");

    const validity = await pool.query<{
      readonly indisvalid: boolean;
      readonly indisready: boolean;
    }>(
      `SELECT index_record.indisvalid, index_record.indisready
         FROM pg_index AS index_record
         INNER JOIN pg_class AS index_class
           ON index_class.oid = index_record.indexrelid
         INNER JOIN pg_namespace AS index_namespace
           ON index_namespace.oid = index_class.relnamespace
        WHERE index_namespace.nspname = 'public'
          AND index_class.relname = 'uidx_encounters_one_active_per_patient'`
    );
    expect(validity.rows).toEqual([{ indisvalid: true, indisready: true }]);
  });

  it('retains forced RLS tenant isolation for the encounter boundary', async () => {
    const catalog = await pool.query<{
      readonly rowsecurity: boolean;
      readonly relforcerowsecurity: boolean;
    }>(
      `SELECT c.relrowsecurity AS rowsecurity, c.relforcerowsecurity
         FROM pg_class AS c
         INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'encounters'`
    );
    expect(catalog.rows).toEqual([{ rowsecurity: true, relforcerowsecurity: true }]);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, accountId);
      const visible = await client.query<{ readonly account_id: string }>(
        'SELECT account_id FROM encounters WHERE account_id IN ($1, $2)',
        [accountId, otherAccountId]
      );
      expect(visible.rows.every((row) => row.account_id === accountId)).toBe(true);
      expect(visible.rows.some((row) => row.account_id === otherAccountId)).toBe(false);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});

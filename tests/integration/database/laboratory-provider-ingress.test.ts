import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DatabaseLaboratoryResultImportRepository,
  type LaboratoryResultImportRecord
} from '../../../apps/api/src/laboratory-result-import-repository.js';
import {
  createDatabaseClient,
  getDatabaseClient,
  getPool
} from '../../../packages/shared/database/src/index.js';
import { withTenantQueryExplicit } from '../../../packages/tenant-context/src/index.js';
import type { AccountId } from '../../../packages/shared/types/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { RLS_TEST_ROLE } from '../../helpers/rls-helpers.js';
import { TEST_DB_IS_EPHEMERAL, TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_A = randomUUID() as AccountId;
const ACCOUNT_B = randomUUID() as AccountId;
const EXTERNAL_RESULT_ID = `pg-lab-${randomUUID()}`;
const OBSERVED_AT = '2026-08-29T03:33:20.000Z';
const RECEIVED_AT = '2026-08-29T03:33:21.000Z';

function ingressRecord(
  accountId: string,
  overrides: Partial<LaboratoryResultImportRecord> = {}
): LaboratoryResultImportRecord {
  return {
    externalResultId: EXTERNAL_RESULT_ID,
    orderId: `order-${accountId.slice(0, 8)}`,
    accountId,
    equipmentId: 'equipment-001',
    providerCode: 'equipment-bridge',
    schemaVersion: '1',
    signatureKeyId: 'lab-key-01',
    payloadFingerprint: 'a'.repeat(64),
    observedAt: OBSERVED_AT,
    status: 'pending_human_review',
    importedAt: RECEIVED_AT,
    resultSummary: 'Hemoglobina: 7.2',
    attemptCount: 1,
    lastAttemptAt: RECEIVED_AT,
    ...overrides
  };
}

describe.skipIf(!TEST_DB_IS_EPHEMERAL)('laboratory provider ingress PostgreSQL ledger', () => {
  const pool = getTestPool();
  let repository: DatabaseLaboratoryResultImportRepository;

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    repository = new DatabaseLaboratoryResultImportRepository(getDatabaseClient());
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Laboratory provider ingress tenant', 'active', now())`,
      [TENANT_ID, `lab-provider-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $3, $4, 'Laboratory account A', true),
              ($2, $3, $5, 'Laboratory account B', true)`,
      [
        ACCOUNT_A,
        ACCOUNT_B,
        TENANT_ID,
        `lab-provider-a-${ACCOUNT_A.slice(0, 12)}`,
        `lab-provider-b-${ACCOUNT_B.slice(0, 12)}`
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_A, ACCOUNT_B]);
  });

  it('persists one row under concurrent delivery and returns one replay', async () => {
    const record = ingressRecord(ACCOUNT_A);
    const [first, second] = await Promise.all([
      repository.recordProviderIngress(record),
      repository.recordProviderIngress(record)
    ]);

    expect([first.replayed, second.replayed].filter(Boolean)).toHaveLength(1);
    expect(first.record).toEqual(second.record);
    expect(first.record.status).toBe('pending_human_review');

    const rows = await pool.query<{
      readonly provider_code: string;
      readonly schema_version: string;
      readonly signature_key_id: string;
      readonly payload_fingerprint: string;
      readonly status: string;
      readonly observed_at: Date;
    }>(
      `SELECT provider_code, schema_version, signature_key_id, payload_fingerprint,
              status, observed_at
         FROM laboratory_result_imports
        WHERE account_id = $1 AND external_result_id = $2`,
      [ACCOUNT_A, EXTERNAL_RESULT_ID]
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({
      provider_code: 'equipment-bridge',
      schema_version: '1',
      signature_key_id: 'lab-key-01',
      payload_fingerprint: 'a'.repeat(64),
      status: 'pending_human_review'
    });
    expect(rows.rows[0]?.observed_at.toISOString()).toBe(OBSERVED_AT);
  });

  it('keeps tenants isolated and rejects a divergent immutable replay', async () => {
    const accountB = await repository.recordProviderIngress(ingressRecord(ACCOUNT_B));
    expect(accountB.replayed).toBe(false);
    expect(await repository.list(ACCOUNT_A)).toHaveLength(1);
    expect(await repository.list(ACCOUNT_B)).toHaveLength(1);

    await expect(
      repository.recordProviderIngress(
        ingressRecord(ACCOUNT_A, {
          resultSummary: 'Hemoglobina: 9.1',
          payloadFingerprint: 'b'.repeat(64)
        })
      )
    ).rejects.toMatchObject({
      code: 'LABORATORY_PROVIDER_INGRESS_CONFLICT',
      statusCode: 409
    });

    const original = await repository.findByExternalResultId(EXTERNAL_RESULT_ID, ACCOUNT_A);
    expect(original?.resultSummary).toBe('Hemoglobina: 7.2');
    expect(await repository.findByExternalResultId(EXTERNAL_RESULT_ID, ACCOUNT_B)).toMatchObject({
      accountId: ACCOUNT_B,
      status: 'pending_human_review'
    });
    expect(
      await repository.findByExternalResultId(EXTERNAL_RESULT_ID, randomUUID())
    ).toBeNull();
  });

  it('keeps provider UTC instants stable under a non-UTC PostgreSQL session', async () => {
    await withTenantQueryExplicit(getPool(), ACCOUNT_A, async (client) => {
      await client.query("SET LOCAL TIME ZONE 'America/Sao_Paulo'");
      const result = await client.query<{ readonly observed_utc: string }>(
        `SELECT to_char(observed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS observed_utc
           FROM laboratory_result_imports
          WHERE account_id = $1 AND external_result_id = $2`,
        [ACCOUNT_A, EXTERNAL_RESULT_ID]
      );
      expect(result.rows[0]?.observed_utc).toBe(OBSERVED_AT);
    });
  });

  it('keeps provider facts immutable while allowing workflow status updates', async () => {
    const existing = await repository.findByExternalResultId(EXTERNAL_RESULT_ID, ACCOUNT_A);
    expect(existing).not.toBeNull();

    await expect(
      repository.update(
        ingressRecord(ACCOUNT_A, {
          resultSummary: 'Tampered provider result',
          payloadFingerprint: 'c'.repeat(64)
        })
      )
    ).rejects.toMatchObject({
      code: 'LABORATORY_PROVIDER_INGRESS_CONFLICT',
      statusCode: 409
    });

    await repository.update(
      ingressRecord(ACCOUNT_A, {
        status: 'failed',
        failureReason: 'human review requested'
      })
    );
    expect(await repository.findByExternalResultId(EXTERNAL_RESULT_ID, ACCOUNT_A)).toMatchObject({
      resultSummary: 'Hemoglobina: 7.2',
      payloadFingerprint: 'a'.repeat(64),
      status: 'failed',
      failureReason: 'human review requested'
    });
  });

  it('enforces the tenant policy for a non-superuser RLS role', async () => {
    const rlsPool = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    const rlsScopedPool = {
      connect: async () => {
        const client = await rlsPool.connect();
        await client.query(`SET ROLE ${RLS_TEST_ROLE}`);
        return client;
      }
    } as unknown as Pool;
    const rlsRepository = new DatabaseLaboratoryResultImportRepository(
      getDatabaseClient(),
      rlsScopedPool
    );
    const rlsExternalResultId = `pg-lab-rls-${randomUUID()}`;

    try {
      await rlsRepository.recordProviderIngress(
        ingressRecord(ACCOUNT_A, { externalResultId: rlsExternalResultId })
      );
      await rlsRepository.recordProviderIngress(
        ingressRecord(ACCOUNT_B, { externalResultId: rlsExternalResultId })
      );

      const accountAView = await withTenantQueryExplicit(
        rlsScopedPool,
        ACCOUNT_A,
        async (client) => {
          const identity = await client.query<{
            readonly current_user: string;
            readonly rolsuper: boolean;
            readonly rolbypassrls: boolean;
          }>(
            `SELECT current_user, rolsuper, rolbypassrls
               FROM pg_roles
              WHERE rolname = current_user`
          );
          const visibleRows = await client.query<{ readonly account_id: string }>(
            `SELECT account_id
               FROM laboratory_result_imports
              WHERE external_result_id = $1
              ORDER BY account_id`,
            [rlsExternalResultId]
          );
          return { identity: identity.rows[0], visibleRows: visibleRows.rows };
        }
      );

      expect(accountAView.identity).toMatchObject({
        current_user: RLS_TEST_ROLE,
        rolsuper: false,
        rolbypassrls: false
      });
      expect(accountAView.visibleRows).toEqual([{ account_id: ACCOUNT_A }]);

      await expect(
        withTenantQueryExplicit(rlsScopedPool, ACCOUNT_A, async (client) => {
          const crossAccount = ingressRecord(ACCOUNT_B, {
            externalResultId: `pg-lab-rls-cross-${randomUUID()}`
          });
          await client.query(
            `INSERT INTO laboratory_result_imports (
               account_id, external_result_id, order_id, equipment_id,
               provider_code, schema_version, signature_key_id, payload_fingerprint,
               observed_at, status, imported_at, result_summary, failure_reason,
               attempt_count, last_attempt_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
              crossAccount.accountId,
              crossAccount.externalResultId,
              crossAccount.orderId,
              crossAccount.equipmentId,
              crossAccount.providerCode,
              crossAccount.schemaVersion,
              crossAccount.signatureKeyId,
              crossAccount.payloadFingerprint,
              crossAccount.observedAt,
              crossAccount.status,
              crossAccount.importedAt,
              crossAccount.resultSummary,
              crossAccount.failureReason ?? null,
              crossAccount.attemptCount,
              crossAccount.lastAttemptAt
            ]
          );
        })
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await rlsPool.end();
    }
  });
});

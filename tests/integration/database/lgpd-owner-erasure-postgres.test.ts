import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createLgpdErasureExecutor } from '../../../apps/api/src/lgpd-erasure-executor.js';
import {
  DatabaseConsentRepository,
  DatabaseDsrRepository,
  LgpdService
} from '../../../packages/modules/lgpd/src/index.js';
import { DatabaseOwnerRepository } from '../../../packages/modules/owners/src/repositories/database-owner.repository.js';
import { OwnersService } from '../../../packages/modules/owners/src/index.js';
import {
  createDatabaseClient,
  getDatabaseClient,
  getPool,
  runInTenantTransactionContext
} from '../../../packages/shared/database/src/index.js';
import type { AccountId, OwnerId, UserId } from '../../../packages/shared/types/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID() as AccountId;
const USER_ID = randomUUID() as UserId;
const OWNER_ID = randomUUID() as OwnerId;

describe('LGPD owner erasure on PostgreSQL', () => {
  const pool = getTestPool();
  let lgpd: LgpdService;

  async function command<T>(operation: () => Promise<T>): Promise<T> {
    const correlationId = `lgpd-erasure-${randomUUID()}`;
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
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'LGPD erasure tenant', 'active', now())`,
      [TENANT_ID, `lgpd-erasure-${TENANT_ID}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'LGPD erasure account', true)`,
      [ACCOUNT_ID, TENANT_ID, `lgpd-erasure-${ACCOUNT_ID.toString().slice(0, 16)}`]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'DPO')`,
      [USER_ID, ACCOUNT_ID, `dpo-${USER_ID}`, `dpo-${USER_ID}@example.test`]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name, document, email, phone_main, address_json)
       VALUES ($1, $2, 'Titular Teste', '123.456.789-09', 'titular@example.test', '+55 11 90000-0000', $3::jsonb)`,
      [
        OWNER_ID,
        ACCOUNT_ID,
        JSON.stringify({
          version: 2,
          status: 'active',
          contacts: [
            { label: 'E-mail', value: 'titular@example.test', type: 'email', primary: true },
            { label: 'Celular', value: '+55 11 90000-0000', type: 'whatsapp', primary: false }
          ],
          address: { city: 'São Paulo', state: 'SP', street: 'Rua Teste' },
          profile: { birthDate: '1990-01-01', receiveSms: true },
          administrativeNotes: 'Prefere contato à tarde'
        })
      ]
    );

    const database = getDatabaseClient();
    const owners = new OwnersService({
      ownerRepository: new DatabaseOwnerRepository(database),
      seedOwners: []
    });
    lgpd = new LgpdService({
      consentRepository: new DatabaseConsentRepository(database),
      dsrRepository: new DatabaseDsrRepository(database),
      erasureExecutor: createLgpdErasureExecutor(owners)
    });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id = $1', [ACCOUNT_ID]);
  });

  it('erases contact data, keeps identity for legal retention and revokes consents', async () => {
    const request = await command(async () => {
      await lgpd.grantConsent({
        accountId: ACCOUNT_ID,
        subjectId: OWNER_ID,
        subjectType: 'owner',
        purpose: 'marketing',
        grantedBy: USER_ID
      });
      return lgpd.createDsrRequest({
        accountId: ACCOUNT_ID,
        subjectId: OWNER_ID,
        subjectType: 'owner',
        requestType: 'data_deletion',
        requestedBy: USER_ID
      });
    });

    const completed = await command(() =>
      lgpd.completeDsrRequest(ACCOUNT_ID, request.id, USER_ID)
    );

    expect(completed.status).toBe('completed');
    expect(completed.resultJson?.erasureExecuted).toBe(true);
    expect(completed.resultJson?.erasedDataTypes).toEqual([
      'owner_contacts',
      'owner_profile',
      'owner_administrative_notes',
      'consents'
    ]);

    const { rows } = await pool.query(
      `SELECT full_name, document, email, phone_main, phone_alt, address_json
         FROM owners WHERE id = $1`,
      [OWNER_ID]
    );
    expect(rows[0].full_name).toBe('Titular Teste');
    expect(rows[0].document).toBe('123.456.789-09');
    expect(rows[0].email).toBeNull();
    expect(rows[0].phone_main).toBeNull();
    expect(rows[0].phone_alt).toBeNull();
    expect(rows[0].address_json.contacts).toEqual([]);
    expect(rows[0].address_json.profile).toBeUndefined();
    expect(rows[0].address_json.administrativeNotes).toBeUndefined();
    expect(rows[0].address_json.address.city).toBe('São Paulo');

    const consents = await pool.query(
      `SELECT status FROM consent_records WHERE account_id = $1 AND subject_id = $2`,
      [ACCOUNT_ID, OWNER_ID]
    );
    expect(consents.rows.map((row) => row.status)).toEqual(['revoked']);
  });
});

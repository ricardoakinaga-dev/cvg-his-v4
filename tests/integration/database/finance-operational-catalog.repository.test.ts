import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseFinanceCatalogRepository } from '../../../apps/api/src/repositories/database-finance-catalog.repository.js';
import {
  closeDatabaseClient,
  createDatabaseClient
} from '../../../packages/shared/database/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = 'f1000000-0000-4000-8000-000000000001';
const ACCOUNT_A = 'f1000000-0000-4000-8000-000000000002';
const ACCOUNT_B = 'f1000000-0000-4000-8000-000000000003';
const USER_A = 'f1000000-0000-4000-8000-000000000004';

beforeAll(async () => {
  await getTestPool().query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, 'finance-operational-repository', 'Finance repository tenant', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [TENANT_ID]
  );
  await getTestPool().query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $3, 'finance-operational-repository-a', 'Finance repository account A'),
            ($2, $3, 'finance-operational-repository-b', 'Finance repository account B')
     ON CONFLICT (id) DO NOTHING`,
    [ACCOUNT_A, ACCOUNT_B, TENANT_ID]
  );
  await getTestPool().query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, 'finance_repository_user', 'finance-repository@example.com', 'hash', 'Finance repository user')
     ON CONFLICT (id) DO NOTHING`,
    [USER_A, ACCOUNT_A]
  );
  createDatabaseClient(TEST_DB_URL);
});

afterAll(async () => {
  await closeDatabaseClient();
});

describe('DatabaseFinanceCatalogRepository operational catalogs', () => {
  it('executes CRUD, tenant filtering, duplicate protection and optimistic concurrency in PostgreSQL', async () => {
    const repository = new DatabaseFinanceCatalogRepository();
    const initial = {
      code: 'BANK_REPOSITORY',
      name: 'Banco Repository',
      status: 'active' as const,
      configuration: {
        bankCode: '001',
        agency: '0001',
        accountNumber: '12345-6',
        accountType: 'checking',
        usageKey: 'settlement',
        usageDescription: 'Liquidação',
        reconciliationMode: 'manual'
      }
    };

    const created = await repository.createOperationalCatalog(ACCOUNT_A, USER_A, 'banks', initial);
    expect(created).toMatchObject({
      accountId: ACCOUNT_A,
      type: 'banks',
      code: 'BANK_REPOSITORY',
      version: 1
    });

    const pageA = await repository.listOperationalCatalog(ACCOUNT_A, 'banks', {
      search: 'repository',
      status: 'active'
    });
    expect(pageA.items.map((item) => item.id)).toEqual([created.id]);
    expect((await repository.listOperationalCatalog(ACCOUNT_B, 'banks')).items).toEqual([]);

    await expect(
      repository.createOperationalCatalog(ACCOUNT_A, USER_A, 'banks', initial)
    ).rejects.toThrow('DUPLICATE_CATALOG_CODE');

    const updated = await repository.updateOperationalCatalog(
      ACCOUNT_A,
      USER_A,
      'banks',
      created.id,
      created.version,
      {
        ...initial,
        name: 'Banco Repository Principal',
        configuration: { ...initial.configuration, reconciliationMode: 'automatic' }
      }
    );
    expect(updated.item).toMatchObject({
      name: 'Banco Repository Principal',
      version: 2
    });
    expect(updated.diffSummary).toBe('changed=name,configuration');

    await expect(
      repository.updateOperationalCatalog(
        ACCOUNT_A,
        USER_A,
        'banks',
        created.id,
        created.version,
        initial
      )
    ).rejects.toThrow('VERSION_CONFLICT');

    const removed = await repository.removeOperationalCatalog(ACCOUNT_A, 'banks', created.id);
    expect(removed.version).toBe(2);
    expect((await repository.listOperationalCatalog(ACCOUNT_A, 'banks')).totalItems).toBe(0);
  });
});

import { randomUUID } from 'node:crypto';

import {
  createDatabaseClient,
  getDatabaseClient
} from '../../../packages/shared/database/src/index.js';
import {
  DatabaseBedRepository,
  SectorBedService
} from '../../../packages/modules/inpatient/src/sector-bed.service.js';
import type { AccountId, BedId, SectorId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_A = randomUUID() as AccountId;
const ACCOUNT_B = randomUUID() as AccountId;
const SECTOR_A = `sector-a-${randomUUID()}` as SectorId;
const SECTOR_B = `sector-b-${randomUUID()}` as SectorId;
const BED_A = randomUUID() as BedId;
const BED_B = randomUUID() as BedId;

describe('inpatient sector and bed tenant boundary on PostgreSQL', () => {
  let service: SectorBedService;

  const asAccount = <T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> =>
    runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId,
        correlationId: `sector-bed-tenant-${randomUUID()}`
      },
      operation
    );

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    service = new SectorBedService({ databaseClient: getDatabaseClient() });
    const pool = getTestPool();
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status)
       VALUES ($1, $2, 'Sector bed tenant boundary', 'active')`,
      [TENANT_ID, `sector-bed-boundary-${TENANT_ID.slice(0, 8)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $3, $4, 'Sector bed account A', true),
              ($2, $3, $5, 'Sector bed account B', true)`,
      [
        ACCOUNT_A,
        ACCOUNT_B,
        TENANT_ID,
        `sector-bed-a-${ACCOUNT_A.slice(0, 8)}`,
        `sector-bed-b-${ACCOUNT_B.slice(0, 8)}`
      ]
    );
    await pool.query(
      `INSERT INTO sectors (id, account_id, code, name, kind, active)
       VALUES ($1, $3, 'A-OBS', 'Observação A', 'observation', true),
              ($2, $4, 'B-OBS', 'Observação B', 'observation', true)`,
      [SECTOR_A, SECTOR_B, ACCOUNT_A, ACCOUNT_B]
    );
    await pool.query(
      `INSERT INTO beds (id, account_id, sector_id, code, name, status, active)
       VALUES ($1, $3, $5, 'A-01', 'Leito A 01', 'available', true),
              ($2, $4, $6, 'B-01', 'Leito B 01', 'available', true)`,
      [BED_A, BED_B, ACCOUNT_A, ACCOUNT_B, SECTOR_A, SECTOR_B]
    );
  });

  afterAll(async () => {
    const pool = getTestPool();
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_A, ACCOUNT_B]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
  });

  it('keeps sector-filtered reads account-scoped', async () => {
    await expect(
      asAccount(ACCOUNT_A, () => service.listBeds(ACCOUNT_A, SECTOR_B))
    ).resolves.toEqual([]);
    await expect(
      asAccount(ACCOUNT_B, () => service.listBeds(ACCOUNT_B, SECTOR_B))
    ).resolves.toEqual([
      expect.objectContaining({
        id: BED_B,
        accountId: ACCOUNT_B,
        sectorId: SECTOR_B
      })
    ]);
  });

  it('rejects foreign identifier reads and foreign-sector attachment', async () => {
    await expect(
      asAccount(ACCOUNT_A, () => service.getSectorOrThrow(ACCOUNT_A, SECTOR_B))
    ).rejects.toThrow(/Sector not found/);
    await expect(
      asAccount(ACCOUNT_A, () => service.getBedOrThrow(ACCOUNT_A, BED_B))
    ).rejects.toThrow(/Bed not found/);
    await expect(
      asAccount(ACCOUNT_A, () =>
        service.createBed(ACCOUNT_A, {
          sectorId: SECTOR_B,
          code: 'A-FOREIGN',
          name: 'Leito indevido'
        })
      )
    ).rejects.toThrow(/Sector not found/);
  });

  it('keeps bed updates account-scoped at the repository boundary', async () => {
    const foreignBed = await service.getBedOrThrow(ACCOUNT_B, BED_B);
    const repository = new DatabaseBedRepository(getDatabaseClient());

    await repository.update({
      ...foreignBed,
      accountId: ACCOUNT_A,
      name: 'Atualização indevida'
    });

    await expect(service.getBedOrThrow(ACCOUNT_B, BED_B)).resolves.toMatchObject({
      id: BED_B,
      accountId: ACCOUNT_B,
      name: 'Leito B 01'
    });
  });
});

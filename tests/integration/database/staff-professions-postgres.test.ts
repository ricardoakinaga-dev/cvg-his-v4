import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseStaffRepository } from '../../../packages/modules/staff/src/repositories/database-staff.repository.js';
import { StaffService } from '../../../packages/modules/staff/src/index.js';
import {
  createDatabaseClient,
  getPool,
  runInTenantTransactionContext
} from '../../../packages/shared/database/src/index.js';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID() as AccountId;
const FOREIGN_ACCOUNT_ID = randomUUID() as AccountId;
const USER_ID = randomUUID() as UserId;
const FOREIGN_USER_ID = randomUUID() as UserId;

describe('staff professions persistence on PostgreSQL', () => {
  const pool = getTestPool();

  async function command<T>(
    accountId: AccountId,
    userId: UserId,
    operation: () => Promise<T> | T
  ): Promise<T> {
    const correlationId = `staff-profession-${randomUUID()}`;
    return runWithTenantContext(
      { tenantId: TENANT_ID, accountId, correlationId },
      () =>
        runInTenantTransactionContext(
          getPool(),
          { accountId, actorUserId: userId, correlationId },
          async () => operation()
        )
    );
  }

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Staff profession tenant', 'active', now())`,
      [TENANT_ID, `staff-profession-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Staff profession account', true),
              ($4, $2, $5, 'Foreign staff profession account', true)`,
      [
        ACCOUNT_ID,
        TENANT_ID,
        `staff-profession-${ACCOUNT_ID.slice(0, 12)}`,
        FOREIGN_ACCOUNT_ID,
        `staff-profession-f-${FOREIGN_ACCOUNT_ID.slice(0, 10)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Staff profession operator'),
              ($5, $6, $7, $8, 'test-hash', 'Foreign staff profession operator')`,
      [
        USER_ID,
        ACCOUNT_ID,
        `staff-profession-${USER_ID}`,
        `staff-profession-${USER_ID}@example.test`,
        FOREIGN_USER_ID,
        FOREIGN_ACCOUNT_ID,
        `staff-profession-${FOREIGN_USER_ID}`,
        `staff-profession-${FOREIGN_USER_ID}@example.test`
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_ID, FOREIGN_ACCOUNT_ID]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
  });

  it('persists professions, enforces active tenant-safe staff links, and survives hydration', async () => {
    const repository = new DatabaseStaffRepository();
    const service = new StaffService({ repository }, []);

    const profession = await command(ACCOUNT_ID, USER_ID, () =>
      service.createProfession(ACCOUNT_ID, {
        code: 'VET-CLIN',
        name: 'Médico Veterinário',
        description: 'Atendimento clínico'
      })
    );
    const member = await command(ACCOUNT_ID, USER_ID, () =>
      service.create(ACCOUNT_ID, {
        employeeCode: 'VET-001',
        fullName: 'Dra. Ana',
        jobTitle: 'Médico Veterinário',
        professionId: profession.id
      })
    );
    expect(member.professionId).toBe(profession.id);

    const persisted = await pool.query(
      `SELECT p.code, p.name, p.is_active, s.profession_id
         FROM professions p
         JOIN staff s ON s.account_id = p.account_id AND s.profession_id = p.id
        WHERE p.account_id = $1 AND s.id = $2`,
      [ACCOUNT_ID, member.id]
    );
    expect(persisted.rows).toEqual([
      {
        code: 'VET-CLIN',
        name: 'Médico Veterinário',
        is_active: true,
        profession_id: profession.id
      }
    ]);

    await command(ACCOUNT_ID, USER_ID, () => service.toggleProfession(profession.id, false, ACCOUNT_ID));
    await expect(
      command(ACCOUNT_ID, USER_ID, () =>
        service.create(ACCOUNT_ID, {
          employeeCode: 'VET-002',
          fullName: 'Profissional bloqueado',
          professionId: profession.id
        })
      )
    ).rejects.toThrow(/active/i);

    const hydrated = new StaffService({ repository }, []);
    await command(ACCOUNT_ID, USER_ID, () => hydrated.hydrateFromDatabase(ACCOUNT_ID));
    expect(hydrated.listProfessions(ACCOUNT_ID)).toMatchObject([
      { id: profession.id, code: 'VET-CLIN', status: 'inactive' }
    ]);
    expect(hydrated.list(ACCOUNT_ID)).toMatchObject([
      { id: member.id, professionId: profession.id }
    ]);
  });

  it('does not expose another account profession through RLS or service scope', async () => {
    const foreignRepository = new DatabaseStaffRepository();
    const foreignService = new StaffService({ repository: foreignRepository }, []);
    const foreignProfession = await command(FOREIGN_ACCOUNT_ID, FOREIGN_USER_ID, () =>
      foreignService.createProfession(FOREIGN_ACCOUNT_ID, {
        code: 'LAB-BIO',
        name: 'Bioquímico'
      })
    );

    const localRepository = new DatabaseStaffRepository();
    const localService = new StaffService({ repository: localRepository }, []);
    await expect(
      command(ACCOUNT_ID, USER_ID, () =>
        localService.create(ACCOUNT_ID, {
          employeeCode: 'LAB-001',
          fullName: 'Vínculo indevido',
          professionId: foreignProfession.id
        })
      )
    ).rejects.toThrow(/not found|profession/i);

    const visibleLocally = await command(ACCOUNT_ID, USER_ID, () =>
      localRepository.findProfessionsByAccountId(ACCOUNT_ID)
    );
    expect(visibleLocally).toHaveLength(1);
    expect(visibleLocally[0]?.id).not.toBe(foreignProfession.id);
  });
});

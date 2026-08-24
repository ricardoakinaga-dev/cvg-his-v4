import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import {
  CommissionsService,
  DatabaseCommissionRepository,
  DatabaseCommissionSourceAuthority
} from '../../../packages/modules/commissions/src/index.js';
import {
  DatabaseFinancialPayablesRepository,
  FinancialPayablesService
} from '../../../packages/modules/financial/src/index.js';
import { closeDatabaseClient, createDatabaseClient } from '../../../packages/shared/database/src/index.js';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID() as AccountId;
const OTHER_TENANT_ID = randomUUID();
const OTHER_ACCOUNT_ID = randomUUID() as AccountId;
const USER_ID = randomUUID() as UserId;
const OTHER_USER_ID = randomUUID() as UserId;
const OWNER_ID = randomUUID();
const PATIENT_ID = randomUUID();
const ENCOUNTER_ID = randomUUID();
const PROFESSION_ID = randomUUID();
const STAFF_ID = randomUUID();
const BILLING_RECORD_ID = `commission-record-${randomUUID()}`;
const BILLING_ITEM_ID = `commission-item-${randomUUID()}`;
const COMMISSION_AUTHORITY_MIGRATION_PATH = resolve(
  process.cwd(),
  'packages/db/migrations/0131_commissions_staff_authority.sql'
);

const tenantContext = {
  tenantId: TENANT_ID,
  accountId: ACCOUNT_ID,
  userId: USER_ID,
  correlationId: 'commission-authority-postgres'
};

async function seedFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, 'Commission authority tenant', 'active'),
            ($3, $4, 'Commission authority other tenant', 'active')`,
    [
      TENANT_ID,
      `commission-${TENANT_ID.slice(0, 8)}`,
      OTHER_TENANT_ID,
      `commission-other-${OTHER_TENANT_ID.slice(0, 8)}`
    ]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $3, $4, 'Commission authority account'),
            ($2, $5, $6, 'Commission authority other account')`,
    [
      ACCOUNT_ID,
      OTHER_ACCOUNT_ID,
      TENANT_ID,
      `commission-account-${ACCOUNT_ID.slice(0, 8)}`,
      OTHER_TENANT_ID,
      `commission-other-account-${OTHER_ACCOUNT_ID.slice(0, 8)}`
    ]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $3, $5, $6, 'hash', 'Commission authority user'),
            ($2, $4, $7, $8, 'hash', 'Commission authority other user')`,
    [
      USER_ID,
      OTHER_USER_ID,
      ACCOUNT_ID,
      OTHER_ACCOUNT_ID,
      `commission-${USER_ID.slice(0, 8)}`,
      `commission-${USER_ID.slice(0, 8)}@example.test`,
      `commission-${OTHER_USER_ID.slice(0, 8)}`,
      `commission-${OTHER_USER_ID.slice(0, 8)}@example.test`
    ]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'Commission owner')`,
    [OWNER_ID, ACCOUNT_ID]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Commission patient', 'canine')`,
    [PATIENT_ID, ACCOUNT_ID, OWNER_ID]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'open', $5)`,
    [ENCOUNTER_ID, ACCOUNT_ID, PATIENT_ID, OWNER_ID, USER_ID]
  );
  await pool.query(
    `INSERT INTO professions (id, account_id, code, name, is_active)
     VALUES ($1, $2, 'VET', 'Médico Veterinário', true)`,
    [PROFESSION_ID, ACCOUNT_ID]
  );
  await pool.query(
    `INSERT INTO staff (
       id, account_id, employee_code, full_name, department, job_title,
       profession_id, is_active
     ) VALUES ($1, $2, 'STAFF-COMMISSION', 'Dra. Fonte Oficial', 'Clínica',
       'Médica Veterinária', $3, true)`,
    [STAFF_ID, ACCOUNT_ID, PROFESSION_ID]
  );
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, 'settled', 200, 'BRL')`,
    [BILLING_RECORD_ID, ACCOUNT_ID, ENCOUNTER_ID, PATIENT_ID, OWNER_ID]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type, description,
       quantity, unit_price_amount, total_amount, created_by_user_id, created_at
     ) VALUES ($1, $2, $3, $4, 'service', 'Consulta oficial', 1, 200, 200, $5,
       '2026-05-10T12:00:00.000Z')`,
    [BILLING_ITEM_ID, ACCOUNT_ID, BILLING_RECORD_ID, ENCOUNTER_ID, USER_ID]
  );
}

async function cleanupFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM commission_lines WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM commission_calculations WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM commission_rules WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM financial_payables WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM billing_items WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM billing_records WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM staff WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM professions WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM encounters WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM patients WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM owners WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM users WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM accounts WHERE id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM accounts WHERE id = $1', [OTHER_ACCOUNT_ID]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [OTHER_TENANT_ID]);
}

async function replayCommissionAuthorityMigration(): Promise<void> {
  const sql = await readFile(COMMISSION_AUTHORITY_MIGRATION_PATH, 'utf8');
  await getTestPool().query(sql);
}

beforeAll(async () => {
  createDatabaseClient(TEST_DB_URL);
  await seedFixture();
});

afterAll(async () => {
  await cleanupFixture();
  await closeDatabaseClient();
});

function calculationInput() {
  return {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [{
      staffId: STAFF_ID,
      staffName: 'Nome forjado',
      department: 'Departamento forjado',
      jobTitle: 'Cargo forjado',
      itemKind: 'product' as const,
      sourceType: 'billing_item' as const,
      sourceId: BILLING_ITEM_ID,
      sourceDescription: 'Descrição forjada',
      baseAmount: 1,
      occurredAt: '2026-05-01'
    }]
  };
}

describe('commission authority PostgreSQL contract', () => {
  it('validates tenant-safe commission constraints and rejects a cross-account rule creator', async () => {
    const constraintNames = [
      'commission_rules_account_staff_fk',
      'commission_rules_account_creator_fk',
      'commission_calculations_account_creator_fk',
      'commission_calculations_account_reviewer_fk',
      'commission_calculations_account_payer_fk',
      'commission_calculations_account_canceller_fk',
      'commission_calculations_account_payable_fk',
      'commission_calculations_paid_payable_chk',
      'commission_lines_account_calculation_fk',
      'commission_lines_account_rule_fk',
      'commission_lines_staff_account_fk',
      'commission_lines_profession_account_fk'
    ];
    const constraints = await getTestPool().query<{
      readonly conname: string;
      readonly convalidated: boolean;
    }>(
      `SELECT conname, convalidated
         FROM pg_catalog.pg_constraint
        WHERE conrelid IN (
          'commission_rules'::regclass,
          'commission_calculations'::regclass,
          'commission_lines'::regclass
        )
          AND conname = ANY($1::text[])
        ORDER BY conname`,
      [constraintNames]
    );
    expect(constraints.rows.map((row) => row.conname).sort()).toEqual([...constraintNames].sort());
    expect(constraints.rows.every((row) => row.convalidated)).toBe(true);

    await expect(
      getTestPool().query(
        `INSERT INTO commission_rules (
           id, account_id, description, scope, item_kind, percentage, created_by_user_id
         ) VALUES ($1, $2, 'Cross-account creator', 'global', 'any', 10, $3)`,
        [`cross-account-rule-${randomUUID()}`, ACCOUNT_ID, OTHER_USER_ID]
      )
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('replays 0131 with existing and partially missing constraints', async () => {
    const beforeReplay = await getTestPool().query<{
      readonly conname: string;
      readonly convalidated: boolean;
    }>(
      `SELECT conname, convalidated
         FROM pg_catalog.pg_constraint
        WHERE (conrelid = 'commission_rules'::regclass
               AND conname = 'commission_rules_account_staff_fk')
           OR (conrelid = 'commission_lines'::regclass
               AND conname IN (
                 'commission_lines_staff_account_fk',
                 'commission_lines_profession_account_fk'
               ))
           OR (conrelid = 'commission_calculations'::regclass
               AND conname = 'commission_calculations_paid_payable_chk')
        ORDER BY conname`
    );
    expect(beforeReplay.rows).toHaveLength(4);

    await replayCommissionAuthorityMigration();

    const afterExistingReplay = await getTestPool().query<{
      readonly conname: string;
      readonly convalidated: boolean;
    }>(
      `SELECT conname, convalidated
         FROM pg_catalog.pg_constraint
        WHERE (conrelid = 'commission_rules'::regclass
               AND conname = 'commission_rules_account_staff_fk')
           OR (conrelid = 'commission_lines'::regclass
               AND conname IN (
                 'commission_lines_staff_account_fk',
                 'commission_lines_profession_account_fk'
               ))
           OR (conrelid = 'commission_calculations'::regclass
               AND conname = 'commission_calculations_paid_payable_chk')
        ORDER BY conname`
    );
    expect(afterExistingReplay.rows).toEqual(beforeReplay.rows);

    await getTestPool().query(
      'ALTER TABLE commission_rules DROP CONSTRAINT IF EXISTS commission_rules_account_staff_fk'
    );
    await getTestPool().query(
      'ALTER TABLE commission_lines DROP CONSTRAINT IF EXISTS commission_lines_profession_account_fk'
    );

    await replayCommissionAuthorityMigration();

    const afterPartialReplay = await getTestPool().query<{ readonly conname: string }>(
      `SELECT conname
         FROM pg_catalog.pg_constraint
        WHERE (conrelid = 'commission_rules'::regclass
               AND conname = 'commission_rules_account_staff_fk')
           OR (conrelid = 'commission_lines'::regclass
               AND conname IN (
                 'commission_lines_staff_account_fk',
                 'commission_lines_profession_account_fk'
               ))
           OR (conrelid = 'commission_calculations'::regclass
               AND conname = 'commission_calculations_paid_payable_chk')
        ORDER BY conname`
    );
    expect(afterPartialReplay.rows.map((row) => row.conname)).toEqual(
      beforeReplay.rows.map((row) => row.conname)
    );
  });

  it('persists authoritative staff/profession/source snapshots and blocks duplicate billing sources', async () => {
    const migration = await getTestPool().query<{ readonly count: number }>(
      `SELECT COUNT(*)::int AS count
         FROM drizzle_migrations
        WHERE migration_name = '0131_commissions_staff_authority'`
    );
    expect(migration.rows[0]?.count).toBe(1);

    const financialPayables = new FinancialPayablesService(new DatabaseFinancialPayablesRepository());
    const service = new CommissionsService({
      repository: new DatabaseCommissionRepository(),
      sourceAuthority: new DatabaseCommissionSourceAuthority(),
      payableGateway: financialPayables
    });

    const calculation = await runWithTenantContext(tenantContext, async () => {
      await service.createRule(ACCOUNT_ID, USER_ID, {
        description: 'Comissão clínica',
        itemKind: 'service',
        percentage: 10
      });
      return service.calculate(ACCOUNT_ID, USER_ID, calculationInput());
    });

    expect(calculation.totalBaseAmount).toBe(200);
    expect(calculation.totalCommissionAmount).toBe(20);
    expect(calculation.lines[0]).toMatchObject({
      staffName: 'Dra. Fonte Oficial',
      department: 'Clínica',
      jobTitle: 'Médica Veterinária',
      professionId: PROFESSION_ID,
      professionName: 'Médico Veterinário',
      itemKind: 'service',
      sourceDescription: 'Consulta oficial',
      baseAmount: 200,
      occurredAt: '2026-05-10'
    });

    const persisted = await getTestPool().query<{
      readonly staff_name: string;
      readonly profession_id: string;
      readonly profession_name: string;
      readonly base_amount: string;
      readonly source_description: string;
    }>(
      `SELECT staff_name, profession_id::text, profession_name, base_amount::text, source_description
         FROM commission_lines
        WHERE account_id = $1 AND calculation_id = $2`,
      [ACCOUNT_ID, calculation.id]
    );
    expect(persisted.rows[0]).toEqual({
      staff_name: 'Dra. Fonte Oficial',
      profession_id: PROFESSION_ID,
      profession_name: 'Médico Veterinário',
      base_amount: '200.00',
      source_description: 'Consulta oficial'
    });

    const paid = await runWithTenantContext(tenantContext, async () => {
      await service.review(ACCOUNT_ID, calculation.id, USER_ID);
      return service.markPaid(ACCOUNT_ID, calculation.id, USER_ID, {
        paymentMethod: 'bank_transfer',
        paymentReference: 'COMMISSION-POSTGRES-001'
      });
    });
    expect(paid.status).toBe('paid');
    expect(paid.payableId).toBeTruthy();

    const payable = await getTestPool().query<{
      readonly account_id: string;
      readonly status: string;
      readonly total_amount: string;
      readonly paid_amount: string;
      readonly outstanding_amount: string;
      readonly source_expense_id: string;
    }>(
      `SELECT account_id::text, status, total_amount::text, paid_amount::text,
              outstanding_amount::text, source_expense_id
         FROM financial_payables
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_ID, paid.payableId]
    );
    expect(payable.rows[0]).toEqual({
      account_id: ACCOUNT_ID,
      status: 'paid',
      total_amount: '20.00',
      paid_amount: '20.00',
      outstanding_amount: '0.00',
      source_expense_id: calculation.id
    });

    const replay = new CommissionsService({
      repository: new DatabaseCommissionRepository(),
      sourceAuthority: new DatabaseCommissionSourceAuthority()
    });
    await expect(
      runWithTenantContext(tenantContext, () => replay.calculate(ACCOUNT_ID, USER_ID, calculationInput()))
    ).rejects.toThrow(/already been used|duplicated/i);
  });

  it('serializes concurrent payments across service instances and creates one payable', async () => {
    const concurrentBillingItemId = `commission-item-${randomUUID()}`;
    await getTestPool().query(
      `INSERT INTO billing_items (
         id, account_id, billing_record_id, encounter_id, item_type, description,
         quantity, unit_price_amount, total_amount, created_by_user_id, created_at
       ) VALUES ($1, $2, $3, $4, 'service', 'Consulta concorrente', 1, 150, 150, $5,
         '2026-05-12T12:00:00.000Z')`,
      [concurrentBillingItemId, ACCOUNT_ID, BILLING_RECORD_ID, ENCOUNTER_ID, USER_ID]
    );

    const createService = () => new CommissionsService({
      repository: new DatabaseCommissionRepository(),
      sourceAuthority: new DatabaseCommissionSourceAuthority(),
      payableGateway: new FinancialPayablesService(new DatabaseFinancialPayablesRepository())
    });
    const firstService = createService();
    const secondService = createService();

    const calculation = await runWithTenantContext(tenantContext, async () => {
      await firstService.hydrateFromDatabase(ACCOUNT_ID);
      await firstService.createRule(ACCOUNT_ID, USER_ID, {
        description: 'Comissão de pagamento concorrente',
        itemKind: 'service',
        percentage: 10
      });
      const created = await firstService.calculate(ACCOUNT_ID, USER_ID, {
        periodStart: '2026-05-01',
        periodEnd: '2026-05-31',
        lines: [{
          staffId: STAFF_ID,
          staffName: 'Nome forjado',
          department: 'Departamento forjado',
          jobTitle: 'Cargo forjado',
          itemKind: 'product',
          sourceType: 'billing_item',
          sourceId: concurrentBillingItemId,
          sourceDescription: 'Descrição forjada',
          baseAmount: 1,
          occurredAt: '2026-05-01'
        }]
      });
      await firstService.review(ACCOUNT_ID, created.id, USER_ID);
      await secondService.hydrateFromDatabase(ACCOUNT_ID);
      return created;
    });

    const [first, second] = await runWithTenantContext(tenantContext, () => Promise.all([
      firstService.markPaid(ACCOUNT_ID, calculation.id, USER_ID, {
        paymentMethod: 'pix',
        paymentReference: 'CONCURRENT-1'
      }),
      secondService.markPaid(ACCOUNT_ID, calculation.id, USER_ID, {
        paymentMethod: 'pix',
        paymentReference: 'CONCURRENT-1'
      })
    ]));

    expect(first.status).toBe('paid');
    expect(second.status).toBe('paid');
    expect(first.payableId).toBe(second.payableId);

    const payables = await getTestPool().query<{ readonly count: number; readonly status: string }>(
      `SELECT COUNT(*)::int AS count, MIN(status) AS status
         FROM financial_payables
        WHERE account_id = $1 AND source_expense_id = $2`,
      [ACCOUNT_ID, calculation.id]
    );
    expect(payables.rows[0]).toEqual({ count: 1, status: 'paid' });
  });

  it('enforces the paid calculation payable invariant at the database boundary', async () => {
    const service = new CommissionsService({
      repository: new DatabaseCommissionRepository(),
      sourceAuthority: new DatabaseCommissionSourceAuthority()
    });
    await runWithTenantContext(tenantContext, () => service.hydrateFromDatabase(ACCOUNT_ID));
    const calculation = await runWithTenantContext(tenantContext, async () => {
      await service.createRule(ACCOUNT_ID, USER_ID, {
        description: 'Comissão clínica sem fonte',
        percentage: 10
      });
      return service.calculate(ACCOUNT_ID, USER_ID, {
        periodStart: '2026-06-01',
        periodEnd: '2026-06-30',
        lines: []
      });
    });

    await expect(
      getTestPool().query(
        `UPDATE commission_calculations
            SET status = 'paid', payable_id = NULL
          WHERE account_id = $1 AND id = $2`,
        [ACCOUNT_ID, calculation.id]
      )
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('keeps commission rows invisible across accounts under the RLS role', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, OTHER_ACCOUNT_ID);
      const result = await client.query(
        `SELECT COUNT(*)::int AS count
           FROM commission_lines
          WHERE account_id = $1`,
        [ACCOUNT_ID]
      );
      expect(result.rows[0]?.count).toBe(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});

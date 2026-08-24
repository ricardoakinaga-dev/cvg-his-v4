import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { PoolClient } from 'pg';

import { getTestPool } from '../../db/db-admin.js';
import { queryOne } from '../../helpers/db-helpers.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const RECEIPT_AMOUNT = '125.50';

interface CashReceiptFixture {
  readonly accountId: string;
  readonly billingRecordId: string;
  readonly cashMovementId: string;
  readonly cashRegisterId: string;
  readonly encounterId: string;
  readonly financialAccountId: string;
  readonly journalEntryId: string;
  readonly receiptId: string;
  readonly receivableId: string;
  readonly receivablePaymentId: string;
  readonly userId: string;
}

interface FixtureOverrides {
  readonly billingAmount?: string;
  readonly billingStatus?: 'open' | 'settled';
  readonly encounterStatus?: 'open' | 'closed';
  readonly financialStatus?: 'partial' | 'paid';
  readonly financialAmount?: string;
  readonly journalAmount?: string;
  readonly journalCashAccountCode?: string;
  readonly journalSourceType?: string;
  readonly movementAmount?: string;
  readonly movementType?: 'payment' | 'supply';
  readonly paymentAmount?: string;
  readonly paymentExternalReferenceId?: string;
  readonly paymentExternalReferenceType?: string;
  readonly receiptAmount?: string;
  readonly receiptCurrency?: string;
  readonly receivableAmount?: string;
  readonly receivableStatus?: 'open' | 'settled';
  readonly registerStatus?: 'open' | 'closed';
}

function createFixtureIds(): CashReceiptFixture {
  const receiptId = randomUUID();
  return {
    accountId: randomUUID(),
    billingRecordId: `cash-billing-${receiptId}`,
    cashMovementId: randomUUID(),
    cashRegisterId: randomUUID(),
    encounterId: randomUUID(),
    financialAccountId: randomUUID(),
    journalEntryId: randomUUID(),
    receiptId,
    receivableId: randomUUID(),
    receivablePaymentId: randomUUID(),
    userId: randomUUID()
  };
}

async function insertCashReceiptFixture(
  client: PoolClient,
  overrides: FixtureOverrides = {}
): Promise<CashReceiptFixture> {
  const ids = createFixtureIds();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const suffix = ids.receiptId.replaceAll('-', '');

  await client.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Cash receipt integrity account')`,
    [ids.accountId, DEFAULT_TENANT_ID, `cash-receipt-${suffix}`]
  );
  await client.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'Cash receipt operator')`,
    [ids.userId, ids.accountId, `cash_operator_${suffix}`, `cash-${suffix}@example.com`]
  );
  await client.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Cash receipt owner')`,
    [ownerId, ids.accountId]
  );
  await client.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Cash receipt patient', 'canine')`,
    [patientId, ids.accountId, ownerId]
  );
  await client.query(
    `INSERT INTO encounters (
       id, account_id, patient_id, owner_id, status, opened_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      ids.encounterId,
      ids.accountId,
      patientId,
      ownerId,
      overrides.encounterStatus ?? 'closed',
      ids.userId
    ]
  );
  await client.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status,
       subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'BRL')`,
    [
      ids.billingRecordId,
      ids.accountId,
      ids.encounterId,
      patientId,
      ownerId,
      overrides.billingStatus ?? 'settled',
      overrides.billingAmount ?? RECEIPT_AMOUNT
    ]
  );
  await client.query(
    `INSERT INTO encounter_financial_accounts (
       id, account_id, encounter_id, financial_status, subtotal_snapshot,
       total_snapshot, paid_amount, balance_due, closed_by_user_id, closed_at
     ) VALUES ($1, $2, $3, $4, $5, $5, $5, 0, $6, now())`,
    [
      ids.financialAccountId,
      ids.accountId,
      ids.encounterId,
      overrides.financialStatus ?? 'paid',
      overrides.financialAmount ?? RECEIPT_AMOUNT,
      ids.userId
    ]
  );
  await client.query(
    `INSERT INTO encounter_receivables (
       id, account_id, encounter_id, financial_account_id, status,
       amount_original, amount_paid, amount_outstanding, settled_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $6, 0, now())`,
    [
      ids.receivableId,
      ids.accountId,
      ids.encounterId,
      ids.financialAccountId,
      overrides.receivableStatus ?? 'settled',
      overrides.receivableAmount ?? RECEIPT_AMOUNT
    ]
  );
  await client.query(
    `INSERT INTO cash_registers (
       id, account_id, opened_by_user_id, opening_amount, status
     ) VALUES ($1, $2, $3, 0, $4)`,
    [ids.cashRegisterId, ids.accountId, ids.userId, overrides.registerStatus ?? 'open']
  );
  await client.query(
    `INSERT INTO cash_movements (
       id, cash_register_id, account_id, movement_type, amount,
       running_balance, reference, created_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7)`,
    [
      ids.cashMovementId,
      ids.cashRegisterId,
      ids.accountId,
      overrides.movementType ?? 'payment',
      overrides.movementAmount ?? RECEIPT_AMOUNT,
      ids.receiptId,
      ids.userId
    ]
  );
  await client.query(
    `INSERT INTO encounter_receivable_payments (
       id, account_id, encounter_id, financial_account_id, receivable_id,
       amount_paid, paid_by_user_id, external_reference_type,
       external_reference_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      ids.receivablePaymentId,
      ids.accountId,
      ids.encounterId,
      ids.financialAccountId,
      ids.receivableId,
      overrides.paymentAmount ?? RECEIPT_AMOUNT,
      ids.userId,
      overrides.paymentExternalReferenceType ?? 'cash_movement',
      overrides.paymentExternalReferenceId ?? ids.cashMovementId
    ]
  );
  await client.query(
    `INSERT INTO financial_journal_entries (
       id, account_id, source_type, source_id, description, occurred_at,
       created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'Encounter cash receipt', now(), $5)`,
    [
      ids.journalEntryId,
      ids.accountId,
      overrides.journalSourceType ?? 'encounter_cash_receipt',
      ids.receiptId,
      ids.userId
    ]
  );
  await client.query(
    `INSERT INTO financial_journal_lines (
       id, account_id, entry_id, account_code, debit, credit
     ) VALUES
       ($1, $3, $4, $6, $5, 0),
       ($2, $3, $4, '3.1.01-receita-clinica', 0, $5)`,
    [
      randomUUID(),
      randomUUID(),
      ids.accountId,
      ids.journalEntryId,
      overrides.journalAmount ?? RECEIPT_AMOUNT,
      overrides.journalCashAccountCode ?? '1.1.01-caixa'
    ]
  );
  await client.query(
    `INSERT INTO encounter_cash_receipts (
       id, account_id, encounter_id, billing_record_id, financial_account_id,
       receivable_id, receivable_payment_id, cash_register_id,
       cash_movement_id, journal_entry_id, received_by_user_id,
       amount, currency, notes
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
       'Full cash settlement'
     )`,
    [
      ids.receiptId,
      ids.accountId,
      ids.encounterId,
      ids.billingRecordId,
      ids.financialAccountId,
      ids.receivableId,
      ids.receivablePaymentId,
      ids.cashRegisterId,
      ids.cashMovementId,
      ids.journalEntryId,
      ids.userId,
      overrides.receiptAmount ?? RECEIPT_AMOUNT,
      overrides.receiptCurrency ?? 'BRL'
    ]
  );

  return ids;
}

describe('encounter cash receipt migration and constraints', () => {
  it('records migration 0108 and creates the receipt with forced tenant RLS', async () => {
    const migration = await queryOne<{ migration_name: string }>(
      `SELECT migration_name FROM drizzle_migrations
       WHERE migration_name = '0108_encounter_cash_receipts'`
    );
    const table = await queryOne<{ force_rls: boolean; rls: boolean }>(
      `SELECT relforcerowsecurity AS force_rls, relrowsecurity AS rls
       FROM pg_class
       WHERE oid = 'public.encounter_cash_receipts'::regclass`
    );
    const policy = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'encounter_cash_receipts'
         AND policyname = 'encounter_cash_receipts_tenant_isolation'`
    );

    expect(migration?.migration_name).toBe('0108_encounter_cash_receipts');
    expect(table).toEqual({ force_rls: true, rls: true });
    expect(policy?.count).toBe(1);
  });

  it('has canonical uniqueness and tenant-safe foreign keys', async () => {
    const uniqueConstraints = await getTestPool().query<{ definition: string }>(
      `SELECT pg_get_indexdef(indexrelid) AS definition
       FROM pg_index
       WHERE indrelid = 'encounter_cash_receipts'::regclass
         AND indisunique
       ORDER BY definition`
    );
    const foreignKeys = await getTestPool().query<{ definition: string }>(
      `SELECT pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE conrelid = 'encounter_cash_receipts'::regclass
         AND contype = 'f'`
    );
    const uniqueSql = uniqueConstraints.rows.map((row) => row.definition).join('\n');
    const foreignKeySql = foreignKeys.rows.map((row) => row.definition).join('\n');

    expect(uniqueSql).toContain('(account_id, encounter_id)');
    expect(uniqueSql).toContain('(receivable_payment_id)');
    expect(uniqueSql).toContain('(cash_movement_id)');
    expect(uniqueSql).toContain('(journal_entry_id)');
    expect(foreignKeySql).toContain(
      'FOREIGN KEY (account_id, encounter_id) REFERENCES encounters(account_id, id)'
    );
    expect(foreignKeySql).toContain(
      'FOREIGN KEY (account_id, billing_record_id) REFERENCES billing_records(account_id, id)'
    );
    expect(foreignKeySql).toContain(
      'FOREIGN KEY (account_id, receivable_payment_id) REFERENCES encounter_receivable_payments(account_id, id)'
    );
    expect(foreignKeySql).toContain(
      'FOREIGN KEY (account_id, cash_movement_id) REFERENCES cash_movements(account_id, id)'
    );
    expect(foreignKeySql).toContain(
      'FOREIGN KEY (account_id, journal_entry_id) REFERENCES financial_journal_entries(account_id, id)'
    );
  });

  it('adds an explicit abort guard before enforcing one open cash register per account', () => {
    const migrationSql = readFileSync(
      resolve(process.cwd(), 'packages/db/migrations/0108_encounter_cash_receipts.sql'),
      'utf8'
    );
    const guardPosition = migrationSql.indexOf('Cannot enforce one open cash register per account');
    const uniqueIndexPosition = migrationSql.indexOf('uidx_cash_registers_one_open_per_account');

    expect(guardPosition).toBeGreaterThan(-1);
    expect(uniqueIndexPosition).toBeGreaterThan(guardPosition);
    expect(migrationSql).not.toMatch(/UPDATE\s+cash_registers[\s\S]+status/iu);
  });

  it('prevents a second open cash register for the same account', async () => {
    const pool = getTestPool();
    const client = await pool.connect();
    const accountId = randomUUID();
    const userId = randomUUID();
    const suffix = accountId.replaceAll('-', '');

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO accounts (id, tenant_id, slug, name)
         VALUES ($1, $2, $3, 'Duplicate cash register test')`,
        [accountId, DEFAULT_TENANT_ID, `duplicate-register-${suffix}`]
      );
      await client.query(
        `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
         VALUES ($1, $2, $3, $4, 'hash', 'Duplicate register operator')`,
        [userId, accountId, `register_${suffix}`, `register-${suffix}@example.com`]
      );
      await client.query(
        `INSERT INTO cash_registers (id, account_id, opened_by_user_id, opening_amount)
         VALUES ($1, $3, $4, 0), ($2, $3, $4, 0)`,
        [randomUUID(), randomUUID(), accountId, userId]
      );
      expect.unreachable('The unique partial index must reject duplicate open registers');
    } catch (error) {
      expect(String(error)).toContain('uidx_cash_registers_one_open_per_account');
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('accepts one fully consistent receipt at the deferred constraint boundary', async () => {
    const client = await getTestPool().connect();

    try {
      await client.query('BEGIN');
      await insertCashReceiptFixture(client);
      await expect(
        client.query('SET CONSTRAINTS encounter_cash_receipts_consistency_trigger IMMEDIATE')
      ).resolves.toBeDefined();
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('rechecks later artifact changes while allowing a legitimate drawer close', async () => {
    const client = await getTestPool().connect();
    let fixture: CashReceiptFixture | null = null;

    try {
      await client.query('BEGIN');
      fixture = await insertCashReceiptFixture(client);
      await client.query('SET CONSTRAINTS encounter_cash_receipts_consistency_trigger IMMEDIATE');
      await client.query(
        `UPDATE cash_registers
         SET status = 'closed', closed_at = clock_timestamp(),
             closed_by_user_id = $2, updated_at = clock_timestamp()
         WHERE id = $1`,
        [fixture.cashRegisterId, fixture.userId]
      );
      await expect(
        client.query('SET CONSTRAINTS encounter_cash_receipts_register_recheck_trigger IMMEDIATE')
      ).resolves.toBeDefined();

      await client.query('SAVEPOINT immutable_receipt_update');
      await expect(
        client.query(
          `UPDATE encounter_cash_receipts
           SET received_at = received_at + INTERVAL '1 second'
           WHERE id = $1`,
          [fixture.receiptId]
        )
      ).rejects.toThrow(/financial proof is immutable/);
      await client.query('ROLLBACK TO SAVEPOINT immutable_receipt_update');

      await client.query('SAVEPOINT append_only_receipt_delete');
      await expect(
        client.query('DELETE FROM encounter_cash_receipts WHERE id = $1', [fixture.receiptId])
      ).rejects.toThrow(/append-only/);
      await client.query('ROLLBACK TO SAVEPOINT append_only_receipt_delete');

      await client.query(
        `UPDATE encounter_cash_receipts SET notes = 'Drawer closed after receipt' WHERE id = $1`,
        [fixture.receiptId]
      );
      await expect(
        client.query('SET CONSTRAINTS encounter_cash_receipts_consistency_trigger IMMEDIATE')
      ).resolves.toBeDefined();

      await client.query('SAVEPOINT payment_recheck');
      await client.query(
        `UPDATE encounter_receivable_payments SET amount_paid = amount_paid - 1 WHERE id = $1`,
        [fixture.receivablePaymentId]
      );
      await expect(
        client.query('SET CONSTRAINTS encounter_cash_receipts_payment_recheck_trigger IMMEDIATE')
      ).rejects.toThrow(/Encounter cash receipt .* inconsistent/);
      await client.query('ROLLBACK TO SAVEPOINT payment_recheck');

      await client.query('SAVEPOINT journal_recheck');
      await client.query(
        `DELETE FROM financial_journal_lines
         WHERE id = (
           SELECT id FROM financial_journal_lines
           WHERE entry_id = $1
           ORDER BY id
           LIMIT 1
         )`,
        [fixture.journalEntryId]
      );
      await expect(
        client.query(
          'SET CONSTRAINTS encounter_cash_receipts_journal_lines_recheck_trigger IMMEDIATE'
        )
      ).rejects.toThrow(/Encounter cash receipt .* inconsistent/);
      await client.query('ROLLBACK TO SAVEPOINT journal_recheck');
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it.each([
    ['a zero amount', { receiptAmount: '0' }, 'encounter_cash_receipts_amount_positive_chk'],
    ['a non-BRL currency', { receiptCurrency: 'USD' }, 'encounter_cash_receipts_currency_brl_chk']
  ] as const)('rejects %s at the table boundary', async (_label, overrides, constraintName) => {
    const client = await getTestPool().connect();

    try {
      await client.query('BEGIN');
      await expect(insertCashReceiptFixture(client, overrides)).rejects.toThrow(constraintName);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it.each([
    ['receipt amount', { receiptAmount: '124.50' }],
    ['encounter status', { encounterStatus: 'open' }],
    ['billing amount', { billingAmount: '124.50' }],
    ['billing status', { billingStatus: 'open' }],
    ['financial amount', { financialAmount: '124.50' }],
    ['financial status', { financialStatus: 'partial' }],
    ['receivable amount', { receivableAmount: '124.50' }],
    ['receivable status', { receivableStatus: 'open' }],
    ['cash register status', { registerStatus: 'closed' }],
    ['cash movement type', { movementType: 'supply' }],
    ['cash movement amount', { movementAmount: '124.50' }],
    ['receivable payment amount', { paymentAmount: '124.50' }],
    ['receivable payment reference type', { paymentExternalReferenceType: 'other' }],
    ['receivable payment reference id', { paymentExternalReferenceId: randomUUID() }],
    ['journal amount', { journalAmount: '124.50' }],
    ['journal cash account', { journalCashAccountCode: '1.1.09-outros' }],
    ['journal source', { journalSourceType: 'manual_adjustment' }]
  ] as const)('rejects an inconsistent %s at commit', async (_label, overrides) => {
    const client = await getTestPool().connect();

    try {
      await client.query('BEGIN');
      await insertCashReceiptFixture(client, overrides);
      await expect(
        client.query('SET CONSTRAINTS encounter_cash_receipts_consistency_trigger IMMEDIATE')
      ).rejects.toThrow(/Encounter cash receipt .* inconsistent/);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

import { randomUUID } from 'node:crypto';

import { Pool, type PoolClient } from 'pg';

import { TEST_DB_URL } from '../../setup/env.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

describe('encounter cash receipt RLS', () => {
  let pool: Pool;
  let adminClient: PoolClient;
  const accountA = randomUUID();
  const accountB = randomUUID();
  const receiptB = randomUUID();
  const reversalB = randomUUID();

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DB_URL });
    adminClient = await pool.connect();
    await adminClient.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES
         ($1, $3, $4, 'Cash receipt RLS account A'),
         ($2, $3, $5, 'Cash receipt RLS account B')`,
      [
        accountA,
        accountB,
        DEFAULT_TENANT_ID,
        `cash-receipt-rls-a-${accountA}`,
        `cash-receipt-rls-b-${accountB}`
      ]
    );

    // RLS behavior is isolated from settlement integrity in this suite. The
    // database-only setup bypasses FK/constraint triggers solely to place a
    // foreign-tenant row that an application role must never observe.
    await adminClient.query('SET session_replication_role = replica');
    try {
      await adminClient.query(
        `INSERT INTO encounter_cash_receipts (
           id, account_id, encounter_id, billing_record_id, financial_account_id,
           receivable_id, receivable_payment_id, cash_register_id,
           cash_movement_id, journal_entry_id, received_by_user_id,
           amount, currency
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 10, 'BRL'
         )`,
        [
          receiptB,
          accountB,
          randomUUID(),
          `cash-receipt-rls-${receiptB}`,
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID()
        ]
      );
      await adminClient.query(
        `INSERT INTO encounter_cash_receipt_reversals (
           id, account_id, receipt_id, encounter_id, billing_record_id,
           financial_account_id, receivable_id, receivable_payment_id,
           original_cash_register_id, reversal_cash_register_id,
           original_cash_movement_id, reversal_cash_movement_id,
           original_journal_entry_id, reversal_journal_entry_id,
           amount, currency, reason, reversed_by_user_id
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
           10, 'BRL', 'RLS fixture', $15
         )`,
        [
          reversalB,
          accountB,
          receiptB,
          randomUUID(),
          `cash-reversal-rls-${reversalB}`,
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID(),
          randomUUID()
        ]
      );
    } finally {
      await adminClient.query('SET session_replication_role = origin');
    }
  });

  afterAll(async () => {
    if (adminClient) {
      await adminClient.query('SET session_replication_role = replica');
      try {
        await adminClient.query('DELETE FROM encounter_cash_receipt_reversals WHERE id = $1', [
          reversalB
        ]);
        await adminClient.query('DELETE FROM encounter_cash_receipts WHERE id = $1', [receiptB]);
        await adminClient.query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [
          [accountA, accountB]
        ]);
      } finally {
        await adminClient.query('SET session_replication_role = origin');
      }
      adminClient.release();
    }
    await pool.end();
  });

  it('hides and prevents updates to another account receipt', async () => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, accountA);

      const selected = await client.query('SELECT id FROM encounter_cash_receipts WHERE id = $1', [
        receiptB
      ]);
      const updated = await client.query(
        `UPDATE encounter_cash_receipts SET notes = 'cross-tenant update' WHERE id = $1`,
        [receiptB]
      );

      expect(selected.rowCount).toBe(0);
      expect(updated.rowCount).toBe(0);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('hides and prevents updates to another account reversal', async () => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, accountA);

      const selected = await client.query(
        'SELECT id FROM encounter_cash_receipt_reversals WHERE id = $1',
        [reversalB]
      );
      const updated = await client.query(
        `UPDATE encounter_cash_receipt_reversals
            SET reason = 'cross-tenant update'
          WHERE id = $1`,
        [reversalB]
      );

      expect(selected.rowCount).toBe(0);
      expect(updated.rowCount).toBe(0);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('rejects a reversal insert carrying another account id', async () => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, accountA);

      await expect(
        client.query(
          `INSERT INTO encounter_cash_receipt_reversals (
             id, account_id, receipt_id, encounter_id, billing_record_id,
             financial_account_id, receivable_id, receivable_payment_id,
             original_cash_register_id, reversal_cash_register_id,
             original_cash_movement_id, reversal_cash_movement_id,
             original_journal_entry_id, reversal_journal_entry_id,
             amount, currency, reason, reversed_by_user_id
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
             10, 'BRL', 'cross tenant', $15
           )`,
          [
            randomUUID(),
            accountB,
            randomUUID(),
            randomUUID(),
            `cross-tenant-reversal-${randomUUID()}`,
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID()
          ]
        )
      ).rejects.toThrow(/row-level security policy/iu);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('rejects an insert carrying another account id', async () => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, accountA);

      await expect(
        client.query(
          `INSERT INTO encounter_cash_receipts (
             id, account_id, encounter_id, billing_record_id, financial_account_id,
             receivable_id, receivable_payment_id, cash_register_id,
             cash_movement_id, journal_entry_id, received_by_user_id,
             amount, currency
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 10, 'BRL'
           )`,
          [
            randomUUID(),
            accountB,
            randomUUID(),
            `cross-tenant-${randomUUID()}`,
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID()
          ]
        )
      ).rejects.toThrow(/row-level security policy/iu);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

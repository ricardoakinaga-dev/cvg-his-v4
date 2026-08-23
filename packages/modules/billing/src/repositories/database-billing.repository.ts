import { getPool } from '@cvg-his-v2/shared-database';
import { ConflictError } from '@cvg-his-v2/shared-errors';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type {
  AccountId,
  BillingItemId,
  BillingItemSummary,
  BillingRecordId,
  BillingRecordSummary,
  EncounterId,
  OwnerId,
  PatientId,
  UserId
} from '@cvg-his-v2/shared-types';

export interface BillingRepository {
  createRecord(record: BillingRecordSummary): Promise<void>;
  updateRecord(record: BillingRecordSummary): Promise<void>;
  findRecordById(accountId: AccountId, id: BillingRecordId): Promise<BillingRecordSummary | null>;
  findRecordByEncounter(
    accountId: AccountId,
    encounterId: EncounterId
  ): Promise<BillingRecordSummary | null>;
  findRecordsByAccountId(accountId: AccountId): Promise<readonly BillingRecordSummary[]>;
  createItem(item: BillingItemSummary): Promise<void>;
  findItemBySource?(
    accountId: AccountId,
    sourceEntityType: NonNullable<BillingItemSummary['sourceEntityType']>,
    sourceEntityId: string
  ): Promise<BillingItemSummary | null>;
  findItemsByRecord(
    accountId: AccountId,
    recordId: BillingRecordId
  ): Promise<readonly BillingItemSummary[]>;
}

export class DatabaseBillingRepository implements BillingRepository {
  async createRecord(record: BillingRecordSummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO billing_records (id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency, administrative_notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          record.id,
          record.accountId,
          record.encounterId,
          record.patientId,
          record.ownerId,
          record.status,
          record.subtotalAmount,
          record.currency,
          record.administrativeNotes ?? null,
          new Date(record.createdAt),
          new Date(record.updatedAt)
        ]
      );
    });
  }

  async updateRecord(record: BillingRecordSummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      const current = await client.query<{
        readonly active_payment_attempt_id: string | null;
        readonly currency: string;
        readonly status: string;
        readonly subtotal_amount: string;
      }>(
        `SELECT status, subtotal_amount, currency, active_payment_attempt_id::text
           FROM billing_records
          WHERE id = $1 AND account_id = $2
          FOR UPDATE`,
        [record.id, record.accountId]
      );
      const locked = current.rows[0];
      if (
        locked?.active_payment_attempt_id &&
        (locked.status !== record.status ||
          Number(locked.subtotal_amount) !== record.subtotalAmount ||
          locked.currency !== record.currency)
      ) {
        throw new ConflictError('Billing record already has a payment in progress', {
          recordId: record.id
        });
      }
      await client.query(
        `UPDATE billing_records
         SET status = $3, subtotal_amount = $4, administrative_notes = $5, updated_at = $6
         WHERE id = $1 AND account_id = $2`,
        [
          record.id,
          record.accountId,
          record.status,
          record.subtotalAmount,
          record.administrativeNotes ?? null,
          new Date(record.updatedAt)
        ]
      );
    });
  }

  async findRecordById(
    accountId: AccountId,
    id: BillingRecordId
  ): Promise<BillingRecordSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM billing_records WHERE account_id = $1 AND id = $2',
        [accountId, id]
      );
      if (result.rows.length === 0) return null;
      return this.mapRecord(result.rows[0]);
    });
  }

  async findRecordByEncounter(
    accountId: AccountId,
    encounterId: EncounterId
  ): Promise<BillingRecordSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM billing_records
         WHERE account_id = $1 AND encounter_id = $2
         LIMIT 1`,
        [accountId, encounterId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRecord(result.rows[0]);
    });
  }

  async findRecordsByAccountId(accountId: AccountId): Promise<readonly BillingRecordSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM billing_records WHERE account_id = $1 ORDER BY created_at DESC',
        [accountId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapRecord(r));
    });
  }

  async createItem(item: BillingItemSummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      const billing = await client.query<{ readonly active_payment_attempt_id: string | null }>(
        `SELECT active_payment_attempt_id::text
           FROM billing_records
          WHERE account_id = $1 AND id = $2
          FOR UPDATE`,
        [item.accountId, item.billingRecordId]
      );
      if (billing.rows[0]?.active_payment_attempt_id) {
        throw new ConflictError('Billing record already has a payment in progress', {
          recordId: item.billingRecordId
        });
      }
      await client.query(
        `INSERT INTO billing_items (
           id, account_id, billing_record_id, encounter_id, item_type, description,
           quantity, unit_price_amount, total_amount, source_entity_type, source_entity_id,
           created_by_user_id, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          item.id,
          item.accountId,
          item.billingRecordId,
          item.encounterId,
          item.itemType,
          item.description,
          item.quantity,
          item.unitPriceAmount,
          item.totalAmount,
          item.sourceEntityType ?? null,
          item.sourceEntityId ?? null,
          item.createdByUserId,
          new Date(item.createdAt)
        ]
      );

      await client.query(
        `UPDATE billing_records
         SET subtotal_amount = (
           SELECT COALESCE(SUM(total_amount), 0)
           FROM billing_items
           WHERE account_id = $1 AND billing_record_id = $2
         ),
         updated_at = $3
         WHERE account_id = $1 AND id = $2`,
        [item.accountId, item.billingRecordId, new Date(item.createdAt)]
      );
    });
  }

  async findItemBySource(
    accountId: AccountId,
    sourceEntityType: NonNullable<BillingItemSummary['sourceEntityType']>,
    sourceEntityId: string
  ): Promise<BillingItemSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM billing_items
         WHERE account_id = $1 AND source_entity_type = $2 AND source_entity_id = $3
         LIMIT 1`,
        [accountId, sourceEntityType, sourceEntityId]
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      return row ? this.mapItem(row) : null;
    });
  }

  async findItemsByRecord(
    accountId: AccountId,
    recordId: BillingRecordId
  ): Promise<readonly BillingItemSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM billing_items
         WHERE account_id = $1 AND billing_record_id = $2
         ORDER BY created_at`,
        [accountId, recordId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapItem(r));
    });
  }

  private mapRecord(row: Record<string, unknown>): BillingRecordSummary {
    return {
      id: row.id as BillingRecordId,
      accountId: row.account_id as AccountId,
      encounterId: row.encounter_id as EncounterId,
      patientId: row.patient_id as unknown as PatientId,
      ownerId: row.owner_id as unknown as OwnerId,
      status: row.status as BillingRecordSummary['status'],
      subtotalAmount: Number(row.subtotal_amount),
      currency: row.currency as 'BRL',
      administrativeNotes: (row.administrative_notes as string) ?? undefined,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapItem(row: Record<string, unknown>): BillingItemSummary {
    return {
      id: row.id as BillingItemId,
      billingRecordId: row.billing_record_id as BillingRecordId,
      accountId: row.account_id as AccountId,
      encounterId: row.encounter_id as EncounterId,
      itemType: row.item_type as BillingItemSummary['itemType'],
      description: row.description as string,
      quantity: Number(row.quantity),
      unitPriceAmount: Number(row.unit_price_amount),
      totalAmount: Number(row.total_amount),
      sourceEntityType:
        (row.source_entity_type as BillingItemSummary['sourceEntityType']) ?? undefined,
      sourceEntityId: (row.source_entity_id as string) ?? undefined,
      createdByUserId: row.created_by_user_id as UserId,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }
}

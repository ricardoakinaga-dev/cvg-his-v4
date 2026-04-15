import { getPool } from '@cvg-his-v2/shared-database';
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
  findRecordById(id: BillingRecordId): Promise<BillingRecordSummary | null>;
  findRecordsByEncounter(encounterId: EncounterId): Promise<readonly BillingRecordSummary[]>;
  findRecordsByAccountId(accountId: AccountId): Promise<readonly BillingRecordSummary[]>;
  createItem(item: BillingItemSummary): Promise<void>;
  findItemsByRecord(recordId: BillingRecordId): Promise<readonly BillingItemSummary[]>;
}

export class DatabaseBillingRepository implements BillingRepository {
  async createRecord(record: BillingRecordSummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO billing_records (id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency, administrative_notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [record.id, record.accountId, record.encounterId, record.patientId, record.ownerId,
         record.status, record.subtotalAmount, record.currency, record.administrativeNotes ?? null,
         new Date(record.createdAt), new Date(record.updatedAt)]
      );
    });
  }

  async updateRecord(record: BillingRecordSummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE billing_records SET status = $2, subtotal_amount = $3, administrative_notes = $4, updated_at = $5 WHERE id = $1`,
        [record.id, record.status, record.subtotalAmount, record.administrativeNotes ?? null, new Date(record.updatedAt)]
      );
    });
  }

  async findRecordById(id: BillingRecordId): Promise<BillingRecordSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM billing_records WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRecord(result.rows[0]);
    });
  }

  async findRecordsByEncounter(encounterId: EncounterId): Promise<readonly BillingRecordSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM billing_records WHERE encounter_id = $1', [encounterId]);
      return result.rows.map((r: Record<string, unknown>) => this.mapRecord(r));
    });
  }

  async findRecordsByAccountId(accountId: AccountId): Promise<readonly BillingRecordSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM billing_records WHERE account_id = $1 ORDER BY created_at DESC', [accountId]);
      return result.rows.map((r: Record<string, unknown>) => this.mapRecord(r));
    });
  }

  async createItem(item: BillingItemSummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO billing_items (id, billing_record_id, encounter_id, item_type, description, quantity, unit_price_amount, total_amount, source_entity_type, source_entity_id, created_by_user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [item.id, item.billingRecordId, item.encounterId, item.itemType, item.description,
         item.quantity, item.unitPriceAmount, item.totalAmount, item.sourceEntityType ?? null,
         item.sourceEntityId ?? null, item.createdByUserId, new Date(item.createdAt)]
      );
    });
  }

  async findItemsByRecord(recordId: BillingRecordId): Promise<readonly BillingItemSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM billing_items WHERE billing_record_id = $1 ORDER BY created_at', [recordId]);
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
      accountId: row.encounter_id as AccountId,
      encounterId: row.encounter_id as EncounterId,
      itemType: row.item_type as BillingItemSummary['itemType'],
      description: row.description as string,
      quantity: Number(row.quantity),
      unitPriceAmount: Number(row.unit_price_amount),
      totalAmount: Number(row.total_amount),
      sourceEntityType: (row.source_entity_type as BillingItemSummary['sourceEntityType']) ?? undefined,
      sourceEntityId: (row.source_entity_id as string) ?? undefined,
      createdByUserId: row.created_by_user_id as UserId,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }
}

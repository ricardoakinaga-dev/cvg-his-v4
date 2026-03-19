import type { EncounterBillingItemRecord, EncounterBillingSummaryRecord, EncounterStatus } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type CreateInput = {
  accountId: string;
  encounterId: string;
  itemType: 'service' | 'product';
  catalogItemId?: string | null;
  nameSnapshot: string;
  codeSnapshot?: string | null;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  notes?: string | null;
  createdByUserId: string;
  updatedByUserId: string;
};

type UpdateInput = Partial<Pick<CreateInput, 'catalogItemId' | 'nameSnapshot' | 'codeSnapshot' | 'unitPrice' | 'quantity' | 'discountAmount' | 'notes'>> & {
  updatedByUserId: string;
};

function mapRow(row: Record<string, unknown>): EncounterBillingItemRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    encounterId: String(row.encounter_id),
    itemType: String(row.item_type) === 'product' ? 'product' : 'service',
    catalogItemId: row.catalog_item_id ? String(row.catalog_item_id) : null,
    nameSnapshot: String(row.name_snapshot),
    codeSnapshot: row.code_snapshot ? String(row.code_snapshot) : null,
    unitPrice: Number(row.unit_price),
    quantity: Number(row.quantity),
    discountAmount: Number(row.discount_amount ?? 0),
    lineTotal: Number(row.line_total),
    notes: row.notes ? String(row.notes) : null,
    createdByUserId: String(row.created_by_user_id),
    updatedByUserId: String(row.updated_by_user_id),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

function mapEncounterStatus(row: Record<string, unknown> | undefined): EncounterStatus | null {
  if (!row) return null;
  return String(row.status) === 'closed' ? 'closed' : 'open';
}

export function createEncounterBillingRepo(db: DbClient) {
  return {
    async encounterExists(accountId: string, encounterId: string) {
      const result = await db.$client.query('select id from encounters where id = $1 and account_id = $2 limit 1', [encounterId, accountId]);
      return result.rows.length > 0;
    },

    async findEncounterStatus(accountId: string, encounterId: string): Promise<EncounterStatus | null> {
      const result = await db.$client.query('select status from encounters where id = $1 and account_id = $2 limit 1', [encounterId, accountId]);
      return mapEncounterStatus(result.rows[0] as Record<string, unknown> | undefined);
    },

    async create(input: CreateInput) {
      const grossTotal = input.unitPrice * input.quantity;
      const lineTotal = grossTotal - input.discountAmount;
      const result = await db.$client.query(
        `insert into encounter_billing_items (
          account_id, encounter_id, item_type, catalog_item_id, name_snapshot, code_snapshot,
          unit_price, quantity, discount_amount, line_total, notes, created_by_user_id, updated_by_user_id
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        returning *`,
        [input.accountId, input.encounterId, input.itemType, input.catalogItemId ?? null, input.nameSnapshot, input.codeSnapshot ?? null, input.unitPrice, input.quantity, input.discountAmount, lineTotal, input.notes ?? null, input.createdByUserId, input.updatedByUserId]
      );
      return mapRow(result.rows[0] as Record<string, unknown>);
    },

    async findById(accountId: string, id: string) {
      const result = await db.$client.query('select * from encounter_billing_items where id = $1 and account_id = $2 limit 1', [id, accountId]);
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    },

    async updateById(accountId: string, id: string, patch: UpdateInput) {
      const before = await this.findById(accountId, id);
      if (!before) return null;
      const nextUnitPrice = patch.unitPrice ?? before.unitPrice;
      const nextQuantity = patch.quantity ?? before.quantity;
      const nextDiscountAmount = patch.discountAmount ?? before.discountAmount;
      const nextLineTotal = (nextUnitPrice * nextQuantity) - nextDiscountAmount;
      const result = await db.$client.query(
        `update encounter_billing_items set
          catalog_item_id = $1,
          name_snapshot = $2,
          code_snapshot = $3,
          unit_price = $4,
          quantity = $5,
          discount_amount = $6,
          line_total = $7,
          notes = $8,
          updated_by_user_id = $9,
          updated_at = now()
        where id = $10 and account_id = $11
        returning *`,
        [patch.catalogItemId ?? before.catalogItemId, patch.nameSnapshot ?? before.nameSnapshot, patch.codeSnapshot ?? before.codeSnapshot, nextUnitPrice, nextQuantity, nextDiscountAmount, nextLineTotal, patch.notes ?? before.notes, patch.updatedByUserId, id, accountId]
      );
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    },

    async removeById(accountId: string, id: string) {
      const result = await db.$client.query('delete from encounter_billing_items where id = $1 and account_id = $2 returning *', [id, accountId]);
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    },

    async list(input: { accountId: string; encounterId?: string; itemType?: 'service' | 'product'; page: number; pageSize: number }) {
      const whereParts = ['account_id = $1'];
      const values: Array<string | number> = [input.accountId];
      let index = 2;
      if (input.encounterId) { whereParts.push(`encounter_id = $${index}`); values.push(input.encounterId); index += 1; }
      if (input.itemType) { whereParts.push(`item_type = $${index}`); values.push(input.itemType); index += 1; }
      const whereClause = whereParts.join(' and ');
      const offset = (input.page - 1) * input.pageSize;
      const [rowsResult, totalResult] = await Promise.all([
        db.$client.query(`select * from encounter_billing_items where ${whereClause} order by created_at desc limit $${index} offset $${index + 1}`, [...values, input.pageSize, offset]),
        db.$client.query(`select count(*)::int as total from encounter_billing_items where ${whereClause}`, values)
      ]);
      return { data: rowsResult.rows.map((row) => mapRow(row as Record<string, unknown>)), page: input.page, pageSize: input.pageSize, total: Number((totalResult.rows[0] as Record<string, unknown>)?.total ?? 0) };
    },

    async getSummary(accountId: string, encounterId: string): Promise<EncounterBillingSummaryRecord | null> {
      const encounterStatus = await this.findEncounterStatus(accountId, encounterId);
      if (!encounterStatus) return null;

      const result = await db.$client.query(
        `select *
           from encounter_billing_items
          where account_id = $1 and encounter_id = $2
          order by created_at asc, id asc`,
        [accountId, encounterId]
      );
      const items = result.rows.map((row) => mapRow(row as Record<string, unknown>));
      const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const discountTotal = items.reduce((sum, item) => sum + item.discountAmount, 0);
      const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

      return {
        encounterId,
        accountId,
        encounterStatus,
        totals: {
          itemCount: items.length,
          serviceItemCount: items.filter((item) => item.itemType === 'service').length,
          productItemCount: items.filter((item) => item.itemType === 'product').length,
          subtotal,
          discountTotal,
          total
        },
        items
      };
    }
  };
}

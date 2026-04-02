import { getPool } from '@cvg-his-v2/shared-database';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

export interface QuoteRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly number: string;
  readonly ownerId: string | null;
  readonly status: 'draft' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  readonly validUntil: string | null;
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly total: number;
  readonly notes: string | null;
  readonly createdByUserId: UserId;
  readonly convertedToSaleId: string | null;
  readonly convertedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuoteItemRecord {
  readonly id: string;
  readonly quoteId: string;
  readonly accountId: AccountId;
  readonly itemType: 'product' | 'service';
  readonly catalogItemId: string | null;
  readonly nameSnapshot: string;
  readonly codeSnapshot: string | null;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly discountAmount: number;
  readonly lineTotal: number;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuotesRepository {
  create(quote: QuoteRecord): Promise<void>;
  update(quote: QuoteRecord): Promise<void>;
  findById(id: string): Promise<QuoteRecord | null>;
  findByAccountId(
    accountId: AccountId,
    filters?: { status?: string; search?: string; ownerId?: string }
  ): Promise<readonly QuoteRecord[]>;
  createItem(item: QuoteItemRecord): Promise<void>;
  updateItem(item: QuoteItemRecord): Promise<void>;
  deleteItem(id: string): Promise<void>;
  findItemsByQuoteId(quoteId: string): Promise<readonly QuoteItemRecord[]>;
  getIssuedCount(accountId: AccountId): Promise<number>;
  getConvertedCount(accountId: AccountId): Promise<number>;
}

export class DatabaseQuotesRepository implements QuotesRepository {
  async create(quote: QuoteRecord): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO quotes (id, account_id, number, owner_id, status, valid_until, subtotal, discount_amount, total, notes, created_by_user_id, converted_to_sale_id, converted_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        quote.id,
        quote.accountId,
        quote.number,
        quote.ownerId,
        quote.status,
        quote.validUntil ? new Date(quote.validUntil) : null,
        quote.subtotal.toString(),
        quote.discountAmount.toString(),
        quote.total.toString(),
        quote.notes,
        quote.createdByUserId,
        quote.convertedToSaleId,
        quote.convertedAt ? new Date(quote.convertedAt) : null,
        new Date(quote.createdAt),
        new Date(quote.updatedAt)
      ]
    );
  }

  async update(quote: QuoteRecord): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE quotes SET status = $2, subtotal = $3, discount_amount = $4, total = $5, notes = $6, converted_to_sale_id = $7, converted_at = $8, updated_at = $9 WHERE id = $1`,
      [
        quote.id,
        quote.status,
        quote.subtotal.toString(),
        quote.discountAmount.toString(),
        quote.total.toString(),
        quote.notes,
        quote.convertedToSaleId,
        quote.convertedAt ? new Date(quote.convertedAt) : null,
        new Date(quote.updatedAt)
      ]
    );
  }

  async findById(id: string): Promise<QuoteRecord | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM quotes WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapQuote(result.rows[0]);
  }

  async findByAccountId(
    accountId: AccountId,
    filters?: { status?: string; search?: string; ownerId?: string }
  ): Promise<readonly QuoteRecord[]> {
    const pool = getPool();
    let sql = 'SELECT * FROM quotes WHERE account_id = $1';
    const params: unknown[] = [accountId];
    let paramIdx = 2;

    if (filters?.status) {
      sql += ` AND status = $${paramIdx}`;
      params.push(filters.status);
      paramIdx++;
    }
    if (filters?.ownerId) {
      sql += ` AND owner_id = $${paramIdx}`;
      params.push(filters.ownerId);
      paramIdx++;
    }
    if (filters?.search) {
      sql += ` AND (number ILIKE $${paramIdx} OR notes ILIKE $${paramIdx})`;
      params.push(`%${filters.search}%`);
      paramIdx++;
    }

    sql += ' ORDER BY created_at DESC';
    const result = await pool.query(sql, params);
    return result.rows.map((r: Record<string, unknown>) => this.mapQuote(r));
  }

  async createItem(item: QuoteItemRecord): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO quote_items (id, quote_id, account_id, item_type, catalog_item_id, name_snapshot, code_snapshot, unit_price, quantity, discount_amount, line_total, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        item.id,
        item.quoteId,
        item.accountId,
        item.itemType,
        item.catalogItemId,
        item.nameSnapshot,
        item.codeSnapshot,
        item.unitPrice.toString(),
        item.quantity,
        item.discountAmount.toString(),
        item.lineTotal.toString(),
        item.notes,
        new Date(item.createdAt),
        new Date(item.updatedAt)
      ]
    );
  }

  async updateItem(item: QuoteItemRecord): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE quote_items SET quantity = $2, discount_amount = $3, line_total = $4, notes = $5, updated_at = $6 WHERE id = $1`,
      [
        item.id,
        item.quantity,
        item.discountAmount.toString(),
        item.lineTotal.toString(),
        item.notes,
        new Date(item.updatedAt)
      ]
    );
  }

  async deleteItem(id: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM quote_items WHERE id = $1', [id]);
  }

  async findItemsByQuoteId(quoteId: string): Promise<readonly QuoteItemRecord[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY created_at',
      [quoteId]
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapItem(r));
  }

  async getIssuedCount(accountId: AccountId): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT COUNT(*) FROM quotes WHERE account_id = $1 AND status != $2',
      [accountId, 'draft']
    );
    return parseInt(result.rows[0].count, 10);
  }

  async getConvertedCount(accountId: AccountId): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT COUNT(*) FROM quotes WHERE account_id = $1 AND converted_to_sale_id IS NOT NULL',
      [accountId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  private mapQuote(row: Record<string, unknown>): QuoteRecord {
    return {
      id: row.id as string,
      accountId: row.account_id as AccountId,
      number: row.number as string,
      ownerId: (row.owner_id as string) ?? null,
      status: row.status as QuoteRecord['status'],
      validUntil: row.valid_until ? new Date(row.valid_until as string).toISOString() : null,
      subtotal: parseFloat(row.subtotal as string),
      discountAmount: parseFloat(row.discount_amount as string),
      total: parseFloat(row.total as string),
      notes: (row.notes as string) ?? null,
      createdByUserId: row.created_by_user_id as UserId,
      convertedToSaleId: (row.converted_to_sale_id as string) ?? null,
      convertedAt: row.converted_at ? new Date(row.converted_at as string).toISOString() : null,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapItem(row: Record<string, unknown>): QuoteItemRecord {
    return {
      id: row.id as string,
      quoteId: row.quote_id as string,
      accountId: row.account_id as AccountId,
      itemType: row.item_type as QuoteItemRecord['itemType'],
      catalogItemId: (row.catalog_item_id as string) ?? null,
      nameSnapshot: row.name_snapshot as string,
      codeSnapshot: (row.code_snapshot as string) ?? null,
      unitPrice: parseFloat(row.unit_price as string),
      quantity: parseInt(row.quantity as string, 10),
      discountAmount: parseFloat(row.discount_amount as string),
      lineTotal: parseFloat(row.line_total as string),
      notes: (row.notes as string) ?? null,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}

import { createHash } from 'node:crypto';

import {
  acquireTenantAuthorizationLock,
  getPool,
  runInTenantTransaction
} from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

export interface CounterSaleRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly number: string;
  readonly ownerId: string | null;
  readonly patientId: string | null;
  readonly encounterId: string | null;
  readonly queueEntryId: string | null;
  readonly billingRecordId: string | null;
  readonly status: 'open' | 'closed' | 'cancelled';
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly total: number;
  readonly paidAmount: number;
  readonly balanceDue: number;
  readonly notes: string | null;
  readonly openedByUserId: UserId;
  readonly closedByUserId: UserId | null;
  readonly closedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CounterSaleDraft = Omit<CounterSaleRecord, 'number'>;

export interface CounterSaleReceiptRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly counterSaleId: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly receivedByUserId: UserId;
  readonly receivedAt: string;
  readonly cashRegisterId: string | null;
  readonly cashMovementId: string | null;
  readonly journalEntryId: string | null;
  readonly createdAt: string;
}

export interface CounterSaleItemRecord {
  readonly id: string;
  readonly counterSaleId: string;
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

export interface CounterSalePaymentRecord {
  readonly id: string;
  readonly counterSaleId: string;
  readonly accountId: AccountId;
  readonly method:
    | 'cash'
    | 'credit_card'
    | 'debit_card'
    | 'pix'
    | 'bank_transfer'
    | 'check'
    | 'insurance'
    | 'other';
  readonly amount: number;
  readonly installments: number;
  readonly reference: string | null;
  readonly notes: string | null;
  /** Opaque caller key; only its SHA-256 digest is persisted. */
  readonly idempotencyKey?: string | null;
  readonly createdAt: string;
}

export interface CounterSaleChequePaymentRecord extends CounterSalePaymentRecord {
  readonly saleNumber: string;
  readonly saleStatus: CounterSaleRecord['status'];
}

/** Prevents report snapshots from materializing an unbounded tenant result set. */
export const MAX_COUNTER_SALE_REPORT_ROWS = 10_000;
/** @deprecated Use MAX_COUNTER_SALE_REPORT_ROWS for all counter-sale reports. */
export const MAX_CHEQUE_REPORT_ROWS = MAX_COUNTER_SALE_REPORT_ROWS;

export interface CounterSaleListFilters {
  readonly status?: string;
  readonly search?: string;
  readonly ownerId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  /** Internal bounded-read control; callers must pass a positive safe integer. */
  readonly limit?: number;
}

export interface CounterSaleCancellationHistoryRecord {
  readonly eventId: string;
  readonly accountId: AccountId;
  readonly counterSaleId: string;
  readonly cancelledByUserId: UserId;
  readonly cancelledAt: string;
  readonly reason: string;
  readonly correlationId: string;
}

export interface CounterSalesRepository {
  create(sale: CounterSaleRecord): Promise<void>;
  /** Allocates the next account-local number and persists the sale atomically. */
  createWithNextNumber(sale: CounterSaleDraft): Promise<CounterSaleRecord>;
  update(sale: CounterSaleRecord): Promise<void>;
  findById(id: string): Promise<CounterSaleRecord | null>;
  /** Locks and returns the authoritative sale row for a close command. */
  lockSaleForUpdate?(id: string, accountId?: AccountId): Promise<CounterSaleRecord | null>;
  listCancellationHistory?(
    accountId: AccountId,
    counterSaleId: string
  ): Promise<readonly CounterSaleCancellationHistoryRecord[]>;
  findByAccountId(
    accountId: AccountId,
    filters?: CounterSaleListFilters
  ): Promise<readonly CounterSaleRecord[]>;
  createItem(item: CounterSaleItemRecord): Promise<void>;
  updateItem(item: CounterSaleItemRecord): Promise<void>;
  deleteItem(id: string, accountId: AccountId, counterSaleId: string): Promise<void>;
  findItemsBySaleId(
    accountId: AccountId,
    counterSaleId: string
  ): Promise<readonly CounterSaleItemRecord[]>;
  createPayment(payment: CounterSalePaymentRecord): Promise<void>;
  /** Records a payment and recomputes the persisted balance under the sale row lock. */
  recordPayment?(payment: CounterSalePaymentRecord): Promise<{
    sale: CounterSaleRecord;
    payment: CounterSalePaymentRecord;
  }>;
  findPaymentsBySaleId(counterSaleId: string): Promise<readonly CounterSalePaymentRecord[]>;
  listChequePayments?(
    accountId: AccountId,
    filters?: { readonly dateFrom?: string; readonly dateTo?: string }
  ): Promise<readonly CounterSaleChequePaymentRecord[]>;
  createReceipt(receipt: CounterSaleReceiptRecord): Promise<CounterSaleReceiptRecord>;
  findReceipt(counterSaleId: string): Promise<CounterSaleReceiptRecord | null>;
  getOpenSalesCount(accountId: AccountId): Promise<number>;
  getClosedTodayCount(accountId: AccountId): Promise<number>;
  getRevenueToday(accountId: AccountId): Promise<{ gross: number; net: number }>;
  getSalesByPaymentMethod(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string
  ): Promise<readonly { method: string; total: number }[]>;
  getTopProducts(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string,
    limit?: number
  ): Promise<readonly { name: string; quantity: number; revenue: number }[]>;
  getTopServices(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string,
    limit?: number
  ): Promise<readonly { name: string; quantity: number; revenue: number }[]>;
  getLowStockAlerts(
    accountId: AccountId
  ): Promise<{ name: string; code: string; onHand: number; reorderLevel: number }[]>;
}

const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

interface NormalizedPayment {
  readonly amountCents: number;
  readonly installments: number;
  readonly reference: string | null;
  readonly notes: string | null;
  readonly idempotencyKeyHash: string | null;
}

interface AuthoritativeSaleTotals {
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly totalCents: number;
}

function normalizeIdempotencyKey(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new ConflictError('Payment idempotency key must be a string');
  }
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  if (normalized.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new ConflictError('Payment idempotency key is too long', {
      maxLength: MAX_IDEMPOTENCY_KEY_LENGTH
    });
  }
  return normalized;
}

function hashIdempotencyKey(value: string | null): string | null {
  return value ? createHash('sha256').update(value, 'utf8').digest('hex') : null;
}

function toPaymentCents(value: number): number {
  if (!Number.isFinite(value)) {
    throw new ConflictError('Payment amount must be a finite number', { amount: value });
  }
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new ConflictError('Payment amount must be greater than zero', { amount: value });
  }
  return cents;
}

function databaseCents(value: unknown, field: string): number {
  const text = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) {
    throw new ConflictError(`Counter sale ${field} is not a valid money amount`, { value });
  }
  const whole = Number(match[2]);
  const fraction = Number((match[3] ?? '').padEnd(2, '0') || '0');
  const cents = (match[1] ? -1 : 1) * (whole * 100 + fraction);
  if (!Number.isSafeInteger(cents)) {
    throw new ConflictError(`Counter sale ${field} exceeds the safe money range`, { value });
  }
  return cents;
}

function addCents(left: number, right: number, field: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new ConflictError(`Counter sale ${field} exceeds the safe money range`);
  }
  return result;
}

function centsToDatabaseValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

function normalizePayment(payment: CounterSalePaymentRecord): NormalizedPayment {
  const installments = payment.installments ?? 1;
  if (!Number.isInteger(installments) || installments < 1) {
    throw new ConflictError('Payment installments must be greater than zero', {
      installments
    });
  }
  const key = normalizeIdempotencyKey(payment.idempotencyKey);
  return {
    amountCents: toPaymentCents(payment.amount),
    installments,
    reference: payment.reference?.trim() ?? null,
    notes: payment.notes?.trim() ?? null,
    idempotencyKeyHash: hashIdempotencyKey(key)
  };
}

function calculateAuthoritativeTotals(
  rows: readonly Record<string, unknown>[]
): AuthoritativeSaleTotals {
  let subtotalCents = 0;
  let discountCents = 0;

  for (const row of rows) {
    const unitPriceCents = databaseCents(row.unit_price, 'item unit price');
    const quantity = Number(row.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ConflictError('Counter sale item quantity is invalid', { quantity });
    }
    const grossCents = unitPriceCents * quantity;
    if (!Number.isSafeInteger(grossCents)) {
      throw new ConflictError('Counter sale item total exceeds the safe money range');
    }
    const itemDiscountCents = databaseCents(row.discount_amount, 'item discount');
    if (itemDiscountCents < 0 || itemDiscountCents > grossCents) {
      throw new ConflictError('Counter sale item discount is invalid', {
        discountAmount: itemDiscountCents / 100,
        grossAmount: grossCents / 100
      });
    }
    subtotalCents = addCents(subtotalCents, grossCents, 'subtotal');
    discountCents = addCents(discountCents, itemDiscountCents, 'discount');
  }

  const totalCents = subtotalCents - discountCents;
  if (totalCents < 0) {
    throw new ConflictError('Counter sale total cannot be negative', {
      subtotal: subtotalCents / 100,
      discountAmount: discountCents / 100
    });
  }
  return { subtotalCents, discountCents, totalCents };
}

function sumPaymentCents(rows: readonly Record<string, unknown>[]): number {
  return rows.reduce(
    (sum, row) => addCents(sum, databaseCents(row.amount, 'payment amount'), 'paid amount'),
    0
  );
}

function assertIdempotentPayload(
  existing: Record<string, unknown>,
  payment: CounterSalePaymentRecord,
  normalized: NormalizedPayment
): void {
  const samePayload =
    existing.counter_sale_id === payment.counterSaleId &&
    existing.method === payment.method &&
    databaseCents(existing.amount, 'payment amount') === normalized.amountCents &&
    Number(existing.installments) === normalized.installments &&
    ((existing.reference as string | null) ?? null) === normalized.reference &&
    ((existing.notes as string | null) ?? null) === normalized.notes;

  if (!samePayload) {
    throw new ConflictError('Payment idempotency key was already used with a different payload', {
      counterSaleId: payment.counterSaleId
    });
  }
}

const COUNTER_SALE_INSERT_SQL = `INSERT INTO counter_sales (id, account_id, number, owner_id, patient_id, encounter_id, queue_entry_id, billing_record_id, status, subtotal, discount_amount, total, paid_amount, balance_due, notes, opened_by_user_id, closed_by_user_id, closed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`;

const MAX_COUNTER_SALE_NUMBER = 9_007_199_254_740_991n;

function counterSaleInsertValues(sale: CounterSaleRecord): unknown[] {
  return [
    sale.id,
    sale.accountId,
    sale.number,
    sale.ownerId,
    sale.patientId,
    sale.encounterId,
    sale.queueEntryId,
    sale.billingRecordId,
    sale.status,
    sale.subtotal.toString(),
    sale.discountAmount.toString(),
    sale.total.toString(),
    sale.paidAmount.toString(),
    sale.balanceDue.toString(),
    sale.notes,
    sale.openedByUserId,
    sale.closedByUserId,
    sale.closedAt ? new Date(sale.closedAt) : null,
    new Date(sale.createdAt),
    new Date(sale.updatedAt)
  ];
}

export class DatabaseCounterSalesRepository implements CounterSalesRepository {
  async create(sale: CounterSaleRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(COUNTER_SALE_INSERT_SQL, counterSaleInsertValues(sale));
    });
  }

  async createWithNextNumber(sale: CounterSaleDraft): Promise<CounterSaleRecord> {
    return runInTenantTransaction(getPool(), sale.accountId, async (client) => {
      await acquireTenantAuthorizationLock(sale.accountId);
      const latest = await client.query<{ readonly max_number: string | null }>(
        `SELECT MAX(
                  CASE
                    WHEN number ~ '^CS-[0-9]+$' THEN SUBSTRING(number FROM 4)::numeric
                    ELSE NULL
                  END
                ) AS max_number
           FROM counter_sales
          WHERE account_id = $1`,
        [sale.accountId]
      );

      const maxNumberText = latest.rows[0]?.max_number;
      let currentNumber = 0n;
      if (maxNumberText !== null && maxNumberText !== undefined) {
        try {
          currentNumber = BigInt(String(maxNumberText));
        } catch {
          throw new ConflictError('Counter sale number sequence is invalid', {
            accountId: sale.accountId
          });
        }
      }
      if (currentNumber < 0n || currentNumber >= MAX_COUNTER_SALE_NUMBER) {
        throw new ConflictError('Counter sale number sequence is exhausted', {
          accountId: sale.accountId
        });
      }

      const record: CounterSaleRecord = {
        ...sale,
        number: `CS-${String(currentNumber + 1n).padStart(6, '0')}`
      };
      const inserted = await client.query<Record<string, unknown>>(
        `${COUNTER_SALE_INSERT_SQL} RETURNING *`,
        counterSaleInsertValues(record)
      );
      const row = inserted.rows[0];
      if (!row) {
        throw new ConflictError('Counter sale allocation did not return a persisted sale', {
          accountId: sale.accountId
        });
      }
      return this.mapSale(row);
    });
  }

  async update(sale: CounterSaleRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE counter_sales SET status = $3, subtotal = $4, discount_amount = $5, total = $6, paid_amount = $7, balance_due = $8, notes = $9, closed_by_user_id = $10, closed_at = $11, updated_at = $12 WHERE id = $1 AND account_id = $2`,
        [
          sale.id,
          sale.accountId,
          sale.status,
          sale.subtotal.toString(),
          sale.discountAmount.toString(),
          sale.total.toString(),
          sale.paidAmount.toString(),
          sale.balanceDue.toString(),
          sale.notes,
          sale.closedByUserId,
          sale.closedAt ? new Date(sale.closedAt) : null,
          new Date(sale.updatedAt)
        ]
      );
      if (result.rowCount !== 1) {
        throw new NotFoundError('Counter sale not found', {
          saleId: sale.id,
          accountId: sale.accountId
        });
      }
    });
  }

  async findById(id: string): Promise<CounterSaleRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM counter_sales WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapSale(result.rows[0]);
    });
  }

  async lockSaleForUpdate(id: string, accountId?: AccountId): Promise<CounterSaleRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = accountId
        ? await client.query(
            'SELECT * FROM counter_sales WHERE id = $1 AND account_id = $2 FOR UPDATE',
            [id, accountId]
          )
        : await client.query('SELECT * FROM counter_sales WHERE id = $1 FOR UPDATE', [id]);
      if (result.rows.length === 0) return null;
      return this.mapSale(result.rows[0]);
    });
  }

  async listCancellationHistory(
    accountId: AccountId,
    counterSaleId: string
  ): Promise<readonly CounterSaleCancellationHistoryRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT id, account_id, entity_id, actor_user_id, occurred_at, reason, correlation_id
           FROM audit_events
          WHERE account_id = $1
            AND entity_type = 'counter-sale'
            AND entity_id = $2
            AND action = 'cancelled'
            AND actor_user_id IS NOT NULL
            AND reason IS NOT NULL
            AND correlation_id IS NOT NULL
            AND correlation_id <> ''
          ORDER BY occurred_at DESC, id DESC
          LIMIT 100`,
        [accountId, counterSaleId]
      );
      return result.rows.flatMap((row: Record<string, unknown>) => {
        if (
          typeof row.id !== 'string' ||
          typeof row.account_id !== 'string' ||
          typeof row.entity_id !== 'string' ||
          typeof row.actor_user_id !== 'string' ||
          typeof row.reason !== 'string' ||
          typeof row.correlation_id !== 'string' ||
          row.correlation_id.length === 0
        ) {
          return [];
        }
        const occurredAt = new Date(row.occurred_at as string | Date);
        if (Number.isNaN(occurredAt.getTime())) return [];
        return [
          {
            eventId: row.id,
            accountId: row.account_id as AccountId,
            counterSaleId: row.entity_id,
            cancelledByUserId: row.actor_user_id as UserId,
            cancelledAt: occurredAt.toISOString(),
            reason: row.reason,
            correlationId: row.correlation_id
          }
        ];
      });
    });
  }

  async findByAccountId(
    accountId: AccountId,
    filters?: CounterSaleListFilters
  ): Promise<readonly CounterSaleRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM counter_sales WHERE account_id = $1';
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

      if (filters?.dateFrom) {
        sql += ` AND created_at >= ($${paramIdx}::date::timestamp AT TIME ZONE 'UTC')`;
        params.push(filters.dateFrom);
        paramIdx++;
      }
      if (filters?.dateTo) {
        sql += ` AND created_at < (($${paramIdx}::date + 1)::timestamp AT TIME ZONE 'UTC')`;
        params.push(filters.dateTo);
        paramIdx++;
      }

      sql += ' ORDER BY created_at DESC, id DESC';
      if (filters?.limit !== undefined) {
        if (!Number.isSafeInteger(filters.limit) || filters.limit < 1) {
          throw new ValidationError('Counter-sale query limit must be a positive safe integer', {
            limit: filters.limit
          });
        }
        sql += ` LIMIT $${paramIdx}`;
        params.push(filters.limit);
      }
      const result = await client.query(sql, params);
      return result.rows.map((r: Record<string, unknown>) => this.mapSale(r));
    });
  }

  async createItem(item: CounterSaleItemRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO counter_sale_items (id, counter_sale_id, account_id, item_type, catalog_item_id, name_snapshot, code_snapshot, unit_price, quantity, discount_amount, line_total, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          item.id,
          item.counterSaleId,
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
    });
  }

  async updateItem(item: CounterSaleItemRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE counter_sale_items
            SET quantity = $4,
                discount_amount = $5,
                line_total = $6,
                notes = $7,
                updated_at = $8
          WHERE id = $1
            AND account_id = $2
            AND counter_sale_id = $3`,
        [
          item.id,
          item.accountId,
          item.counterSaleId,
          item.quantity,
          item.discountAmount.toString(),
          item.lineTotal.toString(),
          item.notes,
          new Date(item.updatedAt)
        ]
      );
      if (result.rowCount !== 1) {
        throw new NotFoundError('Counter sale item not found', {
          itemId: item.id,
          accountId: item.accountId,
          counterSaleId: item.counterSaleId
        });
      }
    });
  }

  async deleteItem(id: string, accountId: AccountId, counterSaleId: string): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `DELETE FROM counter_sale_items
          WHERE id = $1
            AND account_id = $2
            AND counter_sale_id = $3`,
        [id, accountId, counterSaleId]
      );
      if (result.rowCount !== 1) {
        throw new NotFoundError('Counter sale item not found', {
          itemId: id,
          accountId,
          counterSaleId
        });
      }
    });
  }

  async findItemsBySaleId(
    accountId: AccountId,
    counterSaleId: string
  ): Promise<readonly CounterSaleItemRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT *
           FROM counter_sale_items
          WHERE account_id = $1
            AND counter_sale_id = $2
          ORDER BY created_at`,
        [accountId, counterSaleId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapItem(r));
    });
  }

  async createPayment(payment: CounterSalePaymentRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      const normalized = normalizePayment(payment);
      await client.query(
        `INSERT INTO counter_sale_payments
           (id, counter_sale_id, account_id, method, amount, installments, reference, notes,
            idempotency_key_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          payment.id,
          payment.counterSaleId,
          payment.accountId,
          payment.method,
          centsToDatabaseValue(normalized.amountCents),
          normalized.installments,
          normalized.reference,
          normalized.notes,
          normalized.idempotencyKeyHash,
          new Date(payment.createdAt)
        ]
      );
    });
  }

  async recordPayment(payment: CounterSalePaymentRecord): Promise<{
    sale: CounterSaleRecord;
    payment: CounterSalePaymentRecord;
  }> {
    return withTenantQuery(getPool(), async (client) => {
      const normalized = normalizePayment(payment);
      const lockedSaleResult = await client.query(
        `SELECT *
           FROM counter_sales
          WHERE account_id = $1
            AND id = $2
          FOR UPDATE`,
        [payment.accountId, payment.counterSaleId]
      );
      const lockedSale = lockedSaleResult.rows[0] as Record<string, unknown> | undefined;
      if (!lockedSale) {
        throw new NotFoundError('Counter sale not found', { saleId: payment.counterSaleId });
      }

      const existingPaymentResult = normalized.idempotencyKeyHash
        ? await client.query(
            `SELECT *
               FROM counter_sale_payments
              WHERE account_id = $1
                AND idempotency_key_hash = $2
              FOR UPDATE`,
            [payment.accountId, normalized.idempotencyKeyHash]
          )
        : { rows: [] as Record<string, unknown>[] };
      let resolvedPaymentRow = existingPaymentResult.rows[0] as Record<string, unknown> | undefined;
      if (resolvedPaymentRow) {
        assertIdempotentPayload(resolvedPaymentRow, payment, normalized);
      } else if (lockedSale.status !== 'open') {
        throw new ConflictError('Cannot add payments to a non-open sale', {
          status: lockedSale.status
        });
      }

      const itemResult = await client.query(
        `SELECT unit_price, quantity, discount_amount
           FROM counter_sale_items
          WHERE account_id = $1
            AND counter_sale_id = $2
          ORDER BY created_at, id
          FOR UPDATE`,
        [payment.accountId, payment.counterSaleId]
      );

      const authoritativeTotals = calculateAuthoritativeTotals(
        itemResult.rows as Record<string, unknown>[]
      );
      const paymentRowsBeforeInsert = await client.query(
        `SELECT *
           FROM counter_sale_payments
          WHERE account_id = $1
            AND counter_sale_id = $2
          ORDER BY created_at, id
          FOR UPDATE`,
        [payment.accountId, payment.counterSaleId]
      );
      const paidBeforeCents = sumPaymentCents(
        paymentRowsBeforeInsert.rows as Record<string, unknown>[]
      );
      if (paidBeforeCents > authoritativeTotals.totalCents) {
        throw new ConflictError('Counter sale payments exceed recalculated total', {
          total: authoritativeTotals.totalCents / 100,
          paidAmount: paidBeforeCents / 100
        });
      }

      if (
        !resolvedPaymentRow &&
        normalized.amountCents > authoritativeTotals.totalCents - paidBeforeCents
      ) {
        throw new ConflictError('Payment amount exceeds balance due', {
          balanceDue: (authoritativeTotals.totalCents - paidBeforeCents) / 100,
          paymentAmount: payment.amount
        });
      }

      if (!resolvedPaymentRow) {
        const insertConflict = normalized.idempotencyKeyHash
          ? ` ON CONFLICT (account_id, idempotency_key_hash)
               WHERE idempotency_key_hash IS NOT NULL DO NOTHING`
          : '';
        const insertedPayment = await client.query(
          `INSERT INTO counter_sale_payments
             (id, counter_sale_id, account_id, method, amount, installments, reference, notes,
              idempotency_key_hash, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ${insertConflict}
           RETURNING *`,
          [
            payment.id,
            payment.counterSaleId,
            payment.accountId,
            payment.method,
            centsToDatabaseValue(normalized.amountCents),
            normalized.installments,
            normalized.reference,
            normalized.notes,
            normalized.idempotencyKeyHash,
            new Date(payment.createdAt)
          ]
        );
        resolvedPaymentRow = insertedPayment.rows[0] as Record<string, unknown> | undefined;

        if (!resolvedPaymentRow && normalized.idempotencyKeyHash) {
          const racedPayment = await client.query(
            `SELECT *
               FROM counter_sale_payments
              WHERE account_id = $1
                AND idempotency_key_hash = $2
              FOR UPDATE`,
            [payment.accountId, normalized.idempotencyKeyHash]
          );
          resolvedPaymentRow = racedPayment.rows[0] as Record<string, unknown> | undefined;
          if (!resolvedPaymentRow) {
            throw new ConflictError('Payment idempotency key could not be resolved');
          }
          assertIdempotentPayload(resolvedPaymentRow, payment, normalized);
        }
      }

      if (!resolvedPaymentRow) {
        throw new Error('Counter sale payment could not be persisted');
      }

      const paymentRowsAfterInsert = await client.query(
        `SELECT *
           FROM counter_sale_payments
          WHERE account_id = $1
            AND counter_sale_id = $2
          ORDER BY created_at, id
          FOR UPDATE`,
        [payment.accountId, payment.counterSaleId]
      );
      const paidAfterCents = sumPaymentCents(
        paymentRowsAfterInsert.rows as Record<string, unknown>[]
      );
      if (paidAfterCents > authoritativeTotals.totalCents) {
        throw new ConflictError('Counter sale payments exceed recalculated total', {
          total: authoritativeTotals.totalCents / 100,
          paidAmount: paidAfterCents / 100
        });
      }

      const balanceAfterCents = authoritativeTotals.totalCents - paidAfterCents;
      const updatedSale = await client.query(
        `UPDATE counter_sales
            SET subtotal = $3,
                discount_amount = $4,
                total = $5,
                paid_amount = $6,
                balance_due = $7,
                updated_at = $8
          WHERE account_id = $1
          AND id = $2
          RETURNING *`,
        [
          payment.accountId,
          payment.counterSaleId,
          centsToDatabaseValue(authoritativeTotals.subtotalCents),
          centsToDatabaseValue(authoritativeTotals.discountCents),
          centsToDatabaseValue(authoritativeTotals.totalCents),
          centsToDatabaseValue(paidAfterCents),
          centsToDatabaseValue(balanceAfterCents),
          new Date()
        ]
      );
      const updatedRow = updatedSale.rows[0] as Record<string, unknown> | undefined;
      if (!updatedRow)
        throw new NotFoundError('Counter sale not found', { saleId: payment.counterSaleId });

      return {
        sale: this.mapSale(updatedRow),
        payment: this.mapPayment(resolvedPaymentRow)
      };
    });
  }

  async findPaymentsBySaleId(counterSaleId: string): Promise<readonly CounterSalePaymentRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM counter_sale_payments WHERE counter_sale_id = $1 ORDER BY created_at',
        [counterSaleId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapPayment(r));
    });
  }

  async listChequePayments(
    accountId: AccountId,
    filters: { readonly dateFrom?: string; readonly dateTo?: string } = {}
  ): Promise<readonly CounterSaleChequePaymentRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const params: unknown[] = [accountId];
      let sql = `SELECT csp.*, cs.number AS sale_number, cs.status AS sale_status
                 FROM counter_sale_payments csp
                 JOIN counter_sales cs
                   ON cs.id = csp.counter_sale_id
                  AND cs.account_id = csp.account_id
                 WHERE csp.account_id = $1 AND csp.method = 'check'`;

      if (filters.dateFrom) {
        params.push(filters.dateFrom);
        sql += ` AND csp.created_at >= ($${params.length}::date AT TIME ZONE 'UTC')`;
      }
      if (filters.dateTo) {
        params.push(filters.dateTo);
        sql += ` AND csp.created_at < (($${params.length}::date + INTERVAL '1 day') AT TIME ZONE 'UTC')`;
      }

      params.push(MAX_CHEQUE_REPORT_ROWS + 1);
      sql += ` ORDER BY csp.created_at ASC, csp.id ASC LIMIT $${params.length}::integer`;
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => ({
        ...this.mapPayment(row),
        saleNumber: row.sale_number as string,
        saleStatus: row.sale_status as CounterSaleRecord['status']
      }));
    });
  }

  async createReceipt(receipt: CounterSaleReceiptRecord): Promise<CounterSaleReceiptRecord> {
    return withTenantQuery(getPool(), async (client) => {
      const inserted = await client.query(
        `INSERT INTO counter_sale_receipts
           (id, account_id, counter_sale_id, amount, currency, received_by_user_id,
            received_at, cash_register_id, cash_movement_id, journal_entry_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (account_id, counter_sale_id) DO NOTHING
         RETURNING *`,
        [
          receipt.id,
          receipt.accountId,
          receipt.counterSaleId,
          receipt.amount.toString(),
          receipt.currency,
          receipt.receivedByUserId,
          new Date(receipt.receivedAt),
          receipt.cashRegisterId,
          receipt.cashMovementId,
          receipt.journalEntryId,
          new Date(receipt.createdAt)
        ]
      );
      const row =
        (inserted.rows[0] as Record<string, unknown> | undefined) ??
        ((
          await client.query(
            'SELECT * FROM counter_sale_receipts WHERE account_id = $1 AND counter_sale_id = $2',
            [receipt.accountId, receipt.counterSaleId]
          )
        ).rows[0] as Record<string, unknown> | undefined);
      if (!row) throw new Error('Counter sale receipt could not be persisted');
      return this.mapReceipt(row);
    });
  }

  async findReceipt(counterSaleId: string): Promise<CounterSaleReceiptRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM counter_sale_receipts WHERE counter_sale_id = $1 LIMIT 1',
        [counterSaleId]
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      return row ? this.mapReceipt(row) : null;
    });
  }

  async getOpenSalesCount(accountId: AccountId): Promise<number> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT COUNT(*) FROM counter_sales WHERE account_id = $1 AND status = $2',
        [accountId, 'open']
      );
      return parseInt(result.rows[0].count, 10);
    });
  }

  async getClosedTodayCount(accountId: AccountId): Promise<number> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT COUNT(*) FROM counter_sales WHERE account_id = $1 AND status = $2 AND closed_at::date = CURRENT_DATE',
        [accountId, 'closed']
      );
      return parseInt(result.rows[0].count, 10);
    });
  }

  async getRevenueToday(accountId: AccountId): Promise<{ gross: number; net: number }> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT COALESCE(SUM(total), 0) as gross, COALESCE(SUM(paid_amount), 0) as net
         FROM counter_sales
         WHERE account_id = $1 AND status = $2 AND closed_at::date = CURRENT_DATE`,
        [accountId, 'closed']
      );
      return {
        gross: parseFloat(result.rows[0].gross),
        net: parseFloat(result.rows[0].net)
      };
    });
  }

  async getSalesByPaymentMethod(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string
  ): Promise<readonly { method: string; total: number }[]> {
    return withTenantQuery(getPool(), async (client) => {
      let sql = `SELECT method, SUM(amount) as total FROM counter_sale_payments csp
                 JOIN counter_sales cs ON cs.id = csp.counter_sale_id
                 WHERE cs.account_id = $1 AND cs.status = 'closed'`;
      const params: unknown[] = [accountId];
      let paramIdx = 2;

      if (dateFrom) {
        sql += ` AND cs.closed_at >= $${paramIdx}`;
        params.push(dateFrom);
        paramIdx++;
      }
      if (dateTo) {
        sql += ` AND cs.closed_at <= $${paramIdx}`;
        params.push(dateTo);
        paramIdx++;
      }

      sql += ' GROUP BY method ORDER BY total DESC';
      const result = await client.query(sql, params);
      return result.rows.map((r: Record<string, unknown>) => ({
        method: r.method as string,
        total: parseFloat(r.total as string)
      }));
    });
  }

  async getTopProducts(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string,
    limit = 10
  ): Promise<readonly { name: string; quantity: number; revenue: number }[]> {
    return withTenantQuery(getPool(), async (client) => {
      let sql = `SELECT csi.name_snapshot as name, SUM(csi.quantity) as quantity, SUM(csi.line_total) as revenue
                 FROM counter_sale_items csi
                 JOIN counter_sales cs ON cs.id = csi.counter_sale_id
                 WHERE cs.account_id = $1 AND cs.status = 'closed' AND csi.item_type = 'product'`;
      const params: unknown[] = [accountId];
      let paramIdx = 2;

      if (dateFrom) {
        sql += ` AND cs.closed_at >= $${paramIdx}`;
        params.push(dateFrom);
        paramIdx++;
      }
      if (dateTo) {
        sql += ` AND cs.closed_at <= $${paramIdx}`;
        params.push(dateTo);
        paramIdx++;
      }

      sql += ` GROUP BY csi.name_snapshot ORDER BY revenue DESC LIMIT $${paramIdx}`;
      params.push(limit);
      const result = await client.query(sql, params);
      return result.rows.map((r: Record<string, unknown>) => ({
        name: r.name as string,
        quantity: parseInt(r.quantity as string, 10),
        revenue: parseFloat(r.revenue as string)
      }));
    });
  }

  async getTopServices(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string,
    limit = 10
  ): Promise<readonly { name: string; quantity: number; revenue: number }[]> {
    return withTenantQuery(getPool(), async (client) => {
      let sql = `SELECT csi.name_snapshot as name, SUM(csi.quantity) as quantity, SUM(csi.line_total) as revenue
                 FROM counter_sale_items csi
                 JOIN counter_sales cs ON cs.id = csi.counter_sale_id
                 WHERE cs.account_id = $1 AND cs.status = 'closed' AND csi.item_type = 'service'`;
      const params: unknown[] = [accountId];
      let paramIdx = 2;

      if (dateFrom) {
        sql += ` AND cs.closed_at >= $${paramIdx}`;
        params.push(dateFrom);
        paramIdx++;
      }
      if (dateTo) {
        sql += ` AND cs.closed_at <= $${paramIdx}`;
        params.push(dateTo);
        paramIdx++;
      }

      sql += ` GROUP BY csi.name_snapshot ORDER BY revenue DESC LIMIT $${paramIdx}`;
      params.push(limit);
      const result = await client.query(sql, params);
      return result.rows.map((r: Record<string, unknown>) => ({
        name: r.name as string,
        quantity: parseInt(r.quantity as string, 10),
        revenue: parseFloat(r.revenue as string)
      }));
    });
  }

  async getLowStockAlerts(
    accountId: AccountId
  ): Promise<{ name: string; code: string; onHand: number; reorderLevel: number }[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT name, sku as code, on_hand_quantity as onHand, reorder_level as reorderLevel
         FROM inventory_items
         WHERE account_id = $1 AND on_hand_quantity <= reorder_level
         ORDER BY on_hand_quantity ASC`,
        [accountId]
      );
      return result.rows.map((r: Record<string, unknown>) => ({
        name: r.name as string,
        code: r.code as string,
        onHand: Number(r.onHand),
        reorderLevel: Number(r.reorderLevel)
      }));
    });
  }

  private mapSale(row: Record<string, unknown>): CounterSaleRecord {
    return {
      id: row.id as string,
      accountId: row.account_id as AccountId,
      number: row.number as string,
      ownerId: (row.owner_id as string) ?? null,
      patientId: (row.patient_id as string) ?? null,
      encounterId: (row.encounter_id as string) ?? null,
      queueEntryId: (row.queue_entry_id as string) ?? null,
      billingRecordId: (row.billing_record_id as string) ?? null,
      status: row.status as CounterSaleRecord['status'],
      subtotal: parseFloat(row.subtotal as string),
      discountAmount: parseFloat(row.discount_amount as string),
      total: parseFloat(row.total as string),
      paidAmount: parseFloat(row.paid_amount as string),
      balanceDue: parseFloat(row.balance_due as string),
      notes: (row.notes as string) ?? null,
      openedByUserId: row.opened_by_user_id as unknown as UserId,
      closedByUserId: (row.closed_by_user_id as unknown as UserId) ?? null,
      closedAt: row.closed_at ? new Date(row.closed_at as string).toISOString() : null,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapItem(row: Record<string, unknown>): CounterSaleItemRecord {
    return {
      id: row.id as string,
      counterSaleId: row.counter_sale_id as string,
      accountId: row.account_id as AccountId,
      itemType: row.item_type as CounterSaleItemRecord['itemType'],
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

  private mapPayment(row: Record<string, unknown>): CounterSalePaymentRecord {
    return {
      id: row.id as string,
      counterSaleId: row.counter_sale_id as string,
      accountId: row.account_id as AccountId,
      method: row.method as CounterSalePaymentRecord['method'],
      amount: parseFloat(row.amount as string),
      installments: parseInt(row.installments as string, 10),
      reference: (row.reference as string) ?? null,
      notes: (row.notes as string) ?? null,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }

  private mapReceipt(row: Record<string, unknown>): CounterSaleReceiptRecord {
    return {
      id: row.id as string,
      accountId: row.account_id as AccountId,
      counterSaleId: row.counter_sale_id as string,
      amount: Number(row.amount),
      currency: row.currency as 'BRL',
      receivedByUserId: row.received_by_user_id as unknown as UserId,
      receivedAt: new Date(row.received_at as string).toISOString(),
      cashRegisterId: (row.cash_register_id as string) ?? null,
      cashMovementId: (row.cash_movement_id as string) ?? null,
      journalEntryId: (row.journal_entry_id as string) ?? null,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }
}

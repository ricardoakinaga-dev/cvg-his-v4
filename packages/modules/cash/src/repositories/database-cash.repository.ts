import { sql } from 'drizzle-orm';
import {
  createScopedDatabaseClient,
  getPool,
  runInTenantTransaction,
  withTenantTransaction,
  type DatabaseClient
} from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

export interface CashRegisterRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly openedByUserId: UserId;
  readonly closedByUserId: UserId | null;
  readonly openingAmount: number;
  readonly closingAmount: number | null;
  readonly expectedClosingAmount: number | null;
  readonly difference: number | null;
  readonly status: 'open' | 'closed';
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CashMovementRecord {
  readonly id: string;
  readonly cashRegisterId: string;
  readonly accountId: AccountId;
  readonly movementType: 'opening' | 'closing' | 'payment' | 'supply' | 'deposit' | 'withdrawal' | 'adjustment';
  readonly amount: number;
  readonly runningBalance: number;
  readonly reference: string | null;
  readonly notes: string | null;
  readonly createdByUserId: UserId | null;
  readonly createdAt: string;
}

export interface CashRepository {
  openRegister(register: CashRegisterRecord): Promise<void>;
  openRegisterWithMovement?(
    register: CashRegisterRecord,
    movement: CashMovementRecord
  ): Promise<void>;
  closeRegister(
    id: string,
    closingAmount: number,
    expectedClosingAmount: number,
    difference: number,
    closedByUserId: UserId,
    closedAt: string,
    updatedAt: string
  ): Promise<void>;
  closeRegisterWithMovement?(
    accountId: AccountId,
    id: string,
    closingAmount: number,
    closedByUserId: UserId,
    closedAt: string,
    updatedAt: string,
    movement: CashMovementRecord
  ): Promise<{
    readonly expectedClosingAmount: number;
    readonly difference: number;
    readonly movement: CashMovementRecord;
  }>;
  findOpenRegister(accountId: AccountId): Promise<CashRegisterRecord | null>;
  findRegistersByAccount(
    accountId: AccountId,
    limit?: number
  ): Promise<readonly CashRegisterRecord[]>;
  findById(id: string): Promise<CashRegisterRecord | null>;
  createMovement(movement: CashMovementRecord): Promise<void>;
  /**
   * Locks the register, derives the current balance and appends the movement
   * in the same PostgreSQL transaction. The returned row contains the
   * database-authoritative running balance.
   */
  recordMovementAtomically?(
    accountId: AccountId,
    registerId: string,
    movement: CashMovementRecord
  ): Promise<CashMovementRecord>;
  findMovementsByRegister(cashRegisterId: string): Promise<readonly CashMovementRecord[]>;
  findMovementsByAccount(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string
  ): Promise<readonly CashMovementRecord[]>;
  calculateCurrentBalance(cashRegisterId: string): Promise<number>;
}

export class DatabaseCashRepository implements CashRepository {
  readonly #poolOverride?: Parameters<typeof runInTenantTransaction>[0];

  constructor(poolOverride?: Parameters<typeof runInTenantTransaction>[0]) {
    this.#poolOverride = poolOverride;
  }

  async #withTenantTransaction<T>(
    accountId: AccountId,
    operation: (database: DatabaseClient) => Promise<T>
  ): Promise<T> {
    if (!this.#poolOverride) return withTenantTransaction(accountId, operation);
    return runInTenantTransaction(this.#poolOverride, accountId, (client) =>
      operation(createScopedDatabaseClient(client))
    );
  }

  async openRegisterWithMovement(
    register: CashRegisterRecord,
    movement: CashMovementRecord
  ): Promise<void> {
    await withTenantTransaction(register.accountId, async (database) => {
      await database.execute(sql`INSERT INTO cash_registers
        (id, account_id, opened_by_user_id, opening_amount, status, notes, opened_at, created_at, updated_at)
        VALUES (${register.id}, ${register.accountId}, ${register.openedByUserId},
          ${register.openingAmount}, ${register.status}, ${register.notes},
          ${new Date(register.openedAt)}, ${new Date(register.createdAt)}, ${new Date(register.updatedAt)})`);
      await database.execute(sql`INSERT INTO cash_movements
        (id, cash_register_id, account_id, movement_type, amount, running_balance, reference, notes, created_by_user_id, created_at)
        VALUES (${movement.id}, ${movement.cashRegisterId}, ${movement.accountId},
          ${movement.movementType}, ${movement.amount}, ${movement.runningBalance},
          ${movement.reference}, ${movement.notes}, ${movement.createdByUserId}, ${new Date(movement.createdAt)})`);
    });
  }

  async openRegister(register: CashRegisterRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO cash_registers (id, account_id, opened_by_user_id, opening_amount, status, notes, opened_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          register.id,
          register.accountId,
          register.openedByUserId,
          register.openingAmount.toString(),
          register.status,
          register.notes,
          new Date(register.openedAt),
          new Date(register.createdAt),
          new Date(register.updatedAt)
        ]
      );
    });
  }

  async closeRegister(
    id: string,
    closingAmount: number,
    expectedClosingAmount: number,
    difference: number,
    closedByUserId: UserId,
    closedAt: string,
    updatedAt: string
  ): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE cash_registers SET status = 'closed', closing_amount = $2, expected_closing_amount = $3, difference = $4, closed_by_user_id = $5, closed_at = $6, updated_at = $7 WHERE id = $1`,
        [
          id,
          closingAmount.toString(),
          expectedClosingAmount.toString(),
          difference.toString(),
          closedByUserId,
          new Date(closedAt),
          new Date(updatedAt)
        ]
      );
    });
  }

  async closeRegisterWithMovement(
    accountId: AccountId,
    id: string,
    closingAmount: number,
    closedByUserId: UserId,
    closedAt: string,
    updatedAt: string,
    movement: CashMovementRecord
  ): Promise<{
    readonly expectedClosingAmount: number;
    readonly difference: number;
    readonly movement: CashMovementRecord;
  }> {
    return this.#withTenantTransaction(accountId, async (database) => {
      const registerResult = await database.execute(sql`SELECT id
        FROM cash_registers
        WHERE id = ${id} AND account_id = ${accountId} AND status = 'open'
        FOR UPDATE`);
      if (registerResult.rows.length !== 1) {
        throw new Error('Cash register was already closed or is outside the current account');
      }

      const balanceResult = await database.execute(sql`SELECT running_balance
        FROM cash_movements
        WHERE cash_register_id = ${id} AND account_id = ${accountId}
        ORDER BY created_at DESC, id DESC
        LIMIT 1`);
      const expectedClosingAmount = Number(balanceResult.rows[0]?.running_balance ?? 0);
      const difference = Math.round((closingAmount - expectedClosingAmount) * 100) / 100;
      const authoritativeMovement: CashMovementRecord = {
        ...movement,
        runningBalance: expectedClosingAmount
      };

      const result = await database.execute(sql`UPDATE cash_registers
        SET status = 'closed', closing_amount = ${closingAmount},
            expected_closing_amount = ${expectedClosingAmount}, difference = ${difference},
            closed_by_user_id = ${closedByUserId}, closed_at = ${new Date(closedAt)},
            updated_at = ${new Date(updatedAt)}
        WHERE id = ${id} AND account_id = ${accountId} AND status = 'open'`);
      if (result.rowCount !== 1) {
        throw new Error('Cash register was already closed or is outside the current account');
      }

      await database.execute(sql`INSERT INTO cash_movements
        (id, cash_register_id, account_id, movement_type, amount, running_balance, reference, notes, created_by_user_id, created_at)
        VALUES (${authoritativeMovement.id}, ${authoritativeMovement.cashRegisterId}, ${authoritativeMovement.accountId},
          ${authoritativeMovement.movementType}, ${authoritativeMovement.amount}, ${authoritativeMovement.runningBalance},
          ${authoritativeMovement.reference}, ${authoritativeMovement.notes}, ${authoritativeMovement.createdByUserId}, ${new Date(authoritativeMovement.createdAt)})`);

      return { expectedClosingAmount, difference, movement: authoritativeMovement };
    });
  }

  async findOpenRegister(accountId: AccountId): Promise<CashRegisterRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM cash_registers WHERE account_id = $1 AND status = 'open' ORDER BY opened_at DESC LIMIT 1`,
        [accountId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRegister(result.rows[0]);
    });
  }

  async findRegistersByAccount(
    accountId: AccountId,
    limit = 30
  ): Promise<readonly CashRegisterRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM cash_registers WHERE account_id = $1 ORDER BY opened_at DESC LIMIT $2`,
        [accountId, limit]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapRegister(r));
    });
  }

  async findById(id: string): Promise<CashRegisterRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(`SELECT * FROM cash_registers WHERE id = $1`, [id]);
      if (result.rows.length === 0) return null;
      return this.mapRegister(result.rows[0]);
    });
  }

  async createMovement(movement: CashMovementRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO cash_movements (id, cash_register_id, account_id, movement_type, amount, running_balance, reference, notes, created_by_user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          movement.id,
          movement.cashRegisterId,
          movement.accountId,
          movement.movementType,
          movement.amount.toString(),
          movement.runningBalance.toString(),
          movement.reference,
          movement.notes,
          movement.createdByUserId,
          new Date(movement.createdAt)
        ]
      );
    });
  }

  async recordMovementAtomically(
    accountId: AccountId,
    registerId: string,
    movement: CashMovementRecord
  ): Promise<CashMovementRecord> {
    return withTenantTransaction(accountId, async (database) => {
      const register = await database.execute(sql`SELECT status
        FROM cash_registers
        WHERE id = ${registerId} AND account_id = ${accountId}
        FOR UPDATE`);
      if (register.rowCount !== 1 || register.rows[0]?.status !== 'open') {
        throw new Error('Cash register was not found or is already closed');
      }

      const balanceResult = await database.execute(sql`SELECT running_balance
        FROM cash_movements
        WHERE cash_register_id = ${registerId} AND account_id = ${accountId}
        ORDER BY created_at DESC, id DESC
        LIMIT 1`);
      const currentBalance = Number(balanceResult.rows[0]?.running_balance ?? 0);
      const amount = Number(movement.amount);
      const nextBalance =
        movement.movementType === 'withdrawal' || movement.movementType === 'deposit'
          ? currentBalance - amount
          : currentBalance + amount;
      if (nextBalance < 0) {
        throw new Error('Insufficient balance for withdrawal');
      }

      const persisted: CashMovementRecord = {
        ...movement,
        accountId,
        cashRegisterId: registerId,
        runningBalance: Math.round(nextBalance * 100) / 100
      };
      await database.execute(sql`INSERT INTO cash_movements
        (id, cash_register_id, account_id, movement_type, amount, running_balance, reference, notes, created_by_user_id, created_at)
        VALUES (${persisted.id}, ${persisted.cashRegisterId}, ${persisted.accountId},
          ${persisted.movementType}, ${persisted.amount}, ${persisted.runningBalance},
          ${persisted.reference}, ${persisted.notes}, ${persisted.createdByUserId}, ${new Date(persisted.createdAt)})`);
      return persisted;
    });
  }

  async findMovementsByRegister(cashRegisterId: string): Promise<readonly CashMovementRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM cash_movements WHERE cash_register_id = $1 ORDER BY created_at ASC`,
        [cashRegisterId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapMovement(r));
    });
  }

  async findMovementsByAccount(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string
  ): Promise<readonly CashMovementRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      let sql = `SELECT * FROM cash_movements WHERE account_id = $1`;
      const params: unknown[] = [accountId];
      let paramIdx = 2;
      if (dateFrom) {
        sql += ` AND created_at >= $${paramIdx}`;
        params.push(dateFrom);
        paramIdx++;
      }
      if (dateTo) {
        sql += ` AND created_at <= $${paramIdx}`;
        params.push(dateTo);
        paramIdx++;
      }
      sql += ` ORDER BY created_at DESC`;
      const result = await client.query(sql, params);
      return result.rows.map((r: Record<string, unknown>) => this.mapMovement(r));
    });
  }

  async calculateCurrentBalance(cashRegisterId: string): Promise<number> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT COALESCE(running_balance, 0) as balance
           FROM cash_movements
          WHERE cash_register_id = $1
          ORDER BY created_at DESC, id DESC
          LIMIT 1`,
        [cashRegisterId]
      );
      return parseFloat(result.rows[0]?.balance ?? '0');
    });
  }

  private mapRegister(row: Record<string, unknown>): CashRegisterRecord {
    return {
      id: row.id as string,
      accountId: row.account_id as AccountId,
      openedByUserId: row.opened_by_user_id as unknown as UserId,
      closedByUserId: (row.closed_by_user_id as unknown as UserId) ?? null,
      openingAmount: parseFloat(row.opening_amount as string),
      closingAmount: row.closing_amount ? parseFloat(row.closing_amount as string) : null,
      expectedClosingAmount: row.expected_closing_amount
        ? parseFloat(row.expected_closing_amount as string)
        : null,
      difference: row.difference ? parseFloat(row.difference as string) : null,
      status: row.status as 'open' | 'closed',
      openedAt: new Date(row.opened_at as string).toISOString(),
      closedAt: row.closed_at ? new Date(row.closed_at as string).toISOString() : null,
      notes: (row.notes as string) ?? null,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapMovement(row: Record<string, unknown>): CashMovementRecord {
    return {
      id: row.id as string,
      cashRegisterId: row.cash_register_id as string,
      accountId: row.account_id as AccountId,
      movementType: row.movement_type as CashMovementRecord['movementType'],
      amount: parseFloat(row.amount as string),
      runningBalance: parseFloat(row.running_balance as string),
      reference: (row.reference as string) ?? null,
      notes: (row.notes as string) ?? null,
      createdByUserId: (row.created_by_user_id as unknown as UserId) ?? null,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }
}

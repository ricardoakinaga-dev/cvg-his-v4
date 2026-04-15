import { getPool } from '@cvg-his-v2/shared-database';
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
  readonly movementType: 'opening' | 'closing' | 'payment' | 'supply' | 'withdrawal' | 'adjustment';
  readonly amount: number;
  readonly runningBalance: number;
  readonly reference: string | null;
  readonly notes: string | null;
  readonly createdByUserId: UserId | null;
  readonly createdAt: string;
}

export interface CashRepository {
  openRegister(register: CashRegisterRecord): Promise<void>;
  closeRegister(
    id: string,
    closingAmount: number,
    difference: number,
    closedByUserId: UserId,
    closedAt: string,
    updatedAt: string
  ): Promise<void>;
  findOpenRegister(accountId: AccountId): Promise<CashRegisterRecord | null>;
  findRegistersByAccount(
    accountId: AccountId,
    limit?: number
  ): Promise<readonly CashRegisterRecord[]>;
  findById(id: string): Promise<CashRegisterRecord | null>;
  createMovement(movement: CashMovementRecord): Promise<void>;
  findMovementsByRegister(cashRegisterId: string): Promise<readonly CashMovementRecord[]>;
  findMovementsByAccount(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string
  ): Promise<readonly CashMovementRecord[]>;
  calculateCurrentBalance(cashRegisterId: string): Promise<number>;
}

export class DatabaseCashRepository implements CashRepository {
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
          closingAmount.toString(),
          difference.toString(),
          closedByUserId,
          new Date(closedAt),
          new Date(updatedAt)
        ]
      );
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
        `SELECT COALESCE(MAX(running_balance), 0) as balance FROM cash_movements WHERE cash_register_id = $1`,
        [cashRegisterId]
      );
      return parseFloat(result.rows[0].balance);
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

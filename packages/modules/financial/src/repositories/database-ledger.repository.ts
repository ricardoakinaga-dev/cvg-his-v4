import { getPool, withTenantTransaction } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId } from '@cvg-his-v2/shared-types';
import type {
  FinancialJournalEntry,
  FinancialLedgerRepository
} from '../ledger.js';

function mapEntry(row: Record<string, unknown>, lines: readonly Record<string, unknown>[]): FinancialJournalEntry {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    sourceType: row.source_type as string,
    sourceId: row.source_id as string,
    description: row.description as string,
    occurredAt: new Date(row.occurred_at as string).toISOString(),
    createdByUserId: (row.created_by_user_id as never) ?? null,
    createdAt: new Date(row.created_at as string).toISOString(),
    lines: lines.map((line) => ({
      id: line.id as string,
      accountId: line.account_id as AccountId,
      entryId: line.entry_id as string,
      accountCode: line.account_code as string,
      debit: Number(line.debit),
      credit: Number(line.credit),
      memo: (line.memo as string | null) ?? null,
      createdAt: new Date(line.created_at as string).toISOString()
    }))
  };
}

export class DatabaseFinancialLedgerRepository implements FinancialLedgerRepository {
  async withTransaction<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> {
    return withTenantTransaction(accountId, operation);
  }

  async postEntry(input: FinancialJournalEntry): Promise<FinancialJournalEntry> {
    return withTenantQuery(getPool(), async (client) => {
      const inserted = await client.query(
        `INSERT INTO financial_journal_entries
          (id, account_id, source_type, source_id, description, occurred_at, created_by_user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (account_id, source_type, source_id) DO NOTHING
         RETURNING *`,
        [
          input.id,
          input.accountId,
          input.sourceType,
          input.sourceId,
          input.description,
          new Date(input.occurredAt),
          input.createdByUserId,
          new Date(input.createdAt)
        ]
      );
      let row = inserted.rows[0] as Record<string, unknown> | undefined;
      if (!row) {
        const existing = await client.query(
          `SELECT * FROM financial_journal_entries
            WHERE account_id = $1 AND source_type = $2 AND source_id = $3
            LIMIT 1`,
          [input.accountId, input.sourceType, input.sourceId]
        );
        row = existing.rows[0] as Record<string, unknown> | undefined;
      } else {
        const lineValues = input.lines.flatMap((line) => [
          line.id,
          input.accountId,
          input.id,
          line.accountCode,
          line.debit,
          line.credit,
          line.memo,
          new Date(line.createdAt)
        ]);
        const linePlaceholders = input.lines.map((_, lineIndex) => {
          const offset = lineIndex * 8;
          return `(${Array.from({ length: 8 }, (_, valueIndex) => `$${offset + valueIndex + 1}`).join(', ')})`;
        });
        await client.query(
          `INSERT INTO financial_journal_lines
            (id, account_id, entry_id, account_code, debit, credit, memo, created_at)
           VALUES ${linePlaceholders.join(', ')}`,
          lineValues
        );
      }
      if (!row) throw new Error('Financial journal entry could not be persisted');
      const lines = await client.query(
        `SELECT * FROM financial_journal_lines WHERE account_id = $1 AND entry_id = $2 ORDER BY id ASC`,
        [input.accountId, row.id]
      );
      return mapEntry(row, lines.rows as Record<string, unknown>[]);
    });
  }

  async findBySource(accountId: AccountId, sourceType: string, sourceId: string) {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM financial_journal_entries
          WHERE account_id = $1 AND source_type = $2 AND source_id = $3 LIMIT 1`,
        [accountId, sourceType, sourceId]
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;
      const lines = await client.query(
        `SELECT * FROM financial_journal_lines WHERE account_id = $1 AND entry_id = $2 ORDER BY id ASC`,
        [accountId, row.id]
      );
      return mapEntry(row, lines.rows as Record<string, unknown>[]);
    });
  }

  async listByAccount(accountId: AccountId, dateFrom?: string, dateTo?: string) {
    return withTenantQuery(getPool(), async (client) => {
      const params: unknown[] = [accountId];
      const clauses = ['account_id = $1'];
      if (dateFrom) {
        params.push(new Date(dateFrom));
        clauses.push(`occurred_at >= $${params.length}`);
      }
      if (dateTo) {
        params.push(new Date(dateTo));
        clauses.push(`occurred_at <= $${params.length}`);
      }
      const result = await client.query(
        `SELECT * FROM financial_journal_entries WHERE ${clauses.join(' AND ')} ORDER BY occurred_at DESC`,
        params
      );
      const entries: FinancialJournalEntry[] = [];
      for (const row of result.rows as Record<string, unknown>[]) {
        const lines = await client.query(
          `SELECT * FROM financial_journal_lines WHERE account_id = $1 AND entry_id = $2 ORDER BY id ASC`,
          [accountId, row.id]
        );
        entries.push(mapEntry(row, lines.rows as Record<string, unknown>[]));
      }
      return entries;
    });
  }
}

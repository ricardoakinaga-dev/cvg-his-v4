import { randomUUID } from 'node:crypto';
import { ConflictError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

export interface FinancialJournalLineInput {
  readonly accountCode: string;
  readonly debit: number;
  readonly credit: number;
  readonly memo?: string | null;
}

export interface FinancialJournalEntryInput {
  readonly id?: string;
  readonly accountId: AccountId;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly description: string;
  readonly occurredAt?: string;
  readonly createdByUserId?: UserId | null;
  readonly lines: readonly FinancialJournalLineInput[];
}

export interface FinancialJournalLine {
  readonly id: string;
  readonly accountId: AccountId;
  readonly entryId: string;
  readonly accountCode: string;
  readonly debit: number;
  readonly credit: number;
  readonly memo: string | null;
  readonly createdAt: string;
}

export interface FinancialJournalEntry {
  readonly id: string;
  readonly accountId: AccountId;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly description: string;
  readonly occurredAt: string;
  readonly createdByUserId: UserId | null;
  readonly createdAt: string;
  readonly lines: readonly FinancialJournalLine[];
}

export interface FinancialLedgerRepository {
  postEntry(input: FinancialJournalEntry): Promise<FinancialJournalEntry>;
  findBySource(
    accountId: AccountId,
    sourceType: string,
    sourceId: string
  ): Promise<FinancialJournalEntry | null>;
  listByAccount(accountId: AccountId, dateFrom?: string, dateTo?: string): Promise<readonly FinancialJournalEntry[]>;
  withTransaction?<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T>;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function requireText(value: string, field: string, max = 255): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    throw new ValidationError(`${field} must contain 1 to ${max} characters`, { field });
  }
  return normalized;
}

function validateLines(lines: readonly FinancialJournalLineInput[]): readonly FinancialJournalLineInput[] {
  if (lines.length < 2) throw new ConflictError('A journal entry requires at least two lines');
  const normalized = lines.map((line) => {
    const debit = roundCurrency(line.debit);
    const credit = roundCurrency(line.credit);
    if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) {
      throw new ValidationError('Journal line amounts must be finite and non-negative');
    }
    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      throw new ConflictError('Each journal line must contain either debit or credit');
    }
    return {
      accountCode: requireText(line.accountCode, 'accountCode', 80),
      debit,
      credit,
      memo: line.memo?.trim() || null
    };
  });
  const debitTotal = roundCurrency(normalized.reduce((sum, line) => sum + line.debit, 0));
  const creditTotal = roundCurrency(normalized.reduce((sum, line) => sum + line.credit, 0));
  if (debitTotal !== creditTotal) {
    throw new ConflictError('Journal entry debit and credit totals must balance', {
      debitTotal,
      creditTotal
    });
  }
  return normalized;
}

export class FinancialLedgerService {
  readonly #repository: FinancialLedgerRepository;

  public constructor(repository: FinancialLedgerRepository) {
    this.#repository = repository;
  }

  public async postEntry(input: FinancialJournalEntryInput): Promise<FinancialJournalEntry> {
    const accountId = requireText(input.accountId, 'accountId');
    const sourceType = requireText(input.sourceType, 'sourceType', 80);
    const sourceId = requireText(input.sourceId, 'sourceId');
    const description = requireText(input.description, 'description', 500);
    const occurredAt = input.occurredAt ?? nowIso();
    if (Number.isNaN(new Date(occurredAt).getTime())) {
      throw new ValidationError('occurredAt must be a valid ISO date');
    }
    const createdAt = nowIso();
    const entryId = input.id ?? randomUUID();
    const lines = validateLines(input.lines).map((line) => ({
      accountCode: line.accountCode,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo ?? null,
      id: randomUUID(),
      accountId: accountId as AccountId,
      entryId,
      createdAt
    }));
    const entry: FinancialJournalEntry = {
      id: entryId,
      accountId: accountId as AccountId,
      sourceType,
      sourceId,
      description,
      occurredAt: new Date(occurredAt).toISOString(),
      createdByUserId: input.createdByUserId ?? null,
      createdAt,
      lines
    };
    const execute = () => this.#repository.postEntry(entry);
    return this.#repository.withTransaction
      ? this.#repository.withTransaction(accountId as AccountId, execute)
      : execute();
  }

  public findBySource(accountId: AccountId, sourceType: string, sourceId: string) {
    return this.#repository.findBySource(accountId, sourceType, sourceId);
  }

  public listByAccount(accountId: AccountId, dateFrom?: string, dateTo?: string) {
    return this.#repository.listByAccount(accountId, dateFrom, dateTo);
  }
}

export class InMemoryFinancialLedgerRepository implements FinancialLedgerRepository {
  readonly #entries = new Map<string, FinancialJournalEntry>();

  async postEntry(input: FinancialJournalEntry): Promise<FinancialJournalEntry> {
    const sourceKey = `${input.accountId}:${input.sourceType}:${input.sourceId}`;
    const existing = [...this.#entries.values()].find(
      (entry) => `${entry.accountId}:${entry.sourceType}:${entry.sourceId}` === sourceKey
    );
    if (existing) return existing;
    const entry = {
      ...input,
      id: input.id ?? createCorrelationId('journal'),
      lines: input.lines.map((line) => ({ ...line }))
    };
    this.#entries.set(entry.id, entry);
    return entry;
  }

  async findBySource(accountId: AccountId, sourceType: string, sourceId: string) {
    return [...this.#entries.values()].find(
      (entry) =>
        entry.accountId === accountId && entry.sourceType === sourceType && entry.sourceId === sourceId
    ) ?? null;
  }

  async listByAccount(accountId: AccountId, dateFrom?: string, dateTo?: string) {
    return [...this.#entries.values()]
      .filter((entry) => entry.accountId === accountId)
      .filter((entry) => !dateFrom || entry.occurredAt >= dateFrom)
      .filter((entry) => !dateTo || entry.occurredAt <= dateTo)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  }
}

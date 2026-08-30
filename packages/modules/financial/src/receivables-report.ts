import { getPool } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { Pool } from 'pg';

export type FinancialReceivablesReportStatus = 'open' | 'settled';
export type FinancialReceivableReportFinancialStatus = 'pending' | 'partial' | 'paid';

export interface FinancialReceivablesReportFilters {
  readonly search?: string;
  readonly status?: FinancialReceivablesReportStatus;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface FinancialReceivablesReportRow extends Record<string, unknown> {
  readonly accountId: AccountId;
  readonly patientName: string;
  readonly ownerName: string;
  readonly patientSpecies: string;
  readonly encounterId: string;
  readonly installmentNumber: number;
  readonly installmentLabel: string;
  readonly issuedAt: string;
  readonly dueAt: string | null;
  readonly settledAt: string | null;
  readonly amountOriginal: number;
  readonly amountPaid: number;
  readonly amountOutstanding: number;
  readonly status: FinancialReceivablesReportStatus;
  readonly financialStatus: FinancialReceivableReportFinancialStatus;
  readonly encounterStatus: 'open' | 'closed';
  readonly paymentCount: number;
}

export interface FinancialReceivablesReportSource {
  list(
    accountId: AccountId,
    filters?: FinancialReceivablesReportFilters
  ): Promise<readonly FinancialReceivablesReportRow[]>;
}

export const MAX_FINANCIAL_RECEIVABLE_REPORT_ROWS = 10_000;

interface FinancialReceivableQueryRow extends Record<string, unknown> {
  readonly account_id: unknown;
  readonly patient_name: unknown;
  readonly owner_name: unknown;
  readonly patient_species: unknown;
  readonly encounter_id: unknown;
  readonly installment_number: unknown;
  readonly installment_label: unknown;
  readonly issued_at: unknown;
  readonly due_at: unknown;
  readonly settled_at: unknown;
  readonly amount_original: unknown;
  readonly amount_paid: unknown;
  readonly amount_outstanding: unknown;
  readonly status: unknown;
  readonly financial_status: unknown;
  readonly encounter_status: unknown;
  readonly payment_count: unknown;
}

const reportDateExpression = `CASE
  WHEN receivable.status = 'settled'
    THEN COALESCE(receivable.settled_at, receivable.issued_at)
  ELSE COALESCE(receivable.due_at, receivable.issued_at)
END`;
const reportDateUtcExpression = `((${reportDateExpression}) AT TIME ZONE 'UTC')::date`;

function invalidFilter(field: string, message: string): AppError {
  return new AppError('FINANCIAL_RECEIVABLE_INVALID_FILTER', message, 422, { field });
}

function invalidPersistedState(code: string, field: string): AppError {
  return new AppError(code, 'Persisted financial-receivables state is invalid', 500, { field });
}

function normalizeSearch(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw invalidFilter('search', 'search must be a string with at most 200 characters');
  }
  const normalized = value.trim();
  if (Array.from(normalized).length > 200) {
    throw invalidFilter('search', 'search must be a string with at most 200 characters');
  }
  return normalized || undefined;
}

function normalizeDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw invalidFilter(field, `${field} must be an ISO calendar date`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw invalidFilter(field, `${field} must be an ISO calendar date`);
  }
  return value;
}

function normalizeStatus(value: unknown): FinancialReceivablesReportStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value !== 'open' && value !== 'settled') {
    throw invalidFilter('status', 'status must be one of open, settled');
  }
  return value;
}

function readRequiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidPersistedState('FINANCIAL_RECEIVABLE_INVALID_STATE', field);
  }
  return value;
}

function readDate(value: unknown, field: string, nullable: boolean): string | null {
  if (value === null || value === undefined) {
    if (nullable) return null;
    throw invalidPersistedState('FINANCIAL_RECEIVABLE_INVALID_DATE', field);
  }
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw invalidPersistedState('FINANCIAL_RECEIVABLE_INVALID_DATE', field);
  }
  return parsed.toISOString();
}

function readAmount(value: unknown, field: string): number {
  const amount = typeof value === 'number' ? value : Number(value);
  const cents = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - amount) > Number.EPSILON * Math.max(1, Math.abs(amount))
  ) {
    throw invalidPersistedState('FINANCIAL_RECEIVABLE_UNSAFE_AMOUNT', field);
  }
  return cents / 100;
}

function readNonNegativeInteger(value: unknown, field: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw invalidPersistedState('FINANCIAL_RECEIVABLE_INVALID_COUNT', field);
  }
  return parsed;
}

function readReceivableStatus(value: unknown): FinancialReceivablesReportStatus {
  if (value === 'open' || value === 'settled') return value;
  throw invalidPersistedState('FINANCIAL_RECEIVABLE_INVALID_STATUS', 'status');
}

function readFinancialStatus(value: unknown): FinancialReceivableReportFinancialStatus {
  if (value === 'pending' || value === 'partial' || value === 'paid') return value;
  throw invalidPersistedState('FINANCIAL_RECEIVABLE_INVALID_FINANCIAL_STATUS', 'financial_status');
}

function readEncounterStatus(value: unknown): 'open' | 'closed' {
  if (value === 'open' || value === 'closed') return value;
  throw invalidPersistedState('FINANCIAL_RECEIVABLE_INVALID_ENCOUNTER_STATUS', 'encounter_status');
}

function mapReportRow(
  row: FinancialReceivableQueryRow,
  accountId: AccountId
): FinancialReceivablesReportRow {
  if (row.account_id !== accountId) {
    throw new AppError(
      'FINANCIAL_RECEIVABLE_TENANT_MISMATCH',
      'Persisted financial-receivables row belongs to another account',
      500,
      { field: 'account_id' }
    );
  }
  return {
    accountId,
    patientName: readRequiredText(row.patient_name, 'patient_name'),
    ownerName: readRequiredText(row.owner_name, 'owner_name'),
    patientSpecies: readRequiredText(row.patient_species, 'patient_species'),
    encounterId: readRequiredText(row.encounter_id, 'encounter_id'),
    installmentNumber: readNonNegativeInteger(row.installment_number, 'installment_number'),
    installmentLabel: readRequiredText(row.installment_label, 'installment_label'),
    issuedAt: readDate(row.issued_at, 'issued_at', false) as string,
    dueAt: readDate(row.due_at, 'due_at', true),
    settledAt: readDate(row.settled_at, 'settled_at', true),
    amountOriginal: readAmount(row.amount_original, 'amount_original'),
    amountPaid: readAmount(row.amount_paid, 'amount_paid'),
    amountOutstanding: readAmount(row.amount_outstanding, 'amount_outstanding'),
    status: readReceivableStatus(row.status),
    financialStatus: readFinancialStatus(row.financial_status),
    encounterStatus: readEncounterStatus(row.encounter_status),
    paymentCount: readNonNegativeInteger(row.payment_count, 'payment_count')
  };
}

/** Read-only account-scoped projection used by scheduled worker reports. */
export class DatabaseFinancialReceivablesReportSource implements FinancialReceivablesReportSource {
  private readonly pool: Pool;

  public constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  public async list(
    accountId: AccountId,
    filters: FinancialReceivablesReportFilters = {}
  ): Promise<readonly FinancialReceivablesReportRow[]> {
    const status = normalizeStatus(filters.status);
    const search = normalizeSearch(filters.search);
    const dateFrom = normalizeDate(filters.dateFrom, 'dateFrom');
    const dateTo = normalizeDate(filters.dateTo, 'dateTo');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw invalidFilter('dateFrom', 'dateFrom must be before or equal to dateTo');
    }

    const params: unknown[] = [accountId];
    const clauses = ['receivable.account_id = $1'];
    if (status) {
      params.push(status);
      clauses.push(`receivable.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const parameter = `$${params.length}`;
      clauses.push(
        `(patient.name ILIKE ${parameter} OR owner.full_name ILIKE ${parameter} OR ` +
          `receivable.installment_label ILIKE ${parameter} OR COALESCE(receivable.notes, '') ILIKE ${parameter})`
      );
    }
    if (dateFrom) {
      params.push(dateFrom);
      clauses.push(`${reportDateUtcExpression} >= $${params.length}::date`);
    }
    if (dateTo) {
      params.push(dateTo);
      clauses.push(`${reportDateUtcExpression} <= $${params.length}::date`);
    }

    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const result = await client.query<FinancialReceivableQueryRow>(
        `SELECT
           receivable.account_id,
           patient.name AS patient_name,
           owner.full_name AS owner_name,
           patient.species AS patient_species,
           receivable.encounter_id,
           receivable.installment_number,
           receivable.installment_label,
           receivable.issued_at,
           receivable.due_at,
           receivable.settled_at,
           receivable.amount_original,
           receivable.amount_paid,
           receivable.amount_outstanding,
           receivable.status,
           financial_account.financial_status,
           encounter.status AS encounter_status,
           COUNT(DISTINCT payment.id)::int AS payment_count
         FROM encounter_receivables AS receivable
         JOIN encounter_financial_accounts AS financial_account
           ON financial_account.account_id = receivable.account_id
          AND financial_account.id = receivable.financial_account_id
          AND financial_account.encounter_id = receivable.encounter_id
         JOIN encounters AS encounter
           ON encounter.account_id = receivable.account_id
          AND encounter.id = receivable.encounter_id
         JOIN patients AS patient
           ON patient.account_id = receivable.account_id
          AND patient.id = encounter.patient_id
         JOIN owners AS owner
           ON owner.account_id = receivable.account_id
          AND owner.id = encounter.owner_id
         LEFT JOIN encounter_receivable_payments AS payment
           ON payment.account_id = receivable.account_id
          AND payment.receivable_id = receivable.id
          AND payment.financial_account_id = receivable.financial_account_id
          AND payment.encounter_id = receivable.encounter_id
         WHERE ${clauses.join(' AND ')}
         GROUP BY receivable.account_id, patient.name, owner.full_name, patient.species,
           receivable.encounter_id, receivable.installment_number, receivable.installment_label,
           receivable.issued_at, receivable.due_at, receivable.settled_at,
           receivable.amount_original, receivable.amount_paid, receivable.amount_outstanding,
           receivable.status, financial_account.financial_status, encounter.status,
           receivable.created_at, receivable.id
         ORDER BY ${reportDateUtcExpression} DESC NULLS LAST, receivable.created_at DESC,
           receivable.id ASC
         LIMIT ${MAX_FINANCIAL_RECEIVABLE_REPORT_ROWS + 1}`,
        params
      );
      if (result.rows.length > MAX_FINANCIAL_RECEIVABLE_REPORT_ROWS) {
        throw new AppError(
          'FINANCIAL_RECEIVABLE_RESULT_LIMIT',
          'Financial-receivables report exceeds the maximum exportable page; refine the filters',
          422
        );
      }
      return result.rows.map((row) => mapReportRow(row, accountId));
    });
  }
}

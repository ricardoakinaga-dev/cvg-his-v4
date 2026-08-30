import { getPool } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { Pool } from 'pg';

export interface PatientsReportFilters {
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export type PatientsReportSex = 'male' | 'female' | 'unknown';
export type PatientsReportStatus = 'active' | 'inactive' | 'deceased';

export interface PatientsReportRow extends Record<string, unknown> {
  readonly accountId: AccountId;
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly species: string;
  readonly breed: string | null;
  readonly sex: PatientsReportSex;
  readonly microchip: string | null;
  readonly status: PatientsReportStatus;
  readonly createdAt: string;
}

export interface PatientsReportSource {
  list(
    accountId: AccountId,
    filters?: PatientsReportFilters
  ): Promise<readonly PatientsReportRow[]>;
}

export const MAX_PATIENTS_REPORT_ROWS = 10_000;

interface PatientsReportQueryRow extends Record<string, unknown> {
  readonly account_id: unknown;
  readonly id: unknown;
  readonly code: unknown;
  readonly name: unknown;
  readonly species: unknown;
  readonly breed: unknown;
  readonly sex: unknown;
  readonly microchip: unknown;
  readonly status: unknown;
  readonly created_at: unknown;
}

function invalidFilter(field: string, message: string): AppError {
  return new AppError('PATIENTS_REPORT_INVALID_FILTER', message, 422, { field });
}

function invalidPersistedState(code: string, field: string): AppError {
  return new AppError(code, 'Persisted patients report state is invalid', 500, { field });
}

function normalizeDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw invalidFilter(field, `${field} must be an ISO calendar date`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    year < 1 ||
    year > 9999 ||
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw invalidFilter(field, `${field} must be an ISO calendar date`);
  }
  return value;
}

function readRequiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidPersistedState('PATIENTS_REPORT_INVALID_TEXT', field);
  }
  return value;
}

function readCode(value: unknown, id: string): string {
  if (value === null || value === undefined || value === '') return id;
  return readRequiredText(value, 'code');
}

function readNullableText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw invalidPersistedState('PATIENTS_REPORT_INVALID_TEXT', field);
  }
  return value;
}

function readSex(value: unknown): PatientsReportSex {
  if (value === null || value === undefined || value === '') return 'unknown';
  if (value === 'male' || value === 'female' || value === 'unknown') return value;
  throw invalidPersistedState('PATIENTS_REPORT_INVALID_SEX', 'sex');
}

function readStatus(value: unknown): PatientsReportStatus {
  if (value === null || value === undefined || value === '') return 'active';
  if (value === 'active' || value === 'inactive' || value === 'deceased') return value;
  throw invalidPersistedState('PATIENTS_REPORT_INVALID_STATUS', 'status');
}

function readDate(value: unknown, field: string): string {
  if (value === null || value === undefined) {
    throw invalidPersistedState('PATIENTS_REPORT_INVALID_DATE', field);
  }
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw invalidPersistedState('PATIENTS_REPORT_INVALID_DATE', field);
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw invalidPersistedState('PATIENTS_REPORT_INVALID_DATE', field);
  }
  return parsed.toISOString();
}

function mapReportRow(row: PatientsReportQueryRow, accountId: AccountId): PatientsReportRow {
  if (row.account_id !== accountId) {
    throw new AppError(
      'PATIENTS_REPORT_TENANT_MISMATCH',
      'Persisted patients report row belongs to another account',
      500,
      { field: 'account_id' }
    );
  }

  const id = readRequiredText(row.id, 'id');
  return {
    accountId,
    id,
    code: readCode(row.code, id),
    name: readRequiredText(row.name, 'name'),
    species: readRequiredText(row.species, 'species'),
    breed: readNullableText(row.breed, 'breed'),
    sex: readSex(row.sex),
    microchip: readNullableText(row.microchip, 'microchip'),
    status: readStatus(row.status),
    createdAt: readDate(row.created_at, 'created_at')
  };
}

/** Read-only account-scoped projection shared by scheduled worker consumers. */
export class DatabasePatientsReportSource implements PatientsReportSource {
  private readonly pool: Pool;

  public constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  public async list(
    accountId: AccountId,
    filters: PatientsReportFilters = {}
  ): Promise<readonly PatientsReportRow[]> {
    const dateFrom = normalizeDate(filters.dateFrom, 'dateFrom');
    const dateTo = normalizeDate(filters.dateTo, 'dateTo');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw invalidFilter('dateFrom', 'dateFrom must be before or equal to dateTo');
    }

    const params: unknown[] = [accountId];
    const clauses = ['patients.account_id = $1'];
    const createdAtUtcDate = "(patients.created_at AT TIME ZONE 'UTC')::date";
    if (dateFrom) {
      params.push(dateFrom);
      clauses.push(`${createdAtUtcDate} >= $${params.length}::date`);
    }
    if (dateTo) {
      params.push(dateTo);
      clauses.push(`${createdAtUtcDate} <= $${params.length}::date`);
    }

    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const result = await client.query<PatientsReportQueryRow>(
        `SELECT
           patients.account_id,
           patients.id,
           COALESCE(NULLIF(patients.alerts_json ->> 'legacyVetusId', ''), patients.id::text) AS code,
           patients.name,
           patients.species,
           patients.breed,
           patients.sex,
           patients.microchip,
           COALESCE(NULLIF(patients.alerts_json ->> 'status', ''), 'active') AS status,
           patients.created_at
         FROM patients
         WHERE ${clauses.join(' AND ')}
         ORDER BY patients.name ASC, patients.id ASC
         LIMIT ${MAX_PATIENTS_REPORT_ROWS + 1}`,
        params
      );
      if (result.rows.length > MAX_PATIENTS_REPORT_ROWS) {
        throw new AppError(
          'PATIENTS_REPORT_RESULT_LIMIT',
          'Patients report exceeds the maximum exportable page; refine the filters',
          422
        );
      }
      return result.rows.map((row) => mapReportRow(row, accountId));
    });
  }
}

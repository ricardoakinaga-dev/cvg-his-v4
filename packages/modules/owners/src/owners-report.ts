import { getPool } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { Pool } from 'pg';

export interface OwnersReportFilters {
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface OwnersReportRow extends Record<string, unknown> {
  readonly accountId: AccountId;
  readonly id: string;
  readonly documentId: string | null;
  readonly fullName: string;
  readonly primaryContact: string | null;
  readonly city: string | null;
  readonly financialResponsible: boolean;
  readonly status: 'active' | 'inactive';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OwnersReportSource {
  list(accountId: AccountId, filters?: OwnersReportFilters): Promise<readonly OwnersReportRow[]>;
}

export const MAX_OWNERS_REPORT_ROWS = 10_000;

interface OwnersReportQueryRow extends Record<string, unknown> {
  readonly account_id: unknown;
  readonly id: unknown;
  readonly document: unknown;
  readonly full_name: unknown;
  readonly email: unknown;
  readonly phone_main: unknown;
  readonly phone_alt: unknown;
  readonly contacts_json: unknown;
  readonly city: unknown;
  readonly financial_responsible: unknown;
  readonly status: unknown;
  readonly created_at: unknown;
  readonly updated_at: unknown;
}

interface OwnerReportContact {
  readonly label: string;
  readonly value: string;
  readonly primary: boolean;
}

function invalidFilter(field: string, message: string): AppError {
  return new AppError('OWNERS_REPORT_INVALID_FILTER', message, 422, { field });
}

function invalidPersistedState(code: string, field: string): AppError {
  return new AppError(code, 'Persisted owners report state is invalid', 500, { field });
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
    throw invalidPersistedState('OWNERS_REPORT_INVALID_TEXT', field);
  }
  return value;
}

function readNullableText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw invalidPersistedState('OWNERS_REPORT_INVALID_TEXT', field);
  }
  return value;
}

function readDate(value: unknown, field: string): string {
  if (value === null || value === undefined) {
    throw invalidPersistedState('OWNERS_REPORT_INVALID_DATE', field);
  }
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw invalidPersistedState('OWNERS_REPORT_INVALID_DATE', field);
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw invalidPersistedState('OWNERS_REPORT_INVALID_DATE', field);
  }
  return parsed.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readContact(value: unknown, index: number): OwnerReportContact {
  if (!isRecord(value)) {
    throw invalidPersistedState('OWNERS_REPORT_INVALID_CONTACTS', `contacts[${index}]`);
  }
  const label = value.label;
  const contactValue = value.value;
  const primary = value.primary;
  if (
    typeof label !== 'string' ||
    label.length === 0 ||
    typeof contactValue !== 'string' ||
    contactValue.length === 0 ||
    (primary !== undefined && typeof primary !== 'boolean')
  ) {
    throw invalidPersistedState('OWNERS_REPORT_INVALID_CONTACTS', `contacts[${index}]`);
  }
  if (value.type !== 'email' && value.type !== 'phone' && value.type !== 'whatsapp') {
    throw invalidPersistedState('OWNERS_REPORT_INVALID_CONTACTS', `contacts[${index}].type`);
  }

  return {
    label,
    value: contactValue,
    primary: primary ?? index === 0
  };
}

function readContacts(value: unknown): readonly OwnerReportContact[] | undefined {
  if (value === null || value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw invalidPersistedState('OWNERS_REPORT_INVALID_CONTACTS', 'contacts_json');
  }
  return value.map((contact, index) => readContact(contact, index));
}

function readFinancialResponsible(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw invalidPersistedState(
    'OWNERS_REPORT_INVALID_FINANCIAL_RESPONSIBLE',
    'financial_responsible'
  );
}

function readStatus(value: unknown): 'active' | 'inactive' {
  if (value === null || value === undefined || value === '') return 'active';
  if (value === 'active' || value === 'inactive') return value;
  throw invalidPersistedState('OWNERS_REPORT_INVALID_STATUS', 'status');
}

function formatPrimaryContact(
  contacts: readonly OwnerReportContact[] | undefined,
  email: string | null,
  phoneMain: string | null,
  phoneAlt: string | null
): string | null {
  if (contacts && contacts.length > 0) {
    const contact = contacts.find((item) => item.primary) ?? contacts[0];
    return `${contact.label}: ${contact.value}`;
  }
  if (phoneMain) return `Telefone: ${phoneMain}`;
  if (email) return `Email: ${email}`;
  if (phoneAlt) return `Telefone 2: ${phoneAlt}`;
  return null;
}

function mapReportRow(row: OwnersReportQueryRow, accountId: AccountId): OwnersReportRow {
  if (row.account_id !== accountId) {
    throw new AppError(
      'OWNERS_REPORT_TENANT_MISMATCH',
      'Persisted owners report row belongs to another account',
      500,
      { field: 'account_id' }
    );
  }

  const email = readNullableText(row.email, 'email');
  const phoneMain = readNullableText(row.phone_main, 'phone_main');
  const phoneAlt = readNullableText(row.phone_alt, 'phone_alt');

  return {
    accountId,
    id: readRequiredText(row.id, 'id'),
    documentId: readNullableText(row.document, 'document'),
    fullName: readRequiredText(row.full_name, 'full_name'),
    primaryContact: formatPrimaryContact(
      readContacts(row.contacts_json),
      email,
      phoneMain,
      phoneAlt
    ),
    city: readNullableText(row.city, 'city'),
    financialResponsible: readFinancialResponsible(row.financial_responsible),
    status: readStatus(row.status),
    createdAt: readDate(row.created_at, 'created_at'),
    updatedAt: readDate(row.updated_at, 'updated_at')
  };
}

/** Read-only account-scoped projection shared by scheduled worker consumers. */
export class DatabaseOwnersReportSource implements OwnersReportSource {
  private readonly pool: Pool;

  public constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  public async list(
    accountId: AccountId,
    filters: OwnersReportFilters = {}
  ): Promise<readonly OwnersReportRow[]> {
    const dateFrom = normalizeDate(filters.dateFrom, 'dateFrom');
    const dateTo = normalizeDate(filters.dateTo, 'dateTo');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw invalidFilter('dateFrom', 'dateFrom must be before or equal to dateTo');
    }

    const params: unknown[] = [accountId];
    const clauses = ['owners.account_id = $1'];
    const createdAtUtcDate = "(owners.created_at AT TIME ZONE 'UTC')::date";
    if (dateFrom) {
      params.push(dateFrom);
      clauses.push(`${createdAtUtcDate} >= $${params.length}::date`);
    }
    if (dateTo) {
      params.push(dateTo);
      clauses.push(`${createdAtUtcDate} <= $${params.length}::date`);
    }

    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const result = await client.query<OwnersReportQueryRow>(
        `SELECT
           owners.account_id,
           owners.id,
           owners.document,
           owners.full_name,
           owners.email,
           owners.phone_main,
           owners.phone_alt,
           owners.address_json -> 'contacts' AS contacts_json,
           COALESCE(
             owners.address_json -> 'address' ->> 'city',
             owners.address_json ->> 'city'
           ) AS city,
           owners.address_json ->> 'financialResponsible' AS financial_responsible,
           owners.address_json ->> 'status' AS status,
           owners.created_at,
           owners.updated_at
         FROM owners
         WHERE ${clauses.join(' AND ')}
         ORDER BY owners.full_name ASC, owners.id ASC
         LIMIT ${MAX_OWNERS_REPORT_ROWS + 1}`,
        params
      );
      if (result.rows.length > MAX_OWNERS_REPORT_ROWS) {
        throw new AppError(
          'OWNERS_REPORT_RESULT_LIMIT',
          'Owners report exceeds the maximum exportable page; refine the filters',
          422
        );
      }
      return result.rows.map((row) => mapReportRow(row, accountId));
    });
  }
}

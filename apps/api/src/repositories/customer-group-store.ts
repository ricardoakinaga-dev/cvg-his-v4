import { getPool } from '@cvg-his-v2/shared-database';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

interface CustomerGroupSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly code: string | null;
  readonly segment: string | null;
  readonly discountPercent: number;
  readonly paymentTermDays: number;
  readonly creditLimitAmount: number | null;
  readonly description: string | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CustomerGroupInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly segment?: string | null;
  readonly discountPercent?: number | string | null;
  readonly paymentTermDays?: number | string | null;
  readonly creditLimitAmount?: number | string | null;
  readonly description?: string | null;
  readonly active?: boolean;
}

interface CustomerGroupListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly segment?: string;
}

interface CustomerGroupStore {
  create(accountId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary>;
  update(customerGroupId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary>;
  getOrThrow(customerGroupId: string): Promise<CustomerGroupSummary>;
  list(accountId: string, filters: CustomerGroupListFilters): Promise<CustomerGroupSummary[]>;
  delete(customerGroupId: string): Promise<void>;
}

const customerGroupMaxNameLength = 160;
const customerGroupMaxCodeLength = 80;
const customerGroupMaxSegmentLength = 80;
const customerGroupMaxDescriptionLength = 1000;

function normalizeCustomerGroupName(value: string | undefined): string {
  const name = requireNonEmptyString(value, 'name').trim();
  if (name.length > customerGroupMaxNameLength) {
    throw new ValidationError(`name must have at most ${customerGroupMaxNameLength} characters`);
  }
  return name;
}

function normalizeCustomerGroupCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > customerGroupMaxCodeLength) {
    throw new ValidationError(`code must have at most ${customerGroupMaxCodeLength} characters`);
  }
  return code;
}

function normalizeCustomerGroupSegment(value: string | null | undefined): string | null {
  const segment = value?.trim() || null;
  if (segment && segment.length > customerGroupMaxSegmentLength) {
    throw new ValidationError(
      `segment must have at most ${customerGroupMaxSegmentLength} characters`
    );
  }
  return segment;
}

function normalizeCustomerGroupDescription(value: string | null | undefined): string | null {
  const description = value?.trim() || null;
  if (description && description.length > customerGroupMaxDescriptionLength) {
    throw new ValidationError(
      `description must have at most ${customerGroupMaxDescriptionLength} characters`
    );
  }
  return description;
}

function normalizeCustomerGroupNumber(
  value: number | string | null | undefined,
  field: string,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (value === null || value === undefined || value === '') return defaultValue;
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }
  return Number(numberValue.toFixed(2));
}

function normalizeCustomerGroupCreditLimit(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new ValidationError('creditLimitAmount must be greater than or equal to 0');
  }
  return Number(numberValue.toFixed(2));
}

function mapCustomerGroupRow(row: Record<string, unknown>): CustomerGroupSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    code: (row.code as string | null) ?? null,
    segment: (row.segment as string | null) ?? null,
    discountPercent: Number(row.discount_percent ?? 0),
    paymentTermDays: Number(row.payment_term_days ?? 0),
    creditLimitAmount: row.credit_limit_amount === null ? null : Number(row.credit_limit_amount),
    description: (row.description as string | null) ?? null,
    active: row.active as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

function createCustomerGroupSummary(
  accountId: string,
  input: CustomerGroupInput
): CustomerGroupSummary {
  const now = new Date().toISOString();
  return {
    id: createCorrelationId('customer-group'),
    accountId,
    name: normalizeCustomerGroupName(input.name),
    code: normalizeCustomerGroupCode(input.code),
    segment: normalizeCustomerGroupSegment(input.segment),
    discountPercent: normalizeCustomerGroupNumber(
      input.discountPercent,
      'discountPercent',
      0,
      100,
      0
    ),
    paymentTermDays: Math.round(
      normalizeCustomerGroupNumber(input.paymentTermDays, 'paymentTermDays', 0, 365, 0)
    ),
    creditLimitAmount: normalizeCustomerGroupCreditLimit(input.creditLimitAmount),
    description: normalizeCustomerGroupDescription(input.description),
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now
  };
}

class InMemoryCustomerGroupStore implements CustomerGroupStore {
  readonly #customerGroups = new Map<string, CustomerGroupSummary>();

  async create(accountId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const customerGroup = createCustomerGroupSummary(accountId, input);
    this.#customerGroups.set(customerGroup.id, customerGroup);
    return customerGroup;
  }

  async update(customerGroupId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const existing = await this.getOrThrow(customerGroupId);
    const updated: CustomerGroupSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeCustomerGroupName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeCustomerGroupCode(input.code) : existing.code,
      segment:
        input.segment !== undefined
          ? normalizeCustomerGroupSegment(input.segment)
          : existing.segment,
      discountPercent:
        input.discountPercent !== undefined
          ? normalizeCustomerGroupNumber(input.discountPercent, 'discountPercent', 0, 100, 0)
          : existing.discountPercent,
      paymentTermDays:
        input.paymentTermDays !== undefined
          ? Math.round(
              normalizeCustomerGroupNumber(input.paymentTermDays, 'paymentTermDays', 0, 365, 0)
            )
          : existing.paymentTermDays,
      creditLimitAmount:
        input.creditLimitAmount !== undefined
          ? normalizeCustomerGroupCreditLimit(input.creditLimitAmount)
          : existing.creditLimitAmount,
      description:
        input.description !== undefined
          ? normalizeCustomerGroupDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };
    this.#customerGroups.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(customerGroupId: string): Promise<CustomerGroupSummary> {
    const customerGroup = this.#customerGroups.get(customerGroupId);
    if (!customerGroup) {
      throw new NotFoundError('Customer group not found', { customerGroupId });
    }
    return customerGroup;
  }

  async list(
    accountId: string,
    filters: CustomerGroupListFilters
  ): Promise<CustomerGroupSummary[]> {
    let items = Array.from(this.#customerGroups.values()).filter(
      (customerGroup) => customerGroup.accountId === accountId
    );

    if (filters.active !== undefined) {
      items = items.filter((customerGroup) => customerGroup.active === filters.active);
    }
    if (filters.segment) {
      const segment = filters.segment.toLowerCase();
      items = items.filter((customerGroup) => customerGroup.segment?.toLowerCase() === segment);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (customerGroup) =>
          customerGroup.name.toLowerCase().includes(search) ||
          (customerGroup.code?.toLowerCase().includes(search) ?? false) ||
          (customerGroup.segment?.toLowerCase().includes(search) ?? false) ||
          (customerGroup.description?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(customerGroupId: string): Promise<void> {
    this.#customerGroups.delete(customerGroupId);
  }
}

class DatabaseCustomerGroupStore implements CustomerGroupStore {
  async create(accountId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const customerGroup = createCustomerGroupSummary(accountId, input);
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO customer_groups (
           id,
           account_id,
           name,
           code,
           segment,
           discount_percent,
           payment_term_days,
           credit_limit_amount,
           description,
           active,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          customerGroup.id,
          customerGroup.accountId,
          customerGroup.name,
          customerGroup.code,
          customerGroup.segment,
          customerGroup.discountPercent,
          customerGroup.paymentTermDays,
          customerGroup.creditLimitAmount,
          customerGroup.description,
          customerGroup.active,
          new Date(customerGroup.createdAt),
          new Date(customerGroup.updatedAt)
        ]
      );
      return mapCustomerGroupRow(result.rows[0]);
    });
  }

  async update(customerGroupId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const existing = await this.getOrThrow(customerGroupId);
    const updated: CustomerGroupSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeCustomerGroupName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeCustomerGroupCode(input.code) : existing.code,
      segment:
        input.segment !== undefined
          ? normalizeCustomerGroupSegment(input.segment)
          : existing.segment,
      discountPercent:
        input.discountPercent !== undefined
          ? normalizeCustomerGroupNumber(input.discountPercent, 'discountPercent', 0, 100, 0)
          : existing.discountPercent,
      paymentTermDays:
        input.paymentTermDays !== undefined
          ? Math.round(
              normalizeCustomerGroupNumber(input.paymentTermDays, 'paymentTermDays', 0, 365, 0)
            )
          : existing.paymentTermDays,
      creditLimitAmount:
        input.creditLimitAmount !== undefined
          ? normalizeCustomerGroupCreditLimit(input.creditLimitAmount)
          : existing.creditLimitAmount,
      description:
        input.description !== undefined
          ? normalizeCustomerGroupDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE customer_groups
         SET name = $2,
             code = $3,
             segment = $4,
             discount_percent = $5,
             payment_term_days = $6,
             credit_limit_amount = $7,
             description = $8,
             active = $9,
             updated_at = $10
         WHERE id = $1
         RETURNING *`,
        [
          customerGroupId,
          updated.name,
          updated.code,
          updated.segment,
          updated.discountPercent,
          updated.paymentTermDays,
          updated.creditLimitAmount,
          updated.description,
          updated.active,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Customer group not found', { customerGroupId });
      }
      return mapCustomerGroupRow(result.rows[0]);
    });
  }

  async getOrThrow(customerGroupId: string): Promise<CustomerGroupSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM customer_groups WHERE id = $1', [
        customerGroupId
      ]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Customer group not found', { customerGroupId });
      }
      return mapCustomerGroupRow(result.rows[0]);
    });
  }

  async list(
    accountId: string,
    filters: CustomerGroupListFilters
  ): Promise<CustomerGroupSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM customer_groups WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (filters.segment) {
        sql += ` AND segment ILIKE $${nextParam}`;
        params.push(filters.segment);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (name ILIKE $${nextParam} OR code ILIKE $${nextParam} OR segment ILIKE $${nextParam} OR description ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapCustomerGroupRow(row));
    });
  }

  async delete(customerGroupId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM customer_groups WHERE id = $1', [customerGroupId]);
    });
  }
}

export function createCustomerGroupStore(useDatabase: boolean): CustomerGroupStore {
  if (!useDatabase) return new InMemoryCustomerGroupStore();

  try {
    getPool();
    return new DatabaseCustomerGroupStore();
  } catch {
    return new InMemoryCustomerGroupStore();
  }
}

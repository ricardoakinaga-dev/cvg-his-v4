import { getPool } from '@cvg-his-v2/shared-database';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

type ResponsibilityTermUsageContext =
  | 'atendimento'
  | 'internacao'
  | 'procedimento'
  | 'autorizacao'
  | 'outro';

interface ResponsibilityTermSummary {
  readonly id: string;
  readonly accountId: string;
  readonly title: string;
  readonly code: string | null;
  readonly usageContext: ResponsibilityTermUsageContext;
  readonly content: string;
  readonly active: boolean;
  readonly requiresOwnerSignature: boolean;
  readonly requiresWitnessSignature: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ResponsibilityTermInput {
  readonly title?: string;
  readonly code?: string | null;
  readonly usageContext?: ResponsibilityTermUsageContext;
  readonly content?: string;
  readonly active?: boolean;
  readonly requiresOwnerSignature?: boolean;
  readonly requiresWitnessSignature?: boolean;
}

interface ResponsibilityTermListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly usageContext?: string;
}

interface ResponsibilityTermStore {
  create(accountId: string, input: ResponsibilityTermInput): Promise<ResponsibilityTermSummary>;
  update(termId: string, input: ResponsibilityTermInput): Promise<ResponsibilityTermSummary>;
  getOrThrow(termId: string): Promise<ResponsibilityTermSummary>;
  list(
    accountId: string,
    filters: ResponsibilityTermListFilters
  ): Promise<ResponsibilityTermSummary[]>;
  delete(termId: string): Promise<void>;
}

const responsibilityTermUsageContexts = new Set<ResponsibilityTermUsageContext>([
  'atendimento',
  'internacao',
  'procedimento',
  'autorizacao',
  'outro'
]);
const responsibilityTermMaxTitleLength = 160;
const responsibilityTermMaxCodeLength = 80;
const responsibilityTermMaxContentLength = 20000;

function normalizeResponsibilityTermUsageContext(
  value: ResponsibilityTermUsageContext | undefined
): ResponsibilityTermUsageContext {
  if (!value) return 'atendimento';
  if (!responsibilityTermUsageContexts.has(value)) {
    throw new ValidationError('usageContext is invalid');
  }
  return value;
}

function normalizeResponsibilityTermTitle(value: string | undefined): string {
  const title = requireNonEmptyString(value, 'title').trim();
  if (title.length > responsibilityTermMaxTitleLength) {
    throw new ValidationError(
      `title must have at most ${responsibilityTermMaxTitleLength} characters`
    );
  }
  return title;
}

function normalizeResponsibilityTermCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > responsibilityTermMaxCodeLength) {
    throw new ValidationError(
      `code must have at most ${responsibilityTermMaxCodeLength} characters`
    );
  }
  return code;
}

function normalizeResponsibilityTermContent(value: string | undefined): string {
  const content = requireNonEmptyString(value, 'content').trim();
  if (content.length > responsibilityTermMaxContentLength) {
    throw new ValidationError(
      `content must have at most ${responsibilityTermMaxContentLength} characters`
    );
  }
  return content;
}

function mapResponsibilityTermRow(row: Record<string, unknown>): ResponsibilityTermSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    title: row.title as string,
    code: (row.code as string | null) ?? null,
    usageContext: row.usage_context as ResponsibilityTermUsageContext,
    content: row.content as string,
    active: row.active as boolean,
    requiresOwnerSignature: row.requires_owner_signature as boolean,
    requiresWitnessSignature: row.requires_witness_signature as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

class InMemoryResponsibilityTermStore implements ResponsibilityTermStore {
  readonly #terms = new Map<string, ResponsibilityTermSummary>();

  async create(
    accountId: string,
    input: ResponsibilityTermInput
  ): Promise<ResponsibilityTermSummary> {
    const now = new Date().toISOString();
    const term: ResponsibilityTermSummary = {
      id: createCorrelationId('term'),
      accountId,
      title: normalizeResponsibilityTermTitle(input.title),
      code: normalizeResponsibilityTermCode(input.code),
      usageContext: normalizeResponsibilityTermUsageContext(input.usageContext),
      content: normalizeResponsibilityTermContent(input.content),
      active: input.active ?? true,
      requiresOwnerSignature: input.requiresOwnerSignature ?? true,
      requiresWitnessSignature: input.requiresWitnessSignature ?? false,
      createdAt: now,
      updatedAt: now
    };

    this.#terms.set(term.id, term);
    return term;
  }

  async update(termId: string, input: ResponsibilityTermInput): Promise<ResponsibilityTermSummary> {
    const existing = await this.getOrThrow(termId);
    const updated: ResponsibilityTermSummary = {
      ...existing,
      title:
        input.title !== undefined ? normalizeResponsibilityTermTitle(input.title) : existing.title,
      code: input.code !== undefined ? normalizeResponsibilityTermCode(input.code) : existing.code,
      usageContext:
        input.usageContext !== undefined
          ? normalizeResponsibilityTermUsageContext(input.usageContext)
          : existing.usageContext,
      content:
        input.content !== undefined
          ? normalizeResponsibilityTermContent(input.content)
          : existing.content,
      active: input.active ?? existing.active,
      requiresOwnerSignature: input.requiresOwnerSignature ?? existing.requiresOwnerSignature,
      requiresWitnessSignature: input.requiresWitnessSignature ?? existing.requiresWitnessSignature,
      updatedAt: new Date().toISOString()
    };

    this.#terms.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(termId: string): Promise<ResponsibilityTermSummary> {
    const term = this.#terms.get(termId);
    if (!term) {
      throw new NotFoundError('Responsibility term not found', { termId });
    }
    return term;
  }

  async list(
    accountId: string,
    filters: ResponsibilityTermListFilters
  ): Promise<ResponsibilityTermSummary[]> {
    let items = Array.from(this.#terms.values()).filter((term) => term.accountId === accountId);

    if (filters.active !== undefined) {
      items = items.filter((term) => term.active === filters.active);
    }

    if (
      filters.usageContext &&
      responsibilityTermUsageContexts.has(filters.usageContext as ResponsibilityTermUsageContext)
    ) {
      items = items.filter((term) => term.usageContext === filters.usageContext);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (term) =>
          term.title.toLowerCase().includes(search) ||
          (term.code?.toLowerCase().includes(search) ?? false) ||
          term.content.toLowerCase().includes(search)
      );
    }

    return items.sort((a, b) => a.title.localeCompare(b.title));
  }

  async delete(termId: string): Promise<void> {
    this.#terms.delete(termId);
  }
}

class DatabaseResponsibilityTermStore implements ResponsibilityTermStore {
  async create(
    accountId: string,
    input: ResponsibilityTermInput
  ): Promise<ResponsibilityTermSummary> {
    const now = new Date();
    const term: ResponsibilityTermSummary = {
      id: createCorrelationId('term'),
      accountId,
      title: normalizeResponsibilityTermTitle(input.title),
      code: normalizeResponsibilityTermCode(input.code),
      usageContext: normalizeResponsibilityTermUsageContext(input.usageContext),
      content: normalizeResponsibilityTermContent(input.content),
      active: input.active ?? true,
      requiresOwnerSignature: input.requiresOwnerSignature ?? true,
      requiresWitnessSignature: input.requiresWitnessSignature ?? false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO responsibility_terms (
           id,
           account_id,
           title,
           code,
           usage_context,
           content,
           active,
           requires_owner_signature,
           requires_witness_signature,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          term.id,
          term.accountId,
          term.title,
          term.code,
          term.usageContext,
          term.content,
          term.active,
          term.requiresOwnerSignature,
          term.requiresWitnessSignature,
          new Date(term.createdAt),
          new Date(term.updatedAt)
        ]
      );
      return mapResponsibilityTermRow(result.rows[0]);
    });
  }

  async update(termId: string, input: ResponsibilityTermInput): Promise<ResponsibilityTermSummary> {
    const existing = await this.getOrThrow(termId);
    const updated: ResponsibilityTermSummary = {
      ...existing,
      title:
        input.title !== undefined ? normalizeResponsibilityTermTitle(input.title) : existing.title,
      code: input.code !== undefined ? normalizeResponsibilityTermCode(input.code) : existing.code,
      usageContext:
        input.usageContext !== undefined
          ? normalizeResponsibilityTermUsageContext(input.usageContext)
          : existing.usageContext,
      content:
        input.content !== undefined
          ? normalizeResponsibilityTermContent(input.content)
          : existing.content,
      active: input.active ?? existing.active,
      requiresOwnerSignature: input.requiresOwnerSignature ?? existing.requiresOwnerSignature,
      requiresWitnessSignature: input.requiresWitnessSignature ?? existing.requiresWitnessSignature,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE responsibility_terms
         SET title = $2,
             code = $3,
             usage_context = $4,
             content = $5,
             active = $6,
             requires_owner_signature = $7,
             requires_witness_signature = $8,
             updated_at = $9
         WHERE id = $1
         RETURNING *`,
        [
          termId,
          updated.title,
          updated.code,
          updated.usageContext,
          updated.content,
          updated.active,
          updated.requiresOwnerSignature,
          updated.requiresWitnessSignature,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Responsibility term not found', { termId });
      }
      return mapResponsibilityTermRow(result.rows[0]);
    });
  }

  async getOrThrow(termId: string): Promise<ResponsibilityTermSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM responsibility_terms WHERE id = $1', [
        termId
      ]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Responsibility term not found', { termId });
      }
      return mapResponsibilityTermRow(result.rows[0]);
    });
  }

  async list(
    accountId: string,
    filters: ResponsibilityTermListFilters
  ): Promise<ResponsibilityTermSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM responsibility_terms WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (
        filters.usageContext &&
        responsibilityTermUsageContexts.has(filters.usageContext as ResponsibilityTermUsageContext)
      ) {
        sql += ` AND usage_context = $${nextParam}`;
        params.push(filters.usageContext);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (title ILIKE $${nextParam} OR code ILIKE $${nextParam} OR content ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY title ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapResponsibilityTermRow(row));
    });
  }

  async delete(termId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM responsibility_terms WHERE id = $1', [termId]);
    });
  }
}

export function createResponsibilityTermStore(useDatabase: boolean): ResponsibilityTermStore {
  if (!useDatabase) return new InMemoryResponsibilityTermStore();

  try {
    getPool();
    return new DatabaseResponsibilityTermStore();
  } catch {
    return new InMemoryResponsibilityTermStore();
  }
}

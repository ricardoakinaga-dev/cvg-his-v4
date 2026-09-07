import { eq, and, desc, exists, type SQL } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { featureFlags, featureFlagOverrides } from '@cvg-his-v2/shared-database/schemas';
import type { AccountId } from '@cvg-his-v2/shared-types';

/**
 * Repository for managing feature flags and their overrides in the database.
 * Used by the administrative API (PR-FF-10) and wired into the audit trail (PR-FF-11).
 */
export interface FeatureFlagRepository {
  /**
   * Find a flag by its key within an account scope.
   */
  findFlagByKey(key: string, accountId: AccountId): Promise<FeatureFlagRow | null>;

  /**
   * List all flags for an account, ordered by key.
   */
  listFlags(accountId: AccountId): Promise<readonly FeatureFlagRow[]>;

  /**
   * Create a new feature flag.
   */
  createFlag(input: FeatureFlagInput): Promise<FeatureFlagRow>;

  /**
   * Update an existing feature flag.
   */
  updateFlag(id: string, input: FeatureFlagUpdate): Promise<FeatureFlagRow>;

  /**
   * Delete a feature flag (soft delete — sets enabled=false).
   */
  deleteFlag(id: string): Promise<void>;

  /**
   * Administrative lookup: optional account and nonempty environment filter.
   * User overrides are included; newest updatedAt then ID breaks ties.
   * Use listOverrides to inspect all matching scopes.
   */
  findOverride(
    flagId: string,
    environment: string,
    accountId?: AccountId
  ): Promise<FeatureFlagOverrideRow | null>;

  /**
   * List all overrides for a flag.
   */
  listOverrides(flagId: string): Promise<readonly FeatureFlagOverrideRow[]>;

  /**
   * Create a new override for a flag.
   */
  createOverride(input: FeatureFlagOverrideInput): Promise<FeatureFlagOverrideRow>;

  /**
   * Update an existing override.
   */
  updateOverride(id: string, input: FeatureFlagOverrideUpdate): Promise<FeatureFlagOverrideRow>;

  /**
   * Delete an override.
   */
  deleteOverride(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Row types (aligned with the schema in shared-database/schemas)
// ---------------------------------------------------------------------------

export interface FeatureFlagRow {
  readonly id: string;
  readonly accountId: string;
  readonly key: string;
  readonly owner: string;
  readonly description: string;
  readonly defaultValue: boolean;
  readonly enabled: boolean;
  readonly scopes: string[];
  readonly expiresAt: Date | null;
  readonly auditRequired: boolean;
  readonly tags: string[];
  readonly metadata: Record<string, string | number | boolean> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FeatureFlagInput {
  readonly accountId: AccountId;
  readonly key: string;
  readonly owner: string;
  readonly description: string;
  readonly defaultValue?: boolean;
  readonly scopes?: readonly string[];
  readonly expiresAt?: string;
  readonly auditRequired?: boolean;
  readonly tags?: readonly string[];
}

export interface FeatureFlagUpdate {
  readonly owner?: string;
  readonly description?: string;
  readonly defaultValue?: boolean;
  readonly enabled?: boolean;
  readonly scopes?: readonly string[];
  readonly expiresAt?: string;
  readonly auditRequired?: boolean;
  readonly tags?: readonly string[];
}

export interface FeatureFlagOverrideRow {
  readonly id: string;
  readonly accountId: string;
  readonly flagId: string;
  readonly environment: string | null;
  readonly accountIdOverride: string | null;
  readonly userId: string | null;
  readonly percentage: number | null;
  readonly allowedUsers: string[];
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FeatureFlagOverrideInput {
  readonly accountId: AccountId;
  readonly flagId: string;
  readonly environment?: string;
  readonly accountIdOverride?: AccountId;
  readonly userId?: string;
  readonly percentage?: number;
  readonly allowedUsers?: readonly string[];
  readonly enabled?: boolean;
}

export interface FeatureFlagOverrideUpdate {
  readonly environment?: string;
  readonly accountIdOverride?: AccountId;
  readonly userId?: string;
  readonly percentage?: number;
  readonly allowedUsers?: readonly string[];
  readonly enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class DatabaseFeatureFlagRepository implements FeatureFlagRepository {
  readonly #db: DatabaseClient;
  readonly #accountId?: AccountId;

  /** ID-only operations require a tenant-scoped DB/RLS when accountId is omitted. */
  public constructor(db: DatabaseClient, accountId?: AccountId) {
    this.#db = db;
    this.#accountId = accountId;
  }

  #requireAccount(accountId: AccountId): void {
    if (this.#accountId !== undefined && accountId !== this.#accountId)
      throw new Error('Feature flag account mismatch');
  }

  #flagWhere(condition: SQL): SQL | undefined {
    return and(
      condition,
      this.#accountId === undefined ? undefined : eq(featureFlags.accountId, this.#accountId)
    );
  }

  #overrideWhere(condition: SQL): SQL | undefined {
    return and(
      condition,
      this.#accountId === undefined
        ? undefined
        : and(
            eq(featureFlagOverrides.accountId, this.#accountId),
            exists(
              this.#db
                .select({ id: featureFlags.id })
                .from(featureFlags)
                .where(
                  and(
                    eq(featureFlags.id, featureFlagOverrides.flagId),
                    eq(featureFlags.accountId, this.#accountId)
                  )
                )
            )
          )
    );
  }

  public async findFlagById(id: string, accountId?: AccountId): Promise<FeatureFlagRow | null> {
    if (accountId !== undefined) this.#requireAccount(accountId);
    const rows = await this.#db
      .select()
      .from(featureFlags)
      .where(
        this.#flagWhere(
          and(
            eq(featureFlags.id, id),
            accountId === undefined ? undefined : eq(featureFlags.accountId, accountId)
          )!
        )
      )
      .limit(1);
    return rows[0] ? mapFlagRow(rows[0]) : null;
  }

  public async findFlagByKey(key: string, accountId: AccountId): Promise<FeatureFlagRow | null> {
    this.#requireAccount(accountId);
    const rows = await this.#db
      .select()
      .from(featureFlags)
      .where(and(eq(featureFlags.key, key), eq(featureFlags.accountId, accountId)))
      .limit(1);

    return rows[0] ? mapFlagRow(rows[0]) : null;
  }

  public async listFlags(accountId: AccountId): Promise<readonly FeatureFlagRow[]> {
    this.#requireAccount(accountId);
    const rows = await this.#db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.accountId, accountId))
      .orderBy(featureFlags.key);
    return rows.map(mapFlagRow);
  }

  public async createFlag(input: FeatureFlagInput): Promise<FeatureFlagRow> {
    this.#requireAccount(input.accountId);
    const now = new Date();
    const [row] = await this.#db
      .insert(featureFlags)
      .values({
        accountId: input.accountId,
        key: input.key,
        owner: input.owner,
        description: input.description,
        defaultValue: input.defaultValue ?? false,
        enabled: true,
        scopes: [...(input.scopes ?? ['environment'])],
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        auditRequired: input.auditRequired ?? false,
        tags: [...(input.tags ?? [])],
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return mapFlagRow(row);
  }

  public async updateFlag(id: string, input: FeatureFlagUpdate): Promise<FeatureFlagRow> {
    const [row] = await this.#db
      .update(featureFlags)
      .set({
        owner: input.owner,
        description: input.description,
        defaultValue: input.defaultValue,
        enabled: input.enabled,
        scopes: input.scopes ? [...input.scopes] : undefined,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        auditRequired: input.auditRequired,
        tags: input.tags ? [...input.tags] : undefined,
        updatedAt: new Date()
      })
      .where(this.#flagWhere(eq(featureFlags.id, id)))
      .returning();
    return mapFlagRow(row);
  }

  public async deleteFlag(id: string): Promise<void> {
    const [row] = await this.#db
      .update(featureFlags)
      .set({ enabled: false, updatedAt: new Date() })
      .where(this.#flagWhere(eq(featureFlags.id, id)))
      .returning({ id: featureFlags.id });
    if (!row) throw new Error('Feature flag not found');
  }

  public async findOverride(
    flagId: string,
    environment: string,
    accountId?: AccountId
  ): Promise<FeatureFlagOverrideRow | null> {
    const conditions = [eq(featureFlagOverrides.flagId, flagId)];
    if (accountId) conditions.push(eq(featureFlagOverrides.accountIdOverride, accountId));
    if (environment) conditions.push(eq(featureFlagOverrides.environment, environment));

    const rows = await this.#db
      .select()
      .from(featureFlagOverrides)
      .where(this.#overrideWhere(and(...conditions)!))
      .orderBy(desc(featureFlagOverrides.updatedAt), featureFlagOverrides.id)
      .limit(1);

    return rows[0] ? mapOverrideRow(rows[0]) : null;
  }

  public async listOverrides(flagId: string): Promise<readonly FeatureFlagOverrideRow[]> {
    const rows = await this.#db
      .select()
      .from(featureFlagOverrides)
      .where(this.#overrideWhere(eq(featureFlagOverrides.flagId, flagId)))
      .orderBy(desc(featureFlagOverrides.createdAt));
    return rows.map(mapOverrideRow);
  }

  public async createOverride(input: FeatureFlagOverrideInput): Promise<FeatureFlagOverrideRow> {
    this.#requireAccount(input.accountId);
    if (!(await this.findFlagById(input.flagId, input.accountId)))
      throw new Error('Feature flag not found in override account');
    const now = new Date();
    const [row] = await this.#db
      .insert(featureFlagOverrides)
      .values({
        accountId: input.accountId,
        flagId: input.flagId,
        environment: input.environment ?? null,
        accountIdOverride: input.accountIdOverride ?? null,
        userId: input.userId ?? null,
        percentage: input.percentage ?? null,
        allowedUsers: [...(input.allowedUsers ?? [])],
        enabled: input.enabled ?? true,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return mapOverrideRow(row);
  }

  public async updateOverride(
    id: string,
    input: FeatureFlagOverrideUpdate
  ): Promise<FeatureFlagOverrideRow> {
    const [row] = await this.#db
      .update(featureFlagOverrides)
      .set({
        environment: input.environment,
        accountIdOverride: input.accountIdOverride,
        userId: input.userId,
        percentage: input.percentage,
        allowedUsers: input.allowedUsers ? [...input.allowedUsers] : undefined,
        enabled: input.enabled,
        updatedAt: new Date()
      })
      .where(this.#overrideWhere(eq(featureFlagOverrides.id, id)))
      .returning();
    return mapOverrideRow(row);
  }

  public async deleteOverride(id: string): Promise<void> {
    const [row] = await this.#db
      .update(featureFlagOverrides)
      .set({ enabled: false, updatedAt: new Date() })
      .where(this.#overrideWhere(eq(featureFlagOverrides.id, id)))
      .returning({ id: featureFlagOverrides.id });
    if (!row) throw new Error('Feature flag override not found');
  }
}

function mapFlagRow(row: Record<string, unknown> | undefined): FeatureFlagRow {
  if (!row) throw new Error('Feature flag not found');
  return {
    id: row.id as string,
    accountId: row.accountId as string,
    key: row.key as string,
    owner: row.owner as string,
    description: row.description as string,
    defaultValue: Boolean(row.defaultValue),
    enabled: Boolean(row.enabled),
    scopes: (row.scopes as string[]) ?? [],
    expiresAt:
      row.expiresAt instanceof Date
        ? row.expiresAt
        : row.expiresAt
          ? new Date(row.expiresAt as string)
          : null,
    auditRequired: Boolean(row.auditRequired),
    tags: (row.tags as string[]) ?? [],
    metadata: (row.metadata as Record<string, string | number | boolean>) ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt as string),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt as string)
  };
}

function mapOverrideRow(row: Record<string, unknown> | undefined): FeatureFlagOverrideRow {
  if (!row) throw new Error('Feature flag override not found');
  return {
    id: row.id as string,
    accountId: row.accountId as string,
    flagId: row.flagId as string,
    environment: row.environment as string | null,
    accountIdOverride: row.accountIdOverride as string | null,
    userId: row.userId as string | null,
    percentage: row.percentage as number | null,
    allowedUsers: (row.allowedUsers as string[]) ?? [],
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt as string),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt as string)
  };
}

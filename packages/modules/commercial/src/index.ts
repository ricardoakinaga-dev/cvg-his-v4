import { getPool } from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { randomUUID } from 'node:crypto';
import { nowIso } from '@cvg-his-v2/shared-utils';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

export type LoyaltyPointSource = 'purchase' | 'bonus' | 'adjustment' | 'package' | 'counter_sale';
export type LoyaltyRedemptionStatus = 'pending' | 'completed' | 'cancelled';
export type PriceTableItemKind = 'product' | 'service';
export type PosSyncKind = 'stock' | 'clients';
export type PosSyncStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface LoyaltyProgramSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly name: string;
  readonly pointsPerReal: number;
  readonly redemptionRules: Record<string, unknown>;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LoyaltyPointSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly ownerId: string;
  readonly programId: string | null;
  readonly points: number;
  readonly sourceType: LoyaltyPointSource;
  readonly sourceId: string | null;
  readonly isBlocked: boolean;
  readonly expiresAt: string | null;
  readonly createdBy: UserId | null;
  readonly createdAt: string;
}

export interface LoyaltyRedemptionSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly ownerId: string;
  readonly programId: string | null;
  readonly pointsUsed: number;
  readonly rewardDescription: string;
  readonly productQuantity: number;
  readonly serviceQuantity: number;
  readonly status: LoyaltyRedemptionStatus;
  readonly redeemedBy: UserId | null;
  readonly redeemedAt: string;
  readonly metadata: Record<string, unknown>;
}

export interface LoyaltyBalanceSummary {
  readonly ownerId: string | null;
  readonly availablePoints: number;
  readonly blockedPoints: number;
  readonly redeemedPoints: number;
  readonly redemptionCount: number;
}

export interface PriceTableSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly legacyId: string | null;
  readonly description: string;
  readonly context: string | null;
  readonly isActive: boolean;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PriceTableItemSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly priceTableId: string;
  readonly itemKind: PriceTableItemKind;
  readonly itemId: string;
  readonly price: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PriceTableDetail extends PriceTableSummary {
  readonly items: readonly PriceTableItemSummary[];
}

export interface PosSyncJobSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly syncKind: PosSyncKind;
  readonly status: PosSyncStatus;
  readonly requestedBy: UserId | null;
  readonly requestedAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly processedCount: number;
  readonly errorMessage: string | null;
  readonly metadata: Record<string, unknown>;
}

export interface CommercialRepository {
  saveLoyaltyProgram(program: LoyaltyProgramSummary): Promise<void>;
  saveLoyaltyPoint(point: LoyaltyPointSummary): Promise<void>;
  saveLoyaltyRedemption(redemption: LoyaltyRedemptionSummary): Promise<void>;
  findLoyaltyPrograms(accountId: AccountId): Promise<readonly LoyaltyProgramSummary[]>;
  findLoyaltyPoints(accountId: AccountId): Promise<readonly LoyaltyPointSummary[]>;
  findLoyaltyRedemptions(accountId: AccountId): Promise<readonly LoyaltyRedemptionSummary[]>;
  savePriceTable(table: PriceTableSummary): Promise<void>;
  updatePriceTable(table: PriceTableSummary): Promise<void>;
  savePriceTableItem(item: PriceTableItemSummary): Promise<void>;
  findPriceTables(accountId: AccountId): Promise<readonly PriceTableSummary[]>;
  findPriceTableItems(accountId: AccountId): Promise<readonly PriceTableItemSummary[]>;
  savePosSyncJob(job: PosSyncJobSummary): Promise<void>;
  updatePosSyncJob(job: PosSyncJobSummary): Promise<void>;
  findPosSyncJobs(accountId: AccountId): Promise<readonly PosSyncJobSummary[]>;
}

export interface CommercialServiceOptions {
  readonly repository?: CommercialRepository;
}

export class CommercialService {
  readonly #repository?: CommercialRepository;
  readonly #programs = new Map<string, LoyaltyProgramSummary>();
  readonly #points = new Map<string, LoyaltyPointSummary>();
  readonly #redemptions = new Map<string, LoyaltyRedemptionSummary>();
  readonly #priceTables = new Map<string, PriceTableSummary>();
  readonly #priceTableItems = new Map<string, PriceTableItemSummary>();
  readonly #posSyncJobs = new Map<string, PosSyncJobSummary>();

  public constructor(options?: CommercialServiceOptions) {
    this.#repository = options?.repository;
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) return;
    const [programs, points, redemptions, priceTables, priceItems, jobs] = await Promise.all([
      this.#repository.findLoyaltyPrograms(accountId),
      this.#repository.findLoyaltyPoints(accountId),
      this.#repository.findLoyaltyRedemptions(accountId),
      this.#repository.findPriceTables(accountId),
      this.#repository.findPriceTableItems(accountId),
      this.#repository.findPosSyncJobs(accountId)
    ]);
    for (const item of programs) this.#programs.set(item.id, item);
    for (const item of points) this.#points.set(item.id, item);
    for (const item of redemptions) this.#redemptions.set(item.id, item);
    for (const item of priceTables) this.#priceTables.set(item.id, item);
    for (const item of priceItems) this.#priceTableItems.set(item.id, item);
    for (const item of jobs) this.#posSyncJobs.set(item.id, item);
  }

  public async createLoyaltyProgram(
    accountId: AccountId,
    input: { name: string; pointsPerReal?: number; redemptionRules?: Record<string, unknown>; isActive?: boolean }
  ): Promise<LoyaltyProgramSummary> {
    const name = requireTrimmed(input.name, 'name');
    const now = nowIso();
    const program: LoyaltyProgramSummary = {
      id: randomUUID(),
      accountId,
      name,
      pointsPerReal: roundMoney(input.pointsPerReal ?? 1),
      redemptionRules: input.redemptionRules ?? {},
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now
    };
    this.#programs.set(program.id, program);
    await this.#repository?.saveLoyaltyProgram(program);
    return program;
  }

  public listLoyaltyPrograms(accountId: AccountId): readonly LoyaltyProgramSummary[] {
    return Array.from(this.#programs.values())
      .filter((item) => item.accountId === accountId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public async awardPoints(
    accountId: AccountId,
    createdBy: UserId,
    input: {
      ownerId: string;
      points: number;
      programId?: string | null;
      sourceType?: LoyaltyPointSource;
      sourceId?: string | null;
      isBlocked?: boolean;
      expiresAt?: string | null;
    }
  ): Promise<LoyaltyPointSummary> {
    const points = requireInteger(input.points, 'points');
    if (points === 0) throw new ValidationError('points must be non-zero');
    this.#assertProgramBelongsToAccount(accountId, input.programId ?? null);
    const point: LoyaltyPointSummary = {
      id: randomUUID(),
      accountId,
      ownerId: requireTrimmed(input.ownerId, 'ownerId'),
      programId: input.programId ?? null,
      points,
      sourceType: input.sourceType ?? 'adjustment',
      sourceId: input.sourceId ?? null,
      isBlocked: input.isBlocked ?? false,
      expiresAt: input.expiresAt ?? null,
      createdBy,
      createdAt: nowIso()
    };
    this.#points.set(point.id, point);
    await this.#repository?.saveLoyaltyPoint(point);
    return point;
  }

  public async redeemPoints(
    accountId: AccountId,
    redeemedBy: UserId,
    input: {
      ownerId: string;
      pointsUsed: number;
      rewardDescription: string;
      programId?: string | null;
      productQuantity?: number;
      serviceQuantity?: number;
      status?: LoyaltyRedemptionStatus;
      metadata?: Record<string, unknown>;
    }
  ): Promise<LoyaltyRedemptionSummary> {
    const pointsUsed = requirePositiveInteger(input.pointsUsed, 'pointsUsed');
    this.#assertProgramBelongsToAccount(accountId, input.programId ?? null);
    const ownerId = requireTrimmed(input.ownerId, 'ownerId');
    const balance = this.getLoyaltyBalance(accountId, ownerId);
    if (balance.availablePoints < pointsUsed) {
      throw new ConflictError('Insufficient loyalty points', { ownerId, availablePoints: balance.availablePoints });
    }
    const redemption: LoyaltyRedemptionSummary = {
      id: randomUUID(),
      accountId,
      ownerId,
      programId: input.programId ?? null,
      pointsUsed,
      rewardDescription: requireTrimmed(input.rewardDescription, 'rewardDescription'),
      productQuantity: requireNonNegativeInteger(input.productQuantity ?? 0, 'productQuantity'),
      serviceQuantity: requireNonNegativeInteger(input.serviceQuantity ?? 0, 'serviceQuantity'),
      status: input.status ?? 'completed',
      redeemedBy,
      redeemedAt: nowIso(),
      metadata: input.metadata ?? {}
    };
    this.#redemptions.set(redemption.id, redemption);
    await this.#repository?.saveLoyaltyRedemption(redemption);
    return redemption;
  }

  public listLoyaltyRedemptions(
    accountId: AccountId,
    filters?: { ownerId?: string }
  ): readonly LoyaltyRedemptionSummary[] {
    return Array.from(this.#redemptions.values())
      .filter((item) => item.accountId === accountId)
      .filter((item) => !filters?.ownerId || item.ownerId === filters.ownerId)
      .sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt));
  }

  public getLoyaltyBalance(accountId: AccountId, ownerId?: string | null): LoyaltyBalanceSummary {
    const scopedOwnerId = ownerId?.trim() || null;
    const points = Array.from(this.#points.values())
      .filter((item) => item.accountId === accountId)
      .filter((item) => !scopedOwnerId || item.ownerId === scopedOwnerId);
    const redemptions = this.listLoyaltyRedemptions(accountId, scopedOwnerId ? { ownerId: scopedOwnerId } : undefined)
      .filter((item) => item.status !== 'cancelled');
    const blockedPoints = points
      .filter((item) => item.isBlocked)
      .reduce((total, item) => total + item.points, 0);
    const earnedAvailable = points
      .filter((item) => !item.isBlocked)
      .reduce((total, item) => total + item.points, 0);
    const redeemedPoints = redemptions.reduce((total, item) => total + item.pointsUsed, 0);
    return {
      ownerId: scopedOwnerId,
      availablePoints: Math.max(0, earnedAvailable - redeemedPoints),
      blockedPoints,
      redeemedPoints,
      redemptionCount: redemptions.length
    };
  }

  public async createPriceTable(
    accountId: AccountId,
    input: {
      legacyId?: string | null;
      description: string;
      context?: string | null;
      isActive?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
    }
  ): Promise<PriceTableSummary> {
    assertValidWindow(input.startsAt ?? null, input.endsAt ?? null);
    const now = nowIso();
    const table: PriceTableSummary = {
      id: randomUUID(),
      accountId,
      legacyId: input.legacyId?.trim() || null,
      description: requireTrimmed(input.description, 'description'),
      context: input.context?.trim() || null,
      isActive: input.isActive ?? true,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      createdAt: now,
      updatedAt: now
    };
    this.#priceTables.set(table.id, table);
    await this.#repository?.savePriceTable(table);
    return table;
  }

  public listPriceTables(
    accountId: AccountId,
    filters?: { search?: string; active?: boolean }
  ): readonly PriceTableSummary[] {
    const search = filters?.search?.trim().toLowerCase();
    return Array.from(this.#priceTables.values())
      .filter((item) => item.accountId === accountId)
      .filter((item) => filters?.active === undefined || item.isActive === filters.active)
      .filter((item) => !search || item.description.toLowerCase().includes(search) || item.legacyId?.toLowerCase().includes(search))
      .sort((a, b) => a.description.localeCompare(b.description));
  }

  public getPriceTableDetail(accountId: AccountId, priceTableId: string): PriceTableDetail {
    const table = this.#priceTables.get(priceTableId);
    if (!table || table.accountId !== accountId) {
      throw new NotFoundError('Price table not found', { priceTableId });
    }
    return {
      ...table,
      items: this.listPriceTableItems(accountId, priceTableId)
    };
  }

  public async addPriceTableItem(
    accountId: AccountId,
    priceTableId: string,
    input: { itemKind: PriceTableItemKind; itemId: string; price: number }
  ): Promise<PriceTableItemSummary> {
    this.getPriceTableDetail(accountId, priceTableId);
    const item: PriceTableItemSummary = {
      id: randomUUID(),
      accountId,
      priceTableId,
      itemKind: input.itemKind,
      itemId: requireTrimmed(input.itemId, 'itemId'),
      price: roundMoney(requireNonNegativeNumber(input.price, 'price')),
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.#priceTableItems.set(item.id, item);
    await this.#repository?.savePriceTableItem(item);
    return item;
  }

  public listPriceTableItems(accountId: AccountId, priceTableId: string): readonly PriceTableItemSummary[] {
    return Array.from(this.#priceTableItems.values())
      .filter((item) => item.accountId === accountId && item.priceTableId === priceTableId)
      .sort((a, b) => a.itemKind.localeCompare(b.itemKind) || a.itemId.localeCompare(b.itemId));
  }

  public async createPosSyncJob(
    accountId: AccountId,
    requestedBy: UserId,
    input: { syncKind: PosSyncKind; metadata?: Record<string, unknown> }
  ): Promise<PosSyncJobSummary> {
    const job: PosSyncJobSummary = {
      id: randomUUID(),
      accountId,
      syncKind: input.syncKind,
      status: 'queued',
      requestedBy,
      requestedAt: nowIso(),
      startedAt: null,
      finishedAt: null,
      processedCount: 0,
      errorMessage: null,
      metadata: input.metadata ?? {}
    };
    this.#posSyncJobs.set(job.id, job);
    await this.#repository?.savePosSyncJob(job);
    return job;
  }

  public async updatePosSyncJob(
    accountId: AccountId,
    jobId: string,
    input: { status: PosSyncStatus; processedCount?: number; errorMessage?: string | null }
  ): Promise<PosSyncJobSummary> {
    const existing = this.#posSyncJobs.get(jobId);
    if (!existing || existing.accountId !== accountId) {
      throw new NotFoundError('POS sync job not found', { jobId });
    }
    const now = nowIso();
    const status = input.status;
    const updated: PosSyncJobSummary = {
      ...existing,
      status,
      startedAt: status === 'running' && !existing.startedAt ? now : existing.startedAt,
      finishedAt: status === 'completed' || status === 'failed' ? now : existing.finishedAt,
      processedCount: requireNonNegativeInteger(input.processedCount ?? existing.processedCount, 'processedCount'),
      errorMessage: input.errorMessage ?? (status === 'failed' ? existing.errorMessage : null)
    };
    this.#posSyncJobs.set(updated.id, updated);
    await this.#repository?.updatePosSyncJob(updated);
    return updated;
  }

  public listPosSyncJobs(accountId: AccountId, filters?: { syncKind?: PosSyncKind; status?: PosSyncStatus }): readonly PosSyncJobSummary[] {
    return Array.from(this.#posSyncJobs.values())
      .filter((item) => item.accountId === accountId)
      .filter((item) => !filters?.syncKind || item.syncKind === filters.syncKind)
      .filter((item) => !filters?.status || item.status === filters.status)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  #assertProgramBelongsToAccount(accountId: AccountId, programId: string | null): void {
    if (!programId) return;
    const program = this.#programs.get(programId);
    if (!program || program.accountId !== accountId) {
      throw new NotFoundError('Loyalty program not found', { programId });
    }
  }
}

export class DatabaseCommercialRepository implements CommercialRepository {
  async saveLoyaltyProgram(program: LoyaltyProgramSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO loyalty_programs (id, account_id, name, points_per_real, redemption_rules, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [program.id, program.accountId, program.name, program.pointsPerReal, JSON.stringify(program.redemptionRules), program.isActive, new Date(program.createdAt), new Date(program.updatedAt)]
      );
    });
  }

  async saveLoyaltyPoint(point: LoyaltyPointSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO loyalty_points (id, account_id, owner_id, program_id, points, source_type, source_id, is_blocked, expires_at, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [point.id, point.accountId, point.ownerId, point.programId, point.points, point.sourceType, point.sourceId, point.isBlocked, nullableDate(point.expiresAt), point.createdBy, new Date(point.createdAt)]
      );
    });
  }

  async saveLoyaltyRedemption(redemption: LoyaltyRedemptionSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO loyalty_redemptions (id, account_id, owner_id, program_id, points_used, reward_description, product_quantity, service_quantity, status, redeemed_by, redeemed_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [redemption.id, redemption.accountId, redemption.ownerId, redemption.programId, redemption.pointsUsed, redemption.rewardDescription, redemption.productQuantity, redemption.serviceQuantity, redemption.status, redemption.redeemedBy, new Date(redemption.redeemedAt), JSON.stringify(redemption.metadata)]
      );
    });
  }

  async findLoyaltyPrograms(accountId: AccountId): Promise<readonly LoyaltyProgramSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM loyalty_programs WHERE account_id = $1 ORDER BY name', [accountId]);
      return result.rows.map(mapLoyaltyProgram);
    });
  }

  async findLoyaltyPoints(accountId: AccountId): Promise<readonly LoyaltyPointSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM loyalty_points WHERE account_id = $1 ORDER BY created_at DESC', [accountId]);
      return result.rows.map(mapLoyaltyPoint);
    });
  }

  async findLoyaltyRedemptions(accountId: AccountId): Promise<readonly LoyaltyRedemptionSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM loyalty_redemptions WHERE account_id = $1 ORDER BY redeemed_at DESC', [accountId]);
      return result.rows.map(mapLoyaltyRedemption);
    });
  }

  async savePriceTable(table: PriceTableSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO price_tables (id, account_id, legacy_id, description, context, is_active, starts_at, ends_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [table.id, table.accountId, table.legacyId, table.description, table.context, table.isActive, nullableDate(table.startsAt), nullableDate(table.endsAt), new Date(table.createdAt), new Date(table.updatedAt)]
      );
    });
  }

  async updatePriceTable(table: PriceTableSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE price_tables SET legacy_id = $2, description = $3, context = $4, is_active = $5, starts_at = $6, ends_at = $7, updated_at = $8
         WHERE id = $1 AND account_id = $9`,
        [table.id, table.legacyId, table.description, table.context, table.isActive, nullableDate(table.startsAt), nullableDate(table.endsAt), new Date(table.updatedAt), table.accountId]
      );
    });
  }

  async savePriceTableItem(item: PriceTableItemSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO price_table_items (id, account_id, price_table_id, item_kind, item_id, price, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [item.id, item.accountId, item.priceTableId, item.itemKind, item.itemId, item.price, new Date(item.createdAt), new Date(item.updatedAt)]
      );
    });
  }

  async findPriceTables(accountId: AccountId): Promise<readonly PriceTableSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM price_tables WHERE account_id = $1 ORDER BY description', [accountId]);
      return result.rows.map(mapPriceTable);
    });
  }

  async findPriceTableItems(accountId: AccountId): Promise<readonly PriceTableItemSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM price_table_items WHERE account_id = $1 ORDER BY created_at DESC', [accountId]);
      return result.rows.map(mapPriceTableItem);
    });
  }

  async savePosSyncJob(job: PosSyncJobSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO pos_sync_jobs (id, account_id, sync_kind, status, requested_by, requested_at, started_at, finished_at, processed_count, error_message, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [job.id, job.accountId, job.syncKind, job.status, job.requestedBy, new Date(job.requestedAt), nullableDate(job.startedAt), nullableDate(job.finishedAt), job.processedCount, job.errorMessage, JSON.stringify(job.metadata)]
      );
    });
  }

  async updatePosSyncJob(job: PosSyncJobSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE pos_sync_jobs SET status = $2, started_at = $3, finished_at = $4, processed_count = $5, error_message = $6, metadata = $7
         WHERE id = $1 AND account_id = $8`,
        [job.id, job.status, nullableDate(job.startedAt), nullableDate(job.finishedAt), job.processedCount, job.errorMessage, JSON.stringify(job.metadata), job.accountId]
      );
    });
  }

  async findPosSyncJobs(accountId: AccountId): Promise<readonly PosSyncJobSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM pos_sync_jobs WHERE account_id = $1 ORDER BY requested_at DESC', [accountId]);
      return result.rows.map(mapPosSyncJob);
    });
  }
}

function requireTrimmed(value: string | null | undefined, field: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new ValidationError(`${field} is required`);
  return trimmed;
}

function requireInteger(value: number, field: string): number {
  if (!Number.isInteger(value)) throw new ValidationError(`${field} must be an integer`);
  return value;
}

function requirePositiveInteger(value: number, field: string): number {
  const integer = requireInteger(value, field);
  if (integer <= 0) throw new ValidationError(`${field} must be positive`);
  return integer;
}

function requireNonNegativeInteger(value: number, field: string): number {
  const integer = requireInteger(value, field);
  if (integer < 0) throw new ValidationError(`${field} must be non-negative`);
  return integer;
}

function requireNonNegativeNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) throw new ValidationError(`${field} must be non-negative`);
  return value;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertValidWindow(startsAt: string | null, endsAt: string | null): void {
  if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    throw new ValidationError('endsAt must be greater than or equal to startsAt');
  }
}

function nullableDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function dateIso(value: unknown): string {
  return new Date(value as string).toISOString();
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function mapLoyaltyProgram(row: Record<string, unknown>): LoyaltyProgramSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    name: row.name as string,
    pointsPerReal: Number(row.points_per_real),
    redemptionRules: jsonObject(row.redemption_rules),
    isActive: Boolean(row.is_active),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function mapLoyaltyPoint(row: Record<string, unknown>): LoyaltyPointSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    ownerId: row.owner_id as string,
    programId: row.program_id as string | null,
    points: Number(row.points),
    sourceType: row.source_type as LoyaltyPointSource,
    sourceId: row.source_id as string | null,
    isBlocked: Boolean(row.is_blocked),
    expiresAt: row.expires_at ? dateIso(row.expires_at) : null,
    createdBy: row.created_by as UserId | null,
    createdAt: dateIso(row.created_at)
  };
}

function mapLoyaltyRedemption(row: Record<string, unknown>): LoyaltyRedemptionSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    ownerId: row.owner_id as string,
    programId: row.program_id as string | null,
    pointsUsed: Number(row.points_used),
    rewardDescription: row.reward_description as string,
    productQuantity: Number(row.product_quantity),
    serviceQuantity: Number(row.service_quantity),
    status: row.status as LoyaltyRedemptionStatus,
    redeemedBy: row.redeemed_by as UserId | null,
    redeemedAt: dateIso(row.redeemed_at),
    metadata: jsonObject(row.metadata)
  };
}

function mapPriceTable(row: Record<string, unknown>): PriceTableSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    legacyId: row.legacy_id as string | null,
    description: row.description as string,
    context: row.context as string | null,
    isActive: Boolean(row.is_active),
    startsAt: row.starts_at ? dateIso(row.starts_at) : null,
    endsAt: row.ends_at ? dateIso(row.ends_at) : null,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function mapPriceTableItem(row: Record<string, unknown>): PriceTableItemSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    priceTableId: row.price_table_id as string,
    itemKind: row.item_kind as PriceTableItemKind,
    itemId: row.item_id as string,
    price: Number(row.price),
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function mapPosSyncJob(row: Record<string, unknown>): PosSyncJobSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    syncKind: row.sync_kind as PosSyncKind,
    status: row.status as PosSyncStatus,
    requestedBy: row.requested_by as UserId | null,
    requestedAt: dateIso(row.requested_at),
    startedAt: row.started_at ? dateIso(row.started_at) : null,
    finishedAt: row.finished_at ? dateIso(row.finished_at) : null,
    processedCount: Number(row.processed_count),
    errorMessage: row.error_message as string | null,
    metadata: jsonObject(row.metadata)
  };
}

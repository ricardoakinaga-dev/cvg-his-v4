import { getPool } from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

export type PackageStatus = 'draft' | 'active' | 'expired' | 'cancelled' | 'completed';
export type PackageItemKind = 'service' | 'product';

export interface PackageItemSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly packageId: string;
  readonly itemKind: PackageItemKind;
  readonly catalogItemId: string | null;
  readonly nameSnapshot: string;
  readonly quantityPurchased: number;
  readonly quantityConsumed: number;
  readonly unitPrice: number;
  readonly validFrom: string | null;
  readonly validUntil: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CustomerPackageSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly ownerId: string;
  readonly patientId: string | null;
  readonly number: string;
  readonly status: PackageStatus;
  readonly startsAt: string;
  readonly expiresAt: string | null;
  readonly notes: string | null;
  readonly createdByUserId: UserId;
  readonly renewedFromPackageId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly activatedAt: string | null;
  readonly cancelledAt: string | null;
  readonly completedAt: string | null;
}

export interface PackageConsumptionSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly packageId: string;
  readonly packageItemId: string;
  readonly quantity: number;
  readonly consumedByUserId: UserId;
  readonly consumedAt: string;
  readonly sourceType: 'appointment' | 'encounter' | 'counter_sale' | 'manual';
  readonly sourceId: string | null;
  readonly notes: string | null;
}

export interface PackageBalanceItem {
  readonly packageItemId: string;
  readonly itemKind: PackageItemKind;
  readonly nameSnapshot: string;
  readonly quantityPurchased: number;
  readonly quantityConsumed: number;
  readonly quantityAvailable: number;
  readonly validUntil: string | null;
}

export interface PackageDetail extends CustomerPackageSummary {
  readonly items: readonly PackageItemSummary[];
  readonly consumptions: readonly PackageConsumptionSummary[];
  readonly balance: readonly PackageBalanceItem[];
}

export interface PackageRepository {
  savePackage(pkg: CustomerPackageSummary): Promise<void>;
  updatePackage(pkg: CustomerPackageSummary): Promise<void>;
  savePackageItem(item: PackageItemSummary): Promise<void>;
  updatePackageItem(item: PackageItemSummary): Promise<void>;
  saveConsumption(consumption: PackageConsumptionSummary): Promise<void>;
  findPackages(accountId: AccountId): Promise<readonly CustomerPackageSummary[]>;
  findPackageItems(accountId: AccountId): Promise<readonly PackageItemSummary[]>;
  findConsumptions(accountId: AccountId): Promise<readonly PackageConsumptionSummary[]>;
}

export interface PackagesServiceOptions {
  readonly repository?: PackageRepository;
}

interface CreatePackageInput {
  readonly ownerId: string;
  readonly patientId?: string | null;
  readonly startsAt?: string | null;
  readonly expiresAt?: string | null;
  readonly notes?: string | null;
}

interface AddPackageItemInput {
  readonly itemKind: PackageItemKind;
  readonly catalogItemId?: string | null;
  readonly nameSnapshot: string;
  readonly quantityPurchased: number;
  readonly unitPrice: number;
  readonly validFrom?: string | null;
  readonly validUntil?: string | null;
}

interface ConsumePackageItemInput {
  readonly quantity: number;
  readonly consumedAt?: string | null;
  readonly sourceType?: PackageConsumptionSummary['sourceType'];
  readonly sourceId?: string | null;
  readonly notes?: string | null;
}

interface RenewPackageInput {
  readonly startsAt?: string | null;
  readonly expiresAt?: string | null;
  readonly notes?: string | null;
}

export class PackagesService {
  readonly #repository?: PackageRepository;
  readonly #packages = new Map<string, CustomerPackageSummary>();
  readonly #items = new Map<string, PackageItemSummary>();
  readonly #consumptions = new Map<string, PackageConsumptionSummary>();
  #numberCounter = 0;

  public constructor(options?: PackagesServiceOptions) {
    this.#repository = options?.repository;
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) return;
    const [packages, items, consumptions] = await Promise.all([
      this.#repository.findPackages(accountId),
      this.#repository.findPackageItems(accountId),
      this.#repository.findConsumptions(accountId)
    ]);
    for (const pkg of packages) {
      this.#packages.set(pkg.id, pkg);
      this.#numberCounter = Math.max(this.#numberCounter, packageNumberCounter(pkg.number));
    }
    for (const item of items) this.#items.set(item.id, item);
    for (const consumption of consumptions) this.#consumptions.set(consumption.id, consumption);
  }

  public async create(accountId: AccountId, createdByUserId: UserId, input: CreatePackageInput): Promise<CustomerPackageSummary> {
    const ownerId = requireTrimmed(input.ownerId, 'ownerId');
    const startsAt = normalizeDate(input.startsAt ?? nowIso().slice(0, 10), 'startsAt');
    const expiresAt = input.expiresAt ? normalizeDate(input.expiresAt, 'expiresAt') : null;
    assertDateWindow(startsAt, expiresAt);

    const timestamp = nowIso();
    const pkg: CustomerPackageSummary = {
      id: createCorrelationId('pkg'),
      accountId,
      ownerId,
      patientId: input.patientId?.trim() || null,
      number: this.#nextNumber(),
      status: 'draft',
      startsAt,
      expiresAt,
      notes: input.notes?.trim() || null,
      createdByUserId,
      renewedFromPackageId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      activatedAt: null,
      cancelledAt: null,
      completedAt: null
    };
    this.#packages.set(pkg.id, pkg);
    await this.#repository?.savePackage(pkg);
    return pkg;
  }

  public async addItem(accountId: AccountId, packageId: string, input: AddPackageItemInput): Promise<PackageItemSummary> {
    const pkg = this.#getForAccount(accountId, packageId);
    if (pkg.status !== 'draft') {
      throw new ConflictError('Package items can only be added while package is draft', { packageId });
    }

    const validFrom = input.validFrom ? normalizeDate(input.validFrom, 'validFrom') : pkg.startsAt;
    const validUntil = input.validUntil ? normalizeDate(input.validUntil, 'validUntil') : pkg.expiresAt;
    assertDateWindow(validFrom, validUntil);

    const timestamp = nowIso();
    const item: PackageItemSummary = {
      id: createCorrelationId('pkg_item'),
      accountId,
      packageId,
      itemKind: normalizeItemKind(input.itemKind),
      catalogItemId: input.catalogItemId?.trim() || null,
      nameSnapshot: requireTrimmed(input.nameSnapshot, 'nameSnapshot'),
      quantityPurchased: requirePositiveInteger(input.quantityPurchased, 'quantityPurchased'),
      quantityConsumed: 0,
      unitPrice: requireMoney(input.unitPrice, 'unitPrice'),
      validFrom,
      validUntil,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.#items.set(item.id, item);
    await this.#repository?.savePackageItem(item);
    return item;
  }

  public async activate(accountId: AccountId, packageId: string): Promise<PackageDetail> {
    const pkg = this.#getForAccount(accountId, packageId);
    if (pkg.status !== 'draft') {
      throw new ConflictError('Only draft packages can be activated', { packageId, status: pkg.status });
    }
    const items = this.#itemsFor(packageId);
    if (items.length === 0) {
      throw new ConflictError('Package must have at least one item before activation', { packageId });
    }

    const activated = this.#replacePackage(pkg, {
      status: 'active',
      activatedAt: nowIso()
    });
    await this.#repository?.updatePackage(activated);
    return this.detail(accountId, activated.id);
  }

  public async consumeItem(
    accountId: AccountId,
    packageItemId: string,
    consumedByUserId: UserId,
    input: ConsumePackageItemInput
  ): Promise<PackageDetail> {
    const item = this.#items.get(packageItemId);
    if (!item || item.accountId !== accountId) {
      throw new NotFoundError('Package item not found', { packageItemId });
    }
    const pkg = this.#getForAccount(accountId, item.packageId);
    if (pkg.status !== 'active') {
      throw new ConflictError('Only active packages can be consumed', { packageId: pkg.id, status: pkg.status });
    }

    const consumedAt = input.consumedAt ? normalizeDate(input.consumedAt, 'consumedAt') : nowIso().slice(0, 10);
    if (!isWithinWindow(consumedAt, item.validFrom, item.validUntil) || !isWithinWindow(consumedAt, pkg.startsAt, pkg.expiresAt)) {
      throw new ConflictError('Package item is outside its consumption window', { packageItemId, consumedAt });
    }

    const quantity = requirePositiveInteger(input.quantity, 'quantity');
    const available = item.quantityPurchased - item.quantityConsumed;
    if (quantity > available) {
      throw new ConflictError('Package item has insufficient balance', { packageItemId, available, requested: quantity });
    }

    const consumption: PackageConsumptionSummary = {
      id: createCorrelationId('pkg_cons'),
      accountId,
      packageId: pkg.id,
      packageItemId,
      quantity,
      consumedByUserId,
      consumedAt,
      sourceType: input.sourceType ?? 'manual',
      sourceId: input.sourceId?.trim() || null,
      notes: input.notes?.trim() || null
    };
    this.#consumptions.set(consumption.id, consumption);
    await this.#repository?.saveConsumption(consumption);

    const timestamp = nowIso();
    const consumedItem: PackageItemSummary = {
      ...item,
      quantityConsumed: item.quantityConsumed + quantity,
      updatedAt: timestamp
    };
    this.#items.set(item.id, consumedItem);
    await this.#repository?.updatePackageItem(consumedItem);

    const detail = this.detail(accountId, pkg.id);
    if (detail.balance.every((balanceItem) => balanceItem.quantityAvailable === 0)) {
      const completed = this.#replacePackage(pkg, {
        status: 'completed',
        completedAt: timestamp
      });
      await this.#repository?.updatePackage(completed);
      return this.detail(accountId, completed.id);
    }
    const touched = this.#replacePackage(pkg, {});
    await this.#repository?.updatePackage(touched);
    return this.detail(accountId, pkg.id);
  }

  public async cancel(accountId: AccountId, packageId: string): Promise<CustomerPackageSummary> {
    const pkg = this.#getForAccount(accountId, packageId);
    if (pkg.status === 'completed') {
      throw new ConflictError('Completed packages cannot be cancelled', { packageId });
    }
    const cancelled = this.#replacePackage(pkg, {
      status: 'cancelled',
      cancelledAt: nowIso()
    });
    await this.#repository?.updatePackage(cancelled);
    return cancelled;
  }

  public async renew(accountId: AccountId, packageId: string, createdByUserId: UserId, input?: RenewPackageInput): Promise<PackageDetail> {
    const original = this.detail(accountId, packageId);
    if (original.status !== 'active' && original.status !== 'completed' && original.status !== 'expired') {
      throw new ConflictError('Only active, completed or expired packages can be renewed', {
        packageId,
        status: original.status
      });
    }

    const renewed = await this.create(accountId, createdByUserId, {
      ownerId: original.ownerId,
      patientId: original.patientId,
      startsAt: input?.startsAt ?? nowIso().slice(0, 10),
      expiresAt: input?.expiresAt ?? original.expiresAt,
      notes: input?.notes ?? original.notes
    });
    const linkedRenewal = this.#replacePackage(renewed, {
      renewedFromPackageId: original.id
    });
    await this.#repository?.updatePackage(linkedRenewal);

    for (const item of original.items) {
      await this.addItem(accountId, linkedRenewal.id, {
        itemKind: item.itemKind,
        catalogItemId: item.catalogItemId,
        nameSnapshot: item.nameSnapshot,
        quantityPurchased: item.quantityPurchased,
        unitPrice: item.unitPrice,
        validFrom: input?.startsAt ?? linkedRenewal.startsAt,
        validUntil: input?.expiresAt ?? item.validUntil
      });
    }
    return this.activate(accountId, linkedRenewal.id);
  }

  public list(accountId: AccountId): readonly PackageDetail[] {
    return [...this.#packages.values()]
      .filter((pkg) => pkg.accountId === accountId)
      .map((pkg) => this.detail(accountId, pkg.id));
  }

  public detail(accountId: AccountId, packageId: string): PackageDetail {
    const pkg = this.#getForAccount(accountId, packageId);
    const items = this.#itemsFor(packageId);
    const consumptions = [...this.#consumptions.values()].filter((item) => item.packageId === packageId);
    return {
      ...pkg,
      items,
      consumptions,
      balance: items.map((item) => ({
        packageItemId: item.id,
        itemKind: item.itemKind,
        nameSnapshot: item.nameSnapshot,
        quantityPurchased: item.quantityPurchased,
        quantityConsumed: item.quantityConsumed,
        quantityAvailable: item.quantityPurchased - item.quantityConsumed,
        validUntil: item.validUntil
      }))
    };
  }

  #nextNumber(): string {
    this.#numberCounter++;
    return `PKG-${String(this.#numberCounter).padStart(6, '0')}`;
  }

  #getForAccount(accountId: AccountId, packageId: string): CustomerPackageSummary {
    const pkg = this.#packages.get(packageId);
    if (!pkg || pkg.accountId !== accountId) {
      throw new NotFoundError('Package not found', { packageId });
    }
    return pkg;
  }

  #itemsFor(packageId: string): readonly PackageItemSummary[] {
    return [...this.#items.values()].filter((item) => item.packageId === packageId);
  }

  #replacePackage(
    pkg: CustomerPackageSummary,
    patch: Partial<Omit<CustomerPackageSummary, 'id' | 'accountId' | 'createdAt' | 'createdByUserId'>>
  ): CustomerPackageSummary {
    const updated: CustomerPackageSummary = {
      ...pkg,
      ...patch,
      updatedAt: nowIso()
    };
    this.#packages.set(updated.id, updated);
    return updated;
  }
}

/* v8 ignore start -- SQL repository adapter covered by integration tests. */
export class DatabasePackageRepository implements PackageRepository {
  async savePackage(pkg: CustomerPackageSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO customer_packages (
          id, account_id, owner_id, patient_id, package_number, status, starts_at, expires_at,
          notes, created_by_user_id, renewed_from_package_id, created_at, updated_at,
          activated_at, cancelled_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        packageParams(pkg)
      );
    });
  }

  async updatePackage(pkg: CustomerPackageSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE customer_packages
         SET owner_id = $3, patient_id = $4, package_number = $5, status = $6,
             starts_at = $7, expires_at = $8, notes = $9, created_by_user_id = $10,
             renewed_from_package_id = $11, created_at = $12, updated_at = $13,
             activated_at = $14, cancelled_at = $15, completed_at = $16
         WHERE id = $1 AND account_id = $2`,
        packageParams(pkg)
      );
    });
  }

  async savePackageItem(item: PackageItemSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO customer_package_items (
          id, account_id, package_id, item_kind, catalog_item_id, name_snapshot,
          quantity_purchased, quantity_consumed, unit_price, valid_from, valid_until,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        packageItemParams(item)
      );
    });
  }

  async updatePackageItem(item: PackageItemSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE customer_package_items
         SET item_kind = $4, catalog_item_id = $5, name_snapshot = $6,
             quantity_purchased = $7, quantity_consumed = $8, unit_price = $9,
             valid_from = $10, valid_until = $11, created_at = $12, updated_at = $13
         WHERE id = $1 AND account_id = $2 AND package_id = $3`,
        packageItemParams(item)
      );
    });
  }

  async saveConsumption(consumption: PackageConsumptionSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO customer_package_consumptions (
          id, account_id, package_id, package_item_id, quantity, consumed_by_user_id,
          consumed_at, source_type, source_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          consumption.id,
          consumption.accountId,
          consumption.packageId,
          consumption.packageItemId,
          consumption.quantity,
          consumption.consumedByUserId,
          consumption.consumedAt,
          consumption.sourceType,
          consumption.sourceId,
          consumption.notes
        ]
      );
    });
  }

  async findPackages(accountId: AccountId): Promise<readonly CustomerPackageSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM customer_packages WHERE account_id = $1 ORDER BY created_at DESC',
        [accountId]
      );
      return result.rows.map(mapCustomerPackage);
    });
  }

  async findPackageItems(accountId: AccountId): Promise<readonly PackageItemSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM customer_package_items WHERE account_id = $1 ORDER BY created_at ASC',
        [accountId]
      );
      return result.rows.map(mapPackageItem);
    });
  }

  async findConsumptions(accountId: AccountId): Promise<readonly PackageConsumptionSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM customer_package_consumptions WHERE account_id = $1 ORDER BY consumed_at DESC, id DESC',
        [accountId]
      );
      return result.rows.map(mapPackageConsumption);
    });
  }
}

function requireTrimmed(value: string | null | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new ValidationError(`${field} is required`, { field });
  return normalized;
}

function requirePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${field} must be a positive integer`, { field, value });
  }
  return value;
}

function requireMoney(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${field} must be a positive money value`, { field, value });
  }
  return Math.round(value * 100) / 100;
}

function normalizeItemKind(value: PackageItemKind): PackageItemKind {
  if (value !== 'service' && value !== 'product') {
    throw new ValidationError('itemKind must be service or product', { value });
  }
  return value;
}

function normalizeDate(value: string, field: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} must be a valid ISO date`, { field, value });
  }
  return date.toISOString().slice(0, 10);
}

function assertDateWindow(startsAt: string, expiresAt: string | null): void {
  if (expiresAt && startsAt > expiresAt) {
    throw new ValidationError('Package validity window is invalid', { startsAt, expiresAt });
  }
}

function isWithinWindow(value: string, startsAt: string | null, expiresAt: string | null): boolean {
  if (startsAt && value < startsAt) return false;
  if (expiresAt && value > expiresAt) return false;
  return true;
}

function packageNumberCounter(number: string): number {
  const match = /^PKG-(\d+)$/.exec(number);
  return match ? Number(match[1]) : 0;
}

function nullableDate(value: string | null): string | null {
  return value;
}

function nullableTimestamp(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function dateIso(value: unknown): string {
  return new Date(value as string).toISOString();
}

function dateOnly(value: unknown): string {
  return new Date(value as string).toISOString().slice(0, 10);
}

function packageParams(pkg: CustomerPackageSummary): unknown[] {
  return [
    pkg.id,
    pkg.accountId,
    pkg.ownerId,
    pkg.patientId,
    pkg.number,
    pkg.status,
    pkg.startsAt,
    nullableDate(pkg.expiresAt),
    pkg.notes,
    pkg.createdByUserId,
    pkg.renewedFromPackageId,
    new Date(pkg.createdAt),
    new Date(pkg.updatedAt),
    nullableTimestamp(pkg.activatedAt),
    nullableTimestamp(pkg.cancelledAt),
    nullableTimestamp(pkg.completedAt)
  ];
}

function packageItemParams(item: PackageItemSummary): unknown[] {
  return [
    item.id,
    item.accountId,
    item.packageId,
    item.itemKind,
    item.catalogItemId,
    item.nameSnapshot,
    item.quantityPurchased,
    item.quantityConsumed,
    item.unitPrice,
    nullableDate(item.validFrom),
    nullableDate(item.validUntil),
    new Date(item.createdAt),
    new Date(item.updatedAt)
  ];
}

function mapCustomerPackage(row: Record<string, unknown>): CustomerPackageSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    ownerId: row.owner_id as string,
    patientId: row.patient_id as string | null,
    number: row.package_number as string,
    status: row.status as PackageStatus,
    startsAt: dateOnly(row.starts_at),
    expiresAt: row.expires_at ? dateOnly(row.expires_at) : null,
    notes: row.notes as string | null,
    createdByUserId: row.created_by_user_id as UserId,
    renewedFromPackageId: row.renewed_from_package_id as string | null,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    activatedAt: row.activated_at ? dateIso(row.activated_at) : null,
    cancelledAt: row.cancelled_at ? dateIso(row.cancelled_at) : null,
    completedAt: row.completed_at ? dateIso(row.completed_at) : null
  };
}

function mapPackageItem(row: Record<string, unknown>): PackageItemSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    packageId: row.package_id as string,
    itemKind: row.item_kind as PackageItemKind,
    catalogItemId: row.catalog_item_id as string | null,
    nameSnapshot: row.name_snapshot as string,
    quantityPurchased: Number(row.quantity_purchased),
    quantityConsumed: Number(row.quantity_consumed),
    unitPrice: Number(row.unit_price),
    validFrom: row.valid_from ? dateOnly(row.valid_from) : null,
    validUntil: row.valid_until ? dateOnly(row.valid_until) : null,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function mapPackageConsumption(row: Record<string, unknown>): PackageConsumptionSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    packageId: row.package_id as string,
    packageItemId: row.package_item_id as string,
    quantity: Number(row.quantity),
    consumedByUserId: row.consumed_by_user_id as UserId,
    consumedAt: dateOnly(row.consumed_at),
    sourceType: row.source_type as PackageConsumptionSummary['sourceType'],
    sourceId: row.source_id as string | null,
    notes: row.notes as string | null
  };
}
/* v8 ignore stop */

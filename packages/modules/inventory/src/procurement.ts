import { sql } from 'drizzle-orm';
import { getPool, withTenantTransaction } from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import {
  getTenantContext,
  withTenantQuery,
  withTenantQueryExplicit
} from '@cvg-his-v2/tenant-context';
import type {
  CreateInventoryInboundRequest,
  InventoryService,
  InventoryTransferRequest
} from './index.js';

export type InventoryPurchaseStatus =
  | 'draft'
  | 'approved'
  | 'partially_received'
  | 'received'
  | 'cancelled';
export type InventoryTransferStatus = 'completed' | 'cancelled';

export interface InventoryPurchaseLineSummary {
  readonly id: string;
  readonly purchaseId: string;
  readonly inventoryItemId: string;
  readonly sku: string;
  readonly itemName: string;
  readonly orderedQuantity: number;
  readonly receivedQuantity: number;
  readonly unit: string;
  readonly unitCostAmount: number;
  readonly lotNumber: string;
  readonly expiryDate: string | null;
  readonly manufactureDate: string | null;
  readonly location: string | null;
  readonly supplier: string | null;
}

export interface InventoryPurchaseSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly supplierName: string;
  readonly invoiceNumber: string | null;
  readonly status: InventoryPurchaseStatus;
  readonly totalAmount: number;
  readonly receivedAmount: number;
  readonly payableId: string | null;
  readonly lines: readonly InventoryPurchaseLineSummary[];
  readonly createdByUserId: UserId;
  readonly approvedByUserId: UserId | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly receivedAt: string | null;
}

export interface InventoryPurchaseReportFilters {
  readonly search?: string;
  readonly status?: InventoryPurchaseStatus;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly limit?: number;
}

export interface InventoryPurchaseReportSourceRow {
  readonly purchaseId: string;
  readonly accountId: AccountId;
  readonly invoiceNumber: string;
  readonly supplierName: string;
  readonly status: InventoryPurchaseStatus;
  readonly totalAmount: number;
  readonly receivedAmount: number;
  readonly payableId: string | null;
  readonly createdByUserId: UserId;
  readonly approvedByUserId: UserId | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly receivedAt: string | null;
}

export interface InventoryTransferSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly inventoryItemId: string;
  readonly quantity: number;
  readonly fromLocation: string;
  readonly toLocation: string;
  readonly status: InventoryTransferStatus;
  readonly reference: string | null;
  readonly outboundMovementId: string;
  readonly inboundMovementId: string;
  readonly createdByUserId: UserId;
  readonly createdAt: string;
}

export interface CreateInventoryPurchaseInput {
  readonly supplierName: string;
  readonly invoiceNumber?: string | null;
  readonly payableId?: string | null;
  readonly lines: readonly {
    readonly inventoryItemId: string;
    readonly quantity: number;
    readonly unitCostAmount: number;
    readonly lotNumber: string;
    readonly expiryDate?: string | null;
    readonly manufactureDate?: string | null;
    readonly location?: string | null;
  }[];
}

export interface ReceiveInventoryPurchaseInput {
  readonly lines: readonly {
    readonly lineId: string;
    readonly quantity: number;
    readonly expiryDate?: string | null;
    readonly manufactureDate?: string | null;
    readonly location?: string | null;
  }[];
}

export interface ProcurementRepository {
  withTransaction?<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T>;
  findPurchaseForUpdate?(
    accountId: AccountId,
    purchaseId: string
  ): Promise<InventoryPurchaseSummary | null>;
  savePurchase(purchase: InventoryPurchaseSummary): Promise<void>;
  findPurchases(accountId: AccountId): Promise<readonly InventoryPurchaseSummary[]>;
  findPurchaseReportRows?(
    accountId: AccountId,
    filters?: InventoryPurchaseReportFilters
  ): Promise<readonly InventoryPurchaseReportSourceRow[]>;
  saveTransfer(transfer: InventoryTransferSummary): Promise<void>;
  findTransfers(accountId: AccountId): Promise<readonly InventoryTransferSummary[]>;
}

export interface ProcurementServiceOptions {
  readonly repository?: ProcurementRepository;
  readonly payableGateway?: InventoryPayableGateway;
  /** Executes compound procurement and inventory mutations in the tenant transaction. */
  readonly transaction?: <T>(accountId: AccountId, operation: () => Promise<T>) => Promise<T>;
}

export interface InventoryPayableGateway {
  createPayable(
    accountId: AccountId,
    createdByUserId: UserId,
    input: {
      readonly supplierName: string;
      readonly description: string;
      readonly category: string;
      readonly costCenterCode: string;
      readonly costCenterName: string;
      readonly issuedAt?: string;
      readonly dueAt: string;
      readonly totalAmount: number;
      readonly sourceExpenseId?: string | null;
      readonly notes?: string | null;
    }
  ): Promise<{ readonly id: string }>;
}

export class ProcurementService {
  readonly #inventory: InventoryService;
  readonly #repository?: ProcurementRepository;
  readonly #payableGateway?: InventoryPayableGateway;
  readonly #transaction?: <T>(accountId: AccountId, operation: () => Promise<T>) => Promise<T>;
  readonly #purchases = new Map<string, InventoryPurchaseSummary>();
  readonly #transfers = new Map<string, InventoryTransferSummary>();

  public constructor(inventory: InventoryService, options: ProcurementServiceOptions = {}) {
    this.#inventory = inventory;
    this.#repository = options.repository;
    this.#payableGateway = options.payableGateway;
    this.#transaction = options.transaction;
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) return;
    const [purchases, transfers] = await Promise.all([
      this.#repository.findPurchases(accountId),
      this.#repository.findTransfers(accountId)
    ]);
    for (const purchase of purchases) this.#purchases.set(purchase.id, purchase);
    for (const transfer of transfers) this.#transfers.set(transfer.id, transfer);
  }

  public listPurchases(accountId: AccountId): readonly InventoryPurchaseSummary[] {
    return [...this.#purchases.values()]
      .filter((purchase) => purchase.accountId === accountId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  public async listPersistedPurchaseReportRows(
    accountId: AccountId,
    filters: InventoryPurchaseReportFilters = {}
  ): Promise<readonly InventoryPurchaseReportSourceRow[]> {
    if (!this.#repository?.findPurchaseReportRows) {
      throw new ValidationError(
        'Inventory purchase report requires a database-backed purchase source'
      );
    }
    const activeAccountId = getTenantContext()?.accountId;
    if (activeAccountId && activeAccountId !== accountId) {
      throw new ValidationError(
        'Inventory purchase report source account does not match tenant context',
        { accountId }
      );
    }

    const normalizedFilters = normalizePurchaseReportFilters(filters);
    const sourceRows = await this.#repository.findPurchaseReportRows(accountId, {
      ...normalizedFilters,
      limit: normalizedFilters.limit ?? MAX_INVENTORY_PURCHASE_REPORT_READ_ROWS
    });
    if (!Array.isArray(sourceRows)) {
      throw new ValidationError(
        'Inventory purchase report source returned an invalid row collection'
      );
    }

    const search = normalizedFilters.search?.toLowerCase();
    const rows: InventoryPurchaseReportSourceRow[] = [];
    for (const sourceRow of sourceRows) {
      if (!isInventoryPurchaseReportSourceRow(sourceRow)) {
        throw new ValidationError('Inventory purchase report source returned an invalid row');
      }
      if (sourceRow.accountId !== accountId) continue;
      if (normalizedFilters.status !== undefined && sourceRow.status !== normalizedFilters.status) {
        continue;
      }
      const createdOn = sourceRow.createdAt.slice(0, 10);
      if (normalizedFilters.dateFrom && createdOn < normalizedFilters.dateFrom) continue;
      if (normalizedFilters.dateTo && createdOn > normalizedFilters.dateTo) continue;
      if (
        search &&
        !sourceRow.invoiceNumber.toLowerCase().includes(search) &&
        !sourceRow.supplierName.toLowerCase().includes(search)
      ) {
        continue;
      }
      rows.push(sourceRow);
    }

    rows.sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        left.purchaseId.localeCompare(right.purchaseId)
    );
    return normalizedFilters.limit === undefined ? rows : rows.slice(0, normalizedFilters.limit);
  }

  public getPurchase(accountId: AccountId, purchaseId: string): InventoryPurchaseSummary {
    const purchase = this.#purchases.get(purchaseId);
    if (!purchase || purchase.accountId !== accountId) {
      throw new NotFoundError('Inventory purchase not found', { purchaseId });
    }
    return purchase;
  }

  public async createPurchase(
    accountId: AccountId,
    createdByUserId: UserId,
    input: CreateInventoryPurchaseInput
  ): Promise<InventoryPurchaseSummary> {
    const supplierName = requiredText(input.supplierName, 'supplierName');
    if (input.lines.length === 0)
      throw new ValidationError('Purchase must contain at least one line');
    const now = nowIso();
    const purchaseId = createCorrelationId('purchase');
    const lines = input.lines.map((line) => {
      const item = this.#inventory.getItemOrThrow(line.inventoryItemId as never, accountId);
      const quantity = positive(line.quantity, 'quantity');
      const unitCostAmount = nonNegative(line.unitCostAmount, 'unitCostAmount');
      return {
        id: createCorrelationId('purchase-line'),
        purchaseId,
        inventoryItemId: item.id,
        sku: item.sku,
        itemName: item.name,
        orderedQuantity: quantity,
        receivedQuantity: 0,
        unit: item.unit,
        unitCostAmount,
        lotNumber: requiredText(line.lotNumber, 'lotNumber'),
        expiryDate: normalizeDate(line.expiryDate),
        manufactureDate: normalizeDate(line.manufactureDate),
        location: normalizeOptional(line.location),
        supplier: supplierName
      } satisfies InventoryPurchaseLineSummary;
    });
    const purchase: InventoryPurchaseSummary = {
      id: purchaseId,
      accountId,
      supplierName,
      invoiceNumber: normalizeOptional(input.invoiceNumber),
      status: 'draft',
      totalAmount: round(
        lines.reduce((sum, line) => sum + line.orderedQuantity * line.unitCostAmount, 0)
      ),
      receivedAmount: 0,
      payableId: normalizeOptional(input.payableId),
      lines,
      createdByUserId,
      approvedByUserId: null,
      createdAt: now,
      updatedAt: now,
      receivedAt: null
    };
    await this.#repository?.savePurchase(purchase);
    this.#purchases.set(purchase.id, purchase);
    return purchase;
  }

  public async approvePurchase(
    accountId: AccountId,
    approvedByUserId: UserId,
    purchaseId: string
  ): Promise<InventoryPurchaseSummary> {
    return this.#runInTransaction(accountId, async () => {
      const purchase = this.getPurchase(accountId, purchaseId);
      if (purchase.status !== 'draft') {
        throw new ConflictError('Only draft purchases can be approved', {
          purchaseId,
          status: purchase.status
        });
      }
      let payableId = purchase.payableId;
      if (this.#payableGateway && purchase.totalAmount > 0 && !payableId) {
        const issuedAt = nowIso().slice(0, 10);
        const payable = await this.#payableGateway.createPayable(accountId, approvedByUserId, {
          supplierName: purchase.supplierName,
          description: `Compra de estoque ${purchase.invoiceNumber ?? purchase.id}`,
          category: 'estoque-compras',
          costCenterCode: '3.1.01-estoque',
          costCenterName: 'Suprimentos e estoque',
          issuedAt,
          dueAt: addDays(issuedAt, 30),
          totalAmount: purchase.totalAmount,
          sourceExpenseId: purchase.id,
          notes: purchase.invoiceNumber ? `NF ${purchase.invoiceNumber}` : null
        });
        payableId = payable.id;
      }
      const updated = {
        ...purchase,
        status: 'approved' as const,
        approvedByUserId,
        payableId,
        updatedAt: nowIso()
      };
      await this.#repository?.savePurchase(updated);
      this.#purchases.set(updated.id, updated);
      return updated;
    });
  }

  public async receivePurchase(
    accountId: AccountId,
    receivedByUserId: UserId,
    purchaseId: string,
    input: ReceiveInventoryPurchaseInput
  ): Promise<InventoryPurchaseSummary> {
    return this.#runInTransaction(accountId, async () => {
      const purchase = await this.#getPurchaseForReceive(accountId, purchaseId);
      if (!['approved', 'partially_received'].includes(purchase.status)) {
        throw new ConflictError('Purchase is not ready for receiving', {
          purchaseId,
          status: purchase.status
        });
      }
      if (input.lines.length === 0)
        throw new ValidationError('Receiving must contain at least one line');
      const lineIds = new Set<string>();
      for (const receipt of input.lines) {
        if (lineIds.has(receipt.lineId)) {
          throw new ValidationError('Receiving cannot contain duplicate purchase lines', {
            lineId: receipt.lineId
          });
        }
        lineIds.add(receipt.lineId);
      }
      const receipts = input.lines.map((receipt) => {
        const line = purchase.lines.find((candidate) => candidate.id === receipt.lineId);
        if (!line) throw new NotFoundError('Purchase line not found', { lineId: receipt.lineId });
        const quantity = positive(receipt.quantity, 'quantity');
        if (line.receivedQuantity + quantity > line.orderedQuantity) {
          throw new ConflictError('Received quantity exceeds ordered quantity', {
            lineId: line.id
          });
        }
        return {
          line,
          quantity,
          expiryDate: normalizeDate(receipt.expiryDate) ?? line.expiryDate,
          manufactureDate: normalizeDate(receipt.manufactureDate) ?? line.manufactureDate,
          location: normalizeOptional(receipt.location) ?? line.location
        };
      });
      if (!purchase.invoiceNumber) {
        throw new ValidationError('Invoice number is required before receiving stock', {
          purchaseId
        });
      }
      const requested = new Map(receipts.map((receipt) => [receipt.line.id, receipt]));
      const lines = purchase.lines.map((line) => {
        const receipt = requested.get(line.id);
        if (!receipt) return line;
        return { ...line, receivedQuantity: round(line.receivedQuantity + receipt.quantity) };
      });
      for (const receipt of receipts) {
        const { line } = receipt;
        await this.#inventory.receiveInbound(accountId, receivedByUserId, {
          inventoryItemId: line.inventoryItemId,
          quantity: receipt.quantity,
          unitCostAmount: line.unitCostAmount,
          lotNumber: line.lotNumber,
          expiryDate: receipt.expiryDate,
          manufactureDate: receipt.manufactureDate,
          location: receipt.location,
          supplier: purchase.supplierName,
          reference: purchase.invoiceNumber ?? purchase.id
        } satisfies CreateInventoryInboundRequest);
      }
      const fullyReceived = lines.every((line) => line.receivedQuantity === line.orderedQuantity);
      const updated: InventoryPurchaseSummary = {
        ...purchase,
        lines,
        status: fullyReceived ? 'received' : 'partially_received',
        receivedAmount: round(
          lines.reduce((sum, line) => sum + line.receivedQuantity * line.unitCostAmount, 0)
        ),
        receivedAt: fullyReceived ? nowIso() : purchase.receivedAt,
        updatedAt: nowIso()
      };
      await this.#repository?.savePurchase(updated);
      this.#purchases.set(updated.id, updated);
      return updated;
    });
  }

  public async cancelPurchase(
    accountId: AccountId,
    purchaseId: string
  ): Promise<InventoryPurchaseSummary> {
    const purchase = this.getPurchase(accountId, purchaseId);
    if (purchase.status === 'received' || purchase.status === 'partially_received') {
      throw new ConflictError('Received purchases cannot be cancelled', { purchaseId });
    }
    const updated = { ...purchase, status: 'cancelled' as const, updatedAt: nowIso() };
    await this.#repository?.savePurchase(updated);
    this.#purchases.set(updated.id, updated);
    return updated;
  }

  public listTransfers(accountId: AccountId): readonly InventoryTransferSummary[] {
    return [...this.#transfers.values()]
      .filter((transfer) => transfer.accountId === accountId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  public async createTransfer(
    accountId: AccountId,
    createdByUserId: UserId,
    input: InventoryTransferRequest
  ): Promise<InventoryTransferSummary> {
    return this.#runInTransaction(accountId, async () => {
      const movements = await this.#inventory.transferBetweenLocations(
        accountId,
        createdByUserId,
        input
      );
      const [outboundMovement, inboundMovement] = movements;
      if (!outboundMovement || !inboundMovement)
        throw new ValidationError('Inventory transfer produced no movements');
      const transfer: InventoryTransferSummary = {
        id: createCorrelationId('transfer'),
        accountId,
        inventoryItemId: input.inventoryItemId,
        quantity: input.quantity,
        fromLocation: input.fromLocation.trim(),
        toLocation: input.toLocation.trim(),
        status: 'completed',
        reference: normalizeOptional(input.reference),
        outboundMovementId: outboundMovement.id,
        inboundMovementId: inboundMovement.id,
        createdByUserId,
        createdAt: nowIso()
      };
      await this.#repository?.saveTransfer(transfer);
      this.#transfers.set(transfer.id, transfer);
      return transfer;
    });
  }

  async #runInTransaction<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> {
    const purchases = new Map(this.#purchases);
    const transfers = new Map(this.#transfers);
    try {
      if (this.#transaction) return await this.#transaction(accountId, operation);
      if (this.#repository?.withTransaction) {
        return await this.#repository.withTransaction(accountId, operation);
      }
      return await operation();
    } catch (error) {
      this.#purchases.clear();
      for (const [id, purchase] of purchases) this.#purchases.set(id, purchase);
      this.#transfers.clear();
      for (const [id, transfer] of transfers) this.#transfers.set(id, transfer);
      throw error;
    }
  }

  async #getPurchaseForReceive(
    accountId: AccountId,
    purchaseId: string
  ): Promise<InventoryPurchaseSummary> {
    if (!this.#repository?.findPurchaseForUpdate) {
      return this.getPurchase(accountId, purchaseId);
    }
    const purchase = await this.#repository.findPurchaseForUpdate(accountId, purchaseId);
    if (!purchase) throw new NotFoundError('Inventory purchase not found', { purchaseId });
    return purchase;
  }
}

export class InMemoryProcurementRepository implements ProcurementRepository {
  readonly #purchases = new Map<string, InventoryPurchaseSummary>();
  readonly #transfers = new Map<string, InventoryTransferSummary>();

  async savePurchase(purchase: InventoryPurchaseSummary): Promise<void> {
    this.#purchases.set(purchase.id, purchase);
  }

  async findPurchases(accountId: AccountId): Promise<readonly InventoryPurchaseSummary[]> {
    return [...this.#purchases.values()].filter((purchase) => purchase.accountId === accountId);
  }

  async saveTransfer(transfer: InventoryTransferSummary): Promise<void> {
    this.#transfers.set(transfer.id, transfer);
  }

  async findTransfers(accountId: AccountId): Promise<readonly InventoryTransferSummary[]> {
    return [...this.#transfers.values()].filter((transfer) => transfer.accountId === accountId);
  }
}

export class DatabaseProcurementRepository implements ProcurementRepository {
  async withTransaction<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> {
    return withTenantTransaction(accountId, async () => operation());
  }

  async findPurchaseForUpdate(
    accountId: AccountId,
    purchaseId: string
  ): Promise<InventoryPurchaseSummary | null> {
    return withTenantTransaction(accountId, async (database) => {
      const header = await database.execute(sql`SELECT *
        FROM inventory_purchases
        WHERE account_id = ${accountId} AND id = ${purchaseId}
        FOR UPDATE`);
      const headerRow = header.rows[0] as Record<string, unknown> | undefined;
      if (!headerRow) return null;

      const lines = await database.execute(sql`SELECT COALESCE(json_agg(json_build_object(
        'id', line.id, 'purchaseId', line.purchase_id, 'inventoryItemId', line.inventory_item_id,
        'sku', line.sku, 'itemName', line.item_name, 'orderedQuantity', line.ordered_quantity,
        'receivedQuantity', line.received_quantity, 'unit', line.unit, 'unitCostAmount', line.unit_cost_amount,
        'lotNumber', line.lot_number, 'expiryDate', line.expiry_date, 'manufactureDate', line.manufacture_date,
        'location', line.location, 'supplier', line.supplier
      ) ORDER BY line.id) FILTER (WHERE line.id IS NOT NULL), '[]'::json) AS lines
        FROM inventory_purchase_lines line
        WHERE line.account_id = ${accountId} AND line.purchase_id = ${purchaseId}`);
      return mapPurchaseRow({ ...headerRow, lines: lines.rows[0]?.lines });
    });
  }

  async savePurchase(purchase: InventoryPurchaseSummary): Promise<void> {
    await withTenantTransaction(purchase.accountId, async (database) => {
      await database.execute(sql`INSERT INTO inventory_purchases (
        id, account_id, supplier_name, invoice_number, status, total_amount, received_amount,
        payable_id, created_by_user_id, approved_by_user_id, created_at, updated_at, received_at
      ) VALUES (${purchase.id}, ${purchase.accountId}, ${purchase.supplierName}, ${purchase.invoiceNumber},
        ${purchase.status}, ${purchase.totalAmount}, ${purchase.receivedAmount}, ${purchase.payableId},
        ${purchase.createdByUserId}, ${purchase.approvedByUserId}, ${new Date(purchase.createdAt)},
        ${new Date(purchase.updatedAt)}, ${purchase.receivedAt ? new Date(purchase.receivedAt) : null})
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status, total_amount = EXCLUDED.total_amount,
        received_amount = EXCLUDED.received_amount, payable_id = EXCLUDED.payable_id,
        approved_by_user_id = EXCLUDED.approved_by_user_id, updated_at = EXCLUDED.updated_at,
        received_at = EXCLUDED.received_at`);
      await database.execute(
        sql`DELETE FROM inventory_purchase_lines WHERE purchase_id = ${purchase.id}`
      );
      for (const line of purchase.lines) {
        await database.execute(sql`INSERT INTO inventory_purchase_lines (
          id, account_id, purchase_id, inventory_item_id, sku, item_name, ordered_quantity,
          received_quantity, unit, unit_cost_amount, lot_number, expiry_date, manufacture_date,
          location, supplier
        ) VALUES (${line.id}, ${purchase.accountId}, ${purchase.id}, ${line.inventoryItemId}, ${line.sku},
          ${line.itemName}, ${line.orderedQuantity}, ${line.receivedQuantity}, ${line.unit},
          ${line.unitCostAmount}, ${line.lotNumber}, ${line.expiryDate ? new Date(line.expiryDate) : null},
          ${line.manufactureDate ? new Date(line.manufactureDate) : null}, ${line.location}, ${line.supplier})`);
      }
    });
  }

  async findPurchases(accountId: AccountId): Promise<readonly InventoryPurchaseSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT purchase.*, COALESCE(json_agg(json_build_object(
          'id', line.id, 'purchaseId', line.purchase_id, 'inventoryItemId', line.inventory_item_id,
          'sku', line.sku, 'itemName', line.item_name, 'orderedQuantity', line.ordered_quantity,
          'receivedQuantity', line.received_quantity, 'unit', line.unit, 'unitCostAmount', line.unit_cost_amount,
          'lotNumber', line.lot_number, 'expiryDate', line.expiry_date, 'manufactureDate', line.manufacture_date,
          'location', line.location, 'supplier', line.supplier
        ) ORDER BY line.id) FILTER (WHERE line.id IS NOT NULL), '[]'::json) AS lines
        FROM inventory_purchases purchase
        LEFT JOIN inventory_purchase_lines line ON line.purchase_id = purchase.id
        WHERE purchase.account_id = $1
        GROUP BY purchase.id ORDER BY purchase.created_at DESC`,
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => mapPurchaseRow(row));
    });
  }

  async findPurchaseReportRows(
    accountId: AccountId,
    filters: InventoryPurchaseReportFilters = {}
  ): Promise<readonly InventoryPurchaseReportSourceRow[]> {
    const normalizedFilters = normalizePurchaseReportFilters(filters);
    const parameters: unknown[] = [accountId];
    const conditions = [
      'purchase.account_id = $1',
      "NULLIF(BTRIM(purchase.invoice_number), '') IS NOT NULL"
    ];
    const createdAtUtcDate = "(purchase.created_at AT TIME ZONE 'UTC')::date";
    const parameter = (value: unknown): string => {
      parameters.push(value);
      return `$${parameters.length}`;
    };

    if (normalizedFilters.status) {
      conditions.push(`purchase.status = ${parameter(normalizedFilters.status)}`);
    }
    if (normalizedFilters.search) {
      const pattern = `%${escapeIlikePattern(normalizedFilters.search)}%`;
      const searchParameter = parameter(pattern);
      conditions.push(
        `(purchase.supplier_name ILIKE ${searchParameter} ESCAPE '\\' OR purchase.invoice_number ILIKE ${searchParameter} ESCAPE '\\')`
      );
    }
    if (normalizedFilters.dateFrom) {
      conditions.push(`${createdAtUtcDate} >= ${parameter(normalizedFilters.dateFrom)}::date`);
    }
    if (normalizedFilters.dateTo) {
      conditions.push(`${createdAtUtcDate} <= ${parameter(normalizedFilters.dateTo)}::date`);
    }

    const limit = normalizedFilters.limit ?? MAX_INVENTORY_PURCHASE_REPORT_READ_ROWS;
    const result = await withTenantQueryExplicit(getPool(), accountId, async (client) =>
      client.query(
        `SELECT purchase.id AS purchase_id, purchase.account_id, purchase.supplier_name,
          purchase.invoice_number, purchase.status, purchase.total_amount,
          purchase.received_amount, purchase.payable_id, purchase.created_by_user_id,
          purchase.approved_by_user_id, purchase.created_at, purchase.updated_at,
          purchase.received_at
        FROM inventory_purchases purchase
        WHERE ${conditions.join(' AND ')}
        ORDER BY purchase.created_at DESC, purchase.id ASC
        LIMIT ${parameter(limit)}`,
        parameters
      )
    );
    return result.rows.map((row: Record<string, unknown>) => mapPurchaseReportRow(row));
  }

  async saveTransfer(transfer: InventoryTransferSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO inventory_transfers (
          id, account_id, inventory_item_id, quantity, from_location, to_location, status,
          reference, outbound_movement_id, inbound_movement_id, created_by_user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, reference = EXCLUDED.reference`,
        [
          transfer.id,
          transfer.accountId,
          transfer.inventoryItemId,
          transfer.quantity,
          transfer.fromLocation,
          transfer.toLocation,
          transfer.status,
          transfer.reference,
          transfer.outboundMovementId,
          transfer.inboundMovementId,
          transfer.createdByUserId,
          new Date(transfer.createdAt)
        ]
      );
    });
  }

  async findTransfers(accountId: AccountId): Promise<readonly InventoryTransferSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM inventory_transfers WHERE account_id = $1 ORDER BY created_at DESC',
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => mapTransferRow(row));
    });
  }
}

function mapPurchaseRow(row: Record<string, unknown>): InventoryPurchaseSummary {
  const lines = Array.isArray(row.lines)
    ? row.lines.map((line) => mapLine(line as Record<string, unknown>))
    : [];
  return {
    id: String(row.id),
    accountId: row.account_id as AccountId,
    supplierName: String(row.supplier_name),
    invoiceNumber: (row.invoice_number as string | null) ?? null,
    status: row.status as InventoryPurchaseStatus,
    totalAmount: Number(row.total_amount),
    receivedAmount: Number(row.received_amount),
    payableId: (row.payable_id as string | null) ?? null,
    lines,
    createdByUserId: row.created_by_user_id as UserId,
    approvedByUserId: (row.approved_by_user_id as UserId | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
    receivedAt: row.received_at ? new Date(row.received_at as string).toISOString() : null
  };
}

function mapPurchaseReportRow(row: Record<string, unknown>): InventoryPurchaseReportSourceRow {
  return {
    purchaseId: String(row.purchase_id),
    accountId: row.account_id as AccountId,
    invoiceNumber: String(row.invoice_number),
    supplierName: String(row.supplier_name),
    status: row.status as InventoryPurchaseStatus,
    totalAmount: Number(row.total_amount),
    receivedAmount: Number(row.received_amount),
    payableId: (row.payable_id as string | null) ?? null,
    createdByUserId: row.created_by_user_id as UserId,
    approvedByUserId: (row.approved_by_user_id as UserId | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
    receivedAt: row.received_at ? new Date(row.received_at as string).toISOString() : null
  };
}

function mapLine(row: Record<string, unknown>): InventoryPurchaseLineSummary {
  return {
    id: String(row.id),
    purchaseId: String(row.purchaseId),
    inventoryItemId: String(row.inventoryItemId),
    sku: String(row.sku),
    itemName: String(row.itemName),
    orderedQuantity: Number(row.orderedQuantity),
    receivedQuantity: Number(row.receivedQuantity),
    unit: String(row.unit),
    unitCostAmount: Number(row.unitCostAmount),
    lotNumber: String(row.lotNumber),
    expiryDate: row.expiryDate ? new Date(row.expiryDate as string).toISOString() : null,
    manufactureDate: row.manufactureDate
      ? new Date(row.manufactureDate as string).toISOString()
      : null,
    location: (row.location as string | null) ?? null,
    supplier: (row.supplier as string | null) ?? null
  };
}

function mapTransferRow(row: Record<string, unknown>): InventoryTransferSummary {
  return {
    id: String(row.id),
    accountId: row.account_id as AccountId,
    inventoryItemId: String(row.inventory_item_id),
    quantity: Number(row.quantity),
    fromLocation: String(row.from_location),
    toLocation: String(row.to_location),
    status: row.status as InventoryTransferStatus,
    reference: (row.reference as string | null) ?? null,
    outboundMovementId: String(row.outbound_movement_id),
    inboundMovementId: String(row.inbound_movement_id),
    createdByUserId: row.created_by_user_id as UserId,
    createdAt: new Date(row.created_at as string).toISOString()
  };
}

function requiredText(value: string | null | undefined, field: string): string {
  const text = value?.trim();
  if (!text) throw new ValidationError(`${field} is required`, { field });
  return text;
}

function normalizeOptional(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text || null;
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ValidationError('Date must be valid ISO', { value });
  return date.toISOString();
}

const inventoryPurchaseReportStatuses: readonly InventoryPurchaseStatus[] = [
  'draft',
  'approved',
  'partially_received',
  'received',
  'cancelled'
];
const MAX_INVENTORY_PURCHASE_REPORT_READ_ROWS = 10_001;

function normalizePurchaseReportFilters(
  filters: InventoryPurchaseReportFilters
): InventoryPurchaseReportFilters {
  const search = filters.search?.trim();
  if (search && search.length > 200) {
    throw new ValidationError('Inventory purchase report search must have at most 200 characters', {
      search
    });
  }
  const dateFrom = normalizePurchaseReportDate(filters.dateFrom, 'dateFrom');
  const dateTo = normalizePurchaseReportDate(filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new ValidationError('dateFrom must be before or equal to dateTo', { dateFrom, dateTo });
  }
  if (filters.status !== undefined && !inventoryPurchaseReportStatuses.includes(filters.status)) {
    throw new ValidationError(
      'status must be draft, approved, partially_received, received or cancelled',
      { status: filters.status }
    );
  }
  if (
    filters.limit !== undefined &&
    (!Number.isSafeInteger(filters.limit) ||
      filters.limit < 1 ||
      filters.limit > MAX_INVENTORY_PURCHASE_REPORT_READ_ROWS)
  ) {
    throw new ValidationError('Inventory purchase report read limit must be between 1 and 10001', {
      limit: filters.limit
    });
  }
  return {
    ...(search ? { search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(filters.limit === undefined ? {} : { limit: filters.limit })
  };
}

function normalizePurchaseReportDate(value: string | undefined, field: string): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must be an ISO calendar date`, { value });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${field} must be an ISO calendar date`, { value });
  }
  return value;
}

function isInventoryPurchaseReportSourceRow(
  value: unknown
): value is InventoryPurchaseReportSourceRow {
  if (!isRecord(value)) return false;
  return (
    typeof value.purchaseId === 'string' &&
    typeof value.accountId === 'string' &&
    typeof value.invoiceNumber === 'string' &&
    value.invoiceNumber.trim().length > 0 &&
    typeof value.supplierName === 'string' &&
    typeof value.status === 'string' &&
    inventoryPurchaseReportStatuses.includes(value.status as InventoryPurchaseStatus) &&
    isFiniteNonNegative(value.totalAmount) &&
    isFiniteNonNegative(value.receivedAmount) &&
    value.receivedAmount <= value.totalAmount &&
    (value.payableId === null || typeof value.payableId === 'string') &&
    typeof value.createdByUserId === 'string' &&
    (value.approvedByUserId === null || typeof value.approvedByUserId === 'string') &&
    isValidReportTimestamp(value.createdAt) &&
    isValidReportTimestamp(value.updatedAt) &&
    (value.receivedAt === null || isValidReportTimestamp(value.receivedAt))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isValidReportTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function positive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0)
    throw new ValidationError(`${field} must be positive`, { field, value });
  return round(value);
}

function nonNegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0)
    throw new ValidationError(`${field} must be non-negative`, { field, value });
  return round(value);
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

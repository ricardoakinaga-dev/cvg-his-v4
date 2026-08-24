import { sql } from 'drizzle-orm';
import { getPool, withTenantTransaction } from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, InventoryStockMovementSummary, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type {
  CreateInventoryInboundRequest,
  InventoryService,
  InventoryTransferRequest
} from './index.js';

export type InventoryPurchaseStatus = 'draft' | 'approved' | 'partially_received' | 'received' | 'cancelled';
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
  savePurchase(purchase: InventoryPurchaseSummary): Promise<void>;
  findPurchases(accountId: AccountId): Promise<readonly InventoryPurchaseSummary[]>;
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
    if (input.lines.length === 0) throw new ValidationError('Purchase must contain at least one line');
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
      totalAmount: round(lines.reduce((sum, line) => sum + line.orderedQuantity * line.unitCostAmount, 0)),
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
        throw new ConflictError('Only draft purchases can be approved', { purchaseId, status: purchase.status });
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
      const purchase = this.getPurchase(accountId, purchaseId);
      if (!['approved', 'partially_received'].includes(purchase.status)) {
        throw new ConflictError('Purchase is not ready for receiving', { purchaseId, status: purchase.status });
      }
      if (input.lines.length === 0) throw new ValidationError('Receiving must contain at least one line');
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
          throw new ConflictError('Received quantity exceeds ordered quantity', { lineId: line.id });
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
        receivedAmount: round(lines.reduce((sum, line) => sum + line.receivedQuantity * line.unitCostAmount, 0)),
        receivedAt: fullyReceived ? nowIso() : purchase.receivedAt,
        updatedAt: nowIso()
      };
      await this.#repository?.savePurchase(updated);
      this.#purchases.set(updated.id, updated);
      return updated;
    });
  }

  public async cancelPurchase(accountId: AccountId, purchaseId: string): Promise<InventoryPurchaseSummary> {
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
      const movements = await this.#inventory.transferBetweenLocations(accountId, createdByUserId, input);
      const [outboundMovement, inboundMovement] = movements;
      if (!outboundMovement || !inboundMovement) throw new ValidationError('Inventory transfer produced no movements');
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
      return await (this.#transaction
        ? this.#transaction(accountId, operation)
        : operation());
    } catch (error) {
      this.#purchases.clear();
      for (const [id, purchase] of purchases) this.#purchases.set(id, purchase);
      this.#transfers.clear();
      for (const [id, transfer] of transfers) this.#transfers.set(id, transfer);
      throw error;
    }
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
      await database.execute(sql`DELETE FROM inventory_purchase_lines WHERE purchase_id = ${purchase.id}`);
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

  async saveTransfer(transfer: InventoryTransferSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO inventory_transfers (
          id, account_id, inventory_item_id, quantity, from_location, to_location, status,
          reference, outbound_movement_id, inbound_movement_id, created_by_user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, reference = EXCLUDED.reference`,
        [transfer.id, transfer.accountId, transfer.inventoryItemId, transfer.quantity,
          transfer.fromLocation, transfer.toLocation, transfer.status, transfer.reference,
          transfer.outboundMovementId, transfer.inboundMovementId, transfer.createdByUserId,
          new Date(transfer.createdAt)]
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
  const lines = Array.isArray(row.lines) ? row.lines.map((line) => mapLine(line as Record<string, unknown>)) : [];
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
    manufactureDate: row.manufactureDate ? new Date(row.manufactureDate as string).toISOString() : null,
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

function positive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new ValidationError(`${field} must be positive`, { field, value });
  return round(value);
}

function nonNegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) throw new ValidationError(`${field} must be non-negative`, { field, value });
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

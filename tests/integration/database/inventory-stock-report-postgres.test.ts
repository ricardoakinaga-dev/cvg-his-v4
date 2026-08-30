import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  AuditService,
  DatabaseAuditRepository
} from '../../../packages/modules/audit/src/index.js';
import {
  DatabaseProcurementRepository,
  InventoryService,
  DatabaseInventoryRepository,
  ProcurementService
} from '../../../packages/modules/inventory/src/index.js';
import {
  DatabaseReportRepository,
  ReportsService
} from '../../../packages/modules/reports/src/index.js';
import {
  createDatabaseClient,
  getDatabaseClient
} from '../../../packages/shared/database/src/index.js';
import type {
  AccountId,
  AuthenticatedPrincipal
} from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { handleReportsRoutes } from '../../../apps/api/src/routes/reports-routes.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_A = randomUUID() as AccountId;
const ACCOUNT_B = randomUUID() as AccountId;
const REPORT_USER_ID = randomUUID() as never;
const ITEM_A_ALPHA = `inventory-stock-alpha-${randomUUID()}`;
const ITEM_A_ZULU = `inventory-stock-zulu-${randomUUID()}`;
const ITEM_B_FOREIGN = `inventory-stock-foreign-${randomUUID()}`;
const MOVEMENT_A_INBOUND = `inventory-movement-inbound-${randomUUID()}`;
const MOVEMENT_A_CONSUMPTION = `inventory-movement-consumption-${randomUUID()}`;
const MOVEMENT_B_FOREIGN = `inventory-movement-foreign-${randomUUID()}`;
const PURCHASE_A_OLD = `inventory-purchase-old-${randomUUID()}`;
const PURCHASE_A_NEW = `inventory-purchase-new-${randomUUID()}`;
const PURCHASE_A_BLANK = `inventory-purchase-blank-${randomUUID()}`;
const PURCHASE_B_FOREIGN = `inventory-purchase-foreign-${randomUUID()}`;
const EXPECTED_FIELDS = [
  'sku',
  'name',
  'unit',
  'onHandQuantity',
  'reorderLevel',
  'unitCostAmount',
  'stockValue',
  'reorderStatus',
  'createdAt',
  'updatedAt'
] as const;
const EXPECTED_MOVEMENT_FIELDS = [
  'movementId',
  'occurredAt',
  'movementType',
  'sku',
  'name',
  'unit',
  'quantityDelta',
  'balanceBefore',
  'balanceAfter',
  'unitCostAmount',
  'reason',
  'reference',
  'recordedByUserId'
] as const;
const EXPECTED_PURCHASE_FIELDS = [
  'purchaseId',
  'invoiceNumber',
  'supplierName',
  'status',
  'totalAmount',
  'receivedAmount',
  'payableId',
  'createdByUserId',
  'approvedByUserId',
  'createdAt',
  'updatedAt',
  'receivedAt'
] as const;

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setHeader(): this {
    return this;
  }

  override end(
    chunk?: string | Buffer | (() => void),
    encoding?: BufferEncoding | (() => void),
    callback?: () => void
  ): this {
    const finalCallback =
      typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    finalCallback?.();
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function request(body: unknown): never {
  return {
    method: 'POST',
    url: '/reports/executions',
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function principal(accountId: AccountId): AuthenticatedPrincipal {
  return {
    user: {
      id: REPORT_USER_ID,
      accountId,
      username: 'inventory-stock-report',
      email: 'inventory-stock-report@example.com',
      displayName: 'Inventory stock report',
      status: 'active',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z'
    },
    session: {
      sessionId: 'inventory-stock-report-session' as never,
      userId: REPORT_USER_ID,
      accountId,
      createdAt: '2026-05-01T00:00:00.000Z',
      expiresAt: '2027-05-01T00:00:00.000Z',
      authTime: '2026-05-01T00:00:00.000Z',
      refreshExpiresAt: '2027-05-01T00:00:00.000Z',
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['billing.read', 'inventory.read'],
      capabilities: []
    }
  };
}

describe('inventory-stock report over real PostgreSQL persistence', () => {
  const pool = getTestPool();
  let inventory: InventoryService;
  let procurement: ProcurementService;

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Inventory stock report tenant', 'active', now())`,
      [TENANT_ID, `inventory-stock-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $3, $4, 'Inventory stock account A', true),
              ($2, $3, $5, 'Inventory stock account B', true)`,
      [
        ACCOUNT_A,
        ACCOUNT_B,
        TENANT_ID,
        `inventory-stock-a-${ACCOUNT_A.slice(0, 12)}`,
        `inventory-stock-b-${ACCOUNT_B.slice(0, 12)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, 'inventory-stock-report', 'inventory-stock-report@example.test', 'test-hash', 'Inventory stock report')`,
      [REPORT_USER_ID, ACCOUNT_A]
    );
    await pool.query(
      `INSERT INTO inventory_items (
         id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
         unit_cost_amount, created_at, updated_at
       ) VALUES
         ($1, $4, 'STOCK-A-002', 'Zeta Stock', 'un', 20, 3, 40.00, '2026-05-31T23:59:59.000Z', '2026-06-01T00:00:00.000Z'),
         ($2, $4, 'STOCK-A-001', 'Alpha Stock', 'un', 4, 5, 12.50, '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
         ($3, $5, 'STOCK-B-001', 'Foreign Stock', 'un', 9, 2, 4.40, '2026-05-10T00:00:00.000Z', '2026-05-10T00:00:00.000Z')`,
      [ITEM_A_ZULU, ITEM_A_ALPHA, ITEM_B_FOREIGN, ACCOUNT_A, ACCOUNT_B]
    );
    await pool.query(
      `INSERT INTO inventory_stock_movements (
         id, account_id, inventory_item_id, movement_type, quantity_delta,
         balance_before, balance_after, unit_cost_amount, reason, reference,
         recorded_by_user_id, created_at
       ) VALUES
         ($1, $4, $6, 'inbound', 10, 0, 10, 40.00, 'Entrada de compra', 'NF-A-001', 'user-inventory', '2026-05-31T23:00:00.000Z'),
         ($2, $4, $5, 'consumption', -2, 20, 18, 12.50, 'Consumo assistencial', 'encounter-a', 'user-inventory', '2026-05-31T23:00:00.000Z'),
         ($3, $7, $8, 'adjustment', 1, 9, 10, 4.40, 'Ajuste estrangeiro', 'foreign', 'user-other', '2026-05-15T12:00:00.000Z')`,
      [
        MOVEMENT_A_INBOUND,
        MOVEMENT_A_CONSUMPTION,
        MOVEMENT_B_FOREIGN,
        ACCOUNT_A,
        ITEM_A_ALPHA,
        ITEM_A_ZULU,
        ACCOUNT_B,
        ITEM_B_FOREIGN
      ]
    );

    await pool.query(
      `INSERT INTO inventory_purchases (
         id, account_id, supplier_name, invoice_number, status, total_amount,
         received_amount, payable_id, created_by_user_id, approved_by_user_id,
         created_at, updated_at, received_at
       ) VALUES
         ($1, $5, 'Fornecedor A', 'NF-A-OLD', 'approved', 125.00, 50.00, 'payable-a-old', $6, 'manager-a', '2026-05-01T10:00:00.000Z', '2026-05-02T10:00:00.000Z', NULL),
         ($2, $5, 'Fornecedor A', 'NF-A-NEW', 'received', 200.00, 200.00, 'payable-a-new', $6, 'manager-a', '2026-05-31T23:59:00.000Z', '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z'),
         ($3, $5, 'Fornecedor A', '   ', 'draft', 10.00, 0.00, NULL, $6, NULL, '2026-05-15T12:00:00.000Z', '2026-05-15T12:00:00.000Z', NULL),
         ($4, $7, 'Fornecedor B', 'NF-B-001', 'received', 999.00, 999.00, 'payable-b', $6, 'manager-b', '2026-05-20T12:00:00.000Z', '2026-05-20T12:00:00.000Z', '2026-05-20T12:00:00.000Z')`,
      [
        PURCHASE_A_OLD,
        PURCHASE_A_NEW,
        PURCHASE_A_BLANK,
        PURCHASE_B_FOREIGN,
        ACCOUNT_A,
        REPORT_USER_ID,
        ACCOUNT_B
      ]
    );

    inventory = new InventoryService({ getOrThrow() {} } as never, [], {
      repository: new DatabaseInventoryRepository()
    });
    procurement = new ProcurementService(inventory, {
      repository: new DatabaseProcurementRepository()
    });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM audit_events WHERE account_id IN ($1, $2)', [
      ACCOUNT_A,
      ACCOUNT_B
    ]);
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_A, ACCOUNT_B]);
  });

  it('executes, exports and audits the persisted purchase-entry contract with tenant/date/search isolation', async () => {
    const reports = new ReportsService({ repository: new DatabaseReportRepository() });
    const audit = new AuditService({
      auditRepository: new DatabaseAuditRepository(getDatabaseClient())
    });
    const response = new MockResponse();
    const executionCorrelationId = `inventory-purchase-report-execute-${randomUUID()}`;
    const routeHandlers = {
      reports,
      inventory,
      procurement,
      audit,
      requirePrincipal: () => principal(ACCOUNT_A)
    };

    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        correlationId: executionCorrelationId
      },
      () =>
        handleReportsRoutes(
          '/reports/executions',
          request({
            reportId: 'inventory-invoices',
            filters: {
              search: ' nf-a ',
              dateFrom: '2026-05-01',
              dateTo: '2026-05-31'
            }
          }),
          response as never,
          executionCorrelationId,
          routeHandlers as never
        )
    );

    expect(response.statusCode).toBe(201);
    const execution = response.bodyJson<{
      id: string;
      reportId: string;
      rowCount: number;
      rows: Array<Record<string, unknown>>;
    }>();
    expect(execution.reportId).toBe('inventory-invoices');
    expect(execution.rowCount).toBe(2);
    expect(Object.keys(execution.rows[0] ?? {})).toEqual(EXPECTED_PURCHASE_FIELDS);
    expect(execution.rows.map((row) => row.purchaseId)).toEqual([PURCHASE_A_NEW, PURCHASE_A_OLD]);
    expect(execution.rows.every((row) => String(row.invoiceNumber).trim().length > 0)).toBe(true);
    expect(execution.rows).toEqual([
      {
        purchaseId: PURCHASE_A_NEW,
        invoiceNumber: 'NF-A-NEW',
        supplierName: 'Fornecedor A',
        status: 'received',
        totalAmount: 200,
        receivedAmount: 200,
        payableId: 'payable-a-new',
        createdByUserId: REPORT_USER_ID,
        approvedByUserId: 'manager-a',
        createdAt: '2026-05-31T23:59:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
        receivedAt: '2026-06-01T00:00:00.000Z'
      },
      {
        purchaseId: PURCHASE_A_OLD,
        invoiceNumber: 'NF-A-OLD',
        supplierName: 'Fornecedor A',
        status: 'approved',
        totalAmount: 125,
        receivedAmount: 50,
        payableId: 'payable-a-old',
        createdByUserId: REPORT_USER_ID,
        approvedByUserId: 'manager-a',
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: '2026-05-02T10:00:00.000Z',
        receivedAt: null
      }
    ]);

    const receivedRows = await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        correlationId: `inventory-purchase-report-status-${randomUUID()}`
      },
      () => procurement.listPersistedPurchaseReportRows(ACCOUNT_A, { status: 'received' })
    );
    expect(receivedRows.map((row) => row.purchaseId)).toEqual([PURCHASE_A_NEW]);
    expect(receivedRows[0]?.invoiceNumber).toBe('NF-A-NEW');

    const exportResponse = new MockResponse();
    const exportCorrelationId = `inventory-purchase-report-export-${randomUUID()}`;
    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        correlationId: exportCorrelationId
      },
      () =>
        handleReportsRoutes(
          `/reports/executions/${execution.id}/export`,
          request({ format: 'csv' }),
          exportResponse as never,
          exportCorrelationId,
          routeHandlers as never
        )
    );

    expect(exportResponse.statusCode).toBe(200);
    const exported = exportResponse.bodyJson<{ format: string; content: string }>();
    expect(exported.format).toBe('csv');
    expect(exported.content).toContain('NF-A-NEW');
    expect(exported.content).toContain('NF-A-OLD');
    expect(exported.content).not.toContain('NF-B-001');
    expect(exported.content).not.toContain('PURCHASE_A_BLANK');

    const persistedExecution = await pool.query<{
      account_id: string;
      report_id: string;
      row_count: number;
      rows: Array<Record<string, unknown>>;
    }>(
      `SELECT account_id, report_id, row_count, rows
         FROM report_executions
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_A, execution.id]
    );
    expect(persistedExecution.rows[0]).toMatchObject({
      account_id: ACCOUNT_A,
      report_id: 'inventory-invoices',
      row_count: 2
    });
    expect(persistedExecution.rows[0]?.rows).toEqual(execution.rows);

    const auditRows = await pool.query<{
      action: string;
      entity_type: string;
      account_id: string;
      correlation_id: string;
    }>(
      `SELECT action, entity_type, account_id, correlation_id
         FROM audit_events
        WHERE account_id = $1
          AND correlation_id IN ($2, $3)
        ORDER BY action`,
      [ACCOUNT_A, executionCorrelationId, exportCorrelationId]
    );
    expect(auditRows.rows).toEqual([
      {
        action: 'execute_report',
        entity_type: 'report-execution',
        account_id: ACCOUNT_A,
        correlation_id: executionCorrelationId
      },
      {
        action: 'export_report',
        entity_type: 'report-export',
        account_id: ACCOUNT_A,
        correlation_id: exportCorrelationId
      }
    ]);
  });

  it('executes, exports and audits the exact current-stock contract with tenant/date/search isolation', async () => {
    const reports = new ReportsService({ repository: new DatabaseReportRepository() });
    const audit = new AuditService({
      auditRepository: new DatabaseAuditRepository(getDatabaseClient())
    });
    const response = new MockResponse();
    const executionCorrelationId = `inventory-stock-report-execute-${randomUUID()}`;
    const routeHandlers = {
      reports,
      inventory,
      audit,
      requirePrincipal: () => principal(ACCOUNT_A)
    };

    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        correlationId: `inventory-stock-report-${randomUUID()}`
      },
      () =>
        handleReportsRoutes(
          '/reports/executions',
          request({
            reportId: 'inventory-stock',
            filters: {
              search: ' stock-a ',
              dateFrom: '2026-05-01',
              dateTo: '2026-05-31'
            }
          }),
          response as never,
          executionCorrelationId,
          routeHandlers as never
        )
    );

    expect(response.statusCode).toBe(201);
    const execution = response.bodyJson<{
      reportId: string;
      rowCount: number;
      rows: Array<Record<string, unknown>>;
    }>();
    expect(execution.reportId).toBe('inventory-stock');
    expect(execution.rowCount).toBe(2);
    expect(Object.keys(execution.rows[0] ?? {})).toEqual(EXPECTED_FIELDS);
    expect(execution.rows).toEqual([
      {
        sku: 'STOCK-A-001',
        name: 'Alpha Stock',
        unit: 'un',
        onHandQuantity: 4,
        reorderLevel: 5,
        unitCostAmount: 12.5,
        stockValue: 50,
        reorderStatus: 'below_reorder_level',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z'
      },
      {
        sku: 'STOCK-A-002',
        name: 'Zeta Stock',
        unit: 'un',
        onHandQuantity: 20,
        reorderLevel: 3,
        unitCostAmount: 40,
        stockValue: 800,
        reorderStatus: 'adequate',
        createdAt: '2026-05-31T23:59:59.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z'
      }
    ]);
    expect(execution.rows.every((row) => !String(row.sku).includes('STOCK-B'))).toBe(true);

    const exportResponse = new MockResponse();
    const exportCorrelationId = `inventory-stock-report-export-${randomUUID()}`;
    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        correlationId: exportCorrelationId
      },
      () =>
        handleReportsRoutes(
          `/reports/executions/${execution.id}/export`,
          request({ format: 'csv' }),
          exportResponse as never,
          exportCorrelationId,
          routeHandlers as never
        )
    );
    expect(exportResponse.statusCode).toBe(200);
    const exported = exportResponse.bodyJson<{ format: string; content: string }>();
    expect(exported.format).toBe('csv');
    expect(exported.content).toContain('STOCK-A-001');
    expect(exported.content).toContain('STOCK-A-002');

    const auditRows = await pool.query<{
      action: string;
      entity_type: string;
      account_id: string;
      correlation_id: string;
    }>(
      `SELECT action, entity_type, account_id, correlation_id
         FROM audit_events
        WHERE account_id = $1
          AND correlation_id IN ($2, $3)
        ORDER BY action`,
      [ACCOUNT_A, executionCorrelationId, exportCorrelationId]
    );
    expect(auditRows.rows).toEqual([
      {
        action: 'execute_report',
        entity_type: 'report-execution',
        account_id: ACCOUNT_A,
        correlation_id: executionCorrelationId
      },
      {
        action: 'export_report',
        entity_type: 'report-export',
        account_id: ACCOUNT_A,
        correlation_id: exportCorrelationId
      }
    ]);
  });

  it('executes and exports the raw movement ledger with item enrichment and account/date isolation', async () => {
    const reports = new ReportsService({ repository: new DatabaseReportRepository() });
    const audit = new AuditService({
      auditRepository: new DatabaseAuditRepository(getDatabaseClient())
    });
    const response = new MockResponse();
    const executionCorrelationId = `inventory-movement-report-execute-${randomUUID()}`;
    const routeHandlers = {
      reports,
      inventory,
      audit,
      requirePrincipal: () => principal(ACCOUNT_A)
    };

    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        correlationId: `inventory-movement-report-${randomUUID()}`
      },
      () =>
        handleReportsRoutes(
          '/reports/executions',
          request({
            reportId: 'inventory-movements',
            filters: {
              search: ' stock-a ',
              dateFrom: '2026-05-01',
              dateTo: '2026-05-31'
            }
          }),
          response as never,
          executionCorrelationId,
          routeHandlers as never
        )
    );

    expect(response.statusCode).toBe(201);
    const execution = response.bodyJson<{
      id: string;
      reportId: string;
      rowCount: number;
      rows: Array<Record<string, unknown>>;
    }>();
    expect(execution.reportId).toBe('inventory-movements');
    expect(execution.rowCount).toBe(2);
    expect(Object.keys(execution.rows[0] ?? {})).toEqual(EXPECTED_MOVEMENT_FIELDS);
    expect(execution.rows).toEqual([
      {
        movementId: MOVEMENT_A_CONSUMPTION,
        occurredAt: '2026-05-31T23:00:00.000Z',
        movementType: 'consumption',
        sku: 'STOCK-A-001',
        name: 'Alpha Stock',
        unit: 'un',
        quantityDelta: -2,
        balanceBefore: 20,
        balanceAfter: 18,
        unitCostAmount: 12.5,
        reason: 'Consumo assistencial',
        reference: 'encounter-a',
        recordedByUserId: 'user-inventory'
      },
      {
        movementId: MOVEMENT_A_INBOUND,
        occurredAt: '2026-05-31T23:00:00.000Z',
        movementType: 'inbound',
        sku: 'STOCK-A-002',
        name: 'Zeta Stock',
        unit: 'un',
        quantityDelta: 10,
        balanceBefore: 0,
        balanceAfter: 10,
        unitCostAmount: 40,
        reason: 'Entrada de compra',
        reference: 'NF-A-001',
        recordedByUserId: 'user-inventory'
      }
    ]);

    const exportResponse = new MockResponse();
    const exportCorrelationId = `inventory-movement-report-export-${randomUUID()}`;
    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        correlationId: exportCorrelationId
      },
      () =>
        handleReportsRoutes(
          `/reports/executions/${execution.id}/export`,
          request({ format: 'csv' }),
          exportResponse as never,
          exportCorrelationId,
          routeHandlers as never
        )
    );
    expect(exportResponse.statusCode).toBe(200);
    const exported = exportResponse.bodyJson<{ format: string; content: string }>();
    expect(exported.format).toBe('csv');
    expect(exported.content).toContain('STOCK-A-001');
    expect(exported.content).toContain('STOCK-A-002');
    expect(exported.content).not.toContain('Foreign Stock');

    const persistedExecution = await pool.query<{
      account_id: string;
      report_id: string;
      row_count: number;
      rows: Array<Record<string, unknown>>;
    }>(
      `SELECT account_id, report_id, row_count, rows
         FROM report_executions
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_A, execution.id]
    );
    expect(persistedExecution.rows).toHaveLength(1);
    expect(persistedExecution.rows[0]).toMatchObject({
      account_id: ACCOUNT_A,
      report_id: 'inventory-movements',
      row_count: 2
    });
    expect(persistedExecution.rows[0]?.rows).toEqual(execution.rows);

    const persistedExport = await pool.query<{
      account_id: string;
      execution_id: string;
      format: string;
      content: string;
    }>(
      `SELECT account_id, execution_id, format, content
         FROM report_exports
        WHERE account_id = $1 AND execution_id = $2`,
      [ACCOUNT_A, execution.id]
    );
    expect(persistedExport.rows).toHaveLength(1);
    expect(persistedExport.rows[0]).toMatchObject({
      account_id: ACCOUNT_A,
      execution_id: execution.id,
      format: 'csv'
    });
    expect(persistedExport.rows[0]?.content).toContain('STOCK-A-001');

    const auditRows = await pool.query<{
      action: string;
      entity_type: string;
      account_id: string;
      correlation_id: string;
    }>(
      `SELECT action, entity_type, account_id, correlation_id
         FROM audit_events
        WHERE account_id = $1
          AND correlation_id IN ($2, $3)
        ORDER BY action`,
      [ACCOUNT_A, executionCorrelationId, exportCorrelationId]
    );
    expect(auditRows.rows).toEqual([
      {
        action: 'execute_report',
        entity_type: 'report-execution',
        account_id: ACCOUNT_A,
        correlation_id: executionCorrelationId
      },
      {
        action: 'export_report',
        entity_type: 'report-export',
        account_id: ACCOUNT_A,
        correlation_id: exportCorrelationId
      }
    ]);
  });

  it('rejects the real 10001-row persisted source before creating an execution', async () => {
    const overflowPrefix = `OVR${randomUUID().slice(0, 8)}`;
    await pool.query(
      `INSERT INTO inventory_items (
         id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
         unit_cost_amount, created_at, updated_at
       )
       SELECT 'inventory-stock-overflow-' || $1 || '-' || sequence::text,
              $2,
              $1 || '-' || lpad(sequence::text, 5, '0'),
              'Overflow Stock ' || lpad(sequence::text, 5, '0'),
              'un', 1, 1, 1,
              '2026-05-15T00:00:00.000Z',
              '2026-05-15T00:00:00.000Z'
         FROM generate_series(1, 10001) AS generated(sequence)`,
      [overflowPrefix, ACCOUNT_A]
    );

    try {
      const reports = new ReportsService();
      const response = new MockResponse();
      await expect(
        runWithTenantContext(
          {
            tenantId: TENANT_ID,
            accountId: ACCOUNT_A,
            correlationId: `inventory-stock-report-overflow-${randomUUID()}`
          },
          () =>
            handleReportsRoutes(
              '/reports/executions',
              request({ reportId: 'inventory-stock', filters: { search: overflowPrefix } }),
              response as never,
              `inventory-stock-report-overflow-${randomUUID()}`,
              {
                reports,
                inventory,
                audit: new AuditService(),
                requirePrincipal: () => principal(ACCOUNT_A)
              } as never
            )
        )
      ).rejects.toThrow('Report contains too many rows');
      expect(reports.listExecutions(ACCOUNT_A)).toEqual([]);
    } finally {
      await pool.query('DELETE FROM inventory_items WHERE account_id = $1 AND sku LIKE $2', [
        ACCOUNT_A,
        `${overflowPrefix}%`
      ]);
    }
  });

  it('rejects the real 10001-row persisted movement source before creating an execution', async () => {
    const overflowPrefix = `MOVOVR${randomUUID().slice(0, 8)}`;
    const overflowItemId = `inventory-movement-overflow-item-${randomUUID()}`;
    const before = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM report_executions
        WHERE account_id = $1 AND report_id = 'inventory-movements'`,
      [ACCOUNT_A]
    );
    await pool.query(
      `INSERT INTO inventory_items (
         id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
         unit_cost_amount, created_at, updated_at
       ) VALUES ($1, $2, $3, 'Movement overflow stock', 'un', 10001, 1, 1,
                 '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z')`,
      [overflowItemId, ACCOUNT_A, overflowPrefix]
    );
    await pool.query(
      `INSERT INTO inventory_stock_movements (
         id, account_id, inventory_item_id, movement_type, quantity_delta,
         balance_before, balance_after, unit_cost_amount, reason, reference,
         recorded_by_user_id, created_at
       )
       SELECT 'inventory-movement-overflow-' || $1 || '-' || sequence::text,
              $2, $3, 'inbound', 1, sequence - 1, sequence, 1,
              'Overflow movement', NULL, 'user-inventory',
              '2026-07-01T00:00:00.000Z'
         FROM generate_series(1, 10001) AS generated(sequence)`,
      [overflowPrefix, ACCOUNT_A, overflowItemId]
    );

    try {
      const reports = new ReportsService({ repository: new DatabaseReportRepository() });
      const response = new MockResponse();
      await expect(
        runWithTenantContext(
          {
            tenantId: TENANT_ID,
            accountId: ACCOUNT_A,
            correlationId: `inventory-movement-report-overflow-${randomUUID()}`
          },
          () =>
            handleReportsRoutes(
              '/reports/executions',
              request({ reportId: 'inventory-movements', filters: { search: overflowPrefix } }),
              response as never,
              `inventory-movement-report-overflow-${randomUUID()}`,
              {
                reports,
                inventory,
                audit: new AuditService(),
                requirePrincipal: () => principal(ACCOUNT_A)
              } as never
            )
        )
      ).rejects.toThrow('Report contains too many rows');
      expect(reports.listExecutions(ACCOUNT_A)).toEqual([]);
      const after = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM report_executions
          WHERE account_id = $1 AND report_id = 'inventory-movements'`,
        [ACCOUNT_A]
      );
      expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
    } finally {
      await pool.query(
        'DELETE FROM inventory_stock_movements WHERE account_id = $1 AND id LIKE $2',
        [ACCOUNT_A, `inventory-movement-overflow-${overflowPrefix}%`]
      );
      await pool.query('DELETE FROM inventory_items WHERE id = $1 AND account_id = $2', [
        overflowItemId,
        ACCOUNT_A
      ]);
    }
  });
});

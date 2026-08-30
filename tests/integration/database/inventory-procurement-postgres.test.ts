import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DatabaseInventoryRepository,
  InventoryService
} from '../../../packages/modules/inventory/src/index.js';
import {
  DatabaseProcurementRepository,
  ProcurementService
} from '../../../packages/modules/inventory/src/procurement.js';
import {
  createDatabaseClient,
  getPool,
  runInTenantTransactionContext
} from '../../../packages/shared/database/src/index.js';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID() as AccountId;
const FOREIGN_ACCOUNT_ID = randomUUID() as AccountId;
const USER_ID = randomUUID() as UserId;
const ITEM_ID = `proc-item-${randomUUID()}`;
const LOT_ID = `proc-lot-${randomUUID()}`;
const SECOND_ITEM_ID = `proc-item-second-${randomUUID()}`;
const SECOND_LOT_ID = `proc-lot-second-${randomUUID()}`;
const NOW = '2026-08-24T12:00:00.000Z';

describe('inventory procurement persistence on PostgreSQL', () => {
  const pool = getTestPool();
  let procurement: ProcurementService;
  let inventory: InventoryService;

  async function command<T>(operation: () => Promise<T> | T): Promise<T> {
    const correlationId = `inventory-procurement-${randomUUID()}`;
    return runWithTenantContext({ tenantId: TENANT_ID, accountId: ACCOUNT_ID, correlationId }, () =>
      runInTenantTransactionContext(
        getPool(),
        { accountId: ACCOUNT_ID, actorUserId: USER_ID, correlationId },
        async () => operation()
      )
    );
  }

  async function hydrateIndependentProcurement(): Promise<ProcurementService> {
    const isolatedInventory = new InventoryService({ getOrThrow() {} } as never, [], {
      repository: new DatabaseInventoryRepository()
    });
    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_ID,
        correlationId: `inventory-race-hydrate-${randomUUID()}`
      },
      () => isolatedInventory.hydrateFromDatabase(ACCOUNT_ID)
    );
    const isolatedProcurement = new ProcurementService(isolatedInventory, {
      repository: new DatabaseProcurementRepository()
    });
    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_ID,
        correlationId: `procurement-race-hydrate-${randomUUID()}`
      },
      () => isolatedProcurement.hydrateFromDatabase(ACCOUNT_ID)
    );
    return isolatedProcurement;
  }

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Inventory procurement tenant', 'active', now())`,
      [TENANT_ID, `inventory-procurement-${TENANT_ID.toString().slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Inventory procurement account', true),
              ($4, $2, $5, 'Foreign inventory procurement account', true)`,
      [
        ACCOUNT_ID,
        TENANT_ID,
        `inventory-procurement-${ACCOUNT_ID.toString().slice(0, 12)}`,
        FOREIGN_ACCOUNT_ID,
        `inventory-procurement-f-${FOREIGN_ACCOUNT_ID.toString().slice(0, 10)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Inventory procurement operator')`,
      [USER_ID, ACCOUNT_ID, `inventory-${USER_ID}`, `inventory-${USER_ID}@example.test`]
    );
    await pool.query(
      `INSERT INTO inventory_items (
         id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
         unit_cost_amount, created_at, updated_at
       ) VALUES ($1, $2, 'PROC-001', 'Produto de procurement', 'un', 10, 1, 5, $3, $3),
              ($4, $2, 'PROC-002', 'Produto de procurement dois', 'un', 20, 1, 7, $3, $3)`,
      [ITEM_ID, ACCOUNT_ID, NOW, SECOND_ITEM_ID]
    );
    await pool.query(
      `INSERT INTO inventory_lots (
         id, account_id, inventory_item_id, lot_number, quantity, reserved_quantity,
         unit, location, supplier, manufacture_date, expiry_date, status, created_at, updated_at
       ) VALUES ($1, $2, $3, 'LOT-INITIAL', 10, 0, 'un', 'Deposito A', 'Fornecedor inicial',
                 $4, $5, 'active', $6, $6),
                ($7, $2, $8, 'LOT-INITIAL-02', 20, 0, 'un', 'Deposito A', 'Fornecedor inicial',
                 $4, $5, 'active', $6, $6)`,
      [
        LOT_ID,
        ACCOUNT_ID,
        ITEM_ID,
        '2026-01-01T00:00:00.000Z',
        '2027-01-01T00:00:00.000Z',
        NOW,
        SECOND_LOT_ID,
        SECOND_ITEM_ID
      ]
    );

    const inventoryRepository = new DatabaseInventoryRepository();
    inventory = new InventoryService({ getOrThrow() {} } as never, [], {
      repository: inventoryRepository
    });
    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_ID,
        correlationId: `inventory-hydrate-${randomUUID()}`
      },
      () => inventory.hydrateFromDatabase(ACCOUNT_ID)
    );
    procurement = new ProcurementService(inventory, {
      repository: new DatabaseProcurementRepository()
    });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_ID, FOREIGN_ACCOUNT_ID]);
  });

  it('persists the purchase document, partial receipt, lot/expiry, balance, transfer and RLS scope', async () => {
    const created = await command(() =>
      procurement.createPurchase(ACCOUNT_ID, USER_ID, {
        supplierName: 'Fornecedor homologado',
        invoiceNumber: 'NF-PROC-001',
        lines: [
          {
            inventoryItemId: ITEM_ID,
            quantity: 4,
            unitCostAmount: 8.5,
            lotNumber: 'LOT-RECEIVED',
            expiryDate: '2027-12-31T00:00:00.000Z',
            manufactureDate: '2026-08-01T00:00:00.000Z',
            location: 'Deposito A'
          }
        ]
      })
    );
    expect(created.status).toBe('draft');
    expect(created.totalAmount).toBe(34);

    const approved = await command(() =>
      procurement.approvePurchase(ACCOUNT_ID, USER_ID, created.id)
    );
    expect(approved.status).toBe('approved');

    const partial = await command(() =>
      procurement.receivePurchase(ACCOUNT_ID, USER_ID, approved.id, {
        lines: [{ lineId: approved.lines[0]!.id, quantity: 2 }]
      })
    );
    expect(partial.status).toBe('partially_received');
    expect(partial.lines[0]?.receivedQuantity).toBe(2);
    expect(partial.receivedAmount).toBe(17);

    const received = await command(() =>
      procurement.receivePurchase(ACCOUNT_ID, USER_ID, approved.id, {
        lines: [{ lineId: approved.lines[0]!.id, quantity: 2 }]
      })
    );
    expect(received.status).toBe('received');
    expect(received.lines[0]?.receivedQuantity).toBe(4);
    expect(received.receivedAmount).toBe(34);

    const transfer = await command(() =>
      procurement.createTransfer(ACCOUNT_ID, USER_ID, {
        inventoryItemId: ITEM_ID,
        quantity: 3,
        fromLocation: 'Deposito A',
        toLocation: 'Farmacia B',
        reference: 'TR-PROC-001'
      })
    );
    expect(transfer.status).toBe('completed');

    const purchaseState = await pool.query(
      `SELECT p.status, p.invoice_number, p.total_amount, p.received_amount,
              l.received_quantity, l.lot_number, l.expiry_date
         FROM inventory_purchases p
         JOIN inventory_purchase_lines l ON l.account_id = p.account_id AND l.purchase_id = p.id
        WHERE p.account_id = $1 AND p.id = $2`,
      [ACCOUNT_ID, created.id]
    );
    expect(purchaseState.rows).toEqual([
      {
        status: 'received',
        invoice_number: 'NF-PROC-001',
        total_amount: '34.00',
        received_amount: '34.00',
        received_quantity: '4.00',
        lot_number: 'LOT-RECEIVED',
        expiry_date: new Date('2027-12-31T00:00:00.000Z')
      }
    ]);

    const stockState = await pool.query(
      `SELECT i.on_hand_quantity, i.unit_cost_amount,
              (SELECT COUNT(*)::int FROM inventory_stock_movements m
                WHERE m.account_id = i.account_id AND m.inventory_item_id = i.id) AS movement_count,
              (SELECT COUNT(*)::int FROM inventory_lots l
                WHERE l.account_id = i.account_id AND l.inventory_item_id = i.id) AS lot_count,
              (SELECT COALESCE(SUM(l.quantity) FILTER (WHERE l.location = 'Farmacia B'), 0)
                 FROM inventory_lots l
                WHERE l.account_id = i.account_id AND l.inventory_item_id = i.id) AS destination_quantity
         FROM inventory_items i
        WHERE i.account_id = $1 AND i.id = $2`,
      [ACCOUNT_ID, ITEM_ID]
    );
    expect(stockState.rows).toEqual([
      {
        on_hand_quantity: '14.00',
        unit_cost_amount: '6.00',
        movement_count: 4,
        lot_count: 3,
        destination_quantity: '3.00'
      }
    ]);

    const transferState = await pool.query(
      `SELECT quantity, from_location, to_location, status, reference
         FROM inventory_transfers
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_ID, transfer.id]
    );
    expect(transferState.rows).toEqual([
      {
        quantity: '3.00',
        from_location: 'Deposito A',
        to_location: 'Farmacia B',
        status: 'completed',
        reference: 'TR-PROC-001'
      }
    ]);

    const foreignCorrelationId = `inventory-foreign-${randomUUID()}`;
    const foreignPurchases = await runWithTenantContext(
      { tenantId: TENANT_ID, accountId: FOREIGN_ACCOUNT_ID, correlationId: foreignCorrelationId },
      () => new DatabaseProcurementRepository().findPurchases(FOREIGN_ACCOUNT_ID)
    );
    expect(foreignPurchases).toEqual([]);
  });

  it('linearizes concurrent receives of different purchase lines', async () => {
    const created = await command(() =>
      procurement.createPurchase(ACCOUNT_ID, USER_ID, {
        supplierName: 'Fornecedor concorrente',
        invoiceNumber: 'NF-PROC-RACE',
        lines: [
          {
            inventoryItemId: ITEM_ID,
            quantity: 1,
            unitCostAmount: 11,
            lotNumber: 'LOT-RACE-01'
          },
          {
            inventoryItemId: SECOND_ITEM_ID,
            quantity: 1,
            unitCostAmount: 14,
            lotNumber: 'LOT-RACE-02'
          }
        ]
      })
    );
    const approved = await command(() =>
      procurement.approvePurchase(ACCOUNT_ID, USER_ID, created.id)
    );
    const firstProcurement = await hydrateIndependentProcurement();
    const secondProcurement = await hydrateIndependentProcurement();
    const [firstLine, secondLine] = approved.lines;
    assert.ok(firstLine);
    assert.ok(secondLine);

    const outcomes = await Promise.allSettled([
      command(() =>
        firstProcurement.receivePurchase(ACCOUNT_ID, USER_ID, approved.id, {
          lines: [{ lineId: firstLine.id, quantity: 1 }]
        })
      ),
      command(() =>
        secondProcurement.receivePurchase(ACCOUNT_ID, USER_ID, approved.id, {
          lines: [{ lineId: secondLine.id, quantity: 1 }]
        })
      )
    ]);
    assert.deepEqual(
      outcomes.map((outcome) => outcome.status),
      ['fulfilled', 'fulfilled']
    );

    const purchaseState = await pool.query(
      `SELECT p.status, p.received_amount, l.inventory_item_id, l.received_quantity
         FROM inventory_purchases p
         JOIN inventory_purchase_lines l ON l.account_id = p.account_id AND l.purchase_id = p.id
        WHERE p.account_id = $1 AND p.id = $2
        ORDER BY l.inventory_item_id`,
      [ACCOUNT_ID, approved.id]
    );
    assert.deepEqual(purchaseState.rows, [
      {
        status: 'received',
        received_amount: '25.00',
        inventory_item_id: ITEM_ID,
        received_quantity: '1.00'
      },
      {
        status: 'received',
        received_amount: '25.00',
        inventory_item_id: SECOND_ITEM_ID,
        received_quantity: '1.00'
      }
    ]);

    const movementState = await pool.query(
      `SELECT inventory_item_id, quantity_delta
         FROM inventory_stock_movements
        WHERE account_id = $1 AND reference = $2
        ORDER BY inventory_item_id`,
      [ACCOUNT_ID, 'NF-PROC-RACE']
    );
    assert.deepEqual(movementState.rows, [
      { inventory_item_id: ITEM_ID, quantity_delta: '1.00' },
      { inventory_item_id: SECOND_ITEM_ID, quantity_delta: '1.00' }
    ]);
  });

  it('rejects a concurrent same-line over-receipt without a second movement', async () => {
    const created = await command(() =>
      procurement.createPurchase(ACCOUNT_ID, USER_ID, {
        supplierName: 'Fornecedor over-receipt',
        invoiceNumber: 'NF-PROC-SAME-LINE',
        lines: [
          {
            inventoryItemId: ITEM_ID,
            quantity: 1,
            unitCostAmount: 13,
            lotNumber: 'LOT-SAME-LINE'
          }
        ]
      })
    );
    const approved = await command(() =>
      procurement.approvePurchase(ACCOUNT_ID, USER_ID, created.id)
    );
    const isolatedFirst = await hydrateIndependentProcurement();
    const isolatedSecond = await hydrateIndependentProcurement();
    const line = approved.lines[0];
    assert.ok(line);

    const outcomes = await Promise.allSettled([
      command(() =>
        isolatedFirst.receivePurchase(ACCOUNT_ID, USER_ID, approved.id, {
          lines: [{ lineId: line.id, quantity: 1 }]
        })
      ),
      command(() =>
        isolatedSecond.receivePurchase(ACCOUNT_ID, USER_ID, approved.id, {
          lines: [{ lineId: line.id, quantity: 1 }]
        })
      )
    ]);
    assert.deepEqual(outcomes.map((outcome) => outcome.status).sort(), ['fulfilled', 'rejected']);

    const purchaseState = await pool.query(
      `SELECT p.status, p.received_amount, l.received_quantity
         FROM inventory_purchases p
         JOIN inventory_purchase_lines l ON l.account_id = p.account_id AND l.purchase_id = p.id
        WHERE p.account_id = $1 AND p.id = $2`,
      [ACCOUNT_ID, approved.id]
    );
    assert.deepEqual(purchaseState.rows, [
      { status: 'received', received_amount: '13.00', received_quantity: '1.00' }
    ]);

    const movementState = await pool.query(
      `SELECT inventory_item_id, quantity_delta
         FROM inventory_stock_movements
        WHERE account_id = $1 AND reference = $2`,
      [ACCOUNT_ID, 'NF-PROC-SAME-LINE']
    );
    assert.deepEqual(movementState.rows, [{ inventory_item_id: ITEM_ID, quantity_delta: '1.00' }]);
  });
});

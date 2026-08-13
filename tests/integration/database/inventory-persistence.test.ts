import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';

import {
  DatabaseInventoryRepository,
  InventoryService
} from '../../../packages/modules/inventory/src/index.ts';
import {
  closeDatabaseClient,
  createDatabaseClient
} from '../../../packages/shared/database/src/index.ts';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.ts';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.ts';
import { TEST_DB_URL } from '../../setup/env.ts';

const tenantId = randomUUID();
const accountA = randomUUID() as AccountId;
const accountB = randomUUID() as AccountId;
const userA = randomUUID() as UserId;
const userB = randomUUID() as UserId;
const ownerA = randomUUID();
const ownerB = randomUUID();
const patientA = randomUUID();
const patientB = randomUUID();
const encounterA = randomUUID();
const encounterB = randomUUID();
const ledgerFailureActor = 'inventory-ledger-failure' as UserId;

function inAccount<T>(accountId: AccountId, userId: UserId, operation: () => T): T {
  return runWithTenantContext(
    {
      tenantId,
      accountId,
      userId,
      correlationId: `inventory-persistence-${randomUUID()}`
    },
    operation
  );
}

function createService(repository: DatabaseInventoryRepository): InventoryService {
  return new InventoryService(
    {
      getOrThrow(encounterId: string) {
        if (encounterId === encounterA) {
          return { id: encounterA, accountId: accountA, patientId: patientA };
        }
        if (encounterId === encounterB) {
          return { id: encounterB, accountId: accountB, patientId: patientB };
        }
        throw new Error('Encounter not found');
      }
    } as never,
    [],
    { repository }
  );
}

async function createItem(
  service: InventoryService,
  accountId: AccountId,
  userId: UserId,
  sku: string,
  onHandQuantity = 10
) {
  return inAccount(accountId, userId, () =>
    service.createItem(accountId, userId, {
      sku,
      name: `${sku} item`,
      unit: 'unit',
      onHandQuantity,
      reorderLevel: 2,
      unitCostAmount: 4.5
    })
  );
}

describe('inventory PostgreSQL isolation and atomic persistence', () => {
  const admin = new Pool({ connectionString: TEST_DB_URL, max: 2 });
  const repository = new DatabaseInventoryRepository();

  beforeAll(async () => {
    await closeDatabaseClient();
    await admin.query(
      `INSERT INTO tenants (id, slug, name, status)
       VALUES ($1, $2, 'Inventory persistence tenant', 'active')`,
      [tenantId, `inventory-persistence-${process.pid}`]
    );
    await admin.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $3, $4, 'Inventory account A'),
              ($2, $3, $5, 'Inventory account B')`,
      [accountA, accountB, tenantId, `inventory-a-${process.pid}`, `inventory-b-${process.pid}`]
    );
    await admin.query(
      `INSERT INTO users (id, account_id, email, password_hash, full_name)
       VALUES ($1, $3, $5, 'hash', 'Inventory User A'),
              ($2, $4, $6, 'hash', 'Inventory User B')`,
      [
        userA,
        userB,
        accountA,
        accountB,
        `inventory-a-${process.pid}@example.test`,
        `inventory-b-${process.pid}@example.test`
      ]
    );
    await admin.query(
      `INSERT INTO owners (id, account_id, full_name)
       VALUES ($1, $3, 'Inventory Owner A'),
              ($2, $4, 'Inventory Owner B')`,
      [ownerA, ownerB, accountA, accountB]
    );
    await admin.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species)
       VALUES ($1, $3, $5, 'Inventory Patient A', 'canine'),
              ($2, $4, $6, 'Inventory Patient B', 'feline')`,
      [patientA, patientB, accountA, accountB, ownerA, ownerB]
    );
    await admin.query(
      `INSERT INTO encounters (id, account_id, patient_id, owner_id, opened_by_user_id, reason)
       VALUES ($1, $3, $5, $7, $9, 'Inventory encounter A'),
              ($2, $4, $6, $8, $10, 'Inventory encounter B')`,
      [encounterA, encounterB, accountA, accountB, patientA, patientB, ownerA, ownerB, userA, userB]
    );
    await admin.query(`
      CREATE OR REPLACE FUNCTION inventory_test_reject_ledger()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.recorded_by_user_id = 'inventory-ledger-failure' THEN
          RAISE EXCEPTION 'forced inventory ledger failure';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await admin.query(`
      CREATE TRIGGER inventory_test_reject_ledger_trigger
      BEFORE INSERT ON inventory_stock_movements
      FOR EACH ROW EXECUTE FUNCTION inventory_test_reject_ledger()
    `);
    createDatabaseClient(TEST_DB_URL);
  });

  afterAll(async () => {
    await closeDatabaseClient();
    await admin.query(
      'DROP TRIGGER IF EXISTS inventory_test_reject_ledger_trigger ON inventory_stock_movements'
    );
    await admin.query('DROP FUNCTION IF EXISTS inventory_test_reject_ledger()');
    await admin.query('DELETE FROM inventory_stock_movements WHERE account_id = ANY($1::text[])', [
      [accountA, accountB]
    ]);
    await admin.query('DELETE FROM inventory_consumptions WHERE account_id = ANY($1::uuid[])', [
      [accountA, accountB]
    ]);
    await admin.query('DELETE FROM inventory_items WHERE account_id = ANY($1::uuid[])', [
      [accountA, accountB]
    ]);
    await admin.query('DELETE FROM encounters WHERE account_id = ANY($1::uuid[])', [
      [accountA, accountB]
    ]);
    await admin.query('DELETE FROM patients WHERE account_id = ANY($1::uuid[])', [
      [accountA, accountB]
    ]);
    await admin.query('DELETE FROM owners WHERE account_id = ANY($1::uuid[])', [
      [accountA, accountB]
    ]);
    await admin.query('DELETE FROM users WHERE account_id = ANY($1::uuid[])', [
      [accountA, accountB]
    ]);
    await admin.query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [[accountA, accountB]]);
    await admin.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await admin.end();
  });

  it('never resolves or mutates an item through another account', async () => {
    const service = createService(repository);
    const itemA = await createItem(service, accountA, userA, `TENANT-A-${randomUUID()}`);
    const itemB = await createItem(service, accountB, userB, `TENANT-B-${randomUUID()}`);

    expect(() => service.getItemOrThrow(accountA, itemB.id)).toThrow('Inventory item not found');
    await expect(
      inAccount(accountA, userA, () =>
        service.updateItem(accountA, userA, itemB.id, { name: 'Cross-tenant update' })
      )
    ).rejects.toThrow('Inventory item not found');
    await expect(
      inAccount(accountA, userA, () =>
        service.consume(accountA, userA, {
          encounterId: encounterA,
          inventoryItemId: itemB.id,
          quantity: 1,
          sourceEntityType: 'encounter'
        })
      )
    ).rejects.toThrow('Inventory item not found');
    await expect(
      inAccount(accountA, userA, () =>
        service.createStockAdjustment(accountA, userA, {
          inventoryItemId: itemB.id,
          quantityDelta: 1,
          reason: 'Cross-tenant adjustment'
        })
      )
    ).rejects.toThrow('Inventory item not found');
    await expect(
      inAccount(accountA, userA, () =>
        repository.updateItem({
          accountId: accountA,
          inventoryItemId: itemB.id,
          update: { name: 'Repository cross-tenant update' },
          updatedAt: new Date().toISOString(),
          movementId: `stockmov_${randomUUID()}` as never,
          recordedByUserId: userA,
          reason: 'Repository cross-tenant update'
        })
      )
    ).rejects.toThrow('Inventory item not found');

    expect(service.getItemOrThrow(accountA, itemA.id).accountId).toBe(accountA);
    expect(service.getItemOrThrow(accountB, itemB.id)).toMatchObject({
      name: itemB.name,
      onHandQuantity: 10
    });
  });

  it('persists every accepted update field and survives service restart', async () => {
    const service = createService(repository);
    const item = await createItem(service, accountA, userA, `DURABLE-${randomUUID()}`, 20);

    await inAccount(accountA, userA, () =>
      service.updateItem(accountA, userA, item.id, {
        name: 'Durable updated item',
        unit: 'box',
        onHandQuantity: 18,
        reorderLevel: 5,
        unitCostAmount: 9.75
      })
    );
    await inAccount(accountA, userA, () =>
      service.consume(accountA, userA, {
        encounterId: encounterA,
        inventoryItemId: item.id,
        quantity: 4,
        sourceEntityType: 'encounter',
        sourceEntityId: encounterA
      })
    );
    await inAccount(accountA, userA, () =>
      service.createStockAdjustment(accountA, userA, {
        inventoryItemId: item.id,
        quantityDelta: 3,
        reason: 'Durability adjustment',
        reference: 'DURABLE-ADJUSTMENT'
      })
    );

    const restarted = createService(repository);
    await inAccount(accountA, userA, () => restarted.hydrateFromDatabase(accountA));

    expect(restarted.getItemOrThrow(accountA, item.id)).toMatchObject({
      name: 'Durable updated item',
      unit: 'box',
      onHandQuantity: 17,
      reorderLevel: 5,
      unitCostAmount: 9.75
    });
    expect(restarted.listConsumptionsByAccount(accountA)).toContainEqual(
      expect.objectContaining({ inventoryItemId: item.id, quantity: 4 })
    );
    expect(restarted.listStockMovements(accountA, item.id)).toHaveLength(4);

    const persisted = await admin.query(
      `SELECT name, unit, on_hand_quantity, reorder_level, unit_cost_amount, stock_version
       FROM inventory_items WHERE id = $1 AND account_id = $2`,
      [item.id, accountA]
    );
    expect(persisted.rows[0]).toMatchObject({
      name: 'Durable updated item',
      unit: 'box',
      on_hand_quantity: '17.00',
      reorder_level: '5.00',
      unit_cost_amount: '9.75',
      stock_version: '3'
    });
  });

  it('serializes concurrent consumption without overselling or false ledger rows', async () => {
    const service = createService(repository);
    const item = await createItem(service, accountA, userA, `CONSUME-${randomUUID()}`, 10);

    const results = await inAccount(accountA, userA, () =>
      Promise.allSettled([
        service.consume(accountA, userA, {
          encounterId: encounterA,
          inventoryItemId: item.id,
          quantity: 7,
          sourceEntityType: 'encounter'
        }),
        service.consume(accountA, userA, {
          encounterId: encounterA,
          inventoryItemId: item.id,
          quantity: 7,
          sourceEntityType: 'encounter'
        })
      ])
    );

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(service.getItemOrThrow(accountA, item.id).onHandQuantity).toBe(3);

    const [persisted, consumptions, movements] = await Promise.all([
      admin.query('SELECT on_hand_quantity, stock_version FROM inventory_items WHERE id = $1', [
        item.id
      ]),
      admin.query(
        'SELECT COUNT(*)::int AS count FROM inventory_consumptions WHERE inventory_item_id = $1',
        [item.id]
      ),
      admin.query(
        `SELECT COUNT(*)::int AS count FROM inventory_stock_movements
         WHERE inventory_item_id = $1 AND movement_type = 'consumption'`,
        [item.id]
      )
    ]);
    expect(persisted.rows[0]).toMatchObject({ on_hand_quantity: '3.00', stock_version: '1' });
    expect(consumptions.rows[0]?.count).toBe(1);
    expect(movements.rows[0]?.count).toBe(1);
  });

  it('serializes concurrent negative adjustments without a negative balance', async () => {
    const service = createService(repository);
    const item = await createItem(service, accountA, userA, `ADJUST-${randomUUID()}`, 10);

    const adjust = () =>
      service.createStockAdjustment(accountA, userA, {
        inventoryItemId: item.id,
        quantityDelta: -7,
        reason: 'Concurrent cycle count'
      });
    const results = await inAccount(accountA, userA, () =>
      Promise.allSettled([adjust(), adjust()])
    );

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(service.getItemOrThrow(accountA, item.id).onHandQuantity).toBe(3);

    const [persisted, movements] = await Promise.all([
      admin.query('SELECT on_hand_quantity, stock_version FROM inventory_items WHERE id = $1', [
        item.id
      ]),
      admin.query(
        `SELECT COUNT(*)::int AS count FROM inventory_stock_movements
         WHERE inventory_item_id = $1 AND reason = 'Concurrent cycle count'`,
        [item.id]
      )
    ]);
    expect(persisted.rows[0]).toMatchObject({ on_hand_quantity: '3.00', stock_version: '1' });
    expect(movements.rows[0]?.count).toBe(1);
  });

  it('rolls back the database and preserves memory when a consumption insert fails', async () => {
    const service = createService(repository);
    const item = await createItem(service, accountA, userA, `ROLLBACK-${randomUUID()}`, 10);
    const missingUser = randomUUID() as UserId;

    await expect(
      inAccount(accountA, userA, () =>
        service.consume(accountA, missingUser, {
          encounterId: encounterA,
          inventoryItemId: item.id,
          quantity: 4,
          sourceEntityType: 'encounter'
        })
      )
    ).rejects.toThrow();

    expect(service.getItemOrThrow(accountA, item.id).onHandQuantity).toBe(10);
    const persisted = await admin.query(
      `SELECT on_hand_quantity, stock_version,
              (SELECT COUNT(*)::int FROM inventory_consumptions WHERE inventory_item_id = $1) AS consumptions,
              (SELECT COUNT(*)::int FROM inventory_stock_movements WHERE inventory_item_id = $1) AS movements
       FROM inventory_items WHERE id = $1`,
      [item.id]
    );
    expect(persisted.rows[0]).toMatchObject({
      on_hand_quantity: '10.00',
      stock_version: '0',
      consumptions: 0,
      movements: 1
    });
  });

  it('persists actor-authored initial and edited balances in the ledger across restart', async () => {
    const service = createService(repository);
    const item = await createItem(service, accountA, userA, `LEDGER-${randomUUID()}`, 12);

    await inAccount(accountA, userA, () =>
      service.updateItem(accountA, userA, item.id, { onHandQuantity: 8 })
    );

    const restarted = createService(repository);
    await inAccount(accountA, userA, () => restarted.hydrateFromDatabase(accountA));
    const movements = restarted.listStockMovements(accountA, item.id);
    const initial = movements.find((movement) => movement.movementType === 'inbound');
    const edit = movements.find(
      (movement) => movement.movementType === 'adjustment' && movement.quantityDelta === -4
    );

    expect(initial).toMatchObject({
      quantityDelta: 12,
      balanceBefore: 0,
      balanceAfter: 12,
      recordedByUserId: userA
    });
    expect(edit).toMatchObject({
      quantityDelta: -4,
      balanceBefore: 12,
      balanceAfter: 8,
      recordedByUserId: userA
    });
    expect(restarted.getItemOrThrow(accountA, item.id).onHandQuantity).toBe(8);
  });

  it('rolls back item creation and stock PATCH when ledger insertion fails', async () => {
    const service = createService(repository);
    const failedSku = `LEDGER-FAIL-${randomUUID().slice(0, 8)}`;

    await expect(
      inAccount(accountA, userA, () =>
        service.createItem(accountA, ledgerFailureActor, {
          sku: failedSku,
          name: 'Must roll back',
          unit: 'unit',
          onHandQuantity: 9,
          reorderLevel: 1,
          unitCostAmount: 2
        })
      )
    ).rejects.toThrow('forced inventory ledger failure');
    expect(service.listItems(accountA).some((item) => item.sku === failedSku)).toBe(false);
    const failedCreate = await admin.query(
      'SELECT COUNT(*)::int AS count FROM inventory_items WHERE account_id = $1 AND sku = $2',
      [accountA, failedSku]
    );
    expect(failedCreate.rows[0]?.count).toBe(0);

    const item = await createItem(
      service,
      accountA,
      userA,
      `LEDGER-PATCH-${randomUUID().slice(0, 8)}`
    );
    await expect(
      inAccount(accountA, userA, () =>
        service.updateItem(accountA, ledgerFailureActor, item.id, { onHandQuantity: 4 })
      )
    ).rejects.toThrow('forced inventory ledger failure');

    expect(service.getItemOrThrow(accountA, item.id).onHandQuantity).toBe(10);
    const persisted = await admin.query(
      `SELECT on_hand_quantity, stock_version,
              (SELECT COUNT(*)::int FROM inventory_stock_movements WHERE inventory_item_id = $1) AS movements
       FROM inventory_items WHERE id = $1`,
      [item.id]
    );
    expect(persisted.rows[0]).toMatchObject({
      on_hand_quantity: '10.00',
      stock_version: '0',
      movements: 1
    });
  });
});

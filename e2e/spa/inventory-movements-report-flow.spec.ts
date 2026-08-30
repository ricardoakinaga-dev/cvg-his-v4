import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

import { expect, test } from './fixtures/spa-fixture';

type AuthSessionPayload = {
  readonly principal?: {
    readonly user?: {
      readonly accountId?: string;
    };
  };
};

type SeededInventoryMovements = {
  readonly accountId: string;
  readonly itemIds: readonly string[];
  readonly movementIds: readonly string[];
  readonly search: string;
  readonly firstSku: string;
  readonly secondSku: string;
};

function e2eDatabaseUrl(): string {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('E2E_DATABASE_URL is required for the inventory-movements report test');
  }
  return databaseUrl;
}

async function seedPersistedInventoryMovements(apiCall: {
  get(path: string): Promise<unknown>;
}): Promise<SeededInventoryMovements> {
  const session = (await apiCall.get('/auth/session')) as AuthSessionPayload;
  const accountId = session.principal?.user?.accountId;
  if (!accountId) throw new Error('E2E auth session did not expose an account id');

  const search = `MOV${Date.now()}${randomUUID().slice(0, 6).toUpperCase()}`;
  const firstItemId = `e2e-report-inventory-movement-alpha-${randomUUID()}`;
  const secondItemId = `e2e-report-inventory-movement-zulu-${randomUUID()}`;
  const firstMovementId = `e2e-report-inventory-movement-inbound-${randomUUID()}`;
  const secondMovementId = `e2e-report-inventory-movement-outbound-${randomUUID()}`;
  const firstSku = `${search}-A`;
  const secondSku = `${search}-Z`;
  const pool = new Pool({ connectionString: e2eDatabaseUrl() });

  try {
    await pool.query(
      `INSERT INTO inventory_items (
         id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
         unit_cost_amount, created_at, updated_at
       ) VALUES
         ($1, $2, $3, $4, 'un', 10, 2, 12.50, '2026-05-01T00:00:00.000Z', '2026-05-31T10:00:00.000Z'),
         ($5, $2, $6, $7, 'dose', 8, 2, 40.00, '2026-05-01T00:00:00.000Z', '2026-05-31T10:00:00.000Z')`,
      [
        firstItemId,
        accountId,
        firstSku,
        `Alpha Movimento ${search}`,
        secondItemId,
        secondSku,
        `Zulu Movimento ${search}`
      ]
    );
    await pool.query(
      `INSERT INTO inventory_stock_movements (
         id, account_id, inventory_item_id, movement_type, quantity_delta,
         balance_before, balance_after, unit_cost_amount, reason, reference,
         recorded_by_user_id, created_at
       ) VALUES
         ($1, $2, $3, 'inbound', 10, 0, 10, 12.50, 'Entrada E2E', 'e2e-inbound', 'e2e-report-user', '2026-05-31T23:00:00.000Z'),
         ($4, $2, $5, 'outbound', -2, 10, 8, 40.00, 'Saída E2E', 'e2e-outbound', 'e2e-report-user', '2026-05-31T23:00:00.000Z')`,
      [firstMovementId, accountId, firstItemId, secondMovementId, secondItemId]
    );
  } finally {
    await pool.end();
  }

  return {
    accountId,
    itemIds: [firstItemId, secondItemId],
    movementIds: [firstMovementId, secondMovementId],
    search,
    firstSku,
    secondSku
  };
}

async function removePersistedInventoryMovements(
  movements: SeededInventoryMovements
): Promise<void> {
  const pool = new Pool({ connectionString: e2eDatabaseUrl() });
  try {
    await pool.query(
      'DELETE FROM inventory_stock_movements WHERE account_id = $1 AND id = ANY($2::text[])',
      [movements.accountId, movements.movementIds]
    );
    await pool.query('DELETE FROM inventory_items WHERE account_id = $1 AND id = ANY($2::text[])', [
      movements.accountId,
      movements.itemIds
    ]);
  } finally {
    await pool.end();
  }
}

test.describe('Relatório de movimentações de estoque', () => {
  test.skip(
    process.env.E2E_DATABASE_MODE !== '1',
    'requires the disposable PostgreSQL E2E runtime'
  );

  test('consulta o ledger persistido, preserva campos crus e exporta com auditoria', async ({
    page,
    spaPage,
    apiCall
  }) => {
    const movements = await seedPersistedInventoryMovements(apiCall);
    const inventoryRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/inventory')) inventoryRequests.push(request.url());
    });

    try {
      await spaPage.goto('/reports/inventory-movements');
      await expect(
        page.getByRole('heading', { name: 'Movimentações no Estoque', exact: true })
      ).toBeVisible();
      await expect(page.getByText(movements.firstSku, { exact: true })).toBeVisible();
      await expect(page.getByText(movements.secondSku, { exact: true })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Entrada', exact: true }).first()).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Saída', exact: true }).first()).toBeVisible();

      await page.getByLabel('De', { exact: true }).fill('2026-05-01');
      await page.getByLabel('Até', { exact: true }).fill('2026-05-31');
      await page.getByLabel('Código ou produto', { exact: true }).fill(movements.search);

      const filteredExecutionResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/reports/executions') &&
          response.request().method() === 'POST'
      );
      const filteredExecutionRequest = page.waitForRequest(
        (request) =>
          request.url().endsWith('/api/reports/executions') && request.method() === 'POST'
      );
      await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
      const [filteredExecution, filteredRequest] = await Promise.all([
        (await filteredExecutionResponse).json(),
        filteredExecutionRequest
      ]);

      expect(filteredRequest.postDataJSON()).toEqual({
        reportId: 'inventory-movements',
        filters: {
          dateFrom: '2026-05-01',
          dateTo: '2026-05-31',
          search: movements.search
        }
      });
      expect(filteredExecution.reportId).toBe('inventory-movements');
      expect(filteredExecution.rowCount).toBe(2);
      expect(filteredExecution.rows).toEqual([
        expect.objectContaining({
          movementId: movements.movementIds[0],
          movementType: 'inbound',
          sku: movements.firstSku,
          quantityDelta: 10,
          balanceBefore: 0,
          balanceAfter: 10,
          reference: 'e2e-inbound'
        }),
        expect.objectContaining({
          movementId: movements.movementIds[1],
          movementType: 'outbound',
          sku: movements.secondSku,
          quantityDelta: -2,
          balanceBefore: 10,
          balanceAfter: 8,
          reference: 'e2e-outbound'
        })
      ]);
      expect(inventoryRequests).toEqual([]);

      const exportExecutionResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/reports/executions') &&
          response.request().method() === 'POST'
      );
      const exportResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/reports/executions/') &&
          response.url().endsWith('/export') &&
          response.request().method() === 'POST'
      );
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
      const [exportExecution, exported, downloaded] = await Promise.all([
        exportExecutionResponse.then((response) => response.json()),
        exportResponse.then((response) => response.json()),
        download
      ]);

      expect(exportExecution.reportId).toBe('inventory-movements');
      expect(exportExecution.rowCount).toBe(2);
      expect(exported.format).toBe('csv');
      expect(exported.content).toContain(movements.firstSku);
      expect(exported.content).toContain(movements.secondSku);
      expect(downloaded.suggestedFilename()).toMatch(/^inventory-movements-.*\.csv$/);
      await expect(
        page.getByText(/Exportação server-side auditada gerada com 2 linha/)
      ).toBeVisible();
      expect(inventoryRequests).toEqual([]);
    } finally {
      await removePersistedInventoryMovements(movements);
    }
  });
});

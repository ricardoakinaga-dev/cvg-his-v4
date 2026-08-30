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

type SeededInventoryItems = {
  readonly accountId: string;
  readonly ids: readonly string[];
  readonly search: string;
  readonly firstSku: string;
  readonly secondSku: string;
};

function e2eDatabaseUrl(): string {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('E2E_DATABASE_URL is required for the inventory-products report test');
  }
  return databaseUrl;
}

function uniqueSearch(): string {
  return `INV${Date.now()}${randomUUID().slice(0, 6).toUpperCase()}`;
}

async function seedPersistedInventoryItems(apiCall: {
  get(path: string): Promise<unknown>;
}): Promise<SeededInventoryItems> {
  const session = (await apiCall.get('/auth/session')) as AuthSessionPayload;
  const accountId = session.principal?.user?.accountId;
  if (!accountId) {
    throw new Error('E2E auth session did not expose an account id');
  }

  const search = uniqueSearch();
  const firstId = `e2e-report-inventory-alpha-${randomUUID()}`;
  const secondId = `e2e-report-inventory-zulu-${randomUUID()}`;
  const firstSku = `${search}-A`;
  const secondSku = `${search}-Z`;
  const pool = new Pool({ connectionString: e2eDatabaseUrl() });

  try {
    await pool.query(
      `INSERT INTO inventory_items (
         id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
         unit_cost_amount, created_at, updated_at
       ) VALUES
         ($1, $2, $3, $4, 'un', 4, 5, 12.50, '2026-05-01T00:00:00.000Z', '2026-05-01T10:00:00.000Z'),
         ($5, $2, $6, $7, 'dose', 20, 3, 40.00, '2026-05-31T23:59:59.000Z', '2026-06-01T10:00:00.000Z')`,
      [
        firstId,
        accountId,
        firstSku,
        `Alpha Produto ${search}`,
        secondId,
        secondSku,
        `Zulu Produto ${search}`
      ]
    );
  } finally {
    await pool.end();
  }

  return { accountId, ids: [firstId, secondId], search, firstSku, secondSku };
}

async function removePersistedInventoryItems(items: SeededInventoryItems): Promise<void> {
  const pool = new Pool({ connectionString: e2eDatabaseUrl() });
  try {
    await pool.query('DELETE FROM inventory_items WHERE account_id = $1 AND id = ANY($2::text[])', [
      items.accountId,
      items.ids
    ]);
  } finally {
    await pool.end();
  }
}

test.describe('Relatório de produtos de estoque', () => {
  test.skip(
    process.env.E2E_DATABASE_MODE !== '1',
    'requires the disposable PostgreSQL E2E runtime'
  );

  test('consulta itens persistidos, aplica período/busca e exporta com auditoria', async ({
    page,
    spaPage,
    apiCall
  }) => {
    const items = await seedPersistedInventoryItems(apiCall);
    const inventoryRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/inventory')) {
        inventoryRequests.push(request.url());
      }
    });

    try {
      await spaPage.goto('/reports/inventory-products');
      await expect(
        page.getByRole('heading', { name: 'Relatório de Produtos', exact: true })
      ).toBeVisible();

      await page.getByLabel('De', { exact: true }).fill('2026-05-01');
      await page.getByLabel('Até', { exact: true }).fill('2026-05-31');
      await page.getByLabel('Código ou produto', { exact: true }).fill(items.search);

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
        reportId: 'inventory-products',
        filters: {
          dateFrom: '2026-05-01',
          dateTo: '2026-05-31',
          search: items.search
        }
      });
      expect(filteredExecution.reportId).toBe('inventory-products');
      expect(filteredExecution.rowCount).toBe(2);
      expect(filteredExecution.rows).toEqual([
        expect.objectContaining({ sku: items.firstSku, name: `Alpha Produto ${items.search}` }),
        expect.objectContaining({ sku: items.secondSku, name: `Zulu Produto ${items.search}` })
      ]);

      await expect(page.getByText(items.firstSku, { exact: true })).toBeVisible();
      await expect(page.getByText(items.secondSku, { exact: true })).toBeVisible();
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

      expect(exportExecution.reportId).toBe('inventory-products');
      expect(exportExecution.rowCount).toBe(2);
      expect(exported.format).toBe('csv');
      expect(exported.content).toContain(items.firstSku);
      expect(exported.content).toContain(items.secondSku);
      expect(downloaded.suggestedFilename()).toMatch(/^inventory-products-.*\.csv$/);
      await expect(
        page.getByText(/Exportação server-side auditada gerada com 2 linha/)
      ).toBeVisible();
      expect(inventoryRequests).toEqual([]);
    } finally {
      await removePersistedInventoryItems(items);
    }
  });
});

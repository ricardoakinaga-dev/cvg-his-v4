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

type SeededInventoryPurchases = {
  readonly accountId: string;
  readonly ids: readonly string[];
  readonly search: string;
  readonly oldInvoice: string;
  readonly newInvoice: string;
};

function e2eDatabaseUrl(): string {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('E2E_DATABASE_URL is required for the inventory-invoices report test');
  }
  return databaseUrl;
}

async function seedPersistedInventoryPurchases(apiCall: {
  get(path: string): Promise<unknown>;
}): Promise<SeededInventoryPurchases> {
  const session = (await apiCall.get('/auth/session')) as AuthSessionPayload;
  const accountId = session.principal?.user?.accountId;
  if (!accountId) throw new Error('E2E auth session did not expose an account id');

  const search = `PURCHASE${Date.now()}${randomUUID().slice(0, 6).toUpperCase()}`;
  const oldId = `e2e-report-inventory-purchase-old-${randomUUID()}`;
  const newId = `e2e-report-inventory-purchase-new-${randomUUID()}`;
  const blankId = `e2e-report-inventory-purchase-blank-${randomUUID()}`;
  const oldInvoice = `${search}-OLD`;
  const newInvoice = `${search}-NEW`;
  const supplier = `Fornecedor ${search}`;
  const pool = new Pool({ connectionString: e2eDatabaseUrl() });

  try {
    await pool.query(
      `INSERT INTO inventory_purchases (
         id, account_id, supplier_name, invoice_number, status, total_amount,
         received_amount, payable_id, created_by_user_id, approved_by_user_id,
         created_at, updated_at, received_at
       ) VALUES
         ($1, $2, $3, $4, 'approved', 125.00, 50.00, 'payable-e2e-old', 'e2e-report-user', 'e2e-report-manager',
          '2026-05-10T10:00:00.000Z', '2026-05-11T10:00:00.000Z', NULL),
         ($5, $2, $3, $6, 'received', 200.00, 200.00, 'payable-e2e-new', 'e2e-report-user', 'e2e-report-manager',
          '2026-05-31T23:59:00.000Z', '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z'),
         ($7, $2, $8, '   ', 'draft', 10.00, 0.00, NULL, 'e2e-report-user', NULL,
          '2026-05-15T12:00:00.000Z', '2026-05-15T12:00:00.000Z', NULL)`,
      [oldId, accountId, supplier, oldInvoice, newId, newInvoice, blankId, `Oculto ${search}`]
    );
  } finally {
    await pool.end();
  }

  return { accountId, ids: [oldId, newId, blankId], search, oldInvoice, newInvoice };
}

async function removePersistedInventoryPurchases(
  purchases: SeededInventoryPurchases
): Promise<void> {
  const pool = new Pool({ connectionString: e2eDatabaseUrl() });
  try {
    await pool.query(
      'DELETE FROM inventory_purchases WHERE account_id = $1 AND id = ANY($2::text[])',
      [purchases.accountId, purchases.ids]
    );
  } finally {
    await pool.end();
  }
}

test.describe('Relatório de entradas de compras com referência de NF', () => {
  test.skip(
    process.env.E2E_DATABASE_MODE !== '1',
    'requires the disposable PostgreSQL E2E runtime'
  );

  test('consulta compras persistidas, exclui referência vazia e exporta com auditoria', async ({
    page,
    spaPage,
    apiCall
  }) => {
    const purchases = await seedPersistedInventoryPurchases(apiCall);
    const inventoryRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/inventory')) inventoryRequests.push(request.url());
    });

    try {
      await spaPage.goto('/reports/inventory-invoices');
      await expect(page.getByRole('heading', { name: 'Entrada de NF', exact: true })).toBeVisible();
      await expect(page.getByText(purchases.oldInvoice, { exact: true })).toBeVisible();
      await expect(page.getByText(purchases.newInvoice, { exact: true })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Aprovada', exact: true }).first()).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Recebida', exact: true }).first()).toBeVisible();

      await page.getByLabel('De', { exact: true }).fill('2026-05-01');
      await page.getByLabel('Até', { exact: true }).fill('2026-05-31');
      await page.getByLabel('Fornecedor ou referência NF', { exact: true }).fill(purchases.search);

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
        reportId: 'inventory-invoices',
        filters: {
          dateFrom: '2026-05-01',
          dateTo: '2026-05-31',
          search: purchases.search
        }
      });
      expect(filteredExecution.reportId).toBe('inventory-invoices');
      expect(filteredExecution.rowCount).toBe(2);
      expect(Object.keys(filteredExecution.rows[0] ?? {})).toEqual([
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
      ]);
      expect(filteredExecution.rows).toEqual([
        expect.objectContaining({
          invoiceNumber: purchases.newInvoice,
          supplierName: `Fornecedor ${purchases.search}`,
          status: 'received',
          totalAmount: 200,
          receivedAmount: 200,
          payableId: 'payable-e2e-new'
        }),
        expect.objectContaining({
          invoiceNumber: purchases.oldInvoice,
          supplierName: `Fornecedor ${purchases.search}`,
          status: 'approved',
          totalAmount: 125,
          receivedAmount: 50,
          payableId: 'payable-e2e-old'
        })
      ]);
      expect(
        filteredExecution.rows.some((row: { invoiceNumber?: string }) => !row.invoiceNumber)
      ).toBe(false);
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

      expect(exportExecution.reportId).toBe('inventory-invoices');
      expect(exportExecution.rowCount).toBe(2);
      expect(exported.format).toBe('csv');
      expect(exported.content).toContain(purchases.oldInvoice);
      expect(exported.content).toContain(purchases.newInvoice);
      expect(downloaded.suggestedFilename()).toMatch(/^inventory-invoices-.*\.csv$/);
      await expect(
        page.getByText(/Exportação server-side auditada gerada com 2 linha/)
      ).toBeVisible();
      expect(inventoryRequests).toEqual([]);
    } finally {
      await removePersistedInventoryPurchases(purchases);
    }
  });
});

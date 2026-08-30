import { expect, loginViaToken, test } from './fixtures/spa-fixture';

const persistedPurchase = {
  id: 'purchase-e2e-persisted',
  accountId: 'acc-e2e',
  supplierName: 'Fornecedor Persistido E2E',
  invoiceNumber: 'NF-E2E-0042',
  status: 'approved',
  totalAmount: 18,
  receivedAmount: 0,
  payableId: null,
  lines: [
    {
      id: 'purchase-line-e2e-persisted',
      purchaseId: 'purchase-e2e-persisted',
      inventoryItemId: 'item-e2e-persisted',
      sku: 'E2E-001',
      itemName: 'Produto Persistido E2E',
      orderedQuantity: 2,
      receivedQuantity: 0,
      unit: 'unidade',
      unitCostAmount: 9,
      lotNumber: 'E2E-LOT-001',
      expiryDate: null,
      manufactureDate: null,
      location: null,
      supplier: 'Fornecedor Persistido E2E'
    }
  ],
  createdByUserId: 'user-e2e',
  approvedByUserId: 'user-e2e',
  createdAt: '2026-08-26T00:00:00.000Z',
  updatedAt: '2026-08-26T00:00:00.000Z',
  receivedAt: null
};

test('navega da fila de compras persistidas para o detalhe read-only', async ({ page }) => {
  await loginViaToken(page);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

  await page.route('**/api/inventory**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/inventory/purchases')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [persistedPurchase] })
      });
      return;
    }
    if (pathname.endsWith('/inventory/lots')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] })
      });
      return;
    }
    if (pathname === '/api/inventory') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'item-e2e-persisted',
              accountId: 'acc-e2e',
              sku: 'E2E-001',
              name: 'Produto Persistido E2E',
              unit: 'unidade',
              onHandQuantity: 20,
              reorderLevel: 2,
              unitCostAmount: 9,
              createdAt: '2026-08-26T00:00:00.000Z',
              updatedAt: '2026-08-26T00:00:00.000Z'
            }
          ]
        })
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/inventory/purchases');
  await expect(page.getByRole('heading', { name: 'Compras', exact: true })).toBeVisible();
  await expect(page.getByText('Fornecedor Persistido E2E')).toBeVisible();
  await expect(page.getByLabel('Aprovada', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Abrir' }).click();
  await expect(page).toHaveURL(/\/inventory\/purchases\/purchase-e2e-persisted$/);
  await expect(page.getByRole('heading', { name: 'Detalhe da compra', exact: true })).toBeVisible();
  await expect(page.getByText('Produto Persistido E2E')).toBeVisible();
  await expect(page.getByText('NF NF-E2E-0042')).toBeVisible();
});

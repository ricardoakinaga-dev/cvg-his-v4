import { expect, test } from './fixtures/spa-fixture';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3111';
const SECOND_ADMIN_USERNAME = process.env.E2E_SECOND_ADMIN_USERNAME || 'admin_b';
const SECOND_ADMIN_PASSWORD = process.env.E2E_SECOND_ADMIN_PASSWORD || 'seed_admin_b';

async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const raw = await response.text();
  expect(response.status, raw).toBe(200);
  const body = JSON.parse(raw) as { accessToken: string };
  return body.accessToken;
}

async function requestAs(token: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await response.text();
  return {
    response,
    body: text ? (JSON.parse(text) as Record<string, unknown>) : {}
  };
}

test.describe('cadastros financeiros operacionais persistidos', () => {
  test.skip(
    process.env.E2E_DATABASE_MODE !== '1',
    'requires the disposable PostgreSQL E2E runtime'
  );

  test('cria e edita pela SPA, isola tenants, aplica RBAC e registra auditoria', async ({
    page,
    spaPage,
    apiCall,
    authSession
  }) => {
    const marker = Date.now();
    const code = `BANK_E2E_${marker}`;
    const initialName = `Banco E2E ${marker}`;
    const updatedName = `Banco E2E Principal ${marker}`;
    let itemId = '';

    try {
      await spaPage.goto('/banks');
      await expect(page.getByRole('heading', { name: 'Bancos', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Novo Banco', exact: true }).click();
      await page.locator('#banks-form-code').fill(code);
      await page.locator('#banks-form-name').fill(initialName);
      await page.locator('#banks-form-bankCode').fill('001');
      await page.locator('#banks-form-agency').fill('0001');
      await page.locator('#banks-form-accountNumber').fill('12345-6');
      await page.locator('#banks-form-usageDescription').fill('Liquidação E2E');

      const createResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname.endsWith('/api/finance/catalogs/banks') &&
          response.request().method() === 'POST'
      );
      await page.getByRole('button', { name: 'Criar registro', exact: true }).click();
      const createdResponse = await createResponse;
      expect(createdResponse.status()).toBe(201);
      const created = (await createdResponse.json()) as { id: string; version: number };
      itemId = created.id;
      expect(created.version).toBe(1);
      await expect(page.getByText(initialName, { exact: true })).toBeVisible();

      const row = page.getByRole('row').filter({ hasText: initialName });
      await row.getByRole('button', { name: 'Editar', exact: true }).click();
      await page.locator('#banks-form-name').fill(updatedName);
      await page.locator('#banks-form-reconciliationMode').selectOption('automatic');
      const updateResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname.endsWith(`/api/finance/catalogs/banks/${itemId}`) &&
          response.request().method() === 'PATCH'
      );
      await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
      expect((await updateResponse).status()).toBe(200);
      await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
      await expect(page.getByText('v2', { exact: true })).toBeVisible();

      const accountBToken = await login(SECOND_ADMIN_USERNAME, SECOND_ADMIN_PASSWORD);
      const accountBPage = await requestAs(
        accountBToken,
        `/finance/catalogs/banks?search=${encodeURIComponent(code)}`
      );
      expect(accountBPage.response.status).toBe(200);
      expect(accountBPage.body.totalItems).toBe(0);

      const receptionToken = await login('reception', 'seed_reception');
      const forbidden = await requestAs(receptionToken, '/finance/catalogs/banks', {
        method: 'POST',
        body: JSON.stringify({
          code: `${code}_DENIED`,
          name: 'Must not be created',
          status: 'active',
          configuration: {
            bankCode: '999',
            agency: '9999',
            accountNumber: '99999',
            accountType: 'checking',
            usageKey: 'support',
            usageDescription: 'Denied',
            reconciliationMode: 'manual'
          }
        })
      });
      expect(forbidden.response.status).toBe(403);

      await expect
        .poll(async () => {
          const audit = (await apiCall.get(
            `/audit/events?entity=${encodeURIComponent(itemId)}&limit=20`
          )) as { items: Array<{ action: string; entityId: string }> };
          return audit.items
            .filter((event) => event.entityId === itemId)
            .map((event) => event.action)
            .sort();
        })
        .toEqual([
          'create_finance_operational_catalog_item',
          'update_finance_operational_catalog_item'
        ]);

      const updated = (await apiCall.get(
        `/finance/catalogs/banks?search=${encodeURIComponent(code)}`
      )) as { items: Array<{ id: string; version: number }> };
      expect(updated.items).toEqual([expect.objectContaining({ id: itemId, version: 2 })]);

      const updatedRow = page.getByRole('row').filter({ hasText: updatedName });
      await updatedRow.getByRole('button', { name: 'Excluir', exact: true }).click();
      const deleteResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname.endsWith(`/api/finance/catalogs/banks/${itemId}`) &&
          response.request().method() === 'DELETE'
      );
      await page.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
      expect((await deleteResponse).status()).toBe(200);
      await expect(updatedRow).toBeHidden();
      itemId = '';
    } finally {
      if (itemId) {
        await requestAs(
          authSession.accessToken,
          `/finance/catalogs/banks/${encodeURIComponent(itemId)}`,
          { method: 'DELETE' }
        );
      }
    }
  });
});

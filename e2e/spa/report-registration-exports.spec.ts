import { expect, loginViaToken, test } from './fixtures/spa-fixture';

const owner = {
  id: 'owner-e2e-report',
  accountId: 'acc-e2e',
  fullName: 'Cliente Relatório E2E',
  documentId: '11111111111',
  contacts: [
    {
      label: 'Telefone',
      value: '+55 11 90000-0000',
      type: 'phone',
      primary: true
    }
  ],
  financialResponsible: true,
  status: 'active',
  createdAt: '2026-08-26T00:00:00.000Z',
  updatedAt: '2026-08-26T00:00:00.000Z'
};

const patient = {
  id: 'patient-e2e-report',
  accountId: 'acc-e2e',
  name: 'Animal Relatório E2E',
  species: 'canine',
  breed: 'SRD',
  sex: 'female',
  microchip: '985141000000001',
  primaryOwnerId: owner.id,
  status: 'active',
  createdAt: '2026-08-26T00:00:00.000Z',
  updatedAt: '2026-08-26T00:00:00.000Z'
};

const service = {
  id: 'service-e2e-report',
  accountId: 'acc-e2e',
  name: 'Consulta Relatório E2E',
  code: 'SRV-E2E',
  description: 'Consulta clínica persistida',
  basePrice: 125.5,
  active: true,
  createdAt: '2026-08-26T00:00:00.000Z',
  updatedAt: '2026-08-26T00:00:00.000Z'
};

async function stubRegistrySources(page: Parameters<typeof loginViaToken>[0]): Promise<void> {
  await page.route('**/api/owners**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [owner] })
    });
  });

  await page.route('**/api/patients**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [patient] })
    });
  });

  await page.route('**/api/services**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [service] })
    });
  });

  await page.route('**/api/reports/executions**', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const payload = route.request().postDataJSON() as { reportId?: string };
    const reportId = payload.reportId ?? 'unknown';
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: `rep-exec-${reportId}`, rowCount: 1 })
    });
  });

  await page.route('**/api/reports/executions/*/export', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const executionId = new URL(route.request().url()).pathname.split('/').at(-2);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: `rep-export-${executionId}`,
        accountId: 'acc-e2e',
        executionId,
        format: 'csv',
        filename: `${executionId}.csv`,
        contentType: 'text/csv;charset=utf-8',
        contentEncoding: 'utf8',
        content: 'Cliente,Animal\nCliente Relatório E2E,Animal Relatório E2E',
        exportedByUserId: 'user-e2e',
        exportedAt: '2026-08-26T00:00:00.000Z'
      })
    });
  });
}

test('exporta o cadastro persistido de clientes pela trilha server-side auditada', async ({
  page
}) => {
  await loginViaToken(page);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
  await stubRegistrySources(page);

  await page.goto('/reports/registers/owners');
  await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible();
  await expect(page.getByText('Cliente Relatório E2E')).toBeVisible();

  const executeRequest = page.waitForRequest(
    (request) => request.url().endsWith('/api/reports/executions') && request.method() === 'POST'
  );
  const exportRequest = page.waitForRequest(
    (request) => request.url().endsWith('/export') && request.method() === 'POST'
  );
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  expect((await executeRequest).postDataJSON()).toEqual({
    reportId: 'registration-owners',
    filters: {}
  });
  expect((await exportRequest).postDataJSON()).toEqual({ format: 'csv' });
  await expect(page.getByText(/Exportação server-side auditada gerada com 1 linha/)).toBeVisible();
});

test('exporta o cadastro persistido de animais pela trilha server-side auditada', async ({
  page
}) => {
  await loginViaToken(page);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
  await stubRegistrySources(page);

  await page.goto('/reports/registers/patients');
  await expect(page.getByRole('heading', { name: 'Animais', exact: true })).toBeVisible();
  await expect(page.getByText('Animal Relatório E2E')).toBeVisible();

  const executeRequest = page.waitForRequest(
    (request) => request.url().endsWith('/api/reports/executions') && request.method() === 'POST'
  );
  const exportRequest = page.waitForRequest(
    (request) => request.url().endsWith('/export') && request.method() === 'POST'
  );
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  expect((await executeRequest).postDataJSON()).toEqual({
    reportId: 'registration-patients',
    filters: {}
  });
  expect((await exportRequest).postDataJSON()).toEqual({ format: 'csv' });
  await expect(page.getByText(/Exportação server-side auditada gerada com 1 linha/)).toBeVisible();
});

test('exporta o cadastro persistido de serviços pela trilha server-side auditada', async ({
  page
}) => {
  await loginViaToken(page);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
  await stubRegistrySources(page);

  await page.goto('/reports/registers/services');
  await expect(page.getByRole('heading', { name: 'Serviços', exact: true })).toBeVisible();
  await expect(page.getByText('Consulta Relatório E2E')).toBeVisible();

  const executeRequest = page.waitForRequest(
    (request) => request.url().endsWith('/api/reports/executions') && request.method() === 'POST'
  );
  const exportRequest = page.waitForRequest(
    (request) => request.url().endsWith('/export') && request.method() === 'POST'
  );
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  expect((await executeRequest).postDataJSON()).toEqual({
    reportId: 'registration-services',
    filters: {}
  });
  expect((await exportRequest).postDataJSON()).toEqual({ format: 'csv' });
  await expect(page.getByText(/Exportação server-side auditada gerada com 1 linha/)).toBeVisible();
});

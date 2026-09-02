import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

import { expect, test, type Page } from './fixtures/spa-fixture';

type ReportExecution = {
  readonly id: string;
  readonly reportId: string;
  readonly status: string;
  readonly requestedByUserId: string;
  readonly rowCount: number;
  readonly columns: readonly { readonly key: string; readonly type: string }[];
  readonly rows: readonly Record<string, unknown>[];
};

type ReportExport = {
  readonly executionId: string;
  readonly format: string;
  readonly filename: string;
  readonly contentType: string;
  readonly contentEncoding: string;
  readonly content: string;
};

type OwnerResponse = {
  readonly id: string;
  readonly documentId?: string | null;
  readonly fullName: string;
  readonly address?: { readonly city?: string | null } | null;
  readonly financialResponsible?: boolean;
  readonly status: string;
  readonly createdAt: string;
};

type PatientResponse = {
  readonly id: string;
  readonly legacyVetusId?: string | number | null;
  readonly name: string;
  readonly species: string;
  readonly breed?: string | null;
  readonly sex: string;
  readonly microchip?: string | null;
  readonly status: string;
  readonly createdAt: string;
};

type ServiceResponse = {
  readonly id: string;
  readonly code?: string | null;
  readonly name: string;
  readonly description?: string | null;
  readonly basePrice: number;
  readonly active: boolean;
  readonly createdAt: string;
};

function marker(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function expectRegistryExecution(
  execution: ReportExecution,
  reportId: string,
  expectedRow: Record<string, unknown>
): void {
  expect(execution).toEqual(
    expect.objectContaining({
      reportId,
      status: 'completed',
      requestedByUserId: expect.any(String),
      columns: expect.arrayContaining([
        expect.objectContaining({ key: 'createdAt', type: 'datetime' })
      ]),
      rows: expect.any(Array)
    })
  );
  expect(execution.rowCount).toBe(execution.rows.length);
  expect(execution.rowCount).toBeGreaterThan(0);
  expect(execution.rows).toContainEqual(expectedRow);
}

async function applyDateFilter(
  page: Page,
  date: string
): Promise<{ execution: ReportExecution; requestBody: unknown }> {
  await page.getByLabel('De', { exact: true }).fill(date);
  await page.getByLabel('Até', { exact: true }).fill(date);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/reports/executions') && response.request().method() === 'POST'
  );
  const requestPromise = page.waitForRequest(
    (request) => request.url().endsWith('/api/reports/executions') && request.method() === 'POST'
  );
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();

  const [response, request] = await Promise.all([responsePromise, requestPromise]);
  expect(response.status()).toBe(201);
  return {
    execution: (await response.json()) as ReportExecution,
    requestBody: request.postDataJSON()
  };
}

async function exportCurrentReport(
  page: Page
): Promise<{ execution: ReportExecution; exported: ReportExport; filename: string }> {
  const executionResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/reports/executions') && response.request().method() === 'POST'
  );
  const exportResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/reports/executions/') &&
      response.url().endsWith('/export') &&
      response.request().method() === 'POST'
  );
  const exportRequest = page.waitForRequest(
    (request) =>
      request.url().includes('/api/reports/executions/') &&
      request.url().endsWith('/export') &&
      request.method() === 'POST'
  );
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();

  const [execution, exported, downloaded, request] = await Promise.all([
    executionResponse.then((response) => response.json() as Promise<ReportExecution>),
    exportResponse.then((response) => response.json() as Promise<ReportExport>),
    download,
    exportRequest
  ]);
  expect(request.postDataJSON()).toEqual({ format: 'csv' });
  return { execution, exported, filename: downloaded.suggestedFilename() };
}

function expectCsvExport(
  exported: ReportExport,
  execution: ReportExecution,
  reportId: string,
  markerValue: string,
  filename: string
): void {
  expect(exported).toEqual(
    expect.objectContaining({
      executionId: execution.id,
      format: 'csv',
      filename: expect.stringMatching(new RegExp(`^${reportId}-.+\\.csv$`)),
      contentType: expect.stringMatching(/^text\/csv/),
      contentEncoding: 'utf8',
      content: expect.stringContaining(markerValue)
    })
  );
  expect(filename).toBe(exported.filename);
}

async function deletePersistedService(service: ServiceResponse): Promise<void> {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) throw new Error('E2E_DATABASE_URL is required for service cleanup');
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const accountId = process.env.E2E_ACCOUNT_ID;
    if (!accountId) throw new Error('E2E_ACCOUNT_ID is required for service cleanup');
    await pool.query('DELETE FROM services WHERE account_id = $1 AND id = $2', [
      accountId,
      service.id
    ]);
  } finally {
    await pool.end();
  }
}

test.describe('Relatórios de cadastros — execução e exportação', () => {
  test('clientes usa a resposta real do relatório e exporta o mesmo contrato', async ({
    page,
    spaPage,
    apiCall,
    cleanup
  }) => {
    const ownerName = marker('Cliente');
    const phone = `551199${String(Date.now()).slice(-7)}`;
    const owner = (await apiCall.post('/owners', {
      fullName: ownerName,
      documentId: marker('DOC'),
      contacts: [
        {
          label: 'Celular',
          type: 'phone',
          value: phone,
          primary: true
        }
      ],
      address: { city: 'São Paulo' },
      financialResponsible: true,
      status: 'active'
    })) as OwnerResponse;
    cleanup.track({ type: 'owner', id: owner.id });

    await spaPage.goto('/reports/registers/owners');
    await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible();
    await expect(page.getByText(ownerName, { exact: true })).toBeVisible();

    const date = dateOnly(owner.createdAt);
    const filtered = await applyDateFilter(page, date);
    expect(filtered.requestBody).toEqual({
      reportId: 'registration-owners',
      filters: { dateFrom: date, dateTo: date }
    });
    const expectedRow = {
      documentId: owner.documentId ?? '',
      fullName: owner.fullName,
      primaryContact: `Celular: ${phone}`,
      city: 'São Paulo',
      financialResponsible: 'Sim',
      status: owner.status,
      createdAt: owner.createdAt
    };
    expectRegistryExecution(filtered.execution, 'registration-owners', expectedRow);
    await expect(page.getByText(ownerName, { exact: true })).toBeVisible();

    const exported = await exportCurrentReport(page);
    expectRegistryExecution(exported.execution, 'registration-owners', expectedRow);
    expectCsvExport(
      exported.exported,
      exported.execution,
      'registration-owners',
      ownerName,
      exported.filename
    );
    await expect(
      page.getByText(/Exportação server-side auditada gerada com \d+ linha/)
    ).toBeVisible();
  });

  test('pacientes usa os campos persistidos pela API sem inventar linhas', async ({
    page,
    spaPage,
    apiCall,
    cleanup
  }) => {
    const owner = (await apiCall.post('/owners', {
      fullName: marker('Tutor'),
      documentId: marker('DOC'),
      contacts: [
        {
          label: 'Celular',
          type: 'phone',
          value: `551198${String(Date.now()).slice(-7)}`,
          primary: true
        }
      ],
      financialResponsible: false,
      status: 'active'
    })) as OwnerResponse;
    cleanup.track({ type: 'owner', id: owner.id });

    const patient = (await apiCall.post('/patients', {
      name: marker('Paciente'),
      species: 'canine',
      breed: 'SRD',
      sex: 'female',
      microchip: marker('CHIP'),
      primaryOwnerId: owner.id,
      status: 'active'
    })) as PatientResponse;
    cleanup.track({ type: 'patient', id: patient.id });

    await spaPage.goto('/reports/registers/patients');
    await expect(page.getByRole('heading', { name: 'Animais', exact: true })).toBeVisible();
    await expect(page.getByText(patient.name, { exact: true })).toBeVisible();

    const date = dateOnly(patient.createdAt);
    const filtered = await applyDateFilter(page, date);
    expect(filtered.requestBody).toEqual({
      reportId: 'registration-patients',
      filters: { dateFrom: date, dateTo: date }
    });
    const expectedRow = {
      code: patient.legacyVetusId ?? patient.id,
      name: patient.name,
      species: patient.species,
      breed: patient.breed ?? '',
      sex: patient.sex,
      microchip: patient.microchip ?? '',
      status: patient.status,
      createdAt: patient.createdAt
    };
    expectRegistryExecution(filtered.execution, 'registration-patients', expectedRow);
    await expect(page.getByText(patient.name, { exact: true })).toBeVisible();

    const exported = await exportCurrentReport(page);
    expectRegistryExecution(exported.execution, 'registration-patients', expectedRow);
    expectCsvExport(
      exported.exported,
      exported.execution,
      'registration-patients',
      patient.name,
      exported.filename
    );
    await expect(
      page.getByText(/Exportação server-side auditada gerada com \d+ linha/)
    ).toBeVisible();
  });

  test('serviços consulta a fonte PostgreSQL do backend e exporta seu contrato', async ({
    page,
    spaPage,
    apiCall
  }) => {
    test.skip(
      process.env.E2E_DATABASE_MODE !== '1',
      'requires the disposable PostgreSQL E2E runtime because the report is database-backed'
    );

    const serviceName = marker('Serviço');
    const service = (await apiCall.post('/services', {
      name: serviceName,
      code: marker('SRV'),
      description: `Descrição ${serviceName}`,
      basePrice: 125.5,
      active: true
    })) as ServiceResponse;

    try {
      await spaPage.goto('/reports/registers/services');
      await expect(page.getByRole('heading', { name: 'Serviços', exact: true })).toBeVisible();
      await expect(page.getByText(serviceName, { exact: true })).toBeVisible();

      const date = dateOnly(service.createdAt);
      const filtered = await applyDateFilter(page, date);
      expect(filtered.requestBody).toEqual({
        reportId: 'registration-services',
        filters: { dateFrom: date, dateTo: date }
      });
      const expectedRow = {
        code: service.code ?? '',
        name: service.name,
        description: service.description ?? '',
        basePrice: service.basePrice,
        status: service.active ? 'active' : 'inactive',
        createdAt: service.createdAt
      };
      expectRegistryExecution(filtered.execution, 'registration-services', expectedRow);
      await expect(page.getByText(serviceName, { exact: true })).toBeVisible();

      const exported = await exportCurrentReport(page);
      expectRegistryExecution(exported.execution, 'registration-services', expectedRow);
      expectCsvExport(
        exported.exported,
        exported.execution,
        'registration-services',
        serviceName,
        exported.filename
      );
      await expect(
        page.getByText(/Exportação server-side auditada gerada com \d+ linha/)
      ).toBeVisible();
    } finally {
      await deletePersistedService(service);
    }
  });
});

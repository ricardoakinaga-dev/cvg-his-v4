import { Pool } from 'pg';

import { expect, test } from './fixtures/spa-fixture';

type AuthSessionPayload = {
  readonly principal?: {
    readonly user?: {
      readonly accountId?: string;
    };
  };
};

type SeededNfseDocument = {
  readonly accountId: string;
  readonly id: string;
  readonly marker: string;
};

function uniqueMarker(): string {
  return `E2E-NFSE-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function e2eDatabaseUrl(): string {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('E2E_DATABASE_URL is required for the PostgreSQL NFS-e report test');
  }
  return databaseUrl;
}

async function seedPersistedNfseDocument(apiCall: {
  get(path: string): Promise<unknown>;
}): Promise<SeededNfseDocument> {
  const session = (await apiCall.get('/auth/session')) as AuthSessionPayload;
  const accountId = session.principal?.user?.accountId;
  if (!accountId) {
    throw new Error('E2E auth session did not expose an account id');
  }

  const marker = uniqueMarker();
  const id = `e2e-report-nfse-${marker.toLowerCase()}`;
  const numero = Number(Date.now().toString().slice(-8));
  const now = new Date().toISOString();
  const customer = {
    type: 'cpf',
    document: '12345678909',
    name: `Cliente ${marker}`
  };
  const services = [
    {
      description: `Consulta veterinária ${marker}`,
      codigoServico: '0407',
      cnae: '7500-1/00',
      quantity: 2,
      unitValue: 125,
      totalValue: 250,
      issRate: 0.05,
      issValue: 12.5,
      pisValue: 0,
      cofinsValue: 0,
      csllValue: 0,
      irrfValue: 0,
      inssValue: 0
    }
  ];
  const pool = new Pool({ connectionString: e2eDatabaseUrl() });

  try {
    await pool.query(
      `INSERT INTO fiscal_nfse_documents (
        id, account_id, serie, numero, competencia, provider, municipality_code,
        api_url, environment, issuer, customer, services, subtotal, total_iss,
        total_pis, total_cofins, total_csll, total_irrf, total_inss, total_document,
        observations, status, authorization_code, verification_url, created_at, updated_at
      ) VALUES (
        $1, $2, 'E2E', $3, '2026-05-15', 'abrasf', '3550308',
        'https://simulator.example.invalid/nfse', 'homologacao', $4, $5, $6,
        250, 12.50, 0, 0, 0, 0, 0, 262.50,
        $7, 'draft', NULL, NULL, $8, $8
      )`,
      [
        id,
        accountId,
        numero,
        JSON.stringify({ legalName: 'CVG E2E', taxId: '12345678000199' }),
        JSON.stringify(customer),
        JSON.stringify(services),
        `Observação ${marker}`,
        now
      ]
    );
  } catch (error) {
    await pool.end().catch(() => undefined);
    throw error;
  }

  await pool.end();
  return { accountId, id, marker };
}

async function removePersistedNfseDocument(document: SeededNfseDocument): Promise<void> {
  const pool = new Pool({ connectionString: e2eDatabaseUrl() });
  try {
    await pool.query('DELETE FROM fiscal_nfse_documents WHERE id = $1 AND account_id = $2', [
      document.id,
      document.accountId
    ]);
  } finally {
    await pool.end();
  }
}

test.describe('Relatório de NFS-e de serviços prestados', () => {
  test.skip(
    process.env.E2E_DATABASE_MODE !== '1',
    'requires the disposable PostgreSQL E2E runtime'
  );

  test('consulta documentos persistidos por competência, busca e exportação auditada', async ({
    page,
    spaPage,
    apiCall
  }) => {
    const document = await seedPersistedNfseDocument(apiCall);

    try {
      await spaPage.goto('/reports/nf');
      await expect(
        page.getByRole('heading', { name: 'Relatório de NF de Serviços Prestados', exact: true })
      ).toBeVisible();

      await page.getByLabel('De', { exact: true }).fill('2026-05-01');
      await page.getByLabel('Até', { exact: true }).fill('2026-05-31');
      await page.getByLabel('Cliente, serviço ou código', { exact: true }).fill(document.marker);

      const executeRequest = page.waitForRequest(
        (request) =>
          request.url().endsWith('/api/reports/executions') && request.method() === 'POST'
      );
      const executeResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/reports/executions') &&
          response.request().method() === 'POST'
      );
      await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
      const execution = await (await executeResponse).json();
      expect((await executeRequest).postDataJSON()).toEqual({
        reportId: 'fiscal-service-invoices',
        filters: {
          dateFrom: '2026-05-01',
          dateTo: '2026-05-31',
          search: document.marker
        }
      });

      expect(execution.reportId).toBe('fiscal-service-invoices');
      expect(execution.rowCount).toBe(1);
      expect(execution.rows[0]).toEqual(
        expect.objectContaining({
          documentId: document.id,
          competencia: '2026-05-15',
          status: 'draft',
          customerName: `Cliente ${document.marker}`,
          serviceDescriptions: `Consulta veterinária ${document.marker}`,
          serviceCodes: '0407',
          serviceQuantity: 2,
          serviceSubtotal: 250,
          totalDocument: 262.5
        })
      );
      const reportRow = page.getByRole('row').filter({ hasText: document.marker });
      await expect(reportRow).toHaveCount(1);
      await expect(reportRow).toBeVisible();
      await expect(reportRow.getByText('Rascunho', { exact: true })).toBeVisible();

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

      expect(exportExecution.reportId).toBe('fiscal-service-invoices');
      expect(exportExecution.rowCount).toBe(1);
      expect(exported.format).toBe('csv');
      expect(exported.content).toContain(document.marker);
      expect(exported.content).toContain('2026-05-15');
      expect(downloaded.suggestedFilename()).toMatch(/^fiscal-service-invoices-.*\.csv$/);
      await expect(
        page.getByText(/Exportação server-side auditada gerada com 1 linha/)
      ).toBeVisible();
    } finally {
      await removePersistedNfseDocument(document);
    }
  });
});

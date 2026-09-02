import { expect, test } from './fixtures/spa-fixture';

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

test.describe('Relatório de vendas e comandas canceladas', () => {
  test('consulta a fonte persistida, aplica busca e exporta o snapshot auditado', async ({
    page,
    spaPage,
    apiCall
  }) => {
    const marker = `e2e-cancelled-sale-${uniqueSuffix()}`;
    const opened = await apiCall.post('/counter-sales', { notes: marker });
    expect(opened.id).toEqual(expect.any(String));
    expect(opened.number).toEqual(expect.any(String));

    const cancelled = await apiCall.post(`/counter-sales/${opened.id}/cancel`, {
      reason: 'Fluxo E2E de cancelamento'
    });
    expect(cancelled.status).toBe('cancelled');

    await spaPage.goto('/reports/deleted-sales-counter-sales');
    await expect(
      page.getByRole('heading', { name: 'Exclusão de Vendas e Comandas', exact: true })
    ).toBeVisible();

    const search = page.getByLabel('Número ou observação');
    await search.fill(marker);
    const filteredExecutionResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/reports/executions') && response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
    const filteredExecution = await (await filteredExecutionResponse).json();
    expect(filteredExecution.reportId).toBe('commercial-deleted-sales');
    expect(filteredExecution.rowCount).toBe(1);
    expect(filteredExecution.rows[0]).toEqual(
      expect.objectContaining({ number: opened.number, status: 'cancelled', notes: marker })
    );
    await expect(page.getByText(opened.number, { exact: true })).toBeVisible();

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
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
    const [execution, exported, downloaded] = await Promise.all([
      executionResponse.then((response) => response.json()),
      exportResponse.then((response) => response.json()),
      download
    ]);

    expect(execution.reportId).toBe('commercial-deleted-sales');
    expect(execution.rowCount).toBe(1);
    expect(exported.format).toBe('csv');
    expect(exported.content).toContain(opened.number);
    expect(exported.content).toContain(marker);
    expect(downloaded.suggestedFilename()).toMatch(/^commercial-deleted-sales-.*\.csv$/);
    await expect(
      page.getByText(/Exportação server-side auditada gerada com 1 linha/)
    ).toBeVisible();
  });
});

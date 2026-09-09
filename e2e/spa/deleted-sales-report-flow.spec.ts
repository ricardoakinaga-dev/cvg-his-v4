import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
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

    await page.getByText('Filtros da consulta', { exact: true }).click();
    await page.getByLabel('Consultar', { exact: true }).selectOption('opening-date');

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

    const exportResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/reports/executions/') &&
        response.url().endsWith('/export') &&
        response.request().method() === 'POST'
    );
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
    const [exported, downloaded] = await Promise.all([
      exportResponse.then((response) => response.json()),
      download
    ]);

    expect(filteredExecution.reportId).toBe('commercial-deleted-sales');
    expect(filteredExecution.rowCount).toBe(1);
    expect(exported.format).toBe('csv');
    expect(exported.content).toContain(opened.number);
    expect(exported.content).toContain(marker);
    expect(downloaded.suggestedFilename()).toMatch(/^commercial-deleted-sales-.*\.csv$/);
    await expect(
      page.getByText(/Exportação server-side auditada gerada com 1 linha/)
    ).toBeVisible();
  });

  test('consulta cancelamentos por data, preserva fatos após recarga e exporta o histórico', async ({
    page,
    spaPage,
    apiCall
  }, testInfo) => {
    const reason = `Pedido duplicado ${uniqueSuffix()}`;
    const sale = await apiCall.post('/counter-sales', {
      notes: 'Venda para auditoria do histórico'
    });
    await apiCall.post(`/counter-sales/${sale.id}/cancel`, { reason });
    await spaPage.goto('/reports/deleted-sales-counter-sales');
    await expect(page.getByLabel('Consultar', { exact: true })).toHaveValue('history');
    await page.getByText('Filtros da consulta', { exact: true }).click();
    const today = new Date().toISOString().slice(0, 10);
    await page.getByLabel('Cancelamentos de (UTC)', { exact: true }).fill(today);
    await page.getByLabel('Cancelamentos até (UTC)', { exact: true }).fill(today);
    await page.getByLabel('Número, motivo ou responsável', { exact: true }).fill(reason);
    const executionResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/reports/executions') && response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
    const execution = await (await executionResponse).json();
    expect(execution.reportId).toBe('commercial-cancellation-history');
    expect(execution.rows).toHaveLength(1);
    expect(execution.rows[0]).toEqual(
      expect.objectContaining({
        number: sale.number,
        counterSaleId: sale.id,
        reason,
        cancelledByUserId: expect.any(String),
        cancelledAt: expect.any(String),
        eventId: expect.any(String),
        correlationId: expect.any(String)
      })
    );
    await expect(page.getByText(reason, { exact: true })).toBeVisible();
    const exportResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/reports/executions/') &&
        response.url().endsWith('/export') &&
        response.request().method() === 'POST'
    );
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
    const [exported, download] = await Promise.all([
      exportResponse.then((response) => response.json()),
      downloadPromise
    ]);
    expect(download.suggestedFilename()).toMatch(/^commercial-cancellation-history-.*\.csv$/);
    expect(exported.content).toContain(reason);
    expect(exported.content).toContain(execution.rows[0].cancelledByUserId);
    expect(exported.content).toContain(execution.rows[0].cancelledAt);
    const downloadedPath = await download.path();
    expect(downloadedPath).not.toBeNull();
    const downloadedCsv = await readFile(downloadedPath!, 'utf8');
    expect(downloadedCsv).toContain(reason);
    expect(downloadedCsv).toContain(execution.rows[0].cancelledByUserId);
    expect(downloadedCsv).toContain(execution.rows[0].cancelledAt);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: testInfo.outputPath('cancellation-history-desktop.png'),
      fullPage: true
    });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText(reason, { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Recolher menu lateral', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Suporte', exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('cancellation-history-mobile.png'),
      fullPage: true
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    ).toBe(false);
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
});

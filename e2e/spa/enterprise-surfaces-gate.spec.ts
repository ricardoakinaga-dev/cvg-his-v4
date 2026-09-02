import { type Locator, type Page, type TestInfo } from '@playwright/test';
import { expect, loginViaToken, test } from './fixtures/spa-fixture';
import { stabilizeVisual, waitForPageSettled } from './visual/stabilize-visual';

const SPA_URL = process.env.SPA_URL || 'http://localhost:3102';

async function stabilizeEnterpriseSurface(page: Page): Promise<void> {
  await stabilizeVisual(page, {
    hideTimestamps: false,
    extraCss: `
      html, body, #app {
        max-width: 100vw !important;
        overflow-x: hidden !important;
      }
    `
  });
}

async function expectNoDocumentHorizontalOverflow(page: Page, context: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(
    overflow,
    `${context} should not create document-level horizontal overflow`
  ).toBeLessThanOrEqual(1);
}

async function expectVisibleInsideViewport(locator: Locator, label: string): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator, `${label} should be visible`).toBeVisible();
  await expect(locator, `${label} should fit inside viewport`).toBeInViewport({ ratio: 0.75 });
}

async function captureEvidence(page: Page, testInfo: TestInfo, filename: string): Promise<void> {
  const screenshot = await page.screenshot({
    path: testInfo.outputPath(filename),
    fullPage: false
  });
  expect(screenshot.length, `${filename} should contain rendered pixels`).toBeGreaterThan(10_000);
}

test.describe('Gate Enterprise - Dashboard e Relatórios', () => {
  test('carrega Dashboard Executivo Premium com KPIs e lentes operacionais', async ({
    page
  }, testInfo) => {
    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/`);
    await waitForPageSettled(page, {
      contentSelector: 'main, h1, h2, [role="heading"]',
      timeout: 15000
    });
    await stabilizeEnterpriseSurface(page);

    const commandCenter = page.getByLabel('Central executiva Premium');
    await expectVisibleInsideViewport(commandCenter, 'Central executiva Premium');
    await expect(commandCenter).toContainText('Status SLO');
    await expect(commandCenter).toContainText('Auditoria');
    await expect(commandCenter).toContainText('Alertas resolvidos');
    await expect(commandCenter).toContainText('Lentes executivas');

    const operationGuide = page.getByLabel('Roteiro operacional Premium');
    await expectVisibleInsideViewport(operationGuide, 'Roteiro operacional Premium');
    await expect(operationGuide).toContainText('Busca Mestre');

    await expectNoDocumentHorizontalOverflow(page, 'Dashboard Executivo Premium');
    await captureEvidence(page, testInfo, 'enterprise-dashboard-premium.png');
  });

  test('executa e exporta relatório no Motor Enterprise', async ({ page }, testInfo) => {
    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/reports/engine`);
    await waitForPageSettled(page, {
      contentSelector: 'main, h1, h2, [role="heading"]',
      timeout: 15000
    });
    await stabilizeEnterpriseSurface(page);

    await expect(page.getByRole('heading', { name: 'Motor Enterprise de Relatórios' })).toBeVisible(
      {
        timeout: 15000
      }
    );
    await expect(page.getByText('Relatórios no catálogo')).toBeVisible();
    await expect(page.getByText('Execuções com dados')).toBeVisible();
    await expect(page.getByText('Agendamentos com falha')).toBeVisible();

    await page.locator('#report-definition').selectOption('administrative-executive');
    await page.getByRole('button', { name: 'Executar' }).click();

    await expect(page.getByText(/Relatório executado com \d+ linha\(s\)\./)).toBeVisible({
      timeout: 15000
    });
    await expect(page.getByText('Faturamento bruto')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    await expect(page.getByText(/Exportação gerada: .*\.csv\./)).toBeVisible({
      timeout: 15000
    });

    await page.locator('#schedule-name').fill(`Gate Enterprise ${Date.now()}`);
    await page.locator('#schedule-recipients').fill('gestao@cvg-his.local');
    await page.getByRole('button', { name: 'Agendar relatório' }).click();
    await expect(page.getByText(/Agendamento .* criado\./)).toBeVisible({ timeout: 15000 });

    await expectNoDocumentHorizontalOverflow(page, 'Motor Enterprise de Relatórios');
    await captureEvidence(page, testInfo, 'enterprise-reports-engine.png');
  });

  test('exporta o recorte carregado no workbench de agenda', async ({ page }) => {
    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/reports/appointments`);
    await waitForPageSettled(page, {
      contentSelector: 'main, h1, h2, [role="heading"]',
      timeout: 15000
    });

    await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible({
      timeout: 15000
    });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^scheduling-appointments-rep_exec_.+\.csv$/);
    await expect(
      page.getByText(/Exportação server-side auditada gerada com \d+ linha\(s\)\./)
    ).toBeVisible({
      timeout: 15000
    });
  });

  test('exporta o recorte carregado no workbench de estoque', async ({ page }) => {
    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/reports/inventory`);
    await waitForPageSettled(page, {
      contentSelector: 'main, h1, h2, [role="heading"]',
      timeout: 15000
    });

    await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible({
      timeout: 15000
    });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^inventory-stock-rep_exec_.+\.csv$/);
    await expect(
      page.getByText(/Exportação server-side auditada gerada com \d+ linha\(s\)\./)
    ).toBeVisible({
      timeout: 15000
    });
  });

  test('exporta o recorte carregado no workbench de contas a pagar', async ({ page }) => {
    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/reports/accounts-payable`);
    await waitForPageSettled(page, {
      contentSelector: 'main, h1, h2, [role="heading"]',
      timeout: 15000
    });

    await expect(page.getByRole('heading', { name: 'Contas a Pagar', exact: true })).toBeVisible({
      timeout: 15000
    });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^financial-payables-rep_exec_.+\.csv$/);
    await expect(
      page.getByText(/Exportação server-side auditada gerada com \d+ linha\(s\)\./)
    ).toBeVisible({
      timeout: 15000
    });
  });

  test('exporta o recorte carregado no workbench de contas recebidas', async ({ page }) => {
    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/reports/received-accounts`);
    await waitForPageSettled(page, {
      contentSelector: 'main, h1, h2, [role="heading"]',
      timeout: 15000
    });

    await expect(page.getByRole('heading', { name: 'Contas Recebidas', exact: true })).toBeVisible({
      timeout: 15000
    });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^financial-receivables-rep_exec_.+\.csv$/);
    await expect(
      page.getByText(/Exportação server-side auditada gerada com \d+ linha\(s\)\./)
    ).toBeVisible({
      timeout: 15000
    });
  });
});

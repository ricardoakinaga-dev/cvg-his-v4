import AxeBuilder from '@axe-core/playwright';
import { expect, loginViaToken, test } from './fixtures/spa-fixture';
import type { Page, TestInfo } from '@playwright/test';
import { stabilizeVisual } from './visual/stabilize-visual';

const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3112';
const WORKFLOW_TASKS_ROUTE = '**/api/workflow-tasks**';
const WORKFLOW_TASKS_API_PATH = '/api/workflow-tasks';

const viewports = [
  { name: 'desktop-1440', width: 1440, height: 900, isMobile: false },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true }
] as const;

const workflowTasks = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    taskType: 'clinical.follow_up',
    status: 'pending',
    executionMode: 'manual',
    priority: 'critical',
    title: 'Retorno pós-alta prioritário',
    description: 'Confirmar a evolução clínica após a alta e registrar o retorno.',
    patientId: '22222222-2222-4222-8222-222222222222',
    encounterId: '33333333-3333-4333-8333-333333333333',
    dueAt: '2020-01-01T09:00:00.000Z',
    idempotencyKey: 'discharge-follow-up:fixture-1',
    metadata: { source: 'discharge', fixture: true },
    revision: 2,
    attempts: 1,
    maxAttempts: 5,
    nextAttemptAt: '2020-01-01T09:00:00.000Z',
    escalationLevel: 2,
    correlationId: '44444444-4444-4444-8444-444444444444',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-02T12:00:00.000Z'
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    taskType: 'diagnostic.result_follow_up',
    status: 'dlq',
    executionMode: 'worker',
    priority: 'high',
    title: 'Reprocessar laudo laboratorial',
    description: 'Revisar a falha de processamento e reprocessar o resultado.',
    patientId: '66666666-6666-4666-8666-666666666666',
    encounterId: '77777777-7777-4777-8777-777777777777',
    dueAt: '2099-09-12T09:00:00.000Z',
    idempotencyKey: 'diagnostic-result:fixture-2',
    metadata: { source: 'laboratory', fixture: true },
    revision: 3,
    attempts: 5,
    maxAttempts: 5,
    nextAttemptAt: '2099-09-12T09:00:00.000Z',
    lastError: 'Serviço laboratorial indisponível',
    escalationLevel: 1,
    correlationId: '88888888-8888-4888-8888-888888888888',
    createdAt: '2026-09-03T12:00:00.000Z',
    updatedAt: '2026-09-04T12:00:00.000Z'
  }
] as const;

type WorkflowStub = {
  getRequests: () => number;
  requestedQueries: string[];
};

async function stubWorkflowTasks(page: Page, failFirstRequest = false): Promise<WorkflowStub> {
  let getRequests = 0;
  const requestedQueries: string[] = [];

  await page.route(WORKFLOW_TASKS_ROUTE, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname !== WORKFLOW_TASKS_API_PATH) {
      await route.continue();
      return;
    }

    getRequests += 1;
    requestedQueries.push(requestUrl.search);

    if (failFirstRequest && getRequests === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Fila clínica temporariamente indisponível' })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: workflowTasks, count: workflowTasks.length })
    });
  });

  return {
    getRequests: () => getRequests,
    requestedQueries
  };
}

async function expectAccessible(page: Page, context: string): Promise<void> {
  const accessibilityScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(accessibilityScan.violations, `${context} has accessibility violations`).toEqual([]);
}

async function expectSkipLinkAndMainFocus(page: Page): Promise<void> {
  const main = page.getByRole('main');
  await expect(main).toHaveCount(1);

  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
    document.body.removeAttribute('tabindex');
  });
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: /Pular para o conteudo principal/i });
  await expect(skipLink).toBeFocused();
  await skipLink.press('Enter');
  await expect(main).toBeFocused();
}

async function expectNoDocumentOverflow(page: Page, context: string): Promise<void> {
  const overflowAudit = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const documentOverflow =
      Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - viewportWidth;
    const samples = [...document.querySelectorAll('main *')]
      .filter((element) => {
        const htmlElement = element as HTMLElement;
        const style = window.getComputedStyle(htmlElement);
        const rect = htmlElement.getBoundingClientRect();
        return (
          !htmlElement.closest('[aria-hidden="true"], [inert], [data-scroll-container="local"]') &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0 &&
          (rect.left < -2 || rect.right > viewportWidth + 2)
        );
      })
      .slice(0, 8)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return `${element.tagName.toLowerCase()}.${[...element.classList].slice(0, 2).join('.')} (${Math.round(rect.left)}..${Math.round(rect.right)}px)`;
      });

    return { documentOverflow, samples };
  });

  expect(
    overflowAudit.documentOverflow,
    `${context} criou overflow horizontal: ${overflowAudit.samples.join(', ') || 'sem amostra'}`
  ).toBeLessThanOrEqual(2);
  expect(overflowAudit.samples, `${context} possui elementos fora do viewport`).toEqual([]);
}

async function expectInteractiveTargetsMeet44px(page: Page, context: string): Promise<void> {
  const undersizedTargets = await page
    .locator(
      'main button, main a[href], main input, main select, main textarea, main [role="button"]'
    )
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const htmlElement = element as HTMLElement;
          const style = window.getComputedStyle(htmlElement);
          const rect = htmlElement.getBoundingClientRect();
          const name =
            htmlElement.getAttribute('aria-label') ||
            htmlElement.textContent?.trim().replace(/\s+/g, ' ') ||
            htmlElement.tagName.toLowerCase();
          return {
            name,
            tag: htmlElement.tagName.toLowerCase(),
            width: rect.width,
            height: rect.height,
            visible:
              !htmlElement.closest('[aria-hidden="true"], [inert]') &&
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              Number(style.opacity) !== 0 &&
              rect.width > 0 &&
              rect.height > 0
          };
        })
        .filter((target) => target.visible && (target.width < 44 || target.height < 44))
    );

  expect(undersizedTargets, `${context} possui alvos interativos menores que 44px`).toEqual([]);
}

async function captureEphemeralScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string
): Promise<void> {
  const image = await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: false
  });

  await testInfo.attach(name, { body: image, contentType: 'image/png' });
  expect(image.byteLength, `${name} should contain rendered pixels`).toBeGreaterThan(1_000);
}

async function openWorkflowTasksPage(page: Page, failFirstRequest = false): Promise<WorkflowStub> {
  const stub = await stubWorkflowTasks(page, failFirstRequest);
  await loginViaToken(page);
  await page.goto(`${SPA_URL}/workflow-tasks`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Pendências clínicas' })).toBeVisible({
    timeout: 15_000
  });
  return stub;
}

for (const viewport of viewports) {
  test.describe(`P0 visual — pendências clínicas — ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile
    });

    test('renderiza estados clínicos, foco, Axe, overflow e alvos operáveis', async ({
      page
    }, testInfo) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      const stub = await openWorkflowTasksPage(page);
      const queue = page.getByRole('region', { name: 'Fila de pendências clínicas' });
      await expect(queue).toBeVisible();
      await expect(page.locator('tbody tr')).toHaveCount(workflowTasks.length);

      const summary = page.getByLabel('Resumo da fila clínica');
      await expect(summary.locator('strong')).toHaveText(['2', '1', '1', '2']);

      const pendingRow = page
        .locator('tbody tr')
        .filter({ hasText: 'Retorno pós-alta prioritário' });
      await expect(pendingRow).toBeVisible();
      await expect(pendingRow).toContainText('Pendente');
      await expect(pendingRow).toContainText('Crítica');
      await expect(pendingRow).toContainText('Em atraso');
      await expect(pendingRow.getByRole('button', { name: 'Reconhecer' })).toBeVisible();
      await expect(pendingRow.getByRole('button', { name: 'Concluir' })).toBeVisible();

      await pendingRow.getByRole('button', { name: 'Detalhes' }).click();
      const detailCard = page.locator('.workflow-tasks-layout > .ds-card').nth(1);
      await expect(
        detailCard.getByRole('heading', { name: 'Retorno pós-alta prioritário' })
      ).toBeVisible();

      const cancelReason = detailCard.getByLabel('Motivo do cancelamento');
      const cancelButton = detailCard.getByRole('button', { name: 'Cancelar tarefa' });
      await expect(cancelReason).toBeVisible();
      await expect(cancelButton).toBeDisabled();
      await cancelReason.fill('Retorno não será executado');
      await expect(cancelButton).toBeEnabled();

      const dlqRow = page.locator('tbody tr').filter({ hasText: 'Reprocessar laudo laboratorial' });
      await dlqRow.getByRole('button', { name: 'Detalhes' }).click();
      await expect(detailCard).toContainText('Última falha: Serviço laboratorial indisponível');
      await expect(detailCard.getByRole('button', { name: 'Reprocessar' })).toBeVisible();

      await expectSkipLinkAndMainFocus(page);
      await expectNoDocumentOverflow(page, `workflow-tasks ${viewport.name}`);
      await expectInteractiveTargetsMeet44px(page, `workflow-tasks ${viewport.name}`);
      await expectAccessible(page, `workflow-tasks populated ${viewport.name}`);
      await stabilizeVisual(page, { expandSidebar: !viewport.isMobile, hideTimestamps: false });
      await captureEphemeralScreenshot(page, testInfo, `workflow-tasks-populated-${viewport.name}`);

      expect(stub.getRequests()).toBeGreaterThanOrEqual(1);
      expect(stub.requestedQueries[0]).toContain('limit=200');
      expect(pageErrors, `workflow-tasks ${viewport.name} emitted page errors`).toEqual([]);
    });

    test('expõe erro de carregamento e recupera pela atualização', async ({ page }, testInfo) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      const stub = await openWorkflowTasksPage(page, true);
      const alert = page
        .getByRole('alert')
        .filter({ hasText: 'Fila clínica temporariamente indisponível' });
      await expect(alert).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Nenhuma pendência encontrada' })
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Atualizar' })).toBeEnabled();

      await expectSkipLinkAndMainFocus(page);
      await expectNoDocumentOverflow(page, `workflow-tasks error ${viewport.name}`);
      await expectInteractiveTargetsMeet44px(page, `workflow-tasks error ${viewport.name}`);
      await expectAccessible(page, `workflow-tasks error ${viewport.name}`);
      await stabilizeVisual(page, { expandSidebar: !viewport.isMobile, hideTimestamps: false });
      await captureEphemeralScreenshot(page, testInfo, `workflow-tasks-error-${viewport.name}`);

      await page.getByRole('button', { name: 'Atualizar' }).click();
      await expect(page.getByRole('region', { name: 'Fila de pendências clínicas' })).toBeVisible();
      await expect(page.locator('tbody tr')).toHaveCount(workflowTasks.length);
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expectAccessible(page, `workflow-tasks recovered ${viewport.name}`);
      await expectNoDocumentOverflow(page, `workflow-tasks recovered ${viewport.name}`);
      await expectInteractiveTargetsMeet44px(page, `workflow-tasks recovered ${viewport.name}`);
      await captureEphemeralScreenshot(page, testInfo, `workflow-tasks-recovered-${viewport.name}`);

      expect(stub.getRequests()).toBe(2);
      expect(pageErrors, `workflow-tasks error ${viewport.name} emitted page errors`).toEqual([]);
    });
  });
}

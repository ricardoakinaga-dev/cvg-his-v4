import { type Locator, type Page, type TestInfo } from '@playwright/test';
import { expect, loginViaToken, test } from './fixtures/spa-fixture';
import { stabilizeVisual, waitForPageSettled } from './visual/stabilize-visual';

const SPA_URL = process.env.SPA_URL || 'http://localhost:3102';

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function stabilizeMobile360(page: Page): Promise<void> {
  await stabilizeVisual(page, {
    expandSidebar: false,
    hideTimestamps: false,
    extraCss: `
      html, body, #app {
        max-width: 100vw !important;
        overflow-x: hidden !important;
      }
      html {
        scroll-behavior: auto !important;
      }
    `
  });
}

async function expectNoDocumentHorizontalOverflow(page: Page, context: string): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow, `${context} should not create document-level horizontal overflow`).toBeLessThanOrEqual(1);
}

async function expectVisibleInsideViewport(
  page: Page,
  locator: Locator,
  label: string
): Promise<void> {
  await locator.evaluate((element) => {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  });
  await expect(locator, `${label} should be visible after mobile scroll`).toBeVisible();
  const viewport = page.viewportSize();
  const bounds = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left };
  });
  expect(viewport).not.toBeNull();
  expect(bounds.top, `${label} should start inside the mobile viewport`).toBeGreaterThanOrEqual(-1);
  expect(bounds.left, `${label} should start inside the mobile viewport`).toBeGreaterThanOrEqual(-1);
  expect(bounds.bottom, `${label} should end inside the mobile viewport`).toBeLessThanOrEqual(
    (viewport?.height ?? 0) + 1
  );
  expect(bounds.right, `${label} should end inside the mobile viewport`).toBeLessThanOrEqual(
    (viewport?.width ?? 0) + 1
  );
}

async function clickAtCenter(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function captureMobileEvidence(
  page: Page,
  testInfo: TestInfo,
  filename: string
): Promise<void> {
  const evidenceRegion = page.locator('main').first();
  await expect(evidenceRegion, `${filename} should have a main evidence region`).toBeVisible();
  const bounds = await evidenceRegion.boundingBox();
  expect(bounds, `${filename} should have measurable evidence bounds`).not.toBeNull();
  if (!bounds) return;
  const screenshot = await page.screenshot({
    path: testInfo.outputPath(filename),
    animations: 'disabled',
    clip: {
      x: Math.max(0, bounds.x),
      y: Math.max(0, bounds.y),
      width: Math.max(1, bounds.width),
      height: Math.max(1, bounds.height)
    }
  });

  expect(screenshot.length, `${filename} should contain rendered pixels`).toBeGreaterThan(10_000);
}

test.describe('Busca Mestre 360 mobile visual', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  test('mantem jornada 360 legivel em viewport mobile', async ({
    page,
    apiCall,
    cleanup
  }, testInfo) => {
    const suffix = uniqueSuffix();
    const ownerName = `Tutor Mobile 360 ${suffix}`;
    const patientName = `Paciente Mobile 360 ${suffix}`;

    const owner = await apiCall.post('/owners', {
      fullName: ownerName,
      documentId: `MOB360-${suffix}`,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
      financialResponsible: true,
      status: 'active'
    });
    cleanup.track({ type: 'owner', id: owner.id });

    const patient = await apiCall.post('/patients', {
      name: patientName,
      species: 'canine',
      sex: 'female',
      primaryOwnerId: owner.id,
      chronicDisease: 'Cardiopatia controlada mobile',
      status: 'active'
    });
    cleanup.track({ type: 'patient', id: patient.id });

    const encounter = await apiCall.post('/encounters', {
      patientId: patient.id,
      ownerId: owner.id,
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Pedido laboratorial mobile 360'
    });
    cleanup.track({ type: 'encounter', id: encounter.id });

    await apiCall.post('/laboratory/orders', {
      encounterId: encounter.id,
      patientId: patient.id,
      examType: 'Hemograma',
      reason: 'Prioridade 360 mobile'
    });

    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/master-search`);
    await waitForPageSettled(page, {
      contentSelector: 'main, h1, h2, [role="heading"]',
      timeout: 15000
    });
    await stabilizeMobile360(page);

    await page.getByPlaceholder(/buscar por tutor, paciente/i).fill(patientName);
    await clickAtCenter(page, page.getByRole('button', { name: 'Buscar', exact: true }));

    const prioritySummary = page.getByLabel('Resumo Prioridade 360');
    await expectVisibleInsideViewport(page, prioritySummary, 'Resumo Prioridade 360');
    await expect(prioritySummary).toContainText('Exames pendentes');
    await expectNoDocumentHorizontalOverflow(page, 'Busca Mestre mobile');
    await captureMobileEvidence(page, testInfo, 'mobile-360-master-search.png');

    const patientRow = page.locator('tbody tr').filter({ hasText: patientName }).first();
    await expect(patientRow).toBeVisible({ timeout: 15000 });
    await expect(patientRow).toContainText('Exames pendentes');
    await patientRow.getByRole('link', { name: 'Abrir cockpit' }).click();

    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`), { timeout: 15000 });
    const cockpit360 = page.getByLabel('Cockpit 360 do paciente');
    await expectVisibleInsideViewport(page, cockpit360, 'Cockpit 360 do paciente');
    await expect(cockpit360).toContainText('1 exame(s) pendente(s)');
    await expectNoDocumentHorizontalOverflow(page, 'Cockpit 360 mobile');
    await captureMobileEvidence(page, testInfo, 'mobile-360-cockpit.png');

    await page.goto(`${SPA_URL}/reception`);
    await waitForPageSettled(page, {
      contentSelector: 'main, h1, h2, [role="heading"]',
      timeout: 15000
    });
    await stabilizeMobile360(page);

    const receptionSearch = page.getByRole('search');
    await receptionSearch.getByPlaceholder(/buscar tutor ou paciente/i).fill(patientName);
    await clickAtCenter(page, receptionSearch.getByRole('button', { name: 'Buscar', exact: true }));

    const quickActions = page.getByLabel('Acoes rapidas contextuais da recepcao');
    await expectVisibleInsideViewport(page, quickActions, 'Acoes rapidas contextuais da recepcao');
    await expect(quickActions).toContainText('Prioridade 360');
    await expect(quickActions).toContainText('Exames pendentes');
    await expectNoDocumentHorizontalOverflow(page, 'Recepcao mobile');
    await captureMobileEvidence(page, testInfo, 'mobile-360-reception.png');
  });
});

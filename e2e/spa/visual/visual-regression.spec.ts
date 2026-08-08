import { test, expect, type Page } from '@playwright/test';
import { stabilizeVisual, waitForPageSettled, pageProfiles } from './stabilize-visual';
import { loginViaToken } from '../fixtures/spa-fixture';

/**
 * SPA E2E — Visual Regression Tests (Fases 2.27b + 2.28)
 *
 * Captures screenshots of SPA pages to detect visual regressions.
 *
 * Strategy:
 * - Fixed viewport (1280x720) for consistency
 * - CSS injection to disable animations, transitions, shimmer effects
 * - Deterministic waits (no arbitrary timeouts)
 * - Light theme forced, sidebar expanded, user name hidden
 * - UUID patterns and timestamps redacted via CSS
 * - Per-page maxDiffPixels tuned by content volatility
 *
 * Execution:
 *   pnpm test:visual              — run all visual tests
 *   pnpm test:visual:update       — update baseline snapshots
 *   pnpm test:visual:ci           — run in CI mode (no update)
 *
 * Update snapshots:
 *   npx playwright test --config playwright-spa.config.ts -g "Visual" --update-snapshots
 */

const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3102';
const API_URL = process.env.API_URL || 'http://127.0.0.1:3111';
const HEADING_SELECTOR = 'h1, h2, h3, [role="heading"]';
const VISUAL_OWNER_NAME = 'Maria Visual Snapshot';
const VISUAL_OWNER_DOCUMENT = 'VISUAL-OWNER-001';
const VISUAL_PATIENT_NAME = 'Luna Visual Snapshot';

test.describe('Visual Regression — List Pages', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('login page', async ({ page }) => {
    await page.goto(`${SPA_URL}/login`);
    await waitForPageSettled(page, {
      contentSelector: '#email',
      timeout: 10000
    });

    await stabilizeVisual(page, pageProfiles.login);

    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixels: 50,
      fullPage: false
    });
  });

  test('owners list page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    const owner = await createVisualOwner(token);

    try {
      await navigateTo(page, '/owners');
      await waitForPageSettled(page, {
        contentSelector: HEADING_SELECTOR,
        timeout: 15000
      });
      await keepCanonicalTableRows(page, [owner.id]);
      await normalizeMetricValues(page, '.summary-card__value', ['00', '00', '00', '00']);
      await normalizeOwnersTable(page);

      await stabilizeVisual(page, pageProfiles.listPage);

      await expect(page).toHaveScreenshot('owners-list-page.png', {
        maxDiffPixels: 100,
        fullPage: false
      });
    } finally {
      await deleteVisualResource(token, `/owners/${owner.id}`);
    }
  });

  test('patients list page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    const owner = await createVisualOwner(token);
    const patient = await createVisualPatient(token, owner.id);

    try {
      await navigateTo(page, '/patients');
      await waitForPageSettled(page, {
        contentSelector: HEADING_SELECTOR,
        timeout: 15000
      });
      await keepCanonicalTableRows(page, [patient.id]);
      await normalizeMetricValues(page, '.overview-metric__value, .summary-card__value', ['00', '00', '00', '00']);
      await normalizePatientsTable(page);

      await stabilizeVisual(page, pageProfiles.listPage);

      await expect(page).toHaveScreenshot('patients-list-page.png', {
        maxDiffPixels: 100,
        fullPage: false
      });
    } finally {
      await deleteVisualResource(token, `/patients/${patient.id}`);
      await deleteVisualResource(token, `/owners/${owner.id}`);
    }
  });

  test('appointments kanban page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    const owner = await createVisualOwner(token);
    const patient = await createVisualPatient(token, owner.id);
    const appointment = await createVisualAppointment(token, patient.id, owner.id);

    try {
      await stubVisualSchedulingOverview(page, appointment.id);
      await navigateTo(page, '/appointments');

      await page
        .getByRole('button', { name: `Selecionar ${appointment.referenceDate}`, exact: true })
        .click();

      const canonicalCard = page.locator('.timeline-item', { hasText: 'Luna' }).first();
      await expect(canonicalCard, 'Visual appointment must be created through the API').toBeVisible({
        timeout: 15000
      });

      await waitForPageSettled(page, {
        contentSelector: '.appointments-cockpit__layout',
        timeout: 15000
      });
      await keepCanonicalKanbanCards(page, 'Luna');
      await normalizeVisualText(page, { [VISUAL_PATIENT_NAME]: 'Luna' });

      await stabilizeVisual(page, pageProfiles.kanbanPage);

      await expect(page).toHaveScreenshot('appointments-kanban-page.png', {
        maxDiffPixels: 150,
        fullPage: false
      });
    } finally {
      await deleteVisualResource(token, `/appointments/${appointment.id}`);
      await deleteVisualResource(token, `/patients/${patient.id}`);
      await deleteVisualResource(token, `/owners/${owner.id}`);
    }
  });

  test('encounters list page', async ({ page }) => {
    await ensureAuthToken(page);

    await stubEmptyCollection(page, '/encounters');
    await navigateTo(page, '/encounters');
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });
    await clearDynamicTableRows(page);
    await normalizeEmptyState(page, '.encounters-list-page .data-table-wrapper', {
      icon: '🩺',
      text: 'Nenhum atendimento encontrado',
      action: '+ Abrir Atendimento'
    });
    await normalizeMetricValues(page, '.overview-metric__value', ['00', '00', '00', '00']);

    await stabilizeVisual(page, pageProfiles.listPage);

    await expect(page).toHaveScreenshot('encounters-list-page.png', {
      maxDiffPixels: 100,
      fullPage: false
    });
  });

  test('inpatient list page', async ({ page }) => {
    await ensureAuthToken(page);

    await stubEmptyCollection(page, '/inpatient');
    await navigateTo(page, '/inpatient');
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });
    await clearDynamicTableRows(page);

    await stabilizeVisual(page, pageProfiles.listPage);

    await expect(page).toHaveScreenshot('inpatient-list-page.png', {
      maxDiffPixels: 100,
      fullPage: false
    });
  });

  test('billing list page', async ({ page }) => {
    await ensureAuthToken(page);

    await stubEmptyFinancialReceivables(page);
    await navigateTo(page, '/billing');
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });
    await clearDynamicTableRows(page);
    await normalizeEmptyState(page, '.billing-list-page .data-table-wrapper', {
      icon: '💰',
      text: 'Nenhum registro de faturamento',
      hint: 'Os registros aparecem quando atendimentos são abertos.'
    });
    await normalizeBillingOverview(page);

    await stabilizeVisual(page, pageProfiles.listPage);

    await expect(page).toHaveScreenshot('billing-list-page.png', {
      maxDiffPixels: 100,
      fullPage: false
    });
  });
});

test.describe('Visual Regression — Detail Pages', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('owner detail page', async ({ page }) => {
    const token = await ensureAuthToken(page);

    const owner = await createVisualOwner(token);

    try {
      await navigateTo(page, `/owners/${owner.id}`);
      await waitForPageSettled(page, {
        contentSelector: HEADING_SELECTOR,
        timeout: 15000
      });
      await normalizeVisualText(page, {
        [owner.id]: 'owner_maria_silva',
        [owner.documentId]: VISUAL_OWNER_DOCUMENT
      });

      await stabilizeVisual(page, pageProfiles.detailPage);

      await expect(page).toHaveScreenshot('owner-detail-page.png', {
        maxDiffPixels: 120,
        fullPage: false
      });
    } finally {
      await deleteVisualResource(token, `/owners/${owner.id}`);
    }
  });

  test('patient detail page', async ({ page }) => {
    const token = await ensureAuthToken(page);

    const owner = await createVisualOwner(token);
    const patient = await createVisualPatient(token, owner.id);

    try {
      await navigateTo(page, `/patients/${patient.id}`);
      await waitForPageSettled(page, {
        contentSelector: HEADING_SELECTOR,
        timeout: 15000
      });
      await normalizeVisualText(page, {
        [owner.documentId]: VISUAL_OWNER_DOCUMENT,
        [patient.name]: VISUAL_PATIENT_NAME,
        ...(patient.legacyVetusId ? { [String(patient.legacyVetusId)]: '1' } : {})
      });
      await normalizeDateTimes(page);
      await normalizePatientIdentifiers(page);

      await stabilizeVisual(page, pageProfiles.detailPage);

      await expect(page).toHaveScreenshot('patient-detail-page.png', {
        maxDiffPixels: 120,
        fullPage: false
      });
    } finally {
      await deleteVisualResource(token, `/patients/${patient.id}`);
      await deleteVisualResource(token, `/owners/${owner.id}`);
    }
  });

  test('encounter detail page', async ({ page }) => {
    const token = await ensureAuthToken(page);

    const owner = await createVisualOwner(token);
    const patient = await createVisualPatient(token, owner.id);
    const encounter = await createVisualEncounter(token, patient.id, owner.id);

    try {
      await navigateTo(page, `/encounters/${encounter.id}`);
      await waitForPageSettled(page, {
        contentSelector: HEADING_SELECTOR,
        timeout: 15000
      });
      await normalizeVisualText(page, {
        [owner.documentId]: VISUAL_OWNER_DOCUMENT,
        [patient.name]: VISUAL_PATIENT_NAME
      });

      await stabilizeVisual(page, pageProfiles.detailPage);

      await expect(page).toHaveScreenshot('encounter-detail-page.png', {
        maxDiffPixels: 150,
        fullPage: false
      });
    } finally {
      await deleteVisualResource(token, `/encounters/${encounter.id}`);
      await deleteVisualResource(token, `/patients/${patient.id}`);
      await deleteVisualResource(token, `/owners/${owner.id}`);
    }
  });

  test('billing detail page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    const owner = await createVisualOwner(token);
    const patient = await createVisualPatient(token, owner.id);
    const encounter = await createVisualEncounter(token, patient.id, owner.id);
    await createVisualBillingEstimate(token, encounter.id);

    try {
      await navigateTo(page, `/billing/${encounter.id}`);
      await waitForPageSettled(page, {
        contentSelector: HEADING_SELECTOR,
        timeout: 15000
      });
      await normalizeVisualText(page, {
        [owner.documentId]: VISUAL_OWNER_DOCUMENT,
        [patient.name]: VISUAL_PATIENT_NAME,
        [encounter.id]: 'encounter_visual',
        [encounter.id.slice(0, 8)]: 'encounter_visual'
      });

      await stabilizeVisual(page, pageProfiles.detailPage);

      await expect(page).toHaveScreenshot('billing-detail-page.png', {
        maxDiffPixels: 150,
        fullPage: false
      });
    } finally {
      await deleteVisualResource(token, `/encounters/${encounter.id}`);
      await deleteVisualResource(token, `/patients/${patient.id}`);
      await deleteVisualResource(token, `/owners/${owner.id}`);
    }
  });

  test('appointment detail page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    const owner = await createVisualOwner(token);
    const patient = await createVisualPatient(token, owner.id);
    const appointment = await createVisualAppointment(token, patient.id, owner.id);

    try {
      await navigateTo(page, `/appointments/${appointment.id}`);
      await waitForPageSettled(page, {
        contentSelector: HEADING_SELECTOR,
        timeout: 15000
      });
      await normalizeVisualText(page, {
        [owner.documentId]: VISUAL_OWNER_DOCUMENT,
        [patient.name]: VISUAL_PATIENT_NAME
      });

      await stabilizeVisual(page, pageProfiles.detailPage);

      await expect(page).toHaveScreenshot('appointment-detail-page.png', {
        maxDiffPixels: 150,
        fullPage: false
      });
    } finally {
      await deleteVisualResource(token, `/appointments/${appointment.id}`);
      await deleteVisualResource(token, `/patients/${patient.id}`);
      await deleteVisualResource(token, `/owners/${owner.id}`);
    }
  });
});

test.describe('Visual Regression — Theme and Responsive Shell', () => {
  test.describe('dark desktop', () => {
    test.use({ viewport: { width: 1280, height: 720 }, colorScheme: 'dark' });

    test('owners list page', async ({ page }) => {
      await captureOwnerListVisual(page, 'owners-list-page-dark.png', {
        forceLightTheme: false
      });
    });

    test('dashboard page', async ({ page }) => {
      await captureDashboardVisual(page, 'dashboard-page-dark.png');
    });

    test('patient detail page', async ({ page }) => {
      await capturePatientDetailVisual(page, 'patient-detail-page-dark.png');
    });

    test('encounter detail page', async ({ page }) => {
      await captureEncounterDetailVisual(page, 'encounter-detail-page-dark.png');
    });

    test('medical record detail page', async ({ page }) => {
      await captureMedicalRecordVisual(page, 'medical-record-detail-page-dark.png');
    });

    test('appointments kanban page', async ({ page }) => {
      await captureAppointmentsVisual(page, 'appointments-kanban-page-dark.png');
    });

    test('counter sales page', async ({ page }) => {
      await capturePageVisual(page, '/counter-sales', '.counter-sales-page', 'counter-sales-page-dark.png');
    });

    test('reception gateway page', async ({ page }) => {
      await capturePageVisual(page, '/reception', '.reception-gateway-page', 'reception-gateway-page-dark.png');
    });

    test('queue page', async ({ page }) => {
      await capturePageVisual(page, '/queue', '.queue-page', 'queue-page-dark.png');
    });
  });

  test.describe('mobile light', () => {
    test.use({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });

    test('owners list page', async ({ page }) => {
      await captureOwnerListVisual(page, 'owners-list-page-mobile.png', {
        expandSidebar: false
      });
    });

    test('appointments kanban page', async ({ page }) => {
      await captureAppointmentsVisual(page, 'appointments-kanban-page-mobile.png', {
        expandSidebar: false
      });
    });
  });

  test.describe('mobile dark', () => {
    test.use({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });

    test('owners list page', async ({ page }) => {
      await captureOwnerListVisual(page, 'owners-list-page-mobile-dark.png', {
        forceLightTheme: false,
        expandSidebar: false
      });
    });

    test('appointments kanban page', async ({ page }) => {
      await captureAppointmentsVisual(page, 'appointments-kanban-page-mobile-dark.png', {
        forceLightTheme: false,
        expandSidebar: false
      });
    });
  });
});

async function captureOwnerListVisual(
  page: Page,
  screenshotName: string,
  stabilization: Parameters<typeof stabilizeVisual>[1]
): Promise<void> {
  const token = await ensureAuthToken(page);
  const owner = await createVisualOwner(token);

  try {
    await navigateTo(page, '/owners');
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });
    await keepCanonicalTableRows(page, [owner.id]);
    await normalizeMetricValues(page, '.summary-card__value', ['00', '00', '00', '00']);
    await normalizeOwnersTable(page);

    if (stabilization.forceLightTheme === false) {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.style.colorScheme = 'dark';
      });
    }

    await stabilizeVisual(page, {
      ...pageProfiles.listPage,
      ...stabilization
    });

    await expect(page).toHaveScreenshot(screenshotName, {
      maxDiffPixels: 180,
      fullPage: false
    });
  } finally {
    await deleteVisualResource(token, `/owners/${owner.id}`);
  }
}

async function capturePatientDetailVisual(page: Page, screenshotName: string): Promise<void> {
  const token = await ensureAuthToken(page);
  const owner = await createVisualOwner(token);
  const patient = await createVisualPatient(token, owner.id);

  try {
    await navigateTo(page, `/patients/${patient.id}`);
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });
    await normalizeVisualText(page, {
      [owner.documentId]: VISUAL_OWNER_DOCUMENT,
      [patient.name]: VISUAL_PATIENT_NAME,
      ...(patient.legacyVetusId ? { [String(patient.legacyVetusId)]: '1' } : {})
    });
    await normalizeDateTimes(page);
    await normalizePatientIdentifiers(page);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    });

    await stabilizeVisual(page, {
      ...pageProfiles.detailPage,
      forceLightTheme: false
    });

    await expect(page).toHaveScreenshot(screenshotName, {
      maxDiffPixels: 220,
      fullPage: false
    });
  } finally {
    await deleteVisualResource(token, `/patients/${patient.id}`);
    await deleteVisualResource(token, `/owners/${owner.id}`);
  }
}

async function captureEncounterDetailVisual(page: Page, screenshotName: string): Promise<void> {
  const token = await ensureAuthToken(page);
  const owner = await createVisualOwner(token);
  const patient = await createVisualPatient(token, owner.id);
  const encounter = await createVisualEncounter(token, patient.id, owner.id);

  try {
    await navigateTo(page, `/encounters/${encounter.id}`);
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });
    await normalizeVisualText(page, {
      [owner.documentId]: VISUAL_OWNER_DOCUMENT,
      [patient.name]: VISUAL_PATIENT_NAME
    });
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    });

    await stabilizeVisual(page, {
      ...pageProfiles.detailPage,
      forceLightTheme: false
    });

    await expect(page).toHaveScreenshot(screenshotName, {
      maxDiffPixels: 220,
      fullPage: false
    });
  } finally {
    await deleteVisualResource(token, `/encounters/${encounter.id}`);
    await deleteVisualResource(token, `/patients/${patient.id}`);
    await deleteVisualResource(token, `/owners/${owner.id}`);
  }
}

async function captureMedicalRecordVisual(page: Page, screenshotName: string): Promise<void> {
  const token = await ensureAuthToken(page);
  const owner = await createVisualOwner(token);
  const patient = await createVisualPatient(token, owner.id);
  const encounter = await createVisualEncounter(token, patient.id, owner.id);

  try {
    await navigateTo(page, `/medical-records/${encounter.id}`);
    await waitForPageSettled(page, {
      contentSelector: '.medical-records-detail-page',
      timeout: 15000
    });
    await normalizeVisualText(page, {
      [owner.documentId]: VISUAL_OWNER_DOCUMENT,
      [patient.name]: VISUAL_PATIENT_NAME
    });
    await normalizeDateTimes(page);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    });

    await stabilizeVisual(page, {
      ...pageProfiles.detailPage,
      forceLightTheme: false
    });

    await expect(page).toHaveScreenshot(screenshotName, {
      maxDiffPixels: 260,
      fullPage: false
    });
  } finally {
    await deleteVisualResource(token, `/encounters/${encounter.id}`);
    await deleteVisualResource(token, `/patients/${patient.id}`);
    await deleteVisualResource(token, `/owners/${owner.id}`);
  }
}

async function captureDashboardVisual(page: Page, screenshotName: string): Promise<void> {
  await ensureAuthToken(page);
  await navigateTo(page, '/');
  await waitForPageSettled(page, {
    contentSelector: '.dashboard-page',
    timeout: 15000
  });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  });

  await stabilizeVisual(page, {
    ...pageProfiles.detailPage,
    forceLightTheme: false
  });

  await expect(page).toHaveScreenshot(screenshotName, {
    maxDiffPixels: 500,
    fullPage: false
  });
}

async function capturePageVisual(
  page: Page,
  route: string,
  contentSelector: string,
  screenshotName: string
): Promise<void> {
  await ensureAuthToken(page);
  await navigateTo(page, route);
  await waitForPageSettled(page, {
    contentSelector,
    timeout: 15000
  });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  });

  await stabilizeVisual(page, {
    ...pageProfiles.detailPage,
    forceLightTheme: false
  });

  await expect(page).toHaveScreenshot(screenshotName, {
    maxDiffPixels: 500,
    fullPage: false
  });
}

async function captureAppointmentsVisual(
  page: Page,
  screenshotName: string,
  stabilization: Parameters<typeof stabilizeVisual>[1] = { forceLightTheme: false }
): Promise<void> {
  const token = await ensureAuthToken(page);
  const owner = await createVisualOwner(token);
  const patient = await createVisualPatient(token, owner.id);
  const appointment = await createVisualAppointment(token, patient.id, owner.id);

  try {
    await stubVisualSchedulingOverview(page, appointment.id);
    await navigateTo(page, '/appointments');
    await page
      .getByRole('button', { name: `Selecionar ${appointment.referenceDate}`, exact: true })
      .click();

    const canonicalCard = page.locator('.timeline-item', { hasText: VISUAL_PATIENT_NAME }).first();
    await expect(canonicalCard, 'Visual appointment must be created through the API').toBeVisible({
      timeout: 15000
    });
    await waitForPageSettled(page, {
      contentSelector: '.appointments-cockpit__layout',
      timeout: 15000
    });
    await keepCanonicalKanbanCards(page, 'Luna');
    await normalizeVisualText(page, { [VISUAL_PATIENT_NAME]: 'Luna' });
    if (stabilization.forceLightTheme === false) {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.style.colorScheme = 'dark';
      });
    }

    await stabilizeVisual(page, {
      ...pageProfiles.kanbanPage,
      ...stabilization
    });

    await expect(page).toHaveScreenshot(screenshotName, {
      maxDiffPixels: 240,
      fullPage: false
    });
  } finally {
    await deleteVisualResource(token, `/appointments/${appointment.id}`);
    await deleteVisualResource(token, `/patients/${patient.id}`);
    await deleteVisualResource(token, `/owners/${owner.id}`);
  }
}

async function ensureAuthToken(page: Page): Promise<string> {
  await loginViaToken(page);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

  const token = process.env.E2E_AUTH_TOKEN;
  expect(token, 'E2E_AUTH_TOKEN must be available after browser login').toBeTruthy();
  return token as string;
}

async function createVisualOwner(token: string): Promise<{ id: string; documentId: string }> {
  const documentId = `VISUAL-OWNER-${Date.now()}`;
  const response = await fetch(`${API_URL}/owners`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      fullName: VISUAL_OWNER_NAME,
      documentId,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999990001', primary: true }],
      financialResponsible: true,
      status: 'active'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create visual owner: ${response.status} ${await response.text()}`);
  }

  const owner = (await response.json()) as { id: string };
  return { ...owner, documentId };
}

async function createVisualPatient(
  token: string,
  ownerId: string
): Promise<{ id: string; name: string; legacyVetusId?: string | number }> {
  const response = await fetch(`${API_URL}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: VISUAL_PATIENT_NAME,
      species: 'canine',
      sex: 'female',
      breed: 'SRD',
      primaryOwnerId: ownerId,
      status: 'active'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create visual patient: ${response.status} ${await response.text()}`);
  }

  const patient = (await response.json()) as { id: string; legacyVetusId?: string | number };
  return { ...patient, name: VISUAL_PATIENT_NAME };
}

async function createVisualEncounter(
  token: string,
  patientId: string,
  ownerId: string
): Promise<{ id: string }> {
  const response = await fetch(`${API_URL}/encounters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      patientId,
      ownerId,
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Visual regression encounter'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create visual encounter: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as { id: string };
}

async function createVisualBillingEstimate(token: string, encounterId: string): Promise<void> {
  const response = await fetch(`${API_URL}/billing/estimate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ encounterId, administrativeNotes: 'Visual regression billing' })
  });

  if (!response.ok) {
    throw new Error(`Failed to create visual billing estimate: ${response.status} ${await response.text()}`);
  }
}

async function createVisualAppointment(
  token: string,
  patientId: string,
  ownerId: string
): Promise<{ id: string; referenceDate: string }> {
  const scheduledAt = new Date();
  scheduledAt.setHours(10, 0, 0, 0);
  const response = await fetch(`${API_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      patientId,
      ownerId,
      scheduledAt: scheduledAt.toISOString(),
      visitType: 'scheduled',
      reason: 'Visual regression appointment'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create visual appointment: ${response.status} ${await response.text()}`);
  }

  const appointment = (await response.json()) as { id: string };
  return { ...appointment, referenceDate: scheduledAt.toISOString().slice(0, 10) };
}

async function stubVisualSchedulingOverview(page: Page, appointmentId: string): Promise<void> {
  await page.route('**/scheduling/overview*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    const response = await route.fetch();
    const payload = (await response.json()) as {
      items?: Array<{ id: string; practitionerStaffId?: string }>;
      professionals?: unknown[];
      blocks?: unknown[];
      stats?: Record<string, unknown>;
    };
    const items = (payload.items ?? []).filter((item) => item.id === appointmentId);
    const professionals = [
      {
        id: 'visual-nurse',
        fullName: 'Enfermagem Inicial',
        department: 'Triagem',
        jobTitle: 'Enfermeira',
        specialty: 'Enfermagem',
        unit: 'Triagem',
        status: 'active'
      },
      {
        id: 'visual-vet',
        fullName: 'Veterinario Responsavel',
        department: 'Clinica',
        jobTitle: 'Medico Veterinario',
        specialty: 'Clinica geral',
        unit: 'Clinica',
        status: 'active'
      }
    ];
    const referenceDate = new URL(route.request().url()).searchParams.get('referenceDate')
      ?? new Date().toISOString().slice(0, 10);
    const blocks = professionals.map((professional, index) => ({
      id: `visual-block-${index}`,
      accountId: 'visual-account',
      title: 'Intervalo operacional',
      kind: 'lunch_break',
      startsAt: `${referenceDate}T12:00:00.000Z`,
      endsAt: `${referenceDate}T13:00:00.000Z`,
      practitionerStaffId: professional.id,
      unit: professional.unit,
      resourceLabel: undefined
    }));

    await route.fulfill({
      response,
      json: {
        ...payload,
        items,
        professionals,
        blocks,
        stats: {
          ...(payload.stats ?? {}),
          total: items.length,
          scheduled: items.filter((item) => !item.practitionerStaffId).length,
          checkedIn: 0,
          completed: 0,
          cancelled: 0,
          conflicts: 0,
          unassigned: items.length
        }
      }
    });
  });
}

async function deleteVisualResource(token: string, path: string): Promise<void> {
  if (path.startsWith('/appointments/')) {
    const appointmentId = path.split('/')[2];
    const cancelResponse = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reason: 'Visual E2E cleanup' })
    });
    if (!cancelResponse.ok && cancelResponse.status !== 404) {
      throw new Error(`Failed to cancel visual resource ${path}: ${cancelResponse.status}`);
    }
    return;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete visual resource ${path}: ${response.status}`);
  }
}

async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(`${SPA_URL}${route}`);
  await page.waitForLoadState('networkidle');
}

async function normalizeVisualText(page: Page, replacements: Record<string, string>): Promise<void> {
  await page.evaluate((entries) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      if (node.textContent) {
        let nextText = node.textContent;
        for (const [searchValue, replacementValue] of entries) {
          if (searchValue) {
            nextText = nextText.split(searchValue).join(replacementValue);
          }
        }
        if (nextText !== node.textContent) {
          node.textContent = nextText;
        }
      }
      node = walker.nextNode();
    }
  }, Object.entries(replacements));
}

async function normalizeDateTimes(page: Page): Promise<void> {
  await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      if (node.textContent) {
        node.textContent = node.textContent.replace(
          /\b\d{2}\/\d{2}\/\d{4},\s+\d{2}:\d{2}:\d{2}\b/g,
          '01/01/2026, 10:00:00'
        );
      }
      node = walker.nextNode();
    }
  });
}

async function normalizePatientIdentifiers(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('.animal-kicker').forEach((element) => {
      element.textContent = (element.textContent || '').replace(/^ID\s+[^·]+\s+·/, 'ID 1 ·');
    });
  });
}

async function keepCanonicalTableRows(page: Page, allowedIds: readonly string[]): Promise<void> {
  await page.evaluate((ids) => {
    const records = Array.from(document.querySelectorAll('tbody tr, .owner-card, .patient-card'));
    for (const record of records) {
      const html = record.innerHTML;
      const keep = ids.some((id) => html.includes(id));
      if (!keep) {
        record.remove();
      }
    }
  }, [...allowedIds]);
}

async function clearDynamicTableRows(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('tbody tr').forEach((row) => row.remove());
  });
}

async function normalizeEmptyState(
  page: Page,
  containerSelector: string,
  options: { icon: string; text: string; hint?: string; action?: string }
): Promise<void> {
  await page.evaluate(
    ({ selector, icon, text, hint, action }) => {
      const container = document.querySelector(selector);
      if (!container) return;

      const actionHtml = action
        ? '<button class="secondary small" type="button" style="margin-top:12px;">' + action + '</button>'
        : '';
      const hintHtml = hint ? '<div class="empty-state-hint" style="margin-top:8px;font-size:0.8rem;color:var(--ink-muted);">' + hint + '</div>' : '';

      container.innerHTML =
        '<div class="empty-state" style="padding:56px 20px;">' +
        '<div class="empty-state-icon" style="font-size:3.25rem;opacity:0.6;">' + icon + '</div>' +
        '<div class="empty-state-text" style="font-size:1rem;font-weight:600;color:var(--ink);">' + text + '</div>' +
        hintHtml +
        actionHtml +
        '</div>';
    },
    {
      selector: containerSelector,
      icon: options.icon,
      text: options.text,
      hint: options.hint,
      action: options.action
    }
  );
}

async function normalizeMetricValues(
  page: Page,
  selector: string,
  values: string[]
): Promise<void> {
  await page.evaluate(
    ({ targetSelector, nextValues }) => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(targetSelector));
      elements.forEach((element, index) => {
        element.textContent = nextValues[index] ?? nextValues[nextValues.length - 1] ?? '00';
      });
    },
    { targetSelector: selector, nextValues: values }
  );
}

async function removeSection(page: Page, selector: string): Promise<void> {
  await page.evaluate((targetSelector) => {
    document.querySelector(targetSelector)?.remove();
  }, selector);
}

async function normalizeBillingOverview(page: Page): Promise<void> {
  await page.evaluate(() => {
    const cardLabels = ['00 registro(s)', '00 em aberto', '00 quitado(s)', 'R$ 0,00'];
    const icons = ['📋', '⏳', '✅', '💵'];
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.hub-kpis .ds-stat-card'));
    cards.forEach((card, index) => {
      card.classList.remove('ds-stat-card--error', 'ds-stat-card--loading');
      card.innerHTML = `
        <div class="ds-stat-card__icon" aria-hidden="true">${icons[index] ?? '📊'}</div>
        <div class="ds-stat-card__body">
          <div class="ds-stat-card__value"></div>
          <div class="ds-stat-card__label">${cardLabels[index] ?? '—'}</div>
        </div>
      `;
    });

    const storyValues = ['0%', '00', 'R$ 0,00', '00'];
    const storyCards = Array.from(document.querySelectorAll<HTMLElement>('.story-card__value'));
    storyCards.forEach((element, index) => {
      element.textContent = storyValues[index] ?? '00';
    });
  });

  await removeSection(page, '.hub-alerts');
}

async function normalizeOwnersTable(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ownerCards = Array.from(document.querySelectorAll<HTMLElement>('.owners-list-page .owner-card'));
    const resultSummary = document.querySelector<HTMLElement>('.owners-list-page__section-head p');
    if (resultSummary) resultSummary.textContent = 'Mostrando 1 - 1 de 1 resultados';

    ownerCards.forEach((card) => {
      const name = card.querySelector<HTMLElement>('.owner-card__name');
      if (name) name.textContent = 'Maria Silva';

      const avatar = card.querySelector<HTMLElement>('.owner-card__avatar');
      if (avatar) avatar.textContent = 'MS';

      card.querySelectorAll<HTMLElement>('.fact-row').forEach((fact) => {
        const label = fact.querySelector<HTMLElement>('.fact-row__label')?.textContent?.trim();
        const value = fact.querySelector<HTMLElement>('.fact-row__label')?.nextElementSibling as HTMLElement | null;
        if (!value) return;

        const replacementByLabel: Record<string, string> = {
          ID: 'owner_maria_silva',
          'CPF/CNPJ': 'TUTOR-001',
          'Contato principal': '(11) 98888-1111',
          'Animais do cliente': '0',
          Cadastro: '24/03/2026'
        };
        const replacement = label ? replacementByLabel[label] : undefined;
        if (replacement) value.textContent = replacement;
      });
    });

    const presets = [
      { name: 'Maria Silva', document: 'TUTOR-001', contact: '(11) 98888-1111', status: 'Ativo' },
      { name: 'Joao Souza', document: 'TUTOR-002', contact: '(11) 97777-2222', status: 'Ativo' }
    ];

    const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>('.owners-list-page tbody tr'));
    rows.forEach((row, index) => {
      const preset = presets[index];
      if (!preset) return;

      const cells = row.querySelectorAll<HTMLTableCellElement>('td');
      if (cells[0]) cells[0].innerHTML = `<strong>${preset.name}</strong>`;
      if (cells[1]) cells[1].innerHTML = `<code>${preset.document}</code>`;
      if (cells[2]) cells[2].textContent = preset.contact;
      if (cells[3]) {
        const badge = cells[3].querySelector<HTMLElement>('[aria-label]');
        if (badge) {
          badge.textContent = preset.status;
          badge.setAttribute('aria-label', preset.status);
        } else {
          cells[3].textContent = preset.status;
        }
      }
    });
  });
}

async function normalizePatientsTable(page: Page): Promise<void> {
  await page.evaluate(() => {
    const patientCards = Array.from(document.querySelectorAll<HTMLElement>('.patients-list-page .patient-card'));
    patientCards.forEach((card) => {
      const name = card.querySelector<HTMLElement>('.patient-card__name');
      if (name) name.textContent = 'Luna';

      const meta = card.querySelector<HTMLElement>('.patient-card__meta');
      if (meta) meta.textContent = 'Canina · SRD';

      const id = card.querySelector<HTMLElement>('.patient-card__id');
      if (id) id.textContent = 'ID patient_luna';
    });

    const featuredName = document.querySelector<HTMLElement>('.featured-patient__name');
    if (featuredName) featuredName.textContent = 'Luna';
    const featuredMeta = document.querySelector<HTMLElement>('.featured-patient__meta');
    if (featuredMeta) featuredMeta.textContent = 'Canina · SRD · Maria Silva';

    const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>('.patients-list-page tbody tr'));
    rows.forEach((row) => {
      const cells = row.querySelectorAll<HTMLTableCellElement>('td');
      if (cells[0]) cells[0].innerHTML = '<strong>Luna</strong><span class="muted"><br>SRD</span>';
      if (cells[1]) cells[1].textContent = 'Maria Silva';
      if (cells[2]) cells[2].textContent = 'Canino';
      if (cells[3]) cells[3].textContent = 'Femea';
      if (cells[4]) {
        const badge = cells[4].querySelector<HTMLElement>('[aria-label]');
        if (badge) {
          badge.textContent = 'Ativo';
          badge.setAttribute('aria-label', 'Ativo');
        } else {
          cells[4].textContent = 'Ativo';
        }
      }
    });
  });
}

async function keepCanonicalKanbanCards(page: Page, canonicalText: string): Promise<void> {
  await page.evaluate((text) => {
    const cards = Array.from(document.querySelectorAll('.timeline-item'));
    for (const card of cards) {
      if (!(card.textContent || '').includes(text)) {
        card.remove();
      }
    }
  }, canonicalText);
}

async function stubEmptyCollection(page: Page, path: string): Promise<void> {
  await page.route(`**${path}*`, async (route) => {
    const url = new URL(route.request().url());
    if (route.request().resourceType() === 'document') {
      await route.continue();
      return;
    }

    if (route.request().method() === 'GET' && url.pathname === path) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] })
      });
      return;
    }

    await route.continue();
  });
}

async function stubEmptyFinancialReceivables(page: Page): Promise<void> {
  await page.route('**/financial/receivables*', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().resourceType() === 'document') {
      await route.continue();
      return;
    }

    if (route.request().method() === 'GET' && url.pathname.endsWith('/financial/receivables')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          page: 1,
          pageSize: 20,
          total: 0,
          openCount: 0,
          settledCount: 0,
          totalOutstanding: 0,
          totalSettled: 0
        })
      });
      return;
    }

    await route.continue();
  });
}

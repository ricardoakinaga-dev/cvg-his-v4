import { test, expect, type Locator, type Page } from '@playwright/test';
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
const VISUAL_APPOINTMENT_AT = '2030-01-15T10:00:00.000Z';
const VISUAL_MOTION_RESET_CSS = `
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
`;

interface VisualOwner {
  readonly id: string;
  readonly documentId: string;
  readonly name: string;
  readonly createdAt?: string;
}

interface VisualPatient {
  readonly id: string;
  readonly name: string;
  readonly createdAt?: string;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((css) => {
    const installMotionReset = () => {
      if (!document.documentElement || document.getElementById('e2e-visual-motion-reset')) return;
      const style = document.createElement('style');
      style.id = 'e2e-visual-motion-reset';
      style.textContent = css;
      document.documentElement.appendChild(style);
    };

    if (document.documentElement) {
      installMotionReset();
    } else {
      document.addEventListener('DOMContentLoaded', installMotionReset, { once: true });
    }
  }, VISUAL_MOTION_RESET_CSS);
});

async function clickVisualControl(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('Visual Regression — List Pages', () => {
  test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });

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
      await page
        .getByPlaceholder('Buscar tutor por nome, ID, CPF/CNPJ, RG, telefone ou e-mail')
        .fill(owner.name);
      await clickVisualControl(page, page.getByRole('button', { name: 'Filtrar', exact: true }));
      await expect(page.getByRole('heading', { name: owner.name, exact: true })).toBeVisible();
      await normalizeVisualText(page, {
        [owner.id]: 'owner-visual-snapshot',
        [owner.documentId]: VISUAL_OWNER_DOCUMENT,
        [owner.name]: VISUAL_OWNER_NAME,
        ...createdAtReplacements(owner.createdAt)
      });

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
      await page
        .getByPlaceholder(
          'Buscar paciente por nome, ID, tutor, CPF/CNPJ, RG, telefone, microchip ou raça'
        )
        .fill(patient.name);
      await clickVisualControl(page, page.getByRole('button', { name: 'Buscar', exact: true }));
      const patientCard = page
        .getByRole('heading', { name: patient.name, exact: true })
        .last();
      await expect(patientCard).toBeVisible();
      await patientCard.evaluate((element) => {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      });
      await normalizeVisualText(page, {
        [owner.id]: 'owner-visual-snapshot',
        [patient.id]: 'patient-visual-snapshot',
        [owner.name]: VISUAL_OWNER_NAME,
        [patient.name]: VISUAL_PATIENT_NAME,
        ...createdAtReplacements(owner.createdAt),
        ...createdAtReplacements(patient.createdAt)
      });

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
      await navigateTo(page, '/appointments');
      await selectAppointmentDate(page, appointment.scheduledDate);
      const weekViewButton = page.getByRole('button', { name: 'Semana', exact: true });
      await clickVisualControl(page, weekViewButton);
      await expect(weekViewButton).toHaveClass(/view-toggle__button--active/);
      await page.waitForLoadState('networkidle');
      await page.getByPlaceholder('Pesquisar Cliente').fill(patient.name);
      const appointmentCard = page.getByText(patient.name, { exact: true });
      await expect(appointmentCard).toBeVisible();
      await appointmentCard.evaluate((element) => {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      });
      await normalizeVisualText(page, {
        [owner.id]: 'owner-visual-snapshot',
        [patient.id]: 'patient-visual-snapshot',
        [appointment.id]: 'appointment-visual-snapshot',
        [owner.name]: VISUAL_OWNER_NAME,
        [patient.name]: VISUAL_PATIENT_NAME
      });

      await stabilizeVisual(page, pageProfiles.kanbanPage);

      await expect(page).toHaveScreenshot('appointments-kanban-page.png', {
        maxDiffPixels: 150,
        fullPage: false
      });
    } finally {
      await cancelVisualAppointment(token, appointment.id);
      await deleteVisualResource(token, `/patients/${patient.id}`);
      await deleteVisualResource(token, `/owners/${owner.id}`);
    }
  });

  test('encounters empty-state page', async ({ page }) => {
    const token = await ensureAuthToken(page);

    await stubJsonResponse(page, '/encounters', { items: [] });
    await navigateTo(page, '/encounters');
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });
    await expect(page.getByText('Nenhum atendimento encontrado', { exact: true })).toBeVisible();

    await stabilizeVisual(page, pageProfiles.listPage);

    await expect(page).toHaveScreenshot('encounters-list-page.png', {
      maxDiffPixels: 100,
      fullPage: false
    });
  });

  test('inpatient empty-state page', async ({ page }) => {
    const token = await ensureAuthToken(page);

    await stubJsonResponse(page, '/inpatient', { items: [] });
    await navigateTo(page, '/inpatient');
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });
    await expect(page.getByText('Nenhuma internação ativa', { exact: true })).toBeVisible();

    await stabilizeVisual(page, pageProfiles.listPage);

    await expect(page).toHaveScreenshot('inpatient-list-page.png', {
      maxDiffPixels: 100,
      fullPage: false
    });
  });

  test('billing empty-state page', async ({ page }) => {
    const token = await ensureAuthToken(page);

    await stubJsonResponse(page, '/financial/receivables', {
      data: [],
      page: 1,
      pageSize: 20,
      total: 0,
      openCount: 0,
      settledCount: 0,
      totalOutstanding: 0,
      totalSettled: 0
    });
    await navigateTo(page, '/billing');
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });
    await expect(
      page.getByText('Nenhuma conta a receber encontrada', { exact: true })
    ).toBeVisible();

    await stabilizeVisual(page, pageProfiles.listPage);

    await expect(page).toHaveScreenshot('billing-list-page.png', {
      maxDiffPixels: 100,
      fullPage: false
    });
  });
});

test.describe('Visual Regression — Detail Pages', () => {
  test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });

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
        [owner.id]: 'owner-visual-snapshot',
        [owner.documentId]: VISUAL_OWNER_DOCUMENT,
        [owner.name]: VISUAL_OWNER_NAME,
        ...createdAtReplacements(owner.createdAt)
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
        [owner.id]: 'owner-visual-snapshot',
        [patient.id]: 'patient-visual-snapshot',
        [owner.documentId]: VISUAL_OWNER_DOCUMENT,
        [owner.name]: VISUAL_OWNER_NAME,
        [patient.name]: VISUAL_PATIENT_NAME,
        ...patientNumericIdReplacements(patient),
        ...createdAtReplacements(owner.createdAt),
        ...createdAtReplacements(patient.createdAt)
      });

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
        [owner.id]: 'owner-visual-snapshot',
        [patient.id]: 'patient-visual-snapshot',
        [encounter.id]: 'encounter-visual-snapshot',
        [encounter.id.slice(0, 8)]: 'encounter',
        [owner.name]: VISUAL_OWNER_NAME,
        [patient.name]: VISUAL_PATIENT_NAME,
        ...createdAtReplacements(owner.createdAt),
        ...createdAtReplacements(patient.createdAt)
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
        [owner.id]: 'owner-visual-snapshot',
        [patient.id]: 'patient-visual-snapshot',
        [encounter.id]: 'encounter-visual-snapshot',
        [encounter.id.slice(0, 8)]: 'encounter',
        [owner.name]: VISUAL_OWNER_NAME,
        [patient.name]: VISUAL_PATIENT_NAME,
        ...createdAtReplacements(owner.createdAt),
        ...createdAtReplacements(patient.createdAt)
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
        [owner.id]: 'owner-visual-snapshot',
        [patient.id]: 'patient-visual-snapshot',
        [appointment.id]: 'appointment-visual-snapshot',
        [owner.name]: VISUAL_OWNER_NAME,
        [patient.name]: VISUAL_PATIENT_NAME,
        ...createdAtReplacements(owner.createdAt),
        ...createdAtReplacements(patient.createdAt)
      });
      await stabilizeVisual(page, pageProfiles.detailPage);

      await expect(page).toHaveScreenshot('appointment-detail-page.png', {
        maxDiffPixels: 150,
        fullPage: false
      });
    } finally {
      await cancelVisualAppointment(token, appointment.id);
      await deleteVisualResource(token, `/patients/${patient.id}`);
      await deleteVisualResource(token, `/owners/${owner.id}`);
    }
  });
});

async function ensureAuthToken(page: Page): Promise<string> {
  await loginViaToken(page);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

  const token = process.env.E2E_AUTH_TOKEN;
  if (!token) {
    throw new Error('E2E_AUTH_TOKEN was not initialized after authenticated login');
  }
  return token;
}

async function createVisualOwner(token: string): Promise<VisualOwner> {
  const documentId = `VISUAL-OWNER-${Date.now()}`;
  const ownerName = `${VISUAL_OWNER_NAME} ${documentId.slice(-8)}`;
  const response = await fetch(`${API_URL}/owners`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      fullName: ownerName,
      documentId,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999990001', primary: true }],
      financialResponsible: true,
      status: 'active'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create visual owner: ${response.status} ${await response.text()}`);
  }

  const owner = (await response.json()) as { id: string; createdAt?: string };
  return { ...owner, documentId, name: ownerName };
}

async function createVisualPatient(
  token: string,
  ownerId: string
): Promise<VisualPatient> {
  const patientName = `${VISUAL_PATIENT_NAME} ${ownerId.slice(0, 8)}`;
  const response = await fetch(`${API_URL}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: patientName,
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

  const patient = (await response.json()) as { id: string; createdAt?: string };
  return { ...patient, name: patientName };
}

async function createVisualEncounter(
  token: string,
  patientId: string,
  ownerId: string
): Promise<{ id: string }> {
  return postVisualResource(token, '/encounters', {
    patientId,
    ownerId,
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Atendimento de regressão visual'
  });
}

async function createVisualAppointment(
  token: string,
  patientId: string,
  ownerId: string
): Promise<{ id: string; scheduledDate: string }> {
  const scheduledAt = new Date(VISUAL_APPOINTMENT_AT);
  const appointment = await postVisualResource<{ id: string }>(token, '/appointments', {
    patientId,
    ownerId,
    scheduledAt: scheduledAt.toISOString(),
    visitType: 'scheduled',
    reason: 'Consulta de regressão visual'
  });

  return { ...appointment, scheduledDate: scheduledAt.toISOString().slice(0, 10) };
}

async function createVisualBillingEstimate(token: string, encounterId: string): Promise<void> {
  await postVisualResource(token, '/billing/estimate', { encounterId });
}

async function postVisualResource<T extends { id: string } = { id: string }>(
  token: string,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(
      `Failed to create visual resource ${path}: ${response.status} ${await response.text()}`
    );
  }
  return (await response.json()) as T;
}

async function deleteVisualResource(token: string, path: string): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete visual resource ${path}: ${response.status}`);
  }
}

async function cancelVisualAppointment(token: string, appointmentId: string): Promise<void> {
  const response = await fetch(`${API_URL}/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason: 'Limpeza da regressão visual' })
  });

  if (!response.ok && response.status !== 404 && response.status !== 409) {
    throw new Error(`Failed to cancel visual appointment: ${response.status}`);
  }
}

async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(`${SPA_URL}${route}`);
  await page.waitForLoadState('networkidle');
  await page.addStyleTag({ content: VISUAL_MOTION_RESET_CSS });
}

async function selectAppointmentDate(page: Page, date: string): Promise<void> {
  const target = page.getByRole('button', { name: date, exact: true });
  for (let month = 0; month < 120; month += 1) {
    if (await target.isVisible()) {
      await clickVisualControl(page, target);
      await page.waitForLoadState('networkidle');
      return;
    }
    await clickVisualControl(page, page.locator('.mini-calendar__header button').last());
  }
  throw new Error(`Could not select visual appointment date ${date}`);
}

async function normalizeVisualText(
  page: Page,
  replacements: Record<string, string>
): Promise<void> {
  await page.evaluate((entries) => {
    const replaceKnownValues = (value: string): string => {
      let nextValue = value;
      for (const [searchValue, replacementValue] of entries) {
        if (searchValue) {
          nextValue = nextValue.split(searchValue).join(replacementValue);
        }
      }
      return nextValue;
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      if (node.textContent) {
        const nextText = replaceKnownValues(node.textContent);
        if (nextText !== node.textContent) {
          node.textContent = nextText;
        }
      }
      node = walker.nextNode();
    }

    for (const field of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input, textarea'
    )) {
      const nextValue = replaceKnownValues(field.value);
      if (nextValue !== field.value) {
        field.value = nextValue;
      }
    }
  }, Object.entries(replacements));
}

function createdAtReplacements(createdAt?: string): Record<string, string> {
  if (!createdAt) {
    return {};
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return {};
  }

  const dateOnly = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(date);
  const dateTime = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo'
  }).format(date);

  return {
    [dateTime]: '15/01/2030, 07:00:00',
    [dateOnly]: '15/01/2030'
  };
}

function patientNumericIdReplacements(patient: VisualPatient): Record<string, string> {
  const numericId = patient.id.match(/\d+/)?.[0];
  if (!numericId) {
    return {};
  }

  return {
    [`ID ${numericId} ·`]: 'ID 000001 ·'
  };
}

async function stubJsonResponse(page: Page, path: string, body: unknown): Promise<void> {
  await page.route(`**${path}*`, async (route) => {
    const url = new URL(route.request().url());
    if (route.request().resourceType() === 'document') {
      await route.continue();
      return;
    }

    if (route.request().method() === 'GET' && url.pathname.endsWith(path)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
      });
      return;
    }

    await route.continue();
  });
}

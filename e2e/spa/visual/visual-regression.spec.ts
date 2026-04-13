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
const CANONICAL_OWNER_IDS = ['owner_maria_silva', 'owner_joao_souza'] as const;
const CANONICAL_PATIENT_IDS = ['patient_luna'] as const;
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
    if (!token) return;

    await navigateTo(page, '/owners');
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });
    await keepCanonicalTableRows(page, CANONICAL_OWNER_IDS);
    await normalizeMetricValues(page, '.summary-card__value', ['00', '00', '00', '00']);
    await normalizeOwnersTable(page);

    await stabilizeVisual(page, pageProfiles.listPage);

    await expect(page).toHaveScreenshot('owners-list-page.png', {
      maxDiffPixels: 100,
      fullPage: false
    });
  });

  test('patients list page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    if (!token) return;

    await navigateTo(page, '/patients');
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });
    await keepCanonicalTableRows(page, CANONICAL_PATIENT_IDS);
    await normalizeMetricValues(page, '.overview-metric__value', ['00', '00', '00', '00']);
    await normalizePatientsTable(page);

    await stabilizeVisual(page, pageProfiles.listPage);

    await expect(page).toHaveScreenshot('patients-list-page.png', {
      maxDiffPixels: 100,
      fullPage: false
    });
  });

  test('appointments kanban page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    if (!token) return;

    await navigateTo(page, '/appointments');

    const canonicalCard = page.locator('.kanban-card', { hasText: 'Luna' }).first();
    const hasCanonicalCard = await canonicalCard.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasCanonicalCard) {
      test.skip(true, 'No canonical appointment card available — skipping snapshot');
      return;
    }

    await waitForPageSettled(page, {
      contentSelector: '.kanban-column',
      timeout: 15000
    });
    await keepCanonicalKanbanCards(page, 'Luna');

    await stabilizeVisual(page, pageProfiles.kanbanPage);

    await expect(page).toHaveScreenshot('appointments-kanban-page.png', {
      maxDiffPixels: 150,
      fullPage: false
    });
  });

  test('encounters list page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    if (!token) return;

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
    const token = await ensureAuthToken(page);
    if (!token) return;

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
    const token = await ensureAuthToken(page);
    if (!token) return;

    await stubEmptyCollection(page, '/billing');
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
    if (!token) return;

    const owner = await createVisualOwner(token);

    try {
      await navigateTo(page, `/owners/${owner.id}`);
      await waitForPageSettled(page, {
        contentSelector: HEADING_SELECTOR,
        timeout: 15000
      });
      await normalizeVisualText(page, {
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
    if (!token) return;

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
        [patient.name]: VISUAL_PATIENT_NAME
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
    if (!token) return;

    await navigateTo(page, '/encounters');
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });

    const firstEncounterLink = page.locator('a[href*="/encounters/"]').first();
    const hasEncounter = await firstEncounterLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasEncounter) {
      test.skip(true, 'No encounters available for detail snapshot');
      return;
    }

    await firstEncounterLink.click();
    await waitForPageSettled(page, {
      contentSelector: HEADING_SELECTOR,
      timeout: 15000
    });

    await stabilizeVisual(page, pageProfiles.detailPage);

    await expect(page).toHaveScreenshot('encounter-detail-page.png', {
      maxDiffPixels: 150,
      fullPage: false
    });
  });

  test('billing detail page', async ({ page }) => {
    test.skip(true, 'Billing detail snapshot requires a canonical seed record');
  });

  test('appointment detail page', async ({ page }) => {
    test.skip(true, 'Appointment detail snapshot requires a canonical seed record');
  });
});

async function ensureAuthToken(page: Page): Promise<string | null> {
  await loginViaToken(page);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

  return process.env.E2E_AUTH_TOKEN ?? null;
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
): Promise<{ id: string; name: string }> {
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

  const patient = (await response.json()) as { id: string };
  return { ...patient, name: VISUAL_PATIENT_NAME };
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

async function keepCanonicalTableRows(page: Page, allowedIds: readonly string[]): Promise<void> {
  await page.evaluate((ids) => {
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    for (const row of rows) {
      const html = row.innerHTML;
      const keep = ids.some((id) => html.includes(id));
      if (!keep) {
        row.remove();
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
    const cards = Array.from(document.querySelectorAll('.kanban-card'));
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

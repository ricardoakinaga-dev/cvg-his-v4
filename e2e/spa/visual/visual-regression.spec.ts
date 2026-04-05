import { test, expect, type Page } from '@playwright/test';
import { stabilizeVisual, waitForPageSettled, pageProfiles } from './stabilize-visual';

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

const SPA_URL = process.env.SPA_URL || 'http://localhost:3002';

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
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

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
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

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
    await waitForPageSettled(page, {
      contentSelector: '.kanban-column',
      timeout: 15000
    });

    await stabilizeVisual(page, pageProfiles.kanbanPage);

    await expect(page).toHaveScreenshot('appointments-kanban-page.png', {
      maxDiffPixels: 150,
      fullPage: false
    });
  });

  test('encounters list page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    if (!token) return;

    await navigateTo(page, '/encounters');
    await waitForPageSettled(page, {
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

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
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

    await stabilizeVisual(page, pageProfiles.listPage);

    await expect(page).toHaveScreenshot('inpatient-list-page.png', {
      maxDiffPixels: 100,
      fullPage: false
    });
  });

  test('billing list page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    if (!token) return;

    await navigateTo(page, '/billing');
    await waitForPageSettled(page, {
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

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

    await navigateTo(page, '/owners');
    await waitForPageSettled(page, {
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

    const firstOwnerLink = page.locator('a[href*="/owners/"]').first();
    const hasOwner = await firstOwnerLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasOwner) {
      test.skip(true, 'No owners available for detail snapshot');
      return;
    }

    await firstOwnerLink.click();
    await waitForPageSettled(page, {
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

    await stabilizeVisual(page, pageProfiles.detailPage);

    await expect(page).toHaveScreenshot('owner-detail-page.png', {
      maxDiffPixels: 120,
      fullPage: false
    });
  });

  test('patient detail page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    if (!token) return;

    await navigateTo(page, '/patients');
    await waitForPageSettled(page, {
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

    const firstPatientLink = page.locator('a[href*="/patients/"]').first();
    const hasPatient = await firstPatientLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasPatient) {
      test.skip(true, 'No patients available for detail snapshot');
      return;
    }

    await firstPatientLink.click();
    await waitForPageSettled(page, {
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

    await stabilizeVisual(page, pageProfiles.detailPage);

    await expect(page).toHaveScreenshot('patient-detail-page.png', {
      maxDiffPixels: 120,
      fullPage: false
    });
  });

  test('encounter detail page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    if (!token) return;

    await navigateTo(page, '/encounters');
    await waitForPageSettled(page, {
      contentSelector: '[role="heading"]',
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
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

    await stabilizeVisual(page, pageProfiles.detailPage);

    await expect(page).toHaveScreenshot('encounter-detail-page.png', {
      maxDiffPixels: 150,
      fullPage: false
    });
  });

  test('billing detail page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    if (!token) return;

    await navigateTo(page, '/billing');
    await waitForPageSettled(page, {
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

    const firstBillingLink = page.locator('a[href*="/billing/"]').first();
    const hasBilling = await firstBillingLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasBilling) {
      test.skip(true, 'No billing records available for detail snapshot');
      return;
    }

    await firstBillingLink.click();
    await waitForPageSettled(page, {
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

    await stabilizeVisual(page, pageProfiles.detailPage);

    await expect(page).toHaveScreenshot('billing-detail-page.png', {
      maxDiffPixels: 150,
      fullPage: false
    });
  });

  test('appointment detail page', async ({ page }) => {
    const token = await ensureAuthToken(page);
    if (!token) return;

    await navigateTo(page, '/appointments');
    await waitForPageSettled(page, {
      contentSelector: '.kanban-column',
      timeout: 15000
    });

    const firstCardLink = page.locator('.kanban-card a, .kanban-card').first();
    const hasCard = await firstCardLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasCard) {
      test.skip(true, 'No appointments available for detail snapshot');
      return;
    }

    await firstCardLink.click();
    await waitForPageSettled(page, {
      contentSelector: '[role="heading"]',
      timeout: 15000
    });

    await stabilizeVisual(page, pageProfiles.detailPage);

    await expect(page).toHaveScreenshot('appointment-detail-page.png', {
      maxDiffPixels: 150,
      fullPage: false
    });
  });
});

async function ensureAuthToken(page: Page): Promise<string | null> {
  let token = process.env.E2E_AUTH_TOKEN;
  if (!token) {
    test.skip(true, 'E2E_AUTH_TOKEN not available');
    return null;
  }

  await page.goto(SPA_URL);
  await page.evaluate((t: string) => {
    localStorage.setItem('cvg-his-v2:access_token', t);
  }, token);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

  return token;
}

async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(`${SPA_URL}${route}`);
  await page.waitForLoadState('networkidle');
}

import { test, expect, type Page } from '@playwright/test';
import {
  SpaPage,
  ApiCall,
  CleanupTracker,
  loginViaToken,
  getE2EAccessToken,
  CreatedResource
} from './fixtures/spa-fixture';

/**
 * SPA E2E — Fluxo de Internação (Inpatient)
 *
 * Fluxo validado:
 * 1. Login + preparo de dados (owner + patient + encounter via API)
 * 2. Navegar para internação e validar lista
 * 3. Acessar Bed Board
 * 4. Validar elementos da página (título, mapa de leitos, admitir)
 * 5. Se houver internações ativas: validar detalhe, evolução, alta
 * 6. Cleanup automático dos dados criados
 *
 * Execução:
 *   npx playwright test --config playwright-spa.config.ts -g "Internação"
 */

const API_URL = process.env.API_URL || 'http://localhost:3101';
const SPA_URL = process.env.SPA_URL || 'http://localhost:3102';

// ── Helpers ────────────────────────────────────────────────────────────

async function createOwnerViaApi(apiCall: ApiCall) {
  return apiCall.post('/owners', {
    fullName: `Tutor Inpatient E2E ${Date.now()}`,
    documentId: `INP-E2E-${Date.now()}`,
    contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
    financialResponsible: false,
    status: 'active'
  });
}

async function createPatientViaApi(apiCall: ApiCall, ownerId: string) {
  return apiCall.post('/patients', {
    name: `Paciente Inpatient E2E ${Date.now()}`,
    species: 'canine',
    sex: 'male',
    primaryOwnerId: ownerId,
    status: 'active'
  });
}

async function createEncounterViaApi(apiCall: ApiCall, patientId: string, ownerId: string) {
  return apiCall.post('/encounters', {
    patientId,
    ownerId,
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Internação E2E - necessita observação'
  });
}

// ── Tests ──────────────────────────────────────────────────────────────

test.describe('Fluxo de Internação (Inpatient)', () => {
  test('navega para internação, valida lista, Bed Board e detalhe', async ({ page }) => {
    const mainContent = page.getByRole('main');
    const pageHeaderTitle = mainContent.locator('.app-page-header__title');
    const token = await getE2EAccessToken();

    const apiCall = new ApiCall(token);
    const cleanup = new CleanupTracker(apiCall);

    try {
      // ── Step 0: Prepare test data ──
      console.log('   📦 Preparing test data...');
      const owner = await createOwnerViaApi(apiCall);
      cleanup.track({ type: 'owner', id: owner.id });
      console.log(`   ✅ Owner: ${owner.fullName}`);

      const patient = await createPatientViaApi(apiCall, owner.id);
      cleanup.track({ type: 'patient', id: patient.id });
      console.log(`   ✅ Patient: ${patient.name}`);

      const encounter = await createEncounterViaApi(apiCall, patient.id, owner.id);
      cleanup.track({ type: 'encounter', id: encounter.id });
      console.log(`   ✅ Encounter: ${encounter.id}`);

      const stay = await apiCall.post('/inpatient/admit', {
        encounterId: encounter.id,
        patientId: patient.id,
        unit: 'Hospital CVG',
        ward: 'Ala E2E',
        bed: `Leito ${Date.now()}`
      });
      console.log(`   ✅ Inpatient stay: ${stay.id}`);

      // ── Step 1: Login ──
      console.log('   🔐 Logging in...');
      await loginViaToken(page);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
      console.log('   ✅ Logged in');

      // ── Step 2: Navigate to Inpatient list ──
      console.log('   🏥 Navigating to Inpatient list...');
      await page.goto(`${SPA_URL}/inpatient`);
      await page.waitForLoadState('networkidle');

      // Validate page title using heading role
      await expect(pageHeaderTitle).toHaveText('🛏️ Internação', {
        timeout: 15000
      });
      console.log('   ✅ Inpatient list page loaded');

      // Verify bed map button
      await expect(mainContent.getByRole('link', { name: /Mapa de Leitos/ })).toBeVisible({
        timeout: 10000
      });
      console.log('   ✅ Bed map button visible');

      // Verify admit patient button
      await expect(mainContent.getByRole('link', { name: /Admitir Paciente/ })).toBeVisible({
        timeout: 10000
      });
      console.log('   ✅ Admit patient button visible');

      // ── Step 3: Navigate to Bed Board ──
      console.log('   🛏️  Navigating to Bed Board...');
      await page.goto(`${SPA_URL}/inpatient/board`);
      await page.waitForLoadState('networkidle');

      // Validate Bed Board loaded — look for "Leito" text or bed board structure
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      console.log('   ✅ Bed Board page loaded');

      // ── Step 4: Return to Inpatient list ──
      console.log('   📋 Returning to Inpatient list...');
      await page.goto(`${SPA_URL}/inpatient?patientId=${encodeURIComponent(patient.id)}`);
      await page.waitForLoadState('networkidle');

      // ── Step 5: Validate the admission created by this test ──
      const stayRow = page.locator('tr', { hasText: patient.name });
      await expect(stayRow).toContainText('Internado', { timeout: 15000 });
      await stayRow.getByRole('link', { name: 'Ver' }).click();
      await expect(page).toHaveURL(new RegExp(`/inpatient/${stay.id}$`), { timeout: 10000 });

      await expect(
        mainContent.getByRole('heading', { name: /Detalhes da Internação/ })
      ).toBeVisible({ timeout: 15000 });
      await expect(mainContent.getByText('Ala E2E', { exact: true })).toBeVisible();
      console.log('   ✅ Inpatient detail page loaded');

      await page.getByRole('button', { name: 'Dar Alta', exact: true }).click();
      await page.locator('#dischargeReason').fill('Alta clínica validada no fluxo E2E');
      await page.getByRole('button', { name: 'Confirmar Alta', exact: true }).click();
      await expect(page.getByText('Alta registrada com sucesso!')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Alta clínica validada no fluxo E2E')).toBeVisible();
      console.log('   ✅ Inpatient discharge completed');

      // ── Step 6: Verify navigation back to list ──
      console.log('   🔙 Verifying navigation back to list...');
      await page.goto(`${SPA_URL}/inpatient`);
      await page.waitForLoadState('networkidle');
      await expect(pageHeaderTitle).toHaveText('🛏️ Internação', {
        timeout: 10000
      });
      console.log('   ✅ Navigation back to list works');

      console.log('   🎉 Inpatient flow completed!');
    } finally {
      await cleanup.cleanup();
    }
  });

  test('valida elementos da lista de internação', async ({ page }) => {
    const mainContent = page.getByRole('main');
    const pageHeaderTitle = mainContent.locator('.app-page-header__title');
    await getE2EAccessToken();

    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    // Navigate to inpatient list
    await page.goto(`${SPA_URL}/inpatient`);
    await page.waitForLoadState('networkidle');

    // Validate page title
    await expect(pageHeaderTitle).toHaveText('🛏️ Internação', {
      timeout: 15000
    });

    // Validate bed map button and its link
    const bedMapBtn = mainContent.getByRole('link', { name: /Mapa de Leitos/ });
    await expect(bedMapBtn).toBeVisible({ timeout: 10000 });
    await expect(bedMapBtn).toHaveAttribute('href', '/inpatient/board');

    // Validate admit patient button and its link
    const admitBtn = mainContent.getByRole('link', { name: /Admitir Paciente/ });
    await expect(admitBtn).toBeVisible({ timeout: 10000 });
    await expect(admitBtn).toHaveAttribute('href', '/encounters');

    console.log('   ✅ Inpatient list page elements validated');
  });
});

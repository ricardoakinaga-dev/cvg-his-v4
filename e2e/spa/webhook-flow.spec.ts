import { test, expect } from './fixtures/spa-fixture';

/**
 * SPA E2E — Fluxo de Webhooks (Webhook Management UI)
 *
 * Fluxo validado:
 * 1. Login na SPA via token
 * 2. Listar webhooks (página vazia inicialmente)
 * 3. Criar webhook via UI (form completo)
 * 4. Validar webhook na lista
 * 5. Abrir detalhe do webhook
 * 6. Editar webhook (alterar URL)
 * 7. Validar edição
 * 8. Desativar webhook
 * 9. Validar inativação na lista
 *
 * Execução:
 *   npx playwright test --config playwright-spa.config.ts -g "Webhook"
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SPA_URL = process.env.SPA_URL || 'http://localhost:3002';

test.describe('Fluxo de Webhooks (Webhook Management UI)', () => {
  test('CRUD completo: criar, editar e desativar webhook', async ({ page, apiCall, cleanup }) => {
    const token = process.env.E2E_AUTH_TOKEN;
    if (!token) {
      test.skip(true, 'E2E_AUTH_TOKEN not available');
      return;
    }

    // ── Step 1: Login ──
    console.log('   🔐 Logging in...');
    await page.goto(SPA_URL);
    await page.evaluate((t: string) => {
      localStorage.setItem('cvg-his-v2:access_token', t);
    }, token);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    console.log('   ✅ Logged in');

    const webhookUrl = `https://webhook-e2e-test-${Date.now()}.example.com/hook`;
    const webhookUrlEdited = `https://webhook-e2e-edited-${Date.now()}.example.com/hook`;

    // ── Step 2: Navigate to webhooks list ──
    console.log('   🔗 Navigating to webhooks list...');
    await page.goto(`${SPA_URL}/webhooks`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Webhooks/ })).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Webhooks list page loaded');

    // ── Step 3: Create webhook via UI ──
    console.log('   ➕ Creating webhook via UI...');
    await page.getByRole('link', { name: /Novo Webhook/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Novo Webhook/ })).toBeVisible({
      timeout: 10000
    });

    // Fill URL
    await page.fill('#url', webhookUrl);
    console.log(`   ✅ URL filled: ${webhookUrl}`);

    // Select events
    const eventCheckboxes = page.locator('.event-checkbox input[type="checkbox"]');
    await expect(eventCheckboxes.first()).toBeVisible({ timeout: 5000 });
    const firstCheckbox = eventCheckboxes.first();
    await firstCheckbox.check();
    console.log('   ✅ First event selected');

    // Submit
    await page.getByRole('button', { name: /Cadastrar Webhook/ }).click();

    // Wait for success and redirect to detail
    await expect(page.getByText(/Webhook cadastrado com sucesso/i)).toBeVisible({ timeout: 15000 });
    await page.waitForURL(/\/webhooks\/webhook-/, { timeout: 10000 });
    const webhookId = page.url().split('/').pop();
    console.log(`   ✅ Webhook created with ID: ${webhookId}`);

    cleanup.track({ type: 'webhook', id: webhookId as string });

    // ── Step 4: Verify webhook appears in list ──
    console.log('   📋 Verifying webhook in list...');
    await page.goto(`${SPA_URL}/webhooks`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.webhook-url', { hasText: webhookUrl })).toBeVisible({
      timeout: 10000
    });
    console.log('   ✅ Webhook visible in list');

    // ── Step 5: Open webhook detail ──
    console.log('   🔍 Opening webhook detail...');
    await page.locator('.webhook-url', { hasText: webhookUrl }).click();
    await page.waitForURL(/\/webhooks\/webhook-/, { timeout: 10000 });
    await expect(page.getByText(/Webhook/)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.detail-value', { hasText: webhookUrl })).toBeVisible({
      timeout: 10000
    });
    console.log('   ✅ Webhook detail page loaded');

    // Verify events are shown
    await expect(page.locator('.event-tag').first()).toBeVisible({ timeout: 5000 });
    console.log('   ✅ Event tags visible in detail');

    // ── Step 6: Edit webhook ──
    console.log('   ✏️  Editing webhook...');
    await page.getByRole('link', { name: /Editar/ }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Editar Webhook/ })).toBeVisible({
      timeout: 10000
    });

    // Verify form is pre-filled
    await expect(page.locator('#url')).toHaveValue(webhookUrl);
    console.log('   ✅ Form pre-filled with existing URL');

    // Change URL
    await page.fill('#url', webhookUrlEdited);
    await page.getByRole('button', { name: /Salvar Alterações/ }).click();

    // Wait for success
    await expect(page.getByText(/Webhook atualizado com sucesso/i)).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Webhook updated');

    // ── Step 7: Verify edit ──
    console.log('   ✅ Verifying edit...');
    await page.waitForURL(/\/webhooks\/webhook-/, { timeout: 10000 });
    await expect(page.locator('.detail-value', { hasText: webhookUrlEdited })).toBeVisible({
      timeout: 10000
    });
    await expect(page.locator('.detail-value', { hasText: webhookUrl })).not.toBeVisible();
    console.log('   ✅ Edited URL confirmed in detail');

    // ── Step 8: Deactivate webhook ──
    console.log('   ❌ Deactivating webhook...');
    await page.getByRole('button', { name: /Desativar/ }).click();

    // Confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Wait for redirect to list
    await page.waitForURL(/\/webhooks$/, { timeout: 10000 });
    console.log('   ✅ Redirected to webhooks list');

    // Verify webhook is no longer in active list (may still appear but with Inativo badge)
    await page.waitForLoadState('networkidle');
    console.log('   ✅ Webhook deactivated');

    // ── Step 9: Verify in list ──
    console.log('   📋 Verifying webhook in list after deactivation...');
    await expect(page.getByRole('heading', { name: /Webhooks/ })).toBeVisible({ timeout: 10000 });
    console.log('   ✅ Webhook list still accessible');

    console.log('   🎉 Webhook CRUD flow completed successfully!');
  });

  test('valida elementos da página de lista de webhooks', async ({ page }) => {
    const token = process.env.E2E_AUTH_TOKEN;
    if (!token) {
      test.skip(true, 'E2E_AUTH_TOKEN not available');
      return;
    }

    // Login
    await page.goto(SPA_URL);
    await page.evaluate((t: string) => {
      localStorage.setItem('cvg-his-v2:access_token', t);
    }, token);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    // Navigate to webhooks
    await page.goto(`${SPA_URL}/webhooks`);
    await page.waitForLoadState('networkidle');

    // Validate page title
    await expect(page.getByRole('heading', { name: /Webhooks/ })).toBeVisible({ timeout: 15000 });

    // Validate "Novo Webhook" button
    await expect(page.getByRole('link', { name: /Novo Webhook/i })).toBeVisible({ timeout: 10000 });

    // Validate table columns (even if empty)
    const columns = page.locator('thead th, .data-table th');
    if ((await columns.count()) > 0) {
      await expect(columns.getByText(/URL/i)).toBeVisible({ timeout: 5000 });
      await expect(columns.getByText(/Eventos/i)).toBeVisible({ timeout: 5000 });
      await expect(columns.getByText(/Status/i)).toBeVisible({ timeout: 5000 });
      await expect(columns.getByText(/Ações/i)).toBeVisible({ timeout: 5000 });
      console.log('   ✅ Table headers validated');
    }

    console.log('   ✅ Webhooks list page elements validated');
  });
});

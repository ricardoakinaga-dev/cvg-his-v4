import { test, expect } from './fixtures/spa-fixture';

/**
 * SPA E2E — Fluxo Crítico Ponta a Ponta
 *
 * Fluxo validado:
 * 1. Login na SPA (token injection)
 * 2. Criar owner + patient via API (com cleanup automático)
 * 3. Abrir atendimento para o paciente
 * 4. Adicionar entrada clínica no prontuário
 * 5. Adicionar item de cobrança no faturamento
 * 6. Fechar atendimento
 * 7. Validar feedback visual e navegação
 *
 * Execução:
 *   npx playwright test --config playwright-spa.config.ts -g "Fluxo Crítico"
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SPA_URL = process.env.SPA_URL || 'http://localhost:3002';

test.describe('Fluxo Crítico SPA — Ponta a Ponta', () => {
  test('cria tutor, paciente, atendimento, entrada clínica, faturamento e fecha atendimento', async ({
    page,
    apiCall,
    cleanup
  }) => {
    const token = process.env.E2E_AUTH_TOKEN;
    if (!token) {
      test.skip(true, 'E2E_AUTH_TOKEN not available');
      return;
    }

    // ── Step 0: Prepare test data via API (with cleanup) ──
    console.log('   📦 Creating test data via API...');
    const ownerName = `Tutor E2E ${Date.now()}`;
    const patientName = `Paciente E2E ${Date.now()}`;

    const owner = await apiCall.post('/owners', {
      fullName: ownerName,
      documentId: `E2E-${Date.now()}`,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
      financialResponsible: false,
      status: 'active'
    });
    cleanup.track({ type: 'owner', id: owner.id });
    console.log(`   ✅ Owner created: ${owner.fullName}`);

    const patient = await apiCall.post('/patients', {
      name: patientName,
      species: 'canine',
      sex: 'male',
      primaryOwnerId: owner.id,
      status: 'active'
    });
    cleanup.track({ type: 'patient', id: patient.id });
    console.log(`   ✅ Patient created: ${patient.name}`);

    // ── Step 1: Login ──
    console.log('   🔐 Logging in...');
    await page.goto(SPA_URL);
    await page.evaluate((t: string) => {
      localStorage.setItem('cvg-his-v2:access_token', t);
    }, token);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    console.log('   ✅ Logged in');

    // ── Step 2: Verify owner in list ──
    console.log('   👤 Verifying owner in list...');
    await page.goto(`${SPA_URL}/owners`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(ownerName)).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Owner visible in list');

    // ── Step 3: Verify patient in list ──
    console.log('   🐾 Verifying patient in list...');
    await page.goto(`${SPA_URL}/patients`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Patient visible in list');

    // ── Step 4: Open encounter ──
    console.log('   🩺 Opening new encounter...');
    await page.goto(`${SPA_URL}/encounters/new`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Abrir Atendimento')).toBeVisible({ timeout: 10000 });

    // Select patient using deterministic wait
    const searchInput = page.getByPlaceholder(/buscar paciente/i);
    await searchInput.click();
    await searchInput.fill(patientName);
    const option = page.getByRole('option', { name: patientName });
    await option.waitFor({ timeout: 10000 });
    await option.click();
    await page.waitForSelector('.search-select__dropdown', { state: 'detached', timeout: 5000 });

    await page.selectOption('#visitType', 'walk_in');
    await page.selectOption('#origin', 'reception');
    await page.locator('#reason').fill('Atendimento E2E - dor abdominal');
    await page.getByRole('button', { name: 'Abrir Atendimento' }).click();

    await expect(page.getByText('Atendimento aberto com sucesso')).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Encounter created');

    await page.waitForURL(/\/encounters\/enc-/, { timeout: 10000 });
    const encounterId = page.url().split('/').pop();
    cleanup.track({ type: 'encounter', id: encounterId! });
    console.log(`   ✅ Encounter ID: ${encounterId}`);

    // ── Step 5: Add clinical entry ──
    console.log('   📋 Adding clinical entry...');
    await page.goto(`${SPA_URL}/medical-records/${encounterId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Prontuário')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Nova Entrada' }).click();
    await page.selectOption('#entryType', 'anamnesis');
    await page.locator('#entryTitle').fill('Anamnese inicial - E2E');
    await page.locator('#entryContent').fill('Paciente apresenta dor abdominal e letargia.');

    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Anamnese inicial - E2E')).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Clinical entry added');

    // ── Step 6: Add billing item ──
    console.log('   💰 Adding billing item...');
    await page.goto(`${SPA_URL}/billing/${encounterId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Faturamento')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Adicionar Item' }).click();
    await page.selectOption('#itemType', 'service');
    await page.locator('#itemDescription').fill('Consulta veterinária - E2E');
    await page.locator('#itemQuantity').fill('1');
    await page.locator('#itemPrice').fill('150');
    await page.getByRole('button', { name: 'Adicionar' }).click();

    await expect(page.getByText('Consulta veterinária - E2E')).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Billing item added');

    // ── Step 7: Close encounter ──
    console.log('   🏁 Closing encounter...');
    await page.goto(`${SPA_URL}/encounters/${encounterId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Atendimento')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Fechar Atendimento' }).click();
    await page.locator('#closeReason').fill('Atendimento concluído - E2E test');
    await page.getByRole('button', { name: 'Fechar' }).click();

    await expect(page.getByText('Finalizado')).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Encounter closed');

    // ── Step 8: Validate final state ──
    console.log('   ✅ Validating final state...');
    await expect(page.getByText('Finalizado')).toBeVisible();

    await page.goto(`${SPA_URL}/encounters`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Atendimentos')).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Encounters list accessible');

    console.log('   🎉 Full critical path completed successfully!');
  });
});

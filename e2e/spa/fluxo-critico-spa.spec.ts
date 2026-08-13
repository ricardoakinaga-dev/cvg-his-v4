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

const API_URL = process.env.API_URL || 'http://localhost:3101';
const SPA_URL = process.env.SPA_URL || 'http://localhost:3102';

test.describe('Fluxo Crítico SPA — Ponta a Ponta', () => {
  test('cria tutor, paciente, atendimento, entrada clínica, faturamento e fecha atendimento', async ({
    spaPage,
    page,
    apiCall,
    cleanup
  }) => {
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
    await spaPage.goto('/');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    console.log('   ✅ Logged in');

    // ── Step 2: Verify owner in list ──
    console.log('   👤 Verifying owner in list...');
    await page.goto(`${SPA_URL}/owners`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(ownerName).first()).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Owner visible in list');

    // ── Step 3: Verify patient in list ──
    console.log('   🐾 Verifying patient in list...');
    await page.goto(`${SPA_URL}/patients`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(patientName).first()).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Patient visible in list');

    // ── Step 4: Open encounter via API and continue flow in SPA ──
    console.log('   🩺 Opening new encounter via API...');
    const encounter = await apiCall.post('/encounters', {
      patientId: patient.id,
      ownerId: owner.id,
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Atendimento E2E - dor abdominal'
    });
    const encounterId = encounter.id as string;
    cleanup.track({ type: 'encounter', id: encounterId! });
    console.log(`   ✅ Encounter ID: ${encounterId}`);

    await page.goto(`${SPA_URL}/encounters/${encounterId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Fechar Atendimento' })).toBeVisible({
      timeout: 15000
    });

    // ── Step 5: Add clinical entry ──
    console.log('   📋 Adding clinical entry...');
    await page.goto(`${SPA_URL}/medical-records/${encounterId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Prontuário clínico/i })).toBeVisible({
      timeout: 15000
    });

    await page.getByRole('button', { name: 'Adicionar anamnese' }).click();
    await page.locator('#entryTitle').fill('Anamnese inicial - E2E');
    await page.locator('#entryContent').fill('Paciente apresenta dor abdominal e letargia.');

    await page.getByRole('button', { name: /^Salvar$/ }).click();
    await expect(page.getByRole('heading', { name: 'Anamnese inicial - E2E' })).toBeVisible({
      timeout: 15000
    });
    console.log('   ✅ Clinical entry added');

    // ── Step 6: Add billing item ──
    console.log('   💰 Adding billing item...');
    await page.goto(`${SPA_URL}/billing/${encounterId}`);
    await page.waitForLoadState('networkidle');
    const generateEstimate = page.getByRole('button', { name: 'Gerar Estimativa' }).first();
    await expect(generateEstimate).toBeVisible({
      timeout: 10000
    });
    await generateEstimate.click();
    await expect(page.getByRole('main').getByText('Estimado', { exact: true }).first()).toBeVisible(
      {
        timeout: 15000
      }
    );

    await page.getByRole('button', { name: /Adicionar Item/ }).click();
    await page.selectOption('#itemType', 'service');
    await page.locator('#itemDescription').fill('Consulta veterinária - E2E');
    await page.locator('#itemQuantity').fill('1');
    await page.locator('#itemPrice').fill('150');
    await page.getByRole('button', { name: /^Adicionar$/ }).click();

    await expect(page.getByText('Consulta veterinária - E2E')).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Billing item added');

    // ── Step 7: Close encounter ──
    console.log('   🏁 Closing encounter...');
    await page.goto(`${SPA_URL}/encounters/${encounterId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Fechar Atendimento' })).toBeVisible({
      timeout: 15000
    });

    await page.getByRole('button', { name: 'Fechar Atendimento' }).click();
    const closeDialog = page.getByRole('dialog', { name: 'Fechar Atendimento' });
    await closeDialog.locator('#closeReason').fill('Atendimento concluído - E2E test');
    await closeDialog
      .locator('button')
      .filter({ hasText: /^Fechar$/ })
      .click();

    await expect(
      page.getByRole('main').getByText('✅ Finalizado', { exact: true }).first()
    ).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Encounter closed');

    // ── Step 8: Validate final state ──
    console.log('   ✅ Validating final state...');
    await expect(
      page.getByRole('main').getByText('✅ Finalizado', { exact: true }).first()
    ).toBeVisible();

    await page.goto(`${SPA_URL}/encounters`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: '🩺 Atendimentos', exact: true })).toBeVisible({
      timeout: 15000
    });
    console.log('   ✅ Encounters list accessible');

    console.log('   🎉 Full critical path completed successfully!');
  });
});

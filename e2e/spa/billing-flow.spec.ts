import { test, expect, loginViaToken } from './fixtures/spa-fixture';

/**
 * SPA E2E — Fluxo Completo de Billing (Faturamento)
 *
 * Fluxo validado:
 * 1. Login na SPA
 * 2. Preparar encounter elegível via API (com cleanup)
 * 3. Navegar para Billing e validar carregamento
 * 4. Gerar estimativa (draft → estimated)
 * 5. Adicionar itens de cobrança
 * 6. Abrir cobrança, fechar o atendimento e registrar recebimento no caixa
 * 7. Validar feedback visual e estado final
 *
 * Status flow:
 *   draft → estimated (Gerar Estimativa)
 *   estimated → open (Atualizar Status)
 *   open → settled (recebimento auditável no atendimento)
 *   settled → terminal (sem ações)
 *
 * Execução:
 *   npx playwright test --config playwright-spa.config.ts -g "Billing"
 */

const API_URL = process.env.API_URL || 'http://localhost:3101';
const SPA_URL = process.env.SPA_URL || 'http://localhost:3102';

test.describe('Fluxo Completo de Billing (Faturamento)', () => {
  test('gera estimativa, adiciona itens, atualiza status e quita faturamento', async ({
    page,
    apiCall,
    cleanup
  }) => {
    const mainContent = page.getByRole('main');
    const pageHeaderTitle = mainContent.locator('.app-page-header__title');
  let cashRegisterId: string | undefined;
  let ownsCashRegister = false;
    // ── Step 0: Prepare test data ──
    console.log('   📦 Creating test data...');
    const ownerName = `Tutor Billing E2E ${Date.now()}`;
    const patientName = `Paciente Billing E2E ${Date.now()}`;

    const owner = await apiCall.post('/owners', {
      fullName: ownerName,
      documentId: `BILL-E2E-${Date.now()}`,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
      financialResponsible: false,
      status: 'active'
    });
    cleanup.track({ type: 'owner', id: owner.id });
    console.log(`   ✅ Owner: ${owner.fullName}`);

    const patient = await apiCall.post('/patients', {
      name: patientName,
      species: 'canine',
      sex: 'male',
      primaryOwnerId: owner.id,
      status: 'active'
    });
    cleanup.track({ type: 'patient', id: patient.id });
    console.log(`   ✅ Patient: ${patient.name}`);

    const encounter = await apiCall.post('/encounters', {
      patientId: patient.id,
      ownerId: owner.id,
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Billing E2E test'
    });
    cleanup.track({ type: 'encounter', id: encounter.id });
    console.log(`   ✅ Encounter: ${encounter.id}`);

    // ── Step 1: Login ──
    console.log('   🔐 Logging in...');
    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    console.log('   ✅ Logged in');

    // ── Step 2: Navigate to Billing detail ──
    console.log('   💰 Navigating to Billing...');
    await page.goto(`${SPA_URL}/billing/${encounter.id}`);
    await page.waitForLoadState('networkidle');

    // Validate billing page loaded
    await expect(pageHeaderTitle).toContainText('Faturamento', {
      timeout: 15000
    });
    console.log('   ✅ Billing page loaded');

    // Billing is intentionally created only after an explicit financial action.
    await expect(page.getByText('Cobrança ainda não persistida')).toBeVisible({ timeout: 10000 });
    await page
      .locator('.billing-empty-state__actions')
      .getByRole('button', { name: /Gerar estimativa/i })
      .click();
    await expect(page.getByText('Estimado', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Estimate explicitly created');

    // Validate patient and owner info
    await expect(mainContent.getByText(patientName).first()).toBeVisible({ timeout: 10000 });
    await expect(mainContent.getByText(ownerName).first()).toBeVisible({ timeout: 10000 });
    console.log('   ✅ Patient and owner info visible');

    // The explicit creation action must not remain available after creation.
    await expect(page.getByRole('button', { name: /Gerar estimativa/i })).toBeHidden({
      timeout: 10000
    });
    console.log('   ✅ Estimate action hidden after creation');

    // ── Step 4: Add billing items ──
    console.log('   📦 Adding billing items...');

    // Add first item: Consulta
    await page.getByRole('button', { name: 'Adicionar Item' }).click();
    await expect(page.getByRole('heading', { name: /Adicionar Item de Cobran/i })).toBeVisible({
      timeout: 10000
    });

    await page.selectOption('#itemType', 'service');
    await page.locator('#itemDescription').fill('Consulta veterinária');
    await page.locator('#itemQuantity').fill('1');
    await page.locator('#itemPrice').fill('150');
    await page.getByRole('button', { name: /^Adicionar$/ }).click();

    // Wait for item to appear in table
    await expect(page.getByText('Consulta veterinária')).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Item 1 added: Consulta veterinária');

    // Add second item: Exame
    await page.getByRole('button', { name: 'Adicionar Item' }).click();
    await page.selectOption('#itemType', 'exam');
    await page.locator('#itemDescription').fill('Hemograma completo');
    await page.locator('#itemQuantity').fill('1');
    await page.locator('#itemPrice').fill('200');
    await page.getByRole('button', { name: /^Adicionar$/ }).click();

    await expect(page.getByText('Hemograma completo')).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Item 2 added: Hemograma completo');

    // Verify both items in table
    const tableRows = page.locator('.data-table tbody tr');
    await expect(tableRows).toHaveCount(2, { timeout: 10000 });
    console.log('   ✅ 2 items in billing table');

    // ── Step 5: Update status to "Aberto" ──
    console.log('   📋 Updating status to "Aberto"...');
    await expect(page.getByRole('button', { name: 'Atualizar Status' })).toBeVisible({
      timeout: 10000
    });
    await page.getByRole('button', { name: 'Atualizar Status' }).click();

    await expect(page.getByRole('heading', { name: /^Atualizar Status$/ })).toBeVisible({
      timeout: 10000
    });
    await page.selectOption('#newStatus', 'open');
    await page.locator('#adminNotes').fill('Faturamento aberto para cobrança');
    await page.getByRole('button', { name: /^Atualizar$/ }).click();

    // Wait for status to change
    await expect(page.getByText('Aberto', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Status: Aberto (open)');

    // ── Step 6: Close the encounter and settle through the cash receipt ──
    console.log('   💵 Settling billing through the auditable cash receipt...');
    try {
      const cashDashboard = await apiCall.get('/cash-register/dashboard');
      const existingRegister = cashDashboard.openRegister as { id?: string } | null | undefined;
      if (existingRegister?.id) {
        cashRegisterId = existingRegister.id;
      } else {
        const openedRegister = await apiCall.post('/cash-register/open', {
          openingAmount: 0.01,
          notes: `Abertura para billing E2E ${Date.now()}`
        });
        cashRegisterId = openedRegister.id as string;
        ownsCashRegister = true;
      }

      await page.goto(`${SPA_URL}/encounters/${encounter.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('button', { name: 'Fechar Atendimento' })).toBeVisible({
        timeout: 15000
      });
      await page.getByRole('button', { name: 'Fechar Atendimento' }).click();
      const closeDialog = page.getByRole('dialog', { name: 'Fechar Atendimento' });
      await closeDialog.locator('#closeReason').fill('Atendimento concluído para recebimento E2E');
      await closeDialog.locator('button').filter({ hasText: /^Fechar$/ }).click();
      await expect(page.getByText('✅ Finalizado', { exact: true }).first()).toBeVisible({
        timeout: 15000
      });

      await page.locator('button.workflow-tab').filter({ hasText: 'Fechamento' }).click();
      await page.getByRole('button', { name: 'Receber em dinheiro' }).click();
      const receiptDialog = page.getByRole('dialog', { name: 'Receber em dinheiro' });
      await expect(receiptDialog).toBeVisible({ timeout: 10000 });
      await receiptDialog.getByRole('button', { name: 'Confirmar recebimento' }).click();
      await expect(page.getByText('R$ 0,00').first()).toBeVisible({ timeout: 15000 });
      console.log('   ✅ Cash receipt committed and balance refreshed');

      // ── Step 7: Validate final billing state ──
      console.log('   ✅ Validating final state...');
      await page.goto(`${SPA_URL}/billing/${encounter.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Quitado', { exact: true }).first()).toBeVisible({
        timeout: 15000
      });
      await expect(page.getByRole('button', { name: 'Adicionar Item' })).toBeHidden({
        timeout: 10000
      });
      await expect(page.getByRole('button', { name: 'Atualizar Status' })).toBeHidden({
        timeout: 10000
      });
      await expect(page.getByRole('button', { name: /Gerar estimativa/i })).toBeHidden({
        timeout: 10000
      });
      await expect(page.getByText('Consulta veterinária')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Hemograma completo')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('BRL')).toBeVisible({ timeout: 10000 });
      console.log('   ✅ Settled billing is immutable and retains its items');

      // ── Step 8: Verify navigation back to billing list ──
      console.log('   🔙 Verifying navigation...');
      await page.goto(`${SPA_URL}/billing`);
      await page.waitForLoadState('networkidle');
      await expect(pageHeaderTitle).toHaveText('Contas a Receber', {
        timeout: 15000
      });
      console.log('   ✅ Billing list accessible');
      console.log('   🎉 Full billing flow completed successfully!');
    } finally {
      if (cashRegisterId && ownsCashRegister) {
        try {
          const reconciliation = await apiCall.get(
            `/cash-register/reconciliation?registerId=${encodeURIComponent(cashRegisterId)}`
          );
          await apiCall.post('/cash-register/close', {
            closingAmount: reconciliation.expectedAmount,
            notes: 'Limpeza do fluxo E2E de billing'
          });
        } catch {
          // Keep the original assertion failure while leaving cleanup best-effort.
        }
      }
    }
  });

  test('valida elementos da página de billing e navegação', async ({ page, apiCall, cleanup }) => {
    const mainContent = page.getByRole('main');
    const pageHeaderTitle = mainContent.locator('.app-page-header__title');
    // Prepare minimal data
    const owner = await apiCall.post('/owners', {
      fullName: `Tutor BillList ${Date.now()}`,
      documentId: `BLL-E2E-${Date.now()}`,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
      financialResponsible: false,
      status: 'active'
    });
    cleanup.track({ type: 'owner', id: owner.id });

    const patient = await apiCall.post('/patients', {
      name: `Paciente BillList ${Date.now()}`,
      species: 'feline',
      sex: 'female',
      primaryOwnerId: owner.id,
      status: 'active'
    });
    cleanup.track({ type: 'patient', id: patient.id });

    const encounter = await apiCall.post('/encounters', {
      patientId: patient.id,
      ownerId: owner.id,
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Billing list validation'
    });
    cleanup.track({ type: 'encounter', id: encounter.id });

    // Login
    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    // Navigate to billing list
    await page.goto(`${SPA_URL}/billing`);
    await page.waitForLoadState('networkidle');

    // Validate page title
    await expect(pageHeaderTitle).toHaveText('Contas a Receber', {
      timeout: 15000
    });

    // Validate "Novo" or navigation link exists
    // The billing list should show a table or empty state
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    console.log('   ✅ Billing list page loaded');

    // Navigate to billing detail
    await page.goto(`${SPA_URL}/billing/${encounter.id}`);
    await page.waitForLoadState('networkidle');

    // Validate detail page elements
    await expect(pageHeaderTitle).toContainText('Faturamento', {
      timeout: 15000
    });

    // No billing record is created by a read-only detail navigation.
    await expect(page.getByText('Cobrança ainda não persistida')).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator('.billing-empty-state__actions').getByRole('button', { name: /Gerar estimativa/i })
    ).toBeVisible({
      timeout: 10000
    });

    // Validate back link
    const backLink = page.getByRole('link', { name: 'Voltar' }).first();
    await expect(backLink).toBeVisible({ timeout: 10000 });
    await expect(backLink).toHaveAttribute('href', '/billing');

    console.log('   ✅ Billing detail page elements validated');
  });
});

import { test, expect, loginViaToken } from './fixtures/spa-fixture';

/**
 * SPA E2E — Fluxo de Agendamento (Appointment)
 *
 * Fluxo validado:
 * 1. Login na SPA
 * 2. Criar tutor + paciente via API (com cleanup)
 * 3. Criar agendamento pela UI (form completo)
 * 4. Validar agendamento no cockpit operacional da agenda
 * 5. Abrir detalhe do agendamento
 * 6. Cancelar agendamento
 * 7. Validar que o status cancelado volta a aparecer na agenda
 *
 * Nota sobre a agenda:
 *   A página deixou de ser um Kanban fixo de 4 colunas e hoje opera
 *   como cockpit multiprofissional com filtros laterais, timeline e
 *   ações rápidas. O teste precisa refletir o estado real do produto.
 *
 * Execução:
 *   npx playwright test --config playwright-spa.config.ts -g "Agendamento"
 */

const API_URL = process.env.API_URL || 'http://localhost:3101';
const SPA_URL = process.env.SPA_URL || 'http://localhost:3102';

test.describe('Fluxo de Agendamento (Appointment)', () => {
  test('cria agendamento pela UI, valida no cockpit e cancela', async ({
    page,
    apiCall,
    cleanup
  }) => {
    // ── Step 0: Prepare test data ──
    console.log('   📦 Creating test data...');
    const ownerName = `Tutor Appt E2E ${Date.now()}`;
    const patientName = `Paciente Appt E2E ${Date.now()}`;

    const owner = await apiCall.post('/owners', {
      fullName: ownerName,
      documentId: `APPT-E2E-${Date.now()}`,
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

    // ── Step 1: Login ──
    console.log('   🔐 Logging in...');
    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    console.log('   ✅ Logged in');

    // ── Step 2: Create appointment via UI ──
    console.log('   📅 Creating appointment via UI...');
    await page.goto(`${SPA_URL}/appointments/new`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Novo Agendamento/ }).first()).toBeVisible({
      timeout: 10000
    });

    // Select patient using deterministic wait
    const searchInput = page.getByPlaceholder(/buscar paciente/i);
    await searchInput.click();
    await searchInput.fill(patientName);
    const option = page.getByRole('option', { name: patientName });
    await option.waitFor({ timeout: 10000 });
    await option.click();
    await page.waitForSelector('.search-select__dropdown', { state: 'detached', timeout: 5000 });

    // Set date/time — use tomorrow at 10:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const dateStr = tomorrow.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    await page.locator('#scheduledAt').fill(dateStr);

    // Set visit type
    await page.selectOption('#visitType', 'scheduled');

    // Set reason
    await page.locator('#reason').fill('Consulta de rotina - E2E');

    // Submit
    await page.getByRole('button', { name: 'Salvar Agendamento' }).click();

    await expect(page).toHaveURL(/\/appointments\/(?!new$)[^/]+$/, { timeout: 10000 });
    console.log('   ✅ Appointment created');

    const appointmentUrl = page.url();
    const appointmentId = appointmentUrl.split('/').pop();
    console.log(`   ✅ Appointment ID: ${appointmentId}`);

    const referenceDate = tomorrow.toISOString().slice(0, 10);

    // ── Step 3: Verify appointment in the operational cockpit ──
    console.log('   📋 Verifying appointment in the operational cockpit...');
    await page.goto(`${SPA_URL}/appointments`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Agenda/ }).first()).toBeVisible({
      timeout: 15000
    });

    await page.getByRole('button', { name: `Selecionar ${referenceDate}`, exact: true }).click();
    // The cockpit intentionally collapses busy hourly cells after two cards.
    // Narrow by the just-created patient so this assertion stays valid on a
    // database that already contains appointments from restart/retry runs.
    await page.getByPlaceholder('Pesquisar Cliente').fill(patientName);
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(patientName)).toBeVisible({ timeout: 15000 });
    console.log(`   ✅ Patient "${patientName}" visible in operational cockpit`);

    const appointmentCard = page.locator('.timeline-item').filter({ hasText: patientName }).first();
    await expect(appointmentCard).toContainText('Agendado', { timeout: 10000 });
    console.log('   ✅ Appointment visible with scheduled operational state');

    // ── Step 4: Open appointment detail ──
    console.log('   🔍 Opening appointment detail...');
    await appointmentCard.click();

    const appointmentDrawer = page.getByRole('dialog');
    await expect(appointmentDrawer).toBeVisible({ timeout: 10000 });
    await expect(appointmentDrawer).toContainText(patientName);
    await expect(appointmentDrawer).toContainText(ownerName);
    await appointmentDrawer.getByRole('link', { name: 'Ver detalhe completo' }).click();

    await expect(page).toHaveURL(/\/appointments\/(?!new$)[^/]+$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Agendamento/ }).first()).toBeVisible({
      timeout: 15000
    });
    console.log('   ✅ Appointment detail page loaded');

    // Verify appointment details
    await expect(page.getByText(patientName).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(ownerName).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Consulta de rotina - E2E')).toBeVisible({ timeout: 10000 });
    console.log('   ✅ Appointment details verified');

    // ── Step 5: Cancel appointment ──
    console.log('   ❌ Cancelling appointment...');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancelar Agendamento' }).click();

    // Wait for status to change
    await expect(page.getByText('Cancelado')).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Appointment cancelled');

    // ── Step 6: Verify cancelled appointment in cockpit ──
    console.log('   📋 Verifying cancelled appointment in cockpit...');
    await page.goto(`${SPA_URL}/appointments`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: `Selecionar ${referenceDate}`, exact: true }).click();
    await page.getByPlaceholder('Pesquisar Cliente').fill(patientName);
    await page.getByRole('button', { name: 'Cancelado', exact: true }).click();
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(patientName)).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator('.timeline-item').filter({ hasText: patientName }).first()
    ).toContainText('Cancelado', { timeout: 10000 });
    console.log('   ✅ Cancelled appointment visible in cockpit');

    // ── Step 7: Verify back navigation ──
    console.log('   🔙 Verifying navigation...');
    await page.goto(`${SPA_URL}/appointments`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Agenda/ }).first()).toBeVisible({
      timeout: 10000
    });
    console.log('   ✅ Appointments list accessible');

    console.log('   🎉 Appointment flow completed successfully!');
  });

  test('valida elementos da página de agendamento (cockpit)', async ({ page }) => {
    // Login
    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    // Navigate to appointments
    await page.goto(`${SPA_URL}/appointments`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Agenda/ }).first()).toBeVisible({
      timeout: 10000
    });

    await expect(page.getByText(/Coluna temporal por data/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Atualizar' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Esteira', exact: true })).toBeVisible({
      timeout: 10000
    });
    await expect(
      page.getByRole('button', { name: 'Criar agendamento', exact: true }).first()
    ).toBeVisible({
      timeout: 10000
    });
    await expect(page.getByText('Filtrar por...')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.mini-calendar__day--selected')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('group', { name: /Modo da agenda/ })).toBeVisible({
      timeout: 10000
    });
    await expect(page.getByRole('button', { name: 'Hoje' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /Abrir formulário completo/ })).toBeVisible({
      timeout: 10000
    });

    console.log('   ✅ Appointments cockpit page elements validated');
  });
});

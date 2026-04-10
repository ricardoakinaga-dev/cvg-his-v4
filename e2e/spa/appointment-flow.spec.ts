import { test, expect, loginViaToken } from './fixtures/spa-fixture';

/**
 * SPA E2E — Fluxo de Agendamento (Appointment)
 *
 * Fluxo validado:
 * 1. Login na SPA
 * 2. Criar tutor + paciente via API (com cleanup)
 * 3. Criar agendamento pela UI (form completo)
 * 4. Validar agendamento na agenda Kanban
 * 5. Abrir detalhe do agendamento
 * 6. Cancelar agendamento
 * 7. Validar que agendamento aparece na coluna "Cancelados"
 *
 * Nota sobre check-in/encounter:
 *   A SPA atual NÃO possui botão de check-in nos cards do Kanban
 *   nem criação de encounter a partir de appointment.
 *   O detalhe do appointment oferece apenas visualização + cancelamento.
 *   Este teste cobre o máximo realista disponível na UI atual.
 *
 * Execução:
 *   npx playwright test --config playwright-spa.config.ts -g "Agendamento"
 */

const API_URL = process.env.API_URL || 'http://localhost:3101';
const SPA_URL = process.env.SPA_URL || 'http://localhost:3102';

test.describe('Fluxo de Agendamento (Appointment)', () => {
  test('cria agendamento pela UI, valida no Kanban e cancela', async ({
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

    await expect(page.getByRole('heading', { name: /Novo Agendamento/ })).toBeVisible({
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

    // Wait for success
    await expect(page.getByText('Agendamento criado com sucesso')).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Appointment created');

    // Wait for redirect to detail page
    await expect(page).toHaveURL(/\/appointments\/appt_/, { timeout: 10000 });
    const appointmentUrl = page.url();
    const appointmentId = appointmentUrl.split('/').pop();
    console.log(`   ✅ Appointment ID: ${appointmentId}`);

    // ── Step 3: Verify appointment in Kanban ──
    console.log('   📋 Verifying appointment in Kanban...');
    await page.goto(`${SPA_URL}/appointments`);
    await page.waitForLoadState('networkidle');

    // Wait for Kanban view to load
    await expect(page.getByRole('heading', { name: /Agenda/ })).toBeVisible({ timeout: 15000 });

    // Verify the Kanban columns exist
    const kanbanColumns = page.locator('.kanban-column');
    await expect(kanbanColumns).toHaveCount(4, { timeout: 10000 });
    console.log('   ✅ Kanban columns visible (4)');

    // Verify the patient name appears in the Kanban
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 15000 });
    console.log(`   ✅ Patient "${patientName}" visible in Kanban`);

    // Verify the appointment is in the "Agendados" column
    const scheduledColumn = kanbanColumns.first();
    await expect(scheduledColumn.getByText('Agendados')).toBeVisible({ timeout: 10000 });
    await expect(scheduledColumn.getByText(patientName)).toBeVisible({ timeout: 10000 });
    console.log('   ✅ Appointment in "Agendados" column');

    // ── Step 4: Open appointment detail ──
    console.log('   🔍 Opening appointment detail...');
    const appointmentCard = page.locator('.kanban-card').first();
    await appointmentCard.click();

    await expect(page).toHaveURL(/\/appointments\/appt_/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Agendamento/ })).toBeVisible({
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

    // ── Step 6: Verify cancelled appointment in Kanban ──
    console.log('   📋 Verifying cancelled appointment in Kanban...');
    await page.goto(`${SPA_URL}/appointments`);
    await page.waitForLoadState('networkidle');

    // Filter by cancelled status
    await page.selectOption('select', 'cancelled');
    await page.waitForTimeout(500);

    // Verify patient appears in cancelled column
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 10000 });
    console.log('   ✅ Cancelled appointment visible in "Cancelados" column');

    // ── Step 7: Verify back navigation ──
    console.log('   🔙 Verifying navigation...');
    await page.goto(`${SPA_URL}/appointments`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Agenda/ })).toBeVisible({ timeout: 10000 });
    console.log('   ✅ Appointments list accessible');

    console.log('   🎉 Appointment flow completed successfully!');
  });

  test('valida elementos da página de agendamento (Kanban)', async ({ page }) => {
    // Login
    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    // Navigate to appointments
    await page.goto(`${SPA_URL}/appointments`);
    await page.waitForLoadState('networkidle');

    // Validate page title
    await expect(page.getByRole('heading', { name: /Agenda/ })).toBeVisible({ timeout: 15000 });

    // Validate Kanban columns
    const columns = page.locator('.kanban-column');
    await expect(columns).toHaveCount(4, { timeout: 10000 });

    // Validate column headers
    await expect(columns.nth(0).getByText('Agendados')).toBeVisible({ timeout: 10000 });
    await expect(columns.nth(1).getByText('Em Atendimento')).toBeVisible({ timeout: 10000 });
    await expect(columns.nth(2).getByText(/Conclu/)).toBeVisible({ timeout: 10000 });
    await expect(columns.nth(3).getByText('Cancelados')).toBeVisible({ timeout: 10000 });

    // Validate "Novo Agendamento" button
    await expect(page.getByRole('link', { name: /Novo Agendamento/ })).toBeVisible({
      timeout: 10000
    });

    // Validate status filter
    const statusFilter = page.locator('select');
    await expect(statusFilter).toBeVisible({ timeout: 10000 });

    console.log('   ✅ Appointments Kanban page elements validated');
  });
});

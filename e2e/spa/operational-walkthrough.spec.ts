import { test, expect, loginViaToken } from './fixtures/spa-fixture';

const SPA_URL = process.env.SPA_URL || 'http://localhost:3102';

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function todayAtBusinessHour(): Date {
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  return date;
}

test.describe('Walkthrough operacional principal', () => {
  test('Início -> Recepção -> Agenda/Esteira -> Atendimento -> Handoff -> Prontuário -> Comanda/Billing', async ({
    page,
    apiCall,
    cleanup
  }, testInfo) => {
    const suffix = uniqueSuffix();
    const ownerName = `Tutor Walkthrough ${suffix}`;
    const patientName = `Paciente Walkthrough ${suffix}`;
    const scheduledAt = todayAtBusinessHour();

    const owner = await apiCall.post('/owners', {
      fullName: ownerName,
      documentId: `WT-${suffix}`,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
      financialResponsible: false,
      status: 'active'
    });
    cleanup.track({ type: 'owner', id: owner.id });

    const patient = await apiCall.post('/patients', {
      name: patientName,
      species: 'canine',
      sex: 'female',
      primaryOwnerId: owner.id,
      status: 'active'
    });
    cleanup.track({ type: 'patient', id: patient.id });

    const appointment = await apiCall.post('/appointments', {
      patientId: patient.id,
      ownerId: owner.id,
      scheduledAt: scheduledAt.toISOString(),
      visitType: 'scheduled',
      reason: 'Walkthrough operacional doc 890',
      unit: 'Clinica',
      specialty: 'Clinico geral',
      resourceLabel: 'Consultorio 1'
    });
    cleanup.track({ type: 'appointment', id: appointment.id });

    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Início' }).first()).toBeVisible({
      timeout: 15000
    });
    await expect(page.getByRole('heading', { name: 'Agenda e lembretes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Comandas abertas' })).toBeVisible();

    await page.goto(`${SPA_URL}/appointments`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Agenda/ }).first()).toBeVisible({
      timeout: 15000
    });
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 15000 });

    await page.goto(`${SPA_URL}/reception`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Recepção' }).first()).toBeVisible({
      timeout: 15000
    });
    const receptionSearch = page.getByRole('search');
    await receptionSearch.getByPlaceholder(/buscar tutor ou paciente/i).fill(patientName);
    await receptionSearch.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByText(patientName).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: 'Preparar check-in' }).first().click();

    await expect(page.getByText('Check-in preparado pela recepção')).toBeVisible({
      timeout: 15000
    });
    await page.getByRole('button', { name: 'Iniciar check-in' }).click();
    await expect(page.getByRole('dialog', { name: 'Check-in Rápido' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar Check-in' }).click();
    await expect(page.getByText('Check-in realizado com sucesso!')).toBeVisible({
      timeout: 15000
    });

    const queueRow = page.locator('tbody tr').filter({ hasText: patientName }).first();
    await expect(queueRow).toBeVisible({ timeout: 15000 });
    await expect(queueRow).toContainText('Destino provável: Triagem');
    await expect(queueRow).toContainText('Recepção');
    await queueRow.getByRole('button', { name: 'Chamar' }).click();
    await expect(queueRow).toContainText('Chamado', { timeout: 15000 });
    await queueRow.getByRole('button', { name: 'Abrir triagem' }).click();

    await expect(page).toHaveURL(/\/encounters\/[^/]+$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Atendimento clínico' })).toBeVisible({
      timeout: 15000
    });
    const encounterId = page.url().split('/').pop();
    expect(encounterId).toBeTruthy();
    cleanup.track({ type: 'encounter', id: encounterId ?? '' });

    await page.getByRole('button', { name: /Fechamento/ }).click();
    await expect(page.getByRole('heading', { name: 'Pré-handoff para recepção' })).toBeVisible({
      timeout: 15000
    });

    const handoffSummary = `Resumo HOFF-MIN-1 ${suffix}`;
    const handoffInstructions = `Recepcao deve confirmar ACK HOFF-MIN-1 ${suffix}`;
    await page.locator('#clinicalHandoffSummary').fill(handoffSummary);
    await page.locator('#clinicalHandoffInstructions').fill(handoffInstructions);
    await page.locator('#clinicalHandoffPriority').selectOption('high');
    await page.getByRole('button', { name: 'Enviar para recepção' }).click();

    await expect(page.getByText('Enviado para recepcao')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(handoffInstructions)).toBeVisible();

    const handoffsAfterSend = await apiCall.get(`/clinical-handoffs?encounterId=${encounterId}`);
    expect(handoffsAfterSend.items).toHaveLength(1);
    expect(handoffsAfterSend.items[0].handoffStatus).toBe('sent_to_reception');
    expect(handoffsAfterSend.items[0].clinicalSummary).toBe(handoffSummary);

    await page.goto(`${SPA_URL}/reception`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Recepção' }).first()).toBeVisible({
      timeout: 15000
    });
    const handoffRow = page
      .locator('.queue-preview-row')
      .filter({ hasText: handoffSummary })
      .first();
    await expect(handoffRow).toBeVisible({ timeout: 15000 });
    await expect(handoffRow).toContainText(handoffInstructions);
    await handoffRow.getByRole('button', { name: 'Confirmar recebimento' }).click();

    await expect(page.getByText(handoffSummary)).toBeHidden({ timeout: 15000 });
    const handoffsAfterAck = await apiCall.get(`/clinical-handoffs?encounterId=${encounterId}`);
    expect(handoffsAfterAck.items).toHaveLength(1);
    expect(handoffsAfterAck.items[0].handoffStatus).toBe('acknowledged_by_reception');
    expect(handoffsAfterAck.items[0].acknowledgedAt).toBeTruthy();

    await page.goto(`${SPA_URL}/encounters/${encounterId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Fechamento/ }).click();
    await expect(page.getByText('Recebido pela recepcao')).toBeVisible({ timeout: 15000 });

    await page
      .getByLabel('Cockpit do atendimento')
      .getByRole('link', { name: 'Continuar prontuário' })
      .click();
    await expect(page).toHaveURL(new RegExp(`/medical-records/${encounterId}`), {
      timeout: 15000
    });
    await expect(page.getByRole('heading', { name: 'Prontuário clínico' })).toBeVisible({
      timeout: 15000
    });
    await expect(page.getByRole('heading', { name: 'Queixa principal' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Conduta e próximos passos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Comanda', exact: true }).first()).toBeVisible();

    await page.getByRole('link', { name: 'Comanda', exact: true }).first().click();
    await expect(page).toHaveURL(/\/counter-sales\?/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Comandas' }).first()).toBeVisible({
      timeout: 15000
    });
    await expect(page.getByText('Comanda preparada pela recepção')).toBeVisible({
      timeout: 15000
    });

    await page.goto(`${SPA_URL}/billing/${encounterId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Faturamento' }).first()).toBeVisible({
      timeout: 15000
    });
    await expect(page.getByText('Cobrança ainda não persistida')).toBeVisible({
      timeout: 15000
    });

    await testInfo.attach('walkthrough-context', {
      body: JSON.stringify(
        {
          ownerId: owner.id,
          patientId: patient.id,
          appointmentId: appointment.id,
          encounterId
        },
        null,
        2
      ),
      contentType: 'application/json'
    });
  });
});

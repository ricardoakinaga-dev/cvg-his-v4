import { test, expect, loginViaToken } from './fixtures/spa-fixture';

const SPA_URL = process.env.SPA_URL || 'http://localhost:3102';

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

test.describe('Busca Mestre 360 -> cockpit -> recepcao', () => {
  test('localiza paciente prioritario, abre cockpit 360 e prepara esteira na recepcao', async ({
    page,
    apiCall,
    cleanup
  }) => {
    const suffix = uniqueSuffix();
    const ownerName = `Tutor Prioridade 360 ${suffix}`;
    const patientName = `Paciente Prioridade 360 ${suffix}`;

    const owner = await apiCall.post('/owners', {
      fullName: ownerName,
      documentId: `MS360-${suffix}`,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
      financialResponsible: true,
      status: 'active'
    });
    cleanup.track({ type: 'owner', id: owner.id });

    const patient = await apiCall.post('/patients', {
      name: patientName,
      species: 'canine',
      sex: 'female',
      primaryOwnerId: owner.id,
      chronicDisease: 'Cardiopatia controlada',
      allergy: 'Dipirona',
      status: 'active'
    });
    cleanup.track({ type: 'patient', id: patient.id });

    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/master-search`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Busca Mestre' }).first()).toBeVisible({
      timeout: 15000
    });

    await page.getByPlaceholder(/buscar por tutor, paciente/i).fill(patientName);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();

    const patientRow = page.locator('tbody tr').filter({ hasText: patientName }).first();
    await expect(patientRow).toBeVisible({ timeout: 15000 });
    await expect(patientRow).toContainText('Atenção clínica');
    await expect(page.getByLabel('Resumo Prioridade 360')).toContainText('Atenção clínica');

    await patientRow.getByRole('link', { name: 'Abrir cockpit' }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`), { timeout: 15000 });
    await expect(page.getByLabel('Cockpit 360 do paciente')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Cardiopatia controlada')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Dipirona')).toBeVisible();

    await page.goto(`${SPA_URL}/reception`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Recepção' }).first()).toBeVisible({
      timeout: 15000
    });

    const receptionSearch = page.getByRole('search');
    await receptionSearch.getByPlaceholder(/buscar tutor ou paciente/i).fill(patientName);
    await receptionSearch.getByRole('button', { name: 'Buscar', exact: true }).click();

    const quickActions = page.getByLabel('Acoes rapidas contextuais da recepcao');
    await expect(quickActions).toBeVisible({ timeout: 15000 });
    await expect(quickActions).toContainText('Prioridade 360');
    await expect(quickActions).toContainText('Atenção clínica');
    await expect(quickActions).toContainText('Abrir cockpit 360 antes de seguir com agenda, esteira ou comanda.');

    await quickActions.getByRole('link', { name: /Atenção clínica/ }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`), { timeout: 15000 });
    await expect(page.getByLabel('Cockpit 360 do paciente')).toBeVisible({ timeout: 15000 });

    await page.goto(`${SPA_URL}/reception`);
    await page.waitForLoadState('networkidle');
    await receptionSearch.getByPlaceholder(/buscar tutor ou paciente/i).fill(patientName);
    await receptionSearch.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(quickActions).toBeVisible({ timeout: 15000 });

    await quickActions.getByRole('link', { name: /Preparar esteira/ }).click();
    await expect(page).toHaveURL(/\/queue\?/, { timeout: 15000 });
    await expect(page.getByText('Check-in preparado pela recepção')).toBeVisible({
      timeout: 15000
    });
    await expect(page.getByText(patientName).first()).toBeVisible();
  });

  test('prioriza paciente com exames pendentes na Busca Mestre e na recepcao', async ({
    page,
    apiCall,
    cleanup
  }) => {
    const suffix = uniqueSuffix();
    const ownerName = `Tutor Laboratorio 360 ${suffix}`;
    const patientName = `Paciente Laboratorio 360 ${suffix}`;

    const owner = await apiCall.post('/owners', {
      fullName: ownerName,
      documentId: `LAB360-${suffix}`,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
      financialResponsible: true,
      status: 'active'
    });
    cleanup.track({ type: 'owner', id: owner.id });

    const patient = await apiCall.post('/patients', {
      name: patientName,
      species: 'canine',
      sex: 'male',
      primaryOwnerId: owner.id,
      chronicDisease: 'Doenca cardiaca',
      status: 'active'
    });
    cleanup.track({ type: 'patient', id: patient.id });

    const encounter = await apiCall.post('/encounters', {
      patientId: patient.id,
      ownerId: owner.id,
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Pedido laboratorial E2E 360'
    });
    cleanup.track({ type: 'encounter', id: encounter.id });

    await apiCall.post('/laboratory/orders', {
      encounterId: encounter.id,
      patientId: patient.id,
      examType: 'Hemograma',
      reason: 'Prioridade 360 E2E'
    });

    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/master-search`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Busca Mestre' }).first()).toBeVisible({
      timeout: 15000
    });

    await page.getByPlaceholder(/buscar por tutor, paciente/i).fill(patientName);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();

    const patientRow = page.locator('tbody tr').filter({ hasText: patientName }).first();
    await expect(patientRow).toBeVisible({ timeout: 15000 });
    await expect(patientRow).toContainText('Exames pendentes');
    await expect(page.getByLabel('Resumo Prioridade 360')).toContainText('Exames pendentes');

    await patientRow.getByRole('link', { name: 'Abrir cockpit' }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`), { timeout: 15000 });
    await expect(page.getByLabel('Cockpit 360 do paciente')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('1 exame(s) pendente(s)')).toBeVisible({ timeout: 15000 });

    await page.goto(`${SPA_URL}/reception`);
    await page.waitForLoadState('networkidle');

    const receptionSearch = page.getByRole('search');
    await receptionSearch.getByPlaceholder(/buscar tutor ou paciente/i).fill(patientName);
    await receptionSearch.getByRole('button', { name: 'Buscar', exact: true }).click();

    const quickActions = page.getByLabel('Acoes rapidas contextuais da recepcao');
    await expect(quickActions).toBeVisible({ timeout: 15000 });
    await expect(quickActions).toContainText('Prioridade 360');
    await expect(quickActions).toContainText('Exames pendentes');
    await expect(quickActions).toContainText(
      '1 exame(s) pendente(s). Abrir cockpit 360 antes de seguir com agenda, esteira ou comanda.'
    );

    await quickActions.getByRole('link', { name: /Exames pendentes/ }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`), { timeout: 15000 });
    await expect(page.getByLabel('Cockpit 360 do paciente')).toBeVisible({ timeout: 15000 });
  });

  test('prioriza paciente com preventivo vencido na Busca Mestre e na recepcao', async ({
    page,
    apiCall,
    cleanup
  }) => {
    const suffix = uniqueSuffix();
    const ownerName = `Tutor Preventivo 360 ${suffix}`;
    const patientName = `Paciente Preventivo 360 ${suffix}`;

    const owner = await apiCall.post('/owners', {
      fullName: ownerName,
      documentId: `PREV360-${suffix}`,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
      financialResponsible: true,
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

    await apiCall.post('/vaccines-dewormers', {
      patientId: patient.id,
      ownerId: owner.id,
      clientName: ownerName,
      animalName: patientName,
      eventDate: '2026-05-01',
      itemType: 'vaccine',
      description: 'Vacina V10 vencida E2E 360',
      observation: 'Evento preventivo vencido para prioridade 360'
    });

    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/master-search`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Busca Mestre' }).first()).toBeVisible({
      timeout: 15000
    });

    await page.getByPlaceholder(/buscar por tutor, paciente/i).fill(patientName);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();

    const patientRow = page.locator('tbody tr').filter({ hasText: patientName }).first();
    await expect(patientRow).toBeVisible({ timeout: 15000 });
    await expect(patientRow).toContainText('Preventivo vencido');
    await expect(page.getByLabel('Resumo Prioridade 360')).toContainText('Preventivo vencido');

    await patientRow.getByRole('link', { name: 'Abrir cockpit' }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`), { timeout: 15000 });
    const cockpit360 = page.getByLabel('Cockpit 360 do paciente');
    await expect(cockpit360).toBeVisible({ timeout: 15000 });
    await expect(cockpit360.getByText('Vacina V10 vencida E2E 360')).toBeVisible({ timeout: 15000 });

    await page.goto(`${SPA_URL}/reception`);
    await page.waitForLoadState('networkidle');

    const receptionSearch = page.getByRole('search');
    await receptionSearch.getByPlaceholder(/buscar tutor ou paciente/i).fill(patientName);
    await receptionSearch.getByRole('button', { name: 'Buscar', exact: true }).click();

    const quickActions = page.getByLabel('Acoes rapidas contextuais da recepcao');
    await expect(quickActions).toBeVisible({ timeout: 15000 });
    await expect(quickActions).toContainText('Prioridade 360');
    await expect(quickActions).toContainText('Preventivo vencido');
    await expect(quickActions).toContainText(
      '1 preventivo(s) vencido(s). Abrir cockpit 360 antes de seguir com agenda, esteira ou comanda.'
    );

    await quickActions.getByRole('link', { name: /Preventivo vencido/ }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`), { timeout: 15000 });
    await expect(page.getByLabel('Cockpit 360 do paciente')).toBeVisible({ timeout: 15000 });
  });

  test('prioriza paciente com pendencia financeira na Busca Mestre e na recepcao', async ({
    page,
    apiCall,
    cleanup
  }) => {
    const suffix = uniqueSuffix();
    const ownerName = `Tutor Financeiro 360 ${suffix}`;
    const patientName = `Paciente Financeiro 360 ${suffix}`;

    const owner = await apiCall.post('/owners', {
      fullName: ownerName,
      documentId: `FIN360-${suffix}`,
      contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
      financialResponsible: true,
      status: 'active'
    });
    cleanup.track({ type: 'owner', id: owner.id });

    const patient = await apiCall.post('/patients', {
      name: patientName,
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
      reason: 'Pendencia financeira E2E 360'
    });
    cleanup.track({ type: 'encounter', id: encounter.id });

    await apiCall.post('/billing/estimate', {
      encounterId: encounter.id,
      administrativeNotes: 'Estimativa financeira E2E 360'
    });
    await apiCall.post('/billing/items', {
      encounterId: encounter.id,
      itemType: 'service',
      description: 'Consulta financeira 360',
      quantity: 1,
      unitPriceAmount: 180
    });
    await apiCall.patch(`/billing/${encounter.id}/status`, {
      status: 'open',
      administrativeNotes: 'Pendencia financeira aberta E2E 360'
    });

    await loginViaToken(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto(`${SPA_URL}/master-search`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Busca Mestre' }).first()).toBeVisible({
      timeout: 15000
    });

    await page.getByPlaceholder(/buscar por tutor, paciente/i).fill(patientName);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();

    const patientRow = page.locator('tbody tr').filter({ hasText: patientName }).first();
    await expect(patientRow).toBeVisible({ timeout: 15000 });
    await expect(patientRow).toContainText('Pendência financeira');
    await expect(page.getByLabel('Resumo Prioridade 360')).toContainText('Pendência financeira');

    await patientRow.getByRole('link', { name: 'Abrir cockpit' }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`), { timeout: 15000 });
    await expect(page.getByLabel('Cockpit 360 do paciente')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('R$ 180,00 em aberto')).toBeVisible({ timeout: 15000 });

    await page.goto(`${SPA_URL}/reception`);
    await page.waitForLoadState('networkidle');

    const receptionSearch = page.getByRole('search');
    await receptionSearch.getByPlaceholder(/buscar tutor ou paciente/i).fill(patientName);
    await receptionSearch.getByRole('button', { name: 'Buscar', exact: true }).click();

    const quickActions = page.getByLabel('Acoes rapidas contextuais da recepcao');
    await expect(quickActions).toBeVisible({ timeout: 15000 });
    await expect(quickActions).toContainText('Prioridade 360');
    await expect(quickActions).toContainText('Pendência financeira');
    await expect(quickActions).toContainText(
      'R$ 180,00 em aberto. Abrir cockpit 360 antes de seguir com agenda, esteira ou comanda.'
    );

    await quickActions.getByRole('link', { name: /Pendência financeira/ }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`), { timeout: 15000 });
    await expect(page.getByLabel('Cockpit 360 do paciente')).toBeVisible({ timeout: 15000 });
  });
});

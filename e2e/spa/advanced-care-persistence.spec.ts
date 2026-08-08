import { expect, loginViaToken, test } from './fixtures/spa-fixture';

const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3112';

test('internacao e cirurgia persistidas aparecem nos fluxos operacionais', async ({
  page,
  apiCall,
  cleanup
}) => {
  const api = apiCall;

  // The E2E server intentionally disables incompatible legacy repositories.
  // Build the clinical chain through public routes instead of depending on
  // hidden in-memory fixtures or on a pre-migrated external database.
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const owner = await api.post('/owners', {
    fullName: `Tutor Advanced Care ${suffix}`,
    documentId: `ADV-${suffix}`,
    contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
    financialResponsible: true,
    status: 'active'
  });
  cleanup.track({ type: 'owner', id: owner.id });
  const patient = await api.post('/patients', {
    name: `Paciente Advanced Care ${suffix}`,
    species: 'canine',
    sex: 'female',
    primaryOwnerId: owner.id,
    status: 'active'
  });
  cleanup.track({ type: 'patient', id: patient.id });
  const encounter = await api.post('/encounters', {
    patientId: patient.id,
    ownerId: owner.id,
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Internação e cirurgia E2E'
  });
  cleanup.track({ type: 'encounter', id: encounter.id });
  const stay = await api.post('/inpatient', {
    encounterId: encounter.id,
    patientId: patient.id,
    unit: 'UTI',
    ward: 'Ala A',
    bed: `E2E-${suffix}`
  });
  cleanup.track({ type: 'inpatient', id: stay.id });
  await api.post(`/inpatient/${stay.id}/progress`, {
    note: 'Paciente estável, hidratado e responsivo.'
  });
  await api.post(`/inpatient/${stay.id}/occurrences`, {
    type: 'clinical',
    severity: 'attention',
    title: 'Acesso venoso',
    description: 'Acesso venoso periférico mantido.'
  });
  await api.post(`/inpatient/${stay.id}/daily-charges`, {
    description: 'Diária UTI',
    chargeDate: new Date().toISOString().slice(0, 10),
    quantity: 1,
    unitAmount: 180
  });
  await api.post('/surgeries', {
    encounterId: encounter.id,
    patientId: patient.id,
    procedureName: 'Ovariohisterectomia demonstrativa',
    preparationNotes: 'Jejum e consentimento confirmados.'
  });

  const [progress, occurrences, charges, surgeries] = await Promise.all([
    api.get(`/inpatient/${stay.id}/progress`),
    api.get(`/inpatient/${stay.id}/occurrences`),
    api.get(`/inpatient/${stay.id}/daily-charges`),
    api.get(`/surgeries?encounterId=${stay.encounterId}`)
  ]);
  expect(progress.items.length).toBeGreaterThan(0);
  expect(occurrences.items.length).toBeGreaterThan(0);
  expect(charges.items.length).toBeGreaterThan(0);
  expect(surgeries.items.length).toBeGreaterThan(0);

  await loginViaToken(page);
  await page.goto(`${SPA_URL}/inpatient/${stay.id}`);
  await expect(page.getByRole('heading', { name: /Detalhes da Internação/i })).toBeVisible();
  await expect(page.getByText(/Paciente estável, hidratado/i)).toBeVisible();
  await expect(page.getByText('Acesso venoso', { exact: true })).toBeVisible();
  await expect(page.getByText('Diária UTI', { exact: true })).toBeVisible();

  await page.goto(`${SPA_URL}/surgery`);
  await page.getByLabel('Atendimento').selectOption(stay.encounterId);
  await expect(page.getByText('Ovariohisterectomia demonstrativa')).toBeVisible();
  await expect(page.getByText('Solicitada')).toBeVisible();

  await page.goto(`${SPA_URL}/medical-records/${stay.encounterId}`);
  await expect(page.getByTestId('clinical-step-anamnesis')).toBeVisible();
  await page.getByTestId('clinical-step-assessment').click();
  await expect(page.locator('[data-clinical-panel="assessment"]')).toBeVisible();
});

import { expect, test, type Page, type Request, type TestInfo } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3111';
const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3112';
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'seed_admin';
const PERSONA_PASSWORD = 'CvgPersona!2026';

type JsonRecord = Record<string, any>;

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function dateTimeLocal(daysFromNow: number, hour: number): string {
  const value = new Date();
  value.setDate(value.getDate() + daysFromNow);
  value.setHours(hour, 0, 0, 0);
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

async function apiLogin(username: string, password: string): Promise<JsonRecord> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    throw new Error(`Login API de ${username} falhou: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function apiRequest(
  token: string,
  method: string,
  path: string,
  body?: unknown,
  expectedStatus?: number,
  idempotencyKey?: string
): Promise<JsonRecord> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(['POST', 'PATCH', 'PUT'].includes(method)
        ? {
            'Idempotency-Key':
              idempotencyKey ?? `pw-${Date.now()}-${Math.random().toString(36).slice(2)}`
          }
        : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (expectedStatus !== undefined) {
    expect(response.status, `${method} ${path}`).toBe(expectedStatus);
  } else if (!response.ok) {
    throw new Error(`${method} ${path} falhou: ${response.status} ${await response.text()}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function replayBrowserMutation(token: string, request: Request): Promise<JsonRecord> {
  const url = new URL(request.url());
  const idempotencyKey = await request.headerValue('idempotency-key');
  expect(
    idempotencyKey,
    `${request.method()} ${url.pathname} deve declarar Idempotency-Key`
  ).toBeTruthy();
  const apiPath = `${url.pathname.replace(/^\/api/, '')}${url.search}`;
  return apiRequest(
    token,
    request.method(),
    apiPath,
    request.postDataJSON(),
    undefined,
    idempotencyKey ?? undefined
  );
}

function waitForMutation(page: Page, pathname: string | RegExp): Promise<Request> {
  return page.waitForRequest((request) => {
    if (request.method() !== 'POST') return false;
    const candidate = new URL(request.url()).pathname.replace(/^\/api/, '');
    return typeof pathname === 'string' ? candidate === pathname : pathname.test(candidate);
  });
}

async function browserLogin(page: Page, username: string, password: string): Promise<void> {
  await page.goto(`${SPA_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(username);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

async function createOwnerViaUi(page: Page, name: string, run: string): Promise<string> {
  await page.goto(`${SPA_URL}/owners/new`, { waitUntil: 'networkidle' });
  await page.locator('#fullName').fill(name);
  await page.locator('#documentId').fill(`DOC-${run}`);
  await page.locator('#phone1').fill('11987654321');
  await page.getByRole('button', { name: /cadastrar cliente/i }).click();
  await expect(page.getByText('Cliente cadastrado com sucesso')).toBeVisible();
  await page.waitForURL(/\/owners\/(?!new$)[^/]+$/);
  return page.url().split('/').pop() || '';
}

async function createPatientViaUi(page: Page, name: string, ownerName: string): Promise<string> {
  await page.goto(`${SPA_URL}/patients/new`, { waitUntil: 'networkidle' });
  await page.locator('#name').fill(name);
  await page.locator('#species').selectOption('canine');
  await page.locator('#sex').selectOption('female');
  const ownerSearch = page.getByPlaceholder(/buscar.*(tutor|cliente)|selecione.*(tutor|cliente)/i);
  await ownerSearch.fill(ownerName);
  await page.getByRole('option', { name: ownerName }).click();
  await page.getByRole('button', { name: 'Salvar Animal' }).click();
  await expect(page.getByText('Animal cadastrado com sucesso')).toBeVisible();
  await page.waitForURL(/\/patients\/(?!new$)[^/]+$/);
  return page.url().split('/').pop() || '';
}

async function createAppointmentViaUi(
  page: Page,
  input: {
    ownerId: string;
    patientId: string;
    scheduledAt: string;
    specialty: string;
    resource: string;
    reason: string;
  }
): Promise<string> {
  const query = new URLSearchParams({
    ownerId: input.ownerId,
    patientId: input.patientId,
    scheduledAt: input.scheduledAt,
    specialty: input.specialty,
    resourceLabel: input.resource,
    reason: input.reason,
    visitType: 'scheduled'
  });
  await page.goto(`${SPA_URL}/appointments/new?${query}`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /novo agendamento/i })).toBeVisible();
  await page.locator('#scheduledAt').fill(input.scheduledAt);
  await page.locator('#reason').fill(input.reason);
  await page.getByRole('button', { name: /salvar agendamento/i }).click();
  await page.waitForURL(/\/appointments\/(?!new$)[^/]+$/);
  return page.url().split('/').pop() || '';
}

async function createClinicalContext(token: string, run: string, reason: string) {
  const owner = await apiRequest(token, 'POST', '/owners', {
    fullName: `Tutor ${run}`,
    documentId: `CTX-${run}`,
    contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
    financialResponsible: true,
    status: 'active'
  });
  const patient = await apiRequest(token, 'POST', '/patients', {
    name: `Animal ${run}`,
    species: 'canine',
    sex: 'female',
    primaryOwnerId: owner.id,
    status: 'active'
  });
  const encounter = await apiRequest(token, 'POST', '/encounters', {
    patientId: patient.id,
    ownerId: owner.id,
    visitType: 'walk_in',
    origin: 'reception',
    reason
  });
  return { owner, patient, encounter };
}

async function createPersonaUser(
  adminToken: string,
  run: string,
  label: string,
  roleCode = 'veterinarian'
) {
  const username = `${label}_${run}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  const user = await apiRequest(adminToken, 'POST', '/users', {
    displayName: `${label} ${run}`,
    email: `${username}@cvg.test`,
    username,
    roleCode,
    password: PERSONA_PASSWORD,
    status: 'active'
  });
  const profession = await apiRequest(adminToken, 'POST', '/professions', {
    code: `${label.slice(0, 4).toUpperCase()}-${run}`,
    name: `${label} veterinário ${run}`,
    description: `Profissão técnica criada para a rotina E2E de ${label}`
  });
  await apiRequest(adminToken, 'POST', '/staff', {
    employeeCode: `${label.slice(0, 4).toUpperCase()}-${run}`,
    fullName: `${label} ${run}`,
    userId: user.id,
    department: 'Diagnóstico',
    jobTitle: label,
    professionId: profession.id
  });
  return { ...user, username };
}

async function attachEvidence(testInfo: TestInfo, name: string, payload: JsonRecord) {
  await testInfo.attach(name, {
    body: JSON.stringify(payload, null, 2),
    contentType: 'application/json'
  });
}

test.describe('Rotinas hospitalares completas por persona', () => {
  test('recepcionista: cadastra tutor e animal, agenda consulta/exame, usa a esteira e fecha a comanda', async ({
    page
  }, testInfo) => {
    const run = suffix();
    const ownerName = `Tutor Recepção ${run}`;
    const patientName = `Paciente Recepção ${run}`;
    const receptionSession = await apiLogin('reception', 'seed_reception');

    await browserLogin(page, 'reception', 'seed_reception');
    const [ownerRequest, ownerId] = await Promise.all([
      waitForMutation(page, '/owners'),
      createOwnerViaUi(page, ownerName, run)
    ]);
    const replayedOwner = await replayBrowserMutation(receptionSession.accessToken, ownerRequest);
    expect(replayedOwner.id).toBe(ownerId);
    const [patientRequest, patientId] = await Promise.all([
      waitForMutation(page, '/patients'),
      createPatientViaUi(page, patientName, ownerName)
    ]);
    const replayedPatient = await replayBrowserMutation(
      receptionSession.accessToken,
      patientRequest
    );
    expect(replayedPatient.id).toBe(patientId);

    const consultationAppointmentId = await createAppointmentViaUi(page, {
      ownerId,
      patientId,
      scheduledAt: dateTimeLocal(1, 9),
      specialty: 'Clínica Médica',
      resource: `Consultório ${run.slice(-3)}`,
      reason: `Consulta clínica ${run}`
    });
    const examAppointmentId = await createAppointmentViaUi(page, {
      ownerId,
      patientId,
      scheduledAt: dateTimeLocal(2, 11),
      specialty: 'Diagnóstico por Imagem',
      resource: `Ultrassom ${run.slice(-3)}`,
      reason: `Ultrassonografia abdominal ${run}`
    });

    await page.goto(`${SPA_URL}/reception`, { waitUntil: 'networkidle' });
    const receptionSearch = page.getByRole('search');
    await receptionSearch.getByPlaceholder(/buscar tutor ou paciente/i).fill(patientName);
    await receptionSearch.getByRole('button', { name: 'Buscar', exact: true }).click();
    await page.getByRole('link', { name: 'Preparar check-in' }).first().click();
    await page.getByRole('button', { name: 'Iniciar check-in' }).click();
    await page
      .getByRole('dialog', { name: 'Check-in Rápido' })
      .getByRole('button', { name: 'Confirmar Check-in' })
      .click();
    const queueRow = page.locator('tbody tr').filter({ hasText: patientName }).first();
    await expect(queueRow).toBeVisible();
    await queueRow.getByRole('button', { name: 'Chamar' }).click();
    await queueRow.getByRole('button', { name: 'Abrir triagem' }).click();
    await page.waitForURL(/\/encounters\/[^/]+$/);
    const encounterId = page.url().split('/').pop() || '';

    const counterSaleKey = `persona-counter-sale-${run}`;
    const counterSalePayload = {
      ownerId,
      patientId,
      encounterId,
      notes: `Comanda da recepção ${run}`
    };
    const sale = await apiRequest(
      receptionSession.accessToken,
      'POST',
      '/counter-sales',
      counterSalePayload,
      undefined,
      counterSaleKey
    );
    const replayedSale = await apiRequest(
      receptionSession.accessToken,
      'POST',
      '/counter-sales',
      counterSalePayload,
      undefined,
      counterSaleKey
    );
    expect(replayedSale.id).toBe(sale.id);
    await apiRequest(receptionSession.accessToken, 'POST', `/counter-sales/${sale.id}/items`, {
      itemType: 'service',
      nameSnapshot: `Consulta clínica ${run}`,
      codeSnapshot: 'CONSULTA',
      unitPrice: 180,
      quantity: 1,
      discountAmount: 0
    });
    await apiRequest(receptionSession.accessToken, 'POST', `/counter-sales/${sale.id}/items`, {
      itemType: 'service',
      nameSnapshot: `Exame ultrassonográfico ${run}`,
      codeSnapshot: 'US-ABD',
      unitPrice: 250,
      quantity: 1,
      discountAmount: 0
    });
    const closedSale = await apiRequest(
      receptionSession.accessToken,
      'POST',
      `/counter-sales/${sale.id}/settle`,
      { payments: [{ method: 'pix', amount: 430, installments: 1, reference: `PIX-${run}` }] }
    );

    await page.goto(`${SPA_URL}/counter-sales`, { waitUntil: 'networkidle' });
    await page.getByLabel('Buscar comanda').fill(sale.number);
    await page.getByRole('button', { name: 'Filtrar' }).click();
    const saleCard = page.locator('.counter-sale-card').filter({ hasText: sale.number }).first();
    await expect(saleCard).toContainText('Fechada');
    await saleCard.getByRole('button', { name: 'Ver comanda' }).click();
    await expect(
      page.locator('.line-item-card').filter({ hasText: `Consulta clínica ${run}` })
    ).toBeVisible();
    await expect(
      page.locator('.line-item-card').filter({ hasText: `Exame ultrassonográfico ${run}` })
    ).toBeVisible();
    await expect(page.getByTestId('counter-sale-receipt')).toBeVisible();

    await attachEvidence(testInfo, 'recepcao-rotina', {
      ownerId,
      patientId,
      consultationAppointmentId,
      examAppointmentId,
      encounterId,
      counterSaleId: sale.id,
      counterSaleStatus: closedSale.status,
      idempotentRetries: ['owner', 'patient', 'counter-sale']
    });
  });

  test('veterinário clínico: consulta tutor/histórico, registra anamnese, prescreve, imprime e orça', async ({
    page
  }, testInfo) => {
    const run = suffix();
    const adminSession = await apiLogin(ADMIN_USERNAME, ADMIN_PASSWORD);
    const context = await createClinicalContext(
      adminSession.accessToken,
      `Clínica ${run}`,
      'Dor abdominal e apatia'
    );
    const users = await apiRequest(adminSession.accessToken, 'GET', '/users');
    const veterinarian = users.items.find((item: JsonRecord) => item.username === 'vet');
    expect(veterinarian).toBeTruthy();
    for (const permissionCode of ['quote.read', 'quote.write']) {
      const grantPayload = {
        subjectType: 'user',
        subjectId: veterinarian.id,
        permissionCode,
        effect: 'allow'
      };
      const grantKey = `persona-grant-${permissionCode}-${run}`;
      const grant = await apiRequest(
        adminSession.accessToken,
        'POST',
        '/access-control/grants',
        grantPayload,
        undefined,
        grantKey
      );
      const replayedGrant = await apiRequest(
        adminSession.accessToken,
        'POST',
        '/access-control/grants',
        grantPayload,
        undefined,
        grantKey
      );
      expect(replayedGrant).toEqual(grant);
    }

    await page.addInitScript(() => {
      (window as any).__personaPrintCount = 0;
      window.print = () => {
        (window as any).__personaPrintCount += 1;
      };
    });
    await browserLogin(page, 'vet', 'seed_vet');

    await page.goto(`${SPA_URL}/medical-records/${context.encounter.id}`, {
      waitUntil: 'networkidle'
    });
    await expect(page.getByRole('heading', { name: 'Prontuário clínico' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tutor' })).toBeVisible();
    await page.getByRole('button', { name: 'Adicionar anamnese', exact: true }).click();
    await page.locator('#entryTitle').fill(`Anamnese clínica ${run}`);
    await page
      .locator('#entryContent')
      .fill(
        'Tutor relata apatia há 24 horas, hiporexia e um episódio de vômito. Sem medicação prévia.'
      );
    await page.getByRole('button', { name: /^Salvar$/ }).click();
    await expect(page.getByRole('heading', { name: `Anamnese clínica ${run}` })).toBeVisible();

    await page.goto(
      `${SPA_URL}/prescriptions?encounterId=${context.encounter.id}&patientId=${context.patient.id}&ownerId=${context.owner.id}`,
      { waitUntil: 'networkidle' }
    );
    await page.getByLabel('Medicamento').fill(`Dipirona ${run}`);
    await page.getByLabel('Posologia').fill('25 mg/kg');
    await page.getByLabel('Via').fill('Oral');
    await page.getByLabel('Frequência').fill('A cada 8 horas por 3 dias');
    await page
      .getByLabel('Observações')
      .fill('Administrar após alimentação e retornar se houver vômito.');
    const prescriptionRequestPromise = waitForMutation(page, '/prescriptions');
    await page.getByRole('button', { name: 'Salvar prescrição' }).click();
    const prescriptionRequest = await prescriptionRequestPromise;
    await expect(page.getByText('Prescrição registrada com sucesso.')).toBeVisible();
    const replayedPrescription = await replayBrowserMutation(
      (await apiLogin('vet', 'seed_vet')).accessToken,
      prescriptionRequest
    );
    expect(replayedPrescription.medicationName).toBe(`Dipirona ${run}`);

    await page.goto(`${SPA_URL}/patients/${context.patient.id}`, { waitUntil: 'networkidle' });
    await expect(page.getByText(context.owner.fullName).first()).toBeVisible();
    await expect(page.getByText(`Anamnese clínica ${run}`).first()).toBeVisible();
    await page.getByRole('button', { name: 'Imprimir prontuário' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__personaPrintCount)).toBe(1);
    await page.locator('#patient-card-prescriptions-trigger').click();
    const prescription = page
      .locator('.record-list__item')
      .filter({ hasText: `Dipirona ${run}` })
      .first();
    await expect(prescription).toBeVisible();
    await prescription.getByRole('button', { name: 'Imprimir' }).click();
    await expect(prescription.getByRole('button', { name: 'Ver Receita' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).__personaPrintCount)).toBe(2);

    await page.goto(
      `${SPA_URL}/quotes?ownerId=${context.owner.id}&patientId=${context.patient.id}&encounterId=${context.encounter.id}`,
      { waitUntil: 'networkidle' }
    );
    await page.getByPlaceholder('ID do tutor').fill(context.owner.id);
    await page.getByLabel('Observações', { exact: true }).first().fill(`Plano terapêutico ${run}`);
    const quoteRequestPromise = waitForMutation(page, '/quotes');
    await page
      .locator('form')
      .filter({ has: page.getByPlaceholder('ID do tutor') })
      .getByRole('button', { name: 'Incluir', exact: true })
      .click();
    const quoteRequest = await quoteRequestPromise;
    await expect(page.getByText(/Orçamento .* criado com sucesso/)).toBeVisible();
    const replayedQuote = await replayBrowserMutation(
      (await apiLogin('vet', 'seed_vet')).accessToken,
      quoteRequest
    );
    expect(replayedQuote.notes).toBe(`Plano terapêutico ${run}`);
    await page.getByLabel('Descrição do Serviço').fill(`Retorno e reavaliação ${run}`);
    await page.getByLabel('Valor unitário').fill('120');
    await page.getByLabel('Quantidade').fill('1');
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await expect(page.getByText(`Retorno e reavaliação ${run}`)).toBeVisible();
    await page.getByRole('button', { name: 'Pré-visualizar' }).click();
    await expect(page.getByText('Pré-visualização de impressão carregada.')).toBeVisible();
    await page.getByRole('button', { name: 'Aprovar' }).click();
    await expect(page.getByText('Orçamento aprovado com sucesso.')).toBeVisible();

    await attachEvidence(testInfo, 'veterinario-clinico-rotina', {
      ownerId: context.owner.id,
      patientId: context.patient.id,
      encounterId: context.encounter.id,
      anamnesis: `Anamnese clínica ${run}`,
      prescription: `Dipirona ${run}`,
      printsTriggered: 2,
      quoteItem: `Retorno e reavaliação ${run}`,
      idempotentRetries: ['grant', 'prescription', 'quote']
    });
  });

  test('patologista: cadastra equipamento, enzimas/faixas e libera exame na esteira laboratorial', async ({
    page
  }, testInfo) => {
    const run = suffix();
    const adminSession = await apiLogin(ADMIN_USERNAME, ADMIN_PASSWORD);
    const pathologist = await createPersonaUser(adminSession.accessToken, run, 'patologista');
    const context = await createClinicalContext(
      adminSession.accessToken,
      `Patologia ${run}`,
      'Investigação de hepatopatia'
    );
    const pathologistSession = await apiLogin(pathologist.username, PERSONA_PASSWORD);
    await browserLogin(page, pathologist.username, PERSONA_PASSWORD);

    const equipmentName = `Analisador Bioquímico ${run}`;
    await page.goto(`${SPA_URL}/laboratory/equipment/new`, { waitUntil: 'networkidle' });
    await page.getByLabel('Descrição').fill(equipmentName);
    await page.getByLabel('Tipo').fill('Bioquímica automatizada');
    await page.getByLabel('Nº Série').fill(`BIO-${run}`);
    await page.getByLabel('Última Calibração').fill(new Date().toISOString().slice(0, 10));
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('Equipamento salvo com sucesso.')).toBeVisible();

    const enzymeRanges = [
      { parameter: `ALT-${run}`, min: '10', max: '100' },
      { parameter: `AST-${run}`, min: '15', max: '66' },
      { parameter: `GGT-${run}`, min: '1', max: '10' }
    ];
    for (const enzyme of enzymeRanges) {
      await page.goto(`${SPA_URL}/laboratory/biochemistry-reference-values/new`, {
        waitUntil: 'networkidle'
      });
      await page.getByLabel('Parâmetro').fill(enzyme.parameter);
      await page.getByLabel('Unidade').fill('U/L');
      await page.getByLabel('Valor Mínimo').fill(enzyme.min);
      await page.getByLabel('Valor Máximo').fill(enzyme.max);
      await page.getByRole('button', { name: 'Salvar', exact: true }).click();
      await expect(page.getByText('Valor de referência salvo com sucesso.')).toBeVisible();
    }

    const reportTypeName = `Perfil hepático ${run}`;
    const reportCode = `HEP${run.replace(/\D/g, '').slice(-5)}`;
    await page.goto(`${SPA_URL}/laboratory/report-types/new`, { waitUntil: 'networkidle' });
    await page.getByLabel('Descrição').fill(reportTypeName);
    await page.getByLabel('Código').fill(reportCode);
    await page.getByLabel('Categoria').fill('Patologia clínica');
    await page
      .getByLabel('Modelo')
      .fill('ALT, AST e GGT com interpretação, valores de referência e assinatura técnica.');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('Tipo de laudo salvo com sucesso.')).toBeVisible();

    await page.goto(
      `${SPA_URL}/diagnostics?encounterId=${context.encounter.id}&patientId=${context.patient.id}&ownerId=${context.owner.id}`,
      { waitUntil: 'networkidle' }
    );
    await page.getByLabel('Atendimento', { exact: true }).selectOption(context.encounter.id);
    await page
      .getByLabel('Tipo de exame')
      .selectOption({ label: `${reportCode.toUpperCase()} • ${reportTypeName}` });
    await page.getByLabel('Justificativa').fill(`Dosagem enzimática ${run}`);
    const orderRequestPromise = waitForMutation(page, '/laboratory/orders');
    await page.getByRole('button', { name: 'Registrar pedido' }).click();
    const orderRequest = await orderRequestPromise;
    await expect(
      page.getByText('Pedido laboratorial registrado e vinculado ao prontuário.')
    ).toBeVisible();
    const replayedOrder = await replayBrowserMutation(pathologistSession.accessToken, orderRequest);
    expect(replayedOrder.patientId).toBe(context.patient.id);

    await page.goto(`${SPA_URL}/laboratory/orders`, { waitUntil: 'networkidle' });
    await page.getByRole('searchbox', { name: 'Animal' }).fill(context.patient.name);
    await page.getByRole('button', { name: 'Pesquisar' }).click();
    const row = page.locator('tbody tr').filter({ hasText: context.patient.name }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Coletar' }).click();
    await expect(page.getByText('Coleta registrada com sucesso.')).toBeVisible();
    await row.getByRole('button', { name: 'Iniciar análise' }).click();
    await expect(page.getByText('Análise iniciada com sucesso.')).toBeVisible();
    await row.getByRole('button', { name: 'Reportar resultado' }).click();
    await page
      .locator('#result-summary')
      .fill(`ALT elevada; AST e GGT dentro da faixa. Laudo ${run}.`);
    await page
      .getByRole('dialog', { name: 'Reportar resultado' })
      .getByRole('button', { name: 'Reportar resultado' })
      .click();
    await expect(page.getByText('Resultado reportado com sucesso.')).toBeVisible();

    await attachEvidence(testInfo, 'patologista-rotina', {
      userId: pathologist.id,
      equipmentName,
      enzymes: enzymeRanges,
      reportTypeName,
      encounterId: context.encounter.id,
      patientId: context.patient.id,
      idempotentRetries: ['exam-order']
    });
  });

  test('ultrassonografista: cria modelo, lança laudo com anexo e abre a impressão', async ({
    page
  }, testInfo) => {
    const run = suffix();
    const adminSession = await apiLogin(ADMIN_USERNAME, ADMIN_PASSWORD);
    const ultrasonographer = await createPersonaUser(
      adminSession.accessToken,
      run,
      'ultrassonografista'
    );
    const context = await createClinicalContext(
      adminSession.accessToken,
      `Ultrassom ${run}`,
      'Avaliação abdominal por imagem'
    );
    const ultrasonographerSession = await apiLogin(ultrasonographer.username, PERSONA_PASSWORD);
    await browserLogin(page, ultrasonographer.username, PERSONA_PASSWORD);

    const reportTypeName = `Ultrassonografia abdominal ${run}`;
    const reportCode = `US${run.replace(/\D/g, '').slice(-6)}`;
    await page.goto(`${SPA_URL}/laboratory/report-types/new`, { waitUntil: 'networkidle' });
    await page.getByLabel('Descrição').fill(reportTypeName);
    await page.getByLabel('Código').fill(reportCode);
    await page.getByLabel('Categoria').fill('Diagnóstico por imagem');
    await page
      .getByLabel('Modelo')
      .fill('Fígado, vesícula, baço, rins, trato gastrointestinal e conclusão ultrassonográfica.');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('Tipo de laudo salvo com sucesso.')).toBeVisible();

    await page.goto(
      `${SPA_URL}/diagnostics?encounterId=${context.encounter.id}&patientId=${context.patient.id}&ownerId=${context.owner.id}`,
      { waitUntil: 'networkidle' }
    );
    await page.getByLabel('Atendimento', { exact: true }).selectOption(context.encounter.id);
    await page
      .getByLabel('Tipo de exame')
      .selectOption({ label: `${reportCode.toUpperCase()} • ${reportTypeName}` });
    await page.getByLabel('Justificativa').fill(`Dor abdominal persistente ${run}`);
    await page.getByRole('button', { name: 'Registrar pedido' }).click();
    await expect(
      page.getByText('Pedido laboratorial registrado e vinculado ao prontuário.')
    ).toBeVisible();

    await page
      .getByLabel('Resumo do laudo')
      .fill(`Fígado com dimensões preservadas; sem líquido livre. Conclusão ${run}.`);
    await page.getByLabel('Arquivo').fill(`laudo-ultrassom-${run}.pdf`);
    await page.getByLabel('MIME type').fill('application/pdf');
    await page.getByLabel('Checksum').fill(`sha256-${run}`);
    await page.getByLabel('Categoria').selectOption('image');
    const reportRequestPromise = waitForMutation(page, /^\/laboratory\/orders\/[^/]+\/result$/);
    await page.getByRole('button', { name: 'Enviar resultado' }).click();
    const reportRequest = await reportRequestPromise;
    await expect(
      page.getByText('Resultado anexado ao prontuário e liberado no laboratório.')
    ).toBeVisible();
    const replayedReport = await replayBrowserMutation(
      ultrasonographerSession.accessToken,
      reportRequest
    );
    expect(replayedReport.patientId).toBe(context.patient.id);

    await page.goto(`${SPA_URL}/laboratory/results?patientId=${context.patient.id}`, {
      waitUntil: 'networkidle'
    });
    await page.getByRole('searchbox', { name: 'Animal' }).fill(context.patient.name);
    await page.getByRole('button', { name: 'Pesquisar' }).click();
    const reportRow = page.locator('tbody tr').filter({ hasText: context.patient.name }).first();
    await expect(reportRow).toBeVisible();
    await reportRow.getByRole('button', { name: 'Laudo' }).click();
    await expect(page.getByRole('dialog', { name: 'Laudo imprimível' })).toBeVisible();
    await expect(page.getByTitle('Pré-visualização do laudo')).toBeVisible();

    await attachEvidence(testInfo, 'ultrassonografista-rotina', {
      userId: ultrasonographer.id,
      reportTypeName,
      reportCode,
      encounterId: context.encounter.id,
      patientId: context.patient.id,
      printableReportOpened: true,
      idempotentRetries: ['laboratory-report']
    });
  });

  test('administrador: cadastra veterinários, setor, perfil/grupo parceiro e permissões customizadas', async ({
    page
  }, testInfo) => {
    const run = suffix();
    const adminSession = await apiLogin(ADMIN_USERNAME, ADMIN_PASSWORD);
    await browserLogin(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    const createdUsers: JsonRecord[] = [];
    for (const profile of [
      {
        key: 'medico',
        name: `Médico Veterinário ${run}`,
        department: 'clinica_geral',
        role: 'veterinarian'
      },
      {
        key: 'ultrassom',
        name: `Ultrassonografista ${run}`,
        department: 'diagnostico_imagem',
        role: 'veterinarian'
      },
      {
        key: 'parceiro',
        name: `Parceiro Diagnóstico ${run}`,
        department: 'diagnostico_imagem',
        role: 'inventory'
      }
    ]) {
      const username = `admin_${profile.key}_${run}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
      await page.goto(`${SPA_URL}/users/new`, { waitUntil: 'networkidle' });
      await page.getByLabel('Nome Completo').fill(profile.name);
      await page.getByLabel('E-mail').fill(`${username}@cvg.test`);
      await page.getByLabel('Usuário (login)').fill(username);
      await page.getByLabel('Setor').selectOption(profile.department);
      await page.getByLabel('Perfil (Role)').selectOption(profile.role);
      await page.getByLabel('Cargo/Função').fill(profile.name);
      await page.locator('#password').fill(PERSONA_PASSWORD);
      await page.locator('#passwordConfirm').fill(PERSONA_PASSWORD);
      await page.getByRole('button', { name: 'Salvar Usuário' }).click();
      await expect(page.getByText('Usuário criado com sucesso!')).toBeVisible();
      await page.waitForURL(/\/users\/(?!new$)[^/]+$/);
      createdUsers.push({ id: page.url().split('/').pop(), username, ...profile });
    }

    const teamName = `Parceiros de Diagnóstico ${run}`;
    const sectorName = `Diagnóstico Terceirizado ${run}`;
    await page.goto(`${SPA_URL}/access-control`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Grupos', exact: true }).click();
    await page.getByLabel('Código').fill(`parceiros_${run}`.replace(/[^a-zA-Z0-9_]/g, '_'));
    await page.getByLabel('Nome').fill(teamName);
    await page
      .getByLabel('Descrição')
      .fill('Perfil customizado de parceiros externos com leitura diagnóstica.');
    await page.getByRole('button', { name: 'Criar grupo' }).click();
    await expect(page.getByText('Equipe criada com sucesso')).toBeVisible();

    await page.getByRole('button', { name: 'Setores', exact: true }).click();
    await page.getByLabel('Código').fill(`diag_terceiro_${run}`.replace(/[^a-zA-Z0-9_]/g, '_'));
    await page.getByLabel('Nome').fill(sectorName);
    await page.getByLabel('Descrição').fill('Setor externo controlado pelo hospital.');
    await page.getByRole('button', { name: 'Criar setor' }).click();
    await expect(page.getByText('Setor criado com sucesso')).toBeVisible();

    const catalog = await apiRequest(adminSession.accessToken, 'GET', '/access-control');
    const team = catalog.teams.find((item: JsonRecord) => item.name === teamName);
    const sector = catalog.sectors.find((item: JsonRecord) => item.name === sectorName);
    const partner = createdUsers.find((item) => item.key === 'parceiro');
    expect(team).toBeTruthy();
    expect(sector).toBeTruthy();

    await page.getByRole('button', { name: 'Matriz', exact: true }).click();
    await page.getByLabel('Tipo').selectOption('team');
    await page.getByLabel('Alvo').selectOption(team.id);
    await page.getByPlaceholder('Filtrar permissões da matriz').fill('diagnostics.read');
    const permissionRow = page
      .locator('tbody tr')
      .filter({ hasText: 'diagnostics.read' })
      .filter({ has: page.locator('select') })
      .first();
    await permissionRow.locator('select').selectOption('allow');
    await expect(page.getByText('Permissão atualizada com sucesso')).toBeVisible();

    await page.getByRole('button', { name: 'Usuários', exact: true }).click();
    await page.getByLabel('Usuário').selectOption(partner.id);
    await page.getByLabel(teamName, { exact: true }).check();
    await page.getByLabel(sectorName, { exact: true }).check();
    await page.getByRole('button', { name: 'Salvar vínculos' }).click();
    await expect(page.getByText('Vínculos do usuário atualizados')).toBeVisible();

    const effective = await apiRequest(
      adminSession.accessToken,
      'GET',
      `/access-control/users/${partner.id}/effective`
    );
    const diagnosticsRead = effective.effectivePermissions.find(
      (item: JsonRecord) => item.permissionCode === 'diagnostics.read'
    );
    const diagnosticsManage = effective.effectivePermissions.find(
      (item: JsonRecord) => item.permissionCode === 'diagnostics.manage'
    );
    expect(diagnosticsRead.effective).toBe(true);
    expect(diagnosticsManage.effective).toBe(false);
    const partnerSession = await apiLogin(partner.username, PERSONA_PASSWORD);
    await apiRequest(partnerSession.accessToken, 'GET', '/laboratory/equipment');
    await apiRequest(
      partnerSession.accessToken,
      'POST',
      '/laboratory/equipment',
      {
        name: `Máquina proibida ${run}`,
        type: 'Teste',
        serialNumber: `DENY-${run}`,
        status: 'active',
        lastCalibrationAt: new Date().toISOString()
      },
      403
    );

    await attachEvidence(testInfo, 'administrador-governanca', {
      createdUsers,
      teamId: team.id,
      teamName,
      sectorId: sector.id,
      sectorName,
      partnerEffective: {
        diagnosticsRead: diagnosticsRead.effective,
        diagnosticsManage: diagnosticsManage.effective
      }
    });
  });
});

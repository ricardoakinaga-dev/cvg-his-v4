import { test, expect } from '../fixtures/cvg-his.fixture';

/**
 * E2E Test: Fluxo de Exames
 * Criar paciente → Criar encounter → Solicitar exame → Criar resultado → Verificar no prontuário
 */

test.describe.serial('Fluxo: Exame → Resultado → Prontuário', () => {
  
  let patientId: string;
  let ownerId: string;
  let encounterId: string;
  let examOrderId: string;

  test.beforeAll(async ({ apiContext, testUser }) => {
    // Create owner and patient for exam tests
    const ownerRes = await apiContext.post('/owners', {
      data: {
        fullName: 'Ana Costa E2E Exames',
        documentId: `E2E-EXAM-${Date.now()}`,
        contacts: [
          { label: 'Celular', value: '11998877665', type: 'phone', primary: true }
        ],
        financialResponsible: true
      }
    });
    expect(ownerRes.ok()).toBeTruthy();
    const owner = await ownerRes.json();
    ownerId = owner.id;

    const patientRes = await apiContext.post('/patients', {
      data: {
        primaryOwnerId: ownerId,
        name: 'Buddy E2E Exames',
        species: 'canine',
        breed: 'Labrador',
        sex: 'male',
        microchip: `E2E-EXAM-${Date.now()}`
      }
    });
    expect(patientRes.ok()).toBeTruthy();
    const patient = await patientRes.json();
    patientId = patient.id;

    // Create encounter
    const encounterRes = await apiContext.post('/encounters', {
      data: {
        patientId,
        ownerId,
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Check-up completo - E2E Exames'
      }
    });
    expect(encounterRes.ok()).toBeTruthy();
    const encounter = await encounterRes.json();
    encounterId = encounter.id;
  });

  test('deve solicitar exame laboratorial', async ({ apiContext }) => {
    // =====================
    // 1. Criar pedido de exame
    // =====================
    const examRes = await apiContext.post('/exam-orders', {
      data: {
        patientId,
        encounterId,
        category: 'laboratory',
        examName: 'Hemograma completo',
        examCode: 'cat_001',
        priority: 'routine',
        notes: 'Exame de rotina - E2E Test'
      }
    });
    expect(examRes.ok()).toBeTruthy();
    const exam = await examRes.json();
    examOrderId = exam.id;
    expect(exam.id).toBeTruthy();
    expect(exam.status).toBe('requested');
    expect(exam.examName).toBe('Hemograma completo');
    console.log(`   ✅ Exame solicitado: ${exam.id} (${exam.examName})`);

    // =====================
    // 2. Verificar na lista de exames
    // =====================
    const listRes = await apiContext.get('/exam-orders', {
      params: { patientId }
    });
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    expect(list.items.some((e: any) => e.id === exam.id)).toBeTruthy();
    console.log(`   ✅ Exame encontrado na lista (${list.items.length} total)`);
  });

  test('deve solicitar exame de imagem com prioridade urgente', async ({ apiContext }) => {
    const examRes = await apiContext.post('/exam-orders', {
      data: {
        patientId,
        encounterId,
        category: 'imaging',
        examName: 'Raio-X Tórax',
        examCode: 'cat_004',
        priority: 'urgent',
        notes: 'Suspeita de pneumonia - E2E Test'
      }
    });
    expect(examRes.ok()).toBeTruthy();
    const exam = await examRes.json();
    expect(exam.examCode).toBe('cat_004');
    expect(exam.status).toBe('requested');
    console.log(`   ✅ Exame de imagem solicitado: ${exam.id} (${exam.examCode})`);
  });

  test('deve criar resultado de exame', async ({ apiContext }) => {
    expect(examOrderId, 'The exam request must exist before creating its result').toBeTruthy();

    // =====================
    // 1. Criar resultado
    // =====================
    const resultRes = await apiContext.patch(`/exam-results/${examOrderId}`, {
      data: {
        status: 'collected',
        findings: 'Hemácias: 5.2 milhões/mm³ (normal)\nLeucócitos: 8.500/mm³ (normal)\nPlaquetas: 250.000/mm³ (normal)',
        interpretation: 'Hemograma dentro dos parâmetros de normalidade',
        notes: 'Resultado E2E Test'
      }
    });

    expect(resultRes.ok(), 'Creating the exam result must succeed').toBeTruthy();

    const result = await resultRes.json();
    expect(result.id).toBeTruthy();
    expect(result.examOrderId).toBe(examOrderId);
    expect(result.status).toBe('draft');
    console.log(`   ✅ Resultado criado: ${result.id} (status: ${result.status})`);

    // =====================
    // 2. Verificar a coleta na fila de pedidos
    // =====================
    const listRes = await apiContext.get('/exam-orders', {
      params: { encounterId }
    });
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    const collectedOrder = list.items.find((item: any) => item.id === result.id);
    expect(collectedOrder).toBeDefined();
    expect(collectedOrder.status).toBe('collected');
    console.log(`   ✅ Coleta registrada na fila de pedidos`);
  });

  test('deve atualizar status do exame', async ({ apiContext }) => {
    expect(examOrderId, 'The exam request must exist before updating its status').toBeTruthy();

    // =====================
    // 1. Liberar o resultado coletado com evidência clínica e assinatura técnica
    // =====================
    const updateRes = await apiContext.patch(`/exam-results/${examOrderId}`, {
      data: {
        status: 'released',
        findings: 'Hemograma liberado com assinatura técnica E2E'
      }
    });
    expect(updateRes.ok()).toBeTruthy();
    const released = await updateRes.json();
    expect(released.status).toBe('released');
    console.log(`   ✅ Status atualizado: released`);

    console.log('\n   🎉 Fluxo completo: Solicitar → Coletar → Processar → Concluir');
  });

  test('deve verificar exames no relatório pendentes', async ({ apiContext }) => {
    // =====================
    // 1. Consultar a fila atual de pedidos
    // =====================
    const pendingRes = await apiContext.get('/exam-orders', {
      params: { encounterId }
    });
    expect(pendingRes.ok()).toBeTruthy();
    const pending = await pendingRes.json();
    expect(pending.items).toBeDefined();
    expect(pending.items.some((item: any) => item.id === examOrderId)).toBeTruthy();
    console.log(`   ✅ ${pending.items.length} pedidos de exame encontrados`);

    // =====================
    // 2. Consultar resumo de exames
    // =====================
    const summaryRes = await apiContext.get('/diagnostics/summary');
    expect(summaryRes.ok()).toBeTruthy();
    const summary = await summaryRes.json();
    expect(summary.pendingOrders).toBeDefined();
    expect(summary.releasedResults).toBeDefined();
    console.log(`   ✅ Resumo de exames consultado (${summary.totalOrders} pedidos)`);
  });
});

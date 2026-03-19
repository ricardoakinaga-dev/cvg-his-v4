import { test, expect } from '../fixtures/cvg-his.fixture';

/**
 * E2E Test: Fluxo Principal
 * Criar tutor → Criar paciente → Criar agendamento → Iniciar atendimento
 */

test.describe('Fluxo: Tutor → Paciente → Agendamento → Atendimento', () => {
  
  test('deve completar o fluxo completo via API', async ({ apiContext, testUser }) => {
    // =====================
    // 1. Criar Tutor (Owner)
    // =====================
    const ownerRes = await apiContext.post('/owners', {
      data: {
        fullName: 'Maria Silva E2E',
        document: `E2E-${Date.now()}`,
        phoneMain: '11987654321',
        email: `maria.e2e.${Date.now()}@test.com`,
        addressCity: 'São Paulo'
      }
    });
    expect(ownerRes.ok()).toBeTruthy();
    const owner = await ownerRes.json();
    expect(owner.id).toBeTruthy();
    expect(owner.fullName).toBe('Maria Silva E2E');
    console.log(`   ✅ Tutor criado: ${owner.id}`);

    // =====================
    // 2. Criar Paciente
    // =====================
    const patientRes = await apiContext.post('/patients', {
      data: {
        ownerId: owner.id,
        name: 'Rex E2E',
        species: 'Canina',
        breed: 'Golden Retriever',
        sex: 'male',
        birthDate: '2020-05-15',
        microchip: `E2E-${Date.now()}`,
        weight: 30.5
      }
    });
    expect(patientRes.ok()).toBeTruthy();
    const patient = await patientRes.json();
    expect(patient.id).toBeTruthy();
    expect(patient.name).toBe('Rex E2E');
    console.log(`   ✅ Paciente criado: ${patient.id}`);

    // =====================
    // 3. Criar Agendamento
    // =====================
    const startAt = new Date();
    startAt.setDate(startAt.getDate() + 1); // Tomorrow
    startAt.setHours(10, 0, 0, 0);
    const endAt = new Date(startAt);
    endAt.setMinutes(endAt.getMinutes() + 30);

    const appointmentRes = await apiContext.post('/appointments', {
      data: {
        patientId: patient.id,
        ownerId: owner.id,
        professionalUserId: testUser.userId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        type: 'consultation',
        notes: 'Consulta de rotina - E2E Test'
      }
    });
    expect(appointmentRes.ok()).toBeTruthy();
    const appointment = await appointmentRes.json();
    expect(appointment.id).toBeTruthy();
    expect(appointment.status).toBe('scheduled');
    console.log(`   ✅ Agendamento criado: ${appointment.id}`);

    // =====================
    // 4. Verificar agendamento na lista
    // =====================
    const listRes = await apiContext.get('/appointments', {
      params: { patientId: patient.id }
    });
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    expect(list.data.length).toBeGreaterThan(0);
    expect(list.data.some((a: any) => a.id === appointment.id)).toBeTruthy();
    console.log(`   ✅ Agendamento encontrado na lista`);

    // =====================
    // 5. Iniciar atendimento a partir do agendamento
    // =====================
    const startEncounterRes = await apiContext.post(`/appointments/${appointment.id}/start-encounter`, {
      data: { reason: 'Consulta de rotina' }
    });
    expect(startEncounterRes.ok()).toBeTruthy();
    const encounterResult = await startEncounterRes.json();
    expect(encounterResult.encounterId).toBeTruthy();
    expect(encounterResult.appointmentId).toBe(appointment.id);
    console.log(`   ✅ Atendimento iniciado: ${encounterResult.encounterId}`);

    // =====================
    // 6. Verificar que o encounter foi criado
    // =====================
    const encounterRes = await apiContext.get(`/encounters/${encounterResult.encounterId}`);
    expect(encounterRes.ok()).toBeTruthy();
    const encounter = await encounterRes.json();
    expect(encounter.patientId).toBe(patient.id);
    expect(encounter.status).toBe('open');
    console.log(`   ✅ Atendimento verificado (status: ${encounter.status})`);

    // =====================
    // 7. Verificar que o agendamento foi atualizado
    // =====================
    const updatedApptRes = await apiContext.get(`/appointments/${appointment.id}`);
    expect(updatedApptRes.ok()).toBeTruthy();
    const updatedAppt = await updatedApptRes.json();
    expect(updatedAppt.status).toBe('in_progress');
    console.log(`   ✅ Status do agendamento atualizado: ${updatedAppt.status}`);

    console.log('\n   🎉 Fluxo completo: Tutor → Paciente → Agendamento → Atendimento');
  });

  test('deve listar tutores criados', async ({ apiContext }) => {
    const res = await apiContext.get('/owners', {
      params: { page: 1, pageSize: 10 }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBeTruthy();
    console.log(`   ✅ ${data.total} tutores encontrados`);
  });

  test('deve listar pacientes criados', async ({ apiContext }) => {
    const res = await apiContext.get('/patients', {
      params: { page: 1, pageSize: 10 }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBeTruthy();
    console.log(`   ✅ ${data.total} pacientes encontrados`);
  });
});

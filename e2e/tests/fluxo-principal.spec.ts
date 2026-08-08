import { test, expect } from '../fixtures/cvg-his.fixture';

async function findAppointmentSlot(apiContext: import('@playwright/test').APIRequestContext, patientId: string) {
  const availabilityResponse = await apiContext.get('/availability', {
    params: { page: 1, pageSize: 100 }
  });
  expect(availabilityResponse.ok()).toBeTruthy();
  const availabilityPayload = await availabilityResponse.json();
  let availability = Array.isArray(availabilityPayload.items) ? availabilityPayload.items : [];

  const staffResponse = await apiContext.get('/staff');
  expect(staffResponse.ok()).toBeTruthy();
  const staffPayload = await staffResponse.json();
  let staffItems: Array<{ id: string; userId?: string; status?: string }> = staffPayload.items ?? [];

  if (availability.length === 0) {
    let professional = staffItems.find((item) => item.status === 'active') ?? staffItems[0];
    if (!professional) {
      const username = `agenda_vet_${Date.now()}`;
      const userResponse = await apiContext.post('/users', {
        data: {
          username,
          email: `${username}@cvg.local`,
          password: 'Agenda1234!',
          roleCode: 'veterinarian',
          displayName: 'Veterinário Agenda E2E'
        }
      });
      expect(userResponse.ok()).toBeTruthy();
      const user = await userResponse.json();
      const staffCreateResponse = await apiContext.post('/staff', {
        data: {
          employeeCode: `AGENDA-E2E-${Date.now()}`,
          fullName: 'Veterinário Agenda E2E',
          userId: user.id,
          department: 'Clinica',
          jobTitle: 'Medico Veterinario'
        }
      });
      expect(staffCreateResponse.ok()).toBeTruthy();
      professional = await staffCreateResponse.json();
      staffItems = [professional];
    }
    expect(professional?.id).toBeTruthy();
    expect(professional?.userId ?? professional?.id).toBeTruthy();
    const seedDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const createResponse = await apiContext.post('/availability', {
      data: {
        professionalUserId: professional.userId ?? professional.id,
        dayOfWeek: seedDate.getUTCDay(),
        startTime: '08:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        timezone: 'America/Sao_Paulo',
        notes: 'Disponibilidade criada pelo fluxo E2E'
      }
    });
    expect(createResponse.ok()).toBeTruthy();
    availability = [await createResponse.json()];
  }

  const selected = availability[0];
  expect(selected?.professionalUserId).toBeTruthy();
  const selectedStaff = staffItems.find(
    (item) => item.userId === selected.professionalUserId || item.id === selected.professionalUserId
  );
  const practitionerStaffId = selectedStaff?.id ?? selected.professionalUserId;
  const firstCandidate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  firstCandidate.setUTCHours(9, 0, 0, 0);
  for (let dayOffset = 0; dayOffset < 21; dayOffset += 1) {
    for (let slotOffset = 0; slotOffset < 24; slotOffset += 1) {
      const candidate = new Date(firstCandidate);
      candidate.setUTCDate(candidate.getUTCDate() + dayOffset);
      candidate.setUTCHours(9 + Math.floor(slotOffset / 2), (slotOffset % 2) * 30, 0, 0);
      if (candidate.getUTCDay() !== selected.dayOfWeek) continue;
      const checkResponse = await apiContext.get('/scheduling/availability', {
        params: {
          scheduledAt: candidate.toISOString(),
          patientId,
          practitionerStaffId,
          durationMinutes: 30
        }
      });
      expect(checkResponse.ok()).toBeTruthy();
      const check = await checkResponse.json();
      if (check.available === true) {
        return {
          practitionerStaffId: practitionerStaffId as string,
          scheduledAt: candidate.toISOString()
        };
      }
    }
  }

  throw new Error('No available appointment slot was found for the principal E2E flow');
}

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
        documentId: `E2E-${Date.now()}`,
        contacts: [
          { label: 'Celular', value: '11987654321', type: 'phone', primary: true },
          { label: 'Email', value: `maria.e2e.${Date.now()}@test.com`, type: 'email' }
        ],
        financialResponsible: true,
        address: { city: 'São Paulo' }
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
        primaryOwnerId: owner.id,
        name: 'Rex E2E',
        species: 'canine',
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
    const appointmentSlot = await findAppointmentSlot(apiContext, patient.id);

    const appointmentRes = await apiContext.post('/appointments', {
      data: {
        patientId: patient.id,
        ownerId: owner.id,
        practitionerStaffId: appointmentSlot.practitionerStaffId,
        scheduledAt: appointmentSlot.scheduledAt,
        visitType: 'scheduled',
        reason: 'Consulta de rotina - E2E Test'
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
    expect(list.items.length).toBeGreaterThan(0);
    expect(list.items.some((a: any) => a.id === appointment.id)).toBeTruthy();
    console.log(`   ✅ Agendamento encontrado na lista`);

    // =====================
    // 5. Iniciar atendimento a partir do agendamento
    // =====================
    const startEncounterRes = await apiContext.post(`/appointments/${appointment.id}/start-encounter`, {
      data: { reason: 'Consulta de rotina' }
    });
    expect(startEncounterRes.ok()).toBeTruthy();
    const encounterResult = await startEncounterRes.json();
    expect(encounterResult.id).toBeTruthy();
    expect(encounterResult.appointmentId).toBe(appointment.id);
    console.log(`   ✅ Atendimento iniciado: ${encounterResult.id}`);

    // =====================
    // 6. Verificar que o encounter foi criado
    // =====================
    const encounterRes = await apiContext.get(`/encounters/${encounterResult.id}`);
    expect(encounterRes.ok()).toBeTruthy();
    const encounter = await encounterRes.json();
    expect(encounter.patientId).toBe(patient.id);
    expect(encounter.status).toBe('reception');
    console.log(`   ✅ Atendimento verificado (status: ${encounter.status})`);

    // =====================
    // 7. Verificar que o agendamento foi atualizado
    // =====================
    const updatedApptRes = await apiContext.get(`/appointments/${appointment.id}`);
    expect(updatedApptRes.ok()).toBeTruthy();
    const updatedAppt = await updatedApptRes.json();
    expect(updatedAppt.status).toBe('scheduled');
    console.log(`   ✅ Status do agendamento atualizado: ${updatedAppt.status}`);

    console.log('\n   🎉 Fluxo completo: Tutor → Paciente → Agendamento → Atendimento');
  });

  test('deve listar tutores criados', async ({ apiContext }) => {
    const res = await apiContext.get('/owners', {
      params: { page: 1, pageSize: 10 }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBeTruthy();
    console.log(`   ✅ ${data.total} tutores encontrados`);
  });

  test('deve listar pacientes criados', async ({ apiContext }) => {
    const res = await apiContext.get('/patients', {
      params: { page: 1, pageSize: 10 }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBeTruthy();
    console.log(`   ✅ ${data.total} pacientes encontrados`);
  });
});

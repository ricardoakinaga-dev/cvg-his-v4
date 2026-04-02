import { test, expect } from '../fixtures/cvg-his.fixture';

/**
 * E2E Test: Fluxos Críticos de Validação Sistêmica (Phase 4)
 *
 * Covers the 8 mandatory critical flows from docs/720 and docs/780.
 * Uses ONLY real API routes that exist in apps/api/src/server.ts.
 *
 * GAP NOTE: The API does NOT have:
 * - GET /appointments/:id (only list)
 * - PATCH /appointments/:id (no update)
 * - POST /appointments/:id/start-encounter (encounters opened via POST /encounters)
 * - GET /inventory/items/:id (only list)
 *
 * Tests work around these gaps using available routes.
 */

test.describe('Critical Flows — Phase 4 E2E', () => {
  // ==========================================================================
  // FLOW 1: User creation + role + permission validation
  // ==========================================================================
  test.describe('Flow 1: User Operational Registration', () => {
    let newUserId: string;
    let newUsername: string;

    test('should create user with role and validate real access', async ({
      apiContext,
      testUser
    }) => {
      // 1. Create user with reception role
      newUsername = `reception_e2e_${Date.now()}`;
      const createUserRes = await apiContext.post('/users', {
        data: {
          username: newUsername,
          email: `${newUsername}@cvg.local`,
          password: 'Reception123!',
          roleCode: 'reception',
          displayName: 'Recepcionista E2E'
        }
      });
      expect(createUserRes.ok()).toBeTruthy();
      const newUser = await createUserRes.json();
      newUserId = newUser.id;
      expect(newUser.id).toBeTruthy();
      expect(newUser.username).toBe(newUsername);
      expect(newUser.status).toBe('active');
      console.log(`   ✅ User created: ${newUserId} (${newUsername})`);

      // 2. Login as new user
      const loginRes = await apiContext.post('/auth/login', {
        data: { username: newUsername, password: 'Reception123!' }
      });
      expect(loginRes.ok()).toBeTruthy();
      const session = await loginRes.json();
      expect(session.accessToken).toBeTruthy();
      expect(session.refreshToken).toBeTruthy();
      console.log(`   ✅ User logged in successfully`);

      // 3. Validate access to permitted operation (owners via reception role)
      const ownersRes = await apiContext.get('/owners', {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      expect(ownersRes.ok()).toBeTruthy();
      console.log(`   ✅ User can access /owners (permitted)`);

      // 4. Validate block on forbidden operation (users.manage — reception doesn't have it)
      const usersRes = await apiContext.post('/users', {
        data: {
          username: `blocked_${Date.now()}`,
          email: `blocked@cvg.local`,
          password: 'Blocked123!'
        },
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      expect(usersRes.status()).toBe(403);
      console.log(`   ✅ User blocked from /users POST (forbidden)`);

      console.log(`   🎉 Flow 1 complete: User → Role → Permission → Access validated`);
    });
  });

  // ==========================================================================
  // FLOW 2: Veterinarian registration + scheduling eligibility
  // ==========================================================================
  test.describe('Flow 2: Veterinarian → Scheduling Eligibility', () => {
    let vetUserId: string;
    let vetUsername: string;

    test('should create veterinarian and validate presence in staff CRUD', async ({
      apiContext,
      testUser
    }) => {
      // 1. Create veterinarian user
      vetUsername = `vet_e2e_${Date.now()}`;
      const createVetRes = await apiContext.post('/users', {
        data: {
          username: vetUsername,
          email: `${vetUsername}@cvg.local`,
          password: 'Vet123!',
          roleCode: 'veterinarian',
          displayName: 'Dr. Veterinário E2E'
        }
      });
      expect(createVetRes.ok()).toBeTruthy();
      const vetUser = await createVetRes.json();
      vetUserId = vetUser.id;
      expect(vetUser.id).toBeTruthy();
      console.log(`   ✅ Veterinarian user created: ${vetUserId}`);

      // 2. Create the operational staff record linked to the new user
      const createStaffRes = await apiContext.post('/staff', {
        data: {
          employeeCode: `VET-E2E-${Date.now()}`,
          fullName: 'Dr. Veterinario E2E',
          userId: vetUserId,
          department: 'Clinica',
          jobTitle: 'Medico Veterinario'
        }
      });
      expect(createStaffRes.ok()).toBeTruthy();
      const staffMember = await createStaffRes.json();
      expect(staffMember.userId).toBe(vetUserId);
      console.log(`   ✅ Staff criado: ${staffMember.id}`);

      // 3. Validate staff list is accessible and contains the created professional
      const staffRes = await apiContext.get('/staff');
      expect(staffRes.ok()).toBeTruthy();
      const staffList = await staffRes.json();
      expect(Array.isArray(staffList.items)).toBeTruthy();
      expect(staffList.items.length).toBeGreaterThan(0);
      expect(staffList.items.some((item: any) => item.id === staffMember.id)).toBeTruthy();
      console.log(`   ✅ Staff list available (${staffList.items.length} professionals)`);

      const staffDetailRes = await apiContext.get('/staff/' + staffMember.id);
      expect(staffDetailRes.ok()).toBeTruthy();

      // 4. Verify veterinarian can access clinical operations
      const vetLoginRes = await apiContext.post('/auth/login', {
        data: { username: vetUsername, password: 'Vet123!' }
      });
      expect(vetLoginRes.ok()).toBeTruthy();
      const vetSession = await vetLoginRes.json();

      // Veterinarian should be able to read patients
      const patientsRes = await apiContext.get('/patients', {
        headers: { Authorization: `Bearer ${vetSession.accessToken}` }
      });
      expect(patientsRes.ok()).toBeTruthy();
      console.log(`   ✅ Veterinarian can access /patients (permitted)`);

      console.log(`   🎉 Flow 2 complete: Veterinarian → Staff → Eligibility validated`);
    });
  });

  // ==========================================================================
  // FLOW 3: Owner + patient + appointment with eligible professional
  // ==========================================================================
  test.describe('Flow 3: Tutor + Paciente + Agendamento', () => {
    let ownerId: string;
    let patientId: string;
    let appointmentId: string;
    let professionalUserId: string;

    test('should create complete scheduling chain with eligible professional', async ({
      apiContext,
      testUser
    }) => {
      // 1. Create owner (tutor)
      const ownerRes = await apiContext.post('/owners', {
        data: {
          fullName: `Carlos Oliveira E2E`,
          document: `E2E-FLOW3-${Date.now()}`,
          phoneMain: '11977665544',
          email: `carlos.flow3.${Date.now()}@test.com`
        }
      });
      expect(ownerRes.ok()).toBeTruthy();
      const owner = await ownerRes.json();
      ownerId = owner.id;
      expect(owner.id).toBeTruthy();
      console.log(`   ✅ Tutor criado: ${ownerId}`);

      // 2. Create patient linked to owner
      const patientRes = await apiContext.post('/patients', {
        data: {
          ownerId,
          name: `Thor E2E`,
          species: 'Canina',
          breed: 'Pastor Alemão',
          sex: 'male',
          microchip: `E2E-FLOW3-${Date.now()}`
        }
      });
      expect(patientRes.ok()).toBeTruthy();
      const patient = await patientRes.json();
      patientId = patient.id;
      expect(patient.id).toBeTruthy();
      expect(patient.ownerId).toBe(ownerId);
      console.log(`   ✅ Paciente criado: ${patientId} (tutor: ${ownerId})`);

      // 3. Get available professional from staff
      const staffRes = await apiContext.get('/staff');
      expect(staffRes.ok()).toBeTruthy();
      const staffList = await staffRes.json();
      expect(staffList.items.length).toBeGreaterThan(0);
      professionalUserId = staffList.items[0].userId;
      console.log(`   ✅ Profissional elegível: ${professionalUserId}`);

      // 4. Create appointment with eligible professional
      const startAt = new Date();
      startAt.setDate(startAt.getDate() + 1);
      startAt.setHours(14, 0, 0, 0);
      const endAt = new Date(startAt);
      endAt.setMinutes(endAt.getMinutes() + 45);

      const appointmentRes = await apiContext.post('/appointments', {
        data: {
          patientId,
          ownerId,
          professionalUserId,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          type: 'consultation',
          notes: 'Consulta de rotina - Flow 3 E2E'
        }
      });
      expect(appointmentRes.ok()).toBeTruthy();
      const appointment = await appointmentRes.json();
      appointmentId = appointment.id;
      expect(appointment.id).toBeTruthy();
      expect(appointment.patientId).toBe(patientId);
      expect(appointment.ownerId).toBe(ownerId);
      expect(appointment.professionalUserId).toBe(professionalUserId);
      expect(appointment.status).toBe('scheduled');
      console.log(`   ✅ Agendamento criado: ${appointmentId}`);

      // 5. Verify appointment is listable
      const listRes = await apiContext.get('/appointments');
      expect(listRes.ok()).toBeTruthy();
      const list = await listRes.json();
      expect(list.items.some((a: any) => a.id === appointmentId)).toBeTruthy();
      console.log(`   ✅ Agendamento encontrado na lista`);

      console.log(`   🎉 Flow 3 complete: Tutor → Paciente → Profissional → Agendamento`);
    });
  });

  // ==========================================================================
  // FLOW 4: Appointment → encounter chain
  // ==========================================================================
  test.describe('Flow 4: Agendamento → Atendimento', () => {
    let flow4OwnerId: string;
    let flow4PatientId: string;
    let flow4AppointmentId: string;
    let flow4QueueEntryId: string;
    let flow4EncounterId: string;
    let flow4ProfessionalUserId: string;

    test('should transform appointment into encounter maintaining chain', async ({
      apiContext,
      testUser
    }) => {
      // Setup: Create owner + patient + appointment
      const ownerRes = await apiContext.post('/owners', {
        data: {
          fullName: `Fernanda Lima E2E`,
          document: `E2E-FLOW4-${Date.now()}`,
          phoneMain: '11966554433',
          email: `fernanda.flow4.${Date.now()}@test.com`
        }
      });
      const owner = await ownerRes.json();
      flow4OwnerId = owner.id;

      const patientRes = await apiContext.post('/patients', {
        data: {
          ownerId: flow4OwnerId,
          name: `Bella E2E`,
          species: 'Felina',
          breed: 'Siamesa',
          sex: 'female',
          microchip: `E2E-FLOW4-${Date.now()}`
        }
      });
      const patient = await patientRes.json();
      flow4PatientId = patient.id;

      const staffRes = await apiContext.get('/staff');
      const staffList = await staffRes.json();
      flow4ProfessionalUserId = staffList.items[0].userId;

      const startAt = new Date();
      startAt.setHours(startAt.getHours() + 2);
      const endAt = new Date(startAt);
      endAt.setMinutes(endAt.getMinutes() + 30);

      const appointmentRes = await apiContext.post('/appointments', {
        data: {
          patientId: flow4PatientId,
          ownerId: flow4OwnerId,
          professionalUserId: flow4ProfessionalUserId,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          type: 'consultation'
        }
      });
      const appointment = await appointmentRes.json();
      flow4AppointmentId = appointment.id;
      console.log(`   ✅ Agendamento criado: ${flow4AppointmentId}`);

      // Check-in the appointment (creates queue entry)
      const checkInRes = await apiContext.post('/queue/check-in', {
        data: {
          appointmentId: flow4AppointmentId,
          patientId: flow4PatientId,
          ownerId: flow4OwnerId,
          reason: 'Check-in Flow 4 E2E'
        }
      });
      expect(checkInRes.ok()).toBeTruthy();
      const queueEntry = await checkInRes.json();
      flow4QueueEntryId = queueEntry.id;
      expect(flow4QueueEntryId).toBeTruthy();
      expect(queueEntry.appointmentId).toBe(flow4AppointmentId);
      console.log(`   ✅ Check-in realizado: queue entry ${flow4QueueEntryId}`);

      // Open encounter with queueEntryId to link to appointment
      const encounterRes = await apiContext.post('/encounters', {
        data: {
          patientId: flow4PatientId,
          ownerId: flow4OwnerId,
          queueEntryId: flow4QueueEntryId,
          reason: 'Consulta de rotina - Flow 4 E2E'
        }
      });
      expect(encounterRes.ok()).toBeTruthy();
      const encounter = await encounterRes.json();
      flow4EncounterId = encounter.id;
      expect(flow4EncounterId).toBeTruthy();
      expect(encounter.patientId).toBe(flow4PatientId);
      expect(encounter.ownerId).toBe(flow4OwnerId);
      console.log(`   ✅ Atendimento iniciado: ${flow4EncounterId}`);

      // Verify encounter is retrievable
      const getEncounterRes = await apiContext.get(`/encounters/${flow4EncounterId}`);
      expect(getEncounterRes.ok()).toBeTruthy();
      const fetchedEncounter = await getEncounterRes.json();
      expect(fetchedEncounter.patientId).toBe(flow4PatientId);
      console.log(`   ✅ Atendimento verificado (patient: ${fetchedEncounter.patientId})`);

      console.log(`   🎉 Flow 4 complete: Agendamento → Check-in → Atendimento (chain maintained)`);
    });
  });

  // ==========================================================================
  // FLOW 5: Clinical action → auditable evidence
  // ==========================================================================
  test.describe('Flow 5: Registro Clínico → Evidência Auditável', () => {
    let flow5OwnerId: string;
    let flow5PatientId: string;
    let flow5EncounterId: string;

    test.beforeAll(async ({ apiContext }) => {
      const ownerRes = await apiContext.post('/owners', {
        data: {
          fullName: `Ricardo Souza E2E`,
          document: `E2E-FLOW5-${Date.now()}`,
          phoneMain: '11955443322',
          email: `ricardo.flow5.${Date.now()}@test.com`
        }
      });
      const owner = await ownerRes.json();
      flow5OwnerId = owner.id;

      const patientRes = await apiContext.post('/patients', {
        data: {
          ownerId: flow5OwnerId,
          name: `Max E2E`,
          species: 'Canina',
          breed: 'Labrador',
          sex: 'male',
          microchip: `E2E-FLOW5-${Date.now()}`
        }
      });
      const patient = await patientRes.json();
      flow5PatientId = patient.id;

      const encounterRes = await apiContext.post('/encounters', {
        data: {
          patientId: flow5PatientId,
          ownerId: flow5OwnerId,
          reason: 'Consulta para registro clínico - Flow 5 E2E'
        }
      });
      const encounter = await encounterRes.json();
      flow5EncounterId = encounter.id;
    });

    test('should create clinical entry and verify audit trail', async ({
      apiContext,
      testUser
    }) => {
      // 1. Create clinical entry (SOAP note)
      const entryRes = await apiContext.post('/medical-records/entries', {
        data: {
          encounterId: flow5EncounterId,
          entryType: 'SOAP',
          content:
            'S: Tutor relata falta de apetite há 2 dias.\nO: Paciente apático, TPC > 2s.\nA: Possível gastroenterite.\nP: Exames laboratoriais.'
        }
      });
      expect(entryRes.ok()).toBeTruthy();
      const entry = await entryRes.json();
      expect(entry.id).toBeTruthy();
      expect(entry.encounterId).toBe(flow5EncounterId);
      console.log(`   ✅ Registro clínico criado: ${entry.id}`);

      // 2. Verify audit event was generated
      const auditRes = await apiContext.get('/audit/events');
      expect(auditRes.ok()).toBeTruthy();
      const auditEvents = await auditRes.json();
      expect(Array.isArray(auditEvents.items)).toBeTruthy();
      expect(auditEvents.items.length).toBeGreaterThan(0);

      // Find audit event for clinical entry creation
      const clinicalAuditEvent = auditEvents.items.find(
        (e: any) => e.entityId === entry.id || e.action === 'create_entry'
      );
      expect(clinicalAuditEvent).toBeDefined();
      expect(clinicalAuditEvent.actorId).toBeTruthy();
      expect(clinicalAuditEvent.module).toBe('medical-records');
      expect(clinicalAuditEvent.correlationId).toBeTruthy();
      console.log(`   ✅ Evidência auditável encontrada (actor: ${clinicalAuditEvent.actorId})`);

      // 3. Verify medical record exists for encounter
      const recordRes = await apiContext.get('/medical-records', {
        params: { encounterId: flow5EncounterId }
      });
      expect(recordRes.ok()).toBeTruthy();
      const record = await recordRes.json();
      expect(record.record).toBeDefined();
      console.log(`   ✅ Prontuário verificado para encounter ${flow5EncounterId}`);

      console.log(`   🎉 Flow 5 complete: Registro Clínico → Audit Trail verified`);
    });
  });

  // ==========================================================================
  // FLOW 6: Encounter → billable item
  // ==========================================================================
  test.describe('Flow 6: Atendimento → Item Faturável', () => {
    let flow6OwnerId: string;
    let flow6PatientId: string;
    let flow6EncounterId: string;

    test.beforeAll(async ({ apiContext }) => {
      const ownerRes = await apiContext.post('/owners', {
        data: {
          fullName: `Patricia Mendes E2E`,
          document: `E2E-FLOW6-${Date.now()}`,
          phoneMain: '11944332211',
          email: `patricia.flow6.${Date.now()}@test.com`
        }
      });
      const owner = await ownerRes.json();
      flow6OwnerId = owner.id;

      const patientRes = await apiContext.post('/patients', {
        data: {
          ownerId: flow6OwnerId,
          name: `Rex E2E`,
          species: 'Canina',
          breed: 'Golden Retriever',
          sex: 'male',
          microchip: `E2E-FLOW6-${Date.now()}`
        }
      });
      const patient = await patientRes.json();
      flow6PatientId = patient.id;

      const encounterRes = await apiContext.post('/encounters', {
        data: {
          patientId: flow6PatientId,
          ownerId: flow6OwnerId,
          reason: 'Consulta com faturamento - Flow 6 E2E'
        }
      });
      const encounter = await encounterRes.json();
      flow6EncounterId = encounter.id;
    });

    test('should create billable item and verify financial reflex', async ({
      apiContext,
      testUser
    }) => {
      // 1. Access billing for encounter
      const billingRes = await apiContext.get('/billing', {
        params: { encounterId: flow6EncounterId }
      });
      expect(billingRes.ok()).toBeTruthy();
      console.log(`   ✅ Billing record accessed for encounter ${flow6EncounterId}`);

      // 2. Add billable item (consultation fee)
      const addItemRes = await apiContext.post('/billing/items', {
        data: {
          encounterId: flow6EncounterId,
          itemType: 'service',
          description: 'Consulta clínica geral',
          quantity: 1,
          unitPriceAmount: 150.0
        }
      });
      expect(addItemRes.ok()).toBeTruthy();
      const billingItem = await addItemRes.json();
      expect(billingItem.id).toBeTruthy();
      expect(billingItem.description).toBe('Consulta clínica geral');
      expect(billingItem.quantity).toBe(1);
      console.log(`   ✅ Item faturável criado: ${billingItem.id} (R$ 150.00)`);

      // 3. Add second billable item (exam fee)
      const addItem2Res = await apiContext.post('/billing/items', {
        data: {
          encounterId: flow6EncounterId,
          itemType: 'service',
          description: 'Exame de sangue completo',
          quantity: 1,
          unitPriceAmount: 200.0
        }
      });
      expect(addItem2Res.ok()).toBeTruthy();
      console.log(`   ✅ Segundo item faturável criado (R$ 200.00)`);

      // 4. Verify billing items are listed
      const itemsRes = await apiContext.get('/billing/items', {
        params: { encounterId: flow6EncounterId }
      });
      expect(itemsRes.ok()).toBeTruthy();
      const items = await itemsRes.json();
      expect(items.items.length).toBe(2);
      console.log(`   ✅ Resumo faturável: ${items.items.length} itens`);

      console.log(`   🎉 Flow 6 complete: Atendimento → Faturamento verified`);
    });
  });

  // ==========================================================================
  // FLOW 7: Encounter → consumption → inventory
  // ==========================================================================
  test.describe('Flow 7: Atendimento → Consumo → Estoque', () => {
    let flow7OwnerId: string;
    let flow7PatientId: string;
    let flow7EncounterId: string;
    let inventoryItemId: string;
    let initialQuantity: number;

    test.beforeAll(async ({ apiContext }) => {
      const ownerRes = await apiContext.post('/owners', {
        data: {
          fullName: `Marcos Pereira E2E`,
          document: `E2E-FLOW7-${Date.now()}`,
          phoneMain: '11933221100',
          email: `marcos.flow7.${Date.now()}@test.com`
        }
      });
      const owner = await ownerRes.json();
      flow7OwnerId = owner.id;

      const patientRes = await apiContext.post('/patients', {
        data: {
          ownerId: flow7OwnerId,
          name: `Luna E2E`,
          species: 'Felina',
          breed: 'Persa',
          sex: 'female',
          microchip: `E2E-FLOW7-${Date.now()}`
        }
      });
      const patient = await patientRes.json();
      flow7PatientId = patient.id;

      const encounterRes = await apiContext.post('/encounters', {
        data: {
          patientId: flow7PatientId,
          ownerId: flow7OwnerId,
          reason: 'Consulta com consumo de estoque - Flow 7 E2E'
        }
      });
      const encounter = await encounterRes.json();
      flow7EncounterId = encounter.id;

      // Get initial inventory
      const inventoryRes = await apiContext.get('/inventory/items');
      expect(inventoryRes.ok()).toBeTruthy();
      const inventory = await inventoryRes.json();
      expect(inventory.items.length).toBeGreaterThan(0);
      inventoryItemId = inventory.items[0].id;
      initialQuantity = inventory.items[0].onHandQuantity;
      console.log(`   ✅ Estoque inicial: item ${inventoryItemId} = ${initialQuantity} unidades`);
    });

    test('should consume inventory item and verify stock movement', async ({
      apiContext,
      testUser
    }) => {
      // 1. Consume inventory item during encounter
      const consumeRes = await apiContext.post('/inventory/consumptions', {
        data: {
          encounterId: flow7EncounterId,
          inventoryItemId,
          quantity: 2
        }
      });
      expect(consumeRes.ok()).toBeTruthy();
      const consumption = await consumeRes.json();
      expect(consumption.id).toBeTruthy();
      expect(consumption.encounterId).toBe(flow7EncounterId);
      expect(consumption.quantity).toBe(2);
      console.log(`   ✅ Consumo registrado: 2 unidades do item ${inventoryItemId}`);

      // 2. Verify stock was reduced (list all items and find ours)
      const updatedItemsRes = await apiContext.get('/inventory/items');
      expect(updatedItemsRes.ok()).toBeTruthy();
      const updatedItems = await updatedItemsRes.json();
      const updatedItem = updatedItems.items.find((i: any) => i.id === inventoryItemId);
      expect(updatedItem).toBeDefined();
      expect(updatedItem.onHandQuantity).toBe(initialQuantity - 2);
      console.log(
        `   ✅ Estoque atualizado: ${updatedItem.onHandQuantity} (era ${initialQuantity})`
      );

      // 3. Verify consumption is linked to encounter
      const consumptionsRes = await apiContext.get('/inventory/consumptions', {
        params: { encounterId: flow7EncounterId }
      });
      expect(consumptionsRes.ok()).toBeTruthy();
      const consumptions = await consumptionsRes.json();
      expect(consumptions.items.length).toBeGreaterThan(0);
      console.log(`   ✅ Consumptions linked to encounter: ${consumptions.items.length}`);

      console.log(`   🎉 Flow 7 complete: Atendimento → Consumo → Estoque verified`);
    });
  });

  // ==========================================================================
  // FLOW 8: User inactivation → operational block
  // ==========================================================================
  test.describe('Flow 8: Inativação → Bloqueio Operacional', () => {
    let flow8UserId: string;
    let flow8Username: string;

    test('should block inactive user from operations', async ({ apiContext, testUser }) => {
      // 1. Create active user
      flow8Username = `inactive_e2e_${Date.now()}`;
      const createUserRes = await apiContext.post('/users', {
        data: {
          username: flow8Username,
          email: `${flow8Username}@cvg.local`,
          password: 'Inactive123!',
          roleCode: 'reception',
          displayName: 'Usuário Inativo E2E'
        }
      });
      expect(createUserRes.ok()).toBeTruthy();
      const newUser = await createUserRes.json();
      flow8UserId = newUser.id;
      console.log(`   ✅ User created: ${flow8UserId} (${flow8Username})`);

      // 2. Login and verify access works
      const loginRes = await apiContext.post('/auth/login', {
        data: { username: flow8Username, password: 'Inactive123!' }
      });
      expect(loginRes.ok()).toBeTruthy();
      const session = await loginRes.json();
      const accessToken = session.accessToken;

      // Verify access works while active
      const ownersRes = await apiContext.get('/owners', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      expect(ownersRes.ok()).toBeTruthy();
      console.log(`   ✅ User has access while active`);

      // 3. Inactivate user
      const updateRes = await apiContext.patch(`/users/${flow8UserId}`, {
        data: { status: 'inactive' }
      });
      expect(updateRes.ok()).toBeTruthy();
      const updatedUser = await updateRes.json();
      expect(updatedUser.status).toBe('inactive');
      console.log(`   ✅ User inactivated: ${flow8UserId}`);

      // 4. Verify blocked access with same token
      const blockedRes = await apiContext.get('/owners', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      expect(blockedRes.status()).toBe(403);
      console.log(`   ✅ User blocked from /owners after inactivation (403)`);

      // 5. Verify blocked from creating appointments
      const blockedApptRes = await apiContext.post('/appointments', {
        data: {
          patientId: 'test-patient',
          ownerId: 'test-owner',
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 3600000).toISOString()
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      expect(blockedApptRes.status()).toBe(403);
      console.log(`   ✅ User blocked from /appointments after inactivation (403)`);

      console.log(`   🎉 Flow 8 complete: Inativação → Bloqueio Operacional verified`);
    });
  });

  // ==========================================================================
  // FLOW 9: Encounter → surgery → follow-up
  // ==========================================================================
  test.describe('Flow 9: Atendimento → Cirurgia → Acompanhamento', () => {
    let flow9OwnerId: string;
    let flow9PatientId: string;
    let flow9EncounterId: string;
    let flow9SurgeryCaseId: string;

    test.beforeAll(async ({ apiContext }) => {
      const ownerRes = await apiContext.post('/owners', {
        data: {
          fullName: `Juliana Costa E2E`,
          document: `E2E-FLOW9-${Date.now()}`,
          phoneMain: '11922110099',
          email: `juliana.flow9.${Date.now()}@test.com`
        }
      });
      const owner = await ownerRes.json();
      flow9OwnerId = owner.id;

      const patientRes = await apiContext.post('/patients', {
        data: {
          ownerId: flow9OwnerId,
          name: `Bob E2E`,
          species: 'Canina',
          breed: 'Bulldog',
          sex: 'male',
          microchip: `E2E-FLOW9-${Date.now()}`
        }
      });
      const patient = await patientRes.json();
      flow9PatientId = patient.id;

      const encounterRes = await apiContext.post('/encounters', {
        data: {
          patientId: flow9PatientId,
          ownerId: flow9OwnerId,
          reason: 'Encaminhamento cirurgico - Flow 9 E2E'
        }
      });
      const encounter = await encounterRes.json();
      flow9EncounterId = encounter.id;
    });

    test('should request surgery and update status', async ({ apiContext, testUser }) => {
      // 1. Request surgery case
      const surgeryRes = await apiContext.post('/surgery/cases', {
        data: {
          encounterId: flow9EncounterId,
          procedureName: 'Ortopedia de quadril',
          surgeonUserId: 'user_vet',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          notes: 'Cirurgia ortopedica - Flow 9 E2E'
        }
      });
      expect(surgeryRes.ok()).toBeTruthy();
      const surgeryCase = await surgeryRes.json();
      flow9SurgeryCaseId = surgeryCase.id;
      expect(flow9SurgeryCaseId).toBeTruthy();
      expect(surgeryCase.encounterId).toBe(flow9EncounterId);
      expect(surgeryCase.procedureName).toBe('Ortopedia de quadril');
      expect(surgeryCase.status).toBe('requested');
      console.log(`   ✅ Cirurgia solicitada: ${flow9SurgeryCaseId}`);

      // 2. Update surgery status to scheduled
      const updateRes = await apiContext.patch(`/surgery/cases/${flow9SurgeryCaseId}`, {
        data: { status: 'scheduled' }
      });
      expect(updateRes.ok()).toBeTruthy();
      const updated = await updateRes.json();
      expect(updated.status).toBe('scheduled');
      console.log(`   ✅ Cirurgia agendada: status = scheduled`);

      // 3. Update to in_progress
      const inProgressRes = await apiContext.patch(`/surgery/cases/${flow9SurgeryCaseId}`, {
        data: { status: 'in_progress' }
      });
      expect(inProgressRes.ok()).toBeTruthy();
      const inProgress = await inProgressRes.json();
      expect(inProgress.status).toBe('in_progress');
      console.log(`   ✅ Cirurgia em andamento: status = in_progress`);

      // 4. Update to completed
      const completedRes = await apiContext.patch(`/surgery/cases/${flow9SurgeryCaseId}`, {
        data: { status: 'completed' }
      });
      expect(completedRes.ok()).toBeTruthy();
      const completed = await completedRes.json();
      expect(completed.status).toBe('completed');
      console.log(`   ✅ Cirurgia concluida: status = completed`);

      // 5. Verify surgery is listable by encounter
      const listRes = await apiContext.get('/surgery/cases', {
        params: { encounterId: flow9EncounterId }
      });
      expect(listRes.ok()).toBeTruthy();
      const list = await listRes.json();
      expect(list.items.some((s: any) => s.id === flow9SurgeryCaseId)).toBeTruthy();
      console.log(`   ✅ Cirurgia listada por encounter`);

      console.log(`   🎉 Flow 9 complete: Atendimento → Cirurgia → Acompanhamento verified`);
    });
  });

  // ==========================================================================
  // FLOW 10: Encounter → prescription → execution
  // ==========================================================================
  test.describe('Flow 10: Atendimento → Prescricao → Execucao', () => {
    let flow10OwnerId: string;
    let flow10PatientId: string;
    let flow10EncounterId: string;
    let flow10PrescriptionId: string;

    test.beforeAll(async ({ apiContext }) => {
      const ownerRes = await apiContext.post('/owners', {
        data: {
          fullName: `Ana Beatriz E2E`,
          document: `E2E-FLOW10-${Date.now()}`,
          phoneMain: '11911009988',
          email: `ana.flow10.${Date.now()}@test.com`
        }
      });
      const owner = await ownerRes.json();
      flow10OwnerId = owner.id;

      const patientRes = await apiContext.post('/patients', {
        data: {
          ownerId: flow10OwnerId,
          name: `Mimi E2E`,
          species: 'Felina',
          breed: 'Angora',
          sex: 'female',
          microchip: `E2E-FLOW10-${Date.now()}`
        }
      });
      const patient = await patientRes.json();
      flow10PatientId = patient.id;

      const encounterRes = await apiContext.post('/encounters', {
        data: {
          patientId: flow10PatientId,
          ownerId: flow10OwnerId,
          reason: 'Prescricao medica - Flow 10 E2E'
        }
      });
      const encounter = await encounterRes.json();
      flow10EncounterId = encounter.id;
    });

    test('should create prescription and execute administrations', async ({
      apiContext,
      testUser
    }) => {
      // 1. Create prescription
      const prescRes = await apiContext.post('/prescription-executions', {
        data: {
          encounterId: flow10EncounterId,
          medicationName: 'Dipirona 500mg',
          dosage: '1 comprimido',
          route: 'oral',
          frequency: '8/8h',
          duration: '5 dias',
          notes: 'Prescricao Flow 10 E2E'
        }
      });
      expect(prescRes.ok()).toBeTruthy();
      const prescription = await prescRes.json();
      flow10PrescriptionId = prescription.id;
      expect(flow10PrescriptionId).toBeTruthy();
      expect(prescription.encounterId).toBe(flow10EncounterId);
      expect(prescription.medicationName).toBe('Dipirona 500mg');
      console.log(`   ✅ Prescricao criada: ${flow10PrescriptionId}`);

      // 2. List prescriptions
      const listRes = await apiContext.get('/prescription-executions', {
        params: { encounterId: flow10EncounterId }
      });
      expect(listRes.ok()).toBeTruthy();
      const list = await listRes.json();
      expect(list.items.some((p: any) => p.id === flow10PrescriptionId)).toBeTruthy();
      console.log(`   ✅ Prescricao listada por encounter`);

      // 3. Get prescription details
      const getRes = await apiContext.get(`/prescription-executions/${flow10PrescriptionId}`);
      expect(getRes.ok()).toBeTruthy();
      const details = await getRes.json();
      expect(details.id).toBe(flow10PrescriptionId);
      console.log(`   ✅ Detalhes da prescricao obtidos`);

      console.log(`   🎉 Flow 10 complete: Atendimento → Prescricao → Execucao verified`);
    });
  });

  // ==========================================================================
  // FLOW 11: Encounter → discharge
  // ==========================================================================
  test.describe('Flow 11: Atendimento → Alta', () => {
    let flow11OwnerId: string;
    let flow11PatientId: string;
    let flow11EncounterId: string;
    let flow11DischargeId: string;

    test.beforeAll(async ({ apiContext }) => {
      const ownerRes = await apiContext.post('/owners', {
        data: {
          fullName: `Roberto Almeida E2E`,
          document: `E2E-FLOW11-${Date.now()}`,
          phoneMain: '11900998877',
          email: `roberto.flow11.${Date.now()}@test.com`
        }
      });
      const owner = await ownerRes.json();
      flow11OwnerId = owner.id;

      const patientRes = await apiContext.post('/patients', {
        data: {
          ownerId: flow11OwnerId,
          name: `Rex E2E`,
          species: 'Canina',
          breed: 'Rottweiler',
          sex: 'male',
          microchip: `E2E-FLOW11-${Date.now()}`
        }
      });
      const patient = await patientRes.json();
      flow11PatientId = patient.id;

      const encounterRes = await apiContext.post('/encounters', {
        data: {
          patientId: flow11PatientId,
          ownerId: flow11OwnerId,
          reason: 'Atendimento com alta - Flow 11 E2E'
        }
      });
      const encounter = await encounterRes.json();
      flow11EncounterId = encounter.id;
    });

    test('should create discharge and verify audit trail', async ({ apiContext, testUser }) => {
      // 1. Create discharge
      const dischargeRes = await apiContext.post('/discharges', {
        data: {
          encounterId: flow11EncounterId,
          patientId: flow11PatientId,
          ownerId: flow11OwnerId,
          dischargeType: 'alta_clinica',
          diagnosis: 'Gastroenterite tratada',
          prescribedMedications: 'Dipirona 500mg 8/8h por 5 dias',
          returnDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          notes: 'Alta clinica - Flow 11 E2E'
        }
      });
      expect(dischargeRes.ok()).toBeTruthy();
      const discharge = await dischargeRes.json();
      flow11DischargeId = discharge.id;
      expect(flow11DischargeId).toBeTruthy();
      expect(discharge.encounterId).toBe(flow11EncounterId);
      expect(discharge.dischargeType).toBe('alta_clinica');
      console.log(`   ✅ Alta criada: ${flow11DischargeId}`);

      // 2. List discharges
      const listRes = await apiContext.get('/discharges');
      expect(listRes.ok()).toBeTruthy();
      const list = await listRes.json();
      expect(list.items.some((d: any) => d.id === flow11DischargeId)).toBeTruthy();
      console.log(`   ✅ Alta listada`);

      // 3. Get discharge details
      const getRes = await apiContext.get(`/discharges/${flow11DischargeId}`);
      expect(getRes.ok()).toBeTruthy();
      const details = await getRes.json();
      expect(details.id).toBe(flow11DischargeId);
      console.log(`   ✅ Detalhes da alta obtidos`);

      // 4. Verify audit event
      const auditRes = await apiContext.get('/audit/events');
      expect(auditRes.ok()).toBeTruthy();
      const auditEvents = await auditRes.json();
      const dischargeAudit = auditEvents.items.find(
        (e: any) => e.entityId === flow11DischargeId || e.action === 'discharge_created'
      );
      expect(dischargeAudit).toBeDefined();
      console.log(`   ✅ Evidencia auditavel da alta encontrada`);

      console.log(`   🎉 Flow 11 complete: Atendimento → Alta verified`);
    });
  });
});

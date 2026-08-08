import { test, expect } from '../fixtures/cvg-his.fixture';

/**
 * E2E Test: Fluxo de Internação
 * Admitir → Prescrever → Administrar → Dar alta
 */

test.describe.serial('Fluxo: Internação → Prescrição → Administração → Alta', () => {
  
  let patientId: string;
  let ownerId: string;
  let encounterId: string;
  let stayId: string;

  test.beforeAll(async ({ apiContext, testUser }) => {
    // Create owner and patient for internment tests
    const ownerRes = await apiContext.post('/owners', {
      data: {
        fullName: 'João Santos E2E Internação',
        documentId: `E2E-INT-${Date.now()}`,
        contacts: [
          { label: 'Celular', value: '11912345678', type: 'phone', primary: true }
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
        name: 'Luna E2E Internação',
        species: 'feline',
        breed: 'SRD',
        sex: 'female',
        microchip: `E2E-INT-${Date.now()}`
      }
    });
    expect(patientRes.ok()).toBeTruthy();
    const patient = await patientRes.json();
    patientId = patient.id;

    const encounterRes = await apiContext.post('/encounters', {
      data: {
        patientId,
        ownerId,
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Observação pós-cirúrgica - E2E Internação'
      }
    });
    expect(encounterRes.ok()).toBeTruthy();
    const encounter = await encounterRes.json();
    encounterId = encounter.id;
  });

  test('deve admitir paciente em leito', async ({ apiContext }) => {
    // =====================
    // 1. Buscar ward e bed disponíveis
    // =====================
    const sectorsRes = await apiContext.get('/sectors');
    expect(sectorsRes.ok()).toBeTruthy();
    const sectorsPayload = await sectorsRes.json();
    let sector = sectorsPayload.items?.[0];
    if (!sector) {
      const createSectorRes = await apiContext.post('/sectors', {
        data: {
          code: `E2E-${Date.now()}`,
          name: 'Observação E2E',
          kind: 'observation'
        }
      });
      expect(createSectorRes.ok()).toBeTruthy();
      sector = await createSectorRes.json();
    }
    console.log(`   ℹ️  Setor encontrado: ${sector.name}`);

    // Get beds in ward
    const bedsRes = await apiContext.get('/beds', {
      params: { sectorId: sector.id, active: 'true' }
    });
    expect(bedsRes.ok()).toBeTruthy();
    const beds = await bedsRes.json();

    // Find available bed
    let availableBed = beds.items?.find((b: any) => b.status === 'available' && b.active);
    
    if (!availableBed) {
      // Create a bed if none available
      const createBedRes = await apiContext.post('/beds', {
        data: {
          sectorId: sector.id,
          code: `E2E-BED-${Date.now()}`,
          name: 'Leito de observação E2E',
          supportsSpecies: 'feline'
        }
      });
      expect(createBedRes.ok()).toBeTruthy();
      availableBed = await createBedRes.json();
    }

    console.log(`   ✅ Leito disponível: ${availableBed.label || availableBed.id}`);

    // =====================
    // 2. Admitir paciente
    // =====================
    const admitRes = await apiContext.post('/inpatient', {
      data: {
        encounterId,
        patientId,
        unit: 'clinic',
        ward: sector.name,
        bed: availableBed.code,
        sectorId: sector.id,
        bedId: availableBed.id,
        chiefComplaint: 'Observação pós-cirúrgica - E2E',
        reason: 'Monitoramento 24h após procedimento',
        planSummary: 'Repouso, medicação IV, monitoramento vital'
      }
    });
    
    expect(admitRes.ok()).toBeTruthy();
    const stay = await admitRes.json();
    stayId = stay.id;
    expect(stay.id).toBeTruthy();
    expect(stay.status).toBe('admitted');
    console.log(`   ✅ Paciente admitido - Stay: ${stay.id}`);

    // =====================
    // 3. Verificar stay ativo
    // =====================
    const stayRes = await apiContext.get('/inpatient', {
      params: { patientId, includeDischarged: 'true' }
    });
    expect(stayRes.ok()).toBeTruthy();
    const stayData = await stayRes.json();
    expect(stayData.items.some((item: any) => item.id === stay.id)).toBeTruthy();
    console.log(`   ✅ Internação ativa verificada`);
  });

  test('deve criar ordem de medicação', async ({ apiContext }) => {
    expect(stayId, 'The patient must be admitted before creating medication orders').toBeTruthy();

    const entryRes = await apiContext.post('/medical-records/entries', {
      data: {
        encounterId,
        patientId,
        entryType: 'prescription',
        title: 'Dipirona 500mg',
        content: 'Posologia: 1 comprimido\nVia: oral\nFrequência: 8/8h\nObservações: Internação E2E'
      }
    });
    expect(entryRes.ok()).toBeTruthy();
    const entry = await entryRes.json();

    const orderRes = await apiContext.post('/prescription-executions', {
      data: {
        clinicalEntryId: entry.id,
        patientId,
        encounterId,
        medicationName: 'Dipirona 500mg',
        dosage: '1 comprimido',
        route: 'oral',
        frequency: '8/8h',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        notes: 'Medicação E2E Test'
      }
    });

    expect(orderRes.ok(), 'Creating the medication order must succeed').toBeTruthy();

    const order = await orderRes.json();
    expect(order.id).toBeTruthy();
    expect(order.medicationName).toBe('Dipirona 500mg');
    console.log(`   ✅ Ordem de medicação criada: ${order.id}`);

    // =====================
    // 2. Listar ordens do paciente
    // =====================
    const listRes = await apiContext.get('/prescription-executions', {
      params: { patientId }
    });
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    expect(list.items.length).toBeGreaterThan(0);
    expect(list.items.some((item: any) => item.id === order.id)).toBeTruthy();

    const administrationRes = await apiContext.post(
      `/prescription-executions/${order.id}/execute`,
      { data: { status: 'administered', notes: 'Administrada na internação E2E' } }
    );
    expect(administrationRes.ok()).toBeTruthy();
    const administered = await administrationRes.json();
    expect(administered.status).toBe('administered');
    console.log(`   ✅ Administração registrada: ${administered.status}`);
  });

  test('deve dar alta do paciente', async ({ apiContext }) => {
    expect(stayId, 'The patient must be admitted before discharge').toBeTruthy();

    // =====================
    // 1. Dar alta
    // =====================
    const dischargeRes = await apiContext.patch(`/inpatient/${stayId}/update-status`, {
      data: {
        status: 'discharged',
        dischargeReason: 'Paciente recuperado - E2E Test'
      }
    });

    expect(dischargeRes.ok(), 'Discharge must succeed').toBeTruthy();

    const discharged = await dischargeRes.json();
    expect(discharged.status).toBe('discharged');
    expect(discharged.dischargedAt).toBeTruthy();
    console.log(`   ✅ Alta realizada com sucesso`);

    // =====================
    // 2. Verificar status final
    // =====================
    const stayRes = await apiContext.get('/inpatient', {
      params: { patientId, includeDischarged: 'true' }
    });
    expect(stayRes.ok()).toBeTruthy();
    const stays = await stayRes.json();
    const finalStay = stays.items.find((item: any) => item.id === stayId);
    expect(finalStay?.status).toBe('discharged');
    console.log(`   ✅ Status final verificado: ${finalStay.status}`);

    console.log('\n   🎉 Fluxo completo: Admitir → Prescrever → Dar Alta');
  });
});

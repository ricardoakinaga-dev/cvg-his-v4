import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockOwners = [
  {
    id: 'owner-1',
    accountId: 'acc-1',
    fullName: 'Joao Silva',
    documentId: '123.456.789-00',
    contacts: [
      { label: 'Celular', type: 'whatsapp' as const, value: '(11) 99999-1111', primary: true }
    ],
    financialResponsible: true,
    administrativeNotes: '',
    status: 'active' as const,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z'
  }
];

const mockPatients = [
  {
    id: 'patient-1',
    accountId: 'acc-1',
    name: 'Rex',
    species: 'canine',
    breed: 'SRD',
    sex: 'male' as const,
    primaryOwnerId: 'owner-1',
    status: 'active' as const,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z'
  }
];

const mockOwnerList = vi.fn().mockResolvedValue(mockOwners);
const mockPatientList = vi.fn().mockResolvedValue(mockPatients);
const mockClinicalHandoffs = [
  {
    id: 'handoff-1',
    accountId: 'acc-1',
    encounterId: 'encounter-1',
    ownerId: 'owner-1',
    patientId: 'patient-1',
    originChannel: 'reception' as const,
    fromSector: 'clinic' as const,
    toSector: 'reception' as const,
    fromResponsibleId: 'user-vet',
    toResponsibleType: 'sector' as const,
    toResponsibleId: 'reception',
    clinicalSummary: 'Retorno com pendencia de orientacao',
    receptionInstructions: 'Confirmar tutor e entregar orientacoes',
    priority: 'high' as const,
    handoffStatus: 'sent_to_reception' as const,
    createdBy: 'user-vet',
    sentBy: 'user-vet',
    sentAt: '2026-05-01T10:00:00Z',
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z'
  },
  {
    id: 'handoff-2',
    accountId: 'acc-1',
    encounterId: 'encounter-2',
    ownerId: 'owner-2',
    patientId: 'patient-2',
    originChannel: 'schedule' as const,
    fromSector: 'clinic' as const,
    toSector: 'reception' as const,
    fromResponsibleId: 'user-vet',
    toResponsibleType: 'sector' as const,
    toResponsibleId: 'reception',
    clinicalSummary: 'Caso recebido anteriormente',
    receptionInstructions: 'Conferencia ja feita',
    priority: 'medium' as const,
    handoffStatus: 'acknowledged_by_reception' as const,
    createdBy: 'user-vet',
    sentBy: 'user-vet',
    sentAt: '2026-05-01T09:00:00Z',
    acknowledgedBy: 'user-reception',
    acknowledgedAt: '2026-05-01T09:10:00Z',
    acknowledgeNote: 'Recebido pela recepcao',
    createdAt: '2026-05-01T09:00:00Z',
    updatedAt: '2026-05-01T09:10:00Z'
  }
];
const mockClinicalHandoffList = vi.fn().mockResolvedValue(mockClinicalHandoffs);
const mockClinicalHandoffAcknowledge = vi.fn().mockResolvedValue(mockClinicalHandoffs[1]);
const mockQueueEntries = [
  {
    id: 'queue-1',
    accountId: 'acc-1',
    patientId: 'patient-1',
    ownerId: 'owner-1',
    appointmentId: null,
    encounterId: null,
    status: 'waiting' as const,
    priority: 'high' as const,
    reason: 'Consulta de rotina',
    checkedInAt: '2026-04-05T09:00:00Z',
    calledAt: null,
    createdAt: '2026-04-05T09:00:00Z',
    updatedAt: '2026-04-05T09:00:00Z'
  },
  {
    id: 'queue-2',
    accountId: 'acc-1',
    patientId: 'patient-2',
    ownerId: 'owner-2',
    appointmentId: null,
    encounterId: 'encounter-2',
    status: 'in_care' as const,
    priority: 'medium' as const,
    reason: 'Retorno',
    checkedInAt: '2026-04-05T08:30:00Z',
    calledAt: '2026-04-05T08:35:00Z',
    createdAt: '2026-04-05T08:30:00Z',
    updatedAt: '2026-04-05T08:40:00Z'
  }
];
const mockListQueue = vi.fn().mockResolvedValue(mockQueueEntries);

vi.mock('@/services/owner', () => ({
  ownerService: {
    get list() {
      return mockOwnerList;
    }
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    get list() {
      return mockPatientList;
    }
  }
}));

vi.mock('@/services/scheduling', () => ({
  listQueue: () => mockListQueue()
}));

vi.mock('@/services/clinicalHandoff', () => ({
  clinicalHandoffService: {
    get list() {
      return mockClinicalHandoffList;
    },
    get acknowledge() {
      return mockClinicalHandoffAcknowledge;
    }
  }
}));

describe('ReceptionGatewayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOwnerList.mockResolvedValue(mockOwners);
    mockPatientList.mockResolvedValue(mockPatients);
    mockListQueue.mockResolvedValue(mockQueueEntries);
    mockClinicalHandoffList.mockResolvedValue(mockClinicalHandoffs);
    mockClinicalHandoffAcknowledge.mockResolvedValue(mockClinicalHandoffs[1]);
  });

  it('renders the reception gateway with primary operational actions', async () => {
    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    expect(wrapper.text()).toContain('Recepção');
    expect(wrapper.text()).toContain('Criar agendamento');
    expect(wrapper.text()).toContain('Abrir Agenda');
    expect(wrapper.text()).toContain('Abrir Esteira');
  });

  it('searches owners and patients from the same field', async () => {
    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage);

    await wrapper.find('input[type="search"]').setValue('11999991111');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockOwnerList).toHaveBeenCalledWith({ search: '11999991111', status: 'all' });
    expect(mockPatientList).toHaveBeenCalledWith({ search: '11999991111', status: 'all' });
    expect(wrapper.text()).toContain('Joao Silva');
    expect(wrapper.text()).toContain('Rex');
  });

  it('exposes safe next steps without creating an encounter automatically', async () => {
    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await wrapper.find('input[type="search"]').setValue('Rex');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    const links = wrapper.findAll('a');
    const hrefs = links.map((link) => link.attributes('href'));

    expect(hrefs).toContain('/owners/owner-1');
    expect(hrefs).toContain('/patients/patient-1');
    expect(hrefs).toContain('/patients/new?ownerId=owner-1');
    expect(hrefs).toContain('/appointments/new?ownerId=owner-1&patientId=patient-1');
    expect(hrefs).toContain('/quotes?ownerId=owner-1');
    expect(hrefs).toContain('/counter-sales?ownerId=owner-1');
    expect(hrefs).toContain('/queue?patientId=patient-1&ownerId=owner-1&reason=Recepcao');
    expect(hrefs).toContain('/encounters/new?ownerId=owner-1&patientId=patient-1');
    expect(wrapper.text()).toContain('Criar orçamento');
    expect(wrapper.text()).toContain('Abrir comanda');
    expect(wrapper.text()).toContain('Preparar check-in');
  });

  it('loads the central queue as the reception operational funnel', async () => {
    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();

    expect(mockListQueue).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('Funil operacional');
    expect(wrapper.text()).toContain('Aguardando recepção');
    expect(wrapper.text()).toContain('1');
    expect(wrapper.text()).toContain('Em atendimento');
    expect(wrapper.text()).toContain('Consulta de rotina');
    expect(wrapper.text()).toContain('Retorno');

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'));
    expect(hrefs).toContain('/patients/patient-1');
    expect(hrefs).toContain('/owners/owner-1');
    expect(hrefs).toContain('/encounters/encounter-2');
    expect(hrefs).toContain(
      '/counter-sales?encounterId=encounter-2&patientId=patient-2&ownerId=owner-2'
    );
  });

  it('shows a minimal handoff inbox without financial automation links', async () => {
    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();

    expect(mockClinicalHandoffList).toHaveBeenCalledWith();
    expect(wrapper.text()).toContain('Handoffs da recepção');
    expect(wrapper.text()).toContain('Aguardando ACK');
    expect(wrapper.text()).toContain('Alta ou crítica');
    expect(wrapper.text()).toContain('Retorno com pendencia de orientacao');
    expect(wrapper.text()).toContain('Confirmar tutor e entregar orientacoes');
    expect(wrapper.text()).not.toContain('Cobrança');

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'));
    expect(hrefs).toContain('/encounters/encounter-1');
    expect(hrefs).toContain('/patients/patient-1');
    expect(hrefs).toContain('/owners/owner-1');
    expect(hrefs).not.toContain('/billing/encounter-1');

    const acknowledgeButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Confirmar recebimento'));
    expect(acknowledgeButton).toBeTruthy();
    await acknowledgeButton!.trigger('click');
    await flushPromises();

    expect(mockClinicalHandoffAcknowledge).toHaveBeenCalledWith('handoff-1', {
      note: 'Recepcao confirmou recebimento do handoff clinico.'
    });
  });
});

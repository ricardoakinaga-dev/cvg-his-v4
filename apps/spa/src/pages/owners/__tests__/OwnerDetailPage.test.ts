import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockOwner = {
  id: 'owner-1',
  accountId: 'acc-1',
  fullName: 'João Silva',
  documentId: '',
  contacts: [{ label: 'WhatsApp', type: 'whatsapp' as const, value: '(11) 99999-1111', primary: true }],
  address: {
    zipCode: '01234-567',
    street: 'Rua Vetus',
    number: '100',
    complement: 'Casa',
    state: 'SP',
    city: 'Sao Paulo',
    district: 'Centro',
    reference: 'Proximo ao metro',
    cityCode: '3550308'
  },
  profile: {
    birthDate: '1988-02-03',
    sex: 'male' as const,
    group: 'VIP',
    receiveSms: true,
    personType: 'individual' as const,
    rg: '11.222.333-4'
  },
  financialProfile: {
    allowedDebtLimit: 250,
    creditBalance: 35.5,
    availablePoints: 120,
    blockedPoints: 15
  },
  financialResponsible: true,
  administrativeNotes: 'Cobrar autorização prévia',
  legacyVetusId: '3835',
  originalCreatedAt: '2024-05-03',
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z'
};

const mockPatients = [
  {
    id: 'pat-1',
    accountId: 'acc-1',
    name: 'Rex',
    species: 'canine' as const,
    breed: 'Golden Retriever',
    sex: 'male' as const,
    size: 'large' as const,
    baseWeightKg: 30.5,
    birthDateApproximate: '2020-05-15',
    chronicDisease: 'Doença renal crônica',
    allergy: 'Dipirona',
    primaryOwnerId: 'owner-1',
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
];
const mockAppointments = [
  {
    id: 'apt-1',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    scheduledAt: '2099-01-01T10:00:00Z',
    visitType: 'scheduled' as const,
    reason: 'Vacina',
    status: 'scheduled' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];
const mockEncounters = [
  {
    id: 'enc-1',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    visitType: 'scheduled' as const,
    origin: 'schedule' as const,
    reason: 'Retorno',
    status: 'in_care' as const,
    openedAt: '2024-01-03T09:00:00Z',
    createdByUserId: 'user-1',
    updatedAt: '2024-01-03T09:00:00Z'
  }
];
const mockBillingRecords = [
  {
    id: 'bill-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    status: 'open' as const,
    subtotalAmount: 420,
    currency: 'BRL',
    administrativeNotes: 'Parcela pendente',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];
const mockQuotes = [
  {
    id: 'quote-1',
    accountId: 'acc-1',
    number: 'Q-001',
    ownerId: 'owner-1',
    status: 'draft' as const,
    validUntil: null,
    subtotal: 320,
    discountAmount: 0,
    total: 320,
    notes: 'Pacote preventivo',
    createdByUserId: 'user-1',
    convertedToSaleId: null,
    convertedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];
const mockPreventiveEvents = [
  {
    id: 'prev-1',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    clientName: 'João Silva',
    animalName: 'Rex',
    eventDate: '2099-02-01',
    itemType: 'vaccine' as const,
    description: 'V10 anual',
    status: 'scheduled' as const,
    observation: null,
    executedAt: null,
    executedObservation: null,
    rescheduledFromId: null,
    reminderEmailPreparedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];
const mockLaboratoryOrders = [
  {
    id: 'lab-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'HEM',
    reason: 'Hemograma controle',
    status: 'requested' as const,
    createdAt: '2024-01-04T09:00:00Z',
    updatedAt: '2024-01-04T09:00:00Z'
  },
  {
    id: 'lab-2',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'BIO',
    reason: 'Bioquímica anual',
    status: 'resulted' as const,
    resultSummary: 'Sem alterações',
    createdAt: '2024-01-03T09:00:00Z',
    updatedAt: '2024-01-03T09:00:00Z'
  }
];

const mockGetOwnerById = vi.fn().mockResolvedValue(mockOwner);
const mockPatientList = vi.fn().mockResolvedValue(mockPatients);
const mockAppointmentList = vi.fn().mockResolvedValue(mockAppointments);
const mockEncounterList = vi.fn().mockResolvedValue(mockEncounters);
const mockBillingList = vi.fn().mockResolvedValue(mockBillingRecords);
const mockQuoteList = vi.fn().mockResolvedValue(mockQuotes);
const mockPreventiveList = vi.fn().mockResolvedValue(mockPreventiveEvents);
const mockLaboratoryListOrders = vi.fn().mockResolvedValue(mockLaboratoryOrders);
const mockQuoteCreate = vi.fn().mockResolvedValue({
  ...mockQuotes[0],
  id: 'quote-2',
  number: 'Q-002'
});

vi.mock('@/services/owner', () => ({
  ownerService: {
    getById: (...args: unknown[]) => mockGetOwnerById(...args)
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    list: (...args: unknown[]) => mockPatientList(...args)
  }
}));

vi.mock('@/services/appointment', () => ({
  appointmentService: {
    list: () => mockAppointmentList()
  }
}));

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: () => mockEncounterList()
  }
}));

vi.mock('@/services/billing', () => ({
  billingService: {
    list: () => mockBillingList()
  }
}));

vi.mock('@/services/quotes', () => ({
  quoteService: {
    list: () => mockQuoteList(),
    create: (...args: unknown[]) => mockQuoteCreate(...args)
  }
}));

vi.mock('@/services/vaccinesDewormers', () => ({
  vaccinesDewormersService: {
    list: (...args: unknown[]) => mockPreventiveList(...args)
  },
  preventiveItemTypeLabel: (itemType: string) =>
    ({ vaccine: 'Vacina', dewormer: 'Vermífugo', other: 'Outro' })[itemType] ?? itemType
}));

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listOrders: (...args: unknown[]) => mockLaboratoryListOrders(...args)
  }
}));

vi.mock('vue-router', () => ({
  RouterLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to']
  },
  useRoute: () => ({
    params: { id: 'owner-1' }
  })
}));

describe('OwnerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOwnerById.mockResolvedValue(mockOwner);
    mockPatientList.mockResolvedValue(mockPatients);
    mockAppointmentList.mockResolvedValue(mockAppointments);
    mockEncounterList.mockResolvedValue(mockEncounters);
    mockBillingList.mockResolvedValue(mockBillingRecords);
    mockQuoteList.mockResolvedValue(mockQuotes);
    mockPreventiveList.mockResolvedValue(mockPreventiveEvents);
    mockLaboratoryListOrders.mockResolvedValue(mockLaboratoryOrders);
    mockQuoteCreate.mockResolvedValue({
      ...mockQuotes[0],
      id: 'quote-2',
      number: 'Q-002'
    });
  });

  it('renders owner context and linked patient actions', async () => {
    const OwnerDetailPage = (await import('../OwnerDetailPage.vue')).default;
    const wrapper = mount(OwnerDetailPage, {
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

    const normalizedText = wrapper.text().replace(/\u00a0/g, ' ');

    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).toContain('Atendimento > Cadastros');
    expect(wrapper.text()).toContain('Cadastrar Novo Animal');
    expect(wrapper.text()).toContain('Animais Cadastrados');
    expect(wrapper.text()).toContain('Documento ausente');
    expect(wrapper.text()).toContain('3835');
    expect(wrapper.text()).toContain('VIP');
    expect(wrapper.text()).toContain('Recebe SMS?');
    expect(wrapper.text()).toContain('Rua Vetus');
    expect(wrapper.text()).toContain('3550308');
    expect(wrapper.text()).toContain('35,50');
    expect(wrapper.text()).toContain('120');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Agenda vinculada');
    expect(wrapper.text()).toContain('Cockpit 360 tutor/paciente');
    expect(wrapper.text()).toContain('Jornada assistencial');
    expect(wrapper.text()).toContain('1/1 paciente(s) ativo(s) · 1 atendimento(s)');
    expect(wrapper.text()).toContain('1 preventivo(s)');
    expect(wrapper.text()).toContain('1 exame(s)');
    expect(normalizedText).toContain('R$ 420,00 em aberto');
    expect(wrapper.text()).toContain('Atenção clínica');
    expect(wrapper.text()).toContain('Vacina');
    expect(wrapper.text()).toContain('Retorno · in_care');
    expect(wrapper.text()).toContain('2 alerta(s) no cadastro');
    expect(wrapper.text()).toContain('Prevenção');
    expect(wrapper.text()).toContain('V10 anual');
    expect(wrapper.text()).toContain('Laboratório');
    expect(wrapper.text()).toContain('1 exame(s) pendente(s)');
    expect(wrapper.text()).toContain('Acompanhar exames pendentes');
    expect(wrapper.text()).toContain('Timeline 360 do tutor');
    expect(wrapper.text()).toContain('Agenda · Rex');
    expect(wrapper.text()).toContain('Atendimento · Rex');
    expect(wrapper.text()).toContain('Financeiro · Rex');
    expect(wrapper.text()).toContain('Laboratório · Rex');
    expect(wrapper.text()).toContain('Preventivo · Rex');
    expect(wrapper.text()).toContain('Mensagem · Rex');
    expect(wrapper.text()).toContain('Lembrete de agenda');
    expect(mockPreventiveList).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      includeExecuted: true
    });
    expect(mockLaboratoryListOrders).toHaveBeenCalled();
    expect(
      wrapper
        .findAll('a')
        .some((link) => link.attributes('href') === '/patients/pat-1' && link.text().includes('Abrir cockpit do paciente'))
    ).toBe(true);
    expect(
      wrapper
        .findAll('a')
        .some((link) => link.attributes('href') === '/laboratory/orders' && link.text().includes('Acompanhar exames pendentes'))
    ).toBe(true);
    expect(wrapper.text()).toContain('CRM financeiro');
    expect(wrapper.text()).toContain('Resgate de Pontos');
    expect(wrapper.text()).toContain('Live Animal e Live Lab');
    expect(wrapper.text()).toContain('Comandas e Vendas');
    expect(wrapper.text()).toContain('Orçamentos');
    expect(wrapper.text()).toContain('Situação Financeira');
    expect(wrapper.text()).toContain('Pacotes sugeridos');
    expect(wrapper.text()).toContain('Mensageria contextual');
  });

  it('shows error state when loading fails', async () => {
    mockGetOwnerById.mockRejectedValue(new Error('Falha ao carregar tutor'));

    const OwnerDetailPage = (await import('../OwnerDetailPage.vue')).default;
    const wrapper = mount(OwnerDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Falha ao carregar tutor');
  });
});

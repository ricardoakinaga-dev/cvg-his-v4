import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockOwner = {
  id: 'owner-1',
  accountId: 'acc-1',
  fullName: 'João Silva',
  documentId: '',
  contacts: [{ label: 'WhatsApp', type: 'whatsapp' as const, value: '(11) 99999-1111', primary: true }],
  financialResponsible: true,
  administrativeNotes: 'Cobrar autorização prévia',
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

const mockGetOwnerById = vi.fn().mockResolvedValue(mockOwner);
const mockPatientList = vi.fn().mockResolvedValue(mockPatients);
const mockAppointmentList = vi.fn().mockResolvedValue(mockAppointments);
const mockEncounterList = vi.fn().mockResolvedValue(mockEncounters);
const mockBillingList = vi.fn().mockResolvedValue(mockBillingRecords);
const mockQuoteList = vi.fn().mockResolvedValue(mockQuotes);
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

vi.mock('vue-router', () => ({
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

    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).toContain('Atendimento > Cadastros');
    expect(wrapper.text()).toContain('Cadastrar Novo Animal');
    expect(wrapper.text()).toContain('Animais Cadastrados');
    expect(wrapper.text()).toContain('Documento ausente');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Agenda vinculada');
    expect(wrapper.text()).toContain('CRM financeiro');
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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockOwner = {
  id: 'owner-1',
  accountId: 'acc-1',
  fullName: 'João Silva',
  documentId: '123.456.789-00',
  contacts: [
    { label: 'WhatsApp', type: 'whatsapp' as const, value: '(11) 99999-1111', primary: true }
  ],
  financialResponsible: true,
  administrativeNotes: 'Cliente premium',
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z'
};

const mockPatient = {
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
};

const mockEncounters = [
  {
    id: 'enc-1',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    visitType: 'scheduled' as const,
    origin: 'schedule' as const,
    reason: 'Revisão ortopédica',
    status: 'in_care' as const,
    openedAt: '2024-01-03T09:00:00Z',
    createdByUserId: 'usr-1',
    createdAt: '2024-01-03T09:00:00Z',
    updatedAt: '2024-01-03T09:30:00Z'
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
    reason: 'Vacina anual',
    status: 'scheduled' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockMedicalRecords = [
  {
    record: {
      id: 'mr-1',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      status: 'open' as const,
      createdAt: '2024-01-03T09:00:00Z',
      updatedAt: '2024-01-03T09:40:00Z'
    },
    entryCount: 2
  }
];

const mockMedicalRecordEntries = [
  {
    id: 'entry-1',
    accountId: 'acc-1',
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    entryType: 'prescription' as const,
    title: 'Anti-inflamatório',
    content: 'Administrar por 5 dias',
    authoredByUserId: 'usr-1',
    version: 1,
    createdAt: '2024-01-03T09:10:00Z',
    updatedAt: '2024-01-03T09:10:00Z'
  },
  {
    id: 'entry-2',
    accountId: 'acc-1',
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    entryType: 'assessment' as const,
    title: 'Radiografia solicitada',
    content: 'Avaliar lesão em membro anterior',
    authoredByUserId: 'usr-1',
    version: 1,
    createdAt: '2024-01-03T09:20:00Z',
    updatedAt: '2024-01-03T09:20:00Z'
  }
];

const mockEncounterTimeline = [
  {
    id: 'evt-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    eventType: 'queue_called' as const,
    summary: 'Paciente chamado para o consultório',
    actorUserId: 'usr-1',
    occurredAt: '2024-01-03T09:05:00Z'
  }
];

const mockClinicalTimeline = [
  {
    id: 'clin-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    medicalRecordId: 'mr-1',
    eventType: 'entry_added' as const,
    summary: 'Prescrição adicionada',
    actorUserId: 'usr-1',
    occurredAt: '2024-01-03T09:10:00Z'
  }
];

const mockTriageRecords = [
  {
    id: 'tri-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    priority: 'high' as const,
    chiefComplaint: 'Claudicação em membro anterior',
    initialNotes: 'Chegou mancando desde ontem',
    alerts: ['Alergia a dipirona'],
    destination: 'in_care' as const,
    triagedByUserId: 'usr-2',
    createdAt: '2024-01-03T09:02:00Z',
    updatedAt: '2024-01-03T09:02:00Z'
  }
];

const mockInpatientStays = [
  {
    id: 'stay-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    unit: 'Internação',
    ward: 'UTI',
    bed: 'B-02',
    status: 'admitted' as const,
    admittedAt: '2024-01-03T09:45:00Z',
    updatedAt: '2024-01-03T09:45:00Z'
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
    subtotalAmount: 240.5,
    currency: 'BRL',
    administrativeNotes: 'Aguardando validação da recepção',
    createdAt: '2024-01-03T09:15:00Z',
    updatedAt: '2024-01-03T09:30:00Z'
  }
];

const mockQuotes = [
  {
    id: 'quote-1',
    accountId: 'acc-1',
    number: 'Q-100',
    ownerId: 'owner-1',
    status: 'draft' as const,
    validUntil: null,
    subtotal: 360,
    discountAmount: 0,
    total: 360,
    notes: 'Pacote preventivo',
    createdByUserId: 'usr-1',
    convertedToSaleId: null,
    convertedAt: null,
    createdAt: '2024-01-03T09:00:00Z',
    updatedAt: '2024-01-03T09:10:00Z'
  }
];

const mockGetPatientById = vi.fn().mockResolvedValue(mockPatient);
const mockGetOwnerById = vi.fn().mockResolvedValue(mockOwner);
const mockEncounterList = vi.fn().mockResolvedValue(mockEncounters);
const mockEncounterTimelineList = vi.fn().mockResolvedValue(mockEncounterTimeline);
const mockAppointmentList = vi.fn().mockResolvedValue(mockAppointments);
const mockMedicalRecordsList = vi.fn().mockResolvedValue(mockMedicalRecords);
const mockMedicalRecordEntriesList = vi.fn().mockResolvedValue(mockMedicalRecordEntries);
const mockMedicalRecordTimelineList = vi.fn().mockResolvedValue(mockClinicalTimeline);
const mockTriageList = vi.fn().mockResolvedValue(mockTriageRecords);
const mockInpatientList = vi.fn().mockResolvedValue(mockInpatientStays);
const mockBillingList = vi.fn().mockResolvedValue(mockBillingRecords);
const mockQuoteList = vi.fn().mockResolvedValue(mockQuotes);
const mockQuoteCreate = vi.fn().mockResolvedValue({
  ...mockQuotes[0],
  id: 'quote-2',
  number: 'Q-101'
});
const mockGetOwnerName = vi.fn().mockResolvedValue('João Silva');

vi.mock('@/services/patient', () => ({
  patientService: {
    getById: (...args: unknown[]) => mockGetPatientById(...args)
  }
}));

vi.mock('@/services/owner', () => ({
  ownerService: {
    getById: (...args: unknown[]) => mockGetOwnerById(...args)
  }
}));

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: () => mockEncounterList(),
    getTimeline: (...args: unknown[]) => mockEncounterTimelineList(...args)
  }
}));

vi.mock('@/services/appointment', () => ({
  appointmentService: {
    list: () => mockAppointmentList()
  }
}));

vi.mock('@/services/medicalRecords', () => ({
  medicalRecordsService: {
    listAll: () => mockMedicalRecordsList(),
    listEntries: (...args: unknown[]) => mockMedicalRecordEntriesList(...args),
    getTimeline: (...args: unknown[]) => mockMedicalRecordTimelineList(...args)
  }
}));

vi.mock('@/services/triage', () => ({
  listTriageRecords: (...args: unknown[]) => mockTriageList(...args)
}));

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    list: (...args: unknown[]) => mockInpatientList(...args)
  }
}));

vi.mock('@/services/billing', () => ({
  billingService: {
    list: (...args: unknown[]) => mockBillingList(...args)
  }
}));

vi.mock('@/services/quotes', () => ({
  quoteService: {
    list: (...args: unknown[]) => mockQuoteList(...args),
    create: (...args: unknown[]) => mockQuoteCreate(...args)
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getOwnerName: (...args: unknown[]) => mockGetOwnerName(...args)
  })
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'pat-1' }
  })
}));

describe('PatientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPatientById.mockResolvedValue(mockPatient);
    mockGetOwnerById.mockResolvedValue(mockOwner);
    mockEncounterList.mockResolvedValue(mockEncounters);
    mockEncounterTimelineList.mockResolvedValue(mockEncounterTimeline);
    mockAppointmentList.mockResolvedValue(mockAppointments);
    mockMedicalRecordsList.mockResolvedValue(mockMedicalRecords);
    mockMedicalRecordEntriesList.mockResolvedValue(mockMedicalRecordEntries);
    mockMedicalRecordTimelineList.mockResolvedValue(mockClinicalTimeline);
    mockTriageList.mockResolvedValue(mockTriageRecords);
    mockInpatientList.mockResolvedValue(mockInpatientStays);
    mockBillingList.mockResolvedValue(mockBillingRecords);
    mockQuoteList.mockResolvedValue(mockQuotes);
    mockQuoteCreate.mockResolvedValue({
      ...mockQuotes[0],
      id: 'quote-2',
      number: 'Q-101'
    });
    mockGetOwnerName.mockResolvedValue('João Silva');
  });

  it('renders the patient cockpit with operational and clinical context', async () => {
    const PatientDetailPage = (await import('../PatientDetailPage.vue')).default;
    const wrapper = mount(PatientDetailPage, {
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

    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Atendimento > Cadastrados');
    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).toContain('Cockpit operacional atual');
    expect(wrapper.text()).toContain('Prontuário do atendimento atual');
    expect(wrapper.text()).toContain('Agendar retorno');
    expect(wrapper.text()).toContain('Claudicação em membro anterior');
    expect(wrapper.text()).toContain('UTI / B-02');
    expect(wrapper.text()).toContain('Prescrição adicionada');
    expect(wrapper.text()).toContain('Snapshot CRM do tutor');
    expect(wrapper.text()).toContain('Pacote ativo sugerido');
    expect(wrapper.text()).toContain('Mensagens contextuais por animal');

    const newEncounterLink = wrapper
      .findAll('a')
      .find((link) => link.text().includes('Novo Atendimento'));
    expect(newEncounterLink?.attributes('href')).toBe('/encounters/new?patientId=pat-1&ownerId=owner-1');
  });

  it('shows error state when loading fails', async () => {
    mockGetPatientById.mockRejectedValue(new Error('Falha ao carregar paciente'));

    const PatientDetailPage = (await import('../PatientDetailPage.vue')).default;
    const wrapper = mount(PatientDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Falha ao carregar paciente');
  });
});

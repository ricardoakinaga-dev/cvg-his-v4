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
  isNeutered: true,
  microchip: '985141000000001',
  pedigreeNumber: 'PED-123',
  color: 'Dourado',
  chronicDisease: 'Doenca renal cronica',
  allergy: 'Dipirona',
  temperament: 'Docil',
  generalNotes: 'Paciente usa coleira vermelha.',
  legacyVetusId: '9621',
  originalCreatedAt: '2024-05-03',
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
  },
  {
    id: 'apt-2',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    scheduledAt: '2024-01-02T11:00:00Z',
    visitType: 'return' as const,
    reason: 'Retorno ortopédico',
    status: 'completed' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T12:00:00Z'
  },
  {
    id: 'apt-3',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    scheduledAt: '2024-01-04T14:00:00Z',
    visitType: 'scheduled' as const,
    reason: 'Consulta cancelada',
    status: 'cancelled' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-04T12:00:00Z'
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
    id: 'entry-0',
    accountId: 'acc-1',
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    entryType: 'anamnesis' as const,
    title: 'Anamnese ortopédica',
    content: 'Tutor relata claudicação após passeio.',
    authoredByUserId: 'usr-1',
    version: 1,
    createdAt: '2024-01-03T09:06:00Z',
    updatedAt: '2024-01-03T09:06:00Z'
  },
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
  },
  {
    id: 'entry-3',
    accountId: 'acc-1',
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    entryType: 'progress_note' as const,
    title: 'Histórico clínico longitudinal',
    content: 'Paciente com histórico ortopédico recorrente.',
    authoredByUserId: 'usr-1',
    version: 1,
    createdAt: '2024-01-03T09:30:00Z',
    updatedAt: '2024-01-03T09:30:00Z'
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

const mockDiagnosticOrders = [
  {
    id: 'diag-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Radiografia',
    reason: 'Avaliar membro anterior',
    status: 'resulted' as const,
    resultSummary: 'Sem fratura aparente',
    resultAttachmentId: 'att-3',
    createdAt: '2024-01-03T09:21:00Z',
    updatedAt: '2024-01-03T09:27:00Z'
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
const mockGetPatientSummary = vi.fn().mockResolvedValue({
  patient: mockPatient,
  owner: {
    id: mockOwner.id,
    fullName: mockOwner.fullName,
    phoneMain: '(11) 99999-1111',
    email: null
  },
  stats: {
    totalEncounters: 1,
    openEncounters: 1
  },
  recentEncounters: [{ id: 'enc-1', openedAt: '2024-01-03T09:00:00Z', status: 'open' as const }]
});
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
const mockLaboratoryListOrders = vi.fn().mockResolvedValue(mockDiagnosticOrders);
const mockQuoteList = vi.fn().mockResolvedValue(mockQuotes);
const mockQuoteCreate = vi.fn().mockResolvedValue({
  ...mockQuotes[0],
  id: 'quote-2',
  number: 'Q-101'
});
const mockPrescriptionListByPatient = vi.fn().mockResolvedValue([
  {
    ...mockMedicalRecordEntries[1],
    medicationName: 'Anti-inflamatório',
    dosage: '1 comprimido',
    frequency: '12/12h'
  }
]);
const mockRecordAttachments = [
  {
    id: 'att-1',
    accountId: 'acc-1',
    linkedEntityType: 'medical_record',
    linkedEntityId: 'mr-1',
    category: 'image',
    fileName: 'lesao-pata.png',
    storageKey: 'local/lesao-pata.png',
    mimeType: 'image/png',
    checksum: 'sha256:image',
    source: 'upload',
    uploadedByUserId: 'usr-1',
    createdAt: '2024-01-03T09:25:00Z'
  },
  {
    id: 'att-2',
    accountId: 'acc-1',
    linkedEntityType: 'medical_record',
    linkedEntityId: 'mr-1',
    category: 'lab',
    fileName: 'hemograma.pdf',
    storageKey: 'local/hemograma.pdf',
    mimeType: 'application/pdf',
    checksum: 'sha256:lab',
    source: 'upload',
    uploadedByUserId: 'usr-1',
    createdAt: '2024-01-03T09:26:00Z'
  }
];
const mockDiagnosticAttachments = [
  {
    id: 'att-3',
    accountId: 'acc-1',
    linkedEntityType: 'diagnostic_order',
    linkedEntityId: 'diag-1',
    category: 'lab',
    fileName: 'radiografia-laudo.pdf',
    storageKey: 'local/radiografia-laudo.pdf',
    mimeType: 'application/pdf',
    checksum: 'sha256:diag',
    source: 'upload',
    uploadedByUserId: 'usr-1',
    createdAt: '2024-01-03T09:27:00Z'
  }
];
const mockAttachmentList = vi.fn().mockImplementation((linkedEntityType: string) =>
  Promise.resolve(linkedEntityType === 'diagnostic_order' ? mockDiagnosticAttachments : mockRecordAttachments)
);
const mockGetOwnerName = vi.fn().mockResolvedValue('João Silva');

vi.mock('@/services/patient', () => ({
  patientService: {
    getById: (...args: unknown[]) => mockGetPatientById(...args),
    getSummary: (...args: unknown[]) => mockGetPatientSummary(...args)
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
    list: (...args: unknown[]) => mockAppointmentList(...args)
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

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listOrders: (...args: unknown[]) => mockLaboratoryListOrders(...args)
  }
}));

vi.mock('@/services/quotes', () => ({
  quoteService: {
    list: (...args: unknown[]) => mockQuoteList(...args),
    create: (...args: unknown[]) => mockQuoteCreate(...args)
  }
}));

vi.mock('@/services/prescriptions', () => ({
  prescriptionsService: {
    listByPatient: (...args: unknown[]) => mockPrescriptionListByPatient(...args)
  }
}));

vi.mock('@/services/attachments', () => ({
  attachmentService: {
    list: (...args: unknown[]) => mockAttachmentList(...args)
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getOwnerName: (...args: unknown[]) => mockGetOwnerName(...args)
  })
}));

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>'
  },
  useRoute: () => ({
    params: { id: 'pat-1' }
  })
}));

describe('PatientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPatientById.mockResolvedValue(mockPatient);
    mockGetPatientSummary.mockResolvedValue({
      patient: mockPatient,
      owner: {
        id: mockOwner.id,
        fullName: mockOwner.fullName,
        phoneMain: '(11) 99999-1111',
        email: null
      },
      stats: {
        totalEncounters: 1,
        openEncounters: 1
      },
      recentEncounters: [
        { id: 'enc-1', openedAt: '2024-01-03T09:00:00Z', status: 'open' as const }
      ]
    });
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
    mockLaboratoryListOrders.mockResolvedValue(mockDiagnosticOrders);
    mockQuoteList.mockResolvedValue(mockQuotes);
    mockQuoteCreate.mockResolvedValue({
      ...mockQuotes[0],
      id: 'quote-2',
      number: 'Q-101'
    });
    mockPrescriptionListByPatient.mockResolvedValue([
      {
        ...mockMedicalRecordEntries[1],
        medicationName: 'Anti-inflamatório',
        dosage: '1 comprimido',
        frequency: '12/12h'
      }
    ]);
    mockAttachmentList.mockImplementation((linkedEntityType: string) =>
      Promise.resolve(linkedEntityType === 'diagnostic_order' ? mockDiagnosticAttachments : mockRecordAttachments)
    );
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
    expect(wrapper.text()).toContain('Detalhes do Animal');
    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).toContain('Abrir cobrança do atendimento');
    expect(wrapper.find('a[href="/billing/enc-1"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Ver cadastro do cliente');
    expect(wrapper.text()).toContain('Editar Cadastro');
    expect(wrapper.text()).toContain('Doença Crônica');
    expect(wrapper.text()).toContain('Doenca renal cronica');
    expect(wrapper.text()).toContain('Dipirona');
    expect(wrapper.text()).toContain('Docil');
    expect(wrapper.text()).toContain('Paciente usa coleira vermelha.');
    expect(wrapper.text()).toContain('Ver mais Informações do Animal');
    expect(wrapper.text()).toContain('Ver Informações de Contato');
    expect(wrapper.text()).toContain('Anamneses');
    expect(wrapper.text()).toContain('Adicionar anamnese');
    expect(wrapper.text()).toContain('Abrir prontuário');
    expect(wrapper.text()).toContain('Vacinas e Vermífugos');
    expect(wrapper.text()).toContain('Agenda');
    expect(wrapper.text()).toContain('Exames');
    expect(wrapper.text()).toContain('Internação');
    expect(wrapper.text()).toContain('Receituário');
    expect(wrapper.text()).toContain('Gráfico de peso');
    expect(wrapper.text()).toContain('Imagens');
    expect(wrapper.text()).toContain('Histórico Clinico');
    expect(wrapper.text()).toContain('Anti-inflamatório');
    expect(wrapper.text()).toContain('lesao-pata.png');
    expect(wrapper.text()).toContain('Paciente com histórico ortopédico recorrente.');
    expect(wrapper.text()).toContain('Radiografia');
    expect(wrapper.text()).toContain('Resultado');
    expect(wrapper.text()).not.toContain('Tutor relata claudicação após passeio.');
    expect(wrapper.text()).toContain('1 próximo(s) · 1 histórico · 1 cancelado(s)');
    expect(wrapper.text()).toContain('Próximo: Vacina anual');

    const expandCard = async (label: string) => {
      const trigger = wrapper
        .findAll('button')
        .find((button) => button.text().includes(label));
      await trigger!.trigger('click');
      await flushPromises();
    };

    await expandCard('Anamneses');
    expect(wrapper.text()).toContain('Tutor relata claudicação após passeio.');

    await expandCard('Agenda');
    expect(wrapper.text()).toContain('Próximos');
    expect(wrapper.text()).toContain('Vacina anual');
    expect(wrapper.text()).toContain('Histórico');
    expect(wrapper.text()).toContain('Retorno ortopédico');
    expect(wrapper.text()).toContain('Cancelados / não compareceu');
    expect(wrapper.text()).toContain('Consulta cancelada');
    expect(wrapper.find('a[href="/appointments/apt-2"]').exists()).toBe(true);

    await expandCard('Exames');
    expect(wrapper.text()).toContain('hemograma.pdf');
    expect(wrapper.text()).toContain('radiografia-laudo.pdf');

    await expandCard('Receituário');
    expect(wrapper.text()).toContain('Anti-inflamatório');

    await expandCard('Imagens');
    expect(wrapper.text()).toContain('lesao-pata.png');

    expect(mockMedicalRecordEntriesList).toHaveBeenCalledWith('enc-1');
    expect(mockAppointmentList).toHaveBeenCalledWith({ patientId: 'pat-1' });
    expect(mockPrescriptionListByPatient).toHaveBeenCalledWith('pat-1');
    expect(mockLaboratoryListOrders).toHaveBeenCalledWith({ patientId: 'pat-1' });
    expect(mockAttachmentList).toHaveBeenCalledWith('medical_record', 'mr-1');
    expect(mockAttachmentList).toHaveBeenCalledWith('diagnostic_order', 'diag-1');

    const ownerLink = wrapper
      .findAll('a')
      .find((link) => link.text().includes('Ver cadastro do cliente'));
    expect(ownerLink?.attributes('href')).toBe('/owners/owner-1');

    const anamnesisLink = wrapper
      .findAll('a')
      .find((link) => link.text().includes('Adicionar anamnese'));
    expect(anamnesisLink?.attributes('href')).toBe('/medical-records/enc-1?entry=anamnesis');

    const medicalRecordLink = wrapper
      .findAll('a')
      .find((link) => link.text().includes('Abrir prontuário'));
    expect(medicalRecordLink?.attributes('href')).toBe('/medical-records/enc-1');
  });

  it('shows error state when loading fails', async () => {
    mockGetPatientById.mockRejectedValue(new Error('Falha ao carregar paciente'));

    const PatientDetailPage = (await import('../PatientDetailPage.vue')).default;
    const wrapper = mount(PatientDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Falha ao carregar paciente');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';

const mockRecord = {
  id: 'mr-1',
  encounterId: 'enc-1',
  patientId: 'pat-1',
  status: 'open' as const,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z'
};

const mockEntries = [
  {
    id: 'entry-1',
    accountId: 'acc-1',
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    entryType: 'progress_note' as const,
    title: 'Evolucao do dia',
    content: 'Paciente apresentou melhora',
    version: 1,
    authoredByUserId: 'user-1',
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
    deletedAt: null as string | null,
    deleteReason: null as string | null
  },
  {
    id: 'entry-2',
    accountId: 'acc-1',
    medicalRecordId: 'mr-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    entryType: 'physical_exam' as const,
    title: 'Exame fisico inicial',
    content: 'Temperatura elevada',
    version: 1,
    authoredByUserId: 'user-1',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    deletedAt: null as string | null,
    deleteReason: null as string | null
  }
];

const mockTimeline = [
  {
    id: 'evt-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    eventType: 'record_created' as const,
    summary: 'Prontuario criado',
    actorUserId: 'user-1',
    occurredAt: '2024-01-15T10:00:00Z'
  }
];

type MockCreatePayload = Pick<
  (typeof mockEntries)[number],
  'encounterId' | 'patientId' | 'entryType' | 'title' | 'content'
>;

let persistedEntries: typeof mockEntries = [...mockEntries];
let createdEntrySequence = 0;

function persistMockEntry(payload: MockCreatePayload) {
  const entry = {
    ...mockEntries[0],
    id: `created-entry-${++createdEntrySequence}`,
    medicalRecordId: 'mr-1',
    ...payload,
    createdAt: '2024-01-15T12:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z'
  };
  persistedEntries = [...persistedEntries, entry];
  return entry;
}

const mockMedicalRecordAttachments = [
  {
    id: 'attachment-record-1',
    accountId: 'acc-1',
    linkedEntityType: 'medical_record' as const,
    linkedEntityId: 'mr-1',
    category: 'image' as const,
    fileName: 'radiografia-lateral.jpg',
    storageKey: 'attachments/radiografia-lateral.jpg',
    mimeType: 'image/jpeg',
    checksum: 'checksum-record-1',
    sizeBytes: 4096,
    source: 'upload' as const,
    scanStatus: 'available' as const,
    uploadedByUserId: 'user-1',
    createdAt: '2024-01-15T12:00:00Z'
  }
];

const mockEncounterAttachments = [
  {
    id: 'attachment-encounter-1',
    accountId: 'acc-1',
    linkedEntityType: 'encounter' as const,
    linkedEntityId: 'enc-1',
    category: 'document' as const,
    fileName: 'laudo-dermatologico.pdf',
    storageKey: 'attachments/laudo-dermatologico.pdf',
    mimeType: 'application/pdf',
    checksum: 'checksum-encounter-1',
    sizeBytes: 8192,
    source: 'upload' as const,
    scanStatus: 'available' as const,
    uploadedByUserId: 'user-1',
    createdAt: '2024-01-15T13:00:00Z'
  }
];

let mockRouteId = 'enc-1';
let mockRouteQuery: Record<string, unknown> = {};
const mockRoute = reactive({
  params: { id: 'enc-1' },
  path: '/medical-records/enc-1',
  query: {} as Record<string, unknown>
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const mockGetByEncounterFn = vi
  .fn()
  .mockResolvedValue({ record: mockRecord, entries: mockEntries });
const mockListAllFn = vi
  .fn()
  .mockResolvedValue([{ record: mockRecord, entryCount: mockEntries.length }]);
const mockListEntriesFn = vi.fn().mockResolvedValue(mockEntries);
const mockGetTimelineFn = vi.fn().mockResolvedValue(mockTimeline);
const mockCreateEntryFn = vi.fn().mockResolvedValue({});
const mockUpdateEntryFn = vi.fn().mockResolvedValue({});
const mockArchiveEntryFn = vi.fn().mockResolvedValue({});
const mockGetPatientName = vi.fn().mockResolvedValue('Rex');
const mockGetOwnerName = vi.fn().mockResolvedValue('Ana Tutor');
const mockEncounterGetById = vi.fn().mockResolvedValue({
  id: 'enc-1',
  accountId: 'acc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  visitType: 'walk_in',
  status: 'in_care',
  origin: 'reception',
  reason: 'Consulta dermatológica',
  openedAt: '2024-01-15T10:00:00Z',
  createdByUserId: 'user-1',
  updatedAt: '2024-01-15T10:00:00Z'
});
const mockPatientGetById = vi.fn().mockResolvedValue({
  id: 'pat-1',
  accountId: 'acc-1',
  name: 'Rex',
  species: 'Canina',
  breed: 'SRD',
  sex: 'male',
  baseWeightKg: 12,
  primaryOwnerId: 'owner-1',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
});
const mockOwnerGetById = vi.fn().mockResolvedValue({
  id: 'owner-1',
  accountId: 'acc-1',
  fullName: 'Ana Tutor',
  documentId: '000.000.000-00',
  contacts: [{ label: 'Celular', value: '11999999999', type: 'phone', primary: true }],
  financialResponsible: true,
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
});
const mockBillingGetByEncounter = vi.fn().mockResolvedValue({
  id: 'bill-1',
  accountId: 'acc-1',
  encounterId: 'enc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  status: 'open',
  subtotalAmount: 180,
  currency: 'BRL',
  createdAt: '2024-01-15T10:05:00Z',
  updatedAt: '2024-01-15T10:05:00Z'
});
const mockBillingListItems = vi.fn().mockResolvedValue([
  {
    id: 'bill-item-1',
    billingRecordId: 'bill-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    itemType: 'service',
    description: 'Consulta',
    quantity: 1,
    unitPriceAmount: 180,
    totalAmount: 180,
    createdByUserId: 'user-1',
    createdAt: '2024-01-15T10:10:00Z'
  }
]);
const mockDiagnosticsListByEncounter = vi.fn().mockResolvedValue([]);
const mockDiagnosticsListAttachments = vi.fn().mockResolvedValue([]);
const mockAttachmentListFn = vi.fn().mockResolvedValue([]);
const mockApiRequestFn = vi.fn();
const mockPrescriptionsListByPatient = vi.fn().mockResolvedValue([]);
const mockOnBeforeRouteLeave = vi.fn();
const mockOnBeforeRouteUpdate = vi.fn();

vi.mock('@/services/medicalRecords', () => ({
  medicalRecordsService: {
    get getByEncounter() {
      return mockGetByEncounterFn;
    },
    get listAll() {
      return mockListAllFn;
    },
    get listEntries() {
      return mockListEntriesFn;
    },
    get getTimeline() {
      return mockGetTimelineFn;
    },
    get createEntry() {
      return mockCreateEntryFn;
    },
    get updateEntry() {
      return mockUpdateEntryFn;
    },
    get archiveEntry() {
      return mockArchiveEntryFn;
    }
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: mockGetPatientName,
    getOwnerName: mockGetOwnerName,
    getUserName: vi.fn().mockResolvedValue(''),
    preloadUserNames: vi.fn().mockResolvedValue(undefined),
    loading: new Set()
  })
}));

vi.mock('@/services/encounter', () => ({
  encounterService: {
    getById: mockEncounterGetById
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    getById: mockPatientGetById
  }
}));

vi.mock('@/services/owner', () => ({
  ownerService: {
    getById: mockOwnerGetById
  }
}));

vi.mock('@/services/billing', () => ({
  billingService: {
    getByEncounter: mockBillingGetByEncounter,
    listItems: mockBillingListItems
  }
}));

vi.mock('@/services/diagnostics', () => ({
  diagnosticsService: {
    listByEncounter: mockDiagnosticsListByEncounter,
    listAttachments: mockDiagnosticsListAttachments
  }
}));

vi.mock('@/services/attachments', () => ({
  attachmentService: {
    list: mockAttachmentListFn
  }
}));

vi.mock('@/services/api', () => ({
  apiRequest: mockApiRequestFn
}));

vi.mock('@/services/prescriptions', () => ({
  prescriptionsService: {
    listByPatient: mockPrescriptionsListByPatient
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({
    push: vi.fn()
  }),
  onBeforeRouteLeave: (...args: unknown[]) => mockOnBeforeRouteLeave(...args),
  onBeforeRouteUpdate: (...args: unknown[]) => mockOnBeforeRouteUpdate(...args)
}));

describe('MedicalRecordsDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouteId = 'enc-1';
    mockRouteQuery = {};
    mockRoute.params.id = 'enc-1';
    mockRoute.path = '/medical-records/enc-1';
    mockRoute.query = {};
    persistedEntries = [...mockEntries];
    createdEntrySequence = 0;
    mockGetByEncounterFn.mockImplementation(() =>
      Promise.resolve({ record: mockRecord, entries: persistedEntries })
    );
    mockListAllFn.mockResolvedValue([{ record: mockRecord, entryCount: mockEntries.length }]);
    mockListEntriesFn.mockImplementation(() => Promise.resolve(persistedEntries));
    mockGetTimelineFn.mockResolvedValue(mockTimeline);
    mockCreateEntryFn.mockImplementation((payload: MockCreatePayload) =>
      Promise.resolve(persistMockEntry(payload))
    );
    mockUpdateEntryFn.mockImplementation((_entryId: string, payload: Record<string, unknown>) =>
      Promise.resolve({ ...mockEntries[0], ...payload, id: 'entry-1' })
    );
    mockArchiveEntryFn.mockImplementation((entryId: string, payload: { reason?: string }) => {
      const archived = {
        ...mockEntries.find((entry) => entry.id === entryId) ?? mockEntries[0],
        id: entryId,
        version: 2,
        deletedAt: '2024-01-15T14:00:00Z',
        deleteReason: payload.reason ?? 'Arquivado',
        updatedAt: '2024-01-15T14:00:00Z'
      };
      persistedEntries = persistedEntries.map((entry) =>
        entry.id === entryId ? archived : entry
      );
      return Promise.resolve(archived);
    });
    mockGetPatientName.mockResolvedValue('Rex');
    mockGetOwnerName.mockResolvedValue('Ana Tutor');
    mockEncounterGetById.mockResolvedValue({
      id: 'enc-1',
      accountId: 'acc-1',
      patientId: 'pat-1',
      ownerId: 'owner-1',
      visitType: 'walk_in',
      status: 'in_care',
      origin: 'reception',
      reason: 'Consulta dermatológica',
      openedAt: '2024-01-15T10:00:00Z',
      createdByUserId: 'user-1',
      updatedAt: '2024-01-15T10:00:00Z'
    });
    mockPatientGetById.mockResolvedValue({
      id: 'pat-1',
      accountId: 'acc-1',
      name: 'Rex',
      species: 'Canina',
      breed: 'SRD',
      sex: 'male',
      baseWeightKg: 12,
      primaryOwnerId: 'owner-1',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });
    mockOwnerGetById.mockResolvedValue({
      id: 'owner-1',
      accountId: 'acc-1',
      fullName: 'Ana Tutor',
      documentId: '000.000.000-00',
      contacts: [{ label: 'Celular', value: '11999999999', type: 'phone', primary: true }],
      financialResponsible: true,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });
    mockBillingGetByEncounter.mockResolvedValue({
      id: 'bill-1',
      accountId: 'acc-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      ownerId: 'owner-1',
      status: 'open',
      subtotalAmount: 180,
      currency: 'BRL',
      createdAt: '2024-01-15T10:05:00Z',
      updatedAt: '2024-01-15T10:05:00Z'
    });
    mockBillingListItems.mockResolvedValue([
      {
        id: 'bill-item-1',
        billingRecordId: 'bill-1',
        accountId: 'acc-1',
        encounterId: 'enc-1',
        itemType: 'service',
        description: 'Consulta',
        quantity: 1,
        unitPriceAmount: 180,
        totalAmount: 180,
        createdByUserId: 'user-1',
        createdAt: '2024-01-15T10:10:00Z'
      }
    ]);
    mockDiagnosticsListByEncounter.mockResolvedValue([]);
    mockDiagnosticsListAttachments.mockResolvedValue([]);
    mockAttachmentListFn.mockResolvedValue([]);
    mockApiRequestFn.mockResolvedValue({});
    mockPrescriptionsListByPatient.mockResolvedValue([]);
    mockOnBeforeRouteLeave.mockReset();
    mockOnBeforeRouteUpdate.mockReset();
  });

  it('shows loading state initially', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    expect(wrapper.find('.page-loading').exists()).toBe(true);
  });

  it('shows error state when API fails to load record', async () => {
    mockGetByEncounterFn.mockRejectedValue(new Error('Prontuario nao encontrado'));

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Prontuario nao encontrado');
  });

  it('loads the record when the route id is a medical record id instead of an encounter id', async () => {
    mockRouteId = 'mr-1';
    mockRoute.params.id = 'mr-1';
    mockRoute.path = '/medical-records/mr-1';
    mockGetByEncounterFn.mockRejectedValue(new Error('Unexpected error'));

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Evolucao do dia');
    expect(mockListAllFn).toHaveBeenCalled();
    expect(mockListEntriesFn).toHaveBeenCalledWith('enc-1');
    expect(mockGetTimelineFn).toHaveBeenCalledWith('enc-1');
  });

  it('does not expose the generic backend error when record loading fails unexpectedly', async () => {
    mockGetByEncounterFn.mockRejectedValue(new Error('Unexpected error'));
    mockListAllFn.mockRejectedValue(new Error('Unexpected error'));

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Não foi possível carregar este prontuário');
    expect(wrapper.text()).not.toContain('Unexpected error');
  });

  it('renders record details when loaded', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Prontuário clínico');
    expect(wrapper.text()).toContain('Rex');
  });

  it('uses a readable fallback when a legacy owner contact omits its label', async () => {
    mockOwnerGetById.mockResolvedValueOnce({
      id: 'owner-1',
      accountId: 'acc-1',
      fullName: 'Ana Tutor',
      contacts: [{ type: 'phone', value: '11999999999', primary: true }],
      financialResponsible: true,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    } as never);

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Telefone: 11999999999');
    expect(wrapper.text()).not.toContain('undefined:');
  });

  it('renders the structured veterinary medical record', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Queixa principal');
    expect(wrapper.text()).toContain('Anamnese');
    await wrapper.get('[data-testid="clinical-step-exam"]').trigger('click');
    expect(wrapper.text()).toContain('Exame físico');
    expect(wrapper.text()).toContain('Parâmetros vitais');
    await wrapper.get('[data-testid="clinical-step-assessment"]').trigger('click');
    expect(wrapper.text()).toContain('Exames solicitados / recomendados');
    expect(wrapper.text()).toContain('Suspeita diagnóstica / avaliação clínica');
    await wrapper.get('[data-testid="clinical-step-plan"]').trigger('click');
    expect(wrapper.text()).toContain('Terapêutica / plano de tratamento');
    expect(wrapper.text()).toContain('Prescrição / receituário');
    expect(wrapper.text()).toContain('Conduta e próximos passos');
    expect(wrapper.text()).toContain('Observações');
    expect(wrapper.text()).toContain('Blocos operacionais e contexto complementar');
    expect(wrapper.text()).toContain('Entradas clínicas brutas e auditoria');
    expect(wrapper.text()).toContain('Timeline técnica e IDs');
  });

  it('links clinical support actions with the current encounter context', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage, {
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

    const diagnosticsLinks = wrapper
      .findAll('a')
      .filter((link) => link.attributes('href')?.startsWith('/diagnostics?'));
    expect(diagnosticsLinks.length).toBeGreaterThan(0);
    expect(
      diagnosticsLinks.every(
        (link) =>
          link.attributes('href') ===
          '/diagnostics?encounterId=enc-1&patientId=pat-1&ownerId=owner-1'
      )
    ).toBe(true);
  });

  it('shows honest loading and empty states for clinical attachments', async () => {
    const recordAttachments = deferred<unknown[]>();
    const encounterAttachments = deferred<unknown[]>();
    mockDiagnosticsListAttachments.mockReturnValueOnce(recordAttachments.promise);
    mockAttachmentListFn.mockReturnValueOnce(encounterAttachments.promise);

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.get('[data-testid="clinical-attachments-loading"]').text()).toContain(
      'Carregando anexos'
    );
    expect(wrapper.find('[data-testid="clinical-attachments-empty"]').exists()).toBe(false);

    recordAttachments.resolve([]);
    encounterAttachments.resolve([]);
    await flushPromises();

    expect(wrapper.get('[data-testid="clinical-attachments-empty"]').text()).toContain(
      'Nenhum anexo vinculado'
    );
    expect(wrapper.find('[data-testid="clinical-attachments-error"]').exists()).toBe(false);
  });

  it('lists record and encounter attachments with metadata and opens only after URL confirmation', async () => {
    mockDiagnosticsListAttachments.mockResolvedValueOnce(mockMedicalRecordAttachments);
    mockAttachmentListFn.mockResolvedValueOnce(mockEncounterAttachments);
    const downloadUrl = deferred<{ url: string; expiresAt: string }>();
    mockApiRequestFn.mockReturnValueOnce(downloadUrl.promise);
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window);

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const attachmentsSection = wrapper.get('[data-testid="clinical-attachments"]');
    expect(attachmentsSection.text()).toContain('radiografia-lateral.jpg');
    expect(attachmentsSection.text()).toContain('image/jpeg');
    expect(attachmentsSection.text()).toContain('Tamanho: 4 KB');
    expect(attachmentsSection.text()).toContain('laudo-dermatologico.pdf');
    expect(attachmentsSection.text()).toContain('application/pdf');
    expect(attachmentsSection.text()).toContain('Tamanho: 8 KB');

    const openButton = attachmentsSection.get(
      '[data-testid="clinical-attachment-open-attachment-record-1"]'
    );
    await openButton.trigger('click');
    expect(mockApiRequestFn).toHaveBeenCalledWith('/attachments/attachment-record-1/download-url', {
      method: 'POST'
    });
    expect(openSpy).not.toHaveBeenCalled();

    downloadUrl.resolve({
      url: '/attachments/attachment-record-1/content?token=confirmed-token',
      expiresAt: new Date(Date.now() + 300_000).toISOString()
    });
    await flushPromises();

    expect(openSpy).toHaveBeenCalledWith(
      '/api/attachments/attachment-record-1/content?token=confirmed-token',
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockRoute.path).toBe('/medical-records/enc-1');
    openSpy.mockRestore();
  });

  it('reports an invalid attachment URL without opening unconfirmed content', async () => {
    mockDiagnosticsListAttachments.mockResolvedValueOnce(mockMedicalRecordAttachments);
    mockAttachmentListFn.mockResolvedValueOnce([]);
    mockApiRequestFn.mockResolvedValueOnce({
      url: '/attachments/another-attachment/content?token=wrong-target',
      expiresAt: new Date(Date.now() + 300_000).toISOString()
    });
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window);

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    await wrapper
      .get('[data-testid="clinical-attachment-open-attachment-record-1"]')
      .trigger('click');
    await flushPromises();

    expect(openSpy).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="clinical-attachment-action-error"]').text()).toContain(
      'não confirmou uma URL válida'
    );
    openSpy.mockRestore();
  });

  it('does not present a false empty state when attachment loading fails', async () => {
    mockDiagnosticsListAttachments.mockRejectedValueOnce(
      new Error('Falha ao ler anexos do registro')
    );
    mockAttachmentListFn.mockRejectedValueOnce(new Error('Falha ao ler anexos do atendimento'));

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.get('[data-testid="clinical-attachments-error"]').text()).toContain(
      'Não foi possível carregar os anexos'
    );
    expect(wrapper.get('[data-testid="clinical-attachments-unconfirmed"]').text()).toContain(
      'não pôde ser confirmada'
    );
    expect(wrapper.find('[data-testid="clinical-attachments-empty"]').exists()).toBe(false);
  });

  it('links the medical record to the counter-sale handoff with the current encounter context', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage, {
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

    const counterSaleLinks = wrapper
      .findAll('a')
      .filter((link) => link.attributes('href')?.startsWith('/counter-sales?'));

    expect(counterSaleLinks.length).toBeGreaterThan(0);
    expect(
      counterSaleLinks.every(
        (link) =>
          link.attributes('href') ===
          '/counter-sales?encounterId=enc-1&patientId=pat-1&ownerId=owner-1'
      )
    ).toBe(true);
    expect(wrapper.text()).toContain('Comanda');
  });

  it('saves a structured clinical sheet as separate clinical entries', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    await wrapper
      .find('[data-testid="clinical-anamnesis"]')
      .setValue('Tutor relata prurido há 3 dias.');
    await wrapper.get('[data-testid="clinical-step-exam"]').trigger('click');
    await wrapper
      .find('[data-testid="clinical-physicalExam"]')
      .setValue('Pele hiperêmica em região cervical.');
    await wrapper.get('[data-testid="clinical-step-plan"]').trigger('click');
    await wrapper
      .find('[data-testid="clinical-plan"]')
      .setValue('Retorno em 7 dias e controle de ectoparasitas.');

    const saveBtn = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Salvar ficha de atendimento'));
    await saveBtn!.trigger('click');
    await flushPromises();

    expect(mockCreateEntryFn).toHaveBeenCalledTimes(3);
    expect(mockCreateEntryFn).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: 'anamnesis',
        title: 'Anamnese',
        content: 'Tutor relata prurido há 3 dias.'
      }),
      { idempotencyKey: expect.any(String) }
    );
    expect(mockCreateEntryFn).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: 'physical_exam',
        title: 'Exame físico',
        content: 'Pele hiperêmica em região cervical.'
      }),
      { idempotencyKey: expect.any(String) }
    );
    expect(mockCreateEntryFn).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: 'plan',
        title: 'Terapêutica / plano de tratamento',
        content: 'Retorno em 7 dias e controle de ectoparasitas.'
      }),
      { idempotencyKey: expect.any(String) }
    );

    const keys = mockCreateEntryFn.mock.calls.map(([, options]) => options.idempotencyKey);
    expect(new Set(keys).size).toBe(3);
  });

  it('retries each clinical sheet block with its original key without sharing keys between blocks', async () => {
    mockCreateEntryFn
      .mockRejectedValueOnce(new Error('Falha transitória'))
      .mockImplementationOnce((payload: MockCreatePayload) =>
        Promise.resolve(persistMockEntry(payload))
      )
      .mockImplementationOnce((payload: MockCreatePayload) =>
        Promise.resolve(persistMockEntry(payload))
      );

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    await wrapper.find('[data-testid="clinical-anamnesis"]').setValue('Relato para retry.');
    await wrapper.get('[data-testid="clinical-step-plan"]').trigger('click');
    await wrapper.find('[data-testid="clinical-plan"]').setValue('Plano para retry.');

    const saveButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Salvar ficha de atendimento'))!;
    await saveButton.trigger('click');
    await flushPromises();
    await saveButton.trigger('click');
    await flushPromises();

    const calls = mockCreateEntryFn.mock.calls;
    expect(calls).toHaveLength(3);
    expect(calls[1]?.[1]?.idempotencyKey).toBe(calls[0]?.[1]?.idempotencyKey);
    expect(calls[2]?.[1]?.idempotencyKey).not.toBe(calls[0]?.[1]?.idempotencyKey);
    expect(calls[0]?.[0]).toEqual(calls[1]?.[0]);
    expect(calls[1]?.[0]).not.toEqual(calls[2]?.[0]);
  });

  it('keeps the clinical draft visibly pending until persistence and reload complete', async () => {
    const pending = deferred<ReturnType<typeof persistMockEntry>>();
    let pendingPayload: MockCreatePayload | undefined;
    mockCreateEntryFn.mockImplementationOnce((payload: MockCreatePayload) => {
      pendingPayload = payload;
      return pending.promise;
    });

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const textarea = wrapper.find('[data-testid="clinical-anamnesis"]');
    await textarea.setValue('Rascunho ainda em revisão.');
    expect(wrapper.get('[data-testid="clinical-draft-state"]').text()).toContain(
      'Rascunho local não salvo'
    );

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Salvar ficha de atendimento'))
      ?.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="clinical-draft-state"]').text()).toContain(
      'Salvando no prontuário'
    );
    expect(wrapper.text()).not.toContain('Ficha de atendimento salva no prontuário.');
    expect((textarea.element as HTMLTextAreaElement).value).toBe('Rascunho ainda em revisão.');

    pending.resolve(persistMockEntry(pendingPayload!));
    await flushPromises();

    expect(wrapper.get('[data-testid="clinical-draft-state"]').text()).toContain(
      'Salvo no prontuário'
    );
    expect((textarea.element as HTMLTextAreaElement).value).toBe('');
  });

  it('keeps a newer clinical draft dirty when the pending save and reload resolve', async () => {
    const pending = deferred<ReturnType<typeof persistMockEntry>>();
    let pendingPayload: MockCreatePayload | undefined;
    mockCreateEntryFn.mockImplementationOnce((payload: MockCreatePayload) => {
      pendingPayload = payload;
      return pending.promise;
    });

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const textarea = wrapper.find('[data-testid="clinical-anamnesis"]');
    await textarea.setValue('Versão enviada ao prontuário.');
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Salvar ficha de atendimento'))
      ?.trigger('click');
    await wrapper.vm.$nextTick();

    await textarea.setValue('Nova edição feita durante o salvamento.');
    expect(wrapper.get('[data-testid="clinical-draft-state"]').text()).toContain(
      'Salvando no prontuário'
    );

    pending.resolve(persistMockEntry(pendingPayload!));
    await flushPromises();

    expect(wrapper.get('[data-testid="clinical-draft-state"]').text()).toContain(
      'Rascunho local não salvo'
    );
    expect((textarea.element as HTMLTextAreaElement).value).toBe(
      'Nova edição feita durante o salvamento.'
    );
    expect(wrapper.text()).toContain(
      'As alterações feitas durante o salvamento continuam como rascunho local.'
    );
  });

  it('preserves the clinical draft and distinguishes a persistence failure', async () => {
    mockCreateEntryFn.mockRejectedValueOnce(new Error('Falha de persistência clínica'));

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const textarea = wrapper.find('[data-testid="clinical-anamnesis"]');
    await textarea.setValue('Texto que não pode ser perdido.');
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Salvar ficha de atendimento'))
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="clinical-draft-state"]').text()).toContain(
      'Persistência não confirmada'
    );
    expect(wrapper.find('[role="alert"]').text()).toContain('Falha de persistência clínica');
    expect((textarea.element as HTMLTextAreaElement).value).toBe('Texto que não pode ser perdido.');
    expect(wrapper.text()).not.toContain('Ficha de atendimento salva no prontuário.');
  });

  it('does not clear the draft when the post-save reload cannot confirm the record', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    mockGetByEncounterFn.mockImplementationOnce(() =>
      Promise.reject(new Error('Falha na releitura'))
    );
    const textarea = wrapper.find('[data-testid="clinical-anamnesis"]');
    await textarea.setValue('Confirmar somente após a releitura.');
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Salvar ficha de atendimento'))
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="clinical-draft-state"]').text()).toContain(
      'Persistência não confirmada'
    );
    expect((textarea.element as HTMLTextAreaElement).value).toBe(
      'Confirmar somente após a releitura.'
    );
    expect(wrapper.text()).not.toContain('Ficha de atendimento salva no prontuário.');
  });

  it('does not call a clinical save confirmed when the created entry is absent from the reread', async () => {
    mockCreateEntryFn.mockImplementationOnce((payload: MockCreatePayload) => {
      const persisted = persistMockEntry(payload);
      return Promise.resolve({ ...persisted, id: 'entry-returned-but-not-reread' });
    });

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const textarea = wrapper.find('[data-testid="clinical-anamnesis"]');
    await textarea.setValue('A releitura deve confirmar esta entrada.');
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Salvar ficha de atendimento'))
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="clinical-draft-state"]').text()).toContain(
      'Persistência não confirmada'
    );
    expect((textarea.element as HTMLTextAreaElement).value).toBe(
      'A releitura deve confirmar esta entrada.'
    );
    expect(wrapper.text()).not.toContain('Ficha de atendimento salva no prontuário.');
  });

  it('shows status badge for open record', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Aberto');
  });

  it('keeps a completed record read-only and hides clinical write actions', async () => {
    mockGetByEncounterFn.mockResolvedValue({
      record: { ...mockRecord, status: 'completed' },
      entries: persistedEntries
    });

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();

    expect(wrapper.text()).toContain('somente leitura');
    expect(wrapper.findAll('button').some((button) => button.text() === 'Editar')).toBe(false);
    expect(wrapper.findAll('button').some((button) => button.text() === 'Arquivar')).toBe(false);
    expect(mockCreateEntryFn).not.toHaveBeenCalled();
    expect(mockUpdateEntryFn).not.toHaveBeenCalled();
    expect(mockArchiveEntryFn).not.toHaveBeenCalled();
  });

  it('fails closed when the encounter context cannot be loaded', async () => {
    mockEncounterGetById.mockRejectedValueOnce(new Error('Contexto indisponível'));

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();

    const writeButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Registrar evolução'));
    expect(writeButton?.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('O contexto do atendimento não pôde ser confirmado.');
  });

  it('shows clinical entries when present', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Entradas');
    expect(wrapper.text()).toContain('Evolucao do dia');
    expect(wrapper.text()).toContain('Exame fisico inicial');
  });

  it('shows entry type labels', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Observação clínica');
    expect(wrapper.text()).toContain('Exame');
  });

  it('shows entry version numbers', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('v1');
  });

  it('shows empty entries message when no entries exist', async () => {
    mockGetByEncounterFn.mockResolvedValue({ record: mockRecord, entries: [] });

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhuma entrada');
  });

  it('shows timeline events when loaded', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Timeline');
    expect(wrapper.text()).toContain('Prontuario criado');
  });

  it('renders entries and timeline newest-first without mutating API response order', async () => {
    const entriesOutOfOrder = [
      {
        ...mockEntries[1],
        id: 'entry-same-b',
        title: 'Entrada empate B',
        updatedAt: '2024-01-15T12:00:00Z'
      },
      {
        ...mockEntries[0],
        id: 'entry-new',
        title: 'Entrada nova',
        updatedAt: '2024-01-15T13:00:00Z'
      },
      {
        ...mockEntries[1],
        id: 'entry-same-a',
        title: 'Entrada empate A',
        updatedAt: '2024-01-15T12:00:00Z'
      }
    ];
    const timelineOutOfOrder = [
      {
        ...mockTimeline[0],
        id: 'evt-old',
        summary: 'Evento antigo',
        occurredAt: '2024-01-15T10:00:00Z'
      },
      {
        ...mockTimeline[0],
        id: 'evt-new',
        summary: 'Evento novo',
        occurredAt: '2024-01-15T14:00:00Z'
      },
      {
        ...mockTimeline[0],
        id: 'evt-tie-b',
        summary: 'Evento empate B',
        occurredAt: '2024-01-15T12:00:00Z'
      },
      {
        ...mockTimeline[0],
        id: 'evt-tie-a',
        summary: 'Evento empate A',
        occurredAt: '2024-01-15T12:00:00Z'
      }
    ];
    mockGetByEncounterFn.mockResolvedValue({ record: mockRecord, entries: entriesOutOfOrder });
    mockGetTimelineFn.mockResolvedValue(timelineOutOfOrder);

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);
    await flushPromises();

    expect(wrapper.findAll('.entry-card__title').map((title) => title.text())).toEqual([
      'Entrada nova',
      'Entrada empate A',
      'Entrada empate B'
    ]);
    expect(entriesOutOfOrder.map((entry) => entry.id)).toEqual([
      'entry-same-b',
      'entry-new',
      'entry-same-a'
    ]);

    expect(wrapper.findAll('.timeline-event__summary').map((summary) => summary.text())).toEqual([
      'Evento novo',
      'Evento empate A',
      'Evento empate B',
      'Evento antigo'
    ]);
    expect(timelineOutOfOrder.map((event) => event.id)).toEqual([
      'evt-old',
      'evt-new',
      'evt-tie-b',
      'evt-tie-a'
    ]);
  });

  it('shows empty timeline message when no events', async () => {
    mockGetTimelineFn.mockResolvedValue([]);

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum evento registrado');
  });

  it('opens new entry modal when clicking Nova Entrada', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Registrar evolução'));
    await newBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Nova Entrada Clínica');
    expect(wrapper.find('#entryType').exists()).toBe(true);
    expect(wrapper.find('#entryTitle').exists()).toBe(true);
    expect(wrapper.find('#entryContent').exists()).toBe(true);
  });

  it('opens the anamnesis modal when requested by quick access query', async () => {
    mockRouteQuery = { entry: 'anamnesis' };
    mockRoute.query = { entry: 'anamnesis' };

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Nova Anamnese');
    expect(wrapper.text()).toContain('Use este espaço para o relato do tutor');
    expect((wrapper.find('#entryType').element as HTMLSelectElement).value).toBe('anamnesis');
    expect((wrapper.find('#entryContent').element as HTMLTextAreaElement).placeholder).toContain(
      'Relato do tutor'
    );
  });

  it('creates a new entry successfully', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Registrar evolução'));
    await newBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const typeSelect = wrapper.find('#entryType');
    await typeSelect.setValue('progress_note');

    const titleInput = wrapper.find('#entryTitle');
    await titleInput.setValue('Nova evolucao');

    const contentTextarea = wrapper.find('#entryContent');
    await contentTextarea.setValue('Conteudo da evolucao');

    const saveBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Salvar'));
    await saveBtn!.trigger('click');
    await flushPromises();

    expect(mockCreateEntryFn).toHaveBeenCalled();
  });

  it('disables save button when form is incomplete', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Registrar evolução'));
    await newBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const saveBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Salvar'));
    expect(saveBtn!.attributes('disabled')).toBeDefined();
  });

  it('opens edit entry modal when clicking Editar', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const editBtn = wrapper.findAll('button').find((b) => b.text() === 'Editar');
    await editBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Editar Observação clínica');
    const titleInput = wrapper.find('#entryTitle') as any;
    expect(titleInput.element.value).toBe('Evolucao do dia');
  });

  it('updates entry successfully', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const editBtn = wrapper.findAll('button').find((b) => b.text() === 'Editar');
    await editBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const titleInput = wrapper.find('#entryTitle');
    await titleInput.setValue('Evolucao atualizada');

    const saveBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Salvar'));
    await saveBtn!.trigger('click');
    await flushPromises();

    expect(mockUpdateEntryFn).toHaveBeenCalledWith(
      'entry-1',
      expect.any(Object),
      { idempotencyKey: expect.any(String) }
    );
  });

  it('opens archive modal when clicking Arquivar', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const archiveBtn = wrapper.findAll('button').find((b) => b.text() === 'Arquivar');
    await archiveBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Arquivar Entrada');
    expect(wrapper.find('#archiveReason').exists()).toBe(true);
  });

  it('archives entry successfully', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const archiveBtn = wrapper.findAll('button').find((b) => b.text() === 'Arquivar');
    await archiveBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('#archiveReason');
    await textarea.setValue('Entrada duplicada');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Arquivar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(mockArchiveEntryFn).toHaveBeenCalledWith(
      'entry-1',
      expect.any(Object),
      { idempotencyKey: expect.any(String) }
    );
    expect(mockListEntriesFn).toHaveBeenCalledWith('enc-1', { includeArchived: true });
  });

  it('disables archive button when reason is empty', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const archiveBtn = wrapper.findAll('button').find((b) => b.text() === 'Arquivar');
    await archiveBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Arquivar'));
    expect(submitBtn!.attributes('disabled')).toBeDefined();
  });

  it('shows a visible error when archive fails', async () => {
    mockArchiveEntryFn.mockRejectedValue(new Error('Erro ao arquivar'));

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const archiveBtn = wrapper.findAll('button').find((b) => b.text() === 'Arquivar');
    await archiveBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('#archiveReason');
    await textarea.setValue('Motivo');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Arquivar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain('Erro ao arquivar');
  });

  it('retries a new clinical entry with the same key for the same payload', async () => {
    mockCreateEntryFn
      .mockRejectedValueOnce(new Error('Falha transitória'))
      .mockImplementationOnce((payload: MockCreatePayload) =>
        Promise.resolve(persistMockEntry(payload))
      );

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const newButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Registrar evolução'))!;
    await newButton.trigger('click');
    await wrapper.vm.$nextTick();
    await wrapper.find('#entryTitle').setValue('Nova entrada');
    await wrapper.find('#entryContent').setValue('Conteúdo para retry');

    const saveButton = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((button) => button.text().includes('Salvar'))!;
    await saveButton.trigger('click');
    await flushPromises();
    await saveButton.trigger('click');
    await flushPromises();

    expect(mockCreateEntryFn).toHaveBeenCalledTimes(2);
    expect(mockCreateEntryFn.mock.calls[1]?.[1]?.idempotencyKey).toBe(
      mockCreateEntryFn.mock.calls[0]?.[1]?.idempotencyKey
    );
    expect(mockCreateEntryFn.mock.calls[1]?.[0]).toEqual(mockCreateEntryFn.mock.calls[0]?.[0]);
  });

  it('shows error when create entry fails', async () => {
    mockCreateEntryFn.mockRejectedValue(new Error('Erro ao salvar entrada'));

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Registrar evolução'));
    await newBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const typeSelect = wrapper.find('#entryType');
    await typeSelect.setValue('progress_note');

    const titleInput = wrapper.find('#entryTitle');
    await titleInput.setValue('Teste');

    const contentTextarea = wrapper.find('#entryContent');
    await contentTextarea.setValue('Conteudo');

    const saveBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Salvar'));
    await saveBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Erro ao salvar entrada');
  });

  it('shows back link to medical records list', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage, {
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
    const backLink = wrapper.findAll('a').find((a) => a.text() === 'Voltar');
    expect(backLink).toBeTruthy();
    expect(backLink!.attributes('href')).toBe('/medical-records');
  });

  it('shows completed status for closed record', async () => {
    mockGetByEncounterFn.mockResolvedValue({
      record: { ...mockRecord, status: 'completed' as const },
      entries: mockEntries
    });

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Conclu');
  });

  it('shows one clinical workflow step at a time', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);
    await flushPromises();

    expect(wrapper.find('[data-clinical-panel="anamnesis"]').exists()).toBe(true);
    expect(wrapper.find('[data-clinical-panel="assessment"]').exists()).toBe(false);

    await wrapper.get('[data-testid="clinical-step-assessment"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-clinical-panel="anamnesis"]').exists()).toBe(false);
    expect(wrapper.find('[data-clinical-panel="assessment"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="clinical-anamnesis"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="clinical-assessment"]').exists()).toBe(true);
  });

  it('ignores a late previous medical-record response after the route changes', async () => {
    const first = deferred<{ record: typeof mockRecord; entries: typeof mockEntries }>();
    const secondRecord = { ...mockRecord, id: 'mr-2', encounterId: 'enc-2', patientId: 'pat-2' };
    const secondEntries = [
      {
        ...mockEntries[0],
        id: 'entry-2',
        encounterId: 'enc-2',
        patientId: 'pat-2',
        title: 'Evolucao Luna'
      }
    ];
    const second = deferred<{ record: typeof secondRecord; entries: typeof secondEntries }>();
    mockGetByEncounterFn.mockImplementation((id: string) =>
      id === 'enc-1' ? first.promise : second.promise
    );
    mockEncounterGetById.mockImplementation((id: string) =>
      Promise.resolve({
        id,
        accountId: 'acc-1',
        patientId: id === 'enc-2' ? 'pat-2' : 'pat-1',
        ownerId: id === 'enc-2' ? 'owner-2' : 'owner-1',
        visitType: 'walk_in',
        status: 'in_care',
        origin: 'reception',
        reason: id === 'enc-2' ? 'Consulta Luna' : 'Consulta Rex',
        openedAt: '2024-01-15T10:00:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2024-01-15T10:00:00Z'
      })
    );

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);
    mockRoute.params.id = 'enc-2';
    mockRoute.path = '/medical-records/enc-2';
    await flushPromises();
    second.resolve({ record: secondRecord, entries: secondEntries });
    await flushPromises();
    first.resolve({ record: mockRecord, entries: mockEntries });
    await flushPromises();

    expect(wrapper.text()).toContain('Consulta Luna');
    expect(wrapper.text()).not.toContain('Consulta Rex');
    expect(wrapper.text()).not.toContain('enc-1');
  });

  it('rejects a record response whose identity differs from the requested route', async () => {
    mockGetByEncounterFn.mockResolvedValue({
      record: { ...mockRecord, id: 'unexpected-record', encounterId: 'unexpected-encounter' },
      entries: []
    });

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);
    await flushPromises();

    expect(wrapper.text()).toContain('não corresponde ao endereço solicitado');
    expect(wrapper.text()).not.toContain('Consulta dermatológica');
  });

  it('protects a clinical draft before route departure', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const textarea = wrapper.find('[data-testid="clinical-anamnesis"]');
    await textarea.setValue('Rascunho que exige confirmação antes de sair.');

    const guard = mockOnBeforeRouteLeave.mock.calls[0]?.[0] as
      | (() => boolean | Promise<boolean>)
      | undefined;
    expect(guard).toBeTypeOf('function');
    const departure = guard!();
    await wrapper.vm.$nextTick();

    const continueButton = document.body.querySelector<HTMLButtonElement>(
      '#medical-record-continue-editing'
    );
    expect(continueButton).toBeTruthy();
    expect(document.body.textContent).toContain('Há um rascunho clínico local neste atendimento');
    continueButton!.click();

    expect(await departure).toBe(false);
    expect((textarea.element as HTMLTextAreaElement).value).toBe(
      'Rascunho que exige confirmação antes de sair.'
    );
    wrapper.unmount();
  });
});

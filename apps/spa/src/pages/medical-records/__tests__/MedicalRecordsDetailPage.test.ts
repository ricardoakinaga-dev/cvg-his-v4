import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

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

let mockRouteId = 'enc-1';
let mockRouteQuery: Record<string, unknown> = {};
const mockGetByEncounterFn = vi
  .fn()
  .mockResolvedValue({ record: mockRecord, entries: mockEntries });
const mockListAllFn = vi.fn().mockResolvedValue([{ record: mockRecord, entryCount: mockEntries.length }]);
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
const mockPrescriptionsListByPatient = vi.fn().mockResolvedValue([]);

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
    listByEncounter: mockDiagnosticsListByEncounter
  }
}));

vi.mock('@/services/prescriptions', () => ({
  prescriptionsService: {
    listByPatient: mockPrescriptionsListByPatient
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: mockRouteId },
    path: `/medical-records/${mockRouteId}`,
    query: mockRouteQuery
  }),
  useRouter: () => ({
    push: vi.fn()
  })
}));

describe('MedicalRecordsDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouteId = 'enc-1';
    mockRouteQuery = {};
    mockGetByEncounterFn.mockResolvedValue({ record: mockRecord, entries: mockEntries });
    mockListAllFn.mockResolvedValue([{ record: mockRecord, entryCount: mockEntries.length }]);
    mockListEntriesFn.mockResolvedValue(mockEntries);
    mockGetTimelineFn.mockResolvedValue(mockTimeline);
    mockCreateEntryFn.mockResolvedValue({});
    mockUpdateEntryFn.mockResolvedValue({});
    mockArchiveEntryFn.mockResolvedValue({});
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
    mockPrescriptionsListByPatient.mockResolvedValue([]);
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
    expect(wrapper.text()).toContain('Prontu');
    expect(wrapper.text()).toContain('Rex');
  });

  it('renders the structured veterinary medical record', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Queixa principal');
    expect(wrapper.text()).toContain('Anamnese');
    expect(wrapper.text()).toContain('Exame físico');
    expect(wrapper.text()).toContain('Parâmetros vitais');
    expect(wrapper.text()).toContain('Exames solicitados / recomendados');
    expect(wrapper.text()).toContain('Suspeita diagnóstica / avaliação clínica');
    expect(wrapper.text()).toContain('Terapêutica / plano de tratamento');
    expect(wrapper.text()).toContain('Prescrição / receituário');
    expect(wrapper.text()).toContain('Conduta e próximos passos');
    expect(wrapper.text()).toContain('Observações');
    expect(wrapper.text()).toContain('Blocos operacionais e contexto complementar');
    expect(wrapper.text()).toContain('Entradas clínicas brutas e auditoria');
    expect(wrapper.text()).toContain('Timeline técnica e IDs');
  });

  it('saves a structured clinical sheet as separate clinical entries', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    await wrapper.find('[data-testid="clinical-anamnesis"]').setValue('Tutor relata prurido há 3 dias.');
    await wrapper.find('[data-testid="clinical-physicalExam"]').setValue('Pele hiperêmica em região cervical.');
    await wrapper.find('[data-testid="clinical-plan"]').setValue('Retorno em 7 dias e controle de ectoparasitas.');

    const saveBtn = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Salvar ficha de atendimento'));
    await saveBtn!.trigger('click');
    await flushPromises();

    expect(mockCreateEntryFn).toHaveBeenCalledTimes(3);
    expect(mockCreateEntryFn).toHaveBeenCalledWith(expect.objectContaining({
      entryType: 'anamnesis',
      title: 'Anamnese',
      content: 'Tutor relata prurido há 3 dias.'
    }));
    expect(mockCreateEntryFn).toHaveBeenCalledWith(expect.objectContaining({
      entryType: 'physical_exam',
      title: 'Exame físico',
      content: 'Pele hiperêmica em região cervical.'
    }));
    expect(mockCreateEntryFn).toHaveBeenCalledWith(expect.objectContaining({
      entryType: 'plan',
      title: 'Terapêutica / plano de tratamento',
      content: 'Retorno em 7 dias e controle de ectoparasitas.'
    }));
  });

  it('shows status badge for open record', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Aberto');
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
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Salvar entrada clínica'));
    await newBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Nova Entrada Clínica');
    expect(wrapper.find('#entryType').exists()).toBe(true);
    expect(wrapper.find('#entryTitle').exists()).toBe(true);
    expect(wrapper.find('#entryContent').exists()).toBe(true);
  });

  it('opens the anamnesis modal when requested by quick access query', async () => {
    mockRouteQuery = { entry: 'anamnesis' };

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
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Salvar entrada clínica'));
    await newBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const typeSelect = wrapper.find('#entryType');
    await typeSelect.setValue('progress_note');

    const titleInput = wrapper.find('#entryTitle');
    await titleInput.setValue('Nova evolucao');

    const contentTextarea = wrapper.find('#entryContent');
    await contentTextarea.setValue('Conteudo da evolucao');

    const saveBtn = wrapper.findAll('.ds-modal__footer .ds-btn').find((b) => b.text().includes('Salvar'));
    await saveBtn!.trigger('click');
    await flushPromises();

    expect(mockCreateEntryFn).toHaveBeenCalled();
  });

  it('disables save button when form is incomplete', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Salvar entrada clínica'));
    await newBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const saveBtn = wrapper.findAll('.ds-modal__footer .ds-btn').find((b) => b.text().includes('Salvar'));
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

    const saveBtn = wrapper.findAll('.ds-modal__footer .ds-btn').find((b) => b.text().includes('Salvar'));
    await saveBtn!.trigger('click');
    await flushPromises();

    expect(mockUpdateEntryFn).toHaveBeenCalledWith('entry-1', expect.any(Object));
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

    expect(mockArchiveEntryFn).toHaveBeenCalledWith('entry-1', expect.any(Object));
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

  it('shows error alert when archive fails', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
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

    expect(alertMock).toHaveBeenCalledWith('Erro ao arquivar');
    alertMock.mockRestore();
  });

  it('shows error when create entry fails', async () => {
    mockCreateEntryFn.mockRejectedValue(new Error('Erro ao salvar entrada'));

    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Salvar entrada clínica'));
    await newBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const typeSelect = wrapper.find('#entryType');
    await typeSelect.setValue('progress_note');

    const titleInput = wrapper.find('#entryTitle');
    await titleInput.setValue('Teste');

    const contentTextarea = wrapper.find('#entryContent');
    await contentTextarea.setValue('Conteudo');

    const saveBtn = wrapper.findAll('.ds-modal__footer .ds-btn').find((b) => b.text().includes('Salvar'));
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
});

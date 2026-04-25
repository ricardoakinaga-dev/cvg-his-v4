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
    getOwnerName: vi.fn().mockResolvedValue(''),
    getUserName: vi.fn().mockResolvedValue(''),
    preloadUserNames: vi.fn().mockResolvedValue(undefined),
    loading: new Set()
  })
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: mockRouteId },
    path: `/medical-records/${mockRouteId}`
  }),
  useRouter: () => ({
    push: vi.fn()
  })
}));

describe('MedicalRecordsDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouteId = 'enc-1';
    mockGetByEncounterFn.mockResolvedValue({ record: mockRecord, entries: mockEntries });
    mockListAllFn.mockResolvedValue([{ record: mockRecord, entryCount: mockEntries.length }]);
    mockListEntriesFn.mockResolvedValue(mockEntries);
    mockGetTimelineFn.mockResolvedValue(mockTimeline);
    mockCreateEntryFn.mockResolvedValue({});
    mockUpdateEntryFn.mockResolvedValue({});
    mockArchiveEntryFn.mockResolvedValue({});
    mockGetPatientName.mockResolvedValue('Rex');
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
    expect(wrapper.text()).toContain('Nota de Evolu');
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
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Nova Entrada'));
    await newBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Nova Entrada');
    expect(wrapper.find('#entryType').exists()).toBe(true);
    expect(wrapper.find('#entryTitle').exists()).toBe(true);
    expect(wrapper.find('#entryContent').exists()).toBe(true);
  });

  it('creates a new entry successfully', async () => {
    const MedicalRecordsDetailPage = (await import('../MedicalRecordsDetailPage.vue')).default;
    const wrapper = mount(MedicalRecordsDetailPage);

    await flushPromises();
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Nova Entrada'));
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
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Nova Entrada'));
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

    expect(wrapper.text()).toContain('Editar Entrada');
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
    const newBtn = wrapper.findAll('button').find((b) => b.text().includes('Nova Entrada'));
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

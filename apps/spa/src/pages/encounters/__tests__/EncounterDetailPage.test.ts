import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockEncounter = {
  id: 'enc-1',
  accountId: 'acc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  visitType: 'walk_in' as const,
  origin: 'reception' as const,
  reason: 'Animal com febre e letargia',
  status: 'reception' as const,
  openedAt: '2024-01-15T10:00:00Z',
  closedAt: undefined,
  closeReason: undefined,
  createdByUserId: 'user-1',
  updatedAt: '2024-01-15T10:00:00Z'
};

const mockTimeline = [
  {
    id: 'evt-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    eventType: 'encounter_opened' as const,
    summary: 'Atendimento aberto',
    actorUserId: 'user-1',
    occurredAt: '2024-01-15T10:00:00Z'
  }
];

const mockGetByIdFn = vi.fn().mockResolvedValue(mockEncounter);
const mockGetTimelineFn = vi.fn().mockResolvedValue(mockTimeline);
const mockTransitionFn = vi.fn().mockResolvedValue(mockEncounter);
const mockCloseFn = vi.fn().mockResolvedValue({ ...mockEncounter, status: 'closed' as const });
const mockGetPatientName = vi.fn().mockResolvedValue('Rex');
const mockGetOwnerName = vi.fn().mockResolvedValue('Joao Silva');
const mockRouterPush = vi.fn();

vi.mock('@/services/encounter', () => ({
  encounterService: {
    get getById() {
      return mockGetByIdFn;
    },
    get getTimeline() {
      return mockGetTimelineFn;
    },
    get transition() {
      return mockTransitionFn;
    },
    get close() {
      return mockCloseFn;
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

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'enc-1' },
    path: '/encounters/enc-1'
  }),
  useRouter: () => ({
    push: mockRouterPush
  })
}));

describe('EncounterDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByIdFn.mockResolvedValue(mockEncounter);
    mockGetTimelineFn.mockResolvedValue(mockTimeline);
    mockTransitionFn.mockResolvedValue(mockEncounter);
    mockCloseFn.mockResolvedValue({ ...mockEncounter, status: 'closed' as const });
    mockGetPatientName.mockResolvedValue('Rex');
    mockGetOwnerName.mockResolvedValue('Joao Silva');
    mockRouterPush.mockResolvedValue(undefined);
  });

  it('shows loading state initially', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    expect(wrapper.find('.page-loading').exists()).toBe(true);
  });

  it('shows error state when API fails to load encounter', async () => {
    mockGetByIdFn.mockRejectedValue(new Error('Atendimento nao encontrado'));

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage, {
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
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Atendimento nao encontrado');
  });

  it('renders encounter details when loaded', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Atendimento');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Joao Silva');
    expect(wrapper.text()).toContain('Animal com febre e letargia');
  });

  it('shows status badge with correct label', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Recep');
  });

  it('shows visit type label', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Walk-in');
  });

  it('shows origin label', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Recep');
  });

  it('shows timeline events when loaded', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Timeline');
    expect(wrapper.text()).toContain('Atendimento aberto');
  });

  it('shows empty timeline message when no events', async () => {
    mockGetTimelineFn.mockResolvedValue([]);

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum evento registrado');
  });

  it('shows transition button for non-closed encounters', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const transitionBtn = wrapper.findAll('button').find((b) => b.text().includes('Transicionar'));
    expect(transitionBtn).toBeTruthy();
  });

  it('does not show transition button for closed encounters', async () => {
    mockGetByIdFn.mockResolvedValue({ ...mockEncounter, status: 'closed' as const });

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const transitionBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Transicionar Status'));
    expect(transitionBtn).toBeFalsy();
  });

  it('shows close button for non-closed encounters', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    expect(closeBtn).toBeTruthy();
  });

  it('shows transition modal with available options when clicked', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const transitionBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Transicionar Status'));
    await transitionBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Transicionar Status');
    const options = wrapper.findAll('.transition-options .ds-btn');
    expect(options.length).toBeGreaterThan(0);
  });

  it('transitions status when option is selected', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const transitionBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Transicionar Status'));
    await transitionBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const options = wrapper.findAll('.transition-options .ds-btn');
    await options[0].trigger('click');
    await flushPromises();

    expect(mockTransitionFn).toHaveBeenCalledWith('enc-1', { nextStatus: expect.any(String) });
  });

  it('shows close modal when close button is clicked', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Fechar Atendimento');
    expect(wrapper.find('#closeReason').exists()).toBe(true);
  });

  it('closes encounter with reason', async () => {
    const freshEncounter = { ...mockEncounter, status: 'reception' as const };
    mockGetByIdFn.mockResolvedValue(freshEncounter);

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('#closeReason');
    await textarea.setValue('Paciente recebeu alta');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Fechar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(mockCloseFn).toHaveBeenCalledWith('enc-1', { closeReason: 'Paciente recebeu alta' });
    expect(wrapper.text()).toContain('Finalizado');
  });

  it('disables close button when reason is empty', async () => {
    const freshEncounter = { ...mockEncounter, status: 'reception' as const };
    mockGetByIdFn.mockResolvedValue(freshEncounter);

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Fechar'));
    expect(submitBtn!.attributes('disabled')).toBeDefined();
  });

  it('shows error alert when close fails', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockCloseFn.mockRejectedValue(new Error('Erro ao fechar'));
    const freshEncounter = { ...mockEncounter, status: 'reception' as const };
    mockGetByIdFn.mockResolvedValue(freshEncounter);

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('#closeReason');
    await textarea.setValue('Motivo');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Fechar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(alertMock).toHaveBeenCalledWith('Erro ao fechar');
    alertMock.mockRestore();
  });

  it('disables close button when reason is empty', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Fechar'));
    expect(submitBtn!.attributes('disabled')).toBeDefined();
  });

  it('shows error alert when close fails', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockCloseFn.mockRejectedValue(new Error('Erro ao fechar'));

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('Fechar Atendimento'));
    await closeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('#closeReason');
    await textarea.setValue('Motivo');

    const submitBtn = wrapper
      .findAll('.ds-modal__footer .ds-btn')
      .find((b) => b.text().includes('Fechar'));
    await submitBtn!.trigger('click');
    await flushPromises();

    expect(alertMock).toHaveBeenCalledWith('Erro ao fechar');
    alertMock.mockRestore();
  });

  it('shows back link to encounters list', async () => {
    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage, {
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
    expect(backLink!.attributes('href')).toBe('/encounters');
  });

  it('shows close reason section when present', async () => {
    mockGetByIdFn.mockResolvedValue({
      ...mockEncounter,
      status: 'closed' as const,
      closeReason: 'Paciente recebeu alta medica'
    });

    const EncounterDetailPage = (await import('../EncounterDetailPage.vue')).default;
    const wrapper = mount(EncounterDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Motivo do Fechamento');
    expect(wrapper.text()).toContain('Paciente recebeu alta medica');
  });
});

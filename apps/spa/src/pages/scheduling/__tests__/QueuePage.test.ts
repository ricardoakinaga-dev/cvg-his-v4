import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockQueueEntries = [
  {
    id: 'q-1',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    appointmentId: null,
    reason: 'Consulta de rotina',
    priority: 'high' as const,
    status: 'waiting' as const,
    checkedInAt: '2026-04-05T09:00:00Z',
    calledAt: null,
    encounterId: null,
    createdAt: '2026-04-05T09:00:00Z',
    updatedAt: '2026-04-05T09:00:00Z'
  },
  {
    id: 'q-2',
    accountId: 'acc-1',
    patientId: 'pat-2',
    ownerId: 'owner-2',
    appointmentId: null,
    reason: 'Emergência',
    priority: 'critical' as const,
    status: 'called' as const,
    checkedInAt: '2026-04-05T08:30:00Z',
    calledAt: '2026-04-05T08:45:00Z',
    encounterId: null,
    createdAt: '2026-04-05T08:30:00Z',
    updatedAt: '2026-04-05T08:45:00Z'
  },
  {
    id: 'q-3',
    accountId: 'acc-1',
    patientId: 'pat-3',
    ownerId: 'owner-1',
    appointmentId: null,
    reason: 'Retorno',
    priority: 'medium' as const,
    status: 'in_care' as const,
    checkedInAt: '2026-04-05T07:00:00Z',
    calledAt: '2026-04-05T07:15:00Z',
    encounterId: 'enc-1',
    createdAt: '2026-04-05T07:00:00Z',
    updatedAt: '2026-04-05T07:15:00Z'
  },
  {
    id: 'q-4',
    accountId: 'acc-1',
    patientId: 'pat-4',
    ownerId: 'owner-3',
    appointmentId: null,
    reason: 'Não compareceu',
    priority: 'low' as const,
    status: 'cancelled' as const,
    checkedInAt: '2026-04-05T06:00:00Z',
    calledAt: null,
    encounterId: null,
    createdAt: '2026-04-05T06:00:00Z',
    updatedAt: '2026-04-05T06:30:00Z'
  }
];

const mockListQueueFn = vi.fn().mockResolvedValue(mockQueueEntries);
const mockCallQueueEntryFn = vi.fn().mockResolvedValue({
  ...mockQueueEntries[0],
  status: 'called' as const,
  calledAt: '2026-04-05T10:00:00Z'
});
const mockEncounterCreateFn = vi.fn().mockResolvedValue({ id: 'enc-new' });
const mockEncounterTransitionFn = vi.fn().mockResolvedValue({ id: 'enc-new', status: 'in_triage' });
const mockRouterPush = vi.fn();
const mockNoShowQueueEntryFn = vi.fn().mockResolvedValue({
  ...mockQueueEntries[0],
  status: 'cancelled' as const
});
const mockCheckInQueueFn = vi.fn().mockResolvedValue({
  id: 'q-new',
  accountId: 'acc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  appointmentId: null,
  reason: 'Walk-in',
  priority: 'medium' as const,
  status: 'waiting' as const,
  checkedInAt: '2026-04-05T10:00:00Z',
  calledAt: null,
  encounterId: null,
  createdAt: '2026-04-05T10:00:00Z',
  updatedAt: '2026-04-05T10:00:00Z'
});
const mockGetPatientName = vi
  .fn()
  .mockImplementation((id: string) =>
    Promise.resolve(
      id === 'pat-1' ? 'Rex' : id === 'pat-2' ? 'Mimi' : id === 'pat-3' ? 'Buddy' : 'Unknown'
    )
  );
const mockGetOwnerName = vi
  .fn()
  .mockImplementation((id: string) =>
    Promise.resolve(
      id === 'owner-1' ? 'Maria Silva' : id === 'owner-2' ? 'João Costa' : 'Tutor Desconhecido'
    )
  );

const mockPatients = [
  { id: 'pat-1', name: 'Rex', species: 'canine', primaryOwnerId: 'owner-1' },
  { id: 'pat-2', name: 'Mimi', species: 'feline', primaryOwnerId: 'owner-2' }
];
const mockPatientListFn = vi.fn().mockResolvedValue(mockPatients);

vi.mock('@/services/scheduling', () => ({
  listQueue: () => mockListQueueFn(),
  callQueueEntry: (id: string) => mockCallQueueEntryFn(id),
  noShowQueueEntry: (id: string) => mockNoShowQueueEntryFn(id),
  checkInQueue: (payload: unknown) => mockCheckInQueueFn(payload)
}));

vi.mock('@/services/encounter', () => ({
  encounterService: {
    create: (payload: unknown) => mockEncounterCreateFn(payload),
    transition: (...args: unknown[]) => mockEncounterTransitionFn(...args)
  }
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush
  })
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    get list() {
      return mockPatientListFn;
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

describe('QueuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListQueueFn.mockResolvedValue(mockQueueEntries);
    mockCallQueueEntryFn.mockResolvedValue({
      ...mockQueueEntries[0],
      status: 'called' as const,
      calledAt: '2026-04-05T10:00:00Z'
    });
    mockEncounterCreateFn.mockResolvedValue({ id: 'enc-new' });
    mockEncounterTransitionFn.mockResolvedValue({ id: 'enc-new', status: 'in_triage' });
    mockRouterPush.mockResolvedValue(undefined);
    mockNoShowQueueEntryFn.mockResolvedValue({
      ...mockQueueEntries[0],
      status: 'cancelled' as const
    });
    mockCheckInQueueFn.mockResolvedValue({
      id: 'q-new',
      accountId: 'acc-1',
      patientId: 'pat-1',
      ownerId: 'owner-1',
      appointmentId: null,
      reason: 'Walk-in',
      priority: 'medium' as const,
      status: 'waiting' as const,
      checkedInAt: '2026-04-05T10:00:00Z',
      calledAt: null,
      encounterId: null,
      createdAt: '2026-04-05T10:00:00Z',
      updatedAt: '2026-04-05T10:00:00Z'
    });
    mockPatientListFn.mockResolvedValue(mockPatients);
  });

  it('renders the page title', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div class="ds-modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Esteira de Atendimento');
  });

  it('shows loading state initially', async () => {
    let resolvePromise: (value: typeof mockQueueEntries) => void;
    const slowPromise = new Promise<typeof mockQueueEntries>((resolve) => {
      resolvePromise = resolve;
    });
    mockListQueueFn.mockImplementation(() => slowPromise);

    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.page-loading').exists()).toBe(true);

    resolvePromise!(mockQueueEntries);
    await flushPromises();
  });

  it('shows error state when API fails', async () => {
    mockListQueueFn.mockRejectedValue(new Error('Erro ao carregar fila'));

    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Erro ao carregar fila');
  });

  it('shows empty state when queue is empty', async () => {
    mockListQueueFn.mockResolvedValue([]);

    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: {
            template: '<div class="empty-state-stub">Nenhuma comanda nesta esteira</div>',
            props: ['icon', 'title', 'description', 'size']
          }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhuma comanda nesta esteira');
  });

  it('renders the Vetus-like filter bar and operational table columns', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Setor Atual');
    expect(wrapper.text()).toContain('Profissional Responsável');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('ID Animal');
    expect(wrapper.text()).toContain('Todas');
    expect(wrapper.text()).toContain('Recebido em');
    expect(wrapper.text()).toContain('Enviado por');
    expect(wrapper.text()).toContain('Em atendimento com');
    expect(wrapper.text()).toContain('Atendimento');
    expect(wrapper.text()).toContain('Urgência');
    expect(wrapper.text()).toContain('Comanda');
    expect(wrapper.text()).toContain('Prontuário');
    expect(wrapper.text()).toContain('Maria Silva');
    expect(wrapper.text()).toContain('RECEPÇÃO');
  });

  it('renders queue entries with status badges for all lifecycle states', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span class="ds-badge-stub"><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const badges = wrapper.findAll('.ds-badge-stub');
    const badgeTexts = badges.map((b) => b.text());

    expect(badgeTexts).toContain('Alta');
    expect(badgeTexts).toContain('Crítica');
    expect(badgeTexts).toContain('Média');
    expect(badgeTexts).toContain('Baixa');

    expect(wrapper.text()).toContain('Aguardando');
    expect(wrapper.text()).toContain('Chamado');
    expect(wrapper.text()).toContain('Em Atendimento');
    expect(wrapper.text()).toContain('Cancelado');
  });

  it('shows call button only for waiting entries', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const callButtons = wrapper.findAll('.ds-btn-stub').filter((b) => b.text().includes('Chamar'));

    expect(callButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('calls callQueueEntry API when call button is clicked', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const callButton = wrapper.findAll('.ds-btn-stub').find((b) => b.text().includes('Chamar'));

    if (callButton) {
      await callButton.trigger('click');
      expect(mockCallQueueEntryFn).toHaveBeenCalledWith('q-1');
    }
  });

  it('sorts entries by priority then check-in time', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span class="ds-badge-stub"><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const badges = wrapper.findAll('.ds-badge-stub');
    const priorityBadges = badges.filter((b) =>
      ['Crítica', 'Alta', 'Média', 'Baixa'].includes(b.text())
    );

    expect(priorityBadges[0].text()).toBe('Crítica');
    expect(priorityBadges[1].text()).toBe('Alta');
    expect(priorityBadges[2].text()).toBe('Média');
    expect(priorityBadges[3].text()).toBe('Baixa');
  });

  it('renders patient names resolved from entity cache', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    expect(mockGetPatientName).toHaveBeenCalledWith('pat-1');
    expect(mockGetPatientName).toHaveBeenCalledWith('pat-2');
    expect(mockGetPatientName).toHaveBeenCalledWith('pat-3');
    expect(mockGetPatientName).toHaveBeenCalledWith('pat-4');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Mimi');
    expect(wrapper.text()).toContain('Buddy');
  });

  it('displays wait times for each entry', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toMatch(/\d+min/);
  });

  it('shows error when callQueueEntry fails', async () => {
    mockCallQueueEntryFn.mockRejectedValue(new Error('Erro ao chamar paciente'));

    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const callButton = wrapper.findAll('.ds-btn-stub').find((b) => b.text().includes('Chamar'));

    if (callButton) {
      await callButton.trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('Erro ao chamar paciente');
    }
  });

  // Sprint 3: Encounter flow tests

  it('shows encounter action button for called entries', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const startCareButtons = wrapper
      .findAll('.ds-btn-stub')
      .filter((b) => b.text().includes('Abrir triagem'));

    expect(startCareButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show encounter action button for waiting entries', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    const waitingRow = rows.find((row) => row.text().includes('Aguardando'));
    if (waitingRow) {
      const rowButtons = waitingRow.findAll('.ds-btn-stub');
      const hasStartCare = rowButtons.some((b) => b.text().includes('Abrir triagem'));
      expect(hasStartCare).toBe(false);
    }
  });

  it('opens encounter flow from a called queue entry', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const startCareButton = wrapper
      .findAll('.ds-btn-stub')
      .find((b) => b.text().includes('Abrir triagem'));

    if (startCareButton) {
      await startCareButton.trigger('click');
      await flushPromises();
      expect(mockEncounterCreateFn).toHaveBeenCalledWith({
        patientId: 'pat-2',
        ownerId: 'owner-2',
        appointmentId: undefined,
        queueEntryId: 'q-2',
        visitType: 'walk_in',
        origin: 'reception',
        reason: 'Emergência'
      });
      expect(mockEncounterTransitionFn).toHaveBeenCalledWith('enc-new', { nextStatus: 'in_triage' });
      expect(mockRouterPush).toHaveBeenCalledWith('/encounters/enc-new');
    }
  });

  it('shows error when encounter flow fails', async () => {
    mockEncounterCreateFn.mockRejectedValue(new Error('Erro ao abrir atendimento'));

    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const startCareButton = wrapper
      .findAll('.ds-btn-stub')
      .find((b) => b.text().includes('Abrir triagem'));

    if (startCareButton) {
      await startCareButton.trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('Erro ao abrir atendimento');
    }
  });

  // Sprint 3: No-show tests

  it('shows no-show button for waiting entries', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    const waitingRow = rows.find((row) => row.text().includes('Aguardando'));

    expect(waitingRow).toBeTruthy();
    if (waitingRow) {
      const rowButtons = waitingRow.findAll('.ds-btn-stub');
      const hasNoShow = rowButtons.some((b) => b.text().includes('No-Show'));
      expect(hasNoShow).toBe(true);
    }
  });

  it('does not show no-show button for cancelled entries', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    const cancelledRow = rows.find((row) => row.text().includes('Cancelado'));

    expect(cancelledRow).toBeTruthy();
    if (cancelledRow) {
      const rowButtons = cancelledRow.findAll('.ds-btn-stub');
      const hasNoShow = rowButtons.some((b) => b.text().includes('No-Show'));
      expect(hasNoShow).toBe(false);
    }
  });

  it('calls noShowQueueEntry API only after confirmation', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div class="ds-modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' },
          SearchSelect: {
            template: '<div class="search-select-stub"><slot /></div>',
            props: ['modelValue', 'options', 'placeholder']
          }
        }
      }
    });

    await flushPromises();

    // Clicking No-Show should open confirmation modal, NOT call API immediately
    const noShowButton = wrapper.findAll('.ds-btn-stub').find((b) => b.text().includes('No-Show'));
    expect(noShowButton).toBeTruthy();

    if (noShowButton) {
      await noShowButton.trigger('click');
      await wrapper.vm.$nextTick();
      // API should NOT have been called yet — confirmation modal should be open
      expect(mockNoShowQueueEntryFn).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('Confirmar No-Show');

      // Now confirm via vm
      const vm = wrapper.vm as any;
      await vm.confirmNoShow();
      await flushPromises();

      expect(mockNoShowQueueEntryFn).toHaveBeenCalled();
    }
  });

  it('shows confirmation modal text for no-show', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div class="ds-modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' },
          SearchSelect: {
            template: '<div class="search-select-stub"><slot /></div>',
            props: ['modelValue', 'options', 'placeholder']
          }
        }
      }
    });

    await flushPromises();

    const vm = wrapper.vm as any;
    vm.openNoShowConfirm('q-1');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('não compareceu');
    expect(wrapper.text()).toContain('cancelado');
  });

  it('shows error when noShowQueueEntry fails', async () => {
    mockNoShowQueueEntryFn.mockRejectedValue(new Error('Erro ao registrar no-show'));

    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div class="ds-modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' },
          SearchSelect: {
            template: '<div class="search-select-stub"><slot /></div>',
            props: ['modelValue', 'options', 'placeholder']
          }
        }
      }
    });

    await flushPromises();

    const noShowButton = wrapper.findAll('.ds-btn-stub').find((b) => b.text().includes('No-Show'));

    if (noShowButton) {
      await noShowButton.trigger('click');
      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;
      await vm.confirmNoShow();
      await flushPromises();
      expect(wrapper.text()).toContain('Erro ao registrar no-show');
    }
  });

  // Sprint 3: Check-in modal tests

  it('shows check-in button in page header', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const checkinButton = wrapper
      .findAll('.ds-btn-stub')
      .find((b) => b.text().includes('Check-in Rápido'));

    expect(checkinButton).toBeTruthy();
  });

  it('loads patients on mount for check-in modal', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();
    expect(mockPatientListFn).toHaveBeenCalled();
  });

  it('calls checkInQueue API and reloads queue on successful check-in', async () => {
    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div class="ds-modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const vm = wrapper.vm as any;
    vm.showCheckInModal = true;
    vm.checkinForm.patientId = 'pat-1';
    vm.checkinForm.reason = 'Walk-in urgente';
    await wrapper.vm.$nextTick();

    await vm.submitCheckIn();
    await flushPromises();

    expect(mockCheckInQueueFn).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'pat-1',
        reason: 'Walk-in urgente'
      })
    );
    expect(wrapper.text()).toContain('Check-in realizado com sucesso!');
  });

  it('shows error when checkInQueue fails', async () => {
    mockCheckInQueueFn.mockRejectedValue(new Error('Erro ao realizar check-in'));

    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div class="ds-modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();

    const vm = wrapper.vm as any;
    vm.showCheckInModal = true;
    vm.checkinForm.patientId = 'pat-1';
    vm.checkinForm.reason = 'Walk-in';
    await wrapper.vm.$nextTick();

    await vm.submitCheckIn();
    await flushPromises();

    expect(wrapper.text()).toContain('Erro ao realizar check-in');
  });

  // Sprint 4b: Polling backoff and visibility tests

  it('implements exponential backoff on consecutive refresh errors', async () => {
    // Setup: first call (initial load) succeeds, next two background calls fail, then next succeeds
    mockListQueueFn
      .mockResolvedValueOnce(mockQueueEntries) // initial load success
      .mockRejectedValueOnce(new Error('Erro 1')) // first background error
      .mockRejectedValueOnce(new Error('Erro 2')) // second background error
      .mockResolvedValueOnce(mockQueueEntries); // third background success

    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div class="ds-modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' },
          SearchSelect: {
            template: '<div class="search-select-stub"><slot /></div>',
            props: ['modelValue', 'options', 'placeholder']
          }
        }
      }
    });

    // Initial load succeeds
    await flushPromises();
    expect(mockListQueueFn).toHaveBeenCalledTimes(1);

    const vm = wrapper.vm as any;

    // First background refresh error
    await vm.loadQueue(true);
    await flushPromises();
    expect(vm.consecutiveErrors).toBe(1);
    expect(vm.currentInterval).toBeGreaterThan(vm.baseInterval);

    // Second background refresh error
    await vm.loadQueue(true);
    await flushPromises();
    expect(vm.consecutiveErrors).toBe(2);
    expect(vm.currentInterval).toBeGreaterThan(vm.baseInterval * 2);

    // Successful background refresh resets backoff
    await vm.loadQueue(true);
    await flushPromises();
    expect(vm.consecutiveErrors).toBe(0);
    expect(vm.currentInterval).toBe(vm.baseInterval);
  });

  it('stops polling when document becomes hidden and resumes on visible', async () => {
    // Ensure document starts visible to trigger polling
    Object.defineProperty(document, 'hidden', { value: false, writable: true });

    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div class="ds-modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' },
          SearchSelect: {
            template: '<div class="search-select-stub"><slot /></div>',
            props: ['modelValue', 'options', 'placeholder']
          }
        }
      }
    });

    // Wait for initial load and polling start
    await flushPromises();
    await flushPromises(); // ensure all async resolved

    const vm = wrapper.vm as any;
    // Polling should be active initially
    expect(vm.pollTimer).not.toBeNull();

    // Simulate tab hidden
    Object.defineProperty(document, 'hidden', { value: true, writable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await wrapper.vm.$nextTick();
    expect(vm.pollTimer).toBeNull(); // polling stopped

    // Simulate tab visible again
    Object.defineProperty(document, 'hidden', { value: false, writable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await flushPromises();
    expect(vm.pollTimer).not.toBeNull(); // polling restarted
    // Also verify foreground refresh happened
    expect(mockListQueueFn.mock.calls.length).toBeGreaterThan(1);
  });

  it('manual refresh triggers foreground load regardless of visibility', async () => {
    mockListQueueFn.mockResolvedValue(mockQueueEntries);

    const QueuePage = (await import('../QueuePage.vue')).default;
    const wrapper = mount(QueuePage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" />' },
          DsModal: {
            template: '<div class="ds-modal-stub"><slot /><slot name="footer" /></div>',
            props: ['open', 'title', 'size']
          },
          EmptyState: { template: '<div class="empty-state-stub" />' },
          SearchSelect: {
            template: '<div class="search-select-stub"><slot /></div>',
            props: ['modelValue', 'options', 'placeholder']
          }
        }
      }
    });

    await flushPromises(); // initial load

    const vm = wrapper.vm as any;
    const beforeCalls = mockListQueueFn.mock.calls.length;

    // manualRefresh triggers loadQueue with background=false
    vm.manualRefresh();
    // Check that loading is set to true synchronously
    expect(wrapper.vm.loading).toBe(true);

    await flushPromises();
    // After completion, there should be one more call
    expect(mockListQueueFn.mock.calls.length).toBeGreaterThan(beforeCalls);
  });
});

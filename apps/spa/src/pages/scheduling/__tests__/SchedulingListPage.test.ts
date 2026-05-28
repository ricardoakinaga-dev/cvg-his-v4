import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockAppointments = [
  {
    id: 'apt-1',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    scheduledAt: '2026-04-20T10:00:00.000Z',
    visitType: 'scheduled' as const,
    reason: 'Consulta de rotina',
    status: 'scheduled' as const,
    createdAt: '2026-04-19T10:00:00.000Z',
    updatedAt: '2026-04-19T10:00:00.000Z'
  },
  {
    id: 'apt-2',
    accountId: 'acc-1',
    patientId: 'pat-2',
    ownerId: 'owner-2',
    scheduledAt: '2026-04-20T11:00:00.000Z',
    visitType: 'walk_in' as const,
    reason: 'Febre e letargia',
    status: 'checked_in' as const,
    createdAt: '2026-04-20T09:00:00.000Z',
    updatedAt: '2026-04-20T09:00:00.000Z'
  },
  {
    id: 'apt-3',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    scheduledAt: '2026-04-18T14:00:00.000Z',
    visitType: 'return' as const,
    reason: 'Retorno',
    status: 'completed' as const,
    createdAt: '2026-04-18T08:00:00.000Z',
    updatedAt: '2026-04-18T15:00:00.000Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockAppointments);
const mockCancelFn = vi.fn().mockResolvedValue(mockAppointments[0]);
const mockRescheduleFn = vi.fn().mockResolvedValue({
  ...mockAppointments[0],
  scheduledAt: '2026-04-20T13:30:00.000Z',
  durationMinutes: 45,
  reason: 'Consulta reagendada'
});
const mockGetPatientName = vi
  .fn()
  .mockImplementation((id: string) => Promise.resolve(id === 'pat-1' ? 'Rex' : 'Mimi'));

vi.mock('@/services/appointment', () => ({
  appointmentService: {
    get list() {
      return mockListFn;
    },
    get cancel() {
      return mockCancelFn;
    },
    get reschedule() {
      return mockRescheduleFn;
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

describe('SchedulingListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue(mockAppointments);
    mockCancelFn.mockResolvedValue(mockAppointments[0]);
    mockRescheduleFn.mockResolvedValue({
      ...mockAppointments[0],
      scheduledAt: '2026-04-20T13:30:00.000Z',
      durationMinutes: 45,
      reason: 'Consulta reagendada'
    });
  });

  it('renders the page title', async () => {
    const SchedulingListPage = (await import('../SchedulingListPage.vue')).default;
    const wrapper = mount(SchedulingListPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" role="status" />' },
          EmptyState: { template: '<div class="empty-state-stub" />' },
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Agenda');
  });

  it('shows loading state initially', async () => {
    let resolvePromise: (value: typeof mockAppointments) => void;
    const slowPromise = new Promise<typeof mockAppointments>((resolve) => {
      resolvePromise = resolve;
    });
    mockListFn.mockImplementation(() => slowPromise);

    const SchedulingListPage = (await import('../SchedulingListPage.vue')).default;
    const wrapper = mount(SchedulingListPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" role="status" />' },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);

    resolvePromise!(mockAppointments);
    await flushPromises();
  });

  it('shows error state when API fails', async () => {
    mockListFn.mockRejectedValue(new Error('Falha ao carregar agenda'));

    const SchedulingListPage = (await import('../SchedulingListPage.vue')).default;
    const wrapper = mount(SchedulingListPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" role="status" />' },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Falha ao carregar agenda');
  });

  it('shows empty state when no appointments exist', async () => {
    mockListFn.mockResolvedValue([]);

    const SchedulingListPage = (await import('../SchedulingListPage.vue')).default;
    const wrapper = mount(SchedulingListPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" role="status" />' },
          EmptyState: {
            template: '<div class="empty-state-stub">Nenhum agendamento encontrado.</div>',
            props: ['icon', 'title', 'description', 'size']
          }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum agendamento encontrado.');
  });

  it('renders appointments in table with status badges', async () => {
    const SchedulingListPage = (await import('../SchedulingListPage.vue')).default;
    const wrapper = mount(SchedulingListPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span class="ds-badge-stub"><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" role="status" />' },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Agendado');
    expect(wrapper.text()).toContain('Check-in');
    expect(wrapper.text()).toContain('Concluído');
  });

  it('resolves patient names via entity cache and displays them', async () => {
    const SchedulingListPage = (await import('../SchedulingListPage.vue')).default;
    const wrapper = mount(SchedulingListPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" role="status" />' },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();
    expect(mockGetPatientName).toHaveBeenCalledWith('pat-1');
    expect(mockGetPatientName).toHaveBeenCalledWith('pat-2');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Mimi');
  });

  it('shows cancel button only for cancellable statuses', async () => {
    const SchedulingListPage = (await import('../SchedulingListPage.vue')).default;
    const wrapper = mount(SchedulingListPage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" role="status" />' },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();
    const buttons = wrapper.findAll('.ds-btn-stub');
    const cancelButtons = buttons.filter((b) => b.text().includes('Cancelar'));
    expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('calls cancel API and reloads on cancel', async () => {
    const SchedulingListPage = (await import('../SchedulingListPage.vue')).default;
    const wrapper = mount(SchedulingListPage, {
      global: {
        stubs: {
          DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsSpinner: { template: '<div class="ds-spinner-stub" role="status" />' },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();
    const cancelButton = wrapper.findAll('.ds-btn-stub').find((b) => b.text().includes('Cancelar'));
    if (cancelButton) {
      await cancelButton.trigger('click');
      expect(mockCancelFn).toHaveBeenCalled();
    }
  });

  it('opens reschedule modal, submits payload and reloads appointments', async () => {
    const SchedulingListPage = (await import('../SchedulingListPage.vue')).default;
    const wrapper = mount(SchedulingListPage, {
      global: {
        stubs: {
          DsButton: {
            props: ['type'],
            template: '<button class="ds-btn-stub" :type="type || \'button\'"><slot /></button>'
          },
          DsBadge: { template: '<span><slot /></span>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsModal: {
            props: ['open'],
            template: '<div v-if="open" class="ds-modal-stub"><slot /></div>'
          },
          DsSpinner: { template: '<div class="ds-spinner-stub" role="status" />' },
          EmptyState: { template: '<div class="empty-state-stub" />' }
        }
      }
    });

    await flushPromises();
    const rescheduleButton = wrapper
      .findAll('.ds-btn-stub')
      .find((button) => button.text().includes('Reagendar'));
    expect(rescheduleButton).toBeTruthy();

    await rescheduleButton!.trigger('click');
    await wrapper.find('#reschedule-scheduled-at').setValue('2026-04-20T13:30');
    await wrapper.find('#reschedule-duration').setValue('45');
    await wrapper.find('#reschedule-reason').setValue('Consulta reagendada');
    await wrapper.find('form.reschedule-form').trigger('submit');
    await flushPromises();

    expect(mockRescheduleFn).toHaveBeenCalledWith(
      'apt-1',
      expect.objectContaining({
        durationMinutes: 45,
        reason: 'Consulta reagendada'
      })
    );
    expect(mockListFn).toHaveBeenCalledTimes(2);
  });
});

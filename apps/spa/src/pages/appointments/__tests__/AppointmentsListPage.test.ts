import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockAppointments = [
  {
    id: 'appt-1',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    scheduledAt: '2024-01-15T10:00:00Z',
    visitType: 'scheduled' as const,
    reason: 'Consulta de rotina',
    status: 'scheduled' as const,
    createdAt: '2024-01-14T10:00:00Z',
    updatedAt: '2024-01-14T10:00:00Z'
  },
  {
    id: 'appt-2',
    accountId: 'acc-1',
    patientId: 'pat-2',
    ownerId: 'owner-2',
    scheduledAt: '2024-01-15T11:00:00Z',
    visitType: 'walk_in' as const,
    reason: 'Animal com febre e letargia',
    status: 'checked_in' as const,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z'
  },
  {
    id: 'appt-3',
    accountId: 'acc-1',
    patientId: 'pat-3',
    ownerId: 'owner-1',
    scheduledAt: '2024-01-14T14:00:00Z',
    visitType: 'return' as const,
    reason: 'Retorno pos-cirurgico',
    status: 'completed' as const,
    createdAt: '2024-01-14T08:00:00Z',
    updatedAt: '2024-01-14T15:00:00Z'
  },
  {
    id: 'appt-4',
    accountId: 'acc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1',
    scheduledAt: '2024-01-16T09:00:00Z',
    visitType: 'scheduled' as const,
    reason: 'Exames de sangue',
    status: 'cancelled' as const,
    createdAt: '2024-01-13T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockAppointments);
const mockGetPatientName = vi
  .fn()
  .mockImplementation((id: string) =>
    Promise.resolve(id === 'pat-1' ? 'Rex' : id === 'pat-2' ? 'Mimi' : 'Buddy')
  );
const mockGetOwnerName = vi
  .fn()
  .mockImplementation((id: string) =>
    Promise.resolve(id === 'owner-1' ? 'Joao Silva' : 'Maria Santos')
  );
const mockRouterPush = vi.fn();

vi.mock('@/services/appointment', () => ({
  appointmentService: {
    get list() {
      return mockListFn;
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
  useRouter: () => ({
    push: mockRouterPush
  })
}));

describe('AppointmentsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue(mockAppointments);
    mockGetPatientName.mockImplementation((id: string) =>
      Promise.resolve(id === 'pat-1' ? 'Rex' : id === 'pat-2' ? 'Mimi' : 'Buddy')
    );
    mockGetOwnerName.mockImplementation((id: string) =>
      Promise.resolve(id === 'owner-1' ? 'Joao Silva' : 'Maria Santos')
    );
    mockRouterPush.mockResolvedValue(undefined);
  });

  it('renders the page title', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Agenda');
  });

  it('shows loading state initially', async () => {
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockListFn.mockImplementation(() => slowPromise);

    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.page-loading').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'DsSpinner' }).exists()).toBe(true);

    resolvePromise!(mockAppointments);
    await flushPromises();
  });

  it('shows error state when API fails', async () => {
    mockListFn.mockRejectedValue(new Error('Failed to load appointments'));

    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    expect(wrapper.find('.ds-alert-stub').exists()).toBe(true);
  });

  it('shows empty state when no appointments exist', async () => {
    mockListFn.mockResolvedValue([]);

    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum agendamento encontrado');
  });

  it('renders kanban columns for each status', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage, {
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
    const columns = wrapper.findAll('.kanban-column');
    expect(columns).toHaveLength(4);

    const headers = columns.map((col) => col.find('.kanban-column__header').text());
    expect(headers[0]).toContain('Agendados');
    expect(headers[1]).toContain('Em Atendimento');
    expect(headers[2]).toContain('Conclu');
    expect(headers[3]).toContain('Cancelados');
  });

  it('shows correct column counts', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    const columns = wrapper.findAll('.kanban-column');
    const counts = columns.map((col) => col.find('.kanban-column__count').text());
    expect(counts[0]).toBe('1');
    expect(counts[1]).toBe('1');
    expect(counts[2]).toBe('1');
    expect(counts[3]).toBe('1');
  });

  it('renders kanban cards with patient and owner names', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Mimi');
    expect(wrapper.text()).toContain('Buddy');
    expect(wrapper.text()).toContain('Joao Silva');
    expect(wrapper.text()).toContain('Maria Santos');
  });

  it('renders visit type labels on cards', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Agendado');
    expect(wrapper.text()).toContain('Walk-in');
    expect(wrapper.text()).toContain('Retorno');
  });

  it('renders card reasons on kanban cards', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Consulta de rotina');
    expect(wrapper.text()).toContain('Animal com febre e letargia');
    expect(wrapper.text()).toContain('Retorno pos-cirurgico');
    expect(wrapper.text()).toContain('Exames de sangue');
  });

  it('renders scheduled times on cards', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage, {
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
    const timeElements = wrapper.findAll('.kanban-card__time');
    expect(timeElements).toHaveLength(4);
    expect(timeElements[0].text().length).toBeGreaterThan(0);
  });

  it('groups appointments into correct kanban columns by status', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    const columns = wrapper.findAll('.kanban-column');

    const scheduledColumn = columns[0];
    expect(scheduledColumn.text()).toContain('Rex');
    expect(scheduledColumn.text()).toContain('Consulta de rotina');

    const checkedInColumn = columns[1];
    expect(checkedInColumn.text()).toContain('Mimi');
    expect(checkedInColumn.text()).toContain('Animal com febre');

    const completedColumn = columns[2];
    expect(completedColumn.text()).toContain('Buddy');
    expect(completedColumn.text()).toContain('Retorno pos-cirurgico');

    const cancelledColumn = columns[3];
    expect(cancelledColumn.text()).toContain('Rex');
    expect(cancelledColumn.text()).toContain('Exames de sangue');
  });

  it('shows multiple items in same column when status matches', async () => {
    const multiScheduled = [
      ...mockAppointments,
      {
        id: 'appt-5',
        accountId: 'acc-1',
        patientId: 'pat-2',
        ownerId: 'owner-2',
        scheduledAt: '2024-01-15T14:00:00Z',
        visitType: 'scheduled' as const,
        reason: 'Vacina anual',
        status: 'scheduled' as const,
        createdAt: '2024-01-14T10:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z'
      }
    ];
    mockListFn.mockResolvedValue(multiScheduled);

    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    const columns = wrapper.findAll('.kanban-column');
    const counts = columns.map((col) => col.find('.kanban-column__count').text());
    expect(counts[0]).toBe('2');

    const scheduledCards = columns[0].findAll('.kanban-card');
    expect(scheduledCards).toHaveLength(2);
  });

  it('shows link to create new appointment', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage, {
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
    const newLink = wrapper.findAll('a').find((a) => a.text().includes('Novo Agendamento'));
    expect(newLink).toBeTruthy();
    expect(newLink!.attributes('href')).toBe('/appointments/new');
  });

  it('has status filter select with correct options', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage, {
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
    const select = wrapper.find('select');
    expect(select.exists()).toBe(true);

    const options = select.findAll('option');
    expect(options).toHaveLength(5);
    expect(options[0].text()).toBe('Todos status');
    expect(options[1].text()).toContain('Agendado');
    expect(options[2].text()).toContain('Em atendimento');
    expect(options[3].text()).toContain('Conclu');
    expect(options[4].text()).toContain('Cancelado');
  });

  it('has search input with correct placeholder', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    const searchInput = wrapper.find('input[type="search"]');
    expect(searchInput.exists()).toBe(true);
    expect(searchInput.attributes('placeholder')).toBe('Buscar paciente ou tutor...');
  });

  it('filters appointments by status when filter is applied', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    const select = wrapper.find('select');
    select.setValue('scheduled');
    await wrapper.vm.$nextTick();

    const columns = wrapper.findAll('.kanban-column');
    const scheduledCards = columns[0].findAll('.kanban-card');
    expect(scheduledCards).toHaveLength(1);
    expect(columns[1].findAll('.kanban-card')).toHaveLength(0);
    expect(columns[2].findAll('.kanban-card')).toHaveLength(0);
    expect(columns[3].findAll('.kanban-card')).toHaveLength(0);
  });

  it('shows empty state when filter results in no matches', async () => {
    mockListFn.mockResolvedValue([mockAppointments[0]]);

    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage);

    await flushPromises();
    const select = wrapper.find('select');
    select.setValue('checked_in');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Nenhum agendamento encontrado');
    expect(wrapper.find('.kanban-view').exists()).toBe(false);
  });

  it('clicking a card navigates to appointment detail', async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    const wrapper = mount(AppointmentsListPage, {
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
    const firstCard = wrapper.find('.kanban-card');
    await firstCard.trigger('click');

    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/appointments/appt-1',
      state: { appointment: expect.any(Object) }
    });
  });
});

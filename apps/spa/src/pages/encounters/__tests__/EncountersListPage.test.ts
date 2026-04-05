import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockEncounters = [
  {
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
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'enc-2',
    accountId: 'acc-1',
    patientId: 'pat-2',
    ownerId: 'owner-2',
    visitType: 'scheduled' as const,
    origin: 'schedule' as const,
    reason: 'Retorno pós-cirúrgico',
    status: 'in_care' as const,
    openedAt: '2024-01-15T09:00:00Z',
    closedAt: undefined,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z'
  },
  {
    id: 'enc-3',
    accountId: 'acc-1',
    patientId: 'pat-3',
    ownerId: 'owner-1',
    visitType: 'return' as const,
    origin: 'return' as const,
    reason: 'Troca de curativo',
    status: 'closed' as const,
    openedAt: '2024-01-14T14:00:00Z',
    closedAt: '2024-01-14T15:00:00Z',
    createdAt: '2024-01-14T14:00:00Z',
    updatedAt: '2024-01-14T15:00:00Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockEncounters);
const mockGetPatientName = vi
  .fn()
  .mockImplementation((id: string) =>
    Promise.resolve(id === 'pat-1' ? 'Rex' : id === 'pat-2' ? 'Mimi' : 'Buddy')
  );

vi.mock('@/services/encounter', () => ({
  encounterService: {
    get list() {
      return mockListFn;
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

describe('EncountersListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue(mockEncounters);
    mockGetPatientName.mockImplementation((id: string) =>
      Promise.resolve(id === 'pat-1' ? 'Rex' : id === 'pat-2' ? 'Mimi' : 'Buddy')
    );
  });

  it('renders the page title', async () => {
    const EncountersListPage = (await import('../EncountersListPage.vue')).default;
    const wrapper = mount(EncountersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Atendimentos');
  });

  it('shows loading state initially', async () => {
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockListFn.mockImplementation(() => slowPromise);

    const EncountersListPage = (await import('../EncountersListPage.vue')).default;
    const wrapper = mount(EncountersListPage);

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.data-table-loading').exists()).toBe(true);

    resolvePromise!(mockEncounters);
    await flushPromises();
  });

  it('shows error state when API fails', async () => {
    mockListFn.mockRejectedValue(new Error('Failed to load encounters'));

    const EncountersListPage = (await import('../EncountersListPage.vue')).default;
    const wrapper = mount(EncountersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load encounters');
  });

  it('renders encounter data in the table', async () => {
    const EncountersListPage = (await import('../EncountersListPage.vue')).default;
    const wrapper = mount(EncountersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Mimi');
    expect(wrapper.text()).toContain('Buddy');
  });

  it('shows visit type labels', async () => {
    const EncountersListPage = (await import('../EncountersListPage.vue')).default;
    const wrapper = mount(EncountersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Walk-in');
    expect(wrapper.text()).toContain('Agendado');
    expect(wrapper.text()).toContain('Retorno');
  });

  it('shows encounter status labels', async () => {
    const EncountersListPage = (await import('../EncountersListPage.vue')).default;
    const wrapper = mount(EncountersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Recepção');
    expect(wrapper.text()).toContain('Em atendimento');
    expect(wrapper.text()).toContain('Finalizado');
  });

  it('truncates long reason text', async () => {
    const EncountersListPage = (await import('../EncountersListPage.vue')).default;
    const wrapper = mount(EncountersListPage);

    await flushPromises();
    const reasonCells = wrapper.findAll('.reason-cell');
    expect(reasonCells.length).toBeGreaterThan(0);
    reasonCells.forEach((cell) => {
      expect(cell.text().length).toBeLessThanOrEqual(43);
    });
  });

  it('shows navigation links to detail page', async () => {
    const EncountersListPage = (await import('../EncountersListPage.vue')).default;
    const wrapper = mount(EncountersListPage, {
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
    const detailLinks = wrapper.findAll('a').filter((a) => a.text() === 'Ver');
    expect(detailLinks).toHaveLength(3);
    expect(detailLinks[0].attributes('href')).toBe('/encounters/enc-1');
    expect(detailLinks[1].attributes('href')).toBe('/encounters/enc-2');
    expect(detailLinks[2].attributes('href')).toBe('/encounters/enc-3');
  });

  it('shows link to open new encounter', async () => {
    const EncountersListPage = (await import('../EncountersListPage.vue')).default;
    const wrapper = mount(EncountersListPage, {
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
    const newLink = wrapper.findAll('a').find((a) => a.text().includes('Abrir Atendimento'));
    expect(newLink).toBeTruthy();
    expect(newLink!.attributes('href')).toBe('/encounters/new');
  });
});

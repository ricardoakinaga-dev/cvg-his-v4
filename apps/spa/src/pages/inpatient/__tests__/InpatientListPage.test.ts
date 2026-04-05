import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockStays = [
  {
    id: 'stay-1',
    accountId: 'acc-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    unit: 'Clinica',
    ward: 'A',
    bed: '01',
    status: 'admitted' as const,
    admittedAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'stay-2',
    accountId: 'acc-1',
    encounterId: 'enc-2',
    patientId: 'pat-2',
    unit: 'UTI',
    ward: 'B',
    bed: '03',
    status: 'stable' as const,
    admittedAt: '2024-01-14T08:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockStays);
const mockGetPatientName = vi
  .fn()
  .mockImplementation((id: string) => Promise.resolve(id === 'pat-1' ? 'Rex' : 'Mimi'));

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    get list() {
      return mockListFn;
    }
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: mockGetPatientName,
    getUserName: vi.fn().mockResolvedValue(''),
    preloadUserNames: vi.fn().mockResolvedValue(undefined),
    loading: new Set()
  })
}));

describe('InpatientListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue(mockStays);
    mockGetPatientName.mockImplementation((id: string) =>
      Promise.resolve(id === 'pat-1' ? 'Rex' : 'Mimi')
    );
  });

  it('renders the page title', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Internação');
  });

  it('shows loading state initially', async () => {
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockListFn.mockImplementation(() => slowPromise);

    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.data-table-loading').exists()).toBe(true);

    resolvePromise!(mockStays);
    await flushPromises();
  });

  it('shows error state when API fails', async () => {
    mockListFn.mockRejectedValue(new Error('Failed to load stays'));

    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load stays');
  });

  it('shows empty state when no stays exist', async () => {
    mockListFn.mockResolvedValue([]);

    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhuma internação ativa');
  });

  it('renders stay data in the table', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Mimi');
    expect(wrapper.text()).toContain('Clinica');
    expect(wrapper.text()).toContain('UTI');
    expect(wrapper.text()).toContain('01');
    expect(wrapper.text()).toContain('03');
  });

  it('shows status labels for each stay', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Internado');
    expect(wrapper.text()).toContain('Estável');
  });

  it('shows navigation links to detail page', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage, {
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
    const links = wrapper.findAll('a');
    const detailLinks = links.filter((a) => a.text() === 'Ver');
    expect(detailLinks).toHaveLength(2);
    expect(detailLinks[0].attributes('href')).toBe('/inpatient/stay-1');
    expect(detailLinks[1].attributes('href')).toBe('/inpatient/stay-2');
  });

  it('shows link to bed board page', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage, {
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
    const boardLink = wrapper.findAll('a').find((a) => a.text().includes('Mapa de Leitos'));
    expect(boardLink).toBeTruthy();
    expect(boardLink!.attributes('href')).toBe('/inpatient/board');
  });

  it('shows link to admit patient', async () => {
    const InpatientListPage = (await import('../InpatientListPage.vue')).default;
    const wrapper = mount(InpatientListPage, {
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
    const admitLink = wrapper.findAll('a').find((a) => a.text().includes('Admitir Paciente'));
    expect(admitLink).toBeTruthy();
    expect(admitLink!.attributes('href')).toBe('/encounters');
  });
});

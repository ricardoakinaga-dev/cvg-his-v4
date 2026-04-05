import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockPatients = [
  {
    id: 'pat-1',
    accountId: 'acc-1',
    name: 'Rex',
    species: 'canine' as const,
    breed: 'Golden Retriever',
    sex: 'male' as const,
    size: 'large' as const,
    baseWeightKg: 30.5,
    birthDateApproximate: '2020-05-15',
    primaryOwnerId: 'owner-1',
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pat-2',
    accountId: 'acc-1',
    name: 'Mimi',
    species: 'feline' as const,
    breed: '',
    sex: 'female' as const,
    size: 'small' as const,
    baseWeightKg: 4.2,
    birthDateApproximate: '',
    primaryOwnerId: 'owner-2',
    status: 'active' as const,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockPatients);
const mockGetOwnerName = vi
  .fn()
  .mockImplementation((id: string) =>
    Promise.resolve(id === 'owner-1' ? 'João Silva' : 'Maria Santos')
  );

vi.mock('@/services/patient', () => ({
  patientService: {
    get list() {
      return mockListFn;
    }
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getOwnerName: mockGetOwnerName,
    getPatientName: vi.fn().mockResolvedValue(''),
    getUserName: vi.fn().mockResolvedValue(''),
    preloadUserNames: vi.fn().mockResolvedValue(undefined),
    loading: new Set()
  })
}));

describe('PatientsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue(mockPatients);
    mockGetOwnerName.mockImplementation((id: string) =>
      Promise.resolve(id === 'owner-1' ? 'João Silva' : 'Maria Santos')
    );
  });

  it('renders the page title', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Pacientes');
  });

  it('shows loading state initially', async () => {
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockListFn.mockImplementation(() => slowPromise);

    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.data-table-loading').exists()).toBe(true);

    resolvePromise!(mockPatients);
    await flushPromises();
  });

  it('shows error state when API fails', async () => {
    mockListFn.mockRejectedValue(new Error('Failed to load patients'));

    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load patients');
  });

  it('shows empty state when no patients exist', async () => {
    mockListFn.mockResolvedValue([]);

    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum paciente encontrado');
  });

  it('renders patient data in the table', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Mimi');
    expect(wrapper.text()).toContain('Golden Retriever');
  });

  it('shows species labels for each patient', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Canino');
    expect(wrapper.text()).toContain('Felino');
  });

  it('shows sex labels for each patient', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Macho');
    expect(wrapper.text()).toContain('Fêmea');
  });

  it('shows status labels for each patient', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Ativo');
  });

  it('resolves owner names for patients', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).toContain('Maria Santos');
  });

  it('shows navigation links to detail and edit pages', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage, {
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
    expect(detailLinks[0].attributes('href')).toBe('/patients/pat-1');
    expect(detailLinks[1].attributes('href')).toBe('/patients/pat-2');

    const editLinks = links.filter((a) => a.text() === 'Editar');
    expect(editLinks).toHaveLength(2);
    expect(editLinks[0].attributes('href')).toBe('/patients/pat-1/edit');
    expect(editLinks[1].attributes('href')).toBe('/patients/pat-2/edit');
  });

  it('shows link to create new patient', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage, {
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
    const newLink = wrapper.findAll('a').find((a) => a.text().includes('Novo Paciente'));
    expect(newLink).toBeTruthy();
    expect(newLink!.attributes('href')).toBe('/patients/new');
  });

  it('has search input with correct placeholder', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    const searchInput = wrapper.find('input[type="search"]');
    expect(searchInput.exists()).toBe(true);
    expect(searchInput.attributes('placeholder')).toBe(
      'Buscar por nome, espécie, raça ou tutor...'
    );
  });

  it('has a Buscar button', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    const searchBtn = wrapper.findAll('button').find((b) => b.text() === 'Buscar');
    expect(searchBtn).toBeTruthy();
  });
});

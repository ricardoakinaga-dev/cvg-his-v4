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

const mockOwners = [
  {
    id: 'owner-1',
    accountId: 'acc-1',
    fullName: 'João Silva',
    documentId: '123.456.789-00',
    contacts: [
      { label: 'Celular', type: 'whatsapp' as const, value: '(11) 99999-1111', primary: true },
      { label: 'Email', type: 'email' as const, value: 'joao@email.com', primary: false }
    ],
    financialResponsible: true,
    administrativeNotes: '',
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'owner-2',
    accountId: 'acc-1',
    fullName: 'Maria Santos',
    documentId: '',
    contacts: [
      { label: 'Celular', type: 'phone' as const, value: '(11) 88888-2222', primary: true }
    ],
    financialResponsible: false,
    administrativeNotes: '',
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockPatients);
const mockOwnerListFn = vi.fn().mockResolvedValue(mockOwners);
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

vi.mock('@/services/owner', () => ({
  ownerService: {
    get list() {
      return mockOwnerListFn;
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
    mockOwnerListFn.mockResolvedValue(mockOwners);
    mockGetOwnerName.mockImplementation((id: string) =>
      Promise.resolve(id === 'owner-1' ? 'João Silva' : 'Maria Santos')
    );
  });

  it('renders the page title', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Animais');
  });

  it('loads patients on mount', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    expect(mockListFn).toHaveBeenCalled();
    expect(mockOwnerListFn).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Paciente em destaque');
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

  it('renders patient data in cards', async () => {
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
    expect(wrapper.text()).toContain('Canina');
    expect(wrapper.text()).toContain('Felina');
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
    expect(wrapper.text()).toContain('123.456.789-00');
    expect(wrapper.text()).toContain('joao@email.com');
  });

  it('filters animals by owner email locally', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    await wrapper.find('input[type="search"]').setValue('joao@email.com');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).not.toContain('Mimi');
    expect(mockListFn).toHaveBeenLastCalledWith({
      species: undefined,
      status: 'all'
    });
  });

  it('shows the owner disclosure block in animal cards', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Informações do cliente');
    expect(wrapper.text()).toContain('CPF/CNPJ');
    expect(wrapper.text()).toContain('Celular');
    expect(wrapper.text()).toContain('E-mail');
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

    const detailLinks = links.filter((a) => a.text() === 'Detalhes');
    expect(detailLinks.length).toBeGreaterThanOrEqual(2);
    const detailHrefs = detailLinks.map((a) => a.attributes('href'));
    expect(detailHrefs).toContain('/patients/pat-1');
    expect(detailHrefs).toContain('/patients/pat-2');

    const editLinks = links.filter((a) => a.text() === 'Editar');
    expect(editLinks).toHaveLength(2);
    const editHrefs = editLinks.map((a) => a.attributes('href'));
    expect(editHrefs).toContain('/patients/pat-1/edit');
    expect(editHrefs).toContain('/patients/pat-2/edit');
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
    const newLink = wrapper.findAll('a').find((a) => a.text().includes('Cadastrar Novo Animal'));
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

  it('shows operational actions for each patient', async () => {
    const PatientsListPage = (await import('../PatientsListPage.vue')).default;
    const wrapper = mount(PatientsListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Selecionar atendimento para cobrança');
    expect(wrapper.findAll('a').map((link) => link.attributes('href'))).toContain(
      '/encounters?ownerId=owner-1&patientId=pat-1'
    );
    expect(wrapper.text()).toContain('Abrir atendimento');
    expect(wrapper.text()).toContain('Agendar');
  });
});

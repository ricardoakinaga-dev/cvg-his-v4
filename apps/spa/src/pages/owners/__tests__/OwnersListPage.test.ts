import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockOwners = [
  {
    id: 'owner-1',
    accountId: 'acc-1',
    fullName: 'João Silva',
    documentId: '123.456.789-00',
    contacts: [
      { label: 'Celular', type: 'phone' as const, value: '(11) 99999-1111', primary: true },
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
      { label: 'WhatsApp', type: 'whatsapp' as const, value: '(11) 88888-2222', primary: true }
    ],
    financialResponsible: false,
    administrativeNotes: 'Cliente especial',
    status: 'inactive' as const,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockOwners);
const mockPatientListFn = vi.fn().mockResolvedValue([
  {
    id: 'pat-1',
    accountId: 'acc-1',
    name: 'Rex',
    species: 'canine',
    sex: 'male',
    primaryOwnerId: 'owner-1',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pat-2',
    accountId: 'acc-1',
    name: 'Mimi',
    species: 'feline',
    sex: 'female',
    primaryOwnerId: 'owner-2',
    status: 'inactive',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]);

vi.mock('@/services/owner', () => ({
  ownerService: {
    get list() {
      return mockListFn;
    }
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    get list() {
      return mockPatientListFn;
    }
  }
}));

describe('OwnersListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue(mockOwners);
    mockPatientListFn.mockResolvedValue([
      {
        id: 'pat-1',
        accountId: 'acc-1',
        name: 'Rex',
        species: 'canine',
        sex: 'male',
        primaryOwnerId: 'owner-1',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'pat-2',
        accountId: 'acc-1',
        name: 'Mimi',
        species: 'feline',
        sex: 'female',
        primaryOwnerId: 'owner-2',
        status: 'inactive',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]);
  });

  it('renders the page title', async () => {
    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Clientes e Tutores');
  });

  it('loads owners and linked patients on mount', async () => {
    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage);

    await flushPromises();
    expect(mockListFn).toHaveBeenCalled();
    expect(mockPatientListFn).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Cliente em destaque');
  });

  it('shows error state when API fails', async () => {
    mockListFn.mockRejectedValue(new Error('Failed to load owners'));

    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load owners');
  });

  it('shows empty state when no owners exist', async () => {
    mockListFn.mockResolvedValue([]);

    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum tutor encontrado');
  });

  it('renders owner data in cards', async () => {
    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).toContain('Maria Santos');
    expect(wrapper.text()).toContain('123.456.789-00');
    expect(wrapper.text()).toContain('(11) 99999-1111');
    expect(wrapper.text()).toContain('(11) 88888-2222');
  });

  it('shows status labels for each owner', async () => {
    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Ativo');
    expect(wrapper.text()).toContain('Inativo');
  });

  it('shows dash for missing document', async () => {
    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('—');
  });

  it('shows navigation links to detail and edit pages', async () => {
    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage, {
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
    expect(detailHrefs).toContain('/owners/owner-1');
    expect(detailHrefs).toContain('/owners/owner-2');

    const editLinks = links.filter((a) => a.text() === 'Editar');
    expect(editLinks).toHaveLength(2);
    const editHrefs = editLinks.map((a) => a.attributes('href'));
    expect(editHrefs).toContain('/owners/owner-1/edit');
    expect(editHrefs).toContain('/owners/owner-2/edit');
  });

  it('shows link to create new owner', async () => {
    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage, {
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
    const newLink = wrapper.findAll('a').find((a) => a.text().includes('Novo Tutor'));
    expect(newLink).toBeTruthy();
    expect(newLink!.attributes('href')).toBe('/owners/new');
  });

  it('has search input with correct placeholder', async () => {
    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage);

    await flushPromises();
    const searchInput = wrapper.find('input[type="search"]');
    expect(searchInput.exists()).toBe(true);
    expect(searchInput.attributes('placeholder')).toBe('Buscar por nome, documento ou contato...');
  });

  it('has a Buscar button', async () => {
    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage);

    await flushPromises();
    const searchBtn = wrapper.findAll('button').find((b) => b.text() === 'Buscar');
    expect(searchBtn).toBeTruthy();
  });

  it('shows patient pills and operational actions', async () => {
    const OwnersListPage = (await import('../OwnersListPage.vue')).default;
    const wrapper = mount(OwnersListPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Novo Animal');
    expect(wrapper.text()).toContain('Agendar');
  });
});

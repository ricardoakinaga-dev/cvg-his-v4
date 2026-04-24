import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import UsersListPage from '@/pages/users/UsersListPage.vue';
import { userService } from '@/services/user';
import type { UserSummary } from '@/types/user';

vi.mock('@/services/user', () => ({
  userService: {
    list: vi.fn()
  }
}));

const mockUsers: UserSummary[] = [
  {
    id: 'user-1',
    accountId: 'acc-1',
    username: 'dr.vet',
    email: 'vet@clinic.com',
    displayName: 'Dr. Veterinário',
    roleCode: 'veterinarian',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-2',
    accountId: 'acc-1',
    username: 'admin',
    email: 'admin@clinic.com',
    displayName: 'Administrador',
    roleCode: 'admin',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-3',
    accountId: 'acc-1',
    username: 'nurse1',
    email: 'nurse@clinic.com',
    displayName: 'Enfermeira Silva',
    roleCode: 'nurse',
    status: 'inactive',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

function createRouterInstance() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/users', component: UsersListPage },
      { path: '/users/new', component: { template: '<div />' } },
      { path: '/users/:id', component: { template: '<div />' } },
      { path: '/users/:id/edit', component: { template: '<div />' } }
    ]
  });
}

function mountComponent() {
  const router = createRouterInstance();
  router.push('/users');
  const wrapper = mount(UsersListPage, {
    global: {
      plugins: [router],
      stubs: {
        RouterLink: {
          template: '<a :href="to"><slot /></a>',
          props: ['to']
        }
      }
    }
  });
  return { wrapper, router };
}

describe('UsersListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    vi.mocked(userService.list).mockResolvedValue([]);
    const { wrapper } = mountComponent();
    expect(wrapper.text()).toContain('Usuários');
  });

  it('shows loading state', async () => {
    vi.mocked(userService.list).mockReturnValue(new Promise(() => {}));
    const { wrapper } = mountComponent();
    await flushPromises();
    expect(wrapper.find('.data-table-loading').exists()).toBe(true);
  });

  it('shows empty state when no users', async () => {
    vi.mocked(userService.list).mockResolvedValue([]);
    const { wrapper } = mountComponent();
    await flushPromises();
    expect(wrapper.text()).toContain('Nenhum registro encontrado');
  });

  it('renders user data', async () => {
    vi.mocked(userService.list).mockResolvedValue(mockUsers);
    const { wrapper } = mountComponent();
    await flushPromises();
    expect(wrapper.text()).toContain('Dr. Veterinário');
    expect(wrapper.text()).toContain('Administrador');
    expect(wrapper.text()).toContain('Enfermeira Silva');
  });

  it('shows status badges', async () => {
    vi.mocked(userService.list).mockResolvedValue(mockUsers);
    const { wrapper } = mountComponent();
    await flushPromises();
    expect(wrapper.text()).toContain('Ativo');
    expect(wrapper.text()).toContain('Inativo');
  });

  it('has search input with correct placeholder', () => {
    vi.mocked(userService.list).mockResolvedValue([]);
    const { wrapper } = mountComponent();
    const input = wrapper.find('input[placeholder="Buscar por nome, e-mail..."]');
    expect(input.exists()).toBe(true);
  });

  it('has Novo Usuário link', () => {
    vi.mocked(userService.list).mockResolvedValue([]);
    const { wrapper } = mountComponent();
    expect(wrapper.text()).toContain('+ Novo Usuário');
  });

  it('filters by search term', async () => {
    vi.mocked(userService.list).mockResolvedValue(mockUsers);
    const { wrapper } = mountComponent();
    await flushPromises();

    const searchInput = wrapper.find('input[placeholder="Buscar por nome, e-mail..."]');
    await searchInput.setValue('Admin');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Administrador');
    expect(wrapper.text()).not.toContain('Dr. Veterinário');
  });

  it('filters by role', async () => {
    vi.mocked(userService.list).mockResolvedValue(mockUsers);
    const { wrapper } = mountComponent();
    await flushPromises();

    const selects = wrapper.findAll('select');
    const roleSelect = selects[0];
    await roleSelect.setValue('admin');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Administrador');
    expect(wrapper.text()).not.toContain('Dr. Veterinário');
  });

  it('filters by status', async () => {
    vi.mocked(userService.list).mockResolvedValue(mockUsers);
    const { wrapper } = mountComponent();
    await flushPromises();

    const selects = wrapper.findAll('select');
    const statusSelect = selects[1];
    await statusSelect.setValue('inactive');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Enfermeira Silva');
    expect(wrapper.text()).not.toContain('Administrador');
  });

  it('shows navigation links to detail and edit', async () => {
    vi.mocked(userService.list).mockResolvedValue(mockUsers);
    const { wrapper } = mountComponent();
    await flushPromises();

    const links = wrapper.findAll('a');
    const detailLinks = links.filter((l) => l.text().trim() === 'Ver');
    const editLinks = links.filter((l) => l.text().trim() === 'Editar');
    expect(detailLinks.length).toBeGreaterThanOrEqual(1);
    expect(editLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows error when API fails', async () => {
    vi.mocked(userService.list).mockRejectedValue(new Error('Network error'));
    const { wrapper } = mountComponent();
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Network error');
  });
});

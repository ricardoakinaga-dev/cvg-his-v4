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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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

  it('renders the Vetus-like operational identity and governance context', async () => {
    vi.mocked(userService.list).mockResolvedValue(mockUsers);
    const { wrapper } = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('RH');
    expect(wrapper.text()).toContain('Usuários');
    expect(wrapper.text()).toContain('Identidade operacional autenticada');
    expect(wrapper.text()).toContain('Usuário autenticável separado do profissional de agenda');
    expect(wrapper.text()).toContain('Grupos de Acesso');
    expect(wrapper.text()).toContain('Auditoria');
    expect(wrapper.text()).toContain('Rota Vetus legada');
    expect(wrapper.text()).toContain('Usuarios/Usuarios.htm');
    expect(wrapper.text()).toContain('Contexto organizacional');
  });

  it('keeps the DataTable in loading state while the list request is pending', async () => {
    const request = deferred<UserSummary[]>();
    vi.mocked(userService.list).mockReturnValue(request.promise);
    const { wrapper } = mountComponent();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.data-table-loading').exists()).toBe(true);
    expect(wrapper.find('[data-testid="data-table-feedback"]').exists()).toBe(false);
    expect(wrapper.find('table').exists()).toBe(false);
    expect(userService.list).toHaveBeenCalledTimes(1);

    request.resolve([]);
    await flushPromises();
  });

  it('represents an intrinsically empty user list with empty feedback', async () => {
    vi.mocked(userService.list).mockResolvedValue([]);
    const { wrapper } = mountComponent();
    await flushPromises();

    const feedback = wrapper.get('[data-testid="data-table-feedback"]');
    expect(feedback.classes()).toContain('data-table-feedback--empty');
    expect(feedback.get('.empty-state__title').text()).toBe('Nenhum usuário cadastrado');
    expect(feedback.text()).toContain('Ainda não há usuários cadastrados para exibir.');
    expect(feedback.find('button').exists()).toBe(false);
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('distinguishes no-results after a filter from an intrinsically empty list', async () => {
    vi.mocked(userService.list).mockResolvedValue(mockUsers);
    const { wrapper } = mountComponent();
    await flushPromises();

    const searchInput = wrapper.find('input[placeholder="Buscar por nome, usuário ou e-mail"]');
    await searchInput.setValue('não-existe');
    await wrapper.vm.$nextTick();

    const feedback = wrapper.get('[data-testid="data-table-feedback"]');
    expect(feedback.classes()).toContain('data-table-feedback--no-results');
    expect(feedback.classes()).not.toContain('data-table-feedback--empty');
    expect(feedback.get('.empty-state__title').text()).toBe('Nenhum usuário corresponde aos filtros');
    expect(feedback.text()).toContain('Revise os filtros e tente novamente.');
    expect(wrapper.find('table').exists()).toBe(false);
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
    const input = wrapper.find('input[placeholder="Buscar por nome, usuário ou e-mail"]');
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

    const searchInput = wrapper.find('input[placeholder="Buscar por nome, usuário ou e-mail"]');
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
    expect(detailLinks.map((link) => link.attributes('href'))).toContain('/users/user-1');
    expect(editLinks.map((link) => link.attributes('href'))).toContain('/users/user-1/edit');
  });

  it('shows one DataTable error surface with named retry and renders confirmed rows after retry', async () => {
    const retryRequest = deferred<UserSummary[]>();
    vi.mocked(userService.list)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockReturnValueOnce(retryRequest.promise);

    const { wrapper } = mountComponent();
    await flushPromises();

    const feedback = wrapper.get('[data-testid="data-table-feedback"]');
    expect(feedback.classes()).toContain('data-table-feedback--error');
    expect(feedback.attributes('role')).toBe('alert');
    expect(feedback.attributes('aria-live')).toBe('assertive');
    expect(feedback.text()).not.toContain('Network error');
    expect(wrapper.findAll('.ds-alert-stub')).toHaveLength(0);
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1);
    expect(wrapper.find('table').exists()).toBe(false);

    const retryButton = feedback.get('button');
    expect(retryButton.text()).toBe('Tentar novamente');
    expect(retryButton.attributes('type')).toBe('button');

    await retryButton.trigger('click');
    await wrapper.vm.$nextTick();
    expect(userService.list).toHaveBeenCalledTimes(2);
    expect(wrapper.find('.data-table-loading').exists()).toBe(true);
    expect(wrapper.find('[data-testid="data-table-feedback"]').exists()).toBe(false);
    expect(wrapper.find('table').exists()).toBe(false);

    retryRequest.resolve(mockUsers);
    await flushPromises();

    expect(wrapper.find('.data-table-loading').exists()).toBe(false);
    expect(wrapper.find('[data-testid="data-table-feedback"]').exists()).toBe(false);
    expect(wrapper.findAll('tbody tr')).toHaveLength(mockUsers.length);
    expect(wrapper.text()).toContain('Dr. Veterinário');
    expect(wrapper.text()).toContain('Administrador');
  });

  it('maps forbidden access without exposing the server error or offering a misleading retry', async () => {
    vi.mocked(userService.list).mockRejectedValue(
      Object.assign(new Error('internal permission details'), { status: 403 })
    );
    const { wrapper } = mountComponent();
    await flushPromises();

    const feedback = wrapper.get('[data-testid="data-table-feedback"]');
    expect(feedback.classes()).toContain('data-table-feedback--forbidden');
    expect(feedback.text()).toContain('Acesso aos usuários negado');
    expect(feedback.text()).not.toContain('internal permission details');
    expect(feedback.find('a').text()).toBe('Voltar ao painel');
    expect(feedback.find('a').attributes('href')).toBe('/');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('maps a fetch network failure to a recoverable unavailable state', async () => {
    vi.mocked(userService.list).mockRejectedValue(new TypeError('Failed to fetch'));
    const { wrapper } = mountComponent();
    await flushPromises();

    const feedback = wrapper.get('[data-testid="data-table-feedback"]');
    expect(feedback.classes()).toContain('data-table-feedback--unavailable');
    expect(feedback.text()).toContain('Serviço de usuários indisponível');
    expect(feedback.find('button').text()).toBe('Tentar novamente');
  });

  it('maps a service outage safely and keeps confirmed rows visible during refresh failure', async () => {
    vi.mocked(userService.list)
      .mockResolvedValueOnce(mockUsers)
      .mockRejectedValueOnce(Object.assign(new Error('database host and query details'), { status: 503 }));
    const { wrapper } = mountComponent();
    await flushPromises();

    const refresh = wrapper.findAll('button').find((button) => button.text().trim() === 'Atualizar');
    expect(refresh).toBeDefined();
    await refresh!.trigger('click');
    await flushPromises();

    const feedback = wrapper.get('[data-testid="data-table-feedback"]');
    expect(feedback.classes()).toContain('data-table-feedback--unavailable');
    expect(feedback.text()).toContain('Serviço de usuários indisponível');
    expect(feedback.text()).not.toContain('database host');
    expect(wrapper.findAll('tbody tr')).toHaveLength(mockUsers.length);
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1);
  });

  it('removes stale user metadata when a loaded refresh loses authorization', async () => {
    vi.mocked(userService.list)
      .mockResolvedValueOnce(mockUsers)
      .mockRejectedValueOnce(Object.assign(new Error('permission changed upstream'), { status: 403 }));
    const { wrapper } = mountComponent();
    await flushPromises();

    const refresh = wrapper.findAll('button').find((button) => button.text().trim() === 'Atualizar');
    await refresh!.trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="data-table-feedback"]').classes()).toContain('data-table-feedback--forbidden');
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    expect(wrapper.findAll('.overview-metric__value').map((node) => node.text())).toEqual(['0', '0', '0', '0', '0']);
    expect(wrapper.text()).not.toContain('Dr. Veterinário');
    expect(wrapper.text()).not.toContain('permission changed upstream');
  });
});

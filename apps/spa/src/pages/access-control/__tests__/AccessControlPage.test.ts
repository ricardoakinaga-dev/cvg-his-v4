import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockGetCatalog = vi.fn();
const mockGetEffectivePermissions = vi.fn();
const mockSetGrant = vi.fn();
const mockReplaceUserRoles = vi.fn();
const mockReplaceUserTeams = vi.fn();
const mockReplaceUserSectors = vi.fn();
const mockCreateTeam = vi.fn();
const mockCreateSector = vi.fn();

vi.mock('@/services/accessControl', () => ({
  accessControlService: {
    getCatalog: mockGetCatalog,
    getEffectivePermissions: mockGetEffectivePermissions,
    setGrant: mockSetGrant,
    replaceUserRoles: mockReplaceUserRoles,
    replaceUserTeams: mockReplaceUserTeams,
    replaceUserSectors: mockReplaceUserSectors,
    createTeam: mockCreateTeam,
    createSector: mockCreateSector
  }
}));

const catalogResponse = {
  roles: [
    {
      id: 'role-admin',
      code: 'admin',
      name: 'Administrador',
      description: 'Acesso amplo ao sistema',
      permissionCodes: ['patients.read', 'patients.write']
    }
  ],
  permissions: [
    {
      code: 'patients.read',
      module: 'patients',
      description: 'Visualizar pacientes'
    },
    {
      code: 'patients.write',
      module: 'patients',
      description: 'Editar pacientes'
    }
  ],
  teams: [
    {
      id: 'team-1',
      code: 'surgery',
      name: 'Equipe Cirúrgica',
      description: 'Equipe do centro cirúrgico',
      status: 'active'
    }
  ],
  sectors: [
    {
      id: 'sector-1',
      code: 'icu',
      name: 'UTI',
      description: 'Setor intensivo',
      status: 'active'
    }
  ],
  users: [
    {
      id: 'user-1',
      username: 'maria',
      displayName: 'Maria Vet',
      email: 'maria@example.com',
      roleCode: 'admin',
      status: 'active'
    }
  ],
  assignments: {
    userPermissions: [],
    teamPermissions: [
      {
        subjectId: 'team-1',
        permissionCode: 'patients.read',
        effect: 'allow'
      }
    ],
    sectorPermissions: []
  },
  memberships: {
    userTeams: [{ userId: 'user-1', teamId: 'team-1' }],
    userSectors: [{ userId: 'user-1', teamId: undefined, sectorId: 'sector-1' }].map(({ userId, sectorId }) => ({ userId, sectorId }))
  },
  legacyRoles: [{ userId: 'user-1', roleCodes: ['admin'] }]
};

const effectivePermissionsResponse = {
  user: catalogResponse.users[0],
  memberships: { teams: [catalogResponse.teams[0]], sectors: [catalogResponse.sectors[0]] },
  effectivePermissions: [
    {
      permissionCode: 'patients.read',
      description: 'Visualizar pacientes',
      effective: true,
      direct: false,
      sources: [{ kind: 'team', sourceId: 'team-1', sourceCode: 'surgery', effect: 'allow' }]
    }
  ]
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('AccessControlPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCatalog.mockResolvedValue(catalogResponse);
    mockGetEffectivePermissions.mockResolvedValue(effectivePermissionsResponse);
    mockSetGrant.mockResolvedValue({ ok: true });
    mockReplaceUserRoles.mockResolvedValue({ ok: true });
    mockReplaceUserTeams.mockResolvedValue({ ok: true });
    mockReplaceUserSectors.mockResolvedValue({ ok: true });
    mockCreateTeam.mockResolvedValue(catalogResponse.teams[0]);
    mockCreateSector.mockResolvedValue(catalogResponse.sectors[0]);
  });

  it('shows a loading state while the catalog is being fetched', async () => {
    const pending = deferred<typeof catalogResponse>();
    mockGetCatalog.mockReturnValueOnce(pending.promise);

    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Carregando governança de acesso...');

    pending.resolve(catalogResponse);
    await flushPromises();
  });

  it('shows error and empty state when the catalog fails to load', async () => {
    mockGetCatalog.mockRejectedValueOnce(new Error('Falha controlada de catálogo'));

    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Falha controlada de catálogo');
    expect(wrapper.text()).toContain('Nenhum dado disponível.');
  });

  it('renders the summary catalog and filters permissions by query', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    expect(wrapper.text()).toContain('RH');
    expect(wrapper.text()).toContain('Usuários');
    expect(wrapper.text()).toContain('Grupos de Acesso');
    expect(wrapper.text()).toContain('Usuarios/GruposDeAcesso.htm');
    expect(wrapper.text()).toContain('GET /users/{id}/access-groups');
    expect(wrapper.text()).toContain('grupo de acesso, usuário individual e matriz de permissões efetivas');
    expect(wrapper.text()).toContain('Catálogo de permissões');
    expect(wrapper.text()).toContain('Mapa Vetus IAM');
    expect(wrapper.text()).toContain('Permissão por rotina');
    expect(wrapper.text()).toContain('Usuário autenticável');
    expect(wrapper.text()).toContain('Grupo de Acesso');
    expect(wrapper.text()).toContain('Rotina');
    expect(wrapper.text()).toContain('Sessão');
    expect(wrapper.text()).toContain('Auditoria');
    expect(wrapper.text()).toContain('Governança avançada');
    expect(wrapper.text()).toContain('PATIENTS');
    expect(wrapper.text()).toContain('patients.read');
    expect(wrapper.text()).toContain('Administrador');

    const filterInput = wrapper.find('input[placeholder="Filtrar permissões por código, módulo ou descrição"]');
    await filterInput.setValue('write');
    await flushPromises();

    expect(wrapper.text()).toContain('patients.write');
    expect(wrapper.text()).not.toContain('patients.readVisualizar pacientes');
  });

  it('switches to the users tab and renders effective permissions', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    const usersTab = wrapper.findAll('button').find((button) => button.text() === 'Usuários');
    expect(usersTab).toBeTruthy();
    await usersTab!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Perfil e herança');
    expect(wrapper.text()).toContain('Maria Vet');
    expect(wrapper.text()).toContain('Permissões efetivas');
    expect(wrapper.text()).toContain('Permitido');
    expect(wrapper.text()).toContain('Identidade operacional');
    expect(wrapper.text()).toContain('Último login');
    expect(wrapper.text()).toContain('MFA');
    expect(wrapper.text()).toContain('Tenant');
    expect(mockGetEffectivePermissions).toHaveBeenCalledWith('user-1');
  });

  it('switches to the groups tab and renders access groups as Vetus groups', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    const groupsTab = wrapper.findAll('button').find((button) => button.text() === 'Grupos');
    expect(groupsTab).toBeTruthy();
    await groupsTab!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Novo grupo de acesso');
    expect(wrapper.text()).toContain('Grupos de acesso cadastrados');
    expect(wrapper.text()).toContain('Equipe Cirúrgica');
    expect(wrapper.text()).toContain('surgery');
  });

  it('renders routine action coverage in the matrix tab', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    const matrixTab = wrapper.findAll('button').find((button) => button.text() === 'Matriz');
    expect(matrixTab).toBeTruthy();
    await matrixTab!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Cobertura CRUD por rotina');
    expect(wrapper.text()).toContain('Consultar');
    expect(wrapper.text()).toContain('Inserir');
    expect(wrapper.text()).toContain('Alterar');
    expect(wrapper.text()).toContain('Excluir');
    expect(wrapper.text()).toContain('patients');
  });

  it('switches to the matrix tab and updates a grant', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    const matrixTab = wrapper.findAll('button').find((button) => button.text() === 'Matriz');
    expect(matrixTab).toBeTruthy();
    await matrixTab!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Matriz de permissões');
    const selects = wrapper.findAll('select');
    const grantSelect = selects[2];
    await grantSelect.setValue('deny');
    await flushPromises();

    expect(mockSetGrant).toHaveBeenCalledWith({
      subjectType: 'team',
      subjectId: 'team-1',
      permissionCode: 'patients.read',
      effect: 'deny'
    });
    expect(wrapper.text()).toContain('Permissão atualizada com sucesso');
  });
});

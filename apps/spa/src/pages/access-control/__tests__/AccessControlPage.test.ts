import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockGetCatalog = vi.fn();
const mockGetModulePermissionMatrix = vi.fn();
const mockGetEffectivePermissions = vi.fn();
const mockSetGrant = vi.fn();
const mockReplaceUserRoles = vi.fn();
const mockReplaceUserTeams = vi.fn();
const mockReplaceUserSectors = vi.fn();
const mockReplaceUserMemberships = vi.fn();
const mockCreateTeam = vi.fn();
const mockCreateSector = vi.fn();
const mockUpdateTeam = vi.fn();
const mockUpdateSector = vi.fn();

vi.mock('@/services/accessControl', () => ({
  accessControlService: {
    getCatalog: mockGetCatalog,
    getModulePermissionMatrix: mockGetModulePermissionMatrix,
    getEffectivePermissions: mockGetEffectivePermissions,
    setGrant: mockSetGrant,
    replaceUserRoles: mockReplaceUserRoles,
    replaceUserTeams: mockReplaceUserTeams,
    replaceUserSectors: mockReplaceUserSectors,
    replaceUserMemberships: mockReplaceUserMemberships,
    createTeam: mockCreateTeam,
    createSector: mockCreateSector,
    updateTeam: mockUpdateTeam,
    updateSector: mockUpdateSector
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
    userSectors: [{ userId: 'user-1', teamId: undefined, sectorId: 'sector-1' }].map(
      ({ userId, sectorId }) => ({ userId, sectorId })
    )
  },
  legacyRoles: [{ userId: 'user-1', roleCodes: ['admin'] }]
};

const modulePermissionMatrixResponse = {
  generatedAt: '2026-05-28T00:00:00.000Z',
  accountId: 'acc-1',
  items: [
    {
      module: 'patients',
      permissionCodes: ['patients.read', 'patients.write'],
      actions: {
        consult: true,
        insert: true,
        update: true,
        delete: false,
        execute: false,
        admin: false
      },
      rolesAllowed: ['admin'],
      teamOverrideCount: 1,
      sectorOverrideCount: 0,
      userOverrideCount: 0,
      coverageStatus: 'partial'
    }
  ]
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
    mockGetModulePermissionMatrix.mockResolvedValue(modulePermissionMatrixResponse);
    mockGetEffectivePermissions.mockResolvedValue(effectivePermissionsResponse);
    mockSetGrant.mockResolvedValue({ ok: true });
    mockReplaceUserRoles.mockResolvedValue({ ok: true });
    mockReplaceUserTeams.mockResolvedValue({ ok: true });
    mockReplaceUserSectors.mockResolvedValue({ ok: true });
    mockReplaceUserMemberships.mockResolvedValue({ ok: true });
    mockCreateTeam.mockResolvedValue(catalogResponse.teams[0]);
    mockCreateSector.mockResolvedValue(catalogResponse.sectors[0]);
    mockUpdateTeam.mockResolvedValue(catalogResponse.teams[0]);
    mockUpdateSector.mockResolvedValue(catalogResponse.sectors[0]);
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

  it('explains the editable scope and exposes keyboard-safe form semantics', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    expect(wrapper.text()).toContain(
      'altera somente grupos, setores, vínculos de usuários e grants'
    );
    expect(wrapper.text()).toContain('não são editáveis nesta tela');

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(5);
    expect(tabs[0].attributes('type')).toBe('button');
    expect(tabs[0].attributes('aria-controls')).toBe('access-panel-summary');
    expect(tabs[0].attributes('aria-selected')).toBe('true');
    expect(tabs[0].attributes('tabindex')).toBe('0');
    expect(tabs[1].attributes('tabindex')).toBe('-1');

    await tabs[0].trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toContain('Usuários');
    await wrapper.find('[role="tab"][aria-selected="true"]').trigger('keydown', { key: 'Home' });
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toContain('Resumo');

    const permissionFilter = wrapper.get('input#access-permission-filter');
    expect(permissionFilter.attributes('aria-describedby')).toContain(
      'access-permission-filter-hint'
    );

    const usersTab = tabs.find((button) => button.text() === 'Usuários');
    await usersTab!.trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="tab"][aria-selected="true"]').attributes('tabindex')).toBe('0');
    expect(wrapper.findAll('[role="tab"]').filter((tab) => tab.attributes('tabindex') === '0')).toHaveLength(1);
    expect(wrapper.get('fieldset legend').text()).toBe('Roles legadas');
    expect(wrapper.get('button[type="submit"]').text()).toContain('Salvar vínculos do usuário');

    await wrapper.find('[role="tab"][aria-selected="true"]').trigger('keydown', { key: 'Home' });
    await flushPromises();
    expect(wrapper.find('[role="tab"][aria-selected="true"]').attributes('tabindex')).toBe('0');
    expect(wrapper.findAll('[role="tab"]').filter((tab) => tab.attributes('tabindex') === '0')).toHaveLength(1);
  });

  it('turns a forbidden catalog response into an explicit, focused recovery state', async () => {
    mockGetCatalog.mockRejectedValueOnce({ status: 403 });

    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage, {
      global: { stubs: { DsAlert: false } },
      attachTo: document.body
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Sem permissão para governança de acesso.');
    expect(wrapper.text()).toContain('Seu perfil não pode consultar ou alterar este catálogo');
    expect(
      wrapper.get('button[aria-label="Tentar novamente o carregamento de governança de acesso"]')
    ).toBeTruthy();
    expect(wrapper.find('.ds-alert__dismiss').exists()).toBe(false);
    expect(wrapper.get('[role="alert"][tabindex="-1"]').element).toBe(document.activeElement);
    expect(wrapper.text()).not.toContain('Nenhum dado disponível.');

    mockGetCatalog.mockResolvedValueOnce(catalogResponse);
    await wrapper
      .get('button[aria-label="Tentar novamente o carregamento de governança de acesso"]')
      .trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Mapa Vetus IAM');
    wrapper.unmount();
  });

  it('exposes the matrix action status as text, independently of color', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    const chips = wrapper.findAll('.action-chip');
    expect(chips).toHaveLength(6);
    expect(chips[0].text()).toBe('ConsultarSim');
    expect(chips[3].text()).toBe('ExcluirNão');
    expect(chips[3].attributes('aria-label')).toBe('Excluir: Não');
  });

  it('keeps a forbidden mutation explicit instead of presenting a false success', async () => {
    mockUpdateTeam.mockRejectedValueOnce({ status: 403 });

    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Grupos')!
      .trigger('click');
    await flushPromises();
    await wrapper.get('button[aria-label="Editar Equipe Cirúrgica"]').trigger('click');
    await wrapper.get('form.entity-form').trigger('submit');
    await flushPromises();

    expect(mockUpdateTeam).toHaveBeenCalledWith('team-1', expect.any(Object));
    expect(wrapper.text()).toContain('Sem permissão para governança de acesso.');
    expect(wrapper.text()).not.toContain('Grupo de acesso atualizado');
  });

  it('ignores a stale catalog response when a newer reload completes first', async () => {
    const firstCatalog = deferred<typeof catalogResponse>();
    const secondCatalog = deferred<typeof catalogResponse>();
    const firstMatrix = deferred<typeof modulePermissionMatrixResponse>();
    const secondMatrix = deferred<typeof modulePermissionMatrixResponse>();
    const currentCatalog = {
      ...catalogResponse,
      users: [
        {
          ...catalogResponse.users[0],
          id: 'user-2',
          username: 'lucas',
          displayName: 'Lucas Vet'
        }
      ],
      memberships: { userTeams: [], userSectors: [] },
      legacyRoles: []
    };
    const currentMatrix = {
      ...modulePermissionMatrixResponse,
      accountId: 'acc-current',
      items: [{ ...modulePermissionMatrixResponse.items[0], module: 'current-module' }]
    };
    mockGetCatalog.mockReset();
    mockGetModulePermissionMatrix.mockReset();
    mockGetCatalog.mockReturnValueOnce(firstCatalog.promise).mockReturnValueOnce(secondCatalog.promise);
    mockGetModulePermissionMatrix
      .mockReturnValueOnce(firstMatrix.promise)
      .mockReturnValueOnce(secondMatrix.promise);

    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);
    const secondLoad = (
      wrapper.vm as unknown as { loadCatalog: () => Promise<void> }
    ).loadCatalog();

    secondCatalog.resolve(currentCatalog);
    secondMatrix.resolve(currentMatrix);
    await secondLoad;
    await flushPromises();

    await wrapper
      .findAll('[role="tab"]')
      .find((button) => button.text().includes('Usuários'))!
      .trigger('click');
    await flushPromises();
    expect(wrapper.get('#access-user-select option').text()).toContain('Lucas Vet');

    firstCatalog.resolve(catalogResponse);
    firstMatrix.resolve(modulePermissionMatrixResponse);
    await flushPromises();

    expect(wrapper.get('#access-user-select option').text()).toContain('Lucas Vet');
    expect(wrapper.get('#access-user-select option').text()).not.toContain('Maria Vet');
  });

  it('normalizes the matrix target when a catalog refresh removes the selected subject', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    await wrapper
      .findAll('[role="tab"]')
      .find((button) => button.text().includes('Matriz'))!
      .trigger('click');
    await flushPromises();
    expect((wrapper.get('#access-matrix-subject-id').element as HTMLSelectElement).value).toBe(
      'team-1'
    );

    const refreshedCatalog = {
      ...catalogResponse,
      teams: [
        {
          ...catalogResponse.teams[0],
          id: 'team-2',
          name: 'Equipe de Internação'
        }
      ],
      assignments: {
        ...catalogResponse.assignments,
        teamPermissions: []
      },
      memberships: {
        ...catalogResponse.memberships,
        userTeams: []
      }
    };
    mockGetCatalog.mockResolvedValueOnce(refreshedCatalog);
    mockGetModulePermissionMatrix.mockResolvedValueOnce(modulePermissionMatrixResponse);

    await (
      wrapper.vm as unknown as { loadCatalog: () => Promise<void> }
    ).loadCatalog();
    await flushPromises();

    expect((wrapper.get('#access-matrix-subject-id').element as HTMLSelectElement).value).toBe(
      'team-2'
    );
    const grantSelect = wrapper.get(
      'select[aria-label="Estado de patients.read para Equipe de Internação"]'
    );
    await grantSelect.setValue('allow');
    await flushPromises();

    expect(mockSetGrant).toHaveBeenCalledWith({
      subjectType: 'team',
      subjectId: 'team-2',
      permissionCode: 'patients.read',
      effect: 'allow'
    });
    expect(mockSetGrant).not.toHaveBeenCalledWith(
      expect.objectContaining({ subjectId: 'team-1' })
    );
  });

  it('blocks matrix grants while the catalog is refreshing', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    await wrapper
      .findAll('[role="tab"]')
      .find((button) => button.text().includes('Matriz'))!
      .trigger('click');
    await flushPromises();

    const pendingCatalog = deferred<typeof catalogResponse>();
    const pendingMatrix = deferred<typeof modulePermissionMatrixResponse>();
    mockGetCatalog.mockReturnValueOnce(pendingCatalog.promise);
    mockGetModulePermissionMatrix.mockReturnValueOnce(pendingMatrix.promise);
    const reload = (
      wrapper.vm as unknown as { loadCatalog: () => Promise<void> }
    ).loadCatalog();
    await wrapper.vm.$nextTick();

    await (
      wrapper.vm as unknown as {
        updateGrant: (permissionCode: string, effect: string) => Promise<void>;
      }
    ).updateGrant('patients.read', 'allow');
    expect(mockSetGrant).not.toHaveBeenCalled();

    pendingCatalog.resolve(catalogResponse);
    pendingMatrix.resolve(modulePermissionMatrixResponse);
    await reload;
    await flushPromises();
    expect(
      wrapper.get('select[aria-label="Estado de patients.read para Equipe Cirúrgica"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('renders the summary catalog and filters permissions by query', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    expect(wrapper.text()).toContain('RH');
    expect(wrapper.text()).toContain('Usuários');
    expect(wrapper.text()).toContain('Grupos de Acesso');
    expect(wrapper.text()).toContain('MFA, sessões, chaves de API e auditoria');
    expect(wrapper.text()).toContain('Catálogo de permissões');
    expect(wrapper.text()).toContain('Mapa Vetus IAM');
    expect(wrapper.text()).toContain('Permissão por rotina');
    expect(wrapper.text()).toContain('Usuário autenticável');
    expect(wrapper.text()).toContain('Grupo de Acesso');
    expect(wrapper.text()).toContain('Rotina');
    expect(wrapper.text()).toContain('Sessão');
    expect(wrapper.text()).toContain('Auditoria');
    expect(wrapper.text()).toContain('Governança avançada');
    expect(wrapper.text()).toContain('Matriz enterprise por módulo, perfil e unidade');
    expect(wrapper.text()).toContain('Módulos RBAC completos');
    expect(wrapper.text()).toContain('Overrides: 1 equipe(s), 0 setor(es), 0 usuário(s)');
    expect(wrapper.text()).toContain('Executar');
    expect(wrapper.text()).toContain('PATIENTS');
    expect(wrapper.text()).toContain('patients.read');
    expect(wrapper.text()).toContain('Administrador');

    const filterInput = wrapper.find(
      'input[placeholder="Filtrar permissões por código, módulo ou descrição"]'
    );
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

  it('persists the complete user membership form through one atomic service command', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text() === 'Usuários')!.trigger('click');
    await flushPromises();
    await wrapper.get('form.membership-form').trigger('submit');
    await flushPromises();

    expect(mockReplaceUserMemberships).toHaveBeenCalledWith('user-1', {
      roleCodes: ['admin'],
      teamIds: ['team-1'],
      sectorIds: ['sector-1']
    });
    expect(mockReplaceUserRoles).not.toHaveBeenCalled();
    expect(mockReplaceUserTeams).not.toHaveBeenCalled();
    expect(mockReplaceUserSectors).not.toHaveBeenCalled();
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

  it('edits and deactivates an access group through the persisted service', async () => {
    const AccessControlPage = (await import('../AccessControlPage.vue')).default;
    const wrapper = mount(AccessControlPage);

    await flushPromises();
    const groupsTab = wrapper.findAll('button').find((button) => button.text() === 'Grupos');
    await groupsTab!.trigger('click');
    await flushPromises();

    await wrapper.get('button[aria-label="Editar Equipe Cirúrgica"]').trigger('click');
    const nameInput = wrapper.find('input[placeholder="Grupo Cirúrgico"]');
    await nameInput.setValue('Equipe Cirúrgica Central');
    const buttons = wrapper.findAll('button');
    const saveButton = buttons.find(
      (button: (typeof buttons)[number]) => button.text() === 'Salvar alterações do grupo'
    );
    expect(saveButton).toBeTruthy();
    expect(saveButton!.attributes('type')).toBe('submit');
    await wrapper.get('form.entity-form').trigger('submit');
    await flushPromises();

    expect(mockUpdateTeam).toHaveBeenCalledWith('team-1', {
      name: 'Equipe Cirúrgica Central',
      code: 'surgery',
      description: 'Equipe do centro cirúrgico',
      isActive: true
    });

    await wrapper.get('button[aria-label="Desativar Equipe Cirúrgica"]').trigger('click');
    await flushPromises();
    expect(mockUpdateTeam).toHaveBeenCalledWith('team-1', { isActive: false });
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

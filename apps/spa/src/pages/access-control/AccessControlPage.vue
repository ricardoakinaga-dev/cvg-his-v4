<template>
  <div class="access-control-page">
    <AppPageHeader
      :breadcrumbs="['Console Enterprise', 'Governança', 'Governança de Acesso']"
      title="🔐 Governança de Acesso"
      subtitle="Usuários, equipes, setores e matriz de permissões — RH e Console Enterprise"
    >
      <template #actions>
        <DsBadge variant="info" size="md">{{ catalog?.permissions.length ?? 0 }} permissões</DsBadge>
        <DsBadge variant="info" size="md">{{ catalog?.users.length ?? 0 }} usuários</DsBadge>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="access-control-page__overview">
      <div class="overview-grid">
        <div class="overview-card">
          <span class="overview-card__value">{{ catalog?.roles.length ?? 0 }}</span>
          <span class="overview-card__label">Roles legadas</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ catalog?.permissions.length ?? 0 }}</span>
          <span class="overview-card__label">Permissões ativas</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ routineRows.length }}</span>
          <span class="overview-card__label">Rotinas mapeadas</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ catalog?.teams.length ?? 0 }}</span>
          <span class="overview-card__label">Grupos de Acesso</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ catalog?.sectors.length ?? 0 }}</span>
          <span class="overview-card__label">Setores</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ catalog?.users.length ?? 0 }}</span>
          <span class="overview-card__label">Usuários</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ assignmentCount }}</span>
          <span class="overview-card__label">Grants diretos</span>
        </div>
      </div>
    </section>

    <div class="access-control-page__segments" role="tablist" aria-label="Seções de governança">
      <DsButton
        v-for="tab in tabs"
        :key="tab.value"
        :variant="activeTab === tab.value ? 'primary' : 'secondary'"
        size="sm"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </DsButton>
    </div>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section v-if="!loading && catalog && activeTab === 'summary'" class="access-control-page__section">
      <DsCard title="Mapa Vetus IAM" class="panel">
        <div class="governance-grid">
          <article v-for="layer in governanceLayers" :key="layer.title" class="governance-card">
            <span class="governance-card__eyebrow">{{ layer.scope }}</span>
            <strong>{{ layer.title }}</strong>
            <p>{{ layer.description }}</p>
          </article>
        </div>
      </DsCard>

      <DsCard title="Permissão por rotina" class="panel">
        <div class="routine-grid">
          <article v-for="control in securityControls" :key="control.title" class="routine-card">
            <strong>{{ control.title }}</strong>
            <p>{{ control.description }}</p>
          </article>
        </div>
      </DsCard>

      <DsCard title="Catálogo de permissões" class="panel">
        <div class="panel__toolbar">
          <DsInput v-model="permissionQuery" placeholder="Filtrar permissões por código, módulo ou descrição" />
        </div>
        <div class="module-grid">
          <article v-for="group in filteredPermissionGroups" :key="group.module" class="module-card">
            <div class="module-card__header">
              <div>
                <strong>{{ group.moduleLabel }}</strong>
                <p>{{ group.items.length }} permissões</p>
              </div>
              <DsBadge variant="info" size="sm">{{ group.items.length }}</DsBadge>
            </div>
            <ul class="permission-sample">
              <li v-for="permission in group.items.slice(0, 5)" :key="permission.code">
                <code>{{ permission.code }}</code>
                <span>{{ permission.description }}</span>
              </li>
            </ul>
          </article>
        </div>
      </DsCard>

      <DsCard title="Roles legadas" class="panel">
        <div class="role-grid">
          <article v-for="role in catalog.roles" :key="role.id" class="role-card">
            <div class="role-card__header">
              <div>
                <strong>{{ role.name }}</strong>
                <p>{{ role.code }}</p>
              </div>
              <DsBadge variant="info" size="sm">{{ role.permissionCodes.length }}</DsBadge>
            </div>
            <p class="role-card__description">{{ role.description }}</p>
          </article>
        </div>
        <div class="matrix-wrapper">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Permissão</th>
                <th v-for="role in catalog.roles" :key="role.id">{{ role.code }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="permission in filteredPermissions" :key="permission.code">
                <td>
                  <strong>{{ permission.code }}</strong>
                  <div class="muted">{{ permission.description }}</div>
                </td>
                <td v-for="role in catalog.roles" :key="`${role.id}:${permission.code}`" class="matrix-table__cell">
                  {{ role.permissionCodes.includes(permission.code) ? '✅' : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DsCard>

      <DsCard title="Governança Enterprise" class="panel">
        <div class="enterprise-grid">
          <div>
            <strong>RH operacional</strong>
            <p>Usuários, profissionais e grupos ficam descobríveis para o dia a dia administrativo.</p>
          </div>
          <div>
            <strong>Console Enterprise</strong>
            <p>MFA, auditoria, sessões, API keys e compliance mantêm a camada técnica separada.</p>
          </div>
          <div>
            <strong>Tenant e auditoria</strong>
            <p>Cada decisão de acesso deve ser isolada por organização e rastreável por usuário, entidade e ação.</p>
          </div>
        </div>
      </DsCard>
    </section>

    <section v-else-if="!loading && catalog && activeTab === 'users'" class="access-control-page__section">
      <div class="subject-toolbar">
        <label class="field">
          <span>Usuário</span>
          <select v-model="selectedUserId">
            <option v-for="user in catalog.users" :key="user.id" :value="user.id">
              {{ user.displayName }} - {{ user.roleCode }}
            </option>
          </select>
        </label>
        <DsButton variant="secondary" :loading="userSaving" @click="reloadUserEffective">Atualizar efetivo</DsButton>
      </div>

      <div v-if="selectedUser" class="user-layout">
        <DsCard title="Perfil e herança" class="panel">
          <div class="profile-card">
            <strong>{{ selectedUser.displayName }}</strong>
            <p>{{ selectedUser.email }}</p>
            <div class="profile-tags">
              <DsBadge variant="info" size="sm">{{ selectedUser.username }}</DsBadge>
              <DsBadge :variant="selectedUser.status === 'active' ? 'success' : 'neutral'" size="sm">
                {{ selectedUser.status }}
              </DsBadge>
              <DsBadge variant="warning" size="sm">{{ selectedUser.roleCode }}</DsBadge>
            </div>
          </div>

          <div class="identity-grid" aria-label="Governança da identidade">
            <div v-for="item in selectedUserGovernance" :key="item.label" class="identity-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <p>{{ item.hint }}</p>
            </div>
          </div>

          <div class="membership-grid">
            <label class="membership-panel">
              <strong>Roles legadas</strong>
              <div class="checklist">
                <label v-for="role in catalog.roles" :key="role.id" class="checklist__item">
                  <input v-model="draftRoleCodes" type="checkbox" :value="role.code" />
                  <span>{{ role.name }}</span>
                </label>
              </div>
            </label>

            <label class="membership-panel">
              <strong>Equipes</strong>
              <div class="checklist">
                <label v-for="team in catalog.teams" :key="team.id" class="checklist__item">
                  <input v-model="draftTeamIds" type="checkbox" :value="team.id" />
                  <span>{{ team.name }}</span>
                </label>
              </div>
            </label>

            <label class="membership-panel">
              <strong>Setores</strong>
              <div class="checklist">
                <label v-for="sector in catalog.sectors" :key="sector.id" class="checklist__item">
                  <input v-model="draftSectorIds" type="checkbox" :value="sector.id" />
                  <span>{{ sector.name }}</span>
                </label>
              </div>
            </label>
          </div>

          <div class="actions-row">
            <DsButton :loading="userSaving" @click="saveUserMemberships">Salvar vínculos</DsButton>
          </div>
        </DsCard>

        <DsCard title="Permissões efetivas" class="panel">
          <div class="matrix-wrapper">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th>Permissão</th>
                  <th>Efetivo</th>
                  <th>Direto</th>
                  <th>Origens</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="permission in effectivePermissions" :key="permission.permissionCode">
                  <td>
                    <strong>{{ permission.permissionCode }}</strong>
                    <div class="muted">{{ permission.description }}</div>
                  </td>
                  <td>
                    <DsBadge :variant="permission.effective ? 'success' : 'neutral'" size="sm">
                      {{ permission.effective ? 'Permitido' : 'Negado' }}
                    </DsBadge>
                  </td>
                  <td>{{ permission.direct ? 'Sim' : 'Não' }}</td>
                  <td>
                    <div class="source-list">
                      <span v-for="source in permission.sources" :key="`${source.kind}:${source.sourceId}`" class="source-chip">
                        {{ source.sourceCode }} · {{ source.effect }}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </DsCard>
      </div>
    </section>

    <section v-else-if="!loading && catalog && activeTab === 'teams'" class="access-control-page__section">
      <div class="creation-grid">
        <DsCard title="Nova equipe" class="panel">
          <div class="form-grid">
            <DsInput v-model="teamForm.code" label="Código" placeholder="equipe_cirurgica" />
            <DsInput v-model="teamForm.name" label="Nome" placeholder="Equipe Cirúrgica" />
            <DsInput v-model="teamForm.description" label="Descrição" placeholder="Agrupamento organizacional" />
          </div>
          <div class="actions-row">
            <DsButton :loading="teamSaving" @click="createTeam">Criar equipe</DsButton>
          </div>
        </DsCard>

        <DsCard title="Equipes cadastradas" class="panel">
          <div class="entity-list">
            <article v-for="team in catalog.teams" :key="team.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <strong>{{ team.name }}</strong>
                  <p>{{ team.code }}</p>
                </div>
                <DsBadge :variant="team.status === 'active' ? 'success' : 'warning'" size="sm">
                  {{ team.status }}
                </DsBadge>
              </div>
              <p>{{ team.description || 'Sem descrição' }}</p>
            </article>
          </div>
        </DsCard>
      </div>
    </section>

    <section v-else-if="!loading && catalog && activeTab === 'sectors'" class="access-control-page__section">
      <div class="creation-grid">
        <DsCard title="Novo setor" class="panel">
          <div class="form-grid">
            <DsInput v-model="sectorForm.code" label="Código" placeholder="administrativo" />
            <DsInput v-model="sectorForm.name" label="Nome" placeholder="Administrativo" />
            <DsInput v-model="sectorForm.description" label="Descrição" placeholder="Área organizacional" />
          </div>
          <div class="actions-row">
            <DsButton :loading="sectorSaving" @click="createSector">Criar setor</DsButton>
          </div>
        </DsCard>

        <DsCard title="Setores cadastrados" class="panel">
          <div class="entity-list">
            <article v-for="sector in catalog.sectors" :key="sector.id" class="entity-card">
              <div class="entity-card__header">
                <div>
                  <strong>{{ sector.name }}</strong>
                  <p>{{ sector.code }}</p>
                </div>
                <DsBadge :variant="sector.status === 'active' ? 'success' : 'warning'" size="sm">
                  {{ sector.status }}
                </DsBadge>
              </div>
              <p>{{ sector.description || 'Sem descrição' }}</p>
            </article>
          </div>
        </DsCard>
      </div>
    </section>

    <section v-else-if="!loading && catalog && activeTab === 'matrix'" class="access-control-page__section">
      <DsCard title="Cobertura CRUD por rotina" class="panel">
        <p class="section-hint">
          Leitura operacional Vetus: o poder efetivo deve ser auditável por rotina e por ação clássica
          Consultar, Inserir, Alterar e Excluir.
        </p>
        <div class="matrix-wrapper">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Rotina</th>
                <th v-for="action in routineActions" :key="action.key">{{ action.label }}</th>
                <th>Permissões</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="routine in routineRows" :key="routine.module">
                <td>
                  <strong>{{ routine.module }}</strong>
                  <div class="muted">{{ routine.permissions.length }} permissão(ões)</div>
                </td>
                <td v-for="action in routineActions" :key="`${routine.module}:${action.key}`">
                  <DsBadge :variant="routine.actions[action.key] ? 'success' : 'neutral'" size="sm">
                    {{ routine.actions[action.key] ? 'Sim' : 'Não' }}
                  </DsBadge>
                </td>
                <td>
                  <div class="source-list">
                    <span v-for="permission in routine.permissions" :key="permission" class="source-chip">
                      {{ permission }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DsCard>

      <DsCard title="Matriz de permissões" class="panel">
        <div class="subject-toolbar">
          <label class="field">
            <span>Tipo</span>
            <select v-model="matrixSubjectType">
              <option value="user">Usuário</option>
              <option value="team">Equipe</option>
              <option value="sector">Setor</option>
            </select>
          </label>
          <label class="field">
            <span>Alvo</span>
            <select v-model="matrixSubjectId">
              <option v-for="subject in matrixSubjects" :key="subject.id" :value="subject.id">
                {{ subject.name }}
              </option>
            </select>
          </label>
          <DsInput v-model="permissionQuery" placeholder="Filtrar permissões da matriz" />
        </div>
        <div class="matrix-wrapper">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Permissão</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="permission in filteredPermissions" :key="permission.code">
                <td>
                  <strong>{{ permission.code }}</strong>
                  <div class="muted">{{ permission.description }}</div>
                </td>
                <td>
                  <select
                    :value="getAssignment(matrixSubjectType, matrixSubjectId, permission.code)"
                    @change="updateGrant(permission.code, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="inherit">Herdar</option>
                    <option value="allow">Conceder</option>
                    <option value="deny">Negar</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DsCard>
    </section>

    <DsCard v-else-if="!loading" title="Governança de acesso" class="panel">
      <div class="empty-state">
        <div class="empty-state__title">Nenhum dado disponível.</div>
        <div class="empty-state__description">Atualize a página para carregar o catálogo de acesso.</div>
      </div>
    </DsCard>

    <div v-if="loading" class="loading-panel">
      <DsCard class="panel">
        <div class="empty-state">
          <div class="empty-state__title">Carregando governança de acesso...</div>
        </div>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { accessControlService } from '@/services/accessControl';
import type { AccessControlResponse } from '@/services/accessControl';
import type { EffectivePermissionSummary, PermissionDefinition } from '@cvg-his-v2/shared-types';

type TabKey = 'summary' | 'users' | 'teams' | 'sectors' | 'matrix';
type MatrixSubjectType = 'user' | 'team' | 'sector';
type RoutineActionKey = 'consult' | 'insert' | 'update' | 'delete';

const tabs: Array<{ value: TabKey; label: string }> = [
  { value: 'summary', label: 'Resumo' },
  { value: 'users', label: 'Usuários' },
  { value: 'teams', label: 'Equipes' },
  { value: 'sectors', label: 'Setores' },
  { value: 'matrix', label: 'Matriz' }
];

const loading = ref(true);
const error = ref('');
const successMessage = ref('');
const activeTab = ref<TabKey>('summary');
const catalog = ref<AccessControlResponse | null>(null);
const permissionQuery = ref('');
const selectedUserId = ref('');
const matrixSubjectType = ref<MatrixSubjectType>('team');
const matrixSubjectId = ref('');
const effectivePermissions = ref<EffectivePermissionSummary[]>([]);
const userSaving = ref(false);
const teamSaving = ref(false);
const sectorSaving = ref(false);

const teamForm = reactive({ code: '', name: '', description: '' });
const sectorForm = reactive({ code: '', name: '', description: '' });
const draftRoleCodes = ref<string[]>([]);
const draftTeamIds = ref<string[]>([]);
const draftSectorIds = ref<string[]>([]);

const governanceLayers = [
  {
    scope: 'Identidade',
    title: 'Usuário autenticável',
    description: 'Conta operacional com status, vínculo humano e contexto da organização.'
  },
  {
    scope: 'Autorização',
    title: 'Grupo de Acesso',
    description: 'Política reaplicável para onboarding, troca de função e revisão periódica.'
  },
  {
    scope: 'Capacidade',
    title: 'Rotina',
    description: 'Catálogo explícito do que pode ser consultado, inserido, alterado ou excluído.'
  },
  {
    scope: 'Segurança',
    title: 'Sessão',
    description: 'Uso autenticado rastreável, com expiração e base para revogação.'
  },
  {
    scope: 'Compliance',
    title: 'Auditoria',
    description: 'Registro de quem fez o quê, em qual entidade, tenant e contexto técnico.'
  }
];

const securityControls = [
  {
    title: 'Consultar',
    description: 'Permite ler registros e navegar pela rotina sem alterar dados.'
  },
  {
    title: 'Inserir',
    description: 'Autoriza criação de novos registros na rotina selecionada.'
  },
  {
    title: 'Alterar',
    description: 'Autoriza edição, transição operacional e manutenção de registros.'
  },
  {
    title: 'Excluir',
    description: 'Operação sensível que deve ser concedida explicitamente e auditada.'
  }
];

const routineActions: Array<{ key: RoutineActionKey; label: string }> = [
  { key: 'consult', label: 'Consultar' },
  { key: 'insert', label: 'Inserir' },
  { key: 'update', label: 'Alterar' },
  { key: 'delete', label: 'Excluir' }
];

const filteredPermissions = computed(() => {
  const needle = permissionQuery.value.trim().toLowerCase();
  const items = catalog.value?.permissions ?? [];
  if (!needle) return [...items];
  return items.filter((permission) =>
    [permission.code, permission.module, permission.description].some((value) =>
      String(value ?? '').toLowerCase().includes(needle)
    )
  );
});

const filteredPermissionGroups = computed(() => {
  const grouped = new Map<string, PermissionDefinition[]>();
  for (const permission of filteredPermissions.value) {
    const key = permission.module || 'outros';
    const current = grouped.get(key) ?? [];
    current.push(permission);
    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .map(([module, items]) => ({
      module,
      moduleLabel: module.replace(/_/g, ' ').toUpperCase(),
      items: [...items].sort((a, b) => a.code.localeCompare(b.code))
    }))
    .sort((a, b) => a.module.localeCompare(b.module));
});

const routineRows = computed(() => {
  const grouped = new Map<
    string,
    { module: string; permissions: string[]; actions: Record<RoutineActionKey, boolean> }
  >();

  for (const permission of catalog.value?.permissions ?? []) {
    const module = permission.module || permission.code.split('.')[0] || 'outros';
    const current =
      grouped.get(module) ??
      ({
        module,
        permissions: [],
        actions: { consult: false, insert: false, update: false, delete: false }
      } satisfies { module: string; permissions: string[]; actions: Record<RoutineActionKey, boolean> });

    current.permissions.push(permission.code);
    for (const action of resolvePermissionActions(permission.code)) {
      current.actions[action] = true;
    }
    grouped.set(module, current);
  }

  return [...grouped.values()].sort((a, b) => a.module.localeCompare(b.module));
});

const selectedUser = computed(() =>
  (catalog.value?.users ?? []).find((user) => user.id === selectedUserId.value) ?? null
);

const selectedUserGovernance = computed(() => {
  const user = selectedUser.value;
  if (!user) return [];
  return [
    {
      label: 'Identidade operacional',
      value: user.username,
      hint: 'Usuário autenticável separado do profissional de agenda.'
    },
    {
      label: 'Último login',
      value: user.updatedAt ? formatDateTime(user.updatedAt) : 'Não informado',
      hint: 'Indicador operacional até existir histórico dedicado de sessão.'
    },
    {
      label: 'MFA',
      value: 'Governança Enterprise',
      hint: 'Controle preservado no Console Enterprise para política sensível.'
    },
    {
      label: 'Tenant',
      value: user.accountId || 'Contexto atual',
      hint: 'Permissões e auditoria devem permanecer isoladas por organização.'
    }
  ];
});

const matrixSubjects = computed(() => {
  if (!catalog.value) return [];
  if (matrixSubjectType.value === 'user') {
    return catalog.value.users.map((user) => ({
      id: user.id,
      name: `${user.displayName} (${user.roleCode})`
    }));
  }
  if (matrixSubjectType.value === 'team') {
    return catalog.value.teams.map((team) => ({ id: team.id, name: team.name }));
  }
  return catalog.value.sectors.map((sector) => ({ id: sector.id, name: sector.name }));
});

const assignmentCount = computed(() => {
  const assignments = catalog.value?.assignments;
  return (
    (assignments?.userPermissions.length ?? 0) +
    (assignments?.teamPermissions.length ?? 0) +
    (assignments?.sectorPermissions.length ?? 0)
  );
});

function showError(message: string) {
  error.value = message;
  setTimeout(() => {
    if (error.value === message) error.value = '';
  }, 7000);
}

function showSuccess(message: string) {
  successMessage.value = message;
  setTimeout(() => {
    if (successMessage.value === message) successMessage.value = '';
  }, 5000);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function resolvePermissionActions(code: string): RoutineActionKey[] {
  const normalized = code.toLowerCase();
  if (normalized.includes('.admin') || normalized.includes('.manage')) {
    return ['consult', 'insert', 'update', 'delete'];
  }
  const actions = new Set<RoutineActionKey>();
  if (normalized.includes('.read') || normalized.includes('.view') || normalized.includes('.consult')) {
    actions.add('consult');
  }
  if (normalized.includes('.write') || normalized.includes('.create') || normalized.includes('.insert')) {
    actions.add('insert');
    actions.add('update');
  }
  if (normalized.includes('.update') || normalized.includes('.edit')) {
    actions.add('update');
  }
  if (normalized.includes('.delete') || normalized.includes('.remove')) {
    actions.add('delete');
  }
  return actions.size ? [...actions] : ['consult'];
}

function defaultUserDrafts() {
  const userId = selectedUserId.value;
  if (!catalog.value || !userId) return;

  draftRoleCodes.value = (catalog.value.legacyRoles.find((entry) => entry.userId === userId)?.roleCodes ?? []).slice();
  draftTeamIds.value = (catalog.value.memberships.userTeams ?? [])
    .filter((item) => item.userId === userId)
    .map((item) => item.teamId);
  draftSectorIds.value = (catalog.value.memberships.userSectors ?? [])
    .filter((item) => item.userId === userId)
    .map((item) => item.sectorId);
}

async function loadCatalog() {
  loading.value = true;
  error.value = '';
  try {
    catalog.value = await accessControlService.getCatalog();
    if (!selectedUserId.value) {
      selectedUserId.value = catalog.value.users[0]?.id ?? '';
    }
    if (!matrixSubjectId.value) {
      matrixSubjectId.value =
        matrixSubjects.value[0]?.id ?? catalog.value.users[0]?.id ?? catalog.value.teams[0]?.id ?? catalog.value.sectors[0]?.id ?? '';
    }
    defaultUserDrafts();
    await reloadUserEffective();
  } catch (err: unknown) {
    showError(err instanceof Error ? err.message : 'Falha ao carregar governança de acesso');
  } finally {
    loading.value = false;
  }
}

async function reload() {
  await loadCatalog();
}

async function reloadUserEffective() {
  if (!selectedUserId.value) {
    effectivePermissions.value = [];
    return;
  }

  userSaving.value = true;
  try {
    const response = await accessControlService.getEffectivePermissions(selectedUserId.value);
    effectivePermissions.value = [...response.effectivePermissions];
    if (catalog.value) {
      const user = catalog.value.users.find((item) => item.id === selectedUserId.value);
      if (user) {
        draftRoleCodes.value =
          catalog.value.legacyRoles.find((entry) => entry.userId === user.id)?.roleCodes?.slice() ?? [];
        draftTeamIds.value =
          (catalog.value.memberships.userTeams ?? [])
            .filter((item) => item.userId === user.id)
            .map((item) => item.teamId) ?? [];
        draftSectorIds.value =
          (catalog.value.memberships.userSectors ?? [])
            .filter((item) => item.userId === user.id)
            .map((item) => item.sectorId) ?? [];
      }
    }
  } catch (err: unknown) {
    showError(err instanceof Error ? err.message : 'Falha ao carregar permissões efetivas');
  } finally {
    userSaving.value = false;
  }
}

function getAssignment(subjectType: MatrixSubjectType, subjectId: string, permissionCode: string) {
  if (!catalog.value) return 'inherit';
  const pool =
    subjectType === 'user'
      ? catalog.value.assignments.userPermissions
      : subjectType === 'team'
        ? catalog.value.assignments.teamPermissions
        : catalog.value.assignments.sectorPermissions;
  const assignment = pool.find(
    (item) => item.subjectId === subjectId && item.permissionCode === permissionCode
  );
  return assignment?.effect ?? 'inherit';
}

async function updateGrant(permissionCode: string, effect: string) {
  if (!matrixSubjectId.value) return;
  try {
    await accessControlService.setGrant({
      subjectType: matrixSubjectType.value,
      subjectId: matrixSubjectId.value,
      permissionCode,
      effect: effect === 'inherit' ? 'inherit' : effect === 'allow' ? 'allow' : 'deny'
    });
    showSuccess('Permissão atualizada com sucesso');
    await loadCatalog();
  } catch (err: unknown) {
    showError(err instanceof Error ? err.message : 'Falha ao salvar grant');
  }
}

async function saveUserMemberships() {
  if (!selectedUserId.value) return;
  userSaving.value = true;
  try {
    await Promise.all([
      accessControlService.replaceUserRoles(selectedUserId.value, draftRoleCodes.value),
      accessControlService.replaceUserTeams(selectedUserId.value, draftTeamIds.value),
      accessControlService.replaceUserSectors(selectedUserId.value, draftSectorIds.value)
    ]);
    showSuccess('Vínculos do usuário atualizados');
    await loadCatalog();
  } catch (err: unknown) {
    showError(err instanceof Error ? err.message : 'Falha ao salvar vínculos do usuário');
  } finally {
    userSaving.value = false;
  }
}

async function createTeam() {
  teamSaving.value = true;
  try {
    await accessControlService.createTeam({
      code: teamForm.code.trim(),
      name: teamForm.name.trim(),
      description: teamForm.description.trim() || undefined
    });
    teamForm.code = '';
    teamForm.name = '';
    teamForm.description = '';
    showSuccess('Equipe criada com sucesso');
    await loadCatalog();
  } catch (err: unknown) {
    showError(err instanceof Error ? err.message : 'Falha ao criar equipe');
  } finally {
    teamSaving.value = false;
  }
}

async function createSector() {
  sectorSaving.value = true;
  try {
    await accessControlService.createSector({
      code: sectorForm.code.trim(),
      name: sectorForm.name.trim(),
      description: sectorForm.description.trim() || undefined
    });
    sectorForm.code = '';
    sectorForm.name = '';
    sectorForm.description = '';
    showSuccess('Setor criado com sucesso');
    await loadCatalog();
  } catch (err: unknown) {
    showError(err instanceof Error ? err.message : 'Falha ao criar setor');
  } finally {
    sectorSaving.value = false;
  }
}

watch(selectedUserId, () => {
  defaultUserDrafts();
  void reloadUserEffective();
});

watch(matrixSubjectType, () => {
  if (!catalog.value) return;
  matrixSubjectId.value = matrixSubjects.value[0]?.id ?? '';
});

onMounted(loadCatalog);
</script>

<style scoped>
.access-control-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-card__value {
  display: block;
  font-size: 28px;
  font-weight: 800;
}

.overview-card__label {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
}

.access-control-page__segments,
.subject-toolbar,
.actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.access-control-page__section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  border-radius: 18px;
}

.panel__toolbar {
  margin-bottom: 12px;
}

.module-grid,
.role-grid,
.entity-list,
.creation-grid,
.governance-grid,
.routine-grid,
.enterprise-grid,
.identity-grid {
  display: grid;
  gap: 12px;
}

.module-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.role-grid,
.entity-list,
.governance-grid,
.routine-grid,
.enterprise-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.creation-grid {
  grid-template-columns: 1fr;
}

.module-card,
.role-card,
.entity-card,
.governance-card,
.routine-card,
.identity-card,
.enterprise-grid > div {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
}

.governance-card {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.04), rgba(14, 165, 233, 0.08));
}

.governance-card__eyebrow,
.identity-card span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.governance-card p,
.routine-card p,
.identity-card p,
.enterprise-grid p,
.section-hint {
  margin: 8px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.5;
}

.identity-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin-top: 12px;
}

.module-card__header,
.role-card__header,
.entity-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.module-card__header p,
.role-card__header p,
.entity-card__header p {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
}

.permission-sample {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 8px;
}

.permission-sample li {
  display: grid;
  gap: 2px;
}

.permission-sample code {
  font-size: 12px;
}

.role-card__description,
.entity-card p {
  color: var(--color-text-muted, #64748b);
}

.user-layout {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 16px;
}

.profile-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.08));
}

.profile-card p {
  margin: 6px 0 0;
  color: var(--color-text-muted, #64748b);
}

.profile-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.membership-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.membership-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-bg-subtle, #f8fafc);
}

.checklist {
  display: grid;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
}

.checklist__item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.matrix-wrapper {
  overflow-x: auto;
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
}

.matrix-table th,
.matrix-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  vertical-align: top;
}

.matrix-table th {
  text-align: left;
  background: var(--color-bg-subtle, #f8fafc);
  white-space: nowrap;
}

.matrix-table__cell {
  text-align: center;
  white-space: nowrap;
}

.muted {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  margin-top: 4px;
}

.source-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.source-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--color-text, #0f172a);
  font-size: 12px;
}

.empty-state {
  padding: 36px 18px;
  text-align: center;
}

.empty-state__title {
  font-weight: 700;
}

.empty-state__description {
  margin-top: 6px;
  color: var(--color-text-muted, #64748b);
}

.loading-panel {
  min-height: 120px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.field select {
  min-width: 220px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #fff);
  color: inherit;
}

@media (max-width: 960px) {
  .user-layout {
    grid-template-columns: 1fr;
  }
}
</style>

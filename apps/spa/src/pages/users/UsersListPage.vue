<template>
  <div class="users-list-page">
    <AppPageHeader
      title="Usuários"
      :breadcrumbs="['RH', 'Usuários', 'Usuários']"
      subtitle="Identidade operacional autenticada, perfis e governança de acesso"
      :secondary-actions="headerSecondaryActions"
      :primary-action="headerPrimaryAction"
    />

    <aside class="users-list-page__context-note" role="note">
      Superfície Vetus-like para a rota legada Usuarios/Usuarios.htm. Usuário autenticável separado
      do profissional de agenda, com vínculos de perfil, contexto organizacional, Grupos de Acesso e
      Auditoria.
    </aside>

    <section class="users-list-page__overview">
      <DsCard title="Resumo de acesso">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ users.length }}</span>
            <span class="overview-metric__label">Usuários cadastrados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ activeUsers }}</span>
            <span class="overview-metric__label">Ativos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ rolesCount }}</span>
            <span class="overview-metric__label">Perfis distintos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ filteredUsers.length }}</span>
            <span class="overview-metric__label">Resultados atuais</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ organizationContexts }}</span>
            <span class="overview-metric__label">Contexto organizacional</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="users-list-page__actions">
      <DsCard title="Ações rápidas - RH e governança" variant="compact">
        <div class="quick-actions">
          <DsButton tag="a" to="/access-control" variant="primary">Grupos de Acesso</DsButton>
          <DsButton tag="a" to="/staff" variant="secondary">Profissionais</DsButton>
          <DsButton tag="a" to="/audit" variant="secondary">Auditoria</DsButton>
        </div>
      </DsCard>
    </section>

    <section class="users-list-page__governance" aria-label="Governança de usuários">
      <div>
        <strong>Rota Vetus legada</strong>
        <span>Usuarios/Usuarios.htm</span>
      </div>
      <div>
        <strong>Modelo de acesso</strong>
        <span>Identidade, perfil e grupo de acesso</span>
      </div>
      <div>
        <strong>Rastro operacional</strong>
        <span>Sessão, MFA e auditoria permanecem como controles de segurança</span>
      </div>
    </section>

    <div class="users-list-page__toolbar">
      <DsInput
        v-model="search"
        aria-label="Buscar usuário"
        placeholder="Buscar por nome, usuário ou e-mail"
      />
      <DsInput
        v-model="roleFilter"
        type="select"
        aria-label="Filtrar por perfil"
        placeholder="Todos perfis"
        style="max-width: 180px"
      >
        <option value="">Todos perfis</option>
        <option value="admin">👑 Admin</option>
        <option value="veterinarian">🩺 Veterinário</option>
        <option value="nurse">💉 Enfermagem</option>
        <option value="reception">🔔 Recepção</option>
        <option value="auditor">📝 Auditor</option>
        <option value="finance">💰 Financeiro</option>
        <option value="inventory">📦 Estoque</option>
      </DsInput>
      <DsInput
        v-model="statusFilter"
        type="select"
        aria-label="Filtrar por status"
        placeholder="Todos status"
        style="max-width: 160px"
      >
        <option value="">Todos status</option>
        <option value="active">✅ Ativo</option>
        <option value="inactive">⏸ Inativo</option>
      </DsInput>
    </div>

    <DataTable
      :columns="columns"
      :rows="userRows"
      :loading="loading"
      :feedback="tableFeedback"
      variant="hoverable"
      caption="Lista de usuários do sistema"
    >
      <template v-if="tableFeedback?.kind === 'error' || tableFeedback?.kind === 'unavailable' || tableFeedback?.kind === 'forbidden'" #feedbackAction>
        <DsButton
          v-if="tableFeedback.kind === 'forbidden'"
          tag="a"
          to="/"
          variant="secondary"
        >
          Voltar ao painel
        </DsButton>
        <DsButton v-else variant="secondary" :loading="loading" :disabled="loading" @click="fetchData">
          Tentar novamente
        </DsButton>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="userRow(row).status === 'active' ? 'Ativo' : 'Inativo'"
          :variant="userRow(row).status === 'active' ? 'success' : 'neutral'"
        />
      </template>
      <template #cell-roleCode="{ row }">
        <span class="role-pill">{{ formatRole(userRow(row).roleCode) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <DsButton tag="a" :to="`/users/${row.id}`" size="sm" variant="secondary">Ver</DsButton>
        <DsButton tag="a" :to="`/users/${row.id}/edit`" size="sm" variant="secondary"
          >Editar</DsButton
        >
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { useListData } from '@/composables/useListData';
import { userService } from '@/services/user';
import type { UserSummary } from '@/types/user';
import type { DataTableFeedback, DataTableRow } from '@/components/DataTable.vue';

const search = ref('');
const roleFilter = ref('');
const statusFilter = ref('');

const {
  loading,
  error,
  errorStatus,
  errorCode,
  items: users,
  load: fetchData
} = useListData<UserSummary>({
  fetchFn: () => userService.list(),
  entityLabel: 'usuários',
  clearItemsOnErrorStatuses: [403]
});

const columns = [
  { key: 'displayName', label: 'Nome' },
  { key: 'username', label: 'Usuário' },
  { key: 'email', label: 'E-mail' },
  { key: 'roleCode', label: 'Perfil' },
  { key: 'status', label: 'Status', slot: 'status' },
  { key: 'actions', label: 'Ações', slot: 'actions' }
];

const filteredUsers = computed(() => {
  let result = users.value;
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }
  if (roleFilter.value) {
    result = result.filter((u) => u.roleCode === roleFilter.value);
  }
  if (statusFilter.value) {
    result = result.filter((u) => u.status === statusFilter.value);
  }
  return result;
});

const activeUsers = computed(() => users.value.filter((u) => u.status === 'active').length);
const rolesCount = computed(() => new Set(users.value.map((u) => u.roleCode)).size);
const organizationContexts = computed(() => new Set(users.value.map((u) => u.accountId)).size);
const userRows = computed(() => filteredUsers.value as unknown as DataTableRow[]);

const hasActiveFilters = computed(() => Boolean(search.value || roleFilter.value || statusFilter.value));

const tableFeedback = computed<DataTableFeedback | null>(() => {
  if (error.value) {
    if (errorStatus.value === 403) {
      return {
        kind: 'forbidden',
        icon: '🔒',
        title: 'Acesso aos usuários negado',
        description: 'Seu perfil não tem permissão para consultar os usuários.'
      };
    }

    const unavailable = errorStatus.value === 408 ||
      (errorStatus.value !== null && errorStatus.value >= 500) ||
      ['AbortError', 'ECONNABORTED', 'ERR_NETWORK', 'ETIMEDOUT', 'NetworkError', 'TypeError'].includes(
        errorCode.value ?? ''
      );
    if (unavailable) {
      return {
        kind: 'unavailable',
        icon: 'clock',
        title: 'Serviço de usuários indisponível',
        description: 'Não foi possível consultar os usuários agora. Tente novamente em instantes.'
      };
    }

    return {
      kind: 'error',
      icon: '⚠️',
      title: 'Não foi possível carregar os usuários',
      description: 'A consulta de usuários não pôde ser concluída. Tente novamente para atualizar a lista.'
    };
  }

  if (hasActiveFilters.value && filteredUsers.value.length === 0) {
    return {
      kind: 'no-results',
      icon: '🔎',
      title: 'Nenhum usuário corresponde aos filtros',
      description: 'Revise os filtros e tente novamente.'
    };
  }

  if (users.value.length === 0) {
    return {
      kind: 'empty',
      icon: '👥',
      title: 'Nenhum usuário cadastrado',
      description: 'Ainda não há usuários cadastrados para exibir.'
    };
  }

  return null;
});

const roleLabelMap: Record<string, string> = {
  admin: '👑 Admin',
  veterinarian: '🩺 Veterinário',
  nurse: '💉 Enfermeiro(a)',
  reception: '🔔 Recepção',
  auditor: '📝 Auditor',
  finance: '💰 Financeiro',
  inventory: '📦 Estoque'
};

const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-users',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => fetchData()
  }
]);

const headerPrimaryAction = computed(() => ({
  key: 'new-user',
  label: '+ Novo Usuário',
  variant: 'primary' as const,
  to: '/users/new'
}));

function formatRole(code: string) {
  return roleLabelMap[code] || code;
}

function userRow(row: unknown): UserSummary {
  return row as UserSummary;
}
</script>

<style scoped>
.users-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.users-list-page__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px 160px;
  gap: 12px;
}

.users-list-page__context-note {
  padding: 12px 16px;
  border: 1px solid var(--color-info-200, #bfdbfe);
  border-radius: 8px;
  background: var(--color-info-50, #eff6ff);
  color: var(--color-info-800, #1e40af);
  font-size: 14px;
  line-height: 1.5;
}

.users-list-page__overview {
  margin-bottom: 4px;
}

.users-list-page__actions {
  margin-bottom: 4px;
}

.users-list-page__governance {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 16px;
}

.users-list-page__governance > div {
  display: grid;
  gap: 4px;
}

.users-list-page__governance strong {
  font-size: 12px;
  text-transform: uppercase;
}

.users-list-page__governance span {
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.4;
}

.overview-grid {
  gap: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.overview-metric {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(
    180deg,
    var(--color-surface, #ffffff),
    var(--color-bg-subtle, #f8fafc)
  );
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.18);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary-700, #1d4ed8);
}

@media (max-width: 960px) {
  .users-list-page__toolbar {
    grid-template-columns: 1fr;
  }

  .users-list-page__governance {
    grid-template-columns: 1fr;
  }
}
</style>

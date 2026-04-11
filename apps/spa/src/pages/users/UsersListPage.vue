<template>
  <div class="users-list-page">
    <AppPageHeader title="👤 Usuários" subtitle="Gestão de acesso e perfis do sistema">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="fetchData">Atualizar</DsButton>
        <DsButton tag="a" to="/users/new" variant="primary">+ Novo Usuário</DsButton>
      </template>
    </AppPageHeader>

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
        </div>
      </DsCard>
    </section>

    <div class="users-list-page__toolbar">
      <DsInput v-model="search" placeholder="Buscar por nome, e-mail..." />
      <DsInput
        v-model="roleFilter"
        type="select"
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
        placeholder="Todos status"
        style="max-width: 160px"
      >
        <option value="">Todos status</option>
        <option value="active">✅ Ativo</option>
        <option value="inactive">⏸ Inativo</option>
      </DsInput>
    </div>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="filteredUsers"
      :loading="loading"
      :empty-text="emptyText"
      variant="hoverable"
      caption="Lista de usuários do sistema"
    >
      <template #cell-status="{ row }">
        <StatusBadge
          :label="row.status === 'active' ? 'Ativo' : 'Inativo'"
          :variant="row.status === 'active' ? 'success' : 'neutral'"
        />
      </template>
      <template #cell-roleCode="{ row }">
        <span class="role-pill">{{ formatRole(row.roleCode) }}</span>
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
import { ref, computed, onMounted } from 'vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { useListData } from '@/composables/useListData';
import { userService } from '@/services/user';
import type { UserSummary } from '@/types/user';

const search = ref('');
const roleFilter = ref('');
const statusFilter = ref('');

const {
  loading,
  error,
  items: users,
  load: fetchData
} = useListData<UserSummary>({
  fetchFn: () => userService.list(),
  entityLabel: 'usuários'
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

const emptyText = computed(() => {
  if (search.value || roleFilter.value || statusFilter.value) {
    return 'Nenhum usuário encontrado para os filtros selecionados';
  }
  return 'Nenhum usuário cadastrado';
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

function formatRole(code: string) {
  return roleLabelMap[code] || code;
}

onMounted(fetchData);
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

.users-list-page__overview {
  margin-bottom: 4px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-metric {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
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
}
</style>

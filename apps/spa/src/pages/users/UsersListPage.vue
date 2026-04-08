<template>
  <div class="users-list-page">
    <AppPageHeader>
      <template #title>👤 Usuários</template>
      <template #actions>
        <DsButton tag="a" to="/users/new" variant="primary">+ Novo Usuário</DsButton>
      </template>
    </AppPageHeader>

    <div class="search-bar">
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

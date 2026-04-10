<template>
  <div class="list-page">
    <AppPageHeader title="Equipe" subtitle="Membros da equipe cadastrados no sistema">
      <template #actions>
        <DsButton variant="primary" @click="router.push('/staff/new')">Novo Membro</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="staff"
      :loading="loading"
      empty-icon="👨‍⚕️"
      empty-title="Nenhum membro encontrado"
      empty-description="Cadastre o primeiro membro da equipe."
      variant="hoverable"
    >
      <template #cell-fullName="{ row }">
        {{ (row as StaffSummary).fullName }}
      </template>
      <template #cell-employeeCode="{ row }">
        {{ (row as StaffSummary).employeeCode }}
      </template>
      <template #cell-department="{ row }">
        {{ (row as StaffSummary).department || '—' }}
      </template>
      <template #cell-jobTitle="{ row }">
        {{ (row as StaffSummary).jobTitle || '—' }}
      </template>
      <template #cell-status="{ row }">
        <span :class="['status-badge', (row as StaffSummary).status === 'active' ? 'status-badge--active' : 'status-badge--inactive']">
          {{ (row as StaffSummary).status === 'active' ? 'Ativo' : 'Inativo' }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/staff/${(row as StaffSummary).id}`)">
            Ver
          </DsButton>
          <DsButton size="sm" variant="secondary" @click="router.push(`/staff/${(row as StaffSummary).id}/edit`)">
            Editar
          </DsButton>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import { staffService } from '@/services/staff';
import type { StaffSummary } from '@cvg-his-v2/shared-types';
import type { DataTableColumn } from '@/components/DataTable.vue';

const router = useRouter();
const staff = ref<any[]>([]);
const loading = ref(false);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'fullName', label: 'Nome' },
  { key: 'employeeCode', label: 'Código' },
  { key: 'department', label: 'Departamento' },
  { key: 'jobTitle', label: 'Cargo' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    staff.value = await staffService.list();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar equipe';
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge--active {
  background: var(--color-success-100, #dcfce7);
  color: var(--color-success-700, #15803d);
}

.status-badge--inactive {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-600, #475569);
}
</style>
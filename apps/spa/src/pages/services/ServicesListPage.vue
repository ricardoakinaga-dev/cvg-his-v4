<template>
  <div class="list-page">
    <AppPageHeader title="Serviços" subtitle="Catálogo de serviços cadastrados no sistema">
      <template #actions>
        <DsButton variant="primary" @click="router.push('/services/new')">Novo Serviço</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="search-bar">
      <DsInput v-model="searchQuery" label="" placeholder="Buscar por nome ou código..." @input="debouncedSearch" />
    </div>

    <DataTable
      :columns="columns"
      :rows="services"
      :loading="loading"
      empty-icon="🛠️"
      empty-title="Nenhum serviço encontrado"
      empty-description="Cadastre o primeiro serviço para começar."
      variant="hoverable"
    >
      <template #cell-name="{ row }">
        {{ (row as ServiceSummary).name }}
      </template>
      <template #cell-code="{ row }">
        {{ (row as ServiceSummary).code ?? '—' }}
      </template>
      <template #cell-basePrice="{ row }">
        {{ formatCurrency((row as ServiceSummary).basePrice) }}
      </template>
      <template #cell-active="{ row }">
        <span :class="['status-badge', (row as ServiceSummary).active ? 'status-badge--active' : 'status-badge--inactive']">
          {{ (row as ServiceSummary).active ? 'Ativo' : 'Inativo' }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/services/${(row as ServiceSummary).id}`)">
            Ver
          </DsButton>
          <DsButton size="sm" variant="secondary" @click="router.push(`/services/${(row as ServiceSummary).id}/edit`)">
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
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { servicesService, type ServiceSummary } from '@/services/services';
import type { DataTableColumn } from '@/components/DataTable.vue';

const router = useRouter();
const services = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const searchQuery = ref('');

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Nome' },
  { key: 'code', label: 'Código' },
  { key: 'basePrice', label: 'Preço Base' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadData(searchQuery.value), 300);
}

async function loadData(search?: string) {
  loading.value = true;
  error.value = '';
  try {
    services.value = await servicesService.list(search);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar serviços';
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

.search-bar {
  max-width: 400px;
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
<template>
  <div class="list-page">
    <AppPageHeader
      title="Cadastro de Serviços"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Serviços']"
      subtitle="Cadastro mestre de serviços usados em agenda, comandas, vendas e faturamento.">
      <template #actions>
        <DsButton variant="primary" @click="router.push('/services/new')">Incluir</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard>
      <div class="legacy-filter-grid">
        <DsInput v-model="legacyFilters.id" label="Id" placeholder="Id" />
        <DsInput v-model="legacyFilters.description" label="Descrição" placeholder="Descrição" />
        <label class="active-filter">
          <input v-model="legacyFilters.activeOnly" type="checkbox" />
          <span>Serviços Ativos</span>
        </label>
        <DsButton variant="secondary" :loading="loading" @click="loadData()">
          Pesquisar
        </DsButton>
      </div>
    </DsCard>

    <DataTable
      :columns="columns"
      :rows="filteredServices"
      :loading="loading"
      empty-icon="🛠️"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou inclua um novo serviço."
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <code>{{ (row as ServiceSummary).id }}</code>
      </template>
      <template #cell-name="{ row }">
        {{ (row as ServiceSummary).name }}
      </template>
      <template #cell-basePrice="{ row }">
        {{ formatCurrency((row as ServiceSummary).basePrice) }}
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/services/${(row as ServiceSummary).id}`)">
            Abrir
          </DsButton>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { servicesService, type ServiceSummary } from '@/services/services';
import type { DataTableColumn } from '@/components/DataTable.vue';

const router = useRouter();
const services = ref<ServiceSummary[]>([]);
const loading = ref(false);
const error = ref('');
const legacyFilters = ref({
  id: '',
  description: '',
  activeOnly: true
});

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Id' },
  { key: 'name', label: 'Descrição' },
  { key: 'basePrice', label: 'Valor' },
  { key: 'actions', label: 'Abrir', class: 'table__actions-col' }
];

const filteredServices = computed(() => {
  const id = normalizeSearch(legacyFilters.value.id);
  const description = normalizeSearch(legacyFilters.value.description);

  return services.value.filter((service) => {
    const matchesId =
      !id || normalizeSearch(`${service.id} ${service.code ?? ''}`).includes(id);
    const matchesDescription =
      !description ||
      normalizeSearch(`${service.name} ${service.description ?? ''}`).includes(description);
    return matchesId && matchesDescription;
  });
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    services.value = await servicesService.list({
      search: legacyFilters.value.description || undefined,
      active: legacyFilters.value.activeOnly ? true : undefined
    });
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

.legacy-filter-grid {
  grid-template-columns: minmax(120px, 0.3fr) minmax(220px, 1fr) auto auto;
  display: grid;
  align-items: end;
  gap: 12px;
}

.active-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
}

.active-filter input {
  width: 18px;
  height: 18px;
}

.row-actions {
  display: flex;
  gap: 8px;
}

code {
  word-break: break-all;
}

@media (max-width: 760px) {
  .legacy-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>

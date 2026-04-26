<template>
  <div class="customer-groups-page">
    <AppPageHeader
      title="Grupos de Clientes"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Grupos de Clientes']"
      subtitle="Cadastro auxiliar usado para segmentar clientes, regras comerciais e filtros de atendimento.">
      <template #actions>
        <DsButton variant="primary" @click="router.push('/customer-groups/new')">Incluir</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard>
      <div class="legacy-filter-grid">
        <DsInput v-model="filters.id" label="Id" placeholder="Id" />
        <DsInput v-model="filters.description" label="Descrição" placeholder="Grupo, segmento ou código" />
        <DsInput v-model="filters.segment" label="Segmento" placeholder="Ex: Convenio" />
        <label class="active-filter">
          <input v-model="filters.activeOnly" type="checkbox" />
          <span>Grupos Ativos</span>
        </label>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Pesquisar</DsButton>
      </div>
    </DsCard>

    <DataTable
      :columns="columns"
      :rows="filteredCustomerGroups"
      :loading="loading"
      empty-icon="👥"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou inclua um novo grupo de clientes."
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <code>{{ (row as CustomerGroupSummary).id }}</code>
      </template>
      <template #cell-name="{ row }">
        <strong>{{ (row as CustomerGroupSummary).name }}</strong>
      </template>
      <template #cell-segment="{ row }">
        {{ (row as CustomerGroupSummary).segment ?? '—' }}
      </template>
      <template #cell-discountPercent="{ row }">
        {{ formatPercent((row as CustomerGroupSummary).discountPercent) }}
      </template>
      <template #cell-paymentTermDays="{ row }">
        {{ (row as CustomerGroupSummary).paymentTermDays }} dias
      </template>
      <template #cell-active="{ row }">
        {{ (row as CustomerGroupSummary).active ? 'Sim' : 'Não' }}
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/customer-groups/${(row as CustomerGroupSummary).id}`)">
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
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue';
import { customerGroupsService, type CustomerGroupSummary } from '@/services/customerGroups';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const router = useRouter();
const customerGroups = ref<CustomerGroupSummary[]>([]);
const loading = ref(false);
const error = ref('');
const filters = ref({
  id: '',
  description: '',
  segment: '',
  activeOnly: true
});

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Id', width: '220px' },
  { key: 'name', label: 'Descrição' },
  { key: 'segment', label: 'Segmento', width: '150px' },
  { key: 'discountPercent', label: 'Desconto', width: '120px' },
  { key: 'paymentTermDays', label: 'Prazo', width: '120px' },
  { key: 'active', label: 'Grupos Ativos', width: '140px' },
  { key: 'actions', label: 'Abrir', width: '120px', class: 'table__actions-col' }
];

const filteredCustomerGroups = computed(() => {
  const id = normalizeSearch(filters.value.id);
  const description = normalizeSearch(filters.value.description);

  return customerGroups.value.filter((item) => {
    const matchesId = !id || normalizeSearch(`${item.id} ${item.code ?? ''}`).includes(id);
    const matchesDescription =
      !description ||
      normalizeSearch(`${item.name} ${item.code ?? ''} ${item.segment ?? ''} ${item.description ?? ''}`).includes(description);
    return matchesId && matchesDescription;
  });
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    customerGroups.value = await customerGroupsService.list({
      search: filters.value.description || undefined,
      active: filters.value.activeOnly ? true : undefined,
      segment: filters.value.segment || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar grupos de clientes';
  } finally {
    loading.value = false;
  }
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

onMounted(loadData);
</script>

<style scoped>
.customer-groups-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.legacy-filter-grid {
  display: grid;
  grid-template-columns: minmax(120px, 0.35fr) minmax(220px, 1fr) minmax(160px, 0.5fr) auto auto;
  align-items: end;
  gap: 12px;
}

.active-filter {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  gap: 8px;
  color: var(--color-text, #0f172a);
  font-size: 14px;
  font-weight: 600;
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

@media (max-width: 980px) {
  .legacy-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>

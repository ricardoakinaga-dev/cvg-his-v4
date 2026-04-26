<template>
  <div class="laboratory-orders-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Atendimentos', 'Exames']"
      title="Exames"
      subtitle="Pedidos laboratoriais por cliente, animal e data"
    >
      <template #actions>
        <DsButton variant="primary" tag="a" to="/diagnostics" icon="➕">Incluir</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="summary-grid" aria-label="Resumo dos exames">
      <DsStatCard :label="`${orders.length} exame(s)`" value="" icon="🧪" />
      <DsStatCard :label="`${requestedCount} aguardando coleta`" value="" icon="📋" />
      <DsStatCard :label="`${collectedCount} coletado(s)`" value="" icon="🩸" />
      <DsStatCard :label="`${resultedCount} liberado(s)`" value="" icon="✅" />
    </section>

    <section class="filter-panel" aria-label="Filtros de exames">
      <form class="filters" @submit.prevent="applyFilters">
        <label class="filter-field">
          <span>Cliente</span>
          <input v-model="draftFilters.client" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Animal</span>
          <input v-model="draftFilters.animal" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Data</span>
          <input v-model="draftFilters.date" type="date" />
        </label>
        <DsButton type="submit" variant="primary">Pesquisar</DsButton>
      </form>
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredOrders"
      :loading="loading"
      empty-icon="🧪"
      empty-title="Nenhum registro encontrado"
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <span class="order-id">{{ shortId((row as LaboratoryOrderRow).id) }}</span>
      </template>
      <template #cell-clientName="{ row }">
        {{ (row as LaboratoryOrderRow).clientName }}
      </template>
      <template #cell-animalName="{ row }">
        {{ (row as LaboratoryOrderRow).animalName }}
      </template>
      <template #cell-createdAt="{ row }">
        {{ formatDate((row as LaboratoryOrderRow).createdAt) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/diagnostics?order=${(row as LaboratoryOrderRow).id}`"
          size="sm"
          variant="secondary"
        >
          Abrir
        </DsButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import type { DiagnosticOrderSummary } from '@cvg-his-v2/shared-types';
import { laboratoryService } from '@/services/laboratory';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';

interface LaboratoryOrderRow extends DiagnosticOrderSummary {
  clientName: string;
  animalName: string;
}

const orders = ref<DiagnosticOrderSummary[]>([]);
const patients = ref<PatientSummary[]>([]);
const owners = ref<OwnerSummary[]>([]);
const loading = ref(false);
const error = ref('');
const draftFilters = reactive({
  client: '',
  animal: '',
  date: ''
});
const appliedFilters = reactive({
  client: '',
  animal: '',
  date: ''
});

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Id', width: '18%' },
  { key: 'clientName', label: 'Cliente' },
  { key: 'animalName', label: 'Animal' },
  { key: 'createdAt', label: 'Data', width: '18%' },
  { key: 'actions', label: 'Abrir', class: 'table__actions-col', width: '120px' }
];

const ownerById = computed(() => new Map(owners.value.map((owner) => [owner.id, owner])));
const patientById = computed(() => new Map(patients.value.map((patient) => [patient.id, patient])));

const decoratedOrders = computed<LaboratoryOrderRow[]>(() =>
  orders.value.map((order) => {
    const patient = patientById.value.get(order.patientId);
    const owner = patient ? ownerById.value.get(patient.primaryOwnerId) : undefined;
    return {
      ...order,
      clientName: owner?.fullName ?? 'Cliente não identificado',
      animalName: patient?.name ?? order.patientId
    };
  })
);

const filteredOrders = computed(() => {
  const client = normalizeSearch(appliedFilters.client);
  const animal = normalizeSearch(appliedFilters.animal);
  const date = appliedFilters.date;

  return decoratedOrders.value.filter((order) => {
    if (client && !normalizeSearch(order.clientName).includes(client)) return false;
    if (animal && !normalizeSearch(order.animalName).includes(animal) && !normalizeSearch(order.patientId).includes(animal)) {
      return false;
    }
    if (date && order.createdAt.slice(0, 10) !== date) return false;
    return true;
  });
});

const requestedCount = computed(() => orders.value.filter((item) => item.status === 'requested').length);
const collectedCount = computed(() => orders.value.filter((item) => item.status === 'collected').length);
const resultedCount = computed(() => orders.value.filter((item) => item.status === 'resulted').length);

function normalizeSearch(value: string | undefined): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 12)}...` : id;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function applyFilters() {
  appliedFilters.client = draftFilters.client;
  appliedFilters.animal = draftFilters.animal;
  appliedFilters.date = draftFilters.date;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [ordersResult, patientsResult, ownersResult] = await Promise.allSettled([
      laboratoryService.listOrders({ date: appliedFilters.date || undefined }),
      patientService.list({ pageSize: 500 }),
      ownerService.list({ pageSize: 500 })
    ]);

    if (ordersResult.status === 'rejected') {
      throw ordersResult.reason;
    }

    orders.value = ordersResult.value;
    patients.value = patientsResult.status === 'fulfilled' ? patientsResult.value : [];
    owners.value = ownersResult.status === 'fulfilled' ? ownersResult.value : [];
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar exames';
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-orders-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr)) auto;
  align-items: end;
  gap: 12px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.filter-field input {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.order-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

@media (max-width: 780px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>

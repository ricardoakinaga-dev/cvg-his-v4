<template>
  <div class="laboratory-orders-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Atendimentos', 'Pedidos de Exame']"
      title="Pedidos de Exame"
      subtitle="Solicitações laboratoriais e backlog de coleta"
    >
      <template #actions>
        <DsButton variant="primary" tag="a" to="/diagnostics" icon="➕">Novo Pedido</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis">
      <DsStatCard :label="`${orders.length} pedido(s)`" value="" icon="📋" />
      <DsStatCard :label="`${requestedCount} aguardando coleta`" value="" icon="🔬" />
      <DsStatCard :label="`${collectedCount} coletado(s)`" value="" icon="🩸" />
      <DsStatCard :label="`${resultedCount} liberado(s)`" value="" icon="✅" />
    </section>

    <DataTable
      :columns="columns"
      :rows="orders"
      :loading="loading"
      empty-icon="🧪"
      empty-title="Nenhum pedido de exame encontrado"
      empty-description="Solicite o primeiro exame para iniciar a trilha laboratorial."
      variant="hoverable"
    >
      <template #cell-status="{ row }">
        <DsBadge :variant="statusVariant(row.status)" size="sm">
          {{ statusLabel(row.status) }}
        </DsBadge>
      </template>
      <template #cell-createdAt="{ row }">
        {{ formatDate((row as DiagnosticOrderSummary).createdAt) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton tag="a" :to="`/diagnostics?order=${(row as DiagnosticOrderSummary).id}`" size="sm" variant="secondary">
          Ver detalhes
        </DsButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import type { DiagnosticOrderSummary } from '@cvg-his-v2/shared-types';
import { laboratoryService } from '@/services/laboratory';

const orders = ref<DiagnosticOrderSummary[]>([]);
const loading = ref(false);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'examType', label: 'Tipo de Exame' },
  { key: 'patientId', label: 'Paciente' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Criado em' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const requestedCount = computed(() => orders.value.filter((item) => item.status === 'requested').length);
const collectedCount = computed(() => orders.value.filter((item) => item.status === 'collected').length);
const resultedCount = computed(() => orders.value.filter((item) => item.status === 'resulted').length);

function statusVariant(status: string): 'default' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'requested': return 'warning';
    case 'collected': return 'default';
    case 'resulted': return 'success';
    case 'cancelled': return 'danger';
    default: return 'default';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'requested': return 'Solicitado';
    case 'collected': return 'Coletado';
    case 'resulted': return 'Liberado';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
}

function formatDate(d: string): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    orders.value = await laboratoryService.listOrders();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar pedidos';
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

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
</style>

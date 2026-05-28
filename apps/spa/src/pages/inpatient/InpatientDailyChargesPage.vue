<template>
  <div class="inpatient-daily-charges-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Internação', 'Diárias']"
      title="💵 Diárias de Internação"
      subtitle="Controle operacional de diárias pendentes e faturadas por setor."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton tag="a" to="/inpatient" variant="secondary">Internações</DsButton>
        <DsButton tag="a" to="/billing" variant="primary">Contas a Receber</DsButton>
      </template>
    </AppPageHeader>

    <section class="summary-grid">
      <DsCard title="Pendente">
        <strong class="summary-value">{{ formatCurrency(worklist.totalPendingAmount) }}</strong>
        <span>{{ pendingCount }} diária(s)</span>
      </DsCard>
      <DsCard title="Faturado">
        <strong class="summary-value">{{ formatCurrency(worklist.totalBilledAmount) }}</strong>
        <span>{{ billedCount }} diária(s)</span>
      </DsCard>
      <DsCard title="Itens">
        <strong class="summary-value">{{ worklist.items.length }}</strong>
        <span>diárias no filtro atual</span>
      </DsCard>
    </section>

    <section class="filters">
      <label>
        Status
        <select v-model="filters.status">
          <option value="pending">Pendentes</option>
          <option value="billed">Faturadas</option>
          <option value="">Todas</option>
        </select>
      </label>
      <label>
        Unidade
        <input v-model="filters.unit" placeholder="UTI, Internação..." />
      </label>
      <label>
        Enfermaria
        <input v-model="filters.ward" placeholder="Ala A..." />
      </label>
      <DsButton variant="secondary" @click="load">Filtrar</DsButton>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>

    <DataTable
      :columns="columns"
      :rows="worklist.items"
      :loading="loading"
      empty-icon="💵"
      empty-title="Nenhuma diária encontrada"
      empty-description="As diárias lançadas nas internações aparecem aqui para acompanhamento financeiro."
      variant="hoverable"
    >
      <template #cell-patient="{ row }">
        {{ patientName((row as InpatientDailyChargeWorklistItem).patientId) }}
      </template>
      <template #cell-location="{ row }">
        <strong>{{ (row as InpatientDailyChargeWorklistItem).unit }}</strong>
        <span class="muted"> / {{ (row as InpatientDailyChargeWorklistItem).ward }}</span>
        <span class="muted"> / {{ (row as InpatientDailyChargeWorklistItem).bed }}</span>
      </template>
      <template #cell-description="{ row }">
        <strong>{{ (row as InpatientDailyChargeWorklistItem).description }}</strong>
        <span class="muted">
          {{ (row as InpatientDailyChargeWorklistItem).quantity }} x
          {{ formatCurrency((row as InpatientDailyChargeWorklistItem).unitAmount) }}
        </span>
      </template>
      <template #cell-total="{ row }">
        {{ formatCurrency((row as InpatientDailyChargeWorklistItem).totalAmount) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="statusLabel((row as InpatientDailyChargeWorklistItem).status)"
          :variant="statusVariant((row as InpatientDailyChargeWorklistItem).status)"
        />
      </template>
      <template #cell-actions="{ row }">
        <div class="actions">
          <DsButton
            tag="a"
            :to="`/inpatient/${(row as InpatientDailyChargeWorklistItem).stayId}`"
            size="sm"
            variant="secondary"
          >
            Internação
          </DsButton>
          <DsButton
            v-if="(row as InpatientDailyChargeWorklistItem).billingRecordId"
            tag="a"
            :to="`/billing/${(row as InpatientDailyChargeWorklistItem).encounterId}`"
            size="sm"
            variant="ghost"
          >
            Cobrança
          </DsButton>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { inpatientService } from '@/services/inpatient';
import { useEntityCache } from '@/composables/useEntityCache';
import type {
  InpatientDailyChargeSummary,
  InpatientDailyChargeWorklistItem,
  InpatientDailyChargeWorklistResponse
} from '@/types/inpatient';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const entityCache = useEntityCache();
const loading = ref(false);
const error = ref('');
const worklist = ref<InpatientDailyChargeWorklistResponse>({
  items: [],
  totalPendingAmount: 0,
  totalBilledAmount: 0
});
const filters = ref<{
  status: InpatientDailyChargeSummary['status'] | '';
  unit: string;
  ward: string;
}>({
  status: 'pending',
  unit: '',
  ward: ''
});
const patientNames = ref<Record<string, string>>({});

const columns: DataTableColumn[] = [
  { key: 'patient', label: 'Paciente' },
  { key: 'location', label: 'Local' },
  { key: 'description', label: 'Diária' },
  { key: 'chargeDate', label: 'Data' },
  { key: 'total', label: 'Total' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações' }
];

const pendingCount = computed(
  () => worklist.value.items.filter((item) => item.status === 'pending').length
);
const billedCount = computed(
  () => worklist.value.items.filter((item) => item.status === 'billed').length
);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function statusLabel(status: InpatientDailyChargeSummary['status']): string {
  return { pending: 'Pendente', billed: 'Faturada', cancelled: 'Cancelada' }[status] ?? status;
}

function statusVariant(status: InpatientDailyChargeSummary['status']) {
  return ({ pending: 'warning', billed: 'success', cancelled: 'neutral' }[status] ?? 'default') as any;
}

function patientName(patientId: string): string {
  return patientNames.value[patientId] ?? `Paciente ${patientId.slice(0, 8)}...`;
}

async function hydratePatientNames(items: InpatientDailyChargeWorklistItem[]) {
  const patientIds = [...new Set(items.map((item) => item.patientId))];
  for (const patientId of patientIds) {
    if (!patientNames.value[patientId]) {
      patientNames.value[patientId] = await entityCache.getPatientName(patientId);
    }
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const response = await inpatientService.listDailyChargeWorklist({
      status: filters.value.status || undefined,
      unit: filters.value.unit.trim() || undefined,
      ward: filters.value.ward.trim() || undefined
    });
    worklist.value = response;
    await hydratePatientNames(response.items);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar diárias de internação';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.summary-value {
  display: block;
  font-size: 22px;
  margin-bottom: 4px;
}
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
  margin-bottom: 16px;
}
.filters label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}
.filters input,
.filters select {
  min-height: 38px;
  border: 1px solid var(--color-border, #d8dee9);
  border-radius: 8px;
  padding: 0 10px;
}
.muted {
  display: block;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

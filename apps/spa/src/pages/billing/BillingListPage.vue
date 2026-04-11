<template>
  <div class="billing-list-page">
    <AppPageHeader title="💰 Faturamento" subtitle="Controle de cobrança e faturamento">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="billing-list-page__overview">
      <DsCard title="Resumo financeiro">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ items.length }}</span>
            <span class="overview-metric__label">Registros</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ openCount }}</span>
            <span class="overview-metric__label">Em aberto</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ settledCount }}</span>
            <span class="overview-metric__label">Quitados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ totalAmountFormatted }}</span>
            <span class="overview-metric__label">Subtotal acumulado</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="billing-list-page__story">
      <DsCard title="Leitura rápida">
        <div class="story-grid">
          <div v-for="card in storyCards" :key="card.label" class="story-card">
            <span class="story-card__label">{{ card.label }}</span>
            <strong class="story-card__value">{{ card.value }}</strong>
            <span class="story-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      empty-icon="💰"
      empty-title="Nenhum registro de faturamento"
      empty-description="Os registros aparecem quando atendimentos são abertos."
      variant="hoverable"
    >
      <template #cell-encounter="{ row }">
        <router-link
          :to="`/encounters/${(row as BillingRecordSummary).encounterId}`"
          class="encounter-link"
        >
          {{ (row as BillingRecordSummary).encounterId.slice(0, 8) }}...
        </router-link>
      </template>
      <template #cell-patient="{ row }">
        {{ patientName((row as BillingRecordSummary).patientId) }}
      </template>
      <template #cell-owner="{ row }">
        {{ ownerName((row as BillingRecordSummary).ownerId) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="billingStatusLabel((row as BillingRecordSummary).status)"
          :variant="billingStatusVariant((row as BillingRecordSummary).status)"
        />
      </template>
      <template #cell-amount="{ row }">
        {{ formatCurrency((row as BillingRecordSummary).subtotalAmount) }}
      </template>
      <template #cell-items="{ row }">
        <DsButton
          tag="a"
          :to="`/billing/${(row as BillingRecordSummary).encounterId}`"
          size="sm"
          variant="secondary"
        >
          Ver itens →
        </DsButton>
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/billing/${(row as BillingRecordSummary).encounterId}`"
          size="sm"
          variant="secondary"
        >
          Gerenciar
        </DsButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { billingService } from '@/services/billing';
import type { BillingRecordSummary, BillingStatus } from '@/types/billing';
import { useEntityCache } from '@/composables/useEntityCache';
import { useListData } from '@/composables/useListData';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { computed } from 'vue';

const entityCache = useEntityCache();
const patientNames = ref<Record<string, string>>({});
const ownerNames = ref<Record<string, string>>({});

const columns: DataTableColumn[] = [
  { key: 'encounter', label: 'Atendimento' },
  { key: 'patient', label: 'Paciente' },
  { key: 'owner', label: 'Tutor' },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Subtotal' },
  { key: 'items', label: 'Itens' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const statusLabelMap: Record<BillingStatus, string> = {
  draft: 'Rascunho',
  estimated: 'Estimado',
  open: 'Aberto',
  settled: 'Quitado'
};

const statusVariantMap: Record<BillingStatus, string> = {
  draft: 'neutral',
  estimated: 'info',
  open: 'warning',
  settled: 'success'
};

function billingStatusLabel(s: BillingStatus) {
  return statusLabelMap[s] || s;
}

function billingStatusVariant(s: BillingStatus) {
  return (statusVariantMap[s] || 'default') as any;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function patientName(id: string): string {
  return patientNames.value[id] || `Paciente ${id.slice(0, 8)}...`;
}

function ownerName(id: string): string {
  return ownerNames.value[id] || `Tutor ${id.slice(0, 8)}...`;
}

const openCount = computed(() => items.value.filter((record) => record.status === 'open').length);
const settledCount = computed(() => items.value.filter((record) => record.status === 'settled').length);
const totalAmountFormatted = computed(() => formatCurrency(items.value.reduce((sum, record) => sum + record.subtotalAmount, 0)));
const openRate = computed(() => {
  if (!items.value.length) return '0%';
  return `${Math.round((openCount.value / items.value.length) * 100)}%`;
});
const storyCards = computed(() => [
  { label: 'Abertos', value: openCount.value.toString(), hint: 'Cobranças em andamento' },
  { label: 'Quitados', value: settledCount.value.toString(), hint: 'Itens já fechados' },
  { label: 'Taxa aberta', value: openRate.value, hint: 'Proporção pendente' },
  { label: 'Subtotal', value: totalAmountFormatted.value, hint: 'Volume acumulado' }
]);

const { items, loading, error, load } = useListData<BillingRecordSummary>({
  fetchFn: async () => {
    const records = await billingService.list();
    const patientIds = [...new Set(records.map((r) => r.patientId))];
    const ownerIds = [...new Set(records.map((r) => r.ownerId))];
    await Promise.all([
      ...patientIds.map(async (id) => {
        patientNames.value[id] = await entityCache.getPatientName(id);
      }),
      ...ownerIds.map(async (id) => {
        ownerNames.value[id] = await entityCache.getOwnerName(id);
      })
    ]);
    return records;
  },
  entityLabel: 'faturamentos'
});

function reload() {
  void load();
}
</script>

<style scoped>
.billing-list-page__overview {
  margin-bottom: 16px;
}

.billing-list-page__story {
  margin-bottom: 16px;
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
  font-size: 22px;
  font-weight: 800;
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.story-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.story-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.story-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.story-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.encounter-link {
  color: var(--color-primary-600, #2563eb);
  text-decoration: none;
  font-weight: 500;
}

.encounter-link:hover {
  text-decoration: underline;
}
.encounter-link {
  color: var(--color-primary-600, #2563eb);
  text-decoration: none;
  font-weight: 500;
}

.encounter-link:hover {
  text-decoration: underline;
}
</style>

<template>
  <div class="billing-list-page">
    <AppPageHeader
      title="💰 Faturamento"
      subtitle="Contas a receber, cobrança assistencial e leitura executiva do backoffice financeiro"
      :secondary-actions="headerSecondaryActions"
    />

    <!-- Hub: KPI StatCards -->
    <section class="hub-kpis">
      <DsStatCard :label="items.length + ' registro(s)'" value="" icon="📋" />
      <DsStatCard :label="openCount + ' em aberto'" value="" icon="⏳" :error="openCount > 0 ? 'Há cobranças pendentes' : undefined" />
      <DsStatCard :label="settledCount + ' quitado(s)'" value="" icon="✅" />
      <DsStatCard :label="totalAmountFormatted" value="" icon="💵" />
    </section>

    <!-- Hub: Operational Alerts -->
    <section v-if="billingAlerts.length > 0" class="hub-alerts">
      <DsAlert
        v-for="(alert, i) in billingAlerts"
        :key="i"
        :variant="alert.variant"
        dismissible
      >
        <strong>{{ alert.title }}</strong> — {{ alert.message }}
      </DsAlert>
    </section>

    <!-- Hub: Quick Actions -->
    <section class="hub-actions">
      <DsCard title="Ações rápidas — Financeiro" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" tag="a" to="/billing/new" icon="💰">
            Novo Faturamento
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/cash" icon="🏦">
            Gaveta / Caixa
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/quotes" icon="🧾">
            Orçamentos
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/pix" icon="💸">
            PIX
          </DsButton>
          <DsButton variant="ghost" :loading="loading" @click="reload" icon="🔄">
            Atualizar
          </DsButton>
        </div>
      </DsCard>
    </section>

    <section class="billing-story">
      <DsCard title="Leitura financeira do dia">
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
      :rows="billingRows"
      :loading="loading"
      empty-icon="💰"
      empty-title="Nenhum registro de faturamento"
      empty-description="Os registros aparecem quando atendimentos são abertos."
      variant="hoverable"
    >
      <template #cell-encounter="{ row }">
        <router-link
          :to="`/encounters/${billingRow(row).encounterId}`"
          class="encounter-link"
        >
          {{ billingRow(row).encounterId.slice(0, 8) }}...
        </router-link>
      </template>
      <template #cell-patient="{ row }">
        {{ patientName(billingRow(row).patientId) }}
      </template>
      <template #cell-owner="{ row }">
        {{ ownerName(billingRow(row).ownerId) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="billingStatusLabel(billingRow(row).status)"
          :variant="billingStatusVariant(billingRow(row).status)"
        />
      </template>
      <template #cell-amount="{ row }">
        {{ formatCurrency(billingRow(row).subtotalAmount) }}
      </template>
      <template #cell-items="{ row }">
        <DsButton
          tag="a"
          :to="`/billing/${billingRow(row).encounterId}`"
          size="sm"
          variant="secondary"
        >
          Ver itens →
        </DsButton>
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/billing/${billingRow(row).encounterId}`"
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
import { computed, ref } from 'vue';
import { billingService } from '@/services/billing';
import type { BillingRecordSummary, BillingStatus } from '@/types/billing';
import { useEntityCache } from '@/composables/useEntityCache';
import { useListData } from '@/composables/useListData';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

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
const billingRows = computed(() => items.value as unknown as DataTableRow[]);
const totalAmountFormatted = computed(() => formatCurrency(items.value.reduce((sum, record) => sum + record.subtotalAmount, 0)));
const openRate = computed(() => {
  if (!items.value.length) return '0%';
  return `${Math.round((openCount.value / items.value.length) * 100)}%`;
});
const averageTicket = computed(() =>
  items.value.length
    ? formatCurrency(items.value.reduce((sum, record) => sum + record.subtotalAmount, 0) / items.value.length)
    : formatCurrency(0)
);
const storyCards = computed(() => [
  { label: 'Cobrança aberta', value: openRate.value, hint: 'Percentual da carteira em aberto' },
  { label: 'Recebido', value: String(settledCount.value), hint: 'Registros já liquidados' },
  { label: 'Ticket médio', value: averageTicket.value, hint: 'Valor médio por faturamento' },
  { label: 'Base ativa', value: String(items.value.length), hint: 'Registros sob acompanhamento' }
]);

interface BillingAlert {
  variant: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

const billingAlerts = computed<BillingAlert[]>(() => {
  const alerts: BillingAlert[] = [];
  if (openCount.value > 0) {
    alerts.push({ variant: 'warning', title: 'Cobranças em aberto', message: `${openCount.value} registro(s) aguardando quitação.` });
  }
  if (openCount.value === 0 && items.value.length > 0) {
    alerts.push({ variant: 'info', title: 'Tudo quitado', message: 'Todas as cobranças foram liquidadas.' });
  }
  return alerts;
});

const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-billing',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => reload()
  }
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

function billingRow(row: unknown): BillingRecordSummary {
  return row as BillingRecordSummary;
}
</script>

<style scoped>
.billing-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.hub-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hub-actions {
  margin-bottom: 0;
}

.billing-story {
  margin-bottom: 0;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.story-card__value {
  display: block;
  margin-top: 6px;
  font-size: 20px;
  font-weight: 800;
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

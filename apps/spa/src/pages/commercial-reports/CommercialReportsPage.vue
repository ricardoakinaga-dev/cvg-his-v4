<template>
  <div class="commercial-reports-page">
    <AppPageHeader
      title="Relatórios Comerciais"
      subtitle="Visão executiva sobre faturamento, vendas e orçamentos"
    >
      <template #actions>
        <DsBadge variant="info" size="md">{{ summary.totalInvoices }} faturas</DsBadge>
        <DsBadge variant="info" size="md">{{ summary.totalQuotes }} orçamentos</DsBadge>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="commercial-reports-page__overview">
      <div class="overview-grid">
        <div class="overview-card">
          <span class="overview-card__value">{{ summary.totalInvoices }}</span>
          <span class="overview-card__label">Faturas</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ formatCurrency(summary.grossRevenue) }}</span>
          <span class="overview-card__label">Receita bruta</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ formatCurrency(summary.quotePipeline) }}</span>
          <span class="overview-card__label">Pipeline de orçamentos</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ summary.approvedQuotes }}</span>
          <span class="overview-card__label">Orçamentos aprovados</span>
        </div>
      </div>
    </section>

    <section class="filters">
      <DsInput v-model="query" placeholder="Filtrar por número, status ou observação" />
      <DsInput v-model="statusFilter" type="select" style="max-width: 180px">
        <option value="">Todos os status</option>
        <option value="open">Abertos</option>
        <option value="settled">Quitados</option>
        <option value="draft">Rascunhos</option>
        <option value="approved">Aprovados</option>
      </DsInput>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="grid">
      <DsCard title="Faturamento" class="panel">
        <DataTable
          :columns="billingColumns"
          :rows="filteredBilling"
          :loading="loading"
          empty-icon="💰"
          empty-title="Sem faturamento no período"
          empty-description="Os registros são consolidados a partir do módulo de faturamento."
          variant="hoverable"
        >
          <template #cell-status="{ row }">
            <StatusBadge :label="billingStatusLabel((row as BillingRecordSummary).status)" :variant="billingStatusVariant((row as BillingRecordSummary).status)" />
          </template>
          <template #cell-subtotalAmount="{ row }">
            {{ formatCurrency((row as BillingRecordSummary).subtotalAmount) }}
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Orçamentos" class="panel">
        <DataTable
          :columns="quoteColumns"
          :rows="filteredQuotes"
          :loading="loading"
          empty-icon="📝"
          empty-title="Sem orçamentos"
          empty-description="Os orçamentos aparecem aqui para análise comercial."
          variant="hoverable"
        >
          <template #cell-status="{ row }">
            <StatusBadge :label="quoteStatusLabel((row as QuoteSummary).status)" :variant="quoteStatusVariant((row as QuoteSummary).status)" />
          </template>
          <template #cell-total="{ row }">
            {{ formatCurrency((row as QuoteSummary).total) }}
          </template>
          <template #cell-convertedToSaleId="{ row }">
            <DsBadge :variant="(row as QuoteSummary).convertedToSaleId ? 'success' : 'neutral'" size="sm">
              {{ (row as QuoteSummary).convertedToSaleId ? 'Convertido' : 'Pendente' }}
            </DsBadge>
          </template>
        </DataTable>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { billingService } from '@/services/billing';
import { quoteService, type QuoteSummary } from '@/services/quotes';
import type { BillingRecordSummary, BillingStatus } from '@/types/billing';
import type { DataTableColumn } from '@/components/DataTable.vue';

const loading = ref(true);
const error = ref('');
const query = ref('');
const statusFilter = ref('');
const billing = ref<BillingRecordSummary[]>([]);
const quotes = ref<QuoteSummary[]>([]);

const billingColumns: DataTableColumn[] = [
  { key: 'encounterId', label: 'Atendimento' },
  { key: 'patientId', label: 'Paciente' },
  { key: 'ownerId', label: 'Tutor' },
  { key: 'status', label: 'Status' },
  { key: 'subtotalAmount', label: 'Subtotal' }
];

const quoteColumns: DataTableColumn[] = [
  { key: 'number', label: 'Número' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total' },
  { key: 'convertedToSaleId', label: 'Venda' }
];

const summary = computed(() => ({
  totalInvoices: billing.value.length,
  grossRevenue: billing.value.reduce((sum, item) => sum + (item.subtotalAmount ?? 0), 0),
  totalQuotes: quotes.value.length,
  approvedQuotes: quotes.value.filter((item) => item.status === 'approved').length,
  quotePipeline: quotes.value
    .filter((item) => ['draft', 'approved'].includes(item.status))
    .reduce((sum, item) => sum + (item.total ?? 0), 0)
}));

const filteredBilling = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return billing.value.filter((item) => {
    const matchesQuery =
      !needle ||
      [item.encounterId, item.patientId, item.ownerId, item.status].some((value) =>
        String(value ?? '').toLowerCase().includes(needle)
      );
    const matchesStatus = !statusFilter.value || item.status === statusFilter.value;
    return matchesQuery && matchesStatus;
  });
});

const filteredQuotes = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return quotes.value.filter((item) => {
    const matchesQuery =
      !needle ||
      [item.number, item.status, item.notes, item.ownerId, item.convertedToSaleId].some((value) =>
        String(value ?? '').toLowerCase().includes(needle)
      );
    const matchesStatus = !statusFilter.value || item.status === statusFilter.value;
    return matchesQuery && matchesStatus;
  });
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function billingStatusLabel(status: BillingStatus) {
  const map: Record<BillingStatus, string> = {
    draft: 'Rascunho',
    estimated: 'Estimado',
    open: 'Aberto',
    settled: 'Quitado'
  };
  return map[status] ?? status;
}

function billingStatusVariant(status: BillingStatus) {
  const map: Record<BillingStatus, 'neutral' | 'info' | 'warning' | 'success'> = {
    draft: 'neutral',
    estimated: 'info',
    open: 'warning',
    settled: 'success'
  };
  return map[status];
}

function quoteStatusLabel(status: QuoteSummary['status']) {
  const map: Record<QuoteSummary['status'], string> = {
    draft: 'Rascunho',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    expired: 'Expirado',
    cancelled: 'Cancelado'
  };
  return map[status];
}

function quoteStatusVariant(status: QuoteSummary['status']) {
  const map: Record<QuoteSummary['status'], 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
    draft: 'neutral',
    approved: 'success',
    rejected: 'danger',
    expired: 'warning',
    cancelled: 'neutral'
  };
  return map[status];
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const [records, quoteItems] = await Promise.all([billingService.list(), quoteService.list()]);
    billing.value = records;
    quotes.value = quoteItems;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar relatórios comerciais';
  } finally {
    loading.value = false;
  }
}

function reload() {
  void loadData();
}

onMounted(loadData);
</script>

<style scoped>
.commercial-reports-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-card__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-card__label {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
}

.filters {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 16px;
}

.panel {
  border-radius: 18px;
}
</style>

<template>
  <div class="commercial-reports-page">
    <AppPageHeader
      title="Relatórios Comerciais"
      subtitle="Hub analítico de faturamento, conversão comercial e receita operacional"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <!-- Hub: KPI StatCards -->
    <section class="hub-kpis">
      <DsStatCard :label="summary.totalInvoices + ' fatura(s)'" value="" icon="💰" />
      <DsStatCard :label="formatCurrency(summary.grossRevenue)" value="" icon="📈" />
      <DsStatCard :label="summary.approvedQuotes + ' aprovado(s)'" value="" icon="✅" />
      <DsStatCard :label="formatCurrency(summary.quotePipeline)" value="" icon="🧾" />
    </section>

    <!-- Hub: Operational Alerts -->
    <section v-if="reportAlerts.length > 0" class="hub-alerts">
      <DsAlert
        v-for="(alert, i) in reportAlerts"
        :key="i"
        :variant="alert.variant"
        dismissible
      >
        <strong>{{ alert.title }}</strong> — {{ alert.message }}
      </DsAlert>
    </section>

    <!-- Hub: Quick Actions -->
    <section class="hub-actions">
      <DsCard title="Ações rápidas" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" tag="a" to="/quotes" icon="🧾">
            Criar Orçamento
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/billing" icon="💰">
            Faturamento
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/cash" icon="🏦">
            Ver Caixa
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/counter-sales" icon="🛒">
            Vendas Balcão
          </DsButton>
          <DsButton variant="ghost" :loading="loading" @click="reload" icon="🔄">
            Atualizar
          </DsButton>
        </div>
      </DsCard>
    </section>

    <section class="reports-story">
      <DsCard title="Leitura executiva da carteira">
        <div class="summary-grid">
          <div v-for="card in storyCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
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
          :rows="billingRows"
          :loading="loading"
          empty-icon="💰"
          empty-title="Sem faturamento no período"
          empty-description="Os registros são consolidados a partir do módulo de faturamento."
          variant="hoverable"
        >
          <template #cell-status="{ row }">
            <StatusBadge :label="billingStatusLabel(billingRow(row).status)" :variant="billingStatusVariant(billingRow(row).status)" />
          </template>
          <template #cell-subtotalAmount="{ row }">
            {{ formatCurrency(billingRow(row).subtotalAmount) }}
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Orçamentos" class="panel">
        <DataTable
          :columns="quoteColumns"
          :rows="quoteRows"
          :loading="loading"
          empty-icon="📝"
          empty-title="Sem orçamentos"
          empty-description="Os orçamentos aparecem aqui para análise comercial."
          variant="hoverable"
        >
          <template #cell-status="{ row }">
            <StatusBadge :label="quoteStatusLabel(quoteRow(row).status)" :variant="quoteStatusVariant(quoteRow(row).status)" />
          </template>
          <template #cell-total="{ row }">
            {{ formatCurrency(quoteRow(row).total) }}
          </template>
          <template #cell-convertedToSaleId="{ row }">
            <DsBadge :variant="quoteRow(row).convertedToSaleId ? 'success' : 'neutral'" size="sm">
              {{ quoteRow(row).convertedToSaleId ? 'Convertido' : 'Pendente' }}
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
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { billingService } from '@/services/billing';
import { quoteService, type QuoteSummary } from '@/services/quotes';
import type { BillingRecordSummary, BillingStatus } from '@/types/billing';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';

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
const storyCards = computed(() => {
  const convertedQuotes = quotes.value.filter((item) => item.convertedToSaleId).length;
  const conversionRate = quotes.value.length
    ? `${Math.round((convertedQuotes / quotes.value.length) * 100)}%`
    : '0%';
  const settledBilling = billing.value.filter((item) => item.status === 'settled').length;
  const settlementRate = billing.value.length
    ? `${Math.round((settledBilling / billing.value.length) * 100)}%`
    : '0%';

  return [
    { label: 'Conversão', value: conversionRate, hint: 'Orçamentos transformados em venda' },
    { label: 'Liquidação', value: settlementRate, hint: 'Faturamentos já quitados' },
    { label: 'Pipeline', value: formatCurrency(summary.value.quotePipeline), hint: 'Volume comercial em andamento' },
    { label: 'Receita', value: formatCurrency(summary.value.grossRevenue), hint: 'Receita consolidada do período' }
  ];
});

interface ReportAlert {
  variant: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

const reportAlerts = computed<ReportAlert[]>(() => {
  const alerts: ReportAlert[] = [];
  const openBilling = billing.value.filter((b) => b.status === 'open').length;
  if (openBilling > 0) {
    alerts.push({ variant: 'warning', title: 'Cobranças em aberto', message: `${openBilling} fatura(s) aguardando quitação.` });
  }
  const approvedQuotesCount = quotes.value.filter((q) => q.status === 'approved').length;
  if (approvedQuotesCount > 0) {
    alerts.push({ variant: 'info', title: 'Orçamentos prontos', message: `${approvedQuotesCount} orçamento(s) aprovado(s) e aguardando conversão.` });
  }
  return alerts;
});

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

const billingRows = computed(() => filteredBilling.value as unknown as DataTableRow[]);
const quoteRows = computed(() => filteredQuotes.value as unknown as DataTableRow[]);

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

function billingRow(row: unknown): BillingRecordSummary {
  return row as BillingRecordSummary;
}

function quoteRow(row: unknown): QuoteSummary {
  return row as QuoteSummary;
}
</script>

<style scoped>
.commercial-reports-page {
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

.reports-story {
  margin-bottom: 0;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.summary-card__value {
  display: block;
  margin-top: 6px;
  font-size: 20px;
  font-weight: 800;
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.panel {
  border-radius: 18px;
}
</style>

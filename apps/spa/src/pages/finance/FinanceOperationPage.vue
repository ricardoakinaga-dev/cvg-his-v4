<template>
  <section class="finance-operation-page">
    <AppPageHeader
      :title="config.title"
      :breadcrumbs="['Financeiro', 'Operação', config.breadcrumb]"
      :subtitle="config.subtitle"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert :variant="config.alertVariant">
      <strong>{{ config.alertTitle }}</strong> {{ config.alertText }}
    </DsAlert>

    <section class="finance-kpis">
      <DsStatCard :label="formatCurrency(totalInflows)" value="" icon="💵" />
      <DsStatCard :label="formatCurrency(totalOutflows)" value="" icon="💸" />
      <DsStatCard :label="formatCurrency(netFlow)" value="" icon="📈" />
      <DsStatCard :label="`${rows.length} linha(s)`" value="" icon="📋" />
    </section>

    <div class="finance-toolbar">
      <DsInput v-model="query" :label="config.searchLabel" :placeholder="config.searchPlaceholder" />
      <DsInput v-model="kindFilter" type="select" label="Natureza">
        <option value="">Todos</option>
        <option value="inflow">Entrada</option>
        <option value="outflow">Saída</option>
        <option value="decision">Decisão</option>
      </DsInput>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      :empty-title="config.emptyTitle"
      empty-description="Os dados financeiros publicados pela API aparecerão aqui."
      empty-icon="💰"
      variant="hoverable"
    >
      <template #cell-kind="{ row }">
        <DsBadge :variant="kindVariant((row as FinanceRow).kind)" size="sm">
          {{ kindLabel((row as FinanceRow).kind) }}
        </DsBadge>
      </template>
      <template #cell-amount="{ row }">
        {{ formatCurrency((row as FinanceRow).amount) }}
      </template>
      <template #cell-description="{ row }">
        <strong>{{ (row as FinanceRow).description }}</strong>
      </template>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { billingService } from '@/services/billing';
import type { BillingRecordSummary } from '@/types/billing';
import { expensesCatalogService, type ExpenseCatalogItem } from '@/services/expensesCatalog';
import { quoteService, type QuoteSummary } from '@/services/quotes';

type FinanceMode = 'accounts-payable' | 'cash-flow' | 'cheques';
type FinanceKind = 'inflow' | 'outflow' | 'decision';

interface FinanceRow {
  id: string;
  kind: FinanceKind;
  description: string;
  reference: string;
  amount: number;
  status: string;
}

const props = defineProps<{
  mode: FinanceMode;
}>();

const loading = ref(false);
const error = ref('');
const query = ref('');
const kindFilter = ref('');
const expenses = ref<ExpenseCatalogItem[]>([]);
const billings = ref<BillingRecordSummary[]>([]);
const quotes = ref<QuoteSummary[]>([]);

const configs = {
  'accounts-payable': {
    title: 'Contas a Pagar',
    breadcrumb: 'Contas a Pagar',
    subtitle: 'Visão operacional de obrigações baseada no catálogo de custos e despesas.',
    alertVariant: 'info',
    alertTitle: 'Integração mínima ativa.',
    alertText: 'As obrigações usam o catálogo financeiro persistido e centros de custo como fonte operacional.',
    searchLabel: 'Buscar obrigação',
    searchPlaceholder: 'Fornecedor, categoria ou centro de custo',
    emptyTitle: 'Nenhuma conta a pagar encontrada'
  },
  'cash-flow': {
    title: 'Fluxo de Caixa',
    breadcrumb: 'Fluxo de Caixa',
    subtitle: 'Entradas, saídas e projeções combinando recebíveis, despesas e orçamentos aprovados.',
    alertVariant: 'info',
    alertTitle: 'Fluxo projetado.',
    alertText: 'Entradas vêm de faturamento/orçamentos e saídas vêm do catálogo financeiro persistido.',
    searchLabel: 'Buscar fluxo',
    searchPlaceholder: 'Recebível, despesa, orçamento ou status',
    emptyTitle: 'Nenhuma linha de fluxo encontrada'
  },
  cheques: {
    title: 'Cheques',
    breadcrumb: 'Cheques',
    subtitle: 'Decisão formal de escopo para controle legado de cheques no ERP.',
    alertVariant: 'warning',
    alertTitle: 'Decisão formal de escopo.',
    alertText: 'Cheques permanecem como meio de pagamento legado controlado por faturamento/caixa; liquidação digital dedicada não será criada nesta onda.',
    searchLabel: 'Buscar decisão ou referência',
    searchPlaceholder: 'Cheque, faturamento, orçamento ou política',
    emptyTitle: 'Nenhuma linha de controle de cheque'
  }
} satisfies Record<FinanceMode, {
  title: string;
  breadcrumb: string;
  subtitle: string;
  alertVariant: 'info' | 'warning';
  alertTitle: string;
  alertText: string;
  searchLabel: string;
  searchPlaceholder: string;
  emptyTitle: string;
}>;

const config = computed(() => configs[props.mode]);
const columns: DataTableColumn[] = [
  { key: 'kind', label: 'Natureza' },
  { key: 'description', label: 'Descrição' },
  { key: 'reference', label: 'Referência' },
  { key: 'amount', label: 'Valor' },
  { key: 'status', label: 'Status' }
];
const rows = computed<FinanceRow[]>(() => {
  if (props.mode === 'accounts-payable') {
    return expenses.value.map((expense) => ({
      id: expense.id,
      kind: 'outflow',
      description: expense.name,
      reference: `${expense.category} · ${expense.costCenterName}`,
      amount: 0,
      status: expense.kind
    }));
  }

  if (props.mode === 'cheques') {
    return [
      {
        id: 'cheque-policy',
        kind: 'decision',
        description: 'Decisão formal de escopo',
        reference: 'Cheques como meio legado via faturamento/caixa',
        amount: 0,
        status: 'Sem subledger dedicado nesta onda'
      },
      ...billings.value.map((billing) => ({
        id: `cheque-${billing.id}`,
        kind: 'inflow' as const,
        description: `Recebível ${billing.id}`,
        reference: billing.encounterId,
        amount: billing.subtotalAmount,
        status: billing.status
      }))
    ];
  }

  return [
    ...billings.value.map((billing) => ({
      id: `billing-${billing.id}`,
      kind: 'inflow' as const,
      description: `Recebível ${billing.id}`,
      reference: billing.encounterId,
      amount: billing.subtotalAmount,
      status: billing.status
    })),
    ...quotes.value
      .filter((quote) => quote.status === 'approved')
      .map((quote) => ({
        id: `quote-${quote.id}`,
        kind: 'inflow' as const,
        description: `Orçamento aprovado ${quote.number}`,
        reference: quote.ownerId ?? 'sem tutor',
        amount: quote.total,
        status: quote.status
      })),
    ...expenses.value.map((expense) => ({
      id: `expense-${expense.id}`,
      kind: 'outflow' as const,
      description: expense.name,
      reference: expense.costCenterName,
      amount: 0,
      status: expense.category
    }))
  ];
});
const filteredRows = computed(() => {
  const term = query.value.trim().toLowerCase();
  return rows.value
    .filter((row) => !kindFilter.value || row.kind === kindFilter.value)
    .filter((row) => {
      if (!term) return true;
      return [row.description, row.reference, row.status].some((value) =>
        value.toLowerCase().includes(term)
      );
    });
});
const totalInflows = computed(() =>
  rows.value.filter((row) => row.kind === 'inflow').reduce((total, row) => total + row.amount, 0)
);
const totalOutflows = computed(() =>
  rows.value.filter((row) => row.kind === 'outflow').reduce((total, row) => total + row.amount, 0)
);
const netFlow = computed(() => totalInflows.value - totalOutflows.value);

function kindVariant(kind: FinanceKind): 'success' | 'warning' | 'info' {
  if (kind === 'inflow') return 'success';
  if (kind === 'outflow') return 'warning';
  return 'info';
}

function kindLabel(kind: FinanceKind): string {
  if (kind === 'inflow') return 'Entrada';
  if (kind === 'outflow') return 'Saída';
  return 'Decisão';
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [expenseResponse, nextBillings, nextQuotes] = await Promise.all([
      expensesCatalogService.list({ page: 1, pageSize: 50 }),
      billingService.list(),
      quoteService.list()
    ]);
    expenses.value = expenseResponse.items;
    billings.value = nextBillings;
    quotes.value = nextQuotes;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar operação financeira';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.finance-operation-page {
  display: grid;
  gap: 16px;
}

.finance-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.finance-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(180px, 260px);
  gap: 12px;
  align-items: end;
}

@media (max-width: 760px) {
  .finance-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>

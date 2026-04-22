<template>
  <div class="administrative-reports-page">
    <AppPageHeader
      title="Hubs Administrativos"
      :breadcrumbs="['Relatórios', 'Hubs Administrativos']"
      subtitle="Leitura executiva consolidada de financeiro, comercial, caixa e fiscal"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="filters">
      <DsInput v-model="filters.dateFrom" type="date" label="De" />
      <DsInput v-model="filters.dateTo" type="date" label="Até" />
      <div class="filters__actions">
        <DsButton variant="primary" :loading="loading" @click="reload">Aplicar</DsButton>
        <DsButton variant="ghost" @click="resetFilters">Limpar</DsButton>
      </div>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hero-kpis">
      <DsStatCard
        label="Recebíveis em aberto"
        :value="formatCurrency(report?.executive.outstandingReceivables ?? 0)"
        icon="💰"
      />
      <DsStatCard
        label="Pipeline comercial"
        :value="formatCurrency(report?.executive.quotePipelineAmount ?? 0)"
        icon="🧾"
      />
      <DsStatCard
        label="Receita comercial"
        :value="formatCurrency(report?.executive.commercialRevenue ?? 0)"
        icon="📈"
      />
      <DsStatCard
        label="PIX exigindo atenção"
        :value="String(report?.executive.pixAttentionCount ?? 0)"
        icon="💸"
      />
      <DsStatCard
        label="Saldo do caixa aberto"
        :value="formatCurrency(report?.executive.openCashBalance ?? 0)"
        icon="🏦"
      />
      <DsStatCard
        label="Cobertura fiscal"
        :value="`${report?.executive.fiscalCoverageScore ?? 0}/100`"
        icon="📋"
      />
    </section>

    <section v-if="report?.highlights.length" class="highlights">
      <DsAlert
        v-for="highlight in report.highlights"
        :key="`${highlight.domain}-${highlight.title}`"
        :variant="highlight.severity"
      >
        <strong>{{ domainLabel(highlight.domain) }}:</strong> {{ highlight.title }} — {{ highlight.message }}
      </DsAlert>
    </section>

    <section class="quick-actions">
      <DsCard title="Atalhos operacionais" variant="compact">
        <div class="quick-actions__grid">
          <DsButton variant="primary" tag="a" to="/billing" icon="💰">Faturamento</DsButton>
          <DsButton variant="secondary" tag="a" to="/pix" icon="💸">PIX</DsButton>
          <DsButton variant="secondary" tag="a" to="/counter-sales" icon="🛒">Comandas</DsButton>
          <DsButton variant="secondary" tag="a" to="/quotes" icon="🧾">Orçamentos</DsButton>
          <DsButton variant="secondary" tag="a" to="/cash" icon="🏦">Caixa</DsButton>
          <DsButton variant="secondary" tag="a" to="/fiscal" icon="📋">Fiscal</DsButton>
        </div>
      </DsCard>
    </section>

    <div class="domains-grid">
      <DsCard title="Financeiro">
        <div class="summary-grid">
          <div v-for="card in financialCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>

        <DataTable
          :columns="receivablesColumns"
          :rows="receivablesRows"
          :loading="loading"
          empty-icon="💰"
          empty-title="Sem recebíveis críticos"
          empty-description="Os maiores recebíveis em aberto aparecem aqui para priorização financeira."
          variant="hoverable"
        >
          <template #cell-dueAt="{ row }">
            {{ formatDate(receivableRow(row).dueAt) }}
          </template>
          <template #cell-amountOutstanding="{ row }">
            {{ formatCurrency(receivableRow(row).amountOutstanding) }}
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Comercial">
        <div class="summary-grid">
          <div v-for="card in commercialCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>

        <DataTable
          :columns="quotesColumns"
          :rows="quotesRows"
          :loading="loading"
          empty-icon="🧾"
          empty-title="Sem orçamento recente"
          empty-description="Os orçamentos mais recentes aparecem aqui para leitura gerencial."
          variant="hoverable"
        >
          <template #cell-total="{ row }">
            {{ formatCurrency(quoteRow(row).total) }}
          </template>
          <template #cell-createdAt="{ row }">
            {{ formatDate(quoteRow(row).createdAt) }}
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Caixa">
        <div class="summary-grid">
          <div v-for="card in cashCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>

        <DataTable
          :columns="cashColumns"
          :rows="cashRows"
          :loading="loading"
          empty-icon="🏦"
          empty-title="Sem histórico recente de caixa"
          empty-description="Os últimos caixas ficam visíveis aqui para conferência operacional."
          variant="hoverable"
        >
          <template #cell-openingAmount="{ row }">
            {{ formatCurrency(cashRegisterRow(row).openingAmount) }}
          </template>
          <template #cell-runningBalance="{ row }">
            {{ formatCurrency(cashRegisterRow(row).runningBalance) }}
          </template>
          <template #cell-openedAt="{ row }">
            {{ formatDate(cashRegisterRow(row).openedAt) }}
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Fiscal">
        <div class="summary-grid">
          <div v-for="card in fiscalCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>

        <div class="fiscal-alerts">
          <DsAlert
            v-for="alert in report?.domains.fiscal.alerts ?? []"
            :key="alert.title"
            :variant="alert.variant"
          >
            <strong>{{ alert.title }}</strong> — {{ alert.message }}
          </DsAlert>
        </div>

        <DataTable
          :columns="paymentMethodsColumns"
          :rows="paymentMethodsRows"
          :loading="loading"
          empty-icon="📊"
          empty-title="Sem mix de pagamentos"
          empty-description="O hub comercial ainda não consolidou pagamentos para o período filtrado."
          variant="hoverable"
        >
          <template #cell-total="{ row }">
            {{ formatCurrency(paymentMethodRow(row).total) }}
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
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import {
  administrativeReportsService,
  type AdministrativeReportsResponse
} from '@/services/administrativeReports';

const loading = ref(true);
const error = ref('');
const report = ref<AdministrativeReportsResponse | null>(null);
const filters = ref({
  dateFrom: '',
  dateTo: ''
});

const receivablesColumns: DataTableColumn[] = [
  { key: 'patientName', label: 'Paciente' },
  { key: 'ownerName', label: 'Tutor' },
  { key: 'installmentLabel', label: 'Parcela' },
  { key: 'dueAt', label: 'Vencimento' },
  { key: 'amountOutstanding', label: 'Saldo' }
];

const quotesColumns: DataTableColumn[] = [
  { key: 'number', label: 'Número' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total' },
  { key: 'createdAt', label: 'Criado em' }
];

const cashColumns: DataTableColumn[] = [
  { key: 'status', label: 'Status' },
  { key: 'openingAmount', label: 'Abertura' },
  { key: 'runningBalance', label: 'Saldo corrente' },
  { key: 'openedAt', label: 'Aberto em' }
];

const paymentMethodsColumns: DataTableColumn[] = [
  { key: 'method', label: 'Método' },
  { key: 'total', label: 'Total' }
];

const receivablesRows = computed(
  () => (report.value?.domains.financial.receivables.topOpenReceivables ?? []) as unknown as DataTableRow[]
);
const quotesRows = computed(
  () => (report.value?.domains.commercial.quotes.recent ?? []) as unknown as DataTableRow[]
);
const cashRows = computed(
  () => (report.value?.domains.cash.recentRegisters ?? []) as unknown as DataTableRow[]
);
const paymentMethodsRows = computed(
  () =>
    (report.value?.domains.commercial.counterSales.byPaymentMethod ?? []) as unknown as DataTableRow[]
);

const financialCards = computed(() => {
  const financial = report.value?.domains.financial;
  if (!financial) return [];
  return [
    {
      label: 'Faturamentos',
      value: String(financial.billing.totalRecords),
      hint: `${financial.billing.openCount} aberto(s) e ${financial.billing.settledCount} quitado(s)`
    },
    {
      label: 'Recebíveis abertos',
      value: String(financial.receivables.openCount),
      hint: `${financial.receivables.overdueCount} em atraso`
    },
    {
      label: 'Saldo em aberto',
      value: formatCurrency(financial.receivables.totalOutstanding),
      hint: 'Volume atual de cobrança'
    },
    {
      label: 'PIX reconciliado',
      value: `${financial.pix.reconciledCount}/${financial.pix.completedCount}`,
      hint: `${financial.pix.attentionRequiredCount} exigem ação`
    }
  ];
});

const commercialCards = computed(() => {
  const commercial = report.value?.domains.commercial;
  if (!commercial) return [];
  return [
    {
      label: 'Orçamentos emitidos',
      value: String(commercial.quotes.issuedCount),
      hint: `${commercial.quotes.approvedCount} aprovado(s)`
    },
    {
      label: 'Pipeline',
      value: formatCurrency(commercial.quotes.pipelineAmount),
      hint: 'Valor ainda em negociação'
    },
    {
      label: 'Receita bruta',
      value: formatCurrency(commercial.counterSales.grossRevenue),
      hint: `${commercial.counterSales.closedCount} venda(s) fechada(s)`
    },
    {
      label: 'Ticket médio',
      value: formatCurrency(commercial.counterSales.avgTicket),
      hint: 'Média por venda fechada'
    }
  ];
});

const cashCards = computed(() => {
  const cash = report.value?.domains.cash;
  if (!cash) return [];
  return [
    {
      label: 'Caixa aberto',
      value: cash.hasOpenRegister ? 'Sim' : 'Não',
      hint: cash.openRegister ? `Aberto em ${formatDate(cash.openRegister.openedAt)}` : 'Sem caixa ativo'
    },
    {
      label: 'Saldo corrente',
      value: formatCurrency(cash.openRegister?.runningBalance ?? 0),
      hint: 'Saldo do caixa ativo'
    },
    {
      label: 'Entradas recentes',
      value: formatCurrency(cash.inflowAmount),
      hint: 'Somatório das últimas movimentações'
    },
    {
      label: 'Histórico',
      value: String(cash.registerCount),
      hint: 'Caixas mais recentes carregados no hub'
    }
  ];
});

const fiscalCards = computed(() => {
  const fiscal = report.value?.domains.fiscal;
  if (!fiscal) return [];
  return [
    {
      label: 'Tributos ativos',
      value: String(fiscal.activeTaxes),
      hint: 'Regra ativa no escopo atual'
    },
    {
      label: 'CFOP publicados',
      value: String(fiscal.cfopCount),
      hint: 'Catálogo tributário disponível'
    },
    {
      label: 'Layouts NFS-e',
      value: String(fiscal.nfseLayouts),
      hint: 'Municípios configurados'
    },
    {
      label: 'Escopo',
      value: fiscal.backendScope,
      hint: fiscal.readOnly ? 'Backend em modo leitura' : 'Backoffice com escrita disponível'
    }
  ];
});

async function reload() {
  loading.value = true;
  error.value = '';
  try {
    report.value = await administrativeReportsService.getHubs({
      dateFrom: filters.value.dateFrom || undefined,
      dateTo: filters.value.dateTo || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar hubs administrativos';
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.value = { dateFrom: '', dateTo: '' };
  void reload();
}

function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value ?? 0);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(parsed);
}

function domainLabel(domain: 'financial' | 'commercial' | 'cash' | 'fiscal'): string {
  return {
    financial: 'Financeiro',
    commercial: 'Comercial',
    cash: 'Caixa',
    fiscal: 'Fiscal'
  }[domain];
}

function receivableRow(row: unknown) {
  return row as AdministrativeReportsResponse['domains']['financial']['receivables']['topOpenReceivables'][number];
}

function quoteRow(row: unknown) {
  return row as AdministrativeReportsResponse['domains']['commercial']['quotes']['recent'][number];
}

function cashRegisterRow(row: unknown) {
  return row as AdministrativeReportsResponse['domains']['cash']['recentRegisters'][number];
}

function paymentMethodRow(row: unknown) {
  return row as AdministrativeReportsResponse['domains']['commercial']['counterSales']['byPaymentMethod'][number];
}

onMounted(() => {
  void reload();
});
</script>

<style scoped>
.administrative-reports-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.filters__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hero-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.highlights,
.quick-actions {
  display: grid;
  gap: 12px;
}

.quick-actions__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.domains-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
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
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.summary-card__value {
  display: block;
  margin-top: 8px;
  font-size: 20px;
  font-weight: 800;
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.fiscal-alerts {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}
</style>

<template>
  <section class="fiscal-tax-operation-page">
    <AppPageHeader
      :title="config.title"
      :breadcrumbs="['Fiscal', 'Tributos', config.breadcrumb]"
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

    <section class="tax-kpis">
      <DsStatCard :label="`${summary.activeTaxes} tributo(s) ativos`" value="" icon="📋" />
      <DsStatCard :label="`${summary.ncmEntries} NCM(s)`" value="" icon="🏷️" />
      <DsStatCard :label="`${summary.cfopCount} CFOP(s)`" value="" icon="🔢" />
      <DsStatCard :label="formatCurrency(preview.mercadoria.totalTaxValue)" value="" icon="🧮" />
    </section>

    <div class="tax-layout">
      <DsCard :title="config.previewTitle">
        <dl class="tax-preview">
          <div>
            <dt>Base mercadoria</dt>
            <dd>{{ formatCurrency(preview.mercadoria.baseValue) }}</dd>
          </div>
          <div>
            <dt>Tributos mercadoria</dt>
            <dd>{{ formatCurrency(preview.mercadoria.totalTaxValue) }}</dd>
          </div>
          <div>
            <dt>Total mercadoria</dt>
            <dd>{{ formatCurrency(preview.mercadoria.totalWithTax) }}</dd>
          </div>
          <div>
            <dt>Total serviço</dt>
            <dd>{{ formatCurrency(preview.servico.totalWithTax) }}</dd>
          </div>
        </dl>
      </DsCard>

      <DsCard title="Escopo operacional">
        <p class="scope-text">{{ summary.backendScope || config.scopeFallback }}</p>
        <ul class="scope-list">
          <li v-for="scope in pendingScopes" :key="scope">{{ scope }}</li>
        </ul>
      </DsCard>
    </div>

    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :empty-title="config.emptyTitle"
      empty-description="Revise os filtros fiscais publicados pela API."
      empty-icon="📋"
      variant="hoverable"
    >
      <template #cell-rate="{ row }">
        {{ (row as TaxRow).rate }}
      </template>
      <template #cell-reference="{ row }">
        <strong>{{ (row as TaxRow).reference }}</strong>
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
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import {
  fiscalService,
  type FiscalCfopRow,
  type FiscalDashboardSummary,
  type FiscalNcmEntry,
  type FiscalTaxPreview
} from '@/services/fiscal';

type TaxMode = 'ipi' | 'ibs-cbs';

interface TaxRow {
  id: string;
  reference: string;
  description: string;
  rate: string;
  source: string;
}

const props = defineProps<{
  mode: TaxMode;
}>();

const loading = ref(false);
const error = ref('');
const summary = ref<FiscalDashboardSummary>({
  activeTaxes: 0,
  cfopCount: 0,
  nfseLayouts: 0,
  icmsRules: 0,
  pisCofinsRules: 0,
  ncmEntries: 0,
  readOnly: true,
  backendScope: '',
  pendingScopes: [],
  alerts: []
});
const preview = ref<FiscalTaxPreview>({
  mercadoria: { baseValue: 0, totalTaxValue: 0, totalWithTax: 0 },
  servico: { baseValue: 0, totalTaxValue: 0, totalWithTax: 0 }
});
const ncmEntries = ref<FiscalNcmEntry[]>([]);
const cfopRows = ref<FiscalCfopRow[]>([]);

const configs = {
  ipi: {
    title: 'IPI',
    breadcrumb: 'IPI',
    subtitle: 'Consulta operacional de IPI por NCM e CFOP relevante para entrada e saída de mercadorias.',
    alertVariant: 'info',
    alertTitle: 'IPI ativo no motor fiscal.',
    alertText: 'A tela usa a base NCM/IBPT e CFOP publicada pela API para apoiar conferência fiscal.',
    previewTitle: 'Simulação de mercadoria',
    scopeFallback: 'Consulta fiscal e conferência operacional de mercadorias.',
    emptyTitle: 'Nenhum NCM com IPI encontrado'
  },
  'ibs-cbs': {
    title: 'IBS/CBS',
    breadcrumb: 'IBS/CBS',
    subtitle: 'Painel de preparação para reforma tributária conectado ao preview fiscal vigente.',
    alertVariant: 'warning',
    alertTitle: 'Reforma tributária em implantação.',
    alertText: 'Enquanto as tabelas finais não são publicadas, o ERP mantém decisão explícita e rastreia base atual ICMS/PIS/COFINS/NCM.',
    previewTitle: 'Base comparativa atual',
    scopeFallback: 'Preparação regulatória IBS/CBS com contratos fiscais existentes.',
    emptyTitle: 'Nenhum CFOP base encontrado'
  }
} satisfies Record<TaxMode, {
  title: string;
  breadcrumb: string;
  subtitle: string;
  alertVariant: 'info' | 'warning';
  alertTitle: string;
  alertText: string;
  previewTitle: string;
  scopeFallback: string;
  emptyTitle: string;
}>;

const config = computed(() => configs[props.mode]);
const columns: DataTableColumn[] = [
  { key: 'reference', label: 'Referência' },
  { key: 'description', label: 'Descrição' },
  { key: 'rate', label: 'Alíquota / base' },
  { key: 'source', label: 'Origem' }
];
const pendingScopes = computed(() =>
  summary.value.pendingScopes.length > 0 ? summary.value.pendingScopes : ['Sem pendência fiscal adicional publicada']
);
const rows = computed<TaxRow[]>(() => {
  if (props.mode === 'ipi') {
    return ncmEntries.value.map((entry) => ({
      id: entry.id,
      reference: entry.ncm,
      description: entry.category,
      rate: `${entry.ipiRate.toFixed(2)}%`,
      source: entry.source
    }));
  }

  return cfopRows.value.map((row) => ({
    id: row.code,
    reference: row.code,
    description: row.description,
    rate: row.pisCofinsRelevant ? 'Base PIS/COFINS atual' : 'Mapeamento fiscal',
    source: row.documentTypesLabel
  }));
});

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [nextSummary, nextPreview, nextNcmEntries, nextCfopRows] = await Promise.all([
      fiscalService.getDashboardSummary(),
      fiscalService.getTaxPreview(),
      fiscalService.listNcmEntries(),
      fiscalService.listCfop({ documentType: 'nfe' })
    ]);
    summary.value = nextSummary;
    preview.value = nextPreview;
    ncmEntries.value = nextNcmEntries;
    cfopRows.value = nextCfopRows;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar tributo fiscal';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.fiscal-tax-operation-page {
  display: grid;
  gap: 16px;
}

.tax-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.tax-layout {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(260px, 1fr);
  gap: 16px;
}

.tax-preview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.tax-preview div {
  padding: 12px;
  border-radius: 14px;
  background: var(--color-bg-subtle, #f8fafc);
}

.tax-preview dt,
.scope-list {
  color: var(--color-text-muted, #64748b);
}

.tax-preview dd {
  margin: 4px 0 0;
  font-weight: 800;
}

.scope-text {
  margin-top: 0;
}

.scope-list {
  margin-bottom: 0;
  padding-left: 18px;
}

@media (max-width: 860px) {
  .tax-layout,
  .tax-preview {
    grid-template-columns: 1fr;
  }
}
</style>

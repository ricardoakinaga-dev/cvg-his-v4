<template>
  <section class="invoice-reports-page">
    <AppPageHeader
      title="Relatório de NF"
      :breadcrumbs="['Relatórios', 'Fiscal', 'NF']"
      subtitle="Consolidação operacional de CFOP, layouts NFS-e e lotes de estoque para auditoria fiscal."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="report-kpis">
      <DsStatCard :label="`${summary.cfopCount} CFOP(s)`" value="" icon="🔢" />
      <DsStatCard :label="`${layouts.length} layout(s) NFS-e`" value="" icon="📄" />
      <DsStatCard :label="`${lots.length} lote(s) rastreado(s)`" value="" icon="🏷️" />
      <DsStatCard :label="`${rows.length} linha(s) de auditoria`" value="" icon="🧾" />
    </section>

    <div class="report-toolbar">
      <DsInput v-model="query" label="Buscar no relatório" placeholder="CFOP, cidade, SKU, lote ou fornecedor" />
      <DsInput v-model="kindFilter" type="select" label="Tipo">
        <option value="">Todos</option>
        <option value="cfop">CFOP</option>
        <option value="nfse">NFS-e</option>
        <option value="stock">Estoque</option>
      </DsInput>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-title="Nenhuma linha fiscal encontrada"
      empty-description="Revise os filtros ou carregue dados fiscais e lotes de estoque."
      empty-icon="🧾"
      variant="hoverable"
    >
      <template #cell-kind="{ row }">
        <DsBadge :variant="kindVariant((row as InvoiceReportRow).kind)" size="sm">
          {{ kindLabel((row as InvoiceReportRow).kind) }}
        </DsBadge>
      </template>
      <template #cell-reference="{ row }">
        <strong>{{ (row as InvoiceReportRow).reference }}</strong>
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
import {
  fiscalService,
  type FiscalCfopRow,
  type FiscalDashboardSummary,
  type FiscalNfseLayout
} from '@/services/fiscal';
import { inventoryService } from '@/services/inventory';
import type { InventoryLotSummary } from '@/types/inventory';

type InvoiceReportKind = 'cfop' | 'nfse' | 'stock';

interface InvoiceReportRow {
  id: string;
  kind: InvoiceReportKind;
  reference: string;
  description: string;
  documentType: string;
  status: string;
}

const loading = ref(false);
const error = ref('');
const query = ref('');
const kindFilter = ref('');
const cfops = ref<FiscalCfopRow[]>([]);
const layouts = ref<FiscalNfseLayout[]>([]);
const lots = ref<InventoryLotSummary[]>([]);
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

const columns: DataTableColumn[] = [
  { key: 'kind', label: 'Tipo' },
  { key: 'reference', label: 'Referência' },
  { key: 'description', label: 'Descrição' },
  { key: 'documentType', label: 'Documento' },
  { key: 'status', label: 'Status' }
];
const rows = computed<InvoiceReportRow[]>(() => [
  ...cfops.value.map((cfop) => ({
    id: `cfop-${cfop.code}`,
    kind: 'cfop' as const,
    reference: cfop.code,
    description: cfop.description,
    documentType: cfop.documentTypesLabel,
    status: cfop.section === 'entrada' ? 'Entrada' : 'Saída'
  })),
  ...layouts.value.map((layout) => ({
    id: `nfse-${layout.id}`,
    kind: 'nfse' as const,
    reference: `${layout.city}/${layout.state}`,
    description: `${layout.provider} ${layout.version}`,
    documentType: 'NFS-e',
    status: layout.active ? 'Ativo' : 'Inativo'
  })),
  ...lots.value.map((lot) => ({
    id: `stock-${lot.id}`,
    kind: 'stock' as const,
    reference: lot.lotNumber,
    description: `${lot.itemName} · ${lot.sku}`,
    documentType: 'NF entrada',
    status: lot.supplier || lot.status
  }))
]);
const filteredRows = computed(() => {
  const term = query.value.trim().toLowerCase();
  return rows.value
    .filter((row) => !kindFilter.value || row.kind === kindFilter.value)
    .filter((row) => {
      if (!term) return true;
      return [row.reference, row.description, row.documentType, row.status].some((value) =>
        value.toLowerCase().includes(term)
      );
    });
});

function kindVariant(kind: InvoiceReportKind): 'default' | 'info' | 'warning' {
  if (kind === 'cfop') return 'info';
  if (kind === 'nfse') return 'default';
  return 'warning';
}

function kindLabel(kind: InvoiceReportKind): string {
  if (kind === 'cfop') return 'CFOP';
  if (kind === 'nfse') return 'NFS-e';
  return 'Estoque';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [nextSummary, nextCfops, nextLayouts, nextLots] = await Promise.all([
      fiscalService.getDashboardSummary(),
      fiscalService.listCfop(),
      fiscalService.listNfseLayouts(),
      inventoryService.listLots()
    ]);
    summary.value = nextSummary;
    cfops.value = nextCfops;
    layouts.value = nextLayouts;
    lots.value = nextLots;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar relatório de NF';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.invoice-reports-page {
  display: grid;
  gap: 16px;
}

.report-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.report-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(180px, 260px);
  gap: 12px;
  align-items: end;
}

@media (max-width: 760px) {
  .report-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>

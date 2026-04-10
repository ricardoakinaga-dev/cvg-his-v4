<template>
  <div class="counter-sales-page">
    <AppPageHeader title="Vendas Assistidas" subtitle="Conversão real de orçamento em venda assistida">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadQuotes">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="counter-sales-grid">
      <DsCard title="Conversão">
        <p class="muted">
          Use um orçamento pronto para gerar a venda assistida real. O backend devolve o
          identificador da venda criada.
        </p>
        <DataTable
          :columns="columns"
          :rows="quotes"
          :loading="loading"
          empty-icon="🛒"
          empty-title="Nenhum orçamento disponível"
          empty-description="Crie um orçamento em Orçamentos e volte aqui para converter em venda."
          variant="hoverable"
        >
          <template #cell-status="{ row }">
            <StatusBadge :label="statusLabel((row as QuoteSummary).status)" :variant="statusVariant((row as QuoteSummary).status)" />
          </template>
          <template #cell-total="{ row }">{{ formatCurrency((row as QuoteSummary).total) }}</template>
          <template #cell-actions="{ row }">
            <DsButton size="sm" variant="primary" @click="convert((row as QuoteSummary).id)">Converter</DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Última venda criada">
        <div v-if="lastConversion" class="conversion-summary">
          <div><strong>Counter sale ID:</strong> <code>{{ lastConversion.counterSaleId }}</code></div>
          <div><strong>Quote ID:</strong> <code>{{ lastConversion.quoteId }}</code></div>
        </div>
        <div v-else class="muted">Nenhuma venda assistida criada nesta sessão.</div>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { useListData } from '@/composables/useListData';
import { quoteService, type QuoteConversionResult, type QuoteSummary } from '@/services/quotes';
import type { DataTableColumn } from '@/components/DataTable.vue';

const columns: DataTableColumn[] = [
  { key: 'number', label: 'Número' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total' },
  { key: 'convertedToSaleId', label: 'Venda' },
  { key: 'actions', label: 'Ações' }
];

const successMessage = ref('');
const lastConversion = ref<QuoteConversionResult | null>(null);

const { items: quotes, loading, error, load: loadQuotes } = useListData<QuoteSummary>({
  fetchFn: (search) => quoteService.list(search),
  entityLabel: 'orçamentos'
});

async function convert(quoteId: string) {
  try {
    lastConversion.value = await quoteService.convertToSale(quoteId);
    successMessage.value = `Orçamento convertido em venda ${lastConversion.value.counterSaleId}.`;
    await loadQuotes();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao converter em venda';
  }
}

function statusLabel(status: QuoteSummary['status']): string {
  return { draft: 'Rascunho', approved: 'Aprovado', rejected: 'Rejeitado', expired: 'Expirado', cancelled: 'Cancelado' }[status];
}

function statusVariant(status: QuoteSummary['status']): 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'approved') return 'success';
  if (status === 'draft') return 'info';
  if (status === 'expired') return 'warning';
  return 'danger';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

onMounted(() => {
  void loadQuotes();
});
</script>

<style scoped>
.counter-sales-grid {
  display: grid;
  gap: 16px;
}

.conversion-summary {
  display: grid;
  gap: 8px;
}

.muted {
  color: var(--color-text-muted, #64748b);
}

code {
  word-break: break-all;
}
</style>

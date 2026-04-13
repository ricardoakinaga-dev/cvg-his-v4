<template>
  <div class="counter-sales-page">
    <AppPageHeader title="🛒 Vendas Assistidas" subtitle="Conversão comercial com impacto em caixa e faturamento — ponte entre Atendimento e Financeiro.">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadQuotes">🔄 Atualizar</DsButton>
        <DsButton tag="a" to="/quotes" variant="secondary">🧾 Ver Orçamentos</DsButton>
        <DsButton tag="a" to="/queue" variant="ghost">🏥 Ver Fila</DsButton>
      </template>
    </AppPageHeader>

    <!-- Hub: KPI StatCards -->
    <section class="hub-kpis">
      <DsStatCard :label="total + ' orçamento(s)'" value="" icon="🧾" />
      <DsStatCard :label="approved + ' aprovado(s)'" value="" icon="✅" />
      <DsStatCard :label="draft + ' rascunho(s)'" value="" icon="📝" />
      <DsStatCard :label="converted + ' convertido(s)'" value="" icon="🛒" />
    </section>

    <!-- Hub: Quick Actions -->
    <section class="hub-actions">
      <DsCard title="Ações rápidas" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" tag="a" to="/quotes" icon="🧾">
            Criar Orçamento
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/cash" icon="🏦">
            Ver Caixa
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/billing" icon="💰">
            Faturamento
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/pix" icon="💸">
            PIX
          </DsButton>
          <DsButton variant="ghost" :loading="loading" @click="loadQuotes" icon="🔄">
            Atualizar
          </DsButton>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="counter-sales-layout">
      <div class="counter-sales-grid">
        <DsCard title="Conversão">
          <p class="muted">
            Use um orçamento aprovado para gerar a venda assistida real. O backend devolve o
            identificador da venda criada.
          </p>
          <DataTable
            :columns="columns"
            :rows="quoteRows"
            :loading="loading"
            empty-icon="🛒"
            empty-title="Nenhum orçamento disponível"
            empty-description="Crie um orçamento em Orçamentos e volte aqui para converter em venda."
            variant="hoverable"
          >
            <template #cell-status="{ row }">
              <StatusBadge
                :label="statusLabel(quoteRow(row).status)"
                :variant="statusVariant(quoteRow(row).status)"
              />
            </template>
            <template #cell-total="{ row }">{{ formatCurrency(quoteRow(row).total) }}</template>
            <template #cell-convertedToSaleId="{ row }">
              <code v-if="quoteRow(row).convertedToSaleId">{{ quoteRow(row).convertedToSaleId }}</code>
              <span v-else class="muted">—</span>
            </template>
            <template #cell-actions="{ row }">
              <DsButton size="sm" variant="primary" :disabled="quoteRow(row).status !== 'approved'" @click="convert(quoteRow(row).id)">
                Converter
              </DsButton>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { computed } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { useListData } from '@/composables/useListData';
import { quoteService, type QuoteConversionResult, type QuoteSummary } from '@/services/quotes';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';

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

const quoteRows = computed(() => quotes.value as unknown as DataTableRow[]);
const total = computed(() => quotes.value.length);
const approved = computed(() => quotes.value.filter((q) => q.status === 'approved').length);
const draft = computed(() => quotes.value.filter((q) => q.status === 'draft').length);
const converted = computed(() => quotes.value.filter((q) => q.convertedToSaleId).length);

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

function quoteRow(row: unknown): QuoteSummary {
  return row as QuoteSummary;
}
</script>

<style scoped>
.counter-sales-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.hub-actions {
  margin-bottom: 0;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.counter-sales-grid {
  display: grid;
  gap: 16px;
}

.counter-sales-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.conversion-summary {
  display: grid;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.summary-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.muted {
  color: var(--color-text-muted, #64748b);
}

code {
  word-break: break-all;
}
</style>

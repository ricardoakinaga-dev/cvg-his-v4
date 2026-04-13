<template>
  <div class="cash-page">
    <AppPageHeader title="Caixa / Gaveta" subtitle="Abertura, fechamento e liquidação operacional do caixa financeiro">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadQuotes">Atualizar recebíveis</DsButton>
      </template>
    </AppPageHeader>

    <!-- Hub: KPI StatCards -->
    <section class="hub-kpis">
      <DsStatCard :label="quotes.length + ' orçamento(s)'" value="" icon="🧾" />
      <DsStatCard :label="preparedAmountFormatted" value="" icon="💵" />
      <DsStatCard :label="lastIntent?.status || '—'" value="" icon="🏦" />
      <DsStatCard :label="lastIntent ? '1' : '0'" value="" icon="📥" />
    </section>

    <!-- Hub: Quick Actions -->
    <section class="hub-actions">
      <DsCard title="Ações rápidas — Gaveta / Caixa" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" tag="a" to="/quotes" icon="🧾">
            Criar Orçamento
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/counter-sales" icon="🛒">
            Vendas Balcão
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/billing" icon="💰">
            Faturamento
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/pix" icon="💸">
            Intent PIX
          </DsButton>
          <DsButton variant="ghost" :loading="loading" @click="loadQuotes" icon="🔄">
            Atualizar
          </DsButton>
        </div>
      </DsCard>
    </section>

    <section class="cash-story">
      <DsCard title="Leitura rápida da gaveta">
        <div class="story-grid">
          <div v-for="card in storyCards" :key="card.label" class="story-card">
            <span class="story-card__label">{{ card.label }}</span>
            <strong class="story-card__value">{{ card.value }}</strong>
            <span class="story-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="cash-grid">
      <DsCard title="Orçamentos com impacto de caixa">
        <DataTable
          :columns="columns"
          :rows="quoteRows"
          :loading="loading"
          empty-icon="🧾"
          empty-title="Nenhum orçamento disponível"
          empty-description="Use Orçamentos para criar uma base operacional antes de registrar a entrada PIX."
          variant="hoverable"
        >
          <template #cell-total="{ row }">{{ formatCurrency(quoteRow(row).total) }}</template>
          <template #cell-status="{ row }">
            <StatusBadge :label="statusLabel(quoteRow(row).status)" :variant="statusVariant(quoteRow(row).status)" />
          </template>
          <template #cell-actions="{ row }">
            <DsButton size="sm" variant="primary" @click="prepareCharge(quoteRow(row))">Registrar PIX</DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Registrar entrada">
        <form class="cash-form" @submit.prevent="createCashEntry">
          <DsInput id="cash-quote" v-model="chargeForm.quoteLabel" label="Orçamento" disabled />
          <DsInput id="cash-amount" v-model.number="chargeForm.amount" type="number" label="Valor" required />
          <DsInput id="cash-description" v-model="chargeForm.description" label="Descrição" required />
          <DsInput id="cash-billing" v-model="chargeForm.billingRecordId" label="Billing Record ID" placeholder="opcional" />
          <div class="form-actions">
            <DsButton variant="primary" :loading="creating">Gerar PIX de entrada</DsButton>
          </div>
        </form>
      </DsCard>

      <DsCard title="Última movimentação">
        <div v-if="lastIntent" class="intent-summary">
          <div><strong>Orçamento:</strong> {{ chargeForm.quoteLabel }}</div>
          <div><strong>PIX intent:</strong> <code>{{ lastIntent.id }}</code></div>
          <div><strong>Valor:</strong> {{ formatCurrency(lastIntent.amount) }}</div>
          <div><strong>Status:</strong> {{ lastIntent.status }}</div>
          <div><strong>QR:</strong> <code>{{ lastIntent.qrCodeText }}</code></div>
        </div>
        <div v-else class="muted">Nenhuma entrada registrada nesta sessão.</div>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { computed } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { useListData } from '@/composables/useListData';
import { quoteService, type QuoteSummary } from '@/services/quotes';
import { pixService, type PixPaymentIntentResponse } from '@/services/pix';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';

const columns: DataTableColumn[] = [
  { key: 'number', label: 'Número' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total' },
  { key: 'actions', label: 'Ações' }
];

const creating = ref(false);
const error = ref('');
const successMessage = ref('');
const lastIntent = ref<PixPaymentIntentResponse | null>(null);
const chargeForm = ref({
  quoteLabel: 'Selecione um orçamento',
  amount: 0,
  description: '',
  billingRecordId: ''
});

const { items: quotes, loading, load: loadQuotes } = useListData<QuoteSummary>({
  fetchFn: (search) => quoteService.list(search),
  entityLabel: 'orçamentos'
});

const preparedAmountFormatted = computed(() => formatCurrency(chargeForm.value.amount || 0));
const quoteRows = computed(() => quotes.value as unknown as DataTableRow[]);
const approvedQuotesCount = computed(() => quotes.value.filter((quote) => quote.status === 'approved').length);
const convertedQuotesCount = computed(() => quotes.value.filter((quote) => quote.convertedToSaleId).length);
const storyCards = computed(() => [
  { label: 'Aprovados', value: String(approvedQuotesCount.value), hint: 'Orçamentos prontos para liquidação' },
  { label: 'Convertidos', value: String(convertedQuotesCount.value), hint: 'Vendas já concluídas' },
  { label: 'Valor preparado', value: preparedAmountFormatted.value, hint: 'Montante carregado no formulário' },
  { label: 'Último evento', value: lastIntent.value?.status ?? 'Sem registro', hint: 'Estado da última intenção PIX' }
]);

function prepareCharge(quote: QuoteSummary) {
  chargeForm.value = {
    quoteLabel: `${quote.number} - ${quote.status}`,
    amount: quote.total,
    description: `Liquidação do orçamento ${quote.number}`,
    billingRecordId: quote.id
  };
}

async function createCashEntry() {
  creating.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    lastIntent.value = await pixService.createIntent({
      amount: Number(chargeForm.value.amount),
      description: chargeForm.value.description.trim(),
      billingRecordId: chargeForm.value.billingRecordId.trim() || null,
      expirationMinutes: 15
    });
    successMessage.value = 'Entrada de caixa registrada via PIX.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar caixa';
  } finally {
    creating.value = false;
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
.cash-page {
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

.cash-story {
  margin-bottom: 0;
}

.cash-grid {
  display: grid;
  gap: 16px;
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

.cash-form {
  display: grid;
  gap: 12px;
}

.form-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.intent-summary {
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

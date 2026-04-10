<template>
  <div class="cash-page">
    <AppPageHeader title="Caixa" subtitle="Liquidação operacional apoiada por orçamento e PIX real">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadQuotes">Atualizar orçamentos</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="cash-grid">
      <DsCard title="Orçamentos com impacto de caixa">
        <DataTable
          :columns="columns"
          :rows="quotes"
          :loading="loading"
          empty-icon="🧾"
          empty-title="Nenhum orçamento disponível"
          empty-description="Use Orçamentos para criar uma base operacional antes de registrar a entrada PIX."
          variant="hoverable"
        >
          <template #cell-total="{ row }">{{ formatCurrency((row as QuoteSummary).total) }}</template>
          <template #cell-status="{ row }">
            <StatusBadge :label="statusLabel((row as QuoteSummary).status)" :variant="statusVariant((row as QuoteSummary).status)" />
          </template>
          <template #cell-actions="{ row }">
            <DsButton size="sm" variant="primary" @click="prepareCharge((row as QuoteSummary))">Registrar PIX</DsButton>
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
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { useListData } from '@/composables/useListData';
import { quoteService, type QuoteSummary } from '@/services/quotes';
import { pixService, type PixPaymentIntentResponse } from '@/services/pix';
import type { DataTableColumn } from '@/components/DataTable.vue';

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
</script>

<style scoped>
.cash-grid {
  display: grid;
  gap: 16px;
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

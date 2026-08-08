<template>
  <section class="cash-page">
    <AppPageHeader
      title="Gaveta"
      :breadcrumbs="['Financeiro', 'Gaveta', 'Gaveta']"
      subtitle="Caixa operacional com abertura, entradas, saídas, fechamento e extrato por forma de pagamento"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadDashboard">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="cash-kpis" aria-label="Resumo da gaveta">
      <DsStatCard label="Último Fechamento" :value="lastClosingLabel" icon="🧾" />
      <DsStatCard label="Total de Entradas" :value="formatCurrency(dashboard?.totals.totalEntradas ?? 0)" icon="💵" />
      <DsStatCard label="Total de Saídas" :value="formatCurrency(dashboard?.totals.totalSaidas ?? 0)" icon="💸" />
      <DsStatCard label="Total em Gaveta" :value="formatCurrency(dashboard?.totals.totalEmGaveta ?? 0)" icon="🏦" />
    </section>

    <section class="cash-actions" aria-label="Ações da gaveta">
      <DsCard title="Entrada de Gaveta">
        <form class="cash-form" @submit.prevent="submitMovement('supply')">
          <DsInput v-model.number="entryForm.amount" type="number" label="Valor" min="0.01" step="0.01" required />
          <DsInput v-model="entryForm.reference" label="Origem" placeholder="Ex: reforço de caixa" />
          <DsInput v-model="entryForm.notes" label="Observação" placeholder="Ex: entrada em dinheiro" />
          <DsButton variant="primary" :loading="savingAction === 'entry'">Entrada</DsButton>
        </form>
      </DsCard>

      <DsCard title="Saída de Gaveta">
        <form class="cash-form" @submit.prevent="submitMovement('withdrawal')">
          <DsInput v-model.number="withdrawalForm.amount" type="number" label="Valor" min="0.01" step="0.01" required />
          <DsInput v-model="withdrawalForm.reference" label="Destino" placeholder="Ex: sangria" />
          <DsInput v-model="withdrawalForm.notes" label="Observação" placeholder="Ex: retirada autorizada" />
          <DsButton variant="secondary" :loading="savingAction === 'withdrawal'">Saída</DsButton>
        </form>
      </DsCard>

      <DsCard title="Depósito Bancário">
        <form class="cash-form" @submit.prevent="submitMovement('deposit')">
          <DsInput v-model.number="depositForm.amount" type="number" label="Valor" min="0.01" step="0.01" required />
          <DsInput v-model="depositForm.reference" label="Comprovante" placeholder="Ex: depósito 12345" />
          <DsInput v-model="depositForm.notes" label="Observação" placeholder="Ex: depósito do fechamento" />
          <DsButton variant="secondary" :loading="savingAction === 'deposit'">Registrar Depósito</DsButton>
        </form>
      </DsCard>

      <DsCard title="Fechar Gaveta">
        <form v-if="dashboard?.openRegister" class="cash-form" @submit.prevent="closeDrawer">
          <DsInput
            v-model.number="closingForm.closingAmount"
            type="number"
            label="Valor Conferido"
            min="0"
            step="0.01"
            required
          />
          <DsInput v-model="closingForm.notes" label="Observação" placeholder="Conferência de fechamento" />
          <p class="cash-hint">
            Esperado: {{ formatCurrency(dashboard.openRegister.runningBalance) }}
          </p>
          <DsButton variant="primary" :loading="savingAction === 'close'">Fechar Gaveta</DsButton>
        </form>
        <form v-else class="cash-form" @submit.prevent="openDrawer">
          <DsInput
            v-model.number="openingForm.openingAmount"
            type="number"
            label="Valor Inicial"
            min="0"
            step="0.01"
            required
          />
          <DsInput v-model="openingForm.notes" label="Observação" placeholder="Abertura da gaveta" />
          <DsButton variant="primary" :loading="savingAction === 'open'">Abrir Gaveta</DsButton>
        </form>
      </DsCard>
    </section>

    <section class="cash-main">
      <DsCard title="Gaveta por Forma de Pagamento">
        <DataTable
          :columns="paymentColumns"
          :rows="paymentRows"
          :loading="loading"
          empty-title="Nenhuma movimentação encontrada"
          empty-description="As entradas da gaveta aparecerão agrupadas por forma de pagamento."
          empty-icon="💳"
          variant="hoverable"
        >
          <template #cell-amount="{ row }">{{ formatCurrency(paymentRow(row).amount) }}</template>
        </DataTable>
      </DsCard>

      <DsCard title="Extrato de Movimentações da Gaveta">
        <DataTable
          :columns="movementColumns"
          :rows="movementRows"
          :loading="loading"
          empty-title="Nenhum registro encontrado"
          empty-description="Abra a gaveta ou registre uma entrada/saída para iniciar o extrato."
          empty-icon="🧾"
          variant="hoverable"
        >
          <template #cell-createdAt="{ row }">{{ formatDateTime(movementRow(row).createdAt) }}</template>
          <template #cell-amount="{ row }">{{ formatCurrency(movementRow(row).amount) }}</template>
          <template #cell-runningBalance="{ row }">{{ formatCurrency(movementRow(row).runningBalance) }}</template>
        </DataTable>
      </DsCard>
    </section>
  </section>
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
import { cashService, type CashDrawerDashboard } from '@/services/cash';
import type {
  CashMovementDashboardSummary,
  CashPaymentMethodSummary,
  CreateCashMovementRequest
} from '@cvg-his-v2/shared-contracts';

type SavingAction = 'open' | 'entry' | 'withdrawal' | 'deposit' | 'close' | '';

const loading = ref(false);
const savingAction = ref<SavingAction>('');
const error = ref('');
const successMessage = ref('');
const dashboard = ref<CashDrawerDashboard | null>(null);

const openingForm = ref({
  openingAmount: 0,
  notes: ''
});
const entryForm = ref({
  amount: 0,
  reference: '',
  notes: ''
});
const withdrawalForm = ref({
  amount: 0,
  reference: '',
  notes: ''
});
const depositForm = ref({
  amount: 0,
  reference: '',
  notes: ''
});
const closingForm = ref({
  closingAmount: 0,
  notes: ''
});

const paymentColumns: DataTableColumn[] = [
  { key: 'method', label: 'Forma de Pagamento' },
  { key: 'count', label: 'Movimentos' },
  { key: 'amount', label: 'Valor' }
];

const movementColumns: DataTableColumn[] = [
  { key: 'createdAt', label: 'Data e Hora' },
  { key: 'movementTypeLabel', label: 'Tipo' },
  { key: 'paymentMethod', label: 'Forma' },
  { key: 'reference', label: 'Origem' },
  { key: 'amount', label: 'Valor' },
  { key: 'runningBalance', label: 'Saldo' },
  { key: 'notes', label: 'Observação' }
];

const paymentRows = computed(() => dashboard.value?.byPaymentMethod as unknown as DataTableRow[] ?? []);
const movementRows = computed(() => dashboard.value?.movements as unknown as DataTableRow[] ?? []);
const lastClosingLabel = computed(() => {
  const lastClosed = dashboard.value?.lastClosedRegister;
  if (!lastClosed?.closedAt) return 'Sem fechamento';
  return formatDateTime(lastClosed.closedAt);
});

async function loadDashboard() {
  loading.value = true;
  error.value = '';
  try {
    dashboard.value = await cashService.getDashboard();
    if (dashboard.value.openRegister) {
      closingForm.value.closingAmount = dashboard.value.openRegister.runningBalance;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar gaveta';
  } finally {
    loading.value = false;
  }
}

async function openDrawer() {
  savingAction.value = 'open';
  await runAction(async () => {
    await cashService.openRegister({
      openingAmount: Number(openingForm.value.openingAmount),
      notes: optionalText(openingForm.value.notes)
    });
    openingForm.value = { openingAmount: 0, notes: '' };
    successMessage.value = 'Gaveta aberta.';
  });
}

async function submitMovement(movementType: CreateCashMovementRequest['movementType']) {
  const form = movementType === 'withdrawal'
    ? withdrawalForm.value
    : movementType === 'deposit'
      ? depositForm.value
      : entryForm.value;
  savingAction.value = movementType === 'withdrawal'
    ? 'withdrawal'
    : movementType === 'deposit'
      ? 'deposit'
      : 'entry';
  await runAction(async () => {
    await cashService.recordMovement({
      movementType,
      amount: Number(form.amount),
      reference: optionalText(form.reference),
      notes: optionalText(form.notes)
    });
    if (movementType === 'withdrawal') {
      withdrawalForm.value = { amount: 0, reference: '', notes: '' };
      successMessage.value = 'Saída de gaveta registrada.';
    } else if (movementType === 'deposit') {
      depositForm.value = { amount: 0, reference: '', notes: '' };
      successMessage.value = 'Depósito bancário registrado.';
    } else {
      entryForm.value = { amount: 0, reference: '', notes: '' };
      successMessage.value = 'Entrada de gaveta registrada.';
    }
  });
}

async function closeDrawer() {
  savingAction.value = 'close';
  await runAction(async () => {
    await cashService.closeRegister({
      closingAmount: Number(closingForm.value.closingAmount),
      notes: optionalText(closingForm.value.notes)
    });
    closingForm.value = { closingAmount: 0, notes: '' };
    successMessage.value = 'Gaveta fechada.';
  });
}

async function runAction(action: () => Promise<void>) {
  error.value = '';
  successMessage.value = '';
  try {
    await action();
    await loadDashboard();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar movimentação de gaveta';
  } finally {
    savingAction.value = '';
  }
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function paymentRow(row: unknown): CashPaymentMethodSummary {
  return row as CashPaymentMethodSummary;
}

function movementRow(row: unknown): CashMovementDashboardSummary {
  return row as CashMovementDashboardSummary;
}

onMounted(() => {
  void loadDashboard();
});
</script>

<style scoped>
.cash-page {
  display: grid;
  gap: 16px;
}

.cash-kpis,
.cash-actions,
.cash-main {
  display: grid;
  gap: 12px;
}

.cash-kpis {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.cash-actions {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.cash-main {
  grid-template-columns: minmax(260px, 0.8fr) minmax(320px, 1.2fr);
  align-items: start;
}

.cash-form {
  display: grid;
  gap: 10px;
}

.cash-hint {
  margin: 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}

@media (max-width: 900px) {
  .cash-main {
    grid-template-columns: 1fr;
  }
}
</style>

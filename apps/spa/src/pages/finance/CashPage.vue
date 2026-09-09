<template>
  <section class="cash-page">
    <AppPageHeader
      title="Gaveta"
      :breadcrumbs="['Financeiro', 'Gaveta', 'Gaveta']"
      subtitle="Caixa operacional com abertura, entradas, saídas, fechamento e extrato por forma de pagamento"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" :disabled="Boolean(savingAction)" @click="loadDashboard">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert
      v-if="error"
      variant="danger"
      :dismissible="Boolean(dashboard) && !uncertainCommand"
      @dismiss="error = ''"
    >
      <div class="feedback-content">
        <div class="feedback-message">
          <strong>{{ errorTitle }}</strong>
          <span>{{ error }}</span>
        </div>
        <DsButton v-if="errorKind === 'dashboard'" variant="secondary" size="sm" :loading="loading" :disabled="loading" @click="loadDashboard">
          Tentar novamente
        </DsButton>
        <DsButton
          v-else-if="errorKind === 'action' && uncertainCommand"
          variant="secondary"
          size="sm"
          :loading="Boolean(savingAction)"
          :disabled="Boolean(savingAction)"
          @click="retryUnconfirmedCommand"
        >
          Reconsultar operação
        </DsButton>
      </div>
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>
    <p v-if="loading && !dashboard" class="cash-status" role="status" aria-live="polite">
      Consultando o estado confirmado da gaveta…
    </p>
    <p v-else-if="savingAction" class="cash-status" role="status" aria-live="polite">
      {{ savingLabel }} em andamento…
    </p>

    <section class="cash-kpis" aria-label="Resumo da gaveta" :aria-busy="loading">
      <DsStatCard label="Último Fechamento" :value="lastClosingLabel" icon="🧾" />
      <DsStatCard label="Total de Entradas" :value="dashboardValue(dashboard?.totals.totalEntradas)" icon="💵" />
      <DsStatCard label="Total de Saídas" :value="dashboardValue(dashboard?.totals.totalSaidas)" icon="💸" />
      <DsStatCard label="Total em Gaveta" :value="dashboardValue(dashboard?.totals.totalEmGaveta)" icon="🏦" />
    </section>

    <section class="cash-actions" aria-label="Ações da gaveta" :aria-busy="Boolean(savingAction)">
      <DsCard title="Entrada de Gaveta">
        <form class="cash-form" :aria-busy="savingAction === 'entry'" @submit.prevent="submitMovement('supply')">
          <DsInput v-model.number="entryForm.amount" type="number" label="Valor" min="0.01" step="0.01" required :disabled="actionsDisabled" />
          <DsInput v-model="entryForm.reference" label="Origem" placeholder="Ex: reforço de caixa" :disabled="actionsDisabled" />
          <DsInput v-model="entryForm.notes" label="Observação" placeholder="Ex: entrada em dinheiro" :disabled="actionsDisabled" />
          <DsButton type="submit" variant="primary" :loading="savingAction === 'entry'" :disabled="actionsDisabled">Entrada</DsButton>
        </form>
      </DsCard>

      <DsCard title="Saída de Gaveta">
        <form class="cash-form" :aria-busy="savingAction === 'withdrawal'" @submit.prevent="submitMovement('withdrawal')">
          <DsInput v-model.number="withdrawalForm.amount" type="number" label="Valor" min="0.01" step="0.01" required :disabled="actionsDisabled" />
          <DsInput v-model="withdrawalForm.reference" label="Destino" placeholder="Ex: sangria" :disabled="actionsDisabled" />
          <DsInput v-model="withdrawalForm.notes" label="Observação" placeholder="Ex: retirada autorizada" :disabled="actionsDisabled" />
          <DsButton type="submit" variant="secondary" :loading="savingAction === 'withdrawal'" :disabled="actionsDisabled">Saída</DsButton>
        </form>
      </DsCard>

      <DsCard title="Depósito Bancário">
        <form class="cash-form" :aria-busy="savingAction === 'deposit'" @submit.prevent="submitMovement('deposit')">
          <DsInput v-model.number="depositForm.amount" type="number" label="Valor" min="0.01" step="0.01" required :disabled="actionsDisabled" />
          <DsInput v-model="depositForm.reference" label="Comprovante" placeholder="Ex: depósito 12345" :disabled="actionsDisabled" />
          <DsInput v-model="depositForm.notes" label="Observação" placeholder="Ex: depósito do fechamento" :disabled="actionsDisabled" />
          <DsButton type="submit" variant="secondary" :loading="savingAction === 'deposit'" :disabled="actionsDisabled">Registrar Depósito</DsButton>
        </form>
      </DsCard>

      <DsCard :title="dashboard?.openRegister ? 'Fechar Gaveta' : 'Abrir Gaveta'">
        <div v-if="loading && !dashboard" class="cash-loading-state" role="status">
          Consultando o saldo e o estado da gaveta…
        </div>
        <form v-else-if="dashboard?.openRegister" class="cash-form" :aria-busy="savingAction === 'close'" @submit.prevent="requestCloseDrawer">
          <DsInput
            v-model.number="closingForm.closingAmount"
            type="number"
            label="Valor Conferido"
            min="0"
            step="0.01"
            required
            :disabled="actionsDisabled"
          />
          <DsInput v-model="closingForm.notes" label="Observação" placeholder="Conferência de fechamento" :disabled="actionsDisabled" />
          <p class="cash-hint">
            Esperado: {{ formatCurrency(dashboard.openRegister.runningBalance) }}
          </p>
          <DsButton type="submit" variant="primary" :loading="savingAction === 'close'" :disabled="actionsDisabled">Fechar Gaveta</DsButton>
        </form>
        <form v-else class="cash-form" :aria-busy="savingAction === 'open'" @submit.prevent="openDrawer">
          <DsInput
            v-model.number="openingForm.openingAmount"
            type="number"
            label="Valor Inicial"
            min="0"
            step="0.01"
            required
            :disabled="actionsDisabled"
          />
          <DsInput v-model="openingForm.notes" label="Observação" placeholder="Abertura da gaveta" :disabled="actionsDisabled" />
          <DsButton type="submit" variant="primary" :loading="savingAction === 'open'" :disabled="actionsDisabled">Abrir Gaveta</DsButton>
        </form>
      </DsCard>
    </section>

    <DsModal
      :open="showCloseConfirm"
      :teleport="false"
      title="Confirmar fechamento da gaveta"
      @close="showCloseConfirm = false"
    >
      <p class="cash-confirmation-copy">
        O fechamento registra o valor conferido e encerra a gaveta aberta. Confira o valor antes de confirmar.
      </p>
      <p class="cash-confirmation-copy">
        Valor conferido: <strong>{{ formatCurrency(Number(closingForm.closingAmount)) }}</strong>
      </p>
      <template #footer>
        <DsButton variant="secondary" @click="showCloseConfirm = false">Cancelar</DsButton>
        <DsButton variant="danger" :loading="savingAction === 'close'" :disabled="Boolean(savingAction)" @click="confirmCloseDrawer">
          Confirmar fechamento
        </DsButton>
      </template>
    </DsModal>

    <section class="cash-main">
      <DsCard title="Gaveta por Forma de Pagamento">
        <DataTable
          :columns="paymentColumns"
          :rows="paymentRows"
          :loading="loading && !dashboard"
          caption="Gaveta por forma de pagamento"
          empty-title="Nenhuma movimentação encontrada"
          :empty-description="dashboard ? 'As entradas da gaveta aparecerão agrupadas por forma de pagamento.' : 'Os dados da gaveta não estão disponíveis.'"
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
          :loading="loading && !dashboard"
          caption="Extrato de movimentações da gaveta"
          empty-title="Nenhum registro encontrado"
          :empty-description="dashboard ? 'Abra a gaveta ou registre uma entrada/saída para iniciar o extrato.' : 'Os dados da gaveta não estão disponíveis.'"
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
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import { cashService, type CashDrawerDashboard } from '@/services/cash';
import type {
  CashMovementDashboardSummary,
  CashPaymentMethodSummary,
  CreateCashMovementRequest
} from '@cvg-his-v2/shared-contracts';

type SavingAction = 'open' | 'entry' | 'withdrawal' | 'deposit' | 'close' | '';
type ConcreteSavingAction = Exclude<SavingAction, ''>;

interface UncertainCommand {
  readonly action: ConcreteSavingAction;
  readonly execute: () => Promise<void>;
  readonly successText: string;
}

const savingLabels: Record<Exclude<SavingAction, ''>, string> = {
  open: 'Abertura',
  entry: 'Entrada',
  withdrawal: 'Saída',
  deposit: 'Depósito',
  close: 'Fechamento'
};

const loading = ref(true);
const savingAction = ref<SavingAction>('');
const error = ref('');
const errorKind = ref<'dashboard' | 'action' | ''>('');
const successMessage = ref('');
const dashboard = ref<CashDrawerDashboard | null>(null);
const showCloseConfirm = ref(false);
const activeIdempotencyKey = ref('');
const uncertainCommand = ref<UncertainCommand | null>(null);

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

const actionsDisabled = computed(() => Boolean(savingAction.value) || Boolean(uncertainCommand.value) || loading.value || !dashboard.value);
const savingLabel = computed(() => savingAction.value ? savingLabels[savingAction.value] : '');
const errorTitle = computed(() => {
  if (!dashboard.value) return 'Gaveta indisponível';
  if (errorKind.value === 'action') return isTimeoutError(error.value) ? 'Tempo limite excedido' : 'Ação não concluída';
  return 'Atualização não concluída';
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
  if (!dashboard.value) return '…';
  const lastClosed = dashboard.value?.lastClosedRegister;
  if (!lastClosed?.closedAt) return 'Sem fechamento';
  return formatDateTime(lastClosed.closedAt);
});

function dashboardValue(value: number | undefined): string {
  return dashboard.value && value !== undefined ? formatCurrency(value) : '…';
}

async function loadDashboard(): Promise<boolean> {
  loading.value = true;
  error.value = '';
  errorKind.value = '';
  try {
    dashboard.value = await cashService.getDashboard();
    if (dashboard.value.openRegister) {
      closingForm.value.closingAmount = dashboard.value.openRegister.runningBalance;
    }
    return true;
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Erro ao carregar gaveta';
    errorKind.value = 'dashboard';
    error.value = dashboard.value
      ? `Não foi possível atualizar a gaveta. Os últimos dados confirmados permanecem em tela. ${detail}`
      : `Não foi possível carregar a gaveta: ${detail}`;
    return false;
  } finally {
    loading.value = false;
  }
}

async function openDrawer() {
  if (!beginAction('open')) return;
  await runAction(async () => {
    await cashService.openRegister({
      openingAmount: Number(openingForm.value.openingAmount),
      notes: optionalText(openingForm.value.notes)
    }, { idempotencyKey: activeIdempotencyKey.value });
    openingForm.value = { openingAmount: 0, notes: '' };
  }, 'Gaveta aberta.');
}

async function submitMovement(movementType: CreateCashMovementRequest['movementType']) {
  const action = movementType === 'withdrawal'
    ? 'withdrawal'
    : movementType === 'deposit'
      ? 'deposit'
      : 'entry';
  if (!beginAction(action)) return;
  const form = movementType === 'withdrawal'
    ? withdrawalForm.value
    : movementType === 'deposit'
      ? depositForm.value
      : entryForm.value;
  await runAction(async () => {
    await cashService.recordMovement({
      movementType,
      amount: Number(form.amount),
      reference: optionalText(form.reference),
      notes: optionalText(form.notes)
    }, { idempotencyKey: activeIdempotencyKey.value });
    if (movementType === 'withdrawal') {
      withdrawalForm.value = { amount: 0, reference: '', notes: '' };
    } else if (movementType === 'deposit') {
      depositForm.value = { amount: 0, reference: '', notes: '' };
    } else {
      entryForm.value = { amount: 0, reference: '', notes: '' };
    }
  }, movementType === 'withdrawal'
    ? 'Saída de gaveta registrada.'
    : movementType === 'deposit'
      ? 'Depósito bancário registrado.'
      : 'Entrada de gaveta registrada.');
}

function requestCloseDrawer() {
  if (savingAction.value || loading.value || !dashboard.value?.openRegister) return;
  showCloseConfirm.value = true;
}

async function confirmCloseDrawer() {
  if (!beginAction('close')) return;
  showCloseConfirm.value = false;
  await runAction(async () => {
    await cashService.closeRegister({
      closingAmount: Number(closingForm.value.closingAmount),
      notes: optionalText(closingForm.value.notes)
    }, { idempotencyKey: activeIdempotencyKey.value });
    closingForm.value = { closingAmount: 0, notes: '' };
  }, 'Gaveta fechada.');
}

function beginAction(action: ConcreteSavingAction): boolean {
  if (savingAction.value || loading.value || !dashboard.value) return false;
  if (!activeIdempotencyKey.value) activeIdempotencyKey.value = createIdempotencyKey(action);
  savingAction.value = action;
  return true;
}

async function runAction(action: () => Promise<void>, successText: string) {
  error.value = '';
  errorKind.value = '';
  successMessage.value = '';
  const command: UncertainCommand = {
    action: savingAction.value as ConcreteSavingAction,
    execute: action,
    successText
  };
  try {
    await action();
    if (!await loadDashboard()) {
      activeIdempotencyKey.value = '';
      uncertainCommand.value = null;
      return;
    }
    successMessage.value = successText;
    activeIdempotencyKey.value = '';
    uncertainCommand.value = null;
  } catch (err) {
    errorKind.value = 'action';
    const detail = err instanceof Error ? err.message : 'Erro ao salvar movimentação de gaveta';
    if (isTimeoutError(err)) {
      uncertainCommand.value = command;
      error.value = `A operação demorou mais que o esperado e não foi confirmada. ${detail} Reconsulte usando a mesma chave antes de iniciar outra ação.`;
    } else {
      activeIdempotencyKey.value = '';
      uncertainCommand.value = null;
      error.value = detail;
    }
  } finally {
    savingAction.value = '';
  }
}

async function retryUnconfirmedCommand() {
  const command = uncertainCommand.value;
  if (!command || !beginAction(command.action)) return;
  await runAction(command.execute, command.successText);
}

function createIdempotencyKey(action: ConcreteSavingAction): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `cash-${action}-${uuid}` : `cash-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isTimeoutError(value: unknown): boolean {
  if (typeof value === 'object' && value !== null && 'status' in value) {
    const status = (value as { status?: unknown }).status;
    if (status === 408 || status === 504) return true;
  }
  const message = value instanceof Error ? value.message : String(value ?? '');
  return /timeout|timed out|tempo limite|tempo esgotado/i.test(message);
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

.cash-status {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  font-weight: 600;
}

.cash-loading-state {
  min-height: 132px;
  display: grid;
  place-items: center;
  padding: 16px;
  color: var(--color-text-muted, #64748b);
  text-align: center;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: var(--radius-md, 0.5rem);
}

.feedback-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.feedback-message {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.feedback-message span {
  overflow-wrap: anywhere;
}

:deep(.ds-stat-card__value) {
  font-variant-numeric: tabular-nums;
}

.cash-kpis :deep(.ds-stat-card:first-child .ds-stat-card__value) {
  font-size: 20px;
  white-space: nowrap;
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

  .feedback-content {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

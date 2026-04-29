<template>
  <div class="card-accounts-page">
    <AppPageHeader
      title="Contas Adm. Cartão"
      :breadcrumbs="['Financeiro', 'Controles', 'Contas Adm. Cartão']"
      subtitle="Administração de recebimentos por cartão, parcelas, taxas e conciliação com operadoras"
      :secondary-actions="headerSecondaryActions"
    />

    <section class="card-accounts-summary-grid" aria-label="Resumo de contas administradas de cartão">
      <DsStatCard :label="`${filteredRows.length} conta(s)`" value="Total" />
      <DsStatCard :label="formatCurrency(totalGross)" value="Valor" />
      <DsStatCard :label="formatCurrency(totalFees)" value="Taxas" />
      <DsStatCard
        :label="formatCurrency(totalNet)"
        value="Líquido"
        :error="attentionCount > 0 ? `${attentionCount} exigem conciliação` : undefined"
      />
    </section>

    <section class="card-accounts-actions" aria-label="Ações de contas administradas de cartão">
      <DsButton variant="primary" disabled>Gerar Conta Avulsa</DsButton>
      <DsButton variant="secondary" :disabled="selectedIds.size === 0">Conciliar Em Lote</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-transactions">Transações de Cartão</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadCardAccounts">Atualizar</DsButton>
    </section>

    <form class="card-accounts-filters" aria-label="Filtros de contas administradas de cartão" @submit.prevent="loadCardAccounts">
      <DsInput
        id="card-account-search"
        v-model="filters.search"
        label="Cliente/Provedor"
        type="search"
        placeholder="Buscar por cliente, autorização, bandeira ou provedor"
      />
      <DsInput id="card-account-date-from" v-model="filters.dateFrom" label="Data inicial" type="date" />
      <DsInput id="card-account-date-to" v-model="filters.dateTo" label="Data final" type="date" />
      <DsInput id="card-account-provider" v-model="filters.provider" label="Provedor" type="select">
        <option value="">Todos</option>
        <option value="local-card">Cartão local</option>
        <option value="pagarme-card">Pagar.me</option>
      </DsInput>
      <DsInput id="card-account-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="pending">Pendente</option>
        <option value="authorized_pending_capture">Autorizada</option>
        <option value="captured">Capturada</option>
        <option value="not_authorized">Não autorizada</option>
        <option value="failed">Falhou</option>
        <option value="voided">Cancelada</option>
      </DsInput>
      <DsInput id="card-account-reconciliation" v-model="filters.reconciliationState" label="Conciliação" type="select">
        <option value="">Todas</option>
        <option value="pending">Pendente</option>
        <option value="attention_required">Exige atenção</option>
        <option value="reconciled">Conciliada</option>
      </DsInput>
      <div class="card-accounts-filters__actions">
        <DsButton type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton type="button" variant="ghost" @click="clearFilters">Limpar</DsButton>
      </div>
    </form>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="💳"
      empty-title="Nenhuma conta administrada de cartão encontrada"
      empty-description="Os recebimentos aparecem quando transações de cartão entram na reconciliação financeira."
      caption="Contas administradas de cartão"
      variant="hoverable"
    >
      <template #cell-select="{ row }">
        <input
          type="checkbox"
          :aria-label="`Selecionar ${cardAccountRow(row).client}`"
          :checked="selectedIds.has(cardAccountRow(row).id)"
          @change="toggleSelection(cardAccountRow(row).id)"
        />
      </template>
      <template #cell-client="{ row }">
        <strong>{{ cardAccountRow(row).client }}</strong>
        <small>{{ cardAccountRow(row).patient }}</small>
      </template>
      <template #cell-date="{ row }">
        {{ formatDate(cardAccountRow(row).date) }}
      </template>
      <template #cell-installments="{ row }">
        {{ cardAccountRow(row).installments }}x
      </template>
      <template #cell-type="{ row }">
        <span class="provider-cell">{{ cardAccountRow(row).type }}</span>
        <small>{{ cardAccountRow(row).reference }}</small>
      </template>
      <template #cell-gross="{ row }">
        {{ formatCurrency(cardAccountRow(row).gross) }}
      </template>
      <template #cell-net="{ row }">
        <strong>{{ formatCurrency(cardAccountRow(row).net) }}</strong>
      </template>
      <template #cell-fee="{ row }">
        {{ formatCurrency(cardAccountRow(row).fee) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="cardStatusLabel(cardAccountRow(row).status)"
          :variant="cardStatusVariant(cardAccountRow(row).status)"
        />
      </template>
      <template #cell-reconciliation="{ row }">
        <StatusBadge
          :label="reconciliationLabel(cardAccountRow(row).reconciliationState)"
          :variant="reconciliationVariant(cardAccountRow(row).reconciliationState)"
        />
      </template>
      <template #cell-open="{ row }">
        <RouterLink
          :to="`/finance/card-transactions?search=${encodeURIComponent(cardAccountRow(row).id)}`"
          class="open-link"
        >
          Abrir
        </RouterLink>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { financeCardsService, type FinanceCardRow } from '@/services/financeCards';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type CardStatus = '' | 'pending' | 'authorized_pending_capture' | 'captured' | 'not_authorized' | 'failed' | 'voided';
type ReconciliationState = '' | 'pending' | 'attention_required' | 'reconciled';

interface CardAccountRow {
  id: string;
  client: string;
  patient: string;
  date: string | null;
  installments: number;
  type: string;
  reference: string;
  gross: number;
  net: number;
  fee: number;
  status: string;
  reconciliationState: string;
}

const columns: DataTableColumn[] = [
  { key: 'select', label: '', width: '48px' },
  { key: 'client', label: 'Cliente' },
  { key: 'date', label: 'Data' },
  { key: 'installments', label: 'Parcelas' },
  { key: 'type', label: 'Tipo' },
  { key: 'gross', label: 'Valor' },
  { key: 'net', label: 'Líquido' },
  { key: 'fee', label: 'Taxa' },
  { key: 'status', label: 'Status' },
  { key: 'reconciliation', label: 'Conciliação' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const filters = reactive({
  search: '',
  dateFrom: '',
  dateTo: '',
  provider: '',
  status: '' as CardStatus,
  reconciliationState: '' as ReconciliationState
});
const cards = ref<FinanceCardRow[]>([]);
const loading = ref(false);
const error = ref('');
const selectedIds = ref(new Set<string>());

const rows = computed(() => cards.value.map(toCardAccountRow) as unknown as DataTableRow[]);
const filteredRows = computed(() =>
  rows.value.filter((row) => {
    const account = cardAccountRow(row);
    if (filters.reconciliationState && account.reconciliationState !== filters.reconciliationState) return false;
    return matchesDateFilters(account);
  })
);
const totalGross = computed(() => filteredRows.value.reduce((sum, row) => sum + cardAccountRow(row).gross, 0));
const totalFees = computed(() => filteredRows.value.reduce((sum, row) => sum + cardAccountRow(row).fee, 0));
const totalNet = computed(() => filteredRows.value.reduce((sum, row) => sum + cardAccountRow(row).net, 0));
const attentionCount = computed(
  () => filteredRows.value.filter((row) => cardAccountRow(row).reconciliationState === 'attention_required').length
);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-card-accounts',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => loadCardAccounts()
  }
]);

onMounted(() => {
  void loadCardAccounts();
});

async function loadCardAccounts() {
  loading.value = true;
  error.value = '';
  try {
    cards.value = await financeCardsService.list({
      search: filters.search.trim(),
      status: filters.status || undefined,
      provider: filters.provider || undefined,
      page: 1,
      pageSize: 100
    });
    selectedIds.value = new Set([...selectedIds.value].filter((id) => cards.value.some((card) => card.transactionId === id)));
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar contas administradas de cartão.';
    cards.value = [];
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.search = '';
  filters.dateFrom = '';
  filters.dateTo = '';
  filters.provider = '';
  filters.status = '';
  filters.reconciliationState = '';
  void loadCardAccounts();
}

function matchesDateFilters(row: CardAccountRow): boolean {
  if (!row.date) return !filters.dateFrom && !filters.dateTo;
  const date = row.date.slice(0, 10);
  if (filters.dateFrom && date < filters.dateFrom) return false;
  if (filters.dateTo && date > filters.dateTo) return false;
  return true;
}

function toggleSelection(id: string) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedIds.value = next;
}

function toCardAccountRow(card: FinanceCardRow): CardAccountRow {
  const gross = card.amount ?? 0;
  const fee = card.feeAmount ?? (card.netAmount != null ? Math.max(gross - card.netAmount, 0) : 0);
  const net = card.netAmount ?? Math.max(gross - fee, 0);
  return {
    id: card.transactionId,
    client: card.ownerName || card.cardHolderName || 'Cliente não informado',
    patient: card.patientName ? `Paciente: ${card.patientName}` : card.description || 'Sem paciente vinculado',
    date: card.capturedAt || card.createdAt || null,
    installments: card.installments || 1,
    type: providerLabel(card.provider),
    reference: card.providerAuthorizationCode || card.providerChargeId || card.cardBrand || card.transactionId,
    gross,
    net,
    fee,
    status: card.status || 'pending',
    reconciliationState: card.reconciliationState || 'pending'
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function providerLabel(provider: string): string {
  if (provider === 'pagarme-card') return 'Pagar.me';
  if (provider === 'local-card') return 'Cartão local';
  return provider || 'Cartão';
}

function cardStatusLabel(status: string): string {
  if (status === 'captured') return 'Capturada';
  if (status === 'authorized_pending_capture') return 'Autorizada';
  if (status === 'not_authorized') return 'Não autorizada';
  if (status === 'failed') return 'Falhou';
  if (status === 'voided') return 'Cancelada';
  return 'Pendente';
}

function cardStatusVariant(status: string) {
  if (status === 'captured') return 'success';
  if (status === 'authorized_pending_capture') return 'info';
  if (status === 'failed' || status === 'not_authorized' || status === 'voided') return 'danger';
  return 'warning';
}

function reconciliationLabel(state: string): string {
  if (state === 'reconciled') return 'Conciliada';
  if (state === 'attention_required') return 'Exige atenção';
  return 'Pendente';
}

function reconciliationVariant(state: string) {
  if (state === 'reconciled') return 'success';
  if (state === 'attention_required') return 'warning';
  return 'info';
}

function cardAccountRow(row: unknown): CardAccountRow {
  return row as CardAccountRow;
}
</script>

<style scoped>
.card-accounts-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-accounts-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.card-accounts-actions,
.card-accounts-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.card-accounts-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(5, minmax(140px, 1fr)) auto;
}

.card-accounts-filters__actions {
  display: flex;
  gap: 8px;
}

.provider-cell,
.open-link {
  font-weight: 700;
}

.provider-cell,
.card-accounts-page small {
  display: block;
}

.card-accounts-page small {
  margin-top: 3px;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.open-link {
  color: var(--color-primary-700, #1d4ed8);
  text-decoration: none;
}

.open-link:hover {
  text-decoration: underline;
}

@media (max-width: 1180px) {
  .card-accounts-filters {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .card-accounts-filters {
    grid-template-columns: 1fr;
  }
}
</style>

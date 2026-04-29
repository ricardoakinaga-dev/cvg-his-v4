<template>
  <div class="cards-page">
    <AppPageHeader
      title="Cartões Débito/Crédito"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Cartões Débito/Crédito']"
      subtitle="Cadastro operacional de bandeiras, administradoras e uso financeiro de cartões"
      :secondary-actions="headerSecondaryActions"
      :primary-action="{ label: 'Novo Cartão', disabled: true }"
    />

    <DsAlert variant="info">
      Superfície somente leitura para preservar a ordem Vetus de cadastros financeiros. Cadastrar cartão, alterar
      bandeira, capturar transação, conciliar pagamento e baixar recebível seguem bloqueados até contrato auditável.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <form class="cards-filters" aria-label="Filtros de cartões débito e crédito" @submit.prevent>
      <DsInput
        id="cards-search"
        v-model="filters.search"
        label="Pesquisar"
        placeholder="Buscar por cartão, bandeira, administradora ou tutor"
        type="search"
      />
      <DsInput id="cards-provider" v-model="filters.provider" label="Administradora" type="select">
        <option value="">Todas</option>
        <option v-for="provider in providerOptions" :key="provider" :value="provider">{{ provider }}</option>
      </DsInput>
      <DsInput id="cards-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option v-for="status in statusOptions" :key="status" :value="status">{{ statusLabel(status) }}</option>
      </DsInput>
      <DsInput id="cards-type" v-model="filters.type" label="Tipo" type="select">
        <option value="">Todos</option>
        <option value="debit">Débito/à vista</option>
        <option value="credit">Crédito parcelado</option>
      </DsInput>
    </form>

    <section class="cards-summary-grid" aria-label="Resumo de cartões débito e crédito">
      <DsStatCard :label="`${visibleCards.length} cartão(ões)`" value="Registros" />
      <DsStatCard :label="`${capturedCount} capturado(s)`" value="Capturados" />
      <DsStatCard :label="`${pendingCount} pendente(s)`" value="Pendentes" />
      <DsStatCard :label="`${providerCount} administradora(s)`" value="Administradoras" />
    </section>

    <section class="cards-actions" aria-label="Ações de cartões débito e crédito">
      <DsButton variant="primary" disabled>Novo Cartão</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-machines">Maquininhas</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-transactions">Transações de Cartão</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-accounts">Contas Adm. Cartão</DsButton>
      <DsButton variant="ghost" type="button" :loading="loading" @click="reload">Atualizar</DsButton>
    </section>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      :loading="loading"
      empty-icon="💳"
      empty-title="Nenhum cartão encontrado"
      empty-description="Ajuste os filtros para visualizar os cartões de débito e crédito cadastrados."
      caption="Cartões débito e crédito"
      row-key-field="transactionId"
      variant="hoverable"
    >
      <template #cell-card="{ row }">
        <strong>{{ card(row).cardHolderName || card(row).ownerName || card(row).transactionId }}</strong>
        <small>{{ card(row).cardLast4 ? `Final ${card(row).cardLast4}` : card(row).transactionId }}</small>
      </template>
      <template #cell-type="{ row }">
        <StatusBadge :label="cardTypeLabel(card(row))" :variant="card(row).installments > 1 ? 'info' : 'neutral'" />
      </template>
      <template #cell-brand="{ row }">
        <span>{{ brandLabel(card(row).cardBrand) }}</span>
      </template>
      <template #cell-provider="{ row }">
        <strong>{{ card(row).provider }}</strong>
        <small>{{ card(row).installments }} parcela(s)</small>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :label="statusLabel(card(row).status)" :variant="statusVariant(card(row).status)" />
      </template>
      <template #cell-reconciliation="{ row }">
        <span>{{ reconciliationLabel(card(row).reconciliationState) }}</span>
      </template>
      <template #cell-usage="{ row }">
        <span>{{ card(row).description }}</span>
        <small>{{ card(row).patientName || 'Paciente não informado' }} · {{ card(row).ownerName || 'Tutor não informado' }}</small>
      </template>
      <template #cell-next="{ row }">
        <span>{{ nextAction(card(row)) }}</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { financeCardsService, type FinanceCardRow } from '@/services/financeCards';

const columns: DataTableColumn[] = [
  { key: 'card', label: 'Cartão' },
  { key: 'type', label: 'Tipo' },
  { key: 'brand', label: 'Bandeira' },
  { key: 'provider', label: 'Administradora' },
  { key: 'status', label: 'Status' },
  { key: 'reconciliation', label: 'Conciliação' },
  { key: 'usage', label: 'Uso' },
  { key: 'next', label: 'Próxima Ação' }
];

const loading = ref(false);
const error = ref('');
const cards = ref<FinanceCardRow[]>([]);
const filters = reactive({
  search: '',
  provider: '',
  status: '',
  type: ''
});

const visibleCards = computed(() => cards.value.filter(matchesFilters));
const visibleRows = computed(() => visibleCards.value as unknown as DataTableRow[]);
const providerOptions = computed(() => unique(cards.value.map((item) => item.provider)));
const statusOptions = computed(() => unique(cards.value.map((item) => item.status)));
const capturedCount = computed(() => visibleCards.value.filter((item) => item.status === 'captured').length);
const pendingCount = computed(() => visibleCards.value.filter((item) => item.status !== 'captured').length);
const providerCount = computed(() => new Set(visibleCards.value.map((item) => item.provider)).size);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-cards',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: reload
  }
]);

function matchesFilters(item: FinanceCardRow): boolean {
  if (filters.provider && item.provider !== filters.provider) return false;
  if (filters.status && item.status !== filters.status) return false;
  if (filters.type === 'credit' && item.installments <= 1) return false;
  if (filters.type === 'debit' && item.installments > 1) return false;
  const search = normalize(filters.search);
  if (!search) return true;
  return [
    item.transactionId,
    item.cardHolderName,
    item.ownerName,
    item.patientName,
    item.cardBrand,
    item.provider,
    item.cardLast4,
    item.description,
    statusLabel(item.status),
    reconciliationLabel(item.reconciliationState)
  ].some((value) => normalize(String(value ?? '')).includes(search));
}

async function loadCards() {
  loading.value = true;
  error.value = '';
  try {
    cards.value = await financeCardsService.list({ page: 1, pageSize: 100 });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar cartões';
    cards.value = [];
  } finally {
    loading.value = false;
  }
}

async function reload() {
  await loadCards();
}

function card(row: DataTableRow): FinanceCardRow {
  return row as unknown as FinanceCardRow;
}

function cardTypeLabel(item: FinanceCardRow): string {
  return item.installments > 1 ? 'Crédito parcelado' : 'Débito/à vista';
}

function statusLabel(status: string): string {
  if (status === 'captured') return 'Capturado';
  if (status === 'authorized_pending_capture') return 'Pendente';
  if (status === 'failed' || status === 'not_authorized') return 'Falhou';
  return status || 'Não informado';
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'captured') return 'success';
  if (status === 'authorized_pending_capture') return 'warning';
  if (status === 'failed' || status === 'not_authorized') return 'danger';
  return 'neutral';
}

function reconciliationLabel(state?: string | null): string {
  if (state === 'reconciled') return 'Conciliado';
  if (state === 'pending') return 'Pendente';
  if (state === 'attention') return 'Atenção';
  return 'Não conciliado';
}

function brandLabel(brand?: string | null): string {
  return brand ? brand : 'Não informada';
}

function nextAction(item: FinanceCardRow): string {
  if (item.status !== 'captured') return 'Acompanhar captura em Transações';
  if (item.reconciliationState !== 'reconciled') return 'Conferir em Contas Adm. Cartão';
  return 'Manter cadastro para consulta';
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

onMounted(() => {
  void loadCards();
});
</script>

<style scoped>
.cards-page {
  display: grid;
  gap: 16px;
}

.cards-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: 2fr 1fr 1fr 1fr;
}

.cards-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.cards-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cards-page small {
  color: var(--color-text-secondary, #64748b);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .cards-filters,
  .cards-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .cards-filters,
  .cards-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

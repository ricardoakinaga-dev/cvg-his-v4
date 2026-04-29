<template>
  <div class="advance-payments-page">
    <AppPageHeader
      title="Pagamento Antecipado"
      :breadcrumbs="['Financeiro', 'Controles', 'Pagamento Antecipado']"
      subtitle="Recebimentos antecipados de clientes, saldo disponível e compensação futura"
      :secondary-actions="headerSecondaryActions"
    />

    <section class="advance-summary-grid" aria-label="Resumo de pagamentos antecipados">
      <DsStatCard :label="`${filteredRows.length} lançamento(s)`" value="Total" />
      <DsStatCard :label="formatCurrency(totalAmount)" value="Total" />
      <DsStatCard :label="formatCurrency(totalCompensated)" value="Compensado" />
      <DsStatCard
        :label="formatCurrency(totalBalance)"
        value="Saldo"
        :error="totalBalance > 0 ? 'Compensação futura' : undefined"
      />
    </section>

    <section class="advance-actions" aria-label="Ações de pagamento antecipado">
      <DsButton variant="primary" disabled>Gerar Pagamento Antecipado</DsButton>
      <DsButton variant="secondary" :disabled="selectedIds.size === 0">Compensar Em Lote</DsButton>
      <DsButton variant="secondary" tag="a" to="/owners">Clientes</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadAdvancePayments">Atualizar</DsButton>
    </section>

    <form class="advance-filters" aria-label="Filtros de pagamento antecipado" @submit.prevent="loadAdvancePayments">
      <DsInput
        id="advance-client"
        v-model="filters.search"
        label="Cliente"
        type="search"
        placeholder="Buscar por cliente, documento ou contato"
      />
      <DsInput id="advance-issued-from" v-model="filters.issuedFrom" label="Emissão de" type="date" />
      <DsInput id="advance-issued-to" v-model="filters.issuedTo" label="Até" type="date" />
      <DsInput id="advance-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="available">Disponível</option>
        <option value="compensated">Compensado</option>
        <option value="cancelled">Cancelado</option>
      </DsInput>
      <div class="advance-filters__actions">
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
      empty-icon="⏩"
      empty-title="Nenhum pagamento antecipado encontrado"
      empty-description="Os lançamentos aparecem quando clientes possuem saldo de crédito financeiro."
      caption="Pagamentos antecipados"
      variant="hoverable"
    >
      <template #cell-select="{ row }">
        <input
          type="checkbox"
          :aria-label="`Selecionar ${advanceRow(row).client}`"
          :checked="selectedIds.has(advanceRow(row).id)"
          @change="toggleSelection(advanceRow(row).id)"
        />
      </template>
      <template #cell-client="{ row }">
        <strong>{{ advanceRow(row).client }}</strong>
        <small>{{ advanceRow(row).document }}</small>
      </template>
      <template #cell-issuedAt="{ row }">
        {{ formatDate(advanceRow(row).issuedAt) }}
      </template>
      <template #cell-total="{ row }">
        {{ formatCurrency(advanceRow(row).total) }}
      </template>
      <template #cell-compensated="{ row }">
        {{ formatCurrency(advanceRow(row).compensated) }}
      </template>
      <template #cell-balance="{ row }">
        <strong>{{ formatCurrency(advanceRow(row).balance) }}</strong>
      </template>
      <template #cell-origin="{ row }">
        <span class="origin-cell">{{ advanceRow(row).origin }}</span>
        <small>{{ advanceRow(row).notes }}</small>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="advanceStatusLabel(advanceRow(row).status)"
          :variant="advanceStatusVariant(advanceRow(row).status)"
        />
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="`/owners/${advanceRow(row).ownerId}`" class="open-link">Abrir</RouterLink>
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
import { ownerService } from '@/services/owner';
import type { OwnerSummary } from '@/types/owner';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type AdvanceStatus = 'available' | 'compensated' | 'cancelled';
type FilterStatus = '' | AdvanceStatus;

interface AdvancePaymentRow {
  id: string;
  ownerId: string;
  client: string;
  document: string;
  issuedAt: string | null;
  total: number;
  compensated: number;
  balance: number;
  origin: string;
  status: AdvanceStatus;
  notes: string;
}

const columns: DataTableColumn[] = [
  { key: 'select', label: '', width: '48px' },
  { key: 'client', label: 'Cliente' },
  { key: 'issuedAt', label: 'Emissão' },
  { key: 'total', label: 'Total' },
  { key: 'compensated', label: 'Compensado' },
  { key: 'balance', label: 'Saldo' },
  { key: 'origin', label: 'Origem' },
  { key: 'status', label: 'Status' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const filters = reactive({
  search: '',
  issuedFrom: '',
  issuedTo: '',
  status: '' as FilterStatus
});
const owners = ref<OwnerSummary[]>([]);
const loading = ref(false);
const error = ref('');
const selectedIds = ref(new Set<string>());

const rows = computed(() =>
  owners.value
    .map(toAdvancePaymentRow)
    .filter((row): row is AdvancePaymentRow => row !== null) as unknown as DataTableRow[]
);
const filteredRows = computed(() =>
  rows.value.filter((row) => {
    const advance = advanceRow(row);
    if (filters.status && advance.status !== filters.status) return false;
    return matchesIssuedFilters(advance);
  })
);
const totalAmount = computed(() => filteredRows.value.reduce((sum, row) => sum + advanceRow(row).total, 0));
const totalCompensated = computed(() =>
  filteredRows.value.reduce((sum, row) => sum + advanceRow(row).compensated, 0)
);
const totalBalance = computed(() => filteredRows.value.reduce((sum, row) => sum + advanceRow(row).balance, 0));
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-advance-payments',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => loadAdvancePayments()
  }
]);

onMounted(() => {
  void loadAdvancePayments();
});

async function loadAdvancePayments() {
  loading.value = true;
  error.value = '';
  try {
    owners.value = await ownerService.list({
      search: filters.search.trim(),
      status: 'active',
      financialResponsible: true,
      page: 1,
      pageSize: 50
    });
    selectedIds.value = new Set(
      [...selectedIds.value].filter((id) => rows.value.some((row) => advanceRow(row).id === id))
    );
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar pagamentos antecipados.';
    owners.value = [];
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.search = '';
  filters.issuedFrom = '';
  filters.issuedTo = '';
  filters.status = '';
  void loadAdvancePayments();
}

function matchesIssuedFilters(row: AdvancePaymentRow): boolean {
  if (!row.issuedAt) return !filters.issuedFrom && !filters.issuedTo;
  const issued = row.issuedAt.slice(0, 10);
  if (filters.issuedFrom && issued < filters.issuedFrom) return false;
  if (filters.issuedTo && issued > filters.issuedTo) return false;
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

function toAdvancePaymentRow(owner: OwnerSummary): AdvancePaymentRow | null {
  const creditBalance = owner.financialProfile?.creditBalance ?? 0;
  if (creditBalance <= 0) return null;

  return {
    id: `advance-${owner.id}`,
    ownerId: owner.id,
    client: owner.fullName,
    document: owner.documentId || 'Sem documento',
    issuedAt: owner.updatedAt || owner.createdAt || null,
    total: creditBalance,
    compensated: 0,
    balance: creditBalance,
    origin: 'Crédito do cliente',
    status: 'available',
    notes: 'Saldo financeiro disponível para compensação futura'
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

function advanceStatusLabel(status: AdvanceStatus): string {
  if (status === 'compensated') return 'Compensado';
  if (status === 'cancelled') return 'Cancelado';
  return 'Disponível';
}

function advanceStatusVariant(status: AdvanceStatus) {
  if (status === 'compensated') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'info';
}

function advanceRow(row: unknown): AdvancePaymentRow {
  return row as AdvancePaymentRow;
}
</script>

<style scoped>
.advance-payments-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.advance-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.advance-actions,
.advance-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.advance-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1.4fr) repeat(3, minmax(150px, 1fr)) auto;
}

.advance-filters__actions {
  display: flex;
  gap: 8px;
}

.origin-cell,
.open-link {
  font-weight: 700;
}

.origin-cell,
.advance-payments-page small {
  display: block;
}

.advance-payments-page small {
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

@media (max-width: 980px) {
  .advance-filters {
    grid-template-columns: 1fr;
  }
}
</style>

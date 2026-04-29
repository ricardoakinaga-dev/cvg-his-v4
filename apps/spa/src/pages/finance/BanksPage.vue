<template>
  <div class="banks-page">
    <AppPageHeader
      title="Bancos"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Bancos']"
      subtitle="Cadastro operacional de bancos, contas, agência e uso financeiro"
      :secondary-actions="headerSecondaryActions"
      :primary-action="{ label: 'Novo Banco', disabled: true }"
    />

    <DsAlert variant="info">
      Superfície somente leitura para preservar a ordem Vetus de cadastros financeiros. Cadastrar banco, alterar conta,
      conciliar extrato, transferir saldo e baixar títulos seguem bloqueados até contrato auditável.
    </DsAlert>

    <form class="banks-filters" aria-label="Filtros de bancos" @submit.prevent>
      <DsInput
        id="banks-search"
        v-model="filters.search"
        label="Pesquisar"
        placeholder="Buscar por banco, agência, conta ou uso"
        type="search"
      />
      <DsInput id="banks-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="active">Ativo</option>
        <option value="inactive">Inativo</option>
      </DsInput>
      <DsInput id="banks-account-type" v-model="filters.accountType" label="Tipo de Conta" type="select">
        <option value="">Todos</option>
        <option value="checking">Conta Corrente</option>
        <option value="savings">Poupança</option>
        <option value="payment">Conta Pagamento</option>
      </DsInput>
      <DsInput id="banks-usage" v-model="filters.usage" label="Uso" type="select">
        <option value="">Todos</option>
        <option value="settlement">Liquidação</option>
        <option value="card">Cartões</option>
        <option value="support">Apoio</option>
      </DsInput>
    </form>

    <section class="banks-summary-grid" aria-label="Resumo de bancos">
      <DsStatCard :label="`${visibleBanks.length} banco(s)`" value="Registros" />
      <DsStatCard :label="`${activeCount} ativo(s)`" value="Ativos" />
      <DsStatCard :label="`${settlementCount} liquidação`" value="Liquidação" />
      <DsStatCard :label="`${reconciliationCount} conciliação`" value="Conciliação" />
    </section>

    <section class="banks-actions" aria-label="Ações de bancos">
      <DsButton variant="primary" disabled>Novo Banco</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/cash-flow">Fluxo de Caixa</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/accounts-payable">Contas a Pagar</DsButton>
      <DsButton variant="secondary" tag="a" to="/cards">Cartões Débito/Crédito</DsButton>
      <DsButton variant="ghost" type="button" @click="resetFilters">Atualizar</DsButton>
    </section>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      empty-icon="🏦"
      empty-title="Nenhum banco encontrado"
      empty-description="Ajuste os filtros para visualizar os bancos cadastrados."
      caption="Bancos"
      row-key-field="code"
      variant="hoverable"
    >
      <template #cell-bank="{ row }">
        <strong>{{ bank(row).name }}</strong>
        <small>Código {{ bank(row).code }}</small>
      </template>
      <template #cell-account="{ row }">
        <strong>Agência {{ bank(row).agency }}</strong>
        <small>Conta {{ bank(row).accountNumber }}</small>
      </template>
      <template #cell-type="{ row }">
        <span>{{ accountTypeLabel(bank(row).accountType) }}</span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="bank(row).status === 'active' ? 'Ativo' : 'Inativo'"
          :variant="bank(row).status === 'active' ? 'success' : 'neutral'"
        />
      </template>
      <template #cell-usage="{ row }">
        <strong>{{ usageLabel(bank(row).usageKey) }}</strong>
        <small>{{ bank(row).usage }}</small>
      </template>
      <template #cell-reconciliation="{ row }">
        <span>{{ bank(row).reconciliation }}</span>
      </template>
      <template #cell-next="{ row }">
        <span>{{ bank(row).nextAction }}</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type BankStatus = 'active' | 'inactive';
type AccountType = 'checking' | 'savings' | 'payment';
type UsageKey = 'settlement' | 'card' | 'support';

interface BankAccount {
  code: string;
  name: string;
  agency: string;
  accountNumber: string;
  accountType: AccountType;
  status: BankStatus;
  usageKey: UsageKey;
  usage: string;
  reconciliation: string;
  nextAction: string;
}

const columns: DataTableColumn[] = [
  { key: 'bank', label: 'Banco' },
  { key: 'account', label: 'Agência/Conta' },
  { key: 'type', label: 'Tipo' },
  { key: 'status', label: 'Status' },
  { key: 'usage', label: 'Uso' },
  { key: 'reconciliation', label: 'Conciliação' },
  { key: 'next', label: 'Próxima Ação' }
];

const banks: BankAccount[] = [
  {
    code: '001',
    name: 'Banco do Brasil',
    agency: '0001',
    accountNumber: '12345-6',
    accountType: 'checking',
    status: 'active',
    usageKey: 'settlement',
    usage: 'Liquidação e recebíveis operacionais',
    reconciliation: 'Extrato pendente de integração',
    nextAction: 'Conferir fluxo antes de baixa financeira'
  },
  {
    code: '237',
    name: 'Bradesco',
    agency: '0142',
    accountNumber: '77889-0',
    accountType: 'payment',
    status: 'active',
    usageKey: 'card',
    usage: 'Domicílio bancário de cartões',
    reconciliation: 'Usado por maquininha e contas adm. cartão',
    nextAction: 'Acompanhar Cartões Débito/Crédito'
  },
  {
    code: '341',
    name: 'Itaú',
    agency: '0200',
    accountNumber: '45678-1',
    accountType: 'savings',
    status: 'inactive',
    usageKey: 'support',
    usage: 'Conta de apoio sem baixa habilitada',
    reconciliation: 'Sem conciliação ativa',
    nextAction: 'Habilitar apenas com contrato auditável'
  }
];

const filters = reactive({
  search: '',
  status: '',
  accountType: '',
  usage: ''
});

const visibleBanks = computed(() => banks.filter(matchesFilters));
const visibleRows = computed(() => visibleBanks.value as unknown as DataTableRow[]);
const activeCount = computed(() => visibleBanks.value.filter((item) => item.status === 'active').length);
const settlementCount = computed(() => visibleBanks.value.filter((item) => item.usageKey === 'settlement').length);
const reconciliationCount = computed(() => visibleBanks.value.filter((item) => item.reconciliation !== 'Sem conciliação ativa').length);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-banks',
    label: 'Atualizar',
    variant: 'secondary' as const,
    onClick: resetFilters
  }
]);

function matchesFilters(item: BankAccount): boolean {
  if (filters.status && item.status !== filters.status) return false;
  if (filters.accountType && item.accountType !== filters.accountType) return false;
  if (filters.usage && item.usageKey !== filters.usage) return false;
  const search = normalize(filters.search);
  if (!search) return true;
  return [
    item.code,
    item.name,
    item.agency,
    item.accountNumber,
    accountTypeLabel(item.accountType),
    usageLabel(item.usageKey),
    item.usage,
    item.reconciliation,
    item.nextAction
  ].some((value) => normalize(value).includes(search));
}

function resetFilters() {
  filters.search = '';
  filters.status = '';
  filters.accountType = '';
  filters.usage = '';
}

function bank(row: DataTableRow): BankAccount {
  return row as unknown as BankAccount;
}

function accountTypeLabel(type: AccountType): string {
  if (type === 'checking') return 'Conta Corrente';
  if (type === 'savings') return 'Poupança';
  return 'Conta Pagamento';
}

function usageLabel(usage: UsageKey): string {
  if (usage === 'settlement') return 'Liquidação';
  if (usage === 'card') return 'Cartões';
  return 'Apoio';
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
</script>

<style scoped>
.banks-page {
  display: grid;
  gap: 16px;
}

.banks-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: 2fr repeat(3, minmax(0, 1fr));
}

.banks-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.banks-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.banks-page small {
  color: var(--color-text-secondary, #64748b);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .banks-filters,
  .banks-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .banks-filters,
  .banks-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div class="payment-enablement-page">
    <AppPageHeader
      title="Habilitar Pagamento"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Habilitar Pagamento']"
      subtitle="Credenciamento, requisitos e status de habilitação dos provedores"
      :secondary-actions="headerSecondaryActions"
    />

    <DsAlert variant="info">
      Painel operacional em modo somente leitura. Habilitar provedor, credenciar recebedor, alterar domicílio bancário
      e ativar captura real seguem bloqueados até contrato de pagamentos auditável.
    </DsAlert>

    <form class="payment-enablement-filters" aria-label="Filtros de habilitação de pagamento" @submit.prevent>
      <DsInput id="payment-enablement-unit" v-model="filters.unit" label="Unidade" type="select">
        <option value="">Todas</option>
        <option value="cvg">Centro Veterinário Guarapiranga</option>
        <option value="mobile">Atendimento externo</option>
      </DsInput>
      <DsInput id="payment-enablement-provider" v-model="filters.provider" label="Provedor" type="select">
        <option value="">Todos</option>
        <option value="cvg-pay">CVG Pay</option>
        <option value="stone">Stone</option>
      </DsInput>
      <DsInput id="payment-enablement-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="enabled">Habilitada</option>
        <option value="pending">Em análise</option>
        <option value="blocked">Bloqueada</option>
      </DsInput>
      <DsInput id="payment-enablement-search" v-model="filters.search" label="Pesquisar" />
    </form>

    <section class="payment-enablement-summary-grid" aria-label="Resumo de habilitação de pagamento">
      <DsStatCard :label="`${visibleEnablements.length} credenciamento(s)`" value="Registros" />
      <DsStatCard :label="`${enabledCount} habilitado(s)`" value="Habilitados" />
      <DsStatCard :label="`${pendingCount} em análise`" value="Em Análise" />
      <DsStatCard :label="`${blockedCount} bloqueado(s)`" value="Bloqueados" />
    </section>

    <section class="payment-enablement-actions" aria-label="Ações de habilitação de pagamento">
      <DsButton variant="primary" disabled>Habilitar Pagamento</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-machines">Maquininhas</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/split">Configuração do Split</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/payments-dashboard">Pagamento Dashboard</DsButton>
      <DsButton variant="ghost" type="button" @click="resetFilters">Atualizar</DsButton>
    </section>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      empty-icon="✅"
      empty-title="Nenhuma habilitação de pagamento encontrada"
      empty-description="Ajuste os filtros para visualizar credenciamento, requisitos e bloqueios."
      caption="Habilitação de pagamento"
      variant="hoverable"
    >
      <template #cell-unit="{ row }">
        <strong>{{ enablement(row).unitLabel }}</strong>
        <small>{{ enablement(row).code }}</small>
      </template>
      <template #cell-provider="{ row }">
        <strong>{{ enablement(row).providerLabel }}</strong>
        <small>{{ enablement(row).merchantId }}</small>
      </template>
      <template #cell-step="{ row }">
        <strong>{{ enablement(row).step }}</strong>
        <small>{{ enablement(row).requirement }}</small>
      </template>
      <template #cell-bank="{ row }">
        <span>{{ enablement(row).bankAccount }}</span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :label="statusLabel(enablement(row).status)" :variant="statusVariant(enablement(row).status)" />
      </template>
      <template #cell-next="{ row }">
        <span>{{ enablement(row).nextAction }}</span>
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

type EnablementStatus = 'enabled' | 'pending' | 'blocked';
type EnablementStatusFilter = '' | EnablementStatus;

interface PaymentEnablement {
  id: string;
  code: string;
  unit: string;
  unitLabel: string;
  provider: string;
  providerLabel: string;
  merchantId: string;
  step: string;
  requirement: string;
  bankAccount: string;
  status: EnablementStatus;
  nextAction: string;
}

const columns: DataTableColumn[] = [
  { key: 'unit', label: 'Unidade' },
  { key: 'provider', label: 'Provedor' },
  { key: 'step', label: 'Credenciamento' },
  { key: 'bank', label: 'Domicílio Bancário' },
  { key: 'status', label: 'Status' },
  { key: 'next', label: 'Próxima Ação' }
];

const enablements: PaymentEnablement[] = [
  {
    id: 'cvg-pay-main',
    code: 'CVG-PAY-001',
    unit: 'cvg',
    unitLabel: 'Centro Veterinário Guarapiranga',
    provider: 'cvg-pay',
    providerLabel: 'CVG Pay',
    merchantId: 'MID-CVG-001',
    step: 'Credenciamento aprovado',
    requirement: 'Split e recebedores conferidos',
    bankAccount: 'Domicílio bancário validado',
    status: 'enabled',
    nextAction: 'Monitorar captura e conciliação'
  },
  {
    id: 'cvg-pay-clinic',
    code: 'CVG-PAY-002',
    unit: 'cvg',
    unitLabel: 'Centro Veterinário Guarapiranga',
    provider: 'cvg-pay',
    providerLabel: 'CVG Pay',
    merchantId: 'MID-CVG-002',
    step: 'Credenciamento em análise',
    requirement: 'Documentos do recebedor pendentes',
    bankAccount: 'Domicílio bancário informado',
    status: 'pending',
    nextAction: 'Validar recebedor antes de habilitar'
  },
  {
    id: 'stone-mobile',
    code: 'STONE-EXT-001',
    unit: 'mobile',
    unitLabel: 'Atendimento externo',
    provider: 'stone',
    providerLabel: 'Stone',
    merchantId: 'MID-EXT-001',
    step: 'Habilitação bloqueada',
    requirement: 'Contrato de provedor não auditado',
    bankAccount: 'Domicílio bancário pendente',
    status: 'blocked',
    nextAction: 'Revisar contrato e auditoria de pagamentos'
  }
];

const filters = reactive({
  unit: '',
  provider: '',
  status: '' as EnablementStatusFilter,
  search: ''
});

const visibleEnablements = computed(() => enablements.filter(matchesFilters));
const visibleRows = computed(() => visibleEnablements.value as unknown as DataTableRow[]);
const enabledCount = computed(() => visibleEnablements.value.filter((item) => item.status === 'enabled').length);
const pendingCount = computed(() => visibleEnablements.value.filter((item) => item.status === 'pending').length);
const blockedCount = computed(() => visibleEnablements.value.filter((item) => item.status === 'blocked').length);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-payment-enablement',
    label: 'Atualizar',
    variant: 'secondary' as const,
    onClick: resetFilters
  }
]);

function matchesFilters(item: PaymentEnablement): boolean {
  if (filters.unit && item.unit !== filters.unit) return false;
  if (filters.provider && item.provider !== filters.provider) return false;
  if (filters.status && item.status !== filters.status) return false;
  const search = normalize(filters.search);
  if (!search) return true;
  return [
    item.code,
    item.unitLabel,
    item.providerLabel,
    item.merchantId,
    item.step,
    item.requirement,
    item.bankAccount,
    statusLabel(item.status),
    item.nextAction
  ].some((value) => normalize(value).includes(search));
}

function resetFilters() {
  filters.unit = '';
  filters.provider = '';
  filters.status = '';
  filters.search = '';
}

function enablement(row: DataTableRow): PaymentEnablement {
  return row as unknown as PaymentEnablement;
}

function statusLabel(status: EnablementStatus): string {
  if (status === 'enabled') return 'Habilitada';
  if (status === 'pending') return 'Em análise';
  return 'Bloqueada';
}

function statusVariant(status: EnablementStatus): 'success' | 'warning' | 'danger' {
  if (status === 'enabled') return 'success';
  if (status === 'pending') return 'warning';
  return 'danger';
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
.payment-enablement-page {
  display: grid;
  gap: 16px;
}

.payment-enablement-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.payment-enablement-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.payment-enablement-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.payment-enablement-page small {
  color: var(--color-text-secondary, #64748b);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .payment-enablement-filters,
  .payment-enablement-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .payment-enablement-filters,
  .payment-enablement-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

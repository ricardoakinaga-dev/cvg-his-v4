<template>
  <div class="payment-methods-page">
    <AppPageHeader
      title="Formas de Pagamento"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Formas de Pagamento']"
      subtitle="Cadastro operacional de meios de pagamento, integrações e uso financeiro"
      :secondary-actions="headerSecondaryActions"
    />

    <DsAlert variant="info">
      Superfície somente leitura para preservar a ordem Vetus de cadastros financeiros. Criar forma, editar regras,
      alterar integração e impactar baixa financeira seguem bloqueados até contrato auditável.
    </DsAlert>

    <form class="payment-methods-filters" aria-label="Filtros de formas de pagamento" @submit.prevent>
      <DsInput
        id="payment-methods-search"
        v-model="filters.search"
        label="Pesquisar"
        placeholder="Buscar por forma, código, integração ou uso"
      />
      <DsInput id="payment-methods-type" v-model="filters.type" label="Tipo" type="select">
        <option value="">Todos</option>
        <option value="cash">Presencial</option>
        <option value="digital">Digital</option>
        <option value="credit">Crédito</option>
        <option value="receivable">Recebível</option>
      </DsInput>
      <DsInput id="payment-methods-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="active">Ativa</option>
        <option value="inactive">Inativa</option>
      </DsInput>
      <DsInput id="payment-methods-integration" v-model="filters.integration" label="Integração" type="select">
        <option value="">Todas</option>
        <option value="cash-drawer">Gaveta</option>
        <option value="pix">PIX</option>
        <option value="card-machine">TEF/Maquininha</option>
        <option value="receivables">Contas a Receber</option>
      </DsInput>
    </form>

    <section class="payment-methods-summary-grid" aria-label="Resumo de formas de pagamento">
      <DsStatCard :label="`${visibleMethods.length} forma(s)`" value="Registros" />
      <DsStatCard :label="`${activeCount} ativa(s)`" value="Ativas" />
      <DsStatCard :label="`${digitalCount} digital(is)`" value="Digitais" />
      <DsStatCard :label="`${integratedCount} integrada(s)`" value="Integradas" />
    </section>

    <section class="payment-methods-actions" aria-label="Ações de formas de pagamento">
      <DsButton variant="primary" disabled>Nova Forma</DsButton>
      <DsButton variant="secondary" tag="a" to="/cash">Gaveta</DsButton>
      <DsButton variant="secondary" tag="a" to="/billing">Contas a Receber</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/payments-dashboard">Pagamento Dashboard</DsButton>
      <DsButton variant="ghost" type="button" @click="resetFilters">Atualizar</DsButton>
    </section>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      empty-icon="💳"
      empty-title="Nenhuma forma de pagamento encontrada"
      empty-description="Ajuste os filtros para visualizar os meios de pagamento cadastrados."
      caption="Formas de pagamento"
      row-key-field="code"
      variant="hoverable"
    >
      <template #cell-method="{ row }">
        <strong>{{ paymentMethod(row).label }}</strong>
        <small>{{ paymentMethod(row).code }}</small>
      </template>
      <template #cell-type="{ row }">
        <span>{{ typeLabel(paymentMethod(row).type) }}</span>
      </template>
      <template #cell-integration="{ row }">
        <strong>{{ integrationLabel(paymentMethod(row).integration) }}</strong>
        <small>{{ paymentMethod(row).integrationDetail }}</small>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="paymentMethod(row).status === 'active' ? 'Ativa' : 'Inativa'"
          :variant="paymentMethod(row).status === 'active' ? 'success' : 'neutral'"
        />
      </template>
      <template #cell-usage="{ row }">
        <span>{{ paymentMethod(row).usage }}</span>
      </template>
      <template #cell-next="{ row }">
        <span>{{ paymentMethod(row).nextAction }}</span>
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

type PaymentMethodType = 'cash' | 'digital' | 'credit' | 'receivable';
type PaymentMethodStatus = 'active' | 'inactive';
type PaymentMethodIntegration = 'cash-drawer' | 'pix' | 'card-machine' | 'receivables';

interface PaymentMethod {
  code: string;
  label: string;
  type: PaymentMethodType;
  status: PaymentMethodStatus;
  integration: PaymentMethodIntegration;
  integrationDetail: string;
  usage: string;
  nextAction: string;
}

const columns: DataTableColumn[] = [
  { key: 'method', label: 'Forma' },
  { key: 'type', label: 'Tipo' },
  { key: 'integration', label: 'Integração' },
  { key: 'status', label: 'Status' },
  { key: 'usage', label: 'Uso' },
  { key: 'next', label: 'Próxima Ação' }
];

const paymentMethods: PaymentMethod[] = [
  {
    code: 'cash',
    label: 'Dinheiro',
    type: 'cash',
    status: 'active',
    integration: 'cash-drawer',
    integrationDetail: 'Gaveta e fechamento de caixa',
    usage: 'Recebimento presencial no balcão',
    nextAction: 'Conferir no fechamento da gaveta'
  },
  {
    code: 'pix',
    label: 'PIX',
    type: 'digital',
    status: 'active',
    integration: 'pix',
    integrationDetail: 'Pagamentos CVG e conferência manual',
    usage: 'Pagamento instantâneo',
    nextAction: 'Monitorar conciliação PIX'
  },
  {
    code: 'card_credit',
    label: 'Cartão de Crédito',
    type: 'digital',
    status: 'active',
    integration: 'card-machine',
    integrationDetail: 'TEF/Maquininha e transações de cartão',
    usage: 'Crédito parcelado ou à vista',
    nextAction: 'Acompanhar Pagamento Dashboard'
  },
  {
    code: 'card_debit',
    label: 'Cartão de Débito',
    type: 'digital',
    status: 'active',
    integration: 'card-machine',
    integrationDetail: 'TEF/Maquininha e conciliação',
    usage: 'Débito presencial',
    nextAction: 'Conferir transação de cartão'
  },
  {
    code: 'invoice',
    label: 'Faturamento a Prazo',
    type: 'receivable',
    status: 'inactive',
    integration: 'receivables',
    integrationDetail: 'Contas a Receber',
    usage: 'Título financeiro para cobrança posterior',
    nextAction: 'Habilitar apenas com regra financeira auditada'
  }
];

const filters = reactive({
  search: '',
  type: '',
  status: '',
  integration: ''
});

const visibleMethods = computed(() => paymentMethods.filter(matchesFilters));
const visibleRows = computed(() => visibleMethods.value as unknown as DataTableRow[]);
const activeCount = computed(() => visibleMethods.value.filter((item) => item.status === 'active').length);
const digitalCount = computed(() => visibleMethods.value.filter((item) => item.type === 'digital').length);
const integratedCount = computed(() => visibleMethods.value.filter((item) => item.integration !== 'cash-drawer').length);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-payment-methods',
    label: 'Atualizar',
    variant: 'secondary' as const,
    onClick: resetFilters
  }
]);

function matchesFilters(item: PaymentMethod): boolean {
  if (filters.type && item.type !== filters.type) return false;
  if (filters.status && item.status !== filters.status) return false;
  if (filters.integration && item.integration !== filters.integration) return false;
  const search = normalize(filters.search);
  if (!search) return true;
  return [
    item.code,
    item.label,
    typeLabel(item.type),
    integrationLabel(item.integration),
    item.integrationDetail,
    item.usage,
    item.nextAction
  ].some((value) => normalize(value).includes(search));
}

function resetFilters() {
  filters.search = '';
  filters.type = '';
  filters.status = '';
  filters.integration = '';
}

function paymentMethod(row: DataTableRow): PaymentMethod {
  return row as unknown as PaymentMethod;
}

function typeLabel(type: PaymentMethodType): string {
  if (type === 'cash') return 'Presencial';
  if (type === 'digital') return 'Digital';
  if (type === 'credit') return 'Crédito';
  return 'Recebível';
}

function integrationLabel(integration: PaymentMethodIntegration): string {
  if (integration === 'cash-drawer') return 'Gaveta';
  if (integration === 'pix') return 'PIX';
  if (integration === 'card-machine') return 'TEF/Maquininha';
  return 'Contas a Receber';
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
.payment-methods-page {
  display: grid;
  gap: 16px;
}

.payment-methods-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.payment-methods-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.payment-methods-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.payment-methods-page small {
  color: var(--color-text-secondary, #64748b);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .payment-methods-filters,
  .payment-methods-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .payment-methods-filters,
  .payment-methods-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

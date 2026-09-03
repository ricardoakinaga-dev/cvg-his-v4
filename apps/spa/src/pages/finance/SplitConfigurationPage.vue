<template>
  <div class="split-configuration-page">
    <AppPageHeader
      title="Configuração do Split"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Configuração do Split']"
      subtitle="Regras de split, recebedores, percentuais e repasse da maquininha"
      :secondary-actions="headerSecondaryActions"
    />

    <DsAlert variant="info">
      Configuração em modo somente leitura para validação operacional. Salvar, habilitar split e
      repasse real seguem bloqueados até integração de pagamentos.
    </DsAlert>

    <form
      class="split-configuration-filters"
      aria-label="Filtros da configuração do split"
      @submit.prevent
    >
      <DsInput id="split-configuration-unit" v-model="filters.unit" label="Unidade" type="select">
        <option value="">Todas</option>
        <option value="cvg">Centro Veterinário Guarapiranga</option>
        <option value="payments">CVG Pagamentos</option>
      </DsInput>
      <DsInput
        id="split-configuration-provider"
        v-model="filters.provider"
        label="Provedor"
        type="select"
      >
        <option value="">Todos</option>
        <option value="cvg-pay">CVG Pay</option>
      </DsInput>
      <DsInput
        id="split-configuration-status"
        v-model="filters.status"
        label="Status"
        type="select"
      >
        <option value="">Todos</option>
        <option value="active">Ativo</option>
        <option value="pending">Pronto para validar</option>
        <option value="inactive">Inativo</option>
      </DsInput>
      <DsInput id="split-configuration-search" v-model="filters.search" label="Pesquisar" />
    </form>

    <section class="split-configuration-summary-grid" aria-label="Resumo da configuração do split">
      <DsStatCard :label="`${visibleSplitRules.length} regra(s)`" value="Regras" />
      <DsStatCard :label="`${activeReceivers} ativo(s)`" value="Recebedores" />
      <DsStatCard :label="`${clinicShare}%`" value="Percentual CVG" />
      <DsStatCard label="D+1 planejado" value="Repasse" />
    </section>

    <section class="split-configuration-actions" aria-label="Ações da configuração do split">
      <DsButton variant="primary" disabled>Salvar Configuração</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/split/simulator"
        >Simulador de Split</DsButton
      >
      <DsButton variant="secondary" tag="a" to="/finance/split/export"
        >Exportador de Split</DsButton
      >
      <DsButton variant="secondary" tag="a" to="/finance/card-transactions"
        >Transações de Cartão</DsButton
      >
      <DsButton variant="ghost" type="button" @click="resetFilters">Atualizar</DsButton>
    </section>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      empty-icon="🧩"
      empty-title="Nenhuma regra de split encontrada"
      empty-description="Ajuste os filtros para visualizar recebedores e percentuais configurados."
      caption="Configuração do split da maquininha"
      variant="hoverable"
    >
      <template #cell-receiver="{ row }">
        <strong>{{ splitRule(row).receiver }}</strong>
        <small>{{ splitRule(row).document }}</small>
      </template>
      <template #cell-rule="{ row }">
        <strong>{{ splitRule(row).rule }}</strong>
        <small>{{ splitRule(row).settlement }}</small>
      </template>
      <template #cell-percentage="{ row }">
        <strong>{{ splitRule(row).percentage }}%</strong>
      </template>
      <template #cell-provider="{ row }">
        <span>{{ splitRule(row).providerLabel }}</span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="statusLabel(splitRule(row).status)"
          :variant="statusVariant(splitRule(row).status)"
        />
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="splitRule(row).openTo" class="open-link">Abrir</RouterLink>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { RouterLink } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type SplitStatus = 'active' | 'pending' | 'inactive';
type SplitStatusFilter = '' | SplitStatus;

interface SplitRule {
  id: string;
  unit: string;
  receiver: string;
  document: string;
  rule: string;
  settlement: string;
  percentage: number;
  provider: string;
  providerLabel: string;
  status: SplitStatus;
  openTo: string;
}

const columns: DataTableColumn[] = [
  { key: 'receiver', label: 'Recebedor' },
  { key: 'rule', label: 'Regra' },
  { key: 'percentage', label: 'Percentual' },
  { key: 'provider', label: 'Provedor' },
  { key: 'status', label: 'Status' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const splitRules: SplitRule[] = [
  {
    id: 'clinic-operational',
    unit: 'cvg',
    receiver: 'Centro Veterinário Guarapiranga',
    document: 'Conta operacional',
    rule: 'Conta operacional',
    settlement: 'Repasse D+1 para a unidade',
    percentage: 85,
    provider: 'cvg-pay',
    providerLabel: 'CVG Pay',
    status: 'active',
    openTo: '/finance/split/simulator'
  },
  {
    id: 'platform-fee',
    unit: 'payments',
    receiver: 'CVG Pagamentos',
    document: 'Recebedor plataforma',
    rule: 'Taxa/plataforma',
    settlement: 'Retenção administrativa',
    percentage: 15,
    provider: 'cvg-pay',
    providerLabel: 'CVG Pay',
    status: 'pending',
    openTo: '/finance/split/simulator'
  },
  {
    id: 'chargeback-reserve',
    unit: 'payments',
    receiver: 'Reserva de chargeback',
    document: 'Conta de retenção preventiva',
    rule: 'Retenção preventiva',
    settlement: 'Liberar após conciliação',
    percentage: 0,
    provider: 'cvg-pay',
    providerLabel: 'CVG Pay',
    status: 'inactive',
    openTo: '/finance/split/export'
  }
];

const filters = reactive({
  unit: '',
  provider: '',
  status: '' as SplitStatusFilter,
  search: ''
});

const visibleSplitRules = computed(() => splitRules.filter(matchesFilters));
const visibleRows = computed(() => visibleSplitRules.value as unknown as DataTableRow[]);
const activeReceivers = computed(
  () => splitRules.filter((rule) => rule.status === 'active').length
);
const clinicShare = computed(
  () => splitRules.find((rule) => rule.id === 'clinic-operational')?.percentage ?? 0
);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-split-configuration',
    label: 'Atualizar',
    variant: 'secondary' as const,
    onClick: resetFilters
  }
]);

function matchesFilters(rule: SplitRule): boolean {
  if (filters.unit && rule.unit !== filters.unit) return false;
  if (filters.provider && rule.provider !== filters.provider) return false;
  if (filters.status && rule.status !== filters.status) return false;
  const search = normalize(filters.search);
  if (!search) return true;
  return [
    rule.receiver,
    rule.document,
    rule.rule,
    rule.settlement,
    rule.providerLabel,
    statusLabel(rule.status)
  ].some((value) => normalize(value).includes(search));
}

function resetFilters() {
  filters.unit = '';
  filters.provider = '';
  filters.status = '';
  filters.search = '';
}

function splitRule(row: DataTableRow): SplitRule {
  return row as unknown as SplitRule;
}

function statusLabel(status: SplitStatus): string {
  if (status === 'active') return 'Ativo';
  if (status === 'pending') return 'Pronto para validar';
  return 'Inativo';
}

function statusVariant(status: SplitStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'neutral';
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
.split-configuration-page {
  display: grid;
  gap: 16px;
}

.split-configuration-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.split-configuration-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.split-configuration-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.open-link {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  color: var(--color-primary, #2563eb);
  font-weight: 700;
  text-decoration: none;
}

small {
  color: var(--color-text-muted, #64748b);
  display: block;
  margin-top: 2px;
}

@media (max-width: 1100px) {
  .split-configuration-filters,
  .split-configuration-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .split-configuration-filters,
  .split-configuration-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

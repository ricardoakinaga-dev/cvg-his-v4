<template>
  <div class="card-machines-page">
    <AppPageHeader
      title="Maquininhas"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Maquininhas']"
      subtitle="Terminais de cartão, provedores, unidades e status operacional"
      :secondary-actions="headerSecondaryActions"
    />

    <DsAlert variant="info">
      Cadastro em modo somente leitura para validação operacional. Ativar terminal, credenciar
      provedor e alterar domicílio bancário seguem bloqueados até integração de pagamentos.
    </DsAlert>

    <form class="card-machines-filters" aria-label="Filtros de maquininhas" @submit.prevent>
      <DsInput id="card-machines-unit" v-model="filters.unit" label="Unidade" type="select">
        <option value="">Todas</option>
        <option value="cvg">Centro Veterinário Guarapiranga</option>
        <option value="mobile">Atendimento externo</option>
      </DsInput>
      <DsInput
        id="card-machines-provider"
        v-model="filters.provider"
        label="Provedor"
        type="select"
      >
        <option value="">Todos</option>
        <option value="cvg-pay">CVG Pay</option>
        <option value="stone">Stone</option>
      </DsInput>
      <DsInput id="card-machines-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="active">Ativa</option>
        <option value="pending">Homologação</option>
        <option value="inactive">Inativa</option>
      </DsInput>
      <DsInput id="card-machines-search" v-model="filters.search" label="Pesquisar" />
    </form>

    <section class="card-machines-summary-grid" aria-label="Resumo de maquininhas">
      <DsStatCard :label="`${visibleMachines.length} terminal(is)`" value="Terminais" />
      <DsStatCard :label="`${activeMachines} ativa(s)`" value="Ativas" />
      <DsStatCard :label="`${providerCount} provedor(es)`" value="Provedores" />
      <DsStatCard :label="latestReconciliationLabel" value="Última Conciliação" />
    </section>

    <section class="card-machines-actions" aria-label="Ações de maquininhas">
      <DsButton variant="primary" disabled>Cadastrar Maquininha</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/split">Configuração do Split</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-transactions"
        >Transações de Cartão</DsButton
      >
      <DsButton variant="secondary" tag="a" to="/finance/payment-enablement"
        >Habilitar Pagamento</DsButton
      >
      <DsButton variant="ghost" type="button" @click="resetFilters">Atualizar</DsButton>
    </section>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      empty-icon="💳"
      empty-title="Nenhuma maquininha encontrada"
      empty-description="Ajuste os filtros para visualizar terminais, provedores e status."
      caption="Maquininhas de cartão"
      variant="hoverable"
    >
      <template #cell-machine="{ row }">
        <strong>{{ cardMachine(row).name }}</strong>
        <small>{{ cardMachine(row).channel }}</small>
      </template>
      <template #cell-serial="{ row }">
        <strong>{{ cardMachine(row).serial }}</strong>
        <small>{{ cardMachine(row).model }}</small>
      </template>
      <template #cell-unit="{ row }">
        <span>{{ cardMachine(row).unitLabel }}</span>
      </template>
      <template #cell-provider="{ row }">
        <strong>{{ cardMachine(row).providerLabel }}</strong>
        <small>{{ cardMachine(row).merchantId }}</small>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="statusLabel(cardMachine(row).status)"
          :variant="statusVariant(cardMachine(row).status)"
        />
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="cardMachine(row).openTo" class="open-link">Abrir</RouterLink>
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

type MachineStatus = 'active' | 'pending' | 'inactive';
type MachineStatusFilter = '' | MachineStatus;

interface CardMachine {
  id: string;
  name: string;
  serial: string;
  model: string;
  channel: string;
  unit: string;
  unitLabel: string;
  provider: string;
  providerLabel: string;
  merchantId: string;
  status: MachineStatus;
  lastReconciliation: string | null;
  openTo: string;
}

const columns: DataTableColumn[] = [
  { key: 'machine', label: 'Maquininha' },
  { key: 'serial', label: 'Serial' },
  { key: 'unit', label: 'Unidade' },
  { key: 'provider', label: 'Provedor' },
  { key: 'status', label: 'Status' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const machines: CardMachine[] = [
  {
    id: 'reception-pos',
    name: 'Maquininha Recepção',
    serial: 'CVG-POS-001',
    model: 'POS Smart',
    channel: 'Crédito e débito presencial',
    unit: 'cvg',
    unitLabel: 'Centro Veterinário Guarapiranga',
    provider: 'cvg-pay',
    providerLabel: 'CVG Pay',
    merchantId: 'MID-CVG-001',
    status: 'active',
    lastReconciliation: '2026-04-29T09:30:00.000Z',
    openTo: '/finance/card-transactions'
  },
  {
    id: 'clinic-pos',
    name: 'Maquininha Consultório',
    serial: 'CVG-POS-002',
    model: 'POS Compacta',
    channel: 'Crédito parcelado',
    unit: 'cvg',
    unitLabel: 'Centro Veterinário Guarapiranga',
    provider: 'cvg-pay',
    providerLabel: 'CVG Pay',
    merchantId: 'MID-CVG-002',
    status: 'pending',
    lastReconciliation: null,
    openTo: '/finance/payment-enablement'
  },
  {
    id: 'mobile-link',
    name: 'Link de Pagamento Externo',
    serial: 'LINK-CVG-001',
    model: 'Link remoto',
    channel: 'Pagamento por link',
    unit: 'mobile',
    unitLabel: 'Atendimento externo',
    provider: 'stone',
    providerLabel: 'Stone',
    merchantId: 'MID-EXT-001',
    status: 'inactive',
    lastReconciliation: '2026-04-26T12:00:00.000Z',
    openTo: '/finance/card-transactions'
  }
];

const filters = reactive({
  unit: '',
  provider: '',
  status: '' as MachineStatusFilter,
  search: ''
});

const visibleMachines = computed(() => machines.filter(matchesFilters));
const visibleRows = computed(() => visibleMachines.value as unknown as DataTableRow[]);
const activeMachines = computed(
  () => machines.filter((machine) => machine.status === 'active').length
);
const providerCount = computed(() => new Set(machines.map((machine) => machine.provider)).size);
const latestReconciliationLabel = computed(() => {
  const latest = machines
    .map((machine) => machine.lastReconciliation)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);
  return latest ? formatDate(latest) : 'Pendente';
});
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-card-machines',
    label: 'Atualizar',
    variant: 'secondary' as const,
    onClick: resetFilters
  }
]);

function matchesFilters(machine: CardMachine): boolean {
  if (filters.unit && machine.unit !== filters.unit) return false;
  if (filters.provider && machine.provider !== filters.provider) return false;
  if (filters.status && machine.status !== filters.status) return false;
  const search = normalize(filters.search);
  if (!search) return true;
  return [
    machine.name,
    machine.serial,
    machine.model,
    machine.channel,
    machine.unitLabel,
    machine.providerLabel,
    machine.merchantId,
    statusLabel(machine.status)
  ].some((value) => normalize(value).includes(search));
}

function resetFilters() {
  filters.unit = '';
  filters.provider = '';
  filters.status = '';
  filters.search = '';
}

function cardMachine(row: DataTableRow): CardMachine {
  return row as unknown as CardMachine;
}

function statusLabel(status: MachineStatus): string {
  if (status === 'active') return 'Ativa';
  if (status === 'pending') return 'Homologação';
  return 'Inativa';
}

function statusVariant(status: MachineStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
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
.card-machines-page {
  display: grid;
  gap: 16px;
}

.card-machines-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.card-machines-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.card-machines-actions {
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
  .card-machines-filters,
  .card-machines-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .card-machines-filters,
  .card-machines-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

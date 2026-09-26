<template>
  <details class="report-filter-disclosure">
    <summary>Filtros da consulta</summary>
    <section class="report-filters">
      <DsInput
        v-if="props.isDeletedSalesCounterSalesReport"
        id="cancellation-report-view"
        class="report-filter-mode"
        :model-value="props.cancellationReportView"
        type="select"
        label="Consultar"
        :disabled="props.loading || props.exporting"
        @update:model-value="emit('change-cancellation-view', $event)"
      >
        <option value="history">Histórico por data de cancelamento</option>
        <option value="opening-date">Canceladas por data de abertura</option>
      </DsInput>
      <DsInput
        :model-value="props.filters.dateFrom"
        type="date"
        :label="props.dateFromLabel"
        @update:model-value="updateFilter('dateFrom', $event)"
      />
      <DsInput
        :model-value="props.filters.dateTo"
        type="date"
        :label="props.dateToLabel"
        @update:model-value="updateFilter('dateTo', $event)"
      />
      <p v-if="props.inventoryPeriodHint" class="report-period-hint">{{ props.inventoryPeriodHint }}</p>
      <template v-if="props.isServiceInvoicesReport">
        <DsInput
          :model-value="props.filters.search"
          label="Cliente, serviço ou código"
          placeholder="Nome, documento ou código do serviço"
          :maxlength="200"
          @update:model-value="updateFilter('search', $event)"
        />
        <DsInput
          id="service-invoice-status"
          :model-value="props.filters.status"
          type="select"
          label="Status"
          @update:model-value="updateFilter('status', $event)"
        >
          <option value="">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="issued">Emitida</option>
          <option value="cancelled">Cancelada</option>
          <option value="error">Erro</option>
        </DsInput>
      </template>
      <template v-if="props.isAdvancePaymentsReport">
        <DsInput
          :model-value="props.filters.search"
          label="Cliente ou documento"
          placeholder="Nome ou documento do cliente"
          :maxlength="200"
          @update:model-value="updateFilter('search', $event)"
        />
        <DsInput
          id="advance-payment-status"
          :model-value="props.filters.status"
          type="select"
          label="Status"
          @update:model-value="updateFilter('status', $event)"
        >
          <option value="">Todos os status</option>
          <option value="available">Disponível</option>
          <option value="partially_compensated">Parcialmente compensado</option>
          <option value="compensated">Compensado</option>
        </DsInput>
      </template>
      <template v-if="props.isAppointmentsReport">
        <DsInput
          :model-value="props.filters.search"
          label="ID ou texto do agendamento"
          placeholder="ID, motivo, unidade ou especialidade"
          :maxlength="200"
          @update:model-value="updateFilter('search', $event)"
        />
        <DsInput
          id="appointment-report-status"
          :model-value="props.filters.status"
          type="select"
          label="Status"
          @update:model-value="updateFilter('status', $event)"
        >
          <option value="">Todos os status</option>
          <option value="scheduled">Agendado</option>
          <option value="checked_in">Check-in</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </DsInput>
      </template>
      <template v-if="props.isDeletedSalesCounterSalesReport">
        <DsInput
          :model-value="props.filters.search"
          :label="
            props.isCancellationHistoryReport
              ? 'Número, motivo ou responsável'
              : 'Número ou observação'
          "
          :placeholder="
            props.isCancellationHistoryReport
              ? 'Número da comanda, motivo ou ID do responsável'
              : 'Número da comanda ou texto da observação'
          "
          :maxlength="200"
          @update:model-value="updateFilter('search', $event)"
        />
      </template>
      <template
        v-if="
          props.isInventoryMovementsReport ||
          props.isInventoryProductsReport ||
          props.isInventoryStockReport
        "
      >
        <DsInput
          :model-value="props.filters.search"
          label="Código ou produto"
          placeholder="SKU ou nome do produto"
          :maxlength="200"
          @update:model-value="updateFilter('search', $event)"
        />
      </template>
      <template v-if="props.isInventoryInvoicesReport">
        <DsInput
          :model-value="props.filters.search"
          label="Fornecedor ou referência NF"
          placeholder="Fornecedor ou referência armazenada"
          :maxlength="200"
          @update:model-value="updateFilter('search', $event)"
        />
        <DsInput
          id="inventory-invoice-status"
          :model-value="props.filters.status"
          type="select"
          label="Status"
          @update:model-value="updateFilter('status', $event)"
        >
          <option value="">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="approved">Aprovada</option>
          <option value="partially_received">Parcialmente recebida</option>
          <option value="received">Recebida</option>
          <option value="cancelled">Cancelada</option>
        </DsInput>
      </template>
      <template v-if="props.isAuditAppointments">
        <DsInput
          :model-value="props.filters.client"
          label="Cliente"
          placeholder="Nome, animal ou id do agendamento"
          @update:model-value="updateFilter('client', $event)"
        />
        <DsInput
          :model-value="props.filters.user"
          label="Usuário"
          placeholder="Usuário ou ator auditado"
          @update:model-value="updateFilter('user', $event)"
        />
        <label class="report-field">
          <span>Ação</span>
          <select
            :value="props.filters.action"
            @change="updateFilter('action', selectValue($event))"
          >
            <option value="">Selecione a ação</option>
            <option v-for="action in props.auditActionOptions" :key="action" :value="action">
              {{ action }}
            </option>
          </select>
        </label>
        <label class="report-field">
          <span>Tipo</span>
          <select :value="props.filters.type" @change="updateFilter('type', selectValue($event))">
            <option value="">Selecione os tipos</option>
            <option v-for="type in props.auditTypeOptions" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
        </label>
      </template>
      <div class="report-filters__actions">
        <DsButton variant="primary" :loading="props.loading" @click="emit('apply')">
          Aplicar
        </DsButton>
        <DsButton variant="ghost" @click="emit('reset')">Limpar</DsButton>
      </div>
    </section>
  </details>
</template>

<script setup lang="ts">
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

type FilterKey =
  | 'dateFrom'
  | 'dateTo'
  | 'search'
  | 'status'
  | 'client'
  | 'user'
  | 'action'
  | 'type';

type ReportFilterValues = Record<FilterKey, string>;

const props = defineProps<{
  filters: ReportFilterValues;
  loading: boolean;
  exporting: boolean;
  cancellationReportView: string;
  dateFromLabel: string;
  dateToLabel: string;
  inventoryPeriodHint: string | null;
  isDeletedSalesCounterSalesReport: boolean;
  isCancellationHistoryReport: boolean;
  isServiceInvoicesReport: boolean;
  isAdvancePaymentsReport: boolean;
  isAppointmentsReport: boolean;
  isInventoryMovementsReport: boolean;
  isInventoryProductsReport: boolean;
  isInventoryStockReport: boolean;
  isInventoryInvoicesReport: boolean;
  isAuditAppointments: boolean;
  auditActionOptions: string[];
  auditTypeOptions: string[];
}>();

const emit = defineEmits<{
  (event: 'update-filter', key: FilterKey, value: string): void;
  (event: 'change-cancellation-view', value: string | number): void;
  (event: 'apply'): void;
  (event: 'reset'): void;
}>();

function updateFilter(key: FilterKey, value: string | number): void {
  emit('update-filter', key, String(value));
}

function selectValue(event: Event): string {
  return (event.target as HTMLSelectElement).value;
}
</script>

<style scoped>
.report-filter-disclosure {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 0 16px 12px;
}

.report-filter-disclosure summary {
  display: flex;
  align-items: center;
  min-height: 44px;
  font-weight: 600;
  cursor: pointer;
}

.report-filter-disclosure summary::before {
  content: '▸';
  margin-right: 8px;
}

.report-filter-disclosure[open] > summary::before {
  content: '▾';
}

.report-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
  gap: 12px;
  align-items: end;
  width: 100%;
}

.report-filters__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.report-filter-mode {
  grid-column: 1 / -1;
}

.report-period-hint {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.report-field {
  display: grid;
  gap: 6px;
}

.report-field span {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.report-field select {
  min-height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
}
</style>

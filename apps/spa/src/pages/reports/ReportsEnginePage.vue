<template>
  <div class="reports-engine-page">
    <AppPageHeader
      title="Motor Enterprise de Relatórios"
      :breadcrumbs="['Relatórios', 'Motor Enterprise']"
      subtitle="Execução, exportação e agendamento auditável dos relatórios operacionais premium"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" to="/reports">Visão por domínio</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      O motor enterprise usa o catálogo real de relatórios do backend, registra execuções e prepara
      exportações ou agendamentos sem depender das telas estáticas do workbench legado.
    </DsAlert>

    <DsCard
      v-if="originHref && selectedDeliverySchedule"
      title="Agendamento aberto pela auditoria"
      variant="compact"
    >
      <div class="reports-engine-page__origin-context">
        <div>
          <strong>{{ selectedDeliverySchedule.name }}</strong>
          <span
            >{{ selectedDeliverySchedule.reportId }} ·
            {{ selectedDeliverySchedule.recipients.length }} destinatário(s)</span
          >
        </div>
        <DsButton tag="a" :to="originHref" variant="secondary">{{ originLabel }}</DsButton>
      </div>
    </DsCard>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="success" variant="success" dismissible @dismiss="success = ''">
      {{ success }}
    </DsAlert>

    <section class="reports-engine-page__kpis">
      <DsStatCard label="Relatórios no catálogo" :value="formatInteger(catalog.length)" icon="📚" />
      <DsStatCard
        label="Execuções registradas"
        :value="formatInteger(executions.length)"
        icon="🧮"
      />
      <DsStatCard label="Execuções com dados" :value="formatInteger(filledExecutions)" icon="📈" />
      <DsStatCard label="Execuções vazias" :value="formatInteger(emptyExecutions)" icon="∅" />
      <DsStatCard label="Agendamentos ativos" :value="formatInteger(activeSchedules)" icon="⏱️" />
      <button
        class="reports-engine-page__kpi-action"
        type="button"
        :disabled="failedSchedules === 0"
        aria-label="Filtrar agendamentos com falha"
        @click="scheduleFilter = 'failed'"
      >
        <DsStatCard
          label="Agendamentos com falha"
          :value="formatInteger(failedSchedules)"
          icon="⚠️"
        />
      </button>
    </section>

    <DsCard title="Executar relatório">
      <div class="reports-engine-page__form-grid">
        <DsInput id="report-definition" v-model="selectedReportId" type="select" label="Relatório">
          <option value="">Selecione um relatório</option>
          <option v-for="definition in catalog" :key="definition.id" :value="definition.id">
            {{ definition.title }}
          </option>
        </DsInput>

        <DsInput
          v-if="selectedDefinition?.filterSchema.dateFrom"
          id="report-date-from"
          v-model="filters.dateFrom"
          type="date"
          label="Data inicial"
        />

        <DsInput
          v-if="selectedDefinition?.filterSchema.dateTo"
          id="report-date-to"
          v-model="filters.dateTo"
          type="date"
          label="Data final"
        />

        <DsInput
          v-if="selectedDefinition?.filterSchema.status"
          id="report-status"
          v-model="filters.status"
          label="Situação"
          placeholder="Ex.: draft, reviewed, paid"
        />
      </div>

      <div class="reports-engine-page__actions">
        <DsButton
          variant="primary"
          :loading="executing"
          :disabled="!selectedReportId"
          @click="executeReport"
        >
          Executar
        </DsButton>
        <DsButton
          variant="secondary"
          :loading="exporting === 'csv'"
          :disabled="!selectedExecution"
          @click="exportReport('csv')"
        >
          Exportar CSV
        </DsButton>
        <DsButton
          variant="secondary"
          :loading="exporting === 'json'"
          :disabled="!selectedExecution"
          @click="exportReport('json')"
        >
          Exportar JSON
        </DsButton>
        <DsButton
          variant="secondary"
          :loading="exporting === 'xlsx'"
          :disabled="!selectedExecution"
          @click="exportReport('xlsx')"
        >
          Exportar XLSX
        </DsButton>
        <DsButton
          variant="secondary"
          :loading="exporting === 'pdf'"
          :disabled="!selectedExecution"
          @click="exportReport('pdf')"
        >
          Exportar PDF
        </DsButton>
      </div>
    </DsCard>

    <DsCard title="Agendar recorrência">
      <div class="reports-engine-page__form-grid">
        <DsInput id="schedule-name" v-model="scheduleName" label="Nome do agendamento" />
        <DsInput
          id="schedule-frequency"
          v-model="scheduleFrequency"
          type="select"
          label="Frequência"
        >
          <option value="daily">Diária</option>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensal</option>
        </DsInput>
        <DsInput id="schedule-format" v-model="scheduleFormat" type="select" label="Formato">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="xlsx">XLSX</option>
          <option value="pdf">PDF</option>
        </DsInput>
        <DsInput
          id="schedule-recipients"
          v-model="scheduleRecipients"
          label="Destinatários"
          placeholder="financeiro@clinica.com, diretoria@clinica.com"
        />
      </div>

      <div class="reports-engine-page__actions">
        <DsButton
          variant="secondary"
          :loading="scheduling"
          :disabled="!selectedReportId"
          @click="createSchedule"
        >
          Agendar relatório
        </DsButton>
      </div>
    </DsCard>

    <DsCard title="Resultado da execução">
      <DataTable
        :columns="executionColumns"
        :rows="executionRows"
        :loading="executing"
        empty-icon="📊"
        empty-title="Nenhuma execução carregada"
        empty-description="Selecione um relatório e execute para visualizar as linhas retornadas pelo motor enterprise."
        variant="hoverable"
      >
        <template
          v-for="column in selectedExecution?.columns ?? []"
          #[`cell-${column.key}`]="{ value }"
          :key="column.key"
        >
          {{ formatCell(value, column.type) }}
        </template>
      </DataTable>
    </DsCard>

    <section class="reports-engine-page__split">
      <DsCard title="Catálogo disponível">
        <DataTable
          :columns="catalogColumns"
          :rows="catalogRows"
          :loading="loading"
          empty-icon="📚"
          empty-title="Nenhum relatório disponível"
          empty-description="O catálogo será exibido quando a API retornar definições de relatórios."
          compact
        />
      </DsCard>

      <DsCard title="Agendamentos">
        <div class="reports-engine-page__schedule-toolbar">
          <span v-if="scheduleFilter === 'failed'" class="reports-engine-page__filter-status">
            Filtro ativo: somente agendamentos com falha
          </span>
          <span v-else class="reports-engine-page__filter-status">
            Exibindo todos os agendamentos
          </span>
          <DsButton
            v-if="scheduleFilter !== 'all'"
            size="sm"
            variant="ghost"
            type="button"
            @click="scheduleFilter = 'all'"
          >
            Limpar filtro
          </DsButton>
        </div>
        <DataTable
          :columns="scheduleColumns"
          :rows="scheduleRows"
          :loading="loading"
          empty-icon="⏱️"
          empty-title="Nenhum agendamento criado"
          empty-description="Use a recorrência para automatizar entregas premium por e-mail."
          compact
        >
          <template #cell-status="{ row }">
            <StatusBadge
              :label="String(row.status)"
              :variant="row.active ? 'success' : 'warning'"
              size="sm"
            />
            <StatusBadge
              v-if="row.hasError"
              label="Falha no último envio"
              variant="danger"
              size="sm"
            />
          </template>
          <template #cell-lastError="{ row }">
            <span :class="{ 'reports-engine-page__schedule-error': row.hasError }">
              {{ row.lastError }}
            </span>
          </template>
          <template #cell-actions="{ row }">
            <DsButton size="sm" variant="secondary" @click="toggleSchedule(row.id as string)">
              {{ row.active ? 'Pausar' : 'Reativar' }}
            </DsButton>
            <DsButton
              size="sm"
              variant="ghost"
              :loading="loadingDeliveries === row.id"
              @click="loadDeliveries(row.id as string)"
            >
              Entregas
            </DsButton>
          </template>
        </DataTable>
      </DsCard>
    </section>

    <DsCard title="Histórico de entregas">
      <p class="reports-engine-page__delivery-context">
        {{
          selectedDeliveryScheduleName ||
          'Selecione um agendamento para consultar entregas por destinatário.'
        }}
      </p>
      <div class="reports-engine-page__delivery-filters">
        <DsInput
          id="delivery-status-filter"
          v-model="deliveryFilters.status"
          type="select"
          label="Status"
        >
          <option value="all">Todos</option>
          <option value="sent">Enviados</option>
          <option value="failed">Falhados</option>
        </DsInput>
        <DsInput
          id="delivery-date-from"
          v-model="deliveryFilters.dateFrom"
          type="date"
          label="De"
        />
        <DsInput id="delivery-date-to" v-model="deliveryFilters.dateTo" type="date" label="Até" />
        <DsButton variant="ghost" type="button" @click="clearDeliveryFilters"
          >Limpar filtros</DsButton
        >
        <DsButton
          variant="secondary"
          type="button"
          :disabled="retryableFilteredDeliveries.length === 0"
          :loading="retryingFilteredDeliveries"
          @click="retryFilteredFailedDeliveries"
        >
          Reprocessar falhas filtradas
        </DsButton>
      </div>
      <div class="reports-engine-page__delivery-summary" aria-label="Resumo de entregas filtradas">
        <DsStatCard
          label="entregas no filtro"
          :value="formatInteger(filteredDeliveryCount)"
          icon="📬"
        />
        <DsStatCard label="enviado(s)" :value="formatInteger(sentDeliveryCount)" icon="✅" />
        <DsStatCard label="falhado(s)" :value="formatInteger(failedDeliveryCount)" icon="⚠️" />
      </div>
      <section
        class="reports-engine-page__failed-recipients"
        aria-label="Falhas recorrentes por destinatário"
      >
        <h4 class="reports-engine-page__section-title">Falhas recorrentes por destinatário</h4>
        <DataTable
          :columns="failedRecipientColumns"
          :rows="failedRecipientRows"
          empty-icon="✅"
          empty-title="Nenhum destinatário com falha no filtro"
          empty-description="A análise acompanha os filtros ativos do histórico."
          compact
        />
      </section>
      <section class="reports-engine-page__failed-recipients" aria-label="Alertas operacionais">
        <h4 class="reports-engine-page__section-title">Alertas operacionais</h4>
        <DataTable
          :columns="deliveryAlertColumns"
          :rows="deliveryAlertRows"
          empty-icon="✅"
          empty-title="Nenhum alerta operacional"
          empty-description="Alertas aparecem quando o backend identifica falhas recorrentes por destinatário."
          compact
        >
          <template #cell-severity="{ row }">
            <StatusBadge
              :label="String(row.severity)"
              :variant="row.severity === 'Alta' ? 'danger' : 'warning'"
              size="sm"
            />
          </template>
          <template #cell-actions="{ row }">
            <DsButton
              size="sm"
              variant="secondary"
              :disabled="retryableDeliveriesForRecipient(String(row.recipient)).length === 0"
              :loading="retryingAlertRecipient === row.recipient"
              @click="retryDeliveryAlert(String(row.recipient))"
            >
              Reprocessar alerta
            </DsButton>
          </template>
        </DataTable>
      </section>
      <DataTable
        :columns="deliveryColumns"
        :rows="deliveryRows"
        :loading="Boolean(loadingDeliveries)"
        empty-icon="📬"
        empty-title="Nenhuma entrega registrada"
        empty-description="As entregas por destinatário aparecem após o worker processar um relatório agendado."
        compact
      >
        <template #cell-status="{ row }">
          <StatusBadge
            :label="String(row.status)"
            :variant="row.status === 'Enviado' ? 'success' : 'danger'"
            size="sm"
          />
        </template>
        <template #cell-error="{ row }">
          <span :class="{ 'reports-engine-page__schedule-error': row.error !== 'Sem erro' }">
            {{ row.error }}
          </span>
        </template>
        <template #cell-actions="{ row }">
          <DsButton
            v-if="row.rawStatus === 'failed'"
            size="sm"
            variant="secondary"
            :loading="retryingDelivery === row.id"
            @click="retryDelivery(row.id as string)"
          >
            Reprocessar
          </DsButton>
        </template>
      </DataTable>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import { saveBrowserDownload, withDownloadTimeout } from '@/services/download';
import {
  reportsService,
  type ReportColumnType,
  type ReportDefinition,
  type ReportExecutionDetail,
  type ReportExecutionSummary,
  type ReportFormat,
  type ReportScheduleDeliveryAlertSummary,
  type ReportScheduleDeliverySummary,
  type ReportScheduleFrequency,
  type ReportScheduleSummary
} from '@/services/reports';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  status: string;
}

interface DeliveryFilters {
  status: 'all' | 'sent' | 'failed';
  dateFrom: string;
  dateTo: string;
}

const route = useRoute();
const loading = ref(false);
const executing = ref(false);
const scheduling = ref(false);
const exporting = ref<ReportFormat | ''>('');
const error = ref('');
const success = ref('');
const catalog = ref<ReportDefinition[]>([]);
const executions = ref<ReportExecutionSummary[]>([]);
const schedules = ref<ReportScheduleSummary[]>([]);
const deliveries = ref<ReportScheduleDeliverySummary[]>([]);
const deliveryAlerts = ref<ReportScheduleDeliveryAlertSummary[]>([]);
const selectedReportId = ref('');
const selectedExecution = ref<ReportExecutionDetail | null>(null);
const selectedDeliveryScheduleId = ref('');
const loadingDeliveries = ref('');
const retryingDelivery = ref('');
const retryingFilteredDeliveries = ref(false);
const retryingAlertRecipient = ref('');
const scheduleName = ref('');
const scheduleFrequency = ref<ReportScheduleFrequency>('weekly');
const scheduleFormat = ref<ReportFormat>('csv');
const scheduleRecipients = ref('');
const scheduleFilter = ref<'all' | 'failed'>('all');
const filters = reactive<ReportFilters>({
  dateFrom: toDateInputValue(addDays(new Date(), -30)),
  dateTo: toDateInputValue(new Date()),
  status: ''
});
const deliveryFilters = reactive<DeliveryFilters>({
  status: 'all',
  dateFrom: '',
  dateTo: ''
});

const catalogColumns: DataTableColumn[] = [
  { key: 'title', label: 'Relatório' },
  { key: 'category', label: 'Categoria' },
  { key: 'formats', label: 'Formatos' }
];
const scheduleColumns: DataTableColumn[] = [
  { key: 'name', label: 'Nome' },
  { key: 'report', label: 'Relatório' },
  { key: 'status', label: 'Status' },
  { key: 'frequency', label: 'Frequência' },
  { key: 'nextRunAt', label: 'Próxima execução' },
  { key: 'lastRunAt', label: 'Última execução' },
  { key: 'lastError', label: 'Última falha' },
  { key: 'recipients', label: 'Destinatários' },
  { key: 'format', label: 'Formato' },
  { key: 'actions', label: 'Ações' }
];
const deliveryColumns: DataTableColumn[] = [
  { key: 'recipient', label: 'Destinatário' },
  { key: 'status', label: 'Status' },
  { key: 'format', label: 'Formato' },
  { key: 'deliveredAt', label: 'Entregue em' },
  { key: 'executionId', label: 'Execução' },
  { key: 'error', label: 'Erro' },
  { key: 'actions', label: 'Ações' }
];
const failedRecipientColumns: DataTableColumn[] = [
  { key: 'recipient', label: 'Destinatário' },
  { key: 'failures', label: 'Falhas' },
  { key: 'lastFailureAt', label: 'Última falha' },
  { key: 'lastError', label: 'Último erro' }
];
const deliveryAlertColumns: DataTableColumn[] = [
  { key: 'recipient', label: 'Destinatário' },
  { key: 'failureCount', label: 'Falhas' },
  { key: 'lastFailureAt', label: 'Última falha' },
  { key: 'lastError', label: 'Último erro' },
  { key: 'severity', label: 'Severidade' },
  { key: 'actions', label: 'Ações' }
];

const selectedDefinition = computed(
  () => catalog.value.find((definition) => definition.id === selectedReportId.value) ?? null
);
const activeSchedules = computed(
  () => schedules.value.filter((schedule) => schedule.isActive).length
);
const failedSchedules = computed(
  () => schedules.value.filter((schedule) => Boolean(schedule.lastError)).length
);
const filledExecutions = computed(
  () => executions.value.filter((execution) => execution.rowCount > 0).length
);
const emptyExecutions = computed(
  () => executions.value.filter((execution) => execution.rowCount === 0).length
);
const executionColumns = computed<DataTableColumn[]>(() => {
  const columns = selectedExecution.value?.columns ?? selectedDefinition.value?.columns ?? [];
  return columns.map((column) => ({ key: column.key, label: column.label }));
});
const executionRows = computed<DataTableRow[]>(() =>
  (selectedExecution.value?.rows ?? []).map((row, index) => ({
    id: `${selectedExecution.value?.id ?? 'execution'}-${index}`,
    ...row
  }))
);
const catalogRows = computed<DataTableRow[]>(() =>
  catalog.value.map((definition) => ({
    id: definition.id,
    title: definition.title,
    category: categoryLabel(definition.category),
    formats: definition.supportedFormats.join(', ').toUpperCase()
  }))
);
const scheduleRows = computed<DataTableRow[]>(() =>
  filteredSchedules.value.map((schedule) => ({
    id: schedule.id,
    name: schedule.name,
    report:
      catalog.value.find((definition) => definition.id === schedule.reportId)?.title ??
      schedule.reportId,
    active: schedule.isActive,
    hasError: Boolean(schedule.lastError),
    status: schedule.isActive ? 'Ativo' : 'Pausado',
    frequency: frequencyLabel(schedule.frequency),
    nextRunAt: formatDate(schedule.nextRunAt),
    lastRunAt: schedule.lastRunAt ? formatDate(schedule.lastRunAt) : 'Ainda não executado',
    lastError: schedule.lastError ?? 'Sem falha registrada',
    recipients: `${schedule.recipients.length.toLocaleString('pt-BR')} destinatário(s)`,
    format: schedule.format.toUpperCase()
  }))
);
const filteredSchedules = computed(() => {
  if (scheduleFilter.value === 'failed') {
    return schedules.value.filter((schedule) => Boolean(schedule.lastError));
  }

  return schedules.value;
});
const selectedDeliveryScheduleName = computed(() => {
  if (!selectedDeliveryScheduleId.value) return '';
  const schedule = schedules.value.find((item) => item.id === selectedDeliveryScheduleId.value);
  return schedule ? `Entregas de ${schedule.name}` : '';
});
const selectedDeliverySchedule = computed(() => {
  if (!selectedDeliveryScheduleId.value) return null;
  return schedules.value.find((item) => item.id === selectedDeliveryScheduleId.value) ?? null;
});
const originHref = computed(() =>
  typeof route?.query?.origin === 'string' ? route.query.origin : ''
);
const originLabel = computed(() =>
  typeof route?.query?.originLabel === 'string' ? route.query.originLabel : 'Voltar para origem'
);
const deliveryRows = computed<DataTableRow[]>(() =>
  filteredDeliveries.value.map((delivery) => ({
    id: delivery.id,
    recipient: delivery.recipient,
    rawStatus: delivery.status,
    status: delivery.status === 'sent' ? 'Enviado' : 'Falhou',
    format: delivery.format.toUpperCase(),
    deliveredAt: formatDate(delivery.deliveredAt),
    executionId: delivery.executionId ?? 'Sem execução',
    error: delivery.error ?? 'Sem erro'
  }))
);
const filteredDeliveries = computed(() =>
  deliveries.value.filter((delivery) => {
    if (deliveryFilters.status !== 'all' && delivery.status !== deliveryFilters.status)
      return false;
    if (deliveryFilters.dateFrom && delivery.deliveredAt.slice(0, 10) < deliveryFilters.dateFrom)
      return false;
    if (deliveryFilters.dateTo && delivery.deliveredAt.slice(0, 10) > deliveryFilters.dateTo)
      return false;
    return true;
  })
);
const filteredDeliveryCount = computed(() => filteredDeliveries.value.length);
const sentDeliveryCount = computed(
  () => filteredDeliveries.value.filter((delivery) => delivery.status === 'sent').length
);
const failedDeliveryCount = computed(
  () => filteredDeliveries.value.filter((delivery) => delivery.status === 'failed').length
);
const retryableFilteredDeliveries = computed(() =>
  filteredDeliveries.value.filter(
    (delivery) => delivery.status === 'failed' && Boolean(delivery.executionId)
  )
);
const failedRecipientRows = computed<DataTableRow[]>(() => {
  const byRecipient = new Map<
    string,
    { failures: number; lastFailureAt: string; lastError: string }
  >();

  for (const delivery of filteredDeliveries.value) {
    if (delivery.status !== 'failed') continue;

    const current = byRecipient.get(delivery.recipient);
    if (!current) {
      byRecipient.set(delivery.recipient, {
        failures: 1,
        lastFailureAt: delivery.deliveredAt,
        lastError: delivery.error ?? 'Sem erro registrado'
      });
      continue;
    }

    const isMoreRecent = delivery.deliveredAt > current.lastFailureAt;
    byRecipient.set(delivery.recipient, {
      failures: current.failures + 1,
      lastFailureAt: isMoreRecent ? delivery.deliveredAt : current.lastFailureAt,
      lastError: isMoreRecent ? (delivery.error ?? 'Sem erro registrado') : current.lastError
    });
  }

  return [...byRecipient.entries()]
    .map(([recipient, summary]) => ({
      id: recipient,
      recipient,
      failures: `${formatInteger(summary.failures)} falha(s)`,
      lastFailureAt: formatDate(summary.lastFailureAt),
      lastError: summary.lastError
    }))
    .sort((left, right) => {
      const failureOrder =
        Number(String(right.failures).split(' ')[0]) - Number(String(left.failures).split(' ')[0]);
      return failureOrder || String(left.recipient).localeCompare(String(right.recipient), 'pt-BR');
    });
});
const deliveryAlertRows = computed<DataTableRow[]>(() =>
  deliveryAlerts.value.map((alert) => ({
    id: alert.id,
    recipient: alert.recipient,
    failureCount: `${formatInteger(alert.failureCount)} falha(s)`,
    lastFailureAt: formatDate(alert.lastFailureAt),
    lastError: alert.lastError,
    severity: alert.severity === 'high' ? 'Alta' : 'Média'
  }))
);

watch(selectedDefinition, (definition) => {
  if (!definition) {
    scheduleName.value = '';
    return;
  }

  scheduleName.value = scheduleName.value || `${definition.title} recorrente`;
});

onMounted(loadData);

async function loadData(): Promise<void> {
  loading.value = true;
  error.value = '';

  try {
    const [catalogResult, executionsResult, schedulesResult] = await Promise.all([
      reportsService.listCatalog(),
      reportsService.listExecutions(),
      reportsService.listSchedules()
    ]);
    catalog.value = catalogResult;
    executions.value = executionsResult;
    schedules.value = schedulesResult;
    selectedReportId.value = selectedReportId.value || catalogResult[0]?.id || '';
    const routeScheduleId =
      typeof route?.query?.scheduleId === 'string' ? route.query.scheduleId : '';
    if (routeScheduleId && schedulesResult.some((schedule) => schedule.id === routeScheduleId)) {
      await loadDeliveries(routeScheduleId);
    }
  } catch (err) {
    error.value = errorMessage(err, 'Não foi possível carregar o motor de relatórios.');
  } finally {
    loading.value = false;
  }
}

async function executeReport(): Promise<void> {
  if (!selectedReportId.value) return;

  executing.value = true;
  error.value = '';
  success.value = '';

  try {
    const execution = await reportsService.execute({
      reportId: selectedReportId.value,
      filters: buildFilters()
    });
    selectedExecution.value = execution;
    executions.value = [
      toExecutionSummary(execution),
      ...executions.value.filter((item) => item.id !== execution.id)
    ];
    success.value = `Relatório executado com ${execution.rowCount} linha(s).`;
  } catch (err) {
    error.value = errorMessage(err, 'Não foi possível executar o relatório.');
  } finally {
    executing.value = false;
  }
}

async function exportReport(format: ReportFormat): Promise<void> {
  if (!selectedExecution.value) return;

  exporting.value = format;
  error.value = '';
  success.value = '';

  try {
    const exported = await withDownloadTimeout(() =>
      reportsService.exportExecution(selectedExecution.value!.id, format)
    );
    saveBrowserDownload(exported);
    success.value = `Exportação gerada: ${exported.filename}.`;
  } catch (err) {
    error.value = errorMessage(err, 'Não foi possível exportar a execução.');
  } finally {
    exporting.value = '';
  }
}

async function createSchedule(): Promise<void> {
  if (!selectedReportId.value) return;

  scheduling.value = true;
  error.value = '';
  success.value = '';

  try {
    const schedule = await reportsService.createSchedule({
      reportId: selectedReportId.value,
      filters: buildFilters(),
      name:
        scheduleName.value.trim() || `${selectedDefinition.value?.title ?? 'Relatório'} recorrente`,
      frequency: scheduleFrequency.value,
      format: scheduleFormat.value,
      recipients: scheduleRecipients.value
        .split(',')
        .map((recipient) => recipient.trim())
        .filter(Boolean)
    });
    schedules.value = [schedule, ...schedules.value.filter((item) => item.id !== schedule.id)];
    success.value = `Agendamento ${schedule.name} criado.`;
  } catch (err) {
    error.value = errorMessage(err, 'Não foi possível criar o agendamento.');
  } finally {
    scheduling.value = false;
  }
}

async function toggleSchedule(scheduleId: string): Promise<void> {
  const schedule = schedules.value.find((item) => item.id === scheduleId);
  if (!schedule) return;

  error.value = '';
  success.value = '';

  try {
    const updated = await reportsService.updateSchedule(schedule.id, {
      isActive: !schedule.isActive
    });
    schedules.value = schedules.value.map((item) => (item.id === updated.id ? updated : item));
    success.value = `Agendamento ${updated.name} ${updated.isActive ? 'reativado' : 'pausado'}.`;
  } catch (err) {
    error.value = errorMessage(err, 'Não foi possível atualizar o agendamento.');
  }
}

async function loadDeliveries(scheduleId: string): Promise<void> {
  loadingDeliveries.value = scheduleId;
  error.value = '';

  try {
    const [deliveryResult, alertResult] = await Promise.all([
      reportsService.listScheduleDeliveries(scheduleId),
      reportsService.listScheduleDeliveryAlerts(scheduleId)
    ]);
    deliveries.value = deliveryResult;
    deliveryAlerts.value = alertResult;
    selectedDeliveryScheduleId.value = scheduleId;
  } catch (err) {
    error.value = errorMessage(err, 'Não foi possível carregar o histórico de entregas.');
  } finally {
    loadingDeliveries.value = '';
  }
}

async function retryDelivery(deliveryId: string): Promise<void> {
  if (!selectedDeliveryScheduleId.value) return;

  retryingDelivery.value = deliveryId;
  error.value = '';
  success.value = '';

  try {
    const delivery = await reportsService.retryScheduleDelivery(
      selectedDeliveryScheduleId.value,
      deliveryId
    );
    deliveries.value = [delivery, ...deliveries.value.filter((item) => item.id !== delivery.id)];
    success.value = `Entrega reprocessada para ${delivery.recipient}.`;
  } catch (err) {
    error.value = errorMessage(err, 'Não foi possível reprocessar a entrega.');
  } finally {
    retryingDelivery.value = '';
  }
}

async function retryFilteredFailedDeliveries(): Promise<void> {
  if (!selectedDeliveryScheduleId.value || retryableFilteredDeliveries.value.length === 0) return;

  retryingFilteredDeliveries.value = true;
  error.value = '';
  success.value = '';

  try {
    const retried = await Promise.all(
      retryableFilteredDeliveries.value.map((delivery) =>
        reportsService.retryScheduleDelivery(selectedDeliveryScheduleId.value, delivery.id)
      )
    );
    const retriedIds = new Set(retried.map((delivery) => delivery.id));
    deliveries.value = [
      ...retried,
      ...deliveries.value.filter((delivery) => !retriedIds.has(delivery.id))
    ];
    success.value = `${retried.length} entrega(s) reprocessada(s).`;
  } catch (err) {
    error.value = errorMessage(err, 'Não foi possível reprocessar as entregas filtradas.');
  } finally {
    retryingFilteredDeliveries.value = false;
  }
}

async function retryDeliveryAlert(recipient: string): Promise<void> {
  if (!selectedDeliveryScheduleId.value) return;
  const targets = retryableDeliveriesForRecipient(recipient);
  if (targets.length === 0) return;

  retryingAlertRecipient.value = recipient;
  error.value = '';
  success.value = '';

  try {
    const retried = await Promise.all(
      targets.map((delivery) =>
        reportsService.retryScheduleDelivery(selectedDeliveryScheduleId.value, delivery.id)
      )
    );
    const retriedIds = new Set(retried.map((delivery) => delivery.id));
    deliveries.value = [
      ...retried,
      ...deliveries.value.filter((delivery) => !retriedIds.has(delivery.id))
    ];
    success.value = `${retried.length} entrega(s) do alerta ${recipient} reprocessada(s).`;
  } catch (err) {
    error.value = errorMessage(err, 'Não foi possível reprocessar as entregas do alerta.');
  } finally {
    retryingAlertRecipient.value = '';
  }
}

function retryableDeliveriesForRecipient(recipient: string): ReportScheduleDeliverySummary[] {
  return deliveries.value.filter(
    (delivery) =>
      delivery.recipient === recipient &&
      delivery.status === 'failed' &&
      Boolean(delivery.executionId)
  );
}

function clearDeliveryFilters(): void {
  deliveryFilters.status = 'all';
  deliveryFilters.dateFrom = '';
  deliveryFilters.dateTo = '';
}

function buildFilters(): Record<string, unknown> {
  const schema = selectedDefinition.value?.filterSchema ?? {};
  const payload: Record<string, unknown> = {};

  if (schema.dateFrom && filters.dateFrom) payload.dateFrom = filters.dateFrom;
  if (schema.dateTo && filters.dateTo) payload.dateTo = filters.dateTo;
  if (schema.status && filters.status.trim()) payload.status = filters.status.trim();

  return payload;
}

function toExecutionSummary(execution: ReportExecutionDetail): ReportExecutionSummary {
  return {
    id: execution.id,
    accountId: execution.accountId,
    reportId: execution.reportId,
    requestedByUserId: execution.requestedByUserId,
    status: execution.status,
    filters: execution.filters,
    rowCount: execution.rowCount,
    generatedAt: execution.generatedAt,
    expiresAt: execution.expiresAt
  };
}

function formatCell(value: unknown, type: ReportColumnType): string {
  if (value == null) return '';
  if (type === 'currency') return formatCurrency(Number(value));
  if (type === 'number') return Number(value).toLocaleString('pt-BR');
  if (type === 'date' || type === 'datetime') return formatDate(String(value));
  return String(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number.isFinite(value) ? value : 0);
}

function formatInteger(value: number): string {
  return value.toLocaleString('pt-BR');
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function categoryLabel(category: ReportDefinition['category']): string {
  const labels: Record<ReportDefinition['category'], string> = {
    executive: 'Executivo',
    financial: 'Financeiro',
    commercial: 'Comercial',
    clinical: 'Clínico',
    inventory: 'Estoque',
    staff: 'Equipe',
    registrations: 'Cadastros'
  };
  return labels[category];
}

function frequencyLabel(frequency: ReportScheduleFrequency): string {
  const labels: Record<ReportScheduleFrequency, string> = {
    daily: 'Diária',
    weekly: 'Semanal',
    monthly: 'Mensal'
  };
  return labels[frequency];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
</script>

<style scoped>
.reports-engine-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
}

.reports-engine-page__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.reports-engine-page__kpi-action {
  appearance: none;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.reports-engine-page__kpi-action:disabled {
  cursor: default;
  opacity: 0.72;
}

.reports-engine-page__kpi-action:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.32);
  outline-offset: 3px;
  border-radius: 16px;
}

.reports-engine-page__form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.reports-engine-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.reports-engine-page__origin-context {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.reports-engine-page__origin-context div {
  display: grid;
  gap: 4px;
}

.reports-engine-page__origin-context span {
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}

.reports-engine-page__split {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
  gap: 12px;
}

.reports-engine-page__schedule-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.reports-engine-page__filter-status {
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
}

.reports-engine-page__delivery-context {
  margin: 0 0 12px;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
}

.reports-engine-page__delivery-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  align-items: end;
  margin-bottom: 12px;
}

.reports-engine-page__delivery-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.reports-engine-page__failed-recipients {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.reports-engine-page__section-title {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 14px;
  font-weight: 800;
}

.reports-engine-page__schedule-error {
  color: var(--color-danger, #b91c1c);
  font-weight: 700;
}

@media (max-width: 720px) {
  .reports-engine-page__delivery-filters,
  .reports-engine-page__delivery-summary {
    grid-template-columns: 1fr;
  }
}
</style>

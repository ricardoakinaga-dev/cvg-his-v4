<template>
  <div class="audit-page">
    <AppPageHeader :breadcrumbs="['Console Enterprise', 'Governança', 'Auditoria']" title="Auditoria" subtitle="Linha do tempo de eventos, risco e conformidade — Console Enterprise e Relatórios">
      <template #actions>
        <DsButton v-if="originHref" tag="a" :to="originHref" variant="secondary">{{ originLabel }}</DsButton>
        <DsBadge variant="info" size="md">{{ filteredEvents.length }} eventos</DsBadge>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="audit-page__overview">
      <div class="overview-grid">
        <div class="overview-card">
          <span class="overview-card__value">{{ events.length }}</span>
          <span class="overview-card__label">Total de eventos</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ highRiskCount }}</span>
          <span class="overview-card__label">Risco alto</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ moduleCount }}</span>
          <span class="overview-card__label">Módulos</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ actorCount }}</span>
          <span class="overview-card__label">Atores</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ coverageLabel }}</span>
          <span class="overview-card__label">Cobertura operacional</span>
        </div>
      </div>
    </section>

    <section class="audit-page__actions">
      <DsCard title="Ações rápidas — controle e conformidade" variant="compact">
        <div class="quick-actions">
          <DsButton tag="a" to="/access-control" variant="primary">Governança de Acesso</DsButton>
          <DsButton tag="a" to="/lgpd" variant="secondary">LGPD</DsButton>
          <DsButton tag="a" to="/webhooks" variant="secondary">Webhooks</DsButton>
          <DsButton variant="secondary" @click="filterReportDeliveryAlerts">Filtrar alertas</DsButton>
        </div>
      </DsCard>
    </section>

    <section class="audit-page__intelligence">
      <DsCard title="Leitura de risco e trilha">
        <div class="insights-grid">
          <div v-for="card in insightCards" :key="card.label" class="insight-card">
            <span class="insight-card__label">{{ card.label }}</span>
            <strong class="insight-card__value">{{ card.value }}</strong>
            <span class="insight-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="audit-page__report-alerts">
      <DsCard title="Alertas de relatórios" variant="compact">
        <div class="report-alert-summary">
          <div>
            <strong>{{ reportDeliveryAlertEvents.length }}</strong>
            <span>evento(s) high-risk de leitura de alertas recorrentes</span>
          </div>
          <DsBadge :variant="reportDeliveryAlertEvents.length > 0 ? 'danger' : 'success'" size="md">
            {{ reportDeliveryAlertEvents.length > 0 ? 'Monitorar' : 'Sem alertas' }}
          </DsBadge>
        </div>
        <p v-if="isReportAlertFilterActive" class="report-alert-summary__active-filter">
          Filtro ativo: alertas de relatórios
        </p>
      </DsCard>
    </section>

    <section class="audit-page__coverage">
      <DsCard title="Cobertura operacional Enterprise">
        <div class="coverage-summary">
          <div>
            <strong>{{ coverageLabel }}</strong>
            <span>{{ coverageSubtitle }}</span>
          </div>
          <DsBadge :variant="coverageVariant" size="md">{{ coverageStatusLabel }}</DsBadge>
        </div>
        <div class="coverage-grid">
          <div
            v-for="requirement in coverageRequirements"
            :key="requirement.id"
            :class="['coverage-item', requirement.covered ? 'coverage-item--covered' : 'coverage-item--missing']"
          >
            <div>
              <strong>{{ requirement.module }} · {{ requirement.action }}</strong>
              <span>{{ requirement.description }}</span>
            </div>
            <DsBadge :variant="requirement.covered ? 'success' : 'warning'" size="sm">
              {{ requirement.covered ? 'Coberto' : 'Pendente' }}
            </DsBadge>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="audit-toolbar">
      <DsInput v-model="query" placeholder="Buscar por módulo, ação, ator, entidade ou correlação" />
      <DsInput v-model="entityFilter" placeholder="Filtrar por entidade ou id afetado" />
      <DsInput v-model="correlationFilter" placeholder="Filtrar por correlationId" />
      <label class="field">
        <span>Risco</span>
        <select v-model="riskFilter">
          <option value="">Todos</option>
          <option value="low">Baixo</option>
          <option value="medium">Médio</option>
          <option value="high">Alto</option>
        </select>
      </label>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard title="Eventos auditados" class="panel">
      <DataTable
        :columns="columns"
        :rows="eventRows"
        :loading="loading"
        empty-icon="🧾"
        empty-title="Nenhum evento de auditoria encontrado"
        empty-description="Ajuste os filtros ou atualize a lista."
        variant="hoverable"
      >
        <template #cell-occurredAt="{ row }">
          <strong>{{ formatDate(auditRow(row).occurredAt) }}</strong>
          <div class="muted">Ator {{ auditRow(row).actorId }}</div>
        </template>
        <template #cell-riskLevel="{ row }">
          <DsBadge :variant="riskVariant(auditRow(row).riskLevel)" size="sm">
            {{ riskLabel(auditRow(row).riskLevel) }}
          </DsBadge>
        </template>
        <template #cell-payloadSummary="{ row }">
          <span class="payload-summary">{{ auditRow(row).payloadSummary }}</span>
        </template>
        <template #cell-actions="{ row }">
          <DsButton
            v-if="isReportDeliveryAlertEvent(auditRow(row))"
            size="sm"
            variant="secondary"
            tag="a"
            :to="reportScheduleHref(auditRow(row))"
          >
            Abrir agendamento
          </DsButton>
        </template>
      </DataTable>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { auditService, type OperationalAuditCoverageReport } from '@/services/audit';
import type { AuditEventSummary } from '@cvg-his-v2/shared-types';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';

const route = useRoute();
const events = ref<AuditEventSummary[]>([]);
const coverage = ref<OperationalAuditCoverageReport | null>(null);
const loading = ref(true);
const error = ref('');
const query = ref('');
const entityFilter = ref('');
const correlationFilter = ref('');
const riskFilter = ref<'low' | 'medium' | 'high' | ''>('');

const columns: DataTableColumn[] = [
  { key: 'occurredAt', label: 'Quando' },
  { key: 'module', label: 'Módulo' },
  { key: 'action', label: 'Ação' },
  { key: 'entityType', label: 'Entidade' },
  { key: 'riskLevel', label: 'Risco' },
  { key: 'correlationId', label: 'Correlação' },
  { key: 'payloadSummary', label: 'Resumo' },
  { key: 'actions', label: 'Ações' }
];

const filteredEvents = computed(() => {
  const needle = query.value.trim().toLowerCase();
  const entityNeedle = entityFilter.value.trim().toLowerCase();
  const correlationNeedle = correlationFilter.value.trim().toLowerCase();
  return events.value.filter((event) => {
    const matchesQuery =
      !needle ||
      [event.module, event.action, event.actorId, event.entityType, event.entityId, event.correlationId, event.payloadSummary]
        .some((value) => String(value ?? '').toLowerCase().includes(needle));
    const matchesEntity =
      !entityNeedle ||
      [event.entityType, event.entityId, event.payloadSummary].some((value) => String(value ?? '').toLowerCase().includes(entityNeedle));
    const matchesCorrelation = !correlationNeedle || String(event.correlationId ?? '').toLowerCase().includes(correlationNeedle);
    const matchesRisk = !riskFilter.value || event.riskLevel === riskFilter.value;
    return matchesQuery && matchesEntity && matchesCorrelation && matchesRisk;
  });
});
const eventRows = computed(() => filteredEvents.value as unknown as DataTableRow[]);

const highRiskCount = computed(() => events.value.filter((event) => event.riskLevel === 'high').length);
const moduleCount = computed(() => new Set(events.value.map((event) => event.module)).size);
const actorCount = computed(() => new Set(events.value.map((event) => event.actorId)).size);
const coverageLabel = computed(() => (coverage.value ? `${coverage.value.coveragePercent}%` : '—'));
const coverageSubtitle = computed(() => {
  if (!coverage.value) return 'Relatório de cobertura ainda não carregado';
  return `${coverage.value.coveredRequirements}/${coverageRequirements.value.length} requisito(s) críticos cobertos`;
});
const coverageRequirements = computed(() => coverage.value?.requirements ?? []);
const coverageStatusLabel = computed(() => {
  if (!coverage.value) return 'Carregando';
  if (coverage.value.missingRequirements === 0) return 'Completa';
  if (coverage.value.coveragePercent >= 75) return 'Atenção';
  return 'Incompleta';
});
const coverageVariant = computed(() => {
  if (!coverage.value) return 'info';
  if (coverage.value.missingRequirements === 0) return 'success';
  if (coverage.value.coveragePercent >= 75) return 'warning';
  return 'danger';
});
const mediumRiskCount = computed(() => events.value.filter((event) => event.riskLevel === 'medium').length);
const reportDeliveryAlertEvents = computed(() =>
  events.value.filter((event) => event.entityType === 'report-schedule-delivery-alert' && event.riskLevel === 'high')
);
const isReportAlertFilterActive = computed(() =>
  entityFilter.value === 'report-schedule-delivery-alert' && riskFilter.value === 'high'
);
const correlationReuseCount = computed(() => {
  const counts = new Map<string, number>();
  for (const event of events.value) {
    counts.set(event.correlationId, (counts.get(event.correlationId) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
});
const topModule = computed(() => {
  const counts = new Map<string, number>();
  for (const event of events.value) {
    counts.set(event.module, (counts.get(event.module) ?? 0) + 1);
  }
  const [winner, total] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];
  return total ? `${winner} (${total})` : 'Sem eventos';
});
const topActor = computed(() => {
  const counts = new Map<string, number>();
  for (const event of events.value) {
    counts.set(event.actorId, (counts.get(event.actorId) ?? 0) + 1);
  }
  const [winner, total] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];
  return total ? `${winner} (${total})` : 'Sem atores';
});
const latestEventLabel = computed(() => {
  if (!events.value.length) return '—';
  const latest = [...events.value].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )[0];
  return formatDate(latest.occurredAt);
});
const originHref = computed(() => (typeof route?.query?.origin === 'string' ? route.query.origin : ''));
const originLabel = computed(() => (typeof route?.query?.originLabel === 'string' ? route.query.originLabel : 'Voltar para origem'));
const insightCards = computed(() => [
  {
    label: 'Risco alto',
    value: String(highRiskCount.value),
    hint: 'Eventos de prioridade crítica'
  },
  {
    label: 'Risco médio',
    value: String(mediumRiskCount.value),
    hint: 'Eventos que merecem acompanhamento'
  },
  {
    label: 'Módulo líder',
    value: topModule.value,
    hint: 'Maior concentração de eventos'
  },
  {
    label: 'Ator recorrente',
    value: topActor.value,
    hint: 'Maior volume por ator identificado'
  },
  {
    label: 'Correlação reutilizada',
    value: String(correlationReuseCount.value),
    hint: 'Trilhas com mais de um evento associado'
  },
  {
    label: 'Cobertura operacional',
    value: coverageLabel.value,
    hint: coverageSubtitle.value
  },
  {
    label: 'Último evento',
    value: latestEventLabel.value,
    hint: 'Recência da telemetria disponível'
  }
]);

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function riskVariant(risk: AuditEventSummary['riskLevel']) {
  if (risk === 'high') return 'danger';
  if (risk === 'medium') return 'warning';
  return 'info';
}

function riskLabel(risk: AuditEventSummary['riskLevel']) {
  if (risk === 'high') return 'Alto';
  if (risk === 'medium') return 'Médio';
  return 'Baixo';
}

async function loadEvents() {
  loading.value = true;
  error.value = '';
  try {
    events.value = await auditService.listEvents();
    coverage.value = await auditService.getOperationalCoverage();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar auditoria';
  } finally {
    loading.value = false;
  }
}

function reload() {
  void loadEvents();
}

function filterReportDeliveryAlerts() {
  query.value = '';
  entityFilter.value = 'report-schedule-delivery-alert';
  correlationFilter.value = '';
  riskFilter.value = 'high';
}

function isReportDeliveryAlertEvent(event: AuditEventSummary): boolean {
  return event.entityType === 'report-schedule-delivery-alert';
}

function reportScheduleHref(event: AuditEventSummary): string {
  const params = new URLSearchParams({
    scheduleId: event.entityId,
    origin: '/audit?entity=report-schedule-delivery-alert',
    originLabel: 'Voltar para Auditoria'
  });
  return `/reports/engine?${params.toString()}`;
}

function hydrateFiltersFromRoute() {
  const routeQuery = route?.query ?? {};
  query.value = typeof routeQuery.q === 'string' ? routeQuery.q : '';
  entityFilter.value = typeof routeQuery.entity === 'string' ? routeQuery.entity : '';
  correlationFilter.value = typeof routeQuery.correlationId === 'string' ? routeQuery.correlationId : '';
}

onMounted(() => {
  hydrateFiltersFromRoute();
  void loadEvents();
});

function auditRow(row: unknown): AuditEventSummary {
  return row as AuditEventSummary;
}
</script>

<style scoped>
.audit-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-card__value {
  display: block;
  font-size: 28px;
  font-weight: 800;
}

.overview-card__label {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
}

.audit-page__actions {
  margin-bottom: 4px;
}

.audit-page__intelligence {
  margin-bottom: 4px;
}

.audit-page__report-alerts {
  margin-bottom: 4px;
}

.audit-page__coverage {
  margin-bottom: 4px;
}

.coverage-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.coverage-summary div {
  display: grid;
  gap: 4px;
}

.coverage-summary strong {
  font-size: 24px;
}

.coverage-summary span {
  color: var(--color-text-muted, #64748b);
}

.coverage-grid {
  display: grid;
  gap: 10px;
}

.coverage-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
}

.coverage-item div {
  display: grid;
  gap: 4px;
}

.coverage-item span {
  color: var(--color-text-muted, #64748b);
}

.coverage-item--missing {
  border-color: var(--color-warning-300, #fcd34d);
  background: var(--color-warning-50, #fffbeb);
}

.audit-toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: end;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.field select {
  min-width: 150px;
  min-height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #fff);
}

.panel {
  border-radius: 18px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.report-alert-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.report-alert-summary div {
  display: grid;
  gap: 4px;
}

.report-alert-summary strong {
  font-size: 26px;
  line-height: 1;
}

.report-alert-summary span,
.report-alert-summary__active-filter {
  color: var(--color-text-muted, #64748b);
}

.report-alert-summary__active-filter {
  margin: 10px 0 0;
  font-size: 13px;
  font-weight: 700;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.insight-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.insight-card__label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.insight-card__value {
  display: block;
  margin-top: 6px;
  font-size: 18px;
  font-weight: 800;
  word-break: break-word;
}

.insight-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.muted {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  margin-top: 4px;
}

.payload-summary {
  display: inline-block;
  max-width: 320px;
  white-space: normal;
}
</style>

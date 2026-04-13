<template>
  <div class="audit-page">
    <AppPageHeader title="Auditoria" subtitle="Linha do tempo de eventos, risco e conformidade — Console Enterprise e Relatórios">
      <template #actions>
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
      </div>
    </section>

    <section class="audit-page__actions">
      <DsCard title="Ações rápidas — controle e conformidade" variant="compact">
        <div class="quick-actions">
          <DsButton tag="a" to="/access-control" variant="primary">Governança de Acesso</DsButton>
          <DsButton tag="a" to="/lgpd" variant="secondary">LGPD</DsButton>
          <DsButton tag="a" to="/webhooks" variant="secondary">Webhooks</DsButton>
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

    <section class="audit-toolbar">
      <DsInput v-model="query" placeholder="Buscar por módulo, ação, ator, entidade ou correlação" />
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
      </DataTable>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { auditService } from '@/services/audit';
import type { AuditEventSummary } from '@cvg-his-v2/shared-types';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';

const events = ref<AuditEventSummary[]>([]);
const loading = ref(true);
const error = ref('');
const query = ref('');
const riskFilter = ref<'low' | 'medium' | 'high' | ''>('');

const columns: DataTableColumn[] = [
  { key: 'occurredAt', label: 'Quando' },
  { key: 'module', label: 'Módulo' },
  { key: 'action', label: 'Ação' },
  { key: 'entityType', label: 'Entidade' },
  { key: 'riskLevel', label: 'Risco' },
  { key: 'correlationId', label: 'Correlação' },
  { key: 'payloadSummary', label: 'Resumo' }
];

const filteredEvents = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return events.value.filter((event) => {
    const matchesQuery =
      !needle ||
      [event.module, event.action, event.actorId, event.entityType, event.entityId, event.correlationId, event.payloadSummary]
        .some((value) => String(value ?? '').toLowerCase().includes(needle));
    const matchesRisk = !riskFilter.value || event.riskLevel === riskFilter.value;
    return matchesQuery && matchesRisk;
  });
});
const eventRows = computed(() => filteredEvents.value as unknown as DataTableRow[]);

const highRiskCount = computed(() => events.value.filter((event) => event.riskLevel === 'high').length);
const moduleCount = computed(() => new Set(events.value.map((event) => event.module)).size);
const actorCount = computed(() => new Set(events.value.map((event) => event.actorId)).size);
const mediumRiskCount = computed(() => events.value.filter((event) => event.riskLevel === 'medium').length);
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
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar auditoria';
  } finally {
    loading.value = false;
  }
}

function reload() {
  void loadEvents();
}

onMounted(loadEvents);

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

<template>
  <div class="webhooks-list-page">
    <AppPageHeader :breadcrumbs="['Console Enterprise', 'Integrações', 'Webhooks']" title="Webhooks" subtitle="Entrega de eventos, integrações e saúde operacional do ecossistema externo">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton tag="a" to="/webhooks/new" variant="primary">+ Novo Webhook</DsButton>
      </template>
    </AppPageHeader>

    <section class="summary-grid">
      <DsCard v-for="card in summaryCards" :key="card.label" variant="elevated" class="summary-card">
        <div class="summary-card__icon">{{ card.icon }}</div>
        <div class="summary-card__body">
          <span class="summary-card__value">{{ card.value }}</span>
          <span class="summary-card__label">{{ card.label }}</span>
        </div>
      </DsCard>
    </section>

    <section class="webhooks-list-page__overview">
      <DsCard title="Resumo da integração">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ items.length }}</span>
            <span class="overview-metric__label">Webhooks cadastrados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ activeCount }}</span>
            <span class="overview-metric__label">Ativos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ inactiveCount }}</span>
            <span class="overview-metric__label">Inativos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ totalEventTypes }}</span>
            <span class="overview-metric__label">Tipos de eventos</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="webhooks-list-page__actions">
      <DsCard title="Ações rápidas — integrações" variant="compact">
        <div class="quick-actions">
          <DsButton tag="a" to="/api-keys" variant="primary">Chaves de API</DsButton>
          <DsButton tag="a" to="/api-client" variant="secondary">Cliente API</DsButton>
          <DsButton tag="a" to="/audit" variant="secondary">Auditoria</DsButton>
        </div>
      </DsCard>
    </section>

    <section class="webhooks-list-page__intelligence">
      <DsCard title="Cobertura e saúde do ecossistema">
        <div class="insights-grid">
          <div v-for="card in insightCards" :key="card.label" class="insight-card">
            <span class="insight-card__label">{{ card.label }}</span>
            <strong class="insight-card__value">{{ card.value }}</strong>
            <span class="insight-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section v-if="webhookAlerts.length > 0" class="webhooks-list-page__watch">
      <DsAlert
        v-for="alert in webhookAlerts"
        :key="alert.title"
        :variant="alert.variant"
        dismissible
      >
        <strong>{{ alert.title }}</strong> - {{ alert.message }}
      </DsAlert>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="webhookRows"
      :loading="loading"
      empty-icon="🔗"
      empty-title="Nenhum webhook encontrado"
      empty-description="Cadastre o primeiro webhook para receber notificações de eventos."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton tag="a" to="/webhooks/new" variant="primary">+ Novo Webhook</DsButton>
      </template>
      <template #cell-url="{ row }">
        <code class="webhook-url">{{ webhookRow(row).url }}</code>
      </template>
      <template #cell-events="{ row }">
        <div class="events-tags">
          <span
            v-for="event in webhookRow(row).events.slice(0, 3)"
            :key="event"
            class="event-tag"
            >{{ event }}</span
          >
          <span v-if="webhookRow(row).events.length > 3" class="event-tag event-tag--more">
            +{{ webhookRow(row).events.length - 3 }}
          </span>
        </div>
      </template>
      <template #cell-isActive="{ row }">
        <StatusBadge
          :label="webhookRow(row).isActive ? 'Ativo' : 'Inativo'"
          :variant="webhookRow(row).isActive ? 'success' : 'danger'"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/webhooks/${webhookRow(row).id}`"
          size="sm"
          variant="secondary"
        >
          Ver
        </DsButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { webhookService } from '@/services/webhook';
import { AVAILABLE_EVENTS, type WebhookSummary } from '@/types/webhook';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import { computed } from 'vue';

const items = ref<WebhookSummary[]>([]);
const loading = ref(true);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'url', label: 'URL' },
  { key: 'events', label: 'Eventos' },
  { key: 'isActive', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const activeCount = computed(() => items.value.filter((webhook) => webhook.isActive).length);
const inactiveCount = computed(() => items.value.filter((webhook) => !webhook.isActive).length);
const webhookRows = computed(() => items.value as unknown as DataTableRow[]);
const totalEventTypes = computed(
  () => new Set(items.value.flatMap((webhook) => webhook.events)).size
);
const missingEvents = computed(() => {
  const covered = new Set(items.value.flatMap((webhook) => webhook.events));
  return AVAILABLE_EVENTS.filter((event) => !covered.has(event));
});
const duplicatedTargets = computed(() => new Set(items.value.map((webhook) => webhook.url)).size !== items.value.length);
const insightCards = computed(() => [
  {
    label: 'Cobertura do catálogo',
    value: `${AVAILABLE_EVENTS.length - missingEvents.value.length}/${AVAILABLE_EVENTS.length}`,
    hint: 'Eventos padrão já cobertos por ao menos um endpoint'
  },
  {
    label: 'Eventos sem rota',
    value: String(missingEvents.value.length),
    hint: 'Eventos disponíveis ainda sem consumidor cadastrado'
  },
  {
    label: 'Ativação',
    value: items.value.length ? `${Math.round((activeCount.value / items.value.length) * 100)}%` : '0%',
    hint: 'Percentual de webhooks ativos'
  },
  {
    label: 'URLs únicas',
    value: String(new Set(items.value.map((webhook) => webhook.url)).size),
    hint: 'Destinos distintos no ecossistema'
  }
]);

interface WebhookWatchAlert {
  variant: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

const webhookAlerts = computed<WebhookWatchAlert[]>(() => {
  const alerts: WebhookWatchAlert[] = [];
  if (inactiveCount.value > 0) {
    alerts.push({
      variant: 'warning',
      title: 'Endpoints inativos',
      message: `${inactiveCount.value} webhook(s) estão desativados e podem interromper integrações esperadas.`
    });
  }
  if (missingEvents.value.length > 0) {
    alerts.push({
      variant: 'info',
      title: 'Cobertura incompleta',
      message: `${missingEvents.value.length} evento(s) do catálogo padrão ainda não possuem webhook cadastrado.`
    });
  }
  if (duplicatedTargets.value) {
    alerts.push({
      variant: 'danger',
      title: 'Destino duplicado',
      message: 'Há URLs repetidas na malha de webhooks; valide se isso é redundância intencional ou sobreposição.'
    });
  }
  return alerts;
});

const summaryCards = computed(() => [
  { icon: '🔗', label: 'Webhooks ativos', value: String(activeCount.value) },
  { icon: '⛔', label: 'Webhooks inativos', value: String(inactiveCount.value) },
  { icon: '🧩', label: 'Tipos de eventos', value: String(totalEventTypes.value) },
  { icon: '📦', label: 'Total cadastrados', value: String(items.value.length) }
]);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    items.value = await webhookService.list();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar webhooks';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function webhookRow(row: unknown): WebhookSummary {
  return row as WebhookSummary;
}
</script>

<style scoped>
.webhooks-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.summary-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
}

.summary-card__icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.08);
  font-size: 22px;
}

.summary-card__body {
  display: flex;
  flex-direction: column;
}

.summary-card__value {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  line-height: 1;
}

.summary-card__label {
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
  margin-top: 4px;
}

.webhooks-list-page__overview {
  margin-bottom: 4px;
}

.webhooks-list-page__actions {
  margin-bottom: 4px;
}

.webhooks-list-page__intelligence,
.webhooks-list-page__watch {
  margin-bottom: 4px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
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
  text-transform: uppercase;
  letter-spacing: 0.04em;
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

.overview-metric {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.webhook-url {
  font-size: 12px;
  word-break: break-all;
  color: var(--color-text-secondary, #475569);
}

.events-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.event-tag {
  display: inline-block;
  padding: 2px 6px;
  background: var(--color-bg-subtle, #f1f5f9);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 4px;
  font-size: 11px;
  color: var(--color-text-secondary, #475569);
  white-space: nowrap;
}

.event-tag--more {
  background: var(--color-primary-50, #eff6ff);
  border-color: var(--color-primary-200, #bfdbfe);
  color: var(--color-primary-700, #1d4ed8);
}
</style>

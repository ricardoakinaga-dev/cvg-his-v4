<template>
  <div class="webhooks-list-page">
    <AppPageHeader title="Webhooks" subtitle="Integrações via webhooks">
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

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="items"
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
        <code class="webhook-url">{{ (row as WebhookSummary).url }}</code>
      </template>
      <template #cell-events="{ row }">
        <div class="events-tags">
          <span
            v-for="event in (row as WebhookSummary).events.slice(0, 3)"
            :key="event"
            class="event-tag"
            >{{ event }}</span
          >
          <span v-if="(row as WebhookSummary).events.length > 3" class="event-tag event-tag--more">
            +{{ (row as WebhookSummary).events.length - 3 }}
          </span>
        </div>
      </template>
      <template #cell-isActive="{ row }">
        <StatusBadge
          :label="(row as WebhookSummary).isActive ? 'Ativo' : 'Inativo'"
          :variant="(row as WebhookSummary).isActive ? 'success' : 'danger'"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/webhooks/${(row as WebhookSummary).id}`"
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
import type { WebhookSummary } from '@/types/webhook';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
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
const totalEventTypes = computed(
  () => new Set(items.value.flatMap((webhook) => webhook.events)).size
);

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

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
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

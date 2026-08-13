<template>
  <div class="webhooks-list-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Cadastros', 'Webhooks']"
      title="Webhooks"
      subtitle="Cadastro de endpoints usados para integrar eventos do atendimento, financeiro e notificações.">
      <template #actions>
        <DsBadge variant="info" size="md">{{ items.length }} webhooks</DsBadge>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton variant="primary" @click="router.push('/webhooks/new')">Incluir</DsButton>
      </template>
    </AppPageHeader>

    <section class="overview-grid">
      <div class="overview-card">
        <span class="overview-card__value">{{ items.length }}</span>
        <span class="overview-card__label">Total</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ activeCount }}</span>
        <span class="overview-card__label">Ativos</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ inactiveCount }}</span>
        <span class="overview-card__label">Inativos</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ totalEventTypes }}</span>
        <span class="overview-card__label">Eventos</span>
      </div>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard>
      <div class="legacy-filter-grid">
        <DsInput v-model="filters.url" label="URL" placeholder="URL" />
        <DsInput v-model="filters.event" label="Evento" placeholder="Evento" />
        <DsInput v-model="filters.status" type="select" label="Status">
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </DsInput>
        <DsButton variant="secondary" :loading="loading" @click="load">Pesquisar</DsButton>
      </div>
    </DsCard>

    <DataTable
      :columns="columns"
      :rows="webhookRows"
      :loading="loading"
      empty-icon="🔗"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou inclua um novo webhook."
      show-headers-when-empty
      variant="hoverable"
    >
      <template #cell-url="{ row }">
        <code class="webhook-url">{{ webhookRow(row).url }}</code>
      </template>
      <template #cell-events="{ row }">
        <div class="events-tags">
          <span
            v-for="event in webhookRow(row).events.slice(0, 3)"
            :key="event"
            class="event-tag"
          >
            {{ event }}
          </span>
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
      <template #cell-createdAt="{ row }">
        {{ formatDate(webhookRow(row).createdAt) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          size="sm"
          variant="secondary"
          @click="router.push(`/webhooks/${webhookRow(row).id}`)"
        >
          Abrir
        </DsButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { webhookService } from '@/services/webhook';
import { formatDate } from '@/utils/labels';
import { type WebhookSummary } from '@/types/webhook';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const router = useRouter();
const items = ref<WebhookSummary[]>([]);
const loading = ref(true);
const error = ref('');
const filters = ref({
  url: '',
  event: '',
  status: 'active'
});

const columns: DataTableColumn[] = [
  { key: 'url', label: 'URL' },
  { key: 'events', label: 'Eventos' },
  { key: 'isActive', label: 'Status', width: '130px' },
  { key: 'createdAt', label: 'Criado em', width: '160px' },
  { key: 'actions', label: 'Abrir', width: '110px', class: 'table__actions-col' }
];

const webhookRows = computed(() => items.value as unknown as DataTableRow[]);
const activeCount = computed(() => items.value.filter((webhook) => webhook.isActive).length);
const inactiveCount = computed(() => items.value.filter((webhook) => !webhook.isActive).length);
const totalEventTypes = computed(
  () => new Set(items.value.flatMap((webhook) => webhook.events)).size
);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    items.value = await webhookService.list({
      url: filters.value.url.trim() || undefined,
      event: filters.value.event.trim() || undefined,
      active:
        filters.value.status === 'all'
          ? undefined
          : filters.value.status === 'active'
    });
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

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
}

.overview-card__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.overview-card__label {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
}

.legacy-filter-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(180px, 0.5fr) minmax(150px, 0.35fr) auto;
  align-items: end;
  gap: 12px;
}

.webhook-url {
  display: inline-block;
  max-width: min(560px, 62vw);
  overflow-wrap: anywhere;
  white-space: normal;
}

.events-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.event-tag {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-primary-700, #1d4ed8);
  font-size: 12px;
  font-weight: 700;
}

.event-tag--more {
  background: var(--color-gray-100, #f1f5f9);
  color: var(--color-text-secondary, #475569);
}

@media (max-width: 860px) {
  .legacy-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div class="webhooks-list-page">
    <AppPageHeader title="Webhooks" subtitle="Integrações via webhooks">
      <template #actions>
        <DsButton tag="a" to="/webhooks/new" variant="primary">+ Novo Webhook</DsButton>
      </template>
    </AppPageHeader>

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
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

const items = ref<WebhookSummary[]>([]);
const loading = ref(true);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'url', label: 'URL' },
  { key: 'events', label: 'Eventos' },
  { key: 'isActive', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

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

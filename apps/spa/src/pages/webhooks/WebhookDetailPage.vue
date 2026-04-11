<template>
  <div class="webhook-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" width="70%" />
      </div>
    </div>

    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <template v-else-if="webhook">
      <AppPageHeader>
        <template #title>Webhook</template>
        <template #subtitle>
          <StatusBadge
            :label="webhook.isActive ? 'Ativo' : 'Inativo'"
            :variant="webhook.isActive ? 'success' : 'danger'"
          />
        </template>
        <template #actions>
          <DsButton tag="a" :to="`/webhooks/${webhook.id}/edit`" variant="secondary">
            Editar
          </DsButton>
          <DsButton variant="danger" size="sm" @click="handleDelete">Desativar</DsButton>
          <DsButton variant="secondary" tag="a" to="/webhooks">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <section class="summary-grid">
        <DsCard v-for="item in summaryCards" :key="item.label" variant="elevated" class="summary-card">
          <div class="summary-card__icon">{{ item.icon }}</div>
          <div class="summary-card__body">
            <span class="summary-card__value">{{ item.value }}</span>
            <span class="summary-card__label">{{ item.label }}</span>
          </div>
        </DsCard>
      </section>

      <div class="webhook-detail-page__grid">
        <AppDetailSection title="Configuração">
          <div class="detail-row">
            <span class="detail-label">URL</span>
            <code class="detail-value">{{ webhook.url }}</code>
          </div>
          <div class="detail-row">
            <span class="detail-label">Eventos</span>
            <div class="events-tags">
              <span v-for="event in webhook.events" :key="event" class="event-tag">{{
                event
              }}</span>
            </div>
          </div>
          <div class="detail-row">
            <span class="detail-label">Criado em</span>
            <span class="detail-value">{{ formatDate(webhook.createdAt) }}</span>
          </div>
        </AppDetailSection>

        <AppDetailSection title="Histórico de Deliveries">
          <DsAlert v-if="deliveriesError" variant="warning" size="sm">
            {{ deliveriesError }}
          </DsAlert>
          <DataTable
            v-else
            :columns="deliveryColumns"
            :rows="deliveries"
            :loading="deliveriesLoading"
            empty-icon="📦"
            empty-title="Nenhum delivery ainda"
            empty-description="Deliveries aparecerão aqui quando eventos forem disparados."
            :compact="true"
          >
            <template #cell-status="{ row }">
              <StatusBadge
                :label="deliveryStatusLabel((row as WebhookDelivery).status)"
                :variant="deliveryStatusVariant((row as WebhookDelivery).status)"
              />
            </template>
            <template #cell-event="{ row }">
              <code class="delivery-event">{{ (row as WebhookDelivery).event }}</code>
            </template>
            <template #cell-responseStatus="{ row }">
              <span v-if="(row as WebhookDelivery).responseStatus">
                {{ (row as WebhookDelivery).responseStatus }}
              </span>
              <span v-else class="muted">—</span>
            </template>
          </DataTable>
        </AppDetailSection>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { webhookService } from '@/services/webhook';
import type { WebhookSummary, WebhookDelivery } from '@/types/webhook';
import { formatDate } from '@/utils/labels';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';

const route = useRoute();
const router = useRouter();

const webhook = ref<WebhookSummary | null>(null);
const loading = ref(true);
const error = ref('');
const deliveries = ref<WebhookDelivery[]>([]);
const deliveriesLoading = ref(true);
const deliveriesError = ref('');

const deliveryColumns: DataTableColumn[] = [
  { key: 'event', label: 'Evento' },
  { key: 'status', label: 'Status' },
  { key: 'attempts', label: 'Tentativas' },
  { key: 'responseStatus', label: 'HTTP' },
  { key: 'lastAttemptAt', label: 'Última Tentativa' }
];

const summaryCards = computed(() => [
  { icon: '🔗', label: 'URL', value: webhook.value?.url ?? '—' },
  { icon: '📦', label: 'Eventos', value: String(webhook.value?.events.length ?? 0) },
  { icon: '📨', label: 'Deliveries', value: String(deliveries.value.length) },
  { icon: '⚡', label: 'Status', value: webhook.value?.isActive ? 'Ativo' : 'Inativo' }
]);

function deliveryStatusLabel(status: WebhookDelivery['status']): string {
  return { pending: 'Pendente', delivered: 'Entregue', failed: 'Falhou' }[status];
}

function deliveryStatusVariant(
  status: WebhookDelivery['status']
): 'success' | 'warning' | 'danger' {
  if (status === 'pending') return 'warning';
  if (status === 'delivered') return 'success';
  return 'danger';
}

async function handleDelete() {
  if (!webhook.value) return;
  if (!confirm('Tem certeza que deseja desativar este webhook?')) return;
  try {
    await webhookService.delete(webhook.value.id);
    router.push('/webhooks');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao desativar webhook';
  }
}

onMounted(async () => {
  const id = route.params.id as string;
  try {
    webhook.value = await webhookService.getById(id);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar webhook';
  } finally {
    loading.value = false;
  }

  try {
    deliveries.value = await webhookService.getDeliveries(id);
  } catch (err: unknown) {
    deliveriesError.value = err instanceof Error ? err.message : 'Erro ao carregar deliveries';
  } finally {
    deliveriesLoading.value = false;
  }
});
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
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
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  line-height: 1.15;
  word-break: break-word;
}

.summary-card__label {
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
  margin-top: 4px;
}

.webhook-detail-page__grid {
  display: grid;
  gap: 16px;
}

.detail-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-size: 14px;
}

.detail-label {
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
  min-width: 100px;
  flex-shrink: 0;
}

.detail-value {
  color: var(--color-text, #0f172a);
  word-break: break-all;
}

.events-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.event-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-bg-subtle, #f1f5f9);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-text-secondary, #475569);
}

.delivery-event {
  font-size: 11px;
}
</style>

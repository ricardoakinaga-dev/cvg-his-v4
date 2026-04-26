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
      <AppPageHeader :breadcrumbs="['Atendimento', 'Cadastros', 'Webhooks', 'Abrir']">
        <template #title>Webhook</template>
        <template #subtitle>
          <StatusBadge
            :label="webhook.isActive ? 'Ativo' : 'Inativo'"
            :variant="webhook.isActive ? 'success' : 'danger'"
          />
        </template>
        <template #actions>
          <DsButton variant="primary" :loading="testing" @click="handleTest">
            Testar
          </DsButton>
          <DsButton tag="a" :to="`/webhooks/${webhook.id}/edit`" variant="secondary">
            Editar
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/webhooks">Voltar</DsButton>
          <DsButton
            :variant="webhook.isActive ? 'danger' : 'secondary'"
            size="sm"
            @click="handleStatusToggle"
          >
            {{ webhook.isActive ? 'Desativar' : 'Ativar' }}
          </DsButton>
        </template>
      </AppPageHeader>

      <DsAlert v-if="testMessage" :variant="testSuccess ? 'success' : 'warning'" dismissible @dismiss="testMessage = ''">
        {{ testMessage }}
      </DsAlert>

      <section class="summary-grid">
        <DsCard v-for="item in summaryCards" :key="item.label" variant="elevated" class="summary-card">
          <div class="summary-card__icon">{{ item.icon }}</div>
          <div class="summary-card__body">
            <span class="summary-card__value">{{ item.value }}</span>
            <span class="summary-card__label">{{ item.label }}</span>
          </div>
        </DsCard>
      </section>

      <section class="webhook-detail-page__intelligence">
        <DsCard title="Leitura de entregas">
          <div class="insights-grid">
            <div v-for="card in deliveryInsightCards" :key="card.label" class="insight-card">
              <span class="insight-card__label">{{ card.label }}</span>
              <strong class="insight-card__value">{{ card.value }}</strong>
              <span class="insight-card__hint">{{ card.hint }}</span>
            </div>
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
            :rows="deliveryRows"
            :loading="deliveriesLoading"
            empty-icon="📦"
            empty-title="Nenhum delivery ainda"
            empty-description="Deliveries aparecerão aqui quando eventos forem disparados."
            :compact="true"
          >
            <template #cell-status="{ row }">
              <StatusBadge
                :label="deliveryStatusLabel(deliveryRow(row).status)"
                :variant="deliveryStatusVariant(deliveryRow(row).status)"
              />
            </template>
            <template #cell-event="{ row }">
              <code class="delivery-event">{{ deliveryRow(row).event }}</code>
            </template>
            <template #cell-responseStatus="{ row }">
              <span v-if="deliveryRow(row).responseStatus">
                {{ deliveryRow(row).responseStatus }}
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
import { useRoute } from 'vue-router';
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
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';

const route = useRoute();

const webhook = ref<WebhookSummary | null>(null);
const loading = ref(true);
const error = ref('');
const deliveries = ref<WebhookDelivery[]>([]);
const deliveriesLoading = ref(true);
const deliveriesError = ref('');
const testing = ref(false);
const testMessage = ref('');
const testSuccess = ref(false);

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
const deliveryRows = computed(() => deliveries.value as unknown as DataTableRow[]);
const deliveredCount = computed(() => deliveries.value.filter((item) => item.status === 'delivered').length);
const failedCount = computed(() => deliveries.value.filter((item) => item.status === 'failed').length);
const pendingCount = computed(() => deliveries.value.filter((item) => item.status === 'pending').length);
const successRate = computed(() => {
  if (!deliveries.value.length) return '0%';
  return `${Math.round((deliveredCount.value / deliveries.value.length) * 100)}%`;
});
const retryBacklog = computed(() => deliveries.value.filter((item) => item.nextRetryAt).length);
const lastDeliveryLabel = computed(() => {
  if (!deliveries.value.length) return '—';
  const latest = [...deliveries.value].sort(
    (a, b) => new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime()
  )[0];
  return formatDate(latest.lastAttemptAt);
});
const deliveryInsightCards = computed(() => [
  {
    label: 'Sucesso',
    value: successRate.value,
    hint: 'Percentual de deliveries entregues'
  },
  {
    label: 'Falhas',
    value: String(failedCount.value),
    hint: 'Eventos com retorno não concluído'
  },
  {
    label: 'Pendentes',
    value: String(pendingCount.value),
    hint: 'Eventos aguardando nova tentativa'
  },
  {
    label: 'Retry backlog',
    value: String(retryBacklog.value),
    hint: 'Deliveries com nova tentativa programada'
  },
  {
    label: 'Última tentativa',
    value: lastDeliveryLabel.value,
    hint: 'Recência da fila deste endpoint'
  }
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

async function handleStatusToggle() {
  if (!webhook.value) return;
  const nextActive = !webhook.value.isActive;
  const action = nextActive ? 'ativar' : 'desativar';
  if (!confirm(`Tem certeza que deseja ${action} este webhook?`)) return;
  try {
    webhook.value = await webhookService.update(webhook.value.id, { isActive: nextActive });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao atualizar webhook';
  }
}

async function handleTest() {
  if (!webhook.value) return;
  testing.value = true;
  testMessage.value = '';
  try {
    const result = await webhookService.test(webhook.value.id);
    testSuccess.value = result.success;
    const status = result.statusCode ? `HTTP ${result.statusCode}` : 'sem resposta HTTP';
    testMessage.value = result.success
      ? `Teste enviado com sucesso (${status}).`
      : `Teste enviado, mas o endpoint não confirmou a entrega (${status}).`;
  } catch (err: unknown) {
    testSuccess.value = false;
    testMessage.value = err instanceof Error ? err.message : 'Erro ao testar webhook';
  } finally {
    testing.value = false;
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

function deliveryRow(row: unknown): WebhookDelivery {
  return row as WebhookDelivery;
}
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

.webhook-detail-page__intelligence {
  margin-bottom: 16px;
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

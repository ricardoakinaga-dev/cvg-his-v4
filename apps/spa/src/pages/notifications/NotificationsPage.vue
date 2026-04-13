<template>
  <div class="notifications-page">
  <AppPageHeader title="Notificações e Campanhas" subtitle="Centro de relacionamento, campanhas e filas de comunicação do Marketing">
      <template #actions>
        <DsButton variant="secondary" :loading="notificationLoading || jobLoading" @click="reload">
          Atualizar
        </DsButton>
        <DsButton variant="secondary" :loading="processing" @click="processPending">
          Processar pendentes
        </DsButton>
      </template>
    </AppPageHeader>

    <section class="notifications-overview">
      <DsCard title="Resumo operacional — Marketing e Relacionamento">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ notificationItems.length }}</span>
            <span class="overview-metric__label">Notificações totais</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ queuedCount }}</span>
            <span class="overview-metric__label">Campanhas pendentes</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ processedJobsCount }}</span>
            <span class="overview-metric__label">Enviadas com sucesso</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ failedJobsCount }}</span>
            <span class="overview-metric__label">Falhas de envio</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="notifications-story">
      <DsCard title="Ações rápidas — Marketing" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" tag="a" to="/notifications/whatsapp">WhatsApp</DsButton>
          <DsButton variant="secondary" tag="a" to="/commercial-reports">Relatórios</DsButton>
          <DsButton variant="secondary" tag="a" to="/master-search">Busca Mestre</DsButton>
        </div>
      </DsCard>
    </section>

    <section class="notifications-intelligence">
      <DsCard title="Leitura de campanhas e fila">
        <div class="insights-grid">
          <div v-for="card in insightCards" :key="card.label" class="insight-card">
            <span class="insight-card__label">{{ card.label }}</span>
            <strong class="insight-card__value">{{ card.value }}</strong>
            <span class="insight-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section v-if="watchAlerts.length > 0" class="notifications-watch">
      <DsAlert
        v-for="alert in watchAlerts"
        :key="alert.title"
        :variant="alert.variant"
        dismissible
      >
        <strong>{{ alert.title }}</strong> - {{ alert.message }}
      </DsAlert>
    </section>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>
    <DsAlert v-if="notificationError" variant="danger" dismissible @dismiss="notificationError = ''">
      {{ notificationError }}
    </DsAlert>
    <DsAlert v-if="jobError" variant="danger" dismissible @dismiss="jobError = ''">
      {{ jobError }}
    </DsAlert>

    <div class="status-filters" role="tablist" aria-label="Filtros de notificação">
      <DsButton
        v-for="status in statusOptions"
        :key="status.value"
        :variant="currentStatus === status.value ? 'primary' : 'secondary'"
        size="sm"
        @click="currentStatus = status.value"
      >
        {{ status.label }}
      </DsButton>
    </div>

    <div class="notifications-summary">
      <DsBadge variant="info" size="md">{{ notificationItems.length }} itens visíveis</DsBadge>
      <DsBadge variant="warning" size="md">{{ queuedJobs.length }} jobs em fila</DsBadge>
    </div>

    <DsCard title="Notificações" class="notifications-card">
        <DataTable
          :columns="notificationColumns"
          :rows="notificationItems"
          :loading="notificationLoading"
        empty-icon="🔔"
        empty-title="Nenhuma notificação encontrada"
        empty-description="O painel exibe notificações internas e seus estados de processamento."
        variant="hoverable"
      >
        <template #cell-category="{ row }">
          <DsBadge variant="default" size="sm">{{ (row as NotificationSummary).category }}</DsBadge>
        </template>
        <template #cell-severity="{ row }">
          <StatusBadge
            :label="(row as NotificationSummary).severity"
            :variant="severityVariant((row as NotificationSummary).severity)"
          />
        </template>
        <template #cell-status="{ row }">
          <StatusBadge
            :label="statusLabel((row as NotificationSummary).status)"
            :variant="statusVariant((row as NotificationSummary).status)"
          />
        </template>
        <template #cell-createdAt="{ row }">
          {{ formatDate((row as NotificationSummary).createdAt) }}
        </template>
        <template #cell-sentAt="{ row }">
          {{ formatDate((row as NotificationSummary).sentAt ?? null) }}
        </template>
      </DataTable>
    </DsCard>

    <DsCard title="Jobs de notificação" class="notifications-card">
      <DataTable
        :columns="jobColumns"
        :rows="jobItems"
        :loading="jobLoading"
        empty-icon="⚙️"
        empty-title="Nenhum job encontrado"
        empty-description="Os jobs são criados quando notificações são enfileiradas."
        variant="hoverable"
      >
        <template #cell-status="{ row }">
          <StatusBadge
            :label="jobStatusLabel((row as NotificationJobSummary).status)"
            :variant="jobStatusVariant((row as NotificationJobSummary).status)"
          />
        </template>
        <template #cell-scheduledAt="{ row }">
          {{ formatDate((row as NotificationJobSummary).scheduledAt) }}
        </template>
        <template #cell-processedAt="{ row }">
          {{ formatDate((row as NotificationJobSummary).processedAt ?? null) }}
        </template>
      </DataTable>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { useListData } from '@/composables/useListData';
import { notificationService } from '@/services/notifications';
import type { NotificationJobSummary, NotificationSummary } from '@cvg-his-v2/shared-types';

const statusOptions = [
  { value: 'all' as const, label: 'Todas' },
  { value: 'queued' as const, label: 'Pendentes' },
  { value: 'sent' as const, label: 'Enviadas' },
  { value: 'read' as const, label: 'Lidas' }
];

const currentStatus = ref<'all' | 'queued' | 'sent' | 'read'>('queued');
const processing = ref(false);
const successMessage = ref('');

const notificationColumns = [
  { key: 'category', label: 'Categoria' },
  { key: 'title', label: 'Título' },
  { key: 'severity', label: 'Severidade' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Criada em' },
  { key: 'sentAt', label: 'Enviada em' }
];

const jobColumns = [
  { key: 'notificationId', label: 'Notificação' },
  { key: 'status', label: 'Status' },
  { key: 'attempts', label: 'Tentativas' },
  { key: 'scheduledAt', label: 'Agendada em' },
  { key: 'processedAt', label: 'Processada em' }
];

const {
  items: notificationItems,
  loading: notificationLoading,
  error: notificationError,
  load: loadNotifications
} = useListData<NotificationSummary>({
  fetchFn: async () => {
    return currentStatus.value === 'all'
      ? notificationService.list()
      : notificationService.list(currentStatus.value);
  },
  entityLabel: 'notificações'
});

const {
  items: jobItems,
  loading: jobLoading,
  error: jobError,
  load: loadJobs
} = useListData<NotificationJobSummary>({
  fetchFn: () => notificationService.listJobs(),
  entityLabel: 'jobs de notificação'
});

const queuedJobs = computed(() => jobItems.value.filter((job) => job.status === 'queued'));
const queuedCount = computed(() => notificationItems.value.filter((item) => item.status === 'queued').length);
const processedJobsCount = computed(
  () => jobItems.value.filter((job) => job.status === 'processed').length
);
const failedJobsCount = computed(() => jobItems.value.filter((job) => job.status === 'failed').length);
const averageAttempts = computed(() => {
  if (!jobItems.value.length) return '0,0';
  const totalAttempts = jobItems.value.reduce((sum, job) => sum + job.attempts, 0);
  return (totalAttempts / jobItems.value.length).toFixed(1).replace('.', ',');
});
const processingRate = computed(() => {
  if (!jobItems.value.length) return '0%';
  return `${Math.round((processedJobsCount.value / jobItems.value.length) * 100)}%`;
});
const latestActivityLabel = computed(() => {
  const timestamps = [
    ...notificationItems.value.map((item) => item.sentAt ?? item.createdAt),
    ...jobItems.value.map((job) => job.processedAt ?? job.scheduledAt)
  ].filter(Boolean);
  if (!timestamps.length) return '—';
  const latest = [...timestamps].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  return formatDate(latest);
});
const categoryBreakdown = computed(() => ({
  billing: notificationItems.value.filter((item) => item.category === 'billing').length,
  inventory: notificationItems.value.filter((item) => item.category === 'inventory').length,
  operations: notificationItems.value.filter((item) => item.category === 'operations').length,
  system: notificationItems.value.filter((item) => item.category === 'system').length
}));
const severityBreakdown = computed(() => ({
  high: notificationItems.value.filter((item) => item.severity === 'high').length,
  medium: notificationItems.value.filter((item) => item.severity === 'medium').length,
  low: notificationItems.value.filter((item) => item.severity === 'low').length
}));
const insightCards = computed(() => [
  {
    label: 'Eficiência da fila',
    value: processingRate.value,
    hint: 'Percentual de jobs já processados'
  },
  {
    label: 'Tentativas médias',
    value: averageAttempts.value,
    hint: 'Média de tentativas por job'
  },
  {
    label: 'Categoria líder',
    value: leadingCategoryLabel(),
    hint: 'Família com maior volume visível'
  },
  {
    label: 'Última atividade',
    value: latestActivityLabel.value,
    hint: 'Último envio ou processamento identificado'
  },
  {
    label: 'Alta severidade',
    value: String(severityBreakdown.value.high),
    hint: 'Itens que exigem conferência prioritária'
  },
  {
    label: 'Operações',
    value: String(categoryBreakdown.value.operations),
    hint: 'Itens ligados à operação assistencial'
  }
]);

interface NotificationsWatchAlert {
  variant: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

const watchAlerts = computed<NotificationsWatchAlert[]>(() => {
  const alerts: NotificationsWatchAlert[] = [];
  if (failedJobsCount.value > 0) {
    alerts.push({
      variant: 'danger',
      title: 'Falhas no pipeline',
      message: `${failedJobsCount.value} job(s) falharam e precisam de revisão do canal ou da regra de disparo.`
    });
  }
  if (queuedJobs.value.length > processedJobsCount.value && queuedJobs.value.length > 0) {
    alerts.push({
      variant: 'warning',
      title: 'Fila pressionada',
      message: `${queuedJobs.value.length} job(s) seguem pendentes, acima do volume já processado nesta visão.`
    });
  }
  if (categoryBreakdown.value.system > 0 && severityBreakdown.value.high > 0) {
    alerts.push({
      variant: 'info',
      title: 'Notificações críticas de sistema',
      message: 'Há sinais combinados de severidade alta e categoria sistêmica, úteis para cruzar com auditoria.'
    });
  }
  return alerts;
});

watch(currentStatus, () => {
  void loadNotifications();
});

function reload() {
  void Promise.all([loadNotifications(), loadJobs()]);
}

async function processPending() {
  processing.value = true;
  successMessage.value = '';

  try {
    const processed = await notificationService.processPending(10);
    successMessage.value = `${processed.length} notificação(ões) processada(s) com sucesso.`;
    await Promise.all([loadNotifications(), loadJobs()]);
  } catch (err: unknown) {
    notificationError.value =
      err instanceof Error ? err.message : 'Erro ao processar notificações';
  } finally {
    processing.value = false;
  }
}

function statusVariant(status: NotificationSummary['status']) {
  const map: Record<NotificationSummary['status'], 'warning' | 'success' | 'info'> = {
    queued: 'warning',
    sent: 'success',
    read: 'info'
  };
  return map[status];
}

function statusLabel(status: NotificationSummary['status']) {
  const map: Record<NotificationSummary['status'], string> = {
    queued: 'Pendente',
    sent: 'Enviada',
    read: 'Lida'
  };
  return map[status];
}

function severityVariant(severity: NotificationSummary['severity']) {
  const map: Record<NotificationSummary['severity'], 'info' | 'warning' | 'danger'> = {
    low: 'info',
    medium: 'warning',
    high: 'danger'
  };
  return map[severity];
}

function jobStatusLabel(status: NotificationJobSummary['status']) {
  const map: Record<NotificationJobSummary['status'], string> = {
    queued: 'Na fila',
    processed: 'Processado',
    failed: 'Falhou'
  };
  return map[status];
}

function jobStatusVariant(status: NotificationJobSummary['status']) {
  const map: Record<NotificationJobSummary['status'], 'warning' | 'success' | 'danger'> = {
    queued: 'warning',
    processed: 'success',
    failed: 'danger'
  };
  return map[status];
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function leadingCategoryLabel(): string {
  const entries = Object.entries(categoryBreakdown.value) as Array<[keyof typeof categoryBreakdown.value, number]>;
  const [winner, count] = entries.sort((a, b) => b[1] - a[1])[0] ?? ['operations', 0];
  if (count === 0) return 'Sem volume';
  const labels: Record<keyof typeof categoryBreakdown.value, string> = {
    billing: 'Billing',
    inventory: 'Estoque',
    operations: 'Operações',
    system: 'Sistema'
  };
  return labels[winner];
}

</script>

<style scoped>
.notifications-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.notifications-overview {
  margin-bottom: 4px;
}

.notifications-story {
  margin-bottom: 4px;
}

.notifications-intelligence,
.notifications-watch {
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
  font-size: 20px;
  font-weight: 800;
}

.insight-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.status-filters,
.notifications-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.notifications-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 768px) {
  .status-filters {
    gap: 6px;
  }
}
</style>

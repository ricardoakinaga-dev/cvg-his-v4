<template>
  <div class="notifications-page">
    <AppPageHeader title="Notificações" subtitle="Painel operacional de filas e jobs internos">
      <template #actions>
        <DsButton variant="secondary" :loading="processing" @click="processPending">
          Processar pendentes
        </DsButton>
      </template>
    </AppPageHeader>

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

watch(currentStatus, () => {
  void loadNotifications();
});

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

</script>

<style scoped>
.notifications-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

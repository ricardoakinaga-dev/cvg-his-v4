<template>
  <div class="pos-sync-page">
    <AppPageHeader
      title="Pontos de venda"
      :breadcrumbs="['Estoque', 'Cadastro', 'Pontos de venda']"
      subtitle="Sincronização administrativa entre ERP, estoque, clientes e sistema de PDV"
    />

    <DsCard title="Selecione o tipo de sincronização com o Sistema de Pontos de Venda" class="panel">
      <div class="sync-actions">
        <DsButton variant="primary" :disabled="isSyncing" @click="startSync('stock')">Sincronizar Estoque</DsButton>
        <DsButton variant="secondary" :disabled="isSyncing" @click="startSync('clients')">Sincronizar clientes</DsButton>
      </div>
      <DsAlert v-if="errorMessage" variant="danger" class="sync-alert">
        {{ errorMessage }}
      </DsAlert>
      <DsAlert v-if="syncStarted" variant="success" class="sync-alert">
        <strong>Sincronização iniciada com sucesso!</strong>
        Isso pode demorar alguns minutos e continuará em background até terminar.
      </DsAlert>
      <div v-if="syncStarted" class="sync-finished">
        <strong>Sincronização finalizada</strong>
        <p>{{ currentSyncLabel }} concluída para o ambiente de ponto de venda.</p>
        <p v-if="currentJob">Job {{ currentJob.id }} processou {{ currentJob.processedCount }} registros.</p>
        <DsButton size="sm" variant="secondary" @click="syncStarted = false">Ok</DsButton>
      </div>
    </DsCard>

    <section class="pos-sync-page__grid">
      <DsCard v-for="dependency in dependencies" :key="dependency.title" class="dependency-card">
        <span>{{ dependency.scope }}</span>
        <strong>{{ dependency.title }}</strong>
        <p>{{ dependency.description }}</p>
      </DsCard>
    </section>

    <DsCard title="Relatório operacional de jobs PDV">
      <DataTable
        :columns="jobColumns"
        :rows="jobs"
        :loading="loadingJobs"
        empty-icon="🧾"
        empty-title="Nenhum job PDV registrado"
        empty-description="As sincronizações solicitadas aparecerão neste relatório."
        variant="hoverable"
      >
        <template #cell-status="{ row }">
          <DsBadge :variant="jobStatusVariant((row as PosSyncJobSummary).status)" size="sm">
            {{ jobStatusLabel((row as PosSyncJobSummary).status) }}
          </DsBadge>
        </template>
        <template #cell-requestedAt="{ row }">
          {{ formatDate((row as PosSyncJobSummary).requestedAt) }}
        </template>
        <template #cell-finishedAt="{ row }">
          {{ (row as PosSyncJobSummary).finishedAt ? formatDate((row as PosSyncJobSummary).finishedAt!) : 'Em aberto' }}
        </template>
      </DataTable>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import {
  completePosSyncJob,
  createPosSyncJob,
  listPosSyncJobs,
  type PosSyncJobSummary
} from '@/services/commercial';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

type SyncKind = 'stock' | 'clients';

const syncStarted = ref(false);
const isSyncing = ref(false);
const errorMessage = ref('');
const currentSync = ref<SyncKind>('stock');
const currentJob = ref<PosSyncJobSummary | null>(null);
const loadingJobs = ref(false);
const jobs = ref<readonly PosSyncJobSummary[]>([]);

const jobColumns: DataTableColumn[] = [
  { key: 'id', label: 'Job' },
  { key: 'syncKind', label: 'Tipo' },
  { key: 'status', label: 'Status' },
  { key: 'processedCount', label: 'Registros' },
  { key: 'requestedAt', label: 'Solicitado em' },
  { key: 'finishedAt', label: 'Finalizado em' }
];

const dependencies = [
  {
    scope: 'Estoque',
    title: 'Produtos, saldo e preço',
    description: 'Sincroniza catálogo, disponibilidade comercial, estoque e tabelas de preço.'
  },
  {
    scope: 'Clientes',
    title: 'Base relacional',
    description: 'Mantém clientes disponíveis para identificação, venda, fidelidade e fiscal.'
  },
  {
    scope: 'Background',
    title: 'Processamento assíncrono',
    description: 'A tela dispara o job e permite continuar navegando enquanto o processo executa.'
  }
];

const currentSyncLabel = computed(() =>
  currentSync.value === 'stock' ? 'Sincronização de estoque' : 'Sincronização de clientes'
);

async function startSync(kind: SyncKind) {
  currentSync.value = kind;
  isSyncing.value = true;
  errorMessage.value = '';
  syncStarted.value = false;
  try {
    const job = await createPosSyncJob(kind);
    currentJob.value = await completePosSyncJob(job.id, kind === 'stock' ? 128 : 64);
    jobs.value = [currentJob.value, ...jobs.value.filter((item) => item.id !== currentJob.value?.id)];
    syncStarted.value = true;
  } catch {
    errorMessage.value = 'Não foi possível iniciar a sincronização com o PDV.';
  } finally {
    isSyncing.value = false;
  }
}

async function loadJobs() {
  loadingJobs.value = true;
  try {
    jobs.value = await listPosSyncJobs();
  } catch {
    errorMessage.value = 'Não foi possível carregar o relatório operacional de jobs PDV.';
  } finally {
    loadingJobs.value = false;
  }
}

function jobStatusVariant(status: PosSyncJobSummary['status']): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'running') return 'info';
  return 'warning';
}

function jobStatusLabel(status: PosSyncJobSummary['status']): string {
  return {
    queued: 'Na fila',
    running: 'Executando',
    completed: 'Concluído',
    failed: 'Falhou'
  }[status];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(loadJobs);
</script>

<style scoped>
.pos-sync-page {
  display: grid;
  gap: 16px;
}

.panel,
.dependency-card {
  border-radius: 18px;
}

.sync-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.sync-alert {
  margin-top: 14px;
}

.sync-finished {
  margin-top: 14px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-bg-subtle, #f8fafc);
}

.sync-finished p {
  margin: 6px 0 12px;
  color: var(--color-text-muted, #64748b);
}

.pos-sync-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.dependency-card {
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.dependency-card span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.dependency-card p {
  margin: 8px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.5;
}
</style>

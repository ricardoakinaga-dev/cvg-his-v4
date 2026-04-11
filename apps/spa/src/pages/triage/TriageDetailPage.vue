<template>
  <div class="triage-detail-page">
    <div v-if="loading" class="page-loading">
      <DsSpinner size="md" />
    </div>

    <template v-else-if="error">
      <DsAlert variant="danger" dismissible @dismiss="error = ''">
        {{ error }}
      </DsAlert>
      <DsButton variant="secondary" tag="a" to="/triage">Voltar para Triagem</DsButton>
    </template>

    <template v-else-if="record">
      <AppPageHeader :subtitle="detailSubtitle">
        <template #title>🧭 Triagem</template>
        <template #actions>
          <DsButton variant="secondary" size="sm" @click="showEdit = true">Editar</DsButton>
          <DsButton variant="secondary" size="sm" tag="a" to="/triage">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <DsCard title="Resumo da triagem">
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-item__label">Paciente</span>
            <strong>{{ record.patientId }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-item__label">Prioridade</span>
            <DsBadge :variant="priorityVariant(record.priority)">
              {{ priorityLabel(record.priority) }}
            </DsBadge>
          </div>
          <div class="summary-item">
            <span class="summary-item__label">Destino</span>
            <DsBadge :variant="destinationVariant(record.destination)">
              {{ destinationLabel(record.destination) }}
            </DsBadge>
          </div>
          <div class="summary-item">
            <span class="summary-item__label">Queixa</span>
            <strong>{{ record.chiefComplaint }}</strong>
          </div>
        </div>
      </DsCard>

      <div class="detail-section">
        <h2 class="detail-section__title">Informações da Triagem</h2>
        <div class="detail-row">
          <span class="detail-row__label">Paciente:</span>
          <span>{{ record.patientId }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Atendimento:</span>
          <span>{{ record.encounterId }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Prioridade:</span>
          <DsBadge :variant="priorityVariant(record.priority)">
            {{ priorityLabel(record.priority) }}
          </DsBadge>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Destino:</span>
          <DsBadge :variant="destinationVariant(record.destination)">
            {{ destinationLabel(record.destination) }}
          </DsBadge>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Queixa Principal:</span>
          <span>{{ record.chiefComplaint }}</span>
        </div>
        <div v-if="record.initialNotes" class="detail-row">
          <span class="detail-row__label">Notas Iniciais:</span>
          <span>{{ record.initialNotes }}</span>
        </div>
        <div v-if="record.alerts.length > 0" class="detail-row">
          <span class="detail-row__label">Alertas:</span>
          <span>
            <DsBadge v-for="alert in record.alerts" :key="alert" variant="danger" size="sm">
              {{ alert }}
            </DsBadge>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Triado por:</span>
          <span>{{ record.triagedByUserId }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Criado em:</span>
          <span>{{ formatDate(record.createdAt) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-row__label">Atualizado em:</span>
          <span>{{ formatDate(record.updatedAt) }}</span>
        </div>
      </div>

      <div class="detail-section">
        <h2 class="detail-section__title">Histórico de Versões</h2>
        <div v-if="versionsLoading" class="muted">
          <DsSpinner size="sm" inline label="Carregando histórico..." />
        </div>
        <div v-else-if="versions.length === 0" class="muted">Nenhuma alteração registrada.</div>
        <div v-else class="timeline">
          <div v-for="v in versions" :key="v.id" class="timeline__event">
            <div class="timeline__event-time">{{ formatDate(v.createdAt) }}</div>
            <div class="timeline__event-content">
              <strong>Campos alterados:</strong> {{ v.changedFields.join(', ') }}
              <div v-if="v.changedByUserId" class="muted">Por: {{ v.changedByUserId }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <DsModal
      v-if="showEdit"
      :open="showEdit"
      title="Editar Triagem"
      size="md"
      @close="showEdit = false"
    >
      <form @submit.prevent="handleUpdate">
        <DsInput id="edit-priority" v-model="editForm.priority" type="select" label="Prioridade">
          <option value="low">Baixa</option>
          <option value="medium">Média</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </DsInput>
        <DsInput id="edit-destination" v-model="editForm.destination" type="select" label="Destino">
          <option value="in_care">Em Atendimento</option>
          <option value="observation">Observação</option>
        </DsInput>
        <DsInput
          id="edit-complaint"
          v-model="editForm.chiefComplaint"
          type="textarea"
          label="Queixa Principal"
          :rows="3"
        />
        <DsInput
          id="edit-notes"
          v-model="editForm.initialNotes"
          type="textarea"
          label="Notas Iniciais"
          :rows="3"
        />
        <div class="modal-actions">
          <DsButton type="submit" variant="primary" :loading="updating">
            {{ updating ? 'Salvando...' : 'Salvar' }}
          </DsButton>
          <DsButton type="button" variant="ghost" @click="showEdit = false">Cancelar</DsButton>
        </div>
      </form>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { listTriageRecords, updateTriage, getTriageHistory } from '@/services/triage';
import type {
  TriageSummary,
  TriageVersionSummary,
  TriagePriority,
  TriageDestination
} from '@/types/triage';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { formatDate } from '@/utils/labels';

const route = useRoute();
const record = ref<TriageSummary | null>(null);
const error = ref('');
const loading = ref(true);
const versions = ref<TriageVersionSummary[]>([]);
const versionsLoading = ref(false);
const showEdit = ref(false);
const updating = ref(false);

const editForm = ref({
  priority: 'medium' as TriagePriority,
  destination: 'in_care' as TriageDestination,
  chiefComplaint: '',
  initialNotes: ''
});

const detailSubtitle = computed(() => {
  if (!record.value) return '';
  return `${record.value.id} • ${formatDate(record.value.createdAt)}`;
});

onMounted(async () => {
  const triageId = route.params.id as string;

  try {
    const records = await listTriageRecords();
    record.value = records.find((r) => r.id === triageId) || null;

    if (!record.value) {
      error.value = 'Registro de triagem não encontrado';
      loading.value = false;
      return;
    }

    editForm.value = {
      priority: record.value.priority,
      destination: record.value.destination,
      chiefComplaint: record.value.chiefComplaint,
      initialNotes: record.value.initialNotes || ''
    };

    versionsLoading.value = true;
    versions.value = await getTriageHistory(triageId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao carregar triagem';
    error.value = message;
  } finally {
    loading.value = false;
    versionsLoading.value = false;
  }
});

async function handleUpdate() {
  if (!record.value) return;
  updating.value = true;
  try {
    await updateTriage(record.value.id, { ...editForm.value });
    const records = await listTriageRecords();
    const updated = records.find((r) => r.id === record.value!.id) || null;
    record.value = updated;
    if (updated) {
      versions.value = await getTriageHistory(updated.id);
    }
    showEdit.value = false;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao atualizar triagem';
    error.value = message;
  } finally {
    updating.value = false;
  }
}

function priorityVariant(p: string): 'danger' | 'warning' | 'info' | 'default' {
  const map: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
    critical: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'default'
  };
  return map[p] || 'default';
}

function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa'
  };
  return map[p] || p;
}

function destinationVariant(d: string): 'success' | 'info' {
  return d === 'in_care' ? 'success' : 'info';
}

function destinationLabel(d: string): string {
  return d === 'in_care' ? 'Em Atendimento' : 'Observação';
}
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-item {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: var(--color-bg-subtle, #f8fafc);
}

.summary-item__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}
</style>

<style scoped>
.triage-detail-page {
  max-width: 800px;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline__event {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.timeline__event-time {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
  min-width: 140px;
}

.timeline__event-content {
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>

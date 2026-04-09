<template>
  <div class="queue-page">
    <AppPageHeader title="🏥 Fila Operacional">
      <template #subtitle v-if="lastRefresh">
        <span class="muted">Atualizado: {{ formatTime(lastRefresh.toISOString()) }}</span>
        <DsSpinner v-if="isRefreshing" size="sm" inline label="Atualizando..." />
      </template>
      <template #actions>
        <DsButton variant="secondary" @click="manualRefresh" :loading="isRefreshing">
          🔄 Atualizar
        </DsButton>
        <DsButton variant="secondary" tag="a" href="/scheduling">Voltar à Agenda</DsButton>
        <DsButton variant="success" @click="openCheckInModal">Check-in Rápido</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div v-if="loading" class="page-loading">
      <DsSpinner size="md" />
    </div>

    <EmptyState
      v-else-if="entries.length === 0"
      icon="🏥"
      title="Fila operacional vazia"
      description="Nenhum paciente aguardando atendimento."
    />

    <div v-else class="table-wrapper">
      <table class="data-table">
        <caption class="sr-only">
          Fila operacional de pacientes
        </caption>
        <thead>
          <tr>
            <th>Prioridade</th>
            <th>Paciente</th>
            <th>Check-in</th>
            <th>Status</th>
            <th>Tempo de Espera</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in sortedEntries" :key="entry.id">
            <td>
              <DsBadge :variant="priorityVariant(entry.priority)" size="sm">
                {{ priorityLabel(entry.priority) }}
              </DsBadge>
            </td>
            <td>
              <span v-if="patientNameCache[entry.patientId]">{{
                patientNameCache[entry.patientId]
              }}</span>
              <DsSpinner v-else size="sm" inline />
            </td>
            <td>{{ formatTime(entry.checkedInAt) }}</td>
            <td>
              <DsBadge :variant="queueStatusVariant(entry.status)" size="sm">
                {{ queueStatusLabel(entry.status) }}
              </DsBadge>
            </td>
            <td>{{ waitTime(entry.checkedInAt) }}</td>
            <td class="table__actions-col">
              <div class="actions-group">
                <DsButton
                  v-if="entry.status === 'waiting'"
                  variant="primary"
                  size="sm"
                  :loading="callingId === entry.id"
                  :disabled="callingId === entry.id"
                  @click="handleCall(entry.id)"
                >
                  {{ callingId === entry.id ? 'Chamando...' : 'Chamar' }}
                </DsButton>
                <DsButton
                  v-if="canStartCare(entry.status)"
                  variant="success"
                  size="sm"
                  :loading="startingCareId === entry.id"
                  :disabled="startingCareId === entry.id"
                  @click="handleStartCare(entry.id)"
                >
                  {{ startingCareId === entry.id ? 'Iniciando...' : 'Iniciar Atendimento' }}
                </DsButton>
                <DsButton
                  v-if="canNoShow(entry.status)"
                  variant="danger"
                  size="sm"
                  :loading="noShowId === entry.id"
                  :disabled="noShowId === entry.id"
                  @click="openNoShowConfirm(entry.id)"
                >
                  {{ noShowId === entry.id ? 'Registrando...' : 'No-Show' }}
                </DsButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Check-in Modal -->
    <DsModal :open="showCheckInModal" title="Check-in Rápido" size="sm" @close="closeCheckInModal">
      <div class="checkin-form">
        <div class="form-field">
          <label class="ds-input__label">Paciente *</label>
          <SearchSelect
            v-model="checkinForm.patientId"
            :options="patientOptions"
            placeholder="Buscar paciente..."
          />
          <p class="ds-input__hint">Selecione o paciente para check-in</p>
        </div>
        <DsInput
          id="checkin-priority"
          v-model="checkinForm.priority"
          type="select"
          label="Prioridade"
        >
          <option value="low">Baixa</option>
          <option value="medium" selected>Média</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </DsInput>
        <DsInput
          id="checkin-reason"
          v-model="checkinForm.reason"
          type="textarea"
          label="Motivo *"
          placeholder="Descreva o motivo do check-in"
          :rows="3"
          required
        />
      </div>
      <template #footer>
        <DsButton variant="ghost" @click="closeCheckInModal">Cancelar</DsButton>
        <DsButton
          variant="success"
          :loading="checkinSubmitting"
          :disabled="!canSubmitCheckIn"
          @click="submitCheckIn"
        >
          {{ checkinSubmitting ? 'Realizando...' : 'Confirmar Check-in' }}
        </DsButton>
      </template>
    </DsModal>

    <!-- No-Show Confirmation Modal -->
    <DsModal
      :open="showNoShowConfirm"
      title="Confirmar No-Show"
      size="sm"
      @close="closeNoShowConfirm"
    >
      <p class="noshow-confirm-text">
        Tem certeza que deseja marcar este paciente como <strong>não compareceu</strong>? Esta ação
        transicionará a entrada da fila para <strong>cancelado</strong>.
      </p>
      <template #footer>
        <DsButton variant="ghost" @click="closeNoShowConfirm">Cancelar</DsButton>
        <DsButton variant="danger" :loading="noShowSubmitting" @click="confirmNoShow">
          {{ noShowSubmitting ? 'Registrando...' : 'Confirmar No-Show' }}
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue';
import {
  listQueue,
  callQueueEntry,
  startCareQueueEntry,
  noShowQueueEntry,
  checkInQueue
} from '@/services/scheduling';
import type {
  QueueEntrySummary,
  QueueStatus,
  QueuePriority,
  CheckInQueueRequest
} from '@/types/scheduling';
import { QUEUE_STATUS_LABELS, QUEUE_PRIORITY_LABELS } from '@/types/scheduling';
import { useEntityCache } from '@/composables/useEntityCache';
import { patientService } from '@/services/patient';
import type { PatientSummary } from '@/types/patient';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import EmptyState from '@/components/EmptyState.vue';
import SearchSelect from '@/components/SearchSelect.vue';
import type { SearchSelectOption } from '@/components/SearchSelect.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const entries = ref<QueueEntrySummary[]>([]);
const loading = ref(true);
const error = ref('');
const successMessage = ref('');
const callingId = ref<string | null>(null);
const startingCareId = ref<string | null>(null);
const noShowId = ref<string | null>(null);
const entityCache = useEntityCache();

const lastRefresh = ref<Date | null>(null);
const isRefreshing = ref(false);
const isVisible = ref(true); // document visibility
const consecutiveErrors = ref(0);
const baseInterval = 30000; // 30s
const maxInterval = 300000; // 5min
const currentInterval = ref(baseInterval);
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);

const patientNameCache = ref<Record<string, string>>({});

const PRIORITY_ORDER: Record<QueuePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

const sortedEntries = computed(() => {
  return [...entries.value].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
  });
});

function queueStatusLabel(status: QueueStatus): string {
  return QUEUE_STATUS_LABELS[status] || status;
}

function queueStatusVariant(
  status: QueueStatus
): 'info' | 'warning' | 'success' | 'danger' | 'default' {
  const map: Record<QueueStatus, 'info' | 'warning' | 'success' | 'danger' | 'default'> = {
    waiting: 'info',
    called: 'warning',
    in_triage: 'warning',
    in_care: 'success',
    observation: 'info',
    completed: 'default',
    cancelled: 'danger'
  };
  return map[status] || 'default';
}

function priorityLabel(priority: QueuePriority): string {
  return QUEUE_PRIORITY_LABELS[priority] || priority;
}

function priorityVariant(priority: QueuePriority): 'danger' | 'warning' | 'info' | 'default' {
  const map: Record<QueuePriority, 'danger' | 'warning' | 'info' | 'default'> = {
    critical: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'default'
  };
  return map[priority] || 'default';
}

function waitTime(checkedInAt: string): string {
  const diff = Date.now() - new Date(checkedInAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h${remaining}min`;
}

function formatTime(d: string): string {
  try {
    return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function canStartCare(status: QueueStatus): boolean {
  return status === 'called' || status === 'in_triage';
}

function canNoShow(status: QueueStatus): boolean {
  return ['waiting', 'called', 'in_triage', 'in_care', 'observation'].includes(status);
}

async function handleCall(queueEntryId: string) {
  callingId.value = queueEntryId;
  try {
    await callQueueEntry(queueEntryId);
    await loadQueue();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao chamar paciente da fila';
  } finally {
    callingId.value = null;
  }
}

async function handleStartCare(queueEntryId: string) {
  startingCareId.value = queueEntryId;
  try {
    await startCareQueueEntry(queueEntryId);
    await loadQueue();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao iniciar atendimento';
  } finally {
    startingCareId.value = null;
  }
}

async function handleNoShow(queueEntryId: string) {
  noShowId.value = queueEntryId;
  try {
    await noShowQueueEntry(queueEntryId);
    await loadQueue();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar no-show';
  } finally {
    noShowId.value = null;
  }
}

// No-show confirmation modal state
const showNoShowConfirm = ref(false);
const noShowSubmitting = ref(false);
const pendingNoShowId = ref<string | null>(null);

function openNoShowConfirm(queueEntryId: string) {
  pendingNoShowId.value = queueEntryId;
  showNoShowConfirm.value = true;
}

function closeNoShowConfirm() {
  showNoShowConfirm.value = false;
  pendingNoShowId.value = null;
}

async function confirmNoShow() {
  if (!pendingNoShowId.value) return;

  noShowSubmitting.value = true;
  try {
    await handleNoShow(pendingNoShowId.value);
    closeNoShowConfirm();
  } catch {
    // error already set by handleNoShow
  } finally {
    noShowSubmitting.value = false;
  }
}

function startPolling() {
  if (pollTimer.value) clearInterval(pollTimer.value);
  pollTimer.value = setInterval(() => {
    if (isVisible.value) {
      loadQueue(true); // background refresh
    }
  }, currentInterval.value);
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

function handleVisibilityChange() {
  const visible = !document.hidden;
  if (visible === isVisible.value) {
    // No actual change, ignore spurious events
    return;
  }
  isVisible.value = visible;
  if (visible) {
    // Tab became visible — restart polling with current interval and refresh immediately
    startPolling();
    loadQueue(false); // foreground refresh
  } else {
    // Tab hidden — stop polling to save resources
    stopPolling();
  }
}

function manualRefresh() {
  return loadQueue(false); // foreground refresh
}

// Check-in modal state
const showCheckInModal = ref(false);
const checkinSubmitting = ref(false);
const patients = ref<PatientSummary[]>([]);

const patientOptions = computed<SearchSelectOption[]>(() =>
  patients.value.map((p) => ({
    label: p.name,
    value: p.id
  }))
);

const checkinForm = ref({
  patientId: '',
  priority: 'medium' as QueuePriority,
  reason: ''
});

const canSubmitCheckIn = computed(() => {
  return checkinForm.value.patientId && checkinForm.value.reason.trim();
});

function openCheckInModal() {
  checkinForm.value = { patientId: '', priority: 'medium', reason: '' };
  showCheckInModal.value = true;
}

function closeCheckInModal() {
  showCheckInModal.value = false;
  checkinForm.value = { patientId: '', priority: 'medium', reason: '' };
}

async function submitCheckIn() {
  if (!canSubmitCheckIn.value) return;

  checkinSubmitting.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const patient = patients.value.find((p) => p.id === checkinForm.value.patientId);
    if (!patient) {
      error.value = 'Paciente não encontrado';
      return;
    }

    const payload: CheckInQueueRequest = {
      patientId: checkinForm.value.patientId,
      ownerId: patient.primaryOwnerId,
      priority: checkinForm.value.priority,
      reason: checkinForm.value.reason.trim()
    };

    await checkInQueue(payload);
    successMessage.value = 'Check-in realizado com sucesso!';
    closeCheckInModal();
    await loadQueue();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao realizar check-in';
  } finally {
    checkinSubmitting.value = false;
  }
}

async function loadQueue(background = false) {
  if (background && (loading.value || isRefreshing.value)) {
    return; // Skip if already loading or refreshing
  }

  if (!background) {
    loading.value = true;
  } else {
    isRefreshing.value = true;
  }
  error.value = '';
  try {
    entries.value = await listQueue();
    await Promise.allSettled(
      entries.value.map(async (entry) => {
        if (!patientNameCache.value[entry.patientId]) {
          patientNameCache.value[entry.patientId] = await entityCache.getPatientName(
            entry.patientId
          );
        }
      })
    );
    lastRefresh.value = new Date();
    // Reset backoff on success
    if (consecutiveErrors.value > 0) {
      consecutiveErrors.value = 0;
      currentInterval.value = baseInterval;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar fila operacional';
    // Increment backoff on background refresh error
    if (background) {
      consecutiveErrors.value++;
      // Exponential backoff capped at maxInterval
      currentInterval.value = Math.min(
        baseInterval * Math.pow(2, consecutiveErrors.value),
        maxInterval
      );
    }
  } finally {
    loading.value = false;
    isRefreshing.value = false;
  }
}

async function loadPatients() {
  try {
    patients.value = await patientService.list();
  } catch {
    // Silently fail — check-in modal will show empty list
  }
}

onMounted(() => {
  // Set initial visibility state
  isVisible.value = !document.hidden;

  // Listen for tab visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange);

  Promise.all([loadQueue(), loadPatients()]).then(() => {
    if (isVisible.value) {
      startPolling();
    }
  });
});

onUnmounted(() => {
  stopPolling();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

defineExpose({
  consecutiveErrors,
  currentInterval,
  baseInterval,
  maxInterval,
  isVisible,
  startPolling,
  stopPolling,
  loadQueue,
  pollTimer,
  loading,
  isRefreshing
});
</script>

<style scoped>
.queue-page {
  max-width: 1280px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.actions-group {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.checkin-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.noshow-confirm-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-secondary, #475569);
}
</style>

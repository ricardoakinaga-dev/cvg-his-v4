<template>
  <div class="queue-page">
    <AppPageHeader title="Esteira de Atendimento">
      <template #subtitle>
        <span class="muted">
          Atendimento &gt; Esteira. Controle por setor, responsável, paciente, urgência, atendimento e comanda.
        </span>
        <span v-if="lastRefresh" class="muted">Atualizado: {{ formatTime(lastRefresh.toISOString()) }}</span>
        <DsSpinner v-if="isRefreshing" size="sm" inline label="Atualizando..." />
      </template>
      <template #actions>
        <DsButton variant="secondary" @click="manualRefresh" :loading="isRefreshing">
          🔄 Atualizar
        </DsButton>
        <DsButton variant="secondary" tag="a" href="/appointments">📅 Ver Agenda</DsButton>
        <DsButton variant="secondary" tag="a" href="/triage">🧭 Triagem</DsButton>
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

    <form v-else class="queue-filters" @submit.prevent="applyFilters">
      <div class="queue-filters__field">
        <label for="queue-sector">Setor Atual</label>
        <select id="queue-sector" v-model="draftFilters.sector">
          <option value="">Todas</option>
          <option v-for="sector in sectorOptions" :key="sector" :value="sector">
            {{ sector }}
          </option>
        </select>
      </div>
      <div class="queue-filters__field">
        <label for="queue-responsible">Profissional Responsável</label>
        <input
          id="queue-responsible"
          v-model="draftFilters.responsible"
          type="search"
          placeholder="Nome ou equipe"
        />
      </div>
      <div class="queue-filters__field">
        <label for="queue-client">Cliente</label>
        <input id="queue-client" v-model="draftFilters.client" type="search" placeholder="Tutor" />
      </div>
      <div class="queue-filters__field">
        <label for="queue-animal">ID Animal</label>
        <input
          id="queue-animal"
          v-model="draftFilters.patientId"
          type="search"
          placeholder="ID ou parte do ID"
        />
      </div>
      <label class="queue-filters__check">
        <input v-model="draftFilters.includeTerminal" type="checkbox" />
        <span>Todas</span>
      </label>
      <DsButton variant="primary" type="submit">Pesquisar</DsButton>
    </form>

    <EmptyState
      v-if="!loading && filteredRows.length === 0"
      icon="🏥"
      title="Nenhuma comanda nesta esteira"
      description="Nenhum paciente encontrado para os filtros atuais. Use Todas para incluir finalizados e cancelados ou faça um check-in rápido."
    >
      <template #action>
        <div class="queue-page__empty-actions">
          <DsButton variant="secondary" tag="a" href="/appointments">📅 Ver Agenda</DsButton>
          <DsButton variant="success" @click="openCheckInModal">Check-in Rápido</DsButton>
        </div>
      </template>
    </EmptyState>

    <div v-else-if="!loading" class="table-wrapper table-wrapper--wide">
      <table class="data-table">
        <caption class="sr-only">
          Esteira operacional de pacientes
        </caption>
        <thead>
          <tr>
            <th>Setor Atual</th>
            <th>Recebido em</th>
            <th>Enviado por</th>
            <th>Cliente</th>
            <th>Animal</th>
            <th>Em atendimento com</th>
            <th>Atendimento</th>
            <th>Urgência</th>
            <th>Comanda</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.entry.id">
            <td>
              <div class="queue-sector">
                <strong>{{ row.sector }}</strong>
                <span>{{ queueStatusLabel(row.entry.status) }}</span>
              </div>
            </td>
            <td>
              <span>{{ formatTime(row.entry.checkedInAt) }}</span>
              <small>{{ waitTime(row.entry.checkedInAt) }}</small>
            </td>
            <td>{{ row.sentBy }}</td>
            <td>
              <span v-if="ownerNameCache[row.entry.ownerId]">{{ ownerNameCache[row.entry.ownerId] }}</span>
              <DsSpinner v-else size="sm" inline />
            </td>
            <td>
              <div class="queue-patient">
                <strong v-if="patientNameCache[row.entry.patientId]">{{
                  patientNameCache[row.entry.patientId]
                }}</strong>
                <DsSpinner v-else size="sm" inline />
                <span>{{ row.entry.patientId }}</span>
              </div>
            </td>
            <td>{{ row.responsible }}</td>
            <td>
              <a
                v-if="row.entry.encounterId"
                class="queue-link"
                :href="`/encounters/${row.entry.encounterId}`"
              >
                Abrir
              </a>
              <span v-else>—</span>
            </td>
            <td>
              <DsBadge :variant="priorityVariant(row.entry.priority)" size="sm">
                {{ priorityLabel(row.entry.priority) }}
              </DsBadge>
            </td>
            <td>
              <a class="queue-link" href="/counter-sales">Comandas</a>
            </td>
            <td class="table__actions-col">
              <div class="actions-group">
                <DsButton
                  v-if="row.entry.status === 'waiting'"
                  variant="primary"
                  size="sm"
                  :loading="callingId === row.entry.id"
                  :disabled="callingId === row.entry.id"
                  @click="handleCall(row.entry.id)"
                >
                  {{ callingId === row.entry.id ? 'Chamando...' : 'Chamar' }}
                </DsButton>
                <DsButton
                  v-if="canHandleEncounter(row.entry)"
                  variant="success"
                  size="sm"
                  :loading="startingCareId === row.entry.id"
                  :disabled="startingCareId === row.entry.id"
                  @click="handleEncounterFlow(row.entry)"
                >
                  {{
                    startingCareId === row.entry.id ? 'Processando...' : encounterActionLabel(row.entry)
                  }}
                </DsButton>
                <DsButton
                  v-if="row.entry.encounterId"
                  tag="a"
                  :href="`/medical-records/${row.entry.encounterId}`"
                  variant="secondary"
                  size="sm"
                >
                  Prontuário
                </DsButton>
                <DsButton
                  v-if="canNoShow(row.entry.status)"
                  variant="danger"
                  size="sm"
                  :loading="noShowId === row.entry.id"
                  :disabled="noShowId === row.entry.id"
                  @click="openNoShowConfirm(row.entry.id)"
                >
                  {{ noShowId === row.entry.id ? 'Registrando...' : 'No-Show' }}
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  listQueue,
  callQueueEntry,
  noShowQueueEntry,
  checkInQueue
} from '@/services/scheduling';
import { encounterService } from '@/services/encounter';
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

const router = useRouter();
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
const ownerNameCache = ref<Record<string, string>>({});

interface QueueFilters {
  sector: string;
  responsible: string;
  client: string;
  patientId: string;
  includeTerminal: boolean;
}

interface EsteiraRow {
  entry: QueueEntrySummary;
  sector: string;
  sentBy: string;
  responsible: string;
}

const VETUS_SECTORS = [
  'Não Definido',
  'ADMINISTRAÇÃO',
  'BANHO E TOSA',
  'CIRURGIA',
  'CLINICA',
  'DIAGNOSTICO POR IMAGEM',
  'ESPECIALISTAS',
  'Estoque geral',
  'Farmacia',
  'INTERNAÇÃO',
  'LABORATÓRIO',
  'MANUTENÇÃO (LIMPEZA/COPA)',
  'RECEPÇÃO'
];

const emptyFilters = (): QueueFilters => ({
  sector: '',
  responsible: '',
  client: '',
  patientId: '',
  includeTerminal: true
});

const draftFilters = ref<QueueFilters>(emptyFilters());
const appliedFilters = ref<QueueFilters>(emptyFilters());

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

const esteiraRows = computed<EsteiraRow[]>(() =>
  sortedEntries.value.map((entry) => ({
    entry,
    sector: sectorForEntry(entry),
    sentBy: sentByForEntry(entry),
    responsible: responsibleForEntry(entry)
  }))
);

const sectorOptions = computed(() => {
  const used = esteiraRows.value.map((row) => row.sector);
  return [...new Set([...VETUS_SECTORS, ...used])];
});

const filteredRows = computed(() => {
  const filters = appliedFilters.value;
  const responsibleQuery = normalizeSearch(filters.responsible);
  const clientQuery = normalizeSearch(filters.client);
  const patientQuery = normalizeSearch(filters.patientId);

  return esteiraRows.value.filter((row) => {
    if (!filters.includeTerminal && ['completed', 'cancelled'].includes(row.entry.status)) {
      return false;
    }

    if (filters.sector && row.sector !== filters.sector) {
      return false;
    }

    if (responsibleQuery && !normalizeSearch(row.responsible).includes(responsibleQuery)) {
      return false;
    }

    const ownerName = ownerNameCache.value[row.entry.ownerId] ?? '';
    if (clientQuery && !normalizeSearch(ownerName).includes(clientQuery)) {
      return false;
    }

    const patientName = patientNameCache.value[row.entry.patientId] ?? '';
    const patientHaystack = normalizeSearch(`${row.entry.patientId} ${patientName}`);
    if (patientQuery && !patientHaystack.includes(patientQuery)) {
      return false;
    }

    return true;
  });
});

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function applyFilters() {
  appliedFilters.value = { ...draftFilters.value };
}

function sectorForEntry(entry: QueueEntrySummary): string {
  const map: Record<QueueStatus, string> = {
    waiting: 'RECEPÇÃO',
    called: 'RECEPÇÃO',
    in_triage: 'CLINICA',
    in_care: 'CLINICA',
    observation: 'INTERNAÇÃO',
    completed: 'Não Definido',
    cancelled: 'Não Definido'
  };
  return map[entry.status] ?? 'Não Definido';
}

function sentByForEntry(entry: QueueEntrySummary): string {
  const map: Record<QueueStatus, string> = {
    waiting: 'Recepção',
    called: 'Recepção',
    in_triage: 'Recepção',
    in_care: 'Triagem',
    observation: 'Clínica',
    completed: 'Clínica',
    cancelled: 'Recepção'
  };
  return map[entry.status] ?? 'Recepção';
}

function responsibleForEntry(entry: QueueEntrySummary): string {
  const map: Record<QueueStatus, string> = {
    waiting: '—',
    called: 'Equipe de triagem',
    in_triage: 'Equipe de triagem',
    in_care: 'Equipe clínica',
    observation: 'Equipe de internação',
    completed: '—',
    cancelled: '—'
  };
  return map[entry.status] ?? '—';
}

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

function canNoShow(status: QueueStatus): boolean {
  return ['waiting', 'called', 'in_triage', 'in_care', 'observation'].includes(status);
}

function canHandleEncounter(entry: QueueEntrySummary): boolean {
  if (entry.status === 'called') {
    return true;
  }

  if (entry.status === 'in_triage') {
    return Boolean(entry.encounterId);
  }

  if (entry.status === 'in_care' || entry.status === 'observation') {
    return Boolean(entry.encounterId);
  }

  return false;
}

function encounterActionLabel(entry: QueueEntrySummary): string {
  if (entry.status === 'called') {
    return 'Abrir triagem';
  }

  if (entry.status === 'in_triage') {
    return 'Entrar em atendimento';
  }

  return 'Continuar atendimento';
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

async function handleEncounterFlow(entry: QueueEntrySummary) {
  startingCareId.value = entry.id;
  try {
    if (!entry.encounterId) {
      const created = await encounterService.create({
        patientId: entry.patientId,
        ownerId: entry.ownerId,
        appointmentId: entry.appointmentId ?? undefined,
        queueEntryId: entry.id,
        visitType: entry.appointmentId ? 'scheduled' : 'walk_in',
        origin: entry.appointmentId ? 'schedule' : 'reception',
        reason: entry.reason
      });
      await encounterService.transition(created.id, { nextStatus: 'in_triage' });
      successMessage.value = 'Paciente encaminhado para triagem.';
      await loadQueue();
      await router.push(`/encounters/${created.id}`);
      return;
    }

    if (entry.status === 'in_triage') {
      await encounterService.transition(entry.encounterId, { nextStatus: 'in_care' });
      successMessage.value = 'Atendimento iniciado com sucesso.';
      await loadQueue();
      await router.push(`/encounters/${entry.encounterId}`);
      return;
    }

    await router.push(`/encounters/${entry.encounterId}`);
    return;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao conduzir fluxo de atendimento';
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
        if (!ownerNameCache.value[entry.ownerId]) {
          ownerNameCache.value[entry.ownerId] = await entityCache.getOwnerName(entry.ownerId);
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

.queue-filters {
  display: grid;
  grid-template-columns: minmax(180px, 1.1fr) repeat(3, minmax(150px, 1fr)) auto auto;
  gap: 12px;
  align-items: end;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.queue-filters__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-filters__field label,
.queue-filters__check {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary, #475569);
}

.queue-filters__field input,
.queue-filters__field select {
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
}

.queue-filters__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
}

.table-wrapper--wide {
  overflow-x: auto;
}

.queue-sector,
.queue-patient {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 128px;
}

.queue-sector strong,
.queue-patient strong {
  font-size: 13px;
  color: var(--color-text, #0f172a);
}

.queue-sector span,
.queue-patient span,
td small {
  font-size: 12px;
  color: var(--color-text-secondary, #64748b);
}

.queue-link {
  font-weight: 700;
  color: var(--color-primary, #2563eb);
  text-decoration: none;
}

.queue-link:hover {
  text-decoration: underline;
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

.queue-page__empty-actions {
  display: flex;
  gap: 8px;
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

@media (max-width: 1100px) {
  .queue-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .queue-filters {
    grid-template-columns: 1fr;
  }
}
</style>

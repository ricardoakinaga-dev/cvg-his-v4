<template>
  <div class="inpatient-detail-page">
    <div class="inpatient-detail-page__header">
      <h1 class="inpatient-detail-page__title">🛏️ Detalhes da Internação</h1>
      <router-link to="/inpatient" class="btn btn--secondary">Voltar</router-link>
    </div>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="card" width="100%" height="200px" />
    </div>

    <template v-else-if="stay">
      <div class="detail-section">
        <h2 class="detail-section__title">Informações da Internação</h2>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-item__label">Paciente</span>
            <span class="detail-item__value">{{ patientName(stay.patientId) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Atendimento</span>
            <span class="detail-item__value">
              <router-link :to="`/encounters/${stay.encounterId}`" class="encounter-link">
                {{ stay.encounterId.slice(0, 8) }}...
              </router-link>
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Status</span>
            <span class="detail-item__value">
              <StatusBadge
                :label="statusLabel(stay.status)"
                :variant="statusVariant(stay.status)"
              />
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Unidade</span>
            <span class="detail-item__value">{{ stay.unit }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Enfermaria</span>
            <span class="detail-item__value">{{ stay.ward }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Leito</span>
            <span class="detail-item__value">{{ stay.bed }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item__label">Admissão</span>
            <span class="detail-item__value">{{ formatDateTime(stay.admittedAt) }}</span>
          </div>
          <div v-if="stay.dischargedAt" class="detail-item">
            <span class="detail-item__label">Alta</span>
            <span class="detail-item__value">{{ formatDateTime(stay.dischargedAt) }}</span>
          </div>
          <div v-if="stay.dischargeReason" class="detail-item detail-item--full">
            <span class="detail-item__label">Motivo da Alta</span>
            <span class="detail-item__value">{{ stay.dischargeReason }}</span>
          </div>
        </div>
      </div>

      <div v-if="stay.status !== 'discharged'" class="detail-section">
        <h2 class="detail-section__title">Ações</h2>
        <div class="detail-actions">
          <button
            v-if="canTransitionTo('stable')"
            class="btn btn--primary"
            @click="updateStatus('stable')"
            :disabled="statusUpdating"
          >
            Marcar Estável
          </button>
          <button
            v-if="canTransitionTo('discharged')"
            class="btn btn--danger"
            @click="confirmDischarge"
            :disabled="statusUpdating"
          >
            Dar Alta
          </button>
        </div>
      </div>

      <DsModal
        :open="showDischargeModal"
        :teleport="false"
        title="Confirmar Alta"
        @close="showDischargeModal = false"
      >
        <DsInput
          id="dischargeReason"
          v-model="dischargeReason"
          type="textarea"
          label="Motivo da Alta"
          placeholder="Descreva o motivo da alta"
          :rows="3"
        />
        <DsAlert v-if="dischargeError" variant="danger">{{ dischargeError }}</DsAlert>

        <template #footer>
          <DsButton variant="secondary" @click="showDischargeModal = false">Cancelar</DsButton>
          <DsButton variant="danger" @click="doDischarge" :disabled="statusUpdating">
            Confirmar Alta
          </DsButton>
        </template>
      </DsModal>

      <DsAlert v-if="formError" variant="danger">{{ formError }}</DsAlert>
      <DsAlert v-if="successMessage" variant="success">{{ successMessage }}</DsAlert>

      <div class="detail-section">
        <div class="detail-section__header">
          <h2 class="detail-section__title">Evolução Clínica</h2>
          <button
            v-if="stay.status !== 'discharged'"
            class="btn btn--sm btn--primary"
            @click="showProgressForm = true"
          >
            + Nova Evolução
          </button>
        </div>

        <div v-if="showProgressForm" class="progress-form">
          <div class="form-field">
            <label for="progressNote" class="form-field__label">Nota de Evolução</label>
            <textarea
              id="progressNote"
              v-model="newProgressNote"
              class="form-field__input form-field__textarea"
              placeholder="Descreva a evolução do paciente..."
              rows="3"
            ></textarea>
          </div>
          <DsAlert v-if="progressError" variant="danger" dismissible @dismiss="progressError = ''">
            {{ progressError }}
          </DsAlert>
          <div class="progress-form__actions">
            <button
              class="btn btn--sm btn--primary"
              @click="submitProgress"
              :disabled="progressSubmitting"
            >
              {{ progressSubmitting ? 'Salvando...' : 'Salvar' }}
            </button>
            <button class="btn btn--sm btn--secondary" @click="cancelProgress">Cancelar</button>
          </div>
        </div>

        <div v-if="progressLoading" class="progress-loading">
          <DsSpinner size="sm" />
        </div>

        <div v-else-if="progressNotes.length === 0" class="progress-empty">
          <p>Nenhuma evolução registrada.</p>
        </div>

        <div v-else class="progress-list">
          <div v-for="note in progressNotes" :key="note.id" class="progress-note">
            <div class="progress-note__header">
              <span class="progress-note__date">{{ formatDateTime(note.createdAt) }}</span>
              <span class="progress-note__author">por {{ authorName(note.authoredByUserId) }}</span>
            </div>
            <div class="progress-note__content">{{ note.note }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { inpatientService } from '@/services/inpatient';
import type { InpatientStaySummary, InpatientProgressSummary } from '@/types/inpatient';
import { useEntityCache } from '@/composables/useEntityCache';
import { formatDateTime } from '@/utils/labels';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';

const route = useRoute();
const router = useRouter();
const entityCache = useEntityCache();

const stayId = route.params.id as string;
const stay = ref<InpatientStaySummary | null>(null);
const loading = ref(false);
const error = ref('');
const formError = ref('');
const successMessage = ref('');
const statusUpdating = ref(false);
const patientNameCache = ref('');

const showDischargeModal = ref(false);
const dischargeReason = ref('');
const dischargeError = ref('');

const progressNotes = ref<InpatientProgressSummary[]>([]);
const progressLoading = ref(false);
const showProgressForm = ref(false);
const newProgressNote = ref('');
const progressError = ref('');
const progressSubmitting = ref(false);
const authorNames = ref<Record<string, string>>({});

const VALID_TRANSITIONS: Record<string, string[]> = {
  admitted: ['stable', 'transferred', 'discharged'],
  stable: ['admitted', 'transferred', 'discharged'],
  transferred: ['admitted'],
  discharged: []
};

function canTransitionTo(target: string): boolean {
  if (!stay.value) return false;
  return VALID_TRANSITIONS[stay.value.status]?.includes(target) ?? false;
}

function statusLabel(s: InpatientStaySummary['status']) {
  const map: Record<string, string> = {
    admitted: 'Internado',
    stable: 'Estável',
    transferred: 'Transferido',
    discharged: 'Alta'
  };
  return map[s] || s;
}

function statusVariant(s: InpatientStaySummary['status']) {
  const map: Record<string, string> = {
    admitted: 'info',
    stable: 'success',
    transferred: 'warning',
    discharged: 'neutral'
  };
  return (map[s] || 'default') as any;
}

function patientName(id: string): string {
  return patientNameCache.value || `Paciente ${id.slice(0, 8)}...`;
}

function authorName(id: string): string {
  return authorNames.value[id] || `${id.slice(0, 8)}...`;
}

async function updateStatus(newStatus: InpatientStaySummary['status']) {
  statusUpdating.value = true;
  formError.value = '';
  successMessage.value = '';
  try {
    stay.value = await inpatientService.updateStatus(stayId, { status: newStatus });
    successMessage.value = `Status atualizado para ${statusLabel(newStatus)}!`;
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao atualizar status';
  } finally {
    statusUpdating.value = false;
  }
}

function confirmDischarge() {
  dischargeReason.value = '';
  dischargeError.value = '';
  showDischargeModal.value = true;
}

async function doDischarge() {
  if (!dischargeReason.value.trim()) {
    dischargeError.value = 'Motivo da alta é obrigatório';
    return;
  }
  statusUpdating.value = true;
  dischargeError.value = '';
  try {
    stay.value = await inpatientService.updateStatus(stayId, {
      status: 'discharged',
      dischargeReason: dischargeReason.value.trim()
    });
    showDischargeModal.value = false;
    successMessage.value = 'Alta registrada com sucesso!';
  } catch (err: unknown) {
    dischargeError.value = err instanceof Error ? err.message : 'Erro ao registrar alta';
  } finally {
    statusUpdating.value = false;
  }
}

async function loadProgress() {
  progressLoading.value = true;
  try {
    progressNotes.value = await inpatientService.listProgress(stayId);
    const authorIds = [...new Set(progressNotes.value.map((n) => n.authoredByUserId))];
    await entityCache.preloadUserNames(authorIds);
    for (const id of authorIds) {
      if (!authorNames.value[id]) {
        authorNames.value[id] = await entityCache.getUserName(id);
      }
    }
  } catch {
    progressNotes.value = [];
  } finally {
    progressLoading.value = false;
  }
}

async function submitProgress() {
  if (!newProgressNote.value.trim()) {
    progressError.value = 'Nota é obrigatória';
    return;
  }
  progressSubmitting.value = true;
  progressError.value = '';
  try {
    const note = await inpatientService.addProgress(stayId, newProgressNote.value.trim());
    if (!authorNames.value[note.authoredByUserId]) {
      authorNames.value[note.authoredByUserId] = await entityCache.getUserName(
        note.authoredByUserId
      );
    }
    progressNotes.value.unshift(note);
    newProgressNote.value = '';
    showProgressForm.value = false;
    successMessage.value = 'Evolução registrada com sucesso!';
  } catch (err: unknown) {
    progressError.value = err instanceof Error ? err.message : 'Erro ao registrar evolução';
  } finally {
    progressSubmitting.value = false;
  }
}

function cancelProgress() {
  showProgressForm.value = false;
  newProgressNote.value = '';
  progressError.value = '';
}

onMounted(async () => {
  loading.value = true;
  error.value = '';
  try {
    const stays = await inpatientService.list();
    const found = stays.find((s) => s.id === stayId);
    if (!found) {
      error.value = 'Internação não encontrada';
      return;
    }
    stay.value = found;
    patientNameCache.value = await entityCache.getPatientName(found.patientId);
    await loadProgress();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar internação';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.inpatient-detail-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.inpatient-detail-page__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}
.detail-section {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--color-surface, #ffffff);
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
}
.detail-section__title {
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-primary-600, #2563eb);
  padding-bottom: 8px;
  border-bottom: 2px solid var(--color-border, #e2e8f0);
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-item--full {
  grid-column: 1 / -1;
}
.detail-item__label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #94a3b8);
}
.detail-item__value {
  font-size: 15px;
  color: var(--color-text, #0f172a);
}
.detail-actions {
  display: flex;
  gap: 12px;
}
.encounter-link {
  color: var(--color-primary-600, #2563eb);
  text-decoration: none;
  font-weight: 500;
}
.encounter-link:hover {
  text-decoration: underline;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: var(--color-surface, #ffffff);
  border-radius: 12px;
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.12));
  width: 100%;
  max-width: 480px;
}
.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}
.modal__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.modal__close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-muted, #94a3b8);
  padding: 4px;
  min-height: auto;
}
.modal__body {
  padding: 20px;
}
.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-field__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #475569);
}
.form-field__input {
  padding: 10px 14px;
  font-size: 15px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  min-height: 44px;
}
.form-field__textarea {
  resize: vertical;
  min-height: 80px;
}
.alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}
.alert--danger {
  background: var(--color-danger-50, #fef2f2);
  border: 1px solid var(--color-danger-200, #fecaca);
  color: var(--color-danger-700, #b91c1c);
}
.alert--success {
  background: var(--color-success-50, #ecfdf5);
  border: 1px solid var(--color-success-200, #a7f3d0);
  color: var(--color-success-700, #047857);
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  min-height: 44px;
  cursor: pointer;
  border: none;
  transition: background 0.15s ease;
}
.btn--primary {
  background: var(--color-primary-600, #2563eb);
  color: #ffffff;
}
.btn--primary:hover:not(:disabled) {
  background: var(--color-primary-700, #1d4ed8);
}
.btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn--secondary {
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  border: 1px solid var(--color-border-strong, #cbd5e1);
}
.btn--secondary:hover {
  background: var(--color-surface-hover, #f8fafc);
}
.btn--danger {
  background: var(--color-danger-600, #dc2626);
  color: #ffffff;
}
.btn--danger:hover:not(:disabled) {
  background: var(--color-danger-700, #b91c1c);
}
.btn--danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.detail-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.detail-section__header .detail-section__title {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}
.progress-form {
  margin-bottom: 16px;
  padding: 16px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
}
.progress-form__actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.progress-loading {
  padding: 24px 0;
  text-align: center;
}
.progress-empty {
  padding: 24px 0;
  text-align: center;
  color: var(--color-text-muted, #94a3b8);
  font-size: 14px;
}
.progress-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.progress-note {
  padding: 14px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
  border-left: 3px solid var(--color-primary-500, #3b82f6);
}
.progress-note__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.progress-note__date {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}
.progress-note__author {
  font-size: 11px;
  color: var(--color-text-muted, #94a3b8);
}
.progress-note__content {
  font-size: 14px;
  color: var(--color-text, #0f172a);
  line-height: 1.5;
  white-space: pre-wrap;
}
</style>

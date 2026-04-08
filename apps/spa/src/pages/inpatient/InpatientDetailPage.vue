<template>
  <div class="inpatient-detail-page">
    <AppPageHeader title="🛏️ Detalhes da Internação">
      <template #actions>
        <DsButton variant="secondary" tag="a" href="/inpatient">Lista de Internações</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="card" width="100%" height="200px" />
    </div>

    <template v-else-if="stay">
      <AppDetailSection title="Informações da Internação">
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
      </AppDetailSection>

      <AppDetailSection v-if="stay.status !== 'discharged'" title="Ações">
        <div class="detail-actions">
          <DsButton
            v-if="canTransitionTo('stable')"
            variant="primary"
            :loading="statusUpdating"
            @click="updateStatus('stable')"
          >
            Marcar Estável
          </DsButton>
          <DsButton
            v-if="canTransitionTo('discharged')"
            variant="danger"
            :loading="statusUpdating"
            @click="confirmDischarge"
          >
            Dar Alta
          </DsButton>
        </div>
      </AppDetailSection>

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

      <AppDetailSection title="Evolução Clínica">
        <div v-if="stay.status !== 'discharged'" class="mb-4">
          <DsButton variant="primary" size="sm" @click="showProgressForm = true">
            + Nova Evolução
          </DsButton>
        </div>

        <div v-if="showProgressForm" class="progress-form">
          <DsInput
            id="progressNote"
            v-model="newProgressNote"
            type="textarea"
            label="Nota de Evolução"
            placeholder="Descreva a evolução do paciente..."
            :rows="3"
          />
          <DsAlert v-if="progressError" variant="danger" dismissible @dismiss="progressError = ''">
            {{ progressError }}
          </DsAlert>
          <div class="progress-form__actions">
            <DsButton
              variant="primary"
              size="sm"
              :loading="progressSubmitting"
              @click="submitProgress"
            >
              {{ progressSubmitting ? 'Salvando...' : 'Salvar' }}
            </DsButton>
            <DsButton variant="secondary" size="sm" @click="cancelProgress">Cancelar</DsButton>
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
      </AppDetailSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { inpatientService } from '@/services/inpatient';
import type { InpatientStaySummary, InpatientProgressSummary } from '@/types/inpatient';
import { useEntityCache } from '@/composables/useEntityCache';
import { formatDateTime } from '@/utils/labels';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';

const route = useRoute();
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
.page-loading {
  padding: 24px 0;
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
.mb-4 {
  margin-bottom: 1rem;
}
</style>

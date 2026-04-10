<template>
  <div class="encounter-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </div>
    </div>
    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <template v-else-if="encounter">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">🩺 Atendimento</h1>
          <p class="page-header__subtitle">
            <StatusBadge
              :label="encounterStatusLabel(encounter.status)"
              :variant="encounterStatusVariant(encounter.status)"
            />
          </p>
        </div>
        <div class="page-header__actions">
          <DsButton v-if="canTransition" variant="secondary" @click="showTransitionModal = true">
            Transicionar Status
          </DsButton>
          <DsButton v-if="canClose" variant="danger" @click="showCloseModal = true">
            Fechar Atendimento
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/encounters">Voltar</DsButton>
        </div>
      </div>

      <div class="encounter-detail-page__grid">
        <DsCard title="Informações">
          <div class="detail-row">
            <span class="detail-row__label">Tipo</span>
            <span>{{ visitTypeLabel(encounter.visitType) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Origem</span>
            <span>{{ encounterOriginLabel(encounter.origin) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Paciente</span>
            <span>{{ patientName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Tutor</span>
            <span>{{ ownerName }}</span>
          </div>
        </DsCard>

        <DsCard title="Queixa Principal">
          <p>{{ encounter.reason }}</p>
        </DsCard>

        <DsCard title="Timeline">
          <div v-if="timelineLoading" class="muted">Carregando timeline...</div>
          <div v-else-if="timeline.length === 0" class="muted">Nenhum evento registrado</div>
          <div v-else class="timeline-list">
            <div v-for="event in timeline" :key="event.id" class="timeline-event">
              <span class="timeline-event__type">{{
                encounterEventTypeLabel(event.eventType)
              }}</span>
              <span class="timeline-event__summary">{{ event.summary }}</span>
              <span class="timeline-event__time">{{ formatDateTime(event.occurredAt) }}</span>
            </div>
          </div>
        </DsCard>

        <DsCard v-if="encounter.closeReason" title="Motivo do Fechamento">
          <p>{{ encounter.closeReason }}</p>
        </DsCard>

        <DsCard title="Anexos">
          <div v-if="attachmentsLoading" class="muted">Carregando anexos...</div>
          <div v-else-if="attachments.length === 0" class="muted">Nenhum anexo registrado</div>
          <div v-else class="attachments-list">
            <div v-for="att in attachments" :key="att.id" class="attachment-item">
              <span class="attachment-item__icon">📎</span>
              <span class="attachment-item__name">{{ att.fileName }}</span>
              <span class="attachment-item__category">{{ att.category }}</span>
            </div>
          </div>
          <div class="attachment-upload">
            <DsInput v-model="newAttachment.fileName" label="" placeholder="Nome do arquivo" />
            <DsInput v-model="newAttachment.mimeType" label="" placeholder="MIME type" />
            <DsInput v-model="newAttachment.checksum" label="" placeholder="Checksum" />
            <DsButton variant="secondary" size="sm" :loading="uploadingAttachment" @click="uploadAttachment">
              Anexar
            </DsButton>
          </div>
        </DsCard>
      </div>
    </template>

    <DsModal
      :open="showTransitionModal"
      :teleport="false"
      title="Transicionar Status"
      size="sm"
      @close="showTransitionModal = false"
    >
      <div class="transition-options">
        <DsButton
          v-for="opt in availableTransitions"
          :key="opt"
          variant="secondary"
          @click="handleTransition(opt)"
        >
          {{ encounterStatusLabel(opt) }}
        </DsButton>
      </div>
      <DsButton variant="ghost" @click="showTransitionModal = false">Cancelar</DsButton>
    </DsModal>

    <DsModal
      :open="showCloseModal"
      :teleport="false"
      title="Fechar Atendimento"
      size="md"
      @close="showCloseModal = false"
    >
      <div class="form-field">
        <label for="closeReason" class="form-field__label">Motivo do fechamento *</label>
        <DsInput
          id="closeReason"
          v-model="closeReason"
          type="textarea"
          :rows="3"
          placeholder="Descreva o motivo..."
        />
      </div>
      <template #footer>
        <DsButton variant="danger" :disabled="!closeReason.trim() || closing" @click="handleClose">
          {{ closing ? 'Fechando...' : 'Fechar' }}
        </DsButton>
        <DsButton variant="ghost" @click="showCloseModal = false">Cancelar</DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { encounterService } from '@/services/encounter';
import { attachmentService } from '@/services/attachments';
import type { EncounterSummary, EncounterTimelineEventSummary } from '@/types/encounter';
import {
  visitTypeLabel,
  encounterStatusLabel,
  encounterOriginLabel,
  encounterEventTypeLabel,
  encounterAllowedTransitions,
  formatDateTime
} from '@/utils/labels';
import { useEntityCache } from '@/composables/useEntityCache';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const route = useRoute();
const encounter = ref<EncounterSummary | null>(null);
const timeline = ref<EncounterTimelineEventSummary[]>([]);
const loading = ref(true);
const timelineLoading = ref(false);
const error = ref('');
const showTransitionModal = ref(false);
const showCloseModal = ref(false);
const closeReason = ref('');
const closing = ref(false);
const entityCache = useEntityCache();
const attachments = ref<any[]>([]);
const attachmentsLoading = ref(false);
const uploadingAttachment = ref(false);
const newAttachment = ref({ fileName: '', mimeType: 'application/pdf', checksum: '' });

const patientName = ref('');
const ownerName = ref('');

function encounterStatusVariant(s: string) {
  const map: Record<string, string> = {
    reception: 'info',
    in_triage: 'warning',
    in_care: 'default',
    observation: 'info',
    closed: 'neutral'
  };
  return (map[s] || 'default') as any;
}

async function loadEntityNames(enc: EncounterSummary) {
  patientName.value = await entityCache.getPatientName(enc.patientId);
  ownerName.value = await entityCache.getOwnerName(enc.ownerId);
}

const canTransition = computed(() => {
  return (
    encounter.value &&
    encounter.value.status !== 'closed' &&
    encounterAllowedTransitions[encounter.value.status]?.length > 0
  );
});
const canClose = computed(() => {
  return encounter.value && encounter.value.status !== 'closed';
});
const availableTransitions = computed(() => {
  return encounter.value ? encounterAllowedTransitions[encounter.value.status] || [] : [];
});

async function handleTransition(nextStatus: string) {
  if (!encounter.value) return;
  try {
    await encounterService.transition(encounter.value.id, { nextStatus: nextStatus as any });
    encounter.value.status = nextStatus as any;
    showTransitionModal.value = false;
    await loadTimeline();
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'Erro ao transicionar');
  }
}

async function handleClose() {
  if (!encounter.value || !closeReason.value.trim()) return;
  closing.value = true;
  try {
    await encounterService.close(encounter.value.id, { closeReason: closeReason.value.trim() });
    encounter.value.status = 'closed';
    encounter.value.closeReason = closeReason.value.trim();
    showCloseModal.value = false;
    closeReason.value = '';
    await loadTimeline();
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'Erro ao fechar');
  } finally {
    closing.value = false;
  }
}

async function loadTimeline() {
  if (!encounter.value) return;
  timelineLoading.value = true;
  try {
    timeline.value = await encounterService.getTimeline(encounter.value.id);
  } catch {
    // Timeline load failure is non-critical
  } finally {
    timelineLoading.value = false;
  }
}

async function loadAttachments() {
  if (!encounter.value) return;
  attachmentsLoading.value = true;
  try {
    attachments.value = await attachmentService.list('encounter', encounter.value.id);
  } catch {
    // Attachment load failure is non-critical
  } finally {
    attachmentsLoading.value = false;
  }
}

async function uploadAttachment() {
  if (!encounter.value || !newAttachment.value.fileName.trim() || !newAttachment.value.checksum.trim()) return;
  uploadingAttachment.value = true;
  try {
    await attachmentService.upload({
      linkedEntityType: 'encounter',
      linkedEntityId: encounter.value.id,
      category: 'document',
      fileName: newAttachment.value.fileName.trim(),
      mimeType: newAttachment.value.mimeType.trim() || 'application/pdf',
      checksum: newAttachment.value.checksum.trim()
    });
    newAttachment.value = { fileName: '', mimeType: 'application/pdf', checksum: '' };
    await loadAttachments();
  } catch {
    // Upload failure is non-critical
  } finally {
    uploadingAttachment.value = false;
  }
}

onMounted(async () => {
  const id = route.params.id as string;
  try {
    const enc = await encounterService.getById(id);
    encounter.value = enc;
    await loadEntityNames(enc);
    await Promise.all([loadTimeline(), loadAttachments()]);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar atendimento';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.encounter-detail-page__grid {
  display: grid;
  gap: 16px;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-event {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
  font-size: 13px;
}

.timeline-event__type {
  font-weight: 600;
  flex-shrink: 0;
}

.timeline-event__summary {
  flex: 1;
}

.timeline-event__time {
  color: var(--color-text-muted, #94a3b8);
  flex-shrink: 0;
}

.transition-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
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

.form-field__textarea {
  resize: vertical;
  min-height: 80px;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.attachment-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 6px;
  font-size: 13px;
}

.attachment-item__icon {
  flex-shrink: 0;
}

.attachment-item__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-item__category {
  font-size: 11px;
  color: var(--color-text-muted, #94a3b8);
  text-transform: uppercase;
}

.attachment-upload {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 8px;
  align-items: end;
}
</style>

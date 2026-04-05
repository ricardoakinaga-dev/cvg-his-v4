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
          <router-link to="/encounters" class="btn btn--secondary">Voltar</router-link>
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
        <textarea
          id="closeReason"
          v-model="closeReason"
          class="form-field__input form-field__textarea"
          rows="3"
          placeholder="Descreva o motivo..."
        ></textarea>
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

onMounted(async () => {
  const id = route.params.id as string;
  try {
    const enc = await encounterService.getById(id);
    encounter.value = enc;
    await loadEntityNames(enc);
    await loadTimeline();
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

.form-field__input {
  padding: 10px 14px;
  font-size: 15px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  min-height: 44px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.form-field__textarea {
  resize: vertical;
  min-height: 80px;
}

.form-field__input:focus {
  outline: none;
  border-color: var(--color-primary-500, #3b82f6);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.4);
}
</style>

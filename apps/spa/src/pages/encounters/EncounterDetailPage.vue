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
      <AppPageHeader :breadcrumbs="['Atendimento', 'Atendimentos', 'Atendimento', patientName || 'Detalhes']">
        <template #title>🩺 Atendimento</template>
        <template #subtitle>
          <StatusBadge
            :label="encounterStatusLabel(encounter.status)"
            :variant="encounterStatusVariant(encounter.status)"
          />
          <span class="muted">{{ patientName || 'Paciente em carregamento' }}</span>
        </template>
        <template #actions>
          <DsButton variant="secondary" tag="a" :to="`/medical-records/${encounter.id}`">
            Ver prontuário
          </DsButton>
          <DsButton variant="ghost" tag="a" :to="`/patients/${encounter.patientId}`">
            Ver paciente
          </DsButton>
          <DsButton variant="secondary" :loading="financialLoading" @click="refreshEnterpriseSummary">
            Atualizar resumo
          </DsButton>
          <DsButton v-if="encounter.status !== 'closed'" variant="secondary" @click="showFinancialCloseModal = true">
            Fechar Financeiro
          </DsButton>
          <DsButton v-if="canTransition" variant="secondary" @click="showTransitionModal = true">
            Transicionar Status
          </DsButton>
          <DsButton v-if="canClose" variant="danger" @click="showCloseModal = true">
            Fechar Atendimento
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/encounters">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <section class="summary-grid">
        <DsCard v-for="item in summaryCards" :key="item.label" variant="elevated" class="summary-card">
          <div class="summary-card__icon">{{ item.icon }}</div>
          <div class="summary-card__body">
            <span class="summary-card__value">{{ item.value }}</span>
            <span class="summary-card__label">{{ item.label }}</span>
          </div>
        </DsCard>
      </section>

      <div class="encounter-detail-page__grid">
        <DsCard title="Contexto assistencial">
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
          <div v-else-if="timeline.length === 0" class="muted">Nenhum evento registrado ainda neste atendimento.</div>
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

        <DsCard title="Resumo enterprise">
          <div v-if="financialLoading && !encounterSummary" class="muted">Carregando resumo operacional...</div>
          <div v-else class="detail-grid">
            <div class="detail-row">
              <span class="detail-row__label">Pedidos diagnósticos</span>
              <span>{{ encounterSummary?.diagnostics.totalOrders ?? 0 }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Pedidos pendentes</span>
              <span>{{ encounterSummary?.diagnostics.pendingOrders ?? 0 }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Resultados liberados</span>
              <span>{{ encounterSummary?.diagnostics.releasedResults ?? 0 }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Total financeiro</span>
              <span>{{ formatMoney(financialSummary?.total ?? 0) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Pago</span>
              <span>{{ formatMoney(financialSummary?.paidAmount ?? 0) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Saldo</span>
              <span>{{ formatMoney(financialSummary?.balanceDue ?? 0) }}</span>
            </div>
          </div>
        </DsCard>

        <DsCard v-if="encounter.closeReason" title="Motivo do Fechamento">
          <p>{{ encounter.closeReason }}</p>
        </DsCard>

        <DsCard title="Anexos">
          <div v-if="attachmentsLoading" class="muted">Carregando anexos...</div>
          <div v-else-if="attachments.length === 0" class="muted">Nenhum anexo registrado. Use este espaço para complementar o caso clínico.</div>
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
      :open="showFinancialCloseModal"
      :teleport="false"
      title="Fechar Financeiro"
      size="md"
      @close="showFinancialCloseModal = false"
    >
      <div class="form-field">
        <label for="financialPaidAmount" class="form-field__label">Valor pago</label>
        <DsInput id="financialPaidAmount" v-model.number="financialPaidAmount" type="number" />
      </div>
      <div class="form-field">
        <label for="financialNotes" class="form-field__label">Notas</label>
        <DsInput
          id="financialNotes"
          v-model="financialNotes"
          type="textarea"
          :rows="3"
          placeholder="Observações do fechamento financeiro"
        />
      </div>
      <template #footer>
        <DsButton variant="primary" :loading="closingFinancial" @click="handleFinancialClose">
          {{ closingFinancial ? 'Fechando...' : 'Confirmar fechamento' }}
        </DsButton>
        <DsButton variant="ghost" @click="showFinancialCloseModal = false">Cancelar</DsButton>
      </template>
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
import type {
  EncounterSummary,
  EncounterTimelineEventSummary,
  EncounterFinancialSummary,
  EncounterSummaryResponse
} from '@/types/encounter';
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
import AppPageHeader from '@/components/AppPageHeader.vue';

const route = useRoute();
const encounter = ref<EncounterSummary | null>(null);
const timeline = ref<EncounterTimelineEventSummary[]>([]);
const loading = ref(true);
const timelineLoading = ref(false);
const financialLoading = ref(false);
const error = ref('');
const showTransitionModal = ref(false);
const showFinancialCloseModal = ref(false);
const showCloseModal = ref(false);
const closeReason = ref('');
const closing = ref(false);
const closingFinancial = ref(false);
const financialPaidAmount = ref(0);
const financialNotes = ref('');
const entityCache = useEntityCache();
const attachments = ref<any[]>([]);
const attachmentsLoading = ref(false);
const uploadingAttachment = ref(false);
const newAttachment = ref({ fileName: '', mimeType: 'application/pdf', checksum: '' });

const patientName = ref('');
const ownerName = ref('');
const financialSummary = ref<EncounterFinancialSummary | null>(null);
const encounterSummary = ref<EncounterSummaryResponse | null>(null);

const summaryCards = computed(() => [
  { icon: '🐾', label: 'Paciente', value: patientName.value || 'Carregando...' },
  { icon: '👤', label: 'Tutor', value: ownerName.value || 'Carregando...' },
  { icon: '🧭', label: 'Tipo', value: encounter.value ? visitTypeLabel(encounter.value.visitType) : '—' },
  { icon: '⚡', label: 'Status', value: encounter.value ? encounterStatusLabel(encounter.value.status) : '—' }
]);

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

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
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

async function refreshEnterpriseSummary() {
  if (!encounter.value) return;
  financialLoading.value = true;
  try {
    const summary = await encounterService.getSummary(encounter.value.id);
    encounterSummary.value = summary;
    financialSummary.value = summary.financial;
  } catch {
    try {
      financialSummary.value = await encounterService.getFinancialSummary(encounter.value.id);
    } catch {
      financialSummary.value = null;
    }
  } finally {
    financialLoading.value = false;
  }
}

async function handleFinancialClose() {
  if (!encounter.value) return;
  closingFinancial.value = true;
  try {
    financialSummary.value = await encounterService.closeFinancial(encounter.value.id, {
      paidAmount: Number(financialPaidAmount.value || 0),
      notes: financialNotes.value.trim() || null
    });
    showFinancialCloseModal.value = false;
    financialNotes.value = '';
    await refreshEnterpriseSummary();
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'Erro ao fechar financeiro');
  } finally {
    closingFinancial.value = false;
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
    await Promise.all([loadTimeline(), loadAttachments(), refreshEnterpriseSummary()]);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar atendimento';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
}

.summary-card__icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.08);
  font-size: 22px;
}

.summary-card__body {
  display: flex;
  flex-direction: column;
}

.summary-card__value {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  line-height: 1.15;
}

.summary-card__label {
  font-size: 13px;
  color: var(--color-text-muted, #94a3b8);
  margin-top: 4px;
}

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

@media (max-width: 960px) {
  .attachment-upload {
    grid-template-columns: 1fr;
  }
}
</style>

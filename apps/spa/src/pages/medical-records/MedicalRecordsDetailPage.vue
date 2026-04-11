<template>
  <div class="medical-records-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </div>
    </div>

    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <template v-else-if="record">
      <AppPageHeader title="📋 Prontuário Clínico" :subtitle="`Paciente: ${patientName}`">
        <template #subtitle>
          <StatusBadge
            :label="record.status === 'open' ? 'Aberto' : 'Concluído'"
            :variant="record.status === 'open' ? 'warning' : 'success'"
          />
          <span class="muted" style="margin-left: 8px"> Paciente: {{ patientName }} </span>
        </template>
        <template #actions>
          <DsButton variant="primary" @click="showNewEntryModal = true">+ Nova Entrada</DsButton>
          <DsButton variant="secondary" tag="a" to="/medical-records">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <DsCard title="Ficha resumida">
        <div class="summary-grid">
          <div v-for="card in summaryCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>

      <div class="medical-records-detail-page__grid">
        <!-- Clinical Entries -->
        <AppDetailSection title="Entradas Clínicas">
          <div v-if="entries.length === 0" class="muted">
            Nenhuma entrada clínica registrada ainda.
          </div>

          <div v-else class="entries-list">
            <div
              v-for="entry in activeEntries"
              :key="entry.id"
              class="entry-card"
              :class="{ 'entry-card--archived': entry.deletedAt }"
            >
              <div class="entry-card__header">
                <span class="entry-card__type">{{ entryTypeLabel(entry.entryType) }}</span>
                <span class="entry-card__version">v{{ entry.version }}</span>
                <span class="entry-card__date">{{ formatDateTime(entry.createdAt) }}</span>
              </div>
              <h3 class="entry-card__title">{{ entry.title }}</h3>
              <p class="entry-card__content">{{ entry.content }}</p>
              <div class="entry-card__footer">
                <span class="muted">Por: {{ entry.authoredByUserId.slice(0, 8) }}...</span>
                <DsButton
                  v-if="!entry.deletedAt"
                  size="sm"
                  variant="secondary"
                  @click="openEditEntry(entry)"
                >
                  Editar
                </DsButton>
                <DsButton
                  v-if="!entry.deletedAt"
                  size="sm"
                  variant="danger"
                  @click="openArchiveEntry(entry)"
                >
                  Arquivar
                </DsButton>
              </div>
              <div v-if="entry.deletedAt" class="entry-card__archived">
                Arquivado em {{ formatDate(entry.deletedAt) }}
                <span v-if="entry.deleteReason"> — Motivo: {{ entry.deleteReason }}</span>
              </div>
            </div>
          </div>
        </AppDetailSection>

        <!-- Timeline -->
        <AppDetailSection title="Timeline Clínica">
          <div v-if="timelineLoading" class="muted">Carregando timeline...</div>
          <div v-else-if="timeline.length === 0" class="muted">Nenhum evento registrado</div>
          <div v-else class="timeline-list">
            <div v-for="event in timeline" :key="event.id" class="timeline-event">
              <span class="timeline-event__type">{{
                timelineEventTypeLabel(event.eventType)
              }}</span>
              <span class="timeline-event__summary">{{ event.summary }}</span>
              <span class="timeline-event__time">{{ formatDateTime(event.occurredAt) }}</span>
            </div>
          </div>
        </AppDetailSection>
      </div>
    </template>

    <!-- New/Edit Entry Modal -->
    <DsModal
      :open="showNewEntryModal || showEditEntryModal"
      :teleport="false"
      :title="editingEntry ? 'Editar Entrada' : 'Nova Entrada Clínica'"
      size="lg"
      @close="closeEntryModal"
    >
      <DsAlert v-if="entryFormError" variant="danger">{{ entryFormError }}</DsAlert>

      <DsInput id="entryType" v-model="entryForm.entryType" type="select" label="Tipo" required>
        <option value="anamnesis">Anamnese</option>
        <option value="physical_exam">Exame Físico</option>
        <option value="progress_note">Nota de Evolução</option>
        <option value="assessment">Avaliação</option>
        <option value="plan">Plano</option>
        <option value="prescription">Prescrição</option>
        <option value="conduct">Conduta</option>
      </DsInput>

      <DsInput
        id="entryTitle"
        v-model="entryForm.title"
        label="Título"
        placeholder="Título da entrada"
        required
      />

      <DsInput
        id="entryContent"
        v-model="entryForm.content"
        type="textarea"
        label="Conteúdo"
        placeholder="Conteúdo clínico..."
        :rows="8"
        required
      />

      <DsInput
        v-if="editingEntry"
        id="editReason"
        v-model="editReason"
        label="Motivo da Edição"
        placeholder="Motivo da alteração..."
      />

      <template #footer>
        <DsButton variant="secondary" @click="closeEntryModal"> Cancelar </DsButton>
        <DsButton
          variant="primary"
          :disabled="!isEntryFormValid || submittingEntry"
          @click="handleSaveEntry"
        >
          {{ submittingEntry ? 'Salvando...' : 'Salvar' }}
        </DsButton>
      </template>
    </DsModal>

    <!-- Archive Modal -->
    <DsModal
      :open="showArchiveModal"
      :teleport="false"
      title="Arquivar Entrada"
      @close="showArchiveModal = false"
    >
      <DsInput
        id="archiveReason"
        v-model="archiveReason"
        type="textarea"
        label="Motivo"
        placeholder="Motivo do arquivamento..."
        :rows="3"
        required
      />

      <template #footer>
        <DsButton variant="secondary" @click="showArchiveModal = false"> Cancelar </DsButton>
        <DsButton
          variant="danger"
          :disabled="!archiveReason.trim() || archivingEntry"
          @click="handleArchiveEntry"
        >
          {{ archivingEntry ? 'Arquivando...' : 'Arquivar' }}
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { medicalRecordsService } from '@/services/medicalRecords';
import type {
  MedicalRecordSummary,
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  ClinicalEntryType,
  CreateClinicalEntryRequest,
  UpdateClinicalEntryRequest,
  ArchiveClinicalEntryRequest
} from '@/types/medicalRecords';
import { useEntityCache } from '@/composables/useEntityCache';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const route = useRoute();
const router = useRouter();
const encounterId = route.params.id as string;

const record = ref<MedicalRecordSummary | null>(null);
const entries = ref<ClinicalEntrySummary[]>([]);
const timeline = ref<ClinicalTimelineEventSummary[]>([]);
const loading = ref(true);
const timelineLoading = ref(false);
const error = ref('');
const entityCache = useEntityCache();

const patientName = ref('');

const showNewEntryModal = ref(false);
const showEditEntryModal = ref(false);
const showArchiveModal = ref(false);
const submittingEntry = ref(false);
const archivingEntry = ref(false);
const entryFormError = ref('');
const editingEntry = ref<ClinicalEntrySummary | null>(null);
const editReason = ref('');
const archiveReason = ref('');
const archiveTarget = ref<ClinicalEntrySummary | null>(null);

const entryForm = ref({
  entryType: 'progress_note' as ClinicalEntryType,
  title: '',
  content: ''
});

const activeEntries = computed(() => entries.value.filter((e) => !e.deletedAt));
const archivedEntries = computed(() => entries.value.filter((e) => !!e.deletedAt).length);
const timelineCount = computed(() => timeline.value.length);
const summaryCards = computed(() => {
  if (!record.value) return [];
  return [
    { label: 'Paciente', value: patientName.value || '—', hint: 'Identificação clínica' },
    {
      label: 'Status',
      value: record.value.status === 'open' ? 'Aberto' : 'Concluído',
      hint: 'Situação operacional'
    },
    { label: 'Entradas', value: activeEntries.value.length.toString(), hint: 'Entradas ativas' },
    { label: 'Arquivadas', value: archivedEntries.value.toString(), hint: 'Entradas retiradas' },
    { label: 'Timeline', value: timelineCount.value.toString(), hint: 'Eventos rastreados' }
  ];
});

const isEntryFormValid = computed(() => {
  return entryForm.value.title.trim() && entryForm.value.content.trim();
});

const entryTypeMap: Record<ClinicalEntryType, string> = {
  anamnesis: '📝 Anamnese',
  physical_exam: '🩺 Exame Físico',
  progress_note: '📋 Nota de Evolução',
  assessment: '🔍 Avaliação',
  plan: '📌 Plano',
  prescription: '💊 Prescrição',
  conduct: '🏥 Conduta'
};

const timelineEventTypeMap: Record<string, string> = {
  record_created: '📋 Prontuário criado',
  entry_added: '📝 Entrada adicionada',
  entry_updated: '✏️ Entrada atualizada',
  entry_archived: '🗄️ Entrada arquivada',
  attachment_added: '📎 Anexo adicionado'
};

function entryTypeLabel(t: ClinicalEntryType) {
  return entryTypeMap[t] || t;
}

function timelineEventTypeLabel(t: string) {
  return timelineEventTypeMap[t] || t;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return d;
  }
}

function formatDateTime(d: string) {
  try {
    return new Date(d).toLocaleString('pt-BR');
  } catch {
    return d;
  }
}

function openEditEntry(entry: ClinicalEntrySummary) {
  editingEntry.value = entry;
  entryForm.value = {
    entryType: entry.entryType,
    title: entry.title,
    content: entry.content
  };
  editReason.value = '';
  showEditEntryModal.value = true;
}

function openArchiveEntry(entry: ClinicalEntrySummary) {
  archiveTarget.value = entry;
  archiveReason.value = '';
  showArchiveModal.value = true;
}

function closeEntryModal() {
  showNewEntryModal.value = false;
  showEditEntryModal.value = false;
  editingEntry.value = null;
  entryForm.value = { entryType: 'progress_note', title: '', content: '' };
  entryFormError.value = '';
  editReason.value = '';
}

async function loadRecord() {
  try {
    const response = await medicalRecordsService.getByEncounter(encounterId);
    record.value = response.record;
    entries.value = response.entries;
    patientName.value = await entityCache.getPatientName(response.record.patientId);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar prontuário';
  }
}

async function loadTimeline() {
  timelineLoading.value = true;
  try {
    timeline.value = await medicalRecordsService.getTimeline(encounterId);
  } catch {
    // Non-critical
  } finally {
    timelineLoading.value = false;
  }
}

async function handleSaveEntry() {
  if (!record.value || !isEntryFormValid.value) return;
  submittingEntry.value = true;
  entryFormError.value = '';

  try {
    if (editingEntry.value) {
      const payload: UpdateClinicalEntryRequest = {
        title: entryForm.value.title.trim(),
        content: entryForm.value.content.trim(),
        reason: editReason.value.trim() || undefined,
        expectedVersion: editingEntry.value.version
      };
      await medicalRecordsService.updateEntry(editingEntry.value.id, payload);
    } else {
      const payload: CreateClinicalEntryRequest = {
        encounterId: record.value.encounterId,
        patientId: record.value.patientId,
        entryType: entryForm.value.entryType,
        title: entryForm.value.title.trim(),
        content: entryForm.value.content.trim()
      };
      await medicalRecordsService.createEntry(payload);
    }
    closeEntryModal();
    await loadRecord();
    await loadTimeline();
  } catch (err: unknown) {
    entryFormError.value = err instanceof Error ? err.message : 'Erro ao salvar entrada';
  } finally {
    submittingEntry.value = false;
  }
}

async function handleArchiveEntry() {
  if (!archiveTarget.value || !archiveReason.value.trim()) return;
  archivingEntry.value = true;

  try {
    const payload: ArchiveClinicalEntryRequest = {
      reason: archiveReason.value.trim(),
      expectedVersion: archiveTarget.value.version
    };
    await medicalRecordsService.archiveEntry(archiveTarget.value.id, payload);
    showArchiveModal.value = false;
    archiveTarget.value = null;
    archiveReason.value = '';
    await loadRecord();
    await loadTimeline();
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'Erro ao arquivar entrada');
  } finally {
    archivingEntry.value = false;
  }
}

onMounted(async () => {
  try {
    await loadRecord();
    await loadTimeline();
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.medical-records-detail-page__grid {
  display: grid;
  gap: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.summary-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.entries-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry-card {
  padding: 16px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
  border: 1px solid var(--color-border, #e2e8f0);
}

.entry-card--archived {
  opacity: 0.6;
}

.entry-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.entry-card__type {
  font-weight: 600;
  font-size: 13px;
  color: var(--color-primary-600, #2563eb);
}

.entry-card__version {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

.entry-card__date {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

.entry-card__title {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--color-text, #0f172a);
}

.entry-card__content {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--color-text-secondary, #475569);
  white-space: pre-wrap;
  line-height: 1.6;
}

.entry-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.entry-card__archived {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border, #e2e8f0);
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
  font-style: italic;
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
</style>

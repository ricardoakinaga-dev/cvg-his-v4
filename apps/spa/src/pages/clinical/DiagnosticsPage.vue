<template>
  <div class="clinical-page">
    <AppPageHeader title="Diagnósticos" subtitle="Pedidos, anexos e timeline clínica real">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="clinical-grid clinical-grid--two">
      <DsCard title="Atendimento selecionado">
        <DsInput v-model="selectedEncounterId" type="select" label="Atendimento" @change="refreshContext">
          <option v-for="enc in encounters" :key="enc.id" :value="enc.id">
            {{ enc.id.slice(0, 8) }} • {{ enc.reason || 'Sem descrição' }}
          </option>
        </DsInput>
        <div v-if="selectedEncounter" class="summary-list">
          <div><strong>Paciente:</strong> {{ selectedEncounter.patientId }}</div>
          <div><strong>Status:</strong> {{ selectedEncounter.status }}</div>
          <div><strong>Motivo:</strong> {{ selectedEncounter.reason }}</div>
        </div>
      </DsCard>

      <DsCard title="Nova solicitação diagnóstica">
        <form class="form-grid" @submit.prevent="submitRequest">
          <DsInput v-model="requestForm.examType" label="Tipo de exame" required />
          <DsInput
            v-model="requestForm.reason"
            type="textarea"
            label="Justificativa"
            :rows="3"
            placeholder="Motivo clínico da solicitação"
          />
          <DsInput v-model="requestForm.title" label="Título" placeholder="Opcional" />
          <div class="form-actions">
            <DsButton variant="primary" :loading="submittingRequest">Registrar solicitação</DsButton>
            <DsButton variant="secondary" type="button" @click="resetRequestForm">Limpar</DsButton>
          </div>
        </form>
      </DsCard>
    </div>

    <div class="clinical-grid clinical-grid--two">
      <DsCard title="Anexar resultado">
        <form class="form-grid" @submit.prevent="submitAttachment">
          <DsInput v-model="attachmentForm.fileName" label="Arquivo" required />
          <DsInput v-model="attachmentForm.mimeType" label="MIME type" placeholder="application/pdf" required />
          <DsInput v-model="attachmentForm.checksum" label="Checksum" required />
          <DsInput v-model="attachmentForm.category" type="select" label="Categoria">
            <option value="lab">Laboratório</option>
            <option value="document">Documento</option>
            <option value="image">Imagem</option>
            <option value="other">Outro</option>
          </DsInput>
          <div class="form-actions">
            <DsButton variant="primary" :loading="submittingAttachment">Enviar anexo</DsButton>
            <DsButton variant="secondary" type="button" @click="resetAttachmentForm">Limpar</DsButton>
          </div>
        </form>
      </DsCard>

      <DsCard title="Timeline diagnóstica">
        <DataTable
          :columns="timelineColumns"
          :rows="diagnosticTimeline"
          :loading="loading"
          empty-icon="🧪"
          empty-title="Nenhum evento diagnóstico encontrado"
          empty-description="A timeline clínica será preenchida quando diagnósticos forem registrados."
          variant="hoverable"
        >
          <template #cell-occurredAt="{ row }">
            {{ formatDateTime((row as ClinicalTimelineEventSummary).occurredAt) }}
          </template>
        </DataTable>
      </DsCard>
    </div>

    <div class="clinical-grid clinical-grid--three">
      <DsCard title="Solicitações clínicas">
        <DataTable
          :columns="requestColumns"
          :rows="diagnosticRequests"
          :loading="loading"
          empty-icon="🧾"
          empty-title="Nenhuma solicitação clínica"
          empty-description="Registre a primeira solicitação para iniciar a trilha diagnóstica."
          variant="hoverable"
        >
          <template #cell-createdAt="{ row }">
            {{ formatDateTime((row as ClinicalEntrySummary).createdAt) }}
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Anexos">
        <DataTable
          :columns="attachmentColumns"
          :rows="attachments"
          :loading="loading"
          empty-icon="📎"
          empty-title="Nenhum anexo encontrado"
          empty-description="Anexe laudos, PDFs e imagens ao prontuário."
          variant="hoverable"
        >
          <template #cell-createdAt="{ row }">
            {{ formatDateTime((row as AttachmentSummary).createdAt) }}
          </template>
        </DataTable>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { encounterService } from '@/services/encounter';
import { diagnosticsService } from '@/services/diagnostics';
import { medicalRecordsService } from '@/services/medicalRecords';
import type { EncounterSummary } from '@/types/encounter';
import type { ClinicalEntrySummary, ClinicalTimelineEventSummary } from '@/types/medicalRecords';
import type { AttachmentSummary } from '@cvg-his-v2/shared-types';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { formatDateTime } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const diagnosticRequests = ref<ClinicalEntrySummary[]>([]);
const attachments = ref<AttachmentSummary[]>([]);
const diagnosticTimeline = ref<ClinicalTimelineEventSummary[]>([]);
const selectedEncounterId = ref('');
const loading = ref(false);
const submittingRequest = ref(false);
const submittingAttachment = ref(false);
const error = ref('');
const successMessage = ref('');

const requestForm = ref({
  title: '',
  examType: '',
  reason: ''
});

const attachmentForm = ref({
  fileName: '',
  mimeType: 'application/pdf',
  checksum: '',
  category: 'lab' as AttachmentSummary['category']
});

const timelineColumns: DataTableColumn[] = [
  { key: 'eventType', label: 'Evento' },
  { key: 'summary', label: 'Resumo' },
  { key: 'occurredAt', label: 'Quando' }
];

const requestColumns: DataTableColumn[] = [
  { key: 'title', label: 'Título' },
  { key: 'content', label: 'Conteúdo' },
  { key: 'createdAt', label: 'Criado em' }
];

const attachmentColumns: DataTableColumn[] = [
  { key: 'fileName', label: 'Arquivo' },
  { key: 'category', label: 'Categoria' },
  { key: 'mimeType', label: 'MIME' },
  { key: 'createdAt', label: 'Criado em' }
];

const selectedEncounter = computed(() =>
  encounters.value.find((encounter) => encounter.id === selectedEncounterId.value)
);

function resetRequestForm() {
  requestForm.value = {
    title: '',
    examType: '',
    reason: ''
  };
}

function resetAttachmentForm() {
  attachmentForm.value = {
    fileName: '',
    mimeType: 'application/pdf',
    checksum: '',
    category: 'lab'
  };
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    encounters.value = await encounterService.list();
    if (!selectedEncounterId.value && encounters.value.length > 0) {
      selectedEncounterId.value = encounters.value[0].id;
    }
    await refreshContext();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar diagnósticos';
  } finally {
    loading.value = false;
  }
}

async function refreshContext() {
  if (!selectedEncounter.value) {
    diagnosticRequests.value = [];
    attachments.value = [];
    diagnosticTimeline.value = [];
    return;
  }

  const record = await medicalRecordsService.getByEncounter(selectedEncounter.value.id);
  diagnosticRequests.value = await diagnosticsService.listByEncounter(selectedEncounter.value.id);
  attachments.value = await diagnosticsService.listAttachments(selectedEncounter.value.id);
  diagnosticTimeline.value = (await medicalRecordsService.getTimeline(selectedEncounter.value.id)).filter(
    (event) => event.eventType.startsWith('diagnostic_')
  );
  if (!requestForm.value.title.trim()) {
    requestForm.value.title = `Diagnóstico para ${selectedEncounter.value.reason || 'atendimento'}`;
  }
  if (!attachmentForm.value.fileName.trim()) {
    attachmentForm.value.fileName = `resultado-${record.record.id.slice(0, 8)}.pdf`;
  }
}

async function submitRequest() {
  if (!selectedEncounter.value) {
    error.value = 'Selecione um atendimento';
    return;
  }

  submittingRequest.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    await diagnosticsService.createRequest({
      encounterId: selectedEncounter.value.id,
      patientId: selectedEncounter.value.patientId,
      title: (requestForm.value.title.trim() || `Diagnóstico para ${requestForm.value.examType.trim()}`).trim(),
      content: [
        `Tipo de exame: ${requestForm.value.examType.trim()}`,
        requestForm.value.reason.trim() ? `Justificativa: ${requestForm.value.reason.trim()}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    });
    successMessage.value = 'Solicitação diagnóstica registrada.';
    resetRequestForm();
    await refreshContext();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar solicitação';
  } finally {
    submittingRequest.value = false;
  }
}

async function submitAttachment() {
  if (!selectedEncounter.value) {
    error.value = 'Selecione um atendimento';
    return;
  }

  submittingAttachment.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    await diagnosticsService.uploadAttachment(selectedEncounter.value.id, {
      fileName: attachmentForm.value.fileName.trim(),
      mimeType: attachmentForm.value.mimeType.trim(),
      checksum: attachmentForm.value.checksum.trim(),
      category: attachmentForm.value.category
    });
    successMessage.value = 'Anexo diagnóstico enviado.';
    resetAttachmentForm();
    await refreshContext();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao enviar anexo';
  } finally {
    submittingAttachment.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.clinical-grid {
  display: grid;
  gap: 16px;
}

.clinical-grid--two {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.clinical-grid--three {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.form-grid {
  display: grid;
  gap: 12px;
}

.form-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-list {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  color: var(--color-text-secondary, #475569);
}
</style>

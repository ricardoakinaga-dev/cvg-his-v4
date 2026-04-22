<template>
  <div class="clinical-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Atendimentos', 'Central Diagnóstica']"
      title="Central Diagnóstica"
      subtitle="Ponte operacional entre atendimento, prontuário e domínio Laboratório"
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/laboratory">Hub do Laboratório</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="clinical-overview">
      <DsCard title="Resumo diagnóstico">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ encounters.length }}</span>
            <span class="overview-metric__label">Atendimentos carregados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ laboratoryOrders.length }}</span>
            <span class="overview-metric__label">Pedidos laboratoriais</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ attachments.length }}</span>
            <span class="overview-metric__label">Anexos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ diagnosticTimeline.length }}</span>
            <span class="overview-metric__label">Eventos na timeline</span>
          </div>
        </div>
      </DsCard>
    </section>

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

      <DsCard title="Novo pedido laboratorial">
        <form class="form-grid" @submit.prevent="submitRequest">
          <DsInput v-model="requestForm.reportTypeId" type="select" label="Tipo de exame" required>
            <option value="">Selecione</option>
            <option v-for="reportType in reportTypes" :key="reportType.id" :value="reportType.id">
              {{ reportType.code }} • {{ reportType.name }}
            </option>
          </DsInput>
          <DsInput
            v-model="requestForm.reason"
            type="textarea"
            label="Justificativa"
            :rows="3"
            placeholder="Motivo clínico do exame ou laudo"
          />
          <DsInput v-model="requestForm.title" label="Título clínico" placeholder="Opcional" />
          <div class="form-actions">
            <DsButton variant="primary" :loading="submittingRequest">Registrar pedido</DsButton>
            <DsButton variant="secondary" type="button" @click="resetRequestForm">Limpar</DsButton>
          </div>
        </form>
      </DsCard>
    </div>

    <div class="clinical-grid clinical-grid--two">
      <DsCard title="Anexar resultado e liberar pedido">
        <form class="form-grid" @submit.prevent="submitAttachment">
          <DsInput v-model="attachmentForm.orderId" type="select" label="Pedido vinculado">
            <option value="">Somente anexar ao prontuário</option>
            <option v-for="order in laboratoryOrders" :key="order.id" :value="order.id">
              {{ order.examType }} • {{ statusLabel(order.status) }}
            </option>
          </DsInput>
          <DsInput v-model="attachmentForm.resultSummary" label="Resumo do laudo" placeholder="Ex.: sem alterações relevantes" />
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
            <DsButton variant="primary" :loading="submittingAttachment">Enviar resultado</DsButton>
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
      <DsCard title="Pedidos laboratoriais">
        <DataTable
          :columns="orderColumns"
          :rows="laboratoryOrders"
          :loading="loading"
          empty-icon="🧾"
          empty-title="Nenhum pedido laboratorial"
          empty-description="Registre o primeiro pedido para iniciar a trilha laboratorial."
          variant="hoverable"
        >
          <template #cell-status="{ row }">
            <DsBadge :variant="statusVariant((row as DiagnosticOrderSummary).status)" size="sm">
              {{ statusLabel((row as DiagnosticOrderSummary).status) }}
            </DsBadge>
          </template>
          <template #cell-createdAt="{ row }">
            {{ formatDateTime((row as DiagnosticOrderSummary).createdAt) }}
          </template>
          <template #cell-resultSummary="{ row }">
            {{ (row as DiagnosticOrderSummary).resultSummary ?? 'Aguardando liberação' }}
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Registros clínicos">
        <DataTable
          :columns="requestColumns"
          :rows="diagnosticRequests"
          :loading="loading"
          empty-icon="📝"
          empty-title="Nenhuma nota clínica"
          empty-description="A ponte diagnóstica também registra a narrativa clínica no prontuário."
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
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { encounterService } from '@/services/encounter';
import { diagnosticsService } from '@/services/diagnostics';
import { laboratoryService } from '@/services/laboratory';
import { medicalRecordsService } from '@/services/medicalRecords';
import type { DataTableColumn } from '@/components/DataTable.vue';
import type { EncounterSummary } from '@/types/encounter';
import type { ClinicalEntrySummary, ClinicalTimelineEventSummary } from '@/types/medicalRecords';
import type {
  AttachmentSummary,
  DiagnosticOrderSummary,
  LaboratoryReportTypeSummary
} from '@cvg-his-v2/shared-types';
import { formatDateTime } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const diagnosticRequests = ref<ClinicalEntrySummary[]>([]);
const attachments = ref<AttachmentSummary[]>([]);
const diagnosticTimeline = ref<ClinicalTimelineEventSummary[]>([]);
const laboratoryOrders = ref<DiagnosticOrderSummary[]>([]);
const reportTypes = ref<LaboratoryReportTypeSummary[]>([]);
const selectedEncounterId = ref('');
const loading = ref(false);
const submittingRequest = ref(false);
const submittingAttachment = ref(false);
const error = ref('');
const successMessage = ref('');

const requestForm = ref({
  title: '',
  reportTypeId: '',
  reason: ''
});

const attachmentForm = ref({
  orderId: '',
  resultSummary: '',
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

const orderColumns: DataTableColumn[] = [
  { key: 'examType', label: 'Exame' },
  { key: 'status', label: 'Status' },
  { key: 'resultSummary', label: 'Laudo' },
  { key: 'createdAt', label: 'Criado em' }
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

const selectedReportType = computed(() =>
  reportTypes.value.find((reportType) => reportType.id === requestForm.value.reportTypeId)
);

function statusVariant(status: DiagnosticOrderSummary['status']): 'default' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'requested':
      return 'warning';
    case 'collected':
      return 'default';
    case 'resulted':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
}

function statusLabel(status: DiagnosticOrderSummary['status']): string {
  switch (status) {
    case 'requested':
      return 'Solicitado';
    case 'collected':
      return 'Coletado';
    case 'resulted':
      return 'Liberado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}

function resetRequestForm() {
  requestForm.value = {
    title: '',
    reportTypeId: reportTypes.value[0]?.id ?? '',
    reason: ''
  };
}

function resetAttachmentForm() {
  attachmentForm.value = {
    orderId: laboratoryOrders.value.find((order) => order.status !== 'resulted')?.id ?? '',
    resultSummary: '',
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
    const [loadedEncounters, loadedReportTypes] = await Promise.all([
      encounterService.list(),
      laboratoryService.listReportTypes()
    ]);
    encounters.value = loadedEncounters;
    reportTypes.value = loadedReportTypes;

    if (!selectedEncounterId.value && encounters.value.length > 0) {
      selectedEncounterId.value = encounters.value[0].id;
    }

    if (!requestForm.value.reportTypeId && reportTypes.value.length > 0) {
      requestForm.value.reportTypeId = reportTypes.value[0].id;
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
    laboratoryOrders.value = [];
    return;
  }

  const [record, requests, uploadedAttachments, timeline, orders] = await Promise.all([
    medicalRecordsService.getByEncounter(selectedEncounter.value.id),
    diagnosticsService.listByEncounter(selectedEncounter.value.id),
    diagnosticsService.listAttachments(selectedEncounter.value.id),
    medicalRecordsService.getTimeline(selectedEncounter.value.id),
    laboratoryService.listOrders(selectedEncounter.value.id)
  ]);

  diagnosticRequests.value = requests;
  attachments.value = uploadedAttachments;
  diagnosticTimeline.value = timeline.filter((event) => event.eventType.startsWith('diagnostic_'));
  laboratoryOrders.value = orders;

  if (!requestForm.value.title.trim()) {
    requestForm.value.title = `Diagnóstico para ${selectedEncounter.value.reason || 'atendimento'}`;
  }

  if (!attachmentForm.value.fileName.trim()) {
    attachmentForm.value.fileName = `resultado-${record.record.id.slice(0, 8)}.pdf`;
  }

  if (!attachmentForm.value.orderId && laboratoryOrders.value.length > 0) {
    attachmentForm.value.orderId =
      laboratoryOrders.value.find((order) => order.status !== 'resulted')?.id ?? laboratoryOrders.value[0].id;
  }
}

async function submitRequest() {
  if (!selectedEncounter.value) {
    error.value = 'Selecione um atendimento';
    return;
  }

  if (!selectedReportType.value) {
    error.value = 'Selecione um tipo de exame';
    return;
  }

  submittingRequest.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    await laboratoryService.createOrder({
      encounterId: selectedEncounter.value.id,
      patientId: selectedEncounter.value.patientId,
      examType: selectedReportType.value.name,
      examCatalogId: selectedReportType.value.id,
      reason: requestForm.value.reason.trim() || 'Solicitação registrada na central diagnóstica.'
    });

    try {
      await diagnosticsService.createRequest({
        encounterId: selectedEncounter.value.id,
        patientId: selectedEncounter.value.patientId,
        title: (requestForm.value.title.trim() || selectedReportType.value.name).trim(),
        content: [
          `Tipo de exame: ${selectedReportType.value.name} (${selectedReportType.value.code})`,
          requestForm.value.reason.trim()
            ? `Justificativa: ${requestForm.value.reason.trim()}`
            : ''
        ]
          .filter(Boolean)
          .join('\n')
      });
      successMessage.value = 'Pedido laboratorial registrado e vinculado ao prontuário.';
    } catch {
      successMessage.value =
        'Pedido laboratorial registrado. A anotação clínica não foi persistida na mesma tentativa.';
    }

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
    const attachment = await diagnosticsService.uploadAttachment(selectedEncounter.value.id, {
      fileName: attachmentForm.value.fileName.trim(),
      mimeType: attachmentForm.value.mimeType.trim(),
      checksum: attachmentForm.value.checksum.trim(),
      category: attachmentForm.value.category
    });

    const linkedOrder = laboratoryOrders.value.find((order) => order.id === attachmentForm.value.orderId);
    if (linkedOrder && linkedOrder.status !== 'cancelled' && linkedOrder.status !== 'resulted') {
      if (linkedOrder.status === 'requested') {
        await laboratoryService.recordResult(linkedOrder.id, {
          status: 'collected',
          collectedByUserId: 'diagnostics-page'
        });
      }

      await laboratoryService.recordResult(linkedOrder.id, {
        status: 'resulted',
        resultSummary: attachmentForm.value.resultSummary.trim() || attachment.fileName,
        resultAttachmentId: attachment.id
      });
      successMessage.value = 'Resultado anexado ao prontuário e liberado no laboratório.';
    } else {
      successMessage.value = 'Anexo diagnóstico enviado.';
    }

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

.clinical-overview {
  margin-bottom: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-metric {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
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

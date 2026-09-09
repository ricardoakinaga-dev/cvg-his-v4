<template>
  <div class="clinical-page">
    <AppPageHeader
      title="Central Diagnóstica"
      subtitle="Solicite exames e acompanhe os resultados do atendimento."
      :breadcrumb-items="headerBreadcrumbItems"
      :secondary-actions="headerSecondaryActions"
      :primary-action="headerPrimaryAction"
    />

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>
    <DsAlert v-if="warningMessage" variant="warning" dismissible @dismiss="warningMessage = ''">
      {{ warningMessage }}
    </DsAlert>

    <DsCard title="Atendimento selecionado">
      <DsInput v-model="selectedEncounterId" type="select" label="Atendimento" :disabled="loading || loadFailed || submittingRequest || submittingAttachment">
        <option value="">{{ loading ? 'Carregando atendimentos…' : encounters.length ? 'Selecione um atendimento' : 'Nenhum atendimento disponível' }}</option>
        <option v-for="enc in encounters" :key="enc.id" :value="enc.id">{{ enc.id.slice(0, 8) }} • {{ enc.reason || 'Sem descrição' }}</option>
      </DsInput>
      <div v-if="selectedEncounter && !loading && !loadFailed" class="summary-list">
        <strong v-if="hasWorkflowContext">Contexto do atendimento clínico</strong>
        <div><strong>Paciente:</strong> {{ selectedEncounter.patientId }}</div>
        <div><strong>Status:</strong> {{ encounterStatusLabel(selectedEncounter.status) }}</div>
        <div><strong>Motivo:</strong> {{ selectedEncounter.reason }}</div>
      </div>
      <div v-if="loadFailed" class="context-state" role="status">
        <p>Não foi possível carregar os atendimentos e tipos de exame.</p>
        <DsButton variant="secondary" @click="loadData">Tentar novamente</DsButton>
      </div>
      <div v-else-if="!loading && !selectedEncounter" class="context-state" role="status">
        <p>{{ explicitContext ? 'Contexto solicitado indisponível. Verifique o atendimento ou paciente informado.' : encounters.length ? 'Selecione um atendimento para consultar exames e laudos.' : 'Nenhum atendimento aberto disponível para diagnóstico.' }}</p>
        <DsButton variant="secondary" tag="a" to="/encounters">Ver atendimentos</DsButton>
      </div>
      <p v-else-if="loading || contextState === 'loading'" class="muted" role="status">Carregando contexto diagnóstico…</p>
      <div v-else-if="contextState === 'failed'" class="context-state" role="status">
        <p>Não foi possível carregar os dados diagnósticos deste atendimento.</p>
        <DsButton variant="secondary" @click="refreshContext">Tentar novamente</DsButton>
      </div>
    </DsCard>

    <template v-if="contextReady">
      <DsAlert v-if="!canWriteContext" variant="info">Atendimento encerrado: somente leitura do histórico diagnóstico.</DsAlert>
      <DsCard v-if="canWriteContext" title="Novo pedido laboratorial">
        <form @submit.prevent="submitRequest">
          <fieldset class="form-grid" :disabled="submittingRequest || submittingAttachment">
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
            <DsButton type="submit" variant="primary" :loading="submittingRequest"
              >Registrar pedido</DsButton
            >
            <DsButton variant="secondary" type="button" @click="resetRequestForm">Limpar</DsButton>
          </div>
          </fieldset>
        </form>
      </DsCard>

    <div class="clinical-grid clinical-grid--two">
      <DsCard v-if="canWriteContext" title="Anexar resultado e liberar pedido">
        <form @submit.prevent="submitAttachment">
          <fieldset class="form-grid" :disabled="submittingRequest || submittingAttachment">
          <DsInput v-model="attachmentForm.orderId" type="select" label="Pedido vinculado">
            <option value="">Somente anexar ao prontuário</option>
            <option v-for="order in laboratoryOrders" :key="order.id" :value="order.id">
              {{ order.examType }} • {{ statusLabel(order.status) }}
            </option>
          </DsInput>
          <DsInput
            v-model="attachmentForm.resultSummary"
            label="Resumo do laudo"
            placeholder="Ex.: sem alterações relevantes"
          />
          <DsInput v-model="attachmentForm.fileName" label="Arquivo" required />
          <DsInput
            v-model="attachmentForm.mimeType"
            label="MIME type"
            placeholder="application/pdf"
            required
          />
          <DsInput v-model="attachmentForm.checksum" label="Checksum" required />
          <DsInput v-model="attachmentForm.category" type="select" label="Categoria">
            <option value="lab">Laboratório</option>
            <option value="document">Documento</option>
            <option value="image">Imagem</option>
            <option value="other">Outro</option>
          </DsInput>
          <div class="form-actions">
            <DsButton type="submit" variant="primary" :loading="submittingAttachment"
              >Enviar resultado</DsButton
            >
            <DsButton variant="secondary" type="button" @click="resetAttachmentForm"
              >Limpar</DsButton
            >
          </div>
          </fieldset>
        </form>
      </DsCard>

      <DsCard title="Histórico diagnóstico">
        <DataTable
          :columns="timelineColumns"
          :rows="diagnosticTimeline"
          :loading="false"
          empty-icon="🧪"
          empty-title="Nenhum evento diagnóstico encontrado"
          empty-description="O histórico clínico será preenchida quando diagnósticos forem registrados."
          variant="hoverable"
        >
          <template #cell-eventType="{ row }">
            <span :title="(row as ClinicalTimelineEventSummary).eventType">{{ timelineEventLabel((row as ClinicalTimelineEventSummary).eventType) }}</span>
          </template>
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
          :loading="false"
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
          :loading="false"
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
          :loading="false"
          empty-icon="📎"
          empty-title="Nenhum anexo encontrado"
          :empty-description="canWriteContext ? 'Anexe laudos, PDFs e imagens ao prontuário.' : 'Não há anexos registrados neste atendimento.'"
          variant="hoverable"
        >
          <template #cell-createdAt="{ row }">
            {{ formatDateTime((row as AttachmentSummary).createdAt) }}
          </template>
        </DataTable>
      </DsCard>
    </div>
    </template>
    <details class="clinical-overview">
      <summary>Resumo diagnóstico</summary>
      <dl class="overview-grid">
        <div class="overview-metric"><dt>Atendimentos abertos carregados</dt><dd>{{ loading || loadFailed ? '—' : encounters.filter(enc => enc.status !== 'closed').length }}</dd></div>
        <div class="overview-metric"><dt>Pedidos do atendimento</dt><dd>{{ contextReady ? laboratoryOrders.length : '—' }}</dd></div>
        <div class="overview-metric"><dt>Anexos do atendimento</dt><dd>{{ contextReady ? attachments.length : '—' }}</dd></div>
        <div class="overview-metric"><dt>Eventos diagnósticos</dt><dd>{{ contextReady ? diagnosticTimeline.length : '—' }}</dd></div>
      </dl>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { routeLocationKey } from 'vue-router';
import AppPageHeader, {
  type PageAction,
  type PageBreadcrumb
} from '@/components/AppPageHeader.vue';
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
import { encounterStatusLabel, formatDateTime } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const diagnosticRequests = ref<ClinicalEntrySummary[]>([]);
const attachments = ref<AttachmentSummary[]>([]);
const diagnosticTimeline = ref<ClinicalTimelineEventSummary[]>([]);
type DiagnosticsLaboratoryStatus =
  | DiagnosticOrderSummary['status']
  | 'in_analysis'
  | 'reported'
  | 'delivered';

type DiagnosticsLaboratoryOrder = Omit<DiagnosticOrderSummary, 'status'> & {
  readonly status: DiagnosticsLaboratoryStatus;
  readonly legacyStatus?: 'resulted';
  readonly workflowVersion?: number;
};

const laboratoryOrders = ref<DiagnosticsLaboratoryOrder[]>([]);
const reportTypes = ref<LaboratoryReportTypeSummary[]>([]);
const selectedEncounterId = ref('');
const loading = ref(false);
const loadFailed = ref(false);
const contextState = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle');
let listRequestVersion = 0;
let contextRequestVersion = 0;
let requestSubmissionVersion = 0;
let attachmentSubmissionVersion = 0;
let active = true;
const submittingRequest = ref(false);
const submittingAttachment = ref(false);
const error = ref('');
const successMessage = ref('');
const warningMessage = ref('');
const route = inject(routeLocationKey, undefined);
const workflowContext = computed(() => readWorkflowContext());
const explicitContext = computed(() => Boolean(workflowContext.value.encounterId || workflowContext.value.patientId));

const requestForm = ref({
  title: '',
  reportTypeId: '',
  reason: ''
});

interface StableDiagnosticRequestAttempt {
  readonly payloadSignature: string;
  readonly idempotencyKey: string;
}

interface StableDiagnosticMutationAttempt extends StableDiagnosticRequestAttempt {}

let diagnosticOrderCreateAttempt: StableDiagnosticMutationAttempt | null = null;
let diagnosticRequestCreateAttempt: StableDiagnosticRequestAttempt | null = null;
let diagnosticAttachmentUploadAttempt: StableDiagnosticMutationAttempt | null = null;
const diagnosticResultAttempts = new Map<string, StableDiagnosticMutationAttempt>();

const attachmentForm = ref({
  orderId: '',
  resultSummary: '',
  fileName: '',
  mimeType: 'application/pdf',
  checksum: '',
  category: 'lab' as AttachmentSummary['category']
});

function createStableIdempotencyKey(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid
    ? `${prefix}-${uuid}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureStableAttempt(
  current: StableDiagnosticMutationAttempt | null,
  payloadSignature: string,
  prefix: string
): StableDiagnosticMutationAttempt {
  return current?.payloadSignature === payloadSignature
    ? current
    : {
        payloadSignature,
        idempotencyKey: createStableIdempotencyKey(prefix)
      };
}

function requireResponseId<T extends { id?: unknown }>(value: T, resource: string): T {
  if (!value || typeof value.id !== 'string' || !value.id.trim()) {
    throw new Error(`${resource} não retornou um identificador confirmável`);
  }
  return value;
}

function isCurrentContext(encounterId: string): boolean {
  return active && selectedEncounterId.value === encounterId;
}

function resultAttemptFor(
  orderId: string,
  payload: Record<string, unknown>,
  prefix: string
): StableDiagnosticMutationAttempt {
  const payloadSignature = `${orderId}:${JSON.stringify(payload)}`;
  const current = diagnosticResultAttempts.get(payloadSignature) ?? null;
  const attempt = ensureStableAttempt(current, payloadSignature, prefix);
  diagnosticResultAttempts.set(payloadSignature, attempt);
  return attempt;
}


function timelineEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    diagnostic_requested: 'Exame solicitado',
    diagnostic_collected: 'Coleta registrada',
    diagnostic_resulted: 'Resultado registrado',
  };
  return labels[eventType] ?? 'Atualização clínica';
}

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

const hasWorkflowContext = computed(() =>
  Boolean(workflowContext.value.encounterId || workflowContext.value.patientId || workflowContext.value.ownerId)
);

const selectedEncounterContextId = computed(
  () => !loading.value && !loadFailed.value ? selectedEncounter.value?.id : undefined
);

const contextReady = computed(() =>
  !loading.value && !loadFailed.value && Boolean(selectedEncounter.value) && contextState.value === 'ready'
);

const canWriteContext = computed(() => contextReady.value && selectedEncounter.value?.status !== 'closed');

const headerBreadcrumbItems = computed<PageBreadcrumb[]>(() => [
  { key: 'home', label: 'Início', to: '/' },
  { key: 'attendance', label: 'Atendimento', to: '/encounters' },
  { key: 'diagnostics', label: 'Exames', current: true }
]);

const headerSecondaryActions = computed<PageAction[]>(() => {
  const actions: PageAction[] = [
    { key: 'lab', label: 'Hub do Laboratório', variant: 'secondary', to: '/laboratory' },
    {
      key: 'refresh',
      label: 'Atualizar',
      variant: 'secondary',
      loading: loading.value,
      disabled: submittingRequest.value || submittingAttachment.value,
      onClick: () => void loadData()
    }
  ];
  if (selectedEncounterContextId.value) {
    actions.unshift({
      key: 'encounter',
      label: 'Atendimento',
      variant: 'secondary',
      to: `/encounters/${selectedEncounterContextId.value}`
    });
  }
  return actions;
});

const headerPrimaryAction = computed<PageAction | null>(() =>
  selectedEncounterContextId.value
    ? {
        key: 'record',
        label: 'Prontuário',
        to: `/medical-records/${selectedEncounterContextId.value}`
      }
    : null
);

const selectedReportType = computed(() =>
  reportTypes.value.find((reportType) => reportType.id === requestForm.value.reportTypeId)
);

function isReleasedLaboratoryOrder(order: DiagnosticsLaboratoryOrder | undefined): boolean {
  return Boolean(
    order &&
      (order.status === 'resulted' ||
        order.status === 'reported' ||
        order.status === 'delivered' ||
        order.legacyStatus === 'resulted')
  );
}

function statusVariant(
  status: DiagnosticsLaboratoryStatus
): 'default' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'requested':
      return 'warning';
    case 'collected':
      return 'default';
    case 'in_analysis':
    case 'resulted':
    case 'reported':
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
}

function statusLabel(status: DiagnosticsLaboratoryStatus): string {
  switch (status) {
    case 'requested':
      return 'Solicitado';
    case 'collected':
      return 'Coletado';
    case 'in_analysis':
      return 'Em análise';
    case 'reported':
      return 'Laudado';
    case 'delivered':
      return 'Entregue';
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
    orderId: laboratoryOrders.value.find(
      (order) => order.status !== 'cancelled' && !isReleasedLaboratoryOrder(order)
    )?.id ?? '',
    resultSummary: '',
    fileName: '',
    mimeType: 'application/pdf',
    checksum: '',
    category: 'lab'
  };
}

function clearContext() {
  contextRequestVersion += 1;
  requestSubmissionVersion += 1;
  attachmentSubmissionVersion += 1;
  submittingRequest.value = false;
  submittingAttachment.value = false;
  diagnosticOrderCreateAttempt = null;
  diagnosticRequestCreateAttempt = null;
  diagnosticAttachmentUploadAttempt = null;
  diagnosticResultAttempts.clear();
  contextState.value = 'idle';
  diagnosticRequests.value = [];
  attachments.value = [];
  diagnosticTimeline.value = [];
  laboratoryOrders.value = [];
  resetRequestForm();
  resetAttachmentForm();
}

watch(selectedEncounterId, () => {
  clearContext();
  error.value = '';
  successMessage.value = '';
  warningMessage.value = '';
  if (!loading.value && !loadFailed.value) void refreshContext();
}, { flush: 'sync' });

async function loadData() {
  if (submittingRequest.value || submittingAttachment.value) return;
  const requestVersion = ++listRequestVersion;
  loading.value = true;
  loadFailed.value = false;
  error.value = '';
  successMessage.value = '';
  warningMessage.value = '';
  clearContext();
  try {
    const [loadedEncounters, loadedReportTypes] = await Promise.all([
      encounterService.list(),
      laboratoryService.listReportTypes()
    ]);
    if (requestVersion !== listRequestVersion) return;
    const context = workflowContext.value;
    encounters.value = loadedEncounters.filter((encounter) =>
      context.encounterId
        ? encounter.id === context.encounterId && (!context.patientId || encounter.patientId === context.patientId)
        : context.patientId
          ? encounter.patientId === context.patientId
          : encounter.status !== 'closed'
    );
    reportTypes.value = loadedReportTypes;
    if (!selectedEncounter.value) {
      selectedEncounterId.value = encounters.value.find((encounter) => encounter.status !== 'closed')?.id
        ?? encounters.value[0]?.id ?? '';
    }
    if (!selectedReportType.value) requestForm.value.reportTypeId = reportTypes.value[0]?.id ?? '';
    await refreshContext();
  } catch (err: unknown) {
    if (requestVersion !== listRequestVersion) return;
    loadFailed.value = true;
    encounters.value = [];
    reportTypes.value = [];
    selectedEncounterId.value = '';
    clearContext();
    error.value = err instanceof Error ? err.message : 'Erro ao carregar atendimentos e tipos de exame';
  } finally {
    if (requestVersion === listRequestVersion) loading.value = false;
  }
}

async function refreshContext(): Promise<boolean> {
  const encounter = selectedEncounter.value;
  const requestVersion = ++contextRequestVersion;
  diagnosticRequests.value = [];
  attachments.value = [];
  diagnosticTimeline.value = [];
  laboratoryOrders.value = [];
  error.value = '';
  if (!encounter || loadFailed.value) {
    contextState.value = 'idle';
    return false;
  }
  const encounterId = encounter.id;
  contextState.value = 'loading';
  try {
    const [record, requests, uploadedAttachments, timeline, orders] = await Promise.all([
      medicalRecordsService.getByEncounter(encounterId),
      diagnosticsService.listByEncounter(encounterId),
      diagnosticsService.listAttachments(encounterId),
      medicalRecordsService.getTimeline(encounterId),
      laboratoryService.listOrders(encounterId)
    ]);
    if (requestVersion !== contextRequestVersion || selectedEncounterId.value !== encounterId) return false;
    diagnosticRequests.value = requests;
    attachments.value = uploadedAttachments;
    diagnosticTimeline.value = timeline.filter((event) => event.eventType.startsWith('diagnostic_'));
    laboratoryOrders.value = orders;
    if (!requestForm.value.title.trim()) requestForm.value.title = `Diagnóstico para ${encounter.reason || 'atendimento'}`;
    if (!attachmentForm.value.fileName.trim()) attachmentForm.value.fileName = `resultado-${record.record.id.slice(0, 8)}.pdf`;
    if (!attachmentForm.value.orderId && orders.length) {
      attachmentForm.value.orderId = orders.find(
        (order) => order.status !== 'cancelled' && !isReleasedLaboratoryOrder(order)
      )?.id ?? orders[0].id;
    }
    contextState.value = 'ready';
    return true;
  } catch (err: unknown) {
    if (requestVersion !== contextRequestVersion || selectedEncounterId.value !== encounterId) return false;
    contextState.value = 'failed';
    error.value = err instanceof Error ? err.message : 'Erro ao carregar o contexto diagnóstico';
    return false;
  }
}

async function submitRequest() {
  if (!canWriteContext.value || !selectedEncounter.value || submittingRequest.value || submittingAttachment.value) {
    error.value = 'Selecione um atendimento com o contexto carregado';
    return;
  }

  if (!selectedReportType.value) {
    error.value = 'Selecione um tipo de exame';
    return;
  }

  const encounterId = selectedEncounter.value.id;
  const patientId = selectedEncounter.value.patientId;
  const reportType = { ...selectedReportType.value };
  const draft = { ...requestForm.value };
  const submissionVersion = ++requestSubmissionVersion;
  const isCurrent = () =>
    isCurrentContext(encounterId) && requestSubmissionVersion === submissionVersion;
  submittingRequest.value = true;
  error.value = '';
  successMessage.value = '';
  warningMessage.value = '';

  try {
    const orderPayload = {
      encounterId,
      patientId,
      examType: reportType.name,
      reason: draft.reason.trim() || 'Solicitação registrada na central diagnóstica.'
    };
    const orderPayloadSignature = JSON.stringify(orderPayload);
    diagnosticOrderCreateAttempt = ensureStableAttempt(
      diagnosticOrderCreateAttempt,
      orderPayloadSignature,
      'diagnostics-laboratory-order'
    );
    const createdOrder = requireResponseId(
      await laboratoryService.createOrder(orderPayload, {
        idempotencyKey: diagnosticOrderCreateAttempt.idempotencyKey
      }),
      'O pedido laboratorial'
    );
    let clinicalNote: ClinicalEntrySummary | null = null;
    let clinicalPayload: {
      encounterId: string;
      patientId: string;
      title: string;
      content: string;
    } | null = null;
    let clinicalNoteError = '';

    try {
      clinicalPayload = {
        encounterId,
        patientId,
        title: (draft.title.trim() || reportType.name).trim(),
        content: [
          `Tipo de exame: ${reportType.name} (${reportType.code})`,
          draft.reason.trim() ? `Justificativa: ${draft.reason.trim()}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      };
      const payloadSignature = JSON.stringify(clinicalPayload);
      diagnosticRequestCreateAttempt = ensureStableAttempt(
        diagnosticRequestCreateAttempt,
        payloadSignature,
        'diagnostics-clinical-request'
      );
      clinicalNote = requireResponseId(await diagnosticsService.createRequest(clinicalPayload, {
        idempotencyKey: diagnosticRequestCreateAttempt.idempotencyKey
      }), 'A anotação clínica diagnóstica');
    } catch (err: unknown) {
      clinicalNoteError = err instanceof Error ? err.message : 'Erro ao registrar anotação clínica';
    }

    if (!isCurrent()) return;
    const rereadSucceeded = await refreshContext();
    if (!isCurrent()) return;
    if (!rereadSucceeded) {
      if (clinicalNoteError) {
        warningMessage.value = `O pedido foi enviado, mas a confirmação do contexto falhou; a anotação clínica não foi confirmada: ${clinicalNoteError}`;
      }
      return;
    }

    const confirmedOrder = laboratoryOrders.value.find((order) => order.id === createdOrder.id);
    if (
      !confirmedOrder ||
      confirmedOrder.encounterId !== encounterId ||
      confirmedOrder.patientId !== patientId ||
      confirmedOrder.examType !== orderPayload.examType ||
      confirmedOrder.reason !== orderPayload.reason ||
      confirmedOrder.status !== 'requested'
    ) {
      throw new Error(
        'Pedido laboratorial enviado, mas não foi confirmado na releitura do laboratório. O formulário foi preservado.'
      );
    }
    if (clinicalNoteError) {
      warningMessage.value = `Pedido laboratorial confirmado, mas a anotação clínica não foi persistida: ${clinicalNoteError}`;
      return;
    }
    const confirmedNote = clinicalNote && clinicalPayload
      ? diagnosticRequests.value.find(
          (entry) =>
            entry.id === clinicalNote?.id &&
            entry.encounterId === encounterId &&
            entry.patientId === patientId &&
            entry.entryType === 'assessment' &&
            entry.title === clinicalPayload.title &&
            entry.content === clinicalPayload.content &&
            !entry.deletedAt &&
            entry.version >= (clinicalNote.version || 1)
        )
      : undefined;
    if (!confirmedNote) {
      throw new Error(
        'Pedido laboratorial confirmado, mas a anotação clínica não foi confirmada na releitura do prontuário. O formulário foi preservado.'
      );
    }
    diagnosticOrderCreateAttempt = null;
    diagnosticRequestCreateAttempt = null;
    successMessage.value = 'Pedido laboratorial registrado e vinculado ao prontuário.';
    resetRequestForm();
  } catch (err: unknown) {
    if (isCurrent()) {
      error.value = err instanceof Error ? err.message : 'Erro ao registrar solicitação';
      warningMessage.value = '';
    }
  } finally {
    if (isCurrent()) submittingRequest.value = false;
  }
}

async function submitAttachment() {
  if (!canWriteContext.value || !selectedEncounter.value || submittingRequest.value || submittingAttachment.value) {
    error.value = 'Selecione um atendimento com o contexto carregado';
    return;
  }

  const encounterId = selectedEncounter.value.id;
  const draft = { ...attachmentForm.value };
  const linkedOrder = laboratoryOrders.value.find((order) => order.id === draft.orderId);
  const submissionVersion = ++attachmentSubmissionVersion;
  const isCurrent = () =>
    isCurrentContext(encounterId) && attachmentSubmissionVersion === submissionVersion;
  submittingAttachment.value = true;
  error.value = '';
  successMessage.value = '';
  warningMessage.value = '';

  try {
    const attachmentPayload = {
      fileName: draft.fileName.trim(),
      mimeType: draft.mimeType.trim(),
      checksum: draft.checksum.trim(),
      category: draft.category
    };
    const attachmentPayloadSignature = JSON.stringify({ encounterId, ...attachmentPayload });
    diagnosticAttachmentUploadAttempt = ensureStableAttempt(
      diagnosticAttachmentUploadAttempt,
      attachmentPayloadSignature,
      'diagnostics-attachment-upload'
    );
    const attachment = requireResponseId(
      await diagnosticsService.uploadAttachment(encounterId, attachmentPayload, {
        idempotencyKey: diagnosticAttachmentUploadAttempt.idempotencyKey
      }),
      'O anexo diagnóstico'
    );
    const resultAttemptKeys: string[] = [];

    if (linkedOrder && linkedOrder.status !== 'cancelled' && !isReleasedLaboratoryOrder(linkedOrder)) {
      if (linkedOrder.status === 'requested') {
        const collectedPayload = {
          status: 'collected',
          collectedByUserId: 'diagnostics-page'
        } as const;
        const collectedAttempt = resultAttemptFor(
          linkedOrder.id,
          collectedPayload,
          'diagnostics-result-collected'
        );
        resultAttemptKeys.push(collectedAttempt.payloadSignature);
        const collected = requireResponseId(
          await laboratoryService.recordResult(linkedOrder.id, collectedPayload, {
            idempotencyKey: collectedAttempt.idempotencyKey
          }),
          'A coleta laboratorial'
        );
        if (collected.id !== linkedOrder.id || collected.status !== 'collected') {
          throw new Error('A coleta laboratorial não foi confirmada pelo laboratório');
        }
      }

      const resultedPayload = {
        status: 'resulted',
        resultSummary: draft.resultSummary.trim() || attachment.fileName,
        resultAttachmentId: attachment.id
      } as const;
      const resultedAttempt = resultAttemptFor(
        linkedOrder.id,
        resultedPayload,
        'diagnostics-result-released'
      );
      resultAttemptKeys.push(resultedAttempt.payloadSignature);
      const resulted = requireResponseId(
        await laboratoryService.recordResult(linkedOrder.id, resultedPayload, {
          idempotencyKey: resultedAttempt.idempotencyKey
        }),
        'O resultado laboratorial'
      );
      if (resulted.id !== linkedOrder.id || !isReleasedLaboratoryOrder(resulted)) {
        throw new Error('O resultado laboratorial não foi confirmado pelo laboratório');
      }
    }

    if (!isCurrent()) return;
    const rereadSucceeded = await refreshContext();
    if (!isCurrent()) return;
    if (!rereadSucceeded) return;
    const confirmedAttachment = attachments.value.find((item) => item.id === attachment.id);
    if (
      !confirmedAttachment ||
      confirmedAttachment.linkedEntityType !== 'medical_record' ||
      confirmedAttachment.fileName !== attachmentPayload.fileName ||
      confirmedAttachment.mimeType !== attachmentPayload.mimeType ||
      confirmedAttachment.checksum !== attachmentPayload.checksum ||
      confirmedAttachment.category !== attachmentPayload.category
    ) {
      throw new Error(
        'Anexo diagnóstico enviado, mas não foi confirmado na releitura do prontuário. O formulário foi preservado.'
      );
    }
    if (linkedOrder) {
      const confirmedOrder = laboratoryOrders.value.find((order) => order.id === linkedOrder.id);
      if (
        linkedOrder.status !== 'cancelled' &&
        !isReleasedLaboratoryOrder(linkedOrder) &&
        (!confirmedOrder ||
          !isReleasedLaboratoryOrder(confirmedOrder) ||
          confirmedOrder.resultAttachmentId !== attachment.id ||
          confirmedOrder.resultSummary !== (draft.resultSummary.trim() || attachment.fileName))
      ) {
        throw new Error(
          'Resultado enviado, mas não foi confirmado na releitura do laboratório. O formulário foi preservado.'
        );
      }
    }
    diagnosticAttachmentUploadAttempt = null;
    for (const key of resultAttemptKeys) diagnosticResultAttempts.delete(key);
    successMessage.value = linkedOrder && linkedOrder.status !== 'cancelled' && !isReleasedLaboratoryOrder(linkedOrder)
      ? 'Resultado anexado ao prontuário e liberado no laboratório.'
      : 'Anexo diagnóstico enviado.';
    resetAttachmentForm();
  } catch (err: unknown) {
    if (isCurrent()) {
      error.value = err instanceof Error ? err.message : 'Erro ao enviar anexo';
      warningMessage.value = '';
    }
  } finally {
    if (isCurrent()) submittingAttachment.value = false;
  }
}

watch(workflowContext, () => {
  // Invalidate old reads immediately, including when a write keeps list refresh locked.
  listRequestVersion += 1;
  clearContext();
  selectedEncounterId.value = '';
  encounters.value = [];
  void loadData();
}, { flush: 'sync' });
onMounted(loadData);
onBeforeUnmount(() => {
  active = false;
  listRequestVersion += 1;
  contextRequestVersion += 1;
  requestSubmissionVersion += 1;
  attachmentSubmissionVersion += 1;
  submittingRequest.value = false;
  submittingAttachment.value = false;
});

function shortId(value?: string): string {
  return value ? value.slice(0, 8) : 'Não informado';
}

function readWorkflowContext() {
  if (route) {
    const value = (key: string) => {
      const raw = route.query[key];
      return (Array.isArray(raw) ? raw[0] : raw)?.trim() || '';
    };
    return { encounterId: value('encounterId') || value('encounter'), patientId: value('patientId'), ownerId: value('ownerId') };
  }
  if (typeof window === 'undefined') {
    return { encounterId: '', patientId: '', ownerId: '' };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    encounterId: params.get('encounterId')?.trim() || params.get('encounter')?.trim() || '',
    patientId: params.get('patientId')?.trim() || '',
    ownerId: params.get('ownerId')?.trim() || ''
  };
}
</script>

<style scoped>
.clinical-page { display: grid; gap: 16px; min-width: 0; }
.clinical-overview summary { min-height: 44px; padding-block: 12px; box-sizing: border-box; cursor: pointer; font-weight: 700; color: var(--color-text-secondary); }
.overview-metric dt { color: var(--color-text-secondary); font-size: 13px; }
.overview-metric dd { margin: 8px 0 0; font-size: 24px; font-weight: 700; color: var(--color-text); }
.context-state p, .muted { color: var(--color-text-secondary); }
.form-grid { border: 0; padding: 0; margin: 0; min-width: 0; }

.clinical-grid {
  display: grid;
  gap: 16px;
}

.clinical-grid--two {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
}

.clinical-grid--three {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
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
  background: linear-gradient(
    180deg,
    var(--color-surface, #ffffff),
    var(--color-bg-subtle, #f8fafc)
  );
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
  overflow-wrap: anywhere;
  display: grid;
  gap: 6px;
  margin-top: 12px;
  color: var(--color-text-secondary, #475569);
}

</style>

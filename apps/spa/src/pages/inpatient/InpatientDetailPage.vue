<template>
  <div class="inpatient-detail-page">
      <AppPageHeader :breadcrumbs="['Atendimento', 'Internação', 'Detalhes da Internação', stay ? patientName(stay.patientId) : 'Detalhes']" title="Detalhes da Internação">
      <template #subtitle>
        <span class="muted">Atendimento &gt; Internação</span>
        <span v-if="stay" class="muted">{{ patientName(stay.patientId) }}</span>
      </template>
      <template #actions>
        <DsButton v-if="stay" variant="secondary" tag="a" :to="`/encounters/${stay.encounterId}`">Ver atendimento</DsButton>
        <DsButton v-if="stay" variant="secondary" tag="a" :to="`/medical-records/${stay.encounterId}`">Ver prontuário</DsButton>
        <DsButton v-if="stay" variant="ghost" tag="a" :to="`/patients/${stay.patientId}`">Ver paciente</DsButton>
        <DsButton
          v-if="stay"
          variant="secondary"
          :loading="loading"
          :disabled="loading || statusUpdating"
          aria-label="Atualizar dados da internação"
          @click="refreshStay"
        >
          Atualizar dados
        </DsButton>
        <DsButton variant="secondary" tag="a" to="/inpatient">Lista de Internações</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert
      v-if="error"
      variant="danger"
      :dismissible="Boolean(stay)"
      @dismiss="error = ''"
    >
      <div class="feedback-content">
        <div class="feedback-message">
          <strong>{{ stay ? 'Atualização da internação interrompida' : 'Internação indisponível' }}</strong>
          <span>{{ error }}</span>
        </div>
        <DsButton
          variant="secondary"
          size="sm"
          :loading="loading"
          :disabled="loading"
          @click="retryLoad"
        >
          Tentar novamente
        </DsButton>
      </div>
    </DsAlert>

    <div v-if="loading && !stay" class="page-loading" role="status" aria-live="polite">
      <SkeletonLoader variant="card" width="100%" height="200px" />
    </div>

    <template v-else-if="stay">
      <div class="detail-content" :aria-busy="loading">
        <p v-if="loading" class="refresh-status" role="status" aria-live="polite">
          Atualizando os dados de {{ patientName(stay.patientId) }} em {{ stay.unit }} · {{ stay.ward }} · leito {{ stay.bed }}. O alvo desta internação permanece em tela.
        </p>

      <DsCard title="Ficha resumida">
        <div class="summary-grid">
          <div v-for="card in summaryCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>

      <AppDetailSection title="Informações da Internação">
        <dl class="detail-grid">
          <div class="detail-item">
            <dt class="detail-item__label">Paciente</dt>
            <dd class="detail-item__value">{{ patientName(stay.patientId) }}</dd>
          </div>
          <div class="detail-item">
            <dt class="detail-item__label">Atendimento</dt>
            <dd class="detail-item__value">
              <router-link :to="`/encounters/${stay.encounterId}`" class="encounter-link">
                {{ stay.encounterId.slice(0, 8) }}...
              </router-link>
            </dd>
          </div>
          <div class="detail-item">
            <dt class="detail-item__label">Prontuário</dt>
            <dd class="detail-item__value">
              <router-link :to="`/medical-records/${stay.encounterId}`" class="encounter-link">
                Abrir prontuário do atendimento
              </router-link>
            </dd>
          </div>
          <div class="detail-item">
            <dt class="detail-item__label">Admissão</dt>
            <dd class="detail-item__value">{{ formatDateTime(stay.admittedAt) }}</dd>
          </div>
          <div class="detail-item">
            <dt class="detail-item__label">Última atualização</dt>
            <dd class="detail-item__value">{{ formatDateTime(stay.updatedAt) }}</dd>
          </div>
          <div v-if="stay.dischargedAt" class="detail-item">
            <dt class="detail-item__label">Alta</dt>
            <dd class="detail-item__value">{{ formatDateTime(stay.dischargedAt) }}</dd>
          </div>
          <div v-if="stay.dischargeReason" class="detail-item detail-item--full">
            <dt class="detail-item__label">Motivo da Alta</dt>
            <dd class="detail-item__value">{{ stay.dischargeReason }}</dd>
          </div>
        </dl>
      </AppDetailSection>

      <AppDetailSection v-if="stay.status !== 'discharged'" title="Ações">
        <div class="detail-actions">
          <DsButton
            v-if="canTransitionTo('stable')"
            variant="primary"
            :loading="statusUpdating"
            :disabled="statusUpdating"
            @click="updateStatus('stable')"
          >
            Marcar Estável
          </DsButton>
          <DsButton
            v-if="canTransitionTo('discharged')"
            variant="danger"
            :loading="statusUpdating"
            :disabled="statusUpdating"
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

      <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
        <div class="feedback-content">
          <div class="feedback-message">
            <strong>Ação não concluída</strong>
            <span>{{ formError }}</span>
          </div>
          <DsButton
            variant="secondary"
            size="sm"
            :loading="loading"
            :disabled="loading || statusUpdating"
            @click="refreshStay"
          >
            Atualizar dados
          </DsButton>
        </div>
      </DsAlert>
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
            :disabled="progressSubmitting"
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
              :disabled="progressSubmitting"
              @click="submitProgress"
            >
              {{ progressSubmitting ? 'Salvando...' : 'Salvar' }}
            </DsButton>
            <DsButton variant="secondary" size="sm" :disabled="progressSubmitting" @click="cancelProgress">Cancelar</DsButton>
          </div>
        </div>

        <div v-if="progressLoading" class="progress-loading" role="status" aria-live="polite">
          <DsSpinner size="sm" />
        </div>

        <div v-else-if="progressLoadError" class="collection-error" role="alert">
          <p>{{ progressLoadError }}</p>
          <DsButton variant="secondary" size="sm" @click="retryProgress">Recarregar evoluções</DsButton>
        </div>

        <div v-else-if="progressNotes.length === 0" class="progress-empty">
          <p>Nenhuma evolução registrada. Documente a permanência do paciente para manter a internação alinhada ao prontuário.</p>
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

      <AppDetailSection title="Ocorrências da Internação">
        <div v-if="stay.status !== 'discharged'" class="mb-4">
          <DsButton variant="primary" size="sm" @click="showOccurrenceForm = true">
            + Nova Ocorrência
          </DsButton>
        </div>

        <div v-if="showOccurrenceForm" class="progress-form">
          <div class="form-grid">
            <label class="field-label">
              Tipo
              <select v-model="occurrenceForm.type" class="native-field">
                <option value="clinical">Clínica</option>
                <option value="nursing">Enfermagem</option>
                <option value="medication">Medicação</option>
                <option value="feeding">Alimentação</option>
                <option value="behavior">Comportamento</option>
                <option value="administrative">Administrativa</option>
              </select>
            </label>
            <label class="field-label">
              Severidade
              <select v-model="occurrenceForm.severity" class="native-field">
                <option value="info">Informativa</option>
                <option value="attention">Atenção</option>
                <option value="critical">Crítica</option>
              </select>
            </label>
          </div>
          <DsInput
            id="occurrenceTitle"
            v-model="occurrenceForm.title"
            label="Título"
            placeholder="Ex.: Hiporexia no plantão"
          />
          <DsInput
            id="occurrenceDescription"
            v-model="occurrenceForm.description"
            type="textarea"
            label="Descrição"
            placeholder="Descreva a ocorrência operacional..."
            :rows="3"
          />
          <DsAlert v-if="occurrenceError" variant="danger">{{ occurrenceError }}</DsAlert>
          <div class="progress-form__actions">
            <DsButton
              variant="primary"
              size="sm"
              :loading="occurrenceSubmitting"
              :disabled="occurrenceSubmitting"
              @click="submitOccurrence"
            >
              Salvar Ocorrência
            </DsButton>
            <DsButton variant="secondary" size="sm" @click="cancelOccurrence">Cancelar</DsButton>
          </div>
        </div>

        <div v-if="occurrencesLoading" class="progress-loading" role="status" aria-live="polite">
          <DsSpinner size="sm" />
        </div>
        <div v-else-if="occurrenceLoadError" class="collection-error" role="alert">
          <p>{{ occurrenceLoadError }}</p>
          <DsButton variant="secondary" size="sm" @click="retryOccurrences">Recarregar ocorrências</DsButton>
        </div>
        <div v-else-if="occurrences.length === 0" class="progress-empty">
          <p>Nenhuma ocorrência registrada para esta internação.</p>
        </div>
        <div v-else class="progress-list">
          <div v-for="occurrence in occurrences" :key="occurrence.id" class="progress-note">
            <div class="progress-note__header">
              <StatusBadge
                :label="occurrenceSeverityLabel(occurrence.severity)"
                :variant="occurrenceSeverityVariant(occurrence.severity)"
              />
              <span class="progress-note__date">{{ formatDateTime(occurrence.createdAt) }}</span>
            </div>
            <strong>{{ occurrence.title }}</strong>
            <div class="progress-note__content">{{ occurrence.description }}</div>
          </div>
        </div>
      </AppDetailSection>

      <AppDetailSection title="Diárias e Cobranças">
        <div v-if="stay.status !== 'discharged'" class="mb-4">
          <DsButton variant="primary" size="sm" @click="showDailyChargeForm = true">
            + Lançar Diária
          </DsButton>
        </div>

        <div v-if="showDailyChargeForm" class="progress-form">
          <DsInput
            id="dailyChargeDescription"
            v-model="dailyChargeForm.description"
            label="Descrição"
            placeholder="Ex.: Diária UTI"
          />
          <div class="form-grid">
            <DsInput id="dailyChargeDate" v-model="dailyChargeForm.chargeDate" type="date" label="Data" />
            <DsInput id="dailyChargeQuantity" v-model="dailyChargeForm.quantity" type="number" label="Quantidade" />
            <DsInput id="dailyChargeUnitAmount" v-model="dailyChargeForm.unitAmount" type="number" label="Valor unitário" />
          </div>
          <DsAlert v-if="dailyChargeError" variant="danger">{{ dailyChargeError }}</DsAlert>
          <div class="progress-form__actions">
            <DsButton
              variant="primary"
              size="sm"
              :loading="dailyChargeSubmitting"
              :disabled="dailyChargeSubmitting"
              @click="submitDailyCharge"
            >
              Lançar Diária
            </DsButton>
            <DsButton variant="secondary" size="sm" @click="cancelDailyCharge">Cancelar</DsButton>
          </div>
        </div>

        <div v-if="dailyChargesLoading" class="progress-loading" role="status" aria-live="polite">
          <DsSpinner size="sm" />
        </div>
        <div v-else-if="dailyChargeLoadError" class="collection-error" role="alert">
          <p>{{ dailyChargeLoadError }}</p>
          <DsButton variant="secondary" size="sm" @click="retryDailyCharges">Recarregar diárias</DsButton>
        </div>
        <div v-else-if="dailyCharges.length === 0" class="progress-empty">
          <p>Nenhuma diária lançada para esta internação.</p>
        </div>
        <div v-else class="charges-list">
          <div v-for="charge in dailyCharges" :key="charge.id" class="charge-row">
            <div>
              <strong>{{ charge.description }}</strong>
              <span>{{ charge.chargeDate }} · {{ charge.quantity }} x {{ formatCurrency(charge.unitAmount) }}</span>
            </div>
            <div class="charge-row__aside">
              <strong>{{ formatCurrency(charge.totalAmount) }}</strong>
              <StatusBadge
                :label="dailyChargeStatusLabel(charge.status)"
                :variant="dailyChargeStatusVariant(charge.status)"
              />
              <RouterLink
                v-if="charge.status === 'billed' && charge.billingRecordId"
                :to="`/billing/${charge.encounterId}`"
                class="charge-row__billing-link"
              >
                Cobrança {{ charge.billingRecordId }}
              </RouterLink>
              <DsButton
                v-if="charge.status === 'pending'"
                variant="secondary"
                size="sm"
                :loading="dailyChargeActionSubmitting === charge.id"
                :disabled="Boolean(dailyChargeActionSubmitting)"
                @click="markChargeBilled(charge.id)"
              >
                Marcar Faturada
              </DsButton>
            </div>
          </div>
        </div>
        <DsAlert v-if="dailyChargeActionError" variant="danger" dismissible @dismiss="dailyChargeActionError = ''">
          {{ dailyChargeActionError }}
        </DsAlert>
      </AppDetailSection>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { inpatientService } from '@/services/inpatient';
import type {
  InpatientStaySummary,
  InpatientProgressSummary,
  InpatientOccurrenceSummary,
  InpatientDailyChargeSummary
} from '@/types/inpatient';
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
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const route = useRoute();
const entityCache = useEntityCache();

const stayId = ref(String(route.params.id ?? ''));
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
const progressLoadError = ref('');
const showProgressForm = ref(false);
const newProgressNote = ref('');
const progressError = ref('');
const progressSubmitting = ref(false);
const authorNames = ref<Record<string, string>>({});
const occurrences = ref<InpatientOccurrenceSummary[]>([]);
const occurrencesLoading = ref(false);
const occurrenceLoadError = ref('');
const showOccurrenceForm = ref(false);
const occurrenceSubmitting = ref(false);
const occurrenceError = ref('');
const occurrenceForm = ref({
  type: 'clinical' as InpatientOccurrenceSummary['type'],
  severity: 'info' as InpatientOccurrenceSummary['severity'],
  title: '',
  description: ''
});
const dailyCharges = ref<InpatientDailyChargeSummary[]>([]);
const dailyChargesLoading = ref(false);
const dailyChargeLoadError = ref('');
const dailyChargeActionSubmitting = ref<string | null>(null);
const dailyChargeActionError = ref('');
const showDailyChargeForm = ref(false);
const dailyChargeSubmitting = ref(false);
const dailyChargeError = ref('');
const dailyChargeForm = ref({
  description: 'Diária de internação',
  chargeDate: new Date().toISOString().slice(0, 10),
  quantity: 1,
  unitAmount: 0
});

let loadGeneration = 0;
let mounted = true;

type LoadStayOptions = {
  preserveCurrent?: boolean;
};

const summaryCards = computed(() => {
  if (!stay.value) return [];
  return [
    { label: 'Status', value: statusLabel(stay.value.status), hint: 'Situação operacional' },
    { label: 'Localização', value: `${stay.value.unit} / ${stay.value.ward} / ${stay.value.bed}`, hint: 'Leito atual' },
    { label: 'Evoluções', value: progressLoading.value ? '…' : progressLoadError.value ? '—' : progressNotes.value.length.toString(), hint: 'Registros clínicos' },
    { label: 'Diárias', value: dailyChargesLoading.value ? '…' : dailyChargeLoadError.value ? '—' : formatCurrency(totalPendingDailyCharges.value), hint: 'Pendente faturamento' }
  ];
});

const totalPendingDailyCharges = computed(() =>
  dailyCharges.value
    .filter((charge) => charge.status === 'pending')
    .reduce((sum, charge) => sum + charge.totalAmount, 0)
);

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
  return patientNameCache.value || id || 'Paciente não informado';
}

function authorName(id: string): string {
  return authorNames.value[id] || `${id.slice(0, 8)}...`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function occurrenceSeverityLabel(severity: InpatientOccurrenceSummary['severity']): string {
  return { info: 'Informativa', attention: 'Atenção', critical: 'Crítica' }[severity] ?? severity;
}

function occurrenceSeverityVariant(severity: InpatientOccurrenceSummary['severity']) {
  return ({ info: 'info', attention: 'warning', critical: 'danger' }[severity] ?? 'default') as any;
}

function dailyChargeStatusLabel(status: InpatientDailyChargeSummary['status']): string {
  return { pending: 'Pendente', billed: 'Faturada', cancelled: 'Cancelada' }[status] ?? status;
}

function dailyChargeStatusVariant(status: InpatientDailyChargeSummary['status']) {
  return ({ pending: 'warning', billed: 'success', cancelled: 'neutral' }[status] ?? 'default') as any;
}

async function updateStatus(newStatus: InpatientStaySummary['status']) {
  if (statusUpdating.value || !stay.value) return;
  const requestStayId = stayId.value;
  const requestGeneration = loadGeneration;
  statusUpdating.value = true;
  formError.value = '';
  successMessage.value = '';
  try {
    const updated = await inpatientService.updateStatus(requestStayId, { status: newStatus });
    if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
    if (updated.id !== requestStayId) {
      formError.value = 'A resposta não corresponde a esta internação. Recarregue o prontuário.';
      return;
    }
    stay.value = updated;
    successMessage.value = `Status atualizado para ${statusLabel(newStatus)}!`;
  } catch (err: unknown) {
    formError.value = `Não foi possível atualizar o status de ${patientName(stay.value.patientId)} nesta internação: ${errorMessage(err, 'erro desconhecido')}`;
  } finally {
    if (requestGeneration === loadGeneration) statusUpdating.value = false;
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
  if (statusUpdating.value || !stay.value) return;
  const requestStayId = stayId.value;
  const requestGeneration = loadGeneration;
  statusUpdating.value = true;
  dischargeError.value = '';
  try {
    const updated = await inpatientService.updateStatus(requestStayId, {
      status: 'discharged',
      dischargeReason: dischargeReason.value.trim()
    });
    if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
    if (updated.id !== requestStayId) {
      dischargeError.value = 'A resposta não corresponde a esta internação. Recarregue o prontuário.';
      return;
    }
    stay.value = updated;
    showDischargeModal.value = false;
    successMessage.value = 'Alta registrada com sucesso!';
  } catch (err: unknown) {
    dischargeError.value = `Não foi possível registrar a alta de ${patientName(stay.value.patientId)}: ${errorMessage(err, 'erro desconhecido')}`;
  } finally {
    if (requestGeneration === loadGeneration) statusUpdating.value = false;
  }
}

function errorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'status' in err && (err as { status?: unknown }).status === 403) {
    return 'Você não tem permissão para consultar ou atualizar esta internação.';
  }
  return err instanceof Error && err.message.trim() ? err.message : fallback;
}

async function loadProgress(requestGeneration = loadGeneration, requestStayId = stayId.value) {
  progressLoading.value = true;
  progressLoadError.value = '';
  try {
    const notes = await inpatientService.listProgress(requestStayId);
    if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
    const foreign = notes.some((note) => note.stayId !== requestStayId);
    if (foreign) {
      progressNotes.value = [];
      progressLoadError.value = 'A resposta de evoluções não corresponde a esta internação.';
      return;
    }
    progressNotes.value = notes;
    const authorIds = [...new Set(progressNotes.value.map((n) => n.authoredByUserId))];
    await entityCache.preloadUserNames(authorIds);
    if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
    for (const id of authorIds) {
      if (!authorNames.value[id]) {
        const name = await entityCache.getUserName(id);
        if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
        authorNames.value[id] = name;
      }
    }
  } catch (err: unknown) {
    if (requestGeneration === loadGeneration && stayId.value === requestStayId) {
      progressNotes.value = [];
      progressLoadError.value = errorMessage(err, 'Não foi possível carregar as evoluções.');
    }
  } finally {
    if (requestGeneration === loadGeneration && stayId.value === requestStayId) progressLoading.value = false;
  }
}

async function loadOccurrences(requestGeneration = loadGeneration, requestStayId = stayId.value) {
  occurrencesLoading.value = true;
  occurrenceLoadError.value = '';
  try {
    const items = await inpatientService.listOccurrences(requestStayId);
    if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
    if (items.some((item) => item.stayId !== requestStayId)) {
      occurrences.value = [];
      occurrenceLoadError.value = 'A resposta de ocorrências não corresponde a esta internação.';
      return;
    }
    occurrences.value = items;
  } catch (err: unknown) {
    if (requestGeneration === loadGeneration && stayId.value === requestStayId) {
      occurrences.value = [];
      occurrenceLoadError.value = errorMessage(err, 'Não foi possível carregar as ocorrências.');
    }
  } finally {
    if (requestGeneration === loadGeneration && stayId.value === requestStayId) occurrencesLoading.value = false;
  }
}

async function loadDailyCharges(requestGeneration = loadGeneration, requestStayId = stayId.value) {
  dailyChargesLoading.value = true;
  dailyChargeLoadError.value = '';
  try {
    const items = await inpatientService.listDailyCharges(requestStayId);
    if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
    if (items.some((item) => item.stayId !== requestStayId)) {
      dailyCharges.value = [];
      dailyChargeLoadError.value = 'A resposta de diárias não corresponde a esta internação.';
      return;
    }
    dailyCharges.value = items;
  } catch (err: unknown) {
    if (requestGeneration === loadGeneration && stayId.value === requestStayId) {
      dailyCharges.value = [];
      dailyChargeLoadError.value = errorMessage(err, 'Não foi possível carregar as diárias.');
    }
  } finally {
    if (requestGeneration === loadGeneration && stayId.value === requestStayId) dailyChargesLoading.value = false;
  }
}

function retryProgress() {
  if (stay.value) void loadProgress(loadGeneration, stayId.value);
}

function retryOccurrences() {
  if (stay.value) void loadOccurrences(loadGeneration, stayId.value);
}

function retryDailyCharges() {
  if (stay.value) void loadDailyCharges(loadGeneration, stayId.value);
}

async function submitProgress() {
  if (progressSubmitting.value) return;
  if (!newProgressNote.value.trim()) {
    progressError.value = 'Nota é obrigatória';
    return;
  }
  const requestStayId = stayId.value;
  const requestGeneration = loadGeneration;
  progressSubmitting.value = true;
  progressError.value = '';
  try {
    const note = await inpatientService.addProgress(requestStayId, newProgressNote.value.trim());
    if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
    if (note.stayId !== requestStayId) {
      progressError.value = 'A resposta não corresponde a esta internação. O registro não foi adicionado.';
      return;
    }
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
    if (requestGeneration === loadGeneration) progressSubmitting.value = false;
  }
}

function cancelProgress() {
  showProgressForm.value = false;
  newProgressNote.value = '';
  progressError.value = '';
}

async function submitOccurrence() {
  if (occurrenceSubmitting.value) return;
  if (!occurrenceForm.value.title.trim() || !occurrenceForm.value.description.trim()) {
    occurrenceError.value = 'Título e descrição são obrigatórios';
    return;
  }
  const requestStayId = stayId.value;
  const requestGeneration = loadGeneration;
  occurrenceSubmitting.value = true;
  occurrenceError.value = '';
  try {
    const occurrence = await inpatientService.addOccurrence(requestStayId, {
      type: occurrenceForm.value.type,
      severity: occurrenceForm.value.severity,
      title: occurrenceForm.value.title.trim(),
      description: occurrenceForm.value.description.trim()
    });
    if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
    if (occurrence.stayId !== requestStayId) {
      occurrenceError.value = 'A resposta não corresponde a esta internação. O registro não foi adicionado.';
      return;
    }
    occurrences.value = [occurrence, ...occurrences.value];
    cancelOccurrence();
    successMessage.value = 'Ocorrência registrada com sucesso!';
  } catch (err: unknown) {
    occurrenceError.value = err instanceof Error ? err.message : 'Erro ao registrar ocorrência';
  } finally {
    if (requestGeneration === loadGeneration) occurrenceSubmitting.value = false;
  }
}

function cancelOccurrence() {
  showOccurrenceForm.value = false;
  occurrenceError.value = '';
  occurrenceForm.value = {
    type: 'clinical',
    severity: 'info',
    title: '',
    description: ''
  };
}

async function submitDailyCharge() {
  if (dailyChargeSubmitting.value) return;
  if (!dailyChargeForm.value.description.trim() || dailyChargeForm.value.unitAmount <= 0) {
    dailyChargeError.value = 'Descrição e valor unitário são obrigatórios';
    return;
  }
  const requestStayId = stayId.value;
  const requestGeneration = loadGeneration;
  dailyChargeSubmitting.value = true;
  dailyChargeError.value = '';
  try {
    const charge = await inpatientService.createDailyCharge(requestStayId, {
      description: dailyChargeForm.value.description.trim(),
      chargeDate: dailyChargeForm.value.chargeDate,
      quantity: Number(dailyChargeForm.value.quantity) || 1,
      unitAmount: Number(dailyChargeForm.value.unitAmount)
    });
    if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
    if (charge.stayId !== requestStayId) {
      dailyChargeError.value = 'A resposta não corresponde a esta internação. A diária não foi adicionada.';
      return;
    }
    dailyCharges.value = [charge, ...dailyCharges.value];
    cancelDailyCharge();
    successMessage.value = 'Diária lançada com sucesso!';
  } catch (err: unknown) {
    dailyChargeError.value = err instanceof Error ? err.message : 'Erro ao lançar diária';
  } finally {
    if (requestGeneration === loadGeneration) dailyChargeSubmitting.value = false;
  }
}

function cancelDailyCharge() {
  showDailyChargeForm.value = false;
  dailyChargeError.value = '';
  dailyChargeForm.value = {
    description: 'Diária de internação',
    chargeDate: new Date().toISOString().slice(0, 10),
    quantity: 1,
    unitAmount: 0
  };
}

async function markChargeBilled(chargeId: string) {
  if (dailyChargeActionSubmitting.value) return;
  const requestStayId = stayId.value;
  const requestGeneration = loadGeneration;
  dailyChargeActionSubmitting.value = chargeId;
  dailyChargeActionError.value = '';
  try {
    const charge = await inpatientService.markDailyChargeBilled(requestStayId, chargeId);
    if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
    if (charge.stayId !== requestStayId || charge.id !== chargeId) {
      dailyChargeActionError.value = 'A resposta não corresponde a esta diária. Recarregue os lançamentos.';
      return;
    }
    dailyCharges.value = dailyCharges.value.map((item) => (item.id === charge.id ? charge : item));
    successMessage.value = 'Diária marcada como faturada!';
  } catch (err: unknown) {
    if (requestGeneration === loadGeneration) dailyChargeActionError.value = errorMessage(err, 'Erro ao faturar diária');
  } finally {
    if (requestGeneration === loadGeneration) dailyChargeActionSubmitting.value = null;
  }
}

function resetChartState() {
  stay.value = null;
  patientNameCache.value = '';
  statusUpdating.value = false;
  showDischargeModal.value = false;
  dischargeReason.value = '';
  dischargeError.value = '';
  progressSubmitting.value = false;
  occurrenceSubmitting.value = false;
  dailyChargeSubmitting.value = false;
  authorNames.value = {};
  progressNotes.value = [];
  progressLoadError.value = '';
  progressLoading.value = false;
  occurrences.value = [];
  occurrenceLoadError.value = '';
  occurrencesLoading.value = false;
  dailyCharges.value = [];
  dailyChargeLoadError.value = '';
  dailyChargesLoading.value = false;
  dailyChargeActionError.value = '';
  dailyChargeActionSubmitting.value = null;
  showProgressForm.value = false;
  showOccurrenceForm.value = false;
  showDailyChargeForm.value = false;
  progressError.value = '';
  occurrenceError.value = '';
  dailyChargeError.value = '';
  successMessage.value = '';
  formError.value = '';
}

async function loadStay(requestStayId: string, options: LoadStayOptions = {}) {
  const requestGeneration = ++loadGeneration;
  stayId.value = requestStayId;
  const preserveCurrent = options.preserveCurrent === true && stay.value?.id === requestStayId;
  if (!preserveCurrent) resetChartState();
  loading.value = true;
  error.value = '';
  try {
    const stays = await inpatientService.list({ includeDischarged: true });
    if (!mounted || requestGeneration !== loadGeneration || stayId.value !== requestStayId) return;
    const found = stays.find((s) => s.id === requestStayId);
    if (!found) {
      error.value = preserveCurrent
        ? `A internação de ${patientName(stay.value?.patientId ?? '')} não foi encontrada na atualização. Os dados anteriores permanecem visíveis.`
        : 'Internação não encontrada';
      return;
    }
    stay.value = found;
    loading.value = false;
    void entityCache.getPatientName(found.patientId).then((name) => {
      if (mounted && requestGeneration === loadGeneration && stayId.value === requestStayId) patientNameCache.value = name;
    }).catch(() => undefined);
    if (!preserveCurrent) {
      void loadProgress(requestGeneration, requestStayId);
      void loadOccurrences(requestGeneration, requestStayId);
      void loadDailyCharges(requestGeneration, requestStayId);
    }
  } catch (err: unknown) {
    if (requestGeneration === loadGeneration && stayId.value === requestStayId) {
      const detail = errorMessage(err, 'erro desconhecido');
      error.value = preserveCurrent
        ? `Não foi possível atualizar esta internação sem perder o contexto atual: ${detail}`
        : `Não foi possível carregar esta internação: ${detail}`;
    }
  } finally {
    if (requestGeneration === loadGeneration) loading.value = false;
  }
}

function refreshStay() {
  if (!stay.value || loading.value || statusUpdating.value) return;
  void loadStay(stay.value.id, { preserveCurrent: true });
}

function retryLoad() {
  if (loading.value) return;
  void loadStay(stayId.value, { preserveCurrent: Boolean(stay.value) });
}

onMounted(() => {
  mounted = true;
  void loadStay(stayId.value);
});

watch(() => String(route.params.id ?? ''), (nextId, previousId) => {
  if (nextId && nextId !== previousId) void loadStay(nextId);
});

onBeforeUnmount(() => {
  mounted = false;
  loadGeneration += 1;
});
</script>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-item dt,
.detail-item dd {
  margin: 0;
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
  min-width: 0;
  font-size: 15px;
  color: var(--color-text, #0f172a);
  overflow-wrap: anywhere;
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
.detail-content {
  position: relative;
}

@media (max-width: 640px) {
  .detail-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.refresh-status {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-left: 3px solid var(--color-primary-500, #3b82f6);
  border-radius: 8px;
  background: var(--color-primary-subtle, #e0f7f7);
  color: var(--color-text, #0f172a);
  font-size: 14px;
  line-height: 1.45;
}
.feedback-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
}
.feedback-content > span {
  flex: 1 1 240px;
  min-width: 0;
}
.feedback-message {
  display: grid;
  flex: 1 1 240px;
  min-width: 0;
  gap: 2px;
}
.feedback-message strong {
  font-weight: 700;
}
.progress-form {
  margin-bottom: 16px;
  padding: 16px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.field-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}
.native-field {
  min-height: 38px;
  border: 1px solid var(--color-border, #d8dee9);
  border-radius: 8px;
  padding: 0 10px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
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
.collection-error {
  display: grid;
  gap: 10px;
  justify-items: start;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--color-danger-500, #ef4444) 36%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-danger-500, #ef4444) 9%, var(--color-surface, #fff));
  color: var(--color-text, #0f172a);
}
.collection-error p {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 14px;
  line-height: 1.45;
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
.charges-list {
  display: grid;
  gap: 10px;
}
.charge-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}
.charge-row span {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}
.charge-row__aside {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 180px;
}
.charge-row__billing-link {
  color: var(--color-primary-600, #2563eb);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
.charge-row__billing-link:hover {
  text-decoration: underline;
}
.mb-4 {
  margin-bottom: 1rem;
}
@media (max-width: 640px) {
  .feedback-content {
    align-items: stretch;
  }
  .detail-actions,
  .progress-form__actions {
    flex-wrap: wrap;
  }
  .detail-actions :deep(.ds-btn),
  .progress-form__actions :deep(.ds-btn) {
    flex: 1 1 180px;
  }
  .charge-row {
    flex-direction: column;
  }
  .charge-row__aside {
    justify-content: flex-start;
    min-width: 0;
  }
}
</style>

<template>
  <div class="inpatient-detail-page">
      <AppPageHeader :breadcrumbs="['Atendimento', 'Internação', 'Detalhes da Internação', stay ? patientName(stay.patientId) : 'Detalhes']" title="🛏️ Detalhes da Internação">
      <template #subtitle>
        <span class="muted">Atendimento &gt; Internação</span>
        <span v-if="stay" class="muted">{{ patientName(stay.patientId) }}</span>
      </template>
      <template #actions>
        <DsButton v-if="stay" variant="secondary" tag="a" :to="`/encounters/${stay.encounterId}`">Ver atendimento</DsButton>
        <DsButton v-if="stay" variant="secondary" tag="a" :to="`/medical-records/${stay.encounterId}`">Ver prontuário</DsButton>
        <DsButton v-if="stay" variant="ghost" tag="a" :to="`/patients/${stay.patientId}`">Ver paciente</DsButton>
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
            <span class="detail-item__label">Prontuário</span>
            <span class="detail-item__value">
              <router-link :to="`/medical-records/${stay.encounterId}`" class="encounter-link">
                Abrir prontuário do atendimento
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
              @click="submitOccurrence"
            >
              Salvar Ocorrência
            </DsButton>
            <DsButton variant="secondary" size="sm" @click="cancelOccurrence">Cancelar</DsButton>
          </div>
        </div>

        <div v-if="occurrences.length === 0" class="progress-empty">
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
              @click="submitDailyCharge"
            >
              Lançar Diária
            </DsButton>
            <DsButton variant="secondary" size="sm" @click="cancelDailyCharge">Cancelar</DsButton>
          </div>
        </div>

        <div v-if="dailyCharges.length === 0" class="progress-empty">
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
                @click="markChargeBilled(charge.id)"
              >
                Marcar Faturada
              </DsButton>
            </div>
          </div>
        </div>
      </AppDetailSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
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
const occurrences = ref<InpatientOccurrenceSummary[]>([]);
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
const showDailyChargeForm = ref(false);
const dailyChargeSubmitting = ref(false);
const dailyChargeError = ref('');
const dailyChargeForm = ref({
  description: 'Diária de internação',
  chargeDate: new Date().toISOString().slice(0, 10),
  quantity: 1,
  unitAmount: 0
});

const summaryCards = computed(() => {
  if (!stay.value) return [];
  return [
    { label: 'Paciente', value: patientNameCache.value || '—', hint: 'Animal internado' },
    { label: 'Status', value: statusLabel(stay.value.status), hint: 'Situação operacional' },
    { label: 'Leito', value: `${stay.value.unit} / ${stay.value.ward} / ${stay.value.bed}`, hint: 'Localização atual' },
    { label: 'Evoluções', value: progressNotes.value.length.toString(), hint: 'Registros clínicos' },
    { label: 'Diárias', value: formatCurrency(totalPendingDailyCharges.value), hint: 'Pendente faturamento' }
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
  return patientNameCache.value || `Paciente ${id.slice(0, 8)}...`;
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

async function loadOccurrences() {
  try {
    occurrences.value = await inpatientService.listOccurrences(stayId);
  } catch {
    occurrences.value = [];
  }
}

async function loadDailyCharges() {
  try {
    dailyCharges.value = await inpatientService.listDailyCharges(stayId);
  } catch {
    dailyCharges.value = [];
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

async function submitOccurrence() {
  if (!occurrenceForm.value.title.trim() || !occurrenceForm.value.description.trim()) {
    occurrenceError.value = 'Título e descrição são obrigatórios';
    return;
  }
  occurrenceSubmitting.value = true;
  occurrenceError.value = '';
  try {
    const occurrence = await inpatientService.addOccurrence(stayId, {
      type: occurrenceForm.value.type,
      severity: occurrenceForm.value.severity,
      title: occurrenceForm.value.title.trim(),
      description: occurrenceForm.value.description.trim()
    });
    occurrences.value = [occurrence, ...occurrences.value];
    cancelOccurrence();
    successMessage.value = 'Ocorrência registrada com sucesso!';
  } catch (err: unknown) {
    occurrenceError.value = err instanceof Error ? err.message : 'Erro ao registrar ocorrência';
  } finally {
    occurrenceSubmitting.value = false;
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
  if (!dailyChargeForm.value.description.trim() || dailyChargeForm.value.unitAmount <= 0) {
    dailyChargeError.value = 'Descrição e valor unitário são obrigatórios';
    return;
  }
  dailyChargeSubmitting.value = true;
  dailyChargeError.value = '';
  try {
    const charge = await inpatientService.createDailyCharge(stayId, {
      description: dailyChargeForm.value.description.trim(),
      chargeDate: dailyChargeForm.value.chargeDate,
      quantity: Number(dailyChargeForm.value.quantity) || 1,
      unitAmount: Number(dailyChargeForm.value.unitAmount)
    });
    dailyCharges.value = [charge, ...dailyCharges.value];
    cancelDailyCharge();
    successMessage.value = 'Diária lançada com sucesso!';
  } catch (err: unknown) {
    dailyChargeError.value = err instanceof Error ? err.message : 'Erro ao lançar diária';
  } finally {
    dailyChargeSubmitting.value = false;
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
  try {
    const charge = await inpatientService.markDailyChargeBilled(stayId, chargeId);
    dailyCharges.value = dailyCharges.value.map((item) => (item.id === charge.id ? charge : item));
    successMessage.value = 'Diária marcada como faturada!';
  } catch (err: unknown) {
    dailyChargeError.value = err instanceof Error ? err.message : 'Erro ao faturar diária';
  }
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
    await Promise.all([loadProgress(), loadOccurrences(), loadDailyCharges()]);
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
</style>

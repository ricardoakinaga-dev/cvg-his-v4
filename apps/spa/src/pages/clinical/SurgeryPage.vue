<template>
  <div class="clinical-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Atendimentos', 'Cirurgias']"
      title="Cirurgias"
      subtitle="Solicitação, preparo, procedimento e recuperação no mesmo fluxo."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" :disabled="mutationPending" @click="loadData">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <DsCard title="Atendimento selecionado">
      <DsInput
        v-model="selectedEncounterId"
        type="select"
        label="Atendimento"
        :disabled="loading || loadFailed || mutationPending"
      >
        <option value="">{{ loading ? 'Carregando atendimentos…' : encounters.length ? 'Selecione um atendimento' : 'Nenhum atendimento disponível' }}</option>
        <option v-for="enc in encounters" :key="enc.id" :value="enc.id">
          {{ enc.id.slice(0, 8) }} • {{ enc.reason || 'Sem descrição' }}
        </option>
      </DsInput>
      <div v-if="selectedEncounter && !loading && !loadFailed" class="summary-list">
        <div><strong>Paciente:</strong> {{ selectedEncounter.patientId }}</div>
        <div><strong>Status:</strong> {{ encounterStatusLabel(selectedEncounter.status) }}</div>
        <div><strong>Motivo:</strong> {{ selectedEncounter.reason }}</div>
      </div>
      <div v-if="loadFailed" class="context-state" role="status">
        <p>Não foi possível carregar os atendimentos.</p>
        <DsButton variant="secondary" @click="loadData">Tentar novamente</DsButton>
      </div>
      <div v-else-if="!loading && !selectedEncounter" class="context-state" role="status">
        <p>{{ encounters.length ? 'Selecione um atendimento para consultar e registrar cirurgias.' : 'Nenhum atendimento disponível para cirurgia.' }}</p>
        <DsButton variant="secondary" tag="a" to="/encounters">Ver atendimentos</DsButton>
      </div>
      <p v-else-if="loading || contextState === 'loading'" class="context-state" role="status">Carregando contexto cirúrgico…</p>
      <div v-else-if="contextState === 'failed'" class="context-state" role="status">
        <p>Não foi possível carregar as cirurgias e a timeline deste atendimento.</p>
        <DsButton variant="secondary" @click="refreshContext">Tentar novamente</DsButton>
      </div>
    </DsCard>

    <template v-if="contextReady">
      <DsCard title="Nova solicitação cirúrgica">
        <form @submit.prevent="submitSurgery">
          <fieldset class="form-grid" :disabled="mutationPending">
            <DsInput v-model="form.procedureName" label="Procedimento" required />
            <DsInput v-model="form.surgeonUserId" label="Cirurgião responsável" />
            <DsInput v-model="form.scheduledAt" type="datetime-local" label="Agendamento" />
            <DsInput
              v-model="form.surgicalTeam"
              label="Equipe cirúrgica"
              placeholder="Separada por vírgula"
            />
            <DsInput
              v-model="form.preparationNotes"
              type="textarea"
              label="Preparação"
              :rows="3"
              placeholder="Condutas pré-operatórias"
            />
            <div class="form-actions">
              <DsButton type="submit" variant="primary" :loading="submitting">Registrar cirurgia</DsButton>
              <DsButton variant="secondary" type="button" @click="resetForm">Limpar</DsButton>
            </div>
          </fieldset>
        </form>
      </DsCard>

      <div class="clinical-grid clinical-grid--two">
        <DsCard title="Solicitações cirúrgicas">
          <DataTable
            :columns="surgeryColumns"
            :rows="surgeryRequests"
            :loading="loading"
            empty-icon="🔪"
            empty-title="Nenhuma cirurgia encontrada"
            empty-description="Registre a primeira solicitação cirúrgica para este atendimento."
            variant="hoverable"
          >
            <template #cell-createdAt="{ row }">
              {{ formatDateTime((row as SurgeryCaseSummary).createdAt) }}
          </template>
          <template #cell-status="{ row }">
            {{ statusLabel((row as SurgeryCaseSummary).status) }}
          </template>
          <template #cell-actions="{ row }">
            <DsButton
              v-if="nextStatus((row as SurgeryCaseSummary).status)"
              size="sm"
              variant="secondary"
              :loading="updatingCaseId === (row as SurgeryCaseSummary).id"
              :disabled="mutationPending"
              @click="advanceCase(row as SurgeryCaseSummary)"
            >
              {{ nextStatusLabel((row as SurgeryCaseSummary).status) }}
            </DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Histórico cirúrgico">
        <DataTable
          :columns="timelineColumns"
          :rows="surgeryTimeline"
          :loading="loading"
          empty-icon="🗂️"
          empty-title="Nenhum evento cirúrgico encontrado"
          empty-description="O histórico clínico será preenchida conforme o fluxo cirúrgico evoluir."
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
    </template>

    <details class="clinical-overview">
      <summary>Resumo cirúrgico</summary>
      <dl class="overview-grid">
        <div class="overview-metric"><dt>Atendimentos disponíveis</dt><dd>{{ loading || loadFailed ? '—' : encounters.length }}</dd></div>
        <div class="overview-metric"><dt>Solicitações do atendimento</dt><dd>{{ contextReady ? surgeryRequests.length : '—' }}</dd></div>
        <div class="overview-metric"><dt>Eventos cirúrgicos do atendimento</dt><dd>{{ contextReady ? surgeryTimeline.length : '—' }}</dd></div>
      </dl>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { encounterService } from '@/services/encounter';
import { surgeryService } from '@/services/surgery';
import { medicalRecordsService } from '@/services/medicalRecords';
import type { EncounterSummary } from '@/types/encounter';
import type { ClinicalTimelineEventSummary } from '@/types/medicalRecords';
import type { SurgeryCaseSummary, SurgeryStatus } from '@/types/surgery';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { encounterStatusLabel, formatDateTime } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const surgeryRequests = ref<SurgeryCaseSummary[]>([]);
const surgeryTimeline = ref<ClinicalTimelineEventSummary[]>([]);
const selectedEncounterId = ref('');
const loading = ref(false);
const loadFailed = ref(false);
const contextState = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle');
let listRequestVersion = 0;
let contextRequestVersion = 0;
const submitting = ref(false);
const updatingCaseId = ref('');
const error = ref('');
const successMessage = ref('');

const form = ref({
  procedureName: '',
  surgeonUserId: '',
  scheduledAt: '',
  surgicalTeam: '',
  preparationNotes: ''
});

const surgeryColumns: DataTableColumn[] = [
  { key: 'procedureName', label: 'Procedimento' },
  { key: 'status', label: 'Etapa' },
  { key: 'createdAt', label: 'Criado em' },
  { key: 'actions', label: 'Ação' }
];


function timelineEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    surgery_requested: 'Solicitação registrada',
    surgery_pre_op: 'Pré-operatório',
    surgery_in_progress: 'Procedimento iniciado',
    surgery_recovery: 'Recuperação',
    surgery_completed: 'Cirurgia concluída',
    surgery_cancelled: 'Cirurgia cancelada',
    surgery_status_changed: 'Etapa atualizada',
  };
  return labels[eventType] ?? 'Atualização clínica';
}

const timelineColumns: DataTableColumn[] = [
  { key: 'eventType', label: 'Evento' },
  { key: 'summary', label: 'Resumo' },
  { key: 'occurredAt', label: 'Quando' }
];

const selectedEncounter = computed(() =>
  encounters.value.find((encounter) => encounter.id === selectedEncounterId.value)
);

const contextReady = computed(() => !loading.value && !loadFailed.value && Boolean(selectedEncounter.value) && contextState.value === 'ready');
const mutationPending = computed(() => submitting.value || Boolean(updatingCaseId.value));

function resetForm() {
  form.value = {
    procedureName: '',
    surgeonUserId: '',
    scheduledAt: '',
    surgicalTeam: '',
    preparationNotes: ''
  };
}

function clearContext() {
  contextRequestVersion += 1;
  contextState.value = 'idle';
  surgeryRequests.value = [];
  surgeryTimeline.value = [];
  resetForm();
}

watch(selectedEncounterId, () => {
  clearContext();
  error.value = '';
  successMessage.value = '';
  if (!loading.value && !loadFailed.value) void refreshContext();
}, { flush: 'sync' });

async function loadData() {
  if (mutationPending.value) return;
  const requestVersion = ++listRequestVersion;
  loading.value = true;
  loadFailed.value = false;
  error.value = '';
  successMessage.value = '';
  clearContext();
  try {
    const loadedEncounters = await encounterService.list();
    if (requestVersion !== listRequestVersion) return;
    encounters.value = loadedEncounters.filter((encounter) => encounter.status !== 'closed');
    if (!selectedEncounter.value) selectedEncounterId.value = encounters.value[0]?.id ?? '';
    await refreshContext();
  } catch (err: unknown) {
    if (requestVersion !== listRequestVersion) return;
    loadFailed.value = true;
    encounters.value = [];
    selectedEncounterId.value = '';
    clearContext();
    error.value = err instanceof Error ? err.message : 'Erro ao carregar atendimentos';
  } finally {
    if (requestVersion === listRequestVersion) loading.value = false;
  }
}

async function refreshContext() {
  const encounter = selectedEncounter.value;
  const encounterId = encounter?.id;
  const requestVersion = ++contextRequestVersion;
  surgeryRequests.value = [];
  surgeryTimeline.value = [];
  error.value = '';
  if (!encounterId || loadFailed.value) {
    contextState.value = 'idle';
    return;
  }
  contextState.value = 'loading';
  try {
    const [requests, timeline] = await Promise.all([
      surgeryService.listByEncounter(encounterId),
      medicalRecordsService.getTimeline(encounterId)
    ]);
    if (requestVersion !== contextRequestVersion || selectedEncounterId.value !== encounterId) return;
    surgeryRequests.value = requests;
    surgeryTimeline.value = timeline.filter((event) => event.eventType.startsWith('surgery_'));
    if (!form.value.procedureName.trim()) {
      form.value.procedureName = `Cirurgia para ${encounter.reason || 'atendimento'}`;
    }
    contextState.value = 'ready';
  } catch (err: unknown) {
    if (requestVersion !== contextRequestVersion || selectedEncounterId.value !== encounterId) return;
    contextState.value = 'failed';
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cirurgias e timeline';
  }
}

async function submitSurgery() {
  if (!contextReady.value || !selectedEncounter.value || mutationPending.value) {
    error.value = 'Selecione um atendimento com o contexto carregado';
    return;
  }

  const encounterId = selectedEncounter.value.id;
  const patientId = selectedEncounter.value.patientId;
  const requestVersion = contextRequestVersion;
  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    await surgeryService.createRequest({
      encounterId,
      patientId,
      procedureName: form.value.procedureName.trim(),
      ...(form.value.surgeonUserId.trim() && { surgeonUserId: form.value.surgeonUserId.trim() }),
      ...(form.value.scheduledAt.trim() && {
        scheduledAt: new Date(form.value.scheduledAt).toISOString()
      }),
      ...(form.value.surgicalTeam.trim() && {
        surgicalTeam: form.value.surgicalTeam
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      }),
      ...(form.value.preparationNotes.trim() && {
        preparationNotes: form.value.preparationNotes.trim()
      })
    });
    if (requestVersion !== contextRequestVersion || selectedEncounterId.value !== encounterId) return;
    successMessage.value = 'Solicitação cirúrgica registrada.';
    resetForm();
    await refreshContext();
  } catch (err: unknown) {
    if (requestVersion === contextRequestVersion && selectedEncounterId.value === encounterId) {
      error.value = err instanceof Error ? err.message : 'Erro ao registrar cirurgia';
    }
  } finally {
    submitting.value = false;
  }
}

const NEXT_STATUS: Partial<Record<SurgeryStatus, SurgeryStatus>> = {
  requested: 'pre_op',
  pre_op: 'in_progress',
  in_progress: 'recovery',
  recovery: 'completed'
};

function nextStatus(status: SurgeryStatus): SurgeryStatus | undefined {
  return NEXT_STATUS[status];
}

function statusLabel(status: SurgeryStatus): string {
  return {
    requested: 'Solicitada',
    pre_op: 'Pré-operatório',
    in_progress: 'Em procedimento',
    recovery: 'Recuperação',
    completed: 'Concluída',
    cancelled: 'Cancelada'
  }[status];
}

function nextStatusLabel(status: SurgeryStatus): string {
  const target = nextStatus(status);
  return target ? `Avançar para ${statusLabel(target)}` : '';
}

async function advanceCase(surgeryCase: SurgeryCaseSummary) {
  if (!contextReady.value || mutationPending.value || surgeryCase.encounterId !== selectedEncounterId.value || !surgeryRequests.value.includes(surgeryCase)) return;
  const encounterId = selectedEncounterId.value;
  const requestVersion = contextRequestVersion;
  const target = nextStatus(surgeryCase.status);
  if (!target) return;
  updatingCaseId.value = surgeryCase.id;
  error.value = '';
  try {
    await surgeryService.updateStatus(surgeryCase.id, target);
    if (requestVersion !== contextRequestVersion || selectedEncounterId.value !== encounterId) return;
    await refreshContext();
  } catch (cause) {
    if (requestVersion === contextRequestVersion && selectedEncounterId.value === encounterId) {
      error.value = cause instanceof Error ? cause.message : 'Erro ao atualizar cirurgia';
    }
  } finally {
    updatingCaseId.value = '';
  }
}

onMounted(loadData);
onBeforeUnmount(() => { listRequestVersion += 1; contextRequestVersion += 1; });
</script>

<style scoped>
.clinical-page { display: grid; gap: 16px; min-width: 0; }
.clinical-overview summary { min-height: 44px; padding-block: 12px; box-sizing: border-box; cursor: pointer; font-weight: 700; color: var(--color-text-secondary); }
.overview-metric dt { color: var(--color-text-secondary); font-size: 13px; }
.overview-metric dd { margin: 8px 0 0; font-size: 24px; font-weight: 700; color: var(--color-text); }
.context-state { color: var(--color-text-secondary); }
.form-grid { border: 0; padding: 0; margin: 0; min-width: 0; }
.summary-list { overflow-wrap: anywhere; }

.clinical-grid {
  display: grid;
  gap: 16px;
}

.clinical-grid--two {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
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
  display: grid;
  gap: 6px;
  margin-top: 12px;
  color: var(--color-text-secondary, #475569);
}
</style>

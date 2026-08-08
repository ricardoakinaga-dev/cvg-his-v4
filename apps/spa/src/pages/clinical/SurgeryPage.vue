<template>
  <div class="clinical-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Atendimentos', 'Cirurgias']" title="Cirurgias" subtitle="Solicitação, preparo, procedimento e recuperação no mesmo fluxo.">
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

    <section class="clinical-overview">
      <DsCard title="Resumo cirúrgico">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ encounters.length }}</span>
            <span class="overview-metric__label">Atendimentos carregados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ surgeryRequests.length }}</span>
            <span class="overview-metric__label">Solicitações</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ surgeryTimeline.length }}</span>
            <span class="overview-metric__label">Eventos na timeline</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ selectedEncounter ? '1' : '0' }}</span>
            <span class="overview-metric__label">Atendimento ativo</span>
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

      <DsCard title="Nova solicitação cirúrgica">
        <form class="form-grid" @submit.prevent="submitSurgery">
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
            <DsButton variant="primary" :loading="submitting">Registrar cirurgia</DsButton>
            <DsButton variant="secondary" type="button" @click="resetForm">Limpar</DsButton>
          </div>
        </form>
      </DsCard>
    </div>

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
              @click="advanceCase(row as SurgeryCaseSummary)"
            >
              {{ nextStatusLabel((row as SurgeryCaseSummary).status) }}
            </DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Timeline cirúrgica">
        <DataTable
          :columns="timelineColumns"
          :rows="surgeryTimeline"
          :loading="loading"
          empty-icon="🗂️"
          empty-title="Nenhum evento cirúrgico encontrado"
          empty-description="A timeline clínica será preenchida conforme o fluxo cirúrgico evoluir."
          variant="hoverable"
        >
          <template #cell-occurredAt="{ row }">
            {{ formatDateTime((row as ClinicalTimelineEventSummary).occurredAt) }}
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
import { surgeryService } from '@/services/surgery';
import { medicalRecordsService } from '@/services/medicalRecords';
import type { EncounterSummary } from '@/types/encounter';
import type { ClinicalTimelineEventSummary } from '@/types/medicalRecords';
import type { SurgeryCaseSummary, SurgeryStatus } from '@/types/surgery';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { formatDateTime } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const surgeryRequests = ref<SurgeryCaseSummary[]>([]);
const surgeryTimeline = ref<ClinicalTimelineEventSummary[]>([]);
const selectedEncounterId = ref('');
const loading = ref(false);
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

const timelineColumns: DataTableColumn[] = [
  { key: 'eventType', label: 'Evento' },
  { key: 'summary', label: 'Resumo' },
  { key: 'occurredAt', label: 'Quando' }
];

const selectedEncounter = computed(() =>
  encounters.value.find((encounter) => encounter.id === selectedEncounterId.value)
);

function resetForm() {
  form.value = {
    procedureName: '',
    surgeonUserId: '',
    scheduledAt: '',
    surgicalTeam: '',
    preparationNotes: ''
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
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cirurgias';
  } finally {
    loading.value = false;
  }
}

async function refreshContext() {
  if (!selectedEncounter.value) {
    surgeryRequests.value = [];
    surgeryTimeline.value = [];
    return;
  }

  surgeryRequests.value = await surgeryService.listByEncounter(selectedEncounter.value.id);
  surgeryTimeline.value = (await medicalRecordsService.getTimeline(selectedEncounter.value.id)).filter(
    (event) => event.eventType.startsWith('surgery_')
  );
  if (!form.value.procedureName.trim()) {
    form.value.procedureName = `Cirurgia para ${selectedEncounter.value.reason || 'atendimento'}`;
  }
}

async function submitSurgery() {
  if (!selectedEncounter.value) {
    error.value = 'Selecione um atendimento';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    await surgeryService.createRequest({
      encounterId: selectedEncounter.value.id,
      patientId: selectedEncounter.value.patientId,
      procedureName: form.value.procedureName.trim(),
      ...(form.value.surgeonUserId.trim() && { surgeonUserId: form.value.surgeonUserId.trim() }),
      ...(form.value.scheduledAt.trim() && {
        scheduledAt: new Date(form.value.scheduledAt).toISOString()
      }),
      ...(form.value.surgicalTeam.trim() && {
        surgicalTeam: form.value.surgicalTeam.split(',').map((item) => item.trim()).filter(Boolean)
      }),
      ...(form.value.preparationNotes.trim() && {
        preparationNotes: form.value.preparationNotes.trim()
      })
    });
    successMessage.value = 'Solicitação cirúrgica registrada.';
    resetForm();
    await refreshContext();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar cirurgia';
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
  const target = nextStatus(surgeryCase.status);
  if (!target) return;
  updatingCaseId.value = surgeryCase.id;
  error.value = '';
  try {
    await surgeryService.updateStatus(surgeryCase.id, target);
    await refreshContext();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Erro ao atualizar cirurgia';
  } finally {
    updatingCaseId.value = '';
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

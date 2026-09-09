<template>
  <div class="clinical-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Internação', 'Altas']" title="Altas" subtitle="Registre a evolução e as orientações de continuidade do cuidado.">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" :disabled="loading || submitting" @click="loadData">Atualizar</DsButton>
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
        <DsInput v-model="selectedEncounterId" type="select" label="Atendimento" :disabled="loading || submitting || loadFailed" @change="syncForm">
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
        <div v-if="loadFailed" class="context-feedback" role="status">
          <p>Não foi possível carregar os atendimentos e as altas.</p>
          <DsButton variant="secondary" @click="loadData">Tentar novamente</DsButton>
        </div>
        <div v-else-if="!loading && !selectedEncounter" class="context-feedback">
          <p>{{ encounters.length ? 'Selecione o atendimento para registrar ou revisar uma alta.' : 'Abra um atendimento para registrar a alta e as orientações de continuidade.' }}</p>
          <DsButton tag="a" to="/encounters" variant="secondary">Ver atendimentos</DsButton>
        </div>
      </DsCard>

      <DsCard v-if="selectedEncounter && !loading && !loadFailed" :title="editingDischargeId ? 'Editar alta' : 'Registrar alta'">
        <form class="form-grid" @submit.prevent="submitDischarge">
          <DsInput v-model="form.dischargeType" type="select" label="Tipo" required>
            <option value="ambulatory">Ambulatorial</option>
            <option value="inpatient">Internação</option>
            <option value="transfer">Transferência</option>
            <option value="death">Óbito</option>
          </DsInput>
          <DsInput v-model="form.outcome" label="Desfecho" placeholder="Ex: Estável para alta" />
          <DsInput
            v-model="form.clinicalSummary"
            type="textarea"
            label="Resumo clínico"
            :rows="3"
            placeholder="Resumo objetivo da evolução"
          />
          <DsInput
            v-model="form.continuityInstructions"
            type="textarea"
            label="Instruções de continuidade"
            :rows="3"
            placeholder="Orientações pós-alta"
          />
          <DsInput v-model="form.followUpDate" type="date" label="Retorno" />
          <DsInput
            v-model="form.followUpNotes"
            type="textarea"
            label="Observações de retorno"
            :rows="2"
          />
          <div class="form-actions">
            <DsButton type="submit" variant="primary" :loading="submitting" :disabled="submitting">
              {{ editingDischargeId ? 'Atualizar' : 'Registrar' }}
            </DsButton>
            <DsButton variant="secondary" type="button" :disabled="submitting" @click="resetForm">{{ editingDischargeId ? 'Restaurar dados salvos' : 'Limpar' }}</DsButton>
          </div>
        </form>
      </DsCard>
    </div>

    <DsCard v-if="!loadFailed" title="Altas registradas">
      <DataTable
        :columns="columns"
        :rows="discharges"
        :loading="loading"
        empty-icon="🏠"
        empty-title="Nenhuma alta encontrada"
        empty-description="As altas registradas ficam disponíveis aqui para consulta e revisão."
        variant="hoverable"
      >
        <template #cell-encounterId="{ row }">
          {{ (row as DischargeSummary).encounterId.slice(0, 8) }}...
        </template>
        <template #cell-dischargeType="{ row }">
          {{ dischargeTypeLabel((row as DischargeSummary).dischargeType) }}
        </template>
        <template #cell-dischargedAt="{ row }">
          {{ formatDateTime((row as DischargeSummary).dischargedAt) }}
        </template>
        <template #cell-actions="{ row }">
          <DsButton size="sm" variant="secondary" :disabled="loading || submitting" @click="editDischarge(row as DischargeSummary)">
            Editar
          </DsButton>
        </template>
      </DataTable>
    </DsCard>
    <details class="clinical-overview">
      <summary>Resumo de altas</summary>
      <DsCard>
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ loading || loadFailed ? '—' : (encounters.length) }}</span>
            <span class="overview-metric__label">Atendimentos carregados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ loading || loadFailed ? '—' : (discharges.length) }}</span>
            <span class="overview-metric__label">Altas registradas</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ loading || loadFailed ? '—' : (followUpCount) }}</span>
            <span class="overview-metric__label">Com retorno</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ loading || loadFailed ? '—' : (editingDischargeId ? '1' : '0') }}</span>
            <span class="overview-metric__label">Em edição</span>
          </div>
        </div>
      </DsCard>
    </details>
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
import { dischargeService } from '@/services/discharges';
import type { EncounterSummary } from '@/types/encounter';
import type { DischargeSummary } from '@cvg-his-v2/shared-types';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { formatDateTime, encounterStatusLabel } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const discharges = ref<DischargeSummary[]>([]);
const selectedEncounterId = ref('');
const editingDischargeId = ref('');
const loading = ref(true);
const loadFailed = ref(false);
let loadSequence = 0;
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');

const form = ref({
  dischargeType: 'ambulatory' as DischargeSummary['dischargeType'],
  outcome: '',
  clinicalSummary: '',
  continuityInstructions: '',
  followUpDate: '',
  followUpNotes: ''
});

const columns: DataTableColumn[] = [
  { key: 'encounterId', label: 'Atendimento' },
  { key: 'dischargeType', label: 'Tipo' },
  { key: 'outcome', label: 'Desfecho' },
  { key: 'version', label: 'Versão' },
  { key: 'dischargedAt', label: 'Alta' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const selectedEncounter = computed(() =>
  encounters.value.find((encounter) => encounter.id === selectedEncounterId.value)
);

const followUpCount = computed(
  () => discharges.value.filter((discharge) => Boolean(discharge.followUpDate)).length
);

function dischargeTypeLabel(dischargeType: DischargeSummary['dischargeType']): string {
  const labels: Record<DischargeSummary['dischargeType'], string> = {
    ambulatory: 'Ambulatorial',
    inpatient: 'Internação',
    transfer: 'Transferência',
    death: 'Óbito'
  };
  return labels[dischargeType];
}

function clearForm() {
  editingDischargeId.value = '';
  form.value = {
    dischargeType: 'ambulatory',
    outcome: '',
    clinicalSummary: '',
    continuityInstructions: '',
    followUpDate: '',
    followUpNotes: ''
  };
}

function resetForm() { clearForm(); syncForm(); }

function syncForm() {
  const current = discharges.value.find(
    (discharge) => discharge.encounterId === selectedEncounterId.value
  );
  if (!current) {
    clearForm();
    return;
  }

  editingDischargeId.value = current.id;
  form.value = {
    dischargeType: current.dischargeType,
    outcome: current.outcome ?? '',
    clinicalSummary: current.clinicalSummary ?? '',
    continuityInstructions: current.continuityInstructions ?? '',
    followUpDate: current.followUpDate ?? '',
    followUpNotes: current.followUpNotes ?? ''
  };
}

function editDischarge(discharge: DischargeSummary) {
  if (loading.value || submitting.value || loadFailed.value) return;
  selectedEncounterId.value = discharge.encounterId;
  editingDischargeId.value = discharge.id;
  form.value = {
    dischargeType: discharge.dischargeType,
    outcome: discharge.outcome ?? '',
    clinicalSummary: discharge.clinicalSummary ?? '',
    continuityInstructions: discharge.continuityInstructions ?? '',
    followUpDate: discharge.followUpDate ?? '',
    followUpNotes: discharge.followUpNotes ?? ''
  };
}

async function loadData() {
  const sequence = ++loadSequence;
  loading.value = true;
  loadFailed.value = false;
  error.value = '';
  try {
    const [loadedEncounters, loadedDischarges] = await Promise.all([
      encounterService.list(),
      dischargeService.list()
    ]);
    if (sequence !== loadSequence) return;
    encounters.value = loadedEncounters;
    discharges.value = loadedDischarges;
    if (!encounters.value.some(encounter => encounter.id === selectedEncounterId.value)) {
      selectedEncounterId.value = encounters.value[0]?.id ?? '';
    }
    syncForm();
  } catch (err: unknown) {
    if (sequence !== loadSequence) return;
    loadFailed.value = true;
    error.value = err instanceof Error ? err.message : 'Erro ao carregar altas';
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}

async function submitDischarge() {
  if (loading.value || loadFailed.value || submitting.value) return;
  if (!selectedEncounter.value) {
    error.value = 'Selecione um atendimento';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    const payload = {
      encounterId: selectedEncounter.value.id,
      dischargeType: form.value.dischargeType,
      outcome: form.value.outcome.trim(),
      clinicalSummary: form.value.clinicalSummary.trim(),
      continuityInstructions: form.value.continuityInstructions.trim(),
      followUpDate: form.value.followUpDate,
      followUpNotes: form.value.followUpNotes.trim()
    };

    if (editingDischargeId.value) {
      await dischargeService.update(editingDischargeId.value, payload);
      successMessage.value = 'Alta atualizada com sucesso.';
    } else {
      await dischargeService.create(payload);
      successMessage.value = 'Alta registrada com sucesso.';
    }

    await loadData();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao registrar alta';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.clinical-page { display: grid; gap: 16px; }
.clinical-overview summary { min-height: 44px; padding-block: 12px; box-sizing: border-box; cursor: pointer; font-weight: 700; color: var(--color-text-secondary); }
.context-feedback { color: var(--color-text-secondary); line-height: 1.6; }
.summary-list { overflow-wrap: anywhere; }
.clinical-grid {
  display: grid;
  gap: 16px;
}

.clinical-grid--two {
  grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
}

.clinical-overview {
  margin-block: 16px;
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
@media (max-width: 600px) {
  .form-actions { display: grid; grid-template-columns: minmax(0, 1fr); }
}
</style>

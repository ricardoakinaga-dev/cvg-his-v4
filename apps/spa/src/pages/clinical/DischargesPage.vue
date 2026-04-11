<template>
  <div class="clinical-page">
    <AppPageHeader title="Altas" subtitle="Trilha real de alta clínica ligada aos atendimentos">
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
      <DsCard title="Resumo de altas">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ encounters.length }}</span>
            <span class="overview-metric__label">Atendimentos carregados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ discharges.length }}</span>
            <span class="overview-metric__label">Altas registradas</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ followUpCount }}</span>
            <span class="overview-metric__label">Com retorno</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ editingDischargeId ? '1' : '0' }}</span>
            <span class="overview-metric__label">Em edição</span>
          </div>
        </div>
      </DsCard>
    </section>

    <div class="clinical-grid clinical-grid--two">
      <DsCard title="Atendimento selecionado">
        <DsInput v-model="selectedEncounterId" type="select" label="Atendimento" @change="syncForm">
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

      <DsCard :title="editingDischargeId ? 'Editar alta' : 'Registrar alta'">
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
            <DsButton variant="primary" :loading="submitting">
              {{ editingDischargeId ? 'Atualizar' : 'Registrar' }}
            </DsButton>
            <DsButton variant="secondary" type="button" @click="resetForm">Limpar</DsButton>
          </div>
        </form>
      </DsCard>
    </div>

    <DsCard title="Altas registradas">
      <DataTable
        :columns="columns"
        :rows="discharges"
        :loading="loading"
        empty-icon="🏠"
        empty-title="Nenhuma alta encontrada"
        empty-description="Registre a primeira alta para iniciar a trilha clínica."
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
          <DsButton size="sm" variant="secondary" @click="editDischarge(row as DischargeSummary)">
            Editar
          </DsButton>
        </template>
      </DataTable>
    </DsCard>
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
import { formatDateTime } from '@/utils/labels';

const encounters = ref<EncounterSummary[]>([]);
const discharges = ref<DischargeSummary[]>([]);
const selectedEncounterId = ref('');
const editingDischargeId = ref('');
const loading = ref(false);
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

function resetForm() {
  editingDischargeId.value = '';
  form.value = {
    dischargeType: 'ambulatory',
    outcome: '',
    clinicalSummary: '',
    continuityInstructions: '',
    followUpDate: '',
    followUpNotes: ''
  };
  syncForm();
}

function syncForm() {
  const current = discharges.value.find(
    (discharge) => discharge.encounterId === selectedEncounterId.value
  );
  if (!current) {
    editingDischargeId.value = '';
    if (!editingDischargeId.value) {
      form.value.dischargeType = 'ambulatory';
    }
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
  loading.value = true;
  error.value = '';
  try {
    const [loadedEncounters, loadedDischarges] = await Promise.all([
      encounterService.list(),
      dischargeService.list()
    ]);
    encounters.value = loadedEncounters;
    discharges.value = loadedDischarges;
    if (!selectedEncounterId.value && encounters.value.length > 0) {
      selectedEncounterId.value = encounters.value[0].id;
    }
    syncForm();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar altas';
  } finally {
    loading.value = false;
  }
}

async function submitDischarge() {
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
      outcome: form.value.outcome.trim() || undefined,
      clinicalSummary: form.value.clinicalSummary.trim() || undefined,
      continuityInstructions: form.value.continuityInstructions.trim() || undefined,
      followUpDate: form.value.followUpDate || undefined,
      followUpNotes: form.value.followUpNotes.trim() || undefined
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

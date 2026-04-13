<template>
  <div class="patients-list-page">
    <AppPageHeader
      title="Pacientes"
      subtitle="Atendimento > Cadastrados > Pacientes. Base clínica dos animais que seguem para agenda, fila, atendimento, prontuário e internação."
      :secondary-actions="headerSecondaryActions"
      :primary-action="headerPrimaryAction"
    />

    <section class="patients-list-page__overview">
      <DsCard title="Resumo operacional">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ totalPatients }}</span>
            <span class="overview-metric__label">Pacientes cadastrados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ activePatients }}</span>
            <span class="overview-metric__label">Ativos na operação</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ weightedPatients }}</span>
            <span class="overview-metric__label">Com peso informado</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ withBreedPatients }}</span>
            <span class="overview-metric__label">Com raça definida</span>
          </div>
        </div>
      </DsCard>

      <DsCard title="Navegação do domínio">
        <div class="quick-actions">
          <DsButton tag="a" to="/patients/new" variant="primary">+ Novo Paciente</DsButton>
          <DsButton tag="a" to="/owners" variant="secondary">👤 Ver Tutores</DsButton>
          <DsButton tag="a" to="/appointments" variant="ghost">📅 Agendamentos</DsButton>
          <DsButton tag="a" to="/encounters" variant="ghost">🩺 Atendimentos</DsButton>
        </div>
        <p class="overview-note">
          Pacientes e tutores vivem no mesmo domínio de <strong>Atendimento</strong>. Cadastre o animal aqui e siga para agenda, fila, triagem, atendimento e prontuário sem trocar de contexto.
        </p>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="search-bar">
      <DsInput
        v-model="search"
        type="search"
        placeholder="Buscar por nome, espécie, raça ou tutor..."
        @keyup.enter="load"
      />
      <DsButton variant="secondary" @click="load">Buscar</DsButton>
    </div>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      empty-icon="🐾"
      empty-title="Nenhum paciente encontrado"
      empty-description="Cadastre o primeiro paciente para abastecer agenda, triagem, atendimento e internação."
      variant="hoverable"
    >
      <template #emptyAction>
        <div class="patients-list-page__empty-actions">
          <DsButton tag="a" to="/patients/new" variant="primary">+ Novo Paciente</DsButton>
          <DsButton tag="a" to="/owners" variant="secondary">👤 Ver Tutores</DsButton>
        </div>
      </template>
      <template #cell-name="{ row }">
        <strong>{{ (row as PatientSummary).name }}</strong>
        <span v-if="(row as PatientSummary).breed" class="muted"
          ><br />{{ (row as PatientSummary).breed }}</span
        >
      </template>
      <template #cell-tutor="{ row }">
        {{ ownerName((row as PatientSummary).primaryOwnerId) }}
      </template>
      <template #cell-species="{ row }">
        {{ speciesLabel((row as PatientSummary).species) }}
      </template>
      <template #cell-sex="{ row }">
        {{ sexLabel((row as PatientSummary).sex) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="patientStatusLabel((row as PatientSummary).status)"
          :variant="statusVariant((row as PatientSummary).status)"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/patients/${(row as PatientSummary).id}`"
          size="sm"
          variant="secondary"
          >Ver</DsButton
        >
        <DsButton
          tag="a"
          :to="`/patients/${(row as PatientSummary).id}/edit`"
          size="sm"
          variant="secondary"
          >Editar</DsButton
        >
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { patientService } from '@/services/patient';
import type { PatientSummary } from '@/types/patient';
import { speciesLabel, sexLabel, patientStatusLabel } from '@/utils/labels';
import { useListData } from '@/composables/useListData';
import { useEntityCache } from '@/composables/useEntityCache';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const entityCache = useEntityCache();
const ownerNames = ref<Record<string, string>>({});

function statusVariant(status: string) {
  if (status === 'active') return 'success';
  if (status === 'deceased') return 'danger';
  return 'warning';
}

function ownerName(ownerId: string): string {
  return ownerNames.value[ownerId] || `Tutor ${ownerId.slice(0, 8)}...`;
}

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Nome' },
  { key: 'tutor', label: 'Tutor' },
  { key: 'species', label: 'Espécie' },
  { key: 'sex', label: 'Sexo' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const totalPatients = computed(() => items.value.length);
const activePatients = computed(
  () => items.value.filter((patient) => patient.status === 'active').length
);
const weightedPatients = computed(
  () => items.value.filter((patient) => typeof patient.baseWeightKg === 'number').length
);
const withBreedPatients = computed(
  () => items.value.filter((patient) => Boolean(patient.breed?.trim())).length
);

const { items, loading, error, search, load } = useListData<PatientSummary>({
  fetchFn: async (q) => {
    const patients = await patientService.list(q);
    const ownerIds = [...new Set(patients.map((p) => p.primaryOwnerId))];
    await Promise.all(
      ownerIds.map(async (id) => {
        ownerNames.value[id] = await entityCache.getOwnerName(id);
      })
    );
    return patients;
  },
  entityLabel: 'pacientes',
  withSearch: true
});

const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-patients',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => load()
  },
  {
    key: 'view-owners',
    label: 'Ver tutores',
    variant: 'ghost' as const,
    to: '/owners'
  },
  {
    key: 'view-agenda',
    label: 'Agenda',
    variant: 'ghost' as const,
    to: '/appointments'
  }
]);

const headerPrimaryAction = computed(() => ({
  key: 'new-patient',
  label: '+ Novo Paciente',
  variant: 'primary' as const,
  to: '/patients/new'
}));
</script>

<style scoped>
.patients-list-page__overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.overview-metric {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.overview-note {
  margin: 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.5;
}

.patients-list-page__empty-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>

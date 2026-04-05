<template>
  <div class="patients-list-page">
    <AppPageHeader title="Pacientes" subtitle="Cadastro clínico de animais atendidos">
      <template #actions>
        <router-link to="/patients/new" class="btn btn--primary">+ Novo Paciente</router-link>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="search-bar">
      <input
        v-model="search"
        type="search"
        class="search-bar__input"
        placeholder="Buscar por nome, espécie, raça ou tutor..."
        @keyup.enter="load"
      />
      <button class="btn btn--secondary" @click="load">Buscar</button>
    </div>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      empty-icon="🐾"
      empty-title="Nenhum paciente encontrado"
      empty-description="Cadastre o primeiro paciente para começar."
      variant="hoverable"
    >
      <template #emptyAction>
        <router-link to="/patients/new" class="btn btn--primary">+ Novo Paciente</router-link>
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
        <router-link
          :to="`/patients/${(row as PatientSummary).id}`"
          class="btn btn--sm btn--secondary"
          >Ver</router-link
        >
        <router-link
          :to="`/patients/${(row as PatientSummary).id}/edit`"
          class="btn btn--sm btn--secondary"
          >Editar</router-link
        >
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { patientService } from '@/services/patient';
import type { PatientSummary } from '@/types/patient';
import { speciesLabel, sexLabel, patientStatusLabel } from '@/utils/labels';
import { useListData } from '@/composables/useListData';
import { useEntityCache } from '@/composables/useEntityCache';
import StatusBadge from '@/components/StatusBadge.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

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
</script>

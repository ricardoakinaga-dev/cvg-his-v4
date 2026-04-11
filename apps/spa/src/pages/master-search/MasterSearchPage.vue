<template>
  <div class="master-search-page">
    <AppPageHeader title="Busca mestre" subtitle="Pesquisa transversal de tutores, pacientes e vínculos">
      <template #actions>
        <DsBadge variant="info" size="md">{{ totals.owners }} tutores</DsBadge>
        <DsBadge variant="info" size="md">{{ totals.patients }} pacientes</DsBadge>
        <DsButton variant="secondary" :loading="loading" @click="runSearch">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="master-search-page__overview">
      <div class="overview-grid">
        <div class="overview-card">
          <span class="overview-card__value">{{ totals.owners }}</span>
          <span class="overview-card__label">Tutores</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ totals.patients }}</span>
          <span class="overview-card__label">Pacientes</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ totals.links }}</span>
          <span class="overview-card__label">Vínculos</span>
        </div>
      </div>
    </section>

    <section class="search-bar">
      <DsInput v-model="query" placeholder="Buscar por tutor, paciente, documento, espécie ou relação" />
      <DsButton :loading="loading" @click="runSearch">Buscar</DsButton>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="results-grid">
      <DsCard title="Tutores encontrados" class="panel">
        <DataTable
          :columns="ownerColumns"
          :rows="owners"
          :loading="loading"
          empty-icon="👤"
          empty-title="Nenhum tutor encontrado"
          empty-description="Execute uma nova busca."
          variant="hoverable"
        >
          <template #cell-fullName="{ row }">
            <strong>{{ (row as OwnerSummary).fullName }}</strong>
          </template>
          <template #cell-contacts="{ row }">
            {{ contactSummary((row as OwnerSummary).contacts) }}
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Pacientes encontrados" class="panel">
        <DataTable
          :columns="patientColumns"
          :rows="patients"
          :loading="loading"
          empty-icon="🐾"
          empty-title="Nenhum paciente encontrado"
          empty-description="Execute uma nova busca."
          variant="hoverable"
        >
          <template #cell-name="{ row }">
            <strong>{{ (row as PatientSummary).name }}</strong>
            <div class="muted">{{ (row as PatientSummary).species }}</div>
          </template>
          <template #cell-sex="{ row }">
            {{ sexLabel((row as PatientSummary).sex) }}
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Vínculos encontrados" class="panel">
        <DataTable
          :columns="linkColumns"
          :rows="links"
          :loading="loading"
          empty-icon="🔗"
          empty-title="Nenhum vínculo encontrado"
          empty-description="Execute uma nova busca."
          variant="hoverable"
        >
          <template #cell-relationshipType="{ row }">
            <DsBadge variant="info" size="sm">{{ (row as OwnerPatientLinkSummary).relationshipType }}</DsBadge>
          </template>
          <template #cell-financialResponsible="{ row }">
            <DsBadge
              :variant="(row as OwnerPatientLinkSummary).financialResponsible ? 'success' : 'neutral'"
              size="sm"
            >
              {{ (row as OwnerPatientLinkSummary).financialResponsible ? 'Sim' : 'Não' }}
            </DsBadge>
          </template>
        </DataTable>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { masterSearchService } from '@/services/masterSearch';
import type { OwnerPatientLinkSummary, OwnerSummary, PatientSummary } from '@cvg-his-v2/shared-types';
import type { DataTableColumn } from '@/components/DataTable.vue';

const query = ref('');
const loading = ref(false);
const error = ref('');
const owners = ref<OwnerSummary[]>([]);
const patients = ref<PatientSummary[]>([]);
const links = ref<OwnerPatientLinkSummary[]>([]);

const totals = reactive({ owners: 0, patients: 0, links: 0 });

const ownerColumns: DataTableColumn[] = [
  { key: 'fullName', label: 'Tutor' },
  { key: 'documentId', label: 'Documento' },
  { key: 'contacts', label: 'Contato' },
  { key: 'financialResponsible', label: 'Financeiro' }
];

const patientColumns: DataTableColumn[] = [
  { key: 'name', label: 'Paciente' },
  { key: 'species', label: 'Espécie' },
  { key: 'sex', label: 'Sexo' },
  { key: 'primaryOwnerId', label: 'Tutor principal' }
];

const linkColumns: DataTableColumn[] = [
  { key: 'ownerId', label: 'Tutor' },
  { key: 'patientId', label: 'Paciente' },
  { key: 'relationshipType', label: 'Relação' },
  { key: 'financialResponsible', label: 'Financeiro' }
];

function contactSummary(contacts: OwnerSummary['contacts']) {
  return contacts.length > 0 ? contacts[0]?.value : 'Sem contato';
}

function sexLabel(sex: PatientSummary['sex']) {
  if (sex === 'male') return 'Macho';
  if (sex === 'female') return 'Fêmea';
  return 'Indefinido';
}

async function runSearch() {
  loading.value = true;
  error.value = '';
  try {
    const result = await masterSearchService.search(query.value.trim());
    owners.value = result.owners;
    patients.value = result.patients;
    links.value = result.links;
    totals.owners = result.owners.length;
    totals.patients = result.patients.length;
    totals.links = result.links.length;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao executar busca mestre';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void runSearch();
});
</script>

<style scoped>
.master-search-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-card__value {
  display: block;
  font-size: 28px;
  font-weight: 800;
}

.overview-card__label {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
}

.search-bar {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.panel {
  border-radius: 18px;
}

.muted {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  margin-top: 4px;
}
</style>

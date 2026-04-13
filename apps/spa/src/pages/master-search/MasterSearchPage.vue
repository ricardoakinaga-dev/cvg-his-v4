<template>
  <div class="master-search-page">
    <AppPageHeader title="Busca federada" subtitle="Busca mestre transversal para suporte operacional, relacionamento e conferência cadastral">
      <template #actions>
        <DsBadge variant="info" size="md">{{ totals.owners }} tutores</DsBadge>
        <DsBadge variant="info" size="md">{{ totals.patients }} pacientes</DsBadge>
        <DsButton variant="secondary" :loading="loading" @click="runSearch">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="master-search-page__actions">
      <DsCard title="Ações rápidas — busca mestre" variant="compact">
        <div class="quick-actions">
          <DsButton tag="a" to="/owners" variant="primary">Tutores</DsButton>
          <DsButton tag="a" to="/patients" variant="secondary">Pacientes</DsButton>
          <DsButton tag="a" to="/access-control" variant="secondary">Governança de Acesso</DsButton>
        </div>
      </DsCard>
    </section>

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
      <DsInput
        v-model="query"
        type="search"
        placeholder="Buscar por tutor, paciente, documento, espécie ou relação..."
        @input="onQueryInput"
        @keyup.enter="runSearch"
      />
      <DsButton :loading="loading" @click="runSearch">Buscar</DsButton>
      <DsButton v-if="query" variant="ghost" @click="clearSearch">Limpar</DsButton>
    </section>

    <p v-if="query && !loading && hasResults" class="search-hint">
      <span class="search-hint__count">{{ totalResults }} resultado(s) para "{{ query }}"</span>
    </p>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div v-if="hasResults" class="results-grid">
      <DsCard title="Tutores" class="panel">
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
            <DsButton tag="a" :to="`/owners/${(row as OwnerSummary).id}`" variant="ghost" size="sm">
              {{ (row as OwnerSummary).fullName }}
            </DsButton>
          </template>
          <template #cell-contacts="{ row }">
            {{ contactSummary((row as OwnerSummary).contacts) }}
          </template>
          <template #cell-financialResponsible="{ row }">
            <StatusBadge
              :label="(row as OwnerSummary).financialResponsible ? 'Sim' : 'Não'"
              :variant="(row as OwnerSummary).financialResponsible ? 'success' : 'neutral'"
            />
          </template>
          <template #cell-status="{ row }">
            <StatusBadge
              :label="(row as OwnerSummary).status === 'active' ? 'Ativo' : 'Inativo'"
              :variant="(row as OwnerSummary).status === 'active' ? 'success' : 'danger'"
            />
          </template>
          <template #cell-actions="{ row }">
            <DsButton tag="a" :to="`/owners/${(row as OwnerSummary).id}`" size="sm" variant="secondary">
              Ver
            </DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Pacientes" class="panel">
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
            <DsButton tag="a" :to="`/patients/${(row as PatientSummary).id}`" variant="ghost" size="sm">
              {{ (row as PatientSummary).name }}
            </DsButton>
          </template>
          <template #cell-species="{ row }">
            {{ speciesLabel((row as PatientSummary).species) }}
          </template>
          <template #cell-sex="{ row }">
            {{ sexLabel((row as PatientSummary).sex) }}
          </template>
          <template #cell-primaryOwnerId="{ row }">
            {{ ownerNames[(row as PatientSummary).primaryOwnerId] || `Tutor ${(row as PatientSummary).primaryOwnerId.slice(0, 8)}...` }}
          </template>
          <template #cell-actions="{ row }">
            <DsButton tag="a" :to="`/patients/${(row as PatientSummary).id}`" size="sm" variant="secondary">
              Ver
            </DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Vínculos" class="panel">
        <DataTable
          :columns="linkColumns"
          :rows="links"
          :loading="loading"
          empty-icon="🔗"
          empty-title="Nenhum vínculo encontrado"
          empty-description="Execute uma nova busca."
          variant="hoverable"
        >
          <template #cell-ownerId="{ row }">
            <DsButton
              tag="a"
              :to="`/owners/${(row as OwnerPatientLinkSummary).ownerId}`"
              variant="ghost"
              size="sm"
            >
              {{ ownerNames[(row as OwnerPatientLinkSummary).ownerId] || (row as OwnerPatientLinkSummary).ownerId.slice(0, 8) + '...' }}
            </DsButton>
          </template>
          <template #cell-patientId="{ row }">
            <DsButton
              tag="a"
              :to="`/patients/${(row as OwnerPatientLinkSummary).patientId}`"
              variant="ghost"
              size="sm"
            >
              {{ patientNames[(row as OwnerPatientLinkSummary).patientId] || (row as OwnerPatientLinkSummary).patientId.slice(0, 8) + '...' }}
            </DsButton>
          </template>
          <template #cell-relationshipType="{ row }">
            <DsBadge variant="info" size="sm">{{ relationshipLabel((row as OwnerPatientLinkSummary).relationshipType) }}</DsBadge>
          </template>
          <template #cell-financialResponsible="{ row }">
            <StatusBadge
              :label="(row as OwnerPatientLinkSummary).financialResponsible ? 'Sim' : 'Não'"
              :variant="(row as OwnerPatientLinkSummary).financialResponsible ? 'success' : 'neutral'"
            />
          </template>
          <template #cell-actions="{ row }">
            <DsButton tag="a" :to="`/patients/${(row as OwnerPatientLinkSummary).patientId}`" size="sm" variant="secondary">
              Ver Paciente
            </DsButton>
          </template>
        </DataTable>
      </DsCard>
    </div>

    <DsAlert v-else-if="query && !loading" variant="info">
      Nenhum resultado encontrado para "{{ query }}". Tente buscar por outro termo.
    </DsAlert>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import type { OwnerSummary } from '@/types/owner';
import type { OwnerPatientLinkSummary, PatientSummary } from '@/types/patient';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';

const query = ref('');
const loading = ref(false);
const error = ref('');
const owners = ref<OwnerSummary[]>([]);
const patients = ref<PatientSummary[]>([]);
const links = ref<OwnerPatientLinkSummary[]>([]);
const ownerNames = ref<Record<string, string>>({});
const patientNames = ref<Record<string, string>>({});

const totals = reactive({ owners: 0, patients: 0, links: 0 });
const hasResults = computed(() => owners.value.length > 0 || patients.value.length > 0 || links.value.length > 0);
const totalResults = computed(() => totals.owners + totals.patients + totals.links);

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function onQueryInput() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (query.value.trim().length >= 2) {
      void runSearch();
    }
  }, 400);
}

const ownerColumns: DataTableColumn[] = [
  { key: 'fullName', label: 'Tutor' },
  { key: 'documentId', label: 'Documento' },
  { key: 'contacts', label: 'Contato' },
  { key: 'financialResponsible', label: 'Financeiro' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const patientColumns: DataTableColumn[] = [
  { key: 'name', label: 'Paciente' },
  { key: 'species', label: 'Espécie' },
  { key: 'sex', label: 'Sexo' },
  { key: 'primaryOwnerId', label: 'Tutor' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const linkColumns: DataTableColumn[] = [
  { key: 'ownerId', label: 'Tutor' },
  { key: 'patientId', label: 'Paciente' },
  { key: 'relationshipType', label: 'Relação' },
  { key: 'financialResponsible', label: 'Financeiro' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

function contactSummary(contacts: OwnerSummary['contacts']) {
  return contacts.length > 0 ? contacts[0]?.value : 'Sem contato';
}

function sexLabel(sex: PatientSummary['sex']) {
  if (sex === 'male') return 'Macho';
  if (sex === 'female') return 'Fêmea';
  return 'Indefinido';
}

function speciesLabel(species: string) {
  return species || '—';
}

function relationshipLabel(type: OwnerPatientLinkSummary['relationshipType']) {
  if (type === 'primary') return 'Principal';
  if (type === 'secondary') return 'Secundário';
  if (type === 'financial') return 'Financeiro';
  return type;
}

async function loadEntityNames() {
  const allOwners = await ownerService.list();
  const allPatients = await patientService.list();
  for (const o of allOwners) {
    ownerNames.value[o.id] = o.fullName;
  }
  for (const p of allPatients) {
    patientNames.value[p.id] = p.name;
  }
}

async function runSearch() {
  if (!query.value.trim()) return;
  loading.value = true;
  error.value = '';
  try {
    const [ownersResult, patientsResult] = await Promise.all([
      ownerService.list(query.value.trim()),
      patientService.list(query.value.trim())
    ]);
    owners.value = ownersResult;
    patients.value = patientsResult;
    links.value = patientsResult
      .filter((p) => ownerNames.value[p.primaryOwnerId])
      .map((p) => ({
        id: `link-${p.id}`,
        accountId: p.accountId,
        ownerId: p.primaryOwnerId,
        patientId: p.id,
        relationshipType: 'primary' as const,
        financialResponsible: true,
        createdAt: p.createdAt
      }));
    totals.owners = ownersResult.length;
    totals.patients = patientsResult.length;
    totals.links = links.value.length;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao executar busca federada';
  } finally {
    loading.value = false;
  }
}

function clearSearch() {
  query.value = '';
  owners.value = [];
  patients.value = [];
  links.value = [];
  totals.owners = 0;
  totals.patients = 0;
  totals.links = 0;
}

onMounted(async () => {
  await loadEntityNames();
  if (query.value.trim()) {
    await runSearch();
  }
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

.master-search-page__actions {
  margin-bottom: 4px;
}

.search-bar {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
}

.search-hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.search-hint__count {
  font-weight: 500;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.panel {
  border-radius: 18px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

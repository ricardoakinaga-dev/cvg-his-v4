<template>
  <div class="owners-list-page">
    <AppPageHeader
      title="Clientes"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Clientes']"
      subtitle="Cadastro central de relacionamento, contato, animais vinculados, comandas e financeiro."
      :secondary-actions="headerSecondaryActions"
      :primary-action="headerPrimaryAction"
    />

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <form class="search-shell" @submit.prevent="load">
      <div class="search-bar">
        <DsInput
          v-model="filters.search"
          type="search"
          placeholder="Buscar por Nome, CPF, E-mail ou ID"
        />
        <DsButton type="submit" variant="secondary" :loading="loading">Filtrar</DsButton>
        <DsButton type="button" variant="ghost" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? 'Ocultar filtros' : 'Filtrar e ordenar' }}
        </DsButton>
      </div>

      <div v-if="showAdvanced" class="advanced-filters">
        <DsInput v-model="filters.status" label="Status" type="select">
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </DsInput>
        <DsInput v-model="filters.financial" label="Financeiro" type="select">
          <option value="all">Todos</option>
          <option value="yes">Responsável financeiro</option>
          <option value="no">Sem responsabilidade financeira</option>
        </DsInput>
        <DsInput v-model="filters.sort" label="Ordenação" type="select">
          <option value="recent">Mais recentes</option>
          <option value="name">Nome A-Z</option>
          <option value="patients">Mais animais</option>
        </DsInput>
      </div>
    </form>

    <section v-if="displayedOwners.length > 0" class="owners-list-page__recent">
      <div class="owners-list-page__section-head">
        <h2>Clientes</h2>
        <p>{{ resultSummary }}</p>
      </div>

      <div class="owners-grid">
        <DsCard
          v-for="owner in displayedOwners"
          :key="owner.id"
          variant="elevated"
          class="owner-card"
        >
          <div class="owner-card__header">
            <div class="owner-card__avatar">{{ initials(owner.fullName) }}</div>
            <div class="owner-card__identity">
              <div class="owner-card__badges">
                <StatusBadge
                  :label="ownerStatusLabel(owner.status)"
                  :variant="owner.status === 'active' ? 'success' : 'danger'"
                />
                <StatusBadge v-if="owner.financialResponsible" label="Financeiro" variant="info" />
              </div>
              <h3 class="owner-card__name">{{ owner.fullName }}</h3>
            </div>
          </div>

          <div class="owner-card__facts">
            <div class="fact-row">
              <span class="fact-row__label">ID</span>
              <span>{{ owner.legacyVetusId || owner.id }}</span>
            </div>
            <div class="fact-row">
              <span class="fact-row__label">CPF/CNPJ</span>
              <span>{{ owner.documentId || '—' }}</span>
            </div>
            <div class="fact-row">
              <span class="fact-row__label">Contato principal</span>
              <span>{{ primaryContact(owner) }}</span>
            </div>
            <div class="fact-row">
              <span class="fact-row__label">Animais do cliente</span>
              <span>{{ patientsByOwner(owner.id).length }}</span>
            </div>
            <div class="fact-row">
              <span class="fact-row__label">Cadastro</span>
              <span>{{ formatDate(owner.createdAt) }}</span>
            </div>
          </div>

          <details class="owner-card__details">
            <summary>Informações de Contato</summary>
            <div class="owner-card__detail-body">
              <div v-if="owner.contacts.length" class="owner-contact-list">
                <div v-for="contact in owner.contacts" :key="`${owner.id}-${contact.label}-${contact.value}`" class="fact-row">
                  <span class="fact-row__label">{{ contact.label }}</span>
                  <span>{{ contact.value }}</span>
                </div>
              </div>
              <p v-else class="owner-card__empty">Nenhum contato cadastrado.</p>
            </div>
          </details>

          <details class="owner-card__details">
            <summary>Animais do Cliente</summary>
            <div class="owner-card__detail-body">
              <div v-if="patientsByOwner(owner.id).length" class="owner-animal-list">
                <div
                  v-for="patient in patientsByOwner(owner.id).slice(0, 4)"
                  :key="patient.id"
                  class="owner-animal-row"
                >
                  <div>
                    <strong>{{ patient.name }}</strong>
                    <p>
                      {{ patient.breed || patient.species }}
                      <span v-if="patient.birthDateApproximate">· {{ formatDate(patient.birthDateApproximate) }}</span>
                    </p>
                  </div>
                  <div class="owner-animal-row__actions">
                    <DsButton tag="a" :to="`/patients/${patient.id}`" variant="ghost" size="sm">
                      Ver Detalhes
                    </DsButton>
                    <DsButton tag="a" :to="encounterSelectionPath(owner.id, patient.id)" variant="secondary" size="sm">
                      Selecionar atendimento para cobrança
                    </DsButton>
                  </div>
                </div>
              </div>
              <p v-else class="owner-card__empty">Nenhum animal vinculado.</p>
            </div>
          </details>

          <p v-if="owner.administrativeNotes" class="owner-card__notes">
            {{ owner.administrativeNotes }}
          </p>

          <div class="owner-card__actions">
            <DsButton tag="a" :to="`/owners/${owner.id}`" variant="secondary" size="sm">
              Detalhes
            </DsButton>
            <DsButton tag="a" :to="encounterSelectionPath(owner.id)" variant="secondary" size="sm">
              Selecionar atendimento para cobrança
            </DsButton>
            <DsButton tag="a" :to="`/patients/new?ownerId=${owner.id}`" variant="secondary" size="sm">
              Cadastrar Novo Animal
            </DsButton>
            <DsButton
              tag="a"
              :to="`/appointments/new?ownerId=${owner.id}`"
              variant="ghost"
              size="sm"
            >
              Agendar
            </DsButton>
            <DsButton tag="a" :to="`/owners/${owner.id}/edit`" variant="ghost" size="sm">
              Editar
            </DsButton>
          </div>
        </DsCard>
      </div>
    </section>

    <DsCard v-else class="empty-state" variant="elevated">
      <div class="empty-state__icon">👥</div>
      <h2 class="empty-state__title">Nenhum cliente encontrado</h2>
      <p class="empty-state__description">
        Cadastre o primeiro cliente para vincular animais e sustentar agenda, atendimento e prontuário.
      </p>
      <div class="empty-state__actions">
        <DsButton tag="a" to="/owners/new" variant="primary">+ Cadastrar Novo Cliente</DsButton>
        <DsButton tag="a" to="/patients/new" variant="secondary">+ Novo Animal</DsButton>
      </div>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import type { OwnerContact, OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';
import { formatDate, ownerStatusLabel } from '@/utils/labels';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

type FinancialFilter = 'all' | 'yes' | 'no';
type SortMode = 'recent' | 'name' | 'patients';

const loading = ref(false);
const error = ref('');
const showAdvanced = ref(false);
const owners = ref<OwnerSummary[]>([]);
const patients = ref<PatientSummary[]>([]);

const filters = reactive({
  search: '',
  status: 'all' as 'active' | 'inactive' | 'all',
  financial: 'all' as FinancialFilter,
  sort: 'recent' as SortMode
});

const ownerPatientMap = computed(() => {
  const map = new Map<string, PatientSummary[]>();
  for (const patient of patients.value) {
    const bucket = map.get(patient.primaryOwnerId) ?? [];
    bucket.push(patient);
    map.set(patient.primaryOwnerId, bucket);
  }
  return map;
});

const displayedOwners = computed(() => {
  let items = [...owners.value];

  if (filters.financial === 'yes') {
    items = items.filter((owner) => owner.financialResponsible);
  } else if (filters.financial === 'no') {
    items = items.filter((owner) => !owner.financialResponsible);
  }

  if (filters.sort === 'name') {
    items.sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'));
  } else if (filters.sort === 'patients') {
    items.sort((a, b) => patientsByOwner(b.id).length - patientsByOwner(a.id).length);
  } else {
    items.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  return items;
});

const resultSummary = computed(() => {
  const first = displayedOwners.value.length > 0 ? 1 : 0;
  const last = displayedOwners.value.length;
  return `Mostrando ${first} - ${last} de ${owners.value.length} resultados`;
});

const headerSecondaryActions = computed(() => [
  {
    key: 'view-patients',
    label: 'Ver animais',
    variant: 'secondary' as const,
    to: '/patients'
  },
  {
    key: 'refresh',
    label: 'Atualizar',
    variant: 'ghost' as const,
    loading: loading.value,
    onClick: () => load()
  }
]);

const headerPrimaryAction = computed(() => ({
  key: 'new-owner',
  label: '+ Cadastrar Novo Cliente',
  variant: 'primary' as const,
  to: '/owners/new'
}));

function patientsByOwner(ownerId: string): PatientSummary[] {
  return ownerPatientMap.value.get(ownerId) ?? [];
}

function encounterSelectionPath(ownerId: string, patientId?: string): string {
  const params = new URLSearchParams({ ownerId });
  if (patientId) {
    params.set('patientId', patientId);
  }
  return `/encounters?${params.toString()}`;
}

function primaryContact(owner: OwnerSummary): string {
  const contact = (owner.contacts as OwnerContact[]).find((item) => item.primary) || owner.contacts[0];
  return contact ? contact.value : '—';
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('');
}

async function load() {
  loading.value = true;
  error.value = '';

  try {
    const [ownersResponse, patientsResponse] = await Promise.all([
      ownerService.list({
        search: filters.search || undefined,
        status: filters.status,
        financialResponsible:
          filters.financial === 'all' ? undefined : filters.financial === 'yes'
      }),
      patientService.list()
    ]);

    owners.value = ownersResponse;
    patients.value = patientsResponse;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar clientes';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.owners-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
}

.search-bar :deep(.form-field) {
  flex: 1;
  min-width: 260px;
}

.advanced-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, #fff, #f8fafc);
}

.owners-list-page__recent {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.owners-list-page__section-head h2 {
  margin: 0;
  font-size: 20px;
  color: var(--color-text, #0f172a);
}

.owners-list-page__section-head p {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
}

.owner-card__avatar {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #0f172a;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
}

.owner-card__badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.owners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.owner-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.owner-card__header {
  display: flex;
  gap: 14px;
  align-items: center;
}

.owner-card__identity {
  min-width: 0;
}

.owner-card__name {
  margin: 0;
  font-size: 18px;
  color: var(--color-text, #0f172a);
}

.owner-card__id {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.owner-card__facts {
  display: grid;
  gap: 10px;
}

.fact-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  color: var(--color-text, #0f172a);
}

.fact-row__label {
  color: var(--color-text-muted, #64748b);
}

.owner-card__patients,
.owner-contact-list,
.owner-animal-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.owner-contact-list,
.owner-animal-list {
  flex-direction: column;
}

.owner-card__details {
  overflow: hidden;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  background: #f8fafc;
}

.owner-card__details summary {
  cursor: pointer;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #075985;
}

.owner-card__detail-body {
  display: grid;
  gap: 10px;
  padding: 0 14px 14px;
}

.owner-animal-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
}

.owner-animal-row:first-child {
  border-top: 0;
}

.owner-animal-row p {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
}

.owner-animal-row__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.owner-card__empty {
  margin: 0;
  color: var(--color-text-muted, #64748b);
}

.patient-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.patient-pill--more {
  background: #dbeafe;
  color: #1d4ed8;
}

.owner-card__notes {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 13px;
  line-height: 1.5;
}

.owner-card__actions,
.empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 28px;
}

.empty-state__icon {
  font-size: 36px;
}

.empty-state__title {
  margin: 12px 0 8px;
  color: var(--color-text, #0f172a);
}

.empty-state__description {
  margin: 0 auto 16px;
  max-width: 520px;
  color: var(--color-text-muted, #64748b);
}

</style>

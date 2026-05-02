<template>
  <div class="patients-list-page">
    <AppPageHeader
      title="Animais"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Animais']"
      subtitle="Recepção: localize o paciente, confirme o tutor e decida entre agenda, esteira ou atendimento."
      :secondary-actions="headerSecondaryActions"
      :primary-action="headerPrimaryAction"
    />

    <section class="summary-grid">
      <DsCard v-for="card in summaryCards" :key="card.label" variant="elevated" class="summary-card">
        <div class="summary-card__icon">{{ card.icon }}</div>
        <div class="summary-card__body">
          <span class="summary-card__value">{{ card.value }}</span>
          <span class="summary-card__label">{{ card.label }}</span>
          <span class="summary-card__hint">{{ card.hint }}</span>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <form class="search-shell" @submit.prevent="load">
      <div class="search-bar">
        <DsInput
          v-model="filters.search"
          type="search"
          placeholder="Buscar paciente por nome, ID, tutor, CPF/CNPJ, RG, telefone, microchip ou raça"
        />
        <DsButton type="submit" variant="secondary" :loading="loading">Buscar</DsButton>
        <DsButton type="button" variant="ghost" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? 'Ocultar busca avançada' : 'Busca avançada' }}
        </DsButton>
      </div>

      <div v-if="showAdvanced" class="advanced-filters">
        <DsInput v-model="filters.species" label="Espécie" type="select">
          <option value="">Todas</option>
          <option value="not_defined">Não Definido</option>
          <option value="avian">Avícola</option>
          <option value="bovine">Bovino</option>
          <option value="canine">Canina</option>
          <option value="rabbit">Cunícula</option>
          <option value="equine">Equina</option>
          <option value="feline">Felina</option>
          <option value="other">Outras</option>
          <option value="primate">Primata</option>
          <option value="rodent">Roedor</option>
          <option value="reptile">Réptil</option>
        </DsInput>
        <DsInput v-model="filters.status" label="Status" type="select">
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="deceased">Falecidos</option>
        </DsInput>
        <DsInput v-model="filters.sex" label="Sexo" type="select">
          <option value="all">Todos</option>
          <option value="male">Macho</option>
          <option value="female">Fêmea</option>
          <option value="unknown">Desconhecido</option>
        </DsInput>
        <DsInput v-model="filters.sort" label="Ordenação" type="select">
          <option value="recent">Mais recentes</option>
          <option value="name">Nome A-Z</option>
          <option value="weight">Maior peso</option>
        </DsInput>
      </div>
    </form>

    <section class="reception-decision-strip" aria-label="Decisão inicial por paciente">
      <article class="reception-decision-card">
        <span class="reception-decision-card__eyebrow">1. Paciente</span>
        <strong>Confirmar cadastro</strong>
        <p>Valide identificação, tutor e dados básicos antes de encaminhar.</p>
      </article>
      <article class="reception-decision-card">
        <span class="reception-decision-card__eyebrow">2. Agenda</span>
        <strong>Programar atendimento</strong>
        <p>Use agendamento quando o fluxo não for imediato.</p>
      </article>
      <article class="reception-decision-card">
        <span class="reception-decision-card__eyebrow">3. Esteira</span>
        <strong>Acompanhar check-in</strong>
        <p>Direcione para Queue quando a chegada precisar de ação operacional.</p>
      </article>
    </section>

    <section v-if="highlightedPatient" class="patients-list-page__featured">
      <DsCard title="Paciente em destaque" variant="elevated">
        <div class="featured-patient">
          <div class="featured-patient__identity">
            <div class="featured-patient__avatar">
              {{ highlightedPatient.name.slice(0, 1).toUpperCase() }}
            </div>
            <div>
              <div class="featured-patient__badges">
                <StatusBadge
                  :label="patientStatusLabel(highlightedPatient.status)"
                  :variant="statusVariant(highlightedPatient.status)"
                />
                <StatusBadge
                  v-if="highlightedPatient.size"
                  :label="patientSizeLabel(highlightedPatient.size)"
                  variant="info"
                />
              </div>
              <h2 class="featured-patient__name">{{ highlightedPatient.name }}</h2>
              <p class="featured-patient__meta">
                {{ speciesLabel(highlightedPatient.species) }}
                ·
                {{ highlightedPatient.breed || 'Raça não informada' }}
                ·
                {{ ownerName(highlightedPatient.primaryOwnerId) }}
              </p>
            </div>
          </div>

          <div class="featured-patient__metrics">
            <div class="metric-chip">
              <strong>{{ formatAge(highlightedPatient.birthDateApproximate) }}</strong>
              <span>idade estimada</span>
            </div>
            <div class="metric-chip">
              <strong>{{ formatWeight(highlightedPatient.baseWeightKg) }}</strong>
              <span>peso base</span>
            </div>
            <div class="metric-chip">
              <strong>{{ sexLabel(highlightedPatient.sex) }}</strong>
              <span>sexo</span>
            </div>
          </div>
        </div>
      </DsCard>
    </section>

    <section v-if="displayedPatients.length > 0" class="patients-grid">
      <DsCard
        v-for="patient in displayedPatients"
        :key="patient.id"
        variant="elevated"
        class="patient-card"
      >
        <div class="patient-card__header">
          <div class="patient-card__identity">
            <div class="patient-card__badges">
              <StatusBadge
                :label="patientStatusLabel(patient.status)"
                :variant="statusVariant(patient.status)"
              />
              <StatusBadge
                v-if="patient.size"
                :label="patientSizeLabel(patient.size)"
                variant="info"
              />
            </div>
            <h3 class="patient-card__name">{{ patient.name }}</h3>
            <p class="patient-card__meta">
              {{ speciesLabel(patient.species) }}
              <span v-if="patient.breed">· {{ patient.breed }}</span>
            </p>
          </div>
          <div class="patient-card__id">ID {{ patient.id }}</div>
        </div>

        <div class="patient-card__facts">
          <div class="fact-row">
            <span class="fact-row__label">Sexo</span>
            <span>{{ sexLabel(patient.sex) }}</span>
          </div>
          <div class="fact-row">
            <span class="fact-row__label">Idade</span>
            <span>{{ formatAge(patient.birthDateApproximate) }}</span>
          </div>
          <div class="fact-row">
            <span class="fact-row__label">Peso</span>
            <span>{{ formatWeight(patient.baseWeightKg) }}</span>
          </div>
        </div>

        <details class="patient-card__owner">
          <summary>Informações do cliente</summary>
          <div class="owner-snapshot">
            <div class="fact-row">
              <span class="fact-row__label">Cliente</span>
              <span>{{ ownerName(patient.primaryOwnerId) }}</span>
            </div>
            <div class="fact-row">
              <span class="fact-row__label">CPF/CNPJ</span>
              <span>{{ ownerDocument(patient.primaryOwnerId) }}</span>
            </div>
            <div class="fact-row">
              <span class="fact-row__label">Celular</span>
              <span>{{ ownerPhone(patient.primaryOwnerId) }}</span>
            </div>
            <div class="fact-row">
              <span class="fact-row__label">E-mail</span>
              <span>{{ ownerEmail(patient.primaryOwnerId) }}</span>
            </div>
          </div>
        </details>

        <div class="patient-card__actions">
          <DsButton tag="a" :to="`/patients/${patient.id}`" variant="secondary" size="sm">
            Abrir cadastro
          </DsButton>
          <DsButton
            tag="a"
            :to="`/appointments/new?patientId=${patient.id}&ownerId=${patient.primaryOwnerId}`"
            variant="secondary"
            size="sm"
          >
            Criar agendamento
          </DsButton>
          <DsButton
            tag="a"
            to="/queue"
            variant="secondary"
            size="sm"
          >
            Ir para Esteira
          </DsButton>
          <DsButton
            tag="a"
            :to="`/encounters/new?patientId=${patient.id}&ownerId=${patient.primaryOwnerId}`"
            variant="ghost"
            size="sm"
          >
            Abrir atendimento
          </DsButton>
          <DsButton tag="a" :to="`/patients/${patient.id}/edit`" variant="ghost" size="sm">
            Editar
          </DsButton>
        </div>
      </DsCard>
    </section>

    <DsCard v-else class="empty-state" variant="elevated">
      <div class="empty-state__icon">PA</div>
      <h2 class="empty-state__title">Nenhum paciente encontrado</h2>
      <p class="empty-state__description">
        Cadastre o primeiro animal para abastecer agenda, atendimento, prontuário e internação.
      </p>
      <div class="empty-state__actions">
        <DsButton tag="a" to="/patients/new" variant="primary">+ Cadastrar paciente</DsButton>
        <DsButton tag="a" to="/owners" variant="secondary">Ver Clientes</DsButton>
      </div>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import type { OwnerContact, OwnerSummary } from '@/types/owner';
import type { PatientSex, PatientSummary } from '@/types/patient';
import {
  speciesLabel,
  sexLabel,
  patientStatusLabel,
  patientSizeLabel
} from '@/utils/labels';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

type SortMode = 'recent' | 'name' | 'weight';

const loading = ref(false);
const error = ref('');
const showAdvanced = ref(false);
const patients = ref<PatientSummary[]>([]);
const owners = ref<OwnerSummary[]>([]);

const filters = reactive({
  search: '',
  species: '',
  status: 'all' as 'active' | 'inactive' | 'deceased' | 'all',
  sex: 'all' as PatientSex | 'all',
  sort: 'recent' as SortMode
});
const ownerIdFilter = readOwnerIdFilter();

const displayedPatients = computed(() => {
  let items = [...patients.value];

  if (ownerIdFilter) {
    items = items.filter((patient) => patient.primaryOwnerId === ownerIdFilter);
  }

  if (filters.sex !== 'all') {
    items = items.filter((patient) => patient.sex === filters.sex);
  }

  if (filters.sort === 'name') {
    items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  } else if (filters.sort === 'weight') {
    items.sort((a, b) => (b.baseWeightKg ?? -1) - (a.baseWeightKg ?? -1));
  } else {
    items.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  return items;
});

const highlightedPatient = computed(() => displayedPatients.value[0] ?? null);

const ownerMap = computed(() => {
  const map = new Map<string, OwnerSummary>();
  for (const owner of owners.value) {
    map.set(owner.id, owner);
  }
  return map;
});

const summaryCards = computed(() => {
  const total = patients.value.length;
  const active = patients.value.filter((patient) => patient.status === 'active').length;
  const weighted = patients.value.filter((patient) => typeof patient.baseWeightKg === 'number').length;
  const withBreed = patients.value.filter((patient) => Boolean(patient.breed?.trim())).length;

  return [
    { icon: 'TOT', label: 'Pacientes cadastrados', value: String(total), hint: 'Base clínica longitudinal' },
    { icon: 'ATV', label: 'Ativos', value: String(active), hint: 'Em operação clínica' },
    { icon: 'PES', label: 'Com peso', value: String(weighted), hint: 'Dados para acompanhamento' },
    { icon: 'RAC', label: 'Com raça', value: String(withBreed), hint: 'Identificação enriquecida' }
  ];
});

const headerSecondaryActions = computed(() => [
  {
    key: 'view-owners',
    label: 'Ver clientes',
    variant: 'secondary' as const,
    to: '/owners'
  },
  {
    key: 'view-appointments',
    label: 'Agenda',
    variant: 'secondary' as const,
    to: '/appointments'
  },
  {
    key: 'view-queue',
    label: 'Esteira',
    variant: 'secondary' as const,
    to: '/queue'
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
  key: 'new-patient',
  label: '+ Cadastrar paciente',
  variant: 'primary' as const,
  to: ownerIdFilter ? `/patients/new?ownerId=${encodeURIComponent(ownerIdFilter)}` : '/patients/new'
}));

function readOwnerIdFilter(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('ownerId')?.trim() || '';
}

function statusVariant(status: string) {
  if (status === 'active') return 'success';
  if (status === 'deceased') return 'danger';
  return 'warning';
}

function ownerName(ownerId: string): string {
  return ownerMap.value.get(ownerId)?.fullName || `Cliente ${ownerId.slice(0, 8)}...`;
}

function ownerDocument(ownerId: string): string {
  return ownerMap.value.get(ownerId)?.documentId || 'Não informado';
}

function ownerPrimaryContact(
  ownerId: string,
  predicate: (contact: OwnerContact) => boolean
): string {
  const owner = ownerMap.value.get(ownerId);
  const contact = owner?.contacts.find(predicate);
  return contact?.value || 'Não informado';
}

function ownerPhone(ownerId: string): string {
  return ownerPrimaryContact(
    ownerId,
    (contact) => contact.type === 'whatsapp' || contact.type === 'phone'
  );
}

function ownerEmail(ownerId: string): string {
  return ownerPrimaryContact(ownerId, (contact) => contact.type === 'email');
}

function formatWeight(weight?: number): string {
  return typeof weight === 'number' ? `${weight.toFixed(1)} kg` : 'Não informado';
}

function formatAge(birthDate?: string): string {
  if (!birthDate) return 'Não informada';

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return birthDate;

  const now = new Date();
  let years = now.getUTCFullYear() - birth.getUTCFullYear();
  let months = now.getUTCMonth() - birth.getUTCMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) {
    return `${years} ano${years > 1 ? 's' : ''}`;
  }

  return `${Math.max(months, 0)} mes${months === 1 ? '' : 'es'}`;
}

async function load() {
  loading.value = true;
  error.value = '';

  try {
    const [patientItems, ownerItems] = await Promise.all([
      patientService.list({
        search: filters.search || undefined,
        ownerId: ownerIdFilter || undefined,
        species: filters.species || undefined,
        status: filters.status
      }),
      ownerService.list({ pageSize: 500, status: 'all' })
    ]);

    patients.value = patientItems;
    owners.value = ownerItems;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar pacientes';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.patients-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.summary-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
}

.summary-card__icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(14, 165, 233, 0.08);
  color: #0369a1;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.summary-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-card__value {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  line-height: 1;
}

.summary-card__label {
  font-size: 13px;
  color: var(--color-text, #0f172a);
}

.summary-card__hint {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
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

.reception-decision-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.reception-decision-card {
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: #f8fafc;
}

.reception-decision-card__eyebrow {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #475569;
  text-transform: uppercase;
}

.reception-decision-card strong {
  display: block;
  color: var(--color-text, #0f172a);
  font-size: 14px;
}

.reception-decision-card p {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.4;
}

.featured-patient {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 20px;
  align-items: center;
}

.featured-patient__identity {
  display: flex;
  gap: 16px;
  align-items: center;
}

.featured-patient__avatar {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(135deg, #e0f2fe, #bfdbfe);
  color: #075985;
  font-size: 22px;
  font-weight: 800;
}

.featured-patient__badges,
.patient-card__badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.featured-patient__name {
  margin: 0;
  font-size: 24px;
  color: var(--color-text, #0f172a);
}

.featured-patient__meta {
  margin: 6px 0 0;
  color: var(--color-text-muted, #64748b);
}

.featured-patient__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.metric-chip {
  padding: 14px;
  border-radius: 16px;
  background: #ecfeff;
  border: 1px solid #bae6fd;
}

.metric-chip strong {
  display: block;
  font-size: 20px;
  color: #0369a1;
}

.metric-chip span {
  font-size: 12px;
  color: #475569;
}

.patients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.patient-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.patient-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.patient-card__name {
  margin: 0;
  font-size: 18px;
  color: var(--color-text, #0f172a);
}

.patient-card__meta,
.patient-card__id {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.patient-card__facts {
  display: grid;
  gap: 10px;
}

.patient-card__owner {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  background: #f8fafc;
  overflow: hidden;
}

.patient-card__owner summary {
  cursor: pointer;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #075985;
}

.owner-snapshot {
  display: grid;
  gap: 10px;
  padding: 0 14px 14px;
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

.patient-card__actions,
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
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #475569;
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

@media (max-width: 960px) {
  .reception-decision-strip {
    grid-template-columns: 1fr;
  }

  .featured-patient {
    grid-template-columns: 1fr;
  }

  .featured-patient__metrics {
    grid-template-columns: 1fr;
  }
}
</style>

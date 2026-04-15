<template>
  <div class="patients-list-page">
    <AppPageHeader
      title="Animais e Pacientes"
      subtitle="Atendimento > Cadastrados > Animais. Base clínica do hospital, conectada a agenda, atendimento, prontuário e internação."
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
          placeholder="Buscar por nome, espécie, raça ou tutor..."
        />
        <DsButton type="submit" variant="secondary" :loading="loading">Buscar</DsButton>
        <DsButton type="button" variant="ghost" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? 'Ocultar busca avançada' : 'Busca avançada' }}
        </DsButton>
      </div>

      <div v-if="showAdvanced" class="advanced-filters">
        <DsInput v-model="filters.species" label="Espécie" type="select">
          <option value="">Todas</option>
          <option value="canine">Canino</option>
          <option value="feline">Felino</option>
          <option value="avian">Aves</option>
          <option value="rodent">Roedor</option>
          <option value="reptile">Réptil</option>
          <option value="other">Outro</option>
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

    <section v-if="highlightedPatient" class="patients-list-page__featured">
      <DsCard title="Paciente em destaque" variant="elevated">
        <div class="featured-patient">
          <div class="featured-patient__identity">
            <div class="featured-patient__avatar">🐾</div>
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
            <span class="fact-row__label">Tutor</span>
            <span>{{ ownerName(patient.primaryOwnerId) }}</span>
          </div>
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

        <div class="patient-card__actions">
          <DsButton tag="a" :to="`/patients/${patient.id}`" variant="secondary" size="sm">
            Detalhes
          </DsButton>
          <DsButton
            tag="a"
            :to="`/encounters/new?patientId=${patient.id}&ownerId=${patient.primaryOwnerId}`"
            variant="secondary"
            size="sm"
          >
            Abrir atendimento
          </DsButton>
          <DsButton
            tag="a"
            :to="`/appointments/new?patientId=${patient.id}&ownerId=${patient.primaryOwnerId}`"
            variant="ghost"
            size="sm"
          >
            Agendar
          </DsButton>
          <DsButton tag="a" :to="`/patients/${patient.id}/edit`" variant="ghost" size="sm">
            Editar
          </DsButton>
        </div>
      </DsCard>
    </section>

    <DsCard v-else class="empty-state" variant="elevated">
      <div class="empty-state__icon">🐾</div>
      <h2 class="empty-state__title">Nenhum paciente encontrado</h2>
      <p class="empty-state__description">
        Cadastre o primeiro animal para abastecer agenda, atendimento, prontuário e internação.
      </p>
      <div class="empty-state__actions">
        <DsButton tag="a" to="/patients/new" variant="primary">+ Novo Paciente</DsButton>
        <DsButton tag="a" to="/owners" variant="secondary">👤 Ver Tutores</DsButton>
      </div>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { patientService } from '@/services/patient';
import type { PatientSex, PatientSummary } from '@/types/patient';
import {
  speciesLabel,
  sexLabel,
  patientStatusLabel,
  patientSizeLabel
} from '@/utils/labels';
import { useEntityCache } from '@/composables/useEntityCache';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

type SortMode = 'recent' | 'name' | 'weight';

const entityCache = useEntityCache();
const loading = ref(false);
const error = ref('');
const showAdvanced = ref(false);
const patients = ref<PatientSummary[]>([]);
const ownerNames = ref<Record<string, string>>({});

const filters = reactive({
  search: '',
  species: '',
  status: 'all' as 'active' | 'inactive' | 'deceased' | 'all',
  sex: 'all' as PatientSex | 'all',
  sort: 'recent' as SortMode
});

const displayedPatients = computed(() => {
  let items = [...patients.value];

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

const summaryCards = computed(() => {
  const total = patients.value.length;
  const active = patients.value.filter((patient) => patient.status === 'active').length;
  const weighted = patients.value.filter((patient) => typeof patient.baseWeightKg === 'number').length;
  const withBreed = patients.value.filter((patient) => Boolean(patient.breed?.trim())).length;

  return [
    { icon: '🐾', label: 'Pacientes cadastrados', value: String(total), hint: 'Base clínica longitudinal' },
    { icon: '✅', label: 'Ativos', value: String(active), hint: 'Em operação clínica' },
    { icon: '⚖️', label: 'Com peso', value: String(weighted), hint: 'Dados para acompanhamento' },
    { icon: '🏷️', label: 'Com raça', value: String(withBreed), hint: 'Identificação enriquecida' }
  ];
});

const headerSecondaryActions = computed(() => [
  {
    key: 'view-owners',
    label: 'Ver tutores',
    variant: 'secondary' as const,
    to: '/owners'
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
  label: '+ Novo Paciente',
  variant: 'primary' as const,
  to: '/patients/new'
}));

function statusVariant(status: string) {
  if (status === 'active') return 'success';
  if (status === 'deceased') return 'danger';
  return 'warning';
}

function ownerName(ownerId: string): string {
  return ownerNames.value[ownerId] || `Tutor ${ownerId.slice(0, 8)}...`;
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
    const items = await patientService.list({
      search: filters.search || undefined,
      species: filters.species || undefined,
      status: filters.status
    });

    patients.value = items;

    const ownerIds = [...new Set(items.map((patient) => patient.primaryOwnerId))];
    await Promise.all(
      ownerIds.map(async (id) => {
        ownerNames.value[id] = await entityCache.getOwnerName(id);
      })
    );
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
  font-size: 22px;
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
  font-size: 28px;
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

@media (max-width: 960px) {
  .featured-patient {
    grid-template-columns: 1fr;
  }

  .featured-patient__metrics {
    grid-template-columns: 1fr;
  }
}
</style>

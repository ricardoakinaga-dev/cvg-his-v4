<template>
  <div class="patient-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" width="70%" />
      </div>
    </div>
    <DsAlert v-else-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <template v-else-if="patient">
      <AppPageHeader :subtitle="detailSubtitle">
        <template #title>🐾 {{ patient.name }}</template>
        <template #subtitle>
          <StatusBadge
            :label="patientStatusLabel(patient.status)"
            :variant="statusVariant(patient.status)"
          />
          <StatusBadge
            v-if="patient.size"
            :label="patient.size ? patientSizeLabel(patient.size) : '—'"
            variant="info"
          />
        </template>
        <template #actions>
          <DsButton tag="a" :to="`/patients/${patient.id}/edit`" variant="secondary">
            Editar
          </DsButton>
          <DsButton tag="a" :to="`/owners/${patient.primaryOwnerId}`" variant="secondary">
            Ver tutor
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/patients">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <div class="patient-detail-page__hero">
        <DsCard title="Ficha resumida">
          <div class="hero-summary">
            <div class="hero-summary__item">
              <span class="hero-summary__label">Tutor</span>
              <strong>{{ ownerName || 'Carregando...' }}</strong>
            </div>
            <div class="hero-summary__item">
              <span class="hero-summary__label">Espécie</span>
              <strong>{{ speciesLabel(patient.species) }}</strong>
            </div>
            <div class="hero-summary__item">
              <span class="hero-summary__label">Raça</span>
              <strong>{{ patient.breed || '—' }}</strong>
            </div>
            <div class="hero-summary__item">
              <span class="hero-summary__label">Sexo</span>
              <strong>{{ sexLabel(patient.sex) }}</strong>
            </div>
          </div>
        </DsCard>

        <div class="patient-detail-page__grid">
          <AppDetailSection title="Identificação">
            <div class="detail-row">
              <span class="detail-row__label">Espécie</span>
              <span>{{ speciesLabel(patient.species) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Raça</span>
              <span>{{ patient.breed || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Sexo</span>
              <span>{{ sexLabel(patient.sex) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Tamanho</span>
              <span>{{ patient.size ? patientSizeLabel(patient.size) : '—' }}</span>
            </div>
          </AppDetailSection>

          <AppDetailSection title="Dados clínicos">
            <div class="detail-row">
              <span class="detail-row__label">Peso</span>
              <span>{{ patient.baseWeightKg ? `${patient.baseWeightKg} kg` : '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Nascimento</span>
              <span>{{ patient.birthDateApproximate || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-row__label">Status operacional</span>
              <span>{{ patientStatusLabel(patient.status) }}</span>
            </div>
          </AppDetailSection>

          <AppDetailSection title="Tutor responsável">
            <p>{{ ownerName }}</p>
            <DsButton
              tag="a"
              :to="`/owners/${patient.primaryOwnerId}`"
              size="sm"
              variant="secondary"
            >
              Abrir cadastro do tutor
            </DsButton>
          </AppDetailSection>

          <AppDetailSection title="Informações">
            <p class="muted">Criado em: {{ formatDate(patient.createdAt) }}</p>
            <p class="muted">Atualizado em: {{ formatDate(patient.updatedAt) }}</p>
          </AppDetailSection>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { patientService } from '@/services/patient';
import type { PatientSummary } from '@/types/patient';
import {
  speciesLabel,
  sexLabel,
  patientStatusLabel,
  patientSizeLabel,
  formatDate
} from '@/utils/labels';
import { useEntityCache } from '@/composables/useEntityCache';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const route = useRoute();
const patient = ref<PatientSummary | null>(null);
const loading = ref(true);
const error = ref('');
const entityCache = useEntityCache();

const ownerName = ref('');

function statusVariant(status: string) {
  if (status === 'active') return 'success';
  if (status === 'deceased') return 'danger';
  return 'warning';
}

const detailSubtitle = computed(() => {
  if (!patient.value) return '';
  return `${patient.value.id} • ${ownerName.value || 'Tutor em carregamento'}`;
});

async function loadOwnerName(patientData: PatientSummary) {
  ownerName.value = await entityCache.getOwnerName(patientData.primaryOwnerId);
}

onMounted(async () => {
  const id = route.params.id as string;
  try {
    const p = await patientService.getById(id);
    patient.value = p;
    await loadOwnerName(p);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar paciente';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.patient-detail-page__hero {
  display: grid;
  gap: 16px;
}

.patient-detail-page__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.hero-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.hero-summary__item {
  padding: 12px;
  border-radius: 12px;
  background: var(--color-bg-subtle, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
}

.hero-summary__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.hero-summary__item strong {
  display: block;
  color: var(--color-text, #0f172a);
}
</style>

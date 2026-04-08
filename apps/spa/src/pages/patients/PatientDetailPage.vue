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
      <AppPageHeader>
        <template #title>🐾 {{ patient.name }}</template>
        <template #subtitle>
          <StatusBadge
            :label="patientStatusLabel(patient.status)"
            :variant="statusVariant(patient.status)"
          />
          <StatusBadge v-if="patient.size" :label="patientSizeLabel(patient.size)" variant="info" />
        </template>
        <template #actions>
          <DsButton tag="a" :to="`/patients/${patient.id}/edit`" variant="secondary"
            >Editar</DsButton
          >
          <DsButton variant="secondary" tag="a" to="/patients">Voltar</DsButton>
        </template>
      </AppPageHeader>

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
        </AppDetailSection>

        <AppDetailSection title="Dados Clínicos">
          <div class="detail-row">
            <span class="detail-row__label">Peso</span>
            <span>{{ patient.baseWeightKg ? `${patient.baseWeightKg} kg` : '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Nascimento</span>
            <span>{{ patient.birthDateApproximate || '—' }}</span>
          </div>
        </AppDetailSection>

        <AppDetailSection title="Tutor Responsável">
          <p>{{ ownerName }}</p>
          <DsButton tag="a" :to="`/owners/${patient.primaryOwnerId}`" size="sm" variant="secondary"
            >Ver tutor →</DsButton
          >
        </AppDetailSection>

        <AppDetailSection title="Informações">
          <p class="muted">Criado em: {{ formatDate(patient.createdAt) }}</p>
          <p class="muted">Atualizado em: {{ formatDate(patient.updatedAt) }}</p>
        </AppDetailSection>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { patientService } from '@/services/patient';
import type { PatientSummary, PatientSize } from '@/types/patient';
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
.patient-detail-page__grid {
  display: grid;
  gap: 16px;
}
</style>

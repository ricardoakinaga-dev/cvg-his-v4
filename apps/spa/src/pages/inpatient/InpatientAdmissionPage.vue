<template>
  <div class="admission-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Internação', 'Admitir']"
      title="Admitir paciente"
      subtitle="Vincule um atendimento aberto a um leito disponível."
    />

    <DsAlert v-if="error" variant="danger">{{ error }}</DsAlert>

    <form class="admission-form" @submit.prevent="submit">
      <div class="admission-step">
        <span class="admission-step__number">1</span>
        <label for="admission-encounter">Atendimento</label>
        <select id="admission-encounter" v-model="form.encounterId" required>
          <option value="" disabled>Selecione o atendimento</option>
          <option v-for="encounter in eligibleEncounters" :key="encounter.id" :value="encounter.id">
            {{ encounter.reason }} · {{ encounter.patientId.slice(0, 8) }}
          </option>
        </select>
      </div>

      <div class="admission-step">
        <span class="admission-step__number">2</span>
        <label for="admission-sector">Setor</label>
        <select
          id="admission-sector"
          v-model="form.sectorId"
          data-testid="sector-select"
          required
          @change="loadBeds"
        >
          <option value="" disabled>Selecione o setor</option>
          <option v-for="sector in sectors" :key="sector.id" :value="sector.id">
            {{ sector.code }} · {{ sector.name }}
          </option>
        </select>
      </div>

      <div class="admission-step">
        <span class="admission-step__number">3</span>
        <label for="admission-bed">Leito disponível</label>
        <select id="admission-bed" v-model="form.bedId" data-testid="bed-select" required>
          <option value="" disabled>Selecione o leito</option>
          <option v-for="bed in availableBeds" :key="bed.id" :value="bed.id">
            {{ bed.code }} · {{ bed.name }}
          </option>
        </select>
      </div>

      <div class="admission-actions">
        <DsButton tag="a" to="/inpatient" variant="ghost">Cancelar</DsButton>
        <DsButton type="submit" variant="primary" :loading="submitting" :disabled="!canSubmit">
          Confirmar admissão
        </DsButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import { encounterService } from '@/services/encounter';
import { inpatientService } from '@/services/inpatient';
import type { EncounterSummary } from '@/types/encounter';
import type { BedSummary, SectorSummary } from '@/types/inpatient';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';

const route = useRoute();
const router = useRouter();
const encounters = ref<EncounterSummary[]>([]);
const sectors = ref<SectorSummary[]>([]);
const beds = ref<BedSummary[]>([]);
const error = ref('');
const submitting = ref(false);
const form = ref({
  encounterId: typeof route.query.encounterId === 'string' ? route.query.encounterId : '',
  sectorId: '',
  bedId: ''
});

const eligibleEncounters = computed(() =>
  encounters.value.filter((encounter) => encounter.status !== 'closed')
);
const availableBeds = computed(() =>
  beds.value.filter((bed) => bed.active && bed.status === 'available')
);
const canSubmit = computed(() => Boolean(form.value.encounterId && form.value.sectorId && form.value.bedId));

async function loadBeds() {
  form.value = { ...form.value, bedId: '' };
  beds.value = form.value.sectorId
    ? await inpatientService.listBeds({ sectorId: form.value.sectorId })
    : [];
}

async function submit() {
  if (!canSubmit.value) return;
  const encounter = encounters.value.find((item) => item.id === form.value.encounterId);
  const sector = sectors.value.find((item) => item.id === form.value.sectorId);
  const bed = beds.value.find((item) => item.id === form.value.bedId);
  if (!encounter || !sector || !bed) return;

  submitting.value = true;
  error.value = '';
  try {
    const stay = await inpatientService.admit({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      unit: 'Internacao',
      ward: sector.name,
      bed: bed.code,
      sectorId: sector.id,
      bedId: bed.id
    });
    await router.push(`/inpatient/${stay.id}`);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Não foi possível admitir o paciente.';
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    const [encounterItems, sectorItems] = await Promise.all([
      encounterService.list(),
      inpatientService.listSectors()
    ]);
    encounters.value = encounterItems;
    sectors.value = sectorItems.filter((sector) => sector.active);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Não foi possível carregar a admissão.';
  }
});
</script>

<style scoped>
.admission-page {
  max-width: 760px;
}

.admission-form {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--color-border, #d7dde5);
}

.admission-step {
  display: grid;
  grid-template-columns: 36px minmax(150px, 190px) minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 18px 0;
  border-bottom: 1px solid var(--color-border, #d7dde5);
}

.admission-step__number {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: #196647;
  font-weight: 700;
}

.admission-step label {
  font-weight: 700;
}

.admission-step select {
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #b8c2ce);
  border-radius: 6px;
  background: var(--color-surface, #fff);
  color: var(--color-text, #17212b);
}

.admission-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 20px;
}

@media (max-width: 640px) {
  .admission-step {
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .admission-step select {
    grid-column: 1 / -1;
  }
}
</style>

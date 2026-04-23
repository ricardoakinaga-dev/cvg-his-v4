<template>
  <div class="config-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Agenda', 'Disponibilidade']">
      <template #title>Disponibilidade</template>
      <template #subtitle>Grade operacional por profissional e duração de slot</template>
    </AppPageHeader>

    <DsAlert v-if="notice" :variant="notice.variant" dismissible @dismiss="notice = null">
      {{ notice.message }}
    </DsAlert>

    <section class="config-grid">
      <DsCard title="Nova disponibilidade">
        <div class="form-grid">
          <DsInput v-model="form.professionalUserId" label="Profissional" placeholder="staff_camila_vet" />
          <label class="field">
            <span>Dia da semana</span>
            <select v-model.number="form.dayOfWeek">
              <option v-for="day in weekDays" :key="day.value" :value="day.value">{{ day.label }}</option>
            </select>
          </label>
          <DsInput v-model="form.startTime" label="Início" type="time" />
          <DsInput v-model="form.endTime" label="Fim" type="time" />
          <DsInput v-model.number="form.slotDurationMinutes" label="Slot (min)" type="number" />
          <DsInput v-model="form.notes" label="Notas" placeholder="Cobertura triagem e apoio" />
        </div>
        <DsButton variant="primary" :loading="saving" @click="createAvailability">
          {{ saving ? 'Salvando...' : 'Salvar disponibilidade' }}
        </DsButton>
      </DsCard>

      <DsCard title="Disponibilidades publicadas">
        <div v-if="loading" class="muted">Carregando disponibilidade...</div>
        <div v-else-if="items.length === 0" class="muted">Nenhuma disponibilidade cadastrada.</div>
        <div v-else class="list-stack">
          <div v-for="item in items" :key="item.id" class="list-item">
            <div>
              <strong>{{ item.professionalUserId }}</strong>
              <p>{{ weekDayLabel(item.dayOfWeek) }} · {{ item.startTime }} às {{ item.endTime }}</p>
            </div>
            <div class="list-item__meta">
              <span>{{ item.slotDurationMinutes }} min</span>
              <span>{{ item.notes || 'Sem nota operacional' }}</span>
            </div>
          </div>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { agendaConfigService } from '@/services/agendaConfig';
import type { AvailabilityRecord } from '@/types/agendaConfig';

const items = ref<AvailabilityRecord[]>([]);
const loading = ref(true);
const saving = ref(false);
const notice = ref<{ variant: 'success' | 'danger'; message: string } | null>(null);
const form = ref({
  professionalUserId: '',
  dayOfWeek: 1,
  startTime: '08:00',
  endTime: '17:00',
  slotDurationMinutes: 30,
  notes: ''
});

const weekDays = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
];

function weekDayLabel(value: number) {
  return weekDays.find((day) => day.value === value)?.label ?? 'Não definido';
}

async function loadAvailability() {
  loading.value = true;
  try {
    const response = await agendaConfigService.listAvailability();
    items.value = response.items;
  } catch (error) {
    notice.value = {
      variant: 'danger',
      message: error instanceof Error ? error.message : 'Falha ao carregar disponibilidade.'
    };
  } finally {
    loading.value = false;
  }
}

async function createAvailability() {
  if (!form.value.professionalUserId.trim()) return;
  saving.value = true;
  try {
    const created = await agendaConfigService.createAvailability({
      professionalUserId: form.value.professionalUserId.trim(),
      dayOfWeek: form.value.dayOfWeek,
      startTime: form.value.startTime,
      endTime: form.value.endTime,
      slotDurationMinutes: Number(form.value.slotDurationMinutes),
      notes: form.value.notes.trim() || null
    });
    items.value = [...items.value, created];
    form.value = {
      professionalUserId: '',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '17:00',
      slotDurationMinutes: 30,
      notes: ''
    };
    notice.value = { variant: 'success', message: 'Disponibilidade registrada no backend.' };
  } catch (error) {
    notice.value = {
      variant: 'danger',
      message: error instanceof Error ? error.message : 'Falha ao salvar disponibilidade.'
    };
  } finally {
    saving.value = false;
  }
}

onMounted(loadAvailability);
</script>

<style scoped>
.config-page,
.config-grid,
.form-grid,
.list-stack,
.list-item__meta {
  display: grid;
  gap: 16px;
}

.config-grid {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.form-grid {
  margin-bottom: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.field {
  display: grid;
  gap: 6px;
  font-size: 14px;
}

.field select {
  min-height: 40px;
  border: 1px solid var(--ds-color-neutral-300, #d4d4d8);
  border-radius: 12px;
  padding: 0 12px;
  background: #fff;
}

.list-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.list-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.list-item__meta {
  text-align: right;
  color: var(--ds-color-neutral-600, #52525b);
}
</style>

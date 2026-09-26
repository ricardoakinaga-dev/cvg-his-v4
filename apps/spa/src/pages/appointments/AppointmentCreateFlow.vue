<template>
  <AppointmentClientSelectorModal
    :open="clientSelectorOpen"
    @close="closeFlow"
    @selected="handleClientSelected"
  />

  <DsModal :open="quickCreateOpen" title="Criar agendamento" size="lg" @close="closeFlow">
    <AppointmentQuickCreateForm
      v-if="quickCreateOpen"
      submit-label="Salvar e voltar ao cockpit"
      :preset-owner-id="selectedClient?.id ?? ''"
      :hide-owner-selection="Boolean(selectedClient)"
      :lock-owner-selection="Boolean(selectedClient)"
      :restrict-patients-to-owner="Boolean(selectedClient)"
      :owner-snapshot="selectedClient"
      :preset-scheduled-at="quickCreatePreset.scheduledAt"
      :preset-duration-minutes="quickCreatePreset.durationMinutes"
      :preset-practitioner-staff-id="quickCreatePreset.practitionerStaffId"
      :professionals="professionals"
      @created="handleCreated"
      @cancel="closeFlow"
    />
  </DsModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import AppointmentClientSelectorModal from '@/components/appointments/AppointmentClientSelectorModal.vue';
import AppointmentQuickCreateForm from '@/components/appointments/AppointmentQuickCreateForm.vue';
import type { AppointmentSummary, SchedulingProfessionalSummary } from '@/types/appointment';
import type { OwnerSummary } from '@/types/owner';
import { buildSlotScheduledAt } from './appointmentCalendar';

interface AppointmentCreateSlotPreset {
  date: string;
  hour?: number;
  practitionerStaffId?: string;
}

const props = withDefaults(
  defineProps<{
    open: boolean;
    slotPreset?: AppointmentCreateSlotPreset | null;
    professionals?: SchedulingProfessionalSummary[];
  }>(),
  {
    slotPreset: null,
    professionals: () => []
  }
);

const emit = defineEmits<{
  close: [];
  created: [appointment: AppointmentSummary];
}>();

const clientSelectorOpen = ref(false);
const quickCreateOpen = ref(false);
const selectedClient = ref<OwnerSummary | null>(null);

const quickCreatePreset = computed(() => {
  const slotPreset = props.slotPreset;
  return {
    scheduledAt: slotPreset ? buildSlotScheduledAt(slotPreset.date, slotPreset.hour) : '',
    practitionerStaffId:
      slotPreset?.practitionerStaffId && slotPreset.practitionerStaffId !== 'unassigned'
        ? slotPreset.practitionerStaffId
        : '',
    durationMinutes: 30
  };
});

const professionals = computed(() => props.professionals);

function resetFlow() {
  clientSelectorOpen.value = false;
  quickCreateOpen.value = false;
  selectedClient.value = null;
}

function startFlow() {
  resetFlow();
  clientSelectorOpen.value = true;
}

function closeFlow() {
  resetFlow();
  emit('close');
}

function handleClientSelected(owner: OwnerSummary) {
  selectedClient.value = owner;
  clientSelectorOpen.value = false;
  quickCreateOpen.value = true;
}

function handleCreated(appointment: AppointmentSummary) {
  resetFlow();
  emit('created', appointment);
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      startFlow();
      return;
    }
    resetFlow();
  },
  { immediate: true }
);
</script>

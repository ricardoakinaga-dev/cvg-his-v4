<template>
  <div v-if="appointment" class="appointment-details-drawer">
    <button
      type="button"
      class="appointment-details-drawer__backdrop"
      tabindex="-1"
      aria-label="Fechar detalhes do agendamento"
      @click="emit('close')"
    />

    <aside
      ref="panel"
      tabindex="-1"
      class="appointment-details-drawer__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-details-drawer-title"
    >
      <DsCard class="appointment-details-card appointment-details-card--from-agenda">
        <template #title>
          <div class="appointment-details-card__title">
            <div>
              <p class="appointment-details-card__eyebrow">Aberto a partir da grade da agenda</p>
              <strong id="appointment-details-drawer-title">
                {{ patientName || 'Paciente em carregamento' }}
              </strong>
            </div>
            <button
              type="button"
              class="appointment-details-card__close"
              aria-label="Fechar painel"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>
        </template>

        <div class="appointment-details-card__stack">
          <div class="appointment-details-card__headline">
            <span class="status-pill" :class="`status-pill--${appointment.operational.stage}`">
              {{ appointment.operational.label }}
            </span>
            <span>{{ visitTypeLabel(appointment.visitType) }}</span>
          </div>

          <div class="appointment-details-card__summary">
            <div class="summary-item">
              <span class="summary-item__label">Cliente/Tutor</span>
              <strong>{{ ownerName }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Paciente</span>
              <strong>{{ patientName }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Data e hora</span>
              <strong>{{ formatDateTime(appointment.scheduledAt) }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Profissional</span>
              <strong>{{ appointment.practitionerName || 'Sem profissional' }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Serviço</span>
              <strong>{{ appointment.serviceName || appointment.specialty || 'Não informado' }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Status</span>
              <strong>{{ appointmentStatusLabel(appointment.status) }}</strong>
            </div>
          </div>

          <div class="detail-list">
            <div v-if="appointment.durationMinutes" class="detail-row">
              <span class="detail-row__label">Duração</span>
              <span>{{ appointment.durationMinutes }} min</span>
            </div>
            <div v-if="appointment.unit" class="detail-row">
              <span class="detail-row__label">Unidade/Setor</span>
              <span>{{ appointment.unit }}</span>
            </div>
            <div v-if="appointment.resourceLabel" class="detail-row">
              <span class="detail-row__label">Sala/Recurso</span>
              <span>{{ appointment.resourceLabel }}</span>
            </div>
          </div>

          <div v-if="appointment.reason?.trim()" class="detail-note">
            <span class="detail-note__label">Observações / motivo</span>
            <p>{{ appointment.reason }}</p>
          </div>

          <div v-if="appointment.conflicts.length" class="detail-note detail-note--warning">
            <span class="detail-note__label">Conflitos operacionais</span>
            <ul>
              <li
                v-for="conflict in appointment.conflicts.slice(0, 3)"
                :key="`${appointment.id}-${conflict.type}-${conflict.startsAt}`"
              >
                {{ conflict.message }}
              </li>
            </ul>
          </div>

          <div class="appointment-details-card__actions">
            <DsButton variant="secondary" tag="a" :to="`/appointments/${appointment.id}`">
              Ver detalhe completo
            </DsButton>
            <DsButton variant="secondary" tag="a" :to="editHref">
              Editar
            </DsButton>
            <DsButton
              v-if="canCancel"
              variant="danger"
              :loading="actionLoadingId === appointment.id && actionKind === 'cancel'"
              @click="emit('cancel', appointment)"
            >
              Cancelar Agendamento
            </DsButton>
            <DsButton
              v-if="canCheckIn"
              variant="success"
              :loading="actionLoadingId === appointment.id && actionKind === 'checkin'"
              @click="emit('check-in', appointment)"
            >
              Check-in
            </DsButton>
            <DsButton
              v-if="canMarkNoShow"
              variant="danger"
              :loading="actionLoadingId === appointment.id && actionKind === 'noshow'"
              @click="emit('no-show', appointment)"
            >
              No-show
            </DsButton>
            <DsButton
              v-if="canOpenEncounter"
              variant="secondary"
              @click="emit('open-encounter', appointment)"
            >
              {{ encounterLabel }}
            </DsButton>
            <DsButton
              v-if="showQueueAction"
              variant="secondary"
              tag="a"
              to="/queue"
            >
              Ver fila
            </DsButton>
          </div>
        </div>
      </DsCard>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import type { SchedulingCockpitAppointmentSummary } from '@/types/appointment';
import { appointmentStatusLabel, formatDateTime, visitTypeLabel } from '@/utils/labels';

const props = withDefaults(
  defineProps<{
    appointment: SchedulingCockpitAppointmentSummary | null;
    ownerName?: string;
    patientName?: string;
    canCancel?: boolean;
    canCheckIn?: boolean;
    canMarkNoShow?: boolean;
    actionLoadingId?: string;
    actionKind?: 'cancel' | 'checkin' | 'noshow' | '';
  }>(),
  {
    ownerName: '',
    patientName: '',
    canCancel: false,
    canCheckIn: false,
    canMarkNoShow: false,
    actionLoadingId: '',
    actionKind: ''
  }
);

const emit = defineEmits<{
  close: [];
  cancel: [appointment: SchedulingCockpitAppointmentSummary];
  'check-in': [appointment: SchedulingCockpitAppointmentSummary];
  'no-show': [appointment: SchedulingCockpitAppointmentSummary];
  'open-encounter': [appointment: SchedulingCockpitAppointmentSummary];
}>();

const panel = ref<HTMLElement | null>(null);
let returnFocusTarget: HTMLElement | null = null;
let disposed = false;

function restoreFocus() {
  const target = returnFocusTarget;
  returnFocusTarget = null;
  if (target?.isConnected) target.focus({ preventScroll: true });
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.appointment || !panel.value || event.defaultPrevented) return;
  // A confirmation or command dialog above the drawer owns its own keyboard events.
  const target = event.target instanceof Element ? event.target : document.activeElement;
  const activeDialog = target?.closest('[role="dialog"], [role="alertdialog"], dialog');
  if (activeDialog && activeDialog !== panel.value) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    emit('close');
    return;
  }
  if (event.key !== 'Tab') return;

  const focusable = [...panel.value.querySelectorAll<HTMLElement>(
    'button, a[href], input, select, textarea, [tabindex]'
  )].filter((element) => element.tabIndex >= 0
    && !element.matches(':disabled, [aria-disabled="true"]')
    && !element.closest('[hidden], [inert]')
    && getComputedStyle(element).display !== 'none'
    && getComputedStyle(element).visibility !== 'hidden');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (!first || !last) {
    event.preventDefault();
    panel.value.focus();
  } else if (!panel.value.contains(active) || active === panel.value
    || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

watch(
  () => Boolean(props.appointment),
  async (open, _previous, onCleanup) => {
    let cancelled = false;
    onCleanup(() => { cancelled = true; });
    if (open) {
      returnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.addEventListener('keydown', handleKeydown);
      await nextTick();
      if (!cancelled && !disposed) {
        panel.value?.querySelector<HTMLElement>('.appointment-details-card__close')?.focus();
      }
    } else {
      document.removeEventListener('keydown', handleKeydown);
      await nextTick();
      if (!cancelled && !disposed) restoreFocus();
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  disposed = true;
  document.removeEventListener('keydown', handleKeydown);
  restoreFocus();
});

const canOpenEncounter = computed(() => Boolean(props.appointment?.operational.encounterId));
const encounterLabel = computed(() =>
  props.appointment?.operational.stage === 'completed' ? 'Ver atendimento' : 'Atendimento'
);
const showQueueAction = computed(() =>
  props.appointment ? ['checked_in', 'called'].includes(props.appointment.operational.stage) : false
);
const editHref = computed(() => {
  if (!props.appointment) return '/appointments/new';

  const params = new URLSearchParams({
    appointmentId: props.appointment.id,
    ownerId: props.appointment.ownerId,
    patientId: props.appointment.patientId,
    scheduledAt: props.appointment.scheduledAt,
    durationMinutes: String(props.appointment.durationMinutes || 30),
    visitType: props.appointment.visitType,
    practitionerStaffId: props.appointment.practitionerStaffId || '',
    serviceId: props.appointment.serviceId || '',
    unit: props.appointment.unit || '',
    specialty: props.appointment.specialty || '',
    resourceLabel: props.appointment.resourceLabel || '',
    reason: props.appointment.reason || ''
  });

  return `/appointments/new?${params.toString()}`;
});
</script>

<style scoped>
.appointment-details-drawer {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
}

.appointment-details-drawer__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: var(--color-bg-overlay, rgba(15, 23, 42, 0.48));
  pointer-events: auto;
}

.appointment-details-drawer__panel {
  position: absolute;
  top: 0;
  right: 0;
  width: min(440px, 100vw);
  height: 100%;
  padding: 20px 16px;
  pointer-events: auto;
}

.appointment-details-card {
  height: 100%;
  overflow: auto;
}

.appointment-details-card--from-agenda {
  border: 1px solid var(--color-primary-200, #bfdbfe);
  background: var(--color-surface, #ffffff);
  box-shadow: var(--shadow-xl, 0 18px 48px rgba(15, 23, 42, 0.14));
}

.appointment-details-card__title,
.appointment-details-card__headline,
.appointment-details-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.appointment-details-card__title {
  justify-content: space-between;
}

.appointment-details-card__eyebrow,
.summary-item__label,
.detail-row__label,
.detail-note__label {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.appointment-details-card__close {
  border: 1px solid var(--color-border, #cbd5e1);
  background: var(--color-surface, #fff);
  border-radius: 999px;
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
}

.appointment-details-card__stack {
  display: grid;
  gap: 16px;
}

.appointment-details-card__headline {
  flex-wrap: wrap;
  color: var(--color-text-secondary, #475569);
}

.appointment-details-card__summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.summary-item,
.detail-note {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  background: var(--color-bg-subtle, #f8fafc);
}

.summary-item strong,
.detail-row span:last-child {
  color: var(--color-text, #0f172a);
}

.detail-list {
  display: grid;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-note p,
.detail-note ul {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

.detail-note ul {
  padding-left: 18px;
}

.detail-note--warning {
  border-color: var(--color-warning-300, #fcd34d);
  background: var(--color-warning-50, #fffbeb);
}

.appointment-details-card__actions {
  flex-wrap: wrap;
  align-items: stretch;
}

.status-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
}

.status-pill--scheduled {
  background: var(--color-info-bg, rgba(37, 99, 235, 0.1));
  color: var(--color-info-text, #1d4ed8);
}

.status-pill--checked_in,
.status-pill--called {
  background: var(--color-warning-bg, rgba(245, 158, 11, 0.12));
  color: var(--color-warning-text, #b45309);
}

.status-pill--in_triage {
  background: var(--color-info-bg, rgba(14, 165, 233, 0.12));
  color: var(--color-info-text, #0369a1);
}

.status-pill--in_care,
.status-pill--observation {
  background: var(--color-success-bg, rgba(16, 185, 129, 0.12));
  color: var(--color-success-text, #047857);
}

.status-pill--completed {
  background: var(--color-success-bg, rgba(22, 163, 74, 0.12));
  color: var(--color-success-text, #15803d);
}

.status-pill--cancelled {
  background: var(--color-neutral-100, rgba(148, 163, 184, 0.12));
  color: var(--color-neutral-700, #64748b);
}

@media (max-width: 720px) {
  .appointment-details-drawer__panel {
    width: 100vw;
    padding: 8px;
  }

  .appointment-details-card__summary {
    grid-template-columns: 1fr;
  }
}
</style>

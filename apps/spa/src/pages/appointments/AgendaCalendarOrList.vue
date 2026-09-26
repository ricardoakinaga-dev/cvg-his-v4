<template>
  <div class="agenda-calendar-or-list appointments-cockpit">
            <section v-if="selectedView === 'list'" class="agenda-appointment-list" aria-label="Agendamentos em ordem cronológica">
              <p class="agenda-appointment-list__count" role="status">{{ chronologicalItems.length }} agendamento(s)</p>
              <EmptyState
                v-if="!chronologicalItems.length"
                icon="📅"
                title="Nenhum agendamento neste período"
                description="Altere a data ou os filtros para consultar outros agendamentos."
              />
              <ol v-else class="agenda-appointment-list__items">
                <li v-for="item in chronologicalItems" :key="item.id">
                  <button type="button" class="agenda-appointment-row" :data-focus-key="`appointment-${item.id}`" @click="openAppointmentDetails(item)">
                    <time :datetime="item.scheduledAt" class="agenda-appointment-row__time">
                      <strong>{{ timeLabel(item.scheduledAt) }}</strong>
                      <span>{{ appointmentDateLabel(item.scheduledAt) }}</span>
                    </time>
                    <span class="agenda-appointment-row__identity">
                      <strong>{{ patientName(item.patientId) }}</strong>
                      <span>Tutor: {{ ownerName(item.ownerId) }}</span>
                      <span>{{ item.serviceName || item.specialty || item.reason }}</span>
                    </span>
                    <span class="agenda-appointment-row__operation">
                      <strong>{{ operationalLabel(item) }}</strong>
                      <span>{{ appointmentResponsibleLabel(item) }}</span>
                      <span
                        v-if="item.conflicts.length"
                        class="agenda-appointment-row__alert"
                        :class="{ 'agenda-appointment-row__alert--critical': item.conflicts.some(conflict => conflict.severity === 'critical') }"
                      >{{ item.conflicts.length }} {{ item.conflicts.length === 1 ? 'alerta' : 'alertas' }} · Verificar conflito</span>
                    </span>
                    <span class="agenda-appointment-row__details">Ver detalhes →</span>
                  </button>
                </li>
              </ol>
            </section>

            <template v-else-if="viewMode === 'month'">
              <section class="month-board">
                <div class="month-board__weekdays">
                  <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
                </div>
                <div class="month-grid">
                  <DsCard
                    v-for="day in monthCalendarDays"
                    :key="day.date"
                    class="month-cell"
                    :class="{
                      'month-cell--muted': !day.inCurrentMonth,
                      'month-cell--selected': day.date === referenceDate
                    }"
                  >
                    <button
                      type="button"
                      class="month-cell__header"
                      :aria-current="day.date === referenceDate ? 'date' : undefined"
                      @click="selectDate(day.date)"
                    >
                      <strong>{{ day.dayNumber }}</strong>
                      <span>{{ appointmentsByDay(day.date).length }} ag.</span>
                    </button>
                    <div class="month-cell__body">
                      <div class="month-cell__availability">
                        {{ availableSlotsByDay(day.date) }} horários livres
                      </div>
                      <button
                        v-if="canManageScheduling"
                        type="button"
                        class="month-cell__empty-surface"
                        :aria-label="`Criar agendamento em ${day.date}`"
                        @click="openSlotCreateFlow({ date: day.date })"
                      >
                        Criar no dia {{ day.dayNumber }}
                      </button>
                      <button
                        v-for="item in appointmentsByDay(day.date).slice(0, 5)"
                        :key="item.id"
                        type="button"
                        class="month-item"
                        @click="openAppointmentDetails(item)"
                      >
                        <span>{{ timeLabel(item.scheduledAt) }}</span>
                        <strong>{{ patientName(item.patientId) }}</strong>
                        <small
                          >{{ ownerName(item.ownerId) }} · {{ appointmentTypeLabel(item) }}</small
                        >
                        <small>{{ appointmentResponsibleLabel(item) }}</small>
                        <small class="month-item__next">{{ nextStepForAppointment(item) }}</small>
                      </button>
                      <button
                        v-if="canManageScheduling"
                        type="button"
                        class="month-create-slot"
                        @click="openSlotCreateFlow({ date: day.date })"
                      >
                        + Novo agendamento
                      </button>
                      <button
                        v-if="appointmentsByDay(day.date).length > 5"
                        type="button"
                        class="month-item__more month-item__more--action"
                        :aria-label="`Ver os ${appointmentsByDay(day.date).length - 5} compromissos adicionais de ${day.date}`"
                        @click="setViewMode('list')"
                      >
                        +{{ appointmentsByDay(day.date).length - 5 }} compromissos
                      </button>
                    </div>
                  </DsCard>
                </div>
              </section>
            </template>

            <template v-else-if="viewMode === 'week'">
              <section class="week-board">
                <div
                  class="time-matrix"
                  role="grid"
                  aria-label="Grade semanal de agendamentos"
                  :style="{
                    gridTemplateColumns: `72px repeat(${visibleDays.length}, minmax(150px, 1fr))`
                  }"
                >
                  <div class="time-matrix__corner">Horário</div>
                  <div
                    v-for="day in visibleDays"
                    :key="`${day.date}-header`"
                    class="time-matrix__column-title time-matrix__column-title--day"
                  >
                    <strong>{{ day.label }}</strong>
                    <span>{{ dayGridSummary(day.date) }}</span>
                  </div>

                  <div class="time-matrix__hour time-matrix__hour--all-day">Dia inteiro</div>
                  <div
                    v-for="day in visibleDays"
                    :key="`${day.date}-all-day`"
                    class="time-matrix__slot time-matrix__slot--all-day"
                  >
                    <button
                      v-if="canManageScheduling"
                      type="button"
                      class="time-matrix__empty-button time-matrix__empty-button--compact"
                      :aria-label="`Criar agendamento livre em ${day.label}`"
                      @click="openSlotCreateFlow({ date: day.date })"
                    >
                      Disponível dia inteiro
                    </button>
                    <span v-else class="time-matrix__empty">Disponível dia inteiro</span>
                  </div>

                  <template v-for="hour in timelineHours" :key="`week-${hour}`">
                    <div class="time-matrix__hour">{{ formatHour(hour) }}</div>

                    <div
                      v-for="day in visibleDays"
                      :key="`${day.date}-${hour}`"
                      class="time-matrix__slot"
                    >
                      <div v-if="weekBlocksBySlot(day.date, hour).length" class="timeline-blocks">
                        <div
                          v-for="block in weekBlocksBySlot(day.date, hour)"
                          :key="block.id"
                          class="timeline-block"
                        >
                          {{ block.title }}
                        </div>
                      </div>

                      <div
                        v-if="appointmentsByWeekSlot(day.date, hour).length"
                        class="timeline-items"
                      >
                        <div
                          v-for="item in visibleAppointmentsByWeekSlot(day.date, hour)"
                          :key="item.id"
                          class="timeline-item"
                          :class="{
                            [`timeline-item--${item.operational.stage}`]: true,
                            'timeline-item--dense': isDenseWeekSlot(day.date, hour)
                          }"
                        >
                          <button
                            type="button"
                            class="timeline-item__surface"
                            :aria-label="appointmentCardAriaLabel(item)"
                            @click="openAppointmentDetails(item)"
                          >
                          <span class="timeline-item__head">
                            <span
                              >{{ timeLabel(item.scheduledAt) }} ·
                              {{ item.durationMinutes || 30 }} min</span
                            >
                            <span
                              class="status-pill"
                              :class="`status-pill--${item.operational.stage}`"
                            >
                              {{ operationalLabel(item) }}
                            </span>
                          </span>
                          <span class="timeline-item__patient">{{ patientName(item.patientId) }}</span>
                          <span v-if="!isDenseWeekSlot(day.date, hour)">{{
                            ownerName(item.ownerId)
                          }}</span>
                          <small v-if="!isDenseWeekSlot(day.date, hour)">{{
                            item.serviceName || item.specialty || item.reason
                          }}</small>
                          <span v-if="!isDenseWeekSlot(day.date, hour)" class="timeline-item__ops">
                            <span>{{ appointmentResponsibleLabel(item) }}</span>
                            <span>{{ queueBridgeLabel(item) }}</span>
                            <strong>{{ nextStepForAppointment(item) }}</strong>
                          </span>
                          </button>
                        </div>
                        <button
                          v-if="hiddenWeekSlotCount(day.date, hour) > 0"
                          type="button"
                          class="timeline-slot-summary timeline-slot-summary--action"
                          :aria-label="`Ver ${hiddenWeekSlotCount(day.date, hour)} agendamentos adicionais`"
                          @click="setViewMode('list')"
                        >
                          +{{ hiddenWeekSlotCount(day.date, hour) }} adicionais
                        </button>
                      </div>

                      <button
                        v-if="canManageScheduling && hasAvailableWeekSlot(day.date, hour)"
                        type="button"
                        class="time-matrix__empty-button"
                        :class="{
                          'time-matrix__empty-button--compact':
                            appointmentsByWeekSlot(day.date, hour).length > 0
                        }"
                        :aria-label="`Criar agendamento livre em ${day.label} às ${formatHour(hour)}`"
                        @click="
                          openSlotCreateFlow({
                            date: day.date,
                            hour,
                            practitionerStaffId: firstAvailablePractitionerForWeekSlot(
                              day.date,
                              hour
                            )
                          })
                        "
                      >
                        {{
                          appointmentsByWeekSlot(day.date, hour).length > 0
                            ? 'Horário livre'
                            : 'Disponível'
                        }}
                      </button>
                      <button
                        v-else-if="canManageScheduling"
                        type="button"
                        class="time-matrix__empty-button"
                        :aria-label="`Criar agendamento em ${day.label} às ${formatHour(hour)}`"
                        @click="openSlotCreateFlow({ date: day.date, hour })"
                      >
                        Disponível
                      </button>
                      <span v-else class="time-matrix__empty">Disponível</span>
                    </div>
                  </template>
                </div>
              </section>
            </template>

            <template v-else>
              <section v-for="day in visibleDays" :key="day.date" class="day-board">
                <div class="day-board__header">
                  <div>
                    <strong>{{ day.label }}</strong>
                    <p>{{ dayGridSummary(day.date) }}</p>
                  </div>
                  <DsButton
                    v-if="canManageScheduling"
                    variant="ghost"
                    size="sm"
                    @click="selectDate(day.date)"
                  >
                    Fixar data
                  </DsButton>
                </div>

                <div
                  class="time-matrix"
                  role="grid"
                  aria-label="Grade diária de agendamentos"
                  :style="{
                    gridTemplateColumns: `72px repeat(${columnCount}, minmax(180px, 1fr))`
                  }"
                >
                  <div class="time-matrix__corner">Horário</div>
                  <div
                    v-for="column in professionalColumns"
                    :key="`${day.date}-${column.id}-header`"
                    class="time-matrix__column-title"
                  >
                    <strong>{{ column.label }}</strong>
                    <span>{{ appointmentsByColumn(day.date, column.id).length }}</span>
                  </div>

                  <div class="time-matrix__hour time-matrix__hour--all-day">Dia inteiro</div>
                  <div
                    v-for="column in professionalColumns"
                    :key="`${day.date}-${column.id}-all-day`"
                    class="time-matrix__slot time-matrix__slot--all-day"
                  >
                    <button
                      v-if="canManageScheduling"
                      type="button"
                      class="time-matrix__empty-button time-matrix__empty-button--compact"
                      :aria-label="slotAriaLabel(day.label, column.label, 9)"
                      @click="
                        openSlotCreateFlow({ date: day.date, practitionerStaffId: column.id })
                      "
                    >
                      Disponível dia inteiro
                    </button>
                    <span v-else class="time-matrix__empty">Disponível dia inteiro</span>
                  </div>

                  <template v-for="hour in timelineHours" :key="`${day.date}-${hour}`">
                    <div class="time-matrix__hour">{{ formatHour(hour) }}</div>

                    <div
                      v-for="column in professionalColumns"
                      :key="`${day.date}-${column.id}-${hour}`"
                      class="time-matrix__slot"
                    >
                      <div
                        v-if="blocksBySlot(day.date, column.id, hour).length"
                        class="timeline-blocks"
                      >
                        <div
                          v-for="block in blocksBySlot(day.date, column.id, hour)"
                          :key="block.id"
                          class="timeline-block"
                        >
                          {{ block.title }}
                        </div>
                      </div>

                      <div
                        v-if="appointmentsBySlot(day.date, column.id, hour).length"
                        class="timeline-items"
                      >
                        <div
                          v-for="item in visibleAppointmentsBySlot(day.date, column.id, hour)"
                          :key="item.id"
                          class="timeline-item"
                          :class="{
                            [`timeline-item--${item.operational.stage}`]: true,
                            'timeline-item--dense': isDenseSlot(day.date, column.id, hour)
                          }"
                        >
                          <button
                            type="button"
                            class="timeline-item__surface"
                            :aria-label="appointmentCardAriaLabel(item)"
                            @click="openAppointmentDetails(item)"
                          >
                          <span class="timeline-item__head">
                          <span
                              >{{ timeLabel(item.scheduledAt) }} ·
                              {{ item.durationMinutes || 30 }} min</span
                            >
                            <span
                              class="status-pill"
                              :class="`status-pill--${item.operational.stage}`"
                            >
                              {{ operationalLabel(item) }}
                            </span>
                          </span>
                          <span class="timeline-item__patient">{{ patientName(item.patientId) }}</span>
                          <span v-if="!isDenseSlot(day.date, column.id, hour)">{{
                            ownerName(item.ownerId)
                          }}</span>
                          <small v-if="!isDenseSlot(day.date, column.id, hour)">{{
                            item.serviceName || item.specialty || item.reason
                          }}</small>
                          <small
                            v-if="!isDenseSlot(day.date, column.id, hour)"
                            class="timeline-item__meta"
                          >
                            {{ appointmentTypeLabel(item) }} · {{ appointmentSectorLabel(item) }}
                          </small>
                          <span
                            v-if="!isDenseSlot(day.date, column.id, hour)"
                            class="timeline-item__ops"
                          >
                            <span>{{ appointmentResponsibleLabel(item) }}</span>
                            <span>{{ queueBridgeLabel(item) }}</span>
                            <strong>{{ nextStepForAppointment(item) }}</strong>
                          </span>

                          <span
                            v-if="!isDenseSlot(day.date, column.id, hour) && item.conflicts.length"
                            class="timeline-item__conflicts"
                          >
                            <span
                              v-for="conflict in item.conflicts.slice(0, 2)"
                              :key="`${item.id}-${conflict.type}-${conflict.startsAt}`"
                              >
                                {{ conflict.message }}
                              </span>
                            </span>
                          </button>

                          <div
                            v-if="!isDenseSlot(day.date, column.id, hour)"
                            class="timeline-item__actions"
                            @click.stop
                          >
                            <DsButton
                              variant="ghost"
                              size="sm"
                              :disabled="Boolean(actionLoadingId)"
                              @click="openAppointmentDetails(item)"
                              >Ver</DsButton
                            >
                            <DsButton
                              v-if="canCheckIn(item)"
                              variant="success"
                              size="sm"
                              :disabled="Boolean(actionLoadingId)"
                              :loading="actionLoadingId === item.id && actionKind === 'checkin'"
                              @click="checkIn(item)"
                            >
                              Check-in
                            </DsButton>
                            <DsButton
                              v-if="canMarkNoShow(item)"
                              variant="danger"
                              size="sm"
                              :disabled="Boolean(actionLoadingId)"
                              :loading="actionLoadingId === item.id && actionKind === 'noshow'"
                              @click="markNoShow(item)"
                            >
                              No-show
                            </DsButton>
                            <DsButton
                              v-if="shouldShowQueueAction(item)"
                              variant="secondary"
                              size="sm"
                              tag="a"
                              to="/queue"
                            >
                              Ver fila
                            </DsButton>
                            <DsButton
                              v-if="shouldShowEncounterAction(item)"
                              variant="secondary"
                              size="sm"
                              @click="openEncounter(item)"
                            >
                              {{ encounterActionLabel(item) }}
                            </DsButton>
                          </div>
                        </div>
                        <button
                          v-if="hiddenSlotCount(day.date, column.id, hour) > 0"
                          type="button"
                          class="timeline-slot-summary timeline-slot-summary--action"
                          :aria-label="`Ver ${hiddenSlotCount(day.date, column.id, hour)} agendamentos adicionais`"
                          @click="setViewMode('list')"
                        >
                          +{{ hiddenSlotCount(day.date, column.id, hour) }} adicionais
                        </button>
                      </div>

                      <button
                        v-else-if="canManageScheduling"
                        type="button"
                        class="time-matrix__empty-button"
                        :aria-label="slotAriaLabel(day.label, column.label, hour)"
                        @click="
                          openSlotCreateFlow({
                            date: day.date,
                            hour,
                            practitionerStaffId: column.id
                          })
                        "
                      >
                        Disponível
                      </button>
                      <span v-else class="time-matrix__empty">Disponível</span>
                    </div>
                  </template>
                </div>
              </section>
            </template>

            <section v-if="selectedView !== 'list' && legendItems.length > 0" class="appointments-legend">
              <strong>Legenda operacional</strong>
              <div class="appointments-legend__items">
                <span
                  v-for="item in legendItems"
                  :key="item.label"
                  class="appointments-legend__pill"
                  :class="`appointments-legend__pill--${item.tone}`"
                >
                  {{ item.label }}
                </span>
              </div>
            </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  buildMonthCalendar,
  buildVisibleDays,
  formatHour,
  slotAriaLabel,
  timeLabel
} from './appointmentCalendar';
import {
  appointmentResponsibleLabel,
  appointmentSectorLabel,
  appointmentTypeLabel,
  createAgendaGridHelpers,
  nextStepForAppointment,
  operationalLabel,
  queueBridgeLabel,
  timelineHours
} from './agendaPresentation';
import { type AgendaView } from './agendaContext';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import type {
  SchedulingCockpitAppointmentSummary,
  SchedulingOperationalBlockSummary
} from '@/types/appointment';
import type { AgendaProfessionalColumn } from './agendaPresentation';

interface AppointmentSlotPreset {
  date: string;
  hour?: number;
  practitionerStaffId?: string;
}

const props = defineProps<{
  selectedView: AgendaView;
  viewMode: Exclude<AgendaView, 'list'>;
  referenceDate: string;
  items: readonly SchedulingCockpitAppointmentSummary[];
  blocks: readonly SchedulingOperationalBlockSummary[];
  professionalColumns: readonly AgendaProfessionalColumn[];
  canManageScheduling: boolean;
  ownerCache: Readonly<Record<string, string>>;
  patientCache: Readonly<Record<string, string>>;
  actionLoadingId: string;
  actionKind: 'cancel' | 'checkin' | 'noshow' | '';
  canCheckIn: (item: SchedulingCockpitAppointmentSummary) => boolean;
  canMarkNoShow: (item: SchedulingCockpitAppointmentSummary) => boolean;
  shouldShowQueueAction: (item: SchedulingCockpitAppointmentSummary) => boolean;
  shouldShowEncounterAction: (item: SchedulingCockpitAppointmentSummary) => boolean;
  encounterActionLabel: (item: SchedulingCockpitAppointmentSummary) => string;
}>();

const emit = defineEmits<{
  (event: 'open-appointment', item: SchedulingCockpitAppointmentSummary): void;
  (event: 'create-slot', preset: AppointmentSlotPreset): void;
  (event: 'select-date', date: string): void;
  (event: 'change-view', view: AgendaView): void;
  (event: 'check-in', item: SchedulingCockpitAppointmentSummary): void;
  (event: 'no-show', item: SchedulingCockpitAppointmentSummary): void;
  (event: 'open-encounter', item: SchedulingCockpitAppointmentSummary): void;
}>();

const selectedView = computed(() => props.selectedView);
const viewMode = computed(() => props.viewMode);
const referenceDate = computed(() => props.referenceDate);
const canManageScheduling = computed(() => props.canManageScheduling);
const professionalColumns = computed(() => props.professionalColumns);
const columnCount = computed(() => professionalColumns.value.length);
const actionLoadingId = computed(() => props.actionLoadingId);
const actionKind = computed(() => props.actionKind);
const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const visibleDays = computed(() => buildVisibleDays(viewMode.value, referenceDate.value));
const monthCalendarDays = computed(() => buildMonthCalendar(referenceDate.value));

const agendaGrid = createAgendaGridHelpers({
  filteredItems: () => props.items,
  blocks: () => props.blocks,
  professionalColumns: () => professionalColumns.value
});
const {
  appointmentsByDay,
  availableSlotsByDay,
  dayGridSummary,
  appointmentsByColumn,
  appointmentsBySlot,
  visibleAppointmentsBySlot,
  hiddenSlotCount,
  isDenseSlot,
  blocksBySlot,
  weekBlocksBySlot,
  appointmentsByWeekSlot,
  hasAvailableWeekSlot,
  firstAvailablePractitionerForWeekSlot,
  visibleAppointmentsByWeekSlot,
  hiddenWeekSlotCount,
  isDenseWeekSlot
} = agendaGrid;

const chronologicalItems = computed(() => [...props.items].sort(
  (left, right) => Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt) || left.id.localeCompare(right.id)
));

const legendItems = [
  { label: 'Folga', tone: 'time_off' },
  { label: 'Aberto', tone: 'scheduled' },
  { label: 'Confirmado', tone: 'checked_in' },
  { label: 'Executado', tone: 'completed' },
  { label: 'Cancelado', tone: 'cancelled' },
  { label: 'Não compareceu', tone: 'no_show' },
  { label: 'Vacina', tone: 'vaccine' },
  { label: 'Vermífugo', tone: 'deworming' },
  { label: 'Retorno', tone: 'return' }
];

function ownerName(ownerId: string) {
  return props.ownerCache[ownerId] || `Tutor ${ownerId.slice(0, 6)}`;
}

function patientName(patientId: string) {
  return props.patientCache[patientId] || `Paciente ${patientId.slice(0, 6)}`;
}

function appointmentDateLabel(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function appointmentCardAriaLabel(item: SchedulingCockpitAppointmentSummary) {
  return `${patientName(item.patientId)}, ${timeLabel(item.scheduledAt)}, ${operationalLabel(item)}. Pressione Enter ou Espaço para ver os detalhes.`;
}

function openAppointmentDetails(item: SchedulingCockpitAppointmentSummary) {
  emit('open-appointment', item);
}

function openSlotCreateFlow(preset: AppointmentSlotPreset) {
  if (!canManageScheduling.value) return;
  emit('create-slot', preset);
}

function selectDate(date: string) {
  emit('select-date', date);
}

function setViewMode(view: AgendaView) {
  emit('change-view', view);
}

function canCheckIn(item: SchedulingCockpitAppointmentSummary) {
  return props.canCheckIn(item);
}

function canMarkNoShow(item: SchedulingCockpitAppointmentSummary) {
  return props.canMarkNoShow(item);
}

function shouldShowQueueAction(item: SchedulingCockpitAppointmentSummary) {
  return props.shouldShowQueueAction(item);
}

function shouldShowEncounterAction(item: SchedulingCockpitAppointmentSummary) {
  return props.shouldShowEncounterAction(item);
}

function encounterActionLabel(item: SchedulingCockpitAppointmentSummary) {
  return props.encounterActionLabel(item);
}

function checkIn(item: SchedulingCockpitAppointmentSummary) {
  emit('check-in', item);
}

function markNoShow(item: SchedulingCockpitAppointmentSummary) {
  emit('no-show', item);
}

function openEncounter(item: SchedulingCockpitAppointmentSummary) {
  emit('open-encounter', item);
}
</script>
<style scoped>
.appointments-cockpit {
  width: 100%;
  max-width: none;
  min-width: 0;
}

.agenda-appointment-list__count { margin: 0 0 8px; color: var(--color-text-secondary); }

.agenda-appointment-list__items { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }

.agenda-appointment-row {
  width: 100%; display: grid; grid-template-columns: 100px minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 16px; align-items: center; padding: 16px; text-align: left;
  border: 1px solid var(--color-border); border-radius: 8px;
  background: var(--color-surface); color: var(--color-text); font: inherit; cursor: pointer;
}

.agenda-appointment-row:hover { background: var(--color-surface-hover); }

.agenda-appointment-row:focus-visible { outline: 3px solid var(--color-primary-500, #2563eb); outline-offset: 3px; }

.agenda-appointment-row__time, .agenda-appointment-row__identity, .agenda-appointment-row__operation { display: grid; gap: 4px; overflow-wrap: anywhere; }

.agenda-appointment-row__time strong, .agenda-appointment-row__identity strong { font-size: 1.125rem; }

.agenda-appointment-row__details { font-weight: 600; }

.agenda-appointment-row__time { font-variant-numeric: tabular-nums; }

.agenda-appointment-row__alert {
  justify-self: start; padding: 4px 8px; border-inline-start: 3px solid var(--color-warning-600);
  border-radius: 4px; background: var(--color-warning-50); color: var(--color-text); font-weight: 600;
}

.agenda-appointment-row__alert--critical {
  border-inline-start-color: var(--color-danger-600); background: var(--color-danger-50);
}

@media (max-width: 720px) {
  .agenda-appointment-row { grid-template-columns: 86px minmax(0, 1fr); gap: 12px; padding: 12px; }
  .agenda-appointment-row__operation { grid-column: 2; }
  .agenda-appointment-row__details { grid-column: 2; }
  .board-toolbar__group:first-child { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center; }
}

.timeline-column__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-column__title {
  justify-content: space-between;
}

.month-board__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  text-align: center;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  text-transform: uppercase;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.week-board {
  margin-bottom: 20px;
}

.month-board {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.month-grid {
  min-width: 0;
}

.month-cell {
  min-height: 156px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  display: grid;
  gap: 8px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.month-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
}

.month-cell--muted {
  opacity: 0.58;
}

.month-cell--selected {
  border-color: rgba(249, 115, 22, 0.3);
  box-shadow: 0 16px 30px rgba(249, 115, 22, 0.1);
}

.month-cell :deep(.ds-card__body) {
  min-width: 0;
}

.month-cell__header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  min-height: var(--touch-min, 44px);
  background: none;
  border: none;
  padding: 0;
  color: inherit;
  cursor: pointer;
}

.timeline-blocks {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.month-cell__availability {
  min-height: 28px;
  min-width: 0;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(236, 253, 245, 0.9);
  border: 1px solid rgba(16, 185, 129, 0.22);
  color: #047857;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.timeline-items {
  align-content: start;
}

.timeline-slot-summary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(241, 245, 249, 0.96);
  border: 1px solid rgba(203, 213, 225, 0.9);
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.month-item__more--action {
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.month-item__more--action {
  border: 0;
  padding: 0;
  background: transparent;
}

.month-item__more--action:focus-visible {
  color: var(--color-primary-700, #1d4ed8);
  text-decoration: underline;
}

.month-cell__empty-surface {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(148, 163, 184, 0.45);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.88));
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.month-cell__empty-surface:hover {
  border-color: rgba(59, 130, 246, 0.38);
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.98), rgba(219, 234, 254, 0.88));
  color: var(--color-primary-700, #1d4ed8);
  transform: translateY(-1px);
}

.timeline-item {
  display: grid;
  gap: 5px;
  width: 100%;
  min-width: 0;
  text-align: left;
  border: 1px solid var(--color-border, #dbe2ea);
  border-left: 3px solid transparent;
  border-radius: 8px;
  background: linear-gradient(180deg, #fff, #f8fafc);
  padding: 9px 10px;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.timeline-item__surface {
  display: grid;
  gap: 5px;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.timeline-item__surface:focus-visible {
  outline: 3px solid var(--color-primary-500, #2563eb);
  outline-offset: 2px;
  border-radius: 4px;
}

.timeline-item__patient {
  display: block;
  min-height: 44px;
  padding: 6px 0;
  font-weight: 700;
}

.timeline-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.08);
  border-color: rgba(191, 219, 254, 0.9);
  background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(241, 245, 249, 0.96));
}

.month-item__more {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.month-item__next {
  color: var(--color-text, #0f172a);
  font-weight: 700;
}

.time-matrix__empty-button {
  width: 100%;
  border: 1px dashed rgba(148, 163, 184, 0.45);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.9);
  color: #475569;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.month-create-slot {
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
  min-height: var(--touch-min, 44px);
  padding: 9px 10px;
  text-align: left;
  line-height: 1.25;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.time-matrix__empty-button:focus-visible {
  border-color: rgba(249, 115, 22, 0.35);
  background: rgba(255, 237, 213, 0.6);
  color: #c2410c;
}

.day-board {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.day-board__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.day-board__header p {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
}

.time-matrix {
  display: grid;
  gap: 1px;
  background: rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  overflow: auto;
  scrollbar-width: thin;
}

.time-matrix__corner,
.time-matrix__column-title,
.time-matrix__hour,
.time-matrix__slot {
  background: var(--color-surface, #fff);
  padding: 8px;
  min-width: 0;
}

.time-matrix__column-title {
  position: sticky;
  top: 0;
  z-index: 1;
}

.time-matrix__corner {
  left: 0;
  z-index: 3;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted, #64748b);
}

.time-matrix__column-title {
  display: grid;
  gap: 4px;
  align-content: center;
}

.time-matrix__column-title strong,
.time-matrix__column-title span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time-matrix__column-title--day {
  min-width: 150px;
}

.time-matrix__hour {
  position: sticky;
  left: 0;
  z-index: 2;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.time-matrix__hour--all-day {
  color: #0f766e;
  background: rgba(240, 253, 250, 0.96);
}

.time-matrix__slot {
  min-height: 106px;
  display: grid;
  align-content: start;
  gap: 8px;
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.time-matrix__slot:hover {
  background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 0.94));
  box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.85);
}

.time-matrix__empty {
  color: var(--color-text-muted, #94a3b8);
  font-size: 12px;
}

.time-matrix__empty-button {
  min-height: var(--touch-min, 44px);
  padding: 12px 10px;
  font-size: 12px;
  text-align: left;
}

.time-matrix__slot--all-day {
  min-height: 52px;
  background: rgba(240, 253, 250, 0.55);
}

.time-matrix__empty-button--compact {
  min-height: var(--touch-min, 44px);
  padding: 8px 10px;
}

.timeline-block {
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  padding: 8px 10px;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.timeline-item--scheduled {
  border-left-color: #2563eb;
}

.timeline-item--called {
  border-left-color: #f59e0b;
}

.timeline-item--in_triage {
  border-left-color: #0ea5e9;
}

.timeline-item--observation {
  border-left-color: #10b981;
}

.timeline-item--completed {
  border-left-color: #16a34a;
}

.timeline-item--cancelled {
  border-left-color: #94a3b8;
}

.timeline-item--dense {
  gap: 4px;
  padding: 8px;
  border-radius: 8px;
}

.timeline-item--dense .timeline-item__head {
  gap: 6px;
  align-items: flex-start;
}

.timeline-item--dense .timeline-item__head span:first-child {
  font-size: 11px;
  color: var(--color-text-muted, #64748b);
}

.timeline-item--dense strong {
  font-size: 12px;
  line-height: 1.25;
}

.month-item small {
  min-width: 0;
  overflow-wrap: anywhere;
}

.month-item > strong {
  font-size: 13px;
  line-height: 1.25;
}

.month-item > small {
  font-size: 11px;
  line-height: 1.25;
  color: var(--color-text-secondary, #475569);
}

.timeline-item__head {
  justify-content: space-between;
  flex-wrap: wrap;
  min-width: 0;
}

.status-pill {
  display: inline-flex;
  max-width: 100%;
  border-radius: 999px;
  padding: 3px 7px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  white-space: normal;
}

.status-pill--scheduled {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
}

.status-pill--called {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.status-pill--in_triage {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
}

.status-pill--observation {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.status-pill--completed {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.status-pill--cancelled {
  background: rgba(148, 163, 184, 0.12);
  color: #64748b;
}

.timeline-item__meta {
  color: var(--color-text-muted, #64748b);
}

.timeline-item__ops {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(248, 250, 252, 0.78);
}

.timeline-item__ops strong {
  min-width: 0;
  font-size: 11px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.timeline-item__ops span {
  color: var(--color-text-secondary, #475569);
}

.timeline-item__ops strong {
  color: var(--color-text, #0f172a);
}

.timeline-item__conflicts {
  display: grid;
  gap: 4px;
  color: #b91c1c;
  font-size: 11px;
  overflow-wrap: anywhere;
}

.timeline-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.appointments-legend {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
}

.appointments-legend > strong {
  font-size: 13px;
  line-height: 1.4;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.appointments-legend__items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.appointments-legend__pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
}

.appointments-legend__pill--scheduled {
  background: rgba(37, 99, 235, 0.1);
  border-color: rgba(37, 99, 235, 0.18);
  color: #1d4ed8;
}

.appointments-legend__pill--checked_in {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.22);
  color: #b45309;
}

.appointments-legend__pill--completed {
  background: rgba(22, 163, 74, 0.12);
  border-color: rgba(22, 163, 74, 0.2);
  color: #15803d;
}

.appointments-legend__pill--cancelled {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.18);
  color: #b91c1c;
}

.appointments-legend__pill--time_off {
  background: rgba(226, 232, 240, 0.9);
  border-color: rgba(148, 163, 184, 0.3);
  color: #475569;
}

.appointments-legend__pill--no_show {
  background: rgba(255, 247, 237, 0.92);
  border-color: rgba(251, 146, 60, 0.35);
  color: #c2410c;
  text-decoration: line-through;
}

.appointments-legend__pill--vaccine {
  background: rgba(254, 249, 195, 0.95);
  border-color: rgba(250, 204, 21, 0.45);
  color: #854d0e;
}

.appointments-legend__pill--deworming {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.24);
  color: #4338ca;
}

.appointments-legend__pill--return {
  background: rgba(168, 85, 247, 0.12);
  border-color: rgba(168, 85, 247, 0.24);
  color: #7e22ce;
}

.appointments-legend__pill--marker {
  background: rgba(249, 115, 22, 0.08);
  border-color: rgba(249, 115, 22, 0.18);
  color: #c2410c;
}

.appointments-legend__hint {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 12px;
  line-height: 1.45;
}

@media (max-width: 720px) {
  .appointments-cockpit__layout {
    gap: 10px;
  }

  :deep(.app-page-header__breadcrumbs),
  :deep(.app-page-header__subtitle) {
    display: none;
  }

  :deep(.agenda-today-button) {
    display: none;
  }

  .agenda-summary-disclosure {
    margin-bottom: 12px;
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.72);
  }

  .agenda-summary-disclosure > summary {
    display: flex;
    min-height: var(--touch-min, 44px);
    box-sizing: border-box;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    color: var(--color-text, #0f172a);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    list-style: none;
  }

  .agenda-summary-disclosure > summary::-webkit-details-marker { display: none; }

  .agenda-summary-disclosure > summary::after {
    flex: 0 0 auto;
    color: var(--color-primary-700, #066b80);
    content: '+';
    font-size: 20px;
    line-height: 1;
  }

  .agenda-summary-disclosure[open] > summary::after { content: '−'; }

  .agenda-summary-disclosure__meta {
    min-width: 0;
    margin-inline-start: auto;
    color: var(--color-text-muted, #55717a);
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;
    text-align: right;
  }

  .agenda-summary-disclosure .agenda-grid-summary {
    margin: 0;
    padding: 0 8px 8px;
  }

  :deep(.app-page-header__context-item) {
    padding: 8px;
    gap: 5px;
  }

  :deep(.app-page-header__context-item dt) {
    font-size: 10px;
    letter-spacing: 0.02em;
  }

  .agenda-create-button {
    display: none;
  }

  .board-toolbar {
    position: static;
  }

  .board-toolbar :deep(.ds-card__body) { flex-direction: column; align-items: stretch; }

  .board-toolbar,
  .board-toolbar__group,
  .board-toolbar__group--right {
    align-items: stretch;
  }

  .view-toggle {
    width: 100%;
  }

  .month-grid {
    grid-template-columns: 1fr;
  }

  .mini-calendar__grid {
    gap: 2px;
  }

  .sidebar-actions {
    flex-direction: column;
  }

  .time-matrix {
    border-radius: 8px;
  }

  .time-matrix__corner,
  .time-matrix__column-title,
  .time-matrix__hour,
  .time-matrix__slot {
    padding: 7px;
  }

  .time-matrix__slot {
    min-height: 92px;
  }
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend {
  border-color: var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  color: var(--color-text);
}

:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__empty-button:focus-visible {
  color: var(--pulse-sand);
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend {
  border-color: var(--color-border);
}

:global(:root[data-theme='dark']) .appointments-cockpit .month-cell__availability {
  border-color: var(--color-success-400);
  background: var(--color-success-50);
  color: var(--pulse-mint);
}

:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__empty-button {
  border-color: var(--color-border);
  background: var(--color-surface-subtle);
  color: var(--color-text-muted);
}

:global(:root[data-theme='dark']) .appointments-cockpit .month-cell__empty-surface:focus-visible {
  border-color: var(--color-primary-400);
  background: var(--color-primary-subtle);
  color: var(--pulse-cyan-strong);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item {
  background: var(--color-surface-elevated);
  color: var(--color-text);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item:hover {
  border-color: var(--color-primary-400);
  background: var(--color-surface-hover);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item__ops strong {
  color: var(--color-text);
}

:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__empty-button:focus-visible {
  border-color: var(--color-warning-400);
  background: var(--color-warning-50);
}

:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix {
  background: var(--color-border-subtle);
}

:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__slot {
  background: var(--color-surface);
  color: var(--color-text);
}

:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__slot:hover {
  background: var(--color-surface-hover);
  box-shadow: inset 0 0 0 1px var(--color-border);
}

:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__slot--all-day {
  background: var(--color-success-50);
  color: var(--pulse-mint);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-block {
  background: var(--color-warning-50);
  color: var(--pulse-sand);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item__ops {
  border-color: var(--color-border);
  background: var(--color-surface-subtle);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item__ops span {
  color: var(--color-text-secondary);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item__conflicts {
  color: var(--pulse-coral);
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--scheduled {
  background: var(--color-primary-50);
  color: var(--pulse-cyan-strong);
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--checked_in {
  background: var(--color-warning-50);
  color: var(--pulse-sand);
}

:global(:root[data-theme='dark']) .appointments-cockpit .status-pill--in_triage {
  background: var(--color-info-50);
  color: var(--pulse-cyan-strong);
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--completed {
  background: var(--color-success-50);
  color: var(--pulse-mint);
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--time_off {
  background: var(--color-neutral-100);
  color: var(--pulse-muted-strong);
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--cancelled {
  background: var(--color-danger-50);
  border-color: var(--color-danger-400);
  color: var(--pulse-coral);
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--marker {
  background: var(--color-warning-50);
  border-color: var(--color-warning-400);
  color: var(--pulse-sand);
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--return {
  background: var(--color-primary-50);
  border-color: var(--color-primary-400);
  color: var(--pulse-cyan-strong);
}
</style>

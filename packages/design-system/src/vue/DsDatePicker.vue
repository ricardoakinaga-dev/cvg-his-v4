<template>
  <div class="ds-date-picker" :class="{ 'ds-date-picker--error': !!error, 'ds-date-picker--disabled': disabled }">
    <label v-if="label" :for="pickerId" class="ds-date-picker__label">
      {{ label }}
      <span v-if="required" class="ds-date-picker__required" aria-hidden="true">*</span>
    </label>

    <div class="ds-date-picker__input-wrapper">
      <input
        :id="pickerId"
        type="text"
        :value="formattedValue"
        :placeholder="placeholder || 'Selecione uma data'"
        :disabled="disabled"
        :readonly="true"
        :aria-invalid="!!error"
        :aria-describedby="error ? pickerId + '-error' : undefined"
        class="ds-date-picker__input"
        @click="toggleCalendar"
        @keydown.enter.prevent="toggleCalendar"
        @keydown.space.prevent="toggleCalendar"
      />
      <button
        type="button"
        class="ds-date-picker__icon-btn"
        :disabled="disabled"
        @click="toggleCalendar"
        aria-label="Abrir calendario"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isOpen" class="ds-date-picker__calendar" ref="calendarRef">
          <div class="ds-date-picker__calendar-header">
            <button type="button" class="ds-date-picker__nav-btn" @click="previousMonth" aria-label="Mes anterior">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span class="ds-date-picker__current-month">{{ monthYearLabel }}</span>
            <button type="button" class="ds-date-picker__nav-btn" @click="nextMonth" aria-label="Proximo mes">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div class="ds-date-picker__weekdays">
            <span v-for="day in weekdays" :key="day" class="ds-date-picker__weekday">{{ day }}</span>
          </div>

          <div class="ds-date-picker__days">
            <span
              v-for="(day, index) in calendarDays"
              :key="index"
              class="ds-date-picker__day"
              :class="{
                'ds-date-picker__day--empty': !day,
                'ds-date-picker__day--selected': isSelected(day),
                'ds-date-picker__day--today': isToday(day),
                'ds-date-picker__day--disabled': isDisabled(day),
                'ds-date-picker__day--other-month': isOtherMonth(day)
              }"
              :tabindex="day && !isDisabled(day) ? 0 : -1"
              :aria-selected="isSelected(day)"
              :aria-disabled="isDisabled(day)"
              @click="day && !isDisabled(day) && selectDate(day)"
              @keydown.enter="day && !isDisabled(day) && selectDate(day)"
            >
              {{ day ? day.getDate() : '' }}
            </span>
          </div>

          <div v-if="showTime" class="ds-date-picker__time-section">
            <div class="ds-date-picker__time-inputs">
              <input
                type="number"
                :value="hours"
                min="0"
                max="23"
                class="ds-date-picker__time-input"
                aria-label="Hora"
                @change="updateHours(($event.target as HTMLInputElement).value)"
              />
              <span class="ds-date-picker__time-separator">:</span>
              <input
                type="number"
                :value="minutes"
                min="0"
                max="59"
                class="ds-date-picker__time-input"
                aria-label="Minuto"
                @change="updateMinutes(($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>

          <div class="ds-date-picker__calendar-footer">
            <button type="button" class="ds-date-picker__today-btn" @click="goToToday">Hoje</button>
            <button type="button" class="ds-date-picker__clear-btn" @click="clearDate">Limpar</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <p v-if="error" :id="pickerId + '-error'" class="ds-date-picker__error" role="alert">
      {{ error }}
    </p>
    <p v-if="hint && !error" class="ds-date-picker__hint">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';

const [modelValue, modifiers] = defineModel<string | Date | null>({
  set(value) {
    return value;
  }
});

export interface DsDatePickerProps {
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  min?: string | Date;
  max?: string | Date;
  locale?: string;
  format?: string;
  showTime?: boolean;
  id?: string;
}

const props = withDefaults(defineProps<DsDatePickerProps>(), {
  label: undefined,
  placeholder: undefined,
  error: undefined,
  hint: undefined,
  disabled: false,
  required: false,
  readonly: true,
  min: undefined,
  max: undefined,
  locale: 'pt-BR',
  format: 'DD/MM/YYYY',
  showTime: false,
  id: undefined
});

const emit = defineEmits<{
  blur: [];
  focus: [];
}>();

const generatedPickerId = `ds-date-picker-${Math.random().toString(36).slice(2, 8)}`;
const pickerId = computed(() => props.id || generatedPickerId);
const isOpen = ref(false);
const calendarRef = ref<HTMLElement | null>(null);

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const currentMonth = ref(new Date());

const selectedDate = computed(() => {
  if (!modelValue.value) return null;
  const date = modelValue.value instanceof Date ? modelValue.value : new Date(modelValue.value);
  return isNaN(date.getTime()) ? null : date;
});

const hours = ref(selectedDate.value?.getHours() ?? 0);
const minutes = ref(selectedDate.value?.getMinutes() ?? 0);

const monthYearLabel = computed(() => {
  return currentMonth.value.toLocaleDateString(props.locale, { month: 'long', year: 'numeric' });
});

const formattedValue = computed(() => {
  if (!selectedDate.value) return '';
  const date = selectedDate.value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (props.showTime) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${h}:${m}`;
  }
  return `${day}/${month}/${year}`;
});

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: (Date | null)[] = [];

  // Add empty slots for days before the first day of the month
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null);
  }

  // Add days of the month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  return days;
});

function toggleCalendar() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value && selectedDate.value) {
    currentMonth.value = new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), 1);
  }
}

function closeCalendar() {
  isOpen.value = false;
}

function previousMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1
  );
}

function nextMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1
  );
}

function isSelected(day: Date | null): boolean {
  if (!day || !selectedDate.value) return false;
  return (
    day.getDate() === selectedDate.value.getDate() &&
    day.getMonth() === selectedDate.value.getMonth() &&
    day.getFullYear() === selectedDate.value.getFullYear()
  );
}

function isToday(day: Date | null): boolean {
  if (!day) return false;
  const today = new Date();
  return (
    day.getDate() === today.getDate() &&
    day.getMonth() === today.getMonth() &&
    day.getFullYear() === today.getFullYear()
  );
}

function isDisabled(day: Date | null): boolean {
  if (!day) return false;
  if (props.min) {
    const minDate = props.min instanceof Date ? props.min : new Date(props.min);
    if (day < minDate) return true;
  }
  if (props.max) {
    const maxDate = props.max instanceof Date ? props.max : new Date(props.max);
    if (day > maxDate) return true;
  }
  return false;
}

function isOtherMonth(day: Date | null): boolean {
  if (!day) return false;
  return day.getMonth() !== currentMonth.value.getMonth();
}

function selectDate(day: Date) {
  if (props.showTime) {
    const newDate = new Date(day);
    newDate.setHours(hours.value, minutes.value, 0, 0);
    modelValue.value = newDate;
  } else {
    modelValue.value = day;
  }
  emit('blur');
  closeCalendar();
}

function goToToday() {
  const today = new Date();
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1);
  selectDate(today);
}

function clearDate() {
  modelValue.value = null;
  closeCalendar();
}

function updateHours(value: string) {
  const h = parseInt(value, 10);
  if (!isNaN(h) && h >= 0 && h <= 23 && selectedDate.value) {
    hours.value = h;
    const newDate = new Date(selectedDate.value);
    newDate.setHours(h);
    modelValue.value = newDate;
  }
}

function updateMinutes(value: string) {
  const m = parseInt(value, 10);
  if (!isNaN(m) && m >= 0 && m <= 59 && selectedDate.value) {
    minutes.value = m;
    const newDate = new Date(selectedDate.value);
    newDate.setMinutes(m);
    modelValue.value = newDate;
  }
}

function handleClickOutside(event: MouseEvent) {
  if (calendarRef.value && !calendarRef.value.contains(event.target as Node)) {
    const target = event.target as HTMLElement;
    if (!target.closest('.ds-date-picker')) {
      closeCalendar();
    }
  }
}

watch(selectedDate, (newDate) => {
  if (newDate) {
    hours.value = newDate.getHours();
    minutes.value = newDate.getMinutes();
  }
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.ds-date-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}

.ds-date-picker__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text, #0f172a);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-date-picker__required {
  color: var(--color-danger-500, #ef4444);
  margin-left: 2px;
}

.ds-date-picker__input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.ds-date-picker__input {
  flex: 1;
  padding: 8px 40px 8px 12px;
  font-size: 14px;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  color: var(--color-text, #0f172a);
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 6px);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  min-height: 40px;
  cursor: pointer;
}

.ds-date-picker__input:focus {
  outline: none;
  border-color: var(--color-primary-500, #3b82f6);
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
}

.ds-date-picker--disabled .ds-date-picker__input {
  background: var(--color-bg-subtle, #f8fafc);
  cursor: not-allowed;
  opacity: 0.7;
}

.ds-date-picker__icon-btn {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.ds-date-picker__icon-btn:hover:not(:disabled) {
  color: var(--color-primary-600, #2563eb);
  background: var(--color-bg-subtle, #f1f5f9);
}

.ds-date-picker__icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.ds-date-picker__icon-btn svg {
  width: 18px;
  height: 18px;
}

/* Calendar Dropdown */
.ds-date-picker__calendar {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-xl, 0 25px 50px -12px rgba(0, 0, 0, 0.25));
  padding: 16px;
  min-width: 300px;
  max-width: calc(100vw - 24px);
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
}

.ds-date-picker__calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.ds-date-picker__nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.ds-date-picker__nav-btn:hover {
  color: var(--color-primary-600, #2563eb);
  background: var(--color-bg-subtle, #f1f5f9);
}

.ds-date-picker__nav-btn svg {
  width: 18px;
  height: 18px;
}

.ds-date-picker__current-month {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
  text-transform: capitalize;
}

.ds-date-picker__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 8px;
}

.ds-date-picker__weekday {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted, #64748b);
  text-align: center;
  padding: 4px;
}

.ds-date-picker__days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.ds-date-picker__day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 14px;
  color: var(--color-text, #0f172a);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ds-date-picker__day:hover:not(.ds-date-picker__day--disabled):not(.ds-date-picker__day--empty) {
  background: var(--color-bg-subtle, #f1f5f9);
}

.ds-date-picker__day--empty {
  cursor: default;
}

.ds-date-picker__day--today {
  font-weight: 700;
  color: var(--color-primary-600, #2563eb);
}

.ds-date-picker__day--selected {
  background: var(--color-primary-500, #3b82f6) !important;
  color: white !important;
  font-weight: 600;
}

.ds-date-picker__day--disabled {
  color: var(--color-text-muted, #cbd5e1);
  cursor: not-allowed;
}

.ds-date-picker__day--other-month {
  color: var(--color-text-muted, #94a3b8);
}

/* Time Section */
.ds-date-picker__time-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.ds-date-picker__time-inputs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.ds-date-picker__time-input {
  width: 60px;
  padding: 8px;
  font-size: 16px;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  color: var(--color-text, #0f172a);
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 6px);
  text-align: center;
}

.ds-date-picker__time-input:focus {
  outline: none;
  border-color: var(--color-primary-500, #3b82f6);
}

.ds-date-picker__time-separator {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-muted, #64748b);
}

/* Calendar Footer */
.ds-date-picker__calendar-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.ds-date-picker__today-btn,
.ds-date-picker__clear-btn {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ds-date-picker__today-btn {
  background: var(--color-bg-subtle, #f1f5f9);
  border: none;
  color: var(--color-text, #0f172a);
}

.ds-date-picker__today-btn:hover {
  background: var(--color-primary-100, #dbeafe);
  color: var(--color-primary-700, #1d4ed8);
}

.ds-date-picker__clear-btn {
  background: transparent;
  border: 1px solid var(--color-border, #e2e8f0);
  color: var(--color-text-muted, #64748b);
}

.ds-date-picker__clear-btn:hover {
  border-color: var(--color-danger-500, #ef4444);
  color: var(--color-danger-500, #ef4444);
}

/* Error State */
.ds-date-picker--error .ds-date-picker__input {
  border-color: var(--color-danger-500, #ef4444);
}

.ds-date-picker--error .ds-date-picker__input:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4);
}

.ds-date-picker__error {
  margin: 0;
  font-size: 12px;
  color: var(--color-danger-600, #dc2626);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-date-picker__hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.95);
}
</style>

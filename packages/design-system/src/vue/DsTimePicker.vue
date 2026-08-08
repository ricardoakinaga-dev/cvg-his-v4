<template>
  <div class="ds-time-picker" :class="{ 'ds-time-picker--error': !!error, 'ds-time-picker--disabled': disabled }">
    <label v-if="label" :for="pickerId" class="ds-time-picker__label">
      {{ label }}
      <span v-if="required" class="ds-time-picker__required" aria-hidden="true">*</span>
    </label>

    <div class="ds-time-picker__input-wrapper">
      <input
        :id="pickerId"
        type="text"
        :value="formattedValue"
        :placeholder="placeholder || 'Selecione um horario'"
        :disabled="disabled"
        :readonly="true"
        :aria-invalid="!!error"
        :aria-describedby="error ? pickerId + '-error' : undefined"
        class="ds-time-picker__input"
        @click="toggleDropdown"
        @keydown.enter.prevent="toggleDropdown"
        @keydown.space.prevent="toggleDropdown"
      />
      <button
        type="button"
        class="ds-time-picker__icon-btn"
        :disabled="disabled"
        @click="toggleDropdown"
        aria-label="Abrir seletor de horario"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isOpen" class="ds-time-picker__dropdown" ref="dropdownRef">
          <div class="ds-time-picker__header">
            <button
              type="button"
              class="ds-time-picker__unit-btn ds-time-picker__unit-btn--hours"
              :class="{ 'ds-time-picker__unit-btn--active': activeUnit === 'hours' }"
              @click="activeUnit = 'hours'"
            >
              Horas
            </button>
            <button
              type="button"
              class="ds-time-picker__unit-btn ds-time-picker__unit-btn--minutes"
              :class="{ 'ds-time-picker__unit-btn--active': activeUnit === 'minutes' }"
              @click="activeUnit = 'minutes'"
            >
              Minutos
            </button>
          </div>

          <div class="ds-time-picker__scroll-container" ref="scrollContainer">
            <div v-if="activeUnit === 'hours'" class="ds-time-picker__values">
              <button
                v-for="h in 24"
                :key="h - 1"
                type="button"
                class="ds-time-picker__value"
                :class="{ 'ds-time-picker__value--selected': hours === h - 1 }"
                @click="selectHours(h - 1)"
              >
                {{ String(h - 1).padStart(2, '0') }}
              </button>
            </div>
            <div v-else class="ds-time-picker__values">
              <button
                v-for="m in 12"
                :key="(m - 1) * 5"
                type="button"
                class="ds-time-picker__value"
                :class="{ 'ds-time-picker__value--selected': minutes === (m - 1) * 5 }"
                @click="selectMinutes((m - 1) * 5)"
              >
                {{ String((m - 1) * 5).padStart(2, '0') }}
              </button>
            </div>
          </div>

          <div class="ds-time-picker__footer">
            <button type="button" class="ds-time-picker__now-btn" @click="goToNow">Agora</button>
            <button type="button" class="ds-time-picker__clear-btn" @click="clearTime">Limpar</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <p v-if="error" :id="pickerId + '-error'" class="ds-time-picker__error" role="alert">
      {{ error }}
    </p>
    <p v-if="hint && !error" class="ds-time-picker__hint">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';

const [modelValue, modifiers] = defineModel<string>({
  set(value) {
    return value;
  }
});

export interface DsTimePickerProps {
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  id?: string;
  format24h?: boolean;
}

const props = withDefaults(defineProps<DsTimePickerProps>(), {
  label: undefined,
  placeholder: undefined,
  error: undefined,
  hint: undefined,
  disabled: false,
  required: false,
  readonly: true,
  id: undefined,
  format24h: true
});

const emit = defineEmits<{
  blur: [];
  focus: [];
}>();

const generatedPickerId = `ds-time-picker-${Math.random().toString(36).slice(2, 8)}`;
const pickerId = computed(() => props.id || generatedPickerId);
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);
const scrollContainer = ref<HTMLElement | null>(null);
const activeUnit = ref<'hours' | 'minutes'>('hours');

const selectedTime = computed(() => {
  if (!modelValue.value) return { hours: 0, minutes: 0 };
  const [h, m] = modelValue.value.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
});

const hours = ref(selectedTime.value.hours);
const minutes = ref(selectedTime.value.minutes);

const formattedValue = computed(() => {
  if (!modelValue.value) return '';
  const h = String(hours.value).padStart(2, '0');
  const m = String(minutes.value).padStart(2, '0');
  return `${h}:${m}`;
});

function toggleDropdown() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function closeDropdown() {
  isOpen.value = false;
}

function selectHours(h: number) {
  hours.value = h;
  updateModelValue();
  emit('blur');
  closeDropdown();
}

function selectMinutes(m: number) {
  minutes.value = m;
  updateModelValue();
  emit('blur');
  closeDropdown();
}

function goToNow() {
  const now = new Date();
  hours.value = now.getHours();
  minutes.value = Math.floor(now.getMinutes() / 5) * 5; // Round to nearest 5
  updateModelValue();
  emit('blur');
  closeDropdown();
}

function clearTime() {
  modelValue.value = '';
  hours.value = 0;
  minutes.value = 0;
  closeDropdown();
}

function updateModelValue() {
  modelValue.value = `${String(hours.value).padStart(2, '0')}:${String(minutes.value).padStart(2, '0')}`;
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    const target = event.target as HTMLElement;
    if (!target.closest('.ds-time-picker')) {
      closeDropdown();
    }
  }
}

watch(selectedTime, (newTime) => {
  hours.value = newTime.hours;
  minutes.value = newTime.minutes;
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.ds-time-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}

.ds-time-picker__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text, #0f172a);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-time-picker__required {
  color: var(--color-danger-500, #ef4444);
  margin-left: 2px;
}

.ds-time-picker__input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.ds-time-picker__input {
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

.ds-time-picker__input:focus {
  outline: none;
  border-color: var(--color-primary-500, #3b82f6);
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
}

.ds-time-picker--disabled .ds-time-picker__input {
  background: var(--color-bg-subtle, #f8fafc);
  cursor: not-allowed;
  opacity: 0.7;
}

.ds-time-picker__icon-btn {
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

.ds-time-picker__icon-btn:hover:not(:disabled) {
  color: var(--color-primary-600, #2563eb);
  background: var(--color-bg-subtle, #f1f5f9);
}

.ds-time-picker__icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.ds-time-picker__icon-btn svg {
  width: 18px;
  height: 18px;
}

/* Dropdown */
.ds-time-picker__dropdown {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-xl, 0 25px 50px -12px rgba(0, 0, 0, 0.25));
  padding: 12px;
  min-width: 200px;
  max-width: calc(100vw - 24px);
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
}

.ds-time-picker__header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.ds-time-picker__unit-btn {
  flex: 1;
  padding: 8px;
  font-size: 13px;
  font-weight: 500;
  background: var(--color-bg-subtle, #f1f5f9);
  border: none;
  border-radius: 6px;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ds-time-picker__unit-btn:hover {
  background: var(--color-primary-100, #dbeafe);
  color: var(--color-primary-700, #1d4ed8);
}

.ds-time-picker__unit-btn--active {
  background: var(--color-primary-500, #3b82f6);
  color: white;
}

.ds-time-picker__unit-btn--active:hover {
  background: var(--color-primary-600, #2563eb);
  color: white;
}

.ds-time-picker__scroll-container {
  max-height: 200px;
  overflow-y: auto;
}

.ds-time-picker__values {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.ds-time-picker__value {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  font-size: 14px;
  font-weight: 500;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--color-text, #0f172a);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ds-time-picker__value:hover {
  background: var(--color-bg-subtle, #f1f5f9);
}

.ds-time-picker__value--selected {
  background: var(--color-primary-500, #3b82f6) !important;
  color: white !important;
}

/* Footer */
.ds-time-picker__footer {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.ds-time-picker__now-btn,
.ds-time-picker__clear-btn {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ds-time-picker__now-btn {
  background: var(--color-bg-subtle, #f1f5f9);
  border: none;
  color: var(--color-text, #0f172a);
}

.ds-time-picker__now-btn:hover {
  background: var(--color-primary-100, #dbeafe);
  color: var(--color-primary-700, #1d4ed8);
}

.ds-time-picker__clear-btn {
  background: transparent;
  border: 1px solid var(--color-border, #e2e8f0);
  color: var(--color-text-muted, #64748b);
}

.ds-time-picker__clear-btn:hover {
  border-color: var(--color-danger-500, #ef4444);
  color: var(--color-danger-500, #ef4444);
}

/* Error State */
.ds-time-picker--error .ds-time-picker__input {
  border-color: var(--color-danger-500, #ef4444);
}

.ds-time-picker--error .ds-time-picker__input:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4);
}

.ds-time-picker__error {
  margin: 0;
  font-size: 12px;
  color: var(--color-danger-600, #dc2626);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-time-picker__hint {
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

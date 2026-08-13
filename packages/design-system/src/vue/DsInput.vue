<template>
  <div class="ds-input-wrapper" :class="{ 'ds-input-wrapper--error': !!error }">
    <label v-if="label" :for="inputId" class="ds-input__label">
      {{ label }}
      <span v-if="required" class="ds-input__required" aria-hidden="true">*</span>
    </label>
    <input
      v-if="type !== 'textarea' && type !== 'select'"
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :readonly="readonly"
      :maxlength="maxlength"
      :autocomplete="autocomplete"
      :step="step"
      :min="min"
      :max="max"
      :aria-invalid="!!error"
      :aria-describedby="error ? inputId + '-error' : undefined"
      class="ds-input"
      @input="modelValue = ($event.target as HTMLInputElement).value"
      @blur="$emit('blur')"
      @focus="$emit('focus')"
    />
    <textarea
      v-else-if="type === 'textarea'"
      :id="inputId"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :readonly="readonly"
      :maxlength="maxlength"
      :rows="rows"
      :aria-invalid="!!error"
      :aria-describedby="error ? inputId + '-error' : undefined"
      class="ds-input ds-input--textarea"
      @input="modelValue = ($event.target as HTMLTextAreaElement).value"
      @blur="$emit('blur')"
      @focus="$emit('focus')"
    />
    <select
      v-else
      :id="inputId"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :aria-invalid="!!error"
      :aria-describedby="error ? inputId + '-error' : undefined"
      class="ds-input ds-input--select"
      @change="modelValue = ($event.target as HTMLSelectElement).value"
      @blur="$emit('blur')"
      @focus="$emit('focus')"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <slot />
    </select>
    <p v-if="error" :id="inputId + '-error'" class="ds-input__error" role="alert">
      {{ error }}
    </p>
    <p v-if="hint && !error" class="ds-input__hint">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const [modelValue, modifiers] = defineModel<string | number>({
  set(value) {
    if (modifiers.number) {
      if (value === '') return '';
      const parsed = Number(value);
      return isNaN(parsed) ? value : parsed;
    }
    if (modifiers.trim && typeof value === 'string') {
      return value.trim();
    }
    return value;
  }
});

export interface DsInputProps {
  label?: string;
  placeholder?: string;
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'tel'
    | 'url'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'search'
    | 'textarea'
    | 'select';
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  maxlength?: number;
  autocomplete?: string;
  rows?: number;
  id?: string;
  step?: string | number;
  min?: string | number;
  max?: string | number;
}

const props = withDefaults(defineProps<DsInputProps>(), {
  label: undefined,
  placeholder: undefined,
  type: 'text',
  error: undefined,
  hint: undefined,
  disabled: false,
  required: false,
  readonly: false,
  maxlength: undefined,
  autocomplete: undefined,
  rows: 4,
  id: undefined,
  step: undefined,
  min: undefined,
  max: undefined
});

defineEmits<{
  blur: [];
  focus: [];
}>();

const inputId = computed(() => props.id || `ds-input-${Math.random().toString(36).slice(2, 8)}`);
</script>

<style scoped>
.ds-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ds-input__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text, #0f172a);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-input__required {
  color: var(--color-danger-500, #ef4444);
  margin-left: 2px;
}

.ds-input {
  padding: 8px 12px;
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
}

.ds-input::placeholder {
  color: var(--color-text-muted, #94a3b8);
}

.ds-input:focus {
  outline: none;
  border-color: var(--color-primary-500, #3b82f6);
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
}

.ds-input:disabled {
  background: var(--color-bg-subtle, #f8fafc);
  cursor: not-allowed;
  opacity: 0.7;
}

.ds-input--textarea {
  min-height: 80px;
  resize: vertical;
}

.ds-input--select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 20px;
  padding-right: 36px;
}

.ds-input-wrapper--error .ds-input {
  border-color: var(--color-danger-500, #ef4444);
}

.ds-input-wrapper--error .ds-input:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4);
}

.ds-input__error {
  margin: 0;
  font-size: 12px;
  color: var(--color-danger-600, #dc2626);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-input__hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

@media (max-width: 1024px), (pointer: coarse) {
  .ds-input {
    min-height: var(--touch-min, 44px);
  }
}

@media (max-width: 600px) {
  .ds-input {
    font-size: 16px;
  }
}
</style>

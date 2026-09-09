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
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :aria-invalid="ariaInvalid ?? !!error"
      :aria-required="required || undefined"
      :aria-describedby="describedById"
      :step="step"
      :min="min"
      :max="max"
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
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :aria-invalid="ariaInvalid ?? !!error"
      :aria-required="required || undefined"
      :aria-describedby="describedById"
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
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :aria-invalid="ariaInvalid ?? !!error"
      :aria-required="required || undefined"
      :aria-describedby="describedById"
      class="ds-input ds-input--select"
      @change="modelValue = ($event.target as HTMLSelectElement).value"
      @blur="$emit('blur')"
      @focus="$emit('focus')"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <slot />
    </select>
    <p v-if="error" :id="errorId" class="ds-input__error" role="alert">
      {{ error }}
    </p>
    <p v-if="hint && !error" :id="hintId" class="ds-input__hint">
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
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  ariaInvalid?: boolean;
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
  ariaLabel: undefined,
  ariaLabelledby: undefined,
  ariaDescribedby: undefined,
  ariaInvalid: undefined,
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

const generatedInputId = `ds-input-${Math.random().toString(36).slice(2, 8)}`;
const inputId = computed(() => props.id || generatedInputId);
const hintId = computed(() => `${inputId.value}-hint`);
const errorId = computed(() => `${inputId.value}-error`);
const describedById = computed(() => {
  const ids = [
    props.ariaDescribedby,
    props.error ? errorId.value : props.hint ? hintId.value : undefined
  ].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
});
</script>

<style scoped>
.ds-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  gap: var(--space-2, 0.5rem);
}

.ds-input__label {
  color: var(--color-text-secondary, #475b6d);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-size: var(--font-size-sm, 0.8125rem);
  font-weight: var(--font-weight-semibold, 600);
  line-height: var(--line-height-tight, 1.25);
  letter-spacing: 0.01em;
}

.ds-input__required {
  color: var(--color-danger-600, #bd4645);
  margin-left: 2px;
}

.ds-input {
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-width: 0;
  min-height: var(--touch-min, 44px);
  padding: 0.625rem 0.75rem;
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-size: var(--font-size-base, 0.9375rem);
  line-height: var(--line-height-normal, 1.5);
  color: var(--color-text, #142238);
  background: var(--color-surface, #fffdf8);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 0.5rem);
  box-shadow: var(--shadow-inner, inset 0 1px 2px rgba(20, 34, 56, 0.04));
  caret-color: var(--color-primary-600, #087c8c);
  transition:
    border-color var(--duration-fast, 150ms) var(--ease-default, ease),
    box-shadow var(--duration-fast, 150ms) var(--ease-default, ease),
    background-color var(--duration-fast, 150ms) var(--ease-default, ease);
}

.ds-input::placeholder {
  color: var(--color-text-muted, #607484);
  opacity: 1;
}

.ds-input:hover:not(:disabled):not(:focus) {
  border-color: var(--color-border-strong, #b8cac7);
}

.ds-input:focus {
  outline: none;
  border-color: var(--color-primary-600, #087c8c);
}

.ds-input:focus-visible {
  outline: 3px solid var(--color-focus-ring, #075f70);
  outline-offset: 1px;
  box-shadow: var(--shadow-focus, 0 0 0 3px #075f70);
}

.ds-input:disabled {
  background: var(--color-bg-subtle, #f8fafc);
  cursor: not-allowed;
  color: var(--color-text-muted, #607484);
  box-shadow: none;
  opacity: 1;
}

.ds-input--textarea {
  min-height: 7rem;
  resize: vertical;
}

.ds-input--select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 20px;
  padding-right: 2.75rem;
}

.ds-input-wrapper--error .ds-input {
  border-color: var(--color-danger-600, #bd4645);
}

.ds-input-wrapper--error .ds-input:focus {
  border-color: var(--color-danger-600, #bd4645);
}

.ds-input-wrapper--error .ds-input:focus-visible {
  outline-color: var(--color-danger-600, #bd4645);
  box-shadow: 0 0 0 3px var(--color-danger-600, #bd4645);
}

.ds-input__error {
  margin: 0;
  color: var(--color-danger-700, #9f373b);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-size: var(--font-size-xs, 0.75rem);
  font-weight: var(--font-weight-medium, 500);
  line-height: var(--line-height-normal, 1.5);
}

.ds-input__hint {
  margin: 0;
  color: var(--color-text-secondary, #475b6d);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-size: var(--font-size-xs, 0.75rem);
  line-height: var(--line-height-normal, 1.5);
}

@media (prefers-reduced-motion: reduce) {
  .ds-input {
    transition: none;
  }
}
</style>

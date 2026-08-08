<template>
  <div class="ds-checkbox-wrapper" :class="{ 'ds-checkbox-wrapper--error': !!error, 'ds-checkbox-wrapper--disabled': disabled }">
    <label :for="inputId" class="ds-checkbox__label-container">
      <input
        :id="inputId"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="error ? inputId + '-error' : undefined"
        class="ds-checkbox__input"
        @change="modelValue = ($event.target as HTMLInputElement).checked"
        @blur="$emit('blur')"
        @focus="$emit('focus')"
      />
      <span class="ds-checkbox__control" aria-hidden="true">
        <svg v-if="modelValue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </span>
      <span v-if="label" class="ds-checkbox__label-text">
        {{ label }}
        <span v-if="required" class="ds-checkbox__required" aria-hidden="true">*</span>
      </span>
      <slot v-else></slot>
    </label>
    <p v-if="error" :id="inputId + '-error'" class="ds-checkbox__error" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const modelValue = defineModel<boolean>({ default: false });

export interface DsCheckboxProps {
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

const props = withDefaults(defineProps<DsCheckboxProps>(), {
  label: undefined,
  error: undefined,
  disabled: false,
  required: false,
  id: undefined
});

defineEmits<{
  blur: [];
  focus: [];
}>();

const generatedInputId = `ds-checkbox-${Math.random().toString(36).slice(2, 8)}`;
const inputId = computed(() => props.id || generatedInputId);
</script>

<style scoped>
.ds-checkbox-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ds-checkbox__label-container {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  position: relative;
}

.ds-checkbox-wrapper--disabled .ds-checkbox__label-container {
  cursor: not-allowed;
  opacity: 0.6;
}

.ds-checkbox__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.ds-checkbox__control {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 4px;
  background: var(--color-surface, #ffffff);
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-top: 2px;
}

.ds-checkbox__input:checked + .ds-checkbox__control {
  background: var(--color-primary-500, #3b82f6);
  border-color: var(--color-primary-500, #3b82f6);
  color: white;
}

.ds-checkbox__input:focus-visible + .ds-checkbox__control {
  outline: none;
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
}

.ds-checkbox-wrapper--error .ds-checkbox__control {
  border-color: var(--color-danger-500, #ef4444);
}

.ds-checkbox-wrapper--error .ds-checkbox__input:focus-visible + .ds-checkbox__control {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4);
}

.ds-checkbox__label-text {
  font-size: 14px;
  color: var(--color-text, #0f172a);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  line-height: 1.5;
}

.ds-checkbox__required {
  color: var(--color-danger-500, #ef4444);
  margin-left: 2px;
}

.ds-checkbox__error {
  margin: 0;
  font-size: 12px;
  color: var(--color-danger-600, #dc2626);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}
</style>

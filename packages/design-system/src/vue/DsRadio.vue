<template>
  <div class="ds-radio-wrapper" :class="{ 'ds-radio-wrapper--error': !!error, 'ds-radio-wrapper--disabled': disabled }">
    <label :for="inputId" class="ds-radio__label-container">
      <input
        :id="inputId"
        type="radio"
        :name="name"
        :value="value"
        :checked="modelValue === value"
        :disabled="disabled"
        :aria-invalid="!!error"
        :aria-describedby="error ? inputId + '-error' : undefined"
        class="ds-radio__input"
        @change="onChange"
        @blur="$emit('blur')"
        @focus="$emit('focus')"
      />
      <span class="ds-radio__control" aria-hidden="true">
        <span v-if="modelValue === value" class="ds-radio__control-inner"></span>
      </span>
      <span v-if="label" class="ds-radio__label-text">
        {{ label }}
      </span>
      <slot v-else></slot>
    </label>
    <p v-if="error" :id="inputId + '-error'" class="ds-radio__error" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const modelValue = defineModel<any>();

export interface DsRadioProps {
  value: any;
  name?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
}

const props = withDefaults(defineProps<DsRadioProps>(), {
  name: undefined,
  label: undefined,
  error: undefined,
  disabled: false,
  id: undefined
});

defineEmits<{
  blur: [];
  focus: [];
}>();

const generatedInputId = `ds-radio-${Math.random().toString(36).slice(2, 8)}`;
const inputId = computed(() => props.id || generatedInputId);

const onChange = () => {
  modelValue.value = props.value;
};
</script>

<style scoped>
.ds-radio-wrapper {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
}

.ds-radio__label-container {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  position: relative;
}

.ds-radio-wrapper--disabled .ds-radio__label-container {
  cursor: not-allowed;
  opacity: 0.6;
}

.ds-radio__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.ds-radio__control {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 50%;
  background: var(--color-surface, #ffffff);
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-top: 2px;
}

.ds-radio__control-inner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: white;
}

.ds-radio__input:checked + .ds-radio__control {
  background: var(--color-primary-500, #3b82f6);
  border-color: var(--color-primary-500, #3b82f6);
}

.ds-radio__input:focus-visible + .ds-radio__control {
  outline: none;
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
}

.ds-radio-wrapper--error .ds-radio__control {
  border-color: var(--color-danger-500, #ef4444);
}

.ds-radio-wrapper--error .ds-radio__input:focus-visible + .ds-radio__control {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4);
}

.ds-radio__label-text {
  font-size: 14px;
  color: var(--color-text, #0f172a);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  line-height: 1.5;
}

.ds-radio__error {
  margin: 0;
  font-size: 12px;
  color: var(--color-danger-600, #dc2626);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}
</style>

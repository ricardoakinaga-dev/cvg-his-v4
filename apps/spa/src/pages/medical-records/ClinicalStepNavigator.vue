<template>
  <nav class="clinical-step-tabs" role="tablist" aria-label="Etapas do prontuário">
    <button
      v-for="step in props.steps"
      :key="step.key"
      :id="tabId(step.key)"
      type="button"
      :class="{ 'clinical-step-tab--active': props.activeKey === step.key }"
      role="tab"
      :aria-selected="props.activeKey === step.key"
      :aria-controls="props.activeKey === step.key ? panelId(step.key) : undefined"
      :tabindex="props.activeKey === step.key ? 0 : -1"
      :data-testid="`clinical-step-${step.key}`"
      @keydown="handleStepKey($event, step.key)"
      @click="selectStep(step.key)"
    >
      <span aria-hidden="true">{{ step.number }}</span>
      {{ step.label }}
    </button>
  </nav>
</template>

<script setup lang="ts">
import { nextTick } from 'vue';

export interface ClinicalStepNavigatorItem {
  readonly key: string;
  readonly number: number;
  readonly label: string;
}

const props = defineProps<{
  steps: readonly ClinicalStepNavigatorItem[];
  activeKey: string;
}>();

const emit = defineEmits<{
  select: [key: string];
}>();

function tabId(step: string): string {
  return `medical-record-step-tab-${step}`;
}

function panelId(step: string): string {
  return `medical-record-step-panel-${step}`;
}

function selectStep(step: string): void {
  emit('select', step);
}

function handleStepKey(event: KeyboardEvent, step: string): void {
  const index = props.steps.findIndex((item) => item.key === step);
  if (
    index < 0 ||
    !['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)
  ) {
    return;
  }

  event.preventDefault();
  const nextIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? props.steps.length - 1
        : (index +
            (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) +
            props.steps.length) %
          props.steps.length;
  const nextStep = props.steps[nextIndex]?.key;
  if (!nextStep) return;

  selectStep(nextStep);
  void nextTick(() => document.getElementById(tabId(nextStep))?.focus());
}
</script>

<style scoped>
.clinical-step-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 6px;
  overflow: hidden;
  background: var(--color-surface, #ffffff);
}

.clinical-step-tabs button {
  min-height: 44px;
  border: 0;
  border-right: 1px solid var(--color-border, #cbd5e1);
  background: transparent;
  color: var(--color-text-secondary, #475569);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.clinical-step-tabs button:last-child {
  border-right: 0;
}

.clinical-step-tabs button span {
  margin-right: 6px;
  color: var(--color-text-muted, #64748b);
}

.clinical-step-tabs .clinical-step-tab--active {
  background: var(--color-primary-700);
  color: var(--color-text-inverse);
}

.clinical-step-tabs .clinical-step-tab--active span {
  color: var(--color-text-inverse);
}

@media (max-width: 820px) {
  .clinical-step-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

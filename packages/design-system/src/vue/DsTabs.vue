<template>
  <div class="ds-tabs" role="tablist" :aria-label="props.ariaLabel">
    <button
      v-for="(tab, index) in props.tabs"
      :key="tab.key ?? index"
      role="tab"
      :data-key="tab.key ?? index"
      :class="[
        'ds-tab',
        {
          'ds-tab--active': props.modelValue === (tab.key ?? index),
          'ds-tab--disabled': tab.disabled
        }
      ]"
      :aria-selected="props.modelValue === (tab.key ?? index)"
      :aria-disabled="tab.disabled"
      :tabindex="props.modelValue === (tab.key ?? index) ? 0 : -1"
      :disabled="tab.disabled"
      @click="!tab.disabled && $emit('update:modelValue', tab.key ?? index)"
      @keydown="handleKeydown($event, index)"
    >
      {{ tab.label }}
      <span
        v-if="tab.count !== undefined"
        class="ds-tab__count"
        :aria-label="`${tab.count} itens`"
        >{{ tab.count }}</span
      >
    </button>
  </div>
</template>

<script setup lang="ts">
export interface DsTabItem {
  key?: string | number;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface DsTabsProps {
  tabs: DsTabItem[];
  modelValue: string | number;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<DsTabsProps>(), {
  ariaLabel: undefined
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

function tabValue(index: number): string | number {
  return props.tabs[index]?.key ?? index;
}

function isDisabled(index: number): boolean {
  return props.tabs[index]?.disabled === true;
}

function findEnabledIndex(startIndex: number, direction: 1 | -1): number {
  const count = props.tabs.length;
  if (count === 0) return -1;

  let candidate = startIndex;
  for (let attempts = 0; attempts < count; attempts += 1) {
    if (!isDisabled(candidate)) return candidate;
    candidate = (candidate + direction + count) % count;
  }
  return -1;
}

function handleKeydown(event: KeyboardEvent, index: number) {
  const tabElements = (
    event.currentTarget as HTMLElement
  ).parentElement?.querySelectorAll<HTMLElement>('button[role="tab"]');
  if (!tabElements || tabElements.length === 0) return;

  let nextIndex = -1;

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    nextIndex = findEnabledIndex((index + 1) % tabElements.length, 1);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    nextIndex = findEnabledIndex((index - 1 + tabElements.length) % tabElements.length, -1);
  } else if (event.key === 'Home') {
    event.preventDefault();
    nextIndex = findEnabledIndex(0, 1);
  } else if (event.key === 'End') {
    event.preventDefault();
    nextIndex = findEnabledIndex(tabElements.length - 1, -1);
  }

  if (nextIndex >= 0) {
    emit('update:modelValue', tabValue(nextIndex));
    tabElements[nextIndex]?.focus();
  }
}
</script>

<style scoped>
.ds-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--color-border, #e2e8f0);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

.ds-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary, #475569);
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
  white-space: nowrap;
}

.ds-tab:hover:not(.ds-tab--active) {
  color: var(--color-text, #0f172a);
}

.ds-tab--active {
  color: var(--color-primary-600, #2563eb);
  border-bottom-color: var(--color-primary-600, #2563eb);
}

.ds-tab:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
  border-radius: var(--radius-sm, 4px);
}

.ds-tab__count {
  background: var(--color-neutral-200, #e2e8f0);
  color: var(--color-text-secondary, #475569);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: var(--radius-full, 9999px);
  font-weight: 600;
}

.ds-tab--active .ds-tab__count {
  background: var(--color-primary-100, #dbeafe);
  color: var(--color-primary-700, #1d4ed8);
}
</style>

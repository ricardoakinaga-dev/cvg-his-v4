<template>
  <div class="ds-tabs" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="(tab, index) in tabs"
      :key="tab.key || index"
      role="tab"
      :data-key="tab.key ?? index"
      :class="['ds-tab', { 'ds-tab--active': modelValue === (tab.key ?? index), 'ds-tab--disabled': tab.disabled }]"
      :aria-selected="modelValue === (tab.key ?? index)"
      :aria-disabled="tab.disabled"
      :tabindex="modelValue === (tab.key ?? index) ? 0 : -1"
      :disabled="tab.disabled"
      @click="!tab.disabled && $emit('update:modelValue', tab.key ?? index)"
      @keydown="handleKeydown($event, index)"
    >
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="ds-tab__count" :aria-label="`${tab.count} itens`">{{ tab.count }}</span>
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

withDefaults(defineProps<DsTabsProps>(), {
  ariaLabel: undefined
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

function handleKeydown(event: KeyboardEvent, index: number) {
  const tabs = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('button[role="tab"]');
  if (!tabs) return;

  let nextIndex = index;

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    nextIndex = index + 1;
    if (nextIndex >= tabs.length) nextIndex = 0;
    // Skip disabled tabs
    while (nextIndex !== index && tabs[nextIndex]?.getAttribute('aria-disabled') === 'true') {
      nextIndex = (nextIndex + 1) % tabs.length;
    }
    emit('update:modelValue', (event.currentTarget as HTMLElement).closest('.ds-tabs')?.querySelectorAll<HTMLElement>('button[role="tab"]')[nextIndex]?.getAttribute('data-key') ?? nextIndex);
    tabs[nextIndex]?.focus();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    nextIndex = index - 1;
    if (nextIndex < 0) nextIndex = tabs.length - 1;
    while (nextIndex !== index && tabs[nextIndex]?.getAttribute('aria-disabled') === 'true') {
      nextIndex = (nextIndex - 1 + tabs.length) % tabs.length;
    }
    emit('update:modelValue', (event.currentTarget as HTMLElement).closest('.ds-tabs')?.querySelectorAll<HTMLElement>('button[role="tab"]')[nextIndex]?.getAttribute('data-key') ?? nextIndex);
    tabs[nextIndex]?.focus();
  } else if (event.key === 'Home') {
    event.preventDefault();
    emit('update:modelValue', 0);
    tabs[0]?.focus();
  } else if (event.key === 'End') {
    event.preventDefault();
    emit('update:modelValue', tabs.length - 1);
    tabs[tabs.length - 1]?.focus();
  }
}
</script>

<style scoped>
.ds-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--color-border, #e2e8f0);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
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

@media (max-width: 1024px), (pointer: coarse) {
  .ds-tab {
    min-height: var(--touch-min, 44px);
  }
}
</style>

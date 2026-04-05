<template>
  <div class="ds-tabs" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="(tab, index) in tabs"
      :key="tab.key || index"
      role="tab"
      :class="['ds-tab', { 'ds-tab--active': modelValue === (tab.key ?? index) }]"
      :aria-selected="modelValue === (tab.key ?? index)"
      :tabindex="modelValue === (tab.key ?? index) ? 0 : -1"
      @click="$emit('update:modelValue', tab.key ?? index)"
    >
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="ds-tab__count">{{ tab.count }}</span>
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

defineEmits<{
  'update:modelValue': [value: string | number];
}>();
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

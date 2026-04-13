<template>
  <div class="app-page-header">
    <div class="app-page-header__content">
      <h1 class="app-page-header__title">
        <slot name="title">{{ title }}</slot>
      </h1>
      <div v-if="subtitle || $slots.subtitle" class="app-page-header__subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </div>
    </div>
    <div v-if="$slots.actions || hasStandardActions" class="app-page-header__actions">
      <slot name="actions">
        <div class="app-page-header__action-group">
          <DsButton
            v-for="action in secondaryActions"
            :key="action.key ?? action.label"
            :variant="action.variant ?? 'secondary'"
            :size="action.size ?? 'md'"
            :type="action.type ?? 'button'"
            :tag="action.to || action.href ? 'a' : 'button'"
            :to="action.to"
            :href="action.href"
            :disabled="action.disabled"
            :loading="action.loading"
            :aria-label="action.ariaLabel"
            :icon="action.icon"
            @click="emitAction(action, $event)"
          >
            {{ action.label }}
          </DsButton>
          <DsButton
            v-if="primaryAction"
            :variant="primaryAction.variant ?? 'primary'"
            :size="primaryAction.size ?? 'md'"
            :type="primaryAction.type ?? 'button'"
            :tag="primaryAction.to || primaryAction.href ? 'a' : 'button'"
            :to="primaryAction.to"
            :href="primaryAction.href"
            :disabled="primaryAction.disabled"
            :loading="primaryAction.loading"
            :aria-label="primaryAction.ariaLabel"
            :icon="primaryAction.icon"
            @click="emitAction(primaryAction, $event)"
          >
            {{ primaryAction.label }}
          </DsButton>
        </div>
      </slot>
    </div>
  </div>
  <div v-if="tabs.length > 0" class="app-page-header__tabs">
    <DsTabs :tabs="tabs" v-model="activeTab" />
  </div>
</template>

<script setup lang="ts">
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsTabs from '@cvg-his-v2/design-system/vue/DsTabs.vue';
import { computed, ref, watch } from 'vue';

export interface PageTab {
  key: string;
  label: string;
}

export interface PageAction {
  key?: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  to?: string;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  icon?: string;
  onClick?: (event: MouseEvent) => void;
}

const props = withDefaults(defineProps<{
  title?: string;
  subtitle?: string;
  tabs?: PageTab[];
  modelValue?: string;
  primaryAction?: PageAction | null;
  secondaryActions?: PageAction[];
}>(), {
  tabs: () => [],
  modelValue: '',
  primaryAction: null,
  secondaryActions: () => []
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const activeTab = ref(props.modelValue || props.tabs[0]?.key || '');

watch(() => props.modelValue, (val) => {
  if (val) activeTab.value = val;
});

watch(activeTab, (val) => {
  emit('update:modelValue', val);
});

const hasStandardActions = computed(() => Boolean(props.primaryAction || props.secondaryActions.length));

function emitAction(action: PageAction, event: MouseEvent) {
  action.onClick?.(event);
}
</script>

<style scoped>
.app-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0;
  gap: 16px;
}

.app-page-header__content {
  flex: 1;
  min-width: 0;
}

.app-page-header__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-page-header__subtitle {
  font-size: 14px;
  color: var(--color-text-muted, #64748b);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.app-page-header__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.app-page-header__action-group {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.app-page-header__tabs {
  margin-top: 16px;
}
</style>

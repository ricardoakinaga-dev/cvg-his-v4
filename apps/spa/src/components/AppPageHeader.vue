<template>
  <div class="app-page-header">
    <div class="app-page-header__content">
      <nav
        v-if="normalizedBreadcrumbs.length > 0 || $slots.breadcrumbs"
        class="app-page-header__breadcrumbs"
        aria-label="Trilha de navegacao"
      >
        <slot name="breadcrumbs">
          <span
            v-for="(crumb, index) in normalizedBreadcrumbs"
            :key="crumb.key ?? `${crumb.label}-${index}`"
            class="app-page-header__breadcrumb-item"
          >
            <span v-if="index > 0" class="app-page-header__breadcrumb-separator">/</span>
            <a
              v-if="breadcrumbTarget(crumb)"
              class="app-page-header__breadcrumb-link"
              :href="breadcrumbTarget(crumb)"
              :aria-label="crumb.ariaLabel"
              :aria-current="crumb.current ? 'page' : undefined"
            >
              {{ crumb.label }}
            </a>
            <span
              v-else
              class="app-page-header__breadcrumb-current"
              :aria-current="crumb.current ? 'page' : undefined"
            >
              {{ crumb.label }}
            </span>
          </span>
        </slot>
      </nav>

      <h1 class="app-page-header__title">
        <slot name="title">{{ title }}</slot>
      </h1>

      <div v-if="subtitle || $slots.subtitle" class="app-page-header__subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </div>

      <dl v-if="contextItems.length > 0 || $slots.context" class="app-page-header__context">
        <slot name="context">
          <div
            v-for="item in contextItems"
            :key="item.key"
            class="app-page-header__context-item"
            :class="item.tone ? `app-page-header__context-item--${item.tone}` : undefined"
          >
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </slot>
      </dl>
    </div>

    <aside v-if="hasAside" class="app-page-header__side">
      <div v-if="nextSteps.length > 0 || $slots.nextSteps" class="app-page-header__next-steps">
        <span class="app-page-header__next-steps-label">Proximo passo</span>
        <slot name="nextSteps">
          <template v-for="step in nextSteps" :key="step.key">
            <a
              v-if="nextStepTarget(step)"
              class="app-page-header__next-step"
              :href="nextStepTarget(step)"
            >
              <strong>{{ step.label }}</strong>
              <span v-if="step.description">{{ step.description }}</span>
            </a>
            <span v-else class="app-page-header__next-step">
              <strong>{{ step.label }}</strong>
              <span v-if="step.description">{{ step.description }}</span>
            </span>
          </template>
        </slot>
      </div>

      <div v-if="$slots.actions || hasStandardActions" class="app-page-header__actions">
        <slot name="actions">
          <div class="app-page-header__action-group">
            <DsButton
              v-for="action in secondaryActions"
              :key="action.key ?? action.label"
              :variant="secondaryActionVariant(action)"
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
    </aside>
  </div>

  <div v-if="tabs.length > 0" class="app-page-header__tabs">
    <DsTabs :tabs="tabs" v-model="activeTab" />
  </div>
</template>

<script setup lang="ts">
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsTabs from '@cvg-his-v2/design-system/vue/DsTabs.vue';
import { computed, ref, useSlots, watch } from 'vue';

export interface PageTab {
  key: string;
  label: string;
}

/**
 * Optional operational breadcrumb. Existing `breadcrumbs: string[]` usage remains valid.
 * Use `breadcrumbItems` only when the trail needs links or an explicit current step.
 */
export interface PageBreadcrumb {
  key?: string;
  label: string;
  to?: string;
  href?: string;
  current?: boolean;
  ariaLabel?: string;
}

/**
 * Compact case context for operational screens: patient, tutor, status, owner,
 * current responsible or sector. It is intentionally display-only.
 */
export interface PageContextItem {
  key: string;
  label: string;
  value: string;
  tone?: 'neutral' | 'info' | 'warning' | 'danger' | 'success';
}

/**
 * Optional next-step area shown before actions. It should describe what moves
 * the journey forward without replacing the single `primaryAction`.
 */
export interface PageNextStep {
  key: string;
  label: string;
  description?: string;
  to?: string;
  href?: string;
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

const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    breadcrumbs?: string[];
    breadcrumbItems?: PageBreadcrumb[];
    contextItems?: PageContextItem[];
    nextSteps?: PageNextStep[];
    tabs?: PageTab[];
    modelValue?: string;
    primaryAction?: PageAction | null;
    secondaryActions?: PageAction[];
  }>(),
  {
    breadcrumbs: () => [],
    breadcrumbItems: () => [],
    contextItems: () => [],
    nextSteps: () => [],
    tabs: () => [],
    modelValue: '',
    primaryAction: null,
    secondaryActions: () => []
  }
);

const slots = useSlots();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const activeTab = ref(props.modelValue || props.tabs[0]?.key || '');

watch(
  () => props.modelValue,
  (val) => {
    if (val) activeTab.value = val;
  }
);

watch(activeTab, (val) => {
  emit('update:modelValue', val);
});

const normalizedBreadcrumbs = computed<PageBreadcrumb[]>(() => {
  if (props.breadcrumbItems.length > 0) {
    return props.breadcrumbItems.map((crumb, index, items) => ({
      current: index === items.length - 1,
      ...crumb
    }));
  }

  return props.breadcrumbs.map((label, index, items) => ({
    key: `${label}-${index}`,
    label,
    current: index === items.length - 1
  }));
});

const hasStandardActions = computed(() =>
  Boolean(props.primaryAction || props.secondaryActions.length)
);
const hasNextSteps = computed(() => Boolean(props.nextSteps.length));
const hasAside = computed(() =>
  Boolean(hasStandardActions.value || hasNextSteps.value || slots.actions || slots.nextSteps)
);

function breadcrumbTarget(crumb: PageBreadcrumb): string | undefined {
  return crumb.to || crumb.href || undefined;
}

function nextStepTarget(step: PageNextStep): string | undefined {
  return step.to || step.href || undefined;
}

function secondaryActionVariant(action: PageAction): PageAction['variant'] {
  return action.variant === 'primary' ? 'secondary' : (action.variant ?? 'secondary');
}

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
  max-width: 100%;
  min-width: 0;
  width: 100%;
}

.app-page-header__content {
  flex: 1;
  min-width: 0;
}

.app-page-header__breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
}

.app-page-header__breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.app-page-header__breadcrumb-separator {
  color: var(--color-border-strong, #94a3b8);
}

.app-page-header__breadcrumb-link {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  color: var(--color-primary, #2563eb);
  text-decoration: none;
}

.app-page-header__breadcrumb-link:hover {
  text-decoration: underline;
}

.app-page-header__breadcrumb-current {
  color: var(--color-text-secondary, #475569);
}

.app-page-header__title {
  font-size: clamp(1.25rem, 1.5vw + 0.75rem, 1.75rem);
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0;
}

.app-page-header__subtitle {
  font-size: 14px;
  color: var(--color-text-muted, #64748b);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.app-page-header__context {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 0;
}

.app-page-header__context-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-height: 28px;
  padding: 5px 8px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  background: var(--color-surface-muted, #f8fafc);
}

.app-page-header__context-item dt,
.app-page-header__next-steps-label {
  color: var(--color-text-muted, #64748b);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.app-page-header__context-item dd {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 13px;
  font-weight: 700;
}

.app-page-header__context-item--info {
  border-color: var(--color-info-border, #bfdbfe);
}

.app-page-header__context-item--warning {
  border-color: var(--color-warning-border, #fde68a);
}

.app-page-header__context-item--danger {
  border-color: var(--color-danger-border, #fecaca);
}

.app-page-header__context-item--success {
  border-color: var(--color-success-border, #bbf7d0);
}

.app-page-header__side {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  max-width: min(440px, 45%);
}

.app-page-header__next-steps {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  text-align: right;
}

.app-page-header__next-step {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--color-text, #0f172a);
  text-decoration: none;
}

.app-page-header__next-step strong {
  font-size: 13px;
}

.app-page-header__next-step span {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.app-page-header__next-step[href]:hover strong {
  text-decoration: underline;
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
  justify-content: flex-end;
}

.app-page-header__action-group > :deep(.ds-btn) {
  min-width: 0;
}

.app-page-header__tabs {
  margin-top: 16px;
}

@media (max-width: 720px) {
  .app-page-header {
    flex-direction: column;
    gap: 12px;
  }

  .app-page-header__side {
    align-items: stretch;
    width: 100%;
    max-width: none;
  }

  .app-page-header__content,
  .app-page-header__breadcrumbs,
  .app-page-header__title,
  .app-page-header__subtitle,
  .app-page-header__context {
    box-sizing: border-box;
    max-width: 100%;
    width: 100%;
  }

  .app-page-header__next-steps {
    align-items: flex-start;
    text-align: left;
    gap: 4px;
  }

  .app-page-header__action-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
    width: 100%;
  }

  .app-page-header__action-group > * {
    min-width: 0;
  }

  .app-page-header__title {
    font-size: 20px;
    margin-bottom: 6px;
  }

  .app-page-header__subtitle {
    font-size: 13px;
    line-height: 1.35;
  }

  .app-page-header__context {
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
    overflow: visible;
    padding-bottom: 2px;
  }

  .app-page-header__context-item {
    flex: 1 1 132px;
    min-width: 0;
  }

  .app-page-header__context-item dd {
    min-width: 0;
    overflow-wrap: anywhere;
  }
}
</style>

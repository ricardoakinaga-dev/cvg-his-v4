<template>
  <header
    v-bind="$attrs"
    class="app-page-header"
    :class="{ 'app-page-header--with-aside': hasAside }"
  >
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
            <span
              v-if="index > 0"
              class="app-page-header__breadcrumb-separator"
              aria-hidden="true"
            >
              /
            </span>
            <AppPageLink
              v-if="crumb.to"
              class="app-page-header__breadcrumb-link"
              :to="crumb.to"
              :aria-label="crumb.ariaLabel"
              :aria-current="crumb.current ? 'page' : undefined"
            >
              {{ crumb.label }}
            </AppPageLink>
            <a
              v-else-if="crumb.href"
              class="app-page-header__breadcrumb-link"
              :href="crumb.href"
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

      <dl v-if="contextItems.length > 0 && !$slots.context" class="app-page-header__context">
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
      <div v-else-if="$slots.context" class="app-page-header__context">
        <slot name="context" />
      </div>
    </div>

    <div v-if="hasAside" class="app-page-header__side">
      <div v-if="nextSteps.length > 0 || $slots.nextSteps" class="app-page-header__next-steps">
        <span class="app-page-header__next-steps-label">Proximo passo</span>
        <slot name="nextSteps">
          <template v-for="step in nextSteps" :key="step.key">
            <AppPageLink
              v-if="step.to"
              class="app-page-header__next-step"
              :to="step.to"
            >
              <strong>{{ step.label }}</strong>
              <span v-if="step.description">{{ step.description }}</span>
            </AppPageLink>
            <a
              v-else-if="step.href"
              class="app-page-header__next-step"
              :href="step.href"
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

      <div
        v-if="$slots.actions || hasStandardActions"
        class="app-page-header__actions"
        role="group"
        aria-label="Ações da página"
      >
        <slot name="actions">
          <div class="app-page-header__action-group">
            <component
              :is="collapseSecondaryActionsOnMobile ? 'details' : 'div'"
              :open="collapseSecondaryActionsOnMobile ? !isCompactViewport : undefined"
              class="app-page-header__secondary-actions"
              :class="{
                'app-page-header__secondary-actions--collapsible': collapseSecondaryActionsOnMobile
              }"
            >
              <summary v-if="collapseSecondaryActionsOnMobile">Mais ações</summary>
              <div class="app-page-header__secondary-actions-body">
                <template v-for="action in secondaryActions" :key="action.key ?? action.label">
                  <AppPageLink
                    v-if="action.to"
                    :to="action.to"
                    custom
                    v-slot="{ href, navigate }"
                  >
                    <DsButton
                      :variant="secondaryActionVariant(action)"
                      :size="action.size ?? 'md'"
                      :type="action.type ?? 'button'"
                      tag="a"
                      :href="href"
                      :disabled="action.disabled"
                      :loading="action.loading"
                      :aria-label="action.ariaLabel"
                      :icon="action.icon"
                      @click="navigateInternalAction(action, $event, navigate)"
                    >
                      {{ action.label }}
                    </DsButton>
                  </AppPageLink>
                  <DsButton
                    v-else
                    :variant="secondaryActionVariant(action)"
                    :size="action.size ?? 'md'"
                    :type="action.type ?? 'button'"
                    :tag="action.href ? 'a' : 'button'"
                    :href="action.href"
                    :disabled="action.disabled"
                    :loading="action.loading"
                    :aria-label="action.ariaLabel"
                    :icon="action.icon"
                    @click="emitAction(action, $event)"
                  >
                    {{ action.label }}
                  </DsButton>
                </template>
              </div>
            </component>
            <template v-if="primaryAction">
              <AppPageLink
                v-if="primaryAction.to"
                :to="primaryAction.to"
                custom
                v-slot="{ href, navigate }"
              >
                <DsButton
                  class="app-page-header__primary"
                  :variant="primaryAction.variant ?? 'primary'"
                  :size="primaryAction.size ?? 'md'"
                  :type="primaryAction.type ?? 'button'"
                  tag="a"
                  :href="href"
                  :disabled="primaryAction.disabled"
                  :loading="primaryAction.loading"
                  :aria-label="primaryAction.ariaLabel"
                  :icon="primaryAction.icon"
                  @click="navigateInternalAction(primaryAction, $event, navigate)"
                >
                  {{ primaryAction.label }}
                </DsButton>
              </AppPageLink>
              <DsButton
                class="app-page-header__primary"
                v-else
                :variant="primaryAction.variant ?? 'primary'"
                :size="primaryAction.size ?? 'md'"
                :type="primaryAction.type ?? 'button'"
                :tag="primaryAction.href ? 'a' : 'button'"
                :href="primaryAction.href"
                :disabled="primaryAction.disabled"
                :loading="primaryAction.loading"
                :aria-label="primaryAction.ariaLabel"
                :icon="primaryAction.icon"
                @click="emitAction(primaryAction, $event)"
              >
                {{ primaryAction.label }}
              </DsButton>
            </template>
          </div>
        </slot>
      </div>
    </div>
  </header>

  <div v-if="tabs.length > 0" class="app-page-header__tabs">
    <DsTabs :tabs="tabs" v-model="activeTab" />
  </div>
</template>

<script setup lang="ts">
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsTabs from '@cvg-his-v2/design-system/vue/DsTabs.vue';
import {
  computed,
  defineComponent,
  getCurrentInstance,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
  watch,
  type Component,
  type PropType
} from 'vue';

defineOptions({ inheritAttrs: false });

const AppPageLink = defineComponent({
  name: 'AppPageLink',
  inheritAttrs: false,
  props: {
    to: {
      type: [String, Object] as PropType<string | Record<string, unknown>>,
      required: true
    },
    custom: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { attrs, slots }) {
    return () => {
      const globalComponents = getCurrentInstance()?.appContext.components;
      const routerLink = globalComponents?.RouterLink as Component | boolean | undefined;
      const hasRouterLinkImplementation =
        typeof routerLink === 'function' ||
        (typeof routerLink === 'object' &&
          routerLink !== null &&
          ('props' in routerLink || 'setup' in routerLink || 'render' in routerLink));

      if (hasRouterLinkImplementation) {
        return h(routerLink as Component, { ...attrs, to: props.to, custom: props.custom }, slots);
      }

      const href = typeof props.to === 'string' ? props.to : '#';
      if (props.custom) {
        return h(
          'a',
          { ...attrs, href },
          slots.default?.({ href, navigate: () => undefined })
        );
      }

      return h('a', { ...attrs, href }, slots.default?.());
    };
  }
});

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
    /** Keep secondary actions reachable while preserving a compact mobile header. */
    collapseSecondaryActionsOnMobile?: boolean;
  }>(),
  {
    breadcrumbs: () => [],
    breadcrumbItems: () => [],
    contextItems: () => [],
    nextSteps: () => [],
    tabs: () => [],
    modelValue: '',
    primaryAction: null,
    secondaryActions: () => [],
    collapseSecondaryActionsOnMobile: false
  }
);

const slots = useSlots();

const isCompactViewport = ref(false);
let compactViewportMediaQuery: MediaQueryList | undefined;

function updateCompactViewport() {
  isCompactViewport.value = compactViewportMediaQuery?.matches ?? false;
}

onMounted(() => {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  compactViewportMediaQuery = window.matchMedia('(max-width: 720px)');
  updateCompactViewport();
  if (compactViewportMediaQuery.addEventListener) {
    compactViewportMediaQuery.addEventListener('change', updateCompactViewport);
  } else {
    compactViewportMediaQuery.addListener?.(updateCompactViewport);
  }
});

onBeforeUnmount(() => {
  if (compactViewportMediaQuery?.removeEventListener) {
    compactViewportMediaQuery.removeEventListener('change', updateCompactViewport);
  } else {
    compactViewportMediaQuery?.removeListener?.(updateCompactViewport);
  }
  compactViewportMediaQuery = undefined;
});

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

function secondaryActionVariant(action: PageAction): PageAction['variant'] {
  return action.variant === 'primary' ? 'secondary' : (action.variant ?? 'secondary');
}

function emitAction(action: PageAction, event: MouseEvent) {
  action.onClick?.(event);
}

function navigateInternalAction(
  action: PageAction,
  event: MouseEvent,
  navigate: (event: MouseEvent) => unknown
) {
  emitAction(action, event);
  if (!event.defaultPrevented) {
    void navigate(event);
  }
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
  min-width: var(--touch-min, 44px);
  display: inline-flex;
  align-items: center;
  min-height: var(--touch-min, 44px);
  padding-inline: 2px;
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

.app-page-header__secondary-actions,
.app-page-header__secondary-actions-body {
  display: contents;
}

.app-page-header__secondary-actions--collapsible > summary {
  display: none;
}

.app-page-header__action-group > :deep(.ds-btn) {
  min-width: var(--touch-min, 44px);
}

.app-page-header__action-group :deep(.ds-btn__label) {
  white-space: normal;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
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

  .app-page-header__action-group > .app-page-header__primary {
    grid-column: 1 / -1;
  }

  .app-page-header__action-group > :deep(.ds-btn) {
    min-width: var(--touch-min, 44px);
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

  /* CVG Pulse mobile refinements are kept after the compatibility rules so
     existing page consumers inherit the new treatment without markup changes. */
}

/* ─── CVG Pulse header surface ─── */
.app-page-header {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: clamp(16px, 2vw, 24px);
  width: 100%;
  margin: 0 0 16px;
  padding: clamp(18px, 2vw, 24px);
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--pulse-line, var(--color-border, #d5e2e6));
  border-radius: var(--pulse-radius-xl, 20px);
  background:
    radial-gradient(circle at 100% 0%, var(--pulse-cyan-wash, rgba(16, 183, 198, 0.12)), transparent 34%),
    var(--pulse-surface, var(--color-surface, #ffffff));
  box-shadow: var(--pulse-shadow-card, 0 12px 30px rgba(15, 35, 48, 0.08));
}

.app-page-header--with-aside {
  grid-template-columns: minmax(0, 1fr) minmax(240px, 440px);
}

.app-page-header::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  content: '';
  background: linear-gradient(
    180deg,
    var(--pulse-cyan, var(--color-primary-500, #0fa8b8)),
    var(--pulse-mint, var(--color-accent-500, #159f83))
  );
}

.app-page-header::after {
  position: absolute;
  inset: auto 24px 0 auto;
  width: min(42%, 260px);
  height: 1px;
  content: '';
  background: linear-gradient(90deg, transparent, var(--pulse-cyan, #0fa8b8));
  opacity: 0.72;
}

.app-page-header__content,
.app-page-header__side {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.app-page-header__breadcrumbs {
  gap: 8px;
  margin-bottom: 12px;
  color: var(--pulse-muted, var(--color-text-muted, #55717a));
  font-size: 11px;
  letter-spacing: 0.075em;
  line-height: 1.35;
  text-transform: uppercase;
}

.app-page-header__breadcrumb-item {
  gap: 8px;
  min-width: 0;
}

.app-page-header__breadcrumb-separator {
  color: var(--pulse-cyan-strong, var(--color-primary-700, #066b80));
  font-size: 13px;
  font-weight: 700;
}

.app-page-header__breadcrumb-link {
  min-height: var(--touch-min, 44px);
  max-width: 28ch;
  overflow: hidden;
  color: var(--pulse-cyan-strong, var(--color-primary, #066b80));
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-page-header__breadcrumb-current {
  max-width: 32ch;
  overflow: hidden;
  color: var(--pulse-muted-strong, var(--color-text-secondary, #3e5c67));
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-page-header__title {
  position: relative;
  z-index: 1;
  max-width: 28ch;
  margin: 0 0 10px;
  color: var(--pulse-ink, var(--color-text, #112530));
  font-family: var(--font-family-sans);
  font-size: clamp(1.4rem, 1vw + 1rem, 1.85rem);
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.08;
  overflow-wrap: anywhere;
}

.app-page-header__subtitle {
  max-width: 76ch;
  color: var(--pulse-muted-strong, var(--color-text-muted, #55717a));
  font-size: 14px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.app-page-header__context {
  gap: 8px;
  margin: 16px 0 0;
  min-width: 0;
}

.app-page-header__context-item {
  --context-accent: var(--pulse-cyan, var(--color-primary-500, #0fa8b8));
  --context-surface: var(--pulse-cyan-soft, var(--color-primary-50, #e8f8fa));
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 8px;
  min-width: min(160px, 100%);
  min-height: 40px;
  padding: 7px 10px;
  border: 1px solid var(--pulse-line, var(--color-border, #d5e2e6));
  border-inline-start: 3px solid var(--context-accent);
  border-radius: 11px;
  background: var(--context-surface);
  box-shadow: var(--shadow-xs, 0 1px 2px rgba(15, 35, 48, 0.04));
}

.app-page-header__context-item dt,
.app-page-header__next-steps-label {
  color: var(--pulse-muted, var(--color-text-muted, #55717a));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.075em;
  text-transform: uppercase;
}

.app-page-header__context-item dd {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--pulse-ink, var(--color-text, #112530));
  font-size: 13px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.app-page-header__context-item--info {
  --context-accent: var(--pulse-cyan, var(--color-info-500, #0fa8b8));
  --context-surface: var(--pulse-cyan-soft, var(--color-info-50, #e8f8fa));
}

.app-page-header__context-item--warning {
  --context-accent: var(--pulse-sand, var(--color-warning-600, #a96508));
  --context-surface: var(--pulse-sand-soft, var(--color-warning-50, #fff6e4));
}

.app-page-header__context-item--danger {
  --context-accent: var(--pulse-coral, var(--color-danger-600, #c64b52));
  --context-surface: var(--pulse-coral-soft, var(--color-danger-50, #fff0ef));
}

.app-page-header__context-item--success {
  --context-accent: var(--pulse-mint, var(--color-success-600, #12836c));
  --context-surface: var(--pulse-mint-soft, var(--color-success-50, #e8f8f1));
}

.app-page-header__side {
  display: flex;
  flex: 0 0 auto;
  width: min(440px, 100%);
  min-width: 240px;
  max-width: 100%;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  padding-inline-start: clamp(16px, 2vw, 24px);
  border-inline-start: 1px solid var(--pulse-line, var(--color-border, #d5e2e6));
}

.app-page-header__next-steps {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 7px;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  text-align: right;
}

.app-page-header__next-steps-label {
  align-self: stretch;
  padding-bottom: 0;
  border-bottom: 0;
}

.app-page-header__next-step {
  width: 100%;
  min-height: 44px;
  padding: 4px 0;
  border-radius: 8px;
  color: var(--pulse-ink, var(--color-text, #112530));
}

.app-page-header__next-step span {
  color: var(--pulse-muted, var(--color-text-muted, #55717a));
  line-height: 1.4;
}

.app-page-header__next-step[href]:hover {
  background: var(--pulse-cyan-soft, var(--color-primary-50, #e8f8fa));
  text-decoration: none;
}

.app-page-header__actions,
.app-page-header__action-group {
  width: 100%;
}

.app-page-header__actions > :deep(.ds-btn),
.app-page-header__actions > :deep(.ds-badge) {
  flex: 0 0 auto;
}

.app-page-header__action-group > :deep(.ds-btn) {
  flex: 0 0 auto;
  min-width: var(--touch-min, 44px);
  min-height: var(--touch-min, 44px);
  border-radius: 10px;
  font-weight: 700;
}

.app-page-header__tabs {
  width: 100%;
  margin: -8px 0 20px;
  padding: 4px 8px 0;
  overflow-x: auto;
  border: 1px solid var(--pulse-line, var(--color-border, #d5e2e6));
  border-radius: 13px;
  background: var(--pulse-surface, var(--color-surface, #ffffff));
  box-shadow: var(--shadow-xs, 0 1px 2px rgba(15, 35, 48, 0.04));
  scrollbar-width: thin;
}

.app-page-header__tabs :deep(.ds-tabs) {
  min-width: max-content;
  border-bottom-color: transparent;
}

.app-page-header__tabs :deep(.ds-tab) {
  min-height: var(--touch-min, 44px);
  padding-inline: 14px;
  font-weight: 700;
}

.app-page-header__tabs :deep(.ds-tab--active) {
  color: var(--pulse-cyan-strong, var(--color-primary-700, #066b80));
  border-bottom-color: var(--pulse-cyan, var(--color-primary-500, #0fa8b8));
}

@media (max-width: 1100px) {
  .app-page-header {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 17px 16px 16px 18px;
  }

  .app-page-header__side {
    align-items: stretch;
    width: 100%;
    min-width: 0;
    padding: 12px 0 0;
    border-inline-start: 0;
    border-block-start: 1px solid var(--pulse-line, var(--color-border, #d5e2e6));
  }

  .app-page-header__title {
    max-width: none;
    margin-bottom: 8px;
    font-size: clamp(1.45rem, 6vw, 1.85rem);
  }

  .app-page-header__next-steps {
    align-items: flex-start;
    gap: 4px;
    text-align: left;
  }

  .app-page-header__next-steps-label {
    text-align: left;
  }

  .app-page-header__action-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  }

  .app-page-header__action-group > .app-page-header__primary { grid-column: 1 / -1; }

  .app-page-header__action-group > * {
    min-width: 0;
  }

  .app-page-header__action-group > :deep(.ds-btn) {
    width: 100%;
    min-width: var(--touch-min, 44px);
  }

  .app-page-header__context-item {
    flex: 1 1 132px;
    min-width: 0;
  }

  .app-page-header__tabs {
    margin-top: -4px;
    margin-bottom: 16px;
    padding-inline: 4px;
  }

  .app-page-header__tabs :deep(.ds-tab) {
    padding-inline: 12px;
  }
}

@media (max-width: 720px) {
  .app-page-header__secondary-actions--collapsible {
    display: block;
    grid-column: 1 / -1;
    width: 100%;
  }

  .app-page-header__secondary-actions--collapsible > summary {
    display: flex;
    min-height: var(--touch-min, 44px);
    box-sizing: border-box;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border: 1px solid var(--pulse-line, var(--color-border, #d5e2e6));
    border-radius: 10px;
    background: var(--pulse-surface-muted, var(--color-surface-muted, #f7fbfc));
    color: var(--pulse-ink, var(--color-text, #112530));
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    list-style: none;
  }

  .app-page-header__secondary-actions--collapsible > summary::-webkit-details-marker {
    display: none;
  }

  .app-page-header__secondary-actions--collapsible > summary::after {
    color: var(--pulse-cyan-strong, var(--color-primary-700, #066b80));
    content: '+';
    font-size: 20px;
    line-height: 1;
  }

  .app-page-header__secondary-actions--collapsible[open] > summary::after {
    content: '−';
  }

  .app-page-header__secondary-actions--collapsible > summary:focus-visible {
    outline: 3px solid var(--color-primary-500, #0fa8b8);
    outline-offset: 2px;
  }

  .app-page-header__secondary-actions--collapsible > .app-page-header__secondary-actions-body {
    display: none;
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
    gap: 8px;
    width: 100%;
    padding-top: 8px;
  }

  .app-page-header__secondary-actions--collapsible[open] > .app-page-header__secondary-actions-body {
    display: grid;
  }

  .app-page-header__secondary-actions-body > * {
    min-width: 0;
  }

  .app-page-header__secondary-actions-body :deep(.ds-btn) {
    width: 100%;
    min-width: var(--touch-min, 44px);
  }
}
/* Keep real breadcrumb links available; static context is already in the shell. */
.app-page-header__breadcrumbs:not(:has(a, button)) { display: none; }
@media (max-width: 720px) {
  .app-page-header__breadcrumbs {
    flex-wrap: wrap;
    overflow-x: clip;
    margin-bottom: 8px;
  }
  .app-page-header__breadcrumb-item {
    flex: 0 1 auto;
    max-width: 100%;
  }
  .app-page-header__breadcrumb-link,
  .app-page-header__breadcrumb-current {
    min-width: 0;
    max-width: min(28ch, 100%);
  }
  .app-page-header__actions > :deep(.ds-btn--primary) { flex: 1 0 100%; width: 100%; }
}
</style>

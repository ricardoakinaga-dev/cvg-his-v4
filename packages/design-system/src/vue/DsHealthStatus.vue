<template>
  <div class="ds-health-status" :class="[`ds-health-status--${status}`, { 'ds-health-status--pulse': pulse }]">
    <span class="ds-health-status__indicator" :aria-label="`Status: ${label}`" />
    <div class="ds-health-status__body">
      <span class="ds-health-status__label">{{ label }}</span>
      <span v-if="detail" class="ds-health-status__detail">{{ detail }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface DsHealthStatusProps {
  status?: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  label?: string;
  detail?: string;
  pulse?: boolean;
}

withDefaults(defineProps<DsHealthStatusProps>(), {
  status: 'unknown',
  label: 'Desconhecido',
  detail: undefined,
  pulse: false
});
</script>

<style scoped>
.ds-health-status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
}

.ds-health-status__indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ds-health-status__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ds-health-status__label {
  color: var(--color-text, #0f172a);
  font-weight: 600;
}

.ds-health-status__detail {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

/* Healthy */
.ds-health-status--healthy {
  background: var(--color-success-50, #ecfdf5);
  border-color: var(--color-success-200, #a7f3d0);
}

.ds-health-status--healthy .ds-health-status__indicator {
  background: var(--color-success-600, #059669);
}

.ds-health-status--healthy .ds-health-status__label {
  color: var(--color-success-700, #047857);
}

/* Unhealthy */
.ds-health-status--unhealthy {
  background: var(--color-danger-50, #fef2f2);
  border-color: var(--color-danger-200, #fecaca);
}

.ds-health-status--unhealthy .ds-health-status__indicator {
  background: var(--color-danger-600, #dc2626);
}

.ds-health-status--unhealthy .ds-health-status__label {
  color: var(--color-danger-700, #b91c1c);
}

/* Degraded */
.ds-health-status--degraded {
  background: var(--color-warning-50, #fffbeb);
  border-color: var(--color-warning-200, #fde68a);
}

.ds-health-status--degraded .ds-health-status__indicator {
  background: var(--color-warning-600, #d97706);
}

.ds-health-status--degraded .ds-health-status__label {
  color: var(--color-warning-700, #b45309);
}

/* Unknown */
.ds-health-status--unknown .ds-health-status__indicator {
  background: var(--color-neutral-400, #94a3b8);
}

/* Pulse animation for live systems */
.ds-health-status--pulse .ds-health-status__indicator {
  animation: ds-health-pulse 2s ease-in-out infinite;
}

@keyframes ds-health-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}
</style>

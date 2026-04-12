<template>
  <div class="ds-stat-card" :class="{ 'ds-stat-card--loading': loading, 'ds-stat-card--error': !!error }">
    <div v-if="loading" class="ds-stat-card__skeleton">
      <div class="ds-stat-card__skeleton-icon" />
      <div class="ds-stat-card__skeleton-body">
        <div class="ds-stat-card__skeleton-value" />
        <div class="ds-stat-card__skeleton-label" />
      </div>
    </div>

    <div v-else-if="error" class="ds-stat-card__error">
      <div class="ds-stat-card__error-icon">⚠️</div>
      <div class="ds-stat-card__error-text">{{ error }}</div>
    </div>

    <template v-else>
      <div class="ds-stat-card__icon" aria-hidden="true">{{ icon }}</div>
      <div class="ds-stat-card__body">
        <div class="ds-stat-card__value">{{ value }}</div>
        <div class="ds-stat-card__label">{{ label }}</div>
      </div>
      <div v-if="trend && trendValue" class="ds-stat-card__trend" :class="`ds-stat-card__trend--${trend}`">
        <span class="ds-stat-card__trend-arrow">{{ trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→' }}</span>
        <span class="ds-stat-card__trend-value">{{ trendValue }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
export interface DsStatCardProps {
  label?: string;
  value?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
  error?: string;
}

withDefaults(defineProps<DsStatCardProps>(), {
  label: '',
  value: '',
  icon: '📊',
  trend: undefined,
  trendValue: undefined,
  loading: false,
  error: undefined
});
</script>

<style scoped>
.ds-stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-surface, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease;
}

.ds-stat-card:hover {
  box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
  border-color: var(--color-primary-200, #bfdbfe);
  transform: translateY(-1px);
}

.ds-stat-card__icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.08);
  font-size: 24px;
  flex-shrink: 0;
}

.ds-stat-card__body {
  flex: 1;
  min-width: 0;
}

.ds-stat-card__value {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  line-height: 1;
}

.ds-stat-card__label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #94a3b8);
}

.ds-stat-card__trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.ds-stat-card__trend--up {
  color: var(--color-success-700, #047857);
  background: var(--color-success-50, #ecfdf5);
}

.ds-stat-card__trend--down {
  color: var(--color-danger-700, #b91c1c);
  background: var(--color-danger-50, #fef2f2);
}

.ds-stat-card__trend--neutral {
  color: var(--color-text-muted, #64748b);
  background: var(--color-neutral-100, #f1f5f9);
}

.ds-stat-card__trend-arrow {
  font-size: 12px;
}

/* Skeleton loading */
.ds-stat-card__skeleton {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.ds-stat-card__skeleton-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--color-skeleton, linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%));
  background-size: 200% 100%;
  animation: ds-skeleton-shimmer 1.5s ease-in-out infinite;
  flex-shrink: 0;
}

.ds-stat-card__skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ds-stat-card__skeleton-value {
  height: 28px;
  width: 60%;
  border-radius: 6px;
  background: var(--color-skeleton, linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%));
  background-size: 200% 100%;
  animation: ds-skeleton-shimmer 1.5s ease-in-out infinite;
}

.ds-stat-card__skeleton-label {
  height: 13px;
  width: 40%;
  border-radius: 4px;
  background: var(--color-skeleton, linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%));
  background-size: 200% 100%;
  animation: ds-skeleton-shimmer 1.5s ease-in-out infinite;
}

/* Error state */
.ds-stat-card__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 0;
}

.ds-stat-card__error-icon {
  font-size: 24px;
  opacity: 0.6;
}

.ds-stat-card__error-text {
  font-size: 13px;
  color: var(--color-danger-600, #dc2626);
}

@keyframes ds-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>

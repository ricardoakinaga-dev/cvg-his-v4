<template>
  <router-link :to="to" class="ds-domain-card" :class="{ 'ds-domain-card--compact': compact }">
    <div class="ds-domain-card__icon-wrap" aria-hidden="true">
      <span class="ds-domain-card__icon">{{ icon }}</span>
      <span v-if="badge !== undefined" class="ds-domain-card__badge">{{ badge > 99 ? '99+' : badge }}</span>
    </div>
    <div class="ds-domain-card__body">
      <span class="ds-domain-card__label">{{ label }}</span>
      <span v-if="description && !compact" class="ds-domain-card__description">{{ description }}</span>
    </div>
    <span v-if="!compact" class="ds-domain-card__arrow" aria-hidden="true">›</span>
  </router-link>
</template>

<script setup lang="ts">
export interface DsDomainCardProps {
  label: string;
  to: string;
  icon?: string;
  description?: string;
  badge?: number;
  compact?: boolean;
}

withDefaults(defineProps<DsDomainCardProps>(), {
  icon: '📁',
  description: undefined,
  badge: undefined,
  compact: false
});
</script>

<style scoped>
.ds-domain-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
  text-decoration: none;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
  min-height: 60px;
}

.ds-domain-card:hover {
  background: var(--color-surface-hover, #f8fafc);
  border-color: var(--color-primary-200, #bfdbfe);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.06));
  transform: translateY(-1px);
  text-decoration: none;
}

.ds-domain-card:active {
  transform: scale(0.98);
}

.ds-domain-card--compact {
  padding: 10px 14px;
  min-height: 48px;
  gap: 10px;
}

.ds-domain-card__icon-wrap {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.ds-domain-card__icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.08);
  font-size: 20px;
}

.ds-domain-card--compact .ds-domain-card__icon {
  width: 36px;
  height: 36px;
  font-size: 18px;
  border-radius: 10px;
}

.ds-domain-card__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--color-primary-600, #2563eb);
  color: var(--color-text-inverse, #ffffff);
  font-size: 10px;
  font-weight: 700;
  border: 2px solid var(--color-surface, #ffffff);
  line-height: 1;
}

.ds-domain-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ds-domain-card__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
}

.ds-domain-card__description {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.ds-domain-card__arrow {
  font-size: 18px;
  color: var(--color-text-muted, #94a3b8);
  flex-shrink: 0;
}
</style>

<template>
  <nav class="ds-sidebar-nav" :aria-label="ariaLabel">
    <ul class="ds-sidebar-nav__group-list" role="list">
      <li
        v-for="(group, gIndex) in groups"
        :key="gIndex"
        class="ds-sidebar-nav__group"
      >
        <div class="ds-sidebar-nav__group-header">
          <span class="ds-sidebar-nav__group-icon">{{ group.icon }}</span>
          <span v-if="!collapsed" class="ds-sidebar-nav__group-label">{{ group.label }}</span>
        </div>
        <ul v-if="!collapsed" class="ds-sidebar-nav__item-list" role="list">
          <li v-for="(item, iIndex) in group.items" :key="iIndex">
            <component
              :is="item.href ? 'a' : 'span'"
              :href="item.href"
              :class="['ds-sidebar-nav__item', { 'ds-sidebar-nav__item--active': item.active }]"
              :aria-current="item.active ? 'page' : undefined"
            >
              <span class="ds-sidebar-nav__item-icon">{{ item.icon ?? '•' }}</span>
              <span class="ds-sidebar-nav__item-label">{{ item.label }}</span>
            </component>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
export interface SidebarNavItem {
  label: string;
  icon?: string;
  href?: string;
  active?: boolean;
}

export interface SidebarNavGroup {
  label: string;
  icon?: string;
  items: SidebarNavItem[];
}

export interface DsSidebarNavProps {
  groups: SidebarNavGroup[];
  collapsed?: boolean;
  ariaLabel?: string;
}

withDefaults(defineProps<DsSidebarNavProps>(), {
  collapsed: false,
  ariaLabel: 'Navegação principal'
});
</script>

<style scoped>
.ds-sidebar-nav__group-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ds-sidebar-nav__group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ds-sidebar-nav__group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
}

.ds-sidebar-nav__group-icon {
  width: 20px;
  text-align: center;
  font-size: 14px;
}

.ds-sidebar-nav__group-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-text-muted, #94a3b8);
}

.ds-sidebar-nav__item-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ds-sidebar-nav__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  color: var(--color-text-secondary, #475569);
  text-decoration: none;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.ds-sidebar-nav__item:hover {
  background: var(--color-surface-hover, #f8fafc);
  color: var(--color-text, #0f172a);
}

.ds-sidebar-nav__item--active {
  background: rgba(37, 99, 235, 0.08);
  color: var(--color-primary-600, #2563eb);
  font-weight: 500;
}

.ds-sidebar-nav__item-icon {
  width: 20px;
  text-align: center;
  font-size: 14px;
  flex-shrink: 0;
}

.ds-sidebar-nav__item-label {
  white-space: nowrap;
}
</style>

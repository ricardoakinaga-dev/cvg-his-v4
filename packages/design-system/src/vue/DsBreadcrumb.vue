<template>
  <nav class="ds-breadcrumb" :aria-label="ariaLabel">
    <ol class="ds-breadcrumb__list">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="ds-breadcrumb__item"
      >
        <router-link
          v-if="item.href && index < items.length - 1"
          :to="item.href"
          class="ds-breadcrumb__link"
        >
          {{ item.label }}
        </router-link>
        <span
          v-else
          class="ds-breadcrumb__current"
          :aria-current="index === items.length - 1 ? 'page' : undefined"
        >
          {{ item.label }}
        </span>
        <span
          v-if="index < items.length - 1"
          class="ds-breadcrumb__separator"
          aria-hidden="true"
        >{{ separator }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface DsBreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: string;
  ariaLabel?: string;
}

withDefaults(defineProps<DsBreadcrumbProps>(), {
  separator: '/',
  ariaLabel: 'Breadcrumb'
});
</script>

<style scoped>
.ds-breadcrumb__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.ds-breadcrumb__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ds-breadcrumb__link {
  font-size: 14px;
  color: var(--color-text-secondary, #475569);
  text-decoration: none;
  transition: color 0.15s ease;
}

.ds-breadcrumb__link:hover {
  color: var(--color-primary-600, #2563eb);
  text-decoration: underline;
}

.ds-breadcrumb__current {
  font-size: 14px;
  color: var(--color-text, #0f172a);
  font-weight: 500;
}

.ds-breadcrumb__separator {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}
</style>

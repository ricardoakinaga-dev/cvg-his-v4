<template>
  <nav class="report-navigation" :aria-label="label">
    <section v-for="group in groups" :key="group.title" class="report-group">
      <h2>{{ group.title }}</h2>
      <ul>
        <li v-for="item in group.items" :key="item.to">
          <RouterLink :to="item.to" class="report-link">
            <span class="report-link__content">
              <span class="report-link__title">{{ item.title }}</span>
              <span class="report-link__description">{{ item.description }}</span>
            </span>
            <svg class="report-link__arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </RouterLink>
        </li>
      </ul>
    </section>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

defineProps<{
  label: string;
  groups: Array<{ title: string; items: Array<{ title: string; description: string; to: string }> }>;
}>();
</script>

<style scoped>
.report-navigation { display: grid; gap: 28px; }
.report-group h2 { margin: 0 0 12px; color: var(--color-text-secondary); font-size: 14px; font-weight: 600; }
.report-group ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.report-group li { min-width: 0; }
.report-link { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 88px; height: 100%; box-sizing: border-box; padding: 18px 20px; color: var(--color-text); text-decoration: none; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 14px; transition: border-color 160ms ease, background-color 160ms ease; }
.report-link:hover { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface)); }
.report-link:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 3px; }
.report-link__content { display: grid; gap: 5px; min-width: 0; }
.report-link__title { font-size: 16px; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.report-link__description { color: var(--color-text-secondary); font-size: 13px; line-height: 1.5; }
.report-link__arrow { width: 20px; height: 20px; flex: 0 0 20px; color: var(--color-primary); }
@media (max-width: 640px) {
  .report-group ul { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .report-link { padding: 16px; }
  .report-navigation { gap: 24px; }
}
@media (prefers-reduced-motion: reduce) { .report-link { transition: none; } }
</style>

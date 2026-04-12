<template>
  <a :href="href" class="ds-skip-link" @click="$emit('click')">
    <slot>{{ label }}</slot>
  </a>
</template>

<script setup lang="ts">
export interface DsSkipLinkProps {
  href?: string;
  label?: string;
}

withDefaults(defineProps<DsSkipLinkProps>(), {
  href: '#main-content',
  label: 'Pular para o conteúdo principal'
});

defineEmits<{
  click: [];
}>();
</script>

<style scoped>
.ds-skip-link {
  position: absolute;
  top: -100%;
  left: 16px;
  z-index: 9999;
  padding: 8px 16px;
  background: var(--color-primary-600, #2563eb);
  color: var(--color-text-inverse, #ffffff);
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  border-radius: var(--radius-md, 6px);
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.1));
  transition: top 0.2s ease;
}

.ds-skip-link:focus {
  top: 16px;
  outline: none;
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
}
</style>

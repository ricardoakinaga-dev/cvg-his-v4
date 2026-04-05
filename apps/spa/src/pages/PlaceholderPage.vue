<template>
  <div class="placeholder-page">
    <div class="placeholder-content">
      <span class="placeholder-content__icon">{{ icon }}</span>
      <h1 class="placeholder-content__title">{{ title }}</h1>
      <p class="placeholder-content__desc">
        Este módulo está sendo migrado para a nova interface. Acesse a versão atual pelo sistema
        legado.
      </p>
      <a :href="legacyUrl" class="placeholder-content__link"> Abrir no sistema legado → </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const icon = computed(() => (route.meta.icon as string) || '📄');
const title = computed(() => (route.meta.title as string) || 'Página');
const legacyUrl = computed(() => (route.path.startsWith('/') ? route.path : '/'));
</script>

<style scoped>
.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.placeholder-content {
  text-align: center;
  max-width: 480px;
  padding: 48px 24px;
}

.placeholder-content__icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.placeholder-content__title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}

.placeholder-content__desc {
  margin: 0 0 24px;
  font-size: 15px;
  color: var(--color-text-muted, #94a3b8);
  line-height: 1.6;
}

.placeholder-content__link {
  display: inline-block;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-primary-600, #2563eb);
  background: var(--color-primary-50, #eff6ff);
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.15s ease;
}

.placeholder-content__link:hover {
  background: var(--color-primary-100, #dbeafe);
}
</style>
